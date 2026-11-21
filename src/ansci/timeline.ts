/**
 * timeline.ts — Timeline held; Allen's algebra ported
 * (Time programme C3, 2026-11-20; design:
 * docs/ansci/time-scheduling-design-note.md §8.7–§8.11,
 * slice §8.12-C3).
 *
 * The LINE to Calendar's grid (§8.2's split): a Timeline
 * is a held object — an ordered set of entries, each with
 * an extent (a point, or an interval) and the extent's
 * standing, under an owner whose kind fixes where the
 * object lives and how its entries enter (§8.7). Relations
 * between entries are Allen's interval algebra, adopted
 * as a port (James F. Allen, "Maintaining Knowledge about
 * Temporal Intervals", CACM 26(11), 1983): the thirteen
 * basic relations, their converse structure, and the
 * composition table. The thirteen are computed from their
 * endpoint definitions; the composition table is
 * MATERIALISED AS DATA by enumerating endpoint orderings
 * of three intervals and reading off the resulting
 * relations — the table the enumeration produces, checked
 * in tests against the paper's own worked example (A
 * during B, B precedes C ⇒ A precedes C) and the
 * algebra's converse symmetry. The table was not
 * transcribed from a printed rendering, where a copying
 * error would be silent; the enumeration cannot produce
 * a wrong entry without the endpoint definitions
 * themselves being wrong, and those are nine comparisons.
 *
 * Borders (§8.8), kept: no fourteenth relation is
 * invented — an uncertain placement states a SET of
 * basics, which is itself a relation in the algebra; no
 * metric reasoning inside the algebra (how long an
 * overlap lasts is §8.9's read-off); a computed relation
 * is a computation, cited as one, inheriting the weaker
 * of the two extents' standings — never testimony.
 */
import type { Session } from "./session";
import { defaultCalendarRegister, fixedFromGregorian, gregorianDate } from "./calendar";
import { triggerInstantISO } from "./scheduling";

/* ------------------------------------------------------------------ */
/* Allen's interval algebra (§8.8)                                      */
/* ------------------------------------------------------------------ */

export type AllenRelation =
  | "precedes"
  | "meets"
  | "overlaps"
  | "starts"
  | "during"
  | "finishes"
  | "equals"
  | "finished-by"
  | "contains"
  | "started-by"
  | "overlapped-by"
  | "met-by"
  | "preceded-by";

/** The thirteen, in Allen's canonical order. */
export const ALLEN_RELATIONS: AllenRelation[] = [
  "precedes",
  "meets",
  "overlaps",
  "starts",
  "during",
  "finishes",
  "equals",
  "finished-by",
  "contains",
  "started-by",
  "overlapped-by",
  "met-by",
  "preceded-by",
];

const CONVERSES: Record<AllenRelation, AllenRelation> = {
  precedes: "preceded-by",
  meets: "met-by",
  overlaps: "overlapped-by",
  starts: "started-by",
  during: "contains",
  finishes: "finished-by",
  equals: "equals",
  "finished-by": "finishes",
  contains: "during",
  "started-by": "starts",
  "overlapped-by": "overlaps",
  "met-by": "meets",
  "preceded-by": "precedes",
};

export function converseRelation(relation: AllenRelation): AllenRelation {
  return CONVERSES[relation];
}

/** An interval on a numeric axis. Proper intervals have
 *  start < end; a point has start === end and the
 *  endpoint comparisons below place it without special
 *  cases (a point inside an interval stands `during` it;
 *  at its start, `meets`-ward — the comparisons are the
 *  definitions, read literally). */
export interface TemporalInterval {
  start: number;
  end: number;
}

/** The basic relation of a to b, from the endpoint
 *  definitions — the whole of the port's judgement, in
 *  nine comparisons. */
export function relationBetween(a: TemporalInterval, b: TemporalInterval): AllenRelation {
  if (a.end < b.start) return "precedes";
  if (a.end === b.start) return "meets";
  if (a.start > b.end) return "preceded-by";
  if (a.start === b.end) return "met-by";
  // The interiors now intersect or the endpoints coincide.
  if (a.start === b.start && a.end === b.end) return "equals";
  if (a.start === b.start && a.end < b.end) return "starts";
  if (a.start === b.start && a.end > b.end) return "started-by";
  if (a.end === b.end && a.start > b.start) return "finishes";
  if (a.end === b.end && a.start < b.start) return "finished-by";
  if (a.start > b.start && a.end < b.end) return "during";
  if (a.start < b.start && a.end > b.end) return "contains";
  if (a.start < b.start && a.end < b.end) return "overlaps";
  return "overlapped-by";
}

/** Composition by construction: enumerate every endpoint
 *  ordering of three proper intervals over six ranks,
 *  keep those standing in r1 (A to B) and r2 (B to C),
 *  and collect the relations A can stand in to C. The
 *  result is a SET of basics — a general relation in the
 *  algebra's own terms (§8.8). */
