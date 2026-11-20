/**
 * lesk.ts — the Lesk algorithm (Lesk 1986), in its adapted form
 * (Banerjee & Pedersen 2002), as a RANKING signal for word-sense
 * disambiguation — plus the shared word-overlap machinery the
 * entity ranker (entity-rank.ts) reuses.
 *
 * What Lesk is: a sense's dictionary gloss is evidence about the
 * sense. Score each candidate sense by the overlap between the
 * words of its gloss and the words of the sentence it sits in;
 * the sense whose definition talks about what the sentence talks
 * about wins. The ADAPTED form widens each gloss into a signature:
 * the gloss's own words plus the glosses of related synsets
 * (hypernyms, hyponyms, meronyms/holonyms, similar-to), and scores
 * a candidate against both the sentence's words and the signatures
 * of the context words' senses.
 *
 * Where it sits in this system (the discipline matters more than
 * the algorithm): Lesk is a SCORER, not a decider. It produces an
 * explainable ranking — every point is a named word that overlapped
 * — and its consumers keep their own decision rules:
 *  - sense.ts (stage 4 sense-by-coherence) consults it ONLY where
 *    coherence support ties at the top between live elements — the
 *    zone where the coherence pass itself declares it has no
 *    evidence and falls back to a tie-keep convention. Coherence
 *    remains the decider wherever it has evidence.
 *  - entity-rank.ts uses the bare overlap function as one of three
 *    named signals.
 * Nothing here asserts knowledge; no vector is computed or stored.
 * The scores are word counts — inspectable, reproducible, and
 * exactly as fallible as gloss overlap is known to be, which is
 * why it ranks and never rules.
 *
 * The prior: WordNet orders a lemma's senses by corpus frequency
 * (sense 1 is the most frequent sense), and the bundled extract
 * preserves that order (synsetsForLemma returns extract order).
 * The most-frequent-sense prior is therefore read off the sense
 * index: prior = MFS_PRIOR / senseIndex. It is deliberately small
 * — a nudge among near-equals, never a substitute for overlap
 * evidence (a single gloss word outweighs it).
 */
import {
  getDefaultExtract,
  synsetsForLemma,
  type SynsetRecord,
  type WordNetExtract,
} from "../wordnet";

/* ------------------------------------------------------------------ */
/* Tokenisation: content words, lightly stemmed                        */
/* ------------------------------------------------------------------ */

/** Function words carry no gloss-overlap evidence. A compact,
 *  standard English stopword list (pronouns, auxiliaries, articles,
 *  prepositions, conjunctions, quantifiers). */
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "of", "at", "by", "for", "with",
  "to", "from", "in", "on", "into", "onto", "over", "under", "between", "through",
  "during", "before", "after", "above", "below", "out", "off", "up", "down",
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "its", "our", "their", "mine", "yours", "ours", "theirs",
  "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "having", "do", "does", "did", "doing", "would",
  "shall", "will", "should", "can", "could", "may", "might", "must", "as", "than",
  "then", "so", "such", "no", "not", "only", "own", "same", "too", "very", "just",
  "who", "whom", "which", "what", "when", "where", "why", "how", "all", "any",
  "both", "each", "few", "more", "most", "other", "some", "one", "two", "first",
  // Indefinite pronouns and gloss-generic nouns/adjectives: these
  // occur in thousands of WordNet glosses ("get something or
  // somebody for a specific purpose") and discriminate nothing —
  // counting them manufactures phantom evidence in near-empty
  // contexts (the "She found rest." case: the relief sense scored
  // on "something"/"place" alone). Standard Lesk implementations
  // stop them out of glosses for exactly this reason.
  "something", "someone", "somebody", "anything", "anyone", "anybody",
  "everything", "everyone", "everybody", "nothing", "nobody", "thing",
  "things", "ones", "place", "certain", "specific", "particular",
]);

/** A deliberately light stemmer: plural and inflection stripping
 *  only, so "temperatures" meets "temperature" and "froze" stays
 *  itself (irregular forms are the lexicon's job, not this one's). */
