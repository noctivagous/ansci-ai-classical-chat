/**
 * Slice A creature-class climb tests (2026-11-18): the class-level
 * climb stop (design: slice-a-design.md; owner's rulings 1a–5a).
 * The climb reaches a Yueling creature class through WordNet's
 * taxonomy, and the class carries the classification under the
 * registered rule P2 CREATURE_CLASS_YUELING_V1 — priced flat at
 * P2's cap, with named subtrees excluded, and the classes P2 does
 * not name left unclassified as located gaps. These tests pin the
 * mechanism's shape, the exclusions, and the gaps — the taxonomy's
 * contents are data the audit dump (docs/ansci/class-stop-dump.json)
 * certifies, not something re-derived here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classStopReport,
  climbAudit,
  climbCandidates,
  enableWordnetLexicon,
} from "../src/ansci/wordnet-lex";

enableWordnetLexicon(true);

const classCandidates = (lemma: string) =>
  climbCandidates(lemma).filter((c) => c.viaClass);
const ungated = (lemma: string) => climbCandidates(lemma).filter((c) => !c.gated);

test("badger: a class candidate with the full derivation recorded", () => {
  const cs = classCandidates("badger");
  assert.equal(cs.length, 1);
  const c = cs[0];
  assert.equal(c.element, "Metal");
  assert.equal(c.aspect, "animal");
  assert.equal(c.confidence, 0.8);
  assert.equal(c.gated, false);
  assert.equal(c.viaClass?.creatureClass, "furred");
  assert.equal(c.viaClass?.rule, "CREATURE_CLASS_YUELING_V1");
  assert.equal(c.viaClass?.stopSynset, "wn-n01894065");
  assert.ok(c.path.includes("—CLASS→"), c.path);
  assert.ok(c.path.includes("CREATURE_CLASS_YUELING_V1"), c.path);
});

test("pricing is flat at the cap: tiger at 5 hops still prices 0.80, ungated", () => {
  const cs = classCandidates("tiger");
  assert.equal(cs.length, 1);
  assert.equal(cs[0].hops, 5);
  assert.equal(cs[0].confidence, 0.8); // under hop decay this would be 0.472 and gated out
  assert.equal(cs[0].gated, false);
});

test("tiger files furred → Metal: P2's clear leg (furred mammals), reached by subtree membership alone", () => {
  const cs = classCandidates("tiger");
  assert.equal(cs[0].viaClass?.creatureClass, "furred");
  assert.equal(cs[0].element, "Metal");
});

test("the classes at work: duck feathered/Fire, catfish scaled/Wood, snail and shrimp shelled/Water", () => {
  const one = (w: string) => classCandidates(w)[0];
  assert.equal(one("duck").viaClass?.creatureClass, "feathered");
  assert.equal(one("duck").element, "Fire");
  // The catfish is a fish in the Chinese system — membership by
  // kind (habitat and form), never a scale inspection.
  assert.equal(one("catfish").viaClass?.creatureClass, "scaled");
  assert.equal(one("catfish").element, "Wood");
  assert.equal(one("snail").viaClass?.creatureClass, "shelled");
  assert.equal(one("snail").element, "Water");
  assert.equal(one("shrimp").viaClass?.stopSynset, "wn-n02008542"); // crustacean
});

test("mollusk shape (ruling 5a, from the audit dump): abalone stops at gastropod, clam at bivalve — never at mollusk, and cephalopods never fire", () => {
  assert.equal(classCandidates("abalone")[0].viaClass?.stopSynset, "wn-n01975695");
  assert.equal(classCandidates("clam")[0].viaClass?.stopSynset, "wn-n01989596");
  assert.deepEqual(classCandidates("octopus"), []);
  assert.deepEqual(classCandidates("squid"), []);
});

test("exclusions do not fire: whale, porpoise and narwhal gain no class candidate", () => {
  for (const w of ["whale", "porpoise", "narwhal"]) {
    assert.deepEqual(classCandidates(w), [], w);
  }
  const audit = climbAudit("whale");
  assert.ok(audit.length >= 1); // the senses exist — it is the class hit that is withheld
  assert.equal(audit.filter((s) => s.hit?.via === "class").length, 0);
});

test("the human does not take the furred class (the commentary places the human in the naked class)", () => {
  assert.deepEqual(classCandidates("human"), []);
  const audit = climbAudit("human");
  assert.ok(audit.length >= 1);
  assert.equal(audit.filter((s) => s.hit?.via === "class").length, 0);
});

test("dolphin: the whale sense is withheld by the exclusion; the dolphinfish sense is a fish and files scaled", () => {
  const cs = classCandidates("dolphin");
  assert.equal(cs.filter((c) => c.viaClass?.creatureClass === "furred").length, 0);
  const fish = cs.filter((c) => c.viaClass?.creatureClass === "scaled");
  assert.equal(fish.length, 1);
  assert.equal(fish[0].viaClass?.stopSynset, "wn-n02552099");
});

test("table-owned concepts never climb: chicken keeps its attested table entry and gains no candidate", () => {
  assert.deepEqual(climbCandidates("chicken"), []);
});

test("a concrete anchor below a stop still wins its own sense: kid reaches the goat anchor, hen's chicken sense the chicken anchor", () => {
  const kid = ungated("kid");
  assert.ok(kid.some((c) => !c.viaClass && c.anchor === "goat" && c.element === "Fire"));
  const hen = ungated("hen");
  assert.ok(hen.some((c) => !c.viaClass && c.anchor === "chicken" && c.element === "Wood"));
  // …while hen's generic female-bird sense takes the class.
  assert.ok(hen.some((c) => c.viaClass?.creatureClass === "feathered"));
});

test("the located gaps stay gaps: silkworm (taxonomy shape), frog (no P2 leg), spider (no P2 leg), yak (beyond the 6-hop bound)", () => {
  for (const w of ["silkworm", "frog", "spider", "yak"]) {
    assert.deepEqual(classCandidates(w), [], w);
  }
});

test("classStopReport: ten stops; the mammal stop carries both exclusions, with their subtrees sized", () => {
  const report = classStopReport();
  assert.equal(report.length, 10);
  const mammal = report.find((s) => s.synset === "wn-n01894065");
  assert.ok(mammal);
  assert.equal(mammal.creatureClass, "furred");
  assert.equal(mammal.element, "Metal");
  assert.deepEqual(
    mammal.exclusionsApplied.map((x) => x.synset).sort(),
    ["wn-n02097141", "wn-n02511603"],
  );
  for (const s of report) {
    assert.ok(s.subtreeSize > 0, s.synset);
    assert.ok(s.members.length === s.subtreeSize, s.synset);
  }
});
