/**
 * ansci-recognition-programme.test.ts — the recognition
 * programme (2026-11-19): the conversation's registers learn
 * to speak — answers and receipts drawn from the record the
 * conversation itself established, attributed as from the
 * record, under the same testimony discipline as every other
 * source. Commissioned from the sealed probe run 2 record
 * (GAPS §2): bars 4, 5 and 9 stand on their negative halves —
 * the recognition layer is what was unbuilt.
 *
 * R1 — record-first answering: the conversation record is
 * the FIRST source in the answering order. A question the
 * record answers is answered from it (a told event under
 * "You told me", the established topic, the speaker's
 * standing feeling, and — through the record's own grain —
 * the R7.5 record answers for the speaker's self-questions);
 * a question the record does not answer keeps its decline,
 * with the record's absence as part of its honesty.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/ansci/session";
import { processTurn, type TurnResult } from "../src/ansci/turn";

function run(session: Session, texts: string[]): TurnResult[] {
  return texts.map((t) => processTurn(session, t));
}

test("R1: a question over a told event is answered from the record, attributed as a telling", () => {
  const s = newSession();
  const [, q] = run(s, ["I put the salt in the soup.", "What did you put in the soup?"]);
  assert.equal(q.reply, "You told me you put the salt in the soup.");
  assert.equal(q.trace.recordAnswer?.source, "event");
  assert.equal(q.trace.recordAnswer?.event?.filler, "salt");
  assert.equal(q.trace.declineReason, undefined, "no decline stands beside a record answer");
});

test("R1: the record answer names the role that was asked, from the event that fills it", () => {
  const s = newSession();
  const [, q] = run(s, ["I put the salt in the soup.", "Where did you put the salt?"]);
  assert.equal(q.reply, "You told me you put the salt in the soup.");
  assert.equal(q.trace.recordAnswer?.event?.role, "theme", "the role as the question's own query record draws it");
});

test("R1: a role the record does not fill keeps its missing-role decline", () => {
  const s = newSession();
  const [q] = run(s, ["What did you put in the soup?"]);
  assert.match(q.reply, /nothing you have told me says what was put in the soup/);
  assert.equal(q.trace.recordAnswer, undefined);
  const s2 = newSession();
  const [, q2] = run(s2, ["I put the salt in the soup.", "What did I tell you?"]);
  assert.equal(q2.trace.recordAnswer, undefined, "no tell event stands in the record — nothing is invented to answer with");
  assert.match(q2.reply, /nothing you have told me says/);
});

test("R1: the speaker's own predicate question is answered from the record, in the record's grain", () => {
  const s = newSession();
  const [, q] = run(s, ["I am worried about the exam.", "Am I worried?"]);
  assert.equal(q.reply, "You are worried.");
  assert.ok(q.trace.answeredFromRecord, "the R7.5 record answer, reached through the grain");
  assert.equal(
    s.states.filter((st) => st.holder === "you" && st.lemma === "worried").length,
    1,
    "the question's own recording of the asked quality is set aside — no duplicate stands",
  );
});

test("R1: 'How do I feel?' is answered from the standing feeling state", () => {
  const s = newSession();
  const [, q] = run(s, ["I am worried about the exam.", "How do I feel?"]);
  assert.equal(q.reply, "You are worried.");
  assert.equal(q.trace.recordAnswer?.source, "feeling");
  assert.equal(q.trace.recordAnswer?.state?.lemma, "worried");
});

test("R1: 'How do I feel?' with no feeling told keeps the shape decline — the record is not mined for a near miss", () => {
  const s = newSession();
  const [q] = run(s, ["How do I feel?"]);
  assert.equal(q.trace.recordAnswer, undefined);
  assert.match(q.reply, /^I can't answer that from what I know/);
  const s2 = newSession();
  const [, q2] = run(s2, ["The soup is hot.", "How do I feel?"]);
  assert.equal(q2.trace.recordAnswer, undefined, "a third party's state is not the speaker's feeling");
});

test("R1: a topic question is answered from the Topic records", () => {
  const s = newSession();
  const [, q] = run(s, ["The soup is hot.", "What were we talking about?"]);
  assert.equal(q.reply, "We were talking about the soup.");
  assert.equal(q.trace.recordAnswer?.source, "topic");
  assert.equal(q.trace.recordAnswer?.topic, "soup");
});

test("R1: a topic question with nothing established keeps its decline", () => {
  const s = newSession();
  const [q] = run(s, ["What were we talking about?"]);
  assert.equal(q.trace.recordAnswer, undefined);
  assert.match(q.reply, /nothing you have told me says what was talked/);
});

test("R1: the record answers do not disturb the graph's own answers", () => {
  const s = newSession();
  const [, q] = run(s, ["The soup is hot.", "Is the soup hot?"]);
  assert.equal(q.reply, "You said so.", "the said-so answer stands as it was");
  const s2 = newSession();
  const [w] = run(s2, ["Why is winter cold?"]);
  assert.equal(w.trace.recordAnswer, undefined, "a derivation question is not a record question");
});

/* R2 — recognition receipts: where a statement turn's reply
 * would be the bare "Ok." and the turn established something
 * the registers hold — a predicated state, an event with its
 * object filled — the receipt shows what was retained, in
 * the record's own rendering. The bare form stands where
 * nothing qualifies: the first turn, the naming turn (C6's
 * recognition is the name), a negated telling, a verb-carried
 * state, an objectless event, a quantity-bearing telling. */

