/**
 * propagate.ts — propagation of ontological direction over the base
 * nets (design §§6.1–6.4, §6.10, slice 2c).
 *
 * Anchors (the curated mappings: seed classifications + the synsets
 * they bridge to) shed leanings across net relations — IS_A
 * inheritance, association, antonym polarity flips, parthood, property
 * bearing — with per-relation decay and a hard depth limit of 2.
 * Nothing here mutates the graph: propagation materialises OVERLAY
 * RECORDS (§3.1/§6.1) — statements that carry their mapping status
 * (`propagated` | `flagged` | `superseded`), their degree band, and
 * their full derivation path with each step's provenance kind marked
 * (§3.5: a propagated statement is derived-kind, and says so).
 *
 * Merge discipline (§6.10): restraint arbitration runs before anything
 * is finalised (a leaning toward a restrained element is damped
 * × 0.7 and stepped down a band — never deleted, never applied to a
 * curated classification, applied once); §6.4's flagging is the
 * backstop for same-aspect opposition arbitration cannot settle; a
 * curated classification of the same (concept, aspect) supersedes a
 * propagated one outright. Successor leanings (§6.10) trail one
 * generation step behind direct classifications, at the lowest
 * precedence.
 */
import { Graph, GraphEdge, type AspectKey, type DegreeBand } from "./graph";
import {
  aspectKeyOf,
  directClassifications,
  generates,
  restrains,
  stepDownBand,
  type Classification,
} from "./engine";
import { mappedConceptForSynset } from "./wordnet";

/* ------------------------------------------------------------------ */
/* Records                                                             */
/* ------------------------------------------------------------------ */

export interface DerivationStep {
  relation: string;
  fromId: string;
  toId: string;
  /** §3.5: net edges are retrieved; seed classifications are curated
   *  (evidence, not inference); the generation step is derived. */
  kind: "retrieved" | "curated" | "derived";
  note?: string;
}

export type MappingStatus = "propagated" | "flagged" | "superseded";

export interface PropagatedStatement {
  id: string;
  subjectId: string;
  relation: "HAS_POLARITY" | "HAS_ELEMENT";
  objectId: string;
  aspectKey: AspectKey;
  /** §6.10: a propagated statement is never `predominant`. */
  band: DegreeBand;
  confidence: number;
  mappingStatus: MappingStatus;
  /** "direct" propagation vs a §6.10 successor leaning. */
  kind: "direct" | "successor";
  /** §3.5: propagation output is derived-kind, always. */
  provenanceKind: "derived";
  derivation: DerivationStep[];
  notes: string[];
}

export interface ReviewItem {
  subjectId: string;
  relation: string;
  aspectKey: AspectKey;
  statementIds: string[];
  reason: string;
}

export interface PropagationResult {
  statements: PropagatedStatement[];
  reviewItems: ReviewItem[];
}

/** The §6.2 path rendering of a statement's derivation, e.g.
 *  "snow —IS_A→ precipitation —ASSOCIATED_WITH→ winter —ELEMENT_OF→ Water". */
export function derivationPathText(graph: Graph, st: PropagatedStatement): string {
  const name = (id: string) => graph.getNode(id)?.name ?? id;
  if (st.derivation.length === 0) return name(st.subjectId);
  const parts = [name(st.derivation[0].fromId)];
  for (const s of st.derivation) parts.push(`—${s.relation}→ ${name(s.toId)}`);
  return parts.join(" ");
}

/* ------------------------------------------------------------------ */
/* The pass                                                            */
/* ------------------------------------------------------------------ */

/** Per-relation decay (§6.2). */
const DECAY = {
  IS_A: 0.9,
  ASSOCIATED_WITH: 0.6,
  ANTONYM_OF: 0.7,
  PART_OF: 0.7,
  PROPERTY: 0.85,
  EVOKES: 0.6,
  SUCCESSOR: 0.5,
  ARBITRATION_DAMP: 0.7,
} as const;

/** Maximum propagation depth in slice 2c (§6.2). */
const MAX_DEPTH = 2;

/** Statement subjects: concepts and the net senses that denote them.
 *  (EVOKES targets — frames — are the one exception, §6.2.) */
