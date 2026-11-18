/**
 * fork-r3.test.ts — Slice R3: gap questions and grounded declines
 * (design note §2.3, §6, §10 R3; scenarios in
 * docs/fork/transcripts/T-R3.md).
 *
 * Pins: a valency gap generates a question from a question graph,
 * with the gap named in the trace as its ground; a rival split
 * generates a clarification whose alternatives are the rival
 * derivations; every decline names its ground on the surface;
 * and the discipline's other half — no gap, no question of R3's.
 *
 * The WordNet-dependent tests run LAST in this file: enabling
 * the provider is a module-level toggle, and the clarification
 * machinery's candidates exist only with it on (as the
 * dashboard runs it). Everything before that section runs with
 * the provider off, the turn tests' standing state.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/fork/session";
import { processTurn, type TurnResult } from "../src/fork/turn";
import { planClarification, planRoleQuestion } from "../src/fork/plan";
import { EN_LEXICON, type VerbEntry } from "../src/fork/sentence";
import { CLASSIFICATIONS } from "../src/fork/classify";
import { parse } from "../src/fork/parse";
import { rivalSplits } from "../src/fork/sense";
import { enableWordnetLexicon } from "../src/fork/wordnet-lex";

/** The surface ban: element/polarity/cycle vocabulary in replies. */
const LEAK = /\b(wood|fire|earth|metal|wuxing|yin|yang|element|elements|five elements)\b/i;

function run(session: Session, turns: string[]): TurnResult[] {
  return turns.map((t) => processTurn(session, t));
}
function clean(r: TurnResult): void {
  assert.ok(!LEAK.test(r.reply), `reply leaks ontology vocabulary: ${r.reply}`);
}

/* ---------------- valency-gap questions ---------------- */

