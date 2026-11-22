// verify.mjs — independently replay every banked receipt in receipts.json.
//
//   node knowledge/derivation-closure/verify.mjs
//
// Each receipt is re-executed from the generators plus its question's
// premises: every step must be a valid rule application, hop strengths
// must match, combines must rest on disjoint support (modulo the
// question's premises), and the recomputed final price must equal the
// banked one at the same conclusion. v2 receipts carry a `config` field
// ('v1' | 'v2') selecting the generator configuration to replay
// against; receipts without one are replayed under v1. Exit code 0 iff
// every receipt replays.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { QUESTIONS } from './syllabus.mjs';
import { QUESTIONS_V2 } from './syllabus2.mjs';
import { buildBaseFacts, RULES } from './generators.mjs';
import { buildBaseFactsV2, RULES_V2 } from './generators2.mjs';
import { replayReceipt } from './walk.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const { receipts } = JSON.parse(readFileSync(join(HERE, 'receipts.json'), 'utf8'));

const CONFIGS = {
  v1: { baseFacts: buildBaseFacts(), rules: RULES },
  v2: { baseFacts: buildBaseFactsV2(), rules: RULES_V2 },
};
const ALL_QUESTIONS = [...QUESTIONS, ...QUESTIONS_V2];

let ok = 0;
const failures = [];
for (const r of receipts) {
  const q = ALL_QUESTIONS.find(x => x.id === r.question);
  if (!q) { failures.push(`${r.question}: question not in either syllabus`); continue; }
  const cfg = CONFIGS[r.config ?? 'v1'];
  if (!cfg) { failures.push(`${r.question}: unknown config ${r.config}`); continue; }
  const res = replayReceipt(r, { baseFacts: cfg.baseFacts, premises: q.setup, rules: cfg.rules });
  if (res.ok) ok++;
  else failures.push(`${r.question}/${r.arithmetic}/${r.config ?? 'v1'}: ${res.error}`);
}

console.log(`replayed ${receipts.length} receipts: ${ok} ok, ${failures.length} failed`);
for (const f of failures) console.log(`  FAIL ${f}`);
process.exit(failures.length ? 1 : 0);
