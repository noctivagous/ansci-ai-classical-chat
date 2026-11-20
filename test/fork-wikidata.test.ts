/**
 * fork-wikidata.test.ts — slice W1: the Wikidata adapter core.
 *
 * All tests run against the recorded-shape fixtures in
 * test/fixtures/wikidata/ (live-recorded 2026-11-19, trimmed; see
 * that directory's README). Tests never touch the network: the
 * HTTP client is exercised only through an injected fake fetch and
 * the FixtureWikidataSource.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  parseWikidataEntities,
  parseWikidataSearch,
  proposeWikidataJoin,
  translateWikidataItems,
  WIKIDATA_STRUCTURAL_CONFIDENCE,
  type WikidataItem,
} from "../src/fork/wikidata";
import {
  FixtureWikidataSource,
  HttpWikidataSource,
  wbgetentitiesUrl,
  wikidataBaseUrl,
  WIKIDATA_DEFAULT_BASE_URL,
} from "../src/fork/wikidata-client";
import { WIKIDATA_MAPPING_V1, mappingForProperty } from "../src/fork/wikidata-mapping";

/** Fixtures live in the source tree; the compiled test runs from
 *  dist/test, so walk up to the repo root (the cskg-ingest loader's
 *  convention). */
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
const load = (name: string): unknown =>
  JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8"));

const FETCH_DATE = "2026-11-19";

function translateFixture(name: string) {
  const items = parseWikidataEntities(load(name));
  return { items, result: translateWikidataItems(items, { fetchDate: FETCH_DATE }) };
}

function itemByQid(items: WikidataItem[], qid: string): WikidataItem {
  const item = items.find((i) => i.qid === qid);
  assert.ok(item, `${qid} parsed`);
  return item;
}

/* ---------------- client ---------------- */

test("client: endpoint defaults to the Action API and honours WIKIDATA_BASE_URL", () => {
  assert.equal(wikidataBaseUrl({}), WIKIDATA_DEFAULT_BASE_URL);
  assert.equal(
    wikidataBaseUrl({ WIKIDATA_BASE_URL: "https://example.invalid/api.php" }),
    "https://example.invalid/api.php",
  );
  const url = wbgetentitiesUrl(WIKIDATA_DEFAULT_BASE_URL, ["Q1649", "Q30"]);
  assert.match(url, /action=wbgetentities/);
  assert.match(url, /ids=Q1649%7CQ30/);
});

test("client: HTTP source goes through the injected fetch; failures are 'unavailable', never thrown", async () => {
  const fixture = load("oklahoma-wbgetentities.json");
  const okSource = new HttpWikidataSource(WIKIDATA_DEFAULT_BASE_URL, async () => ({
    ok: true,
    status: 200,
    json: async () => fixture,
  }));
  const ok = await okSource.getEntities(["Q1649"]);
  assert.equal(ok.status, "ok");

  const downSource = new HttpWikidataSource(WIKIDATA_DEFAULT_BASE_URL, async () => {
    throw new Error("network down");
  });
  const down = await downSource.getEntities(["Q1649"]);
  assert.equal(down.status, "unavailable");
  if (down.status === "unavailable") assert.match(down.reason, /network down/);

  const httpSource = new HttpWikidataSource(WIKIDATA_DEFAULT_BASE_URL, async () => ({
    ok: false,
    status: 503,
    json: async () => ({}),
  }));
  const http = await httpSource.searchEntities("Oklahoma");
  assert.equal(http.status, "unavailable");
  if (http.status === "unavailable") assert.match(http.reason, /HTTP 503/);
});

