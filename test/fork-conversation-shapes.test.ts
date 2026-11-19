/**
 * fork-conversation-shapes.test.ts — the conversation-shapes
 * programme (2026-11-18): fixes for the failure shapes the
 * sealed conversation probe run measured (report:
 * ~/workspace/ansci-probe-run-output/REPORT.md), one slice per
 * shape, each pinned here as it lands.
 *
 * C1 — fused social forms: a greeting or "how are you" fused
 * with further content, thanks beyond the bare closed shapes,
 * and thanks fused with a closing. The turn layer takes a
 * multi-segment turn as a sequence of acts; assessment
 * recognises the daypart greetings, the wellbeing query, the
 * see-you farewell and the quantified thanks from the parse's
 * own structure.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/fork/session";
import { processTurn, type TurnResult } from "../src/fork/turn";

function run(session: Session, texts: string[]): TurnResult[] {
  return texts.map((t) => processTurn(session, t));
}
function person(session: Session) {
  return session.objects.filter((o) => o.producer === "person");
}

test("C1: daypart greetings and the daypart farewell are recognised and mirrored", () => {
  const s = newSession();
  const [morning] = run(s, ["Good morning."]);
  assert.equal(morning.reply, "Good morning.");
  assert.equal(person(s)[0].act.kind, "greeting");
  const s2 = newSession();
  const [night] = run(s2, ["Good night."]);
  assert.equal(night.reply, "Good night.");
  assert.equal(person(s2)[0].act.kind, "leave-taking");
});

test("C1: the wellbeing query is answered with the wellbeing predication, recorded as ritual", () => {
  const s = newSession();
  const [r] = run(s, ["How are you?"]);
  assert.equal(r.reply, "I am fine.");
  const obj = person(s)[0];
  assert.equal(obj.act.kind, "greeting");
  assert.equal(obj.act.wellbeing, true);
  assert.equal(obj.act.ritual, true);
});

test("C1: a greeting fused with the wellbeing query composes both moves", () => {
  const s = newSession();
  const [r] = run(s, ["Hello, how are you doing?"]);
  assert.equal(r.reply, "Hello. I am fine.");
  assert.ok(r.trace.segmented, "the fused turn is recorded as segmented");
  assert.deepEqual(
    r.trace.segmented?.map((x) => x.segment),
    ["Hello.", "how are you doing?"],
  );
});

test("C1: a greeting fused with content receives the greeting and handles the content", () => {
  const s = newSession();
  const [r] = run(s, ["Good morning. The winter is cold."]);
  assert.ok(r.reply.startsWith("Good morning."), `reply: ${r.reply}`);
  assert.ok(r.trace.segmented);
});

test("C1: thanks beyond the bare shapes is received", () => {
  for (const text of ["Thanks so much.", "Thanks very much.", "Thanks a lot.", "Many thanks.", "Thank you so much."]) {
    const s = newSession();
    const [r] = run(s, [text]);
    assert.equal(r.reply, "You are welcome.", text);
    assert.equal(person(s)[0].act.kind, "thanks", text);
  }
});

test("C1: thanks fused with a closing discharges both obligations", () => {
  const s = newSession();
  const [r] = run(s, ["Thank you. Goodbye."]);
  assert.equal(r.reply, "You are welcome. Goodbye.");
  assert.equal(s.conversation.phase, "closed");
  const s2 = newSession();
  const [r2] = run(s2, ["Thank you very much. See you then."]);
  assert.equal(r2.reply, "You are welcome. See you then.");
});

test("C1: ordinary how-questions are not captured by the wellbeing recognition", () => {
  const s = newSession();
  const [a] = run(s, ["How do you do it?"]);
  assert.notEqual(a.reply, "I am fine.");
  assert.equal(person(s)[0].act.kind, "question");
  const s2 = newSession();
  run(s2, ["How is the garden?"]);
  assert.equal(person(s2)[0].act.kind, "question");
});

test("C1: a multi-sentence statement turn with no social segment takes the ordinary path", () => {
  const s = newSession();
  const [r] = run(s, ["The winter is cold. The garden is cold."]);
  assert.equal(r.trace.segmented, undefined);
});

/* C2 — rephrase restraint: the whole-utterance rephrase request
 * (S4 trigger d) is for a turn the system can make nothing of.
 * A multi-sentence telling one part of which defeats the
 * sentence layer is taken up segment by segment instead; the
 * rephrase stands only when no segment can be taken up. */

