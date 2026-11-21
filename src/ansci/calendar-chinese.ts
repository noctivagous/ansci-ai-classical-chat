/**
 * calendar-chinese.ts — the Chinese lunisolar, held (Time
 * programme C2, 2026-11-20; design:
 * docs/ansci/time-scheduling-design-note.md §8.3, §8.5,
 * §8.6, §8.12-C2).
 *
 * An ASTRONOMICAL system (§8.3): its conversions are not
 * arithmetic but computed astronomy — new moons and solar
 * terms at the Chinese standard-time meridian — and its
 * years carry a thirteenth month in seven years of
 * nineteen. The machinery is Part II of the same port as
 * C1: Dershowitz & Reingold, Calendrical Calculations,
 * 4th edition, chapter 18 (The Chinese Calendar) with the
 * astronomy substrate of chapter 14, transliterated from
 * the authors' public Lisp distribution
 * (github.com/EdReingold/calendar-code2, Apache License
 * 2.0). The coefficient series below were extracted from
 * that source programmatically at build time, not
 * transcribed by hand. Nothing here is re-derived.
 *
 * The system's qualifications stand in its register
 * record (§8.5): the ASTRONOMICAL basis (a conversion is
 * a computation over the stated machinery, as exact as
 * that machinery is), the LOCATION (the meridian is part
 * of the system: days begin at midnight in the Chinese
 * standard-time zone — Beijing, UTC+8 since 1929, the
 * meridian's local mean time before), and the MODERN
 * SYSTEM ONLY (post-1645 rules; a date recorded under a
 * dynastic era's own calendar is not converted by this
 * holding without anachronism — conversions before 1645
 * carry the qualification on their derivation).
 *
 * Not ported, because the calendar does not call them:
 * lunar latitude, lunar phase at-or-before/after, the
 * equation of time, precession and the sidereal
 * longitudes. The port is the dependency chain of
 * chinese-from-fixed / fixed-from-chinese, nothing more.
 */
import {
  CalendarSystem,
  ChineseDate,
  chineseDate,
  defaultCalendarRegister,
  fixedFromGregorian,
  gregorianDate,
  gregorianYearFromFixed,
  registerSystemMachinery,
} from "./calendar";

/* ------------------------------------------------------------------ */
/* The book's numeric substrate (as calendar.ts's Part I port)          */
/* ------------------------------------------------------------------ */

function quotient(m: number, n: number): number {
  return Math.floor(m / n);
}

function mod(x: number, y: number): number {
  return x - y * Math.floor(x / y);
}

function amod(x: number, y: number): number {
  const r = mod(x, y);
  return r === 0 ? y : r;
}

/** The value of x shifted into [a, b). */
function mod3(x: number, a: number, b: number): number {
  return a === b ? x : a + mod(x - a, b - a);
}

/** Sum of powers of x with coefficients from order 0 up. */
function poly(x: number, coefficients: number[]): number {
  let result = 0;
  for (let i = coefficients.length - 1; i >= 0; i--) result = result * x + coefficients[i];
  return result;
}

function sinDegrees(x: number): number {
  return Math.sin((x * Math.PI) / 180);
}

function cosDegrees(x: number): number {
  return Math.cos((x * Math.PI) / 180);
}

/** angle(d, m, s): degrees, arcminutes, arcseconds. */
function angle(d: number, m: number, s: number): number {
  return d + (m + s / 60) / 60;
}

/** The book's `final`: the last integer ≥ initial for
 *  which the condition holds (the condition is expected
 *  to hold at initial). */
function finalFrom(initial: number, condition: (k: number) => boolean): number {
  let k = initial;
  while (condition(k)) k++;
  return k - 1;
}

/** The book's `next`: the first integer ≥ initial for
 *  which the condition holds. */
function nextFrom(initial: number, condition: (k: number) => boolean): number {
  let k = initial;
  while (!condition(k)) k++;
  return k;
}

export const MEAN_TROPICAL_YEAR = 365.242189;
export const MEAN_SYNODIC_MONTH = 29.530588861;

/* ------------------------------------------------------------------ */
/* Ephemeris correction and dynamical time (ch. 14)                     */
/* ------------------------------------------------------------------ */

function gregorianDateDifference(a: { year: number; month: number; day: number }, b: { year: number; month: number; day: number }): number {
  return fixedFromGregorian(gregorianDate(b.year, b.month, b.day)) - fixedFromGregorian(gregorianDate(a.year, a.month, a.day));
}

/** Dynamical Time minus Universal Time, in days, for the
 *  moment — the book's piecewise polynomials (Meeus /
 *  NASA Eclipse polynomials, as the book states them). */
