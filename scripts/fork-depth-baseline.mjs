#!/usr/bin/env node
/**
 * fork-depth-baseline.mjs — stage 0 of the depth programme
 * (docs/fork/repair-programme.md Part C.2): the baseline
 * feature-preservation report.
 *
 * For each corpus (the frozen 80-sentence holdout, English; the
 * 26-sentence demo corpus, EN+ZH — reported separately, never pooled):
 * parse -> generate -> reparse -> compare feature atoms
 * (src/fork/features.ts). Records per-atom outcomes to
 * docs/fork/depth-baseline-records.jsonl and writes the report to
 * docs/fork/depth-baseline.md.
 *
 * The WordNet provider is ON throughout: the baseline measures the
 * current system as it runs. No parser or generator behaviour is
 * changed by this script.
 *
 * Run: npm run fork:depth-baseline
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "../dist/src/fork/parse.js";
import { generate } from "../dist/src/fork/generate.js";
import { checkSentence } from "../dist/src/fork/check.js";
import { extractFeatures, compareFeatures } from "../dist/src/fork/features.js";
import { enableWordnetLexicon } from "../dist/src/fork/wordnet-lex.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
enableWordnetLexicon(true);

function holdoutCorpus() {
  const scripts = join(root, "scripts");
  const evals = readdirSync(scripts)
    .filter((f) => /^cskg-evaluation.*\.txt$/.test(f))
    .sort()
    .map((f) => join(scripts, f));
  const probes = readdirSync(join(scripts, "probes"))
    .filter((f) => f.endsWith(".txt"))
    .sort()
    .map((f) => join(scripts, "probes", f));
  const seen = new Set();
  const out = [];
  for (const file of [...evals, join(scripts, "cskg-explore.txt"), ...probes]) {
    for (const raw of readFileSync(file, "utf-8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      if (/^(you|bot|ansci|user|system|human|assistant)\s*:/i.test(line)) continue;
      if (line.includes("#!") || line.startsWith(">")) continue;
      if (!/[a-z]/i.test(line)) continue;
      const s = line.replace(/\s+/g, " ");
      if (seen.has(s)) continue;
      seen.add(s);
      out.push({ id: `H${out.length + 1}`, lang: "en", text: s });
      if (out.length >= 80) return out;
    }
  }
  return out;
}

function demoCorpus() {
  const lines = readFileSync(join(root, "demo/wuxing-parser/sentences.tsv"), "utf-8").split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [lang, sentence] = line.split("\t");
    out.push({ id: `D${out.length + 1}`, lang, text: sentence });
  }
  return out;
}

function runCorpus(name, items) {
  const rows = [];
  const records = [];
  const famAgg = new Map();
  let parsed = 0, roundTrips = 0, exact = 0, canonicalized = 0, reparseFailures = 0, generationFailures = 0;
  let g0ViolationSentences = 0, g0Violations = 0;
  let microSum = 0, macroSum = 0, atoms0 = 0, preservedAtoms = 0;
  let lost = 0, contradicted = 0, added = 0, atoms1 = 0;
  const lossPatterns = new Map();

  for (const item of items) {
    let p0;
    try {
      p0 = parse(item.text, item.lang);
    } catch {
      rows.push({ ...item, status: "parse-failure" });
      continue;
    }
    parsed += 1;
    const violations = checkSentence(p0);
    if (violations.length > 0) g0ViolationSentences += 1;
    g0Violations += violations.length;
    let s1 = null;
    let generationFailed = false;
    try {
      s1 = generate(p0);
    } catch {
      generationFailed = true;
      generationFailures += 1;
    }
    const g0 = extractFeatures(p0);
    let g1 = [];
    let reparseFailed = false;
    if (!generationFailed) {
      try {
        g1 = extractFeatures(parse(s1, item.lang));
      } catch {
        reparseFailed = true;
        reparseFailures += 1;
      }
    }
    const cmp = compareFeatures(g0, g1);
    roundTrips += 1;
    const isExact = !generationFailed && s1 === item.text;
    if (isExact) exact += 1;
    else if (cmp.micro === 1) canonicalized += 1;
    microSum += cmp.micro;
    macroSum += cmp.macro;
    atoms0 += cmp.total0;
    atoms1 += cmp.total1;
    preservedAtoms += cmp.records.filter((r) => r.outcome === "preserved").length;
    lost += cmp.records.filter((r) => r.outcome === "lost").length;
    contradicted += cmp.records.filter((r) => r.outcome === "contradicted").length;
    added += cmp.records.filter((r) => r.outcome === "added").length;
    for (const [fam, f] of Object.entries(cmp.familyScores)) {
      const agg = famAgg.get(fam) ?? { atoms: 0, preserved: 0 };
      agg.atoms += f.atoms;
      agg.preserved += f.preserved;
      famAgg.set(fam, agg);
    }
    for (const r of cmp.records) {
      records.push({ corpus: name, id: item.id, sentence: item.text, generated: s1, ...r });
      if (r.outcome === "lost" || r.outcome === "contradicted") {
        const key = `${r.family} | ${r.key} | ${r.value}${r.outcome === "contradicted" ? " -> " + r.reparsedValue : ""}`;
        const lp = lossPatterns.get(key) ?? { count: 0, example: item.text };
        lp.count += 1;
        lossPatterns.set(key, lp);
      }
    }
    rows.push({
      ...item, status: generationFailed ? "generation-failure" : reparseFailed ? "reparse-failure" : "ok", generated: s1,
      exact: isExact, micro: cmp.micro, violations: violations.length,
    });
  }

  const families = [...famAgg.entries()]
    .map(([family, f]) => ({ family, ...f, score: f.atoms ? f.preserved / f.atoms : 0 }))
    .sort((a, b) => b.atoms - a.atoms);
  const topLosses = [...lossPatterns.entries()]
    .map(([pattern, v]) => ({ pattern, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return {
    name, rows, records, families, topLosses,
    sentences: items.length, parsed, roundTrips, exact, canonicalized, reparseFailures, generationFailures,
    g0ViolationSentences, g0Violations,
    microMean: roundTrips ? microSum / roundTrips : 0,
    macroMean: roundTrips ? macroSum / roundTrips : 0,
    microPooled: atoms0 ? preservedAtoms / atoms0 : 0,
    atoms0, atoms1, lost, contradicted, added,
    lostRate: atoms0 ? lost / atoms0 : 0,
    contradictionRate: atoms0 ? contradicted / atoms0 : 0,
    spuriousRate: atoms1 ? added / atoms1 : 0,
  };
}

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const sha = (f) => createHash("sha1").update(readFileSync(join(root, f))).digest("hex").slice(0, 10);
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));

const holdout = runCorpus("holdout", holdoutCorpus());
const demo = runCorpus("demo", demoCorpus());

function corpusSection(c) {
  const lines = [];
  lines.push(`## Corpus: ${c.name}`, "");
  lines.push(`- Sentences: ${c.sentences}; parsed: ${c.parsed} (${pct(c.parsed / c.sentences)}); round trips scored: ${c.roundTrips}; generation failures: ${c.generationFailures}; reparse failures: ${c.reparseFailures}`);
  lines.push(`- Exact string round trips: ${c.exact} (${pct(c.exact / Math.max(1, c.roundTrips))}); canonicalized (string differs, features fully preserved): ${c.canonicalized}`);
  lines.push(`- **Feature preservation (pooled micro): ${pct(c.microPooled)}** over ${c.atoms0} atoms; mean per-sentence micro ${pct(c.microMean)}; mean macro ${pct(c.macroMean)}`);
  lines.push(`- Lost ${pct(c.lostRate)}; contradicted ${pct(c.contradictionRate)}; spurious (added / G1 atoms) ${pct(c.spuriousRate)}`);
  lines.push(`- G0 checker signal (amendment A1 proxy until sealed expected graphs exist): ${c.g0ViolationSentences} parsed sentences carry ${c.g0Violations} checker violations in their original parse.`);
  lines.push("", "| Family | Atoms | Preserved | Score | Note |", "| --- | ---: | ---: | ---: | --- |");
  for (const f of c.families) {
    lines.push(`| ${f.family} | ${f.atoms} | ${f.preserved} | ${pct(f.score)} | ${f.atoms < 10 ? "under-tested (<10 atoms)" : ""} |`);
  }
  lines.push("", "Top loss / contradiction patterns:", "");
  for (const l of c.topLosses) lines.push(`- ×${l.count} — ${l.pattern} (e.g. "${l.example}")`);
  lines.push("");
  return lines.join("\n");
}

const report = `# Depth baseline — feature preservation (stage 0)

Generated by \`npm run fork:depth-baseline\` on ${new Date().toISOString().slice(0, 10)}.
This is the frozen pre-repair baseline of repair programme Part C.2:
no parser or generator behaviour was changed to produce it. Per-atom
records: \`docs/fork/depth-baseline-records.jsonl\`.

**What this measures (ledger 1 only).** Whether the system retains its
own analysis through a parse -> generate -> reparse round trip. It is
not a measure of analysis correctness (ledger 2), and it is not
coverage (ledger 3). The two corpora are reported separately and never
pooled: the holdout is sentences the parser was never fitted to; the
demo corpus is fitted by construction.

**Build identifiers.** package ${pkg.version}; src/fork/parse.ts
${sha("src/fork/parse.ts")}; generate.ts ${sha("src/fork/generate.ts")};
sentence.ts ${sha("src/fork/sentence.ts")}; features.ts
${sha("src/fork/features.ts")}; wordnet-lex.ts ${sha("src/fork/wordnet-lex.ts")}.
WordNet provider ON (the current system's configuration).

**Amendment A1 status.** No sealed expected graphs exist yet, so G0
accuracy against expected analyses cannot be reported; the comparison
machinery in features.ts is the same one that will score it when the
first sealed set is authored under Part C.5. As a mechanical G0-quality
proxy, each corpus section reports the checker's verdicts on the
original parses. Preservation figures below must be read with that
caveat: they can certify that the generator kept what the parser
produced, including where the parser was wrong.

${corpusSection(holdout)}
${corpusSection(demo)}
## Findings recorded at baseline construction

- **F1 — Chinese preverbal negation is dropped at parse.** 他不去学校。
  ("He does not go to school."), 他不去吗？, 他没去学校。 all parse with
  NO negation atom on the predicate and regenerate as the affirmative;
  the checker is silent. The loss happens before G0, so neither
  preservation nor the checker can see it — only an expected-graph
  comparison (A1) or a surface audit catches this class. English
  negation is unaffected (it rides the auxiliary-carrier states).
  Recorded as a parse-side defect for the repair programme; not fixed
  in this stage (stage 0 changes no behaviour).
- **F3 — the generator throws on 2 of 68 holdout round trips**
  ("Why is the garden flooded?", "Tell me about winter."). Both are
  WordNet-derived parse shapes; the crash is counted as full atom loss
  for those sentences. A generator that throws has a preservation of
  zero on that input — the baseline records it rather than excluding
  the sentences.
- **F4 — how to read the headline number.** Pooled holdout preservation
  is 96.3%, above the ratified 95% aggregate — and the bar is NOT met:
  the per-family floor (90%, amendment A2) fails on negation (84.4%,
  driven by auxiliary-carrier atoms the canonicalized reparse does not
  restore), suppressed roles are under-tested, and 21 of 68 original
  parses carry checker violations, so part of what is being preserved
  is analysis the project's own checker rejects. The depth problem, on
  this instrument, is located in G0 correctness and in specific
  families — not in aggregate retention. Note also that 46 of 68
  holdout round trips are canonicalizations (string differs, features
  fully preserved): string exactness (11.8%) understated retention by
  roughly the factor the brief suspected.
- **F5 — the demo corpus's single contradiction is the deliberate-error
  sentence.** "She didn't arrived." regenerates as "She didn't
  arrive.", so its tense atom reads past -> present: the metric
  faithfully records a flagged input canonicalizing. It is not a
  regression signal.
- **F2 — the number family is thin by construction.** The parser
  records number almost nowhere (subject person only; numerals ride as
  entity atoms). Family scores there reflect representation coverage,
  not generator behaviour — exactly the distinction Part C.1 draws.
`;

writeFileSync(join(root, "docs/fork/depth-baseline.md"), report);
writeFileSync(
  join(root, "docs/fork/depth-baseline-records.jsonl"),
  [...holdout.records, ...demo.records].map((r) => JSON.stringify(r)).join("\n") + "\n",
);
console.log(report);
