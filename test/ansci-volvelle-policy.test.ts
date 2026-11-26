/**
 * ansci-volvelle-policy.test.ts — the volvelle build, slice 2:
 * the Response Policy (response-policy.ts).
 *
 * The policy is the one place that decides, for an assessed
 * utterance, what KIND of reply the system makes — the choice
 * that used to be scattered through the turn loop. Pinned here:
 * every row of the policy table at the unit level (the decision
 * for representative assessed objects, with the premise rows
 * checked against Coherence's own premise reading — winter is
 * cold in the graph, hot contradicts it, and nothing settles
 * soup/purple), and the wiring in the turn loop: the decision
 * is recorded on the trace and on the inbound object's trail
 * for every turn that reaches the decision point, and the
 * ritual branches (greeting, thanks) author their reply
 * objects under the decision.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { parse } from "../src/ansci/parse";
import { assessUtterance } from "../src/ansci/assess";
import { openClarification, openStanceRepair } from "../src/ansci/social";
import { decideResponse, recordDecision, recordedDecision } from "../src/ansci/response-policy";
import type { SemanticObject } from "../src/ansci/semantic-object";

function assessed(session: Session, surface: string, turn = 9): SemanticObject {
  return assessUtterance(parse(surface, "en"), { turn, surface, session })[0];
}

/* ---------------- the policy table, row by row ---------------- */

test("question → answer; reason-query → answer", () => {
  const s = newSession();
  assert.equal(decideResponse({ object: assessed(s, "Is the soup hot?"), session: s }).act, "answer");
  assert.equal(decideResponse({ object: assessed(s, "Why is the soup hot?"), session: s }).act, "answer");
});

test("proposition → affirm when support stands, correct when contradicted, decline at the gap when nothing settles it", () => {
  const s = newSession();
  const prop = assessed(s, "What about coffee?");
  assert.equal(prop.act.speechAct, "proposition");
  const affirmed = decideResponse({ object: prop, session: s, premise: { subject: "winter", quality: "cold" } });
  assert.equal(affirmed.act, "affirm");
  assert.equal(affirmed.basis.premise, "supported");
  const corrected = decideResponse({ object: prop, session: s, premise: { subject: "winter", quality: "hot" } });
  assert.equal(corrected.act, "correct");
  assert.equal(corrected.basis.premise, "contradiction");
  const declined = decideResponse({ object: prop, session: s, premise: { subject: "soup", quality: "purple" } });
  assert.equal(declined.act, "decline");
  assert.equal(declined.basis.premise, "absence");
  assert.match(declined.ground, /nothing established settles/);
});

test("a question carrying a contradicted premise → correct, not answer", () => {
  const s = newSession();
  const q = assessed(s, "Why is winter cold?");
  const d = decideResponse({ object: q, session: s, premise: { subject: "winter", quality: "hot" } });
  assert.equal(d.act, "correct");
});

test("statement → store-acknowledge; a hedged statement is stored as tentative", () => {
  const s = newSession();
  assert.equal(decideResponse({ object: assessed(s, "The soup is hot."), session: s }).act, "store-acknowledge");
  const hedged = decideResponse({ object: assessed(s, "I think the soup is hot."), session: s });
  assert.equal(hedged.act, "store-acknowledge");
  assert.match(hedged.ground, /tentative/);
});

test("concern → uptake-acknowledge", () => {
  const s = newSession();
  assert.equal(decideResponse({ object: assessed(s, "I am sad."), session: s }).act, "uptake-acknowledge");
  assert.equal(decideResponse({ object: assessed(s, "I feel sad."), session: s }).act, "uptake-acknowledge");
});

test("greeting / thanks / leave-taking / offer → ritual-return", () => {
  const s = newSession();
  for (const surface of ["Hello.", "Thank you.", "Goodbye.", "Can I help you?"]) {
    assert.equal(decideResponse({ object: assessed(s, surface), session: s }).act, "ritual-return", surface);
  }
});

test("self-query → self-answer", () => {
  const s = newSession();
  assert.equal(decideResponse({ object: assessed(s, "Who are you?"), session: s }).act, "self-answer");
});

test("directive → decline, located at capability", () => {
  const s = newSession();
  const d = decideResponse({ object: assessed(s, "Bring me the book."), session: s });
  assert.equal(d.act, "decline");
  assert.match(d.ground, /capability/);
});

