/**
 * ansci-geography-g2.test.ts — Geography G2 (2026-11-20;
 * design note docs/ansci/geography-design-note.md §4.2,
 * §5.2, §9.2): the Overpass what's-there consultation —
 * bounded query templates as data, the category table, the
 * register's what's-there banking at the 30-day shelf life,
 * and the what's-near / what's-in / is-there shapes in the
 * geography wrapper, with the §9.4 declines at their
 * locations.
 *
 * FIXTURE PROVENANCE, STATED PLAINLY. The Overpass responses
 * under test/fixtures/overpass/ are CONSTRUCTED in the exact
 * envelope of a recorded response (the envelope fields are
 * from a real response this VM received on 2026-11-20), not
 * recorded: the public Overpass instance answered a small
 * query once and then returned "at capacity — all query
 * workers are busy" (HTTP 502) for every further query
 * during this build. The elements are real Oklahoma City
 * geography in the recorded shape; the parser, template,
 * banking and shape paths they exercise are the production
 * ones. The live acceptance gap is recorded in the G2
 * report — it is not papered over here. The Nominatim
 * fixtures ARE recorded live (G1).
 *
 * Tests never touch the network: the Overpass side is the
 * fixture source keyed by the templated query, or a counting
 * stub over the fixture elements.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { newSession } from "../src/ansci/session";
import { PlaceRegister } from "../src/ansci/geography";
import { WikidataBank } from "../src/ansci/wikidata-bank";
import { FixtureNominatimSource } from "../src/ansci/geography-client";
import {
  FixtureOverpassSource,
  buildWhatsThereQuery,
  categoryByKey,
  parseOverpassElements,
  type OverpassElement,
  type OverpassLookupResult,
  type OverpassSource,
  type WhatsThereCategory,
} from "../src/ansci/overpass-client";
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
  Springfield: loadJson("nominatim/search-springfield.json"),
  Zqxjkv: loadJson("nominatim/search-zqxjkv.json"),
};

const riversElements = parseOverpassElements(loadJson("overpass/rivers-oklahoma-city.json"))!;
const nearElements = parseOverpassElements(loadJson("overpass/near-oklahoma-city.json"))!;

class StubOverpass implements OverpassSource {
  calls = 0;
  constructor(private readonly data: OverpassElement[] | "down") {}
  async whatsThere(
    categories: readonly WhatsThereCategory[],
    latitude: number,
    longitude: number,
  ): Promise<OverpassLookupResult> {
    void categories;
    void latitude;
    void longitude;
    this.calls++;
    if (this.data === "down") {
      return { status: "unavailable", reason: "stub: the server is at capacity (fixture)" };
    }
    return { status: "ok", data: this.data };
  }
}

function geographyOpts(register: PlaceRegister, overpass: OverpassSource) {
  return {
    placeRegister: register,
    wikidataBank: new WikidataBank(),
    geographySource: new FixtureNominatimSource(nominatimResponses),
    overpass,
    retrievedFrom: "fixture",
  };
}

/* ---------------- the template ---------------- */

test("G2: the query template is bounded by construction — timeout, clamped radius and limit, category selectors only", () => {
  const river = categoryByKey("river")!;
  const q = buildWhatsThereQuery([river], 35.473, -97.517, 999_999, 9999);
  assert.match(q, /\[timeout:25\]/);
  assert.match(q, /around:25000,35\.473,-97\.517/);
  assert.match(q, /out tags center 50;/);
  assert.match(q, /way\["waterway"="river"\]/);
  // No raw passthrough exists: the source interface takes
  // categories and a point, and the fixture source serves
  // only the exact templated string.
});

test("G2: the response parser reads node points and way centres, names and tags; a non-response parses to undefined", () => {
  assert.equal(riversElements.length, 2);
  assert.equal(riversElements[0].name, "North Canadian River");
  assert.equal(riversElements[0].latitude, 35.4666);
  assert.equal(riversElements[1].name, undefined);
  assert.equal(parseOverpassElements({ remark: "runtime error" }), undefined);
  assert.equal(parseOverpassElements("502 Gateway Timeout"), undefined);
});

