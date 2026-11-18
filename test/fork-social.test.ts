/**
 * fork-social.test.ts — the Social Unit, slices S1–S2
 * (2026-11-18; design: ansci-social-unit-design.md; rulings
 * 1a–5a; S2 under the owner's sequence authorization for
 * S2–S5).
 *
 * S1 was shadow: recognition kinds at assessment, the social
 * reading annotating objects, and the Interlocutor /
 * Conversation registers living in the Session — with NO reply
 * changes, pinned exactly. S2 makes the first demands live:
 * the Planner discharges greeting-return, farewell-return and
 * thanks-receipt as authored moves, the obligations register
 * tracks what is owed, and the phase is consulted before
 * initiative. The S1 pins S2 deliberately changes (the farewell
 * reply, the closing phase) are corrected in place with their
 * reasons, per the project's premise-correction discipline;
 * the self-query pin stands until S3.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/fork/session";
import { processTurn, type TurnResult } from "../src/fork/turn";
import { MemoryInterlocutorStore } from "../src/fork/interlocutor-store";

function run(session: Session, texts: string[]): TurnResult[] {
  return texts.map((t) => processTurn(session, t));
}
function person(session: Session) {
  return session.objects.filter((o) => o.producer === "person");
}

test("assessment kinds: leave-taking, thanks (both shapes), self-query", () => {
  const s = newSession();
  run(s, ["Goodbye.", "Bye.", "Thanks.", "Thank you.", "Who are you?", "What are you?", "Hello."]);
  const kinds = person(s).map((o) => o.act.kind);
  assert.deepEqual(kinds, ["leave-taking", "leave-taking", "thanks", "thanks", "self-query", "self-query", "greeting"]);
  const objs = person(s);
  assert.equal(objs[0].act.ritual, true, "leave-taking is ritual");
  assert.equal(objs[2].act.ritual, true, "thanks is ritual");
  assert.equal(objs[4].act.selfQuery, "identity");
});

test("the registers: a conversation's social shape accumulates", () => {
  const s = newSession();
  run(s, ["Hello.", "I'm Sam.", "The winter is cold.", "Thank you.", "Goodbye."]);
  assert.equal(s.interlocutor.contact, "first");
  assert.equal(s.interlocutor.identity?.name, "Sam");
  assert.equal(s.interlocutor.identity?.learnedHow, "stated");
  assert.equal(s.interlocutor.socialState.greeted, true);
  assert.equal(s.interlocutor.socialState.thankedCount, 1);
  assert.equal(s.interlocutor.socialState.leaveTaken, true);
  // S2 correction: S1 left the phase at "closing" (the farewell
  // was presumed exchanged on the NEXT turn's arrival). Since
  // S2 the Planner's farewell move discharges in the
  // leave-taking turn itself, and the discharge completes the
  // closing there — the phase ends "closed".
  assert.equal(s.conversation.phase, "closed");
  assert.equal(s.conversation.lastActs.theirs, "leave-taking");
  // Established-with-them holds the content acts only: the
  // self-naming statement and the winter statement — not the
  // greeting, the thanks, or the leave-taking.
  const established = person(s).filter((o) => s.interlocutor.establishedWithThem.includes(o.id));
  assert.deepEqual(established.map((o) => o.surface), ["I'm Sam.", "The winter is cold."]);
});

test("the phase machine: the farewell closes in its own turn; the next arrival reopens fresh", () => {
  const s = newSession();
  const [r1, r2] = run(s, ["Goodbye.", "Hello."]);
  assert.equal(r1.reply, "Goodbye.");
  assert.equal(r2.reply, "Hello.");
  assert.equal(s.conversation.phase, "open", "the second greeting reopened the conversation and discharged its opening");
  assert.ok(r2.trace.social?.some((n) => n.includes("fresh opening")), "the reopening is annotated");
});

test("a repeated greeting in an open conversation is read as repeated", () => {
  const s = newSession();
  const [, r2] = run(s, ["Hello.", "Hello."]);
  assert.ok(r2.trace.social?.some((n) => n.includes("repeated")), JSON.stringify(r2.trace.social));
});

test("S2: the farewell is answered; the self-query still waits for S3", () => {
  const s = newSession();
  const [bye] = run(s, ["Goodbye."]);
  // S1's shadow pin was "Ok. Noted." — the leave-taking fell
  // through to the statement steering. S2 answers it with the
  // farewell mirror; the pin changes deliberately, here.
  assert.equal(bye.reply, "Goodbye.");
});

/* ---------------- S3: self-facts, answered from record ---------------- */

