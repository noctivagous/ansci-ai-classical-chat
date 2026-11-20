/**
 * ansci-x-programme.test.ts — the X programme (2026-11-19):
 * cross-turn recognition. R2's receipts echo the CURRENT
 * segment; X is the unfinished half — recognition ACROSS
 * turns: receipts that link to material established earlier
 * (X1), answers drawn from the record as it accumulated —
 * feeling history, mention checks (X2), steering grounded
 * in earlier material (X3), and the Interlocutor picture
 * used continuously (X4). X0, built first, is a soundness
 * slice: the steering family respects the record's
 * negation. Probe run 3 (against the S tip, 88472eb) named
 * three further shapes taken up inside the slices: steering
 * inside compositions (X3), the first-person echo (X1), and
 * echoes over particle/clitic fragment fills (X1).
 *
 * Standing law throughout: the links shown are links the
 * RECORD holds (entity/topic identity, feeling continuity
 * or supersession) — resemblance is not a link; every
 * rendering passes S0's soundness admission or stands down
 * to the plain form; the visitor's facts render in the
 * visitor's person, never the system's first person.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/ansci/session";
import { processTurn, type TurnResult } from "../src/ansci/turn";

function run(session: Session, texts: string[]): TurnResult[] {
  return texts.map((t) => processTurn(session, t));
}

/* ---------------- X0: negated-feeling steering ---------------- */

test("X0: a negated feeling does not steer in its positive form (the named specimen)", () => {
  const s = newSession();
  const [r] = run(s, ["I don't feel sad."]);
  // Before X0: "You were sad. What did you say or do?" —
  // the steering spoke the feeling unnegated while the
  // record held you/sad NEGATED. The stand-down is named
  // and the acknowledgement path answers.
  assert.equal(r.reply, "Ok. Noted.");
  assert.match(r.trace.steeringNote ?? "", /stands negated in the record/);
  assert.equal(s.states.find((x) => x.lemma === "sad")?.negated, true);
});

test("X0: the restrainer branch also stands down over a negated new state", () => {
  const s = newSession();
  const [, r] = run(s, ["I want to sleep.", "I don't feel worried."]);
  // 'worried' (Water) controls 'sleep' (Metal): before X0
  // branch (a) answered "You were held from sleep, and you
  // were worried..." — asserting the denied feeling.
  assert.equal(r.reply, "Ok.");
  assert.match(r.trace.steeringNote ?? "", /stands negated in the record/);
});

test("X0: controls — unnegated feelings steer exactly as before", () => {
  const s = newSession();
  const [r1] = run(s, ["I feel sad."]);
  assert.equal(r1.reply, "You were sad. What did you say or do?");
  const s2 = newSession();
  const [, r2] = run(s2, ["I want to sleep.", "I am worried."]);
  assert.equal(
    r2.reply,
    "You were held from sleep, and you were worried. What is the worry about? That seems to be the thing holding the sleep back.",
  );
});

test("X0 refined: a negated verb-carried state steers through the shape that renders its negation", () => {
  const s = newSession();
  const [r] = run(s, ["I couldn't sleep."]);
  // The stand-down's object is a rendering that drops the
  // negation; branch (c)'s verb-carried shape speaks it
  // ("You can't sleep."), so the priced steering stands —
  // with its cycle path — exactly as before X0. Pinned at
  // the programme's gating, where the blanket gate had cost
  // this specimen its move (the r4-3 / worry-sleep surface).
  assert.equal(r.reply, "You can't sleep. What's on your mind when you lie awake?");
  assert.equal(r.trace.cyclePath, "Water→Wood (generating)");
});

/* ---------------- X1: receipts from the accumulated record ---------------- */

