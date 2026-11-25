/**
 * ansci-goal-transcript.test.ts — the six-turn acceptance
 * transcript from the session goal: greeting, self-name,
 * self-location, time, weather, and knowledge inventory.
 * Each turn is answered from its owning subsystem (Identity /
 * Place tables, the wired clock, the weather place chain, the
 * Capabilities table and conversation record), never from a
 * string matched to the question. Fixture clocks and the
 * configured-place table stand in for deployment wiring; no
 * test reads the real clock or touches the network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { FixtureClockSource } from "../src/ansci/timekeeping";
import { PLACE } from "../src/ansci/place";

function clockedSession(): Session {
  const clock = new FixtureClockSource("fixture clock", "UTC");
  clock.set("2026-11-20T15:04:05.000Z");
  return newSession(undefined, undefined, { clockSource: clock, clockRetrievedFrom: "fixture" });
}

function actOf(text: string) {
  const s = newSession();
  processTurn(s, text);
  return s.objects.find((o) => o.producer === "person")!.act;
}

test("addressee possessive: 'do you know your name?' is an identity self-query", () => {
  const s = newSession();
  assert.equal(actOf("do you know your name?").selfQuery, "identity");
  const { reply, trace } = processTurn(s, "do you know your name?");
  assert.match(reply, /AnSci/);
  assert.equal(trace.declineReason, undefined);
});

test("the possessive routing is by structure, not wording: other verbs and heads route the same way", () => {
  const s = newSession();
  assert.equal(actOf("can you tell me your name?").selfQuery, "identity");
  assert.equal(actOf("do you know your age?").selfQuery, "fact");
  const { reply } = processTurn(newSession(), "can you tell me your name?");
  assert.match(reply, /AnSci/);
});

test("'what do you know?' is a knowledge self-query answered from the Self tables", () => {
  const s = newSession();
  assert.equal(actOf("what do you know?").selfQuery, "knowledge");
  const { reply, trace } = processTurn(s, "what do you know?");
  assert.match(reply, /AnSci/);
  assert.match(reply, /I can talk over simple statements and questions\./);
  assert.equal(trace.declineReason, undefined);
});

test("a know-question about a topic is not captured as a knowledge inventory", () => {
  const s = newSession();
  assert.notEqual(actOf("what do you know about dogs?").selfQuery, "knowledge");
});

test("the knowledge answer names what the conversation has established, and no question-word states", () => {
  const s = newSession();
  processTurn(s, "the soup is hot.");
  const { reply } = processTurn(s, "what do you know?");
  assert.match(reply, /soup is hot/);
  assert.doesNotMatch(reply, /is what/);
});

test("wh-determiner time: 'what time is it?' answers from the wired clock", () => {
  const s = clockedSession();
  const { reply, trace } = processTurn(s, "what time is it?");
  assert.equal(reply, "It is 3:04 PM.");
  assert.equal(trace.timeAnswer?.route, "clock");
  assert.equal(trace.declineReason, undefined);
});

test("wh-determiner date: 'what day is it?' answers from the wired clock", () => {
  const s = clockedSession();
  const { reply, trace } = processTurn(s, "what day is it?");
  assert.equal(reply, "The date is November 20, 2026.");
  assert.equal(trace.timeAnswer?.asked, "date");
});

test("a question establishes no place: 'where are you?' does not poison the weather place", () => {
  const s = newSession();
  processTurn(s, "where are you?");
  const { trace } = processTurn(s, "what is the weather?");
  // The place in force is the default seat, not "Where".
  assert.equal(trace.weather?.action, "lookup-needed");
  assert.match(trace.weather?.place ?? "", /Oklahoma City/);
});

test("a stated residence still establishes the weather place", () => {
  const s = newSession();
  processTurn(s, "I live in Oklahoma.");
  const { trace } = processTurn(s, "what is the weather?");
  assert.equal(trace.weather?.action, "lookup-needed");
  assert.match(trace.weather?.place ?? "", /oklahoma/i);
});

test("self-location answers from the default place, and a configured place replaces it", () => {
  const byDefault = processTurn(newSession(), "where are you?");
  assert.equal(byDefault.reply, "I am in Oklahoma City, OK.");
  assert.equal(byDefault.trace.declineReason, undefined);

  const saved = PLACE.place;
  PLACE.place = "Chicago";
  try {
    const { reply, trace } = processTurn(newSession(), "where are you?");
    assert.equal(reply, "I am in Chicago.");
    assert.equal(trace.declineReason, undefined);
  } finally {
    PLACE.place = saved;
  }
});

test("the goal transcript, in sequence, on a clocked session", () => {
  const s = clockedSession();
  assert.equal(processTurn(s, "hello").reply, "Hello.");
  assert.match(processTurn(s, "do you know your name?").reply, /AnSci/);
  assert.equal(processTurn(s, "where are you?").reply, "I am in Oklahoma City, OK.");
  assert.equal(processTurn(s, "what time is it?").reply, "It is 3:04 PM.");
  assert.equal(processTurn(s, "what is the weather?").trace.weather?.place, "Oklahoma City, OK");
  const knowledge = processTurn(s, "what do you know?");
  assert.match(knowledge.reply, /AnSci/);
  assert.equal(knowledge.trace.declineReason, undefined);
});
