import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/ansci/parse";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";

test("copular scene update resolves a pronoun subject to the most recent compatible entity", () => {
  const session = newSession();
  processTurn(session, "There was a house.");
  const result = processTurn(session, "It was in Chicago.");
  assert.deepEqual(result.trace.resolutions, [{ pronoun: "it", resolvedTo: "house" }]);
  const object = [...session.objects].reverse().find((o) => o.producer === "person" && o.surface === "It was in Chicago.");
  assert.equal(object?.senses?.scene?.arrangements[0]?.figure, "house");
});

test("object NP can contain a subject relative with its own agent and location", () => {
  const parsed = parse("You know the house that stands in Chicago?", "en");
  const byId = new Map(parsed.meaning.nodes.map((n) => [n.id, n.lemma.toLowerCase()]));
  const edges = parsed.meaning.edges.map((e) => [byId.get(e.from), e.relation, byId.get(e.to)]);
  const has = (a: string, relation: string, b: string) => edges.some((e) => e[0] === a && e[1] === relation && e[2] === b);
  assert.ok(has("know", "theme", "house"));
  assert.ok(has("house", "modifier", "stand"));
  assert.ok(has("stand", "agent", "house"));
  assert.ok(has("stand", "location", "chicago"));
});

test("a bare nominal follow-up records continuity with a prior compound topic", () => {
  const session = newSession();
  processTurn(session, "There was a train station.");
  processTurn(session, "terminal");
  const object = [...session.objects].reverse().find((o) => o.producer === "person" && o.surface === "terminal");
  assert.deepEqual(object?.links.continuesTopic, {
    objectId: session.objects.find((o) => o.producer === "person" && o.surface === "There was a train station.")?.id,
    topic: "station",
  });
});
