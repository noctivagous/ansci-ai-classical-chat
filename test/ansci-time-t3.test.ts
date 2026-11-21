/**
 * ansci-time-t3.test.ts — Expectation (Time programme T3,
 * 2026-11-20; design: docs/ansci/time-scheduling-design-note.md
 * §4, §5.1, slice §6-T3).
 *
 * The acceptance sketch, exercised: §5.1's weather chain as
 * the walk — the satisfied ending and the timeout ending
 * both exercised, both filings landing in the problem
 * record's closing evidence. Around it: §4.3's eligibility
 * test (all four need kinds), the hand-off's one reference,
 * §4.4's gates (a refusal satisfies nothing), §4.5's two
 * standings, and §4.6's timeout as information.
 * Fixture clocks and fixture sources only.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { processTurnWithWeather } from "../src/ansci/weather-turn";
import {
  bankedWeatherReading,
  cancelExpectation,
  deliverArrival,
  expectationEligibility,
  noteWeatherReadingBanked,
  offerSatisfier,
  registerExpectation,
  sweepExpectations,
  type ExpectationSpec,
} from "../src/ansci/expectation";
import { openProblem, type ProblemRecord } from "../src/ansci/problem-records";
import { FixtureClockSource, turnTimeStanding } from "../src/ansci/timekeeping";
import { WeatherBank, type WeatherReading } from "../src/ansci/weather-bank";
import { PlaceRegister } from "../src/ansci/geography";
import { WikidataBank } from "../src/ansci/wikidata-bank";
import type { WeatherSource } from "../src/ansci/weather-client";
import type { NominatimSource } from "../src/ansci/geography-client";

const T0 = "2026-11-20T20:00:00.000Z";

function fixtureClock(instantISO: string): FixtureClockSource {
  const clock = new FixtureClockSource("fixture clock", "UTC");
  clock.set(instantISO);
  return clock;
}

function clockedSession(clock: FixtureClockSource): Session {
  return newSession(undefined, undefined, { clockSource: clock, clockRetrievedFrom: "fixture" });
}

function standingOf(s: Session) {
  return turnTimeStanding(s)?.standing;
}

function openLack(s: Session, over: Partial<Parameters<typeof openProblem>[1]> = {}): ProblemRecord {
  return openProblem(s, {
    seat: "internal",
    bearer: "system",
    subject: "the coordinates of Tulsa",
    need: "lack-of-information",
    ground: "assessed",
    turn: s.turnCount,
    reason: "opened for the expectation tests",
    ...over,
  });
}

function expSpec(problemId: string, over: Partial<ExpectationSpec> = {}): ExpectationSpec {
  return {
    problemId,
    satisfier: { kind: "fact", fact: "weather-reading", placeName: "Tulsa" },
    satisfierStatement: "a current weather reading for Tulsa",
    expectedFrom: "the geography consultation chain and the weather source",
    deadlineISO: "2026-11-20T20:30:00.000Z",
    onSatisfaction: "answer the waiting weather question for Tulsa",
    onTimeout: "raise the timeout for the Tulsa wait",
    registeredBy: "the test unit",
    ...over,
  };
}

function mustRegisterExpectation(s: Session, spec: ExpectationSpec) {
  const result = registerExpectation(s, spec, standingOf(s));
  if (!result.ok) assert.fail(`expectation refused: ${result.reason}`);
  return result.expectation;
}

/* ---------------- eligibility (§4.3) ---------------- */

test("eligibility: the one test, over all four need kinds — lack-of-information yes, interlocutor-owed quantification yes, capability and how-to-proceed no", () => {
  const s = clockedSession(fixtureClock(T0));
  assert.ok(expectationEligibility(openLack(s)).eligible);
  const owed = openLack(s, { need: "quantification", bearer: "user", subject: "the visitor's stated count" });
  assert.ok(expectationEligibility(owed).eligible, "a value owed by the interlocutor can arrive from the world");
  const notOwed = openLack(s, { need: "quantification", bearer: "system", subject: "a count the system must compute" });
  assert.equal(expectationEligibility(notOwed).eligible, false);
  const capability = openLack(s, { need: "capability", capability: "teleportation", subject: "a means" });
  const capVerdict = expectationEligibility(capability);
  assert.equal(capVerdict.eligible, false);
  if (!capVerdict.eligible) assert.match(capVerdict.ground, /does not build a seat/);
  const how = openLack(s, { need: "how-to-proceed", subject: "how to proceed" });
  const howVerdict = expectationEligibility(how);
  assert.equal(howVerdict.eligible, false);
  if (!howVerdict.eligible) assert.match(howVerdict.ground, /nothing external satisfies it/);
});