test("R2: a state telling after the first turn is receipted with the state it established", () => {
  const s = newSession();
  const [, r] = run(s, ["The winter is cold.", "The garden is cold."]);
  assert.equal(r.reply, "Ok. The garden is cold.");
  assert.equal(r.trace.recognition?.kind, "state");
});

test("R2: an event telling is receipted with the recorded event", () => {
  const s = newSession();
  const [, r] = run(s, ["Hello.", "I put the salt in the soup."]);
  assert.equal(r.reply, "Ok. You put the salt in the soup.");
  assert.equal(r.trace.recognition?.kind, "event");
});

test("R2: the speaker's own unclassified state is receipted too — the fallthrough shows what it recorded", () => {
  const s = newSession();
  // Specimen changed by E1 (2026-11-19): 'happy' was this
  // test's unclassified state; E1 filed it (joy → Fire), so a
  // happy telling now steers as a classified feeling and no
  // longer reaches the fallthrough. 'guilty' — registered by
  // E1's uncategorised register with no element — is the
  // element-less speaker state that exercises the same path.
  const [, r] = run(s, ["The winter is cold.", "I am guilty."]);
  assert.equal(r.reply, "Ok. You are guilty.");
  assert.equal(r.trace.recognition?.kind, "state");
});

test("R2: the first turn keeps the fuller bare form — it is already the receipt's base", () => {
  const s = newSession();
  const [r] = run(s, ["The soup is hot."]);
  assert.equal(r.reply, "Ok. Noted.");
  assert.equal(r.trace.recognition, undefined);
});

test("R2: a negated telling keeps the bare form — an absence is not the acknowledgement's to receipt", () => {
  const s = newSession();
  const [, r] = run(s, ["The winter is cold.", "The soup is not hot."]);
  assert.equal(r.reply, "Ok.");
  assert.equal(r.trace.recognition, undefined);
});

test("R2: a verb-carried state keeps the bare form — the predication construction does not predicate doings", () => {
  const s = newSession();
  const [, r] = run(s, ["The winter is cold.", "The turtle sleeps."]);
  assert.equal(r.reply, "Ok.");
  assert.equal(r.trace.recognition, undefined);
});

test("R2: an objectless event keeps the bare form — no clause can be rendered from it", () => {
  const s = newSession();
  const [, r] = run(s, ["I am Sam.", "I went."]);
  assert.equal(r.reply, "Ok.");
  assert.equal(r.trace.recognition, undefined);
});

test("R2: a quantity-bearing telling keeps the plain form — the ledger is its retention's showing", () => {
  const s = newSession();
  const [, r] = run(s, ["I have 5 apples.", "Sally bought 3 of them."]);
  assert.equal(r.reply, "Ok.", "the apples specimen's plain acknowledgement stands");
  assert.equal(r.trace.recognition, undefined);
});

test("R2: the naming turn's recognition remains the name (C6), not a second showing", () => {
  const s = newSession();
  const [, r] = run(s, ["Hello.", "I'm Sam."]);
  assert.equal(r.reply, "Ok, Sam.");
  assert.equal(r.trace.recognition, undefined);
});

