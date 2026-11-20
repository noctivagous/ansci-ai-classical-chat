/**
 * fork-vocab-pass.test.ts — the vocabulary / knowledge pass
 * (2026-11-19, the owner's "1a" commission).
 *
 * V1 · Register-word filings. The sweep extracted the
 * emotion-bearing vocabulary of the sealed conversation set
 * (128 probes' visitor turns) and the EmpatheticDialogues
 * material (its 32 emotion labels among them), and tested
 * every candidate against the three authorities — the
 * classification table's emotion aspect, the LEDU's
 * canonical face / the EDU's canonical names, the LEDU's
 * uncategorised register. Words filing under none were
 * determined by the established routes only: the
 * classification climb (WordNet ancestry to a filed anchor,
 * the route that settled 'sorry'), the canonical face (a
 * category's state form or degree variant — Glasgow arousal
 * admissible as degree evidence only), or the category's
 * own head entry. Words whose category assignment is not
 * reliable stand WITHHELD as owner questions in GAPS §2 —
 * the pins below hold them unfiled, deliberately.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { newSession, type Session } from "../src/fork/session";
import { processTurn, type TurnResult } from "../src/fork/turn";
import { classificationsOf } from "../src/fork/classify";
import { canonicalNameFor, uncategorisedEmotionWord } from "../src/fork/ledu";
import { mixFor } from "../src/fork/emotion-mix";
import { parse } from "../src/fork/parse";
import { extractFeatures, type FeatureAtom } from "../src/fork/features";
import { enableWordnetLexicon } from "../src/fork/wordnet-lex";
import { isAttestedWord } from "../src/fork/token-resolve";

enableWordnetLexicon(true);

function drive(texts: string[]): { session: Session; results: TurnResult[] } {
  const session = newSession();
  const results = texts.map((t) => processTurn(session, t));
  return { session, results };
}

const filing = (w: string) => classificationsOf(w).find((e) => e.aspect === "emotion")?.element;

/* ---- V1 data: the filings ---- */

test("V1 data: the sweep's unfiled words file under their categories, by the recorded routes", () => {
  // The climb route ('sorry''s precedent): 'upset' — its
  // state synset IS the worried synset; the climb reaches
  // the filed anchor 'worried' at hop 0 (Earth).
  assert.equal(filing("upset"), "Earth", "upset under worry — the climb's filing");
  // The canonical-face route: state forms and degree
  // variants of filed categories.
  assert.equal(filing("disappointed"), "Metal", "disappointed under grief");
  assert.equal(filing("disappointment"), "Metal", "disappointment under grief");
  assert.equal(filing("devastated"), "Metal", "devastated under grief — high degree");
  assert.equal(filing("proud"), "Fire", "proud, the state of pride");
  assert.equal(filing("annoyed"), "Wood", "annoyed under anger — low degree");
  assert.equal(filing("anxious"), "Earth", "anxious, the state of anxiety, under worry");
  assert.equal(filing("apprehension"), "Water", "apprehension under fear — the owner's determination, low degree");
  assert.equal(filing("apprehensive"), "Water", "apprehensive under fear — low degree");
  assert.equal(filing("ashamed"), "Fire", "ashamed, the state of shame");
  assert.equal(filing("embarrassed"), "Fire", "embarrassed under shame");
  assert.equal(filing("terrified"), "Water", "terrified under fear — high degree");
  assert.equal(filing("joyful"), "Fire", "joyful, joy's state form");
  assert.equal(filing("hopeful"), "Wood", "hopeful, the state of hope");
  assert.equal(filing("optimistic"), "Wood", "optimistic under hope");
  assert.equal(filing("jealous"), "Wood", "jealous, the state of jealousy");
  assert.equal(filing("content"), "Earth", "content, the adjective of contentment");
  // The faces name the categories (anxious and upset stand
  // without one, deliberately — see ledu.ts: a face to
  // 'worry' would route their register reading through the
  // EDU's Metal seat for 憂 ahead of the table's Earth).
  assert.equal(canonicalNameFor("disappointed"), "grief");
  assert.equal(canonicalNameFor("devastated"), "grief");
  assert.equal(canonicalNameFor("annoyed"), "anger");
  assert.equal(canonicalNameFor("apprehensive"), "fear");
  assert.equal(canonicalNameFor("terrified"), "fear");
  assert.equal(canonicalNameFor("joyful"), "joy");
  assert.equal(canonicalNameFor("proud"), "pride");
  assert.equal(canonicalNameFor("hopeful"), "hope");
  assert.equal(canonicalNameFor("jealous"), "jealousy");
  assert.equal(canonicalNameFor("ashamed"), "shame");
  assert.equal(canonicalNameFor("content"), "contentment");
  assert.equal(canonicalNameFor("anxious"), "anxious", "no face — the worry-seat discipline in ledu.ts");
  assert.equal(canonicalNameFor("upset"), "upset", "no face — the worry-seat discipline in ledu.ts");
});

