/**
 * cli.ts — `npm run ask -- "why is winter cold?"`
 * One turn through the full pipeline (router → reasoner → renderer,
 * §§7–9) on the merged chat graph; prints the rendered answer and the
 * exact graph path(s) the engine used. `--debug` selects the debug
 * surface, which exposes decisions, ids and derivations.
 */
import { buildChatGraph, getDefaultExtract } from "./wordnet";
import { createSession, graphStampFor, runTurn, type RouterOptions } from "./router";
import { hostConfigFromEnv } from "./situation";

function main(): void {
  const args = process.argv.slice(2);
  let threshold: number | undefined;
  let debug = false;
  const words: string[] = [];
  for (const a of args) {
    const m = a.match(/^--threshold=([0-9.]+)$/);
    if (m) threshold = parseFloat(m[1]);
    else if (a === "--debug") debug = true;
    else words.push(a);
  }
  const question = words.join(" ").trim();
  if (!question) {
    console.log('Usage: npm run ask -- "why is winter cold?" [--threshold=0.5] [--debug]');
    process.exit(1);
  }
  const graph = buildChatGraph();
  const extract = getDefaultExtract();
  const session = createSession(graphStampFor(extract));
  const host = hostConfigFromEnv();
  const routerOpts: RouterOptions = {
    extract,
    location: host.location,
    timezone: host.timezone,
    hostDescription: host.hostDescription,
    debug,
    thresholdOverride: threshold,
  };
  const res = runTurn(graph, session, question, routerOpts);
  console.log(res.rendered.text);
  const d = res.decision;
  const head =
    d.kind === "route"
      ? `intent: ${d.intent.intentType}, via ${d.decisionReason}, threshold: ${d.intent.confidenceThreshold}`
      : `${d.kind} via ${d.decisionReason}`;
  console.log(`\n[decision: ${head}, mode: ${res.rendered.mode}]`);
  if (res.result && res.result.paths.length > 0) {
    console.log("Path(s):");
    for (const p of res.result.paths) console.log(`  ${p.text}`);
  } else {
    console.log("Path(s): (none)");
  }
}

main();
