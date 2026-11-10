/**
 * cskg-devloop.test.ts — the dev-loop toolset's pure logic
 * (src/cskg/devloop-core.ts): transcript diffing, declaration
 * verdicts, failure clustering, and the probe parser/checker.
 *
 * No engine, no graph, no server: these are functions over plain
 * turn data, which is exactly why they live in devloop-core. The
 * live behaviour (worker, HTTP, CLI) is verified by hand against a
 * running server per docs/devloop.md.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkExpectation,
  clusterFailures,
  diffTranscripts,
  evaluateVerdict,
  extractGapRegister,
  outcomeSignature,
  parseEvaluationScript,
  parseProbeScript,
  scoreProbeRun,
  summariseTurns,
  toBaseline,
  turnDeclined,
  validateDeclaration,
  type Declaration,
  type TurnOutcome,
} from "../src/cskg/devloop-core";

function turn(
  input: string,
  reply: string,
  opts: { intent?: string; grounded?: boolean; decline?: string } = {},
): TurnOutcome {
  const steps = opts.decline
    ? [{ piece: "solve", kind: "decline", detail: opts.decline }]
    : [{ piece: "solve", kind: "conclude", detail: "answered" }];
  return {
    input,
    reply,
    intent: opts.intent ?? "fact",
    grounded: opts.grounded ?? true,
    steps,
  };
}

/* ---------------- diffing ---------------- */

test("diff: identical transcripts change nothing", () => {
  const runs = [turn("a?", "A."), turn("b?", "B.")];
  const diff = diffTranscripts(toBaseline(runs), runs);
  assert.equal(diff.changed.length, 0);
  assert.equal(diff.unchangedCount, 2);
  assert.deepEqual(diff.added, []);
  assert.deepEqual(diff.removed, []);
});

test("diff: a changed reply is reported with before/after", () => {
  const before = [turn("a?", "old answer"), turn("b?", "same")];
  const after = [turn("a?", "new answer"), turn("b?", "same")];
  const diff = diffTranscripts(toBaseline(before), after);
  assert.equal(diff.changed.length, 1);
  assert.equal(diff.changed[0].input, "a?");
  assert.equal(diff.changed[0].before, "old answer");
  assert.equal(diff.changed[0].after, "new answer");
  assert.equal(diff.unchangedCount, 1);
});

test("diff: grown and shrunk scripts surface as added/removed", () => {
  const before = [turn("a?", "A")];
  const after = [turn("a?", "A"), turn("c?", "C")];
  const grown = diffTranscripts(toBaseline(before), after);
  assert.deepEqual(grown.added, ["c?"]);
  const shrunk = diffTranscripts(toBaseline(after), before);
  assert.deepEqual(shrunk.removed, ["c?"]);
});

test("diff: an edited input line is remove+add, not a silent pairing", () => {
  const diff = diffTranscripts(
    toBaseline([turn("old wording?", "A")]),
    [turn("new wording?", "A")],
  );
  assert.deepEqual(diff.removed, ["old wording?"]);
  assert.deepEqual(diff.added, ["new wording?"]);
  assert.equal(diff.changed.length, 0);
});

/* ---------------- clustering ---------------- */

test("clustering: ungrounded turns cluster by normalised signature", () => {
  const turns = [
    turn("Where is X?", "", { grounded: false, decline: "no fact for node 123" }),
    turn("Where is Y?", "", { grounded: false, decline: "no fact for node 987" }),
    turn("Where is Z?", "", { grounded: false, decline: "empty causal set" }),
    turn("What is a hammer?", "A tool.", { grounded: true }),
  ];
  const clusters = clusterFailures(turns);
  assert.equal(clusters.length, 2);
  assert.equal(clusters[0].count, 2); // digits normalised away
  assert.deepEqual(clusters[0].examples, ["Where is X?", "Where is Y?"]);
  assert.equal(clusters[1].count, 1);
  const summary = summariseTurns(turns);
  assert.equal(summary.turns, 4);
  assert.equal(summary.grounded, 1);
  assert.equal(summary.declined, 3);
  assert.ok(turnDeclined(turns[0]));
  assert.ok(outcomeSignature(turns[0]).includes("decline@solve"));
});

