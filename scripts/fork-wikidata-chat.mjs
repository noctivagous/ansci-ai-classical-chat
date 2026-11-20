#!/usr/bin/env node
/**
 * fork-wikidata-chat.mjs — the W2 acceptance runner: a
 * line-at-a-time REPL over processTurnWithWikidata
 * (src/fork/wikidata-turn.ts), in fork-chat.mjs's pattern.
 *
 * Each line is one turn through the wrapper: the ordinary
 * synchronous turn first, then — for the first-consumer
 * shapes ("where is X?", "what is the capital of X?", "what
 * country is X in?") — the bank, and on a located knowledge
 * decline the live Wikidata lookup, banking and re-answer.
 * The source is the LIVE Action API client wrapped in a
 * counter: every search/get call is logged as it happens, so
 * a repeat question's NO-fetch is visible in the transcript
 * as the absence of a log line (and in the running total).
 *
 * Run: npm run build && node scripts/fork-wikidata-chat.mjs
 * Pipe: printf 'Where is Oklahoma?\nWhere is Oklahoma?\n' | node scripts/fork-wikidata-chat.mjs
 */
import { createInterface } from "node:readline";
import { newSession } from "../dist/src/fork/session.js";
import { processTurnWithWikidata } from "../dist/src/fork/wikidata-turn.js";
import { HttpWikidataSource } from "../dist/src/fork/wikidata-client.js";

let fetchCount = 0;
const live = new HttpWikidataSource();
const countingSource = {
  async searchEntities(search) {
    fetchCount += 1;
    console.log(`  [wikidata fetch #${fetchCount}] searchEntities("${search}")`);
    return live.searchEntities(search);
  },
  async getEntities(ids) {
    fetchCount += 1;
    console.log(`  [wikidata fetch #${fetchCount}] getEntities(${ids.join("|")})`);
    return live.getEntities(ids);
  },
};

let session = newSession();
const rl = createInterface({ input: process.stdin, terminal: false });
console.log("Fork chat + Wikidata lookup (W2) — Ctrl-D to end. Type NEWSESSION for a fresh session (the bank persists).");
for await (const line of rl) {
  const text = line.trim();
  if (!text) continue;
  if (text === "NEWSESSION") {
    session = newSession();
    console.log("(fresh session; fetch count so far: " + fetchCount + ")");
    continue;
  }
  const before = fetchCount;
  const { reply, trace } = await processTurnWithWikidata(session, text, { source: countingSource });
  console.log("\nBot: " + reply);
  const bits = [trace.parseSummary];
  if (trace.wikidata) bits.push(`wikidata: ${trace.wikidata.action} — ${trace.wikidata.detail}`);
  if (trace.declineReason) bits.push("declined: " + trace.declineReason);
  console.log("  trace: " + bits.join("; "));
  console.log(`  fetches this turn: ${fetchCount - before} (total ${fetchCount})`);
}
console.log("\n(session ended — " + session.turnCount + " turn(s), " + fetchCount + " fetch(es) total)");
