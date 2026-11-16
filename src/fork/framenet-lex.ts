/**
 * framenet-lex.ts — the FrameNet valency provider (repair programme
 * Part C.4, depth stage 1).
 *
 * WordNet gives the parser breadth but no valency: derived verbs used
 * to receive a permissive frame (slots ["patient"], required []) that
 * licensed everything and therefore nothing. This provider builds a
 * *frame signature* for a verb lemma from the repo's FrameNet bundle
 * (src/framenet.ts, FrameNet 1.5 via the installer; the bundle is
 * optional and gitignored — absent bundle, this provider is silent
 * and derived verbs keep the permissive frame, explicitly marked
 * evidence-free by the assessment in check.ts).
 *
 * A signature is the C.4 contract in miniature:
 *   - level 2 (frame signature): the chosen frame's CORE frame
 *     elements, mapped to this parser's role vocabulary by the
 *     versioned FE->role table below. Unmapped core FEs are recorded,
 *     never silently dropped.
 *   - level 3 (lexical-unit realization): the slot inventory the
 *     parser may fill — post-verbal bare-NP slots in surface order
 *     plus at most one prepositional slot — and the required set (the
 *     first object role, when mapped; FrameNet core does not mean
 *     obligatory, so recipient and prep slots stay optional). The
 *     agent is frame evidence recorded on the signature; the parser
 *     assigns subjects to it structurally (the VerbEntry convention).
 *   - level 1 (domain prior) is NOT used here: it lives in the
 *     evaluation harness (predictSignatureShape) where it must earn
 *     its place against this frame evidence on held-out lexical
 *     units before any provider may use it (Part C.3).
 *
 * LU selection is deterministic: among the lemma's verb LUs, prefer a
 * frame with an agent-mapped core FE, then the most mapped core FEs,
 * then frame name. Polysemy is real (bake evokes three frames); the
 * chosen frame is recorded on the entry as provenance, and every
 * candidate is available via frameCandidates() for evaluation.
 *
 * Selector experiments (2026-11-15, tried and REJECTED on
 * measurement): gloss-overlap scoring — WordNet gloss words matched
 * against frame definitions, position-weighted and count-weighted,
 * with and without IDF — fixed the recorded bad names (blow →
 * Motion/Breathing, wash → Grooming) but shuffled other signatures
 * (send → Causation with empty slots before a usability guard;
 * carry/push lost their motion frames) and regressed the valency
 * challenge's seen-verb legitimate acceptance 100% → 87.5%. The
 * mapped-count selector above is the evidence-backed state; frame
 * NAME correctness (wash/paint → Filling) remains a recorded
 * weakness whose fix needs a signal this bundle doesn't carry
 * (annotated valence or frequency), not a cleverer weighting.
 */

import { getDefaultFrameNetBundle, type FrameRecord } from "../framenet";
import { getDefaultExtract, synsetsForLemma } from "../wordnet";
import type { Element } from "./sentence";
import { climbClassification, wordnetAvailable } from "./wordnet-lex";

/** FE -> role mapping, v1. Explicit and finite on purpose: an FE not
 *  listed here is unmapped, and unmapped core FEs are reported in the
 *  signature rather than guessed into a role. */
export const FN_ROLE_MAP_V1: Record<string, string> = {
  // agent: the volitional / instigating participant, realised as subject
  Agent: "agent", Experiencer: "agent", Buyer: "agent", Seller: "agent",
  Donor: "agent", Sender: "agent", Teacher: "agent", Cook: "agent",
  Creator: "agent", Speaker: "agent", Cognizer: "agent",
  Ingestor: "agent", Reader: "agent", Hearer: "agent", Protagonist: "agent",
  Distributor: "agent", Author: "agent", Cause: "agent",
  // patient: the participant directly acted on / undergoing the event
  Patient: "patient", Undergoer: "patient", Victim: "patient", Impactee: "patient",
  // theme: the entity moved, transferred, created, or constituting the content
  Theme: "theme", Goods: "theme", Food: "theme", Produced_food: "theme",
  Created_entity: "theme", Entity: "theme", Item: "theme", Message: "theme",
  Text: "theme", Mass_theme: "theme", Phenomenon: "theme", Ingestibles: "theme",
  Components: "theme", Subject: "theme", Whole: "theme",
  // recipient: the animate endpoint of a transfer or communication
  Recipient: "recipient", Addressee: "recipient", Student: "recipient", Perceiver: "recipient",
  Beneficiary: "recipient",
  // goal / location: spatial endpoints, realised prepositionally here
  Goal: "goal", Destination: "goal",
  Location: "location", Place: "location", Area: "location", Source: "location",
  Container: "location",
};

