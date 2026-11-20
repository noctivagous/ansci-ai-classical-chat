/**
 * weather-client.ts — the api.weather.gov endpoint client
 * for the weather adapter (Probe-2 Slice 6 built the
 * adapter on Open-Meteo; Probe-2 Slice 8, 2026-11-20,
 * re-points its live source here, on the owner's
 * suggestion), mirroring wikidata-client.ts's discipline
 * (§3.6's shape, applied to a weather source):
 *
 * API access only: no local weather database exists or is
 * consulted; banked readings (weather-bank.ts) are the
 * only local store. The base URL is configurable via
 * environment variable (WEATHER_GOV_BASE_URL), defaulting
 * to the public api.weather.gov. No API key — the National
 * Weather Service API needs none; a descriptive User-Agent
 * identifying the application and its contact IS required
 * by the service, and every request carries it.
 *
 * THE SOURCE'S SHAPE. api.weather.gov reads weather for a
 * POINT, not a name: there is no geocoding step here, by
 * design — coordinates come from records the system
 * already holds (the Wikidata bank's P625 properties, or
 * the Place table's configuration; weather-turn.ts owns
 * that resolution, and a place with no held coordinates
 * declines at the missing coordinates, never at a guessed
 * point). The lookup flow is the service's own:
 *
 *   GET /points/{lat,lon}            → the grid, the
 *     observation-stations URL, and the relative location
 *     the point resolves to (its nearest city);
 *   GET <observationStations>        → the stations for
 *     the grid, nearest first;
 *   GET /stations/{id}/observations/latest → the current
 *     conditions: temperature (°C, WMO units), the
 *     condition in the service's own words
 *     (textDescription), precipitation over the last hour.
 *
 * Current conditions come from the station observation,
 * not the grid forecast: the shapes ask what the weather
 * IS, the observation is measured rather than predicted,
 * and its temperature is natively Celsius.
 *
 * COVERAGE. The service covers the United States. A point
 * outside it is answered 404 ("Data Unavailable For
 * Requested Point") — a different fact from the source
 * being down, and the result type keeps it distinct:
 * { status: "out-of-coverage" }. The wrapper renders it
 * as the located coverage decline; it never falls back to
 * another source silently (whether a second source should
 * cover the rest of the world is undecided — see the
 * Slice 8 report).
 *
 * The fetch implementation is INJECTED (a FetchLike, the
 * same type the Wikidata client declares), and the whole
 * pipeline runs over a minimal JSON transport, so tests
 * substitute the fixture source — recorded api.weather.gov
 * responses served by URL — and never touch the network.
 *
 * Honesty about availability: a failed lookup returns
 * { status: "unavailable", reason } — it never throws
 * across the interface and never fabricates a reading.
 * Callers render that state as the located "lookup
 * unavailable" decline, never as "there is no weather".
 */
import type { FetchLike } from "./wikidata-client";

export const WEATHER_GOV_DEFAULT_BASE_URL = "https://api.weather.gov";
export const WEATHER_USER_AGENT =
  "AnSci-Weather-Adapter/0.2 (classical-AI research; contact: noct@muse.ai)";

export function weatherGovBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const v = env.WEATHER_GOV_BASE_URL;
  return v && v.trim() ? v.trim() : WEATHER_GOV_DEFAULT_BASE_URL;
}

/** A current-weather observation as the service reports
 *  it, reduced to the fields the shapes read, plus the
 *  resolution the point lookup supplied. */
export interface WeatherObservation {
  /** The station's observation time, ISO. */
  timeISO: string;
  temperatureC: number;
  /** The condition in the service's own words, verbatim
   *  ("Mostly Clear and Windy"). */
  conditionText: string;
  /** Precipitation over the last hour, in millimetres,
   *  when the station reported it. */
  precipitationMm?: number;
  /** The reporting station's identifier ("KPWA"). */
  stationId: string;
  /** The place the reading is FOR, as the point lookup
   *  names it ("El Reno, OK") — the nearest city to the
   *  point, honestly: a state's coordinate point resolves
   *  to a city near it, and the reply names that city, not
   *  the whole state. */
  resolvedName: string;
  latitude: number;
  longitude: number;
}

export type WeatherLookupResult<T> =
  | { status: "ok"; data: T }
  | { status: "unavailable"; reason: string }
  | { status: "out-of-coverage"; reason: string };

/** The source interface the weather turn layer depends
 *  on. The HTTP client and the fixture source both
 *  implement it. Coordinates in, an observation out: name
 *  resolution is not this interface's business (see the
 *  header). */
export interface WeatherSource {
  currentConditions(latitude: number, longitude: number): Promise<WeatherLookupResult<WeatherObservation>>;
}

/* ---------------- the transport and the pipeline ---------------- */

/** One JSON response, reduced to what the pipeline reads.
 *  A transport may also throw (a network failure, a
 *  fixture miss); the pipeline renders a throw as
 *  unavailable, with the error's message as the reason. */
