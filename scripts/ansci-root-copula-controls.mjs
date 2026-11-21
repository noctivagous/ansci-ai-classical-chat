#!/usr/bin/env node
/**
 * Run the mutable development controls for English noun/verb root selection
 * and copular predicates. This is a diagnostic suite, not a sealed or held-out
 * evaluation. Update the fixture intentionally as parser behavior evolves.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "../dist/src/ansci/parse.js";
import { enableWordnetLexicon } from "../dist/src/ansci/wordnet-lex.js";

enableWordnetLexicon(true);
const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(resolve(here, "../data/ansci/root-copula-controls-dev.json"), "utf8"));
const failuresByFamily = {};

for (const c of fixture.cases) {
  let result;
  try {
    const p = parse(c.sentence, "en");
    const nodes = p.meaning?.nodes ?? [];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const lemma = (id) => (byId.get(id)?.lemma ?? "?").toLowerCase();
    const rootId = p.meaning?.rootId;
    const root = rootId ? lemma(rootId) : null;
    const lemmas = nodes.map((n) => n.lemma.toLowerCase());
    const edges = (p.meaning?.edges ?? []).map((e) => [lemma(e.from), e.relation, lemma(e.to)]);
    const failures = [];
    if (root !== c.expectedRoot) failures.push(`root: expected ${c.expectedRoot}, got ${root}`);
    for (const n of c.requiredNodes ?? []) if (!lemmas.includes(n)) failures.push(`missing node ${n}`);
    for (const [a, r, b] of c.requiredEdges ?? []) {
      if (!edges.some(([x, y, z]) => x === a && y === r && z === b)) failures.push(`missing edge ${a}-${r}-${b}`);
    }
    result = { id: c.id, family: c.family, sentence: c.sentence, pass: failures.length === 0, failures, root, lemmas, edges };
    if (failures.length) failuresByFamily[c.family] = (failuresByFamily[c.family] ?? 0) + 1;
  } catch (error) {
    result = { id: c.id, family: c.family, sentence: c.sentence, pass: false, failures: [`parse failed: ${String(error?.message ?? error)}`] };
    failuresByFamily[c.family] = (failuresByFamily[c.family] ?? 0) + 1;
  }
  console.log(JSON.stringify(result));
}

const failed = Object.values(failuresByFamily).reduce((a, b) => a + b, 0);
console.log(JSON.stringify({ suite: fixture.id, cases: fixture.cases.length, passed: fixture.cases.length - failed, failed, failuresByFamily }));
if (failed) process.exitCode = 1;