// Post-verbal bare-NP surface order: the direct object first, then
// the recipient, then the theme — the double-object order the hand
// lexicon already uses (give/lend: ["recipient", "theme"] after the
// object-taking patient is accounted for; a verb with a patient has
// no separate theme in this vocabulary).
const NOMINAL_ORDER = ["patient", "recipient", "theme"];
const PREP_FOR: Record<string, string[]> = {
  goal: ["to"],
  location: ["in", "at", "on", "from"],
};

export interface FrameSignature {
  lemma: string;
  frame: string;
  luId: number;
  /** Whether the frame has an agent-mapped core FE. The parser
   *  assigns the subject to the agent role structurally, so agent is
   *  recorded here as evidence, NOT as a slot (the VerbEntry
   *  convention: slots are the post-verbal bare-NP slots). */
  agent: boolean;
  /** Post-verbal bare-NP slots in surface order (parser-fillable). */
  slots: string[];
  /** The frame's core object FEs, as roles. NOT obligations: FrameNet
   *  core FEs are routinely null-instantiated, so an unfilled one is
   *  judged core-optionally-unexpressed (unusual-but-licensed) by the
   *  assessment, and contributes nothing to the VerbEntry's required
   *  set. Used by the parser's lone-object alternation rule. */
  required: string[];
  prepSlot?: { slot: string; preps: string[] };
  /** Core FEs of the chosen frame that the role map covers. */
  mappedCore: { fe: string; role: string }[];
  /** Core FEs the role map does NOT cover (recorded, never dropped silently). */
  unmappedCore: string[];
  /** All verb-LU frames for this lemma, for evaluation. */
  candidates: string[];
}

let enabled = true;
let heldOut: Set<string> = new Set();
const signatureCache = new Map<string, FrameSignature | null>();

export function setFrameNetEnabled(on: boolean): void {
  enabled = on;
  signatureCache.clear();
}

/** Evaluation hook (Part C.2 stage 1): withhold these lemmas'
 *  signatures so the domain prior can be tried against them as
 *  genuinely unseen lexical units. */
export function setHeldOutLemmas(lemmas: string[]): void {
  heldOut = new Set(lemmas.map((l) => l.toLowerCase()));
  signatureCache.clear();
}

export function frameNetAvailable(): boolean {
  return getDefaultFrameNetBundle() !== undefined;
}

function mappedRoles(frame: FrameRecord): { fe: string; role: string }[] {
  const out: { fe: string; role: string }[] = [];
  for (const fe of frame.fes) {
    if (!fe.core) continue;
    const role = FN_ROLE_MAP_V1[fe.name];
    if (role) out.push({ fe: fe.name, role });
  }
  return out;
}

function buildSignature(lemma: string): FrameSignature | null {
  const bundle = getDefaultFrameNetBundle();
  if (!bundle) return null;
  const candidates: { frame: FrameRecord; luId: number }[] = [];
  for (const frame of bundle.frames) {
    for (const lu of frame.lus) {
      if (lu.lemma === lemma && lu.pos === "V") candidates.push({ frame, luId: lu.luId });
    }
  }
  if (candidates.length === 0) return null;
  const scored = candidates.map((c) => {
    const mapped = mappedRoles(c.frame);
    const hasAgent = mapped.some((m) => m.role === "agent") ? 1 : 0;
    return { ...c, mapped, score: hasAgent * 100 + mapped.length };
  });
  scored.sort((a, b) => b.score - a.score || a.frame.name.localeCompare(b.frame.name));
  const chosen = scored[0];
  const roles = new Set(chosen.mapped.map((m) => m.role));
  const slots = NOMINAL_ORDER.filter((r) => r !== "agent" && roles.has(r));
  const required: string[] = [];
  const firstObject = ["patient", "theme"].find((r) => roles.has(r));
  if (firstObject) required.push(firstObject);
  let prepSlot: FrameSignature["prepSlot"];
  if (roles.has("goal")) prepSlot = { slot: "goal", preps: PREP_FOR.goal };
  else if (roles.has("location")) prepSlot = { slot: "location", preps: PREP_FOR.location };
  return {
    lemma,
    frame: chosen.frame.name,
    luId: chosen.luId,
    agent: roles.has("agent"),
    slots,
    required,
    ...(prepSlot ? { prepSlot } : {}),
    mappedCore: chosen.mapped,
    unmappedCore: chosen.frame.fes
      .filter((fe) => fe.core && !FN_ROLE_MAP_V1[fe.name])
      .map((fe) => fe.name),
    candidates: [...new Set(candidates.map((c) => c.frame.name))],
  };
}