test("X1: a later telling links to the established topic it touches (the P-036 specimen)", () => {
  const s = newSession();
  const [, , r] = run(s, [
    "I love riding horses in this weather. Do you have any fun hobbies?",
    "I used to do some weight lifting before I injured my leg.",
    "I injured it in college and again last year falling off a horse.",
  ]);
  // Run 3's reply was the bare receipt "Ok. You injured the
  // leg." — the leg was established a turn earlier (the
  // weight-lifting telling raised it as a topic) and the
  // receipt now shows the connection, from the record.
  // RE-PIN (FIX (iii), the narrative programme, 2026-11-19):
  // the link's GRADE rose. The before-clause's injury now
  // records as its own event (the subordinate-clause
  // recording), so the reader's event leg — which the link
  // order prefers — serves "You told me you injured the
  // leg." where the topic leg's "We were talking about the
  // leg." stood. The test's claim stands at the higher
  // grade: a later telling links to the established material
  // it touches, now by the event that carries it.
  assert.equal(r.reply, "Ok. You injured the leg. You told me you injured the leg.");
  // The link record carries its rendered sentence since
  // IMP-3 (the implementation programme, 2026-11-19): the
  // composition's boundary discipline strips a link by the
  // sentence its own trace records.
  assert.deepEqual(r.trace.recognition?.link, { kind: "event", turn: 3, lemma: "leg", sentence: "You told me you injured the leg." });
});

test("X1: a state receipt links to the earlier event that established its subject (the soup control)", () => {
  const s = newSession();
  const [, r] = run(s, ["I put the salt in the soup.", "The soup is hot."]);
  assert.equal(r.reply, "Ok. The soup is hot. You told me you put the salt in the soup.");
  assert.deepEqual(r.trace.recognition?.link, { kind: "event", turn: 1, lemma: "soup", sentence: "You told me you put the salt in the soup." });
});

test("X1: an event receipt links to an earlier event sharing a fill", () => {
  const s = newSession();
  const [, r] = run(s, ["I put the salt in the soup.", "I drank the soup."]);
  assert.equal(r.reply, "Ok. You drank the soup. You told me you put the salt in the soup.");
});

test("X1: first mentions render exactly as before — no link is manufactured", () => {
  const s = newSession();
  const [, r] = run(s, ["The garden is cold.", "The soup is hot."]);
  assert.equal(r.reply, "Ok. The soup is hot.");
  assert.equal(r.trace.recognition?.link, undefined);
});

test("X1: a name is recorded as told, not as the matcher's nearest word (the P-030 specimen)", () => {
  const s = newSession();
  const [, , r] = run(s, [
    "The hardest time in my life was when my best friend died on Christmas of 2007.",
    "She fell off of a roof. She fell asleep and when she got up_comma_ she slipped.",
    "It has been a long time so I have come to cope with it_comma_ but sometimes it's still hard. I named my daughter after her. Her name is Roxie.",
  ]);
  const nameState = s.states.find((x) => x.holder === "name");
  assert.equal(nameState?.lemma, "roxie", "the record holds the name as told (the record's lowercase grain)");
  assert.equal(s.states.some((x) => x.lemma === "movie"), false, "the matcher's guess stands nowhere in the record");
  assert.equal(nameState?.element, undefined, "no classification of the guess rides on the name");
  // And the receipt refers back to her by the name as told
  // (run 3: the bare "Ok." — the receipt stood down over
  // the guess, and the name was never shown).
  assert.equal(r.reply, "Ok. Ok. Her name is roxie.");
});

test("X1: the visitor's facts render in the visitor's person, never the system's (run 3's first-person echo)", () => {
  const s = newSession();
  const [, r] = run(s, [
    "Hello.",
    "My major was computer science when I was at college , and I am quite familiar with Visual C + + and Java language .",
  ]);
  // P-068 run 3: "Ok. My major is science." — the visitor's
  // major spoken as the system's own claim.
  assert.equal(r.reply, "Ok. Your major is science.");
  const s2 = newSession();
  const [, r2] = run(s2, ["Hello.", "Mine is green."]);
  // P-103 run 3: "Ok. Mine is green."
  assert.equal(r2.reply, "Ok. Yours is green.");
  const s3 = newSession();
  const [, r3] = run(s3, ["Hello.", "My daughter is Roxie."]);
  // Third-person and possessive material compose: 'my'
  // shifts, the daughter's name stands as told.
  assert.equal(r3.reply, "Ok. Your daughter is roxie.");
});

