/**
 * geography-turn.ts — the geography wrapper (Geography G2,
 * 2026-11-20; design note docs/ansci/geography-design-note.md
 * §5.2; the how-far shapes added by Geography G3, §5.3): the
 * async seam around the synchronous turn for the what's-there
 * and how-far shapes, on the wikidata/weather wrappers'
 * division of work.
 *
 * processTurn (turn.ts) is synchronous; an Overpass query is
 * not, so the what's-there work lives here. The wrapper
 * detects its shapes in the surface text, runs the ordinary
 * turn (for the record and the trace), and then does the
 * geographic work the synchronous turn cannot: the anchor
 * place is established by GeographyAwareness (the question's
 * own naming, else the interlocutor's stated place, else the
 * configured seat), resolved through the
 * GeographyKnowledgeUnit's protocol (resolvePlace — register,
 * import-on-read, Nominatim consultation), and the
 * what's-there set is read from the register's banked sets
 * or fetched from Overpass — ONE templated union query for
 * every category the bank lacks — banked at the 30-day
 * shelf life, and answered from.
 *
 * WHAT'S-IN, STATED PLAINLY. A what's-in question is
 * answered over the same bounded radius around the place's
 * resolved point as what's-near (the reply states the
 * radius and the point's standing). True containment —
 * inside the place's boundary polygon — is NOT what this
 * slice computes: Overpass area queries keyed by the
 * boundary relation are a later refinement, recorded in the
 * G2 report as a stated limit, not silently approximated.
 *
 * ABSENCE IS THE SOURCE'S, NOT THE WORLD'S. An empty set
 * says OpenStreetMap's data holds nothing of the category
 * within the radius — the reply says exactly that. An
 * Overpass timeout or at-capacity answer is the source
 * being unavailable (a located decline), never an empty
 * set; a stale banked set is never served as current (the
 * stale-only decline). Nothing here guesses a point, picks
 * a namesake, or dresses a banked set as a fresh lookup.
 */
import { processTurn, type TurnResult } from "./turn";
import type { Session } from "./session";
import { defaultPlaceRegister, resolvePlace, type PlaceRegister, type WhatsThereEntry } from "./geography";
import { defaultWikidataBank, type WikidataBank } from "./wikidata-bank";
import { HttpNominatimSource, type NominatimSource } from "./geography-client";
import {
  FixtureOverpassSource,
  HttpOverpassSource,
  WHATS_THERE_DEFAULT_RADIUS_M,
  categoryByWord,
  elementCategories,
  type OverpassSource,
  type WhatsThereCategory,
  WHATS_THERE_CATEGORIES,
  categoryByKey,
} from "./overpass-client";
import {
  FixtureOsrmSource,
  HttpOsrmSource,
  type OsrmSource,
} from "./osrm-client";
import { configuredSeat, interlocutorPlace } from "./geography-awareness";
import { PLACE } from "./place";
import { placeKeyOf } from "./weather-bank";
import { haversineKm } from "./entity-rank";

/* ---------------- the shapes (§5.2) ---------------- */

export type GeographyQuestion =
  | { kind: "whats-near"; placeName?: string; categories: string[] }
  | { kind: "whats-in"; placeName?: string; categories: string[] }
  | { kind: "is-there"; placeName?: string; category: string }
  | { kind: "how-far"; fromName?: string; toName?: string };

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[?.!,;]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A deictic place phrase ("me", "here", "this place") names
 *  no place: the anchor then comes from the situated
 *  readings, not the question. */
function placeNameOf(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const p = raw.trim();
  if (!p || ["me", "here", "this place", "my location"].includes(p)) return undefined;
  return p;
}

/** The category phrase of a what's-X question: empty means
 *  the whole category table; otherwise the phrase must be
 *  category words joined by "and"/"," — a phrase with other
 *  words in it ("the weather") is not this shape at all. */
