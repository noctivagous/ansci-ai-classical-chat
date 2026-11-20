#!/usr/bin/env node
/**
 * ansci-aspect-challenge.mjs — depth programme stage 2 evaluation
 * (Part C.2 + WP4 spec §5): the aspect bundle and dispatcher.
 *
 * Sets: scripts/aspect-challenge.tsv (bundle accuracy per
 * construction family + round-trip bundle preservation + checker
 * expectations) and scripts/irregular-forms.tsv (irregular-form
 * selection against the ratified ≥98% dispatcher bar). Both frozen;
 * sha256 manifest hashes recorded in the report. Authorship caveat
 * as in stage 1: authored by the builder, sealed against editing,
 * not an independently authored C.5 set.
 *
 * Also reports: aspect-feature preservation on aspect-bearing round
 * trips over the frozen holdout + the demo corpus (features.ts
 * instrument), overall holdout preservation and parse rate, and a
 * valency non-regression spot check recomputed from the stage-1
 * set. Writes docs/ansci/aspect-challenge.md.
 * Run: npm run ansci:aspect
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "../dist/src/ansci/parse.js";
import { generate } from "../dist/src/ansci/generate.js";
import { checkSentence, assessValency } from "../dist/src/ansci/check.js";
import { extractFeatures, compareFeatures } from "../dist/src/ansci/features.js";
import { enableWordnetLexicon, wordnetVerb } from "../dist/src/ansci/wordnet-lex.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const sha = (p) => createHash("sha256").update(readFileSync(p, "utf-8")).digest("hex").slice(0, 16);

enableWordnetLexicon(true);

/* ---- aspect challenge ---- */
const aspectPath = join(root, "scripts/aspect-challenge.tsv");
const items = [];
for (const line of readFileSync(aspectPath, "utf-8").split(/\r?\n/)) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [lang, cls, sentence, expected, note] = line.split("\t");
  items.push({ lang, cls, sentence, expected: (expected ?? "").trim(), note: note ?? "" });
}
const featureSet = (bundle) => Object.keys(bundle ?? {}).filter((k) => bundle[k]).sort().join(",");
const expectedSet = (exp) => (exp === "unmarked" ? "" : exp.split(",").map((s) => s.trim()).sort().join(","));

const rows = [];
for (const item of items) {
  let p;
  try { p = parse(item.sentence, item.lang); } catch { rows.push({ item, result: "parse-failed" }); continue; }
  if (item.cls === "checker") {
    const viols = checkSentence(p).map((v) => v.name);
    const ok = item.expected.startsWith("violation:")
      ? viols.includes(item.expected.slice("violation:".length))
      : !viols.includes("aspect-compatibility");
    rows.push({ item, result: ok ? "pass" : "fail", detail: viols.join(",") || "none" });
    continue;
  }
  const rootNode = p.meaning.nodes.find((n) => n.id === p.meaning.rootId);
  const got = featureSet(rootNode?.states?.aspect);
  let rt = "n/a";
  try {
    const p1 = parse(generate(p), item.lang);
    const r1 = p1.meaning.nodes.find((n) => n.id === p1.meaning.rootId);
    rt = featureSet(r1?.states?.aspect) === got ? "preserved" : `changed (${featureSet(r1?.states?.aspect) || "unmarked"})`;
  } catch { rt = "round-trip-failed"; }
  rows.push({ item, result: got === expectedSet(item.expected) ? "pass" : "fail", detail: `got ${got || "unmarked"}`, rt });
}
const core = rows.filter((r) => r.item.cls === "core");
const checker = rows.filter((r) => r.item.cls === "checker");
const probes = rows.filter((r) => r.item.cls === "probe");
const corePass = core.filter((r) => r.result === "pass").length;
const coreRt = core.filter((r) => r.rt === "preserved").length;
const checkerPass = checker.filter((r) => r.result === "pass").length;

