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

test("rock: the candy-synset route to 'sweet' no longer fires; the material sense takes the stone class (Slice B, 2026-11-18)", () => {
  // Premise corrected to the new truth, Slice A precedent: the
  // candy route stays dead (no candidate via 'sweet'), and rock's
  // material sense (sense 7, {rock, stone}) now stops at the R3
  // stone class — an Earth candidate by the designed route, not
  // the wayward one this test was written against.
  assert.deepEqual(elements("rock"), ["Earth via rock"]);
  assert.ok(ungated("rock").every((c) => c.viaClass?.stuffClass === "stone"));
});

test("kick: the complaint sense of 'beef' no longer fires; the excitement route stands", () => {
  assert.deepEqual(elements("kick"), ["Fire via excitement"]);
});

test("chalk: the drug-slang sense of 'ice' no longer fires; the colour route to white stands", () => {
  assert.deepEqual(elements("chalk"), ["Metal via white"]);
});

test("brass: neither the instrument sense of 'wind' nor the boldness sense of 'face' fires; the alloy sense takes the metal class (Slice B, 2026-11-18)", () => {
  // Premise corrected to the new truth, Slice A precedent: the
  // wind/face routes stay dead, and brass — an alloy — now stops
  // at the R3 metal class via copper-base alloy (2 hops, @0.8).
  assert.deepEqual(elements("brass"), ["Metal via alloy"]);
  assert.ok(ungated("brass").every((c) => c.viaClass?.stuffClass === "metal"));
});

test("snap: the easy-undertaking sense of 'breeze' no longer fires; the gingersnap route to cake stands (a coherent minor-sense path, retained by design)", () => {
  assert.deepEqual(elements("snap"), ["Earth via cake"]);
});

test("stock: blood's lineage synset no longer supplies a Fire rival — and since Slice A the broth baseline has a legitimate Metal rival (the livestock sense at the mammal class stop)", () => {
  // The pinning repair's claim stands: no Fire candidate via blood.
  assert.ok(!elements("stock").some((e) => e.startsWith("Fire")), elements("stock").join(", "));
  // Slice A (2026-11-18) changed the second clause of this test's
  // original name ("the broth baseline stands unopposed"): stock's
  // livestock sense now climbs to the mammal creature-class stop
  // and supplies a Metal candidate beside the broth Water. That is
  // the slice working as designed, recorded here rather than
  // excluded away — the same change that moved sense set B's stock
  // item (docs/fork/slice-a-report.md).
  assert.deepEqual(elements("stock").sort(), ["Metal via mammal", "Water via broth"]);
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
    else if (p.mode !== "climb-anchor" && p.pinned.length === 0) {
      // The collided state (named 2026-11-19, the vocabulary
      // pass): a cue anchor whose every selected synset was
      // pinned first by a named rival — 'anxious', whose one
      // adjective synset in the extract ({anxious, nervous,
      // queasy, uneasy, unquiet}) is nervous's pin, and
      // 'apprehension', whose fear synset is dread's. The
      // anchor is not unpinned (its synsets scored; it does
      // not keep the string match) and not pinned (the pins
      // are the rivals'). It is admitted only when the
      // shortfall is FULLY explained by the collisions the
      // report names — the residue stays a list, now with
      // this third shape on it.
      const selected = p.synsets.filter((s) => s.score >= 1).map((s) => s.id);
      assert.ok(selected.length >= 1, `${p.concept}: mode ${p.mode} but no pins and no cue selection to explain it`);
      for (const id of selected) {
        assert.ok(
          p.collisions.some((c) => c.startsWith(id)),
          `${p.concept}: selected synset ${id} neither pinned nor named in collisions`,
        );
      }
    }
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
