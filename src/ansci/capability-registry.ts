/**
 * capability-registry.ts — the capability registry: the
 * system's inventory of what it can actually do, held as
 * data (owner's discussion, 2026-11-20; lack-machinery
 * slice, commissioned 2026-11-20 as one slice with the
 * capability need kind and the decline wiring).
 *
 * The settlement this module embodies: "capability" names
 * the INVENTORY question — what operations the system can
 * actually perform today — and the inventory is answered
 * from declared data, not inferred. Every entry below is
 * an operation verified to exist as callable code in this
 * codebase (module + function names as data, checked by
 * the module's tests against the sources they name). The
 * distributed holdings are represented here by entries
 * naming their holder unit (the map path of the unit that
 * holds the operation); the registry is the one list the
 * per-step gate audits against.
 *
 * What is NOT here, by the same settlement: placeholder
 * seats. A seat on the map at 0% — the Functions Unit's
 * families, the Geometry Unit, ErrorFailure — is an
 * intention, not a holding, and must never be registered
 * as one. Unbuilt seats a step might require are listed
 * separately (UNBUILT_CAPABILITY_SEATS) so the audit can
 * return the located verdict "a seat exists, unbuilt"
 * instead of a bare absence.
 *
 * This module is pure data plus pure functions over it:
 * no I/O, and it calls none of the operations it lists.
 * The audit consults ONLY this data.
 */

/* ------------------------------------------------------------------ */
/* The registry                                                         */
/* ------------------------------------------------------------------ */

export interface CapabilityEntry {
  /** The id a requirement names — the registry's key. */
  id: string;
  name: string;
  /** What the operation takes, in words. */
  takes: string;
  /** What it returns, in words. */
  returns: string;
  /** The map path of the unit that holds the operation. */
  heldBy: string;
  /** The real code, as data: module path (repo-relative)
   *  and the function / method names that perform it. */
  code: { module: string; functions: string[] };
}

