/**
 * form-curves.ts — Curves (Form F1, 2026-11-20; design note
 * docs/ansci/form-design-note.md — branch track/form-design —
 * §3, §8, §9.1): Form's reasoning acts over held curves.
 *
 * THE ACTS (§3.4). A curve is ASKED ABOUT — its value at a
 * point, whether it is monotonic over a stretch, where it is
 * steepest — and it is APPLIED: another unit supplies domain
 * values and takes the range values, citing the curve's
 * record; the curve does not move into the consumer. Every
 * answer is a computation, stated as one: the result names
 * the curve it rests on and the method that produced it. A
 * curve's value is never testimony (§6).
 *
 * THE HONESTY CONDITIONS, AT THEIR LOCATIONS. A preset the
 * canon has not entered declines at the name (D1) — no curve
 * is drawn from the name's sound. A question outside the
 * stated domain interval declines there (D3) — Form does
 * not extrapolate a held form. A point set with no stated
 * interpolation is not yet a curve (D4). A shape question
 * the held form cannot decide declines as undecidable (D5)
 * — sampling is not dressed as determination. A record
 * whose lineage cannot be audited answers nothing (D8).
 *
 * THE ANIMATION SEAM (§3.4), STATED PLAINLY. An animation
 * curve is a Curve whose domain is time; Form owns the
 * curve and Timekeeping owns the clock. On this base
 * Timekeeping is NOT built (it is the time programme's work,
 * in its own worktree); what stands here is Slice 5's frame:
 * the conversation's STATED time, which the note is explicit
 * is not a reading. So evaluateAnimationCurve takes a clock
 * reading FROM ITS CALLER — an object the caller vouches
 * for, with its standing named — and with no reading
 * supplied it declines at the missing reading (D9), in the
 * time shapes' own terms. This module never imports the
 * session and never reads a clock to fill the gap.
 */
import {
  formDecline,
  type CurveRecord,
  type FormRegister,
  type FormResult,
  type StatedFunctionForm,
} from "./form";

/* ---------------- the resolved (effective) form ---------------- */

type EffectiveForm =
  | { kind: "function"; fn: StatedFunctionForm; via: CurveRecord }
  | { kind: "points"; points: { x: number; y: number }[]; interpolation?: "linear" | "step"; via: CurveRecord };

/**
 * Resolve a record to the form that can be evaluated: the
 * record's own form, or — for a preset citation — the canon
 * entry's. The lineage audit runs first: a record that
 * cannot be audited answers nothing (D8), and neither can a
 * canon entry it resolves through.
 */
function resolveEffective(register: FormRegister, record: CurveRecord): FormResult<EffectiveForm> {
  const audit = register.auditCurveLineage(record.id);
  if (!audit.ok) return audit;
  if (record.form.kind === "function") return { ok: true, value: { kind: "function", fn: record.form.fn, via: record } };
  if (record.form.kind === "points") {
    return { ok: true, value: { kind: "points", points: record.form.points, interpolation: record.form.interpolation, via: record } };
  }
  // A preset citation: the curve IS the preset, cited by name,
  // with the canon's own statement standing behind the name.
  const entry = register.resolvePreset(record.form.presetName);
  if (!entry) {
    return {
      ok: false,
      decline: formDecline(
        "D1",
        `the preset name '${record.form.presetName}'`,
        `I hold no preset by the name '${record.form.presetName}'.`,
        `curve '${record.id}' cites the preset '${record.form.presetName}', and the register holds no record entered ` +
          `under that name by a canon — the canon's absence is the record (Form design note §3.2); no curve is drawn ` +
          `from the name's sound and no near-name preset is substituted (§8 D1)`,
      ),
    };
  }
  const entryAudit = register.auditCurveLineage(entry.id);
  if (!entryAudit.ok) return entryAudit;
  if (entry.form.kind === "preset") {
    // A canon entry that itself cites a preset would make the
    // name stand behind a name; the canon's statement must be
    // a form, so this record cannot decide the question.
    return {
      ok: false,
      decline: formDecline(
        "D5",
        `the preset '${record.form.presetName}'`,
        `The preset '${record.form.presetName}' is itself held only as a citation of another preset, so its shape cannot be decided from what I hold.`,
        `canon entry '${entry.id}' for preset '${record.form.presetName}' has a preset form itself — a preset's canon ` +
          `statement must be a stated function or control points (§3.1); the chain of names decides nothing (§8 D5)`,
      ),
    };
  }
  if (entry.form.kind === "function") return { ok: true, value: { kind: "function", fn: entry.form.fn, via: entry } };
  return { ok: true, value: { kind: "points", points: entry.form.points, interpolation: entry.form.interpolation, via: entry } };
}