const SUBJECT_TYPES = new Set(["Concept", "Synset", "Season", "TimeOfDay"]);

const round4 = (x: number) => Math.round(x * 10000) / 10000;

interface Working {
  subjectId: string;
  relation: "HAS_POLARITY" | "HAS_ELEMENT";
  objectId: string;
  aspectKey: AspectKey;
  confidence: number;
  band?: DegreeBand;
  curated: boolean;
  derivation: DerivationStep[];
  depth: number;
}

const keyOf = (w: { subjectId: string; relation: string; aspectKey: string; objectId: string; kind?: string }) =>
  `${w.subjectId}|${w.relation}|${w.aspectKey}|${w.objectId}|${w.kind ?? "direct"}`;

/** Anchor classifications: every node's direct classifications, plus —
 *  for each mapped synset — its concept's classifications across the
 *  MAPPED_TO bridge (the sense shares what its concept holds). */
function anchorClassifications(graph: Graph): Working[] {
  const out: Working[] = [];
  const push = (
    subjectId: string,
    c: Classification,
    derivation: DerivationStep[],
    confidence: number,
  ) => {
    out.push({
      subjectId,
      relation: c.relation,
      objectId: c.objectId,
      aspectKey: c.aspectKey,
      confidence,
      band: c.edge.band,
      curated: true,
      derivation,
      depth: 0,
    });
  };
  for (const node of graph.allNodes()) {
    for (const c of directClassifications(graph, node.id)) {
      push(node.id, c, [
        { relation: c.edge.type, fromId: node.id, toId: c.objectId, kind: "curated" },
      ], c.confidence);
    }
  }
  for (const edge of graph.allEdges()) {
    if (edge.type !== "MAPPED_TO") continue;
    const concept = graph.getNode(edge.from);
    const synset = graph.getNode(edge.to);
    if (!concept || !synset) continue;
    for (const c of directClassifications(graph, concept.id)) {
      push(
        synset.id,
        c,
        [
          {
            relation: "MAPPED_TO",
            fromId: synset.id,
            toId: concept.id,
            kind: "curated",
            note: "the sense this concept denotes (§1.1 bridge)",
          },
          { relation: c.edge.type, fromId: concept.id, toId: c.objectId, kind: "curated" },
        ],
        round4(c.confidence * (edge.confidence ?? 1)),
      );
    }
  }
  return out;
}

const FLIP: Record<string, string> = { yin: "yang", yang: "yin" };

/** One hop of §6.2 from a working classification. `prepend` keeps the
 *  derivation in path order (final subject -> ... -> target). */
