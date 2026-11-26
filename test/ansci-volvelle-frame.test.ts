/**
 * ansci-volvelle-frame.test.ts — the volvelle build, slice 3:
 * the per-utterance meta frame (semantic-object.ts
 * UtteranceFrame, populated in assess.ts).
 *
 * Every person object now carries the circumstances of its own
 * saying, assembled from the registers that own them: the
 * speaker (a pointer to the interlocutor register, with the
 * name it holds), the addressee (the system, the
 * conversation's standing addressee), the topic (a pointer
 * into the session's topic table, read as it stood before the
 * turn), and the evidence — how the content was delivered, in
 * the three values a turn can actually carry: stated,
 * reported, inferred. session.ts's FrameRecord (the session's
 * time frame) is untouched and is not what this is.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import type { SemanticObject } from "../src/ansci/semantic-object";

function persons(s: Session): SemanticObject[] {
  return s.objects.filter((o) => o.producer === "person");
}

test("a plain statement: the frame is assembled — unnamed speaker, the system addressed, stated delivery, no topic yet", () => {
  const s = newSession();
  processTurn(s, "The soup is hot.");
  const frame = persons(s)[0].frame;
  assert.ok(frame);
  assert.equal(frame.speaker.register, "session.interlocutor");
  assert.equal(frame.speaker.name, undefined);
  assert.equal(frame.speaker.statedThisTurn, false);
  assert.equal(frame.addressee, "system");
  assert.equal(frame.evidence, "stated");
  // The topic table is read as it stood BEFORE the turn: the
  // soup is raised by this very statement, so no topic stands
  // in it yet for the frame to point at.
  assert.equal(frame.topic, undefined);
  assert.equal(s.topics[0]?.lemma, "soup");
});

test("a self-naming statement: the speaker's name lands on the frame, stated this turn; later frames read it from the register", () => {
  const s = newSession();
  processTurn(s, "My name is Sam.");
  const naming = persons(s)[0].frame;
  assert.equal(naming?.speaker.name, "Sam");
  assert.equal(naming?.speaker.statedThisTurn, true);
  processTurn(s, "The soup is hot.");
  const later = persons(s)[1].frame;
  assert.equal(later?.speaker.name, "Sam");
  assert.equal(later?.speaker.statedThisTurn, false);
});

test("a topic-touching turn: the frame points at the topic table's record for the topic", () => {
  const s = newSession();
  processTurn(s, "The soup is hot.");
  processTurn(s, "Is the soup hot?");
  const frame = persons(s)[1].frame;
  assert.equal(frame?.topic, "soup");
  // The pointer is the table's key: the record it names stands
  // in session.topics with its raised/last-touched turns.
  const record = s.topics.find((t) => t.lemma === frame?.topic);
  assert.ok(record);
  assert.equal(record.raisedTurn, 1);
});

test("a question: the frame is assembled for questions as for statements", () => {
  const s = newSession();
  processTurn(s, "Is winter cold?");
  const frame = persons(s)[0].frame;
  assert.ok(frame);
  assert.equal(frame.addressee, "system");
  assert.equal(frame.evidence, "stated");
  assert.equal(frame.speaker.statedThisTurn, false);
});

test("reported delivery: a saying reported from a third person is framed as reported", () => {
  const s = newSession();
  processTurn(s, "Sam said that the soup is hot.");
  assert.equal(persons(s)[0].frame?.evidence, "reported");
});

test("inferred delivery: a saying under the speaker's own hedge is framed as inferred", () => {
  const s = newSession();
  processTurn(s, "I think the soup is hot.");
  assert.equal(persons(s)[0].frame?.evidence, "inferred");
});

test("reply objects carry no frame — their circumstances are read from the object they answer", () => {
  const s = newSession();
  processTurn(s, "Hello.");
  const reply = s.objects.find((o) => o.producer === "system");
  assert.ok(reply);
  assert.equal(reply.frame, undefined);
});