/** The frame signature for a verb lemma, or undefined when the
 *  provider is off, the lemma is held out, or no LU exists. */
export function frameSignature(lemma: string): FrameSignature | undefined {
  if (!enabled) return undefined;
  const key = lemma.toLowerCase();
  if (heldOut.has(key)) return undefined;
  if (!signatureCache.has(key)) signatureCache.set(key, buildSignature(key));
  return signatureCache.get(key) ?? undefined;
}

/** Every verb lemma in the bundle with its chosen signature — the
 *  stage-1 signature inventory (minus held-out lemmas). */
export function signatureInventory(): FrameSignature[] {
  const bundle = getDefaultFrameNetBundle();
  if (!bundle) return [];
  const lemmas = new Set<string>();
  for (const frame of bundle.frames) {
    for (const lu of frame.lus) if (lu.pos === "V") lemmas.add(lu.lemma);
  }
  const out: FrameSignature[] = [];
  for (const lemma of lemmas) {
    const sig = frameSignature(lemma);
    if (sig) out.push(sig);
  }
  return out.sort((a, b) => a.lemma.localeCompare(b.lemma));
}

/* ---------------- verb classification (VERB_DOMAIN_V1) ----------------
 * The stage-1 trial was not runnable because the system produced no
 * semantic element for verbs: the noun/adjective climb
 * (climbClassification) walks hypernyms to classified anchor
 * CONCEPTS, and verbs are an island in the extract — troponym chains
 * stay inside verb synsets and converge on a handful of abstract
 * roots (act/move, exist/be…), the extract carries no derivational
 * (verb->noun) relations, and a verb synset's lemmas spell an anchor
 * only by homograph accident (wind-the-verb is twisting, not air).
 * Every structural bridge was probed and measured before this rule
 * was designed; the audit trail is docs/fork/verb-classification-
 * trial.md.
 *
 * VERB_DOMAIN_V1 — the registered rule. A verb's semantic element
 * is the phase whose process vocabulary dominates the dictionary
 * definitions of the verb's own senses:
 *   - Texts: the glosses of ALL the lemma's verb synsets in the
 *     OEWN extract (every sense contributes; a cue word counts once
 *     per element however many glosses carry it, so a frequent
 *     sense cannot outvote the lemma's other senses by repetition).
 *   - Vocabulary: VERB_DOMAIN_CUES_V1 below — the five phases'
 *     process domains stated as word lists: Wood = growth,
 *     expansion, rising, motion/transfer, shouting, sight; Fire =
 *     heat, combustion, light, cooking, joy/laughter, speech and
 *     cognition (the heart governs the tongue and the mind in the
 *     correspondence system); Earth = making/creation,
 *     transformation, nourishment, filling/holding, singing,
 *     pensiveness; Metal = severing, division, contraction,
 *     gathering-in, grief/weeping, smell; Water = precipitation,
 *     flow, descent, cold, stillness/storage, washing, groaning,
 *     fear, hearing. Emotion and perception words follow the
 *     attested five-emotion and five-orifice rows; the rest is the
 *     phases' process reading, fork-creative in kind.
 *   - Assignment: the element with the most distinct cue hits is
 *     assigned iff it scores >= 2 AND strictly beats the runner-up;
 *     otherwise the rule ABSTAINS (no element). Matching is by
 *     morphological variant sets (sing/singing/sings count once).
 *   - Pricing: confidence = min(0.75, 0.50 + 0.05 x (score +
 *     margin)) — never above the fork-creative ceiling; provenance
 *     is "verb-domain-derived", a derived layer distinct from the
 *     table and from the noun climb.
 *   - Scope: verb lemmas with at least one verb synset in the
 *     extract. The rule reads NO FrameNet data — deliberately: the
 *     prior it feeds must be computable for lexical units FrameNet
 *     does not contain, and must not read the evidence it is
 *     tested against.
 *   - Falsification: the C.2 stage-1 failure test — if the
 *     FrameNet-only baseline (the inventory's global modal shape)
 *     matches or beats the element-conditioned predictions on
 *     held-out lexical units, the domain prior fails and is
 *     adopted nowhere. The rule itself is falsified as a
 *     classification if its assignments do not recover the
 *     depth-cycle claim-3 desk groupings above chance on verbs it
 *     was not calibrated against.
 */

