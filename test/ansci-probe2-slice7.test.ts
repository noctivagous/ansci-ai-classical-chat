/**
 * ansci-probe2-slice7.test.ts — the dictionary shape for a
 * common-noun "what is a X?" (Probe-2 Slice 7, 2026-11-20;
 * owner ruling "1a" on the probe-2 diagnostic's K2).
 *
 * Until this slice the only gloss-answering shape was the
 * ENTITY shape (a grounded instance synset's gloss), so
 * "what is a capital?" answered with Marx's *Capital* —
 * the instance synset wn-n07425466 shares the lemma —
 * while the word's ordinary senses stood unread in the
 * same extract. The dictionary shape answers a common
 * noun from its ordinary synsets (non-instance, and
 * carrying the word lowercase — a regular synset that
 * files a name, like the genus "Paris", is not one): the
 * only sense alone, or a later sense Lesk promotes on
 * conversation evidence alone (evidence decides; the
 * frequency prior never moves the answer), or — several
 * senses, no winner — the LISTING of them all in the
 * dictionary's own sense order (the lexicon's
 * enumeration — the climb's "[n sense N]").
 *
 * AMENDMENT (same day, the owner's two rulings on the
 * slice's report): as first built, the no-winner case
 * answered the FIRST sense standing; the owner ruled
 * that a many-sensed word ("capital" has six) is not
 * answered by its first — the answer lists them all —
 * and that a definition answer has nothing to do with
 * the instance synset sharing the lemma, on any path,
 * including the decline a stood-down consultation leaves
 * standing. The pins that moved carry supersession
 * comments; the Lesk-winner and single-sense pins did
 * not move.
 *
 * The entity shape stands down only where the turn's own
 * evidence says the subject is not asked about as a name:
 * the lemma carries ordinary senses AND the subject stands
 * lowercase in the question. A lemma with no regular
 * senses ("oklahoma") is name-shaped by construction, and
 * a capitalised subject is the asker's own name-mark —
 * in this shape the subject never opens the sentence.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { chooseDictionarySense, ordinaryNounSenses } from "../src/ansci/dictionary";

const MARX_REPLY =
  "Capital: Critique of Political Economy is a book written by Karl Marx (1867) describing his economic theories.";
/* The listing (Slice 7 amendment): all six ordinary
 * senses of "capital", in the dictionary's enumeration
 * order — the column top, the uppercase letter, the seat
 * of government, the centre of activity, wealth, assets.
 * The two instance synsets (Marx's book; the federal
 * government) are not in it: a definition answer has
 * nothing to do with them. */
const CAPITAL_DICTIONARY_REPLY =
  "Capital has 6 senses in my dictionary: (1) the upper part of a column that supports the entablature; " +
  "(2) one of the large alphabetic characters used as the first letter in writing or printing proper names " +
  "and sometimes for emphasis; (3) a seat of government; (4) a center that is associated more than any other " +
  "with some activity or product; (5) wealth in the form of money or property owned by a person or business " +
  "and human resources of economic value; (6) assets available for use in the production of further assets.";
const OKLAHOMA_REPLY = "Oklahoma is a state in south central United States.";

/* ---- the store: regular senses are the dictionary's, instances are not ---- */

test("dictionary store: 'capital' carries six ordinary senses, and the instance synsets are not among them", () => {
  const senses = ordinaryNounSenses("capital");
  assert.equal(senses.length, 6);
  assert.equal(senses[0].synsetId, "wn-n03003474");
  assert.equal(senses[0].sense, 1);
  assert.ok(!senses.some((s) => s.synsetId === "wn-n07425466"), "Marx's book is an instance, not a dictionary sense");
  assert.ok(!senses.some((s) => s.synsetId === "wn-n08510603"), "the federal government is an instance too");
});

test("dictionary store: 'oklahoma' has no ordinary senses — its only noun synset is the instance", () => {
  assert.deepEqual(ordinaryNounSenses("oklahoma"), []);
  assert.equal(chooseDictionarySense("oklahoma"), undefined);
});

test("dictionary store: a regular synset that files a name is not an ordinary sense — 'paris' and 'atlantis'", () => {
  // The genus "Paris" (lemmas "Paris" / "genus Paris") and
  // the legendary "Atlantis" are regular synsets, but no
  // lemma of theirs carries the word lowercase: the
  // dictionary files a name there, not a common noun.
  assert.deepEqual(ordinaryNounSenses("paris"), []);
  assert.deepEqual(ordinaryNounSenses("atlantis"), []);
});

