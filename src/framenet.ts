/**
 * framenet.ts — the FrameNet base layer (slice 2d, design §5).
 *
 * Loads the bundle written by scripts/import-framenet.py (the installer:
 * it fetches FrameNet 1.5 from the NLTK nltk_data mirror — no Berkeley
 * form — and writes data/framenet/, a manifest.json plus chunked
 * part-*.json files in the repo's established pattern) and merges it
 * into the graph as Frame / FrameElement / LexicalUnit nodes on the
 * `base` layer.
 *
 * FrameNet is an OPTIONAL layer: the bundle is a local install artifact
 * (gitignored), not a repo artifact. When data/framenet/ is absent,
 * `loadFrameNetBundle` throws, `frameNetInstalled()` is false, the chat
 * graph builds exactly as before, and the router declines frame
 * questions honestly ("FrameNet is not installed — run the installer").
 *
 * Design points (§5.2):
 *  - A frame is a situation schema, NOT a concept: Frame nodes keep
 *    their own type and never enter the concept correspondence
 *    machinery. No frame->ontology mappings are created in 2d; the only
 *    ontological contact is §6.2's EVOKES propagation, which reads
 *    frame-level leanings off edges, never off the frame as a concept.
 *  - Edges per §5.2's table: Frame —HAS_FRAME_ELEMENT→ FrameElement
 *    (core flag on the edge properties and the FE node), LexicalUnit
 *    —EVOKES→ Frame, Frame —INHERITS_FROM / USES_FRAME / SUBFRAME_OF→
 *    Frame (FE-to-FE correspondences recorded in the edge properties;
 *    the bundle records ALL relation types, the loader maps only the
 *    three §5.2 names to edges and counts the rest).
 *  - The bridge to the rest of the graph is the lexical unit (§5.2):
 *    LexicalUnit —MAPPED_TO→ Synset. FrameNet itself does not pin which
 *    synsets an LU names, so this linkage is AnSci's bridge, built by
 *    lemma+POS against the WordNet extract (synsetsForLemma) and marked
 *    as such (edge properties.bridge = "lemma-pos", confidence 0.8).
 *    An LU whose lemma+POS matches no synset stays unlinked — counted,
 *    never guessed.
 *  - §6.2's implemented propagation consumes EVOKES out-edges of an
 *    anchored node ("ontological propagation can flow from a mapped
 *    concept into the frame it evokes", §5.2). A mapped concept reaches
 *    its frame through its synset, so the merge also derives Synset
 *    —EVOKES→ Frame bridge edges, one per (synset, frame) pair joined
 *    by a linked LU, marked bridge in their properties. These are our
 *    derivation, not FrameNet data.
 */
import * as fs from "fs";
import * as path from "path";
import { Graph } from "./graph";
import { synsetsForLemma, type WordNetExtract } from "./wordnet";

export const FRAMENET_SOURCE = "framenet";

export const DEFAULT_FRAMENET_PATH = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "framenet",
);

/* ------------------------------------------------------------------ */
/* Bundle records (as written by scripts/import-framenet.py)           */
/* ------------------------------------------------------------------ */

export interface FrameElementRecord {
  name: string;
  core: boolean;
  definition: string;
  /** FrameNet's numeric FE id — FE identity is the id, not the name
   *  (the release defines "Duration" twice in Activity_ongoing). */
  feId: number;
}

export interface LexicalUnitRecord {
  lemma: string;
  /** FrameNet POS as published ("V", "N", "ADJ", "ADV", ...). */
  pos: string;
  /** The LU's published name, e.g. "purchase_((act)).n". */
  luName: string;
  /** FrameNet's numeric LU id (stable across the release). */
  luId: number;
}

export interface FrameRecord {
  name: string;
  fnId: number;
  definition: string;
  fes: FrameElementRecord[];
  lus: LexicalUnitRecord[];
}

export interface FrameRelationRecord {
  /** Relation type as published ("Inheritance", "Using", ...). */
  type: string;
  superFrame: string;
  subFrame: string;
  /** FE correspondences: [superFEName, subFEName] pairs. */
  feRelations: [string, string][];
}

export interface FrameNetBundle {
  source: string;
  edition: string;
  license: string;
  counts: { frames: number; frameElements: number; lexicalUnits: number; frameRelations: number };
  frames: FrameRecord[];
  relations: FrameRelationRecord[];
}

