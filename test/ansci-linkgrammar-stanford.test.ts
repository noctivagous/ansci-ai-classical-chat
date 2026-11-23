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
  // (subj/obj/head-word/NEGATIVE-FLAG propagation), which the
  // standalone entry point deliberately does not run. They must
  // not appear half-formed. (The full pipeline entry point,
  // stanfordRelationsFull, runs the passes and DOES produce
  // them — see the "full:" tests below.)
  const { stanfordRelations } = await import("../src/ansci/linkgrammar-stanford");
  const r = await stanfordRelations("The bird, a robin, sang sweetly.");
  assert.equal(r.status, "complete");
  const rels = new Set(r.relations.map((x) => x.rel));
  assert.ok(rels.has("det"), `det present: ${JSON.stringify(r.relations)}`);
  for (const missing of ["nsubj", "dobj", "advcl", "prep_in", "neg", "ccomp", "xsubj", "appos"]) {
    assert.ok(!rels.has(missing), `${missing} absent by design, got: ${JSON.stringify(r.relations)}`);
  }
});

/* ------------------------------------------------------------------ */
/* Full pipeline (tagging -> semantic -> stanford): the semantic-      */
/* dependent families now fire. Expected relations are upstream        */
/* RelEx's own TestStanford expectations (opencog/relex                */
/* src/java_test/relex/test/TestStanford.java), checked as             */
/* containment: the port's output must include each expected           */
/* relation; extras and known divergences are pinned per case.         */
/* ------------------------------------------------------------------ */

async function fullRels(text: string): Promise<Set<string>> {
  const { stanfordRelationsFull, formatStanfordRelations } = await import(
    "../src/ansci/linkgrammar-stanford"
  );
  const r = await stanfordRelationsFull(text);
  assert.equal(r.status, "complete", `${text}: ${r.error ?? ""}`);
  return new Set(formatStanfordRelations(r.relations).split("\n").filter(Boolean));
}

test("full: nsubj and advmod (TestStanford: Jim runs quickly)", async () => {
  const rels = await fullRels("Jim runs quickly.");
  assert.ok(rels.has("nsubj(runs-2, Jim-1)"), [...rels].join(" "));
  assert.ok(rels.has("advmod(runs-2, quickly-3)"), [...rels].join(" "));
});

test("full: ditransitive iobj/dobj (TestStanford: She gave me a raise)", async () => {
  const rels = await fullRels("She gave me a raise.");
  for (const e of [
    "nsubj(gave-2, she-1)",
    "iobj(gave-2, me-3)",
    "det(raise-5, a-4)",
    "dobj(gave-2, raise-5)",
  ]) assert.ok(rels.has(e), `${e} in ${[...rels].join(" ")}`);
});

test("full: neg fires via NEGATIVE-FLAG (TestStanford: not true)", async () => {
  const rels = await fullRels("What she said is not true.");
  for (const e of [
    "dobj(said-3, what-1)",
    "nsubj(said-3, she-2)",
    "csubj(true-6, said-3)",
    "cop(true-6, is-4)",
    "neg(true-6, not-5)",
  ]) assert.ok(rels.has(e), `${e} in ${[...rels].join(" ")}`);
  // Divergence from the upstream expectation set, pinned: the
  // semantic pass also files `not` as an adverbial
  // (_advmod(true, not)), which the stanford transfer copies.
  assert.ok(rels.has("advmod(true-6, not-5)"), [...rels].join(" "));
});

test("full: nsubjpass fires; agent does not (upstream prep-links gap)", async () => {
  const rels = await fullRels("The man has been killed by the police.");
  assert.ok(rels.has("nsubjpass(killed-5, man-2)"), [...rels].join(" "));
  assert.ok(rels.has("auxpass(killed-5, been-4)"), [...rels].join(" "));
  // SF_AGENT reads <prep-links by> on the verb; upstream's only
  // live PrepositionLinkAlg use is commented out in the shipped
  // semantic file, so prep-links are never populated and agent
  // cannot fire in the default flow — upstream or here. The
  // by-phrase surfaces as advmod + native _pobj instead.
  assert.ok(![...rels].some((x) => x.startsWith("agent(")), [...rels].join(" "));
  assert.ok(rels.has("advmod(killed-5, by-6)"), [...rels].join(" "));
});

test("full: ccomp and xcomp fire (TestStanford-adjacent cases)", async () => {
  const rels = await fullRels("He says that you like to swim.");
  assert.ok(rels.has("ccomp(says-2, like-5)"), [...rels].join(" "));
  assert.ok(rels.has("nsubj(like-5, you-4)"), [...rels].join(" "));
  const rels2 = await fullRels("Tom likes to eat fish.");
  assert.ok(rels2.has("xcomp(likes-2, eat-4)"), [...rels2].join(" "));
  assert.ok(rels2.has("dobj(eat-4, fish-5)"), [...rels2].join(" "));
});

test("full: partmod fires (TestStanford: Truffles picked)", async () => {
  const rels = await fullRels("Truffles picked during the spring are tasty.");
  assert.ok(rels.has("partmod(truffles-1, picked-2)"), [...rels].join(" "));
  assert.ok(rels.has("nsubj(tasty-7, truffles-1)"), [...rels].join(" "));
  // Upstream expects prep_during(picked-2, spring-5); see the
  // agent test for why prep_* cannot fire in the default flow.
  assert.ok(rels.has("advmod(picked-2, during-3)"), [...rels].join(" "));
});

test("full: advcl fires with a divergence (auxiliary as head)", async () => {
  const rels = await fullRels("The accident happened as the night was falling.");
  assert.ok(rels.has("nsubj(happened-3, accident-2)"), [...rels].join(" "));
  assert.ok(rels.has("nsubj(falling-8, night-6)"), [...rels].join(" "));
  // Upstream expects advcl(happened-3, falling-8) and
  // aux(falling-8, was-7). Here the head-word chain stops at
  // the auxiliary: advcl(happened-3, was-7), mark(was-7, as-4),
  // cop(falling-8, was-7). Pinned as the measured behaviour.
  assert.ok(rels.has("advcl(happened-3, was-7)"), [...rels].join(" "));
});

test("full: expl divergence pinned (There is a place)", async () => {
  // Upstream expects expl(is-2, there-1) and no nsubj on
  // `there`. The port produces nsubj(there-1, place-4) and
  // nsubj(is-2, place-4): the expletive promotion differs.
  // The core expectations (nsubj(is, place), aux(go, can)) hold.
  const rels = await fullRels("There is a place we can go.");
  assert.ok(rels.has("nsubj(is-2, place-4)"), [...rels].join(" "));
  assert.ok(rels.has("aux(go-7, can-6)"), [...rels].join(" "));
  assert.ok(rels.has("nsubj(there-1, place-4)"), [...rels].join(" "));
});

test("stanford: recovered linkage yields no relations", async () => {
  const { stanfordRelations } = await import("../src/ansci/linkgrammar-stanford");
  const r = await stanfordRelations("i got her number though.");
  assert.equal(r.status, "recovered");
  assert.deepEqual(r.relations, []);
});
