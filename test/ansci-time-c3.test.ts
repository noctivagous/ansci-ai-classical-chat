/**
 * ansci-time-c3.test.ts — Timelines and placement (Time
 * programme C3, 2026-11-20; design:
 * docs/ansci/time-scheduling-design-note.md §8.7–§8.11,
 * slice §8.12-C3).
 *
 * Acceptance, per the slice: §8.10's two recurring
 * placements produce their two different date sequences;
 * a relation asked across a plan's timeline composes
 * through the table; an unplaceable entry declines in
 * §8.11's words; an Expectation deadline stands placed,
 * and §4.6's timeout is evaluated against the placement.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, type Session } from "../src/ansci/session";
import { FixtureClockSource, turnTimeStanding } from "../src/ansci/timekeeping";
import {
  buildCalendarPlacement,
  placementDates,
  registerSchedule,
  sweepSchedule,
  type ScheduleSpec,
} from "../src/ansci/scheduling";
import { openProblem, type ProblemRecord } from "../src/ansci/problem-records";
import { registerExpectation, sweepExpectations, type ExpectationSpec } from "../src/ansci/expectation";
import {
  ALLEN_COMPOSITION_TABLE,
  ALLEN_RELATIONS,
  composeRelations,
  conversationTimeline,
  converseRelation,
  durationBetweenEntries,
  knowledgeTimeline,
  planTimeline,
  relateEntries,
  relationBetween,
  type AllenRelation,
} from "../src/ansci/timeline";
import { fixedFromGregorian, gregorianDate, gregorianFromFixed } from "../src/ansci/calendar";
import { chineseFromFixed } from "../src/ansci/calendar-chinese";

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

function mustRegister(s: Session, over: Partial<ScheduleSpec> = {}) {
  const result = registerSchedule(s, spec(over), standingOf(s));
  if (!result.ok) assert.fail(`registration refused: ${result.reason}`);
  return result.item;
}

const fixed = (y: number, m: number, d: number) => fixedFromGregorian(gregorianDate(y, m, d));
const isoOf = (f: number) => {
  const g = gregorianFromFixed(f);
  return `${g.year}-${String(g.month).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`;
};

/* ---------------- Allen's algebra (§8.8) ---------------- */

test("the thirteen basic relations, from their endpoint definitions", () => {
  const cases: [AllenRelation, [number, number], [number, number]][] = [
    ["precedes", [0, 1], [2, 3]],
    ["meets", [0, 1], [1, 3]],
    ["overlaps", [0, 2], [1, 3]],
    ["starts", [0, 1], [0, 3]],
    ["during", [1, 2], [0, 3]],
    ["finishes", [2, 3], [0, 3]],
    ["equals", [0, 3], [0, 3]],
    ["finished-by", [0, 3], [2, 3]],
    ["contains", [0, 3], [1, 2]],
    ["started-by", [0, 3], [0, 1]],
    ["overlapped-by", [1, 3], [0, 2]],
    ["met-by", [1, 3], [0, 1]],
    ["preceded-by", [2, 3], [0, 1]],
  ];
  assert.equal(ALLEN_RELATIONS.length, 13);
  for (const [relation, [a1, a2], [b1, b2]] of cases) {
    assert.equal(relationBetween({ start: a1, end: a2 }, { start: b1, end: b2 }), relation);
    assert.equal(
      relationBetween({ start: b1, end: b2 }, { start: a1, end: a2 }),
      converseRelation(relation),
      "the converse structure holds on the same pair, swapped",
    );
  }
  for (const r of ALLEN_RELATIONS) assert.equal(converseRelation(converseRelation(r)), r);
});

