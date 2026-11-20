#!/usr/bin/env node
/**
 * ansci-construction-challenge.mjs — depth programme stage 3
 * evaluation (Part C.2 + Part D / v9 adoption): construction repair.
 *
 * Set: scripts/construction-challenge.tsv — the 12 holdout parse
 * failures (census), the v9 §7 adversarial pairs (both members),
 * controls, and the 2 generation crashes (engineering ledger, scored
 * separately). Frozen; sha256 manifest hash recorded in the report.
 * Authorship caveat as in stages 1–2: authored by the builder,
 * sealed against post-hoc editing, not an independently authored
 * C.5 set.
 *
 * Four ledgers (v9 §7, adopted): construction recognition (census
 * ≥90%); semantic representation (adversarial pairs — a pair passes
 * only if BOTH members receive their distinct records); feature
 * preservation + holdout parse rate recomputed on the frozen
 * corpora; regression (controls must hold, demo exhibit cited).
 * Writes docs/ansci/construction-challenge.md.
 * Run: npm run ansci:construction
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "../dist/src/ansci/parse.js";
import { generate } from "../dist/src/ansci/generate.js";
import { extractFeatures, compareFeatures } from "../dist/src/ansci/features.js";
import { enableWordnetLexicon } from "../dist/src/ansci/wordnet-lex.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const sha = (p) => createHash("sha256").update(readFileSync(p, "utf-8")).digest("hex").slice(0, 16);

enableWordnetLexicon(true);

/* ---- the frozen set ---- */
const setPath = join(root, "scripts/construction-challenge.tsv");
const items = [];
for (const line of readFileSync(setPath, "utf-8").split(/\r?\n/)) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [lang, cls, sentence, probes, note] = line.split("\t");
  items.push({ lang, cls, sentence, probes: (probes ?? "").split(";").map((s) => s.trim()).filter(Boolean), note: note ?? "" });
}

/** Non-generation probes against one parse. Returns failure strings. */
function recordFailures(p, probes) {
  const fails = [];
  const rootNode = p.meaning.nodes.find((n) => n.id === p.meaning.rootId);
  for (const probe of probes) {
    if (probe.startsWith("gen") || probe === "rt") continue;
    const [key, val] = probe.split(/=(.*)/s).slice(0, 2).map((s) => s ?? "");
    const value = (probe.includes("=") ? probe.slice(probe.indexOf("=") + 1) : "");
    switch (key) {
      case "root":
        if (rootNode.lemma !== value) fails.push(`root=${rootNode.lemma}`);
        break;
      case "edge":
        if (!p.meaning.edges.some((e) => e.relation === value)) fails.push(`no edge ${value}`);
        break;
      case "noedge":
        if (p.meaning.edges.some((e) => e.relation === value)) fails.push(`edge ${value} present`);
        break;
      case "node":
        // Lemmas are lowercase by convention; the probe names the word.
        if (!p.meaning.nodes.some((n) => n.lemma.toLowerCase() === value.toLowerCase())) fails.push(`no node ${value}`);
        break;
      case "query": {
        const [rel, type] = value.split(":");
        if (!p.query || p.query.relation !== rel || p.query.expectedType !== type) fails.push(`query=${JSON.stringify(p.query ?? null)}`);
        break;
      }
      case "noquery":
        if (p.query) fails.push(`query=${JSON.stringify(p.query)}`);
        break;
      case "act":
        if (p.discourseAct !== value) fails.push(`act=${p.discourseAct ?? "none"}`);
        break;
      case "noact":
        if (p.discourseAct) fails.push(`act=${p.discourseAct}`);
        break;
      default:
        fails.push(`unknown probe ${probe}`);
    }
  }
  return fails;
}

const rows = [];
for (const item of items) {
  let p;
  try { p = parse(item.sentence, item.lang); } catch (e) { rows.push({ item, pass: false, detail: `parse: ${e.message}` }); continue; }
  const fails = recordFailures(p, item.probes);
  let generated;
  let genError;
  try { generated = generate(p); } catch (e) { genError = e.message; }
  for (const probe of item.probes) {
    if (probe === "genok") { if (genError) fails.push(`generation threw: ${genError}`); }
    else if (probe.startsWith("gen=")) { if (generated !== probe.slice(4)) fails.push(`gen=${generated ?? "THREW"}`); }
  }
  if (item.probes.includes("rt")) {
    if (genError || generated === undefined) fails.push("rt: no generation to reparse");
    else {
      try {
        const p1 = parse(generated, item.lang);
        for (const f of recordFailures(p1, item.probes)) fails.push(`rt: ${f}`);
      } catch (e) { fails.push(`rt: reparse failed: ${e.message}`); }
    }
  }
  rows.push({ item, pass: fails.length === 0, detail: fails.join("; ") || "—", generated });
}

const byClass = (cls) => rows.filter((r) => r.item.cls === cls);
const census = byClass("census");
const adversarial = byClass("adversarial");
const controls = byClass("control");
const crashfix = byClass("crashfix");
const censusPass = census.filter((r) => r.pass).length;
/* Adversarial pairs, by the v9 §7 pairings (matched on sentence). */
const PAIRS = [
  ["Who is Sarah?", "Sarah is a doctor."],
  ["Where are you?", "Who are you?"],
  ["What's in it?", "What is it?"],
  ["What is the opposite of hot?", "What is hot?"],
  ["What about coffee?", "Coffee."],
  ["Why?", "What about it?"],
];
const rowOf = (s) => rows.find((r) => r.item.sentence === s);
const pairResults = PAIRS.map(([a, b]) => ({ a, b, pass: (rowOf(a)?.pass ?? false) && (rowOf(b)?.pass ?? false) }));
const pairsPass = pairResults.filter((x) => x.pass).length;

