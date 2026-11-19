/**
 * fork-discourse-wiring.test.ts — DR-2 of the discourse/uptake
 * programme (2026-11-19): the Discourse Record reader's
 * consultees wired. The reader never speaks; each test pins a
 * CONSULTEE's behaviour changed by consulting it:
 *
 *  (i) receipts — X1's link renders a topic history's salient
 *      spine (the topic WITH its events) where a history
 *      exists; the lemma legs remain the fallback;
 *  (ii) the initiative scan — movements ground standing-feeling
 *      candidates, and topic-return grounds are ranked by the
 *      reader's salience within their shape;
 *  (iii) the Planner — pointer-carrying histories served as a
 *      priced source (plan.ts's historySource), exercised here
 *      through the receipt link's spine pointers;
 *  (iv) closings — the farewell carries the reader's
 *      top-ranked standing fact where one stands salient.
 *
 * Standing law throughout: only what the record holds, under
 * the same soundness admissions the consultees already pass;
 * a serving that fails admission stands down to the prior
 * behaviour whole.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/fork/session";
import { processTurn, type TurnResult } from "../src/fork/turn";

function run(session: Session, texts: string[]): TurnResult[] {
  return texts.map((t) => processTurn(session, t));
}

test("DR-2 (i): the receipt link renders the leg's history spine — the topic WITH its events (P-036's shape)", () => {
  const s = newSession();
  const results = run(s, [
    "Hello.",
    "I hurt my leg.",
    "I stopped the weightlifting.",
    "I rested my leg.",
    "The garden is cold.",
    "My leg is sore.",
  ]);
  // Before DR-2 the link was lemma-grade: at best the single
  // latest event ("You told me you hurted the leg.") or the
  // bare topic sentence. The history spine carries the topic
  // with its earliest and latest events, and the trace names
  // the ledger pointers the spine was served from.
  assert.equal(
    results[5].reply,
    "Ok. Your leg is sore. We were talking about the leg. You told me you hurted the leg. You told me you rested the leg.",
  );
  assert.equal(results[5].trace.recognition?.link?.kind, "topic");
  assert.deepEqual(results[5].trace.recognition?.link?.spine, ["topic:0", "event:0", "event:2"]);
});

test("DR-2 (i): a thin history falls back to the lemma legs exactly", () => {
  const s = newSession();
  const results = run(s, ["Hello.", "I hurt my leg.", "The garden is cold.", "My leg is sore."]);
  // One earlier item only — no spine qualifies, and the
  // single-event leg answers as X1 built it.
  assert.equal(results[3].reply, "Ok. Your leg is sore. You told me you hurted the leg.");
  assert.equal(results[3].trace.recognition?.link?.kind, "event");
  assert.equal(results[3].trace.recognition?.link?.spine, undefined);
});

test("DR-2 (ii): a feeling movement grounds a standing-feeling move its head's origin bars from shape (c)", () => {
  const s = newSession();
  const results = run(s, [
    "Hello.",
    "I am worried.",
    "I am not worried.",
    "I am worried.",
    "I am scared.",
    "The garden is cold.",
    "The soup is hot.",
  ]);
  // 'scared' is a CLASSIFIED feeling: shape (c) reads only
  // non-classified origins, and shape (a) does not claim it
  // here. What grounds the move is the movement — worried →
  // not worried → worried → scared — whose standing head is
  // 'scared', served by the reader (stateMovements).
  assert.equal(results[6].trace.initiative?.shape, "standing-feeling");
  assert.equal(results[6].trace.initiative?.state?.lemma, "scared");
  assert.equal(results[6].reply, "Ok. The soup is hot. You are scared.");
});

test("DR-2 (ii): topic-return grounds are ranked by salience within their shape", () => {
  const s = newSession();
  const results = run(s, [
    "Hello.",
    "I am worried.",
    "My daughter is Roxie.",
    "I called my son.",
    "My son is tall.",
    "It is raining.",
    "The winter is long.",
    "It is raining.",
    "The garden is cold.",
    "It is raining.",
  ]);
  // Two topic returns stand eligible at the last turn: the
  // daughter's (ground turn 3, one history item — salience
  // ~1.25) and the son's (ground turn 5, an event and a
  // state — salience ~2.33). Ground order alone would take
  // the daughter's first; the reader's ranking takes the
  // son's. (The worried state's priced move at turn 5 and
  // the five-turn bound are what let both grounds stand
  // eligible together.)
  assert.equal(results[9].trace.initiative?.shape, "topic-return");
  assert.equal(results[9].trace.initiative?.state?.holder, "son");
  assert.equal(results[9].reply, "Ok. The son is tall.");
});

test("DR-2 (iv): the closing carries the record's top-ranked standing fact (P-068's shape)", () => {
  const s = newSession();
  const results = run(s, [
    "Hello.",
    "My daughter is Roxie.",
    "I called my daughter.",
    "My daughter is tall.",
    "The garden is cold.",
    "Goodbye.",
  ]);
  assert.equal(results[5].reply, "Goodbye. The daughter is tall.");
  assert.equal(results[5].trace.closingFact?.topic, "daughter");
  assert.equal(results[5].trace.closingFact?.stateLemma, "tall");
});

test("DR-2 (iv): a thin record closes with the mirror alone", () => {
  const s = newSession();
  const results = run(s, ["Hello.", "My daughter is Roxie.", "Goodbye."]);
  assert.equal(results[2].reply, "Goodbye.");
  assert.equal(results[2].trace.closingFact, undefined);
});