const IDENTITY_ANSWER =
  "I am AnSci. I am a small classical-AI system. I understand simple English statements and questions, and I answer from what I know, saying so when I don't.";
const CAPABILITY_ANSWER =
  "I can talk over simple statements and questions. I remember what this conversation has established. I can explain what I based an answer on, in plain terms. My knowledge is small and fixed.";

test("S3 identity: answered from the Identity table, at the opening and mid-conversation", () => {
  const s = newSession();
  const [who] = run(s, ["Who are you?"]);
  assert.equal(who.reply, IDENTITY_ANSWER);
  assert.equal(who.trace.replyObject?.kind, "reply", "the identity answer is an authored reply object");
  assert.deepEqual(s.conversation.obligations, [], "the self-answer demand is discharged");

  const s2 = newSession();
  const [, , what] = run(s2, ["Hello.", "The winter is cold.", "What are you?"]);
  assert.equal(what.reply, IDENTITY_ANSWER);
  assert.deepEqual(s2.conversation.obligations, []);
});

test("S3 capability: 'What can you do?' parses, is recognised, and is answered from the table", () => {
  const s = newSession();
  const [r] = run(s, ["What can you do?"]);
  assert.equal(r.reply, CAPABILITY_ANSWER);
  const obj = person(s)[0];
  assert.equal(obj.act.kind, "self-query");
  assert.equal(obj.act.selfQuery, "capability");
  assert.deepEqual(s.conversation.obligations, [], "the self-answer demand is discharged");

  const s2 = newSession();
  const [, r2] = run(s2, ["Hello.", "What can you do?"]);
  assert.equal(r2.reply, CAPABILITY_ANSWER, "the same answer mid-conversation");
});

test("S3: 'What do you do?' is not a capability self-query — the modal is the difference", () => {
  const s = newSession();
  run(s, ["What do you do?"]);
  const obj = person(s)[0];
  assert.equal(obj.act.kind, "question", "no modal 'can', no self-query: it asks after an occupation");
  assert.equal(obj.act.selfQuery, undefined);
});

/* ---------------- S4: the clarification move ---------------- */

test("S4 sense (b): the split is asked, the fill settles the reading, and it is not asked again", () => {
  const s = newSession();
  const [ask, fill, next] = run(s, ["The stock is hot.", "Broth.", "The stock is thick."]);
  assert.equal(ask.reply, "Do you mean the stock as in mammal, or as in broth?");
  assert.equal(s.conversation.pending, null, "the fill closed the pending");
  assert.equal(fill.reply, "Noted — as in broth.");
  assert.equal(fill.trace.clarificationFill?.outcome, "filled");
  assert.equal(s.conversation.clarifiedSenses["stock"]?.anchor, "broth");
  assert.ok(!next.reply.includes("Do you mean"), "a settled reading is not re-asked");
});

test("S4 sense (b): two failed attempts — re-ask once, then proceed on the best reading and say so", () => {
  const s = newSession();
  const [, reask, fallback] = run(s, ["The stock is hot.", "Er.", "Hmm."]);
  assert.equal(reask.reply, "Do you mean the stock as in mammal, or as in broth?", "the question is re-asked once");
  assert.equal(reask.trace.clarificationFill?.outcome, "attempt-failed");
  assert.ok(fallback.reply.startsWith("I'll take 'stock' in the mammal sense, then."), "the fallback names the best reading");
  assert.equal(fallback.trace.clarificationFill?.outcome, "fallback");
  assert.equal(s.conversation.clarifiedSenses["stock"]?.anchor, "mammal", "the best reading stands as settled");
  assert.equal(s.conversation.pending, null, "no third clarification on the same point");
});

