/**
 * scheduling.ts — Scheduling (Time programme T2, 2026-11-20;
 * design: docs/ansci/time-scheduling-design-note.md §3, §5.2,
 * §5.3, §6 slice T2). A family of the Functions Unit
 * (functions/scheduling): commitments held as records.
 *
 * A scheduled item is a record in a session-scoped register
 * (the register pattern of session.problems). Scheduling
 * holds the statement of what is owed; it does not interpret
 * it, does not execute it, does not author a reply, and does
 * not originate a claim (§3.2). When an item falls due, the
 * opening sweep raises the demand its record states; the
 * Planner prices the demand against the standing situation
 * and either executes it through whatever machinery the
 * action names or declines it located-ly, and the item's
 * record closes with the outcome as its closing evidence.
 * Registration is NOT authorisation (§3.1): an item's
 * presence in the register records that a unit committed to
 * ask — pricing happens at due time, never at registration.
 *
 * THE WAKING LIMIT, AS DESIGNED (§3.4): the entity is
 * turn-based; nothing runs between turns. Due items are
 * evaluated at turn boundaries — an item whose time passes
 * mid-silence is fired at the next turn's opening sweep, and
 * its record says when it fell due and when it was taken up.
 * The driver contract's entity side stands here as pure
 * queries (whatIsDue / whatIsOpen): a host driver may ask
 * those and may deliver a clock reading (which enters as a
 * consultation under Timekeeping, §2); no host driver is
 * built by this slice, and a driver may never execute a
 * scheduled action, admit testimony, author a reply, or
 * cancel or amend a registration.
 *
 * TRIGGERS (§3.1): a time, or a time and a condition — never
 * a bare condition (a bare condition is an Expectation's
 * satisfaction, §4, or nothing). A condition is stated in
 * terms a NAMED unit can evaluate; Scheduling records the
 * condition and its evaluator's name and asks the evaluator
 * the sweep supplies — it never interprets condition text
 * itself.
 */

import type { Session } from "./session";
import type { TimeStanding } from "./timekeeping";
import {
  addMonths,
  defaultCalendarRegister,
  fixedFromGregorian,
  fixedFromJulian,
  gregorianDate,
  gregorianFromFixed,
  julianDate,
  julianFromFixed,
  lastDayOfGregorianMonth,
  lastDayOfJulianMonth,
} from "./calendar";
import { chineseFromFixed, chineseNewMoonOnOrAfter, fixedFromChinese } from "./calendar-chinese";
import { isoInstantToFixed, relationBetween, type AllenRelation } from "./timeline";

/** A turn's best time standing, as Timekeeping states it
 *  (timekeeping.ts's turnTimeStanding): a clock reading's
 *  standing where a clock is wired and answers, else the
 *  frame's — or undefined, where neither stands. Scheduling
 *  reads the standing's instant and its own statement of
 *  itself; it never makes one up. */

/* ---------------- the record (§3.1) ---------------- */

export type ScheduledTrigger =
  | { kind: "at"; instantISO: string }
  /** "in twenty minutes": a duration from a stated anchor —
   *  the anchor is part of the trigger, stated at
   *  registration (ordinarily the registration instant on
   *  its standing), so the due instant is computable from
   *  the record alone. A spec may omit the anchor, asking
   *  registration to state it from the standing; a
   *  REGISTERED item always carries one (registerSchedule
   *  refuses when no standing can state it). */
  | { kind: "after"; durationMs: number; anchorISO?: string }
  /** At the time, if the condition then holds. The
   *  condition is stated in terms `evaluator` — a named
   *  unit — can evaluate; the sweep asks that evaluator. */
  | { kind: "at-and-condition"; instantISO: string; condition: string; evaluator: string };

