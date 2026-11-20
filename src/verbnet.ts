/**
 * verbnet.ts — loader for the VerbNet table (data/verbnet/).
 *
 * The table is a build-time conversion of VerbNet 3.3 (University
 * of Colorado) produced by scripts/import-verbnet.py: per verb
 * lemma, the VerbNet class id(s) it belongs to; per class, its
 * thematic-role inventory and its frames reduced to the argument
 * shapes the parser can check (post-verbal bare-NP roles in
 * surface order, prepositional arguments, clausal/lexical flags).
 * Frame semantics, selectional restrictions and examples are NOT
 * converted — the parser's valency layer needs shapes, not
 * predicate logic.
 *
 * License: VerbNet 3.0 License (applies to VerbNet 3.X) —
 * permission to use, copy, modify and distribute for any purpose,
 * provided the copyright notice appears on all copies. VerbNet
 * 3.X Copyright 2009 by University of Colorado. The full notice
 * is in the repo NOTICE file and in data/verbnet/manifest.json.
 *
 * The layer is optional in the framenet.ts pattern: when
 * data/verbnet/ is absent, getDefaultVerbNetTable() returns
 * undefined and the provider built on it (src/ansci/verbnet-lex.ts)
 * is silent.
 */
import * as fs from "fs";
import * as path from "path";

export const DEFAULT_VERBNET_PATH = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "verbnet",
);

export interface VerbNetFrameRecord {
  /** The frame's published primary description, e.g. "NP V NP PP.recipient". */
  primary: string;
  /** Post-verbal bare-NP thematic roles, in surface order. */
  np: string[];
  /** Prepositional arguments: [prep word, thematic role]. */
  pp: [string, string][];
  /** The frame carries a clausal complement (S, S_INF, …). */
  clausal: boolean;
  /** The frame is lexicalised (a LEX constituent — "take care"):
   *  its NP pattern is not a plain argument structure. */
  lexical: boolean;
}

export interface VerbNetClassRecord {
  /** The class's thematic-role inventory. */
  roles: string[];
  frames: VerbNetFrameRecord[];
}

export interface VerbNetTable {
  source: string;
  edition: string;
  license: string;
  counts: { classes: number; verbs: number; memberRows: number; droppedMultiwordMembers: number };
  classes: Map<string, VerbNetClassRecord>;
  /** Verb lemma -> the class ids it is a member of. */
  verbs: Map<string, string[]>;
}

interface VerbNetManifest {
  v: number;
  source: string;
  edition: string;
  license: string;
  counts: VerbNetTable["counts"];
  parts: { file: string; kind: "verbs"; count: number; bytes: number }[];
}

/** True when a VerbNet table manifest exists at `dir`. */
export function verbNetInstalled(dir: string = DEFAULT_VERBNET_PATH): boolean {
  return fs.existsSync(path.join(dir, "manifest.json"));
}

/** Load a VerbNet table directory (manifest + parts). */
export function loadVerbNetTable(dir: string = DEFAULT_VERBNET_PATH): VerbNetTable {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dir, "manifest.json"), "utf-8"),
  ) as VerbNetManifest;
  const classes = new Map<string, VerbNetClassRecord>();
  const verbs = new Map<string, string[]>();
  for (const part of manifest.parts) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, part.file), "utf-8")) as {
      classes: Record<string, VerbNetClassRecord>;
      verbs: Record<string, string[]>;
    };
    for (const [id, rec] of Object.entries(data.classes)) classes.set(id, rec);
    for (const [lemma, ids] of Object.entries(data.verbs)) verbs.set(lemma, ids);
  }
  return {
    source: manifest.source,
    edition: manifest.edition,
    license: manifest.license,
    counts: manifest.counts,
    classes,
    verbs,
  };
}

let defaultTable: VerbNetTable | undefined;
let defaultTried = false;

/** The default table, or undefined when the layer is not installed
 *  (or fails to load) — the provider's silence, by design. */
export function getDefaultVerbNetTable(): VerbNetTable | undefined {
  if (!defaultTried) {
    defaultTried = true;
    try {
      defaultTable = verbNetInstalled() ? loadVerbNetTable() : undefined;
    } catch {
      defaultTable = undefined;
    }
  }
  return defaultTable;
}
