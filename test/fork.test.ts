/**
 * fork.test.ts — the fork's sentence layer (src/fork/), regression-
 * converted from the three desk evaluations in docs/fork/:
 * the 30-sentence evaluation, the cycle probes (G/K/N), and the
 * prediction run (P1–P6). Paper claims become executable checks here;
 * where a claim was only mechanism-level on paper, the test says so.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CONTROLS, GENERATES, semanticClassifications, type ParsedSentence } from "../src/fork/sentence";
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
function edgeSet(p: ParsedSentence): string[] {
  const byId = new Map(p.meaning.nodes.map((n) => [n.id, n.lemma]));
  return p.meaning.edges.map((e) => `${byId.get(e.from)}-${e.relation}->${byId.get(e.to)}`).sort();
}

test("cycle tables are exactly the two cycles; generating closure Water→Wood present", () => {
  assert.deepEqual(GENERATES, { Wood: "Fire", Fire: "Earth", Earth: "Metal", Metal: "Water", Water: "Wood" });
  assert.deepEqual(CONTROLS, { Wood: "Earth", Earth: "Water", Water: "Fire", Fire: "Metal", Metal: "Wood" });
  assert.equal(GENERATES.Water, "Wood", "the closure arc the serial-verb mechanism rides on");
});

test("meaning graph holds no order information; order lives in the connective graph", () => {
  const p = parse("The angry cook quickly chopped the onions.", "en");
  assert.ok(!("tokens" in p.meaning) && !("next" in p.meaning));
  assert.deepEqual(p.connective.tokens, ["The", "angry", "cook", "quickly", "chopped", "the", "onions"]);
  assert.deepEqual(p.connective.next, [1, 2, 3, 4, 5, 6, -1]);
  // Zero realisation is representable in the alignment.
  assert.ok(Object.values(p.realizes).every((idx) => Array.isArray(idx)));
});

test("EN round-trips: canonical clause, valency, ditransitive", () => {
  roundTrip("The angry cook quickly chopped the onions.", "en");
  roundTrip("He put the book on the table.", "en");
  roundTrip("I lent him the ladder yesterday.", "en");
  assert.deepEqual(violations("He put the book on the table.", "en"), []);
});

test("EN passive is a voice state on the same meaning graph as the active", () => {
  const active = parse("The cook chopped the onions.", "en");
  const passive = roundTrip("The onions were chopped by the cook.", "en");
  assert.equal(passive.meaning.nodes.find((n) => n.id === passive.meaning.rootId)?.states?.voice, "passive");
  assert.equal(active.meaning.nodes.find((n) => n.id === active.meaning.rootId)?.states?.voice, "active");
  assert.deepEqual(edgeSet(passive), edgeSet(active), "same edges; only the voice state differs");
  assert.equal(passive.connective.topicTokenIndex, 1, "the patient is topicalised in the connective graph");
});

test("EN negation rides the auxiliary (K6 mechanism): hadn't + participle", () => {
  const p = roundTrip("She hadn't yet arrived.", "en");
  const root = p.meaning.nodes.find((n) => n.id === p.meaning.rootId);
  assert.equal(root?.states?.negated, true);
  assert.equal(root?.states?.aux, "had");
  assert.deepEqual(root?.states?.aspect, { perfect: true });
  assert.deepEqual(violations("She hadn't yet arrived.", "en"), []);
});

test("EN predicate entry at Earth (R1): Sarah is my sister", () => {
  const p = roundTrip("Sarah is my sister.", "en");
  assert.equal(p.meaning.entryElement, "Earth");
  assert.deepEqual(violations("Sarah is my sister.", "en"), []);
});

test("meaning discrimination: word order alone flips agent and patient (H6)", () => {
  const a = parse("The dog bites the man.", "en");
  const b = parse("The man bites the dog.", "en");
  assert.notDeepEqual(edgeSet(a), edgeSet(b));
  const agentOf = (p: ParsedSentence) => p.meaning.edges.find((e) => e.relation === "agent");
  const node = (p: ParsedSentence, id: string) => p.meaning.nodes.find((n) => n.id === id)?.lemma;
  assert.equal(node(a, agentOf(a)!.to), "dog");
  assert.equal(node(b, agentOf(b)!.to), "man");
  assert.equal(generate(a), "The dog bites the man.");
  assert.equal(generate(b), "The man bites the dog.");
});

test("two addresses: furious is syntactic Fire, semantic Wood", () => {
  const p = roundTrip("She was furious.", "en");
  const furious = p.meaning.nodes.find((n) => n.lemma === "furious");
  assert.equal(furious?.syntacticElement, "Fire");
  assert.equal(furious?.semanticElement, "Wood");
  assert.equal(p.meaning.entryElement, "Fire", "verbless entry at the predicate (R1)");
  const cls = semanticClassifications(p);
  assert.deepEqual(cls, [{ lemma: "furious", syntacticElement: "Fire", semanticElement: "Wood", seedElementId: "wood" }]);
});

test("semantic join keys classifications to seed element nodes by name", () => {
  const p = parse("冬天很冷。", "zh");
  const cls = semanticClassifications(p);
  assert.ok(cls.some((c) => c.lemma === "冬天" && c.seedElementId === "water"));
  assert.ok(cls.some((c) => c.lemma === "冷" && c.seedElementId === "water"));
});

test("ZH round-trips: verbless predication, aspect particle, ba, bei, serial chaining", () => {
  const winter = roundTrip("冬天很冷。", "zh");
  assert.equal(winter.meaning.entryElement, "Fire", "no verb: the clause enters the cycle at the adjective (R1)");
  // 我吃饭了 canonicalises to 我吃了饭。 in generation: the aspect
  // particle is emitted immediately after its verb (stated-equivalent
  // form; both placements are grammatical, with an aspect nuance the
  // layer does not model).
  assert.equal(generate(parse("我吃饭了。", "zh")), "我吃了饭。");
  roundTrip("你吃了吗？", "zh");
  roundTrip("他把书放在桌子上。", "zh");
  const bei = roundTrip("书被他拿走了。", "zh");
  assert.equal(bei.meaning.nodes.find((n) => n.id === bei.meaning.rootId)?.states?.voice, "passive");
  const serial = roundTrip("我吃了饭就去睡觉。", "zh");
  const chains = serial.meaning.edges.filter((e) => e.relation === "chains-to");
  assert.equal(chains.length, 2, "吃→去→睡觉 chained at the generating closure");
  assert.equal(chains[0].marker, "就");
});

test("ZH classifier generation (Earth→Metal): 三本书 parses clean and regenerates", () => {
  const p = parse("三本书", "zh");
  assert.equal(generate(p), "三本书");
  assert.deepEqual(checkSentence(p), []);
  const clf = p.meaning.edges.find((e) => e.relation === "has-classifier");
  assert.equal(clf?.cycle, "generating", "the noun generates its classifier: Earth→Metal is a generating arc");
});

test("A-not-A question formation (prediction P1, mechanism side)", () => {
  const p = parse("你去不去？", "zh");
  const root = p.meaning.nodes.find((n) => n.id === p.meaning.rootId);
  assert.equal(root?.states?.construction, "a-not-a");
  assert.equal(root?.states?.mood, "interrogative");
  assert.equal(generate(p), "你去不去？");
  assert.deepEqual(checkSentence(p), []);
});

test("controlling cycle names violations: valency (Wood→Earth)", () => {
  assert.ok(violations("He put the book.", "en").includes("valency-missing-argument"));
});

test("controlling cycle names violations: negation carrier + agreement (Metal→Wood, K6/K1)", () => {
  const v = checkSentence(parse("She didn't arrived.", "en"));
  assert.ok(v.some((x) => x.name === "negation-carrier-tense" && x.cycle === "Metal→Wood"));
  assert.ok(violations("She go to school.", "en").includes("agreement"));
  assert.deepEqual(violations("She goes to school.", "en"), []);
});

test("controlling cycle names violations: ZH classifier, particle scope, A-not-A + 吗 (Earth→Metal; P3/P6/P1)", () => {
  assert.ok(violations("三书", "zh").includes("missing-classifier"));
  assert.ok(violations("你吃吗了？", "zh").includes("particle-scope-order"));
  assert.deepEqual(violations("你吃了吗？", "zh"), [], "aspect inside, question outside: the grammatical stack");
  assert.ok(violations("你去不去吗？", "zh").includes("a-not-a-with-ma"));
});
