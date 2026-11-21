/**
 * ansci-physics-p4.test.ts — Physics P4 (2026-11-20;
 * design note docs/ansci/physics-design-note.md §6,
 * §9 P4): joints get behaviour, the second shape
 * family, and the border declines exercised.
 *
 * Acceptance pins, per §9 P4: stated joints in
 * assembly (a hinged bar's pin holds to print
 * precision while its unjointed control falls away; a
 * distance link keeps its length exactly); the reach /
 * roll-to / slide-off shapes answered per shape from
 * stated reading rules; §6's border declines exercised
 * at fluids and 3D conversationally, and at soft-body
 * and fracture at assembly.
 *
 * This slice also carries a P1 defect the slope scenes
 * exposed, fixed here and pinned below: edge endpoints
 * are stated in scene coordinates but engine shapes
 * are body-local — P1's only edge sat at the origin,
 * where the frames coincide. A ground at a stated
 * nonzero level is the regression pin.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PhysicsLab,
  MaterialRegister,
  seedMaterialReadings,
  type SceneDescription,
} from "../src/ansci/physics";
import {
  detectBorderQuestion,
  detectSlopeQuestion,
  processTurnWithPhysics,
} from "../src/ansci/physics-turn";
import { newSession } from "../src/ansci/session";

function freshLab(): PhysicsLab {
  const lab = new PhysicsLab(new MaterialRegister());
  seedMaterialReadings(lab.materials);
  return lab;
}

const HINGE_SCENE: SceneDescription = {
  question: "hinge test: a bar hinged at its end to a fixed pivot",
  bodies: [
    { id: "the pivot", shape: { kind: "box", widthM: 0.2, heightM: 0.2 }, positionM: { x: 0, y: 2 }, motion: "static", material: "stone" },
    { id: "the bar", shape: { kind: "box", widthM: 1.0, heightM: 0.1 }, positionM: { x: 0.5, y: 2 }, motion: "dynamic", material: "wood" },
  ],
  joints: [{ kind: "revolute", bodyA: "the pivot", bodyB: "the bar", anchorAM: { x: 0, y: 0 }, anchorBM: { x: -0.5, y: 0 } }],
};

test("stated joints in assembly: the hinge holds, the control falls (§9 P4)", () => {
  const lab = freshLab();
  const assembled = lab.assemble(HINGE_SCENE);
  assert.equal(assembled.kind, "assembled");
  if (assembled.kind !== "assembled") return;
  const run = lab.simulate(assembled.scene);
  // The pin holds: the bar's hinged end never leaves
  // the pivot, across the whole trajectory.
  const trajectory = run.trajectories["the bar"];
  for (const p of trajectory) {
    const rad = (p.angleDeg * Math.PI) / 180;
    const endX = p.x - 0.5 * Math.cos(rad);
    const endY = p.y - 0.5 * Math.sin(rad);
    assert.ok(Math.hypot(endX - 0, endY - 2) < 0.01, "the hinged end stays at the pivot");
    assert.ok(Math.abs(Math.hypot(p.x - 0, p.y - 2) - 0.5) < 0.01, "the centre stays on the hinge's circle");
  }
  // The derivation cites the joint as an input (§4.2).
  assert.match(run.derivation.inputs.join("\n"), /joint — revolute between 'the pivot' and 'the bar'/);
  // The control — the same scene with the joint
  // unstated — falls away entirely. The joint is the
  // difference, in the joint's own terms.
  const control = lab.assemble({ ...HINGE_SCENE, joints: [] });
  assert.equal(control.kind, "assembled");
  if (control.kind !== "assembled") return;
  const controlRun = lab.simulate(control.scene);
  assert.ok(controlRun.outcomes.find((o) => o.id === "the bar")!.final.y < 0, "unjointed, the bar falls away");
  // And the jointed run is reproducible (§8).
  const again = lab.simulate(assembled.scene);
  assert.deepEqual(again.outcomes, run.outcomes);
});

test("stated joints in assembly: a distance link keeps its length (§9 P4)", () => {
  const lab = freshLab();
  const desc: SceneDescription = {
    question: "link test: a block linked to a fixed anchor",
    bodies: [
      { id: "the anchor", shape: { kind: "box", widthM: 0.2, heightM: 0.2 }, positionM: { x: 0, y: 3 }, motion: "static", material: "stone" },
      { id: "the block", shape: { kind: "box", widthM: 0.3, heightM: 0.3 }, positionM: { x: 0.8, y: 3 }, motion: "dynamic", material: "wood" },
    ],
    joints: [{ kind: "distance", bodyA: "the anchor", bodyB: "the block", anchorAM: { x: 0, y: 0 }, anchorBM: { x: 0, y: 0 } }],
  };
  const assembled = lab.assemble(desc);
  assert.equal(assembled.kind, "assembled");
  if (assembled.kind !== "assembled") return;
  const run = lab.simulate(assembled.scene);
  for (const p of run.trajectories["the block"]) {
    assert.ok(Math.abs(Math.hypot(p.x - 0, p.y - 3) - 0.8) < 0.01, "the link's length holds at the stated anchors' distance");
  }
  const control = lab.assemble({ ...desc, joints: [] });
  assert.equal(control.kind, "assembled");
  if (control.kind !== "assembled") return;
  const controlRun = lab.simulate(control.scene);
  assert.ok(controlRun.outcomes.find((o) => o.id === "the block")!.final.y < 0, "unlinked, the block falls away");
  // A joint naming an unplaced body still declines at
  // the placement (P1's validation, exercised at P4's
  // behaviour).
  const bad = lab.assemble({
    ...desc,
    joints: [{ kind: "revolute", bodyA: "the anchor", bodyB: "the missing body", anchorAM: { x: 0, y: 0 }, anchorBM: { x: 0, y: 0 } }],
  });
  assert.equal(bad.kind, "missing-determination");
});

test("the edge-frame regression: a ground at a stated nonzero level holds (§5.3, P4 fix)", () => {
  const lab = freshLab();
  const assembled = lab.assemble({
    question: "a block dropped onto ground stated at 0.5 m",
    bodies: [
      { id: "the block", shape: { kind: "box", widthM: 0.3, heightM: 0.3 }, positionM: { x: 0, y: 1.2 }, motion: "dynamic", material: "wood" },
    ],
    presupposesGround: true,
    groundLevelM: 0.5,
    groundMaterial: "stone",
  });
  assert.equal(assembled.kind, "assembled");
  if (assembled.kind !== "assembled") return;
  const run = lab.simulate(assembled.scene);
  const final = run.outcomes[0].final;
  assert.ok(Math.abs(final.y - 0.65) < 0.03, `the block rests on the stated ground (centre ${final.y}, expected ≈0.65)`);
});

test("the slope family, per shape (§9 P4)", () => {
  const lab = freshLab();
  const session = newSession();
  const rollTo = processTurnWithPhysics(session, "will the wood ball roll to the bottom of the 30-degree slope?", { lab });
  assert.equal(rollTo.trace.physics?.action, "simulated");
  assert.match(rollTo.reply, /rolls to the bottom of the 30-degree slope/);

  const rollOff = processTurnWithPhysics(session, "will the wood ball roll off the 30-degree slope?", { lab });
  assert.match(rollOff.reply, /rolls off the 30-degree slope/);

  const slideOff = processTurnWithPhysics(session, "will the wood block slide off the 35-degree slope?", { lab });
  assert.match(slideOff.reply, /slides off the 35-degree slope/);

  const stays = processTurnWithPhysics(session, "will the wood block slide off the 20-degree slope?", { lab });
  assert.match(stays.reply, /does not slide on the 20-degree slope/);

  const missing = processTurnWithPhysics(session, "will the mithril ball roll to the bottom of the 30-degree slope?", { lab });
  assert.equal(missing.trace.physics?.action, "missing-determination");
});

test("the border declines of §6, exercised at fluids and 3D (and the rest at assembly)", () => {
  const lab = freshLab();
  const session = newSession();
  const float = processTurnWithPhysics(session, "will the wood block float?", { lab });
  assert.equal(float.trace.physics?.action, "border-decline");
  assert.match(float.reply, /fluid capability/);
  assert.match(float.trace.declineReason ?? "", /fluid capability/);
  assert.equal(lab.stepCount(), 0, "a border decline charges no step");

  const corner = processTurnWithPhysics(session, "will the steel cube balance on its corner?", { lab });
  assert.equal(corner.trace.physics?.action, "border-decline");
  assert.match(corner.reply, /3D capability/);
  assert.equal(lab.stepCount(), 0);

  // §6's remaining borders, at assembly: the decline
  // names each capability kind.
  for (const capability of ["soft-body", "fracture", "3d", "fluid"] as const) {
    const assembled = lab.assemble({
      question: `a question turning on ${capability}`,
      bodies: [
        { id: "the body", shape: { kind: "box", widthM: 0.3, heightM: 0.3 }, positionM: { x: 0, y: 0.15 }, motion: "dynamic", material: "wood" },
      ],
      turnsOn: capability,
    });
    assert.equal(assembled.kind, "border");
    if (assembled.kind === "border") assert.equal(assembled.capability, capability);
  }
  assert.equal(lab.stepCount(), 0);
});

test("detection: the slope and border shapes and their limits", () => {
  assert.deepEqual(detectSlopeQuestion("will the wood ball roll to the bottom of the 30-degree slope?"), {
    kind: "slope",
    ask: "roll-to",
    mover: "ball",
    material: "wood",
    angleDeg: 30,
  });
  assert.equal(detectSlopeQuestion("will the wood ball roll to the bottom of the 90-degree slope?"), undefined);
  assert.equal(detectSlopeQuestion("will the wood ball roll to the bottom of the slope?"), undefined);
  assert.equal(detectSlopeQuestion("will the wood block roll to the bottom of the 30-degree slope?"), undefined);
  assert.deepEqual(detectBorderQuestion("does the ice ball float?"), {
    kind: "border",
    capability: "fluid",
    material: "ice",
    form: "float",
  });
  assert.equal(detectBorderQuestion("will the wood block float in the pond?"), undefined);
});
