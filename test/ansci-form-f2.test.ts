/**
 * ansci-form-f2.test.ts — Form F2 (2026-11-20; design note
 * docs/ansci/form-design-note.md — branch track/form-design —
 * §4, §8, §9.2): proportion records.
 *
 * Pins:
 *  - the relation record: terms, the ratio held AS STATED
 *    (not re-derived into a decimal it never claimed), its
 *    provenance and its standing; a record with no
 *    provenance cannot be held (the type requires it);
 *  - state / compare / scale: compare answers from the
 *    stated ratios; scale gives the other term's value with
 *    its derivation stated — a computation, never testimony;
 *  - the named register stands as §4.2 leaves it: doubling
 *    and the half are held by name and citable as a ratio;
 *    any further name declines D2 — no canon is invented;
 *  - incommensurable terms decline D7: magnitudes of known
 *    unlike dimension with no stated relation are not a
 *    proportion, and no ratio is manufactured by dividing
 *    the numbers anyway; with a stated relation (a rate),
 *    the same terms hold;
 *  - conversion factors are CITED, not duplicated: a
 *    proportion may cite a UnitsMeasurement factor (its
 *    provenance names the table), the citation scales, a
 *    cross-dimension citation declines D7, a temperature
 *    scale declines as no-ratio — and UnitsMeasurement's
 *    own convert() answers exactly as before, Form being
 *    no second conversion route.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FormRegister } from "../src/ansci/form";
import {
  compareProportions,
  enterStandingProportions,
  holdProportion,
  proportionFromConversion,
  scaleProportion,
  stateProportion,
} from "../src/ansci/form-proportions";
import { convert } from "../src/ansci/units-measurement";

const FIXED = () => new Date("2026-11-20T12:00:00.000Z");
const STATED = { kind: "stated", detail: "stated in the F2 acceptance conversation and held as stated" } as const;

function register(): FormRegister {
  return new FormRegister(FIXED);
}

/** The recipe proportion: flour to water, 2 to 1 by weight. */
function recipe(reg: FormRegister) {
  return holdProportion(reg, {
    name: "recipe",
    terms: {
      a: { magnitude: "the water", dimension: "weight", unit: "gram" },
      b: { magnitude: "the flour", dimension: "weight", unit: "gram" },
    },
    ratio: { factor: 2, asStated: "2 to 1 by weight, as the recipe states it" },
    provenance: STATED,
  });
}

test("F2: a stated proportion scales a quantity with its derivation shown", () => {
  const reg = register();
  const held = recipe(reg);
  assert.ok(held.ok);
  const scaled = scaleProportion(reg, held.value.id, { term: "a", value: 250 });
  assert.ok(scaled.ok);
  assert.equal(scaled.value.value, 500);
  assert.equal(scaled.value.term, "b");
  assert.match(scaled.value.derivation, /250 \(the water, in gram\) × the stated ratio/);
  assert.match(scaled.value.derivation, /never testimony/);
  const back = scaleProportion(reg, "recipe", { term: "b", value: 500 });
  assert.ok(back.ok);
  assert.equal(back.value.value, 250);
  const stated = stateProportion(reg, "recipe");
  assert.ok(stated.ok);
  assert.match(stated.value.statement, /2 to 1 by weight, as the recipe states it/);
});

test("F2: two proportions compare from their stated ratios", () => {
  const reg = register();
  const held = recipe(reg);
  assert.ok(held.ok);
  enterStandingProportions(reg);
  const vs = compareProportions(reg, "recipe", "doubling");
  assert.ok(vs.ok);
  assert.equal(vs.value.verdict, "equal");
  assert.equal(vs.value.factorA, 2);
  const vsHalf = compareProportions(reg, "recipe", "half");
  assert.ok(vsHalf.ok);
  assert.equal(vsHalf.value.verdict, "greater");
  const halfVs = compareProportions(reg, "half", "doubling");
  assert.ok(halfVs.ok);
  assert.equal(halfVs.value.verdict, "lesser");
});

