/**
 * graph.ts — AnSci ontology graph types and in-memory store.
 *
 * Node types, edge types, layers, and fields follow the user's spec in
 * docs/user-plans/ontologyGraph.txt:
 *   layers: atomic | dictionary | acquired | source | audit
 *   acquired edges carry a confidence score (0.0-1.0); atomic edges do not.
 *   edges may carry an `aspect`, because yin/yang are multi-aspect
 *   properties (see docs/user-ref/nct-ancientscience-TrebleAndBass.txt):
 *   one concept can be Yang in one aspect and Yin in another.
 */

export type Layer = "atomic" | "dictionary" | "acquired" | "source" | "audit" | "base";

/**
 * Closed aspect-key vocabulary (design §6.11): the seed's free-text
 * aspects are glossed by one of these keys, and the engine (§6.6) keys
 * conflict, joins and propagation by them. `temporal` is the engine's
 * own aspect (§6.10 successor leanings, §6.5 cycle-position statements)
 * — it never appears on a seed edge. An edge with no key reads as
 * `overall` (§6.6: the default aspect, overall character).
 */
export type AspectKey =
  | "overall"
  | "light"
  | "temperature"
  | "activity"
  | "pitch"
  | "voice-origin"
  | "air-motion"
  | "formation"
  | "state"
  | "temporal";

/** Graded polarity degree (§6.7): canonical bands read off proportions. */
export type DegreeBand = "predominant" | "present" | "faint";

export type NodeType =
  | "Polarity"
  | "Element"
  | "Trigram"
  | "Hexagram"
  | "Season"
  | "TimeOfDay"
  | "Quality"
  | "Correspondence"
  | "Concept"
  | "Synset"
  | "DictionaryEntry"
  | "TextPassage"
  | "GraphAdjustment"
  | "Frame"
  | "FrameElement"
  | "LexicalUnit";

export type EdgeType =
  // atomic
  | "MUTUAL_GENERATION"
  | "MUTUAL_RESTRAINT"
  | "POLARITY_OF"
  | "ELEMENT_OF"
  | "CONTAINS_SEED"
  | "TRIGRAM_COMPOSES"
  | "HAS_QUALITY"
  | "CORRESPONDS_TO"
  // dictionary
  | "DEFINED_AS"
  // acquired (confidence-bearing)
  | "HAS_POLARITY"
  | "HAS_ELEMENT"
  | "HAS_TRIGRAM"
  | "MAPPED_TO"
  | "ASSOCIATED_WITH"
  | "SYNONYM_OF"
  | "MUTUALLY_ROOTED_WITH"
  // source + audit
  | "SOURCED_FROM"
  | "ADJUSTED_BY"
  | "TRIGGERED_BY"
  // base nets (WordNet, slice 2a — see src/wordnet.ts)
  | "IS_A" // synset -> hypernym synset
  | "PART_OF" // meronym synset -> holonym synset (subtype in `aspect`)
  | "ANTONYM_OF"
  | "SIMILAR_TO"
  | "DERIVED_FROM"
  | "ENTAILS"
  | "CAUSES"
  // commonsense nets (ConceptNet, slice 2e — see design §6.2's rule
  // table: the propagation rules for these types are implemented in
  // slice 2c, ahead of the data they will run over)
  | "HAS_PROPERTY" // bearer -> property concept
  | "CAPABLE_OF" // bearer -> capability concept
  // Wikidata KB tier (slice W2 — see src/ansci/wikidata-bank.ts:
  // retrieved associations banked into the base partition)
  | "CAPITAL_OF" // capital -> territory (Wikidata P36, inverted at import)
  | "LOCATED_IN" // thing -> containing place/country (Wikidata P17/P131)
  // FrameNet (slice 2d, design §6.2): lexical unit -> frame it evokes
  | "EVOKES"
  | "HAS_FRAME_ELEMENT"
  | "INHERITS_FROM"
  | "USES_FRAME"
  | "SUBFRAME_OF";

/**
 * A curated set of everyday-language phrases describing how a concept
 * characteristically shows up in ordinary speech (design §9.3). Carried
 * by DictionaryEntry nodes; the plain-mode renderer's only sanctioned
 * vocabulary for talking about a prior-level concept without naming it.
 */
export interface ManifestationSet {
  /** "weather" | "mood" | "body" | … — the edge-aspect vocabulary. */
  aspect?: string;
  phrases: string[];
}

export type DictionaryStatus = "approved" | "proposed" | "deprecated";
export type AdjustmentStatus = "applied" | "reverted" | "flagged";
export type AdjustmentType =
  | "ADD_RELATIONSHIP"
  | "REMOVE_RELATIONSHIP"
  | "UPDATE_CONFIDENCE"
  | "DEPRECATE"
  | "RELINK";