test("G2: the fixture Overpass source serves only the exact templated query", async () => {
  const river = categoryByKey("river")!;
  const query = buildWhatsThereQuery([river], 35.4729886, -97.5170536, 10_000);
  const source = new FixtureOverpassSource({ [query]: loadJson("overpass/rivers-oklahoma-city.json") });
  const hit = await source.whatsThere([river], 35.4729886, -97.5170536, 10_000);
  assert.equal(hit.status, "ok");
  const miss = await source.whatsThere([river], 35.0, -97.0, 10_000);
  assert.equal(miss.status, "unavailable");
});

/* ---------------- detection ---------------- */

test("G2: the shapes detect — category questions, the general question, is-there — and non-geography questions do not", () => {
  const rivers = detectGeographyQuestion("what rivers are near oklahoma city?");
  assert.equal(rivers?.kind, "whats-near");
  assert.deepEqual(rivers?.kind === "whats-near" ? rivers.categories : [], ["river"]);
  assert.equal(rivers?.placeName, "oklahoma city");

  const general = detectGeographyQuestion("what is in tulsa?");
  assert.equal(general?.kind, "whats-in");
  assert.ok((general?.kind === "whats-in" ? general.categories.length : 0) > 3);

  const isThere = detectGeographyQuestion("is there a river near oklahoma city?");
  assert.equal(isThere?.kind, "is-there");
  assert.equal(isThere?.kind === "is-there" ? isThere.category : "", "river");

  const deictic = detectGeographyQuestion("what is near me?");
  assert.equal(deictic?.kind, "whats-near");
  assert.equal(deictic?.placeName, undefined);

  assert.equal(detectGeographyQuestion("what is the weather in oklahoma city?"), undefined);
  assert.equal(detectGeographyQuestion("what is the capital of oklahoma?"), undefined);
  assert.equal(detectGeographyQuestion("how are you?"), undefined);
});

/* ---------------- the wrapper ---------------- */

test("G2: what's-near resolves the place by consultation, fetches once, banks the set — and the repeat costs no call of either kind", async () => {
  const register = new PlaceRegister();
  const overpass = new StubOverpass(riversElements);
  const opts = geographyOpts(register, overpass);

  const first = await processTurnWithGeography(newSession(), "what rivers are near oklahoma city?", opts);
  assert.equal(first.trace.geography?.action, "looked-up-and-banked");
  assert.equal(first.trace.geography?.shape, "whats-near");
  assert.match(first.reply, /North Canadian River \(river, [\d.]+ km\)/);
  assert.match(first.reply, /within 10 km of its resolved point/);
  assert.match(first.reply, /From OpenStreetMap via Overpass/);
  assert.equal(overpass.calls, 1);

  const banked = register.whatsThereFor("Oklahoma City", "river");
  assert.ok(banked);
  assert.equal(banked!.entries.length, 2);
  // Nearest first: the unnamed river way (~4.4 km) precedes
  // the named one — an attestation need not carry a name.
  assert.equal(banked!.entries[0].name, undefined);
  assert.ok(banked!.entries[0].distanceKm > 3 && banked!.entries[0].distanceKm < 5);
  assert.equal(banked!.entries[1].name, "North Canadian River");
  assert.ok(banked!.entries[1].distanceKm > 7 && banked!.entries[1].distanceKm < 8.5);
  assert.equal(banked!.provenance.kind, "retrieved");
  assert.equal(
    banked!.provenance.kind === "retrieved" ? banked!.provenance.dataset : "",
    "openstreetmap-overpass",
  );
  // The 30-day shelf life, from the fetch.
  assert.equal(
    new Date(banked!.expiresAt).getTime() - new Date(banked!.fetchedAt).getTime(),
    30 * 86_400_000,
  );

  const repeat = await processTurnWithGeography(newSession(), "what rivers are near oklahoma city?", opts);
  assert.equal(repeat.trace.geography?.action, "answered-from-bank");
  assert.equal(repeat.reply, first.reply);
  assert.equal(overpass.calls, 1);
});

