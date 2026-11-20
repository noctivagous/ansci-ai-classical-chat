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
 * ("/r/Causes" and "Causes" are the same input here). ATOMIC
 * relations keep their "at:" spelling, as the data spells them.
 *
 * The mapping — how each CSKG relation type is treated by the fork.
 * Concept-endpoint relations (both ends must classify, see below):
 *  - Causes            → a causal link (ASSOCIATED_WITH-shaped) between
 *                        the two classified concepts.
 *  - UsedFor           → a function link.
 *  - AtLocation        → a location link.
 *  - HasSubevent,
 *    HasPrerequisite   → procedure-chain links, marked ordered: the
 *                        chain's order is the knowledge (banked
 *                        procedures are step chains, per "Bank what
 *                        works"), so these records carry ordered: true.
 *  - CapableOf         → a capability link: what the subject concept
 *                        can do or undergo.
 *  - PartOf            → a part link (mereology), subject part of object.
 *  - HasProperty       → a property link: the object names a property
 *                        the subject concept carries.
 *  - Desires           → a desire link: the subject concept wants the
 *                        object concept.
 *  - MadeOf            → a material link: the subject is made of the
 *                        object concept.
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
 * ATOMIC relations (the at:* family, enumerated from the extract
 * itself, 2026-11-17: nine relations, 711,453 edges) do NOT take the
 * concept-endpoint route — their endpoints are event phrases
 * ("personx gives persony a hug" → "feels happy") that no concept
 * table can classify. They take the EVENT-RULE anchoring below:
 *  - at:xNeed          → a prerequisite link, ordered (what PersonX
 *                        needed before the event).
 *  - at:xEffect,
 *    at:oEffect        → consequence links (the Causes family, event
 *                        scale): what follows for PersonX / for others.
 *  - at:xReact,
 *    at:oReact         → reaction links: the feeling the event
 *                        produces in PersonX / in others.
 *  - at:xWant,
 *    at:oWant          → desire links: what PersonX / others want next.
 *  - at:xIntent        → an intent link: why PersonX did the event.
 *  - at:xAttr          → an attribution link: the trait the event
 *                        shows PersonX to have.
 * The extract carries no at:IsBefore / at:IsAfter / at:HinderedBy —
 * ATOMIC's sequence and hindrance relations are not in this merge —
 * so there is nothing to map there; if a future extract adds them,
 * they stay unmapped until this table says otherwise.
 *
 * EVENT-RULE ANCHORING (v1, deliberately strict): an ATOMIC triple
 * anchors iff (i) the event side's HEAD VERB — the first token of the
 * normalised event phrase, after the placeholders and auxiliaries,
 * that the system knows as a verb (hand lexicon or the WordNet verb
 * provider) — exists, and (ii) the other side's HEAD WORD — the first
 * content token of the effect/reaction/want/need/intent/attr phrase
 * whose lemma (WordNet verb/noun/adjective lemmatisation, else the
 * token itself) resolves through the SAME classifiability route the
 * concept relations use (curated table or WordNet climb) — exists.
 * Anchored links carry `anchoring: { rule: "event-rule", verb,
 * headWord, headVia }` so the record says how it was placed, and its
 * from/to stay the full normalised phrases: the testimony is the
 * phrase pair, not a concept pair. Unanchored triples drop with
 * reason "unanchored-endpoint", the detail naming which condition
 * failed. A small honest yield beats a large loose one: most ATOMIC
 * phrases anchor on neither condition and drop, counted.
 *
 * Endpoint resolution (concept relations): a concept resolves when
 * the fork's curated table (classify.ts) knows it, or when the
 * WordNet climb (wordnet-lex.ts) classifies it. A triple with an
 * unresolvable end drops with reason "unclassified-endpoint" — the
 * fork banks only what it can place in the net.
 */
import type { Element } from "./sentence";
import { EN_LEXICON } from "./sentence";
import { lookupClassification } from "./classify";
import { climbClassification, wordnetAdjective, wordnetNoun, wordnetVerb } from "./wordnet-lex";

