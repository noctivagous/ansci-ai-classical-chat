/**
 * ansci-monitoring-m2.test.ts — Monitoring M2 (Monitoring
 * programme, 2026-11-21; design:
 * docs/ansci/monitoring-design-note.md §7.1, §3.4, §8).
 *
 * The acceptance sketch, exercised (§7.1): a situated-place
 * weather monitor whose fixture-driven readings across
 * turns produce history entries and silence until the
 * condition changes; the change turn's trace shows the
 * demand, both readings, and the Planner's pricing —
 * including a declined telling, recorded as declined.
 * Around it: the registrar seam (GeographyAwareness over
 * the situated place; no situated place, no registration),
 * the unavailable discipline (recorded, silent, the last
 * reading unchanged — and firing only where the rule
 * names it), the arrival clause, and the banking of check
 * readings as the wrapper banks today's. Fixture clocks
 * and fixture sources only: no network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/ansci/session";
import { PLACE } from "../src/ansci/place";
import {
  processTurnWithMonitoring,
  registerSituatedWeatherMonitor,
} from "../src/ansci/monitoring-turn";
import { registerMonitor, type MonitorSpec } from "../src/ansci/monitoring";
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

function standingOf(s: Session) {
  return turnTimeStanding(s)?.standing;
}

type ScriptStep =
  | { conditionText: string; temperatureC: number; precipitationMm?: number }
  | "fail";

class ScriptedWeatherSource implements WeatherSource {
  calls = 0;
  constructor(private readonly script: ScriptStep[]) {}
  async currentConditions(
    latitude: number,
    longitude: number,
  ): Promise<import("../src/ansci/weather-client").WeatherLookupResult<import("../src/ansci/weather-client").WeatherObservation>> {
    this.calls++;
    const step = this.script[Math.min(this.calls - 1, this.script.length - 1)];
    if (!step || step === "fail") return { status: "unavailable", reason: "the fixture source is down" };
    return {
      status: "ok",
      data: {
        timeISO: "2026-11-20T19:55:00.000Z",
        temperatureC: step.temperatureC,
        conditionText: step.conditionText,
        ...(step.precipitationMm !== undefined ? { precipitationMm: step.precipitationMm } : {}),
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

async function situatedSetup(script: ScriptStep[]) {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  const register = new PlaceRegister();
  register.bankPlace({
    name: "Oklahoma City",
    coordinates: { lat: 35.473, lon: -97.5171, standsFor: "Oklahoma City" },
    provenance: { kind: "configured", detail: "the test's configured point" },
    fetchedAt: T0,
  });
  const source = new ScriptedWeatherSource(script);
  const bank = new WeatherBank();
  let nowISO = T0;
  const weatherOpts = {
    source,
    bank,
    wikidataBank: new WikidataBank(),
    placeRegister: register,
    geographySource: noGeography,
    now: () => new Date(nowISO),
    ttlMinutes: 30,
    retrievedFrom: "fixture",
  };
  await processTurnWithMonitoring(s, "i am in oklahoma city.", {
    weather: weatherOpts,
    monitoring: { weather: bank },
  });
  return {
    clock,
    s,
    register,
    source,
    bank,
    weatherOpts,
    advance(iso: string) {
      nowISO = iso;
      clock.set(iso);
    },
    async filler(iso: string, monitoring: Record<string, unknown> = {}) {
      this.advance(iso);
      return processTurnWithMonitoring(s, "the sky is blue.", {
        weather: weatherOpts,
        monitoring: { weather: bank, ...monitoring },
      });
    },
  };
}

function monitorSpec(over: Partial<MonitorSpec> = {}): MonitorSpec {
  return {
    subject: { kind: "weather-reading", placeName: "Oklahoma City" },
    interval: { periodMs: 60_000, anchor: { kind: "registration" } },
    changeRules: [{ kind: "condition-word-differs" }, { kind: "precipitation-begins-or-ceases" }],
    registrar: "Awareness (GeographyAwareness)",
    expiry: { kind: "at", instantISO: "2026-11-20T23:00:00.000Z" },
    ...over,
  };
}

/* ---------------- the registrar seam (§7.1) ---------------- */

