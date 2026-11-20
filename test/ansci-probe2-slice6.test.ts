/**
 * ansci-probe2-slice6.test.ts — weather on the Wikidata
 * pattern (Probe-2 Slice 6, 2026-11-20; diagnostic SD4,
 * second half + K1).
 *
 * Place first (question's own place → configured place →
 * conversation-stated place → a reply naming the place
 * gap), the bank before any fetch, banked readings carrying
 * fetch time + a stated shelf life, and the fetch living in
 * the async wrapper (weather-turn.ts) on the synchronous
 * turn's located lookup-needed decline — the wikidata-*
 * modules' division of work, applied to a source whose
 * facts expire.
 *
 * SUPERSESSION (Probe-2 Slice 8, 2026-11-20): the live
 * source was re-pointed from Open-Meteo to api.weather.gov.
 * The synchronous-shape tests below (W1–W7, S2, the residue
 * guard, shape detection) are Slice 6's own and unchanged.
 * The client and wrapper sections were reworked: the
 * source no longer geocodes — coordinates come from what
 * the system holds (here, a WikidataBank banked from the
 * recorded Oklahoma fixture, whose P625 point is
 * 35.5, -98) — the fixture source serves the recorded
 * api.weather.gov responses by URL, the reply's source
 * note names the National Weather Service, and the
 * place-unresolved outcome is replaced by the
 * coordinates-missing decline (Slice 8's test file pins
 * the new outcomes in full). The recorded NWS observation
 * for the banked point: station KPWA, 21°C, "Mostly Clear
 * and Windy", the point resolving to El Reno, OK.
 *
 * Tests never touch the network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { processTurnWithWeather } from "../src/ansci/weather-turn";
import { FixtureWeatherSource, parseLatestObservation, parsePoints, parseStations } from "../src/ansci/weather-client";
import { defaultWeatherBank, placeKeyOf, type WeatherReading } from "../src/ansci/weather-bank";
import { detectWeatherQuestion } from "../src/ansci/weather";
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

const fixture = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf-8")) as unknown;

/** The recorded api.weather.gov responses for the banked
 *  Oklahoma point (35.5, -98), served by URL. */
const fixtureSource = () =>
  new FixtureWeatherSource({
    "https://api.weather.gov/points/35.5000,-98.0000": { status: 200, body: fixture("nws-points-oklahoma.json") },
    "https://api.weather.gov/gridpoints/OUN/80,95/stations": { status: 200, body: fixture("nws-stations-oun-80-95.json") },
    "https://api.weather.gov/stations/KPWA/observations/latest": { status: 200, body: fixture("nws-observation-kpwa-latest.json") },
  });

/** A Wikidata bank holding Oklahoma (with its P625
 *  coordinates), banked from the recorded fixture — the
 *  wrapper's coordinate source in these tests. */
function oklahomaWikidataBank(): WikidataBank {
  const bank = new WikidataBank();
  const items = parseWikidataEntities(
    JSON.parse(fs.readFileSync(path.join(FIXTURES, "wikidata", "oklahoma-wbgetentities.json"), "utf-8")),
  );
  bank.bankTranslation(translateWikidataItems(items, { fetchDate: "2026-11-19", retrievedFrom: "fixture" }));
  return bank;
}

const PLACE_GAP = "I don't know where you are, so I can't say what the weather is like there.";
const LOOKUP_NEEDED_OK =
  "I have no weather reading for Oklahoma — readings come from the weather source, and none stands banked for it.";
const BANKED_REPLY = "In El Reno, OK it is 21°C and mostly clear and windy. (From the National Weather Service.)";

/* ---- the synchronous shape: W1–W7 + S2 ---- */

test("W1: no place anywhere — the reply names the place gap", () => {
  const { reply, trace } = processTurn(newSession(), "what is the weather?");
  assert.equal(reply, PLACE_GAP);
  assert.equal(trace.weather?.action, "place-gap");
});

test("W2: 'What is the weather now?' takes the weather path, not the 'now' misfire", () => {
  const { reply, trace } = processTurn(newSession(), "What is the weather now?");
  assert.equal(reply, PLACE_GAP);
  assert.equal(trace.weather?.action, "place-gap");
});

test("W3: 'how is the weather?' takes the weather path", () => {
  const { reply } = processTurn(newSession(), "how is the weather?");
  assert.equal(reply, PLACE_GAP);
});