export function composeRelations(r1: AllenRelation, r2: AllenRelation): AllenRelation[] {
  const found = new Set<AllenRelation>();
  const ranks = [0, 1, 2, 3, 4, 5];
  for (const a1 of ranks)
    for (const a2 of ranks)
      for (const b1 of ranks)
        for (const b2 of ranks)
          for (const c1 of ranks)
            for (const c2 of ranks) {
              if (!(a1 < a2 && b1 < b2 && c1 < c2)) continue;
              const a = { start: a1, end: a2 };
              const b = { start: b1, end: b2 };
              const c = { start: c1, end: c2 };
              if (relationBetween(a, b) !== r1) continue;
              if (relationBetween(b, c) !== r2) continue;
              found.add(relationBetween(a, c));
            }
  return ALLEN_RELATIONS.filter((r) => found.has(r));
}

/** The composition table as data (§8.8): materialised
 *  once, at load, by the enumeration above. */
export const ALLEN_COMPOSITION_TABLE: Record<AllenRelation, Record<AllenRelation, AllenRelation[]>> =
  (() => {
    const table = {} as Record<AllenRelation, Record<AllenRelation, AllenRelation[]>>;
    for (const r1 of ALLEN_RELATIONS) {
      table[r1] = {} as Record<AllenRelation, AllenRelation[]>;
      for (const r2 of ALLEN_RELATIONS) table[r1][r2] = composeRelations(r1, r2);
    }
    return table;
  })();

/* ------------------------------------------------------------------ */
/* Timeline objects (§8.7)                                              */
/* ------------------------------------------------------------------ */

/** An entry's extent: a point or an interval on the
 *  timeline's axis, with its standing stated the way
 *  §2.2 requires of any stamp — and the system the date
 *  was stated in, where it was stated in one. */
export interface TimelineExtent {
  kind: "point" | "interval";
  /** Axis values: fixed dates (R.D., with fractions for
   *  moments) on a date-axis timeline; turn numbers on
   *  the conversation's own timeline. */
  fixedStart: number;
  fixedEnd: number;
  system?: string;
  standing: string;
}

export interface TimelineEntry {
  id: string;
  name: string;
  extent?: TimelineExtent;
  /** Why the entry stands unplaced, when it does (§8.7:
   *  named as unplaced in the owner's records, never
   *  silently dated). */
  unplacedReason?: string;
}

export interface Timeline {
  id: string;
  ownerKind: "conversation" | "plan" | "knowledge";
  ownerDetail: string;
  /** What the axis values are ("fixed dates (R.D.)",
   *  "the session's turn order"). */
  axis: string;
  entries: TimelineEntry[];
}

/** An ISO instant to the fixed axis: the Gregorian fixed
 *  date of its date part plus the day's fraction, through
 *  Calendar's own conversion. (The instant's reckoning is
 *  the Gregorian one the programme's ISO stamps stand
 *  in.) */
export function isoInstantToFixed(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?/.exec(iso);
  if (!match) return undefined;
  const [, y, m, d, hh, mm, ss, ms] = match;
  const day = fixedFromGregorian(gregorianDate(Number(y), Number(m), Number(d)));
  const fraction =
    ((Number(hh ?? 0) * 3600 + Number(mm ?? 0) * 60 + Number(ss ?? 0)) * 1000 + Number(ms ?? 0)) / 86400000;
  return day + fraction;
}

/** The conversation's own timeline (§8.7): the session's
 *  turns and their events, from the material that already
 *  stands in the session's records — problems opened,
 *  expectations registered, schedule items registered and
 *  taken up. Its axis is the session's turn order; its
 *  owner is the session. Nothing is invented: a record
 *  that stands is an entry, and there are no others. */
