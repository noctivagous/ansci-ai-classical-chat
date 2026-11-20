/**
 * ansci-wordnet.test.ts — the WordNet lexicon provider (wordnet-lex.ts):
 * derived entries for words outside the hand lexicon, semantic
 * climbing to classified anchors, the confidence gate, the
 * table-ownership brake (X1), and the provider toggle the holdout
 * run's baseline arm depends on.
 *
 * Every expectation below was verified against the actual OEWN 2024
 * extract in data/wordnet/extract — including where the data's sense
 * order differs from intuition (blizzard's first noun sense is a
 * "rash of burglaries"; its weather sense is second and is the one
 * whose climb anchors).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { EN_LEXICON, type VerbEntry } from "../src/ansci/sentence";
import { parse } from "../src/ansci/parse";
import { generate } from "../src/ansci/generate";
import { checkSentence } from "../src/ansci/check";
import { buildForkGraph, derive, deriveSentence } from "../src/ansci/join";
import { lookupClassification } from "../src/ansci/classify";
import {
  climbCandidate,
  climbClassification,
  enableWordnetLexicon,
  isWordnetDerived,
  regularPast,
  thirdForm,
  wordnetVerb,
} from "../src/ansci/wordnet-lex";

const graph = buildForkGraph();

test("regular morphology: third person and past formation", () => {
  assert.equal(thirdForm("blow"), "blows");
  assert.equal(thirdForm("watch"), "watches");
  assert.equal(thirdForm("fly"), "flies");
  assert.equal(regularPast("arrive"), "arrived");
  assert.equal(regularPast("try"), "tried");
  assert.equal(regularPast("stop"), "stopped");
  assert.equal(regularPast("flow"), "flowed");
});

test("the wind sentence: 'blows' derives as a Wood verb; wind and east classify through the join", () => {
  const p = parse("The wind blows from the east.", "en");
  const root = p.meaning.nodes.find((n) => n.id === p.meaning.rootId);
  assert.equal(root?.lemma, "blow");
  assert.equal(root?.syntacticElement, "Wood");
  assert.equal((EN_LEXICON["blow"] as VerbEntry).source, "wordnet", "the verb entry is the provider's, marked as such");
  assert.ok(isWordnetDerived("blow"));
  assert.equal(generate(p), "The wind blows from the east.", "round-trips exactly");
  assert.deepEqual(checkSentence(p), [], "no violations: blow's FrameNet signature (Bungling — a wrong frame name for this sense, recorded in the stage-1 report) contributes slots but no obligation, since FrameNet core FEs are not obligatory; the three-state assessment, not the binary checker, judges its unfilled core object");
  // wind and east are seed correspondence terms (Wood trigram / Wood
  // direction): the join classifies both through the curated table.
  const derived = deriveSentence(graph, p);
  const byLemma = new Map([...derived.values()].map((d) => [d.concept, d]));
  assert.equal(byLemma.get("wind")?.classification?.element, "Wood");
  assert.equal(byLemma.get("east")?.classification?.element, "Wood");
});

test("a derived-verb sentence outside the old vocabulary parses and generates", () => {
  const p = parse("The river flows to the sea.", "en");
  const root = p.meaning.nodes.find((n) => n.id === p.meaning.rootId);
  assert.equal(root?.lemma, "flow");
  assert.equal(generate(p), "The river flows to the sea.");
});

test("climbing: gale reaches the wind anchor in one hop, provenance wordnet-derived", () => {
  const climb = climbClassification("gale");
  assert.ok(climb, "gale climbs");
  assert.equal(climb.element, "Wood");
  assert.equal(climb.anchor, "wind");
  assert.equal(climb.hops, 1);
  assert.equal(climb.confidence, 0.855, "anchor confidence 0.95 decayed by one hop");
  assert.equal(climb.provenance, "wordnet-derived");
  assert.ok(climb.confidence < (lookupClassification("wind")?.confidence ?? 0), "climbed confidence is below the anchor's own");
});

test("climbing: drizzle reaches rain (Water); blizzard anchors via its SECOND sense (storm)", () => {
  const drizzle = climbClassification("drizzle");
  assert.equal(drizzle?.element, "Water");
  assert.equal(drizzle?.anchor, "rain");
  // Blizzard's first noun sense ("a series of unpleasant occurrences")
  // climbs nowhere; the weather sense is second, and sense iteration
  // in extract order finds its storm anchor. Asserted as the data gives.
  const blizzard = climbClassification("blizzard");
  assert.equal(blizzard?.element, "Wood");
  assert.equal(blizzard?.anchor, "storm");
  assert.equal(blizzard?.hops, 1);
  assert.match(blizzard?.path ?? "", /sense 2/);
});

test("climbing: the anger family — rage is table-owned; fury climbs to the rage anchor", () => {
  // 'rage' itself never climbs: the curated table owns it (Wood,
  // fork-creative). The WordNet chain that would support it is visible
  // one step away: fury's first synset is fury/rage/madness, so fury
  // anchors on 'rage' at hop 0.
  assert.equal(lookupClassification("rage")?.element, "Wood");
  assert.equal(climbClassification("rage"), undefined, "tabled concepts are not climbed");
  const fury = climbClassification("fury");
  assert.equal(fury?.element, "Wood");
  assert.equal(fury?.anchor, "rage");
});

test("the gate: hurricane's climb finds the storm anchor but decays below 0.6 and is refused", () => {
  const candidate = climbCandidate("hurricane");
  assert.ok(candidate, "an anchor WAS found — the refusal is the gate's, not the chain's");
  assert.equal(candidate.anchor, "storm");
  assert.equal(candidate.hops, 3);
  assert.ok(candidate.confidence < 0.6, `decayed confidence ${candidate.confidence} is below the gate`);
  assert.equal(candidate.gated, true);
  assert.equal(climbClassification("hurricane"), undefined, "below-gate climbs yield no classification");
});

test("X1 brake: 'cold' is table-owned, and the illness aspect derives no winter", () => {
  assert.equal(climbClassification("cold"), undefined, "the climb never sees a tabled concept");
  // H6 re-scope (2026-11-15): sleet is NO LONGER tabled — the table is
  // phase-null for frozen/mixed precipitation. The climb, a separate
  // derived mechanism at its own provenance, still derives Water for
  // it through the precipitation anchor; the table asserts nothing.
  assert.equal(lookupClassification("sleet"), undefined, "sleet is phase-null in the table after the H6 re-scope");
  assert.equal(climbClassification("sleet")?.element, "Water", "the climb derives sleet via the precipitation anchor");
  const illness = derive(graph, "cold", "illness");
  assert.equal(illness.classification?.element, "Metal", "the illness sense is the lungs' element");
  assert.ok(
    illness.conclusions.every((c) => c.label !== "winter" && !/winter/i.test(c.path)),
    "no winter conclusions from a head cold",
  );
  const temperature = derive(graph, "cold", "temperature");
  assert.equal(temperature.classification?.element, "Water", "the temperature sense is Water, as attested");
});

test("a climbed concept gains a usable semantic address in a parsed sentence", () => {
  const p = parse("The gale bends the trees.", "en");
  assert.equal(generate(p), "The gale bends the trees.");
  const galeNode = p.meaning.nodes.find((n) => n.lemma === "gale");
  assert.equal(galeNode?.semanticElement, "Wood", "the provider set the semantic address from the climb");
  const derived = deriveSentence(graph, p);
  const gale = [...derived.values()].find((d) => d.concept === "gale");
  assert.equal(gale?.classification?.element, "Wood");
  assert.equal(gale?.classification?.provenance, "wordnet-derived");
  assert.equal(gale?.classification?.confidence, 0.855);
  assert.ok((gale?.conclusions.length ?? 0) > 0, "the anchor's correspondence row is inherited");
});

test("hand lexicon always wins: provider derivations never overwrite hand entries", () => {
  parse("The wind blows from the east.", "en"); // force derivations
  assert.equal((EN_LEXICON["winter"] as { source?: string }).source, undefined, "winter's entry is still the hand one");
  assert.equal((EN_LEXICON["bite"] as VerbEntry).source, undefined, "bite's verb entry is still the hand one");
  assert.equal((EN_LEXICON["cat"] as { source?: string }).source, undefined, "cat was not replaced by a derived entry");
});

test("provider off: 'blows' fails exactly as it did before the provider existed", () => {
  parse("The wind blows from the east.", "en"); // derive + register first
  assert.ok(EN_LEXICON["blow"], "derived entry registered while on");
  enableWordnetLexicon(false);
  try {
    assert.equal(EN_LEXICON["blow"], undefined, "disabling purges the provider's registered entries");
    assert.throws(() => parse("The wind blows from the east.", "en"), /no verb found/);
    assert.equal(wordnetVerb("blows"), undefined);
  } finally {
    enableWordnetLexicon(true);
  }
  const p = parse("The wind blows from the east.", "en");
  assert.equal(generate(p), "The wind blows from the east.", "re-enabling restores derivation");
});

test("irregular-form resolution: 'found' derives find, and its paradigm drives generation", () => {
  // The derived-verb form quirk: 'found' is itself a WordNet lemma
  // (establish), so lemma-identity used to win and the surface's
  // tense was lost — "She found rest in the garden" regenerated as
  // "She founds rest…" under a bogus agreement violation.
  const entry = wordnetVerb("found");
  assert.equal(entry?.lemma, "find");
  assert.equal(entry?.forms.past, "found");
  const s = "She found rest in the garden.";
  assert.equal(generate(parse(s, "en")), s);
  assert.deepEqual(checkSentence(parse(s, "en")).map((v) => v.name), []);
  // The homonymous lemma keeps its own paradigm via its marked
  // surfaces: 'founded' still resolves to 'found' (establish).
  assert.equal(wordnetVerb("founded")?.lemma, "found");
  assert.equal(wordnetVerb("saw")?.lemma, "see");
});