/* ---- corpora non-regression ---- */
function holdoutCorpus() {
  const scripts = join(root, "scripts");
  const files = [
    ...readdirSync(scripts).filter((f) => /^cskg-evaluation.*\.txt$/.test(f)).sort().map((f) => join(scripts, f)),
    join(scripts, "cskg-explore.txt"),
    ...readdirSync(join(scripts, "probes")).filter((f) => f.endsWith(".txt")).sort().map((f) => join(scripts, "probes", f)),
  ];
  const seen = new Set(); const out = [];
  for (const file of files) {
    for (const raw of readFileSync(file, "utf-8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      if (/^(you|bot|ansci|user|system|human|assistant)\s*:/i.test(line)) continue;
      if (line.includes("#!") || line.startsWith(">")) continue;
      if (!/[a-z]/i.test(line)) continue;
      const s = line.replace(/\s+/g, " ");
      if (seen.has(s)) continue;
      seen.add(s); out.push({ lang: "en", sentence: s });
      if (out.length >= 80) return out;
    }
  }
  return out;
}
function preservation(corpus) {
  let parsed = 0, atoms = 0, preserved = 0;
  for (const { lang, sentence } of corpus) {
    let p0;
    try { p0 = parse(sentence, lang); } catch { continue; }
    parsed++;
    let regenerated;
    try { regenerated = generate(p0); } catch { continue; }
    let p1;
    try { p1 = parse(regenerated, lang); } catch { continue; }
    const cmp = compareFeatures(extractFeatures(p0), extractFeatures(p1));
    atoms += cmp.total0; preserved += cmp.records.filter((x) => x.outcome === "preserved").length;
  }
  return { parsed, total: corpus.length, rate: atoms ? preserved / atoms : 0 };
}
const holdout = preservation(holdoutCorpus());

/* ---- report ---- */
const L = [];
L.push("# Construction challenge — depth programme stage 3 (Part C.2 + Part D)");
L.push("");
L.push(`Set: \`scripts/construction-challenge.tsv\` (sha256 ${sha(setPath)}). Census = the 12 frozen-holdout parse failures; adversarial = the v9 §7 pairs; crashfix = the 2 stage-0 F3 generation crashes, scored as engineering.`);
L.push("Authorship caveat (standing): authored by the builder against the v9 design, sealed by the hash above; not an independently authored C.5 set. Scores are internal evidence (C.5 demotions).");
L.push("");
L.push("## Ledger 1 — construction recognition (census, target ≥90%)");
L.push("");
L.push(`**${censusPass}/${census.length} = ${pct(censusPass / census.length)}** — ${censusPass / census.length >= 0.9 ? "target met" : "TARGET NOT MET"}.`);
L.push("");
L.push("## Ledger 2 — semantic representation (adversarial pairs, target 6/6)");
L.push("");
L.push(`**${pairsPass}/6 pairs** — ${pairsPass === 6 ? "no family cross-classification on the pairs" : "PAIRS INCOMPLETE — see per-item table"}.`);
for (const pr of pairResults) L.push(`- ${pr.pass ? "✓" : "✗"} ${pr.a} ‖ ${pr.b}`);
L.push("");
L.push("## Ledger 3 — feature preservation and parse rate (frozen holdout)");
L.push("");
L.push(`Holdout parse rate **${holdout.parsed}/${holdout.total} = ${pct(holdout.parsed / holdout.total)}** (stage-2 close: 68/80 = 85.0%); pooled feature preservation on parsed round trips **${pct(holdout.rate)}** (stage-2 close: 95.9%).`);
L.push("");
L.push("## Ledger 4 — regression");
L.push("");
L.push(`Controls: **${controls.filter((r) => r.pass).length}/${controls.length}** pass (required: all). Crashfix (engineering): **${crashfix.filter((r) => r.pass).length}/${crashfix.length}** generate without throwing.`);
L.push("");
L.push("## Per-item results");
L.push("");
L.push("| Class | Sentence | Result | Detail | Generation |");
L.push("| --- | --- | --- | --- | --- |");
for (const r of rows) {
  L.push(`| ${r.item.cls} | ${r.item.sentence} | ${r.pass ? "pass" : "**FAIL**"} | ${r.detail} | ${r.generated ?? "—"} |`);
}
L.push("");
L.push("## Notes");
L.push("");
L.push("- \"What's in it?\" generates in the canonical uncontracted form (\"What is in it?\"); the record round-trips identically, so the rt probes pass. Contraction is a connective-layer spelling, not a meaning distinction.");
L.push("- Case 12 (population of Chicago) round-trips exactly, ahead of the A3 minimum (parse-side preservation); its precision/temporal atoms join stage 5's family accounting regardless — a round trip here does not mint the feature atoms.");
L.push("- The two F3 crashes were parse defects wearing generation costumes: the inverted subject was dropped at parse (both), and the imperative's verb slot was stolen by a later noun with verb synsets (\"Tell me…\"). Generation gained only a defensive fallback; the fixes are at parse.");
L.push("- Adjacent gap observed, out of scope: possessive \"has\" as a main verb (\"She has a cold.\") still fails — \"has\" is classified as an auxiliary only. Not a census case; recorded for a later tranche.");
L.push("");
writeFileSync(join(root, "docs/ansci/construction-challenge.md"), L.join("\n"));
console.log(L.slice(0, 30).join("\n"));
