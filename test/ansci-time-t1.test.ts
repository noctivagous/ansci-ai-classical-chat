/**
 * ansci-time-t1.test.ts — Timekeeping (Time programme T1,
 * 2026-11-20; design: docs/ansci/time-scheduling-design-note.md
 * §2, slice §6-T1).
 *
 * The acceptance sketch, exercised: frame-less "what is the
 * time?" with a wired clock answers from a cited reading;
 * with the clock source down, the standing decline, unchanged
 * in ground; staleness answers cited against both TTL'd
 * banks (weather, geography register) — and the Wikidata
 * bank answering "no shelf life stated", never "fresh".
 * Tests read fixture clocks only: no test reads the
 * machine's real clock for an assertion, and none touches
 * the network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import {
  ClockBank,
  FixtureClockSource,
  HostClockSource,
  askStaleness,
  compareStandings,
  consultClock,
  frameStanding,
  readingWarrantsTurn,
  staleByHorizon,
  turnTimeStanding,
} from "../src/ansci/timekeeping";
import { WeatherBank, type WeatherReading } from "../src/ansci/weather-bank";
import { PlaceRegister } from "../src/ansci/geography";
import { WikidataBank } from "../src/ansci/wikidata-bank";
import { parseWikidataEntities, translateWikidataItems } from "../src/ansci/wikidata";

const T0 = "2026-11-20T15:00:00.000Z";

function fixtureClock(instantISO: string): FixtureClockSource {
  const clock = new FixtureClockSource("fixture clock", "UTC");
  clock.set(instantISO);
  return clock;
}

function weatherReading(placeKey: string, fetchedAt: string, expiresAt: string): WeatherReading {
  return {
    placeKey,
    statedPlace: placeKey,
    resolvedName: "El Reno, OK",
    latitude: 35.5,
    longitude: -98,
    temperatureC: 21,
    condition: "partly cloudy",
    raining: false,
    snowing: false,
    observedAt: fetchedAt,
    fetchedAt,
    expiresAt,
    source: "api.weather.gov",
    retrievedFrom: "fixture",
  };
}

/* ---------------- the consultation operation ---------------- */

test("consultClock: a reading is a retrieved fact — instant, timezone, source record — and is banked", () => {
  const bank = new ClockBank();
  const got = consultClock(fixtureClock("2026-11-20T15:04:05.000Z"), { retrievedFrom: "fixture", bank, turn: 3 });
  assert.equal(got.status, "ok");
  if (got.status !== "ok") return;
  assert.equal(got.reading.instantISO, "2026-11-20T15:04:05.000Z");
  assert.equal(got.reading.timezone, "UTC");
  assert.equal(got.reading.source, "fixture clock");
  assert.equal(got.reading.provenance.kind, "retrieved");
  assert.deepEqual(got.reading.provenance.source, {
    dataset: "clock",
    baseVersion: "2026-11-20",
    uri: "fixture clock",
    retrievedFrom: "fixture",
  });
  assert.equal(bank.latest("fixture clock"), got.reading);
  assert.equal(readingWarrantsTurn(got.reading, 3), true);
  assert.equal(readingWarrantsTurn(got.reading, 4), false);
});

test("consultClock: an unavailable source is a stated state, and no reading is banked or invented", () => {
  const bank = new ClockBank();
  const clock = new FixtureClockSource("fixture clock", "UTC");
  clock.setUnavailable("the fixture clock is stopped");
  const got = consultClock(clock, { retrievedFrom: "fixture", bank });
  assert.deepEqual(got, { status: "unavailable", source: "fixture clock", reason: "the fixture clock is stopped" });
  assert.equal(bank.all().length, 0);
});

test("the host clock source reads ok and names a timezone (shape only — no assertion on the instant)", () => {
  const got = new HostClockSource().read();
  assert.equal(got.status, "ok");
  if (got.status === "ok") assert.ok(got.timezone.length > 0);
});

/* ---------------- the shapes' clock route ---------------- */

test("frame-less 'what is the time?' with a wired clock answers from the cited reading", () => {
  const s = newSession(undefined, undefined, {
    clockSource: fixtureClock("2026-11-20T15:04:05.000Z"),
    clockRetrievedFrom: "fixture",
  });
  const { reply, trace } = processTurn(s, "what is the time?");
  assert.equal(reply, "It is 3:04 PM.");
  assert.equal(trace.timeAnswer?.route, "clock");
  assert.equal(trace.timeAnswer?.clockReading?.instantISO, "2026-11-20T15:04:05.000Z");
  assert.equal(trace.timeAnswer?.clockReading?.source, "fixture clock");
  assert.equal(trace.timeAnswer?.clockReading?.retrievedFrom, "fixture");
  assert.equal(trace.declineReason, undefined);
});

