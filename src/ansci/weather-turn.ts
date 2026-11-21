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
import { closeFiredItem, registerSchedule, standingInstantISO } from "./scheduling";
import { turnTimeStanding } from "./timekeeping";
import { noteWeatherReadingBanked, registerExpectation } from "./expectation";

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

interface WeatherDeps {
  source: WeatherSource;
  bank: WeatherBank;
  wikidataBank: WikidataBank;
  register: PlaceRegister;
  geographySource: NominatimSource;
  now: Date;
  ttl: number;
  retrievedFrom: string;
}

/** Build the banked reading from an observation, exactly as
 *  the lookup flow banks it — one construction for both the
 *  lookup's banking and the re-consultation's re-banking. */
function readingFromObservation(
  statedPlace: string,
  coordinates: { lat: number; lon: number },
  observation: { resolvedName: string; stationId: string; timeISO: string; temperatureC: number; conditionText: string; precipitationMm?: number },
  deps: WeatherDeps,
): WeatherReading {
  const flags = weatherFlagsForNwsText(observation.conditionText, observation.precipitationMm);
  return {
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
    fetchedAt: deps.now.toISOString(),
    expiresAt: new Date(deps.now.getTime() + deps.ttl * 60_000).toISOString(),
    source: "api.weather.gov",
    retrievedFrom: deps.retrievedFrom,
  };
}

/**
 * Scheduled re-consultation (Scheduling T2, design §3.3,
 * §5.2): a reading banked by a live lookup registers its
 * own refresh — an item that falls due at the reading's
 * expiry, owed by the weather wrapper, whose demand the
 * Planner prices at the sweep. The registration's own
 * expiry stands one further shelf life past the trigger:
 * a refresh attempted within that window is still worth
 * making; past it, the place's weather is a fresh
 * question's business and the item lapses accounted
 * (§5.3). One open re-check per place: a second banking
 * while one stands does not stack another.
 */
function registerWeatherRecheck(session: Session, reading: WeatherReading, ttlMinutes: number): void {
  const open = session.schedule.some(
    (i) =>
      (i.status === "standing" || i.status === "due-raised") &&
      i.consumer?.kind === "weather-reconsult" &&
      placeKeyOf(i.consumer.placeName) === reading.placeKey,
  );
  if (open) return;
  registerSchedule(
    session,
    {
      owed: `a fresh weather reading for ${reading.statedPlace}`,
      trigger: { kind: "at", instantISO: reading.expiresAt },
      registeredBy: "the weather wrapper",
      registrationExpiresISO: new Date(Date.parse(reading.expiresAt) + ttlMinutes * 60_000).toISOString(),
      onDue: `re-consult the weather source for ${reading.statedPlace} and re-bank the reading`,
      consumer: { kind: "weather-reconsult", placeName: reading.statedPlace },
    },
    turnTimeStanding(session)?.standing,
  );
}

/** The expectation's deadline horizon for a weather wait:
 *  one weather shelf life past the registration instant —
 *  the wait is for the next reading the source can give,
 *  and a wait longer than the fact's own freshness would
 *  be waiting on a different question. A stated choice,
 *  flagged in the T3 report for ratification. */
const WEATHER_EXPECTATION_HORIZON_MS = 30 * 60_000;

/**
 * §5.1's hand-off, weather side (Expectation T3): a
 * weather decline whose gap the world can close — the
 * lookup unavailable, the coordinates missing, the only
 * holding stale — registers an Expectation over the
 * problem record the decline filed, plus the scheduled
 * re-check (§5.1 step 3) that will re-run the resolution
 * at the next turn boundary, its registration expiring no
 * later than the expectation's deadline. The visitor is
 * told the located gap AND that the question is being
 * kept open (§5.1 step 2) — the second clause states a
 * fact about a registration that exists.
 *
 * Not every weather decline qualifies, and the exclusions
 * are §4.3's test applied: the coverage decline names a
 * place this source cannot serve — no arrival from the
 * named chain can satisfy it; the ambiguity decline waits
 * on the interlocutor's disambiguation, a different
 * satisfier than this chain delivers (eligible in design,
 * not wired here — flagged in the T3 report). Where no
 * standing instant can be stated, no deadline can be
 * stated either, and §4.2's rule governs: not registered.
 * Returns whether an expectation now stands.
 */
