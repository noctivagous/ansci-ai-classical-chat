/**
 * wikidata.ts — the Wikidata adapter core (slice W1; design §3.6,
 * plan docs/fork/wikidata-adapter-plan.md).
 *
 * Three stages, matching the repo's adapter pattern (a pristine
 * source, an adapter, plain data records out — cf. cskg-feed.ts):
 *
 *  1. parseWikidataEntities: wbgetentities-shaped JSON → plain item
 *     records. Wikidata's native statement model stops here; only
 *     what the translator emits crosses into association form (§3.4).
 *  2. translateWikidataItems: items → association records + node
 *     records + a skip-log. The property→association knowledge is
 *     entirely the data table in wikidata-mapping.ts; this code is
 *     general — it assumes nothing about entity types (a state, a
 *     planet and a glossary would all take the same path).
 *  3. proposeWikidataJoin: item → concept/synset bridge PROPOSALS
 *     from the English label and the enwiki sitelink title, matched
 *     against WordNet lemmas (src/wordnet.ts) and fork concept names
 *     (classify.ts). Proposals only: multiple candidates or a
 *     label/sitelink mismatch flag a conflict on the proposal, and
 *     nothing is ever auto-joined (autoJoined is false by type —
 *     the field exists so a record can never be misread as a join).
 *     Runtime banking of accepted proposals is slice W2.
 *
 * Provenance (§§3.5, 4.3): every association is retrieved-kind with
 * a SourceRecord { dataset: "wikidata", baseVersion: <fetch date>,
 * uri: <subject item QID> } and the fixed structural confidence 0.9.
 * Every KB node record carries neverPropagationAnchor: true — KB
 * nodes never become propagation anchors on their own (§3.6, §6.1);
 * W2's banking must preserve the flag.
 */
import { getDefaultExtract, synsetsForLemma, type SynsetRecord } from "../wordnet";
import { classificationsOf } from "./classify";
import {
  mappingForProperty,
  WIKIDATA_PROPERTY_LABELS,
  type WikidataAssociationType,
} from "./wikidata-mapping";

/* ---------------- provenance (§4.3) ---------------- */

export interface WikidataSourceRecord {
  dataset: "wikidata";
  /** The fetch date (ISO yyyy-mm-dd) the batch was retrieved at. */
  baseVersion: string;
  /** The subject item's QID. */
  uri: string;
  /** The endpoint the batch came through (or "fixture"). */
  retrievedFrom: string;
}

export const WIKIDATA_STRUCTURAL_CONFIDENCE = 0.9;

/* ---------------- stage 1: parsing ---------------- */

export type WikidataClaimValue =
  | { kind: "item"; qid: string }
  | { kind: "coordinates"; lat: number; lon: number }
  | { kind: "other"; datatype: string };

export interface WikidataClaim {
  property: string;
  value: WikidataClaimValue;
}

export interface WikidataItem {
  qid: string;
  /** English label, when the response carries one. */
  label?: string;
  /** enwiki sitelink title, when present. */
  sitelinkTitle?: string;
  claims: WikidataClaim[];
}

interface RawSnak {
  snaktype?: string;
  datatype?: string;
  datavalue?: { type?: string; value?: unknown };
}
interface RawEntity {
  id?: string;
  labels?: Record<string, { value?: string }>;
  sitelinks?: Record<string, { title?: string }>;
  claims?: Record<string, { mainsnak?: RawSnak }[]>;
}

function parseClaimValue(snak: RawSnak): WikidataClaimValue | undefined {
  if (snak.snaktype !== "value" || !snak.datavalue) return undefined;
  const v = snak.datavalue.value;
  if (snak.datavalue.type === "wikibase-entityid") {
    const id = (v as { id?: string })?.id;
    return id ? { kind: "item", qid: id } : undefined;
  }
  if (snak.datavalue.type === "globecoordinate") {
    const c = v as { latitude?: number; longitude?: number };
    if (typeof c?.latitude === "number" && typeof c?.longitude === "number") {
      return { kind: "coordinates", lat: c.latitude, lon: c.longitude };
    }
    return undefined;
  }
  return { kind: "other", datatype: snak.datatype ?? snak.datavalue.type ?? "unknown" };
}

