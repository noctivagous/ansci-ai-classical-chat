/**
 * engine.ts — the ontology as engine (design §6.5–§6.9, slice 2c).
 *
 * Slice 1 stored the cycles and correspondence tables as facts; this
 * module promotes them to operators the reasoner applies:
 *  - the generation/restraint cycles as functions (§6.5), including
 *    restraint arbitration's damping rule (§6.5 use 2, applied by
 *    src/propagate.ts at merge time);
 *  - aspect-scoped classification (§6.6): the unit of classification is
 *    the tuple (concept, aspect) -> (element?, polarity?, degree?,
 *    confidence, status), keyed by the closed aspect vocabulary;
 *  - graded polarity (§6.7): bands read off proportions, season degree
 *    profiles and solstice turning points as atomic data;
 *  - balance dynamics (§6.8): subject profiles judged against season
 *    baselines — excess/deficiency by band or by the ≥ 0.15 proportion
 *    margin, moderation by the restraining element;
 *  - correspondence composition (§6.9): compose(term, domain) walks a
 *    classification outward through an element's correspondence row at
 *    the classification's own confidence — the table costs no decay.
 *
 * Everything here is a pure read over the graph: the engine computes,
 * it never writes. Propagation (§§6.1–6.4) lives in src/propagate.ts
 * and consumes these operators.
 */
import {
  Graph,
  GraphEdge,
  GraphNode,
  type AspectKey,
  type DegreeBand,
} from "./graph";
import { climbToAnchor, mappedConceptForSynset } from "./wordnet";

export type { AspectKey, DegreeBand };

/** The closed aspect-key vocabulary of §6.11 (plus the engine's own
 *  `temporal`, §6.10 — see the AspectKey type in graph.ts). */
export const ASPECT_KEYS: readonly AspectKey[] = [
  "overall",
  "light",
  "temperature",
  "activity",
  "pitch",
  "voice-origin",
  "air-motion",
  "formation",
  "state",
  "temporal",
];

/** §6.6: an edge with no aspect key carries the default aspect. */
export function aspectKeyOf(edge: GraphEdge): AspectKey {
  return edge.aspectKey ?? "overall";
}

/** §6.7 band thresholds: predominant ≥ 0.65, present 0.35–0.65, faint < 0.35. */
export function bandOfProportion(proportion: number): DegreeBand {
  if (proportion >= 0.65) return "predominant";
  if (proportion >= 0.35) return "present";
  return "faint";
}

const BAND_RANK: Record<DegreeBand, number> = { faint: 0, present: 1, predominant: 2 };
export function bandRank(band: DegreeBand): number {
  return BAND_RANK[band];
}

/** One step down the degree scale (§6.5 damping); faint is the floor. */
export function stepDownBand(band: DegreeBand): DegreeBand {
  if (band === "predominant") return "present";
  return "faint";
}

/* ------------------------------------------------------------------ */
/* Cycle operators (§6.5)                                              */
/* ------------------------------------------------------------------ */

function cycleTarget(graph: Graph, elementId: string, type: "MUTUAL_GENERATION" | "MUTUAL_RESTRAINT"): string | undefined {
  return graph.outEdges(elementId, type)[0]?.to;
}
function cycleSource(graph: Graph, elementId: string, type: "MUTUAL_GENERATION" | "MUTUAL_RESTRAINT"): string | undefined {
  return graph.inEdges(elementId, type)[0]?.from;
}

/** The element E generates: Wood -> Fire -> Earth -> Metal -> Water -> Wood. */
export function generates(graph: Graph, elementId: string): string | undefined {
  return cycleTarget(graph, elementId, "MUTUAL_GENERATION");
}
/** The element that generates E. */
export function generatedBy(graph: Graph, elementId: string): string | undefined {
  return cycleSource(graph, elementId, "MUTUAL_GENERATION");
}
/** The element E restrains: Wood -> Earth -> Water -> Fire -> Metal -> Wood. */
export function restrains(graph: Graph, elementId: string): string | undefined {
  return cycleTarget(graph, elementId, "MUTUAL_RESTRAINT");
}
/** The element that restrains E — what keeps E in check. */
export function restrainedBy(graph: Graph, elementId: string): string | undefined {
  return cycleSource(graph, elementId, "MUTUAL_RESTRAINT");
}