test("the composition table: the paper's own example, the identity, converse symmetry over all 169 cells", () => {
  // Allen's worked example (§8.8): A during B, B precedes
  // C, therefore A precedes C — a single basic.
  assert.deepEqual(composeRelations("during", "precedes"), ["precedes"]);
  assert.deepEqual(ALLEN_COMPOSITION_TABLE.during.precedes, ["precedes"]);
  assert.deepEqual(composeRelations("precedes", "precedes"), ["precedes"]);
  // Equals is the identity of the algebra.
  for (const r of ALLEN_RELATIONS) {
    assert.deepEqual(composeRelations("equals", r), [r]);
    assert.deepEqual(composeRelations(r, "equals"), [r]);
  }
  // Every cell is non-empty, and the table is converse-
  // symmetric: converse(A∘B) = converse(B) ∘ converse(A).
  for (const r1 of ALLEN_RELATIONS) {
    for (const r2 of ALLEN_RELATIONS) {
      const cell = ALLEN_COMPOSITION_TABLE[r1][r2];
      assert.ok(cell.length > 0, `cell ${r1} ∘ ${r2} is non-empty`);
      const mirrored = composeRelations(converseRelation(r2), converseRelation(r1))
        .map(converseRelation)
        .sort();
      assert.deepEqual([...cell].sort(), mirrored, `converse symmetry at ${r1} ∘ ${r2}`);
    }
  }
  // A general relation is a set of basics: composing two
  // loose relations states a disjunction, not a fourteenth
  // relation.
  const loose = composeRelations("overlaps", "overlaps");
  assert.ok(loose.length > 1 && loose.every((r) => ALLEN_RELATIONS.includes(r)));
});

/* ---------------- placement: the acceptance walk (§8.10) ---------------- */

test("placement walk: monthly on the 31st and every 30 days from the same start give their two different sequences", () => {
  const start = fixed(2026, 1, 31);
  const monthly = placementDates("gregorian", { kind: "monthly-on-day", dayOfMonth: 31, shortMonthRule: "last-day" }, start, 3);
  assert.equal(monthly.status, "placed");
  if (monthly.status === "placed") {
    assert.deepEqual(monthly.dates.map(isoOf), ["2026-01-31", "2026-02-28", "2026-03-31"],
      "monthly: February lands on its last day, on the placement's stated rule; March returns to the 31st");
  }
  const every30 = placementDates("gregorian", { kind: "every-days", days: 30 }, start, 3);
  assert.equal(every30.status, "placed");
  if (every30.status === "placed") {
    assert.deepEqual(every30.dates.map(isoOf), ["2026-01-31", "2026-03-02", "2026-04-01"],
      "every 30 days: a duration, the same on every grid — different dates by the second firing (§8.10)");
  }
  const skipping = placementDates("gregorian", { kind: "monthly-on-day", dayOfMonth: 31, shortMonthRule: "skip" }, start, 3);
  assert.equal(skipping.status, "placed");
  if (skipping.status === "placed") {
    assert.deepEqual(skipping.dates.map(isoOf), ["2026-01-31", "2026-03-31", "2026-05-31"],
      "the skip rule is the placement's other stated answer to a lacking day — the item, not the firing, carries it");
  }
});

test("placement on the lunisolar grid: the same pattern lands on 29- and 30-day months and meets the leap month as the system places it", () => {
  const cny2026 = fixed(2026, 2, 17);
  const monthly29 = placementDates("chinese", { kind: "monthly-on-day", dayOfMonth: 29, shortMonthRule: "last-day" }, cny2026, 6);
  assert.equal(monthly29.status, "placed");
  if (monthly29.status === "placed") {
    for (const f of monthly29.dates) assert.equal(chineseFromFixed(f).day, 29, "every landing is the 29th of its lunar month");
    const months = monthly29.dates.map((f) => chineseFromFixed(f).month);
    assert.deepEqual(months, [1, 2, 3, 4, 5, 6], "the pattern walks the year's months in order");
  }
  // Through the 2033 leap year: fourteen monthly landings
  // from its New Year meet thirteen months — one of them
  // the leap eleventh.
  const leapYear = placementDates("chinese", { kind: "monthly-on-day", dayOfMonth: 15, shortMonthRule: "last-day" }, fixed(2033, 1, 31), 14);
  assert.equal(leapYear.status, "placed");
  if (leapYear.status === "placed") {
    const seen = leapYear.dates.map((f) => chineseFromFixed(f));
    assert.equal(seen.length, 14);
    assert.ok(seen.some((d) => d.leap && d.month === 11), "the walk meets the leap eleventh month where the system places it");
    assert.ok(seen.every((d) => d.day === 15));
  }
  const unheld = placementDates("mayan", { kind: "every-days", days: 30 }, start0(), 3);
  assert.equal(unheld.status, "unheld-system", "a placement naming an unheld system declines at the holding (§8.11)");
  function start0() {
    return fixed(2026, 1, 31);
  }
});

