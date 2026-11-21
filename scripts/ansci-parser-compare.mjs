#!/usr/bin/env node
/**
 * Small repeatable parser comparison. Targets are provisional annotations,
 * not an independently adjudicated gold standard. AnSci's parser is always
 * run; set LINK_GRAMMAR_BIN to a Link Grammar `link-parser` executable to
 * add its linkage counts. LINK_GRAMMAR_CWD may point at the dictionary root.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse } from "../dist/src/ansci/parse.js";

const here = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(resolve(here, "../data/ansci/parser-comparison-v1.json"), "utf8"));
const linkBin = process.env.LINK_GRAMMAR_BIN;
const linkCwd = process.env.LINK_GRAMMAR_CWD ?? (linkBin ? dirname(dirname(resolve(linkBin))) : process.cwd());

for (const item of cases) {
  let ansci;
  try {
    const p = parse(item.text, item.language);
    const nodes = p.meaning?.nodes ?? [];
    const root = nodes.find((n) => n.id === p.meaning?.rootId);
    ansci = {
      root: root?.lemma ?? null,
      nodes: nodes.map((n) => n.lemma),
      edges: (p.meaning?.edges ?? []).map((e) => {
        const target = nodes.find((n) => n.id === e.to);
        return `${e.relation}:${target?.lemma ?? "?"}`;
      }),
      negated: root?.states?.negated ?? false,
      embeddedTask: p.embeddedTask ?? null,
    };
  } catch (error) {
    ansci = { error: error instanceof Error ? error.message : String(error) };
  }

  let link = "not-run (set LINK_GRAMMAR_BIN)";
  if (linkBin && item.language === "en") {
    const run = spawnSync(resolve(linkBin), ["en"], {
      cwd: linkCwd,
      input: `!graphics=0\n!links=1\n${item.text}\n`,
      encoding: "utf8",
      timeout: 15000,
    });
    if (run.error) {
      link = `error: ${run.error.message}`;
    } else {
      const stdout = run.stdout ?? "";
      const counts = stdout.match(/Found (\d+) linkages? \((\d+) had no P\.P\. violations\)/);
      const first = stdout.match(/Linkage 1, cost vector = \(([^)]*)\)/);
      link = counts
        ? `linkages=${counts[1]}, no-PP=${counts[2]}, first-cost=${first?.[1] ?? "unknown"}`
        : "no linkage reported";
    }
  } else if (linkBin) {
    link = "not-applicable (English parser only)";
  }

  console.log(JSON.stringify({ id: item.id, language: item.language, text: item.text, target: item.target, ansci, link }));
}
