/**
 * osrm-client.ts — the OSRM endpoint client for how-far
 * questions (Geography G3, 2026-11-20; design note
 * docs/ansci/geography-design-note.md §4.3).
 *
 * A ROUTE IS A COMPUTATION, NOT A TESTIMONY (§4.3). OSRM
 * computes a route over OpenStreetMap's road graph between
 * two points the register already holds; the client returns
 * the raw computed quantities (distance in metres, duration
 * in seconds) and the caller composes the answer AS a
 * computation, with its derivation — the resolved points,
 * the source, the fetch time — visible in the trace. The
 * client itself banks nothing and asserts nothing.
 *
 * DISCIPLINE. API access only, no local routing graph; the
 * endpoint is configurable via the OSRM_BASE_URL environment
 * variable, defaulting to the FOSSGIS routing server
 * (routing.openstreetmap.de — its route path form is
 * /routed-car/route/v1/driving/...). Requests carry an
 * identifying User-Agent and are throttled to one per
 * second, Nominatim's discipline (§4.3: the demo server's
 * usage policy asks no more). A failure — HTTP error, 429,
 * a non-Ok body, a fetch throw — returns
 * { status: "unavailable", reason }; it never throws across
 * the interface, and an unavailable route never blocks the
 * straight-line figure, which the caller computes from the
 * points themselves (§9.3).
 */
import type { FetchLike } from "./wikidata-client";
import { RateThrottle } from "./geography-client";

export const OSRM_DEFAULT_BASE_URL = "https://routing.openstreetmap.de/routed-car/route/v1";
export const OSRM_USER_AGENT =
  "AnSci-Geography/0.1 (classical-AI research; on-demand routing computation; contact noct@muse.ai)";

/** The endpoint in force: env override, else the default. */
export function osrmBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const v = env.OSRM_BASE_URL;
  return v && v.trim() ? v.trim() : OSRM_DEFAULT_BASE_URL;
}

/** One computed route: the raw quantities, unrounded — the
 *  composition layer decides the answer's precision. */
export interface OsrmRoute {
  distanceMeters: number;
  durationSeconds: number;
}

export type OsrmLookupResult =
  | { status: "ok"; data: OsrmRoute }
  | { status: "unavailable"; reason: string };

/** Parse an OSRM route response: code "Ok" and the first
 *  route's distance/duration. Anything else is not a route
 *  (undefined) — the caller renders the computation
 *  unavailable, never a zero distance. */
export function parseOsrmRoute(data: unknown): OsrmRoute | undefined {
  if (!data || typeof data !== "object") return undefined;
  const body = data as { code?: unknown; routes?: unknown };
  if (body.code !== "Ok" || !Array.isArray(body.routes) || !body.routes.length) return undefined;
  const first = body.routes[0] as { distance?: unknown; duration?: unknown };
  if (typeof first.distance !== "number" || typeof first.duration !== "number") return undefined;
  return { distanceMeters: first.distance, durationSeconds: first.duration };
}

/** The route URL for a point pair: longitude first, as the
 *  API takes them — the reverse of the register's order, and
 *  a classic silent-error site, so it is built in exactly
 *  one place and pinned by the tests. */
export function buildRouteUrl(
  baseUrl: string,
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
): string {
  return `${baseUrl}/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
}

/** The source interface the how-far shape depends on. */
export interface OsrmSource {
  route(
    from: { lat: number; lon: number },
    to: { lat: number; lon: number },
  ): Promise<OsrmLookupResult>;
}

/** The live OSRM source. Fetch and throttle injectable. */
export class HttpOsrmSource implements OsrmSource {
  constructor(
    private readonly baseUrl: string = osrmBaseUrl(),
    private readonly fetchFn: FetchLike = (url, init) => fetch(url, init),
    private readonly throttle: RateThrottle = defaultOsrmThrottle,
  ) {}

  async route(
    from: { lat: number; lon: number },
    to: { lat: number; lon: number },
  ): Promise<OsrmLookupResult> {
    const url = buildRouteUrl(this.baseUrl, from, to);
    try {
      const res = await this.throttle.run(() =>
        this.fetchFn(url, {
          headers: { "User-Agent": OSRM_USER_AGENT, Accept: "application/json" },
        }),
      );
      if (!res.ok) {
        return {
          status: "unavailable",
          reason:
            res.status === 429
              ? `HTTP 429 from ${this.baseUrl} (the shared instance rate-limits; the computation was not retried)`
              : `HTTP ${res.status} from ${this.baseUrl}`,
        };
      }
      const route = parseOsrmRoute(await res.json());
      if (!route) {
        return { status: "unavailable", reason: "the response carried no route (code not Ok, or no routes)" };
      }
      return { status: "ok", data: route };
    } catch (err) {
      return {
        status: "unavailable",
        reason: `fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}

/** The shared throttle for the default endpoint: request
 *  starts spaced at least a second apart (§4.3). */
export const defaultOsrmThrottle = new RateThrottle(1000);

/**
 * The recorded-fixture OSRM source: serves committed route
 * responses keyed by the coordinate pair ("lat,lon>lat,lon"
 * at the register's precision), so gated tests exercise the
 * parser and the contract offline. A pair with no fixture
 * is "unavailable", not a zero route.
 */
export class FixtureOsrmSource implements OsrmSource {
  constructor(private readonly responses: Record<string, unknown> = {}) {}

  static key(from: { lat: number; lon: number }, to: { lat: number; lon: number }): string {
    return `${from.lat},${from.lon}>${to.lat},${to.lon}`;
  }

  async route(
    from: { lat: number; lon: number },
    to: { lat: number; lon: number },
  ): Promise<OsrmLookupResult> {
    const body = this.responses[FixtureOsrmSource.key(from, to)];
    if (body === undefined) {
      return {
        status: "unavailable",
        reason: "no fixture recorded for this point pair (fixture source is offline and bounded)",
      };
    }
    const route = parseOsrmRoute(body);
    if (!route) {
      return { status: "unavailable", reason: "the fixture for this pair carries no route" };
    }
    return { status: "ok", data: route };
  }
}
