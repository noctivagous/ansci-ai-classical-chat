/**
 * ansci-decline-register-wiring.test.ts — the lack-machinery
 * slice, Part C (owner's commission, 2026-11-20): the
 * decline wiring. processTurn files a problem record for
 * every turn that ends in a decline — design §4, rulings
 * 2a + 6a, made live at the single point in the turn's
 * wrapper after the outcome is decided.
 *
 * What is pinned: a declined turn leaves exactly one
 * record, at the decline's location, under
 * lack-of-information; a turn that answers (or asks back)
 * leaves none; the filing is purely additive — the reply
 * text is the turn's standing text, unchanged.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";

test("a declined turn files one problem record at the decline's location", () => {
  const s = newSession();
  const r = processTurn(s, "Is a table cold?");
  assert.ok(r.trace.declineReason, "the turn declines (its standing behaviour)");
  assert.equal(s.problems.length, 1);
  const p = s.problems[0];
  assert.equal(p.id, "problem-1");
  assert.equal(p.seat, "internal", "a decline is an internal problem surfaced at its location");
  assert.equal(p.need, "lack-of-information", "every priced decline files under lack-of-information (ruling 6a)");
  assert.equal(p.ground, "decline-registered");
  assert.equal(p.bearer, "system");
  assert.equal(p.status, "declined-priced", "the decline already happened and was priced; the register keeps it, it does not re-open the answer");
  assert.equal(p.subject, r.trace.declineReason, "the subject is the decline's own ground, verbatim");
  assert.equal(p.openedTurn, s.turnCount);
  assert.equal(p.seatHistory.length, 1);
  assert.match(
    p.seatHistory[0].reason,
    /ontology-core\/ontology-knowledge-unit\/correspondence-graph/,
    "the location is the turn's map path, ending where the walk stopped",
  );
});

test("the filing is purely additive: the decline's reply text is the standing text", () => {
  const s = newSession();
  const r = processTurn(s, "what is atlantis?");
  assert.equal(
    r.reply,
    "I can't answer that from what I know: I have nothing on atlantis in my notes, and I have no way to connect anything to 'what'.",
    "the reply the turn has always given — the wiring changed no wording",
  );
  assert.equal(s.problems.length, 1);
  assert.match(s.problems[0].subject, /nothing on atlantis/);
});

test("an answered turn files nothing", () => {
  const s = newSession();
  const r = processTurn(s, "what is paris?");
  assert.equal(r.trace.declineReason, undefined, "the turn answers");
  assert.deepEqual(s.problems, []);
});

test("a turn that asks back instead of declining files nothing", () => {
  const s = newSession();
  const r = processTurn(s, "Is the table cold?");
  assert.equal(r.trace.declineReason, undefined, "the turn asks after its referent — no decline");
  assert.deepEqual(s.problems, []);
});

test("declines accumulate across a session — the register is a work list, not a per-turn note", () => {
  const s = newSession();
  processTurn(s, "Is a table cold?");
  processTurn(s, "what is paris?");
  processTurn(s, "what is atlantis?");
  assert.deepEqual(s.problems.map((p) => p.id), ["problem-1", "problem-2"]);
  assert.deepEqual(s.problems.map((p) => p.openedTurn), [1, 3], "filed at their own turns; the answered turn between them filed nothing");
});
