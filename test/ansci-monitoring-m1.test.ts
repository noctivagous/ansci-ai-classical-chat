/**
 * ansci-monitoring-m1.test.ts — Monitoring M1 (Monitoring
 * programme, 2026-11-21; design:
 * docs/ansci/monitoring-design-note.md §2, §3, §5, §7.2, §8).
 *
 * The acceptance sketch, exercised (§7.2): a weather
 * reading banked with a short TTL under a staleness
 * monitor fires its refresh demand before an asking meets
 * the stale-only decline — the firing, the proposed
 * refresh, and the re-bank all in the trace and the
 * record; the monitor's history shows every check, fired
 * and unfired; a rule naming content the bank's facts do
 * not carry is refused at registration, in the catalogue's
 * words. Around it: the record's fields, the located
 * refusals, the registrar-only rule, supersession, the
 * margin rule, the class form, the silence discipline,
 * the declined-checks heartbeat (once), and the expiry
 * ending. Fixture clocks and fixture sources only: no
 * network, and no assertion reads the machine's real
 * clock.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/ansci/session";
import { processTurnWithMonitoring } from "../src/ansci/monitoring-turn";
import {
  cancelMonitor,
  registerMonitor,
  supersedeMonitor,
  type MonitorSpec,
} from "../src/ansci/monitoring";
import { FixtureClockSource, turnTimeStanding } from "../src/ansci/timekeeping";
import { WeatherBank, type WeatherReading } from "../src/ansci/weather-bank";
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

function standingOf(s: Session) {
  return turnTimeStanding(s)?.standing;
}

class CountingWeatherSource implements WeatherSource {
  calls = 0;
  async currentConditions(
    latitude: number,
    longitude: number,
  ): Promise<import("../src/ansci/weather-client").WeatherLookupResult<import("../src/ansci/weather-client").WeatherObservation>> {
    this.calls++;
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

function spec(over: Partial<MonitorSpec> = {}): MonitorSpec {
  return {
    subject: { kind: "bank-staleness-fact", ref: { bank: "weather", place: "Oklahoma City" } },
    interval: { periodMs: 60_000, anchor: { kind: "registration" } },
    changeRules: [{ kind: "passes-shelf-life" }],
    registrar: "the weather wrapper",
    expiry: { kind: "at", instantISO: "2026-11-20T23:00:00.000Z" },
    ...over,
  };
}

function mustRegister(s: Session, over: Partial<MonitorSpec> = {}) {
  const result = registerMonitor(s, spec(over), standingOf(s));
  if (!result.ok) assert.fail(`registration refused: ${result.reason}`);
  return result.monitor;
}

function reading(place: string, fetchedAtISO: string, ttlMinutes: number): WeatherReading {
  return {
    placeKey: place.toLowerCase(),
    statedPlace: place,
    resolvedName: `${place}, OK`,
    latitude: 35.473,
    longitude: -97.5171,
    temperatureC: 21,
    condition: "clear",
    raining: false,
    snowing: false,
    observedAt: fetchedAtISO,
    fetchedAt: fetchedAtISO,
    expiresAt: new Date(Date.parse(fetchedAtISO) + ttlMinutes * 60_000).toISOString(),
    source: "api.weather.gov",
    retrievedFrom: "fixture",
  };
}

/* ---------------- the record ---------------- */

