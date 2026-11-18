/**
 * fork-units-qudt.test.ts — the QUDT port into UnitsMeasurement
 * (2026-11-17): QUDT (CC BY 4.0) cross-checked the hand table
 * (every shared unit agreed — the record stands in
 * data/qudt/manifest.json) and supplied the coverage the hand
 * table lacked, filed with source "qudt".
 *
 * Pinned: the QUDT-added conversions both directions; the US
 * liquid units DISTINCT from their Imperial namesakes; the new
 * area/pressure dimensions converting within themselves; a
 * cross-dimension refusal still refused; the table's qudt rows
 * in agreement with the shipped data/qudt artefact (no drift);
 * and the traditional Chinese rows untouched.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { convert, dimensionOf, unitForWord } from "../src/fork/units-measurement";

const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * 1e-9);

test("qudt: mile ↔ kilometre, both directions (cross-checked hand row)", () => {
  const out = convert(1, "mile", "kilometre");
  assert.ok(out.ok && near(out.amount, 1.609344));
  const back = convert(1.609344, "kilometre", "mile");
  assert.ok(back.ok && near(back.amount, 1));
});

test("qudt: the US gallon is NOT the imperial gallon", () => {
  const us = convert(1, "us gallon", "litre");
  const imp = convert(1, "gallon", "litre");
  assert.ok(us.ok && near(us.amount, 3.785411784), JSON.stringify(us));
  assert.ok(imp.ok && near(imp.amount, 4.54609), JSON.stringify(imp));
  assert.notEqual(us.ok && imp.ok ? us.amount : 0, imp.ok ? imp.amount : 0);
  assert.equal(unitForWord("us gallon")?.id, "us-gallon");
  assert.equal(unitForWord("us gallon")?.source, "qudt");
  assert.equal(unitForWord("gallon")?.source, undefined); // the hand row stays hand-authored
  const back = convert(3.785411784, "litre", "us gallon");
  assert.ok(back.ok && near(back.amount, 1));
});

test("qudt: US pint vs imperial pint; quart and fluid ounces filed", () => {
  const us = convert(1, "us pint", "litre");
  assert.ok(us.ok && near(us.amount, 0.473176473));
  const imp = convert(1, "pint", "litre");
  assert.ok(imp.ok && near(imp.amount, 0.56826125));
  const fl = convert(1, "us fluid ounce", "litre");
  assert.ok(fl.ok && near(fl.amount, 0.0295735296));
  const qt = convert(1, "us quart", "us gallon");
  assert.ok(qt.ok && near(qt.amount, 0.25));
});

test("qudt: new dimensions — acre (area) and psi ↔ pascal (pressure)", () => {
  assert.equal(dimensionOf("acre"), "area");
  assert.equal(unitForWord("acre")?.factor, 4046.8564224);
  const psi = convert(1, "psi", "pascal");
  assert.ok(psi.ok && near(psi.amount, 6894.757293168361));
  const back = convert(6894.757293168361, "pascal", "psi");
  assert.ok(back.ok && near(back.amount, 1));
});

test("qudt: cross-dimension is still a typed refusal, including into the new dimensions", () => {
  const a = convert(1, "us gallon", "mile");
  assert.ok(!a.ok && a.refusal === "cross-dimension");
  const b = convert(5, "pound", "acre");
  assert.ok(!b.ok && b.refusal === "cross-dimension");
  const c = convert(1, "psi", "litre");
  assert.ok(!c.ok && c.refusal === "cross-dimension");
});

test("qudt: the table's qudt rows agree with the shipped data/qudt artefact", () => {
  const dir = path.join(__dirname, "..", "..", "data", "qudt");
  const part = JSON.parse(fs.readFileSync(path.join(dir, "part-001.json"), "utf-8")) as {
    units: { id: string; dimension: string; factor: number }[];
  };
  assert.ok(part.units.length >= 28);
  for (const rec of part.units) {
    if (rec.dimension === "temperature") continue; // a scale: no factor is filed, by design
    const u = unitForWord(rec.id);
    assert.ok(u, `the table files ${rec.id}`);
    assert.ok(near(u.factor!, rec.factor), `${rec.id}: table ${u.factor} vs artefact ${rec.factor}`);
    assert.equal(u.dimension, rec.dimension);
  }
});

test("qudt: traditional Chinese rows untouched (hand-authored, no qudt source)", () => {
  const jin = unitForWord("斤");
  assert.equal(jin?.factor, 500);
  assert.equal(jin?.source, undefined);
  assert.equal(jin?.system, "traditional");
  const liang = convert(1, "兩", "gram");
  assert.ok(liang.ok && near(liang.amount, 50));
});
