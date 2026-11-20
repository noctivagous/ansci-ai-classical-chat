/**
 * fork-uptake.test.ts — the uptake move family (the Planner;
 * the discourse/uptake programme, Design 2, UP-1 + UP-2,
 * 2026-11-19).
 *
 * The move's ground is the register authorities' filings as
 * evidence with provenance (the EDU canonical filings, the E
 * programme's category filings with degree, the LEDU
 * uncategorised register, Glasgow degree evidence) joined
 * with the telling's own predications and the Discourse
 * Record reader's movement/history servings. Rendering is
 * generated from those inputs by the Planner's transforms —
 * the no-template audit below is one of these tests: same-
 * register replies across different tellings share no stored
 * phrase because none exists; the only sentence two such
 * replies can share is the stance sentence the register and
 * degree themselves derive.
 *
 * The six shape specimens of the design (§2.5) are driven at
 * reply level with their must-nots checked. Where a
 * specimen's natural wording files under no authority
 * ('disappointed', 'upset', 'devastated', 'proud' had no
 * classification entry and no canonical face when this file
 * was written), the specimen was pinned as the located
 * remainder it was — a vocabulary pass's business, not an
 * improvised filing here. The vocabulary pass (V1,
 * 2026-11-19) has since filed all four by the established
 * routes; its pins live in test/fork-vocab-pass.test.ts and
 * the P-027 specimen below is re-pinned to the filed
 * behaviour, its reason in place.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session, type StateRecord } from "../src/fork/session";
import { processTurn } from "../src/fork/turn";
import { assessUptakeGround, degreeOf, registerOf, UPTAKE_WEIGHT_THRESHOLD } from "../src/fork/uptake";

function state(holder: string, lemma: string, turn: number, extra: Partial<StateRecord> = {}): StateRecord {
  return { holder, lemma, turn, origin: { kind: "parsed" }, ...extra };
}

function drive(texts: string[]): { session: Session; replies: string[]; traces: any[] } {
  const session = newSession();
  const replies: string[] = [];
  const traces: any[] = [];
  for (const t of texts) {
    const r = processTurn(session, t);
    replies.push(r.reply);
    traces.push(r.trace);
  }
  return { session, replies, traces };
}

/* ------------------------------------------------------------------ */
/* UP-1: the ground — registers, degrees, weights, exclusions          */
/* ------------------------------------------------------------------ */

test("UP-1: the register walk reads the three authorities in E1's order, with provenance", () => {
  const s = newSession();
  const canonical = (lemma: string) => {
    const r = registerOf(state("you", lemma, 2));
    return r?.kind === "canonical" ? r.name : undefined;
  };
  assert.equal(canonical("sad"), "grief");
  assert.equal(canonical("furious"), "anger");
  assert.equal(canonical("excited"), "joy");
  assert.equal(canonical("worried"), "worry");
  const guilty = registerOf(state("you", "guilty", 2));
  assert.equal(guilty?.kind, "uncategorised");
  assert.equal(registerOf(state("you", "tall", 2)), undefined);
  const ground = assessUptakeGround(s, state("you", "sad", 2));
  assert.ok(ground);
  assert.match(ground.provenance, /EDU names 'grief' a canonical emotion/);
  assert.match(ground.provenance, /Glasgow/);
});

test("UP-1: degree comes from the filings — the note's own degree first, Glasgow arousal as evidence", () => {
  assert.equal(degreeOf(state("you", "furious", 2)).degree, "high");
  assert.equal(degreeOf(state("you", "gloomy", 2)).degree, "low");
  assert.equal(degreeOf(state("you", "excited", 2)).degree, "high");
  assert.equal(degreeOf(state("you", "sad", 2)).degree, "plain");
  assert.equal(degreeOf(state("you", "scared", 2)).degree, "plain");
});

test("UP-1: the ground's exclusions — negated, third-party, and the apology formula ground nothing", () => {
  const s = newSession();
  assert.equal(assessUptakeGround(s, state("you", "sad", 2, { negated: true })), undefined);
  assert.equal(assessUptakeGround(s, state("sister", "sad", 2)), undefined);
  assert.equal(assessUptakeGround(s, state("you", "sorry", 2)), undefined);
});

test("UP-1: weight — degree, returning, and a riding event; a low passing mention falls below the threshold", () => {
  const s = newSession();
  assert.equal(assessUptakeGround(s, state("you", "sad", 2))?.weight, 2);
  assert.equal(assessUptakeGround(s, state("you", "furious", 2))?.weight, 3);
  const low = assessUptakeGround(s, state("you", "gloomy", 2));
  assert.equal(low?.weight, 1);
  assert.ok((low?.weight ?? 0) < UPTAKE_WEIGHT_THRESHOLD);
  // A returning register weighs more, and its object carries
  // the event the earlier telling itself carried:
  const s2 = newSession();
  s2.events.push({ verb: "pass", agent: "you", theme: "exam", turn: 2, text: "I passed the exam" });
  s2.states.push(state("you", "excited", 3));
  const back = assessUptakeGround(s2, state("you", "excited", 6));
  assert.equal(back?.returning, true);
  assert.deepEqual(back?.priorTurns, [3]);
  assert.equal(back?.historyEvent?.verb, "pass");
});