test("S4 token (a): a weakly resolved token is asked about, and the fill's word is what gets processed", () => {
  const s = newSession();
  const [ask, fill] = run(s, ["The wethr is cold.", "Weather."]);
  assert.equal(ask.reply, "Did you mean water, or weather?");
  assert.equal(fill.trace.clarificationFill?.outcome, "filled");
  assert.equal(fill.reply, "Ok.", "the original sentence, with 'weather' standing in it, is the turn that gets processed");
  assert.ok(
    s.states.some((st) => st.holder === "weather"),
    "what was recorded is the weather statement, not the guessed one",
  );
  assert.ok(!s.states.some((st) => st.holder === "water"), "the guessed reading was never recorded");
  assert.equal(s.conversation.pending, null);
});

test("S4 token (a): at the attempt limit the system proceeds on its best reading and says so", () => {
  const s = newSession();
  const [, , fallback] = run(s, ["The wethr is cold.", "Er.", "Hmm."]);
  assert.ok(fallback.reply.startsWith("I'll take 'wethr' as water."), "the resolver's applied reading, named as a proceeding-on");
  assert.equal(s.conversation.pending, null);
});

test("S4: a usable new turn abandons a standing clarification — the point is not chased", () => {
  const s = newSession();
  const [, moved, again] = run(s, ["The stock is hot.", "The winter is cold.", "The stock is thick."]);
  assert.equal(moved.trace.clarificationFill?.outcome, "abandoned");
  assert.equal(again.reply, "Do you mean the stock as in mammal, or as in broth?", "an abandoned point may be raised again when it recurs");
});

test("S4 referent (c): the context request opens a pending the continuation answers", () => {
  const s = newSession();
  const [ask] = run(s, ["Is the table cold?"]);
  assert.equal(ask.reply, "What table? You just started talking.");
  assert.equal(s.conversation.pending?.point, "referent:table");
  const [, answer] = run(s, ["The kitchen table by the window.", "Is the table cold?"]);
  assert.equal(s.conversation.pending, null, "the continuation closed the pending");
  assert.equal(answer.reply, "The table is cold.", "with the referent grounded, the question is answered");
});

test("S4 whole utterance (d): an unusable sentence gets a rephrase request that names no failure", () => {
  const s = newSession();
  const [ask, next] = run(s, ["Blorf wizzle snarp.", "The soup is hot."]);
  assert.equal(ask.reply, "Could you put that another way?");
  assert.equal(next.reply, "Ok.", "the rephrase is processed as itself; the pending closed on the continuation");
  assert.equal(s.conversation.pending, null);
});

/* ---------------- S5: the premise stance ---------------- */

test("S5 graph-contradiction + insistence by re-asking: the stance, then the supposition", () => {
  // One conversation carries the whole arc: within a process,
  // a dual-category quality's first parse is the copula shape
  // and later parses may take the verb shape (the sentence
  // layer's recorded probe-poisoning, S2) — the insistence
  // machinery is built to read both shapes, and this arc
  // exercises exactly that.
  const s = newSession();
  const [r, insist] = run(s, ["Why is winter warm?", "Why is winter warm?"]);
  assert.equal(r.reply, "Winter is cold, as I have it. Did you mean why winter is cold?");
  assert.equal(r.trace.stance?.source, "graph");
  assert.equal(r.trace.stance?.outcome, "stated");
  assert.ok(insist.reply.startsWith("Supposing winter were warm"), "the repeated question is answered under the supposition framing");
  assert.equal(insist.trace.stance?.outcome, "insistence-met-as-supposition");
  assert.equal(s.conversation.disagreements.length, 1);
  assert.equal(s.conversation.disagreements[0].premise, "winter is warm");
  assert.equal(s.conversation.pending, null, "the insistence closes the stance-repair pending");
  assert.ok(!s.states.some((st) => st.holder === "winter" && st.lemma === "warm"), "winter is never recorded as warm");
});

