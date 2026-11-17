/**
 * edu.ts — the EmotionDesireUnit (EDU): the system's
 * medium-neutral authority on emotion and desire, sitting in the
 * OntologyCore (ai-system/ontology-core/emotion-desire-unit).
 *
 * The framework is 七情六欲 (qīqíng liùyù, "seven emotions and six
 * desires"). The seven emotions ride the phase correspondences of
 * the 五志 (wǔzhì, "five wills") core — joy/heart, anger/liver,
 * pensiveness/spleen, grief/lung, fear/kidney — extended by worry
 * (with grief, at the lung) and fright, which the tradition
 * leaves UNSETTLED (it scatters the qi; the sources differ) and
 * which is recorded here as unsettled, not forced. The six
 * desires are the cravings of the six senses, classified through
 * the attested orifice correspondences; the mind is the
 * unsettled one of that set.
 *
 * Where the data lives (settled by the owner, 2026-11-16): the
 * EDU's correspondence data lives in the OKU. In code, that is
 * this framework table held beside the classification table
 * (classify.ts — the OKU's table, itself data in code), and the
 * per-word phases are read FROM that table by the bridges, never
 * restated here. This unit INTERPRETS the emotion/desire slice
 * of the core: it names the canonical emotions and desires and
 * their correspondences; it does not keep a private store.
 *
 * A recorded tension, not harmonised: the table classes the
 * English word "worry" as Earth (creative — "the everyday face
 * of attested pensiveness"), while the framework places 憂
 * (yōu, worry) with grief at Metal. Both stand, labelled: the
 * word's filed reading is the table's; the canonical emotion's
 * correspondence is the framework's. A bridge reading names
 * which one it is carrying.
 *
 * The reach (the owner's ruling, 2026-11-16): beyond naming, the
 * EDU walks the OKU's larger correspondence graph from an
 * emotion's phase — that walk lives in edu-reach.ts, kept apart
 * from the naming done here.
 */
import type { Element } from "./sentence";

export interface EmotionKind {
  /** The canonical name ("anger"). */
  name: string;
  hanzi: string;
  element?: Element;
  organ?: string;
  /** False where the tradition itself leaves the correspondence
   *  open (fright) — recorded as an edge, not forced. */
  settled: boolean;
  note?: string;
}

export const SEVEN_EMOTIONS: EmotionKind[] = [
  { name: "joy", hanzi: "喜", element: "Fire", organ: "heart", settled: true },
  { name: "anger", hanzi: "怒", element: "Wood", organ: "liver", settled: true },
  { name: "pensiveness", hanzi: "思", element: "Earth", organ: "spleen", settled: true },
  { name: "grief", hanzi: "悲", element: "Metal", organ: "lung", settled: true },
  { name: "worry", hanzi: "憂", element: "Metal", organ: "lung", settled: true },
  { name: "fear", hanzi: "恐", element: "Water", organ: "kidney", settled: true },
  { name: "fright", hanzi: "驚", settled: false, note: "scatters the qi; the sources differ" },
];

export interface DesireKind {
  /** The sense whose craving it is ("eyes"). */
  sense: string;
  element?: Element;
  organ?: string;
  settled: boolean;
}

export const SIX_DESIRES: DesireKind[] = [
  { sense: "eyes", element: "Wood", organ: "liver", settled: true },
  { sense: "tongue", element: "Fire", organ: "heart", settled: true },
  { sense: "mouth", element: "Earth", organ: "spleen", settled: true },
  { sense: "nose", element: "Metal", organ: "lung", settled: true },
  { sense: "ears", element: "Water", organ: "kidney", settled: true },
  { sense: "mind", settled: false },
];

export function canonicalEmotion(name: string): EmotionKind | undefined {
  return SEVEN_EMOTIONS.find((e) => e.name === name.toLowerCase());
}

export function desireOfSense(sense: string): DesireKind | undefined {
  return SIX_DESIRES.find((d) => d.sense === sense.toLowerCase());
}
