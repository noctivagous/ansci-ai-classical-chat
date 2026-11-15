/**
 * join.ts — the join at working strength (Slice B).
 *
 * The fork's classification table (classify.ts) is loaded into a graph
 * built from the seed (buildSeedGraph — src/seed.ts, read-only), as
 * acquired-layer Concept nodes carrying HAS_ELEMENT edges with the
 * entry's confidence, aspect key and provenance. From there the
 * EXISTING machinery does all the reasoning — nothing is reimplemented:
 *
 *  - src/engine.ts: directClassifications / compose (correspondence
 *    composition at the classification's own confidence) and the cycle
 *    operators generates / generatedBy / restrains / restrainedBy;
 *  - src/propagate.ts: getPropagation — propagation with per-relation
 *    decay, restraint arbitration, conflict flagging, supersede.
 *
 * Brakes, per the design: classification confidence gates traversal
 * (below CONFIDENCE_GATE a classification yields no conclusions);
 * classifications are (concept, aspect)-scoped, so the illness sense
 * of 'cold' cannot derive temperature conclusions (X1); conflicts the
 * propagation pass flags are surfaced, never hidden.
 */
import { Graph, slugify, type AspectKey } from "../graph";
import { buildSeedGraph } from "../seed";
import {
  compose,
  correspondenceRow,
  directClassifications,
  generates,
  generatedBy,
  restrainedBy,
  restrains,
} from "../engine";
import { derivationPathText, getPropagation, usableStatements, type ReviewItem } from "../propagate";
import {
  CLASSIFICATIONS,
  CONCEPT_LINKS,
  lookupClassification,
  type ClassificationEntry,
  type Provenance,
} from "./classify";
import type { Element, ParsedSentence } from "./sentence";
import { semanticClassifications } from "./sentence";
import { climbClassification } from "./wordnet-lex";

/** Below this confidence a classification is recorded but does not
 *  drive derivations (the gate the cycle-probe evaluation demanded). */
export const CONFIDENCE_GATE = 0.6;

/** Element display names by seed node id. */
const ELEMENT_NAME: Record<string, Element> = {
  wood: "Wood", fire: "Fire", earth: "Earth", metal: "Metal", water: "Water",
};

export function forkNodeId(entry: ClassificationEntry): string {
  return `fork-${slugify(entry.concept)}-${slugify(entry.aspect)}`;
}

const REUSABLE_SEED_TYPES = new Set(["Season", "TimeOfDay", "Concept"]);

/**
 * Build the joined graph: seed + one Concept node per (concept, aspect)
 * classification (reusing a seed node where the concept names one —
 * winter, night, dawn…), a HAS_ELEMENT edge per entry, and the concept
 * links propagation travels. `extra` entries are additional
 * classifications in the same shape (the density run's synthetic load,
 * or a test's injected conflict).
 */
export function buildForkGraph(
  extra: ClassificationEntry[] = [],
  extraLinks: { from: string; to: string; type: "IS_A" | "ASSOCIATED_WITH" }[] = [],
): Graph {
  const g = buildSeedGraph();
  const entries = [...CLASSIFICATIONS, ...extra];
  const nodeIdByKey = new Map<string, string>();
  const nodeIdByConcept = new Map<string, string>();
  for (const e of entries) {
    const key = `${e.concept}|${e.aspect}`;
    let nodeId = nodeIdByKey.get(key);
    if (!nodeId) {
      const seedNode = g.nodeByName(e.concept);
      if (seedNode && REUSABLE_SEED_TYPES.has(seedNode.type)) {
        nodeId = seedNode.id;
      } else {
        nodeId = forkNodeId(e);
        if (!g.getNode(nodeId)) {
          g.addNode({
            id: nodeId,
            name: e.concept,
            type: "Concept",
            layer: "acquired",
            domain: "fork",
            summary: `fork classification target: ${e.concept} (${e.aspect})`,
            properties: { forkAspect: e.aspect, provenance: e.provenance },
          });
        }
      }
      nodeIdByKey.set(key, nodeId);
      if (!nodeIdByConcept.has(e.concept)) nodeIdByConcept.set(e.concept, nodeId);
    }
    g.addEdge({
      from: nodeId,
      to: e.element.toLowerCase(),
      type: "HAS_ELEMENT",
      confidence: e.confidence,
      aspectKey: e.aspectKey,
      aspect: e.aspect,
      properties: { provenance: e.provenance, source: "fork-classify" },
    });
  }
  for (const link of [...CONCEPT_LINKS, ...extraLinks]) {
    const from = nodeIdByConcept.get(link.from);
    const to = nodeIdByConcept.get(link.to);
    if (from && to && from !== to) {
      g.addEdge({ from, to, type: link.type, properties: { source: "fork-classify" } });
    }
  }
  return g;
}

