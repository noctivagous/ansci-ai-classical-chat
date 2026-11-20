/**
 * ansci-entities.test.ts — named-entity grounding (Transcript
 * Slice 0, 2026-11-19): the WordNet extract's instance synsets
 * ingested into the fork graph and the answer path.
 *
 * Every expectation below was verified against the actual OEWN
 * 2024 extract in data/wordnet/extract: Oklahoma is synset
 * wn-n09295833 ("a state in south central United States"), an
 * instance of American state (wn-n08812392); Atlantis is a
 * regular synset with NO instance edge, which is exactly why
 * it must stay ungrounded.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { allEntities, lookupEntity, ENTITY_PROVENANCE } from "../src/ansci/entities";
import { buildForkGraph } from "../src/ansci/join";
import { lookupClassification } from "../src/ansci/classify";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";

test("the instance synsets of the extract are grounded: 7,756 records, extract order", () => {
  const all = allEntities();
  assert.equal(all.length, 7756);
  assert.ok(all.every((r) => r.provenance === ENTITY_PROVENANCE));
  assert.ok(all.every((r) => r.classes.length >= 1 && r.gloss.length > 0 && r.synsetId.startsWith("wn-n")));
});

test("oklahoma: the record is the synset — gloss, lemmas, class, type chain, provenance", () => {
  const ok = lookupEntity("oklahoma");
  assert.ok(ok);
  assert.equal(ok.name, "Oklahoma");
  assert.deepEqual(ok.lemmas, ["Oklahoma", "Sooner State", "OK", "Okla."]);
  assert.equal(ok.gloss, "a state in south central United States");
  assert.equal(ok.synsetId, "wn-n09295833");
  assert.deepEqual(ok.classes, ["American state"]);
  assert.deepEqual(ok.typeChain.slice(0, 2), ["American state", "state"]);
  assert.equal(ok.provenance, "wordnet-retrieved");
  // Any lemma of the synset names the entity.
  assert.equal(lookupEntity("sooner state")?.synsetId, "wn-n09295833");
});

test("grounding is by instance synset, not capitalisation: non-instances stay ungrounded", () => {
  // Atlantis is in the extract and capitalised, but its synset
  // carries no instance edge — a legendary island, filed as a
  // regular noun synset.
  assert.equal(lookupEntity("atlantis"), undefined);
  // "French leave" — a capitalised lemma on a common-noun synset.
  assert.equal(lookupEntity("french leave"), undefined);
  // Ordinary common nouns and unattested names alike.
  assert.equal(lookupEntity("dog"), undefined);
  assert.equal(lookupEntity("zorblax"), undefined);
});

test("other named entities resolve: a state, a city, a country, a person", () => {
  assert.equal(lookupEntity("texas")?.synsetId, "wn-n09305728");
  assert.deepEqual(lookupEntity("texas")?.classes, ["American state"]);
  assert.equal(lookupEntity("paris")?.synsetId, "wn-n09090737");
  assert.deepEqual(lookupEntity("paris")?.classes, ["national capital"]);
  assert.equal(lookupEntity("france")?.synsetId, "wn-n09088091");
  assert.equal(lookupEntity("shakespeare")?.synsetId, "wn-n11515119");
  assert.deepEqual(lookupEntity("shakespeare")?.classes, ["dramatist", "poet"]);
});

test("the graph merge: entity node, instance edge to its class, chain above the class, no element", () => {
  const g = buildForkGraph();
  const ok = g.getNode("entity-wn-n09295833");
  assert.ok(ok, "the entity stands in the fork graph under its synset id");
  assert.equal(ok.id, "entity-wn-n09295833");
  assert.equal(ok.properties["entity"], true);
  assert.equal(ok.properties["gloss"], "a state in south central United States");
  assert.equal(ok.properties["provenance"], "wordnet-retrieved");
  const isA = g.outEdges(ok.id, "IS_A");
  assert.equal(isA.length, 1);
  assert.equal(isA[0].aspect, "instance");
  assert.equal(g.getNode(isA[0].to)?.name, "american state");
  assert.equal(isA[0].properties?.["provenance"], "wordnet-retrieved");
  // The class climbs its hypernym chain in the graph.
  const cls = g.getNode(isA[0].to);
  const above = g.outEdges(cls!.id, "IS_A").map((e) => g.getNode(e.to)?.name);
  assert.deepEqual(above, ["state"]);
  // Being named earns no element classification, in graph or table.
  assert.equal(g.outEdges(ok.id, "HAS_ELEMENT").length, 0);
  assert.equal(lookupClassification("oklahoma"), undefined);
});

test("name collisions: entity and class nodes are never name referents", () => {
  const g = buildForkGraph();
  // The furniture synset 'table' (wn-n04443959) stands in some
  // entity's class chain; it must not become what the name
  // 'table' refers to — at baseline the graph held no such node,
  // and checks read a nodeByName hit as "the graph holds this
  // kind". Entity nodes are reached by id and by lookupEntity,
  // never by the ordinary name lookup.
  assert.equal(g.nodeByName("table"), undefined);
  assert.equal(g.nodeByName("oklahoma"), undefined);
  assert.ok(g.getNode("entity-wn-n09295833"), "the entity node stands in the graph by id");
  // And the behaviour the collision broke is restored end to end:
  // an unanchored definite still asks after its referent.
  assert.equal(processTurn(newSession(), "Is the table cold?").reply, "What table? You just started talking.");
});

test("acceptance: 'what is oklahoma?' answers from the synset", () => {
  const { reply, trace } = processTurn(newSession(), "what is oklahoma?");
  assert.equal(reply, "Oklahoma is a state in south central United States.");
  assert.equal(trace.entityAnswer?.synsetId, "wn-n09295833");
  assert.equal(trace.declineReason, undefined);
});

test("acceptance: two more named entities answer the same way", () => {
  assert.equal(
    processTurn(newSession(), "what is texas?").reply,
    "Texas is the second largest state; located in southwestern United States on the Gulf of Mexico.",
  );
  assert.equal(
    processTurn(newSession(), "what is paris?").reply,
    "Paris is the capital and largest city of France; and international center of culture and commerce.",
  );
});

test("acceptance: an unknown name still declines honestly, located at the name", () => {
  const { reply, trace } = processTurn(newSession(), "what is atlantis?");
  assert.equal(reply, "I can't answer that from what I know: I have nothing on atlantis in my notes, and I have no way to connect anything to 'what'.");
  assert.equal(trace.entityAnswer, undefined);
  assert.ok(trace.declineReason?.includes("nothing on atlantis"));
});

test("a where-question about a grounded entity answers from what is held (Slice 4 supersedes the Slice 0 decline)", () => {
  // Slice 0 pinned this turn as a decline naming what is
  // held, because nothing then answered a where-question
  // from the gloss. Transcript Slice 4 (the where-split)
  // commissions the change: the gloss IS a location-bearing
  // answer at the level held, so the turn now answers from
  // the entity record, provenance on the trace — the
  // fallthrough decline below stands for the question
  // shapes that still reach it.
  const { reply, trace } = processTurn(newSession(), "where is oklahoma?");
  assert.equal(reply, "Oklahoma is a state in south central United States.");
  assert.equal(trace.declineReason, undefined);
  assert.equal(trace.entityAnswer?.synsetId, "wn-n09295833");
  assert.ok(trace.entityAnswer?.ground.includes("wordnet-retrieved"));
});

test("a quality question about a grounded entity no longer claims nothing is held", () => {
  const { reply } = processTurn(newSession(), "is oklahoma a state?");
  assert.ok(reply.includes("I have oklahoma in my notes as a state in south central United States"));
  assert.ok(!reply.includes("I have nothing on oklahoma"));
});