test("the placement field stands on the item, computed at registration: dates from the grid, pattern stated", () => {
  const s = clockedSession(fixtureClock(T0));
  const built = buildCalendarPlacement("gregorian", { kind: "monthly-on-day", dayOfMonth: 31, shortMonthRule: "last-day" }, fixed(2026, 1, 31), 3);
  assert.equal(built.status, "placed");
  if (built.status !== "placed") return;
  assert.deepEqual(built.placement.datesISO, ["2026-01-31", "2026-02-28", "2026-03-31"]);
  assert.match(built.placement.pattern ?? "", /short-month rule: last-day/);
  const item = mustRegister(s, { calendarPlacement: built.placement });
  assert.deepEqual(item.calendarPlacement?.datesISO, ["2026-01-31", "2026-02-28", "2026-03-31"]);
});

/* ---------------- the timelines (§8.7) ---------------- */

test("the conversation's own timeline: built from the session's records, on the turn-order axis, inventing nothing", () => {
  const s = clockedSession(fixtureClock(T0));
  const problem = openProblem(s, {
    seat: "internal",
    bearer: "system",
    subject: "the coordinates of Tulsa",
    need: "lack-of-information",
    ground: "assessed",
    turn: 1,
    reason: "opened for the timeline tests",
  });
  mustRegister(s);
  const line = conversationTimeline(s);
  assert.equal(line.ownerKind, "conversation");
  assert.match(line.axis, /turn order/);
  const problemEntry = line.entries.find((e) => e.id === `problem-${problem.id}`);
  const scheduleEntry = line.entries.find((e) => e.id.startsWith("schedule-") && e.id.endsWith("-registered"));
  assert.ok(problemEntry?.extent && scheduleEntry?.extent);
  // Both stand at turn 0/1 points of the session's own
  // record; relations over the line are computed, cited
  // as computations.
  const related = relateEntries(line, problemEntry.id, scheduleEntry.id);
  assert.equal(related.status, "related");
  if (related.status === "related") assert.equal(related.derivation.kind, "derived");
});

test("a plan's timeline: the register viewed as a line — relations and a duration read off it (§8.8, §8.9)", () => {
  const s = clockedSession(fixtureClock(T0));
  const a = mustRegister(s, {
    owed: "the first commitment",
    trigger: { kind: "at", instantISO: "2026-11-22T20:00:00.000Z" },
    registrationExpiresISO: "2026-11-25T20:00:00.000Z",
  });
  // The second commitment is registered five days later,
  // under a later standing.
  const laterProbe = clockedSession(fixtureClock("2026-11-25T20:00:00.000Z"));
  const bResult = registerSchedule(
    s,
    spec({
      owed: "the second commitment",
      trigger: { kind: "at", instantISO: "2026-11-27T20:00:00.000Z" },
      registrationExpiresISO: "2026-11-30T20:00:00.000Z",
    }),
    standingOf(laterProbe),
  );
  if (!bResult.ok) assert.fail(`registration refused: ${bResult.reason}`);
  const b = bResult.item;
  const line = planTimeline(s);
  assert.equal(line.ownerKind, "plan");
  const related = relateEntries(line, `schedule-${a.id}`, `schedule-${b.id}`);
  assert.equal(related.status, "related");
  if (related.status === "related") {
    assert.equal(related.relation, "precedes", "the first commitment's span ends before the second's begins");
    assert.match(related.derivation.detail, /computed over their extents/);
  }
  const duration = durationBetweenEntries(line, `schedule-${a.id}`, `schedule-${b.id}`);
  assert.equal(duration.status, "read-off");
  if (duration.status === "read-off") {
    assert.equal(duration.days, 5, "read off the line: the second commitment stands five days after the first (§8.9)");
  }
});

