/**
 * ansci-linkgrammar-routed.test.ts — step 4 routing: with the
 * WASM module warmed, parse() consults the adapter as the
 * primary O-link source (shadow solver stays the fallback).
 *
 * Pins warmed outcomes, not the source: the agreeing
 * ditransitive keeps recipient/theme, inversion invents no
 * agent, the passive keeps its positional reading. The cold
 * path (module never warmed) is covered by the existing
 * suite, which runs unwarmed in its own processes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/ansci/parse";
import {
  ensureLinkGrammarLoaded,
  isLinkGrammarLoaded,
} from "../src/ansci/linkgrammar-wasm";

function edgesOf(p: ReturnType<typeof parse>): string[] {
  return (p.meaning?.edges ?? [])
    .map((e) => `${e.relation}:${p.meaning!.nodes.find((n) => n.id === e.to)?.lemma}`)
    .sort();
}

test("routed: WASM module warms", async (t) => {
  try {
    await ensureLinkGrammarLoaded();
  } catch {
    t.skip("linkgrammar-wasm unavailable");
    return;
  }
  assert.equal(isLinkGrammarLoaded(), true);
});

test("routed: agreeing ditransitive keeps recipient and theme", async (t) => {
  if (!isLinkGrammarLoaded()) {
    t.skip("linkgrammar-wasm unavailable");
    return;
  }
  const on = edgesOf(parse("She gave him a book.", "en"));
  assert.ok(on.includes("recipient:him"), `recipient kept: ${on}`);
  assert.ok(on.includes("theme:book"), `theme kept: ${on}`);
  assert.ok(on.includes("agent:she"), `agent kept: ${on}`);
});

test("routed: inversion still invents no agent", async (t) => {
  if (!isLinkGrammarLoaded()) {
    t.skip("linkgrammar-wasm unavailable");
    return;
  }
  const inv = edgesOf(parse("On the mat sat the cat.", "en"));
  assert.deepEqual(inv, ["location:mat", "theme:cat"]);
});

test("routed: passive keeps its positional reading", async (t) => {
  if (!isLinkGrammarLoaded()) {
    t.skip("linkgrammar-wasm unavailable");
    return;
  }
  const on = edgesOf(parse("The man was bitten by the dog.", "en"));
  assert.ok(on.includes("agent:dog"), `agent kept: ${on}`);
  assert.ok(on.includes("patient:man"), `patient kept: ${on}`);
});