/** Parse a wbgetentities-shaped response into plain item records. */
export function parseWikidataEntities(data: unknown): WikidataItem[] {
  const entities = (data as { entities?: Record<string, RawEntity> })?.entities ?? {};
  const items: WikidataItem[] = [];
  for (const [qid, e] of Object.entries(entities)) {
    const claims: WikidataClaim[] = [];
    for (const [property, statements] of Object.entries(e.claims ?? {})) {
      for (const st of statements) {
        if (!st.mainsnak) continue;
        const value = parseClaimValue(st.mainsnak);
        if (value) claims.push({ property, value });
      }
    }
    items.push({
      qid: e.id ?? qid,
      label: e.labels?.en?.value,
      sitelinkTitle: e.sitelinks?.enwiki?.title,
      claims,
    });
  }
  return items;
}

/** Parse a wbsearchentities-shaped response into (qid, label) hits. */
export function parseWikidataSearch(data: unknown): { qid: string; label?: string }[] {
  const search = (data as { search?: { id?: string; label?: string }[] })?.search ?? [];
  return search.filter((s) => s.id).map((s) => ({ qid: s.id as string, label: s.label }));
}

/* ---------------- stage 2: translation ---------------- */

export interface WikidataNodeRecord {
  qid: string;
  name: string;
  properties: { lat?: number; lon?: number };
  /** §3.6/§6.1: KB nodes are never propagation anchors. */
  neverPropagationAnchor: true;
  provenanceKind: "retrieved";
  source: WikidataSourceRecord;
}

export interface WikidataAssociation {
  from: string;
  fromQid: string;
  to: string;
  toQid: string;
  type: WikidataAssociationType;
  /** The Wikidata property this association was translated from. */
  property: string;
  provenanceKind: "retrieved";
  confidence: number;
  /** §3.6/§6.1: the endpoints are KB nodes, never anchors. */
  neverPropagationAnchor: true;
  source: WikidataSourceRecord;
}

export interface WikidataSkipEntry {
  property: string;
  /** The property's English label when known; absent, never guessed. */
  label?: string;
  count: number;
  /** "unmapped-property" (no table row) or "non-item-value" (a mapped
   *  edge property whose statement value was not an item). */
  reason: "unmapped-property" | "non-item-value";
}

export interface WikidataTranslation {
  nodes: WikidataNodeRecord[];
  associations: WikidataAssociation[];
  skipLog: WikidataSkipEntry[];
  skippedTotal: number;
}

export interface WikidataTranslateOptions {
  /** Fetch date stamped into every SourceRecord's baseVersion. */
  fetchDate: string;
  /** Endpoint the batch came through (default "fixture"). */
  retrievedFrom?: string;
}

export function translateWikidataItems(
  items: WikidataItem[],
  options: WikidataTranslateOptions,
): WikidataTranslation {
  const retrievedFrom = options.retrievedFrom ?? "fixture";
  const byQid = new Map(items.map((i) => [i.qid, i]));
  const nameOf = (qid: string, fallback?: string): string =>
    byQid.get(qid)?.label ?? fallback ?? qid;
  const sourceFor = (qid: string): WikidataSourceRecord => ({
    dataset: "wikidata",
    baseVersion: options.fetchDate,
    uri: qid,
    retrievedFrom,
  });

  const nodes: WikidataNodeRecord[] = items.map((item) => {
    const properties: { lat?: number; lon?: number } = {};
    for (const claim of item.claims) {
      if (mappingForProperty(claim.property)?.direction === "node-properties" && claim.value.kind === "coordinates") {
        properties.lat = claim.value.lat;
        properties.lon = claim.value.lon;
      }
    }
    return {
      qid: item.qid,
      name: item.label ?? item.qid,
      properties,
      neverPropagationAnchor: true,
      provenanceKind: "retrieved",
      source: sourceFor(item.qid),
    };
  });

  const associations: WikidataAssociation[] = [];
  const skips = new Map<string, WikidataSkipEntry>();
  const countSkip = (property: string, reason: WikidataSkipEntry["reason"]) => {
    const key = `${property}|${reason}`;
    const existing = skips.get(key);
    if (existing) existing.count++;
    else {
      skips.set(key, {
        property,
        label: WIKIDATA_PROPERTY_LABELS[property],
        count: 1,
        reason,
      });
    }
  };

  for (const item of items) {
    for (const claim of item.claims) {
      const row = mappingForProperty(claim.property);
      if (!row) {
        countSkip(claim.property, "unmapped-property");
        continue;
      }
      if (row.direction === "node-properties") continue; // handled on the node
      if (!row.association) continue; // unreachable for v1 rows; keeps the type honest
      if (claim.value.kind !== "item") {
        countSkip(claim.property, "non-item-value");
        continue;
      }
      const objectQid = claim.value.qid;
      const inverted = row.direction === "inverted";
      associations.push({
        from: inverted ? nameOf(objectQid) : nameOf(item.qid),
        fromQid: inverted ? objectQid : item.qid,
        to: inverted ? nameOf(item.qid) : nameOf(objectQid),
        toQid: inverted ? item.qid : objectQid,
        type: row.association,
        property: claim.property,
        provenanceKind: "retrieved",
        confidence: WIKIDATA_STRUCTURAL_CONFIDENCE,
        neverPropagationAnchor: true,
        source: sourceFor(item.qid),
      });
    }
  }

  const skipLog = [...skips.values()].sort((a, b) => a.property.localeCompare(b.property));
  return {
    nodes,
    associations,
    skipLog,
    skippedTotal: skipLog.reduce((n, s) => n + s.count, 0),
  };
}

