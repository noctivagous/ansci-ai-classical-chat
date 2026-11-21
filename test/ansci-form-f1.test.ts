/**
 * ansci-form-f1.test.ts — Form F1 (2026-11-20; design note
 * docs/ansci/form-design-note.md — branch track/form-design —
 * §3, §8, §9.1): curves held, asked, and applied.
 *
 * Pins:
 *  - the register: records are appended, never edited; an
 *    edit is a new record citing its parent, the parent
 *    unchanged, the lineage auditable root-to-record, and
 *    the latest in a lineage is a separate, explicit ask;
 *  - value at a point: computed and cited for a stated
 *    function and for control points under a stated rule;
 *    outside the stated domain — or past the points that
 *    state a points curve — the decline is D3;
 *  - a point set with no stated interpolation is held as
 *    points and declines D4 when asked as a curve;
 *  - a preset with no canon entered declines D1 — no curve
 *    is drawn from the name's sound, and a merely STATED
 *    record under the name does not resolve it; a canon
 *    entry (provenance: a canon) does;
 *  - monotonic and steepest-where are decided from the held
 *    form (line, parabola, sine, segments), and decline D5
 *    where the form cannot decide (a stretch past the
 *    points' span; a step curve's steepest point);
 *  - a record citing a parent the register does not hold
 *    answers nothing: its acts decline D8;
 *  - application serves a full series or the first decline,
 *    never a partial series in silence;
 *  - the animation seam: with no clock reading supplied the
 *    evaluation declines D9 (Form does not read a clock, and
 *    does not treat a stated time as a reading); with one,
 *    the answer names the reading's standing.
 *
 * No network, no clock dependence: the register's clock is
 * injected fixed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FormRegister } from "../src/ansci/form";
import {
  applyCurve,
  curveMonotonic,
  curveSteepest,
  evaluateAnimationCurve,
  evaluateCurve,
} from "../src/ansci/form-curves";

const FIXED = () => new Date("2026-11-20T12:00:00.000Z");
const STATED = { kind: "stated", detail: "stated in the F1 acceptance conversation and held as stated" } as const;

function register(): FormRegister {
  return new FormRegister(FIXED);
}

/** A control-point ramp: (0,0) → (10,20) → (20,20), linear. */
function ramp(reg: FormRegister) {
  return reg.holdCurve({
    name: "ramp",
    form: { kind: "points", points: [{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 20, y: 20 }], interpolation: "linear" },
    domain: { from: 0, to: 20 },
    domainName: "distance",
    rangeName: "height",
    provenance: STATED,
  });
}

test("F1: a control-point curve answers its value inside its domain, computed and cited", () => {
  const reg = register();
  const curve = ramp(reg);
  const mid = evaluateCurve(reg, curve.id, 5);
  assert.ok(mid.ok);
  assert.equal(mid.value.value, 10);
  assert.equal(mid.value.curveId, curve.id);
  assert.match(mid.value.method, /interpolated \(linear\)/);
  const flat = evaluateCurve(reg, curve.id, 15);
  assert.ok(flat.ok);
  assert.equal(flat.value.value, 20);
});

test("F1: a stated function evaluates exactly, and its shape questions are decided from the form", () => {
  const reg = register();
  const line = reg.holdCurve({
    name: "climb",
    form: { kind: "function", fn: { form: "line", slope: 2, intercept: 1 } },
    domain: { from: 0, to: 10 },
    domainName: "time",
    provenance: STATED,
  });
  const v = evaluateCurve(reg, line.id, 3);
  assert.ok(v.ok);
  assert.equal(v.value.value, 7);
  const mono = curveMonotonic(reg, line.id);
  assert.ok(mono.ok);
  assert.equal(mono.value.verdict, "increasing");
  const steep = curveSteepest(reg, line.id);
  assert.ok(steep.ok);
  assert.equal(steep.value.rate, 2);
  assert.equal(steep.value.at, "everywhere");
});

test("F1: asked outside its domain, a curve declines D3 — no extrapolation", () => {
  const reg = register();
  const curve = ramp(reg);
  const r = evaluateCurve(reg, curve.id, 25);
  assert.ok(!r.ok);
  assert.equal(r.decline.code, "D3");
  assert.match(r.decline.reply, /from 0 to 20/);
  const mono = curveMonotonic(reg, curve.id, { from: 0, to: 30 });
  assert.ok(!mono.ok);
  assert.equal(mono.decline.code, "D3");
});

test("F1: a points curve asked past its points declines D3 at the points' span", () => {
  const reg = register();
  const curve = reg.holdCurve({
    form: { kind: "points", points: [{ x: 0, y: 0 }, { x: 5, y: 5 }], interpolation: "linear" },
    domain: { from: 0, to: 10 },
    domainName: "distance",
    provenance: STATED,
  });
  const r = evaluateCurve(reg, curve.id, 8);
  assert.ok(!r.ok);
  assert.equal(r.decline.code, "D3");
  assert.match(r.decline.detail, /span \[0, 5\]/);
});