export interface CskgTriple {
  subject: string;
  /** CSKG relation name, "/r/Causes", "Causes", or "at:xEffect". */
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
  | "association"
  | "capability"
  | "part"
  | "property"
  | "desire"
  | "material"
  | "consequence"
  | "reaction"
  | "intent"
  | "attribution";

/** A fork-graph-ready link record, as mapTriple emits it. */
export interface CskgLink {
  from: string;
  to: string;
  kind: CskgLinkKind;
  provenance: "cskg";
  /** Procedure-chain links (HasSubevent/HasPrerequisite/at:xNeed) are ordered. */
  ordered?: boolean;
  /** IsA records are evidence, not assertions: false there, true else. */
  asserted: boolean;
  fromElement?: Element;
  toElement?: Element;
  /** How each end resolved: the curated table, or the WordNet climb.
   *  Concept-route links only; ATOMIC links carry `anchoring` instead. */
  resolution?: { from: "table" | "wordnet-climb"; to: "table" | "wordnet-climb" };
  /** ATOMIC links only: the event-rule anchoring record — the head
   *  verb that placed the event side, and the head word (lemma) whose
   *  classification placed the other side, and how it resolved. */
  anchoring?: {
    rule: "event-rule";
    verb: string;
    headWord: string;
    headVia: "table" | "wordnet-climb";
  };
}

export type CskgMapResult =
  | { ok: true; link: CskgLink }
  | {
      ok: false;
      reason: "unclassified-endpoint" | "unmapped-relation" | "unanchored-endpoint";
      detail: string;
    };

const RELATION_KINDS: Record<string, { kind: CskgLinkKind; ordered?: boolean; asserted: boolean }> = {
  Causes: { kind: "causal", asserted: true },
  UsedFor: { kind: "function", asserted: true },
  AtLocation: { kind: "location", asserted: true },
  HasSubevent: { kind: "subevent", ordered: true, asserted: true },
  HasPrerequisite: { kind: "prerequisite", ordered: true, asserted: true },
  CapableOf: { kind: "capability", asserted: true },
  PartOf: { kind: "part", asserted: true },
  HasProperty: { kind: "property", asserted: true },
  Desires: { kind: "desire", asserted: true },
  MadeOf: { kind: "material", asserted: true },
  IsA: { kind: "classification-evidence", asserted: false },
  RelatedTo: { kind: "association", asserted: true },
};

/** The ATOMIC family, as spelled in the extract. These route through
 *  event-rule anchoring (anchorAtomic), never the concept route. */
const ATOMIC_RELATION_KINDS: Record<string, { kind: CskgLinkKind; ordered?: boolean }> = {
  "at:xNeed": { kind: "prerequisite", ordered: true },
  "at:xEffect": { kind: "consequence" },
  "at:oEffect": { kind: "consequence" },
  "at:xReact": { kind: "reaction" },
  "at:oReact": { kind: "reaction" },
  "at:xWant": { kind: "desire" },
  "at:oWant": { kind: "desire" },
  "at:xIntent": { kind: "intent" },
  "at:xAttr": { kind: "attribution" },
};

/** Is this relation (any accepted spelling) one the feeder treats? */
export function isCskgRelationMapped(rawRelation: string): boolean {
  const relation = normaliseRelation(rawRelation);
  return relation in RELATION_KINDS || relation in ATOMIC_RELATION_KINDS;
}

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

/* ---------------- ATOMIC event-rule anchoring ---------------- */

/**
 * Normalise an ATOMIC phrase label as the extract spells it. Labels
 * arrive pipe-joined when the merge kept variants ("'d better go|
 * personx 'd better go"): the variant carrying a placeholder is the
 * full form; failing that, the last variant. Placeholders unify to
 * the data's own spelling (personx / persony, from "person x" too).
 */
export function normaliseAtomicPhrase(raw: string): string {
  let s = normaliseConcept(raw);
  if (s.includes("|")) {
    const variants = s
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean);
    s =
      variants.find((v) => v.includes("personx") || v.includes("persony")) ??
      variants[variants.length - 1] ??
      s;
  }
  return s
    .replace(/\bperson\s+x\b/g, "personx")
    .replace(/\bperson\s+y\b/g, "persony")
    .replace(/\s+/g, " ")
    .trim();
}

function phraseTokens(phrase: string): string[] {
  return phrase
    .split(/\s+/)
    .map((t) => t.replace(/^[^a-z']+|[^a-z']+$/g, ""))
    .filter(Boolean);
}

const PLACEHOLDER_TOKENS = new Set(["personx", "persony", "personx's", "persony's", "___", "'s"]);

