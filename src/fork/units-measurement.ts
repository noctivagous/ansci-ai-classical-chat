/**
 * units-measurement.ts — the UnitsMeasurement Unit: the
 * QuantificationUnit's sub-unit for units of measurement
 * (ai-system/ontology-core/ontology-knowledge-unit/
 * quantification-unit/units-measurement-unit; owner, 2026-11-17:
 * nested inside the QuantificationUnit).
 *
 * A quantity is never just a number: it is a number OF
 * something. This unit names the somethings — what dimension a
 * unit measures (weight, length, volume, count), the factor
 * that converts it to the dimension's base unit, and whether
 * two units may be added or compared at all. Three systems
 * stand in the one table (owner, 2026-11-17):
 *
 *  - TRADITIONAL CHINESE — the units the banked classical
 *    quantities are stated in (bencao dosages above all: 銖,
 *    兩, 斤; 尺, 寸, 里; 升, 斗), plus the counting measure
 *    words （個, 隻, 條, 本, 張, 頭) as units of counting.
 *    FACTOR PROVENANCE, labelled: the factors below are the
 *    MODERN STANDARDISED values （斤 = 500 g, 兩 = 50 g,
 *    里 = 500 m, 尺 = 1/3 m, 升 = 1 L, and their sub-units by
 *    the traditional ratios: 10 兩 = 1 斤, 24 銖 = 1 兩,
 *    10 寸 = 1 尺, 10 尺 = 1 丈, 10 合 = 1 升, 10 升 = 1 斗).
 *    Historical values VARIED BY DYNASTY — a Han 斤 was not a
 *    Qing 斤. No dynasty tables are banked here; converting a
 *    classical quantity by these factors gives its modern-
 *    standard equivalent, and any consumer must say so.
 *  - IMPERIAL — ounce/pound/stone, inch/foot/yard/mile, the
 *    imperial pint/gallon, at their standard definitions.
 *  - SI — gram/kilogram, metre and its prefixed kin, litre.
 *
 * TEMPERATURE is a SCALE, not a factor: Fahrenheit and Celsius
 * differ by an offset as well as a ratio, so no factor is
 * filed for them and convert() refuses them with a typed
 * refusal pointing at convertTemperature(), which does the
 * scale arithmetic honestly.
 */

export type UnitSystem = "traditional" | "imperial" | "si";
export type Dimension = "weight" | "length" | "volume" | "count" | "temperature";

export interface UnitDef {
  /** The unit's canonical id ("liang", "pound", "kilogram"). */
  id: string;
  /** Every name the unit answers to: English, pinyin, hanzi. */
  names: string[];
  system: UnitSystem;
  dimension: Dimension;
  /** The factor to the dimension's base unit (gram, metre,
   *  litre; count's base is the counting unit itself).
   *  Absent for temperature: a scale has no factor. */
  factor?: number;
  /** For counting measure words: what kinds of thing the unit
   *  counts, as the tradition uses it. */
  counts?: string;
  note?: string;
}

const TRADITIONAL_PROVENANCE =
  "modern standardised value (historical values varied by dynasty; no dynasty table is banked)";

