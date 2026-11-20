/**
 * ansci-ingest.test.ts — the ingestion pipeline (Slice 3).
 *
 * Pins the slice's three hard rules:
 *  1. NO CITATION, NO INSERTION — review refuses a citation-less
 *     proposal, and apply() refuses it again even behind a forged
 *     "pass" outcome; a quote that does not occur in the acquired
 *     text is refused at review.
 *  2. VARIANT SCHEMES COEXIST — the same (concept, aspect) from
 *     two chapters with different values banks both records,
 *     source-scoped; a duplicate re-apply is refused, and a
 *     same-chapter self-contradiction is refused as a conflict.
 *  3. THE STORE IS ITS OWN — banked records carry complete
 *     citations and review records, and the ordinary
 *     classification lookup never returns an ingested record.
 * Plus the first real run's integrity: every banked quote
 * verifies verbatim against the recorded acquired text
 * (data/ingest/suwen-ch5.txt), and the reader reproduces the
 * run's 63 proposals from that text.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  acquireChapter,
  applyProposal,
  readPassages,
  reviewProposal,
  runPipeline,
  segmentChapter,
  type AcquiredChapter,
  type IngestedAssertion,
  type Proposal,
  type ReviewOutcome,
  type SourceText,
} from "../src/ansci/ingest";
import { INGESTED_ASSERTIONS, ingestedFor, ingestedVariants } from "../src/ansci/ingested";
import { CLASSIFICATIONS, lookupClassification } from "../src/ansci/classify";

const CH5: SourceText = {
  text: "黃帝內經 · 素問 (Huángdì Nèijīng, Sùwèn)",
  chapter: "陰陽應象大論第五 (Yīn Yáng Yìng Xiàng Dà Lùn, ch. 5)",
  edition: "test fixture",
  sourceUrl: "https://example.invalid/suwen",
  retrieved: "2026-11-16",
  sha256: "fixture",
};
const CH4: SourceText = { ...CH5, chapter: "金匱真言論第四 (Jīn Guì Zhēn Yán Lùn, ch. 4)" };

const NORTH_TABLE =
  "其在天為寒，在地為水，在體為骨，在藏為腎，在色為黑，在音為羽，在聲為呻，在變動為慄，在竅為耳，在味為鹹，在志為恐。";
const BODY_CH5 = `黃帝曰：陰陽者，天地之道也。\n北方生寒，寒生水，水生鹹，鹹生腎，腎生骨髓，髓生肝，腎主耳。${NORTH_TABLE}`;
const BODY_CH4 = `南方生熱，熱生火，火生苦，苦生心，心生血，血生脾，心主耳。其在天為熱，在地為火，在體為脈，在藏為心，在色為赤，在音為徵，在聲為笑，在變動為憂，在竅為耳，在味為苦，在志為喜。`;

function earsProposal(source: SourceText, element: "Water" | "Fire", quote: string): Proposal {
  return {
    concept: "ears",
    hanzi: "耳",
    aspect: "orifice",
    value: element,
    valueKind: "element",
    element,
    scheme: "five-direction correspondence table",
    system: element === "Water" ? "north" : "south",
    citation: { text: source.text, chapter: source.chapter, quote },
    readerNote: "fixture proposal",
  };
}

const PASS: ReviewOutcome = {
  verdict: "pass",
  checks: [{ name: "citation-complete", ok: true, detail: "forged" }],
  relation: "new",
  relationDetail: "forged pass outcome",
  reviewer: "test",
};

test("hard rule 1: a citation-less proposal is refused at review AND at apply", () => {
  const store: IngestedAssertion[] = [];
  const noQuote = earsProposal(CH5, "Water", "");
  const outcome = reviewProposal(noQuote, BODY_CH5, { store, classifications: CLASSIFICATIONS });
  assert.equal(outcome.verdict, "refuse");
  assert.equal(outcome.checks.find((c) => c.name === "citation-complete")?.ok, false);
  // Even behind a forged "pass" outcome, apply() re-checks and refuses.
  assert.throws(() => applyProposal(store, noQuote, PASS, CH5, "2026-11-16", "t"), /no citation, no insertion/);
  assert.equal(store.length, 0);
});

test("hard rule 1: a quote absent from the acquired text is refused at review", () => {
  const store: IngestedAssertion[] = [];
  const fabricated = earsProposal(CH5, "Water", "其在天為寒，在竅為心，在味為鹹。");
  const outcome = reviewProposal(fabricated, BODY_CH5, { store, classifications: CLASSIFICATIONS });
  assert.equal(outcome.verdict, "refuse");
  assert.equal(outcome.checks.find((c) => c.name === "quote-verified")?.ok, false);
  assert.throws(() => applyProposal(store, fabricated, outcome, CH5, "2026-11-16", "t"), /apply refused/);
  assert.equal(store.length, 0);
});

test("hard rule 2: variant schemes coexist — ch. 4 and ch. 5 both bank their ears", () => {
  const store: IngestedAssertion[] = [];
  const p5 = earsProposal(CH5, "Water", NORTH_TABLE);
  const o5 = reviewProposal(p5, BODY_CH5, { store, classifications: CLASSIFICATIONS });
  assert.equal(o5.verdict, "pass");
  applyProposal(store, p5, o5, CH5, "2026-11-16", "t");

  // Ch. 4's scheme puts the ear with the heart (Fire system);
  // ch. 5's puts it with the kidneys (Water). Neither overwrites.
  const p4 = earsProposal(CH4, "Fire", BODY_CH4.split("。")[1] + "。");
  const o4 = reviewProposal(p4, BODY_CH4, { store, classifications: CLASSIFICATIONS });
  assert.equal(o4.verdict, "pass");
  assert.equal(o4.relation, "variant");
  applyProposal(store, p4, o4, CH4, "2026-11-16", "t");

  assert.equal(store.length, 2);
  assert.deepEqual(new Set(store.map((a) => a.value)), new Set(["Water", "Fire"]));
  assert.deepEqual(new Set(store.map((a) => a.citation.chapter)), new Set([CH5.chapter, CH4.chapter]));
});

test("hard rule 2: re-applying the same proposal is a refused duplicate; a same-chapter contradiction is a refused conflict", () => {
  const store: IngestedAssertion[] = [];
  const p = earsProposal(CH5, "Water", NORTH_TABLE);
  applyProposal(store, p, reviewProposal(p, BODY_CH5, { store, classifications: CLASSIFICATIONS }), CH5, "2026-11-16", "t");
  assert.equal(store.length, 1);

  const dup = reviewProposal(p, BODY_CH5, { store, classifications: CLASSIFICATIONS });
  assert.equal(dup.verdict, "refuse");
  assert.equal(dup.relation, "duplicate");
  assert.throws(() => applyProposal(store, p, dup, CH5, "2026-11-16", "t"), /apply refused/);

  const contra = earsProposal(CH5, "Fire", NORTH_TABLE);
  const conflict = reviewProposal(contra, BODY_CH5, { store, classifications: CLASSIFICATIONS });
  assert.equal(conflict.verdict, "refuse");
  assert.equal(conflict.relation, "conflict");
  assert.equal(store.length, 1);
});

test("acquire picks the chapter span, not the navigation furniture", () => {
  const html =
    `<html><body><div>陰陽應象大論第五 陰陽離合論第六</div>` +
    `<h2>陰陽應象大論第五</h2><p>${"天地之道也。".repeat(30)}</p>` +
    `<h2>陰陽離合論第六</h2><p>余聞天為陽。</p></body></html>`;
  const chapter = acquireChapter({
    pageHtml: html,
    chapterHeading: "陰陽應象大論第五",
    nextChapterHeading: "陰陽離合論第六",
    source: CH5,
  });
  assert.ok(chapter.body.includes("天地之道也"));
  assert.ok(!chapter.body.includes("余聞天為陽"));
  assert.equal(segmentChapter(chapter).length, 1);
});

/* ---- The real run: Suwen ch. 5, banked 2026-11-16 ---- */

