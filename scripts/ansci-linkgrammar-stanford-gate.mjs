#!/usr/bin/env node
/** Gate harness: RelEx-compatible Stanford relations.
 *
 * Runs src/ansci/linkgrammar-stanford.ts over the 42
 * TestStanford corpus sentences (upstream relex test suite)
 * and all 56 English Foundry turns. The port runs the
 * stanford rule file standalone (no semantic pass), so the
 * gate does not compare against full RelEx output; it checks:
 *
 * - no rule errors on any input
 * - self-contained families appear (det, aux, cop, prt, ...)
 * - semantic-dependent families NEVER appear (nsubj, dobj,
 *   advcl, ccomp, xsubj, csubj, nsubjpass, neg, prep_*):
 *   a leak would mean the engine invented structure the
 *   upstream pipeline only derives semantically
 * - recovered/failed parses are reported, never thrown
 *
 * GATE: PASS iff errors == 0 and semantic leaks == 0.
 * Usage: npm run build && node scripts/ansci-linkgrammar-stanford-gate.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { stanfordRelations } from "../dist/src/ansci/linkgrammar-stanford.js";

const TESTSTANFORD = [
  "Who invented sliced bread?",
  "Jim runs quickly.",
  "The bird, a robin, sang sweetly.",
  "There is a place we can go.",
  "The linebacker gave the quarterback a push.",
  "He stood at the goal line.",
  "She looks very beautiful.",
  "The accident happened as the night was falling.",
  "If you know who did it, you should tell the teacher.",
  "The man has been killed by the police.",
  "Effects caused by the protein are important.",
  "Sam, my brother, has arrived.",
  "What is that?",
  "Reagan has died.",
  "He should leave.",
  "Kennedy has been killed.",
  "Kennedy was killed.",
  "Kennedy got killed.",
  "Bill is big.",
  "Bill is an honest man.",
  "What she said makes sense.",
  "What she said is not true.",
  "Which book do you prefer?",
  "There is a ghost in the room.",
  "She gave me a raise.",
  "The director is 65 years old.",
  "Sam eats 3 sheep.",
  "I lost $ 3.2 billion.",
  "Truffles picked during the spring are tasty.",
  "We went to their offices to get Bill's clothes.",
  "All the boys are here.",
  "I saw a cat in a hat.",
  "I saw a cat with a telescope.",
  "He is responsible for meals.",
  "They shut down the station.",
  "About 200 people came to the party.",
  "I saw the man who you love.",
  "I saw the man whose wife you love.",
  "I am ready to leave.",
  "Tom likes to eat fish.",
  "He says that you like to swim.",
  "The garage is next to the house.",
];

const SEMANTIC_ONLY = new Set([
  "nsubj", "dobj", "advcl", "ccomp", "xsubj", "csubj",
  "nsubjpass", "neg", "agent", "partmod", "infmod",
  // rcmod is NOT in this set: SF_RCMOD_ID sets IS-OBJ-FLAG
  // from an O-link inside the stanford file itself, so
  // SF_RCMOD can fire standalone (verified on
  // "I saw the man who you love.").
]);

const rows = [];
async function run(source, text) {
  const r = await stanfordRelations(text);
  const families = {};
  for (const rel of r.relations) families[rel.rel] = (families[rel.rel] ?? 0) + 1;
  const leaks = r.relations.filter((x) => SEMANTIC_ONLY.has(x.rel) || x.rel.startsWith("prep_"));
  rows.push({
    source,
    text,
    status: r.status,
    linkages: r.linkages,
    nullCount: r.nullCount,
    relations: r.relations.length,
    families,
    leaks: leaks.map((x) => x.rel),
    error: r.error ?? null,
  });
}

for (const s of TESTSTANFORD) await run("teststanford", s);

const FIXTURES = [
  "english-baseline.json",
  "english-development.json",
  "english-ewt-scout-v1.json",
  "english-fresh-ai-v1.json",
  "english-initial-adverbs-v1.json",
  "english-introductory-pp-v1.json",
  "english-masc-scout-v1.json",
  "english-time.json",
];
for (const file of FIXTURES) {
  const fixture = JSON.parse(readFileSync(`loop/foundry-cases/${file}`, "utf8"));
  for (const c of fixture.cases ?? []) {
    for (const t of c.turns ?? []) await run(file, t.input);
  }
}

let errors = 0;
let leaks = 0;
let complete = 0;
let recovered = 0;
let failed = 0;
let totalRelations = 0;
const familyTotals = {};
for (const r of rows) {
  if (r.error) errors++;
  leaks += r.leaks.length;
  if (r.status === "complete") complete++;
  else if (r.status === "recovered") recovered++;
  else failed++;
  totalRelations += r.relations;
  for (const [f, n] of Object.entries(r.families)) familyTotals[f] = (familyTotals[f] ?? 0) + n;
}
const verdict = errors === 0 && leaks === 0 ? "PASS" : "FAIL";
const report = {
  schemaVersion: 1,
  gate: "stanford standalone port; PASS iff rule errors == 0 and semantic-family leaks == 0",
  verdict,
  summary: {
    inputs: rows.length,
    complete,
    recovered,
    failed,
    totalRelations,
    ruleErrors: errors,
    semanticLeaks: leaks,
    familyTotals,
  },
  rows,
};
const stamp = new Date().toISOString().slice(0, 10);
const outPath = `loop/foundry-results/linkgrammar-stanford-gate-${stamp}.json`;
writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ verdict, summary: report.summary, outPath }, null, 1));
if (verdict !== "PASS") process.exitCode = 1;
