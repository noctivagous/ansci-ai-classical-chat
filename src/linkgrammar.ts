/**
 * linkgrammar.ts — loader for the Link Grammar dictionary table
 * (data/linkgrammar/).
 *
 * The table is a build-time conversion of the Link Grammar English
 * dictionary (OpenCog / CMU Link Grammar 5.13.x, dictionary 5.12.4)
 * produced by scripts/import-linkgrammar.py: per word form, the
 * dictionary entry (or entries) it is filed under, each reduced
 * from its fully expanded disjunct set to the summary the parser's
 * evidence consumers read — the live-disjunct count, the maximum
 * O+ (bare-object) capacity of any disjunct, the minimum disjunct
 * cost, and the entry's provenance (its line in 4.0.dict and the
 * macro chain its expansion traversed) — plus the form's dictionary
 * subscript(s), the word-class evidence. Full disjunct sets are
 * NOT converted (the dictionary expands to ~21.9M disjuncts; the
 * reduction is the shipped record, on the VerbNet frame-shape
 * precedent), and no solver is ported: this is dictionary data,
 * not a parser.
 *
 * License: GNU Lesser General Public License v2.1 or later
 * (LGPL-2.1+). Link Grammar copyright (C) 1991-1998 Daniel Sleator
 * and Davy Temperley; (C) 2003 Peter Szolovits and MIT; (C)
 * 2008-2020 Linas Vepstas; (C) 2013 Lian Ruiting; and the OpenCog
 * contributors. The full attribution is in the repo NOTICE file
 * and in data/linkgrammar/manifest.json.
 *
 * The layer is optional in the framenet.ts pattern: when
 * data/linkgrammar/ is absent, getDefaultLinkGrammarTable()
 * returns undefined and the provider built on it
 * (src/ansci/linkgrammar-lex.ts) is silent.
 */
import * as fs from "fs";
import * as path from "path";

export const DEFAULT_LINKGRAMMAR_PATH = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "linkgrammar",
);

/**
 * A macro-expanded dictionary expression tree (the coverage
 * slice's output kind): macros and word references inlined by
 * the converter, so a tree contains only connectors ("c"),
 * &-sequences ("&"), alternatives ("|"), optionals ("?"),
 * costed subtrees ("$", cost, child) and the empty expression
 * ("e"). Disjuncts are generated lazily from these trees at
 * runtime (src/ansci/linkage.ts); enumerated disjunct sets do
 * not ship.
 */
export type LinkGrammarExprTree =
  | ["c", string]
  | ["e"]
  | ["&", LinkGrammarExprTree[]]
  | ["|", LinkGrammarExprTree[]]
  | ["?", LinkGrammarExprTree]
  | ["$", number, LinkGrammarExprTree];

export interface LinkGrammarEntryRecord {
  /** The entry's line in the upstream 4.0.dict. */
  line: number;
  /** The macro chain the entry's expansion traversed (sorted). */
  macros: string[];
  /** Live disjuncts after default-dialect cost pruning. */
  disjuncts: number;
  /** The largest bare-object (O+) capacity of any live disjunct;
   *  99 when a multi-connector (@O+) makes capacity unbounded. */
  maxO: number;
  /** The cheapest live disjunct's cost. */
  minCost: number;
}

export interface LinkGrammarTable {
  source: string;
  edition: string;
  license: string;
  counts: {
    dictEntries: number;
    macros: number;
    wordEntries: number;
    entryHeads: number;
    formsSeen: number;
    formsShipped: number;
    shippedEntries: number;
    disjunctsExpanded: number;
    disjunctsLive: number;
    disjunctsDroppedByCost: number;
    droppedOutsideVocab: number;
    droppedIdiomForms: number;
    formsDroppedByCost: number;
    entriesOverCap: number;
    missingWordsFiles: number;
    unknownWordRefs: number;
    vocabWordnetLemmaRows: number;
    vocabWordnetSurfaceRows: number;
    vocabSupplementBases: number;
    treesShipped: number;
    treeNodesTotal: number;
    treeNodesMax: number;
    treesOversized: number;
  };
  notConverted: string[];
  entries: LinkGrammarEntryRecord[];
  /** Macro-expanded expression trees, aligned by index with
   *  `entries`; null where an entry's tree exceeded the
   *  converter's recorded node cap (treesOversized). */
  trees: (LinkGrammarExprTree | null)[];
  /** Word form (lowercase) -> the [entry index, subscript] pairs
   *  it is filed under; subscript is null when the dictionary
   *  files the form bare. */
  forms: Map<string, [number, string | null][]>;
}

interface LinkGrammarManifest {
  v: number;
  source: string;
  edition: string;
  license: string;
  counts: LinkGrammarTable["counts"];
  notConverted: string[];
  parts: { file: string; kind: "forms" | "trees"; count: number; bytes: number }[];
}

/** True when a Link Grammar table manifest exists at `dir`. */
export function linkGrammarInstalled(dir: string = DEFAULT_LINKGRAMMAR_PATH): boolean {
  return fs.existsSync(path.join(dir, "manifest.json"));
}

/** Load a Link Grammar table directory (manifest + parts). */
export function loadLinkGrammarTable(dir: string = DEFAULT_LINKGRAMMAR_PATH): LinkGrammarTable {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dir, "manifest.json"), "utf-8"),
  ) as LinkGrammarManifest;
  const entries: LinkGrammarEntryRecord[] = [];
  const forms = new Map<string, [number, string | null][]>();
  let trees: (LinkGrammarExprTree | null)[] = [];
  for (const part of manifest.parts) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, part.file), "utf-8")) as {
      entries?: LinkGrammarEntryRecord[];
      forms?: Record<string, [number, string | null][]>;
      trees?: (LinkGrammarExprTree | null)[];
    };
    if (data.entries) entries.push(...data.entries);
    if (data.forms) for (const [form, refs] of Object.entries(data.forms)) forms.set(form, refs);
    if (data.trees) trees = data.trees;
  }
  return {
    source: manifest.source,
    edition: manifest.edition,
    license: manifest.license,
    counts: manifest.counts,
    notConverted: manifest.notConverted,
    entries,
    trees,
    forms,
  };
}

let defaultTable: LinkGrammarTable | undefined;
let defaultTried = false;

/** The default table, or undefined when the layer is not installed
 *  (or fails to load) — the provider's silence, by design. */
export function getDefaultLinkGrammarTable(): LinkGrammarTable | undefined {
  if (!defaultTried) {
    defaultTried = true;
    try {
      defaultTable = linkGrammarInstalled() ? loadLinkGrammarTable() : undefined;
    } catch {
      defaultTable = undefined;
    }
  }
  return defaultTable;
}
