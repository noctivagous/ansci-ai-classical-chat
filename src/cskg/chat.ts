/**
 * chat.ts — CSKG spike chat CLI.
 *
 *   node dist/src/cskg/chat.js                 interactive REPL (/quit exits)
 *   node dist/src/cskg/chat.js --script <file> one input per line (# = comment)
 *   node dist/src/cskg/chat.js --debug         print the ThoughtTrace
 *                                              (steps + edges) after each answer
 *
 * Data: data/raw/cskg/cskg.tsv.gz by default (override with CSKG_PATH;
 * the pre-merge cskg_star.tsv.gz also loads — same columns). Location
 * for the situated self: CSKG_CHAT_LOCATION / CSKG_CHAT_HEMISPHERE
 * (see situation.ts). Loading takes a while on first parse; progress
 * goes to stderr so scripted transcripts stay clean on stdout.
 */
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { createSession, runTurn, type SessionState } from "./converse";
import { loadCskg, type CskgGraph } from "./loader";

function printTurn(
  g: CskgGraph,
  session: SessionState,
  line: string,
  debug: boolean,
): void {
  const res = runTurn(g, session, line);
  console.log(`Q: ${line}`);
  console.log(`A: ${res.text}`);
  if (debug) {
    console.log(`[intent: ${res.trace.intent}, grounded: ${res.grounded}]`);
    for (const s of res.trace.steps) {
      console.log(`  · ${s.kind}: ${s.detail}`);
      if (s.edges) for (const e of s.edges) console.log(`      ${e}`);
    }
  }
  console.log();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const debug = args.includes("--debug");
  const scriptIdx = args.indexOf("--script");
  const script = scriptIdx >= 0 ? args[scriptIdx + 1] : undefined;

  const dataPath =
    process.env.CSKG_PATH ??
    path.join(__dirname, "..", "..", "..", "data", "raw", "cskg", "cskg.tsv.gz");
  if (!fs.existsSync(dataPath)) {
    console.error(
      `CSKG data not found at ${dataPath}.\n` +
        "Fetch it from Zenodo record 4331372 (cskg.tsv.gz) into data/raw/cskg/, " +
        "or set CSKG_PATH.",
    );
    process.exit(1);
  }
  console.error(`loading CSKG from ${dataPath} …`);
  const g = await loadCskg(dataPath);
  const st = g.stats!;
  console.error(
    `loaded: ${st.edges.toLocaleString()} edges / ${st.terms.toLocaleString()} terms ` +
      `from ${st.rowsSeen.toLocaleString()} rows in ${(st.loadMs / 1000).toFixed(1)}s ` +
      `(dropped: ${st.droppedRelation.toLocaleString()} relation-filtered, ` +
      `${st.droppedNonEnglish.toLocaleString()} non-English, ` +
      `${st.duplicateRows.toLocaleString()} duplicate attestations merged)`,
  );

  const session = createSession();
  if (script) {
    const lines = fs
      .readFileSync(script, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    for (const line of lines) printTurn(g, session, line, debug);
    return;
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('CSKG spike chat. Ask or tell me things; "why did you say that?" replays my last reasoning. /quit exits.');
  const ask = (): void => {
    rl.question("> ", (line) => {
      const t = line.trim();
      if (t === "/quit" || t === "/exit") {
        rl.close();
        return;
      }
      if (t) {
        const res = runTurn(g, session, t);
        console.log(res.text);
        if (debug) {
          console.log(`[intent: ${res.trace.intent}, grounded: ${res.grounded}]`);
          for (const s of res.trace.steps) console.log(`  · ${s.kind}: ${s.detail}`);
        }
      }
      ask();
    });
  };
  ask();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