test("F2: the named register holds doubling and the half — and no invented canon beyond them", () => {
  const reg = register();
  enterStandingProportions(reg);
  enterStandingProportions(reg); // idempotent
  assert.equal(reg.allProportions().filter((p) => p.name).length, 2);
  const doubled = scaleProportion(reg, "doubling", { term: "a", value: 7 });
  assert.ok(doubled.ok);
  assert.equal(doubled.value.value, 14);
  const halved = scaleProportion(reg, "half", { term: "a", value: 7 });
  assert.ok(halved.ok);
  assert.equal(halved.value.value, 3.5);
  // A ratio cited by an unheld name declines D2.
  const byName = holdProportion(reg, {
    terms: { a: { magnitude: "the cloth" }, b: { magnitude: "the coat" } },
    ratio: { named: "the golden ratio" },
    provenance: STATED,
  });
  assert.ok(!byName.ok);
  assert.equal(byName.decline.code, "D2");
  const unknown = stateProportion(reg, "the golden ratio");
  assert.ok(!unknown.ok);
  assert.equal(unknown.decline.code, "D2");
  // A ratio cited by a held name resolves to the named record's ratio.
  const cited = holdProportion(reg, {
    terms: { a: { magnitude: "the seed" }, b: { magnitude: "the sowing" } },
    ratio: { named: "doubling" },
    provenance: STATED,
  });
  assert.ok(cited.ok);
  assert.equal(cited.value.ratio.factor, 2);
});

test("F2: incommensurable terms decline D7 — unless a stated relation makes them comparable", () => {
  const reg = register();
  const refused = holdProportion(reg, {
    terms: {
      a: { magnitude: "the flour", dimension: "weight", unit: "kilogram" },
      b: { magnitude: "the shelf", dimension: "length", unit: "metre" },
    },
    ratio: { factor: 3 },
    provenance: STATED,
  });
  assert.ok(!refused.ok);
  assert.equal(refused.decline.code, "D7");
  assert.match(refused.decline.reply, /no stated relation makes them comparable/);
  assert.equal(reg.allProportions().length, 0);
  // The same magnitudes under a stated relation (a price)
  // hold: the relation is what makes them comparable.
  const priced = holdProportion(reg, {
    terms: {
      a: { magnitude: "the flour", dimension: "weight", unit: "kilogram" },
      b: { magnitude: "its price", dimension: "money", unit: undefined },
    },
    ratio: { factor: 3, asStated: "3 coins per kilogram, as the stall states it" },
    provenance: STATED,
    relationNote: "a price: coins per kilogram — the stated rate that relates money to weight",
  });
  assert.ok(priced.ok);
  const scaled = scaleProportion(reg, priced.value.id, { term: "a", value: 4 });
  assert.ok(scaled.ok);
  assert.equal(scaled.value.value, 12);
});

test("F2: a conversion factor is cited, not duplicated — and conversion still answers through UnitsMeasurement", () => {
  const reg = register();
  const cited = proportionFromConversion(reg, "metre", "foot", { magnitude: "the span" });
  assert.ok(cited.ok);
  assert.equal(cited.value.provenance.kind, "attested");
  assert.match(cited.value.provenance.kind === "attested" ? cited.value.provenance.source : "", /units-measurement/);
  // The cited factor is the table's factor, read at hold time.
  const direct = convert(1, "metre", "foot");
  assert.ok(direct.ok);
  assert.equal(cited.value.ratio.factor, direct.amount);
  const scaled = scaleProportion(reg, cited.value.id, { term: "a", value: 2 });
  assert.ok(scaled.ok);
  assert.equal(scaled.value.value, 2 * direct.amount);
  // UnitsMeasurement's own route is untouched by the citation.
  const still = convert(5, "kilogram", "pound");
  assert.ok(still.ok);
  assert.ok(Math.abs(still.amount - 5000 / 453.59237) < 1e-9);
  // Cross-dimension and scale citations decline at their locations.
  const cross = proportionFromConversion(reg, "kilogram", "metre");
  assert.ok(!cross.ok);
  assert.equal(cross.decline.code, "D7");
  const scale = proportionFromConversion(reg, "celsius", "fahrenheit");
  assert.ok(!scale.ok);
  assert.equal(scale.decline.code, "D7");
  const unknown = proportionFromConversion(reg, "metre", "furlong");
  assert.ok(!unknown.ok);
  assert.equal(unknown.decline.code, "D2");
});
