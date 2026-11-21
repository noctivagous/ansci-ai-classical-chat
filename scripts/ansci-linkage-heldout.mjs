#!/usr/bin/env node
/**
 * ansci-linkage-heldout.mjs — the coverage slice's held-out
 * set: seal verification and scoring (stage 2 baseline and the
 * per-family routing gates of stage 3).
 *
 * The set (data/ansci/linkage-heldout-v1.json) is builder-
 * authored and was sealed BEFORE any family routing work; it
 * is not independently authored, and the record says so. The
 * seal is the sha256 of the canonical stringify of
 * {id, version, cases}, on the sealed-set precedent
 * (src/ansci/sealed.ts): any later edit to a case breaks it.
 *
 * Scoring is content preservation, never linkage counts:
 *   graph  — the current parse's meaning graph against the
 *            case's target (required nodes/edges present,
 *            loose pairs directly edged, at least one of each
 *            alternative group, forbidden content absent,
 *            negation as authored);
 *   shadow — the solver (generous bounds: the solver's rules,
 *            not its chat-duty budget) against the case's
 *            expected link triples and PP attachment.
 * Exit code is non-zero only when the seal does not verify.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, setLinkageRouting } from "../dist/src/ansci/parse.js";
import { solveLinkage } from "../dist/src/ansci/linkage.js";
import { enableWordnetLexicon } from "../dist/src/ansci/wordnet-lex.js";

enableWordnetLexicon(true);
if (process.argv.includes("--route-f1")) setLinkageRouting("f1", true);
const here = dirname(fileURLToPath(import.meta.url));
const SET_PATH = resolve(here, "../data/ansci/linkage-heldout-v1.json");
const set = JSON.parse(readFileSync(SET_PATH, "utf8"));

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
export function sealOf(body) {
  return createHash("sha256").update(canonical(body)).digest("hex");
}

const body = { id: set.id, version: set.version, cases: set.cases };
if (process.argv.includes("--seal")) {
  set.seal = sealOf(body);
  writeFileSync(SET_PATH, JSON.stringify(set, null, 2) + "\n");
  console.log(`sealed ${set.id}: ${set.seal}`);
  process.exit(0);
}
const sealOk = set.seal === sealOf(body);
console.log(JSON.stringify({ set: set.id, sealOk, seal: set.seal, cases: set.cases.length }));

const ROOMY = { lengthCap: 24, perWordCap: 4000, searchBudget: 60_000, countCap: 512, timeBudgetMs: 10_000, weightCap: 10_000_000 };
const tokenize = (text) => text.replace(/([.?!,;:])/g, " $1 ").split(/\s+/).filter(Boolean);

function graphOf(sentence) {
  try {
    const p = parse(sentence, "en");
    const nodes = p.meaning?.nodes ?? [];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const lemma = (id) => (byId.get(id)?.lemma ?? "?").toLowerCase();
    const edges = (p.meaning?.edges ?? []).map((e) => [lemma(e.from), e.relation, lemma(e.to)]);
    const negated = nodes.some((n) => n.negated || n.states?.negated);
    return { ok: true, lemmas: nodes.map((n) => n.lemma.toLowerCase()), edges, negated, shadow: p.linkageShadow };
  } catch (err) {
    return { ok: false, error: String(err?.message ?? err), lemmas: [], edges: [], negated: false };
  }
}

function checkTarget(g, target) {
  const failures = [];
  if (!g.ok) return [`parse failed: ${g.error}`];
  const hasEdge = (a, r, b) => g.edges.some(([x, y, z]) => x === a && y === r && z === b);
  const hasLoose = (a, b) => g.edges.some(([x, , z]) => (x === a && z === b) || (x === b && z === a));
  for (const n of target.requiredNodes ?? []) if (!g.lemmas.includes(n)) failures.push(`missing node ${n}`);
  for (const n of target.forbiddenNodes ?? []) if (g.lemmas.includes(n)) failures.push(`forbidden node ${n} present`);
  for (const [a, r, b] of target.requiredEdges ?? []) if (!hasEdge(a, r, b)) failures.push(`missing edge ${a}-${r}-${b}`);
  for (const [a, r, b] of target.forbiddenEdges ?? []) if (hasEdge(a, r, b)) failures.push(`forbidden edge ${a}-${r}-${b} present`);
  for (const [a, b] of target.requiredLoose ?? []) if (!hasLoose(a, b)) failures.push(`no direct edge between ${a} and ${b}`);
  for (const group of target.requiredEdgeAlternatives ?? []) {
    if (!group.some(([a, r, b]) => hasEdge(a, r, b))) failures.push(`no alternative held: ${group.map((e) => e.join("-")).join(" | ")}`);
  }
  if ((target.negation ?? false) !== g.negated) failures.push(`negation: target ${target.negation ?? false}, graph ${g.negated}`);
  return failures;
}

function checkShadow(sentence, c) {
  const s = solveLinkage(tokenize(sentence), ROOMY);
  if (!s) return { status: "absent", agreed: 0, expected: (c.shadowExpect ?? []).length, failures: ["no shadow record"] };
  const failures = [];
  let agreed = 0;
  for (const [a, fam, b] of c.shadowExpect ?? []) {
    if (fam === "touch") {
      const hit = s.links.some((l) => s.tokens[l.left] === b || s.tokens[l.right] === b);
      if (hit) agreed++;
      else failures.push(`no link touches ${b}`);
      continue;
    }
    const hit = s.links.some(
      (l) => s.tokens[l.left] === a && s.tokens[l.right] === b && (fam === "*" || l.family === fam),
    );
    if (hit) agreed++;
    else failures.push(`missing link ${a}-${fam}-${b}`);
  }
  if (c.shadowAttach) {
    const { prep, attachTo } = c.shadowAttach;
    const prepIdx = s.tokens.indexOf(prep);
    const leftLink = s.links.find((l) => l.right === prepIdx);
    const partner = leftLink ? s.tokens[leftLink.left] : null;
    if (partner === attachTo) agreed++;
    else failures.push(`attachment: ${prep} links left to ${partner}, target ${attachTo}`);
  }
  const expected = (c.shadowExpect ?? []).length + (c.shadowAttach ? 1 : 0);
  return { status: s.status, agreed, expected, failures, unused: s.unused, boundsHit: s.boundsHit };
}

const byFamily = {};
for (const c of set.cases) {
  const g = graphOf(c.sentence);
  const failures = checkTarget(g, c.target);
  const shadow = checkShadow(c.sentence, c);
  const row = {
    id: c.id,
    family: c.family,
    sentence: c.sentence,
    graphPass: failures.length === 0,
    graphFailures: failures,
    graphEdges: g.edges.map((e) => e.join(":")),
    shadowStatus: shadow.status,
    shadowAgreed: `${shadow.agreed}/${shadow.expected}`,
    shadowFailures: shadow.failures,
  };
  byFamily[c.family] ??= { cases: 0, graphPass: 0, shadowFull: 0 };
  byFamily[c.family].cases++;
  if (row.graphPass) byFamily[c.family].graphPass++;
  if (shadow.agreed === shadow.expected && shadow.status === "complete") byFamily[c.family].shadowFull++;
  console.log(JSON.stringify(row));
}
console.log(JSON.stringify({ byFamily, sealOk }));
if (!sealOk) process.exit(2);