export interface GraphNode {
  id: string;
  /** Display name / unique key, e.g. "Water", "derivative", "high pressure system". */
  name: string;
  type: NodeType;
  layer: Layer;
  /** Acquired Concept fields (spec): domain + plain-English summary. */
  domain?: string;
  summary?: string;
  /** DictionaryEntry fields (spec). */
  word?: string;
  definition?: string;
  partOfSpeech?: string;
  status?: DictionaryStatus;
  /** DictionaryEntry only (design §9.3): sanctioned plain-speech phrases. */
  manifestations?: ManifestationSet[];
  /** TextPassage fields (spec). */
  sourceTitle?: string;
  chapter?: number | string;
  page?: number;
  rawText?: string;
  language?: string;
  /** GraphAdjustment fields (spec). */
  adjustmentType?: AdjustmentType;
  targetNode?: string;
  targetEdge?: string;
  oldValue?: string | number;
  newValue?: string | number;
  reason?: string;
  evaluationQuestion?: string;
  expectedAnswer?: string;
  graphAnswer?: string;
  confidenceBefore?: number;
  confidenceAfter?: number;
  adjustmentStatus?: AdjustmentStatus;
  /** Free-form extra properties (synonyms, trigram meaning, polarity note…). */
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  from: string; // node id
  to: string; // node id
  type: EdgeType;
  /** Acquired edges only, 0.0–1.0. Atomic edges leave this undefined (absolute). */
  confidence?: number;
  /**
   * Which aspect of the source concept this edge describes, e.g.
   * bass HAS_POLARITY Yang {aspect: "voice origin"} but Yin {aspect: "pitch"}.
   */
  aspect?: string;
  /**
   * The closed aspect key (§6.11) glossing `aspect`. Classification
   * edges (HAS_POLARITY / HAS_ELEMENT / ELEMENT_OF / POLARITY_OF) carry
   * one; other edge types overload `aspect` with non-aspect data
   * (meronym subtype, antonym lemma pair) and leave this undefined.
   */
  aspectKey?: AspectKey;
  /**
   * Degree on polarity statements (§6.7/§6.11): the band, plus the
   * optional 0..1 proportion it was read off. Mandatory on propagated
   * leanings (those live on overlay records, §6.1); curated seed
   * classifications are backfilled later (§6.11).
   */
  band?: DegreeBand;
  proportion?: number;
  status?: "active" | "deprecated";
  /**
   * Free-form extra properties (FrameNet slice 2d: core flag on
   * HAS_FRAME_ELEMENT edges, FE correspondences on relation edges,
   * lemma-pos bridge marks on LU linkages).
   */
  properties?: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** One hop of a reasoning path: node —edge→ node. */
export interface PathStep {
  from: string; // node id
  fromName: string;
  edgeType: EdgeType;
  edgeId: string;
  to: string; // node id
  toName: string;
  confidence?: number;
  aspect?: string;
  aspectKey?: AspectKey;
  /** "forward" follows the edge direction; "reverse" walks it backwards. */
  direction: "forward" | "reverse";
}

export interface Path {
  steps: PathStep[];
  /** Human-readable rendering, e.g. "winter —ELEMENT_OF→ Water —POLARITY_OF→ Yin —HAS_QUALITY→ cold". */
  text: string;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** An edge passes a confidence threshold if it is atomic (no score) or scored >= threshold. */
export function passesThreshold(edge: GraphEdge, confidenceThreshold: number): boolean {
  if (edge.status === "deprecated") return false;
  return edge.confidence === undefined || edge.confidence >= confidenceThreshold;
}

export class Graph {
  private nodesById = new Map<string, GraphNode>();
  private edgesById = new Map<string, GraphEdge>();
  private outgoing = new Map<string, GraphEdge[]>();
  private incoming = new Map<string, GraphEdge[]>();

  addNode(node: Omit<GraphNode, "properties"> & { properties?: Record<string, unknown> }): GraphNode {
    const full: GraphNode = { properties: {}, ...node };
    if (this.nodesById.has(full.id)) throw new Error(`duplicate node id: ${full.id}`);
    this.nodesById.set(full.id, full);
    return full;
  }

  addEdge(edge: Omit<GraphEdge, "id"> & { id?: string }): GraphEdge {
    if (!this.nodesById.has(edge.from)) throw new Error(`edge from unknown node: ${edge.from}`);
    if (!this.nodesById.has(edge.to)) throw new Error(`edge to unknown node: ${edge.to}`);
    let id =
      edge.id ??
      `${edge.from}--${edge.type}-->${edge.to}` + (edge.aspect ? ` [${slugify(edge.aspect)}]` : "");
    let n = 2;
    const base = id;
    while (this.edgesById.has(id)) id = `${base}#${n++}`;
    const full: GraphEdge = { ...edge, id };
    this.edgesById.set(id, full);
    pushTo(this.outgoing, full.from, full);
    pushTo(this.incoming, full.to, full);
    return full;
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodesById.get(id);
  }

