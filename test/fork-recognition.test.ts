/**
 * Slice C recognition tests (2026-11-18): the recognised-but-
 * unclassified climb outcome (owner's pre-rulings 1a–4a, recorded
 * in slice-c-pre-rulings.md). A sense the climb does not classify
 * can still be recognised — its walk passes a function-category
 * stop — and the outcome carries category, path and hops only:
 * no element, no aspect, no classification confidence, and it
 * never becomes a sense-arbitration candidate. These tests pin
 * the outcome's shape, the per-sense precedence of classification,
 * the nearest-primary recording, and the scaffolding ban.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  categoryStopReport,
  climbAudit,
  climbRecognitions,
  enableWordnetLexicon,
} from "../src/fork/wordnet-lex";

enableWordnetLexicon(true);

test("hammer: recognised as a tool, with every stop on the path recorded, nearest primary", () => {
  const recs = climbRecognitions("hammer");
  assert.ok(recs.length >= 1);
  const first = recs[0];
  assert.equal(first.category, "tool");
  assert.deepEqual(
    first.stops.map((s) => s.category),
    ["tool", "implement"],
  );
  assert.equal(first.stops[0].primary, true);
  assert.equal(first.stops[1].primary, false);
  assert.ok(first.path.includes("—RECOGNISED→"), first.path);
  assert.ok(first.path.includes("no classification"), first.path);
});

test("the outcome's shape: no element, no aspect, no confidence anywhere on the result", () => {
  for (const r of climbRecognitions("teapot")) {
    assert.ok(!("element" in r), "a recognition must not carry an element");
    assert.ok(!("aspect" in r), "a recognition must not carry an aspect");
    assert.ok(!("confidence" in r), "a recognition must not carry a classification confidence");
    for (const s of r.stops) {
      assert.ok(!("element" in s) && !("confidence" in s));
    }
  }
});

test("teapot: three stops on one path — container primary, utensil and implement behind it", () => {
  const recs = climbRecognitions("teapot");
  assert.equal(recs.length, 1);
  assert.deepEqual(
    recs[0].stops.map((s) => `${s.category}@${s.hops}`),
    ["container@3", "utensil@4", "implement@5"],
  );
});

test("the fallback stop works: abacus and thermostat are recognised as devices, nothing narrower", () => {
  assert.equal(climbRecognitions("abacus")[0]?.category, "device");
  assert.equal(climbRecognitions("thermostat")[0]?.category, "device");
  assert.equal(climbRecognitions("bicycle")[0]?.category, "vehicle");
});

test("precedence is per-sense: a classified sense never recognises, an unclassified sense of the same word may", () => {
  // Invariant over probe words: the senses climbRecognitions
  // returns are exactly the hitless noun senses whose walk passes
  // a stop — checked against the audit, the diagnosis window.
  for (const w of ["hammer", "marble", "teapot", "gold", "chestnut"]) {
    const audit = climbAudit(w);
    const recognisedSenses = new Set(climbRecognitions(w).map((r) => r.sense));
    for (const s of audit) {
      if (s.hit) assert.ok(!recognisedSenses.has(s.sense), `${w} sense ${s.sense} classifies and must not recognise`);
      if (recognisedSenses.has(s.sense)) assert.equal(s.hit, undefined);
    }
  }
  // marble's stone sense classifies (Slice B); its game sense
  // does not, and is recognised as equipment — the two outcomes
  // coexist because precedence is per-sense (ruling 3a).
  const marble = climbRecognitions("marble");
  assert.ok(marble.some((r) => r.category === "equipment"));
});

test("scaffolding never counts: abstract words passing only entity/abstraction stay unrecognised", () => {
  for (const w of ["justice", "democracy", "happiness"]) {
    assert.deepEqual(climbRecognitions(w), [], `${w} must stay unrecognised`);
  }
});

test("the audit shows the recognition beside the absence of a hit", () => {
  const audit = climbAudit("hammer");
  const recognised = audit.filter((s) => s.recognition);
  assert.ok(recognised.length >= 1);
  for (const s of recognised) assert.equal(s.hit, undefined);
  assert.equal(recognised[0].recognition?.category, "tool");
});

test("table-owned words never recognise: the table owns them outright", () => {
  assert.deepEqual(climbRecognitions("salt"), []);
  assert.deepEqual(climbRecognitions("chicken"), []);
});

test("the report: fourteen stops, subtrees as certified", () => {
  const report = categoryStopReport();
  assert.equal(report.length, 14);
  const byCategory = new Map(report.map((s) => [s.category, s]));
  assert.equal(byCategory.get("tool")?.synset, "wn-n04517575");
  assert.equal(byCategory.get("food")?.synset, "wn-n07701837");
  assert.ok((byCategory.get("device")?.subtreeSize ?? 0) > 3000);
});