test("V1 data: the withheld words stand unfiled — their fittings are the owner's to give", () => {
  for (const w of ["disgusted", "disgust", "grateful", "gratitude", "surprised", "surprise", "desperate", "impressed", "caring"]) {
    assert.equal(filing(w), undefined, `${w} carries no element filing — withheld as an owner question (GAPS §2)`);
    assert.equal(canonicalNameFor(w), w, `${w} has no canonical face`);
    assert.equal(uncategorisedEmotionWord(w), undefined, `${w} is not in the uncategorised register either — it does not register element-less; it waits`);
  }
  // RE-PIN (the emotion-mix programme, 2026-11-19):
  // 'nostalgic', 'nostalgia' and 'sentimental' stood in
  // this loop when the pass withheld them as owner
  // questions (3) and (4). The owner has since ANSWERED
  // both — nostalgia ruled a mix of pensiveness, sadness
  // and joy; sentimental a mix of all five elements — and
  // commissioned the mix machinery ("do mix machinery").
  // The data claims this test makes still hold for them,
  // exactly: no element filing, no canonical face, no
  // uncategorised standing. What changed is the fourth
  // form: they now file in the emotion-mix table, which is
  // where their fittings live (fork-emotion-mix.test.ts
  // pins the entries and the behaviour).
  for (const w of ["nostalgic", "nostalgia", "sentimental"]) {
    assert.equal(filing(w), undefined, `${w} carries no element filing — a mix files no single element`);
    assert.equal(canonicalNameFor(w), w, `${w} has no canonical face`);
    assert.equal(uncategorisedEmotionWord(w), undefined, `${w} is not in the uncategorised register`);
    assert.ok(mixFor(w), `${w} files in the emotion-mix table — the owner's answers to questions (3) and (4)`);
  }
  // 'guilty' stands exactly as it stood: the uncategorised
  // register, no element — the brief's standing instruction.
  assert.equal(filing("guilty"), undefined, "guilty carries no element filing — unchanged");
  assert.equal(uncategorisedEmotionWord("guilty")?.word, "guilty", "guilty stands in the uncategorised register — unchanged");
});

/* ---- V1 behaviour: the specimens ---- */

test("V1 specimen P-027: 'disappointed' — the commiseration specimen's natural word — now files, and uptake meets it at its priced degree", () => {
  const { results } = drive(["Hello.", "I am disappointed."]);
  const r = results[1];
  // The trace reasoning, not a tuned outcome: the filing
  // (grief → Metal) registers the feeling; the register is
  // grief; the degree is plain (Glasgow arousal 3.82,
  // beside sad's 3.94 — the unmarked degree); the weight
  // is the plain first-telling 2, which clears the stated
  // threshold (2). Grief's pace: the move is the whole
  // acknowledgement.
  assert.equal(r.trace.feelingFirst?.lemma, "disappointed");
  assert.equal(r.trace.feelingFirst?.element, "Metal");
  assert.equal(r.trace.uptake?.register, "grief");
  assert.equal(r.trace.uptake?.degree, "plain");
  assert.equal(r.trace.uptake?.weight, 2);
  assert.equal(r.reply, "I am sorry. You are disappointed.");
  // And over the specimen's own telling — the spoiled
  // weekend — the event is receipted and the feeling met:
  const full = drive(["Hello.", "My weekend was ruined. I am disappointed."]);
  assert.equal(full.results[1].reply, "Ok. I am sorry. You are disappointed.");
});

