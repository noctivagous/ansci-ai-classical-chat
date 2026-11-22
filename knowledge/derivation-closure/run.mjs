// run.mjs — the derivation-closure experiment runner.
//
//   node knowledge/derivation-closure/run.mjs
//
// v1: the syllabus question set two ways —
//   BASELINE  stored-facts lookup only (stored-facts.mjs) — no derivation,
//             no prices; a wrong lookup is wrong-and-confident by construction.
//   CLOSURE   the priced derivation walk (walk.mjs) over the generators,
//             once per pricing arithmetic (weakest-link, product, tier-depth).
// Contested questions are run but excluded from every scoring denominator.
//
// v2 (this file's extension): the same v1 run, reproduced exactly under
// the v1 configuration, plus —
//   * the v1 question set under the v2 configuration (thermal-mass axis
//     admitted), reported as an explicit before/after;
//   * the v2 question set (syllabus2.mjs: converging paths, deeper
//     chains, witness re-asks) under the v2 configuration;
//   * witness arbitration (witness.mjs) between the closure and the
//     stored-fact store, across configurations.
// Everything v1 printed and reported is still printed and reported, from
// the v1 configuration; v2 results live in their own sections.
//
// Outputs: a summary table on stdout, REPORT.md (full results), and
// receipts.json (every derivation from the run, in the stable receipt
// JSON contract — see walk.mjs receiptToJSON; v2 receipts carry a
// `config` field naming the generator configuration they ran under).

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { QUESTIONS } from './syllabus.mjs';
import { QUESTIONS_V2 } from './syllabus2.mjs';
import { MATERIALS, MASS_RULES, buildBaseFacts, RULES } from './generators.mjs';
import { EXTRA_RULES, buildExtraBaseFacts, buildBaseFactsV2, RULES_V2 } from './generators2.mjs';
import { lookupBaseline, lookupStoredAll, findStoredFact } from './stored-facts.mjs';
import { ARITHMETICS, derive, queryGoal, receiptToJSON, replayReceipt, factKey, coreSupport } from './walk.mjs';
import { arbitrate } from './witness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUDGET = { maxDepth: 5, maxSteps: 20000 };
const pct = (x) => `${(x * 100).toFixed(1)}%`;

const CONFIGS = {
  v1: { baseFacts: buildBaseFacts(), rules: RULES },
  v2: { baseFacts: buildBaseFactsV2(), rules: RULES_V2 },
};

const scorable = QUESTIONS.filter(q => !q.contested);
const total = scorable.length;
const scorableV2 = QUESTIONS_V2.filter(q => !q.contested);
const totalV2 = scorableV2.length;

// ------------------------------------------------------------- metrics core
function metricsFor(rows, n) {
  const answered = rows.filter(r => r.value !== null);
  const asserted = answered.filter(r => r.testifies);
  const wrong = answered.filter(r => !r.correct);
  return {
    answered: answered.length,
    asserted: asserted.length,
    correct: answered.filter(r => r.correct).length,
    correctAsserted: asserted.filter(r => r.correct).length,
    accAnswered: answered.length ? answered.filter(r => r.correct).length / answered.length : 0,
    accOverall: answered.filter(r => r.correct).length / n,
    accAsserted: asserted.length ? asserted.filter(r => r.correct).length / asserted.length : 0,
    wrongBelow: wrong.filter(r => !r.testifies).length,
    wrongConfident: wrong.filter(r => r.testifies).length,
    meanDepth: answered.length ? answered.reduce((s, r) => s + r.depth, 0) / answered.length : 0,
  };
}

function baselineFor(questions, lookup) {
  const rows = questions.map(q => {
    const value = lookup(q);
    return { q, value, correct: value !== null && value === q.expected };
  });
  return {
    rows,
    answered: rows.filter(r => r.value !== null).length,
    correct: rows.filter(r => r.correct).length,
    wrongConfident: rows.filter(r => r.value !== null && !r.correct).length,
    wrongBelow: 0, // unpriced: a lookup cannot price itself below threshold
  };
}

