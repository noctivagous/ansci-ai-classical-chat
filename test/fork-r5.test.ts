/**
 * fork-r5.test.ts — slice R5 of the reply-planning programme
 * (design note §8.7 S3/S4/S12/S14, §9.4.4, §10 slice R5):
 * cohesion connectives earned by relations, echo as
 * construction, and correction handled as supersession with
 * the acknowledgement built from the recorded delta. The
 * scenarios are docs/fork/transcripts/T-R5.md, authored and
 * frozen before the build; the negative controls are the
 * slice's core — a marker where its relation does not exist
 * is a failure, not a change.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, supersedeRecord, type Session, type StateRecord } from "../src/fork/session";
import { processTurn, type TurnResult } from "../src/fork/turn";
import { COHESION_MARKERS, planCorrection } from "../src/fork/plan";
import { SCENARIOS } from "../src/fork/scenarios";

function run(session: Session, turns: string[]): TurnResult[] {
  return turns.map((t) => processTurn(session, t));
}

const LEAK = /\b(wood|fire|earth|metal|wuxing|yin|yang|element|elements|five elements)\b/i;

/* ---------------- R5-1: return, and its negative control ---------------- */

test("R5-1 return: a topic left for two turns and reactivated earns the return marker", () => {
  const s = newSession();
  const [, , , t4] = run(s, ["The soup is cold.", "I was furious.", "I shouted at him.", "Is the soup cold?"]);
  // R7.5 re-pin: the standing cold state occupies the asked
  // quality's slot, so the record answers ("it is cold", no
  // modal from the table's price) — the return marker rides
  // the record graph exactly as it rode the derivation's.
  assert.equal(t4.reply, "As for the soup, it is cold.");
  assert.equal(t4.trace.answeredFromRecord?.state.lemma, "cold");
  assert.equal(t4.trace.cohesion?.relation, "return");
  assert.equal(t4.trace.cohesion?.marker, "as for");
  assert.match(t4.trace.cohesion?.ground ?? "", /raised at turn 1/);
  assert.match(t4.trace.cohesion?.ground ?? "", /last touched at turn 1/);
  const graph = JSON.parse(t4.trace.replyGraph ?? "{}");
  assert.ok(
    graph.edges.some((e: { relation: string; marker?: string }) => e.relation === "links" && e.marker === "as for"),
    "the reply graph carries the earned marker on a 'links' edge",
  );
});

test("R5-1b negative control: a continuously active topic earns no marker", () => {
  const s = newSession();
  const [, t2] = run(s, ["The soup is cold.", "Is the soup cold?"]);
  // Normalcy-arc re-pin (Part 3a): the speaker stated the very
  // predication asked after, and no cohesion relation holds
  // (the topic never left), so the record answer is the
  // said-so move — hand-worded, no reply graph, and the
  // control's point stands plainer than before: no cohesion
  // relation held, so no marker is earned or carried. (Where
  // a return relation DOES hold, the said-so move stands down
  // for the record graph that carries the marker — R5-1
  // above.)
  assert.equal(t2.reply, "You said so.");
  assert.equal(t2.trace.saidSo?.stateTurn, 1);
  assert.equal(t2.trace.answeredFromRecord, undefined, "the said-so move, not the R7.5 record graph, answered");
  assert.equal(t2.trace.cohesion, undefined, "no cohesion record where no relation held");
  assert.equal(t2.trace.replyGraph, undefined, "the said-so reply is hand-worded — no graph, no marker edge");
});

/* ---------------- R5-2: contrast, with R5-1b as its control ---------------- */

test("R5-2 contrast: reply content controlling a standing state earns the contrast marker", () => {
  // R7.5 DISPLACEMENT, itemised in T-R7.5-results.md: this
  // scenario's standing state (hot) occupies the asked
  // quality's slot (temperature), so under §11.4's second
  // clause the record answers and the derivation — whose
  // contrast this test pinned — never runs. The test now
  // pins the record answer; the derivation-site contrast is
  // preserved where the record does not occupy the subject's
  // slot, pinned in fork-r7.5.test.ts.
  const s = newSession();
  // Fixture restored (property-axes slice, 2026-11-18): C7
  // swapped the soup's 'hot' for the garden's, on the
  // since-removed cross-axis derivation (Part H). The
  // soup's 'hot' stands again, and the record answer this
  // test pins is unchanged in shape.
  const [, t2] = run(s, ["The soup is hot.", "Is the soup cold?"]);
  assert.equal(t2.reply, "The soup is hot.");
  assert.equal(t2.trace.answeredFromRecord?.state.lemma, "hot");
  assert.equal(t2.trace.answeredFromRecord?.askedQuality, "cold");
  assert.equal(t2.trace.cohesion, undefined, "no marker is earned by an answer that predicates the standing state itself");
});

