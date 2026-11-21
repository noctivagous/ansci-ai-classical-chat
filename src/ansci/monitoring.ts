/**
 * monitoring.ts — the Monitoring Unit (Monitoring programme
 * M1, 2026-11-21; design: docs/ansci/monitoring-design-note.md,
 * which governs — §2 the record, §3 the composition, §4 the
 * Expectation contrast, §5 the silence discipline, §6 the
 * limits, §8 the declines catalogue).
 *
 * A monitor is a standing watch: a subject and a source,
 * checked at an interval, under a change rule, for a
 * registrar, until an expiry. The Unit owns the monitor
 * records, the registration discipline, the check history,
 * and the comparison a check makes. It does not own the
 * clock (Timekeeping reads it), the interval's pattern
 * (Repetition's register holds patterns; the monitor
 * carries the interval as a pattern of intent and cites a
 * pattern where one stands — §3.2, reconciled in the M1
 * report), the due-ness machinery (Scheduling's: a
 * monitor's checks ride due items, §3.3), or the acting
 * (the Planner prices every demand the Unit raises;
 * registration is not authorisation, inherited from
 * Scheduling whole).
 *
 * THE EXPECTATION CONTRAST IS THE CHARTER'S SPINE (§4). An
 * expectation waits for ONE arrival and closes; a monitor
 * PERSISTS, checks again and again, and raises only on
 * CHANGE meeting its rule. The two are different
 * instruments and the records never blur: a monitor may
 * serve as an expectation's mechanism (M3), and the
 * service is a cross-citation, not a merger.
 *
 * THE SILENCE DISCIPLINE (§5). A check that finds no
 * change is recorded — in the monitor's history, complete —
 * and raises nothing. The history is the product as much
 * as the firings are: it is the audit trail, the evidence
 * for rule review, and the pricing evidence. The ONE
 * permitted heartbeat (§5, §8): where a monitor's checks
 * are declined at pricing again and again past a stated
 * run, the Unit raises ONE demand about the monitor
 * itself — its watch is not being kept at its priced
 * cost. Silence about the subject stays absolute; the
 * heartbeat is about the watch, never the watched, and it
 * fires once.
 *
 * THE WAKING LIMIT (§6.1), STATED IN THE UNIT'S OWN
 * VOICE. A monitor's checks run when the conversation
 * runs: at a turn's opening sweep, under the standing the
 * turn supplies. Between turns nothing is watched, no
 * interval is met exactly, and a monitor whose registrar
 * imagines otherwise is refused at its standing — only
 * "turn-boundary" stands at this rung; a "driver-delivered"
 * standing is refused, located, because no host driver
 * stands (the time programme built the driver contract's
 * entity side only). A monitor's history records the
 * checks that actually ran, at the standings they actually
 * ran at — never the checks the interval intended.
 *
 * WHAT A CHECK IS (§3.4). A consultation of the subject's
 * source under testimony discipline, or — over the
 * system's own banks — a staleness question asked of
 * Timekeeping's uniform operation (§3.1). A source's
 * unavailability is a stated state, not a reading: the
 * last reading stands unchanged, the next check is
 * registered as usual, and nothing is raised — unless the
 * change rule itself names unavailability, which is a
 * rule-design point, not an exception (§8). Comparison
 * outcomes are three: change, no-change, not-comparable —
 * and where a reading exists, the new reading becomes the
 * last reading in all three cases.
 */

import type { Session } from "./session";
import {
  cancelSchedule,
  registerSchedule,
  standingInstantISO,
  type ScheduledItem,
} from "./scheduling";
import {
  askStaleness,
  type StalenessAnswer,
  type StalenessRef,
  type TimeStanding,
} from "./timekeeping";
import type { WeatherBank, WeatherReading } from "./weather-bank";
import { categoryByKey } from "./overpass-client";
import type { WhatsThereEntry } from "./geography";
import type { PlaceRegister } from "./geography";
import type { WikidataBank } from "./wikidata-bank";

/* ---------------- the record (§2.2) ---------------- */

/** What is watched, and the source it is watched through.
 *  No consultable source standing behind a subject, no
 *  registration (§2.2): the bank forms consult the system's
 *  own holdings through Timekeeping's staleness operation;
 *  the consultation forms consult an external source
 *  through its wired wrapper (weather from M2, what's-there
 *  from M3 — registration refuses them until their source
 *  stands wired, at the subject, in those words). */
export type MonitorSubject =
  | {
      kind: "bank-staleness-fact";
      /** The fact, in Timekeeping's reference terms. The
       *  registration states the form (§7.2.3): this is the
       *  FACT form — one named fact of one bank. */
      ref: StalenessRef;
    }
  | {
      kind: "bank-staleness-class";
      /** The CLASS form (§7.2.3): the weather bank's
       *  holdings as they stand, each under the rule. The
       *  registration states the form; a monitor earns its
       *  record over a class under a rule, where a single
       *  known fact's refresh is Scheduling's alone (T2
       *  built that, and this Unit does not re-wrap it). */
      bank: "weather";
    }
  | {
      kind: "weather-reading";
      /** The situated place whose weather is watched (M2):
       *  checks consult the weather source through the
       *  weather chain and bank their readings as the
       *  wrapper banks today's. */
      placeName: string;
    }
  | {
      kind: "whats-there";
      /** A what's-there set watched through Overpass (M3):
       *  the place and the bounded category. */
      placeName: string;
      categoryKey: string;
    };

/** A checkable clause of the change rule. A monitor's rule
 *  is a non-empty LIST of clauses and fires when any clause
 *  fires, the firing naming the clause (§2.2: the rule
 *  determines what the check compares and what counts as
 *  change). NO RULE, NO MONITOR: an empty list is refused
 *  at registration, at the rule. */
export type ChangeRule =
  | { kind: "passes-shelf-life" }
  | { kind: "stale-within-margin"; marginMs: number }
  | { kind: "condition-word-differs" }
  | { kind: "precipitation-begins-or-ceases" }
  | { kind: "reading-arrives" }
  | { kind: "unavailable-successive"; count: number };

/** The interval (§2.2, §3.2): a period and a phase. The
 *  period is a duration (Quantification's arithmetic); the
 *  phase anchor names what the period is anchored to —
 *  registration, or a stated instant — with the standing it
 *  rode on named in words. The interval is a PATTERN OF
 *  INTENT, not a metronome: checks fall due on the anchor
 *  grid and run at turn boundaries. Where a pattern stands
 *  in Repetition's register (Form F3), the interval may
 *  CITE it — the citation is carried as data, in the
 *  pattern register's own terms; the monitor does not copy
 *  the pattern, and no pattern record is minted by a
 *  registration (the register is append-only knowledge,
 *  not a scratchpad). Repetition's detection floor (two
 *  full periods before asserting) governs ASSERTING a
 *  repetition in given material; it does not govern
 *  stating an intended interval, and no detection is run
 *  here. */
export interface MonitorInterval {
  periodMs: number;
  anchor:
    | { kind: "registration" }
    | { kind: "stated-instant"; instantISO: string; statement: string };
  /** A citation of a pattern in Repetition's register,
   *  where the interval is stated in pattern terms (a
   *  daypart-anchored watch, a cycle's period). Carried as
   *  the citation and the statement it was cited under;
   *  resolvable against the pattern register when the two
   *  programmes' trees stand together. */
  patternCitation?: { pattern: string; citedAs: string };
  /** Set at registration where the stated period fell
   *  below the waking floor and the registrar accepted
   *  the restatement (§8): the record says what the
   *  interval will actually be — a check at every turn —
   *  rather than pretending the stated period. */
  restatedAsEveryTurn?: string;
}

/** One reading, as the check recorded it: when it was
 *  fetched (the source's fetch stamp, §2.2) and what it
 *  says, in summary and in the comparison's own state
 *  term. Absent before the first check — and the record
 *  says so, by the field's absence being readable as
 *  "no reading yet" wherever the record is read. */
export interface MonitorReading {
  atISO: string;
  /** The comparison's state term ("fresh", "stale", the
   *  condition words, "entries: 3") — what the next check
   *  compares against. */
  state: string;
  /** The reading in words, as a firing quotes it: BOTH
   *  readings ride every demand (§2.3). */
  summary: string;
  /** Staleness readings carry their numbers for the
   *  margin rule and the demand's wording. */
  remainingMs?: number;
  expiresAt?: string;
  /** Weather readings carry their precipitation fact for
   *  the precipitation-begins-or-ceases clause (M2). */
  raining?: boolean;
}

