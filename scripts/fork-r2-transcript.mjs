#!/usr/bin/env node
/**
 * fork-r2-transcript.mjs — the T-R2 transcript runner (slice R2).
 *
 * Runs the three frozen scenarios of docs/fork/transcripts/T-R2.md
 * and prints, per item, the reply and the trace facts the
 * scenario's expectations judge. R2-1 and R2-3 run through the
 * real turn loop. R2-2 is composition-level by the frozen file's
 * own framing: it establishes a newest state with a real turn,
 * harvests the composition's members from the real join
 * (derive() over salt), adds the one disclosed fixture member,
 * and invokes planComposition directly — printing both
 * orderings, the members with their prices, the dropped member
 * with its ground, and the composed reply under each active
 * order. The verdicts live in docs/fork/transcripts/T-R2-results.md
 * — this script only produces the evidence.
 *
 * Run after a build: node scripts/fork-r2-transcript.mjs
 */
import { newSession } from "../dist/src/fork/session.js";
import { processTurn } from "../dist/src/fork/turn.js";
import { buildForkGraph, derive } from "../dist/src/fork/join.js";
import { tiersOnPath, weakestTier } from "../dist/src/fork/pricing.js";
import { planComposition, DEFAULT_ORDER } from "../dist/src/fork/plan.js";

function printTurn(r) {
  const tr = r.trace;
  console.log(`Bot: ${r.reply}`);
  console.log(`  derivationPath: ${tr.derivationPath ?? "-"}`);
  console.log(`  pricing: ${tr.pricing ? JSON.stringify(tr.pricing) : "-"}`);
  console.log(`  wordingNotDerived: ${tr.wordingNotDerived}`);
  console.log(`  composition: ${tr.composition ? JSON.stringify(tr.composition) : "-"}`);
  console.log(`  planNote: ${tr.planNote ?? "-"}`);
  console.log(`  declineReason: ${tr.declineReason ?? "-"}`);
}

/* ---- R2-1: set presentation at the question site ---- */
console.log("## R2-1 (turn-level: the season profile set)");
{
  const s = newSession();
  for (const t of ["Is winter cold?", "Is summer hot?", "Is autumn dark?", "Why is winter cold?"]) {
    console.log(`\nYou: ${t}`);
    printTurn(processTurn(s, t));
  }
}

/* ---- R2-2: the two orders disagree, over the join's real conclusions ---- */
console.log("\n## R2-2 (composition-level: derive() over salt, newest state Wood)");
{
  const s = newSession();
  const setup = processTurn(s, "I was furious.");
  console.log(`\nSetup turn — You: I was furious.`);
  console.log(`Bot: ${setup.reply}`);
  const newest = [...s.states].reverse().find((x) => x.element);
  console.log(`  newest state: ${newest.lemma} (${newest.element})`);

  const g = buildForkGraph();
  const d = derive(g, "salt");
  const picked = d.conclusions.filter(
    (c) => c.category === "color" || c.category === "taste" || c.category === "generates:color" || c.category === "generates:taste",
  );
  const subject = { lemma: "salt", form: "salt", det: "the", person: "3sg" };
  const conclusions = picked.map((c) => ({
    subject,
    qualityLemma: c.label,
    element: c.element,
    derivationPath: c.path,
    support: c.confidence,
    weakestTier: weakestTier(tiersOnPath(d, c)),
  }));
  conclusions.push({
    subject,
    qualityLemma: "cold",
    element: "Water",
    derivationPath: "fixture: salt —HAS_ELEMENT→ Water (0.35, fixture) —POLARITY_OF→ Yin —HAS_QUALITY→ cold",
    support: 0.35,
    weakestTier: "derived",
  });
  console.log(`  members offered: ${conclusions.map((c) => `${c.qualityLemma}[${c.element}, support ${c.support}, tier ${c.weakestTier}]`).join(" ")}`);

  for (const order of [undefined, "relation"]) {
    const out = planComposition({ conclusions, newestStateElement: newest.element, ...(order ? { order } : {}) });
    console.log(`\n  planComposition(order: ${order ?? `default (${DEFAULT_ORDER})`}):`);
    console.log(`    kind: ${out.kind}`);
    if (out.kind === "graph") {
      console.log(`    sentence: ${out.sentence}`);
      console.log(`    activeOrder: ${out.activeOrder}`);
      console.log(`    supportOrder: ${JSON.stringify(out.supportOrder)}`);
      console.log(`    relationOrder: ${JSON.stringify(out.relationOrder)}`);
      console.log(`    members: ${out.members.map((m) => `${m.qualityLemma}:${m.level}(relation ${m.relation})`).join(" ")}`);
      console.log(`    dropped: ${JSON.stringify(out.dropped.map((x) => ({ quality: x.qualityLemma, ground: x.ground })))}`);
    }
  }
}

/* ---- R2-3: boundaries ---- */
console.log("\n## R2-3 (turn-level: no profile, no set)");
{
  const s = newSession();
  for (const t of ["Is the salt cold?", "Is the soup cold?"]) {
    console.log(`\nYou: ${t}`);
    printTurn(processTurn(s, t));
  }
  const fixtureOnly = planComposition({
    conclusions: [
      {
        subject: { lemma: "salt", form: "salt", det: "the" },
        qualityLemma: "cold",
        element: "Water",
        derivationPath: "fixture: salt —HAS_ELEMENT→ Water (0.35, fixture) —POLARITY_OF→ Yin —HAS_QUALITY→ cold",
        support: 0.35,
        weakestTier: "derived",
      },
    ],
  });
  console.log(`\n  all-below-floor composition: kind ${fixtureOnly.kind}${fixtureOnly.kind === "declined" ? ` — ground: ${fixtureOnly.ground}` : ""}`);
  const empty = planComposition({ conclusions: [] });
  console.log(`  empty composition: kind ${empty.kind}${empty.kind === "declined" ? ` — ground: ${empty.ground}` : ""}`);
}
console.log("");
