/**
 * expectation.ts — Expectation (Time programme T3,
 * 2026-11-20; design: docs/ansci/time-scheduling-design-note.md
 * §4, §5.1, §6 slice T3). A family of the Functions Unit
 * (functions/expectation), chartered JOINTLY with the lack
 * machinery (§4.3): the seat is a Function family's, but its
 * registrar and its account of record live with
 * ProblemSolving's records, and neither side of the charter
 * is complete without the other.
 *
 * The name does the work (§4.1): an expectation names what
 * would satisfy it. An expectation that cannot state its
 * satisfier is not registered; an expectation without a
 * deadline is not registered — open-ended waiting is how
 * registers fill with the dead.
 *
 * THE HAND-OFF (§4.3). The ProblemRecord remains the
 * account of the need; Expectation is a watch kept over
 * some of those accounts, not a rival ledger. Which lacks
 * may register an expectation is decided by one test:
 * could the world — including the interlocutor — deliver
 * the satisfier without the system itself changing?
 * lack-of-information: yes, the primary case. A stated
 * value owed by the interlocutor (a quantity, a name, a
 * place the matter is waiting on): yes, expected-from the
 * interlocutor. capability: NO — the world arriving does
 * not build a seat; the lack stands as the registry audit
 * leaves it. how-to-proceed: NO — it already closes priced
 * at its turn, and the instrument it waits on is internal.
 * Registering adds ONE reference — the expectation's id,
 * annotated on the problem record — and does not
 * un-decline the turn that opened the lack: the visitor is
 * still told, located-ly, what the system does not have.
 * What changes is the ending: the lack is carried openly
 * instead of dropped. When the expectation closes, it
 * files its closing evidence back into the problem
 * record's closing-evidence field; the problem record then
 * closes (satisfied) or stands with the timeout as its
 * evidence (timed out), by ProblemSolving's own rules.
 *
 * SATISFACTION IS ROUTING, NOT ADMISSION (§4.4). A
 * candidate satisfier faces exactly the gates any such
 * content faces; the expectation notices the candidate,
 * names the need it answers, and raises the
 * on-satisfaction demand. If the gates refuse the content,
 * the expectation is not satisfied — it stands, and the
 * refusal is recorded on its record as an event. Nothing
 * enters the system's knowledge because it was waited for.
 * A consultation's `{ status: "unavailable" }` is a stated
 * state, never a satisfaction.
 *
 * WHAT "STANDING" HONESTLY MEANS (§4.5). Exactly two
 * standings, both built here: re-check at turn openings
 * (the opening sweep re-checks open expectations against
 * what the intervening turns have banked and said —
 * between turns, nothing is watched), and driver-delivered
 * arrival (deliverArrival: a host driver may deliver an
 * arrival to an open expectation; the watching in that
 * standing is the driver's, the record says so, and
 * delivery is not admission — the arrival faces §4.4's
 * gates like any consultation result). Continuous watching
 * by the entity itself is not a standing this module
 * claims, at any point, in any wording.
 *
 * TIMEOUT IS INFORMATION (§4.6). Past its deadline
 * unsatisfied, an expectation raises its on-timeout demand
 * at the next opening sweep: what was waited for, from
 * whom, until when, and that it did not come. An
 * expectation never dies silently: satisfied, timed out,
 * or cancelled by its registering unit — each a recorded
 * end.
 */

import type { Session } from "./session";
import type { TimeStanding } from "./timekeeping";
import { standingInstantISO } from "./scheduling";
import { isoInstantToFixed } from "./timeline";

/** The deadline as a fixed date for its placement
 *  (§8.10): the whole-day fixed date of the deadline
 *  instant, through Calendar's conversion. */
function deadlineFixedOf(deadlineISO: string): number | undefined {
  const fixed = isoInstantToFixed(deadlineISO);
  return fixed === undefined ? undefined : Math.floor(fixed);
}
import { closeProblem, type ProblemRecord } from "./problem-records";
import { placeKeyOf, type WeatherBank, type WeatherReading } from "./weather-bank";

/* ---------------- the record (§4.2) ---------------- */

/** What would satisfy the expectation, stated checkably:
 *  a fact (a named relation over named subjects — T3's
 *  wired instance is a weather reading for a named place),
 *  a reply (the interlocutor's answer to a named open
 *  question), or an arrival (a result from a named
 *  source). */