test("registration: the hand-off — the problem record gains the one reference, and its need, ground and status are untouched", () => {
  const s = clockedSession(fixtureClock(T0));
  const problem = openLack(s);
  const expectation = mustRegisterExpectation(s, expSpec(problem.id));
  assert.equal(problem.expectationId, expectation.id, "the join is a reference, auditable both ways");
  assert.equal(expectation.problemId, problem.id);
  assert.equal(problem.status, "open", "registering does not un-decline or re-open anything (§4.3)");
  assert.equal(expectation.status, "open");
  assert.equal(expectation.deadlineISO, "2026-11-20T20:30:00.000Z");
  assert.equal(expectation.registeredAtISO, T0);
  // A second watch over the same account is refused.
  const again = registerExpectation(s, expSpec(problem.id), standingOf(s));
  assert.equal(again.ok, false);
});

test("registration refusals, stated: no deadline, an ineligible need, a closed account, no account", () => {
  const s = clockedSession(fixtureClock(T0));
  const problem = openLack(s);
  const noDeadline = registerExpectation(s, expSpec(problem.id, { deadlineISO: "" }), standingOf(s));
  assert.equal(noDeadline.ok, false);
  if (!noDeadline.ok) assert.match(noDeadline.reason, /without a deadline is not registered/);
  const capability = openLack(s, { need: "capability", capability: "teleportation" });
  assert.equal(registerExpectation(s, expSpec(capability.id), standingOf(s)).ok, false);
  assert.equal(registerExpectation(s, expSpec("problem-999"), standingOf(s)).ok, false);
});

/* ---------------- satisfaction and the gates (§4.4) ---------------- */

test("an offer the gates refuse satisfies nothing: the refusal is an event on the record, and the expectation stands", () => {
  const s = clockedSession(fixtureClock(T0));
  const problem = openLack(s);
  const expectation = mustRegisterExpectation(s, expSpec(problem.id));
  const refused = offerSatisfier(
    s,
    expectation.id,
    {
      route: "consultation",
      detail: "a reading-shaped payload with no source record",
      gates: { passed: false, ground: "no SourceRecord stands under it" },
    },
    standingOf(s),
  );
  assert.equal(refused.ok, false);
  assert.equal(expectation.status, "open");
  assert.equal(expectation.events.length, 1);
  assert.match(expectation.events[0].detail, /refused at the gates/);
  assert.equal(problem.status, "open", "nothing was filed; nothing entered because it was waited for");
  assert.equal(problem.closingEvidence, undefined);
});

test("an offer the gates pass closes the expectation satisfied and files its evidence into the problem record, which closes with it", () => {
  const s = clockedSession(fixtureClock(T0));
  const problem = openLack(s);
  const expectation = mustRegisterExpectation(s, expSpec(problem.id));
  const offered = offerSatisfier(
    s,
    expectation.id,
    {
      route: "consultation",
      detail: "the Tulsa reading, banked with its retrieved provenance",
      gates: { passed: true, ground: "banked with its SourceRecord at the retrieved confidence" },
    },
    standingOf(s),
  );
  assert.ok(offered.ok);
  assert.equal(offered.demand, "answer the waiting weather question for Tulsa", "the on-satisfaction demand stated at registration");
  assert.equal(expectation.status, "satisfied");
  assert.match(expectation.satisfactionRoute ?? "", /consultation result/);
  assert.equal(problem.status, "closed", "the problem record closes with the filing (§4.3)");
  assert.match(problem.closingEvidence ?? "", /satisfied: a current weather reading for Tulsa arrived/);
});

