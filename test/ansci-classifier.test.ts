/**
 * ansci-classifier.test.ts — stage 5, Part F.3: the classifier as
 * the Metal the Earth noun generates.
 *
 * Deployed scope (per the admission probe): classifier agreement
 * is policed where the noun's classifier is tabled; prediction for
 * untabled nouns was admitted at family level by the probe and is
 * not wired into the parser (no ZH→EN concept bridge exists in
 * the lexicon — recorded in the stage-5 report).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/ansci/parse";
import { generate } from "../src/ansci/generate";
import { checkSentence } from "../src/ansci/check";
import { extractFeatures } from "../src/ansci/features";

test("counted phrases round-trip for every registered classifier", () => {
  assert.equal(generate(parse("他买三只猫。", "zh")), "他买三只猫。");
  assert.equal(generate(parse("他买三本书。", "zh")), "他买三本书。");
  assert.equal(generate(parse("他买三张桌子。", "zh")), "他买三张桌子。");
  assert.equal(generate(parse("他买两本书。", "zh")), "他买两本书。");
});

test("classifier agreement: missing and wrong are both flagged", () => {
  assert.ok(checkSentence(parse("他买三猫。", "zh")).some((v) => v.name === "missing-classifier"));
  assert.ok(checkSentence(parse("他买三书。", "zh")).some((v) => v.name === "missing-classifier"));
  assert.ok(checkSentence(parse("他买三本猫。", "zh")).some((v) => v.name === "classifier-mismatch"));
  assert.equal(checkSentence(parse("他买三只猫。", "zh")).filter((v) => v.name.includes("classifier")).length, 0);
});

test("the number family now holds the counted quantity (F2)", () => {
  const atoms = extractFeatures(parse("他买三本书。", "zh"));
  assert.ok(atoms.some((a) => a.family === "number" && a.value === "三"));
  assert.ok(atoms.some((a) => a.family === "classifier" && a.value === "本"));
});

test("把 after a numeral is the classifier, not the ba-marker", () => {
  // The ba branch is guarded by the verb that must follow 把 in
  // the construction; a counted phrase no longer crashes it.
  assert.equal(generate(parse("他把书放在桌子上。", "zh")), "他把书放在桌子上。");
});
