/**
 * linkgrammar-lex.ts — the Link Grammar dictionary provider
 * (the Link Grammar dictionary slice, 2026-11-21, alongside the
 * VerbNet provider in verbnet-lex.ts).
 *
 * Link Grammar's English dictionary files each word form under
 * one or more dictionary entries, each entry a macro expression
 * expanding to a set of disjuncts (connector sets). The conversion
 * (data/linkgrammar/, scripts/import-linkgrammar.py) reduces each
 * entry to the summary v1's consumers read — its live-disjunct
 * count, its maximum O+ (bare-object) capacity, its minimum
 * disjunct cost, its provenance — and records the form's
 * dictionary subscript(s), the word-class evidence.
 *
 * What v1's consumers read, and only that:
 *   - CLASS EVIDENCE (parse.ts, enItems): a form whose dictionary
 *     subscripts are all verb classes (v, g) is verb-only; all
 *     noun classes (n) is noun-only. That evidence settles the
 *     classification the positional heuristics currently guess at
 *     for forms the WordNet provider leaves unclassified, and it
 *     settles it from the dictionary, not from position. Where
 *     Link Grammar has no entry, the heuristics stand unchanged.
 *   - O-CAPACITY (check.ts): a derived verb's realised bare-object
 *     count beyond every disjunct's O capacity is a located
 *     valency failure — but only where the entry is otherwise
 *     evidence-free (no FrameNet signature, no VerbNet signature),
 *     the VerbNet v1 pattern.
 *
 * What v1 deliberately does NOT do, stated plainly:
 *   - No solver: the table holds no full disjunct sets, so nothing
 *     here can produce a linkage, rank one, or decide attachment.
 *     A form's subscript classes are word-class evidence, not a
 *     parse.
 *   - No sense disambiguation: a form's records are the UNION of
 *     its entries (a form filed under several classes keeps all
 *     of them). The O check therefore fires only on excess beyond
 *     ALL of the verb's entries, and the class evidence fires
 *     only when EVERY entry agrees.
 *   - No obligations: a capacity is a maximum, not a requirement;
 *     a verb used with fewer objects than its capacity is not
 *     flagged.
 *   - Costs ship as data (minCost) and no consumer prices with
 *     them in v1 — no calibration exists yet.
 *   - Hand-lexicon verbs and FrameNet/VerbNet-backed verbs are
 *     untouched by the check: this provider speaks only where
 *     the entry would otherwise be evidence-free.
 *
 * License: GNU Lesser General Public License v2.1 or later
 * (LGPL-2.1+). Link Grammar copyright (C) 1991-1998 Daniel
 * Sleator and Davy Temperley; (C) 2003 Peter Szolovits and MIT;
 * (C) 2008-2020 Linas Vepstas; (C) 2013 Lian Ruiting; and the
 * OpenCog contributors. Full attribution in the repo NOTICE file
 * and data/linkgrammar/manifest.json.
 */

import { getDefaultLinkGrammarTable, type LinkGrammarEntryRecord } from "../linkgrammar";
import { EN_LEXICON } from "./sentence";
import { getDefaultExtract } from "../wordnet";

export type LinkGrammarKind = "verb" | "noun" | "adjective" | "adverb" | "pronoun";

export interface LinkGrammarForm {
  /** The word form, lowercase, as the dictionary files it. */
  form: string;
  /** The dictionary entries the form is filed under. */
  entries: LinkGrammarEntryRecord[];
  /** The form's dictionary subscripts (".v", ".n", ".v-d", ...),
   *  with the dot removed; null subscripts are omitted. */
  subscripts: string[];
  /** The word classes the subscripts evidence (see below). */
  kinds: LinkGrammarKind[];
  /** Live disjuncts across the form's entries (summed). */
  disjuncts: number;
  /** The largest bare-object (O+) capacity of any entry's live
   *  disjuncts; 99 when a multi-connector (@O+) makes capacity
   *  unbounded. */
  maxO: number;
  /** The cheapest live disjunct's cost across the entries. */
  minCost: number;
  /** The entries' lines in the upstream 4.0.dict. */
  lines: number[];
}

/** The word class a dictionary subscript evidences. The subscript
 *  system is the dictionary's own: v (verb), g (gerund — a verb
 *  form), n (noun), a (adjective), r (adverb), p (pronoun). Other
 *  subscripts (e, i, j, d, q, t, eq, ...) name sense or function
 *  distinctions the provider does not read as word class, and
 *  "#"-prefixed subscripts name spelling variants, not classes —
 *  so they evidence nothing here, and a form filed only under
 *  them is not class-evidence at all. */
export function kindOfSubscript(subscript: string): LinkGrammarKind | undefined {
  const first = subscript.charAt(0);
  if (first === "v" || first === "g") return "verb";
  if (first === "n") return "noun";
  if (first === "a") return "adjective";
  if (first === "r") return "adverb";
  if (first === "p") return "pronoun";
  return undefined;
}

