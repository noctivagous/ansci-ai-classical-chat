/**
 * ansci-physics-p1.test.ts — Physics P1 (2026-11-20;
 * design note docs/ansci/physics-design-note.md §§2–5,
 * §8, §9 P1): the scene record as a held artefact,
 * Planck adopted and pinned, assembly for the simplest
 * described scenes, and ONE question shape of the
 * will-it-fall / does-it-stand class, answered as a
 * derived fact with the full derivation record.
 *
 * Acceptance pins, per §9 P1: a fixed described stack
 * that stands and one that falls, both reproducible
 * from their records (§4.3); a scene declining at a
 * missing material reading (§3.2); the engine's
 * defaults demonstrably never inherited (§5.3) — the
 * fixture audit. Fixed scenes, fixed step counts (§8);
 * the engine is in-process, so no test touches the
 * network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import {
  PHYSICS_ENGINE,
  PhysicsLab,
  MaterialRegister,
  seedMaterialReadings,
  provenanceSummary,
  type SceneDescription,
} from "../src/ansci/physics";
import { detectPhysicsQuestion, processTurnWithPhysics, stackDescription } from "../src/ansci/physics-turn";

function freshLab(): PhysicsLab {
  const lab = new PhysicsLab(new MaterialRegister());
  seedMaterialReadings(lab.materials);
  return lab;
}

function stackDesc(count: number, material: string, topHalfOff: boolean): SceneDescription {
  return stackDescription(
    { kind: "stack-fate", count, material, topHalfOff, asked: "fall" },
    `will the stack of ${count} ${material} blocks${topHalfOff ? " with the top block half off" : ""} fall?`,
  );
}

test("the pinned engine artefact is the installed one (§2.1)", () => {
  // The derivation record cites planck's version and
  // licence; this pin re-verifies them against the
  // installed package on every run, so a dependency
  // drift cannot silently change what derivations cite.
  let dir = __dirname;
  let pkg: { name: string; version: string; license: string } | undefined;
  for (let i = 0; i < 6 && !pkg; i++) {
    const candidate = path.join(dir, "node_modules", "planck", "package.json");
    if (fs.existsSync(candidate)) pkg = JSON.parse(fs.readFileSync(candidate, "utf8"));
    dir = path.dirname(dir);
  }
  assert.ok(pkg, "installed planck package.json found");
  assert.equal(pkg.name, PHYSICS_ENGINE.package);
  assert.equal(pkg.version, PHYSICS_ENGINE.version);
  assert.equal(pkg.license, PHYSICS_ENGINE.licence);
});

test("a fixed described stack stands, reproducibly (§§4.3, 9 P1)", () => {
  const lab = freshLab();
  const assembled = lab.assemble(stackDesc(3, "wood", false));
  assert.equal(assembled.kind, "assembled");
  if (assembled.kind !== "assembled") return;
  const run1 = lab.simulate(assembled.scene);
  const run2 = lab.simulate(assembled.scene);
  assert.equal(run1.verdict, "stands");
  // Reproducibility: same record, same outcome, same
  // derivation — or it is not a result (§4.3).
  assert.deepEqual(run2.outcomes, run1.outcomes);
  assert.deepEqual(run2.derivation, run1.derivation);
  for (const o of run1.outcomes) {
    assert.ok(o.displacementM < 0.05, `${o.id} unmoved`);
    assert.ok(o.atRest, `${o.id} at rest`);
  }
  // The derivation cites its inputs (§4.2): the scene,
  // the held properties with their standing, the engine
  // and its stepping, and the question.
  assert.equal(run1.derivation.kind, "derived");
  const inputs = run1.derivation.inputs.join("\n");
  assert.match(inputs, /scene 'scene-1'/);
  assert.match(inputs, /material reading 'wood': density 600 kg\/m³, friction 0\.45, restitution 0\.2/);
  assert.match(inputs, /standing programme-seed-2026-11-20/);
  assert.match(inputs, /engine: planck 1\.5\.1 \(MIT\), step .* × 300 steps/);
  assert.match(inputs, /question: will the stack of 3 wood blocks fall\?/);
  // The ground rode in as a recorded assumption, and
  // the shape's supplied size/alignment with it (§5.2).
  const assumptionText = run1.derivation.inputs.join("\n");
  assert.match(assumptionText, /assumption — the ground plane/);
  assert.match(assumptionText, /assumption — the blocks' size/);
});

test("the half-off stack falls (§9 P1)", () => {
  const lab = freshLab();
  const assembled = lab.assemble(stackDesc(3, "wood", true));
  assert.equal(assembled.kind, "assembled");
  if (assembled.kind !== "assembled") return;
  const run = lab.simulate(assembled.scene);
  assert.equal(run.verdict, "falls");
  const top = run.outcomes.find((o) => o.id === "the top block")!;
  assert.ok(top.angleChangeDeg >= 30 || top.initial.y - top.final.y >= 0.3, "the top block fell by the stated rule");
  // The blocks below are not the ones that fell.
  const bottom = run.outcomes.find((o) => o.id === "the bottom block")!;
  assert.ok(bottom.displacementM < 0.05);
});

test("a missing material reading declines at its location, and no step is charged (§§3.2, 5.2, 7)", () => {
  const lab = freshLab();
  const stepsBefore = lab.stepCount();
  const assembled = lab.assemble(stackDesc(3, "mithril", false));
  assert.equal(assembled.kind, "missing-determination");
  if (assembled.kind !== "missing-determination") return;
  assert.equal(assembled.location, "material-reading");
  assert.equal(assembled.material, "mithril");
  assert.match(assembled.detail, /mithril/);
  assert.equal(lab.stepCount(), stepsBefore);
});

test("fixture audit: every fixture carries its reading's values, never the engine's defaults (§5.3)", () => {
  const lab = freshLab();
  // A reading whose values differ from Planck's fixture
  // defaults on every axis (defaults: density 0,
  // friction 0.2, restitution 0), so inheritance would
  // be visible value by value.
  lab.materials.intake({
    material: "auditite",
    densityKgM3: 1234,
    friction: 0.93,
    restitution: 0.61,
    provenance: { kind: "owner-authored", detail: "fixture-audit reading (Physics P1 test)" },
    standing: "audit-standing",
  });
  const desc: SceneDescription = {
    question: "fixture audit scene",
    bodies: [
      { id: "a", shape: { kind: "box", widthM: 0.4, heightM: 0.2 }, positionM: { x: 0, y: 0.1 }, motion: "dynamic", material: "auditite" },
      { id: "b", shape: { kind: "circle", radiusM: 0.15 }, positionM: { x: 1, y: 0.15 }, motion: "dynamic", material: "auditite" },
    ],
    presupposesGround: true,
    groundMaterial: "auditite",
  };
  const assembled = lab.assemble(desc);
  assert.equal(assembled.kind, "assembled");
  if (assembled.kind !== "assembled") return;
  const { bodies } = lab.buildWorld(assembled.scene);
  assert.equal(bodies.size, 3); // a, b, ground
  for (const [id, body] of bodies) {
    const fixture = body.getFixtureList();
    assert.ok(fixture, `${id} has a fixture`);
    assert.equal(fixture!.getDensity(), 1234, `${id} density is the reading's`);
    assert.equal(fixture!.getFriction(), 0.93, `${id} friction is the reading's`);
    assert.equal(fixture!.getRestitution(), 0.61, `${id} restitution is the reading's`);
  }
});

test("a scene without ground is meaningful: the blocks fall (§5.3)", () => {
  const lab = freshLab();
  const desc = stackDesc(2, "wood", false);
  delete desc.presupposesGround;
  delete desc.groundMaterial;
  const assembled = lab.assemble(desc);
  assert.equal(assembled.kind, "assembled");
  if (assembled.kind !== "assembled") return;
  assert.ok(!assembled.scene.assumptions.some((a) => a.what === "the ground plane"), "no ground was supplied");
  const run = lab.simulate(assembled.scene);
  assert.equal(run.verdict, "falls");
});

test("the conversational shape: stands, falls, and the located decline", () => {
  const lab = freshLab();
  const session = newSession();

  const stands = processTurnWithPhysics(session, "will the stack of three wood blocks fall?", { lab });
  assert.match(stands.reply, /By simulation, the stack of 3 wood blocks stands\./);
  assert.match(stands.reply, /Computed by Planck from the scene as described/);
  assert.equal(stands.trace.physics?.action, "simulated");
  assert.match(stands.trace.physics!.detail, /derivation:/);

  const falls = processTurnWithPhysics(session, "will the stack of three wood blocks with the top block half off fall?", { lab });
  assert.match(falls.reply, /By simulation, .* falls\./);
  assert.equal(falls.trace.physics?.action, "simulated");

  const mirror = processTurnWithPhysics(session, "does the stack of four stone blocks stand?", { lab });
  assert.match(mirror.reply, /stands\./);

  const stepsBefore = lab.stepCount();
  const missing = processTurnWithPhysics(session, "will the stack of three mithril blocks fall?", { lab });
  assert.equal(missing.trace.physics?.action, "missing-determination");
  assert.match(missing.reply, /no behavioural reading for mithril/);
  assert.match(missing.trace.declineReason ?? "", /missing material reading/);
  assert.equal(lab.stepCount(), stepsBefore, "a declined scene is never charged a step");
});

test("detection: the shape family, and nothing outside it", () => {
  assert.deepEqual(detectPhysicsQuestion("will the stack of 3 steel blocks fall?"), {
    kind: "stack-fate",
    count: 3,
    material: "steel",
    topHalfOff: false,
    asked: "fall",
  });
  assert.equal(detectPhysicsQuestion("will the stack of three wood blocks fall over?"), undefined);
  assert.equal(detectPhysicsQuestion("what is the weather?"), undefined);
  // Non-physics turns pass through the wrapper untouched.
  const session = newSession();
  const viaWrapper = processTurnWithPhysics(session, "who are you?");
  const direct = processTurn(newSession(), "who are you?");
  assert.equal(viaWrapper.reply, direct.reply);
  assert.equal(viaWrapper.trace.physics, undefined);
});

test("provenance summaries keep the derived kind's form (§4.2)", () => {
  const lab = freshLab();
  const assembled = lab.assemble(stackDesc(1, "wood", false));
  assert.equal(assembled.kind, "assembled");
  if (assembled.kind !== "assembled") return;
  const run = lab.simulate(assembled.scene);
  assert.match(provenanceSummary(run.derivation), /^derived: computed by Planck/);
});
