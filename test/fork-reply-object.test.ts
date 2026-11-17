/**
 * fork-reply-object.test.ts — slice 4 (reply objects).
 *
 * Where the Planner composes a reply from a graph, it also
 * authors the reply as a semantic object (reply.ts): producer
 * "system", stored in the stream's object graph, linked to the
 * object it answers, and judged outbound by CoherenceAnalysis
 * (grounding, and composition against the situation) before the
 * wording is spoken. Hand-worded replies (the probe's steering
 * strings) get no reply object — the boundary is pinned here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/fork/session";
import { processTurn, type TurnResult } from "../src/fork/turn";

function run(session: Session, turns: string[]): TurnResult[] {
  return turns.map((t) => processTurn(session, t));
}

test("a planner-composed reply is authored as a reply object and judged outbound", () => {
  const s = newSession();
  const [r] = run(s, ["I gave him."]);
  assert.ok(r.trace.replyObject, "the trace names the reply object");
  const reply = s.objects.find((o) => o.producer === "system");
  assert.ok(reply);
  assert.equal(reply!.id, r.trace.replyObject!.id);
  assert.equal(reply!.act.kind, "reply");
  assert.equal(reply!.act.force, "valency gap question");
  assert.equal(reply!.links.follows, s.objects[0].id); // answers the utterance's object
  assert.ok(reply!.trail.some((a) => a.unit === "reasoning/planner"));
  assert.ok(reply!.trail.some((a) => a.unit === "coherence/coherence-analysis" && a.data?.fit === "outbound-grounding"));
});

test("the greeting's mirror is a reply object answering the greeting object", () => {
  const s = newSession();
  const [r] = run(s, ["Hello."]);
  assert.equal(r.reply, "Hello.");
  const reply = s.objects.find((o) => o.producer === "system");
  assert.ok(reply);
  assert.equal(reply!.act.force, "return greeting");
  assert.equal(reply!.act.ritual, true);
  assert.equal(reply!.links.follows, s.objects[0].id);
});

test("a derived predication answer is a reply object too", () => {
  const s = newSession();
  const [r] = run(s, ["Is winter cold?"]);
  assert.ok(r.trace.replyObject);
  const reply = s.objects.find((o) => o.producer === "system");
  assert.equal(reply?.act.force, "composition"); // a season question is answered by the composition site
  assert.equal(reply?.act.streamRole, "answers");
});

test("a hand-worded reply gets no reply object — the stated boundary", () => {
  const s = newSession();
  const [r] = run(s, ["The soup is hot."]);
  assert.equal(r.trace.wordingNotDerived, true);
  assert.equal(r.trace.replyObject, undefined);
  assert.ok(!s.objects.some((o) => o.producer === "system"));
});

test("reply objects in the stream do not disturb the utterances' stream roles", () => {
  const s = newSession();
  run(s, ["Is winter cold?", "The soup is hot."]);
  const statement = s.objects.filter((o) => o.producer === "person")[1];
  assert.equal(statement.act.streamRole, "answers");
});
