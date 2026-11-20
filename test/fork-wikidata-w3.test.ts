/**
 * fork-wikidata-w3.test.ts — slice W3: place associations.
 *
 * Offline, fixtures only. The Sydney fixture is HAND-SHAPED
 * (test/fixtures/wikidata/README.md): W2's live acceptance met
 * HTTP 429 from wikidata.org — a hard stop for that provider in
 * this programme — so W3 made NO live Wikidata call; the
 * fixture was written by hand in the documented wbgetentities
 * response shape, with the coordinates the slice commission
 * states (−33.87, 151.21).
 *
 * What is pinned:
 *  - at bank time, a coordinated place banks its situation
 *    associations (hemisphere + latitude band) computed by the
 *    shared §8.10 primitives, with per-step provenance kinds
 *    (§3.5 rule 2): retrieved coordinates, derived computation;
 *  - SA-DECEMBER from the bank: December at Sydney resolves
 *    summer-side, opposite to the northern banked side;
 *  - SA-TONIGHT computed form: the night proportion for Sydney
 *    on 2026-12-25 matches the value computed independently
 *    below from §8.10b's published inputs, source "computed",
 *    and its band drives the long/not-long answer;
 *  - a coordinateless banked place (Austin, from the Texas
 *    fixture) is flagged incomplete and situation questions
 *    over it decline located on the missing coordinates;
 *  - climate stays unmapped in v1: no situation association
 *    carries a climate value (see the W3 report).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { newSession } from "../src/fork/session";
import { WikidataBank, mirrorBankIntoGraph, wikidataGraphNodeId } from "../src/fork/wikidata-bank";
import { parseWikidataEntities, translateWikidataItems } from "../src/fork/wikidata";
import {
  computedLightAspect,
  hemisphereForLatitude,
  latitudeBandForLatitude,
  nightProportionFor,
} from "../src/situation";

function fixturesDir(): string {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "test", "fixtures", "wikidata");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(__dirname, "fixtures", "wikidata");
}
const FIXTURES = fixturesDir();
const load = (name: string): unknown => JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8"));

const FETCH_DATE = "2026-11-19";
/** 25 December 2026 — day-of-year 359, deep in both solstice arcs. */
const DEC25 = new Date("2026-12-25T12:00:00Z");

function bankFixture(name: string): WikidataBank {
  const bank = new WikidataBank();
  const items = parseWikidataEntities(load(name));
  bank.bankTranslation(translateWikidataItems(items, { fetchDate: FETCH_DATE, retrievedFrom: "fixture" }));
  return bank;
}

test("W3 banking: Sydney banks southern hemisphere + temperate band, computed from its coordinates", () => {
  const bank = bankFixture("sydney-wbgetentities.json");
  const assoc = bank.situationAssociationFor("Sydney");
  assert.ok(assoc, "Sydney carries a banked situation association");
  assert.equal(assoc.qid, "Q3130");
  assert.equal(assoc.lat, -33.87);
  assert.equal(assoc.lon, 151.21);
  assert.equal(assoc.hemisphere, "south");
  assert.equal(assoc.latitudeBand, "temperate");
  // The same values the shared §8.10/§8.11 primitives give —
  // one implementation, two callers.
  assert.equal(assoc.hemisphere, hemisphereForLatitude(-33.87));
  assert.equal(assoc.latitudeBand, latitudeBandForLatitude(-33.87));
  assert.equal(bank.placeCompleteness("Sydney"), "complete");
  assert.equal(bank.isIncompletePlace("Sydney"), false);
  // Climate is unmapped in v1 (no mapping-table row covers a
  // climate classification property): nothing is populated.
  assert.equal(assoc.climate, undefined);
});

test("W3 provenance (§3.5): the situation association is derived-kind consuming a retrieved step, kinds marked per step", () => {
  const bank = bankFixture("sydney-wbgetentities.json");
  const assoc = bank.situationAssociationFor("Sydney")!;
  assert.equal(assoc.provenanceKind, "derived");
  assert.equal(assoc.steps.length, 2);
  assert.equal(assoc.steps[0].kind, "retrieved");
  assert.match(assoc.steps[0].detail, /P625/);
  assert.match(assoc.steps[0].detail, /Q3130/);
  assert.equal(assoc.steps[1].kind, "derived");
  assert.match(assoc.steps[1].detail, /computed/);
  // The retrieved facts themselves stay retrieved-kind: the
  // LOCATED_IN association is never dressed as a derivation.
  const located = bank.associationsFrom("Sydney", "LOCATED_IN");
  assert.ok(located.length > 0);
  for (const a of located) assert.equal(a.provenanceKind, "retrieved");
  // The graph mirror carries the same marking.
  const session = newSession();
  mirrorBankIntoGraph(session.graph, bank);
  const node = session.graph.getNode(wikidataGraphNodeId("Q3130"));
  assert.ok(node);
  assert.equal(node.properties.hemisphere, "south");
  assert.equal(node.properties.latitudeBand, "temperate");
  assert.equal(node.properties.situationIncomplete, false);
  assert.match(String(node.properties.situationProvenance), /derived/);
});

