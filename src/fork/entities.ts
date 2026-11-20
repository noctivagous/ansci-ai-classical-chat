/**
 * entities.ts — named-entity grounding (Transcript Slice 0,
 * 2026-11-19).
 *
 * The gap (diagnostic probe 2026-11-19, K1 as corrected by the
 * owner's erratum): Oklahoma IS in the bundled WordNet extract —
 * synset wn-n09295833, "a state in south central United States",
 * lemmas Oklahoma / Sooner State / OK / Okla. — but no named
 * entity ever reached the knowledge the fork's answer path reads
 * (the classification table, the fork graph), so "what is
 * oklahoma?" declined with "nothing on oklahoma in my notes".
 * The knowledge was in the building; it was never ingested.
 * This module is the ingest.
 *
 * HOW THE EXTRACT MARKS A NAMED ENTITY. Not by capitalisation:
 * 24,647 noun synsets carry a capitalised lemma (eponyms and
 * derived terms — "French leave", "Freudian slip", "KO" —,
 * acronyms, and ordinary instances alike), so a capitalised
 * lemma cannot distinguish a name from a common noun, and
 * grounding on it would make words the system should decline
 * on "known". The extract's own mark is the INSTANCE relation:
 * a noun synset that stands as the source of an `instance`
 * edge is an instance — a named individual — of the edge's
 * target class synset (Oklahoma —instance→ American state).
 * 7,756 distinct synsets carry that mark in the shipped
 * extract (8,614 instance edges); 7,748 of them also carry a
 * capitalised lemma, and the 8 that do not ("church mouse",
 * "lynx" the browser, "off-Broadway"…) are instances still —
 * the relation, not the spelling, is the evidence. Every
 * grounded entity below is an instance synset, identified by
 * that relation alone.
 *
 * WHAT IS GROUNDED, AND WHERE IT LIVES. Per the design
 * record's knowledge-as-associations law, the entity's TYPE
 * is a relation between concepts, so it lives in the graph:
 * mergeEntities (called by buildForkGraph in join.ts) adds one
 * Concept node per entity synset and an IS_A edge, aspect
 * "instance", to a node for its class synset, and the class's
 * own hypernym chain as IS_A edges (bounded, see TYPE_CHAIN_MAX)
 * — the same edge shape src/wordnet.ts's mergeWordNet gives
 * instance relations on the base layer. The GLOSS is a value
 * the entity carries, so it lives where values live: in the
 * node properties (and in this module's records, which are the
 * store the merge reads and the answer path cites). Nothing
 * else is asserted: no element classification (an entity is
 * not a Wuxing correspondence, and none is invented for it),
 * no location, no coordinates — gloss + type is the whole
 * payload, exactly as the data holds it.
 *
 * NAME COLLISIONS. An entity or its class can share a name
 * with an ordinary concept — the furniture synset "table"
 * stands in the class chain of table-shaped entities, and
 * "turkey" names a country and a bird. Checks across the fork
 * read a name-lookup hit as "the graph holds this kind", a
 * reading an entity's class chain must not satisfy (it broke
 * the unanchored-definite check: "Is the table cold?" stopped
 * asking after its referent). So entity and class nodes are
 * never name referents: Graph.nodeByName skips nodes carrying
 * the entity/entityClass property flags, the nodes stand in
 * the graph by id and edge, and lookupEntity below is the
 * entities' name index — the one path that resolves a name to
 * its grounded entity.
 *
 * PROVENANCE. Every record, node and edge of this ingest is
 * tagged "wordnet-retrieved": the retrieved kind of
 * src/propagate.ts's provenance kinds (net edges are
 * retrieved; seed classifications are curated; conclusions are
 * derived), specialised with the source — the Open English
 * WordNet 2024 extract the repo already ships, CC BY 4.0 (see
 * src/wordnet.ts). The synset id rides on every record, so any
 * grounded answer can be traced to the exact synset it came
 * from.
 *
 * THE HONEST EDGE. Grounding is by attested instance synset,
 * never by the question's spelling: a capitalised word with
 * no instance synset (Atlantis — a regular synset, an island
 * of legend, no instance edge) is NOT grounded, and a name
 * the extract does not hold at all is not either. Both still
 * decline, located at the name, exactly as before.
 */
