/**
 * wordnet.ts — the WordNet base layer (slice 2a).
 *
 * Loads the trimmed Open English WordNet extract (data/wordnet/extract/ —
 * a manifest.json plus chunked part-*.json files, each part ≤ 3.5 MB,
 * built by scripts/import-wordnet.py from the OEWN WNDB release, CC BY 4.0)
 * into the graph as `Synset` nodes on the new `base` layer, then bridges
 * curated seed concepts to the exact synsets they denote (SENSE_MAPPINGS).
 *
 * Design points (docs/design-base-nets-and-chat.md §1.1):
 *  - Mappings are keyed to SENSES, not strings: the quality `cold` maps to
 *    the temperature adjective synset wn-a01258433, while the illness synset
 *    wn-n14389489 ("cold, common cold") is a different node and stays
 *    unmapped. Strings are labels; synsets are addresses.
 *  - Base edges carry no confidence score: like atomic edges they are
 *    lexical facts, so they pass any confidence threshold. The DECAY that
 *    propagation needs is applied by the reasoner per IS_A hop climbed,
 *    not baked into the base data.
 *  - Meronym direction (the one choice the spec left open): the edge runs
 *    part —PART_OF→ whole, with the meronym subtype ("part" | "substance"
 *    | "member") recorded in the edge's `aspect`. Holonym pointers in the
 *    source are the same facts from the other side and are not duplicated.
 *  - Antonym / derivation pointers are lexical (lemma-to-lemma) in WordNet;
 *    the extract keeps the lemma indices and the loader records the lemma
 *    pair in the edge's `aspect`. The edge itself joins the two synsets.
 */
import * as fs from "fs";
import * as path from "path";
import { Graph, GraphEdge, GraphNode } from "./graph";
import { buildSeedGraph } from "./seed";

export const WORDNET_SOURCE = "wordnet";

/** Stride (values per edge) of each flat relation array reassembled from the extract parts. */
const STRIDES: Record<string, number> = {
  hypernym: 2,
  instance: 2,
  part: 3,
  antonym: 4,
  similar: 2,
  derived: 4,
  entails: 2,
  causes: 2,
};

export interface SynsetRecord {
  /** Global index: blocks concatenated in n, v, a order. */
  index: number;
  /** Stable sense id, e.g. "wn-n15493606", "wn-a01258433". */
  id: string;
  pos: "n" | "v" | "a";
  offset: number;
  gloss: string;
  lemmas: string[];
}

export interface FormCandidate {
  lemma: string;
  pos: "n" | "v" | "a";
}

export interface WordNetExtract {
  source: string;
  edition: string;
  license: string;
  synsets: SynsetRecord[];
  /** Raw flat relation arrays, keyed by kind (see STRIDES). */
  relations: Record<string, number[] | (number | string)[]>;
  /**
   * The closed morphology index (design §7.3): surface form -> lemma+POS
   * candidates, materialised by the importer from the WNDB exception
   * files + reverse Morphy. Only non-identity forms are present.
   */
  forms: Map<string, FormCandidate[]>;
}

export function synsetId(pos: string, offset: number): string {
  return `wn-${pos}${String(offset).padStart(8, "0")}`;
}

export const DEFAULT_EXTRACT_PATH = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "wordnet",
  "extract",
);

interface ExtractManifest {
  v: number;
  source: string;
  edition: string;
  license: string;
  counts: { synsets: number; relations: number; forms?: number };
  parts: { file: string; kind: "synsets" | "relations" | "forms"; count: number; bytes: number }[];
}

/** A synset record as stored in a synset part: [offset, pos, gloss, lemmas]. */
type SynsetPartRecord = [number, "n" | "v" | "a", string, string[]];
/** A relation record as stored in a relation part: [kind, ...flat tuple]. */
type RelationPartRecord = [string, ...(number | string)[]];
/** A form record as stored in a forms part: [surface, lemma, pos]. */
type FormPartRecord = [string, string, "n" | "v" | "a"];

