/**
 * ansci-geography-g1.test.ts — Geography G1 (2026-11-20;
 * design note docs/ansci/geography-design-note.md §2, §3,
 * §5, §6, §8, §9.1): the GeographyKnowledgeUnit's place
 * register and resolution protocol, GeographyAwareness's
 * situated reading, the Nominatim consultation under the
 * rate discipline, the ranker's proximity signal, and the
 * weather chain lifted into the pair.
 *
 * Pins:
 *  - the register: per-fact provenance, per-kind shelf
 *    lives, idempotent banking, stale facts refreshed and
 *    never served fresh;
 *  - import on read (§8's recommended P625 custody): the
 *    register entry cites the Wikidata bank as its immediate
 *    source; a coordinateless banked record imports as the
 *    §3.6 incomplete case;
 *  - the consultation: recorded fixtures only; namesakes go
 *    to the ranker, the situated place is proximity
 *    evidence, an unseparated margin is "ambiguous" and
 *    banks nothing; a winner banks with Nominatim
 *    provenance and a repeat resolution costs no call;
 *  - the throttle: request starts spaced at least a second
 *    apart, proven on a fake clock;
 *  - GeographyAwareness: the seat is the Place table's
 *    standing (null), the interlocutor's stated place is
 *    read from the record, shifts are recorded; the
 *    self-location route's fact is unchanged;
 *  - the weather chain through the pair: a place nobody
 *    holds coordinates for now resolves by consultation
 *    (Oklahoma City), an ambiguous place declines at the
 *    ambiguity, a stale-only holding declines at the
 *    staleness.
 *
 * Tests never touch the network: every source is a fixture
 * source or a counting stub over recorded responses
 * (test/fixtures/nominatim/, recorded live from this VM on
 * 2026-11-20, as were the Oklahoma City NWS fixtures).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { requestPlace } from "../src/ansci/social";
import { PlaceRegister, resolvePlace, type PlaceProvenance } from "../src/ansci/geography";
import {
  FixtureNominatimSource,
  RateThrottle,
  nominatimToEntityCandidate,
  parseNominatimReverse,
  parseNominatimSearch,
  type NominatimSource,
} from "../src/ansci/geography-client";
import { rankEntities, type EntityCandidate } from "../src/ansci/entity-rank";
import { interlocutorPlace, readGeographyAwareness } from "../src/ansci/geography-awareness";
import { processTurnWithWeather } from "../src/ansci/weather-turn";
import { PLACE } from "../src/ansci/place";

/** Run with no configured seat (the default is Oklahoma
 *  City, OK now): the standing these tests pin. */
function withNoSeat<T>(fn: () => T): T {
  const saved = PLACE.place;
  PLACE.place = null;
  try {
    return fn();
  } finally {
    PLACE.place = saved;
  }
}
import { FixtureWeatherSource } from "../src/ansci/weather-client";
import { defaultWeatherBank, placeKeyOf } from "../src/ansci/weather-bank";
import { WikidataBank } from "../src/ansci/wikidata-bank";
import { parseWikidataEntities, translateWikidataItems } from "../src/ansci/wikidata";

function fixturesDir(): string {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "test", "fixtures");
    if (fs.existsSync(path.join(candidate, "nws-points-oklahoma.json"))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(__dirname, "fixtures");
}
const FIXTURES = fixturesDir();
const fixture = (name: string) => JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf-8")) as unknown;
const nominatimFixture = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(FIXTURES, "nominatim", name), "utf-8")) as unknown;

function wikidataBankWith(fixtureName: string): WikidataBank {
  const bank = new WikidataBank();
  const items = parseWikidataEntities(
    JSON.parse(fs.readFileSync(path.join(FIXTURES, "wikidata", fixtureName), "utf-8")),
  );
  bank.bankTranslation(translateWikidataItems(items, { fetchDate: "2026-11-19", retrievedFrom: "fixture" }));
  return bank;
}

/** A Nominatim source that resolves nothing, successfully —
 *  the recorded no-hit shape, for any name. Counts calls. */