export const VERB_DOMAIN_CUES_V1: Record<Element, string[]> = {
  Wood: ["grow", "growth", "expand", "expansion", "extend", "extension", "spread", "rise", "rising", "ascend", "sprout", "develop", "development", "move", "movement", "motion", "travel", "journey", "proceed", "advance", "wind", "flourish", "transfer", "transmit", "convey", "deliver", "carry", "bring", "send", "go", "walk", "run", "shout", "anger", "angry", "see", "sight", "eye", "look", "watch"],
  Fire: ["heat", "hot", "warm", "warmth", "burn", "burning", "flame", "fire", "glow", "shine", "light", "bright", "boil", "melt", "blaze", "flare", "cook", "cooking", "joy", "laugh", "laughter", "speak", "speech", "talk", "tell", "say", "communicate", "communication", "verbal", "teach", "teaching", "learn", "learning", "know", "knowledge", "think", "thinking", "impart", "instruct", "instruction", "skill", "study", "educate", "education", "taste", "tongue"],
  Earth: ["make", "create", "creation", "build", "building", "construct", "construction", "produce", "production", "form", "prepare", "transform", "transformation", "assemble", "join", "food", "nourish", "fill", "filling", "full", "cover", "covering", "coat", "hold", "contain", "occupy", "receive", "sing", "singing", "song", "worry", "pensiveness", "anxious", "digest", "centre", "center", "stable"],
  Metal: ["cut", "sever", "divide", "division", "separate", "separation", "contract", "contraction", "shrink", "gather", "collect", "harvest", "pierce", "stab", "slice", "grief", "sad", "sadness", "weep", "cry", "decline", "wither", "autumn", "smell", "nose", "scent"],
  Water: ["rain", "snow", "precipitation", "precipitate", "water", "flow", "descend", "descent", "fall", "pour", "liquid", "cold", "freeze", "freezing", "ice", "rest", "store", "storage", "sleep", "still", "sink", "drip", "stream", "wet", "moisture", "wash", "cleanse", "bathe", "groan", "fear", "afraid", "hear", "ear", "listen"],
};

/** Morphological variants of a word, for cue matching: the word
 *  itself plus its regular -s / -ing / -ed / -ies alternants, so
 *  sing, sings and singing are one piece of evidence, not three. */
function wordVariants(w: string): Set<string> {
  const out = new Set([w]);
  if (w.length > 3 && w.endsWith("s")) out.add(w.slice(0, -1));
  if (w.length > 5 && w.endsWith("ing")) {
    out.add(w.slice(0, -3));
    out.add(w.slice(0, -3) + "e");
  }
  if (w.length > 4 && w.endsWith("ed")) {
    out.add(w.slice(0, -2));
    out.add(w.slice(0, -1));
  }
  if (w.length > 4 && w.endsWith("ies")) out.add(w.slice(0, -3) + "y");
  return out;
}

/** Cue surface form -> (element, cue word). The registered lists
 *  are collision-free across elements (verified at registration:
 *  no surface form is generated by two elements' cue words), so
 *  first-claim is unambiguous. */
const CUE_FORMS: Map<string, { element: Element; cue: string }> = (() => {
  const map = new Map<string, { element: Element; cue: string }>();
  for (const [element, words] of Object.entries(VERB_DOMAIN_CUES_V1) as [Element, string[]][]) {
    for (const cue of words) {
      for (const form of wordVariants(cue)) {
        if (!map.has(form)) map.set(form, { element, cue });
      }
    }
  }
  return map;
})();

export interface VerbClassification {
  element: Element;
  /** Priced per the rule: min(0.75, 0.50 + 0.05 x (score + margin)). */
  confidence: number;
  /** Distinct cue words of the winning element found in the glosses. */
  score: number;
  /** Winning score minus the runner-up element's score. */
  margin: number;
  /** The cue words that fired, in the order first seen — the
   *  classification is inspectable from these plus the glosses. */
  hits: string[];
  provenance: "verb-domain-derived";
  rule: "VERB_DOMAIN_V1";
}

const verbClassificationCache = new Map<string, VerbClassification | undefined>();

/**
 * The verb equivalent of climbClassification: a verb lemma's
 * semantic element under VERB_DOMAIN_V1, or undefined when the rule
 * abstains (no verb synsets, top score < 2, or a tie). Mirrors
 * climbClassification's toggle discipline: while the WordNet
 * provider is off the function abstains and caches nothing.
 */
export function verbClassification(lemma: string): VerbClassification | undefined {
  if (!wordnetAvailable()) return undefined;
  const key = lemma.toLowerCase();
  if (verbClassificationCache.has(key)) return verbClassificationCache.get(key);
  const result = computeVerbClassification(key);
  verbClassificationCache.set(key, result);
  return result;
}

