import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/ansci/parse";

function rootStates(text: string): Record<string, unknown> {
  const parsed = parse(text, "en");
  const graph = parsed.meaning;
  const root = graph.nodes.find((node) => node.id === graph.rootId);
  assert.ok(root, `no root node for: ${text}`);
  return (root.states ?? {}) as Record<string, unknown>;
}

test("passive tense rides the be-carrier: was is past, is is present", () => {
  const past = rootStates("The man was bitten by the dog.");
  assert.equal(past.voice, "passive");
  assert.equal(past.tense, "past");
  assert.equal(past.aux, "was");

  const present = rootStates("The man is bitten by the dog.");
  assert.equal(present.voice, "passive");
  assert.equal(present.tense, "present");
  assert.equal(present.aux, "is");
});

test("the carrier change does not disturb active, did, or question tense", () => {
  assert.equal(rootStates("The dog bit the man.").tense, "past");
  assert.equal(rootStates("The dog bites the man.").tense, "present");
  assert.equal(rootStates("Did the dog bite the man?").tense, "past");
  assert.equal(rootStates("Was the man bitten by the dog?").tense, "past");
  assert.equal(rootStates("The dog did not bite the man.").tense, "past");
});