test("F1: an edit is a new record — lineage audits back, the parent unchanged", () => {
  const reg = register();
  const parent = ramp(reg);
  const edited = reg.editCurve(parent.id, {
    editNote: "the second point moved from (10, 20) to (10, 30)",
    provenance: STATED,
    form: { kind: "points", points: [{ x: 0, y: 0 }, { x: 10, y: 30 }, { x: 20, y: 20 }], interpolation: "linear" },
  });
  assert.ok(edited.ok);
  assert.notEqual(edited.value.id, parent.id);
  assert.equal(edited.value.parentId, parent.id);
  // The parent stands exactly as it was.
  const parentNow = reg.curve(parent.id);
  assert.deepEqual(parentNow?.form, parent.form);
  const parentValue = evaluateCurve(reg, parent.id, 5);
  assert.ok(parentValue.ok);
  assert.equal(parentValue.value.value, 10);
  const editedValue = evaluateCurve(reg, edited.value.id, 5);
  assert.ok(editedValue.ok);
  assert.equal(editedValue.value.value, 15);
  // The lineage audits root-to-record, and latest is explicit.
  const lineage = reg.auditCurveLineage(edited.value.id);
  assert.ok(lineage.ok);
  assert.deepEqual(lineage.value.map((c) => c.id), [parent.id, edited.value.id]);
  assert.equal(reg.latestCurveInLineage(parent.id).id, edited.value.id);
  assert.equal(reg.latestCurveInLineage(edited.value.id).id, edited.value.id);
});

test("F1: a named preset with no canon entered declines D1; a stated namesake does not resolve it; a canon entry does", () => {
  const reg = register();
  const citing = reg.holdCurve({
    name: "fade",
    form: { kind: "preset", presetName: "ease-in" },
    domain: { from: 0, to: 1 },
    domainName: "time",
    provenance: STATED,
  });
  const r1 = evaluateCurve(reg, citing.id, 0.5);
  assert.ok(!r1.ok);
  assert.equal(r1.decline.code, "D1");
  assert.match(r1.decline.reply, /I hold no preset by the name 'ease-in'/);
  // A merely stated record under the name is not the canon's
  // statement and must not resolve the citation.
  reg.holdCurve({
    presetName: "ease-in",
    form: { kind: "function", fn: { form: "parabola", a: 1, b: 0, c: 0 } },
    domain: { from: 0, to: 1 },
    domainName: "time",
    provenance: STATED,
  });
  const r2 = evaluateCurve(reg, citing.id, 0.5);
  assert.ok(!r2.ok);
  assert.equal(r2.decline.code, "D1");
  // The canon enters the name (provenance: a canon, its
  // source named) — now the citation resolves, to the canon's
  // own statement.
  const canonEntry = reg.holdCurve({
    presetName: "ease-in",
    form: { kind: "function", fn: { form: "parabola", a: 1, b: 0, c: 0 } },
    domain: { from: 0, to: 1 },
    domainName: "time",
    provenance: { kind: "canon", source: "the owner's ruling (test canon)", detail: "entered for the F1 acceptance; the shipped register enters no canon" },
  });
  const r3 = evaluateCurve(reg, citing.id, 0.5);
  assert.ok(r3.ok);
  assert.equal(r3.value.value, 0.25);
  assert.equal(r3.value.curveId, canonEntry.id);
});

test("F1: a point set with no stated interpolation is held as points and declines D4", () => {
  const reg = register();
  const points = reg.holdCurve({
    form: { kind: "points", points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] },
    domain: { from: 0, to: 10 },
    domainName: "distance",
    provenance: STATED,
  });
  const r = evaluateCurve(reg, points.id, 5);
  assert.ok(!r.ok);
  assert.equal(r.decline.code, "D4");
  assert.match(r.decline.reply, /not yet a curve/);
  const mono = curveMonotonic(reg, points.id);
  assert.ok(!mono.ok);
  assert.equal(mono.decline.code, "D4");
});

