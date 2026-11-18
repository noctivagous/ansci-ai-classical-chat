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
import { homedir } from "node:os";
import { join } from "node:path";
import { newSession } from "../dist/src/fork/session.js";
import { processTurn } from "../dist/src/fork/turn.js";
import { FileInterlocutorStore } from "../dist/src/fork/interlocutor-store.js";

// Social Unit S6: the demonstrator carries the file-backed
// Interlocutor store, so an identity stated in one run is
// recognised — on being stated again — in the next. The path
// is deployment configuration (ANSCI_INTERLOCUTOR_STORE),
// defaulting to a per-user file; the store is consulted only
// once an identity is stated, and a visitor who never gives
// a name writes nothing to it.
const storePath = process.env.ANSCI_INTERLOCUTOR_STORE ?? join(homedir(), ".ansci", "interlocutors.json");
const session = newSession(undefined, undefined, { interlocutorStore: new FileInterlocutorStore(storePath) });
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
