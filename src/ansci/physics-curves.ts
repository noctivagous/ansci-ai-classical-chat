/**
 * physics-curves.ts — the curve record of the Form design
 * note (docs/ansci/form-design-note.md §3.1, §3.3),
 * implemented ahead of Form's own build because the
 * Physics Unit is its first producer (physics design
 * note §7: "the trajectory is a curve — Form's keeping,
 * Physics' production"). When Form is built, this
 * register is its §3.1 register; the record shape is
 * Form's, not a physics-local invention.
 *
 * LANDING NOTE (2026-11-20): written on track/physics-build
 * as src/ansci/form-curves.ts. On landing, Form's own build
 * owns that filename (Form's register lives in form.ts +
 * form-curves.ts), so this module — Physics' trajectory-
 * curve store — stands under this name; apart from this
 * header, the code is the P3 module unchanged.
 *
 * A curve, as held (§3.1): a stated relation between a
 * domain and a range, held in one of three forms — a
 * stated function, CONTROL POINTS with a stated
 * interpolation, or a named preset. This module holds
 * the control-points form (the form a sampled
 * trajectory and an edited curve both take); the
 * interpolation rule is part of the record, and a set
 * of points with no stated rule is not yet a curve.
 * Every record states its DOMAIN INTERVAL and is not
 * defined outside it — evaluation outside the interval
 * declines, located at the interval, rather than
 * extrapolating.
 *
 * Lineage (§3.3): an edited curve is a NEW record
 * citing its parent; records are appended, never
 * edited. A record whose cited parent is not held has
 * a BROKEN lineage — a located gap, not a quiet
 * repair — and is not answerable-from: the orphan is
 * never treated as a first record.
 *
 * The asking acts (§3.4) implemented here are the ones
 * Physics P3 needs: value at a point, first crossing
 * of a stated level, and rate at a point — each a
 * computation over the held points by the record's
 * stated interpolation, named as such wherever its
 * result is used. Nothing here steps an engine:
 * answering from a curve is reading a record.
 */

export interface CurvePoint {
  x: number;
  y: number;
}

export type CurveParent =
  | { kind: "derivation"; ref: string }
  | { kind: "curve"; ref: string };

export interface CurveRecord {
  id: string;
  /** §3.1's held forms; this module holds the
   *  control-points form. */
  heldForm: "control-points";
  /** What varies along the curve ("time (s)"). */
  domain: string;
  /** What the curve gives back ("centre height (m)"). */
  range: string;
  points: CurvePoint[];
  /** Part of the record (§3.1): the rule between the
   *  points. Linear is the only rule this rung states. */
  interpolation: "linear";
  /** The stretch of the domain the curve is defined
   *  over (§3.1). Outside it, the curve is not defined. */
  domainInterval: [number, number];
  /** §3.3's lineage citation, where the curve has a
   *  parent: a derivation record (a simulation's), or
   *  another curve (an edit's). */
  parent?: CurveParent;
  /** Where the curve came from, in one statement —
   *  the record's provenance, citable by any answer
   *  that rests on it. */
  provenance: string;
}

/** The register of held curves (§3.1's register, held
 *  here until Form's own build takes it). Append-only:
 *  records are held, never edited or removed. */
export class CurveStore {
  private readonly records = new Map<string, CurveRecord>();

  hold(record: CurveRecord): void {
    this.records.set(record.id, record);
  }

  get(id: string): CurveRecord | undefined {
    return this.records.get(id);
  }

  /** §3.3: a lineage is intact when every curve-parent
   *  in the chain is itself held (a derivation parent
   *  is a root — the derivation record stands behind
   *  it by construction). A cycle is broken by
   *  definition: it can never be audited to a root. */
  lineageIntact(record: CurveRecord): boolean {
    const seen = new Set<string>([record.id]);
    let current: CurveRecord = record;
    while (current.parent) {
      if (current.parent.kind === "derivation") return true;
      if (seen.has(current.parent.ref)) return false;
      const parent = this.records.get(current.parent.ref);
      if (!parent) return false;
      seen.add(parent.id);
      current = parent;
    }
    return true;
  }

  /** The curve an answer may rest on: held, and with
   *  an intact lineage. Anything else — absent, or an
   *  orphan — is not answerable-from (§3.3). */
  answerable(id: string): CurveRecord | undefined {
    const record = this.records.get(id);
    if (!record) return undefined;
    return this.lineageIntact(record) ? record : undefined;
  }
}

/** Value at a point (§3.4): the record's stated
 *  interpolation between the bracketing held points.
 *  Outside the domain interval the curve is not
 *  defined — undefined, and the caller declines at the
 *  interval rather than extrapolating. */
export function valueAt(curve: CurveRecord, x: number): number | undefined {
  const [lo, hi] = curve.domainInterval;
  if (x < lo || x > hi) return undefined;
  const pts = curve.points;
  if (pts.length === 0) return undefined;
  if (x <= pts[0].x) return pts[0].y;
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i].x) {
      const a = pts[i - 1];
      const b = pts[i];
      if (b.x === a.x) return b.y;
      return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
    }
  }
  return pts[pts.length - 1].y;
}

/** The first domain value at which the curve crosses a
 *  stated level, by the record's interpolation between
 *  consecutive held points; undefined when the curve
 *  never reaches the level inside its interval. The
 *  when-does-it-reach act (§7 of the physics note). */
export function firstCrossing(curve: CurveRecord, level: number): number | undefined {
  const pts = curve.points;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].y === level) return pts[i].x;
    if (i + 1 < pts.length) {
      const a = pts[i];
      const b = pts[i + 1];
      if ((a.y - level) * (b.y - level) < 0) {
        return a.x + ((level - a.y) * (b.x - a.x)) / (b.y - a.y);
      }
    }
  }
  return undefined;
}

/** Rate at a point: the slope of the bracketing
 *  segment — the finite-difference rate over the held
 *  points, the method stated wherever the number is
 *  used. Undefined outside the domain interval. */
export function segmentRateAt(curve: CurveRecord, x: number): number | undefined {
  const [lo, hi] = curve.domainInterval;
  if (x < lo || x > hi) return undefined;
  const pts = curve.points;
  if (pts.length < 2) return undefined;
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i].x || i === pts.length - 1) {
      const a = pts[i - 1];
      const b = pts[i];
      if (b.x === a.x) return undefined;
      return (b.y - a.y) / (b.x - a.x);
    }
  }
  return undefined;
}