/* ------------------------------------------------------------------ */
/* The no-template audit                                               */
/* ------------------------------------------------------------------ */

test("UP-1 audit: same-register replies across different tellings share no stored phrase — only what the shared inputs derive", () => {
  const sentencesOf = (reply: string) => new Set(reply.split(/(?<=\.)\s+/).filter(Boolean));
  const sad = drive(["Hello.", "I am sad."]).replies[1];
  const lonely = drive(["Hello.", "I am lonely."]).replies[1];
  const deathTelling = drive(["Hello.", "My father died last week.", "I am sad."]).replies[2];
  for (const r of [sad, lonely, deathTelling]) {
    assert.ok(!r.includes("?"), `uptake never asks a question: ${r}`);
  }
  // Different feeling words in the same register at the same
  // degree: the ONLY shared sentence is the stance the
  // register+degree derive. A stored condolence phrase would
  // appear in both and fail here.
  const sharedAcrossWords = [...sentencesOf(sad)].filter((x) => sentencesOf(lonely).has(x));
  assert.deepEqual(sharedAcrossWords, ["I am sorry."]);
  // The same feeling word stated in two different tellings
  // shares exactly one more sentence — the generated
  // predication of that word, which is the telling's own
  // input, not a stored phrase (the lonely reply, whose
  // telling stated a different word, does not contain it):
  const sharedSameWord = [...sentencesOf(sad)].filter((x) => sentencesOf(deathTelling).has(x));
  assert.deepEqual(sharedSameWord.sort(), ["I am sorry.", "You are sad."]);
  assert.ok(!sentencesOf(lonely).has("You are sad."));
  // And the stance itself is derived, not stored: at high
  // degree it carries the degree modulator, at joy it is the
  // other stance quality the record files.
  assert.ok(drive(["Hello.", "I am excited."]).replies[1].startsWith("I am very glad."));
  assert.ok(drive(["Hello.", "I am furious."]).replies[1].startsWith("I am very sorry."));
  assert.ok(drive(["Hello.", "I am glad."]).replies[1].startsWith("I am glad."));
});

/* ------------------------------------------------------------------ */
/* UP-2: the six shape specimens, at reply level                       */
/* ------------------------------------------------------------------ */

test("UP-2 specimen P-110 (grief, slowed down): the uptake is the whole acknowledgement — no steering tail, no question", () => {
  const { replies, traces } = drive(["Hello.", "My father died last week.", "I am sad."]);
  assert.equal(replies[2], "I am sorry. You are sad.");
  assert.ok(!replies[2].includes("?"));
  assert.match(traces[2].uptake.stoodDownSteering, /generating follow stands down/);
  // And no repeat on the next turn: the restatement stands
  // the move down and the ordinary family answers.
  const again = drive(["Hello.", "My father died last week.", "I am sad.", "I am sad."]);
  assert.match(again.traces[3].uptake.stoodDown, /same episode/);
  assert.ok(!again.replies[3].startsWith("I am sorry."));
});

test("UP-2 specimen P-020 (congratulation): the return carries the retained particular from the record", () => {
  const { replies } = drive(["Hello.", "I passed the exam. I am excited.", "It is raining.", "I am excited."]);
  assert.equal(replies[1], "Ok. You passed the exam. I am very glad. You are excited. What did you say or do?");
  // The congratulation on the return names the achievement
  // the earlier telling carried — from the record, not
  // invented, and not the bare category:
  assert.equal(replies[3], "I am very glad. You are excited. You passed the exam. What did you say or do?");
});

test("UP-2 specimen P-083 (concern before administration): uptake heads the register-bearing segment", () => {
  const { replies } = drive(["Hello.", "I am worried. My sister is ill."]);
  assert.equal(replies[1], "I am sorry. You are worried. What did you say or do? Ok. Your sister is ill.");
  assert.ok(replies[1].indexOf("You are worried") < replies[1].indexOf("Your sister is ill"));
});

test("UP-2 specimen P-085 (the complaint): the anger is met; the third party is neither adjudicated nor apologised for", () => {
  const { replies } = drive(["Hello.", "My landlord raised the rent again. I am furious."]);
  assert.equal(
    replies[1],
    "Ok. The landlord raised the rent. I am very sorry. You are furious. What did you say or do?",
  );
  // The stance's object is the visitor's anger, not the
  // landlord's conduct — no verdict on the third party:
  assert.ok(!/landlord (should|must|was wrong)/.test(replies[1]));
});

