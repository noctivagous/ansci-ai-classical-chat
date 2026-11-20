/**
 * geography-client.ts — the Nominatim endpoint client for the
 * GeographyKnowledgeUnit (Geography G1, 2026-11-20; design
 * note docs/ansci/geography-design-note.md §4.1).
 *
 * API access only (owner ruling, as for Wikidata): no local
 * OpenStreetMap database, dump or mirror exists or is
 * consulted; the place register (geography.ts) is the only
 * local store, and it holds only what a consultation actually
 * returned, banked with provenance. The endpoint is
 * configurable via the NOMINATIM_BASE_URL environment
 * variable in the §2.3 style, defaulting to the public
 * Nominatim server. No API key; requests carry the
 * identifying User-Agent the usage policy requires.
 *
 * THE RATE IS PART OF THE DESIGN (§4.1). The public server's
 * usage policy allows at most 1 request per second. The HTTP
 * source enforces it in code — a shared throttle serialises
 * request starts at least one second apart; a caller never
 * bursts and never has to know. The clock and the sleep are
 * injectable so tests prove the spacing without waiting.
 *
 * The fetch implementation is INJECTED (a FetchLike, the same
 * type the Wikidata client declares), so tests substitute a
 * fixture source and never touch the network.
 *
 * Honesty about availability: a failed lookup returns
 * { status: "unavailable", reason } — it never throws across
 * the interface and never fabricates a candidate. A search
 * that resolves nothing is ok with an empty candidate list —
 * a different fact from the source being unavailable, and
 * the declines keep them distinct.
 */
import type { FetchLike } from "./wikidata-client";
import type { EntityCandidate } from "./entity-rank";

export const NOMINATIM_DEFAULT_BASE_URL = "https://nominatim.openstreetmap.org";
export const NOMINATIM_USER_AGENT =
  "AnSci-Geography/0.1 (classical-AI research; on-demand geocoding; contact noct@muse.ai)";

/** The endpoint in force: env override, else the public default. */
export function nominatimBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const v = env.NOMINATIM_BASE_URL;
  return v && v.trim() ? v.trim() : NOMINATIM_DEFAULT_BASE_URL;
}

/** One place as Nominatim reports it, reduced to the fields
 *  the register and the ranker read. */
export interface NominatimCandidate {
  /** The OSM place id, with its element type ("relation/…"). */
  osmId: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  /** OSM class ("boundary", "place", "highway"…). */
  osmClass: string;
  /** OSM type ("administrative", "city", "river"…). */
  osmType: string;
  /** Nominatim's own importance value, 0..1 — the prominence
   *  prior the ranker mapping consumes. */
  importance: number;
  /** Address parts as reported (city/town/state/country…),
   *  for containment and kind words. */
  address: Record<string, string>;
}

export type NominatimLookupResult<T> =
  | { status: "ok"; data: T }
  | { status: "unavailable"; reason: string };

/** The source interface the geography resolution depends on.
 *  The HTTP client and the fixture source both implement it. */
export interface NominatimSource {
  search(name: string): Promise<NominatimLookupResult<NominatimCandidate[]>>;
  reverse(latitude: number, longitude: number): Promise<NominatimLookupResult<NominatimCandidate | null>>;
}

export function nominatimSearchUrl(baseUrl: string, name: string, limit = 10): string {
  const params = new URLSearchParams({
    q: name,
    format: "jsonv2",
    addressdetails: "1",
    limit: String(limit),
  });
  return `${baseUrl}/search?${params.toString()}`;
}

export function nominatimReverseUrl(baseUrl: string, latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    addressdetails: "1",
  });
  return `${baseUrl}/reverse?${params.toString()}`;
}

function parseCandidate(r: Record<string, unknown>): NominatimCandidate | undefined {
  const lat = Number.parseFloat(String(r.lat ?? ""));
  const lon = Number.parseFloat(String(r.lon ?? ""));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || typeof r.display_name !== "string") return undefined;
  const address: Record<string, string> = {};
  const rawAddress = (r.address ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(rawAddress)) {
    if (typeof v === "string") address[k] = v;
  }
  return {
    osmId: `${String(r.osm_type ?? "place")}/${String(r.place_id ?? "")}`,
    name: typeof r.name === "string" && r.name ? r.name : r.display_name.split(",")[0].trim(),
    displayName: r.display_name,
    latitude: lat,
    longitude: lon,
    osmClass: typeof r.class === "string" ? r.class : "",
    osmType: typeof r.type === "string" ? r.type : "",
    importance: typeof r.importance === "number" ? r.importance : 0,
    address,
  };
}

/** Parse a search response body: every well-formed candidate,
 *  in the service's own order. An empty array is a successful
 *  no-hit, not an error. */
export function parseNominatimSearch(data: unknown): NominatimCandidate[] {
  if (!Array.isArray(data)) return [];
  const out: NominatimCandidate[] = [];
  for (const row of data) {
    const c = parseCandidate(row as Record<string, unknown>);
    if (c) out.push(c);
  }
  return out;
}

/** Parse a reverse response body: the containing place, or
 *  null when the point resolves to none. */
export function parseNominatimReverse(data: unknown): NominatimCandidate | null {
  if (!data || typeof data !== "object") return null;
  if ((data as { error?: unknown }).error) return null;
  return parseCandidate(data as Record<string, unknown>) ?? null;
}

/**
 * The 1-request-per-second throttle (§4.1): serialises the
 * STARTS of the calls passed through it at least `minIntervalMs`
 * apart, in arrival order. Time and sleep are injectable so a
 * test can prove the spacing on a fake clock.
 */
