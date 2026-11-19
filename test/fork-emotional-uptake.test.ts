/**
 * fork-emotional-uptake.test.ts — the E programme's pins.
 *
 * E1 · Feelings-first registration (2026-11-19): a segment
 * carrying a clear first-person emotion statement registers
 * the feeling EVEN WHEN the clause does not parse — the
 * visitor's own stated feeling is testimony, safe to hold.
 * Detection keys on the system's existing authorities (the
 * classification table's emotion aspect, the EDU's
 * canonicalEmotion map, the LEDU's uncategorised register),
 * never on an ad-hoc word list. Registration runs at the
 * three places a feeling could otherwise be lost: the
 * parse-failure exit, the token exit, and the record block
 * of a merged parse that carried the turn on another root;
 * a composition routes a feeling-carrying unparseable
 * segment through the turn machinery instead of skipping it.
 *
 * The data half: emotion words file under their canonical
 * category and take the category's Suwen element (the
 * category-filing rule, the owner's ruling 2026-11-18) —
 * happy/glad/excited under joy (Fire), sad/gloomy/lonely
 * under grief (Metal), angry under anger (Wood), afraid/
 * scared under fear (Water); 'sorry' files under grief, its
 * climb and the natural filing agreeing. 'guilty' stands in
 * the uncategorised register: it names a feeling, no category
 * claims it reliably, so it registers with NO element and
 * waits on the owner (GAPS §2).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { newSession, type Session } from "../src/fork/session";
import { processTurn, type TurnResult } from "../src/fork/turn";
import { classificationsOf } from "../src/fork/classify";
import { canonicalNameFor, uncategorisedEmotionWord } from "../src/fork/ledu";
import { parse } from "../src/fork/parse";

function run(s: Session, texts: string[]): TurnResult[] {
  return texts.map((t) => processTurn(s, t));
}

/* ---- the data: category filing ---- */

test("E1 data: the everyday feeling words file under their canonical categories, with the category's Suwen element", () => {
  const filing = (w: string) => classificationsOf(w).find((e) => e.aspect === "emotion")?.element;
  assert.equal(filing("happy"), "Fire", "happy under joy");
  assert.equal(filing("glad"), "Fire", "glad under joy");
  assert.equal(filing("excited"), "Fire", "excited under joy — joy at high degree");
  assert.equal(filing("sad"), "Metal", "sad under grief");
  assert.equal(filing("gloomy"), "Metal", "gloomy under grief — grief at low degree");
  assert.equal(filing("lonely"), "Metal", "lonely under grief");
  assert.equal(filing("angry"), "Wood", "angry under anger");
  assert.equal(filing("afraid"), "Water", "afraid under fear");
  assert.equal(filing("scared"), "Water", "scared under fear");
  assert.equal(canonicalNameFor("sorry"), "grief", "sorry files under grief — the climb and the natural filing agree");
  assert.equal(uncategorisedEmotionWord("guilty")?.word, "guilty", "guilty stands in the uncategorised register");
  assert.equal(filing("guilty"), undefined, "guilty carries no element filing");
});

/* ---- feelings first at the exits ---- */

test("E1: a feeling stated in a turn sunk by an unresolved token registers, and the receipt replaces the rephrase (the P-005 shape)", () => {
  const s = newSession();
  const [r] = run(s, [
    "I'm so sad because i've read an article about a newborn girl who died because her parents didn't believe in medication and doctors",
  ]);
  // Re-pinned 2026-11-19 (S4(a) of the S programme): the
  // turn's sinking token was "i've" — a word of ordinary
  // currency, which frequency attestation now attests, so
  // the turn no longer sinks at the token exit at all. It
  // takes the ordinary statement path: the feeling registers
  // (assertions below unchanged) and steers as a parsed
  // feeling does — the P-008 shape's reply — instead of the
  // token-exit receipt. The receipt machinery stands for
  // turns that still sink (see the S programme's tests).
  assert.equal(r.reply, "You were sad. What did you say or do?", "run 2's reply to this turn was the rephrase request");
  const st = s.states.find((x) => x.lemma === "sad");
  assert.equal(st?.holder, "you");
  assert.equal(st?.element, "Metal");
  assert.equal(r.trace.feelingFirst?.lemma, "sad");
});

test("E1: a feeling a merged parse carried past registers from the surface, and steers as a parsed feeling does (the P-008 shape)", () => {
  const s = newSession();
  const [r] = run(s, [
    "i'm so excited because i'm finally going to visit my parents next month! I didn't see them for 3 years",
  ]);
  assert.equal(r.reply, "You were excited. What did you say or do?", "run 2's reply was the bare 'Ok. Noted.' — the feeling fell out of the merged graph");
  const st = s.states.find((x) => x.lemma === "excited");
  assert.equal(st?.element, "Fire");
  assert.equal(st?.origin.kind, "classified");
});