/** One entry of a monitor's history (§5): every check
 *  that ran, fired and unfired, and every ending. The
 *  history is complete by construction — an entry is
 *  appended by the same code paths that run the checks
 *  and close the records, never reconstructed after. */
export interface MonitorHistoryEntry {
  atISO?: string;
  turnCount: number;
  outcome:
    | "registered"
    | "change"
    | "no-change"
    | "not-comparable"
    | "unavailable"
    | "declined"
    | "unpriceable"
    | "heartbeat"
    | "telling"
    | "noted"
    | "ended";
  detail: string;
}

export type MonitorStatus =
  | "standing"
  | "expired"
  | "cancelled"
  | "superseded"
  | "closed-by-expectation";

export interface MonitorRecord {
  id: string;
  subject: MonitorSubject;
  /** The subject and its source in words — what a firing
   *  and a history entry name. */
  subjectStatement: string;
  interval: MonitorInterval;
  changeRules: ChangeRule[];
  /** The registrar: the demand's addressee of record, and
   *  the only unit that may amend (by supersession) or
   *  cancel this monitor (§2.2). */
  registrar: string;
  /** The expiry (§2.2): the field is never omitted from a
   *  record. The note leans mandatory (§6.2, §10.1) and
   *  this build follows the lean: an omitted expiry is
   *  refused at registration, and "no expiry" stands only
   *  as a stated value with its reason, on Scheduling's
   *  precedent. The default is flagged in the M1 report
   *  for the owner's ratification. */
  expiry: { kind: "at"; instantISO: string } | { kind: "no-expiry"; reason: string };
  /** The standing the checks run under (§2.2, §6.1):
   *  recorded, never inferred. Only "turn-boundary" is
   *  registrable at this rung. */
  standing: "turn-boundary";
  registeredAtISO?: string;
  registeredAtStanding: string;
  registeredAtTurnCount: number;
  status: MonitorStatus;
  /** The last reading, where one stands (§2.2). */
  lastReading?: MonitorReading;
  /** Class-form standing term: each holding's last-seen
   *  comparison state, by bank key. */
  classState?: Record<string, { state: string; remainingMs?: number; expiresAt?: string }>;
  lastCheckAtISO?: string;
  /** The Scheduling item holding the next check (§3.3). */
  nextCheckItemId?: string;
  /** M3's cross-citation (§7.3): the expectation this
   *  monitor serves as mechanism, where it serves one.
   *  The monitor's registrar is then the expectation's
   *  registering unit, and the monitor's expiry is the
   *  expectation's deadline, exactly. */
  servesExpectationId?: string;
  successorId?: string;
  closedAtISO?: string;
  closedHow?: string;
  /** Successive checks declined at pricing — the §8
   *  heartbeat's counter. Reset by any check that runs. */
  declinedCheckRun: number;
  /** Successive unavailable checks — the counter an
   *  unavailable-successive rule reads. Reset by any
   *  check that returns a reading. */
  unavailableRun: number;
  /** The one permitted heartbeat (§5): raised at most
   *  once per monitor, latched here. */
  heartbeatRaised: boolean;
  history: MonitorHistoryEntry[];
}

/** A demand a monitor raises (§2.3): it names the monitor,
 *  the registrar it is addressed to, the change — and it
 *  carries BOTH readings, the standing term and the new
 *  one, because a demand that says "something changed"
 *  without saying from what to what asks the Planner to
 *  price a change it cannot see. The Unit raises demands;
 *  it never speaks, never authors a reply, never executes
 *  (§2.3, §6.3). */
export interface MonitorFiring {
  monitorId: string;
  registrar: string;
  kind: "change" | "heartbeat";
  /** The rule clause that fired, in words (change
   *  firings). */
  rule?: string;
  /** The standing term: the last reading before this
   *  check, in words — absent where the firing is a first
   *  look or the heartbeat. */
  before?: string;
  /** The new reading, in words. */
  after: string;
  demand: string;
  atISO?: string;
  /** For a staleness firing over a weather fact: the
   *  place whose re-consultation the demand proposes, so
   *  the wired layer can register the refresh as a
   *  Scheduling item with the weather-reconsult consumer
   *  (§7.2.2 — the T2 chain executes it). */
  refreshPlace?: string;
  /** For a weather firing (M2, §7.1): the telling's
   *  pricing, recorded by the wired layer after the
   *  Planner prices the telling itself — told, with the
   *  draft wording the demand's two readings grounded, or
   *  declined with its ground. The decline is part of the
   *  record, exactly as a declined check is (§7.1's
   *  acceptance). The Unit raised the demand; the telling
   *  was never the Unit's to make (§2.3). */
  telling?: { priced: "told" | "declined"; wording?: string; ground?: string };
}

/** One executed (or priced-and-declined) check, as the
 *  turn's trace carries it beside the monitor's own
 *  history entry. */
export interface MonitorCheckOutcome {
  monitorId: string;
  outcome: "change" | "no-change" | "not-comparable" | "unavailable" | "declined" | "unpriceable";
  detail: string;
}

/* ---------------- stated constants ---------------- */

/** The waking floor (§8): an interval materially shorter
 *  than the conversation's turn spacing cannot be what it
 *  says under a turn-boundary standing. The floor is a
 *  STATED DEFAULT of this build — one minute, shorter
 *  than any turn spacing a sweep can evaluate — flagged
 *  in the M1 report for the owner's ratification. Below
 *  it, registration is refused at the interval, or the
 *  interval is restated as what it will actually be (a
 *  check at every turn) where the registrar accepts the
 *  restatement in the spec. */
export const TURN_BOUNDARY_FLOOR_MS = 60_000;

/** The declined-checks run past which the one permitted
 *  heartbeat raises (§5, §8): a STATED DEFAULT of this
 *  build — three successive declined checks — flagged in
 *  the M1 report. The heartbeat is about the monitor
 *  itself; it fires once per monitor, and silence about
 *  the subject stays absolute. */
export const DECLINED_CHECK_HEARTBEAT_RUN = 3;

/** The registrar of record for the check items the Unit
 *  itself places on the schedule (§3.3): the items are
 *  the Unit's, whatever unit registered the monitor. */
export const MONITORING_UNIT = "the Monitoring Unit";

/* ---------------- statements ---------------- */

export function subjectStatementOf(subject: MonitorSubject): string {
  switch (subject.kind) {
    case "bank-staleness-fact": {
      const ref = subject.ref;
      switch (ref.bank) {
        case "weather":
          return `the weather bank's reading for ${ref.place}, watched over the bank's own holdings (fact form)`;
        case "geography-coordinates":
          return `the geography register's coordinates of ${ref.name}, watched over the register's own holdings (fact form)`;
        case "geography-whats-there":
          return `the geography register's what's-there set for ${ref.name} (${ref.categoryKey}), watched over the register's own holdings (fact form)`;
        case "geography-route":
          return `the geography register's route from ${ref.from} to ${ref.to}, watched over the register's own holdings (fact form)`;
        case "wikidata":
          return `the Wikidata bank's holding for ${ref.name}, watched over the bank's own holdings (fact form)`;
      }
      break;
    }
    case "bank-staleness-class":
      return `the weather bank's holdings as they stand, each watched under the rule (class form)`;
    case "weather-reading":
      return `the weather at ${subject.placeName}, consulted through the weather source`;
    case "whats-there":
      return `what is near ${subject.placeName} (${subject.categoryKey}), consulted through Overpass`;
  }
}

export function ruleStatementOf(rule: ChangeRule): string {
  switch (rule.kind) {
    case "passes-shelf-life":
      return "the reading passes its shelf life";
    case "stale-within-margin":
      return `the reading comes within ${formatDuration(rule.marginMs)} of its shelf life's end`;
    case "condition-word-differs":
      return "the condition word differs from the last reading's";
    case "precipitation-begins-or-ceases":
      return "precipitation begins or ceases";
    case "reading-arrives":
      return "a reading arrives where the last check found the source unavailable";
    case "unavailable-successive":
      return `the source is unavailable for ${rule.count} successive checks`;
  }
}

