/**
 * geography.ts — the GeographyKnowledgeUnit (Geography G1,
 * 2026-11-20; design note docs/ansci/geography-design-note.md
 * §2): the place register and the resolution order, as code.
 *
 * WHERE THE FACTS LIVE, AND WHY. The register is the system's
 * one store for resolved places, behind its own accessors on
 * wikidata-bank.ts's reasoning: retrieved facts have a
 * different provenance and epistemic status from the
 * classification table and the seed graph, so they live apart.
 * A record is a bundle of separately-attested facts — names,
 * kind, coordinates, containment — each carrying its own
 * provenance and its own shelf life (§2.2, §2.4). The register
 * is a process-level store, like the banks (the owner's
 * persistence question is open, §10; process-level is the
 * standing default this slice builds): it persists across
 * sessions within a process and not across restarts, and no
 * file backing is claimed.
 *
 * THE RESOLUTION ORDER (§2.3, SETTLED) is this module's
 * standing policy, stated once here and inherited by every
 * place-shaped consumer: configured → banked →
 * conversation-stated → consulted. resolvePlace below runs
 * the register's part of it — banked (the register, then the
 * Wikidata bank imported on read, §8's recommended custody)
 * and consulted (Nominatim, §4.1) — while the configured seat
 * and the conversation-stated place are GeographyAwareness's
 * readings (geography-awareness.ts), which consumers consult
 * before reaching this unit with a name. A question that
 * names its place carries the name as the demand's argument;
 * the name is not a step in the order.
 *
 * AMBIGUITY (§6, SETTLED). A namesake set goes to the entity
 * ranker; the ranker's order proposes, and a margin too small
 * to separate the leaders is an unresolved tie — the
 * resolution returns "ambiguous" and the consumer declines or
 * clarifies. Nothing here ever picks silently.
 *
 * WHAT THE UNIT NEVER DOES (§2.5): holds no mirror; serves
 * weather (readings are the weather bank's); guesses a
 * coordinate, a containment, or a namesake; originates a fact
 * — every entry traces to grounding, a banked consultation,
 * the conversation record, or the deployment's configuration.
 */
import { placeKeyOf } from "./weather-bank";
import type { WikidataBank } from "./wikidata-bank";
import type { NominatimCandidate, NominatimSource } from "./geography-client";
import { nominatimToEntityCandidate } from "./geography-client";
import { haversineKm, rankEntities, type CandidateBreakdown, type EntityKind } from "./entity-rank";

/* ---------------- provenance ---------------- */

/**
 * One fact's attestation, in the §§3.5/4.3 discipline. A
 * retrieved fact names its dataset, its id there, the fetch
 * date as baseVersion, and the route it came through; a
 * configured fact is the deployment's own attestation (the
 * Place table's seat, §3.1) and claims no retrieval.
 */
export type PlaceProvenance =
  | {
      kind: "retrieved";
      dataset: string;
      uri?: string;
      baseVersion: string;
      retrievedFrom: string;
      confidence: number;
      detail: string;
    }
  | { kind: "configured"; detail: string }
  | {
      /** A computed fact (§3.5/§4.3): it cites its inputs'
       *  provenance and carries none of its own — a route is
       *  OSRM's computation over two retrieved points, and it
       *  is never dressed as a retrieval. */
      kind: "derived";
      detail: string;
      inputs: string[];
    };

interface Fact<T> {
  value: T;
  provenance: PlaceProvenance;
  /** When this system banked the fact, ISO. */
  fetchedAt: string;
  /** fetchedAt + the fact-kind's shelf life, ISO. Past this,
   *  the fact answers nothing (§2.4). */
  expiresAt: string;
}

/* ---------------- shelf lives (§2.4, stated as data) ---------------- */

/** Per-kind shelf lives in days, from the design note's
 *  table, with its reasoning: coordinates and names are
 *  survey-grade stable (the TTL re-attests rather than
 *  fossilises); containment changes on a scale of years;
 *  what's-there on a scale of weeks; a route, if banked, a
 *  week. Weather's 30 minutes lives in weather-bank.ts — the
 *  reading is the weather bank's, not the register's. */