test("E1: a verb-carried feeling clause registers, and the steering takes the predicated shape, not the verb's (the P-013 shape)", () => {
  const s = newSession();
  const [r] = run(s, ["I'm so scared of bugs! i found one in my hair yesterday and almost died"]);
  assert.equal(r.reply, "You were scared. What did you say or do?");
  assert.equal(s.states.find((x) => x.lemma === "scared")?.element, "Water");
});

test("E1: an uncategorised feeling registers without an element and is receipted from the record (the P-001 shape)", () => {
  const s = newSession();
  const [, r] = run(s, ["Hello.", "I felt guilty but realized it was his fault."]);
  assert.equal(r.reply, "Ok. You are guilty.", "run 2's reply to this turn was the bare 'Ok.'");
  const st = s.states.find((x) => x.lemma === "guilty");
  assert.equal(st?.element, undefined, "no element — the category is not reliable, and no fitting is improvised");
  assert.equal(st?.origin.kind, "stated");
});

test("E1: a negated feeling sunk at the token exit registers as negated, and the receipt shows the negation", () => {
  const s = newSession();
  const [r] = run(s, ["I don't feel sad because i've stopped reading the news"]);
  // Re-pinned 2026-11-19 (S4(a) of the S programme): as
  // with the P-005 shape above, "i've" attests by frequency
  // and the turn takes the ordinary statement path. The
  // negated registration stands (the assertion below, and
  // the trace's feelingFirst carries the negation).
  // Re-pinned again 2026-11-19 (X0 of the X programme):
  // the ordinary path's steering form spoke the feeling
  // unnegated over the record's negation ("You were sad.
  // What did you say or do?") — the feelings-register
  // remainder the S programme recorded. X0 gates the
  // steering branches on the record's negation: a negated
  // feeling does not steer, the stand-down is named in
  // trace.steeringNote, and the acknowledgement path
  // answers the turn.
  assert.equal(r.reply, "Ok. Noted.");
  assert.match(r.trace.steeringNote ?? "", /stands negated in the record/);
  assert.equal(s.states.find((x) => x.lemma === "sad")?.negated, true);
});

test("E1: a composition routes a feeling-carrying unparseable segment through the turn machinery instead of skipping it", () => {
  const s = newSession();
  const [r] = run(s, ["The day ended well. I'm so sad, and certainly what I would strive for."]);
  // Re-pinned 2026-11-19 (S5 of the S programme): the
  // composition is now the default route, taken at the head
  // of the turn, so the first segment is answered as the
  // conversation's first act and its bare acknowledgement
  // stands at the head of the composed reply (R3's shaping
  // keeps the first ack before the first substantive
  // reply). The test's point is unchanged: the feeling
  // segment is routed through the turn machinery, registers
  // (below), and steers — it is not skipped.
  assert.equal(r.reply, "Ok. Noted. You were sad. What did you say or do?");
  assert.equal(s.states.find((x) => x.lemma === "sad")?.element, "Metal");
});

/* ---- the disciplines ---- */

test("E1: supersession between registered feelings works — worried stands down when happy is stated", () => {
  const s = newSession();
  const [, r] = run(s, ["I am worried.", "I am happy."]);
  assert.equal(r.reply, "You are not worried, but you are happy.");
  assert.deepEqual(
    s.states.filter((x) => x.holder === "you").map((x) => x.lemma),
    ["happy"],
    "the superseded feeling leaves the standing record",
  );
});

test("E1: only the visitor's own stated feeling registers — a third person's feeling in a sunk turn registers nothing", () => {
  const s = newSession();
  const [r] = run(s, ["She is happy because i've seen it myself"]);
  // Re-pinned 2026-11-19 (S4(a) of the S programme): "i've"
  // attests by frequency, so the turn no longer sinks — it
  // is received as the statement it is. The test's point
  // stands untouched: no feeling registers from someone
  // else's feeling (the assertions below), and no receipt
  // is manufactured.
  assert.equal(r.reply, "Ok. Noted.", "no receipt is manufactured from someone else's feeling");
  assert.equal(s.states.filter((x) => x.origin.kind === "stated" || x.origin.kind === "classified").length, 0);
  assert.equal(r.trace.feelingFirst, undefined);
});

test("E1: a subject-less feeling fragment registers nothing — the frame is the statement, not the word", () => {
  const s = newSession();
  const [r] = run(s, ["kinda getting worried about it"]);
  assert.equal(s.states.find((x) => x.lemma === "worried" && x.turn === 1), undefined);
  assert.equal(r.trace.feelingFirst, undefined);
});

