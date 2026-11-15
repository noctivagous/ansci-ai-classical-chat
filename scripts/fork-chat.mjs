#!/usr/bin/env node
/**
 * fork-chat.mjs — the Level-3 unscripted chat runner for the fork.
 *
 * A line-at-a-time REPL over the fork turn loop (src/fork/turn.ts):
 * each line you type is one turn; the reply is printed verbatim,
 * followed by its trace (parse summary, classifications, the cycle
 * path or derivation that steered the reply, or the decline reason).
 * Session state (entities, events, states, topics) persists across
 * lines within the run, so later turns can take up earlier ones.
 *
 * This is the acceptance surface for unscripted conversation: no
 * scenarios, no scripting — whatever is typed is what is tested.
 *
 * Run: npm run fork:chat        (Ctrl-D / Ctrl-C to end)
 * Pipe: printf 'I heard the news.\nI was furious.\n' | npm run fork:chat
 */
import { createInterface } from "node:readline";
import { newSession } from "../dist/src/fork/session.js";
import { processTurn } from "../dist/src/fork/turn.js";

const session = newSession();
const rl = createInterface({ input: process.stdin, terminal: false });

console.log("Fork chat — say anything; every reply is the turn loop's own. Ctrl-D to end.");
for await (const line of rl) {
  const text = line.trim();
  if (!text) continue;
  const { reply, trace } = processTurn(session, text);
  console.log("\nBot: " + reply);
  const bits = [trace.parseSummary];
  for (const c of trace.classifications) bits.push(`${c.concept} -> ${c.element} @${c.confidence} (${c.provenance})`);
  for (const r of trace.resolutions) bits.push(`'${r.pronoun}' -> ${r.resolvedTo}`);
  if (trace.cyclePath) bits.push("cycle path: " + trace.cyclePath);
  if (trace.derivationPath) bits.push("derivation: " + trace.derivationPath);
  if (trace.steeringNote) bits.push(trace.steeringNote);
  if (trace.declineReason) bits.push("declined: " + trace.declineReason);
  console.log("  trace: " + bits.join("; "));
}
console.log("\n(session ended — " + session.turnCount + " turn(s))");