test("W4: the question's own place resolves — the gap is the missing reading", () => {
  const { reply, trace } = processTurn(newSession(), "what is the weather in oklahoma?");
  assert.equal(reply, LOOKUP_NEEDED_OK);
  assert.equal(trace.weather?.action, "lookup-needed");
  assert.equal(trace.weather?.placeSource, "question");
});

test("W5: 'is it raining?' with no place names the place gap for that shape", () => {
  const { reply, trace } = processTurn(newSession(), "is it raining?");
  assert.equal(reply, "I don't know where you are, so I can't say whether it is raining there.");
  assert.equal(trace.weather?.shape, "raining");
});

test("W6: a conversation-stated place changes the answer — 'i am in oklahoma.' resolves from the record", () => {
  const s = newSession();
  processTurn(s, "i am in oklahoma.");
  const { reply, trace } = processTurn(s, "what is the weather?");
  assert.equal(reply, LOOKUP_NEEDED_OK);
  assert.equal(trace.weather?.placeSource, "conversation");
});

test("W6 (event form): 'i live in oklahoma.' resolves from the residence event", () => {
  const s = newSession();
  processTurn(s, "i live in oklahoma.");
  const { trace } = processTurn(s, "what is the weather?");
  assert.equal(trace.weather?.action, "lookup-needed");
  assert.equal(trace.weather?.placeSource, "conversation");
});

test("W7: 'what is the temperature?' is the weather shape's too", () => {
  const { reply, trace } = processTurn(newSession(), "what is the temperature?");
  assert.equal(reply, "I don't know where you are, so I can't say what the temperature is there.");
  assert.equal(trace.weather?.shape, "temperature");
});

test("S2: weather stated in the conversation answers from the record — never contradicted, never the question's own word", () => {
  const s = newSession();
  processTurn(s, "the weather is cold.");
  const { reply, trace } = processTurn(s, "what is the weather?");
  assert.equal(reply, "You said the weather is cold.");
  assert.equal(trace.weather?.action, "answered-from-record");
});

test("a question's own residue is not stated weather: asking twice still names the place gap", () => {
  const s = newSession();
  processTurn(s, "what is the weather?");
  const { reply } = processTurn(s, "what is the weather?");
  assert.equal(reply, PLACE_GAP);
});

test("shape detection is the commissioned set, not a weather grammar", () => {
  assert.equal(detectWeatherQuestion("what is the weather in oklahoma?")?.placeInQuestion, "oklahoma");
  assert.equal(detectWeatherQuestion("is it raining?")?.shape, "raining");
  assert.equal(detectWeatherQuestion("what is the capital of oklahoma?"), undefined);
  assert.equal(detectWeatherQuestion("the weather is cold."), undefined);
});

/* ---- the client contract, on the recorded fixtures ---- */

test("the recorded points fixture parses to the El Reno grid and its stations URL", () => {
  const points = parsePoints(fixture("nws-points-oklahoma.json"));
  assert.equal(points?.observationStationsUrl, "https://api.weather.gov/gridpoints/OUN/80,95/stations");
  assert.equal(points?.city, "El Reno");
  assert.equal(points?.state, "OK");
});

test("the recorded stations fixture's first station is KPWA", () => {
  assert.equal(parseStations(fixture("nws-stations-oun-80-95.json")), "KPWA");
});

test("the recorded observation fixture parses to its temperature and condition words", () => {
  const obs = parseLatestObservation(fixture("nws-observation-kpwa-latest.json"));
  assert.equal(obs?.temperatureC, 21);
  assert.equal(obs?.conditionText, "Mostly Clear and Windy");
  assert.equal(obs?.precipitationMm, undefined, "the station reported no precipitation figure");
});

test("the fixture source states its limits as unavailable, never as empty", async () => {
  const result = await fixtureSource().currentConditions(0, 0);
  assert.equal(result.status, "unavailable");
});

/* ---- the wrapper: coordinates, fetch, bank, shelf life ---- */

test("wrapper: W6 fetches through the fixture source, banks the reading, and answers from it", async () => {
  const s = newSession();
  processTurn(s, "i am in oklahoma.");
  const { reply, trace } = await processTurnWithWeather(s, "what is the weather?", {
    source: fixtureSource(),
    wikidataBank: oklahomaWikidataBank(),
    retrievedFrom: "fixture",
  });
  assert.equal(reply, BANKED_REPLY);
  assert.equal(trace.weather?.action, "looked-up-and-banked");
  assert.ok(trace.weather?.fetchedAt, "the fetch time rides in the trace");
  assert.ok(trace.weather?.expiresAt && trace.weather.expiresAt > trace.weather.fetchedAt!);
});