/* R3 — reply shaping + initiative gating. A composed turn's
 * segment replies are shaped: duplicate plain acknowledgements
 * collapse to one, and a segment's steering reply stands down
 * to the plain acknowledgement when an earlier segment of the
 * same composition closed a boundary (a receipt, a decline, a
 * correction, a closing), or when the state it would steer
 * from is one the segment itself carried by a verb. The R6
 * initiative scan likewise never appends to a receipt or
 * closing, standalone or inside a composition. The specimen
 * dialogues are the probe run's shapes, as dialogue. */

test("R3: a pile of bare acknowledgements composes to one acknowledgement plus what was substantive (the P-086 shape)", () => {
  const s = newSession();
  const [r] = run(s, ["It doesn't work . It looks like it's broken . I need to get to a hospital . You should drive me there ."]);
  assert.equal(r.trace.segmented?.length, 4, "the four segment replies stand in the trace as processed");
  // Re-pinned 2026-11-19 (S5 of the S programme): under
  // segmentation by default the first segment is processed
  // as the conversation's first turn, so its reply is the
  // first-turn fuller bare form ("Ok. Noted.", R2's rule)
  // and that is the ack the shaping stands at the head.
  // The collapse count and the receipt are unchanged.
  // Re-pinned 2026-11-19 (X1 of the X programme): the drive
  // segment's receipt rendered its patient 'there' behind a
  // determiner ("You drove the there.") — 'there' is a
  // closed function word, and X1's admission holds that a
  // function word is never a determiner fill, whatever
  // register recorded it. The receipt stands down to the
  // plain acknowledgement and collapses with the rest of
  // the pile: one ack stands, and nothing else was
  // substantive. The collapse discipline this test pins is
  // unchanged — it now also covers the stood-down receipt.
  assert.equal(r.reply, "Ok. Noted.", "one plain ack stands; the stood-down receipt's ack collapses with the pile");
  assert.equal(r.trace.segmentComposition?.acksCollapsed, 3);
});

test("R3: steering does not ride on a receipt inside a composition (the P-072 shape)", () => {
  const s = newSession();
  const results = run(s, [
    "My dear , what's for supper ?",
    "What about soup ?",
    "Which condiment do you use for ?",
    "Very good , need I help you ?",
    "Thanks . I can watch TV now .",
  ]);
  const last = results[results.length - 1];
  // Re-pinned 2026-11-19 (X3 of the X programme): the
  // venting segment stood down — its steering tail is gone
  // from the receipt, which remains this test's pin — but
  // under X3's stand-down form the segment keeps its own
  // content (the echo its steering rode on) rather than
  // vanishing into the plain acknowledgement.
  // Re-pinned again 2026-11-19 (IMP-3 of the implementation
  // programme): the segment's echo itself no longer stands.
  // Its only content was "You watched the now." — the time
  // word 'now' mis-slotted as the watch event's theme, and
  // the fill admission now refuses a deictic time word as a
  // thing fill, so there is no sound echo for the segment
  // to keep: its acknowledgement is what remains, and the
  // shaping collapses it (acksCollapsed 1), leaving the
  // thanks receipt alone. X3's keep-the-content doctrine
  // stands for sound content; and because no steering reply
  // is produced at all, steeringStoodDown is 0 — the
  // discipline this test exists for (no steering rides on
  // the receipt) holds a fortiori.
  assert.equal(last.reply, "You are welcome.", "no steering rides on the receipt, and the segment's unsound echo does not stand");
  assert.equal(last.trace.segmentComposition?.boundaryReplies, 1);
  assert.equal(last.trace.segmentComposition?.steeringStoodDown, 0);
});

test("R3: steering does not ride on a decline inside a composition (the P-124 shape)", () => {
  const s = newSession();
  const results = run(s, [
    "My favorite color is forest green! I feel like it compliments my skin well. I feel like there has to be some cool facts to know about it, though.",
    "My girlfriend always teases me about green being my favorite color.. Do me a favor, tell me the best fact you know about green, or the coolest instance of green in nature, etc. Just something to show her it's a good color to choose as your favorite.",
    "Yeah.. that's kind of cool, actually. Merchants and bankers, they're good peeps. Well, what else might she not know? I don't want some common knowledge, I want the good stuff!",
  ]);
  const last = results[results.length - 1];
  // Re-pinned 2026-11-19 (X3 of the X programme): the
  // segment after the decline steered and stood down; under
  // X3's stand-down form it keeps its own content (its
  // echo, "You wanted the knowledge.") rather than
  // collapsing into an acknowledgement, so the decline is
  // no longer the composition's last word — but no steering
  // TAIL follows it, which remains this test's pin: the
  // follow-up the steering would have asked is absent.
  assert.ok(
    last.reply.endsWith("You wanted the knowledge."),
    `the stood-down segment's echo closes the reply: ${last.reply}`,
  );
  assert.ok(!last.reply.includes("What's on your mind"), "no steering tail after the decline");
  assert.equal(last.trace.segmentComposition?.steeringStoodDown, 1);
  assert.ok((last.trace.segmentComposition?.boundaryReplies ?? 0) >= 1);
});

