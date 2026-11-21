import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";

test("where-event question answers from a matching recorded agent and location", () => {
  const session = newSession();
  processTurn(session, "The team plays in Chicago.");
  const result = processTurn(session, "Where does the team play?");
  assert.equal(result.reply, "You told me the team plays in Chicago.");
  assert.deepEqual(result.trace.recordAnswer?.event, { verb: "play", role: "location", filler: "chicago", turn: 1 });
});

test("a nearby entity location is not treated as the team's event location", () => {
  const session = newSession();
  processTurn(session, "The baseball is in New York.");
  const result = processTurn(session, "Where does the team play?");
  assert.equal(result.trace.recordAnswer, undefined);
  assert.ok(result.trace.declineReason);
});

test("a relative clause inside a question is not recorded as an asserted event", () => {
  const session = newSession();
  const asked = processTurn(session, "You know the team that plays in New York?");
  assert.equal(asked.reply, "I don't know which team you mean.");
  assert.equal(session.events.some((event) => event.verb === "play"), false);
  const result = processTurn(session, "Where does the team play?");
  assert.equal(result.trace.recordAnswer, undefined);
  assert.ok(result.trace.declineReason);
});

test("a know-question can use an earlier event to identify a relative description", () => {
  const session = newSession();
  processTurn(session, "The team plays in New York.");
  const result = processTurn(session, "You know the team that plays in New York?");
  assert.equal(result.reply, "Yes. You told me the team plays in New York.");
  assert.equal(result.trace.recordAnswer?.event?.turn, 1);
});

test("conflicting recorded locations for the same agent and event prompt clarification", () => {
  const session = newSession();
  processTurn(session, "The team plays in Chicago.");
  processTurn(session, "The team plays in Boston.");
  const result = processTurn(session, "Where does the team play?");
  assert.equal(result.reply, "I have more than one location recorded: boston and chicago. Which one do you mean?");
  assert.equal(result.trace.recordAnswer, undefined);
});