/** Durations in the words the system's replies use
 *  ("about 1 h 53 min" is the geography precedent):
 *  coarsest two units, no false precision. */
export function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  const sign = ms < 0 ? "−" : "";
  if (abs < 60_000) return `${sign}${Math.round(abs / 1000)} s`;
  if (abs < 3_600_000) return `${sign}${Math.round(abs / 60_000)} min`;
  if (abs < 86_400_000) {
    const h = Math.floor(abs / 3_600_000);
    const m = Math.round((abs - h * 3_600_000) / 60_000);
    return m > 0 ? `${sign}${h} h ${m} min` : `${sign}${h} h`;
  }
  const d = Math.floor(abs / 86_400_000);
  const h = Math.round((abs - d * 86_400_000) / 3_600_000);
  return h > 0 ? `${sign}${d} d ${h} h` : `${sign}${d} d`;
}

/* ---------------- registration (§2.2, §6, §8) ---------------- */

export interface MonitorSpec {
  subject: MonitorSubject;
  interval: MonitorInterval;
  changeRules: ChangeRule[];
  registrar: string;
  /** Required as a field (§2.2: the field is never
   *  omitted); the VALUE may be a stated "no-expiry" with
   *  its reason. An absent expiry is refused — the note's
   *  mandatory lean (§6.2, §10.1), followed as this
   *  build's default and flagged in the M1 report. */
  expiry?: MonitorRecord["expiry"];
  /** The standing asked for. Only "turn-boundary" stands
   *  at this rung; asking for "driver-delivered" is
   *  refused at the standing (§6.1). */
  standing?: "turn-boundary" | "driver-delivered";
  /** The registrar accepts the §8 restatement where the
   *  interval falls below the waking floor: the monitor
   *  is registered with its interval restated as a check
   *  at every turn, and the record says so. */
  acceptFloorRestatement?: boolean;
  /** M3: the expectation this monitor serves (§7.3). */
  servesExpectationId?: string;
}

const STALENESS_RULES: ChangeRule["kind"][] = ["passes-shelf-life", "stale-within-margin"];
const CONTENT_RULES: ChangeRule["kind"][] = ["condition-word-differs", "precipitation-begins-or-ceases"];

function isConsultationSubject(subject: MonitorSubject): boolean {
  return subject.kind === "weather-reading" || subject.kind === "whats-there";
}

/**
 * Register a monitor (§2.2). Every refusal is LOCATED —
 * at the rule, the subject, the interval, the expiry, the
 * standing — in the §8 catalogue's words, and a refused
 * registration records nothing. On success the record
 * stands complete and the first check is placed on the
 * schedule (§3.3): the monitor does not keep a clock of
 * its own.
 */
export function registerMonitor(
  session: Session,
  spec: MonitorSpec,
  standing: TimeStanding | undefined,
): { ok: true; monitor: MonitorRecord } | { ok: false; reason: string } {
  const refuse = (reason: string) => ({ ok: false as const, reason });

  /* The rule first (§8: unsatisfiable as stated is
   * refused before any check): no rule, no monitor. */
  if (!spec.changeRules || spec.changeRules.length === 0) {
    return refuse(
      "refused at the change rule: a monitor without a change rule is not a monitor — it would be " +
        "polling with a register entry, diligence without difference (§2.2, §8). State the rule the " +
        "checks are to compare under.",
    );
  }
  for (const rule of spec.changeRules) {
    if (rule.kind === "stale-within-margin" && !(rule.marginMs > 0)) {
      return refuse(
        "refused at the change rule: a stale-within-margin rule must state a positive margin — " +
          "a margin of nothing is the passes-shelf-life rule under another name (§8).",
      );
    }
    if (rule.kind === "unavailable-successive" && !(rule.count >= 2)) {
      return refuse(
        "refused at the change rule: an unavailable-successive rule must name a run of at least two — " +
          "a single unavailability is the check's stated state, recorded and silent by default (§3.4, §8).",
      );
    }
  }

  /* The standing (§6.1): only turn-boundary stands. */
  if (spec.standing === "driver-delivered") {
    return refuse(
      "refused at the standing: no host driver stands — the time programme built the driver " +
        "contract's entity side only, and a monitor registered as driver-delivered would claim a " +
        "waking nothing performs (§6.1). Register it turn-boundary, whose record states honestly " +
        "that its checks run when the conversation runs.",
    );
  }
  const registeredAtISO = standingInstantISO(standing);
  if (!registeredAtISO) {
    return refuse(
      "refused at the standing: no clock reading stands for this registration and the frame states " +
        "no instant — a monitor's interval cannot be anchored, and nothing in the system invents a " +
        "time to proceed on (§6.1).",
    );
  }

  /* The registrar (§2.2): the demand's addressee of
   * record must stand. */
  if (!spec.registrar || !spec.registrar.trim()) {
    return refuse(
      "refused at the registrar: a monitor's demands are addressed to its registrar of record — " +
        "name the unit that registers this watch and alone may amend or cancel it (§2.2).",
    );
  }

  /* The subject and the rule together (§3.1, §8): a rule
   * the subject's facts cannot satisfy is refused here,
   * in the catalogue's words, before any check. */
  const subject = spec.subject;
  const hasStalenessRule = spec.changeRules.some((r) => STALENESS_RULES.includes(r.kind));
  const hasContentRule = spec.changeRules.some((r) => CONTENT_RULES.includes(r.kind));
  const hasUnavailableRule = spec.changeRules.some((r) => r.kind === "unavailable-successive");
  const hasArrivalRule = spec.changeRules.some((r) => r.kind === "reading-arrives");
  if (isConsultationSubject(subject)) {
    if (hasStalenessRule) {
      return refuse(
        "refused at the change rule: a staleness rule watches a banked fact under its shelf life; " +
          "this subject is a consultation, whose readings carry content, not a bank's shelf life — " +
          "watch the banked reading (a bank subject) or state a content rule (§3.1, §8).",
      );
    }
    /* A content rule names weather content; over a
     * what's-there subject it is unsatisfiable as stated
     * — the sets carry entries, not condition words. */
    if (subject.kind === "whats-there" && hasContentRule) {
      return refuse(
        "refused at the change rule: the rule names weather content (a condition word, " +
          "precipitation) — a what's-there set carries entries, and the rule can never be satisfied " +
          "as stated over it. State an arrival or unavailability rule (§8).",
      );
    }
    /* The what's-there consultation is bounded by
     * construction (§2.2): a category outside its table
     * has no consultable source — the client takes
     * categories from the table, never a raw query. */
    if (subject.kind === "whats-there" && !categoryByKey(subject.categoryKey)) {
      return refuse(
        `refused at the subject: '${subject.categoryKey}' is not a category the what's-there ` +
          "consultation can ask after — its category table is the whole vocabulary of the " +
          "consultation (bounded by construction), so no consultable source stands behind this " +
          "subject (§2.2).",
      );
    }
  }
  if (!isConsultationSubject(subject) && (hasContentRule || hasArrivalRule || hasUnavailableRule)) {
    return refuse(
      "refused at the change rule: the rule names content, arrival, or unavailability — states of a " +
        "consultation. This subject is a bank's own holding, read by a staleness question that " +
        "always answers; state a staleness rule, or register the consultation subject the rule " +
        "belongs to (§3.1, §3.4, §8).",
    );
  }
  if (subject.kind === "bank-staleness-fact" && subject.ref.bank === "wikidata" && hasStalenessRule) {
    return refuse(
      "refused at the change rule: the Wikidata bank states no shelf life for its holdings, so a " +
        "staleness rule over this fact can never be satisfied as stated — the fact can be " +
        "content-watched, but its rule cannot be a staleness rule, and the registration says which " +
        "(§3.1, §8).",
    );
  }

  /* The interval (§3.2, §8): a positive period, and the
   * waking floor under a turn-boundary standing. */
  const interval: MonitorInterval = { ...spec.interval };
  if (!(interval.periodMs > 0) || !Number.isFinite(interval.periodMs)) {
    return refuse(
      "refused at the interval: a monitor's interval must state a positive period — the pattern " +
        "of intent its checks fall due under (§3.2).",
    );
  }
  if (interval.periodMs < TURN_BOUNDARY_FLOOR_MS) {
    if (!spec.acceptFloorRestatement) {
      return refuse(
        `refused at the interval: a period of ${formatDuration(interval.periodMs)} is below the waking ` +
          `floor of a turn-boundary standing (${formatDuration(TURN_BOUNDARY_FLOOR_MS)}, a stated ` +
          "default of this build) — between turns nothing is watched, so the interval could not be " +
          "what it says. Register it with the interval restated as what it will actually be — a " +
          "check at every turn — or state a longer period (§6.1, §8).",
      );
    }
    interval.restatedAsEveryTurn =
      `stated as ${formatDuration(interval.periodMs)}, below the waking floor of a turn-boundary ` +
      "standing; restated at registration as a check at every turn, which is what it will actually be (§8)";
  }

  /* The expiry (§2.2, §6.2): never omitted; "no expiry"
   * only as a stated value with its reason. */
  if (!spec.expiry) {
    return refuse(
      "refused at the expiry: a monitor's expiry is never omitted from its record — an unbounded " +
        "watch is a liability the register will not carry unstated. State an expiry, or state " +
        "'no-expiry' with its reason, which stands as a value on the record (the note leans " +
        "mandatory, §6.2/§10.1; the lean is this build's default, flagged for ratification).",
    );
  }
  if (spec.expiry.kind === "no-expiry" && !spec.expiry.reason?.trim()) {
    return refuse(
      "refused at the expiry: 'no expiry' must state its reason — it stands as a stated value on " +
        "the record, on Scheduling's precedent, not as a blank (§2.2).",
    );
  }
  if (spec.expiry.kind === "at") {
    if (!Number.isFinite(Date.parse(spec.expiry.instantISO))) {
      return refuse("refused at the expiry: the stated expiry is not an instant the register can read (§2.2).");
    }
    if (Date.parse(spec.expiry.instantISO) <= Date.parse(registeredAtISO)) {
      return refuse(
        "refused at the expiry: the stated expiry does not stand after the registration — the " +
          "monitor would be born ended (§2.2).",
      );
    }
  }

  /* The first check must fall before the expiry, or the
   * watch is a record that can never check. */
  const firstCheckISO = nextCheckISO(interval, registeredAtISO, registeredAtISO);
  if (spec.expiry.kind === "at" && Date.parse(firstCheckISO) >= Date.parse(spec.expiry.instantISO)) {
    return refuse(
      "refused at the expiry: the monitor's first check would fall at or after its expiry — the " +
        "watch could never run. State a later expiry or a shorter interval (§2.2).",
    );
  }

  const id = `monitor-${++session.monitorSeq}`;
  const monitor: MonitorRecord = {
    id,
    subject,
    subjectStatement: subjectStatementOf(subject),
    interval,
    changeRules: spec.changeRules,
    registrar: spec.registrar,
    expiry: spec.expiry,
    standing: "turn-boundary",
    registeredAtISO,
    registeredAtStanding: standing?.detail ?? "no standing named",
    registeredAtTurnCount: session.turnCount,
    status: "standing",
    declinedCheckRun: 0,
    unavailableRun: 0,
    heartbeatRaised: false,
    ...(spec.servesExpectationId ? { servesExpectationId: spec.servesExpectationId } : {}),
    history: [
      {
        atISO: registeredAtISO,
        turnCount: session.turnCount,
        outcome: "registered",
        detail:
          `registered by ${spec.registrar}: ${subjectStatementOf(subject)}; interval ` +
          `${interval.restatedAsEveryTurn ? "restated — a check at every turn" : `of ${formatDuration(interval.periodMs)}`} ` +
          `anchored to ${interval.anchor.kind === "registration" ? "the registration" : `a stated instant (${interval.anchor.statement})`}` +
          `${interval.patternCitation ? `; citing Repetition's pattern '${interval.patternCitation.pattern}' (${interval.patternCitation.citedAs})` : ""}; ` +
          `rule: ${spec.changeRules.map(ruleStatementOf).join("; ")}; ` +
          `expiry: ${spec.expiry.kind === "at" ? spec.expiry.instantISO : `no expiry — ${spec.expiry.reason}`}; ` +
          "standing: turn-boundary (its checks run when the conversation runs; between turns nothing is watched, §6.1)" +
          `${spec.servesExpectationId ? `; serving expectation '${spec.servesExpectationId}' as its mechanism (§7.3)` : ""}`,
      },
    ],
  };
  session.monitors.push(monitor);
  const placed = ensureNextCheck(session, monitor, standing);
  if (!placed.ok) {
    session.monitors.splice(session.monitors.indexOf(monitor), 1);
    return refuse(placed.reason);
  }
  return { ok: true, monitor };
}