test("registration: the §2.2 record stands complete — subject and source, interval with its anchor, rule, registrar, expiry, standing, and the first check on the schedule", () => {
  const s = clockedSession(fixtureClock(T0));
  const monitor = mustRegister(s);
  assert.equal(monitor.id, "monitor-1");
  assert.match(monitor.subjectStatement, /weather bank's reading for Oklahoma City/);
  assert.match(monitor.subjectStatement, /fact form/, "the registration states the form (§7.2.3)");
  assert.equal(monitor.interval.periodMs, 60_000);
  assert.equal(monitor.interval.anchor.kind, "registration");
  assert.deepEqual(monitor.changeRules, [{ kind: "passes-shelf-life" }]);
  assert.equal(monitor.registrar, "the weather wrapper");
  assert.deepEqual(monitor.expiry, { kind: "at", instantISO: "2026-11-20T23:00:00.000Z" });
  assert.equal(monitor.standing, "turn-boundary", "the standing is recorded, never inferred");
  assert.equal(monitor.registeredAtISO, T0);
  assert.equal(monitor.status, "standing");
  assert.equal(monitor.lastReading, undefined, "no reading yet — and the record says so by the field's absence");
  assert.equal(monitor.history.length, 1);
  assert.equal(monitor.history[0].outcome, "registered");
  assert.match(monitor.history[0].detail, /between turns nothing is watched/);
  const item = s.schedule.find((i) => i.id === monitor.nextCheckItemId);
  assert.ok(item, "the first check is placed on the schedule (§3.3)");
  assert.deepEqual(item.consumer, { kind: "monitor-check", monitorId: "monitor-1" });
  assert.equal(item.registeredBy, "the Monitoring Unit");
  assert.equal(item.trigger.kind, "at");
  if (item.trigger.kind === "at") assert.equal(item.trigger.instantISO, "2026-11-20T20:01:00.000Z");
});

/* ---------------- the located refusals (§8) ---------------- */

test("registration refusals: no rule, no monitor — and the rule/subject mismatches, each at its location", () => {
  const s = clockedSession(fixtureClock(T0));
  const noRule = registerMonitor(s, spec({ changeRules: [] }), standingOf(s));
  assert.equal(noRule.ok, false);
  if (!noRule.ok) {
    assert.match(noRule.reason, /at the change rule/);
    assert.match(noRule.reason, /not a monitor/);
  }
  const contentOverBank = registerMonitor(
    s,
    spec({ changeRules: [{ kind: "condition-word-differs" }] }),
    standingOf(s),
  );
  assert.equal(contentOverBank.ok, false);
  if (!contentOverBank.ok) assert.match(contentOverBank.reason, /at the change rule/);
  const unavailableOverBank = registerMonitor(
    s,
    spec({ changeRules: [{ kind: "unavailable-successive", count: 3 }] }),
    standingOf(s),
  );
  assert.equal(unavailableOverBank.ok, false);
  const badMargin = registerMonitor(
    s,
    spec({ changeRules: [{ kind: "stale-within-margin", marginMs: 0 }] }),
    standingOf(s),
  );
  assert.equal(badMargin.ok, false);
  if (!badMargin.ok) assert.match(badMargin.reason, /at the change rule/);
  assert.equal(s.monitors.length, 0, "a refused registration records nothing");
});

test("registration refusal: a staleness rule over a Wikidata holding — the bank states no shelf life, and the registration says which (§3.1)", () => {
  const s = clockedSession(fixtureClock(T0));
  const result = registerMonitor(
    s,
    spec({ subject: { kind: "bank-staleness-fact", ref: { bank: "wikidata", name: "Oklahoma" } } }),
    standingOf(s),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /at the change rule/);
    assert.match(result.reason, /no shelf life/);
  }
});

test("registration refusal: a consultation subject with no consultable source standing behind it (§2.2)", () => {
  /* This test has tracked the wiring slice by slice: in
   * M1 both consultation subjects stood refused here; M2
   * wired the weather chain, M3 the what's-there
   * consultation, and each lifted its refusal (their
   * registrations are exercised in the M2/M3 tests). What
   * keeps the refusal, in the same §2.2 words, is a
   * what's-there category outside the consultation's
   * bounded table: no consultable source stands behind
   * it, because the client takes categories from the
   * table, never a raw query. */
  const s = clockedSession(fixtureClock(T0));
  const result = registerMonitor(
    s,
    spec({
      subject: { kind: "whats-there", placeName: "Oklahoma City", categoryKey: "airport" },
      changeRules: [{ kind: "reading-arrives" }],
    }),
    standingOf(s),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /at the subject/);
    assert.match(result.reason, /no consultable source stands behind/);
  }
});

test("registration refusals: the expiry — omitted, 'no expiry' without its reason, and born ended; with the reason, 'no expiry' stands as a value", () => {
  const s = clockedSession(fixtureClock(T0));
  const omitted = registerMonitor(s, spec({ expiry: undefined }), standingOf(s));
  assert.equal(omitted.ok, false);
  if (!omitted.ok) assert.match(omitted.reason, /at the expiry/);
  const noReason = registerMonitor(s, spec({ expiry: { kind: "no-expiry", reason: "" } }), standingOf(s));
  assert.equal(noReason.ok, false);
  if (!noReason.ok) assert.match(noReason.reason, /must state its reason/);
  const bornEnded = registerMonitor(
    s,
    spec({ expiry: { kind: "at", instantISO: "2026-11-20T19:00:00.000Z" } }),
    standingOf(s),
  );
  assert.equal(bornEnded.ok, false);
  const stated = registerMonitor(
    s,
    spec({ expiry: { kind: "no-expiry", reason: "the test's standing watch, kept by the registrar" } }),
    standingOf(s),
  );
  assert.ok(stated.ok);
  assert.deepEqual(stated.monitor.expiry, {
    kind: "no-expiry",
    reason: "the test's standing watch, kept by the registrar",
  });
});