/* ---------------- stage 3: join proposals ---------------- */

export type WikidataJoinCandidate =
  | { kind: "synset"; synsetId: string; lemma: string; gloss: string; matchedOn: "label" | "sitelink" }
  | { kind: "concept"; concept: string; matchedOn: "label" | "sitelink" };

export interface WikidataJoinProposal {
  qid: string;
  label?: string;
  sitelinkTitle?: string;
  candidates: WikidataJoinCandidate[];
  /** True when the candidates disagree: more than one distinct
   *  candidate, or label and sitelink name different things. */
  conflict: boolean;
  conflictReason?: string;
  status: "proposed" | "no-candidate";
  /** Proposals are never joins (§3.6): banking one is W2's act,
   *  taken through review, not by this adapter. */
  autoJoined: false;
}

/** Injectable candidate lookup, so tests can pin the mechanism
 *  without the extract; the default is the real WordNet/concept one. */
export interface WikidataCandidateFinder {
  synsetsFor(name: string): SynsetRecord[];
  hasConcept(name: string): boolean;
}

export const defaultCandidateFinder: WikidataCandidateFinder = {
  synsetsFor: (name) => synsetsForLemma(getDefaultExtract(), name).filter((s) => s.pos === "n"),
  hasConcept: (name) => classificationsOf(name).length > 0,
};

/** Normalise a label/sitelink title for matching: lowercase,
 *  underscores to spaces, a trailing parenthetical qualifier
 *  ("Mercury (planet)") stripped. */
export function normaliseWikidataName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
}

export function proposeWikidataJoin(
  item: WikidataItem,
  finder: WikidataCandidateFinder = defaultCandidateFinder,
): WikidataJoinProposal {
  const candidates: WikidataJoinCandidate[] = [];
  const seen = new Set<string>();
  const addFor = (raw: string | undefined, matchedOn: "label" | "sitelink") => {
    if (!raw) return;
    const name = normaliseWikidataName(raw);
    if (!name) return;
    for (const s of finder.synsetsFor(name)) {
      const key = `synset:${s.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({ kind: "synset", synsetId: s.id, lemma: name, gloss: s.gloss, matchedOn });
    }
    if (finder.hasConcept(name)) {
      const key = `concept:${name}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({ kind: "concept", concept: name, matchedOn });
      }
    }
  };
  addFor(item.label, "label");
  addFor(item.sitelinkTitle, "sitelink");

  const labelName = item.label ? normaliseWikidataName(item.label) : undefined;
  const sitelinkName = item.sitelinkTitle ? normaliseWikidataName(item.sitelinkTitle) : undefined;
  const nameMismatch =
    labelName !== undefined && sitelinkName !== undefined && labelName !== sitelinkName;

  let conflict = false;
  let conflictReason: string | undefined;
  if (candidates.length > 1) {
    conflict = true;
    conflictReason = `${candidates.length} distinct candidates for "${item.label ?? item.qid}" — ambiguity is flagged, never resolved silently`;
  } else if (nameMismatch) {
    conflict = true;
    conflictReason = `label "${item.label}" and sitelink "${item.sitelinkTitle}" name different things`;
  }

  return {
    qid: item.qid,
    label: item.label,
    sitelinkTitle: item.sitelinkTitle,
    candidates,
    conflict,
    conflictReason,
    status: candidates.length ? "proposed" : "no-candidate",
    autoJoined: false,
  };
}