/* ------------------------------------------------------------------ */

export interface DerivedConclusion {
  kind: "correspondence" | "cycle-neighbour" | "propagated";
  /** What is concluded: a correspondence value, or an element name. */
  label: string;
  /** Correspondence domain ("emotion", "organ", …) or the cycle role. */
  category: string;
  element: Element;
  confidence: number;
  /** Edges traversed from the concept to this conclusion. */
  pathLength: number;
  /** Human-readable derivation path. */
  path: string;
}

export interface ClassificationConflict {
  aspectKey: AspectKey;
  elements: Element[];
  message: string;
}

export interface Derivation {
  concept: string;
  aspect?: string;
  nodeId?: string;
  classification?: { element: Element; confidence: number; provenance: Provenance | "seed-atomic" | "wordnet-derived"; aspectKey: AspectKey };
  /** True when the classification fell below CONFIDENCE_GATE and no
   *  conclusions were derived from it. */
  gated: boolean;
  gateReason?: string;
  conclusions: DerivedConclusion[];
  conflicts: ClassificationConflict[];
  reviewItems: ReviewItem[];
}

/** Resolve a concept (+ optional aspect) to its graph node and entry. */
function resolveNode(
  graph: Graph,
  concept: string,
  aspect?: string,
): { nodeId: string; entry?: ClassificationEntry } {
  const entry = lookupClassification(concept, aspect);
  if (entry) {
    const seedNode = graph.nodeByName(entry.concept);
    if (seedNode && REUSABLE_SEED_TYPES.has(seedNode.type)) return { nodeId: seedNode.id, entry };
    const id = forkNodeId(entry);
    if (graph.getNode(id)) return { nodeId: id, entry };
  }
  const any = graph.nodeByName(concept);
  return { nodeId: any?.id ?? "" };
}

/**
 * Derive everything the net yields about one classified concept:
 * its element's correspondence row (composition), its cycle neighbours'
 * rows (one generating step toward expression, one controlling step
 * toward restraint), and its propagated statements — each conclusion
 * carrying its derivation path and confidence.
 */
