/**
 * ansci-probe2-slice1.test.ts — structural question detection
 * (Probe-2 Slice 1, 2026-11-20; diagnostic SD1; owner ruling:
 * questions without "?" should be detected).
 *
 * The diagnosis these tests pin: interrogative mood was a
 * per-branch accident — enTokenize computed one punctuation
 * flag (a terminal "?") and each parse branch re-decided the
 * mood, the wh-branches hard-coding interrogative and the
 * rest inheriting the flag. A wh-question survived losing
 * its "?" (probe #2 Family Q pairs Q1–Q3, Q6 identical) and
 * a how-, do- or yes/no question did not: "how are you" and
 * "do you know my name" without the mark were assessed as
 * statements and acknowledged ("Ok. Noted."), their content
 * banked as assertion (Q4/Q5, T8, S5).
 *
 * The fix is one layer decision: parseEn OR-s the punctuation
 * flag with a structural onset signal (question-word
 * fronting, or sentence-initial auxiliary/copula/modal —
 * subject–aux inversion) taken over the resolved token
 * stream, at the single call site every branch inherits.
 * Statements open with their subject, not an auxiliary or a
 * question word, so statements — with a terminal period or
 * without one — keep their kind; tag questions remain
 * statements with a tag, as IMP-2 settled.
 *
 * Every expectation below was verified against this tree's
 * build before it was pinned.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { parse, structuralQuestionOnset } from "../src/ansci/parse";

const IDENTITY_TEXT =
  "I am AnSci. I am a small classical-AI system. I understand simple English statements and questions, and I answer from what I know, saying so when I don't.";

function replyOf(text: string): string {
  return processTurn(newSession(), text).reply;
}

test("structural onset: form, not punctuation, marks the question", () => {
  assert.equal(structuralQuestionOnset(["how", "are", "you"]), true);
  assert.equal(structuralQuestionOnset(["do", "you", "know", "my", "name"]), true);
  assert.equal(structuralQuestionOnset(["is", "it", "raining"]), true);
  assert.equal(structuralQuestionOnset(["can", "you", "hear", "me"]), true);
  assert.equal(structuralQuestionOnset(["who", "are", "you"]), true);
  assert.equal(structuralQuestionOnset(["the", "dog", "is", "black"]), false);
  assert.equal(structuralQuestionOnset(["i", "am", "in", "oklahoma"]), false);
  assert.equal(structuralQuestionOnset(["you", "are", "fine"]), false);
});

test("Q4: 'how are you' without '?' answers as its '?' twin does", () => {
  assert.equal(replyOf("how are you"), "I am fine.");
  assert.equal(replyOf("how are you"), replyOf("how are you?"));
});

test("Q5: 'do you know my name' without '?' answers from the register", () => {
  assert.equal(replyOf("do you know my name"), "No. You have not told me your name.");
  assert.equal(replyOf("do you know my name"), replyOf("do you know my name?"));
});

test("Q1–Q3, Q6: the wh pairs were already identical and stay identical", () => {
  assert.equal(replyOf("who are you"), IDENTITY_TEXT);
  assert.equal(replyOf("who are you"), replyOf("who are you?"));
  assert.equal(replyOf("where is oklahoma"), "Oklahoma is a state in south central United States.");
  assert.equal(replyOf("where is oklahoma"), replyOf("where is oklahoma?"));
  assert.equal(replyOf("what is a dog"), replyOf("what is a dog?"));
  assert.equal(replyOf("what is the weather"), replyOf("what is the weather?"));
});

test("S5 class: yes/no and how questions without '?' take the question path, not the acknowledgement", () => {
  for (const q of ["is it raining", "can you hear me", "how is the weather"]) {
    assert.notEqual(replyOf(q), "Ok. Noted.", `'${q}' must not be banked as a statement`);
    assert.equal(replyOf(q), replyOf(`${q}?`), `'${q}' must match its '?' twin`);
  }
});

test("statements do not become questions: no terminal mark needed, none invented", () => {
  assert.equal(replyOf("i am in oklahoma."), "Ok. Noted.");
  assert.equal(replyOf("i am in oklahoma"), "Ok. Noted.");
  assert.equal(replyOf("the dog is black."), "Ok. Noted.");
  assert.equal(replyOf("you are fine"), "Ok. Noted.");
});

test("tag questions remain statements with a tag (IMP-2 unchanged)", () => {
  assert.equal(replyOf("it must be a very stressful job, right?"), "Ok. Noted.");
  assert.equal(replyOf("you are coming, aren't you?"), "Ok. Noted.");
});

test("the parse itself records interrogative mood from form alone", () => {
  const parsed = parse("how are you", "en");
  const root = parsed.meaning.nodes.find((n) => n.id === parsed.meaning.rootId);
  assert.equal(root?.states?.mood, "interrogative");
  const stmt = parse("the dog is black", "en");
  const sroot = stmt.meaning.nodes.find((n) => n.id === stmt.meaning.rootId);
  assert.notEqual(sroot?.states?.mood, "interrogative");
});
