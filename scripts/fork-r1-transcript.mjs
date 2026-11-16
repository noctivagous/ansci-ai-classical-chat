#!/usr/bin/env node
/**
 * fork-r1-transcript.mjs — the T-R1 transcript runner (slice R1).
 *
 * Runs the five frozen scenarios of docs/fork/transcripts/T-R1.md
 * through the real turn loop and prints, per turn, the reply and
 * the trace facts the scenario's expectations judge: the
 * derivation path, the pricing record, whether the wording was
 * derived, the reply graph where one was built, the planner's
 * note and any decline ground. The verdicts live in
 * docs/fork/transcripts/T-R1-results.md — this script only
 * produces the evidence.
 *
 * Scenario R1-4 runs with its disclosed fixture: one synthetic
 * classification (pot — Water, food, 0.35, fork-creative) pushed
 * into the table for that session only, the synthetic-load
 * pattern of the density run. The shipped table is untouched.
 *
 * Run after a build: node scripts/fork-r1-transcript.mjs
 */
import { newSession } from "../dist/src/fork/session.js";
import { processTurn } from "../dist/src/fork/turn.js";
import { CLASSIFICATIONS } from "../dist/src/fork/classify.js";

const SCENARIOS = [
  { name: "R1-1", turns: ["Is winter cold?", "Is the salt cold?", "Why is winter cold?"] },
  { name: "R1-2", turns: ["I bought the book.", "I was worried.", "I made the soup."] },
  { name: "R1-3", turns: ["Is the soup cold?"] },
  { name: "R1-4", fixture: true, turns: ["Is the pot cold?"] },
  { name: "R1-5", turns: ["I read the book."] },
];

for (const scenario of SCENARIOS) {
  if (scenario.fixture) {
    CLASSIFICATIONS.push({
      concept: "pot", aspect: "food", aspectKey: "overall",
      element: "Water", confidence: 0.35, provenance: "fork-creative",
      note: "T-R1 scenario R1-4 fixture — synthetic, for the run only",
    });
  }
  const s = newSession();
  console.log(`## ${scenario.name}${scenario.fixture ? " (fixture classification: pot — Water, food, 0.35, fork-creative)" : ""}`);
  for (const t of scenario.turns) {
    const r = processTurn(s, t);
    const tr = r.trace;
    console.log(`\nYou: ${t}`);
    console.log(`Bot: ${r.reply}`);
    console.log(`  derivationPath: ${tr.derivationPath ?? "-"}`);
    console.log(`  cyclePath: ${tr.cyclePath ?? "-"}`);
    console.log(`  pricing: ${tr.pricing ? JSON.stringify(tr.pricing) : "-"}`);
    console.log(`  wordingNotDerived: ${tr.wordingNotDerived}`);
    console.log(`  replyGraph: ${tr.replyGraph ?? "-"}`);
    console.log(`  planNote: ${tr.planNote ?? "-"}`);
    console.log(`  steeringNote: ${tr.steeringNote ?? "-"}`);
    console.log(`  declineReason: ${tr.declineReason ?? "-"}`);
  }
  console.log("");
}