export type Satisfier =
  | { kind: "fact"; fact: string; placeName?: string }
  | { kind: "reply"; question: string }
  | { kind: "arrival"; source: string; detail: string };

export interface ExpectationRecord {
  id: string;
  /** The account of the need this watch is kept over —
   *  the ProblemRecord's id. The join is a reference,
   *  auditable both ways: the problem record carries this
   *  expectation's id as its `expectationId` annotation. */
  problemId: string;
  satisfier: Satisfier;
  /** The satisfier stated in words, checkably — the
   *  statement timeouts and satisfactions cite. */
  satisfierStatement: string;
  /** The source the satisfier is expected from: a named
   *  external source, the register/bank a consultation
   *  would fill, or the interlocutor. */
  expectedFrom: string;
  /** The deadline, stated at registration in the turn's
   *  time standing's terms. (Its Calendar/Timeline home —
   *  §8.10 — is placed by C3; the instant stands here from
   *  T3.) */
  deadlineISO: string;
  deadlineStanding: string;
  /** The deadline's home (§8.10, placed by C3): its date
   *  on the grid (the Gregorian reckoning the deadline's
   *  ISO instant stands in, as a fixed date) and its
   *  sequence on the conversation's own Timeline. §4.6's
   *  timeout is evaluated against this placement, and
   *  the timeout evidence cites it. Absent where the
   *  registration's standing carried no instant to
   *  place. */
  placement?: { system: string; deadlineFixed: number; line: string };
  /** What satisfaction raises: the demand, and the problem
   *  record it answers. Stated at registration. */
  onSatisfaction: string;
  /** What the timeout raises. Stated at registration,
   *  like Scheduling's on-due — the firing is auditable
   *  against it. */
  onTimeout: string;
  registeredBy: string;
  registeredAtISO?: string;
  registeredAtStanding: string;
  /** session.turnCount at registration; the watch stands
   *  from the next sweep forward (§3.5.3's boundary, the
   *  trio's shared discipline). */
  registeredAtTurnCount: number;
  status: "open" | "satisfied" | "timed-out" | "cancelled";
  closedAtISO?: string;
  /** The closing evidence — also filed into the problem
   *  record (§4.3). */
  closedHow?: string;
  /** How satisfaction arrived, where it did (§4.5's two
   *  standings, named on the record). */
  satisfactionRoute?: string;
  /** Events on the record — a gates refusal is recorded
   *  here (§4.4), as is a late arrival past the deadline. */
  events: { atISO?: string; detail: string }[];
}

export interface ExpectationSpec {
  problemId: string;
  satisfier: Satisfier;
  satisfierStatement: string;
  expectedFrom: string;
  /** Required: an expectation without a deadline is not
   *  registered (§4.2). */
  deadlineISO: string;
  onSatisfaction: string;
  onTimeout: string;
  registeredBy: string;
}

export type ExpectationRegistration =
  | { ok: true; expectation: ExpectationRecord }
  | { ok: false; reason: string };

/* ---------------- the eligibility test (§4.3) ---------------- */

/** Could the world — including the interlocutor — deliver
 *  this need's satisfier without the system itself
 *  changing? The audit's verdicts for the excluded kinds
 *  are untouched by this test: it reads them, it does not
 *  re-price them. */
export function expectationEligibility(
  problem: ProblemRecord,
): { eligible: true } | { eligible: false; ground: string } {
  switch (problem.need) {
    case "lack-of-information":
      return { eligible: true };
    case "quantification":
      // A stated value owed by the interlocutor — the
      // record's bearer is the standing marker of whose
      // matter the value is.
      return problem.bearer === "user"
        ? { eligible: true }
        : {
            eligible: false,
            ground:
              "a quantification need is expectation-eligible only where the value is owed by the " +
              "interlocutor (§4.3); this record's bearer is not the interlocutor",
          };
    case "capability":
      return {
        eligible: false,
        ground:
          "a capability lack closes by the registry audit (held / seat-exists-unbuilt / no-seat), and " +
          "the world arriving does not build a seat — an expectation over it would wait for an event " +
          "that is not an arrival (§4.3); the lack stands located, as the audit leaves it",
      };
    case "how-to-proceed":
      return {
        eligible: false,
        ground:
          "a how-to-proceed lack already closes priced at its turn, and the instrument it waits on " +
          "is internal — nothing external satisfies it (§4.3)",
      };
  }
}

