/**
 * timekeeping.ts — Timekeeping (Time programme T1, 2026-11-20;
 * design: docs/ansci/time-scheduling-design-note.md §2): the
 * Functions family's time resource — clock readings as
 * consultations, and staleness asked uniformly of every bank.
 *
 * THE CLOCK-CONSULTATION OPERATION (§2.1). A clock is a
 * SOURCE, read on demand, the way a weather source is read.
 * One source is wired here: the host's clock — the clock of
 * the machine the entity is running on, named as a source.
 * Other clocks (a network time service, the interlocutor's
 * stated clock as a frame fact) are other sources under the
 * same operation, not other machinery. Reading a host clock
 * is a local read, not a network call.
 *
 * A CLOCK READING IS A RETRIEVED FACT (§2.2). It carries the
 * time read (to the precision the source gives — a host
 * clock gives seconds; the reading does not round itself
 * into the frame's hour-only shape), the timezone the
 * reading stands in, named as part of the reading (a host
 * clock's zone is the host's, and is said so), the source's
 * name, and its provenance — retrieved-kind, with a source
 * record naming the clock source, under the §§3.5–3.6
 * discipline the Wikidata bank established. A clock reading
 * is the limiting case of a banked reading: its content and
 * its fetch stamp coincide — the time it reports IS the time
 * it was fetched. Its shelf life is therefore stated
 * differently from a weather reading's: A CLOCK READING
 * WARRANTS THE TURN IT WAS TAKEN IN. A later turn that needs
 * the time re-consults; it does not inherit a reading and
 * call it now. (A reading banked for the record — what the
 * clock said when an event was stamped — keeps its fetch
 * stamp as history, which is a different use from answering
 * "now"; the bank below is that record.)
 *
 * TWO TIMES, TWO STANDINGS (§2.2). The frame is the
 * conversation's STATED time; a clock reading is a consulted
 * fact about the host's world. Where both stand and they
 * disagree, the disagreement is a statable fact, not a
 * discrepancy one side silently absorbs — compareStandings
 * below states it. Which governs a given answer is the
 * answering shape's stated choice; Timekeeping's job is that
 * both readings exist with their standings intact.
 *
 * WHAT TIMEKEEPING DOES NOT DO (§2.3). No arithmetic (that
 * is Quantification's Mathematics), no ordering (that is
 * Ordering And Sorting applied to readings), no testimony
 * (a reading enters as a retrieved fact; what the time
 * MEANS — season, daypart, situated significance — stays
 * with the frame's tables and Awareness).
 *
 * STALENESS, ASKED UNIFORMLY (§2.4). Every bank that states
 * shelf lives states them in its own terms (the weather
 * bank's TTL configuration, the geography register's
 * per-kind table). The staleness operation is the uniform
 * question over all of them: of a banked fact — fresh or
 * stale under the shelf life its own bank states, and if
 * stale by how much, if fresh how long it has left; of a
 * bank — what goes stale by a stated horizon. Where no
 * shelf life is stated the honest answer is "no shelf life
 * stated" — NOT "fresh": the Wikidata bank states none (a
 * capital does not expire), and Timekeeping does not invent
 * one for it. Timekeeping REPORTS staleness; what to do
 * about a stale fact — re-consult, decline, schedule — is
 * the asker's business.
 */
import type { Session } from "./session";
import { defaultWeatherBank, placeKeyOf, type WeatherBank } from "./weather-bank";
import { defaultPlaceRegister, type PlaceRegister } from "./geography";
import { defaultWikidataBank, type WikidataBank } from "./wikidata-bank";

/* ------------------------------------------------------------------ */
/* Clock sources                                                        */
/* ------------------------------------------------------------------ */

export type ClockReadResult =
  | { status: "ok"; instant: Date; timezone: string }
  | { status: "unavailable"; reason: string };

/**
 * A clock source: a named source the consultation operation
 * reads. The read is synchronous — the one wired source is
 * the host's own clock, a local read; a future network
 * source would stand behind an async wrapper the way the
 * weather source does, not inside this operation.
 */
export interface ClockSource {
  /** The source's name, as readings cite it ("host clock"). */
  name: string;
  read(): ClockReadResult;
}

