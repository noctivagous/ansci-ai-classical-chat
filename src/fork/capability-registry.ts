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
      module: "src/fork/quantification.ts",
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
      module: "src/fork/classify.ts",
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
      module: "src/fork/token-resolve.ts",
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
      module: "src/fork/lesk.ts",
      functions: ["leskSenseScores", "leskCandidateScores"],
    },
  },
  {
    id: "wikidata-lookup",
    name: "Wikidata lookup — the adapter's fetch",
    takes: "Wikidata item ids (fetch) or a search string (resolution), through the adapter's source interface",
    returns: "the lookup result: the entities' data, or an unavailable verdict with its reason — never a silent empty",
    heldBy: "intake/wikidata",
    code: {
      module: "src/fork/wikidata-client.ts",
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