/** Tokens skipped while looking for the event's head verb:
 *  placeholders, auxiliaries and modals, and the frame words of
 *  ATOMIC's "about to" construction. The head verb is the first
 *  remaining token the system knows as a verb. */
const EVENT_SKIP = new Set([
  ...PLACEHOLDER_TOKENS,
  "'d", "would", "will", "shall", "can", "could", "should", "may", "might", "must",
  "about", "to", "the", "a", "an",
]);

interface KnownVerb {
  lemma: string;
  element: Element;
}

function knownVerb(token: string): KnownVerb | undefined {
  const wn = wordnetVerb(token);
  if (wn) return { lemma: wn.lemma, element: wn.element };
  const hand = EN_LEXICON[token];
  if (hand && hand.kind === "verb") return { lemma: hand.lemma, element: hand.element };
  return undefined;
}

function eventHeadVerb(event: string): KnownVerb | undefined {
  for (const token of phraseTokens(event)) {
    if (EVENT_SKIP.has(token)) continue;
    const verb = knownVerb(token);
    if (verb) return verb;
  }
  return undefined;
}

/** Tokens that never carry the other side's head word: placeholders,
 *  articles, pronouns, possessives, conjunctions and light adverbs. */
const HEAD_SKIP = new Set([
  ...PLACEHOLDER_TOKENS,
  "the", "a", "an", "to", "of", "in", "on", "at", "for", "with", "and", "or", "but",
  "their", "his", "her", "its", "my", "your", "our",
  "they", "he", "she", "it", "them", "him", "someone", "anyone", "everyone",
  "others", "another", "other", "this", "that", "these", "those", "there", "here",
  "very", "really", "just", "now", "then", "up", "down", "away", "back", "off", "out",
]);

interface HeadWord extends Resolved {
  word: string;
  lemma: string;
}

/** The other side's head word: the first content token whose lemma
 *  resolves through the concept route. Lemmatisation is the WordNet
 *  providers' (verb, then noun, then adjective), falling back to the
 *  token itself. */
function resolveHeadWord(phrase: string): HeadWord | undefined {
  for (const token of phraseTokens(phrase)) {
    if (HEAD_SKIP.has(token)) continue;
    const direct = resolveConcept(token);
    if (direct) return { word: token, lemma: token, ...direct };
    const lemmas = [
      wordnetVerb(token)?.lemma,
      wordnetNoun(token)?.lemma,
      wordnetAdjective(token)?.lemma,
    ];
    for (const lemma of lemmas) {
      if (!lemma || lemma === token) continue;
      const resolved = resolveConcept(lemma);
      if (resolved) return { word: token, lemma, ...resolved };
    }
  }
  return undefined;
}

function anchorAtomic(
  t: CskgTriple,
  shape: { kind: CskgLinkKind; ordered?: boolean },
): CskgMapResult {
  const event = normaliseAtomicPhrase(t.subject);
  const other = normaliseAtomicPhrase(t.object);
  const verb = eventHeadVerb(event);
  if (!verb) {
    return {
      ok: false,
      reason: "unanchored-endpoint",
      detail: `event phrase '${event}' has no head verb the system knows`,
    };
  }
  const head = resolveHeadWord(other);
  if (!head) {
    return {
      ok: false,
      reason: "unanchored-endpoint",
      detail: `no classifiable head word in '${other}' (event verb '${verb.lemma}' anchored)`,
    };
  }
  return {
    ok: true,
    link: {
      from: event,
      to: other,
      kind: shape.kind,
      provenance: "cskg",
      ...(shape.ordered ? { ordered: true } : {}),
      asserted: true,
      fromElement: verb.element,
      toElement: head.element,
      anchoring: { rule: "event-rule", verb: verb.lemma, headWord: head.lemma, headVia: head.via },
    },
  };
}

/**
 * Map one CSKG triple to a fork link record, or drop it with a named
 * reason. Concept relations: both ends must resolve to
 * classifications (curated table or WordNet climb) — including
 * RelatedTo, whose weakness is not a licence to bank unplaceable
 * concepts. ATOMIC relations: the event-rule anchoring above.
 */
export function mapTriple(t: CskgTriple): CskgMapResult {
  const relation = normaliseRelation(t.relation);
  const atomicShape = ATOMIC_RELATION_KINDS[relation];
  if (atomicShape) return anchorAtomic(t, atomicShape);
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
