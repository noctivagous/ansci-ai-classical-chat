/**
 * calendar.ts — Calendar (Time programme C1, 2026-11-20;
 * design: docs/ansci/time-scheduling-design-note.md §8.3–
 * §8.5, §8.11, slice §8.12-C1). The operations seat is
 * functions/calendar; the holdings — date systems held as
 * knowledge — live here beside the operations, in one
 * register, the way the geography note's register holds
 * places.
 *
 * A calendar system, as a holding (§8.3), is a record: its
 * name and provenance (the attested statement of the
 * system — where it is described, and by what intake the
 * description was banked); its epoch and year count; its
 * month structure; its intercalation rule; and its named
 * points of the year. C1 holds three ARITHMETICAL systems
 * — the Gregorian, the ISO week calendar, and the Julian
 * — each specified completely by arithmetic in Part I of
 * the port's source. The Chinese lunisolar is C2's
 * holding: astronomical, not arithmetical, and not
 * approximated here (§8.5's first qualification).
 *
 * THE PORT (§8.5). The conversion machinery is a port of
 * Dershowitz & Reingold, *Calendrical Calculations*, 4th
 * edition (Cambridge University Press, 2018) — the
 * algorithms as the book states them, taken from the
 * authors' own public Lisp distribution
 * (github.com/EdReingold/calendar-code2, Apache License
 * 2.0), Part I's arithmetical chapters for this slice.
 * Calendrics is not re-derived here (the owner's
 * solved-problem rule). Every date converts through the
 * book's fixed-date count (R.D.: day 1 = January 1 of
 * year 1 on the proleptic Gregorian calendar, a Monday).
 *
 * CONVERSION IS COMPUTATION (§8.5). A converted date takes
 * the derived provenance kind: it cites its inputs — the
 * date as stated and the system it stands in, the system
 * converted to, and the conversion machinery (this port,
 * and its source) — and through them the two system
 * records' provenance. A converted date is never testimony
 * that a date *is* anything in the second system; it is
 * the grid's answer, auditable to the systems held.
 *
 * GRID ARITHMETIC IS NOT DURATION ARITHMETIC (§8.4).
 * "+ 30 days" is a duration question — Quantification's,
 * grid-free. "One month from now" is a grid question, and
 * only the grid answers it: a month is a unit of a system,
 * irregular by convention. This module holds the grid
 * operations (month addition, weekday, days-in-month); the
 * duration side stays where §8.4 leaves it, and the two
 * answers from one date are different, both correct, side
 * by side in the C1 tests.
 *
 * A system not held is a system the machinery declines on
 * (§8.11): the unheld-system decline, located at the
 * holding, returned as data by every operation that names
 * a system — the machinery does not approximate a system
 * from its name.
 */

/* ------------------------------------------------------------------ */
/* The port's arithmetic substrate (book ch. 1)                         */
/* ------------------------------------------------------------------ */

/** The book's quotient: the whole part of m/n, floored —
 *  Lisp (floor m n). */
function quotient(m: number, n: number): number {
  return Math.floor(m / n);
}

/** The book's mod: the floored remainder, its sign the
 *  divisor's — Lisp (mod x y). */
function mod(x: number, y: number): number {
  return x - y * Math.floor(x / y);
}

/** The book's amod: (x mod y) with y instead of 0 — the
 *  adjusted remainder, in 1..y for positive y. */
function amod(x: number, y: number): number {
  const r = mod(x, y);
  return r === 0 ? y : r;
}

/** Day of week of a fixed date: 0 = Sunday … 6 = Saturday
 *  (the book's day-of-week-from-fixed; R.D. 1 was a
 *  Monday, residue 1). */
export function dayOfWeekFromFixed(date: number): number {
  return mod(date, 7);
}

const SUNDAY = 0;

function kdayOnOrBefore(k: number, date: number): number {
  return date - dayOfWeekFromFixed(date - k);
}

function kdayBefore(k: number, date: number): number {
  return kdayOnOrBefore(k, date - 1);
}

/** The book's nth-kday, for n > 0 (the only direction the
 *  ISO conversion uses). */
function nthKdayAfter(n: number, k: number, gDate: GregorianDate): number {
  return 7 * n + kdayBefore(k, fixedFromGregorian(gDate));
}