/* ---------------- the Scheduling ride (§3.3) ---------------- */

/** The next instant on the interval's anchor grid strictly
 * after `afterISO` (the first check: after the
 * registration). A restated every-turn interval falls due
 * at once — every sweep finds it due, which is what "at
 * every turn" honestly is. */
export function nextCheckISO(interval: MonitorInterval, registeredAtISO: string, afterISO: string): string {
  if (interval.restatedAsEveryTurn) return afterISO;
  const anchorISO =
    interval.anchor.kind === "registration" ? registeredAtISO : interval.anchor.instantISO;
  let t = Date.parse(anchorISO);
  const after = Date.parse(afterISO);
  if (!Number.isFinite(t)) return afterISO;
  if (t <= after) {
    const steps = Math.floor((after - t) / interval.periodMs) + 1;
    t += steps * interval.periodMs;
  }
  return new Date(t).toISOString();
}

/**
 * Place (or repair) the monitor's next check on the
 * schedule (§3.3): a due item registered at registration
 * and after each check, owed by the Monitoring Unit, its
 * registration expiry never outliving the monitor's own
 * expiry. Idempotent — a standing or due-raised check
 * item already on the schedule is the next check. A
 * monitor whose next check would fall at or after its
 * expiry gets no item: the closing pass ends it.
 */
export function ensureNextCheck(
  session: Session,
  monitor: MonitorRecord,
  standing: TimeStanding | undefined,
): { ok: true; item?: ScheduledItem } | { ok: false; reason: string } {
  if (monitor.status !== "standing") return { ok: true };
  const existing = session.schedule.find(
    (i) =>
      i.consumer?.kind === "monitor-check" &&
      i.consumer.monitorId === monitor.id &&
      (i.status === "standing" || i.status === "due-raised"),
  );
  if (existing) {
    monitor.nextCheckItemId = existing.id;
    return { ok: true, item: existing };
  }
  const nowISO = standingInstantISO(standing) ?? monitor.lastCheckAtISO ?? monitor.registeredAtISO;
  if (!nowISO || !monitor.registeredAtISO) {
    return { ok: false, reason: "no instant stands to schedule the monitor's next check from (§3.3)" };
  }
  const dueISO = nextCheckISO(monitor.interval, monitor.registeredAtISO, nowISO);
  if (monitor.expiry.kind === "at" && Date.parse(dueISO) >= Date.parse(monitor.expiry.instantISO)) {
    monitor.nextCheckItemId = undefined;
    return { ok: true };
  }
  const itemExpiry =
    monitor.expiry.kind === "at"
      ? new Date(Math.min(Date.parse(dueISO) + monitor.interval.periodMs, Date.parse(monitor.expiry.instantISO))).toISOString()
      : new Date(Date.parse(dueISO) + 2 * monitor.interval.periodMs).toISOString();
  const result = registerSchedule(
    session,
    {
      owed: `the next check of monitor '${monitor.id}' (${monitor.subjectStatement})`,
      trigger: { kind: "at", instantISO: dueISO },
      registeredBy: MONITORING_UNIT,
      registrationExpiresISO: itemExpiry,
      onDue:
        `run the check of monitor '${monitor.id}' under its change rule and record the outcome ` +
        "in the monitor's history — the Monitoring Unit's wired consumer executes it; Scheduling raises it",
      consumer: { kind: "monitor-check", monitorId: monitor.id },
    },
    standing,
  );
  if (!result.ok) return { ok: false, reason: `the monitor's next check could not be placed on the schedule: ${result.reason}` };
  monitor.nextCheckItemId = result.item.id;
  return { ok: true, item: result.item };
}

/* ---------------- endings (§2.4) ---------------- */

