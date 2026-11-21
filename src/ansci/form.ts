/**
 * form.ts — Form (Form F1, 2026-11-20; design note
 * docs/ansci/form-design-note.md — branch track/form-design —
 * §2, §3.3): the register of forms, held by the division of
 * Mathematics that answers "in what shape".
 *
 * PLACEMENT, AS THE RECORD STANDS (the note's §2.2
 * reconciliation). Mathematics is a Unit seated inside the
 * OKU, a container; inside it stand the QuantificationUnit
 * (over its Numbers slice) and the Geometry Unit (a seat
 * only). Form is the third resident the note designs: a
 * CO-DIVISION of Mathematics, sibling to the
 * QuantificationUnit's Number remit — not a sub-part of the
 * QuantificationUnit, whose slice is Numbers. Form follows
 * the EDU/SenseUnit pattern the QuantificationUnit's own
 * statement names: the specialist reader of its slice,
 * keeping no private lore. Its slice is this register:
 * presets, held curves, named proportions, known cycles.
 *
 * THE REGISTER'S DISCIPLINE (the note's §3.3, §4.1, §5.1,
 * on the geography register's pattern). Records are
 * APPENDED, never edited — the quantity ledger's discipline
 * applied to forms. An edit is a new record citing its
 * parent; the parent stands, citable, exactly as it was.
 * Every record carries its provenance — where the form came
 * from — or it is not held: hold operations take provenance
 * as a required field, and there is no default. The register
 * is a process-level store, like the banks: it persists
 * across sessions within a process and not across restarts,
 * and no file backing is claimed.
 *
 * WHAT FORM NEVER DOES (the note's §6): originates no world
 * claims; recounts nothing (Number's work); reads no clock
 * (Timekeeping's); registers and fires nothing
 * (Scheduling's). Its records are forms — the shapes by
 * which variation is stated, named and checked — and its
 * declines (the note's §8 catalogue, D1–D10) name each gap
 * at its location. The decline wordings in this programme
 * are DRAFTS — the owner's to settle.
 */

import type { ProportionRecord } from "./form-proportions";
import type { PatternRecord } from "./form-repetition";

/* ---------------- provenance ---------------- */

/**
 * A held form's attestation. "canon" — a canon entered by
 * the owner's ruling or by banked intake from an attested
 * source (the note's §3.2: the source is named, never
 * implied). "stated" — stated by a consumer or in
 * conversation and held exactly as stated. "convention" —
 * a connective-layer convention of the frame (the seasons,
 * the dayparts). "attested" — an attested filing the system
 * already holds (the cycle constants in sentence.ts, a
 * UnitsMeasurement factor cited by a proportion).
 */
export type FormProvenance =
  | { kind: "canon"; source: string; detail: string }
  | { kind: "stated"; detail: string }
  | { kind: "convention"; source: string; detail: string }
  | { kind: "attested"; source: string; detail: string };

/* ---------------- located declines (the note's §8) ---------------- */

/** The note's §8 catalogue codes. Each decline names the
 *  gap at its location; none serves a substitute. */
export type FormDeclineCode =
  | "D1" // unknown preset
  | "D2" // unknown named proportion / known cycle
  | "D3" // asked outside its domain
  | "D4" // no stated interpolation — not yet a curve
  | "D5" // undecidable shape question
  | "D6" // too short a sequence
  | "D7" // incommensurable terms
  | "D8" // broken lineage
  | "D9" // application without a domain (no clock reading)
  | "D10"; // world claim at the wrong gate

export interface FormDecline {
  code: FormDeclineCode;
  /** Where the gap sits, in the system's own terms. */
  location: string;
  /** DRAFT wording — the owner's to settle. */
  reply: string;
  /** The trace-level statement of the gap and its ground. */
  detail: string;
}

export type FormResult<T> = { ok: true; value: T } | { ok: false; decline: FormDecline };

export function formDecline(code: FormDeclineCode, location: string, reply: string, detail: string): FormDecline {
  return { code, location, reply, detail };
}