test("the registrar seam: GeographyAwareness registers over the situated place; with no situated place, the refusal is located at the subject", async () => {
  const { s } = await situatedSetup([{ conditionText: "Clear", temperatureC: 21 }]);
  const registered = registerSituatedWeatherMonitor(
    s,
    {
      interval: { periodMs: 60_000, anchor: { kind: "registration" } },
      changeRules: [{ kind: "condition-word-differs" }],
      expiry: { kind: "at", instantISO: "2026-11-20T23:00:00.000Z" },
    },
    standingOf(s),
  );
  assert.ok(registered.ok);
  assert.equal(registered.monitor.subject.kind, "weather-reading");
  if (registered.monitor.subject.kind === "weather-reading") {
    /* The place as the conversation states it — the
     * register's resolution normalises case on lookup. */
    assert.equal(registered.monitor.subject.placeName, "oklahoma city");
  }
  assert.equal(registered.monitor.registrar, "Awareness (GeographyAwareness)");

  // No situated place: under no configured seat (the
  // default is Oklahoma City, OK now).
  const savedSeat = PLACE.place;
  PLACE.place = null;
  const bare = clockedSession(fixtureClock(T0));
  const refused = registerSituatedWeatherMonitor(
    bare,
    {
      interval: { periodMs: 60_000, anchor: { kind: "registration" } },
      changeRules: [{ kind: "condition-word-differs" }],
      expiry: { kind: "at", instantISO: "2026-11-20T23:00:00.000Z" },
    },
    standingOf(bare),
  );
  PLACE.place = savedSeat;
  assert.equal(refused.ok, false);
  if (!refused.ok) {
    assert.match(refused.reason, /at the subject/);
    assert.match(refused.reason, /no situated place stands/);
  }
});

test("a staleness rule over a weather consultation subject is refused at the rule (§3.1) — the kinds do not blur", async () => {
  const { s } = await situatedSetup([{ conditionText: "Clear", temperatureC: 21 }]);
  const result = registerMonitor(
    s,
    monitorSpec({ changeRules: [{ kind: "passes-shelf-life" }] }),
    standingOf(s),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.reason, /at the change rule/);
});

/* ---------------- the §7.1 acceptance ---------------- */

test("acceptance (§7.1): silence until the condition changes; the change turn's trace shows the demand, both readings, and the pricing — the readings banked as today's are", async () => {
  const ctx = await situatedSetup([
    { conditionText: "Clear", temperatureC: 21 },
    { conditionText: "Clear", temperatureC: 21 },
    { conditionText: "Rain", temperatureC: 18, precipitationMm: 2.5 },
    { conditionText: "Rain", temperatureC: 18, precipitationMm: 1.0 },
  ]);
  const { s, source, bank } = ctx;
  const registered = registerMonitor(s, monitorSpec(), standingOf(s));
  assert.ok(registered.ok);
  const monitor = registered.monitor;

  /* Check 1: the baseline. The reading is banked as the
   * wrapper banks today's — fetched at the check's
   * instant, under the bank's TTL. */
  const first = await ctx.filler("2026-11-20T20:01:00.000Z");
  assert.equal(first.trace.monitorChecks![0].outcome, "not-comparable");
  assert.equal(first.trace.monitorFirings, undefined);
  assert.equal(source.calls, 1);
  const banked = bank.peek("oklahoma city");
  assert.equal(banked?.condition, "clear");
  assert.equal(banked?.fetchedAt, "2026-11-20T20:01:00.000Z");
  assert.equal(banked?.expiresAt, "2026-11-20T20:31:00.000Z");

  /* Check 2: the same condition — silence. */
  const second = await ctx.filler("2026-11-20T20:02:00.000Z");
  assert.equal(second.trace.monitorChecks![0].outcome, "no-change");
  assert.equal(second.trace.monitorFirings, undefined, "no change, no telling (§5)");

  /* Check 3: the condition changes and precipitation
   * begins — both clauses fire; the demand carries both
   * readings; the telling is priced and told. */
  const changed = await ctx.filler("2026-11-20T20:03:00.000Z");
  assert.equal(changed.trace.monitorChecks![0].outcome, "change");
  assert.equal(changed.trace.monitorFirings?.length, 1);
  const firing = changed.trace.monitorFirings![0];
  assert.equal(firing.monitorId, monitor.id);
  assert.equal(firing.registrar, "Awareness (GeographyAwareness)");
  assert.match(firing.rule ?? "", /condition word differs/);
  assert.match(firing.rule ?? "", /precipitation begins or ceases/);
  assert.match(firing.before ?? "", /clear/);
  assert.match(firing.after, /rain/);
  assert.match(firing.demand, /both readings|last reading was/);
  assert.equal(firing.telling?.priced, "told");
  assert.match(firing.telling?.wording ?? "", /has changed/);
  assert.match(firing.telling?.wording ?? "", /rain/);

  /* Check 4: rain continues — precipitation continuing is
   * not precipitation beginning; silence again. */
  const continued = await ctx.filler("2026-11-20T20:04:00.000Z");
  assert.equal(continued.trace.monitorChecks![0].outcome, "no-change");
  assert.equal(continued.trace.monitorFirings, undefined);

  assert.deepEqual(
    monitor.history.map((h) => h.outcome),
    ["registered", "not-comparable", "no-change", "change", "telling", "no-change"],
    "every check stands in the history, and the telling's pricing with it",
  );
  assert.equal(monitor.status, "standing", "a monitor persists past its firing (§4)");
});

