/**
 * definitions.ts — the definitions layer (Definitions slice,
 * design §8; closes G7).
 *
 * CSKG carries relations, not glosses: its DefinedAs is
 * term→term (2,173 edges) and no term in it has definition text
 * (loader.ts header). The repo's own WordNet import (the earlier
 * track's slice 2a: src/wordnet.ts + data/wordnet/extract/, Open
 * English WordNet 2024, CC BY 4.0) kept the gloss text the CSKG
 * merge dropped. This module is the join the design decided:
 * CSKG terms → WordNet synsets → glosses, with provenance
 * (synset id, lemma, part of speech) on every candidate.
 *
 * Deliberate crossing: loader.ts's spike scope note said the
 * CSKG package does not touch the ontology pipeline. The
 * Definitions slice is the design's own exception (§8/§9 G7) —
 * and it is a READ-ONLY one: the extract is only ever read, and
 * nothing here writes to the graph, the CSR index, or any
 * ranking. Like the depth pass's sentence/context/form stores,
 * the gloss index is a SIDE STORE: it loads lazily, on the first
 * definition request, outside loadCskg — so the ~31 s graph load
 * and every non-definition turn are untouched by it. Measured
 * cost of building the store is in the slice's evaluation note.
 *
 * SENSE CHOICE (§7's discipline, applied to synsets): a lemma
 * with several synsets is the WordNet form of CSKG's merged-node
 * problem — rival readings of one string. Each candidate's sense
 * evidence (its other lemmas, and the content words of its
 * gloss) is resolved into the CSKG graph, and the choice runs
 * on three channels, in this precedence:
 *
 *   1. FILING SHARE — the graph's own dominant reading of the
 *      term. The term's 1-hop IsA targets are its filing, each
 *      weighted by dataset support; a filing entry counts
 *      toward a candidate when the entry's label, or one of
 *      its own IsA targets' labels, is among the candidate's
 *      evidence words — and the candidate's score takes its
 *      SHARE of the total filing mass. Measured reasons (probed
 *      on the live graph, 2026-11-09): raw closure membership
 *      fails, because the merged node files every sense at full
 *      strength (passport sits under both "characteristic"
 *      [support 2] and "legal document" [support 2]); what
 *      separates the senses is how much of the filing each
 *      one's vocabulary accounts for (passport: the document
 *      chain outweighs the characteristic chain 3:2, and the
 *      recommendation sense's other words corroborate nothing).
 *      And the channel must exist apart from context fit at
 *      all, because solve's contextFit deliberately DISCOUNTS
 *      inherited overlap — the pain sense of "headache" scores
 *      a context fit of 0 precisely because the graph files
 *      headache under ache under pain. The filing is the
 *      signal the discount throws away.
 *   2. CONTEXT — the caller's context fit (best SINGLE
 *      corroboration, never a sum — a sum is hub noise), capped
 *      as in solve's within-node choice. This is the channel
 *      that can move with the conversation: the contents and
 *      topics of the turn, and the sense a correction settled.
 *   3. A part-of-speech prior (noun > verb > adjective — a
 *      "what is X" question asks about a thing first), then
 *      extraction order — so the choice is deterministic even
 *      when both evidence channels are silent.
 *
 * Evidence words from the term's own lexical family are
 * excluded throughout ("coldness" for "cold", "pass" for
 * "passport"): a sense applauding its own string is not
 * corroboration — solve's own-family rule, mirrored. The
 * caller traces the chosen sense and every rival's score: a
 * definition is a grounded claim, and its provenance must be
 * inspectable like an edge's.
 */

import * as fs from "fs";
import * as path from "path";
import { DEFAULT_EXTRACT_PATH, synsetId } from "../wordnet";
import { STOPWORDS, tokenise } from "./discourse";
import type { CskgGraph } from "./loader";

export type GlossPos = "n" | "v" | "a";