function label(record: CurveRecord): string {
  return record.name ?? record.id;
}

function outsideDomain(record: CurveRecord, x: number, what: string): FormResult<never> {
  return {
    ok: false,
    decline: formDecline(
      "D3",
      `the domain of curve '${record.id}'`,
      `The curve '${label(record)}' is stated over ${record.domainName} from ${record.domain.from} to ${record.domain.to}; ` +
        `${what} falls outside it, and I do not extrapolate a held form past the stretch it was stated over.`,
      `${what} is outside the domain interval [${record.domain.from}, ${record.domain.to}] stated on curve ` +
        `'${record.id}' — the curve is not defined there (Form design note §3.1, §8 D3)`,
    ),
  };
}

function noInterpolation(record: CurveRecord): FormResult<never> {
  return {
    ok: false,
    decline: formDecline(
      "D4",
      `curve '${record.id}'`,
      `Those points are held as points, with no rule stated between them — not yet a curve.`,
      `curve '${record.id}' holds ${record.form.kind === "points" ? record.form.points.length : 0} control points and ` +
        `no interpolation rule; a set of points with no stated rule between them is not yet a curve, and the set is ` +
        `not silently joined by the nearest familiar rule (Form design note §3.1, §8 D4)`,
    ),
  };
}

/* ---------------- evaluation machinery ---------------- */

function evalFunction(fn: StatedFunctionForm, x: number): number {
  switch (fn.form) {
    case "constant":
      return fn.value;
    case "line":
      return fn.slope * x + fn.intercept;
    case "parabola":
      return fn.a * x * x + fn.b * x + fn.c;
    case "sine":
      return fn.amplitude * Math.sin(fn.frequency * x + fn.phase);
  }
}

function derivFunction(fn: StatedFunctionForm, x: number): number {
  switch (fn.form) {
    case "constant":
      return 0;
    case "line":
      return fn.slope;
    case "parabola":
      return 2 * fn.a * x + fn.b;
    case "sine":
      return fn.amplitude * fn.frequency * Math.cos(fn.frequency * x + fn.phase);
  }
}

/** The value of a point set at x, under its stated rule.
 *  Caller has checked x is inside the points' span. */
function evalPoints(points: { x: number; y: number }[], rule: "linear" | "step", x: number): number {
  if (x <= points[0].x) return points[0].y;
  for (let i = 1; i < points.length; i++) {
    if (x <= points[i].x) {
      if (rule === "step") return points[i - 1].y;
      const p0 = points[i - 1];
      const p1 = points[i];
      return p0.y + ((p1.y - p0.y) * (x - p0.x)) / (p1.x - p0.x);
    }
  }
  return points[points.length - 1].y;
}

/* ---------------- value at a point (§3.4) ---------------- */

export interface CurveValue {
  value: number;
  /** The record the answer rests on (the canon entry, for a
   *  preset citation). */
  curveId: string;
  /** How the value was produced, stated for the audit. */
  method: string;
}

export function evaluateCurve(register: FormRegister, id: string, x: number): FormResult<CurveValue> {
  const record = register.curve(id);
  if (!record) throw new Error(`evaluateCurve: no curve record '${id}' is held`);
  const eff = resolveEffective(register, record);
  if (!eff.ok) return eff;
  if (x < record.domain.from || x > record.domain.to) return outsideDomain(record, x, `${record.domainName} ${x}`);
  const form = eff.value;
  if (form.kind === "function") {
    return {
      ok: true,
      value: {
        value: evalFunction(form.fn, x),
        curveId: form.via.id,
        method: `evaluated the stated ${form.fn.form} form of curve '${form.via.id}' at ${record.domainName} ${x}`,
      },
    };
  }
  if (!form.interpolation) return noInterpolation(record);
  const span = { from: form.points[0].x, to: form.points[form.points.length - 1].x };
  if (x < span.from || x > span.to) {
    return {
      ok: false,
      decline: formDecline(
        "D3",
        `the stated points of curve '${form.via.id}'`,
        `The curve '${label(record)}' is stated by points over ${record.domainName} from ${span.from} to ${span.to}; ` +
          `${record.domainName} ${x} falls outside the points, and I do not extend a held form past the points it was stated with.`,
        `${record.domainName} ${x} is inside the record's domain interval but outside the span [${span.from}, ` +
          `${span.to}] of the control points that state the curve — beyond the last point the form says nothing ` +
          `(Form design note §3.1, §8 D3)`,
      ),
    };
  }
  return {
    ok: true,
    value: {
      value: evalPoints(form.points, form.interpolation, x),
      curveId: form.via.id,
      method: `interpolated (${form.interpolation}) the control points of curve '${form.via.id}' at ${record.domainName} ${x}`,
    },
  };
}

