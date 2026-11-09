/**
 * cskg.test.ts — spike tests over a tiny hand-written TSV fixture.
 * The fixture exercises: normalisation (WordNet-sensed ids, ATOMIC
 * personx events), support counting across datasets, longest-match
 * resolution, statement grounding, trace replay, correction, and the
 * situation core's hemisphere rule (December: north winter / south
 * summer — never month→season alone).
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { test } from "node:test";
import {
  createSession,
  resolveTerms,
  runTurn,
} from "../src/cskg/converse";
import { loadCskg, normaliseNode, type CskgGraph } from "../src/cskg/loader";
import { seasonFor } from "../src/cskg/situation";

const HEADER =
  "id\tnode1\trelation\tnode2\tnode1;label\tnode2;label\trelation;label\trelation;dimension\tsource\tsentence";

function row(n1: string, rel: string, n2: string, src: string): string {
  return ["x", n1, rel, n2, "", "", "", "", src, ""].join("\t");
}

const ROWS = [
  row("/c/en/banana", "/r/IsA", "/c/en/fruit", "CN"),
  row("/c/en/banana", "/r/IsA", "/c/en/fruit", "WN"), // second dataset -> support 2
  row("/c/en/banana", "/r/HasProperty", "/c/en/yellow", "CN"),
  row("/c/en/brown_banana", "/r/HasProperty", "/c/en/sweet", "CN"),
  row("/c/en/onion", "/r/Causes", "/c/en/crying", "CN"),
  row("/c/en/corkscrew", "/r/UsedFor", "/c/en/open_wine_bottles", "CN"),
  row("/c/en/wine_bottle", "/r/MadeOf", "/c/en/glass", "CN"),
  row("/c/en/soup", "/r/IsA", "/c/en/food", "CN"),
  row("/c/en/soup", "/r/AtLocation", "/c/en/bowl", "CN"),
  row("/c/en/common_cold", "/r/IsA", "/c/en/illness", "CN"),
  row("at:personx_chops_onions", "at:xEffect", "/c/en/cry", "AT"),
  row("/c/en/coat/n/wn/artifact", "/r/UsedFor", "/c/en/keep_warm", "CN"),
];

let graphPromise: Promise<CskgGraph> | null = null;
function graph(): Promise<CskgGraph> {
  if (!graphPromise) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-fixture-"));
    const file = path.join(dir, "fixture.tsv");
    fs.writeFileSync(file, [HEADER, ...ROWS].join("\n") + "\n");
    graphPromise = loadCskg(file);
  }
  return graphPromise;
}

test("normaliseNode strips prefixes, senses and personx", () => {
  assert.equal(normaliseNode("/c/en/wine_bottle"), "wine bottle");
  assert.equal(normaliseNode("/c/en/coat/n/wn/artifact"), "coat");
  assert.equal(normaliseNode("at:personx_chops_onions"), "chops onions");
  assert.equal(normaliseNode("/c/fr/banane"), null);
  assert.equal(normaliseNode("/c/en/83/a/wn"), null);
});

test("loader dedups rows and counts dataset support", async () => {
  const g = await graph();
  const banana = g.id("banana")!;
  const isa = g.outEdges(banana, "/r/IsA");
  assert.equal(isa.length, 1);
  assert.equal(isa[0].support, 2);
  assert.deepEqual(isa[0].sources, ["CN", "WN"]);
});

test("longest match wins: brown banana over banana", async () => {
  const g = await graph();
  const found = resolveTerms(g, "my brown bananas are too ripe");
  assert.ok(found.some((f) => f.text === "brown banana"));
});

test("statement turn answers with a grounded fact, never a bare decline", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "I'm making a big pot of soup on Saturday.");
  assert.equal(r.grounded, true);
  assert.match(r.text, /soup/i);
  assert.ok(r.trace.conclusions.length >= 1);
});

test("tool question finds the corkscrew via reverse UsedFor", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "What can I open a wine bottle with if I don't have a corkscrew?");
  assert.equal(r.grounded, true);
  assert.match(r.text, /corkscrew/i);
});

test("why did you say that replays the trace", async () => {
  const g = await graph();
  const s = createSession();
  runTurn(g, s, "What is a banana?");
  const r = runTurn(g, s, "Why did you say that?");
  assert.equal(r.trace.intent, "replay");
  assert.match(r.text, /banana —\/r\/IsA→ fruit/);
});

test("correction re-resolves to the corrected term", async () => {
  const g = await graph();
  const s = createSession();
  runTurn(g, s, "What is a banana?");
  const r = runTurn(g, s, "No, I meant the common cold");
  assert.equal(r.trace.intent, "correction");
  assert.match(r.text, /common cold/i);
});

test("season is a function of (date, hemisphere), never of the month alone", () => {
  const dec = new Date(2026, 11, 15);
  assert.equal(seasonFor(dec, { name: "Chicago", hemisphere: "north", band: "temperate" }), "winter");
  assert.equal(seasonFor(dec, { name: "Sydney", hemisphere: "south", band: "temperate" }), "summer");
  assert.equal(seasonFor(dec, { name: "Nowhere" }), null);
  assert.equal(seasonFor(dec, null), null);
});

test("situation question hedges when no location is configured", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "What season is it?", {});
  assert.match(r.text, /don't know where I am/i);
});
