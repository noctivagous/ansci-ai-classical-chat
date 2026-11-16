/**
 * fork-r6.test.ts — slice R6 of the reply-planning programme
 * (design note §8.10 initiative, §8.1 awareness, §10 slice
 * R6): bounded initiative from session-level gaps, and the
 * awareness frame classified into the record. The scenarios
 * are docs/fork/transcripts/T-R6.md, authored and frozen
 * before the build; the controls are the slice's core —
 * initiative where the discipline forbids it is a failure,
 * not a variation.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { daypartForHour, newSession, seasonForMonth, type Session } from "../src/fork/session";
import { processTurn, type TurnResult } from "../src/fork/turn";
import { SCENARIOS } from "../src/fork/scenarios";

function run(session: Session, turns: string[]): TurnResult[] {
  return turns.map((t) => processTurn(session, t));
}

const LEAK = /\b(wood|fire|earth|metal|wuxing|yin|yang|element|elements|five elements)\b/i;

/* ---------------- R6-1: initiative from an unexpressed state ---------------- */

const R6_1 = ["I was furious.", "I heard the news.", "The soup is sweet.", "I made the soup yesterday.", "The soup is green."];

test("R6-1: the unexpressed state is taken up at the first statement reply, priced from its origin", () => {
  const s = newSession();
  const results = run(s, R6_1);
  for (const r of results.slice(0, 4)) assert.equal(r.trace.initiative, undefined, `no initiative at turn ${r.trace.turn}`);
  const t5 = results[4];
  assert.equal(
    t5.reply,
    "You were held from sweet, and you were green. What is the green about? " +
      "That seems to be the thing holding the sweet back. You are furious.",
  );
  const init = t5.trace.initiative;
  assert.ok(init, "the initiative record stands in the trace");
  assert.equal(init!.shape, "unexpressed-state");
  assert.deepEqual(init!.state, { holder: "you", lemma: "furious", turn: 1 });
  assert.equal(init!.move, "predication");
  assert.equal(init!.sentence, "You are furious.");
  assert.match(init!.ground, /unexpressed/);
  assert.match(init!.ground, /Wood→Fire/);
  assert.match(init!.ground, /4 turns/);
  assert.equal(init!.pricing?.weakestTier, "attested");
  assert.equal(init!.pricing?.support, 0.9);
  assert.equal(init!.pricing?.level, "plain");
  // The addressed state (sweet) is NOT the ground — the
  // exclusion, not the arithmetic, keeps it out.
  assert.equal(t5.trace.addressedState?.lemma, "sweet");
  assert.notEqual(init!.state?.lemma, "sweet");
  // The move's graph is the predication's, in the trace.
  const graph = JSON.parse(t5.trace.replyGraph ?? "{}");
  assert.ok(graph.nodes.some((n: { lemma: string }) => n.lemma === "furious"), "the reply graph predicates the standing state");
  assert.equal(s.initiatives.length, 1);
  assert.deepEqual(s.initiatives[0], {
    turn: 5,
    shape: "unexpressed-state",
    state: { holder: "you", lemma: "furious", stateTurn: 1 },
  });
});

/* ---------------- R6-2: initiative from a persisting gap ---------------- */

const R6_2 = ["I slept.", "I gave him.", "I heard the news.", "The soup is sweet."];

test("R6-2: a gap that persisted unasked is asked by initiative, from the record", () => {
  const s = newSession();
  const results = run(s, R6_2);
  for (const r of results.slice(0, 3)) assert.equal(r.trace.initiative, undefined, `no initiative at turn ${r.trace.turn}`);
  // The gap is never asked on its own turn: the venting reply stands.
  assert.equal(results[1].reply, "You gave at him. Now that it's out — what would help you settle?");
  assert.equal(results[1].trace.gapQuestion, undefined);
  const t4 = results[3];
  assert.equal(
    t4.reply,
    "You were held from sleep, and you were sweet. What is the sweet about? " +
      "That seems to be the thing holding the sleep back. What did you give him?",
  );
  const init = t4.trace.initiative;
  assert.ok(init);
  assert.equal(init!.shape, "persisting-gap");
  assert.deepEqual(init!.event, { verb: "give", turn: 2, role: "theme" });
  assert.equal(init!.move, "question");
  assert.equal(init!.sentence, "What did you give him?");
  assert.match(init!.ground, /persists across 2 turns/);
  assert.equal(s.initiatives.length, 1);
  assert.deepEqual(s.initiatives[0], {
    turn: 4,
    shape: "persisting-gap",
    event: { verb: "give", eventTurn: 2, role: "theme" },
  });
});

/* ---------------- R6-3: the bound over a long conversation ---------------- */

const R6_3 = [
  "The soup is cold.", "I was worried.", "The tea is hot.", "I heard the news.", "The soup is salty.",
  "I made the soup yesterday.", "The pie is sweet.", "I cooked the rice.", "The juice is salty.", "The cake is sweet.",
];

