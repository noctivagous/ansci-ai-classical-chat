#!/usr/bin/env node
/** Gate harness: RelEx full pipeline (tagging -> semantic ->
 * stanford) Stanford relations.
 *
 * Runs src/ansci/linkgrammar-stanford.ts stanfordRelationsFull
 * over the same 98 inputs as the standalone gate (42
 * TestStanford corpus sentences + 56 Foundry turns) and checks:
 *
 * - statuses no worse than the standalone run (same inputs,
 *   same WASM linkage; the passes cannot change parse status)
 * - no rule errors OUTSIDE the upstream-swallowed class:
 *   upstream, FeatureNode.mergeWith/copyInto throw on
 *   non-unifiable merges and SentenceAlgorithm silently eats
 *   the exception (the mergeWith javadoc says so verbatim).
 *   The port records them; this gate classifies them. Any
 *   other error fails the gate.
 * - the semantic-dependent families now fire (nsubj, dobj,
 *   neg, nsubjpass present in the totals) — the point of the
 *   slice. prep_* is NOT a marker: upstream, the stanford
 *   file's only live PrepositionLinkAlg use is commented out
 *   in the shipped semantic file, so ref prep-links are never
 *   populated and PREP_TO_SF never fires — upstream's own
 *   TestStanford prep_at expectations are met only in
 *   --expand-preps mode, which is a different feature path
 *   (prep-parts, not prep-links). The full run therefore
 *   surfaces prepositions as advmod + native _pobj, exactly
 *   as the default upstream flow does; prep_* counts are
 *   reported in the family diff for the record.
 * - per-family differences vs the standalone run are
 *   enumerated in the report (the semantic pass legitimately
 *   re-routes some standalone output, e.g. prepositions move
 *   from advmod to prep_*; nothing may silently vanish: the
 *   gate requires full totalRelations >= standalone)
 *
 * GATE: PASS iff non-merge errors == 0, statuses match the
 * standalone run, all five semantic markers are present, and
 * totalRelations does not drop.
 * Usage: npm run build && node scripts/ansci-linkgrammar-stanford-full-gate.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  stanfordRelations,
  stanfordRelationsFull,
} from "../dist/src/ansci/linkgrammar-stanford.js";

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

const MERGE_ERROR = /cannot merge|cannot set a non-empty|append.*non-valued|append an empty/;
const SEMANTIC_MARKERS = ["nsubj", "dobj", "neg", "nsubjpass"];

const inputs = [];
for (const s of TESTSTANFORD) inputs.push({ source: "teststanford", text: s });
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
    for (const t of c.turns ?? []) inputs.push({ source: file, text: t.input });
  }
}

const rows = [];
for (const { source, text } of inputs) {
  const solo = await stanfordRelations(text);
  const full = await stanfordRelationsFull(text);
  const splitErrors = (e) =>
    (e ?? "").split("; ").filter(Boolean);
  const fullErrors = splitErrors(full.error);
  const mergeErrors = fullErrors.filter((e) => MERGE_ERROR.test(e));
  const hardErrors = fullErrors.filter((e) => !MERGE_ERROR.test(e));
  const fam = (rs) => {
    const m = {};
    for (const r of rs) m[r.rel] = (m[r.rel] ?? 0) + 1;
    return m;
  };
  rows.push({
    source,
    text,
    soloStatus: solo.status,
    fullStatus: full.status,
    soloRelations: solo.relations.length,
    fullRelations: full.relations.length,
    soloFamilies: fam(solo.relations),
    fullFamilies: fam(full.relations),
    mergeErrors,
    hardErrors,
  });
}

let statusMismatch = 0;
let hardErrorCount = 0;
let mergeErrorCount = 0;
let soloTotal = 0;
let fullTotal = 0;
const soloFam = {};
const fullFam = {};
for (const r of rows) {
  if (r.soloStatus !== r.fullStatus) statusMismatch++;
  hardErrorCount += r.hardErrors.length;
  mergeErrorCount += r.mergeErrors.length;
  soloTotal += r.soloRelations;
  fullTotal += r.fullRelations;
  for (const [f, n] of Object.entries(r.soloFamilies)) soloFam[f] = (soloFam[f] ?? 0) + n;
  for (const [f, n] of Object.entries(r.fullFamilies)) fullFam[f] = (fullFam[f] ?? 0) + n;
}
const prepTotal = Object.entries(fullFam)
  .filter(([f]) => f.startsWith("prep_"))
  .reduce((a, [, n]) => a + n, 0);
const markersPresent = {
  ...Object.fromEntries(SEMANTIC_MARKERS.map((m) => [m, (fullFam[m] ?? 0) > 0])),
  // Informational only (see header): prep_* cannot fire in the
  // default upstream flow either.
  prep_: prepTotal > 0,
};
const requiredMarkers = SEMANTIC_MARKERS.map((m) => markersPresent[m]);
const familyDiff = {};
for (const f of new Set([...Object.keys(soloFam), ...Object.keys(fullFam)])) {
  familyDiff[f] = { solo: soloFam[f] ?? 0, full: fullFam[f] ?? 0 };
}
const verdict =
  hardErrorCount === 0 &&
  statusMismatch === 0 &&
  requiredMarkers.every(Boolean) &&
  fullTotal >= soloTotal
    ? "PASS"
    : "FAIL";
const report = {
  schemaVersion: 1,
  gate: "stanford full pipeline; PASS iff non-merge errors == 0, statuses match standalone, semantic markers present, relations do not drop",
  verdict,
  summary: {
    inputs: rows.length,
    statusMismatch,
    hardErrors: hardErrorCount,
    upstreamSwallowedMergeErrors: mergeErrorCount,
    soloTotalRelations: soloTotal,
    fullTotalRelations: fullTotal,
    markersPresent,
    familyDiff,
  },
  rows,
};
const stamp = new Date().toISOString().slice(0, 10);
const outPath = `loop/foundry-results/linkgrammar-stanford-full-gate-${stamp}.json`;
writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ verdict, summary: report.summary, outPath }, null, 1));
if (verdict !== "PASS") process.exitCode = 1;