export const PLACE_SHELF_LIFE_DAYS = {
  coordinates: 365,
  reverseGeocode: 365,
  containment: 182,
  kind: 365,
  names: 365,
  whatsThere: 30,
  route: 7,
} as const;

export type PlaceFactKind = keyof typeof PLACE_SHELF_LIFE_DAYS;

function expiresAtFor(kind: PlaceFactKind, fetchedAtISO: string): string {
  const fetched = new Date(fetchedAtISO).getTime();
  return new Date(fetched + PLACE_SHELF_LIFE_DAYS[kind] * 86_400_000).toISOString();
}

function factFresh<T>(fact: Fact<T>, now: Date): boolean {
  return now.getTime() < new Date(fact.expiresAt).getTime();
}

/* ---------------- the register (§2.2) ---------------- */

export interface RegisterCoordinates {
  lat: number;
  lon: number;
  /** What the point stands for, in the source's own naming
   *  (a state name resolves to a point; the register records
   *  the point and its standing, §2.2). */
  standsFor: string;
}

export interface RegisterPlace {
  /** The bank key: the resolved name, normalised. */
  key: string;
  /** The name as resolved. */
  name: string;
  /** Attested variants of the name. */
  variants: string[];
  kind?: Fact<string>;
  coordinates?: Fact<RegisterCoordinates>;
  containment: Fact<string>[];
  /** A reverse-geocode attestation (point → this place),
   *  banked when a consultation supplied one. */
  reverseGeocode?: Fact<string>;
}

/* ---------------- what's-there facts (G2, §4.2) ---------------- */

/** One what's-there attestation banked against a place: an
 *  element of a category found within the queried radius of
 *  the place's point. The distance is computed locally from
 *  the two points when the set is banked (a Function's
 *  output riding on retrieved points — the §3.5 discipline
 *  names it as computed wherever it is shown). */
export interface WhatsThereEntry {
  name?: string;
  category: string;
  lat: number;
  lon: number;
  distanceKm: number;
}

/** A banked what's-there set: one category's entries for one
 *  place, with the Overpass provenance and the §2.4 shelf
 *  life. */
export interface WhatsThereRecord {
  entries: WhatsThereEntry[];
  provenance: PlaceProvenance;
  fetchedAt: string;
  expiresAt: string;
}

/* ---------------- routes (G3, §4.3) ---------------- */

/** A banked route: a COMPUTATION's record, not a testimony —
 *  the road distance and duration OSRM computed between two
 *  resolved points, the straight-line distance computed
 *  locally from the same points, and a derived provenance
 *  citing the inputs. Banked at the §2.4 route shelf life
 *  (7 days, the owner's standing default for this build). */
export interface RouteRecord {
  fromName: string;
  toName: string;
  fromPoint: { lat: number; lon: number };
  toPoint: { lat: number; lon: number };
  /** The road distance OSRM computed, metres (raw). */
  roadDistanceMeters: number;
  /** The road duration OSRM computed, seconds (raw). */
  roadDurationSeconds: number;
  /** The straight-line distance between the points,
   *  kilometres — computed locally, always available when
   *  the points stand (§9.3). */
  straightLineKm: number;
  provenance: PlaceProvenance;
  fetchedAt: string;
  expiresAt: string;
}

export interface ResolvedPlaceInput {
  name: string;
  variants?: string[];
  kind?: string;
  coordinates?: RegisterCoordinates;
  containment?: string[];
  provenance: PlaceProvenance;
  /** When the facts were fetched, ISO (the banking clock is
   *  stamped from this). */
  fetchedAt: string;
}

export interface PlaceBankResult {
  addedFacts: number;
  /** Facts already banked fresh under the same kind — the
   *  re-banking changed nothing for these. */
  alreadyBanked: number;
}

export class PlaceRegister {
  private placesByKey = new Map<string, RegisterPlace>();