/** The one wired source (§2.1): the host's clock. */
export class HostClockSource implements ClockSource {
  readonly name = "host clock";
  read(): ClockReadResult {
    const instant = new Date();
    let timezone = "UTC";
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      timezone = "UTC";
    }
    return { status: "ok", instant, timezone };
  }
}

/**
 * A fixture clock source — tests set the instant (or the
 * unavailability) and the consultation reads it. The
 * fixture discipline of the weather/Wikidata sources,
 * applied to a clock: tests never read the machine's real
 * clock for an assertion, exactly as they never touch the
 * network.
 */
export class FixtureClockSource implements ClockSource {
  readonly name: string;
  private instant: Date | undefined;
  private reason: string | undefined;
  readonly timezone: string;

  constructor(name = "fixture clock", timezone = "UTC") {
    this.name = name;
    this.timezone = timezone;
  }

  set(instantISO: string): void {
    this.instant = new Date(instantISO);
    this.reason = undefined;
  }

  setUnavailable(reason: string): void {
    this.reason = reason;
    this.instant = undefined;
  }

  read(): ClockReadResult {
    if (this.reason !== undefined) return { status: "unavailable", reason: this.reason };
    if (!this.instant) return { status: "unavailable", reason: "the fixture clock has no instant set" };
    return { status: "ok", instant: new Date(this.instant.getTime()), timezone: this.timezone };
  }
}

/* ------------------------------------------------------------------ */
/* Clock readings — retrieved facts (§2.2)                              */
/* ------------------------------------------------------------------ */

/** The source record of a clock reading, in the §§3.5–3.6
 *  shape the Wikidata bank established: the dataset, the
 *  fetch date as baseVersion, the source named as uri. */
export interface ClockSourceRecord {
  dataset: "clock";
  /** The fetch date (ISO yyyy-mm-dd) the reading was taken at. */
  baseVersion: string;
  /** The clock source's name ("host clock"). */
  uri: string;
  /** The route the reading came through ("live" / "fixture"). */
  retrievedFrom: string;
}

export interface ClockReading {
  /** The time read, ISO — which is also the fetch stamp:
   *  content and fetch coincide (§2.2). */
  instantISO: string;
  /** The timezone the reading stands in, named as part of
   *  the reading — a host clock's zone is the host's. */
  timezone: string;
  /** The source's name, as the reading cites it. */
  source: string;
  /** Retrieved-kind provenance (§§3.5–3.6 discipline). */
  provenance: { kind: "retrieved"; source: ClockSourceRecord };
  /** The session turn the reading was taken in, when taken
   *  for a session — the turn it warrants (§2.2). */
  takenAtTurn?: number;
}

/**
 * The bank of readings taken (§2.1: Timekeeping holds no
 * register of its own beyond the readings it has taken and
 * banked). Process-level, like the other banks; a reading
 * kept here is history — what the clock said when an event
 * was stamped — never a standing answer to "now".
 */
export class ClockBank {
  private readonly readings: ClockReading[] = [];

  put(reading: ClockReading): void {
    this.readings.push(reading);
  }

  all(): ClockReading[] {
    return [...this.readings];
  }

  latest(source?: string): ClockReading | undefined {
    for (let i = this.readings.length - 1; i >= 0; i--) {
      if (!source || this.readings[i].source === source) return this.readings[i];
    }
    return undefined;
  }
}

export const defaultClockBank = new ClockBank();

export type ClockConsultResult =
  | { status: "ok"; reading: ClockReading }
  | { status: "unavailable"; source: string; reason: string };

/**
 * The clock-consultation operation: read a named clock
 * source and bank the reading as a retrieved fact. An
 * unavailable source is a stated state ({ status:
 * "unavailable" } with its reason), never an invented time.
 */
export function consultClock(
  source: ClockSource,
  opts: { retrievedFrom?: string; bank?: ClockBank; turn?: number } = {},
): ClockConsultResult {
  const got = source.read();
  if (got.status === "unavailable") {
    return { status: "unavailable", source: source.name, reason: got.reason };
  }
  const instantISO = got.instant.toISOString();
  const reading: ClockReading = {
    instantISO,
    timezone: got.timezone,
    source: source.name,
    provenance: {
      kind: "retrieved",
      source: {
        dataset: "clock",
        baseVersion: instantISO.slice(0, 10),
        uri: source.name,
        retrievedFrom: opts.retrievedFrom ?? "live",
      },
    },
    ...(opts.turn !== undefined ? { takenAtTurn: opts.turn } : {}),
  };
  (opts.bank ?? defaultClockBank).put(reading);
  return { status: "ok", reading };
}