export function derive(graph: Graph, concept: string, aspect?: string): Derivation {
  const { nodeId, entry } = resolveNode(graph, concept, aspect);
  const out: Derivation = { concept, aspect, nodeId: nodeId || undefined, gated: false, conclusions: [], conflicts: [], reviewItems: [] };
  if (!nodeId) return out;

  const directs = directClassifications(graph, nodeId).filter((c) => c.relation === "HAS_ELEMENT");
  // Aspect discipline (X1): when an aspect was asked for, only that
  // aspect's classification may drive the derivation.
  const scoped = entry
    ? directs.filter((c) => c.aspectKey === entry.aspectKey && c.objectId === entry.element.toLowerCase())
    : directs;
  const primary = (entry ? scoped[0] : undefined) ?? directs.find((c) => c.aspectKey === (entry?.aspectKey ?? "overall")) ?? directs[0];

  // Conflicts: two direct classifications in one aspect pointing at
  // different elements, both at or above the record floor.
  const byAspect = new Map<AspectKey, Set<string>>();
  for (const c of directs) {
    if (c.confidence < 0.5) continue;
    const set = byAspect.get(c.aspectKey) ?? new Set<string>();
    set.add(c.objectId);
    byAspect.set(c.aspectKey, set);
  }
  for (const [aspectKey, elements] of byAspect) {
    if (elements.size > 1) {
      const names = [...elements].map((id) => ELEMENT_NAME[id] ?? id as Element);
      out.conflicts.push({
        aspectKey,
        elements: names,
        message: `'${concept}' is classified to ${names.join(" and ")} in the same aspect (${aspectKey}) — flagged, not resolved silently`,
      });
    }
  }
  const prop = getPropagation(graph);
  out.reviewItems = prop.reviewItems.filter((r) => r.subjectId === nodeId);

  if (!primary) return out;
  const element = ELEMENT_NAME[primary.objectId];
  if (!element) return out;
  out.classification = {
    element,
    confidence: primary.confidence,
    provenance: entry?.provenance ?? "seed-atomic",
    aspectKey: primary.aspectKey,
  };

  if (primary.confidence < CONFIDENCE_GATE) {
    out.gated = true;
    out.gateReason = `classification confidence ${primary.confidence} is below the gate ${CONFIDENCE_GATE}`;
    return out;
  }

  const name = (id: string) => graph.getNode(id)?.name ?? id;
  const conf = primary.confidence;

  // Composition: the element's correspondence row at full confidence.
  const composed = compose(graph, nodeId);
  if (composed) {
    for (const e of composed.entries) {
      out.conclusions.push({
        kind: "correspondence",
        label: e.name,
        category: e.category,
        element,
        confidence: conf,
        pathLength: 2,
        path: `${concept} —HAS_ELEMENT→ ${name(primary.objectId)} —CORRESPONDS_TO→ ${e.name}`,
      });
    }
  }

  // Cycle neighbours: one generating step (expression side) and the
  // restraining element (restraint side), rows included, at decay.
  const neighbour = (elementId: string | undefined, role: string) => {
    if (!elementId) return;
    const elName = ELEMENT_NAME[elementId];
    if (!elName) return;
    for (const [category, entries] of correspondenceRow(graph, elementId)) {
      for (const e of entries) {
        out.conclusions.push({
          kind: "cycle-neighbour",
          label: e.name,
          category: `${role}:${category}`,
          element: elName,
          confidence: Math.round(conf * 0.85 * 10000) / 10000,
          pathLength: 3,
          path: `${concept} —HAS_ELEMENT→ ${name(primary.objectId)} —${role === "generates" ? "MUTUAL_GENERATION" : "MUTUAL_RESTRAINT"}→ ${name(elementId)} —CORRESPONDS_TO→ ${e.name}`,
        });
      }
    }
  };
  neighbour(generates(graph, primary.objectId), "generates");
  neighbour(generatedBy(graph, primary.objectId), "generated-by");
  neighbour(restrains(graph, primary.objectId), "restrains");
  neighbour(restrainedBy(graph, primary.objectId), "restrained-by");

  // Propagated statements the existing pass derived for this concept.
  for (const st of usableStatements(graph, nodeId)) {
    out.conclusions.push({
      kind: "propagated",
      label: name(st.objectId),
      category: `${st.relation}:${st.aspectKey}`,
      element: ELEMENT_NAME[st.objectId] ?? (st.objectId as Element),
      confidence: st.confidence,
      pathLength: st.derivation.length + 1,
      path: derivationPathText(graph, st),
    });
  }
  return out;
}

/**
 * The join for a parsed sentence: each meaning node whose lemma the
 * classification table knows gets its derivation. (The older
 * name-only join, semanticClassifications in sentence.ts, remains for
 * nodes classified only by the sentence lexicon's semantic address.)
 */
export function deriveSentence(graph: Graph, parsed: ParsedSentence): Map<string, Derivation> {
  const out = new Map<string, Derivation>();
  for (const node of parsed.meaning.nodes) {
    const d = derive(graph, node.lemma);
    if (d.classification) out.set(node.id, d);
  }
  // Semantic-address nodes with no table entry: if the WordNet climb
  // (wordnet-lex.ts) classified the lemma, the node joins with the
  // climb's element and decayed confidence — provenance
  // "wordnet-derived" — and inherits the anchor's correspondence row
  // at that confidence. Otherwise it still joins by element name.
  for (const cls of semanticClassifications(parsed)) {
    const node = parsed.meaning.nodes.find((n) => n.lemma === cls.lemma);
    if (!node || out.has(node.id)) continue;
    const climb = climbClassification(cls.lemma);
    if (climb) {
      const anchorDerivation = derive(graph, climb.anchor);
      const conclusions = anchorDerivation.conclusions
        .filter((c) => c.kind === "correspondence")
        .map((c) => ({
          ...c,
          confidence: Math.min(c.confidence, climb.confidence),
          path: `${climb.path}; ${cls.lemma} inherits the anchor's row: ${c.path}`,
        }));
      out.set(node.id, {
        concept: cls.lemma,
        gated: false,
        conclusions,
        conflicts: [],
        reviewItems: [],
        classification: { element: climb.element, confidence: climb.confidence, provenance: "wordnet-derived", aspectKey: climb.aspectKey },
      });
      continue;
    }
    out.set(node.id, {
      concept: cls.lemma,
      gated: false,
      conclusions: [],
      conflicts: [],
      reviewItems: [],
      classification: { element: cls.semanticElement, confidence: 1, provenance: "seed-atomic", aspectKey: "overall" },
    });
  }
  return out;
}
