/**
 * devloop-core.ts — the dev-loop toolset's pure logic (docs/devloop.md).
 *
 * Everything in this file is a function over plain data: no fs, no
 * child processes, no engine imports beyond types. The stateful
 * shells (devserver.ts, devcli.ts, devloop-state.ts) do the I/O and
 * call in here for the four judgment operations:
 *
 *   - transcript diffing      (what changed between two runs?)
 *   - declaration verdicts    (did it change ONLY as declared?)
 *   - failure clustering      (what isn't working, counted?)
 *   - probe parsing/checking  (scripted expectations, scripts/probes/)
 *
 * The design intent: the loop's verdicts are computed, never vibed.
 * An AI using the toolset declares an expected effect BEFORE editing;
 * this module judges the declaration against the transcripts after.
 */

/* ------------------------------------------------------------------ */
/* Turn outcomes — the shape the worker returns per turn               */
/* ------------------------------------------------------------------ */

export interface StepDigest {
  piece: string;
  kind: string;
  detail: string;
}

export interface TurnOutcome {
  input: string;
  reply: string;
  intent: string;
  grounded: boolean;
  steps: StepDigest[];
}

/** A baseline/current transcript: one outcome per script line. */
export type Transcript = TurnOutcome[];

/** A stored baseline keeps only what diffing needs. */
export interface BaselineTurn {
  input: string;
  reply: string;
  intent: string;
  grounded: boolean;
}

export function toBaseline(t: Transcript): BaselineTurn[] {
  return t.map((x) => ({
    input: x.input,
    reply: x.reply,
    intent: x.intent,
    grounded: x.grounded,
  }));
}

/* ------------------------------------------------------------------ */
/* Outcome signatures and failure clustering                           */
/* ------------------------------------------------------------------ */

/** Did this turn decline (a piece recorded a decline step)? */
export function turnDeclined(t: TurnOutcome): boolean {
  return t.steps.some((s) => s.kind === "decline");
}

/**
 * Normalise a step detail for clustering: lowercase, digits → '#',
 * quoted spans → '"…"', whitespace collapsed, length-capped. Two
 * declines about different terms should usually land in DIFFERENT
 * clusters (the term is the signal), but counts and ids are noise.
 */
export function normaliseDetail(detail: string): string {
  return detail
    .toLowerCase()
    .replace(/"[^"]*"/g, '"…"')
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);
}

/**
 * The outcome signature of a turn: intent + grounding + the salient
 * step evidence. Declines sign with their (normalised) decline
 * detail — that's the failure class. Non-declines sign with their
 * step-kind path, which separates e.g. replay turns from solve turns.
 */
export function outcomeSignature(t: TurnOutcome): string {
  const base = `${t.intent}|${t.grounded ? "grounded" : "ungrounded"}`;
  const declines = t.steps.filter((s) => s.kind === "decline");
  if (declines.length > 0) {
    const d = declines[declines.length - 1];
    return `${base}|decline@${d.piece}:${normaliseDetail(d.detail)}`;
  }
  const path = t.steps.map((s) => s.kind).join(">");
  return `${base}|${path}`;
}

export interface FailureCluster {
  signature: string;
  count: number;
  examples: string[];
}

export interface RunSummary {
  turns: number;
  grounded: number;
  ungrounded: number;
  declined: number;
  intents: Record<string, number>;
}

/** Counted totals over a set of turns (evidence, not a verdict). */
export function summariseTurns(turns: TurnOutcome[]): RunSummary {
  const intents: Record<string, number> = {};
  let grounded = 0;
  let declined = 0;
  for (const t of turns) {
    intents[t.intent] = (intents[t.intent] ?? 0) + 1;
    if (t.grounded) grounded++;
    if (turnDeclined(t)) declined++;
  }
  return {
    turns: turns.length,
    grounded,
    ungrounded: turns.length - grounded,
    declined,
    intents,
  };
}

/**
 * Cluster the FAILING turns (ungrounded) by outcome signature,
 * biggest first, ≤3 example inputs each. Grounded turns are not
 * failures and are never clustered.
 */
