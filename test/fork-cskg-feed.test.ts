/**
 * fork-cskg-feed.test.ts — the CSKG feeder interface (cskg-feed.ts).
 *
 * FIXTURE TESTS for the mapping. These tests feed hand-written
 * triples in the loader's shape through mapTriple and check the
 * mapping — which relations become which fork links, and which
 * triples drop, with which named reason. ATOMIC (at:*) fixtures
 * cover the event-rule anchoring: one that anchors, and both
 * unanchored failure modes. Live ingestion over the real extract
 * is tested separately in fork-cskg-ingest.test.ts, which passes
 * whether or not the data artifact is installed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mapTriple } from "../src/fork/cskg-feed";

test("Causes between two classified concepts becomes a causal link", () => {
  const r = mapTriple({ subject: "rain", relation: "/r/Causes", object: "flood" });
  assert.ok(r.ok);
  assert.equal(r.link.kind, "causal");
  assert.equal(r.link.provenance, "cskg");
  assert.equal(r.link.fromElement, "Water");
  assert.equal(r.link.toElement, "Water");
  assert.equal(r.link.asserted, true);
  // The bare relation name (no /r/ prefix) is the same input.
  const bare = mapTriple({ subject: "rain", relation: "Causes", object: "flood" });
  assert.ok(bare.ok && bare.link.kind === "causal");
});

test("the onion fixture: a Causes triple drops when one end cannot be classified", () => {
  // 'onion' resolves (curated table: Metal, pungent food). 'crying'
  // resolves neither in the table nor by WordNet climb — its synsets
  // climb to no classified anchor — so the triple drops, named.
  const r = mapTriple({ subject: "onion", relation: "/r/Causes", object: "crying" });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.reason, "unclassified-endpoint");
    assert.match(r.detail, /crying/);
  }
});

test("UsedFor and AtLocation map to function and location links", () => {
  const used = mapTriple({ subject: "salt", relation: "/r/UsedFor", object: "soup" });
  assert.ok(used.ok && used.link.kind === "function");
  const loc = mapTriple({ subject: "fish", relation: "/r/AtLocation", object: "sea" });
  assert.ok(loc.ok && loc.link.kind === "location");
  assert.equal(loc.link.fromElement, "Water");
  assert.equal(loc.link.toElement, "Water");
});

test("HasSubevent / HasPrerequisite become ORDERED procedure-chain links", () => {
  const pre = mapTriple({ subject: "soup", relation: "/r/HasPrerequisite", object: "salt" });
  assert.ok(pre.ok);
  assert.equal(pre.link.kind, "prerequisite");
  assert.equal(pre.link.ordered, true, "procedure chains carry their order — it is the knowledge");
  const sub = mapTriple({ subject: "soup", relation: "/r/HasSubevent", object: "salt" });
  assert.ok(sub.ok && sub.link.kind === "subevent" && sub.link.ordered === true);
});

test("IsA is classification evidence only — never a direct assertion", () => {
  const r = mapTriple({ subject: "sleet", relation: "/r/IsA", object: "precipitation" });
  assert.ok(r.ok);
  assert.equal(r.link.kind, "classification-evidence");
  assert.equal(r.link.asserted, false, "evidence feeds anchoring; it does not classify by itself");
});

test("RelatedTo survives only when both ends are classified", () => {
  const kept = mapTriple({ subject: "rain", relation: "/r/RelatedTo", object: "snow" });
  assert.ok(kept.ok && kept.link.kind === "association");
  const dropped = mapTriple({ subject: "kitchen", relation: "/r/RelatedTo", object: "soup" });
  assert.equal(dropped.ok, false);
  if (!dropped.ok) assert.equal(dropped.reason, "unclassified-endpoint");
});

test("an unmapped relation drops with its own named reason", () => {
  const r = mapTriple({ subject: "rain", relation: "/r/Antonym", object: "flood" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, "unmapped-relation");
});

test("the five widened relations map to their kinds", () => {
  const capable = mapTriple({ subject: "fish", relation: "/r/CapableOf", object: "sea" });
  assert.ok(capable.ok && capable.link.kind === "capability");
  const part = mapTriple({ subject: "salt", relation: "/r/PartOf", object: "sea" });
  assert.ok(part.ok && part.link.kind === "part");
  const property = mapTriple({ subject: "soup", relation: "/r/HasProperty", object: "hot" });
  assert.ok(property.ok && property.link.kind === "property");
  assert.equal(property.link.toElement, "Fire");
  const desire = mapTriple({ subject: "horse", relation: "/r/Desires", object: "apple" });
  assert.ok(desire.ok && desire.link.kind === "desire");
  const material = mapTriple({ subject: "bread", relation: "/r/MadeOf", object: "egg" });
  assert.ok(material.ok && material.link.kind === "material");
  // The widened relations keep the concept route: an unclassifiable
  // end still drops as unclassified, not as unmapped.
  const dropped = mapTriple({ subject: "onion", relation: "/r/MadeOf", object: "crying" });
  assert.equal(dropped.ok, false);
  if (!dropped.ok) assert.equal(dropped.reason, "unclassified-endpoint");
});

test("an ATOMIC effect anchors by the event rule, and says so", () => {
  const r = mapTriple({
    subject: "personx gives persony a hug",
    relation: "at:xEffect",
    object: "feels tired",
  });
  assert.ok(r.ok);
  assert.equal(r.link.kind, "consequence");
  assert.equal(r.link.provenance, "cskg");
  // The testimony is the phrase pair, not a concept pair.
  assert.equal(r.link.from, "personx gives persony a hug");
  assert.equal(r.link.to, "feels tired");
  // The anchoring record names the verb that placed the event side
  // and the head word whose classification placed the other side.
  assert.equal(r.link.anchoring?.rule, "event-rule");
  assert.equal(r.link.anchoring?.verb, "give");
  assert.equal(r.link.anchoring?.headWord, "tired");
  assert.equal(r.link.anchoring?.headVia, "table");
  assert.equal(r.link.toElement, "Earth");
  assert.equal(r.link.resolution, undefined, "event-rule links carry anchoring, not resolution");
});

test("ATOMIC kinds: need is an ordered prerequisite, want is desire, react is reaction, attr is attribution", () => {
  const need = mapTriple({ subject: "personx works hard", relation: "at:xNeed", object: "sleep" });
  assert.ok(need.ok && need.link.kind === "prerequisite" && need.link.ordered === true);
  const want = mapTriple({ subject: "personx sees the apple", relation: "at:xWant", object: "eats the apple" });
  assert.ok(want.ok && want.link.kind === "desire");
  const react = mapTriple({ subject: "personx sees the rain", relation: "at:oReact", object: "fear" });
  assert.ok(react.ok && react.link.kind === "reaction");
  const attr = mapTriple({ subject: "personx gives persony a hug", relation: "at:xAttr", object: "warm" });
  assert.ok(attr.ok && attr.link.kind === "attribution");
  // A head word may also anchor through the WordNet climb.
  const intent = mapTriple({ subject: "personx helps persony", relation: "at:xIntent", object: "to rest" });
  assert.ok(intent.ok && intent.link.kind === "intent");
  assert.equal(intent.link.anchoring?.headVia, "wordnet-climb");
});

test("an ATOMIC triple drops as unanchored when either condition fails", () => {
  // Condition (ii): known event verb, but no classifiable head word
  // ('sleepy' is in neither the curated table nor climb reach).
  // Specimen changed by E1 (2026-11-19): this test used 'happy',
  // which E1's category filing filed under joy (Fire) — it now
  // anchors, as the filing intends; 'sleepy' keeps the premise.
  const noHead = mapTriple({ subject: "personx eats the soup", relation: "at:xEffect", object: "very sleepy" });
  assert.equal(noHead.ok, false);
  if (!noHead.ok) {
    assert.equal(noHead.reason, "unanchored-endpoint");
    assert.match(noHead.detail, /very sleepy/);
  }
  // Condition (i): no verb the system knows in the event phrase.
  const noVerb = mapTriple({ subject: "personx zqxwv the blorp", relation: "at:xEffect", object: "tired" });
  assert.equal(noVerb.ok, false);
  if (!noVerb.ok) {
    assert.equal(noVerb.reason, "unanchored-endpoint");
    assert.match(noVerb.detail, /no head verb/);
  }
});

test("an endpoint can resolve through the WordNet climb, and says so", () => {
  // 'gale' is not in the curated table; it climbs gale —IS_A→ wind.
  const r = mapTriple({ subject: "gale", relation: "/r/Causes", object: "flood" });
  assert.ok(r.ok);
  assert.equal(r.link.fromElement, "Wood");
  assert.equal(r.link.resolution?.from, "wordnet-climb");
  assert.equal(r.link.resolution?.to, "table");
});