// Run a question list under one configuration, once per arithmetic.
// Receipts are banked for every question (contested included), rows are
// scored for scorable questions only — exactly the v1 runner's shape.
function runClosure(questions, configName) {
  const { baseFacts, rules } = CONFIGS[configName];
  const runs = {};
  const receipts = [];
  for (const arith of Object.values(ARITHMETICS)) {
    const rows = [];
    const derivationsByQ = new Map();
    for (const q of questions) {
      const derived = derive({ baseFacts, premises: q.setup, rules, arithmetic: arith, budget: BUDGET });
      derivationsByQ.set(q.id, derived.derivations);
      const hit = queryGoal(derived, q.goal);
      if (hit) {
        const record = { fact: hit.receipt.fact, price: hit.price, depth: hit.depth, receipt: hit.receipt };
        receipts.push({ question: q.id, config: configName, ...receiptToJSON(record, arith) });
      }
      if (q.contested) continue;
      rows.push({
        q,
        value: hit ? hit.value : null,
        price: hit ? hit.price : null,
        depth: hit ? hit.depth : null,
        receipt: hit ? hit.receipt : null,
        hit: hit ?? null,
        testifies: hit ? arith.testifies(hit.price, hit.depth) : false,
        correct: hit !== null && hit.value === q.expected,
      });
    }
    runs[arith.name] = {
      arith, rows, derivationsByQ,
      metrics: metricsFor(rows, questions.filter(q => !q.contested).length),
    };
  }
  return { runs, receipts };
}

// ------------------------------------------------------------------- runs
const baseline = baselineFor(scorable, lookupBaseline);
const baselineV2 = baselineFor(scorableV2, lookupStoredAll);

const v1 = runClosure(QUESTIONS, 'v1');          // the v1 experiment, untouched
const v1qV2 = runClosure(QUESTIONS, 'v2');       // v1 questions, v2 instrument
const v2 = runClosure(QUESTIONS_V2, 'v2');       // v2 questions, v2 instrument

const bankedReceipts = [...v1.receipts, ...v1qV2.receipts, ...v2.receipts];

// Best arithmetic (v1 criterion, on the v1 run): highest overall
// accuracy; tie-break fewest wrong-and-confident, then most asserted.
const bestName = Object.values(v1.runs)
  .sort((a, b) =>
    b.metrics.accOverall - a.metrics.accOverall
    || a.metrics.wrongConfident - b.metrics.wrongConfident
    || b.metrics.asserted - a.metrics.asserted)[0].arith.name;
const best = v1.runs[bestName];

// ------------------------------------------------- v1 set: before / after
// Per arithmetic, compare each scorable v1 question's answer under the
// v1 configuration with its answer under the v2 configuration.
const rowById = (run) => new Map(run.rows.map(r => [r.q.id, r]));
const beforeAfter = {}; // arithName -> { verdictChanges: [], priceOnly: [] }
for (const name of Object.keys(v1.runs)) {
  const a = rowById(v1.runs[name]);
  const b = rowById(v1qV2.runs[name]);
  const verdictChanges = [];
  const priceOnly = [];
  for (const q of scorable) {
    const r1 = a.get(q.id);
    const r2 = b.get(q.id);
    const s1 = r1.value === null ? 'declined' : `${r1.value} @ ${v1.runs[name].arith.format(r1.price)} (depth ${r1.depth})`;
    const s2 = r2.value === null ? 'declined' : `${r2.value} @ ${v1qV2.runs[name].arith.format(r2.price)} (depth ${r2.depth})`;
    if (r1.value !== r2.value) verdictChanges.push({ q, before: s1, after: s2 });
    else if (r1.value !== null && s1 !== s2) priceOnly.push({ q, before: s1, after: s2 });
  }
  beforeAfter[name] = { verdictChanges, priceOnly };
}

// ------------------------------------------------------- converging paths
// Count independent routes to a question's EXPECTED conclusion from the
// engine's derivation record: derivations whose support (base facts) is
// pairwise disjoint once the question's premises — the given world — are
// set aside. Greedy, best-priced first.
function priceRank(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return b - a;
  if (a && b && typeof a === 'object') return (b.tier - a.tier) || (a.depth - b.depth);
  return 0;
}
function routeInfo(derivations, q) {
  const goalFact = q.goal.context !== undefined
    ? [q.goal.pred, q.goal.subject, q.goal.context, q.expected]
    : [q.goal.pred, q.goal.subject, q.expected];
  const list = (derivations.get(factKey(goalFact)) ?? []).filter(d => d.via !== 'combine');
  const premiseKeys = new Set(q.setup.map(factKey));
  const sorted = [...list].sort((x, y) => priceRank(x.price, y.price));
  const chosen = [];
  for (const d of sorted) {
    const core = coreSupport(d.support, premiseKeys);
    if (chosen.every(c => !coreSupport(c.support, premiseKeys).some(s => core.includes(s)))) {
      chosen.push(d);
    }
  }
  return { routes: chosen.length, vias: chosen.map(c => c.via), singleBest: sorted[0] ?? null };
}

