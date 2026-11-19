/**
 * fork-adverbs.test.ts — GAPS §6 adverb restoration (2026-11-18).
 *
 * The WordNet extract was trimmed to n/v/a; adverb tokens had no
 * synset in the shipped data. The extract now carries the adverb
 * block again (rebuilt by scripts/import-wordnet.py from the same
 * OEWN 2024 source, same construction), the provider derives
 * adverb entries, and both the classifier and the token
 * recogniser consult them.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/fork/parse";
import { wordnetAdverb } from "../src/fork/wordnet-lex";

test("adverbs: 'usually' and 'indoors' resolve to adverb synsets in the shipped extract", () => {
  assert.equal(wordnetAdverb("usually")?.kind, "adverb");
  assert.equal(wordnetAdverb("usually")?.lemma, "usually");
  assert.equal(wordnetAdverb("indoors")?.lemma, "indoors");
  assert.equal(wordnetAdverb("about")?.lemma, "about");
});

test("adverbs: a derived adverb modulates the verb ('He usually sleeps.')", () => {
  const p = parse("He usually sleeps.", "en");
  const adv = p.meaning.nodes.find((n) => n.lemma === "usually");
  assert.ok(adv, "usually survives as a node");
  assert.ok(p.meaning.edges.some((e) => e.from === adv!.id && e.relation === "modulates"));
});

test("adverbs: 'indoors' resolves as the adverb, not the adjective 'indoor' by -s stripping", () => {
  const p = parse("She waited indoors.", "en");
  assert.ok(p.meaning.nodes.some((n) => n.lemma === "indoors"), "the adverb itself is the node");
  assert.ok(!p.meaning.nodes.some((n) => n.lemma === "indoor"), "no stripped adjective reading remains");
});

test("adverbs: 'about' carries a reading now — 'Tell her about winter.' parses whole", () => {
  // The lexicon-state report traced this sentence's fall-through
  // to 'about' carrying no classification of its own (the
  // adverb/preposition hole). The token now derives as an adverb;
  // the sentence parses with her as recipient and winter as theme.
  const p = parse("Tell her about winter.", "en");
  const roles = new Map(p.meaning.edges.map((e) => {
    const t = p.meaning.nodes.find((n) => n.id === e.to);
    return [e.relation, t?.lemma];
  }));
  assert.equal(roles.get("recipient"), "her");
  assert.equal(roles.get("theme"), "winter");
});

test("adverbs: an inflected adjective surface still resolves ('It is colder today.')", () => {
  const p = parse("It is colder today.", "en");
  assert.ok(p.meaning.nodes.some((n) => n.lemma === "cold"), "colder still reaches the adjective cold");
});
