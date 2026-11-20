/**
 * ansci-features.test.ts — the depth metric (Part C.1): atom extraction
 * and comparison. The comparison cases are the metric's own contract:
 * a dropped feature is a loss, a changed value is a contradiction, a
 * surface change with identical atoms is full preservation.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/ansci/parse";
import { generate } from "../src/ansci/generate";
import { extractFeatures, compareFeatures, type FeatureAtom } from "../src/ansci/features";

const A = (family: string, key: string, value: string): FeatureAtom => ({ family, key, value });

test("comparison: preserved, lost, contradicted, added are distinct", () => {
  const g0 = [A("aspect", "go#0|aspect", "progressive"), A("roles", "go#0|agent", "he"), A("mood", "go#0|mood", "indicative")];
  const g1 = [A("aspect", "go#0|aspect", "unmarked"), A("roles", "go#0|agent", "he"), A("voice", "go#0|voice", "passive")];
  const c = compareFeatures(g0, g1);
  const byKey = new Map(c.records.map((r) => [r.key, r]));
  assert.equal(byKey.get("go#0|aspect")?.outcome, "contradicted");
  assert.equal(byKey.get("go#0|agent")?.outcome, "preserved");
  assert.equal(byKey.get("go#0|mood")?.outcome, "lost");
  assert.equal(byKey.get("go#0|voice")?.outcome, "added");
  assert.equal(c.micro, 1 / 3);
  assert.equal(c.spuriousRate, 1 / 3);
});

test("comparison: duplicates in G1 are spurious, not preserved twice", () => {
  const g0 = [A("entity", "book#0", "none")];
  const g1 = [A("entity", "book#0", "none"), A("entity", "book#0", "none")];
  const c = compareFeatures(g0, g1);
  assert.equal(c.micro, 1);
  assert.equal(c.spuriousRate, 1 / 2);
});

test("comparison: a role swap is a contradiction, never partial credit", () => {
  const g0 = [A("roles", "bite#0|agent", "dog"), A("roles", "bite#0|patient", "man")];
  const g1 = [A("roles", "bite#0|agent", "man"), A("roles", "bite#0|patient", "dog")];
  const c = compareFeatures(g0, g1);
  assert.equal(c.micro, 0);
  assert.equal(c.contradictionRate, 1);
});

test("atomiser: a copular location query atomises as an attachment (Part G.5)", () => {
  const atoms = extractFeatures(parse("Where are you?", "en"));
  assert.ok(
    atoms.some((a) => a.family === "attachment" && a.key === "where|location" && a.value === "you"),
    JSON.stringify(atoms),
  );
  assert.ok(!atoms.some((a) => a.family === "roles" && a.key.includes("location")));
  // Predicate-sourced location stays a role.
  const live = extractFeatures(parse("I live in London.", "en"));
  assert.ok(live.some((a) => a.family === "roles" && a.key === "live#0|location" && a.value === "london@in"));
});

test("round trip: a clean fitted sentence preserves every atom", () => {
  const p0 = parse("She gave him a book.", "en");
  const p1 = parse(generate(p0), "en");
  const c = compareFeatures(extractFeatures(p0), extractFeatures(p1));
  assert.equal(c.micro, 1, JSON.stringify(c.records.filter((r) => r.outcome !== "preserved")));
});

test("round trip: suppressed roles survive the agentless passive", () => {
  const p0 = parse("The book was given.", "en");
  const atoms0 = extractFeatures(p0);
  assert.ok(atoms0.some((a) => a.family === "suppressed" && a.key.includes("agent")));
  const c = compareFeatures(atoms0, extractFeatures(parse(generate(p0), "en")));
  assert.equal(c.familyScores["suppressed"]?.score, 1);
});

test("round trip: zh classifier and particle atoms are extracted and preserved", () => {
  const p0 = parse("他买了三本书。", "zh");
  const atoms0 = extractFeatures(p0);
  assert.ok(atoms0.some((a) => a.family === "classifier" && a.value === "本"));
  assert.ok(atoms0.some((a) => a.family === "particle-scope" && a.key.includes("了")));
  const c = compareFeatures(atoms0, extractFeatures(parse(generate(p0), "zh")));
  assert.equal(c.micro, 1, JSON.stringify(c.records.filter((r) => r.outcome !== "preserved")));
});

test("F1 FIXED (stage 5): zh preverbal negation produces its negation atoms", () => {
  // Was "known defect F1" in the stage-0 baseline: preverbal 不/没
  // fell through every branch of the zh main loop and the sentence
  // parsed affirmative. The pin is flipped deliberately, as the
  // baseline report prescribed: the negation state, its negator
  // atom and its carrier atom are all in the record now, and the
  // round trip preserves them.
  const p = parse("他不去学校。", "zh");
  const atoms = extractFeatures(p);
  const neg = atoms.find((a) => a.family === "negation" && a.key.endsWith("|negated"));
  assert.equal(neg?.value, "true");
  assert.ok(atoms.some((a) => a.family === "negation" && a.key.endsWith("|negator") && a.value === "不"));
  const c = compareFeatures(atoms, extractFeatures(parse(generate(p), "zh")));
  assert.equal(c.micro, 1, JSON.stringify(c.records.filter((r) => r.outcome !== "preserved")));
});
