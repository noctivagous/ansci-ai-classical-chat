/**
 * ledu.ts — the LanguageEmotionDesireUnit (LEDU): the LPU's
 * bridge to the EmotionDesireUnit (ai-system/lpu/
 * language-emotion-desire-unit).
 *
 * Maintained by the LPU, it maps emotion and desire AS EXPRESSED
 * IN LANGUAGE into the EDU's framework, and back out. Inbound
 * (this slice): a word the sentence carries → the emotion it
 * expresses, named canonically by the EDU, with the phase the
 * OKU's classification table files for the word.
 *
 * The reading it returns is an AspectReading for a semantic
 * object (semantic-object.ts): the value is the word AS SAID
 * (retention — the classification never replaces the concrete
 * word), the element is the table's filed reading for that word,
 * and the source line names the canonical emotion so the two are
 * never silently merged — where they differ (worry: the word is
 * filed Earth, the canonical 憂 stands at Metal) the difference
 * is on the record, in the open.
 */
import { lookupClassification } from "./classify";
import { canonicalEmotion } from "./edu";
import { emotionReach, type EmotionReach } from "./edu-reach";
import { affectPriorFor, type GlasgowFact } from "./normalcy-unit";
import { tierOfProvenance } from "./pricing";
import type { AspectReading } from "./semantic-object";

/** The affect PRIOR for a word (the Glasgow scope extension,
 *  2026-11-17): the NormalcyUnit's labelled valence / arousal /
 *  dominance facts, read by this bridge alongside its EDU
 *  derivations. The prior is word-level affect KNOWLEDGE about
 *  the communication — it informs the reading's record
 *  (SemanticAssessment files the consultation on the object's
 *  trail where an emotion reading stands) and it directs
 *  nothing: the EDU's derivation in emotionAspect above is
 *  authoritative, and a word's Glasgow values alone never
 *  create an emotion reading where the EDU derives none
 *  (pinned in test/fork-glasgow-priors.test.ts: 'murder' is
 *  rated strongly negative in the norms and reads as no
 *  emotion here). */
export function emotionPriorFor(word: string): { valence?: GlasgowFact; arousal?: GlasgowFact; dominance?: GlasgowFact } | undefined {
  return affectPriorFor(word);
}

/** The EDU's larger-graph reach, for a word of language: the
 *  word's canonical emotion, walked over the OKU's graph
 *  (edu-reach.ts) — cycle positions, the counteractions, and
 *  the cross-domain correspondences at its phase, all tiered. */
export function emotionReachForWord(lemma: string): EmotionReach | undefined {
  const entry = lookupClassification(lemma, "emotion");
  if (!entry || entry.aspect !== "emotion") return undefined;
  return emotionReach(canonicalNameFor(lemma));
}

/** The language-side mapping the LEDU maintains: a word →
 *  the canonical emotion it expresses. Words with an emotion
 *  entry but no canonical face here read under their own name. */
const CANONICAL_FACE: Record<string, string> = {
  anger: "anger",
  angry: "anger",
  furious: "anger",
  rage: "anger",
  irritation: "anger",
  joy: "joy",
  happiness: "joy",
  happy: "joy",
  glad: "joy",
  excitement: "joy",
  excited: "joy",
  pride: "joy",
  pensiveness: "pensiveness",
  grief: "grief",
  sadness: "grief",
  sad: "grief",
  gloomy: "grief",
  loneliness: "grief",
  lonely: "grief",
  /* 'sorry' files under grief: its feeling sense is sorrow —
   * the word's WordNet climb reaches grief's anchor ('sad')
   * and derives Metal independently, the owner's ruling names
   * grief its natural filing, and the two authorities agree.
   * Its formula uses (the standalone apology, the sympathy
   * formula) are the social layer's forms and never reach a
   * predication; what files here is the word as a stated
   * feeling. It stood briefly in the uncategorised register
   * below on the formula evidence; the climb's agreement
   * settled the filing (E1, 2026-11-19; GAPS §2 records the
   * judgement and its ground). */
  sorry: "grief",
  worry: "worry",
  worried: "worry",
  anxiety: "worry",
  fear: "fear",
  afraid: "fear",
  scared: "fear",
  nervous: "fear",
};

/** The canonical emotion a word expresses, per the mapping
 *  above; the word itself when it has no canonical face. */
export function canonicalNameFor(word: string): string {
  return CANONICAL_FACE[word.toLowerCase()] ?? word.toLowerCase();
}

/**
 * Emotion words with NO reliable category (E1, the emotional-
 * uptake programme, 2026-11-19). The category-filing rule (the
 * owner's ruling, 2026-11-18) files an emotion word under its
 * canonical category and the word takes the category's Suwen
 * element — as CANONICAL_FACE and the classification table's
 * emotion entries above and in classify.ts carry out. These
 * words name feelings — a first-person statement of one is
 * unambiguous as a feeling — but no canonical category claims
 * them reliably, so they file with NO element and NO canonical
 * face: a fitting, if one is ever made, is the owner's to give,
 * and GAPS §2's awaiting list carries the words and the
 * candidacies. The register is the category map's own residue,
 * kept here beside it — not a second map, and not a route
 * around the filing rule: a word joins it only where the
 * category judgement itself fails, never for convenience.
 */
export const UNCATEGORISED_EMOTION_WORDS: { word: string; note: string }[] = [
  {
    word: "guilty",
    note: "guilt stands between grief (regret over what was done) and shame (the self as seen) — no category claims it reliably",
  },
];

/** The uncategorised-register entry for a word, if it stands
 *  there: the word names a feeling, with no reliable category
 *  and therefore no element filing. */
export function uncategorisedEmotionWord(word: string): { word: string; note: string } | undefined {
  return UNCATEGORISED_EMOTION_WORDS.find((e) => e.word === word.toLowerCase());
}

/** The emotion aspect of a word, or undefined when the word
 *  carries no emotion reading. The table lookup falls back to a
 *  concept's primary entry, so the reading stands only when the
 *  returned entry IS the emotion one. */
export function emotionAspect(lemma: string): AspectReading | undefined {
  const entry = lookupClassification(lemma, "emotion");
  if (!entry || entry.aspect !== "emotion") return undefined;
  const word = lemma.toLowerCase();
  const canonicalName = canonicalNameFor(word);
  const kind = canonicalEmotion(canonicalName);
  return {
    aspect: "emotion",
    value: lemma,
    element: entry.element,
    tier: tierOfProvenance(entry.provenance),
    confidence: entry.confidence,
    source:
      `LEDU→EDU: '${word}' expresses ${canonicalName}` +
      (kind ? ` (${kind.hanzi}, 七情)` : "") +
      `; the phase is the OKU table's filed reading for the word` +
      (kind && !kind.settled ? "; the canonical emotion itself stands unsettled in the tradition" : "") +
      (kind?.element && kind.element !== entry.element
        ? `; the canonical emotion's own correspondence is ${kind.element} — both stand, labelled`
        : ""),
  };
}
