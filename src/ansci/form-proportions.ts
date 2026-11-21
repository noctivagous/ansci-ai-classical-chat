/**
 * form-proportions.ts — Proportion (Form F2, 2026-11-20;
 * design note docs/ansci/form-design-note.md — branch
 * track/form-design — §4, §8, §9.2): the relation record and
 * its acts.
 *
 * A proportion is a held RELATION between magnitudes: the
 * terms, what each measures, and the ratio AS STATED by its
 * source — the record holds the ratio as stated, not
 * re-derived into a decimal it never claimed (§4.1). Every
 * record carries its provenance and its standing (what it
 * may be used for); a proportion with no provenance is not
 * held, and a proportion held as knowledge is not thereby a
 * licence to recompute anyone's holdings with it.
 *
 * THE ACTS (§4.1): state the ratio; compare two proportions
 * from their stated ratios (Ordering's question asked of
 * Form's records); scale — given one term's value, give the
 * other's, as a computation whose derivation the answer can
 * show. A computation states its inputs and is never
 * presented as testimony (the geography programme's OSRM
 * precedent, §4.1).
 *
 * NAMED PROPORTIONS (§4.2). Doubling and the half are held
 * by name — the plain cases a conversation can cite without
 * stating a ratio — entered by enterStandingProportions
 * with their provenance stated (the note itself, recording
 * the owner's settled design). Beyond those, NO canon is
 * invented here: a name the register does not hold declines
 * D2, exactly as an unknown preset declines D1.
 *
 * CONVERSION FACTORS (§4.3). UnitsMeasurement already
 * trades in proportions — every conversion factor is a
 * stated ratio. This module does not duplicate that table:
 * a proportion record may CITE a factor (its provenance
 * names the UnitsMeasurement record), and conversion
 * questions still answer through UnitsMeasurement itself —
 * proportionFromConversion holds the citation, it is not a
 * second conversion route.
 */
import { formDecline, type FormProvenance, type FormRegister, type FormResult } from "./form";
import { convert, dimensionOf, unitForWord } from "./units-measurement";

/* ---------------- the relation record (§4.1) ---------------- */

export interface ProportionTerm {
  /** What is measured ("the flour", "the span"). */
  magnitude: string;
  /** The dimension the magnitude measures, where known —
   *  stated directly, or read from the term's unit through
   *  UnitsMeasurement. */
  dimension?: string;
  /** The unit the term is stated in, where it is one
   *  UnitsMeasurement files. */
  unit?: string;
}

export interface ProportionRecord {
  id: string;
  /** A named proportion is cited by this name (§4.2). */
  name?: string;
  terms: { a: ProportionTerm; b: ProportionTerm };
  ratio: {
    /** The relation as its source stated it ("2 to 1",
     *  "1 metre = 3.28084 feet (the conversion factor)"). */
    asStated: string;
    /** The stated relation as a factor: term b = factor ×
     *  term a, in the terms' stated units. */
    factor: number;
  };
  provenance: FormProvenance;
  /** What the record may be used for (§4.1). */
  standing: string[];
  /** The stated relation that makes two magnitudes of
   *  unlike dimension comparable (a rate, a price). Without
   *  one, unlike dimensions are not a proportion (D7). */
  relationNote?: string;
  heldAt: string;
}

export interface ProportionHoldInput {
  name?: string;
  terms: { a: ProportionTerm; b: ProportionTerm };
  /** The ratio as a factor, as a statement plus its factor,
   *  or by the name of a held named proportion. */
  ratio: { factor: number; asStated?: string } | { named: string };
  provenance: FormProvenance;
  standing?: string[];
  relationNote?: string;
}

const DEFAULT_STANDING = ["cited in an answer", "used to scale a quantity", "checked against a claimed relation"];

function termDimension(term: ProportionTerm): string | undefined {
  if (term.dimension) return term.dimension;
  if (term.unit) return dimensionOf(term.unit);
  return undefined;
}

function unknownUnit(term: ProportionTerm): FormResult<never> | undefined {
  if (term.unit && !unitForWord(term.unit)) {
    return {
      ok: false,
      decline: formDecline(
        "D2",
        `the unit '${term.unit}'`,
        `I hold no unit by the name '${term.unit}' — the UnitsMeasurement table does not file it, so the term's dimension cannot be read.`,
        `term '${term.magnitude}' is stated in the unit '${term.unit}', which UnitsMeasurement does not file; a ` +
          `proportion's terms must be readable before the relation can be held (Form design note §4.1, §8 D2)`,
      ),
    };
  }
  return undefined;
}

/**
 * Hold a proportion. The epistemic refusals are the
 * catalogue's: an unknown named ratio declines D2; terms of
 * known unlike dimension with no stated relation making
 * them comparable decline D7 — a ratio is not manufactured
 * by dividing the numbers anyway.
 */
