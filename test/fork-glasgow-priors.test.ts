/**
 * fork-glasgow-priors.test.ts — the Glasgow scope extension
 * (2026-11-17): "prepare for all, high to low including gender
 * assessment."
 *
 * All nine Glasgow dimensions are prepared as labelled,
 * provenance-carrying PRIORS read by their consumer units,
 * under the arc's governing principle: the norms supply
 * KNOWLEDGE about the communication; they never direct the
 * system's values — no dimension's value sets a price, fires
 * a flag, or decides anything by itself. Each dimension below
 * gets its pin: the access function with its provenance label,
 * the consumer-side read point, and the behaviour showing it
 * informs without directing. What remains deliberately
 * unconsumed is stated per dimension, here and in the report.
 *
 * Order, high to low as commissioned:
 *  1. familiarity → NormalcyAssessment (the base arc; the
 *     access shape is pinned here, the wiring in
 *     fork-normalcy.test.ts).
 *  2. valence + arousal + dominance → EDU priors (LEDU).
 *  3. concreteness → Senses-Scening placement prior.
 *  4. imageability → the imaging slot (access path only;
 *     deliberately unconsumed — no imaging unit exists).
 *  5. semantic size → scene-placement prior (consulted;
 *     weighed at nothing in v1).
 *  6. age of acquisition → token-resolution prior.
 *  7. gender association → GUARDED KNOWLEDGE ONLY.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/fork/session";
import { processTurn } from "../src/fork/turn";
import { parse } from "../src/fork/parse";
import { classifyAspects } from "../src/fork/assess";
import { emotionAspect, emotionPriorFor } from "../src/fork/ledu";
import { buildSensesFace, placementPriorsFor } from "../src/fork/senses-scening";
import {
  ageOfAcquisitionOf,
  concretenessOf,
  familiarityOf,
  genderAssociationOf,
  imageabilityOf,
  semanticSizeOf,
  wordFrequencyOf,
} from "../src/fork/normalcy-unit";
import { setGlasgowEnabled } from "../src/glasgow";
import type { InformationObject } from "../src/fork/info-object";

function run(session: Session, turns: string[]) {
  return turns.map((t) => processTurn(session, t));
}
function persons(session: Session): InformationObject[] {
  return session.objects.filter((o) => o.producer === "person") as InformationObject[];
}

/* ---------------- 1. familiarity: the labelled access shape ---------------- */

test("familiarity (and wordfreq): the access functions return labelled, provenance-carrying facts", () => {
  const fam = familiarityOf("queen");
  assert.ok(fam);
  assert.equal(fam!.dimension, "familiarity");
  assert.equal(fam!.mean, 5.633, "the published mean, as published");
  assert.match(fam!.scale, /7-point/);
  assert.match(fam!.source, /Glasgow Norms/);
  const freq = wordFrequencyOf("abattoir");
  assert.equal(freq?.zipf, 2.5, "the filed Zipf value for a genuinely rare real word");
  assert.match(freq!.source, /wordfreq/);
  // Absence is reported as absence, never as a measured zero.
  assert.equal(familiarityOf("blorp"), undefined);
  assert.equal(wordFrequencyOf("blorp"), undefined);
});

/* ---------------- 2. affect priors → the EDU (through the LEDU) ---------------- */

test("affect prior: a word's Glasgow values alone never create an emotion reading", () => {
  // 'murder' is rated strongly negative in the norms
  // (valence 1.531 of 9) — and the EDU derives NO emotion
  // reading for it. The prior stands available, labelled;
  // the derivation's absence is the EDU's own.
  const prior = emotionPriorFor("murder");
  assert.ok(prior, "the prior is available to the bridge");
  assert.equal(prior!.valence?.mean, 1.531);
  assert.match(prior!.valence!.source, /Glasgow Norms/);
  assert.equal(emotionAspect("murder"), undefined, "no emotion reading is created by the prior");
  const aspects = classifyAspects(parse("I saw the murder.", "en"));
  assert.ok(!aspects.some((a) => a.aspect === "emotion"), "no emotion aspect enters the object's readings");
});