test("G2: is-there answers yes with the nearest named attestation; the general what's-near lists across categories", async () => {
  const register = new PlaceRegister();
  const overpass = new StubOverpass(nearElements);
  const opts = geographyOpts(register, overpass);

  const yes = await processTurnWithGeography(newSession(), "is there a river near oklahoma city?", opts);
  assert.match(yes.reply, /^Yes — North Canadian River is about [\d.]+ km from Oklahoma City\./);

  const general = await processTurnWithGeography(newSession(), "what is near oklahoma city?", opts);
  assert.equal(general.trace.geography?.action, "looked-up-and-banked");
  assert.match(general.reply, /Scissortail Park \(park,/);
  assert.match(general.reply, /Santa Fe Depot \(station,/);
  assert.match(general.reply, /OU Medical Center \(hospital,/);
});

test("G2: an attested absence answers as the source's absence, not the world's", async () => {
  const register = new PlaceRegister();
  const overpass = new StubOverpass([]);
  const result = await processTurnWithGeography(
    newSession(),
    "is there a hospital near oklahoma city?",
    geographyOpts(register, overpass),
  );
  assert.equal(result.trace.geography?.action, "looked-up-and-banked");
  assert.match(result.reply, /I found no hospital within 10 km of Oklahoma City in OpenStreetMap's data\./);
});

test("G2: the declines stand at their locations — no place, unresolvable place, ambiguous place, source down, stale-only set", async () => {
  // No place anywhere: GeographyAwareness's gap (§9.4).
  const noPlace = await processTurnWithGeography(
    newSession(),
    "what is near me?",
    geographyOpts(new PlaceRegister(), new StubOverpass(riversElements)),
  );
  assert.equal(noPlace.trace.geography?.action, "no-place");
  assert.match(noPlace.reply, /don't know where you are/);

  // A place nobody can resolve (§9.4: unresolvable).
  const unresolved = await processTurnWithGeography(
    newSession(),
    "what rivers are near zqxjkv?",
    geographyOpts(new PlaceRegister(), new StubOverpass(riversElements)),
  );
  assert.equal(unresolved.trace.geography?.action, "place-unresolved");

  // Namesakes the ranker cannot separate (§9.4: ambiguous).
  const ambiguous = await processTurnWithGeography(
    newSession(),
    "what is near springfield?",
    geographyOpts(new PlaceRegister(), new StubOverpass(riversElements)),
  );
  assert.equal(ambiguous.trace.geography?.action, "place-ambiguous");
  assert.match(ambiguous.reply, /More than one place is called springfield/);

  // The source down with nothing banked (§9.4: unavailable).
  const down = await processTurnWithGeography(
    newSession(),
    "what rivers are near oklahoma city?",
    geographyOpts(new PlaceRegister(), new StubOverpass("down")),
  );
  assert.equal(down.trace.geography?.action, "source-unavailable");
  assert.match(down.reply, /what's-there source is unavailable/);

  // A stale set the source cannot refresh (§9.4: stale-only).
  const register = new PlaceRegister();
  register.bankPlace({
    name: "Oklahoma City",
    coordinates: { lat: 35.4729886, lon: -97.5170536, standsFor: "Oklahoma City, Oklahoma, United States" },
    provenance: { kind: "configured", detail: "test" },
    fetchedAt: new Date().toISOString(),
  });
  register.bankWhatsThere(
    "Oklahoma City",
    "river",
    [{ name: "North Canadian River", category: "river", lat: 35.4666, lon: -97.4339, distanceKm: 7.6 }],
    { kind: "configured", detail: "test" },
    new Date(Date.now() - 40 * 86_400_000).toISOString(),
  );
  const stale = await processTurnWithGeography(
    newSession(),
    "what rivers are near oklahoma city?",
    geographyOpts(register, new StubOverpass("down")),
  );
  assert.equal(stale.trace.geography?.action, "stale-only");
  assert.match(stale.reply, /out of date/);
});