function noHitSource(counter?: { calls: number }): NominatimSource {
  return {
    search: async () => {
      if (counter) counter.calls++;
      return { status: "ok", data: [] };
    },
    reverse: async () => ({ status: "ok", data: null }),
  };
}

/** A Nominatim source that is down. */
const downSource: NominatimSource = {
  search: async () => ({ status: "unavailable", reason: "HTTP 503 from the geocoding endpoint" }),
  reverse: async () => ({ status: "unavailable", reason: "HTTP 503 from the geocoding endpoint" }),
};

const RETRIEVED: PlaceProvenance = {
  kind: "retrieved",
  dataset: "test-dataset",
  baseVersion: "2026-01-01",
  retrievedFrom: "fixture",
  confidence: 0.9,
  detail: "banked by the test",
};

/* ---- the register ---- */

test("register: banking is idempotent — a fresh fact re-banked changes nothing and counts as already banked", () => {
  const register = new PlaceRegister();
  const input = {
    name: "Oklahoma",
    coordinates: { lat: 35.5, lon: -98, standsFor: "Oklahoma, United States" },
    provenance: RETRIEVED,
    fetchedAt: "2026-11-20T00:00:00.000Z",
  };
  const first = register.bankPlace(input);
  assert.equal(first.addedFacts, 1);
  const second = register.bankPlace(input);
  assert.equal(second.addedFacts, 0);
  assert.equal(second.alreadyBanked, 1);
  assert.equal(register.placeCount, 1);
});

test("register: shelf life — coordinates are fresh inside twelve months and stale past them; a stale fact is refreshed by re-banking", () => {
  const register = new PlaceRegister();
  register.bankPlace({
    name: "Oklahoma",
    coordinates: { lat: 35.5, lon: -98, standsFor: "Oklahoma" },
    provenance: RETRIEVED,
    fetchedAt: "2026-01-01T00:00:00.000Z",
  });
  assert.ok(register.freshCoordinates("Oklahoma", new Date("2026-12-01T00:00:00Z")), "fresh at eleven months");
  assert.equal(register.freshCoordinates("Oklahoma", new Date("2027-02-01T00:00:00Z")), undefined, "stale at thirteen months");
  assert.ok(register.staleCoordinates("Oklahoma", new Date("2027-02-01T00:00:00Z")), "the stale fact stands as evidence, unserved");
  const refreshed = register.bankPlace({
    name: "Oklahoma",
    coordinates: { lat: 35.5, lon: -98, standsFor: "Oklahoma" },
    provenance: RETRIEVED,
    fetchedAt: "2027-02-01T00:00:00.000Z",
  });
  assert.equal(refreshed.addedFacts, 1, "re-banking a stale fact refreshes it");
  assert.ok(register.freshCoordinates("Oklahoma", new Date("2027-02-02T00:00:00Z")));
});

test("register: import on read — the entry cites the Wikidata bank as its immediate source, and containment comes with it", () => {
  const register = new PlaceRegister();
  const place = register.importFromWikidataBank(wikidataBankWith("oklahoma-wbgetentities.json"), "Oklahoma", new Date("2026-11-20T00:00:00Z"));
  assert.ok(place);
  assert.equal(place.coordinates?.value.lat, 35.5);
  assert.equal(place.coordinates?.value.lon, -98);
  const prov = place.coordinates?.provenance;
  assert.ok(prov?.kind === "retrieved" && /Wikidata bank/.test(prov.detail), "the provenance chain names the bank");
  assert.equal(prov?.kind === "retrieved" ? prov.uri : undefined, "Q1649");
  assert.deepEqual(place.containment.map((f) => f.value), ["United States"]);
  // Idempotent: a second import changes nothing.
  const again = register.importFromWikidataBank(wikidataBankWith("oklahoma-wbgetentities.json"), "Oklahoma", new Date("2026-11-21T00:00:00Z"));
  assert.equal(again?.coordinates?.fetchedAt, place.coordinates?.fetchedAt);
});

test("register: import on read of a coordinateless banked record is the incomplete case — the place stands, no point is invented", () => {
  const register = new PlaceRegister();
  const place = register.importFromWikidataBank(wikidataBankWith("oklahoma-wbgetentities.json"), "Oklahoma City", new Date("2026-11-20T00:00:00Z"));
  assert.ok(place, "Oklahoma City is banked by the fixture");
  assert.equal(place.coordinates, undefined);
  assert.equal(register.freshCoordinates("Oklahoma City"), undefined);
});