export function stemWord(word: string): string {
  let w = word;
  if (w.length > 4 && w.endsWith("ies")) w = w.slice(0, -3) + "y";
  // The -ing strip requires a stem of at least 4 letters: without
  // the guard, "spring" (a noun that merely ends in the letters)
  // stems to "spr" and matches nothing it should.
  else if (w.length > 6 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("es")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  return w;
}

/** The content words of a text, stemmed, in order (order is kept
 *  for the bigram bonus; callers needing a set build one). */
export function contentWords(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (!raw || STOPWORDS.has(raw)) continue;
    const w = stemWord(raw);
    if (w.length < 2 || STOPWORDS.has(w)) continue;
    out.push(w);
  }
  return out;
}

/** The bare overlap two texts share: the count and the words.
 *  This is the one overlap implementation in the system — the
 *  entity ranker's context signal calls it too. */
export function wordOverlap(
  a: string,
  b: string,
): { count: number; words: string[] } {
  const setA = new Set(contentWords(a));
  const words: string[] = [];
  for (const w of new Set(contentWords(b))) {
    if (setA.has(w)) words.push(w);
  }
  words.sort();
  return { count: words.length, words };
}

/* ------------------------------------------------------------------ */
/* Related-synset adjacency over the extract's relation arrays         */
/* ------------------------------------------------------------------ */

interface Adjacency {
  /** hypernym + instance hypernym targets. */
  up: Map<number, number[]>;
  /** Reverse of up: hyponyms and instances. */
  down: Map<number, number[]>;
  /** Meronym/holonym neighbours (the "part" relation, both ways). */
  part: Map<number, number[]>;
  /** similar-to neighbours (chiefly adjectives). */
  similar: Map<number, number[]>;
}

const adjacencyCache = new WeakMap<WordNetExtract, Adjacency>();

function adjacency(ex: WordNetExtract): Adjacency {
  const cached = adjacencyCache.get(ex);
  if (cached) return cached;
  const up = new Map<number, number[]>();
  const down = new Map<number, number[]>();
  const part = new Map<number, number[]>();
  const similar = new Map<number, number[]>();
  const push = (m: Map<number, number[]>, from: number, to: number) => {
    const list = m.get(from);
    if (list) list.push(to);
    else m.set(from, [to]);
  };
  for (const kind of ["hypernym", "instance"] as const) {
    const flat = ex.relations[kind] ?? [];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      push(up, flat[i] as number, flat[i + 1] as number);
      push(down, flat[i + 1] as number, flat[i] as number);
    }
  }
  const parts = ex.relations["part"] ?? [];
  for (let i = 0; i + 2 < parts.length; i += 3) {
    push(part, parts[i] as number, parts[i + 1] as number);
    push(part, parts[i + 1] as number, parts[i] as number);
  }
  const sim = ex.relations["similar"] ?? [];
  for (let i = 0; i + 1 < sim.length; i += 2) {
    push(similar, sim[i] as number, sim[i + 1] as number);
    push(similar, sim[i + 1] as number, sim[i] as number);
  }
  const adj = { up, down, part, similar };
  adjacencyCache.set(ex, adj);
  return adj;
}

/* ------------------------------------------------------------------ */
/* Signatures                                                          */
/* ------------------------------------------------------------------ */

/** Weight of a related synset's gloss words relative to the
 *  synset's own gloss (Banerjee & Pedersen count related glosses
 *  alongside the central one; the discount keeps the sense's own
 *  definition the loudest voice in its signature). */
export const RELATED_WEIGHT = 0.5;

const signatureCache = new WeakMap<WordNetExtract, Map<number, Map<string, number>>>();

/** A synset's signature: word → weight. Own gloss and lemmas at
 *  full weight; the glosses and lemmas of related synsets
 *  (hypernyms, hyponyms/instances, meronyms/holonyms, similar)
 *  at RELATED_WEIGHT. */
