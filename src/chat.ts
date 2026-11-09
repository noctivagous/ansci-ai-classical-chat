/**
 * chat.ts — `npm run chat`: a REPL over the merged graph (ontology + WordNet
 * base layer, slice 2a). The point of the exercise: ask about words nobody
 * hand-mapped and watch the reasoner climb WordNet's IS_A chains into the
 * ontology, or honestly say the chain reaches no anchor.
 *
 *   npm run chat                          interactive REPL (/quit or EOF exits)
 *   npm run chat -- --script <file>       non-interactive: one question per
 *                                         line from <file> (# = comment),
 *                                         prints Q/A/path blocks. Used by
 *                                         the demo and the test suite.
 */
import * as fs from "fs";
import * as readline from "readline";
import { Graph } from "./graph";
import { answer } from "./reason";
import { buildChatGraph } from "./wordnet";

function printAnswer(graph: Graph, question: string): void {
  const result = answer(graph, question);
  console.log(result.text);
  console.log(
    `[intent: ${result.intent.intentType}, includeOntology: ${result.intent.includeOntology}, threshold: ${result.intent.confidenceThreshold}]`,
  );
  if (result.paths.length) {
    console.log("Path(s):");
    for (const p of result.paths) console.log(`  ${p.text}`);
  } else {
    console.log("Path(s): (none)");
  }
}

function runScript(graph: Graph, file: string): void {
  const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/);
  for (const raw of lines) {
    const q = raw.trim();
    if (!q || q.startsWith("#")) continue;
    console.log(`Q: ${q}`);
    process.stdout.write("A: ");
    printAnswer(graph, q);
    console.log("");
  }
}

function runRepl(graph: Graph): void {
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
    if (q) printAnswer(graph, q);
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
  const graph = buildChatGraph();
  if (scriptIdx >= 0) {
    const file = args[scriptIdx + 1];
    if (!file) {
      console.error("Usage: npm run chat -- --script <questions-file>");
      process.exit(1);
    }
    runScript(graph, file);
    return;
  }
  runRepl(graph);
}

main();