export const CAPABILITY_REGISTRY: CapabilityEntry[] = [
  {
    id: "quantity-ledger",
    name: "Quantity ledger — how-many answering",
    takes: "a session and a holder + quantity kind (read); a stated quantity, a delta, or a transfer between holders (write)",
    returns: "the current quantity record for the holder and kind, and the ledger's applied outcome for writes",
    heldBy: "ontology-core/ontology-knowledge-unit/mathematics/quantification-unit",
    code: {
      module: "src/ansci/quantification.ts",
      functions: ["currentQuantity", "currentQuantities", "recordStated", "applyDelta", "applyTransfer"],
    },
  },
  {
    id: "lexicon-lookup",
    name: "Lexicon lookup — WordNet synset and sense access",
    takes: "a word surface or lemma, against the WordNet extract",
    returns: "the synset records the surface or lemma stands for, with the lookup's stemming record",
    heldBy: "knowledge/lexicon",
    code: {
      module: "src/wordnet.ts",
      functions: ["synsetsForSurface", "synsetsForLemma"],
    },
  },
  {
    id: "graph-path-walk",
    name: "Graph path walk — shortest path over the correspondence graph",
    takes: "two node ids, the edge types allowed, a confidence threshold and a depth bound",
    returns: "the shortest path between the nodes over the held graph, or null where no path stands",
    heldBy: "ontology-core/ontology-knowledge-unit/correspondence-graph",
    code: {
      module: "src/graph.ts",
      functions: ["Graph.findPath"],
    },
  },
  {
    id: "classification-lookup",
    name: "Classification lookup — the Classification's filed entries",
    takes: "a concept name, optionally an aspect",
    returns: "the classification entries filed for the concept (its kind, class and degree profile)",
    heldBy: "ontology-core/ontology-knowledge-unit/classification",
    code: {
      module: "src/ansci/classify.ts",
      functions: ["lookupClassification", "classificationsOf"],
    },
  },
  {
    id: "token-resolution",
    name: "Token resolution — spelling correction and segmentation (the SymSpell port)",
    takes: "the turn's token list and the lexicon's attestation",
    returns: "the resolved token list: attested words kept, unknown surfaces corrected or segmented where the port finds a reading, the rest flagged",
    heldBy: "lpu/parser/token",
    code: {
      module: "src/ansci/token-resolve.ts",
      functions: ["resolveTokenList"],
    },
  },
  {
    id: "sense-selection",
    name: "Sense selection — Lesk scoring over candidate senses",
    takes: "candidate senses with their glosses, and the turn's context words",
    returns: "the candidates scored by gloss/context overlap (Lesk, with the related-gloss and frequency-prior terms), best first",
    heldBy: "lpu/parser/sense",
    code: {
      module: "src/ansci/lesk.ts",
      functions: ["leskSenseScores", "leskCandidateScores"],
    },
  },
  {
    id: "clock-consultation",
    name: "Clock consultation — a clock source read as a retrieved fact (Timekeeping)",
    takes: "a named clock source (the host's clock, wired on the session), read on demand",
    returns: "a clock reading — the instant read, its timezone, its source record (retrieved-kind provenance) — or an unavailable verdict with its reason, never an invented time",
    heldBy: "functions/timekeeping",
    code: {
      module: "src/ansci/timekeeping.ts",
      functions: ["consultClock"],
    },
  },
  {
    id: "staleness-query",
    name: "Staleness query — fresh / stale / absent / no-shelf-life-stated, asked uniformly of the banks (Timekeeping)",
    takes: "a banked fact's reference (weather reading, geography register fact, Wikidata holding) and the moment asked at; or a horizon, over the weather bank",
    returns: "the verdict under the shelf life the fact's own bank states — fresh with its remaining time, stale with its overdue time, absent, or 'no shelf life stated' where the bank states none",
    heldBy: "functions/timekeeping",
    code: {
      module: "src/ansci/timekeeping.ts",
      functions: ["askStaleness", "staleByHorizon"],
    },
  },
  {
    id: "schedule-registration",
    name: "Schedule registration — commitments held as records, under the registrar-only rule (Scheduling)",
    takes: "a schedule spec: what is owed, a trigger (a time, or a time and a condition — never a bare condition), the registering unit, the registration's own shelf life ('no expiry' only as a stated value with a reason), and the demand to raise when due",
    returns: "the registered item, stamped at registration on a named time standing — or a stated refusal (a 'no expiry' without its reason; an 'after' trigger no standing can anchor). Registration is not authorisation: nothing is priced or approved here",
    heldBy: "functions/scheduling",
    code: {
      module: "src/ansci/scheduling.ts",
      functions: ["registerSchedule", "cancelSchedule", "amendSchedule"],
    },
  },
  {
    id: "schedule-sweep",
    name: "Schedule sweep — the turn-boundary opening sweep that raises due demands (Scheduling)",
    takes: "the session's schedule register and the turn's best time standing (frame or clock reading), at a turn's opening, before the new input is planned",
    returns: "the sweep outcomes for the trace: due items with the demands stated at registration (the Planner prices them; a decline closes the item with the decline as its evidence), lapsed registrations closed as lapsed, and unpriceable items where no standing supplies an instant. Scheduling itself never acts; the one wired consumer is the weather bank's scheduled re-consultation",
    heldBy: "functions/scheduling",
    code: {
      module: "src/ansci/scheduling.ts",
      functions: ["sweepSchedule", "whatIsDue", "whatIsOpen", "declineDueItem"],
    },
  },
  {
    id: "expectation-registration",
    name: "Expectation registration — a watch over a problem record, under the joint charter (Expectation)",
    takes: "a problem record's id and an expectation spec: the satisfier stated checkably (a fact, a reply, or an arrival), the source it is expected from, a deadline (required — an expectation without one is not registered), and the on-satisfaction and on-timeout demands",
    returns: "the registered expectation, with the problem record annotated with its id — or a stated refusal: the need fails §4.3's eligibility test (capability and how-to-proceed lacks are excluded, their audit verdicts untouched), the account is closed, a watch already stands over it, or no deadline was stated. Registration does not un-decline the turn that opened the lack",
    heldBy: "functions/expectation",
    code: {
      module: "src/ansci/expectation.ts",
      functions: ["registerExpectation", "expectationEligibility", "cancelExpectation"],
    },
  },
  {
    id: "expectation-sweep",
    name: "Expectation sweep and satisfaction offers — the waiting resource's firings (Expectation)",
    takes: "the session's expectation register and the turn's best time standing at a turn's opening, plus the turn layer's banked-fact check; or, at any delivery, a candidate satisfier with its gates' verdict",
    returns: "the sweep outcomes for the trace: satisfactions (closing evidence filed into the problem record, which closes with it) and timeouts (the evidence filed, the record standing — timeout is information). An offer the gates refuse is recorded on the expectation's record and satisfies nothing: satisfaction is routing, not admission",
    heldBy: "functions/expectation",
    code: {
      module: "src/ansci/expectation.ts",
      functions: ["sweepExpectations", "offerSatisfier", "deliverArrival", "noteWeatherReadingBanked"],
    },
  },
  {
    id: "calendar-conversion",
    name: "Calendar conversion — dates between held systems, as computation (Calendar)",
    takes: "a date in a held calendar system and the system to convert to (the systems register holds the Gregorian, ISO and Julian in C1)",
    returns: "the converted date with its derivation — the fixed-date count it passed through and the inputs it cites, under the derived provenance kind — or the unheld-system decline, located at the holding. A conversion is computation over the holdings, never testimony",
    heldBy: "functions/calendar",
    code: {
      module: "src/ansci/calendar.ts",
      functions: ["convertDate", "toFixed", "fromFixed"],
    },
  },
  {
    id: "calendar-grid-arithmetic",
    name: "Calendar grid arithmetic — the grid's own operations (Calendar)",
    takes: "a date in a held system and a grid question: whole months to add, the weekday asked, the days in a month",
    returns: "the grid's answer, under the operation's stated rules (month addition lands on the target month's last day where the day is lacking). Distinct from duration arithmetic: '+ 30 days' is Quantification's, grid-free; 'one month from now' is the grid's alone",
    heldBy: "functions/calendar",
    code: {
      module: "src/ansci/calendar.ts",
      functions: ["addMonths", "weekdayOf", "daysInMonth"],
    },
  },
  {
    id: "calendar-lunisolar-conversion",
    name: "Chinese lunisolar conversion — the astronomical holding's machinery (Calendar)",
    takes: "a fixed date, or a Chinese date (cycle, year, month, leap standing, day)",
    returns: "the date in the other reckoning, computed from new moons and solar terms at the Chinese standard-time meridian (the book's Part II astronomy, ported) — computation under the derived provenance kind when it rides convertDate, with the modern-system (post-1645) qualification attached to derivations where it bites. Chinese New Year for a Gregorian year is the same machinery read at the year's middle",
    heldBy: "functions/calendar",
    code: {
      module: "src/ansci/calendar-chinese.ts",
      functions: ["chineseFromFixed", "fixedFromChinese", "chineseNewYear"],
    },
  },
  {
    id: "calendar-solar-terms",
    name: "Solar terms — the lunisolar's named points, asked of the grid (Calendar)",
    takes: "a fixed date (for the terms it stands in) or a date asked forward (for the next major or minor term's moment)",
    returns: "the held term records — name, characters, longitude, kind, machinery index — for the last major (zhongqi) and minor (jieqi) terms begun, or the next term's moment in Beijing time. Term-level questions route here (§8.6); the frame's season convention is a different, connective-layer thing and does not cite this",
    heldBy: "functions/calendar",
    code: {
      module: "src/ansci/calendar-chinese.ts",
      functions: ["currentSolarTerms", "majorSolarTermOnOrAfter", "minorSolarTermOnOrAfter"],
    },
  },
  {
    id: "timeline-relations",
    name: "Timeline relations — Allen's algebra over a line's entries (Timeline)",
    takes: "two entries of a Timeline (the conversation's own, a plan's, or a knowledge timeline), each with its extent and standing",
    returns: "the basic Allen relation between them as a derivation — a computation over their extents, inheriting the weaker standing, never testimony — or the §8.11 declines at their locations: an unplaceable entry declines at the placement; entries in different systems with no conversion held decline as a relation across unconverted systems. Composition over the thirteen is the algebra's table, materialised as data",
    heldBy: "functions/timeline",
    code: {
      module: "src/ansci/timeline.ts",
      functions: ["relateEntries", "relationBetween", "composeRelations"],
    },
  },
  {
    id: "timeline-duration-read-off",
    name: "Duration read off a line — the difference of two extents (Timeline)",
    takes: "two entries of a Timeline",
    returns: "the difference of their extents' starts on the line's axis, as a derivation (through a conversion where the endpoints stand in different systems, and the derivation says so) — or the duration-without-both-endpoints decline: one endpoint standing alone is a date, not a duration",
    heldBy: "functions/timeline",
    code: {
      module: "src/ansci/timeline.ts",
      functions: ["durationBetweenEntries"],
    },
  },
  {
    id: "schedule-placement",
    name: "Schedule placement — a commitment on the grid and on the line (Scheduling, with Calendar and Timeline)",
    takes: "a calendar system, a recurrence pattern as Form's Repetition record states it (period and phase, with the short-month rule stated at the placement), and a start — or a registered item's stated timeline relations",
    returns: "the dates the pattern lands on, computed by the grid (monthly-on-the-31st and every-30-days give their different sequences — the placement, not the wording, is the record of which was meant), as the item's calendarPlacement field; and, at the sweep, placement relations re-computed, a lapsed relation recorded as an event on the item. Placement authorises nothing; the trigger still governs firing",
    heldBy: "functions/scheduling",
    code: {
      module: "src/ansci/scheduling.ts",
      functions: ["placementDates", "buildCalendarPlacement", "evaluateTimelinePlacements"],
    },
  },
  {
    id: "wikidata-lookup",
    name: "Wikidata lookup — the adapter's fetch",
    takes: "Wikidata item ids (fetch) or a search string (resolution), through the adapter's source interface",
    returns: "the lookup result: the entities' data, or an unavailable verdict with its reason — never a silent empty",
    heldBy: "intake/wikidata",
    code: {
      module: "src/ansci/wikidata-client.ts",
      functions: ["HttpWikidataSource.getEntities", "HttpWikidataSource.searchEntities"],
    },
  },
];