/* ---------------- R5-3: echo as graph facts ---------------- */

test("R5-3 echo: the reply graph's subject is the person's own node material", () => {
  const s = newSession();
  const [, t2] = run(s, ["I made the soup yesterday.", "Is the soup cold?"]);
  const graph = JSON.parse(t2.trace.replyGraph ?? "{}");
  const subject = graph.nodes.find((n: { id: string }) => n.id === "reply-subject");
  assert.equal(subject.lemma, "soup");
  assert.equal(subject.form, "soup");
  assert.equal(subject.det, "the", "the person's determiner rides the reused node");
});

/* ---------------- R5-4: correction by restatement (value) ---------------- */

test("R5-4 value correction: the delta is recorded and the reply is built from it", () => {
  const s = newSession();
  const [, t2, t3] = run(s, ["The soup is cold.", "The soup is hot.", "The soup is cool."]);
  assert.equal(t2.reply, "The soup is not cold, but it is hot.");
  assert.equal(t2.trace.correction?.rule, "value");
  assert.equal(t2.trace.correction?.replaced.lemma, "cold");
  assert.equal(t2.trace.correction?.replacing.lemma, "hot");
  assert.equal(t2.trace.cyclePath, undefined, "the correction reply preempts steering");
  // The later turn corrects the CORRECTED state: hot stands to
  // be corrected, cold plays no part.
  assert.equal(t3.reply, "The soup is not hot, but it is cool.");
  assert.equal(t3.trace.correction?.replaced.lemma, "hot");
  assert.equal(s.supersessions.length, 2);
  assert.deepEqual(
    s.states.filter((st) => st.holder === "soup").map((st) => st.lemma),
    ["cool"],
    "only the latest value stands",
  );
  // The delta graph's subject is the person's own material (echo).
  const graph = JSON.parse(t2.trace.replyGraph ?? "{}");
  const subject = graph.nodes.find((n: { id: string }) => n.id === "reply-subject");
  assert.equal(subject.det, "the");
});

test("R5-4b never-stated control: a first statement records no supersession", () => {
  const s = newSession();
  // Fixture restored (property-axes slice, 2026-11-18): C7
  // swapped the soup's 'hot' for the garden's, on the
  // since-removed cross-axis derivation (Part H); the
  // soup's 'hot' stands as a state again, and the control's
  // claim — a first statement supersedes nothing — is
  // unchanged.
  const [t1] = run(s, ["The soup is hot."]);
  assert.equal(s.supersessions.length, 0, "a supersession of nothing is not an event");
  assert.equal(t1.trace.correction, undefined);
  assert.ok(s.states.some((st) => st.holder === "soup" && st.lemma === "hot"), "the state stands as a new state");
});

/* ---------------- R5-5: correction by negation (polarity) ---------------- */

test("R5-5 polarity correction: supersedeState's delta, the single-predication reply, and the venting skip", () => {
  const s = newSession();
  const [, t2, t3] = run(s, ["I was furious.", "I am not furious.", "I shouted at him."]);
  assert.equal(t2.reply, "You are not furious.");
  assert.equal(t2.trace.correction?.rule, "polarity");
  assert.equal(t2.trace.correction?.replaced.lemma, "furious");
  assert.equal(t2.trace.correction?.replaced.negated, undefined);
  assert.equal(t2.trace.correction?.replacing.negated, true);
  assert.equal(s.supersessions.length, 1);
  assert.equal(s.supersessions[0].replaced.negated, undefined);
  assert.equal(s.supersessions[0].replacing.negated, true);
  // Later turn: the venting steering does not take the
  // corrected state — no venting cycle path, and the skip is
  // named in the trace.
  assert.equal(t3.trace.cyclePath, undefined, "no venting arc is claimed over a negated state");
  assert.match(t3.trace.steeringNote ?? "", /negated/);
  assert.match(t3.trace.steeringNote ?? "", /passed over/);
  assert.deepEqual(
    s.states.map((st) => ({ lemma: st.lemma, negated: st.negated })),
    [{ lemma: "furious", negated: true }],
    "the record holds exactly the corrected state",
  );
});