  nodeByName(name: string): GraphNode | undefined {
    const want = name.toLowerCase();
    const matches = this.allNodes().filter((nd) => nd.name.toLowerCase() === want);
    // Named-entity grounding nodes (src/ansci/entities.ts, Slice 0)
    // are never name referents: an entity or its class may share
    // a name with an ordinary concept ("table" the furniture
    // class stands above some entity's class; "turkey" names
    // both a country and a bird), and several checks read a
    // nodeByName hit as "the graph holds this kind" — a reading
    // an entity's class chain must not satisfy. Entity nodes
    // stand in the graph by id and edge (their IS_A instance
    // relations), and their name index is lookupEntity.
    const referable = matches.filter((nd) => !nd.properties["entity"] && !nd.properties["entityClass"]);
    // A word and its DictionaryEntry share a name; the concept is the referent.
    return referable.find((nd) => nd.type !== "DictionaryEntry") ?? referable[0];
  }

  allNodes(): GraphNode[] {
    return [...this.nodesById.values()];
  }

  allEdges(): GraphEdge[] {
    return [...this.edgesById.values()];
  }

  outEdges(fromId: string, type?: EdgeType): GraphEdge[] {
    const list = this.outgoing.get(fromId) ?? [];
    return type ? list.filter((e) => e.type === type) : list;
  }

  inEdges(toId: string, type?: EdgeType): GraphEdge[] {
    const list = this.incoming.get(toId) ?? [];
    return type ? list.filter((e) => e.type === type) : list;
  }

  synonymsOf(node: GraphNode): string[] {
    const s = node.properties["synonyms"];
    return Array.isArray(s) ? s.filter((x): x is string => typeof x === "string") : [];
  }

  /**
   * Shortest path from `fromId` to `toId` over the given edge types,
   * honouring the confidence threshold. Returns null if no path exists.
   * This is the workhorse of shared-prior inference: qualities hang off
   * polarities/elements, concepts hang off polarities/elements, and the
   * join on the shared prior IS the path.
   */
  findPath(
    fromId: string,
    toId: string,
    opts: { edgeTypes: EdgeType[]; confidenceThreshold: number; maxDepth?: number },
  ): Path | null {
    if (fromId === toId) return { steps: [], text: this.getNode(fromId)?.name ?? fromId };
    const maxDepth = opts.maxDepth ?? 6;
    const allowed = new Set(opts.edgeTypes);
    const visited = new Set<string>([fromId]);
    const queue: { nodeId: string; steps: PathStep[] }[] = [{ nodeId: fromId, steps: [] }];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.steps.length >= maxDepth) continue;
      for (const edge of this.outEdges(cur.nodeId)) {
        if (!allowed.has(edge.type) || !passesThreshold(edge, opts.confidenceThreshold)) continue;
        if (visited.has(edge.to)) continue;
        const step: PathStep = {
          from: edge.from,
          fromName: displayName(this.getNode(edge.from), edge.from),
          edgeType: edge.type,
          edgeId: edge.id,
          to: edge.to,
          toName: displayName(this.getNode(edge.to), edge.to),
          confidence: edge.confidence,
          aspect: edge.aspect,
          aspectKey: edge.aspectKey,
          direction: "forward",
        };
        const steps = [...cur.steps, step];
        if (edge.to === toId) return { steps, text: renderPath(steps) };
        visited.add(edge.to);
        queue.push({ nodeId: edge.to, steps });
      }
    }
    return null;
  }

  toJSON(): GraphData {
    return { nodes: this.allNodes(), edges: this.allEdges() };
  }

  static fromJSON(data: GraphData): Graph {
    const g = new Graph();
    for (const n of data.nodes) g.addNode(n);
    for (const e of data.edges) g.addEdge(e);
    return g;
  }
}

function pushTo(map: Map<string, GraphEdge[]>, key: string, edge: GraphEdge): void {
  const list = map.get(key);
  if (list) list.push(edge);
  else map.set(key, [edge]);
}

export function renderPath(steps: PathStep[]): string {
  if (steps.length === 0) return "";
  const parts: string[] = [steps[0].direction === "forward" ? steps[0].fromName : steps[0].toName];
  for (const s of steps) {
    const conf = s.confidence !== undefined ? ` (${s.confidence.toFixed(2)})` : "";
    const aspect = s.aspect ? ` {${s.aspect}}` : "";
    // A reverse step walks an edge backwards: we arrive at the edge's source.
    if (s.direction === "forward") parts.push(`—${s.edgeType}${aspect}${conf}→ ${s.toName}`);
    else parts.push(`←${s.edgeType}${aspect}${conf}— ${s.fromName}`);
  }
  return parts.join(" ");
}

/** Display name for paths: dictionary entries are shown as DictionaryEntry("word"). */
export function displayName(node: GraphNode | undefined, fallback: string): string {
  if (!node) return fallback;
  if (node.type === "DictionaryEntry") return `DictionaryEntry("${node.word ?? node.name}")`;
  // Synsets display with their sense id: the lemma alone is ambiguous — the
  // id is what distinguishes "cold" the temperature from "cold" the illness.
  if (node.type === "Synset") return `${node.name} (${node.id})`;
  return node.name;
}
