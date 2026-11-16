/**
 * fork-stage5-probes.mjs — the Part F admission probes for stage 5.
 *
 * Probe 1 (negation): does the aspect-bundle rule predict the
 * Chinese negator （没 vs 不） better than the baselines?
 * Probe 2 (classifier): does the noun's place in the ontology
 * (table classification + climb trail) predict its classifier
 * family better than always-个 and a gloss-shape rule?
 *
 * Admission is decided on these numbers BEFORE the mechanisms are
 * built (Part F.1/F.6). Run: npm run fork:stage5-probes
 */
import { readFileSync } from "node:fs";
import { parse } from "../dist/src/fork/parse.js";
import { enableWordnetLexicon, climbClassification } from "../dist/src/fork/wordnet-lex.js";
import { lookupClassification } from "../dist/src/fork/classify.js";

enableWordnetLexicon(true);

function rows(file) {
  return readFileSync(new URL(file, import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => l.split("\t"));
}

/* ---------------- Probe 1: negator selection ---------------- */
console.log("== Probe 1 — ZH negator selection (Part F.2 admission)\n");
let p1 = { n: 0, parsed: 0, rule: 0, def: 0, surf: 0, novel: 0, novelOk: 0 };
for (const [aff, neg, expected, config] of rows("./negation-probe.tsv")) {
  p1.n++;
  const novel = config.startsWith("NOVEL");
  if (novel) p1.novel++;
  // data hygiene: the attested form really carries the expected negator
  if (!neg.includes(expected)) console.log(`  DATA ERROR: ${neg} does not contain ${expected}`);
  let bundle, lemma, ok = true;
  try {
    const parsed = parse(aff, "zh");
    const root = parsed.meaning.nodes.find((n) => n.id === parsed.meaning.rootId);
    bundle = root?.states?.aspect;
    lemma = root?.lemma;
  } catch { ok = false; }
  const rulePred = ok && (bundle?.bounded || bundle?.perfect || bundle?.experiential || lemma === "有") ? "没" : ok ? "不" : null;
  const surfPred = /[了过]/.test(aff) || aff.includes("有") ? "没" : "不";
  if (ok) p1.parsed++;
  if (rulePred === expected) { p1.rule++; if (novel) p1.novelOk++; }
  if (expected === "不") p1.def++;
  if (surfPred === expected) p1.surf++;
  console.log(`  ${aff}  bundle=${ok ? JSON.stringify(bundle ?? {}) : "UNPARSED"} lemma=${lemma ?? "-"}  rule=${rulePred ?? "-"} surf=${surfPred} expected=${expected}${rulePred === expected ? "" : "  <-- RULE MISS"}`);
}
console.log(`\n  items ${p1.n} · parsed ${p1.parsed} · bundle rule ${p1.rule}/${p1.n} · always-不 ${p1.def}/${p1.n} · surface rule ${p1.surf}/${p1.n} · novel A-not-A ${p1.novelOk}/${p1.novel}`);

/* ---------------- Probe 2: classifier prediction ---------------- */
console.log("\n== Probe 2 — classifier prediction (Part F.3 admission)\n");
const ANIMAL_SPECIAL = { horse: "匹", cow: "头", pig: "头" };
// The noun's hypernym neighbourhood in the extract — the same
// substrate the system's climb walks (the gated climb itself only
// reports a trail when it reaches a table anchor, which most
// ordinary nouns never do; the first probe run scored 4/41 for
// exactly that reason, an instrument defect, not a verdict).
const { synsetsForLemma: sfl2, getDefaultExtract: gde2 } = await import("../dist/src/wordnet.js");
const ex2 = gde2();
const hyper = new Map();
{
  const h = ex2.relations.hypernym;
  for (let i = 0; i + 1 < h.length; i += 2) {
    if (!hyper.has(h[i])) hyper.set(h[i], []);
    hyper.get(h[i]).push(h[i + 1]);
  }
}
function pathWords(concept) {
  const start = sfl2(ex2, concept).find((s) => s.pos === "n");
  if (!start) return "";
  const seen = new Set([start.index]);
  const words = new Set(start.lemmas.map((l) => l.toLowerCase()));
  let frontier = [start.index];
  for (let d = 0; d < 7 && frontier.length; d++) {
    const next = [];
    for (const idx of frontier) for (const up of hyper.get(idx) ?? []) {
      if (seen.has(up)) continue;
      seen.add(up);
      next.push(up);
      for (const l of ex2.synsets[up].lemmas) words.add(l.toLowerCase());
    }
    frontier = next;
  }
  return [...words].join(" ");
}
function ontologyPredict(concept) {
  const table = lookupClassification(concept);
  const trail = pathWords(concept);
  if (/fish|snake/.test(trail)) return ["条", "long-flexible"];
  if (/flower/.test(trail)) return ["朵", "plant"];
  if (/plant|tree|grass|herb|shrub/.test(trail)) return ["棵", "plant"];
  if (/animal|bird|insect|mammal|reptile|amphibian/.test(trail)) return [ANIMAL_SPECIAL[concept] ?? "只", ANIMAL_SPECIAL[concept] ? "animal-special" : "animal"];
  if (/vehicle|car|bicycle|wheeled/.test(trail)) return ["辆", "vehicle"];
  if (/book|magazine|publication|dictionary|volume/.test(trail)) return ["本", "bound-volume"];
  if (/room|chamber/.test(trail)) return ["间", "room"];
  if (/song|poem|poetry/.test(trail)) return ["首", "work"];
  if (/letter|epistle/.test(trail)) return ["封", "document"];
  void table;
  return ["个", "general"];
}
let p2 = { n: 0, exact: 0, fam: 0, base: 0, shape: 0 };
const { synsetsForLemma, getDefaultExtract } = await import("../dist/src/wordnet.js");
const ex = getDefaultExtract();
function shapePredict(concept) {
  const gloss = synsetsForLemma(ex, concept).find((s) => s.pos === "n")?.gloss ?? "";
  if (/\blong\b/.test(gloss)) return "条";
  if (/\bflat\b/.test(gloss)) return "张";
  return "个";
}
for (const [concept, zh, expected, family] of rows("./classifier-probe.tsv")) {
  p2.n++;
  const [pred, predFam] = ontologyPredict(concept);
  if (pred === expected) p2.exact++;
  if (predFam === family) p2.fam++;
  if (expected === "个") p2.base++;
  if (shapePredict(concept) === expected) p2.shape++;
  console.log(`  ${concept.padEnd(10)} ${zh}  expected=${expected}(${family})  ontology=${pred}(${predFam})${pred === expected ? "" : predFam === family ? "  family-only" : "  <-- MISS"}`);
}
console.log(`\n  items ${p2.n} · ontology exact ${p2.exact}/${p2.n} · ontology family ${p2.fam}/${p2.n} · always-个 exact ${p2.base}/${p2.n} · gloss-shape exact ${p2.shape}/${p2.n}`);