interface JsonResponse {
  ok: boolean;
  status: number;
  data: unknown;
  /** Why the transport itself failed, when it threw
   *  (a network error, a fixture miss): the pipeline's
   *  unavailable reason carries it. */
  error?: string;
}

type JsonTransport = (url: string) => Promise<JsonResponse>;

export function pointsRequestUrl(baseUrl: string, latitude: number, longitude: number): string {
  return `${baseUrl}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

export function stationObservationUrl(baseUrl: string, stationId: string): string {
  return `${baseUrl}/stations/${stationId}/observations/latest`;
}

/** Parse a /points response body: the observation
 *  stations URL and the relative location, or undefined
 *  when the body does not carry them (a malformed
 *  response — the caller renders it unavailable). */
export function parsePoints(
  data: unknown,
): { observationStationsUrl: string; city?: string; state?: string } | undefined {
  const props = (data as { properties?: Record<string, unknown> })?.properties;
  if (!props || typeof props.observationStations !== "string") return undefined;
  const rel = props.relativeLocation as { properties?: Record<string, unknown> } | undefined;
  return {
    observationStationsUrl: props.observationStations,
    ...(typeof rel?.properties?.city === "string" ? { city: rel.properties.city } : {}),
    ...(typeof rel?.properties?.state === "string" ? { state: rel.properties.state } : {}),
  };
}

/** Parse a stations response body: the first (nearest)
 *  station's identifier, or undefined when the list is
 *  empty or malformed. */
export function parseStations(data: unknown): string | undefined {
  return parseStationIds(data)[0];
}

/** Parse a stations response body: every station identifier,
 *  nearest first. The list is a ranked set of witnesses, not
 *  a single answer — a station can stand in the list while
 *  serving no usable latest observation (its observation
 *  endpoint 404s, or its latest report carries no
 *  temperature, or — the service's own inconsistency, found
 *  live by Geography G1, 2026-11-20 — an empty
 *  textDescription for a report it elsewhere serves with
 *  its condition words). The lookup walks the list; see
 *  MAX_STATION_ATTEMPTS. */
export function parseStationIds(data: unknown): string[] {
  const features = (data as { features?: unknown[] })?.features;
  if (!Array.isArray(features)) return [];
  const ids: string[] = [];
  for (const f of features) {
    const id = (f as { properties?: Record<string, unknown> })?.properties?.stationIdentifier;
    if (typeof id === "string" && id) ids.push(id);
  }
  return ids;
}

/** How many of the nearest stations one lookup will try
 *  before it calls the observation step unavailable —
 *  bounded, so a bad grid point cannot fan out. Eight
 *  covers the failure cluster found live by Geography G1
 *  (2026-11-20, the Oklahoma state point: the nearest
 *  station 404s its latest observation, and the next two
 *  served the same report with an empty textDescription —
 *  a field the service itself serves inconsistently across
 *  requests for one report, verified in both of its
 *  representations — while the fourth station served a
 *  complete reading). */
export const MAX_STATION_ATTEMPTS = 8;

/** Parse a latest-observation response body, or
 *  undefined when it carries no usable temperature (a
 *  station whose latest report omits it — the caller
 *  renders it unavailable, never as a reading). The
 *  service reports in WMO units: degrees Celsius and
 *  millimetres natively; a Fahrenheit temperature, if one
 *  ever arrives, is converted and the fact is in the
 *  number, not hidden. */
export function parseLatestObservation(
  data: unknown,
): { timeISO: string; temperatureC: number; conditionText: string; precipitationMm?: number } | undefined {
  const props = (data as { properties?: Record<string, unknown> })?.properties;
  if (!props || typeof props.timestamp !== "string" || typeof props.textDescription !== "string" || !props.textDescription) {
    return undefined;
  }
  const temp = props.temperature as { value?: unknown; unitCode?: unknown } | undefined;
  if (!temp || typeof temp.value !== "number") return undefined;
  let temperatureC: number;
  if (temp.unitCode === "wmoUnit:degC" || temp.unitCode === undefined) {
    temperatureC = temp.value;
  } else if (temp.unitCode === "wmoUnit:degF") {
    temperatureC = Math.round(((temp.value - 32) * 5) / 9 * 10) / 10;
  } else {
    return undefined;
  }
  const precip = props.precipitationLastHour as { value?: unknown; unitCode?: unknown } | undefined;
  return {
    timeISO: props.timestamp,
    temperatureC,
    conditionText: props.textDescription,
    ...(precip && typeof precip.value === "number" && (precip.unitCode === "wmoUnit:mm" || precip.unitCode === undefined)
      ? { precipitationMm: precip.value }
      : {}),
  };
}

/** The lookup pipeline, shared by the HTTP source and the
 *  fixture source: point → stations → latest observation.
 *  A 404 from the points lookup is the coverage answer;
 *  any other failure is unavailability, with its reason. */
async function fetchCurrentConditions(
  get: JsonTransport,
  baseUrl: string,
  latitude: number,
  longitude: number,
): Promise<WeatherLookupResult<WeatherObservation>> {
  const call = async (url: string): Promise<JsonResponse> => {
    try {
      return await get(url);
    } catch (err) {
      return {
        ok: false,
        status: 0,
        data: undefined,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
  const pointsRes = await call(pointsRequestUrl(baseUrl, latitude, longitude));
  if (!pointsRes.ok) {
    if (pointsRes.status === 404) {
      return {
        status: "out-of-coverage",
        reason:
          `the points lookup for ${latitude}, ${longitude} returned 404 ("Data Unavailable For ` +
          `Requested Point") — api.weather.gov's coverage is the United States, and the point is outside it`,
      };
    }
    return {
      status: "unavailable",
      reason:
        pointsRes.status === 0
          ? `the points lookup could not be completed: ${pointsRes.error ?? "network failure"}`
          : `HTTP ${pointsRes.status} from the weather endpoint`,
    };
  }
  const failure = (res: JsonResponse, what: string): WeatherLookupResult<WeatherObservation> => ({
    status: "unavailable",
    reason:
      res.status === 0
        ? `${what} could not be completed: ${res.error ?? "network failure"}`
        : `HTTP ${res.status} from the weather endpoint (${what})`,
  });
  const points = parsePoints(pointsRes.data);
  if (!points) {
    return { status: "unavailable", reason: "the points response carried no observation stations" };
  }
  const stationsRes = await call(points.observationStationsUrl);
  if (!stationsRes.ok) return failure(stationsRes, "the stations lookup");
  const stationIds = parseStationIds(stationsRes.data);
  if (!stationIds.length) {
    return { status: "unavailable", reason: "the stations response carried no station" };
  }
  // The nearest stations, in order, until one serves a
  // usable latest observation (see parseStationIds: a
  // listed station with no servable observation is a normal
  // condition, not the lookup's failure). Bounded by
  // MAX_STATION_ATTEMPTS; the failure, when every attempt
  // fails, names how many stations were tried.
  const resolvedName = [points.city, points.state].filter(Boolean).join(", ");
  let lastFailure: WeatherLookupResult<WeatherObservation> | undefined;
  for (const stationId of stationIds.slice(0, MAX_STATION_ATTEMPTS)) {
    const obsRes = await call(stationObservationUrl(baseUrl, stationId));
    if (!obsRes.ok) {
      lastFailure = failure(obsRes, `the observation lookup for station ${stationId}`);
      continue;
    }
    const observation = parseLatestObservation(obsRes.data);
    if (!observation) {
      lastFailure = {
        status: "unavailable",
        reason: `station ${stationId}'s latest observation carried no usable reading (its temperature or its condition words missing)`,
      };
      continue;
    }
    return {
      status: "ok",
      data: {
        ...observation,
        stationId,
        resolvedName: resolvedName || stationId,
        latitude,
        longitude,
      },
    };
  }
  return {
    status: "unavailable",
    reason:
      `no usable latest observation from the ${Math.min(stationIds.length, MAX_STATION_ATTEMPTS)} nearest ` +
      `station(s): ${lastFailure?.status === "unavailable" ? lastFailure.reason : "none served a reading"}`,
  };
}