test("S5 record-contradiction + insistence by assertion: the record's fact, then non-adoption", () => {
  const s = newSession();
  const [, r, insist] = run(s, ["The cat is black.", "Why is the cat white?", "The cat is white."]);
  assert.equal(r.reply, "The cat is black. Did you mean why the cat is black?");
  assert.equal(r.trace.stance?.source, "record");
  assert.equal(insist.reply, "Cat is black, as I have it.");
  assert.equal(insist.trace.stance?.outcome, "insistence-not-adopted");
  assert.equal(s.conversation.disagreements.length, 1);
  assert.equal(s.conversation.disagreements[0].premise, "cat is white");
  assert.ok(!s.states.some((st) => st.holder === "cat" && st.lemma === "white"), "the insisted assertion does not enter the record as a state");
  assert.ok(s.states.some((st) => st.holder === "cat" && st.lemma === "black"), "the established state stands");
});

test("S5: mere absence is not a contradiction — no stance is taken", () => {
  const s = newSession();
  const [r] = run(s, ["Why is winter salty?"]);
  assert.equal(r.trace.stance, undefined);
  assert.ok(r.reply.startsWith("I can't answer that from what I know"), "an uncontradicted gap still declines as a don't-know");
});

/* ---------------- S6: persistence across conversations ---------------- */

test("S6: a returner is recognised only on stating their identity — and then the picture is loaded", () => {
  const store = new MemoryInterlocutorStore();
  const first = newSession(undefined, undefined, { interlocutorStore: store });
  run(first, ["Hello.", "I'm Sam.", "The winter is cold.", "Goodbye."]);
  const record = store.get("sam");
  assert.ok(record, "the first conversation left a record under the stated name");
  assert.equal(record.conversations, 1);
  assert.ok(record.establishedTopics.includes("winter"), "what was established is carried as topics");

  const second = newSession(undefined, undefined, { interlocutorStore: store });
  const [greeting] = run(second, ["Hello."]);
  assert.equal(greeting.reply, "Hello.", "no recognition is performed before identity is stated");
  assert.equal(second.interlocutor.contact, "first");
  const [naming] = run(second, ["I'm Sam."]);
  assert.equal(naming.reply, "Welcome back, Sam.");
  assert.equal(second.interlocutor.contact, "returning");
  assert.equal(second.interlocutor.priorConversations, 1);
  assert.ok(second.interlocutor.priorEstablished.includes("winter"), "the earlier conversation's established topics are loaded");
  assert.equal(store.get("sam")?.conversations, 2, "the second conversation is counted under the same identity");
});

test("S6: a visitor who never gives a name writes nothing and is first contact every time", () => {
  const store = new MemoryInterlocutorStore();
  const a = newSession(undefined, undefined, { interlocutorStore: store });
  run(a, ["Hello.", "The soup is hot.", "Goodbye."]);
  const b = newSession(undefined, undefined, { interlocutorStore: store });
  const [greeting] = run(b, ["Hello."]);
  assert.equal(greeting.reply, "Hello.");
  assert.equal(b.interlocutor.contact, "first");
  assert.deepEqual(store.keys(), [], "no identity, no record — nothing persists");
});

test("S6: a different name is a different record — no recognition crosses identities", () => {
  const store = new MemoryInterlocutorStore();
  const sam = newSession(undefined, undefined, { interlocutorStore: store });
  run(sam, ["I'm Sam.", "Goodbye."]);
  const mary = newSession(undefined, undefined, { interlocutorStore: store });
  const [naming] = run(mary, ["I am Mary."]);
  assert.equal(naming.reply, "Ok. Noted.", "Mary's first naming gets no return acknowledgement");
  assert.equal(mary.interlocutor.contact, "first");
  assert.deepEqual(store.keys().sort(), ["mary", "sam"]);
});

