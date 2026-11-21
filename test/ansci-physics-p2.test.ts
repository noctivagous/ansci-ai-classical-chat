/**
 * ansci-physics-p2.test.ts — Physics P2 (2026-11-20;
 * design note docs/ansci/physics-design-note.md §3.2,
 * §9 P2): held material readings as knowledge with
 * intake — a first attested set for the materials the
 * knowledge graph already carries, each value
 * provenanced; scenes citing readings by name; the
 * missing-reading decline exercised across the set.
 *
 * Acceptance pins, per §9 P2: every reading in the set
 * traceable to its intake record; a derivation citing a
 * reading re-derives after the reading is superseded,
 * and says which standing it used.
 *
 * The intake artefact is data/physics/material-readings
 * .json — consulted 2026-11-20 against The Engineering
 * ToolBox's density and friction tables (and Marks'
 * via Perry's for cast iron). Restitution stands as
 * owner's authoring throughout, and each entry's source
 * lines say so — the test pins that the authored values
 * are MARKED authored, not covered by the dataset's
 * name.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PhysicsLab,
  MaterialRegister,
  seedMaterialReadings,
  SEED_STANDING,
} from "../src/ansci/physics";
import {
  attestedIntakeStanding,
  ensureAttestedReadings,
  loadAttestedReadings,
  readMaterialIntake,
} from "../src/ansci/physics-materials";
import { stackDescription } from "../src/ansci/physics-turn";
import { defaultMaterialRegister } from "../src/ansci/physics";

const ATTESTED_MATERIALS = ["wood", "stone", "steel", "iron", "ice", "brick", "glass"];

test("the intake artefact is complete: every value states its route (§3.2)", () => {
  const file = readMaterialIntake();
  assert.equal(file.standing, "intake-2026-11-20-engineering-toolbox");
  assert.deepEqual(
    file.entries.map((e) => e.material).sort(),
    [...ATTESTED_MATERIALS].sort(),
  );
  assert.ok(file.convention.length > 0, "the friction convention is stated in the artefact");
  for (const e of file.entries) {
    for (const k of ["density", "friction", "restitution"] as const) {
      assert.ok(e.valueSources[k].trim().length > 0, `${e.material} states a route for ${k}`);
    }
    // Restitution is owner's authoring in this intake,
    // and the source line must SAY so — an authored
    // value wearing a retrieved dataset's name would be
    // exactly the quiet upgrade §3.2 forbids.
    assert.match(e.valueSources.restitution, /owner-authored/);
  }
});

test("every reading in the set is traceable to its intake record (§9 P2)", () => {
  const register = new MaterialRegister();
  const { entered } = loadAttestedReadings(register);
  assert.deepEqual([...entered].sort(), [...ATTESTED_MATERIALS].sort());
  for (const material of ATTESTED_MATERIALS) {
    const reading = register.readingFor(material)!;
    assert.ok(reading, `${material} is held`);
    assert.equal(reading.standing, attestedIntakeStanding());
    assert.equal(reading.provenance.kind, "retrieved");
    if (reading.provenance.kind === "retrieved") {
      assert.match(reading.provenance.dataset, /Engineering ToolBox/);
      assert.match(reading.provenance.detail, /density — /);
      assert.match(reading.provenance.detail, /friction — /);
      assert.match(reading.provenance.detail, /restitution — owner-authored/);
    }
  }
  // Spot-check the attested values themselves against
  // the consulted tables (oak 720; granite 2.7 taken
  // from the 2.6–2.8 range; steel 7850; ice 917 and
  // ice-on-ice 0.1).
  assert.equal(register.readingFor("wood")!.densityKgM3, 720);
  assert.equal(register.readingFor("stone")!.densityKgM3, 2700);
  assert.equal(register.readingFor("steel")!.densityKgM3, 7850);
  assert.equal(register.readingFor("steel")!.friction, 0.6);
  assert.equal(register.readingFor("ice")!.densityKgM3, 917);
  assert.equal(register.readingFor("ice")!.friction, 0.1);
});

test("scenes cite readings by name, and the decline is exercised across the set (§§3.2, 9 P2)", () => {
  const lab = new PhysicsLab(new MaterialRegister());
  loadAttestedReadings(lab.materials);
  for (const material of ATTESTED_MATERIALS) {
    const assembled = lab.assemble(
      stackDescription({ kind: "stack-fate", count: 2, material, topHalfOff: false, asked: "fall" }, `stack of ${material}`),
    );
    assert.equal(assembled.kind, "assembled", `${material} assembles from its held reading`);
    if (assembled.kind === "assembled") {
      const cited = assembled.scene.bodies[0].reading;
      assert.equal(cited.standing, attestedIntakeStanding());
      assert.equal(cited.material, material);
    }
  }
  for (const material of ["mithril", "plastic", "rubber", "gold"]) {
    const assembled = lab.assemble(
      stackDescription({ kind: "stack-fate", count: 2, material, topHalfOff: false, asked: "fall" }, `stack of ${material}`),
    );
    assert.equal(assembled.kind, "missing-determination", `${material} declines — no reading stands`);
  }
});

test("a derivation re-derives after supersession, and says which standing it used (§9 P2)", () => {
  const lab = new PhysicsLab(new MaterialRegister());
  seedMaterialReadings(lab.materials);
  const desc = () =>
    stackDescription({ kind: "stack-fate", count: 3, material: "wood", topHalfOff: false, asked: "fall" }, "will the stack of three wood blocks fall?");

  const before = lab.assemble(desc());
  assert.equal(before.kind, "assembled");
  if (before.kind !== "assembled") return;
  const runBefore = lab.simulate(before.scene);
  assert.match(runBefore.derivation.inputs.join("\n"), new RegExp(`standing ${SEED_STANDING}`));
  assert.match(runBefore.derivation.inputs.join("\n"), /density 600 kg\/m³/);

  const { superseded } = loadAttestedReadings(lab.materials);
  assert.ok(superseded.includes("wood"), "the intake superseded the seed's wood");

  const after = lab.assemble(desc());
  assert.equal(after.kind, "assembled");
  if (after.kind !== "assembled") return;
  const runAfter = lab.simulate(after.scene);
  assert.match(runAfter.derivation.inputs.join("\n"), new RegExp(`standing ${attestedIntakeStanding()}`));
  assert.match(runAfter.derivation.inputs.join("\n"), /density 720 kg\/m³/);
  assert.equal(runAfter.verdict, "stands");

  // The earlier derivation stands exactly as written —
  // supersession does not reach back (§3.2's lifecycle).
  assert.match(runBefore.derivation.inputs.join("\n"), new RegExp(`standing ${SEED_STANDING}`));
  // And the register keeps both standings for audit.
  const standings = lab.materials.standingsFor("wood");
  assert.equal(standings.length, 2);
  assert.equal(standings[0].standing, SEED_STANDING);
  assert.equal(standings[1].standing, attestedIntakeStanding());
});

test("the conversational path's register carries the attested intake, not the seed", () => {
  ensureAttestedReadings(defaultMaterialRegister);
  assert.equal(defaultMaterialRegister.readingFor("wood")!.standing, attestedIntakeStanding());
  assert.equal(defaultMaterialRegister.readingFor("wood")!.densityKgM3, 720);
  assert.ok(defaultMaterialRegister.readingFor("glass"), "the attested set extends past the seed's materials");
});