export function holdProportion(register: FormRegister, input: ProportionHoldInput): FormResult<ProportionRecord> {
  for (const term of [input.terms.a, input.terms.b]) {
    const bad = unknownUnit(term);
    if (bad) return bad;
  }
  let factor: number;
  let asStated: string;
  if ("named" in input.ratio) {
    const named = register.proportionByName(input.ratio.named);
    if (!named) {
      return {
        ok: false,
        decline: formDecline(
          "D2",
          `the named proportion '${input.ratio.named}'`,
          `I hold no proportion by the name '${input.ratio.named}'.`,
          `the ratio is cited by the name '${input.ratio.named}', and the register holds no named proportion under ` +
            `it — beyond doubling and the half the note names no canon, and a canon is not invented here (Form ` +
            `design note §4.2, §8 D2)`,
        ),
      };
    }
    factor = named.ratio.factor;
    asStated = `the named proportion '${input.ratio.named}' (${named.ratio.asStated})`;
  } else {
    factor = input.ratio.factor;
    asStated = input.ratio.asStated ?? `a factor of ${factor} (term b per term a)`;
  }
  const dimA = termDimension(input.terms.a);
  const dimB = termDimension(input.terms.b);
  if (dimA && dimB && dimA !== dimB && !input.relationNote) {
    return {
      ok: false,
      decline: formDecline(
        "D7",
        `the terms '${input.terms.a.magnitude}' (${dimA}) and '${input.terms.b.magnitude}' (${dimB})`,
        `'${input.terms.a.magnitude}' measures ${dimA} and '${input.terms.b.magnitude}' measures ${dimB}, and no stated relation makes them comparable — I do not manufacture a ratio by dividing the numbers anyway.`,
        `a ratio between magnitudes of different dimensions is not a proportion until a stated relation makes ` +
          `them comparable; none is stated for these terms (Form design note §4.1, §8 D7)`,
      ),
    };
  }
  const record: ProportionRecord = {
    id: register.nextProportionId(),
    name: input.name,
    terms: input.terms,
    ratio: { asStated, factor },
    provenance: input.provenance,
    standing: input.standing ?? [...DEFAULT_STANDING],
    relationNote: input.relationNote,
    heldAt: register.stampNow(),
  };
  return { ok: true, value: register.holdProportionRecord(record) };
}

/* ---------------- the standing named proportions (§4.2) ---------------- */

const NAMED_PROVENANCE: FormProvenance = {
  kind: "canon",
  source: "the owner's settled design — form design note §4.2 (2026-11-20)",
  detail:
    "doubling and the half are the plain cases the note holds by name — relations a conversation can cite without " +
    "stating a ratio; beyond those the note names no canon, and none is invented here",
};

/**
 * Enter the named proportions the note itself holds:
 * doubling and the half. Idempotent per register — a
 * register that already holds them is left as it stands.
 */
export function enterStandingProportions(register: FormRegister): void {
  for (const [name, factor, asStated] of [
    ["doubling", 2, "doubling — 2 to 1"],
    ["half", 0.5, "the half — 1 to 2"],
  ] as const) {
    if (register.proportionByName(name)) continue;
    const held = holdProportion(register, {
      name,
      terms: { a: { magnitude: "a magnitude" }, b: { magnitude: "the same magnitude" } },
      ratio: { factor, asStated },
      provenance: NAMED_PROVENANCE,
      relationNote: "the two terms are one magnitude and itself, so the relation needs no common measure beyond the magnitude's own",
    });
    if (!held.ok) throw new Error(`enterStandingProportions: '${name}' refused: ${held.decline.detail}`);
  }
}

/* ---------------- resolution ---------------- */

export function resolveProportion(register: FormRegister, idOrName: string): FormResult<ProportionRecord> {
  const record = register.proportion(idOrName) ?? register.proportionByName(idOrName);
  if (!record) {
    return {
      ok: false,
      decline: formDecline(
        "D2",
        `the proportion '${idOrName}'`,
        `I hold no proportion by the name '${idOrName}'.`,
        `no proportion record stands under the id or name '${idOrName}' — beyond doubling and the half the register ` +
          `holds named proportions only as a canon enters them (Form design note §4.2, §8 D2)`,
      ),
    };
  }
  return { ok: true, value: record };
}

/* ---------------- the acts (§4.1) ---------------- */

export interface ProportionStatement {
  record: ProportionRecord;
  /** The ratio as the record states it, in words. */
  statement: string;
}

/** State the ratio between two held magnitudes. */
export function stateProportion(register: FormRegister, idOrName: string): FormResult<ProportionStatement> {
  const resolved = resolveProportion(register, idOrName);
  if (!resolved.ok) return resolved;
  const p = resolved.value;
  const statement =
    `'${p.terms.b.magnitude}' stands to '${p.terms.a.magnitude}' as ${p.ratio.asStated} — ` +
    `term b = ${p.ratio.factor} × term a, in the terms' stated units`;
  return { ok: true, value: { record: p, statement } };
}

export interface ProportionComparison {
  verdict: "equal" | "greater" | "lesser";
  /** The first proportion's stated factor against the second's. */
  factorA: number;
  factorB: number;
  method: string;
}