test("duration read off a knowledge line, across systems: the derivation says a conversion carried it (§8.9)", () => {
  const line = knowledgeTimeline("test-line", "the test's own line", [
    {
      id: "founding",
      name: "the founding",
      extent: { kind: "point", fixedStart: fixed(2020, 1, 1), fixedEnd: fixed(2020, 1, 1), system: "gregorian", standing: "stated for the test, Gregorian 2020-01-01" },
    },
    {
      id: "fall",
      name: "the fall",
      extent: { kind: "point", fixedStart: fixed(2020, 1, 31), fixedEnd: fixed(2020, 1, 31), system: "chinese", standing: "stated for the test, in the Chinese reckoning, converted through Calendar" },
    },
  ]);
  const duration = durationBetweenEntries(line, "founding", "fall");
  assert.equal(duration.status, "read-off");
  if (duration.status === "read-off") {
    assert.equal(duration.days, 30);
    assert.match(duration.derivation.detail, /different systems/);
  }
});

/* ---------------- the declines (§8.11) ---------------- */

test("the addendum's declines, each at its location", () => {
  const line = knowledgeTimeline("declines", "the test's line of declines", [
    { id: "placed", name: "a placed entry", extent: { kind: "point", fixedStart: 100, fixedEnd: 100, standing: "stated for the test" } },
    { id: "unplaced", name: "an unplaceable entry", unplacedReason: "its extent cannot be stated in a held system or a standing reading" },
    {
      id: "foreign",
      name: "an entry standing in an unheld system",
      extent: { kind: "point", fixedStart: 200, fixedEnd: 200, system: "mayan", standing: "stated for the test, in the Mayan reckoning" },
    },
    {
      id: "gregorian-entry",
      name: "an entry standing in a held system",
      extent: { kind: "point", fixedStart: 300, fixedEnd: 300, system: "gregorian", standing: "stated for the test" },
    },
  ]);
  const unplaceable = relateEntries(line, "placed", "unplaced");
  assert.equal(unplaceable.status, "unplaceable-entry");
  if (unplaceable.status === "unplaceable-entry") assert.match(unplaceable.detail, /decline at the placement, not at the event/);
  const across = relateEntries(line, "gregorian-entry", "foreign");
  assert.equal(across.status, "relation-across-unconverted-systems");
  if (across.status === "relation-across-unconverted-systems") assert.match(across.detail, /not computed by silently sharing a grid/);
  const noEndpoint = durationBetweenEntries(line, "placed", "missing");
  assert.equal(noEndpoint.status, "duration-without-both-endpoints");
  if (noEndpoint.status === "duration-without-both-endpoints") assert.match(noEndpoint.detail, /a date, not a duration/);
  const unplacedDuration = durationBetweenEntries(line, "placed", "unplaced");
  assert.equal(unplacedDuration.status, "unplaceable-entry");
});

/* ---------------- timeline placement: relations re-computed (§8.10) ---------------- */

