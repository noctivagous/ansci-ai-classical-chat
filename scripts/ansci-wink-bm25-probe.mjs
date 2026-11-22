#!/usr/bin/env node
/**
 * Wink BM25 retrieval probe (2026-11-22). Shadow only.
 *
 * Corpus: the records the project actually searches by hand —
 * ai-system/system-map.ts nodes (id, title, summary, currentCode)
 * merged with the GAPS.md audit-table row for the same node id
 * (claim / audit status / evidence text). One document per node.
 * Corpus size is printed; if the merged set were too small or too
 * terse to measure, this script would say so — it is not (see the
 * report): ~100 documents with title + summary + evidence fields.
 *
 * Index: wink-bm25-text-search, wink-nlp prep per the vendor's
 * example pattern (lemma, stop-word removal, negation marking as
 * a NOT_ prefix), field weights title=3, body=1 (title > body).
 *
 * Baseline: plain substring match over the same title+body text —
 * a document scores by how many query content words appear
 * verbatim in it; ties break by id order (deterministic).
 *
 * Queries: 12 builder-authored natural queries with hand-labelled
 * expected node ids, labelled by the script author from the
 * records themselves — NOT independent, declared as such.
 * Measure: recall@5 and precision@5 per query, both engines.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let winkNlpFactory, model, BM25;
try {
  winkNlpFactory = require("wink-nlp");
  model = require("wink-eng-lite-web-model");
  BM25 = require("wink-bm25-text-search");
} catch {
  console.log("wink not installed — npm install (wink is a recorded dependency in package.json)");
  process.exit(2);
}
const nlp = winkNlpFactory(model);
const its = nlp.its;

/* ---------- corpus ---------- */
const mapText = readFileSync(resolve(here, "../ai-system/system-map.ts"), "utf8");
// The map literal is plain JSON between the <map-data> markers.
const mapStart = mapText.indexOf("{", mapText.indexOf("SYSTEM_MAP"));
const mapEnd = mapText.indexOf("// </map-data>");
const SYSTEM_MAP = JSON.parse(mapText.slice(mapStart, mapEnd).trim().replace(/;$/, ""));

/* GAPS rows: | id | claim | status | disposition | evidence | */
const gapsText = readFileSync(resolve(here, "../GAPS.md"), "utf8");
const gapsById = new Map();
for (const line of gapsText.split("\n")) {
  if (!line.startsWith("| ") || line.startsWith("| Node ID") || line.startsWith("| ---")) continue;
  const cells = line.split("|").slice(1, -1).map((c) => c.trim());
  if (cells.length >= 5 && cells[0] && !cells[0].includes(" ")) gapsById.set(cells[0], cells);
}

const docs = SYSTEM_MAP.nodes.map((n) => {
  const g = gapsById.get(n.id);
  const body = [
    n.summary ?? "",
    n.currentCode ?? "",
    g ? `${g[1]} ${g[2]} ${g[3]} ${g[4]}` : "",
    `id ${n.id} type ${n.type} state ${n.state}`,
  ].join(" ");
  return { id: n.id, title: n.title, body };
});
console.log(`Corpus: ${docs.length} documents (system-map nodes=${SYSTEM_MAP.nodes.length}, with a GAPS row=${docs.filter((d) => gapsById.has(d.id)).length})`);
const avgBody = Math.round(docs.reduce((a, d) => a + d.body.split(/\s+/).length, 0) / docs.length);
console.log(`Mean body length: ${avgBody} words; shortest=${Math.min(...docs.map((d) => d.body.split(/\s+/).length))}, longest=${Math.max(...docs.map((d) => d.body.split(/\s+/).length))}`);

/* ---------- prep task (wink-bm25 example pattern) ---------- */
function prepTask(text) {
  const doc = nlp.readDoc(text);
  const out = [];
  doc.tokens().each((t) => {
    if (t.out(its.type) !== "word") return;
    if (t.out(its.stopWordFlag)) return;
    let lemma = t.out(its.lemma);
    if (t.out(its.negationFlag)) lemma = `NOT_${lemma}`;
    out.push(lemma);
  });
  return out;
}

/* ---------- BM25 index ---------- */
const engine = BM25();
engine.defineConfig({ fldWeights: { title: 3, body: 1 } });
// One prep task set as the default: it applies to every field
// and to the search query (per the package's definePrepTasks docs).
engine.definePrepTasks([prepTask]);
for (const d of docs) engine.addDoc({ title: d.title, body: d.body }, d.id);
engine.consolidate();