/**
 * Does this reading warrant an answer at the stated turn?
 * A clock reading warrants the turn it was taken in (§2.2);
 * a reading carried into a later turn is history, not "now".
 */
export function readingWarrantsTurn(reading: ClockReading, turn: number): boolean {
  return reading.takenAtTurn === turn;
}

/* ------------------------------------------------------------------ */
/* Standings — the frame's time and the clock's, unreconciled (§2.2)    */
/* ------------------------------------------------------------------ */

export interface TimeStanding {
  kind: "frame" | "clock";
  /** The standing's instant, ISO — present for a clock
   *  standing always; for a frame standing, present only
   *  when the frame's supplied date carried a year (the
   *  frame holds month/day/hour; a year stands only where
   *  an ISO date supplied one — session.ts retains it). */
  instantISO?: string;
  detail: string;
}

/**
 * The frame's standing, from the session's frame record.
 * The frame is the conversation's stated time (§2.2): its
 * instant is statable only to what the frame holds — hour
 * always; month and day where supplied; a year only where
 * the opening ISO date carried one. A frame without a year
 * still STANDS as the situated time (Slice 5's shapes read
 * it); it simply does not fix an absolute instant, and this
 * standing says so rather than borrowing a year silently.
 */
export function frameStanding(session: Session): TimeStanding | undefined {
  const frame = session.frame;
  if (!frame) return undefined;
  const { month, day, hour, year } = frame.supplied;
  if (month !== undefined && day !== undefined && year !== undefined) {
    const instantISO = new Date(Date.UTC(year, month - 1, day, hour)).toISOString();
    return {
      kind: "frame",
      instantISO,
      detail:
        `the conversation's stated time (the frame, §8.1): ${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ` +
        `at hour ${hour} — supplied, not read`,
    };
  }
  return {
    kind: "frame",
    detail:
      "the conversation's stated time (the frame, §8.1) stands, but the frame holds " +
      `${month === undefined ? "no month" : `month ${month}`}, ${day === undefined ? "no day" : `day ${day}`}, hour ${hour} and no year — ` +
      "it fixes no absolute instant, and none is borrowed for it",
  };
}

/**
 * The turn's best time standing (§3.5's phrase): a clock
 * reading taken for the turn where a clock source is wired
 * on the session; otherwise the frame's standing. The two
 * are not reconciled — where a clock is wired, the reading
 * is the sweep's standing and the frame remains the
 * situated standing for situated answers; compareStandings
 * states any disagreement between them.
 */
export function turnTimeStanding(
  session: Session,
  opts: { bank?: ClockBank } = {},
): { standing: TimeStanding; reading?: ClockReading } | undefined {
  if (session.clockSource) {
    const got = consultClock(session.clockSource, {
      retrievedFrom: session.clockRetrievedFrom ?? "live",
      bank: opts.bank,
      turn: session.turnCount + 1,
    });
    if (got.status === "ok") {
      return {
        standing: {
          kind: "clock",
          instantISO: got.reading.instantISO,
          detail:
            `a clock reading taken for the turn: ${got.reading.instantISO} in ${got.reading.timezone}, ` +
            `from the ${got.reading.source} (retrieved, ${got.reading.provenance.source.retrievedFrom})`,
        },
        reading: got.reading,
      };
    }
    // The wired clock is down: fall back to the frame's
    // standing, with the failure stated in the standing —
    // never a silent substitution.
    const frame = frameStanding(session);
    if (frame) {
      return {
        standing: {
          ...frame,
          detail: `${frame.detail}; the wired clock source (${session.clockSource.name}) was consulted for the turn and was unavailable: ${got.reason}`,
        },
      };
    }
    return undefined;
  }
  const frame = frameStanding(session);
  return frame ? { standing: frame } : undefined;
}

/**
 * State the disagreement between the frame's stated time
 * and a clock reading, where both stand (§2.2): a statable
 * fact, returned in words; undefined where they agree to
 * the frame's precision (the frame holds an hour; a reading
 * inside that hour, on that date, agrees with it) or where
 * either side cannot be compared.
 */