export interface ScheduledItem {
  id: string;
  /** The action or plan owed, stated in the registering
   *  unit's terms. Scheduling holds the statement; it does
   *  not interpret it. */
  owed: string;
  trigger: ScheduledTrigger;
  /** The unit that registered the item. Only the
   *  registering unit may cancel or amend it. */
  registeredBy: string;
  /** The stamp of registration: the instant, when the
   *  standing supplied one, and the standing it rode on,
   *  named either way (§2.2: a stamp names its standing). */
  registeredAtISO?: string;
  registeredAtStanding: string;
  /** session.turnCount at registration. An item stands
   *  from the next sweep forward (§3.5.3): the sweep at a
   *  turn's opening sees only items stamped in earlier
   *  turns, so a registration made and due within one turn
   *  fires no earlier than the next turn's sweep. */
  registeredAtTurnCount: number;
  /** The registration's own shelf life (§3.1): past it, an
   *  un-fired item lapses instead of standing forever.
   *  Every registration carries one; "no-expiry" is a
   *  stated value and carries its reason — never an
   *  omitted field. */
  registrationExpiresISO: string | "no-expiry";
  noExpiryReason?: string;
  /** The demand the item will raise, stated at
   *  registration so the firing is auditable against it. */
  onDue: string;
  /** Calendar placement (§8.10): the grid system the
   *  trigger's date stands in, the dates the grid gives,
   *  and — for a recurring item — the Repetition pattern it
   *  cites. The field stands in the record from T2; the
   *  Calendar slice (C3) makes it live. */
  calendarPlacement?: { system: string; datesISO: string[]; pattern?: string };
  /** Timeline placement (§8.10): the item's stated Allen
   *  relations to named events or items. Placement states
   *  where the item stands; it is not a second trigger. */
  timelinePlacement?: { relations: { relation: string; to: string }[] };
  /** A wired consumer the Planner may execute the demand
   *  through (T2 builds exactly one: the weather bank's
   *  scheduled re-consultation, §5.2). Absent, the demand
   *  rides the trace for the Planner alone. The Monitoring
   *  programme (M1, 2026-11-21) adds the second consumer on
   *  the same pattern: a monitor's next check, executed by
   *  the monitoring wrapper (monitoring-turn.ts) — a
   *  monitor's checks ride Scheduling's due items (§3.3 of
   *  the monitoring note), they do not keep a clock of
   *  their own. */
  consumer?:
    | { kind: "weather-reconsult"; placeName: string }
    | { kind: "monitor-check"; monitorId: string };
  status: "standing" | "due-raised" | "closed" | "lapsed" | "cancelled";
  /** When the item fell due (the trigger's instant) and
   *  the turn whose sweep took it up — the record says
   *  both, per §3.4's limit stated honestly. */
  dueAtISO?: string;
  takenUpAtTurnCount?: number;
  /** Closing registrations are stamped (§3.5.3): when the
   *  item ended, and how — fired-and-done,
   *  fired-and-declined (the decline is the closing
   *  evidence, §3.2), lapsed, or cancelled by its
   *  registrar. */
  closedAtISO?: string;
  closedHow?: string;
  /** Events on the item's record after registration —
   *  a fired re-check whose source was unavailable is
   *  recorded here (§5.3): a stated state on the record,
   *  never dressed as satisfaction or as absence. */
  events: { atISO?: string; detail: string }[];
  amendments: { atISO?: string; by: string; detail: string }[];
}

export interface ScheduleSpec {
  owed: string;
  trigger: ScheduledTrigger;
  registeredBy: string;
  /** An ISO instant, or "no-expiry" — which requires
   *  `noExpiryReason`. */
  registrationExpiresISO: string | "no-expiry";
  noExpiryReason?: string;
  onDue: string;
  consumer?: ScheduledItem["consumer"];
  calendarPlacement?: ScheduledItem["calendarPlacement"];
  timelinePlacement?: ScheduledItem["timelinePlacement"];
}

export type RegistrationResult =
  | { ok: true; item: ScheduledItem }
  | { ok: false; reason: string };

/** The instant a trigger falls due, from the record alone. */
export function triggerInstantISO(trigger: ScheduledTrigger): string {
  switch (trigger.kind) {
    case "at":
      return trigger.instantISO;
    case "at-and-condition":
      return trigger.instantISO;
    case "after":
      // A registered item always carries its anchor (see
      // registerSchedule); an unanchored spec's instant is
      // not computable, and NaN comparisons read as
      // not-due rather than inventing an anchor here.
      return trigger.anchorISO
        ? new Date(Date.parse(trigger.anchorISO) + trigger.durationMs).toISOString()
        : "";
  }
}