/* ------------------------------------------------------------------ */
/* Classification: the §6.6 tuple, direct edges only                   */
/* ------------------------------------------------------------------ */

export type ClassificationRelation = "HAS_ELEMENT" | "HAS_POLARITY";

export interface Classification {
  relation: ClassificationRelation;
  objectId: string; // element or polarity node id
  confidence: number; // atomic edges are absolute: 1
  aspectKey: AspectKey;
  aspect?: string; // the edge's free-text aspect gloss, when present
  /** "atomic" edges are absolute framework facts; "curated" are the
   *  acquired layer's scored mappings. Both outrank `propagated` (§6.4). */
  source: "atomic" | "curated";
  edge: GraphEdge;
}

const ELEMENT_EDGE_TYPES = ["ELEMENT_OF", "HAS_ELEMENT"] as const;
const POLARITY_EDGE_TYPES = ["POLARITY_OF", "HAS_POLARITY"] as const;

function classificationOf(edge: GraphEdge): Classification {
  const relation: ClassificationRelation =
    edge.type === "ELEMENT_OF" || edge.type === "HAS_ELEMENT" ? "HAS_ELEMENT" : "HAS_POLARITY";
  return {
    relation,
    objectId: edge.to,
    confidence: edge.confidence ?? 1,
    aspectKey: aspectKeyOf(edge),
    aspect: edge.aspect,
    source: edge.confidence === undefined ? "atomic" : "curated",
    edge,
  };
}

/** Every direct (edge-stated) classification of a node, aspect-scoped. */
export function directClassifications(graph: Graph, nodeId: string): Classification[] {
  const out: Classification[] = [];
  for (const t of [...ELEMENT_EDGE_TYPES, ...POLARITY_EDGE_TYPES]) {
    for (const e of graph.outEdges(nodeId, t)) {
      if (e.status === "deprecated") continue;
      out.push(classificationOf(e));
    }
  }
  return out;
}

/** The node's direct element classification in one aspect, if any. */
export function elementClassification(
  graph: Graph,
  nodeId: string,
  aspectKey: AspectKey = "overall",
): Classification | undefined {
  return directClassifications(graph, nodeId).find(
    (c) => c.relation === "HAS_ELEMENT" && c.aspectKey === aspectKey,
  );
}

/** The node's direct polarity classification in one aspect, if any. */
export function polarityClassification(
  graph: Graph,
  nodeId: string,
  aspectKey: AspectKey = "overall",
): Classification | undefined {
  return directClassifications(graph, nodeId).find(
    (c) => c.relation === "HAS_POLARITY" && c.aspectKey === aspectKey,
  );
}

/**
 * The element a term resolves to for composition (§6.9 step 1):
 * a direct classification first, then — for a synset — its mapped
 * concept's or climbed anchor's classification; the bridge/climb steps
 * are recorded so the derivation can say how the term was reached.
 */
export interface ElementResolution {
  elementId: string;
  confidence: number;
  aspectKey: AspectKey;
  /** True when the classification holds only in a narrow aspect
   *  (mercury's Water {state}) — composition through it is analogy. */
  analogy: boolean;
  /** Node whose classification was used (term itself, its mapped
   *  concept, or its climb anchor). */
  viaNodeId: string;
}

