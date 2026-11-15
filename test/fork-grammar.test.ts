/**
 * fork-grammar.test.ts — Slice A (grammar completion): R3 gaps and
 * displaced realisation, R4 expletives, R5 clausal modifiers, R6
 * resultative/degree complements as main content, R8 discontinuous
 * realisation, conditionals/subjunctive, and ZH wh-in-situ (P2) —
 * each as a mechanism with parse/generate/constraint checks, converted
 * from docs/fork/desk-evaluation-sentences-wuxing.md (H2, H4, H5, H7,
 * H9, H10, E3, C6, C9, C10).
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
function edgeSet(p: ParsedSentence): string[] {
  const byId = new Map(p.meaning.nodes.map((n) => [n.id, n.lemma]));
  return p.meaning.edges.map((e) => `${byId.get(e.from)}-${e.relation}->${byId.get(e.to)}`).sort();
}
function root(p: ParsedSentence) {
  return p.meaning.nodes.find((n) => n.id === p.meaning.rootId)!;
}
/** Token indices realised by meaning nodes — scaffolding tokens must be absent. */
function realisedTokens(p: ParsedSentence): Set<number> {
  return new Set(Object.values(p.realizes).flat());
}

test("R3 wh-question: fronted question word fills the object slot; the gap is its empty surface position", () => {
  const p = roundTrip("What did you make?", "en");
  const q = p.meaning.nodes.find((n) => n.questionWord);
  assert.ok(q, "a question-word node exists");
  assert.equal(q!.role, "patient", "what fills make's patient slot, as in a declarative");
  assert.deepEqual(p.realizes[q!.id], [0], "realised by the fronted token alone");
  const verb = root(p);
  assert.equal(verb.lemma, "make");
  assert.equal(verb.states?.mood, "interrogative");
  assert.equal(verb.states?.aux, "did");
  // The declarative twin has the same agent/patient shape.
  const decl = parse("You made the cake.", "en");
  assert.deepEqual(
    edgeSet(p).filter((e) => !e.includes("cake") && !e.includes("what")),
    edgeSet(decl).filter((e) => !e.includes("cake") && !e.includes("what")),
  );
});

test("R3/R4 do-support: 'did' is connective scaffolding (a Metal tense carrier) realising no meaning node", () => {
  const p = parse("What did you make?", "en");
  assert.deepEqual(p.connective.scaffolding, [{ index: 1, kind: "do-support" }]);
  assert.ok(!realisedTokens(p).has(1), "no meaning node realises the token 'did'");
  // And the carrier rule constrains the verb form in questions too (Metal→Wood).
  assert.ok(violations("What did you made?", "en").includes("question-carrier-tense"));
  assert.deepEqual(violations("What did you make?", "en"), []);
});

test("R3 topic fronting: same meaning graph as unfronted; fronting lives in the connective graph only", () => {
  const fronted = parse("That book, I haven't read.", "en");
  const plain = parse("I haven't read that book.", "en");
  assert.deepEqual(edgeSet(fronted), edgeSet(plain), "displacement changes the saying, not the claim");
  assert.equal(fronted.connective.topicTokenIndex, 1, "the fronted head is the connective topic");
  assert.equal(plain.connective.topicTokenIndex, undefined);
  // Generation from the meaning graph yields the unfronted claim:
  // emphasis is a connective fact and is not regenerated (desk eval H4).
  assert.equal(generate(fronted), "I haven't read that book.");
});

test("R4 existential: 'there' realises nothing; the meaning graph holds the cat and its location", () => {
  const p = roundTrip("There is a cat on the roof.", "en");
  assert.deepEqual(p.meaning.nodes.map((n) => n.lemma).sort(), ["cat", "roof"]);
  assert.ok(!realisedTokens(p).has(0), "'there' is realised by no meaning node");
  assert.deepEqual(
    p.connective.scaffolding?.map((s) => s.kind),
    ["expletive-there", "copula"],
  );
  assert.equal(root(p).states?.construction, "existential");
  assert.equal(root(p).syntacticElement, "Earth", "the clause enters at the presented Earth");
  assert.deepEqual(violations("There is a cat on the roof.", "en"), []);
});

test("R4 weather: expletive 'it', zero Earth valency, generation re-emits the scaffolding", () => {
  const p = roundTrip("It is raining.", "en");
  assert.equal(p.meaning.nodes.filter((n) => n.syntacticElement === "Earth").length, 0, "nothing is doing the raining");
  assert.equal(root(p).lemma, "rain");
  assert.deepEqual(
    p.connective.scaffolding?.map((s) => s.kind),
    ["expletive-it", "copula"],
  );
  assert.deepEqual(violations("It is raining.", "en"), [], "zero valency is statable and satisfied");
});

test("R5 relative clause (EN): clause graph modifies the Earth head; the head fills the clause's gap", () => {
  const p = roundTrip("The book that I bought is big.", "en");
  const mod = p.meaning.edges.find((e) => e.relation === "modifier");
  assert.ok(mod, "a modifier edge attaches the clause to the head");
  assert.equal(mod!.marker, "that", "overt marker recorded on the edge");
  const head = p.meaning.nodes.find((n) => n.id === mod!.from);
  assert.equal(head?.lemma, "book");
  const clause = p.meaning.nodes.find((n) => n.id === mod!.to);
  assert.equal(clause?.lemma, "buy");
  const gap = p.meaning.edges.find((e) => e.from === clause!.id && e.relation === "patient");
  assert.equal(gap?.to, head!.id, "the gap inside the clause IS the head node — no copy, no pronoun");
});

