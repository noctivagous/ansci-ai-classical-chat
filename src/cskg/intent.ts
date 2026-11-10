/**
 * intent.ts — engine piece C: the intent analyzer (design §2).
 *
 * The person's objective: inform, ask (and what kind), correct,
 * request help with a problem, continue a topic, ask about the
 * conversation itself. B says what was said; C says what is wanted
 * — adjacent passes over the same text, but separate outputs (§2).
 *
 * E1's classification is the spike's surface-form cascade,
 * rehoused: detectors over the turn's text, in the coordinator's
 * order — the conversational early moves (replay, correction, a
 * question about the situated self), then follow-up and bare-why,
 * then the tool-finding shape, then the question intents. C only
 * classifies; E executes (solve.ts).
 *
 * Writes (engine map): `intent` — via assignIntent(), the only
 * assignment. Reads: `breakdown`, `situation`, `person`.
 */
import type { SituationQuestion } from "./articulate";
import type { TurnWorkspace } from "./workspace";

export type IntentKind =
  | "replay" | "correction" | "situation" | "followup" | "why"
  | "tool" | "related" | "feel" | "purpose" | "location" | "madeof"
  | "part" | "capability" | "property" | "antonym" | "whatis"
  | "fact" | "statement" | "question";

export interface Intent {
  kind: IntentKind;
}

/** C's one write: record the classified intent in the workspace. */
export function assignIntent(ws: TurnWorkspace, kind: IntentKind): void {
  ws.intent = { kind };
}

/* ---------------- the conversational early moves ---------------- */

/** "why did you say that?" — a question about the conversation. */
export function detectReplay(lower: string): boolean {
  return /\bwhy did you say that\b|\bhow do you know\b|\bwhere did you get that\b/.test(lower);
}

/** "no, I meant the illness" — returns the corrected phrase. */
export function detectCorrection(lower: string): { phrase: string } | null {
  const corr = lower.match(/^(?:no|nope)[,.]?\s+(?:i meant|i mean|not that,? i meant)\s+(.+?)[.!?]?$/) ??
    lower.match(/^i meant\s+(.+?)[.!?]?$/);
  return corr ? { phrase: corr[1] } : null;
}

