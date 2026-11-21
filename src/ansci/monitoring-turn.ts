/**
 * monitoring-turn.ts — the Monitoring Unit's wired layer
 * (Monitoring programme M1, 2026-11-21; design:
 * docs/ansci/monitoring-design-note.md §3.3, §5, §7.2).
 *
 * The wrapper the Geography and Weather wrappers set the
 * pattern for: it runs the turn (through the weather
 * wrapper where weather deps are given, so the T2/T3
 * chains run inside it unchanged), then takes up the
 * monitor checks the opening sweep raised. Scheduling
 * raised them; this layer prices and executes them —
 * registration is not authorisation (§3.3), and the
 * pricing seam stands here exactly as the weather
 * re-consultation's does: priced through, the check runs
 * and its outcome is recorded; declined, the item closes
 * fired-and-declined with the decline as its evidence,
 * the decline is a history event, and the next check is
 * registered as usual.
 *
 * A staleness firing's proposed refresh is registered as
 * a Scheduling item with the weather-reconsult consumer
 * (§7.2.2): the next turn's opening sweep raises it and
 * the weather wrapper's T2 chain executes it — so the
 * refresh lands BEFORE a later asking can meet the
 * stale-only decline, which is §7.2's acceptance shape.
 *
 * The Unit's posture holds in this layer too: the wrapper
 * records checks and firings on the trace and in the
 * monitors' histories; it never speaks for the Unit, and
 * nothing here is merged into the visitor's input (§2.3).
 * Consultation-subject checks join this layer slice by
 * slice: weather in M2 (§7.1 — the check consults through
 * the weather chain, and a firing's telling is priced as
 * its own act), what's-there in M3 (§7.3).
 */

import type { Session } from "./session";
import { processTurn, type TurnResult } from "./turn";
import {
  bankConfiguredCoordinates,
  processTurnWithWeather,
  readingFromObservation,
  situatedEvidence,
  type WeatherDeps,
  type WeatherTurnOptions,
} from "./weather-turn";
import {
  closeExpiredMonitors,
  closeMonitorForExpectation,
  closeMonitorsForEndedExpectations,
  ensureNextCheck,
  recordDeclinedCheck,
  recordWeatherCheck,
  recordWhatsThereCheck,
  registerMonitor,
  runStalenessCheck,
  MONITORING_UNIT,
  type MonitorBanks,
  type MonitorCheckOutcome,
  type MonitorFiring,
  type MonitorRecord,
  type MonitorSpec,
} from "./monitoring";
import { closeFiredItem, declineDueItem, registerSchedule, standingInstantISO } from "./scheduling";
import { turnTimeStanding, type TimeStanding } from "./timekeeping";
import { defaultWeatherBank, weatherTtlMinutes } from "./weather-bank";
import { defaultWikidataBank } from "./wikidata-bank";
import { defaultPlaceRegister, resolvePlace } from "./geography";
import { HttpWeatherSource } from "./weather-client";
import { HttpNominatimSource } from "./geography-client";
import { noteWeatherReadingBanked, offerSatisfier, type ExpectationSweepOutcome } from "./expectation";
import { interlocutorPlace, systemPlace } from "./geography-awareness";
import {
  categoryByKey,
  elementCategories,
  WHATS_THERE_DEFAULT_RADIUS_M,
  type OverpassSource,
} from "./overpass-client";
import { haversineKm } from "./entity-rank";
import type { WhatsThereEntry } from "./geography";
import type { NominatimSource } from "./geography-client";