/** The instant "now" stands at on a turn's time standing:
 *  the standing's own instant — a clock reading's always;
 *  a frame standing's only where the frame's supplied date
 *  carried a year (Timekeeping states the instant only to
 *  what the frame holds, and borrows nothing). Undefined
 *  when the standing supplies no instant at all — the
 *  sweep then cannot price any item, which is §5.3's
 *  first decline, not an error. */
export function standingInstantISO(standing: TimeStanding | undefined): string | undefined {
  return standing?.instantISO;
}

function standingName(standing: TimeStanding | undefined): string {
  // The standing's own statement of itself names it —
  // Timekeeping's detail says which standing it is, on
  // what evidence, and (for a fallen-back frame standing)
  // that the wired clock failed. Absent a standing, the
  // record says so.
  return standing ? standing.detail : "no standing — no frame stands and no clock is wired";
}

/**
 * Register an item (§3.1). Registration is not
 * authorisation: this records that a unit committed to
 * ask. Refusals are stated, never silent: a "no-expiry"
 * registration without its reason, and an "after" trigger
 * whose anchor no standing can state, are refused at the
 * register, with the ground named.
 */
export function registerSchedule(
  session: Session,
  spec: ScheduleSpec,
  standing: TimeStanding | undefined,
): RegistrationResult {
  if (spec.registrationExpiresISO === "no-expiry" && !spec.noExpiryReason) {
    return {
      ok: false,
      reason:
        "a registration with no expiry must state its reason (§3.1: 'no expiry' is a stated value " +
        "with a reason, never an omitted field); nothing was registered",
    };
  }
  let trigger = spec.trigger;
  if (trigger.kind === "after" && !trigger.anchorISO) {
    const anchor = standingInstantISO(standing);
    if (!anchor) {
      return {
        ok: false,
        reason:
          "an 'after' trigger needs its anchor stated at registration, and the turn's standing " +
          "supplies no instant to anchor it to (no frame instant, no clock reading); nothing was registered",
      };
    }
    trigger = { ...trigger, anchorISO: anchor };
  }
  session.scheduleSeq += 1;
  const item: ScheduledItem = {
    id: `sched-${session.scheduleSeq}`,
    owed: spec.owed,
    trigger,
    registeredBy: spec.registeredBy,
    registeredAtISO: standingInstantISO(standing),
    registeredAtStanding: standingName(standing),
    registeredAtTurnCount: session.turnCount,
    registrationExpiresISO: spec.registrationExpiresISO,
    ...(spec.noExpiryReason ? { noExpiryReason: spec.noExpiryReason } : {}),
    onDue: spec.onDue,
    ...(spec.consumer ? { consumer: spec.consumer } : {}),
    ...(spec.calendarPlacement ? { calendarPlacement: spec.calendarPlacement } : {}),
    ...(spec.timelinePlacement ? { timelinePlacement: spec.timelinePlacement } : {}),
    status: "standing",
    events: [],
    amendments: [],
  };
  session.schedule.push(item);
  return { ok: true, item };
}

/* ---------------- registrar-only cancel / amend (§3.1) ---------------- */

export type RegistrarResult = { ok: true; item: ScheduledItem } | { ok: false; reason: string };

function registrarCheck(session: Session, itemId: string, byUnit: string): RegistrarResult {
  const item = session.schedule.find((i) => i.id === itemId);
  if (!item) return { ok: false, reason: `no scheduled item stands under the id '${itemId}'` };
  if (item.status === "closed" || item.status === "lapsed" || item.status === "cancelled") {
    return { ok: false, reason: `the item '${itemId}' already ended (${item.status}); it cannot be changed` };
  }
  if (item.registeredBy !== byUnit) {
    return {
      ok: false,
      reason:
        `only the registering unit may cancel or amend its own items (§3.1): '${itemId}' was ` +
        `registered by ${item.registeredBy}, not by ${byUnit}`,
    };
  }
  return { ok: true, item };
}

