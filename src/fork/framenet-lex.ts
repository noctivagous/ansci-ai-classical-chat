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
 */

import { getDefaultFrameNetBundle, type FrameRecord } from "../framenet";
import type { Element } from "./sentence";
import { climbClassification } from "./wordnet-lex";

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

/* ---------------- the domain prior (evaluation only) ---------------- */

/** A signature *shape*: the role inventory, abstracted from any frame. */
export type SignatureShape = { agent: boolean; slots: string[]; prepSlot?: string };

export function shapeOf(sig: FrameSignature): SignatureShape {
  return { agent: sig.agent, slots: [...sig.slots], ...(sig.prepSlot ? { prepSlot: sig.prepSlot.slot } : {}) };
}

/**
 * The elemental domain prior, as a falsifiable predictor: a verb's
 * semantic element (WordNet climb, the same evidence the join uses)
 * predicts the modal signature shape among the *seen* inventory verbs
 * sharing that element. Falls back to the global modal shape when the
 * verb has no classification or its element group is empty. This is
 * the depth-cycle claim-3 mechanism (element-domain predicts signature
 * shape) stated as code so the stage-1 evaluation can score it —
 * it is used NOWHERE in parsing or checking.
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
  const element = climbClassification(lemma)?.element;
  if (element) {
    const group = inventory.filter(
      (sig) => climbClassification(sig.lemma)?.element === element,
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
