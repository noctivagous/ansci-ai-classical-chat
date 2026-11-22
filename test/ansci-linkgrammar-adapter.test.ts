/**
 * ansci-linkgrammar-adapter.test.ts — the narrow WASM syntax
 * adapter (src/ansci/linkgrammar-adapter.ts).
 *
 * Pins the adapter's contract: Link Grammar words align to the
 * caller's tokens, clear S links propose agent candidates, clear
 * O links propose patient candidates with connector labels and
 * linkage provenance preserved, recovered (null-count) parses
 * contribute links but no role candidates, and passive
 * S-subjects are never proposed as agents.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adaptLinkGrammarSyntax,
  alignWordsToTokens,
  normalizeLinkageWord,
} from "../src/ansci/linkgrammar-adapter";

test("adapter: word normalization strips subscripts, marks and brackets", () => {
  assert.equal(normalizeLinkageWord("gave.v-d"), "gave");
  assert.equal(normalizeLinkageWord("[though]"), "though");
  assert.equal(normalizeLinkageWord("York[!]"), "york");
  assert.equal(normalizeLinkageWord("life-long[!].a"), "life-long");
  assert.equal(normalizeLinkageWord("LEFT-WALL"), "left-wall");
});

test("adapter: alignment skips walls and punctuation, joins splits", () => {
  assert.deepEqual(
    alignWordsToTokens(
      ["LEFT-WALL", "she", "gave.v-d", "him", ".", "RIGHT-WALL"],
      ["She", "gave", "him", "a", "book"],
    ),
    [-1, 0, 1, 2, -1, -1],
  );
  // AnSci-side contraction split against one linkage word.
  assert.deepEqual(
    alignWordsToTokens(
      ["LEFT-WALL", "don't", "go", "RIGHT-WALL"],
      ["do", "n't", "go"],
    ),
    [-1, 0, 2, -1],
  );
});

test("adapter: ditransitive proposes agent and labelled patients", async () => {
  const r = await adaptLinkGrammarSyntax("She gave him a book.", [
    "She",
    "gave",
    "him",
    "a",
    "book",
  ]);
  assert.equal(r.status, "complete");
  assert.equal(r.nullCount, 0);
  assert.ok(r.linkages >= 1);
  const agents = r.candidates.filter((c) => c.kind === "agent");
  assert.equal(agents.length, 1);
  assert.equal(agents[0].verbToken, 1);
  assert.equal(agents[0].argToken, 0);
  assert.equal(agents[0].connector, "Ss");
  const patients = r.candidates.filter((c) => c.kind === "patient");
  assert.equal(patients.length, 2);
  const byToken = new Map(patients.map((p) => [p.argToken, p.connector]));
  assert.equal(byToken.get(2), "Ox");
  assert.equal(byToken.get(4), "Osn");
  assert.ok(
    patients.every((p) => p.verbToken === 1 && p.family === "O"),
  );
});

test("adapter: second ditransitive keeps both object labels", async () => {
  const r = await adaptLinkGrammarSyntax("He showed the students a photo.", [
    "He",
    "showed",
    "the",
    "students",
    "a",
    "photo",
  ]);
  assert.equal(r.status, "complete");
  const agents = r.candidates.filter((c) => c.kind === "agent");
  assert.equal(agents.length, 1);
  assert.deepEqual([agents[0].verbToken, agents[0].argToken], [1, 0]);
  const labels = r.candidates
    .filter((c) => c.kind === "patient")
    .map((c) => c.connector)
    .sort();
  assert.deepEqual(labels, ["Op", "Osn"]);
});

test("adapter: passive proposes no agent candidate", async () => {
  const r = await adaptLinkGrammarSyntax("Was the man bitten by the dog?", [
    "Was",
    "the",
    "man",
    "bitten",
    "by",
    "the",
    "dog",
  ]);
  assert.equal(r.status, "complete");
  assert.ok(r.links.length > 0, "the linkage itself is still evidence");
  assert.deepEqual(
    r.candidates.filter((c) => c.kind === "agent"),
    [],
    "a passive S-subject is not an agent",
  );
});

test("adapter: MVp without by does not suppress the agent", async () => {
  // "prepares people for ..." attaches the for-phrase with MVp but
  // is active voice: Goodwill is the agent (MASC A0 ground truth).
  const r = await adaptLinkGrammarSyntax(
    "Goodwill prepares people for life-long employment.",
    ["Goodwill", "prepares", "people", "for", "life-long", "employment"],
  );
  assert.equal(r.status, "complete");
  const agents = r.candidates.filter((c) => c.kind === "agent");
  assert.equal(agents.length, 1);
  assert.deepEqual([agents[0].verbToken, agents[0].argToken], [1, 0]);
  assert.equal(agents[0].connector, "Ss");
});

test("adapter: recovered parse contributes links, not roles", async () => {
  const r = await adaptLinkGrammarSyntax("i got her number though.", [
    "i",
    "got",
    "her",
    "number",
    "though",
  ]);
  assert.equal(r.status, "recovered");
  assert.equal(r.nullCount, 2);
  assert.ok(r.links.length > 0, "island links are recorded as evidence");
  assert.deepEqual(r.candidates, [], "no roles from a recovered parse");
  const ep = r.links
    .filter((l) => l.left >= 0 && l.right >= 0)
    .map((l) => `${l.left}>${l.right}`)
    .sort();
  assert.ok(ep.includes("1>3"), "got>number survives alignment");
});
