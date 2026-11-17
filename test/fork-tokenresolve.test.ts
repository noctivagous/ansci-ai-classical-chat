/**
 * fork-tokenresolve.test.ts — the Token resolution gate.
 *
 * Token resolution (token-resolve.ts, over the ported SymSpell in
 * symspell.ts) is what stands between a misspelled, shortened or
 * joined word and the parse-failure decline: an unknown token is
 * resolved through the Variant Graph, the matcher, or segmentation,
 * and every outcome — including failure — is recorded with its
 * confidence. This gate pins the behaviour the design settled:
 * the mechanism is word-blind (these examples are tests, not code),
 * an ambiguous form is NOT guessed, and a resolved sentence is
 * indistinguishable downstream from its canonical spelling.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SymSpell, damerauLevenshtein } from "../src/fork/symspell";
import { resolveTokenList, tokenResolverAvailable } from "../src/fork/token-resolve";
import { newSession } from "../src/fork/session";
import { processTurn } from "../src/fork/turn";

/* ---------- the ported matcher, on a small inline dictionary ---------- */

function smallDict(): SymSpell {
  const s = new SymSpell(2, 7);
  const words: [string, number][] = [
    ["hello", 30_000_000], ["hell", 5_000_000], ["help", 8_000_000],
    ["hot", 150_000_000], ["the", 20_000_000_000], ["about", 900_000_000],
    ["it", 5_000_000_000], ["soup", 10_000_000],
  ];
  for (const [w, c] of words) s.addWord(w, c);
  return s;
}

test("port: transposition costs 1, a swapped pair costs 2", () => {
  assert.equal(damerauLevenshtein("hto", "hot"), 1);
  assert.equal(damerauLevenshtein("hlleo", "hello"), 2);
  assert.equal(damerauLevenshtein("about", "about"), 0);
});

test("port: lookup ranks by distance, then frequency", () => {
  const top = smallDict().lookup("hllo")[0];
  assert.equal(top.term, "hello");
  assert.equal(top.distance, 1);
});

test("port: segmentation splits a joined form into exact words", () => {
  const seg = smallDict().wordSegmentation("aboutit");
  assert.equal(seg.segmented, "about it");
  assert.equal(seg.corrected, "about it");
});

/* ---------- the resolver, over the real data files ---------- */

const KNOWN = new Set([
  "the", "soup", "is", "hot", "hello", "you", "are", "about", "it",
  "winter", "cold", "do", "spelling", "world",
]);
const recognize = (w: string) => (KNOWN.has(w) ? ("known" as const) : undefined);
const resolve1 = (t: string) => resolveTokenList([t], recognize);

test("resolver: the data files load in this environment", () => {
  assert.equal(tokenResolverAvailable(), true);
});

test("resolver: a misspelling corrects through the matcher, scored", () => {
  const r = resolve1("hllo");
  assert.deepEqual(r.tokens, ["hello"]);
  assert.equal(r.resolutions[0].outcome, "corrected");
  assert.equal(r.resolutions[0].confidence, 0.85);
});

test("resolver: shortforms resolve through the variant graph", () => {
  assert.deepEqual(resolve1("u").tokens, ["you"]);
  assert.deepEqual(resolve1("r").tokens, ["are"]);
  assert.equal(resolve1("u").resolutions[0].rule, "variant-graph:shortform");
});

test("resolver: an apostrophe-less contraction expands to the tokenised form", () => {
  const r = resolve1("dont");
  assert.deepEqual(r.tokens, ["do", "n't"]);
  assert.equal(r.resolutions[0].outcome, "variant");
});

test("resolver: a joined form segments; a misspelling does not", () => {
  const joined = resolve1("aboutit");
  assert.deepEqual(joined.tokens, ["about", "it"]);
  assert.equal(joined.resolutions[0].outcome, "segmented");
  const misspelled = resolve1("speling");
  assert.deepEqual(misspelled.tokens, ["spelling"]);
  assert.equal(misspelled.resolutions[0].outcome, "corrected");
});

test("resolver: an ambiguous shortform is not guessed", () => {
  const r = resolve1("ur");
  assert.deepEqual(r.tokens, ["ur"]);
  const rec = r.resolutions[0];
  assert.equal(rec.outcome, "unresolved");
  assert.equal(rec.rule, "variant-graph:ambiguous");
  const terms = (rec.candidates ?? []).map((c) => c.term);
  assert.ok(terms.includes("your") && terms.includes("you're"));
});

test("resolver: an unknown word stays, with candidates and a low score", () => {
  const r = resolve1("blorp");
  assert.deepEqual(r.tokens, ["blorp"]);
  const rec = r.resolutions[0];
  assert.equal(rec.outcome, "unresolved");
  assert.ok((rec.candidates ?? []).length > 0);
  assert.ok(rec.confidence <= 0.3);
});

/* ---------- the turn loop: resolution is invisible downstream ---------- */

test("turn: a misspelled sentence answers exactly as its canonical spelling", () => {
  const a = processTurn(newSession(), "The soup is hto.");
  const b = processTurn(newSession(), "The soup is hot.");
  assert.equal(a.reply, b.reply);
  assert.equal(a.trace.parseSummary, b.trace.parseSummary);
  const rec = a.trace.tokenResolutions.find((r) => r.surface === "hto");
  assert.ok(rec && rec.outcome === "corrected" && rec.replacement[0] === "hot");
  // The context-free matcher first picks "to" (frequency); the
  // parse-arbitrated retry is what lands on "hot", and the record
  // says so.
  assert.equal(rec.rule, "matcher:symspell+parse-retry");
});

test("turn: 'how r u' reaches the same outcome as 'how are you'", () => {
  const a = processTurn(newSession(), "how r u");
  const b = processTurn(newSession(), "how are you");
  assert.equal(a.reply, b.reply);
  const rules = a.trace.tokenResolutions.map((r) => `${r.surface}:${r.outcome}`);
  assert.ok(rules.includes("r:variant") && rules.includes("u:variant"));
});

test("turn: a parse failure still locates its unresolved tokens", () => {
  const r = processTurn(newSession(), "Xqzw jkvf wqzx.");
  assert.equal(r.trace.parseSummary, "parse failed");
  assert.equal(r.trace.tokenResolutions.length, 3);
  assert.ok(r.trace.tokenResolutions.every((t) => t.outcome === "unresolved"));
});

test("turn: composed guesses are recorded, and erosion refuses the weakest", () => {
  // Each word of "Blorp zizzle frak." is genuinely close to a real
  // word, so the token layer resolves what it can — but the records
  // show the sentence was substantially guessed, and the erosion
  // rule refuses the weakest correction (zizzle, discounted below
  // the floor by the guess before it). Whether a sentence built
  // from guesses should be TRUSTED is a sentence-level judgement
  // this layer deliberately does not make; it belongs to the
  // coherence work, which will read exactly these records.
  const r = processTurn(newSession(), "Blorp zizzle frak.");
  const bySurface = new Map(r.trace.tokenResolutions.map((t) => [t.surface, t]));
  assert.equal(bySurface.get("Blorp")?.outcome, "corrected");
  const zizzle = bySurface.get("zizzle");
  assert.ok(zizzle && zizzle.outcome === "unresolved" && zizzle.rule === "matcher:below-threshold");
  assert.equal(bySurface.get("frak")?.outcome, "corrected");
});