export interface MonitoringDeps extends MonitorBanks {
  /** The Planner's pricing of a due check, where the
   *  host prices checks: priced through, the check runs;
   *  declined with a ground, the decline path runs
   *  (§3.3). Absent, checks are priced through — the
   *  default the T2 weather chain also stands under. */
  priceCheck?: (monitor: MonitorRecord) => { priced: true } | { priced: false; ground: string };
  /** The Planner's pricing of a weather firing's TELLING
   *  (M2, §7.1): the telling is a second, separate act
   *  from the check, priced on its own — told, or declined
   *  with a ground, the decline recorded on the firing and
   *  in the monitor's history exactly as a declined check
   *  is recorded. Absent, tellings are priced through. */
  priceTelling?: (firing: MonitorFiring) => { told: true } | { told: false; ground: string };
  /** The Overpass consultation for what's-there checks
   *  (M3, §7.3). Absent, a what's-there check is
   *  unpriceable on that turn, recorded as such. */
  overpass?: OverpassSource;
  /** The geocoding consultation the what's-there place
   *  resolution may draw on (the weather chain's, where
   *  the turn carries one, is used otherwise). */
  nominatim?: NominatimSource;
  /** Provenance label for consultations run by checks. */
  retrievedFrom?: string;
  /** The instant override for hosts without a wired
   *  clock standing (tests use the fixture clock through
   *  the session; this is the fallback, never the first
   *  resort). */
  now?: () => string;
}

export interface MonitoringTurnOptions {
  weather?: WeatherTurnOptions;
  monitoring?: MonitoringDeps;
}

/** Register the refresh a weather staleness firing
 *  proposes (§7.2.2): a due item with the weather-reconsult
 *  consumer, raised at the next opening sweep and executed
 *  by the weather wrapper's chain. One open refresh per
 *  place: a second firing while one stands adds nothing. */
function registerProposedRefresh(
  session: Session,
  firing: MonitorFiring,
  nowISO: string,
  standing: import("./timekeeping").TimeStanding | undefined,
): void {
  if (!firing.refreshPlace) return;
  const place = firing.refreshPlace;
  const already = session.schedule.some(
    (i) =>
      i.consumer?.kind === "weather-reconsult" &&
      i.consumer.placeName === place &&
      (i.status === "standing" || i.status === "due-raised"),
  );
  if (already) return;
  const ttlMs = weatherTtlMinutes() * 60_000;
  registerSchedule(
    session,
    {
      owed: `a fresh weather reading for ${place}, proposed by monitor '${firing.monitorId}'`,
      trigger: { kind: "at", instantISO: nowISO },
      registeredBy: MONITORING_UNIT,
      registrationExpiresISO: new Date(Date.parse(nowISO) + ttlMs).toISOString(),
      onDue:
        `re-consult the weather source for ${place} and re-bank the reading — monitor ` +
        `'${firing.monitorId}' fired on its staleness, and the refresh is its proposed remedy (§7.2)`,
      consumer: { kind: "weather-reconsult", placeName: place },
    },
    standing,
  );
}

/* ---------------- the weather check (M2, §7.1) ---------------- */

/** Assemble the weather chain from the turn's weather
 *  options, with the weather wrapper's own defaults. No
 *  weather options on the turn means no chain stands
 *  wired for the check — the check is then unpriceable
 *  this turn, recorded as such, never improvised around. */
function weatherDepsOf(opts: WeatherTurnOptions | undefined): WeatherDeps | undefined {
  if (!opts) return undefined;
  return {
    source: opts.source ?? new HttpWeatherSource(),
    bank: opts.bank ?? defaultWeatherBank,
    wikidataBank: opts.wikidataBank ?? defaultWikidataBank,
    register: opts.placeRegister ?? defaultPlaceRegister,
    geographySource: opts.geographySource ?? new HttpNominatimSource(),
    now: (opts.now ?? (() => new Date()))(),
    ttl: opts.ttlMinutes ?? weatherTtlMinutes(),
    retrievedFrom: opts.retrievedFrom ?? "live",
  };
}

/**
 * Run one weather monitor's check (§7.1): the check
 * consults the weather source THROUGH the weather chain —
 * the register resolves the place (configured → banked →
 * consulted, the geography order), the source reads the
 * point, and the reading is banked by the wrapper's own
 * construction, as today's readings are banked. The
 * comparison itself is the Unit's (monitoring.ts).
 *
 * Two wrapper behaviours are deliberately NOT repeated
 * here: the banking does not register the T2 re-check
 * (the monitor IS the standing watch for this place; a
 * second refresh chain would compete with its next
 * check), and no reply is composed (the Unit never
 * speaks; a firing raises the telling as a demand). The
 * banking IS noticed by any expectation waiting on the
 * place's reading — satisfaction is routing, shared with
 * the wrapper's bankings.
 */