export function signatureWords(
  synset: SynsetRecord,
  ex: WordNetExtract,
): Map<string, number> {
  let perExtract = signatureCache.get(ex);
  if (!perExtract) {
    perExtract = new Map();
    signatureCache.set(ex, perExtract);
  }
  const cached = perExtract.get(synset.index);
  if (cached) return cached;
  const sig = new Map<string, number>();
  const add = (text: string, weight: number) => {
    for (const w of contentWords(text)) {
      sig.set(w, Math.max(sig.get(w) ?? 0, weight));
    }
  };
  const addSynset = (s: SynsetRecord, weight: number) => {
    add(s.gloss, weight);
    for (const lemma of s.lemmas) add(lemma.replace(/_/g, " "), weight);
  };
  addSynset(synset, 1);
  const adj = adjacency(ex);
  const related = new Set<number>([
    ...(adj.up.get(synset.index) ?? []),
    ...(adj.down.get(synset.index) ?? []),
    ...(adj.part.get(synset.index) ?? []),
    ...(adj.similar.get(synset.index) ?? []),
  ]);
  for (const idx of related) {
    const s = ex.synsets[idx];
    if (s) addSynset(s, RELATED_WEIGHT);
  }
  perExtract.set(synset.index, sig);
  return sig;
}

/** Weighted overlap of a signature with a bag of context words,
 *  plus the words that hit (the explanation) and a bigram bonus:
 *  a two-word phrase from the synset's own gloss appearing intact
 *  in the context is stronger evidence than its words apart
 *  (adapted Lesk's n-gram weighting, at n=2, bonus +1 per phrase). */
function signatureOverlap(
  synset: SynsetRecord,
  sig: Map<string, number>,
  contextSet: Set<string>,
  contextSeq: string[],
): { score: number; words: string[] } {
  let score = 0;
  const words: string[] = [];
  for (const [w, weight] of sig) {
    if (contextSet.has(w)) {
      score += weight;
      words.push(w);
    }
  }
  const glossSeq = contentWords(synset.gloss);
  const contextBigrams = new Set<string>();
  for (let i = 0; i + 1 < contextSeq.length; i++) {
    contextBigrams.add(contextSeq[i] + " " + contextSeq[i + 1]);
  }
  for (let i = 0; i + 1 < glossSeq.length; i++) {
    if (contextBigrams.has(glossSeq[i] + " " + glossSeq[i + 1])) score += 1;
  }
  words.sort();
  return { score, words };
}

/* ------------------------------------------------------------------ */
/* The scorer                                                          */
/* ------------------------------------------------------------------ */

/** Most-frequent-sense prior at sense 1; halves-ish per rank
 *  (prior = MFS_PRIOR / senseIndex). One gloss word (1.0) always
 *  outweighs the largest prior — evidence first, frequency as
 *  the near-equal nudge it is in the WSD literature. */
export const MFS_PRIOR = 0.5;

/** Context-gloss weight: the adapted-Lesk term — overlap between
 *  the candidate's signature and the signatures of the context
 *  words' senses — discounted against direct sentence overlap. */
export const CONTEXT_GLOSS_WEIGHT = 0.5;

export interface LeskSenseScore {
  synsetId: string;
  pos: SynsetRecord["pos"];
  /** 1-based sense index within the lemma's synsets of this POS,
   *  in extract (frequency) order — the same indexing the climb's
   *  candidate paths use ("[n sense 3: ...]"). */
  sense: number;
  /** Direct overlap with the sentence's words. */
  sentenceScore: number;
  /** Adapted term: overlap with context words' sense signatures. */
  contextScore: number;
  /** The most-frequent-sense prior for this sense index. */
  prior: number;
  /** sentenceScore + CONTEXT_GLOSS_WEIGHT * contextScore + prior. */
  total: number;
  /** The sentence words that hit the signature (the explanation). */
  words: string[];
}

/**
 * Score every synset of a lemma against a context.
 *  - contextWords: the sentence's raw tokens (or any word list).
 *  - contextLemmas: the sentence's other content lemmas, whose own
 *    synsets' signatures form the adapted-Lesk context. The target
 *    lemma itself is excluded.
 * Returns one score per synset, grouped by POS in n, a, v, r order
 * (the climb's iteration order for the POS it consumes), senses in
 * extract order within each POS.
 */
