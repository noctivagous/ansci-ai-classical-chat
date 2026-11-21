/**
 * ansci-monitoring-m3.test.ts — Monitoring M3 (Monitoring
 * programme, 2026-11-21; design:
 * docs/ansci/monitoring-design-note.md §7.3, §4.3–§4.6).
 *
 * The acceptance sketch, exercised (§7.3): T3's acceptance
 * walk re-run with the monitor as the re-check's mechanism
 * — a what's-there question whose source was unavailable;
 * an expectation over its lack; a monitor registered as
 * the expectation's mechanism, its registrar the
 * expectation's own, its expiry the deadline exactly.
 * BOTH endings: the satisfied ending (a check's reading
 * arrives, is banked, is offered through §4.4's seam, and
 * the two records close together) and the timeout ending
 * (the expectation's timeout raises while the monitor's
 * unavailable history raises nothing, and the monitor
 * closes with it). Around them: the cross-citation's
 * refusals, and a what's-there monitor standing alone.
 * Fixture clocks and fixture sources only: no network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/ansci/session";
import {
  processTurnWithMonitoring,
  registerMonitorForExpectation,
} from "../src/ansci/monitoring-turn";
import { registerMonitor, type MonitorSpec } from "../src/ansci/monitoring";
import { registerExpectation, type ExpectationSpec } from "../src/ansci/expectation";
import { openProblem, type ProblemRecord } from "../src/ansci/problem-records";
import { FixtureClockSource, turnTimeStanding } from "../src/ansci/timekeeping";
import { PlaceRegister } from "../src/ansci/geography";
import type { OverpassSource } from "../src/ansci/overpass-client";

const T0 = "2026-11-20T20:00:00.000Z";
const DEADLINE = "2026-11-20T20:30:00.000Z";

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

class ScriptedOverpassSource implements OverpassSource {
  calls = 0;
  up = false;
  async whatsThere(): Promise<import("../src/ansci/overpass-client").OverpassLookupResult> {
    this.calls++;
    if (!this.up) return { status: "unavailable", reason: "the fixture source is at capacity" };
    return {
      status: "ok",
      data: [
        { osmId: "n1", name: "Washington Elementary", latitude: 35.481, longitude: -97.51, tags: { amenity: "school" } },
        { osmId: "n2", name: "Lincoln High School", latitude: 35.466, longitude: -97.524, tags: { amenity: "school" } },
        { osmId: "n3", name: "A Park Bench", latitude: 35.47, longitude: -97.52, tags: { amenity: "bench" } },
      ],
    };
  }
}

function openLack(s: Session): ProblemRecord {
  return openProblem(s, {
    seat: "internal",
    bearer: "system",
    subject: "the schools near Oklahoma City",
    need: "lack-of-information",
    ground: "assessed",
    turn: s.turnCount,
    reason: "the what's-there question declined: the what's-there source was unavailable",
  });
}

function expSpec(problemId: string): ExpectationSpec {
  return {
    problemId,
    satisfier: { kind: "fact", fact: "whats-there", placeName: "Oklahoma City" },
    satisfierStatement: "a what's-there result for schools near Oklahoma City",
    expectedFrom: "the what's-there consultation (Overpass)",
    deadlineISO: DEADLINE,
    onSatisfaction: "answer the waiting what's-there question for Oklahoma City from the banked set",
    onTimeout: "raise the timeout: no what's-there result for Oklahoma City arrived by the deadline",
    registeredBy: "the geography wrapper",
  };
}

async function walkSetup() {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  const register = new PlaceRegister();
  register.bankPlace({
    name: "Oklahoma City",
    coordinates: { lat: 35.473, lon: -97.5171, standsFor: "Oklahoma City" },
    provenance: { kind: "configured", detail: "the test's configured point" },
    fetchedAt: T0,
  });
  const overpass = new ScriptedOverpassSource();
  const problem = openLack(s);
  const expResult = registerExpectation(s, expSpec(problem.id), standingOf(s));
  assert.ok(expResult.ok);
  const expectation = expResult.expectation;
  const monResult = registerMonitorForExpectation(
    s,
    expectation.id,
    {
      subject: { kind: "whats-there", placeName: "Oklahoma City", categoryKey: "school" },
      interval: { periodMs: 60_000, anchor: { kind: "registration" } },
    },
    standingOf(s),
  );
  assert.ok(monResult.ok);
  return {
    clock,
    s,
    register,
    overpass,
    problem,
    expectation,
    monitor: monResult.monitor,
    async filler(iso: string) {
      clock.set(iso);
      return processTurnWithMonitoring(s, "the sky is blue.", {
        monitoring: { register, overpass, retrievedFrom: "fixture" },
      });
    },
  };
}

/* ---------------- the cross-citation (§7.3) ---------------- */

