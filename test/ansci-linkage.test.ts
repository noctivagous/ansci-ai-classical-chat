/* Link Grammar coverage slice: expression-tree conversion
 * pins, lazy disjunct generation, the bounded solver, and the
 * shadow landing (docs/ansci/linkgrammar-coverage-slice.md).
 *
 * The shadow contract under test: the solver runs beside the
 * English parse and records its result on the sentence; the
 * parse itself — graph, checks, replies — is byte-identical
 * with the layer on or off. A partial linkage is a record with
 * an UNUSED set, never a parse; a bound hit is recorded in the
 * result, never silent. */
import assert from "node:assert/strict";
import test from "node:test";
import { getDefaultLinkGrammarTable } from "../src/linkgrammar";
import { connectorFamily, easyMatch, generateDisjuncts, setLinkageEnabled, solveLinkage } from "../src/ansci/linkage";
import { linkgrammarAvailable } from "../src/ansci/linkgrammar-lex";
import { parse, setLinkageRouting } from "../src/ansci/parse";

/** Generous bounds for the direct solver tests: the shipped
 *  defaults are chat-duty (a 60ms shadow beside every parse),
 *  and these tests judge the solver's rules, not its budget. */
const ROOMY = { lengthCap: 24, perWordCap: 4000, searchBudget: 60_000, countCap: 512, timeBudgetMs: 10_000, weightCap: 10_000_000 };

test("linkage: expression trees ship for every entry, measured not truncated", (t) => {
  if (!linkgrammarAvailable()) {
    t.skip("data/linkgrammar not present (run scripts/import-linkgrammar.py)");
    return;
  }
  const table = getDefaultLinkGrammarTable();
  assert.ok(table);
  assert.equal(table.counts.treesShipped, 1571);
  assert.equal(table.counts.treeNodesTotal, 321953);
  assert.equal(table.counts.treeNodesMax, 1407);
  assert.equal(table.counts.treesOversized, 0, "no entry's tree exceeded the converter's node cap");
  assert.equal(table.trees.length, table.entries.length, "trees align by index with entries");
  assert.ok(table.trees.every((tr) => tr !== null), "every shipped entry carries its tree at this cap");
});

test("linkage: connector matching follows upstream's easy_match", () => {
  // Upper-case parts identical; subscripts match with '*'
  // wildcards and shorter-prefix leniency.
  assert.equal(easyMatch("Sp*i+", "S-"), true);
  assert.equal(easyMatch("Ds**c+", "Ds**c-"), true);
  assert.equal(easyMatch("O+", "Os-"), true);
  assert.equal(easyMatch("O+", "Ss-"), false);
  // A lower-case head/dependent prefix on both sides must
  // DIFFER: h matches d, h does not match h.
  assert.equal(easyMatch("hCO-", "dCO+"), true);
  assert.equal(easyMatch("hCO-", "hCO+"), false);
  assert.equal(easyMatch("dWV-", "WV+"), true);
  assert.equal(connectorFamily("@MVp-"), "MV");
  assert.equal(connectorFamily("dWV-"), "WV");
  assert.equal(connectorFamily("Ds**c+"), "D");
});

test("linkage: lazy generation is per-form, deduplicated and cost-pruned", (t) => {
  if (!linkgrammarAvailable()) {
    t.skip("data/linkgrammar not present");
    return;
  }
  const a = generateDisjuncts("a");
  assert.ok(a && a.disjuncts.length > 0, "the determiner generates disjuncts");
  assert.ok(a!.disjuncts.every((d) => d.cost <= 10), "no disjunct survives over the dictionary's max cost");
  const keys = new Set(a!.disjuncts.map((d) => `${d.lefts.join(" ")}|${d.rights.join(" ")}`));
  assert.equal(keys.size, a!.disjuncts.length, "disjuncts are deduplicated by connector sequence");
  assert.equal(generateDisjuncts("zzzz-not-a-word"), undefined, "an unfiled form has no generation");
});

test("linkage: the solver links a plain transitive sentence completely", (t) => {
  if (!linkgrammarAvailable()) {
    t.skip("data/linkgrammar not present");
    return;
  }
  const s = solveLinkage(["I", "booked", "a", "room", "."], ROOMY);
  assert.ok(s);
  assert.equal(s!.status, "complete");
  assert.deepEqual(s!.unused, []);
  const fams = s!.links.map((l) => `${s!.tokens[l.left]}-${l.family}-${s!.tokens[l.right]}`);
  assert.ok(fams.some((x) => x.startsWith("i-S-booked")), `subject link present: ${fams}`);
  assert.ok(fams.some((x) => x === "booked-O-room"), `object link present: ${fams}`);
  assert.ok(fams.some((x) => x === "a-D-room"), `determiner link present: ${fams}`);
  assert.ok(s!.linkageCount >= 1);
});