test("driver-delivered arrival: the second standing — delivery is not admission, and the record names the driver's watching", () => {
  const s = clockedSession(fixtureClock(T0));
  const problem = openLack(s);
  const expectation = mustRegisterExpectation(s, expSpec(problem.id));
  const refused = deliverArrival(
    s,
    expectation.id,
    { source: "the test driver", detail: "an unprovenanced payload", gates: { passed: false, ground: "no provenance" } },
    standingOf(s),
  );
  assert.equal(refused.ok, false, "a driver may deliver; it may not admit");
  const delivered = deliverArrival(
    s,
    expectation.id,
    { source: "the test driver", detail: "the Tulsa reading", gates: { passed: true, ground: "banked with provenance by the receiving consultation" } },
    standingOf(s),
  );
  assert.ok(delivered.ok);
  assert.match(expectation.satisfactionRoute ?? "", /driver-delivered arrival/);
  assert.match(expectation.satisfactionRoute ?? "", /the watching was the driver's/);
});

test("cancel: only the registering unit — a recorded end, never a silent one", () => {
  const s = clockedSession(fixtureClock(T0));
  const problem = openLack(s);
  const expectation = mustRegisterExpectation(s, expSpec(problem.id));
  assert.equal(cancelExpectation(s, expectation.id, "another unit", standingOf(s)).ok, false);
  const cancelled = cancelExpectation(s, expectation.id, "the test unit", standingOf(s));
  assert.ok(cancelled.ok);
  assert.equal(expectation.status, "cancelled");
  assert.match(expectation.closedHow ?? "", /cancelled by its registering unit/);
});

/* ---------------- the sweep: satisfaction and timeout (§4.5, §4.6) ---------------- */

function tulsaReading(fetchedAt: string): WeatherReading {
  return {
    placeKey: "tulsa",
    statedPlace: "Tulsa",
    resolvedName: "Tulsa, OK",
    latitude: 36.15,
    longitude: -95.99,
    temperatureC: 18,
    condition: "clear",
    raining: false,
    snowing: false,
    observedAt: fetchedAt,
    fetchedAt,
    expiresAt: new Date(Date.parse(fetchedAt) + 30 * 60_000).toISOString(),
    source: "api.weather.gov",
    retrievedFrom: "fixture",
  };
}

test("sweep satisfaction: a reading banked by an intervening turn, still fresh, closes the expectation at the next opening — no new consultation", () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  const problem = openLack(s);
  const expectation = mustRegisterExpectation(s, expSpec(problem.id));
  const bank = new WeatherBank();
  bank.put(tulsaReading("2026-11-20T20:10:00.000Z"));
  clock.set("2026-11-20T20:12:00.000Z");
  const outcomes = sweepExpectations(s, standingOf(s), {
    bankedFact: bankedWeatherReading(bank, "2026-11-20T20:12:00.000Z"),
  });
  assert.equal(outcomes[0]?.outcome, "satisfied");
  assert.match(outcomes[0]?.route ?? "", /re-check at an opening sweep/);
  assert.equal(expectation.status, "satisfied");
  assert.equal(problem.status, "closed");
  assert.match(problem.closingEvidence ?? "", /banked weather reading for Tulsa/);
});

test("sweep timeout: past the deadline unsatisfied, the timeout is raised as information and filed — the problem record stands with it as evidence", () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  const problem = openLack(s);
  const expectation = mustRegisterExpectation(s, expSpec(problem.id));
  clock.set("2026-11-20T20:31:00.000Z");
  const { trace } = processTurn(s, "the sky is blue.");
  const outcome = trace.expectationSweep?.[0];
  assert.equal(outcome?.outcome, "timed-out");
  assert.equal(outcome?.demand, "raise the timeout for the Tulsa wait");
  assert.match(outcome?.detail ?? "", /what was waited for, from whom, until when/);
  assert.equal(expectation.status, "timed-out");
  assert.equal(problem.status, "open", "the need reverts to a standing lack (§4.6)");
  assert.match(problem.closingEvidence ?? "", /the expectation timed out/);
  assert.match(problem.closingEvidence ?? "", /did not come/);
});

test("a late arrival does not satisfy: banked after the deadline, the reading is recorded as late and the timeout stands as the verdict", () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  const problem = openLack(s);
  const expectation = mustRegisterExpectation(s, expSpec(problem.id));
  const outcomes = noteWeatherReadingBanked(s, tulsaReading("2026-11-20T20:45:00.000Z"), standingOf(s));
  assert.equal(outcomes.length, 0, "no satisfaction was noticed");
  assert.equal(expectation.status, "open");
  assert.equal(expectation.events.length, 1);
  assert.match(expectation.events[0].detail, /a late arrival, not a satisfaction/);
});

/* ---------------- §5.1's chain, through the wrapper ---------------- */

class FlippableWeatherSource implements WeatherSource {
  calls = 0;
  down = true;
  async currentConditions(
    latitude: number,
    longitude: number,
  ): Promise<import("../src/ansci/weather-client").WeatherLookupResult<import("../src/ansci/weather-client").WeatherObservation>> {
    this.calls++;
    if (this.down) return { status: "unavailable", reason: "the fixture source is down" };
    return {
      status: "ok",
      data: {
        timeISO: "2026-11-20T19:55:00.000Z",
        temperatureC: 18,
        conditionText: "Clear",
        stationId: "KOKC",
        resolvedName: "Oklahoma City, OK",
        latitude,
        longitude,
      },
    };
  }
}

