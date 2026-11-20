/**
 * dictionary.ts — the dictionary answer for a common noun
 * (Probe-2 Slice 7, 2026-11-20; owner ruling "1a" on the
 * probe-2 diagnostic's K2).
 *
 * THE GAP. Until this slice the only gloss-answering shape
 * in the turn layer was the ENTITY answer (entities.ts): a
 * "what is X?" whose subject is a grounded named entity is
 * answered with its instance synset's gloss. No shape read
 * a REGULAR synset's gloss, so a common noun asked about as
 * a common noun had nowhere to go — and where an instance
 * synset happened to share the lemma, the entity shape
 * answered with the instance's gloss instead: "what is a
 * capital?" answered with Marx's *Capital* (instance synset
 * wn-n07425466, lemmas "Capital: Critique of Political
 * Economy" / "Das Kapital" / "Capital"), because the
 * extract holds that book as an instance of *book* and
 * entities.ts indexes instance synsets by lowercase lemma.
 * The dictionary was in the building the whole time — the
 * extract holds capital's ordinary senses as regular
 * synsets — and no answering shape read them. This module
 * is that shape's store.
 *
 * WHAT AN ORDINARY SENSE IS. A noun synset of the lemma
 * that passes two tests, both read off the dictionary
 * itself:
 *  - it is NOT an instance synset: instance synsets are
 *    the extract's named individuals (the sources of
 *    `instance` relations — entities.ts's mark), and they
 *    belong to the entity route, not the dictionary;
 *  - it carries the lemma in its lowercase form, the
 *    casing the dictionary itself gives a common noun.
 *    A regular synset whose lemmas are capitalised only
 *    is a NAME the dictionary files as a word — the genus
 *    "Paris" (lemmas "Paris" / "genus Paris"), the
 *    legendary "Atlantis" (lemma "Atlantis") — and it is
 *    not an ordinary sense of a common noun: there is no
 *    lowercase word "paris" or "atlantis" for it to be a
 *    sense OF. Without this test, "what is paris?" would
 *    answer with a plant genus and "what is atlantis?"
 *    would stop declining as an ungrounded name — both
 *    against the entity programme's standing acceptance.
 * "capital" carries six ordinary senses (and two instance
 * senses: the book; the federal government); "oklahoma"
 * carries none — its only noun synset is the instance —
 * which is why Oklahoma keeps the entity route entire.
 *
 * SENSE ORDER. A lemma's senses are enumerated exactly as
 * the lexicon itself enumerates them: synsetsForLemma's
 * order, filtered to the noun synsets, numbered from 1 —
 * the enumeration wordnet-lex.ts's climb addresses as
 * "[n sense N: ...]" and lesk.ts scores by. The system's
 * standing name for that order is "the dictionary's sense
 * order" (wordnet-lex.ts's header; entities.ts's byLemma
 * precedence is the same enumeration). One honesty note,
 * verified against the shipped extract while building
 * this slice: the enumeration coincides with synset-offset
 * order in the extract's arrays, and it is NOT WordNet's
 * corpus-frequency order — blizzard's storm sense is
 * frequency-first but stands second here, and capital's
 * money senses stand seventh and eighth. "First sense"
 * in this module means first in the system's own
 * dictionary enumeration, the only order the system's
 * other readers (the climb, Lesk, the entity index) have
 * ever used; nothing here re-sorts by a frequency order
 * the extract does not carry.
 *
 * WHICH SENSES ANSWER — THE LESK DISCIPLINE, AND THE
 * LISTING (Slice 7 as built, amended the same day by the
 * owner's two rulings on the slice's own report). The
 * determination comes first: once a question is
 * determined to be a definition answer — a common noun
 * with ordinary senses, not asked about as a name (the
 * determination itself is turn.ts's, read off the
 * question's surface) — the answer is drawn ONLY from
 * the ordinary senses. An instance synset is not a
 * candidate, is not listed, is not mentioned: a
 * definition answer has nothing to do with the instance
 * that happens to share the lemma (the owner's words:
 * "it has nothing to do with Marx if it is determined
 * this is a definition answer").
 *
 * Within the ordinary senses:
 *  - ONE ordinary sense: it answers, alone.
 *  - A LESK WINNER: Lesk (lesk.ts) may promote one later
 *    sense over the first ONLY on gloss-overlap evidence
 *    from the conversation, under the same discipline
 *    sense.ts's tie-break keeps — evidence decides,
 *    frequency never does:
 *     · a sense's evidence is its Lesk overlap alone
 *       (sentenceScore + CONTEXT_GLOSS_WEIGHT ×
 *       contextScore); the most-frequent-sense prior
 *       inside Lesk's total is never counted here — in
 *       this shape the dictionary order IS the prior,
 *       and counting it again would let frequency, not
 *       evidence, move the answer;
 *     · a later sense displaces the first only when its
 *       evidence is positive, strictly greater than the
 *       first sense's evidence, and uniquely the greatest
 *       among the later senses — a tie at the top is the
 *       evidence declining to discriminate.
 *    A promoted sense answers, alone: the conversation
 *    HAS discriminated, and the listing below is for the
 *    case where nothing has.
 *  - SEVERAL senses and NO winner: the answer LISTS ALL
 *    the ordinary senses, in the dictionary's enumeration
 *    order (the owner's ruling: a word with so many
 *    senses — "capital" has six — is not answered by its
 *    first; "answering the first isn't right"). As first
 *    built, this slice answered the first sense standing
 *    in exactly this case; the ruling supersedes that.
 *    There is no cap on the list's length in this shape;
 *    the amendment report records the measured lengths
 *    for the extract's most polysemous nouns (head 33,
 *    line 30, point 26) so a cap, if the owner wants one,
 *    is set with real numbers.
 * The context Lesk reads is the conversation: the prior
 * turns' lemmas and the asking question's own other words,
 * gathered by the caller (turn.ts) in the record's grain.
 *
 * PROVENANCE. wordnet-retrieved, like the entity records:
 * the glosses are retrieved from the bundled Open English
 * WordNet 2024 extract, and every sense's synset id rides
 * on the choice so an answer — a single gloss or a
 * listing — can be traced to the exact synsets it came
 * from.
 *
 * AVAILABILITY. Where the extract cannot load (the
 * browser build), this module disables itself exactly as
 * entities.ts does: no senses, no choices, and the turn
 * behaves as it did before the slice.
 */
