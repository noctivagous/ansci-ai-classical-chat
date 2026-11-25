/**
 * ansci-probe2-slice4.test.ts — the unanchored-definite
 * scope correction (Probe-2 Slice 4, 2026-11-20; diagnostic
 * SD2 + IM3).
 *
 * The branch ("What X? You just started talking.") fired on
 * every definite subject with no scene referent, no
 * classification and no graph node — including questions a
 * downstream shape exists to claim. It now stands down when
 * the question itself carries the anchor: an of-phrase
 * ("the capital of Oklahoma" — its referent is relational,
 * fixed by the of-object), or a time word as subject lemma
 * ("now" in "what is the weather now?" — IM3's misfire: a
 * moment asked after as if it were a thing). The entity
 * answer stands down on the same ground: predicating the
 * head noun's gloss (for "capital", the extract's gloss is
 * Marx's book) does not answer a relational question.
 *
 * Ownership note: "what is the weather?" still clarifies at
 * THIS slice — Slice 6 owns moving it to the weather shape,
 * and its acceptance is stated there. Time/date questions
 * decline at the knowledge routes at this slice; Slice 5
 * owns their frame shape.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { PLACE } from "../src/ansci/place";

/** Run with no configured seat (the default is Oklahoma
 *  City, OK now): the place-gap standing these tests pin. */
function withNoSeat<T>(fn: () => T): T {
  const saved = PLACE.place;
  PLACE.place = null;
  try {
    return fn();
  } finally {
    PLACE.place = saved;
  }
}

test("V8: 'what is the capital of oklahoma?' reaches the knowledge — it declines there, not at the referent branch", () => {
  const { reply, trace } = processTurn(newSession(), "what is the capital of oklahoma?");
  assert.match(reply, /^I can't answer that from what I know: /);
  assert.equal(trace.unanchoredDefinite, undefined);
  assert.equal(trace.unanchoredStandDown?.lemma, "capital");
});

test("the of-phrase class generally: 'what is the population of chicago?' declines at the knowledge", () => {
  const { reply, trace } = processTurn(newSession(), "what is the population of chicago?");
  assert.match(reply, /^I can't answer that from what I know: /);
  assert.equal(trace.unanchoredStandDown?.lemma, "population");
});

test("IM3: 'now' is not asked after as a referent — W2 stood down at this slice; Slice 6's weather shape now claims it earlier still", () => {
  // Superseded by Probe-2 Slice 6: the weather shape
  // intercepts the question before answerPredicateQuestion,
  // so no stand-down is recorded — the IM3 guarantee (never
  // asked after 'now') is now kept by the earlier claim.
  const { reply, trace } = withNoSeat(() => processTurn(newSession(), "what is the weather now?"));
  assert.ok(!reply.startsWith("What now?"));
  assert.equal(trace.weather?.action, "place-gap");
  assert.equal(trace.unanchoredDefinite, undefined);
});

test("IM3 for V5: 'what is the time now?' never reaches the branch — Slice 5's frame shape claims it first", () => {
  // Superseded by Probe-2 Slice 5, which intercepts the
  // time ask before answerPredicateQuestion runs at all.
  const { reply, trace } = processTurn(newSession(), "what is the time now?");
  assert.ok(!reply.startsWith("What now?"));
  assert.equal(trace.timeAnswer?.asked, "time");
  assert.equal(trace.unanchoredDefinite, undefined);
});

test("time-word subjects: 'what is the date?' is Slice 5's now — the frame shape, not this branch, owns it", () => {
  // Was this slice's stand-down pin; Slice 5 intercepts the
  // date ask upstream, so the assertion is the shape's.
  const { reply, trace } = processTurn(newSession(), "what is the date?");
  assert.ok(!reply.startsWith("What date?"));
  assert.equal(trace.timeAnswer?.asked, "date");
});

test("legitimate scope kept: a bare definite with no referent, classification, anchor or shape still clarifies", () => {
  const cases: Record<string, string> = {
    "what is the answer?": "What answer? You just started talking.",
    "who is the president?": "What president? You just started talking.",
    "what is the table?": "What table? You just started talking.",
  };
  for (const [input, expected] of Object.entries(cases)) {
    const { reply, trace } = processTurn(newSession(), input);
    assert.equal(reply, expected, input);
    assert.equal(trace.unanchoredStandDown, undefined, input);
  }
});

test("ownership: 'what is the weather?' clarified at this slice — Slice 6 has since routed it to the weather shape", () => {
  // Superseded by Probe-2 Slice 6: the weather shape claims
  // the question upstream of this branch, and with no place
  // standing the reply names the place gap.
  const { reply, trace } = withNoSeat(() => processTurn(newSession(), "what is the weather?"));
  assert.equal(reply, "I don't know where you are, so I can't say what the weather is like there.");
  assert.equal(trace.weather?.action, "place-gap");
});

test("a classified kind used definitely is untouched: 'is the salt cold?' still answers from the classification", () => {
  const { reply } = processTurn(newSession(), "is the salt cold?");
  assert.equal(reply, "The salt is cold.");
});