test("frame-less 'what is the date?' with a wired clock answers the reading's date, year included", () => {
  const s = newSession(undefined, undefined, {
    clockSource: fixtureClock("2026-11-20T15:04:05.000Z"),
    clockRetrievedFrom: "fixture",
  });
  const { reply, trace } = processTurn(s, "what is the date?");
  assert.equal(reply, "The date is November 20, 2026.");
  assert.equal(trace.timeAnswer?.route, "clock");
});

test("with the clock source down, the standing decline stands — same reply, same ground, attempt recorded", () => {
  const clock = new FixtureClockSource("fixture clock", "UTC");
  clock.setUnavailable("the fixture clock is stopped");
  const s = newSession(undefined, undefined, { clockSource: clock, clockRetrievedFrom: "fixture" });
  const { reply, trace } = processTurn(s, "what is the time?");
  assert.equal(
    reply,
    "I can't answer that from what I know: this conversation has no clock reading — I wasn't given the time when we started.",
  );
  assert.match(trace.declineReason ?? "", /located at the missing clock reading/);
  assert.deepEqual(trace.timeAnswer?.clockAttempt, { source: "fixture clock", reason: "the fixture clock is stopped" });
});

test("frame-less and clock-unwired: the pre-T1 decline, exactly as Slice 5 left it", () => {
  const s = newSession();
  const { reply, trace } = processTurn(s, "what is the time?");
  assert.equal(
    reply,
    "I can't answer that from what I know: this conversation has no clock reading — I wasn't given the time when we started.",
  );
  assert.equal(trace.timeAnswer?.route, undefined);
  assert.equal(trace.timeAnswer?.clockAttempt, undefined);
});

test("where a frame reading stands, the frame route keeps precedence over a wired clock", () => {
  const s = newSession(undefined, { month: 11, day: 20, hour: 14 }, {
    clockSource: fixtureClock("2026-11-20T15:04:05.000Z"),
    clockRetrievedFrom: "fixture",
  });
  const { reply, trace } = processTurn(s, "what is the time?");
  assert.equal(reply, "It is about 2 PM.");
  assert.equal(trace.timeAnswer?.route, "frame");
});

test("a frame holding an hour but no calendar: the date ask consults the wired clock", () => {
  const s = newSession(undefined, { hour: 9 }, {
    clockSource: fixtureClock("2026-11-20T15:04:05.000Z"),
    clockRetrievedFrom: "fixture",
  });
  const { reply, trace } = processTurn(s, "what is the date?");
  assert.equal(reply, "The date is November 20, 2026.");
  assert.equal(trace.timeAnswer?.route, "clock");
});

/* ---------------- standings ---------------- */

test("frameStanding: an ISO-supplied year makes the frame's instant statable; without one, none is borrowed", () => {
  const withYear = newSession(undefined, { dateISO: "2026-11-20", hour: 14 });
  assert.equal(frameStanding(withYear)?.instantISO, "2026-11-20T14:00:00.000Z");
  const noYear = newSession(undefined, { month: 11, day: 20, hour: 14 });
  const standing = frameStanding(noYear);
  assert.equal(standing?.kind, "frame");
  assert.equal(standing?.instantISO, undefined);
  assert.match(standing?.detail ?? "", /no year/);
});

test("compareStandings: a disagreement is stated, an agreement is silent", () => {
  const s = newSession(undefined, { month: 11, day: 20, hour: 14 });
  const bank = new ClockBank();
  const disagree = consultClock(fixtureClock("2026-11-20T15:04:05.000Z"), { retrievedFrom: "fixture", bank });
  assert.equal(disagree.status, "ok");
  if (disagree.status === "ok") assert.match(compareStandings(s, disagree.reading) ?? "", /disagree/);
  const agree = consultClock(fixtureClock("2026-11-20T14:30:00.000Z"), { retrievedFrom: "fixture", bank });
  assert.equal(agree.status, "ok");
  if (agree.status === "ok") assert.equal(compareStandings(s, agree.reading), undefined);
});

