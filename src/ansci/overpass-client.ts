/**
 * overpass-client.ts — the Overpass endpoint client for the
 * GeographyKnowledgeUnit (Geography G2, 2026-11-20; design
 * note docs/ansci/geography-design-note.md §4.2).
 *
 * API access only (owner ruling, as for Wikidata and
 * Nominatim): no local OpenStreetMap database, dump or
 * mirror exists or is consulted; what's-there results bank
 * in the place register (geography.ts) at their 30-day
 * shelf life, with Overpass provenance. The endpoint is
 * configurable via the OVERPASS_BASE_URL environment
 * variable, defaulting to the public instance. No API key;
 * requests carry an identifying User-Agent.
 *
 * BOUNDED BY CONSTRUCTION (§9.2's acceptance). The source
 * interface takes a CATEGORY SET, a point and a radius —
 * never a raw query. The Overpass QL is built by the one
 * template builder below, from the category table stated as
 * data: every query carries a server timeout, an around
 * radius clamped to MAX_RADIUS_M, and an element limit
 * clamped to MAX_ELEMENTS. An unbounded or untemplated
 * query cannot be expressed through this interface, by
 * construction, not by care.
 *
 * SLOW IS A STATE, NOT A SURPRISE (§4.2). Overpass queries
 * can be slow and the public instance is a shared resource:
 * the client bounds its own wait (a configurable timeout,
 * 30s by default) and a timeout — like an HTTP failure, a
 * 429, or the server's at-capacity answer — returns
 * { status: "unavailable", reason }. It never throws across
 * the interface and never fabricates an element.
 */
import type { FetchLike } from "./wikidata-client";

export const OVERPASS_DEFAULT_BASE_URL = "https://overpass-api.de/api/interpreter";
export const OVERPASS_USER_AGENT =
  "AnSci-Geography/0.1 (classical-AI research; on-demand geospatial lookup; contact noct@muse.ai)";

/** The endpoint in force: env override, else the public default. */
export function overpassBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const v = env.OVERPASS_BASE_URL;
  return v && v.trim() ? v.trim() : OVERPASS_DEFAULT_BASE_URL;
}

/* ---------------- the category table (data) ---------------- */

/**
 * One what's-there category: the words a question can ask
 * it by, and the OSM selectors that attest it. The table is
 * the whole vocabulary of the what's-there shapes — a
 * category not in it cannot be asked, and its selectors are
 * the only ones the template builder can emit.
 */
export interface WhatsThereCategory {
  key: string;
  /** Singular and plural question words ("river", "rivers"). */
  words: string[];
  /** The reply's noun for the category ("river"). */
  noun: string;
  /** Overpass selectors (element clauses without the area
   *  filter; the template adds it). */
  selectors: string[];
  /** Which tag keys mark an element as this category, for
   *  splitting a union response back into categories. */
  tagKeys: { key: string; values: string[] }[];
}

export const WHATS_THERE_CATEGORIES: WhatsThereCategory[] = [
  {
    key: "river",
    words: ["river", "rivers"],
    noun: "river",
    selectors: ['way["waterway"="river"]', 'relation["waterway"="river"]'],
    tagKeys: [{ key: "waterway", values: ["river"] }],
  },
  {
    key: "lake",
    words: ["lake", "lakes"],
    noun: "lake",
    selectors: ['way["natural"="water"]["name"]', 'relation["natural"="water"]["name"]'],
    tagKeys: [{ key: "natural", values: ["water"] }],
  },
  {
    key: "school",
    words: ["school", "schools"],
    noun: "school",
    selectors: ['node["amenity"="school"]', 'way["amenity"="school"]'],
    tagKeys: [{ key: "amenity", values: ["school"] }],
  },
  {
    key: "hospital",
    words: ["hospital", "hospitals"],
    noun: "hospital",
    selectors: ['node["amenity"="hospital"]', 'way["amenity"="hospital"]'],
    tagKeys: [{ key: "amenity", values: ["hospital"] }],
  },
  {
    key: "park",
    words: ["park", "parks"],
    noun: "park",
    selectors: ['node["leisure"="park"]', 'way["leisure"="park"]'],
    tagKeys: [{ key: "leisure", values: ["park"] }],
  },
  {
    key: "library",
    words: ["library", "libraries"],
    noun: "library",
    selectors: ['node["amenity"="library"]', 'way["amenity"="library"]'],
    tagKeys: [{ key: "amenity", values: ["library"] }],
  },
  {
    key: "museum",
    words: ["museum", "museums"],
    noun: "museum",
    selectors: ['node["tourism"="museum"]', 'way["tourism"="museum"]'],
    tagKeys: [{ key: "tourism", values: ["museum"] }],
  },
  {
    key: "station",
    words: ["station", "stations", "train station", "train stations"],
    noun: "station",
    selectors: ['node["railway"="station"]'],
    tagKeys: [{ key: "railway", values: ["station"] }],
  },
  {
    key: "university",
    words: ["university", "universities"],
    noun: "university",
    selectors: ['node["amenity"="university"]', 'way["amenity"="university"]'],
    tagKeys: [{ key: "amenity", values: ["university"] }],
  },
];