test("the reading reaches the trace and the map path only when it has something to say", () => {
  const s = newSession();
  const [hello, plain] = run(s, ["Hello.", "The winter is cold."]);
  assert.ok(hello.trace.social?.length, "the greeting turn carries social notes");
  assert.ok(hello.trace.mapPath?.includes("awareness/social-unit"));
  assert.equal(plain.trace.social, undefined, "a plain statement's bookkeeping is silent");
  assert.ok(!plain.trace.mapPath?.includes("awareness/social-unit"));
});

test("a fresh session starts with the design's empty registers", () => {
  const s = newSession();
  assert.equal(s.interlocutor.contact, "not-yet-known");
  assert.equal(s.interlocutor.identity, null);
  assert.deepEqual(s.interlocutor.establishedWithThem, []);
  assert.equal(s.conversation.phase, "opening");
  assert.equal(s.conversation.pending, null);
  assert.deepEqual(s.conversation.obligations, []);
});

/* ---------------- S2: the moves through the Planner ---------------- */

test("S2 farewell: the mirror returns the register the person chose, as a closing reply object", () => {
  for (const [said, expected] of [["Goodbye.", "Goodbye."], ["Bye.", "Bye."], ["Farewell.", "Farewell."]] as const) {
    const s = newSession();
    const [r] = run(s, [said]);
    assert.equal(r.reply, expected);
    assert.equal(r.trace.replyObject?.kind, "reply");
    const replyObject = s.objects.find((o) => o.producer === "system");
    assert.equal(replyObject?.act.force, "return farewell");
    assert.equal(replyObject?.act.streamRole, "closes");
    assert.equal(replyObject?.act.ritual, true);
    assert.deepEqual(s.conversation.obligations, [], "the farewell-return demand is discharged");
    assert.equal(s.conversation.phase, "closed");
  }
});

test("S2 thanks: the receipt move, and the conversation's thread survives it", () => {
  const s = newSession();
  const [, r2] = run(s, ["Hello.", "Thank you."]);
  assert.equal(r2.reply, "You are welcome.");
  const replyObject = [...s.objects].reverse().find((o) => o.producer === "system");
  assert.equal(replyObject?.act.force, "thanks receipt");
  assert.equal(replyObject?.act.ritual, true);
  assert.deepEqual(s.conversation.obligations, [], "greeting-return and thanks-receipt are both discharged");
  assert.equal(s.conversation.phase, "open", "a thanks does not close or divert the conversation");
  assert.equal(s.interlocutor.socialState.thankedCount, 1);
});

test("S2 greeting: the mirror discharges the greeting-return obligation", () => {
  const s = newSession();
  const [r] = run(s, ["Hello."]);
  assert.equal(r.reply, "Hello.");
  assert.deepEqual(s.conversation.obligations, []);
  assert.equal(s.conversation.phase, "open");
});

test("S2 initiative: no initiative move appends itself to a farewell", () => {
  // The R6-1 staging: the furious state (turn 1) is old enough
  // to be taken up by turn 3 — but turn 3 is the farewell, and
  // the phase guard (closing/closed) bars initiative there.
  const s = newSession();
  const results = run(s, ["I was furious.", "I heard the news.", "Goodbye."]);
  const t3 = results[2];
  assert.equal(t3.reply, "Goodbye.");
  assert.equal(t3.trace.initiative, undefined);
});

test("S2 reopening: a statement after goodbye is read as a fresh opening, not an error", () => {
  const s = newSession();
  const [, r2] = run(s, ["Goodbye.", "The winter is cold."]);
  assert.ok(r2.trace.social?.some((n) => n.includes("fresh opening")), JSON.stringify(r2.trace.social));
  assert.equal(s.conversation.phase, "opening", "reopened, its opening not yet discharged by a greeting");
});