  /**
   * Bank one resolved place's facts. Idempotent in the
   * banks' manner: a fact-kind already banked FRESH is left
   * exactly as it stands (counted alreadyBanked); a stale or
   * absent fact-kind is (re)banked from the input. One input
   * carries one provenance — a place assembled from several
   * sources is banked by several calls, each fact keeping its
   * own attestation (§2.2).
   */
  bankPlace(input: ResolvedPlaceInput): PlaceBankResult {
    const key = placeKeyOf(input.name);
    let place = this.placesByKey.get(key);
    if (!place) {
      place = { key, name: input.name, variants: [], containment: [] };
      this.placesByKey.set(key, place);
    }
    const now = new Date(input.fetchedAt);
    let addedFacts = 0;
    let alreadyBanked = 0;
    const bankFact = <T>(existing: Fact<T> | undefined, value: T | undefined, kind: PlaceFactKind): Fact<T> | undefined => {
      if (value === undefined) return existing;
      if (existing && factFresh(existing, now)) {
        alreadyBanked++;
        return existing;
      }
      addedFacts++;
      return {
        value,
        provenance: input.provenance,
        fetchedAt: input.fetchedAt,
        expiresAt: expiresAtFor(kind, input.fetchedAt),
      };
    };
    place.kind = bankFact(place.kind, input.kind, "kind");
    place.coordinates = bankFact(place.coordinates, input.coordinates, "coordinates");
    for (const name of input.containment ?? []) {
      const existing = place.containment.find((f) => f.value.toLowerCase() === name.toLowerCase());
      if (existing && factFresh(existing, now)) {
        alreadyBanked++;
      } else {
        const fact: Fact<string> = {
          value: name,
          provenance: input.provenance,
          fetchedAt: input.fetchedAt,
          expiresAt: expiresAtFor("containment", input.fetchedAt),
        };
        place.containment = [...place.containment.filter((f) => f.value.toLowerCase() !== name.toLowerCase()), fact];
        addedFacts++;
      }
    }
    for (const variant of input.variants ?? []) {
      if (!place.variants.some((v) => v.toLowerCase() === variant.toLowerCase()) && variant.toLowerCase() !== place.name.toLowerCase()) {
        place.variants.push(variant);
      }
    }
    return { addedFacts, alreadyBanked };
  }

  get placeCount(): number {
    return this.placesByKey.size;
  }

  placeByName(name: string): RegisterPlace | undefined {
    const direct = this.placesByKey.get(placeKeyOf(name));
    if (direct) return direct;
    const wanted = name.toLowerCase();
    for (const place of this.placesByKey.values()) {
      if (place.variants.some((v) => v.toLowerCase() === wanted)) return place;
    }
    return undefined;
  }

  places(): RegisterPlace[] {
    return [...this.placesByKey.values()];
  }

  /** The place's coordinates when they stand FRESH (§2.4);
   *  undefined when none are banked or the banked point is
   *  past its shelf life — a stale point answers nothing. */
  freshCoordinates(name: string, now: Date = new Date()): Fact<RegisterCoordinates> | undefined {
    const fact = this.placesByKey.get(placeKeyOf(name))?.coordinates ?? this.placeByName(name)?.coordinates;
    return fact && factFresh(fact, now) ? fact : undefined;
  }

  /** The place's coordinates when they stand but are STALE —
   *  the stale-only decline's evidence (§9.4): the register
   *  holds a point it may not serve as current. */
  staleCoordinates(name: string, now: Date = new Date()): Fact<RegisterCoordinates> | undefined {
    const fact = this.placeByName(name)?.coordinates;
    return fact && !factFresh(fact, now) ? fact : undefined;
  }

  /* ---------------- what's-there facts (G2, §4.2) ---------------- */

  private whatsThereByPlace = new Map<string, Map<string, WhatsThereRecord>>();