/* ------------------------------------------------------------------ */
/* Dates                                                                */
/* ------------------------------------------------------------------ */

export interface GregorianDate {
  system: "gregorian";
  year: number;
  month: number;
  day: number;
}

export interface JulianDate {
  system: "julian";
  year: number;
  month: number;
  day: number;
}

export interface IsoDate {
  system: "iso";
  year: number;
  week: number;
  /** 1 = Monday … 7 = Sunday (the book's ISO day, amod of
   *  the fixed date). */
  day: number;
}

/** A Chinese lunisolar date (C2): the cycle and the year
 *  within it, the month and its leap standing, the day.
 *  The type stands here; the astronomical machinery that
 *  converts it stands in calendar-chinese.ts and registers
 *  with the conversion dispatch below. */
export interface ChineseDate {
  system: "chinese";
  cycle: number;
  /** Year within the 60-year cycle, 1–60. */
  year: number;
  /** Month, 1–12. */
  month: number;
  /** Whether the month is the year's leap month (a leap
   *  month takes the previous month's number; the number
   *  is held here with the leap standing set). */
  leap: boolean;
  /** Day of the month, 1–30. */
  day: number;
}

export type CalendarDate = GregorianDate | JulianDate | IsoDate | ChineseDate;

export function gregorianDate(year: number, month: number, day: number): GregorianDate {
  return { system: "gregorian", year, month, day };
}

export function julianDate(year: number, month: number, day: number): JulianDate {
  return { system: "julian", year, month, day };
}

export function isoDate(year: number, week: number, day: number): IsoDate {
  return { system: "iso", year, week, day };
}

export function chineseDate(cycle: number, year: number, month: number, leap: boolean, day: number): ChineseDate {
  return { system: "chinese", cycle, year, month, leap, day };
}

/* ------------------------------------------------------------------ */
/* The Gregorian calendar (book ch. 2)                                  */
/* ------------------------------------------------------------------ */

export const GREGORIAN_EPOCH = 1; // (rd 1)

export function gregorianLeapYear(year: number): boolean {
  return mod(year, 4) === 0 && ![100, 200, 300].includes(mod(year, 400));
}

export function fixedFromGregorian(g: GregorianDate): number {
  const { month, day, year } = g;
  return (
    GREGORIAN_EPOCH -
    1 +
    365 * (year - 1) +
    quotient(year - 1, 4) -
    quotient(year - 1, 100) +
    quotient(year - 1, 400) +
    quotient(367 * month - 362, 12) +
    (month <= 2 ? 0 : gregorianLeapYear(year) ? -1 : -2) +
    day
  );
}

export function gregorianYearFromFixed(date: number): number {
  const d0 = date - GREGORIAN_EPOCH;
  const n400 = quotient(d0, 146097);
  const d1 = mod(d0, 146097);
  const n100 = quotient(d1, 36524);
  const d2 = mod(d1, 36524);
  const n4 = quotient(d2, 1461);
  const d3 = mod(d2, 1461);
  const n1 = quotient(d3, 365);
  const year = 400 * n400 + 100 * n100 + 4 * n4 + n1;
  return n100 === 4 || n1 === 4 ? year : year + 1;
}

export function gregorianNewYear(year: number): number {
  return fixedFromGregorian(gregorianDate(year, 1, 1));
}

export function gregorianFromFixed(date: number): GregorianDate {
  const year = gregorianYearFromFixed(date);
  const priorDays = date - gregorianNewYear(year);
  const correction =
    date < fixedFromGregorian(gregorianDate(year, 3, 1)) ? 0 : gregorianLeapYear(year) ? 1 : 2;
  const month = quotient(12 * (priorDays + correction) + 373, 367);
  const day = 1 + (date - fixedFromGregorian(gregorianDate(year, month, 1)));
  return gregorianDate(year, month, day);
}

/** The book's last-day-of-gregorian-month, computed as
 *  the date difference it is defined as. */
export function lastDayOfGregorianMonth(year: number, month: number): number {
  const next = month === 12 ? gregorianDate(year + 1, 1, 1) : gregorianDate(year, month + 1, 1);
  return fixedFromGregorian(next) - fixedFromGregorian(gregorianDate(year, month, 1));
}

/* ------------------------------------------------------------------ */
/* The Julian calendar (book ch. 3)                                     */
/* ------------------------------------------------------------------ */

