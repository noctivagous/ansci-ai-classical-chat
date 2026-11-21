/**
 * ansci-time-c2.test.ts — the lunisolar held (Time
 * programme C2, 2026-11-20; design:
 * docs/ansci/time-scheduling-design-note.md §8.3, §8.5,
 * §8.6, slice §8.12-C2).
 *
 * The port's vectors come from the book's own reference
 * implementation (Dershowitz & Reingold's public Lisp
 * distribution, executed under SBCL), REGENERATED for
 * this slice with the implementation's own round-trips
 * checked inside the same run — the first generation of
 * the Chinese vectors was internally inconsistent (its
 * New Year figures disagreed with the implementation's
 * round-trips and with known dates) and was discarded;
 * the C2 report tells that plainly. The regenerated set
 * is cross-checked here against independently known
 * anchors, computed through C1's verified Gregorian
 * port: Chinese New Year fell on 31 Jan 1900 (R.D.
 * 693626, from 1900-03-01 = 693655), 10 Feb 2024 (R.D.
 * 738926, from 2024-02-29 = 738945), 29 Jan 2025 (R.D.
 * 739280) and 17 Feb 2026 (R.D. 739664).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  chineseDate,
  convertDate,
  daysInMonth,
  defaultCalendarRegister,
  fromFixed,
  gregorianDate,
  toFixed,
} from "../src/ansci/calendar";
import {
  CHINESE_EPOCH,
  SOLAR_TERMS,
  chineseFromFixed,
  chineseNewYear,
  chineseYearName,
  currentMajorSolarTerm,
  currentMinorSolarTerm,
  currentSolarTerms,
  fixedFromChinese,
  majorSolarTermOnOrAfter,
  minorSolarTermOnOrAfter,
} from "../src/ansci/calendar-chinese";

test("the system stands in the register as an astronomical holding, its qualifications and named points stated", () => {
  const system = defaultCalendarRegister.systemById("chinese");
  assert.ok(system, "the Chinese system is held once calendar-chinese stands loaded");
  assert.equal(system.kind, "astronomical");
  assert.match(system.provenance.source, /Calendrical Calculations/);
  assert.match(system.provenance.detail, /MODERN system/);
  assert.match(system.intercalation, /no major solar term/);
  assert.match(system.monthStructure, /midnight in the Chinese standard-time zone/);
  assert.equal(CHINESE_EPOCH, -963099, "the book's epoch: the year beginning 15 February −2636 Gregorian");
  assert.equal(SOLAR_TERMS.length, 24, "the 24 solar terms are the system's named points (§8.6)");
});

test("Chinese New Year against the reference implementation, cross-checked on known dates", () => {
  const vectors: [number, number][] = [
    [1900, 693626], // 31 Jan 1900
    [1924, 702396],
    [1949, 711521],
    [1984, 724308],
    [2023, 738542],
    [2024, 738926], // 10 Feb 2024
    [2025, 739280], // 29 Jan 2025
    [2026, 739664], // 17 Feb 2026
    [2027, 740018],
    [2033, 742204],
    [2034, 742588],
  ];
  for (const [gYear, fixed] of vectors) {
    assert.equal(chineseNewYear(gYear), fixed, `Chinese New Year ${gYear}`);
    assert.deepEqual(chineseFromFixed(fixed).day, 1);
    assert.equal(chineseFromFixed(fixed).month, 1);
    assert.equal(chineseFromFixed(fixed).leap, false);
  }
});

test("fixed-to-Chinese against the reference implementation, with exact round-trips", () => {
  const vectors: [number, [number, number, number, boolean, number]][] = [
    [-9600, [44, 31, 8, false, 17]],
    [0, [44, 57, 11, false, 20]],
    [100000, [49, 31, 8, false, 29]],
    [719163, [77, 46, 11, false, 24]],
    [739940, [78, 43, 10, false, 12]],
    [742341, [78, 50, 5, false, 21]],
    [742529, [78, 50, 11, true, 1]],
    [742560, [78, 50, 12, false, 3]],
    [800000, [81, 28, 4, false, 6]],
  ];
  for (const [fixed, [cycle, year, month, leap, day]] of vectors) {
    const date = chineseFromFixed(fixed);
    assert.deepEqual(date, chineseDate(cycle, year, month, leap, day), `chinese of R.D. ${fixed}`);
    assert.equal(fixedFromChinese(date), fixed, `round-trip at R.D. ${fixed}`);
    assert.equal(toFixed(date), fixed);
    assert.deepEqual(fromFixed("chinese", fixed), date);
  }
});

test("2033: the leap month is the eleventh — the corrected record's placement, landed by the machinery", () => {
  // The year's months from its New Year (R.D. 742204):
  // the walk through the year reaches month 11, then a
  // LEAP eleventh month beginning R.D. 742529
  // (Gregorian 2033-12-22), then month 12.
  const leapEleven = chineseDate(78, 50, 11, true, 1);
  assert.deepEqual(chineseFromFixed(742529), leapEleven);
  assert.equal(fixedFromChinese(leapEleven), 742529);
  const asGregorian = convertDate(leapEleven, "gregorian");
  assert.equal(asGregorian.status, "converted");
  if (asGregorian.status === "converted") assert.deepEqual(asGregorian.date, gregorianDate(2033, 12, 22));
  assert.equal(chineseFromFixed(742518).month, 11);
  assert.equal(chineseFromFixed(742518).leap, false, "the regular eleventh month stands before the leap one");
  assert.equal(chineseFromFixed(742560).month, 12);
  // No leap seventh month anywhere in the year: the
  // months present are 1..12 with the single leap 11.
  const seen = new Set<string>();
  for (let fixed = 742204; fixed < 742590; fixed += 1) {
    const d = chineseFromFixed(fixed);
    if (d.day === 1) seen.add(`${d.month}${d.leap ? "L" : ""}`);
  }
  assert.deepEqual(
    [...seen].sort(),
    ["1", "10", "11", "11L", "12", "2", "3", "4", "5", "6", "7", "8", "9"].sort(),
    "thirteen months: 1–12 and the leap 11th, no other",
  );
});

test("round-trip identity across a common year and the 2033 leap year (verification by construction)", () => {
  for (let fixed = 739664; fixed < 739664 + 355; fixed += 1) {
    assert.equal(fixedFromChinese(chineseFromFixed(fixed)), fixed, `common-year round-trip at R.D. ${fixed}`);
  }
  for (let fixed = 742204; fixed < 742204 + 385; fixed += 3) {
    assert.equal(fixedFromChinese(chineseFromFixed(fixed)), fixed, `leap-year round-trip at R.D. ${fixed}`);
  }
});

test("conversion through the register: derived provenance, and the pre-1645 qualification where it bites (§8.5)", () => {
  const result = convertDate(gregorianDate(2026, 11, 20), "chinese");
  assert.equal(result.status, "converted");
  if (result.status !== "converted") return;
  assert.deepEqual(result.date, chineseDate(78, 43, 10, false, 12));
  assert.equal(result.derivation.kind, "derived");
  assert.ok(
    !result.derivation.inputs.some((i) => i.includes("qualification")),
    "no qualification bites on a modern date",
  );
  const old = convertDate(gregorianDate(1600, 6, 1), "chinese");
  assert.equal(old.status, "converted");
  if (old.status !== "converted") return;
  assert.ok(
    old.derivation.inputs.some((i) => i.includes("qualification") && i.includes("post-1645")),
    "a pre-1645 conversion carries the modern-system qualification on its derivation — stated, not silent",
  );
});

test("the solar terms: the machinery's indices land on the held names, and term moments fall where the real terms fall", () => {
  // 20 November 2026 stands after Frost's Descent
  // (Shuangjiang, 23 Oct) and Start of Winter (Lidong,
  // 7 Nov), before Minor Snow.
  assert.equal(currentMajorSolarTerm(739940), 9);
  assert.equal(currentMinorSolarTerm(739940), 10);
  const terms = currentSolarTerms(739940);
  assert.equal(terms.major.characters, "霜降");
  assert.equal(terms.major.name, "Shuangjiang");
  assert.equal(terms.minor.characters, "立冬");
  assert.equal(terms.minor.name, "Lidong");
  // The next major term begins on R.D. 739942
  // (22 Nov 2026, Minor Snow); the next minor on
  // R.D. 739957 (7 Dec 2026, Heavy Snow).
  assert.equal(Math.floor(majorSolarTermOnOrAfter(739940)), 739942);
  assert.equal(Math.floor(minorSolarTermOnOrAfter(739940)), 739957);
  // The winter solstice term is the major term at 270°.
  const solstice = SOLAR_TERMS.find((t) => t.characters === "冬至");
  assert.deepEqual([solstice?.longitude, solstice?.kind, solstice?.index], [270, "major", 11]);
});

test("the sexagesimal year name rides the holding: 2026's Chinese year is the fire-horse year (stem 3, branch 7)", () => {
  const date = chineseFromFixed(739940);
  assert.deepEqual(chineseYearName(date.year), { stem: 3, branch: 7 });
});

test("days-in-month declines at its own signature for the lunisolar: a (year, month) question does not identify a lunar month", () => {
  const result = daysInMonth("chinese", 43, 10);
  assert.equal(result.status, "no-months");
  if (result.status === "no-months") assert.match(result.detail, /cycle, year, month and leap standing/);
});