interface BundleManifest {
  v: number;
  source: string;
  edition: string;
  license: string;
  counts: FrameNetBundle["counts"];
  parts: { file: string; kind: "frames" | "relations"; count: number; bytes: number }[];
}

/** A frame record as stored in a frames part:
 *  [name, fnId, definition, [[feName, core01, feDef, feId]...], [[lemma, pos, luName, luId]...]]. */
type FramePartRecord = [
  string,
  number,
  string,
  [string, 0 | 1, string, number][],
  [string, string, string, number][],
];
/** A relation record as stored in a relations part:
 *  [type, superFrame, subFrame, [[superFE, subFE]...]]. */
type RelationPartRecord = [string, string, string, [string, string][]];

/** True when a bundle manifest exists at `dir` (the layer is installed). */
export function frameNetInstalled(dir: string = DEFAULT_FRAMENET_PATH): boolean {
  return fs.existsSync(path.join(dir, "manifest.json"));
}

/** Load a bundle directory (manifest + parts, concatenated in order). */
export function loadFrameNetBundle(dir: string = DEFAULT_FRAMENET_PATH): FrameNetBundle {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dir, "manifest.json"), "utf-8"),
  ) as BundleManifest;
  const frames: FrameRecord[] = [];
  const relations: FrameRelationRecord[] = [];
  for (const part of manifest.parts) {
    const records = JSON.parse(fs.readFileSync(path.join(dir, part.file), "utf-8")) as (
      | FramePartRecord
      | RelationPartRecord
    )[];
    if (part.kind === "frames") {
      for (const [name, fnId, definition, fes, lus] of records as FramePartRecord[]) {
        frames.push({
          name,
          fnId,
          definition,
          fes: fes.map(([feName, core, feDef, feId]) => ({
            name: feName,
            core: core === 1,
            definition: feDef,
            feId,
          })),
          lus: lus.map(([lemma, pos, luName, luId]) => ({ lemma, pos, luName, luId })),
        });
      }
    } else {
      for (const [type, superFrame, subFrame, feRelations] of records as RelationPartRecord[]) {
        relations.push({ type, superFrame, subFrame, feRelations });
      }
    }
  }
  return {
    source: manifest.source,
    edition: manifest.edition,
    license: manifest.license,
    counts: manifest.counts,
    frames,
    relations,
  };
}

/** The installed bundle, loaded once per process; undefined when absent. */
let defaultBundle: FrameNetBundle | undefined | null = null;
export function getDefaultFrameNetBundle(): FrameNetBundle | undefined {
  if (defaultBundle === null) {
    defaultBundle = frameNetInstalled() ? loadFrameNetBundle() : undefined;
  }
  return defaultBundle;
}

/* ------------------------------------------------------------------ */
/* Node ids                                                            */
/* ------------------------------------------------------------------ */

export const frameNodeId = (frameName: string): string => `fn-frame:${frameName}`;
export const frameElementNodeId = (feId: number): string => `fn-fe:${feId}`;
export const lexicalUnitNodeId = (luId: number): string => `fn-lu:${luId}`;

/** FrameNet POS -> the WordNet extract's POS letters (n/v/a only). */
const WN_POS: Record<string, "n" | "v" | "a"> = { N: "n", V: "v", ADJ: "a" };

export interface FrameNetMergeCounts {
  frames: number;
  frameElements: number;
  lexicalUnits: number;
  hasFrameElementEdges: number;
  evokesEdges: number;
  /** LU -> synset MAPPED_TO bridge edges. */
  luSynsetEdges: number;
  /** LUs with at least one synset link. */
  linkedLUs: number;
  /** LUs whose lemma+POS matched no synset (kept, unlinked). */
  unmatchedLUs: number;
  /** Derived synset -> frame EVOKES bridge edges. */
  synsetEvokesEdges: number;
  /** Frame-relation edges created (the three §5.2 types). */
  relationEdges: number;
  /** Bundle relations whose type §5.2 does not map to an edge. */
  relationsSkipped: number;
}

const RELATION_EDGE_TYPES: Record<string, "INHERITS_FROM" | "USES_FRAME" | "SUBFRAME_OF"> = {
  Inheritance: "INHERITS_FROM",
  Using: "USES_FRAME",
  Subframe: "SUBFRAME_OF",
};

