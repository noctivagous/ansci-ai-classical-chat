/**
 * problem-records.ts — the ProblemSolving Unit's first build
 * slice (design: ~/workspace/ansci-problemsolving-design.md §6;
 * phase 1 design ruled 2026-11-18, build commissioned by the
 * owner 2026-11-19 as the next build after the
 * ParamorphicConcept Unit).
 *
 * What this module holds, and nothing more:
 *
 *  - The ProblemRecord type and its session-scoped register:
 *    problem records ride the Session (`session.problems`),
 *    in memory, and nothing survives a new session (design
 *    ruling 4a — cross-conversation persistence is a later
 *    slice of its own).
 *  - Seat movement with history: a problem carries its
 *    current seat and the history of its seats, each move a
 *    recorded event with a reason — never a reclassification
 *    in place (design §3).
 *  - The need registry, extended per ruling 6a:
 *    `quantification` (registered and wired, in
 *    problem-solving.ts), `lack-of-information` (every priced
 *    decline files under it), and `how-to-proceed` (routes
 *    and records; it cannot be evaluated yet, so a problem
 *    filed under it closes for the turn as a located decline
 *    until the abstract division's hexagram instrument is
 *    built).
 *  - The decline-registration function (design §4): a pure
 *    function from a decline record to a ProblemRecord at
 *    the decline's location, plus the session helper that
 *    files it into the register.
 *
 * What this module does NOT do, by the design's seam:
 * no approach walking, no hexagram evaluation, no wiring —
 * nothing here is called from the turn loop, and this effort
 * edits neither turn.ts nor the steering or answering paths.
 * The turn-side hook that feeds real decline records to the
 * register is the wiring slice, separately commissioned.
 * The unit never speaks (ruling 1a): its outputs are the
 * typed records below; the Planner authors every reply.
 */

import type { Session } from "./session";

/* ------------------------------------------------------------------ */
/* Seats, bearers, needs                                                */
/* ------------------------------------------------------------------ */

/** The unit's six divisions (settled 2026-11-18): seats a
 *  problem moves between, not bins it is filed in. */
export type ProblemSeat =
  | "external" | "abstract" | "internal"
  | "internal-system" | "external-system" | "user-problems";

/** Whose problem it is — recorded per problem, independent
 *  of its seat. */
export type ProblemBearer = "system" | "user" | "third-party" | "the-matter-itself";

/** The need registry (design §3, ruling 6a). This is the
 *  register's vocabulary; the router's wired vocabulary in
 *  problem-solving.ts (`ProblemNeed`) names the one kind
 *  wired today and is not widened by this module. */
export type ProblemNeedKind = "quantification" | "lack-of-information" | "how-to-proceed";

export interface NeedKindEntry {
  id: ProblemNeedKind;
  gloss: string;
  /** "wired" — a solver or route exists today;
   *  "registered" — the kind is named and records file
   *  under it, but nothing evaluates it yet. */
  standing: "wired" | "registered";
}

export const NEED_KINDS: NeedKindEntry[] = [
  {
    id: "quantification",
    gloss: "The problem turns on a quantity. Registered first and wired: the router routes it (problem-solving.ts) and the quantity ledger solves it — route and record here, solve where the solver lives.",
    standing: "wired",
  },
  {
    id: "lack-of-information",
    gloss: "Something needed is not known. Every priced decline files under this kind (ruling 6a, design §4): the decline register is this kind's population.",
    standing: "registered",
  },
  {
    id: "how-to-proceed",
    gloss: "The question is how to proceed in a general situation. Routes and records; the abstract division's hexagram evaluation is its instrument and is not built, so a problem under this kind closes for its turn as a located decline (ruling 6a).",
    standing: "registered",
  },
];

export function needKind(id: string): NeedKindEntry | undefined {
  return NEED_KINDS.find((n) => n.id === id);
}

/* ------------------------------------------------------------------ */
/* The problem record                                                   */
/* ------------------------------------------------------------------ */

export type ProblemGround = "instructed" | "assessed" | "decline-registered";

export type ProblemStatus = "open" | "delegated" | "awaiting-clarification" | "declined-priced" | "closed";

export interface ProblemRecord {
  id: string;
  seat: ProblemSeat;
  seatHistory: { seat: ProblemSeat; turn: number; reason: string }[];
  bearer: ProblemBearer;
  /** What the problem is about, as the record holds it. */
  subject: string;
  need: ProblemNeedKind;
  ground: ProblemGround;
  openedTurn: number;
  status: ProblemStatus;
  /** What closed it, when it closes. */
  closingEvidence?: string;
}

/** The unit's typed outcomes (design §3) — shapes only in
 *  this slice: the Planner consumes outcomes like these
 *  when the wiring slice connects them; nothing here
 *  produces them yet. */
export type ProblemOutcome =
  | { kind: "delegated"; to: string; receipt: string }
  | { kind: "plan"; approachId: string; currentStep: string }
  | { kind: "clarification-demand"; point: string; candidates?: string[] }
  | { kind: "decline-notice"; location: string; ground: string }
  | { kind: "steering-candidate"; predication: string; derivationPath: string };

/* ------------------------------------------------------------------ */
/* The register (session-scoped)                                        */
/* ------------------------------------------------------------------ */

function nextProblemId(session: Session): string {
  return `problem-${session.problems.length + 1}`;
}

