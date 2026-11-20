/**
 * ansci-senses.test.ts — the SenseUnit + Senses-Scening build
 * (2026-11-17).
 *
 * A sentence is analysed for ALL human senses: the
 * Senses-Scening Unit (senses-scening.ts), over the SenseUnit's
 * authority (sense-unit.ts), produces the semantic object's
 * senses face at creation — per-channel entries (present or
 * none) bound into a multi-sensory scene — and the scene graph
 * persists in the Session across turns, with unknown slots,
 * tiered spatial facts (said / placed-by-scene /
 * default-placed), and defeasible placements.
 *
 * Pinned here: the banana (sight + scene, derived implications
 * on the trail only), the no-content turns (all channels none),
 * the soup (taste; a minimal scene — the design call), hearing,
 * the nature sentence (sight + hearing + smell in ONE scene),
 * the cold question (touch + Coherence's questioned-channel
 * annotation), the airport sequence (establish → extend, the
 * unknown slot, placed tiers, between's two landmarks,
 * supersession, the fill), the odour + number rows banked from
 * Suwen ch. 4, and reply objects' senses faces.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, listOpenUnknowns, type Session } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { NEUTRAL_COMPOSITION } from "../src/ansci/composition";
import type { SemanticObject } from "../src/ansci/semantic-object";
import { SENSE_CHANNEL_TABLE, channelForFaculty, senseReadingForWord } from "../src/ansci/sense-unit";
import { ingestedFor } from "../src/ansci/ingested";

function personObject(session: Session, turn: number): SemanticObject {
  const o = session.objects.find((x) => x.producer === "person" && x.turn === turn);
  assert.ok(o, `a person object for turn ${turn}`);
  return o;
}

test("the SenseUnit's channel table: six roots, tensions labelled, no invented phases", () => {
  assert.equal(SENSE_CHANNEL_TABLE.length, 6);
  const taste = SENSE_CHANNEL_TABLE.find((c) => c.channel === "taste")!;
  // Taste is double-filed and BOTH filings stand: tongue/Fire
  // (the root) and mouth/Earth (Xunzi's faculty).
  assert.deepEqual(
    taste.orifices.map((o) => `${o.name}/${o.element}`).sort(),
    ["mouth/Earth", "tongue/Fire"],
  );
  const touch = SENSE_CHANNEL_TABLE.find((c) => c.channel === "touch")!;
  assert.equal(touch.phaseStanding, "none"); // values carry phases; the channel has none
  assert.equal(touch.orifices.length, 0);
  const mind = SENSE_CHANNEL_TABLE.find((c) => c.channel === "mind")!;
  assert.equal(mind.phaseStanding, "unsettled");
  assert.equal(channelForFaculty("eyes"), "sight");
  assert.equal(channelForFaculty("mouth"), "taste");
  assert.equal(channelForFaculty("skin"), "touch");
});

test("the discrimination lookup reads the OKU's filed rows", () => {
  assert.equal(senseReadingForWord("green")?.channel, "sight");
  assert.equal(senseReadingForWord("green")?.element, "Wood");
  assert.equal(senseReadingForWord("salty")?.channel, "taste");
  const cold = senseReadingForWord("cold");
  assert.equal(cold?.channel, "touch");
  assert.equal(cold?.discrimination, "temperature");
  assert.equal(cold?.element, "Water");
  // The odour row banked from Suwen ch. 4 (2026-11-17).
  const fragrant = senseReadingForWord("fragrant");
  assert.equal(fragrant?.channel, "smell");
  assert.equal(fragrant?.element, "Earth");
  assert.match(fragrant?.source ?? "", /Suwen ch\. 4/);
  // A food classification is not a sense reading.
  assert.equal(senseReadingForWord("banana"), undefined);
});

test("odour banking: Suwen ch. 4's five odours stand in the ingested store, cited", () => {
  const expected: Record<string, string> = { rank: "Wood", scorched: "Fire", fragrant: "Earth", fishy: "Metal", rotten: "Water" };
  for (const [concept, element] of Object.entries(expected)) {
    const rows = ingestedFor(concept).filter((a) => a.aspect === "odour");
    assert.equal(rows.length, 1, concept);
    assert.equal(rows[0].element, element, concept);
    assert.match(rows[0].citation.chapter, /金匱真言論第四/);
    assert.ok(rows[0].citation.quote.includes("其臭"), concept);
  }
});

test("numbers banking: Suwen ch. 4's number row stands in the OKU Numbers slice, cited", () => {
  const expected: Record<string, string> = { eight: "Wood", seven: "Fire", five: "Earth", nine: "Metal", six: "Water" };
  for (const [concept, element] of Object.entries(expected)) {
    const rows = ingestedFor(concept).filter((a) => a.aspect === "number");
    assert.equal(rows.length, 1, concept);
    assert.equal(rows[0].element, element, concept);
    assert.ok(rows[0].citation.quote.includes("其數"), concept);
  }
});

test("the banana: sight present with its scene; the rest none as said; implications derived-only", () => {
  const s = newSession(NEUTRAL_COMPOSITION);
  const r = processTurn(s, "The overripe banana sat on the table.");
  const o = personObject(s, 1);
  assert.deepEqual(r.trace.sensesPresent, ["sight"]);
  const sight = o.senses.channels.sight!;
  assert.equal(sight.length, 1);
  assert.equal(sight[0].value, "overripe"); // retention: the word as said
  assert.equal(sight[0].discrimination, "appearance");
  for (const c of ["hearing", "smell", "taste", "touch", "mind"] as const) {
    assert.equal(o.senses.channels[c], null, `${c} is none as said`);
  }
  // The scene: banana + table, the stated support relation.
  assert.equal(o.senses.scene?.role, "establishes");
  assert.deepEqual(
    o.senses.scene?.arrangements.map((a) => `${a.figure} ${a.relation} ${a.ground} (${a.tier})`),
    ["banana sat-on table (said)"],
  );
  // The persistent scene graph holds it, quality attached.
  assert.equal(s.scenes.length, 1);
  const banana = s.scenes[0].entities.find((e) => e.lemma === "banana")!;
  assert.deepEqual(banana.qualities, [{ channel: "sight", value: "overripe", turn: 1 }]);
  // The cross-channel implications are Coherence's derived-tier
  // trail annotations — never face entries.
  const derived = o.trail.filter((a) => a.unit === "coherence/coherence-analysis" && a.data?.derivedSense);
  assert.deepEqual(derived.map((a) => a.data!.derivedSense).sort(), ["smell", "taste", "touch"]);
  assert.ok(derived.every((a) => a.data!.tier === "derived"));
  // The turn passed the Senses-Scening Unit on the map.
  assert.ok(r.trace.mapPath?.includes("lpu/senses-scening-unit"));
});

test("no sensory content: 'Hello' and 'What time is it?' record every channel none, no scene", () => {
  const s = newSession(NEUTRAL_COMPOSITION);
  const r1 = processTurn(s, "Hello.");
  const o1 = personObject(s, 1);
  assert.ok(Object.values(o1.senses.channels).every((v) => v === null));
  assert.equal(o1.senses.scene, undefined);
  assert.equal(r1.trace.sensesPresent, undefined);
  assert.ok(!r1.trace.mapPath?.includes("lpu/senses-scening-unit"));
  const r2 = processTurn(s, "What time is it?");
  const o2 = personObject(s, 2);
  assert.ok(Object.values(o2.senses.channels).every((v) => v === null));
  assert.equal(o2.senses.scene, undefined);
  assert.equal(r2.trace.sensesPresent, undefined);
  assert.equal(s.scenes.length, 0);
});

test("the soup: a taste entry, and a minimal scene (the design call)", () => {
  const s = newSession(NEUTRAL_COMPOSITION);
  processTurn(s, "The soup is salty.");
  const o = personObject(s, 1);
  assert.equal(o.senses.channels.taste?.[0].value, "salty");
  assert.equal(o.senses.channels.taste?.[0].element, "Water");
  assert.equal(o.senses.scene?.role, "establishes");
  assert.deepEqual(o.senses.scene?.arrangements, []); // no arrangement given; the scene is the binding itself
  const soup = s.scenes[0].entities.find((e) => e.lemma === "soup")!;
  assert.deepEqual(soup.qualities, [{ channel: "taste", value: "salty", turn: 1 }]);
});

test("hearing: the bell rang loudly", () => {
  const s = newSession(NEUTRAL_COMPOSITION);
  processTurn(s, "The bell rang loudly.");
  const o = personObject(s, 1);
  const hearing = o.senses.channels.hearing!;
  assert.ok(hearing.some((e) => e.value === "loudly"));
  assert.equal(o.senses.channels.sight, null);
});

test("the nature sentence: sight, hearing and smell bound in ONE scene", () => {
  // The richest nature sentence the parser accepts whole (the
  // brief's "Birds sang over the green hills and the air smelled
  // of pine" does not survive the sentence layer — bird/sing
  // lemma loss, smelled→"seller"; recorded as a parse gap in
  // the unit's PLACEHOLDER).
  const s = newSession(NEUTRAL_COMPOSITION);
  const r = processTurn(s, "The fragrant wind sang over the green hills.");
  const o = personObject(s, 1);
  assert.deepEqual(r.trace.sensesPresent, ["sight", "hearing", "smell"]);
  assert.equal(o.senses.channels.sight?.[0].value, "green");
  assert.equal(o.senses.channels.hearing?.[0].value, "sing");
  assert.equal(o.senses.channels.smell?.[0].value, "fragrant");
  assert.equal(o.senses.channels.smell?.[0].element, "Earth"); // the banked odour row
  assert.equal(s.scenes.length, 1); // ONE scene
  const wind = s.scenes[0].entities.find((e) => e.lemma === "wind")!;
  assert.deepEqual(
    wind.qualities.map((q) => `${q.channel}:${q.value}`).sort(),
    ["hearing:sing", "smell:fragrant"],
  );
  const hill = s.scenes[0].entities.find((e) => e.lemma === "hill")!;
  assert.deepEqual(hill.qualities, [{ channel: "sight", value: "green", turn: 1 }]);
});

test("the cold question: a touch entry, and Coherence names the questioned channel", () => {
  const s = newSession(NEUTRAL_COMPOSITION);
  processTurn(s, "Is the table cold?");
  const o = personObject(s, 1);
  assert.equal(o.senses.channels.touch?.[0].value, "cold");
  assert.equal(o.senses.channels.touch?.[0].element, "Water");
  const ann = o.trail.find((a) => a.unit === "coherence/coherence-analysis" && a.data?.senseChannel);
  assert.equal(ann?.data?.senseChannel, "touch");
  assert.equal(ann?.data?.value, "cold");
});

test("the airport sequence: establish, extend, tiers, unknowns, supersession, fill", () => {
  // The owner's specimen, pinned to the richest sequence the
  // parser accepts (the specimen's full first sentence does not
  // survive the sentence layer — a located parse gap, recorded
  // in the unit's PLACEHOLDER, not faked here).
  const s = newSession(NEUTRAL_COMPOSITION);
  processTurn(s, "I waited at the airport.");
  const o1 = personObject(s, 1);
  assert.equal(o1.senses.scene?.role, "establishes");
  assert.equal(s.scenes.length, 1);
  const scene = s.scenes[0];
  assert.equal(scene.container, "airport");
  assert.deepEqual(scene.unknowns.map((u) => `${u.of}.${u.kind}:${u.status}`), ["airport.city:open"]);
  assert.deepEqual(listOpenUnknowns(s).map((u) => `${u.of}.${u.kind}`), ["airport.city"]);
  assert.deepEqual(scene.events, [{ turn: 1, verb: "wait", agent: "you" }]);

  processTurn(s, "I went to the fountain between the bathrooms.");
  const o2 = personObject(s, 2);
  assert.equal(o2.senses.scene?.role, "extends");
  assert.equal(o2.senses.scene?.id, scene.id); // the SAME running scene
  assert.equal(s.scenes.length, 1);
  // Said: the fountain between the bathrooms.
  assert.ok(o2.senses.scene?.arrangements.some((a) => a.figure === "fountain" && a.relation === "between" && a.tier === "said"));
  // Placed-by-scene: the fountain in the airport.
  assert.ok(o2.senses.scene?.placed.some((p) => p.figure === "fountain" && p.relation === "in" && p.ground === "airport" && p.tier === "placed-by-scene"));
  // Default-placed: the bathrooms, as TWO distinct landmarks
  // (the QuantificationUnit's one immediate scene consequence).
  assert.ok(s.scenes[0].entities.some((e) => e.lemma === "bathroom-1"));
  assert.ok(s.scenes[0].entities.some((e) => e.lemma === "bathroom-2"));
  assert.ok(!s.scenes[0].entities.some((e) => e.lemma === "bathroom"));
  const defaults = s.scenes[0].relations.filter((x) => x.tier === "default-placed");
  assert.deepEqual(defaults.map((x) => x.figure).sort(), ["bathroom-1", "bathroom-2"]);
  assert.ok(defaults.every((x) => x.relation === "in-or-near" && x.ground === "airport"));
  // Their exact positions are unknown slots.
  assert.deepEqual(
    listOpenUnknowns(s).map((u) => `${u.of}.${u.kind}`).sort(),
    ["airport.city", "bathroom-1.exact-location", "bathroom-2.exact-location"],
  );
  // The event sequence: waiting, then going — the "and then".
  assert.deepEqual(scene.events.map((e) => e.verb), ["wait", "go"]);

  // Defeasibility: going TO the bathrooms supersedes their
  // default placements with placed-by-scene containment.
  processTurn(s, "I went to the bathrooms.");
  const standing = s.scenes[0].relations.filter((x) => x.figure.startsWith("bathroom") && x.tier === "default-placed");
  assert.ok(standing.every((x) => x.supersededTurn === 3));
  assert.ok(s.scenes[0].relations.some((x) => x.figure === "bathroom" && x.tier === "placed-by-scene" && !x.supersededTurn));

  // The fill: a later object supplies the airport's city.
  processTurn(s, "The airport is in Chicago.");
  const o4 = personObject(s, 4);
  assert.deepEqual(o4.senses.scene?.unknownsFilled, [{ of: "airport", kind: "city", value: "chicago" }]);
  const slot = s.scenes[0].unknowns.find((u) => u.of === "airport" && u.kind === "city")!;
  assert.equal(slot.status, "filled");
  assert.equal(slot.value, "chicago");
  assert.ok(!listOpenUnknowns(s).some((u) => u.of === "airport"));
});

test("reply objects carry a senses face too (all none when the reply has no sensory content)", () => {
  const s = newSession(NEUTRAL_COMPOSITION);
  processTurn(s, "Hello.");
  const reply = s.objects.find((x) => x.producer === "system");
  assert.ok(reply, "the greeting turn authors a reply object");
  assert.ok(Object.values(reply.senses.channels).every((v) => v === null));
  assert.equal(reply.senses.scene, undefined);
});