test("registration refusals: the standing and the interval — driver-delivered, no instant to anchor to, and below the waking floor (restated when the registrar accepts)", () => {
  const s = clockedSession(fixtureClock(T0));
  const driver = registerMonitor(s, spec({ standing: "driver-delivered" }), standingOf(s));
  assert.equal(driver.ok, false);
  if (!driver.ok) {
    assert.match(driver.reason, /at the standing/);
    assert.match(driver.reason, /no host driver stands/);
  }
  const bare = newSession();
  const unanchored = registerMonitor(bare, spec(), undefined);
  assert.equal(unanchored.ok, false);
  if (!unanchored.ok) assert.match(unanchored.reason, /at the standing/);
  const belowFloor = registerMonitor(s, spec({ interval: { periodMs: 5_000, anchor: { kind: "registration" } } }), standingOf(s));
  assert.equal(belowFloor.ok, false);
  if (!belowFloor.ok) {
    assert.match(belowFloor.reason, /at the interval/);
    assert.match(belowFloor.reason, /waking floor/);
  }
  const restated = registerMonitor(
    s,
    spec({ interval: { periodMs: 5_000, anchor: { kind: "registration" } }, acceptFloorRestatement: true }),
    standingOf(s),
  );
  assert.ok(restated.ok);
  assert.match(restated.monitor.interval.restatedAsEveryTurn ?? "", /check at every turn/);
});

/* ---------------- the registrar-only rule and the endings (§2.4) ---------------- */

test("cancel and supersede: only the registering unit — another unit is refused with the ground; supersession names the successor and never edits in place", () => {
  const s = clockedSession(fixtureClock(T0));
  const monitor = mustRegister(s);
  const byOther = cancelMonitor(s, monitor.id, "some other unit", "the test's whim", standingOf(s));
  assert.equal(byOther.ok, false);
  if (!byOther.ok) assert.match(byOther.reason, /only the registering unit/);
  const supersedeByOther = supersedeMonitor(s, monitor.id, "some other unit", spec(), standingOf(s));
  assert.equal(supersedeByOther.ok, false);
  const superseded = supersedeMonitor(
    s,
    monitor.id,
    "the weather wrapper",
    spec({ changeRules: [{ kind: "stale-within-margin", marginMs: 600_000 }] }),
    standingOf(s),
  );
  assert.ok(superseded.ok);
  assert.equal(monitor.status, "superseded");
  assert.equal(monitor.successorId, superseded.successor.id);
  assert.match(monitor.closedHow ?? "", /never edited in place/);
  assert.deepEqual(monitor.changeRules, [{ kind: "passes-shelf-life" }], "the predecessor's rule stands as it was");
  const cancelled = cancelMonitor(s, superseded.successor.id, "the weather wrapper", "the watch is done", standingOf(s));
  assert.ok(cancelled.ok);
  assert.equal(superseded.successor.status, "cancelled");
  assert.equal(
    s.schedule.some((i) => i.consumer?.kind === "monitor-check" && i.status === "standing"),
    false,
    "no orphaned check item outlives its monitor",
  );
});

test("expiry: a monitor whose expiry passes unclosed is closed at the next sweep, in the catalogue's words, its history complete (§2.4, §8)", async () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  const bank = new WeatherBank();
  bank.put(reading("Oklahoma City", T0, 30));
  const monitor = mustRegister(s, { expiry: { kind: "at", instantISO: "2026-11-20T20:02:30.000Z" } });
  clock.set("2026-11-20T20:01:00.000Z");
  await processTurnWithMonitoring(s, "the sky is blue.", { monitoring: { weather: bank } });
  assert.equal(monitor.status, "standing");
  clock.set("2026-11-20T20:03:30.000Z");
  await processTurnWithMonitoring(s, "the sky is blue.", { monitoring: { weather: bank } });
  assert.equal(monitor.status, "expired");
  assert.match(monitor.closedHow ?? "", /expired unclosed/);
  assert.match(monitor.closedHow ?? "", /1 check\(s\) run \(0 fired\)/);
  assert.deepEqual(
    monitor.history.map((h) => h.outcome),
    ["registered", "not-comparable", "ended"],
    "no check ran after the expiry; the ending is the last entry",
  );
});

