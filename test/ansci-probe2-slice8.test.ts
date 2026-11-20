/**
 * ansci-probe2-slice8.test.ts — the weather source re-point
 * to api.weather.gov (Probe-2 Slice 8, 2026-11-20; the
 * owner's suggestion of the service, replacing Slice 6's
 * Open-Meteo, whose forecast endpoint rate-limited this
 * egress IP mid-slice and left live weather unverified).
 *
 * What this file pins, beyond Slice 6's reworked wrapper
 * tests:
 *  - the NWS parsers and the raining/snowing phrase table;
 *  - the coordinate discipline: coordinates come from what
 *    the system holds — the Place table's configuration
 *    for the configured place, else the Wikidata bank's
 *    banked P625 properties — and a place with neither
 *    declines located at the missing coordinates,
 *    including a banked record that holds no coordinates
 *    (the §3.6 incomplete case); no geocoding anywhere;
 *  - the coverage outcome: a point outside the United
 *    States (the points lookup's recorded 404) declines
 *    located at the source's coverage, with no silent
 *    fallback to another source;
 *  - the fetch accounting at the HTTP level: one lookup
 *    is three requests (points, stations, observation),
 *    and a repeat asking inside the shelf life makes none.
 *
 * Tests never touch the network: the fixture source and
 * the counting fetch both serve the responses recorded
 * live from this VM on 2026-11-20.
 *
 * SUPERSESSION (Geography G1, 2026-11-20): the wrapper's
 * coordinate path now runs the geography pair's protocol —
 * the place register, the Wikidata bank imported on read,
 * and a Nominatim consultation on a miss (geography.ts).
 * The wrapper tests below inject a fresh register and a
 * no-hit geography source wherever the old held-coordinates
 * path stood alone, so the pins keep their substance: the
 * "coordinates from the bank" pin's trace now names the
 * import-on-read; the incomplete Oklahoma City pin stands
 * because the injected consultation resolves nothing (the
 * detail names the §3.6 incomplete case, as before); the
 * "no geocoding anywhere" pin is superseded in name — a
 * consultation now runs and resolves nothing, and the
 * weather source is still never consulted without a point.
 * Geography G1's own test file pins the consultation's
 * successes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { processTurnWithWeather } from "../src/ansci/weather-turn";
import {
  FixtureWeatherSource,
  HttpWeatherSource,
  parseLatestObservation,
  parsePoints,
  parseStations,
  pointsRequestUrl,
  stationObservationUrl,
} from "../src/ansci/weather-client";
import { defaultWeatherBank, placeKeyOf, weatherFlagsForNwsText, type WeatherReading } from "../src/ansci/weather-bank";
import { PLACE } from "../src/ansci/place";
import { WikidataBank } from "../src/ansci/wikidata-bank";
import { parseWikidataEntities, translateWikidataItems } from "../src/ansci/wikidata";
import { PlaceRegister } from "../src/ansci/geography";
import type { NominatimSource } from "../src/ansci/geography-client";

/** Geography G1: a Nominatim consultation that resolves
 *  nothing (the recorded no-hit shape), for any name — the
 *  wrapper tests below run the geography protocol with it
 *  so no gated test touches the network. Counts calls. */
function noHitGeography(counter?: { calls: number }): NominatimSource {
  return {
    search: async () => {
      if (counter) counter.calls++;
      return { status: "ok", data: [] };
    },
    reverse: async () => ({ status: "ok", data: null }),
  };
}

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
const fixture = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf-8")) as unknown;

const NWS_RESPONSES: Record<string, { status: number; body: unknown }> = {
  "https://api.weather.gov/points/35.5000,-98.0000": { status: 200, body: fixture("nws-points-oklahoma.json") },
  "https://api.weather.gov/gridpoints/OUN/80,95/stations": { status: 200, body: fixture("nws-stations-oun-80-95.json") },
  "https://api.weather.gov/stations/KPWA/observations/latest": { status: 200, body: fixture("nws-observation-kpwa-latest.json") },
  "https://api.weather.gov/points/-33.8700,151.2100": { status: 404, body: fixture("nws-points-sydney-404.json") },
};
const fixtureSource = () => new FixtureWeatherSource(NWS_RESPONSES);

function wikidataBankWith(fixtureName: string): WikidataBank {
  const bank = new WikidataBank();
  const items = parseWikidataEntities(
    JSON.parse(fs.readFileSync(path.join(FIXTURES, "wikidata", fixtureName), "utf-8")),
  );
  bank.bankTranslation(translateWikidataItems(items, { fetchDate: "2026-11-19", retrievedFrom: "fixture" }));
  return bank;
}
const oklahomaWikidataBank = () => wikidataBankWith("oklahoma-wbgetentities.json");