import { getDefaultExtract, synsetsForLemma, type SynsetRecord, type WordNetExtract } from "../wordnet";
import { ENTITY_PROVENANCE } from "./entities";
import { CONTEXT_GLOSS_WEIGHT, leskSenseScores } from "./lesk";

export const DICTIONARY_PROVENANCE = ENTITY_PROVENANCE;

/** One ordinary noun sense of a lemma (see the header:
 *  a non-instance synset carrying the lemma lowercase). */
export interface DictionarySense {
  /** The synset's stable id ("wn-n08673891"). */
  synsetId: string;
  /** 1-based sense number within the lemma's noun synsets,
   *  in the lexicon's enumeration (the climb's
   *  "[n sense N]") — instance and name-filing senses keep
   *  their numbers, so a lemma's ordinary senses need not
   *  start at 1 in this numbering; they start wherever the
   *  first ordinary sense stands (for "capital", sense 1). */
  sense: number;
  /** The synset's gloss, verbatim. */
  gloss: string;
  /** The synset's lemmas, as the extract spells them. */
  lemmas: string[];
}

/* ---------------- extract availability ----------------
 * Mirrors entities.ts: the default extract is a filesystem
 * load; where it cannot load, the dictionary is off. */

let defaultExtractTried = false;
let defaultExtractCache: WordNetExtract | null = null;

function defaultDictionaryExtract(): WordNetExtract | null {
  if (!defaultExtractTried) {
    defaultExtractTried = true;
    try {
      defaultExtractCache = getDefaultExtract();
    } catch {
      defaultExtractCache = null; // extract unavailable: dictionary off
    }
  }
  return defaultExtractCache;
}

/** The instance synsets' indices for an extract: the
 *  sources of `instance` relations (entities.ts's mark of
 *  a named individual). Cached per extract. */
const instanceSourcesCache = new WeakMap<WordNetExtract, Set<number>>();

function instanceSources(ex: WordNetExtract): Set<number> {
  const cached = instanceSourcesCache.get(ex);
  if (cached) return cached;
  const set = new Set<number>();
  const flat = ex.relations["instance"] ?? [];
  for (let i = 0; i + 1 < flat.length; i += 2) set.add(Number(flat[i]));
  instanceSourcesCache.set(ex, set);
  return set;
}

/**
 * The lemma's ordinary noun senses, in the dictionary's
 * sense order: its noun synsets as synsetsForLemma
 * enumerates them, minus the instance synsets (the entity
 * route's) and minus the regular synsets that file a name
 * (their lemmas never carry the word lowercase — "Paris"
 * the genus, "Atlantis"). Sense numbers are positions in
 * the full noun enumeration, so an ordinary sense keeps
 * the number the climb and Lesk know it by. Empty when
 * the lemma has no ordinary senses ("oklahoma", "paris",
 * "atlantis"), or when the extract cannot load.
 */
export function ordinaryNounSenses(lemma: string, extract?: WordNetExtract): DictionarySense[] {
  const ex = extract ?? defaultDictionaryExtract();
  if (!ex) return [];
  const key = lemma.toLowerCase();
  const instances = instanceSources(ex);
  const out: DictionarySense[] = [];
  synsetsForLemma(ex, lemma)
    .filter((s: SynsetRecord) => s.pos === "n")
    .forEach((s: SynsetRecord, i: number) => {
      if (instances.has(s.index)) return;
      if (!s.lemmas.some((l) => l === key)) return;
      out.push({ synsetId: s.id, sense: i + 1, gloss: s.gloss, lemmas: s.lemmas });
    });
  return out;
}

export interface DictionaryLeskEvidence {
  synsetId: string;
  sense: number;
  sentenceScore: number;
  contextScore: number;
  /** sentenceScore + CONTEXT_GLOSS_WEIGHT × contextScore
   *  — the overlap evidence alone; Lesk's frequency prior
   *  is deliberately not in it (see the header). */
  evidence: number;
}