  /**
   * Bank one category's what's-there set for a place, at the
   * §2.4 what's-there shelf life (30 days). Idempotent in the
   * banks' manner: a fresh set already banked stands exactly
   * as it is; a stale or absent set is (re)banked. The set
   * lives against the place's register key, beside — not
   * inside — the place's own facts: a what's-there set is an
   * attestation about the place's surroundings, not a fact
   * of the place itself.
   */
  bankWhatsThere(
    placeName: string,
    categoryKey: string,
    entries: WhatsThereEntry[],
    provenance: PlaceProvenance,
    fetchedAtISO: string,
  ): void {
    const key = placeKeyOf(placeName);
    let byCategory = this.whatsThereByPlace.get(key);
    if (!byCategory) {
      byCategory = new Map();
      this.whatsThereByPlace.set(key, byCategory);
    }
    const existing = byCategory.get(categoryKey);
    if (existing && new Date(existing.expiresAt).getTime() > new Date(fetchedAtISO).getTime()) return;
    byCategory.set(categoryKey, {
      entries,
      provenance,
      fetchedAt: fetchedAtISO,
      expiresAt: expiresAtFor("whatsThere", fetchedAtISO),
    });
  }

  /** The fresh what's-there set for a place and category, or
   *  undefined — a stale set answers nothing (§2.4). */
  whatsThereFor(placeName: string, categoryKey: string, now: Date = new Date()): WhatsThereRecord | undefined {
    const record = this.whatsThereByPlace.get(placeKeyOf(placeName))?.get(categoryKey);
    return record && now.getTime() < new Date(record.expiresAt).getTime() ? record : undefined;
  }

  /** The stale what's-there set, when one stands — the
   *  stale-only decline's evidence, as with coordinates. */
  staleWhatsThereFor(placeName: string, categoryKey: string, now: Date = new Date()): WhatsThereRecord | undefined {
    const record = this.whatsThereByPlace.get(placeKeyOf(placeName))?.get(categoryKey);
    return record && now.getTime() >= new Date(record.expiresAt).getTime() ? record : undefined;
  }

  /* ---------------- routes (G3, §4.3) ---------------- */

  private routesByPair = new Map<string, RouteRecord>();

  private static routeKey(fromName: string, toName: string): string {
    return `${placeKeyOf(fromName)}>${placeKeyOf(toName)}`;
  }

  /**
   * Bank one computed route at the §2.4 route shelf life (7
   * days — the owner's standing default for this build: a
   * banked route is re-served inside its week and recomputed
   * after it). Idempotent in the banks' manner: a fresh
   * banked route stands; a stale or absent one is replaced.
   * Directional: a route is computed from a place to a
   * place, and the reverse is a separate computation.
   */
  bankRoute(route: Omit<RouteRecord, "expiresAt">): void {
    const key = PlaceRegister.routeKey(route.fromName, route.toName);
    const existing = this.routesByPair.get(key);
    if (existing && new Date(existing.expiresAt).getTime() > new Date(route.fetchedAt).getTime()) return;
    this.routesByPair.set(key, {
      ...route,
      expiresAt: expiresAtFor("route", route.fetchedAt),
    });
  }

  /** The fresh banked route between two places, or
   *  undefined — a stale route recomputes, it does not
   *  answer (§2.4). */
  routeFor(fromName: string, toName: string, now: Date = new Date()): RouteRecord | undefined {
    const record = this.routesByPair.get(PlaceRegister.routeKey(fromName, toName));
    return record && now.getTime() < new Date(record.expiresAt).getTime() ? record : undefined;
  }

  /** The banked route between two places, whatever its
   *  freshness — the read Timekeeping's staleness operation
   *  (timekeeping.ts, T1) asks: fresh-or-stale is a verdict
   *  over the record, and routeFor's fresh-only read cannot
   *  state the stale half of it. Answers nothing itself. */
  peekRoute(fromName: string, toName: string): RouteRecord | undefined {
    return this.routesByPair.get(PlaceRegister.routeKey(fromName, toName));
  }