test("R5 relative clause (ZH): clause + 的 precedes its head, same modifier mechanism", () => {
  const p = roundTrip("我买的书很贵。", "zh");
  const mod = p.meaning.edges.find((e) => e.relation === "modifier");
  assert.ok(mod);
  assert.equal(mod!.marker, "的");
  const head = p.meaning.nodes.find((n) => n.id === mod!.from);
  assert.equal(head?.lemma, "书");
  assert.equal(root(p).lemma, "贵", "the main clause is the verbless adjective predicate (R1)");
});

test("R5 reduced relative: 'raced past the barn' is a modifier clause; 'fell' is the root (H9 structure)", () => {
  const p = roundTrip("The horse raced past the barn fell.", "en");
  assert.equal(root(p).lemma, "fall", "the last verb roots the clause");
  const mod = p.meaning.edges.find((e) => e.relation === "modifier");
  assert.ok(mod);
  assert.equal(mod!.marker, undefined, "reduced: no overt marker");
  const clause = p.meaning.nodes.find((n) => n.id === mod!.to);
  assert.equal(clause?.lemma, "race");
  // NOTE: this supports the reduced-relative STRUCTURE. Garden-path
  // reanalysis (recovering this reading after first taking 'raced' as
  // the root) is a named non-goal — see docs/fork/README.md.
});

test("R6 resultative (EN): the result adjective is main content on a generating Wood→Fire arc", () => {
  const p = roundTrip("My bananas have gone all brown.", "en");
  const res = p.meaning.edges.find((e) => e.relation === "result");
  assert.ok(res, "the result is represented, not dropped");
  assert.equal(res!.cycle, "generating", "result is the generating arc Wood→Fire itself");
  const resNode = p.meaning.nodes.find((n) => n.id === res!.to);
  assert.equal(resNode?.lemma, "brown");
  const deg = p.meaning.edges.find((e) => e.relation === "modulates" && e.to === resNode!.id);
  assert.ok(deg, "'all' modulates the result, not the verb");
  const p2 = roundTrip("The soup got hot.", "en");
  assert.equal(p2.meaning.edges.find((e) => e.relation === "result")?.cycle, "generating");
});

test("R6 degree complement (ZH): 他跑得很快 — the degree content is the clause's news", () => {
  const p = roundTrip("他跑得很快。", "zh");
  const deg = p.meaning.edges.find((e) => e.relation === "degree");
  assert.ok(deg);
  assert.equal(deg!.cycle, "generating");
  const degNode = p.meaning.nodes.find((n) => n.id === deg!.to);
  assert.equal(degNode?.lemma, "快");
  assert.ok(p.meaning.edges.some((e) => e.relation === "modulates" && e.to === degNode!.id), "很 modulates the degree content");
});

test("R8 discontinuous realisation: 一边…一边 is one Metal relation realised by two non-adjacent tokens", () => {
  const p = roundTrip("他一边走一边唱歌。", "zh");
  const rel = p.meaning.nodes.find((n) => n.syntacticElement === "Metal");
  assert.ok(rel, "the correlative is a Metal relation node");
  assert.deepEqual(p.realizes[rel!.id], [1, 3], "two discontinuous tokens realise the one relation");
  const verbs = p.meaning.nodes.filter((n) => n.syntacticElement === "Wood").map((n) => n.lemma).sort();
  assert.deepEqual(verbs, ["唱歌", "走"], "both activities are present as chained verbs");
  assert.ok(p.meaning.edges.some((e) => e.relation === "chains-to" && e.marker === "一边…一边"));
});

test("conditional/subjunctive (H2): condition relation between clause graphs; 'were' is not an agreement error", () => {
  const p = roundTrip("If I were king, I would abdicate.", "en");
  const cond = p.meaning.edges.find((e) => e.relation === "condition");
  assert.ok(cond, "a condition relation joins the two clause graphs");
  assert.equal(cond!.element, "Metal", "the condition relation is Metal logical");
  const condRoot = p.meaning.nodes.find((n) => n.id === cond!.to);
  assert.equal(condRoot?.lemma, "king");
  assert.equal(condRoot?.states?.mood, "subjunctive");
  assert.equal(root(p).states?.mood, "subjunctive");
  assert.equal(root(p).states?.modal, "would");
  // Fire→Metal: the subjunctive mood forces the 'were' structure for a
  // first-person subject — the checker must not flag it as agreement.
  // ('was' in this slot is register variation, not a violation — the
  // checker deliberately has no 'subjunctive-form' violation.)
  assert.deepEqual(violations("If I were king, I would abdicate.", "en"), []);
});

test("ZH wh-in-situ (P2): 什么 sits in its ordinary object slot — no gap, no displacement", () => {
  const p = roundTrip("你买什么？", "zh");
  const q = p.meaning.nodes.find((n) => n.questionWord);
  assert.ok(q);
  assert.equal(q!.role, "patient");
  assert.equal(root(p).states?.mood, "interrogative", "the question word itself carries the interrogative force");
  const verbToken = p.realizes[root(p).id][0];
  assert.ok(p.realizes[q!.id][0] > verbToken, "the question word stays AFTER the verb — in situ");
});

test("P2 contrast: EN fronts its question word, ZH leaves it in place — same meaning shape, different connective", () => {
  const en = parse("What did you make?", "en");
  const zh = parse("你买什么？", "zh");
  const enQ = en.meaning.nodes.find((n) => n.questionWord)!;
  const zhQ = zh.meaning.nodes.find((n) => n.questionWord)!;
  assert.equal(enQ.role, zhQ.role, "both question words fill the patient slot of their clause");
  assert.ok(en.realizes[enQ.id][0] < en.realizes[en.meaning.rootId][0], "EN: question word before the verb (fronted)");
  assert.ok(zh.realizes[zhQ.id][0] > zh.realizes[zh.meaning.rootId][0], "ZH: question word after the verb (in situ)");
});
