/**
 * ansci-lexicon-state.test.ts — the lexicon-state family
 * (GAPS §5 + the S2 report's probe-poisoning), closed
 * 2026-11-18.
 *
 * The family's root: the WordNet provider registered every
 * entry it derived, including entries derived by a mere
 * probe, and parse classification read the registry — so a
 * word's classification depended on what the process had
 * parsed before. The fix has two halves, both exercised
 * here through the public parse/generate surface:
 * registration is adoption (probes leave the lexicon
 * untouched), and classification never takes a derived
 * entry from the registry.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/ansci/parse";
import { generate } from "../src/ansci/generate";

test("probe-poisoning: the same sentence parses the same way twice in one process", () => {
  const first = generate(parse("You are welcome.", "en"));
  const second = generate(parse("You are welcome.", "en"));
  assert.equal(first, "You are welcome.");
  assert.equal(second, first, "a probe during the first parse must not change the second parse");
});

test("probe-poisoning: an innocent earlier sentence does not poison a later one", () => {
  parse("Hello.", "en");
  parse("Thanks.", "en");
  parse("I was furious.", "en");
  assert.equal(generate(parse("You are welcome.", "en")), "You are welcome.");
});

test("imperative: the construction survives a round trip (no longer single-use)", () => {
  const constructionOf = (text: string) =>
    parse(text, "en").meaning.nodes.map((n) => n.states?.construction).filter(Boolean);
  const first = parse("Tell me about winter.", "en");
  assert.deepEqual(constructionOf("Tell me about winter."), ["imperative"]);
  const surface = generate(first);
  assert.deepEqual(constructionOf(surface), ["imperative"], "the reparse reads the same construction");
});

test("existential: a generated existential reparses in the lexicon state the parse produced", () => {
  const first = parse("There is snow in winter.", "en");
  const surface = generate(first);
  assert.equal(surface, "There is snow in winter.");
  assert.doesNotThrow(() => parse(surface, "en"));
});

test("bei: an unattested verb fails as a parse error, not a crash", () => {
  assert.throws(
    () => parse("猫被狗咬了", "zh"),
    (err: unknown) => err instanceof Error && !(err instanceof TypeError) && /bei passive/.test(err.message),
    "the failure mode is a located parse error",
  );
});

test("stability: dual-category sentences regenerate identically on first and second parse", () => {
  const sentences = ["You are welcome.", "The wind blows.", "Snow falls.", "They welcome the news.", "A blow fell."];
  for (const s of sentences) {
    const a = generate(parse(s, "en"));
    const b = generate(parse(s, "en"));
    assert.equal(b, a, `${s}: second parse diverged from the first`);
  }
});