/* ---- the commissioned case: capital ---- */

test("'what is a capital?' answers from the dictionary — the listing of all six ordinary senses, never Marx", () => {
  // Superseded by the Slice 7 amendment (owner ruling
  // (1)): as first built this pinned the first sense
  // alone ("Capital is the upper part of a column…");
  // the word has six ordinary senses and no evidence
  // discriminates, so the answer lists them all.
  const { reply, trace } = processTurn(newSession(), "what is a capital?");
  assert.equal(reply, CAPITAL_DICTIONARY_REPLY);
  assert.ok(!reply.includes("Marx"), "a definition answer has nothing to do with the instance synset");
  assert.equal(trace.dictionaryAnswer?.via, "listing");
  assert.equal(trace.dictionaryAnswer?.ordinarySenses, 6);
  assert.equal(trace.dictionaryAnswer?.senses?.length, 6);
  assert.equal(trace.dictionaryAnswer?.senses?.[0].synsetId, "wn-n03003474");
  assert.ok(
    !trace.dictionaryAnswer?.senses?.some((s) => s.synsetId === "wn-n07425466"),
    "the instance synset is not among the listed senses",
  );
  assert.equal(trace.entityAnswer, undefined);
});

test("'what is capital?' (bare form) answers from the dictionary too — the same listing", () => {
  const { reply, trace } = processTurn(newSession(), "what is capital?");
  assert.equal(reply, CAPITAL_DICTIONARY_REPLY);
  assert.equal(trace.dictionaryAnswer?.via, "listing");
});

test("name-shaped: 'What is Capital?' — the asker's own capital — still reaches the entity record", () => {
  const { reply, trace } = processTurn(newSession(), "What is Capital?");
  assert.equal(reply, MARX_REPLY);
  assert.equal(trace.entityAnswer?.synsetId, "wn-n07425466");
  assert.equal(trace.dictionaryAnswer, undefined);
});

test("the book stays reachable under its capitalised form: 'what is Das Kapital?'", () => {
  const { reply, trace } = processTurn(newSession(), "what is Das Kapital?");
  assert.equal(reply, MARX_REPLY);
  assert.equal(trace.entityAnswer?.synsetId, "wn-n07425466");
});

test("recorded limit: 'what is das kapital?' (lowercase) takes the dictionary path — the parse hands over the lemma 'capital'", () => {
  // The multiword lemma "Das Kapital" is not a parse unit:
  // the parse draws subject 'capital' with 'das' qualifying
  // it, so nothing in the turn distinguishes the asking
  // from "what is capital?" — the dictionary answers (the
  // listing, since the amendment). The limit is recorded
  // in the slice report, per commission.
  const { reply, trace } = processTurn(newSession(), "what is das kapital?");
  assert.equal(reply, CAPITAL_DICTIONARY_REPLY);
  assert.equal(trace.dictionaryAnswer?.via, "listing");
});

/* ---- oklahoma: the entity answer is byte-for-byte what it was ---- */

test("'what is oklahoma?' keeps its entity answer byte-for-byte", () => {
  const { reply, trace } = processTurn(newSession(), "what is oklahoma?");
  assert.equal(reply, OKLAHOMA_REPLY);
  assert.equal(trace.entityAnswer?.synsetId, "wn-n09295833");
  assert.equal(trace.dictionaryAnswer, undefined);
});

/* ---- the entity programme's standing acceptance stands ---- */

test("'what is paris?' (lowercase, bare) still answers with the city — the genus is not an ordinary sense", () => {
  const { reply, trace } = processTurn(newSession(), "what is paris?");
  assert.equal(reply, "Paris is the capital and largest city of France; and international center of culture and commerce.");
  assert.equal(trace.entityAnswer?.synsetId, "wn-n09090737");
  assert.equal(trace.dictionaryAnswer, undefined);
});

test("'what is atlantis?' still declines, located at the name — an ungrounded name the dictionary only files capitalised", () => {
  const { reply, trace } = processTurn(newSession(), "what is atlantis?");
  assert.equal(
    reply,
    "I can't answer that from what I know: I have nothing on atlantis in my notes, and I have no way to connect anything to 'what'.",
  );
  assert.equal(trace.dictionaryAnswer, undefined);
  assert.equal(trace.entityAnswer, undefined);
});

