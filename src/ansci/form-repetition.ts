/**
 * form-repetition.ts — Repetition (Form F3, 2026-11-20;
 * design note docs/ansci/form-design-note.md — branch
 * track/form-design — §5, §8, §9.3): pattern records, the
 * known cycles, and detection with its evidence floor.
 *
 * A repetition is a held PATTERN (§5.1): a repeating unit,
 * its period, its phase — held the way a named proportion
 * is, as knowledge, cited, not re-derived from the name.
 * Holding the pattern and DETECTING it in material are
 * different acts, and this module keeps them apart.
 *
 * THE EVIDENCE FLOOR (§5.2) IS THE DESIGN, NOT A TUNABLE.
 * A repetition may be asserted only when the sequence shows
 * at least two full periods — the repeating unit observed
 * complete at least twice, three occurrences of its
 * boundary. One recurrence is a pair, not a pattern. Below
 * the floor the detection declines D6, naming the candidate
 * AS a candidate where one stands — never an asserted
 * period. detectRepetition implements the floor exactly as
 * stated; nothing in this programme loosens it for an
 * acceptance.
 *
 * THE KNOWN CYCLES (§5.2) stand today as code constants and
 * frame conventions: GENERATES and CONTROLS in sentence.ts,
 * SEASON_CONVENTION and DAYPART_CONVENTION in session.ts.
 * enterKnownCycles gives them a second, citable statement
 * as pattern records — the FORM of each cycle, citing the
 * convention or the constant as its source. The conventions
 * stay where they are and keep doing their work; nothing is
 * migrated. The cycle units are READ from those constants,
 * not re-typed here, so the record cannot drift from the
 * machinery it cites.
 *
 * THE SCHEDULING CORD (§5.3) IS SPECIFIED, NOT BUILT. A
 * pattern record is citable by a trigger: citePattern
 * returns the record AS IT STANDS, and a later edit (a new
 * record in the lineage) does not move a citation already
 * made — the commitment cites the pattern as it stood, and
 * a consumer who wants the current pattern asks for the
 * lineage's latest, explicitly. Whether Scheduling admits
 * periodic triggers is Scheduling's extension to make; this
 * module registers nothing, fires nothing, cancels nothing.
 *
 * DETECTION IS A COMPUTATION OVER GIVEN MATERIAL (§6). An
 * asserted repetition asserts something about the sequence
 * it was given — no more. It does not promote the pattern
 * into a claim about the world the sequence came from;
 * asked to witness such a claim, Form declines (D10,
 * witnessDecline in form.ts).
 */
import { formDecline, witnessDecline, type FormDecline, type FormProvenance, type FormRegister, type FormResult } from "./form";
import { CONTROLS, GENERATES, type Element } from "./sentence";
import { DAYPART_CONVENTION, SEASON_CONVENTION } from "./session";

/* ---------------- the pattern record (§5.1) ---------------- */

export type SequenceStep = string | number;

export interface PatternRecord {
  id: string;
  /** A known cycle is cited by this name (§5.2). */
  name?: string;
  /** The repeating unit, as a sequence of steps. */
  unit: SequenceStep[];
  /** What the steps run over ("elements", "months of the
   *  year", "hours of the day"). */
  domain: string;
  /** The period as its source states it ("five, over the
   *  domain of elements"; "four over twenty-four hours").
   *  The record holds the statement as stated; detection
   *  works in steps, where the period is the unit's length. */
  periodNote: string;
  provenance: FormProvenance;
  parentId?: string;
  editNote?: string;
  heldAt: string;
}

export interface PatternHoldInput {
  name?: string;
  unit: SequenceStep[];
  domain: string;
  periodNote: string;
  provenance: FormProvenance;
  parentId?: string;
  editNote?: string;
}

