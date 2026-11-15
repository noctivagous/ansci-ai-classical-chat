/**
 * fork-framenet.test.ts — the FrameNet valency provider and the
 * three-state assessment (Part C.4). Skips cleanly when the FrameNet
 * bundle is not installed (it is an optional, gitignored layer).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/fork/parse";
import { assessValency } from "../src/fork/check";
import { enableWordnetLexicon } from "../src/fork/wordnet-lex";
import {
  frameNetAvailable, frameSignature, predictSignatureShape,
  setFrameNetEnabled, setHeldOutLemmas, signatureInventory,
} from "../src/fork/framenet-lex";

const HAS_FN = frameNetAvailable();
enableWordnetLexicon(true);

test("signature: send is Sending with recipient/theme slots and a goal prep slot", { skip: !HAS_FN }, () => {
  const sig = frameSignature("send");
  assert.ok(sig);
  assert.equal(sig.frame, "Sending");
  assert.equal(sig.agent, true);
  assert.deepEqual(sig.slots, ["recipient", "theme"]);
  assert.deepEqual(sig.required, ["theme"]);
  assert.equal(sig.prepSlot?.slot, "goal");
  assert.ok(sig.candidates.length >= 2); // Causation is also an LU frame for send
});

test("assessment: a frame-licensed sentence is fully supported", { skip: !HAS_FN }, () => {
  const a = assessValency(parse("She sent him a letter.", "en"));
  assert.ok(a.length >= 3);
  assert.ok(a.every((x) => x.state === "supported"), JSON.stringify(a));
  assert.ok(a.every((x) => x.basis === "framenet"));
});

test("assessment: an excess argument under frame evidence is unsupported", { skip: !HAS_FN }, () => {
  const a = assessValency(parse("She sent him a letter a parcel.", "en"));
  assert.ok(a.some((x) => x.state === "unsupported"), JSON.stringify(a));
});

test("assessment: with the provider off, derived arguments are unusual-but-licensed, never supported", { skip: !HAS_FN }, () => {
  setFrameNetEnabled(false);
  enableWordnetLexicon(false);
  enableWordnetLexicon(true); // purge derived entries so bake re-derives without a signature
  try {
    const a = assessValency(parse("She baked a cake.", "en"));
    assert.ok(a.length >= 2);
    assert.ok(a.every((x) => x.state === "unusual-but-licensed" && x.basis === "evidence-free"), JSON.stringify(a));
  } finally {
    setFrameNetEnabled(true);
    enableWordnetLexicon(false);
    enableWordnetLexicon(true);
  }
});

test("prior: the shape predictor is deterministic and agentive for a held-out verb", { skip: !HAS_FN }, () => {
  setHeldOutLemmas(["teach"]);
  try {
    const inventory = signatureInventory();
    assert.ok(!inventory.some((s) => s.lemma === "teach"));
    const p1 = predictSignatureShape("teach", inventory);
    const p2 = predictSignatureShape("teach", inventory);
    assert.deepEqual(p1.shape, p2.shape);
    assert.equal(p1.shape.agent, true);
  } finally {
    setHeldOutLemmas([]);
  }
});
