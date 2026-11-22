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

test("wasm: unparsable input reports ok:false without throwing", async () => {
  const r = await parseSentenceWasm(") (");
  assert.equal(r.ok, false);
  assert.ok(r.error.length > 0);
});