export function ephemerisCorrection(tee: number): number {
  const year = gregorianYearFromFixed(Math.floor(tee));
  const c = gregorianDateDifference({ year: 1900, month: 1, day: 1 }, { year, month: 7, day: 1 }) / 36525;
  const y2000 = year - 2000;
  if (year >= 2051 && year <= 2150) return (1 / 86400) * (-20 + 32 * ((year - 1820) / 100) ** 2 + 0.5628 * (2150 - year));
  if (year >= 2006 && year <= 2050) return (1 / 86400) * poly(y2000, [62.92, 0.32217, 0.005589]);
  if (year >= 1987 && year <= 2005)
    return (1 / 86400) * poly(y2000, [63.86, 0.3345, -0.060374, 0.0017275, 0.000651814, 0.00002373599]);
  if (year >= 1900 && year <= 1986)
    return poly(c, [-0.00002, 0.000297, 0.025184, -0.181133, 0.55304, -0.861938, 0.677066, -0.212591]);
  if (year >= 1800 && year <= 1899)
    return poly(c, [-0.000009, 0.003844, 0.083563, 0.865736, 4.867575, 15.845535, 31.332267, 38.291999, 28.316289, 11.636204, 2.043794]);
  if (year >= 1700 && year <= 1799) return (1 / 86400) * poly(year - 1700, [8.118780842, -0.005092142, 0.003336121, -0.0000266484]);
  if (year >= 1600 && year <= 1699) return (1 / 86400) * poly(year - 1600, [120, -0.9808, -0.01532, 0.000140272128]);
  if (year >= 500 && year <= 1599)
    return (1 / 86400) * poly((year - 1000) / 100, [1574.2, -556.01, 71.23472, 0.319781, -0.8503463, -0.005050998, 0.0083572073]);
  if (year > -500 && year < 500)
    return (1 / 86400) * poly(year / 100, [10583.6, -1014.41, 33.78311, -5.952053, -0.1798452, 0.022174192, 0.0090316521]);
  return (1 / 86400) * poly((year - 1820) / 100, [-20, 0, 32]);
}

/** Noon at the start of Gregorian year 2000 (the book's
 *  j2000). */
export const J2000 = 730120.5;

export function dynamicalFromUniversal(tee: number): number {
  return tee + ephemerisCorrection(tee);
}

export function universalFromDynamical(tee: number): number {
  return tee - ephemerisCorrection(tee);
}

/** Julian centuries since 2000 at the moment. */
export function julianCenturies(tee: number): number {
  return (dynamicalFromUniversal(tee) - J2000) / 36525;
}

/* ------------------------------------------------------------------ */
/* Coefficient series — extracted from the authors' Lisp                */
/* ------------------------------------------------------------------ */

const SOLAR_COEFF: number[] = [
  403406, 195207, 119433, 112392, 3891, 2819, 1721, 660,
  350, 334, 314, 268, 242, 234, 158, 132,
  129, 114, 99, 93, 86, 78, 72, 68,
  64, 46, 38, 37, 32, 29, 28, 27,
  27, 25, 24, 21, 21, 20, 18, 17,
  14, 13, 13, 13, 12, 10, 10, 10,
  10,
];

const SOLAR_MULT: number[] = [
  0.9287892, 35999.1376958, 35999.4089666, 35998.7287385,
  71998.20261, 71998.4403, 36000.35726, 71997.4812,
  32964.4678, -19.441, 445267.1117, 45036.884,
  3.1008, 22518.4434, -19.9739, 65928.9345,
  9038.0293, 3034.7684, 33718.148, 3034.448,
  -2280.773, 29929.992, 31556.493, 149.588,
  9037.75, 107997.405, -4444.176, 151.771,
  67555.316, 31556.08, -4561.54, 107996.706,
  1221.655, 62894.167, 31437.369, 14578.298,
  -31931.757, 34777.243, 1221.999, 62894.511,
  -4442.039, 107997.909, 119.066, 16859.071,
  -4.578, 26895.292, -39.127, 12297.536,
  90073.778,
];

const SOLAR_ADD: number[] = [
  270.54861, 340.19128, 63.91854, 331.2622, 317.843, 86.631,
  240.052, 310.26, 247.23, 260.87, 297.82, 343.14,
  166.79, 81.53, 3.5, 132.75, 182.95, 162.03,
  29.8, 266.4, 249.2, 157.6, 257.8, 185.1,
  69.9, 8.0, 197.1, 250.4, 65.3, 162.7,
  341.5, 291.6, 98.5, 146.7, 110.0, 5.2,
  342.6, 230.9, 256.1, 45.3, 242.9, 115.2,
  151.8, 285.3, 53.3, 126.6, 205.7, 85.9,
  146.1,
];

const LUN_ARG_D: number[] = [
  0, 2, 2, 0, 0, 0, 2, 2, 2, 2, 0, 1,
  0, 2, 0, 0, 4, 0, 4, 2, 2, 1, 1, 2,
  2, 4, 2, 0, 2, 2, 1, 2, 0, 0, 2, 2,
  2, 4, 0, 3, 2, 4, 0, 2, 2, 2, 4, 0,
  4, 1, 2, 0, 1, 3, 4, 2, 0, 1, 2,
];