test("X1: fragment and function-word fills fail the rendering admission (run 3's fragment family)", () => {
  // 't', the leavings of "don't", positionally adopted as a
  // noun where it stood: "You donned the t." (P-091).
  const s = newSession();
  const [r] = run(s, ["Coffee ? I don ' t honestly like that kind of stuff ."]);
  assert.equal(r.reply, "Ok. Noted.");
  // 'be'/'t' from "won't": "You won the be to t." (P-083).
  const s2 = newSession();
  const [, , r2] = run(s2, [
    "Hi , is this Professor Clark ' s office ?",
    "Hi , this is Kalina from your morning literature class .",
    "I had a skydiving accident over the weekend and won ' t be able to come to school today .",
  ]);
  assert.equal(r2.reply, "Ok.");
  // 'and' as a theme: "You moved the and in the country."
  // (P-008) — the venting echo stands down whole.
  const s3 = newSession();
  const [, r3] = run(s3, [
    "i'm so excited because i'm finally going to visit my parents next month! I didn't see them for 3 years",
    "I moved to the US and they stayed in my homecountry",
  ]);
  assert.equal(r3.reply, "Ok.");
  // 'one', the leavings of "one legged", predicated as a
  // quality: "You are one." (P-035) — a numeral is a
  // quantity, not a quality, and is not receipted.
  const s4 = newSession();
  const [r4] = run(s4, ["Hi, I am a one legged vet in a wheelchair. How are you?"]);
  assert.equal(r4.reply, "Hi. I am fine.");
});

/* ---------------- X2: answers from the accumulated record ---------------- */

test("X2a: 'How did I feel?' answers with the feeling history, as the change it was", () => {
  const s = newSession();
  const [, , r] = run(s, ["I am worried about the exam.", "I am happy.", "How did I feel?"]);
  // Before X2 the past-tense question drew the standing
  // feeling alone ("You are happy.") — the change the
  // question asks after was in the record and unshown.
  assert.equal(r.reply, "You were worried. You are happy.");
  assert.equal(r.trace.recordAnswer?.source, "feeling");
});

test("X2a: 'Was I worried?' answers from the chain, not the occupant alone", () => {
  const s = newSession();
  const [, , r] = run(s, ["I am worried about the exam.", "I am happy.", "Was I worried?"]);
  // The R7.5 occupant answer to this shape was "You are
  // happy." — a question about the past answered with the
  // present. The chain answers it whole.
  assert.equal(r.reply, "You were worried. You are happy.");
  assert.equal(r.trace.recordAnswer?.source, "feeling");
});

test("X2a: a single-link history answers in the past; a negated link renders as recorded", () => {
  const s = newSession();
  const [, r] = run(s, ["I am worried.", "How did I feel?"]);
  assert.equal(r.reply, "You were worried.");
  const s2 = newSession();
  const [, , r2] = run(s2, ["I am worried.", "I am not worried.", "How did I feel?"]);
  assert.equal(r2.reply, "You were worried. You are not worried.");
});

test("X2a: controls — present-tense feeling questions keep the standing-feeling answers", () => {
  const s = newSession();
  const [, , r] = run(s, ["I am worried about the exam.", "I am happy.", "How do I feel?"]);
  assert.equal(r.reply, "You are happy.");
  // A past-tense question about a non-feeling is untouched
  // (the said-so route answers it, as before).
  const s2 = newSession();
  const [, r2] = run(s2, ["The soup is hot.", "Was the soup hot?"]);
  assert.equal(r2.reply, "You said so.");
});

test("X2b: mention checks answer yes and no from the record as it stood", () => {
  const s = newSession();
  const [, yes, no, yesTell, noTell] = run(s, [
    "I put the salt in the soup.",
    "Did I mention the soup?",
    "Did I mention the garden?",
    "Did I tell you about the soup?",
    "Did I tell you about the garden?",
  ]);
  assert.equal(yes.reply, "Yes. You mentioned the soup.");
  assert.equal(no.reply, "No. You have not mentioned the garden.");
  assert.equal(yesTell.reply, "Yes. You told me about the soup.");
  // The garden was ASKED about (the turn before last) but
  // never told of: a question's own mention is not a
  // telling, and does not count toward a later check.
  assert.equal(noTell.reply, "No. You have not told me about the garden.");
  assert.equal(yes.trace.recordAnswer?.source, "mention");
});

test("X2b: a mention check as the first turn answers no — the question does not count itself", () => {
  const s = newSession();
  const [r] = run(s, ["Did I mention the soup?"]);
  assert.equal(r.reply, "No. You have not mentioned the soup.");
});

/* ---------------- X3: recognition in steering ---------------- */

