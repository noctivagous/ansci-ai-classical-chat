/**
 * workspace.ts — the turn workspace (design §4).
 *
 * One typed object per turn. Each field is written by exactly one
 * piece (the engine map in engine-map.ts is the contract; a field
 * is only ever assigned inside its owner's functions):
 *
 *   situation, person   — awareness
 *   breakdown           — discourse
 *   intent              — intent
 *   activeContext       — memory (its standing contribution)
 *   conclusions         — solve (via solve.addConclusions)
 *   reply               — articulate (via articulate.speak)
 *   input               — the interface, at construction
 *   trace               — the shared record: every piece appends
 *                         its steps via noteStep(); memory commits
 *                         it to the session's trace ring.
 *
 * At the end of the turn the workspace's trace IS the thought
 * trace: replaying "why did you say that?" shows which pieces
 * acted, what each decided, and the breakdown the answer was
 * built from.
 */
import type { PersonContext, Situation } from "./awareness";
import type { Conclusion } from "./articulate";
import type { Breakdown } from "./discourse";
import type { EngineNodeId } from "./engine-map";
import type { Intent } from "./intent";
import type { ActiveContext } from "./memory";

export type TraceStepKind =
  | "situate" | "resolve" | "intent" | "query" | "conclude"
  | "decline" | "replay" | "correct" | "remember" | "triage";

export interface TraceStep {
  /** the engine-map node id of the piece that acted */
  piece: EngineNodeId;
  kind: TraceStepKind;
  detail: string;
  edges?: string[];
}

export interface ThoughtTrace {
  turn: number;
  input: string;
  intent: string;
  steps: TraceStep[];
  conclusions: Conclusion[];
  answer: string;
}

export interface TurnWorkspace {
  turn: number;
  input: string;
  situation: Situation | null;
  person: PersonContext | null;
  breakdown: Breakdown | null;
  intent: Intent | null;
  activeContext: ActiveContext | null;
  conclusions: Conclusion[];
  reply: string | null;
  trace: ThoughtTrace;
}

export function createWorkspace(turn: number, input: string): TurnWorkspace {
  const conclusions: Conclusion[] = [];
  return {
    turn,
    input,
    situation: null,
    person: null,
    breakdown: null,
    intent: null,
    activeContext: null,
    conclusions,
    reply: null,
    trace: { turn, input, intent: "", steps: [], conclusions, answer: "" },
  };
}

/** Append a step to the turn's trace, citing the acting piece. */
export function noteStep(
  ws: TurnWorkspace,
  piece: EngineNodeId,
  kind: TraceStepKind,
  detail: string,
  edges?: string[],
): void {
  const step: TraceStep = { piece, kind, detail };
  if (edges) step.edges = edges;
  ws.trace.steps.push(step);
}
