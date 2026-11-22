// Foundry report comparison (FND-103).
//
// Pure functions that compare two `evaluate` reports case by case, turn by
// turn and check by check. Identity is by case, turn and check ID; the
// fixture digest and configuration are compared explicitly so different
// suites or runtimes are never silently equated. See loop/FOUNDRY.md.

export type CheckOutcome = "pass" | "fail" | "abstained" | "not-observable";

export interface ComparableCheck {
  id: string;
  outcome: CheckOutcome | string;
}

export interface ComparableTurn {
  id: string;
  input?: string;
  reply?: string;
  verdict?: string;
  checks: ComparableCheck[];
}

export interface ComparableCase {
  id: string;
  status?: string;
  verdict?: string;
  turns: ComparableTurn[];
}

export interface ComparableReport {
  schemaVersion: number;
  fixture?: { path?: string; sha256?: string };
  configuration?: Record<string, unknown>;
  cases: ComparableCase[];
}

export type CheckChange =
  | "unchanged"
  | "gain"
  | "regression"
  | "evidence-changed"
  | "only-before"
  | "only-after";

export interface CheckComparison {
  id: string;
  before: CheckOutcome | string | null;
  after: CheckOutcome | string | null;
  change: CheckChange;
}

export type CaseChange =
  | "unchanged"
  | "gain"
  | "regression"
  | "still-failing"
  | "unexpected-pass"
  | "only-before"
  | "only-after"
  | "suite-changed";

export interface TurnComparison {
  id: string;
  verdictBefore: string | null;
  verdictAfter: string | null;
  replyChanged: boolean;
  checks: CheckComparison[];
}

export interface CaseComparison {
  id: string;
  statusBefore: string | null;
  statusAfter: string | null;
  verdictBefore: string | null;
  verdictAfter: string | null;
  change: CaseChange;
  turns: TurnComparison[];
}

export interface ConfigurationDifference {
  path: string;
  before: unknown;
  after: unknown;
}

function classifyCheck(
  before: string | null,
  after: string | null,
): CheckChange {
  if (before === null) return "only-after";
  if (after === null) return "only-before";
  if (before === after) return "unchanged";
  if (after === "pass" && before === "fail") return "gain";
  if (after === "fail" && before === "pass") return "regression";
  return "evidence-changed";
}

function compareTurns(
  before: ComparableTurn | undefined,
  after: ComparableTurn | undefined,
): TurnComparison {
  if (!before || !after) {
    throw new Error("compareTurns requires both sides; missing turns are reported on the case");
  }
  const afterById = new Map(after.checks.map((check) => [check.id, check]));
  const seen = new Set<string>();
  const checks: CheckComparison[] = [];
  for (const beforeCheck of before.checks) {
    seen.add(beforeCheck.id);
    const afterCheck = afterById.get(beforeCheck.id);
    const outcomeAfter = afterCheck ? afterCheck.outcome : null;
    checks.push({
      id: beforeCheck.id,
      before: beforeCheck.outcome,
      after: outcomeAfter,
      change: classifyCheck(beforeCheck.outcome, outcomeAfter),
    });
  }
  for (const afterCheck of after.checks) {
    if (!seen.has(afterCheck.id)) {
      checks.push({
        id: afterCheck.id,
        before: null,
        after: afterCheck.outcome,
        change: "only-after",
      });
    }
  }
  return {
    id: before.id,
    verdictBefore: before.verdict ?? null,
    verdictAfter: after.verdict ?? null,
    replyChanged:
      before.reply !== undefined &&
      after.reply !== undefined &&
      before.reply !== after.reply,
    checks,
  };
}

function classifyCase(comparison: {
  verdictBefore: string | null;
  verdictAfter: string | null;
  changes: CheckChange[];
}): CaseChange {
  const { verdictBefore, verdictAfter, changes } = comparison;
  const regressed = changes.includes("regression");
  const gained = changes.includes("gain");
  if (verdictAfter === "unexpected-pass") return "unexpected-pass";
  if (regressed && !gained) return "regression";
  if (gained && !regressed) return "gain";
  if (regressed && gained) return "suite-changed";
  if (verdictBefore === verdictAfter) {
    return verdictAfter === "pass" || verdictAfter === "known-failure"
      ? "unchanged"
      : "still-failing";
  }
  return "suite-changed";
}