const defaultFetch: FetchLike = (url, init) => fetch(url, init);

/** The live api.weather.gov source. Fetch is injectable. */
export class HttpWeatherSource implements WeatherSource {
  constructor(
    private readonly baseUrl: string = weatherGovBaseUrl(),
    private readonly fetchFn: FetchLike = defaultFetch,
  ) {}

  private readonly transport: JsonTransport = async (url) => {
    const res = await this.fetchFn(url, {
      headers: { "User-Agent": WEATHER_USER_AGENT, Accept: "application/geo+json" },
    });
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = undefined;
    }
    return { ok: res.ok, status: res.status, data };
  };

  async currentConditions(latitude: number, longitude: number): Promise<WeatherLookupResult<WeatherObservation>> {
    return fetchCurrentConditions(this.transport, this.baseUrl, latitude, longitude);
  }
}

/**
 * The recorded-shape fixture source: serves committed
 * api.weather.gov JSON (test/fixtures/) BY URL through the
 * same pipeline, so gated tests exercise the client's
 * contract offline — the recorded bodies carry the real
 * absolute URLs, so the points body's own stations URL is
 * the key its stations fixture is served under. A URL no
 * fixture carries fails the lookup as unavailable — the
 * fixture set's limits are stated, not papered over.
 */
export class FixtureWeatherSource implements WeatherSource {
  constructor(private readonly responses: Record<string, { status: number; body: unknown }>) {}

  private readonly transport: JsonTransport = async (url) => {
    const entry = this.responses[url];
    if (!entry) {
      throw new Error(`no fixture recorded for ${url} (fixture source is offline and bounded)`);
    }
    return { ok: entry.status >= 200 && entry.status < 300, status: entry.status, data: entry.body };
  };

  async currentConditions(latitude: number, longitude: number): Promise<WeatherLookupResult<WeatherObservation>> {
    return fetchCurrentConditions(this.transport, WEATHER_GOV_DEFAULT_BASE_URL, latitude, longitude);
  }
}