import { getDefaultExtract, type SynsetRecord, type WordNetExtract } from "../wordnet";
import type { Graph } from "../graph";

/** The provenance tag every record, node and edge of this ingest carries. */
export const ENTITY_PROVENANCE = "wordnet-retrieved" as const;

/** How far up the class's hypernym chain the type chain (and the
 *  graph merge) climbs from the class synset. The chains in the
 *  extract reach the root in a handful of hops (Oklahoma's class:
 *  American state → state → administrative district → district →
 *  region → location → object → physical entity → entity); the
 *  bound exists so a malformed cycle in the data cannot loop
 *  the climb, not to truncate a real chain. */
export const TYPE_CHAIN_MAX = 10;

export interface EntityRecord {
  /** Display name: the synset's primary lemma, as the extract spells it ("Oklahoma"). */
  name: string;
  /** Every lemma of the synset, as the extract spells them. */
  lemmas: string[];
  /** The synset's gloss, verbatim ("a state in south central United States"). */
  gloss: string;
  /** The synset's stable id ("wn-n09295833") — the record's address in the extract. */
  synsetId: string;
  /** The class names the entity is an instance of: the instance
   *  edges' target synsets' primary lemmas ("American state").
   *  Most entities hold one; a few hold two (Shakespeare:
   *  dramatist and poet). */
  classes: string[];
  /** The type chain: the first class, then its hypernym
   *  ancestors' primary lemmas, nearest first, bounded by
   *  TYPE_CHAIN_MAX. */
  typeChain: string[];
  provenance: typeof ENTITY_PROVENANCE;
  /** The extract's own source statement, carried so the record
   *  names where it was retrieved from. */
  source: string;
}

interface EntityStore {
  /** Every grounded entity, one record per instance synset, in extract order. */
  records: EntityRecord[];
  /** Lowercase lemma -> the record of the instance synset that
   *  carries it. When several instance synsets share a lemma,
   *  the first in extract order (the dictionary's sense order)
   *  wins — the same precedence wordnet-lex.ts's climb uses. */
  byLemma: Map<string, EntityRecord>;
  /** Instance synset index -> its record, for the graph merge. */
  bySynsetIndex: Map<number, EntityRecord>;
  /** Class/ancestor synset index -> node material for the merge. */
  classSynsets: Map<number, { synset: SynsetRecord; parents: number[] }>;
  /** Entity synset index -> its class synset indices. */
  classesOf: Map<number, number[]>;
}

let storeCache: EntityStore | undefined;

/* ---------------- extract availability ----------------
 * The default extract is a filesystem load (wordnet.ts's
 * loadWordNetExtract reads the manifest and the part files).
 * In the browser build the fs stub throws by design, and —
 * like the WordNet and FrameNet providers (wordnet-lex.ts's
 * extract(), framenet-lex.ts's verbClassification) — this
 * path catches that and disables itself: no store, no merge,
 * no lookups. Entity grounding is off wherever the extract
 * cannot load; Node behaviour is unchanged, the load
 * succeeding and caching exactly as before. */

let defaultExtractTried = false;
let defaultExtractCache: WordNetExtract | null = null;

function defaultEntityExtract(): WordNetExtract | null {
  if (!defaultExtractTried) {
    defaultExtractTried = true;
    try {
      defaultExtractCache = getDefaultExtract();
    } catch {
      defaultExtractCache = null; // extract unavailable: grounding off
    }
  }
  return defaultExtractCache;
}

/** The store when grounding is off: no records, no classes. */
const EMPTY_STORE: EntityStore = {
  records: [],
  byLemma: new Map(),
  bySynsetIndex: new Map(),
  classSynsets: new Map(),
  classesOf: new Map(),
};

function relationRows(extract: WordNetExtract, kind: string, stride: number): number[][] {
  const flat = extract.relations[kind] ?? [];
  const out: number[][] = [];
  for (let i = 0; i + stride <= flat.length; i += stride) {
    out.push([Number(flat[i]), Number(flat[i + 1])]);
  }
  return out;
}

