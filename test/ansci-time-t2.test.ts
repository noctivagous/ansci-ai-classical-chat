/**
 * ansci-time-t2.test.ts — Scheduling (Time programme T2,
 * 2026-11-20; design: docs/ansci/time-scheduling-design-note.md
 * §3, §5.2, §5.3, slice §6-T2).
 *
 * The acceptance sketch, exercised: a weather reading banked
 * with a short TTL is refreshed by the opening sweep before
 * the stale-only decline can stand — the firing, the pricing
 * and the re-bank all in the trace; a lapsed registration
 * closes as lapsed in the catalogue's words. Around it: the
 * record's fields, the registrar-only rule, the stated
 * refusals, the condition trigger, the Planner's located
 * decline, and the driver contract's pure queries.
 * Fixture clocks and fixture sources only: no network, and
 * no assertion reads the machine's real clock.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { processTurnWithWeather } from "../src/ansci/weather-turn";
import {
  amendSchedule,
  cancelSchedule,
  closeFiredItem,
  declineDueItem,
  registerSchedule,
  sweepSchedule,
  triggerInstantISO,
  whatIsDue,
  whatIsOpen,
  type ScheduleSpec,
} from "../src/ansci/scheduling";
import { FixtureClockSource, turnTimeStanding } from "../src/ansci/timekeeping";
import { WeatherBank } from "../src/ansci/weather-bank";
import { PlaceRegister } from "../src/ansci/geography";
import { WikidataBank } from "../src/ansci/wikidata-bank";
import type { WeatherSource } from "../src/ansci/weather-client";
import type { NominatimSource } from "../src/ansci/geography-client";

const T0 = "2026-11-20T20:00:00.000Z";

function clockedSession(clock: FixtureClockSource): Session {
  return newSession(undefined, undefined, { clockSource: clock, clockRetrievedFrom: "fixture" });
}

function fixtureClock(instantISO: string): FixtureClockSource {
  const clock = new FixtureClockSource("fixture clock", "UTC");
  clock.set(instantISO);
  return clock;
}

/** The turn's best time standing, as Scheduling receives
 *  it: Timekeeping's standing, or undefined where neither
 *  a frame nor a clock stands. */
function standingOf(s: Session) {
  return turnTimeStanding(s)?.standing;
}

function mustRegister(
  s: Session,
  over: Partial<ScheduleSpec> = {},
): import("../src/ansci/scheduling").ScheduledItem {
  const result = registerSchedule(s, spec(over), standingOf(s));
  if (!result.ok) assert.fail(`registration refused: ${result.reason}`);
  return result.item;
}

function spec(over: Partial<ScheduleSpec> = {}): ScheduleSpec {
  return {
    owed: "a fresh reading of the test bank",
    trigger: { kind: "at", instantISO: "2026-11-20T21:00:00.000Z" },
    registeredBy: "the test unit",
    registrationExpiresISO: "2026-11-21T20:00:00.000Z",
    onDue: "re-consult the test bank",
    ...over,
  };
}

/* ---------------- the record ---------------- */

test("registration: the §3.1 record stands complete — owed, trigger, registrar, stamp on a named standing, expiry, on-due, placement fields", () => {
  const s = clockedSession(fixtureClock(T0));
  const result = registerSchedule(s, spec(), standingOf(s));
  assert.ok(result.ok);
  const item = result.item;
  assert.equal(item.owed, "a fresh reading of the test bank");
  assert.deepEqual(item.trigger, { kind: "at", instantISO: "2026-11-20T21:00:00.000Z" });
  assert.equal(item.registeredBy, "the test unit");
  assert.equal(item.registeredAtISO, T0, "the stamp is the standing's instant");
  assert.match(item.registeredAtStanding, /clock reading taken for the turn/, "the stamp names its standing");
  assert.match(item.registeredAtStanding, /fixture clock/, "and the clock it rode on");
  assert.equal(item.registrationExpiresISO, "2026-11-21T20:00:00.000Z");
  assert.equal(item.onDue, "re-consult the test bank");
  assert.equal(item.status, "standing");
  // The placement fields stand in the record, awaiting C3.
  assert.equal(item.calendarPlacement, undefined);
  assert.equal(item.timelinePlacement, undefined);
  assert.equal(s.schedule.length, 1);
});