export interface DictionaryChoice {
  /** The sense that answers alone, where one does: the
   *  lemma's only ordinary sense, or the Lesk winner.
   *  For a listing this is the first sense, kept as the
   *  citation head — the reply speaks `senses`, not it. */
  chosen: DictionarySense;
  /** Every ordinary sense the lemma carries, in order. */
  senses: DictionarySense[];
  /** How the answer was formed: the only sense standing
   *  alone ("first-sense" — the name predates the
   *  amendment and is kept for the trace's continuity),
   *  a Lesk promotion on conversation evidence ("lesk"),
   *  or the listing of all ordinary senses because
   *  several stand and no evidence discriminated
   *  ("listing"). */
  via: "first-sense" | "lesk" | "listing";
  /** The per-sense Lesk evidence, present when Lesk was
   *  consulted (the lemma has more than one ordinary sense
   *  and a context was supplied). */
  leskEvidence?: DictionaryLeskEvidence[];
  /** The choice's ground, in words, for the trace. */
  ground: string;
}

/**
 * Choose how a "what is a <lemma>?" answers from the
 * dictionary: the only ordinary sense alone, a Lesk
 * winner alone, or — several senses, no winner — the
 * listing of them all (the header states the discipline
 * and the rulings). Undefined when the lemma has no
 * ordinary noun senses (the dictionary has nothing to say
 * — the entity route or the decline owns the question).
 */
export function chooseDictionarySense(
  lemma: string,
  contextWords: string[] = [],
  contextLemmas: string[] = [],
  extract?: WordNetExtract,
): DictionaryChoice | undefined {
  const ex = extract ?? defaultDictionaryExtract();
  if (!ex) return undefined;
  const senses = ordinaryNounSenses(lemma, ex);
  if (!senses.length) return undefined;
  const first = senses[0];
  if (senses.length === 1) {
    return {
      chosen: first,
      senses,
      via: "first-sense",
      ground:
        `the dictionary's only ordinary sense of '${lemma}' (${first.synsetId}, n sense ${first.sense}) — ` +
        "the lemma carries no other ordinary noun sense, so it answers alone",
    };
  }
  if (contextWords.length === 0 && contextLemmas.length === 0) {
    return {
      chosen: first,
      senses,
      via: "listing",
      ground:
        `'${lemma}' carries ${senses.length} ordinary noun senses and no conversation evidence was ` +
        "supplied to Lesk, so nothing discriminates among them — the answer lists them all, in the " +
        "dictionary's enumeration order (owner ruling, Slice 7 amendment: a many-sensed word is not " +
        "answered by its first sense)",
    };
  }
  const byId = new Map(senses.map((s) => [s.synsetId, s]));
  const leskEvidence: DictionaryLeskEvidence[] = [];
  for (const score of leskSenseScores(lemma, contextWords, contextLemmas, ex)) {
    if (score.pos !== "n" || !byId.has(score.synsetId)) continue;
    leskEvidence.push({
      synsetId: score.synsetId,
      sense: score.sense,
      sentenceScore: score.sentenceScore,
      contextScore: score.contextScore,
      evidence: score.sentenceScore + CONTEXT_GLOSS_WEIGHT * score.contextScore,
    });
  }
  const evidenceOf = (s: DictionarySense): number =>
    leskEvidence.find((e) => e.synsetId === s.synsetId)?.evidence ?? 0;
  const firstEvidence = evidenceOf(first);
  let best: DictionarySense | undefined;
  let bestEvidence = 0;
  let tied = false;
  for (const s of senses.slice(1)) {
    const ev = evidenceOf(s);
    if (ev > bestEvidence) {
      best = s;
      bestEvidence = ev;
      tied = false;
    } else if (ev === bestEvidence && ev > 0) {
      tied = true;
    }
  }
  if (best && !tied && bestEvidence > firstEvidence) {
    return {
      chosen: best,
      senses,
      via: "lesk",
      leskEvidence,
      ground:
        `Lesk evidence from the conversation promoted n sense ${best.sense} (${best.synsetId}, overlap ` +
        `evidence ${bestEvidence}) over the dictionary's first ordinary sense ${first.sense} ` +
        `(${first.synsetId}, evidence ${firstEvidence}) — the promoted sense's gloss talks about what ` +
        `the conversation talks about; the frequency prior played no part in the move`,
    };
  }
  return {
    chosen: first,
    senses,
    via: "listing",
    leskEvidence,
    ground:
      `'${lemma}' carries ${senses.length} ordinary noun senses and the conversation's Lesk evidence ` +
      "promoted none of them — " +
      (best
        ? `the best later evidence (${bestEvidence}) did not beat the first sense's (${firstEvidence})` +
          `${tied ? ", and the later senses tied at the top" : ""}: evidence decides only when it ` +
          "discriminates, and here it did not"
        : "no later sense drew any Lesk evidence from the conversation") +
      " — so the answer lists all the ordinary senses, in the dictionary's enumeration order " +
      "(owner ruling, Slice 7 amendment)",
  };
}
