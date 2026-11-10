/**
 * memory.ts — engine piece D: memory (design §2, §5).
 *
 * Memory is a standing context the other pieces query, not a
 * pipeline stage. Short-term lives here in the session: the topic
 * stack (active referents), the last intent, and the trace ring —
 * the last turns' workspaces' traces, which is what "why did you
 * say that?" replays, WITHOUT re-querying the graph. Corrections
 * are memory's business too: the corrected referent replaces the
 * topic the conversation is about.
 *
 * Long-term memory — the person file and its write discipline
 * (§5) — landed with E4 in person.ts; this module holds the
 * session-side tiers that pair with it (the person's current
 * state, pending clarifications, the interruption budget).
 *
 * Each turn, D contributes the workspace's `activeContext` (a
 * snapshot of the session's topics and standing intent, supplied
 * before analysis so B and E can consult it) and, at the end of
 * the turn, commits the turn's trace to the ring.
 *
 * Writes (engine map): `activeContext`; the trace ring commit.
 */
import {
  edgeText,
  renderReplay,
  renderReplayNoPrevious,
} from "./articulate";
import type { CskgGraph } from "./loader";
import { createSituationModel, type SituationModel } from "./situation";
import type { ThoughtTrace, TurnWorkspace } from "./workspace";

/**
 * One entry of the person's CURRENT STATE (design §5, the
 * transient tier): a feeling, a current doing, a present
 * circumstance. Session-scoped — superseded by a newer entry of
 * the same kind, and it lapses with the session. A habitual
 * marker ("all the time") rides on the entry as a standing
 * pattern; patterns that reach the person FILE live in
 * person.ts.
 */
export interface PersonStateEntry {
  kind: "feeling" | "doing" | "circumstance";
  /** the state as stated, lightly trimmed ("tired") */
  text: string;
  /** the canonical record ATOMIC is consulted from */
  canonical: string;
  /** the turn that stated it */
  turn: number;
  /** a habitual marker ("all the time"), or null */
  pattern: string | null;
}

/** One pre-mapped branch of a pending clarification (§5). */
export interface ClarificationBranch {
  /** the resolver's rival key */
  key: string;
  /** the reading's label, as the person would name it ("the common cold") */
  label: string;
  /** words a reply may use to pick this branch (lemmas, gloss words) */
  matchWords?: string[];
  /** graph ids a reply may name to pick this branch (the reading's filing cluster + its IsA ancestors) */
  matchIds?: number[];
  /** for a definition pending: the branch's WordNet synset */
  synsetId?: string;
  /** for a referent pending: the branch's graph term */
  termId?: number;
}

/**
 * A clarification the chat has ASKED and not yet had answered.
 * The next turn resolves it BEFORE new analysis (§5): the
 * branches are pre-mapped, so "the second one" or the label
 * itself selects the reading the original question is then
 * answered under.
 */
export interface PendingClarification {
  /** the term the readings are rivals for */
  termText: string;
  kind: "definition" | "fact";
  branches: ClarificationBranch[];
  /** the turn the question was asked on */
  askedTurn: number;
}

export interface SessionState {
  /** resolved term ids, most recent last */
  topics: number[];
  lastIntent: string;
  traces: ThoughtTrace[];
  turnCount: number;
  /** the person's current state (transient tier, §5) */
  personStates: PersonStateEntry[];
  /** explicit "remember that…" notes held for this session only */
  sessionNotes: string[];
  /**
   * Durable facts stated this session (name, lives-in, …).
   * General mode keeps them here only — they do not survive
   * a new session. Named-person mode also writes the file.
   */
  sessionFacts: { kind: string; object: string; display: string }[];
  /** a clarification ask awaiting the person's answer (§5) */
  pendingClarification: PendingClarification | null;
  /** clarifications asked so far (the interruption budget, §5) */
  clarificationsAsked: number;
  /** the previous turn ended in a clarification ask */
  lastTurnWasAsk: boolean;
  /** senses settled by correction or clarification: term → synset id */
  settledSenses: Record<string, string>;
  /**
   * E5: the session's live SITUATION MODEL (situation.ts) — the
   * conversation's own micro-world of entities, events, states
   * and attributed relations. It lives in the session like the
   * topic stack and the trace ring do, and Situation analysis is
   * its only writer; memory merely holds it.
   */
  situation: SituationModel;
}

export function createSession(): SessionState {
  return {
    topics: [],
    lastIntent: "fact",
    traces: [],
    turnCount: 0,
    personStates: [],
    sessionNotes: [],
    sessionFacts: [],
    pendingClarification: null,
    clarificationsAsked: 0,
    lastTurnWasAsk: false,
    settledSenses: {},
    situation: createSituationModel(),
  };
}

/** D's standing contribution to a turn's workspace (§4). */
export interface ActiveContext {
  /** session topic ids at the start of the turn, oldest first */
  topics: number[];
  /** the standing intent the conversation is carrying */
  lastIntent: string;
}

/** Supply the workspace's `activeContext` from the session. */
export function supplyContextInto(ws: TurnWorkspace, session: SessionState): void {
  ws.activeContext = {
    topics: [...session.topics],
    lastIntent: session.lastIntent,
  };
}

/** Commit a finished turn's trace to the ring (last 20 kept). */
export function commitTrace(session: SessionState, trace: ThoughtTrace): void {
  session.traces.push(trace);
  if (session.traces.length > 20) session.traces.shift();
}

/** The conversation's current topic: most recent remembered term. */
export function currentTopicId(session: SessionState): number | undefined {
  return session.topics[session.topics.length - 1];
}

export function remember(session: SessionState, id: number): void {
  if (session.topics[session.topics.length - 1] !== id) session.topics.push(id);
  if (session.topics.length > 12) session.topics.shift();
}

/**
 * Replay: answer "why did you say that?" from the stored trace.
 * The graph is NOT re-queried — the edges cited are the ones the
 * earlier turn actually used.
 */
export function replayAnswer(
  g: CskgGraph,
  session: SessionState,
): { text: string; grounded: boolean } {
  const prev = session.traces[session.traces.length - 1];
  if (!prev) {
    return { text: renderReplayNoPrevious(), grounded: false };
  }
  const edgeLines = prev.conclusions.map((c) => edgeText(g, c.edge));
  if (edgeLines.length) {
    return { text: renderReplay(edgeLines), grounded: true };
  }
  // Empty-set declines consulted the graph and found silence.
  // Replaying "it came from the conversation itself" is false:
  // the previous answer named the missing relation, and that
  // naming is the reason.
  const emptySet = prev.steps.some(
    (s) => s.kind === "triage" && /empty relation set/.test(s.detail),
  );
  if (emptySet && prev.answer) {
    const rest = prev.answer.charAt(0).toLowerCase() + prev.answer.slice(1);
    return { text: `Because ${rest}`, grounded: false };
  }
  return { text: renderReplay([]), grounded: false };
}