/* ---------------- registration (the hand-off) ---------------- */

export function registerExpectation(
  session: Session,
  spec: ExpectationSpec,
  standing: TimeStanding | undefined,
): ExpectationRegistration {
  const problem = session.problems.find((p) => p.id === spec.problemId);
  if (!problem) {
    return { ok: false, reason: `no problem record stands under the id '${spec.problemId}' — an expectation is a watch over an account of a need, and there is no account (§4.3)` };
  }
  if (problem.status === "closed") {
    return { ok: false, reason: `the problem record '${spec.problemId}' is already closed; a closed account carries no watch` };
  }
  const eligibility = expectationEligibility(problem);
  if (!eligibility.eligible) return { ok: false, reason: eligibility.ground };
  if (!spec.deadlineISO || Number.isNaN(Date.parse(spec.deadlineISO))) {
    return {
      ok: false,
      reason:
        "an expectation without a deadline is not registered (§4.2): open-ended waiting is how " +
        "registers fill with the dead",
    };
  }
  const standingWatch = session.expectations.find((e) => e.problemId === spec.problemId && e.status === "open");
  if (standingWatch) {
    return {
      ok: false,
      reason: `an open expectation ('${standingWatch.id}') already watches over '${spec.problemId}' — the problem record carries one reference (§4.3)`,
    };
  }
  session.expectationSeq += 1;
  const expectation: ExpectationRecord = {
    id: `expectation-${session.expectationSeq}`,
    problemId: spec.problemId,
    satisfier: spec.satisfier,
    satisfierStatement: spec.satisfierStatement,
    expectedFrom: spec.expectedFrom,
    deadlineISO: spec.deadlineISO,
    deadlineStanding: standing ? standing.detail : "no standing — no frame stands and no clock is wired",
    onSatisfaction: spec.onSatisfaction,
    onTimeout: spec.onTimeout,
    registeredBy: spec.registeredBy,
    registeredAtISO: standingInstantISO(standing),
    registeredAtStanding: standing ? standing.detail : "no standing — no frame stands and no clock is wired",
    registeredAtTurnCount: session.turnCount,
    status: "open",
    events: [],
    // The deadline's home (§8.10): placed on the grid and
    // on the conversation's line at registration, where
    // the deadline's instant can be placed at all.
    ...(deadlineFixedOf(spec.deadlineISO) !== undefined
      ? {
          placement: {
            system: "gregorian",
            deadlineFixed: deadlineFixedOf(spec.deadlineISO) as number,
            line: "the conversation's own timeline",
          },
        }
      : {}),
  };
  session.expectations.push(expectation);
  // The hand-off's one reference (§4.3): an annotation of
  // how the need is being carried, not a status the
  // record's existing lifecycle has to learn.
  problem.expectationId = expectation.id;
  return { ok: true, expectation };
}

/** Cancel by the registering unit only — the trio's
 *  shared registrar discipline (§4.6: cancelled by its
 *  registering unit is one of the recorded ends). The
 *  problem record keeps its annotation and stands as it
 *  stood; the cancellation is filed on the expectation's
 *  own record. */
export function cancelExpectation(
  session: Session,
  expectationId: string,
  byUnit: string,
  standing: TimeStanding | undefined,
): { ok: true; expectation: ExpectationRecord } | { ok: false; reason: string } {
  const expectation = session.expectations.find((e) => e.id === expectationId);
  if (!expectation) return { ok: false, reason: `no expectation stands under the id '${expectationId}'` };
  if (expectation.status !== "open") {
    return { ok: false, reason: `the expectation '${expectationId}' already ended (${expectation.status})` };
  }
  if (expectation.registeredBy !== byUnit) {
    return {
      ok: false,
      reason: `only the registering unit may cancel its own expectations: '${expectationId}' was registered by ${expectation.registeredBy}, not by ${byUnit}`,
    };
  }
  expectation.status = "cancelled";
  expectation.closedAtISO = standingInstantISO(standing);
  expectation.closedHow = `cancelled by its registering unit (${byUnit})`;
  return { ok: true, expectation };
}

/* ---------------- closing (the filings, §4.3) ---------------- */

