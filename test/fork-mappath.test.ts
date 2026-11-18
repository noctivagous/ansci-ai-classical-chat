/**
 * fork-mappath.test.ts — the schematic correspondence gate.
 *
 * The turn loop now reports, on every trace, the walk of
 * schematic node ids the turn actually took (trace.mapPath,
 * computed in processTurn from the trace's own evidence). The
 * root page's map walks exactly that list, so the map and the
 * code correspond only if every id the engine can emit exists
 * in the registry (ai-system/system-map.ts) and the walks end
 * where the turn actually stopped. This test pins both: the
 * registry membership of every emitted id, and the endpoints
 * of the turn shapes the probes established — a parse failure
 * stops inside the Parser, a knowledge-gap decline ends at the
 * correspondence graph it searched, a missing-role decline
 * ends at the session record, and spoken replies end at the
 * Verbalizer (through the Generator only when the planner
 * built the reply).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { newSession, type Session } from "../src/fork/session";
import { processTurn, type TurnResult } from "../src/fork/turn";

const REGISTRY = readFileSync(join(__dirname, "../../ai-system/system-map.ts"), "utf8");
const NODE_IDS = new Set([...REGISTRY.matchAll(/"id":\s*"([^"]+)"/g)].map((m) => m[1]));

function run(session: Session, turns: string[]): TurnResult[] {
  return turns.map((t) => processTurn(session, t));
}

function assertWalkShape(result: TurnResult): void {
  const path = result.trace.mapPath;
  assert.ok(path && path.length >= 2, "every turn carries a mapPath of at least two steps");
  assert.equal(path[0], "person", "every walk starts at the person");
  for (const id of path) {
    assert.ok(NODE_IDS.has(id), `mapPath id '${id}' exists in ai-system/system-map.ts`);
  }
  for (let i = 1; i < path.length; i++) {
    assert.notEqual(path[i], path[i - 1], "a walk never names the same node twice in a row");
  }
}

test("parse failure: the walk stops inside the Parser, naming no submodule", () => {
  // The probe sentence must be one the token layer cannot rescue:
  // "Blorp zizzle frak." served until token resolution landed —
  // its words are each close to a real word and now resolve (the
  // records are pinned in fork-tokenresolve.test.ts). These three
  // have no candidates at all, so the failure is the sentence
  // layer's own.
  const [r] = run(newSession(), ["Xqzw jkvf wqzx."]);
  assert.equal(r.trace.parseSummary, "parse failed");
  assert.deepEqual(r.trace.mapPath, ["person", "lpu/parser"]);
});

test("a plain statement: parser, record, and out through the Verbalizer", () => {
  const [r] = run(newSession(), ["Hello."]);
  assertWalkShape(r);
  assert.equal(r.trace.mapPath![r.trace.mapPath!.length - 1], "verbalizer");
  assert.ok(!r.trace.mapPath!.includes("reasoning/derivation"), "nothing was derived");
});

test("cycle steering: derivation and pricing run; the hand-worded reply skips the Generator", () => {
  const [, t2] = run(newSession(), ["I heard the news.", "I was furious."]);
  assertWalkShape(t2);
  const p = t2.trace.mapPath!;
  assert.ok(p.includes("awareness"), "the disposition frame is consulted");
  assert.ok(p.includes("reasoning/derivation"));
  assert.ok(p.includes("reasoning/pricing"));
  assert.ok(!p.includes("lpu/generator"), "steering wording is the probe's, not generated");
  assert.equal(p[p.length - 1], "verbalizer");
});

test("a planner-built answer passes the Planner and the Generator", () => {
  // RE-PIN (the Normalcy arc, Part 3b): the scenario was "Is
  // winter cold?" — a classifying question, now answered by
  // the definitional route (hand-worded; its path is pinned in
  // fork-normalcy.test.ts). The planner-built pin moves to the
  // salt derivation, which still runs derivation → pricing →
  // Planner → Generator.
  const [r] = run(newSession(), ["Is the salt cold?"]);
  assertWalkShape(r);
  const p = r.trace.mapPath!;
  assert.ok(p.includes("reasoning/planner"));
  assert.ok(p.includes("lpu/generator"));
  assert.equal(p[p.length - 1], "verbalizer");
});

test("a knowledge-gap decline ends at the correspondence graph it searched", () => {
  // RE-PIN (the Normalcy arc, Part 3d ii): the scenario was
  // "Is the table cold?" — the definite cold open no longer
  // declines; the unanchored-definite move asks after the
  // referent (next test). The indefinite form keeps the
  // decline's ground exactly.
  const [r] = run(newSession(), ["Is a table cold?"]);
  assertWalkShape(r);
  assert.ok(r.trace.declineReason);
  // The graph moved into the Ontology Knowledge Unit in the OntologyCore
  // (owner's direction, 2026-11-16); the walk ends at its new address.
  assert.equal(r.trace.mapPath![r.trace.mapPath!.length - 1], "ontology-core/ontology-knowledge-unit/correspondence-graph");
});

test("an unanchored definite asks after its referent — no decline, no derivation", () => {
  const [r] = run(newSession(), ["Is the table cold?"]);
  assertWalkShape(r);
  assert.equal(r.trace.declineReason, undefined, "the turn asks back instead of declining");
  assert.equal(r.trace.unanchoredDefinite?.lemma, "table");
  const p = r.trace.mapPath!;
  assert.ok(!p.includes("reasoning/derivation"), "nothing was derived");
  assert.equal(p[p.length - 1], "verbalizer");
});

test("a missing-role decline ends at the session record — nothing further ran", () => {
  const [r] = run(newSession(), ["What was put in the soup?"]);
  assertWalkShape(r);
  assert.ok(r.trace.declineReason);
  assert.equal(r.trace.mapPath![r.trace.mapPath!.length - 1], "session-and-situation");
});

test("a valency gap question is planner-built and generated", () => {
  const [r] = run(newSession(), ["I gave him."]);
  assertWalkShape(r);
  assert.ok(r.trace.gapQuestion, "the gap question fired");
  const p = r.trace.mapPath!;
  assert.ok(p.includes("reasoning/planner"));
  assert.ok(p.includes("lpu/generator"));
  assert.equal(p[p.length - 1], "verbalizer");
});

test("a record answer goes from the record through the Planner — no derivation", () => {
  // RE-PIN (the Normalcy arc, Part 3a): the soup pair's second
  // turn is the said-so case now (the speaker stated the asked
  // predication) — its route is pinned in the next test. This
  // pin keeps the R7.5 record-graph route with a scenario
  // that still takes it: the standing occupant (hot) is not
  // the asked quality (cold), so the record graph predicates
  // the occupant.
  const [, t2] = run(newSession(), ["The soup is hot.", "Is the soup cold?"]);
  assertWalkShape(t2);
  assert.ok(t2.trace.answeredFromRecord, "the second turn answered from the record");
  const p = t2.trace.mapPath!;
  assert.ok(!p.includes("reasoning/derivation"), "a record answer is not a derivation");
  assert.ok(p.indexOf("reasoning/planner") > p.indexOf("session-and-situation"));
  assert.equal(p[p.length - 1], "verbalizer");
});

test("the said-so record answer passes NormalcyAssessment — no Planner, no derivation", () => {
  const [, t2] = run(newSession(), ["The soup is hot.", "Is the soup hot?"]);
  assertWalkShape(t2);
  assert.ok(t2.trace.saidSo, "the second turn answered from the record, in the said-so family");
  const p = t2.trace.mapPath!;
  assert.ok(!p.includes("reasoning/derivation"), "a record answer is not a derivation");
  assert.ok(!p.includes("reasoning/planner"), "the said-so wording is the probe's, not the Planner's");
  assert.ok(p.indexOf("lpu/normalcy-assessment") > p.indexOf("session-and-situation"), "the bridge sits after Session & Situation");
  assert.ok(p.indexOf("coherence/coherence-analysis") > p.indexOf("lpu/normalcy-assessment"), "Coherence prices after the bridge");
  assert.equal(p[p.length - 1], "verbalizer");
});
