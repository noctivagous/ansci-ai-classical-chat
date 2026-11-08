import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSeedGraph } from "../src/seed";
import { Graph, passesThreshold } from "../src/graph";
import { answer, interpret } from "../src/reason";

const graph = buildSeedGraph();
const ONTOLOGY = /\b(Yin|Yang|Wood|Fire|Earth|Metal|Water|Wuxing)\b/;

test("seed: atomic structure is complete and serializable", () => {
  for (const name of ["Yin", "Yang", "Wood", "Fire", "Earth", "Metal", "Water",
    "Qian", "Kun", "Zhen", "Xun", "Kan", "Li", "Gen", "Dui"]) {
    assert.ok(graph.nodeByName(name), `missing atomic node ${name}`);
  }
  // Generation cycle runs all the way round back to Wood
  const gen = (from: string) =>
    graph.getNode(graph.outEdges(graph.nodeByName(from)!.id, "MUTUAL_GENERATION")[0].to)!.name;
  assert.equal(gen("Wood"), "Fire");
  assert.equal(gen("Fire"), "Earth");
  assert.equal(gen("Earth"), "Metal");
  assert.equal(gen("Metal"), "Water");
  assert.equal(gen("Water"), "Wood");
  // Restraint cycle: Wood→Earth→Water→Fire→Metal→Wood
  const res = (from: string) =>
    graph.getNode(graph.outEdges(graph.nodeByName(from)!.id, "MUTUAL_RESTRAINT")[0].to)!.name;
  assert.equal(res("Wood"), "Earth");
  assert.equal(res("Earth"), "Water");
  assert.equal(res("Water"), "Fire");
  assert.equal(res("Fire"), "Metal");
  assert.equal(res("Metal"), "Wood");
  // CONTAINS_SEED both ways
  assert.equal(graph.outEdges("yin", "CONTAINS_SEED")[0].to, "yang");
  assert.equal(graph.outEdges("yang", "CONTAINS_SEED")[0].to, "yin");
  // JSON round-trip (graph is JSON-serializable end to end)
  const round = Graph.fromJSON(JSON.parse(JSON.stringify(graph.toJSON())));
  assert.equal(round.allNodes().length, graph.allNodes().length);
  assert.equal(round.allEdges().length, graph.allEdges().length);
  // Correspondence table: every element has sound, colour and taste
  for (const el of ["wood", "fire", "earth", "metal", "water"]) {
    const cats = new Set(
      graph.inEdges(el, "CORRESPONDS_TO").map((e) => graph.getNode(e.from)!.properties["category"]),
    );
    for (const c of ["sound", "color", "taste"]) assert.ok(cats.has(c), `${el} lacks ${c}`);
  }
});

test("winter is cold — derived via shared prior, never a direct edge", () => {
  // The design invariant: no direct winter→cold edge exists to cheat with.
  assert.equal(
    graph.allEdges().some((e) => e.from === "winter" && e.to === "cold"),
    false,
  );
  const a = answer(graph, "why is winter cold?");
  assert.equal(a.intent.intentType, "causal_chain");
  assert.equal(a.intent.includeOntology, true);
  assert.match(a.text, /cold/);
  const pathNames = a.paths[0].steps.map((s) => s.toName);
  assert.deepEqual(pathNames, ["Water", "Yin", "cold"]);
  const edgeTypes = a.paths[0].steps.map((s) => s.edgeType);
  assert.deepEqual(edgeTypes, ["ELEMENT_OF", "POLARITY_OF", "HAS_QUALITY"]);
});

test("night is cooler — same prior, different entry point", () => {
  const a = answer(graph, "why is the night cooler?");
  assert.match(a.text, /Yes/);
  const steps = a.paths[0].steps;
  assert.ok(steps.some((s) => s.toName === "Yin"));
  assert.equal(steps[steps.length - 1].toName, "cold");
});