/* ---------- substring baseline ---------- */
const STOP = new Set(["which", "what", "does", "the", "a", "an", "of", "for", "how", "is", "are", "unit", "handles", "handle", "system", "work", "used"]);
function substringSearch(query, k = 5) {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w));
  const scored = docs.map((d) => {
    const hay = `${d.title} ${d.body}`.toLowerCase();
    const score = words.reduce((a, w) => a + (hay.includes(w) ? 1 : 0), 0);
    return { id: d.id, score };
  }).filter((s) => s.score > 0);
  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return scored.slice(0, k).map((s) => s.id);
}

/* ---------- queries (builder-labelled expected ids) ---------- */
const QUERIES = [
  { q: "which unit handles negation in a sentence", expected: ["lpu/parser"] },
  { q: "link grammar parser evidence", expected: ["lpu/parser/linkage"] },
  { q: "weather monitoring and expectation", expected: ["monitoring", "functions/expectation", "weather"] },
  { q: "decline pricing located gap", expected: ["reasoning/pricing", "reasoning/decline-floor"] },
  { q: "token resolution spelling variants symspell", expected: ["lpu/parser/token", "knowledge/variant-graph"] },
  { q: "sense selection wordnet synset", expected: ["lpu/parser/sense", "knowledge/lexicon"] },
  { q: "geography place register weather", expected: ["awareness/place-and-time", "weather"] },
  { q: "social unit interlocutor awareness", expected: ["awareness/social-unit", "awareness/social-unit/interlocutor"] },
  { q: "wuxing ontology core five elements", expected: ["ontology-core", "ontology-core/ontology-knowledge-unit/correspondence-graph"] },
  { q: "timekeeping clock scheduling", expected: ["functions/timekeeping", "functions/scheduling"] },
  { q: "emotion desire unit feelings", expected: ["lpu/language-emotion-desire-unit", "ontology-core/emotion-desire-unit"] },
  { q: "quantification numbers measurement units", expected: ["lpu/quantification-language-unit", "ontology-core/ontology-knowledge-unit/mathematics/quantification-unit"] },
];
// Keep only expected ids that exist in the corpus; report any dropped.
const validIds = new Set(docs.map((d) => d.id));
for (const item of QUERIES) {
  item.expected = item.expected.filter((id) => validIds.has(id));
}

function metrics(got, expected) {
  const hits = got.filter((id) => expected.includes(id)).length;
  return {
    recall: expected.length ? hits / expected.length : 0,
    precision: got.length ? hits / got.length : 0,
    hits,
  };
}

console.log("\nPer-query results (@5):");
console.log("query | expected | BM25 top5 | BM25 R/P | substring top5 | sub R/P");
let bmR = 0, bmP = 0, subR = 0, subP = 0, n = 0;
for (const item of QUERIES) {
  if (!item.expected.length) { console.log(`SKIP (no expected id in corpus): ${item.q}`); continue; }
  n++;
  let bmGot = [];
  try {
    bmGot = engine.search(item.q).slice(0, 5).map((r) => r[0]);
  } catch (e) {
    console.log(`BM25 search error for "${item.q}": ${e.message}`);
  }
  const subGot = substringSearch(item.q);
  const bm = metrics(bmGot, item.expected);
  const sb = metrics(subGot, item.expected);
  bmR += bm.recall; bmP += bm.precision; subR += sb.recall; subP += sb.precision;
  console.log(`\nQ: ${item.q}\n  expected : ${item.expected.join(", ")}`);
  console.log(`  BM25     : [${bmGot.join(", ")}]  R=${bm.recall.toFixed(2)} P=${bm.precision.toFixed(2)}`);
  console.log(`  substring: [${subGot.join(", ")}]  R=${sb.recall.toFixed(2)} P=${sb.precision.toFixed(2)}`);
}
console.log(`\nMean over ${n} queries: BM25 recall@5=${(bmR / n).toFixed(3)} precision@5=${(bmP / n).toFixed(3)} | substring recall@5=${(subR / n).toFixed(3)} precision@5=${(subP / n).toFixed(3)}`);
console.log(JSON.stringify({ probe: "wink-bm25", corpus: docs.length, queries: n, bm25: { recallAt5: +(bmR / n).toFixed(3), precisionAt5: +(bmP / n).toFixed(3) }, substring: { recallAt5: +(subR / n).toFixed(3), precisionAt5: +(subP / n).toFixed(3) } }));