export function conversationTimeline(session: Session): Timeline {
  const entries: TimelineEntry[] = [];
  for (const problem of session.problems) {
    entries.push({
      id: `problem-${problem.id}`,
      name: `problem opened (${problem.need}, borne by the ${problem.bearer}): ${problem.subject.slice(0, 60)}`,
      extent: {
        kind: "point",
        fixedStart: problem.openedTurn,
        fixedEnd: problem.openedTurn,
        standing: `turn ${problem.openedTurn} of the session, from the problem record's own stamp; status stands ${problem.status}`,
      },
    });
  }
  for (const expectation of session.expectations) {
    entries.push({
      id: `expectation-${expectation.id}`,
      name: `expectation registered: ${expectation.satisfierStatement.slice(0, 60)}`,
      extent: {
        kind: "point",
        fixedStart: expectation.registeredAtTurnCount,
        fixedEnd: expectation.registeredAtTurnCount,
        standing: `turn ${expectation.registeredAtTurnCount} of the session, from the expectation record's own stamp; status stands ${expectation.status}`,
      },
    });
  }
  for (const item of session.schedule) {
    entries.push({
      id: `schedule-${item.id}-registered`,
      name: `schedule item registered: ${item.owed.slice(0, 60)}`,
      extent: {
        kind: "point",
        fixedStart: item.registeredAtTurnCount,
        fixedEnd: item.registeredAtTurnCount,
        standing: `turn ${item.registeredAtTurnCount} of the session, from the item's own stamp; registered by ${item.registeredBy}`,
      },
    });
    if (item.takenUpAtTurnCount !== undefined) {
      entries.push({
        id: `schedule-${item.id}-taken-up`,
        name: `schedule item taken up: ${item.owed.slice(0, 60)}`,
        extent: {
          kind: "point",
          fixedStart: item.takenUpAtTurnCount,
          fixedEnd: item.takenUpAtTurnCount,
          standing: `turn ${item.takenUpAtTurnCount} of the session, from the item's own stamp`,
        },
      });
    }
  }
  entries.sort((a, b) => (a.extent?.fixedStart ?? 0) - (b.extent?.fixedStart ?? 0));
  return {
    id: "conversation",
    ownerKind: "conversation",
    ownerDetail: "the session itself; its material is the session's own records, held as one object (§8.7)",
    axis: "the session's turn order (turn numbers, not dates)",
    entries,
  };
}

/** A plan's timeline (§8.7): the schedule register viewed
 *  as a line. Nothing new is held — the entries are the
 *  commitments themselves, their extents the interval
 *  from registration to the due instant, on the fixed
 *  axis. An item whose standing carries no instant stands
 *  unplaced, named as such. */
export function planTimeline(session: Session): Timeline {
  const entries: TimelineEntry[] = [];
  for (const item of session.schedule) {
    const start = isoInstantToFixed(item.registeredAtISO);
    // The extent runs to the due instant: the stamped one
    // where the item has fallen due, the trigger's own
    // instant where it still stands.
    const end = isoInstantToFixed(item.dueAtISO ?? triggerInstantISO(item.trigger));
    if (start === undefined || end === undefined) {
      entries.push({
        id: `schedule-${item.id}`,
        name: `schedule item: ${item.owed.slice(0, 60)}`,
        unplacedReason:
          "the item's standing carries no instant the line can place (its registration or due stamp " +
          "is not an ISO instant) — the entry stands unplaced, and relations and durations over it " +
          "decline at the placement (§8.11)",
      });
      continue;
    }
    entries.push({
      id: `schedule-${item.id}`,
      name: `schedule item: ${item.owed.slice(0, 60)}`,
      extent: {
        kind: "interval",
        fixedStart: start,
        fixedEnd: end,
        standing: `registered ${item.registeredAtISO} under the standing "${item.registeredAtStanding}"; due ${item.dueAtISO ?? triggerInstantISO(item.trigger)}; status stands ${item.status}`,
      },
    });
  }
  entries.sort((a, b) => (a.extent?.fixedStart ?? 0) - (b.extent?.fixedStart ?? 0));
  return {
    id: "plan",
    ownerKind: "plan",
    ownerDetail: "the schedule register, viewed as a line; the owner of each entry is its registering matter (§8.7)",
    axis: "fixed dates (R.D., with day fractions for moments)",
    entries,
  };
}

/** A knowledge timeline (§8.7): entries are knowledge and
 *  enter through the testimony gates, banked with
 *  provenance in their standings. This builder holds what
 *  an intake gives it and invents nothing; the present
 *  record, stated honestly, is that NO chronology is
 *  banked today — no production path calls this builder,
 *  and populating one is an intake the note does not
 *  perform (§8.7, §7 question 8). */
export function knowledgeTimeline(id: string, ownerDetail: string, entries: TimelineEntry[]): Timeline {
  return { id, ownerKind: "knowledge", ownerDetail, axis: "fixed dates (R.D., with day fractions for moments)", entries };
}

/* ------------------------------------------------------------------ */
/* Relations and durations over a line (§8.8, §8.9, §8.11)              */
/* ------------------------------------------------------------------ */

export type RelationResult =
  | {
      status: "related";
      relation: AllenRelation;
      derivation: { kind: "derived"; detail: string; inputs: string[] };
    }
  | { status: "unplaceable-entry"; entry: string; detail: string }
  | { status: "relation-across-unconverted-systems"; detail: string }
  | { status: "no-such-entry"; detail: string };

function entryById(timeline: Timeline, id: string): TimelineEntry | undefined {
  return timeline.entries.find((e) => e.id === id);
}

