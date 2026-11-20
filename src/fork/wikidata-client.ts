/**
 * wikidata-client.ts — the Wikidata Action API endpoint client for
 * the W1 adapter (design §3.6; plan: docs/fork/wikidata-adapter-plan.md).
 *
 * API access only (owner ruling): no local Wikidata database, dump
 * or mirror exists or is consulted. The endpoint is configurable
 * via the WIKIDATA_BASE_URL environment variable in the §2.3 style,
 * defaulting to the public Action API. No API key; requests carry a
 * polite descriptive User-Agent.
 *
 * The fetch implementation is INJECTED (a FetchLike), so tests
 * substitute a fixture source and never touch the network (§2.2:
 * tests never touch the network; importing never happens at
 * runtime — banking is slice W2's offline act, fed by this client
 * or by recorded fixtures).
 *
 * Honesty about availability: a failed lookup returns
 * { status: "unavailable", reason } — it never throws across the
 * interface and never fabricates a partial entity. Callers render
 * that state as "lookup unavailable", not as absence of the item.
 */

export const WIKIDATA_DEFAULT_BASE_URL = "https://www.wikidata.org/w/api.php";
export const WIKIDATA_USER_AGENT =
  "AnSci-Wikidata-Adapter/0.1 (classical-AI research; association-form import)";

/** The endpoint in force: env override, else the public default. */
export function wikidataBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const v = env.WIKIDATA_BASE_URL;
  return v && v.trim() ? v.trim() : WIKIDATA_DEFAULT_BASE_URL;
}

export interface FetchResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<FetchResponseLike>;

/** A lookup's outcome: the parsed JSON, or a named unavailability. */
export type WikidataLookupResult =
  | { status: "ok"; data: unknown }
  | { status: "unavailable"; reason: string };

/** The source interface the translator's callers depend on. The
 *  HTTP client and the fixture source both implement it. */
export interface WikidataSource {
  getEntities(ids: string[]): Promise<WikidataLookupResult>;
  searchEntities(search: string): Promise<WikidataLookupResult>;
}

export function wbgetentitiesUrl(baseUrl: string, ids: string[]): string {
  const params = new URLSearchParams({
    action: "wbgetentities",
    ids: ids.join("|"),
    props: "labels|claims|sitelinks",
    languages: "en",
    format: "json",
  });
  return `${baseUrl}?${params.toString()}`;
}

export function wbsearchentitiesUrl(baseUrl: string, search: string): string {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search,
    language: "en",
    type: "item",
    format: "json",
  });
  return `${baseUrl}?${params.toString()}`;
}

const defaultFetch: FetchLike = (url, init) => fetch(url, init);

/** The live Action API source. Fetch is injectable for tests. */
export class HttpWikidataSource implements WikidataSource {
  constructor(
    private readonly baseUrl: string = wikidataBaseUrl(),
    private readonly fetchFn: FetchLike = defaultFetch,
  ) {}

  private async call(url: string): Promise<WikidataLookupResult> {
    try {
      const res = await this.fetchFn(url, {
        headers: { "User-Agent": WIKIDATA_USER_AGENT, Accept: "application/json" },
      });
      if (!res.ok) return { status: "unavailable", reason: `HTTP ${res.status} from ${this.baseUrl}` };
      return { status: "ok", data: await res.json() };
    } catch (err) {
      return {
        status: "unavailable",
        reason: `fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  getEntities(ids: string[]): Promise<WikidataLookupResult> {
    return this.call(wbgetentitiesUrl(this.baseUrl, ids));
  }

  searchEntities(search: string): Promise<WikidataLookupResult> {
    return this.call(wbsearchentitiesUrl(this.baseUrl, search));
  }
}

/**
 * The recorded-shape fixture source: serves committed wbgetentities /
 * wbsearchentities JSON (test/fixtures/wikidata/) through the same
 * interface, so gated tests exercise the client's contract offline.
 * A request for ids no fixture carries is "unavailable", not empty —
 * the fixture set's limits are stated, not papered over.
 */
export class FixtureWikidataSource implements WikidataSource {
  constructor(
    private readonly entityResponses: unknown[],
    private readonly searchResponses: unknown[] = [],
  ) {}

  async getEntities(ids: string[]): Promise<WikidataLookupResult> {
    for (const data of this.entityResponses) {
      const entities = (data as { entities?: Record<string, unknown> })?.entities;
      if (entities && ids.every((id) => id in entities)) return { status: "ok", data };
    }
    return {
      status: "unavailable",
      reason: `no fixture carries ${ids.join(", ")} (fixture source is offline and bounded)`,
    };
  }

  async searchEntities(search: string): Promise<WikidataLookupResult> {
    for (const data of this.searchResponses) {
      const info = (data as { searchinfo?: { search?: string } })?.searchinfo;
      if (info?.search?.toLowerCase() === search.toLowerCase()) return { status: "ok", data };
    }
    return {
      status: "unavailable",
      reason: `no search fixture for "${search}" (fixture source is offline and bounded)`,
    };
  }
}