test("registration: 'no expiry' without its reason is refused at the register, stated — with the reason it stands as a stated value", () => {
  const s = clockedSession(fixtureClock(T0));
  const refused = registerSchedule(
    s,
    spec({ registrationExpiresISO: "no-expiry" }),
    standingOf(s),
  );
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.match(refused.reason, /must state its reason/);
  assert.equal(s.schedule.length, 0, "a refused registration records nothing");
  const standing = registerSchedule(
    s,
    spec({ registrationExpiresISO: "no-expiry", noExpiryReason: "the test's standing watch, kept by the registrar" }),
    standingOf(s),
  );
  assert.ok(standing.ok);
  assert.equal(standing.item.registrationExpiresISO, "no-expiry");
  assert.equal(standing.item.noExpiryReason, "the test's standing watch, kept by the registrar");
});

test("registration: an 'after' trigger is anchored from the standing at registration; with no standing to anchor it, refused stated", () => {
  const s = clockedSession(fixtureClock(T0));
  const result = registerSchedule(
    s,
    spec({ trigger: { kind: "after", durationMs: 20 * 60_000 } }),
    standingOf(s),
  );
  assert.ok(result.ok);
  assert.equal(triggerInstantISO(result.item.trigger), "2026-11-20T20:20:00.000Z");
  const bare = newSession();
  const refused = registerSchedule(
    bare,
    spec({ trigger: { kind: "after", durationMs: 60_000 } }),
    standingOf(bare),
  );
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.match(refused.reason, /anchor/);
});

/* ---------------- the registrar-only rule ---------------- */

test("cancel and amend: only the registering unit — another unit is refused with the ground; the registrar's cancel closes stamped", () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  const item = mustRegister(s);
  const byOther = cancelSchedule(s, item.id, "some other unit", standingOf(s));
  assert.equal(byOther.ok, false);
  if (!byOther.ok) assert.match(byOther.reason, /only the registering unit/);
  const amended = amendSchedule(
    s,
    item.id,
    "the test unit",
    { onDue: "re-consult the test bank, twice" },
    standingOf(s),
  );
  assert.ok(amended.ok);
  assert.equal(item.onDue, "re-consult the test bank, twice");
  assert.equal(item.amendments.length, 1);
  const cancelled = cancelSchedule(s, item.id, "the test unit", standingOf(s));
  assert.ok(cancelled.ok);
  assert.equal(item.status, "cancelled");
  assert.equal(item.closedAtISO, T0);
  assert.match(item.closedHow ?? "", /cancelled by its registrar/);
});

/* ---------------- the sweep ---------------- */

test("sweep: a due item raises the demand stated at registration, on the trace of the turn whose opening takes it up", () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  registerSchedule(s, spec(), standingOf(s));
  // Not yet due: the sweep is silent.
  const early = processTurn(s, "the sky is blue.");
  assert.equal(early.trace.scheduleSweep, undefined);
  clock.set("2026-11-20T21:00:30.000Z");
  const due = processTurn(s, "the sky is blue.");
  assert.equal(due.trace.scheduleSweep?.length, 1);
  const outcome = due.trace.scheduleSweep![0];
  assert.equal(outcome.outcome, "due");
  assert.equal(outcome.demand, "re-consult the test bank");
  const item = s.schedule[0];
  assert.equal(item.status, "due-raised");
  assert.equal(item.dueAtISO, "2026-11-20T21:00:00.000Z", "the record says when it fell due");
  assert.ok(item.takenUpAtTurnCount !== undefined, "and the turn that took it up");
});

test("sweep: registration is not authorisation, and registering fires nothing — an item already past its trigger still waits for a sweep", () => {
  const clock = fixtureClock("2026-11-20T22:00:00.000Z");
  const s = clockedSession(clock);
  const result = registerSchedule(s, spec(), standingOf(s));
  assert.ok(result.ok);
  assert.equal(result.item.status, "standing", "registration alone raises no demand");
  const outcomes = sweepSchedule(s, standingOf(s));
  assert.equal(outcomes[0]?.outcome, "due", "the sweep — not the registration — is what raises it");
});

