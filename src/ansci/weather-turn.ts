/**
 * weather-turn.ts — the weather wrapper (Probe-2 Slice 6,
 * 2026-11-20; the lookup re-pointed to api.weather.gov by
 * Probe-2 Slice 8; the place resolution lifted into the
 * geography pair by Geography G1): the async seam around the
 * synchronous turn, mirroring wikidata-turn.ts's division of
 * work.
 *
 * processTurn (turn.ts) is synchronous and every caller
 * depends on that; a live weather fetch is asynchronous, so
 * the fetch does not live inside processTurn. The
 * synchronous weather shape already does everything that
 * needs no network — the record answer, the place-gap
 * decline, the bank answer, and the located lookup-needed
 * decline. This wrapper runs the ordinary turn first, then
 * acts on exactly one outcome:
 *
 *   LOOKUP TRIGGER. The turn ended "lookup-needed": a place
 *   stands for the question and no fresh reading does. The
 *   wrapper resolves the place through the GEOGRAPHY PAIR's
 *   protocol (geography.ts's resolvePlace, the design note's
 *   §5): GeographyAwareness has already established which
 *   place the question is about (the synchronous shape read
 *   its situated reading); the GeographyKnowledgeUnit's
 *   register resolves it — banked first (the register, then
 *   the Wikidata bank imported on read), consulted on a miss
 *   (Nominatim: the place is geocoded, its namesakes ranked,
 *   the winner banked with retrieved provenance). The
 *   wrapper then fetches the current conditions from the
 *   weather source ADDRESSED BY those coordinates, BANKS
 *   the reading with its fetch time and shelf life
 *   (weather-bank.ts), and re-answers the question from the
 *   reading as this turn's reply — the trace's weather
 *   record says "looked-up-and-banked" and carries the fetch
 *   time and the retrieved provenance (dataset
 *   "api.weather.gov").
 *
 *   COORDINATES, NEVER GUESSED. Slice 8's rule stands, and
 *   G1 gives it its non-guessing route (§4.1): a point comes
 *   from the deployment's configuration, a banked record, or
 *   a Nominatim consultation — never from invention. A place
 *   none of those resolves declines located at the missing
 *   coordinates; a namesake set the ranker cannot separate
 *   declines located at the ambiguity; a stale-only holding
 *   whose re-consultation failed declines located at the
 *   staleness, and the stale point is never served.
 *
 *   OFFLINE HONESTY. If a source returns
 *   { status: "unavailable" }, the reply is the located
 *   lookup-unavailable decline — it says the system could
 *   not look the weather up; it does NOT say there is no
 *   weather, and it does not serve the stale reading. If
 *   the point is outside the weather source's coverage (the
 *   United States — the points lookup's 404), the decline
 *   names the coverage instead: a different gap from the
 *   source being down, and no other source is fallen back
 *   to silently (the non-US fallback is the owner's open
 *   question, geography-design-note §10 — not built).
 *
 * NO MASQUERADE. A reply resting on a fetched reading is a
 * plain statement of fact carrying its source —
 * "(From the National Weather Service.)" — never
 * derivation language.
 */
import { processTurn, type TurnResult } from "./turn";
import type { Session } from "./session";
import { HttpWeatherSource, type WeatherSource } from "./weather-client";
import {
  defaultWeatherBank,
  placeKeyOf,
  weatherFlagsForNwsText,
  weatherTtlMinutes,
  type WeatherBank,
  type WeatherReading,
} from "./weather-bank";
import { composeWeatherReply } from "./weather";
import { PLACE } from "./place";
import { defaultWikidataBank, type WikidataBank } from "./wikidata-bank";
import { defaultPlaceRegister, resolvePlace, type PlaceRegister } from "./geography";
import { HttpNominatimSource, type NominatimSource } from "./geography-client";
import { interlocutorPlace } from "./geography-awareness";