function closeMonitor(
  session: Session,
  monitor: MonitorRecord,
  status: Exclude<MonitorStatus, "standing">,
  how: string,
  standing: TimeStanding | undefined,
): void {
  monitor.status = status;
  monitor.closedAtISO = standingInstantISO(standing);
  monitor.closedHow = how;
  /* The monitor's open check item is the Unit's own
   * registration: cancel it under the registrar rule, so
   * no orphaned check outlives its monitor. */
  const item = session.schedule.find(
    (i) => i.id === monitor.nextCheckItemId && (i.status === "standing" || i.status === "due-raised"),
  );
  if (item) cancelSchedule(session, item.id, MONITORING_UNIT, standing);
  monitor.nextCheckItemId = undefined;
  monitor.history.push({
    atISO: monitor.closedAtISO,
    turnCount: session.turnCount,
    outcome: "ended",
    detail: how,
  });
}

/** Cancel a monitor: the registrar alone (§2.2, §2.4). */
export function cancelMonitor(
  session: Session,
  monitorId: string,
  byUnit: string,
  ground: string,
  standing: TimeStanding | undefined,
): { ok: true } | { ok: false; reason: string } {
  const monitor = session.monitors.find((m) => m.id === monitorId);
  if (!monitor) return { ok: false, reason: `no monitor stands under the id '${monitorId}'` };
  if (monitor.status !== "standing") {
    return { ok: false, reason: `the monitor '${monitorId}' already ended (${monitor.status}); there is nothing to cancel` };
  }
  if (byUnit !== monitor.registrar) {
    return {
      ok: false,
      reason:
        `only the registering unit may cancel monitor '${monitorId}' — it stands registered by ` +
        `'${monitor.registrar}', and the request came from '${byUnit}' (§2.2)`,
    };
  }
  closeMonitor(session, monitor, "cancelled", `cancelled by its registrar ('${byUnit}'): ${ground}`, standing);
  return { ok: true };
}

/**
 * Supersede a monitor (§2.4): rules are revised by
 * supersession, never edited in place — the successor is
 * a new registration, and the predecessor's record closes
 * naming it, its history intact behind it. Registrar-only,
 * like cancellation.
 */
export function supersedeMonitor(
  session: Session,
  monitorId: string,
  byUnit: string,
  successorSpec: MonitorSpec,
  standing: TimeStanding | undefined,
): { ok: true; successor: MonitorRecord } | { ok: false; reason: string } {
  const monitor = session.monitors.find((m) => m.id === monitorId);
  if (!monitor) return { ok: false, reason: `no monitor stands under the id '${monitorId}'` };
  if (monitor.status !== "standing") {
    return { ok: false, reason: `the monitor '${monitorId}' already ended (${monitor.status}); there is nothing to supersede` };
  }
  if (byUnit !== monitor.registrar) {
    return {
      ok: false,
      reason:
        `only the registering unit may supersede monitor '${monitorId}' — it stands registered by ` +
        `'${monitor.registrar}', and the request came from '${byUnit}' (§2.2, §2.4)`,
    };
  }
  const registered = registerMonitor(session, successorSpec, standing);
  if (!registered.ok) return registered;
  monitor.successorId = registered.monitor.id;
  closeMonitor(
    session,
    monitor,
    "superseded",
    `superseded by monitor '${registered.monitor.id}', registered by the same registrar ('${byUnit}') — ` +
      "rules are revised by supersession, never edited in place (§2.4)",
    standing,
  );
  return { ok: true, successor: registered.monitor };
}

/**
 * The closing pass (§2.4, §8): monitors whose expiry has
 * passed, still unclosed, are closed at the next sweep —
 * Scheduling's lapsed precedent — with the record saying
 * how many checks ran and how many fired. Run by the
 * wired layer at each turn; without a standing instant,
 * nothing is closed on a guess.
 */
export function closeExpiredMonitors(
  session: Session,
  standing: TimeStanding | undefined,
): MonitorRecord[] {
  const nowISO = standingInstantISO(standing);
  if (!nowISO) return [];
  const closed: MonitorRecord[] = [];
  for (const monitor of session.monitors) {
    if (monitor.status !== "standing" || monitor.expiry.kind !== "at") continue;
    if (Date.parse(nowISO) <= Date.parse(monitor.expiry.instantISO)) continue;
    const checks = monitor.history.filter((h) =>
      ["change", "no-change", "not-comparable", "unavailable", "declined"].includes(h.outcome),
    ).length;
    const fired = monitor.history.filter((h) => h.outcome === "change").length;
    closeMonitor(
      session,
      monitor,
      "expired",
      `expired unclosed at ${monitor.expiry.instantISO}: the registration ran out and no renewal ` +
        `stands; closed at the next sweep with ${checks} check(s) run (${fired} fired) — the ` +
        "history stands complete behind the ending (§2.4, §8)",
      standing,
    );
    closed.push(monitor);
  }
  return closed;
}

/* ---------------- the staleness check (§3.1, §7.2) ---------------- */

export interface MonitorBanks {
  weather?: WeatherBank;
  register?: PlaceRegister;
  wikidata?: WikidataBank;
}

function readingOfStaleness(answer: StalenessAnswer): MonitorReading {
  const v = answer.verdict;
  switch (v.state) {
    case "fresh":
      return {
        atISO: "",
        state: "fresh",
        summary: `${answer.key}: fresh under ${answer.shelfLife} (${formatDuration(v.remainingMs)} remaining)`,
        remainingMs: v.remainingMs,
        expiresAt: v.expiresAt,
      };
    case "stale":
      return {
        atISO: "",
        state: "stale",
        summary: `${answer.key}: stale under ${answer.shelfLife} (expired ${v.expiresAt}, ${formatDuration(v.overdueMs)} overdue)`,
        expiresAt: v.expiresAt,
      };
    case "absent":
      return { atISO: "", state: "absent", summary: `${answer.key}: absent from the bank` };
    default:
      return {
        atISO: "",
        state: "no-shelf-life-stated",
        summary: `${answer.key}: held with no shelf life stated (${answer.shelfLife})`,
      };
  }
}

/**
 * Run one staleness check (§3.1, §7.2): the check IS a
 * staleness question, asked of Timekeeping's uniform
 * operation over the monitor's subject — the Unit does
 * not re-derive freshness from the banks. The comparison
 * is the standing comparison of §3.4: the new verdict
 * against the last reading.
 *
 * A design reading, stated: for staleness rules the
 * firing is ENTERING the named state, and a first check
 * that finds the fact already stale (or already inside
 * the margin) fires — the monitor's standing term before
 * its first check is "unwatched", and the alternative
 * (a first check can never fire) would leave a monitor
 * registered over an already-stale fact silent forever,
 * against §7.2's purpose. The first check over a fact in
 * no named state is the ordinary not-comparable outcome.
 *
 * On a weather firing the demand proposes the refresh as
 * a Scheduling item with the weather-reconsult consumer
 * (§7.2.2): the wired layer registers it, and the T2
 * chain — sweep, pricing, re-consultation, re-bank —
 * executes it before a later asking can meet the
 * stale-only decline.
 */
