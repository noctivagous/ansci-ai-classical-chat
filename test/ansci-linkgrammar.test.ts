/* Link Grammar provider: conversion pins, coverage, lookups,
 * and the two evidence consumers (docs/ansci/
 * linkgrammar-dictionary-slice.md, 2026-11-21).
 *
 * The Link Grammar layer follows the VerbNet layer's contract
 * (test/ansci-verbnet.test.ts): a build-time conversion of the
 * upstream English dictionary (opencog/link-grammar, dictionary
 * 5.12.4) into summary records under data/linkgrammar/, read
 * through a provider (src/ansci/linkgrammar-lex.ts) that is
 * silent when the data is absent or switched off. What ships
 * per entry is a summary computed from the FULL disjunct
 * expansion — live-disjunct count, bare-object (O+) capacity,
 * minimum cost, provenance — not the disjuncts themselves;
 * the pins below hold the conversion to its measured shape so
 * a re-import that changes it is a deliberate, visible act.
 *
 * The consumers are evidence-only: enItems classification
 * where the WordNet chain leaves a form unclassified, and a
 * check.ts cross-check that speaks only where FrameNet and
 * VerbNet are both silent. Nothing here parses with the
 * dictionary — there is no solver in the slice. */
import assert from "node:assert/strict";
import test from "node:test";
import { checkSentence } from "../src/ansci/check";
import {
  linkgrammarAvailable,
  linkgrammarCoverageReport,
  linkgrammarLookup,
  linkgrammarMaxO,
  linkgrammarNounOnly,
  linkgrammarVerbOnly,
  setLinkGrammarEnabled,
} from "../src/ansci/linkgrammar-lex";
import { parse } from "../src/ansci/parse";
import { enableWordnetLexicon } from "../src/ansci/wordnet-lex";
import { getDefaultLinkGrammarTable } from "../src/linkgrammar";

test("linkgrammar: conversion counts are pinned", (t) => {
  if (!linkgrammarAvailable()) {
    t.skip("data/linkgrammar not present (run scripts/import-linkgrammar.py)");
    return;
  }
  const table = getDefaultLinkGrammarTable();
  assert.ok(table, "the shipped table loads");
  // The dictionary as converted: 2,238 entries in 4.0.dict,
  // 453 of them macro definitions and 1,810 word entries with
  // 100,716 heads between inline words and words-file includes.
  assert.equal(table.counts.dictEntries, 2238);
  assert.equal(table.counts.macros, 453);
  assert.equal(table.counts.wordEntries, 1810);
  assert.equal(table.counts.entryHeads, 100716);
  // The shipped vocabulary is AnSci's evaluated vocabulary:
  // 80,067 distinct forms were seen; 60,154 ship in 1,571
  // entries. 21,691 heads fell outside the vocabulary and
  // 1,342 were idiom (multiword) heads, dropped by design.
  // (The coverage slice's closed-class supplement — 2,441
  // supplemented bases: bare / j-* / d / p / c / e-filed heads
  // plus the modal auxiliaries — raised the shipped counts
  // from the dictionary slice's 59,291 forms in 1,420 entries;
  // the supplement files no subscripted content entry, and the
  // kind-based consumers below are unchanged by it.)
  assert.equal(table.counts.formsSeen, 80067);
  assert.equal(table.counts.formsShipped, 60154);
  assert.equal(table.counts.shippedEntries, 1571);
  assert.equal(table.counts.droppedOutsideVocab, 21691);
  assert.equal(table.counts.vocabSupplementBases, 2441);
  assert.equal(table.counts.droppedIdiomForms, 1342);
  // Expansion was complete: no entry hit the expansion cap,
  // no words file was missing, no word reference was unknown,
  // and no form was lost to cost pruning — 22,541,246
  // disjuncts expanded, 1,543,537 of them dead under the
  // default dialect (cost over the dictionary's own
  // max-disjunct-cost of 10) and recorded, not shipped.
  assert.equal(table.counts.disjunctsExpanded, 22541246);
  assert.equal(table.counts.disjunctsLive, 20997709);
  assert.equal(table.counts.disjunctsDroppedByCost, 1543537);
  assert.equal(table.counts.entriesOverCap, 0);
  assert.equal(table.counts.formsDroppedByCost, 0);
  assert.equal(table.counts.missingWordsFiles, 0);
  assert.equal(table.counts.unknownWordRefs, 0);
  assert.equal(table.forms.size, 60154, "every shipped form loads into the table");
  assert.equal(table.entries.length, 1571, "every shipped entry loads into the table");
});

