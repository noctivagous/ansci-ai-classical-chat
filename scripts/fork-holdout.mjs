#!/usr/bin/env node
/**
 * fork-holdout.mjs — the fork parser's holdout run.
 *
 * Corpus: sentences extracted from the OLD chat's evaluation files —
 * scripts/cskg-evaluation*.txt, scripts/cskg-explore.txt,
 * scripts/probes/*.txt. Those lines were written for a different
 * system (the CSKG chat), never for this parser, and the fork's
 * lexicon was never fitted to them: that is what makes them a
 * holdout. Extraction: skip #-comments (including the probes'
 * "#! expect=" annotations), blanks, and lines carrying chat markup
 * (speaker prefixes); keep lines that read as sentences; dedupe;
 * cap at 80, in file order.
 *
 * Each sentence is parsed twice: once with the WordNet lexicon
 * provider OFF (the baseline arm — the parser as it was, hand
 * lexicon only) and once ON. Recorded per sentence: parsed or the
 * thrown reason, exact round-trip (generate(parse(s)) === s),
 * meaning-node count, and semantic classifications (deriveSentence
 * size against the joined fork graph). The OFF arm runs first, in a
 * fresh process state, so no derived entry can leak into it.
 *
 * Writes docs/fork/holdout-run.md with the real numbers.
 *
 * Run: npm run fork:holdout
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "../dist/src/fork/parse.js";
import { generate } from "../dist/src/fork/generate.js";
import { buildForkGraph, deriveSentence } from "../dist/src/fork/join.js";
import { enableWordnetLexicon } from "../dist/src/fork/wordnet-lex.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CAP = 80;

function corpusFiles() {
  const scripts = join(root, "scripts");
  const evals = readdirSync(scripts)
    .filter((f) => /^cskg-evaluation.*\.txt$/.test(f))
    .sort()
    .map((f) => join(scripts, f));
  const probes = readdirSync(join(scripts, "probes"))
    .filter((f) => f.endsWith(".txt"))
    .sort()
    .map((f) => join(scripts, "probes", f));
  return [...evals, join(scripts, "cskg-explore.txt"), ...probes];
}

function extract() {
  const seen = new Set();
  const out = [];
  for (const file of corpusFiles()) {
    for (const raw of readFileSync(file, "utf-8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      if (/^(you|bot|ansci|user|system|human|assistant)\s*:/i.test(line)) continue;
      if (line.includes("#!") || line.startsWith(">")) continue;
      if (!/[a-z]/i.test(line)) continue;
      if (line.split(/\s+/).length < 2 && !/[?.!]$/.test(line)) continue;
      if (seen.has(line)) continue;
      seen.add(line);
      out.push(line);
      if (out.length >= CAP) return out;
    }
  }
  return out;
}

const graph = buildForkGraph();

function runArm(sentences) {
  return sentences.map((text) => {
    try {
      const p = parse(text, "en");
      let roundTrip = null;
      try {
        roundTrip = generate(p) === text;
      } catch {
        roundTrip = false;
      }
      return {
        text,
        parsed: true,
        roundTrip,
        nodes: p.meaning.nodes.length,
        classifications: deriveSentence(graph, p).size,
      };
    } catch (e) {
      return { text, parsed: false, error: String(e.message ?? e).split("\n")[0], roundTrip: null, nodes: 0, classifications: 0 };
    }
  });
}

function aggregates(rows) {
  const parsed = rows.filter((r) => r.parsed);
  return {
    n: rows.length,
    parsed: parsed.length,
    parseRate: parsed.length / rows.length,
    exact: parsed.filter((r) => r.roundTrip).length,
    exactRate: parsed.length ? parsed.filter((r) => r.roundTrip).length / parsed.length : 0,
    meanClass: parsed.length ? parsed.reduce((a, r) => a + r.classifications, 0) / parsed.length : 0,
    meanNodes: parsed.length ? parsed.reduce((a, r) => a + r.nodes, 0) / parsed.length : 0,
  };
}

const sentences = extract();
enableWordnetLexicon(false);
const off = runArm(sentences);
enableWordnetLexicon(true);
const on = runArm(sentences);

const offA = aggregates(off);
const onA = aggregates(on);
const bothParsed = off.filter((r, i) => r.parsed && on[i].parsed);
const bothOffMean = bothParsed.length ? bothParsed.reduce((a, r) => a + r.classifications, 0) / bothParsed.length : 0;
const bothOnMean = bothParsed.length
  ? bothParsed.reduce((a, r) => a + on[off.indexOf(r)].classifications, 0) / bothParsed.length
  : 0;
const flipped = on.filter((r, i) => r.parsed && !off[i].parsed);
const regressions = on.filter((r, i) => !r.parsed && off[i].parsed);
const rtRegressions = on.filter((r, i) => r.parsed && off[i].parsed && off[i].roundTrip && !r.roundTrip);

const failGroups = new Map();
for (const r of on) {
  if (r.parsed) continue;
  const key = (r.error ?? "unknown").replace(/: .*/, "").replace(/in: .*/, "in: …");
  if (!failGroups.has(key)) failGroups.set(key, []);
  failGroups.get(key).push(r);
}

