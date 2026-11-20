/**
 * ansci-aspects.test.ts — slice 3 (aspect wiring).
 *
 * At creation, a semantic object's classifiable aspects are
 * classified through the OntologyCore: emotion readings route
 * through the LEDU→EDU bridge (the canonical emotion named, the
 * word's filed phase carried, the concrete word retained as the
 * value), other aspects come direct from the OKU's
 * classification table, and the readings roll up into a ranked
 * composition. Coherence then compares compositions — the
 * object's against the situation's and the disposition's — and
 * annotates the relation the correspondence graph gives.
 *
 * The acceptance scenario is the design's own worked example,
 * corrected by the owner: anger (Wood) stated at a summer
 * situation (Fire) is a GENERATING relation — Wood feeds Fire —
 * not same-element resonance.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { NEUTRAL_COMPOSITION } from "../src/ansci/composition";
import { canonicalEmotion, desireOfSense } from "../src/ansci/edu";
import { emotionAspect } from "../src/ansci/ledu";

test("the EDU names the seven emotions; fright stands unsettled, as the tradition leaves it", () => {
  assert.equal(canonicalEmotion("anger")?.element, "Wood");
  assert.equal(canonicalEmotion("anger")?.organ, "liver");
  assert.equal(canonicalEmotion("joy")?.element, "Fire");
  const fright = canonicalEmotion("fright");
  assert.equal(fright?.settled, false);
  assert.equal(fright?.element, undefined);
  assert.equal(desireOfSense("eyes")?.element, "Wood");
  assert.equal(desireOfSense("mind")?.settled, false);
});

test("the LEDU reads a word's emotion: canonical name, filed phase, word retained", () => {
  const r = emotionAspect("furious");
  assert.equal(r?.aspect, "emotion");
  assert.equal(r?.value, "furious"); // retention: the word as said
  assert.equal(r?.element, "Wood"); // the table's filed reading
  assert.match(r?.source ?? "", /anger/); // the canonical face, named
  assert.equal(emotionAspect("hot"), undefined); // temperature is not an emotion reading
});

test("worry: the word's filed phase and the canonical correspondence both stand, labelled", () => {
  const r = emotionAspect("worry");
  assert.equal(r?.element, "Earth"); // the table files the word as pensiveness's face
  assert.match(r?.source ?? "", /Metal/); // the canonical 憂 stands at Metal — named, not merged
});

test("creation classifies aspects and rolls them into a composition", () => {
  const s = newSession();
  processTurn(s, "I was furious.");
  const o = s.objects[0];
  const emotion = o.aspects.find((a) => a.aspect === "emotion");
  assert.equal(emotion?.value, "furious");
  assert.equal(emotion?.element, "Wood");
  assert.equal(o.composition?.predominant, "Wood");

  const s2 = newSession();
  processTurn(s2, "The soup is hot.");
  const temp = s2.objects[0].aspects.find((a) => a.aspect === "temperature");
  assert.equal(temp?.value, "hot");
  assert.equal(temp?.element, "Fire");
});

test("coherence compares compositions: anger in summer is a generating relation", () => {
  const s = newSession(NEUTRAL_COMPOSITION, { month: 7, hour: 13 }); // summer, midday
  processTurn(s, "I was furious.");
  const o = s.objects[0];
  const cmp = o.trail.find((a) => a.data?.comparison === "object-situation");
  assert.ok(cmp, "a situation comparison was annotated");
  assert.match(String(cmp!.data?.relation ?? ""), /generating/);
  assert.equal(cmp!.data?.objectPredominant, "Wood");
  assert.equal(cmp!.data?.otherPredominant, "Fire");
});

test("no frame and a neutral disposition: nothing to compare, nothing annotated", () => {
  const s = newSession();
  processTurn(s, "I was furious.");
  assert.ok(!s.objects[0].trail.some((a) => a.data?.comparison));
});