const ACQUIRED = path.join(__dirname, "../../data/ingest/suwen-ch5.txt");
const HAS_ACQUIRED = fs.existsSync(ACQUIRED);

test("the banked store: 63 records, each with a complete citation and review record", () => {
  assert.equal(INGESTED_ASSERTIONS.length, 63);
  for (const a of INGESTED_ASSERTIONS) {
    assert.equal(a.provenance, "ingested", a.id);
    assert.equal(a.status, "banked", a.id);
    assert.ok(a.citation.text && a.citation.chapter && a.citation.quote, `${a.id}: citation complete`);
    assert.ok(a.citation.edition && a.citation.sourceUrl, `${a.id}: edition + source recorded`);
    assert.ok(a.review.basis.includes("quote verified verbatim"), `${a.id}: review basis present`);
    assert.deepEqual(
      [...a.review.checks].sort(),
      ["citation-complete", "duplicate-variant-scan", "quote-verified", "scheme-complete"],
      `${a.id}: all four review checks recorded`,
    );
    if (a.valueKind === "element") assert.equal(a.value, a.element, `${a.id}: value is its element`);
  }
  const relations = new Set(INGESTED_ASSERTIONS.map((a) => a.review.relation));
  assert.deepEqual([...relations].sort(), ["corroborates", "new"]);
});

