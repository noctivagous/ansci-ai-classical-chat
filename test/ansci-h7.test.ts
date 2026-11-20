/**
 * ansci-h7.test.ts — the H7 banking pass (FLAVOR_BRIDGE_V1).
 *
 * Pins the registry's terms on the banked records:
 *  (a) each record's phase is the bridge applied to its stored
 *      flavor (the Suwen ch. 4 correspondence);
 *  (b) the confidence arithmetic — min(C_A, C_B) × K, K = 0.90
 *      fixed per bridge (amendment A1);
 *  (c) amendment A2 — the ordinary classification lookup never
 *      returns a B-derived record; the derived accessor does,
 *      labelled derived;
 *  (d) skipped substances have no record;
 *  (e) every derivation path is complete and reconstructible.
 * Plus the registry's guard case: cinnabar banks sweet → Earth
 * on its flavor aspect only, and no whole-substance
 * classification of cinnabar is created.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DERIVED_CORRESPONDENCES,
  FLAVOR_CORRESPONDENCE,
  H7_C_B,
  H7_K,
  H7_SKIPPED,
  allDerivedCorrespondences,
  derivedCorrespondencesOf,
  type Flavor,
} from "../src/ansci/flavor-bridge";
import { CLASSIFICATIONS, classificationsOf, lookupClassification } from "../src/ansci/classify";

test("the Suwen ch. 4 correspondence leg is the attested five-flavor mapping", () => {
  assert.equal(FLAVOR_CORRESPONDENCE.sour.phase, "Wood");
  assert.equal(FLAVOR_CORRESPONDENCE.bitter.phase, "Fire");
  assert.equal(FLAVOR_CORRESPONDENCE.sweet.phase, "Earth");
  assert.equal(FLAVOR_CORRESPONDENCE.pungent.phase, "Metal");
  assert.equal(FLAVOR_CORRESPONDENCE.salty.phase, "Water");
});

test("(a) every banked record's phase is the bridge applied to its stored flavor", () => {
  assert.equal(DERIVED_CORRESPONDENCES.length, 46); // 45 substances; 芒消 banks two
  for (const r of DERIVED_CORRESPONDENCES) {
    assert.equal(r.phase, FLAVOR_CORRESPONDENCE[r.flavor].phase, `${r.id}: phase must follow its flavor`);
    assert.equal(r.aspect, "recorded-flavor", `${r.id}: flavor aspect only`);
    assert.equal(r.assertionKind, "DERIVED_CORRESPONDENCE");
    assert.equal(r.evidenceGrade, "B-derived");
    assert.equal(r.ruleId, "FLAVOR_BRIDGE_V1");
    assert.equal(r.status, "admitted");
  }
  const substances = new Set(DERIVED_CORRESPONDENCES.map((r) => r.subject.surveyEntry));
  assert.equal(substances.size, 45);
});

test("(b) confidence is min(C_A, C_B) × K with K fixed at 0.90 (amendment A1)", () => {
  assert.equal(H7_K, 0.9);
  assert.equal(H7_C_B, 0.95);
  for (const r of DERIVED_CORRESPONDENCES) {
    const expected = Math.round(Math.min(r.confidenceInputs.cA, r.confidenceInputs.cB) * H7_K * 1000) / 1000;
    assert.equal(r.confidence, expected, `${r.id}: confidence arithmetic`);
    assert.equal(r.confidenceInputs.k, H7_K, `${r.id}: K is the bridge's, never per-substance`);
    assert.equal(r.confidenceInputs.cB, H7_C_B);
  }
  // The three price points the rubric produces.
  assert.equal(derivedCorrespondencesOf("cinnabar")[0].confidence, 0.855); // Benjing, clean
  assert.equal(derivedCorrespondencesOf("lüqing")[0].confidence, 0.81); // Bielu stratum
  assert.equal(derivedCorrespondencesOf("red-lead")[0].confidence, 0.63); // flavor disputed across recensions
});

test("(c) A2: the ordinary lookup never returns a B-derived record; the derived accessor does", () => {
  // The classification table is untouched by the banking pass.
  // (153 at the banking pass; 164 since the 2026-11-15 anchor-quality
  // slice added the 11 survey-attested livestock/grain entries; 173
  // since E1 (2026-11-19) filed the nine everyday emotion words —
  // angry, happy, glad, excited, sad, gloomy, lonely, afraid,
  // scared — under their canonical categories; 190 since V1 of the
  // vocabulary pass (2026-11-19) filed the sweep's seventeen —
  // disappointed, disappointment, upset, devastated, proud, annoyed,
  // anxious, apprehension, apprehensive, ashamed, embarrassed,
  // terrified, joyful, hopeful, optimistic, jealous, content — each
  // by an established route, its evidence in its note.)
  assert.equal(CLASSIFICATIONS.length, 190);
  for (const r of DERIVED_CORRESPONDENCES) {
    for (const entry of classificationsOf(r.subject.slug)) {
      assert.notEqual(entry.aspect, "recorded-flavor", `${r.id}: no derived record may sit in CLASSIFICATIONS`);
      assert.ok(entry.provenance === "fork-curated" || entry.provenance === "fork-creative");
    }
    const viaDerived = derivedCorrespondencesOf(r.subject.slug);
    assert.ok(viaDerived.includes(r), `${r.id}: reachable through the derived accessor`);
    assert.ok(viaDerived.every((d) => d.assertionKind === "DERIVED_CORRESPONDENCE" && d.evidenceGrade === "B-derived"));
  }
  // The sharp case: 'mercury' the planet is an ordinary attested
  // classification (Water); 水銀 the substance's flavor record is
  // a separate, derived, Metal record. Neither store leaks into
  // the other.
  assert.equal(lookupClassification("mercury")?.element, "Water");
  assert.equal(lookupClassification("mercury")?.provenance, "fork-curated");
  const mercuryMetal = derivedCorrespondencesOf("水銀");
  assert.equal(mercuryMetal.length, 1);
  assert.equal(mercuryMetal[0].phase, "Metal");
  assert.equal(allDerivedCorrespondences().length, 46);
});

test("(d) skipped substances have no record, and the survey's 50 are fully accounted for", () => {
  assert.equal(H7_SKIPPED.length, 5);
  for (const s of H7_SKIPPED) {
    assert.equal(derivedCorrespondencesOf(s.slug).length, 0, `${s.hanzi}: skipped means no record`);
    assert.equal(derivedCorrespondencesOf(s.hanzi).length, 0);
    assert.ok(s.reason.length > 0);
  }
  const banked = new Set(DERIVED_CORRESPONDENCES.map((r) => r.subject.surveyEntry));
  const skipped = new Set(H7_SKIPPED.map((s) => s.surveyEntry));
  assert.equal(banked.size + skipped.size, 50);
  for (const n of [...banked, ...skipped]) assert.ok(n >= 1 && n <= 50);
});

test("(e) every derivation path is complete and reconstructible", () => {
  for (const r of DERIVED_CORRESPONDENCES) {
    const p = r.derivationPath;
    assert.ok(p.flavorAssertion.text.length > 0, `${r.id}: bencao text named`);
    assert.ok(p.flavorAssertion.witness.length > 0, `${r.id}: recension/witness named`);
    assert.ok(p.flavorAssertion.entry.length > 0, `${r.id}: entry named`);
    assert.ok(p.flavorAssertion.wording.length > 0, `${r.id}: flavor wording stored`);
    assert.ok(p.correspondenceAssertion.text.length > 0, `${r.id}: Neijing text named`);
    assert.ok(p.correspondenceAssertion.chapter.length > 0, `${r.id}: chapter named`);
    assert.ok(p.correspondenceAssertion.clause.length > 0, `${r.id}: clause stored`);
    assert.equal(p.sourceAssertionIds.length, 2, `${r.id}: both legs referenced`);
    assert.ok(p.sourceAssertionIds[0].startsWith(`flavor:${r.subject.slug}@`));
    assert.equal(p.sourceAssertionIds[1], `suwen4:${r.flavor}-${r.phase.toLowerCase()}`);
    assert.ok(r.scope.includes("recorded-flavor"), `${r.id}: scope pinned to the flavor aspect`);
    assert.ok(r.limitations.includes("no indication, safety"), `${r.id}: condition (5) carried on the record`);
  }
});

test("guard case — cinnabar: sweet → Earth on the flavor aspect only, nothing else touched", () => {
  const recs = derivedCorrespondencesOf("cinnabar");
  assert.equal(recs.length, 1);
  const r = recs[0];
  assert.equal(r.subject.hanzi, "丹砂");
  assert.equal(r.flavor, "sweet" as Flavor);
  assert.equal(r.phase, "Earth");
  assert.ok(r.derivationPath.flavorAssertion.wording.includes("味甘"));
  // No whole-substance classification of cinnabar was created,
  // and the record itself disclaims safety/suitability licensing.
  assert.equal(lookupClassification("cinnabar"), undefined);
  assert.ok(r.limitations.includes("neither asserts nor implies any toxicity or safety position"));
});

test("芒消 banks both of its recorded flavors, neither forced into the other", () => {
  const recs = derivedCorrespondencesOf("mangxiao");
  assert.equal(recs.length, 2);
  const byFlavor = new Map(recs.map((r) => [r.flavor, r.phase]));
  assert.equal(byFlavor.get("pungent"), "Metal");
  assert.equal(byFlavor.get("bitter"), "Fire");
});