  /**
   * Import on read (§8's recommended P625 custody, the
   * owner's default for this build): when resolution needs a
   * place the register does not hold, read the Wikidata
   * bank's banked record for it and bank a register entry
   * citing it — the register entry's provenance names the
   * bank as its immediate source and the bank's own
   * SourceRecord behind it, so the chain is register →
   * bank → Wikidata, each link attested. The bank stays
   * canonical for Wikidata retrievals; the register is
   * canonical for resolved places. Idempotent, like banking.
   */
  importFromWikidataBank(bank: WikidataBank, name: string, now: Date = new Date()): RegisterPlace | undefined {
    const node = bank.nodeByName(name);
    if (!node) return this.placeByName(name);
    const { lat, lon } = node.properties;
    const fetchedAt = now.toISOString();
    const provenance: PlaceProvenance = {
      kind: "retrieved",
      dataset: "wikidata",
      uri: node.qid,
      baseVersion: node.source.baseVersion,
      retrievedFrom: `the Wikidata bank, imported on read (the bank's record was retrieved from Wikidata via ${node.source.retrievedFrom})`,
      confidence: 0.9,
      detail:
        `imported on read from the Wikidata bank's record for ${node.name} (${node.qid}); the bank is the ` +
        `immediate source, Wikidata the retrieval behind it (SourceRecord baseVersion ${node.source.baseVersion})`,
    };
    this.bankPlace({
      name: node.name,
      ...(typeof lat === "number" && typeof lon === "number"
        ? { coordinates: { lat, lon, standsFor: node.name } }
        : {}),
      containment: bank.locatedInChain(name).map((n) => n.name),
      provenance,
      fetchedAt,
    });
    return this.placeByName(name);
  }
}

/** The process-level register: the store the turn layer
 *  reads. Persists across sessions in this process; not
 *  file-backed (§10's persistence question, standing
 *  default). */
export const defaultPlaceRegister = new PlaceRegister();

/* ---------------- the resolution protocol (§2.3, §5) ---------------- */

/** The margin (in ranker points) below which two leaders are
 *  an unresolved tie (§6): the ranker's order proposes, and
 *  a separation smaller than this does not separate. Stated
 *  at a quarter of the smallest evidence quantum (one
 *  context-overlap word scores 1): separations under it are
 *  attributable to the prominence prior's log compression,
 *  not to evidence about this mention — the recorded
 *  Springfield set is the calibration (an exact tie at the
 *  top without a situated place; a 0.44-point separation,
 *  all of it stated distance, with one). */
export const RANK_MARGIN = 0.25;

export interface PlaceResolutionDeps {
  register: PlaceRegister;
  /** The Wikidata bank import-on-read draws from (default:
   *  none — resolution then runs register → consultation). */
  wikidataBank?: WikidataBank;
  /** The Nominatim consultation (default: none — a register
   *  miss then stands unresolved rather than consulted). */
  nominatim?: NominatimSource;
  /** The conversation's situated place, when one stands —
   *  the ranker's proximity evidence (§6). */
  situatedPlace?: { name: string; lat: number; lon: number };
  /** The kind the demand expects (default "place"). */
  expectedKind?: EntityKind;
  now?: Date;
  /** Provenance label for a consultation's route (default
   *  "live"; fixture callers pass "fixture"). */
  retrievedFrom?: string;
}

export type PlaceResolution =
  | {
      kind: "resolved";
      place: RegisterPlace;
      /** The ground, in words, for the trace: which step of
       *  the order produced the place, and on what
       *  attestation. */
      via: string;
      /** The ranker's breakdowns, when a consultation was
       *  ranked — the resolution shows its work. */
      breakdown?: CandidateBreakdown[];
    }
  | {
      kind: "ambiguous";
      place: string;
      /** The leaders the margin could not separate, best
       *  first, with their breakdowns. */
      leaders: CandidateBreakdown[];
      detail: string;
    }
  | { kind: "unresolved"; place: string; detail: string }
  | { kind: "unavailable"; place: string; reason: string }
  | { kind: "stale-only"; place: RegisterPlace; detail: string };

function provenanceSummary(p: PlaceProvenance): string {
  if (p.kind === "retrieved") {
    return `retrieved from ${p.dataset}${p.uri ? ` (${p.uri})` : ""} via ${p.retrievedFrom}, confidence ${p.confidence}`;
  }
  if (p.kind === "derived") return `derived: ${p.detail} (inputs: ${p.inputs.join("; ")})`;
  return `configured: ${p.detail}`;
}

/** The containment names a Nominatim candidate attests, in
 *  containing order (county, state, country), excluding the
 *  place itself. */