test("X3: a composed reply carries at most one steering move; stood-down segments keep their content (the P-073 shape)", () => {
  const s = newSession();
  const [t1, t2, t3] = run(s, [
    "I'm sorry I'm so late . I had a really bad day .",
    "I know . I know . I'm really sorry . I lost my bag .",
    "I didn't think of it . Thank you . And I do apologize for being late .",
  ]);
  // Run 3's first turn: the venting tail rode after the
  // sorry steering. Now the first steering stands and the
  // venting segment keeps only its echo.
  assert.equal(t1.reply, "You were sorry. What did you say or do? You had the day.");
  assert.equal(t1.trace.segmentComposition?.steeringStoodDown, 1);
  // Run 3's second turn carried the venting marker THREE
  // times plus the sorry steering. Now one move stands;
  // the other segments keep their content — the second
  // "You knew.", the sorry predication, the bag echo —
  // and lose only their moves.
  assert.ok(
    t2.reply.startsWith(
      "You knew. Now that it's out — what would help you settle? You knew. You were sorry. You lost the bag.",
    ),
    `one steering move, the rest content: ${t2.reply}`,
  );
  assert.equal(t2.trace.segmentComposition?.steeringStoodDown, 3);
  // Run 3's third turn steered BEFORE the thanks receipt.
  // A boundary anywhere in the composition stands steering
  // down, in either order.
  assert.equal(t3.reply, "Ok. You are welcome.");
});

test("X3: a standing unclassified feeling grounds an initiative move on a later, unrelated turn", () => {
  const s = newSession();
  const results = run(s, [
    "Hello.",
    "I felt guilty but realized it was his fault.",
    "The garden is cold.",
    "The soup is hot.",
    "It is raining.",
  ]);
  // 'guilty' is filed by the LEDU's uncategorised register
  // — no classification, so shape (a) can never price it
  // and no move has ever taken it up. Two turns later, on
  // an unrelated telling, the initiative takes it up from
  // the record, predicated as it stands.
  assert.equal(results[3].reply, "Ok. The soup is hot. You are guilty.");
  assert.equal(results[3].trace.initiative?.shape, "standing-feeling");
  // The ground is earlier material only: the feeling's own
  // turn drew no move, and the move does not repeat.
  assert.equal(results[1].trace.initiative, undefined);
  assert.equal(results[4].trace.initiative, undefined);
});

test("X3: a negated feeling never grounds a standing-feeling move (X0's discipline at the scan)", () => {
  const s = newSession();
  const results = run(s, [
    "Hello.",
    "I don't feel guilty.",
    "The garden is cold.",
    "The soup is hot.",
    "It is raining.",
    "The winter is long.",
  ]);
  for (const r of results) assert.notEqual(r.trace.initiative?.shape, "standing-feeling");
});

test("X3: an established topic's standing state grounds a topic-return move", () => {
  const s = newSession();
  const results = run(s, [
    "Hello.",
    "My daughter is Roxie.",
    "The garden is cold.",
    "It is raining.",
    "The winter is long.",
  ]);
  assert.equal(results[3].reply, "Ok. The daughter is roxie.");
  assert.equal(results[3].trace.initiative?.shape, "topic-return");
  assert.equal(results[3].trace.initiative?.state?.holder, "daughter");
});

test("X3: a topic touched since its state was recorded grounds no return", () => {
  const s = newSession();
  const results = run(s, ["Hello.", "My daughter is Roxie.", "I called my daughter.", "It is raining.", "The winter is long."]);
  for (const r of results) assert.notEqual(r.trace.initiative?.shape, "topic-return");
});

/* ---------------- X4: the Interlocutor picture used continuously ---------------- */

