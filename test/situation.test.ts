/**
 * situation.test.ts — slice 2b acceptance, §8.14 (SA-*) in their 2b
 * (canonical-fallback) form: the December rule, tonight from the
 * canonical profile, the unknown place, the small hours, and the shadow
 * Situation that never touches the real one.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChatGraph, getDefaultExtract } from "../src/wordnet";
import {
  computeSituation,
  type SituationLocation,
} from "../src/situation";
import {
  createSession,
  graphStampFor,
  runTurn,
  type SessionState,
} from "../src/router";

const graph = buildChatGraph();
const extract = getDefaultExtract();

const CHICAGO: SituationLocation = { lat: 41.878, lon: -87.63, source: "host-config", label: "Chicago" };
const SYDNEY: SituationLocation = { lat: -33.869, lon: 151.209, source: "host-config", label: "Sydney" };
/** 25 December 2026, midday UTC — deep in the solstice arcs both ways. */
const DEC25 = new Date("2026-12-25T12:00:00Z");

function session(): SessionState {
  return createSession(graphStampFor(extract));
}

const placeResolver = (name: string) => {
  const places: Record<string, { lat: number; lon: number; label: string }> = {
    sydney: { lat: -33.869, lon: 151.209, label: "Sydney" },
    chicago: { lat: 41.878, lon: -87.63, label: "Chicago" },
  };
  return places[name.toLowerCase()];
};

test("SA-DECEMBER: one instant, opposite seasons and phases (the December rule)", () => {
  const north = computeSituation({ instant: DEC25, timezone: "America/Chicago", location: CHICAGO });
  const south = computeSituation({ instant: DEC25, timezone: "Australia/Sydney", location: SYDNEY });
  assert.equal(north.derived.seasonHere, "winter");
  assert.equal(south.derived.seasonHere, "summer");
  assert.equal(north.derived.hemisphere, "north");
  assert.equal(south.derived.hemisphere, "south");
  // Opposite predominant phases: winter's light is Yin-predominant;
  // summer's is Yin-faint (Yang-predominant).
  assert.equal(north.derived.lightAspect.band, "predominant");
  assert.equal(south.derived.lightAspect.band, "faint");
  assert.equal(north.derived.lightAspect.source, "canonical");

  // And through the turn pipeline, each place answers for itself.
  const sN = session();
  const rN = runTurn(graph, sN, "is it winter here?", {
    extract, experienceDir: null, now: DEC25, timezone: "America/Chicago", location: CHICAGO,
  });
  assert.match(rN.rendered.text, /Yes/);
  const sS = session();
  const rS = runTurn(graph, sS, "is it winter here?", {
    extract, experienceDir: null, now: DEC25, timezone: "Australia/Sydney", location: SYDNEY,
  });
  assert.match(rS.rendered.text, /No/);
  assert.match(rS.rendered.text, /summer/);
});

test("SA-TONIGHT (canonical form): a long December night, answered plainly", () => {
  const s = session();
  const r = runTurn(graph, s, "will tonight be long?", {
    extract, experienceDir: null, now: DEC25, timezone: "America/Chicago", location: CHICAGO,
  });
  assert.equal(r.decision.kind, "route");
  if (r.decision.kind === "route") assert.equal(r.decision.intent.intentType, "situation");
  assert.equal(r.rendered.mode, "plain");
  assert.match(r.rendered.text, /long/);
  assert.doesNotMatch(r.rendered.text, /\bYin\b|\bYang\b|Wuxing|canonical/);
  const tonight = r.trace.conclusions.find((c) => c.relation === "TONIGHT");
  assert.equal(tonight?.facts?.source, "canonical");
});

test("SA-UNKNOWN-PLACE: no location configured — no place is fabricated", () => {
  const s = session();
  const r = runTurn(graph, s, "is it winter here?", {
    extract, experienceDir: null, now: DEC25, timezone: "America/Chicago",
  });
  assert.equal(r.decision.kind, "decline");
  if (r.decision.kind === "decline") {
    assert.match(r.decision.decisionReason, /unknown-location/);
  }
  assert.match(r.rendered.text, /don't know where I am/);
  assert.doesNotMatch(r.rendered.text, /Chicago|Sydney|Melbourne|London|New York/);
});

test("SA-SMALL-HOURS: 03:00 local is night, activity Yin-predominant", () => {
  const s = session();
  const r = runTurn(graph, s, "what time is it for you?", {
    extract,
    experienceDir: null,
    now: new Date("2026-11-08T03:00:00-06:00"),
    timezone: "America/Chicago",
    location: CHICAGO,
  });
  assert.equal(r.situation.derived.timeOfDayPhase, "night");
  assert.equal(r.situation.derived.activityAspect.yinProportion, 0.75);
  assert.equal(r.situation.derived.activityAspect.band, "predominant");
  assert.match(r.rendered.text, /night/);
});

test("SA-SHADOW: a hypothetical Sydney leaves the real Situation untouched", () => {
  const s = session();
  const opts = {
    extract,
    experienceDir: null,
    now: DEC25,
    timezone: "America/Chicago",
    location: CHICAGO,
    placeResolver,
  };
  const expectedReal = computeSituation({ instant: DEC25, timezone: "America/Chicago", location: CHICAGO });

  const r1 = runTurn(graph, s, "what if I were in Sydney — would it be winter there?", opts);
  assert.match(r1.rendered.text, /No/);
  assert.match(r1.rendered.text, /summer/);
  assert.ok(
    r1.trace.steps.some((st) => /hypothetical/.test(st.note ?? "")),
    "the trace marks the shadow values hypothetical",
  );
  assert.deepEqual(r1.situation.derived, expectedReal.derived);

  const r2 = runTurn(graph, s, "and here?", opts);
  assert.match(r2.rendered.text, /winter/);
  assert.deepEqual(r2.situation.derived, expectedReal.derived);
});
