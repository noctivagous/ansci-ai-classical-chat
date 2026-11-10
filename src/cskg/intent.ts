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
import { matchEventTemplate } from "./discourse";
import type { CskgGraph } from "./loader";
import type { CaptureResult, PersonConnection } from "./person";
import { noteStep, type TurnWorkspace } from "./workspace";

export type IntentKind =
  | "replay" | "correction" | "situation" | "followup" | "why"
  | "tool" | "related" | "feel" | "purpose" | "location" | "madeof"
  | "part" | "capability" | "property" | "antonym" | "whatis"
  | "fact" | "statement" | "question" | "clarification" | "memory"
  | "advice";

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
  const text = lower.toLowerCase().trim();
  const corr = text.match(/^(?:no|nope)[,.]?\s+(?:i meant|i mean|not that,? i meant)\s+(.+?)[.!?]?$/) ??
    text.match(/^i meant\s+(.+?)[.!?]?$/);
  if (!corr) return null;
  let phrase = corr[1].trim();
  // Em-dash restatement ("the food — the meat, for soup")
  // keeps the first intended referent. A trailing purpose
  // adjunct ("for soup") is not the referent.
  phrase = phrase.split(/\s+[—–]\s+/)[0].trim();
  phrase = phrase.replace(/,?\s+for\s+.+$/, "").trim();
  return phrase ? { phrase } : null;
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

/**
 * "what can I open a wine bottle with?" / "what can/should/could
 * I use to …?" — can, should and could ask the same problem
 * (gap 3: "what should I use to hang the cabinets?" fell through
 * to a definition answer). The route — reverse-UsedFor set
 * operations with honest decline — is identical for all three.
 */
export type PhaticKind = "greeting" | "thanks" | "farewell";

/**
 * Phatic-only turns (gap 1): greetings, thanks and farewells
 * with no other content. Full-input match only, so "hi, I
 * renovated the kitchen" keeps its normal route — only the
 * bare social move is taken up here. The reply is social, in no
 * need of graph testimony (E4 schmooze doctrine: zero graph
 * facts is a complete success, never a decline).
 */
export function detectPhatic(lower: string): { kind: PhaticKind; word: string } | null {
  const text = lower.toLowerCase().trim().replace(/[!.,?]+$/, "").trim();
  const tag = "(?:how(?:'s| is) it going|how are you(?: doing)?|what'?s up)";
  let m = text.match(new RegExp(`^(hi|hello|hey|howdy)( there)?(?:[,.]?\\s+${tag})?$`));
  if (m) return { kind: "greeting", word: `${m[1]}${m[2] ?? ""}` };
  m = text.match(new RegExp(`^${tag}$`));
  if (m) return { kind: "greeting", word: m[0] };
  m = text.match(/^(good morning|good afternoon|good evening)$/);
  if (m) return { kind: "greeting", word: m[1] };
  m = text.match(/^(thanks|thank you|thx|ty)(?:\s+anyway)?$/);
  if (m) return { kind: "thanks", word: m[1] };
  m = text.match(/^(bye|goodbye|good ?night|see you(?: later)?)$/);
  if (m) return { kind: "farewell", word: m[1].replace(/ +/g, " ") };
  return null;
}

/**
 * A social clause opening a mixed turn ("thanks anyway. I'll
 * go make coffee"). The leading move is taken up; the rest
 * keeps its normal route. Comma-joined content ("hi, I
 * renovated…") is not a leading clause.
 */
export function detectLeadingPhatic(
  lower: string,
): { kind: PhaticKind; word: string; rest: string } | null {
  const text = lower.toLowerCase().trim();
  const m = text.match(/^(thanks|thank you|thx|ty)(?:\s+anyway)?[.!]+\s+(.+)$/);
  if (m && m[2].trim()) return { kind: "thanks", word: m[1], rest: m[2].trim() };
  return null;
}

/**
 * An explicit "remember that…": the write discipline's second
 * door (§5). Matched case-insensitively, but the returned span
 * keeps the person's own words — it names what is filed, so
 * display fidelity outranks the lowercasing the other detectors
 * use. Null when the turn is not a remember ask.
 */
export function detectRemember(input: string): string | null {
  const trimmed = input.trim();
  const m = trimmed.match(/^(?:please\s+)?remember that\s+(.+?)[.!?]?$/i);
  if (!m) return null;
  const stated = trimmed
    .replace(/^(?:please\s+)?remember that\s+/i, "")
    .replace(/[.!?]+$/, "");
  return stated ? stated : null;
}

/** "do onions go in chicken soup?" — composition of two poles. */
export function detectComposition(lower: string): { inner: string; outer: string } | null {
  const t = lower.toLowerCase().replace(/[?]+$/, "").trim();
  const m = t.match(/^do(?:es)? (.+?) go in(?:to)? (?:a |an |the )?(.+)$/);
  if (m) return { inner: m[1].trim(), outer: m[2].trim() };
  return null;
}

