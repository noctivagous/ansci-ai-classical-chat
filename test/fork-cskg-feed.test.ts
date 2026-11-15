/**
 * fork-cskg-feed.test.ts — the CSKG feeder interface (cskg-feed.ts).
 *
 * FIXTURE TESTS ONLY. CSKG data is not installed in this tree (no
 * data/cskg), and nothing here pretends otherwise: these tests feed
 * hand-written triples in the loader's shape through mapTriple and
 * check the mapping — which relations become which fork links, and
 * which triples drop, with which named reason. Live ingestion awaits
 * the data install (see the module header and docs/fork/README.md).
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
  const r = mapTriple({ subject: "rain", relation: "/r/MadeOf", object: "flood" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, "unmapped-relation");
});

test("an endpoint can resolve through the WordNet climb, and says so", () => {
  // 'gale' is not in the curated table; it climbs gale —IS_A→ wind.
  const r = mapTriple({ subject: "gale", relation: "/r/Causes", object: "flood" });
  assert.ok(r.ok);
  assert.equal(r.link.fromElement, "Wood");
  assert.equal(r.link.resolution?.from, "wordnet-climb");
  assert.equal(r.link.resolution?.to, "table");
});
