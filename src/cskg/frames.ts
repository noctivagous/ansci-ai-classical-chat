/**
 * frames.ts — the FrameNet side store (E5; the Definitions
 * pattern applied to frame schemas).
 *
 * E5's situation analysis (situation.ts) names an event's
 * participants with GENERIC roles — actor, object, recipient,
 * instrument, time, place — derived from the statement's own
 * surface. Where a FrameNet frame matches the event's verb,
 * FrameNet has already done the finer naming: a frame IS a
 * situation schema (design, old-track §5), and its frame
 * elements are the role vocabulary of that kind of happening
 * (Apply_heat: Cook, Food, Heating_instrument, Container…).
 * This store is how E5 consults that vocabulary.
 *
 * Discipline, exactly as definitions.ts set it for glosses:
 *  - READ-ONLY and LAZY: the bundle (data/framenet/, written by
 *    scripts/import-framenet.py) loads on first consultation,
 *    outside loadCskg; nothing here writes to the CSKG graph,
 *    any ranking, or the bundle itself.
 *  - ABSENT IS NOT AN ERROR: no bundle → every lookup returns
 *    null and E5 keeps its generic roles, saying so in the
 *    trace. A partial bundle (the checked-in 5-frame fixture,
 *    or any --only import) loads the same way and simply
 *    matches fewer verbs — its status word (below) keeps the
 *    coverage honest wherever it is reported.
 *  - The bundle FORMAT is the importer's: manifest.json +
 *    part-*.json, frames parts holding
 *    [name, fnId, definition, [[feName, core01, feDef, feId]…],
 *     [[lemma, pos, luName, luId]…]] — the same records
 *    src/framenet.ts (old track) reads; this store re-reads
 *    them for the CSKG package, which does not import the old
 *    track (loader.ts's scope note).
 *
 * Status words (shared with setup.ts and scripts/install.mjs —
 * one vocabulary, three places): "absent" (no bundle),
 * "fixture-only" (a bundle is present but is not the full
 * inventory), "full" (the manifest counts equal the complete
 * FrameNet 1.5 inventory the importer delivers).
 */
import * as fs from "fs";
import * as path from "path";

/** The complete inventory's manifest counts (importer-verified). */
export const FULL_FRAMENET_COUNTS = {
  frames: 1019,
  frameElements: 9634,
  lexicalUnits: 11942,
  frameRelations: 1676,
} as const;

export type FrameNetStatus = "absent" | "fixture-only" | "full";

export interface FrameNetCounts {
  frames: number;
  frameElements: number;
  lexicalUnits: number;
  frameRelations: number;
}

export interface FrameElementInfo {
  name: string;
  core: boolean;
}

export interface FrameInfo {
  name: string;
  fnId: number;
  /** the frame's element (role) names, in the bundle's order */
  elements: FrameElementInfo[];
  /** verb lemmas that evoke this frame (POS "V" units) */
  verbLemmas: string[];
}

export interface FramesStore {
  dir: string;
  status: FrameNetStatus;
  counts: FrameNetCounts;
  frames: FrameInfo[];
  /** verb lemma → frames it evokes (verb units only) */
  byVerb: Map<string, FrameInfo[]>;
}

/** The shipped bundle's directory (data/framenet/ beside the repo root). */
export const DEFAULT_FRAMENET_DIR = path.join(
  __dirname, "..", "..", "..", "data", "framenet",
);

interface BundleManifest {
  counts: FrameNetCounts;
  parts: { file: string; kind: string }[];
}

type FramePartRecord = [
  string,
  number,
  string,
  [string, 0 | 1, string, number][],
  [string, string, string, number][],
];

/** Read just the manifest of a bundle dir; null when absent/unreadable. */
export function readFrameNetManifest(dir: string): BundleManifest | null {
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(dir, "manifest.json"), "utf8"),
    ) as BundleManifest;
    if (!raw || !raw.counts || !Array.isArray(raw.parts)) return null;
    return raw;
  } catch {
    return null;
  }
}

/** Status of a bundle DIRECTORY, from its manifest alone (cheap). */
export function frameNetStatus(dir: string = DEFAULT_FRAMENET_DIR): FrameNetStatus {
  const manifest = readFrameNetManifest(dir);
  if (!manifest) return "absent";
  const c = manifest.counts;
  return c.frames === FULL_FRAMENET_COUNTS.frames &&
    c.frameElements === FULL_FRAMENET_COUNTS.frameElements &&
    c.lexicalUnits === FULL_FRAMENET_COUNTS.lexicalUnits &&
    c.frameRelations === FULL_FRAMENET_COUNTS.frameRelations
    ? "full"
    : "fixture-only";
}