/* ---------------- monotonic (§3.4) ---------------- */

export interface CurveMonotonicity {
  nonDecreasing: boolean;
  nonIncreasing: boolean;
  verdict: "increasing" | "decreasing" | "constant" | "neither";
  curveId: string;
  method: string;
}

function monotonicVerdict(nonDecreasing: boolean, nonIncreasing: boolean): CurveMonotonicity["verdict"] {
  if (nonDecreasing && nonIncreasing) return "constant";
  if (nonDecreasing) return "increasing";
  if (nonIncreasing) return "decreasing";
  return "neither";
}

/** Does the stretch (from, to) contain a stationary point of
 *  the sine form in its interior? Stationary points stand
 *  where frequency·x + phase = π/2 + kπ. */
function sineHasInteriorStationary(fn: Extract<StatedFunctionForm, { form: "sine" }>, from: number, to: number): boolean {
  if (fn.amplitude === 0 || fn.frequency === 0) return false;
  const lo = fn.frequency * from + fn.phase;
  const hi = fn.frequency * to + fn.phase;
  const kMin = Math.floor((Math.min(lo, hi) - Math.PI / 2) / Math.PI) + 1;
  const kMax = Math.ceil((Math.max(lo, hi) - Math.PI / 2) / Math.PI) - 1;
  return kMax >= kMin;
}

export function curveMonotonic(
  register: FormRegister,
  id: string,
  stretch?: { from: number; to: number },
): FormResult<CurveMonotonicity> {
  const record = register.curve(id);
  if (!record) throw new Error(`curveMonotonic: no curve record '${id}' is held`);
  const eff = resolveEffective(register, record);
  if (!eff.ok) return eff;
  const s = stretch ?? { ...record.domain };
  if (s.from < record.domain.from || s.to > record.domain.to) {
    return outsideDomain(record, s.from < record.domain.from ? s.from : s.to, `the stretch [${s.from}, ${s.to}]`);
  }
  const form = eff.value;
  const done = (nonDecreasing: boolean, nonIncreasing: boolean, method: string): FormResult<CurveMonotonicity> => ({
    ok: true,
    value: { nonDecreasing, nonIncreasing, verdict: monotonicVerdict(nonDecreasing, nonIncreasing), curveId: form.via.id, method },
  });
  if (form.kind === "function") {
    const fn = form.fn;
    switch (fn.form) {
      case "constant":
        return done(true, true, `a constant form neither increases nor decreases, over any stretch`);
      case "line":
        return done(
          fn.slope >= 0,
          fn.slope <= 0,
          `a line's rate is its slope (${fn.slope}) everywhere, so the stretch's monotonicity is the slope's sign`,
        );
      case "parabola": {
        if (fn.a === 0) return done(fn.b >= 0, fn.b <= 0, `the parabola degenerates to a line of slope ${fn.b}`);
        const vertex = -fn.b / (2 * fn.a);
        if (vertex > s.from && vertex < s.to) {
          return done(false, false, `the parabola's vertex (${vertex}) stands inside the stretch, so the curve turns there`);
        }
        const rising = fn.a > 0 ? s.from >= vertex : s.to <= vertex;
        return done(rising, !rising, `the parabola's vertex (${vertex}) stands outside the stretch; the stretch lies on its ${rising ? "rising" : "falling"} side`);
      }
      case "sine": {
        if (fn.amplitude === 0 || fn.frequency === 0) return done(true, true, `the sine form is constant (amplitude or frequency zero)`);
        if (sineHasInteriorStationary(fn, s.from, s.to)) {
          return done(false, false, `a stationary point of the sine stands inside the stretch, so the curve turns there`);
        }
        const mid = (s.from + s.to) / 2;
        const rising = derivFunction(fn, mid) > 0;
        return done(rising, !rising, `no stationary point stands inside the stretch; the derivative's sign there is ${rising ? "positive" : "negative"} throughout`);
      }
    }
  }
  if (!form.interpolation) return noInterpolation(record);
  const span = { from: form.points[0].x, to: form.points[form.points.length - 1].x };
  if (s.from < span.from || s.to > span.to) {
    return {
      ok: false,
      decline: formDecline(
        "D5",
        `curve '${form.via.id}' over [${s.from}, ${s.to}]`,
        `The held points of '${label(record)}' run only from ${span.from} to ${span.to}, so whether the curve is monotonic over the whole stretch cannot be decided from what I hold.`,
        `the stretch [${s.from}, ${s.to}] extends past the control points' span [${span.from}, ${span.to}]; between ` +
          `the last point and the stretch's end the held form states nothing, and sampling or extending the points ` +
          `would be dressed as determination (Form design note §3.4, §8 D5)`,
      ),
    };
  }
  // The critical values: the stretch's ends (interpolated) and
  // every control point inside it. Between consecutive
  // critical points the stated rule is a single segment (or a
  // single step), so the sequence of values decides.
  const xs = [s.from, ...form.points.filter((p) => p.x > s.from && p.x < s.to).map((p) => p.x), s.to];
  const ys = xs.map((x) => evalPoints(form.points, form.interpolation!, x));
  const nonDecreasing = ys.every((y, i) => i === 0 || y >= ys[i - 1]);
  const nonIncreasing = ys.every((y, i) => i === 0 || y <= ys[i - 1]);
  return done(
    nonDecreasing,
    nonIncreasing,
    `read off the ${form.interpolation} segments between the ${xs.length} critical points of the stretch`,
  );
}