export function cancelSchedule(
  session: Session,
  itemId: string,
  byUnit: string,
  standing: TimeStanding | undefined,
): RegistrarResult {
  const check = registrarCheck(session, itemId, byUnit);
  if (!check.ok) return check;
  check.item.status = "cancelled";
  check.item.closedAtISO = standingInstantISO(standing);
  check.item.closedHow = `cancelled by its registrar (${byUnit})`;
  return check;
}

export function amendSchedule(
  session: Session,
  itemId: string,
  byUnit: string,
  patch: { owed?: string; trigger?: ScheduledTrigger; onDue?: string },
  standing: TimeStanding | undefined,
): RegistrarResult {
  const check = registrarCheck(session, itemId, byUnit);
  if (!check.ok) return check;
  const item = check.item;
  const changed: string[] = [];
  if (patch.owed !== undefined) {
    item.owed = patch.owed;
    changed.push("owed");
  }
  if (patch.trigger !== undefined) {
    item.trigger = patch.trigger;
    changed.push("trigger");
  }
  if (patch.onDue !== undefined) {
    item.onDue = patch.onDue;
    changed.push("on-due");
  }
  item.amendments.push({
    atISO: standingInstantISO(standing),
    by: byUnit,
    detail: `amended by its registrar: ${changed.join(", ") || "no field changed"}`,
  });
  return check;
}

/**
 * The Planner's located decline of a due item (§3.2,
 * §5.3): the decline names the item, its registering unit,
 * and the ground it failed on, and the item's record closes
 * with that decline as its closing evidence. Only a
 * due-raised item can be declined — a standing item has
 * raised no demand to price.
 */
export function declineDueItem(
  session: Session,
  itemId: string,
  ground: string,
  standing: TimeStanding | undefined,
): RegistrarResult {
  const item = session.schedule.find((i) => i.id === itemId);
  if (!item) return { ok: false, reason: `no scheduled item stands under the id '${itemId}'` };
  if (item.status !== "due-raised") {
    return {
      ok: false,
      reason: `the item '${itemId}' is ${item.status}, not due-raised; no demand stands to be declined`,
    };
  }
  item.status = "closed";
  item.closedAtISO = standingInstantISO(standing);
  item.closedHow =
    `fired and declined by the Planner: the demand '${item.onDue}' (item '${item.id}', registered by ` +
    `${item.registeredBy}) was declined on the ground that ${ground}`;
  return { ok: true, item };
}

/** Close a due item as fired-and-done, stamped — the
 *  record a wired consumer leaves when the Planner priced
 *  its demand and the execution completed. */
export function closeFiredItem(
  session: Session,
  itemId: string,
  how: string,
  standing: TimeStanding | undefined,
): RegistrarResult {
  const item = session.schedule.find((i) => i.id === itemId);
  if (!item) return { ok: false, reason: `no scheduled item stands under the id '${itemId}'` };
  if (item.status !== "due-raised") {
    return { ok: false, reason: `the item '${itemId}' is ${item.status}, not due-raised; it cannot close as fired` };
  }
  item.status = "closed";
  item.closedAtISO = standingInstantISO(standing);
  item.closedHow = how;
  return { ok: true, item };
}

/* ---------------- the opening sweep (§3.5) ---------------- */

export interface SweepOutcome {
  itemId: string;
  outcome:
    | "due"
    | "lapsed"
    | "unpriceable"
    | "condition-unassessed"
    | "condition-unmet"
    | "reconsulted"
    | "reconsult-unavailable";
  detail: string;
  /** The demand raised, for a due outcome — stated at
   *  registration, carried verbatim (§3.1). */
  demand?: string;
  /** The Planner's pricing of the demand, recorded by
   *  whatever priced it (a wired consumer in T2) — the
   *  acceptance's "firing, pricing and re-bank in the
   *  trace" (§6, T2). */
  pricing?: string;
  /** The re-bank a fired re-consultation made, when it
   *  made one. */
  rebanked?: { placeName: string; fetchedAt: string };
}

