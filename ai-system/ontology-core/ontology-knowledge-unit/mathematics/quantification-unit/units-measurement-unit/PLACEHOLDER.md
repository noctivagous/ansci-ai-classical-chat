# UnitsMeasurement Unit

- **Schematic address:** `ontology-core/ontology-knowledge-unit/mathematics/quantification-unit/units-measurement-unit` — inside the QuantificationUnit (owner's ruling, 2026-11-17)
- **Type:** Unit
- **State:** partial — **60% completed to goal** (set by us, assessed by the project, not measured or computed). Built 2026-11-17: `src/fork/units-measurement.ts` holds the three-system unit table (dimension + factor per unit) and the conversion machinery — within-dimension conversion, typed cross-dimension refusal, temperature as a separate scale conversion. Extended 2026-11-17 by the QUDT port (cross-check + added coverage, two new dimensions — see the section at the end of this file). What is not built: the parser does not yet route unit words in sentences through here (the sentence layer has no unit-word grain — a numeral's unit in "5 pounds of apples" is not a node the bridge can read), so the table is consulted by the bridge's vocabulary and by direct callers, not yet by ordinary turns.

## What this unit is

The owner's ruling (2026-11-17): inside the QuantificationUnit
will be the UnitsMeasurement Unit. A quantity is never just a
number — it is a number **of** something. This unit names the
somethings, for its parent:

- **Dimensions** — what a unit measures: weight, length,
  volume, count, temperature.
- **Conversion** — within a dimension only, through the
  dimension's base unit (gram, metre, litre; count's base is
  the counting unit itself).
- **Compatibility** — quantities in unlike dimensions cannot be
  added, converted or compared: 5 pounds + 3 miles is not a
  sum, and `convert()` refuses it with a typed refusal rather
  than producing a number.
- **Measure words as counting units** — the Chinese counting
  units （個 general, 隻 animals and one-of-a-pair, 條 long thin
  things, 本 bound volumes, 張 flat things, 頭 livestock) are
  units of the count dimension, each carrying what it counts.

## The three systems (owner, 2026-11-17)

One table, three systems:

- **Traditional Chinese** — weight 銖/兩/斤， length 寸/尺/丈/里，
  volume 合/升/斗， and the counting measure words above. These
  are the units the banked classical quantities are stated in —
  the bencao dosages above all — so this unit is what will make
  those quantities readable and comparable.
- **Imperial** — ounce/pound/stone; inch/foot/yard/mile; the
  imperial pint/gallon/quart/fluid-ounce; Fahrenheit as a
  temperature scale. The US liquid units are different units
  from their Imperial namesakes and are filed **separately**
  (us-pint, us-gallon, us-quart, us-fluid-ounce — QUDT port,
  below), so the table never confuses them.
- **SI** — gram/kilogram; millimetre/centimetre/metre/
  kilometre; millilitre/litre; Celsius as a temperature scale.

## Factor provenance — labelled, with its limitation

Imperial and SI factors are the standard definitions (pound =
453.59237 g, inch = 0.0254 m, imperial gallon = 4.54609 L…).
The traditional factors are the **modern standardised values**
（斤 = 500 g, 兩 = 50 g, 里 = 500 m, 尺 = 1/3 m, 升 = 1 L, with
sub-units by the traditional ratios: 24 銖 = 1 兩， 10 寸 =
1 尺， 10 合 = 1 升）, and each traditional entry's note says
so. **Historical values varied by dynasty** — a Han 斤 was not
a Qing 斤 — and no dynasty table is banked here: converting a
classical quantity by these factors yields its modern-standard
equivalent, and a consumer must say so when it matters.

## Temperature is a scale, not a factor

Fahrenheit and Celsius differ by an offset as well as a ratio,
so no factor is filed for them. `convert()` refuses temperature
with a typed `temperature-scale` refusal pointing at
`convertTemperature()`, which does the scale arithmetic
(F↔C) honestly. Nothing fakes a factor for a scale.

## Who uses it / who it uses

- **Used by:** its parent, the QuantificationUnit (quantity
  records carry unit names this unit names), and the
  QuantificationLanguageUnit's vocabulary (a word → its unit).

## Where the working code lives today

`src/fork/units-measurement.ts` (built 2026-11-17). Before that,
unit words in the banked material sat in the record as words
attached to numbers — comparable by nobody.

## The QUDT cross-check and additions (built 2026-11-17)

- **Source:** the QUDT units vocabulary (QUDT — Quantities,
  Units, Dimensions and Types, qudt.org;
  github.com/qudt/qudt-public-repo, file
  VOCAB_QUDT-UNITS-ALL.ttl), fetched 2026-11-17. **License:
  CC BY 4.0** — attribution in the repo NOTICE file and in
  data/qudt/manifest.json.
- **Conversion:** scripts/import-qudt.py (build-time) →
  data/qudt/manifest.json + part-001.json: the curated SI +
  Imperial subset (28 units), each factor re-based from QUDT's
  SI-coherent base to this table's base units (gram, metre,
  litre, square metre, pascal), with the raw QUDT multiplier
  kept alongside so the re-basing is inspectable.
- **The cross-check:** every unit the hand table already filed
  (17 units: the SI rows and ounce/pound/stone, inch/foot/yard/
  mile, imperial pint/gallon) was compared against QUDT's
  multiplier. **Result: zero disagreements** — every hand factor
  matched QUDT exactly (within 1e-9 relative). No hand value was
  changed; the record stands in data/qudt/manifest.json
  (`crossCheck.disagreements: []`). Temperature was checked as a
  scale, not a factor: QUDT files DEG_F as multiplier 5/9 with
  offset 459.67 (to Kelvin), consistent with convertTemperature's
  arithmetic.
- **Coverage QUDT added** (each entry carries `source: "qudt"`
  in the table): us-gallon (3.785411784 L), us-quart, us-pint,
  us-fluid-ounce — the US liquid variants, distinguished from
  the Imperial gallon/pint on purpose; the imperial quart and
  fluid-ounce; and two **new dimensions**: **area** (acre =
  4046.8564224 m²) and **pressure** (pascal, psi =
  6894.757293168361 Pa). US dry measures (dry gallon/pint,
  bushel, peck) exist in QUDT and were **not** filed — the table
  files liquid measure only, and says so here rather than
  silently omitting them. The US fluid ounce is filed at QUDT's
  precision (0.0295735296 L).
- **Authority discipline:** the hand table remains the
  authority where it already has entries — QUDT cross-checked
  it, it did not overwrite it. Traditional Chinese rows are
  untouched: QUDT carries no traditional Chinese units, and
  none were invented to fill the gap.
- **Drift pin:** test/fork-units-qudt.test.ts asserts the
  table's factors agree with the shipped data/qudt artefact,
  so the code table and the converted artefact cannot drift
  apart unnoticed.