export function compareStandings(session: Session, reading: ClockReading): string | undefined {
  const frame = session.frame;
  if (!frame) return undefined;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: reading.timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(reading.instantISO));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const { month, day, hour } = frame.supplied;
  const disagrees =
    get("hour") !== hour ||
    (month !== undefined && get("month") !== month) ||
    (day !== undefined && get("day") !== day);
  if (!disagrees) return undefined;
  const h12 = ((hour + 11) % 12) + 1;
  const ampm = hour < 12 ? "AM" : "PM";
  return (
    `the conversation was opened as ${month !== undefined && day !== undefined ? `${month}/${day} at ` : ""}about ${h12} ${ampm}; ` +
    `the ${reading.source} reads ${reading.instantISO} (${reading.timezone}) — the two standings disagree, and neither absorbs the other`
  );
}

/* ------------------------------------------------------------------ */
/* Staleness, asked uniformly (§2.4)                                    */
/* ------------------------------------------------------------------ */

export type StalenessVerdict =
  | { state: "fresh"; remainingMs: number; expiresAt: string }
  | { state: "stale"; overdueMs: number; expiresAt: string }
  | { state: "absent" }
  | { state: "no-shelf-life-stated" };

export interface StalenessAnswer {
  /** The bank asked, in the operation's vocabulary. */
  bank: string;
  /** The fact asked after, in the bank's own key terms. */
  key: string;
  verdict: StalenessVerdict;
  /** The shelf life the bank states for the kind, in the
   *  bank's own words — or the statement that none stands. */
  shelfLife: string;
}

function verdictFor(expiresAt: string, nowISO: string): StalenessVerdict {
  const exp = new Date(expiresAt).getTime();
  const now = new Date(nowISO).getTime();
  return now < exp
    ? { state: "fresh", remainingMs: exp - now, expiresAt }
    : { state: "stale", overdueMs: now - exp, expiresAt };
}

/** Staleness of a weather bank reading, under the weather
 *  bank's stated TTL (weather-bank.ts: the reading carries
 *  its fetch time and its shelf life's end). */
export function stalenessOfWeather(
  place: string,
  nowISO: string,
  bank: WeatherBank = defaultWeatherBank,
): StalenessAnswer {
  const key = placeKeyOf(place);
  const reading = bank.peek(key);
  if (!reading) return { bank: "weather", key, verdict: { state: "absent" }, shelfLife: "the weather bank's stated TTL, carried on the reading" };
  return {
    bank: "weather",
    key,
    verdict: verdictFor(reading.expiresAt, nowISO),
    shelfLife: `the weather bank's stated TTL — this reading was fetched at ${reading.fetchedAt} and stands until ${reading.expiresAt}`,
  };
}

/** Staleness of a geography register fact (coordinates),
 *  under the register's per-kind shelf-life table
 *  (geography.ts PLACE_SHELF_LIFE_DAYS). */
export function stalenessOfGeographyCoordinates(
  name: string,
  nowISO: string,
  register: PlaceRegister = defaultPlaceRegister,
): StalenessAnswer {
  const now = new Date(nowISO);
  const fresh = register.freshCoordinates(name, now);
  if (fresh) {
    return {
      bank: "geography-register",
      key: `coordinates of ${name}`,
      verdict: verdictFor(fresh.expiresAt, nowISO),
      shelfLife: "the register's per-kind table: coordinates stand 12 months",
    };
  }
  const stale = register.staleCoordinates(name, now);
  if (stale) {
    return {
      bank: "geography-register",
      key: `coordinates of ${name}`,
      verdict: verdictFor(stale.expiresAt, nowISO),
      shelfLife: "the register's per-kind table: coordinates stand 12 months",
    };
  }
  return { bank: "geography-register", key: `coordinates of ${name}`, verdict: { state: "absent" }, shelfLife: "the register's per-kind table: coordinates stand 12 months" };
}

/** Staleness of a geography register what's-there set,
 *  under the register's 30-day shelf life for the kind. */