export type AdviceQuery =
  | { kind: "addition"; outer: string | null }
  | { kind: "wear"; item: string };

/**
 * Recommendation asks. Addition ("what else should I put in?")
 * wants more members of a dish's composition set. Wear ("should
 * I wear a coat?") asks whether to put on a garment. Matches the
 * last clause so a mixed turn still classifies.
 */
export function detectAdvice(lower: string): AdviceQuery | null {
  const t = lower.toLowerCase().replace(/[?]+$/, "").trim();
  const additionOuter = (raw: string | undefined): string | null => {
    const o = (raw ?? "").trim();
    if (!o || o === "it") return null;
    return o;
  };
  let m = t.match(
    /\bwhat else (?:should|can|could) i (?:put in(?:to)?|add)(?:\s+(?:the |a |an )?(.+))?$/,
  );
  if (m) return { kind: "addition", outer: additionOuter(m[1]) };
  m = t.match(
    /\bwhat (?:should|can|could) i (?:put in(?:to)?|add)(?:\s+(?:the |a |an )?(.+))?$/,
  );
  if (m) return { kind: "addition", outer: additionOuter(m[1]) };
  m = t.match(/\bshould i wear (?:a |an |the )?(.+?)(?:\s+if\b.*)?$/);
  if (m) return { kind: "wear", item: m[1].trim() };
  return null;
}

