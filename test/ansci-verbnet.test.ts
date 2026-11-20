/**
 * ansci-verbnet.test.ts — the VerbNet valency provider (verbnet-lex.ts,
 * 2026-11-17): VerbNet 3.3 frame shapes checking the permissive
 * frames of WordNet-derived verbs.
 *
 * Pinned: (a) a covered verb used within its frames is supported,
 * basis "verbnet", with no violation; (b) a covered verb used with
 * an argument structure no frame allows is a LOCATED valency
 * failure (valency-verbnet-disallowed in the binary checker,
 * unsupported in the three-state assessment); (c) an uncovered
 * verb is exactly as before (evidence-free, unusual-but-licensed);
 * (d) the coverage report against the parser's verb inventory.
 * Skips cleanly when the VerbNet table is not installed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/ansci/parse";
import { assessValency, checkSentence } from "../src/ansci/check";
import { enableWordnetLexicon } from "../src/ansci/wordnet-lex";
import {
  setVerbNetEnabled,
  verbnetAvailable,
  verbnetCoverage,
  verbnetCoverageReport,
} from "../src/ansci/verbnet-lex";

const HAS_VN = verbnetAvailable();
enableWordnetLexicon(true);

test("coverage: blush is intransitive-only, analyze takes an object, aspirate is uncovered", { skip: !HAS_VN }, () => {
  const blush = verbnetCoverage("blush");
  assert.ok(blush);
  assert.equal(blush.maxNp, 0);
  const analyze = verbnetCoverage("analyze");
  assert.ok(analyze);
  assert.ok(analyze.maxNp >= 1);
  assert.ok(analyze.roles.length > 0); // thematic roles ride with the coverage
  assert.equal(verbnetCoverage("aspirate"), undefined);
});

test("(a) a covered verb within its frames: supported, basis verbnet, no violation", { skip: !HAS_VN }, () => {
  const p = parse("She analyzed the data.", "en");
  assert.ok(!checkSentence(p).some((v) => v.name === "valency-verbnet-disallowed"));
  const a = assessValency(p).filter((x) => x.verb === "analyze");
  assert.ok(a.length >= 2);
  assert.ok(a.every((x) => x.basis === "verbnet" && x.state === "supported"), JSON.stringify(a));
});

test("(b) a covered verb with a disallowed structure: located valency failure", { skip: !HAS_VN }, () => {
  const bad = parse("She blushed the rabbit.", "en");
  const violations = checkSentence(bad).filter((v) => v.name === "valency-verbnet-disallowed");
  assert.equal(violations.length, 1);
  assert.match(violations[0].message, /blush/);
  assert.match(violations[0].message, /VerbNet-covered/);
  const a = assessValency(bad).filter((x) => x.verb === "blush");
  assert.ok(a.some((x) => x.role === "patient" && x.state === "unsupported" && x.basis === "verbnet"), JSON.stringify(a));
  // The same verb used as its frames allow: no failure.
  const ok = parse("The rabbit blushed.", "en");
  assert.ok(!checkSentence(ok).some((v) => v.name === "valency-verbnet-disallowed"));
  assert.ok(assessValency(ok).filter((x) => x.verb === "blush").every((x) => x.state !== "unsupported"));
});

test("(c) an uncovered verb is unchanged: evidence-free, unusual-but-licensed, no violation", { skip: !HAS_VN }, () => {
  const p = parse("She aspirated the rabbit.", "en");
  assert.ok(!checkSentence(p).some((v) => v.name.startsWith("valency-verbnet")));
  const a = assessValency(p).filter((x) => x.verb === "aspirate");
  assert.ok(a.length >= 2);
  assert.ok(a.every((x) => x.basis === "evidence-free" && x.state === "unusual-but-licensed"), JSON.stringify(a));
});

test("(c') with the provider off, a covered verb falls back to evidence-free exactly", { skip: !HAS_VN }, () => {
  setVerbNetEnabled(false);
  enableWordnetLexicon(false);
  enableWordnetLexicon(true); // purge derived entries so blush re-derives without VerbNet
  try {
    const p = parse("She blushed the rabbit.", "en");
    assert.ok(!checkSentence(p).some((v) => v.name.startsWith("valency-verbnet")));
    const a = assessValency(p).filter((x) => x.verb === "blush");
    assert.ok(a.every((x) => x.basis === "evidence-free"), JSON.stringify(a));
  } finally {
    setVerbNetEnabled(true);
    enableWordnetLexicon(false);
    enableWordnetLexicon(true);
  }
});

test("(d) coverage report: VerbNet verbs/classes and the parser-inventory coverage", { skip: !HAS_VN }, () => {
  const r = verbnetCoverageReport();
  assert.equal(r.verbnetVerbs, 4310);
  assert.equal(r.verbnetClasses, 601);
  assert.ok(r.parserVerbs > r.covered, JSON.stringify(r));
  assert.ok(r.covered > 4000, JSON.stringify(r)); // measured 4,135 of 11,604 at build time
});