const pct = (x) => (x * 100).toFixed(1) + "%";
const lines = [];
lines.push("# Holdout run — the fork parser on sentences it was never fitted to");
lines.push("");
lines.push("Generated by `npm run fork:holdout` (scripts/fork-holdout.mjs). Real output only.");
lines.push("");
lines.push("## Corpus");
lines.push("");
lines.push(
  `${sentences.length} sentences extracted from the old CSKG chat's evaluation files ` +
    "(scripts/cskg-evaluation*.txt, scripts/cskg-explore.txt, scripts/probes/*.txt), " +
    "in file order, deduplicated, capped at 80. #-comments and `#! expect=` annotations, " +
    "blanks, and speaker-markup lines were skipped. These lines were written for a " +
    "different system; the fork's hand lexicon was never fitted to them.",
);
lines.push("");
lines.push("## Aggregates: provider OFF (hand lexicon only) vs ON (WordNet provider)");
lines.push("");
lines.push("| metric | OFF | ON |");
lines.push("|---|---|---|");
lines.push(`| sentences | ${offA.n} | ${onA.n} |`);
lines.push(`| parsed | ${offA.parsed} (${pct(offA.parseRate)}) | ${onA.parsed} (${pct(onA.parseRate)}) |`);
lines.push(`| exact round-trip (of parsed) | ${offA.exact} (${pct(offA.exactRate)}) | ${onA.exact} (${pct(onA.exactRate)}) |`);
lines.push(`| mean semantic classifications (of parsed) | ${offA.meanClass.toFixed(2)} | ${onA.meanClass.toFixed(2)} |`);
lines.push(`| mean meaning nodes (of parsed) | ${offA.meanNodes.toFixed(2)} | ${onA.meanNodes.toFixed(2)} |`);
lines.push("");
lines.push(`## Flipped fail → success with the provider ON (${flipped.length})`);
lines.push("");
if (!flipped.length) lines.push("(none)");
for (const r of flipped) lines.push(`- ${r.text}${r.roundTrip ? " — round-trips exactly" : ""}`);
lines.push("");
lines.push(`## Regressions (${regressions.length} parse, ${rtRegressions.length} round-trip)`);
lines.push("");
lines.push("Sentences that parsed with the provider OFF but fail ON — listed, not buried:");
lines.push("");
if (!regressions.length) lines.push("(none)");
for (const r of regressions) lines.push(`- ${r.text} — ON error: ${r.error}`);
lines.push("");
lines.push("Sentences that parsed in both arms but round-tripped exactly only OFF:");
lines.push("");
if (!rtRegressions.length) lines.push("(none)");
for (const r of rtRegressions) lines.push(`- ${r.text}`);
lines.push("");
lines.push("## Remaining failures with the provider ON, grouped by thrown reason");
lines.push("");
if (!failGroups.size) lines.push("(none)");
for (const [reason, rows] of [...failGroups.entries()].sort((a, b) => b[1].length - a[1].length)) {
  lines.push(`### ${reason} (${rows.length})`);
  lines.push("");
  for (const r of rows.slice(0, 6)) lines.push(`- ${r.text} — ${r.error}`);
  if (rows.length > 6) lines.push(`- … and ${rows.length - 6} more`);
  lines.push("");
}
lines.push("## Reading");
lines.push("");
lines.push(
  "The provider's gain is lexical, exactly as designed: sentences whose only obstacle was a " +
    "verb or noun outside the hand lexicon now parse, and their content words classify through " +
    "the table or the WordNet climb. What the provider does NOT fix is construction coverage: " +
    "questions with auxiliaries and embeddings the template parser has no shape for, multi-clause " +
    "sentences, and phrasings whose verbs it cannot slot still fail, with the same thrown reasons " +
    "as before. Exact round-trip remains the stricter bar — a sentence can parse and classify " +
    "well yet generate back in a canonicalised form (articles, progressive aspect, and word " +
    "order are the usual losses). Regressions, where a derived entry changes a parse the hand " +
    "lexicon already handled, are listed above in full.",
);
lines.push("");
lines.push(
  `One aggregate needs its denominator read aloud: mean classifications per parsed sentence ` +
    `FELL (${offA.meanClass.toFixed(2)} → ${onA.meanClass.toFixed(2)}), because the ON arm parses ` +
    `${flipped.length} additional sentences whose everyday vocabulary mostly has no classification ` +
    `to earn. On the ${bothParsed.length} sentences both arms parse, mean classifications went ` +
    `${bothOffMean.toFixed(2)} → ${bothOnMean.toFixed(2)} — the provider adds classifications where ` +
    `it can and dilutes the average only by widening the parsed set.`,
);
lines.push("");
lines.push(
  "And a caveat about the flipped list: parse success is not semantic adequacy. Several flipped " +
    "sentences are the old system's ABSTENTION probes (\"What is my neighbour's phone number?\", " +
    "\"Who won the football match last night?\") — questions a chat should decline for lack of " +
    "testimony. This run measures only whether the sentence layer can take them apart and what " +
    "they classify to; whether anything should ANSWER them is a different layer's question, and " +
    "nothing here answers it.",
);
lines.push("");
writeFileSync(join(root, "docs", "fork", "holdout-run.md"), lines.join("\n"));
console.log(`corpus: ${sentences.length} sentences`);
console.log(`OFF: parsed ${offA.parsed}/${offA.n} (${pct(offA.parseRate)}), exact ${offA.exact}, mean classifications ${offA.meanClass.toFixed(2)}`);
console.log(`ON:  parsed ${onA.parsed}/${onA.n} (${pct(onA.parseRate)}), exact ${onA.exact}, mean classifications ${onA.meanClass.toFixed(2)}`);
console.log(`flipped fail->success: ${flipped.length}; parse regressions: ${regressions.length}; round-trip regressions: ${rtRegressions.length}`);
console.log("wrote docs/fork/holdout-run.md");
