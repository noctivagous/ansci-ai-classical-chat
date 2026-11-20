/**
 * verbnet-lex.ts — the VerbNet valency provider (the VerbNet port,
 * 2026-11-17, alongside the FrameNet provider in framenet-lex.ts).
 *
 * WordNet gives the parser breadth but no valency: derived verbs
 * receive a permissive frame (slots ["patient"], required []) that
 * licenses everything and therefore nothing, and the valency
 * assessment (check.ts) reports their arguments as evidence-free —
 * unusual-but-licensed, never supported, never unsupported. This
 * provider is the second evidence source for exactly those verbs:
 * where VerbNet 3.3 (data/verbnet/, converted by
 * scripts/import-verbnet.py) covers a lemma, the verb's class
 * frames give the argument structures it allows, and check.ts can
 * now CHECK the permissive frame against them:
 *
 *   - a realised argument structure no frame of the verb allows
 *     (more bare objects than any frame's post-verbal NP count,
 *     or a prepositional argument where no frame has one) is a
 *     located valency failure — the binary checker names it
 *     (valency-verbnet-disallowed) and the three-state assessment
 *     marks the arguments unsupported, basis "verbnet";
 *   - a structure some frame allows is supported, basis "verbnet".
 *
 * What v1 deliberately does NOT do, stated plainly:
 *   - No sense disambiguation: a lemma's shapes are the UNION of
 *     its classes' frames (polysemy is real — "give" is in four
 *     classes). The check therefore only ever fires on excess
 *     beyond ALL of the verb's classes; a use licensed by any one
 *     class passes. This is weaker than the truth and says so.
 *   - No obligations: VerbNet frames list alternations, not
 *     requirements, so a covered verb used with FEWER arguments
 *     than its frames show is not flagged (the FrameNet
 *     precedent: core does not mean obligatory). Derived entries
 *     keep required [].
 *   - Lexicalised frames ("take care") are excluded from the
 *     shapes: their NP pattern is not a plain argument structure.
 *   - Hand-lexicon verbs and FrameNet-backed verbs are untouched:
 *     this provider speaks only where the entry would otherwise
 *     be evidence-free (wordnet-lex.ts consults it only when no
 *     FrameNet signature was found).
 *
 * License: VerbNet 3.0 License (applies to VerbNet 3.X) —
 * permission to use, copy, modify and distribute for any purpose
 * with the copyright notice on all copies; VerbNet 3.X Copyright
 * 2009 by University of Colorado. Full notice in the repo NOTICE
 * file and data/verbnet/manifest.json.
 */

import { getDefaultVerbNetTable } from "../verbnet";
import { EN_LEXICON } from "./sentence";
import { getDefaultExtract } from "../wordnet";

export interface VerbNetShape {
  /** Post-verbal bare-NP count of one frame. */
  np: number;
  /** The frame carries a prepositional argument. */
  pp: boolean;
}

export interface VerbNetCoverage {
  lemma: string;
  /** Every VerbNet class the lemma is a member of. */
  classes: string[];
  /** The thematic-role inventory across those classes. */
  roles: string[];
  /** The checkable argument shapes (non-lexical frames, deduped). */
  shapes: VerbNetShape[];
  /** The largest bare-object count any frame allows. */
  maxNp: number;
  /** How many frames the shapes were reduced from. */
  frames: number;
}

let enabled = true;
const coverageCache = new Map<string, VerbNetCoverage | null>();

export function setVerbNetEnabled(on: boolean): void {
  enabled = on;
  coverageCache.clear();
}

export function verbnetAvailable(): boolean {
  return getDefaultVerbNetTable() !== undefined;
}

function buildCoverage(lemma: string): VerbNetCoverage | null {
  const table = getDefaultVerbNetTable();
  if (!table) return null;
  const classIds = table.verbs.get(lemma);
  if (!classIds) return null;
  const roles = new Set<string>();
  const shapeKeys = new Set<string>();
  const shapes: VerbNetShape[] = [];
  let frames = 0;
  for (const id of classIds) {
    const cls = table.classes.get(id);
    if (!cls) continue;
    for (const r of cls.roles) roles.add(r);
    for (const f of cls.frames) {
      frames++;
      if (f.lexical) continue;
      const shape = { np: f.np.length, pp: f.pp.length > 0 };
      const key = `${shape.np}|${shape.pp}`;
      if (!shapeKeys.has(key)) {
        shapeKeys.add(key);
        shapes.push(shape);
      }
    }
  }
  if (shapes.length === 0) return null; // only lexicalised frames: nothing checkable
  shapes.sort((a, b) => a.np - b.np || Number(a.pp) - Number(b.pp));
  return {
    lemma,
    classes: [...classIds],
    roles: [...roles].sort(),
    shapes,
    maxNp: Math.max(...shapes.map((s) => s.np)),
    frames,
  };
}

/** The VerbNet coverage for a verb lemma, or undefined when the
 *  provider is off, the table is absent, or the lemma is not
 *  covered by any checkable frame. */
export function verbnetCoverage(lemma: string): VerbNetCoverage | undefined {
  if (!enabled) return undefined;
  const key = lemma.toLowerCase();
  if (!coverageCache.has(key)) coverageCache.set(key, buildCoverage(key));
  return coverageCache.get(key) ?? undefined;
}

/**
 * Coverage against the parser's own verb inventory: how many of
 * the verb lemmas the parser can know (hand lexicon ∪ the WordNet
 * extract's verb lemmas) VerbNet covers with a checkable frame.
 * This is the number the Valency placeholder reports.
 */
export function verbnetCoverageReport(): {
  verbnetVerbs: number;
  verbnetClasses: number;
  parserVerbs: number;
  covered: number;
} {
  const table = getDefaultVerbNetTable();
  if (!table) return { verbnetVerbs: 0, verbnetClasses: 0, parserVerbs: 0, covered: 0 };
  const parserVerbs = new Set<string>();
  for (const entry of Object.values(EN_LEXICON)) {
    if (entry.kind === "verb") parserVerbs.add(entry.lemma);
  }
  try {
    const ex = getDefaultExtract();
    for (const s of ex.synsets) {
      if (s.pos === "v") for (const l of s.lemmas) parserVerbs.add(l.toLowerCase());
    }
  } catch {
    /* the extract is the parser's breadth; absent it, the hand count stands */
  }
  let covered = 0;
  for (const lemma of parserVerbs) {
    if (verbnetCoverage(lemma)) covered++;
  }
  return {
    verbnetVerbs: table.verbs.size,
    verbnetClasses: table.classes.size,
    parserVerbs: parserVerbs.size,
    covered,
  };
}