test("linkgrammar: coverage report against the parser's inventory", (t) => {
  if (!linkgrammarAvailable()) {
    t.skip("data/linkgrammar not present");
    return;
  }
  // The dictionary covers the parser's word inventory almost
  // completely at form level (59,290 of its 60,154 shipped
  // forms sit in the inventory — the remainder are the
  // coverage slice's closed-class supplement, which the
  // WordNet-derived inventory itself does not file) and
  // 6,662 of the 8,754
  // single-word verb lemmas the parser can derive — against
  // VerbNet's 4,135 of 11,604, the broader of the two external
  // valency sources, as the slice brief's floor scan expected.
  assert.deepEqual(linkgrammarCoverageReport(), {
    linkgrammarForms: 60154,
    parserWords: 205793,
    coveredWords: 59290,
    parserVerbs: 8754,
    coveredVerbs: 6662,
  });
});

test("linkgrammar: provider lookups carry class, capacity and provenance", (t) => {
  if (!linkgrammarAvailable()) {
    t.skip("data/linkgrammar not present");
    return;
  }
  const give = linkgrammarLookup("give");
  assert.ok(give, "give is dictionary-covered");
  assert.deepEqual(give.kinds, ["verb"]);
  assert.deepEqual(give.subscripts, ["v"]);
  assert.equal(give.maxO, 2, "give's disjuncts license two bare objects (O+ and TO+)");
  assert.equal(give.entries.length, 1);
  assert.equal(give.entries[0].line, 7754, "provenance: the entry's line in 4.0.dict");
  assert.ok(give.entries[0].macros.length > 0, "provenance: the macro chain is recorded");

  const plan = linkgrammarLookup("plan");
  assert.ok(plan, "plan is dictionary-covered");
  assert.deepEqual(plan.kinds, ["noun", "verb"], "a form's record is the union of its entries");
  assert.equal(plan.entries.length, 2);
  assert.equal(plan.maxO, 1);

  // Class evidence is unanimity over a form's entries: it
  // fires only when every entry agrees.
  assert.equal(linkgrammarVerbOnly("abscond"), true);
  assert.equal(linkgrammarNounOnly("screenshot"), true);
  assert.equal(linkgrammarNounOnly("plan"), false, "plan is noun AND verb — no single-class evidence");
  assert.equal(linkgrammarVerbOnly("screenshot"), false);

  // Capacity is per FORM, not per lemma: the dictionary files
  // the third-person 'absconds' in an intransitive-only class
  // entry, while the base form's entry also carries a
  // transitive alternative. The check judges the form used.
  assert.equal(linkgrammarMaxO("absconds"), 0);
  assert.equal(linkgrammarMaxO("abscond"), 1);
  assert.equal(linkgrammarMaxO("give"), 2);
  assert.equal(linkgrammarLookup("zxqy"), undefined, "no record, no evidence");
});

