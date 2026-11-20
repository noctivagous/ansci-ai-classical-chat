/**
 * ansci-transcript-slice5.test.ts — premise checking against
 * the Self tables (Transcript Slice 5, 2026-11-19).
 *
 * The diagnosis these tests pin (probe report §3, SD3): the
 * one assertion-stance mechanism (C7) fires only when
 * Coherence's premiseDegree returns a contradiction sourced
 * from the GRAPH. premiseDegree reads session states and
 * the ontology graph; it never consults the Self tables
 * (identity.ts, capabilities.ts), where the system's own
 * facts live. Probe 19 — "your last name is smith." — drew
 * the bare acknowledgement "Ok. Noted.", no stance, and the
 * false state {holder: "your", lemma: "smith"} stood banked
 * in the record afterwards (the diagnostic's supplementary
 * check S-B). Later self-answers were unaffected only
 * because they read the tables, not the states.
 *
 * The slice's design choice: a self-predication GUARD beside
 * C7, not an extension of premiseDegree — the degree's
 * contract is a subject + quality reading over record and
 * graph, while a self-predication's slot (which fact of the
 * system is predicated) is dropped by the parse and must be
 * read from the token record, and its authority (the Self
 * tables) is reached through the Social Unit's one address —
 * turn-layer materials both. The guard takes C7's
 * consequences with the table as the source: the reply
 * states the held fact, the asserted state is set aside,
 * the disagreement is recorded. Every expectation below was
 * verified against this tree's build before it was pinned.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { requestIdentity } from "../src/ansci/social";

// MINIMAL / DRAFT wording (Slice 3, reused by this slice):
// the stance reply is Slice 3's name composer — the Identity
// table holds one name, undivided, and the answer says so,
// with the name. The final visitor-facing wording of Self
// facts is the owner's to settle.
const ONE_NAME_TEXT = "I have only the one name, AnSci.";
const IDENTITY_TEXT =
  "I am AnSci. I am a small classical-AI system. I understand simple English statements and questions, and I answer from what I know, saying so when I don't.";

function turn(session: ReturnType<typeof newSession>, text: string) {
  return processTurn(session, text);
}

test("the guard's authority: the Identity table holds the one name, reached through the Social Unit's address", () => {
  assert.equal(requestIdentity().name, "AnSci");
});

test("probe 19: 'your last name is smith.' takes a stance from the Identity table, and the smith state does not stand", () => {
  const session = newSession();
  const { reply, trace } = turn(session, "your last name is smith.");
  // A stance reply naming the held fact — not the bare
  // acknowledgement the probe recorded.
  assert.equal(reply, ONE_NAME_TEXT);
  assert.notEqual(reply, "Ok. Noted.");
  // The stance's authority is visible in the trace, as other
  // record answers' sources are: the Self table, not the
  // graph, not the record.
  assert.equal(trace.stance?.source, "self");
  assert.equal(trace.stance?.outcome, "stated");
  assert.equal(trace.stance?.presupposed, "smith");
  assert.equal(trace.stance?.established, "AnSci");
  assert.match(trace.stance?.ground ?? "", /Identity table/);
  assert.match(trace.planNote ?? "", /Self tables as the source/);
  // The false state does not stand banked in the record
  // (supplementary check S-B's finding, reversed).
  assert.ok(
    !session.states.some((s) => s.holder === "your" && s.lemma === "smith"),
    "the smith state must not stand in the record",
  );
  assert.equal(session.states.length, 0);
  // The disagreement is the assertion's record, as C7's is.
  assert.deepEqual(session.conversation.disagreements, [
    { premise: "your name is smith", established: "my name is AnSci", turn: 1 },
  ]);
});

test("probe 19, S-B sequence: self-answers after the stance still answer from the tables, and no smith state ever stands", () => {
  const session = newSession();
  turn(session, "your last name is smith.");
  const last = turn(session, "what is your last name?");
  assert.equal(last.reply, ONE_NAME_TEXT);
  const name = turn(session, "what is your name?");
  assert.equal(name.reply, IDENTITY_TEXT);
  assert.ok(
    !session.states.some((s) => s.lemma === "smith"),
    "no smith state stands at any point in the sequence",
  );
});

test("the guard is general over the name slot: bare and modified name NPs, any offered value", () => {
  for (const input of ["your name is bob.", "your first name is smith.", "your middle name is jones."]) {
    const session = newSession();
    const { reply, trace } = turn(session, input);
    assert.equal(reply, ONE_NAME_TEXT, input);
    assert.equal(trace.stance?.source, "self", input);
    assert.equal(session.states.length, 0, input);
  }
});

test("a repeat assertion meets the guard again — the same stance, the false state set aside again, no pending opened", () => {
  // No stance-repair pending opens for a self-predication:
  // the pending's insistence renderings are built from
  // subject/quality lemmas ("X is Y, as I have it"), and no
  // lemma pair renders a your-NP premise truthfully. The
  // guard reads each telling on its own, so an insistence
  // is met by the stance itself, never adopted.
  const session = newSession();
  turn(session, "your last name is smith.");
  const again = turn(session, "your last name is smith.");
  assert.equal(again.reply, ONE_NAME_TEXT);
  assert.equal(again.trace.stance?.outcome, "stated");
  assert.equal(session.conversation.pending, null);
  assert.equal(session.conversation.disagreements.length, 2);
  assert.equal(session.states.length, 0);
});

test("agreement control: 'your name is ansci.' is acknowledged normally, with no stance", () => {
  // The offered value is read from the retained surface —
  // the words as written. (The parse's lemma for the same
  // word is "anti": token resolution substituted its own
  // reading, so a lemma comparison could never agree.)
  for (const input of ["your name is ansci.", "your name is AnSci."]) {
    const session = newSession();
    const { reply, trace } = turn(session, input);
    assert.equal(reply, "Ok. Noted.", input);
    assert.equal(trace.stance, undefined, input);
    // Acknowledged normally: the telling stands in the
    // record as told, as any agreed telling does.
    assert.equal(session.states.length, 1, input);
    assert.equal(session.conversation.disagreements.length, 0, input);
  }
});

test("coverage control: a second-person predication the tables do not cover keeps its prior behaviour", () => {
  // The tables hold nothing about a favourite colour or a
  // home: no stance, the ordinary acknowledgement, and the
  // telling stands as told — no coverage invented.
  for (const input of ["your favourite colour is red.", "your home is paris."]) {
    const session = newSession();
    const { reply, trace } = turn(session, input);
    assert.equal(reply, "Ok. Noted.", input);
    assert.equal(trace.stance, undefined, input);
    assert.equal(session.states.length, 1, input);
  }
});

test("the forms the machinery honestly does not reach keep their prior behaviour", () => {
  // A location predication banks no state, and the Place
  // table stands unconfigured — it holds no fact a
  // predication could contradict. A modal capability claim
  // draws a verb event, not a predicated-as state. Both
  // keep the ordinary acknowledgement.
  for (const input of ["you are in paris.", "you can fly."]) {
    const session = newSession();
    const { reply, trace } = turn(session, input);
    assert.equal(reply, "Ok. Noted.", input);
    assert.equal(trace.stance, undefined, input);
    assert.equal(session.states.length, 0, input);
  }
});

test("controls unchanged: the graph C7 stance, and probes 5, 6, 16, 20", () => {
  // C7's graph-sourced stance is untouched by the guard
  // beside it.
  const winter = turn(newSession(), "Winter is hot.");
  assert.equal(winter.reply, "Winter is cold, as I have it.");
  assert.equal(winter.trace.stance?.source, "graph");
  const cases: [string, string][] = [
    ["what can you do?", "I can talk over simple statements and questions. I remember what this conversation has established. I can explain what I based an answer on, in plain terms. My knowledge is small and fixed."],
    ["who are you?", IDENTITY_TEXT],
    ["what is your last name?", ONE_NAME_TEXT],
    ["how are you?", "I am fine."],
  ];
  for (const [input, expected] of cases) {
    assert.equal(turn(newSession(), input).reply, expected, input);
  }
});