function expand(graph: Graph, w: Working): Working[] {
  if (w.depth >= MAX_DEPTH) return [];
  const out: Working[] = [];
  const subjectNode = graph.getNode(w.subjectId);
  if (!subjectNode) return out;
  const mk = (
    subjectId: string,
    step: DerivationStep,
    opts: {
      relation?: Working["relation"];
      objectId?: string;
      aspectKey?: AspectKey;
      confidence: number;
      band: DegreeBand;
    },
  ): Working => ({
    subjectId,
    relation: opts.relation ?? w.relation,
    objectId: opts.objectId ?? w.objectId,
    aspectKey: opts.aspectKey ?? w.aspectKey,
    confidence: round4(opts.confidence),
    band: opts.band,
    curated: false,
    derivation: [step, ...w.derivation],
    depth: w.depth + 1,
  });
  const isSubject = (id: string) => {
    const n = graph.getNode(id);
    return !!n && SUBJECT_TYPES.has(n.type);
  };
  // §6.10 degree rule: IS_A inheritance from a predominant curated
  // classification may carry `present`; every other leaning is `faint`.
  const isaBand: DegreeBand = w.curated && w.band === "predominant" ? "present" : "faint";

  // IS_A: children inherit the parent's classification (×0.9).
  for (const e of graph.inEdges(w.subjectId, "IS_A")) {
    if (!isSubject(e.from)) continue;
    out.push(
      mk(e.from, { relation: "IS_A", fromId: e.from, toId: w.subjectId, kind: "retrieved" }, {
        confidence: w.confidence * DECAY.IS_A,
        band: isaBand,
      }),
    );
  }
  // ASSOCIATED_WITH (RelatedTo): a leaning only (×0.6), both directions.
  for (const e of [...graph.outEdges(w.subjectId, "ASSOCIATED_WITH"), ...graph.inEdges(w.subjectId, "ASSOCIATED_WITH")]) {
    const other = e.from === w.subjectId ? e.to : e.from;
    if (!isSubject(other)) continue;
    out.push(
      mk(other, { relation: "ASSOCIATED_WITH", fromId: other, toId: w.subjectId, kind: "retrieved" }, {
        confidence: w.confidence * DECAY.ASSOCIATED_WITH,
        band: "faint",
      }),
    );
  }
  // ANTONYM_OF: polarity FLIPS (×0.7); elements never travel this edge (§6.3).
  if (w.relation === "HAS_POLARITY" && FLIP[w.objectId]) {
    for (const e of [...graph.outEdges(w.subjectId, "ANTONYM_OF"), ...graph.inEdges(w.subjectId, "ANTONYM_OF")]) {
      const other = e.from === w.subjectId ? e.to : e.from;
      if (!isSubject(other)) continue;
      out.push(
        mk(other, { relation: "ANTONYM_OF", fromId: other, toId: w.subjectId, kind: "retrieved" }, {
          objectId: FLIP[w.objectId],
          confidence: w.confidence * DECAY.ANTONYM_OF,
          band: "faint",
        }),
      );
    }
  }
  // PART_OF / AT_LOCATION: a part shares the whole's ELEMENT only, and
  // only when the whole's mapping is curated (×0.7); polarity never
  // propagates through parthood. Edges run part -> whole, so the parts
  // of this node are its incoming PART_OF edges.
  if (w.curated && w.relation === "HAS_ELEMENT") {
    for (const e of graph.inEdges(w.subjectId, "PART_OF")) {
      if (!isSubject(e.from)) continue;
      out.push(
        mk(e.from, { relation: "PART_OF", fromId: e.from, toId: w.subjectId, kind: "retrieved", note: "the part shares the whole's element (curated whole only)" }, {
          confidence: w.confidence * DECAY.PART_OF,
          band: "faint",
        }),
      );
    }
  }
  // HAS_PROPERTY / CAPABLE_OF: the property concept carries the mapping;
  // bearers gain it in the property's aspect (×0.85). Aspect is REQUIRED
  // — an unscoped (overall) classification does not travel this rule.
  if (w.aspectKey !== "overall") {
    for (const type of ["HAS_PROPERTY", "CAPABLE_OF"] as const) {
      for (const e of graph.inEdges(w.subjectId, type)) {
        if (!isSubject(e.from)) continue;
        out.push(
          mk(e.from, { relation: type, fromId: e.from, toId: w.subjectId, kind: "retrieved", note: "property -> bearer, aspect-scoped" }, {
            confidence: w.confidence * DECAY.PROPERTY,
            band: "faint",
          }),
        );
      }
    }
  }
  // EVOKES: a frame whose evoking unit is anchored gains a frame-level
  // leaning (×0.6) — recorded against the frame, never a concept mapping.
  for (const e of graph.outEdges(w.subjectId, "EVOKES")) {
    out.push(
      mk(e.to, { relation: "EVOKES", fromId: e.to, toId: w.subjectId, kind: "retrieved", note: "frame-level leaning, for event interpretation only" }, {
        confidence: w.confidence * DECAY.EVOKES,
        band: "faint",
      }),
    );
  }
  return out;
}