test("affect prior: where the EDU does derive a reading, the consultation is filed — and the reading is untouched", () => {
  const s = newSession();
  run(s, ["I was furious."]);
  const info = persons(s)[0];
  const reading = info.aspects.find((a) => a.aspect === "emotion");
  assert.ok(reading, "the EDU's reading stands");
  assert.equal(reading!.value, "furious");
  const consult = info.trail.find((a) => a.data?.affectPrior);
  assert.ok(consult, "the prior consultation is on the object's trail");
  assert.equal(consult!.unit, "lpu/language-emotion-desire-unit");
  assert.equal((consult!.data!.affectPrior as { valence?: number }).valence, 1.794, "furious's filed valence");
  assert.match(consult!.note, /directed nothing/, "the record states the prior's standing: knowledge, not direction");
});

/* ---------------- 3. concreteness → the placement prior ---------------- */

function airportSession(): Session {
  const s = newSession();
  run(s, ["I am at the airport.", "The airport is in Chicago."]);
  return s;
}

test("concreteness prior: a concrete noun is default-placed; an abstract one is not placed by default", () => {
  // soup: concreteness 6.188 (concrete). idea: 2.177
  // (abstract). Each is the merely-mentioned entity of its own
  // fragment entering the running airport scene. (Single-entity
  // fragments: the parser carries a compound sentence's first
  // described entity into the fragment, so the pair is run as
  // two parallel sessions, not one compound sentence.)
  assert.equal(concretenessOf("soup")?.mean, 6.188);
  assert.equal(concretenessOf("idea")?.mean, 2.177);

  const s1 = airportSession();
  run(s1, ["The soup is cold."]);
  const soupFace = persons(s1).pop()!.senses?.scene;
  assert.ok(soupFace, "the fragment binds into the running scene");
  assert.ok((soupFace!.placed ?? []).some((p) => p.figure === "soup"), "the concrete noun takes the proximity default");
  assert.ok((soupFace!.unknownsOpened ?? []).some((u) => u.of === "soup"), "its exact location opens as an unknown");

  const s2 = airportSession();
  const [r] = run(s2, ["The idea is sweet."]);
  const ideaFace = persons(s2).pop()!.senses?.scene;
  assert.ok(ideaFace, "the fragment binds into the running scene");
  assert.ok(!(ideaFace!.placed ?? []).some((p) => p.figure === "idea"), "the abstract noun is not placed by default");
  assert.ok(
    !(ideaFace!.unknownsOpened ?? []).some((u) => u.of === "idea"),
    "no exact-location unknown opens for an unplaced abstract entity",
  );
  // RE-PIN (the recognition programme, R2, 2026-11-19): the
  // seeded airport session means this telling is not the
  // conversation's first turn, so its acknowledgement is
  // now the recognition receipt showing the state it
  // established. The placement assertions above — the
  // claim under test — are unchanged.
  assert.equal(r.reply, "Ok. The idea is sweet.", "the telling is acknowledged, its established state shown");
});

/* ---------------- 4. imageability: the slot, deliberately unconsumed ---------------- */

test("imageability: the labelled access path exists — and nothing consumes it in v1", () => {
  assert.equal(imageabilityOf("elephant")?.mean, 6.857, "highly imageable, as published");
  assert.equal(imageabilityOf("philosophy")?.mean, 2.212, "barely imageable, as published");
  assert.match(imageabilityOf("elephant")!.source, /Glasgow Norms/);
  // Deliberately unconsumed: there is no imaging-scening unit
  // in the registry (the slot is recorded in the
  // Senses-Scening placeholder). Behaviourally: a highly
  // imageable subject and a barely imageable one take the
  // identical path through the system — same reply, and no
  // trace field anywhere reads the dimension.
  for (const line of ["The elephant is cold.", "The philosophy is cold."]) {
    const s = newSession();
    const [r] = run(s, [line]);
    assert.equal(r.reply, "Ok. Noted.");
    assert.ok(!/imageab/i.test(JSON.stringify(r.trace)), "no trace record reads imageability");
  }
});

/* ---------------- 5. semantic size: consulted at placement, weighed at nothing in v1 ---------------- */