export const UNITS: UnitDef[] = [
  /* --- traditional Chinese: weight (base: gram) --- */
  { id: "zhu", names: ["銖", "zhu", "zhū"], system: "traditional", dimension: "weight", factor: 50 / 24, note: `24 銖 = 1 兩; ${TRADITIONAL_PROVENANCE}` },
  { id: "liang", names: ["兩", "两", "liang", "liǎng", "tael"], system: "traditional", dimension: "weight", factor: 50, note: TRADITIONAL_PROVENANCE },
  { id: "jin", names: ["斤", "jin", "jīn", "catty"], system: "traditional", dimension: "weight", factor: 500, note: `10 兩 = 1 斤; ${TRADITIONAL_PROVENANCE}` },
  /* --- traditional Chinese: length (base: metre) --- */
  { id: "cun", names: ["寸", "cun", "cùn"], system: "traditional", dimension: "length", factor: 1 / 30, note: `10 寸 = 1 尺; ${TRADITIONAL_PROVENANCE}` },
  { id: "chi", names: ["尺", "chi", "chǐ"], system: "traditional", dimension: "length", factor: 1 / 3, note: TRADITIONAL_PROVENANCE },
  { id: "zhang", names: ["丈", "zhang", "zhàng"], system: "traditional", dimension: "length", factor: 10 / 3, note: `10 尺 = 1 丈; ${TRADITIONAL_PROVENANCE}` },
  { id: "li", names: ["里", "li", "lǐ"], system: "traditional", dimension: "length", factor: 500, note: TRADITIONAL_PROVENANCE },
  /* --- traditional Chinese: volume (base: litre) --- */
  { id: "ge", names: ["合", "ge", "gě"], system: "traditional", dimension: "volume", factor: 0.1, note: `10 合 = 1 升; ${TRADITIONAL_PROVENANCE}` },
  { id: "sheng", names: ["升", "sheng", "shēng"], system: "traditional", dimension: "volume", factor: 1, note: TRADITIONAL_PROVENANCE },
  { id: "dou", names: ["斗", "dou", "dǒu"], system: "traditional", dimension: "volume", factor: 10, note: `10 升 = 1 斗; ${TRADITIONAL_PROVENANCE}` },
  /* --- traditional Chinese: counting measure words (base: the count itself) --- */
  { id: "ge-count", names: ["個", "个"], system: "traditional", dimension: "count", factor: 1, counts: "the general counting unit — anything individuated" },
  { id: "zhi-count", names: ["隻", "只"], system: "traditional", dimension: "count", factor: 1, counts: "animals, and one of a pair (a shoe, a hand)" },
  { id: "tiao-count", names: ["條", "条"], system: "traditional", dimension: "count", factor: 1, counts: "long, thin, flexible things (fish, ropes, rivers, roads)" },
  { id: "ben-count", names: ["本"], system: "traditional", dimension: "count", factor: 1, counts: "bound volumes (books, albums)" },
  { id: "zhang-count", names: ["張", "张"], system: "traditional", dimension: "count", factor: 1, counts: "flat things (paper, tables, beds, mouths)" },
  { id: "tou-count", names: ["頭", "头"], system: "traditional", dimension: "count", factor: 1, counts: "livestock and large animals, by the head" },
  /* --- imperial: weight (base: gram) --- */
  { id: "ounce", names: ["ounce", "ounces", "oz"], system: "imperial", dimension: "weight", factor: 28.349523125 },
  { id: "pound", names: ["pound", "pounds", "lb", "lbs"], system: "imperial", dimension: "weight", factor: 453.59237 },
  { id: "stone", names: ["stone", "stones", "st"], system: "imperial", dimension: "weight", factor: 6350.29318, note: "14 pounds" },
  /* --- imperial: length (base: metre) --- */
  { id: "inch", names: ["inch", "inches", "in"], system: "imperial", dimension: "length", factor: 0.0254 },
  { id: "foot", names: ["foot", "feet", "ft"], system: "imperial", dimension: "length", factor: 0.3048 },
  { id: "yard", names: ["yard", "yards", "yd"], system: "imperial", dimension: "length", factor: 0.9144 },
  { id: "mile", names: ["mile", "miles", "mi"], system: "imperial", dimension: "length", factor: 1609.344 },
  /* --- imperial: volume (base: litre) --- */
  { id: "pint", names: ["pint", "pints", "pt"], system: "imperial", dimension: "volume", factor: 0.56826125, note: "the imperial pint (20 imperial fl oz); the US pint is a different unit and is not filed" },
  { id: "gallon", names: ["gallon", "gallons", "gal"], system: "imperial", dimension: "volume", factor: 4.54609, note: "the imperial gallon; the US gallon is a different unit and is not filed" },
  /* --- imperial: temperature (a scale, no factor) --- */
  { id: "fahrenheit", names: ["fahrenheit", "°f", "degrees fahrenheit"], system: "imperial", dimension: "temperature", note: "a temperature SCALE: converts by offset and ratio (convertTemperature), never by a factor" },
  /* --- SI: weight (base: gram) --- */
  { id: "gram", names: ["gram", "grams", "g", "克"], system: "si", dimension: "weight", factor: 1 },
  { id: "kilogram", names: ["kilogram", "kilograms", "kg", "公斤", "千克"], system: "si", dimension: "weight", factor: 1000 },
  /* --- SI: length (base: metre) --- */
  { id: "millimetre", names: ["millimetre", "millimetres", "millimeter", "millimeters", "mm", "毫米"], system: "si", dimension: "length", factor: 0.001 },
  { id: "centimetre", names: ["centimetre", "centimetres", "centimeter", "centimeters", "cm", "釐米", "厘米"], system: "si", dimension: "length", factor: 0.01 },
  { id: "metre", names: ["metre", "metres", "meter", "meters", "m", "米"], system: "si", dimension: "length", factor: 1 },
  { id: "kilometre", names: ["kilometre", "kilometres", "kilometer", "kilometers", "km", "公里", "千米"], system: "si", dimension: "length", factor: 1000 },
  /* --- SI: volume (base: litre) --- */
  { id: "millilitre", names: ["millilitre", "millilitres", "milliliter", "milliliters", "ml", "毫升"], system: "si", dimension: "volume", factor: 0.001 },
  { id: "litre", names: ["litre", "litres", "liter", "liters", "l", "公升"], system: "si", dimension: "volume", factor: 1 },
  /* --- SI: temperature (a scale, no factor) --- */
  { id: "celsius", names: ["celsius", "°c", "degrees celsius", "centigrade"], system: "si", dimension: "temperature", note: "a temperature SCALE: converts by offset and ratio (convertTemperature), never by a factor" },
];