export function resolveElement(graph: Graph, termId: string): ElementResolution | undefined {
  // A correspondence value's membership in the table IS its
  // classification (§6.9's worked example: yu is Water's sound, so
  // composing yu starts from Water at atomic confidence).
  const termNode = graph.getNode(termId);
  if (termNode?.type === "Correspondence") {
    const edge = graph.outEdges(termId, "CORRESPONDS_TO")[0];
    if (edge) {
      return {
        elementId: edge.to,
        confidence: edge.confidence ?? 1,
        aspectKey: "overall",
        analogy: false,
        viaNodeId: termId,
      };
    }
  }
  const direct = elementClassification(graph, termId) ??
    directClassifications(graph, termId).find((c) => c.relation === "HAS_ELEMENT");
  if (direct) {
    return {
      elementId: direct.objectId,
      confidence: direct.confidence,
      aspectKey: direct.aspectKey,
      analogy: direct.aspectKey !== "overall",
      viaNodeId: termId,
    };
  }
  const node = graph.getNode(termId);
  if (node?.type === "Synset") {
    const mapped = mappedConceptForSynset(graph, termId);
    const anchor = mapped ?? climbToAnchor(graph, termId, 6)?.anchor;
    if (anchor) {
      const c =
        elementClassification(graph, anchor.id) ??
        directClassifications(graph, anchor.id).find((x) => x.relation === "HAS_ELEMENT");
      if (c) {
        return {
          elementId: c.objectId,
          confidence: c.confidence,
          aspectKey: c.aspectKey,
          analogy: c.aspectKey !== "overall",
          viaNodeId: anchor.id,
        };
      }
    }
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Correspondence composition (§6.9)                                   */
/* ------------------------------------------------------------------ */

export interface CorrespondenceEntry {
  nodeId: string;
  name: string;
  /** The table's domain for this entry ("sound" | "color" | "taste" |
   *  "direction" | "emotion" | "organ" | …), from the node itself. */
  category: string;
}

/** An element's full correspondence row, grouped by domain. */
export function correspondenceRow(
  graph: Graph,
  elementId: string,
): Map<string, CorrespondenceEntry[]> {
  const groups = new Map<string, CorrespondenceEntry[]>();
  for (const e of graph.inEdges(elementId, "CORRESPONDS_TO")) {
    const src = graph.getNode(e.from);
    if (!src) continue;
    const category = String(src.properties["category"] ?? "other");
    const entry: CorrespondenceEntry = { nodeId: src.id, name: src.name, category };
    const list = groups.get(category);
    if (list) list.push(entry);
    else groups.set(category, [entry]);
  }
  return groups;
}

export interface CompositionResult {
  termId: string;
  elementId: string;
  /** §6.9's confidence rule: the source classification's confidence,
   *  unchanged — the correspondence step itself costs no decay. */
  confidence: number;
  aspectKey: AspectKey;
  analogy: boolean;
  viaNodeId: string;
  groups: Map<string, CorrespondenceEntry[]>;
  entries: CorrespondenceEntry[];
}

/**
 * compose(term, targetDomain?) — §6.9. Classification first (its aspect
 * is recorded; a narrow-aspect classification marks the composition
 * `analogy`), then the element's correspondence row outward. Nothing
 * is stored against the term: the associations are derived on the spot.
 */
export function compose(
  graph: Graph,
  termId: string,
  targetDomain?: string,
): CompositionResult | undefined {
  const res = resolveElement(graph, termId);
  if (!res) return undefined;
  const all = correspondenceRow(graph, res.elementId);
  // §6.9's worked example includes the element's SEASON (yu -> Water ->
  // winter): seasons reach their element by ELEMENT_OF rather than a
  // table CORRESPONDS_TO edge, so the walk adds them as the season
  // entry. The term itself is never its own composed association.
  const seasons: CorrespondenceEntry[] = graph
    .inEdges(res.elementId, "ELEMENT_OF")
    .map((e) => graph.getNode(e.from))
    .filter((n): n is GraphNode => !!n && n.type === "Season")
    .filter((n) => n.id !== termId)
    .map((n) => ({ nodeId: n.id, name: n.name, category: "season" }));
  if (seasons.length) all.set("season", seasons);
  const groups = new Map<string, CorrespondenceEntry[]>();
  for (const [cat, entries] of all) {
    if (targetDomain && cat !== targetDomain) continue;
    const kept = entries.filter((e) => e.nodeId !== termId);
    if (kept.length) groups.set(cat, kept);
  }
  return {
    termId,
    elementId: res.elementId,
    confidence: res.confidence,
    aspectKey: res.aspectKey,
    analogy: res.analogy,
    viaNodeId: res.viaNodeId,
    groups,
    entries: [...groups.values()].flat(),
  };
}

/* ------------------------------------------------------------------ */
/* Season degree profiles, baselines, turning points (§§6.5, 6.7, 6.8) */
/* ------------------------------------------------------------------ */

export interface SeasonDegreeProfile {
  /** Yin proportion per aspect (light/temperature in 2c, §6.11). */
  aspects: Partial<Record<AspectKey, number>>;
  source: string;
}

export function seasonDegreeProfile(graph: Graph, seasonId: string): SeasonDegreeProfile | undefined {
  const raw = graph.getNode(seasonId)?.properties["degreeProfile"] as
    | Record<string, { yinProportion?: number } | string>
    | undefined;
  if (!raw) return undefined;
  const aspects: Partial<Record<AspectKey, number>> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value && typeof value === "object" && typeof value.yinProportion === "number") {
      aspects[key as AspectKey] = value.yinProportion;
    }
  }
  return { aspects, source: typeof raw.source === "string" ? raw.source : "canonical" };
}

