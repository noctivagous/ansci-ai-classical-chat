/**
 * fork-quantification.test.ts — the quantification family
 * build (2026-11-17).
 *
 * The QuantificationUnit (quantification.ts), inside the OKU
 * over its Numbers slice, tracks quantities in a ledger held
 * on the Session; its UnitsMeasurement Unit
 * (units-measurement.ts) names units, dimensions and
 * conversions; the QuantificationLanguageUnit
 * (quantification-language.ts), in the LPU, reads quantity as
 * expressed in language and renders it back.
 *
 * Pinned here: the Numbers slice's readings (and their
 * absences), the Luoshu (invariant, lookups, flight path, and
 * the labelled ch. 4 tension), the unit table (dimensions,
 * conversions incl. traditional→SI, the cross-dimension
 * refusal, temperature as a scale), the bridge's numeral and
 * quantifier reading, the ledger (stated → delta → current;
 * transfers atomic; inconsistency flagged, never applied),
 * the implied counts, the owner's how-many specimen VERBATIM
 * (all three sentences survive the sentence layer), the
 * bounded-unknown answer, and a no-quantity turn recording
 * nothing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/fork/session";
import { processTurn } from "../src/fork/turn";
import { parse } from "../src/fork/parse";
import { NEUTRAL_COMPOSITION } from "../src/fork/composition";
import type { SemanticObject } from "../src/fork/semantic-object";
import {
  numberReading,
  numberReadingForWord,
  currentQuantity,
  recordStated,
  applyDelta,
  applyTransfer,
  impliedCount,
  IMPLIED_COUNTS,
  luoshuNumberAt,
  luoshuPalaceOf,
  luoshuGrid,
  luoshuLineSums,
  luoshuFlightPath,
} from "../src/fork/quantification";
import {
  dimensionOf,
  isCompatible,
  convert,
  convertTemperature,
  unitForWord,
} from "../src/fork/units-measurement";
import {
  parseNumberToken,
  numberWord,
  quantifierKind,
  normaliseKind,
  renderQuantity,
  computeQuantityMentions,
} from "../src/fork/quantification-language";

function personObject(session: Session, turn: number): SemanticObject {
  const o = session.objects.find((x) => x.producer === "person" && x.turn === turn);
  assert.ok(o, `a person object for turn ${turn}`);
  return o;
}

test("the Numbers slice: filed numbers read their phases; unfiled numbers read nothing", () => {
  // Suwen ch. 4's number row, banked in the OKU's ingested store.
  assert.equal(numberReading(8)?.element, "Wood");
  assert.equal(numberReading(7)?.element, "Fire");
  assert.equal(numberReading(5)?.element, "Earth");
  assert.equal(numberReading(9)?.element, "Metal");
  assert.equal(numberReading(6)?.element, "Water");
  assert.equal(numberReading(8)?.hanzi, "八");
  assert.match(numberReading(8)?.source ?? "", /Suwen ch\. 4/);
  assert.equal(numberReadingForWord("five")?.element, "Earth");
  // The slice files five numbers only: the rest have NO reading,
  // and none is invented for them.
  for (const n of [1, 2, 3, 4, 10, 20]) assert.equal(numberReading(n), undefined, `${n} unfiled`);
});

test("the Luoshu: the square, its 15 invariant, both lookup directions, the flight path", () => {
  assert.deepEqual(luoshuGrid(), [
    [4, 9, 2],
    [3, 5, 7],
    [8, 1, 6],
  ]);
  const sums = luoshuLineSums();
  assert.deepEqual(sums.rows, [15, 15, 15]);
  assert.deepEqual(sums.columns, [15, 15, 15]);
  assert.deepEqual(sums.diagonals, [15, 15]);
  assert.equal(sums.constant, 15);
  // South at the top, north at the bottom, east left, west right.
  assert.equal(luoshuNumberAt("south"), 9);
  assert.equal(luoshuNumberAt("north"), 1);
  assert.equal(luoshuNumberAt("east"), 3);
  assert.equal(luoshuNumberAt("west"), 7);
  assert.equal(luoshuNumberAt("centre"), 5);
  assert.equal(luoshuPalaceOf(8)?.palace, "north-east");
  assert.equal(luoshuPalaceOf(2)?.palace, "south-west");
  assert.deepEqual(luoshuFlightPath(), [5, 6, 7, 8, 9, 1, 2, 3, 4]);
  // The flight path visits every palace exactly once.
  assert.deepEqual([...luoshuFlightPath()].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("the labelled tension stands: ch. 4 files 8 under Wood/east; the Luoshu places 8 in the north-east", () => {
  // Two attested arrangements of the same number, kept as two —
  // neither function speaks for the other's scheme.
  assert.equal(numberReading(8)?.element, "Wood");
  assert.equal(luoshuPalaceOf(8)?.palace, "north-east");
  assert.equal(luoshuPalaceOf(3)?.palace, "east");
  assert.equal(numberReading(3), undefined); // the OKU slice does not file 3 at all
});

test("units: dimensions across the three systems, and what each unit counts", () => {
  assert.equal(dimensionOf("pound"), "weight");
  assert.equal(dimensionOf("兩"), "weight");
  assert.equal(dimensionOf("kilogram"), "weight");
  assert.equal(dimensionOf("里"), "length");
  assert.equal(dimensionOf("mile"), "length");
  assert.equal(dimensionOf("升"), "volume");
  assert.equal(dimensionOf("gallon"), "volume");
  assert.equal(dimensionOf("fahrenheit"), "temperature");
  // Measure words are counting units, each with what it counts.
  assert.equal(dimensionOf("個"), "count");
  assert.match(unitForWord("本")?.counts ?? "", /bound volumes/);
  assert.match(unitForWord("頭")?.counts ?? "", /livestock/);
  assert.ok(isCompatible("pound", "斤"));
  assert.ok(isCompatible("mile", "里"));
  assert.ok(!isCompatible("pound", "mile"));
});

test("units: conversion within a dimension — including traditional → SI", () => {
  // 兩 → grams, at the labelled modern standard value (50 g).
  const liang = convert(1, "兩", "gram");
  assert.ok(liang.ok);
  assert.equal(liang.amount, 50);
  assert.match(unitForWord("兩")?.note ?? "", /modern standardised/);
  // 斤 → kilograms: 500 g.
  const jin = convert(2, "斤", "kilogram");
  assert.ok(jin.ok);
  assert.equal(jin.amount, 1);
  // 里 → kilometres: 500 m.
  const li = convert(1, "里", "kilometre");
  assert.ok(li.ok);
  assert.equal(li.amount, 0.5);
  // Imperial → SI and within-SI.
  const lb = convert(1, "pound", "gram");
  assert.ok(lb.ok);
  assert.ok(Math.abs(lb.amount - 453.59237) < 1e-9);
  const mile = convert(1, "mile", "kilometre");
  assert.ok(mile.ok);
  assert.ok(Math.abs(mile.amount - 1.609344) < 1e-9);
  // 銖 by the traditional ratio: 24 銖 = 1 兩 = 50 g.
  const zhu = convert(24, "銖", "gram");
  assert.ok(zhu.ok);
  assert.ok(Math.abs(zhu.amount - 50) < 1e-9);
});

test("units: across dimensions is a typed refusal; temperature is a scale, separately converted", () => {
  const cross = convert(5, "pound", "mile");
  assert.ok(!cross.ok);
  assert.equal(cross.refusal, "cross-dimension");
  const unknown = convert(5, "pound", "furlong");
  assert.ok(!unknown.ok);
  assert.equal(unknown.refusal, "unknown-unit");
  // No factor is faked for a scale.
  assert.equal(unitForWord("fahrenheit")?.factor, undefined);
  const viaFactor = convert(32, "fahrenheit", "celsius");
  assert.ok(!viaFactor.ok);
  assert.equal(viaFactor.refusal, "temperature-scale");
  const f2c = convertTemperature(32, "fahrenheit", "celsius");
  assert.ok(f2c.ok);
  assert.equal(f2c.amount, 0);
  const c2f = convertTemperature(100, "celsius", "fahrenheit");
  assert.ok(c2f.ok);
  assert.equal(c2f.amount, 212);
});

test("the bridge: numerals as words and digits, quantifier kinds, kind naming, rendering", () => {
  assert.equal(parseNumberToken("five"), 5);
  assert.equal(parseNumberToken("5"), 5);
  assert.equal(parseNumberToken("twenty"), 20);
  assert.equal(parseNumberToken("9999"), 9999);
  assert.equal(parseNumberToken("hundred"), 100);
  assert.equal(parseNumberToken("apple"), undefined);
  assert.equal(numberWord(2), "two");
  assert.equal(numberWord(20), "twenty");
  assert.equal(numberWord(42), "42");
  assert.equal(quantifierKind("some")?.amount, null); // a bound, not a number
  assert.equal(quantifierKind("none")?.amount, 0);
  assert.equal(quantifierKind("no")?.quantifier, "none");
  assert.equal(quantifierKind("every")?.quantifier, "every");
  assert.equal(normaliseKind("bananas"), "banana");
  assert.equal(normaliseKind("apples"), "apple");
  assert.equal(normaliseKind("news"), "news"); // the exception stands
  assert.equal(renderQuantity(2, "apple"), "two apples");
  assert.equal(renderQuantity(1, "apple"), "one apple");
  assert.equal(renderQuantity(5, "apple"), "five apples");
});

test("the bridge reads a stated quantity from the parse, with the OKU reading attached", () => {
  const mentions = computeQuantityMentions(parse("I have 5 apples.", "en"));
  assert.equal(mentions.length, 1);
  const m = mentions[0];
  assert.equal(m.verb, "have");
  assert.equal(m.holder, "you"); // the parser's first person, in the session's grain
  assert.equal(m.amount, 5);
  assert.equal(m.numeralWord, "5"); // as said (retention)
  assert.equal(m.kind, "apple");
  assert.equal(m.reading?.element, "Earth"); // five, filed by the Numbers slice
  // A pronoun's stock: the kind is the pronoun's, resolved at apply time.
  const stock = computeQuantityMentions(parse("Sally bought 3 of them.", "en"));
  assert.equal(stock.length, 1);
  assert.equal(stock[0].holder, "sally");
  assert.equal(stock[0].amount, 3);
  assert.equal(stock[0].pronounStock, true);
  assert.equal(stock[0].kind, undefined);
});

test("the implied counts are filed as data, tiers of exactness kept apart", () => {
  assert.equal(IMPLIED_COUNTS.length, 6);
  assert.deepEqual(
    { kind: impliedCount("between")?.kind, value: impliedCount("between")?.value },
    { kind: "exact", value: 2 },
  );
  assert.equal(impliedCount("both")?.value, 2);
  assert.equal(impliedCount("pair")?.value, 2);
  assert.deepEqual(
    { kind: impliedCount("another")?.kind, value: impliedCount("another")?.value },
    { kind: "delta", value: 1 },
  );
  // A bare plural bounds without numbering: at least 2, exact unknown.
  assert.deepEqual(
    { kind: impliedCount("plural")?.kind, value: impliedCount("plural")?.value },
    { kind: "atLeast", value: 2 },
  );
});

test("the ledger: stated, delta, transfer — the latest record stands as current", () => {
  const s = newSession(NEUTRAL_COMPOSITION);
  recordStated(s, { holder: "you", kind: "apple", amount: 5, turn: 1, basis: "stated" });
  assert.equal(currentQuantity(s, "you", "apple")?.amount, 5);
  assert.equal(currentQuantity(s, "you", "apple")?.tier, "said");
  assert.equal(currentQuantity(s, "you", "apple")?.reading?.element, "Earth"); // 5 → Earth
  const gain = applyDelta(s, { holder: "you", kind: "apple", delta: 3, turn: 2, basis: "bought more" });
  assert.ok(gain.applied);
  assert.equal(currentQuantity(s, "you", "apple")?.amount, 8);
  assert.equal(currentQuantity(s, "you", "apple")?.tier, "derived");
  const tr = applyTransfer(s, { from: "you", to: "sally", kind: "apple", amount: 3, turn: 3, basis: "bought of them" });
  assert.ok(tr.applied);
  assert.equal(currentQuantity(s, "you", "apple")?.amount, 5);
  assert.equal(currentQuantity(s, "sally", "apple")?.amount, 3);
  // History is kept, not edited: four records stand.
  assert.equal(s.quantities.length, 4);
});

test("the ledger: an impossible delta is flagged, not applied — and a transfer is atomic", () => {
  const s = newSession(NEUTRAL_COMPOSITION);
  recordStated(s, { holder: "you", kind: "apple", amount: 5, turn: 1, basis: "stated" });
  const tr = applyTransfer(s, { from: "you", to: "sally", kind: "apple", amount: 7, turn: 2, basis: "bought of them" });
  assert.equal(tr.applied, false);
  assert.equal(tr.flag?.flag, "inconsistency");
  // Neither leg applied: both holders' state is as it was.
  assert.equal(currentQuantity(s, "you", "apple")?.amount, 5);
  assert.equal(currentQuantity(s, "sally", "apple"), undefined);
  assert.equal(s.quantityFlags.length, 1);
  // A delta against a bounded unknown has no ground either.
  recordStated(s, { holder: "you", kind: "banana", amount: null, quantifier: "some", turn: 3, basis: "stated with quantifier" });
  const d = applyDelta(s, { holder: "you", kind: "banana", delta: -1, turn: 4, basis: "ate one" });
  assert.equal(d.applied, false);
  assert.equal(d.flag?.flag, "unbounded");
  assert.equal(currentQuantity(s, "you", "banana")?.amount, null);
});

test("the owner's specimen, verbatim: stated, bought-of-them, how-many — answered from the ledger", () => {
  const s = newSession(NEUTRAL_COMPOSITION);
  const r1 = processTurn(s, "I have 5 apples.");
  const o1 = personObject(s, 1);
  assert.equal(o1.quantities?.length, 1);
  assert.equal(o1.quantities?.[0].reading?.element, "Earth");
  assert.deepEqual(r1.trace.quantities, ["stated 5 apple for you"]);
  assert.equal(currentQuantity(s, "you", "apple")?.amount, 5);
  assert.ok(r1.trace.mapPath?.includes("lpu/quantification-language-unit"));

  const r2 = processTurn(s, "Sally bought 3 of them.");
  assert.deepEqual(r2.trace.quantities, ["transfer 3 apple: you → sally"]);
  assert.equal(currentQuantity(s, "you", "apple")?.amount, 2);
  assert.equal(currentQuantity(s, "you", "apple")?.tier, "derived");
  assert.equal(currentQuantity(s, "sally", "apple")?.amount, 3);

  const r3 = processTurn(s, "How many do I have left?");
  assert.equal(r3.reply, "You have two apples left.");
  assert.deepEqual(r3.trace.quantityAnswer, { holder: "you", kind: "apple", amount: 2, rendered: "two apples" });
  assert.ok(r3.trace.mapPath?.includes("lpu/quantification-language-unit"));
});

test("how-many through the loop: word numerals, a give transfer, the kind named in the question", () => {
  const s = newSession(NEUTRAL_COMPOSITION);
  processTurn(s, "I have five bananas.");
  processTurn(s, "I gave him two bananas.");
  assert.equal(currentQuantity(s, "you", "banana")?.amount, 3);
  assert.equal(currentQuantity(s, "him", "banana")?.amount, 2);
  const r = processTurn(s, "How many bananas do I have?");
  assert.equal(r.reply, "You have three bananas left.");
  // A purchase with a counted kind is a gain from outside the stock.
  const s2 = newSession(NEUTRAL_COMPOSITION);
  processTurn(s2, "I bought three bananas.");
  assert.equal(currentQuantity(s2, "you", "banana")?.amount, 3);
  assert.equal(currentQuantity(s2, "you", "banana")?.tier, "derived");
});

test("how-many: an impossible purchase flags in the loop, and the tracked amount stands", () => {
  const s = newSession(NEUTRAL_COMPOSITION);
  processTurn(s, "I have 5 apples.");
  const r2 = processTurn(s, "Sally bought 7 of them.");
  assert.equal(s.quantityFlags.length, 1);
  assert.equal(s.quantityFlags[0].flag, "inconsistency");
  assert.ok(r2.trace.quantities?.[0].startsWith("flagged:"));
  assert.equal(currentQuantity(s, "you", "apple")?.amount, 5);
  assert.equal(currentQuantity(s, "sally", "apple"), undefined);
  const r3 = processTurn(s, "How many apples do I have?");
  assert.equal(r3.reply, "You have five apples.");
});

test("how-many: a bounded unknown answers as a bound; no record declines on the missing record", () => {
  const s = newSession(NEUTRAL_COMPOSITION);
  processTurn(s, "I have some bananas.");
  const rec = currentQuantity(s, "you", "banana");
  assert.equal(rec?.amount, null); // a bound, not a number
  assert.equal(rec?.quantifier, "some");
  const r = processTurn(s, "How many bananas do I have?");
  assert.equal(r.reply, "You told me you have some bananas, but not how many.");
  assert.equal(r.trace.quantityAnswer?.amount, null);

  const s2 = newSession(NEUTRAL_COMPOSITION);
  processTurn(s2, "I have bananas."); // the bare plural: at least two, exact unknown
  assert.equal(currentQuantity(s2, "you", "banana")?.amount, null);
  assert.equal(currentQuantity(s2, "you", "banana")?.quantifier, "plural");

  const s3 = newSession(NEUTRAL_COMPOSITION);
  const r3 = processTurn(s3, "How many bananas do I have?");
  assert.match(r3.reply, /haven't told me how many/);
  assert.match(r3.trace.declineReason ?? "", /quantity ledger/);
});

test("a no-quantity turn records nothing: no mentions, no ledger change, no bridge on the path", () => {
  const s = newSession(NEUTRAL_COMPOSITION);
  const r = processTurn(s, "Hello.");
  const o = personObject(s, 1);
  assert.equal(o.quantities, undefined);
  assert.equal(r.trace.quantities, undefined);
  assert.equal(s.quantities.length, 0);
  assert.ok(!r.trace.mapPath?.includes("lpu/quantification-language-unit"));
  const r2 = processTurn(s, "The soup is salty.");
  assert.equal(personObject(s, 2).quantities, undefined);
  assert.equal(s.quantities.length, 0);
  assert.ok(!r2.trace.mapPath?.includes("lpu/quantification-language-unit"));
});