test("R6-3: one move in any five turns — fires at 5 and 10, bound-blocked at 7 and 9", () => {
  const s = newSession();
  const results = run(s, R6_3);
  const fired = results.filter((r) => r.trace.initiative).map((r) => r.trace.turn);
  assert.deepEqual(fired, [5, 10], "initiative fires at turns 5 and 10 only");
  // Turn 2: a plain-statement reply, but cold is one turn old — the age rule bars it.
  assert.equal(results[1].trace.initiative, undefined);
  // Turn 5: the OLDEST candidate (cold, turn 1) — not worried (turn 2).
  const t5 = results[4];
  assert.equal(t5.trace.initiative?.state?.lemma, "cold");
  assert.equal(t5.trace.initiative?.pricing?.weakestTier, "attested");
  assert.equal(t5.trace.initiative?.pricing?.support, 0.95);
  assert.equal(t5.trace.initiative?.pricing?.level, "plain");
  assert.ok(t5.reply.endsWith("The soup is cold."));
  // Turns 7 and 9: candidates stand, replies are plain statements — the bound alone bars them.
  assert.equal(
    results[6].reply,
    "You were held from cold, and you were sweet. What is the sweet about? That seems to be the thing holding the cold back.",
  );
  assert.equal(
    results[8].reply,
    "You were held from hot, and you were salty. What is the salty about? That seems to be the thing holding the hot back.",
  );
  // Turn 10: the bound permits (10 − 5 = 5); cold, already taken up, is not
  // taken up again — worried grounds the move, at its derived-tier price.
  const t10 = results[9];
  assert.equal(t10.trace.initiative?.state?.lemma, "worried");
  assert.equal(t10.trace.initiative?.pricing?.weakestTier, "derived");
  assert.equal(t10.trace.initiative?.pricing?.support, 0.9);
  assert.equal(t10.trace.initiative?.pricing?.level, "qualified");
  assert.ok(t10.reply.endsWith("You may be worried."));
  assert.deepEqual(s.initiatives.map((i) => i.turn), [5, 10]);
});

/* ---------------- R6-4: control (i) — the person's own questions and gaps ---------------- */

const R6_4 = ["I was furious.", "Why is winter cold?", "Is summer hot?", "I gave him.", "Is autumn dark?"];

test("R6-4 control (i): a question or gap of the person's own bars initiative on every turn", () => {
  const s = newSession();
  const results = run(s, R6_4);
  for (const r of results) assert.equal(r.trace.initiative, undefined, `no initiative at turn ${r.trace.turn}`);
  assert.equal(s.initiatives.length, 0);
  // Turn 2 is the clean pin: furious stands unexpressed and the reply is a
  // plain statement — the person's own question is the only bar.
  assert.equal(results[1].reply, "Winter is cold, because it is most fully cold.");
  assert.equal(results[1].trace.personPresented, "question");
  assert.equal(results[2].trace.personPresented, "question");
  assert.equal(results[4].trace.personPresented, "question");
});

/* ---------------- R6-5: control (iii) — an expressed direction ---------------- */

const R6_5 = ["I was furious.", "The soup is hot.", "I heard the news.", "The tea is cold.", "Is winter cold?"];

test("R6-5 control (iii): a state whose generating direction was expressed grounds no initiative", () => {
  const s = newSession();
  const results = run(s, R6_5);
  for (const r of results) assert.equal(r.trace.initiative, undefined, `no initiative at turn ${r.trace.turn}`);
  assert.equal(s.initiatives.length, 0);
  // Turn 4: the restrainer reply is a plain statement and furious is old
  // enough and unaddressed — its expressedness (hot, Fire, at turn 2) is
  // the only bar. No appended predication of furious.
  assert.equal(
    results[3].reply,
    "You were held from hot, and you were cold. What is the cold about? That seems to be the thing holding the hot back.",
  );
  assert.equal(results[3].trace.addressedState?.lemma, "hot");
});

/* ---------------- R6-6: the awareness frame and the role slot ---------------- */

test("R6-6A: a winter night frame is classified into the record and named in every trace header", () => {
  const s = newSession(undefined, { month: 1, day: 15, hour: 23 });
  assert.equal(s.frame?.season?.name, "winter");
  assert.equal(s.frame?.season?.element, "Water");
  assert.equal(s.frame?.season?.origin.kind, "classified");
  assert.equal(s.frame?.season?.origin.path, "winter —HAS_ELEMENT→ Water");
  assert.equal(s.frame?.season?.origin.support, 0.95);
  assert.equal(s.frame?.season?.origin.tier, "attested");
  assert.equal(s.frame?.season?.origin.provenance, "fork-curated");
  assert.equal(s.frame?.daypart.name, "night");
  assert.equal(s.frame?.daypart.element, "Water");
  assert.equal(s.frame?.daypart.origin?.provenance, "fork-curated");
  assert.equal(s.frame?.daypart.polarity, "Yin");
  assert.equal(s.frame?.daypart.polarityLeg, "night —POLARITY_OF→ Yin");
  assert.equal(s.frame?.daypart.unclassifiedReason, undefined);
  const framed = run(s, ["Why is winter cold?", "I was furious."]);
  for (const r of framed) {
    assert.equal(r.trace.frame?.season?.name, "winter", "the trace header carries the frame");
    assert.equal(r.trace.role, "predominant Earth", "the trace header carries the neutral role");
  }
  // In this slice no processing reaches the frame: the replies are the
  // unframed session's replies for the same turns.
  const plain = run(newSession(), ["Why is winter cold?", "I was furious."]);
  assert.deepEqual(framed.map((r) => r.reply), plain.map((r) => r.reply));
});

