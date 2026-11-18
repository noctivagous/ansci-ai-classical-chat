/**
 * wordfreq.ts — loader for the word-frequency table
 * (data/wordfreq/).
 *
 * The table is a build-time extraction of the English ("best")
 * word list of the `wordfreq` Python package (Robyn Speer),
 * produced by scripts/import-wordfreq.py: per word, its Zipf
 * frequency (log10 of occurrences per billion words), trimmed
 * at a Zipf floor of 2.0 (95,641 words). Zipf is the scale the
 * source itself reports.
 *
 * License: the wordfreq package's DATA files may be
 * redistributed under the Creative Commons
 * Attribution-ShareAlike 4.0 International License (CC BY-SA
 * 4.0) — verified from the package's own license texts (see
 * scripts/import-wordfreq.py). Attribution — Robyn Speer and
 * the wordfreq contributors, and the SUBTLEX word lists (Marc
 * Brysbaert et al.) — is in the repo NOTICE file and in
 * data/wordfreq/manifest.json. The table this loader serves is
 * wordfreq data, so the artefact carries CC BY-SA 4.0.
 *
 * The layer is optional in the verbnet.ts pattern: when
 * data/wordfreq/ is absent, getDefaultWordFreqTable() returns
 * undefined and consumers are silent — a missing table is
 * missing knowledge, never an error and never a zero.
 */
import * as fs from "fs";
import * as path from "path";

export const DEFAULT_WORDFREQ_PATH = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "wordfreq",
);

export interface WordFreqTable {
  source: string;
  edition: string;
  license: string;
  counts: { words: number; fullListWords: number };
  /** word (lowercase) -> Zipf frequency. Absence from the map
   *  means the word is below the filed floor or unattested in
   *  the source — the consumer reads that as "not attested in
   *  wordfreq", never as a measured zero. */
  zipf: Map<string, number>;
}

interface WordFreqManifest {
  v: number;
  source: string;
  edition: string;
  license: string;
  counts: WordFreqTable["counts"];
  parts: { file: string; kind: "words"; count: number; bytes: number }[];
}

/** True when a wordfreq table manifest exists at `dir`. */
export function wordFreqInstalled(dir: string = DEFAULT_WORDFREQ_PATH): boolean {
  return fs.existsSync(path.join(dir, "manifest.json"));
}

/** Load a wordfreq table directory (manifest + parts). */
export function loadWordFreqTable(dir: string = DEFAULT_WORDFREQ_PATH): WordFreqTable {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dir, "manifest.json"), "utf-8"),
  ) as WordFreqManifest;
  const zipf = new Map<string, number>();
  for (const part of manifest.parts) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, part.file), "utf-8")) as {
      words: [string, number][];
    };
    for (const [word, z] of data.words) zipf.set(word, z);
  }
  return {
    source: manifest.source,
    edition: manifest.edition,
    license: manifest.license,
    counts: manifest.counts,
    zipf,
  };
}

let defaultTable: WordFreqTable | undefined;
let defaultTried = false;

/** The default table, or undefined when the layer is not
 *  installed (or fails to load) — the consumer's silence, by
 *  design. */
export function getDefaultWordFreqTable(): WordFreqTable | undefined {
  if (!defaultTried) {
    defaultTried = true;
    try {
      defaultTable = wordFreqInstalled() ? loadWordFreqTable() : undefined;
    } catch {
      defaultTable = undefined;
    }
  }
  return defaultTable;
}