export async function runWeatherMonitorCheck(
  session: Session,
  monitor: MonitorRecord,
  deps: WeatherDeps,
  standing: TimeStanding | undefined,
): Promise<{ outcome: MonitorCheckOutcome; firings: MonitorFiring[]; satisfied: ExpectationSweepOutcome[] }> {
  if (monitor.subject.kind !== "weather-reading") {
    return {
      outcome: { monitorId: monitor.id, outcome: "unpriceable", detail: "a weather check was run against a non-weather subject — a wiring error" },
      firings: [],
      satisfied: [],
    };
  }
  const placeName = monitor.subject.placeName;
  const now = deps.now;
  bankConfiguredCoordinates(deps.register, placeName, now);
  const resolution = await resolvePlace(placeName, {
    register: deps.register,
    wikidataBank: deps.wikidataBank,
    nominatim: deps.geographySource,
    situatedPlace: situatedEvidence(session, placeName, deps.register, now),
    now,
    retrievedFrom: deps.retrievedFrom,
  });
  if (resolution.kind !== "resolved" || !resolution.place.coordinates) {
    const reason =
      resolution.kind === "unavailable"
        ? resolution.reason
        : resolution.kind === "resolved"
          ? "the resolution banked no coordinates for the place"
          : resolution.detail;
    const recorded = recordWeatherCheck(session, monitor, { kind: "unavailable", reason: `the place resolution ended ${resolution.kind}: ${reason}` }, standing);
    return { ...recorded, satisfied: [] };
  }
  const coordinates = resolution.place.coordinates.value;
  const conditions = await deps.source.currentConditions(coordinates.lat, coordinates.lon);
  if (conditions.status !== "ok") {
    const recorded = recordWeatherCheck(
      session,
      monitor,
      { kind: "unavailable", reason: `the weather source answered ${conditions.status}: ${conditions.reason}` },
      standing,
    );
    return { ...recorded, satisfied: [] };
  }
  const reading = readingFromObservation(placeName, coordinates, conditions.data, deps);
  deps.bank.put(reading);
  const satisfied = noteWeatherReadingBanked(session, reading, standing);
  const recorded = recordWeatherCheck(session, monitor, { kind: "reading", reading }, standing);
  return { ...recorded, satisfied };
}

/** The draft telling a priced weather firing carries
 *  (§7.1): composed from the demand's two readings, so it
 *  is grounded in them. DRAFT wording — the owner's to
 *  settle, as all wording at this rung; the Unit does not
 *  speak it, the Planner's priced telling does. */
function composeMonitorTelling(monitor: MonitorRecord, firing: MonitorFiring): string {
  const place = monitor.subject.kind === "weather-reading" ? monitor.subject.placeName : "the place";
  return (
    `The weather in ${place} has changed: ${firing.after}` +
    (firing.before ? ` — before, it was: ${firing.before}` : "") +
    "."
  );
}

/**
 * §7.1's wired registrar: GeographyAwareness registers a
 * monitor over the place the conversation is situated at
 * — the interlocutor's stated place (the deictic centre),
 * or the configured seat where no statement stands. No
 * situated place stands, no registration: the refusal is
 * located at the subject, in GeographyAwareness's own
 * terms (the place gap is located in its reading).
 */
export function registerSituatedWeatherMonitor(
  session: Session,
  over: Partial<MonitorSpec> & Pick<MonitorSpec, "interval" | "changeRules" | "expiry">,
  standing: TimeStanding | undefined,
): { ok: true; monitor: MonitorRecord } | { ok: false; reason: string } {
  const stated = interlocutorPlace(session);
  const place = stated?.place ?? systemPlace(session);
  if (!place) {
    return {
      ok: false,
      reason:
        "refused at the subject: no situated place stands in this conversation — the interlocutor " +
          "has stated no place and no seat is configured, so there is no place whose weather the " +
          "monitor would watch (GeographyAwareness's reading locates the gap at the missing place)",
    };
  }
  return registerMonitor(
    session,
    {
      ...over,
      subject: { kind: "weather-reading", placeName: place },
      registrar: over.registrar ?? "Awareness (GeographyAwareness)",
    },
    standing,
  );
}

