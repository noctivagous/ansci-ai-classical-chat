#!/usr/bin/env node
/**
 * fork-triage.mjs — the review-triage queue as commands
 * (repair programme Part C.6; machinery in src/fork/triage.ts).
 *
 * The queue file is JSONL, one review item per line:
 *   { item_id, stratum, risk_class, rule_id, rule_status,
 *     instance_status, c_source, c_rule_calibration, c_instance }
 * Rule status and instance status are separate fields throughout;
 * nothing here merges them.
 *
 *   node scripts/fork-triage.mjs summarise <queue.jsonl>
 *       Counts by risk class and stratum; the always-review total.
 *   node scripts/fork-triage.mjs always-review <queue.jsonl>
 *       The critical+high list: 100% human review before admission.
 *   node scripts/fork-triage.mjs sample <queue.jsonl> <seed>
 *       The seeded stratified sample over medium/low, with its
 *       size and any under-tested strata named.
 */
import { readFileSync } from "node:fs";
import {
  alwaysReviewQueue, stratifiedSample, admittedConfidence,
} from "../dist/src/fork/triage.js";

const [cmd, file, seedArg] = process.argv.slice(2);
const items = readFileSync(file, "utf-8")
  .split(/\r?\n/)
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));

if (cmd === "summarise") {
  const byClass = {};
  const byStratum = {};
  for (const i of items) {
    byClass[i.risk_class] = (byClass[i.risk_class] ?? 0) + 1;
    byStratum[i.stratum] = (byStratum[i.stratum] ?? 0) + 1;
  }
  console.log(`queue: ${items.length} items`);
  for (const [k, v] of Object.entries(byClass)) console.log(`  risk ${k}: ${v}`);
  for (const [k, v] of Object.entries(byStratum)) console.log(`  stratum ${k}: ${v}`);
  console.log(`always-review (critical+high): ${alwaysReviewQueue(items).length}`);
  const provisional = items.filter((i) => i.instance_status === "unreviewed").length;
  console.log(`unreviewed instances (machine-derived, provisional): ${provisional}`);
} else if (cmd === "always-review") {
  for (const i of alwaysReviewQueue(items)) {
    console.log(`${i.item_id}\t${i.risk_class}\t${i.stratum}\trule ${i.rule_id} (${i.rule_status})\tinstance ${i.instance_status}\tC_admitted ${admittedConfidence(i).toFixed(3)}`);
  }
} else if (cmd === "sample") {
  const seed = Number(seedArg ?? 1);
  const s = stratifiedSample(items, { seed });
  console.log(`stratified sample (seed ${seed}): ${s.total} items`);
  for (const [stratum, ids] of Object.entries(s.by_stratum)) {
    console.log(`  ${stratum}: ${ids.length} — ${ids.join(", ")}`);
  }
  if (s.under_tested_strata.length) {
    console.log(`under-tested strata (too small for the minimum): ${s.under_tested_strata.join(", ")}`);
  }
} else {
  console.error("usage: fork-triage.mjs summarise|always-review|sample <queue.jsonl> [seed]");
  process.exit(2);
}