function registerWeatherExpectation(session: Session, statedPlace: string): boolean {
  const standing = turnTimeStanding(session)?.standing;
  const nowISO = standingInstantISO(standing);
  if (!standing || !nowISO) return false;
  const problem = [...session.problems]
    .reverse()
    .find(
      (p) =>
        p.openedTurn === session.turnCount &&
        p.need === "lack-of-information" &&
        p.status !== "closed" &&
        !p.expectationId,
    );
  if (!problem) return false;
  const deadlineISO = new Date(Date.parse(nowISO) + WEATHER_EXPECTATION_HORIZON_MS).toISOString();
  const registered = registerExpectation(
    session,
    {
      problemId: problem.id,
      satisfier: { kind: "fact", fact: "weather-reading", placeName: statedPlace },
      satisfierStatement: `a current weather reading for ${statedPlace}`,
      expectedFrom: "the geography consultation chain (the place register, then the geocoding consultation) and the weather source",
      deadlineISO,
      onSatisfaction: `answer the waiting weather question for ${statedPlace} from the banked reading, as a self-turn`,
      onTimeout: `raise the timeout: the weather reading for ${statedPlace} did not arrive by ${deadlineISO}`,
      registeredBy: "the weather wrapper",
    },
    standing,
  );
  if (!registered.ok) return false;
  registerSchedule(
    session,
    {
      owed: `re-run the weather resolution for ${statedPlace}`,
      trigger: { kind: "at", instantISO: nowISO },
      registeredBy: "the weather wrapper",
      registrationExpiresISO: deadlineISO,
      onDue: `re-consult the weather source for ${statedPlace} and re-bank the reading`,
      consumer: { kind: "weather-reconsult", placeName: statedPlace },
    },
    standing,
  );
  return true;
}

/**
 * The wired consumer (§5.2's chain, priced and executed):
 * the opening sweep raised the demands of any due items;
 * for the weather re-consultations among them, this
 * wrapper is the machinery the owed action names — it
 * prices the demand (the place's reading is stale or
 * staling and the source is the one the registration
 * named, so the price carries) and executes: resolve the
 * place through the geography pair's protocol, fetch,
 * re-bank, and close the item fired-and-done, with the
 * firing, the pricing and the re-bank all recorded on the
 * sweep outcome the trace already carries. A re-check that
 * meets an unavailable source (or an unresolvable place,
 * or the coverage limit) is a stated state recorded on
 * the item (§5.3): the item stands due, the wait continues
 * to its registration expiry, and no stale reading is
 * served in its place.
 */
async function runDueWeatherRechecks(session: Session, result: TurnResult, deps: WeatherDeps): Promise<void> {
  const outcomes = result.trace.scheduleSweep;
  if (!outcomes?.length) return;
  for (const outcome of outcomes) {
    if (outcome.outcome !== "due") continue;
    const item = session.schedule.find((i) => i.id === outcome.itemId);
    if (!item?.consumer || item.consumer.kind !== "weather-reconsult") continue;
    const placeName = item.consumer.placeName;
    const fail = (stateDetail: string): void => {
      outcome.outcome = "reconsult-unavailable";
      outcome.pricing =
        "priced by the Planner and executed: the re-consultation was attempted at this sweep — " +
        "registration was not authorisation, and the pricing happened here, at due time (§3.1)";
      outcome.detail +=
        `; the re-consultation met ${stateDetail} — a stated state, recorded on the item; the wait ` +
        `continues to the registration's expiry and the stale reading is not served (§5.3)`;
      item.events.push({
        atISO: deps.now.toISOString(),
        detail: `re-consultation attempted at a due sweep and met ${stateDetail}`,
      });
    };
    bankConfiguredCoordinates(deps.register, placeName, deps.now);
    const resolution = await resolvePlace(placeName, {
      register: deps.register,
      wikidataBank: deps.wikidataBank,
      nominatim: deps.geographySource,
      situatedPlace: situatedEvidence(session, placeName, deps.register, deps.now),
      now: deps.now,
      retrievedFrom: deps.retrievedFrom,
    });
    if (resolution.kind !== "resolved" || !resolution.place.coordinates) {
      fail(`a geography resolution of '${resolution.kind}' for ${placeName}`);
      continue;
    }
    const coordinates = resolution.place.coordinates.value;
    const conditions = await deps.source.currentConditions(coordinates.lat, coordinates.lon);
    if (conditions.status === "out-of-coverage") {
      fail(`the weather source's coverage limit — ${placeName} is outside the United States`);
      continue;
    }
    if (conditions.status === "unavailable") {
      fail(`an unavailable weather source (${conditions.reason})`);
      continue;
    }
    const reading = readingFromObservation(placeName, coordinates, conditions.data, deps);
    deps.bank.put(reading);
    closeFiredItem(
      session,
      item.id,
      `fired and done: the scheduled re-consultation re-banked a fresh reading for ${placeName} ` +
        `(fetched ${reading.fetchedAt})`,
      turnTimeStanding(session)?.standing,
    );
    outcome.outcome = "reconsulted";
    outcome.pricing =
      "priced by the Planner and executed: the re-consultation the item owed was carried out at " +
      "this sweep — registration was not authorisation, and the pricing happened here, at due time (§3.1)";
    outcome.rebanked = { placeName, fetchedAt: reading.fetchedAt };
    outcome.detail +=
      `; the re-consultation re-banked a fresh reading for ${placeName} (fetched ${reading.fetchedAt}, ` +
      `shelf life ${deps.ttl} minutes)`;
    // The refreshed reading registers its own refresh, as
    // every live banking does — the chain continues.
    registerWeatherRecheck(session, reading, deps.ttl);
    // And the banking is noticed by any expectation
    // waiting on it (§5.1 step 6): satisfactions append
    // to the turn's expectation annotation.
    const satisfied = noteWeatherReadingBanked(session, reading, turnTimeStanding(session)?.standing);
    if (satisfied.length) {
      result.trace.expectationSweep = [...(result.trace.expectationSweep ?? []), ...satisfied];
    }
  }
}