test("C2: a telling with one unparseable segment is received through its parseable segments", () => {
  const s = newSession();
  const [r] = run(s, ["My grandmother frobnicted the zanzibar splunge. The winter was cold. I was furious."]);
  assert.notEqual(r.reply, "Could you put that another way?");
  assert.ok(r.reply.includes("You were furious."), `reply: ${r.reply}`);
  assert.ok(r.trace.segmented, "the recovery is recorded as segmented");
  assert.ok(r.trace.planNote?.includes("statement recovery (conversation-shapes C2)"), r.trace.planNote);
});

test("C2: a telling whose segments all fail keeps the rephrase request", () => {
  const s = newSession();
  const [r] = run(s, ["Frobnicate the zanzibar. Splunge the quixotic blorp."]);
  assert.equal(r.reply, "Could you put that another way?");
});

test("C2: a single unparseable sentence keeps the rephrase request", () => {
  const s = newSession();
  const [r] = run(s, ["Frobnicate the zanzibar splunge."]);
  assert.equal(r.reply, "Could you put that another way?");
});

/* C3 — the self-query family: questions whose subject is the
 * system and whose matter is a fact about it route to the Self
 * tables; what the tables do not hold is answered with the
 * plain denial the limits facts support, never a decline-by-
 * gap and never a token clarification. */

test("C3: possession questions about the system get the plain denial", () => {
  const cases: [string, string][] = [
    ["Do you have any pets?", "I don't have any pets."],
    ["Do you have a cat?", "I don't have a cat."],
    ["Do you have any children?", "I don't have any children."],
  ];
  for (const [text, expected] of cases) {
    const s = newSession();
    const [r] = run(s, [text]);
    assert.equal(r.reply, expected, text);
    assert.equal(person(s)[0].act.kind, "self-query", text);
    assert.equal(person(s)[0].act.selfQuery, "fact", text);
  }
});

test("C3: biographical questions about the system get the plain denial", () => {
  const cases: [string, string][] = [
    ["What is your rank?", "I don't have a rank."],
    ["What degree did you get?", "I don't have a degree."],
    ["Where were you born?", "I don't have a birthplace."],
    ["Where do you live?", "I don't have a home."],
    ["How old are you?", "I don't have an age."],
  ];
  for (const [text, expected] of cases) {
    const s = newSession();
    const [r] = run(s, [text]);
    assert.equal(r.reply, expected, text);
  }
});

test("C3: the occupation question is answered with the denial and what the system does", () => {
  const s = newSession();
  const [r] = run(s, ["What do you do for a living?"]);
  assert.equal(r.reply, "I don't have a job. I can talk over simple statements and questions.");
});

test("C3: 'What is your name?' routes to the identity answer, not the denial", () => {
  const s = newSession();
  const [r] = run(s, ["What is your name?"]);
  assert.ok(r.reply.startsWith("I am AnSci."), r.reply);
  assert.equal(person(s)[0].act.selfQuery, "identity");
});

test("C3: ordinary questions about other subjects are not captured", () => {
  for (const text of ["Do you like dogs?", "Do you know the garden?", "What did you say?", "What did you do?", "Do you eat meat?"]) {
    const s = newSession();
    run(s, [text]);
    assert.equal(person(s)[0].act.kind, "question", text);
  }
});

