import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";

function sessionWithGame(): ReturnType<typeof newSession> {
  const session = newSession();
  processTurn(session, "There was a ball game.");
  processTurn(session, "It was in New York.");
  return session;
}

test("a told copular location answers the where-question from the record", () => {
  const session = sessionWithGame();
  const beEvents = session.events.filter((event) => event.verb === "be");
  assert.equal(beEvents.length, 1);
  assert.equal(beEvents[0].theme, "ball");
  assert.equal(beEvents[0].location, "york");
  assert.equal(beEvents[0].locationText, "New York");

  const answer = processTurn(session, "Where was the ball?");
  assert.equal(answer.reply, "You told me the ball is in New York.");
});

test("a question records no location, so a later asking still answers the telling", () => {
  const session = sessionWithGame();
  const eventsBefore = session.events.length;
  processTurn(session, "Was the ball in Boston?");
  assert.equal(session.events.length, eventsBefore);
  const answer = processTurn(session, "Where was the ball?");
  assert.ok(answer.reply.includes("New York"), answer.reply);
  assert.ok(!answer.reply.includes("Boston"), answer.reply);
});

test("what was not told a location honestly declines instead of confabulating", () => {
  const session = sessionWithGame();
  const answer = processTurn(session, "Where was the ball game?");
  assert.ok(answer.reply.includes("nothing in what I know says where"), answer.reply);
});

test("an unresolved pronoun telling records no location", () => {
  const session = newSession();
  processTurn(session, "It was in Boston.");
  assert.equal(
    session.events.filter((event) => event.verb === "be").length,
    0,
    JSON.stringify(session.events),
  );
  const answer = processTurn(session, "Where was it?");
  assert.ok(!answer.reply.includes("You told me"), answer.reply);
});

test("verb-told locations also answer, entity grounding still covers the untold", () => {
  const session = newSession();
  processTurn(session, "The dog sleeps in the garden.");
  const told = processTurn(session, "Where is the dog?");
  assert.ok(told.reply.includes("garden"), told.reply);

  const grounded = processTurn(session, "Where is Oklahoma?");
  assert.ok(grounded.reply.includes("state in south central"), grounded.reply);
});
