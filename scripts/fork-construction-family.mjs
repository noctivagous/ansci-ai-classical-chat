#!/usr/bin/env node
/**
 * fork-construction-family.mjs — the construction family, given a
 * real test (depth programme follow-on, Part C.1 family accounting).
 *
 * Stage 5's accounting (docs/fork/stage-5-report.md) found the
 * construction family at 50.0% on 2 atoms in the frozen holdout —
 * under-tested, neither pass nor fail. The stage-3 construction set
 * (scripts/construction-challenge.tsv) scores construction
 * RECOGNITION on its own ledgers; it does not feed the family
 * accounting. This runner feeds it: every item of
 * scripts/construction-family-challenge.tsv goes through the
 * features.ts instrument exactly as the stage-5 accounting runs the
 * holdout (parse -> generate -> reparse -> compareFeatures), and
 * the construction family's score is computed over the set.
 *
 * Accounting follows the instrument: an item whose parse, generation
 * or reparse throws contributes no atoms to the score — but unlike
 * the holdout accounting, those items are NOT passed over silently:
 * Ledger 3 names each one and the atoms it would have carried.
 *
 * Also reports non-regression on the frozen holdout, derived exactly
 * as scripts/fork-stage5.mjs derives it. Writes
 * docs/fork/construction-family-challenge.md.
 * Run: npm run fork:construction-family
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "../dist/src/fork/parse.js";
import { generate } from "../dist/src/fork/generate.js";
import { extractFeatures, compareFeatures } from "../dist/src/fork/features.js";
import { enableWordnetLexicon } from "../dist/src/fork/wordnet-lex.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const sha = (p) => createHash("sha256").update(readFileSync(p, "utf-8")).digest("hex").slice(0, 16);

enableWordnetLexicon(true);

/* ---- the set ---- */
const setPath = join(root, "scripts/construction-family-challenge.tsv");
const items = [];
for (const line of readFileSync(setPath, "utf-8").split(/\r?\n/)) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [lang, cls, sentence, expected, note] = line.split("\t");
  items.push({ lang, cls, sentence, expected: (expected ?? "").trim(), note: note ?? "" });
}

/* ---- run each item through the instrument ---- */
const rows = [];
for (const item of items) {
  const row = { item, status: "completed", g0: [], generation: "", records: [], detail: "" };
  let p;
  try { p = parse(item.sentence, item.lang); }
  catch (e) { row.status = "parse-failed"; row.detail = e.message; rows.push(row); continue; }
  row.g0 = extractFeatures(p).filter((a) => a.family === "construction").map((a) => a.value);
  row.recognised = row.g0.includes(item.expected);
  try { row.generation = generate(p); }
  catch (e) { row.status = "gen-failed"; row.detail = e.message; rows.push(row); continue; }
  let cmp;
  try { cmp = compareFeatures(extractFeatures(p), extractFeatures(parse(row.generation, item.lang))); }
  catch (e) { row.status = "reparse-failed"; row.detail = e.message; rows.push(row); continue; }
  row.records = cmp.records.filter((r) => r.family === "construction");
  row.micro = cmp.micro;
  rows.push(row);
}

const core = rows.filter((r) => r.item.cls === "core");
const probes = rows.filter((r) => r.item.cls === "probe");
const coreParsed = core.filter((r) => r.status !== "parse-failed");
const coreDone = core.filter((r) => r.status === "completed");
const recognised = coreParsed.filter((r) => r.recognised).length;
const famAtoms = coreDone.reduce((n, r) => n + r.records.length, 0);
const famPreserved = coreDone.reduce((n, r) => n + r.records.filter((x) => x.outcome === "preserved").length, 0);
const failures = rows.filter((r) => r.status !== "completed");

/* per-construction aggregation over completed core items */
const byConstruction = new Map();
for (const r of coreDone) {
  for (const rec of r.records) {
    const v = byConstruction.get(rec.value) ?? { atoms: 0, preserved: 0 };
    v.atoms++;
    if (rec.outcome === "preserved") v.preserved++;
    byConstruction.set(rec.value, v);
  }
}