export interface SeasonBaseline {
  proportions: Record<string, number>; // element id -> share
  bands: Record<string, DegreeBand>; // element id -> band
  source: string;
}

export function seasonBaseline(graph: Graph, seasonId: string): SeasonBaseline | undefined {
  const raw = graph.getNode(seasonId)?.properties["baseline"] as
    | { proportions?: Record<string, number>; bands?: Record<string, DegreeBand>; source?: string }
    | undefined;
  if (!raw?.proportions || !raw?.bands) return undefined;
  return {
    proportions: raw.proportions,
    bands: raw.bands,
    source: raw.source ?? "canonical",
  };
}

export interface TurningPoint {
  name: string;
  aspectKey: AspectKey;
  /** The polarity at its maximum ("yin" | "yang" — node ids). */
  extremum: string;
  turnsToward: string;
  cites: string;
}

export function turningPoint(graph: Graph, seasonId: string): TurningPoint | undefined {
  const raw = graph.getNode(seasonId)?.properties["turningPoint"] as
    | { name: string; aspectKey: AspectKey; extremum: string; turnsToward: string; cites: string }
    | undefined;
  return raw;
}

/* ------------------------------------------------------------------ */
/* Degree comparison (§6.7)                                            */
/* ------------------------------------------------------------------ */

export interface DegreeComparison {
  aspectKey: AspectKey;
  polarityId: string;
  aShare: number; // a's share of the asked polarity, in the aspect
  bShare: number;
  aBand: DegreeBand;
  bBand: DegreeBand;
  verdict: "more" | "less" | "equal";
  /** The turning point citable for the side that runs higher (§6.5). */
  turningPoint?: TurningPoint;
  turningPointSide?: "a" | "b";
}

/**
 * Compare two seasons' degree in ONE aspect (§6.7): ordering is by
 * band, then by proportion. Cross-aspect comparison is a category
 * error — this function only ever reads one aspect, and the router
 * declines the mixed form before it gets here.
 */
