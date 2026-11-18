/**
 * fork-r7.5.test.ts — slice R7.5 of the reply-planning
 * programme (design note §11.4's second clause, §8.7 S12):
 * the predication question site reads the session record's
 * standing state for its subject BEFORE deriving from the
 * classification table. The scenarios are
 * docs/fork/transcripts/T-R7.5.md, authored and frozen before
 * the build; the controls are the slice's core — the record
 * answers only where a standing state occupies the asked
 * quality's aspect slot, and never with a fabricated price.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/fork/session";
import { processTurn, type TurnResult } from "../src/fork/turn";
import { planRecordPredication } from "../src/fork/plan";

function run(session: Session, turns: string[]): TurnResult[] {
  return turns.map((t) => processTurn(session, t));
}

const LEAK = /\b(wood|fire|earth|metal|wuxing|yin|yang|element|elements|five elements)\b/i;

/* ---------------- (a) the §11.4 sequence verbatim ---------------- */

test("R7.5 (a): after two corrections, the question is answered from the record — the standing state, its chain, no fresh cold", () => {
  const s = newSession();
  const [, , , t4] = run(s, ["The soup is cold.", "The soup is hot.", "The soup is cool.", "Is the soup cold?"]);
  assert.equal(t4.reply, "The soup is cool.");
  const rec = t4.trace.answeredFromRecord;
  assert.ok(rec, "the trace names the record as the answer's source");
  assert.equal(rec!.state.lemma, "cool");
  assert.equal(rec!.state.turn, 3);
  assert.equal(rec!.askedQuality, "cold");
  assert.match(rec!.slot, /'temperature' aspect slot/);
  assert.deepEqual(
    rec!.supersessions.map((d) => `${d.replaced.lemma} → ${d.replacing.lemma} (turn ${d.turn})`),
    ["cold → hot (turn 2)", "hot → cool (turn 3)"],
    "the supersession chain for the slot rides the record",
  );
  assert.match(rec!.recordingSkipped ?? "", /set aside/);
  assert.equal(t4.trace.pricing, undefined, "no pricing is fabricated for a record answer");
  assert.equal(t4.trace.derivationPath, undefined, "no derivation stands behind a record answer");
  assert.equal(t4.trace.wordingNotDerived, false, "the reply is generated from the planner's record graph");
  assert.ok(t4.trace.replyGraph, "the trace carries the record graph");
  assert.deepEqual(
    s.states.filter((st) => st.holder === "soup").map((st) => st.lemma),
    ["cool"],
    "no fresh cold state stands beside the corrected one",
  );
});

/* ---------------- (b) match control ---------------- */

test("R7.5 (b): a standing state that IS the asked quality answers from the record, plainly", () => {
  // Normalcy-arc re-pin (Part 3a): the standing state IS the
  // asked quality AND the speaker stated it themselves — the
  // record answer is now the said-so move ("You said so."),
  // which outranks the R7.5 record graph for a question about
  // what was said. The R7.5 route still answers where the
  // occupant is not the speaker's own statement of the asked
  // predication — (a), (f), (g) and the contrast pin below.
  const s = newSession();
  const [, t2] = run(s, ["The soup is cold.", "Is the soup cold?"]);
  assert.equal(t2.reply, "You said so.");
  assert.equal(t2.trace.saidSo?.stateTurn, 1, "the record answer names the stating turn");
  assert.equal(t2.trace.answeredFromRecord, undefined, "the said-so move answered, not the record graph");
  assert.equal(t2.trace.pricing, undefined, "the table derivation is not what answers — no price is carried");
  assert.equal(t2.trace.derivationPath, undefined);
  assert.deepEqual(
    s.states.filter((st) => st.holder === "soup").map((st) => st.lemma),
    ["cold"],
    "exactly the stated state stands — the question's own recording was set aside",
  );
});

/* ---------------- (c) different-aspect control ---------------- */

test("R7.5 (c): a standing state in a different aspect slot does not answer — the derivation proceeds as today", () => {
  const s = newSession();
  const [, t2] = run(s, ["The soup is sweet.", "Is the soup cold?"]);
  assert.equal(t2.reply, "The soup may be cold.", "today's derived reply, byte-identical");
  assert.equal(t2.trace.answeredFromRecord, undefined);
  assert.ok(t2.trace.derivationPath, "the derivation ran");
  assert.equal(t2.trace.pricing?.level, "qualified", "priced as today");
  // The aspect determination the control turns on, stated:
  // asked cold → 'temperature'; standing sweet → 'taste'.
  assert.deepEqual(
    s.states.filter((st) => st.holder === "soup").map((st) => st.lemma),
    ["sweet", "cold"],
    "recording proceeds exactly as today (F3): the question's predication stands",
  );
});

/* ---------------- (d) no-standing-state control ---------------- */

test("R7.5 (d): no standing state — today's behaviour byte-identical (salt)", () => {
  const s = newSession();
  const [t1] = run(s, ["Is the salt cold?"]);
  assert.equal(t1.reply, "The salt is cold.");
  assert.equal(t1.trace.answeredFromRecord, undefined);
  assert.deepEqual(t1.trace.pricing, { weakestTier: "attested", support: 0.9, ceiling: "plain", level: "plain", declined: false });
  assert.match(t1.trace.derivationPath ?? "", /salt —HAS_ELEMENT/);
});

