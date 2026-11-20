/**
 * fork-transcript-slice1.test.ts — the clausal-complement
 * construction (Transcript Slice 1, 2026-11-19): an embedded
 * clause (wh- or that-) parsed as a verb's complement.
 *
 * The diagnosis these tests pin (probe report SD1/IM2/K2):
 * parseEnBody was a single-clause dispatch keyed on the first
 * be/verb item in the whole token stream, the sentence layer had
 * no complement-clause relation, verb slots took NP chunks only,
 * and 'know' had no hand-lexicon entry. Probes 1, 7, 8 and the
 * statement form 9 all stopped at lpu/parser, and "i know that
 * you are here." silently misparsed — rooted on 'here', 'know'
 * gone. Every expectation below was verified against this tree's
 * build before it was pinned.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/fork/parse";
import { generate } from "../src/fork/generate";
import { checkSentence } from "../src/fork/check";
import { EN_LEXICON, type VerbEntry } from "../src/fork/sentence";
import { newSession } from "../src/fork/session";
import { processTurn } from "../src/fork/turn";

function rootOf(text: string) {
  const p = parse(text, "en");
  const root = p.meaning.nodes.find((n) => n.id === p.meaning.rootId)!;
  return { p, root };
}
function edge(p: ReturnType<typeof parse>, fromLemma: string, relation: string) {
  return p.meaning.edges.find(
    (e) =>
      p.meaning.nodes.find((n) => n.id === e.from)?.lemma === fromLemma && e.relation === relation,
  );
}
function nodeByLemma(p: ReturnType<typeof parse>, lemma: string) {
  return p.meaning.nodes.find((n) => n.lemma === lemma);
}

test("K2: 'know' has a hand-lexicon entry with the clausal-complement frame", () => {
  const entry = EN_LEXICON["know"] as VerbEntry;
  assert.ok(entry, "the hand lexicon holds 'know'");
  assert.equal(entry.kind, "verb");
  assert.equal(entry.source, undefined, "a hand entry, not a WordNet derivation");
  // The NP frame is the fallback's own, so know + NP keeps its shape.
  assert.deepEqual(entry.slots, ["theme"]);
  assert.deepEqual(entry.required, []);
  assert.deepEqual(entry.forms, { base: "know", third: "knows", past: "knew", participle: "known" });
  assert.equal(entry.clausalComplement, true);
  // Registered under the lemma only (see sentence.ts): the
  // inflected surfaces adopt this entry by lemma through the
  // verb-slot fallback's hand-entry precedence — 'she knows'
  // resolves its root's frame from the hand entry, not from a
  // WordNet derivation.
  const she = rootOf("she knows who i am.");
  assert.equal(she.root.lemma, "know");
  assert.equal((EN_LEXICON[she.root.lemma] as VerbEntry).source, undefined);
  assert.equal(she.root.states?.verbForm, "third");
});

test("probe 1: 'do you know who i am?' — know is the root, the wh-clause its complement", () => {
  const { p, root } = rootOf("do you know who i am?");
  assert.equal(root.lemma, "know");
  assert.equal(root.role, "verb");
  assert.equal(root.states?.mood, "interrogative");
  const comp = edge(p, "know", "complement");
  assert.ok(comp, "a complement edge runs from 'know'");
  const wh = p.meaning.nodes.find((n) => n.id === comp!.to)!;
  assert.equal(wh.lemma, "who");
  assert.equal(wh.questionWord, true);
  assert.equal(wh.role, "predicate");
  // The embedded clause stands in its own right: i predicated as who.
  const pred = edge(p, "i", "predicated-as");
  assert.ok(pred && pred.to === wh.id);
  // The matrix agent is 'you' — the embedded copula did not hijack anything.
  assert.ok(edge(p, "know", "agent")?.to === nodeByLemma(p, "you")?.id);
  assert.deepEqual(checkSentence(p), []);
});

test("probe 7: 'do you know where oklahoma is?' — the wh-clause is a location question one clause down", () => {
  const { p, root } = rootOf("do you know where oklahoma is?");
  assert.equal(root.lemma, "know");
  const comp = edge(p, "know", "complement");
  assert.ok(comp);
  const wh = p.meaning.nodes.find((n) => n.id === comp!.to)!;
  assert.equal(wh.lemma, "where");
  assert.equal(wh.role, "location");
  const loc = edge(p, "oklahoma", "location");
  assert.ok(loc && loc.to === wh.id, "oklahoma stands as the embedded subject, located at 'where'");
  assert.deepEqual(checkSentence(p), []);
});

test("probe 8: 'do you know what a dog is?' — the embedded subject is the whole NP 'a dog'", () => {
  const { p, root } = rootOf("do you know what a dog is?");
  assert.equal(root.lemma, "know");
  const comp = edge(p, "know", "complement");
  assert.ok(comp);
  const wh = p.meaning.nodes.find((n) => n.id === comp!.to)!;
  assert.equal(wh.lemma, "what");
  const dog = nodeByLemma(p, "dog");
  assert.equal(dog?.det, "a");
  const pred = edge(p, "dog", "predicated-as");
  assert.ok(pred && pred.to === wh.id);
  assert.deepEqual(checkSentence(p), []);
});

test("probe 9: 'i know who you are.' — the statement form parses the same way", () => {
  const { p, root } = rootOf("i know who you are.");
  assert.equal(root.lemma, "know");
  assert.equal(root.states?.mood, "indicative");
  assert.ok(edge(p, "know", "complement"));
  assert.ok(edge(p, "know", "agent")?.to === nodeByLemma(p, "i")?.id);
  assert.equal(generate(p), "I know who you are.");
  assert.deepEqual(checkSentence(p), []);
});

test("the that-clause no longer misparses: 'know' is retained as root, the clause its complement", () => {
  const { p, root } = rootOf("i know that you are here.");
  assert.equal(root.lemma, "know", "the root is 'know', not the embedded 'here'");
  const comp = edge(p, "know", "complement");
  assert.ok(comp);
  assert.equal(comp.marker, "that", "the complementiser rides on the edge");
  const compRoot = p.meaning.nodes.find((n) => n.id === comp!.to)!;
  assert.equal(compRoot.lemma, "here");
  // The embedded clause stands in its own right: you predicated as here.
  assert.ok(edge(p, "you", "predicated-as")?.to === compRoot.id);
  assert.equal(generate(p), "I know that you are here.");
  assert.deepEqual(checkSentence(p), []);
});

test("the construction generalises over its claimed shapes", () => {
  // That-clause with an NP complement inside.
  assert.equal(generate(parse("i know that a dog is an animal.", "en")), "I know that a dog is an animal.");
  // Know-class beyond 'know': a derived cognition verb as matrix.
  const think = rootOf("i think that you are here.");
  assert.equal(think.root.lemma, "think");
  assert.ok(edge(think.p, "think", "complement"));
  assert.equal(generate(think.p), "I think that you are here.");
  // Wh-verbal embedded clause: the wh-word fills its slot one clause down.
  const wv = rootOf("i know what you know.");
  assert.ok(edge(wv.p, "know", "complement"));
  assert.equal(generate(wv.p), "I know what you know.");
  // Nesting: a complement inside the embedded clause.
  assert.equal(generate(parse("i know that you know who i am.", "en")), "I know that you know who i am.");
  // Past matrix, past embedded copula.
  assert.equal(generate(parse("i knew who you were.", "en")), "I knew who you were.");
  // Negated matrix.
  const neg = rootOf("i don't know who i am.");
  assert.equal(neg.root.states?.negated, true);
  assert.ok(edge(neg.p, "know", "complement"));
  // A questioned matrix subject.
  const qs = rootOf("who knows who i am?");
  assert.equal(qs.root.lemma, "know");
  assert.deepEqual(qs.p.query, { relation: "agent", expectedType: "person" });
});

test("controls: know + NP parses exactly as before, with no complement edge", () => {
  for (const [text, theme] of [
    ["do you know my name?", "name"],
    ["do you know dogs?", "dog"],
  ] as const) {
    const { p, root } = rootOf(text);
    assert.equal(root.lemma, "know");
    assert.equal(edge(p, "know", "complement"), undefined);
    assert.ok(edge(p, "know", "theme")?.to === nodeByLemma(p, theme)?.id, `${text}: the NP fills the theme slot`);
  }
  const who = rootOf("who do you know?");
  assert.equal(who.root.lemma, "know");
  assert.equal(edge(who.p, "know", "complement"), undefined);
  assert.deepEqual(who.p.query, { relation: "theme", expectedType: "person" });
});

test("fallthrough: a relative 'that' after a noun is not claimed as a complement", () => {
  const { p, root } = rootOf("i have a job that i love.");
  assert.equal(root.lemma, "have");
  assert.equal(edge(p, "have", "complement"), undefined);
  assert.equal(p.meaning.edges.some((e) => e.relation === "complement"), false);
});

test("acceptance at the turn layer: no probe stops at the parser", () => {
  const cases: [string, string][] = [
    // Probes 1 and 8 parsed whole here first; their ANSWERS
    // were routed by Transcript Slice 2 (the know-question
    // routing): probe 1 from the Interlocutor register, probe
    // 8 declined located at 'dog'. What this slice still pins
    // is that the parser no longer stops them, 'know' stays
    // the root, and the walk does not end at the parser.
    ["do you know who i am?", "No. You have not told me who you are."],
    // Probe 7 declines downstream, located at 'oklahoma' — a
    // located decline, not the parser's rephrase request.
    ["do you know where oklahoma is?", "I can't answer that from what I know: I have oklahoma as a state in south central United States, but nothing in what I know answers that."],
    ["do you know what a dog is?", "I can't answer that from what I know: nothing in what I know says what a dog is."],
    ["i know who you are.", "Ok. Noted."],
    ["i know that you are here.", "Ok. Noted."],
    // "do you know my name?" was a control here; Slice 2
    // routed it to the Interlocutor register (its subject).
    ["do you know my name?", "No. You have not told me your name."],
    // Controls, unchanged replies.
    ["do you know dogs?", "I can't answer that from what I know: I have nothing on dogs in what I know."],
    ["who do you know?", "I can't answer that from what I know: nothing you have told me says what was known."],
  ];
  for (const [input, expected] of cases) {
    const { reply, trace } = processTurn(newSession(), input);
    assert.equal(reply, expected, input);
    assert.notEqual(reply, "Could you put that another way?", input);
    assert.ok(trace.parseSummary.startsWith("root 'know'"), `${input}: ${trace.parseSummary}`);
    assert.notEqual(trace.mapPath?.[trace.mapPath.length - 1], "lpu/parser", input);
  }
});