/* ---------------- curves: the held forms (the note's §3.1) ---------------- */

/** A closed form stated in terms the evaluator shares —
 *  data, not code, so a record can be audited as held. */
export type StatedFunctionForm =
  | { form: "constant"; value: number }
  | { form: "line"; slope: number; intercept: number }
  | { form: "parabola"; a: number; b: number; c: number }
  | { form: "sine"; amplitude: number; frequency: number; phase: number };

/** The stated rule between control points. A point set with
 *  no rule is held as points — not yet a curve (D4). */
export type InterpolationRule = "linear" | "step";

export type CurveForm =
  | { kind: "function"; fn: StatedFunctionForm }
  | { kind: "points"; points: { x: number; y: number }[]; interpolation?: InterpolationRule }
  | { kind: "preset"; presetName: string };

export interface CurveRecord {
  id: string;
  /** A name a conversation or another unit may cite, if any. */
  name?: string;
  /** Set when THIS record is a canon's preset entry: other
   *  curves cite it by this name through a preset form. Only
   *  a record whose provenance is a canon resolves a preset
   *  citation (the note's §3.2). */
  presetName?: string;
  form: CurveForm;
  /** The stretch of the domain the curve is defined over.
   *  A curve is not silently defined outside it (D3). */
  domain: { from: number; to: number };
  /** What varies along the domain ("time", "distance", …). */
  domainName: string;
  rangeName?: string;
  provenance: FormProvenance;
  /** Lineage: the record this one was edited from. May
   *  dangle on an intake record — acts that must audit the
   *  lineage decline at the break (D8). */
  parentId?: string;
  /** The edit, stated in the editor's terms. */
  editNote?: string;
  /** When this register held the record, ISO. */
  heldAt: string;
}

export interface CurveHoldInput {
  name?: string;
  presetName?: string;
  form: CurveForm;
  domain: { from: number; to: number };
  domainName: string;
  rangeName?: string;
  provenance: FormProvenance;
  parentId?: string;
  editNote?: string;
}

/* ---------------- the register ---------------- */

/**
 * The register of forms: append-only stores for the
 * division's three members. Curves stand from F1;
 * proportions (F2) and patterns (F3) join the same register
 * under the same discipline — one keeper, so a citation in
 * any member resolves under one lineage discipline.
 */
export class FormRegister {
  private curves: CurveRecord[] = [];
  private proportions: ProportionRecord[] = [];
  private patterns: PatternRecord[] = [];
  private curveSeq = 0;
  private proportionSeq = 0;
  private patternSeq = 0;
  private readonly now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  private stamp(): string {
    return this.now().toISOString();
  }

  /* ----- curves ----- */

  /**
   * Hold a curve. Provenance is required by the type — a
   * form is held with where it came from, or it is not
   * held. Structural nonsense (an empty point set, an
   * inverted domain) is a caller's error and throws; the
   * epistemic gaps are the declines, and they live in the
   * acts (form-curves.ts), not here.
   */
  holdCurve(input: CurveHoldInput): CurveRecord {
    if (input.domain.from > input.domain.to) {
      throw new Error(`holdCurve: domain [${input.domain.from}, ${input.domain.to}] is inverted`);
    }
    if (input.form.kind === "points") {
      if (input.form.points.length === 0) throw new Error("holdCurve: a point set may not be empty");
      for (let i = 1; i < input.form.points.length; i++) {
        if (input.form.points[i].x <= input.form.points[i - 1].x) {
          throw new Error("holdCurve: control points must stand in strictly increasing domain order");
        }
      }
    }
    const record: CurveRecord = {
      id: `curve-${++this.curveSeq}`,
      name: input.name,
      presetName: input.presetName,
      form: input.form,
      domain: { ...input.domain },
      domainName: input.domainName,
      rangeName: input.rangeName,
      provenance: input.provenance,
      parentId: input.parentId,
      editNote: input.editNote,
      heldAt: this.stamp(),
    };
    this.curves.push(record);
    return record;
  }