/** Build the entity store from the extract: instance synsets,
 *  their classes, and the classes' hypernym chains. Built once
 *  per process and cached — the extract itself is already a
 *  per-process singleton (getDefaultExtract). With no extract
 *  argument and none loadable (the browser build), returns
 *  the empty store: grounding off, every lookup a miss. */
export function entityStore(extract?: WordNetExtract): EntityStore {
  const ex = extract ?? defaultEntityExtract();
  if (!ex) return EMPTY_STORE;
  if (storeCache && ex === defaultEntityExtract()) return storeCache;
  const instanceOf = new Map<number, number[]>();
  for (const [from, to] of relationRows(ex, "instance", 2)) {
    const list = instanceOf.get(from) ?? [];
    if (!list.includes(to)) list.push(to);
    instanceOf.set(from, list);
  }
  const hypernymsOf = new Map<number, number[]>();
  for (const [from, to] of relationRows(ex, "hypernym", 2)) {
    const list = hypernymsOf.get(from) ?? [];
    if (!list.includes(to)) list.push(to);
    hypernymsOf.set(from, list);
  }
  const synsetAt = (idx: number): SynsetRecord | undefined => ex.synsets[idx];

  const records: EntityRecord[] = [];
  const byLemma = new Map<string, EntityRecord>();
  const bySynsetIndex = new Map<number, EntityRecord>();
  const classSynsets = new Map<number, { synset: SynsetRecord; parents: number[] }>();
  const classesOf = new Map<number, number[]>();

  // The class-node material the graph merge needs: every class
  // synset plus its hypernym ancestors, registered afterwards by
  // breadth-first climb so each synset is registered at its
  // SHALLOWEST distance from a class (a recursive registration
  // could strand a synset first reached deep in one chain).
  const classRoots: number[] = [];

  for (const [idx, classIdxs] of [...instanceOf.entries()].sort((a, b) => a[0] - b[0])) {
    const synset = synsetAt(idx);
    if (!synset || synset.pos !== "n") continue;
    const classes: string[] = [];
    for (const c of classIdxs) {
      const cs = synsetAt(c);
      if (cs?.lemmas[0] && !classes.includes(cs.lemmas[0])) classes.push(cs.lemmas[0]);
      if (!classRoots.includes(c)) classRoots.push(c);
    }
    if (!classes.length) continue;
    // The type chain: from the first class, climb first-hypernym
    // links (the taxonomy's main line), bounded and cycle-safe.
    const typeChain: string[] = [classes[0]];
    {
      let cur = classIdxs[0];
      const seen = new Set<number>([idx, cur]);
      for (let hop = 0; hop < TYPE_CHAIN_MAX; hop++) {
        const next = (hypernymsOf.get(cur) ?? []).find((p) => !seen.has(p));
        if (next === undefined) break;
        seen.add(next);
        const ns = synsetAt(next);
        if (!ns?.lemmas[0]) break;
        typeChain.push(ns.lemmas[0]);
        cur = next;
      }
    }
    const record: EntityRecord = {
      name: synset.lemmas[0] ?? synset.id,
      lemmas: synset.lemmas,
      gloss: synset.gloss,
      synsetId: synset.id,
      classes,
      typeChain,
      provenance: ENTITY_PROVENANCE,
      source: ex.source,
    };
    records.push(record);
    bySynsetIndex.set(idx, record);
    classesOf.set(idx, classIdxs);
    for (const lem of synset.lemmas) {
      const key = lem.toLowerCase();
      if (!byLemma.has(key)) byLemma.set(key, record);
    }
  }
  {
    const distance = new Map<number, number>();
    const queue: number[] = [];
    for (const c of classRoots) {
      if (!distance.has(c)) {
        distance.set(c, 0);
        queue.push(c);
      }
    }
    while (queue.length) {
      const cur = queue.shift()!;
      const d = distance.get(cur)!;
      const synset = synsetAt(cur);
      if (!synset) continue;
      const parents = (hypernymsOf.get(cur) ?? []).filter((p) => synsetAt(p));
      classSynsets.set(cur, { synset, parents });
      if (d >= TYPE_CHAIN_MAX) continue;
      for (const p of parents) {
        if (!distance.has(p)) {
          distance.set(p, d + 1);
          queue.push(p);
        }
      }
    }
  }
  const store: EntityStore = { records, byLemma, bySynsetIndex, classSynsets, classesOf };
  if (ex === defaultEntityExtract()) storeCache = store;
  return store;
}