export function stalenessOfGeographyWhatsThere(
  name: string,
  categoryKey: string,
  nowISO: string,
  register: PlaceRegister = defaultPlaceRegister,
): StalenessAnswer {
  const now = new Date(nowISO);
  const key = `what's-there (${categoryKey}) for ${name}`;
  const fresh = register.whatsThereFor(name, categoryKey, now);
  if (fresh) {
    return { bank: "geography-register", key, verdict: verdictFor(fresh.expiresAt, nowISO), shelfLife: "the register's per-kind table: what's-there stands 30 days" };
  }
  const stale = register.staleWhatsThereFor(name, categoryKey, now);
  if (stale) {
    return { bank: "geography-register", key, verdict: verdictFor(stale.expiresAt, nowISO), shelfLife: "the register's per-kind table: what's-there stands 30 days" };
  }
  return { bank: "geography-register", key, verdict: { state: "absent" }, shelfLife: "the register's per-kind table: what's-there stands 30 days" };
}

/** Staleness of a banked route, under the register's
 *  7-day shelf life for the kind. */
export function stalenessOfGeographyRoute(
  fromName: string,
  toName: string,
  nowISO: string,
  register: PlaceRegister = defaultPlaceRegister,
): StalenessAnswer {
  const key = `route ${fromName} → ${toName}`;
  const record = register.peekRoute(fromName, toName);
  if (!record) return { bank: "geography-register", key, verdict: { state: "absent" }, shelfLife: "the register's per-kind table: a banked route stands 7 days" };
  return { bank: "geography-register", key, verdict: verdictFor(record.expiresAt, nowISO), shelfLife: "the register's per-kind table: a banked route stands 7 days" };
}

/**
 * Staleness of a Wikidata bank holding: the honest answer
 * of §2.4. The bank states NO shelf life — a capital does
 * not expire — and Timekeeping does not invent one: a
 * standing node answers "no shelf life stated", never
 * "fresh". No node standing answers "absent".
 */
export function stalenessOfWikidata(
  name: string,
  bank: WikidataBank = defaultWikidataBank,
): StalenessAnswer {
  const node = bank.nodeByName(name);
  if (!node) return { bank: "wikidata", key: name, verdict: { state: "absent" }, shelfLife: "none stated" };
  return {
    bank: "wikidata",
    key: name,
    verdict: { state: "no-shelf-life-stated" },
    shelfLife: "none stated — the Wikidata bank states no shelf life (a capital does not expire), and none is invented for it",
  };
}

/** A banked fact the staleness operation can be asked after,
 *  in one form (§2.4) — the dispatch the askers use. */
export type StalenessRef =
  | { bank: "weather"; place: string }
  | { bank: "geography-coordinates"; name: string }
  | { bank: "geography-whats-there"; name: string; categoryKey: string }
  | { bank: "geography-route"; from: string; to: string }
  | { bank: "wikidata"; name: string };

export function askStaleness(
  ref: StalenessRef,
  nowISO: string,
  banks: { weather?: WeatherBank; register?: PlaceRegister; wikidata?: WikidataBank } = {},
): StalenessAnswer {
  switch (ref.bank) {
    case "weather":
      return stalenessOfWeather(ref.place, nowISO, banks.weather);
    case "geography-coordinates":
      return stalenessOfGeographyCoordinates(ref.name, nowISO, banks.register);
    case "geography-whats-there":
      return stalenessOfGeographyWhatsThere(ref.name, ref.categoryKey, nowISO, banks.register);
    case "geography-route":
      return stalenessOfGeographyRoute(ref.from, ref.to, nowISO, banks.register);
    case "wikidata":
      return stalenessOfWikidata(ref.name, banks.wikidata);
  }
}

/**
 * What goes stale by a stated horizon (§2.4's second form —
 * the question Scheduling's re-consultation is built from):
 * over the weather bank, every reading whose shelf life
 * ends at or before the horizon and after now (a reading
 * already stale is not "going" stale; it is reported by
 * the per-fact question). Each entry names its bank, its
 * key and the moment it stales.
 */
export function staleByHorizon(
  nowISO: string,
  horizonISO: string,
  bank: WeatherBank = defaultWeatherBank,
): { bank: string; key: string; expiresAt: string }[] {
  const out: { bank: string; key: string; expiresAt: string }[] = [];
  for (const reading of bank.entries()) {
    if (nowISO < reading.expiresAt && reading.expiresAt <= horizonISO) {
      out.push({ bank: "weather", key: reading.placeKey, expiresAt: reading.expiresAt });
    }
  }
  return out.sort((a, b) => (a.expiresAt < b.expiresAt ? -1 : 1));
}