export interface WeatherTurnOptions {
  /** The lookup source (live HTTP by default; tests inject
   *  the fixture source). */
  source?: WeatherSource;
  /** The bank to read and write (the process-level default
   *  bank by default — the same bank the synchronous shape
   *  reads; tests may inject their own for the wrapper's
   *  writes, but the synchronous bank answer reads the
   *  default bank, as it does in production). */
  bank?: WeatherBank;
  /** The Wikidata bank the geography resolution imports
   *  coordinates from on read (the process-level default
   *  bank by default; tests inject a fresh one banked from
   *  fixtures). */
  wikidataBank?: WikidataBank;
  /** The place register the geography resolution runs over
   *  (the process-level default register by default; tests
   *  inject a fresh one). */
  placeRegister?: PlaceRegister;
  /** The Nominatim consultation the geography resolution
   *  makes on a register miss (live HTTP by default; tests
   *  inject the fixture source — gated tests never touch
   *  the network). */
  geographySource?: NominatimSource;
  /** The clock the fetch is stamped by (default: now).
   *  Injected so tests can place a reading inside or past
   *  its shelf life deterministically. */
  now?: () => Date;
  /** The shelf life stamped into banked readings, minutes
   *  (default: weatherTtlMinutes()). */
  ttlMinutes?: number;
  /** Provenance label for the route the reading came
   *  through (default "live"; fixture callers pass
   *  "fixture"). */
  retrievedFrom?: string;
}

/**
 * The configured seat's coordinates enter the resolution
 * through the register (§2.3's configured step): when the
 * place in force IS the configured place and the deployment
 * configured coordinates with it, bank them as a
 * configured-provenance fact, so the register is the one
 * store the resolution reads and the fact's attestation is
 * the configuration itself.
 */
function bankConfiguredCoordinates(register: PlaceRegister, place: string, now: Date): void {
  if (
    PLACE.place &&
    placeKeyOf(place) === placeKeyOf(PLACE.place) &&
    typeof PLACE.latitude === "number" &&
    typeof PLACE.longitude === "number"
  ) {
    register.bankPlace({
      name: PLACE.place,
      coordinates: { lat: PLACE.latitude, lon: PLACE.longitude, standsFor: PLACE.place },
      provenance: {
        kind: "configured",
        detail: "the Place table's configuration (GeographyAwareness's seat): the deployment configured these coordinates for its place",
      },
      fetchedAt: now.toISOString(),
    });
  }
}

/** The ranker's proximity evidence (§6): the conversation's
 *  situated place, when it is a DIFFERENT place from the one
 *  being resolved and the register already holds its point.
 *  Best-effort evidence — absent, the ranking runs on its
 *  other signals exactly as before. */
function situatedEvidence(
  session: Session,
  targetPlace: string,
  register: PlaceRegister,
  now: Date,
): { name: string; lat: number; lon: number } | undefined {
  const stated = interlocutorPlace(session);
  if (!stated || placeKeyOf(stated.place) === placeKeyOf(targetPlace)) return undefined;
  const coords = register.freshCoordinates(stated.place, now);
  return coords ? { name: stated.place, lat: coords.value.lat, lon: coords.value.lon } : undefined;
}