function fileSatisfaction(session: Session, expectation: ExpectationRecord, evidence: string, route: string, standing: TimeStanding | undefined): void {
  expectation.status = "satisfied";
  expectation.closedAtISO = standingInstantISO(standing);
  expectation.closedHow = evidence;
  expectation.satisfactionRoute = route;
  // The filing (§4.3): the closing evidence lands in the
  // problem record's closing-evidence field, and the
  // problem record closes with it, by ProblemSolving's
  // own rules (closeProblem).
  closeProblem(session, expectation.problemId, evidence);
}

function timeoutEvidence(expectation: ExpectationRecord): string {
  const placementText = expectation.placement
    ? `; the deadline stood placed on the ${expectation.placement.system} grid (R.D. ` +
      `${expectation.placement.deadlineFixed}) on ${expectation.placement.line} (§8.10), and the ` +
      `timeout is evaluated against that placement`
    : "";
  return (
    `the expectation timed out (§4.6): ${expectation.satisfierStatement} was waited for from ` +
    `${expectation.expectedFrom} until ${expectation.deadlineISO}, and it did not come — what was ` +
    `waited for, from whom, until when, and that it did not come; the need reverts to a standing ` +
    `lack with this timeout as its evidence${placementText}`
  );
}

function fileTimeout(session: Session, expectation: ExpectationRecord, standing: TimeStanding | undefined): string {
  const evidence = timeoutEvidence(expectation);
  expectation.status = "timed-out";
  expectation.closedAtISO = standingInstantISO(standing);
  expectation.closedHow = evidence;
  // The filing (§4.3): the closing evidence lands in the
  // problem record's closing-evidence field, and the
  // record STANDS — the timeout leaves the need still
  // standing (§4.6), so the status is ProblemSolving's to
  // keep, not this module's to close.
  const problem = session.problems.find((p) => p.id === expectation.problemId);
  if (problem && problem.status !== "closed") problem.closingEvidence = evidence;
  return evidence;
}

/* ---------------- satisfaction offers (§4.4, §4.5) ---------------- */

export interface SatisfierOffer {
  /** The route the candidate arrived by — a consultation
   *  result, a driver-delivered arrival, or the
   *  interlocutor's statement. */
  route: "consultation" | "driver-arrival" | "interlocutor-statement";
  /** What arrived, in the offerer's terms. */
  detail: string;
  /** The gates' verdict, from the machinery that ran
   *  them: retrieved content banked with its SourceRecord,
   *  a statement checked under the premise discipline.
   *  The expectation does not re-run the gates; it records
   *  their verdict, and a refusal is an event on its
   *  record, never a satisfaction (§4.4). */
  gates: { passed: boolean; ground: string };
}

const ROUTE_NAMES: Record<SatisfierOffer["route"], string> = {
  consultation: "a consultation result, banked through the gates (§4.4)",
  "driver-arrival": "a driver-delivered arrival (§4.5: the watching was the driver's, and the record says so)",
  "interlocutor-statement": "the interlocutor's statement, attributed testimony under the standing rules (§4.4)",
};

/**
 * Offer a candidate satisfier to an open expectation
 * (§4.4). Satisfaction is routing, not admission: this
 * seam is where a candidate is NOTICED — the expectation
 * names the need it answers and, where the gates passed,
 * closes satisfied and raises its on-satisfaction demand
 * (returned as the outcome). Where the gates refused, the
 * refusal is recorded on the expectation's record and it
 * stands.
 */
export function offerSatisfier(
  session: Session,
  expectationId: string,
  offer: SatisfierOffer,
  standing: TimeStanding | undefined,
): { ok: true; demand: string } | { ok: false; reason: string } {
  const expectation = session.expectations.find((e) => e.id === expectationId);
  if (!expectation) return { ok: false, reason: `no expectation stands under the id '${expectationId}'` };
  if (expectation.status !== "open") {
    return { ok: false, reason: `the expectation '${expectationId}' already ended (${expectation.status}); the candidate is not routed to it` };
  }
  if (!offer.gates.passed) {
    expectation.events.push({
      atISO: standingInstantISO(standing),
      detail:
        `a candidate satisfier (${offer.detail}) was refused at the gates: ${offer.gates.ground} — ` +
        `the expectation is not satisfied and stands (§4.4)`,
    });
    return {
      ok: false,
      reason: `the gates refused the candidate (${offer.gates.ground}); the refusal is recorded on the expectation's record and it stands (§4.4)`,
    };
  }
  const evidence =
    `satisfied: ${expectation.satisfierStatement} arrived by ${ROUTE_NAMES[offer.route]} — ${offer.detail}; ` +
    `the gates passed it (${offer.gates.ground}), and the satisfaction is a routing event: nothing ` +
    `entered the system's knowledge because it was waited for (§4.4)`;
  fileSatisfaction(session, expectation, evidence, ROUTE_NAMES[offer.route], standing);
  return { ok: true, demand: expectation.onSatisfaction };
}

