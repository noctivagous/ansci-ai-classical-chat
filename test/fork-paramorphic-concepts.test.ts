/**
 * fork-paramorphic-concepts.test.ts — the ParamorphicConcept
 * Unit's first slice (owner's ruling + "rec", 2026-11-19):
 * the seat inside the OKU, and the six concepts registered
 * as data. No engine is under test here, because none was
 * built: what is pinned is the registry's shape — the list
 * closed at the six of the components record, every concept
 * carrying its substrate, parameters, operations and
 * invariants, the instances referenced in place, and
 * Protocol's absence recorded as an absence.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PARAMORPHIC_CONCEPTS,
  PARAMORPHIC_CONCEPT_UNIT,
  conceptById,
} from "../src/fork/paramorphic-concepts";

test("the unit's seat is inside the OKU", () => {
  assert.equal(
    PARAMORPHIC_CONCEPT_UNIT,
    "ontology-core/ontology-knowledge-unit/paramorphic-concept-unit",
  );
});

test("the contents are closed at the six concepts of the components record, in family order", () => {
  assert.deepEqual(
    PARAMORPHIC_CONCEPTS.map((c) => c.id),
    ["grid", "graph", "tree", "path", "protocol", "logic"],
  );
  // Network is not a seventh concept: it folds into Graph +
  // Protocol, as the components record ruled.
  assert.equal(conceptById("network"), undefined);
  assert.equal(conceptById("timeline"), undefined);
});

test("every concept carries the full registry shape", () => {
  for (const c of PARAMORPHIC_CONCEPTS) {
    assert.ok(c.substrate.length > 0, `${c.name}: a substrate`);
    assert.ok(c.parameters.length >= 3, `${c.name}: parameters — the directions it moves in`);
    assert.ok(c.sharedOperations.length >= 1, `${c.name}: shared operations registered`);
    for (const op of c.sharedOperations) assert.ok(op.gloss.length > 0, `${c.name}/${op.name}: a gloss`);
    assert.ok(c.invariants.length >= 1, `${c.name}: at least one invariant`);
    assert.ok(c.specimenStanding.length > 0, `${c.name}: specimen standing stated`);
    for (const i of c.instances) assert.ok(i.where.length > 0, `${c.name}/${i.name}: the instance's address, in place`);
  }
});

test("instances are referenced in place — the correspondence graph and the Luoshu stay where they live", () => {
  const graph = conceptById("graph");
  assert.ok(graph?.instances.some((i) => i.name === "The correspondence graph"));
  const grid = conceptById("grid");
  assert.ok(grid?.instances.some((i) => i.name === "The Luoshu" && i.where.includes("quantification")));
});

test("the Tree entry carries the X1 brake: no unpriced automatic inheritance", () => {
  const tree = conceptById("tree");
  assert.ok(tree?.invariants.some((i) => i.includes("X1")));
  assert.ok(tree?.sharedOperations.some((o) => o.name === "climb"));
});

test("Protocol stands empty — no specimen is invented for it", () => {
  const protocol = conceptById("protocol");
  assert.deepEqual(protocol?.instances, []);
  assert.match(protocol?.specimenStanding ?? "", /No specimen/);
});

test("Logic names what the OKU already does, without moving the table", () => {
  const logic = conceptById("logic");
  assert.ok(logic?.instances.some((i) => i.name.includes("classification table")));
  assert.ok(logic?.invariants.some((i) => i.includes("never enters the asserted set")));
});
