/**
 * ansci-sbd-veto.test.ts — the Wink SBD veto (2026-11-22): the
 * narrow hybrid that followed the stopped Wink-primary routing
 * slice. The agreement audit (scripts/ansci-wink-sbd-agreement
 * .mjs, 149 texts) showed the regex splitter and Wink each
 * demonstrably right where they differ — Wink on abbreviations,
 * the regex on a fragment followed by a lowercase interrogative
 * (Wink absorbs the question and the enquiry dies). So the
 * regex stays primary and Wink is consulted only to VETO a
 * boundary: a boundary is rejoined only when Wink places no
 * sentence boundary there AND the left segment ends
 * abbreviation-shaped. These tests pin the turn-level contract:
 * abbreviation turns compose whole, the class (b) turns compose
 * exactly as at baseline, and with the provider off
 * (ANSCI_WINK=off) the segmentation is the pre-veto behaviour,
 * byte for byte.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn, splitTurnSegments } from "../src/ansci/turn";
import { winkAvailable, winkSentences } from "../src/ansci/wink";

test("SBD veto: an abbreviation turn composes the name's sentence whole, both segments taken up", (t) => {
  if (!winkAvailable()) return t.skip("wink not installed (recorded dependency)");
  const s = newSession();
  const r = processTurn(s, "Dr. Smith booked a room. He was kind.");
  assert.deepEqual(
    r.trace.segmented?.map((x) => x.segment),
    ["Dr. Smith booked a room.", "He was kind."],
  );
  assert.match(r.trace.planNote ?? "", /Wink SBD veto rejoined 1 segmentation boundary/);
  assert.match(r.trace.planNote ?? "", /"Dr\."/);
});

test("SBD veto: the initialism turn rejoins both fragments of 'U.S.'", (t) => {
  if (!winkAvailable()) return t.skip("wink not installed (recorded dependency)");
  const s = newSession();
  const r = processTurn(s, "The U.S. team arrived. They stayed.");
  assert.deepEqual(
    r.trace.segmented?.map((x) => x.segment),
    ["The U.S. team arrived.", "They stayed."],
  );
  assert.match(r.trace.planNote ?? "", /Wink SBD veto rejoined 2 segmentation boundaries/);
});

test("SBD veto: two titles in one sentence rejoin, and no segment is dropped", (t) => {
  if (!winkAvailable()) return t.skip("wink not installed (recorded dependency)");
  const s = newSession();
  const r = processTurn(s, "Mr. Jones and Mrs. Lee arrived. They booked rooms.");
  // At baseline this turn segmented into four pieces and one
  // ("Jones and Mrs.") was skipped as unparseable — 3 of 4
  // taken up. The veto leaves two whole sentences, both taken.
  assert.deepEqual(
    r.trace.segmented?.map((x) => x.segment),
    ["Mr. Jones and Mrs. Lee arrived.", "They booked rooms."],
  );
  assert.match(r.trace.planNote ?? "", /2 of 2 sentence segments were taken as their own acts/);
});

test("SBD veto: the veto reaches the unpunctuated tail (no terminal stop to split on)", (t) => {
  if (!winkAvailable()) return t.skip("wink not installed (recorded dependency)");
  assert.deepEqual(splitTurnSegments("I met Dr. Smith yesterday"), ["I met Dr. Smith yesterday"]);
});

test("SBD veto: the phatic turn composes exactly as at baseline — Wink's merge is not adopted", (t) => {
  if (!winkAvailable()) return t.skip("wink not installed (recorded dependency)");
  const s = newSession();
  const r = processTurn(s, "hey, just got in. how's it going?");
  assert.equal(r.reply, "Hey. I am fine.");
  assert.deepEqual(
    r.trace.segmented?.map((x) => x.segment),
    ["hey.", "just got in.", "how's it going?"],
  );
  assert.doesNotMatch(r.trace.planNote ?? "", /SBD veto/);
});

test("SBD veto: the fragment + lowercase-question family keeps the regex boundary", (t) => {
  if (!winkAvailable()) return t.skip("wink not installed (recorded dependency)");
  assert.deepEqual(splitTurnSegments("just got in. how is it going?"), [
    "just got in.",
    "how is it going?",
  ]);
});

test("SBD veto: the demonstrated multi-sentence failure turn is unchanged", () => {
  const s = newSession();
  const r = processTurn(s, "I booked a room. It was expensive.");
  assert.deepEqual(
    r.trace.segmented?.map((x) => x.segment),
    ["I booked a room.", "It was expensive."],
  );
  assert.equal(r.reply, "Ok. Noted. Ok. It is expensive. You told me you book the room.");
  assert.doesNotMatch(r.trace.planNote ?? "", /SBD veto/);
});

test("SBD veto fallback: with the provider off, segmentation is the pre-veto behaviour byte for byte", () => {
  process.env.ANSCI_WINK = "off";
  try {
    assert.equal(winkSentences("Dr. Smith booked a room. He was kind."), undefined);
    // The abbreviation splits the veto exists to repair are back.
    assert.deepEqual(splitTurnSegments("Dr. Smith booked a room. He was kind."), [
      "Dr.",
      "Smith booked a room.",
      "He was kind.",
    ]);
    assert.deepEqual(splitTurnSegments("The U.S. team arrived. They stayed."), [
      "The U.",
      "S.",
      "team arrived.",
      "They stayed.",
    ]);
    // IMP-1's missing-space case stands as it always has.
    assert.deepEqual(splitTurnSegments("My dog is a chihuahua.It'll sleep now. It is small."), [
      "My dog is a chihuahua.",
      "It'll sleep now.",
      "It is small.",
    ]);
  } finally {
    delete process.env.ANSCI_WINK;
  }
  assert.ok(winkAvailable(), "provider restored once the switch is removed");
});