test("acceptance, the declined telling: priced and declined, the decline recorded on the firing and in the history (§7.1)", async () => {
  const ctx = await situatedSetup([
    { conditionText: "Clear", temperatureC: 21 },
    { conditionText: "Snow", temperatureC: -2 },
  ]);
  const { s } = ctx;
  const registered = registerMonitor(s, monitorSpec(), standingOf(s));
  assert.ok(registered.ok);
  const monitor = registered.monitor;
  await ctx.filler("2026-11-20T20:01:00.000Z");
  const changed = await ctx.filler("2026-11-20T20:02:00.000Z", {
    priceTelling: () => ({ told: false as const, ground: "the test Planner judges the change beneath telling" }),
  });
  const firing = changed.trace.monitorFirings![0];
  assert.equal(firing.telling?.priced, "declined");
  assert.equal(firing.telling?.ground, "the test Planner judges the change beneath telling");
  const tellingEntry = monitor.history.find((h) => h.outcome === "telling");
  assert.match(tellingEntry?.detail ?? "", /declined at pricing/);
  assert.match(tellingEntry?.detail ?? "", /recorded as declined/);
});

/* ---------------- the unavailable discipline (§3.4, §8) ---------------- */

test("unavailable: recorded, silent, the last reading unchanged — and the arrival after it fires the arrival clause", async () => {
  const ctx = await situatedSetup([
    { conditionText: "Clear", temperatureC: 21 },
    "fail",
    { conditionText: "Clear", temperatureC: 21 },
  ]);
  const { s } = ctx;
  const registered = registerMonitor(
    s,
    monitorSpec({ changeRules: [{ kind: "condition-word-differs" }, { kind: "reading-arrives" }] }),
    standingOf(s),
  );
  assert.ok(registered.ok);
  const monitor = registered.monitor;
  await ctx.filler("2026-11-20T20:01:00.000Z");
  assert.equal(monitor.lastReading?.state, "clear");
  const down = await ctx.filler("2026-11-20T20:02:00.000Z");
  assert.equal(down.trace.monitorChecks![0].outcome, "unavailable");
  assert.equal(down.trace.monitorFirings, undefined, "unavailability a rule does not name raises nothing (§8)");
  assert.equal(monitor.lastReading?.state, "clear", "the last reading stands unchanged");
  const back = await ctx.filler("2026-11-20T20:03:00.000Z");
  assert.equal(back.trace.monitorChecks![0].outcome, "change");
  assert.match(back.trace.monitorFirings![0].rule ?? "", /reading arrives/);
});

test("unavailable-successive: the rule that names unavailability fires at the check the stated run is reached — and not again while the run continues", async () => {
  const ctx = await situatedSetup(["fail", "fail", "fail"]);
  const { s } = ctx;
  const registered = registerMonitor(
    s,
    monitorSpec({
      changeRules: [{ kind: "unavailable-successive", count: 2 }, { kind: "condition-word-differs" }],
    }),
    standingOf(s),
  );
  assert.ok(registered.ok);
  const monitor = registered.monitor;
  const first = await ctx.filler("2026-11-20T20:01:00.000Z");
  assert.equal(first.trace.monitorChecks![0].outcome, "unavailable");
  assert.equal(first.trace.monitorFirings, undefined);
  const second = await ctx.filler("2026-11-20T20:02:00.000Z");
  assert.equal(second.trace.monitorChecks![0].outcome, "change");
  assert.match(second.trace.monitorFirings![0].rule ?? "", /unavailable for 2 successive checks/);
  const third = await ctx.filler("2026-11-20T20:03:00.000Z");
  assert.equal(third.trace.monitorChecks![0].outcome, "unavailable");
  assert.equal(third.trace.monitorFirings, undefined, "a continuing run does not re-fire");
  assert.equal(monitor.unavailableRun, 3);
});