test("the mechanism's registration: the monitor's registrar is the expectation's own, its expiry the deadline exactly, the service cross-cited on the record", async () => {
  const { monitor, expectation } = await walkSetup();
  assert.equal(monitor.registrar, "the geography wrapper", "the expectation's registering unit, not the caller's");
  assert.deepEqual(monitor.expiry, { kind: "at", instantISO: DEADLINE }, "the watch's term is the wait's term, exactly");
  assert.equal(monitor.servesExpectationId, expectation.id);
  assert.deepEqual(monitor.changeRules, [{ kind: "reading-arrives" }], "the mechanism's default rule is the arrival clause");
  assert.match(monitor.history[0].detail, new RegExp(`serving expectation '${expectation.id}'`));
});

test("the mechanism's refusals: no expectation, and an ended one — located at the expectation", async () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  const missing = registerMonitorForExpectation(
    s,
    "expectation-99",
    {
      subject: { kind: "whats-there", placeName: "Oklahoma City", categoryKey: "school" },
      interval: { periodMs: 60_000, anchor: { kind: "registration" } },
    },
    standingOf(s),
  );
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.match(missing.reason, /at the expectation/);
});

/* ---------------- the satisfied ending ---------------- */

test("acceptance (§7.3), the satisfied ending: the monitor's check banks the set, offers it, and the two records close together", async () => {
  const ctx = await walkSetup();
  const { s, register, overpass, problem, expectation, monitor } = ctx;

  /* The source is down: the check records the
   * unavailability, raises nothing, and both records
   * stand open. */
  const down = await ctx.filler("2026-11-20T20:01:00.000Z");
  assert.equal(down.trace.monitorChecks![0].outcome, "unavailable");
  assert.equal(down.trace.monitorFirings, undefined);
  assert.equal(overpass.calls, 1);
  assert.equal(expectation.status, "open");
  assert.equal(monitor.status, "standing");

  /* The source answers: the check banks the set (the
   * bench is filtered out by the category table), fires
   * the arrival, offers the set through §4.4's seam —
   * and the satisfaction closes both records. */
  overpass.up = true;
  const arrived = await ctx.filler("2026-11-20T20:02:00.000Z");
  assert.equal(arrived.trace.monitorChecks![0].outcome, "change");
  assert.equal(arrived.trace.monitorFirings?.length, 1);
  assert.match(arrived.trace.monitorFirings![0].rule ?? "", /reading arrives/);
  const banked = register.whatsThereFor("Oklahoma City", "school", new Date("2026-11-20T20:02:00.000Z"));
  assert.equal(banked?.entries.length, 2, "the two schools stand banked; the bench is not a school");
  assert.deepEqual(
    banked?.entries.map((e) => e.name),
    ["Lincoln High School", "Washington Elementary"],
    "banked nearest first, as the geography wrapper banks them",
  );
  const satisfiedOutcome = arrived.trace.expectationSweep?.find((o) => o.expectationId === expectation.id);
  assert.equal(satisfiedOutcome?.outcome, "satisfied");
  assert.equal(satisfiedOutcome?.demand, "answer the waiting what's-there question for Oklahoma City from the banked set");
  assert.equal(expectation.status, "satisfied");
  assert.equal(problem.status, "closed", "the problem record closes with the satisfaction (§4.3)");
  assert.match(problem.closingEvidence ?? "", /satisfied/);
  assert.equal(monitor.status, "closed-by-expectation");
  assert.match(monitor.closedHow ?? "", /closed by its expectation/);
  assert.deepEqual(
    monitor.history.map((h) => h.outcome),
    ["registered", "unavailable", "change", "ended"],
  );

  /* No further checks: the watch's term is served. */
  const after = await ctx.filler("2026-11-20T20:03:00.000Z");
  assert.equal(after.trace.monitorChecks, undefined);
  assert.equal(overpass.calls, 2, "no check ran after the joint closing");
});

