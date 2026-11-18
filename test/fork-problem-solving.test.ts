/**
 * fork-problem-solving.test.ts — the ProblemSolving Unit
 * placeholder (owner's commission, 2026-11-18): the seat in
 * Reasoning, the approach graphs as data, and the router.
 *
 * The transcripts are the acceptance test, as everywhere in
 * this programme: the routing counts only when the
 * annotation is on the object and the unit is on the turn's
 * map path because the router fired — not because a test
 * reached inside.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/fork/session";
import { processTurn, type TurnResult } from "../src/fork/turn";
import { PROBLEM_SOLVING_APPROACHES, PROBLEM_SOLVING_UNIT, approachById } from "../src/fork/problem-solving";

function run(session: Session, texts: string[]): TurnResult[] {
  return texts.map((t) => processTurn(session, t));
}

test("the repertoire: OODA and PDCA are registered, each as a closed cycle graph", () => {
  assert.deepEqual(
    PROBLEM_SOLVING_APPROACHES.map((a) => a.id),
    ["ooda", "pdca"],
  );
  for (const approach of PROBLEM_SOLVING_APPROACHES) {
    assert.equal(approach.edges.length, approach.steps.length, `${approach.name}: one edge per step — the cycle is closed`);
    const cycleEdges = approach.edges.filter((e) => e.kind === "cycle");
    assert.equal(cycleEdges.length, 1, `${approach.name}: exactly one cycle edge`);
    assert.equal(cycleEdges[0].from, approach.steps[approach.steps.length - 1].id);
    assert.equal(cycleEdges[0].to, approach.steps[0].id, `${approach.name}: the cycle edge returns to the first step`);
    // Every step is reachable walking sequence edges from the first.
    const seen = new Set<string>([approach.steps[0].id]);
    let frontier = approach.steps[0].id;
    for (let i = 0; i < approach.steps.length; i++) {
      const next = approach.edges.find((e) => e.from === frontier && e.kind === "sequence");
      if (next) {
        seen.add(next.to);
        frontier = next.to;
      }
    }
    assert.equal(seen.size, approach.steps.length, `${approach.name}: the sequence walk visits every step in order`);
  }
  assert.deepEqual(
    approachById("ooda")?.steps.map((s) => s.name),
    ["Observe", "Orient", "Decide", "Act"],
  );
  assert.deepEqual(
    approachById("pdca")?.steps.map((s) => s.name),
    ["Plan", "Do", "Check", "Act"],
  );
});

test("the router, assessed ground: an object carrying quantity content is routed, needs attached", () => {
  const s = newSession();
  const [r] = run(s, ["I have five apples."]);
  assert.deepEqual(r.trace.problemSolving?.needs, ["quantification"]);
  const object = s.objects.find((o) => o.turn === 1 && o.producer === "person");
  const annotation = object?.trail.find((a) => a.unit === PROBLEM_SOLVING_UNIT);
  assert.ok(annotation, "the need rides the object itself, as a trail annotation signed by the unit");
  assert.deepEqual((annotation.data as { needs?: string[] } | undefined)?.needs, ["quantification"]);
  assert.ok(r.trace.mapPath?.includes(PROBLEM_SOLVING_UNIT), "the unit is on the turn's map path because the router fired");
});

test("the router, instruction ground: a how-many question is routed as solving asked for", () => {
  const s = newSession();
  const [, ask] = run(s, ["I have five apples.", "How many apples do I have?"]);
  assert.equal(ask.reply, "You have five apples.");
  assert.deepEqual(ask.trace.problemSolving?.needs, ["quantification"]);
  assert.match(ask.trace.problemSolving?.ground ?? "", /how-many/);
  assert.ok(ask.trace.mapPath?.includes(PROBLEM_SOLVING_UNIT));
});

test("the router stands down where nothing needs solving", () => {
  const s = newSession();
  const [r] = run(s, ["The winter is cold."]);
  assert.equal(r.trace.problemSolving, undefined);
  assert.ok(!r.trace.mapPath?.includes(PROBLEM_SOLVING_UNIT));
  const object = s.objects.find((o) => o.turn === 1 && o.producer === "person");
  assert.ok(!object?.trail.some((a) => a.unit === PROBLEM_SOLVING_UNIT), "no annotation is attached");
});