/** Ordinary-English recall of a stated name or place. */
export function detectPersonRecall(lower: string): "file" | "name" | "place" | null {
  const t = lower.toLowerCase();
  if (/\bwhat do you (?:remember|know) about me\b|\bdo you remember me\b|\bwhat have i told you\b/.test(t)) {
    return "file";
  }
  if (/\bdo you remember my name\b|\bwhat(?:'s| is) my name\b/.test(t)) return "name";
  if (/\bwhere do i live\b|\bdo you remember where i live\b/.test(t)) return "place";
  return null;
}

export function detectToolQuery(lower: string): ToolQuery | null {
  const exclusions = extractExclusions(lower);
  const openMatch = lower.match(/what can i open (?:a |an |the )?(.+?) with/);
  if (openMatch) return { target: openMatch[1], verb: "open", isOpen: true, exclusions };
  const useToMatch = lower.match(/what (?:can|should|could) i use to (.+?)[?]?$/);
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

/* ---------------- statement classification (E4, §2 piece C) ------
 *
 * For STATEMENTS the analysis runs in the design's set order:
 * person knowledge FIRST (capture + connections, computed by
 * the coordinator before this runs), then classification —
 * schmoozing (phatic sharing) vs connected (bearing on the
 * person, their people, or the conversation's concerns) vs
 * plain informing — with a stated feeling classified as its
 * own class, STATE, since its reply is drawn from the state
 * record. The reply is formulated only after this analysis.
 *
 * The classification weighs UTTERANCE and CONVERSATION evidence
 * (what was captured, what the person model connects) together
 * with GRAPH evidence — the graph-first rule applied to the
 * classifier itself. Three graph channels, each traced with
 * its contribution:
 *
 *   1. ATOMIC EVENT KEYING — does the statement's event clause
 *      key to an ATOMIC template (the depth-pass matcher), and
 *      how strongly? A first-person doing that keys well is a
 *      narrated life event — the schmooze substrate.
 *   2. ANNOTATION PROFILE of the keyed template — xIntent /
 *      xReact / xWant presence and richness. A strong xIntent
 *      profile marks a voluntary, socially shareable doing
 *      (and licenses the motivation follow-up); a bare state
 *      keys differently.
 *   3. NEIGHBOURHOOD CHARACTER of the statement's topic —
 *      occasion/social relations (subevents, prerequisites,
 *      locations, causes) around the topic vs purely
 *      referential content (IsA, properties, parts, make-up).
 *
 * Discipline: the graph channels are EVIDENCE, weighed with
 * the rest — the graph never decides discourse intent alone,
 * and a statement that keys to nothing still classifies on
 * the utterance evidence (rain statements, appointments).
 * `graphEvidence: false` runs the classifier with the graph
 * channels weightless (the probe mode the E4 judgement uses
 * to measure what the channels actually change).
 */

export type StatementClass = "schmooze" | "connected" | "informing" | "state";

export interface StatementClassification {
  kind: StatementClass;
  scores: { schmooze: number; connected: number; informing: number };
  /** per-channel contributions, as traced */
  channels: string[];
}

const OCCASION_RELS = ["/r/HasSubevent", "/r/HasPrerequisite", "/r/AtLocation", "/r/Causes"];
const REFERENTIAL_RELS = ["/r/IsA", "/r/HasProperty", "/r/MadeOf", "/r/PartOf", "/r/UsedFor"];

export function classifyStatement(
  g: CskgGraph,
  ws: TurnWorkspace,
  capture: CaptureResult,
  connections: PersonConnection[],
  graphEvidence: boolean,
): StatementClassification {
  const channels: string[] = [];
  const scores = { schmooze: 0, connected: 0, informing: 0 };

  // --- utterance / conversation evidence (person knowledge first) ---
  if (capture.doing) {
    scores.schmooze += 3;
    channels.push(`utterance: a first-person doing is narrated ("${capture.doing}") +3 schmooze`);
  }
  if (capture.newPerson) {
    scores.schmooze += 3;
    channels.push(`utterance: a person is introduced as new (${capture.newPerson}) +3 schmooze`);
  }
  if (capture.factsWritten.length) {
    scores.informing += 2;
    channels.push(
      `person: ${capture.factsWritten.length} durable fact(s) stated for the record +2 informing`);
  }
  if (connections.length) {
    scores.connected += 4;
    channels.push(
      `person knowledge: the statement touches ${connections.map((c) => `"${c.fact.display}"`).join(", ")} +4 connected`);
  }
  const possessiveThing = (ws.breakdown?.contents?.people ?? []).some((e) => e.possessive) &&
    (ws.breakdown?.contents?.things.length ?? 0) > 0;
  if (possessiveThing && !connections.length) {
    channels.push("utterance: a possessed thing is spoken of — no recorded connection, no score");
  }

  // --- graph evidence channels ---
  if (graphEvidence) {
    const words = ws.breakdown?.words ?? [];
    // channel 1+2: event keying and the keyed template's profile
    const templ = matchEventTemplate(g, words);
    if (templ.match) {
      scores.schmooze += 2;
      channels.push(
        `graph/event-keying: the statement keys to ATOMIC "${templ.match.text}" ` +
        `(F1 ${templ.match.score.toFixed(2)}, coverage ${templ.match.coverage.toFixed(2)}) +2 schmooze`);
      const count = (rel: string): number => g.outEdges(templ.match!.id, rel).length;
      const xIntent = count("at:xIntent");
      const xReact = count("at:xReact");
      const xWant = count("at:xWant");
      const richness = g.outEdges(templ.match.id).filter((e) => e.rel.startsWith("at:")).length;
      if (xIntent > 0) {
        scores.schmooze += 1.5;
        channels.push(
          `graph/annotation: the keyed template carries xIntent ×${xIntent} (xReact ×${xReact}, xWant ×${xWant}, ${richness} at: edges in all) — a voluntary, shareable doing +1.5 schmooze`);
      } else {
        channels.push(
          `graph/annotation: the keyed template has no xIntent (xReact ×${xReact}, xWant ×${xWant}, ${richness} at: edges in all) — no score`);
      }
    } else {
      channels.push(
        `graph/event-keying: no ATOMIC template above threshold over ${templ.considered} candidates — no score (a statement that keys to nothing still classifies)`);
    }
    // channel 3: neighbourhood character of the topic
    const topic = ws.breakdown?.topics[0];
    if (topic) {
      const occasion = OCCASION_RELS.reduce((n, rel) => n + g.outEdges(topic.id, rel).length, 0);
      const referential = REFERENTIAL_RELS.reduce((n, rel) => n + g.outEdges(topic.id, rel).length, 0);
      if (occasion > 0 && occasion >= referential) {
        scores.schmooze += 1;
        channels.push(
          `graph/neighbourhood: "${topic.text}" carries ${occasion} occasion/social edges vs ${referential} referential — an occasion, not a reference +1 schmooze`);
      } else if (referential > 0 && occasion === 0) {
        scores.informing += 1;
        channels.push(
          `graph/neighbourhood: "${topic.text}" carries ${referential} referential edges and no occasion edges — purely referential content +1 informing`);
      } else {
        channels.push(
          `graph/neighbourhood: "${topic.text}" occasion ${occasion} / referential ${referential} — mixed, no score`);
      }
    } else {
      channels.push("graph/neighbourhood: no topic resolved — no score");
    }
  } else {
    channels.push("graph channels: DISABLED for this run (probe mode) — classification on utterance/conversation evidence alone");
  }

  // --- the decision ---
  let kind: StatementClass;
  if (capture.feeling) {
    kind = "state";
    channels.push("decision: a stated feeling is its own class — state (the reply is drawn from the state record)");
  } else if (scores.connected === 0 && scores.schmooze === 0 && scores.informing === 0) {
    kind = "informing";
    channels.push("decision: no channel scored — plain informing by default");
  } else {
    // ties break toward the person's world: connected, then
    // schmooze, then informing — a statement that touches the
    // person model is about the person before it is small talk.
    kind =
      scores.connected >= scores.schmooze && scores.connected >= scores.informing
        ? "connected"
        : scores.schmooze >= scores.informing
          ? "schmooze"
          : "informing";
    channels.push(
      `decision: scores schmooze ${scores.schmooze} / connected ${scores.connected} / informing ${scores.informing} → ${kind}`);
  }
  noteStep(ws, "intent", "intent",
    `statement classification: ${kind} — ${channels.join("; ")}`);
  return {
    kind,
    scores,
    channels,
  };
}