/* ---- the routing pair: turkey ---- */

test("'what is turkey?' (lowercase) is the dictionary's senses, listed; 'What is Turkey?' is the republic, from the entity record", () => {
  // The lowercase pin is superseded by the Slice 7
  // amendment: as first built it answered the bird sense
  // alone; 'turkey' carries four ordinary senses and no
  // evidence discriminates, so the answer lists them
  // (the bird first, in the dictionary's order).
  const lower = processTurn(newSession(), "what is turkey?");
  assert.equal(
    lower.reply,
    "Turkey has 4 senses in my dictionary: (1) large gallinaceous bird with fan-shaped tail; widely " +
      "domesticated for food; (2) an event that fails badly or is totally ineffectual; (3) flesh of large " +
      "domesticated fowl usually roasted; (4) a person who does something thoughtless or annoying.",
  );
  assert.equal(lower.trace.dictionaryAnswer?.via, "listing");
  assert.equal(lower.trace.dictionaryAnswer?.senses?.[0].synsetId, "wn-n01824495");
  const upper = processTurn(newSession(), "What is Turkey?");
  assert.match(upper.reply, /^Turkey is a Eurasian republic in Asia Minor and the Balkans;/);
  assert.equal(upper.trace.entityAnswer?.synsetId, "wn-n09201560");
  assert.equal(upper.trace.dictionaryAnswer, undefined);
});

/* ---- sense choice: the listing, and Lesk on evidence ---- */

test("'what is a bank?' with no context lists all ten ordinary senses", () => {
  // Superseded by the Slice 7 amendment (owner ruling
  // (1)): as first built this pinned the first sense
  // alone (the flight maneuver); 'bank' carries ten
  // ordinary senses and no evidence discriminates, so
  // the answer lists them all.
  const { reply, trace } = processTurn(newSession(), "what is a bank?");
  assert.equal(
    reply,
    "Bank has 10 senses in my dictionary: (1) a flight maneuver; aircraft tips laterally about its " +
      "longitudinal axis (especially in turning); (2) a building in which the business of banking is " +
      "transacted; (3) a container (usually with a slot in the top) for keeping money at home; " +
      "(4) a financial institution that accepts deposits and channels the money into lending activities; " +
      "(5) an arrangement of similar objects in a row or in tiers; (6) a long ridge or pile; " +
      "(7) sloping land (especially the slope beside a body of water); (8) a slope in the turn of a road " +
      "or track; the outside is higher than the inside in order to reduce the effects of centrifugal " +
      "force; (9) the funds held by a gambling house or the dealer in some gambling games; (10) a supply " +
      "or stock held in reserve for future use (especially in emergencies).",
  );
  assert.equal(trace.dictionaryAnswer?.via, "listing");
  assert.equal(trace.dictionaryAnswer?.senses?.length, 10);
});

test("Lesk promotes on conversation evidence: a river conversation moves 'bank' to the riverbank sense", () => {
  // The prior turn's lemmas (river, run, sea) are the
  // context Lesk reads: the riverbank sense's signature
  // overlaps them uniquely (evidence 4.5 against the
  // ridge sense's 3.25 and the first sense's 1.5 — most
  // river contexts leave the ridge and riverbank senses
  // tied, and a tie promotes nothing).
  const s = newSession();
  processTurn(s, "the river runs to the sea.");
  const { reply, trace } = processTurn(s, "what is a bank?");
  assert.equal(reply, "Bank is sloping land (especially the slope beside a body of water).");
  assert.equal(trace.dictionaryAnswer?.synsetId, "wn-n09378458");
  assert.equal(trace.dictionaryAnswer?.via, "lesk");
});

test("chooseDictionarySense: no context, the listing stands; river context, sense 7 is promoted and answers alone", () => {
  // The no-context expectation is superseded by the
  // amendment: the choice's `via` is now "listing" (the
  // first sense remains the citation head in `chosen`).
  // The Lesk promotion is unchanged — a winner answers
  // alone, it does not list.
  const plain = chooseDictionarySense("bank", [], []);
  assert.equal(plain?.via, "listing");
  assert.equal(plain?.senses.length, 10);
  assert.equal(plain?.chosen.synsetId, "wn-n00165946");
  const river = chooseDictionarySense("bank", ["river", "water"], ["river", "water"]);
  assert.equal(river?.chosen.synsetId, "wn-n09378458");
  assert.equal(river?.via, "lesk");
});