export function runStalenessCheck(
  session: Session,
  monitor: MonitorRecord,
  banks: MonitorBanks,
  standing: TimeStanding | undefined,
): { outcome: MonitorCheckOutcome; firings: MonitorFiring[] } {
  const nowISO = standingInstantISO(standing) ?? new Date().toISOString();
  const before = monitor.lastReading;
  const firings: MonitorFiring[] = [];
  let outcomeState: MonitorCheckOutcome["outcome"];
  let detail: string;

  const finish = (reading: MonitorReading, fired: boolean, comparison: string) => {
    reading.atISO = nowISO;
    monitor.lastReading = reading;
    monitor.lastCheckAtISO = nowISO;
    monitor.declinedCheckRun = 0;
    outcomeState = fired ? "change" : before ? "no-change" : "not-comparable";
    detail =
      `${comparison}; the check ran at ${nowISO} under the turn-boundary standing and is ` +
      `recorded whether it fired or not (§5)`;
    monitor.history.push({ atISO: nowISO, turnCount: session.turnCount, outcome: outcomeState, detail });
    return { outcome: { monitorId: monitor.id, outcome: outcomeState, detail }, firings };
  };

  if (monitor.subject.kind === "bank-staleness-fact") {
    const ref = monitor.subject.ref;
    const answer = askStaleness(ref, nowISO, banks);
    const reading = readingOfStaleness(answer);
    const firedRules: string[] = [];
    for (const rule of monitor.changeRules) {
      if (rule.kind === "passes-shelf-life" && reading.state === "stale" && before?.state !== "stale") {
        firedRules.push(ruleStatementOf(rule));
      }
      if (
        rule.kind === "stale-within-margin" &&
        reading.state === "fresh" &&
        reading.remainingMs !== undefined &&
        reading.remainingMs <= rule.marginMs &&
        !(before?.state === "fresh" && before.remainingMs !== undefined && before.remainingMs <= rule.marginMs)
      ) {
        firedRules.push(ruleStatementOf(rule));
      }
    }
    if (firedRules.length) {
      const firing: MonitorFiring = {
        monitorId: monitor.id,
        registrar: monitor.registrar,
        kind: "change",
        rule: firedRules.join("; "),
        ...(before ? { before: before.summary } : {}),
        after: reading.summary,
        demand:
          `monitor '${monitor.id}' (registrar: ${monitor.registrar}) fires: ${firedRules.join("; ")} — ` +
          `${before ? `the standing reading was: ${before.summary}; ` : "no reading stood before this check; "}` +
          `the new reading is: ${reading.summary}. The Unit proposes the refresh: re-consult the ` +
          "source for this fact and re-bank it, so the stale-only decline does not stand for a " +
          "later asking (§7.2). The Planner prices the refresh; the Unit does not execute it (§2.3).",
        atISO: nowISO,
        ...(ref.bank === "weather" ? { refreshPlace: ref.place } : {}),
      };
      firings.push(firing);
      return finish(reading, true, `the rule fired (${firedRules.join("; ")}): ${reading.summary}`);
    }
    return finish(
      reading,
      false,
      before
        ? `no change under the rule: the verdict stands ${reading.state} (was ${before.state})`
        : `first check: the verdict is ${reading.state}, in no state the rule names — the baseline stands recorded`,
    );
  }

  if (monitor.subject.kind === "bank-staleness-class") {
    /* The class form: every holding of the weather bank,
     * each asked after uniformly, each compared against
     * its own standing term in the monitor's class state. */
    const entries = banks.weather?.entries() ?? [];
    const nextState: NonNullable<MonitorRecord["classState"]> = { ...(monitor.classState ?? {}) };
    const newlyStale: { place: string; reading: MonitorReading }[] = [];
    const newlyWithinMargin: { place: string; reading: MonitorReading; rule: ChangeRule }[] = [];
    let freshCount = 0;
    let staleCount = 0;
    for (const entry of entries) {
      const answer = askStaleness({ bank: "weather", place: entry.statedPlace }, nowISO, banks);
      const reading = readingOfStaleness(answer);
      const key = entry.placeKey;
      const prior = nextState[key];
      if (reading.state === "fresh") freshCount++;
      if (reading.state === "stale") staleCount++;
      for (const rule of monitor.changeRules) {
        if (rule.kind === "passes-shelf-life" && reading.state === "stale" && prior?.state !== "stale") {
          newlyStale.push({ place: entry.statedPlace, reading });
        }
        if (
          rule.kind === "stale-within-margin" &&
          reading.state === "fresh" &&
          reading.remainingMs !== undefined &&
          reading.remainingMs <= rule.marginMs &&
          !(prior?.state === "fresh" && prior.remainingMs !== undefined && prior.remainingMs <= rule.marginMs)
        ) {
          newlyWithinMargin.push({ place: entry.statedPlace, reading, rule });
        }
      }
      nextState[key] = {
        state: reading.state,
        ...(reading.remainingMs !== undefined ? { remainingMs: reading.remainingMs } : {}),
        ...(reading.expiresAt ? { expiresAt: reading.expiresAt } : {}),
      };
    }
    monitor.classState = nextState;
    const summary =
      entries.length === 0
        ? "the weather bank holds no readings"
        : `${entries.length} holding(s): ${freshCount} fresh, ${staleCount} stale`;
    const reading: MonitorReading = { atISO: nowISO, state: summary, summary: `the weather bank's holdings — ${summary}` };
    for (const hit of newlyStale) {
      firings.push({
        monitorId: monitor.id,
        registrar: monitor.registrar,
        kind: "change",
        rule: ruleStatementOf({ kind: "passes-shelf-life" }),
        ...(before ? { before: before.summary } : {}),
        after: hit.reading.summary,
        demand:
          `monitor '${monitor.id}' (registrar: ${monitor.registrar}) fires over the class: the ` +
          `reading for ${hit.place} passed its shelf life — ${hit.reading.summary}. The Unit ` +
          "proposes the refresh: re-consult the weather source for this place and re-bank it " +
          "(§7.2). The Planner prices the refresh; the Unit does not execute it (§2.3).",
        atISO: nowISO,
        refreshPlace: hit.place,
      });
    }
    for (const hit of newlyWithinMargin) {
      firings.push({
        monitorId: monitor.id,
        registrar: monitor.registrar,
        kind: "change",
        rule: ruleStatementOf(hit.rule),
        ...(before ? { before: before.summary } : {}),
        after: hit.reading.summary,
        demand:
          `monitor '${monitor.id}' (registrar: ${monitor.registrar}) fires over the class: the ` +
          `reading for ${hit.place} came within the stated margin of its shelf life's end — ` +
          `${hit.reading.summary}. The Unit proposes the refresh: re-consult the weather source ` +
          "for this place and re-bank it (§7.2). The Planner prices the refresh; the Unit does " +
          "not execute it (§2.3).",
        atISO: nowISO,
        refreshPlace: hit.place,
      });
    }
    if (firings.length) {
      return finish(reading, true, `the rule fired over the class (${firings.length} holding(s) crossed): ${summary}`);
    }
    return finish(
      reading,
      false,
      before
        ? `no change under the rule over the class: ${summary}`
        : `first check over the class: ${summary} — the baseline stands recorded`,
    );
  }

  /* Consultation subjects reach their checks in
   * monitoring-turn.ts (M2/M3), which owns the wired
   * sources; a staleness check over one is a wiring
   * error, recorded as such rather than papered over. */
  monitor.history.push({
    atISO: nowISO,
    turnCount: session.turnCount,
    outcome: "unpriceable",
    detail: `a staleness check was run against a consultation subject ('${monitor.subject.kind}') — a wiring error; no comparison was made`,
  });
  return {
    outcome: {
      monitorId: monitor.id,
      outcome: "unpriceable",
      detail: "a staleness check was run against a consultation subject — a wiring error; no comparison was made",
    },
    firings: [],
  };
}

/* ---------------- the declined check and the heartbeat (§5, §8) ---------------- */

/**
 * Record a check the Planner declined at pricing (§3.3):
 * the due item closes fired-and-declined with the decline
 * as its evidence (the wired layer performs that close on
 * the schedule), the decline is a history event here, the
 * next check is still registered — and past the stated
 * run of successive declines, the ONE permitted heartbeat
 * raises: a single demand about the monitor itself (§5).
 * Returns the heartbeat firing where this decline crossed
 * the run, and nothing otherwise.
 */
export function recordDeclinedCheck(
  session: Session,
  monitor: MonitorRecord,
  ground: string,
  standing: TimeStanding | undefined,
): MonitorFiring | undefined {
  const atISO = standingInstantISO(standing);
  monitor.declinedCheckRun += 1;
  monitor.history.push({
    atISO,
    turnCount: session.turnCount,
    outcome: "declined",
    detail:
      `the check was declined at pricing: ${ground} — the item closed fired-and-declined with ` +
      `the decline as its evidence, and the next check is registered as usual (§3.3). ` +
      `Successive declined checks: ${monitor.declinedCheckRun}.`,
  });
  if (monitor.declinedCheckRun >= DECLINED_CHECK_HEARTBEAT_RUN && !monitor.heartbeatRaised) {
    monitor.heartbeatRaised = true;
    const firing: MonitorFiring = {
      monitorId: monitor.id,
      registrar: monitor.registrar,
      kind: "heartbeat",
      after: `${monitor.declinedCheckRun} successive checks declined at pricing (last ground: ${ground})`,
      demand:
        `the Monitoring Unit raises one demand about monitor '${monitor.id}' itself (registrar: ` +
        `${monitor.registrar}): its checks have been declined at pricing ${monitor.declinedCheckRun} ` +
        `times in succession (last ground: ${ground}) — the watch is not being kept at its priced ` +
        "cost. The registrar is asked to renew the watch at a price the Planner will pay, restate " +
        "its interval, or end it. This demand is about the monitor, not its subject; it is raised " +
        "once (§5, §8).",
      atISO,
    };
    monitor.history.push({
      atISO,
      turnCount: session.turnCount,
      outcome: "heartbeat",
      detail:
        `the one permitted heartbeat raised: ${monitor.declinedCheckRun} successive checks declined ` +
        "at pricing — a demand about the monitor itself, raised once (§5)",
    });
    return firing;
  }
  return undefined;
}