test("linkage: negation is linked, never dropped, in a complete linkage", (t) => {
  if (!linkgrammarAvailable()) {
    t.skip("data/linkgrammar not present");
    return;
  }
  const s = solveLinkage(["I", "did", "not", "book", "a", "room", "."], ROOMY);
  assert.ok(s);
  assert.equal(s!.status, "complete");
  assert.ok(!s!.unused.includes("not"), "a complete linkage cannot leave 'not' unused");
  assert.ok(
    s!.links.some((l) => s!.tokens[l.left] === "not" || s!.tokens[l.right] === "not"),
    "'not' participates in a link",
  );
});

test("linkage: bounds are recorded, never silent", (t) => {
  if (!linkgrammarAvailable()) {
    t.skip("data/linkgrammar not present");
    return;
  }
  const long = Array.from({ length: 30 }, (_, i) => ["the", "cat", "sat", "on", "mat"][i % 5]);
  const s = solveLinkage(long);
  assert.ok(s);
  assert.equal(s!.status, "declined");
  assert.ok(s!.boundsHit.includes("length-cap"), "the length-cap hit is on the record");
  const tight = solveLinkage(["I", "booked", "a", "room", "."], {
    lengthCap: 24,
    perWordCap: 4000,
    searchBudget: 5,
    countCap: 512,
    timeBudgetMs: 60_000,
    weightCap: 10_000_000,
  });
  assert.ok(tight);
  if (tight!.status !== "complete") {
    assert.ok(tight!.boundsHit.includes("search-budget"), "a starved search records its budget hit");
  }
});

test("linkage: F1 routing — agreement is stable, inversion is not routed", (t) => {
  if (!linkgrammarAvailable()) {
    t.skip("data/linkgrammar not present");
    return;
  }
  const edgesOf = (p: ReturnType<typeof parse>) =>
    (p.meaning?.edges ?? []).map((e) => `${e.relation}:${p.meaning!.nodes.find((n) => n.id === e.to)?.lemma}`).sort();
  // Ditransitives where the linkage's O*n/O classification
  // agrees with the positional slots: routing changes nothing.
  for (const s of ["She gave him a book.", "He showed the students a photo.", "I sent the company a letter."]) {
    setLinkageRouting("f1", false);
    const off = edgesOf(parse(s, "en"));
    setLinkageRouting("f1", true);
    const on = edgesOf(parse(s, "en"));
    assert.deepEqual(on, off, `F1 routing leaves the agreeing ditransitive standing: ${s}`);
    assert.ok(on.some((e) => e.startsWith("recipient:")), `${s}: a recipient is assigned`);
  }
  // Locative inversion: positional honestly assigns no agent.
  // An S-link recovery was attempted and refused — the
  // linkage's S partner is the locative ('mat'), and routing
  // it installed a wrong agent. The refusal is under test:
  // F1 routing must leave this parse exactly as positional.
  const inv = edgesOf(parse("On the mat sat the cat.", "en"));
  assert.deepEqual(inv, ["theme:cat"], "no agent is invented for the locative inversion");
});

test("linkage: the shadow rides the parse and changes nothing", (t) => {
  if (!linkgrammarAvailable()) {
    t.skip("data/linkgrammar not present");
    return;
  }
  const withShadow = parse("I booked a room.", "en");
  assert.ok(withShadow.linkageShadow, "the shadow record is present on a successful parse");
  assert.ok(
    withShadow.linkageShadow!.links.some((l) => l.family === "O"),
    "the parse-time shadow (chat-duty bounds) still links the object",
  );
  setLinkageEnabled(false);
  try {
    const without = parse("I booked a room.", "en");
    assert.equal(without.linkageShadow, undefined, "the layer off: no shadow record");
    assert.deepEqual(
      JSON.parse(JSON.stringify({ ...without, linkageShadow: undefined })),
      JSON.parse(JSON.stringify({ ...withShadow, linkageShadow: undefined })),
      "graph and parse are identical with the shadow on or off",
    );
    assert.equal(solveLinkage(["I", "booked", "a", "room", "."]), undefined, "the solver itself is silent when off");
  } finally {
    setLinkageEnabled(true);
  }
});