const LUN_ARG_M: number[] = [
  0, 0, 0, 0, 1, 0, 0, -1, 0, -1, 1, 0,
  1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, -1,
  0, 0, 0, 1, 0, -1, 0, -2, 1, 2, -2, 0,
  0, -1, 0, 0, 1, -1, 2, 2, 1, -1, 0, 0,
  -1, 0, 1, 0, 1, 0, 0, -1, 2, 1, 0,
];

const LUN_ARG_MP: number[] = [
  1, -1, 0, 2, 0, 0, -2, -1, 1, 0, -1, 0,
  1, 0, 1, 1, -1, 3, -2, -1, 0, -1, 0, 1,
  2, 0, -3, -2, -1, -2, 1, 0, 2, 0, -1, 1,
  0, -1, 2, -1, 1, -2, -1, -1, -2, 0, 1, 4,
  0, -2, 0, 2, 1, -2, -3, 2, 1, -1, 3,
];

const LUN_ARG_F: number[] = [
  0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0,
  0, -2, 2, -2, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, -2,
  2, 0, 2, 0, 0, 0, 0, 0, 0, -2, 0, 0,
  0, 0, -2, -2, 0, 0, 0, 0, 0, 0, 0,
];

const LUN_SINE: number[] = [
  6288774, 1274027, 658314, 213618, -185116, -114332, 58793, 57066,
  53322, 45758, -40923, -34720, -30383, 15327, -12528, 10980,
  10675, 10034, 8548, -7888, -6766, -5163, 4987, 4036,
  3994, 3861, 3665, -2689, -2602, 2390, -2348, 2236,
  -2120, -2069, 2048, -1773, -1595, 1215, -1110, -892,
  -810, 759, -713, -700, 691, 596, 549, 537,
  520, -487, -399, -381, 351, -340, 330, 327,
  -323, 299, 294,
];

