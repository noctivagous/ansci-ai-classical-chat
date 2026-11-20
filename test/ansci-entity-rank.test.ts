/**
 * Entity ranker tests (2026-11-19). The candidate lists here are
 * SYNTHETIC unit-test data — small hand-built lists that exercise
 * each signal in isolation. The evaluation against recorded real
 * Wikidata data lives in scripts/ansci-entity-eval.mjs and
 * docs/ansci/entity-ranking-report.md; these tests make no claim
 * about the world, only about the arithmetic.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyKind, rankEntities, type EntityCandidate } from "../src/ansci/entity-rank";

const cand = (id: string, description: string, sitelinks: number, instanceOf: string[] = []): EntityCandidate => ({
  id,
  label: id,
  description,
  sitelinks,
  instanceOf,
});

test("type agreement: a place beats a person for a where-question, whatever the prominence", () => {
  const ranked = rankEntities(
    [
      cand("PERSON", "American basketball player", 300, ["human"]),
      cand("PLACE", "city in Missouri, United States", 40, ["city"]),
    ],
    { mention: "Jordan", contextText: "Where is Jordan?", expectedKind: "place" },
  );
  assert.equal(ranked[0].candidate.id, "PLACE");
  assert.equal(ranked[0].type.verdict, "match");
  assert.equal(ranked[1].type.verdict, "mismatch");
});

test("type reads instance-of before description, and names its rule", () => {
  const c = cand("X", "a quiet town", 5, ["human settlement"]);
  assert.deepEqual(classifyKind(c), { kind: "place", rule: 'instance-of ~ "human settlement"' });
});

test("prominence orders near-equals: more sitelinks wins when nothing else speaks", () => {
  const ranked = rankEntities(
    [cand("SMALL", "a village", 3), cand("BIG", "a village", 300)],
    { mention: "X", contextText: "the village", expectedKind: "place" },
  );
  assert.equal(ranked[0].candidate.id, "BIG");
  assert.ok(ranked[0].prominence.score > ranked[1].prominence.score);
});

test("context overlap: the description that shares words with the context wins, and the words are shown", () => {
  const ranked = rankEntities(
    [
      cand("IL", "capital city of the U.S. state of Illinois", 100, ["city"]),
      cand("MO", "city in Missouri, United States", 100, ["city"]),
    ],
    { mention: "Springfield", contextText: "Where is Springfield, the capital of Illinois?", expectedKind: "place" },
  );
  assert.equal(ranked[0].candidate.id, "IL");
  // Overlap words are reported in their stemmed form (the shared
  // lesk.ts tokeniser stems both sides identically).
  assert.ok(ranked[0].overlap.words.includes("illinoi"));
  assert.ok(ranked[0].overlap.words.includes("capital"));
});

test("every candidate's breakdown is complete: three signals, each explained", () => {
  const ranked = rankEntities(
    [cand("A", "city in France", 10, ["city"]), cand("B", "French singer", 20, ["human"])],
    { mention: "Paris", contextText: "Where is Paris?", expectedKind: "place" },
  );
  assert.equal(ranked.length, 2);
  for (const r of ranked) {
    assert.equal(typeof r.total, "number");
    assert.ok(["match", "mismatch", "unknown", "no-expectation"].includes(r.type.verdict));
    assert.equal(typeof r.prominence.sitelinks, "number");
    assert.ok(Array.isArray(r.overlap.words));
  }
});

test("deterministic: identical inputs rank identically, ties keep incoming order", () => {
  const list = [cand("FIRST", "a town", 10), cand("SECOND", "a town", 10)];
  const ctx = { mention: "X", contextText: "a town", expectedKind: "place" as const };
  const a = rankEntities(list, ctx);
  const b = rankEntities(list, ctx);
  assert.deepEqual(a.map((r) => r.candidate.id), b.map((r) => r.candidate.id));
  assert.deepEqual(a.map((r) => r.candidate.id), ["FIRST", "SECOND"]);
});

test("no expectation: type signal abstains and the other signals decide", () => {
  const ranked = rankEntities(
    [cand("A", "a town in Kent", 5), cand("B", "a town in Kent", 50)],
    { mention: "X", contextText: "a town in Kent" },
  );
  assert.equal(ranked[0].type.verdict, "no-expectation");
  assert.equal(ranked[0].candidate.id, "B");
});