/* ---------------- the weather check (§3.4, §7.1) ---------------- */

/** What one weather consultation returned to the check:
 *  a reading (banked by the wired layer through the
 *  weather wrapper's own construction, before this
 *  comparison runs), or the source's unavailable state —
 *  a stated state, not a reading (§3.4). */
export type WeatherCheckResult =
  | { kind: "reading"; reading: WeatherReading }
  | { kind: "unavailable"; reason: string };

function weatherReadingTerm(reading: WeatherReading): MonitorReading {
  return {
    atISO: reading.fetchedAt,
    state: reading.condition,
    summary:
      `at ${reading.resolvedName}: ${reading.temperatureC}°C and ${reading.condition}` +
      (reading.raining ? ", raining" : ", not raining"),
    raining: reading.raining,
  };
}

/**
 * Record one weather check's comparison (§3.4, §7.1):
 * the new reading against the last, under the monitor's
 * clauses — the condition word, precipitation beginning
 * or ceasing, a reading arriving after unavailability.
 * The first check is the baseline (not-comparable): a
 * monitor's first reading has nothing to differ FROM,
 * and §3.4 names the first check the ordinary
 * not-comparable case.
 *
 * Unavailability is handled in the §8 catalogue's words:
 * recorded, the last reading unchanged, the next check
 * registered as usual, nothing raised — unless the rule
 * itself names unavailability, where the firing is at
 * the check the stated run is REACHED (a continuing run
 * does not re-fire; a reset run that climbs again fires
 * again at the same count).
 */
export function recordWeatherCheck(
  session: Session,
  monitor: MonitorRecord,
  result: WeatherCheckResult,
  standing: TimeStanding | undefined,
): { outcome: MonitorCheckOutcome; firings: MonitorFiring[] } {
  const nowISO = standingInstantISO(standing) ?? new Date().toISOString();
  const before = monitor.lastReading;
  const firings: MonitorFiring[] = [];

  if (result.kind === "unavailable") {
    monitor.unavailableRun += 1;
    monitor.lastCheckAtISO = nowISO;
    monitor.declinedCheckRun = 0;
    let firedRule: ChangeRule | undefined;
    for (const rule of monitor.changeRules) {
      if (rule.kind === "unavailable-successive" && monitor.unavailableRun === rule.count) {
        firedRule = rule;
      }
    }
    if (firedRule) {
      const firing: MonitorFiring = {
        monitorId: monitor.id,
        registrar: monitor.registrar,
        kind: "change",
        rule: ruleStatementOf(firedRule),
        ...(before ? { before: before.summary } : {}),
        after: `the source unavailable (${result.reason})`,
        demand:
          `monitor '${monitor.id}' (registrar: ${monitor.registrar}) fires on its rule's own terms: ` +
          `${ruleStatementOf(firedRule)} — the latest: ${result.reason}. The last reading stands ` +
          `unchanged (${before ? before.summary : "no reading stands yet"}). The Unit raises the ` +
          "source's unavailability itself, because the rule named it; unavailability a rule does " +
          "not name raises nothing (§3.4, §8).",
        atISO: nowISO,
      };
      firings.push(firing);
      const detail =
        `the check found the source unavailable (${result.reason}) — the ${monitor.unavailableRun}th ` +
        "successive unavailable check, reaching the rule's stated run: the rule fires on its own terms (§8)";
      monitor.history.push({ atISO: nowISO, turnCount: session.turnCount, outcome: "change", detail });
      return { outcome: { monitorId: monitor.id, outcome: "change", detail }, firings };
    }
    const detail =
      `the check found the source unavailable (${result.reason}) — a stated state, not a reading: ` +
      "the last reading stands unchanged, the next check is registered as usual, and nothing is " +
      `raised (§3.4, §8). Successive unavailable checks: ${monitor.unavailableRun}.`;
    monitor.history.push({ atISO: nowISO, turnCount: session.turnCount, outcome: "unavailable", detail });
    return { outcome: { monitorId: monitor.id, outcome: "unavailable", detail }, firings };
  }

  const reading = weatherReadingTerm(result.reading);
  const arrivedAfterUnavailable = monitor.unavailableRun > 0;
  monitor.unavailableRun = 0;
  monitor.declinedCheckRun = 0;
  monitor.lastCheckAtISO = nowISO;
  const firedRules: string[] = [];
  if (before) {
    for (const rule of monitor.changeRules) {
      if (rule.kind === "condition-word-differs" && before.state !== reading.state) {
        firedRules.push(ruleStatementOf(rule));
      }
      if (
        rule.kind === "precipitation-begins-or-ceases" &&
        before.raining !== undefined &&
        before.raining !== reading.raining
      ) {
        firedRules.push(ruleStatementOf(rule));
      }
    }
  }
  /* Arrival is relative to the unavailability, not to a
   * prior reading: a first-ever reading after unavailable
   * checks fires it too (M3's mechanism stands on this). */
  if (arrivedAfterUnavailable) {
    for (const rule of monitor.changeRules) {
      if (rule.kind === "reading-arrives") firedRules.push(ruleStatementOf(rule));
    }
  }
  /* The new reading becomes the last reading in all
   * cases where a reading exists (§3.4). */
  monitor.lastReading = reading;
  if (firedRules.length) {
    const placeName = monitor.subject.kind === "weather-reading" ? monitor.subject.placeName : "the place";
    const firing: MonitorFiring = {
      monitorId: monitor.id,
      registrar: monitor.registrar,
      kind: "change",
      rule: firedRules.join("; "),
      ...(before ? { before: before.summary } : {}),
      after: reading.summary,
      demand:
        `monitor '${monitor.id}' (registrar: ${monitor.registrar}) fires: ${firedRules.join("; ")} — ` +
        `the last reading was: ${before?.summary ?? (arrivedAfterUnavailable ? "none — the source was unavailable at the last check" : "none")}; the new reading is: ${reading.summary}. ` +
        `The Unit raises the telling: that the weather at ${placeName} changed be told to the ` +
        "visitor, priced by the Planner as its own act — the demand carries both readings so the " +
        "telling, if priced, is grounded in them (§7.1). The Unit does not speak (§2.3).",
      atISO: nowISO,
    };
    firings.push(firing);
    const detail = `the rule fired (${firedRules.join("; ")}): ${reading.summary}`;
    monitor.history.push({ atISO: nowISO, turnCount: session.turnCount, outcome: "change", detail });
    return { outcome: { monitorId: monitor.id, outcome: "change", detail }, firings };
  }
  const outcomeState: MonitorCheckOutcome["outcome"] = before ? "no-change" : "not-comparable";
  const detail = before
    ? `no change under the rule: ${reading.summary} — as the last reading stood; recorded, raising nothing (§5)`
    : `first check: the baseline reading stands recorded — ${reading.summary}; a first reading has nothing to differ from (§3.4)`;
  monitor.history.push({ atISO: nowISO, turnCount: session.turnCount, outcome: outcomeState, detail });
  return { outcome: { monitorId: monitor.id, outcome: outcomeState, detail }, firings };
}

/* ---------------- the what's-there check (§3.4, §7.3) ---------------- */

/** What one what's-there consultation returned to the
 *  check: a set (banked by the wired layer into the
 *  geography register, before this comparison runs — an
 *  EMPTY set is a reading: the source answered), or the
 *  source's unavailable state (§3.4). */
export type WhatsThereCheckResult =
  | { kind: "reading"; entries: WhatsThereEntry[]; fetchedAt: string }
  | { kind: "unavailable"; reason: string };