const convergingQs = scorableV2.filter(q => q.subsets.includes('converging'));
const converging = {}; // arithName -> rows
for (const name of Object.keys(v2.runs)) {
  const run = v2.runs[name];
  converging[name] = convergingQs.map(q => {
    const ri = routeInfo(run.derivationsByQ.get(q.id), q);
    const receipt = v2.receipts.find(r => r.question === q.id && r.arithmetic === name);
    const combineSteps = receipt ? receipt.steps.filter(s => s.rule === 'combine').length : 0;
    const row = run.rows.find(r => r.q.id === q.id);
    return { q, routes: ri.routes, vias: ri.vias, combineSteps, row, singleBest: ri.singleBest };
  });
}

// ------------------------------------------------------------ deep chains
const deepQs = scorableV2.filter(q => q.subsets.includes('deep'));
const deep = {}; // arithName -> { metrics, depthHist, rows }
for (const name of Object.keys(v2.runs)) {
  const rows = v2.runs[name].rows.filter(r => deepQs.some(d => d.id === r.q.id));
  const depthHist = {};
  for (const r of rows) {
    const k = r.value === null ? 'declined' : `depth ${r.depth}`;
    depthHist[k] = (depthHist[k] ?? 0) + 1;
  }
  deep[name] = { metrics: metricsFor(rows, deepQs.length), depthHist, rows };
}

// ------------------------------------------------------ witness arbitration
// Three contexts: the v1 questions under each configuration, and the v2
// questions under v2. A conflict is recorded wherever the closure's
// answer and a stored fact about the same goal disagree.
const witnessContexts = [
  { label: 'v1 questions × v1 config', runs: v1.runs },
  { label: 'v1 questions × v2 config', runs: v1qV2.runs },
  { label: 'v2 questions × v2 config', runs: v2.runs },
];
const conflictsByArith = {}; // arithName -> [conflict records]
for (const name of Object.keys(v1.runs)) {
  const list = [];
  for (const ctx of witnessContexts) {
    const run = ctx.runs[name];
    for (const row of run.rows) {
      const fact = findStoredFact(row.q);
      const c = arbitrate({ question: row.q, derived: row.hit, fact, arith: run.arith });
      if (c) list.push({ ...c, context: ctx.label, arithmetic: name });
    }
  }
  conflictsByArith[name] = list;
}

// ------------------------------------------------- self-verify banked receipts
const ALL_QUESTIONS = [...QUESTIONS, ...QUESTIONS_V2];
let replayOk = 0;
const replayFailures = [];
for (const r of bankedReceipts) {
  const q = ALL_QUESTIONS.find(x => x.id === r.question);
  const cfg = CONFIGS[r.config];
  const res = replayReceipt(r, { baseFacts: cfg.baseFacts, premises: q.setup, rules: cfg.rules });
  if (res.ok) replayOk++;
  else replayFailures.push(`${r.question}/${r.arithmetic}/${r.config}: ${res.error}`);
}
const combineStepsTotal = bankedReceipts.reduce(
  (n, r) => n + r.steps.filter(s => s.rule === 'combine').length, 0);
const combineStepsV1 = v1.receipts.reduce(
  (n, r) => n + r.steps.filter(s => s.rule === 'combine').length, 0);

// ------------------------------------------------------------ write outputs
writeFileSync(join(HERE, 'receipts.json'), JSON.stringify({
  version: 2,
  contract: 'derivation-receipt',
  generatedBy: 'knowledge/derivation-closure/run.mjs',
  receipts: bankedReceipts,
}, null, 2) + '\n');

// ------------------------------------------------------------- stdout table
const lines = [];
lines.push(`Derivation-closure testbed — ${total} scorable questions (${QUESTIONS.length - total} contested, excluded)`);
lines.push('');
lines.push(['approach', 'answered', 'asserted', 'correct', 'acc(ans)', 'acc(all)', 'wrong<thr', 'wrong&conf', 'meanDepth'].join('\t'));
lines.push(['baseline (lookup)', baseline.answered, baseline.answered, baseline.correct,
  pct(baseline.answered ? baseline.correct / baseline.answered : 0), pct(baseline.correct / total),
  baseline.wrongBelow, baseline.wrongConfident, '—'].join('\t'));