/** The book defines the Julian epoch from the Gregorian:
 *  fixed-from-gregorian of (0, December, 30) = R.D. -1. */
export const JULIAN_EPOCH = fixedFromGregorian(gregorianDate(0, 12, 30));

export function julianLeapYear(year: number): boolean {
  return mod(year, 4) === (year > 0 ? 0 : 3);
}

export function fixedFromJulian(j: JulianDate): number {
  const { month, day, year } = j;
  const y = year < 0 ? year + 1 : year; // no year zero
  return (
    JULIAN_EPOCH -
    1 +
    365 * (y - 1) +
    quotient(y - 1, 4) +
    quotient(367 * month - 362, 12) +
    (month <= 2 ? 0 : julianLeapYear(year) ? -1 : -2) +
    day
  );
}

export function julianFromFixed(date: number): JulianDate {
  const approx = quotient(4 * (date - JULIAN_EPOCH) + 1464, 1461);
  const year = approx <= 0 ? approx - 1 : approx; // no year 0
  const priorDays = date - fixedFromJulian(julianDate(year, 1, 1));
  const correction =
    date < fixedFromJulian(julianDate(year, 3, 1)) ? 0 : julianLeapYear(year) ? 1 : 2;
  const month = quotient(12 * (priorDays + correction) + 373, 367);
  const day = 1 + (date - fixedFromJulian(julianDate(year, month, 1)));
  return julianDate(year, month, day);
}

export function lastDayOfJulianMonth(year: number, month: number): number {
  const next = month === 12 ? julianDate(year + 1, 1, 1) : julianDate(year, month + 1, 1);
  return fixedFromJulian(next) - fixedFromJulian(julianDate(year, month, 1));
}

/* ------------------------------------------------------------------ */
/* The ISO calendar (book ch. 5)                                        */
/* ------------------------------------------------------------------ */

export function fixedFromIso(i: IsoDate): number {
  return nthKdayAfter(i.week, SUNDAY, gregorianDate(i.year - 1, 12, 28)) + i.day;
}

export function isoFromFixed(date: number): IsoDate {
  const approx = gregorianYearFromFixed(date - 3);
  const year = date >= fixedFromIso(isoDate(approx + 1, 1, 1)) ? approx + 1 : approx;
  const week = 1 + quotient(date - fixedFromIso(isoDate(year, 1, 1)), 7);
  const day = amod(date, 7);
  return isoDate(year, week, day);
}

/** True if the ISO year is a long (53-week) year. */
export function isoLongYear(year: number): boolean {
  const jan1 = dayOfWeekFromFixed(gregorianNewYear(year));
  const dec31 = dayOfWeekFromFixed(fixedFromGregorian(gregorianDate(year, 12, 31)));
  return jan1 === 4 || dec31 === 4; // thursday
}

/* ------------------------------------------------------------------ */
/* The systems register (§8.3)                                          */
/* ------------------------------------------------------------------ */

/** A system holding's attestation: the attested statement
 *  of the system — where it is described, and by what
 *  intake the description was banked (§8.3). */
export interface CalendarSystemProvenance {
  kind: "stated";
  /** The describing source, named. */
  source: string;
  detail: string;
}

export interface CalendarSystem {
  id: string;
  name: string;
  /** Arithmetical systems are specified completely by
   *  arithmetic (the book's Part I); astronomical systems
   *  rest on computed celestial events (Part II). C2's
   *  lunisolar record carries the second kind. */
  kind: "arithmetical" | "astronomical";
  provenance: CalendarSystemProvenance;
  /** The system's epoch and year count, stated. */
  epoch: string;
  /** The month structure, stated. */
  monthStructure: string;
  /** The intercalation rule, stated. */
  intercalation: string;
  /** Named points of the year, where the system has them
   *  (the lunisolar's 24 solar terms are C2's). */
  namedPoints?: string;
  /** A qualification that bites on conversions by era
   *  (§8.5's "decline or qualify"): given the fixed date a
   *  conversion passes through, the qualification text to
   *  attach to the derivation, or undefined where none
   *  bites. The Chinese holding qualifies pre-1645
   *  conversions (the modern system only). */
  qualification?: (fixed: number) => string | undefined;
}

