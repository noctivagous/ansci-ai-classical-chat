/**
 * propagate.test.ts — slice 2c acceptance, §6.1–§6.4 + §6.10:
 * propagation over the base nets with per-relation decay, the §6.2
 * snow worked example end-to-end (fixture chain + plain rendering),
 * the non-propagation list, restraint arbitration, §6.4 flagging and
 * supersession, successor leanings, and the production graph's
 * behaviour over the real WordNet extract.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Graph, type GraphNode } from "../src/graph";
import { buildSeedGraph } from "../src/seed";
import { buildChatGraph, getDefaultExtract } from "../src/wordnet";
import {
  propagateGraph,
  statementsFor,
  usableStatements,
  bestPropagated,
  derivationPathText,
  type PropagatedStatement,
} from "../src/propagate";
import { answerIntent, type QueryIntent } from "../src/reason";
import { TraceBuilder } from "../src/thought";
import { renderAnswer } from "../src/render";
import type { RouteDecision } from "../src/router";

const approx = (a: number, b: number) => Math.abs(a - b) < 1e-6;

function base(g: Graph): void {
  const N = (id: string, name: string, type: GraphNode["type"]) =>
    g.addNode({ id, name, type, layer: "atomic" });
  N("yin", "Yin", "Polarity");
  N("yang", "Yang", "Polarity");
  for (const [id, name] of [
    ["wood", "Wood"],
    ["fire", "Fire"],
    ["earth", "Earth"],
    ["metal", "Metal"],
    ["water", "Water"],
  ] as const) {
    N(id, name, "Element");
  }
  // Generation cycle: Wood -> Fire -> Earth -> Metal -> Water -> Wood.
  const gen: [string, string][] = [
    ["wood", "fire"],
    ["fire", "earth"],
    ["earth", "metal"],
    ["metal", "water"],
    ["water", "wood"],
  ];
  for (const [a, b] of gen) g.addEdge({ from: a, to: b, type: "MUTUAL_GENERATION" });
  // Restraint cycle: Wood -> Earth -> Water -> Fire -> Metal -> Wood.
  const res: [string, string][] = [
    ["wood", "earth"],
    ["earth", "water"],
    ["water", "fire"],
    ["fire", "metal"],
    ["metal", "wood"],
  ];
  for (const [a, b] of res) g.addEdge({ from: a, to: b, type: "MUTUAL_RESTRAINT" });
}

const find = (list: PropagatedStatement[], relation: string, objectId: string, aspectKey = "overall") =>
  list.find((s) => s.relation === relation && s.objectId === objectId && s.aspectKey === aspectKey);

/** §6.2's chain, as fixture synsets: snow -IS_A-> precipitation
 *  -ASSOCIATED_WITH-> winter -ELEMENT_OF-> Water. */
function snowFixture(): Graph {
  const g = new Graph();
  base(g);
  g.addNode({ id: "winter", name: "winter", type: "Season", layer: "atomic" });
  g.addEdge({ from: "winter", to: "water", type: "ELEMENT_OF" });
  g.addEdge({ from: "water", to: "yin", type: "POLARITY_OF" });
  g.addNode({ id: "cold", name: "cold", type: "Quality", layer: "atomic" });
  g.addEdge({ from: "yin", to: "cold", type: "HAS_QUALITY" });
  g.addNode({ id: "precipitation-s", name: "precipitation", type: "Synset", layer: "base" });
  g.addEdge({ from: "precipitation-s", to: "winter", type: "ASSOCIATED_WITH" });
  g.addNode({ id: "snow-s", name: "snow", type: "Synset", layer: "base" });
  g.addEdge({ from: "snow-s", to: "precipitation-s", type: "IS_A" });
  return g;
}