test("sweep: a registration whose own shelf life passes before its trigger closes lapsed, in the catalogue's words", () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  registerSchedule(
    s,
    spec({
      trigger: { kind: "at", instantISO: "2026-11-22T00:00:00.000Z" },
      registrationExpiresISO: "2026-11-21T00:00:00.000Z",
    }),
    standingOf(s),
  );
  clock.set("2026-11-21T00:00:30.000Z");
  const { trace } = processTurn(s, "the sky is blue.");
  const outcome = trace.scheduleSweep?.[0];
  assert.equal(outcome?.outcome, "lapsed");
  assert.match(outcome?.detail ?? "", /closes lapsed/);
  assert.match(outcome?.detail ?? "", /accounted, not vanished/);
  assert.equal(s.schedule[0].status, "lapsed");
  assert.match(s.schedule[0].closedHow ?? "", /registration expired unsatisfied/);
});

test("sweep: no standing, no pricing — the item is unpriceable at Timekeeping's missing reading, and stands", () => {
  const s = newSession();
  registerSchedule(s, spec(), standingOf(s));
  const outcomes = sweepSchedule(s, standingOf(s));
  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0].outcome, "unpriceable");
  assert.match(outcomes[0].detail, /no clock reading stands for this turn/);
  assert.equal(s.schedule[0].status, "standing", "unpriced is not fired, lapsed or lost");
});

test("sweep: a time+condition trigger — the named evaluator is asked; unassessed and unmet leave the item standing, holding fires it", () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  registerSchedule(
    s,
    spec({
      trigger: {
        kind: "at-and-condition",
        instantISO: "2026-11-20T20:30:00.000Z",
        condition: "the test bank reports a gap",
        evaluator: "the test unit",
      },
    }),
    standingOf(s),
  );
  clock.set("2026-11-20T20:31:00.000Z");
  const standing = standingOf(s);
  assert.equal(sweepSchedule(s, standing)[0]?.outcome, "condition-unassessed");
  assert.equal(sweepSchedule(s, standing, { conditionHolds: () => false })[0]?.outcome, "condition-unmet");
  assert.equal(s.schedule[0].status, "standing");
  assert.equal(sweepSchedule(s, standing, { conditionHolds: () => true })[0]?.outcome, "due");
  assert.equal(s.schedule[0].status, "due-raised");
});

test("the Planner's decline: a due item declined closes with the decline as its closing evidence; a standing item cannot be declined", () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  const item = mustRegister(s);
  const early = declineDueItem(s, item.id, "the ground has changed", standingOf(s));
  assert.equal(early.ok, false);
  clock.set("2026-11-20T21:00:30.000Z");
  sweepSchedule(s, standingOf(s));
  const declined = declineDueItem(s, item.id, "the conversation has moved past the matter", standingOf(s));
  assert.ok(declined.ok);
  assert.equal(item.status, "closed");
  assert.match(item.closedHow ?? "", /declined by the Planner/);
  assert.match(item.closedHow ?? "", /the conversation has moved past the matter/);
  assert.match(item.closedHow ?? "", /registered by the test unit/, "the decline names the registrar (§3.2)");
});

test("driver contract queries: whatIsDue and whatIsOpen answer without changing anything", () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  registerSchedule(s, spec(), standingOf(s));
  assert.equal(whatIsOpen(s).length, 1);
  assert.equal(whatIsDue(s, standingOf(s)).length, 0);
  clock.set("2026-11-20T21:00:30.000Z");
  assert.equal(whatIsDue(s, standingOf(s)).length, 1);
  assert.equal(s.schedule[0].status, "standing", "asking is not firing — the sweep is what raises demands");
  const fired = closeFiredItem(s, s.schedule[0].id, "fired and done", standingOf(s));
  assert.equal(fired.ok, false, "an item the sweep never raised cannot close as fired");
});

/* ---------------- the §5.2 chain: scheduled re-consultation ---------------- */