/** The driver contract's delivery, expectation side
 *  (§3.4, §4.5): a host driver may deliver an arrival to
 *  an open expectation. Delivery is not admission — the
 *  arrival faces §4.4's gates through the same seam as
 *  any candidate. No host driver is built by this slice;
 *  this is the entity-side contract it would stand under. */
export function deliverArrival(
  session: Session,
  expectationId: string,
  arrival: { source: string; detail: string; gates: { passed: boolean; ground: string } },
  standing: TimeStanding | undefined,
): { ok: true; demand: string } | { ok: false; reason: string } {
  return offerSatisfier(
    session,
    expectationId,
    { route: "driver-arrival", detail: `from ${arrival.source}: ${arrival.detail}`, gates: arrival.gates },
    standing,
  );
}

/* ---------------- the opening sweep (§3.5, §4.5, §4.6) ---------------- */

export interface ExpectationSweepOutcome {
  expectationId: string;
  outcome: "satisfied" | "timed-out" | "unpriceable";
  detail: string;
  /** The demand raised — on-satisfaction or on-timeout,
   *  stated at registration, carried verbatim. */
  demand?: string;
  route?: string;
}

export interface ExpectationSweepOptions {
  /** The banked-fact check: given an open expectation,
   *  return the evidence if what the intervening turns
   *  have banked already satisfies it. Supplied by the
   *  turn layer, which owns the banks; the weather-bank
   *  checker below is T3's wired instance. A checker must
   *  honour the deadline: a fact banked after it is a
   *  late arrival, not a satisfaction (the sweep's
   *  timeout verdict governs that case). */
  bankedFact?: (expectation: ExpectationRecord) => { evidence: string } | undefined;
}

/**
 * The expectation half of the opening sweep (§3.5.1):
 * expectations whose satisfaction the intervening turns
 * have already banked close as satisfied; expectations
 * past their deadline raise their timeouts. Between
 * turns, nothing is watched (§4.5). Outcomes ride the
 * turn's trace as annotations, beside the schedule
 * sweep's.
 */
export function sweepExpectations(
  session: Session,
  standing: TimeStanding | undefined,
  opts: ExpectationSweepOptions = {},
): ExpectationSweepOutcome[] {
  const outcomes: ExpectationSweepOutcome[] = [];
  const open = session.expectations.filter((e) => e.status === "open");
  if (!open.length) return outcomes;
  const nowISO = standingInstantISO(standing);
  for (const expectation of open) {
    if (expectation.registeredAtTurnCount > session.turnCount) continue;
    if (!nowISO) {
      outcomes.push({
        expectationId: expectation.id,
        outcome: "unpriceable",
        detail:
          `expectation '${expectation.id}' (${expectation.satisfierStatement}) cannot be priced at this ` +
          `sweep: no clock reading stands for this turn and the frame states no instant — nothing in ` +
          `the trio invents a time to proceed on (§5.3)`,
      });
      continue;
    }
    const banked = opts.bankedFact?.(expectation);
    if (banked) {
      const route = "re-check at an opening sweep (§4.5): the satisfier stood banked from an intervening turn";
      fileSatisfaction(session, expectation, banked.evidence, route, standing);
      outcomes.push({
        expectationId: expectation.id,
        outcome: "satisfied",
        detail:
          `expectation '${expectation.id}' closes satisfied: ${banked.evidence}; the on-satisfaction ` +
          `demand stated at registration is raised for the Planner`,
        demand: expectation.onSatisfaction,
        route,
      });
      continue;
    }
    if (Date.parse(nowISO) > Date.parse(expectation.deadlineISO)) {
      const evidence = fileTimeout(session, expectation, standing);
      outcomes.push({
        expectationId: expectation.id,
        outcome: "timed-out",
        detail:
          `expectation '${expectation.id}' raises its timeout: ${evidence}; the on-timeout demand ` +
          `stated at registration is raised for the Planner`,
        demand: expectation.onTimeout,
      });
    }
  }
  return outcomes;
}