/* ---- irregular forms ---- */
const formsPath = join(root, "scripts/irregular-forms.tsv");
const formRows = [];
for (const line of readFileSync(formsPath, "utf-8").split(/\r?\n/)) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [lemma, past, participle] = line.split("\t").map((s) => s.trim());
  const entry = wordnetVerb(lemma);
  formRows.push({
    lemma, past, participle,
    gotPast: entry?.forms.past, gotParticiple: entry?.forms.participle,
    pastOk: entry?.forms.past === past, partOk: entry?.forms.participle === participle,
  });
}
const formTotal = formRows.length * 2;
const formCorrect = formRows.reduce((s, r) => s + (r.pastOk ? 1 : 0) + (r.partOk ? 1 : 0), 0);

/* ---- corpora: aspect-bearing preservation + overall ---- */
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
function demoCorpus() {
  const out = [];
  for (const line of readFileSync(join(root, "demo/wuxing-parser/sentences.tsv"), "utf-8").split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [lang, sentence] = line.split("\t");
    out.push({ lang, sentence });
  }
  return out;
}
function preservation(corpus) {
  let parsed = 0, atoms = 0, preserved = 0, aspectBearing = 0, aAtoms = 0, aPreserved = 0;
  for (const { lang, sentence } of corpus) {
    let p0;
    try { p0 = parse(sentence, lang); } catch { continue; }
    parsed += 1;
    const g0 = extractFeatures(p0);
    let g1 = [];
    try { g1 = extractFeatures(parse(generate(p0), lang)); } catch { /* generation failure: all lost */ }
    const cmp = compareFeatures(g0, g1);
    atoms += cmp.total0;
    preserved += cmp.records.filter((r) => r.outcome === "preserved").length;
    const aspectAtoms = cmp.records.filter((r) => r.family === "aspect" && r.key.includes("aspect:"));
    if (aspectAtoms.length) {
      aspectBearing += 1;
      aAtoms += aspectAtoms.length;
      aPreserved += aspectAtoms.filter((r) => r.outcome === "preserved").length;
    }
  }
  return { parsed, total: corpus.length, atoms, preserved, aspectBearing, aAtoms, aPreserved };
}
const holdout = preservation(holdoutCorpus());
const demo = preservation(demoCorpus());

/* ---- valency non-regression spot check (stage-1 set, recomputed) ---- */
const vItems = [];
for (const line of readFileSync(join(root, "scripts/valency-challenge.tsv"), "utf-8").split(/\r?\n/)) {
  if (!line.trim() || line.startsWith("#")) continue;
  const [verb, cls, sentence, expected] = line.split("\t");
  vItems.push({
    verb, cls, sentence,
    expectedRoles: (expected ?? "").split(";").filter(Boolean).map((pp) => { const [role, lemma] = pp.trim().split(":"); return { role, lemma }; }),
  });
}
let vCorrect = 0, vActual = 0, vPos = 0, vPosOk = 0, vNeg = 0, vNegOk = 0;
for (const item of vItems) {
  if (item.cls === "unusual") continue;
  let p;
  try { p = parse(item.sentence, "en"); } catch { continue; }
  const assessments = assessValency(p).filter((a) => a.verb === item.verb);
  const unsupported = assessments.filter((a) => a.state === "unsupported").length;
  if (item.cls === "pos") {
    vPos += 1; if (unsupported === 0) vPosOk += 1;
    const rootNode = p.meaning.nodes.find((n) => n.id === p.meaning.rootId);
    const byId = new Map(p.meaning.nodes.map((n) => [n.id, n]));
    const actual = p.meaning.edges.filter((e) => e.from === rootNode.id)
      .map((e) => ({ role: e.relation, lemma: byId.get(e.to)?.lemma }))
      .filter((e) => ["agent", "patient", "theme", "recipient", "location", "goal"].includes(e.role));
    vActual += actual.length;
    vCorrect += item.expectedRoles.filter((er) => actual.some((a) => a.role === er.role && a.lemma === er.lemma)).length;
  } else { vNeg += 1; if (unsupported > 0) vNegOk += 1; }
}

/* ---- report ---- */
const familyRows = rows.map((r) => `| ${r.item.lang} | ${r.item.cls} | ${r.item.sentence} | ${r.item.expected} | ${r.result} | ${r.detail}${r.rt ? `; round-trip ${r.rt}` : ""} |`).join("\n");
const formMisses = formRows.filter((r) => !r.pastOk || !r.partOk)
  .map((r) => `- ${r.lemma}: past ${r.gotPast} (expected ${r.past})${r.pastOk ? "" : " ✗"}; participle ${r.gotParticiple} (expected ${r.participle})${r.partOk ? "" : " ✗"}`).join("\n");
