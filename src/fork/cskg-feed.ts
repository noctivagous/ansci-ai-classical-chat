/**
 * cskg-feed.ts — the CSKG feeder interface for the fork (mapping only).
 *
 * STATUS, plainly: the interface and the relation mapping are built
 * and fixture-tested, and live ingestion is built beside it in
 * cskg-ingest.ts, which streams the installed CSKG extract
 * (data/raw/cskg/cskg.tsv.gz — a local install artifact, gitignored;
 * the classical loader in src/cskg/loader.ts reads the same files)
 * through mapTriple. Whether the data is present in a given tree is
 * a reported state (cskgDataStatus), never an assumption: on an
 * absent extract, ingestion reports "absent" and banks nothing.
 * Surviving links bank into the fork graph with provenance "cskg".
 *
 * Input shape follows the CSKG TSV conventions the loader reads
 * (src/cskg/loader.ts): subject/object are concept labels, relation
 * is a CSKG relation name, with or without the "/r/" prefix
 * ("/r/Causes" and "Causes" are the same input here).
 *
 * The mapping — how each CSKG relation type is treated by the fork:
 *  - Causes            → a causal link (ASSOCIATED_WITH-shaped) between
 *                        the two classified concepts.
 *  - UsedFor           → a function link.
 *  - AtLocation        → a location link.
 *  - HasSubevent,
 *    HasPrerequisite   → procedure-chain links, marked ordered: the
 *                        chain's order is the knowledge (banked
 *                        procedures are step chains, per "Bank what
 *                        works"), so these records carry ordered: true.
 *  - IsA               → classification EVIDENCE only, never a direct
 *                        assertion: the record is marked
 *                        asserted: false and kind
 *                        "classification-evidence". It feeds the same
 *                        climb-style anchoring the WordNet provider
 *                        uses; it does not by itself classify anything.
 *  - RelatedTo         → a weak association, kept ONLY when both ends
 *                        resolve to classifications; otherwise dropped.
 *  - anything else     → dropped, reason "unmapped-relation".
 *
 * Endpoint resolution: a concept resolves when the fork's curated
 * table (classify.ts) knows it, or when the WordNet climb
 * (wordnet-lex.ts) classifies it. A triple with an unresolvable end
 * drops with reason "unclassified-endpoint" — the fork banks only
 * what it can place in the net.
 */
import type { Element } from "./sentence";
import { lookupClassification } from "./classify";
import { climbClassification } from "./wordnet-lex";

export interface CskgTriple {
  subject: string;
  /** CSKG relation name, "/r/Causes" or "Causes". */
  relation: string;
  object: string;
}

export type CskgLinkKind =
  | "causal"
  | "function"
  | "location"
  | "subevent"
  | "prerequisite"
  | "classification-evidence"
  | "association";

/** A fork-graph-ready link record, as mapTriple emits it. */
export interface CskgLink {
  from: string;
  to: string;
  kind: CskgLinkKind;
  provenance: "cskg";
  /** Procedure-chain links (HasSubevent/HasPrerequisite) are ordered. */
  ordered?: boolean;
  /** IsA records are evidence, not assertions: false there, true else. */
  asserted: boolean;
  fromElement?: Element;
  toElement?: Element;
  /** How each end resolved: the curated table, or the WordNet climb. */
  resolution?: { from: "table" | "wordnet-climb"; to: "table" | "wordnet-climb" };
}

export type CskgMapResult =
  | { ok: true; link: CskgLink }
  | { ok: false; reason: "unclassified-endpoint" | "unmapped-relation"; detail: string };

const RELATION_KINDS: Record<string, { kind: CskgLinkKind; ordered?: boolean; asserted: boolean }> = {
  Causes: { kind: "causal", asserted: true },
  UsedFor: { kind: "function", asserted: true },
  AtLocation: { kind: "location", asserted: true },
  HasSubevent: { kind: "subevent", ordered: true, asserted: true },
  HasPrerequisite: { kind: "prerequisite", ordered: true, asserted: true },
  IsA: { kind: "classification-evidence", asserted: false },
  RelatedTo: { kind: "association", asserted: true },
};

/** Normalise a CSKG concept label: strip a /c/en/ node prefix if the
 *  triple carries node ids instead of labels, lowercase, underscores
 *  to spaces. */
export function normaliseConcept(raw: string): string {
  let s = raw.trim().toLowerCase();
  if (s.startsWith("/c/en/")) s = s.slice("/c/en/".length);
  return s.replace(/_/g, " ");
}

export function normaliseRelation(raw: string): string {
  const s = raw.trim();
  return s.startsWith("/r/") ? s.slice("/r/".length) : s;
}

interface Resolved {
  element: Element;
  via: "table" | "wordnet-climb";
}

function resolveConcept(concept: string): Resolved | undefined {
  const entry = lookupClassification(concept);
  if (entry) return { element: entry.element, via: "table" };
  const climb = climbClassification(concept);
  if (climb) return { element: climb.element, via: "wordnet-climb" };
  return undefined;
}

/**
 * Map one CSKG triple to a fork link record, or drop it with a named
 * reason. Both ends must resolve to classifications (curated table or
 * WordNet climb) for any link to survive — including RelatedTo, whose
 * weakness is not a licence to bank unplaceable concepts.
 */
export function mapTriple(t: CskgTriple): CskgMapResult {
  const relation = normaliseRelation(t.relation);
  const shape = RELATION_KINDS[relation];
  if (!shape) {
    return { ok: false, reason: "unmapped-relation", detail: `no fork treatment for CSKG relation '${t.relation}'` };
  }
  const from = normaliseConcept(t.subject);
  const to = normaliseConcept(t.object);
  const fromRes = resolveConcept(from);
  const toRes = resolveConcept(to);
  if (!fromRes || !toRes) {
    const missing = [!fromRes ? from : null, !toRes ? to : null].filter(Boolean).join(", ");
    return { ok: false, reason: "unclassified-endpoint", detail: `no classification (table or WordNet climb) for: ${missing}` };
  }
  return {
    ok: true,
    link: {
      from,
      to,
      kind: shape.kind,
      provenance: "cskg",
      ...(shape.ordered ? { ordered: true } : {}),
      asserted: shape.asserted,
      fromElement: fromRes.element,
      toElement: toRes.element,
      resolution: { from: fromRes.via, to: toRes.via },
    },
  };
}