test("UP-2 specimen P-123 (wistfulness): met at its own kind and degree — grief, plainly, not upgraded", () => {
  const { replies, traces } = drive(["Hello.", "I am lonely."]);
  assert.equal(replies[1], "I am sorry. You are lonely.");
  assert.equal(traces[1].uptake.degree, "plain");
});

test("UP-2 specimen P-027 (commiseration): a filed register over a spoiled plan is met; the design's own words were the located remainder, since filed by the vocabulary pass", () => {
  // With a register the authorities file, commiseration
  // fires over the telling:
  const { replies } = drive(["Hello.", "My weekend was ruined. I am sad."]);
  assert.ok(replies[1].includes("I am sorry. You are sad."));
  assert.ok(!replies[1].includes("What did you plan?"));
  // 'disappointed' and 'upset' — the specimen's natural
  // words — filed under NO authority when this test was
  // written (no classification entry, no canonical face),
  // so no register stood and no uptake was owed; the
  // remainder was located for the vocabulary pass rather
  // than improvised here. RE-PINNED 2026-11-19 (V1 of the
  // vocabulary pass): the pass filed both words by the
  // established routes — 'disappointed' under grief by the
  // canonical face (dissatisfaction at an unmet expectation
  // is grief's family; Glasgow arousal 3.82, the unmarked
  // degree), 'upset' under worry by the classification
  // climb (its state synset IS the worried synset) — so
  // the register now stands and the move is owed at its
  // priced weight. The pass's own pins live in
  // test/fork-vocab-pass.test.ts.
  const rem = drive(["Hello.", "I am disappointed."]);
  assert.equal(rem.replies[1], "I am sorry. You are disappointed.");
  assert.equal(rem.traces[1].uptake?.register, "grief");
});

/* ------------------------------------------------------------------ */
/* UP-2: gating and composition                                        */
/* ------------------------------------------------------------------ */

test("UP-2 gating: a third party's feeling with no visitor register draws no uptake (P-005's shape)", () => {
  const { replies, traces } = drive(["Hello.", "My sister is sad."]);
  assert.equal(replies[1], "Ok. Your sister is sad.");
  assert.equal(traces[1].uptake, undefined);
});

test("UP-2 gating: the apology formula is the social layer's, not uptake's", () => {
  const { replies, traces } = drive(["Hello.", "I am sorry."]);
  assert.equal(traces[1].uptake, undefined);
  assert.equal(replies[1], "You were sorry. What did you say or do?");
});

test("UP-2 gating: a low-degree passing mention is receipt matter — the stand-down is traced with its reason", () => {
  const { replies, traces } = drive(["Hello.", "I am gloomy."]);
  assert.match(traces[1].uptake.stoodDown, /does not clear the move family's threshold/);
  assert.equal(replies[1], "You were gloomy. What did you say or do?");
});

test("UP-2 gating: outside the open phase the move stands down (the Conversation register's phase, hand-set in its own shape)", () => {
  const session = newSession();
  processTurn(session, "Hello.");
  session.conversation.phase = "closing";
  const r = processTurn(session, "I am sad.");
  assert.match(r.trace.uptake?.stoodDown ?? "", /open-phase/);
  assert.ok(!r.reply.startsWith("I am sorry."));
  // And on the very first turn the coherence demand — the
  // system's opening business — owns the turn ahead of the
  // uptake site entirely:
  const first = drive(["I am sad."]);
  assert.equal(first.replies[0], "Sad about what?");
  assert.equal(first.traces[0].uptake, undefined);
});

test("UP-2 gating: a question turn is the question's own business — no uptake is assessed on it (P-086's limiting case)", () => {
  const { traces } = drive(["Hello.", "What is a vitamin?"]);
  assert.equal(traces[1].uptake, undefined);
});

test("UP-2: a movement re-arms the register inside the episode window", () => {
  const { replies, traces } = drive(["Hello.", "I am sad.", "I am gloomy."]);
  assert.equal(replies[1], "I am sorry. You are sad.");
  // 'gloomy' is a new word in the grief register recorded
  // after the move fired — the record moved, so the move
  // answers the movement:
  assert.equal(replies[2], "I am sorry. You are gloomy.");
  assert.equal(traces[2].uptake.register, "grief");
});

test("UP-2: the uncategorised register is met at the acknowledgement fallback (guilty — its fitting still the owner's)", () => {
  const { replies, traces } = drive(["Hello.", "I felt guilty but realized it was his fault."]);
  assert.equal(replies[1], "I am sorry. You are guilty.");
  assert.equal(traces[1].uptake.register, "uncategorised:guilty");
});

test("UP-2 composition: one acknowledgement head — where uptake fires the receipt does not stack, and where it stands down the receipt answers", () => {
  const fired = drive(["Hello.", "I am scared."]);
  assert.equal(fired.replies[1], "I am sorry. You are scared. What did you say or do?");
  assert.ok(!fired.replies[1].includes("Ok."));
  const stood = drive(["Hello.", "The soup is hot."]);
  assert.equal(stood.replies[1], "Ok. The soup is hot.");
});