/**
 * Load the chunked extract: read manifest.json in `dir`, then concatenate
 * the part files in manifest order — synset records become SynsetRecords
 * in global index order, relation records are regrouped into the flat
 * per-kind arrays (see STRIDES).
 */
export function loadWordNetExtract(dir: string = DEFAULT_EXTRACT_PATH): WordNetExtract {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dir, "manifest.json"), "utf-8"),
  ) as ExtractManifest;
  const synsets: SynsetRecord[] = [];
  const relations: Record<string, (number | string)[]> = {};
  const forms = new Map<string, FormCandidate[]>();
  for (const part of manifest.parts) {
    const records = JSON.parse(fs.readFileSync(path.join(dir, part.file), "utf-8")) as (
      | SynsetPartRecord
      | RelationPartRecord
      | FormPartRecord
    )[];
    if (part.kind === "forms") {
      for (const [surface, lemma, pos] of records as FormPartRecord[]) {
        const list = forms.get(surface);
        const cand = { lemma, pos };
        if (list) {
          if (!list.some((c) => c.lemma === lemma && c.pos === pos)) list.push(cand);
        } else forms.set(surface, [cand]);
      }
      continue;
    }
    if (part.kind === "synsets") {
      for (const [offset, pos, gloss, lemmas] of records as SynsetPartRecord[]) {
        synsets.push({
          index: synsets.length,
          id: synsetId(pos, offset),
          pos,
          offset,
          gloss,
          lemmas,
        });
      }
    } else {
      for (const [kind, ...values] of records as RelationPartRecord[]) {
        const flat = relations[kind];
        if (flat) flat.push(...values);
        else relations[kind] = [...values];
      }
    }
  }
  return {
    source: manifest.source,
    edition: manifest.edition,
    license: manifest.license,
    synsets,
    relations,
    forms,
  };
}

/** The default extract, loaded once per process (router + chat share it). */
let defaultExtract: WordNetExtract | undefined;
export function getDefaultExtract(): WordNetExtract {
  if (!defaultExtract) defaultExtract = loadWordNetExtract();
  return defaultExtract;
}

/** lemma (lowercase) -> synset records, built once per extract. */
const lemmaIndexCache = new WeakMap<WordNetExtract, Map<string, SynsetRecord[]>>();
export function synsetsForLemma(extract: WordNetExtract, lemma: string): SynsetRecord[] {
  let idx = lemmaIndexCache.get(extract);
  if (!idx) {
    idx = new Map();
    for (const s of extract.synsets) {
      for (const lem of s.lemmas) {
        const key = lem.toLowerCase();
        const list = idx.get(key);
        if (list) list.push(s);
        else idx.set(key, [s]);
      }
    }
    lemmaIndexCache.set(extract, idx);
  }
  return idx.get(lemma.toLowerCase()) ?? [];
}

export interface SurfaceLookup {
  synsets: SynsetRecord[];
  /** How the surface resolved: as an exact lemma, or through the forms index. */
  via: "lemma" | "form";
  /** Lemma+POS candidates (the surface itself when via === "lemma"). */
  candidates: FormCandidate[];
}

/**
 * Surface-aware lookup (design §7.3): exact lemma first, then the
 * importer's closed forms index. Inflection is resolved here, from
 * attested data — the router never guesses a stem at runtime.
 */
export function synsetsForSurface(extract: WordNetExtract, surface: string): SurfaceLookup {
  const key = surface.toLowerCase();
  const exact = synsetsForLemma(extract, key);
  if (exact.length > 0) {
    const poses = [...new Set(exact.map((s) => s.pos))];
    return {
      synsets: exact,
      via: "lemma",
      candidates: poses.map((pos) => ({ lemma: key, pos })),
    };
  }
  const candidates = extract.forms.get(key) ?? [];
  const synsets: SynsetRecord[] = [];
  const seen = new Set<string>();
  for (const cand of candidates) {
    for (const s of synsetsForLemma(extract, cand.lemma)) {
      if (s.pos !== cand.pos || seen.has(s.id)) continue;
      seen.add(s.id);
      synsets.push(s);
    }
  }
  return { synsets, via: "form", candidates };
}