export function capabilityById(id: string): CapabilityEntry | undefined {
  return CAPABILITY_REGISTRY.find((c) => c.id === id);
}

/** Every registered holding, in registry order. */
export function allCapabilities(): CapabilityEntry[] {
  return CAPABILITY_REGISTRY;
}

/* ------------------------------------------------------------------ */
/* Unbuilt seats — named, so a lack can be located at one               */
/* ------------------------------------------------------------------ */

export interface UnbuiltCapabilitySeat {
  /** The requirement name a step would ask for. */
  requirement: string;
  /** The seat's map path. */
  seat: string;
  note: string;
}

/**
 * Placeholder seats whose operation a step might require.
 * These are NOT holdings: the seat stands on the map and
 * nothing is built in it. The list exists so the audit's
 * second verdict can locate the lack at the seat — which
 * names the next build by demand (design: Functions /
 * ProblemSolving engine additions, 2026-11-20).
 */
export const UNBUILT_CAPABILITY_SEATS: UnbuiltCapabilitySeat[] = [
  { requirement: "ordering-and-sorting", seat: "functions/ordering-and-sorting", note: "the Functions Unit's ordering and sorting family — a placeholder seat, no algorithm banked" },
  { requirement: "search", seat: "functions/search", note: "the Functions Unit's search family — a placeholder seat, nothing built (searches that exist today live inside their callers, not in this seat)" },
  { requirement: "editing", seat: "functions/editing", note: "the Functions Unit's editing family — a placeholder seat, no operation implemented" },
  { requirement: "external-query", seat: "functions/external-query", note: "the Functions Unit's web-query family — a placeholder seat; the one working instance-in-effect is the Wikidata adapter's fetch, registered above as wikidata-lookup" },
  { requirement: "file-system", seat: "functions/file-system", note: "the Functions Unit's file-system family — a placeholder seat, no operation implemented" },
  { requirement: "geometry", seat: "ontology-core/ontology-knowledge-unit/mathematics/geometry-unit", note: "the Geometry Unit — a placeholder seat inside Mathematics; no geometry need kind is registered until it is built (design ruling, 2026-11-18)" },
];

