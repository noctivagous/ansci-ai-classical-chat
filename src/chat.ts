/**
 * chat.ts — `npm run chat`: a session over the merged graph (ontology +
 * WordNet base layer), slice 2b. Every turn runs the full pipeline —
 * router → reasoner → renderer (§§7–9) — so words nobody hand-mapped are
 * resolved to senses, climbed into the ontology, answered in plain
 * language, and the derivation stays inspectable.
 *
 *   npm run chat                          interactive REPL (/quit or EOF exits)
 *   npm run chat -- --script <file>       non-interactive: one question per
 *                                         line from <file> (# = comment).
 *   npm run chat -- --debug               force the debug surface + dumps
 *   npm run chat -- --plain               hide the evidence footer
 *
 * Default presentation: the rendered answer, then an evidence footer
 * (decision line, the debug rendering of the same trace, and the graph
 * paths) — the developer view of what the plain surface rests on.
 * Location/timezone come from the host config (ANSCI_LOCATION etc.,
 * §8.12); absence is normal and the chat says so when asked.
 */
import * as fs from "fs";
import * as readline from "readline";
import { Graph } from "./graph";
import { buildChatGraph, getDefaultExtract } from "./wordnet";
import { frameNetInstalled, loadFrameNetBundle, mergeFrameNet } from "./framenet";
import {
  createSession,
  graphStampFor,
  runTurn,
  type RouterOptions,
  type SessionState,
  type TurnResult,
} from "./router";
import { renderAnswer } from "./render";
import { hostConfigFromEnv } from "./situation";

export interface ChatSurfaceOptions {
  debug?: boolean;
  plain?: boolean;
}

function printTurn(
  graph: Graph,
  session: SessionState,
  question: string,
  routerOpts: RouterOptions,
  surface: ChatSurfaceOptions,
): TurnResult {
  const res = runTurn(graph, session, question, routerOpts);
  console.log(res.rendered.text);
  if (!surface.plain) {
    const d = res.decision;
    const head =
      d.kind === "route"
        ? `intent: ${d.intent.intentType}, via ${d.decisionReason}, threshold: ${d.intent.confidenceThreshold}`
        : `${d.kind} via ${d.decisionReason}`;
    console.log(`[decision: ${head}, mode: ${res.rendered.mode}]`);
    if (d.kind === "route") {
      const debugText = renderAnswer({
        graph,
        decision: d,
        trace: res.trace,
        modeOverride: "debug",
        extract: routerOpts.extract,
      }).text;
      if (debugText && debugText !== res.rendered.text) console.log(debugText);
    }
    if (res.result && res.result.paths.length > 0) {
      console.log("Path(s):");
      for (const p of res.result.paths) console.log(`  ${p.text}`);
    } else {
      console.log("Path(s): (none)");
    }
  }
  if (surface.debug) {
    console.log(
      `[trace] ${JSON.stringify({ turn: res.trace.turn, steps: res.trace.steps.map((s) => s.kind), checks: res.trace.checks, boundHit: res.trace.boundHit ?? false })}`,
    );
  }
  return res;
}

function runScript(
  graph: Graph,
  session: SessionState,
  file: string,
  routerOpts: RouterOptions,
  surface: ChatSurfaceOptions,
): void {
  const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/);
  for (const raw of lines) {
    const q = raw.trim();
    if (!q || q.startsWith("#")) continue;
    console.log(`Q: ${q}`);
    process.stdout.write("A: ");
    printTurn(graph, session, q, routerOpts, surface);
    console.log("");
  }
}

function runRepl(
  graph: Graph,
  session: SessionState,
  routerOpts: RouterOptions,
  surface: ChatSurfaceOptions,
): void {
  console.log(
    `AnSci chat — ontology + WordNet base layer (${graph.allNodes().length} nodes, ${graph.allEdges().length} edges).`,
  );
  console.log("Ask a question per line. /quit or Ctrl-D exits.\n");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "ansci> " });
  rl.prompt();
  rl.on("line", (line) => {
    const q = line.trim();
    if (q === "/quit" || q === "/exit") {
      rl.close();
      return;
    }
    if (q) printTurn(graph, session, q, routerOpts, surface);
    console.log("");
    rl.prompt();
  });
  rl.on("close", () => {
    console.log("bye");
  });
}

function main(): void {
  const args = process.argv.slice(2);
  const scriptIdx = args.indexOf("--script");
  const surface: ChatSurfaceOptions = {
    debug: args.includes("--debug"),
    plain: args.includes("--plain"),
  };
  const graph = buildChatGraph();
  const extract = getDefaultExtract();
  // FrameNet is an optional layer (§5): merge it only when the bundle
  // has been installed (scripts/import-framenet.py). Absent, the graph
  // is exactly the seed + WordNet graph and frame questions decline
  // with the installer's name.
  if (frameNetInstalled()) {
    mergeFrameNet(graph, loadFrameNetBundle(), extract);
  }
  const session = createSession(graphStampFor(extract));
  const host = hostConfigFromEnv();
  const routerOpts: RouterOptions = {
    extract,
    location: host.location,
    timezone: host.timezone,
    hostDescription: host.hostDescription,
    debug: surface.debug,
  };
  if (scriptIdx >= 0) {
    const file = args[scriptIdx + 1];
    if (!file) {
      console.error("Usage: npm run chat -- --script <questions-file>");
      process.exit(1);
    }
    runScript(graph, session, file, routerOpts, surface);
    return;
  }
  runRepl(graph, session, routerOpts, surface);
}

main();
