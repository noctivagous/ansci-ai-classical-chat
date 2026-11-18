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
  furious: "anger",
  rage: "anger",
  irritation: "anger",
  joy: "joy",
  happiness: "joy",
  excitement: "joy",
  pride: "joy",
  pensiveness: "pensiveness",
  grief: "grief",
  worry: "worry",
  worried: "worry",
  anxiety: "worry",
  fear: "fear",
  nervous: "fear",
};

/** The canonical emotion a word expresses, per the mapping
 *  above; the word itself when it has no canonical face. */
export function canonicalNameFor(word: string): string {
  return CANONICAL_FACE[word.toLowerCase()] ?? word.toLowerCase();
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
