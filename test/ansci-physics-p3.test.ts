/**
 * ansci-physics-p3.test.ts — Physics P3 (2026-11-20;
 * design note docs/ansci/physics-design-note.md §7,
 * §9 P3): trajectories become Form.
 *
 * Acceptance pins, per §9 P3: the trajectory held as a
 * Form curve record (the Form note's §3.1: control
 * points, a stated interpolation, a stated domain
 * interval, lineage citing the derivation); motion
 * questions answered FROM THE RECORD with the engine
 * untouched — the lab's step counter is the audit, and
 * it must not move; and an edited curve (whose parent
 * is another curve) is not confused with the simulated
 * one — a curve whose lineage does not audit back is
 * not answerable-from (Form §3.3).
 *
 * The when-reach reading rule carries a stated contact
 * band (physics-turn.ts GROUND_CONTACT_BAND_M): in this
 * engine a resting body's geometric underside settles
 * 0.011–0.015 m above the floor line (measured across
 * the stack scenes at build time), so the ground reads
 * as reached within 0.02 m of it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PhysicsLab,
  MaterialRegister,
  seedMaterialReadings,
} from "../src/ansci/physics";
import { CurveStore, firstCrossing, valueAt, type CurveRecord } from "../src/ansci/physics-curves";
import {
  detectMotionQuestion,
  processTurnWithPhysics,
  stackDescription,
} from "../src/ansci/physics-turn";
import { newSession } from "../src/ansci/session";

function freshLab(): PhysicsLab {
  const lab = new PhysicsLab(new MaterialRegister());
  seedMaterialReadings(lab.materials);
  return lab;
}

function runFallingStack(lab: PhysicsLab) {
  const assembled = lab.assemble(
    stackDescription(
      { kind: "stack-fate", count: 3, material: "wood", topHalfOff: true, asked: "fall" },
      "will the stack of three wood blocks with the top block half off fall?",
    ),
  );
  assert.equal(assembled.kind, "assembled");
  if (assembled.kind !== "assembled") throw new Error("unreachable");
  return lab.simulate(assembled.scene);
}

test("a run's trajectory is held as Form curve records (§3.1 of the Form note)", () => {
  const lab = freshLab();
  const run = runFallingStack(lab);
  assert.equal(run.verdict, "falls");
  const kinds = run.curves.map((c) => c.id.split(":").pop()).sort();
  assert.deepEqual(kinds, ["height", "lowest", "speed", "height", "lowest", "speed", "height", "lowest", "speed"].sort());
  for (const curve of run.curves) {
    assert.equal(curve.heldForm, "control-points");
    assert.equal(curve.interpolation, "linear", "the interpolation is stated in the record");
    // Height and lowest-point curves span the stepped
    // interval from 0; the speed curve's domain starts
    // at the first finite difference (t = dt) — speed
    // at the initial instant is not among the samples,
    // and the record's interval says so rather than
    // covering it.
    if (curve.id.endsWith(":speed")) assert.ok(curve.domainInterval[0] > 0);
    else assert.equal(curve.domainInterval[0], 0);
    assert.equal(curve.domainInterval[1], 5, "the domain interval is the stepped span, stated");
    assert.equal(curve.parent?.kind, "derivation", "lineage cites the derivation");
    assert.equal(curve.parent?.ref, run.scene.id);
    assert.equal(lab.curves.get(curve.id), curve, "the record stands in Form's register");
    assert.equal(lab.curves.lineageIntact(curve), true);
  }
  // The curves are the trajectory, point for point.
  const height = run.curves.find((c) => c.id.endsWith("the top block:height"))!;
  const trajectory = run.trajectories["the top block"];
  assert.equal(height.points.length, trajectory.length);
  assert.equal(height.points[10].y, trajectory[10].y);
});

test("motion questions are answered from the record — the step counter does not move (§9 P3)", () => {
  const lab = freshLab();
  const session = newSession();
  const first = processTurnWithPhysics(session, "will the stack of three wood blocks with the top block half off fall?", { lab });
  assert.match(first.reply, /falls/);
  const stepsAfterRun = lab.stepCount();
  assert.equal(stepsAfterRun, 300);

  const when = processTurnWithPhysics(session, "when does the top block reach the ground?", { lab });
  assert.equal(when.trace.physics?.action, "answered-from-curve");
  assert.match(when.reply, /reaches the ground at about [\d.]+ seconds/);
  assert.equal(lab.stepCount(), stepsAfterRun, "answering from the curve charged no step");

  const speed = processTurnWithPhysics(session, "how fast is the top block moving after 1 second?", { lab });
  assert.equal(speed.trace.physics?.action, "answered-from-curve");
  assert.match(speed.reply, /moving at about [\d.]+ m\/s/);
  assert.equal(lab.stepCount(), stepsAfterRun, "the speed answer also reads the record only");

  // The numbers agree with the held curves themselves.
  const run = lab.lastRun!;
  const lowest = run.curves.find((c) => c.id.endsWith("the top block:lowest"))!;
  const crossing = firstCrossing(lowest, 0.02)!;
  assert.ok(Math.abs(crossing - parseFloat(/about ([\d.]+) seconds/.exec(when.reply)![1])) < 0.011);
  const speedCurve = run.curves.find((c) => c.id.endsWith("the top block:speed"))!;
  assert.ok(Math.abs(valueAt(speedCurve, 1)! - parseFloat(/about ([\d.]+) m\/s/.exec(speed.reply)![1])) < 0.011);
});

test("a body that never reaches the ground reads as not reaching it — from the same record", () => {
  const lab = freshLab();
  const session = newSession();
  processTurnWithPhysics(session, "will the stack of three wood blocks fall?", { lab });
  const steps = lab.stepCount();
  const when = processTurnWithPhysics(session, "when does the top block reach the ground?", { lab });
  assert.equal(when.trace.physics?.action, "answered-from-curve");
  assert.match(when.reply, /does not reach the ground within the simulated 5 seconds/);
  assert.equal(lab.stepCount(), steps);
});

test("the declines are located: no trajectory standing, and past the domain interval", () => {
  const lab = freshLab();
  const session = newSession();
  const early = processTurnWithPhysics(session, "when does the top block reach the ground?", { lab });
  assert.equal(early.trace.physics?.action, "missing-determination");
  assert.match(early.reply, /no simulated trajectory stands/);
  assert.equal(lab.stepCount(), 0, "the decline charged no step either");

  processTurnWithPhysics(session, "will the stack of three wood blocks with the top block half off fall?", { lab });
  const late = processTurnWithPhysics(session, "how fast is the top block moving after 9 seconds?", { lab });
  assert.equal(late.trace.physics?.action, "missing-determination");
  assert.match(late.reply, /outside it/);
  assert.match(late.trace.declineReason ?? "", /domain interval/);
  assert.equal(lab.stepCount(), 300, "the domain decline read the record and stopped");
});

test("an edited curve is not confused with the simulated one (Form §3.3)", () => {
  const store = new CurveStore();
  const simulated: CurveRecord = {
    id: "scene-1:the top block:lowest",
    heldForm: "control-points",
    domain: "time (s)",
    range: "lowest-point height (m)",
    points: [
      { x: 0, y: 0.6 },
      { x: 1, y: 0.0 },
    ],
    interpolation: "linear",
    domainInterval: [0, 5],
    parent: { kind: "derivation", ref: "scene-1" },
    provenance: "the sampled trajectory of a run",
  };
  store.hold(simulated);
  assert.equal(store.answerable(simulated.id), simulated);

  // An edit is a NEW record citing the simulated one —
  // answerable while its parent stands held…
  const edit: CurveRecord = {
    ...simulated,
    id: "scene-1:the top block:lowest:edit-1",
    parent: { kind: "curve", ref: simulated.id },
    provenance: "an edit of the simulated curve (points moved)",
  };
  store.hold(edit);
  assert.equal(store.answerable(edit.id), edit);
  assert.notEqual(store.answerable(edit.id), store.answerable(simulated.id));

  // …but an orphan — a curve citing a parent that is
  // not held — is NOT answerable-from: the broken
  // lineage is a located gap, never a quiet repair,
  // and the orphan is never treated as the simulated
  // curve (§3.3).
  const orphan: CurveRecord = {
    ...simulated,
    id: "scene-9:the top block:lowest",
    parent: { kind: "curve", ref: "a-curve-that-is-not-held" },
    provenance: "an edit whose parent record is absent",
  };
  store.hold(orphan);
  assert.equal(store.lineageIntact(orphan), false);
  assert.equal(store.answerable(orphan.id), undefined);
});

test("detection: the motion shapes and their limits", () => {
  assert.deepEqual(detectMotionQuestion("when does the top block reach the ground?"), {
    kind: "motion",
    ask: "when-reach-ground",
    bodyRef: "top",
  });
  assert.deepEqual(detectMotionQuestion("how fast is the block moving after two seconds?"), {
    kind: "motion",
    ask: "speed-at",
    bodyRef: "the",
    seconds: 2,
  });
  assert.equal(detectMotionQuestion("how fast is the top block moving after 1.5 seconds?")?.seconds, 1.5);
  assert.equal(detectMotionQuestion("when does the train reach the station?"), undefined);
  assert.equal(detectMotionQuestion("how fast is the river moving?"), undefined);
});
