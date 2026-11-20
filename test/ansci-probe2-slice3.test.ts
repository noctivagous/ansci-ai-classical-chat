/**
 * ansci-probe2-slice3.test.ts — tokeniser symbol set +
 * structural typo tie-break (Probe-2 Slice 3, 2026-11-20;
 * diagnostics IM1, IM2).
 *
 * IM1: the tokeniser's strip set knew only [.?!] and the
 * comma, so any other symbol a surface carried rode into
 * the token as content — "you>" was not the word "you" to
 * any layer, and the turns that survived did so by the
 * spelling matcher's luck. Edge symbols are now surface,
 * removed in enTokenize before every other rule reads the
 * token.
 *
 * IM2: the matcher's margin rule refused "hwo" — one
 * delete from who, how and two, none dominant — while the
 * structural evidence that separates them (the sentence-
 * initial inverted-auxiliary slot admits question words;
 * the typo's onset letter is h) went unused. The structural
 * tie-break (token-resolve.ts) applies those two signals,
 * in that order, and still declines when they tie.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { structuralTieBreak } from "../src/ansci/token-resolve";

const IDENTITY =
  "I am AnSci. I am a small classical-AI system. I understand simple English statements and questions, and I answer from what I know, saying so when I don't.";

test("IM1: 'who are you>?' answers as its control — the '>' never reaches a token", () => {
  const { reply, trace } = processTurn(newSession(), "who are you>?");
  assert.equal(reply, IDENTITY);
  assert.ok(
    (trace.tokenResolutions ?? []).every((r) => !r.surface.includes(">")),
    "no resolution record may carry the '>' as content",
  );
});

test("IM1: a standalone '>' token is dropped, not filed", () => {
  const { reply } = processTurn(newSession(), "who are you >");
  assert.equal(reply, IDENTITY);
});

test("IM1: 'hello>' greets as 'hello' does", () => {
  const { reply } = processTurn(newSession(), "hello>");
  assert.equal(reply, "Hello.");
});

test("IM1: bracketed and quoted words read as the words", () => {
  const { reply } = processTurn(newSession(), "(who) are you?");
  assert.equal(reply, IDENTITY);
});

test("IM2: 'hwo are you?' resolves to 'how' and answers as 'how are you?' does", () => {
  const { reply, trace } = processTurn(newSession(), "hwo are you?");
  assert.equal(reply, "I am fine.");
  const record = (trace.tokenResolutions ?? []).find((r) => r.surface === "hwo");
  assert.equal(record?.outcome, "corrected");
  assert.deepEqual(record?.replacement, ["how"]);
  assert.equal(record?.rule, "matcher:symspell+structural-tiebreak");
});

test("IM2 (pure): the slot drops the numeral, the onset separates how from who", () => {
  const candidates = [
    { term: "who", distance: 1, count: 630927278 },
    { term: "how", distance: 1, count: 571848080 },
    { term: "two", distance: 1, count: 441398439 },
    { term: "hwy", distance: 1, count: 7052767 },
  ];
  const pick = structuralTieBreak("hwo", candidates.slice(0, 2), candidates, {
    atSentenceStart: true,
    nextLower: "are",
  });
  assert.equal(pick?.term, "how");
});

test("IM2 (pure): a tie inside the admitted class still declines — no guess", () => {
  const candidates = [
    { term: "whom", distance: 1, count: 20000000 },
    { term: "who", distance: 1, count: 630927278 },
  ];
  const pick = structuralTieBreak("whmo", [], candidates, {
    atSentenceStart: true,
    nextLower: "are",
  });
  assert.equal(pick, undefined);
});

test("IM2 (pure): away from the slot, same-onset candidates tie and decline", () => {
  const all = [
    { term: "were", distance: 1, count: 570699558 },
    { term: "where", distance: 1, count: 360468339 },
    { term: "wire", distance: 1, count: 31113149 },
  ];
  const pick = structuralTieBreak("whre", [], all, { atSentenceStart: false, nextLower: "he" });
  assert.equal(pick, undefined);
});

test("IM2: the ambiguous token stands unresolved in a real turn — 'whre' is not guessed", () => {
  const { trace } = processTurn(newSession(), "i know whre he lives.");
  const record = (trace.tokenResolutions ?? []).find((r) => r.surface === "whre");
  assert.equal(record?.outcome, "unresolved");
  assert.deepEqual(record?.replacement, ["whre"]);
});

test("IM1/IM2 control: a correctly spelled question word is never 'corrected' to itself", () => {
  const { reply, trace } = processTurn(newSession(), "how are you>");
  assert.equal(reply, "I am fine.");
  assert.ok(
    (trace.tokenResolutions ?? []).every((r) => r.rule !== "matcher:symspell+structural-tiebreak"),
    "the tie-break must not fire on the word 'how' itself",
  );
});
