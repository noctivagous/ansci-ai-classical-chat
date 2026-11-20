/**
 * ansci-ingest-suwen4-numbers.mjs — the ingestion pipeline's
 * third run: the five NUMBERS of Suwen ch. 4 (金匱真言論） from
 * the Wikisource received text — the first deposit in the OKU's
 * Numbers slice.
 *
 * Why this run exists (2026-11-17, owner's ruling addition
 * during the SenseUnit build): the QuantificationUnit — named,
 * placement settled (inside the OKU, over the Numbers slice,
 * with an LPU bridge, the QuantificationLanguageUnit), built in
 * a later arc — lives in the OKU as the Numbers slice's
 * specialist reader, the way the EDU/SenseUnit are specialists
 * over their OKU slices. Ch. 4
 * was already being fetched for the odour row, and each of its
 * five direction blocks states a number （其數…): the run banks
 * that row from the SAME acquired text, with the same pattern
 * and provenance labelling as the odour run.
 *
 * Values are taken from the acquired text itself, never from
 * recollection: the reader stage locates each 其數X clause in
 * the chapter body and extracts the containing block sentence
 * mechanically as the citation quote. The assignments below
 * (eight→Wood/east, seven→Fire/south, five→Earth/centre,
 * nine→Metal/west, six→Water/north) are what the fetched text
 * states — each block's 其音/其色 rows agree on its phase.
 *
 * Records bank into their own section of src/ansci/ingested.ts
 * (INGESTED_ASSERTIONS_CH4_NUMBERS). Idempotent: re-running
 * against the banked store refuses every proposal as a
 * duplicate.
 *
 * Run via: node scripts/ansci-ingest-suwen4-numbers.mjs
 */
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const { htmlToText, reviewProposal, applyProposal } = require("../dist/src/ansci/ingest.js");
const { CLASSIFICATIONS } = require("../dist/src/ansci/classify.js");
const { INGESTED_ASSERTIONS } = require("../dist/src/ansci/ingested.js");

const SOURCE_URL = "https://zh.wikisource.org/wiki/黃帝內經/素問第一卷";
const RUN_DATE = "2026-11-17";

const sourceBase = {
  text: "黃帝內經 · 素問 (Huángdì Nèijīng, Sùwèn)",
  chapter: "金匱真言論第四 (Jīn Guì Zhēn Yán Lùn, ch. 4)",
  edition:
    "Wikisource received text (zh.wikisource.org), 黃帝內經/素問第一卷; " +
    "the book's index presents this 素問 as the Jin-dynasty published text",
  sourceUrl: SOURCE_URL,
  retrieved: RUN_DATE,
  sha256: "",
};

