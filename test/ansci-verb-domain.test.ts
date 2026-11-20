/**
 * ansci-verb-domain.test.ts — VERB_DOMAIN_V1 verb classification and
 * the domain prior it makes runnable (registry entry H8; the trial
 * account is docs/ansci/verb-classification-trial.md). Skips cleanly
 * when the WordNet extract or the FrameNet bundle is not installed
 * (both are optional layers).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { enableWordnetLexicon, wordnetAvailable } from "../src/ansci/wordnet-lex";
import {
  frameNetAvailable, predictSignatureShape, setHeldOutLemmas,
  signatureInventory, verbClassification,
} from "../src/ansci/framenet-lex";

const HAS_WN = wordnetAvailable();
const HAS_FN = frameNetAvailable();
enableWordnetLexicon(true);

test("verb classification: the recorded held-out verbs classify under VERB_DOMAIN_V1", { skip: !HAS_WN }, () => {
  const teach = verbClassification("teach");
  assert.ok(teach);
  assert.equal(teach.element, "Fire");
  assert.equal(teach.provenance, "verb-domain-derived");
  assert.equal(teach.rule, "VERB_DOMAIN_V1");
  assert.ok(teach.hits.includes("knowledge"), JSON.stringify(teach.hits));
  assert.equal(verbClassification("fill")?.element, "Earth");
  assert.equal(verbClassification("sing")?.element, "Earth");
  assert.equal(verbClassification("paint")?.element, "Earth");
});

test("verb classification: confidence is priced by the rule and capped at the creative ceiling", { skip: !HAS_WN }, () => {
  for (const lemma of ["teach", "fill", "sing", "paint", "bake", "carry", "wash"]) {
    const vc = verbClassification(lemma);
    assert.ok(vc, lemma);
    assert.ok(vc.score >= 2 && vc.margin >= 1, `${lemma}: ${vc.score}/${vc.margin}`);
    assert.equal(vc.confidence, Math.min(0.75, 0.5 + 0.05 * (vc.score + vc.margin)), lemma);
    assert.ok(vc.confidence <= 0.75, lemma);
  }
});

test("verb classification: abstains where the glosses carry no dominant domain", { skip: !HAS_WN }, () => {
  // show's synset glosses are evidential/display vocabulary with no
  // phase-domain majority; happiness has no verb synsets at all.
  assert.equal(verbClassification("show"), undefined);
  assert.equal(verbClassification("happiness"), undefined);
});

test("verb classification: deterministic, and abstains while the provider is off", { skip: !HAS_WN }, () => {
  assert.deepEqual(verbClassification("teach"), verbClassification("teach"));
  enableWordnetLexicon(false);
  try {
    assert.equal(verbClassification("teach"), undefined);
  } finally {
    enableWordnetLexicon(true);
  }
  assert.equal(verbClassification("teach")?.element, "Fire");
});

test("prior: a held-out verb now predicts from its element group, not the global fallback", { skip: !(HAS_WN && HAS_FN) }, () => {
  setHeldOutLemmas(["teach", "fill", "sing", "paint"]);
  try {
    const inventory = signatureInventory();
    assert.ok(!inventory.some((s) => s.lemma === "teach"));
    const pred = predictSignatureShape("teach", inventory);
    assert.equal(pred.element, "Fire");
    assert.match(pred.basis, /classified Fire/);
    const fill = predictSignatureShape("fill", inventory);
    assert.equal(fill.element, "Earth");
    assert.deepEqual(fill.shape.slots, ["theme"]);
  } finally {
    setHeldOutLemmas([]);
  }
});
