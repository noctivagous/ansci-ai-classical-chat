/**
 * Stage 4 sense-selection tests: coherence may overturn the isolated
 * climb only inside the confidence band, restraint corroborates
 * rather than contradicts, and the pass is idempotent.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/fork/parse";
import { applySenseSelection } from "../src/fork/sense";
import { enableWordnetLexicon, climbClassification } from "../src/fork/wordnet-lex";

enableWordnetLexicon(true);

test("coherence overturns the isolated climb when context supports a live rival", () => {
  const p = parse("His passion became rage.", "en");
  const node = p.meaning.nodes.find((n) => n.lemma === "passion")!;
  assert.equal(climbClassification("passion")?.element, "Fire"); // the isolated choice
  assert.equal(node.semanticElement, "Wood"); // rage (Wood) context re-chose
});

test("restraint asymmetry: a controlling context corroborates, it never subtracts", () => {
  const p = parse("Her concern grew in the garden.", "en");
  const decisions = applySenseSelection(p);
  const d = decisions.find((x) => x.lemma === "concern")!;
  // Earth (the context) CONTROLS Water (the baseline): under a
  // contradiction reading that would count against Water; here it
  // counts FOR it (0.4) — and the same-element Earth support (1.0)
  // is what actually carries the overturn.
  assert.equal(d.support.Water, 0.4);
  assert.equal(d.support.Earth, 1.0);
  assert.equal(d.chosen, "Earth");
});

test("the brake: no context, no overturn", () => {
  const p = parse("She found rest.", "en");
  const node = p.meaning.nodes.find((n) => n.lemma === "rest")!;
  assert.equal(node.semanticElement, "Water"); // baseline (sleep) holds
});

test("supported baseline: context backing the baseline changes nothing", () => {
  const p = parse("The blow of snow buried the valley.", "en");
  const node = p.meaning.nodes.find((n) => n.lemma === "blow")!;
  assert.equal(node.semanticElement, "Water");
});

test("idempotent: re-applying the pass reproduces the same decisions", () => {
  const p = parse("An outpouring of grief filled the room.", "en");
  const first = applySenseSelection(p);
  const second = applySenseSelection(p);
  assert.deepEqual(second, first);
  assert.equal(first.find((d) => d.lemma === "outpouring")?.chosen, "Water");
});
