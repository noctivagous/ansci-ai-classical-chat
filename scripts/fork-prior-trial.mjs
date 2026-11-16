#!/usr/bin/env node
/**
 * fork-prior-trial.mjs — the elemental domain-prior trial (repair
 * programme Part C.2 stage 1 failure test; registry entry H8).
 *
 * At stage 1 this trial was NOT RUNNABLE: the predictor
 * (predictSignatureShape) needs each verb's semantic element and the
 * system produced none for verbs. Slice 4 registered VERB_DOMAIN_V1
 * (framenet-lex.ts: verbClassification), a WordNet-side rule that
 * classifies verbs from the process vocabulary of their own synset
 * glosses — no FrameNet data — which makes the trial runnable.
 *
 * PROTOCOL (declared before the run; the authored account is
 * docs/fork/verb-classification-trial.md):
 *  - Arms. PRIOR: predictSignatureShape — the modal signature shape
 *    among seen inventory verbs classified with the target verb's
 *    element (global modal shape when the verb does not classify).
 *    BASELINE (FrameNet-only): the global modal shape over the same
 *    inventory — FrameNet evidence only, no elemental information.
 *  - Ground truth: the target verb's own FrameNet signature shape,
 *    read with the holdout cleared.
 *  - Headline metric: EXACT shape match — agent flag equal, slot
 *    list equal, prep slot equal. Partial credit (secondary): the
 *    fraction of components matched, components being the agent
 *    flag, each slot in the union of the two slot sets, and the
 *    prep slot.
 *  - Verdict rule (from C.2): the prior FAILS if the baseline
 *    matches or beats it on the headline metric.
 *  - Populations. PRIMARY: the recorded stage-1 held-out set
 *    (teach, fill, sing, paint), withheld as a group via
 *    setHeldOutLemmas, exactly the stage-1 protocol. SECONDARY:
 *    leave-one-out over the 12 valency-challenge verbs. SUPPORTING:
 *    leave-one-out over every inventory verb the classification
 *    reaches (either source).
 *
 * Writes docs/fork/prior-trial-results.md. Run: npm run fork:prior-trial
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enableWordnetLexicon, climbClassification } from "../dist/src/fork/wordnet-lex.js";
import {
  frameSignature, setHeldOutLemmas, signatureInventory,
  predictSignatureShape, shapeOf, verbClassification,
} from "../dist/src/fork/framenet-lex.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HELD_OUT = ["teach", "fill", "sing", "paint"];
const CHALLENGE = ["bake", "send", "carry", "build", "wash", "push", "pull", "show", ...HELD_OUT];
const pct = (x) => `${(x * 100).toFixed(1)}%`;

enableWordnetLexicon(true);

const shapeKey = (s) => [s.agent ? "agent" : "noagent", ...s.slots, s.prepSlot ? `@${s.prepSlot}` : ""].join("+");
const shapeLabel = (s) => [s.agent ? "agent" : "no-agent", ...s.slots, s.prepSlot ? `@${s.prepSlot}` : null].filter(Boolean).join(" + ") || "(bare)";

function globalModalShape(inventory) {
  const counts = new Map();
  for (const sig of inventory) {
    const shape = shapeOf(sig);
    const k = shapeKey(shape);
    const entry = counts.get(k) ?? { shape, n: 0 };
    entry.n += 1;
    counts.set(k, entry);
  }
  return [...counts.values()].sort((a, b) => b.n - a.n || shapeKey(a.shape).localeCompare(shapeKey(b.shape)))[0]?.shape;
}

function exactMatch(a, b) {
  return a.agent === b.agent
    && a.slots.length === b.slots.length
    && a.slots.every((s, i) => s === b.slots[i])
    && (a.prepSlot ?? null) === (b.prepSlot ?? null);
}

function partialCredit(a, b) {
  const union = [...new Set([...a.slots, ...b.slots])];
  const components = ["agent", ...union.map((s) => `slot:${s}`), "prep"];
  let matched = 0;
  if (a.agent === b.agent) matched += 1;
  for (const s of union) if (a.slots.includes(s) && b.slots.includes(s)) matched += 1;
  if ((a.prepSlot ?? null) === (b.prepSlot ?? null)) matched += 1;
  return matched / components.length;
}

function elementSource(lemma) {
  const climb = climbClassification(lemma);
  if (climb) return { element: climb.element, source: "table/climb" };
  const vc = verbClassification(lemma);
  if (vc) return { element: vc.element, source: "VERB_DOMAIN_V1", detail: vc };
  return { element: undefined, source: "—" };
}

function summarise(rows) {
  const scored = rows.filter((r) => !r.missing);
  const sum = (f) => scored.reduce((s, r) => s + f(r), 0);
  return {
    rows,
    n: scored.length,
    priorExact: sum((r) => (r.priorExact ? 1 : 0)),
    baselineExact: sum((r) => (r.baselineExact ? 1 : 0)),
    priorPartial: scored.length ? sum((r) => r.priorPartial) / scored.length : 0,
    baselinePartial: scored.length ? sum((r) => r.baselinePartial) / scored.length : 0,
  };
}

function scoreRow(verb, inventory, truth) {
  const pred = predictSignatureShape(verb, inventory);
  const baselineShape = globalModalShape(inventory);
  const src = elementSource(verb);
  return {
    verb, element: pred.element, source: src.source,
    hits: src.detail ? src.detail.hits.join(", ") : "",
    confidence: src.detail ? src.detail.confidence : undefined,
    basis: pred.basis, priorShape: pred.shape, baselineShape, truth,
    priorExact: exactMatch(pred.shape, truth),
    baselineExact: exactMatch(baselineShape, truth),
    priorPartial: partialCredit(pred.shape, truth),
    baselinePartial: partialCredit(baselineShape, truth),
  };
}

/* ---- PRIMARY: the recorded held-out set, stage-1 protocol ---- */
setHeldOutLemmas(HELD_OUT);
const primaryInventory = signatureInventory();
const primaryPreds = HELD_OUT.map((verb) => ({ verb, pred: predictSignatureShape(verb, primaryInventory) }));
const primaryBaseline = globalModalShape(primaryInventory);
setHeldOutLemmas([]);
const primaryRows = primaryPreds.map(({ verb, pred }) => {
  const truth = shapeOf(frameSignature(verb));
  const src = elementSource(verb);
  return {
    verb, element: pred.element, source: src.source,
    hits: src.detail ? src.detail.hits.join(", ") : "",
    confidence: src.detail ? src.detail.confidence : undefined,
    basis: pred.basis, priorShape: pred.shape, baselineShape: primaryBaseline, truth,
    priorExact: exactMatch(pred.shape, truth),
    baselineExact: exactMatch(primaryBaseline, truth),
    priorPartial: partialCredit(pred.shape, truth),
    baselinePartial: partialCredit(primaryBaseline, truth),
  };
});
const primary = {
  rows: primaryRows, n: primaryRows.length,
  priorExact: primaryRows.filter((r) => r.priorExact).length,
  baselineExact: primaryRows.filter((r) => r.baselineExact).length,
  priorPartial: primaryRows.reduce((s, r) => s + r.priorPartial, 0) / primaryRows.length,
  baselinePartial: primaryRows.reduce((s, r) => s + r.baselinePartial, 0) / primaryRows.length,
};

