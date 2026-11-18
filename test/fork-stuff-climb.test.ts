/**
 * Slice B stuff-class climb tests (2026-11-18): the class-level
 * climb stop for stuffs (design: slice-b-design.md; decisions
 * 1a–4a as recommended there, under the sequence authorization).
 * The climb reaches an R3 stuff class through WordNet's taxonomy,
 * and the class carries the classification under the registered
 * rule R3 (STUFF_CLASS_R3_V1) — priced flat at the class's
 * specimen price, with R3's abstentions (preparations, oils,
 * animal products, synthetics) reaching no stop at all. These
 * tests pin the mechanism's shape and the abstentions — the
 * taxonomy's contents are data the audit dump
 * (docs/fork/stuff-stop-dump.json) certifies, not something
 * re-derived here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  climbAudit,
  climbCandidates,
  enableWordnetLexicon,
  stuffStopReport,
} from "../src/fork/wordnet-lex";

enableWordnetLexicon(true);

const classCandidates = (lemma: string) =>
  climbCandidates(lemma).filter((c) => c.viaClass);

test("marble: a stone-class candidate with the full derivation recorded", () => {
  const cs = classCandidates("marble");
  assert.equal(cs.length, 1);
  const c = cs[0];
  assert.equal(c.element, "Earth");
  assert.equal(c.aspect, "material");
  assert.equal(c.confidence, 0.6);
  assert.equal(c.gated, false);
  assert.equal(c.viaClass?.stuffClass, "stone");
  assert.equal(c.viaClass?.rule, "STUFF_CLASS_R3_V1");
  assert.equal(c.viaClass?.stopSynset, "wn-n14945132");
  assert.ok(c.path.includes("—CLASS→"), c.path);
  assert.ok(c.path.includes("STUFF_CLASS_R3_V1"), c.path);
});

test("the classes at work: steel and bronze Metal via alloy, copper Metal via metallic element", () => {
  const one = (w: string) => classCandidates(w)[0];
  assert.equal(one("steel").viaClass?.stopSynset, "wn-n14834351");
  assert.equal(one("steel").element, "Metal");
  assert.equal(one("bronze").viaClass?.stopSynset, "wn-n14834351");
  // Copper, corrected at the A+B merge (2026-11-18): in this
  // extract copper's FIRST noun sense is the butterfly, which
  // Slice A's insect stop classifies (scaled → Wood @0.80); the
  // metal sense (sense 5) takes the metallic-element stop
  // (Metal @0.80). Both class candidates stand, one per reading —
  // the isolated best-pick ties at 0.80 and takes the earlier
  // sense; sense arbitration in a sentence is coherence's job.
  const copper = classCandidates("copper");
  assert.equal(copper.length, 2);
  assert.equal(copper[0].viaClass?.stopSynset, "wn-n02195555");
  assert.equal(copper[0].element, "Wood");
  assert.equal(copper[1].viaClass?.stopSynset, "wn-n14873092");
  assert.equal(copper[1].element, "Metal");
});

test("pricing is flat per class: bronze at 2 hops still prices 0.80, ungated", () => {
  const cs = classCandidates("bronze");
  assert.equal(cs.length, 1);
  assert.equal(cs[0].hops, 2);
  assert.equal(cs[0].confidence, 0.8);
  assert.equal(cs[0].gated, false);
});

test("water: the phase's namesake substance stops at its own synset, hop 0", () => {
  const cs = classCandidates("water");
  assert.equal(cs.length, 1);
  assert.equal(cs[0].element, "Water");
  assert.equal(cs[0].hops, 0);
  assert.equal(cs[0].confidence, 0.8); // the specimen is attested 0.95; the climb caps at 0.80
});

test("per-sense: oak's wood sense takes the wood class; its tree sense takes nothing", () => {
  const audit = climbAudit("oak");
  const hits = audit.filter((s) => s.hit?.via === "class");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].hit?.viaClass?.stuffClass, "wood");
  const treeSense = audit.find((s) => s.start.lemmas.includes("oak") && s.start.gloss.includes("tree"));
  assert.ok(treeSense, "the tree sense is in the audit");
  assert.equal(treeSense.hit, undefined, "R1: a living plant is not a material");
});

test("clay: the earth class, reached by both its stuff senses, one element", () => {
  const cs = classCandidates("clay");
  assert.ok(cs.length >= 1);
  for (const c of cs) {
    assert.equal(c.viaClass?.stuffClass, "earth");
    assert.equal(c.element, "Earth");
    assert.equal(c.confidence, 0.6);
  }
});

test("R3's abstentions reach no stop: silk, leather, plastic, flour, coal", () => {
  for (const w of ["silk", "leather", "plastic", "flour", "coal"]) {
    assert.deepEqual(classCandidates(w), [], `${w} must gain no class candidate`);
    assert.deepEqual(climbCandidates(w), [], `${w} must gain no candidate at all`);
  }
});

test("the table owns its stuffs: salt and honey never climb", () => {
  assert.deepEqual(climbCandidates("salt"), []);
  assert.deepEqual(climbCandidates("honey"), []);
});

test("gold separates by sense: the colour sense anchors, the metal sense takes the class", () => {
  const audit = climbAudit("gold");
  const classHit = audit.find((s) => s.hit?.via === "class");
  assert.ok(classHit, "the metal sense takes the metal class");
  assert.equal(classHit.hit?.element, "Metal");
  const anchorHit = audit.find((s) => s.hit && s.hit.via !== "class");
  assert.ok(anchorHit, "another sense anchors conventionally");
});

test("the report: six stops, and the wood subtree holds wood kinds, not trees", () => {
  const report = stuffStopReport();
  assert.equal(report.length, 6);
  const wood = report.find((s) => s.stuffClass === "wood")!;
  assert.ok(wood.members.includes("oak"), "oak's wood synset is a member");
  assert.ok(wood.members.includes("rosewood"));
  const rock = report.find((s) => s.stuffClass === "stone")!;
  assert.ok(rock.members.includes("marble"));
  assert.ok(rock.members.includes("granite"));
});