/* ---------------- steepest where (§3.4) ---------------- */

export interface CurveSteepest {
  /** The greatest rate of change over the stretch. */
  rate: number;
  /** Where the rate stands: a point, a segment, or the whole
   *  stretch ("everywhere"). */
  at: { from: number; to: number } | "everywhere";
  curveId: string;
  method: string;
}

export function curveSteepest(
  register: FormRegister,
  id: string,
  stretch?: { from: number; to: number },
): FormResult<CurveSteepest> {
  const record = register.curve(id);
  if (!record) throw new Error(`curveSteepest: no curve record '${id}' is held`);
  const eff = resolveEffective(register, record);
  if (!eff.ok) return eff;
  const s = stretch ?? { ...record.domain };
  if (s.from < record.domain.from || s.to > record.domain.to) {
    return outsideDomain(record, s.from < record.domain.from ? s.from : s.to, `the stretch [${s.from}, ${s.to}]`);
  }
  const form = eff.value;
  if (form.kind === "function") {
    const fn = form.fn;
    switch (fn.form) {
      case "constant":
        return { ok: true, value: { rate: 0, at: "everywhere", curveId: form.via.id, method: "a constant form's rate is zero everywhere" } };
      case "line":
        return {
          ok: true,
          value: { rate: Math.abs(fn.slope), at: "everywhere", curveId: form.via.id, method: `a line's rate is its slope (${fn.slope}) at every point of the stretch` },
        };
      case "parabola": {
        const dFrom = Math.abs(derivFunction(fn, s.from));
        const dTo = Math.abs(derivFunction(fn, s.to));
        const at = dFrom >= dTo ? s.from : s.to;
        return {
          ok: true,
          value: {
            rate: Math.max(dFrom, dTo),
            at: { from: at, to: at },
            curveId: form.via.id,
            method: "a parabola's rate grows linearly, so its greatest over a stretch stands at an end; both ends were evaluated",
          },
        };
      }
      case "sine": {
        const maxRate = Math.abs(fn.amplitude * fn.frequency);
        // Points where |cos| = 1 stand where frequency·x + phase = kπ.
        if (fn.frequency !== 0) {
          const lo = fn.frequency * s.from + fn.phase;
          const hi = fn.frequency * s.to + fn.phase;
          const k = Math.ceil(Math.min(lo, hi) / Math.PI);
          const peakX = (k * Math.PI - fn.phase) / fn.frequency;
          if (peakX >= s.from && peakX <= s.to) {
            return {
              ok: true,
              value: { rate: maxRate, at: { from: peakX, to: peakX }, curveId: form.via.id, method: "the stretch contains a point where the sine's rate peaks (|cos| = 1)" },
            };
          }
        }
        const dFrom = Math.abs(derivFunction(fn, s.from));
        const dTo = Math.abs(derivFunction(fn, s.to));
        const at = dFrom >= dTo ? s.from : s.to;
        return {
          ok: true,
          value: { rate: Math.max(dFrom, dTo), at: { from: at, to: at }, curveId: form.via.id, method: "no rate peak stands inside the stretch, so the greatest rate stands at an end; both ends were evaluated" },
        };
      }
    }
  }
  if (!form.interpolation) return noInterpolation(record);
  if (form.interpolation === "step") {
    return {
      ok: false,
      decline: formDecline(
        "D5",
        `curve '${form.via.id}'`,
        `A step curve's rate is zero along its steps and concentrated at its jumps, where no rate stands as a number — the steepest point cannot be named from this form.`,
        `the steepest-where question asks for a point of greatest rate; a step-interpolated curve has derivative zero ` +
          `almost everywhere and a discontinuity at each jump, so the held form cannot decide a steepest point — ` +
          `naming a jump as one would dress a discontinuity as a rate (Form design note §3.4, §8 D5)`,
      ),
    };
  }
  // linear segments: the greatest segment slope over the stretch.
  let best: { rate: number; from: number; to: number } | undefined;
  for (let i = 1; i < form.points.length; i++) {
    const p0 = form.points[i - 1];
    const p1 = form.points[i];
    const segFrom = Math.max(p0.x, s.from);
    const segTo = Math.min(p1.x, s.to);
    if (segFrom > segTo) continue;
    const rate = Math.abs((p1.y - p0.y) / (p1.x - p0.x));
    if (!best || rate > best.rate) best = { rate, from: segFrom, to: segTo };
  }
  if (!best) {
    return {
      ok: false,
      decline: formDecline(
        "D5",
        `curve '${form.via.id}' over [${s.from}, ${s.to}]`,
        `No segment of the held points falls inside the stretch, so its steepest place cannot be decided from what I hold.`,
        `the stretch [${s.from}, ${s.to}] contains no control-point segment of curve '${form.via.id}' (Form design note §8 D5)`,
      ),
    };
  }
  return {
    ok: true,
    value: { rate: best.rate, at: { from: best.from, to: best.to }, curveId: form.via.id, method: "the greatest rate among the stretch's linear segments, compared segment by segment" },
  };
}

