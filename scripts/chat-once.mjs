#!/usr/bin/env node
/**
 * chat-once.mjs — one chat turn per invocation, with memory.
 *
 * The interactive REPL (dist/src/cskg/chat.js) keeps its session
 * in-process, so it dies wherever stdin closes immediately. This
 * method keeps no process instead: your lines live in a history
 * file, and each run rebuilds the session by replaying that file
 * (src/cskg/chat-history.ts), answers the new turn, and appends
 * it. Memory, corrections and "why did you say that?" work across
 * invocations exactly as in one live sitting.
 *
 *   node scripts/chat-once.mjs "I'm making soup on Saturday."
 *   node scripts/chat-once.mjs "What about coffee?"
 *   node scripts/chat-once.mjs "Why did you say that?"
 *   node scripts/chat-once.mjs --history         (show stored turns)
 *   node scripts/chat-once.mjs --reset            (clear the history)
 *
 * Flags: --history <path> keeps a separate conversation;
 * CSKG_CHAT_HISTORY sets the default file (default:
 * data/experience/chat-history.txt — gitignored, local-first);
 * --debug prints the thought trace. /reset and /history work as
 * turn text too.
 */
import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const dist = (p) => require(path.join(root, "dist", "src", "cskg", p));

const { loadCskg } = dist("loader.js");
const { createSession } = dist("memory.js");
const { runTurn } = dist("turn.js");
const { appendHistory, clearHistory, loadHistory, replayTurns } = dist("chat-history.js");

function usageAndExit(code) {
  console.error(
    'usage: node scripts/chat-once.mjs "your turn" [--history <path>] [--debug] [--reset] [--history-list]',
  );
  process.exit(code);
}

async function main() {
  const args = process.argv.slice(2);
  let historyPath =
    process.env.CSKG_CHAT_HISTORY ?? path.join(root, "data", "experience", "chat-history.txt");
  let debug = false;
  const words = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--debug") debug = true;
    else if (a === "--history" && args[i + 1] && !args[i + 1].startsWith("--")) historyPath = args[++i];
    else if (a === "--history-list" || a === "--list") words.push("/history");
    else if (a === "--reset") words.push("/reset");
    else if (a === "--help" || a === "-h") usageAndExit(0);
    else if (a.startsWith("--")) {
      console.error(`unknown flag: ${a}`);
      usageAndExit(1);
    } else words.push(a);
  }
  const turn = words.join(" ").trim();

  if (turn === "/reset") {
    clearHistory(historyPath);
    console.log("History cleared.");
    return;
  }
  if (turn === "/history" || turn === "") {
    const lines = loadHistory(historyPath);
    if (lines.length === 0 && turn === "") usageAndExit(1);
    lines.forEach((l, i) => console.log(`${i + 1}. ${l}`));
    if (lines.length === 0) console.log("(no history yet)");
    return;
  }

  const dataPath =
    process.env.CSKG_PATH ?? path.join(root, "data", "raw", "cskg", "cskg.tsv.gz");
  if (!fs.existsSync(dataPath)) {
    console.error(`CSKG data not found at ${dataPath}. Run: node scripts/install.mjs`);
    process.exit(1);
  }
  const g = await loadCskg(dataPath);
  try {
    await require(path.join(root, "dist", "src", "ansci", "linkgrammar-wasm.js")).ensureLinkGrammarLoaded();
  } catch (err) {
    console.warn(`link-grammar wasm unavailable, positional parser only: ${err?.message ?? err}`);
  }
  const session = createSession();
  replayTurns(g, session, loadHistory(historyPath), process.env, new Date());
  const res = runTurn(g, session, turn, process.env, new Date());
  console.log(`A: ${res.text}`);
  if (debug) {
    console.log(`[intent: ${res.trace.intent}, grounded: ${res.grounded}]`);
    for (const s of res.trace.steps) console.log(`  · [${s.piece}] ${s.kind}: ${s.detail}`);
  }
  appendHistory(historyPath, turn);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