/** Compare two proportions from their stated ratios. */
export function compareProportions(register: FormRegister, a: string, b: string): FormResult<ProportionComparison> {
  const ra = resolveProportion(register, a);
  if (!ra.ok) return ra;
  const rb = resolveProportion(register, b);
  if (!rb.ok) return rb;
  const factorA = ra.value.ratio.factor;
  const factorB = rb.value.ratio.factor;
  const verdict = factorA === factorB ? "equal" : factorA > factorB ? "greater" : "lesser";
  return {
    ok: true,
    value: {
      verdict,
      factorA,
      factorB,
      method:
        `compared the stated ratios as held — '${ra.value.id}' states ${factorA} (term b per term a) and ` +
        `'${rb.value.id}' states ${factorB}; the comparison is of the ratios as stated, not of the magnitudes re-measured`,
    },
  };
}

export interface ProportionScaling {
  value: number;
  /** Which term the value belongs to. */
  term: "a" | "b";
  /** The derivation, stated so the answer can show it. */
  derivation: string;
  record: ProportionRecord;
}

/** Scale: given one term's value, give the other's — a
 *  computation, its derivation shown, never testimony. */
export function scaleProportion(
  register: FormRegister,
  idOrName: string,
  known: { term: "a" | "b"; value: number },
): FormResult<ProportionScaling> {
  const resolved = resolveProportion(register, idOrName);
  if (!resolved.ok) return resolved;
  const p = resolved.value;
  const other = known.term === "a" ? "b" : "a";
  const value = known.term === "a" ? known.value * p.ratio.factor : known.value / p.ratio.factor;
  const knownTerm = known.term === "a" ? p.terms.a : p.terms.b;
  const otherTerm = other === "a" ? p.terms.a : p.terms.b;
  const derivation =
    `${known.value} (${knownTerm.magnitude}${knownTerm.unit ? `, in ${knownTerm.unit}` : ""}) ` +
    `${known.term === "a" ? "×" : "÷"} the stated ratio (${p.ratio.asStated}; factor ${p.ratio.factor}) = ${value} ` +
    `(${otherTerm.magnitude}${otherTerm.unit ? `, in ${otherTerm.unit}` : ""}) — a computation from proportion ` +
    `'${p.id}', stated with its inputs, never testimony`;
  return { ok: true, value: { value, term: other, derivation, record: p } };
}

/* ---------------- citing a conversion factor (§4.3) ---------------- */

/**
 * Hold a proportion whose ratio CITES a UnitsMeasurement
 * conversion factor. The factor's home stays in
 * UnitsMeasurement — the record's provenance names it, and
 * the factor is read from the table at hold time, never
 * copied into a second table here. Conversion questions
 * still answer through UnitsMeasurement itself; this is the
 * citation, not a second route.
 */
export function proportionFromConversion(
  register: FormRegister,
  fromUnit: string,
  toUnit: string,
  opts: { magnitude?: string } = {},
): FormResult<ProportionRecord> {
  const probe = convert(1, fromUnit, toUnit);
  if (!probe.ok) {
    if (probe.refusal === "cross-dimension" || probe.refusal === "temperature-scale") {
      return {
        ok: false,
        decline: formDecline(
          "D7",
          `the units '${fromUnit}' and '${toUnit}'`,
          probe.refusal === "temperature-scale"
            ? `'${fromUnit}' and '${toUnit}' are temperature scales — a scale is not a ratio, so no proportion can cite it as one.`
            : `'${fromUnit}' and '${toUnit}' measure unlike dimensions, so no conversion factor relates them and no proportion can cite one.`,
          `UnitsMeasurement refuses the conversion — ${probe.reason} — so there is no stated factor for a ` +
            `proportion record to cite (Form design note §4.3, §8 D7)`,
        ),
      };
    }
    return {
      ok: false,
      decline: formDecline(
        "D2",
        `the unit in '${fromUnit} → ${toUnit}'`,
        `I hold no such unit — ${probe.reason}`,
        `UnitsMeasurement files no unit under one of these names, so no factor stands to be cited (Form design note §4.3, §8 D2)`,
      ),
    };
  }
  const factor = probe.amount;
  return holdProportion(register, {
    terms: {
      a: { magnitude: opts.magnitude ?? `an amount in ${probe.from}`, unit: probe.from, dimension: probe.dimension },
      b: { magnitude: opts.magnitude ?? `an amount in ${probe.to}`, unit: probe.to, dimension: probe.dimension },
    },
    ratio: { factor, asStated: `1 ${probe.from} = ${factor} ${probe.to} (the UnitsMeasurement conversion factor)` },
    provenance: {
      kind: "attested",
      source: "units-measurement",
      detail:
        `the ratio is the UnitsMeasurement Unit's conversion factor for ${probe.from} → ${probe.to}, cited at ` +
        `hold time from its table — cited, never duplicated (Form design note §4.3)`,
    },
  });
}