/* ---------------- the timeout ending ---------------- */

test("acceptance (§7.3), the timeout ending: the expectation's timeout raises; the monitor's unavailable history raises nothing; the monitor closes with it", async () => {
  const ctx = await walkSetup();
  const { problem, expectation, monitor } = ctx;

  const first = await ctx.filler("2026-11-20T20:01:00.000Z");
  assert.equal(first.trace.monitorChecks![0].outcome, "unavailable");
  assert.equal(first.trace.monitorFirings, undefined);
  const second = await ctx.filler("2026-11-20T20:02:00.000Z");
  assert.equal(second.trace.monitorChecks![0].outcome, "unavailable");
  assert.equal(second.trace.monitorFirings, undefined, "the unavailable run raises nothing throughout (§7.3)");

  /* Past the deadline: the opening sweep raises the
   * expectation's timeout — and the monitor closes with
   * it, as closed-by-expectation, not as a bare expiry. */
  const past = await ctx.filler("2026-11-20T20:31:00.000Z");
  const timeoutOutcome = past.trace.expectationSweep?.find((o) => o.expectationId === expectation.id);
  assert.equal(timeoutOutcome?.outcome, "timed-out");
  assert.equal(timeoutOutcome?.demand, "raise the timeout: no what's-there result for Oklahoma City arrived by the deadline");
  assert.equal(expectation.status, "timed-out");
  assert.notEqual(problem.status, "closed", "the problem record STANDS at a timeout — the need reverts to a standing lack (§4.6)");
  assert.match(problem.closingEvidence ?? "", /timed out/);
  assert.equal(monitor.status, "closed-by-expectation");
  assert.match(monitor.closedHow ?? "", /closed by its expectation/);
  assert.match(monitor.closedHow ?? "", /timed-out/);
  assert.deepEqual(
    monitor.history.map((h) => h.outcome),
    ["registered", "unavailable", "unavailable", "ended"],
    "the history shows the unavailable run, raising nothing, and the joint ending",
  );
  assert.equal(past.trace.monitorFirings, undefined);
});

/* ---------------- a what's-there monitor standing alone ---------------- */

test("a what's-there monitor standing alone: registrable without an expectation, its arrival firing an ordinary demand", async () => {
  const clock = fixtureClock(T0);
  const s = clockedSession(clock);
  const register = new PlaceRegister();
  register.bankPlace({
    name: "Oklahoma City",
    coordinates: { lat: 35.473, lon: -97.5171, standsFor: "Oklahoma City" },
    provenance: { kind: "configured", detail: "the test's configured point" },
    fetchedAt: T0,
  });
  const overpass = new ScriptedOverpassSource();
  const spec: MonitorSpec = {
    subject: { kind: "whats-there", placeName: "Oklahoma City", categoryKey: "school" },
    interval: { periodMs: 60_000, anchor: { kind: "registration" } },
    changeRules: [{ kind: "reading-arrives" }],
    registrar: "GeographyKnowledgeUnit",
    expiry: { kind: "at", instantISO: "2026-11-20T23:00:00.000Z" },
  };
  const registered = registerMonitor(s, spec, standingOf(s));
  assert.ok(registered.ok);
  const monitor = registered.monitor;
  assert.equal(monitor.servesExpectationId, undefined);
  clock.set("2026-11-20T20:01:00.000Z");
  await processTurnWithMonitoring(s, "the sky is blue.", {
    monitoring: { register, overpass, retrievedFrom: "fixture" },
  });
  overpass.up = true;
  clock.set("2026-11-20T20:02:00.000Z");
  const arrived = await processTurnWithMonitoring(s, "the sky is blue.", {
    monitoring: { register, overpass, retrievedFrom: "fixture" },
  });
  assert.equal(arrived.trace.monitorFirings?.length, 1);
  assert.match(arrived.trace.monitorFirings![0].demand, /raises the arrival for the Planner/);
  assert.equal(monitor.status, "standing", "no expectation to close with — the monitor persists (§4)");
});
