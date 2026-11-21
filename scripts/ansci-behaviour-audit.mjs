#!/usr/bin/env node
/**
 * ansci-behaviour-audit.mjs — trace-led behavioural regression runner.
 *
 * Unlike a transcript snapshot, this runner checks the observable
 * conversational contract and the mechanism that produced it.  It
 * deliberately supports `known-failure` cases: known architectural
 * gaps remain visible in every report without making the healthy
 * regression suite red.
 *
 * Usage:
 *   npm run ansci:audit
 *   node scripts/ansci-behaviour-audit.mjs path/to/cases.json
 *   node scripts/ansci-behaviour-audit.mjs path/to/cases.json --json
 *
 * A case has `id`, `status` (`must-pass` or `known-failure`), `turns`,
 * and checks.  Supported check kinds are:
 *   receipt, reply-object, origin, reply-includes, reply-excludes,
 *   no-duplicate-clause, no-opening-suppression, trace-path-includes.
 */
import { readFileSync } from "node:fs";
import { newSession } from "../dist/src/ansci/session.js";
import { processTurn } from "../dist/src/ansci/turn.js";

const args = process.argv.slice(2);
const json = args.includes("--json");
const fixture = args.find((arg) => !arg.startsWith("-")) ?? "test/fixtures/ansci-behaviour-cases.json";
const cases = JSON.parse(readFileSync(fixture, "utf8"));

function clauses(text) {
  return text
    .split(/[.!?]+/)
    .map((part) => part.trim().toLowerCase().replace(/^you told me\s+/, "").replace(/^you already told me\s+/, ""))
    .filter((part) => part.length >= 4);
}

function checkResult(result, check) {
  const turn = result.turns[(check.turn ?? result.turns.length) - 1];
  if (!turn) return { pass: false, detail: `turn ${check.turn} does not exist` };
  const { reply, trace } = turn;
  switch (check.kind) {
    case "receipt":
      return { pass: Boolean(trace.recognition), detail: trace.recognition?.detail ?? "no record receipt" };
    case "reply-object":
      return { pass: Boolean(trace.replyObject), detail: trace.replyObject ? `${trace.replyObject.kind} ${trace.replyObject.id}` : "hand wording" };
    case "origin": {
      const actual = trace.replyObject || trace.replyGraph ? "generated" : "hand-worded";
      return { pass: actual === check.value, detail: actual };
    }
    case "reply-includes":
      return { pass: reply.includes(check.value), detail: reply };
    case "reply-excludes":
      return { pass: !reply.includes(check.value), detail: reply };
    case "no-duplicate-clause": {
      const seen = new Set();
      const duplicate = clauses(reply).find((clause) => (seen.has(clause) ? true : (seen.add(clause), false)));
      return { pass: !duplicate, detail: duplicate ? `duplicate clause: ${duplicate}` : reply };
    }
    case "no-opening-suppression": {
      const suppressed =
        trace.turn === 1 &&
        /^Ok\. Noted\.$/.test(reply) &&
        !trace.recognition &&
        !trace.replyObject &&
        !trace.replyGraph;
      return { pass: !suppressed, detail: suppressed ? "opening statement was hidden behind the bare acknowledgement" : reply };
    }
    case "trace-path-includes": {
      const path = trace.mapPath?.join("→") ?? "";
      return { pass: path.includes(check.value), detail: path };
    }
    default:
      return { pass: false, detail: `unknown check kind: ${check.kind}` };
  }
}

const report = { fixture, cases: [], summary: { mustPass: 0, knownFailures: 0, unexpectedFailures: 0 } };
for (const specimen of cases) {
  const session = newSession();
  const turns = specimen.turns.map((input) => {
    const output = processTurn(session, input);
    return { input, reply: output.reply, trace: output.trace };
  });
  const result = { id: specimen.id, status: specimen.status, turns, checks: [] };
  for (const check of specimen.checks) {
    const judged = checkResult(result, check);
    result.checks.push({ ...check, ...judged });
  }
  const passes = result.checks.every((check) => check.pass);
  result.outcome = passes ? "pass" : specimen.status === "known-failure" ? "known-failure" : "unexpected-failure";
  if (result.outcome === "pass") report.summary.mustPass += 1;
  if (result.outcome === "known-failure") report.summary.knownFailures += 1;
  if (result.outcome === "unexpected-failure") report.summary.unexpectedFailures += 1;
  report.cases.push(result);
}

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`AnSci behavioural audit: ${report.fixture}`);
  for (const result of report.cases) {
    const marker = result.outcome === "pass" ? "PASS" : result.outcome === "known-failure" ? "KNOWN" : "FAIL";
    console.log(`${marker}\t${result.id}`);
    for (const check of result.checks) console.log(`  ${check.pass ? "ok" : "x"}\t${check.kind}: ${check.detail}`);
  }
  console.log(`summary: ${report.summary.mustPass} pass, ${report.summary.knownFailures} known gaps, ${report.summary.unexpectedFailures} unexpected failures`);
}

process.exitCode = report.summary.unexpectedFailures ? 1 : 0;