/* C4 — token-clarification discipline: the S4 token trigger
 * asks only on genuine doubt. A token the shipped lexicon
 * attests, a capitalised name-shaped token, and function-word
 * rivals are not genuine doubt; a genuine misspelling with
 * genuine rivals still triggers. */

test("C4: an attested word riding its sentence's period is not asked about", () => {
  const s = newSession();
  const [r] = run(s, ["I saw her. The winter is cold."]);
  assert.ok(!r.reply.startsWith("Did you mean"), r.reply);
});

test("C4: a proper name is not 'corrected'", () => {
  const s = newSession();
  const [r] = run(s, ["My daughter found an old picture of her when she was a teenager. I named my daughter after her. Her name is Roxie."]);
  assert.ok(!r.reply.startsWith("Did you mean"), r.reply);
  assert.equal(r.reply, "Ok. Noted.");
});

test("C4: a genuine misspelling with genuine rivals still triggers", () => {
  const s = newSession();
  const [ask] = run(s, ["The wethr is cold."]);
  assert.equal(ask.reply, "Did you mean water, or weather?");
  const s2 = newSession();
  const [ask2] = run(s2, ["Wethr is cold."]);
  assert.equal(ask2.reply, "Did you mean water, or weather?", "sentence-initial capitals get no proper-name pass");
});

/* C5 — the visitor's own clarification requests: "What do you
 * mean?" is answered with a restatement of the system's last
 * substantive reply, from the register's record of what was
 * actually said — never the question path's decline. */

test("C5: 'What do you mean?' restates the last substantive reply", () => {
  const s = newSession();
  const [, ask] = run(s, ["The winter is cold.", "What do you mean?"]);
  assert.equal(ask.reply, "I said: Ok. Noted.");
  assert.deepEqual(ask.trace.restatedReply, { turn: 1, text: "Ok. Noted." });
});

test("C5: a repeated request restates the same saying, not the restatement", () => {
  const s = newSession();
  const [, a, b] = run(s, ["The winter is cold.", "What do you mean?", "What did you mean?"]);
  assert.equal(a.reply, "I said: Ok. Noted.");
  assert.equal(b.reply, "I said: Ok. Noted.");
});

test("C5: with nothing substantive before it, the reply says so plainly", () => {
  const s = newSession();
  const [ask] = run(s, ["What do you mean?"]);
  assert.equal(ask.reply, "I have not said anything yet that I can restate.");
  const s2 = newSession();
  const [, ask2] = run(s2, ["Hello.", "What do you mean?"]);
  assert.equal(ask2.reply, "I have not said anything yet that I can restate.", "a ritual mirror is not a substantive saying");
});

test("C5: a word-meaning question is not captured", () => {
  const s = newSession();
  run(s, ["What does cold mean?"]);
  assert.equal(person(s)[0].act.meanQuery, undefined);
  assert.equal(person(s)[0].act.kind, "question");
});

/* C6 — recognition in acknowledgements: when the Interlocutor's
 * picture gains the visitor's name on this very turn, the
 * acknowledgement addresses them by it; the naming reading now
 * also draws the "My name is X." shape, which never reached
 * the register before. */

test("C6: the naming turn's acknowledgement uses the name just learned", () => {
  const s = newSession();
  const [r] = run(s, ["I am Alison."]);
  assert.equal(r.reply, "Ok. Noted, Alison.");
  const s2 = newSession();
  const [, r2] = run(s2, ["Hello.", "I'm Sam."]);
  assert.equal(r2.reply, "Ok, Sam.");
});

test("C6: 'My name is X.' reaches the register and is recognised the same way", () => {
  const s = newSession();
  const [r] = run(s, ["My name is Sam."]);
  assert.equal(s.interlocutor.identity?.name, "Sam");
  assert.equal(r.reply, "Ok. Noted, Sam.");
});