/** Run the full pass: collect, arbitrate, flag, supersede, succeed. */
export function propagateGraph(graph: Graph): PropagationResult {
  // Collect: best-confidence working item per statement key, expanded
  // breadth-first by depth.
  const best = new Map<string, Working>();
  const queue: Working[] = [];
  const consider = (w: Working) => {
    const k = keyOf(w);
    const prior = best.get(k);
    if (!prior || w.confidence > prior.confidence) {
      best.set(k, w);
      queue.push(w);
    }
  };
  for (const a of anchorClassifications(graph)) {
    // Anchors seed expansion but are not themselves statements.
    queue.push(a);
    for (const next of expand(graph, a)) consider(next);
  }
  const expanded = new Set<string>();
  while (queue.length > 0) {
    const w = queue.shift()!;
    if (w.curated) continue; // anchors already expanded above
    const k = keyOf(w);
    if (best.get(k) !== w) continue; // a better derivation superseded this one
    if (expanded.has(k)) continue;
    expanded.add(k);
    for (const next of expand(graph, w)) consider(next);
  }

  const statements: PropagatedStatement[] = [];
  for (const w of best.values()) {
    statements.push({
      id: "",
      subjectId: w.subjectId,
      relation: w.relation,
      objectId: w.objectId,
      aspectKey: w.aspectKey,
      band: w.band ?? "faint",
      confidence: w.confidence,
      mappingStatus: "propagated",
      kind: "direct",
      provenanceKind: "derived",
      derivation: w.derivation,
      notes: [],
    });
  }

  const reviewItems: ReviewItem[] = [];
  const groupBy = (list: PropagatedStatement[], keyFn: (s: PropagatedStatement) => string) => {
    const groups = new Map<string, PropagatedStatement[]>();
    for (const s of list) {
      const k = keyFn(s);
      const g = groups.get(k);
      if (g) g.push(s);
      else groups.set(k, [s]);
    }
    return groups;
  };
  const direct = statements.filter((s) => s.kind === "direct");

  // Restraint arbitration (§6.5 use 2 / §6.10): between two propagated
  // ELEMENT leanings for one (concept, aspect) pointing at different
  // elements where one restrains the other — damp the restrained side
  // (×0.7, band down one step), record it, apply once. Curated
  // classifications are never in this population by construction.
  const arbitratedGroups = new Set<string>();
  for (const [gk, group] of groupBy(direct.filter((s) => s.relation === "HAS_ELEMENT"), (s) => `${s.subjectId}|${s.aspectKey}`)) {
    const bestByObject = new Map<string, PropagatedStatement>();
    for (const s of group) {
      const cur = bestByObject.get(s.objectId);
      if (!cur || s.confidence > cur.confidence) bestByObject.set(s.objectId, s);
    }
    if (bestByObject.size < 2) continue;
    const ranked = [...bestByObject.values()].sort((a, b) => b.confidence - a.confidence);
    const [first, second] = ranked;
    let dampedObject: string | undefined;
    let restrainerObject: string | undefined;
    if (restrains(graph, first.objectId) === second.objectId) {
      dampedObject = second.objectId;
      restrainerObject = first.objectId;
    } else if (restrains(graph, second.objectId) === first.objectId) {
      dampedObject = first.objectId;
      restrainerObject = second.objectId;
    }
    if (!dampedObject || !restrainerObject) continue;
    arbitratedGroups.add(gk);
    for (const s of group) {
      if (s.objectId !== dampedObject) continue;
      s.confidence = round4(s.confidence * DECAY.ARBITRATION_DAMP);
      s.band = stepDownBand(s.band);
      s.notes.push(
        `damped by restraint arbitration: leanings toward ${restrainerObject} and ${dampedObject}; ${graph.getNode(restrainerObject)?.name ?? restrainerObject} restrains ${graph.getNode(dampedObject)?.name ?? dampedObject}`,
      );
    }
  }

  // §6.4 flagging (backstop): same (concept, aspect), opposing objects,
  // both sides at or above the 0.5 record floor — both flagged,
  // excluded from answers, and a review item created. Element groups
  // that arbitration settled are not flagged.
  for (const [gk, group] of groupBy(direct, (s) => `${s.subjectId}|${s.relation}|${s.aspectKey}`)) {
    const objects = new Set(group.map((s) => s.objectId));
    if (objects.size < 2) continue;
    if (group[0].relation === "HAS_ELEMENT" && arbitratedGroups.has(`${group[0].subjectId}|${group[0].aspectKey}`)) continue;
    const bestByObject = new Map<string, number>();
    for (const s of group) {
      bestByObject.set(s.objectId, Math.max(bestByObject.get(s.objectId) ?? 0, s.confidence));
    }
    const top = [...bestByObject.values()].sort((a, b) => b - a);
    if (top.length < 2 || top[1] < 0.5) continue;
    for (const s of group) s.mappingStatus = "flagged";
    reviewItems.push({
      subjectId: group[0].subjectId,
      relation: group[0].relation,
      aspectKey: group[0].aspectKey,
      statementIds: group.map((s) => s.id),
      reason: `opposing ${group[0].relation} implications in the same aspect (${[...objects].join(" vs ")})`,
    });
  }

  // §6.4 supersede: a curated classification of the same (concept,
  // aspect) wins outright; the propagated statement is marked, not
  // deleted. A mapped synset's curated classification lives on its
  // concept — the bridge carries the same authority.
  const curatedKeys = (nodeId: string): Set<string> => {
    const keys = new Set<string>();
    for (const c of directClassifications(graph, nodeId)) {
      keys.add(`${c.relation}|${c.aspectKey}`);
    }
    return keys;
  };
  for (const s of direct) {
    const own = curatedKeys(s.subjectId);
    let hit = own.has(`${s.relation}|${s.aspectKey}`);
    if (!hit) {
      const concept = mappedConceptForSynset(graph, s.subjectId);
      if (concept) hit = curatedKeys(concept.id).has(`${s.relation}|${s.aspectKey}`);
    }
    if (hit) {
      s.mappingStatus = "superseded";
      s.notes.push("superseded by a curated classification of the same (concept, aspect) (§6.4)");
    }
  }

  // Successor leanings (§6.10): exactly one generation step from a
  // classified element — curated classifications and surviving direct
  // statements as sources — in the temporal aspect only, at ×0.5,
  // faint, lowest precedence. A successor that contradicts a direct
  // classification in the temporal aspect yields silently (superseded).
  const temporalDirect = new Map<string, string>(); // subject -> element
  for (const s of direct) {
    if (s.relation === "HAS_ELEMENT" && s.aspectKey === "temporal" && s.mappingStatus === "propagated") {
      temporalDirect.set(s.subjectId, s.objectId);
    }
  }
  for (const node of graph.allNodes()) {
    for (const c of directClassifications(graph, node.id)) {
      if (c.relation === "HAS_ELEMENT" && c.aspectKey === "temporal") {
        temporalDirect.set(node.id, c.objectId);
      }
    }
  }
  const successorSources: { subjectId: string; elementId: string; confidence: number; derivation: DerivationStep[] }[] = [];
  for (const node of graph.allNodes()) {
    for (const c of directClassifications(graph, node.id)) {
      if (c.relation !== "HAS_ELEMENT") continue;
      successorSources.push({
        subjectId: node.id,
        elementId: c.objectId,
        confidence: c.confidence,
        derivation: [{ relation: c.edge.type, fromId: node.id, toId: c.objectId, kind: "curated" }],
      });
    }
  }
  for (const edge of graph.allEdges()) {
    if (edge.type !== "MAPPED_TO") continue;
    const concept = graph.getNode(edge.from);
    const synset = graph.getNode(edge.to);
    if (!concept || !synset) continue;
    for (const c of directClassifications(graph, concept.id)) {
      if (c.relation !== "HAS_ELEMENT") continue;
      successorSources.push({
        subjectId: synset.id,
        elementId: c.objectId,
        confidence: round4(c.confidence * (edge.confidence ?? 1)),
        derivation: [
          { relation: "MAPPED_TO", fromId: synset.id, toId: concept.id, kind: "curated" },
          { relation: c.edge.type, fromId: concept.id, toId: c.objectId, kind: "curated" },
        ],
      });
    }
  }
  for (const s of direct) {
    if (s.relation !== "HAS_ELEMENT" || s.mappingStatus !== "propagated") continue;
    successorSources.push({
      subjectId: s.subjectId,
      elementId: s.objectId,
      confidence: s.confidence,
      derivation: s.derivation,
    });
  }
  const successorSeen = new Map<string, PropagatedStatement>();
  for (const src of successorSources) {
    const next = generates(graph, src.elementId);
    if (!next || next === src.elementId) continue;
    const subjectNode = graph.getNode(src.subjectId);
    if (!subjectNode || !SUBJECT_TYPES.has(subjectNode.type)) continue;
    const st: PropagatedStatement = {
      id: "",
      subjectId: src.subjectId,
      relation: "HAS_ELEMENT",
      objectId: next,
      aspectKey: "temporal",
      band: "faint",
      confidence: round4(src.confidence * DECAY.SUCCESSOR),
      mappingStatus: "propagated",
      kind: "successor",
      provenanceKind: "derived",
      derivation: [
        ...src.derivation,
        {
          relation: "MUTUAL_GENERATION",
          fromId: src.elementId,
          toId: next,
          kind: "derived",
          note: "successor leaning: one generation step, temporal aspect only (§6.10)",
        },
      ],
      notes: [],
    };
    const directTemporal = temporalDirect.get(src.subjectId);
    if (directTemporal && directTemporal !== next) {
      st.mappingStatus = "superseded";
      st.notes.push("yields to a direct classification in the temporal aspect (§6.10)");
    }
    const k = keyOf(st);
    const prior = successorSeen.get(k);
    if (!prior || st.confidence > prior.confidence) successorSeen.set(k, st);
  }
  statements.push(...successorSeen.values());

  // Deterministic order + ids.
  statements.sort((a, b) => {
    const ka = `${a.subjectId}|${a.kind}|${a.relation}|${a.aspectKey}|${a.objectId}`;
    const kb = `${b.subjectId}|${b.kind}|${b.relation}|${b.aspectKey}|${b.objectId}`;
    return ka < kb ? -1 : ka > kb ? 1 : b.confidence - a.confidence;
  });
  statements.forEach((s, i) => (s.id = `prop-${i + 1}`));
  // Review items reference statement ids — fill them in now ids exist.
  const byKey = new Map<string, string[]>();
  for (const s of statements) {
    const k = `${s.subjectId}|${s.relation}|${s.aspectKey}`;
    const list = byKey.get(k);
    if (list) list.push(s.id);
    else byKey.set(k, [s.id]);
  }
  for (const item of reviewItems) {
    item.statementIds = byKey.get(`${item.subjectId}|${item.relation}|${item.aspectKey}`) ?? item.statementIds;
  }
  return { statements, reviewItems };
}