export function holdPattern(register: FormRegister, input: PatternHoldInput): PatternRecord {
  if (input.unit.length === 0) throw new Error("holdPattern: a pattern's unit may not be empty");
  const record: PatternRecord = {
    id: register.nextPatternId(),
    name: input.name,
    unit: [...input.unit],
    domain: input.domain,
    periodNote: input.periodNote,
    provenance: input.provenance,
    parentId: input.parentId,
    editNote: input.editNote,
    heldAt: register.stampNow(),
  };
  return register.holdPatternRecord(record);
}

/** Edit a pattern (§5.3): a new record citing its parent;
 *  the parent stands, and citations of it still resolve to
 *  it. A broken parent lineage declines at the break (D8). */
export function editPattern(
  register: FormRegister,
  parentId: string,
  edit: Partial<PatternHoldInput> & { editNote: string; provenance: FormProvenance },
): FormResult<PatternRecord> {
  const parent = register.pattern(parentId);
  if (!parent) throw new Error(`editPattern: no pattern record '${parentId}' is held`);
  const audit = register.auditPatternLineage(parentId);
  if (!audit.ok) return audit;
  return {
    ok: true,
    value: holdPattern(register, {
      name: edit.name ?? parent.name,
      unit: edit.unit ?? parent.unit,
      domain: edit.domain ?? parent.domain,
      periodNote: edit.periodNote ?? parent.periodNote,
      provenance: edit.provenance,
      parentId,
      editNote: edit.editNote,
    }),
  };
}

/* ---------------- the known cycles (§5.2) ---------------- */

/** Follow a cycle constant from a starting element until it
 *  closes — the unit as the constant itself states it. */
function cycleUnit(next: Record<Element, Element>, start: Element): Element[] {
  const unit: Element[] = [start];
  let current = next[start];
  while (current !== start) {
    unit.push(current);
    current = next[current];
  }
  return unit;
}

/**
 * Enter the known cycles as pattern records, citing their
 * sources. Idempotent per register. The units are read
 * from the standing constants and conventions — the
 * register's statement is a second, citable statement of
 * the same cycles, never a re-typing that could drift.
 */
export function enterKnownCycles(register: FormRegister): void {
  const entries: PatternHoldInput[] = [
    {
      name: "generating cycle (sheng)",
      unit: cycleUnit(GENERATES, "Wood"),
      domain: "elements",
      periodNote: "period five, over the domain of elements",
      provenance: {
        kind: "attested",
        source: "src/ansci/sentence.ts GENERATES",
        detail: "the generating cycle (sheng) as the system holds it in code — the pattern record cites the constant; the constant keeps doing its work where it stands",
      },
    },
    {
      name: "controlling cycle (ke)",
      unit: cycleUnit(CONTROLS, "Wood"),
      domain: "elements",
      periodNote: "period five, over the domain of elements",
      provenance: {
        kind: "attested",
        source: "src/ansci/sentence.ts CONTROLS",
        detail: "the controlling cycle (ke) as the system holds it in code — cited, not migrated",
      },
    },
    {
      name: "seasons",
      unit: ["spring", "summer", "autumn", "winter"],
      domain: "months of the year",
      periodNote: "period four over twelve months",
      provenance: { kind: "convention", source: "src/ansci/session.ts SEASON_CONVENTION", detail: SEASON_CONVENTION },
    },
    {
      name: "dayparts",
      unit: ["dawn", "midday", "dusk", "night"],
      domain: "hours of the day",
      periodNote: "period four over twenty-four hours",
      provenance: { kind: "convention", source: "src/ansci/session.ts DAYPART_CONVENTION", detail: DAYPART_CONVENTION },
    },
  ];
  for (const entry of entries) {
    if (entry.name && register.patternByName(entry.name)) continue;
    holdPattern(register, entry);
  }
}

/* ---------------- stating and citing (§5.1, §5.3) ---------------- */