/** A unit by any of its names (case-insensitive), or by id. */
export function unitForWord(word: string): UnitDef | undefined {
  const w = word.toLowerCase();
  return UNITS.find((u) => u.id === w || u.names.some((n) => n.toLowerCase() === w));
}

/** The dimension a unit measures ("pound" → weight). */
export function dimensionOf(unit: string): Dimension | undefined {
  return unitForWord(unit)?.dimension;
}

/** Whether two units measure the same dimension — the
 *  precondition for adding or comparing quantities in them. */
export function isCompatible(a: string, b: string): boolean {
  const da = dimensionOf(a);
  return da !== undefined && da === dimensionOf(b);
}

export type ConversionResult =
  | { ok: true; amount: number; from: string; to: string; dimension: Dimension }
  | { ok: false; reason: string; refusal: "unknown-unit" | "cross-dimension" | "temperature-scale" };

/**
 * Convert an amount between two units of the SAME dimension,
 * through the dimension's base unit. Across dimensions the
 * conversion is REFUSED with a typed refusal — 5 pounds + 3
 * miles is not a sum, and this function will not pretend one.
 * Temperature is refused here too, pointing at the scale
 * conversion: a scale is not a factor.
 */
export function convert(amount: number, from: string, to: string): ConversionResult {
  const f = unitForWord(from);
  const t = unitForWord(to);
  if (!f) return { ok: false, reason: `'${from}' is not a unit this table files`, refusal: "unknown-unit" };
  if (!t) return { ok: false, reason: `'${to}' is not a unit this table files`, refusal: "unknown-unit" };
  if (f.dimension !== t.dimension) {
    return {
      ok: false,
      reason: `'${f.id}' measures ${f.dimension} and '${t.id}' measures ${t.dimension} — quantities in unlike dimensions cannot be converted, added or compared`,
      refusal: "cross-dimension",
    };
  }
  if (f.dimension === "temperature" || f.factor === undefined || t.factor === undefined) {
    return {
      ok: false,
      reason: `temperature is a scale, not a factor — use convertTemperature() for '${f.id}' → '${t.id}'`,
      refusal: "temperature-scale",
    };
  }
  return { ok: true, amount: (amount * f.factor) / t.factor, from: f.id, to: t.id, dimension: f.dimension };
}

/**
 * Temperature scale conversion, kept separate from factor
 * conversion because it is a different kind of arithmetic
 * (offset and ratio). Fahrenheit ↔ Celsius only; a same-scale
 * call returns the value unchanged.
 */
export function convertTemperature(value: number, from: string, to: string): ConversionResult {
  const f = unitForWord(from);
  const t = unitForWord(to);
  if (!f || f.dimension !== "temperature") {
    return { ok: false, reason: `'${from}' is not a temperature scale this table files`, refusal: "unknown-unit" };
  }
  if (!t || t.dimension !== "temperature") {
    return { ok: false, reason: `'${to}' is not a temperature scale this table files`, refusal: "unknown-unit" };
  }
  if (f.id === t.id) return { ok: true, amount: value, from: f.id, to: t.id, dimension: "temperature" };
  const amount = f.id === "fahrenheit" ? ((value - 32) * 5) / 9 : (value * 9) / 5 + 32;
  return { ok: true, amount, from: f.id, to: t.id, dimension: "temperature" };
}