test("summer is warm — the Yang mirror of the winter derivation", () => {
  const a = answer(graph, "why is summer warm?");
  const pathNames = a.paths[0].steps.map((s) => s.toName);
  assert.deepEqual(pathNames, ["Fire", "Yang", "warm"]);
});

test("definition answers do not leak ontology", () => {
  const a = answer(graph, "what is a derivative in math?");
  assert.equal(a.intent.intentType, "definition");
  assert.equal(a.intent.includeOntology, false);
  assert.match(a.text, /instantaneous rate of change/);
  assert.equal(ONTOLOGY.test(a.text), false, `leaked ontology into: ${a.text}`);
  const w = answer(graph, "what is winter?");
  assert.equal(ONTOLOGY.test(w.text), false, `leaked ontology into: ${w.text}`);
});

test("derivative ontology answer shows its path and confidences", () => {
  const a = answer(graph, "how does the concept of derivative fit into ancient Chinese science?");
  assert.equal(a.intent.intentType, "ontology_explanation");
  assert.equal(a.intent.includeOntology, true);
  assert.match(a.text, /Yang/);
  assert.match(a.text, /Fire/);
  assert.match(a.text, /0\.92/);
  assert.match(a.text, /mutually rooted with integral/i);
  const targets = a.usedEdges.map((e) => graph.getNode(e.to)?.name);
  assert.ok(targets.includes("Yang") && targets.includes("Fire"));
});

test("generation cycle: what season follows winter is spring", () => {
  const a = answer(graph, "what season follows winter?");
  assert.match(a.text, /spring follows winter/i);
  const types = a.paths[0].steps.map((s) => s.edgeType);
  assert.ok(types.includes("MUTUAL_GENERATION"));
});

test("confidence threshold filters weak mappings (mercury)", () => {
  const mercury = graph.nodeByName("mercury")!;
  const edge = graph.outEdges(mercury.id, "HAS_ELEMENT")[0];
  assert.equal(edge.confidence, 0.55);
  assert.equal(passesThreshold(edge, 0.7), false);
  assert.equal(passesThreshold(edge, 0.5), true);

  const strict = answer(graph, "how does mercury fit into ancient Chinese science?");
  assert.equal(/\bWater\b/.test(strict.text), false, `weak mapping asserted: ${strict.text}`);
  const lax = answer(graph, "how does mercury fit into ancient Chinese science?", {
    confidenceThreshold: 0.5,
  });
  assert.match(lax.text, /Water/);
  assert.match(lax.text, /0\.55/);
});

test("multi-aspect polarity: bass is Yang in one aspect, Yin in another", () => {
  const bass = graph.getNode("bass")!;
  const pol = graph.outEdges(bass.id, "HAS_POLARITY");
  assert.equal(pol.length, 2);
  const byTarget = new Map(pol.map((e) => [graph.getNode(e.to)!.name, e]));
  assert.ok(byTarget.has("Yang") && byTarget.has("Yin"));
  assert.match(byTarget.get("Yang")!.aspect!, /voice origin/);
  assert.match(byTarget.get("Yin")!.aspect!, /pitch/);
  // …and the engine surfaces BOTH aspects instead of picking one label.
  const a = answer(graph, "what is the yin yang polarity of bass?");
  assert.match(a.text, /voice origin/);
  assert.match(a.text, /pitch/);
  // Treble is the mirror image.
  const treble = graph.getNode("treble")!;
  const tpol = graph.outEdges(treble.id, "HAS_POLARITY");
  assert.equal(tpol.length, 2);
  assert.notEqual(tpol[0].aspect, tpol[1].aspect);
});

test("interpreter: intent detection", () => {
  assert.equal(interpret(graph, "what is an integral?").intentType, "definition");
  assert.equal(interpret(graph, "what is an integral?").includeOntology, false);
  assert.equal(
    interpret(graph, "how does the integral relate to yin and yang?").intentType,
    "ontology_explanation",
  );
  assert.equal(interpret(graph, "why is winter cold?").intentType, "causal_chain");
});