/* ------------------------------------------------------------------ */
/* Accessors (cached per graph)                                        */
/* ------------------------------------------------------------------ */

const cache = new WeakMap<Graph, PropagationResult>();

export function getPropagation(graph: Graph): PropagationResult {
  let result = cache.get(graph);
  if (!result) {
    result = propagateGraph(graph);
    cache.set(graph, result);
  }
  return result;
}

export function statementsFor(
  graph: Graph,
  subjectId: string,
  relation?: "HAS_POLARITY" | "HAS_ELEMENT",
): PropagatedStatement[] {
  return getPropagation(graph).statements.filter(
    (s) => s.subjectId === subjectId && (!relation || s.relation === relation),
  );
}

/** Usable statements: propagated status only (flagged and superseded
 *  statements are excluded from answers, §6.4). */
export function usableStatements(graph: Graph, subjectId: string): PropagatedStatement[] {
  return statementsFor(graph, subjectId).filter((s) => s.mappingStatus === "propagated");
}

/**
 * The best usable propagated statement for (subject, relation):
 * direct before successor (precedence, §6.10), then confidence. With
 * no aspect given, the overall aspect is preferred.
 */
export function bestPropagated(
  graph: Graph,
  subjectId: string,
  relation: "HAS_POLARITY" | "HAS_ELEMENT",
  aspectKey?: AspectKey,
): PropagatedStatement | undefined {
  let pool = usableStatements(graph, subjectId).filter((s) => s.relation === relation);
  if (aspectKey) pool = pool.filter((s) => s.aspectKey === aspectKey);
  else {
    const overall = pool.filter((s) => s.aspectKey === "overall");
    if (overall.length > 0) pool = overall;
  }
  pool.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "direct" ? -1 : 1;
    return b.confidence - a.confidence;
  });
  return pool[0];
}

export function propagatedPolarity(graph: Graph, subjectId: string): PropagatedStatement | undefined {
  return bestPropagated(graph, subjectId, "HAS_POLARITY", "overall");
}

export function propagatedElement(graph: Graph, subjectId: string): PropagatedStatement | undefined {
  return bestPropagated(graph, subjectId, "HAS_ELEMENT", "overall");
}