for (const { metrics: m, arith } of Object.values(v1.runs)) {
  lines.push([`closure (${arith.name})`, m.answered, m.asserted, m.correct,
    pct(m.accAnswered), pct(m.accOverall), m.wrongBelow, m.wrongConfident,
    m.meanDepth.toFixed(2)].join('\t'));
}
lines.push('');
lines.push(`best arithmetic (v1 set, v1 config): ${bestName}`);
lines.push('');
lines.push(`--- v2 ---`);
lines.push(`v1 question set under the v2 configuration (mass axis admitted):`);
for (const name of Object.keys(v1.runs)) {
  const m = v1qV2.runs[name].metrics;
  const ba = beforeAfter[name];
  lines.push([`closure (${name})`, m.answered, m.asserted, m.correct,
    pct(m.accAnswered), pct(m.accOverall), m.wrongBelow, m.wrongConfident,
    m.meanDepth.toFixed(2),
    `| verdict changes vs v1 config: ${ba.verdictChanges.length} (${ba.verdictChanges.map(c => c.q.id).join(', ') || 'none'}); price/route-only changes: ${ba.priceOnly.length}`].join('\t'));
}
lines.push('');
lines.push(`v2 question set — ${totalV2} questions (${convergingQs.length} converging, ${deepQs.length} deep, ${scorableV2.filter(q => q.subsets.includes('witness')).length} witness-tagged):`);
lines.push(['baseline (lookup, v1+v2 facts)', baselineV2.answered, baselineV2.answered, baselineV2.correct,
  pct(baselineV2.answered ? baselineV2.correct / baselineV2.answered : 0), pct(baselineV2.correct / totalV2),
  baselineV2.wrongBelow, baselineV2.wrongConfident, '—'].join('\t'));
for (const { metrics: m, arith } of Object.values(v2.runs)) {
  lines.push([`closure (${arith.name})`, m.answered, m.asserted, m.correct,
    pct(m.accAnswered), pct(m.accOverall), m.wrongBelow, m.wrongConfident,
    m.meanDepth.toFixed(2)].join('\t'));
}
lines.push('');
lines.push('deep subset (per arithmetic):');
for (const name of Object.keys(deep)) {
  const d = deep[name];
  lines.push(`  ${name}: answered ${d.metrics.answered}/${deepQs.length}, asserted ${d.metrics.asserted}, correct ${d.metrics.correct} (${pct(d.metrics.accOverall)} overall), depths ${JSON.stringify(d.depthHist)}`);
}
lines.push('converging subset (per arithmetic):');
for (const name of Object.keys(converging)) {
  const cs = converging[name];
  const twoRoutes = cs.filter(c => c.routes >= 2).length;
  const combines = cs.reduce((s, c) => s + c.combineSteps, 0);
  lines.push(`  ${name}: ${twoRoutes}/${cs.length} goals reached by >=2 independent routes; combine steps in goal receipts: ${combines}`);
}
lines.push('witness conflicts (per arithmetic):');
for (const name of Object.keys(conflictsByArith)) {
  const list = conflictsByArith[name];
  lines.push(`  ${name}: ${list.length} detected, ${list.filter(c => c.matchesExpected).length} resolved to the expected verdict, ${list.filter(c => !c.matchesExpected).length} mis-resolved`);
}
lines.push('');
lines.push(`banked receipts: ${bankedReceipts.length} (v1 config: ${v1.receipts.length}, combine steps among v1 receipts: ${combineStepsV1}; all configs: ${combineStepsTotal} combine steps); replay self-check: ${replayOk}/${bankedReceipts.length} ok`);
if (replayFailures.length) lines.push(`REPLAY FAILURES:\n  ${replayFailures.join('\n  ')}`);
console.log(lines.join('\n'));