/** The default weather bank is process-level and shared
 *  across this file's tests: a test that needs its
 *  Oklahoma turn to reach the wrapper first expires the
 *  bank's Oklahoma reading, so the synchronous turn ends
 *  lookup-needed whatever earlier tests banked. */
function expireOklahomaReading(): void {
  const stale: WeatherReading = {
    placeKey: placeKeyOf("oklahoma"),
    statedPlace: "Oklahoma",
    resolvedName: "El Reno, OK",
    latitude: 35.5,
    longitude: -98,
    temperatureC: 0,
    condition: "expired by the test",
    raining: false,
    snowing: false,
    observedAt: "2020-01-01T00:00:00+00:00",
    fetchedAt: "2020-01-01T00:00:00.000Z",
    expiresAt: "2020-01-01T00:30:00.000Z",
    source: "api.weather.gov",
    retrievedFrom: "fixture",
  };
  defaultWeatherBank.put(stale);
}

const BANKED_REPLY = "In El Reno, OK it is 21°C and mostly clear and windy. (From the National Weather Service.)";

/* ---- parsers and the phrase table ---- */

test("request URLs: the points URL carries the point at the service's precision; the observation URL names the station", () => {
  assert.equal(pointsRequestUrl("https://api.weather.gov", 35.5, -98), "https://api.weather.gov/points/35.5000,-98.0000");
  assert.equal(
    stationObservationUrl("https://api.weather.gov", "KPWA"),
    "https://api.weather.gov/stations/KPWA/observations/latest",
  );
});

test("parsePoints: a body without observation stations is not a resolution", () => {
  assert.equal(parsePoints({ properties: {} }), undefined);
  assert.equal(parsePoints(null), undefined);
});

test("parseStations: an empty station list resolves nothing", () => {
  assert.equal(parseStations({ features: [] }), undefined);
});

test("parseLatestObservation: a Fahrenheit report is converted; a missing temperature is not a reading", () => {
  const f = parseLatestObservation({
    properties: {
      timestamp: "2026-11-20T20:00:00+00:00",
      textDescription: "Fair",
      temperature: { value: 68, unitCode: "wmoUnit:degF" },
    },
  });
  assert.equal(f?.temperatureC, 20);
  const none = parseLatestObservation({
    properties: {
      timestamp: "2026-11-20T20:00:00+00:00",
      textDescription: "Fair",
      temperature: { value: null, unitCode: "wmoUnit:degC" },
    },
  });
  assert.equal(none, undefined);
});

test("the phrase table: rain and snow words, measured precipitation, and the snow exception", () => {
  assert.deepEqual(weatherFlagsForNwsText("Light Rain"), { raining: true, snowing: false });
  assert.deepEqual(weatherFlagsForNwsText("Heavy Snow"), { raining: false, snowing: true });
  assert.deepEqual(weatherFlagsForNwsText("Mostly Clear and Windy"), { raining: false, snowing: false });
  assert.deepEqual(weatherFlagsForNwsText("Fair", 1.2), { raining: true, snowing: false });
  assert.deepEqual(weatherFlagsForNwsText("Snow", 2.0), { raining: false, snowing: true });
  assert.deepEqual(weatherFlagsForNwsText("Rain and Snow"), { raining: true, snowing: true });
});

/* ---- the coordinate discipline ---- */