test("§6.2 snow worked example: leanings by propagation, decayed, derived", () => {
  const g = snowFixture();
  const res = propagateGraph(g);

  const precip = find(statementsFor(g, "precipitation-s"), "HAS_ELEMENT", "water");
  assert.ok(precip, "precipitation leans Water");
  assert.ok(approx(precip.confidence, 0.6), `precipitation leaning is 1.0 x 0.6, got ${precip.confidence}`);
  assert.equal(precip.band, "faint"); // an ASSOCIATED_WITH leaning is below assertion weight
  assert.equal(precip.mappingStatus, "propagated");
  assert.equal(precip.provenanceKind, "derived");

  const snow = find(statementsFor(g, "snow-s"), "HAS_ELEMENT", "water");
  assert.ok(snow, "snow inherits the leaning over its IS_A edge");
  assert.ok(approx(snow.confidence, 0.54), `snow leaning is 0.6 x 0.9 = 0.54, got ${snow.confidence}`);
  assert.equal(snow.band, "faint");
  assert.equal(
    derivationPathText(g, snow),
    "snow —IS_A→ precipitation —ASSOCIATED_WITH→ winter —ELEMENT_OF→ Water",
  );
  // The trace records propagation as its own step kind (§8.5 extension).
  assert.equal(res.statements.filter((s) => s.subjectId === "snow-s").length >= 1, true);
});

test("§6.2 end-to-end: 'why is snow cold?' answered from the propagated leaning, plain mode, may-band", () => {
  const g = snowFixture();
  const extract = getDefaultExtract();
  const intent: QueryIntent = {
    intentType: "causal_chain",
    matchedNodes: ["snow-s", "cold"],
    includeOntology: true,
    traversalDepth: 3,
    confidenceThreshold: 0.5,
  };
  const rec = new TraceBuilder(1, "why is snow cold?");
  const { conclusions } = answerIntent(g, "why is snow cold?", intent, rec);
  const hq = conclusions.find((c) => c.relation === "HAS_QUALITY");
  assert.ok(hq, "a HAS_QUALITY conclusion is derived");
  assert.ok(approx(hq.confidence, 0.54), `join confidence is the decayed 0.54, got ${hq.confidence}`);
  assert.ok(rec.steps.some((s) => s.kind === "propagate"), "the trace records a propagation step");

  const decision: RouteDecision = {
    kind: "route",
    intent,
    terms: [
      { surface: "snow", lemma: "snow", slot: "subject", synsetId: "snow-s", resolvedBy: "single-sense" },
      { surface: "cold", lemma: "cold", slot: "quality", nodeId: "cold", resolvedBy: "ontology-name" },
    ],
    surfaceMode: "plain",
    decisionReason: "test/§6.2",
  };
  const trace = rec.finish(decision, {
    conflict: "pass",
    leakage: "pass",
    confidenceFloor: { action: "none" },
  });
  const rendered = renderAnswer({ graph: g, trace, decision, extract });
  assert.deepEqual(rendered.violations, []);
  assert.match(rendered.text, /may be cold/); // 0.54 sits in the hedge band
  assert.match(rendered.text, /snow/i);
});

test("§6.3 antonym: polarity flips (x0.7), elements do not travel", () => {
  const g = new Graph();
  base(g);
  g.addNode({ id: "hot-s", name: "hot", type: "Synset", layer: "base" });
  g.addEdge({ from: "hot-s", to: "yang", type: "HAS_POLARITY", confidence: 0.9 });
  g.addEdge({ from: "hot-s", to: "fire", type: "HAS_ELEMENT", confidence: 0.9 });
  g.addNode({ id: "cold-s", name: "cold", type: "Synset", layer: "base" });
  g.addEdge({ from: "cold-s", to: "hot-s", type: "ANTONYM_OF" });
  propagateGraph(g);
  const stmts = statementsFor(g, "cold-s");
  const yin = find(stmts, "HAS_POLARITY", "yin");
  assert.ok(yin && approx(yin.confidence, 0.63), `flipped polarity at 0.9 x 0.7, got ${yin?.confidence}`);
  assert.equal(find(stmts, "HAS_ELEMENT", "fire"), undefined, "no element crosses an antonym edge");
});

