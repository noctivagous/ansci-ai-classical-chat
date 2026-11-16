#!/usr/bin/env node
/**
 * fork-r4-transcript.mjs — the T-R4 transcript runner (slice R4).
 *
 * Runs the frozen scenarios of docs/fork/transcripts/T-R4.md
 * under the three compositions (neutral, Wood-predominant,
 * Water-predominant) and prints, per scenario, the replies and
 * the trace facts the frozen expectations judge — plus the
 * mechanical pair comparison of T-R4 §4: the CONCLUSION FIELDS
 * of each run (session record; spoken predications' tier,
 * support and ceiling; declines; composition member sets),
 * extracted and diffed across compositions, so "same
 * conclusions, differences only at the declared places" is
 * checked by the extraction, not by eye. The verdicts live in
 * docs/fork/transcripts/T-R4-results.md — this script only
 * produces the evidence.
 *
 * Run after a build: node scripts/fork-r4-transcript.mjs
 */
import { newSession } from "../dist/src/fork/session.js";
import { processTurn } from "../dist/src/fork/turn.js";
import { NEUTRAL_COMPOSITION } from "../dist/src/fork/composition.js";
import { WATER_DISPOSITION, WOOD_DISPOSITION } from "../dist/src/fork/disposition.js";
import { buildForkGraph, derive } from "../dist/src/fork/join.js";
import { tiersOnPath, weakestTier } from "../dist/src/fork/pricing.js";
import { planComposition } from "../dist/src/fork/plan.js";

const COMPS = [
  ["NEUTRAL", NEUTRAL_COMPOSITION],
  ["WOOD", WOOD_DISPOSITION],
  ["WATER", WATER_DISPOSITION],
];

function printTurn(r) {
  const tr = r.trace;
  console.log(`Bot: ${r.reply}`);
  console.log(`  cyclePath: ${tr.cyclePath ?? "-"}`);
  console.log(`  pricing: ${tr.pricing ? JSON.stringify(tr.pricing) : "-"}`);
  console.log(`  declineReason: ${tr.declineReason ?? "-"}`);
  if (tr.composition) console.log(`  composition: ${JSON.stringify(tr.composition)}`);
  console.log(`  dispositionBias: ${tr.dispositionBias ? JSON.stringify(tr.dispositionBias) : "-"}`);
}

/* The conclusion fields of T-R4 §4, extracted mechanically. */
function turnConclusionFields(session, results) {
  return {
    states: session.states.map((x) => [x.holder, x.lemma, x.element, !!x.negated, x.turn]),
    events: session.events.map((x) => [x.verb, x.turn]),
    topics: session.topics.map((x) => [x.lemma, x.raisedTurn, x.lastTouchedTurn]),
    turns: results.map((r) => ({
      // T-R4 §4: the conclusion fields are the priced conclusions
      // SPOKEN AS PREDICATIONS (the planner spoke: wording derived).
      // A steering turn's trace pricing is the selected move's own
      // field — part of the declared move difference, printed per
      // turn above, and excluded here exactly as §4 carves it out.
      tier: r.trace.wordingNotDerived === false ? (r.trace.pricing?.weakestTier ?? null) : null,
      support: r.trace.wordingNotDerived === false ? (r.trace.pricing?.support ?? null) : null,
      ceiling: r.trace.wordingNotDerived === false ? (r.trace.pricing?.ceiling ?? null) : null,
      decline: r.trace.declineReason ?? null,
      memberSet: r.trace.composition
        ? [...r.trace.composition.members, ...(r.trace.composition.held ?? [])]
            .map((m) => [m.quality, m.pricing.weakestTier, m.pricing.support, m.pricing.ceiling])
            .sort()
        : null,
    })),
  };
}