test("coordinates from the bank: the wrapper's trace names the banked P625 record it read", async () => {
  expireOklahomaReading();
  const s = newSession();
  processTurn(s, "i am in oklahoma.");
  const { reply, trace } = await processTurnWithWeather(s, "what is the weather?", {
    source: fixtureSource(),
    wikidataBank: oklahomaWikidataBank(),
    placeRegister: new PlaceRegister(),
    geographySource: noHitGeography(),
    retrievedFrom: "fixture",
  });
  assert.equal(reply, BANKED_REPLY);
  assert.match(trace.weather?.detail ?? "", /Wikidata bank's record for Oklahoma \(Q1649\)/);
  assert.match(trace.weather?.detail ?? "", /35\.5, -98/);
});

test("coordinates from the Place table: a configured place with configured coordinates needs no bank record", async () => {
  expireOklahomaReading();
  const saved = { place: PLACE.place, latitude: PLACE.latitude, longitude: PLACE.longitude };
  try {
    PLACE.place = "Oklahoma";
    PLACE.latitude = 35.5;
    PLACE.longitude = -98;
    const s = newSession();
    const { reply, trace } = await processTurnWithWeather(s, "what is the weather?", {
      source: fixtureSource(),
      wikidataBank: new WikidataBank(),
      placeRegister: new PlaceRegister(),
      geographySource: noHitGeography(),
      retrievedFrom: "fixture",
    });
    assert.equal(trace.weather?.placeSource, "configured");
    assert.equal(reply, BANKED_REPLY);
    assert.match(trace.weather?.detail ?? "", /Place table's configuration/);
  } finally {
    PLACE.place = saved.place;
    PLACE.latitude = saved.latitude;
    PLACE.longitude = saved.longitude;
  }
});

test("a banked record without coordinates is the incomplete case: 'oklahoma city' is banked, but holds no P625", async () => {
  // The recorded Oklahoma fixture banks Oklahoma City
  // (Q34863) as a node with no coordinates — banking a
  // place is not holding its point.
  const bank = oklahomaWikidataBank();
  assert.ok(bank.nodeByName("Oklahoma City"), "the fixture banks the city");
  assert.equal(bank.nodeByName("Oklahoma City")?.properties.lat, undefined);
  const { reply, trace } = await processTurnWithWeather(newSession(), "what is the weather in oklahoma city?", {
    source: fixtureSource(),
    wikidataBank: bank,
    placeRegister: new PlaceRegister(),
    geographySource: noHitGeography(),
  });
  assert.equal(trace.weather?.action, "coordinates-missing");
  assert.match(reply, /no coordinates for Oklahoma city/);
  assert.match(trace.weather?.detail ?? "", /incomplete/);
});

test("a place nobody holds coordinates for declines before the weather source is consulted (G1: the geocoding consultation runs and resolves nothing)", async () => {
  let calls = 0;
  const counting = {
    currentConditions: async (a: number, b: number) => { calls++; return fixtureSource().currentConditions(a, b); },
  };
  const geoCounter = { calls: 0 };
  const { trace } = await processTurnWithWeather(newSession(), "what is the weather in texas?", {
    source: counting,
    wikidataBank: oklahomaWikidataBank(),
    placeRegister: new PlaceRegister(),
    geographySource: noHitGeography(geoCounter),
  });
  assert.equal(trace.weather?.action, "coordinates-missing");
  assert.equal(geoCounter.calls, 1, "the geography consultation ran — and resolved no such place");
  assert.equal(calls, 0, "the weather source was never consulted — there was no point to give it");
});

/* ---- coverage ---- */

test("coverage: Sydney's banked point is outside the source's coverage — the decline names the coverage, no fallback", async () => {
  const bank = wikidataBankWith("sydney-wbgetentities.json");
  assert.equal(bank.nodeByName("Sydney")?.properties.lat, -33.87);
  const { reply, trace } = await processTurnWithWeather(newSession(), "what is the weather in sydney?", {
    source: fixtureSource(),
    wikidataBank: bank,
    placeRegister: new PlaceRegister(),
    geographySource: noHitGeography(),
  });
  assert.equal(trace.weather?.action, "source-coverage");
  assert.equal(
    reply,
    "My weather source covers the United States, and Sydney is outside it, so I have no reading for it.",
  );
  assert.match(trace.declineReason ?? "", /coverage/);
});

/* ---- fetch accounting at the HTTP level ---- */

test("one lookup is three HTTP requests; a repeat inside the shelf life is none", async () => {
  expireOklahomaReading();
  let calls = 0;
  const urls: string[] = [];
  const fetchFn = async (url: string) => {
    calls++;
    urls.push(url);
    const entry = NWS_RESPONSES[url];
    if (!entry) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: entry.status < 300, status: entry.status, json: async () => entry.body };
  };
  const source = new HttpWeatherSource("https://api.weather.gov", fetchFn);
  const s = newSession();
  processTurn(s, "i am in oklahoma.");
  const first = await processTurnWithWeather(s, "what is the weather?", {
    source,
    wikidataBank: oklahomaWikidataBank(),
    placeRegister: new PlaceRegister(),
    geographySource: noHitGeography(),
    retrievedFrom: "fixture",
  });
  assert.equal(first.reply, BANKED_REPLY);
  assert.equal(calls, 3);
  assert.deepEqual(urls, [
    "https://api.weather.gov/points/35.5000,-98.0000",
    "https://api.weather.gov/gridpoints/OUN/80,95/stations",
    "https://api.weather.gov/stations/KPWA/observations/latest",
  ]);
  // The repeat: a fresh session, the reading banked and
  // inside its shelf life — the wrapper's turn answers
  // from the bank and the source is never called.
  const s2 = newSession();
  processTurn(s2, "i am in oklahoma.");
  const second = await processTurnWithWeather(s2, "what is the weather?", {
    source,
    wikidataBank: oklahomaWikidataBank(),
    placeRegister: new PlaceRegister(),
    geographySource: noHitGeography(),
    retrievedFrom: "fixture",
  });
  assert.equal(second.reply, BANKED_REPLY);
  assert.equal(second.trace.weather?.action, "answered-from-bank");
  assert.equal(calls, 3, "the repeat made no HTTP request");
});