const PORT_SOURCE =
  "Dershowitz & Reingold, Calendrical Calculations, 4th edition (Cambridge University Press, 2018) — " +
  "the algorithms as stated in the book, ported from the authors' public Lisp distribution " +
  "(github.com/EdReingold/calendar-code2, Apache License 2.0)";

export const GREGORIAN_SYSTEM: CalendarSystem = {
  id: "gregorian",
  name: "Gregorian",
  kind: "arithmetical",
  provenance: {
    kind: "stated",
    source: PORT_SOURCE,
    detail:
      "Part I, chapter 2: the Gregorian calendar — the civil calendar the frame's ISO input already " +
      "assumes and the host clock's readings stand in (§8.3). Banked by the C1 intake: the port itself " +
      "is the description, executed.",
  },
  epoch: "R.D. 1 — January 1 of year 1, proleptic; years counted from 1, with year 0 and negative years in the proleptic extension the arithmetic defines",
  monthStructure: "12 months of 31, 28/29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 days",
  intercalation: "a leap day in February in years divisible by 4, except century years not divisible by 400",
};

export const ISO_SYSTEM: CalendarSystem = {
  id: "iso",
  name: "ISO week calendar",
  kind: "arithmetical",
  provenance: {
    kind: "stated",
    source: PORT_SOURCE,
    detail:
      "Part I, chapter 5: the ISO calendar — years of 52 or 53 whole weeks, the first week the one " +
      "holding the year's first Thursday. Banked by the C1 intake, with the Gregorian it rides on.",
  },
  epoch: "the Gregorian epoch, counted in weeks: ISO year 1 week 1 day 1 is R.D. 1",
  monthStructure: "no months: years of 52 or 53 weeks of 7 days, days numbered 1 (Monday) to 7 (Sunday)",
  intercalation: "a 53rd week in long years — those whose Gregorian year begins or ends on a Thursday",
};

export const JULIAN_SYSTEM: CalendarSystem = {
  id: "julian",
  name: "Julian",
  kind: "arithmetical",
  provenance: {
    kind: "stated",
    source: PORT_SOURCE,
    detail:
      "Part I, chapter 3: the Julian calendar — held for historical European dates (§8.3 names it the " +
      "standing example of a third holding). Banked by the C1 intake.",
  },
  epoch: "R.D. -1 — January 1 of Julian year 1 (Gregorian year 0, December 30); no year zero: year -1 is followed by year 1",
  monthStructure: "12 months of the Gregorian lengths, February 29 in leap years",
  intercalation: "a leap day in February every fourth year (in negative years, the years congruent to 3 mod 4, there being no year zero)",
};

/** The systems register: the calendar systems the system
 *  holds, as knowledge. Session-independent — a deployment
 *  holds the same systems for every conversation, as the
 *  place register's configured facts do; C2's intake adds
 *  the lunisolar record here. */
export class CalendarRegister {
  private readonly systems = new Map<string, CalendarSystem>();

  constructor(systems: CalendarSystem[] = [GREGORIAN_SYSTEM, ISO_SYSTEM, JULIAN_SYSTEM]) {
    for (const system of systems) this.systems.set(system.id, system);
  }

  systemById(id: string): CalendarSystem | undefined {
    return this.systems.get(id);
  }

  heldSystems(): CalendarSystem[] {
    return [...this.systems.values()];
  }

  hold(system: CalendarSystem): void {
    this.systems.set(system.id, system);
  }
}

export const defaultCalendarRegister = new CalendarRegister();

/* ------------------------------------------------------------------ */
/* Conversion — computation with derived provenance (§8.5)              */
/* ------------------------------------------------------------------ */

/** A converted date's derivation record (§8.5): the date
 *  as stated and the system it stands in, the system
 *  converted to, and the conversion machinery — through
 *  which the two system records' provenance is cited. The
 *  derived kind: the result cites its inputs' provenance
 *  and carries none of its own. */
export interface ConversionDerivation {
  kind: "derived";
  detail: string;
  inputs: string[];
  /** The fixed date the conversion passed through — the
   *  port's substrate, stated so the derivation is
   *  auditable step by step. */
  fixed: number;
}

export type ConversionResult =
  | { status: "converted"; date: CalendarDate; derivation: ConversionDerivation }
  | { status: "unheld-system"; system: string; detail: string };