export function unbuiltSeatFor(requirement: string): UnbuiltCapabilitySeat | undefined {
  return UNBUILT_CAPABILITY_SEATS.find((s) => s.requirement === requirement);
}

/* ------------------------------------------------------------------ */
/* The audit (Part A of the lack-machinery slice)                       */
/* ------------------------------------------------------------------ */

export type CapabilityVerdict = "held" | "seat-exists-unbuilt" | "no-seat";

export interface CapabilityCheckStep {
  /** What was checked. */
  against: string;
  /** What the check found. */
  detail: string;
}

/**
 * The audit's typed result: the verdict, the holding or
 * seat it rests on where there is one, and the checked
 * list — what was checked, in order. The checked list is
 * part of the result, not a trace afterthought: a failure
 * account (ErrorFailure's material) is assembled from it.
 */
export interface CapabilityAudit {
  requirement: string;
  verdict: CapabilityVerdict;
  /** The registry entry, when the verdict is "held". */
  entry?: CapabilityEntry;
  /** The unbuilt seat, when the verdict is "seat-exists-unbuilt". */
  seat?: UnbuiltCapabilitySeat;
  checked: CapabilityCheckStep[];
}

/**
 * Audit a capability requirement against the registry.
 * Pure: consults only the data above, in a fixed order —
 * the registry of holdings first, then the unbuilt seats.
 *
 *  - "held" — an entry under this id stands in the
 *    registry: the operation exists and is callable.
 *  - "seat-exists-unbuilt" — no holding, but a seat for
 *    the requirement stands on the map: the lack is
 *    located at that seat.
 *  - "no-seat" — neither: the lack is unlocated, a
 *    new-seat question for the owner, not a silent failure.
 */
export function auditCapability(requirement: string): CapabilityAudit {
  const checked: CapabilityCheckStep[] = [];
  const entry = capabilityById(requirement);
  checked.push({
    against: "capability registry",
    detail: entry
      ? `entry '${entry.id}' stands — held by ${entry.heldBy} (${entry.code.module}: ${entry.code.functions.join(", ")})`
      : `no entry under '${requirement}' among the ${CAPABILITY_REGISTRY.length} registered holdings (${CAPABILITY_REGISTRY.map((c) => c.id).join(", ")})`,
  });
  if (entry) return { requirement, verdict: "held", entry, checked };

  const seat = unbuiltSeatFor(requirement);
  checked.push({
    against: "unbuilt seats",
    detail: seat
      ? `a seat stands at ${seat.seat} — ${seat.note}`
      : `no seat for '${requirement}' among the ${UNBUILT_CAPABILITY_SEATS.length} named unbuilt seats (${UNBUILT_CAPABILITY_SEATS.map((s) => s.requirement).join(", ")})`,
  });
  if (seat) return { requirement, verdict: "seat-exists-unbuilt", seat, checked };
  return { requirement, verdict: "no-seat", checked };
}