function whatsThereTerm(monitor: MonitorRecord, entries: WhatsThereEntry[]): MonitorReading {
  const placeName = monitor.subject.kind === "whats-there" ? monitor.subject.placeName : "the place";
  const categoryKey = monitor.subject.kind === "whats-there" ? monitor.subject.categoryKey : "entries";
  if (!entries.length) {
    return {
      atISO: "",
      state: "entries:0",
      summary: `no ${categoryKey} entries near ${placeName} within the consulted radius — the source answered, and the set stands empty`,
    };
  }
  const names = entries.slice(0, 5).map((e) => e.name ?? "(unnamed)");
  const more = entries.length > 5 ? `, and ${entries.length - 5} more` : "";
  return {
    atISO: "",
    state: `entries:${entries.length}`,
    summary: `${entries.length} ${categoryKey} entries near ${placeName}: ${names.join(", ")}${more}`,
  };
}

/**
 * Record one what's-there check's comparison (§3.4,
 * §7.3): the mechanism's clauses are arrival and the
 * stated unavailability run — the same discipline as the
 * weather check's, in this source's words. A reading
 * arriving after unavailability fires the arrival clause;
 * where the monitor serves an expectation, the wired
 * layer offers the banked set to it through §4.4's seam
 * (monitoring-turn.ts) — the comparison here only records
 * that the arrival happened.
 */
export function recordWhatsThereCheck(
  session: Session,
  monitor: MonitorRecord,
  result: WhatsThereCheckResult,
  standing: TimeStanding | undefined,
): { outcome: MonitorCheckOutcome; firings: MonitorFiring[] } {
  const nowISO = standingInstantISO(standing) ?? new Date().toISOString();
  const before = monitor.lastReading;
  const firings: MonitorFiring[] = [];

  if (result.kind === "unavailable") {
    monitor.unavailableRun += 1;
    monitor.lastCheckAtISO = nowISO;
    monitor.declinedCheckRun = 0;
    let firedRule: ChangeRule | undefined;
    for (const rule of monitor.changeRules) {
      if (rule.kind === "unavailable-successive" && monitor.unavailableRun === rule.count) {
        firedRule = rule;
      }
    }
    if (firedRule) {
      const firing: MonitorFiring = {
        monitorId: monitor.id,
        registrar: monitor.registrar,
        kind: "change",
        rule: ruleStatementOf(firedRule),
        ...(before ? { before: before.summary } : {}),
        after: `the what's-there source unavailable (${result.reason})`,
        demand:
          `monitor '${monitor.id}' (registrar: ${monitor.registrar}) fires on its rule's own terms: ` +
          `${ruleStatementOf(firedRule)} — the latest: ${result.reason}. The last reading stands ` +
          `unchanged (${before ? before.summary : "no reading stands yet"}). The Unit raises the ` +
          "source's unavailability itself, because the rule named it; unavailability a rule does " +
          "not name raises nothing (§3.4, §8).",
        atISO: nowISO,
      };
      firings.push(firing);
      const detail =
        `the check found the what's-there source unavailable (${result.reason}) — the ` +
        `${monitor.unavailableRun}th successive unavailable check, reaching the rule's stated run: the rule fires on its own terms (§8)`;
      monitor.history.push({ atISO: nowISO, turnCount: session.turnCount, outcome: "change", detail });
      return { outcome: { monitorId: monitor.id, outcome: "change", detail }, firings };
    }
    const detail =
      `the check found the what's-there source unavailable (${result.reason}) — a stated state, ` +
      "not a reading: the last reading stands unchanged, the next check is registered as usual, " +
      `and nothing is raised (§3.4, §8). Successive unavailable checks: ${monitor.unavailableRun}.`;
    monitor.history.push({ atISO: nowISO, turnCount: session.turnCount, outcome: "unavailable", detail });
    return { outcome: { monitorId: monitor.id, outcome: "unavailable", detail }, firings };
  }

  const arrivedAfterUnavailable = monitor.unavailableRun > 0;
  monitor.unavailableRun = 0;
  monitor.declinedCheckRun = 0;
  monitor.lastCheckAtISO = nowISO;
  const reading = whatsThereTerm(monitor, result.entries);
  reading.atISO = result.fetchedAt;
  const firedRules: string[] = [];
  if (arrivedAfterUnavailable) {
    for (const rule of monitor.changeRules) {
      if (rule.kind === "reading-arrives") firedRules.push(ruleStatementOf(rule));
    }
  }
  monitor.lastReading = reading;
  if (firedRules.length) {
    const firing: MonitorFiring = {
      monitorId: monitor.id,
      registrar: monitor.registrar,
      kind: "change",
      rule: firedRules.join("; "),
      ...(before
        ? { before: before.summary }
        : { before: "no reading stood — the source was unavailable at the last check" }),
      after: reading.summary,
      demand:
        `monitor '${monitor.id}' (registrar: ${monitor.registrar}) fires: ${firedRules.join("; ")} — ` +
        `the new reading is: ${reading.summary}, banked in the geography register at ${result.fetchedAt}.` +
        (monitor.servesExpectationId
          ? ` The monitor serves expectation '${monitor.servesExpectationId}' as its mechanism: the ` +
            "banked set is offered to the expectation through §4.4's seam, and the two records " +
            "close together (§7.3)."
          : " The Unit raises the arrival for the Planner; it does not speak (§2.3)."),
      atISO: nowISO,
    };
    firings.push(firing);
    const detail = `the rule fired (${firedRules.join("; ")}): ${reading.summary}`;
    monitor.history.push({ atISO: nowISO, turnCount: session.turnCount, outcome: "change", detail });
    return { outcome: { monitorId: monitor.id, outcome: "change", detail }, firings };
  }
  const outcomeState: MonitorCheckOutcome["outcome"] = before ? "no-change" : "not-comparable";
  const detail = before
    ? `no change under the rule: ${reading.summary} — recorded, raising nothing (§5)`
    : `first check: the baseline set stands recorded — ${reading.summary} (§3.4)`;
  monitor.history.push({ atISO: nowISO, turnCount: session.turnCount, outcome: outcomeState, detail });
  return { outcome: { monitorId: monitor.id, outcome: outcomeState, detail }, firings };
}

/* ---------------- the expectation endings (§7.3) ---------------- */

/**
 * Close a monitor because its expectation ended (§7.3's
 * joint closing): the status names the mechanism's end
 * distinctly from expiry — the monitor's term was the
 * expectation's deadline, and the ending is the
 * expectation's, whichever way it went.
 */
export function closeMonitorForExpectation(
  session: Session,
  monitor: MonitorRecord,
  how: string,
  standing: TimeStanding | undefined,
): void {
  if (monitor.status !== "standing") return;
  closeMonitor(session, monitor, "closed-by-expectation", how, standing);
}

/**
 * The joint-closing pass (§7.3): a monitor serving an
 * expectation that has ended — satisfied by another
 * route, timed out at a sweep, cancelled — closes with
 * it, as closed-by-expectation, at the next wired turn.
 * Run BEFORE the expiry pass: where the expectation's own
 * ending is the cause, the record says so, not "expired"
 * — the monitor's expiry WAS the deadline, and the two
 * endings are the same event read from the two records.
 */
export function closeMonitorsForEndedExpectations(
  session: Session,
  standing: TimeStanding | undefined,
): MonitorRecord[] {
  const closed: MonitorRecord[] = [];
  for (const monitor of session.monitors) {
    if (monitor.status !== "standing" || !monitor.servesExpectationId) continue;
    const expectation = session.expectations.find((e) => e.id === monitor.servesExpectationId);
    if (!expectation || expectation.status === "open") continue;
    closeMonitor(
      session,
      monitor,
      "closed-by-expectation",
      `closed by its expectation: expectation '${expectation.id}' ended (${expectation.status}) — ` +
        `the monitor's term was the expectation's deadline (${expectation.deadlineISO}), and the ` +
        "two records close together (§7.3); the monitor's history stands complete behind the ending",
      standing,
    );
    closed.push(monitor);
  }
  return closed;
}

/* ---------------- reads ---------------- */

/** The monitors standing open — the register's own
 * enumeration, for the wired layer and the trace. */
export function monitorsOpen(session: Session): MonitorRecord[] {
  return session.monitors.filter((m) => m.status === "standing");
}
