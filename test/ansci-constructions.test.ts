/**
 * Stage 3 construction tests (Part D): copular questions as operators
 * over the declarative relations, fragments as discourse acts,
 * imperatives, and the F3 crash pair. The frozen census + adversarial
 * set lives in scripts/construction-challenge.tsv; these tests pin
 * the mechanisms individually.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/ansci/parse.js";
import { generate } from "../src/ansci/generate.js";
import { enableWordnetLexicon } from "../src/ansci/wordnet-lex.js";

enableWordnetLexicon(true);

test("copular questions share the declarative relation and add a query record", () => {
  const q = parse("Who is Sarah?", "en");
  assert.equal(q.meaning.edges[0].relation, "predicated-as");
  assert.deepEqual(q.query, { relation: "predicated-as", expectedType: "person" });
  assert.equal(generate(q), "Who is Sarah?");
  const a = parse("Sarah is a doctor.", "en");
  assert.equal(a.query, undefined);
});

test("containment is not predication (D4)", () => {
  const p = parse("What's in it?", "en");
  assert.ok(p.meaning.edges.some((e) => e.relation === "contains"));
  assert.ok(!p.meaning.edges.some((e) => e.relation === "predicated-as"));
  assert.equal(generate(p), "What is in it?");
});

test("definition questions expect a kind; measurement questions a quantity", () => {
  assert.equal(parse("What is a cold?", "en").query?.expectedType, "kind");
  const pop = parse("What is the exact population of Chicago at this moment?", "en");
  assert.equal(pop.query?.expectedType, "quantity");
  assert.equal(generate(pop), "What is the exact population of Chicago at this moment?");
});

test("fragments: topic proposal, reason query, and the bare nominal are three different records", () => {
  const t = parse("What about coffee?", "en");
  assert.equal(t.discourseAct, "topic-proposal");
  assert.equal(generate(t), "What about coffee?");
  const r = parse("Why?", "en");
  assert.equal(r.discourseAct, "reason-query");
  assert.equal(generate(r), "Why?");
  const bare = parse("Coffee.", "en");
  assert.equal(bare.discourseAct, undefined); // function is discourse-recovered, unassigned
  assert.equal(bare.meaning.edges.length, 0); // no predicate invented
  assert.equal(generate(bare), "Coffee.");
});

test("questioned subjects carry no do-support and keep their tense", () => {
  assert.equal(generate(parse("Who arrived?", "en")), "Who arrived?");
  assert.equal(generate(parse("Which happened first?", "en")), "Which happened first?");
  const bake = parse("What did she bake?", "en");
  assert.deepEqual(bake.query, { relation: "theme", expectedType: "entity" });
});

test("imperative: the addressee is suppressed, the verb is the first word", () => {
  const p = parse("Tell me about winter.", "en");
  const root = p.meaning.nodes.find((n) => n.id === p.meaning.rootId)!;
  assert.equal(root.lemma, "tell");
  assert.deepEqual(root.states?.suppressedRoles, ["agent"]);
  assert.equal(generate(p), "Tell me about winter.");
  // the pronoun test keeps declaratives out of the imperative branch
  assert.equal(generate(parse("Wind blows.", "en")), "Wind blows.");
});

test("the F3 crash pair generates, with subjects recovered", () => {
  assert.equal(generate(parse("Why is the garden flooded?", "en")), "Why is the garden flooded?");
  assert.equal(generate(parse("Why did she leave?", "en")), "Why did she leave?");
});

test("locative copula: declarative and question are the same relation", () => {
  assert.equal(generate(parse("You are in Chicago.", "en")), "You are in Chicago.");
  const q = parse("Where are you?", "en");
  assert.deepEqual(q.query, { relation: "location", expectedType: "location" });
  assert.equal(generate(q), "Where are you?");
});