function computeVerbClassification(key: string): VerbClassification | undefined {
  let ex;
  try {
    ex = getDefaultExtract();
  } catch {
    return undefined;
  }
  const synsets = synsetsForLemma(ex, key).filter((s) => s.pos === "v");
  if (!synsets.length) return undefined;
  const counts = new Map<Element, number>();
  const hits = new Map<Element, string[]>();
  const seen = new Set<string>();
  for (const synset of synsets) {
    for (const raw of synset.gloss.toLowerCase().split(/[^a-z]+/)) {
      if (!raw) continue;
      for (const form of wordVariants(raw)) {
        const claim = CUE_FORMS.get(form);
        if (!claim) continue;
        const id = `${claim.element}:${claim.cue}`;
        if (seen.has(id)) continue;
        seen.add(id);
        counts.set(claim.element, (counts.get(claim.element) ?? 0) + 1);
        const list = hits.get(claim.element) ?? [];
        list.push(claim.cue);
        hits.set(claim.element, list);
      }
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return undefined;
  const [element, score] = ranked[0];
  const runnerUp = ranked.length > 1 ? ranked[1][1] : 0;
  if (score < 2 || score <= runnerUp) return undefined;
  const margin = score - runnerUp;
  return {
    element,
    confidence: Math.min(0.75, 0.5 + 0.05 * (score + margin)),
    score,
    margin,
    hits: hits.get(element) ?? [],
    provenance: "verb-domain-derived",
    rule: "VERB_DOMAIN_V1",
  };
}

/** A lemma's semantic element from whichever classification reaches
 *  it: the curated table / noun climb first (the join's evidence),
 *  then VERB_DOMAIN_V1 for verbs. Used only by the domain prior. */
function elementOf(lemma: string): Element | undefined {
  return climbClassification(lemma)?.element ?? verbClassification(lemma)?.element;
}

/* ---------------- the domain prior (evaluation only) ---------------- */

/** A signature *shape*: the role inventory, abstracted from any frame. */
export type SignatureShape = { agent: boolean; slots: string[]; prepSlot?: string };

export function shapeOf(sig: FrameSignature): SignatureShape {
  return { agent: sig.agent, slots: [...sig.slots], ...(sig.prepSlot ? { prepSlot: sig.prepSlot.slot } : {}) };
}

/**
 * The elemental domain prior, as a falsifiable predictor: a verb's
 * semantic element predicts the modal signature shape among the
 * *seen* inventory verbs sharing that element. The element comes
 * from the same evidence the join uses where that reaches (the
 * curated table / WordNet noun climb), and for verbs — which the
 * climb cannot reach — from VERB_DOMAIN_V1 (verbClassification
 * above), a WordNet-side rule that reads no FrameNet data. Falls
 * back to the global modal shape when the verb has no classification
 * or its element group is empty. This is the depth-cycle claim-3
 * mechanism (element-domain predicts signature shape) stated as code
 * so the evaluation can score it — it is used NOWHERE in parsing or
 * checking. Its trial record (stage 1: not runnable; slice 4: run)
 * is docs/fork/verb-classification-trial.md and registry entry H8.
 */
export function predictSignatureShape(
  lemma: string,
  inventory: FrameSignature[],
): { shape: SignatureShape; element?: Element; basis: string } {
  const shapeKey = (s: SignatureShape) => [s.agent ? "agent" : "noagent", ...s.slots, s.prepSlot ? `@${s.prepSlot}` : ""].join("+");
  const modal = (sigs: FrameSignature[]): SignatureShape | undefined => {
    const counts = new Map<string, { shape: SignatureShape; n: number }>();
    for (const sig of sigs) {
      const shape = shapeOf(sig);
      const k = shapeKey(shape);
      const entry = counts.get(k) ?? { shape, n: 0 };
      entry.n += 1;
      counts.set(k, entry);
    }
    return [...counts.values()].sort((a, b) => b.n - a.n || shapeKey(a.shape).localeCompare(shapeKey(b.shape)))[0]?.shape;
  };
  const element = elementOf(lemma);
  if (element) {
    const group = inventory.filter(
      (sig) => elementOf(sig.lemma) === element,
    );
    const shape = group.length > 0 ? modal(group) : undefined;
    if (shape) return { shape, element, basis: `modal shape of ${group.length} seen verbs classified ${element}` };
  }
  const global = modal(inventory);
  return {
    shape: global ?? { agent: true, slots: ["patient"] },
    ...(element ? { element } : {}),
    basis: "global modal shape (no element group)",
  };
}