/* ---- no pre-emption: classification routes and other branches stand ---- */

test("classified subjects keep their routes: 'what is salt?' and 'what is a dog?' are unchanged", () => {
  for (const q of ["what is salt?", "what is a dog?"]) {
    const { reply, trace } = processTurn(newSession(), q);
    assert.equal(reply, "I can't answer that from what I know: I have no way to connect anything to 'what'.");
    assert.equal(trace.dictionaryAnswer, undefined);
  }
});

test("probe control V3 unchanged: 'what is happiness?' (classified, emotion) does not take the dictionary path", () => {
  const { reply, trace } = processTurn(newSession(), "what is happiness?");
  assert.equal(reply, "I can't answer that from what I know: I have no way to connect anything to 'what'.");
  assert.equal(trace.dictionaryAnswer, undefined);
});

test("probe control V1 changed, as reported: 'what is real?' — unclassified, and the dictionary holds regular noun senses for it", () => {
  // Before this slice V1 declined ("nothing on real in my
  // notes"). 'real' is unclassified and carries three
  // regular noun senses, so the dictionary answers — a
  // legitimate coverage change, recorded in the slice
  // report. The reply's form is superseded by the Slice 7
  // amendment: as first built it pinned the coin sense
  // alone; the three senses are now listed.
  const { reply, trace } = processTurn(newSession(), "what is real?");
  assert.equal(
    reply,
    "Real has 3 senses in my dictionary: (1) an old small silver Spanish coin; (2) the basic unit of " +
      "money in Brazil; equal to 100 centavos; (3) any rational or irrational number.",
  );
  assert.equal(trace.dictionaryAnswer?.via, "listing");
  assert.equal(trace.dictionaryAnswer?.senses?.[0].synsetId, "wn-n13621112");
});

test("the unanchored-definite branch is not pre-empted: 'what is the capital?' still asks after its referent", () => {
  const { reply, trace } = processTurn(newSession(), "what is the capital?");
  assert.equal(reply, "What capital? You just started talking.");
  assert.equal(trace.dictionaryAnswer, undefined);
});

/* ---- the amendment: ruling (2) on the fall-through ---- */

test("ruling (2) on the fall-through: a consultation standing the dictionary down leaves a dictionary-worded decline — no instance gloss", () => {
  // The one path by which a definition-determined turn
  // could still surface an instance gloss after Slice 7:
  // a wired Wikidata consultation (here set directly on
  // the session, exactly as wikidata-turn.ts sets it for
  // its country shape) stands BOTH gloss shapes down, and
  // the turn falls through to the missing decline below
  // the block — which quoted the entity record's gloss
  // ("I have capital in my notes as a book written by
  // Karl Marx…"). The wrapper's ambiguous / no-resolution
  // outcomes keep that decline as the reply, so the gloss
  // reached the visitor. The decline is now worded from
  // the dictionary determination the block recorded.
  const s = newSession();
  s.wikidataConsult = { shape: "country", subject: "capital" };
  const { reply, trace } = processTurn(s, "what is capital?");
  assert.equal(
    reply,
    "I can't answer that from what I know: I have capital in my dictionary with 6 ordinary senses, " +
      "but nothing that connects it to 'what', and I have no way to connect anything to 'what'.",
  );
  assert.ok(!reply.includes("Marx"), "the instance gloss does not surface on a definition-determined turn");
  assert.equal(trace.dictionaryAnswer, undefined);
  assert.equal(trace.entityAnswer, undefined);
});

/* ---- the amendment: the listing's measured lengths ---- */

test("listing lengths, measured for the owner's cap decision: the extract's most polysemous nouns", () => {
  // No cap is set in this shape (owner ruling (1) lists
  // them all); these counts are the measurement the
  // amendment report carries, pinned so a future extract
  // change re-measures them loudly rather than silently.
  assert.equal(ordinaryNounSenses("head").length, 33);
  assert.equal(ordinaryNounSenses("line").length, 30);
  assert.equal(ordinaryNounSenses("point").length, 26);
  assert.equal(ordinaryNounSenses("set").length, 12);
  assert.equal(ordinaryNounSenses("bank").length, 10);
});