/* ---- SECONDARY + SUPPORTING: leave-one-out over a full inventory ---- */
const fullInventory = signatureInventory();
const byLemma = new Map(fullInventory.map((s) => [s.lemma, s]));
function looRun(units) {
  const rows = [];
  for (const verb of units) {
    const sig = byLemma.get(verb);
    if (!sig) { rows.push({ verb, missing: true }); continue; }
    const inventory = fullInventory.filter((s) => s.lemma !== verb);
    rows.push(scoreRow(verb, inventory, shapeOf(sig)));
  }
  return summarise(rows);
}
const secondary = looRun(CHALLENGE);
const classifiedUnits = fullInventory
  .map((s) => s.lemma)
  .filter((lemma) => elementSource(lemma).element !== undefined);
const supporting = looRun(classifiedUnits);

/* ---- Coverage ---- */
const coverageByElement = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
let classifiedCount = 0;
for (const sig of fullInventory) {
  const src = elementSource(sig.lemma);
  if (src.element) { classifiedCount += 1; coverageByElement[src.element] += 1; }
}

/* ---- Verdict (predeclared rule) ---- */
const verdict = primary.priorExact > primary.baselineExact
  ? `PRIOR BEATS BASELINE on the headline metric (${primary.priorExact}/${primary.n} vs ${primary.baselineExact}/${primary.n} exact) — the C.2 failure test is NOT triggered on the primary set.`
  : `PRIOR FAILS the C.2 failure test on the primary set: baseline exact ${primary.baselineExact}/${primary.n} matches or beats prior exact ${primary.priorExact}/${primary.n}. The prior is adopted nowhere.`;