test("F1: monotonic is decided for parabola and sine from the held form", () => {
  const reg = register();
  const bowl = reg.holdCurve({
    form: { kind: "function", fn: { form: "parabola", a: 1, b: 0, c: 0 } },
    domain: { from: -10, to: 10 },
    domainName: "distance",
    provenance: STATED,
  });
  const across = curveMonotonic(reg, bowl.id);
  assert.ok(across.ok);
  assert.equal(across.value.verdict, "neither");
  const side = curveMonotonic(reg, bowl.id, { from: 0, to: 10 });
  assert.ok(side.ok);
  assert.equal(side.value.verdict, "increasing");
  const wave = reg.holdCurve({
    form: { kind: "function", fn: { form: "sine", amplitude: 1, frequency: 1, phase: 0 } },
    domain: { from: 0, to: 6 },
    domainName: "time",
    provenance: STATED,
  });
  const rise = curveMonotonic(reg, wave.id, { from: 0, to: 1 });
  assert.ok(rise.ok);
  assert.equal(rise.value.verdict, "increasing");
  const turn = curveMonotonic(reg, wave.id, { from: 0, to: 3 });
  assert.ok(turn.ok);
  assert.equal(turn.value.verdict, "neither");
  const steep = curveSteepest(reg, wave.id, { from: 0, to: 3 });
  assert.ok(steep.ok);
  assert.equal(steep.value.rate, 1);
  assert.deepEqual(steep.value.at, { from: 0, to: 0 });
});

test("F1: steepest-where over segments picks the greatest segment rate", () => {
  const reg = register();
  const curve = ramp(reg);
  const steep = curveSteepest(reg, curve.id);
  assert.ok(steep.ok);
  assert.equal(steep.value.rate, 2);
  assert.deepEqual(steep.value.at, { from: 0, to: 10 });
});

test("F1: where the held form cannot decide, the decline is D5 — a stretch past the points, a step curve's steepest", () => {
  const reg = register();
  const curve = ramp(reg);
  // Domain runs to 20 but the stretch asks past the points'
  // span — set up a curve whose domain outruns its points.
  const wide = reg.holdCurve({
    form: { kind: "points", points: [{ x: 0, y: 0 }, { x: 5, y: 5 }], interpolation: "linear" },
    domain: { from: 0, to: 10 },
    domainName: "distance",
    provenance: STATED,
  });
  void curve;
  const mono = curveMonotonic(reg, wide.id, { from: 0, to: 10 });
  assert.ok(!mono.ok);
  assert.equal(mono.decline.code, "D5");
  const steps = reg.holdCurve({
    form: { kind: "points", points: [{ x: 0, y: 0 }, { x: 5, y: 3 }, { x: 10, y: 3 }], interpolation: "step" },
    domain: { from: 0, to: 10 },
    domainName: "time",
    provenance: STATED,
  });
  const stepMono = curveMonotonic(reg, steps.id);
  assert.ok(stepMono.ok);
  assert.equal(stepMono.value.verdict, "increasing");
  const stepSteep = curveSteepest(reg, steps.id);
  assert.ok(!stepSteep.ok);
  assert.equal(stepSteep.decline.code, "D5");
});

test("F1: a record whose cited parent is not held answers nothing — D8", () => {
  const reg = register();
  const orphan = reg.holdCurve({
    form: { kind: "function", fn: { form: "line", slope: 1, intercept: 0 } },
    domain: { from: 0, to: 1 },
    domainName: "time",
    provenance: STATED,
    parentId: "curve-999",
    editNote: "an intake record citing a parent this register never held",
  });
  const r = evaluateCurve(reg, orphan.id, 0.5);
  assert.ok(!r.ok);
  assert.equal(r.decline.code, "D8");
  assert.match(r.decline.reply, /curve-999/);
  const lineage = reg.auditCurveLineage(orphan.id);
  assert.ok(!lineage.ok);
  assert.equal(lineage.decline.code, "D8");
});

test("F1: application serves the whole series or the first decline, never a partial series", () => {
  const reg = register();
  const curve = ramp(reg);
  const applied = applyCurve(reg, curve.id, [0, 5, 10, 20]);
  assert.ok(applied.ok);
  assert.deepEqual(applied.value.values, [0, 10, 20, 20]);
  const partial = applyCurve(reg, curve.id, [0, 5, 99]);
  assert.ok(!partial.ok);
  assert.equal(partial.decline.code, "D3");
});

test("F1: the animation seam — no reading, D9; a supplied reading evaluates and names its standing", () => {
  const reg = register();
  const sweep = reg.holdCurve({
    name: "sweep",
    form: { kind: "function", fn: { form: "line", slope: 10, intercept: 0 } },
    domain: { from: 0, to: 60 },
    domainName: "time",
    rangeName: "position",
    provenance: STATED,
  });
  const none = evaluateAnimationCurve(reg, sweep.id);
  assert.ok(!none.ok);
  assert.equal(none.decline.code, "D9");
  assert.match(none.decline.reply, /no clock reading/i);
  const some = evaluateAnimationCurve(reg, sweep.id, { value: 3, standing: "a reading supplied by the test harness, standing as a caller's vouched 'now'" });
  assert.ok(some.ok);
  assert.equal(some.value.value, 30);
  assert.match(some.value.method, /clock reading standing as/);
});