/* ---------------- the §7.2 acceptance ---------------- */

test("acceptance (§7.2): the staleness monitor fires its refresh demand before the asking meets the stale-only decline; every check stands in the history, fired and unfired", async () => {
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
  const weatherOpts = {
    source,
    bank,
    wikidataBank: new WikidataBank(),
    placeRegister: register,
    geographySource: noGeography,
    now: () => new Date(nowISO),
    ttlMinutes: 3,
    retrievedFrom: "fixture",
  };
  const advance = (iso: string) => {
    nowISO = iso;
    clock.set(iso);
  };

  /* The reading stands banked (a prior consultation's
   * product) with a 3-minute shelf life. It is banked
   * directly so the monitor is the only watcher: the
   * weather wrapper's own T2 re-check, armed by a live
   * ask, composes with the monitor instead — that
   * composition has its own test below. */
  bank.put(reading("Oklahoma City", T0, 3));
  assert.equal(bank.peek("oklahoma city")?.expiresAt, "2026-11-20T20:03:00.000Z");

  const monitor = mustRegister(s);

  /* A check inside the shelf life: recorded, silent. */
  advance("2026-11-20T20:01:00.000Z");
  const early = await processTurnWithMonitoring(s, "the sky is blue.", {
    weather: weatherOpts,
    monitoring: { weather: bank },
  });
  assert.equal(early.trace.monitorChecks?.length, 1);
  assert.equal(early.trace.monitorChecks![0].outcome, "not-comparable", "the first check is the baseline (§3.4)");
  assert.equal(early.trace.monitorFirings, undefined, "silence: nothing raised (§5)");

  advance("2026-11-20T20:02:00.000Z");
  const mid = await processTurnWithMonitoring(s, "the sky is blue.", {
    weather: weatherOpts,
    monitoring: { weather: bank },
  });
  assert.equal(mid.trace.monitorChecks![0].outcome, "no-change");
  assert.equal(mid.trace.monitorFirings, undefined, "a no-change check raises nothing (§5)");

  /* The crossing: the firing names the monitor, the
   * registrar, the rule, and BOTH readings — and proposes
   * the refresh as a scheduled re-consultation. */
  advance("2026-11-20T20:03:00.000Z");
  const crossed = await processTurnWithMonitoring(s, "the sky is blue.", {
    weather: weatherOpts,
    monitoring: { weather: bank },
  });
  assert.equal(crossed.trace.monitorChecks![0].outcome, "change");
  assert.equal(crossed.trace.monitorFirings?.length, 1);
  const firing = crossed.trace.monitorFirings![0];
  assert.equal(firing.monitorId, monitor.id);
  assert.equal(firing.registrar, "the weather wrapper");
  assert.match(firing.rule ?? "", /passes its shelf life/);
  assert.match(firing.before ?? "", /fresh/);
  assert.match(firing.after, /stale/);
  assert.equal(firing.refreshPlace, "Oklahoma City");
  const refresh = s.schedule.find(
    (i) => i.consumer?.kind === "weather-reconsult" && i.consumer.placeName === "Oklahoma City" && i.status === "standing",
  );
  assert.ok(refresh, "the refresh stands proposed as a Scheduling item (§7.2.2)");

  /* Between the firing and the asking, the bank holds
   * nothing fresh: without the refresh, the asking would
   * meet the stale-only decline. */
  assert.equal(bank.fresh("oklahoma city", "2026-11-20T20:03:15.000Z"), undefined);

  /* The asking, after the firing: the sweep raises the
   * refresh, the chain re-consults and re-banks, and the
   * question answers — the stale-only decline never
   * stands. */
  advance("2026-11-20T20:03:30.000Z");
  const answered = await processTurnWithMonitoring(s, "what is the weather in oklahoma city?", {
    weather: weatherOpts,
    monitoring: { weather: bank },
  });
  assert.equal(source.calls, 1, "the refresh re-consulted the source (its first call in this test)");
  assert.match(answered.reply, /clear/);
  assert.equal(bank.peek("oklahoma city")?.fetchedAt, "2026-11-20T20:03:30.000Z");

  assert.deepEqual(
    monitor.history.map((h) => h.outcome),
    ["registered", "not-comparable", "no-change", "change"],
    "the history shows every check, fired and unfired (§7.2, §5)",
  );
  assert.equal(monitor.status, "standing", "a monitor persists past its firing (§4)");
});

