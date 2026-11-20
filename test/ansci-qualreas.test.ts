/**
 * ansci-qualreas.test.ts — the qualreas port (2026-11-17): the
 * relation-algebra data (RCC-8, Allen, point — qualreas, MIT) and
 * our path-consistency engine (qualreas.ts), wired into the
 * Senses-Scening Unit's spatial placement (senses-scening.ts).
 *
 * Pinned: the engine's composition/converse sanity and its
 * contradiction detection; the airport specimen's relations read
 * as a constraint network — consistent, with DERIVED relations
 * (fountain–Chicago through the airport's containment, tier
 * "placed-by-scene") once the containment chain exists; an
 * inconsistent placement set flagged on the scene with a
 * "spatial-consistency" unknown opened; and Allen's algebra over
 * the scene's event sequence (the scene model carries event
 * ORDER, not intervals, so Allen is pinned at the engine level
 * over that sequence — no Allen constraints are asserted in
 * production paths in v1).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, listOpenUnknowns, type Session } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { NEUTRAL_COMPOSITION } from "../src/ansci/composition";
import {
  ConstraintNetwork,
  composeSets,
  converseSet,
  loadAlgebra,
  qualreasAvailable,
} from "../src/ansci/qualreas";
import { sceneSpatialCheck } from "../src/ansci/senses-scening";

const HAS_QR = qualreasAvailable();

test("algebras load: RCC-8 (8), Allen (13), point (3), with converses", { skip: !HAS_QR }, () => {
  const rcc8 = loadAlgebra("rcc8")!;
  assert.deepEqual(rcc8.relations, ["DC", "EC", "EQ", "NTPP", "NTPPI", "PO", "TPP", "TPPI"]);
  assert.equal(rcc8.converse["NTPP"], "NTPPI");
  assert.equal(rcc8.identity, "EQ");
  const allen = loadAlgebra("allen")!;
  assert.equal(allen.relations.length, 13);
  assert.equal(allen.converse["B"], "BI");
  assert.equal(allen.identity, "E");
  assert.deepEqual(loadAlgebra("point")!.relations, ["<", "=", ">"]);
});

test("composition sanity: NTPP chains, Allen B;B and D;D, point <;<", { skip: !HAS_QR }, () => {
  const rcc8 = loadAlgebra("rcc8")!;
  assert.deepEqual([...composeSets(rcc8, new Set(["NTPP"]), new Set(["NTPP"]))], ["NTPP"]);
  assert.deepEqual([...converseSet(rcc8, new Set(["TPP", "NTPP"]))].sort(), ["NTPPI", "TPPI"]);
  const allen = loadAlgebra("allen")!;
  assert.deepEqual([...composeSets(allen, new Set(["B"]), new Set(["B"]))], ["B"]);
  assert.deepEqual([...composeSets(allen, new Set(["D"]), new Set(["D"]))], ["D"]);
  const point = loadAlgebra("point")!;
  assert.deepEqual([...composeSets(point, new Set(["<"]), new Set(["<"]))], ["<"]);
});

test("path consistency tightens a containment chain and reports contradiction", { skip: !HAS_QR }, () => {
  const rcc8 = loadAlgebra("rcc8")!;
  const net = new ConstraintNetwork(rcc8);
  net.assert("a", ["NTPP"], "b");
  net.assert("b", ["NTPP"], "c");
  assert.equal(net.propagate(), true);
  assert.deepEqual([...net.relation("a", "c")], ["NTPP"]);
  assert.deepEqual([...net.relation("c", "a")], ["NTPPI"]);

  const bad = new ConstraintNetwork(rcc8);
  bad.assert("a", ["NTPP"], "b");
  bad.assert("b", ["NTPP"], "a"); // mutual proper containment is impossible
  assert.equal(bad.propagate(), false);
  assert.ok(bad.conflict);
});

test("the airport scene as a network: consistent; containment chain derives fountain–Chicago", { skip: !HAS_QR }, () => {
  const s = newSession(NEUTRAL_COMPOSITION);
  processTurn(s, "I waited at the airport.");
  processTurn(s, "I went to the fountain between the bathrooms.");
  const scene = s.scenes[0];
  // The standing placements (fountain in airport; bathrooms
  // in-or-near airport; fountain between the two bathrooms) are
  // consistent, and nothing yet relates the fountain to anywhere
  // beyond the airport — no derived record is invented.
  assert.equal(scene.spatialFlags, undefined);
  assert.ok(Array.isArray(scene.derivedRelations));
  assert.equal(sceneSpatialCheck(scene).consistent, true);

  processTurn(s, "The airport is in Chicago.");
  const derived = scene.derivedRelations ?? [];
  const fc = derived.find((d) => d.figure === "fountain" && d.ground === "chicago");
  assert.ok(fc, JSON.stringify(derived));
  assert.deepEqual(fc.relations, ["NTPP", "TPP"]); // fountain NTPP/TPP airport, airport NTPP/TPP Chicago
  assert.equal(fc.tier, "placed-by-scene");
  assert.equal(fc.algebra, "rcc8");
  // The bathrooms' looser placement derives a looser set: part,
  // overlap or contact with Chicago — never containment of it.
  const bc = derived.find((d) => d.figure === "bathroom-1" && d.ground === "chicago");
  assert.ok(bc);
  assert.ok(bc.relations.includes("PO") && bc.relations.includes("EC"));
  assert.ok(!bc.relations.includes("TPPI") && !bc.relations.includes("EQ"));
});

test("an inconsistent placement set is flagged, with a spatial-consistency unknown opened", { skip: !HAS_QR }, () => {
  const s = newSession(NEUTRAL_COMPOSITION);
  processTurn(s, "I waited at the airport.");
  processTurn(s, "The airport is in Chicago.");
  processTurn(s, "Chicago is in the airport."); // mutual containment: impossible in RCC-8
  const scene = s.scenes[0];
  assert.equal(scene.spatialFlags?.length, 1);
  assert.equal(scene.spatialFlags?.[0].kind, "inconsistent-placement");
  assert.deepEqual(scene.derivedRelations, []); // derivations are not kept over a contradiction
  assert.ok(listOpenUnknowns(s).some((u) => u.kind === "spatial-consistency"));
});

test("Allen over the scene's event sequence: the 'and then' chain derives e1 before e3", { skip: !HAS_QR }, () => {
  const s: Session = newSession(NEUTRAL_COMPOSITION);
  processTurn(s, "I waited at the airport.");
  processTurn(s, "I went to the fountain between the bathrooms.");
  processTurn(s, "I went to the bathrooms.");
  const events = s.scenes[0].events;
  assert.deepEqual(events.map((e) => e.verb), ["wait", "go", "go"]);
  // The scene model carries the events' ORDER. Read as Allen
  // intervals in that order (each before the next), path
  // consistency derives the transitive fact.
  const allen = loadAlgebra("allen")!;
  const net = new ConstraintNetwork(allen);
  const ids = events.map((_, i) => `e${i + 1}`);
  for (let i = 0; i + 1 < ids.length; i++) net.assert(ids[i], ["B"], ids[i + 1]);
  assert.equal(net.propagate(), true);
  assert.deepEqual([...net.relation("e1", "e3")], ["B"]);
});