export function leskSenseScores(
  lemma: string,
  contextWords: string[],
  contextLemmas: string[],
  ex: WordNetExtract = getDefaultExtract(),
): LeskSenseScore[] {
  const key = lemma.toLowerCase();
  // The target word itself is excluded from the context: it occurs
  // in the sentence by construction and in the lemmas of related
  // synsets, so counting it would let every candidate score the
  // same circular point (the classic Lesk context is the OTHER
  // words). Its stemmed forms are likewise skipped inside every
  // signature overlap below.
  const targetStems = new Set(key.split(/[_\s]+/).map((p) => stemWord(p)));
  const contextSeq = contentWords(contextWords.join(" ")).filter((w) => !targetStems.has(w));
  const contextSet = new Set(contextSeq);
  // Context signatures, grouped by their lemma: the adapted-Lesk
  // term takes, per context word, the BEST-matching of its senses
  // (the joint assignment of Banerjee & Pedersen, approximated
  // greedily per word rather than solved jointly).
  const contextSigsByLemma: Map<string, number>[][] = [];
  for (const other of new Set(contextLemmas.map((l) => l.toLowerCase()))) {
    if (other === key) continue;
    const sigs = synsetsForLemma(ex, other).map((s) => signatureWords(s, ex));
    if (sigs.length) contextSigsByLemma.push(sigs);
  }
  const out: LeskSenseScore[] = [];
  const synsets = synsetsForLemma(ex, key);
  for (const pos of ["n", "a", "v", "r"] as const) {
    const ofPos = synsets.filter((s) => s.pos === pos);
    ofPos.forEach((synset, i) => {
      const sense = i + 1;
      const sig = signatureWords(synset, ex);
      const direct = signatureOverlap(synset, sig, contextSet, contextSeq);
      // Adapted term: per context lemma, the best overlap between
      // this candidate's signature and any of that lemma's sense
      // signatures; summed over context lemmas.
      let contextScore = 0;
      for (const sigs of contextSigsByLemma) {
        let best = 0;
        for (const csig of sigs) {
          let overlap = 0;
          for (const [w, weight] of sig) {
            if (targetStems.has(w)) continue;
            const cw = csig.get(w);
            if (cw !== undefined) overlap += Math.min(weight, cw);
          }
          if (overlap > best) best = overlap;
        }
        contextScore += best;
      }
      const prior = MFS_PRIOR / sense;
      out.push({
        synsetId: synset.id,
        pos,
        sense,
        sentenceScore: direct.score,
        contextScore,
        prior,
        total: direct.score + CONTEXT_GLOSS_WEIGHT * contextScore + prior,
        words: direct.words,
      });
    });
  }
  return out;
}

/**
 * Score a set of climb candidates (wordnet-lex ClimbCandidate
 * shape: the starting synset is identified by the candidate's
 * path, "[n sense 3: lemmas]") against a context. Returns one
 * entry per candidate, in candidate order; a candidate whose
 * path carries no parseable sense address scores null (the
 * caller treats it as no evidence — Lesk never guesses an
 * address it cannot read).
 */
export function leskCandidateScores(
  lemma: string,
  candidates: readonly { path: string }[],
  contextWords: string[],
  contextLemmas: string[],
  ex: WordNetExtract = getDefaultExtract(),
): (LeskSenseScore | null)[] {
  if (!candidates.length) return [];
  const byAddress = new Map<string, LeskSenseScore>();
  for (const s of leskSenseScores(lemma, contextWords, contextLemmas, ex)) {
    byAddress.set(`${s.pos}:${s.sense}`, s);
  }
  return candidates.map((c) => {
    const m = /\[([navr]) sense (\d+):/.exec(c.path);
    if (!m) return null;
    return byAddress.get(`${m[1]}:${Number(m[2])}`) ?? null;
  });
}
