/**
 * ansci-transcript-slice2.test.ts — the know-question routing
 * (Transcript Slice 2, 2026-11-19): "do you know X?", "who am
 * i?" and "do you know my name?" answered from the place the
 * answer actually lives.
 *
 * The diagnosis these tests pin (probe report IM4/K3): there
 * was no who-am-i path — the Interlocutor register was
 * consulted for greetings and recognition but never for an
 * identity question, so "who am i?" declined at the graph
 * ("nothing on i in my notes") and "do you know my name?"
 * declined as graph knowledge, for facts whose true location
 * is the conversation's own register. Slice 1 then made the
 * embedded forms parse, and assessment's loose self-query
 * reading (any predicated-as edge, a "you" anywhere, a
 * question word anywhere) answered "do you know who i am?"
 * and "do you know what a dog is?" with the system's own
 * identity. Every expectation below was verified against
 * this tree's build before it was pinned.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";

const IDENTITY_TEXT =
  "I am AnSci. I am a small classical-AI system. I understand simple English statements and questions, and I answer from what I know, saying so when I don't.";

function turn(session: ReturnType<typeof newSession>, text: string) {
  return processTurn(session, text);
}

test("probe 3: 'who am i?' answers from the Interlocutor register, not the graph", () => {
  const { reply, trace } = turn(newSession(), "who am i?");
  assert.equal(reply, "You have not told me who you are.");
  assert.equal(trace.declineReason, undefined, "no decline: the register answers");
  assert.equal(trace.recordAnswer?.source, "self-fact");
  assert.match(trace.planNote ?? "", /Interlocutor register/);
});

test("probe 4: 'do you know my name?' answers from the register — the name has not been told", () => {
  const { reply, trace } = turn(newSession(), "do you know my name?");
  assert.equal(reply, "No. You have not told me your name.");
  assert.equal(trace.declineReason, undefined);
  assert.match(trace.planNote ?? "", /Interlocutor register/);
});

test("probe 1: 'do you know who i am?' is routed to the register, not the self path", () => {
  const { reply, trace } = turn(newSession(), "do you know who i am?");
  assert.equal(reply, "No. You have not told me who you are.");
  assert.notEqual(reply, IDENTITY_TEXT);
  assert.match(trace.planNote ?? "", /Interlocutor register/);
});

test("the learned name: a stated name is the register's answer to all three identity forms", () => {
  const session = newSession();
  // The established self-naming form (Social Unit S6/C6): the
  // name is learned as stated, capitalised form retained.
  const naming = turn(session, "my name is Sam.");
  assert.equal(naming.reply, "Ok. Noted, Sam.");
  assert.equal(session.interlocutor.identity?.name, "Sam");
  assert.equal(turn(session, "who am i?").reply, "You are Sam.");
  assert.equal(turn(session, "do you know my name?").reply, "Yes. Your name is Sam.");
  assert.equal(turn(session, "do you know who i am?").reply, "Yes. You are Sam.");
  // The X4 name-value reader agrees, unchanged.
  assert.equal(turn(session, "what is my name?").reply, "Your name is Sam.");
});

test("probe 8: 'do you know what a dog is?' declines located at 'dog', not with the system's identity", () => {
  const { reply, trace } = turn(newSession(), "do you know what a dog is?");
  assert.equal(reply, "I can't answer that from what I know: nothing in what I know says what a dog is.");
  assert.notEqual(reply, IDENTITY_TEXT);
  assert.match(trace.declineReason ?? "", /located at 'dog'/);
});

test("the embedded what-is answers about a grounded entity from its record", () => {
  const { reply, trace } = turn(newSession(), "do you know what oklahoma is?");
  assert.equal(reply, "Yes. Oklahoma is a state in south central United States.");
  assert.equal(trace.entityAnswer?.synsetId, "wn-n09295833");
});

test("the embedded what-is declines located at an unheld subject", () => {
  const { reply, trace } = turn(newSession(), "do you know what a cat is?");
  assert.equal(reply, "I can't answer that from what I know: nothing in what I know says what a cat is.");
  assert.match(trace.declineReason ?? "", /located at 'cat'/);
});

test("assessment: a complement predication of the visitor is not a self-query; a predication of 'you' still is", () => {
  const session = newSession();
  const embedded = turn(session, "do you know who i am?");
  assert.notEqual(embedded.trace.semanticObjects?.[0]?.kind, "self-query");
  const direct = turn(newSession(), "who are you?");
  assert.equal(direct.reply, IDENTITY_TEXT);
  // The embedded self form keeps the identity answer: there
  // the predication genuinely is of the system.
  assert.equal(turn(newSession(), "do you know who you are?").reply, IDENTITY_TEXT);
});

test("probe 2, settled by the goal transcript: 'what do you know?' answers from the Self tables", () => {
  const { reply, trace } = turn(newSession(), "what do you know?");
  assert.match(reply, /^I am AnSci\. I can talk over simple statements and questions\./);
  assert.equal(trace.declineReason, undefined);
});

test("controls unchanged: probes 5, 6, 7, 20 and the NP know forms", () => {
  const cases: [string, string][] = [
    ["what can you do?", "I can talk over simple statements and questions. I remember what this conversation has established. I can explain what I based an answer on, in plain terms. My knowledge is small and fixed."],
    ["who are you?", IDENTITY_TEXT],
    ["do you know where oklahoma is?", "I can't answer that from what I know: I have oklahoma as a state in south central United States, but nothing in what I know answers that."],
    ["how are you?", "I am fine."],
    ["do you know dogs?", "I can't answer that from what I know: I have nothing on dogs in what I know."],
    ["do you know the answer?", "I can't answer that from what I know: I have nothing on answer in what I know."],
    ["who do you know?", "I can't answer that from what I know: nothing you have told me says what was known."],
    ["do you remember my name?", "No. You have not told me your name."],
  ];
  for (const [input, expected] of cases) {
    assert.equal(turn(newSession(), input).reply, expected, input);
  }
});