export interface SweepOptions {
  /** The evaluator for time+condition triggers, asked
   *  with the item whose condition is in question.
   *  Returns true (holds), false (does not hold), or
   *  undefined (cannot assess). Absent, every condition
   *  is unassessed — Scheduling never interprets condition
   *  text itself. */
  conditionHolds?: (item: ScheduledItem) => boolean | undefined;
}

/**
 * The opening sweep (§3.5.1): due items raise their
 * demands; lapsed registrations close as lapsed. Runs at
 * a turn's opening, under the turn's best time standing,
 * before the new input is planned. Outcomes ride the
 * turn's trace as annotations — visible to the Planner,
 * never merged into the visitor's input. Items stamped in
 * the turn now opening (or later) are not seen: a
 * registration stands from the next sweep forward
 * (§3.5.3). Standing items that are neither due nor
 * lapsed raise nothing and are not annotated — the sweep
 * is silent about what has not changed.
 */
export function sweepSchedule(
  session: Session,
  standing: TimeStanding | undefined,
  opts: SweepOptions = {},
): SweepOutcome[] {
  const outcomes: SweepOutcome[] = [];
  const open = session.schedule.filter((i) => i.status === "standing" || i.status === "due-raised");
  if (!open.length) return outcomes;
  const nowISO = standingInstantISO(standing);
  for (const item of open) {
    if (item.registeredAtTurnCount > session.turnCount) continue; // stamped in a later turn than this sweep's — cannot stand yet
    if (item.status === "due-raised") {
      // Already raised and still open: the registration's
      // own expiry still governs it; past it, the item
      // closes lapsed with the firing on its record.
      if (
        nowISO &&
        item.registrationExpiresISO !== "no-expiry" &&
        Date.parse(nowISO) > Date.parse(item.registrationExpiresISO)
      ) {
        item.status = "lapsed";
        item.closedAtISO = nowISO;
        item.closedHow =
          `registration expired unsatisfied: the item fell due at ${item.dueAtISO ?? "an unrecorded instant"} ` +
          `and was taken up, but its demand was never satisfied before the registration's own shelf life ` +
          `passed (${item.registrationExpiresISO})`;
        outcomes.push({
          itemId: item.id,
          outcome: "lapsed",
          detail:
            `scheduled item '${item.id}' (${item.owed}), registered by ${item.registeredBy}, fell due at ` +
            `${item.dueAtISO} and its registration expired at ${item.registrationExpiresISO} with the ` +
            `demand unsatisfied; the item closes lapsed (§5.3)`,
        });
        continue;
      }
      // Still open and still owed: where a wired consumer
      // stands ready to execute the demand (a
      // re-consultation whose source was unavailable at
      // the last attempt — §5.3's "the wait continues"),
      // the demand is raised again at this sweep, so the
      // consumer retries while the registration stands.
      // A due item with no consumer is not re-annotated:
      // the Planner priced it at its raising, and nothing
      // has changed since.
      if (item.consumer) {
        outcomes.push({
          itemId: item.id,
          outcome: "due",
          demand: item.onDue,
          detail:
            `scheduled item '${item.id}' (${item.owed}), registered by ${item.registeredBy}, fell due at ` +
            `${item.dueAtISO} and its demand stands unsatisfied; it is raised again at this sweep for ` +
            `its wired consumer — the wait continues to the registration's expiry (§5.3)`,
        });
      }
      continue;
    }
    // status === "standing"
    if (!nowISO) {
      outcomes.push({
        itemId: item.id,
        outcome: "unpriceable",
        detail:
          `scheduled item '${item.id}' (${item.owed}), registered by ${item.registeredBy}, cannot be priced: ` +
          `no clock reading stands for this turn and the frame states no instant — nothing in the trio ` +
          `invents a time to proceed on (§5.3: the decline located at Timekeeping's missing reading)`,
      });
      continue;
    }
    const now = Date.parse(nowISO);
    const dueISO = triggerInstantISO(item.trigger);
    const due = Date.parse(dueISO);
    const expiry =
      item.registrationExpiresISO === "no-expiry" ? undefined : Date.parse(item.registrationExpiresISO);
    if (expiry !== undefined && now > expiry && due > expiry) {
      // The registration's own shelf life passed before
      // its trigger fired (§5.3).
      item.status = "lapsed";
      item.closedAtISO = nowISO;
      item.closedHow =
        `registration expired unsatisfied: the registration's own shelf life passed (${item.registrationExpiresISO}) ` +
        `before its trigger fired (${dueISO})`;
      outcomes.push({
        itemId: item.id,
        outcome: "lapsed",
        detail:
          `scheduled item '${item.id}' (${item.owed}), registered by ${item.registeredBy}, closes lapsed: its ` +
          `registration expired at ${item.registrationExpiresISO}, before its trigger (${dueISO}) fired — ` +
          `a commitment the system let die is accounted, not vanished (§5.3)`,
      });
      continue;
    }
    if (due > now) continue; // standing, not due, not lapsed: silence
    // The item falls due at this sweep.
    if (item.trigger.kind === "at-and-condition") {
      const holds = opts.conditionHolds?.(item);
      if (holds === undefined) {
        outcomes.push({
          itemId: item.id,
          outcome: "condition-unassessed",
          detail:
            `scheduled item '${item.id}' (${item.owed}) reached its time (${dueISO}) but its condition — ` +
            `"${item.trigger.condition}", stated in terms ${item.trigger.evaluator} can evaluate — was not ` +
            `assessed at this sweep; the item stands, its demand unraised`,
        });
        continue;
      }
      if (!holds) {
        outcomes.push({
          itemId: item.id,
          outcome: "condition-unmet",
          detail:
            `scheduled item '${item.id}' (${item.owed}) reached its time (${dueISO}) and its condition — ` +
            `"${item.trigger.condition}" — does not hold, as ${item.trigger.evaluator} evaluates it; the ` +
            `item stands, its demand unraised`,
        });
        continue;
      }
    }
    item.status = "due-raised";
    item.dueAtISO = dueISO;
    item.takenUpAtTurnCount = session.turnCount + 1;
    outcomes.push({
      itemId: item.id,
      outcome: "due",
      demand: item.onDue,
      detail:
        `scheduled item '${item.id}' (${item.owed}), registered by ${item.registeredBy}, fell due at ` +
        `${dueISO} and is taken up at this turn's opening sweep; the demand it raises is the one stated ` +
        `at registration, and the Planner prices it against the standing situation — registration was ` +
        `not authorisation (§3.1, §3.2)`,
    });
  }
  // Placement relations are re-computed at the sweep
  // (§8.10): a stated relation that stops holding is an
  // event on the item's record — not a trace annotation,
  // and not a silent edit.
  evaluateTimelinePlacements(session, standing);
  return outcomes;
}

