/**
 * ansci-geography-g3.test.ts — Geography G3 (2026-11-20;
 * design note docs/ansci/geography-design-note.md §4.3,
 * §5.3, §9.3): how-far as computation — both endpoints
 * resolved through the register protocol, the road figure
 * computed by OSRM and banked at the 7-day route shelf life
 * under a derived provenance, the straight line always
 * available from the points, and the derivation visible in
 * the trace.
 *
 * Fixtures: the OSRM response under
 * test/fixtures/osrm-route-oklahoma-city-tulsa.json was
 * RECORDED LIVE from routing.openstreetmap.de on
 * 2026-11-20 (Oklahoma City → Tulsa: 171260.1 m, 6794.7 s),
 * as were the Nominatim fixtures (G1). Tests never touch
 * the network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";
import { PlaceRegister } from "../src/ansci/geography";
import { WikidataBank } from "../src/ansci/wikidata-bank";
import { FixtureNominatimSource } from "../src/ansci/geography-client";
import {
  FixtureOsrmSource,
  buildRouteUrl,
  parseOsrmRoute,
  type OsrmLookupResult,
  type OsrmSource,
} from "../src/ansci/osrm-client";
import { detectGeographyQuestion, processTurnWithGeography } from "../src/ansci/geography-turn";

function fixturesDir(): string {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "test", "fixtures");
    if (fs.existsSync(path.join(candidate, "nominatim", "search-oklahoma-city.json"))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(__dirname, "fixtures");
}
const FIXTURES = fixturesDir();
const loadJson = (rel: string): unknown =>
  JSON.parse(fs.readFileSync(path.join(FIXTURES, rel), "utf8"));

const nominatimResponses = {
  "Oklahoma City": loadJson("nominatim/search-oklahoma-city.json"),
  Tulsa: loadJson("nominatim/search-tulsa.json"),
  Springfield: loadJson("nominatim/search-springfield.json"),
};

const OKC = { lat: 35.4729886, lon: -97.5170536 };
const TULSA = { lat: 36.1563122, lon: -95.9927516 };

class StubOsrm implements OsrmSource {
  calls = 0;
  constructor(private readonly down = false) {}
  async route(
    from: { lat: number; lon: number },
    to: { lat: number; lon: number },
  ): Promise<OsrmLookupResult> {
    this.calls++;
    if (this.down) return { status: "unavailable", reason: "stub: routing source down (fixture)" };
    const parsed = parseOsrmRoute(loadJson("osrm-route-oklahoma-city-tulsa.json"));
    void from;
    void to;
    return parsed ? { status: "ok", data: parsed } : { status: "unavailable", reason: "fixture parse" };
  }
}

function howFarOpts(register: PlaceRegister, osrm: OsrmSource) {
  return {
    placeRegister: register,
    wikidataBank: new WikidataBank(),
    geographySource: new FixtureNominatimSource(nominatimResponses),
    osrm,
    retrievedFrom: "fixture",
  };
}

test("G3: the route URL puts longitude first, and the recorded response parses to its raw quantities", () => {
  assert.equal(
    buildRouteUrl("https://routing.openstreetmap.de/routed-car/route/v1", OKC, TULSA),
    "https://routing.openstreetmap.de/routed-car/route/v1/driving/-97.5170536,35.4729886;-95.9927516,36.1563122?overview=false",
  );
  const route = parseOsrmRoute(loadJson("osrm-route-oklahoma-city-tulsa.json"));
  assert.equal(route?.distanceMeters, 171260.1);
  assert.equal(route?.durationSeconds, 6794.7);
  assert.equal(parseOsrmRoute({ code: "NoRoute", routes: [] }), undefined);
  assert.equal(parseOsrmRoute({ code: "Ok", routes: [] }), undefined);
});

test("G3: the fixture OSRM source serves only the recorded point pair", async () => {
  const source = new FixtureOsrmSource({
    [FixtureOsrmSource.key(OKC, TULSA)]: loadJson("osrm-route-oklahoma-city-tulsa.json"),
  });
  const hit = await source.route(OKC, TULSA);
  assert.equal(hit.status, "ok");
  const miss = await source.route(TULSA, OKC);
  assert.equal(miss.status, "unavailable");
});

test("G3: the how-far shapes detect, in all three surface forms", () => {
  const a = detectGeographyQuestion("how far is tulsa from oklahoma city?");
  assert.equal(a?.kind, "how-far");
  assert.equal(a?.kind === "how-far" ? a.toName : "", "tulsa");
  assert.equal(a?.kind === "how-far" ? a.fromName : "", "oklahoma city");

  const b = detectGeographyQuestion("how far is it from oklahoma city to tulsa?");
  assert.equal(b?.kind === "how-far" ? b.fromName : "", "oklahoma city");
  assert.equal(b?.kind === "how-far" ? b.toName : "", "tulsa");

  const c = detectGeographyQuestion("how long does it take to drive from oklahoma city to tulsa?");
  assert.equal(c?.kind, "how-far");

  const d = detectGeographyQuestion("how far is tulsa from here?");
  assert.equal(d?.kind === "how-far" ? d.fromName : "x", undefined);
  assert.equal(d?.kind === "how-far" ? d.toName : "", "tulsa");
});

test("G3: how-far resolves both endpoints, computes, banks at 7 days with derived provenance — and the repeat is served from the bank", async () => {
  const register = new PlaceRegister();
  const osrm = new StubOsrm();
  const opts = howFarOpts(register, osrm);

  const first = await processTurnWithGeography(
    newSession(),
    "how far is tulsa from oklahoma city?",
    opts,
  );
  assert.equal(first.trace.geography?.action, "looked-up-and-banked");
  assert.equal(first.trace.geography?.shape, "how-far");
  // 171.26 km of road ≈ 106 miles; 6794.7 s ≈ 1 h 53 min;
  // the crow flies ≈ 157.0 km ≈ 98 miles.
  assert.match(first.reply, /Tulsa is about 106 road-miles from Oklahoma City \(about 1 h 53 min by road\); as the crow flies, about 98 miles\./);
  assert.match(first.reply, /computed by OSRM from the two resolved points/);
  assert.equal(osrm.calls, 1);
  // The derivation is in the trace: both resolved points,
  // the raw quantities, the fetch time.
  assert.match(first.trace.geography!.detail, /35\.4729886, -97\.5170536/);
  assert.match(first.trace.geography!.detail, /36\.1563122, -95\.9927516/);
  assert.match(first.trace.geography!.detail, /171260\.1 m \/ 6794\.7 s/);

  const banked = register.routeFor("Oklahoma City", "Tulsa");
  assert.ok(banked);
  assert.equal(banked!.provenance.kind, "derived");
  assert.equal(
    new Date(banked!.expiresAt).getTime() - new Date(banked!.fetchedAt).getTime(),
    7 * 86_400_000,
  );

  const repeat = await processTurnWithGeography(
    newSession(),
    "how far is tulsa from oklahoma city?",
    opts,
  );
  assert.equal(repeat.trace.geography?.action, "answered-from-bank");
  assert.equal(repeat.reply, first.reply);
  assert.equal(osrm.calls, 1);
});

test("G3: a deictic end is supplied by the conversation's stated place", async () => {
  const register = new PlaceRegister();
  const osrm = new StubOsrm();
  const opts = howFarOpts(register, osrm);
  const session = newSession();
  processTurn(session, "i am in oklahoma city.");
  const result = await processTurnWithGeography(session, "how far is tulsa from here?", opts);
  assert.equal(result.trace.geography?.action, "looked-up-and-banked");
  assert.match(result.reply, /Tulsa is about 106 road-miles from Oklahoma City/);
});

test("G3: with the routing source down, the straight line still answers and names the missing road figure", async () => {
  const register = new PlaceRegister();
  const result = await processTurnWithGeography(
    newSession(),
    "how far is tulsa from oklahoma city?",
    howFarOpts(register, new StubOsrm(true)),
  );
  assert.equal(result.trace.geography?.action, "computed-straight-line");
  assert.match(result.reply, /as the crow flies/);
  assert.match(result.reply, /couldn't compute the road distance/);
  assert.equal(register.routeFor("Oklahoma City", "Tulsa"), undefined);
});

test("G3: the declines stand at the failing endpoint — ambiguous destination, missing situated place", async () => {
  const ambiguous = await processTurnWithGeography(
    newSession(),
    "how far is springfield from oklahoma city?",
    howFarOpts(new PlaceRegister(), new StubOsrm()),
  );
  assert.equal(ambiguous.trace.geography?.action, "place-ambiguous");
  assert.match(ambiguous.trace.geography!.detail, /the destination \(springfield\)/);

  const noPlace = await processTurnWithGeography(
    newSession(),
    "how far is tulsa from here?",
    howFarOpts(new PlaceRegister(), new StubOsrm()),
  );
  assert.equal(noPlace.trace.geography?.action, "no-place");
});