/** One synset's gloss, as found under one lemma. */
export interface GlossCandidate {
  /** stable sense id, e.g. "wn-n14389489" */
  synsetId: string;
  pos: GlossPos;
  /** the WordNet definition text (examples were stripped at import) */
  gloss: string;
  /** the lemma this candidate was found under (normalised) */
  lemma: string;
  /** all lemmas of the synset, normalised (underscores → spaces) */
  lemmas: string[];
}

export interface DefinitionsStats {
  synsets: number;
  lemmaKeys: number;
  loadMs: number;
}

export interface DefinitionsStore {
  source: string;
  edition: string;
  license: string;
  stats: DefinitionsStats;
  /** Candidates recorded under one normalised lemma key, in extract order. */
  candidatesFor(key: string): GlossCandidate[];
}

/** WordNet lemma form ("common_cold") → CSKG term form ("common cold"). */
function normaliseLemma(lemma: string): string {
  return lemma.toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

interface RawSynset {
  id: string;
  pos: GlossPos;
  gloss: string;
  lemmas: string[];
}

/**
 * Build the lemma → candidates index from raw synset records.
 * A synset is filed under EACH of its lemmas (the candidate's
 * `lemma` field says which one it was found under); order within
 * a key is the records' order (the extract's, in production).
 */
export function buildDefinitionsStore(
  synsets: RawSynset[],
  meta: { source: string; edition: string; license: string },
  loadMs = 0,
): DefinitionsStore {
  const index = new Map<string, GlossCandidate[]>();
  for (const s of synsets) {
    const lemmas = [...new Set(s.lemmas.map(normaliseLemma))].filter(Boolean);
    for (const lemma of lemmas) {
      const cand: GlossCandidate = {
        synsetId: s.id,
        pos: s.pos,
        gloss: s.gloss,
        lemma,
        lemmas,
      };
      const list = index.get(lemma);
      if (list) list.push(cand);
      else index.set(lemma, [cand]);
    }
  }
  return {
    ...meta,
    stats: { synsets: synsets.length, lemmaKeys: index.size, loadMs },
    candidatesFor: (key) => index.get(normaliseLemma(key)) ?? [],
  };
}

interface ExtractManifest {
  source: string;
  edition: string;
  license: string;
  parts: { file: string; kind: string }[];
}

/** A synset record as stored in a synset part: [offset, pos, gloss, lemmas]. */
type SynsetPartRecord = [number, GlossPos, string, string[]];

/**
 * Load the repo's WordNet extract as a definitions store. Only
 * the manifest's "synsets" parts are read — the relations and
 * forms parts the old track's loader assembles are not needed
 * to answer "what is X", and skipping them is most of the cost
 * difference (measured in the slice's evaluation note).
 */
export function loadDefinitionsStore(dir: string = DEFAULT_EXTRACT_PATH): DefinitionsStore {
  const started = Date.now();
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dir, "manifest.json"), "utf-8"),
  ) as ExtractManifest;
  const synsets: RawSynset[] = [];
  for (const part of manifest.parts) {
    if (part.kind !== "synsets") continue;
    const records = JSON.parse(
      fs.readFileSync(path.join(dir, part.file), "utf-8"),
    ) as SynsetPartRecord[];
    for (const [offset, pos, gloss, lemmas] of records) {
      synsets.push({ id: synsetId(pos, offset), pos, gloss, lemmas });
    }
  }
  return buildDefinitionsStore(
    synsets,
    { source: manifest.source, edition: manifest.edition, license: manifest.license },
    Date.now() - started,
  );
}

/** The default store, built once per process, on first use. */
let defaultStore: DefinitionsStore | null = null;
export function getDefinitionsStore(): DefinitionsStore {
  if (!defaultStore) defaultStore = loadDefinitionsStore();
  return defaultStore;
}

/**
 * All candidate synsets for a CSKG term, via the loader's lemma
 * machinery: the term itself first, then the lemma CSKG's FormOf
 * side store records for it (graph.lemmaOf) — "apologizes"
 * reaches the synsets filed under "apologize". Deduped by synset
 * id, exact-term candidates before lemma candidates.
 */