const MERONYM_SUBTYPES: Record<string, string> = { p: "part", s: "substance", m: "member" };

/**
 * Add every synset + relation of the extract to `graph`.
 * Returns counts of what was added.
 */
export function mergeWordNet(
  graph: Graph,
  extract: WordNetExtract,
): { nodes: number; edges: number } {
  let nodes = 0;
  let edges = 0;
  const byIndex = extract.synsets;
  for (const s of byIndex) {
    graph.addNode({
      id: s.id,
      name: s.lemmas[0] ?? s.id,
      type: "Synset",
      layer: "base",
      properties: {
        source: WORDNET_SOURCE,
        pos: s.pos,
        gloss: s.gloss,
        lemmas: s.lemmas,
        synonyms: s.lemmas.slice(1),
      },
    });
    nodes++;
  }
  const add = (fromIdx: number, toIdx: number, type: GraphEdge["type"], aspect?: string) => {
    const from = byIndex[fromIdx];
    const to = byIndex[toIdx];
    if (!from || !to) return;
    graph.addEdge({ from: from.id, to: to.id, type, aspect });
    edges++;
  };
  const rows = (kind: string): (number | string)[][] => {
    const flat = extract.relations[kind] ?? [];
    const stride = STRIDES[kind];
    const out: (number | string)[][] = [];
    for (let i = 0; i + stride <= flat.length; i += stride) out.push(flat.slice(i, i + stride));
    return out;
  };
  for (const [f, t] of rows("hypernym")) add(+f, +t, "IS_A");
  for (const [f, t] of rows("instance")) add(+f, +t, "IS_A", "instance");
  for (const [f, t, sub] of rows("part"))
    add(+f, +t, "PART_OF", MERONYM_SUBTYPES[String(sub)] ?? String(sub));
  for (const [f, t, lf, lt] of rows("antonym")) {
    const fl = byIndex[+f]?.lemmas[+lf];
    const tl = byIndex[+t]?.lemmas[+lt];
    add(+f, +t, "ANTONYM_OF", fl && tl ? `${fl} ↔ ${tl}` : undefined);
  }
  for (const [f, t] of rows("similar")) add(+f, +t, "SIMILAR_TO");
  for (const [f, t, lf, lt] of rows("derived")) {
    const fl = byIndex[+f]?.lemmas[+lf];
    const tl = byIndex[+t]?.lemmas[+lt];
    add(+f, +t, "DERIVED_FROM", fl && tl ? `${fl} ← ${tl}` : undefined);
  }
  for (const [f, t] of rows("entails")) add(+f, +t, "ENTAILS");
  for (const [f, t] of rows("causes")) add(+f, +t, "CAUSES");
  return { nodes, edges };
}

/**
 * Curated sense links: seed node id -> the WordNet synset that node denotes.
 * Every id below was verified against the OEWN 2024 extract by gloss.
 * The `cold` row is the disambiguation the design calls for: the quality
 * maps to the TEMPERATURE adjective synset only. The illness synset
 * wn-n14389489 ("cold, common cold") is deliberately absent.
 */
export const SENSE_MAPPINGS: Record<string, string> = {
  winter: "wn-n15493606", // the coldest season of the year
  summer: "wn-n15493074", // the warmest season of the year
  spring: "wn-n15492835", // the season of growth
  autumn: "wn-n15492612", // the season when the leaves fall
  night: "wn-n15411090", // the dark part of the diurnal cycle
  midday: "wn-n15421029", // noon: the middle of the day
  dawn: "wn-n15424329", // the first light of day
  dusk: "wn-n15424960", // the time of day immediately following sunset
  cold: "wn-a01258433", // adj: having a low or inadequate temperature
  warm: "wn-a02547515", // adj: having a comfortable degree of heat
  derivative: "wn-n06102700", // the result of mathematical differentiation
  integral: "wn-n06103475", // the result of a mathematical integration
  bass: "wn-n05062082", // the lowest part of the musical range
  treble: "wn-n05061216", // soprano/treble: pitch range of the highest female voice
  mercury: "wn-n14893252", // the metallic element, liquid at ordinary temperatures
  precipitation: "wn-n11717219", // the falling to earth of any form of water
  snow: "wn-n11730995", // precipitation falling as ice crystals (also "snowfall")
  frost: "wn-n11662615", // freeze: weather cold enough to cause freezing
  // Slice 2b (§7.5, Fire branch 3): the combustion phenomenon sense, bridged
  // to the Fire element it is classed under — gloss-verified ("the process
  // of combustion of inflammable materials producing heat and light").
  fire: "wn-n13713767", // combustion: heat and light from burning material
};