export function categoryByKey(key: string): WhatsThereCategory | undefined {
  return WHATS_THERE_CATEGORIES.find((c) => c.key === key);
}

export function categoryByWord(word: string): WhatsThereCategory | undefined {
  const w = word.toLowerCase();
  return WHATS_THERE_CATEGORIES.find((c) => c.words.includes(w));
}

/** The bounds every query is built inside (§4.2). */
export const WHATS_THERE_MAX_RADIUS_M = 25_000;
export const WHATS_THERE_DEFAULT_RADIUS_M = 10_000;
export const WHATS_THERE_MAX_ELEMENTS = 50;
export const WHATS_THERE_QUERY_TIMEOUT_S = 25;

/**
 * The one query template: the what's-there union for a
 * category set around a point. Radius and limit are clamped
 * to the stated bounds; the server timeout rides in the
 * query itself.
 */
export function buildWhatsThereQuery(
  categories: readonly WhatsThereCategory[],
  latitude: number,
  longitude: number,
  radiusM: number = WHATS_THERE_DEFAULT_RADIUS_M,
  limit: number = WHATS_THERE_MAX_ELEMENTS,
): string {
  const radius = Math.max(100, Math.min(WHATS_THERE_MAX_RADIUS_M, Math.round(radiusM)));
  const count = Math.max(1, Math.min(WHATS_THERE_MAX_ELEMENTS, Math.round(limit)));
  const clauses = categories
    .flatMap((c) => c.selectors.map((s) => `  ${s}(around:${radius},${latitude},${longitude});`))
    .join("\n");
  return `[out:json][timeout:${WHATS_THERE_QUERY_TIMEOUT_S}];\n(\n${clauses}\n);\nout tags center ${count};`;
}

/* ---------------- elements ---------------- */

/** One what's-there element, reduced to what the shapes
 *  read: its name (absent for unnamed fabric — a river way
 *  can attest a river without naming it), its point, and
 *  the tags it was attested by. */
export interface OverpassElement {
  osmId: string;
  name?: string;
  latitude: number;
  longitude: number;
  tags: Record<string, string>;
}

/** Which of the asked categories an element attests, by its
 *  tags against the category table. */
export function elementCategories(
  element: OverpassElement,
  categories: readonly WhatsThereCategory[],
): string[] {
  const out: string[] = [];
  for (const c of categories) {
    if (c.tagKeys.some((t) => t.values.includes(element.tags[t.key] ?? ""))) out.push(c.key);
  }
  return out;
}

/** Parse an Overpass response body: every element carrying a
 *  point (a node's own, or a way/relation's centre). A body
 *  that is not an Overpass response parses to nothing — the
 *  caller renders the lookup unavailable, never as an empty
 *  set. Returns undefined for a non-response, an array
 *  (possibly empty) for a response. */