test("clustering: grounded turns are never failures", () => {
  assert.deepEqual(clusterFailures([turn("q", "a")]), []);
});

/* ---------------- declarations and verdicts ---------------- */

const SCRIPT = "scripts/example.txt";

function declaration(partial: Partial<Declaration> = {}): Declaration {
  return {
    note: "test declaration",
    declaredAt: "2026-11-10T00:00:00.000Z",
    changes: [
      { script: SCRIPT, input: "a?", mustContain: ["new"] },
    ],
    ...partial,
  };
}

test("validate: an empty changes list is rejected", () => {
  assert.throws(
    () => validateDeclaration({ note: "x", changes: [] }),
    /not a declaration/,
  );
  assert.throws(() => validateDeclaration({ note: "x" }), /changes/);
  assert.throws(() => validateDeclaration("nope"), /object/);
});

test("verdict: declared change holds, nothing else moved → PASS", () => {
  const baseline = toBaseline([turn("a?", "old"), turn("b?", "same")]);
  const current = [turn("a?", "the new answer"), turn("b?", "same")];
  const v = evaluateVerdict(declaration(), { [SCRIPT]: { baseline, current } });
  assert.equal(v.complete, true);
  assert.equal(v.pass, true);
  assert.equal(v.changes[0].met, true);
  assert.equal(v.changes[0].changedVsBaseline, true);
});

test("verdict: assertion fails → FAIL with the reason", () => {
  const baseline = toBaseline([turn("a?", "old")]);
  const current = [turn("a?", "something else entirely")];
  const v = evaluateVerdict(declaration(), { [SCRIPT]: { baseline, current } });
  assert.equal(v.pass, false);
  assert.match(v.failures.join(" "), /does not contain "new"/);
});

test("verdict: an undeclared change fails even when the declared one holds", () => {
  const baseline = toBaseline([turn("a?", "old"), turn("b?", "same")]);
  const current = [turn("a?", "the new answer"), turn("b?", "ALSO CHANGED")];
  const v = evaluateVerdict(declaration(), { [SCRIPT]: { baseline, current } });
  assert.equal(v.pass, false);
  assert.equal(v.undeclaredChanges.length, 1);
  assert.match(v.failures.join(" "), /undeclared/);
});

test("verdict: allowOtherChanges tolerates the stray change", () => {
  const baseline = toBaseline([turn("a?", "old"), turn("b?", "same")]);
  const current = [turn("a?", "the new answer"), turn("b?", "ALSO CHANGED")];
  const v = evaluateVerdict(declaration({ allowOtherChanges: true }), {
    [SCRIPT]: { baseline, current },
  });
  assert.equal(v.pass, true);
  assert.equal(v.undeclaredChanges.length, 1); // still reported, just not fatal
});

test("verdict: mustNotContain is enforced", () => {
  const d = declaration({
    changes: [{ script: SCRIPT, input: "a?", mustNotContain: ["sorry"] }],
  });
  const v = evaluateVerdict(d, {
    [SCRIPT]: { baseline: toBaseline([turn("a?", "old")]), current: [turn("a?", "sorry, no")] },
  });
  assert.equal(v.pass, false);
  assert.match(v.failures.join(" "), /forbidden "sorry"/);
});

test("verdict: incomplete until every declared script has run", () => {
  const d = declaration({
    changes: [
      { script: SCRIPT, input: "a?", mustContain: ["new"] },
      { script: "scripts/other.txt", input: "z?", mustContain: ["zed"] },
    ],
  });
  const v = evaluateVerdict(d, {
    [SCRIPT]: {
      baseline: toBaseline([turn("a?", "old")]),
      current: [turn("a?", "new")],
    },
  });
  assert.equal(v.complete, false);
  assert.equal(v.pass, false);
  assert.deepEqual(v.pendingScripts, ["scripts/other.txt"]);
});

