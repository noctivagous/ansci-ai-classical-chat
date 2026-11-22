/**
 * ansci-linkgrammar-wasm.test.ts — in-process Link Grammar parsing
 * via the Emscripten module in vendor/linkgrammar-wasm/.
 *
 * Pins the module's contract: a simple sentence parses to the
 * first linkage with the expected words and link labels, links
 * reference valid word indices, repeated parses reuse the loaded
 * dictionary, and a sentence with no valid linkage reports
 * { ok: false } instead of throwing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSentenceWasm } from "../src/ansci/linkgrammar-wasm";

test("wasm: 'This is a test.' parses to the expected first linkage", async () => {
  const r = await parseSentenceWasm("This is a test.");
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.ok(r.linkages >= 1);
  assert.deepEqual(r.words, [
    "LEFT-WALL",
    "this.p",
    "is.v",
    "a",
    "test.n",
    ".",
    "RIGHT-WALL",
  ]);
  const labels = r.links.map((l) => l.label);
  for (const want of ["Xp", "WV", "Wd", "Ss*b", "Osm"]) {
    assert.ok(labels.includes(want), `expected link ${want}`);
  }
  for (const l of r.links) {
    assert.ok(l.left >= 0 && l.right < r.words.length && l.left < l.right);
  }
});

test("wasm: repeated parses reuse the loaded dictionary", async () => {
  const a = await parseSentenceWasm("Dogs bark.");
  const b = await parseSentenceWasm("Dogs bark.");
  assert.equal(a.ok, true);
  assert.deepEqual(a, b);
});

test("wasm: punctuation-only input matches the native CLI null parse", async () => {
  // Native CLI: 1 linkage at null count 3. The parser never throws;
  // uncovered tokens come back bracketed and unlinked.
  const r = await parseSentenceWasm(") (");
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.linkages, 1);
  assert.equal(r.nullCount, 3);
  assert.deepEqual(r.links, []);
});

test("wasm: null-link fallback matches the native CLI (no complete linkage)", async () => {
  // "i got her number though." has no complete linkage; the native
  // CLI reports 2 linkages at null count 2 via panic-mode escalation.
  const r = await parseSentenceWasm("i got her number though.");
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.linkages, 2);
  assert.equal(r.nullCount, 2);
  const ep = r.links
    .filter(
      (l) => !/WALL/.test(r.words[l.left]) && !/WALL/.test(r.words[l.right]),
    )
    .map((l) => `${clean(r.words[l.left])}>${clean(r.words[l.right])}`)
    .sort();
  assert.deepEqual(ep, ["got>number", "her>number"]);
});

function clean(word: string): string {
  return word.replace(/\[!\]$/, "").replace(/\.[a-z][\w-]*$/i, "").toLowerCase();
}

test("wasm: morphology guess marks use the CLI display form", async () => {
  // linkage_get_word carries the full reason ("York[!<capitalized-words>]");
  // the module shortens it to the CLI's "[!]" form, never leaking "<...>".
  const r = await parseSentenceWasm("It was in New York.");
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.ok(r.words.includes("York[!]"));
  assert.ok(r.words.every((w) => !w.includes("<")));
});