function nominatimContainment(c: NominatimCandidate): string[] {
  const a = c.address;
  const chain = [a.county, a.state, a.country].filter((v): v is string => typeof v === "string" && v.length > 0);
  return [...new Set(chain)].filter((n) => n.toLowerCase() !== c.name.toLowerCase());
}

/**
 * The consultation's candidate discipline, before ranking —
 * two stated rules, both mirrors of the intake's honesty:
 *
 *  EXACT NAME. When any candidate's name IS the asked name,
 *  only those candidates are eligible (the Wikidata intake's
 *  exact-label rule, wikidata-turn.ts): "Oklahoma" is the
 *  state, not its county — the county is a different name
 *  that contains the word, and it does not stand for the
 *  mention. When no candidate bears the name exactly, all
 *  stand (a name can be asked in a form the service spells
 *  differently, and the ranker then judges the whole set).
 *
 *  ONE PLACE, ONE CANDIDATE. Nominatim returns a settlement
 *  twice over — its place point and its boundary relation,
 *  points a few kilometres apart (the recorded Tulsa search:
 *  two "Tulsa" candidates, 8.6 km apart). Duplicates of one
 *  place are not namesakes: candidates with the same name
 *  whose points lie within 25 km of each other collapse to
 *  the highest-importance one before ranking.
 */
export function eligibleCandidates(candidates: NominatimCandidate[], askedName: string): NominatimCandidate[] {
  const exact = candidates.filter((c) => c.name.toLowerCase() === askedName.toLowerCase());
  const pool = exact.length ? exact : candidates;
  const kept: NominatimCandidate[] = [];
  for (const c of [...pool].sort((a, b) => b.importance - a.importance)) {
    const duplicate = kept.some(
      (k) =>
        k.name.toLowerCase() === c.name.toLowerCase() &&
        haversineKm({ lat: k.latitude, lon: k.longitude }, { lat: c.latitude, lon: c.longitude }) <= 25,
    );
    if (!duplicate) kept.push(c);
  }
  return kept;
}

/**
 * Resolve one named place under the order (§2.3): the
 * register first (fresh facts only), the Wikidata bank
 * imported on read, then the Nominatim consultation — its
 * namesakes ranked, its winner banked. Staleness falls
 * through to consultation; when consultation cannot cure a
 * stale-only holding, the resolution says so (the stale-only
 * decline's ground) rather than serving the stale fact.
 */
