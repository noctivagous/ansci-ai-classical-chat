/**
 * Lesk ranking tests (2026-11-19): the scorer ranks senses by
 * gloss overlap and never decides alone; in sense.ts it speaks
 * only where coherence support ties at the top, and only with
 * real overlap evidence — the frequency prior alone may not
 * break a tie (the brake), while genuine gloss evidence may
 * (the stock case, sense set B's former failure).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/ansci/parse";
import { applySenseSelection } from "../src/ansci/sense";
import { enableWordnetLexicon } from "../src/ansci/wordnet-lex";
import { contentWords, leskSenseScores, wordOverlap } from "../src/ansci/lesk";

enableWordnetLexicon(true);

test("wordOverlap counts shared content words and names them", () => {
  const o = wordOverlap(
    "a financial institution that accepts deposits",
    "she deposited her money in the bank",
  );
  assert.ok(o.words.includes("deposit"));
  assert.equal(o.count, o.words.length);
});

test("contentWords drops stopwords and the gloss-generic words", () => {
  const words = contentWords("Get something or somebody for a specific purpose");
  assert.deepEqual(words, ["get", "purpose"]);
  for (const stopped of ["something", "somebody", "specific"]) {
    assert.ok(!words.includes(stopped), `${stopped} must be stopped out`);
  }
});

test("the stemmer does not destroy nouns that end in -ing", () => {
  assert.ok(contentWords("spring").includes("spring"));
  assert.ok(contentWords("playing").includes("play"));
});

test("lesk ranks the context-determined sense first: bank as financial institution", () => {
  const scores = leskSenseScores("bank", "She deposited her money in the bank.".split(/\s+/), ["deposit", "money"]);
  const top = [...scores].sort((a, b) => b.total - a.total)[0];
  assert.equal(top.synsetId, "wn-n08574001");
  assert.ok(top.words.includes("deposit"));
});

test("lesk ranks the context-determined sense first: bank as river bank", () => {
  const scores = leskSenseScores(
    "bank",
    "He sat on the bank of the river and watched the water.".split(/\s+/),
    ["sit", "river", "watch", "water"],
  );
  const top = [...scores].sort((a, b) => b.total - a.total)[0];
  assert.equal(top.synsetId, "wn-n09378458");
});

test("the target word itself earns no candidate any points", () => {
  // With a context of ONLY the target word, every score must be
  // the prior alone: the word's presence in its own sentence is
  // not evidence for any of its senses.
  const scores = leskSenseScores("bank", ["bank"], []);
  for (const s of scores) {
    assert.equal(s.sentenceScore, 0);
    assert.equal(s.contextScore, 0);
    assert.equal(s.total, s.prior);
  }
});

test("tie-break integration: gloss evidence separates a coherence tie (stock)", () => {
  const p = parse("The stock simmered in the pot.", "en");
  const node = p.meaning.nodes.find((n) => n.lemma === "stock")!;
  // Coherence ties 0-0 (Metal baseline vs Water); Lesk's overlap
  // with simmer/pot is the only evidence in the sentence, and it
  // backs the soup reading.
  assert.equal(node.semanticElement, "Water");
  const d = applySenseSelection(p).find((x) => x.lemma === "stock")!;
  assert.equal(d.leskTieBreak, true);
  assert.equal(d.chosen, "Water");
});

test("the brake holds: no evidence, no overturn, prior notwithstanding (rest)", () => {
  const p = parse("She found rest.", "en");
  const node = p.meaning.nodes.find((n) => n.lemma === "rest")!;
  assert.equal(node.semanticElement, "Water"); // baseline stands
  const d = applySenseSelection(p).find((x) => x.lemma === "rest")!;
  assert.notEqual(d.leskTieBreak, true);
  assert.equal(d.chosen, "Water");
});

test("tie-break is idempotent: re-applying the pass reproduces the decisions", () => {
  const p = parse("The stock simmered in the pot.", "en");
  const first = applySenseSelection(p);
  const second = applySenseSelection(p);
  assert.deepEqual(second, first);
});
