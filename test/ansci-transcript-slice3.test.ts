/**
 * ansci-transcript-slice3.test.ts — the your-NP matter fix
 * (Transcript Slice 3, 2026-11-19): a your-NP self-fact
 * question files the possessed NP's HEAD noun as its
 * matter, and a modified name NP answers from the Identity
 * table's one name.
 *
 * The diagnosis these tests pin (probe report IM1, with
 * SD3): assessment's your-NP shape (C3 shape (d)) read its
 * matter positionally as the token after "your", because
 * the graph drops the possessed noun. In a two-word NP
 * that token is the modifier, not the head, so "what is
 * your last name?" filed the matter "last" and the turn
 * layer's hand denial template spoke it as a noun: "I
 * don't have a last." — probe 16; probe 17 ("first name")
 * the same. Only the exact token "name" routed to
 * identity (probe 18). Every expectation below was
 * verified against this tree's build before it was pinned.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";

const IDENTITY_TEXT =
  "I am AnSci. I am a small classical-AI system. I understand simple English statements and questions, and I answer from what I know, saying so when I don't.";
// MINIMAL / DRAFT wording (Slice 3): the mechanism's
// truthful form only — the Identity table holds one name,
// undivided. The final visitor-facing wording of Self
// facts is the owner's to settle.
const NAME_PART_TEXT = "I have only the one name, AnSci.";

function turn(session: ReturnType<typeof newSession>, text: string) {
  return processTurn(session, text);
}

function person(session: ReturnType<typeof newSession>) {
  return session.objects.filter((o) => o.producer === "person");
}

test("probe 16: 'what is your last name?' answers from the Identity table's one name", () => {
  const session = newSession();
  const { reply, trace } = turn(session, "what is your last name?");
  assert.equal(reply, NAME_PART_TEXT);
  assert.notEqual(reply, "I don't have a last.");
  assert.equal(trace.declineReason, undefined, "no decline: the Identity table answers");
  assert.match(trace.planNote ?? "", /Identity table holds one name/);
  // The matter filed is the NP's head noun, not the modifier.
  assert.equal(person(session)[0].act.kind, "self-query");
  assert.equal(person(session)[0].act.selfQuery, "fact");
  assert.equal(person(session)[0].act.selfFact, "name");
});

test("probe 17: 'what is your first name?' answers to the same standard", () => {
  const session = newSession();
  const { reply } = turn(session, "what is your first name?");
  assert.equal(reply, NAME_PART_TEXT);
  assert.notEqual(reply, "I don't have a first.");
  assert.equal(person(session)[0].act.selfFact, "name");
});

test("the name-part answer is general over modifiers, not a first/last special case", () => {
  for (const input of ["what is your middle name?", "what is your full name?"]) {
    const session = newSession();
    assert.equal(turn(session, input).reply, NAME_PART_TEXT, input);
    assert.equal(person(session)[0].act.selfFact, "name", input);
  }
});

test("probe 18 unchanged: 'what is your name?' routes to the identity answer", () => {
  const session = newSession();
  const { reply } = turn(session, "what is your name?");
  assert.equal(reply, IDENTITY_TEXT);
  assert.equal(person(session)[0].act.selfQuery, "identity");
});

test("control: the one-word your-NP keeps its denial, naming the possessed noun", () => {
  const session = newSession();
  const { reply } = turn(session, "What is your rank?");
  assert.equal(reply, "I don't have a rank.");
  assert.equal(person(session)[0].act.selfFact, "rank");
});

test("control: a longer your-NP denial names the head noun, not the modifier", () => {
  const session = newSession();
  const { reply } = turn(session, "what is your favourite colour?");
  assert.equal(reply, "I don't have a colour.");
  assert.equal(person(session)[0].act.selfFact, "colour");
});

test("controls unchanged: probes 5, 6 and 20", () => {
  const cases: [string, string][] = [
    ["what can you do?", "I can talk over simple statements and questions. I remember what this conversation has established. I can explain what I based an answer on, in plain terms. My knowledge is small and fixed."],
    ["who are you?", IDENTITY_TEXT],
    ["how are you?", "I am fine."],
  ];
  for (const [input, expected] of cases) {
    assert.equal(turn(newSession(), input).reply, expected, input);
  }
});