function unplaceableDetail(timeline: Timeline, entry: TimelineEntry): string {
  return (
    `the entry '${entry.id}' (${entry.name}) stands unplaced on the '${timeline.id}' line: ` +
    `${entry.unplacedReason ?? "its extent cannot be stated in a held system or a standing reading"} — ` +
    `relations and durations over it decline at the placement, not at the event (§8.11)`
  );
}

function unplaceableDecline(timeline: Timeline, entry: TimelineEntry): RelationResult {
  return { status: "unplaceable-entry", entry: entry.id, detail: unplaceableDetail(timeline, entry) };
}

/** The relation between two entries of a line (§8.8):
 *  computed over their extents, cited as a computation,
 *  inheriting the weaker of the two standings. */
export function relateEntries(timeline: Timeline, aId: string, bId: string): RelationResult {
  const a = entryById(timeline, aId);
  const b = entryById(timeline, bId);
  if (!a) return { status: "no-such-entry", detail: `no entry '${aId}' stands on the '${timeline.id}' line` };
  if (!b) return { status: "no-such-entry", detail: `no entry '${bId}' stands on the '${timeline.id}' line` };
  if (!a.extent) return unplaceableDecline(timeline, a);
  if (!b.extent) return unplaceableDecline(timeline, b);
  const sysA = a.extent.system;
  const sysB = b.extent.system;
  if (sysA && sysB && sysA !== sysB) {
    const heldA = defaultCalendarRegister.systemById(sysA);
    const heldB = defaultCalendarRegister.systemById(sysB);
    if (!heldA || !heldB) {
      return {
        status: "relation-across-unconverted-systems",
        detail:
          `the entries stand in different systems ('${sysA}', '${sysB}') with no conversion held ` +
          `between them: the relation is not computed by silently sharing a grid (§8.11)`,
      };
    }
  }
  const relation = relationBetween(
    { start: a.extent.fixedStart, end: a.extent.fixedEnd },
    { start: b.extent.fixedStart, end: b.extent.fixedEnd },
  );
  return {
    status: "related",
    relation,
    derivation: {
      kind: "derived",
      detail:
        `'${a.id}' stands ${relation} '${b.id}' on the '${timeline.id}' line — computed over their ` +
        `extents by Allen's algebra (§8.8); a computation, not testimony, inheriting the weaker of ` +
        `the two extents' standings`,
      inputs: [
        `the extent of '${a.id}': ${a.extent.standing}`,
        `the extent of '${b.id}': ${b.extent.standing}`,
        `the axis: ${timeline.axis}`,
      ],
    },
  };
}

export type DurationResult =
  | { status: "read-off"; days: number; derivation: { kind: "derived"; detail: string; inputs: string[] } }
  | { status: "unplaceable-entry"; entry: string; detail: string }
  | { status: "duration-without-both-endpoints"; detail: string }
  | { status: "no-such-entry"; detail: string };

/** A duration read off the line (§8.9): the difference of
 *  the two extents' starts on the line's axis — on a
 *  date-axis line, Calendar's grid arithmetic over the
 *  endpoints, through a conversion where the endpoints
 *  stand in different systems (and the derivation says
 *  so). One endpoint standing alone is a date, not a
 *  duration: declined, not estimated. */
export function durationBetweenEntries(timeline: Timeline, aId: string, bId: string): DurationResult {
  const a = entryById(timeline, aId);
  const b = entryById(timeline, bId);
  if (!a || !b) {
    return {
      status: "duration-without-both-endpoints",
      detail:
        `a duration read off the '${timeline.id}' line needs two placed extents (§8.9); ` +
        `${!a ? `'${aId}' does not stand on the line` : `'${bId}' does not stand on the line`} — one ` +
        `standing alone is a date, not a duration, and the read-off declines at the missing endpoint (§8.11)`,
    };
  }
  if (!a.extent) return { status: "unplaceable-entry", entry: a.id, detail: unplaceableDetail(timeline, a) };
  if (!b.extent) return { status: "unplaceable-entry", entry: b.id, detail: unplaceableDetail(timeline, b) };
  const days = b.extent.fixedStart - a.extent.fixedStart;
  const acrossSystems =
    a.extent.system && b.extent.system && a.extent.system !== b.extent.system
      ? ` The endpoints stand in different systems ('${a.extent.system}', '${b.extent.system}'); the difference is taken through the fixed-date conversion (§8.5), and this derivation says so.`
      : "";
  return {
    status: "read-off",
    days,
    derivation: {
      kind: "derived",
      detail:
        `${days} on the '${timeline.id}' line's axis (${timeline.axis}), read off the two extents' ` +
        `starts — Calendar's grid arithmetic over Timeline's endpoints (§8.9), the quantity then ` +
        `Quantification's to state.${acrossSystems}`,
      inputs: [`the extent of '${a.id}': ${a.extent.standing}`, `the extent of '${b.id}': ${b.extent.standing}`],
    },
  };
}
