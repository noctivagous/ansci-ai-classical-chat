import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/ansci/parse";

test("a controlled request retains its candidate task and token provenance", () => {
  for (const [text, verb, object] of [
    ["Can you help me plan a trip?", "plan", "a trip"],
    ["Can you help me write a letter?", "write", "a letter"],
    ["Can you help me to compare options?", "compare", "options"],
  ]) {
    const parsed = parse(text, "en");
    assert.equal(parsed.embeddedTask?.verb, verb, text);
    assert.equal(parsed.embeddedTask?.object, object, text);
    assert.equal(parsed.connective.tokens[parsed.embeddedTask!.verbToken].toLowerCase(), verb);
    assert.equal(parsed.embeddedTask?.confidence, "candidate");
  }
});

test("incomplete, unrelated, and coordinated requests do not invent an embedded task", () => {
  for (const text of ["Can you help me?", "Can you swim?", "Can you help me plan a trip and write a letter?"]) {
    assert.equal(parse(text, "en").embeddedTask, undefined, text);
  }
});