export interface OpenProblemInput {
  seat: ProblemSeat;
  bearer: ProblemBearer;
  subject: string;
  need: ProblemNeedKind;
  ground: Exclude<ProblemGround, "decline-registered">;
  turn: number;
  /** Why the problem opens at this seat — the first entry
   *  of its seat history. */
  reason: string;
}

/**
 * Open a problem in the session's register. A
 * `how-to-proceed` problem opens already closed for its
 * turn, at `declined-priced` (ruling 6a): the instrument
 * that would evaluate it is not built, and the record
 * says so rather than standing open as if it were being
 * worked.
 */
export function openProblem(session: Session, input: OpenProblemInput): ProblemRecord {
  const record: ProblemRecord = {
    id: nextProblemId(session),
    seat: input.seat,
    seatHistory: [{ seat: input.seat, turn: input.turn, reason: input.reason }],
    bearer: input.bearer,
    subject: input.subject,
    need: input.need,
    ground: input.ground,
    openedTurn: input.turn,
    status: input.need === "how-to-proceed" ? "declined-priced" : "open",
    ...(input.need === "how-to-proceed"
      ? { closingEvidence: "closed for the turn as a located decline: the abstract division's hexagram evaluation is not built (design §7)" }
      : {}),
  };
  session.problems.push(record);
  return record;
}

/**
 * Move a problem to a new seat, with the reason recorded.
 * Movement is an event in the record's history, never a
 * reclassification in place — the history is the record
 * (design §3).
 */
export function moveProblem(session: Session, id: string, to: ProblemSeat, reason: string, turn: number): ProblemRecord | undefined {
  const record = session.problems.find((p) => p.id === id);
  if (!record) return undefined;
  record.seat = to;
  record.seatHistory.push({ seat: to, turn, reason });
  return record;
}

/** The one standing route of record (design §3): the
 *  user's problems feed back to Internal, where solving
 *  is taken up. Further movement rules are registered per
 *  slice, not improvised. */
export const STANDING_ROUTE_USER_TO_INTERNAL: { from: ProblemSeat; to: ProblemSeat; reason: string } = {
  from: "user-problems",
  to: "internal",
  reason: "the standing route: the user's problems feed back to Internal, where solving is taken up",
};

/** Move a problem along the standing route, when it stands
 *  at the route's seat. Returns the record, or undefined
 *  when the problem is not at the route's seat (the route
 *  does not reach for problems standing elsewhere). */
export function moveAlongStandingRoute(session: Session, id: string, turn: number): ProblemRecord | undefined {
  const record = session.problems.find((p) => p.id === id);
  if (!record || record.seat !== STANDING_ROUTE_USER_TO_INTERNAL.from) return undefined;
  return moveProblem(session, id, STANDING_ROUTE_USER_TO_INTERNAL.to, STANDING_ROUTE_USER_TO_INTERNAL.reason, turn);
}

/** Close a problem, with the evidence that closed it. */
export function closeProblem(session: Session, id: string, closingEvidence: string): ProblemRecord | undefined {
  const record = session.problems.find((p) => p.id === id);
  if (!record) return undefined;
  record.status = "closed";
  record.closingEvidence = closingEvidence;
  return record;
}

/** The register's open problems — the work list later
 *  slices (the wiring slice; rung 3's clarification
 *  dialogues) draw on. Nothing in this slice acts on it
 *  beyond keeping it (design §4). */
export function openProblems(session: Session): ProblemRecord[] {
  return session.problems.filter((p) => p.status === "open");
}

/* ------------------------------------------------------------------ */
/* The decline register (design §4)                                     */
/* ------------------------------------------------------------------ */

/** A decline, in the shape the planner's outcome already
 *  carries (plan.ts: the "declined" PlanOutcome) — taken
 *  structurally, so this function stays pure and imports
 *  nothing from the answering paths. */
export interface DeclineRecordLike {
  /** The decline's ground, with its numbers. */
  ground: string;
  /** The derivation path the decline stands on — its location. */
  derivationPath: string;
}

/**
 * The decline-registration function: a priced decline, as
 * a ProblemRecord. Pure — the same decline and the same
 * filing facts always produce the same record.
 *
 * Per design §4: seat `internal` (a decline is an internal
 * problem surfaced at its location), need
 * `lack-of-information`, ground `decline-registered`, the
 * subject from the decline's own ground, and the location
 * kept in the record's opening seat-history entry, from
 * the decline's derivation path. The record's status is
 * `declined-priced`: the decline already happened and was
 * priced by the floor; the register keeps it as a standing
 * problem, it does not re-open the turn's answer.
 */
export function problemRecordFromDecline(
  decline: DeclineRecordLike,
  filing: { id: string; turn: number },
): ProblemRecord {
  return {
    id: filing.id,
    seat: "internal",
    seatHistory: [
      {
        seat: "internal",
        turn: filing.turn,
        reason: `registered from a priced decline at its location: ${decline.derivationPath}`,
      },
    ],
    bearer: "system",
    subject: decline.ground,
    need: "lack-of-information",
    ground: "decline-registered",
    openedTurn: filing.turn,
    status: "declined-priced",
  };
}

/** File a decline into the session's register — the
 *  session-side companion of the pure function above.
 *  This is the register the wiring slice will feed from
 *  the turn loop when it is commissioned; in this slice
 *  nothing calls it from the turn. */
export function registerDecline(session: Session, decline: DeclineRecordLike, turn: number): ProblemRecord {
  const record = problemRecordFromDecline(decline, { id: nextProblemId(session), turn });
  session.problems.push(record);
  return record;
}