test("R5-5b never-stated control: a first negation records no supersession", () => {
  const s = newSession();
  const [t1] = run(s, ["I am not furious."]);
  assert.equal(s.supersessions.length, 0);
  assert.equal(t1.trace.correction, undefined);
  assert.equal(s.states[0].negated, true, "the negated state is recorded as a new state, negation intact");
});

test("R5: a question turn never triggers a correction, and a restated same value does not either", () => {
  const s = newSession();
  run(s, ["The soup is cold.", "Is the soup hot?"]);
  assert.equal(s.supersessions.length, 0, "the question recorded its state but asserted nothing");
  const s2 = newSession();
  run(s2, ["The soup is cold.", "The soup is cold."]);
  assert.equal(s2.supersessions.length, 0, "the same value at the same polarity is a restatement, not a correction");
});

test("R5: a verb-carried correction records its delta but builds no predication graph", () => {
  const s = newSession();
  const [, t2] = run(s, ["I can't sleep.", "I can sleep."]);
  assert.equal(s.supersessions.length, 1, "the polarity delta is recorded (the R0 shape, through the turn loop)");
  assert.equal(t2.trace.correction?.rule, "polarity");
  assert.equal(t2.trace.replyGraph, undefined, "no delta graph for a verb-carried state");
  assert.match(t2.trace.correction?.note ?? "", /verb-carried/);
  assert.deepEqual(
    s.states.map((st) => ({ lemma: st.lemma, negated: st.negated })),
    [{ lemma: "sleep", negated: undefined }],
    "the corrected state stands and steers",
  );
});

test("R5: a person value correction repeats the person subject in the chained clause", () => {
  const s = newSession();
  const [, t2] = run(s, ["I was furious.", "I was worried."]);
  assert.equal(t2.reply, "You were not furious, but you were worried.");
  assert.equal(t2.trace.correction?.rule, "value");
});

/* ---------------- unit-level: the delta graph and the record ---------------- */

test("planCorrection: the value form strikes the replaced state and predicates the replacing one", () => {
  const out = planCorrection({
    subject: { lemma: "soup", form: "soup", det: "the" },
    replaced: { lemma: "cold" },
    replacing: { lemma: "hot" },
  });
  assert.equal(out.sentence, "The soup is not cold, but it is hot.");
});

test("planCorrection: the polarity form collapses to the single corrected predication", () => {
  const out = planCorrection({
    subject: { lemma: "you", form: "you", person: "2sg" },
    replaced: { lemma: "furious" },
    replacing: { lemma: "furious", negated: true },
  });
  assert.equal(out.sentence, "You are not furious.");
});

test("supersedeRecord: replaces the exact standing record and records the delta", () => {
  const s = newSession();
  const a: StateRecord = { holder: "soup", lemma: "cold", turn: 1, origin: { kind: "parsed" } };
  const b: StateRecord = { holder: "soup", lemma: "hot", turn: 2, origin: { kind: "parsed" } };
  s.states.push(a);
  const delta = supersedeRecord(s, a, b);
  assert.ok(delta);
  assert.equal(delta!.replaced, a);
  assert.equal(delta!.replacing, b);
  assert.deepEqual(s.states, [b]);
  assert.equal(supersedeRecord(s, a, b), undefined, "a record that no longer stands supersedes nothing");
  assert.equal(s.supersessions.length, 1);
});

test("the cohesion mapping is one data table (relation → marker)", () => {
  assert.deepEqual(COHESION_MARKERS, { continuation: "and", consequence: "so", contrast: "but", return: "as for" });
});

/* ---------------- surface discipline ---------------- */

test("R5 surface: no reply in the slice's scenarios names the ontology", () => {
  const sets: string[][] = [
    ["The soup is cold.", "I was furious.", "I shouted at him.", "Is the soup cold?"],
    ["The soup is cold.", "Is the soup cold?"],
    ["The soup is hot.", "Is the soup cold?"],
    ["I made the soup yesterday.", "Is the soup cold?"],
    ["The soup is cold.", "The soup is hot.", "The soup is cool."],
    ["I was furious.", "I am not furious.", "I shouted at him."],
    ["I can't sleep.", "I can sleep."],
  ];
  for (const turns of sets) {
    const s = newSession();
    for (const r of run(s, turns)) assert.ok(!LEAK.test(r.reply), `reply leaks ontology vocabulary: ${r.reply}`);
  }
  for (const scenario of SCENARIOS) {
    const s = newSession();
    for (const r of run(s, scenario.turns)) assert.ok(!LEAK.test(r.reply), `reply leaks ontology vocabulary: ${r.reply}`);
  }
});