test("turnTimeStanding: a wired clock supplies the standing; the reading taken is stamped with the turn", () => {
  const s = newSession(undefined, undefined, {
    clockSource: fixtureClock(T0),
    clockRetrievedFrom: "fixture",
  });
  const got = turnTimeStanding(s);
  assert.equal(got?.standing.kind, "clock");
  assert.equal(got?.standing.instantISO, T0);
  assert.equal(got?.reading?.takenAtTurn, 1);
});

/* ---------------- staleness, asked uniformly ---------------- */

test("staleness over the weather bank: fresh with time left, stale with overdue, absent", () => {
  const bank = new WeatherBank();
  bank.put(weatherReading("tulsa", "2026-11-20T15:00:00.000Z", "2026-11-20T15:30:00.000Z"));
  const fresh = askStaleness({ bank: "weather", place: "Tulsa" }, "2026-11-20T15:10:00.000Z", { weather: bank });
  assert.equal(fresh.verdict.state, "fresh");
  if (fresh.verdict.state === "fresh") assert.equal(fresh.verdict.remainingMs, 20 * 60_000);
  const stale = askStaleness({ bank: "weather", place: "tulsa" }, "2026-11-20T15:31:00.000Z", { weather: bank });
  assert.equal(stale.verdict.state, "stale");
  if (stale.verdict.state === "stale") assert.equal(stale.verdict.overdueMs, 60_000);
  const absent = askStaleness({ bank: "weather", place: "nowhere" }, T0, { weather: bank });
  assert.equal(absent.verdict.state, "absent");
});

test("staleness over the geography register: coordinates fresh, then stale past the 12-month shelf life", () => {
  const register = new PlaceRegister();
  register.bankPlace({
    name: "Tulsa",
    coordinates: { lat: 36.15, lon: -95.99, standsFor: "Tulsa, OK" },
    provenance: { kind: "retrieved", dataset: "openstreetmap-nominatim", baseVersion: "2026-11-20", retrievedFrom: "fixture", confidence: 0.9, detail: "fixture" },
    fetchedAt: "2026-11-20T15:00:00.000Z",
  });
  const fresh = askStaleness({ bank: "geography-coordinates", name: "tulsa" }, "2026-12-01T00:00:00.000Z", { register });
  assert.equal(fresh.verdict.state, "fresh");
  const stale = askStaleness({ bank: "geography-coordinates", name: "tulsa" }, "2027-12-01T00:00:00.000Z", { register });
  assert.equal(stale.verdict.state, "stale");
  const absent = askStaleness({ bank: "geography-coordinates", name: "nowhere" }, T0, { register });
  assert.equal(absent.verdict.state, "absent");
});

function fixturesDir(): string {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "test", "fixtures");
    if (fs.existsSync(path.join(candidate, "wikidata", "oklahoma-wbgetentities.json"))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(__dirname, "fixtures");
}

test("staleness over the Wikidata bank: 'no shelf life stated' for a standing node — never 'fresh'", () => {
  const dir = path.join(fixturesDir(), "wikidata");
  const bank = new WikidataBank();
  const items = parseWikidataEntities(JSON.parse(fs.readFileSync(path.join(dir, "oklahoma-wbgetentities.json"), "utf-8")));
  bank.bankTranslation(translateWikidataItems(items, { fetchDate: "2026-11-19", retrievedFrom: "fixture" }));
  const held = askStaleness({ bank: "wikidata", name: "oklahoma" }, T0, { wikidata: bank });
  assert.equal(held.verdict.state, "no-shelf-life-stated");
  assert.match(held.shelfLife, /no shelf life/);
  const absent = askStaleness({ bank: "wikidata", name: "atlantis" }, T0, { wikidata: bank });
  assert.equal(absent.verdict.state, "absent");
});

test("staleByHorizon: what goes stale by a stated moment, in expiry order", () => {
  const bank = new WeatherBank();
  bank.put(weatherReading("tulsa", "2026-11-20T15:00:00.000Z", "2026-11-20T15:30:00.000Z"));
  bank.put(weatherReading("norman", "2026-11-20T15:00:00.000Z", "2026-11-20T16:30:00.000Z"));
  bank.put(weatherReading("stale already", "2026-11-20T14:00:00.000Z", "2026-11-20T14:30:00.000Z"));
  const going = staleByHorizon(T0, "2026-11-20T16:00:00.000Z", bank);
  assert.deepEqual(going, [{ bank: "weather", key: "tulsa", expiresAt: "2026-11-20T15:30:00.000Z" }]);
});