export function definitionCandidates(
  g: CskgGraph,
  term: string,
  store: DefinitionsStore = getDefinitionsStore(),
): GlossCandidate[] {
  const keys = [term];
  const lemma = g.lemmaOf(term);
  if (lemma && lemma !== term) keys.push(lemma);
  const seen = new Set<string>();
  const out: GlossCandidate[] = [];
  for (const key of keys) {
    for (const cand of store.candidatesFor(key)) {
      if (seen.has(cand.synsetId)) continue;
      seen.add(cand.synsetId);
      out.push(cand);
    }
  }
  return out;
}

/* ---------------- sense choice ---------------------------------- */

/**
 * The context-fit function the caller lends the choice: solve's
 * contextFit (best-single specificity-weighted neighbourhood
 * corroboration). Passed in, not imported — the choice needs the
 * measure, not the piece, and solve.ts is the module that
 * imports this one.
 */
export type ContextFitFn = (
  g: CskgGraph,
  targetId: number,
  contextIds: number[],
) => number;

/** A "what is X" question asks about a thing first. */
const POS_PRIOR: Record<GlossPos, number> = { n: 4, v: 2, a: 0 };
/** The context fit's weight cap — solve's within-node cap, same reasoning. */
const FIT_CAP = 8;
/**
 * The filing share's weight: a candidate accounting for the
 * whole filing scores 24 here, against at most 8 of context
 * fit and 4 of prior — the graph's dominant reading leads,
 * and context separates the senses the filing leaves tied.
 */
const FILING_WEIGHT = 24;

/**
 * Gloss words that carry no sense evidence beyond the discourse
 * stopwords: negations and bare indefinites ("a mild viral
 * infection involving the nose and respiratory passages (but
 * NOT the lungs)" — "not" resolved in the graph and scored a
 * spurious fit against everything).
 */
const GLOSS_STOP = new Set(["not", "no", "any", "one", "two"]);

/**
 * The term's own lexical family: the word IS the term, grows
 * from it, contains it as a whole word, or equals it with
 * spaces removed ("head ache" for "headache"). Family words
 * are excluded as evidence — solve's own-family rule, mirrored
 * (see the header note).
 */
function ownFamily(word: string, term: string): boolean {
  if (word === term) return true;
  if (word.startsWith(term) || term.startsWith(word)) return true;
  if (word.endsWith(` ${term}`) || term.endsWith(` ${word}`)) return true;
  return word.replace(/ /g, "") === term.replace(/ /g, "");
}

export interface SenseRival {
  synsetId: string;
  pos: GlossPos;
  score: number;
}

export interface SenseChoice {
  /** the term the choice was made for */
  term: string;
  chosen: GlossCandidate;
  /** the chosen candidate's total score */
  score: number;
  /** every candidate with its score, in candidate order */
  rivals: SenseRival[];
  /** the chosen sense's evidence words that resolved in the graph */
  evidence: string[];
  /** the chosen sense's evidence words that carry its filing share */
  taxonomy: string[];
}

/**
 * The sense evidence of one candidate: its OTHER lemmas (the
 * queried lemma is the string under dispute, not evidence) and
 * the gloss's content words, resolved to CSKG term ids — the
 * words themselves kept beside their ids for the trace.
 * Family words and gloss stopwords never resolve.
 */
function senseEvidence(
  g: CskgGraph,
  cand: GlossCandidate,
  term: string,
): { word: string; id: number }[] {
  const words = new Set<string>();
  for (const lem of cand.lemmas) if (lem !== term) words.add(lem);
  for (const w of tokenise(cand.gloss.toLowerCase())) {
    if (w.length < 3 || STOPWORDS.has(w) || GLOSS_STOP.has(w)) continue;
    words.add(w);
  }
  const out: { word: string; id: number }[] = [];
  for (const w of words) {
    if (ownFamily(w, term)) continue;
    let id = g.id(w);
    if (id === undefined) {
      const lemma = g.lemmaOf(w);
      if (lemma) id = g.id(lemma);
    }
    if (id !== undefined) out.push({ word: w, id });
  }
  return out;
}