export async function processTurnWithWeather(
  session: Session,
  text: string,
  opts: WeatherTurnOptions = {},
): Promise<TurnResult> {
  const result = processTurn(session, text);
  const record = result.trace.weather;
  if (!record || record.action !== "lookup-needed" || !record.place) {
    return result;
  }
  const source = opts.source ?? new HttpWeatherSource();
  const bank = opts.bank ?? defaultWeatherBank;
  const wikidataBank = opts.wikidataBank ?? defaultWikidataBank;
  const register = opts.placeRegister ?? defaultPlaceRegister;
  const geographySource = opts.geographySource ?? new HttpNominatimSource();
  const now = (opts.now ?? (() => new Date()))();
  const ttl = opts.ttlMinutes ?? weatherTtlMinutes();
  const statedPlace = record.place;

  const decline = (
    action: "lookup-unavailable" | "coordinates-missing" | "source-coverage" | "place-ambiguous" | "stale-only",
    reply: string,
    detail: string,
    declineReason: string,
  ): TurnResult => {
    result.trace.weather = {
      ...record,
      action,
      detail,
      priorDecline: result.reply,
    };
    result.trace.declineReason = declineReason;
    result.trace.planNote =
      "weather wrapper (Probe-2 Slice 8; geography resolution G1): the synchronous turn's lookup-needed " +
      "decline was replaced by the wrapper's own located decline — the lookup's outcome, not a weather claim";
    return { reply, trace: result.trace };
  };

  // The geography pair's protocol (§5): the register
  // resolves the place — configured, banked, consulted.
  bankConfiguredCoordinates(register, statedPlace, now);
  const resolution = await resolvePlace(statedPlace, {
    register,
    wikidataBank,
    nominatim: geographySource,
    situatedPlace: situatedEvidence(session, statedPlace, register, now),
    now,
    retrievedFrom: opts.retrievedFrom ?? "live",
  });

  if (resolution.kind === "ambiguous") {
    const leaders = resolution.leaders.map((b) => b.candidate.description ?? b.candidate.label).join("; ");
    // DRAFT wording — the owner's to settle.
    return decline(
      "place-ambiguous",
      `More than one place is called ${statedPlace} — ${leaders} — and I can't tell which one you mean, so I have no reading for it.`,
      `the geography resolution for "${statedPlace}" ended ambiguous: ${resolution.detail} (Geography G1)`,
      `the question asks for the weather in ${statedPlace}, but the name is borne by several places and ` +
        `the ranking does not separate them; the gap is located at the ambiguous place (§6)`,
    );
  }
  if (resolution.kind === "unavailable") {
    // DRAFT wording — the owner's to settle (carried from
    // Slice 6 unchanged: the decline names the failed
    // lookup, not an absence of weather).
    return decline(
      "lookup-unavailable",
      `I couldn't look the weather up just now — the weather source is unavailable, so I have no reading for ${statedPlace}.`,
      `the geography consultation for "${statedPlace}" returned unavailable: ${resolution.reason} (Geography G1)`,
      `the question asks for the weather in ${statedPlace}, and a place stands for it, but the lookup ` +
        `that could have placed it was unavailable (${resolution.reason}); the gap is located at the unavailable lookup (§6)`,
    );
  }
  if (resolution.kind === "stale-only") {
    // DRAFT wording — the owner's to settle.
    return decline(
      "stale-only",
      `The only coordinates I hold for ${statedPlace} are out of date, and I couldn't refresh them, so I have no reading for it.`,
      `the geography resolution for "${statedPlace}" ended stale-only: ${resolution.detail} (Geography G1)`,
      `the question asks for the weather in ${statedPlace}, and the only coordinates held for it are ` +
        `past their shelf life, with re-consultation failing to refresh them; stale facts are not ` +
        `served as current — the gap is located at the stale holding (§6)`,
    );
  }
  if (resolution.kind === "unresolved" || !resolution.place.coordinates) {
    // DRAFT wording — the owner's to settle (Slice 8's
    // wording, standing: after G1 the holding it names
    // includes the register and the consultation's result).
    return decline(
      "coordinates-missing",
      `I have no coordinates for ${statedPlace} in what I hold, and my weather source reads weather for a point, so I have no reading for it.`,
      resolution.kind === "unresolved"
        ? `the geography resolution for "${statedPlace}" ended unresolved: ${resolution.detail}; the source is never given a guessed point (Geography G1)`
        : `the geography resolution for "${statedPlace}" resolved the place but banked no coordinates for it; the source is never given a guessed point (Geography G1)`,
      `the question asks for the weather in ${statedPlace}, and a place stands for it, but no coordinates ` +
        `for the place stand in what the system holds — the register misses it, the Wikidata bank holds ` +
        `none to import, and the geocoding consultation resolved none; the weather source reads weather ` +
        `for a point, and a point is never guessed; the gap is located at the missing coordinates (§6)`,
    );
  }
  const coordinates = resolution.place.coordinates.value;
  const coordinatesVia = resolution.via;

  const conditions = await source.currentConditions(coordinates.lat, coordinates.lon);
  if (conditions.status === "out-of-coverage") {
    // DRAFT wording — the owner's to settle.
    return decline(
      "source-coverage",
      `My weather source covers the United States, and ${statedPlace} is outside it, so I have no reading for it.`,
      `the coordinates for "${statedPlace}" (${coordinates.lat}, ${coordinates.lon}, via ` +
        `${coordinatesVia}) were put to the source, and the points lookup answered 404: ${conditions.reason} ` +
        `(Probe-2 Slice 8)`,
      `the question asks for the weather in ${statedPlace}, and the point the system holds for it is ` +
        `outside the weather source's coverage (the United States); no other source is consulted in its ` +
        `place; the gap is located at the source's coverage (§6)`,
    );
  }
  if (conditions.status === "unavailable") {
    // DRAFT wording — the owner's to settle (carried from
    // Slice 6 unchanged: the decline names the failed
    // lookup, not an absence of weather).
    return decline(
      "lookup-unavailable",
      `I couldn't look the weather up just now — the weather source is unavailable, so I have no reading for ${statedPlace}.`,
      `the conditions lookup for "${statedPlace}" at ${coordinates.lat}, ${coordinates.lon} ` +
        `(via ${coordinatesVia}) returned unavailable: ${conditions.reason} (Probe-2 Slice 8)`,
      `the question asks for the weather in ${statedPlace}, and a place stands for it, but the weather ` +
        `source could not be reached for a reading; the gap is located at the unavailable lookup (§6)`,
    );
  }
  const observation = conditions.data;
  const flags = weatherFlagsForNwsText(observation.conditionText, observation.precipitationMm);
  const reading: WeatherReading = {
    placeKey: placeKeyOf(statedPlace),
    statedPlace,
    resolvedName: observation.resolvedName,
    latitude: coordinates.lat,
    longitude: coordinates.lon,
    temperatureC: observation.temperatureC,
    condition: observation.conditionText.toLowerCase(),
    raining: flags.raining,
    snowing: flags.snowing,
    ...(observation.precipitationMm !== undefined ? { precipitationMm: observation.precipitationMm } : {}),
    observedAt: observation.timeISO,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttl * 60_000).toISOString(),
    source: "api.weather.gov",
    retrievedFrom: opts.retrievedFrom ?? "live",
  };
  bank.put(reading);
  result.trace.weather = {
    ...record,
    action: "looked-up-and-banked",
    fetchedAt: reading.fetchedAt,
    expiresAt: reading.expiresAt,
    detail:
      `coordinates for "${statedPlace}" from ${coordinatesVia}: ${coordinates.lat}, ` +
      `${coordinates.lon}; the point lookup resolved ${observation.resolvedName}, and station ` +
      `${observation.stationId}'s latest observation (reported ${observation.timeISO}) reads ` +
      `${observation.temperatureC}°C, ${observation.conditionText}` +
      `${observation.precipitationMm !== undefined ? `, precipitation ${observation.precipitationMm} mm in the last hour` : ""}; ` +
      `banked with fetchedAt ${reading.fetchedAt} and shelf life ${ttl} minutes ` +
      `(expires ${reading.expiresAt}), retrieved provenance api.weather.gov via ${reading.retrievedFrom} ` +
      `(Probe-2 Slice 8; geography resolution G1)`,
    priorDecline: result.reply,
  };
  result.trace.declineReason = undefined;
  result.trace.planNote =
    "answered from a fetched weather reading (Probe-2 Slice 8; geography resolution G1): the geography " +
    "pair resolved the place to coordinates (register, bank import, or Nominatim consultation), the " +
    "wrapper fetched the station's current observation from api.weather.gov and banked it with its " +
    "fetch time and shelf life; the reply states the reading and its source";
  result.trace.wordingNotDerived = true;
  return { reply: composeWeatherReply(reading, record.shape), trace: result.trace };
}