test("an unfilled role, or a surviving placement need → ask-after-gap", () => {
  const s = newSession();
  const o = assessed(s, "The soup is hot.");
  assert.equal(decideResponse({ object: o, session: s, gap: { verb: "give", role: "recipient" } }).act, "ask-after-gap");
  assert.equal(
    decideResponse({
      object: o,
      session: s,
      needs: [{ kind: "placement", slot: "the fountain's place", discharge: "a stated or placed location", status: "surviving" }],
    }).act,
    "ask-after-gap",
  );
});

test("a clarification standing open → clarify, its own row, never a decline", () => {
  const s = newSession();
  openClarification(s, { openedBy: "turn:1", point: "token:'xyz'", question: "Could you put that another way?" });
  const d = decideResponse({ object: assessed(s, "The soup is hot."), session: s });
  assert.equal(d.act, "clarify");
  assert.equal(d.basis.pending, "clarification");
});

test("a stance-repair standing open → correct, holding the established ground", () => {
  const s = newSession();
  openStanceRepair(s, {
    openedBy: "turn:1",
    premise: { subject: "winter", quality: "hot", established: "winter is cold", source: "graph" },
  });
  const d = decideResponse({ object: assessed(s, "The soup is hot."), session: s });
  assert.equal(d.act, "correct");
  assert.equal(d.basis.pending, "stance-repair");
});

test("recordDecision writes the decision on the object's trail, and recordedDecision reads it back", () => {
  const s = newSession();
  const o = assessed(s, "Is the soup hot?");
  const d = decideResponse({ object: o, session: s });
  recordDecision(o, d);
  const back = recordedDecision(o);
  assert.equal(back?.act, "answer");
  const note = o.trail[o.trail.length - 1];
  assert.equal(note.unit, "reasoning/response-policy");
});

/* ---------------- the wiring in the turn loop ---------------- */

test("the loop records the decision on the trace and the object's trail", () => {
  const s = newSession();
  const r1 = processTurn(s, "The soup is hot.");
  assert.equal(r1.trace.responsePolicy?.act, "store-acknowledge");
  const person = s.objects.find((o) => o.producer === "person");
  assert.ok(person?.trail.some((t) => t.unit === "reasoning/response-policy"));
  const r2 = processTurn(s, "Is the soup hot?");
  assert.equal(r2.trace.responsePolicy?.act, "answer");
  const r3 = processTurn(s, "I am sad.");
  assert.equal(r3.trace.responsePolicy?.act, "uptake-acknowledge");
});

test("the directive row is routed: a directive gets the located decline at capability, not the plain acknowledgement", () => {
  const s = newSession();
  const r = processTurn(s, "Bring me the book.");
  // The decision recorded for the turn is the decline, and the
  // reply IS that decline: the limit stated from the
  // Capabilities & limits table, located at capability.
  assert.equal(r.trace.responsePolicy?.act, "decline");
  assert.match(r.trace.declineReason ?? "", /capability/);
  assert.notEqual(r.reply, "Ok.");
  assert.match(r.reply, /^I can't do that: /);
  assert.match(r.reply, /cannot fetch or do things outside this conversation/);
  // Nothing is recorded as done: no system reply object claims
  // the act, and the turn after it is read as its own turn.
  const after = processTurn(s, "The soup is hot.");
  assert.equal(after.trace.responsePolicy?.act, "store-acknowledge");
  assert.equal(after.reply, "Ok. The soup is hot.");
});

test("the routing leaves telling-requests untouched: a request is a different act", () => {
  const s = newSession();
  const r = processTurn(s, "Tell me about the garden.");
  assert.equal(r.trace.responsePolicy?.act, "answer");
  assert.equal(r.reply, "Ok. Noted.");
});

test("the ritual branches execute through the decision, and their reply objects carry it", () => {
  const s = newSession();
  const g = processTurn(s, "Hello.");
  assert.equal(g.trace.responsePolicy?.act, "ritual-return");
  const greetingReply = s.objects.find((o) => o.producer === "system");
  assert.ok(greetingReply, "the greeting authored a reply object");
  const carried = recordedDecision(greetingReply);
  assert.equal(carried?.act, "ritual-return");

  const t = processTurn(s, "Thank you.");
  assert.equal(t.trace.responsePolicy?.act, "ritual-return");
  const thanksReply = [...s.objects].reverse().find((o) => o.producer === "system");
  assert.equal(recordedDecision(thanksReply!)?.act, "ritual-return");

  const f = processTurn(s, "Goodbye.");
  assert.equal(f.trace.responsePolicy?.act, "ritual-return");
});
