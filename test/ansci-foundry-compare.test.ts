import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compareCases,
  compareConfigurations,
  compareReports,
  type ComparableReport,
} from "../src/ansci/foundry-compare";

const passTurn = (reply = "Ok.") => ({
  id: "t1",
  input: "The dog bit the man.",
  reply,
  verdict: "pass",
  checks: [
    { id: "root", outcome: "pass" },
    { id: "role-0", outcome: "pass" },
  ],
});

const reportWith = (turns: ReturnType<typeof passTurn>, verdict: string): ComparableReport => ({
  schemaVersion: 1,
  fixture: { path: "suite.json", sha256: "abc" },
  configuration: { profile: "chat", resources: "required" },
  cases: [{ id: "roles-active-01", status: "must-pass", verdict, turns: [turns] }],
});

test("identical reports compare unchanged", () => {
  const comparison = compareReports(reportWith(passTurn(), "pass"), reportWith(passTurn(), "pass"));
  assert.equal(comparison.summary.comparable, 1);
  assert.equal(comparison.summary.regressions, 0);
  assert.equal(comparison.summary.gains, 0);
  assert.equal(comparison.cases[0].change, "unchanged");
  assert.equal(comparison.suiteChanged, false);
  assert.equal(comparison.summary.configurationMatches, true);
});

test("pass to fail is a regression, fail to pass is a gain", () => {
  const failed = passTurn();
  failed.checks = [
    { id: "root", outcome: "pass" },
    { id: "role-0", outcome: "fail" },
  ];
  failed.verdict = "fail";
  const regression = compareReports(reportWith(passTurn(), "pass"), reportWith(failed, "fail"));
  assert.equal(regression.cases[0].change, "regression");
  assert.equal(regression.summary.regressions, 1);

  const gain = compareReports(reportWith(failed, "fail"), reportWith(passTurn(), "pass"));
  assert.equal(gain.cases[0].change, "gain");
  assert.equal(gain.summary.gains, 1);
});

test("cases missing on one side are incomparable, not silent", () => {
  const before: ComparableReport = {
    schemaVersion: 1,
    cases: [{ id: "a", turns: [passTurn()] }],
  };
  const after: ComparableReport = {
    schemaVersion: 1,
    cases: [{ id: "b", turns: [passTurn()] }],
  };
  const comparison = compareReports(before, after);
  assert.deepEqual(
    comparison.cases.map((c) => c.change).sort(),
    ["only-after", "only-before"],
  );
  assert.equal(comparison.summary.comparable, 0);
  assert.equal(comparison.summary.incomparable, 2);
});

test("different fixtures and configurations are reported explicitly", () => {
  const before = reportWith(passTurn(), "pass");
  const after = reportWith(passTurn("Ok. Noted."), "pass");
  after.fixture = { path: "suite.json", sha256: "def" };
  after.configuration = { profile: "chat", resources: "required", clock: "pinned" };
  const comparison = compareReports(before, after);
  assert.equal(comparison.suiteChanged, true);
  assert.equal(comparison.fixtureBefore, "abc");
  assert.equal(comparison.fixtureAfter, "def");
  assert.equal(comparison.summary.configurationMatches, false);
  assert.ok(
    comparison.configurationDifferences.some((d) => d.path === "clock" && d.before === null),
  );
  assert.equal(comparison.summary.replyOnlyChanges, 1);
});

test("compareConfigurations finds nested and removed keys", () => {
  const differences = compareConfigurations(
    { profile: "chat", resources: { ready: true } },
    { profile: "browser", resources: { ready: true } },
  );
  assert.deepEqual(differences, [{ path: "profile", before: "chat", after: "browser" }]);
  assert.deepEqual(compareConfigurations({ a: 1 }, { a: 1 }), []);
});

test("known-failure unexpectedly passing is flagged, not counted as a plain gain", () => {
  const comparison = compareCases(
    { id: "tense-passive-01", status: "known-failure", verdict: "known-failure", turns: [] },
    { id: "tense-passive-01", status: "known-failure", verdict: "unexpected-pass", turns: [] },
  );
  assert.equal(comparison.change, "unexpected-pass");
});
