/**
 * Slice D overlay tests (2026-11-18): the per-word overlay
 * partition and its fill-only law (owner's pre-rulings 1b/2a/3a;
 * batch 1 ratified 2026-11-18). The overlay speaks only where
 * the curated table and the WordNet climb are both silent —
 * pinned here as an eligibility invariant over the entries
 * themselves, so a future table or climb addition that starts
 * speaking for one of these words fails this suite and forces
 * the entry's retirement.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { lookupClassification } from "../src/ansci/classify";
import { buildForkGraph, deriveSentence } from "../src/ansci/join";
import { OVERLAY_ENTRIES, lookupOverlay } from "../src/ansci/overlay";
import { parse } from "../src/ansci/parse";
import { tierOfProvenance } from "../src/ansci/pricing";
import { climbClassification, enableWordnetLexicon } from "../src/ansci/wordnet-lex";

enableWordnetLexicon(true);

const graph = buildForkGraph();

test("batch 1 as ratified: 29 entries, every one with reviewer, rationale, and confidence at or under the 0.80 cap", () => {
  assert.equal(OVERLAY_ENTRIES.length, 29);
  for (const entry of OVERLAY_ENTRIES) {
    assert.ok(entry.confidence <= 0.8, `${entry.concept} exceeds the cap`);
    assert.ok(entry.confidence > 0, `${entry.concept} has no confidence`);
    assert.equal(entry.provenance, "overlay");
    assert.ok(entry.reviewer.length > 0, `${entry.concept} has no reviewer`);
    assert.ok(entry.rationale.length > 0, `${entry.concept} has no rationale`);
  }
  // The owner's contested rulings, as landed: four accepted…
  for (const w of ["camphor", "coal", "saltpeter", "flu"]) {
    assert.ok(lookupOverlay(w), `${w} was accepted and must be present`);
  }
  // …and six abstentions that stay located gaps.
  for (const w of ["silk", "leather", "wool", "sesame", "ink", "beeswax"]) {
    assert.equal(lookupOverlay(w), undefined, `${w} was ruled an abstention and must not be filed`);
  }
});

test("fill-only eligibility: every overlay concept is one the table does not own and the climb does not classify", () => {
  for (const entry of OVERLAY_ENTRIES) {
    assert.equal(lookupClassification(entry.concept), undefined, `${entry.concept} is table-owned — its overlay entry must retire`);
    // Named exception, recorded at the A+D merge (2026-11-18):
    // cinnabar's climb candidate is its MOTH sense (Slice A's
    // insect stop, aspect "animal", anchor "insect") — a
    // different reading from the mineral this entry files, whose
    // own chain still reaches no anchor and no stop. The entry
    // stands for the mineral reading; any OTHER overlay concept
    // gaining a climb classification retires its entry.
    if (entry.concept === "cinnabar") {
      const cc = climbClassification("cinnabar");
      assert.equal(cc?.anchor, "insect", "cinnabar's only climb classification may be the moth sense's");
      assert.equal(cc?.aspect, "animal");
      continue;
    }
    assert.equal(climbClassification(entry.concept), undefined, `${entry.concept} is climb-classified — its overlay entry must retire`);
  }
});

test("the overlay prices at the derived tier (ruling 2a)", () => {
  assert.equal(tierOfProvenance("overlay"), "derived");
});

test("flu carries its illness aspect, and lookup mirrors the table's fallback", () => {
  assert.equal(lookupOverlay("flu")?.element, "Metal");
  assert.equal(lookupOverlay("flu")?.aspect, "illness");
  assert.equal(lookupOverlay("flu", "illness")?.element, "Metal");
  assert.equal(lookupOverlay("quartz")?.element, "Earth");
  assert.equal(lookupOverlay("quartz")?.aspect, "overall");
});

test("deriveSentence: an overlay word joins with provenance 'overlay' and the element's row at the entry's confidence", () => {
  const p = parse("The quartz is hard.", "en");
  const byNode = deriveSentence(graph, p);
  const node = p.meaning.nodes.find((n) => n.lemma === "quartz")!;
  const d = byNode.get(node.id);
  assert.ok(d, "the quartz node joins");
  assert.equal(d.classification?.element, "Earth");
  assert.equal(d.classification?.provenance, "overlay");
  assert.equal(d.classification?.confidence, 0.6);
  assert.equal(d.gated, false);
  assert.ok(d.conclusions.length > 0, "the Earth row is inherited");
  assert.ok(d.conclusions.every((c) => c.confidence <= 0.6));
});

test("deriveSentence: a sub-gate overlay entry is recorded as gated and derives nothing", () => {
  const p = parse("The lacquer is glossy.", "en");
  const byNode = deriveSentence(graph, p);
  const node = p.meaning.nodes.find((n) => n.lemma === "lacquer")!;
  const d = byNode.get(node.id);
  assert.ok(d, "the lacquer node is recorded");
  assert.equal(d.classification?.provenance, "overlay");
  assert.equal(d.gated, true);
  assert.deepEqual(d.conclusions, []);
});

test("fill-only in the join: a table word in the same sentence keeps its own provenance, untouched by the overlay", () => {
  const p = parse("Salt seasons the soup and quartz lines the path.", "en");
  const byNode = deriveSentence(graph, p);
  const salt = p.meaning.nodes.find((n) => n.lemma === "salt")!;
  const d = byNode.get(salt.id);
  assert.ok(d?.classification, "salt joins");
  assert.notEqual(d.classification?.provenance, "overlay");
});