function compare(label, fieldsByComp) {
  const [n, w, wa] = fieldsByComp;
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  console.log(`  COMPARISON ${label}: neutral==wood conclusions: ${eq(n, w)}; neutral==water conclusions: ${eq(n, wa)}`);
  if (!eq(n, w) || !eq(n, wa)) {
    console.log(`    neutral: ${JSON.stringify(n)}`);
    console.log(`    wood:    ${JSON.stringify(w)}`);
    console.log(`    water:   ${JSON.stringify(wa)}`);
  }
}

function runTurnScenario(id, turns) {
  console.log(`\n## ${id} (turn-level)`);
  const fields = [];
  for (const [name, comp] of COMPS) {
    console.log(`\n### under ${name}`);
    const s = newSession(comp);
    const results = [];
    for (const t of turns) {
      console.log(`\nYou: ${t}`);
      const r = processTurn(s, t);
      results.push(r);
      printTurn(r);
    }
    fields.push(turnConclusionFields(s, results));
  }
  compare(id, fields);
}

runTurnScenario("R4-1", ["Is the soup cold?", "Is the salt cold?"]);
runTurnScenario("R4-3", ["I couldn't sleep.", "I was worried."]);
runTurnScenario("R4-4", ["Is winter cold?", "Is summer hot?"]);

/* ---- R4-2: composition-level, over derive() over salt ---- */
console.log("\n## R4-2 (composition-level: derive() over salt, color rows)");
{
  const graph = buildForkGraph();
  const d = derive(graph, "salt");
  const wanted = ["black", "green", "white", "red", "yellow"];
  const conclusions = wanted.map((label) => {
    const c = d.conclusions.find((x) => x.label === label && (x.category === "color" || x.category.endsWith(":color")));
    return {
      subject: { lemma: "salt", form: "salt", det: "the", person: "3sg" },
      qualityLemma: label,
      element: c.element,
      derivationPath: c.path,
      support: c.confidence,
      weakestTier: weakestTier(tiersOnPath(d, c)),
    };
  });
  const fields = [];
  for (const [name, comp] of COMPS) {
    const out = planComposition({ conclusions, disposition: comp });
    console.log(`\n### under ${name}`);
    console.log(`Bot: ${out.sentence ?? `- (${out.kind})`}`);
    if (out.kind === "graph") {
      console.log(`  supportOrder: ${JSON.stringify(out.supportOrder)}`);
      console.log(`  relationOrder: ${JSON.stringify(out.relationOrder)}`);
      console.log(`  members: ${JSON.stringify(out.members.map((m) => [m.qualityLemma, m.pricing]))}`);
      console.log(`  held: ${JSON.stringify(out.held.map((h) => [h.qualityLemma, h.pricing]))}`);
      console.log(`  dropped: ${JSON.stringify(out.dropped.map((x) => x.qualityLemma))}`);
      console.log(`  bias: ${out.bias ? JSON.stringify(out.bias) : "-"}`);
      fields.push(
        [...out.members, ...out.held]
          .map((m) => [m.qualityLemma, m.pricing.weakestTier, m.pricing.support, m.pricing.ceiling])
          .sort(),
      );
    }
  }
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  console.log(`  COMPARISON R4-2: neutral==wood conclusions: ${eq(fields[0], fields[1])}; neutral==water conclusions: ${eq(fields[0], fields[2])}`);
}

/* ---- Neutral-vs-neutral: full trace identity (T-R4 §4) ---- */
console.log("\n## Neutral identity (paired neutral runs, full trace JSON)");
{
  const scenarios = [
    ["Is the soup cold?", "Is the salt cold?"],
    ["I couldn't sleep.", "I was worried."],
    ["Is winter cold?", "Is summer hot?"],
  ];
  for (const turns of scenarios) {
    const run = () => {
      const s = newSession(NEUTRAL_COMPOSITION);
      return turns.map((t) => processTurn(s, t).trace);
    };
    const a = JSON.stringify(run());
    const b = JSON.stringify(run());
    console.log(`  ${turns[0]} … traces identical: ${a === b}; bias records present: ${a.includes("dispositionBias")}`);
  }
}