/* ---- E2 · narrative segment breadth ----
 * Sized from run 2's raw results (the analysis is recorded in
 * GAPS §2): of 81 rephrase finals, ~65 exit at the token exit
 * and ~15 at the parse exit. The parse-exit shapes that are
 * general constructions, largest first: (1) a degree adverb
 * grading a quality inside a noun phrase or predicate — no
 * chunk admitted the pair, so the complement threw or dropped
 * its noun; (2) the object-head relative clause after 'have',
 * which the R5 relative branch forced through its subject-head
 * shape and threw on. The token exit's largest general shape:
 * a punctuation-only token sinking a turn its sentence layer
 * took up whole. */

function graphOf(text: string) {
  const g = parse(text, "en");
  const m = g.meaning;
  const byId = new Map(m.nodes.map((n) => [n.id, n.lemma]));
  return {
    root: m.nodes.find((n) => n.id === m.rootId)?.lemma,
    nodes: m.nodes.map((n) => n.lemma),
    hasEdge: (from: string, relation: string, to: string) =>
      m.edges.some((e) => byId.get(e.from) === from && e.relation === relation && byId.get(e.to) === to),
  };
}

test("E2: a degree adverb grading a quality inside a noun phrase parses whole — the noun is the complement, the quality qualifies it, the adverb modulates the quality", () => {
  const g = graphOf("She is a very good teacher.");
  assert.equal(g.root, "teacher");
  assert.ok(g.hasEdge("good", "qualifies", "teacher"));
  assert.ok(g.hasEdge("very", "modulates", "good"));
  const loc = graphOf("My friend was in a really bad spot.");
  assert.equal(loc.root, "spot");
  assert.ok(loc.hasEdge("bad", "qualifies", "spot"));
  assert.ok(loc.hasEdge("really", "modulates", "bad"));
});

test("E2: a degree adverb no longer drops the noun it grades into (the silent face of the same construction)", () => {
  const g = graphOf("It is a really big house.");
  assert.equal(g.root, "house", "before E2 this graphed as the bare quality 'big', the house dropped");
  assert.ok(g.hasEdge("big", "qualifies", "house"));
  const schools = graphOf("They are very good schools.");
  assert.equal(schools.root, "school");
});

test("E2: a degree adverb grading a bare predicate quality parses, with the grading kept", () => {
  const g = graphOf("The spot was really bad.");
  assert.equal(g.root, "bad");
  assert.ok(g.hasEdge("really", "modulates", "bad"));
});

test("E2: a degree adverb with no quality after it still fails — the admission is the pair, not the adverb", () => {
  assert.throws(() => parse("It was a really spot.", "en"), /cannot parse complement/);
});

test("E2: an object-head relative after 'have' parses on the possession — the R5 branch keeps its subject-head shape only", () => {
  const g = graphOf("I have a job that I love.");
  assert.equal(g.root, "have", "the main clause is the possession, not the relative's verb");
  assert.ok(g.hasEdge("have", "theme", "job"));
  const subj = graphOf("The man that I saw was tall.");
  assert.equal(subj.root, "tall", "the subject-head relative is unchanged");
  const s = newSession();
  const [r] = run(s, ["I have a part-time job that I love."]);
  assert.notEqual(r.reply, "Could you put that another way?");
});

test("E2: the perfect keeps its reading — a relative 'that' stops the participle scan, a complementiser and a determiner do not", () => {
  assert.equal(graphOf("I have read the book.").root, "read");
  assert.equal(graphOf("I have read that book.").root, "read");
  assert.equal(graphOf("I have a feeling that I won.").root, "have");
});

test("E2: a punctuation-only token never sinks a turn the sentence layer took up whole; a digit token attests by form (S4(b))", () => {
  const s = newSession();
  const [r] = run(s, [
    "We found a pretty good balance in that I have a part-time job that I love -- and that comes with benefits like insurance",
  ]);
  assert.equal(r.reply, "Ok. Noted.", "run 2 rephrased this turn over its '--'");
  const s2 = newSession();
  const [r2] = run(s2, ["The hardest time in my life was when my best friend died on Christmas of 2007."]);
  // Re-pinned 2026-11-19 (S4(b) of the S programme, a
  // determination recorded in GAPS §6): E2 left the digit
  // token sinking — a number is content, its gap located.
  // The determination changes the attestation question
  // only: a pure digit string attests by its form, as a
  // capital attests a name, so the token no longer triggers
  // the clarification and the turn is taken up whole. The
  // parse's own handling of the number is untouched.
  assert.equal(r2.reply, "Ok. Noted.", "the year attests by its form — the turn is taken up whole (S4(b))");
});