test("§6.3 part-of: element only, curated wholes only, polarity never", () => {
  const g = new Graph();
  base(g);
  // Curated whole: the part shares its element at x0.7, never its polarity.
  g.addNode({ id: "lake-s", name: "lake", type: "Synset", layer: "base" });
  g.addEdge({ from: "lake-s", to: "water", type: "HAS_ELEMENT", confidence: 0.9 });
  g.addEdge({ from: "lake-s", to: "yin", type: "HAS_POLARITY", confidence: 0.9 });
  g.addNode({ id: "shore-s", name: "shore", type: "Synset", layer: "base" });
  g.addEdge({ from: "shore-s", to: "lake-s", type: "PART_OF", aspect: "meronym" });
  // Propagated whole: its part gains nothing through parthood.
  g.addNode({ id: "pond-s", name: "pond", type: "Synset", layer: "base" });
  g.addEdge({ from: "pond-s", to: "lake-s", type: "ASSOCIATED_WITH" }); // pond leans Water at 0.54
  g.addNode({ id: "reed-s", name: "reed", type: "Synset", layer: "base" });
  g.addEdge({ from: "reed-s", to: "pond-s", type: "PART_OF", aspect: "meronym" });
  propagateGraph(g);
  const shore = statementsFor(g, "shore-s");
  const el = find(shore, "HAS_ELEMENT", "water");
  assert.ok(el && approx(el.confidence, 0.63), `part shares curated whole's element at 0.9 x 0.7, got ${el?.confidence}`);
  assert.equal(find(shore, "HAS_POLARITY", "yin"), undefined, "polarity never propagates through parthood");
  const reed = statementsFor(g, "reed-s");
  assert.equal(
    reed.filter((s) => s.derivation.some((d) => d.relation === "PART_OF")).length,
    0,
    "no parthood propagation from a merely-propagated whole",
  );
});

test("§6.3 property: aspect is required — overall does not travel, scoped travels at x0.85", () => {
  const g = new Graph();
  base(g);
  g.addNode({ id: "soothing", name: "soothing", type: "Concept", layer: "acquired" });
  g.addEdge({ from: "soothing", to: "yin", type: "HAS_POLARITY", confidence: 0.9 }); // overall aspect
  g.addNode({ id: "breeze-s", name: "breeze", type: "Synset", layer: "base" });
  g.addEdge({ from: "breeze-s", to: "soothing", type: "HAS_PROPERTY" });
  g.addNode({ id: "cooling", name: "cooling", type: "Concept", layer: "acquired" });
  g.addEdge({ from: "cooling", to: "yin", type: "HAS_POLARITY", confidence: 0.9, aspect: "temperature", aspectKey: "temperature" });
  g.addNode({ id: "shade-s", name: "shade", type: "Synset", layer: "base" });
  g.addEdge({ from: "shade-s", to: "cooling", type: "HAS_PROPERTY" });
  propagateGraph(g);
  assert.equal(statementsFor(g, "breeze-s").length, 0, "an overall classification does not travel HAS_PROPERTY");
  const shade = find(statementsFor(g, "shade-s"), "HAS_POLARITY", "yin", "temperature");
  assert.ok(shade && approx(shade.confidence, 0.765), `aspect-scoped property travels at 0.9 x 0.85, got ${shade?.confidence}`);
});

test("§6.3/§6.10: generation is not inherited as a classification — it appears only as a successor leaning", () => {
  const g = new Graph();
  base(g);
  g.addNode({ id: "sprout", name: "sprout", type: "Concept", layer: "acquired" });
  g.addEdge({ from: "sprout", to: "wood", type: "HAS_ELEMENT", confidence: 0.9 });
  propagateGraph(g);
  const stmts = statementsFor(g, "sprout");
  assert.equal(find(stmts, "HAS_ELEMENT", "fire", "overall"), undefined, "no Fire classification appears");
  const succ = stmts.find((s) => s.kind === "successor");
  assert.ok(succ, "a successor leaning exists");
  assert.equal(succ.objectId, "fire");
  assert.equal(succ.aspectKey, "temporal");
  assert.equal(succ.band, "faint");
  assert.ok(approx(succ.confidence, 0.45), `successor at 0.9 x 0.5, got ${succ.confidence}`);
});