let enabled = true;
const lookupCache = new Map<string, LinkGrammarForm | null>();

export function setLinkGrammarEnabled(on: boolean): void {
  enabled = on;
  lookupCache.clear();
}

export function linkgrammarAvailable(): boolean {
  return getDefaultLinkGrammarTable() !== undefined;
}

function buildForm(form: string): LinkGrammarForm | null {
  const table = getDefaultLinkGrammarTable();
  if (!table) return null;
  const refs = table.forms.get(form);
  if (!refs) return null;
  const entries: LinkGrammarEntryRecord[] = [];
  const subscripts = new Set<string>();
  const kinds = new Set<LinkGrammarKind>();
  let disjuncts = 0;
  let maxO = 0;
  let minCost = Infinity;
  const lines: number[] = [];
  for (const [eid, sub] of refs) {
    const rec = table.entries[eid];
    if (!rec) continue;
    entries.push(rec);
    if (sub) {
      subscripts.add(sub);
      const kind = kindOfSubscript(sub);
      if (kind) kinds.add(kind);
    }
    disjuncts += rec.disjuncts;
    maxO = Math.max(maxO, rec.maxO);
    minCost = Math.min(minCost, rec.minCost);
    lines.push(rec.line);
  }
  if (entries.length === 0) return null;
  return {
    form,
    entries,
    subscripts: [...subscripts].sort(),
    kinds: [...kinds].sort(),
    disjuncts,
    maxO,
    minCost: minCost === Infinity ? 0 : minCost,
    lines: [...new Set(lines)].sort((a, b) => a - b),
  };
}

/** The Link Grammar record for a word form, or undefined when
 *  the provider is off, the table is absent, or the form is not
 *  filed in the dictionary. */
export function linkgrammarLookup(form: string): LinkGrammarForm | undefined {
  if (!enabled) return undefined;
  const key = form.toLowerCase();
  if (!lookupCache.has(key)) lookupCache.set(key, buildForm(key));
  return lookupCache.get(key) ?? undefined;
}

/** True when the dictionary files the form under verb classes
 *  only — every entry agrees it is a verb form. */
export function linkgrammarVerbOnly(form: string): boolean {
  const rec = linkgrammarLookup(form);
  return rec !== undefined && rec.kinds.length === 1 && rec.kinds[0] === "verb";
}

/** True when the dictionary files the form under noun classes
 *  only — every entry agrees it is a noun form. */
export function linkgrammarNounOnly(form: string): boolean {
  const rec = linkgrammarLookup(form);
  return rec !== undefined && rec.kinds.length === 1 && rec.kinds[0] === "noun";
}

/** The largest bare-object capacity of the form's dictionary
 *  entries, or undefined when the form has no record. */
export function linkgrammarMaxO(form: string): number | undefined {
  return linkgrammarLookup(form)?.maxO;
}

/**
 * Coverage against the parser's own word inventory: how many of
 * the word forms the parser can know (hand-lexicon forms, the
 * WordNet extract's lemmas, and its surface-forms index) Link
 * Grammar files, and — the verb figure the Valency placeholder
 * reports — how many of its verb lemmas it files under a verb
 * class. This is the number the Linkage placeholder reports.
 */
export function linkgrammarCoverageReport(): {
  linkgrammarForms: number;
  parserWords: number;
  coveredWords: number;
  parserVerbs: number;
  coveredVerbs: number;
} {
  const table = getDefaultLinkGrammarTable();
  if (!table) {
    return { linkgrammarForms: 0, parserWords: 0, coveredWords: 0, parserVerbs: 0, coveredVerbs: 0 };
  }
  const parserWords = new Set<string>();
  for (const form of Object.keys(EN_LEXICON)) parserWords.add(form.toLowerCase());
  const parserVerbs = new Set<string>();
  for (const entry of Object.values(EN_LEXICON)) {
    if (entry.kind === "verb") parserVerbs.add(entry.lemma);
  }
  try {
    const ex = getDefaultExtract();
    for (const s of ex.synsets) {
      for (const l of s.lemmas) {
        const lower = l.toLowerCase();
        if (!lower.includes(" ") && !lower.includes("_")) {
          parserWords.add(lower);
          if (s.pos === "v") parserVerbs.add(lower);
        }
      }
    }
    for (const form of ex.forms.keys()) parserWords.add(form.toLowerCase());
  } catch {
    /* the extract is the parser's breadth; absent it, the hand count stands */
  }
  let coveredWords = 0;
  for (const w of parserWords) {
    if (linkgrammarLookup(w)) coveredWords++;
  }
  let coveredVerbs = 0;
  for (const lemma of parserVerbs) {
    const rec = linkgrammarLookup(lemma);
    if (rec && rec.kinds.includes("verb")) coveredVerbs++;
  }
  return {
    linkgrammarForms: table.forms.size,
    parserWords: parserWords.size,
    coveredWords,
    parserVerbs: parserVerbs.size,
    coveredVerbs,
  };
}