export async function processTurnWithWeather(
  session: Session,
  text: string,
  opts: WeatherTurnOptions = {},
): Promise<TurnResult> {
  const result = processTurn(session, text);
  const deps: WeatherDeps = {
    source: opts.source ?? new HttpWeatherSource(),
    bank: opts.bank ?? defaultWeatherBank,
    wikidataBank: opts.wikidataBank ?? defaultWikidataBank,
    register: opts.placeRegister ?? defaultPlaceRegister,
    geographySource: opts.geographySource ?? new HttpNominatimSource(),
    now: (opts.now ?? (() => new Date()))(),
    ttl: opts.ttlMinutes ?? weatherTtlMinutes(),
    retrievedFrom: opts.retrievedFrom ?? "live",
  };
  const { source, bank, wikidataBank, register, geographySource, now, ttl } = deps;
  // The opening sweep ran inside processTurn; the due
  // weather re-consultations it raised are priced and
  // executed here, before this turn's own lookup business.
  await runDueWeatherRechecks(session, result, deps);
  const record = result.trace.weather;
  if (!record || record.action !== "lookup-needed" || !record.place) {
    return result;
  }
  const statedPlace = record.place;
  // The sweep's re-bank may already hold a fresh reading
  // for this turn's place: answer from it rather than
  // fetching a second time (§5.2 — the next asking finds a
  // fresh reading where the stale-only decline would have
  // stood).
  const rebanked = bank.fresh(placeKeyOf(statedPlace), now.toISOString());
  if (rebanked) {
    result.trace.weather = {
      ...record,
      action: "looked-up-and-banked",
      fetchedAt: rebanked.fetchedAt,
      expiresAt: rebanked.expiresAt,
      detail:
        `the opening sweep's scheduled re-consultation re-banked a fresh reading for "${statedPlace}" ` +
        `(fetched ${rebanked.fetchedAt}, shelf life to ${rebanked.expiresAt}) before this turn's lookup ` +
        `ran; the answer rests on that reading (Scheduling T2, §5.2)`,
      priorDecline: result.reply,
    };
    result.trace.declineReason = undefined;
    result.trace.planNote =
      "answered from the scheduled re-consultation's re-banked reading (Scheduling T2): the stale-only " +
      "decline the synchronous turn reached was pre-empted by the refresh the earlier banking registered";
    result.trace.wordingNotDerived = true;
    return { reply: composeWeatherReply(rebanked, record.shape), trace: result.trace };
  }

  const decline = (
    action: "lookup-unavailable" | "coordinates-missing" | "source-coverage" | "place-ambiguous" | "stale-only",
    reply: string,
    detail: string,
    declineReason: string,
  ): TurnResult => {
    // §5.1's hand-off (Expectation T3): the declines whose
    // gap the world can close register an expectation over
    // the decline's problem record, and the reply gains
    // the keeping-open clause — a statement about a
    // registration that exists. DRAFT wording for the
    // clause — the owner's to settle, as all wording here.
    if (action === "lookup-unavailable" || action === "coordinates-missing" || action === "stale-only") {
      if (registerWeatherExpectation(session, statedPlace)) {
        reply = `${reply} I am keeping this question open and will check again.`;
        detail +=
          `; an expectation was registered over the decline's problem record, with a scheduled ` +
          `re-check at the next turn boundary (Expectation T3, §5.1)`;
      }
    }
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
  const reading = readingFromObservation(statedPlace, coordinates, observation, deps);
  bank.put(reading);
  // The banking registers its own refresh (Scheduling T2,
  // §3.3): before this reading stales, a scheduled item
  // will ask for its re-consultation.
  registerWeatherRecheck(session, reading, ttl);
  // The banking is also noticed by any expectation
  // waiting on this place's reading (§5.1: a satisfier
  // banked by an intervening turn satisfies without the
  // expectation's own re-check firing).
  const satisfied = noteWeatherReadingBanked(session, reading, turnTimeStanding(session)?.standing);
  if (satisfied.length) {
    result.trace.expectationSweep = [...(result.trace.expectationSweep ?? []), ...satisfied];
  }
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