test("gap question: an unfilled required theme is asked, generated and grounded", () => {
  const s = newSession();
  const [t1] = run(s, ["I gave him."]);
  clean(t1);
  assert.equal(t1.reply, "You gave. What did you give him?");
  assert.equal(t1.trace.gapQuestion?.verb, "give");
  assert.equal(t1.trace.gapQuestion?.role, "theme");
  assert.match(t1.trace.gapQuestion?.ground ?? "", /valency gap/);
  // The question graph is in the trace, with the questioned
  // element sitting in the theme slot (§6).
  const graph = JSON.parse(t1.trace.replyGraph ?? "{}");
  const q = graph.nodes.find((n: { questionWord?: boolean }) => n.questionWord);
  assert.ok(q, "reply graph carries a questioned node");
  assert.equal(q.lemma, "what");
  assert.ok(graph.edges.some((e: { to: string; relation: string }) => e.to === q.id && e.relation === "theme"));
  // The acknowledgment remains the probe's — the split of
  // origins is recorded, not hidden.
  assert.equal(t1.trace.wordingNotDerived, true);
  assert.match(t1.trace.planNote ?? "", /acknowledgment is the probe's/);
});

test("gap question: the same verb asks nothing once the role is filled", () => {
  const s = newSession();
  const [, t2] = run(s, ["I gave him.", "I gave him the book."]);
  clean(t2);
  assert.equal(t2.trace.gapQuestion, undefined);
  assert.ok(!/What did you give/.test(t2.reply), `no gap question once filled: ${t2.reply}`);
});

test("gap question: an unfilled recipient is asked with who, the theme carried", () => {
  const s = newSession();
  const [t1] = run(s, ["I gave the book."]);
  clean(t1);
  assert.equal(t1.reply, "You gave the book. Who did you give the book?");
  assert.equal(t1.trace.gapQuestion?.role, "recipient");
});

test("gap question: a required prep-slot location is asked with where", () => {
  const s = newSession();
  const [t1] = run(s, ["I put the onions."]);
  clean(t1);
  assert.equal(t1.reply, "You put the onions. Where do you put the onions?");
  assert.equal(t1.trace.gapQuestion?.verb, "put");
  assert.equal(t1.trace.gapQuestion?.role, "location");
});

test("gap question: one gap per turn, the first in frame order, the rest recorded", () => {
  const s = newSession();
  const [t1] = run(s, ["I gave."]);
  clean(t1);
  assert.equal(t1.trace.gapQuestion?.role, "recipient");
  assert.match(t1.trace.planNote ?? "", /further unfilled required roles not asked.*theme/);
});

test("negative control: a fully specified event generates no gap question", () => {
  const s = newSession();
  const [t1] = run(s, ["I read the book."]);
  clean(t1);
  assert.equal(t1.trace.gapQuestion, undefined);
  // RE-PIN (the Normalcy arc, Part 3c): the reply is the plain
  // acknowledgement — was "You read the book. What was in
  // it?", the steering follow-up the arc retires. The
  // control's point stands: no gap question is generated.
  assert.equal(t1.reply, "Ok. Noted.");
});

test("negative control: a fully specified question is answered and asks nothing", () => {
  const s = newSession();
  const [t1] = run(s, ["Is the salt cold?"]);
  clean(t1);
  assert.equal(t1.reply, "The salt is cold.");
  assert.ok(!t1.reply.includes("?"), "the reply asks nothing");
  assert.equal(t1.trace.gapQuestion, undefined);
  assert.equal(t1.trace.clarification, undefined);
});

/* ---------------- the question transform, at plan level ---------------- */

test("planRoleQuestion: the graph is the parser's own wh-shape over the event", () => {
  const verb = EN_LEXICON["give"] as VerbEntry;
  const out = planRoleQuestion({
    verb,
    verbForm: "gave",
    tense: "past",
    agent: { lemma: "you", form: "you" },
    filled: [{ relation: "recipient", lemma: "him", form: "him" }],
    gapRole: "theme",
  });
  assert.equal(out.kind, "graph");
  if (out.kind !== "graph") return;
  assert.equal(out.sentence, "What did you give him?");
  assert.equal(out.graph.query?.relation, "theme");
  assert.equal(out.graph.query?.expectedType, "entity");
  const root = out.graph.meaning.nodes.find((n) => n.id === out.graph.meaning.rootId);
  assert.equal(root?.states?.mood, "interrogative");
});

test("planRoleQuestion: a role with no question word is unrealisable, named", () => {
  const verb = EN_LEXICON["give"] as VerbEntry;
  const out = planRoleQuestion({
    verb,
    verbForm: "gave",
    tense: "past",
    agent: { lemma: "you", form: "you" },
    filled: [],
    gapRole: "degree",
  });
  assert.equal(out.kind, "unrealisable");
  if (out.kind !== "unrealisable") return;
  assert.match(out.reason, /'degree'/);
});

test("planClarification: a disjunctive question over the two rival contents", () => {
  const out = planClarification({
    subject: { lemma: "rest", form: "rest" },
    alternatives: ["sleep", "relief"],
  });
  assert.equal(out.kind, "graph");
  if (out.kind !== "graph") return;
  assert.equal(out.sentence, "Do you mean rest as in sleep, or as in relief?");
  const orEdge = out.graph.meaning.edges.find((e) => e.relation === "links" && e.marker === "or");
  assert.ok(orEdge, "the two predications are joined by an or-marked links edge");
});

/* ---------------- declines cite their ground ---------------- */

test("decline, missing classification: the surface names what is missing", () => {
  // RE-PIN (the Normalcy arc, Part 3d ii): the scenario was
  // "Is the table cold?" — the definite cold open no longer
  // declines; the unanchored-definite move asks after the
  // referent (pinned in fork-normalcy.test.ts). The indefinite
  // form keeps this test's ground exactly: an unclassified
  // subject, declined with the missing piece named.
  const s = newSession();
  const [t1] = run(s, ["Is a table cold?"]);
  clean(t1);
  assert.match(t1.reply, /I have nothing on table in my notes/);
  assert.match(t1.trace.declineReason ?? "", /nothing on table/);
});

test("decline, missing role: a question over an event the record does not hold", () => {
  const s = newSession();
  const [, t2] = run(s, ["I bought the onions.", "What did I put in the soup?"]);
  clean(t2);
  assert.match(t2.reply, /nothing you have told me says what was put/);
  assert.match(t2.trace.declineReason ?? "", /missing role/);
  assert.ok(!/outside what I can work through/.test(t2.reply), "the pre-R3 groundless surface is gone");
});

test("decline, question over a recorded event: the shape ground is named", () => {
  const s = newSession();
  const [, t2] = run(s, ["I bought the onions.", "What did I buy?"]);
  clean(t2);
  assert.match(t2.reply, /asks about something that happened/);
  assert.match(t2.trace.declineReason ?? "", /shape is the decline's ground/);
});

test("decline, yes/no event question: a ground is named, not a bare refusal", () => {
  const s = newSession();
  const [t1] = run(s, ["Did I buy the onions?"]);
  clean(t1);
  assert.match(t1.reply, /I can't answer that from what I know/);
  assert.ok(t1.trace.declineReason, "the trace carries the ground");
});

test("decline, support shortfall, in conversation — and the conversation continues", () => {
  CLASSIFICATIONS.push({
    concept: "pot", element: "Water", aspect: "food", aspectKey: "overall", confidence: 0.35,
    provenance: "fork-creative", note: "T-R3 test fixture — synthetic, mirroring T-R1 R1-4",
  });
  try {
    const s = newSession();
    const [t1, , t3] = run(s, ["Is the pot cold?", "I bought the onions.", "Is the salt cold?"]);
    clean(t1);
    assert.match(t1.reply, /too faint to answer from/);
    assert.equal(t1.trace.pricing?.declined, true);
    assert.match(t1.trace.declineReason ?? "", /below the floor/);
    // A decline is a turn, not an ending (§11.5).
    assert.equal(t3.reply, "The salt is cold.");
  } finally {
    const i = CLASSIFICATIONS.findIndex((c) => c.concept === "pot" && c.confidence === 0.35);
    if (i >= 0) CLASSIFICATIONS.splice(i, 1);
  }
});

/* ---------------- rival splits (WordNet on, as the dashboard runs) ---------------- */

test("rivalSplits: a tie at the top is a split; a decisive context is not", () => {
  enableWordnetLexicon(true);
  const split = rivalSplits(parse("I found rest.", "en"));
  assert.equal(split.length, 1);
  assert.equal(split[0].lemma, "rest");
  assert.deepEqual(
    split[0].rivals.map((r) => [r.element, r.anchor, r.support]),
    [
      ["Water", "sleep", 0],
      ["Earth", "relief", 0],
    ],
  );
  assert.equal(rivalSplits(parse("I found rest in the garden.", "en")).length, 0);
});

test("clarification: the reply asks which rival derivation, alternatives in plain words", () => {
  enableWordnetLexicon(true);
  const s = newSession();
  const [t1] = run(s, ["I found rest."]);
  clean(t1);
  assert.equal(t1.reply, "Do you mean rest as in sleep, or as in relief?");
  assert.equal(t1.trace.wordingNotDerived, false);
  assert.equal(t1.trace.clarification?.lemma, "rest");
  assert.deepEqual(
    t1.trace.clarification?.rivals.map((r) => [r.element, r.anchor]),
    [
      ["Water", "sleep"],
      ["Earth", "relief"],
    ],
  );
  assert.match(t1.trace.clarification?.ground ?? "", /tie-keep convention/);
  assert.ok(t1.trace.replyGraph, "the clarification graph is in the trace");
});

test("clarification: decisive context asks nothing and the turn proceeds", () => {
  enableWordnetLexicon(true);
  const s = newSession();
  const [t1] = run(s, ["I found rest in the garden."]);
  clean(t1);
  assert.equal(t1.trace.clarification, undefined);
  // RE-PIN (the Normalcy arc, Part 3c): the turn proceeds to
  // the plain acknowledgement — was the event echo "You found
  // the rest in the garden." The control's point stands: no
  // clarification is asked where the context is decisive.
  assert.equal(t1.reply, "Ok. Noted.");
});