export function compareCases(
  before: ComparableCase | undefined,
  after: ComparableCase | undefined,
): CaseComparison {
  if (!before && !after) throw new Error("compareCases requires at least one side");
  if (!before || !after) {
    const present = (before ?? after)!;
    return {
      id: present.id,
      statusBefore: before?.status ?? null,
      statusAfter: after?.status ?? null,
      verdictBefore: before?.verdict ?? null,
      verdictAfter: after?.verdict ?? null,
      change: !before ? "only-after" : "only-before",
      turns: [],
    };
  }
  const afterTurns = new Map(after.turns.map((turn) => [turn.id, turn]));
  const seen = new Set<string>();
  const turns: TurnComparison[] = [];
  let suiteChanged = false;
  for (const beforeTurn of before.turns) {
    const afterTurn = afterTurns.get(beforeTurn.id);
    seen.add(beforeTurn.id);
    if (!afterTurn) {
      suiteChanged = true;
      continue;
    }
    const compared = compareTurns(beforeTurn, afterTurn);
    if (compared.checks.some((check) => check.change === "only-before" || check.change === "only-after")) {
      suiteChanged = true;
    }
    turns.push(compared);
  }
  for (const afterTurn of after.turns) {
    if (!seen.has(afterTurn.id)) suiteChanged = true;
  }
  const changes = turns.flatMap((turn) => turn.checks.map((check) => check.change));
  let change = classifyCase({
    verdictBefore: before.verdict ?? null,
    verdictAfter: after.verdict ?? null,
    changes,
  });
  if (change === "unchanged" && suiteChanged) change = "suite-changed";
  return {
    id: before.id,
    statusBefore: before.status ?? null,
    statusAfter: after.status ?? null,
    verdictBefore: before.verdict ?? null,
    verdictAfter: after.verdict ?? null,
    change,
    turns,
  };
}

function flatten(value: unknown, prefix: string, out: Map<string, unknown>): void {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      flatten(nested, prefix ? `${prefix}.${key}` : key, out);
    }
    return;
  }
  out.set(prefix, value);
}

export function compareConfigurations(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): ConfigurationDifference[] {
  const flatBefore = new Map<string, unknown>();
  const flatAfter = new Map<string, unknown>();
  flatten(before ?? {}, "", flatBefore);
  flatten(after ?? {}, "", flatAfter);
  const differences: ConfigurationDifference[] = [];
  for (const [path, value] of flatBefore) {
    if (!flatAfter.has(path)) {
      differences.push({ path, before: value, after: null });
    } else {
      const other = flatAfter.get(path);
      if (JSON.stringify(value) !== JSON.stringify(other)) {
        differences.push({ path, before: value, after: other });
      }
    }
  }
  for (const [path, value] of flatAfter) {
    if (!flatBefore.has(path)) differences.push({ path, before: null, after: value });
  }
  return differences.sort((left, right) => left.path.localeCompare(right.path));
}

export interface ReportComparison {
  suiteChanged: boolean;
  fixtureBefore: string | null;
  fixtureAfter: string | null;
  configurationDifferences: ConfigurationDifference[];
  cases: CaseComparison[];
  summary: {
    cases: number;
    comparable: number;
    gains: number;
    regressions: number;
    stillFailing: number;
    unexpectedPasses: number;
    incomparable: number;
    replyOnlyChanges: number;
    configurationMatches: boolean;
  };
}

export function compareReports(
  before: ComparableReport,
  after: ComparableReport,
): ReportComparison {
  const afterById = new Map(after.cases.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const cases: CaseComparison[] = [];
  for (const beforeCase of before.cases) {
    seen.add(beforeCase.id);
    cases.push(compareCases(beforeCase, afterById.get(beforeCase.id)));
  }
  for (const afterCase of after.cases) {
    if (!seen.has(afterCase.id)) cases.push(compareCases(undefined, afterCase));
  }
  const comparable = cases.filter((c) => c.change !== "only-before" && c.change !== "only-after");
  const summary = {
    cases: cases.length,
    comparable: comparable.length,
    gains: comparable.filter((c) => c.change === "gain").length,
    regressions: comparable.filter((c) => c.change === "regression").length,
    stillFailing: comparable.filter((c) => c.change === "still-failing").length,
    unexpectedPasses: comparable.filter((c) => c.change === "unexpected-pass").length,
    incomparable: cases.length - comparable.length,
    replyOnlyChanges: comparable.filter(
      (c) =>
        c.change === "unchanged" &&
        c.turns.some(
          (t) =>
            t.replyChanged && t.checks.every((check) => check.change === "unchanged"),
        ),
    ).length,
    configurationMatches: false,
  };
  const configurationDifferences = compareConfigurations(
    before.configuration,
    after.configuration,
  );
  summary.configurationMatches = configurationDifferences.length === 0;
  return {
    suiteChanged: (before.fixture?.sha256 ?? null) !== (after.fixture?.sha256 ?? null),
    fixtureBefore: before.fixture?.sha256 ?? null,
    fixtureAfter: after.fixture?.sha256 ?? null,
    configurationDifferences,
    cases,
    summary,
  };
}