const noGeography: NominatimSource = {
  search: async () => ({ status: "unavailable", reason: "the test consults no geocoder — the register holds the point" }),
  reverse: async () => ({ status: "unavailable", reason: "the test consults no geocoder" }),
};

function chainSetup() {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  const register = new PlaceRegister();
  register.bankPlace({
    name: "Oklahoma City",
    coordinates: { lat: 35.473, lon: -97.5171, standsFor: "Oklahoma City" },
    provenance: { kind: "configured", detail: "the test's configured point" },
    fetchedAt: T0,
  });
  const source = new FlippableWeatherSource();
  const bank = new WeatherBank();
  let nowISO = T0;
  const opts = {
    source,
    bank,
    wikidataBank: new WikidataBank(),
    placeRegister: register,
    geographySource: noGeography,
    now: () => new Date(nowISO),
    ttlMinutes: 30,
    retrievedFrom: "fixture",
  };
  return {
    s,
    source,
    bank,
    opts,
    advance(iso: string) {
      nowISO = iso;
      clock.set(iso);
    },
  };
}

test("§5.1 satisfied ending: the decline keeps the question open; the re-check fires, the reading banks, the expectation closes satisfied and the problem record closes with its evidence", async () => {
  const { s, source, opts, advance } = chainSetup();
  const first = await processTurnWithWeather(s, "what is the weather in oklahoma city?", opts);
  assert.equal(first.trace.weather?.action, "lookup-unavailable");
  assert.match(first.reply, /I am keeping this question open and will check again\./, "§5.1 step 2: told the gap, and that the question is kept open");
  assert.equal(s.expectations.length, 1, "the expectation was registered over the decline");
  const expectation = s.expectations[0];
  assert.equal(expectation.status, "open");
  const problem = s.problems.find((p) => p.id === expectation.problemId);
  assert.ok(problem, "the account of the need stands");
  assert.equal(problem.expectationId, expectation.id);
  assert.equal(s.schedule.length, 1, "the scheduled re-check stands alongside (§5.1 step 3)");
  assert.equal(s.schedule[0].consumer?.kind, "weather-reconsult");

  source.down = false;
  advance("2026-11-20T20:05:00.000Z");
  const second = await processTurnWithWeather(s, "what is the weather in oklahoma city?", opts);
  assert.match(second.reply, /In Oklahoma City, OK it is 18°C and clear\./, "the visitor is answered from the banked reading (§5.1 step 6)");
  assert.equal(expectation.status, "satisfied");
  assert.match(expectation.satisfactionRoute ?? "", /re-check standing/);
  assert.equal(problem.status, "closed", "the problem record closes with the filing");
  assert.match(problem.closingEvidence ?? "", /satisfied by the re-consultation's banking/);
  const noticed = second.trace.expectationSweep?.find((o) => o.expectationId === expectation.id);
  assert.equal(noticed?.outcome, "satisfied", "the satisfaction rides the turn's trace");
});

test("§5.1 timeout ending: the source down at every re-check — the deadline passes, the timeout is filed, the problem record stands open, and the re-check lapses with it", async () => {
  const { s, source, opts, advance } = chainSetup();
  await processTurnWithWeather(s, "what is the weather in oklahoma city?", opts);
  const expectation = s.expectations[0];
  const problem = s.problems.find((p) => p.id === expectation.problemId)!;
  assert.equal(expectation.deadlineISO, "2026-11-20T20:30:00.000Z");

  advance("2026-11-20T20:10:00.000Z");
  const second = await processTurnWithWeather(s, "the sky is blue.", opts);
  const recheck = second.trace.scheduleSweep?.[0];
  assert.equal(recheck?.outcome, "reconsult-unavailable", "the re-check fired and met the down source — a stated state, not a satisfaction");
  assert.equal(expectation.status, "open", "the wait continues");

  advance("2026-11-20T20:31:00.000Z");
  const third = await processTurnWithWeather(s, "the sky is blue.", opts);
  const timeout = third.trace.expectationSweep?.[0];
  assert.equal(timeout?.outcome, "timed-out");
  assert.equal(expectation.status, "timed-out");
  assert.equal(problem.status, "declined-priced", "the account stands as it stood — the need is still the system's lack");
  assert.match(problem.closingEvidence ?? "", /the expectation timed out/);
  const lapsed = third.trace.scheduleSweep?.find((o) => o.outcome === "lapsed");
  assert.ok(lapsed, "the re-check, its registration expiry reached, lapses with the expectation (§5.1 step 7)");
  assert.equal(source.calls, 2, "the source was consulted at the ask and at the one re-check the wait's span allowed");
});