export function clusterFailures(turns: TurnOutcome[]): FailureCluster[] {
  const bySig = new Map<string, FailureCluster>();
  for (const t of turns) {
    if (t.grounded) continue;
    const sig = outcomeSignature(t);
    let c = bySig.get(sig);
    if (!c) {
      c = { signature: sig, count: 0, examples: [] };
      bySig.set(sig, c);
    }
    c.count++;
    if (c.examples.length < 3) c.examples.push(t.input);
  }
  return [...bySig.values()].sort(
    (a, b) => b.count - a.count || a.signature.localeCompare(b.signature),
  );
}

/* ------------------------------------------------------------------ */
/* Transcript diffing                                                  */
/* ------------------------------------------------------------------ */

export interface ChangedTurn {
  index: number;
  input: string;
  before: string;
  after: string;
  beforeIntent: string;
  afterIntent: string;
}

export interface TranscriptDiff {
  totalBefore: number;
  totalAfter: number;
  changed: ChangedTurn[];
  unchangedCount: number;
  /** inputs present only in the current run (script grew) */
  added: string[];
  /** inputs present only in the baseline (script shrank) */
  removed: string[];
}

/**
 * Diff two transcripts of the SAME script, aligned by position.
 * A turn counts as changed when its reply text differs (intent or
 * grounding moving with an identical reply is not a change anyone
 * can hear). Misaligned tails surface as added/removed inputs.
 */
export function diffTranscripts(
  baseline: BaselineTurn[],
  current: Transcript,
): TranscriptDiff {
  const changed: ChangedTurn[] = [];
  const added: string[] = [];
  const removed: string[] = [];
  const n = Math.max(baseline.length, current.length);
  let unchangedCount = 0;
  for (let i = 0; i < n; i++) {
    const b = baseline[i];
    const c = current[i];
    if (b && !c) {
      removed.push(b.input);
      continue;
    }
    if (!b && c) {
      added.push(c.input);
      continue;
    }
    if (!b || !c) continue;
    if (b.input !== c.input) {
      // Script itself edited between runs: treat as remove + add so
      // the change is visible rather than silently paired.
      removed.push(b.input);
      added.push(c.input);
      continue;
    }
    if (b.reply !== c.reply) {
      changed.push({
        index: i,
        input: c.input,
        before: b.reply,
        after: c.reply,
        beforeIntent: b.intent,
        afterIntent: c.intent,
      });
    } else {
      unchangedCount++;
    }
  }
  return {
    totalBefore: baseline.length,
    totalAfter: current.length,
    changed,
    unchangedCount,
    added,
    removed,
  };
}

/* ------------------------------------------------------------------ */
/* Declarations and verdicts                                           */
/* ------------------------------------------------------------------ */

export interface DeclarationChange {
  /** script path the change is expected in (as passed to /run) */
  script: string;
  /** the exact input line whose reply is expected to change */
  input: string;
  /** substrings the NEW reply must contain (case-insensitive) */
  mustContain?: string[];
  /** substrings the NEW reply must NOT contain (case-insensitive) */
  mustNotContain?: string[];
}

export interface Declaration {
  note: string;
  changes: DeclarationChange[];
  /** when true, changes outside the declared set don't fail the verdict */
  allowOtherChanges?: boolean;
  declaredAt: string;
}

export interface ChangeVerdict {
  script: string;
  input: string;
  met: boolean;
  reasons: string[];
  /** the reply the assertions were checked against, if found */
  reply?: string;
  /** whether the reply actually differs from its baseline */
  changedVsBaseline?: boolean;
}

export interface Verdict {
  /** every declared script has been run since the declaration */
  complete: boolean;
  /** complete AND all assertions held AND no undeclared changes */
  pass: boolean;
  changes: ChangeVerdict[];
  /** turns that changed without being declared, per script */
  undeclaredChanges: { script: string; turns: ChangedTurn[] }[];
  /** declared scripts not yet run */
  pendingScripts: string[];
  failures: string[];
}

/**
 * Validate a declaration at intake. A declaration with no changes
 * is rejected outright: a fix that expects nothing to change is
 * not a declaration, it's a hope.
 */