/* ---- Report ---- */
const rowLine = (r) => r.missing
  ? `| ${r.verb} | — | — | (no signature) | — | — | — | — |`
  : `| ${r.verb} | ${r.element ?? "—"} (${r.source}) | ${shapeLabel(r.truth)} | ${shapeLabel(r.priorShape)} | ${r.priorExact ? "MATCH" : "miss"} | ${shapeLabel(r.baselineShape)} | ${r.baselineExact ? "MATCH" : "miss"} | ${r.priorPartial.toFixed(2)} / ${r.baselinePartial.toFixed(2)} |`;

const report = `# Prior trial results (generated)

Generated by \`npm run fork:prior-trial\` on ${new Date().toISOString().slice(0, 10)}.
Protocol and metric are declared in the runner's header and in
docs/fork/verb-classification-trial.md (authored account).
Classification rule: VERB_DOMAIN_V1 (framenet-lex.ts), provenance
"verb-domain-derived"; the noun climb contributes where it reaches.

## Coverage

Inventory verbs (FrameNet signature inventory): ${fullInventory.length}.
Classified by either source: ${classifiedCount} (${pct(classifiedCount / fullInventory.length)}) —
Wood ${coverageByElement.Wood}, Fire ${coverageByElement.Fire},
Earth ${coverageByElement.Earth}, Metal ${coverageByElement.Metal},
Water ${coverageByElement.Water}. The rest abstain: the prior falls
back to the global modal shape for them, identically to the baseline.

## PRIMARY — recorded held-out set (teach, fill, sing, paint)

| Verb | Element (source) | True shape | Prior prediction | Exact | Baseline prediction | Exact | Partial (prior / baseline) |
| --- | --- | --- | --- | --- | --- | --- | --- |
${primary.rows.map(rowLine).join("\n")}

Headline (exact match): prior **${primary.priorExact}/${primary.n}**, baseline **${primary.baselineExact}/${primary.n}**.
Mean partial credit: prior ${primary.priorPartial.toFixed(3)}, baseline ${primary.baselinePartial.toFixed(3)}.

**Verdict (predeclared C.2 rule): ${verdict}**

Classification detail (primary set):
${primary.rows.map((r) => `- ${r.verb}: element ${r.element ?? "—"} via ${r.source}${r.hits ? `; cues: ${r.hits}` : ""}${r.confidence ? `; confidence ${r.confidence.toFixed(2)}` : ""}; basis: ${r.basis}`).join("\n")}

## SECONDARY — leave-one-out, 12 valency-challenge verbs

| Verb | Element (source) | True shape | Prior prediction | Exact | Baseline prediction | Exact | Partial (prior / baseline) |
| --- | --- | --- | --- | --- | --- | --- | --- |
${secondary.rows.map(rowLine).join("\n")}

Exact: prior **${secondary.priorExact}/${secondary.n}**, baseline **${secondary.baselineExact}/${secondary.n}**.
Mean partial: prior ${secondary.priorPartial.toFixed(3)}, baseline ${secondary.baselinePartial.toFixed(3)}.

## SUPPORTING — leave-one-out, every classified inventory verb

Units: ${supporting.n}. Exact: prior **${supporting.priorExact}/${supporting.n}** (${pct(supporting.priorExact / supporting.n)}),
baseline **${supporting.baselineExact}/${supporting.n}** (${pct(supporting.baselineExact / supporting.n)}).
Mean partial: prior ${supporting.priorPartial.toFixed(3)}, baseline ${supporting.baselinePartial.toFixed(3)}.
`;

writeFileSync(join(root, "docs/fork/prior-trial-results.md"), report);
console.log(report);
