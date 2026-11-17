/**
 * fork-semantic-object.test.ts — slice 1 (shadow objects).
 *
 * SemanticAssessment (assess.ts) renders every parsed utterance
 * as a semantic object: created in the turn loop right after the
 * parse, stored on the session as the stream's object graph, and
 * named in the trace (id + kind; the walk passes through
 * lpu/semantic-assessment). NOTHING reads the objects yet — this
 * gate pins creation, kinds, holes, grounding, stream roles and
 * the follows chain, and pins that replies are unchanged by the
 * objects' presence (the same inputs the recorded probes use).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/fork/session";
import { processTurn, type TurnResult } from "../src/fork/turn";

function run(session: Session, turns: string[]): TurnResult[] {
  return turns.map((t) => processTurn(session, t));
}

test("a statement becomes a statement object, stored and traced", () => {
  const s = newSession();
  const [r] = run(s, ["The soup is hot."]);
  assert.equal(s.objects.length, 1);
  const o = s.objects[0];
  assert.equal(o.act.kind, "statement");
  assert.equal(o.producer, "person");
  assert.equal(o.surface, "The soup is hot.");
  assert.equal(o.act.streamRole, "opens");
  assert.deepEqual(r.trace.semanticObjects, [{ id: o.id, kind: "statement" }]);
  assert.ok(r.trace.mapPath!.includes("lpu/semantic-assessment"));
  assert.equal(o.trail[0].unit, "lpu/semantic-assessment");
});

test("a polar question object carries its questioned predication as a hole", () => {
  const s = newSession();
  run(s, ["Is winter cold?"]);
  const o = s.objects[0];
  assert.equal(o.act.kind, "question");
  assert.equal(o.act.form, "interrogative");
  assert.equal(o.content.holes.length, 1);
  assert.equal(o.content.holes[0].kind, "questioned-predication");
  assert.equal(o.confidence, 1);
});

test("a wh-question object carries its questioned slot as a hole", () => {
  const s = newSession();
  run(s, ["What is in the soup?"]);
  const o = s.objects[0];
  assert.equal(o.act.kind, "question");
  assert.equal(o.content.holes.length, 1);
  const hole = o.content.holes[0];
  assert.equal(hole.kind, "questioned-slot");
  if (hole.kind === "questioned-slot") assert.equal(hole.expectedType, "entity");
});

test("the parse's discourse acts become object kinds", () => {
  const s = newSession();
  run(s, ["What about coffee?"]);
  assert.equal(s.objects[0].act.kind, "topic-proposal");
  const s2 = newSession();
  run(s2, ["Why?"]);
  assert.equal(s2.objects[0].act.kind, "reason-query");
});

test("grounding reads the prior stream: new first, established after", () => {
  const s = newSession();
  run(s, ["The soup is hot.", "Is the soup hot?"]);
  const soup1 = s.objects[0].content.grounding.find((g) => g.lemma === "soup");
  const soup2 = s.objects[1].content.grounding.find((g) => g.lemma === "soup");
  assert.equal(soup1?.status, "new");
  assert.equal(soup2?.status, "established");
});

test("stream roles: an answer follows a question; objects chain by follows", () => {
  const s = newSession();
  run(s, ["Is winter cold?", "The soup is hot.", "The bread is cold."]);
  // The stream's utterances, in order (reply objects, slice 4,
  // are stored in the same graph and are not utterances).
  const said = s.objects.filter((o) => o.producer === "person");
  assert.equal(said[0].act.streamRole, "opens");
  assert.equal(said[1].act.streamRole, "answers");
  assert.equal(said[2].act.streamRole, "continues");
  assert.equal(said[1].links.follows, said[0].id);
  assert.equal(said[2].links.follows, said[1].id);
});

test("a parse failure creates no object", () => {
  const s = newSession();
  const [r] = run(s, ["Xqzw jkvf wqzx."]);
  assert.equal(s.objects.length, 0);
  assert.equal(r.trace.semanticObjects, undefined);
  assert.ok(!r.trace.mapPath!.includes("lpu/semantic-assessment"));
});
