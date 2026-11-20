#!/usr/bin/env node
/**
 * fork-entity-eval.mjs — the entity-ranking evaluation
 * (docs/fork/entity-ranking-report.md). Runs OFFLINE against the
 * recorded fixtures in test/fixtures/entity-ranking-cases.json —
 * no network, ever.
 *
 * Scores TOP-1 accuracy for:
 *  - BASELINE: the first candidate in the recorded list, i.e.
 *    Wikidata search order alone.
 *  - RANKER: rankEntities' top candidate, with the full signal
 *    breakdown printed per case.
 *
 * Run: npm run build && node scripts/fork-entity-eval.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rankEntities } from "../dist/src/fork/entity-rank.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = JSON.parse(readFileSync(join(root, "test", "fixtures", "entity-ranking-cases.json"), "utf-8"));
const cases = fixture.cases;

let baselinePass = 0;
let rankerPass = 0;
for (const c of cases) {
  const baselineTop = c.candidates[0];
  const ranked = rankEntities(c.candidates, {
    mention: c.mention,
    contextText: c.contextText,
    expectedKind: c.expectedKind,
  });
  const top = ranked[0];
  const baselineOk = baselineTop.id === c.expected;
  const rankerOk = top.candidate.id === c.expected;
  if (baselineOk) baselinePass++;
  if (rankerOk) rankerPass++;
  console.log(`${rankerOk ? "PASS" : "FAIL"} ${c.mention} — ${c.contextText}`);
  console.log(`  expected: ${c.expected}`);
  console.log(`  baseline (search order): ${baselineTop.id} — ${baselineOk ? "correct" : "wrong"}`);
  console.log(`  ranker top: ${top.candidate.id} total=${top.total.toFixed(2)} (type=${top.type.score} [${top.type.verdict}${top.type.rule ? ", " + top.type.rule : ""}], prominence=${top.prominence.score.toFixed(2)} [${top.prominence.sitelinks} sitelinks], overlap=${top.overlap.score} [${top.overlap.words.join(", ")}])`);
  for (const r of ranked.slice(1, 4)) {
    console.log(`    next: ${r.candidate.id} total=${r.total.toFixed(2)} (type=${r.type.score} [${r.type.verdict}], prominence=${r.prominence.score.toFixed(2)}, overlap=${r.overlap.score} [${r.overlap.words.join(", ")}])`);
  }
}
console.log(`\nTop-1: ranker ${rankerPass}/${cases.length} · baseline (search order) ${baselinePass}/${cases.length}`);
