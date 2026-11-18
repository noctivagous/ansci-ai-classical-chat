/**
 * fork-social.test.ts — the Social Unit, slice S1 (2026-11-18;
 * design: ansci-social-unit-design.md; rulings 1a–5a).
 *
 * S1 is shadow: recognition kinds at assessment, the social
 * reading annotating objects, and the Interlocutor / Conversation
 * registers living in the Session — with NO reply changes. The
 * reply pins below are the shadow gate: they hold the pre-S1
 * replies for the new kinds' sentences exactly, so any future
 * slice that starts answering them must change these pins
 * deliberately.
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
  assert.equal(s.conversation.phase, "closing");
  assert.equal(s.conversation.lastActs.theirs, "leave-taking");
  // Established-with-them holds the content acts only: the
  // self-naming statement and the winter statement — not the
  // greeting, the thanks, or the leave-taking.
  const established = person(s).filter((o) => s.interlocutor.establishedWithThem.includes(o.id));
  assert.deepEqual(established.map((o) => o.surface), ["I'm Sam.", "The winter is cold."]);
});

test("the phase machine: closing completes on the next arrival, which is then read fresh", () => {
  const s = newSession();
  const [, r2] = run(s, ["Goodbye.", "Hello."]);
  assert.equal(s.conversation.phase, "open", "the second greeting reopened the conversation");
  assert.ok(r2.trace.social?.some((n) => n.includes("conversation closed")), "the closing->closed transition is annotated");
  assert.ok(r2.trace.social?.some((n) => n.includes("reopens")), "the reopening is annotated");
});

test("a repeated greeting in an open conversation is read as repeated", () => {
  const s = newSession();
  const [, r2] = run(s, ["Hello.", "Hello."]);
  assert.ok(r2.trace.social?.some((n) => n.includes("repeated")), JSON.stringify(r2.trace.social));
});

test("shadow: the new kinds change no reply in S1", () => {
  const s = newSession();
  const [bye, who] = run(s, ["Goodbye.", "Who are you?"]);
  assert.equal(bye.reply, "Ok. Noted.");
  assert.equal(
    who.reply,
    "I can't answer that from what I know: I have nothing on you in my notes, and I have no way to connect anything to 'who'.",
  );
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
});