/**
 * Load a bundle directory into the store. Returns null when the
 * bundle is absent or unreadable — the degradation is the
 * caller's normal path, never an exception.
 */
export function loadFramesStore(dir: string = DEFAULT_FRAMENET_DIR): FramesStore | null {
  const manifest = readFrameNetManifest(dir);
  if (!manifest) return null;
  try {
    const frames: FrameInfo[] = [];
    const byVerb = new Map<string, FrameInfo[]>();
    for (const part of manifest.parts) {
      if (part.kind !== "frames") continue;
      const records = JSON.parse(
        fs.readFileSync(path.join(dir, part.file), "utf8"),
      ) as FramePartRecord[];
      for (const [name, fnId, , fes, lus] of records) {
        const info: FrameInfo = {
          name,
          fnId,
          elements: fes.map(([feName, core]) => ({ name: feName, core: core === 1 })),
          verbLemmas: lus.filter((lu) => lu[1] === "V").map((lu) => lu[0].toLowerCase()),
        };
        frames.push(info);
        for (const lemma of info.verbLemmas) {
          const arr = byVerb.get(lemma);
          if (arr) arr.push(info);
          else byVerb.set(lemma, [info]);
        }
      }
    }
    if (!frames.length) return null;
    return {
      dir,
      status: frameNetStatus(dir),
      counts: manifest.counts,
      frames,
      byVerb,
    };
  } catch {
    return null;
  }
}

let cached: FramesStore | null | undefined;

/**
 * The process-wide store over the shipped bundle, loaded lazily
 * on first use. `CSKG_FRAMENET_DIR` overrides the directory
 * (tests point it at the fixture or at an empty dir). A missing
 * bundle memoises as null: absent is a stable fact of a run.
 */
export function getFramesStore(env: NodeJS.ProcessEnv = process.env): FramesStore | null {
  if (cached !== undefined) return cached;
  const override = (env.CSKG_FRAMENET_DIR ?? "").trim();
  cached = loadFramesStore(override || DEFAULT_FRAMENET_DIR);
  return cached;
}

/** Drop the memoised store (tests re-point the directory). */
export function clearFramesCache(): void {
  cached = undefined;
}

/**
 * The frames a verb lemma evokes, best first. "Best" is the
 * situation module's small, stated heuristic (the caller traces
 * the choice): a frame whose elements include a role for the
 * event's OBJECT outranks one without; then core-element count
 * (a richer schema names more of the happening); then name, for
 * determinism. Returns null when no frame matches — the normal
 * degradation, not an error.
 */
export function framesForVerb(
  store: FramesStore,
  verbLemma: string,
  objectKind?: "food" | "thing" | "person" | null,
): FrameInfo[] | null {
  const frames = store.byVerb.get(verbLemma.toLowerCase());
  if (!frames || !frames.length) return null;
  const objectRoles =
    objectKind === "food"
      ? ["produced_food", "food", "ingestibles"]
      : ["goods", "theme", "created_entity", "product", "entity"];
  const score = (f: FrameInfo): number => {
    let s = 0;
    const names = f.elements.map((e) => e.name.toLowerCase());
    if (objectKind && names.some((n) => objectRoles.includes(n))) s += 4;
    if (names.some((n) => ["cook", "agent", "creator", "donor", "buyer", "seller", "self_mover", "ingestor"].includes(n))) s += 2;
    s += f.elements.filter((e) => e.core).length / 100;
    return s;
  };
  return [...frames].sort(
    (a, b) => score(b) - score(a) || a.name.localeCompare(b.name),
  );
}

/**
 * Map a generic participant role onto a frame's element names:
 * the frame's own word for the role when it has one, else null
 * (the generic role stands — a frame may only NAME what E5
 * already found on the surface, never add a participant).
 */
const GENERIC_TO_FRAME_ELEMENTS: Record<string, string[]> = {
  actor: ["cook", "agent", "creator", "donor", "buyer", "seller", "ingestor", "self_mover", "experiencer", "protagonist"],
  object: ["produced_food", "food", "goods", "theme", "created_entity", "product", "ingestibles", "entity", "patient"],
  recipient: ["recipient", "beneficiary", "addressee"],
  instrument: ["instrument", "heating_instrument", "heating instrument", "means", "vehicle"],
  place: ["place", "location", "goal", "source"],
  time: ["time", "duration"],
};

export function frameRoleName(frame: FrameInfo, genericRole: string): string | null {
  const wanted = GENERIC_TO_FRAME_ELEMENTS[genericRole];
  if (!wanted) return null;
  const hit = frame.elements.find((e) => wanted.includes(e.name.toLowerCase()));
  return hit ? hit.name : null;
}
