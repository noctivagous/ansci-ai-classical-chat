/**
 * ansci-wink.test.ts — the Wink provider's degrade contract
 * (probe slice, 2026-11-22).
 *
 * Wink is a recorded runtime dependency (package.json
 * `dependencies`, owner decision 2026-11-22), so on a normal
 * checkout it is present and these tests assert the measured
 * behaviour the probe scripts report. The degrade half of the
 * contract still stands and is still tested: if the packages
 * cannot load (partial/broken install), the provider returns
 * undefined and the suite stays green — absent -> undefined,
 * present -> evidence records with provenance, never a throw.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  winkAnalyse,
  winkAvailable,
  winkCustomEntities,
  winkSentences,
} from "../src/ansci/wink";

test("wink: provider never throws and its availability flag is honest", () => {
  const available = winkAvailable();
  const analysis = winkAnalyse("I booked a room. It was expensive.");
  if (!available) {
    assert.equal(analysis, undefined);
    assert.equal(winkSentences("I booked a room. It was expensive."), undefined);
    assert.equal(
      winkCustomEntities("New York", [{ name: "place", patterns: ["[New] [York]"] }]),
      undefined,
    );
    return;
  }
  assert.ok(analysis, "wink reports available, so analysis must exist");
});

test("wink: when present, SBD splits the demonstrated failure case in two", (t) => {
  if (!winkAvailable()) return t.skip("wink not installed (optional probe dependency)");
  assert.deepEqual(winkSentences("I booked a room. It was expensive."), [
    "I booked a room.",
    "It was expensive.",
  ]);
});

test("wink: when present, tokens carry POS + lemma evidence (booked -> book)", (t) => {
  if (!winkAvailable()) return t.skip("wink not installed (optional probe dependency)");
  const a = winkAnalyse("I booked a room in New York.");
  assert.ok(a);
  assert.equal(a.provenance, "wink-nlp+wink-eng-lite-web-model");
  const booked = a.tokens.find((x) => x.value === "booked");
  assert.equal(booked?.pos, "VERB");
  assert.equal(booked?.lemma, "book");
  // Measured limit, asserted so a model change surfaces here:
  // the lite model's built-in NER finds no proper-name spans.
  assert.equal(a.entities.some((e) => e.value === "New York"), false);
});

test("wink: when present, a gazetteer keeps 'New York' whole as one span", (t) => {
  if (!winkAvailable()) return t.skip("wink not installed (optional probe dependency)");
  const spans = winkCustomEntities("I booked a room in New York.", [
    { name: "place", patterns: ["[New] [York]"] },
  ]);
  assert.deepEqual(spans, [{ value: "New York", type: "place" }]);
});
