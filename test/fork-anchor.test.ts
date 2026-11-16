/**
 * Anchor-quality repair tests (2026-11-15): the climb's anchor test
 * is sense-pinned — an anchor fires only on synsets carrying its
 * classified sense (docs/fork/anchor-audit.md). These tests pin the
 * rule on the stage-4 report's five named wayward examples, on the
 * frozen sense sets' load-bearing candidates, and on the widened
 * attested anchors. The rule is mechanism-level: no test here names
 * a blocklist, because the implementation has none.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { anchorPinReport, climbCandidates, enableWordnetLexicon } from "../src/fork/wordnet-lex";
import { lookupClassification } from "../src/fork/classify";

enableWordnetLexicon(true);

const ungated = (lemma: string) => climbCandidates(lemma).filter((c) => !c.gated);
const elements = (lemma: string) => ungated(lemma).map((c) => `${c.element} via ${c.anchor}`);

test("rock: the candy-synset route to 'sweet' no longer fires (Earth candidate gone)", () => {
  assert.deepEqual(ungated("rock"), []);
});

test("kick: the complaint sense of 'beef' no longer fires; the excitement route stands", () => {
  assert.deepEqual(elements("kick"), ["Fire via excitement"]);
});

test("chalk: the drug-slang sense of 'ice' no longer fires; the colour route to white stands", () => {
  assert.deepEqual(elements("chalk"), ["Metal via white"]);
});

test("brass: neither the instrument sense of 'wind' nor the boldness sense of 'face' fires", () => {
  assert.deepEqual(ungated("brass"), []);
});

test("snap: the easy-undertaking sense of 'breeze' no longer fires; the gingersnap route to cake stands (a coherent minor-sense path, retained by design)", () => {
  assert.deepEqual(elements("snap"), ["Earth via cake"]);
});

test("stock: blood's lineage synset no longer supplies a Fire rival — the broth baseline stands unopposed", () => {
  assert.deepEqual(elements("stock"), ["Water via broth"]);
});

test("frozen premises preserved by the exception data: passion keeps both rivals, rest keeps both, lettuce keeps both, outpouring keeps both", () => {
  assert.deepEqual(elements("passion").sort(), ["Fire via heat", "Wood via rage"]);
  assert.deepEqual(elements("rest").sort(), ["Earth via relief", "Water via sleep"]);
  assert.deepEqual(elements("lettuce").sort(), ["Earth via bread", "Wood via green"]);
  assert.deepEqual(elements("outpouring").sort(), ["Water via flood", "Wood via spring"]);
  assert.deepEqual(elements("alabaster").sort(), ["Metal via white", "Water via salt"]);
});

test("blow keeps its Water candidate through snow — CLIMB_ANCHORS are climb infrastructure and keep string match by design (the recorded carve-out)", () => {
  assert.ok(elements("blow").includes("Water via snow"));
});

test("the trigram overrides exclude the drug synset: thunder pins the two noise synsets only", () => {
  const thunder = anchorPinReport().find((p) => p.concept === "thunder")!;
  assert.equal(thunder.mode, "override");
  assert.deepEqual(thunder.pinned.map((s) => s.id).sort(), ["wn-n07520497", "wn-n07540248"]);
});

test("every classification anchor is either pinned or named unpinned — the un-repaired residue is a list", () => {
  const report = anchorPinReport();
  assert.ok(report.length >= 160);
  for (const p of report) {
    if (p.mode === "unpinned") assert.equal(p.pinned.length, 0, `${p.concept}: unpinned with pins`);
    else if (p.mode !== "climb-anchor") assert.ok(p.pinned.length >= 1, `${p.concept}: mode ${p.mode} but no pins`);
  }
});

test("widened attested anchors: the Suwen ch. 4 livestock and grain rows are the concepts' primaries", () => {
  assert.equal(lookupClassification("chicken")?.element, "Wood");
  assert.equal(lookupClassification("goat")?.element, "Fire");
  assert.equal(lookupClassification("cattle")?.element, "Earth");
  assert.equal(lookupClassification("horse")?.element, "Metal");
  assert.equal(lookupClassification("dog")?.element, "Metal");
  assert.equal(lookupClassification("pig")?.element, "Water");
  assert.equal(lookupClassification("wheat")?.element, "Wood");
  assert.equal(lookupClassification("rice")?.element, "Metal");
  assert.equal(lookupClassification("bean")?.element, "Water");
  for (const c of ["chicken", "goat", "cattle", "horse", "dog", "pig", "wheat", "rice", "bean"]) {
    assert.equal(lookupClassification(c)?.provenance, "fork-curated", c);
  }
});

test("the widened anchors serve the climb: hen reaches chicken (Wood), puppy reaches dog (Metal)", () => {
  assert.ok(elements("hen").includes("Wood via chicken"));
  assert.ok(elements("puppy").includes("Metal via dog"));
});
