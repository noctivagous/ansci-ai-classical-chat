#!/usr/bin/env node
/** Gate harness: RelEx native relations (tagging -> semantic).
 *
 * Runs src/ansci/linkgrammar-semantic.ts nativeRelations over
 * cases whose expected relations are cited per case:
 * upstream RelEx's documented/tested outputs (README examples,
 * rule-file comments naming the relation a construction must
 * produce, R2L rule files' example sentences) and the
 * TestStanford corpus sentences read natively.
 *
 * Checks per case: status complete, no rule errors outside the
 * upstream-swallowed merge class (see the full-pipeline gate),
 * and every expected relation present (containment — the
 * semantic file legitimately produces more than the cited
 * minimum).
 *
 * GATE: PASS iff all cases pass.
 * Usage: npm run build && node scripts/ansci-linkgrammar-native-gate.mjs
 */
import { writeFileSync } from "node:fs";
import {
  formatNativeRelations,
  nativeRelations,
} from "../dist/src/ansci/linkgrammar-semantic.js";

const MERGE_ERROR = /cannot merge|cannot set a non-empty|append.*non-valued|append an empty/;

// [text, expected relations, citation]
const CASES = [
  [
    "Johnny ate the dog.",
    ["_subj(ate-2, Johnny-1)", "_obj(ate-2, dog-4)"],
    "R2L rules/svo.scm example sentence; semantic promotion rules (ref links _subj/_obj)",
  ],
  [
    "John gave Mary the book.",
    ["_subj(gave-2, John-1)", "_iobj(gave-2, Mary-3)", "_obj(gave-2, book-5)"],
    "semantic ditransitive rules; cf. TestStanford 'The linebacker gave the quarterback a push.'",
  ],
  [
    "She gave me a raise.",
    ["_subj(gave-2, she-1)", "_iobj(gave-2, me-3)", "_obj(gave-2, raise-5)"],
    "TestStanford corpus sentence, read natively",
  ],
  [
    "She is happy.",
    ["_predadj(she-1, happy-3)"],
    "semantic _predadj promotion (Pa-link rules): 'All my writings are bad' pattern in relex-semantic.algs",
  ],
  [
    "Bill is big.",
    ["_predadj(bill-1, big-3)"],
    "TestStanford corpus sentence, read natively",
  ],
  [
    "He is taller than John.",
    ["_predadj(he-1, taller-3)", "_comparative(taller-3, he-1)", "_pobj(than-4, John-5)"],
    "semantic comparative section (_comparative, comp_arg, _pobj via OBJECT_OF_COMPARISON/PREP_OBJECT)",
  ],
  [
    "What did John eat?",
    ["_subj(eat-4, John-3)", "_obj(eat-4, what-1)"],
    "question rules: the questioned object stays _obj of the verb (R2L whichobjQ consumes exactly this)",
  ],
  [
    "Where did John put it?",
    ["_subj(put-4, John-3)", "_obj(put-4, it-5)", "_%atLocation(put-4, where-1)"],
    "semantic question rules (_%atLocation for where-questions; R2L where-q consumes it)",
  ],
  [
    "I saw a cat in a hat.",
    ["_subj(saw-2, I-1)", "_obj(saw-2, cat-4)", "_pobj(in-5, hat-7)"],
    "TestStanford corpus sentence + PREP_OBJECT rule, read natively",
  ],
  [
    "The dog was chased by the cat.",
    ["_obj(chased-4, dog-2)", "_pobj(by-5, cat-7)"],
    "passive: the surface subject is the semantic _obj (semantic passive rules); by-phrase is _pobj",
  ],
  [
    "Sam eats 3 sheep.",
    ["_subj(eats-2, Sam-1)", "_obj(eats-2, sheep-4)", "_quantity(sheep-4, 3-3)"],
    "TestStanford corpus sentence + quantity rules, read natively",
  ],
  [
    "Jim runs quickly.",
    ["_subj(runs-2, Jim-1)", "_advmod(runs-2, quickly-3)"],
    "TestStanford corpus sentence, read natively",
  ],
];

const rows = [];
for (const [text, expected, cite] of CASES) {
  const r = await nativeRelations(text);
  const got = new Set(
    formatNativeRelations(r.relations).split("\n").filter(Boolean),
  );
  const missing = expected.filter((e) => !got.has(e));
  const hardErrors = (r.error ?? "")
    .split("; ")
    .filter(Boolean)
    .filter((e) => !MERGE_ERROR.test(e));
  rows.push({
    text,
    cite,
    status: r.status,
    expected,
    missing,
    relations: r.relations.length,
    hardErrors,
    pass: r.status === "complete" && missing.length === 0 && hardErrors.length === 0,
  });
}
const verdict = rows.every((r) => r.pass) ? "PASS" : "FAIL";
const report = {
  schemaVersion: 1,
  gate: "native relations; PASS iff every cited case is complete, error-clean (modulo upstream-swallowed merge errors) and contains its expected relations",
  verdict,
  summary: {
    cases: rows.length,
    passed: rows.filter((r) => r.pass).length,
    totalRelations: rows.reduce((a, r) => a + r.relations, 0),
  },
  rows,
};
const stamp = new Date().toISOString().slice(0, 10);
const outPath = `loop/foundry-results/linkgrammar-native-gate-${stamp}.json`;
writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ verdict, summary: report.summary, outPath }, null, 1));
for (const r of rows) if (!r.pass) console.log("FAIL:", r.text, r.missing, r.hardErrors);
if (verdict !== "PASS") process.exitCode = 1;