/**
 * The grounded entity a lemma names, if any: the instance
 * synset carrying that lemma (any of its lemmas — "sooner
 * state" names Oklahoma's synset too), or undefined when the
 * extract holds no instance synset for it. Case-insensitive;
 * the parser's lemmas are already lowercase.
 */
export function lookupEntity(lemma: string): EntityRecord | undefined {
  return entityStore().byLemma.get(lemma.toLowerCase());
}

/** Every grounded entity record (extract order). */
export function allEntities(): EntityRecord[] {
  return entityStore().records;
}

export function entityNodeId(synsetId: string): string {
  return `entity-${synsetId}`;
}

export function entityClassNodeId(synsetId: string): string {
  return `entity-class-${synsetId}`;
}

/**
 * Merge the grounded entities into a fork graph (join.ts's
 * buildForkGraph calls this): one Concept node per entity
 * synset — named by the primary lemma, lowercased, carrying
 * the gloss and provenance in its properties — and one node per
 * class/ancestor synset; an IS_A edge (aspect "instance") from
 * each entity to each of its classes, and IS_A edges up the
 * classes' hypernym chains. No HAS_ELEMENT edge is added: an
 * entity earns no element classification from being named.
 * Returns counts of what was added.
 */
export function mergeEntities(graph: Graph, extract?: WordNetExtract): { nodes: number; edges: number } {
  const store = entityStore(extract);
  let nodes = 0;
  let edges = 0;
  const classNodeId = (idx: number): string | undefined => {
    const material = store.classSynsets.get(idx);
    if (!material) return undefined;
    const id = entityClassNodeId(material.synset.id);
    if (!graph.getNode(id)) {
      graph.addNode({
        id,
        name: (material.synset.lemmas[0] ?? material.synset.id).toLowerCase(),
        type: "Concept",
        layer: "base",
        domain: "fork",
        summary: `wordnet class synset: ${material.synset.gloss}`,
        properties: {
          provenance: ENTITY_PROVENANCE,
          source: "wordnet",
          entityClass: true,
          synsetId: material.synset.id,
          gloss: material.synset.gloss,
          lemmas: material.synset.lemmas,
        },
      });
      nodes++;
    }
    return id;
  };
  for (const [idx, material] of store.classSynsets) {
    const id = classNodeId(idx);
    if (!id) continue;
    for (const parent of material.parents) {
      const parentId = classNodeId(parent);
      if (!parentId || parentId === id) continue;
      if (!graph.outEdges(id, "IS_A").some((e) => e.to === parentId)) {
        graph.addEdge({ from: id, to: parentId, type: "IS_A", properties: { provenance: ENTITY_PROVENANCE, source: "wordnet" } });
        edges++;
      }
    }
  }
  for (const [idx, record] of store.bySynsetIndex) {
    const id = entityNodeId(record.synsetId);
    if (!graph.getNode(id)) {
      graph.addNode({
        id,
        name: record.name.toLowerCase(),
        type: "Concept",
        layer: "base",
        domain: "fork",
        summary: `named entity (wordnet instance): ${record.gloss}`,
        properties: {
          provenance: ENTITY_PROVENANCE,
          source: "wordnet",
          entity: true,
          synsetId: record.synsetId,
          gloss: record.gloss,
          lemmas: record.lemmas,
          synonyms: record.lemmas.slice(1).map((l) => l.toLowerCase()),
          classes: record.classes,
          typeChain: record.typeChain,
        },
      });
      nodes++;
    }
    for (const classIdx of store.classesOf.get(idx) ?? []) {
      const classId = classNodeId(classIdx);
      if (!classId) continue;
      if (!graph.outEdges(id, "IS_A").some((e) => e.to === classId && e.aspect === "instance")) {
        graph.addEdge({
          from: id,
          to: classId,
          type: "IS_A",
          aspect: "instance",
          properties: { provenance: ENTITY_PROVENANCE, source: "wordnet", synsetId: record.synsetId },
        });
        edges++;
      }
    }
  }
  return { nodes, edges };
}