/* ---- non-regression: the frozen holdout, derived as fork-stage5.mjs derives it ---- */
function holdoutCorpus() {
  const scripts = join(root, "scripts");
  const evals = readdirSync(scripts).filter((f) => /^cskg-evaluation.*\.txt$/.test(f)).sort().map((f) => join(scripts, f));
  const probeFiles = readdirSync(join(scripts, "probes")).filter((f) => f.endsWith(".txt")).sort().map((f) => join(scripts, "probes", f));
  const seen = new Set(); const out = [];
  for (const file of [...evals, join(scripts, "cskg-explore.txt"), ...probeFiles]) {
    for (const raw of readFileSync(file, "utf-8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      if (/^(you|bot|ansci|user|system|human|assistant)\s*:/i.test(line)) continue;
      if (line.includes("#!") || line.startsWith(">")) continue;
      if (!/[a-z]/i.test(line)) continue;
      const s = line.replace(/\s+/g, " ");
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(s);
      if (out.length >= 80) return out;
    }
  }
  return out;
}
const corpus = holdoutCorpus();
let hParsed = 0, hGenFail = 0, hTotal0 = 0, hPreserved = 0, hConsAtoms = 0, hConsPreserved = 0;
for (const s of corpus) {
  let p;
  try { p = parse(s, "en"); } catch { continue; }
  hParsed++;
  let a1;
  try { a1 = extractFeatures(parse(generate(p), "en")); } catch { hGenFail++; continue; }
  const cmp = compareFeatures(extractFeatures(p), a1);
  hTotal0 += cmp.total0;
  for (const r of cmp.records) {
    if (r.outcome === "preserved") hPreserved++;
    if (r.family === "construction") { hConsAtoms++; if (r.outcome === "preserved") hConsPreserved++; }
  }
}

/* ---- report ---- */
const L = [];
L.push("# Construction family challenge — the family, given a real test");
L.push("");
L.push("Generated by `npm run fork:construction-family` on 2026-11-18.");
L.push(`Set: \`scripts/construction-family-challenge.tsv\` (sha256 ${sha(setPath)}).`);
L.push("Instrument: the features.ts round trip (parse → generate → reparse →");
L.push("compareFeatures), run exactly as the stage-5 accounting runs the frozen");
L.push("holdout. Authorship caveat (standing): authored by the builder against");
L.push("the branch signatures in parse.ts, sealed by the hash above; not an");
L.push("independently authored C.5 set. Scores are internal evidence (C.5 demotions).");
L.push("");
L.push("## Why this set exists");
L.push("");
L.push("Stage 5's family accounting (docs/fork/stage-5-report.md) found the");
L.push("construction family at **50.0% on 2 atoms** in the frozen holdout —");
L.push("under-tested, reporting as neither pass nor fail. The stage-3");
L.push("construction set (docs/fork/construction-challenge.md) scores");
L.push("construction *recognition* on its own ledgers; it does not feed the");
L.push("family accounting. This set feeds it.");
L.push("");
L.push("A construction atom is emitted by features.ts per predicate whose");
L.push("record carries `states.construction`. The parser sets that state in");
L.push("exactly eight branches — en: imperative, existential, weather;");
L.push("zh: ba, bei, correlative, a-not-a, serial. The set is built to those");
L.push("branches' coded signatures, with vocabulary attested in the lexicons.");
L.push("Copular questions, contractions, fragments and the rest of the stage-3");
L.push("territory earn no construction atoms and are not re-tested here.");
L.push("");
L.push("## Ledger 1 — recognition (core)");
L.push("");
L.push(`**${recognised}/${coreParsed.length}** parsed core items record their expected`);
L.push("construction in G0. (Recognition is the parse-side claim only; the");
L.push("family score is Ledger 2.)");
L.push("");
L.push("## Ledger 2 — construction family preservation (core)");
L.push("");
L.push(`**${pct(famAtoms ? famPreserved / famAtoms : 0)} — ${famPreserved}/${famAtoms} atoms**`);
L.push(`over ${coreDone.length} core items completing the round trip. Accounting follows`);
L.push("the instrument: an item whose parse, generation or reparse throws");
L.push("contributes no atoms here — those items are named in Ledger 3, not");
L.push("passed over. Compare the frozen holdout's 50.0% on 2 atoms.");
L.push("");
L.push("| Construction | Atoms | Preserved | Score |");
L.push("| --- | ---: | ---: | ---: |");
for (const [v, s] of [...byConstruction.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  L.push(`| ${v} | ${s.atoms} | ${s.preserved} | ${pct(s.atoms ? s.preserved / s.atoms : 0)} |`);
}
L.push("");
L.push("## Ledger 3 — instrument failures (no atoms counted)");
L.push("");
if (!failures.length) L.push("None.");
for (const r of failures) {
  L.push(`- ${r.item.sentence} — ${r.status}${r.g0.length ? `; G0 carried [${r.g0.join(", ")}]` : ""}${r.detail ? `; ${r.detail}` : ""}`);
}
L.push("");
L.push("## Probe items (descriptive — never in the family score)");
L.push("");
L.push("| Lang | Sentence | Expected | G0 construction | Outcome | Generation |");
L.push("| --- | --- | --- | --- | --- | --- |");
for (const r of probes) {
  const outcome = r.status !== "completed" ? r.status : r.records.length ? r.records.map((x) => `${x.value}:${x.outcome}`).join(", ") : "no construction atom";
  L.push(`| ${r.item.lang} | ${r.item.sentence} | ${r.item.expected} | ${r.g0.join(", ") || "—"} | ${outcome} | ${r.generation || "—"} |`);
}
L.push("");
L.push("## Non-regression — frozen holdout (same instrument)");
L.push("");
L.push(`Parse rate **${hParsed}/${corpus.length}**; generation/reparse failures ${hGenFail};`);
L.push(`pooled feature preservation **${pct(hTotal0 ? hPreserved / hTotal0 : 0)}** over ${hTotal0} atoms`);
L.push(`(stage-5 accounting: 97.7–98.2%, the established ±0.5pt warm-state band);`);
L.push(`construction family on the holdout: **${hConsPreserved}/${hConsAtoms} atoms** —`);
L.push("the thin sample this set exists to supersede as evidence. The count");
L.push("differs from stage 5's 2 atoms because this process ran the challenge");
L.push("set first: its imperatives pre-registered the holdout imperative's");
L.push("first word (see the imperative finding). Run cold, the holdout's two");
L.push("construction atoms are \"It's raining.\" (weather, preserved) and");
L.push("\"Tell me about winter.\" (imperative, lost) — stage 5's 50.0% exactly,");
L.push("and its lost atom was this same imperative defect at n=1.");
L.push("");
L.push("## Per-item results (core)");
L.push("");
L.push("| Lang | Sentence | Expected | G0 | Result | Generation |");
L.push("| --- | --- | --- | --- | --- | --- |");
for (const r of core) {
  const result = r.status !== "completed" ? r.status : r.records.length ? r.records.map((x) => `${x.value}:${x.outcome}`).join(", ") : "no atom";
  L.push(`| ${r.item.lang} | ${r.item.sentence} | ${r.item.expected} | ${r.g0.join(", ") || "—"} | ${result} | ${r.generation || "—"} |`);
}
L.push("");
L.push("## Located findings");
L.push("");
const impRows = coreDone.filter((r) => r.item.expected === "imperative");
const impLost = impRows.reduce((n, r) => n + r.records.filter((x) => x.outcome !== "preserved").length, 0);
if (impRows.length && impLost === impRows.reduce((n, r) => n + r.records.length, 0)) {
  L.push("- **Imperative atoms never survive the round trip.** Every core");
  L.push("  imperative item records the atom in G0 and loses it at reparse,");
  L.push("  although the generated surface is the identical sentence. Located");
  L.push("  mechanism (verified in isolation): in a fresh process the first");
  L.push("  parse of \"Tell me about winter.\" records the atom and every later");
  L.push("  parse in the same process does not — parsing registers the");
  L.push("  sentence-initial word as a verb in the shared lexicon, and the");
  L.push("  imperative branch's signature requires that word to NOT be");
  L.push("  verb-classified. The branch consumes its own precondition, so the");
  L.push("  construction state is single-use per process and cannot, as coded,");
  L.push("  survive any round trip after the first parse. The loss is in the");
  L.push("  record, not the surface. This is also what stage 5's 50%-on-2 was:");
  L.push("  the frozen holdout's two construction atoms are a weather atom");
  L.push("  (preserved) and this imperative (\"Tell me about winter.\", lost).");
}
for (const [v, s] of [...byConstruction.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  if (v !== "imperative" && s.preserved < s.atoms) {
    const losers = coreDone.filter((r) => r.records.some((x) => x.value === v && x.outcome !== "preserved")).map((r) => r.item.sentence);
    L.push(`- **${v}: ${s.preserved}/${s.atoms} preserved.** Losses on: ${losers.join(" · ")}`);
  }
}
for (const r of failures.filter((x) => x.item.cls === "core")) {
  L.push(`- **Core item failed the instrument:** ${r.item.sentence} — ${r.status}${r.detail ? ` (${r.detail})` : ""}.`);
}
L.push("- **bei with an unattested verb throws a TypeError, not a parse");
L.push("  error** (probe: 猫被狗咬了）. The branch dereferences the missing");
L.push("  lexicon entry unchecked. The sentence is outside the lexicon's");
L.push("  territory, but the failure mode is a crash where the parser");
L.push("  elsewhere fails cleanly.");
L.push("");
L.push("## Notes");
L.push("");
L.push("- Adjacent-family losses observed on core items (generation dropping");
L.push("  patients, goals, a locative suffix, question force, and the");
L.push("  existential numeral phrases — \"There is two.\", \"There was two.\") are");
L.push("  recorded in the set's notes column and the per-item generations");
L.push("  above. They score in their own families, not this one, and are not");
L.push("  chased here.");
L.push("- The construction-state machinery is language-partitioned: the three");
L.push("  EN branches and the five ZH branches share no value. There is no");
L.push("  bilingual construction in the family as coded.");
L.push("- The set's items run in file order in one process, as the holdout");
L.push("  accounting runs its corpus; the instrument's warm-state dependence");
L.push("  (±0.5pt on pooled preservation) applies here too — and in the");
L.push("  imperative's case the state dependence is the finding itself.");

writeFileSync(join(root, "docs/fork/construction-family-challenge.md"), L.join("\n") + "\n");

console.log(`core: ${core.length} items · recognised ${recognised}/${coreParsed.length} parsed`);
console.log(`construction family (core, completed round trips): ${famPreserved}/${famAtoms} = ${pct(famAtoms ? famPreserved / famAtoms : 0)}`);
for (const [v, s] of [...byConstruction.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${v.padEnd(12)} ${s.preserved}/${s.atoms} = ${pct(s.atoms ? s.preserved / s.atoms : 0)}`);
}
console.log(`instrument failures: ${failures.length}`);
for (const r of failures) console.log(`  ${r.status}: ${r.item.sentence}${r.detail ? ` (${r.detail})` : ""}`);
console.log(`holdout non-regression: parse ${hParsed}/${corpus.length} · pooled ${pct(hTotal0 ? hPreserved / hTotal0 : 0)} over ${hTotal0} atoms · construction ${hConsPreserved}/${hConsAtoms}`);
console.log("wrote docs/fork/construction-family-challenge.md");