export function compareDegrees(
  graph: Graph,
  aId: string,
  bId: string,
  aspectKey: AspectKey,
  polarityId: string,
): DegreeComparison | undefined {
  const pa = seasonDegreeProfile(graph, aId);
  const pb = seasonDegreeProfile(graph, bId);
  const yinA = pa?.aspects[aspectKey];
  const yinB = pb?.aspects[aspectKey];
  if (yinA === undefined || yinB === undefined) return undefined;
  const share = (yin: number) => (polarityId === "yang" ? 1 - yin : yin);
  const aShare = share(yinA);
  const bShare = share(yinB);
  const aBand = bandOfProportion(aShare);
  const bBand = bandOfProportion(bShare);
  let verdict: DegreeComparison["verdict"] = "equal";
  if (bandRank(aBand) !== bandRank(bBand)) verdict = bandRank(aBand) > bandRank(bBand) ? "more" : "less";
  else if (Math.abs(aShare - bShare) > 1e-9) verdict = aShare > bShare ? "more" : "less";
  const out: DegreeComparison = { aspectKey, polarityId, aShare, bShare, aBand, bBand, verdict };
  if (verdict !== "equal") {
    const side = verdict === "more" ? "a" : "b";
    const tp = turningPoint(graph, side === "a" ? aId : bId);
    if (tp && tp.aspectKey === aspectKey && tp.extremum === polarityId) {
      out.turningPoint = tp;
      out.turningPointSide = side;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Balance dynamics (§6.8)                                             */
/* ------------------------------------------------------------------ */

/** A subject profile: shares (0..1) and/or bands per element id. */
export interface SubjectProfile {
  proportions?: Record<string, number>;
  bands?: Record<string, DegreeBand>;
}

export interface BalanceEntry {
  elementId: string;
  verdict: "excess" | "deficiency" | "in-range";
  subjectShare?: number;
  baselineShare: number;
  subjectBand?: DegreeBand;
  baselineBand: DegreeBand;
  /** excess -> restrainedBy(E); deficiency -> generatedBy(E). */
  moderatorId?: string;
  /** excess -> generates(E): the phase the excess also feeds. */
  downstreamId?: string;
  /** The element's correspondence row (manifestations of the verdict). */
  manifestations: Map<string, CorrespondenceEntry[]>;
}

export interface BalanceAssessment {
  seasonId: string;
  entries: BalanceEntry[];
  excess: BalanceEntry[];
  deficiency: BalanceEntry[];
}

/** §6.8's margin: a proportion must clear the baseline by this much. */
export const BALANCE_MARGIN = 0.15;

/**
 * Judge a subject profile against a season's baseline (§6.8).
 * Excess(E): the subject's band is above the baseline band, or its
 * proportion exceeds the baseline proportion by >= 0.15. Deficiency is
 * the symmetric shortfall. The conclusions are framework-internal
 * derivations — moderation/support come straight from the cycle
 * operators, manifestations from the element's correspondence row.
 */
export function assessBalance(
  graph: Graph,
  profile: SubjectProfile,
  seasonId: string,
): BalanceAssessment | undefined {
  const baseline = seasonBaseline(graph, seasonId);
  if (!baseline) return undefined;
  const elementIds = new Set([
    ...Object.keys(baseline.proportions),
    ...Object.keys(profile.proportions ?? {}),
    ...Object.keys(profile.bands ?? {}),
  ]);
  const entries: BalanceEntry[] = [];
  for (const elementId of elementIds) {
    const baselineShare = baseline.proportions[elementId] ?? 0;
    const baselineBand = baseline.bands[elementId] ?? "faint";
    const subjectShare = profile.proportions?.[elementId];
    const subjectBand =
      profile.bands?.[elementId] ??
      (subjectShare !== undefined ? bandOfProportion(subjectShare) : undefined);
    let verdict: BalanceEntry["verdict"] = "in-range";
    if (
      (subjectBand !== undefined && bandRank(subjectBand) > bandRank(baselineBand)) ||
      (subjectShare !== undefined && subjectShare - baselineShare >= BALANCE_MARGIN)
    ) {
      verdict = "excess";
    } else if (
      (subjectBand !== undefined && bandRank(subjectBand) < bandRank(baselineBand)) ||
      (subjectShare !== undefined && baselineShare - subjectShare >= BALANCE_MARGIN)
    ) {
      verdict = "deficiency";
    }
    const entry: BalanceEntry = {
      elementId,
      verdict,
      baselineShare,
      baselineBand,
      manifestations: correspondenceRow(graph, elementId),
    };
    if (subjectShare !== undefined) entry.subjectShare = subjectShare;
    if (subjectBand !== undefined) entry.subjectBand = subjectBand;
    if (verdict === "excess") {
      entry.moderatorId = restrainedBy(graph, elementId);
      entry.downstreamId = generates(graph, elementId);
    } else if (verdict === "deficiency") {
      entry.moderatorId = generatedBy(graph, elementId);
    }
    entries.push(entry);
  }
  return {
    seasonId,
    entries,
    excess: entries.filter((e) => e.verdict === "excess"),
    deficiency: entries.filter((e) => e.verdict === "deficiency"),
  };
}

/** Node lookup convenience for callers rendering engine results. */
export function nodeOf(graph: Graph, id: string): GraphNode | undefined {
  return graph.getNode(id);
}
