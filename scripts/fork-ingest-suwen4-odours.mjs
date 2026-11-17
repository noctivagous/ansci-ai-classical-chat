/**
 * fork-ingest-suwen4-odours.mjs — the ingestion pipeline's second
 * run: the five odours of Suwen ch. 4 (金匱真言論) from the
 * Wikisource received text.
 *
 * Why this run exists (2026-11-17, the SenseUnit build): the
 * odour row was filed NOWHERE — no smell/odour entries in
 * classify.ts, ingested.ts or seed.ts — and the SenseUnit's smell
 * channel needs its quality row like the other channels have
 * theirs. Ch. 5 (the first run) has no odour row; ch. 4's
 * five-direction blocks each close with 其臭X.
 *
 * The ch. 5 reader (ingest.ts) parses ch. 5's 在X為Y tables and
 * does not read ch. 4's block shape, so this run's reader stage
 * is local to the script: it locates each 其臭X clause in the
 * acquired chapter text and extracts the whole block sentence
 * mechanically as the citation quote (never hand-typed, so the
 * review stage's verbatim check is a real check). Review and
 * apply are the pipeline's own deterministic stages
 * (ingest.reviewProposal / ingest.applyProposal) — no citation,
 * no insertion, enforced there.
 *
 * Records bank into a SEPARATE section of src/fork/ingested.ts
 * (INGESTED_ASSERTIONS_CH4), outside the ch. 5 generated block,
 * which the ch. 5 script regenerates. The run is idempotent:
 * re-running against the banked store refuses every proposal as
 * a duplicate.
 *
 * Run via: node scripts/fork-ingest-suwen4-odours.mjs
 */
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const { htmlToText, reviewProposal, applyProposal } = require("../dist/src/fork/ingest.js");
const { CLASSIFICATIONS } = require("../dist/src/fork/classify.js");
const { INGESTED_ASSERTIONS } = require("../dist/src/fork/ingested.js");

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
// Ch. 4 is the last chapter of volume 1. The page names the
// chapter in its table of contents too; the chapter's OWN
// heading is the occurrence immediately followed by the
// chapter's opening question (黃帝問曰：天有八風…). The body
// runs from there to the chapter's closing line (是謂得道。),
// past which only page furniture follows.
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

// Record the acquisition verbatim for offline re-verification.
fs.mkdirSync(path.join(root, "data/ingest"), { recursive: true });
fs.writeFileSync(path.join(root, "data/ingest/suwen-ch4.txt"), body + "\n", "utf8");
fs.writeFileSync(
  path.join(root, "data/ingest/suwen-ch4.source.json"),
  JSON.stringify(source, null, 2) + "\n",
  "utf8",
);

/* Reader stage: the five odour clauses. The gloss/phase/system
 * assignments are the scheme's own vocabulary (the WP1 survey,
 * docs/fork/wp1-classification-survey.md §smell row, verified
 * against this same received text); the quote for each is the
 * block sentence extracted from the acquired body. */
const ODOURS = [
  { concept: "rank", hanzi: "臊", element: "Wood", system: "east" },
  { concept: "scorched", hanzi: "焦", element: "Fire", system: "south" },
  { concept: "fragrant", hanzi: "香", element: "Earth", system: "centre" },
  { concept: "fishy", hanzi: "腥", element: "Metal", system: "west" },
  { concept: "rotten", hanzi: "腐", element: "Water", system: "north" },
];

function blockSentence(hanzi) {
  const marker = `其臭${hanzi}`;
  const at = body.indexOf(marker);
  if (at < 0) throw new Error(`read: clause ${marker} not found in the acquired ch. 4 text`);
  const start = body.lastIndexOf("。", at) + 1;
  const end = body.indexOf("。", at);
  if (end < 0) throw new Error(`read: block sentence for ${marker} does not terminate`);
  return body.slice(start, end + 1).trim();
}

const proposals = ODOURS.map((o) => ({
  concept: o.concept,
  hanzi: o.hanzi,
  aspect: "odour",
  value: o.element,
  valueKind: "element",
  element: o.element,
  scheme: "five-direction correspondence table",
  system: o.system,
  citation: { text: source.text, chapter: source.chapter, quote: blockSentence(o.hanzi) },
  readerNote:
    `The ${o.system} block's parallel table closes 其臭${o.hanzi}; the block's phase is ${o.element} ` +
    `(its colour/flavour rows agree), so the chapter's scheme classifies ${o.concept} (${o.hanzi}) as ${o.element} under odour.`,
}));

// Review + apply against the existing banked store (ch. 5) plus
// this run's own records as they land.
const existingCh4 = (() => {
  try {
    return require("../dist/src/fork/ingested.js").INGESTED_ASSERTIONS_CH4 ?? [];
  } catch {
    return [];
  }
})();
const reviewStore = [...INGESTED_ASSERTIONS, ...existingCh4];
const applied = [];
const refused = [];
for (const p of proposals) {
  const outcome = reviewProposal(p, body, { store: reviewStore, classifications: CLASSIFICATIONS });
  if (outcome.verdict === "pass") {
    const rec = applyProposal(applied, p, outcome, source, RUN_DATE, "ing-suwen4");
    reviewStore.push(rec);
  } else {
    refused.push({ concept: p.concept, outcome });
  }
}
console.log(`ch. 4 odours: ${applied.length} applied, ${refused.length} refused`);
for (const r of refused) console.log(`  refused ${r.concept}: ${r.outcome.relation} — ${r.outcome.relationDetail}`);

if (applied.length && !existingCh4.length) {
  const storePath = path.join(root, "src/fork/ingested.ts");
  const storeSrc = fs.readFileSync(storePath, "utf8");
  const startMarker = "// === BANKED ASSERTIONS CH4 (generated by scripts/fork-ingest-suwen4-odours.mjs — do not hand-edit) ===";
  const endMarker = "// === END BANKED ASSERTIONS CH4 ===";
  const start = storeSrc.indexOf(startMarker);
  const end = storeSrc.indexOf(endMarker);
  if (start < 0 || end < 0) throw new Error("ingested.ts: BANKED CH4 markers not found");
  const generated =
    startMarker +
    "\nexport const INGESTED_ASSERTIONS_CH4: IngestedAssertion[] = " +
    JSON.stringify(applied, null, 2) +
    ";\n";
  fs.writeFileSync(storePath, storeSrc.slice(0, start) + generated + storeSrc.slice(end), "utf8");
  execFileSync("npm", ["run", "build", "--silent"], { cwd: root, stdio: "inherit" });
  const reloaded = require("../dist/src/fork/ingested.js");
  console.log(`banked store reloads: ch. 5 ${reloaded.INGESTED_ASSERTIONS.length} + ch. 4 ${reloaded.INGESTED_ASSERTIONS_CH4.length} records`);
}