/**
 * Merge a bundle into `graph` (which must already carry the WordNet
 * base layer — the LU bridge resolves against `extract`).
 */
export function mergeFrameNet(
  graph: Graph,
  bundle: FrameNetBundle,
  extract: WordNetExtract,
): FrameNetMergeCounts {
  const counts: FrameNetMergeCounts = {
    frames: 0,
    frameElements: 0,
    lexicalUnits: 0,
    hasFrameElementEdges: 0,
    evokesEdges: 0,
    luSynsetEdges: 0,
    linkedLUs: 0,
    unmatchedLUs: 0,
    synsetEvokesEdges: 0,
    relationEdges: 0,
    relationsSkipped: 0,
  };
  const provenance = { source: FRAMENET_SOURCE, dataset: `framenet-${bundle.edition}` };
  // (synsetId|frameId) pairs already bridged, for the EVOKES derivation.
  const bridgedPairs = new Set<string>();

  for (const frame of bundle.frames) {
    const fId = frameNodeId(frame.name);
    graph.addNode({
      id: fId,
      name: frame.name,
      type: "Frame",
      layer: "base",
      properties: { ...provenance, fnId: frame.fnId, gloss: frame.definition },
    });
    counts.frames++;
    for (const fe of frame.fes) {
      const feId = frameElementNodeId(fe.feId);
      graph.addNode({
        id: feId,
        name: fe.name,
        type: "FrameElement",
        layer: "base",
        properties: {
          ...provenance,
          fnId: fe.feId,
          frame: fId,
          core: fe.core,
          definition: fe.definition,
        },
      });
      graph.addEdge({
        from: fId,
        to: feId,
        type: "HAS_FRAME_ELEMENT",
        properties: { core: fe.core },
      });
      counts.frameElements++;
      counts.hasFrameElementEdges++;
    }
    for (const lu of frame.lus) {
      const luId = lexicalUnitNodeId(lu.luId);
      const wnPos = WN_POS[lu.pos];
      graph.addNode({
        id: luId,
        name: `${lu.lemma}.${wnPos ?? lu.pos.toLowerCase()}`,
        type: "LexicalUnit",
        layer: "base",
        properties: {
          ...provenance,
          fnId: lu.luId,
          lemma: lu.lemma,
          pos: lu.pos,
          frame: fId,
          luName: lu.luName,
        },
      });
      counts.lexicalUnits++;
      graph.addEdge({ from: luId, to: fId, type: "EVOKES" });
      counts.evokesEdges++;
      // The §5.2 bridge: the LU names synsets by lemma+POS (our
      // linkage, not FrameNet data — marked in the edge properties).
      const matches = wnPos
        ? synsetsForLemma(extract, lu.lemma.replace(/ /g, "_")).filter((s) => s.pos === wnPos)
        : [];
      if (matches.length === 0) {
        counts.unmatchedLUs++;
        continue;
      }
      counts.linkedLUs++;
      for (const synset of matches) {
        graph.addEdge({
          from: luId,
          to: synset.id,
          type: "MAPPED_TO",
          confidence: 0.8,
          properties: { bridge: "lemma-pos", source: "ansci" },
        });
        counts.luSynsetEdges++;
        const pairKey = `${synset.id}|${fId}`;
        if (!bridgedPairs.has(pairKey)) {
          bridgedPairs.add(pairKey);
          graph.addEdge({
            from: synset.id,
            to: fId,
            type: "EVOKES",
            properties: { bridge: "lemma-pos", source: "ansci", via: luId },
          });
          counts.synsetEvokesEdges++;
        }
      }
    }
  }

  for (const rel of bundle.relations) {
    const edgeType = RELATION_EDGE_TYPES[rel.type];
    const from = frameNodeId(rel.subFrame);
    const to = frameNodeId(rel.superFrame);
    if (!edgeType || !graph.getNode(from) || !graph.getNode(to)) {
      counts.relationsSkipped++;
      continue;
    }
    graph.addEdge({
      from,
      to,
      type: edgeType,
      properties: { relationType: rel.type, feRelations: rel.feRelations },
    });
    counts.relationEdges++;
  }
  return counts;
}