  /**
   * Edit a curve (the note's §3.3): a NEW record citing its
   * parent, the parent untouched. The edit states what it
   * changes; unstated fields carry over. An edit of a record
   * whose own lineage is broken cannot be audited either —
   * it declines at the same break (D8).
   */
  editCurve(parentId: string, edit: Partial<CurveHoldInput> & { editNote: string; provenance: FormProvenance }): FormResult<CurveRecord> {
    const parent = this.curve(parentId);
    if (!parent) throw new Error(`editCurve: no curve record '${parentId}' is held`);
    const audit = this.auditCurveLineage(parentId);
    if (!audit.ok) return audit;
    return {
      ok: true,
      value: this.holdCurve({
        name: edit.name ?? parent.name,
        presetName: edit.presetName ?? parent.presetName,
        form: edit.form ?? parent.form,
        domain: edit.domain ?? parent.domain,
        domainName: edit.domainName ?? parent.domainName,
        rangeName: edit.rangeName ?? parent.rangeName,
        provenance: edit.provenance,
        parentId,
        editNote: edit.editNote,
      }),
    };
  }

  curve(id: string): CurveRecord | undefined {
    return this.curves.find((c) => c.id === id);
  }

  allCurves(): readonly CurveRecord[] {
    return this.curves;
  }

  /** Children in the order they were held. */
  curveChildren(id: string): CurveRecord[] {
    return this.curves.filter((c) => c.parentId === id);
  }

  /**
   * The lineage of a record, root first, the record last.
   * A cited parent that is not held breaks the audit: the
   * decline names the missing parent (D8), and the orphan
   * is not treated as a first record.
   */
  auditCurveLineage(id: string): FormResult<CurveRecord[]> {
    const start = this.curve(id);
    if (!start) throw new Error(`auditCurveLineage: no curve record '${id}' is held`);
    const chain: CurveRecord[] = [start];
    let current = start;
    while (current.parentId) {
      const parent = this.curve(current.parentId);
      if (!parent) {
        return {
          ok: false,
          decline: formDecline(
            "D8",
            `the lineage of curve '${id}'`,
            `The record '${id}' cites a parent, '${current.parentId}', that I do not hold; it cannot be audited, and I do not treat it as a first record.`,
            `curve '${current.id}' cites parent '${current.parentId}', which is not in the register — the chain of ` +
              `citations breaks there, so no answer may rest on this record's lineage (Form design note §3.3, §8 D8)`,
          ),
        };
      }
      chain.unshift(parent);
      current = parent;
    }
    return { ok: true, value: chain };
  }

  /** The latest record in a lineage: the most recently held
   *  descendant leaf, walking children in hold order. A
   *  consumer who wants the current form asks for this,
   *  explicitly (the note's §3.3). */
  latestCurveInLineage(id: string): CurveRecord {
    let current = this.curve(id);
    if (!current) throw new Error(`latestCurveInLineage: no curve record '${id}' is held`);
    for (;;) {
      const children = this.curveChildren(current.id);
      if (children.length === 0) return current;
      current = children[children.length - 1];
    }
  }

  /**
   * Resolve a preset citation (the note's §3.2): the latest
   * held record entered under that preset name BY A CANON.
   * A record merely stated under the name is not the canon's
   * statement and does not resolve it. Undefined when the
   * canon has not entered the name — the caller's D1.
   */
  resolvePreset(presetName: string): CurveRecord | undefined {
    const entries = this.curves.filter((c) => c.presetName === presetName && c.provenance.kind === "canon");
    return entries[entries.length - 1];
  }

  /* ----- proportions (F2 — the acts stand in form-proportions.ts) ----- */

  nextProportionId(): string {
    return `proportion-${++this.proportionSeq}`;
  }

  holdProportionRecord(record: ProportionRecord): ProportionRecord {
    this.proportions.push(record);
    return record;
  }

  proportion(id: string): ProportionRecord | undefined {
    return this.proportions.find((p) => p.id === id);
  }

