/**
 * weather-turn.ts — the weather wrapper (Probe-2 Slice 6,
 * 2026-11-20; the lookup re-pointed to api.weather.gov by
 * Probe-2 Slice 8): the async seam around the synchronous
 * turn, mirroring wikidata-turn.ts's division of work.
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
 *   wrapper resolves the place's COORDINATES from records
 *   the system already holds (below), fetches the current
 *   conditions from the source, BANKS the reading with its
 *   fetch time and shelf life (weather-bank.ts), and
 *   re-answers the question from the reading as this turn's
 *   reply — the trace's weather record says
 *   "looked-up-and-banked" and carries the fetch time and
 *   the retrieved provenance (dataset "api.weather.gov").
 *
 *   COORDINATES, NEVER GUESSED. Slice 6's source
 *   (Open-Meteo) geocoded a place NAME to a point; the
 *   National Weather Service API reads weather for a point
 *   and offers no geocoding, and none is kept — a guessed
 *   or externally-geocoded point would put words in the
 *   system's mouth about where a place is. The coordinates
 *   come, in order, from:
 *     1. the Place table's configuration, when the
 *        resolved place IS the configured place and the
 *        deployment configured coordinates with it
 *        (place.ts);
 *     2. the Wikidata bank's record for the place — the
 *        coordinates (P625) banked as properties when the
 *        item was translated (wikidata-bank.ts); a banked
 *        record WITHOUT coordinates is the §3.6 incomplete
 *        case and supplies none.
 *   A place neither source holds coordinates for declines
 *   located at the missing coordinates — the gap is the
 *   coordinates, named as such.
 *
 *   OFFLINE HONESTY. If the source returns
 *   { status: "unavailable" }, the reply is the located
 *   lookup-unavailable decline — it says the system could
 *   not look the weather up; it does NOT say there is no
 *   weather, and it does not serve the stale reading. If
 *   the point is outside the source's coverage (the United
 *   States — the points lookup's 404), the decline names
 *   the coverage instead: a different gap from the source
 *   being down, and no other source is fallen back to
 *   silently.
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
  /** The Wikidata bank the place's coordinates are read
   *  from (the process-level default bank by default;
   *  tests inject a fresh one banked from fixtures). */
  wikidataBank?: WikidataBank;
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

/** Where a place's coordinates were found, in the
 *  resolution order the header states. */
interface HeldCoordinates {
  latitude: number;
  longitude: number;
  /** The ground, in words, for the trace. */
  via: string;
}

function heldCoordinatesFor(place: string, wikidataBank: WikidataBank): HeldCoordinates | undefined {
  // 1. The Place table's configuration, for the configured
  // place itself.
  if (
    PLACE.place &&
    placeKeyOf(place) === placeKeyOf(PLACE.place) &&
    typeof PLACE.latitude === "number" &&
    typeof PLACE.longitude === "number"
  ) {
    return {
      latitude: PLACE.latitude,
      longitude: PLACE.longitude,
      via: "the Place table's configuration (the deployment configured these coordinates for its place)",
    };
  }
  // 2. The Wikidata bank's record for the place.
  const node = wikidataBank.nodeByName(place);
  const { lat, lon } = node?.properties ?? {};
  if (node && typeof lat === "number" && typeof lon === "number") {
    return {
      latitude: lat,
      longitude: lon,
      via:
        `the Wikidata bank's record for ${node.name} (${node.qid}) — coordinates retrieved from ` +
        `Wikidata (P625) and banked with the item`,
    };
  }
  return undefined;
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
  const now = (opts.now ?? (() => new Date()))();
  const ttl = opts.ttlMinutes ?? weatherTtlMinutes();
  const statedPlace = record.place;

  const decline = (
    action: "lookup-unavailable" | "coordinates-missing" | "source-coverage",
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
      "weather wrapper (Probe-2 Slice 8): the synchronous turn's lookup-needed decline was replaced by " +
      "the wrapper's own located decline — the lookup's outcome, not a weather claim";
    return { reply, trace: result.trace };
  };

  const coordinates = heldCoordinatesFor(statedPlace, wikidataBank);
  if (!coordinates) {
    // DRAFT wording — the owner's to settle.
    return decline(
      "coordinates-missing",
      `I have no coordinates for ${statedPlace} in what I hold, and my weather source reads weather for a point, so I have no reading for it.`,
      `no coordinates for "${statedPlace}" stand in what the system holds: the Place table configures ` +
        `none for it, and the Wikidata bank holds no coordinates for it (no banked record, or a record ` +
        `banked without P625 — the §3.6 incomplete case); the source is never given a guessed point ` +
        `(Probe-2 Slice 8)`,
      `the question asks for the weather in ${statedPlace}, and a place stands for it, but no coordinates ` +
        `for the place stand in what the system holds — the weather source reads weather for a point, ` +
        `and a point is never guessed; the gap is located at the missing coordinates (§6)`,
    );
  }

  const conditions = await source.currentConditions(coordinates.latitude, coordinates.longitude);
  if (conditions.status === "out-of-coverage") {
    // DRAFT wording — the owner's to settle.
    return decline(
      "source-coverage",
      `My weather source covers the United States, and ${statedPlace} is outside it, so I have no reading for it.`,
      `the coordinates for "${statedPlace}" (${coordinates.latitude}, ${coordinates.longitude}, via ` +
        `${coordinates.via}) were put to the source, and the points lookup answered 404: ${conditions.reason} ` +
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
      `the conditions lookup for "${statedPlace}" at ${coordinates.latitude}, ${coordinates.longitude} ` +
        `(via ${coordinates.via}) returned unavailable: ${conditions.reason} (Probe-2 Slice 8)`,
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
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
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
      `coordinates for "${statedPlace}" from ${coordinates.via}: ${coordinates.latitude}, ` +
      `${coordinates.longitude}; the point lookup resolved ${observation.resolvedName}, and station ` +
      `${observation.stationId}'s latest observation (reported ${observation.timeISO}) reads ` +
      `${observation.temperatureC}°C, ${observation.conditionText}` +
      `${observation.precipitationMm !== undefined ? `, precipitation ${observation.precipitationMm} mm in the last hour` : ""}; ` +
      `banked with fetchedAt ${reading.fetchedAt} and shelf life ${ttl} minutes ` +
      `(expires ${reading.expiresAt}), retrieved provenance api.weather.gov via ${reading.retrievedFrom} ` +
      `(Probe-2 Slice 8)`,
    priorDecline: result.reply,
  };
  result.trace.declineReason = undefined;
  result.trace.planNote =
    "answered from a fetched weather reading (Probe-2 Slice 8): the wrapper took the place's " +
    "coordinates from what the system holds, fetched the station's current observation from " +
    "api.weather.gov and banked it with its fetch time and shelf life; the reply states the " +
    "reading and its source";
  result.trace.wordingNotDerived = true;
  return { reply: composeWeatherReply(reading, record.shape), trace: result.trace };
}