test("client: fixture source serves recorded responses and reports misses as unavailable", async () => {
  const source = new FixtureWikidataSource(
    [load("oklahoma-wbgetentities.json")],
    [load("oklahoma-wbsearchentities.json")],
  );
  const hit = await source.getEntities(["Q1649"]);
  assert.equal(hit.status, "ok");
  const miss = await source.getEntities(["Q99999999"]);
  assert.equal(miss.status, "unavailable");
  const search = await source.searchEntities("Oklahoma");
  assert.equal(search.status, "ok");
  if (search.status === "ok") {
    const hits = parseWikidataSearch(search.data);
    assert.equal(hits[0].qid, "Q1649");
    assert.equal(hits[0].label, "Oklahoma");
  }
});

/* ---------------- mapping table ---------------- */

test("mapping table v1: the seven rows, with PART_OF and IS_A the existing associations", () => {
  assert.deepEqual(
    WIKIDATA_MAPPING_V1.map((r) => r.property),
    ["P36", "P17", "P131", "P361", "P625", "P31", "P279"],
  );
  assert.equal(mappingForProperty("P36")?.association, "CAPITAL_OF");
  assert.equal(mappingForProperty("P36")?.direction, "inverted");
  assert.equal(mappingForProperty("P17")?.association, "LOCATED_IN");
  assert.equal(mappingForProperty("P131")?.association, "LOCATED_IN");
  assert.equal(mappingForProperty("P361")?.association, "PART_OF");
  assert.equal(mappingForProperty("P31")?.association, "IS_A");
  assert.equal(mappingForProperty("P279")?.association, "IS_A");
  assert.equal(mappingForProperty("P625")?.direction, "node-properties");
  assert.equal(mappingForProperty("P625")?.association, undefined);
  assert.equal(mappingForProperty("P1082"), undefined);
});

/* ---------------- translation: Oklahoma ---------------- */

test("translation: Oklahoma yields the expected association graph onto named nodes", () => {
  const { result } = translateFixture("oklahoma-wbgetentities.json");
  const edges = result.associations.map((a) => `${a.from} —${a.type}→ ${a.to}`).sort();
  assert.deepEqual(edges, [
    "Oklahoma City —CAPITAL_OF→ Oklahoma",
    "Oklahoma —IS_A→ U.S. state",
    "Oklahoma —LOCATED_IN→ United States",
    "Oklahoma —LOCATED_IN→ United States",
    "Oklahoma —PART_OF→ contiguous United States",
  ]);
  // The two LOCATED_IN edges are distinct statements (P17 and P131).
  const loc = result.associations.filter((a) => a.type === "LOCATED_IN");
  assert.deepEqual(loc.map((a) => a.property).sort(), ["P131", "P17"]);
  // Nothing in Wikidata's native schema: no P-number is an edge name.
  for (const a of result.associations) assert.doesNotMatch(a.type, /^P\d+$/);
  // Provenance: retrieved-kind, SourceRecord, fixed 0.9, never anchors.
  for (const a of result.associations) {
    assert.equal(a.provenanceKind, "retrieved");
    assert.equal(a.confidence, WIKIDATA_STRUCTURAL_CONFIDENCE);
    assert.equal(a.neverPropagationAnchor, true);
    assert.equal(a.source.dataset, "wikidata");
    assert.equal(a.source.baseVersion, FETCH_DATE);
    assert.equal(a.source.uri, "Q1649");
  }
});

test("translation: coordinates land as node properties lat/lon, never as an edge", () => {
  const { result } = translateFixture("oklahoma-wbgetentities.json");
  const ok = result.nodes.find((n) => n.qid === "Q1649");
  assert.ok(ok);
  assert.equal(ok.properties.lat, 35.5);
  assert.equal(ok.properties.lon, -98);
  assert.equal(ok.neverPropagationAnchor, true);
  assert.ok(!result.associations.some((a) => a.property === "P625"));
});