  allProportions(): readonly ProportionRecord[] {
    return this.proportions;
  }

  /** The latest record held under a name — a named
   *  proportion is cited by name, as a preset is. */
  proportionByName(name: string): ProportionRecord | undefined {
    const entries = this.proportions.filter((p) => p.name === name);
    return entries[entries.length - 1];
  }

  /* ----- patterns (F3 — the acts stand in form-repetition.ts) ----- */

  nextPatternId(): string {
    return `pattern-${++this.patternSeq}`;
  }

  holdPatternRecord(record: PatternRecord): PatternRecord {
    this.patterns.push(record);
    return record;
  }

  pattern(id: string): PatternRecord | undefined {
    return this.patterns.find((p) => p.id === id);
  }

  allPatterns(): readonly PatternRecord[] {
    return this.patterns;
  }

  /** The latest record held under a cycle's name — a known
   *  cycle is cited by name, as a preset is. */
  patternByName(name: string): PatternRecord | undefined {
    const entries = this.patterns.filter((p) => p.name === name);
    return entries[entries.length - 1];
  }

  patternChildren(id: string): PatternRecord[] {
    return this.patterns.filter((p) => p.parentId === id);
  }

  /** A pattern's lineage, root first — the same audit as a
   *  curve's (§3.3's discipline applied to patterns, §5.3):
   *  a cited parent that is not held breaks it (D8). */
  auditPatternLineage(id: string): FormResult<PatternRecord[]> {
    const start = this.pattern(id);
    if (!start) throw new Error(`auditPatternLineage: no pattern record '${id}' is held`);
    const chain: PatternRecord[] = [start];
    let current = start;
    while (current.parentId) {
      const parent = this.pattern(current.parentId);
      if (!parent) {
        return {
          ok: false,
          decline: formDecline(
            "D8",
            `the lineage of pattern '${id}'`,
            `The record '${id}' cites a parent, '${current.parentId}', that I do not hold; it cannot be audited, and I do not treat it as a first record.`,
            `pattern '${current.id}' cites parent '${current.parentId}', which is not in the register — the chain ` +
              `of citations breaks there (Form design note §5.3, §8 D8)`,
          ),
        };
      }
      chain.unshift(parent);
      current = parent;
    }
    return { ok: true, value: chain };
  }

  /** The latest record in a pattern's lineage — a citation
   *  of the parent still resolves to the parent; the latest
   *  is a separate, explicit ask (§5.3). */
  latestPatternInLineage(id: string): PatternRecord {
    let current = this.pattern(id);
    if (!current) throw new Error(`latestPatternInLineage: no pattern record '${id}' is held`);
    for (;;) {
      const children = this.patternChildren(current.id);
      if (children.length === 0) return current;
      current = children[children.length - 1];
    }
  }

  /** The register's clock, exposed for the member modules
   *  that stamp their own records (F2, F3). */
  stampNow(): string {
    return this.stamp();
  }
}

/* ---------------- the testimony boundary (§6, D10) ---------------- */

/**
 * Form declines as a witness. Asked to state that the world
 * runs a cycle, or that a worldly ratio holds, Form can
 * state the FORM of the filed claim and cite its filing, or
 * detect the pattern in given material — the claim itself
 * belongs to the knowledge graph and its gates. This is the
 * one decline every member shares, so it stands here, at
 * the register's own module.
 */
export function witnessDecline(subject: string): FormDecline {
  return formDecline(
    "D10",
    `the claim that ${subject}`,
    `That is a claim about the world, and I am not its witness: I can state the form of the claim as it is filed and cite its filing, or find the pattern in material you give me — the claim itself stands or falls at the knowledge graph's gates, not here.`,
    `Form holds forms — the shapes by which claims are stated and checked — and originates no world claims ` +
      `(Form design note §6); '${subject}' would be testimony, and testimony enters through the gates into the ` +
      `knowledge graph, never out of this register (§8 D10)`,
  );
}
