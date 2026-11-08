/**
 * cli.ts — `npm run ask -- "why is winter cold?"`
 * Prints the answer and the exact graph path(s) the engine used.
 */
import { buildSeedGraph } from "./seed";
import { answer } from "./reason";

function main(): void {
  const args = process.argv.slice(2);
  let threshold: number | undefined;
  const words: string[] = [];
  for (const a of args) {
    const m = a.match(/^--threshold=([0-9.]+)$/);
    if (m) threshold = parseFloat(m[1]);
    else words.push(a);
  }
  const question = words.join(" ").trim();
  if (!question) {
    console.log('Usage: npm run ask -- "why is winter cold?" [--threshold=0.5]');
    process.exit(1);
  }
  const graph = buildSeedGraph();
  const result = answer(graph, question, threshold !== undefined ? { confidenceThreshold: threshold } : undefined);
  console.log(result.text);
  console.log(
    `\n[intent: ${result.intent.intentType}, includeOntology: ${result.intent.includeOntology}, threshold: ${result.intent.confidenceThreshold}]`,
  );
  if (result.paths.length) {
    console.log("Path(s):");
    for (const p of result.paths) console.log(`  ${p.text}`);
  } else {
    console.log("Path(s): (none)");
  }
}

main();
