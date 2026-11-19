/**
 * fork-mechanisms.test.ts — the eight adjudicated parser
 * mechanisms (GAPS §5, sealed-run adjudication 2026-11-18).
 * One section per mechanism, added slice by slice in the
 * adjudication's order. Each test pins the adjudicated items'
 * expected atoms (scripts/sealed-holdout80.json) at parse level.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/fork/parse";
import { generate } from "../src/fork/generate";
import { extractFeatures } from "../src/fork/features";

function atoms(text: string) {
  const p = parse(text, "en");
  const map = new Map<string, string>();
  for (const a of extractFeatures(p)) map.set(`${a.family} ${a.key}`, a.value);
  return { p, map };
}

/* --- Mechanism 1: a verb-only hand entry ('rain') captures the
 *     verb slot; no recovery when the subject chunk fails on it.
 *     H-004: "The rain flooded the garden." --- */
test("mech1: the subject noun with a verb-only hand entry does not capture the verb slot", () => {
  const { p, map } = atoms("The rain flooded the garden.");
  assert.equal(map.get("predicate flood#0"), "flood", "the root predicate is flood, not rain");
  assert.equal(map.get("roles flood#0|agent"), "rain");
  assert.equal(map.get("roles flood#0|theme"), "garden");
  assert.equal(map.get("tense flood#0|tense"), "past");
  assert.equal(map.get("aspect flood#0|aspect:bounded"), "true");
  assert.equal(map.get("number flood#0|subjectPerson"), "3sg");
  assert.equal(generate(p), "The rain flooded the garden.");
});

test("mech1: a following intransitive still roots on its own verb", () => {
  const { map } = atoms("The rain fell.");
  assert.equal(map.get("predicate fall#0"), "fall");
  assert.equal(map.get("roles fall#0|agent"), "rain");
});

/* --- Mechanism 2: the WordNet verb-fallback scan starts one
 *     token early when the subject chunk fails on a wh-word and
 *     upgrades the subject noun ahead of the real verb.
 *     H-070: "What do people take to the beach?" --- */
test("mech2: the fallback scan does not upgrade the subject noun of a wh-question", () => {
  const { map } = atoms("What do people take to the beach?");
  assert.equal(map.get("predicate take#0"), "take", "the root predicate is take, not people");
  assert.equal(map.get("roles take#0|agent"), "people");
  assert.equal(map.get("roles take#0|theme"), "what");
  assert.equal(map.get("roles take#0|goal"), "beach@to");
  assert.equal(map.get("negation take#0|aux"), "do");
});

test("mech2: a subject question with no auxiliary keeps its verb ('Which happened first?')", () => {
  const { map } = atoms("Which happened first?");
  assert.equal(map.get("predicate happen#0"), "happen");
  assert.equal(map.get("roles happen#0|agent"), "which");
});

/* --- Mechanism 3: noun–noun compounds are not absorbed, so
 *     "ginger tea" chunks as "ginger" and the copular branch
 *     roots on "tea", never consuming the complement.
 *     H-047: "Is ginger tea a warming food?" --- */
test("mech3: a noun–noun compound chunks as one NP headed by the last noun", () => {
  const { p, map } = atoms("Is ginger tea a warming food?");
  assert.equal(map.get("predicate food#0"), "food", "the complement is the root, not 'tea'");
  assert.equal(map.get("connective tea|predicated-as|food"), "present");
  assert.equal(map.get("attachment tea|qualifies"), "ginger", "ginger qualifies tea inside the compound");
  // (Round-trip word order of an inverted copular question is
  // the generator's existing behaviour, not this mechanism.)
  assert.ok(generate(p).toLowerCase().includes("ginger tea"), "the compound survives generation as one NP");
});

test("mech3: a numeral never joins a compound — it stands as its own node ('I have 5 apples.')", () => {
  const { p } = atoms("I have 5 apples.");
  const lemmas = p.meaning.nodes.map((n) => n.lemma);
  assert.ok(lemmas.includes("5") && lemmas.includes("apple"), "numeral and noun stay separate nodes for the quantity ledger");
});

/* --- Mechanism 4: the wh-branch attempts its subject chunk at
 *     the be-carrier token, fails, assigns the wh-word the agent
 *     slot and drops the pronoun. H-007/H-008/H-012. --- */
test("mech4: the subject after the be-carrier is recovered as agent ('What is he bringing?')", () => {
  const { map } = atoms("What is he bringing?");
  assert.equal(map.get("roles bring#0|agent"), "he");
  assert.equal(map.get("roles bring#0|theme"), "what");
  assert.equal(map.get("number bring#0|subjectPerson"), "3sg");
  assert.equal(map.get("entity he#0"), "none");
});

