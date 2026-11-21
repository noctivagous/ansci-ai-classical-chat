/**
 * ansci-form-f3.test.ts — Form F3 (2026-11-20; design note
 * docs/ansci/form-design-note.md — branch track/form-design —
 * §5, §8, §9.3): repetition — patterns held, detection with
 * its floor.
 *
 * Pins:
 *  - the known cycles stand as pattern records whose units
 *    are READ from the constants and conventions they cite
 *    (GENERATES / CONTROLS in sentence.ts, the frame's
 *    SEASON / DAYPART conventions) — a second, citable
 *    statement; the conventions themselves are untouched;
 *  - detection asserts only at the evidence floor — the
 *    unit complete at least twice, three occurrences of
 *    its boundary: the §7.3 daypart sequence (9 steps,
 *    period 4) asserts and names its cycle; a sequence
 *    starting mid-cycle asserts with its phase in the
 *    cycle stated;
 *  - below the floor the decline is D6 with the candidate
 *    named AS a candidate: one-and-a-half periods of the
 *    dayparts; a pair of recurrences of anything; a
 *    sequence too short to show even the smallest unit
 *    twice over. The floor is implemented as designed —
 *    it is not loosened anywhere in this file;
 *  - a sequence long enough for the floor to speak, with
 *    no consistent period, returns the finding "none" —
 *    not a decline dressed as one;
 *  - a detected repetition asserts about THIS sequence
 *    only (its method says so): asked to witness that the
 *    world runs a cycle, Form declines D10;
 *  - the Scheduling cord is citation-shaped: a citation
 *    resolves to the record as it stands; a pattern edit
 *    is a new record in the lineage, the parent's citation
 *    still resolves to the parent, and the latest is a
 *    separate ask. Scheduling's side is not built here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FormRegister } from "../src/ansci/form";
import {
  citePattern,
  detectRepetition,
  editPattern,
  enterKnownCycles,
  holdPattern,
  statePattern,
  testifyCycle,
} from "../src/ansci/form-repetition";
import { standingFormRegister } from "../src/ansci/form-standing";
import { GENERATES, CONTROLS } from "../src/ansci/sentence";

const FIXED = () => new Date("2026-11-20T12:00:00.000Z");
const STATED = { kind: "stated", detail: "stated in the F3 acceptance conversation and held as stated" } as const;

test("F3: the known cycles are held as pattern records, their units read from the constants they cite", () => {
  const reg = new FormRegister(FIXED);
  enterKnownCycles(reg);
  enterKnownCycles(reg); // idempotent
  assert.equal(reg.allPatterns().length, 4);
  const sheng = reg.patternByName("generating cycle (sheng)");
  assert.ok(sheng);
  // The unit is the constant's own cycle, followed from Wood.
  const expected: string[] = ["Wood"];
  let cur = GENERATES["Wood"];
  while (cur !== "Wood") {
    expected.push(cur);
    cur = GENERATES[cur];
  }
  assert.deepEqual(sheng.unit, expected);
  assert.deepEqual(sheng.unit, ["Wood", "Fire", "Earth", "Metal", "Water"]);
  const ke = reg.patternByName("controlling cycle (ke)");
  assert.ok(ke);
  assert.deepEqual(ke.unit, ["Wood", "Earth", "Water", "Fire", "Metal"]);
  void CONTROLS;
  const dayparts = statePattern(reg, "dayparts");
  assert.ok(dayparts.ok);
  assert.match(dayparts.value.statement, /dawn → midday → dusk → night/);
  assert.match(dayparts.value.statement, /period four over twenty-four hours/);
  const unknown = statePattern(reg, "the tides");
  assert.ok(!unknown.ok);
  assert.equal(unknown.decline.code, "D2");
});

test("F3: the §7.3 daypart sequence detects at the floor and names its cycle", () => {
  const reg = standingFormRegister(FIXED);
  const seq = ["dawn", "midday", "dusk", "night", "dawn", "midday", "dusk", "night", "dawn"];
  const found = detectRepetition(reg, seq);
  assert.equal(found.status, "asserted");
  if (found.status !== "asserted") return;
  assert.equal(found.assertion.period, 4);
  assert.deepEqual(found.assertion.unit, ["dawn", "midday", "dusk", "night"]);
  assert.equal(found.assertion.matchedCycle?.name, "dayparts");
  assert.equal(found.assertion.matchedCycle?.phaseInCycle, 0);
  assert.match(found.assertion.method, /claims nothing about the world/);
});

test("F3: a sequence starting mid-cycle asserts with its phase in the cycle", () => {
  const reg = standingFormRegister(FIXED);
  const seq = ["dusk", "night", "dawn", "midday", "dusk", "night", "dawn", "midday", "dusk"];
  const found = detectRepetition(reg, seq);
  assert.equal(found.status, "asserted");
  if (found.status !== "asserted") return;
  assert.equal(found.assertion.period, 4);
  assert.equal(found.assertion.matchedCycle?.name, "dayparts");
  assert.equal(found.assertion.matchedCycle?.phaseInCycle, 2);
});

test("F3: one-and-a-half periods declines D6, the candidate named as a candidate", () => {
  const reg = standingFormRegister(FIXED);
  const seq = ["dawn", "midday", "dusk", "night", "dawn", "midday"];
  const found = detectRepetition(reg, seq);
  assert.equal(found.status, "declined");
  if (found.status !== "declined") return;
  assert.equal(found.decline.code, "D6");
  assert.equal(found.candidate?.period, 4);
  assert.equal(found.candidate?.matchedCycle?.name, "dayparts");
  assert.match(found.decline.reply, /a candidate, offered as a candidate/);
});

test("F3: the floor is exact — a pair is not a pattern, and the smallest unit needs its third boundary", () => {
  const reg = standingFormRegister(FIXED);
  // [a, b, a, b] — the unit [a, b] stands complete twice but
  // its boundary occurs only twice: below the floor.
  const pair = detectRepetition(reg, ["a", "b", "a", "b"]);
  assert.equal(pair.status, "declined");
  if (pair.status === "declined") {
    assert.equal(pair.decline.code, "D6");
    assert.equal(pair.candidate?.period, 2);
  }
  // One more step: the boundary's third occurrence — asserted.
  const over = detectRepetition(reg, ["a", "b", "a", "b", "a"]);
  assert.equal(over.status, "asserted");
  if (over.status === "asserted") assert.equal(over.assertion.period, 2);
  // A constant sequence of two is below the floor for period 1.
  const two = detectRepetition(reg, ["x", "x"]);
  assert.equal(two.status, "declined");
  if (two.status === "declined") assert.equal(two.candidate?.period, 1);
  const three = detectRepetition(reg, ["x", "x", "x"]);
  assert.equal(three.status, "asserted");
  if (three.status === "asserted") assert.equal(three.assertion.period, 1);
  // Two steps of unlike material: too short to tell at all.
  const tiny = detectRepetition(reg, ["x", "y"]);
  assert.equal(tiny.status, "declined");
  if (tiny.status === "declined") {
    assert.equal(tiny.decline.code, "D6");
    assert.equal(tiny.candidate, undefined);
  }
});

test("F3: a long sequence with no consistent period returns the finding 'none'", () => {
  const reg = standingFormRegister(FIXED);
  const seq = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const found = detectRepetition(reg, seq);
  assert.equal(found.status, "none");
  if (found.status === "none") assert.match(found.method, /no repetition stands in it/);
});

test("F3: detection over the elements matches the generating cycle by name", () => {
  const reg = standingFormRegister(FIXED);
  const seq = ["Wood", "Fire", "Earth", "Metal", "Water", "Wood", "Fire", "Earth", "Metal", "Water", "Wood"];
  const found = detectRepetition(reg, seq);
  assert.equal(found.status, "asserted");
  if (found.status !== "asserted") return;
  assert.equal(found.assertion.period, 5);
  assert.equal(found.assertion.matchedCycle?.name, "generating cycle (sheng)");
});

test("F3: asked to witness that the world runs a cycle, Form declines D10", () => {
  const reg = standingFormRegister(FIXED);
  const r = testifyCycle(reg, "dayparts");
  assert.ok(!r.ok);
  assert.equal(r.decline.code, "D10");
  assert.match(r.decline.reply, /not its witness/);
});

test("F3: a pattern edit is a lineage — the parent's citation still resolves to the parent", () => {
  const reg = new FormRegister(FIXED);
  const parent = holdPattern(reg, {
    name: "bells",
    unit: ["one", "two"],
    domain: "counts",
    periodNote: "period two, over counts",
    provenance: STATED,
  });
  const edited = editPattern(reg, parent.id, {
    editNote: "the unit gains a third step",
    provenance: STATED,
    unit: ["one", "two", "three"],
    periodNote: "period three, over counts",
  });
  assert.ok(edited.ok);
  assert.equal(edited.value.parentId, parent.id);
  // The citation resolves to the record as it stood.
  const cited = citePattern(reg, parent.id);
  assert.ok(cited.ok);
  assert.deepEqual(cited.value.unit, ["one", "two"]);
  // The latest is a separate, explicit ask.
  assert.equal(reg.latestPatternInLineage(parent.id).id, edited.value.id);
  const lineage = reg.auditPatternLineage(edited.value.id);
  assert.ok(lineage.ok);
  assert.deepEqual(lineage.value.map((p) => p.id), [parent.id, edited.value.id]);
  // And an orphan pattern's audit declines D8, as a curve's does.
  const orphan = holdPattern(reg, {
    unit: ["z"],
    domain: "counts",
    periodNote: "period one",
    provenance: STATED,
    parentId: "pattern-999",
  });
  const audit = reg.auditPatternLineage(orphan.id);
  assert.ok(!audit.ok);
  assert.equal(audit.decline.code, "D8");
});