/* ---- the Nominatim client ---- */

test("client: the recorded Oklahoma search parses — the state first, with its point, importance and address", () => {
  const candidates = parseNominatimSearch(nominatimFixture("search-oklahoma.json"));
  assert.equal(candidates.length, 2);
  assert.equal(candidates[0].name, "Oklahoma");
  assert.ok(Math.abs(candidates[0].latitude - 34.9550817) < 1e-6);
  assert.ok(candidates[0].importance > 0.7);
  assert.equal(candidates[0].address.state, "Oklahoma");
  assert.equal(candidates[0].address.country, "United States");
});

test("client: a recorded no-hit parses as an empty candidate list — a successful resolution of nothing", () => {
  assert.deepEqual(parseNominatimSearch(nominatimFixture("search-zqxjkv.json")), []);
});

test("client: the recorded reverse response parses to the containing place", () => {
  const place = parseNominatimReverse(nominatimFixture("reverse-oklahoma-city.json"));
  assert.ok(place);
  assert.match(place.displayName, /Oklahoma/);
});

test("client: the fixture source serves by name, states its bounds as unavailable, and a recorded empty set is a no-hit", async () => {
  const source = new FixtureNominatimSource({
    Oklahoma: nominatimFixture("search-oklahoma.json"),
    Zqxjkv: nominatimFixture("search-zqxjkv.json"),
  });
  const hit = await source.search("oklahoma");
  assert.equal(hit.status, "ok");
  if (hit.status === "ok") assert.equal(hit.data.length, 2);
  const noHit = await source.search("Zqxjkv");
  assert.equal(noHit.status, "ok");
  if (noHit.status === "ok") assert.deepEqual(noHit.data, []);
  const missing = await source.search("Tulsa");
  assert.equal(missing.status, "unavailable");
});

test("client: the throttle spaces request starts at least a second apart (fake clock)", async () => {
  let now = 0;
  const starts: number[] = [];
  const throttle = new RateThrottle(1000, () => now, async (ms) => { now += ms; });
  const call = () => throttle.run(async () => { starts.push(now); });
  await Promise.all([call(), call(), call()]);
  assert.deepEqual(starts, [0, 1000, 2000]);
});

test("client: the ranker mapping — kind words from the candidate's own parts, importance scaled to a sitelink-like prior, coordinates carried", () => {
  const candidate = parseNominatimSearch(nominatimFixture("search-oklahoma.json"))[0];
  const mapped = nominatimToEntityCandidate(candidate);
  assert.ok(mapped.instanceOf.includes("state"));
  assert.equal(mapped.sitelinks, Math.round(candidate.importance * 100));
  assert.deepEqual(mapped.coordinates, { lat: candidate.latitude, lon: candidate.longitude });
});

/* ---- the ranker's proximity signal ---- */

test("ranker: proximity is an auditable line — the nearer namesake gains it, the breakdown shows the distance", () => {
  const base: EntityCandidate[] = [
    { id: "a", label: "Springfield", sitelinks: 50, instanceOf: ["city"], coordinates: { lat: 39.8, lon: -89.64 } },
    { id: "b", label: "Springfield", sitelinks: 50, instanceOf: ["city"], coordinates: { lat: 42.1, lon: -72.59 } },
  ];
  const ranked = rankEntities(base, {
    mention: "Springfield",
    contextText: "Springfield",
    expectedKind: "place",
    situatedPlace: { name: "Springfield, Illinois", lat: 39.8, lon: -89.64 },
  });
  assert.equal(ranked[0].candidate.id, "a");
  assert.equal(ranked[0].proximity?.distanceKm, 0);
  assert.equal(ranked[0].proximity?.score, 2);
  assert.ok((ranked[1].proximity?.distanceKm ?? 0) > 1000);
  const unranked = rankEntities(base, { mention: "Springfield", contextText: "Springfield", expectedKind: "place" });
  assert.equal(unranked[0].proximity, undefined, "no situated place in context — no proximity line, the three-signal ranking stands");
});