test("R3: in a composition, steering from a verb-carried state stands down and the pile collapses (the P-079 shape)", () => {
  const s = newSession();
  const [, r] = run(s, [
    "Hello , Mr . Black , how are you ?",
    "Very well , thank you . It's nice to meet you again . I am awfully sorry for not being able to meet you at the airport , as I was busy yesterday . I do hope you had a very enjoyable trip from New York .",
  ]);
  // Re-pinned by E1 (2026-11-19): the apology segment's
  // 'sorry' is now filed (grief → Metal: the classification
  // climb reaches grief's anchor, and E1's category filing
  // agrees), so its segment steers instead of standing as a
  // bare ack — one fewer ack collapses, and the composed
  // reply carries the steering after the standing head. The
  // steering's own form (its temporal clause drawn unsoundly
  // from the record) is the statement branches' steering-
  // soundness gap the R programme handed to S; the full
  // string is deliberately not pinned. What this test pins —
  // the hope segment's stand-down and the pile's collapse —
  // stands unchanged.
  // Re-pinned 2026-11-19 (X0 of the X programme): the
  // apology segment's state stands NEGATED in the record —
  // the parse scopes the subordinate "not being able to
  // meet you" onto the copula, so you/sorry stands negated
  // (a parse negation-scope grain, recorded in GAPS §2 as
  // a remainder; the record is what it is). X0's rule —
  // steering respects the record's negation — stands the
  // sorry steering down, its acknowledgement collapses
  // with the pile, and the composed reply ends at the
  // standing head. What this test was built to pin — the
  // hope segment's verb-carried stand-down and the shaping
  // discipline — stands unchanged.
  // Extended 2026-11-19 (X3 of the X programme): the hope
  // segment's stood-down steering now keeps its own
  // content under X3's stand-down form — "You hope."
  // stands where its acknowledgement used to collapse —
  // so one fewer ack collapses. The sorry steering remains
  // stood down under X0, and the hope stand-down count is
  // unchanged.
  assert.equal(r.reply, "Ok. Ok. It is nice. You hope.", `the standing head and the hope segment's content stand; the sorry steering stood down under X0: ${r.reply}`);
  assert.equal(r.trace.segmentComposition?.steeringStoodDown, 1, "the hope segment's steering stood down — hope was carried by its verb");
  assert.equal(r.trace.segmentComposition?.acksCollapsed, 1);
});

test("R3: the initiative never appends to a standalone receipt", () => {
  const s = newSession();
  const [, , r] = run(s, ["The winter is cold.", "The garden is cold.", "Thank you."]);
  assert.equal(r.reply, "You are welcome.", "before R3 the standing cold predication was appended here");
  assert.equal(r.trace.initiative, undefined);
});

test("R3: the initiative never appends to a composition carrying a boundary segment", () => {
  const s = newSession();
  const [, , r] = run(s, ["The winter is cold.", "The soup is hot.", "Thank you. The tea is hot."]);
  assert.equal(r.trace.segmentComposition?.boundaryReplies, 1);
  assert.equal(r.reply, "You are welcome. Ok. The tea is hot.");
  assert.equal(r.trace.initiative, undefined, "the boundary segment bars the appended move");
  // Control: the same statement turn without the thanks
  // segment does draw the move — the gate, not the
  // candidate's absence, is what bars it above.
  const s2 = newSession();
  const [, , control] = run(s2, ["The winter is cold.", "The soup is hot.", "The tea is hot."]);
  assert.equal(control.reply, "Ok. The tea is hot. The winter is cold.");
  assert.equal(control.trace.initiative?.shape, "unexpressed-state");
});