export class RateThrottle {
  private chain: Promise<unknown> = Promise.resolve();
  private lastStart = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly minIntervalMs = 1000,
    private readonly now: () => number = () => Date.now(),
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {}

  /** Run `fn` no sooner than the interval after the previous
   *  call's start; resolves with fn's result. */
  run<T>(fn: () => Promise<T>): Promise<T> {
    const ticket = this.chain.then(async () => {
      const wait = this.lastStart + this.minIntervalMs - this.now();
      if (wait > 0) await this.sleep(wait);
      this.lastStart = this.now();
      return fn();
    });
    this.chain = ticket.then(
      () => undefined,
      () => undefined,
    );
    return ticket;
  }
}

/** The throttle every default-endpoint HTTP source shares:
 *  two client instances pointed at the public server still
 *  respect its one rate between them. */
const sharedThrottle = new RateThrottle(1000);

const defaultFetch: FetchLike = (url, init) => fetch(url, init);

/** The live Nominatim source. Fetch and throttle injectable. */
export class HttpNominatimSource implements NominatimSource {
  constructor(
    private readonly baseUrl: string = nominatimBaseUrl(),
    private readonly fetchFn: FetchLike = defaultFetch,
    private readonly throttle: RateThrottle = sharedThrottle,
  ) {}

  private async call(url: string): Promise<NominatimLookupResult<unknown>> {
    return this.throttle.run(async () => {
      try {
        const res = await this.fetchFn(url, {
          headers: { "User-Agent": NOMINATIM_USER_AGENT, Accept: "application/json" },
        });
        if (!res.ok) return { status: "unavailable", reason: `HTTP ${res.status} from ${this.baseUrl}` };
        return { status: "ok", data: await res.json() };
      } catch (err) {
        return {
          status: "unavailable",
          reason: `fetch failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    });
  }

  async search(name: string): Promise<NominatimLookupResult<NominatimCandidate[]>> {
    const r = await this.call(nominatimSearchUrl(this.baseUrl, name));
    return r.status === "ok" ? { status: "ok", data: parseNominatimSearch(r.data) } : r;
  }

  async reverse(latitude: number, longitude: number): Promise<NominatimLookupResult<NominatimCandidate | null>> {
    const r = await this.call(nominatimReverseUrl(this.baseUrl, latitude, longitude));
    return r.status === "ok" ? { status: "ok", data: parseNominatimReverse(r.data) } : r;
  }
}

/**
 * The recorded-shape fixture source: serves committed
 * Nominatim JSON (test/fixtures/nominatim/) through the same
 * interface, so gated tests exercise the client's contract
 * offline. A search with no fixture is "unavailable", not
 * empty — the fixture set's limits are stated, not papered
 * over; a fixture that IS an empty array is a recorded no-hit
 * and serves as one.
 */
export class FixtureNominatimSource implements NominatimSource {
  constructor(
    private readonly searchResponses: Record<string, unknown> = {},
    private readonly reverseResponses: Record<string, unknown> = {},
  ) {}

  async search(name: string): Promise<NominatimLookupResult<NominatimCandidate[]>> {
    const key = Object.keys(this.searchResponses).find((k) => k.toLowerCase() === name.toLowerCase());
    if (key === undefined) {
      return {
        status: "unavailable",
        reason: `no search fixture for "${name}" (fixture source is offline and bounded)`,
      };
    }
    return { status: "ok", data: parseNominatimSearch(this.searchResponses[key]) };
  }

  async reverse(latitude: number, longitude: number): Promise<NominatimLookupResult<NominatimCandidate | null>> {
    const key = `${latitude},${longitude}`;
    if (!(key in this.reverseResponses)) {
      return {
        status: "unavailable",
        reason: `no reverse fixture for ${key} (fixture source is offline and bounded)`,
      };
    }
    return { status: "ok", data: parseNominatimReverse(this.reverseResponses[key]) };
  }
}

/* ------------------------------------------------------------------ */
/* The ranker mapping (§6): a Nominatim candidate in the entity        */
/* ranker's candidate shape, by DATA MAPPING at the client — no new    */
/* signals in the ranker. OSM carries no sitelinks; its importance     */
/* value is mapped onto a sitelink-like magnitude so the ranker's      */
/* prominence prior (log-scaled, normalised within the list) keeps     */
/* its meaning as an ordering, stated here so the mapping can be       */
/* argued with: importance 0..1 → round(importance × 100).             */
/* ------------------------------------------------------------------ */

/** Kind words for type agreement, read off the candidate's
 *  own attested parts: a settlement whose address names it as
 *  city/town/village, a state named as itself in its address,
 *  a county by its name, else the OSM type itself (river,
 *  administrative…). */
export function nominatimKindWords(c: NominatimCandidate): string[] {
  const words: string[] = [];
  const a = c.address;
  const settlement = a.city ?? a.town ?? a.village ?? a.hamlet;
  if (settlement && settlement.toLowerCase() === c.name.toLowerCase()) words.push("city");
  if (a.state && a.state.toLowerCase() === c.name.toLowerCase()) words.push("state");
  if (/ county$/i.test(c.name)) words.push("county");
  if (c.osmType && c.osmType !== "administrative") words.push(c.osmType.replace(/_/g, " "));
  if (!words.length && c.osmType) words.push(c.osmType.replace(/_/g, " "));
  return words;
}

export function nominatimToEntityCandidate(c: NominatimCandidate): EntityCandidate {
  return {
    id: `osm:${c.osmId}`,
    label: c.name,
    description: c.displayName,
    sitelinks: Math.round(c.importance * 100),
    instanceOf: nominatimKindWords(c),
    coordinates: { lat: c.latitude, lon: c.longitude },
  };
}