/* ---- the resolution protocol ---- */

test("resolution: a register hit costs no consultation", async () => {
  const register = new PlaceRegister();
  register.bankPlace({
    name: "Oklahoma",
    coordinates: { lat: 35.5, lon: -98, standsFor: "Oklahoma" },
    provenance: RETRIEVED,
    fetchedAt: "2026-11-20T00:00:00.000Z",
  });
  const counter = { calls: 0 };
  const resolution = await resolvePlace("Oklahoma", { register, nominatim: noHitSource(counter), now: new Date("2026-11-20T01:00:00Z") });
  assert.equal(resolution.kind, "resolved");
  assert.equal(counter.calls, 0);
});

test("resolution: the bank import answers before consultation is reached", async () => {
  const counter = { calls: 0 };
  const resolution = await resolvePlace("Oklahoma", {
    register: new PlaceRegister(),
    wikidataBank: wikidataBankWith("oklahoma-wbgetentities.json"),
    nominatim: noHitSource(counter),
    now: new Date("2026-11-20T01:00:00Z"),
  });
  assert.equal(resolution.kind, "resolved");
  if (resolution.kind === "resolved") assert.match(resolution.via, /imported on read/);
  assert.equal(counter.calls, 0);
});

test("resolution: a consultation winner banks with Nominatim provenance; the repeat resolves from the register with no second call", async () => {
  const register = new PlaceRegister();
  let calls = 0;
  const source: NominatimSource = {
    search: async () => { calls++; return { status: "ok", data: parseNominatimSearch(nominatimFixture("search-oklahoma.json")) }; },
    reverse: async () => ({ status: "ok", data: null }),
  };
  const deps = { register, nominatim: source, now: new Date("2026-11-20T01:00:00Z"), retrievedFrom: "fixture" };
  const first = await resolvePlace("Oklahoma", deps);
  assert.equal(first.kind, "resolved");
  assert.equal(calls, 1);
  const banked = register.placeByName("Oklahoma");
  assert.ok(Math.abs((banked?.coordinates?.value.lat ?? 0) - 34.9550817) < 1e-6);
  const prov = banked?.coordinates?.provenance;
  assert.ok(prov?.kind === "retrieved" && prov.dataset === "openstreetmap-nominatim", "the banked point is Nominatim-retrieved");
  assert.deepEqual(banked?.containment.map((f) => f.value), ["United States"]);
  const second = await resolvePlace("Oklahoma", deps);
  assert.equal(second.kind, "resolved");
  assert.equal(calls, 1, "the repeat cost the service nothing");
});

test("resolution: namesakes the margin cannot separate are ambiguous — nothing banked, nothing picked", async () => {
  const register = new PlaceRegister();
  const source = new FixtureNominatimSource({ Springfield: nominatimFixture("search-springfield.json") });
  const resolution = await resolvePlace("Springfield", { register, nominatim: source, now: new Date("2026-11-20T01:00:00Z") });
  assert.equal(resolution.kind, "ambiguous");
  if (resolution.kind === "ambiguous") assert.ok(resolution.leaders.length >= 2);
  assert.equal(register.placeCount, 0, "an ambiguous consultation banks nothing");
});

test("resolution: the situated place is ranking evidence — a conversation centred on one Springfield resolves to it", async () => {
  const register = new PlaceRegister();
  const source = new FixtureNominatimSource({ Springfield: nominatimFixture("search-springfield.json") });
  const resolution = await resolvePlace("Springfield", {
    register,
    nominatim: source,
    situatedPlace: { name: "Springfield, Illinois", lat: 39.7990175, lon: -89.6439575 },
    now: new Date("2026-11-20T01:00:00Z"),
  });
  assert.equal(resolution.kind, "resolved");
  if (resolution.kind === "resolved") assert.match(resolution.place.coordinates?.value.standsFor ?? "", /Illinois/);
});