test("R3: a greeting is not a boundary — a fused feeling statement still steers", () => {
  const s = newSession();
  const [r] = run(s, ["Hello. I am worried."]);
  // Re-pinned 2026-11-19 (UP-2 of the discourse/uptake
  // programme): the segment's acknowledgement head is the
  // uptake move's where the register is owed — the steering
  // follow still follows, and the boundary point of this
  // test (steeringStoodDown 0) stands as pinned.
  assert.equal(r.reply, "Hello. I am sorry. You are worried. What did you say or do?");
  assert.equal(r.trace.segmentComposition?.steeringStoodDown, 0);
});

test("R3: the shaping never collapses a named acknowledgement", () => {
  const s = newSession();
  const [r] = run(s, ["Hello. I'm Sam."]);
  assert.equal(r.reply, "Hello. Ok, Sam.");
});

/* R4 — steering predication repair. The R6 initiative scan's
 * candidates are admitted only when their derivation is
 * sound: a state the same parse carried by a verb is a doing
 * mis-derived as a state, not a predication ground; a gap
 * question addresses the visitor, so only the visitor's own
 * events ground it; and every fill the question would render
 * must be a sound thing-word (or, in a bare slot, at least a
 * referring word). Unsound candidates are dropped, not
 * verbalised; sound ones fire exactly as before. */

test("R4: a verb-carried state grounds no steering predication (the P-037 shape)", () => {
  const s = newSession();
  const results = run(s, [
    "I have horses, I love them and work together with them",
    "My other hobbies are cooking by using it from my garden",
    "That is so nice, I love John Denver by the way",
  ]);
  const last = results[results.length - 1];
  assert.equal(last.reply, "Ok. That is nice.", "before R4 the appended initiative predicated 'You are horse.'");
  assert.equal(last.trace.initiative, undefined);
  assert.equal(s.initiatives.length, 0, "no move in the dialogue is built on the mis-derived state");
});

test("R4: a gap question is grounded only in the visitor's own events", () => {
  const s = newSession();
  const [, r] = run(s, ["Mary bought.", "The soup is hot."]);
  assert.equal(r.trace.initiative, undefined, "Mary's buying grounds no 'What did you buy?'");
  assert.equal(s.initiatives.length, 0);
  const s2 = newSession();
  const [, control] = run(s2, ["I bought.", "The soup is hot."]);
  assert.equal(control.reply, "Ok. The soup is hot. What did you buy?");
  assert.equal(control.trace.initiative?.shape, "persisting-gap");
});

test("R4: an agent-less event grounds no gap question (the P-119 shape)", () => {
  const s = newSession();
  const results = run(s, [
    "I like reading the Harry Potter books, even though they're so long they're enjoyable to read.",
    "What's your favorite book? I like the Goblet of Fire",
    "Can you tell me more about the Prisoner of Azkaban? I'm a bit rusty on that one.",
    "The soup is hot.",
  ]);
  assert.equal(results[3].trace.initiative, undefined, "the bite fragment (no agent the parse settled) asks nothing by initiative");
  assert.deepEqual(
    s.initiatives.map((i) => i.event?.verb),
    ["read"],
    "the one initiative in the dialogue is the sound one — the visitor's own reading, its gap genuinely open",
  );
});

test("R4: a gap question whose rendered fill is not a thing-word is dropped whole", () => {
  const s = newSession();
  const [, r] = run(s, ["I put it.", "The soup is hot."]);
  assert.equal(r.trace.initiative, undefined, "the location question would have rendered the theme as 'the it'");
  assert.equal(s.initiatives.length, 0);
  const s2 = newSession();
  const [, control] = run(s2, ["I put the salt.", "The soup is hot."]);
  assert.equal(control.reply, "Ok. The soup is hot. Where did you put the salt?");
  assert.equal(control.trace.initiative?.shape, "persisting-gap");
});

test("R4: a sound gap question still fires when the record genuinely lacks the role (the P-075 shape)", () => {
  // The parse of the first turn never recorded the flowers
  // at all — a content drop, the parser programme's to
  // repair. The initiative question itself is grammatical,
  // correctly addressed, and asks after a role the record
  // genuinely lacks, so R4 leaves it standing: what is
  // unsound is dropped, what is sound is not redesigned.
  const s = newSession();
  const results = run(s, [
    "I need to buy some flowers for my wife .",
    "What would the roses cost me ?",
    "I like the sound of that .",
  ]);
  const last = results[results.length - 1];
  assert.equal(last.trace.initiative?.shape, "persisting-gap");
  assert.equal(last.trace.initiative?.sentence, "What did you buy?");
});