export function validateDeclaration(d: unknown): Declaration {
  if (typeof d !== "object" || d === null) {
    throw new Error("declaration must be a JSON object");
  }
  const o = d as Record<string, unknown>;
  if (typeof o.note !== "string" || !o.note.trim()) {
    throw new Error("declaration.note must be a non-empty string");
  }
  if (!Array.isArray(o.changes) || o.changes.length === 0) {
    throw new Error(
      "declaration.changes must be a non-empty list — a fix that " +
        "expects nothing to change is not a declaration",
    );
  }
  const changes: DeclarationChange[] = o.changes.map((c, i) => {
    if (typeof c !== "object" || c === null) {
      throw new Error(`declaration.changes[${i}] must be an object`);
    }
    const cc = c as Record<string, unknown>;
    if (typeof cc.script !== "string" || !cc.script) {
      throw new Error(`declaration.changes[${i}].script must be a string`);
    }
    if (typeof cc.input !== "string" || !cc.input) {
      throw new Error(`declaration.changes[${i}].input must be a string`);
    }
    const strList = (v: unknown, field: string): string[] | undefined => {
      if (v === undefined) return undefined;
      if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) {
        throw new Error(`declaration.changes[${i}].${field} must be a list of strings`);
      }
      return v as string[];
    };
    return {
      script: cc.script,
      input: cc.input,
      mustContain: strList(cc.mustContain, "mustContain"),
      mustNotContain: strList(cc.mustNotContain, "mustNotContain"),
    };
  });
  return {
    note: o.note,
    changes,
    allowOtherChanges: o.allowOtherChanges === true,
    declaredAt:
      typeof o.declaredAt === "string" ? o.declaredAt : new Date().toISOString(),
  };
}

export interface ScriptRun {
  baseline: BaselineTurn[] | null;
  current: Transcript;
}

/**
 * Judge a declaration against the runs accumulated since it was
 * declared. Pure: the caller supplies {baseline, current} per
 * script and owns all I/O. The verdict is complete only when every
 * declared script has a run; it passes only when, additionally,
 * every assertion held and no undeclared turn changed (unless the
 * declaration allowed other changes).
 */
export function evaluateVerdict(
  declaration: Declaration,
  runs: Record<string, ScriptRun>,
): Verdict {
  const declaredScripts = [...new Set(declaration.changes.map((c) => c.script))];
  const pendingScripts = declaredScripts.filter((s) => !(s in runs));
  const failures: string[] = [];
  const changeVerdicts: ChangeVerdict[] = [];
  const undeclaredChanges: Verdict["undeclaredChanges"] = [];

  for (const script of declaredScripts) {
    const run = runs[script];
    if (!run) continue;
    const declaredInputs = new Set(
      declaration.changes.filter((c) => c.script === script).map((c) => c.input),
    );
    if (run.baseline) {
      const diff = diffTranscripts(run.baseline, run.current);
      const stray = diff.changed.filter((ch) => !declaredInputs.has(ch.input));
      if (stray.length > 0) {
        undeclaredChanges.push({ script, turns: stray });
        if (!declaration.allowOtherChanges) {
          failures.push(
            `${script}: ${stray.length} undeclared turn(s) changed: ` +
              stray.map((s) => JSON.stringify(s.input)).join(", "),
          );
        }
      }
    }
    for (const change of declaration.changes.filter((c) => c.script === script)) {
      const reasons: string[] = [];
      const turn = run.current.find((t) => t.input === change.input);
      if (!turn) {
        reasons.push(`input not found in the run of ${script}`);
        changeVerdicts.push({ script, input: change.input, met: false, reasons });
        failures.push(`${script} / ${JSON.stringify(change.input)}: ${reasons[0]}`);
        continue;
      }
      const base = run.baseline?.find((b) => b.input === change.input);
      const changedVsBaseline = base ? base.reply !== turn.reply : undefined;
      const lower = turn.reply.toLowerCase();
      for (const want of change.mustContain ?? []) {
        if (!lower.includes(want.toLowerCase())) {
          reasons.push(`reply does not contain ${JSON.stringify(want)}`);
        }
      }
      for (const ban of change.mustNotContain ?? []) {
        if (lower.includes(ban.toLowerCase())) {
          reasons.push(`reply contains forbidden ${JSON.stringify(ban)}`);
        }
      }
      const met = reasons.length === 0;
      if (!met) {
        failures.push(
          `${script} / ${JSON.stringify(change.input)}: ${reasons.join("; ")}`,
        );
      }
      changeVerdicts.push({
        script,
        input: change.input,
        met,
        reasons,
        reply: turn.reply,
        changedVsBaseline,
      });
    }
  }

  const complete = pendingScripts.length === 0;
  if (!complete) {
    failures.push(
      `declared script(s) not yet run: ${pendingScripts.join(", ")}`,
    );
  }
  const pass =
    complete &&
    changeVerdicts.every((c) => c.met) &&
    (declaration.allowOtherChanges === true || undeclaredChanges.length === 0);
  return { complete, pass, changes: changeVerdicts, undeclaredChanges, pendingScripts, failures };
}