test("resolution: a no-hit consultation is unresolved; a down source is unavailable; a stale holding with no cure is stale-only", async () => {
  const noHit = await resolvePlace("Zqxjkv", {
    register: new PlaceRegister(),
    nominatim: new FixtureNominatimSource({ Zqxjkv: nominatimFixture("search-zqxjkv.json") }),
    now: new Date("2026-11-20T01:00:00Z"),
  });
  assert.equal(noHit.kind, "unresolved");
  const down = await resolvePlace("Oklahoma", { register: new PlaceRegister(), nominatim: downSource, now: new Date("2026-11-20T01:00:00Z") });
  assert.equal(down.kind, "unavailable");
  const staleRegister = new PlaceRegister();
  staleRegister.bankPlace({
    name: "Oklahoma",
    coordinates: { lat: 35.5, lon: -98, standsFor: "Oklahoma" },
    provenance: RETRIEVED,
    fetchedAt: "2025-01-01T00:00:00.000Z",
  });
  const stale = await resolvePlace("Oklahoma", { register: staleRegister, nominatim: downSource, now: new Date("2026-11-20T01:00:00Z") });
  assert.equal(stale.kind, "stale-only");
});

/* ---- GeographyAwareness ---- */

test("awareness: a new session's seat is the Place table's standing — the default, Oklahoma City, OK — and no centre stands", () => {
  const s = newSession();
  assert.equal(s.geography.seat, "Oklahoma City, OK");
  assert.equal(s.geography.centre, undefined);
  assert.deepEqual(requestPlace(), { place: "Oklahoma City, OK" }, "the self-location route's fact is unchanged by the custody move");
});

test("awareness: the interlocutor's stated place is read from the record, and the shift is recorded", () => {
  // The register holds a POINTER to the record: the place
  // stands in the record's own form ("oklahoma", as typed),
  // exactly as Slice 6's private read returned it.
  const s = newSession();
  processTurn(s, "i am in oklahoma.");
  const reading = readGeographyAwareness(s);
  assert.equal(reading.interlocutorPlace?.place, "oklahoma");
  assert.equal(s.geography.shifts.length, 1);
  assert.equal(s.geography.shifts[0].place, "oklahoma");
  processTurn(s, "i am in tulsa.");
  const moved = interlocutorPlace(s);
  assert.equal(moved?.place, "tulsa");
  assert.equal(s.geography.shifts.length, 2, "the shift is recorded, not overwritten");
  assert.equal(s.geography.shifts[0].place, "oklahoma", "the earlier centre stands in the log");
});

test("awareness: the self-location answer is byte-identical after the re-point", () => {
  assert.equal(
    withNoSeat(() => processTurn(newSession(), "where are you?")).reply,
    "I don't have a place: nothing in my situation record says where I am.",
  );
});

/* ---- the weather chain through the pair ---- */

/** The default weather bank is process-level: expire any
 *  Oklahoma City reading an earlier test in this file
 *  banked, so the wrapper's trigger (lookup-needed) is what
 *  the test exercises — Slice 8's expireOklahomaReading
 *  discipline, for this file's place. */
function expireOklahomaCityReading(): void {
  defaultWeatherBank.put({
    placeKey: placeKeyOf("oklahoma city"),
    statedPlace: "oklahoma city",
    resolvedName: "Oklahoma City, OK",
    latitude: 35.473,
    longitude: -97.5171,
    temperatureC: 0,
    condition: "expired by the test",
    raining: false,
    snowing: false,
    observedAt: "2020-01-01T00:00:00+00:00",
    fetchedAt: "2020-01-01T00:00:00.000Z",
    expiresAt: "2020-01-01T00:30:00.000Z",
    source: "api.weather.gov",
    retrievedFrom: "fixture",
  });
}

const OKC_NWS: Record<string, { status: number; body: unknown }> = {
  "https://api.weather.gov/points/35.4730,-97.5171": { status: 200, body: fixture("nws-points-oklahoma-city.json") },
  "https://api.weather.gov/gridpoints/OUN/97,94/stations": { status: 200, body: fixture("nws-stations-oun-97-94.json") },
  "https://api.weather.gov/stations/KOKC/observations/latest": { status: 200, body: fixture("nws-observation-kokc-latest.json") },
};