test("W3 SA-DECEMBER from the bank: Sydney in December is summer-side, opposite to the northern banked side", () => {
  const sydney = bankFixture("sydney-wbgetentities.json");
  const south = sydney.situationForPlace("Sydney", DEC25, "Australia/Sydney");
  assert.equal(south.kind, "answer");
  if (south.kind !== "answer") return;
  // The place associations resolved FROM THE BANK: the
  // Situation's location is the banked place, sourced "kb".
  assert.deepEqual(south.situation.location, {
    lat: -33.87,
    lon: 151.21,
    source: "kb",
    label: "Sydney",
  });
  assert.equal(south.situation.derived.hemisphere, "south");
  assert.equal(south.situation.derived.latitudeBand, "temperate");
  // The December rule: southern December is summer (Fire-side —
  // the canonical summer profile's light band is Yin-faint).
  assert.equal(south.situation.derived.seasonHere, "summer");
  assert.equal(south.situation.derived.lightAspect.band, "faint");

  // The northern side, also from a bank: Oklahoma (35.5, −98).
  const oklahoma = bankFixture("oklahoma-wbgetentities.json");
  const north = oklahoma.situationForPlace("Oklahoma", DEC25, "America/Chicago");
  assert.equal(north.kind, "answer");
  if (north.kind !== "answer") return;
  assert.equal(north.situation.derived.hemisphere, "north");
  assert.equal(north.situation.derived.seasonHere, "winter");
  assert.equal(north.situation.derived.lightAspect.band, "predominant");
  assert.notEqual(south.situation.derived.seasonHere, north.situation.derived.seasonHere);
});

test("W3 SA-TONIGHT computed form: Sydney's December night proportion matches §8.10b's published formula", () => {
  const bank = bankFixture("sydney-wbgetentities.json");
  const tonight = bank.nightForPlace("Sydney", DEC25);
  assert.equal(tonight.kind, "answer");
  if (tonight.kind !== "answer") return;
  assert.equal(tonight.source, "computed");
  assert.equal(tonight.dayOfYear, 359);
  assert.equal(tonight.lat, -33.87);

  // Expected value computed INDEPENDENTLY here, straight from
  // §8.10b's published inputs: δ ≈ −23.44°·cos(360°/365·(N+10));
  // cos H = −tan φ·tan δ; day length 2H/15 h; night = 1 − day/24.
  const DEG = Math.PI / 180;
  const N = 359;
  const phi = -33.87;
  const delta = -23.44 * Math.cos(((360 / 365) * (N + 10)) * DEG);
  const cosH = -Math.tan(phi * DEG) * Math.tan(delta * DEG);
  const expected = 1 - (2 * (Math.acos(cosH) / DEG)) / 15 / 24;
  // The fixture's precomputed value (this formula, evaluated
  // 2026-11-19): 0.4062637538…
  assert.ok(Math.abs(expected - 0.4062637538) < 1e-9, `precomputed value drifted: ${expected}`);
  assert.ok(Math.abs(tonight.yinProportion - expected) < 1e-12);
  assert.ok(Math.abs(nightProportionFor(359, -33.87) - expected) < 1e-12);
  assert.equal(computedLightAspect(359, -33.87).source, "computed");

  // The band drives the answer: 0.406… is "present", and a
  // December night at Sydney is NOT long (the day is longer).
  assert.equal(tonight.band, "present");
  assert.equal(tonight.long, false);
  assert.ok(tonight.yinProportion < 0.5);
});

test("W3 incomplete flag: a coordinateless banked place declines located on the missing coordinates", () => {
  // Austin (Q16559) banks from the Texas fixture with a label
  // only — no P625 statement, hence no coordinates.
  const bank = bankFixture("texas-wbgetentities.json");
  assert.ok(bank.nodeByName("Austin"), "Austin is banked");
  assert.equal(bank.placeCompleteness("Austin"), "incomplete");
  assert.equal(bank.isIncompletePlace("Austin"), true);
  assert.equal(bank.situationAssociationFor("Austin"), undefined);
  // It can still answer capital/containment (W2's consumers)…
  assert.ok(bank.capitalOf("Texas"), "the capital consumer is unaffected by the flag");
  // …but situation reasoning over it declines, located.
  const season = bank.situationForPlace("Austin", DEC25);
  assert.equal(season.kind, "decline");
  if (season.kind === "decline") {
    assert.match(season.reason, /without coordinates/);
    assert.match(season.reason, /flagged incomplete/);
    assert.match(season.reason, /P625/);
    assert.match(season.reason, /no canonical profile is substituted/);
  }
  const tonight = bank.nightForPlace("Austin", DEC25);
  assert.equal(tonight.kind, "decline");
  // The graph mirror carries the flag too.
  const session = newSession();
  mirrorBankIntoGraph(session.graph, bank);
  const austin = session.graph.getNode(wikidataGraphNodeId("Q16559"));
  assert.ok(austin);
  assert.equal(austin.properties.situationIncomplete, true);
  assert.equal(austin.properties.hemisphere, undefined);
  // An unbanked name is a different state from incomplete.
  assert.equal(bank.placeCompleteness("Atlantis"), undefined);
  assert.equal(bank.situationForPlace("Atlantis", DEC25).kind, "decline");
});

test("W3 re-banking stays idempotent for situation associations", () => {
  const bank = new WikidataBank();
  const items = parseWikidataEntities(load("sydney-wbgetentities.json"));
  const translation = translateWikidataItems(items, { fetchDate: FETCH_DATE, retrievedFrom: "fixture" });
  bank.bankTranslation(translation);
  const before = bank.situationAssociationFor("Sydney");
  const second = bank.bankTranslation(translation);
  assert.equal(second.addedNodes, 0);
  assert.deepEqual(bank.situationAssociationFor("Sydney"), before);
});