/** Bridge seed concepts to their synsets with MAPPED_TO edges. */
export function applySenseMappings(graph: Graph): { mapped: number } {
  let mapped = 0;
  for (const [conceptId, synset] of Object.entries(SENSE_MAPPINGS)) {
    const concept = graph.getNode(conceptId);
    const target = graph.getNode(synset);
    if (!concept || !target) continue;
    graph.addEdge({ from: conceptId, to: synset, type: "MAPPED_TO", confidence: 0.99 });
    concept.properties["synsetId"] = synset;
    mapped++;
  }
  return { mapped };
}

/** The seed concept a synset is mapped to, if any (reverse of MAPPED_TO).
 *  FrameNet lexical units also carry MAPPED_TO edges into synsets (the
 *  §5.2 bridge, slice 2d) — those are sense *neighbours*, not the seed
 *  concept this function promises, so they are skipped here. */
export function mappedConceptForSynset(graph: Graph, synsetNodeId: string): GraphNode | undefined {
  for (const edge of graph.inEdges(synsetNodeId, "MAPPED_TO")) {
    const from = graph.getNode(edge.from);
    if (from && from.type !== "LexicalUnit") return from;
  }
  return undefined;
}

export interface ClimbResult {
  /** The mapped seed node the climb reached. */
  anchor: GraphNode;
  /** The synset that carries the mapping (may be the start synset). */
  anchorSynset: GraphNode;
  /** IS_A edges walked from the start synset up to the anchor synset. */
  chain: GraphEdge[];
  /** The MAPPED_TO bridge edge (concept -> anchor synset). */
  bridge: GraphEdge;
}

/**
 * Climb IS_A from a synset (bounded) until reaching a synset that a seed
 * concept maps to. This is what lets the chat answer about words nobody
 * hand-mapped: sleet —IS_A→ precipitation, and precipitation is mapped.
 */
export function climbToAnchor(
  graph: Graph,
  synsetNodeId: string,
  maxHops = 6,
): ClimbResult | null {
  const start = graph.getNode(synsetNodeId);
  if (!start || start.type !== "Synset") return null;
  const visited = new Set<string>([synsetNodeId]);
  const queue: { id: string; chain: GraphEdge[] }[] = [{ id: synsetNodeId, chain: [] }];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const concept = mappedConceptForSynset(graph, cur.id);
    if (concept) {
      const bridge = graph.inEdges(cur.id, "MAPPED_TO")[0];
      return { anchor: concept, anchorSynset: graph.getNode(cur.id)!, chain: cur.chain, bridge };
    }
    if (cur.chain.length >= maxHops) continue;
    for (const e of graph.outEdges(cur.id, "IS_A")) {
      if (visited.has(e.to)) continue;
      visited.add(e.to);
      queue.push({ id: e.to, chain: [...cur.chain, e] });
    }
  }
  return null;
}

/** Seed graph + WordNet base layer + sense mappings: the chat's graph. */
export function buildChatGraph(extractDir: string = DEFAULT_EXTRACT_PATH): Graph {
  const graph = buildSeedGraph();
  const extract = loadWordNetExtract(extractDir);
  mergeWordNet(graph, extract);
  applySenseMappings(graph);
  return graph;
}