test("weather: a place nobody holds coordinates for resolves by consultation — Oklahoma City answers, and the register banks its point", async () => {
  expireOklahomaCityReading();
  const register = new PlaceRegister();
  let geoCalls = 0;
  const geo: NominatimSource = {
    search: async () => { geoCalls++; return { status: "ok", data: parseNominatimSearch(nominatimFixture("search-oklahoma-city.json")) }; },
    reverse: async () => ({ status: "ok", data: null }),
  };
  const { reply, trace } = await processTurnWithWeather(newSession(), "what is the weather in oklahoma city?", {
    source: new FixtureWeatherSource(OKC_NWS),
    wikidataBank: new WikidataBank(),
    placeRegister: register,
    geographySource: geo,
    retrievedFrom: "fixture",
  });
  assert.equal(trace.weather?.action, "looked-up-and-banked");
  assert.equal(reply, "In Oklahoma City, OK it is 21°C and clear. (From the National Weather Service.)");
  assert.equal(geoCalls, 1);
  const banked = register.placeByName("Oklahoma City");
  assert.ok(banked?.coordinates, "the register banked the consulted point");
  assert.ok(Math.abs((banked?.coordinates?.value.lat ?? 0) - 35.4729886) < 1e-6);
});

test("weather: the repeat asking serves coordinates from the register — zero Nominatim calls", async () => {
  expireOklahomaCityReading();
  const register = new PlaceRegister();
  let geoCalls = 0;
  const geo: NominatimSource = {
    search: async () => { geoCalls++; return { status: "ok", data: parseNominatimSearch(nominatimFixture("search-oklahoma-city.json")) }; },
    reverse: async () => ({ status: "ok", data: null }),
  };
  const opts = {
    source: new FixtureWeatherSource(OKC_NWS),
    wikidataBank: new WikidataBank(),
    placeRegister: register,
    geographySource: geo,
    retrievedFrom: "fixture",
  };
  await processTurnWithWeather(newSession(), "what is the weather in oklahoma city?", opts);
  assert.equal(geoCalls, 1);
  const second = await processTurnWithWeather(newSession(), "what is the weather in oklahoma city?", opts);
  assert.equal(geoCalls, 1, "the repeat cost the geocoding service nothing");
  assert.ok(
    second.trace.weather?.action === "answered-from-bank" || second.trace.weather?.action === "looked-up-and-banked",
    "the repeat answers (from the weather bank, or refetched by the register's point)",
  );
});

test("weather: an ambiguous place declines at the ambiguity, naming the leaders", async () => {
  const geo = new FixtureNominatimSource({ Springfield: nominatimFixture("search-springfield.json") });
  const { reply, trace } = await processTurnWithWeather(newSession(), "what is the weather in springfield?", {
    source: new FixtureWeatherSource(OKC_NWS),
    wikidataBank: new WikidataBank(),
    placeRegister: new PlaceRegister(),
    geographySource: geo,
    retrievedFrom: "fixture",
  });
  assert.equal(trace.weather?.action, "place-ambiguous");
  assert.match(reply, /More than one place is called Springfield/);
  assert.match(reply, /Illinois/);
});

test("weather: a stale-only holding declines at the staleness and never serves the stale point", async () => {
  const register = new PlaceRegister();
  register.bankPlace({
    name: "Oklahoma",
    coordinates: { lat: 35.5, lon: -98, standsFor: "Oklahoma" },
    provenance: RETRIEVED,
    fetchedAt: "2025-01-01T00:00:00.000Z",
  });
  const savedSeat = PLACE.place;
  PLACE.place = null;
  try {
    const s = newSession();
    processTurn(s, "i am in oklahoma.");
    const { reply, trace } = await processTurnWithWeather(s, "what is the weather?", {
      source: new FixtureWeatherSource(OKC_NWS),
      wikidataBank: new WikidataBank(),
      placeRegister: register,
      geographySource: downSource,
      now: () => new Date("2026-11-20T12:00:00Z"),
      retrievedFrom: "fixture",
    });
    assert.equal(trace.weather?.action, "stale-only");
    assert.match(reply, /out of date/);
  } finally {
    PLACE.place = savedSeat;
  }
});
