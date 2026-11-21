#!/usr/bin/env node
/** Offline proposal adapter for Link Grammar 5.x CLI output. */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse } from "../dist/src/ansci/parse.js";

const here = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(resolve(here, "../data/ansci/parser-comparison-v1.json"), "utf8"));
const bin = process.env.LINK_GRAMMAR_BIN;
if (!bin) throw Error("Set LINK_GRAMMAR_BIN to the Link Grammar link-parser executable");
const cwd = process.env.LINK_GRAMMAR_CWD ?? dirname(dirname(resolve(bin)));
const canonicalSubject = new Set(["S"]);
const canonicalObject = new Set(["O", "Os"]);

function linksFrom(text) {
  const run = spawnSync(resolve(bin), ["en"], { cwd, input: `!graphics=0\n!links=1\n${text}\n`, encoding: "utf8", timeout: 15000 });
  if (run.error) throw run.error;
  const out = run.stdout ?? "";
  const found = out.match(/Found (\d+) linkages? \((\d+) had no P\.P\. violations\)/);
  const cost = out.match(/Linkage 1, cost vector = \(([^)]*)\)/)?.[1] ?? "unknown";
  const first = out.split(/Linkage 1, cost vector = \([^)]*\)\n/)[1]?.split(/\n\s*\nBye/)[0] ?? "";
  const raw = [];
  for (const line of first.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 5 || cols[0] !== "(m)") continue;
    raw.push({ left: cols[1], leftLink: cols[2], rightLink: cols[4], right: cols[5] });
  }
  return { found: found ? Number(found[1]) : 0, noPp: found ? Number(found[2]) : 0, cost, raw };
}

function proposals(raw) {
  const out = [];
  for (const link of raw) {
    const leftVerb = /(?:^|\.)v(?:-|$)/.test(link.left);
    const rightVerb = /(?:^|\.)v(?:-|$)/.test(link.right);
    const label = [link.leftLink, link.rightLink];
    if (canonicalSubject.has(link.leftLink) || canonicalSubject.has(link.rightLink)) {
      if (leftVerb !== rightVerb) out.push({ from: leftVerb ? link.left : link.right, to: leftVerb ? link.right : link.left, relation: "agent", raw: link });
    } else if (canonicalObject.has(link.leftLink) || canonicalObject.has(link.rightLink)) {
      if (leftVerb !== rightVerb) out.push({ from: leftVerb ? link.left : link.right, to: leftVerb ? link.right : link.left, relation: "patient", raw: link });
    }
    // Link variants such as I*j, Ox, SIp and coordination links are
    // deliberately retained in raw output but not guessed into roles.
    void label;
  }
  return out;
}

for (const item of cases.filter((x) => x.language === "en")) {
  try {
    const link = linksFrom(item.text);
    const proposed = proposals(link.raw);
    let ansci;
    try {
      const p = parse(item.text, "en");
      const nodes = p.meaning.nodes;
      ansci = p.meaning.edges.map((e) => ({ from: nodes.find(n => n.id === e.from)?.lemma, relation: e.relation, to: nodes.find(n => n.id === e.to)?.lemma }));
    } catch (e) { ansci = { error: e.message }; }
    console.log(JSON.stringify({ id: item.id, text: item.text, linkageCount: link.found, noPpCount: link.noPp, firstLinkageCost: link.cost, proposals: proposed, ansciEdges: ansci }));
  } catch (e) { console.log(JSON.stringify({ id: item.id, text: item.text, error: e.message })); }
}
