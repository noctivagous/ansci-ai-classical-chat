/**
 * fork-negation.test.ts — stage 5, Part F.2: negation as a Water
 * state with a Metal carrier, in both languages.
 *
 * ZH: the F1 defect family — preverbal 不/没 was dropped at parse.
 * The negator in the record is the one the surface carried; the
 * bundle rule (zhNegatorFor) is what generation falls back to and
 * what the admission probe scored 15/15.
 * EN: the carrier configuration is in the record (K6), so the
 * round trip preserves it instead of re-guessing it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/fork/parse";
import { generate } from "../src/fork/generate";
import { zhNegatorFor } from "../src/fork/aspect";

test("zh negation round-trips exactly (the F1 family)", () => {
  for (const s of [
    "他不去学校。", "他没去学校。", "他不去吗？", "他没去过北京。",
    "他没有书。", "他不忙。", "他不高。", "他没喝茶。", "他不喜欢猫。", "他没看过书。",
  ]) {
    assert.equal(generate(parse(s, "zh")), s, s);
  }
});

test("zh A-not-A keeps its embedded negator and its object", () => {
  assert.equal(generate(parse("他去不去学校？", "zh")), "他去不去学校？");
  assert.equal(generate(parse("他去没去学校？", "zh")), "他去没去学校？");
});

test("the bundle rule selects the negator (admission probe, in code)", () => {
  assert.equal(zhNegatorFor("去", { bounded: true }), "没");
  assert.equal(zhNegatorFor("去", { perfect: true, experiential: true }), "没");
  assert.equal(zhNegatorFor("有", {}), "没");
  assert.equal(zhNegatorFor("去", {}), "不");
  assert.equal(zhNegatorFor("去", { ongoing: true }), "不");
  assert.equal(zhNegatorFor("忙", undefined), "不");
});

test("en negation records its Metal carrier", () => {
  const p = parse("She didn't arrive.", "en");
  const root = p.meaning.nodes.find((n) => n.id === p.meaning.rootId);
  assert.equal(root?.states?.negation?.negator, "not");
  assert.equal(root?.states?.negation?.carrier, "did");
  assert.equal(generate(p), "She didn't arrive.");
});

test("en copula negation survives (F1's English twin)", () => {
  assert.equal(generate(parse("She is not happy.", "en")), "She is not happy.");
  assert.equal(generate(parse("She is not a doctor.", "en")), "She is not a doctor.");
  const p = parse("She is not happy.", "en");
  const root = p.meaning.nodes.find((n) => n.id === p.meaning.rootId);
  assert.equal(root?.states?.negation?.carrier, "is");
});

test("temporal PPs resolve into the ontology's time nodes (Part F.4)", () => {
  for (const s of ["He sleeps in winter.", "She walks at dawn.", "He works at night.", "The garden blooms in spring."]) {
    const p = parse(s, "en");
    assert.ok(p.meaning.edges.some((e) => e.relation === "time"), s);
    assert.equal(generate(p), s, s);
  }
  // A place is still a place.
  const p = parse("He sleeps in the garden.", "en");
  assert.ok(p.meaning.edges.some((e) => e.relation === "location"));
});

test("synthetic negation: unmarked 很 drops, the progressive marker and the modal stay", () => {
  // The stage-5 generation direction: negate a parsed affirmative
  // graph (no recorded negator — the bundle rule selects it) and
  // regenerate. Three of its named leftovers close here.
  const negate = (s: string): string => {
    const p = parse(s, "zh");
    const r = p.meaning.nodes.find((n) => n.id === p.meaning.rootId)!;
    r.states = { ...r.states, negated: true, negation: undefined };
    return generate(p);
  };
  assert.equal(negate("他很忙。"), "他不忙。", "很 is dropped under negation, not retained");
  assert.equal(negate("他在游泳。"), "他不在游泳。", "progressive 在 is not dropped under negation");
  assert.equal(negate("他会游泳。"), "他不会游泳。", "the negator scopes over the modal");
  assert.equal(negate("他是老师。"), "他不是老师。", "copula negation precedes 是");
});
