/**
 * fork-coherence.test.ts — slice 2 (the first readers).
 *
 * CoherenceAnalysis (coherence.ts) reads each fresh semantic
 * object against the prior stream and annotates its trail; the
 * Planner reads objects at two designed decision points:
 *  - the opening greeting is answered with its mirror, generated
 *    from the object's own graph ("Hello." → "Hello.");
 *  - a feeling stated as the first utterance, its cause
 *    unexpressed and the situation unknown, raises the demand
 *    the Planner answers by asking after the cause ("I was
 *    furious." → "Furious about what?") — the owner's worked
 *    example (docs/coherence-note.md).
 * Mid-stream, neither reading fires: the steering behaviour the
 * reply-planning programme pinned stands unchanged.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/fork/session";
import { processTurn, type TurnResult } from "../src/fork/turn";

function run(session: Session, turns: string[]): TurnResult[] {
  return turns.map((t) => processTurn(session, t));
}

test("the opening greeting is assessed as a greeting and answered with its mirror", () => {
  const s = newSession();
  const [r] = run(s, ["Hello."]);
  const o = s.objects[0];
  assert.equal(o.act.kind, "greeting");
  assert.equal(o.act.ritual, true);
  assert.equal(r.reply, "Hello.");
  assert.ok(o.trail.some((a) => a.unit === "coherence/coherence-analysis" && a.data?.fit === "opening"));
  // The planner's reading is recorded on the reply object it
  // authored (slice 4), not on the greeting object itself.
  const replyObject = s.objects.find((x) => x.producer === "system");
  assert.ok(replyObject?.trail.some((a) => a.unit === "reasoning/planner"));
  assert.ok(r.trace.mapPath!.includes("coherence/coherence-analysis"));
  assert.ok(r.trace.mapPath!.includes("lpu/semantic-assessment"));
  assert.equal(r.trace.mapPath!.at(-1), "verbalizer");
});

test("the mirror keeps the register the person chose", () => {
  const s = newSession();
  const [r] = run(s, ["Hi."]);
  assert.equal(r.reply, "Hi.");
});

test("a greeting asked as a question is recorded as a presence check in form", () => {
  const s = newSession();
  run(s, ["Hello?"]);
  assert.equal(s.objects[0].act.kind, "greeting");
  assert.equal(s.objects[0].act.form, "interrogative");
});

test("a repeated greeting draws the opener-out-of-place demand (annotation only)", () => {
  const s = newSession();
  run(s, ["Hello.", "The soup is hot.", "Hello."]);
  const second = s.objects.filter((o) => o.producer === "person").at(-1)!;
  assert.equal(second.act.kind, "greeting");
  assert.ok(second.trail.some((a) => a.data?.demand === "opener-out-of-place"));
});

test("a feeling stated first, cause unexpressed: the planner asks after the cause", () => {
  const s = newSession();
  const [r] = run(s, ["I was furious."]);
  assert.equal(r.reply, "Furious about what?");
  const o = s.objects[0];
  assert.ok(o.content.holes.some((h) => h.kind === "unexpressed-cause"));
  assert.ok(o.trail.some((a) => a.data?.demand === "unexpressed-cause"));
  assert.ok(o.trail.some((a) => a.unit === "reasoning/planner"));
  // The state itself stands recorded — only the reply changed hands.
  assert.ok(s.states.some((st) => st.lemma === "furious"));
  assert.ok(r.trace.mapPath!.includes("coherence/coherence-analysis"));
});

test("the same feeling mid-stream keeps the steering reply — no demand fires", () => {
  const s = newSession();
  const rs = run(s, ["I heard the news.", "I was furious."]);
  assert.equal(rs[1].reply, "You were furious when you heard the news. What did you say when you heard the news?");
  assert.ok(!s.objects[1].trail.some((a) => a.data?.demand === "unexpressed-cause"));
});

test("a non-emotion opening statement draws no coherence reading", () => {
  const s = newSession();
  const [r] = run(s, ["The soup is hot."]);
  assert.equal(r.trace.coherence, undefined);
  assert.ok(!r.trace.mapPath!.includes("coherence/coherence-analysis"));
});