export function resolvePattern(register: FormRegister, idOrName: string): FormResult<PatternRecord> {
  const record = register.pattern(idOrName) ?? register.patternByName(idOrName);
  if (!record) {
    return {
      ok: false,
      decline: formDecline(
        "D2",
        `the cycle '${idOrName}'`,
        `I hold no cycle by the name '${idOrName}'.`,
        `no pattern record stands under the id or name '${idOrName}' — the register holds the known cycles it ` +
          `cites (the generating and controlling cycles, the seasons, the dayparts) and patterns stated to it; a ` +
          `name beyond those is not filled from the name's sound (Form design note §5.2, §8 D2)`,
      ),
    };
  }
  return { ok: true, value: record };
}

export interface PatternStatement {
  record: PatternRecord;
  statement: string;
}

/** State a held pattern's form: its unit, its period as its
 *  source states it, and its provenance. The form of the
 *  filed cycle — never the claim that the world runs it. */
export function statePattern(register: FormRegister, idOrName: string): FormResult<PatternStatement> {
  const resolved = resolvePattern(register, idOrName);
  if (!resolved.ok) return resolved;
  const p = resolved.value;
  const sourceNote = p.provenance.kind === "stated" ? "a statement held as stated" : `${p.provenance.kind} — ${p.provenance.source}`;
  const statement =
    `the pattern '${p.name ?? p.id}': the unit ${p.unit.join(" → ")} → (again), over ${p.domain}; ` +
    `${p.periodNote}; held from ${sourceNote}`;
  return { ok: true, value: { record: p, statement } };
}

/**
 * The Scheduling cord, specified (§5.3): a citation of a
 * pattern record, resolving to the record AS IT STANDS.
 * An edit elsewhere in the lineage does not move it; the
 * lineage's latest is a separate, explicit ask
 * (register.latestPatternInLineage).
 */
export function citePattern(register: FormRegister, idOrName: string): FormResult<PatternRecord> {
  return resolvePattern(register, idOrName);
}

/** Asked to witness that the world runs a cycle, Form
 *  declines at the testimony gate (D10): it states forms
 *  and detects patterns in given material; the claim
 *  belongs to the knowledge graph. */
export function testifyCycle(register: FormRegister, idOrName: string): FormResult<never> {
  const resolved = resolvePattern(register, idOrName);
  const subject = resolved.ok ? `the world runs the ${resolved.value.name ?? "cycle"}` : `the world runs a cycle called '${idOrName}'`;
  return { ok: false, decline: witnessDecline(subject) };
}

/* ---------------- detection (§5.2) ---------------- */

export interface CycleMatch {
  patternId: string;
  name: string;
  /** Where in the cycle the sequence's unit starts — the
   *  phase of the sequence against the known cycle. */
  phaseInCycle: number;
}

export interface RepetitionAssertion {
  /** The asserted period, in steps. */
  period: number;
  /** The repeating unit, as the sequence itself states it. */
  unit: SequenceStep[];
  matchedCycle?: CycleMatch;
  /** The computation, stated as one (§6). */
  method: string;
}

export type RepetitionDetection =
  | { status: "asserted"; assertion: RepetitionAssertion }
  | { status: "none"; method: string }
  | { status: "declined"; decline: FormDecline; candidate?: { period: number; unit: SequenceStep[]; matchedCycle?: CycleMatch } };

function stepsEqual(a: SequenceStep, b: SequenceStep): boolean {
  return a === b;
}

/** Is the sequence consistent with a period of p steps —
 *  every step equal to the step one period earlier? */
function consistentWith(sequence: SequenceStep[], p: number): boolean {
  for (let i = p; i < sequence.length; i++) {
    if (!stepsEqual(sequence[i], sequence[i - p])) return false;
  }
  return true;
}

/** Match an asserted (or candidate) unit against the known
 *  cycles: the same unit, up to rotation. The phase is the
 *  rotation — where in the cycle the sequence starts. */