const probeRows = probes.map((r) => `- ${r.item.sentence} — expected ${r.item.expected}; ${r.result === "parse-failed" ? "parse failed (abstention by incapacity)" : r.detail} — ${r.item.note}`).join("\n");

const report = `# Aspect challenge — stage 2 report

Generated by \`npm run ansci:aspect\` on ${new Date().toISOString().slice(0, 10)}.
Sets: \`scripts/aspect-challenge.tsv\` (sha256 ${sha(aspectPath)}…),
\`scripts/irregular-forms.tsv\` (sha256 ${sha(formsPath)}…).
Spec: \`docs/ansci/wp4-aspect-spec.md\`. Authorship caveat as in
stage 1: builder-authored, hash-sealed, not an independent C.5 set.

## Bundle accuracy (aspect challenge, ${items.length} items)

Core items: **${corePass}/${core.length}** exact feature-set matches;
round-trip bundle preservation on core items **${coreRt}/${core.length}**.
Checker items: **${checkerPass}/${checker.length}** (the stative
progressive is flagged; the activity progressive is not).

| Lang | Class | Sentence | Expected | Result | Detail |
| --- | --- | --- | --- | --- | --- |
${familyRows}

## Irregular-form selection

**${formCorrect}/${formTotal} forms correct (${pct(formCorrect / formTotal)})**
across ${formRows.length} derived verbs — the ratified dispatcher
bar is ≥98%.
${formMisses ? `\nMisses:\n${formMisses}\n` : "\nNo misses.\n"}
## Aspect-bearing round trips (corpora)

Holdout: ${holdout.aspectBearing} of ${holdout.parsed} parsed sentences
carry a bundle feature; aspect-feature preservation
**${pct(holdout.aAtoms ? holdout.aPreserved / holdout.aAtoms : 0)}**
over ${holdout.aAtoms} aspect atoms (stage-2 target ≥95%).
Demo corpus: ${demo.aspectBearing} aspect-bearing of ${demo.parsed}
parsed; preservation
**${pct(demo.aAtoms ? demo.aPreserved / demo.aAtoms : 0)}**
over ${demo.aAtoms} atoms.

## Non-regression

Holdout parse rate ${holdout.parsed}/80 = **${pct(holdout.parsed / 80)}**
(target ≥85%). Overall feature preservation
**${pct(holdout.atoms ? holdout.preserved / holdout.atoms : 0)}**
(stage-2 target ≥90% after this stage; stage-1 close was 95.9%).
Valency spot check on the stage-1 set, recomputed: role precision
**${pct(vActual ? vCorrect / vActual : 0)}**, legitimate acceptance
**${pct(vPos ? vPosOk / vPos : 0)}**, invalid rejection
**${pct(vNeg ? vNegOk / vNeg : 0)}** (stage-1 close: 98.2% / 100% / 91.7%
on all 12 verbs).

## Findings

- The demo corpus's aspect preservation (87.5%, 7/8 atoms) loses
  exactly one atom: the deliberate-error sentence "She didn't
  arrived", whose past-shaped verb mints a bounded atom in the
  original parse that canonicalised regeneration ("She didn't
  arrive") cannot keep — the stage-0 F5 phenomenon, now visible in
  the aspect family. It is the fitted corpus's own error item, not
  a dispatcher loss.
- The holdout's aspect sample is thin (5 atoms over 5 sentences):
  the family is under-tested there, and the 100% figure should be
  read with that warning. The challenge set's 19 core items are
  the stage's substantive aspect evidence.
- The forms index contains regularised forms of strong verbs
  ("beginned", "forgetted" are attested surfaces), which is why
  selection filters by form class; its first version's prefix rule
  also ate the o-class participles (broken, spoken) before the
  third-candidate condition was added. The one remaining miss,
  become's participle, is the documented identity-form blindness
  of the index.

## Probes (abstention territory, descriptive)

${probeRows}
`;

writeFileSync(join(root, "docs/ansci/aspect-challenge.md"), report);
console.log(report);
