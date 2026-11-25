#!/usr/bin/env node
/**
 * ansci-chat.mjs — the Level-3 unscripted chat runner for the fork.
 *
 * A line-at-a-time REPL over the fork turn loop (src/ansci/turn.ts):
 * each line you type is one turn; the reply is printed verbatim,
 * followed by its trace (parse summary, classifications, the cycle
 * path or derivation that steered the reply, or the decline reason).
 * Session state (entities, events, states, topics) persists across
 * lines within the run, so later turns can take up earlier ones.
 *
 * This is the acceptance surface for unscripted conversation: no
 * scenarios, no scripting — whatever is typed is what is tested.
 *
 * Run: npm run ansci:chat        (Ctrl-D / Ctrl-C to end)
 * Pipe: printf 'I heard the news.\nI was furious.\n' | npm run ansci:chat
 */
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import { join } from "node:path";
import { newSession } from "../dist/src/ansci/session.js";
import { processTurnWithWeather } from "../dist/src/ansci/weather-turn.js";
import { HostClockSource } from "../dist/src/ansci/timekeeping.js";
import { FileInterlocutorStore } from "../dist/src/ansci/interlocutor-store.js";
import { ensureLinkGrammarLoaded } from "../dist/src/ansci/linkgrammar-wasm.js";

// Step 4 routing: warm the WASM parser so parse() consults it
// as the primary O-link source. Failure falls back silently to
// the positional parser plus shadow solver — chat works offline.
try {
  await ensureLinkGrammarLoaded();
} catch (err) {
  console.warn(`link-grammar wasm unavailable, positional parser only: ${err?.message ?? err}`);
}

// Social Unit S6: the demonstrator carries the file-backed
// Interlocutor store, so an identity stated in one run is
// recognised — on being stated again — in the next. The path
// is deployment configuration (ANSCI_INTERLOCUTOR_STORE),
// defaulting to a per-user file; the store is consulted only
// once an identity is stated, and a visitor who never gives
// a name writes nothing to it.
const storePath = process.env.ANSCI_INTERLOCUTOR_STORE ?? join(homedir(), ".ansci", "interlocutors.json");
// Situated wiring: the shell supplies the host clock as the
// session's clock source (Timekeeping's consultation route
// answers time/date from a fresh reading each turn), and the
// weather wrapper completes lookup-needed turns from the
// live weather source. The deployment's place, where one is
// configured (ANSCI_PLACE in place.ts), is the seat both the
// self-location answer and an unlocated weather question read.
const session = newSession(undefined, undefined, {
  interlocutorStore: new FileInterlocutorStore(storePath),
  clockSource: new HostClockSource(),
});
const rl = createInterface({ input: process.stdin, terminal: false });

console.log("Fork chat — say anything; every reply is the turn loop's own. Ctrl-D to end.");
for await (const line of rl) {
  const text = line.trim();
  if (!text) continue;
  const { reply, trace } = await processTurnWithWeather(session, text);
  console.log("\nBot: " + reply);
  const bits = [trace.parseSummary];
  for (const c of trace.classifications) bits.push(`${c.concept} -> ${c.element} @${c.confidence} (${c.provenance})`);
  for (const r of trace.resolutions) bits.push(`'${r.pronoun}' -> ${r.resolvedTo}`);
  if (trace.cyclePath) bits.push("cycle path: " + trace.cyclePath);
  if (trace.derivationPath) bits.push("derivation: " + trace.derivationPath);
  if (trace.steeringNote) bits.push(trace.steeringNote);
  if (trace.timeAnswer) bits.push(`time: ${trace.timeAnswer.route ?? "declined"} — ${trace.timeAnswer.ground}`);
  if (trace.weather) bits.push(`weather: ${trace.weather.action} — ${trace.weather.detail}`);
  if (trace.declineReason) bits.push("declined: " + trace.declineReason);
  console.log("  trace: " + bits.join("; "));
}
console.log("\n(session ended — " + session.turnCount + " turn(s))");