test("mech4: 'Who is he bringing?' keeps he as agent and who as theme", () => {
  const { map } = atoms("Who is he bringing?");
  assert.equal(map.get("roles bring#0|agent"), "he");
  assert.equal(map.get("roles bring#0|theme"), "who");
});

test("mech4: 'What are you making?' recovers you as agent with person 2", () => {
  const { map } = atoms("What are you making?");
  assert.equal(map.get("roles make#0|agent"), "you");
  assert.equal(map.get("roles make#0|patient"), "what");
  assert.equal(map.get("number make#0|subjectPerson"), "2");
});

/* --- Mechanism 5: the wh-branch builds its root states by hand
 *     and never calls the aspect bundle — progressive aspect is
 *     lost in wh-questions. Same items as mechanism 4. --- */
test("mech5: progressive aspect survives in wh-questions ('What is he bringing?')", () => {
  for (const [text, root] of [["What is he bringing?", "bring"], ["Who is he bringing?", "bring"], ["What are you making?", "make"]] as const) {
    const { map } = atoms(text);
    assert.equal(map.get(`aspect ${root}#0|aspect:ongoing`), "true", text);
  }
});

/* --- Mechanism 6: did-question tense is read off the verb's
 *     base form instead of the carrier. Design (F.2): the
 *     carrier takes the tense, the verb stays in base form.
 *     H-003/H-062 (why-questions ride the main path). --- */
test("mech6: a did-question reads past + bounded off the carrier ('Why did we move the picnic?')", () => {
  const { map } = atoms("Why did we move the picnic?");
  assert.equal(map.get("tense move#0|tense"), "past");
  assert.equal(map.get("aspect move#0|aspect:bounded"), "true");
  assert.equal(map.get("roles move#0|agent"), "we");
  assert.equal(map.get("roles move#0|theme"), "picnic");
});

test("mech6: 'Why did you say that?' is past + bounded (theme awaits mechanism 8)", () => {
  const { map } = atoms("Why did you say that?");
  assert.equal(map.get("tense say#0|tense"), "past");
  assert.equal(map.get("aspect say#0|aspect:bounded"), "true");
});

/* --- Mechanism 7: the classification seam. Table-owned lemmas
 *     are excluded from the WordNet climb (the X1 brake) AND
 *     the table was never applied at node-building, so every
 *     table-owned noun/adjective entering via WordNet landed
 *     unclassified. --- */
test("mech7: table-owned nouns entering via WordNet carry the table's element (H-004)", () => {
  const { map } = atoms("The rain flooded the garden.");
  assert.equal(map.get("entity rain#0"), "Water");
  assert.equal(map.get("entity garden#0"), "Earth");
});

test("mech7: table-owned compound parts and adjectives classify (H-047)", () => {
  const { map } = atoms("Is ginger tea a warming food?");
  assert.equal(map.get("entity tea#0"), "Water");
  assert.equal(map.get("entity ginger#0"), "Metal");
});

test("mech7: 'cold' reaches the node with the table's classification, whichever entry leads", () => {
  // Modifier position: the feature extractor emits no entity
  // atom for a predicate root, so the check rides a chunk.
  // The assertion is only that the value ARRIVES (the table's
  // own primary entry) — which element cold leads with is the
  // table's standing order, not this fix's ruling.
  const { map } = atoms("The cold rain flooded the garden.");
  assert.ok(map.get("entity cold#0") && map.get("entity cold#0") !== "none", "cold carries a classification");
});

/* --- Mechanism 8: 'that' is classified as a determiner before
 *     any lexicon lookup; a lone determiner cannot chunk, so a
 *     that-object is silently dropped. The parser already has
 *     the determiner/pronoun reclassification precedent (her).
 *     H-062. --- */
test("mech8: a lone 'that' object survives as the theme ('Why did you say that?')", () => {
  const { map } = atoms("Why did you say that?");
  assert.equal(map.get("roles say#0|theme"), "that");
  assert.equal(map.get("entity that#0"), "none");
});

test("mech8: demonstrative 'that' before a noun stays a determiner ('I read that book.')", () => {
  const { p, map } = atoms("I read that book.");
  assert.equal(map.get("roles read#0|patient"), "book");
  assert.ok(!p.meaning.nodes.some((n) => n.lemma === "that"), "no pronoun node for the demonstrative");
});

test("mech8: relative 'that' before a subject pronoun is untouched ('The book that he read was long.')", () => {
  const { p } = atoms("The book that he read was long.");
  assert.ok(p.meaning.nodes.some((n) => n.lemma === "book"));
});
