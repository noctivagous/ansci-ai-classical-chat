/**
 * ansci-probe2-slice5.test.ts — time/date shapes from the
 * frame (Probe-2 Slice 5, 2026-11-20; diagnostic SD4,
 * first half).
 *
 * The Situation frame (§8.1) held the readings all along —
 * supplied month/day/hour, season, daypart — and no reply
 * site read them, so "what is the time?" and "what is the
 * date?" died at branches built for other problems. The
 * shape now claims them at the predication dispatch: with
 * a frame, it answers FROM the frame (the hour it holds,
 * stated as "about" — the frame holds no minutes; the
 * month and day it holds — the frame holds no year);
 * without one, it declines located at the missing clock
 * reading. Never "The time is what."
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";

test("V5 with a supplied frame answers from it: hour 14 → 'It is about 2 PM.'", () => {
  const s = newSession(undefined, { month: 11, day: 20, hour: 14 });
  const { reply, trace } = processTurn(s, "what is the time now?");
  assert.equal(reply, "It is about 2 PM.");
  assert.equal(trace.timeAnswer?.asked, "time");
  assert.equal(trace.timeAnswer?.supplied?.hour, 14);
});

test("V6 with a supplied frame answers from it: month 11, day 20 → 'The date is November 20.'", () => {
  const s = newSession(undefined, { month: 11, day: 20, hour: 14 });
  const { reply, trace } = processTurn(s, "what is the date?");
  assert.equal(reply, "The date is November 20.");
  assert.equal(trace.timeAnswer?.asked, "date");
});

test("the day variant takes the date shape", () => {
  const s = newSession(undefined, { month: 1, day: 5, hour: 9 });
  const { reply } = processTurn(s, "what is the day?");
  assert.equal(reply, "The date is January 5.");
});

test("frame-less, V5 declines located at the missing clock — never a vacuous completion", () => {
  const { reply, trace } = processTurn(newSession(), "what is the time now?");
  assert.equal(
    reply,
    "I can't answer that from what I know: this conversation has no clock reading — I wasn't given the time when we started.",
  );
  assert.match(trace.declineReason ?? "", /missing clock reading/);
  assert.equal(trace.timeAnswer?.asked, "time");
});

test("frame-less, V6 declines located at the missing clock", () => {
  const { reply, trace } = processTurn(newSession(), "what is the date?");
  assert.equal(
    reply,
    "I can't answer that from what I know: this conversation has no clock reading — I wasn't given the date when we started.",
  );
  assert.equal(trace.timeAnswer?.asked, "date");
});

test("a frame with an hour but no calendar: time answers, date declines at the missing calendar reading", () => {
  const s = newSession(undefined, { hour: 9 });
  assert.equal(processTurn(s, "what is the time?").reply, "It is about 9 AM.");
  const s2 = newSession(undefined, { hour: 9 });
  const { reply, trace } = processTurn(s2, "what is the date?");
  assert.match(reply, /no calendar day/);
  assert.match(trace.declineReason ?? "", /missing calendar reading/);
});

test("an of-phrase time noun is not this shape: 'what is the time of the meeting?' keeps its ordinary route", () => {
  const { reply, trace } = processTurn(newSession(), "what is the time of the meeting?");
  assert.equal(trace.timeAnswer, undefined);
  assert.match(reply, /^I can't answer that from what I know: /);
});