/** The §8.11 decline, in its words: located at the holding. */
export function unheldSystemDecline(register: CalendarRegister, systemId: string): ConversionResult {
  return {
    status: "unheld-system",
    system: systemId,
    detail:
      `the calendar system '${systemId}' is not held: the systems register holds ` +
      `${register.heldSystems().map((s) => s.id).join(", ")} — a date, a conversion or a placement naming ` +
      `an unheld system declines at the holding, and the machinery does not approximate the system ` +
      `from its name (§8.11)`,
  };
}

/* ------------------------------------------------------------------ */
/* Astronomical machinery registry                                       */
/* ------------------------------------------------------------------ */

/** Conversion machinery for a held system whose conversions
 *  are not arithmetical (C2's lunisolar): the system's own
 *  module registers its machinery here at load, and the
 *  dispatch below routes through it. A held system with no
 *  machinery registered declines at the missing machinery. */
export interface SystemMachinery {
  toFixed(date: CalendarDate): number;
  fromFixed(fixed: number): CalendarDate;
}

const SYSTEM_MACHINERY = new Map<string, SystemMachinery>();

export function registerSystemMachinery(systemId: string, machinery: SystemMachinery): void {
  SYSTEM_MACHINERY.set(systemId, machinery);
}

export function hasSystemMachinery(systemId: string): boolean {
  return SYSTEM_MACHINERY.has(systemId);
}

export function toFixed(date: CalendarDate): number {
  switch (date.system) {
    case "gregorian":
      return fixedFromGregorian(date);
    case "julian":
      return fixedFromJulian(date);
    case "iso":
      return fixedFromIso(date);
    case "chinese": {
      const machinery = SYSTEM_MACHINERY.get("chinese");
      if (!machinery) {
        throw new Error(
          "the Chinese system is held but its conversion machinery (calendar-chinese.ts) has not " +
            "been loaded — the decline is located at the missing machinery (§8.11's discipline, one step in)",
        );
      }
      return machinery.toFixed(date);
    }
  }
}

export function fromFixed(systemId: string, fixed: number, register: CalendarRegister = defaultCalendarRegister): CalendarDate | ConversionResult {
  if (!register.systemById(systemId)) return unheldSystemDecline(register, systemId);
  switch (systemId) {
    case "gregorian":
      return gregorianFromFixed(fixed);
    case "julian":
      return julianFromFixed(fixed);
    case "iso":
      return isoFromFixed(fixed);
    default: {
      const machinery = SYSTEM_MACHINERY.get(systemId);
      if (machinery) return machinery.fromFixed(fixed);
      // A held system with no conversion machinery standing
      // (its module not loaded, or not built).
      return {
        status: "unheld-system",
        system: systemId,
        detail:
          `the calendar system '${systemId}' is held, but no conversion machinery for it stands in ` +
          `this slice — the decline is located at the missing machinery, not at the holding (§8.11's ` +
          `discipline, one step in)`,
      };
    }
  }
}