test("R6-6B: a summer midday frame; the role slot is present, shown and inert", () => {
  const s = newSession(undefined, { month: 7, hour: 14 });
  assert.equal(s.frame?.season?.name, "summer");
  assert.equal(s.frame?.season?.element, "Fire");
  assert.equal(s.frame?.daypart.name, "midday");
  assert.equal(s.frame?.daypart.element, "Fire");
  assert.equal(s.frame?.daypart.polarity, "Yang");
  const [r1] = run(s, ["I was furious."]);
  const s2 = newSession(undefined, { month: 7, hour: 14 });
  s2.role = { predominant: "Wood", secondary: "Fire" };
  const [r2] = run(s2, ["I was furious."]);
  assert.equal(r2.reply, r1.reply, "the role changes no behaviour in this slice");
  assert.equal(r2.trace.role, "predominant Wood, secondary Fire", "the set role is what the header shows");
  assert.equal(r1.trace.role, "predominant Earth");
});

test("R6-6C: an hour-only frame records the daypart and the season's absence, with its reason", () => {
  const s = newSession(undefined, { hour: 3 });
  assert.equal(s.frame?.daypart.name, "night");
  assert.equal(s.frame?.daypart.polarity, "Yin");
  assert.equal(s.frame?.season, undefined);
  assert.match(s.frame?.seasonAbsentReason ?? "", /no month supplied/);
  const [r] = run(s, ["I was furious."]);
  assert.equal(r.trace.frame?.daypart.name, "night");
  assert.equal(r.trace.frame?.season, undefined);
});

test("R6-6D: no frame input — no frame in the record or the trace; the role stands neutral", () => {
  const s = newSession();
  assert.equal(s.frame, undefined);
  assert.deepEqual(s.role, { predominant: "Earth" });
  const [r] = run(s, ["I was furious."]);
  assert.equal(r.trace.frame, undefined);
  assert.equal(r.trace.role, "predominant Earth");
});

test("the frame conventions map calendar to names at their boundaries", () => {
  assert.equal(seasonForMonth(1), "winter");
  assert.equal(seasonForMonth(3), "spring");
  assert.equal(seasonForMonth(6), "summer");
  assert.equal(seasonForMonth(9), "autumn");
  assert.equal(seasonForMonth(12), "winter");
  assert.equal(daypartForHour(0), "night");
  assert.equal(daypartForHour(4), "night");
  assert.equal(daypartForHour(5), "dawn");
  assert.equal(daypartForHour(11), "midday");
  assert.equal(daypartForHour(17), "dusk");
  assert.equal(daypartForHour(23), "night");
  const s = newSession(undefined, { dateISO: "2026-07-04", hour: 9 });
  assert.equal(s.frame?.season?.name, "summer", "the month rides the ISO date");
  assert.equal(s.frame?.daypart.name, "dawn");
  assert.deepEqual(s.frame?.supplied, { month: 7, day: 4, hour: 9 });
});

/* ---------------- the silence discipline ---------------- */

test("R6: no gap in the record, no move — however long the conversation runs", () => {
  const s = newSession();
  const results = run(s, Array(8).fill("I heard the news."));
  for (const r of results) assert.equal(r.trace.initiative, undefined);
  assert.equal(s.initiatives.length, 0);
  assert.equal(s.states.length, 0, "nothing classified ever stood to be taken up");
});

test("R6: initiative never fires inside the four scripted scenarios", () => {
  for (const scenario of SCENARIOS) {
    const s = newSession();
    for (const r of run(s, scenario.turns)) {
      assert.equal(r.trace.initiative, undefined, `${scenario.name} turn ${r.trace.turn} gained an initiative move`);
    }
    assert.equal(s.initiatives.length, 0);
  }
});

/* ---------------- surface discipline ---------------- */

test("R6 surface: no reply in the slice's scenarios names the ontology, appended moves included", () => {
  const sets: string[][] = [R6_1, R6_2, R6_3, R6_4, R6_5];
  for (const turns of sets) {
    const s = newSession();
    for (const r of run(s, turns)) assert.ok(!LEAK.test(r.reply), `reply leaks ontology vocabulary: ${r.reply}`);
  }
  const framed = newSession(undefined, { month: 1, day: 15, hour: 23 });
  for (const r of run(framed, ["Why is winter cold?", "I was furious."])) {
    assert.ok(!LEAK.test(r.reply), `reply leaks ontology vocabulary: ${r.reply}`);
  }
});