const NM_E: number[] = [
  0, 1, 0, 0, 1, 1, 2, 0, 0, 1, 0, 1,
  1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

const NM_SOLAR: number[] = [
  0, 1, 0, 0, -1, 1, 2, 0, 0, 1, 0, 1,
  1, -1, 2, 0, 3, 1, 0, 1, -1, -1, 1, 0,
];

const NM_LUNAR: number[] = [
  1, 0, 2, 0, 1, 1, 0, 1, 1, 2, 3, 0,
  0, 2, 1, 2, 0, 1, 2, 1, 1, 1, 3, 4,
];

const NM_MOON: number[] = [
  0, 0, 0, 2, 0, 0, 0, -2, 2, 0, 0, 2,
  -2, 0, 0, -2, 0, -2, 2, 2, 2, -2, 0, 0,
];

const NM_SINE: number[] = [
  -0.4072, 0.17241, 0.01608, 0.01039, 0.00739, -0.00514,
  0.00208, -0.00111, -0.00057, 0.00056, -0.00042, 0.00042,
  0.00038, -0.00024, -7e-05, 4e-05, 4e-05, 3e-05,
  3e-05, -3e-05, 3e-05, -2e-05, -2e-05, 2e-05,
];

const NM_ADD_CONST: number[] = [
  251.88, 251.83, 349.42, 84.66, 141.74, 207.14,
  154.84, 34.52, 207.19, 291.34, 161.72, 239.56,
  331.55,
];

const NM_ADD_COEFF: number[] = [
  0.016321, 26.651886, 36.412478, 18.206239, 53.303771, 2.453732,
  7.30686, 27.261239, 0.121824, 1.844379, 24.198154, 25.513099,
  3.592518,
];

const NM_ADD_FACTOR: number[] = [
  0.000165, 0.000164, 0.000126, 0.00011, 6.2e-05, 6e-05,
  5.6e-05, 4.7e-05, 4.2e-05, 4e-05, 3.7e-05, 3.5e-05,
  2.3e-05,
];

/* ------------------------------------------------------------------ */
/* Solar longitude (ch. 14; Bretagnon & Simon, as the book states)      */
/* ------------------------------------------------------------------ */

export function nutation(tee: number): number {
  const c = julianCenturies(tee);
  const capA = poly(c, [124.9, -1934.134, 0.002063]);
  const capB = poly(c, [201.11, 72001.5377, 0.00057]);
  return -0.004778 * sinDegrees(capA) - 0.0003667 * sinDegrees(capB);
}

export function aberration(tee: number): number {
  const c = julianCenturies(tee);
  return 0.0000974 * cosDegrees(177.63 + 35999.01848 * c) - 0.005575;
}

/** Longitude of the sun at the moment, in degrees. */
export function solarLongitude(tee: number): number {
  const c = julianCenturies(tee);
  let sigma = 0;
  for (let i = 0; i < SOLAR_COEFF.length; i++) {
    sigma += SOLAR_COEFF[i] * sinDegrees(SOLAR_ADD[i] + SOLAR_MULT[i] * c);
  }
  const lambda = 282.7771834 + 36000.76953744 * c + 0.000005729577951308232 * sigma;
  return mod(lambda + aberration(tee) + nutation(tee), 360);
}

/** The book's invert-angular: bisection for the inverse
 *  of an angular function at y within [a, b], to the
 *  book's stated accuracy (1/100000 of a day). */
function invertAngular(f: (x: number) => number, y: number, a: number, b: number): number {
  let l = a;
  let u = b;
  while (!(u - l < 1 / 100000)) {
    const x = (u + l) / 2;
    const left = mod(f(x) - y, 360) < 180;
    if (left) u = x;
    else l = x;
  }
  return (u + l) / 2;
}

/** Moment UT of the first time at or after tee when the
 *  solar longitude will be lambda degrees. */
export function solarLongitudeAfter(lambda: number, tee: number): number {
  const rate = MEAN_TROPICAL_YEAR / 360;
  const tau = tee + rate * mod(lambda - solarLongitude(tee), 360);
  const a = Math.max(tee, tau - 5);
  const b = tau + 5;
  return invertAngular(solarLongitude, lambda, a, b);
}

/** Approximate moment at or before tee when the solar
 *  longitude just exceeded lambda degrees. */
export function estimatePriorSolarLongitude(lambda: number, tee: number): number {
  const rate = MEAN_TROPICAL_YEAR / 360;
  const tau = tee - rate * mod(solarLongitude(tee) - lambda, 360);
  const delta = mod3(solarLongitude(tau) - lambda, -180, 180);
  return Math.min(tee, tau - rate * delta);
}

/** Solar longitude at the winter solstice. */
export const WINTER = 270;

/* ------------------------------------------------------------------ */
/* Lunar longitude and the new moons (ch. 14; Meeus, as the book states)*/
/* ------------------------------------------------------------------ */

function meanLunarLongitude(c: number): number {
  return mod(poly(c, [218.3164477, 481267.88123421, -0.0015786, 1 / 538841, -1 / 65194000]), 360);
}

function lunarElongation(c: number): number {
  return mod(poly(c, [297.8501921, 445267.1114034, -0.0018819, 1 / 545868, -1 / 113065000]), 360);
}

function solarAnomaly(c: number): number {
  return mod(poly(c, [357.5291092, 35999.0502909, -0.0001536, 1 / 24490000]), 360);
}

function lunarAnomaly(c: number): number {
  return mod(poly(c, [134.9633964, 477198.8675055, 0.0087414, 1 / 69699, -1 / 14712000]), 360);
}

function moonNode(c: number): number {
  return mod(poly(c, [93.272095, 483202.0175233, -0.0036539, -1 / 3526000, 1 / 863310000]), 360);
}

/** Longitude of the moon at the moment, in degrees. */
export function lunarLongitude(tee: number): number {
  const c = julianCenturies(tee);
  const capLPrime = meanLunarLongitude(c);
  const capD = lunarElongation(c);
  const capM = solarAnomaly(c);
  const capMPrime = lunarAnomaly(c);
  const capF = moonNode(c);
  const capE = poly(c, [1, -0.002516, -0.0000074]);
  let sigma = 0;
  for (let i = 0; i < LUN_SINE.length; i++) {
    sigma +=
      LUN_SINE[i] *
      capE ** Math.abs(LUN_ARG_M[i]) *
      sinDegrees(LUN_ARG_D[i] * capD + LUN_ARG_M[i] * capM + LUN_ARG_MP[i] * capMPrime + LUN_ARG_F[i] * capF);
  }
  const correction = (1 / 1000000) * sigma;
  const venus = (3958 / 1000000) * sinDegrees(119.75 + 131.849 * c);
  const jupiter = (318 / 1000000) * sinDegrees(53.09 + 479264.29 * c);
  const flatEarth = (1962 / 1000000) * sinDegrees(capLPrime - capF);
  return mod(capLPrime + correction + venus + jupiter + flatEarth + nutation(tee), 360);
}

/** Moment UT of the n-th new moon after (or before) the
 *  new moon of January 11, year 1. */
export function nthNewMoon(n: number): number {
  const n0 = 24724; // months from R.D. 0 until j2000
  const k = n - n0;
  const c = k / 1236.85;
  const approx = J2000 + poly(c, [5.09766, MEAN_SYNODIC_MONTH * 1236.85, 0.00015437, -0.00000015, 0.00000000073]);
  const capE = poly(c, [1, -0.002516, -0.0000074]);
  const solarAnom = poly(c, [2.5534, 1236.85 * 29.1053567, -0.0000014, -0.00000011]);
  const lunarAnom = poly(c, [201.5643, 385.81693528 * 1236.85, 0.0107582, 0.00001238, -0.000000058]);
  const moonArgument = poly(c, [160.7108, 390.67050284 * 1236.85, -0.0016118, -0.00000227, 0.000000011]);
  const capOmega = poly(c, [124.7746, -1.56375588 * 1236.85, 0.0020672, 0.00000215]);
  let sigma = 0;
  for (let i = 0; i < NM_SINE.length; i++) {
    sigma +=
      NM_SINE[i] *
      capE ** NM_E[i] *
      sinDegrees(NM_SOLAR[i] * solarAnom + NM_LUNAR[i] * lunarAnom + NM_MOON[i] * moonArgument);
  }
  const correction = -0.00017 * sinDegrees(capOmega) + sigma;
  const extra = 0.000325 * sinDegrees(poly(c, [299.77, 132.8475848, -0.009173]));
  let additional = 0;
  for (let i = 0; i < NM_ADD_CONST.length; i++) {
    additional += NM_ADD_FACTOR[i] * sinDegrees(NM_ADD_CONST[i] + NM_ADD_COEFF[i] * k);
  }
  return universalFromDynamical(approx + correction + extra + additional);
}

/** Lunar phase at the moment, as an angle: 0 = new moon. */
export function lunarPhase(tee: number): number {
  const phi = mod(lunarLongitude(tee) - solarLongitude(tee), 360);
  const t0 = nthNewMoon(0);
  const n = Math.round((tee - t0) / MEAN_SYNODIC_MONTH);
  const phiPrime = 360 * mod((tee - nthNewMoon(n)) / MEAN_SYNODIC_MONTH, 1);
  return Math.abs(phi - phiPrime) > 180 ? phiPrime : phi;
}

/** Moment UT of the last new moon before tee. */
export function newMoonBefore(tee: number): number {
  const t0 = nthNewMoon(0);
  const phi = lunarPhase(tee);
  const n = Math.round((tee - t0) / MEAN_SYNODIC_MONTH - phi / 360);
  return nthNewMoon(finalFrom(n - 1, (k) => nthNewMoon(k) < tee));
}

/** Moment UT of the first new moon at or after tee. */
export function newMoonAtOrAfter(tee: number): number {
  const t0 = nthNewMoon(0);
  const phi = lunarPhase(tee);
  const n = Math.round((tee - t0) / MEAN_SYNODIC_MONTH - phi / 360);
  return nthNewMoon(nextFrom(n, (k) => nthNewMoon(k) >= tee));
}

/* ------------------------------------------------------------------ */
/* Location and the Chinese meridian (ch. 18)                           */
/* ------------------------------------------------------------------ */

export interface Location {
  latitude: number;
  longitude: number;
  elevation: number;
  /** Zone: the standard-time offset, as a fraction of a
   *  day. */
  zone: number;
}

export function standardFromUniversal(tee: number, location: Location): number {
  return tee + location.zone;
}

export function universalFromStandard(tee: number, location: Location): number {
  return tee - location.zone;
}

/** The location of Beijing; the time zone varies with the
 *  moment (the book's chinese-location): before 1929 the
 *  meridian's local mean time (116°25′ E), from 1929 the
 *  standard zone, UTC+8. The meridian is part of the
 *  system (§8.5): the holding states it rather than
 *  assuming it. */
export function chineseLocation(tee: number): Location {
  const year = gregorianYearFromFixed(Math.floor(tee));
  return {
    latitude: angle(39, 55, 0),
    longitude: angle(116, 25, 0),
    elevation: 43.5,
    zone: year < 1929 ? 1397 / 180 / 24 : 8 / 24,
  };
}

/** Universal time of (clock) midnight at the start of
 *  the fixed date in China. */
export function midnightInChina(date: number): number {
  return universalFromStandard(date, chineseLocation(date));
}

/* ------------------------------------------------------------------ */
/* The Chinese calendar (ch. 18)                                        */
/* ------------------------------------------------------------------ */

/** Moment (Beijing time) of the first time at or after
 *  tee (Beijing time) when the solar longitude will be
 *  lambda degrees. */
export function chineseSolarLongitudeOnOrAfter(lambda: number, tee: number): number {
  const sun = solarLongitudeAfter(lambda, universalFromStandard(tee, chineseLocation(tee)));
  return standardFromUniversal(sun, chineseLocation(sun));
}

/** The last Chinese major solar term (zhongqi) before
 *  the fixed date, as its index 1–12 within the major
 *  terms. */
export function currentMajorSolarTerm(date: number): number {
  const s = solarLongitude(universalFromStandard(date, chineseLocation(date)));
  return amod(2 + quotient(s, 30), 12);
}

/** Moment (in Beijing) of the first Chinese major solar
 *  term on or after the fixed date. The major terms
 *  begin when the sun's longitude is a multiple of 30°. */
export function majorSolarTermOnOrAfter(date: number): number {
  const s = solarLongitude(midnightInChina(date));
  const l = mod(30 * Math.ceil(s / 30), 360);
  return chineseSolarLongitudeOnOrAfter(l, date);
}

/** The last Chinese minor solar term (jieqi) before the
 *  fixed date, as its index 1–12 within the minor terms. */
export function currentMinorSolarTerm(date: number): number {
  const s = solarLongitude(universalFromStandard(date, chineseLocation(date)));
  return amod(3 + quotient(s - 15, 30), 12);
}

/** Moment (in Beijing) of the first Chinese minor solar
 *  term on or after the fixed date. The minor terms
 *  begin when the sun's longitude is an odd multiple of
 *  15°. */
export function minorSolarTermOnOrAfter(date: number): number {
  const s = solarLongitude(midnightInChina(date));
  const l = mod(30 * Math.ceil((s - 15) / 30) + 15, 360);
  return chineseSolarLongitudeOnOrAfter(l, date);
}

/** Fixed date (Beijing) of the first new moon before
 *  the fixed date. */
export function chineseNewMoonBefore(date: number): number {
  const tee = newMoonBefore(midnightInChina(date));
  return Math.floor(standardFromUniversal(tee, chineseLocation(tee)));
}

/** Fixed date (Beijing) of the first new moon on or
 *  after the fixed date. */
export function chineseNewMoonOnOrAfter(date: number): number {
  const tee = newMoonAtOrAfter(midnightInChina(date));
  return Math.floor(standardFromUniversal(tee, chineseLocation(tee)));
}

/** Fixed date of the start of the Chinese calendar: the
 *  Chinese New Year of the year beginning 15 February
 *  −2636 Gregorian, as the book fixes it. */
export const CHINESE_EPOCH = fixedFromGregorian(gregorianDate(-2636, 2, 15));

/** True if the Chinese lunar month starting on the date
 *  has no major solar term. */
export function chineseNoMajorSolarTerm(date: number): boolean {
  return currentMajorSolarTerm(date) === currentMajorSolarTerm(chineseNewMoonOnOrAfter(date + 1));
}

/** Fixed date, in the Chinese zone, of the winter
 *  solstice on or before the date. */
export function chineseWinterSolsticeOnOrBefore(date: number): number {
  const approx = estimatePriorSolarLongitude(WINTER, midnightInChina(date + 1));
  return nextFrom(Math.floor(approx) - 1, (day) => WINTER < solarLongitude(midnightInChina(day + 1)));
}

/** Fixed date of Chinese New Year in the sui (the period
 *  from solstice to solstice) containing the date. */
export function chineseNewYearInSui(date: number): number {
  const s1 = chineseWinterSolsticeOnOrBefore(date);
  const s2 = chineseWinterSolsticeOnOrBefore(s1 + 370);
  const m12 = chineseNewMoonOnOrAfter(s1 + 1);
  const m13 = chineseNewMoonOnOrAfter(m12 + 1);
  const nextM11 = chineseNewMoonBefore(s2 + 1);
  if (
    Math.round((nextM11 - m12) / MEAN_SYNODIC_MONTH) === 12 &&
    (chineseNoMajorSolarTerm(m12) || chineseNoMajorSolarTerm(m13))
  ) {
    return chineseNewMoonOnOrAfter(m13 + 1);
  }
  return m13;
}

/** Fixed date of Chinese New Year on or before the date. */
export function chineseNewYearOnOrBefore(date: number): number {
  const newYear = chineseNewYearInSui(date);
  return date >= newYear ? newYear : chineseNewYearInSui(date - 180);
}

/** Fixed date of Chinese New Year in the Gregorian year. */
export function chineseNewYear(gYear: number): number {
  return chineseNewYearOnOrBefore(fixedFromGregorian(gregorianDate(gYear, 7, 1)));
}

/** True if there is a Chinese leap month on or after the
 *  lunar month starting on mPrime and at or before the
 *  lunar month starting at m. */
export function chinesePriorLeapMonth(mPrime: number, m: number): boolean {
  return (
    m >= mPrime &&
    (chineseNoMajorSolarTerm(m) || chinesePriorLeapMonth(mPrime, chineseNewMoonBefore(m)))
  );
}

/** The Chinese date of the fixed date. */
export function chineseFromFixed(date: number): ChineseDate {
  const s1 = chineseWinterSolsticeOnOrBefore(date);
  const s2 = chineseWinterSolsticeOnOrBefore(s1 + 370);
  const m12 = chineseNewMoonOnOrAfter(s1 + 1);
  const nextM11 = chineseNewMoonBefore(s2 + 1);
  const m = chineseNewMoonBefore(date + 1);
  const leapYear = Math.round((nextM11 - m12) / MEAN_SYNODIC_MONTH) === 12;
  const month = amod(
    Math.round((m - m12) / MEAN_SYNODIC_MONTH) - (leapYear && chinesePriorLeapMonth(m12, m) ? 1 : 0),
    12,
  );
  const leapMonth =
    leapYear && chineseNoMajorSolarTerm(m) && !chinesePriorLeapMonth(m12, chineseNewMoonBefore(m));
  const elapsedYears = Math.floor(1.5 - month / 12 + (date - CHINESE_EPOCH) / MEAN_TROPICAL_YEAR);
  const cycle = 1 + quotient(elapsedYears - 1, 60);
  const year = amod(elapsedYears, 60);
  const day = 1 + (date - m);
  return chineseDate(cycle, year, month, leapMonth, day);
}

/** The fixed date of the Chinese date. */
export function fixedFromChinese(cDate: ChineseDate): number {
  const midYear = Math.floor(
    CHINESE_EPOCH + ((cDate.cycle - 1) * 60 + (cDate.year - 1) + 0.5) * MEAN_TROPICAL_YEAR,
  );
  const newYear = chineseNewYearOnOrBefore(midYear);
  const p = chineseNewMoonOnOrAfter(newYear + (cDate.month - 1) * 29);
  const d = chineseFromFixed(p);
  const priorNewMoon =
    d.month === cDate.month && d.leap === cDate.leap ? p : chineseNewMoonOnOrAfter(p + 1);
  return priorNewMoon + cDate.day - 1;
}

/* ------------------------------------------------------------------ */
/* Sexagesimal names (ch. 18)                                           */
/* ------------------------------------------------------------------ */

export interface ChineseName {
  stem: number;
  branch: number;
}

/** The n-th name of the Chinese sexagesimal cycle. */
export function chineseSexagesimalName(n: number): ChineseName {
  return { stem: amod(n, 10), branch: amod(n, 12) };
}

/** Sexagesimal name for the Chinese year (of any cycle). */
export function chineseYearName(year: number): ChineseName {
  return chineseSexagesimalName(year);
}

/** Sexagesimal name for the month of the Chinese year. */
export function chineseMonthName(month: number, year: number): ChineseName {
  const elapsedMonths = 12 * (year - 1) + (month - 1);
  return chineseSexagesimalName(elapsedMonths - 57);
}

/** Sexagesimal name for the fixed date (the day cycle;
 *  its epoch is R.D. 45, as the book fixes it). */
export function chineseDayName(date: number): ChineseName {
  return chineseSexagesimalName(date - 45);
}

/* ------------------------------------------------------------------ */
/* The 24 solar terms — the system's named points (§8.6)                */
/* ------------------------------------------------------------------ */

export interface SolarTerm {
  /** The term's name, romanised. */
  name: string;
  /** The term's name in traditional characters. */
  characters: string;
  /** The solar longitude at which the term begins. */
  longitude: number;
  /** Major (zhongqi) or minor (jieqi). */
  kind: "major" | "minor";
  /** The index the term machinery returns for it, 1–12
   *  within its kind. */
  index: number;
}

/** The 24 solar terms, held as the system's named points
 *  (§8.6): they enter through the same intake as the
 *  system itself — the attested set, each term with the
 *  longitude at which it begins and the index the
 *  machinery (current-major/minor-solar-term) returns.
 *  The major terms are the month's zhongqi — the
 *  intercalation rule is stated over them; the minor
 *  terms are its jieqi. */
export const SOLAR_TERMS: SolarTerm[] = [
  { name: "Lichun", characters: "立春", longitude: 315, kind: "minor", index: 1 },
  { name: "Yushui", characters: "雨水", longitude: 330, kind: "major", index: 1 },
  { name: "Jingzhe", characters: "驚蟄", longitude: 345, kind: "minor", index: 2 },
  { name: "Chunfen", characters: "春分", longitude: 0, kind: "major", index: 2 },
  { name: "Qingming", characters: "清明", longitude: 15, kind: "minor", index: 3 },
  { name: "Guyu", characters: "穀雨", longitude: 30, kind: "major", index: 3 },
  { name: "Lixia", characters: "立夏", longitude: 45, kind: "minor", index: 4 },
  { name: "Xiaoman", characters: "小滿", longitude: 60, kind: "major", index: 4 },
  { name: "Mangzhong", characters: "芒種", longitude: 75, kind: "minor", index: 5 },
  { name: "Xiazhi", characters: "夏至", longitude: 90, kind: "major", index: 5 },
  { name: "Xiaoshu", characters: "小暑", longitude: 105, kind: "minor", index: 6 },
  { name: "Dashu", characters: "大暑", longitude: 120, kind: "major", index: 6 },
  { name: "Liqiu", characters: "立秋", longitude: 135, kind: "minor", index: 7 },
  { name: "Chushu", characters: "處暑", longitude: 150, kind: "major", index: 7 },
  { name: "Bailu", characters: "白露", longitude: 165, kind: "minor", index: 8 },
  { name: "Qiufen", characters: "秋分", longitude: 180, kind: "major", index: 8 },
  { name: "Hanlu", characters: "寒露", longitude: 195, kind: "minor", index: 9 },
  { name: "Shuangjiang", characters: "霜降", longitude: 210, kind: "major", index: 9 },
  { name: "Lidong", characters: "立冬", longitude: 225, kind: "minor", index: 10 },
  { name: "Xiaoxue", characters: "小雪", longitude: 240, kind: "major", index: 10 },
  { name: "Daxue", characters: "大雪", longitude: 255, kind: "minor", index: 11 },
  { name: "Dongzhi", characters: "冬至", longitude: 270, kind: "major", index: 11 },
  { name: "Xiaohan", characters: "小寒", longitude: 285, kind: "minor", index: 12 },
  { name: "Dahan", characters: "大寒", longitude: 300, kind: "major", index: 12 },
];

/** The solar terms the fixed date stands in (§8.6's
 *  term-level operation): the last major and minor terms
 *  begun at or before it, from the machinery over the
 *  held set. */
export function currentSolarTerms(date: number): { major: SolarTerm; minor: SolarTerm } {
  const majorIndex = currentMajorSolarTerm(date);
  const minorIndex = currentMinorSolarTerm(date);
  const major = SOLAR_TERMS.find((t) => t.kind === "major" && t.index === majorIndex);
  const minor = SOLAR_TERMS.find((t) => t.kind === "minor" && t.index === minorIndex);
  if (!major || !minor) throw new Error(`solar term indices out of the held set: major ${majorIndex}, minor ${minorIndex}`);
  return { major, minor };
}

/* ------------------------------------------------------------------ */
/* The system record and registration (§8.3, §8.5)                      */
/* ------------------------------------------------------------------ */

/** The fixed date from which the modern (post-1645)
 *  Chinese system stands: conversions before it are the
 *  modern rules applied backwards, and say so. */
const MODERN_SYSTEM_FROM = fixedFromGregorian(gregorianDate(1645, 1, 1));

export const CHINESE_SYSTEM: CalendarSystem = {
  id: "chinese",
  name: "Chinese lunisolar",
  kind: "astronomical",
  provenance: {
    kind: "stated",
    source:
      "Dershowitz & Reingold, Calendrical Calculations, 4th edition (Cambridge University Press, 2018) — " +
      "the algorithms as stated in the book, ported from the authors' public Lisp distribution " +
      "(github.com/EdReingold/calendar-code2, Apache License 2.0)",
    detail:
      "Part II, chapter 18: the Chinese calendar, with the astronomy of chapter 14. Banked by the C2 " +
      "intake: the port itself is the description, executed (calendar-chinese.ts). The system held is " +
      "the MODERN system — the post-1645 rules, the last imperial reform, still in force; earlier " +
      "dynasties kept their own calendars, and this holding does not convert their dates (see the " +
      "qualification on conversions before 1645).",
  },
  epoch:
    "Years counted in 60-year cycles from the epoch the book fixes — the Chinese New Year of the year " +
    "beginning 15 February −2636 Gregorian (R.D. −963099, as the port computes it); the year's " +
    "sexagesimal name rides the cycle.",
  monthStructure:
    "Lunar months of 29 or 30 days, new moon to new moon, twelve in a common year and thirteen in a " +
    "leap year; days begin at midnight in the Chinese standard-time zone (Beijing — the meridian is " +
    "part of the system: UTC+8 since 1929, the meridian's local mean time, 116°25′ E, before it). The " +
    "eleventh month contains the winter solstice.",
  intercalation:
    "When the sui (winter solstice to winter solstice) holds thirteen new moons, the first month in " +
    "it containing no major solar term (zhongqi) is the leap month, taking the previous month's " +
    "number — the modern (post-1645) rule, as the book implements it.",
  namedPoints:
    "The 24 solar terms (jieqi and zhongqi) at 15° intervals of solar longitude, held as the " +
    "system's named points in SOLAR_TERMS (calendar-chinese.ts): Lichun at 315° through Dahan at " +
    "300°, each with its longitude and the index the term machinery returns.",
  qualification: (fixed) =>
    fixed < MODERN_SYSTEM_FROM
      ? "the Chinese holding is the modern (post-1645) system; for a date before 1645 this conversion " +
        "states where the date falls under the modern rules applied backwards — not the calendar in " +
        "force when a historical date was recorded, which this holding declines to reconstruct (§8.5)"
      : undefined,
};

/* Registration: the system enters the default register
 * and its machinery the conversion dispatch, at this
 * module's load — the pair (calendar.ts, calendar-
 * chinese.ts) is the Calendar family's whole holding. */
defaultCalendarRegister.hold(CHINESE_SYSTEM);
registerSystemMachinery("chinese", {
  toFixed: (date) => fixedFromChinese(date as ChineseDate),
  fromFixed: (fixed) => chineseFromFixed(fixed),
});