function categoriesOf(phrase: string): string[] | undefined {
  const p = phrase
    .replace(/^the\s+/, "")
    .replace(/\s+(?:is|are)$/, "")
    .trim();
  if (!p) return WHATS_THERE_CATEGORIES.map((c) => c.key);
  const parts = p.split(/\s*(?:,|\band\b)\s*/).filter(Boolean);
  const keys: string[] = [];
  for (const part of parts) {
    const cat = categoryByWord(part) ?? categoryByWord(part.replace(/\s+/g, " "));
    if (!cat) return undefined;
    if (!keys.includes(cat.key)) keys.push(cat.key);
  }
  return keys.length ? keys : undefined;
}

export function detectGeographyQuestion(text: string): GeographyQuestion | undefined {
  const t = normalise(text);

  // How-far (G3, §5.3): "how far is X from Y", "how far is
  // it from X to Y", and the drive-time forms. An endpoint
  // of "here"/"me" is deictic (placeNameOf drops it) and
  // the situated readings supply it in the wrapper.
  const farIt = t.match(/^how far is it from (.+?) to (.+)$/);
  if (farIt) {
    return { kind: "how-far", fromName: placeNameOf(farIt[1]), toName: placeNameOf(farIt[2]) };
  }
  const farFrom = t.match(/^how far is (.+?) from (.+)$/);
  if (farFrom) {
    return { kind: "how-far", toName: placeNameOf(farFrom[1]), fromName: placeNameOf(farFrom[2]) };
  }
  const drive = t.match(/^how long (?:does it take|is the drive|is it) to drive from (.+?) to (.+)$/);
  if (drive) {
    return { kind: "how-far", fromName: placeNameOf(drive[1]), toName: placeNameOf(drive[2]) };
  }

  const isThere = t.match(/^is there (?:a |an |any )?(.+?) (near|around|in) (.+)$/);
  if (isThere) {
    const cat = categoryByWord(isThere[1].trim());
    if (!cat) return undefined;
    return { kind: "is-there", category: cat.key, placeName: placeNameOf(isThere[3]) };
  }

  const whats = t.match(/^what(?:'s| is| are)?\s+(.*?)\s*(near|around|in)\s+(.+)$/);
  if (whats) {
    const categories = categoriesOf(whats[1]);
    if (!categories) return undefined;
    return {
      kind: whats[2] === "in" ? "whats-in" : "whats-near",
      categories,
      placeName: placeNameOf(whats[3]),
    };
  }
  return undefined;
}

/* ---------------- the wrapper ---------------- */

export interface GeographyTurnOptions {
  /** The Overpass source (live HTTP by default; tests inject
   *  the fixture source — gated tests never touch the
   *  network). */
  overpass?: OverpassSource;
  /** The OSRM source for how-far computations (live HTTP by
   *  default; tests inject the fixture source). */
  osrm?: OsrmSource;
  /** The place register (process-level default by default). */
  placeRegister?: PlaceRegister;
  /** The Wikidata bank the resolution imports from on read. */
  wikidataBank?: WikidataBank;
  /** The Nominatim consultation (live HTTP by default). */
  geographySource?: NominatimSource;
  /** The what's-there radius, metres (default: the
   *  template's stated default, 10 km). */
  radiusM?: number;
  /** The clock (default: now). */
  now?: () => Date;
  /** Provenance label for consultation routes (default
   *  "live"; fixture callers pass "fixture"). */
  retrievedFrom?: string;
}

/** The configured seat's coordinates enter the resolution
 *  through the register, as in the weather wrapper (§2.3's
 *  configured step). */
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

/** The ranker's proximity evidence (§6), as in the weather
 *  wrapper: the conversation's situated place, when it is a
 *  different place whose point the register already holds. */
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

function fmtKm(km: number): string {
  return km < 10 ? km.toFixed(1) : String(Math.round(km));
}

/* ---------------- how-far (G3, §4.3, §5.3) ---------------- */

const KM_TO_MILES = 0.621371;

function fmtMiles(km: number): string {
  const miles = km * KM_TO_MILES;
  return miles < 20 ? miles.toFixed(1) : String(Math.round(miles));
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/**
 * The how-far answer (§5.3): a COMPUTATION, stated as one.
 * Both endpoints resolve through the register protocol; the
 * road figure is OSRM's computation over the two resolved
 * points, the straight line is computed locally from the
 * same points, and the trace's detail carries the whole
 * derivation — the resolved points with their standings,
 * the raw computed quantities, the source and the fetch
 * time. A banked route inside its 7-day shelf life answers
 * without recomputation; an unavailable routing source
 * still leaves the straight line, and the reply names the
 * road figure it could not compute rather than declining
 * outright (§9.3). A decline stands at the endpoint that
 * failed, and says which end it was.
 */
async function answerHowFar(
  session: Session,
  result: TurnResult,
  question: { fromName?: string; toName?: string },
  opts: GeographyTurnOptions,
): Promise<TurnResult> {
  const register = opts.placeRegister ?? defaultPlaceRegister;
  const wikidataBank = opts.wikidataBank ?? defaultWikidataBank;
  const nominatim = opts.geographySource ?? new HttpNominatimSource();
  const osrm = opts.osrm ?? new HttpOsrmSource();
  const now = (opts.now ?? (() => new Date()))();
  const priorDecline = result.trace.declineReason;

  const finish = (
    action: NonNullable<TurnResult["trace"]["geography"]>["action"],
    reply: string,
    detail: string,
    extra?: { fetchedAt?: string; expiresAt?: string; place?: string; declineReason?: string },
  ): TurnResult => {
    result.trace.geography = {
      action,
      shape: "how-far",
      ...(extra?.place ? { place: extra.place } : {}),
      ...(extra?.fetchedAt ? { fetchedAt: extra.fetchedAt } : {}),
      ...(extra?.expiresAt ? { expiresAt: extra.expiresAt } : {}),
      detail,
      ...(priorDecline ? { priorDecline } : {}),
    };
    if (extra?.declineReason) {
      result.trace.declineReason = extra.declineReason;
      result.trace.planNote =
        "geography wrapper (Geography G3): the turn's own outcome was replaced by the wrapper's located " +
        "decline — the geographic computation's outcome, stated at its location, not a claim about the world";
    }
    return { reply, trace: result.trace };
  };

  // The endpoints: the question's namings, with a deictic
  // end supplied by the situated readings (§5.3: "from
  // here" is the interlocutor's stated place, else the seat).
  const situated = interlocutorPlace(session)?.place ?? configuredSeat().place ?? undefined;
  const fromName = question.fromName ?? situated;
  const toName = question.toName ?? situated;
  if (!fromName || !toName) {
    const missingEnd = !fromName && !toName ? "either end" : !fromName ? "the starting place" : "the destination";
    // DRAFT wording — the owner's to settle.
    return finish(
      "no-place",
      "I don't know where you are, and no place is configured for me, so I can't measure that distance.",
      `the how-far question leaves ${missingEnd} deictic, the conversation states no place, and the ` +
        "configured seat is unset: the gap is located in GeographyAwareness's situated reading (§3)",
      {
        declineReason:
          "the question asks a distance from/to the asker's place, but no place stands for the asker " +
          "in the conversation record and none is configured; the gap is located at the missing situated place (§9.4)",
      },
    );
  }

  // Both endpoints through the protocol, in turn; a failure
  // declines at that endpoint.
  const endpoints: { role: "from" | "to"; asked: string; place: string; lat: number; lon: number; standsFor: string; via: string }[] = [];
  for (const [role, asked] of [
    ["from", fromName],
    ["to", toName],
  ] as const) {
    bankConfiguredCoordinates(register, asked, now);
    const resolution = await resolvePlace(asked, {
      register,
      wikidataBank,
      nominatim,
      situatedPlace: situatedEvidence(session, asked, register, now),
      now,
      retrievedFrom: opts.retrievedFrom ?? "live",
    });
    const endLabel = role === "from" ? `the starting place (${asked})` : `the destination (${asked})`;
    if (resolution.kind === "ambiguous") {
      const leaders = resolution.leaders.map((b) => b.candidate.description ?? b.candidate.label).join("; ");
      // DRAFT wording — the owner's to settle.
      return finish(
        "place-ambiguous",
        `More than one place is called ${asked} — ${leaders} — and I can't tell which one you mean.`,
        `the geography resolution for ${endLabel} ended ambiguous: ${resolution.detail} (Geography G3)`,
        {
          place: asked,
          declineReason:
            `the question asks a distance involving ${asked}, but the name is borne by several places ` +
            `and the ranking does not separate them; the gap is located at the ambiguous ${role}-place (§6)`,
        },
      );
    }
    if (resolution.kind === "unavailable") {
      // DRAFT wording — the owner's to settle.
      return finish(
        "source-unavailable",
        `I couldn't look up ${asked} just now — the place lookup is unavailable.`,
        `the geography consultation for ${endLabel} returned unavailable: ${resolution.reason} (Geography G3)`,
        {
          place: asked,
          declineReason:
            `the question asks a distance involving ${asked}, and the consultation that could have ` +
            `placed it was unavailable (${resolution.reason}); the gap is located at the unavailable lookup (§9.4)`,
        },
      );
    }
    if (resolution.kind === "stale-only") {
      // DRAFT wording — the owner's to settle.
      return finish(
        "stale-only",
        `The only coordinates I hold for ${asked} are out of date, and I couldn't refresh them.`,
        `the geography resolution for ${endLabel} ended stale-only: ${resolution.detail} (Geography G3)`,
        {
          place: asked,
          declineReason:
            `the question asks a distance involving ${asked}, and the only coordinates held for it are ` +
            `past their shelf life, with re-consultation failing to refresh them; the gap is located at the stale holding (§9.4)`,
        },
      );
    }
    if (resolution.kind === "unresolved" || !resolution.place.coordinates) {
      // DRAFT wording — the owner's to settle.
      return finish(
        "place-unresolved",
        `I couldn't place ${asked} in what I hold or can look up, so I can't measure that distance.`,
        resolution.kind === "unresolved"
          ? `the geography resolution for ${endLabel} ended unresolved: ${resolution.detail} (Geography G3)`
          : `the geography resolution for ${endLabel} resolved the place but banked no coordinates for it (Geography G3)`,
        {
          place: asked,
          declineReason:
            `the question asks a distance involving ${asked}, but no coordinates for the place stand ` +
            `in what the system holds or could consult; the gap is located at the unresolvable ${role}-place (§9.4)`,
        },
      );
    }
    const coords = resolution.place.coordinates.value;
    endpoints.push({
      role,
      asked,
      place: resolution.place.name,
      lat: coords.lat,
      lon: coords.lon,
      standsFor: coords.standsFor,
      via: resolution.via,
    });
  }
  const from = endpoints[0];
  const to = endpoints[1];
  const straightLineKm = haversineKm({ lat: from.lat, lon: from.lon }, { lat: to.lat, lon: to.lon });
  const derivationBase =
    `how-far derivation: from ${from.place} (${from.lat}, ${from.lon} — ${from.standsFor}; resolved: ${from.via}) ` +
    `to ${to.place} (${to.lat}, ${to.lon} — ${to.standsFor}; resolved: ${to.via}); ` +
    `straight-line ${straightLineKm.toFixed(2)} km computed locally from the two points`;

  // A fresh banked route answers without recomputation.
  const banked = register.routeFor(from.place, to.place, now);
  if (banked) {
    // DRAFT wording — the owner's to settle.
    return finish(
      "answered-from-bank",
      `${to.place} is about ${fmtMiles(banked.roadDistanceMeters / 1000)} road-miles from ${from.place} ` +
        `(about ${fmtDuration(banked.roadDurationSeconds)} by road); as the crow flies, about ${fmtMiles(banked.straightLineKm)} miles. ` +
        `(Road distance and time computed by OSRM from the two resolved points.)`,
      `${derivationBase}; road figure from the banked route (computed ${banked.fetchedAt}, ` +
        `${banked.roadDistanceMeters} m / ${banked.roadDurationSeconds} s, shelf life to ${banked.expiresAt})`,
      { place: to.place, fetchedAt: banked.fetchedAt, expiresAt: banked.expiresAt },
    );
  }

  const computed = await osrm.route({ lat: from.lat, lon: from.lon }, { lat: to.lat, lon: to.lon });
  if (computed.status === "unavailable") {
    // The straight line still answers (§9.3); the reply
    // names the figure it could not compute.
    // DRAFT wording — the owner's to settle.
    return finish(
      "computed-straight-line",
      `${to.place} is about ${fmtMiles(straightLineKm)} miles from ${from.place} as the crow flies. ` +
        `I couldn't compute the road distance just now — the routing source is unavailable.`,
      `${derivationBase}; the OSRM computation was unavailable: ${computed.reason} — the answer is the ` +
        "straight line alone, and the reply says the road figure is missing rather than declining (§9.3)",
      { place: to.place },
    );
  }

  const fetchedAt = now.toISOString();
  register.bankRoute({
    fromName: from.place,
    toName: to.place,
    fromPoint: { lat: from.lat, lon: from.lon },
    toPoint: { lat: to.lat, lon: to.lon },
    roadDistanceMeters: computed.data.distanceMeters,
    roadDurationSeconds: computed.data.durationSeconds,
    straightLineKm,
    provenance: {
      kind: "derived",
      detail:
        `computed by OSRM (routing.openstreetmap.de) over OpenStreetMap's road graph between the two ` +
        `resolved points, fetched ${fetchedAt}; the straight line computed locally from the same points`,
      inputs: [
        `${from.place}'s coordinates (${from.lat}, ${from.lon}) — resolved: ${from.via}`,
        `${to.place}'s coordinates (${to.lat}, ${to.lon}) — resolved: ${to.via}`,
      ],
    },
    fetchedAt,
  });
  const record = register.routeFor(from.place, to.place, now)!;
  // DRAFT wording — the owner's to settle.
  return finish(
    "looked-up-and-banked",
    `${to.place} is about ${fmtMiles(record.roadDistanceMeters / 1000)} road-miles from ${from.place} ` +
      `(about ${fmtDuration(record.roadDurationSeconds)} by road); as the crow flies, about ${fmtMiles(record.straightLineKm)} miles. ` +
      `(Road distance and time computed by OSRM from the two resolved points.)`,
    `${derivationBase}; road figure computed by OSRM at ${fetchedAt}: ${record.roadDistanceMeters} m / ` +
      `${record.roadDurationSeconds} s, banked at the 7-day route shelf life (to ${record.expiresAt})`,
    { place: to.place, fetchedAt: record.fetchedAt, expiresAt: record.expiresAt },
  );
}

export async function processTurnWithGeography(
  session: Session,
  text: string,
  opts: GeographyTurnOptions = {},
): Promise<TurnResult> {
  const question = detectGeographyQuestion(text);
  if (!question) return processTurn(session, text);

  const result = processTurn(session, text);
  if (question.kind === "how-far") {
    return answerHowFar(session, result, question, opts);
  }
  const register = opts.placeRegister ?? defaultPlaceRegister;
  const wikidataBank = opts.wikidataBank ?? defaultWikidataBank;
  const nominatim = opts.geographySource ?? new HttpNominatimSource();
  const overpass = opts.overpass ?? new HttpOverpassSource();
  const now = (opts.now ?? (() => new Date()))();
  const radiusM = opts.radiusM ?? WHATS_THERE_DEFAULT_RADIUS_M;
  const radiusKm = radiusM / 1000;
  const shape = question.kind;
  const categories: string[] = question.kind === "is-there" ? [question.category] : question.categories;
  const priorDecline = result.trace.declineReason;

  const finish = (
    action: NonNullable<TurnResult["trace"]["geography"]>["action"],
    reply: string,
    detail: string,
    extra?: { fetchedAt?: string; expiresAt?: string; place?: string; declineReason?: string },
  ): TurnResult => {
    result.trace.geography = {
      action,
      shape,
      categories,
      ...(extra?.place ? { place: extra.place } : {}),
      ...(extra?.fetchedAt ? { fetchedAt: extra.fetchedAt } : {}),
      ...(extra?.expiresAt ? { expiresAt: extra.expiresAt } : {}),
      detail,
      ...(priorDecline ? { priorDecline } : {}),
    };
    if (extra?.declineReason) {
      result.trace.declineReason = extra.declineReason;
      result.trace.planNote =
        "geography wrapper (Geography G2): the turn's own outcome was replaced by the wrapper's located " +
        "decline — the geographic lookup's outcome, stated at its location, not a claim about the world";
    }
    return { reply, trace: result.trace };
  };

  // The anchor: the question's naming, else the situated
  // readings (GeographyAwareness) — interlocutor-stated,
  // then the configured seat (§2.3's order for un-named
  // places).
  const anchorName =
    question.placeName ?? interlocutorPlace(session)?.place ?? configuredSeat().place ?? undefined;
  if (!anchorName) {
    // DRAFT wording — the owner's to settle.
    return finish(
      "no-place",
      "I don't know where you are, and no place is configured for me, so I can't say what is near you.",
      "the question names no place, the conversation states none, and the configured seat is unset: " +
        "the gap is located in GeographyAwareness's situated reading (§3), before any resolution or lookup",
      {
        declineReason:
          "the question asks what is near the asker, but no place stands for the asker in the " +
          "conversation record and none is configured; the gap is located at the missing situated place (§9.4)",
      },
    );
  }

  // The resolution protocol (§2.3/§5), as the weather
  // wrapper runs it.
  bankConfiguredCoordinates(register, anchorName, now);
  const resolution = await resolvePlace(anchorName, {
    register,
    wikidataBank,
    nominatim,
    situatedPlace: situatedEvidence(session, anchorName, register, now),
    now,
    retrievedFrom: opts.retrievedFrom ?? "live",
  });
  if (resolution.kind === "ambiguous") {
    const leaders = resolution.leaders.map((b) => b.candidate.description ?? b.candidate.label).join("; ");
    // DRAFT wording — the owner's to settle.
    return finish(
      "place-ambiguous",
      `More than one place is called ${anchorName} — ${leaders} — and I can't tell which one you mean.`,
      `the geography resolution for "${anchorName}" ended ambiguous: ${resolution.detail} (Geography G2)`,
      {
        place: anchorName,
        declineReason:
          `the question asks what is near/in ${anchorName}, but the name is borne by several places ` +
          `and the ranking does not separate them; the gap is located at the ambiguous place (§6)`,
      },
    );
  }
  if (resolution.kind === "unavailable") {
    // DRAFT wording — the owner's to settle.
    return finish(
      "source-unavailable",
      `I couldn't look up ${anchorName} just now — the place lookup is unavailable.`,
      `the geography consultation for "${anchorName}" returned unavailable: ${resolution.reason} (Geography G2)`,
      {
        place: anchorName,
        declineReason:
          `the question asks what is near/in ${anchorName}, and the consultation that could have ` +
          `placed it was unavailable (${resolution.reason}); the gap is located at the unavailable lookup (§9.4)`,
      },
    );
  }
  if (resolution.kind === "stale-only") {
    // DRAFT wording — the owner's to settle.
    return finish(
      "stale-only",
      `The only coordinates I hold for ${anchorName} are out of date, and I couldn't refresh them.`,
      `the geography resolution for "${anchorName}" ended stale-only: ${resolution.detail} (Geography G2)`,
      {
        place: anchorName,
        declineReason:
          `the question asks what is near/in ${anchorName}, and the only coordinates held for it are ` +
          `past their shelf life, with re-consultation failing to refresh them; the gap is located at the stale holding (§9.4)`,
      },
    );
  }
  if (resolution.kind === "unresolved" || !resolution.place.coordinates) {
    // DRAFT wording — the owner's to settle.
    return finish(
      "place-unresolved",
      `I couldn't place ${anchorName} in what I hold or can look up, so I can't say what is near it.`,
      resolution.kind === "unresolved"
        ? `the geography resolution for "${anchorName}" ended unresolved: ${resolution.detail} (Geography G2)`
        : `the geography resolution for "${anchorName}" resolved the place but banked no coordinates for it (Geography G2)`,
      {
        place: anchorName,
        declineReason:
          `the question asks what is near/in ${anchorName}, but no coordinates for the place stand ` +
          `in what the system holds or could consult; the gap is located at the unresolvable place (§9.4)`,
      },
    );
  }

  const place = resolution.place;
  const point = place.coordinates!.value;
  const pointNote = `${point.lat}, ${point.lon} (${point.standsFor})`;

  // The what's-there sets: the register's bank first; one
  // templated union query for every category the bank lacks.
  const sets = new Map<string, { entries: WhatsThereEntry[]; fetchedAt: string; expiresAt: string }>();
  const missing: WhatsThereCategory[] = [];
  for (const key of categories) {
    const fresh = register.whatsThereFor(place.name, key, now);
    if (fresh) {
      sets.set(key, { entries: fresh.entries, fetchedAt: fresh.fetchedAt, expiresAt: fresh.expiresAt });
    } else {
      const cat = categoryByKey(key);
      if (cat) missing.push(cat);
    }
  }
  let lookedUp = false;
  if (missing.length) {
    const answer = await overpass.whatsThere(missing, point.lat, point.lon, radiusM);
    if (answer.status === "unavailable") {
      const stale = missing.find((c) => register.staleWhatsThereFor(place.name, c.key, now));
      if (stale) {
        const staleRecord = register.staleWhatsThereFor(place.name, stale.key, now)!;
        // DRAFT wording — the owner's to settle.
        return finish(
          "stale-only",
          `The only ${stale.noun} set I hold for ${place.name} is out of date, and I couldn't refresh it just now.`,
          `the register's what's-there set for ${place.name}/${stale.key} was banked ${staleRecord.fetchedAt} ` +
            `and expired ${staleRecord.expiresAt}; the Overpass refresh was unavailable: ${answer.reason} (Geography G2)`,
          {
            place: place.name,
            declineReason:
              `the question asks about ${stale.noun}s near/in ${place.name}, and the only banked set ` +
              `is past its 30-day shelf life with the source unavailable to refresh it; the gap is located at the stale holding (§9.4)`,
          },
        );
      }
      // DRAFT wording — the owner's to settle.
      return finish(
        "source-unavailable",
        `I couldn't look up what is near ${place.name} just now — the what's-there source is unavailable.`,
        `the Overpass consultation for ${place.name} (${missing.map((c) => c.key).join(", ")}) returned ` +
          `unavailable: ${answer.reason}; no banked set stands for the missing categories (Geography G2)`,
        {
          place: place.name,
          declineReason:
            `the question asks what is near/in ${place.name}, the place resolved, and the what's-there ` +
            `source was unavailable (${answer.reason}); the gap is located at the unavailable source (§9.4)`,
        },
      );
    }
    lookedUp = true;
    const fetchedAt = now.toISOString();
    for (const cat of missing) {
      const entries: WhatsThereEntry[] = answer.data
        .filter((e) => elementCategories(e, [cat]).includes(cat.key))
        .map((e) => ({
          ...(e.name ? { name: e.name } : {}),
          category: cat.key,
          lat: e.latitude,
          lon: e.longitude,
          distanceKm: haversineKm({ lat: point.lat, lon: point.lon }, { lat: e.latitude, lon: e.longitude }),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
      register.bankWhatsThere(place.name, cat.key, entries, {
        kind: "retrieved",
        dataset: "openstreetmap-overpass",
        baseVersion: fetchedAt.slice(0, 10),
        retrievedFrom: opts.retrievedFrom ?? "live",
        confidence: 0.9,
        detail:
          `what's-there consultation: ${cat.key} within ${radiusKm} km of ${place.name}'s resolved ` +
          `point ${pointNote}; distances computed locally from the returned points`,
      }, fetchedAt);
      const banked = register.whatsThereFor(place.name, cat.key, now)!;
      sets.set(cat.key, { entries: banked.entries, fetchedAt: banked.fetchedAt, expiresAt: banked.expiresAt });
    }
  }

  const newest = [...sets.values()].sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt))[0];
  const sourceNote = "(From OpenStreetMap via Overpass.)";
  const action = lookedUp ? "looked-up-and-banked" : "answered-from-bank";
  const detailBase =
    `the place resolved ${resolution.via}; what's-there sets for ${place.name}: ` +
    `${categories.map((k) => `${k} (${sets.get(k)?.entries.length ?? 0} entries)`).join(", ")}; ` +
    `radius ${radiusKm} km around the resolved point ${pointNote}`;

  if (question.kind === "is-there") {
    const cat = categoryByKey(question.category)!;
    const entries = sets.get(question.category)?.entries ?? [];
    if (entries.length) {
      const nearest = entries[0];
      // DRAFT wording — the owner's to settle.
      return finish(
        action,
        `Yes — ${nearest.name ? `${nearest.name} is` : `a ${cat.noun} is`} about ${fmtKm(nearest.distanceKm)} km from ${place.name}. ${sourceNote}`,
        `${detailBase}; the nearest ${cat.key} attestation is ${nearest.name ?? "an unnamed element"} at ${fmtKm(nearest.distanceKm)} km`,
        { place: place.name, fetchedAt: newest?.fetchedAt, expiresAt: newest?.expiresAt },
      );
    }
    // DRAFT wording — the owner's to settle.
    return finish(
      action,
      `I found no ${cat.noun} within ${radiusKm} km of ${place.name} in OpenStreetMap's data. ${sourceNote}`,
      `${detailBase}; the ${cat.key} set is empty — an attested absence in the source's data, not a claim about the world`,
      { place: place.name, fetchedAt: newest?.fetchedAt, expiresAt: newest?.expiresAt },
    );
  }

  // whats-near / whats-in: named entries, nearest first.
  const named = categories
    .flatMap((k) => (sets.get(k)?.entries ?? []).filter((e) => e.name))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  const emptyCats = categories.filter((k) => !(sets.get(k)?.entries.length));
  const shown = question.categories.length === 1 ? named.slice(0, 5) : named.slice(0, 8);
  const parts: string[] = [];
  if (shown.length) {
    parts.push(
      shown
        .map((e) => `${e.name} (${categoryByKey(e.category)?.noun ?? e.category}, ${fmtKm(e.distanceKm)} km)`)
        .join(", "),
    );
  }
  for (const k of emptyCats) {
    parts.push(`no ${categoryByKey(k)?.noun ?? k}s in the data within the radius`);
  }
  if (!parts.length) parts.push("nothing named in the data within the radius");
  // DRAFT wording — the owner's to settle. The radius and
  // the point's standing are stated in the reply: a
  // what's-in answer over a radius says so (§5.2's honesty,
  // and the header's stated limit).
  return finish(
    action,
    `${question.kind === "whats-in" ? "In" : "Near"} ${place.name} (within ${radiusKm} km of its resolved point): ${parts.join("; ")}. ${sourceNote}`,
    detailBase,
    { place: place.name, fetchedAt: newest?.fetchedAt, expiresAt: newest?.expiresAt },
  );
}

export { FixtureOverpassSource, FixtureOsrmSource };