test("composition with the weather wrapper's own re-check (T2): where that chain also stands, it refreshes inside the same sweep and the monitor's check honestly finds the fact fresh", async () => {
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
  const weatherOpts = {
    source,
    bank,
    wikidataBank: new WikidataBank(),
    placeRegister: register,
    geographySource: noGeography,
    now: () => new Date(nowISO),
    ttlMinutes: 3,
    retrievedFrom: "fixture",
  };
  const advance = (iso: string) => {
    nowISO = iso;
    clock.set(iso);
  };
  /* A live ask arms the wrapper's T2 re-check at the
   * reading's expiry, beside the monitor registered here. */
  await processTurnWithMonitoring(s, "what is the weather in oklahoma city?", {
    weather: weatherOpts,
    monitoring: { weather: bank },
  });
  assert.equal(source.calls, 1);
  const monitor = mustRegister(s);
  advance("2026-11-20T20:03:30.000Z");
  const turn = await processTurnWithMonitoring(s, "the sky is blue.", {
    weather: weatherOpts,
    monitoring: { weather: bank },
  });
  assert.equal(source.calls, 2, "the T2 chain re-consulted at the expiry, inside the same turn's sweep");
  assert.equal(turn.trace.monitorChecks![0].outcome, "not-comparable", "the monitor's first check found the fact fresh again (its baseline) — no double firing");
  assert.equal(turn.trace.monitorFirings, undefined);
  assert.equal(monitor.lastReading?.state, "fresh");
});

test("first check over an already-stale fact fires — the standing term before the first check is 'unwatched', stated in the demand", async () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  const bank = new WeatherBank();
  bank.put(reading("Oklahoma City", "2026-11-20T18:00:00.000Z", 30));
  const monitor = mustRegister(s, { registrar: "the weather bank" });
  clock.set("2026-11-20T20:01:00.000Z");
  const turn = await processTurnWithMonitoring(s, "the sky is blue.", { monitoring: { weather: bank } });
  assert.equal(turn.trace.monitorChecks![0].outcome, "change");
  const firing = turn.trace.monitorFirings![0];
  assert.equal(firing.before, undefined);
  assert.match(firing.demand, /no reading stood before this check/);
  assert.equal(monitor.lastReading?.state, "stale");
});

test("the margin rule: fires entering the stated margin, silent outside it", async () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  const bank = new WeatherBank();
  bank.put(reading("Oklahoma City", T0, 30));
  mustRegister(s, { changeRules: [{ kind: "stale-within-margin", marginMs: 10 * 60_000 }] });
  clock.set("2026-11-20T20:01:00.000Z");
  const early = await processTurnWithMonitoring(s, "the sky is blue.", { monitoring: { weather: bank } });
  assert.equal(early.trace.monitorFirings, undefined, "29 minutes remaining is outside a 10-minute margin");
  clock.set("2026-11-20T20:21:00.000Z");
  const inside = await processTurnWithMonitoring(s, "the sky is blue.", { monitoring: { weather: bank } });
  assert.equal(inside.trace.monitorChecks![0].outcome, "change");
  assert.match(inside.trace.monitorFirings![0].rule ?? "", /within 10 min/);
  clock.set("2026-11-20T20:22:00.000Z");
  const stillInside = await processTurnWithMonitoring(s, "the sky is blue.", { monitoring: { weather: bank } });
  assert.equal(stillInside.trace.monitorFirings, undefined, "already inside the margin is not a new entering");
});

/* ---------------- the class form (§7.2) ---------------- */

