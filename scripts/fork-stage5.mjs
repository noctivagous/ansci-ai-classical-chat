/**
 * fork-stage5.mjs — the stage-5 accounting run (Part F.6).
 *
 * Reports, per family: its preservation bar AND what carried it.
 * Sections: (1) negation in the generation direction — the
 * admission probe re-run as generation (parse the affirmative,
 * negate the record, generate, compare); (2) the frozen holdout:
 * parse rate + feature preservation overall and per family;
 * (3) the F1 round-trip family; (4) temporal resolution.
 * Prints numbers only — the report prose lives in
 * docs/fork/stage-5-report.md and is written from these figures.
 * Run: npm run fork:stage5
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "../dist/src/fork/parse.js";
import { generate } from "../dist/src/fork/generate.js";
import { extractFeatures, compareFeatures } from "../dist/src/fork/features.js";
import { enableWordnetLexicon } from "../dist/src/fork/wordnet-lex.js";
import { zhNegatorFor } from "../dist/src/fork/aspect.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
enableWordnetLexicon(true);

/* ---- 1. Negation, generation direction ---- */
console.log("== Stage 5.1 — negation in the generation direction\n");
const negRows = readFileSync(join(root, "scripts/negation-probe.tsv"), "utf8")
  .split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.split("\t"));
let gExact = 0, gNeg = 0;
for (const [aff, attested, expected] of negRows) {
  const p = parse(aff, "zh");
  const r = p.meaning.nodes.find((n) => n.id === p.meaning.rootId);
  if (r.states) { r.states.negated = true; delete r.states.negation; }
  const out = generate(p);
  const exact = out === attested;
  const negOk = out.includes(expected + (r.lemma ?? ""));
  if (exact) gExact++;
  if (negOk) gNeg++;
  console.log(`  ${aff} -> ${out}  (attested ${attested})${exact ? "" : negOk ? "  canonicalised" : "  <-- NEGATOR MISS"}`);
}
console.log(`\n  generation direction: exact ${gExact}/${negRows.length} · rule-selected negator present ${gNeg}/${negRows.length}`);

/* ---- 2. Holdout accounting ---- */
console.log("\n== Stage 5.2 — frozen holdout accounting\n");
function holdoutCorpus() {
  // The frozen 80, derived exactly as scripts/fork-depth-baseline.mjs
  // derives it (same filters, same cap) — a stage's accounting is
  // only comparable on the same corpus.
  const scripts = join(root, "scripts");
  const evals = readdirSync(scripts).filter((f) => /^cskg-evaluation.*\.txt$/.test(f)).sort().map((f) => join(scripts, f));
  const probes = readdirSync(join(scripts, "probes")).filter((f) => f.endsWith(".txt")).sort().map((f) => join(scripts, "probes", f));
  const seen = new Set(); const out = [];
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
      out.push(s);
      if (out.length >= 80) return out;
    }
  }
  return out;
}
const corpus = holdoutCorpus();
let parsed = 0, genFail = 0, total0 = 0, preserved = 0;
const fam = new Map();
const negLoss = [];
for (const s of corpus) {
  let p;
  try { p = parse(s, "en"); } catch { continue; }
  parsed++;
  let regen;
  try { regen = generate(p); } catch { genFail++; continue; }
  const a0 = extractFeatures(p);
  let a1;
  try { a1 = extractFeatures(parse(regen, "en")); } catch { genFail++; continue; }
  const cmp = compareFeatures(a0, a1);
  total0 += cmp.total0;
  for (const r of cmp.records) {
    const f = fam.get(r.family) ?? { total: 0, preserved: 0 };
    f.total++;
    if (r.outcome === "preserved") { f.preserved++; preserved++; }
    fam.set(r.family, f);
    if (r.family === "negation" && r.outcome !== "preserved") negLoss.push(`${s}  ->  ${regen}  [${r.key} ${r.outcome}]`);
  }
}
console.log(`  corpus ${corpus.length} · parsed ${parsed} · generation failures ${genFail}`);
console.log(`  pooled feature preservation ${(100 * preserved / Math.max(1, total0)).toFixed(1)}% over ${total0} atoms`);
for (const [f, v] of [...fam.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`    ${f.padEnd(14)} ${(100 * v.preserved / Math.max(1, v.total)).toFixed(1)}% (${v.total} atoms)`);
}
console.log(`\n  negation losses (${negLoss.length}):`);
for (const l of negLoss.slice(0, 20)) console.log(`    ${l}`);

/* ---- 3. F1 family ---- */
console.log("\n== Stage 5.3 — F1 round-trip family\n");
const f1 = ["他不去学校。", "他没去学校。", "他不去吗？", "他没去过北京。", "他没有书。", "他不忙。", "他不高。", "他去不去学校？", "他去没去学校？", "他没喝茶。", "他不喜欢猫。", "他没看过书。"];
let f1ok = 0;
for (const s of f1) { const ok = generate(parse(s, "zh")) === s; if (ok) f1ok++; else console.log(`  MISS: ${s} -> ${generate(parse(s, "zh"))}`); }
console.log(`  ${f1ok}/${f1.length} exact`);

/* ---- 4. Temporal resolution ---- */
console.log("\n== Stage 5.4 — temporal resolution (Part F.4)\n");
const temp = ["He sleeps in winter.", "She walks at dawn.", "He works at night.", "The garden blooms in spring."];
let tok = 0;
for (const s of temp) {
  const p = parse(s, "en");
  const hasTime = p.meaning.edges.some((e) => e.relation === "time");
  const exact = generate(p) === s;
  if (hasTime && exact) tok++;
  console.log(`  ${s}  time-edge=${hasTime} exact=${exact}`);
}
console.log(`  ${tok}/${temp.length} resolved + exact`);
void zhNegatorFor;
