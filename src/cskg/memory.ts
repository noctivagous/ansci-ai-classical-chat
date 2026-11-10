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
 * (§5) — is E4. E1 has no long-term store: general mode writes
 * nothing long-term, and there is nothing to load.
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
import type { ThoughtTrace, TurnWorkspace } from "./workspace";

export interface SessionState {
  /** resolved term ids, most recent last */
  topics: number[];
  lastIntent: string;
  traces: ThoughtTrace[];
  turnCount: number;
}

export function createSession(): SessionState {
  return { topics: [], lastIntent: "fact", traces: [], turnCount: 0 };
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
  return {
    text: renderReplay(edgeLines),
    grounded: prev.conclusions.length > 0,
  };
}
