/**
 * workspace.ts — the turn workspace (design §4).
 *
 * One typed object per turn. Each field is written by exactly one
 * piece (the engine map in engine-map.ts is the contract; a field
 * is only ever assigned inside its owner's functions):
 *
 *   situation, person,
 *   role, disposition   — awareness (the disposition's content
 *                         is disposition.ts's own; awareness
 *                         loads it with the frame)
 *   context             — the Context module (context.ts)
 *   breakdown           — discourse
 *   intent              — intent
 *   activeContext       — memory (its standing contribution)
 *   situationModel      — Situation analysis (situation.ts, E5):
 *                         a snapshot of the session's live
 *                         situation model as this turn leaves it
 *   conclusions         — solve (via solve.addConclusions; the
 *                         statement composer also contributes via
 *                         that same function)
 *   statementPolicy     — statement (the statement reply's plan;
 *                         articulate words it, never the reverse)
 *   reply               — articulate (via articulate.speak, the
 *                         turn's only speaker)
 *   input               — the interface, at construction
 *   trace               — the shared record: every piece appends
 *                         its steps via noteStep(); memory commits
 *                         it to the session's trace ring.
 *   queries             — the turn's graph query log: appended by
 *                         the loader's sink, which turn.ts installs
 *                         only for a turn that opted in. No piece
 *                         reads it; it exists for the trace file.
 *
 * At the end of the turn the workspace's trace IS the thought
 * trace: replaying "why did you say that?" shows which pieces
 * acted, what each decided, and the breakdown the answer was
 * built from.
 */
import type { PersonContext, Situation } from "./awareness";
import type { Conclusion } from "./articulate";
import type { OperativeContext } from "./context";
import type { Disposition } from "./disposition";
import type { Breakdown } from "./discourse";
import type { EngineNodeId } from "./engine-map";
import type { StatementPlan } from "./statement";
import type { Intent } from "./intent";
import type { QueryRecord } from "./loader";
import type { ActiveContext } from "./memory";
import type { RolePack } from "./roles";
import type { SituationSnapshot } from "./situation";

export type TraceStepKind =
  | "situate" | "resolve" | "intent" | "query" | "conclude"
  | "decline" | "replay" | "correct" | "remember" | "triage"
  | "compose" | "examine" | "situate-model"
  // Phase 3: the combination step of an adaptive query tree —
  // gathered conclusions arbitrated against each other before
  // the turn concludes (kept / excluded, with the reason).
  | "arbitrate";

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
  /** the role pack awareness loaded (roles.ts) */
  role: RolePack | null;
  /** the frame's riding assumptions awareness loaded (disposition.ts) */
  disposition: Disposition | null;
  /** the operative context the Context module composed */
  context: OperativeContext | null;
  breakdown: Breakdown | null;
  intent: Intent | null;
  activeContext: ActiveContext | null;
  /** E5: the situation model as this turn leaves it (situation.ts) */
  situationModel: SituationSnapshot | null;
  conclusions: Conclusion[];
  /** the statement reply's plan, when this turn took the statement route */
  statementPolicy: StatementPlan | null;
  reply: string | null;
  trace: ThoughtTrace;
  queries: QueryRecord[];
}

export function createWorkspace(turn: number, input: string): TurnWorkspace {
  const conclusions: Conclusion[] = [];
  return {
    turn,
    input,
    situation: null,
    person: null,
    role: null,
    disposition: null,
    context: null,
    breakdown: null,
    intent: null,
    activeContext: null,
    situationModel: null,
    conclusions,
    statementPolicy: null,
    reply: null,
    trace: { turn, input, intent: "", steps: [], conclusions, answer: "" },
    queries: [],
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