test("translation: skip-log counts the unmapped properties present, with labels", () => {
  const { result } = translateFixture("oklahoma-wbgetentities.json");
  const byProperty = new Map(result.skipLog.map((s) => [s.property, s]));
  assert.equal(byProperty.get("P1082")?.count, 1);
  assert.equal(byProperty.get("P1082")?.label, "population");
  assert.equal(byProperty.get("P571")?.count, 1);
  assert.equal(byProperty.get("P571")?.label, "inception");
  assert.equal(byProperty.get("P37")?.count, 1);
  assert.equal(byProperty.get("P37")?.label, "official language");
  for (const s of result.skipLog) assert.equal(s.reason, "unmapped-property");
  assert.equal(result.skippedTotal, 3);
});

/* ---------------- translation: Texas + Mercury (generality) ---------------- */

test("translation: Texas takes the same path (no entity-type assumptions)", () => {
  const { result } = translateFixture("texas-wbgetentities.json");
  const edges = result.associations.map((a) => `${a.from} —${a.type}→ ${a.to}`).sort();
  assert.deepEqual(edges, [
    "Austin —CAPITAL_OF→ Texas",
    "Texas —IS_A→ U.S. state",
    "Texas —LOCATED_IN→ United States",
    "Texas —LOCATED_IN→ United States",
    "Texas —PART_OF→ contiguous United States",
  ]);
  const tx = result.nodes.find((n) => n.qid === "Q1439");
  assert.equal(tx?.properties.lat, 31);
  assert.equal(tx?.properties.lon, -100);
  assert.equal(result.skippedTotal, 2); // P1082 population, P571 inception
});

test("translation: Mercury, a non-place item, translates through the same table", () => {
  const { result } = translateFixture("mercury-wbgetentities.json");
  const edges = result.associations.map((a) => `${a.from} —${a.type}→ ${a.to}`).sort();
  assert.deepEqual(edges, [
    "Mercury —IS_A→ inferior planet",
    "Mercury —IS_A→ inner planet of the Solar System",
    "Mercury —PART_OF→ inner Solar System",
  ]);
  const mercury = result.nodes.find((n) => n.qid === "Q308");
  assert.deepEqual(mercury?.properties, {}); // no P625 in the fixture: no properties, no complaint
  assert.equal(result.skippedTotal, 0);
});

/* ---------------- join proposals ---------------- */

test("join proposals: Oklahoma proposes its single WordNet synset, no conflict, never auto-joined", () => {
  const { items } = translateFixture("oklahoma-wbgetentities.json");
  const proposal = proposeWikidataJoin(itemByQid(items, "Q1649"));
  assert.equal(proposal.status, "proposed");
  assert.equal(proposal.conflict, false);
  assert.equal(proposal.autoJoined, false);
  assert.equal(proposal.candidates.length, 1);
  assert.equal(proposal.candidates[0].kind, "synset");
});

test("join proposals: Mercury is the ambiguous case — multiple candidates flag a conflict", () => {
  const { items } = translateFixture("mercury-wbgetentities.json");
  const proposal = proposeWikidataJoin(itemByQid(items, "Q308"));
  assert.equal(proposal.conflict, true);
  assert.ok(proposal.candidates.length > 1, "mercury carries several synset candidates");
  assert.match(proposal.conflictReason ?? "", /distinct candidates/);
  assert.equal(proposal.autoJoined, false);
});

test("join proposals: a label/sitelink mismatch flags a conflict even with one candidate", () => {
  const item: WikidataItem = { qid: "Q0", label: "Texas", sitelinkTitle: "Oklahoma", claims: [] };
  const proposal = proposeWikidataJoin(item);
  assert.equal(proposal.conflict, true);
  assert.match(proposal.conflictReason ?? "", /different things|candidates/);
});

test("join proposals: an unmatched label is a stated no-candidate, not a join", () => {
  const item: WikidataItem = { qid: "Q0", label: "Zqxjkvnomatch", claims: [] };
  const proposal = proposeWikidataJoin(item);
  assert.equal(proposal.status, "no-candidate");
  assert.equal(proposal.candidates.length, 0);
  assert.equal(proposal.autoJoined, false);
});
