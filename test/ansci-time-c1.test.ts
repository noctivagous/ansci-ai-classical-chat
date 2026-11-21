/**
 * ansci-time-c1.test.ts — Calendar held; the arithmetical
 * conversions (Time programme C1, 2026-11-20; design:
 * docs/ansci/time-scheduling-design-note.md §8.3–§8.5,
 * §8.11, slice §8.12-C1).
 *
 * The port's vectors: generated from the book's own
 * reference implementation — Dershowitz & Reingold's
 * public Lisp distribution (EdReingold/calendar-code2,
 * Apache-2.0), executed under SBCL at build time — and
 * cross-checked against independently known anchors
 * (R.D. 719163 = Thursday 1970-01-01; R.D. 1 a Monday;
 * Julian 1582-10-04 and Gregorian 1582-10-15 on
 * consecutive fixed days, the historical cutover). The
 * book's printed Appendix C table was not in the public
 * distribution; the reference implementation's own outputs
 * are the strongest vectors available, and the C1 report
 * says so plainly.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CalendarRegister,
  addMonths,
  convertDate,
  dayOfWeekFromFixed,
  daysInMonth,
  fixedFromGregorian,
  fixedFromIso,
  fixedFromJulian,
  fromFixed,
  gregorianDate,
  gregorianFromFixed,
  isoDate,
  isoFromFixed,
  isoLongYear,
  julianDate,
  julianFromFixed,
  toFixed,
  weekdayOf,
} from "../src/ansci/calendar";

/* The reference implementation's decompositions:
 * [fixed, gregorian, julian, iso, day-of-week (0=Sunday)] */
const RD_VECTORS: [number, [number, number, number], [number, number, number], [number, number, number], number][] = [
  [-214193, [-586, 7, 24], [-587, 7, 30], [-586, 29, 7], 0],
  [-61387, [-168, 12, 5], [-169, 12, 8], [-168, 49, 3], 3],
  [-35422, [-96, 1, 8], [-97, 1, 10], [-96, 1, 5], 5],
  [-7270, [-19, 2, 4], [-20, 2, 6], [-19, 6, 3], 3],
  [-6458, [-17, 4, 27], [-18, 4, 29], [-17, 17, 3], 3],
  [-2721, [-7, 7, 20], [-8, 7, 22], [-7, 29, 2], 2],
  [-1744, [-4, 3, 23], [-5, 3, 25], [-4, 12, 6], 6],
  [-450, [-1, 10, 8], [-2, 10, 10], [-1, 40, 5], 5],
  [-3, [0, 12, 28], [-1, 12, 30], [0, 52, 4], 4],
  [0, [0, 12, 31], [1, 1, 2], [0, 52, 7], 0],
  [1, [1, 1, 1], [1, 1, 3], [1, 1, 1], 1],
  [10, [1, 1, 10], [1, 1, 12], [1, 2, 3], 3],
  [364, [1, 12, 30], [2, 1, 1], [1, 52, 7], 0],
  [365, [1, 12, 31], [2, 1, 2], [2, 1, 1], 1],
  [1000, [3, 9, 27], [3, 9, 29], [3, 39, 6], 6],
  [1461, [4, 12, 31], [5, 1, 2], [4, 53, 5], 5],
  [719163, [1970, 1, 1], [1969, 12, 19], [1970, 1, 4], 4],
  [735129, [2013, 9, 18], [2013, 9, 5], [2013, 38, 3], 3],
  [739940, [2026, 11, 20], [2026, 11, 7], [2026, 47, 5], 5],
  [764652, [2094, 7, 18], [2094, 7, 5], [2094, 28, 7], 0],
  [1000000, [2738, 11, 28], [2738, 11, 9], [2738, 48, 1], 1],
];

test("the port against the reference implementation: every vector decomposes and recomposes, in all three systems", () => {
  for (const [fixed, g, j, i, dow] of RD_VECTORS) {
    assert.deepEqual(gregorianFromFixed(fixed), gregorianDate(g[0], g[1], g[2]), `gregorian of R.D. ${fixed}`);
    assert.deepEqual(julianFromFixed(fixed), julianDate(j[0], j[1], j[2]), `julian of R.D. ${fixed}`);
    assert.deepEqual(isoFromFixed(fixed), isoDate(i[0], i[1], i[2]), `iso of R.D. ${fixed}`);
    assert.equal(dayOfWeekFromFixed(fixed), dow, `weekday of R.D. ${fixed}`);
    assert.equal(fixedFromGregorian(gregorianDate(g[0], g[1], g[2])), fixed);
    assert.equal(fixedFromJulian(julianDate(j[0], j[1], j[2])), fixed);
    assert.equal(fixedFromIso(isoDate(i[0], i[1], i[2])), fixed);
  }
});

test("date-to-fixed vectors: leap and century edges, the 1582 cutover pair, the Julian epoch", () => {
  const g2f: [[number, number, number], number][] = [
    [[1, 1, 1], 1],
    [[0, 12, 31], 0],
    [[4, 2, 29], 1155],
    [[100, 3, 1], 36219],
    [[400, 2, 29], 145791],
    [[1900, 3, 1], 693655],
    [[2000, 2, 29], 730179],
    [[2024, 2, 29], 738945],
    [[2026, 1, 31], 739647],
    [[2026, 11, 20], 739940],
    [[1582, 10, 15], 577736],
    [[-4713, 11, 24], -1721425],
  ];
  for (const [[y, m, d], fixed] of g2f) {
    assert.equal(fixedFromGregorian(gregorianDate(y, m, d)), fixed, `gregorian ${y}-${m}-${d}`);
  }
  assert.equal(fixedFromJulian(julianDate(1, 1, 1)), -1, "the Julian epoch, as the book defines it");
  assert.equal(fixedFromJulian(julianDate(70, 9, 26)), 25469);
  assert.equal(fixedFromJulian(julianDate(1582, 10, 4)), 577735, "the day before the Gregorian cutover's first day");
  assert.equal(fixedFromJulian(julianDate(2026, 11, 7)), 739940);
  assert.equal(fixedFromIso(isoDate(2020, 53, 7)), 737793);
  assert.equal(fixedFromIso(isoDate(2019, 52, 7)), 737422);
});