/**
 * One candidate's share of the subject's filing (header note,
 * channel 1): of the subject's 1-hop IsA edges, the
 * support-weighted fraction whose target — or one of the
 * target's own IsA targets — is among the candidate's evidence
 * ids. Also returns the evidence words that carried the share,
 * for the trace.
 */
function filingShare(
  g: CskgGraph,
  subjectId: number,
  evidence: { word: string; id: number }[],
): { share: number; hits: string[] } {
  const byId = new Map(evidence.map((e) => [e.id, e.word]));
  let total = 0;
  let mine = 0;
  const hits: string[] = [];
  for (const e1 of g.outEdges(subjectId, "/r/IsA")) {
    total += e1.support;
    let hit = byId.get(e1.to);
    if (hit === undefined) {
      for (const e2 of g.outEdges(e1.to, "/r/IsA")) {
        hit = byId.get(e2.to);
        if (hit !== undefined) break;
      }
    }
    if (hit !== undefined) {
      mine += e1.support;
      if (!hits.includes(hit)) hits.push(hit);
    }
  }
  return { share: total > 0 ? mine / total : 0, hits };
}

/**
 * Choose the sense of `term` for this turn, or null when the
 * term has no WordNet synsets at all (the caller then falls back
 * to exactly its previous behaviour — no gloss, no definition).
 * `contextIds` is the turn's judged context (solve's
 * turnContextIds) plus the subject itself.
 */
export function chooseDefinition(
  g: CskgGraph,
  term: string,
  contextIds: number[],
  fit: ContextFitFn,
  store: DefinitionsStore = getDefinitionsStore(),
): SenseChoice | null {
  const cands = definitionCandidates(g, term, store);
  if (!cands.length) return null;
  let subjectId = g.id(term);
  if (subjectId === undefined) {
    const lemma = g.lemmaOf(term);
    if (lemma) subjectId = g.id(lemma);
  }
  let best: {
    cand: GlossCandidate;
    score: number;
    evidence: { word: string; id: number }[];
    taxonomy: string[];
  } | null = null;
  const rivals: SenseRival[] = [];
  for (const cand of cands) {
    const evidence = senseEvidence(g, cand, term);
    const filing =
      subjectId !== undefined
        ? filingShare(g, subjectId, evidence)
        : { share: 0, hits: [] as string[] };
    let bestFit = 0;
    for (const e of evidence) {
      const f = fit(g, e.id, contextIds);
      if (f > bestFit) bestFit = f;
    }
    const score =
      FILING_WEIGHT * filing.share +
      Math.min(FIT_CAP, bestFit) +
      POS_PRIOR[cand.pos];
    const rounded = Math.round(score * 10) / 10;
    rivals.push({ synsetId: cand.synsetId, pos: cand.pos, score: rounded });
    if (!best || rounded > best.score) {
      best = { cand, score: rounded, evidence, taxonomy: filing.hits };
    }
  }
  return {
    term,
    chosen: best!.cand,
    score: best!.score,
    rivals,
    evidence: best!.evidence.map((e) => e.word),
    taxonomy: best!.taxonomy,
  };
}

/**
 * The trace line for a choice: the chosen sense with its full
 * provenance (synset id, part of speech, the lemma it was found
 * under, the gloss), its score, the filing evidence that carried
 * it, and every rival's score — a definition's derivation,
 * inspectable like an edge's.
 */
export function definitionTraceNote(choice: SenseChoice): string {
  const c = choice.chosen;
  const rivals = choice.rivals
    .map((r) => `${r.synsetId}[${r.pos}]=${r.score}`)
    .join(" ");
  return (
    `definition: "${choice.term}" → ${c.synsetId} [${c.pos}] via lemma "${c.lemma}" — ` +
    `"${c.gloss}" — score ${choice.score} (filing: ${choice.taxonomy.join(", ") || "none"}); ` +
    `rivals: ${rivals}`
  );
}
