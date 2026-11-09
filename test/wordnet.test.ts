/**
 * wordnet.test.ts — slice 2a: the WordNet base layer.
 *
 * Covers: the extract loads with plausible counts; synsets land on the
 * `base` layer with provenance; the cold disambiguation (temperature sense
 * mapped, illness sense distinct and unmapped); hypernym climbing for words
 * nobody hand-mapped (sleet, hail) with the WordNet segment visible in the
 * path; definitions over WordNet words that leak no ontology; and the
 * scripted chat run end to end.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as path from "path";
import { buildSeedGraph } from "../src/seed";
import { answer } from "../src/reason";
import {
  buildChatGraph,
  climbToAnchor,
  loadWordNetExtract,
  mappedConceptForSynset,
  synsetsForLemma,
} from "../src/wordnet";

const extract = loadWordNetExtract();
const graph = buildChatGraph();

const ONTOLOGY_PATTERN = /\b(Yin|Yang|Wuxing|trigram|Five Elements)\b/;

test("extract loads with plausible WordNet counts", () => {
  assert.equal(extract.edition, "2024");
  assert.ok(extract.synsets.length > 110_000, `synsets: ${extract.synsets.length}`);
  assert.ok(extract.synsets.length < 125_000, `synsets: ${extract.synsets.length}`);
  const rel = extract.relations as Record<string, number[]>;
  assert.ok(rel["hypernym"].length / 2 > 90_000, "hypernym edges survive the trim");
  assert.ok(rel["part"].length / 3 > 20_000, "meronym edges survive the trim");
  assert.ok(rel["antonym"].length / 4 > 7_000, "antonym edges survive the trim");
  assert.ok(rel["similar"].length / 2 > 20_000, "similar-to edges survive the trim");
});

test("synsets merge onto the base layer with wordnet provenance", () => {
  const seed = buildSeedGraph();
  assert.equal(graph.allNodes().length, seed.allNodes().length + extract.synsets.length);
  const winter = graph.getNode("wn-n15493606");
  assert.ok(winter);
  assert.equal(winter.type, "Synset");
  assert.equal(winter.layer, "base");
  assert.equal(winter.properties["source"], "wordnet");
  assert.match(String(winter.properties["gloss"]), /coldest season/);
  // IS_A: snow is a kind of precipitation (both synsets, base edges).
  const isa = graph.outEdges("wn-n11730995", "IS_A").map((e) => e.to);
  assert.ok(isa.includes("wn-n11717219"), `snow IS_A -> ${isa.join(",")}`);
});

test("cold: temperature sense and illness sense are distinct; only temperature is mapped", () => {
  const senses = synsetsForLemma(extract, "cold");
  const tempAdj = senses.find((s) => s.id === "wn-a01258433");
  const illness = senses.find((s) => s.id === "wn-n14389489");
  assert.ok(tempAdj, "temperature adjective synset exists");
  assert.ok(illness, "illness synset exists");
  assert.notEqual(tempAdj.id, illness.id);
  assert.match(tempAdj.gloss, /low or inadequate temperature/);
  assert.match(illness.gloss, /viral infection/);
  // Only the temperature sense carries the mapping into the ontology.
  assert.equal(mappedConceptForSynset(graph, tempAdj.id)?.id, "cold");
  assert.equal(mappedConceptForSynset(graph, illness.id), undefined);
  assert.equal(graph.inEdges(illness.id, "MAPPED_TO").length, 0);
});

test("hypernym climb: sleet (never hand-mapped) reaches the precipitation anchor", () => {
  const climb = climbToAnchor(graph, "wn-n11730546", 6);
  assert.ok(climb);
  assert.equal(climb.anchor.id, "precipitation");
  assert.equal(climb.chain.length, 1);
  assert.equal(climb.chain[0].type, "IS_A");
});

test("climb answer: 'why is sleet cold?' shows the WordNet segment in its path", () => {
  const r = answer(graph, "why is sleet cold?");
  assert.equal(r.intent.intentType, "causal_chain");
  assert.match(r.text, /derived through WordNet/);
  assert.ok(r.paths.length >= 1);
  const types = r.paths[0].steps.map((s) => s.edgeType);
  assert.ok(types.includes("IS_A"), `path types: ${types.join(",")}`);
  assert.ok(types.includes("MAPPED_TO"), `path types: ${types.join(",")}`);
  assert.match(r.paths[0].text, /precipitation \(wn-n11717219\)/);
  assert.match(r.paths[0].text, /HAS_QUALITY/);
});

test("ontology climb picks the climbable sense: hail the ice pellets, not hail the greeting", () => {
  const r = answer(graph, "how does hail fit into ancient Chinese science?");
  assert.equal(r.intent.intentType, "ontology_explanation");
  assert.match(r.text, /precipitation/);
  assert.match(r.text, /Water/);
  const allSteps = r.paths.flatMap((p) => p.steps);
  assert.ok(allSteps.some((s) => s.edgeType === "IS_A" && s.from === "wn-n11688018"));
});

test("definition over a WordNet word uses the gloss and leaks no ontology", () => {
  const r = answer(graph, "what is sleet?");
  assert.equal(r.intent.intentType, "definition");
  assert.match(r.text, /partially melted snow/);
  assert.doesNotMatch(r.text, ONTOLOGY_PATTERN);
});

test("'what is the common cold?' answers the illness sense, not the temperature sense", () => {
  const r = answer(graph, "what is the common cold?");
  assert.match(r.text, /viral infection/);
  assert.doesNotMatch(r.text, /inadequate temperature/);
});

test("merged graph keeps the slice-1 derivation exact (winter)", () => {
  const r = answer(graph, "why is winter cold?");
  assert.equal(
    r.paths[0].text,
    "winter —ELEMENT_OF→ Water —POLARITY_OF→ Yin —HAS_QUALITY→ cold",
  );
});

test("scripted chat answers its questions end to end", () => {
  const repoRoot = path.join(__dirname, "..", "..");
  const out = execFileSync(
    process.execPath,
    [path.join(repoRoot, "dist", "src", "chat.js"), "--script", path.join(repoRoot, "examples", "chat-demo.txt")],
    { encoding: "utf-8", timeout: 120_000 },
  );
  assert.match(out, /Q: why is winter cold\?/);
  assert.match(out, /winter —ELEMENT_OF→ Water —POLARITY_OF→ Yin —HAS_QUALITY→ cold/);
  assert.match(out, /—IS_A \(0\.90\)→ precipitation \(wn-n11717219\)/);
  assert.match(out, /viral infection/);
});

test("chat REPL exits cleanly on EOF", () => {
  const repoRoot = path.join(__dirname, "..", "..");
  const out = execFileSync(process.execPath, [path.join(repoRoot, "dist", "src", "chat.js")], {
    encoding: "utf-8",
    input: "why is snow cold?\n",
    timeout: 120_000,
  });
  assert.match(out, /snow is cold in this system/);
  assert.match(out, /bye/);
});