async function fetchPage(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ansci-fork-ingest/0.1 (research prototype; ingestion pipeline run)" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

const html = await fetchPage(SOURCE_URL);
const pageText = htmlToText(html);
// Same acquisition span as the odour run: the chapter's own
// heading (followed within 300 chars by 天有八風） to 是謂得道。
let body = "";
{
  let from = 0;
  for (;;) {
    const start = pageText.indexOf("金匱真言論篇第四", from);
    if (start < 0) break;
    const after = pageText.slice(start + "金匱真言論篇第四".length);
    if (after.slice(0, 300).includes("天有八風")) {
      const close = after.indexOf("是謂得道。");
      body = (close >= 0 ? after.slice(0, close + "是謂得道。".length) : after).trim();
      break;
    }
    from = start + 1;
  }
}
if (body.length < 100) throw new Error(`acquire: no plausible ch. 4 body (longest span ${body.length} chars)`);
const sha256 = createHash("sha256").update(body, "utf8").digest("hex");
const source = { ...sourceBase, sha256 };
const chapter = { source, body };

// The acquisition is shared with the odour run (same chapter,
// same span); the saved files are rewritten identically.
fs.mkdirSync(path.join(root, "data/ingest"), { recursive: true });
fs.writeFileSync(path.join(root, "data/ingest/suwen-ch4.txt"), body + "\n", "utf8");
fs.writeFileSync(
  path.join(root, "data/ingest/suwen-ch4.source.json"),
  JSON.stringify(source, null, 2) + "\n",
  "utf8",
);

/* Reader stage: the five number clauses, AS THE FETCHED TEXT
 * STATES THEM (verified against data/ingest/suwen-ch4.txt:
 * 其數八 with 其音角/east, 其數七 with 其音徵/south, 其數五 with
 * 其音宮/centre, 其數九 with 其音商/west, 其數六 with 其音羽/
 * north). As with the odour row, the record's value is the
 * block's phase — the scheme files the number under its phase. */
const NUMBERS = [
  { concept: "eight", hanzi: "八", digit: "8", element: "Wood", system: "east" },
  { concept: "seven", hanzi: "七", digit: "7", element: "Fire", system: "south" },
  { concept: "five", hanzi: "五", digit: "5", element: "Earth", system: "centre" },
  { concept: "nine", hanzi: "九", digit: "9", element: "Metal", system: "west" },
  { concept: "six", hanzi: "六", digit: "6", element: "Water", system: "north" },
];

function blockSentence(hanzi) {
  const marker = `其數${hanzi}`;
  const at = body.indexOf(marker);
  if (at < 0) throw new Error(`read: clause ${marker} not found in the acquired ch. 4 text`);
  const start = body.lastIndexOf("。", at) + 1;
  const end = body.indexOf("。", at);
  if (end < 0) throw new Error(`read: block sentence for ${marker} does not terminate`);
  return body.slice(start, end + 1).trim();
}

const proposals = NUMBERS.map((n) => ({
  concept: n.concept,
  hanzi: n.hanzi,
  aspect: "number",
  value: n.element,
  valueKind: "element",
  element: n.element,
  scheme: "five-direction correspondence table",
  system: n.system,
  citation: { text: source.text, chapter: source.chapter, quote: blockSentence(n.hanzi) },
  readerNote:
    `The ${n.system} block's parallel table states 其數${n.hanzi} — its number is ${n.concept} (${n.digit}); ` +
    `the block's phase is ${n.element} (its colour/tone rows agree), so the chapter's scheme files the ` +
    `number ${n.concept} (${n.hanzi}) under ${n.element} in the number row — the OKU Numbers slice.`,
}));

const existingNumbers = (() => {
  try {
    return require("../dist/src/ansci/ingested.js").INGESTED_ASSERTIONS_CH4_NUMBERS ?? [];
  } catch {
    return [];
  }
})();
const existingCh4 = (() => {
  try {
    return require("../dist/src/ansci/ingested.js").INGESTED_ASSERTIONS_CH4 ?? [];
  } catch {
    return [];
  }
})();
const reviewStore = [...INGESTED_ASSERTIONS, ...existingCh4, ...existingNumbers];
const applied = [];
const refused = [];
for (const p of proposals) {
  const outcome = reviewProposal(p, body, { store: reviewStore, classifications: CLASSIFICATIONS });
  if (outcome.verdict === "pass") {
    const rec = applyProposal(applied, p, outcome, source, RUN_DATE, "ing-suwen4n");
    reviewStore.push(rec);
  } else {
    refused.push({ concept: p.concept, outcome });
  }
}
console.log(`ch. 4 numbers: ${applied.length} applied, ${refused.length} refused`);
for (const r of refused) console.log(`  refused ${r.concept}: ${r.outcome.relation} — ${r.outcome.relationDetail}`);

if (applied.length && !existingNumbers.length) {
  const storePath = path.join(root, "src/ansci/ingested.ts");
  const storeSrc = fs.readFileSync(storePath, "utf8");
  const startMarker = "// === BANKED ASSERTIONS CH4 NUMBERS (generated by scripts/ansci-ingest-suwen4-numbers.mjs — do not hand-edit) ===";
  const endMarker = "// === END BANKED ASSERTIONS CH4 NUMBERS ===";
  const start = storeSrc.indexOf(startMarker);
  const end = storeSrc.indexOf(endMarker);
  if (start < 0 || end < 0) throw new Error("ingested.ts: BANKED CH4 NUMBERS markers not found");
  const generated =
    startMarker +
    "\nexport const INGESTED_ASSERTIONS_CH4_NUMBERS: IngestedAssertion[] = " +
    JSON.stringify(applied, null, 2) +
    ";\n";
  fs.writeFileSync(storePath, storeSrc.slice(0, start) + generated + storeSrc.slice(end), "utf8");
  execFileSync("npm", ["run", "build", "--silent"], { cwd: root, stdio: "inherit" });
  const reloaded = require("../dist/src/ansci/ingested.js");
  console.log(`banked store reloads: ch. 4 numbers ${reloaded.INGESTED_ASSERTIONS_CH4_NUMBERS.length} records; allIngested ${reloaded.allIngested().length}`);
}