/* ---------------- the driver contract's entity side (§3.4) ---------------- */

/** What is due — the items whose trigger time has passed
 *  under the standing supplied. A pure query: asking
 *  changes nothing (the sweep is what raises demands). */
export function whatIsDue(session: Session, standing: TimeStanding | undefined): ScheduledItem[] {
  const nowISO = standingInstantISO(standing);
  if (!nowISO) return [];
  const now = Date.parse(nowISO);
  return session.schedule.filter(
    (i) =>
      (i.status === "standing" || i.status === "due-raised") &&
      Date.parse(triggerInstantISO(i.trigger)) <= now,
  );
}

/** What is open — the scheduled items standing, with what
 *  would fire each. A pure query. */
export function whatIsOpen(session: Session): ScheduledItem[] {
  return session.schedule.filter((i) => i.status === "standing" || i.status === "due-raised");
}

/* ------------------------------------------------------------------ */
/* Placement (§8.10, C3): the fields live                                 */
/* ------------------------------------------------------------------ */

/** A recurrence pattern, as Form's Repetition record
 *  states it (period and phase) — cited by a placement,
 *  with the dates read from the grid. (Form itself is
 *  designed, not built; the pattern's statement here is
 *  Scheduling's, in Form's terms.) A monthly pattern
 *  states its short-month rule AT THE PLACEMENT: the
 *  rule is the placement's, never improvised at firing. */