/* ---------------- (e) the replacement is the asked quality ---------------- */

test("R7.5 (e): a superseded subject whose replacement is the asked quality answers from the record with the replacement", () => {
  // Normalcy-arc re-pin (Part 3a): the replacement state is
  // the asked quality and the speaker stated it (turn 2), so
  // the said-so move answers — the record's settlement is
  // still the replacement, and the supersession chain stands
  // in the session record exactly as before; what changed is
  // only which record route speaks.
  const s = newSession();
  const [, , t3] = run(s, ["The soup is cold.", "The soup is hot.", "Is the soup hot?"]);
  assert.equal(t3.reply, "You said so.");
  assert.equal(t3.trace.saidSo?.stateTurn, 2, "the stating turn named is the replacement's turn");
  assert.equal(t3.trace.answeredFromRecord, undefined);
  assert.deepEqual(
    s.supersessions.filter((d) => d.holder === "soup").map((d) => `${d.replaced.lemma} → ${d.replacing.lemma}`),
    ["cold → hot"],
    "the supersession chain stands in the record",
  );
  assert.deepEqual(
    s.states.filter((st) => st.holder === "soup").map((st) => st.lemma),
    ["hot"],
    "the question's own recording of hot was set aside — one hot stands, the replacement",
  );
});

/* ---------------- (f) negated standing state ---------------- */

test("R7.5 (f): a negated standing state occupies its slot and is predicated as it stands", () => {
  const s = newSession();
  const [, t2] = run(s, ["The soup is not cold.", "Is the soup cold?"]);
  assert.equal(t2.reply, "The soup is not cold.");
  assert.equal(t2.trace.answeredFromRecord?.state.lemma, "cold");
  assert.equal(t2.trace.answeredFromRecord?.state.negated, true);
});

/* ---------------- (g) why-question against a contradicting record ---------------- */

test("R7.5 (g): a why-question whose presupposition the record contradicts is answered from the record", () => {
  const s = newSession();
  const [, , t3] = run(s, ["The soup is cold.", "The soup is cool.", "Why is the soup cold?"]);
  assert.equal(t3.reply, "The soup is cool.");
  assert.equal(t3.trace.answeredFromRecord?.state.lemma, "cool");
  assert.equal(t3.trace.derivationPath, undefined, "no causal form is built from a derivation the record does not support");
});

/* ---------------- (h) why-question matching the record — derivation stands ---------------- */

test("R7.5 (h): a why-question whose standing state IS the asked predication keeps the derivation (Behaviour 2's pin)", () => {
  const s = newSession();
  const [, , t3] = run(s, ["Is winter cold?", "Is the salt cold?", "Why is winter cold?"]);
  assert.equal(t3.reply, "Winter is cold, because it is most fully cold.");
  assert.equal(t3.trace.answeredFromRecord, undefined);
  assert.ok(t3.trace.derivationPath && t3.trace.pricing, "the derivation and its price stand as today");
});

/* ---------------- preserved: derivation-site contrast (R5-2's displacement) ---------------- */

test("R7.5: the contrast R5-2 pinned still fires at the derivation site, where the subject's own slot is unoccupied", () => {
  const s = newSession();
  const [, t2] = run(s, ["The soup is hot.", "Is the salt cold?"]);
  assert.equal(t2.trace.answeredFromRecord, undefined, "the salt has no standing state — the derivation answers");
  assert.equal(t2.reply, "But the salt is cold.");
  assert.equal(t2.trace.cohesion?.relation, "contrast");
  assert.equal(t2.trace.cohesion?.marker, "but");
  assert.match(t2.trace.cohesion?.ground ?? "", /standing state 'hot'/);
});

/* ---------------- unit-level: the record graph ---------------- */

test("planRecordPredication: predicates the standing state as it stands, negation intact, no qualification states", () => {
  const out = planRecordPredication({
    subject: { lemma: "soup", form: "soup", det: "the" },
    stateLemma: "cold",
    negated: true,
  });
  assert.equal(out.sentence, "The soup is not cold.");
  const quality = out.graph.meaning.nodes.find((n) => n.id === "reply-predicate");
  assert.equal(quality?.states?.modal, undefined, "no modal is borrowed from any price");
  assert.equal(quality?.states?.negated, true);
});

/* ---------------- surface discipline ---------------- */

test("R7.5 surface: no reply in the slice's scenarios names the ontology", () => {
  const sets: string[][] = [
    ["The soup is cold.", "The soup is hot.", "The soup is cool.", "Is the soup cold?"],
    ["The soup is cold.", "Is the soup cold?"],
    ["The soup is sweet.", "Is the soup cold?"],
    ["Is the salt cold?"],
    ["The soup is cold.", "The soup is hot.", "Is the soup hot?"],
    ["The soup is not cold.", "Is the soup cold?"],
    ["The soup is cold.", "The soup is cool.", "Why is the soup cold?"],
    ["The soup is hot.", "Is the salt cold?"],
  ];
  for (const turns of sets) {
    const s = newSession();
    for (const r of run(s, turns)) assert.ok(!LEAK.test(r.reply), `reply leaks ontology vocabulary: ${r.reply}`);
  }
});
