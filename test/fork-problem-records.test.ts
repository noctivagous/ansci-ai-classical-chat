/**
 * fork-problem-records.test.ts — the ProblemSolving Unit's
 * first build slice (design §6; phase 1 design ruled
 * 2026-11-18, build commissioned 2026-11-19): the problem
 * record and its session-scoped register, seat movement
 * with history, the extended need registry, and the
 * decline-registration function.
 *
 * The slice is deliberately unwired — nothing in the turn
 * loop calls it — so these tests work the module directly,
 * the way its own tests should: the record's shape, the
 * register's discipline, and the session scope are what is
 * pinned. Wiring behaviour gets its tests with the wiring
 * slice.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/fork/session";
import {
  NEED_KINDS,
  STANDING_ROUTE_USER_TO_INTERNAL,
  closeProblem,
  moveAlongStandingRoute,
  moveProblem,
  needKind,
  openProblem,
  openProblems,
  problemRecordFromDecline,
  registerDecline,
} from "../src/fork/problem-records";

test("the need registry: three kinds — quantification wired, the two ruling-6a kinds registered", () => {
  assert.deepEqual(
    NEED_KINDS.map((n) => n.id),
    ["quantification", "lack-of-information", "how-to-proceed"],
  );
  assert.equal(needKind("quantification")?.standing, "wired");
  assert.equal(needKind("lack-of-information")?.standing, "registered");
  assert.equal(needKind("how-to-proceed")?.standing, "registered");
  assert.equal(needKind("hexagram-evaluation"), undefined);
});

test("opening a problem: the record carries seat, bearer, need, ground — and its seat history opens with it", () => {
  const s = newSession();
  const p = openProblem(s, {
    seat: "user-problems",
    bearer: "user",
    subject: "how many apples remain",
    need: "quantification",
    ground: "instructed",
    turn: 2,
    reason: "opened at the intake seat: the person's own problem, stated by them",
  });
  assert.equal(p.id, "problem-1");
  assert.equal(p.seat, "user-problems");
  assert.equal(p.bearer, "user");
  assert.equal(p.status, "open");
  assert.equal(p.openedTurn, 2);
  assert.deepEqual(p.seatHistory, [
    { seat: "user-problems", turn: 2, reason: "opened at the intake seat: the person's own problem, stated by them" },
  ]);
  assert.deepEqual(s.problems, [p], "the record rides the session register");
  assert.deepEqual(openProblems(s), [p]);
});

test("seat movement is a recorded event with its reason — the history is the record", () => {
  const s = newSession();
  const p = openProblem(s, {
    seat: "external", bearer: "the-matter-itself", subject: "the bridge's load",
    need: "quantification", ground: "assessed", turn: 1, reason: "a problem in the encountered world",
  });
  const moved = moveProblem(s, p.id, "internal", "taken up for solving", 3);
  assert.equal(moved?.seat, "internal");
  assert.equal(moved?.seatHistory.length, 2);
  assert.deepEqual(moved?.seatHistory[1], { seat: "internal", turn: 3, reason: "taken up for solving" });
  assert.equal(moveProblem(s, "problem-99", "internal", "no such problem", 3), undefined);
});

test("the standing route moves a user's problem to Internal, and reaches for nothing else", () => {
  const s = newSession();
  const mine = openProblem(s, {
    seat: "user-problems", bearer: "user", subject: "a stuck tap",
    need: "how-to-proceed", ground: "instructed", turn: 1, reason: "the person's problem, at intake",
  });
  // how-to-proceed closed for its turn on opening; the route still moves its seat.
  const routed = moveAlongStandingRoute(s, mine.id, 2);
  assert.equal(routed?.seat, STANDING_ROUTE_USER_TO_INTERNAL.to);
  assert.match(routed?.seatHistory[1].reason ?? "", /standing route/);

  const other = openProblem(s, {
    seat: "external", bearer: "third-party", subject: "a story's problem",
    need: "quantification", ground: "assessed", turn: 2, reason: "standing in the encountered world",
  });
  assert.equal(moveAlongStandingRoute(s, other.id, 3), undefined, "the route does not reach for problems standing elsewhere");
  assert.equal(other.seat, "external");
});

test("a how-to-proceed problem closes for its turn as declined-priced, with the reason on the record", () => {
  const s = newSession();
  const p = openProblem(s, {
    seat: "abstract", bearer: "user", subject: "how to proceed with the letter",
    need: "how-to-proceed", ground: "instructed", turn: 1, reason: "a general how-to-proceed question",
  });
  assert.equal(p.status, "declined-priced");
  assert.match(p.closingEvidence ?? "", /hexagram evaluation is not built/);
  assert.deepEqual(openProblems(s), [], "it does not stand open as if it were being worked");
});

test("the decline register: a priced decline files as an internal lack-of-information problem at its location", () => {
  const decline = {
    ground: "support 0.31 below the floor 0.40 at the weakest tier (derived)",
    derivationPath: "winter → cold (classification) → Water",
  };
  const record = problemRecordFromDecline(decline, { id: "problem-1", turn: 4 });
  assert.equal(record.seat, "internal");
  assert.equal(record.need, "lack-of-information");
  assert.equal(record.ground, "decline-registered");
  assert.equal(record.bearer, "system");
  assert.equal(record.subject, decline.ground, "the subject is the decline's own ground");
  assert.equal(record.status, "declined-priced");
  assert.match(record.seatHistory[0].reason, /winter → cold/, "the location is the decline's derivation path");
  // Purity: the same decline and filing facts produce the same record.
  assert.deepEqual(problemRecordFromDecline(decline, { id: "problem-1", turn: 4 }), record);
});

test("registerDecline files into the session, ids in order, beside other problems", () => {
  const s = newSession();
  openProblem(s, {
    seat: "external", bearer: "the-matter-itself", subject: "a quantity in a story",
    need: "quantification", ground: "assessed", turn: 1, reason: "assessed from the object",
  });
  const filed = registerDecline(s, { ground: "no classification for the asked quality", derivationPath: "kettle → (no anchor)" }, 2);
  assert.equal(filed.id, "problem-2");
  assert.equal(s.problems.length, 2);
  assert.deepEqual(openProblems(s).map((p) => p.id), ["problem-1"], "the filed decline is kept, not open");
});

test("closing a problem records what closed it", () => {
  const s = newSession();
  const p = openProblem(s, {
    seat: "internal", bearer: "system", subject: "a missing classification",
    need: "lack-of-information", ground: "assessed", turn: 1, reason: "an internal gap, surfaced",
  });
  const closed = closeProblem(s, p.id, "the interlocutor supplied the missing piece in clarification");
  assert.equal(closed?.status, "closed");
  assert.equal(closed?.closingEvidence, "the interlocutor supplied the missing piece in clarification");
  assert.deepEqual(openProblems(s), []);
});

test("session scope: a new session's register is empty — nothing persists (ruling 4a)", () => {
  const s = newSession();
  registerDecline(s, { ground: "g", derivationPath: "p" }, 1);
  assert.equal(s.problems.length, 1);
  const fresh = newSession();
  assert.deepEqual(fresh.problems, []);
});