/** A question about the situated self: time, season, or place. */
export function detectSituationQuestion(lower: string): SituationQuestion | null {
  if (/\bwhat time is it\b|\bwhat(?:'s| is) the time\b/.test(lower)) return "time";
  if (/\bwhat season is it\b|\bwhich season/.test(lower)) return "season";
  if (/\bwhere are you\b|\bwhere am i\b/.test(lower)) return "place";
  return null;
}

/** "what about X?" — continue, with a new topic. */
export function detectFollowup(lower: string): { query: string } | null {
  const m = lower.match(/^what about (?:the |a |an )?(.+?)[?]?$/);
  return m ? { query: m[1] } : null;
}

/** A bare "why?" — the objective is the current topic's cause. */
export function isBareWhy(lower: string): boolean {
  return /^why[?]?$/.test(lower.trim());
}

/* ---------------- tool-finding shape ---------------------------- */

export interface ToolQuery {
  /** the object phrase ("wine bottle") */
  target: string;
  /** the action verb when the shape names one ("open"), else null */
  verb: string | null;
  /** true for "what can i open X with", false for "what can i use to …" */
  isOpen: boolean;
  /**
   * Explicit exclusions the person stated ("without a corkscrew",
   * "if I don't have a corkscrew") — solve applies DIFFERENCE with
   * these (§6): the excluded item leaves its own answer set.
   */
  exclusions: string[];
}

function extractExclusions(lower: string): string[] {
  const out: string[] = [];
  const patterns = [
    /\bwithout (?:a |an |the )?([a-z][a-z' -]*?)(?=[?.!,;]|$)/g,
    /\bdon'?t have (?:a |an |the )?([a-z][a-z' -]*?)(?=[?.!,;]|$)/g,
    /\bno ([a-z][a-z ]*?)(?=[?.!,;]|$)/g,
  ];
  for (const re of patterns) {
    for (const m of lower.matchAll(re)) {
      const phrase = m[1].trim();
      if (phrase && !out.includes(phrase)) out.push(phrase);
    }
  }
  return out;
}

/** "what can I open a wine bottle with?" / "what can I use to …?" */
export function detectToolQuery(lower: string): ToolQuery | null {
  const exclusions = extractExclusions(lower);
  const openMatch = lower.match(/what can i open (?:a |an |the )?(.+?) with/);
  if (openMatch) return { target: openMatch[1], verb: "open", isOpen: true, exclusions };
  const useToMatch = lower.match(/what can i use to (.+?)[?]?$/);
  if (useToMatch) return { target: useToMatch[1], verb: null, isOpen: false, exclusions };
  return null;
}

/* ---------------- question classification ----------------------- */

export function isQuestionForm(lower: string): boolean {
  return lower.endsWith("?") || /^(what|why|how|where|when|who|can|could|is|are|do|does)\b/.test(lower);
}

export function hasRelatedPattern(lower: string): boolean {
  return /\brelated\b|\bhave in common\b|\bconnection between\b/.test(lower);
}

export function hasWhyPattern(lower: string): boolean {
  return lower.startsWith("why") || /\bwhat causes\b/.test(lower);
}

export function hasFeelPattern(lower: string): boolean {
  return /\bfeel\b|\bwhat happens\b/.test(lower);
}

/**
 * The event-question families (depth pass): which ATOMIC relation
 * family the question asks about. "happens" is the event-consequence
 * family (solveEventConsequence); the rest are the reaction family
 * (feelings, reactions, wants, needs, intentions) that the template
 * matcher serves. Null when the turn is not an event question. The
 * want/need patterns require a people-ish subject so ordinary
 * object questions ("what do I need for the recipe?") keep their
 * existing routes until solve proves otherwise.
 */
export type EventQuestionKind =
  | "happens" | "feel" | "react" | "want" | "need" | "intent";

export function eventQuestionKind(lower: string): EventQuestionKind | null {
  if (/\bwhat happens\b/.test(lower)) return "happens";
  if (/\bintend/.test(lower)) return "intent";
  if (/\breact/.test(lower)) return "react";
  if (/\bfeel/.test(lower)) return "feel";
  const peopleSubject = /\b(people|person|someone|you|they|he|she)\b/.test(lower);
  if (peopleSubject && /\bwant\b/.test(lower)) return "want";
  if (peopleSubject && /\bneed\b/.test(lower)) return "need";
  return null;
}

/**
 * The definition shape within what-is (Definitions slice): the
 * turn asks what a term IS ("what is a headache?", "what are
 * the symptoms…" aside) — as opposed to "what does X do", which
 * the whatis catch-all also catches but which asks for behaviour,
 * not a definition. Only definition-shaped turns lead with a
 * WordNet gloss (definitions.ts); the rest of the whatis family
 * keeps the neighbourhood answer it has always had.
 */
export function isDefinitionQuestion(lower: string): boolean {
  return /^what (?:is|are)\b/.test(lower.trim());
}

export type SurfaceIntentKind =
  | "purpose" | "location" | "madeof" | "part"
  | "capability" | "property" | "antonym" | "whatis";

/**
 * The question intents by surface pattern, first match wins — the
 * order is the spike's: purpose, location, made-of, part,
 * capability, property, antonym, and what-is as the catch-all
 * question shape. Null when no pattern matches (the coordinator
 * falls back to a generic grounded fact).
 */
export function classifySurface(lower: string): SurfaceIntentKind | null {
  if (/\bused for\b|\bwhat (?:is|are) .+ for\b|\bwhat can i use .+ for\b/.test(lower)) return "purpose";
  if (/\bwhere\b/.test(lower)) return "location";
  if (/\bmade of\b/.test(lower)) return "madeof";
  if (/\bpart/.test(lower)) return "part";
  if (/\bwhat can\b.*\bdo\b|\bcapable\b/.test(lower)) return "capability";
  if (/\bwhat is .+ like\b|\blike\?$/.test(lower)) return "property";
  if (/\bopposite of\b/.test(lower)) return "antonym";
  if (/\bwhat (?:is|are|does)\b/.test(lower)) return "whatis";
  return null;
}
