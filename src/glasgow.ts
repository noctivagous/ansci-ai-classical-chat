/**
 * glasgow.ts — loader for the Glasgow Norms table
 * (data/glasgow/).
 *
 * The table is the WHOLE published Glasgow Norms (Scott,
 * Keitel, Becirspahic, Yao & Sereno 2019, Behavior Research
 * Methods 51:1258–1270): 5,553 English words rated on nine
 * psycholinguistic dimensions, converted untrimmed by
 * scripts/import-glasgow.py from the article's supplementary
 * data file. Each dimension carries its published
 * [mean, sd, n].
 *
 * License: Creative Commons Attribution 4.0 International
 * (CC BY 4.0) — the article is Open Access under CC BY 4.0
 * (verified from the article itself, PMC6538586) and the norms
 * are its supplementary material. Attribution is in the repo
 * NOTICE file and in data/glasgow/manifest.json.
 *
 * The dimensions and their published scales:
 *  - arousal, valence, dominance: 9-point (the emotion
 *    dimensions — activation; positive↔negative worth;
 *    control);
 *  - concreteness, imageability, familiarity, aoa, size,
 *    gender: 7-point. AoA's points are 2-year bands (1 = 0–2
 *    years … 7 = 13+ years). Gender runs 1 = strongly
 *    feminine-associated to 7 = strongly
 *    masculine-associated.
 *
 * Words the study presented with disambiguating information
 * are filed under their full published string ("toast
 * (bread)"), beside the bare word's own row where one exists.
 *
 * The layer is optional in the verbnet.ts pattern: when
 * data/glasgow/ is absent, getDefaultGlasgowTable() returns
 * undefined and consumers are silent.
 */
import * as fs from "fs";
import * as path from "path";

export const DEFAULT_GLASGOW_PATH = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "glasgow",
);

export type GlasgowDimension =
  | "arousal"
  | "valence"
  | "dominance"
  | "concreteness"
  | "imageability"
  | "familiarity"
  | "aoa"
  | "size"
  | "gender";

export const GLASGOW_DIMENSIONS: GlasgowDimension[] = [
  "arousal",
  "valence",
  "dominance",
  "concreteness",
  "imageability",
  "familiarity",
  "aoa",
  "size",
  "gender",
];

/** One dimension's published rating: [mean, sd, n]. */
export type GlasgowRating = [number, number, number];

export interface GlasgowEntry {
  word: string;
  length: number;
  arousal: GlasgowRating;
  valence: GlasgowRating;
  dominance: GlasgowRating;
  concreteness: GlasgowRating;
  imageability: GlasgowRating;
  familiarity: GlasgowRating;
  aoa: GlasgowRating;
  size: GlasgowRating;
  gender: GlasgowRating;
}

export interface GlasgowTable {
  source: string;
  edition: string;
  license: string;
  counts: { words: number };
  /** word (lowercase, the published string) -> its entry. */
  entries: Map<string, GlasgowEntry>;
}

interface GlasgowManifest {
  v: number;
  source: string;
  edition: string;
  license: string;
  counts: GlasgowTable["counts"];
  parts: { file: string; kind: "entries"; count: number; bytes: number }[];
}

/** True when a Glasgow table manifest exists at `dir`. */
export function glasgowInstalled(dir: string = DEFAULT_GLASGOW_PATH): boolean {
  return fs.existsSync(path.join(dir, "manifest.json"));
}

/** Load a Glasgow table directory (manifest + parts). */
export function loadGlasgowTable(dir: string = DEFAULT_GLASGOW_PATH): GlasgowTable {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dir, "manifest.json"), "utf-8"),
  ) as GlasgowManifest;
  const entries = new Map<string, GlasgowEntry>();
  for (const part of manifest.parts) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, part.file), "utf-8")) as {
      entries: GlasgowEntry[];
    };
    for (const e of data.entries) entries.set(e.word, e);
  }
  return {
    source: manifest.source,
    edition: manifest.edition,
    license: manifest.license,
    counts: manifest.counts,
    entries,
  };
}

let defaultTable: GlasgowTable | undefined;
let defaultTried = false;

/** The default table, or undefined when the layer is not
 *  installed (or fails to load) — the consumer's silence, by
 *  design. */
export function getDefaultGlasgowTable(): GlasgowTable | undefined {
  if (!defaultTried) {
    defaultTried = true;
    try {
      defaultTable = glasgowInstalled() ? loadGlasgowTable() : undefined;
    } catch {
      defaultTable = undefined;
    }
  }
  return defaultTable;
}

let glasgowEnabled = true;

/**
 * The Glasgow layer's master switch (the verbnet-lex toggle
 * pattern): when disabled, the default table reads as absent.
 * It exists so a test can WITHHOLD the layer and prove that a
 * consumer's behaviour is unchanged — the guard the guarded
 * dimensions (gender association above all) are pinned by.
 * Production code never calls this.
 */
export function setGlasgowEnabled(enabled: boolean): void {
  glasgowEnabled = enabled;
}

export function glasgowEnabledNow(): boolean {
  return glasgowEnabled;
}

/** The default table as consumers read it: withheld when the
 *  layer is disabled by the toggle above. */
export function glasgowTableForUse(): GlasgowTable | undefined {
  return glasgowEnabled ? getDefaultGlasgowTable() : undefined;
}
