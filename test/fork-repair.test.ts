/**
 * fork-repair.test.ts — the repair tranche (docs/fork/repair-programme.md):
 * item 2, nominal predication via the declared 'predicated-as' relation;
 * item 3, suppressed valency slots for agentless passives (H1's
 * representation). Paper claims become executable checks here, in the
 * house style of fork.test.ts.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { ParsedSentence } from "../src/fork/sentence";
import { parse } from "../src/fork/parse";
import { generate } from "../src/fork/generate";
import { checkSentence } from "../src/fork/check";

function roundTrip(text: string, lang: "en" | "zh"): ParsedSentence {
  const parsed = parse(text, lang);
  assert.equal(generate(parsed), text, `round-trip of ${text}`);
  return parsed;
}
function violations(text: string, lang: "en" | "zh"): string[] {
  return checkSentence(parse(text, lang)).map((v) => v.name);
}
function rootOf(p: ParsedSentence) {
  return p.meaning.nodes.find((n) => n.id === p.meaning.rootId)!;
}
function edgeSet(p: ParsedSentence): string[] {
  const byId = new Map(p.meaning.nodes.map((n) => [n.id, n.lemma]));
  return p.meaning.edges.map((e) => `${byId.get(e.from)}-${e.relation}->${byId.get(e.to)}`).sort();
}

/* ---------- Item 2: nominal predication ---------- */

test("ZH nominal predication: 今天星期一 parses on the declared predicated-as relation and round-trips", () => {
  const p = roundTrip("今天星期一。", "zh");
  assert.equal(p.meaning.entryElement, "Earth", "no verb, no adjective: the clause enters at Earth");
  assert.equal(rootOf(p).lemma, "星期一");
  const edge = p.meaning.edges.find((e) => e.relation === "predicated-as");
  assert.ok(edge, "the predication relation is present");
  const byId = new Map(p.meaning.nodes.map((n) => [n.id, n]));
  assert.equal(byId.get(edge!.from)?.lemma, "今天");
  assert.equal(byId.get(edge!.to)?.lemma, "星期一");
  assert.equal(byId.get(edge!.from)?.syntacticElement, "Earth");
  assert.equal(byId.get(edge!.to)?.syntacticElement, "Earth", "Earth predicated of Earth");
  assert.equal(edge!.cycle, "other", "a declared architectural addition, NOT a cycle edge");
  assert.deepEqual(violations("今天星期一。", "zh"), []);
});

test("ZH adjectival verbless predication still enters at Fire (R1), untouched by nominal predication", () => {
  for (const text of ["冬天很冷。", "他很忙。"]) {
    const p = roundTrip(text, "zh");
    assert.equal(p.meaning.entryElement, "Fire", `${text} enters at the adjective`);
    assert.ok(!p.meaning.edges.some((e) => e.relation === "predicated-as"), `${text} uses the R1 predicate path, not predicated-as`);
  }
});

test("EN nominal predication: the copula realises the same predicated-as relation", () => {
  for (const text of ["Today is Monday.", "Today is a holiday.", "Sarah is my sister."]) {
    const p = roundTrip(text, "en");
    assert.equal(p.meaning.entryElement, "Earth");
    const edge = p.meaning.edges.find((e) => e.relation === "predicated-as");
    assert.ok(edge, `${text}: predicated-as edge present`);
    assert.equal(edge!.cycle, "other", "not a cycle edge in English either");
    assert.deepEqual(violations(text, "en"), []);
  }
  const holiday = parse("Today is a holiday.", "en");
  assert.equal(rootOf(holiday).det, "a", "the indefinite article rides on the predicate nominal for regeneration");
});

test("nominal predication does not leak into verbal clauses", () => {
  const p = roundTrip("The dog bites the man.", "en");
  assert.ok(!p.meaning.edges.some((e) => e.relation === "predicated-as"));
  assert.equal(p.meaning.entryElement, "Wood");
});

/* ---------- Item 3: suppressed slots in agentless passives ---------- */

test("EN transfer pair: active and recipient-passive share the transfer structure; the agent slot is present-and-suppressed", () => {
  const active = roundTrip("She gave him a book.", "en");
  assert.deepEqual(edgeSet(active), ["give-agent->she", "give-recipient->him", "give-theme->book"]);
  assert.equal(rootOf(active).states?.suppressedRoles, undefined, "nothing suppressed in the active");

  const passive = roundTrip("He was given a book.", "en");
  const root = rootOf(passive);
  assert.equal(root.states?.voice, "passive");
  assert.deepEqual(root.states?.suppressedRoles, ["agent"], "the agent slot stays declared, marked suppressed");
  assert.ok(!passive.meaning.edges.some((e) => e.relation === "agent"), "no agent is realised — and none is invented");
  // The transfer structure survives: recipient and theme edges match
  // the active's (he/him are the same participant in two cases).
  assert.deepEqual(edgeSet(passive), ["give-recipient->he", "give-theme->book"]);
  assert.deepEqual(violations("He was given a book.", "en"), [], "a suppressed slot is not a missing argument");
});

test("EN theme-passive: 'The book was given' — the skipped recipient is suppressed too, and nothing is flagged or invented", () => {
  const p = roundTrip("The book was given.", "en");
  const root = rootOf(p);
  assert.equal(root.states?.voice, "passive");
  assert.deepEqual([...(root.states?.suppressedRoles ?? [])].sort(), ["agent", "recipient"]);
  assert.deepEqual(edgeSet(p), ["give-theme->book"], "the subject is the theme — right-aligned slot filling");
  assert.deepEqual(violations("The book was given.", "en"), [], "suppressed slots never surface as valency-missing-argument");
  assert.equal(generate(p), "The book was given.", "generation demands no agent and invents none");
});

test("EN expressed by-agent passive is unchanged: no suppression, edge-identical to the active", () => {
  const active = parse("The cook chopped the onions.", "en");
  const passive = roundTrip("The onions were chopped by the cook.", "en");
  assert.equal(rootOf(passive).states?.suppressedRoles, undefined);
  assert.deepEqual(edgeSet(passive), edgeSet(active), "same edges; only the voice state differs");
});

test("ZH agentless bei passive: the agent slot is suppressed, not dropped", () => {
  const p = roundTrip("饭被吃了。", "zh");
  const root = rootOf(p);
  assert.equal(root.states?.voice, "passive");
  assert.equal(root.states?.construction, "bei");
  assert.deepEqual(root.states?.suppressedRoles, ["agent"]);
  assert.ok(!p.meaning.edges.some((e) => e.relation === "agent"));
  assert.deepEqual(violations("饭被吃了。", "zh"), []);
});

test("ZH expressed-agent bei passive is unchanged: no suppression recorded", () => {
  const p = roundTrip("书被他拿走了。", "zh");
  assert.equal(rootOf(p).states?.suppressedRoles, undefined);
  assert.ok(p.meaning.edges.some((e) => e.relation === "agent"));
});