class CountingWeatherSource implements WeatherSource {
  calls = 0;
  fail = false;
  async currentConditions(
    latitude: number,
    longitude: number,
  ): Promise<import("../src/ansci/weather-client").WeatherLookupResult<import("../src/ansci/weather-client").WeatherObservation>> {
    this.calls++;
    if (this.fail) return { status: "unavailable", reason: "the fixture source is down" };
    return {
      status: "ok",
      data: {
        timeISO: "2026-11-20T19:55:00.000Z",
        temperatureC: 21,
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
  const source = new CountingWeatherSource();
  const bank = new WeatherBank();
  let nowISO = T0;
  const opts = {
    source,
    bank,
    wikidataBank: new WikidataBank(),
    placeRegister: register,
    geographySource: noGeography,
    now: () => new Date(nowISO),
    ttlMinutes: 1,
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

test("the §5.2 chain: a reading banked with a short TTL is refreshed by the sweep — firing, pricing and re-bank all in the trace", async () => {
  const { s, source, bank, opts, advance } = chainSetup();
  const first = await processTurnWithWeather(s, "what is the weather in oklahoma city?", opts);
  assert.match(first.reply, /In Oklahoma City, OK it is 21°C and clear\./);
  assert.equal(source.calls, 1);
  assert.equal(s.schedule.length, 1, "the banking registered its own refresh");
  const item = s.schedule[0];
  assert.equal(item.consumer?.kind, "weather-reconsult");
  assert.equal(item.status, "standing");
  assert.equal(item.registeredAtISO, T0);
  assert.deepEqual(item.trigger, { kind: "at", instantISO: "2026-11-20T20:01:00.000Z" }, "due at the reading's expiry");

  advance("2026-11-20T20:01:30.000Z");
  const second = await processTurnWithWeather(s, "the sky is blue.", opts);
  assert.ok(!/°C/.test(second.reply), "the re-consultation does not hijack the turn's own business");
  const outcome = second.trace.scheduleSweep?.[0];
  assert.ok(outcome, "the sweep's outcome rides the trace");
  assert.equal(outcome.outcome, "reconsulted", "the firing is in the trace");
  assert.match(outcome.pricing ?? "", /priced by the Planner and executed/, "the pricing is in the trace");
  assert.equal(outcome.rebanked?.fetchedAt, "2026-11-20T20:01:30.000Z", "the re-bank is in the trace");
  assert.equal(source.calls, 2, "the source was re-consulted exactly once");
  assert.equal(item.status, "closed");
  assert.match(item.closedHow ?? "", /fired and done/);
  const fresh = bank.fresh("oklahoma city", "2026-11-20T20:01:45.000Z");
  assert.ok(fresh, "the bank holds a fresh reading where the stale-only decline would have stood");
  assert.equal(fresh.fetchedAt, "2026-11-20T20:01:30.000Z");
  assert.equal(s.schedule.length, 2, "the refreshed reading registered its own refresh — the chain continues");
  assert.equal(s.schedule[1].status, "standing");
});

test("the §5.2 chain, second asking: a weather question at the due turn answers from the re-banked reading, with no second fetch", async () => {
  const { s, source, opts, advance } = chainSetup();
  await processTurnWithWeather(s, "what is the weather in oklahoma city?", opts);
  advance("2026-11-20T20:01:30.000Z");
  const second = await processTurnWithWeather(s, "what is the weather in oklahoma city?", opts);
  assert.match(second.reply, /In Oklahoma City, OK it is 21°C and clear\./);
  assert.equal(second.trace.weather?.action, "looked-up-and-banked");
  assert.match(second.trace.weather?.detail ?? "", /scheduled re-consultation re-banked/);
  assert.equal(source.calls, 2, "one lookup fetch and one re-consultation fetch — the answer itself fetched nothing");
});

test("the §5.3 re-check decline: the source down at the due sweep is a stated state on the item — the wait continues, nothing is dressed as satisfaction", async () => {
  const { s, source, bank, opts, advance } = chainSetup();
  await processTurnWithWeather(s, "what is the weather in oklahoma city?", opts);
  source.fail = true;
  advance("2026-11-20T20:01:30.000Z");
  const second = await processTurnWithWeather(s, "the sky is blue.", opts);
  const outcome = second.trace.scheduleSweep?.[0];
  assert.equal(outcome?.outcome, "reconsult-unavailable");
  const item = s.schedule[0];
  assert.equal(item.status, "due-raised", "the item stands due — unavailability ends nothing");
  assert.equal(item.events.length, 1);
  assert.match(item.events[0].detail, /unavailable weather source/);
  assert.equal(bank.fresh("oklahoma city", "2026-11-20T20:01:45.000Z"), undefined, "no fresh reading was banked");
  assert.ok(bank.peek("oklahoma city"), "the stale reading still stands in the bank, unserved and unhidden");
});