test("verdict: declared input missing from the run fails honestly", () => {
  const v = evaluateVerdict(declaration(), {
    [SCRIPT]: { baseline: toBaseline([turn("a?", "old")]), current: [turn("different?", "new")] },
  });
  assert.equal(v.pass, false);
  assert.match(v.failures.join(" "), /not found/);
});

/* ---------------- probe parsing and checking ---------------- */

test("probes: inputs and annotations parse in order", () => {
  const text = [
    "# header comment",
    "",
    "What is a hammer?",
    "#! expect=grounded contains=tool",
    "What is the airspeed of a swallow?",
    "#! expect=decline",
    "An unannotated statement.",
    "Define a bank.",
    "#! expect=clarify notcontains=river",
  ].join("\n");
  const probes = parseProbeScript(text);
  assert.equal(probes.length, 4);
  assert.deepEqual(probes[0].expect, {
    outcome: "grounded",
    contains: ["tool"],
    notContains: [],
  });
  assert.equal(probes[1].expect?.outcome, "decline");
  assert.equal(probes[2].expect, null);
  assert.deepEqual(probes[3].expect?.notContains, ["river"]);
});

test("probes: strict errors — orphan, duplicate, unknown outcome, bad key", () => {
  assert.throws(() => parseProbeScript("#! expect=decline\nQ?"), /no preceding input/);
  assert.throws(
    () => parseProbeScript("Q?\n#! expect=decline\n#! expect=grounded"),
    /duplicate annotation/,
  );
  assert.throws(() => parseProbeScript("Q?\n#! expect=maybe"), /unknown expect outcome/);
  assert.throws(() => parseProbeScript("Q?\n#! expect=decline bogus=1"), /unknown annotation key/);
  assert.throws(() => parseProbeScript("Q?\n#! nonsense"), /malformed annotation/);
});

test("probes: evaluation scripts parse the chat.ts way", () => {
  assert.deepEqual(parseEvaluationScript("# c\n\n one \n# x\ntwo\n"), ["one", "two"]);
});

test("probes: expectations check outcome + contains against real turns", () => {
  const ok = turn("q", "A hammer is a tool.", { grounded: true });
  assert.equal(
    checkExpectation(ok, { outcome: "grounded", contains: ["tool"], notContains: [] }).met,
    true,
  );
  const declined = turn("q", "I don't know.", { grounded: false, decline: "no fact" });
  assert.equal(
    checkExpectation(declined, { outcome: "decline", contains: [], notContains: [] }).met,
    true,
  );
  assert.equal(
    checkExpectation(ok, { outcome: "decline", contains: [], notContains: [] }).met,
    false,
  );
  const clarify = turn("q", "Which bank?", { intent: "clarification", grounded: false });
  assert.equal(
    checkExpectation(clarify, { outcome: "clarify", contains: [], notContains: [] }).met,
    true,
  );
  const scored = scoreProbeRun(
    [
      { input: "q", line: 1, expect: { outcome: "grounded", contains: ["tool"], notContains: [] } },
      { input: "q2", line: 2, expect: null },
    ],
    [ok, ok],
  );
  assert.equal(scored.annotated, 1);
  assert.equal(scored.met, 1);
});

/* ---------------- design helpers ---------------- */

test("design: the gap register extracts §9 only", () => {
  const md = [
    "## 8. Build order",
    "stuff",
    "## 9. Feature gaps — the watch list",
    "- **G1 — Something.** open.",
    "## 10. Toward a real conversation",
    "other",
  ].join("\n");
  const gaps = extractGapRegister(md);
  assert.match(gaps, /G1 — Something/);
  assert.doesNotMatch(gaps, /Toward a real conversation/);
  assert.equal(extractGapRegister("## 1. Nothing here"), "");
});