test("§6.10 precedence: a direct temporal classification supersedes the successor leaning", () => {
  const g = new Graph();
  base(g);
  g.addNode({ id: "ember", name: "ember", type: "Concept", layer: "acquired" });
  g.addEdge({ from: "ember", to: "wood", type: "HAS_ELEMENT", confidence: 0.9 });
  g.addEdge({ from: "ember", to: "metal", type: "HAS_ELEMENT", confidence: 0.8, aspect: "temporal succession", aspectKey: "temporal" });
  propagateGraph(g);
  const succ = statementsFor(g, "ember").find((s) => s.kind === "successor");
  assert.ok(succ, "the Wood successor leaning was still derived");
  assert.equal(succ.mappingStatus, "superseded", "the direct temporal statement outranks it, recorded not asserted");
  assert.equal(bestPropagated(g, "ember", "HAS_ELEMENT", "temporal"), undefined);
});

test("§6.10 degree rule: IS_A from a predominant curated classification carries present, never predominant", () => {
  const g = new Graph();
  base(g);
  g.addNode({ id: "ocean-s", name: "ocean", type: "Synset", layer: "base" });
  g.addEdge({ from: "ocean-s", to: "water", type: "HAS_ELEMENT", band: "predominant" });
  g.addNode({ id: "sea-s", name: "sea", type: "Synset", layer: "base" });
  g.addEdge({ from: "sea-s", to: "ocean-s", type: "IS_A" });
  propagateGraph(g);
  const sea = find(statementsFor(g, "sea-s"), "HAS_ELEMENT", "water");
  assert.ok(sea);
  assert.equal(sea.band, "present");
  assert.ok(approx(sea.confidence, 0.9));
});

test("§6.5 arbitration: a restrained competing leaning is damped x0.7 and stepped down, once, on paper", () => {
  const g = new Graph();
  base(g);
  g.addNode({ id: "oven-s", name: "oven", type: "Synset", layer: "base" });
  g.addNode({ id: "hearth", name: "hearth", type: "Concept", layer: "acquired" });
  g.addEdge({ from: "hearth", to: "fire", type: "HAS_ELEMENT", confidence: 0.9 });
  g.addNode({ id: "well", name: "well", type: "Concept", layer: "acquired" });
  g.addEdge({ from: "well", to: "water", type: "HAS_ELEMENT", confidence: 0.9 });
  g.addEdge({ from: "oven-s", to: "hearth", type: "ASSOCIATED_WITH" });
  g.addEdge({ from: "oven-s", to: "well", type: "ASSOCIATED_WITH" });
  propagateGraph(g);
  const stmts = statementsFor(g, "oven-s");
  const fire = find(stmts, "HAS_ELEMENT", "fire");
  const water = find(stmts, "HAS_ELEMENT", "water");
  assert.ok(fire && water, "both leanings are written — arbitration deletes nothing");
  assert.ok(approx(water.confidence, 0.54), "the restraining side is untouched");
  assert.ok(approx(fire.confidence, 0.54 * 0.7), `restrained side damped x0.7, got ${fire.confidence}`);
  assert.ok(fire.notes.some((n) => n.includes("restraint arbitration")), "the damping is recorded in the derivation record");
  assert.equal(fire.mappingStatus, "propagated");
});