test("V1 behaviour: the degree axis prices the new filings as their filings state", () => {
  // High degree (the word's own sense): devastated, grief.
  const dev = drive(["Hello.", "I am devastated."]).results[1];
  assert.equal(dev.trace.uptake?.register, "grief");
  assert.equal(dev.trace.uptake?.degree, "high");
  assert.equal(dev.reply, "I am very sorry. You are devastated.");
  // High degree: terrified, fear.
  const ter = drive(["Hello.", "I am terrified."]).results[1];
  assert.equal(ter.trace.uptake?.register, "fear");
  assert.equal(ter.trace.uptake?.degree, "high");
  // Low degree (the irritation family): annoyed registers
  // and is receipt matter at weight 1 — the threshold is
  // the family's standing determination, not tuned here.
  const ann = drive(["Hello.", "I am annoyed."]).results[1];
  assert.equal(ann.trace.feelingFirst?.element, "Wood");
  assert.match(ann.trace.uptake?.stoodDown ?? "", /does not clear the move family's threshold/);
  // Low degree (the owner's apprehension filing):
  // apprehensive stands down the same way.
  const app = drive(["Hello.", "I am apprehensive."]).results[1];
  assert.equal(app.trace.uptake?.register, "fear");
  assert.equal(app.trace.uptake?.degree, "low");
  assert.match(app.trace.uptake?.stoodDown ?? "", /does not clear the move family's threshold/);
});

test("V1 behaviour: 'upset' registers at Earth under its own name (the climb's filing, the worry-seat discipline)", () => {
  const { session, results } = drive(["Hello.", "I am upset."]);
  const st = session.states.find((x) => x.lemma === "upset");
  assert.equal(st?.element, "Earth", "the climb's anchor is 'worried' — Earth");
  assert.equal(results[1].trace.uptake?.register, "upset");
  assert.equal(results[1].reply, "I am sorry. You are upset. What did you say or do?");
  const anx = drive(["Hello.", "I am anxious."]);
  assert.equal(anx.session.states.find((x) => x.lemma === "anxious")?.element, "Earth");
});

test("V1 behaviour: the withheld words draw no register — the receipt or the bare ack answers, as before", () => {
  for (const w of ["disgusted", "grateful", "surprised"]) {
    const { results } = drive(["Hello.", `I am ${w}.`]);
    assert.equal(results[1].trace.uptake, undefined, `${w}: no uptake ground — withheld`);
    assert.equal(results[1].trace.feelingFirst, undefined, `${w}: no feelings-first registration — withheld`);
  }
  // RE-PIN (the emotion-mix programme, 2026-11-19):
  // 'nostalgic' stood in this loop under the pass's
  // withholding. The owner's rulings (questions 3 and 4,
  // answered) and the mix machinery have since landed: it
  // now draws the MIX register — never a component's — and
  // 'sentimental' registers feelings-first under the mix
  // table. The full specimens live in
  // fork-emotion-mix.test.ts; the pins here hold the
  // boundary from this side: the mix words moved, the
  // still-withheld words above did not.
  const n = drive(["Hello.", "I am nostalgic."]).results[1];
  assert.equal(n.trace.uptake?.register, "mix:nostalgia", "nostalgic draws the mix register — the owner's ruling, not a component's register");
  const s = drive(["Hello.", "I feel sentimental."]).results[1];
  assert.equal(s.trace.feelingFirst?.lemma, "sentimental");
  assert.equal(s.trace.uptake?.register, "mix:sentimental");
  // 'guilty' is untouched: the uncategorised register
  // meets it exactly as UP-2 built.
  const g = drive(["Hello.", "I am guilty."]).results[1];
  assert.equal(g.reply, "I am sorry. You are guilty.");
});

/* ---- V2: the §7 blocked items whose builds this pass lands ----
 * The determinations are entered as Part J of the repair
 * programme; the pins below are their verifications against
 * the sealed items' own sentences (the items carry no
 * expected graphs — the verification is that the atom the
 * determination names is now produced for the item's text,
 * and the negative controls hold). Items whose parse does
 * not produce the shape the determination names stay
 * blocked, their reasons recorded in GAPS §7 and Part J —
 * no test asserts them closed. */

const atomsOf = (text: string): FeatureAtom[] => extractFeatures(parse(text, "en"));
const has = (atoms: FeatureAtom[], family: string, key: string, value: string) =>
  atoms.some((a) => a.family === family && a.key === key && a.value === value);

test("V2 H-014: the containment edge the parse already produces now atomises (Part J.2)", () => {
  const atoms = atomsOf("What's in it?");
  assert.ok(has(atoms, "connective", "it|contains|what", "present"), "the container contains the questioned content");
});

test("V2 H-060/H-068/H-061: the discourse acts the parse already records now atomise (Part J.1)", () => {
  assert.ok(has(atomsOf("What about the flu?"), "discourse", "act", "topic-proposal"));
  assert.ok(has(atomsOf("What about coffee?"), "discourse", "act", "topic-proposal"));
  assert.ok(has(atomsOf("Why?"), "discourse", "act", "reason-query"));
});

test("V2 H-059: a turn-initial 'No,' before a tensed clause atomises as a correction — and its look-alikes do not (Part J.1)", () => {
  assert.ok(has(atomsOf("No, I meant the common cold"), "discourse", "act", "correction"));
  assert.ok(!has(atomsOf("No one came."), "discourse", "act", "correction"), "no comma, a quantifier — a plain statement");
  assert.ok(!atomsOf("No.").some((a) => a.family === "discourse"), "a bare 'No.' has no clause to correct with");
});

test("V2 H-021/H-020: the chains-to family extended to the English ordering words (Part J.3)", () => {
  const before = atomsOf("Did the tent come before the campfire?");
  assert.ok(has(before, "connective", "tent|chains-to|campfire", "before"), "the earlier term chains to the later");
  const first = atomsOf("Which happened first?");
  assert.ok(has(first, "attachment", "happen|ordering", "first"), "the ordinal is the predicate's ordering position");
  // No spurious ordering atoms on an unordered telling:
  assert.ok(!atomsOf("We set up the tent.").some((a) => a.key.includes("chains-to") || a.key.includes("ordering")));
});

/* ---- V3: the attestation margin, audited ----
 * The audit (GAPS §6, the vocabulary pass's determination):
 * every word type the two sealed sets use was tested against
 * the attestation union (hand lexicon ∪ resolver dictionary
 * ∪ wordfreq Zipf ≥ 3.0) and the turn layer's form passes.
 * 36 types fail the union; the passes cover 21 (15 digit
 * strings, the hyphen compounds 'ex-girlfriend'/'part-time',
 * 4 mid-sentence capitals). Of the 15 uncovered, 6 are the
 * corpus's own misspellings — the doubt is the discipline
 * working — and the correctly-spelled remainder drew no
 * spurious clarification in run 6 (the resolver settled
 * them; attestation is the trigger's last source, not its
 * only one). The line stands as drawn. The pins below hold
 * the margin's specimens where the audit found them. */

test("V3: the attestation line's specimens stand where S4 drew them", () => {
  // At or above the line, the S4 specimens attest:
  for (const w of ["canning", "socialize", "roam", "lol", "replicate", "dang"]) {
    assert.ok(isAttestedWord(w), `${w} attests (S4's evidence above the line)`);
  }
  // The corpus's genuine misspellings do not, in either set:
  for (const w of ["cimbing", "wethr", "girlfirned", "stupidiest", "wallmart", "qwerty"]) {
    assert.ok(!isAttestedWord(w), `${w} does not attest — the doubt is the discipline working`);
  }
  // The band's correctly-spelled residents below the line
  // (Zipf 2.70–2.96) do not attest by frequency either —
  // the audit's finding is that they needed no pass in
  // run 6, not that the line moved:
  for (const w of ["barbeque", "condiment", "corkscrew", "geyser", "talker", "typewriters"]) {
    assert.ok(!isAttestedWord(w), `${w} stands below the line — recorded, not re-lined`);
  }
  // The possessive class, recorded unencoded: the stem
  // attests, the 's form does not (its one sealed
  // occurrence, H-072, was confidently corrected to the
  // plural inside the parse — the resolver-step residue
  // S4's record already names as a further determination).
  assert.ok(isAttestedWord("neighbour"));
  assert.ok(!isAttestedWord("neighbour's"));
  // The type specimen: 'Oulong' — absent from the table in
  // both spellings, capitalised sentence-initially, where
  // the proper-name pass deliberately does not reach
  // ('Wethr' is the counter-specimen). An owner question,
  // recorded in GAPS §6; nothing here encodes an answer.
  assert.ok(!isAttestedWord("oulong"));
  assert.ok(!isAttestedWord("oolong"));
});