function describeDate(date: CalendarDate): string {
  switch (date.system) {
    case "gregorian":
      return `Gregorian ${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
    case "julian":
      return `Julian ${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
    case "iso":
      return `ISO ${date.year}-W${String(date.week).padStart(2, "0")}-${date.day}`;
    case "chinese":
      return (
        `Chinese cycle ${date.cycle}, year ${date.year}, month ${date.month}` +
        `${date.leap ? " (leap)" : ""}, day ${date.day}`
      );
  }
}

/** Convert a date between held systems (§8.5): computation
 *  over the holdings, its result carrying the derived
 *  provenance — never testimony. */
export function convertDate(
  date: CalendarDate,
  toSystemId: string,
  register: CalendarRegister = defaultCalendarRegister,
): ConversionResult {
  const from = register.systemById(date.system);
  if (!from) return unheldSystemDecline(register, date.system);
  const to = register.systemById(toSystemId);
  if (!to) return unheldSystemDecline(register, toSystemId);
  const fixed = toFixed(date);
  const converted = fromFixed(toSystemId, fixed, register);
  if ("status" in converted) return converted;
  const inputs = [
    `the date as stated: ${describeDate(date)}, in the ${from.name} system (${from.provenance.source})`,
    `the system converted to: ${to.name} (${to.provenance.source})`,
    `the conversion machinery: the Calendrical Calculations port (calendar.ts), from the authors' Lisp distribution`,
  ];
  // §8.5's qualifications, where they bite: a system may
  // qualify a conversion by era (the Chinese holding is
  // the modern system only), and the qualification rides
  // the derivation rather than passing silently.
  for (const system of [from, to]) {
    const qualification = system.qualification?.(fixed);
    if (qualification) inputs.push(`qualification (${system.name}): ${qualification}`);
  }
  return {
    status: "converted",
    date: converted,
    derivation: {
      kind: "derived",
      detail:
        `converted from ${describeDate(date)} to ${describeDate(converted)} through the fixed-date ` +
        `count (R.D. ${fixed}) by the Calendrical Calculations port — computation over the holdings, ` +
        `never testimony that the date *is* anything in the second system (§8.5)`,
      inputs,
      fixed,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Grid arithmetic (§8.4)                                               */
/* ------------------------------------------------------------------ */

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The weekday of a date in any held system — a grid
 *  question (§8.4), answered on the fixed count. */
export function weekdayOf(date: CalendarDate): string {
  return WEEKDAY_NAMES[dayOfWeekFromFixed(toFixed(date))];
}

/** Days in a month of a held month-bearing system. The
 *  ISO calendar has no months: the question declines at
 *  the system's structure, stated. */
export function daysInMonth(
  systemId: string,
  year: number,
  month: number,
  register: CalendarRegister = defaultCalendarRegister,
): { status: "ok"; days: number } | { status: "unheld-system"; system: string; detail: string } | { status: "no-months"; system: string; detail: string } {
  if (!register.systemById(systemId)) {
    const decline = unheldSystemDecline(register, systemId);
    return { status: "unheld-system", system: systemId, detail: decline.status === "unheld-system" ? decline.detail : "" };
  }
  if (systemId === "gregorian") return { status: "ok", days: lastDayOfGregorianMonth(year, month) };
  if (systemId === "julian") return { status: "ok", days: lastDayOfJulianMonth(year, month) };
  if (systemId === "chinese") {
    return {
      status: "no-months",
      system: systemId,
      detail:
        "the Chinese system is held, but its months are not counted by year and month alone: a " +
        "lunisolar month is identified by cycle, year, month and leap standing, and its length " +
        "(29 or 30 days) is read from the conversion machinery — the fixed dates of its bounds — " +
        "not from a (year, month) question (calendar-chinese.ts)",
    };
  }
  return {
    status: "no-months",
    system: systemId,
    detail: `the ${systemId} system has no months — its years are weeks (§8.3's record of its structure); days-in-month is a question its grid does not carry`,
  };
}

/**
 * Add whole months on the grid (§8.4): "one month from
 * now" is this operation, and no duration answers it. The
 * operation's stated rule for a day the target month
 * lacks: the date lands on the target month's LAST day
 * (31 January + 1 month = 28/29 February). The rule is
 * stated here, in the operation, so no caller improvises
 * it; §8.10's placements state their own rule on the
 * item, which may differ — placement rules are the
 * placement's, and C3 records them there.
 */
export function addMonths(date: GregorianDate | JulianDate, months: number): GregorianDate | JulianDate {
  // Julian years have no zero (year -1 is followed by
  // year 1), so Julian month arithmetic runs in the
  // continuous astronomical count (year 0 = Julian -1)
  // and converts back; the Gregorian count is already
  // continuous in the proleptic numbering the port uses.
  const continuous = date.system === "julian" && date.year < 0 ? date.year + 1 : date.year;
  const total = continuous * 12 + (date.month - 1) + months;
  const contYear = quotient(total, 12);
  const month = mod(total, 12) + 1;
  const year = date.system === "julian" && contYear <= 0 ? contYear - 1 : contYear;
  const last = date.system === "gregorian" ? lastDayOfGregorianMonth(year, month) : lastDayOfJulianMonth(year, month);
  const day = Math.min(date.day, last);
  return date.system === "gregorian" ? gregorianDate(year, month, day) : julianDate(year, month, day);
}

/** The day number within its year (the book's day-number),
 *  for a Gregorian date. */
export function dayOfYear(date: GregorianDate): number {
  return fixedFromGregorian(date) - fixedFromGregorian(gregorianDate(date.year - 1, 12, 31));
}