/* ------------------------------------------------------------------ */
/* Probe scripts — scripted expectations (see scripts/probes/)         */
/* ------------------------------------------------------------------ */

export type ExpectedOutcome = "decline" | "grounded" | "clarify";

export interface ProbeExpectation {
  outcome: ExpectedOutcome;
  contains: string[];
  notContains: string[];
}

export interface ProbeTurn {
  input: string;
  expect: ProbeExpectation | null;
  /** 1-based source line of the input, for error messages */
  line: number;
}

const EXPECT_ANNOTATION = /^#!\s*expect=([a-z]+)((?:\s+[a-z]+=.*)?)$/;

/**
 * Parse a probe script. Format (documented in docs/devloop.md):
 * one input per line, '#' comments ignored, and an annotation line
 *   #! expect=decline|grounded|clarify contains=a,b notcontains=c
 * IMMEDIATELY FOLLOWING an input line attaches expectations to it.
 * The parser is small and strict on purpose: a malformed annotation
 * is an error, never a silent skip — a probe that can't be read
 * can't be trusted.
 */
export function parseProbeScript(text: string): ProbeTurn[] {
  const turns: ProbeTurn[] = [];
  const lines = text.split("\n");
  let pendingAnnotationFor: ProbeTurn | null = null;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    const lineNo = i + 1;
    if (!line) continue;
    if (line.startsWith("#!")) {
      if (!pendingAnnotationFor) {
        throw new Error(
          `probe parse error, line ${lineNo}: annotation has no preceding input line`,
        );
      }
      if (pendingAnnotationFor.expect) {
        throw new Error(
          `probe parse error, line ${lineNo}: duplicate annotation for ` +
            JSON.stringify(pendingAnnotationFor.input),
        );
      }
      pendingAnnotationFor.expect = parseAnnotation(line, lineNo);
      continue;
    }
    if (line.startsWith("#")) continue;
    const turn: ProbeTurn = { input: line, expect: null, line: lineNo };
    turns.push(turn);
    pendingAnnotationFor = turn;
    // A non-input line other than an annotation ends the window:
    // annotations must immediately follow their input (blank lines
    // and comments in between are tolerated — they carry no turn).
  }
  return turns;
}

function parseAnnotation(line: string, lineNo: number): ProbeExpectation {
  const m = line.match(EXPECT_ANNOTATION);
  if (!m) {
    throw new Error(
      `probe parse error, line ${lineNo}: malformed annotation ` +
        `(want "#! expect=decline|grounded|clarify contains=a,b notcontains=c")`,
    );
  }
  const outcome = m[1] as ExpectedOutcome;
  if (outcome !== "decline" && outcome !== "grounded" && outcome !== "clarify") {
    throw new Error(
      `probe parse error, line ${lineNo}: unknown expect outcome ${JSON.stringify(m[1])}`,
    );
  }
  const rest = (m[2] ?? "").trim();
  const exp: ProbeExpectation = { outcome, contains: [], notContains: [] };
  if (rest) {
    for (const token of rest.split(/\s+/)) {
      const eq = token.indexOf("=");
      if (eq < 0) {
        throw new Error(
          `probe parse error, line ${lineNo}: malformed annotation token ${JSON.stringify(token)}`,
        );
      }
      const key = token.slice(0, eq);
      const values = token
        .slice(eq + 1)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (key === "contains") exp.contains = values;
      else if (key === "notcontains") exp.notContains = values;
      else {
        throw new Error(
          `probe parse error, line ${lineNo}: unknown annotation key ${JSON.stringify(key)}`,
        );
      }
    }
  }
  return exp;
}