test("a placement relation that stops holding is an event on the item's record — once, and never a silent edit", () => {
  const s = clockedSession(fixtureClock(T0));
  const later = mustRegister(s, {
    owed: "the later commitment",
    trigger: { kind: "at", instantISO: "2026-11-27T20:00:00.000Z" },
    registrationExpiresISO: "2026-11-30T20:00:00.000Z",
  });
  const misplaced = mustRegister(s, {
    owed: "the earlier commitment, stated to precede the later",
    trigger: { kind: "at", instantISO: "2026-11-22T20:00:00.000Z" },
    registrationExpiresISO: "2026-11-25T20:00:00.000Z",
    timelinePlacement: { relations: [{ relation: "precedes", to: later.id }] },
  });
  const wellPlaced = mustRegister(s, {
    owed: "a commitment whose stated relation holds",
    trigger: { kind: "at", instantISO: "2026-11-21T20:00:00.000Z" },
    registrationExpiresISO: "2026-11-24T20:00:00.000Z",
    timelinePlacement: { relations: [{ relation: "precedes", to: misplaced.id }] },
  });
  // misplaced stands [T0, Nov 22] and later [T0, Nov 27]:
  // the computed relation is "starts", not the stated
  // "precedes" — the placement has lapsed on the line.
  sweepSchedule(s, standingOf(s));
  const lapses = misplaced.events.filter((e) => e.detail.includes("placement relation lapsed"));
  assert.equal(lapses.length, 1);
  assert.match(lapses[0].detail, /the line now computes starts/);
  assert.match(lapses[0].detail, /not a silent edit/);
  sweepSchedule(s, standingOf(s));
  assert.equal(
    misplaced.events.filter((e) => e.detail.includes("placement relation lapsed")).length,
    1,
    "the lapse is recorded once, not re-recorded at every sweep",
  );
  // wellPlaced [T0, Nov 21] against misplaced [T0, Nov 22]
  // computes "starts" too — its stated "precedes" has
  // also lapsed; a relation that genuinely holds records
  // nothing. (Both items share the registration instant,
  // so interval relations between them are starts-family;
  // the holding case is the next test's.)
  assert.equal(wellPlaced.events.filter((e) => e.detail.includes("placement relation lapsed")).length, 1);
});

test("a placement relation that holds records nothing", () => {
  const s = clockedSession(fixtureClock(T0));
  const other = mustRegister(s, {
    owed: "the other commitment",
    trigger: { kind: "at", instantISO: "2026-11-27T20:00:00.000Z" },
    registrationExpiresISO: "2026-11-30T20:00:00.000Z",
  });
  const item = mustRegister(s, {
    owed: "a commitment stated to start the other's span",
    trigger: { kind: "at", instantISO: "2026-11-22T20:00:00.000Z" },
    registrationExpiresISO: "2026-11-25T20:00:00.000Z",
    timelinePlacement: { relations: [{ relation: "starts", to: other.id }] },
  });
  sweepSchedule(s, standingOf(s));
  assert.equal(item.events.filter((e) => e.detail.includes("placement relation lapsed")).length, 0);
});

/* ---------------- the Expectation deadline's home (§8.10, §4.6) ---------------- */

test("an expectation's deadline stands placed, and the timeout is evaluated against the placement", () => {
  const s = clockedSession(fixtureClock(T0));
  const problem = openProblem(s, {
    seat: "internal",
    bearer: "system",
    subject: "the coordinates of Tulsa",
    need: "lack-of-information",
    ground: "assessed",
    turn: s.turnCount,
    reason: "opened for the placement tests",
  });
  const spec: ExpectationSpec = {
    problemId: problem.id,
    satisfier: { kind: "fact", fact: "coordinates", placeName: "Tulsa" },
    satisfierStatement: "the coordinates of Tulsa",
    expectedFrom: "the geography consultation chain",
    deadlineISO: "2026-11-20T20:30:00.000Z",
    onSatisfaction: "answer the waiting question",
    onTimeout: "raise the timeout for the Tulsa wait",
    registeredBy: "the test unit",
  };
  const registered = registerExpectation(s, spec, standingOf(s));
  if (!registered.ok) assert.fail(`expectation refused: ${registered.reason}`);
  const expectation = registered.expectation;
  assert.ok(expectation.placement, "the deadline stands placed at registration");
  assert.equal(expectation.placement?.system, "gregorian");
  assert.equal(expectation.placement?.deadlineFixed, fixed(2026, 11, 20), "the deadline's date on the grid");
  assert.match(expectation.placement?.line ?? "", /conversation's own timeline/);
  // Past the deadline, the timeout's evidence cites the
  // placement it was evaluated against.
  const laterProbe = clockedSession(fixtureClock("2026-11-20T21:00:00.000Z"));
  const outcomes = sweepExpectations(s, standingOf(laterProbe), {});
  const timeout = outcomes.find((o) => o.outcome === "timed-out");
  assert.ok(timeout, "the watch times out past its deadline");
  assert.match(timeout.detail, /placed on the gregorian grid/);
  assert.match(timeout.detail, /evaluated against that placement/);
});