test("the banked orifice row is ch. 5's scheme (tongue for the heart, ear for the kidneys)", () => {
  const orifice = Object.fromEntries(
    INGESTED_ASSERTIONS.filter((a) => a.aspect === "orifice").map((a) => [a.concept, a.value]),
  );
  assert.deepEqual(orifice, { eyes: "Wood", tongue: "Fire", mouth: "Earth", nose: "Metal", ears: "Water" });
  // The two 憂 of the chapter stay apart: sorrow (Metal, emotion)
  // and trembling-speech (Fire, change) are different records.
  assert.equal(ingestedFor("sorrow")[0]?.element, "Metal");
  assert.equal(ingestedFor("trembling-speech")[0]?.element, "Fire");
  assert.equal(ingestedVariants("ears", "orifice").length, 0); // one source banked so far: no variant set yet
});

test("hard rule 3: the ordinary classification lookup never returns an ingested record", () => {
  // sorrow → Metal and azure → Wood exist ONLY in the ingested store.
  assert.equal(ingestedFor("sorrow").length, 1);
  assert.equal(ingestedFor("azure").length, 1);
  assert.equal(lookupClassification("sorrow"), undefined);
  assert.equal(lookupClassification("azure"), undefined);
});

test("every banked quote verifies verbatim against the recorded acquired text", () => {
  if (!HAS_ACQUIRED) return;
  const body = fs.readFileSync(ACQUIRED, "utf8");
  const squash = (s: string) => s.replace(/\s+/g, "");
  for (const a of INGESTED_ASSERTIONS) {
    assert.ok(squash(body).includes(squash(a.citation.quote)), `${a.id}: quote present in acquired text`);
  }
});

test("the reader reproduces the run from the acquired text (63 proposals; the collective line queued, not banked)", () => {
  if (!HAS_ACQUIRED) return;
  const body = fs.readFileSync(ACQUIRED, "utf8").trim();
  const source: SourceText = { ...CH5, edition: "recorded acquisition" };
  const chapter: AcquiredChapter = { source, body };
  const run = runPipeline(chapter, [], CLASSIFICATIONS, { date: "2026-11-16", idPrefix: "ing-suwen5" });
  assert.equal(run.passages.length, 37);
  assert.equal(run.proposals.length, 63);
  assert.equal(run.applied.length, 63);
  assert.equal(run.refused.length, 0);
  const queued = run.notProposed.find((n) => n.text.includes("喜怒悲憂恐"));
  assert.ok(queued, "the collective emotion line is queued");
  assert.match(queued!.reason, /悲/);
  // Idempotency against the reproduced store.
  const rerun = runPipeline(chapter, run.applied.slice(), CLASSIFICATIONS, { date: "2026-11-16", idPrefix: "ing-suwen5" });
  assert.equal(rerun.applied.length, 0);
  assert.ok(rerun.refused.every((r) => r.outcome.relation === "duplicate"));
});