test("C6: acknowledgements without a name learned this turn keep the bare forms", () => {
  // RE-PIN (the recognition programme, R2, 2026-11-19): this
  // test's original second turns were state tellings ("The
  // garden is cold.") — a turn that establishes a
  // registrable state now gets the recognition receipt, not
  // the bare form (R2 is C6's own larger part, pinned in
  // fork-recognition-programme.test.ts). What this test
  // pins is unchanged: no name was learned on these turns,
  // so no acknowledgement carries one — the bare form stands
  // where a turn establishes nothing the receipt names (an
  // objectless event), and a name learned on an earlier
  // turn is not repeated in later receipts.
  const s = newSession();
  const [a] = run(s, ["The winter is cold."]);
  assert.equal(a.reply, "Ok. Noted.");
  const s2 = newSession();
  const [, c] = run(s2, ["I am Sam.", "I went."]);
  assert.equal(c.reply, "Ok.", "the name is not repeated in every later receipt");
});

/* C7 — premise stance for asserted premises: S5's stance,
 * wired for why-questions only, now also meets a false
 * premise carried as an assertion, when Coherence's premise
 * degree contradicts it from the graph. The assertion is not
 * adopted and does not stand as a state; the disagreement is
 * its record. A contradiction from the visitor's own record
 * stays the correction machinery's ground, and absence stays
 * absence. */

test("C7: an asserted premise the graph contradicts meets the stance", () => {
  const s = newSession();
  const [r] = run(s, ["Winter is hot."]);
  assert.equal(r.reply, "Winter is cold, as I have it.");
  assert.equal(r.trace.stance?.outcome, "stated");
  assert.equal(r.trace.stance?.source, "graph");
  assert.ok(
    !s.states.some((st) => st.holder === "winter" && st.lemma === "hot"),
    "the asserted state does not stand in the record",
  );
  assert.deepEqual(s.conversation.disagreements, [
    { premise: "winter is hot", established: "winter is cold", turn: 1 },
  ]);
});

test("C7: after the stance, the false premise is not answered from the record", () => {
  const s = newSession();
  const [, q] = run(s, ["Winter is hot.", "Is winter hot?"]);
  assert.notEqual(q.reply, "You said so.");
});

test("C7: insistence on the asserted premise is met as S5 meets it — not adopted, disagreement recorded", () => {
  const s = newSession();
  const [, again] = run(s, ["Winter is hot.", "Winter is hot."]);
  assert.equal(again.reply, "Winter is cold, as I have it.");
  assert.equal(again.trace.stance?.outcome, "insistence-not-adopted");
  assert.equal(s.conversation.disagreements.length, 2, "both the assertion and the insistence stand as disagreements");
  assert.ok(
    !s.states.some((st) => st.holder === "winter" && st.lemma === "hot"),
    "the insisted premise never stands as a state",
  );
});

test("C7: a record contradiction stays the correction machinery's, not the stance's", () => {
  const s = newSession();
  const [, r] = run(s, ["Winter is cold.", "Winter is hot."]);
  assert.equal(r.trace.stance, undefined);
  assert.ok(r.trace.correction, "the correction machinery answered");
});

test("C7: absence stays absence — an uncontradicted assertion is simply recorded", () => {
  const s = newSession();
  const [r] = run(s, ["The garden is cold."]);
  assert.equal(r.trace.stance, undefined);
  assert.ok(s.states.some((st) => st.holder === "garden" && st.lemma === "cold"));
});

/* ---------------- C8: decline wording — the participle ---------------- */

test("C8: the role-question decline verbalises the participle — 'what was done', not 'what was did'", () => {
  const s = newSession();
  const [r] = run(s, ["What did you do?"]);
  assert.match(r.reply, /what was done/, "the decline names the missing role with the verb's participle");
  assert.ok(!/was did/.test(r.reply), "the past form never stands where the participle belongs");
});

test("C8: the -ne class covers go as it covers do", () => {
  const s = newSession();
  const [r] = run(s, ["Where did you go?"]);
  assert.match(r.reply, /what was gone/);
});