export function parseOverpassElements(data: unknown): OverpassElement[] | undefined {
  if (!data || typeof data !== "object") return undefined;
  const raw = (data as { elements?: unknown }).elements;
  if (!Array.isArray(raw)) return undefined;
  const out: OverpassElement[] = [];
  for (const row of raw) {
    const e = row as Record<string, unknown>;
    const center = e.center as { lat?: unknown; lon?: unknown } | undefined;
    const lat = typeof e.lat === "number" ? e.lat : typeof center?.lat === "number" ? center.lat : undefined;
    const lon = typeof e.lon === "number" ? e.lon : typeof center?.lon === "number" ? center.lon : undefined;
    if (lat === undefined || lon === undefined) continue;
    const tags: Record<string, string> = {};
    for (const [k, v] of Object.entries((e.tags ?? {}) as Record<string, unknown>)) {
      if (typeof v === "string") tags[k] = v;
    }
    out.push({
      osmId: `${String(e.type ?? "element")}/${String(e.id ?? "")}`,
      ...(typeof tags.name === "string" && tags.name ? { name: tags.name } : {}),
      latitude: lat,
      longitude: lon,
      tags,
    });
  }
  return out;
}

/* ---------------- the source ---------------- */

export type OverpassLookupResult =
  | { status: "ok"; data: OverpassElement[] }
  | { status: "unavailable"; reason: string };

/** The source interface the what's-there shapes depend on.
 *  It takes categories and a point — never a raw query (see
 *  the header: bounded by construction). */
export interface OverpassSource {
  whatsThere(
    categories: readonly WhatsThereCategory[],
    latitude: number,
    longitude: number,
    radiusM?: number,
  ): Promise<OverpassLookupResult>;
}

/** The POST transport the HTTP source runs: Overpass takes
 *  the query as form data. Wider than the Wikidata client's
 *  FetchLike (which is GET-shaped), so it is declared here. */
export type OverpassFetchLike = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

const defaultFetch: OverpassFetchLike = (url, init) => fetch(url, init);

/** The live Overpass source. Fetch and timeout injectable. */
export class HttpOverpassSource implements OverpassSource {
  constructor(
    private readonly baseUrl: string = overpassBaseUrl(),
    private readonly fetchFn: OverpassFetchLike = defaultFetch,
    private readonly timeoutMs = 30_000,
  ) {}

  async whatsThere(
    categories: readonly WhatsThereCategory[],
    latitude: number,
    longitude: number,
    radiusM: number = WHATS_THERE_DEFAULT_RADIUS_M,
  ): Promise<OverpassLookupResult> {
    const query = buildWhatsThereQuery(categories, latitude, longitude, radiusM);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchFn(this.baseUrl, {
        method: "POST",
        headers: {
          "User-Agent": OVERPASS_USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      if (!res.ok) {
        return {
          status: "unavailable",
          reason:
            res.status === 429
              ? `HTTP 429 from ${this.baseUrl} (the shared instance rate-limits; the lookup was not retried)`
              : `HTTP ${res.status} from ${this.baseUrl}`,
        };
      }
      const elements = parseOverpassElements(await res.json());
      if (!elements) {
        return { status: "unavailable", reason: "the response was not an Overpass result (no elements array)" };
      }
      return { status: "ok", data: elements };
    } catch (err) {
      return {
        status: "unavailable",
        reason:
          err instanceof Error && err.name === "AbortError"
            ? `the lookup timed out after ${this.timeoutMs}ms (Overpass queries can be slow; a timeout is unavailability, not absence)`
            : `fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * The recorded-shape fixture source: serves committed
 * Overpass JSON through the same interface, keyed by the
 * exact templated query — so a gated test exercises the
 * template as well as the contract, and a query the
 * template did not build cannot be served. A query with no
 * fixture is "unavailable", not empty: the fixture set's
 * limits are stated, not papered over.
 */
export class FixtureOverpassSource implements OverpassSource {
  constructor(private readonly responses: Record<string, unknown> = {}) {}

  async whatsThere(
    categories: readonly WhatsThereCategory[],
    latitude: number,
    longitude: number,
    radiusM: number = WHATS_THERE_DEFAULT_RADIUS_M,
  ): Promise<OverpassLookupResult> {
    const query = buildWhatsThereQuery(categories, latitude, longitude, radiusM);
    if (!(query in this.responses)) {
      return {
        status: "unavailable",
        reason: "no fixture recorded for this templated query (fixture source is offline and bounded)",
      };
    }
    const elements = parseOverpassElements(this.responses[query]);
    if (!elements) {
      return { status: "unavailable", reason: "the fixture for this query is not an Overpass result" };
    }
    return { status: "ok", data: elements };
  }
}

/** Re-exported so consumers name one fetch type family. */
export type { FetchLike };