export interface RecurrencePattern {
  kind: "monthly-on-day" | "every-days";
  /** For monthly-on-day: the day of the month the
   *  pattern lands on. */
  dayOfMonth?: number;
  /** For every-days: the period in days. */
  days?: number;
  /** For monthly-on-day: what a month lacking the day
   *  does — land on its last day, or skip the month. */
  shortMonthRule?: "last-day" | "skip";
}

export type PlacementResult =
  | { status: "placed"; dates: number[] }
  | { status: "unheld-system"; system: string; detail: string }
  | { status: "declined"; detail: string };

function placementUnheld(systemId: string): PlacementResult {
  return {
    status: "unheld-system",
    system: systemId,
    detail:
      `the calendar system '${systemId}' is not held: the systems register holds ` +
      `${defaultCalendarRegister.heldSystems().map((s) => s.id).join(", ")} — a placement naming an ` +
      `unheld system declines at the holding, and the machinery does not approximate the system ` +
      `from its name (§8.11)`,
  };
}

/** The dates a placement lands on (§8.10): the pattern
 *  from Repetition, the dates from the grid. Monthly is
 *  not every-30-days: a monthly pattern on the 31st lands
 *  31 January, February on the placement's stated rule,
 *  31 March; an every-30-days pattern from the same start
 *  lands 31 January, 2 March, 1 April — the placement,
 *  not the trigger's wording, is the record of which
 *  sequence was meant. On the lunisolar grid the same
 *  pattern lands on months of 29 and 30 days and meets
 *  leap months as the system's own sequence places them.
 *  Dates are fixed dates (R.D.). */
export function placementDates(
  systemId: string,
  pattern: RecurrencePattern | undefined,
  startFixed: number,
  count: number,
): PlacementResult {
  if (!defaultCalendarRegister.systemById(systemId)) return placementUnheld(systemId);
  if (!pattern) return { status: "placed", dates: [startFixed] };
  if (pattern.kind === "every-days") {
    const days = pattern.days;
    if (!days || days <= 0) {
      return { status: "declined", detail: "an every-days pattern states no positive period: the placement declines at the pattern" };
    }
    // A duration pattern: the same on every grid that
    // has days (§8.4). The grid named is the placement's
    // reckoning; the stepping is duration arithmetic.
    return { status: "placed", dates: Array.from({ length: count }, (_, k) => startFixed + k * days) };
  }
  // monthly-on-day
  const rule = pattern.shortMonthRule ?? "last-day";
  const dates: number[] = [];
  if (systemId === "gregorian" || systemId === "julian") {
    const start = systemId === "gregorian" ? gregorianFromFixed(startFixed) : julianFromFixed(startFixed);
    const day = pattern.dayOfMonth ?? start.day;
    for (let k = 0; dates.length < count && k < count * 2 + 2; k++) {
      const probe = addMonths(
        systemId === "gregorian" ? gregorianDate(start.year, start.month, 1) : julianDate(start.year, start.month, 1),
        k,
      );
      const last =
        systemId === "gregorian"
          ? lastDayOfGregorianMonth(probe.year, probe.month)
          : lastDayOfJulianMonth(probe.year, probe.month);
      const landed = day > last ? (rule === "skip" ? undefined : last) : day;
      if (landed === undefined) continue;
      dates.push(
        systemId === "gregorian"
          ? fixedFromGregorian(gregorianDate(probe.year, probe.month, landed))
          : fixedFromJulian(julianDate(probe.year, probe.month, landed)),
      );
    }
    return { status: "placed", dates };
  }
  if (systemId === "chinese") {
    const startDate = chineseFromFixed(startFixed);
    const day = pattern.dayOfMonth ?? startDate.day;
    let monthStart = fixedFromChinese({ ...startDate, day: 1 });
    for (let k = 0; dates.length < count && k < count * 2 + 2; k++) {
      const nextStart = chineseNewMoonOnOrAfter(monthStart + 1);
      const monthLength = nextStart - monthStart;
      if (day > monthLength) {
        if (rule !== "skip") dates.push(monthStart + monthLength - 1);
      } else {
        dates.push(monthStart + day - 1);
      }
      monthStart = nextStart;
    }
    return { status: "placed", dates };
  }
  return {
    status: "declined",
    detail: `the ${systemId} system is held but carries no months a monthly pattern can land on — the placement declines at the grid's structure (§8.11's discipline)`,
  };
}