/** Parse an evaluation script the chat.ts way: inputs only. */
export function parseEvaluationScript(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

export interface ExpectationResult {
  met: boolean;
  reasons: string[];
}

/** The outcome class a finished turn actually exhibited. */
export function observedOutcome(t: TurnOutcome): ExpectedOutcome | "answered-ungrounded" {
  if (t.intent === "clarification") return "clarify";
  if (turnDeclined(t) || !t.grounded) return "decline";
  return "grounded";
}

/**
 * Check one turn against its probe expectation. `decline` means the
 * engine refused (a decline step, or an ungrounded answer it did
 * not stand behind); `grounded` means it answered and stood behind
 * it; `clarify` means it asked. contains/notcontains check the
 * reply text (case-insensitive) on top of the outcome.
 */
export function checkExpectation(
  t: TurnOutcome,
  exp: ProbeExpectation,
): ExpectationResult {
  const reasons: string[] = [];
  const observed = observedOutcome(t);
  if (exp.outcome === "grounded") {
    if (!t.grounded) {
      reasons.push(`expected a grounded answer, got intent=${t.intent} grounded=false`);
    }
  } else if (exp.outcome === "decline") {
    if (observed !== "decline") {
      reasons.push(
        `expected a decline, got intent=${t.intent} grounded=${t.grounded}`,
      );
    }
  } else if (exp.outcome === "clarify") {
    if (observed !== "clarify") {
      reasons.push(`expected a clarification ask, got intent=${t.intent}`);
    }
  }
  const lower = t.reply.toLowerCase();
  for (const want of exp.contains) {
    if (!lower.includes(want.toLowerCase())) {
      reasons.push(`reply does not contain ${JSON.stringify(want)}`);
    }
  }
  for (const ban of exp.notContains) {
    if (lower.includes(ban.toLowerCase())) {
      reasons.push(`reply contains forbidden ${JSON.stringify(ban)}`);
    }
  }
  return { met: reasons.length === 0, reasons };
}

export interface ProbeSetResult {
  turns: number;
  annotated: number;
  met: number;
  unmet: { input: string; reasons: string[]; reply: string }[];
}

/** Score a finished probe run against its annotations. */
export function scoreProbeRun(
  probes: ProbeTurn[],
  outcomes: TurnOutcome[],
): ProbeSetResult {
  const unmet: ProbeSetResult["unmet"] = [];
  let annotated = 0;
  let met = 0;
  probes.forEach((p, i) => {
    if (!p.expect) return;
    annotated++;
    const outcome = outcomes[i];
    if (!outcome) {
      unmet.push({ input: p.input, reasons: ["no outcome recorded for this turn"], reply: "" });
      return;
    }
    const r = checkExpectation(outcome, p.expect);
    if (r.met) met++;
    else unmet.push({ input: p.input, reasons: r.reasons, reply: outcome.reply });
  });
  return { turns: probes.length, annotated, met, unmet };
}

/* ------------------------------------------------------------------ */
/* The design response (GET /design)                                   */
/* ------------------------------------------------------------------ */

/**
 * Extract §9 (the gap register) from the design doc: from its
 * heading to the next top-level section. Returns "" when absent —
 * the design response must say so rather than invent gaps.
 */
export function extractGapRegister(markdown: string): string {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => /^## 9\./.test(l));
  if (start < 0) return "";
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## \d+\./.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

export interface StandingQuestions {
  missingFromDesign: string;
  notWorking: string;
  shouldFix: string;
}

/**
 * The three standing questions. The server supplies the EVIDENCE
 * (engine map, gap register, diagnosis); these fields are prompts
 * for the consuming AI to answer from that evidence — the toolset
 * deliberately does not fill them in.
 */
export const STANDING_QUESTIONS: StandingQuestions = {
  missingFromDesign:
    "What is missing from the design? Compare the diagnosis clusters " +
    "against the gap register and the engine map: which observed " +
    "failure has no owning piece and no registered gap?",
  notWorking:
    "What isn't working? Answer from the counted failure clusters " +
    "and the probe pass rates, not from single anecdotes.",
  shouldFix:
    "What should be fixed first? Declare it (POST /declare or " +
    "`devcli declare`) with the exact turns expected to change, " +
    "then edit, reload, and let the verdict judge the declaration.",
};