test("linkgrammar: noun-only evidence settles a classification the WordNet chain misses", (t) => {
  if (!linkgrammarAvailable()) {
    t.skip("data/linkgrammar not present");
    return;
  }
  enableWordnetLexicon(true);
  // 'screenshots': the WordNet extract files 'screenshot'
  // only as a verb, so the enItems derivation chain (noun,
  // then adjective/adverb) leaves the plural form unclassified
  // and the parser carries it as a proper NAME — the agent
  // node keeps the capitalised surface as its lemma. The
  // dictionary files the form under noun classes only, and
  // that evidence settles it as the common noun it is.
  setLinkGrammarEnabled(false);
  const off = parse("Screenshots appeared.", "en");
  const offAgent = off.meaning.nodes.find((n) => n.role === "agent");
  assert.equal(offAgent?.lemma, "Screenshots", "provider off: the name reading stands");
  setLinkGrammarEnabled(true);
  const on = parse("Screenshots appeared.", "en");
  const onAgent = on.meaning.nodes.find((n) => n.role === "agent");
  assert.equal(onAgent?.lemma, "screenshots", "dictionary noun evidence: the common-noun reading");
  assert.equal(onAgent?.role, "agent");
});

test("linkgrammar: the check fires beyond a form's O-capacity where no provider speaks", (t) => {
  if (!linkgrammarAvailable()) {
    t.skip("data/linkgrammar not present");
    return;
  }
  enableWordnetLexicon(true);
  // 'abscond' is derived from WordNet with no FrameNet and no
  // VerbNet signature — its frame is evidence-free — and the
  // dictionary files the form used, 'absconds', with no
  // object-taking disjunct at all. One realised bare object
  // is already beyond every disjunct the dictionary has.
  const p = parse("She absconds the rabbit.", "en");
  const violations = checkSentence(p).filter((v) => v.name === "valency-linkgrammar-disallowed");
  assert.equal(violations.length, 1);
  assert.match(violations[0].message, /at most 0 bare object\(s\)/);
  assert.match(violations[0].message, /realises 1 bare object\(s\)/);

  // Under capacity is silence: capacity is a maximum, not an
  // obligation.
  const q = parse("She absconds.", "en");
  assert.equal(
    checkSentence(q).filter((v) => v.name === "valency-linkgrammar-disallowed").length,
    0,
    "the intransitive use is within the dictionary's disjuncts",
  );
});

test("linkgrammar: the check stays silent where VerbNet or FrameNet already speaks", (t) => {
  if (!linkgrammarAvailable()) {
    t.skip("data/linkgrammar not present");
    return;
  }
  enableWordnetLexicon(true);
  // VerbNet territory: 'blushed' is VerbNet-covered, and its
  // violation is VerbNet's to give (see ansci-verbnet.test).
  // The dictionary also files 'blushed', but the cross-check
  // does not speak over the VerbNet family.
  const p = parse("She blushed the rabbit.", "en");
  const names = checkSentence(p).map((v) => v.name);
  assert.ok(names.includes("valency-verbnet-disallowed"), "the VerbNet check fires as before");
  assert.ok(!names.includes("valency-linkgrammar-disallowed"), "no Link Grammar violation beside it");

  // FrameNet territory: 'agonized' carries a FrameNet
  // signature. The dictionary files the form with capacity 0,
  // so the cross-check WOULD fire on capacity — it stays
  // silent because the entry is not evidence-free.
  const q = parse("She agonized the rabbit.", "en");
  assert.equal(
    checkSentence(q).filter((v) => v.name === "valency-linkgrammar-disallowed").length,
    0,
    "a FrameNet-signed verb is not the cross-check's territory",
  );
});

test("linkgrammar: provider off leaves prior behaviour standing", (t) => {
  if (!linkgrammarAvailable()) {
    t.skip("data/linkgrammar not present");
    return;
  }
  enableWordnetLexicon(true);
  setLinkGrammarEnabled(false);
  try {
    assert.equal(linkgrammarLookup("give"), undefined, "off means no evidence");
    const p = parse("She absconds the rabbit.", "en");
    assert.equal(
      checkSentence(p).filter((v) => v.name === "valency-linkgrammar-disallowed").length,
      0,
      "and no cross-check violation",
    );
  } finally {
    setLinkGrammarEnabled(true);
  }
});