/** Build a calendarPlacement field (§3.1's record, made
 *  live): the grid's dates computed at placement time,
 *  the pattern stated in the field's own text. The
 *  datesISO are the landed dates in ISO (Gregorian)
 *  form — the sweep-comparable reckoning; the pattern
 *  text states the grid they were landed on. */
export function buildCalendarPlacement(
  systemId: string,
  pattern: RecurrencePattern | undefined,
  startFixed: number,
  count: number,
): { status: "placed"; placement: NonNullable<ScheduledItem["calendarPlacement"]> } | Exclude<PlacementResult, { status: "placed" }> {
  const result = placementDates(systemId, pattern, startFixed, count);
  if (result.status !== "placed") return result;
  const datesISO = result.dates.map((fixed) => {
    const g = gregorianFromFixed(fixed);
    return `${g.year}-${String(g.month).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`;
  });
  const patternText = !pattern
    ? `one-shot: the trigger's date on the ${systemId} grid (§8.10)`
    : pattern.kind === "every-days"
      ? `every ${pattern.days} days from the start — a duration pattern, the same on every grid that has days (§8.4); placed on the ${systemId} grid (§8.10)`
      : `monthly on day ${pattern.dayOfMonth ?? ""} (short-month rule: ${pattern.shortMonthRule ?? "last-day"}) on the ${systemId} grid — the pattern as Form's Repetition record states it, the dates as this grid lands them (§8.10)`;
  return { status: "placed", placement: { system: systemId, datesISO, pattern: patternText } };
}

/** Placement relations, re-computed (§8.10): for each
 *  item carrying a timeline placement, the stated Allen
 *  relations are checked against the relations the line
 *  now computes from the items' extents (registration to
 *  due, on the fixed axis). A relation that stops
 *  holding is an EVENT on the item's record — recorded
 *  once per stated relation, never a silent edit, and
 *  never a trace annotation: the record is where
 *  placement history lives. */
export function evaluateTimelinePlacements(session: Session, standing: TimeStanding | undefined): void {
  const nowISO = standingInstantISO(standing);
  for (const item of session.schedule) {
    if (!item.timelinePlacement?.relations.length) continue;
    const myStart = isoInstantToFixed(item.registeredAtISO);
    const myEnd = isoInstantToFixed(item.dueAtISO ?? triggerInstantISO(item.trigger));
    if (myStart === undefined || myEnd === undefined) continue;
    for (const stated of item.timelinePlacement.relations) {
      const target = session.schedule.find((i) => i.id === stated.to);
      if (!target) continue;
      const tStart = isoInstantToFixed(target.registeredAtISO);
      const tEnd = isoInstantToFixed(target.dueAtISO ?? triggerInstantISO(target.trigger));
      if (tStart === undefined || tEnd === undefined) continue;
      const actual = relationBetween({ start: myStart, end: myEnd }, { start: tStart, end: tEnd }) as AllenRelation;
      if (actual === stated.relation) continue;
      const marker = `placement relation lapsed: stated ${stated.relation} to '${stated.to}'`;
      if (item.events.some((e) => e.detail.includes(marker))) continue;
      item.events.push({
        ...(nowISO ? { atISO: nowISO } : {}),
        detail:
          `${marker}; the line now computes ${actual} over the two items' extents — recorded as an ` +
          `event on the item's record, not a silent edit (§8.10)`,
      });
    }
  }
}