test("§6.4 flagging: contradictory propagated leanings are flagged for review, never overwritten", () => {
  const g = new Graph();
  base(g);
  g.addNode({ id: "twilight-s", name: "twilight", type: "Synset", layer: "base" });
  g.addNode({ id: "dawn", name: "dawn", type: "Concept", layer: "acquired" });
  g.addEdge({ from: "dawn", to: "yang", type: "HAS_POLARITY", confidence: 0.9 });
  g.addNode({ id: "dusk", name: "dusk", type: "Concept", layer: "acquired" });
  g.addEdge({ from: "dusk", to: "yin", type: "HAS_POLARITY", confidence: 0.9 });
  g.addEdge({ from: "twilight-s", to: "dawn", type: "ASSOCIATED_WITH" });
  g.addEdge({ from: "twilight-s", to: "dusk", type: "ASSOCIATED_WITH" });
  const res = propagateGraph(g);
  const stmts = statementsFor(g, "twilight-s");
  assert.equal(stmts.length, 2, "both leanings are retained");
  assert.ok(stmts.every((s) => s.mappingStatus === "flagged"), "both are flagged");
  assert.equal(usableStatements(g, "twilight-s").length, 0, "flagged leanings are not usable");
  assert.equal(res.reviewItems.length, 1, "one review item carries the conflict");
  assert.equal(res.reviewItems[0].statementIds.length, 2);
});

test("§6.4 supersession: a curated classification wins over a propagated leaning, which is kept and marked", () => {
  const g = snowFixture();
  g.addNode({ id: "lake", name: "lake", type: "Concept", layer: "acquired" });
  g.addEdge({ from: "lake", to: "water", type: "HAS_ELEMENT", confidence: 0.85 });
  g.addNode({ id: "lake-s", name: "lake", type: "Synset", layer: "base" });
  g.addEdge({ from: "lake", to: "lake-s", type: "MAPPED_TO", confidence: 0.99 }); // bridges run concept -> synset
  g.addEdge({ from: "lake-s", to: "precipitation-s", type: "IS_A" });
  propagateGraph(g);
  const leaning = find(statementsFor(g, "lake-s"), "HAS_ELEMENT", "water");
  assert.ok(leaning, "the IS_A leaning was derived");
  assert.equal(leaning.mappingStatus, "superseded", "the mapped concept's curated Water supersedes it");
});

test("production graph: unmapped precipitation kinds inherit; the curated snow bridge supersedes", () => {
  const graph = buildChatGraph();
  // The merged counts as they stand after 2b (2c adds no nodes or
  // edges — its seed deltas are properties and aspect keys on existing
  // records, §6.11). Counts restated 2026-11-18 for the §6 adverb
  // restoration: the extract gained its 3,622 adverb synsets, and
  // the merged graph gains exactly those nodes (117,113 + 3,622)
  // and their relations (153,918 + 712).
  assert.equal(graph.allNodes().length, 120735, "merged node count unchanged by 2c");
  assert.equal(graph.allEdges().length, 154630, "merged edge count unchanged by 2c");
  propagateGraph(graph);
  const sleet = statementsFor(graph, "wn-n11730546"); // sleet
  const water = find(sleet, "HAS_ELEMENT", "water");
  const yin = find(sleet, "HAS_POLARITY", "yin");
  assert.ok(water && water.mappingStatus === "propagated" && approx(water.confidence, 0.7841), `sleet leans Water by propagation, got ${water?.confidence}`);
  assert.ok(yin && yin.mappingStatus === "propagated" && approx(yin.confidence, 0.7574), `sleet leans Yin by propagation, got ${yin?.confidence}`);
  const snow = statementsFor(graph, "wn-n11730995"); // the snow synset
  assert.ok(snow.some((s) => s.mappingStatus === "superseded"), "snow's propagated leanings are superseded by its curated bridge");
  assert.equal(
    snow.filter((s) => s.kind === "direct" && s.mappingStatus === "propagated").length,
    0,
    "no usable direct propagated statement competes with snow's curated mapping",
  );
  const seed = buildSeedGraph();
  assert.ok(seed.allNodes().length > 0);
});
