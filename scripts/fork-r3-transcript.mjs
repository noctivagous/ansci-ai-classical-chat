#!/usr/bin/env node
/**
 * fork-r3-transcript.mjs — the T-R3 transcript runner (slice R3).
 *
 * Runs the five frozen scenarios of docs/fork/transcripts/T-R3.md
 * and prints, per turn, the reply and the trace facts the
 * scenario's expectations judge: the gap record, the
 * clarification record, the decline ground, the pricing record,
 * the reply graph. R3-1/R3-2/R3-4/R3-5 run through the real turn
 * loop with the WordNet provider off (the turn tests' standing
 * state); R3-3 runs with it enabled, as the dashboard runs it —
 * the sense machinery's rival candidates exist only then. R3-4
 * runs with its disclosed fixture classification pushed for the
 * run (pot — Water, food, 0.35, fork-creative), the T-R1 R1-4
 * pattern. The verdicts live in
 * docs/fork/transcripts/T-R3-results.md — this script only
 * produces the evidence.
 *
 * Run after a build: node scripts/fork-r3-transcript.mjs
 */
import { newSession } from "../dist/src/fork/session.js";
import { processTurn } from "../dist/src/fork/turn.js";
import { CLASSIFICATIONS } from "../dist/src/fork/classify.js";
import { enableWordnetLexicon } from "../dist/src/fork/wordnet-lex.js";

function printTurn(r) {
  const tr = r.trace;
  console.log(`Bot: ${r.reply}`);
  console.log(`  gapQuestion: ${tr.gapQuestion ? JSON.stringify(tr.gapQuestion) : "-"}`);
  console.log(`  clarification: ${tr.clarification ? JSON.stringify(tr.clarification) : "-"}`);
  console.log(`  declineReason: ${tr.declineReason ?? "-"}`);
  console.log(`  pricing: ${tr.pricing ? JSON.stringify(tr.pricing) : "-"}`);
  console.log(`  wordingNotDerived: ${tr.wordingNotDerived}`);
  console.log(`  replyGraph: ${tr.replyGraph ?? "-"}`);
  console.log(`  planNote: ${tr.planNote ?? "-"}`);
  console.log(`  steeringNote: ${tr.steeringNote ?? "-"}`);
}

function runScenario(name, turns, note) {
  console.log(`\n## ${name}${note ? ` (${note})` : ""}`);
  const s = newSession();
  for (const t of turns) {
    console.log(`\nYou: ${t}`);
    printTurn(processTurn(s, t));
  }
}

runScenario("R3-1", ["I gave him.", "I gave him the book."]);
runScenario("R3-2", ["I gave the book.", "I put the onions."]);

console.log("\n## R3-4 (fixture classification: pot — Water, food, 0.35, fork-creative)");
CLASSIFICATIONS.push({
  concept: "pot", aspect: "food", aspectKey: "overall",
  element: "Water", confidence: 0.35, provenance: "fork-creative",
  note: "T-R3 scenario R3-4 fixture — synthetic, for the run only",
});
{
  const s = newSession();
  for (const t of ["Is the table cold?", "I bought the onions.", "What did I put in the soup?", "Is the pot cold?", "Is the salt cold?"]) {
    console.log(`\nYou: ${t}`);
    printTurn(processTurn(s, t));
  }
}
CLASSIFICATIONS.splice(CLASSIFICATIONS.findIndex((c) => c.concept === "pot" && c.confidence === 0.35), 1);

runScenario("R3-5", ["Is the salt cold?"]);
runScenario("R3-5 (fresh session)", ["I read the book."]);
runScenario("R3-5 (fresh session)", ["I gave him the book."]);

enableWordnetLexicon(true);
runScenario("R3-3a (WordNet enabled)", ["I found rest."]);
runScenario("R3-3b (WordNet enabled, fresh session)", ["I found rest in the garden."]);
console.log("");
