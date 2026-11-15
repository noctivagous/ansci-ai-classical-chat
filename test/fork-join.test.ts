/**
 * fork-join.test.ts — Slice B: the classification table and the join at
 * working strength. Classifications drive the EXISTING engine and
 * propagation (src/engine.ts, src/propagate.ts, reused read-only);
 * these tests check the join's behaviour: shared-prior derivation,
 * cycle neighbours, the (concept, aspect) brake (X1), the confidence
 * gate, and conflict surfacing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CLASSIFICATIONS, CONCEPT_LINKS, lookupClassification } from "../src/fork/classify";
import { buildForkGraph, derive, deriveSentence, forkNodeId, CONFIDENCE_GATE } from "../src/fork/join";
import { parse } from "../src/fork/parse";

const graph = buildForkGraph();

test("classification table: size, layer separation, attested anchors", () => {
  assert.ok(CLASSIFICATIONS.length >= 120 && CLASSIFICATIONS.length <= 200, `table has ${CLASSIFICATIONS.length} entries`);
  const curated = CLASSIFICATIONS.filter((e) => e.provenance === "fork-curated");
  const creative = CLASSIFICATIONS.filter((e) => e.provenance === "fork-creative");
  assert.ok(curated.length > 0 && creative.length > 0, "both layers present and labelled");
  // Attested anchors agree with the seed's correspondence tables.
  assert.equal(lookupClassification("anger")?.element, "Wood");
  assert.equal(lookupClassification("joy")?.element, "Fire");
  assert.equal(lookupClassification("grief")?.element, "Metal");
  assert.equal(lookupClassification("fear")?.element, "Water");
  assert.equal(lookupClassification("winter")?.element, "Water");
  assert.equal(lookupClassification("liver")?.element, "Wood");
  assert.equal(lookupClassification("kidneys")?.element, "Water");
  assert.ok(CONCEPT_LINKS.length > 0);
});

test("winter/cold shared-prior derivation runs through the JOIN, not just the old reasoner", () => {
  const winter = derive(graph, "winter");
  const cold = derive(graph, "cold", "temperature");
  assert.equal(winter.classification?.element, "Water");
  assert.equal(cold.classification?.element, "Water");
  // The shared prior made visible: both reach the same quality through
  // the same element/polarity join in the joined graph.
  const opts = { edgeTypes: ["ELEMENT_OF", "HAS_ELEMENT", "POLARITY_OF", "HAS_QUALITY"] as never[], confidenceThreshold: 0 };
  const winterPath = graph.findPath("winter", "cold", opts);
  const coldPath = graph.findPath(forkNodeId(lookupClassification("cold", "temperature")!), "cold", opts);
  assert.ok(winterPath && coldPath, "both concepts derive 'cold' through the shared prior");
  assert.match(winterPath!.text, /Water/);
  assert.match(coldPath!.text, /Water/);
  // And their derived correspondence neighbourhoods coincide.
  const wLabels = new Set(winter.conclusions.map((c) => c.label));
  const shared = cold.conclusions.filter((c) => wLabels.has(c.label));
  assert.ok(shared.length >= 5, `shared conclusions: ${shared.map((c) => c.label).join(", ")}`);
  assert.ok(winter.conclusions.every((c) => c.path.length > 0 && c.confidence > 0), "every conclusion carries its path and confidence");
});

test("furious → Wood yields expression-side (generating) and restraint-side (controlling) neighbours", () => {
  const d = derive(graph, "furious");
  assert.equal(d.classification?.element, "Wood");
  const gen = d.conclusions.filter((c) => c.category.startsWith("generates:"));
  const restr = d.conclusions.filter((c) => c.category.startsWith("restrained-by:"));
  assert.ok(gen.length > 0 && gen.every((c) => c.element === "Fire"), "generating step from Wood reaches Fire's row (expression)");
  assert.ok(restr.some((c) => c.label === "grief") || restr.length > 0, "restraint side present");
  assert.ok(restr.every((c) => c.element === "Metal"), "the element that restrains Wood is Metal — its row is the restraint side");
  assert.ok(gen.some((c) => c.label === "red"), "Fire's colour is on the expression side");
  assert.ok(restr.some((c) => c.label === "white"), "Metal's colour is on the restraint side");
});

test("X1 brake: 'cold' the illness derives differently from 'cold' the temperature", () => {
  const temp = derive(graph, "cold", "temperature");
  const illness = derive(graph, "cold", "illness");
  assert.equal(temp.classification?.element, "Water");
  assert.equal(illness.classification?.element, "Metal");
  assert.notEqual(temp.classification?.element, illness.classification?.element);
  assert.ok(
    !illness.conclusions.some((c) => c.label === "winter"),
    "a head cold must not derive winter conclusions — the wrong-address amplification is contained",
  );
  assert.ok(illness.conclusions.every((c) => c.element !== "Water" || c.kind !== "correspondence"));
});

test("confidence gate: a low-confidence classification is recorded but drives no conclusions", () => {
  const dream = lookupClassification("dream")!;
  assert.ok(dream.confidence < CONFIDENCE_GATE, "the test entry really is below the gate");
  const d = derive(graph, "dream");
  assert.equal(d.gated, true);
  assert.match(d.gateReason ?? "", /below the gate/);
  assert.equal(d.conclusions.length, 0);
  assert.equal(d.classification?.element, "Water", "the classification itself is still visible — gated, not erased");
});

test("conflicts surface through the join instead of being hidden", () => {
  const g2 = buildForkGraph([
    { concept: "storm", aspect: "overall", aspectKey: "overall", element: "Fire", confidence: 0.85, provenance: "fork-creative", note: "injected test conflict" },
  ]);
  const d = derive(g2, "storm");
  assert.ok(d.conflicts.length >= 1, "two same-aspect classifications to different elements are flagged");
  assert.match(d.conflicts[0].message, /flagged/);
});

test("deriveSentence: a parsed sentence's content words join to derivations", () => {
  const p = parse("冬天很冷。", "zh");
  const byNode = deriveSentence(graph, p);
  const winterNode = p.meaning.nodes.find((n) => n.lemma === "冬天")!;
  const d = byNode.get(winterNode.id);
  assert.ok(d?.classification, "the ZH winter node joins through the semantic layer");
  const p2 = parse("She was furious.", "en");
  const byNode2 = deriveSentence(graph, p2);
  const furiousNode = p2.meaning.nodes.find((n) => n.lemma === "furious")!;
  assert.equal(byNode2.get(furiousNode.id)?.classification?.element, "Wood");
});
