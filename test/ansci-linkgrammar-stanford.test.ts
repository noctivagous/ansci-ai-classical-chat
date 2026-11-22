/**
 * ansci-linkgrammar-stanford.test.ts — RelEx-compatible Stanford
 * dependencies over the WASM linkage.
 *
 * Covers the ported rule engine (path resolution, template
 * matching, the makePath aliasing the rules depend on, group
 * appends) and end-to-end relations on sentences whose
 * expected output exercises only the self-contained rule
 * subset: determiners, possessives, auxiliaries, copulas,
 * particles, proper-noun compounds. Semantic-dependent
 * relations (nsubj, dobj, advcl, prep_*, neg, ...) are
 * asserted ABSENT where RelEx needs its semantic pass —
 * that gap is measured, not hidden.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LgFeatureNode,
  applyRules,
  buildStanfordGraph,
  collectStanfordRelations,
  formatStanfordRelations,
  parseRuleFile,
  stanfordRelations,
} from "../src/ansci/linkgrammar-stanford";

function runRules(words: string[], links: { left: number; right: number; label: string }[], ruleText: string): { root: LgFeatureNode; words: LgFeatureNode[] } {
  const g = buildStanfordGraph(words, links);
  const { rules } = parseRuleFile(ruleText);
  const errors: string[] = [];
  applyRules(g.root, rules, (e) => errors.push(e));
  assert.deepEqual(errors, []);
  return g;
}



test("engine: 61 stanford rules parse with no skipped kinds", () => {
  // parsed indirectly through the entry point below; direct check here
  // that the rule file yields exactly the upstream rule count.
  const { rules, skippedKinds } = parseRuleFile(
    require("../src/ansci/linkgrammar-stanford-rules").RELEX_STANFORD_ALGS as string,
  );
  assert.equal(rules.length, 61);
  assert.deepEqual(skippedKinds, []);
});

test("engine: template regex uses full match with .-as-class", () => {
  const g = runRules(
    ["LEFT-WALL", "a", "book", "."],
    [{ left: 0, right: 3, label: "Xp" }],
    "#TemplateActionAlg\nR1\n<LAB> = \\D\\.*\n=\n<F_R done> = yes\n",
  );
  // no D link: nothing applied, no sf-links anywhere
  assert.deepEqual(collectStanfordRelations(g.root), []);
});

test("engine: makePath aliases both sides to one node", () => {
  // Mirrors SF_DET on "this book": after the rule fires, the
  // determiner word's ref and the head's sf-links._det end up
  // the SAME node.
  const g = buildStanfordGraph(
    ["LEFT-WALL", "this", "book"],
    [{ left: 1, right: 2, label: "Ds" }],
  );
  const { rules } = parseRuleFile(
    "#TemplateActionAlg\nR1\n<LAB> = \\D\\.*\n=\n<F_R ref sf-links _det> += <F_L ref>\n",
  );
  const errors: string[] = [];
  applyRules(g.root, rules, (e) => errors.push(e));
  assert.deepEqual(errors, []);
  const det = g.words[2].pathTarget(["ref", "sf-links", "_det"]);
  const ref = g.words[1].pathTarget(["ref"]);
  assert.ok(det != null && ref != null);
  assert.equal(det === ref, true);
});

test("engine: group append accumulates multiple determiners", () => {
  const g = runRules(
    ["LEFT-WALL", "this", "or", "any", "book"],
    [
      { left: 1, right: 4, label: "Ds" },
      { left: 3, right: 4, label: "Ds" },
    ],
    "#TemplateActionAlg\nR1\n<LAB> = \\D\\.*\n=\n<F_R ref sf-links _det> += <F_L ref>\n",
  );
  const det = g.words[4].pathTarget(["ref", "sf-links", "_det"]);
  assert.ok(det != null && !det.isValued);
  const m0 = det.get("member0");
  const m1 = det.get("member1");
  assert.ok(m0 != null && m1 != null, "both determiners attach");
  // member order follows rule application order
  assert.equal(m0.get("nameSource"), g.words[1]);
  assert.equal(m1.get("nameSource"), g.words[3]);
});

test("engine: % clears a feature and != treats missing as empty", () => {
  const g = runRules(
    ["LEFT-WALL", "this", "book"],
    [{ left: 1, right: 2, label: "Ds" }],
    "#TemplateActionAlg\nR1\n<LAB> = \\D\\.*\n=\n<F_R ref sf-links _det> += <F_L ref>\n#TemplateActionAlg\nR2\n<ref sf-links _det> != %\n=\n<ref sf-links _det> = %\n",
  );
  assert.equal(g.words[2].pathTarget(["ref", "sf-links", "_det"]), null);
});

test("stanford: copula and determiner in one sentence", async () => {
  const { stanfordRelations } = await import("../src/ansci/linkgrammar-stanford");
  const r = await stanfordRelations("Bill is big.");
  assert.equal(r.status, "complete");
  const names = new Set(r.relations.map((x) => x.rel));
  assert.ok(names.has("cop"), `cop present: ${JSON.stringify(r.relations)}`);
  const cops = r.relations.filter((x) => x.rel === "cop");
  assert.equal(cops.length, 1);
  assert.equal(cops[0].gov, "big");
  assert.equal(cops[0].dep, "is");
});

test("stanford: whose-determiner stays det (poss label drift)", async () => {
  // RelEx docs expect poss(wife-6, whose-5) via SF_DET_POSS
  // (<LAB> = \D\.\.w). That pattern matches the older label
  // "Ds*w"; Link Grammar 5.13 emits "Ds*wc", which the Java
  // engine also fails to match (verified against
  // java.util.regex.Pattern). So wife takes det, not poss,
  // until the upstream rule or dictionary label changes.
  const { stanfordRelations } = await import("../src/ansci/linkgrammar-stanford");
  const r = await stanfordRelations("I saw the man whose wife you love.");
  assert.equal(r.status, "complete");
  const poss = r.relations.filter((x) => x.rel === "poss");
  assert.deepEqual(poss, []);
  const dets = r.relations.filter((x) => x.rel === "det" && x.gov === "wife");
  assert.equal(dets.length, 1);
  assert.equal(dets[0].dep, "whose");
});

test("stanford: auxiliary from the documented example", async () => {
  // RelEx docs: aux(go-7, can-6) for "there is a place we can go."
  // (expl/nsubj need the semantic pass and are absent by design.)
  const { stanfordRelations } = await import("../src/ansci/linkgrammar-stanford");
  const r = await stanfordRelations("There is a place we can go.");
  assert.equal(r.status, "complete");
  const aux = r.relations.filter((x) => x.rel === "aux");
  assert.deepEqual(
    aux.map((x) => [x.gov, x.govIdx, x.dep, x.depIdx]),
    [["go", 7, "can", 6]],
  );
  const dets = r.relations.filter((x) => x.rel === "det");
  assert.deepEqual(
    dets.map((x) => [x.gov, x.govIdx, x.dep, x.depIdx]),
    [["place", 4, "a", 3]],
  );
});

test("stanford: semantic-dependent relations stay absent, loudly", async () => {
  // nsubj/dobj/advcl/prep_*/neg need RelEx's semantic pass
  // (subj/obj/head-word/NEGATIVE-FLAG propagation), which this
  // port deliberately does not run. They must not appear half-formed.
  const { stanfordRelations } = await import("../src/ansci/linkgrammar-stanford");
  const r = await stanfordRelations("The bird, a robin, sang sweetly.");
  assert.equal(r.status, "complete");
  const rels = new Set(r.relations.map((x) => x.rel));
  assert.ok(rels.has("det"), `det present: ${JSON.stringify(r.relations)}`);
  for (const missing of ["nsubj", "dobj", "advcl", "prep_in", "neg", "ccomp", "xsubj", "appos"]) {
    assert.ok(!rels.has(missing), `${missing} absent by design, got: ${JSON.stringify(r.relations)}`);
  }
});

test("stanford: recovered linkage yields no relations", async () => {
  const { stanfordRelations } = await import("../src/ansci/linkgrammar-stanford");
  const r = await stanfordRelations("i got her number though.");
  assert.equal(r.status, "recovered");
  assert.deepEqual(r.relations, []);
});