test("X4: the occupation question answers from the picture, as told", () => {
  const s = newSession();
  const [, r, r2] = run(s, ["I am a teacher.", "What do I do?", "What do I do for work?"]);
  // Before X4 both shapes drew the missing-role decline
  // ("nothing you have told me says what was done") while
  // the occupation claim stood in the record. (The bare
  // noun grain — "you are teacher" — is the record
  // construction's own, as its R7.5 answers render it.)
  assert.equal(r.reply, "You told me you are teacher.");
  assert.equal(r2.reply, "You told me you are teacher.");
  assert.equal(r.trace.recordAnswer?.source, "self-fact");
  const s2 = newSession();
  const [none] = run(s2, ["What do I do?"]);
  assert.match(none.reply, /^I can't answer that from what I know: /, "no claim established — the decline stands");
});

test("X4: the possession check answers yes and no from the record's have-events", () => {
  const s = newSession();
  const [noFirst, , yes, noCat] = run(s, ["Do I have a dog?", "I have a dog.", "Do I have a dog?", "Do I have a cat?"]);
  assert.equal(noFirst.reply, "No. You have not told me you have a dog.");
  assert.equal(yes.reply, "Yes. You told me you have a dog.");
  assert.equal(noCat.reply, "No. You have not told me you have a cat.");
  assert.equal(yes.trace.recordAnswer?.source, "self-fact");
});

test("X4: the visitor's name answers from the Interlocutor register, both question shapes", () => {
  const s = newSession();
  const [, what, remember] = run(s, ["Hello, I am Sam.", "What is my name?", "Do you remember my name?"]);
  assert.equal(what.reply, "Your name is Sam.");
  assert.equal(remember.reply, "Yes. Your name is Sam.");
  const s2 = newSession();
  const [noWhat, noRemember] = run(s2, ["What is my name?", "Do you remember my name?"]);
  assert.equal(noWhat.reply, "You have not told me your name.");
  assert.equal(noRemember.reply, "No. You have not told me your name.");
});

test("X4: a third party's name answers from the name state the record holds (the P-030 follow-through)", () => {
  const s = newSession();
  const [, , , r] = run(s, [
    "The hardest time in my life was when my best friend died on Christmas of 2007.",
    "She fell off of a roof. She fell asleep and when she got up_comma_ she slipped.",
    "It has been a long time so I have come to cope with it_comma_ but sometimes it's still hard. I named my daughter after her. Her name is Roxie.",
    "What is her name?",
  ]);
  // Before X4 (and X1's recording fix) this declined —
  // "nothing on name in my notes" — while the name stood
  // in the record as the matcher's guess.
  assert.equal(r.reply, "Her name is roxie.");
  assert.equal(r.trace.recordAnswer?.source, "self-fact");
});

test("X4: a restated self-state is receipted under the told-me attribution", () => {
  const s = newSession();
  const [, first, , restated] = run(s, [
    "Hello.",
    "I am a teacher.",
    "The garden is cold.",
    "I am a teacher.",
  ]);
  assert.equal(first.reply, "Ok. You are teacher.", "a first telling keeps the bare predication");
  assert.equal(restated.reply, "Ok. You told me you are teacher.", "the re-telling acknowledges the person, not only the segment");
  const s2 = newSession();
  const [, , , restatedFeeling] = run(s2, [
    "Hello.",
    "I felt guilty but realized it was his fault.",
    "The garden is cold.",
    "I felt guilty but realized it was his fault.",
  ]);
  // Re-pinned 2026-11-19 (UP-2 of the discourse/uptake
  // programme): a restated FEELING is met by the uptake move
  // on its returning ground — the move owns the
  // acknowledgement head, ahead of the restated receipt.
  // The told-me receipt still owns restated non-feeling
  // states (the teacher assertions above stand as pinned).
  assert.equal(restatedFeeling.reply, "I am sorry. You are guilty.");
  assert.equal(restatedFeeling.trace.initiative, undefined, "the turn took the feeling up itself — no initiative repeats it");
});

test("X2c: the accumulated-tellings question reaches its answerer (IMP-4(a) — the X2 remainder, built)", () => {
  const s = newSession();
  const [, , r] = run(s, ["I put the salt in the soup.", "The soup is hot.", "What did I tell you about the soup?"]);
  // This test pinned the remainder while it stood: the
  // about-phrase drops at parse in the wh- shape (the parse
  // holds tell/i/what — the asked lemma never reached an
  // answerer), and the turn took the record-shaped decline.
  // IMP-4(a) of the implementation programme (2026-11-19)
  // built the reader: the topic is read from the token
  // stream after "about", and the record answers with the
  // accumulation — the state predicated of the soup and the
  // event it fills, under the told-me attribution. The
  // decline this test used to pin is the behaviour the
  // slice exists to replace (the record-probes instrument's
  // accumulated-tellings family priced it 1 pass / 4 fail).
  assert.equal(r.reply, "You told me you put the salt in the soup. You told me the soup is hot.");
  assert.equal(r.trace.recordAnswer?.source, "tellings");
});