/* ---------------- the weather satisfier (§5.1) ---------------- */

/** The banked-fact checker for weather-reading
 *  satisfiers, over a weather bank at a stated instant:
 *  a reading for the named place that is still FRESH at
 *  the sweep (§5.1 step 4: "a reading banked by an
 *  intervening turn inside its 30 minutes would satisfy
 *  without new consultation") and was banked no later
 *  than the deadline satisfies. A reading banked after
 *  the deadline is a late arrival — the sweep's timeout
 *  verdict governs, and this checker returns undefined
 *  for it. */
export function bankedWeatherReading(
  bank: WeatherBank,
  nowISO: string,
): (expectation: ExpectationRecord) => { evidence: string } | undefined {
  return (expectation) => {
    if (expectation.satisfier.kind !== "fact" || expectation.satisfier.fact !== "weather-reading") return undefined;
    const placeName = expectation.satisfier.placeName;
    if (!placeName) return undefined;
    const reading = bank.fresh(placeKeyOf(placeName), nowISO);
    if (!reading) return undefined;
    if (Date.parse(reading.fetchedAt) > Date.parse(expectation.deadlineISO)) return undefined;
    return {
      evidence:
        `satisfied by a banked weather reading for ${placeName}: fetched ${reading.fetchedAt} from ` +
        `${reading.source} (retrieved, ${reading.retrievedFrom}), ${reading.temperatureC}°C, ${reading.condition} — ` +
        `banked through the consultation gates with its provenance, as any reading is (§4.4)`,
    };
  };
}

/**
 * Notice a weather reading at its banking (§5.1's firing
 * step, §4.5's re-check standing): the weather wrapper
 * calls this after every banking it makes, and any open
 * expectation whose satisfier is that reading closes
 * satisfied, its evidence filed. A reading banked after
 * an expectation's deadline does not satisfy it — the
 * timeout the next sweep raises is the verdict, and the
 * late arrival is recorded on the expectation's record.
 */
export function noteWeatherReadingBanked(
  session: Session,
  reading: WeatherReading,
  standing: TimeStanding | undefined,
): ExpectationSweepOutcome[] {
  const outcomes: ExpectationSweepOutcome[] = [];
  for (const expectation of session.expectations) {
    if (expectation.status !== "open") continue;
    if (expectation.satisfier.kind !== "fact" || expectation.satisfier.fact !== "weather-reading") continue;
    if (!expectation.satisfier.placeName || placeKeyOf(expectation.satisfier.placeName) !== reading.placeKey) continue;
    if (Date.parse(reading.fetchedAt) > Date.parse(expectation.deadlineISO)) {
      expectation.events.push({
        atISO: standingInstantISO(standing),
        detail:
          `a weather reading for ${expectation.satisfier.placeName} was banked at ${reading.fetchedAt}, ` +
          `after this expectation's deadline (${expectation.deadlineISO}): a late arrival, not a ` +
          `satisfaction — the timeout stands as the verdict (§4.6)`,
      });
      continue;
    }
    const evidence =
      `satisfied by the re-consultation's banking: a weather reading for ${expectation.satisfier.placeName} ` +
      `was fetched ${reading.fetchedAt} from ${reading.source} (retrieved, ${reading.retrievedFrom}), ` +
      `${reading.temperatureC}°C, ${reading.condition} — banked through the consultation gates with its ` +
      `provenance, as any reading is (§4.4)`;
    const route = "re-check standing (§4.5): noticed at the re-consultation's banking, the firing §5.1 narrates";
    fileSatisfaction(session, expectation, evidence, route, standing);
    outcomes.push({
      expectationId: expectation.id,
      outcome: "satisfied",
      detail:
        `expectation '${expectation.id}' closes satisfied: ${evidence}; the on-satisfaction demand ` +
        `stated at registration is raised for the Planner`,
      demand: expectation.onSatisfaction,
      route,
    });
  }
  return outcomes;
}