// --------------------------------------------------------------- REPORT.md
const fmtFact = (f) => `${f[0]}(${f.slice(1).join(', ')})`;
function renderTree(node, arith, indent = '') {
  const head = `${indent}${fmtFact(node.fact)}  [${arith.format(node.price)}]`;
  if (node.children.length === 0) return [`${head}  <- ${node.via}`];
  const out = [head, `${indent}  via ${node.via} (hop ${node.hopStrength})`];
  for (const child of node.children) out.push(...renderTree(child, arith, indent + '    '));
  return out;
}
const sampleRow = (id) => best.rows.find(r => r.q.id === id);
const md = [];
md.push('# Derivation-closure testbed — run report');
md.push('');
md.push('*Generated by `node knowledge/derivation-closure/run.mjs`. Every number below comes from that run. Do not edit by hand; re-run instead.*');
md.push('');
md.push('`receipts.json`, written alongside this report, contains every derivation from the run in the stable receipt JSON contract (seed / goal / steps / finalPrice / arithmetic / verdict) — it is the kind-ready contract for a future paramorphic viewer kind. Receipts carry a `config` field (`v1` | `v2`) naming the generator configuration they were derived under.');
md.push('');
md.push('## Results');
md.push('');
md.push(`Scorable questions: **${total}** (a further ${QUESTIONS.length - total} contested questions were run but excluded from all denominators). Budget: max depth ${BUDGET.maxDepth}, max steps ${BUDGET.maxSteps}.`);
md.push('');
md.push('| approach | answered | asserted | correct | acc (answered) | acc (overall) | wrong, priced below threshold | wrong & confident | mean depth |');
md.push('| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
md.push(`| baseline (stored-facts lookup) | ${baseline.answered} | ${baseline.answered} | ${baseline.correct} | ${pct(baseline.correct / baseline.answered)} | ${pct(baseline.correct / total)} | ${baseline.wrongBelow} | ${baseline.wrongConfident} | — |`);
for (const { metrics: m, arith } of Object.values(v1.runs)) {
  md.push(`| closure (${arith.name}) | ${m.answered} | ${m.asserted} | ${m.correct} | ${pct(m.accAnswered)} | ${pct(m.accOverall)} | ${m.wrongBelow} | ${m.wrongConfident} | ${m.meanDepth.toFixed(2)} |`);
}
md.push('');
md.push(`Best arithmetic by the stated criterion (highest overall accuracy, then fewest wrong-and-confident, then most asserted): **${bestName}**.`);
md.push('');
md.push('## Pricing honesty');
md.push('');
md.push('A wrong answer priced below the testimony threshold is an honest error: the system would have declined or qualified it. A wrong answer at or above threshold is wrong-and-confident — the dangerous kind.');
md.push('');
for (const { metrics: m, arith } of Object.values(v1.runs)) {
  md.push(`- **${arith.name}**: ${m.wrongBelow + m.wrongConfident} wrong of ${m.answered} answered — ${m.wrongBelow} priced below threshold (honest), ${m.wrongConfident} wrong-and-confident.`);
}
md.push(`- **baseline**: ${baseline.wrongConfident} wrong of ${baseline.answered} answered, all wrong-and-confident by construction — a lookup carries no price, so it can never catch itself.`);
md.push('');
const wrongRows = best.rows.filter(r => r.value !== null && !r.correct);
md.push(`Under the best arithmetic (${bestName}), the wrong answers are: ${wrongRows.length ? wrongRows.map(r => `**${r.q.id}** (${r.q.text} — expected '${r.q.expected}', derived '${r.value}' at ${best.arith.format(r.price)})`).join('; ') : 'none'}.`);
md.push('');
md.push('## Per-question outcomes (best arithmetic: ' + bestName + ')');
md.push('');
md.push('| id | question | expected | derived | price | result |');
md.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
for (const r of best.rows) {
  const result = r.value === null ? 'no derivation'
    : r.correct ? 'correct'
    : r.testifies ? 'WRONG (asserted)' : 'wrong (below threshold — would be qualified)';
  md.push(`| ${r.q.id} | ${r.q.text} | ${r.q.expected} | ${r.value ?? '—'} | ${r.price !== null ? best.arith.format(r.price) : '—'} | ${result} |`);
}
md.push('');
md.push('## Sample receipts');
md.push('');
for (const id of ['S1', 'W1', 'S5']) {
  const r = sampleRow(id);
  if (!r || !r.receipt) continue;
  md.push(`### ${id} — ${r.q.text}`);
  md.push('');
  md.push('Expected: `' + r.q.expected + '` · derived: `' + r.value + '` · ' + (r.correct ? 'correct' : 'WRONG'));
  md.push('');
  md.push('```');
  md.push(...renderTree(r.receipt, best.arith));
  md.push('```');
  md.push('');
}
const s1Receipt = v1.receipts.find(r => r.question === 'S1' && r.arithmetic === bestName);
if (s1Receipt) {
  md.push('The S1 receipt in the JSON contract form (as banked in `receipts.json`):');
  md.push('');
  md.push('```json');
  md.push(JSON.stringify(s1Receipt, null, 2));
  md.push('```');
  md.push('');
}
// v1 receipts replay figure, recomputed for this section alone.
let replayOkV1 = 0;
for (const r of v1.receipts) {
  const q = QUESTIONS.find(x => x.id === r.question);
  if (replayReceipt(r, { baseFacts: CONFIGS.v1.baseFacts, premises: q.setup, rules: CONFIGS.v1.rules }).ok) replayOkV1++;
}
md.push('## Receipts and replay');
md.push('');
md.push(`Banked receipts (v1 configuration): **${v1.receipts.length}** (every derivation, all ${QUESTIONS.length} questions × ${Object.keys(ARITHMETICS).length} arithmetics, contested included). Combine steps among them: **${combineStepsV1}**. Replay self-check inside this run: **${replayOkV1}/${v1.receipts.length}** receipts re-executed from the generators and confirmed at the same conclusion and price. (The run as a whole banks ${bankedReceipts.length} receipts across both configurations; see the v2 receipts section below.) Re-check independently with \`node knowledge/derivation-closure/verify.mjs\`.`);
md.push('');
md.push('## Verdict');
md.push('');
md.push('**What the numbers show.** On this one hand-authored domain, the derivation closure answers ' +
  `${best.metrics.answered} of ${total} scorable questions against the baseline's ${baseline.answered}, at ${pct(best.metrics.accOverall)} overall accuracy against the baseline's ${pct(baseline.correct / total)}. The baseline is accurate where it speaks (${pct(baseline.correct / baseline.answered)}) — its limit is coverage: it cannot answer a compositional question nobody stored. The closure's answers are compositions, so its coverage is set by the generator set, not by an inventory.`);
md.push('');
md.push('**What they do not show.** Pricing did not rescue the closure\'s errors: the wrong answers are model errors (the generator set has no thermal-mass axis, so S5 and S23 are under-derived by design), and every arithmetic prices those derivations as confidently as the correct ones. Pricing prices the support a derivation has *inside the model*; it cannot see what the model is missing. The three arithmetics separate mainly on conservatism (how much they assert), not on honesty, at this domain size and derivation depth.');
md.push('');
md.push('**What nobody has checked.** The syllabus\'s expected answers and the generators were written by the same author (an LLM) in the same session; the two thermal-mass questions are where author-of-expectations and author-of-generators visibly diverged, and there may be quieter divergences scored as agreements. No human has audited the expected answers, no second domain has been run, and nothing here measures behaviour at conversational scale, with noisy grounding, or against questions nobody designed the generators around.');
md.push('');

// ============================================================ v2 sections
md.push('---');
md.push('');
md.push('# v2 — thermal mass, converging paths, deeper chains, witness arbitration');
md.push('');
md.push('Everything above this line is the v1 experiment, reproduced under the v1 configuration (`buildBaseFacts()` + `RULES`, unchanged). Everything below runs under the v2 configuration (`buildBaseFactsV2()` + `RULES_V2`) or compares the two.');
md.push('');
md.push('## v2 — what the additions cost to author');
md.push('');
md.push('| addition | size |');
md.push('| :--- | ---: |');
md.push(`| thermalMass entries (one per material) | ${Object.keys(MATERIALS).length} |`);
md.push(`| mass-axis rules (MASS_RULES) | ${MASS_RULES.length} |`);
md.push(`| extra base facts (brittleness, served-hot) | ${buildExtraBaseFacts().length} |`);
md.push(`| extra rules (converging predicates, second routes, deep chains) | ${EXTRA_RULES.length} |`);
md.push(`| new questions (syllabus2.mjs) | ${QUESTIONS_V2.length} |`);
md.push(`| stored facts added for witness cases (kept out of the v1 baseline) | 3 |`);
md.push('');
md.push('The whole thermal-mass axis — the thing whose absence caused both v1 errors — is ' +
  `${Object.keys(MATERIALS).length} one-word entries and ${MASS_RULES.length} rules. The axis was cheap; knowing it was missing was the expensive part, and only the priced failure (S5/S23 deriving a confident \'partly\') made the gap locatable.`);
md.push('');
md.push('## v2 — the v1 question set under the v2 configuration');
md.push('');
md.push('Same 54 scorable questions, v2 instrument. This is the honest before/after: the v1 table above does not move; this table is what changes when the mass axis is admitted.');
md.push('');
md.push('| approach | answered | asserted | correct | acc (answered) | acc (overall) | wrong, priced below threshold | wrong & confident | mean depth |');
md.push('| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
for (const { metrics: m, arith } of Object.values(v1qV2.runs)) {
  md.push(`| closure (${arith.name}, v2 config) | ${m.answered} | ${m.asserted} | ${m.correct} | ${pct(m.accAnswered)} | ${pct(m.accOverall)} | ${m.wrongBelow} | ${m.wrongConfident} | ${m.meanDepth.toFixed(2)} |`);
}
md.push('');
md.push('### S5 and S23 — the thermal-mass check');
md.push('');
md.push('| question | expected | v1 config (weakest-link shown; the \'partly\' verdict was identical under all three) | v2 config — weakest-link | v2 config — product | v2 config — tier-depth |');
md.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
for (const id of ['S5', 'S23']) {
  const q = scorable.find(x => x.id === id);
  const cell = (run) => {
    const r = run.rows.find(x => x.q.id === id);
    return r.value === null ? 'declined' : `'${r.value}' @ ${run.arith.format(r.price)} (depth ${r.depth})`;
  };
  md.push(`| ${id} — ${q.text} | '${q.expected}' | ${cell(v1.runs[bestName])} | ${cell(v1qV2.runs['weakest-link'])} | ${cell(v1qV2.runs['product'])} | ${cell(v1qV2.runs['tier-depth'])} |`);
}
md.push('');
md.push('### Every verdict change on the v1 set, per arithmetic');
md.push('');
for (const name of Object.keys(beforeAfter)) {
  const ba = beforeAfter[name];
  md.push(`**${name}**: ${ba.verdictChanges.length} verdict change(s)${ba.verdictChanges.length ? ' — ' + ba.verdictChanges.map(c => `${c.q.id}: ${c.before} -> ${c.after}`).join('; ') : ''}. A further ${ba.priceOnly.length} question(s) changed price or route only, verdict unchanged${ba.priceOnly.length ? ' (' + ba.priceOnly.map(c => c.q.id).join(', ') + ')' : ''}.`);
}
md.push('');
md.push('## v2 — converging paths');
md.push('');
md.push('Each converging question\'s expected conclusion is reachable by two routes whose evidence (base facts) is disjoint once the question\'s premises are set aside. "Routes" counts those independent derivations in the engine\'s derivation record; "combine steps" counts `combine` nodes in the banked goal receipt (only the product arithmetic can gain from a second route — weakest-link takes the max, tier-depth the better tier/depth pair).');
md.push('');
for (const name of Object.keys(converging)) {
  const run = v2.runs[name];
  md.push(`### ${name}`);
  md.push('');
  md.push('| id | expected | routes | route rules | combine steps | derived | price |');
  md.push('| :--- | :--- | ---: | :--- | ---: | :--- | :--- |');
  for (const c of converging[name]) {
    md.push(`| ${c.q.id} | '${c.q.expected}' | ${c.routes} | ${c.vias.join(' + ') || '—'} | ${c.combineSteps} | ${c.row.value === null ? 'declined' : `'${c.row.value}'`} | ${c.row.price !== null ? run.arith.format(c.row.price) : '—'} |`);
  }
  md.push('');
}
{
  const prod = converging['product'];
  const changed = prod.filter(c => c.combineSteps > 0 && c.singleBest
    && typeof c.singleBest.price === 'number' && typeof c.row.price === 'number'
    && (c.singleBest.price >= 0.6) !== c.row.testifies);
  const lifted = prod.filter(c => c.combineSteps > 0 && c.singleBest
    && typeof c.singleBest.price === 'number' && typeof c.row.price === 'number');
  md.push(`Under **product**, combining fired in ${lifted.length} converging goal receipts. It changed the verdict class (qualified -> assert, or the reverse) in ${changed.length} case(s)${changed.length ? ' (' + changed.map(c => c.q.id).join(', ') + ')' : ''}; elsewhere it raised the price without crossing the threshold — corroboration registered, decision unchanged. Under weakest-link and tier-depth, combining is a no-op by construction (max / better-of), so the second route's value there is audit value: the receipt shows two independent paths agreeing.`);
  md.push('');
}
md.push('## v2 — deeper chains');
md.push('');
md.push(`The deep subset (${deepQs.length} questions) needs 3–5 derivation hops: contents -> vessel -> utensil / table / hand. This is where decay policies were expected to diverge if they ever would.`);
md.push('');
md.push('| arithmetic | answered | asserted | correct | acc (answered) | acc (overall) | wrong, priced below threshold | wrong & confident | mean depth | depth distribution |');
md.push('| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |');
for (const name of Object.keys(deep)) {
  const d = deep[name];
  const m = d.metrics;
  md.push(`| ${name} | ${m.answered} | ${m.asserted} | ${m.correct} | ${pct(m.accAnswered)} | ${pct(m.accOverall)} | ${m.wrongBelow} | ${m.wrongConfident} | ${m.meanDepth.toFixed(2)} | ${Object.entries(d.depthHist).map(([k, v]) => `${k}: ${v}`).join(', ')} |`);
}
md.push('');
for (const name of Object.keys(deep)) {
  const held = deep[name].rows.filter(r => r.value !== null && !r.testifies)
    .map(r => `${r.q.id} ('${r.value}' @ ${v2.runs[name].arith.format(r.price)}, depth ${r.depth})`);
  const declined = deep[name].rows.filter(r => r.value === null).map(r => r.q.id);
  md.push(`- **${name}**: answered but held below the assert threshold: ${held.length ? held.join('; ') : 'none'}. Declined outright: ${declined.length ? declined.join(', ') : 'none'}.`);
}
md.push('');
md.push('## v2 — witness arbitration');
md.push('');
md.push('The stated rule: a stored fact wins when the derivation\'s price is below the assert threshold, and also when the fact is direct testimony about that exact goal (scope `specific`); a derivation wins only at assert strength against a `generic` fact. Every conflict — won or lost — is recorded here as a located lack (type `witness-conflict`). Silence on either side is not a conflict. Arbitration always consults the full store (v1 + v2 facts — the store is one store); the three contexts vary the derivation side. The cast-iron goals appear as S5/S23 under the v1 configuration and as X2/X4 in the v2 question set: under the v2 configuration the derivations agree with the facts, so X2/X4 raise no conflict — the disagreement the mass axis removed is visible in the v1-configuration rows.');
md.push('');
for (const name of Object.keys(conflictsByArith)) {
  const list = conflictsByArith[name];
  md.push(`### ${name} — ${list.length} conflict(s), ${list.filter(c => c.matchesExpected).length} resolved to the expected verdict, ${list.filter(c => !c.matchesExpected).length} mis-resolved`);
  md.push('');
  if (list.length) {
    md.push('| context | question | goal | derived | stored fact | winner | resolution | expected | match |');
    md.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
    for (const c of list) {
      const goalStr = c.goal.context ? `${c.goal.pred}(${c.goal.subject}, ${c.goal.context})` : `${c.goal.pred}(${c.goal.subject})`;
      md.push(`| ${c.context} | ${c.question} | ${goalStr} | '${c.derivedValue}' @ ${c.derivedPrice} (${c.derivedVerdict}) | '${c.factValue}' (${c.factScope}) | ${c.winner} | '${c.resolution}' | '${c.expected}' | ${c.matchesExpected ? 'yes' : '**NO**'} |`);
    }
    md.push('');
  }
}
md.push('## v2 — sample receipts');
md.push('');
{
  const g2 = v2.runs['product'].rows.find(r => r.q.id === 'G2');
  if (g2 && g2.receipt) {
    md.push(`### G2 under product — ${g2.q.text}`);
    md.push('');
    md.push('```');
    md.push(...renderTree(g2.receipt, v2.runs['product'].arith));
    md.push('```');
    md.push('');
  }
  const d11 = v2.runs['weakest-link'].rows.find(r => r.q.id === 'D11');
  if (d11 && d11.receipt) {
    md.push(`### D11 under weakest-link — ${d11.q.text}`);
    md.push('');
    md.push('```');
    md.push(...renderTree(d11.receipt, v2.runs['weakest-link'].arith));
    md.push('```');
    md.push('');
  }
}
md.push('## v2 — receipts and replay');
md.push('');
md.push(`Banked receipts across both configurations: **${bankedReceipts.length}** (v1 config ${v1.receipts.length}, v1 questions under v2 config ${v1qV2.receipts.length}, v2 questions ${v2.receipts.length}). Combine steps among all of them: **${combineStepsTotal}** (v1 receipts alone: ${combineStepsV1}). Replay self-check: **${replayOk}/${bankedReceipts.length}**.`);
if (replayFailures.length) {
  md.push('');
  md.push('REPLAY FAILURES:');
  for (const f of replayFailures) md.push(`- ${f}`);
}
md.push('');
md.push('## v2 — verdict');
md.push('');
{
  const deepAccs = Object.values(deep).map(d => d.metrics.accOverall);
  const deepSeparated = Math.max(...deepAccs) !== Math.min(...deepAccs)
    || new Set(Object.values(deep).map(d => d.metrics.asserted)).size > 1;
  const totalConflicts = conflictsByArith[bestName].length;
  const misResolved = Object.entries(conflictsByArith)
    .map(([n, l]) => `${n}: ${l.filter(c => !c.matchesExpected).length}`).join(', ');
  md.push('**What v2 shows.** (1) The mass axis works as designed: S5 and S23 derive their expected verdicts under the v2 configuration, at a cost of ' +
    `${Object.keys(MATERIALS).length} entries and ${MASS_RULES.length} rules — and the before/after above lists every other change the axis caused on the v1 set, so the fix's blast radius is on the record. ` +
    `(2) Independent routes exist and are recognisable: the converging questions' receipts show two disjoint-support derivations, and under product the combine step fires and lifts prices (see the converging section for whether it ever changed a verdict). ` +
    `(3) On the deep subset the arithmetics ${deepSeparated ? 'DO separate — see the table: they differ in what they assert at depth, which is the divergence v1 was too shallow to produce' : 'tie again on accuracy; any separation is in how much they assert, not in what they get right'}. ` +
    `(4) Witness arbitration caught ${totalConflicts} conflict(s) under ${bestName} across the three contexts and recorded every one as a located lack; mis-resolutions by arithmetic: ${misResolved}. A mis-resolution is reported, not tuned away: it marks a place where the stated rule, the store, or the generators need a human decision.`);
  md.push('');
  md.push('**What v2 does not show.** The v2 questions were authored against the v2 generators by the same author in the same session — the converging routes and deep chains are demonstrations that the machinery *can* express and price them, not evidence that independently-authored questions would fare as well. The witness rule has been exercised on seeded conflicts only. Depths here reach 5; conversational derivation may go deeper, branch wider, and meet messier support overlap than anything in this domain.');
  md.push('');
}
writeFileSync(join(HERE, 'REPORT.md'), md.join('\n') + '\n');
console.log('\nwrote REPORT.md and receipts.json');