test("semantic size: the prior is read at the placement site — placements are invariant across its extremes", () => {
  assert.equal(semanticSizeOf("elephant")?.mean, 5.692, "felt-big, as published");
  assert.equal(semanticSizeOf("ant")?.mean, 1.5, "felt-small, as published");
  assert.ok(placementPriorsFor("elephant").semanticSize, "the placement bundle carries the size fact");
  // Weighed at nothing in v1: elephant and ant, each the
  // merely-mentioned entity entering the same running scene,
  // are placed identically — same tier, same relation, same
  // basis.
  for (const word of ["elephant", "ant"]) {
    const s = airportSession();
    run(s, [`The ${word} is sweet.`]);
    const face = persons(s).pop()!.senses?.scene;
    const rec = (face!.placed ?? []).find((p) => p.figure === word);
    assert.ok(rec, `${word} is default-placed`);
    assert.equal(rec!.tier, "default-placed");
    assert.equal(rec!.relation, "in-or-near");
  }
  // And the unit-level read point agrees: buildSensesFace
  // over the same fragment places the elephant.
  const s = airportSession();
  const face = buildSensesFace(parse("The elephant is sweet.", "en"), s, "describe");
  assert.ok(face.scene?.placed.some((p) => p.figure === "elephant"));
});

/* ---------------- 6. age of acquisition → the token-resolution prior ---------------- */

test("AoA prior: a correction landing on a late-acquired word carries the labelled fact — the resolution itself unchanged", () => {
  assert.equal(ageOfAcquisitionOf("hypothesis")?.mean, 6.343, "late-acquired, as published (band scale)");
  const withLayer = parse("I read the hypothsis.", "en").tokenResolutions ?? [];
  const rec = withLayer.find((r) => r.surface === "hypothsis");
  assert.ok(rec, "the misspelling was resolved");
  assert.equal(rec!.outcome, "corrected");
  assert.deepEqual(rec!.replacement, ["hypothesis"]);
  assert.match(rec!.aoaPrior ?? "", /late-acquired/);
  assert.match(rec!.aoaPrior ?? "", /Glasgow Norms/, "the fact carries its provenance");
  // With the Glasgow layer withheld, the resolution is
  // identical in every field but the prior: the prior directs
  // nothing, not even the record's other fields.
  setGlasgowEnabled(false);
  try {
    const withoutLayer = parse("I read the hypothsis.", "en").tokenResolutions ?? [];
    const bare = withoutLayer.find((r) => r.surface === "hypothsis");
    assert.ok(bare);
    assert.equal(bare!.aoaPrior, undefined);
    const { aoaPrior: _dropped, ...rest } = rec!;
    assert.deepEqual(rest, bare, "outcome, replacement, confidence and candidates are the layer's to know, never to move");
  } finally {
    setGlasgowEnabled(true);
  }
  // An early-acquired landing word carries no prior: the
  // record stays clean where the knowledge does not apply.
  const early = parse("I saw the quokka.", "en").tokenResolutions ?? [];
  assert.ok(early.every((r) => r.aoaPrior === undefined), "'quota' (the landing) is not late-acquired — no prior attached");
});

/* ---------------- 7. gender association: guarded knowledge only ---------------- */

test("gender association: the labelled access path exists", () => {
  const queen = genderAssociationOf("queen");
  assert.ok(queen);
  assert.equal(queen!.dimension, "gender");
  assert.equal(queen!.mean, 1.313, "strongly feminine-associated, as published");
  assert.equal(genderAssociationOf("king")?.mean, 6.806, "strongly masculine-associated, as published");
  assert.match(queen!.scale, /feminine-associated/);
  assert.match(queen!.source, /Glasgow Norms/);
});

test("gender guard: a strongly-gendered word produces identical pricing, flags and reply with the layer present vs withheld", () => {
  const capture = () => {
    const s = newSession();
    const results = run(s, ["The queen is cold.", "Is the queen cold?"]);
    return results.map((r) => ({
      reply: r.reply,
      pricing: r.trace.pricing,
      normalcy: r.trace.normalcy,
      saidSo: r.trace.saidSo,
      gapQuestion: r.trace.gapQuestion,
    }));
  };
  const present = capture();
  setGlasgowEnabled(false);
  let withheld: ReturnType<typeof capture>;
  try {
    withheld = capture();
  } finally {
    setGlasgowEnabled(true);
  }
  assert.deepEqual(withheld, present, "the gender dimension's presence moves nothing: no price, no flag, no reply");
  assert.equal(present[1].reply, "You said so.", "the sequence really exercised the flag-and-answer machinery");
  assert.ok(present[1].normalcy?.flags.some((f) => f.kind === "self-redundancy"), "a priced flag stood in both runs");
});