/* ---------------- application (§3.4) ---------------- */

/**
 * Apply a curve: the consumer supplies the domain values and
 * takes the range values, citing the record. The first
 * decline on any value is the application's decline — an
 * application does not serve a partial series in silence.
 */
export function applyCurve(register: FormRegister, id: string, domainValues: number[]): FormResult<{ values: number[]; curveId: string }> {
  const values: number[] = [];
  let curveId = id;
  for (const x of domainValues) {
    const r = evaluateCurve(register, id, x);
    if (!r.ok) return r;
    values.push(r.value.value);
    curveId = r.value.curveId;
  }
  return { ok: true, value: { values, curveId } };
}

/* ---------------- the animation seam (§3.4, D9) ---------------- */

/**
 * A clock reading as a caller supplies it: the value, and
 * the standing the caller claims for it (a Timekeeping
 * consultation's reading, when Timekeeping stands; at this
 * rung, whatever surface supplies "now" must name what its
 * "now" is). Form vouches for none of it — it evaluates its
 * curve at the value and names the standing in the answer's
 * method, exactly as §3.4 states.
 */
export interface ClockReading {
  value: number;
  standing: string;
}

export function evaluateAnimationCurve(
  register: FormRegister,
  id: string,
  reading?: ClockReading,
): FormResult<CurveValue & { readingStanding: string }> {
  const record = register.curve(id);
  if (!record) throw new Error(`evaluateAnimationCurve: no curve record '${id}' is held`);
  if (!reading) {
    return {
      ok: false,
      decline: formDecline(
        "D9",
        `the clock reading for curve '${id}'`,
        `I have no clock reading to evaluate '${label(record)}' at — the curve is Form's, but what time it is belongs to a reading I do not hold.`,
        `an animation curve is evaluated at a domain value Timekeeping supplies; no clock reading stands for this ` +
          `evaluation, and Form does not read a clock to fill the gap — nor treat the frame's stated time as a ` +
          `reading (Form design note §3.4, §8 D9)`,
      ),
    };
  }
  const r = evaluateCurve(register, id, reading.value);
  if (!r.ok) return r;
  return { ok: true, value: { ...r.value, method: `${r.value.method}; the domain value came from a clock reading standing as: ${reading.standing}`, readingStanding: reading.standing } };
}