/* ---------------- the what's-there check (M3, §7.3) ---------------- */

export interface WhatsThereCheckDeps {
  register: import("./geography").PlaceRegister;
  wikidataBank?: import("./wikidata-bank").WikidataBank;
  nominatim?: NominatimSource;
  overpass: OverpassSource;
  retrievedFrom: string;
  now: Date;
}

/**
 * Run one what's-there monitor's check (§7.3): the
 * register resolves the place, the Overpass consultation
 * answers for the bounded category at the default radius,
 * and the set is banked into the register with its
 * retrieved provenance — the geography wrapper's own
 * banking, entry construction included (distances
 * computed locally from the returned points).
 *
 * Where the monitor serves an expectation, the banked
 * set is offered to it through §4.4's seam: the banking
 * is the gate the result passed, the offer is routing,
 * and a satisfaction closes BOTH records together — the
 * expectation satisfied (its evidence filed into the
 * problem record, which closes with it), the monitor
 * closed-by-expectation. An arrival after the expectation
 * already ended is recorded as a late arrival: it banks,
 * it satisfies nothing, and the monitor closes by its own
 * ending (§4.5's discipline, read from the monitor side).
 */
export async function runWhatsThereMonitorCheck(
  session: Session,
  monitor: MonitorRecord,
  deps: WhatsThereCheckDeps,
  standing: TimeStanding | undefined,
): Promise<{ outcome: MonitorCheckOutcome; firings: MonitorFiring[]; satisfied: ExpectationSweepOutcome[] }> {
  if (monitor.subject.kind !== "whats-there") {
    return {
      outcome: { monitorId: monitor.id, outcome: "unpriceable", detail: "a what's-there check was run against a non-whats-there subject — a wiring error" },
      firings: [],
      satisfied: [],
    };
  }
  const { placeName, categoryKey } = monitor.subject;
  const category = categoryByKey(categoryKey);
  if (!category) {
    return {
      outcome: { monitorId: monitor.id, outcome: "unpriceable", detail: `the category '${categoryKey}' stands outside the consultation's table — a registration that should have been refused` },
      firings: [],
      satisfied: [],
    };
  }
  const now = deps.now;
  bankConfiguredCoordinates(deps.register, placeName, now);
  const resolution = await resolvePlace(placeName, {
    register: deps.register,
    wikidataBank: deps.wikidataBank,
    nominatim: deps.nominatim,
    situatedPlace: situatedEvidence(session, placeName, deps.register, now),
    now,
    retrievedFrom: deps.retrievedFrom,
  });
  const coordinates = resolution.kind === "resolved" ? resolution.place.coordinates : undefined;
  if (resolution.kind !== "resolved" || !coordinates) {
    const reason =
      resolution.kind === "unavailable"
        ? resolution.reason
        : resolution.kind === "resolved"
          ? "the resolution banked no coordinates for the place"
          : resolution.detail;
    const recorded = recordWhatsThereCheck(
      session,
      monitor,
      { kind: "unavailable", reason: `the place resolution ended ${resolution.kind}: ${reason}` },
      standing,
    );
    return { ...recorded, satisfied: [] };
  }
  const place = resolution.place;
  const point = coordinates.value;
  const answer = await deps.overpass.whatsThere([category], point.lat, point.lon, WHATS_THERE_DEFAULT_RADIUS_M);
  if (answer.status === "unavailable") {
    const recorded = recordWhatsThereCheck(session, monitor, { kind: "unavailable", reason: answer.reason }, standing);
    return { ...recorded, satisfied: [] };
  }
  const fetchedAt = now.toISOString();
  const entries: WhatsThereEntry[] = answer.data
    .filter((e) => elementCategories(e, [category]).includes(category.key))
    .map((e) => ({
      ...(e.name ? { name: e.name } : {}),
      category: category.key,
      lat: e.latitude,
      lon: e.longitude,
      distanceKm: haversineKm({ lat: point.lat, lon: point.lon }, { lat: e.latitude, lon: e.longitude }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  deps.register.bankWhatsThere(place.name, category.key, entries, {
    kind: "retrieved",
    dataset: "openstreetmap-overpass",
    baseVersion: fetchedAt.slice(0, 10),
    retrievedFrom: deps.retrievedFrom,
    confidence: 0.9,
    detail:
      `what's-there consultation by monitor '${monitor.id}': ${category.key} within ` +
      `${WHATS_THERE_DEFAULT_RADIUS_M / 1000} km of ${place.name}'s resolved point ` +
      `${point.lat}, ${point.lon}; distances computed locally from the returned points`,
  }, fetchedAt);
  const recorded = recordWhatsThereCheck(session, monitor, { kind: "reading", entries, fetchedAt }, standing);

  /* The mechanism's offer (§7.3, §4.4): the banked set
   * is the expectation's satisfier arriving by the
   * consultation route. */
  const satisfied: ExpectationSweepOutcome[] = [];
  if (monitor.servesExpectationId && monitor.status === "standing") {
    const expectationId = monitor.servesExpectationId;
    const offer = offerSatisfier(
      session,
      expectationId,
      {
        route: "consultation",
        detail:
          `the what's-there consultation for ${place.name} (${category.key}), run as monitor ` +
          `'${monitor.id}'s check, returned ${entries.length} entries, banked in the geography ` +
          `register at ${fetchedAt}`,
        gates: {
          passed: true,
          ground:
            "the consultation's result banked in the geography register with its retrieved " +
            `provenance (openstreetmap-overpass, via ${deps.retrievedFrom}) — the banking is the gate the result passed`,
        },
      },
      standing,
    );
    if (offer.ok) {
      satisfied.push({
        expectationId,
        outcome: "satisfied",
        detail:
          `expectation '${expectationId}' closes satisfied by its monitor's check: the what's-there ` +
          `set for ${place.name} (${category.key}) arrived by consultation and stands banked; the ` +
          "satisfaction is filed into its problem record, which closes with it (§7.3, §4.3)",
        demand: offer.demand,
        route: "a consultation result, banked through the gates (§4.4)",
      });
      closeMonitorForExpectation(
        session,
        monitor,
        `closed by its expectation: this check's reading satisfied expectation '${expectationId}' — ` +
          "the satisfaction is filed into its problem record, and the monitor closes with it, its " +
          "term served (§7.3)",
        standing,
      );
    } else {
      monitor.history.push({
        atISO: standingInstantISO(standing),
        turnCount: session.turnCount,
        outcome: "noted",
        detail:
          `the check's reading arrived after expectation '${expectationId}' had already ended — ` +
          `a late arrival: it stands banked, it satisfies nothing (${offer.reason}), and the ` +
          "monitor closes by its own ending (§4.5)",
      });
    }
  }
  return { ...recorded, satisfied };
}

/**
 * §7.3's registration: a monitor AS an expectation's
 * mechanism. The cross-citation is structural, not
 * decorative — the monitor's registrar IS the
 * expectation's registering unit (so the registrar-only
 * rules bind the same hands), its expiry IS the
 * expectation's deadline, exactly (the watch's term is
 * the wait's term), and the monitor names the expectation
 * it serves. The rule defaults to the arrival clause,
 * which is the mechanism's whole purpose.
 */
export function registerMonitorForExpectation(
  session: Session,
  expectationId: string,
  over: Partial<MonitorSpec> & Pick<MonitorSpec, "subject" | "interval">,
  standing: TimeStanding | undefined,
): { ok: true; monitor: MonitorRecord } | { ok: false; reason: string } {
  const expectation = session.expectations.find((e) => e.id === expectationId);
  if (!expectation) {
    return { ok: false, reason: `refused at the expectation: no expectation stands under the id '${expectationId}' — a mechanism without its wait is an ordinary monitor, and registers as one` };
  }
  if (expectation.status !== "open") {
    return {
      ok: false,
      reason: `refused at the expectation: expectation '${expectationId}' already ended (${expectation.status}) — a mechanism is registered under a standing wait, not behind an ended one (§7.3)`,
    };
  }
  return registerMonitor(
    session,
    {
      ...over,
      changeRules: over.changeRules ?? [{ kind: "reading-arrives" }],
      registrar: expectation.registeredBy,
      expiry: { kind: "at", instantISO: expectation.deadlineISO },
      servesExpectationId: expectationId,
    },
    standing,
  );
}

/**
 * Run a turn with the Monitoring Unit wired: the turn
 * itself (through the weather wrapper where its deps are
 * given), the closing pass over expired monitors, and the
 * execution of every monitor check the opening sweep
 * raised. Check outcomes ride the trace as
 * `monitorChecks`, firings as `monitorFirings` — present
 * only when the sweep raised a check.
 */
export async function processTurnWithMonitoring(
  session: Session,
  text: string,
  opts: MonitoringTurnOptions = {},
): Promise<TurnResult> {
  const result = opts.weather
    ? await processTurnWithWeather(session, text, opts.weather)
    : processTurn(session, text);
  const deps: MonitoringDeps = opts.monitoring ?? {};
  const standing = turnTimeStanding(session)?.standing;
  const nowISO = standingInstantISO(standing) ?? deps.now?.() ?? new Date().toISOString();

  /* The closing passes (§2.4, §7.3): a monitor whose
   * expectation has ended closes WITH it first — the
   * joint closing names the cause — and expired-unclosed
   * monitors close at the same sweep, in the catalogue's
   * words. */
  closeMonitorsForEndedExpectations(session, standing);
  closeExpiredMonitors(session, standing);

  const sweep = result.trace.scheduleSweep ?? [];
  const dueChecks = sweep.filter((o) => o.outcome === "due");
  if (!dueChecks.length) return result;

  const checks: MonitorCheckOutcome[] = [];
  const firings: MonitorFiring[] = [];
  for (const outcome of dueChecks) {
    const item = session.schedule.find((i) => i.id === outcome.itemId);
    const consumer = item?.consumer;
    if (!item || !consumer || consumer.kind !== "monitor-check") continue;
    const monitor = session.monitors.find((m) => m.id === consumer.monitorId);
    if (!monitor) continue;
    if (monitor.status !== "standing") {
      closeFiredItem(
        session,
        item.id,
        `the monitor it served has ended (${monitor.status}) — the check does not run`,
        standing,
      );
      continue;
    }

    /* Pricing (§3.3): the Planner prices the check
     * before it runs. A decline closes the item
     * fired-and-declined, is recorded, and the next
     * check is registered as usual. */
    const pricing = deps.priceCheck?.(monitor);
    if (pricing && !pricing.priced) {
      declineDueItem(session, item.id, pricing.ground, standing);
      const heartbeat = recordDeclinedCheck(session, monitor, pricing.ground, standing);
      if (heartbeat) firings.push(heartbeat);
      checks.push({
        monitorId: monitor.id,
        outcome: "declined",
        detail: `the check was declined at pricing: ${pricing.ground}`,
      });
      ensureNextCheck(session, monitor, standing);
      continue;
    }

    if (monitor.subject.kind === "bank-staleness-fact" || monitor.subject.kind === "bank-staleness-class") {
      const ran = runStalenessCheck(session, monitor, deps, standing);
      checks.push(ran.outcome);
      firings.push(...ran.firings);
      closeFiredItem(
        session,
        item.id,
        `fired and done: the monitor's check ran — ${ran.outcome.outcome} (${ran.outcome.detail})`,
        standing,
      );
      for (const firing of ran.firings) registerProposedRefresh(session, firing, nowISO, standing);
      ensureNextCheck(session, monitor, standing);
      continue;
    }

    if (monitor.subject.kind === "weather-reading") {
      const chain = weatherDepsOf(opts.weather);
      if (!chain) {
        /* No weather chain wired on this turn: the check
         * cannot run, and the record says so rather than
         * the check silently passing (§3.4's honesty,
         * applied to the wiring). */
        monitor.history.push({
          atISO: nowISO,
          turnCount: session.turnCount,
          outcome: "unpriceable",
          detail: "the check fell due on a turn with no weather chain wired — it could not run, and no comparison was made",
        });
        closeFiredItem(session, item.id, "fired and done: the check could not run — no weather chain stood wired on this turn", standing);
        checks.push({
          monitorId: monitor.id,
          outcome: "unpriceable",
          detail: "no weather chain stood wired on this turn — the check could not run",
        });
        ensureNextCheck(session, monitor, standing);
        continue;
      }
      const ran = await runWeatherMonitorCheck(session, monitor, chain, standing);
      checks.push(ran.outcome);
      if (ran.satisfied.length) {
        result.trace.expectationSweep = [...(result.trace.expectationSweep ?? []), ...ran.satisfied];
      }
      /* The telling is priced as its own act (§7.1): the
       * firing's demand proposed it; the Planner's answer
       * — told, with the draft wording the two readings
       * ground, or declined with its ground — is recorded
       * on the firing and in the monitor's history. */
      for (const firing of ran.firings) {
        const tellingPrice = deps.priceTelling?.(firing);
        if (tellingPrice && !tellingPrice.told) {
          firing.telling = { priced: "declined", ground: tellingPrice.ground };
          monitor.history.push({
            atISO: nowISO,
            turnCount: session.turnCount,
            outcome: "telling",
            detail: `the firing's telling was declined at pricing: ${tellingPrice.ground} — recorded as declined, exactly as a declined check is (§7.1)`,
          });
        } else if (firing.kind === "change") {
          const wording = composeMonitorTelling(monitor, firing);
          firing.telling = { priced: "told", wording };
          monitor.history.push({
            atISO: nowISO,
            turnCount: session.turnCount,
            outcome: "telling",
            detail: `the firing's telling was priced and told (draft wording, the owner's to settle): "${wording}"`,
          });
        }
        firings.push(firing);
      }
      closeFiredItem(
        session,
        item.id,
        `fired and done: the monitor's check ran — ${ran.outcome.outcome} (${ran.outcome.detail})`,
        standing,
      );
      ensureNextCheck(session, monitor, standing);
      continue;
    }

    if (monitor.subject.kind === "whats-there") {
      if (!deps.overpass) {
        monitor.history.push({
          atISO: nowISO,
          turnCount: session.turnCount,
          outcome: "unpriceable",
          detail: "the check fell due on a turn with no Overpass source wired — it could not run, and no comparison was made",
        });
        closeFiredItem(session, item.id, "fired and done: the check could not run — no Overpass source stood wired on this turn", standing);
        checks.push({
          monitorId: monitor.id,
          outcome: "unpriceable",
          detail: "no Overpass source stood wired on this turn — the check could not run",
        });
        ensureNextCheck(session, monitor, standing);
        continue;
      }
      const ran = await runWhatsThereMonitorCheck(
        session,
        monitor,
        {
          register: deps.register ?? opts.weather?.placeRegister ?? defaultPlaceRegister,
          wikidataBank: deps.wikidata ?? opts.weather?.wikidataBank,
          nominatim: deps.nominatim ?? opts.weather?.geographySource,
          overpass: deps.overpass,
          retrievedFrom: deps.retrievedFrom ?? opts.weather?.retrievedFrom ?? "live",
          now: opts.weather?.now ? opts.weather.now() : new Date(nowISO),
        },
        standing,
      );
      checks.push(ran.outcome);
      firings.push(...ran.firings);
      if (ran.satisfied.length) {
        result.trace.expectationSweep = [...(result.trace.expectationSweep ?? []), ...ran.satisfied];
      }
      closeFiredItem(
        session,
        item.id,
        `fired and done: the monitor's check ran — ${ran.outcome.outcome} (${ran.outcome.detail})`,
        standing,
      );
      /* A monitor closed by its expectation gets no next
       * check: the watch's term is served (§7.3). */
      if (monitor.status === "standing") ensureNextCheck(session, monitor, standing);
      continue;
    }

    /* No subject kind remains unwired after M3; this
     * fallback closes a due item for an unknown kind
     * honestly rather than leaving it raised. */
    closeFiredItem(
      session,
      item.id,
      "the monitor's subject has no wired check — the check does not run",
      standing,
    );
    checks.push({
      monitorId: monitor.id,
      outcome: "unpriceable",
      detail: "the monitor's subject has no wired check",
    });
    ensureNextCheck(session, monitor, standing);
  }

  if (checks.length) result.trace.monitorChecks = checks;
  if (firings.length) result.trace.monitorFirings = firings;
  return result;
}