test("round-trip identity over a wide sweep, all three systems (verification by construction)", () => {
  for (let fixed = -200000; fixed <= 800000; fixed += 97) {
    for (const system of ["gregorian", "julian", "iso"] as const) {
      const date = fromFixed(system, fixed);
      assert.ok(!("status" in date), `${system} conversion stands`);
      if (!("status" in date)) assert.equal(toFixed(date), fixed, `${system} round-trip at R.D. ${fixed}`);
    }
  }
});

/* ---------------- the register and conversion (§8.3, §8.5) ---------------- */

test("the register holds the three arithmetical systems as knowledge, each with its provenance and structure stated", () => {
  const register = new CalendarRegister();
  assert.deepEqual(register.heldSystems().map((s) => s.id), ["gregorian", "iso", "julian"]);
  for (const system of register.heldSystems()) {
    assert.equal(system.kind, "arithmetical");
    assert.match(system.provenance.source, /Calendrical Calculations/);
    assert.ok(system.epoch.length > 0 && system.monthStructure.length > 0 && system.intercalation.length > 0);
  }
});

test("conversion: a date converts between held systems with the derivation cited — derived provenance, never testimony", () => {
  const result = convertDate(gregorianDate(2026, 11, 20), "julian");
  assert.equal(result.status, "converted");
  if (result.status !== "converted") return;
  assert.deepEqual(result.date, julianDate(2026, 11, 7));
  assert.equal(result.derivation.kind, "derived");
  assert.equal(result.derivation.fixed, 739940);
  assert.match(result.derivation.detail, /computation over the holdings, never testimony/);
  assert.equal(result.derivation.inputs.length, 3, "the date as stated, the system converted to, the machinery");
  const back = convertDate(julianDate(1582, 10, 4), "gregorian");
  assert.equal(back.status, "converted");
  if (back.status === "converted") assert.deepEqual(back.date, gregorianDate(1582, 10, 14));
});

test("the unheld-system decline (§8.11): located at the holding, in its words — no approximation from the name", () => {
  const result = convertDate(gregorianDate(2026, 11, 20), "mayan");
  assert.equal(result.status, "unheld-system");
  if (result.status !== "unheld-system") return;
  assert.match(result.detail, /not held/);
  assert.match(result.detail, /does not approximate the system from its name/);
  const from = fromFixed("mayan", 739940);
  assert.ok("status" in from && from.status === "unheld-system");
});

/* ---------------- grid arithmetic (§8.4) ---------------- */

test("grid arithmetic vs duration arithmetic, side by side: 'one month from now' and '+ 30 days' from 31 January give their different, correct answers", () => {
  const start = gregorianDate(2026, 1, 31);
  const oneMonth = addMonths(start, 1);
  assert.deepEqual(oneMonth, gregorianDate(2026, 2, 28), "one month from 31 January lands on February's last day — the operation's stated rule");
  const plusThirty = gregorianFromFixed(toFixed(start) + 30);
  assert.deepEqual(plusThirty, gregorianDate(2026, 3, 2), "+30 days is a duration: the same on every grid that has days");
  assert.notDeepEqual(oneMonth, plusThirty, "the two questions have different answers, and both are correct (§8.4)");
});

test("grid arithmetic: month addition across years and leap Februaries; weekday and days-in-month as grid questions", () => {
  assert.deepEqual(addMonths(gregorianDate(2026, 11, 20), 1), gregorianDate(2026, 12, 20));
  assert.deepEqual(addMonths(gregorianDate(2026, 12, 31), 1), gregorianDate(2027, 1, 31));
  assert.deepEqual(addMonths(gregorianDate(2024, 1, 31), 1), gregorianDate(2024, 2, 29), "a leap February takes the 29th");
  assert.deepEqual(addMonths(julianDate(1900, 1, 31), 1), julianDate(1900, 2, 29), "1900 is a Julian leap year and not a Gregorian one");
  assert.deepEqual(addMonths(gregorianDate(2026, 3, 31), -1), gregorianDate(2026, 2, 28), "backwards across the short month");
  assert.equal(weekdayOf(gregorianDate(2026, 11, 20)), "Friday");
  assert.equal(weekdayOf(gregorianDate(1970, 1, 1)), "Thursday");
  assert.deepEqual(daysInMonth("gregorian", 2026, 2), { status: "ok", days: 28 });
  assert.deepEqual(daysInMonth("gregorian", 2024, 2), { status: "ok", days: 29 });
  assert.deepEqual(daysInMonth("julian", 1900, 2), { status: "ok", days: 29 });
  const isoMonths = daysInMonth("iso", 2026, 2);
  assert.equal(isoMonths.status, "no-months", "the ISO grid has no months, and the question declines at its structure");
  assert.equal(isoLongYear(2020), true);
  assert.equal(isoLongYear(2026), true, "2026 begins on a Thursday");
  assert.equal(isoLongYear(2025), false);
});