test("class form: the weather bank's holdings each under the rule — the firing names the holding that crossed, and only it", async () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  const bank = new WeatherBank();
  bank.put(reading("Oklahoma City", T0, 30));
  bank.put(reading("Tulsa", T0, 5));
  const monitor = mustRegister(s, {
    subject: { kind: "bank-staleness-class", bank: "weather" },
    registrar: "the weather bank",
  });
  assert.match(monitor.subjectStatement, /class form/);
  clock.set("2026-11-20T20:06:00.000Z");
  const first = await processTurnWithMonitoring(s, "the sky is blue.", { monitoring: { weather: bank } });
  assert.equal(first.trace.monitorFirings?.length, 1);
  assert.equal(first.trace.monitorFirings![0].refreshPlace, "Tulsa");
  assert.match(first.trace.monitorFirings![0].demand, /over the class/);
  clock.set("2026-11-20T20:31:00.000Z");
  const second = await processTurnWithMonitoring(s, "the sky is blue.", { monitoring: { weather: bank } });
  assert.equal(second.trace.monitorFirings?.length, 1);
  assert.equal(second.trace.monitorFirings![0].refreshPlace, "Oklahoma City");
  assert.equal(monitor.history.filter((h) => h.outcome === "change").length, 2);
});

/* ---------------- a second bank: the geography register ---------------- */

test("a staleness monitor over the geography register's coordinates runs through the same uniform operation", async () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  const register = new PlaceRegister();
  register.bankPlace({
    name: "Oklahoma City",
    coordinates: { lat: 35.473, lon: -97.5171, standsFor: "Oklahoma City" },
    provenance: { kind: "configured", detail: "the test's configured point" },
    fetchedAt: T0,
  });
  const monitor = mustRegister(s, {
    subject: { kind: "bank-staleness-fact", ref: { bank: "geography-coordinates", name: "Oklahoma City" } },
    registrar: "GeographyKnowledgeUnit",
  });
  clock.set("2026-11-20T20:01:00.000Z");
  const turn = await processTurnWithMonitoring(s, "the sky is blue.", {
    monitoring: { register },
  });
  assert.equal(turn.trace.monitorChecks![0].outcome, "not-comparable");
  assert.equal(monitor.lastReading?.state, "fresh");
  assert.match(monitor.lastReading?.summary ?? "", /coordinates of Oklahoma City/);
});

/* ---------------- pricing: declines and the one heartbeat (§3.3, §5, §8) ---------------- */

test("declined checks: the item closes fired-and-declined, the next check is registered as usual, and past the stated run ONE heartbeat raises about the monitor itself", async () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  const bank = new WeatherBank();
  bank.put(reading("Oklahoma City", T0, 30));
  const monitor = mustRegister(s);
  const decline = { priceCheck: () => ({ priced: false as const, ground: "the test Planner will not pay for this check" }) };
  const heartbeats: unknown[] = [];
  for (const iso of [
    "2026-11-20T20:01:00.000Z",
    "2026-11-20T20:02:00.000Z",
    "2026-11-20T20:03:00.000Z",
    "2026-11-20T20:04:00.000Z",
  ]) {
    clock.set(iso);
    const turn = await processTurnWithMonitoring(s, "the sky is blue.", {
      monitoring: { weather: bank, ...decline },
    });
    assert.equal(turn.trace.monitorChecks![0].outcome, "declined");
    for (const f of turn.trace.monitorFirings ?? []) if (f.kind === "heartbeat") heartbeats.push(f);
    assert.equal(monitor.status, "standing", "a declined check does not end the monitor");
    assert.ok(
      s.schedule.some((i) => i.consumer?.kind === "monitor-check" && i.status === "standing"),
      "the next check is registered as usual (§3.3)",
    );
  }
  assert.equal(heartbeats.length, 1, "exactly one heartbeat, ever (§5)");
  const heartbeat = heartbeats[0] as { demand: string };
  assert.match(heartbeat.demand, /about monitor 'monitor-1' itself/);
  assert.match(heartbeat.demand, /not its subject/);
  assert.equal(monitor.history.filter((h) => h.outcome === "declined").length, 4);
  assert.equal(monitor.history.filter((h) => h.outcome === "heartbeat").length, 1);
  assert.equal(monitor.declinedCheckRun, 4);
  const declinedItems = s.schedule.filter(
    (i) => i.consumer?.kind === "monitor-check" && i.status === "closed",
  );
  assert.equal(declinedItems.length, 4);
  assert.match(declinedItems[0].closedHow ?? "", /declined/);
});