test("bank: a repeat asking inside the shelf life answers from the bank with no fetch — fetch time in the trace", () => {
  // Rests on the previous test's banked reading (same
  // process-level bank, same place): a NEW session's
  // synchronous turn answers from the bank.
  const s = newSession();
  processTurn(s, "i am in oklahoma.");
  const { reply, trace } = processTurn(s, "what is the weather?");
  assert.equal(reply, BANKED_REPLY);
  assert.equal(trace.weather?.action, "answered-from-bank");
  assert.ok(trace.weather?.fetchedAt);
});

test("bank: the temperature and raining shapes read the same banked reading", () => {
  const s = newSession();
  processTurn(s, "i am in oklahoma.");
  assert.equal(
    processTurn(s, "what is the temperature?").reply,
    "In El Reno, OK it is 21°C. (From the National Weather Service.)",
  );
  assert.equal(
    processTurn(s, "is it raining?").reply,
    "No — it is not raining in El Reno, OK: mostly clear and windy, 21°C. (From the National Weather Service.)",
  );
});

test("shelf life: a stale reading is never spoken as current — the turn needs a lookup, the wrapper refetches", async () => {
  const stale: WeatherReading = {
    placeKey: placeKeyOf("oklahoma"),
    statedPlace: "Oklahoma",
    resolvedName: "El Reno, OK",
    latitude: 35.5,
    longitude: -98,
    temperatureC: 99,
    condition: "mostly clear and windy",
    raining: false,
    snowing: false,
    observedAt: "2020-01-01T00:00:00+00:00",
    fetchedAt: "2020-01-01T00:00:00.000Z",
    expiresAt: "2020-01-01T00:30:00.000Z",
    source: "api.weather.gov",
    retrievedFrom: "fixture",
  };
  defaultWeatherBank.put(stale);
  const s = newSession();
  processTurn(s, "i am in oklahoma.");
  const sync = processTurn(s, "what is the weather?");
  assert.equal(sync.trace.weather?.action, "lookup-needed");
  assert.match(sync.trace.weather?.detail ?? "", /stale weather is not spoken as current/);
  let calls = 0;
  const base = fixtureSource();
  const counting = {
    currentConditions: async (a: number, b: number) => { calls++; return base.currentConditions(a, b); },
  };
  const { reply, trace } = await processTurnWithWeather(s, "what is the weather?", {
    source: counting,
    wikidataBank: oklahomaWikidataBank(),
    retrievedFrom: "fixture",
  });
  assert.equal(calls, 1);
  assert.equal(reply, BANKED_REPLY);
  assert.equal(trace.weather?.action, "looked-up-and-banked");
});

test("wrapper: an unavailable source gives the located lookup-unavailable decline — never 'no weather'", async () => {
  // Texas, banked from its own fixture (P625 31, -100), so
  // the wrapper reaches the source with held coordinates —
  // and no Texas reading ever stands in the weather bank.
  const texasBank = new WikidataBank();
  texasBank.bankTranslation(
    translateWikidataItems(
      parseWikidataEntities(JSON.parse(fs.readFileSync(path.join(FIXTURES, "wikidata", "texas-wbgetentities.json"), "utf-8"))),
      { fetchDate: "2026-11-19", retrievedFrom: "fixture" },
    ),
  );
  const down = {
    currentConditions: async () => ({ status: "unavailable" as const, reason: "HTTP 503 from the weather endpoint" }),
  };
  const { reply, trace } = await processTurnWithWeather(newSession(), "what is the weather in texas?", {
    source: down,
    wikidataBank: texasBank,
  });
  assert.match(reply, /couldn't look the weather up/);
  assert.equal(trace.weather?.action, "lookup-unavailable");
});

test("wrapper: a place with no held coordinates declines at the missing coordinates (Slice 8 supersedes place-unresolved)", async () => {
  const { reply, trace } = await processTurnWithWeather(newSession(), "what is the weather in atlantis?", {
    source: fixtureSource(),
    wikidataBank: oklahomaWikidataBank(),
  });
  assert.match(reply, /no coordinates for Atlantis/);
  assert.equal(trace.weather?.action, "coordinates-missing");
});