function matchCycle(register: FormRegister, unit: SequenceStep[]): CycleMatch | undefined {
  for (const pattern of register.allPatterns()) {
    if (!pattern.name) continue;
    if (pattern.unit.length !== unit.length) continue;
    for (let k = 0; k < pattern.unit.length; k++) {
      let matches = true;
      for (let i = 0; i < unit.length; i++) {
        if (!stepsEqual(unit[i], pattern.unit[(i + k) % pattern.unit.length])) {
          matches = false;
          break;
        }
      }
      if (matches) return { patternId: pattern.id, name: pattern.name, phaseInCycle: k };
    }
  }
  return undefined;
}

/**
 * Detect a repetition in a given sequence, under the
 * evidence floor (§5.2): an assertion requires the unit
 * observed complete at least twice — sequence length at
 * least 2·period + 1, three occurrences of the boundary.
 * Below the floor: a decline (D6) naming the candidate as a
 * candidate, where a consistent period stands; a sequence
 * long enough for the floor to have spoken, in which no
 * period stands, returns "none" — a finding about the
 * given material, stated as one.
 */
export function detectRepetition(register: FormRegister, sequence: SequenceStep[]): RepetitionDetection {
  const len = sequence.length;
  let candidate: { period: number; unit: SequenceStep[]; matchedCycle?: CycleMatch } | undefined;
  for (let p = 1; p < len; p++) {
    if (!consistentWith(sequence, p)) continue;
    const unit = sequence.slice(0, p);
    if (len >= 2 * p + 1) {
      const matched = matchCycle(register, unit);
      return {
        status: "asserted",
        assertion: {
          period: p,
          unit,
          matchedCycle: matched,
          method:
            `the unit of ${p} step${p === 1 ? "" : "s"} (${unit.join(", ")}) stands complete ${Math.floor(len / p)} times in the ` +
            `given sequence of ${len}, with the boundary occurring ${Math.floor(len / p) + 1} times — the evidence floor ` +
            `(two full periods) is met. This asserts the repetition of THIS sequence, a computation over given ` +
            `material; it claims nothing about the world the sequence came from` +
            (matched ? `; the unit matches the known cycle '${matched.name}', entered at phase ${matched.phaseInCycle}` : ""),
        },
      };
    }
    if (!candidate) candidate = { period: p, unit, matchedCycle: matchCycle(register, unit) };
  }
  if (candidate) {
    return {
      status: "declined",
      candidate,
      decline: formDecline(
        "D6",
        `the given sequence of ${len} steps`,
        `Not enough sequence to tell: the material is consistent with a period of ${candidate.period} ` +
          `(${candidate.unit.join(", ")})${candidate.matchedCycle ? ` — the unit of the known cycle '${candidate.matchedCycle.name}'` : ""}, ` +
          `but a repetition may be asserted only when the unit stands complete twice over, and here it does not. ` +
          `The period of ${candidate.period} is a candidate, offered as a candidate — not an asserted period.`,
        `the sequence is consistent with period ${candidate.period} but its length ${len} is below the evidence ` +
          `floor for that period (2·${candidate.period} + 1 = ${2 * candidate.period + 1}: the unit complete twice, ` +
          `three occurrences of its boundary). One recurrence is a pair, not a pattern (Form design note §5.2, §8 D6)`,
      ),
    };
  }
  // No consistent period below the sequence's own length.
  // If the floor could have spoken for some period (the
  // sequence is long enough to check), "none" is a finding.
  const checkable = Math.floor((len - 1) / 2);
  if (checkable >= 1) {
    return {
      status: "none",
      method:
        `no period up to ${checkable} steps — every period the evidence floor lets this length of sequence ` +
        `assert — is consistent with the given material; no repetition stands in it that the floor lets me assert`,
    };
  }
  return {
    status: "declined",
    decline: formDecline(
      "D6",
      `the given sequence of ${len} steps`,
      `Not enough sequence to tell: ${len} step${len === 1 ? "" : "s"} cannot show even the smallest unit twice over.`,
      `the evidence floor needs at least three steps before any period can be asserted (the smallest unit, ` +
        `complete twice, is two steps, and its boundary must occur a third time); the given sequence has ${len} ` +
        `(Form design note §5.2, §8 D6)`,
    ),
  };
}