export async function resolvePlace(name: string, deps: PlaceResolutionDeps): Promise<PlaceResolution> {
  const now = deps.now ?? new Date();
  const register = deps.register;

  // 1. Banked — the register itself.
  const held = register.placeByName(name);
  if (held?.coordinates && register.freshCoordinates(name, now)) {
    return {
      kind: "resolved",
      place: held,
      via: `the place register holds ${held.name} (coordinates ${provenanceSummary(held.coordinates.provenance)}, banked ${held.coordinates.fetchedAt})`,
    };
  }
  const stale = register.staleCoordinates(name, now);

  // 2. Banked — the Wikidata bank, imported on read (§8).
  let incompleteNote = "";
  if (deps.wikidataBank) {
    const imported = register.importFromWikidataBank(deps.wikidataBank, name, now);
    if (imported?.coordinates && register.freshCoordinates(name, now)) {
      return {
        kind: "resolved",
        place: imported,
        via:
          `the place register, imported on read from the Wikidata bank's record for ${imported.name} ` +
          `(${imported.coordinates.provenance.kind === "retrieved" ? imported.coordinates.provenance.uri : "—"}) — ` +
          `the bank is the immediate source, Wikidata the retrieval behind it`,
      };
    }
    if (imported && !imported.coordinates) {
      // The §3.6 incomplete case: the bank holds the place
      // but no coordinates for it — banking a place is not
      // holding its point, and the declines below say so.
      incompleteNote =
        `the Wikidata bank's record for ${imported.name} stands imported in the register without ` +
        `coordinates — the §3.6 incomplete case; `;
    }
  }

  // 3. Consulted — Nominatim (§4.1).
  if (!deps.nominatim) {
    if (stale) {
      return {
        kind: "stale-only",
        place: held!,
        detail: `the register's only coordinates for ${held!.name} were banked ${stale.fetchedAt} and are past their shelf life (expired ${stale.expiresAt}), and no consultation is wired to re-attest them`,
      };
    }
    return {
      kind: "unresolved",
      place: name,
      detail: `the register holds no fresh coordinates for "${name}"; ${incompleteNote}no consultation is wired to resolve it`,
    };
  }
  const search = await deps.nominatim.search(name);
  if (search.status === "unavailable") {
    if (stale) {
      return {
        kind: "stale-only",
        place: held!,
        detail: `the register's only coordinates for ${held!.name} are past their shelf life (banked ${stale.fetchedAt}, expired ${stale.expiresAt}), and re-consultation was unavailable: ${search.reason}`,
      };
    }
    return { kind: "unavailable", place: name, reason: search.reason };
  }
  if (!search.data.length) {
    if (stale) {
      return {
        kind: "stale-only",
        place: held!,
        detail: `the register's only coordinates for ${held!.name} are past their shelf life (banked ${stale.fetchedAt}, expired ${stale.expiresAt}), and re-consultation resolved no such place`,
      };
    }
    return {
      kind: "unresolved",
      place: name,
      detail: `the register holds no coordinates for "${name}"; ${incompleteNote}and the Nominatim consultation resolved no such place`,
    };
  }

  // Namesakes go to the ranker (§6); the situated place is
  // evidence, and the breakdowns ride along for the trace.
  // The candidate set is first disciplined by the exact-name
  // and one-place-one-candidate rules (eligibleCandidates).
  const eligible = eligibleCandidates(search.data, name);
  const candidates = eligible.map(nominatimToEntityCandidate);
  const breakdown = rankEntities(candidates, {
    mention: name,
    contextText: name,
    expectedKind: deps.expectedKind ?? "place",
    ...(deps.situatedPlace ? { situatedPlace: deps.situatedPlace } : {}),
  });
  const winner = breakdown[0];
  const runnerUp = breakdown[1];
  if (runnerUp && winner.total - runnerUp.total < RANK_MARGIN) {
    const leaders = breakdown.filter((b) => winner.total - b.total < RANK_MARGIN);
    return {
      kind: "ambiguous",
      place: name,
      leaders,
      detail:
        `the Nominatim consultation's eligible set holds ${breakdown.length} candidate(s) for "${name}" and the ranker's ` +
        `margin does not separate the leaders (${leaders.map((b) => `${b.candidate.label} — ${b.candidate.description ?? ""}: ${b.total.toFixed(2)}`).join("; ")}); ` +
        `no candidate was banked and none is picked (§6)`,
    };
  }
  const winning = eligible[candidates.indexOf(winner.candidate)];
  const fetchedAt = now.toISOString();
  register.bankPlace({
    name: winning.name,
    kind: winning.osmType ? winning.osmType.replace(/_/g, " ") : undefined,
    coordinates: { lat: winning.latitude, lon: winning.longitude, standsFor: winning.displayName },
    containment: nominatimContainment(winning),
    provenance: {
      kind: "retrieved",
      dataset: "openstreetmap-nominatim",
      uri: winning.osmId,
      baseVersion: fetchedAt.slice(0, 10),
      retrievedFrom: deps.retrievedFrom ?? "live",
      confidence: 0.9,
      detail: `geocoded by the Nominatim consultation: "${name}" → ${winning.displayName} (${winning.latitude}, ${winning.longitude})`,
    },
    fetchedAt,
  });
  const place = register.placeByName(winning.name) ?? register.placeByName(name)!;
  return {
    kind: "resolved",
    place,
    via:
      `the Nominatim consultation resolved "${name}" to ${winning.displayName} (${winning.latitude}, ` +
      `${winning.longitude}) and the register banked it (retrieved, openstreetmap-nominatim ${winning.osmId}); ` +
      `the ranker's margin over the runner-up was ${runnerUp ? (winner.total - runnerUp.total).toFixed(2) : "unopposed"}`,
    breakdown,
  };
}
