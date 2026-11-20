/**
 * entity-rank.ts — entity ranking for entity resolution: given a
 * name mention, its context, and a candidate list of Wikidata
 * items, rank the candidates by three classical, explainable
 * signals. Built for the Wikidata intake (ai-system/intake/
 * wikidata; design §3.6: the adapter PROPOSES bridges and nothing
 * is joined silently) — this ranker is the proposal orderer: it
 * says which candidate the bridge should propose first, and it
 * shows its work per candidate.
 *
 * The signals (no vectors anywhere; every point is a named fact):
 *
 *  1. TYPE AGREEMENT (weight TYPE_WEIGHT). The candidate's kind —
 *     read off its instance-of labels and description by the small
 *     rule table below — is checked against the kind the context
 *     expects (a where-question expects a place; a who-question a
 *     person; a grounded WordNet synset carries its own type).
 *     Match +TYPE_WEIGHT, confident mismatch −TYPE_WEIGHT,
 *     unknown 0. This is the strongest signal because it is the
 *     only one that can be flatly WRONG about a candidate: a river
 *     is not a basketball player whatever the context says.
 *
 *  2. PROMINENCE (weight up to PROMINENCE_WEIGHT). Sitelink count
 *     as the prior — the same role the most-frequent-sense prior
 *     plays in Lesk: among near-equals, the entity the world
 *     writes about most is the likeliest referent. Log-scaled and
 *     normalised within the candidate list, so it orders rather
 *     than overwhelms.
 *
 *  3. CONTEXT OVERLAP (weight OVERLAP_WEIGHT per word). Lesk-style
 *     word overlap between the candidate's description and the
 *     context text, computed by lesk.ts's wordOverlap — the ONE
 *     overlap implementation in the system. The words that hit
 *     are reported, so the score can be audited.
 *
 * Deterministic: same inputs, same ranking, ties broken by the
 * candidates' incoming order (search order is the last resort,
 * never the first). The ranker asserts nothing: resolution and
 * joining remain the intake's decision, taken on this evidence.
 *
 * Geography G1 (2026-11-20) adds a FOURTH signal, proximity,
 * under the geography design note's §6: when the context
 * carries the conversation's situated place and a candidate
 * carries coordinates, distance from the situated place scores
 * (an auditable breakdown line, like the other three). It is
 * inert for every pre-geography caller — no situated place in
 * context, or no coordinates on the candidate, and the ranking
 * is the three-signal ranking unchanged.
 */
import { wordOverlap } from "./lesk";

/** A Wikidata candidate, in the shape the intake's search step
 *  supplies (recorded fixtures carry exactly these fields). */
export interface EntityCandidate {
  /** Wikidata item id, e.g. "Q28563". */
  id: string;
  label: string;
  description?: string;
  /** Sitelink count (the prominence prior). */
  sitelinks: number;
  /** Instance-of (P31) value labels, e.g. ["city", "county seat"]. */
  instanceOf: string[];
  /** The candidate's point, when its source attests one
   *  (Geography G1: Nominatim candidates carry theirs, mapped
   *  at the client — geography-client.ts). Absent, the
   *  proximity signal (§6 of the geography design note) does
   *  not apply to this candidate. Wikidata candidates carry
   *  none here — their coordinates live in the bank, not in
   *  the search shape — so the intake's ranking is unchanged. */
  coordinates?: { lat: number; lon: number };
}

/** The coarse kinds type agreement reasons over. "thing" is the
 *  residual kind for concrete non-place/person/organisation
 *  entities (a planet, an element, a language, a fruit). */
export type EntityKind =
  | "place"
  | "person"
  | "organisation"
  | "work"
  | "organism"
  | "thing";

export interface RankContext {
  /** The name as mentioned. */
  mention: string;
  /** The sentence/conversation context the mention sits in. */
  contextText: string;
  /** The kind the context expects, when known (from the question
   *  shape or the grounding synset's type). Absent = no type
   *  signal; ranking falls to prominence + overlap. */
  expectedKind?: EntityKind;
  /** The conversation's situated place, when one stands
   *  (GeographyAwareness's centre, Geography G1; design note
   *  §6): proximity to it is a scored signal for candidates
   *  that carry coordinates. Absent = no proximity signal;
   *  every pre-geography ranking is unchanged. */
  situatedPlace?: { name: string; lat: number; lon: number };
}

export interface CandidateBreakdown {
  candidate: EntityCandidate;
  /** Total order key: the three signal scores summed. */
  total: number;
  type: {
    score: number;
    /** The kind the classifier read off the candidate. */
    kind: EntityKind | undefined;
    verdict: "match" | "mismatch" | "unknown" | "no-expectation";
    /** The rule that fired, for the explanation. */
    rule?: string;
  };
  prominence: { score: number; sitelinks: number };
  overlap: { score: number; words: string[] };
  /** Proximity to the context's situated place (Geography
   *  G1): present only when the context carried a situated
   *  place AND this candidate carried coordinates. One more
   *  auditable line, like every other signal — the distance
   *  is shown, not hidden in the sort. */
  proximity?: { score: number; distanceKm: number };
}

export const TYPE_WEIGHT = 3;
export const PROMINENCE_WEIGHT = 2;
export const OVERLAP_WEIGHT = 1;
/** The proximity signal's ceiling (Geography G1): a candidate
 *  AT the situated place earns the full weight, decaying
 *  linearly to zero at PROXIMITY_RANGE_KM — a continental
 *  scale, stated so it can be argued with. */
export const PROXIMITY_WEIGHT = 2;
export const PROXIMITY_RANGE_KM = 2000;

/** Great-circle distance in kilometres between two points —
 *  the one distance arithmetic the proximity signal and the
 *  geography computations share. */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/* ------------------------------------------------------------------ */
/* Kind classification: a small rule table over instance-of labels     */
/* and description words. First matching rule wins; the rule is        */
/* reported so a classification can be argued with.                    */
/* ------------------------------------------------------------------ */

const KIND_RULES: { kind: EntityKind; needles: string[] }[] = [
  {
    kind: "person",
    needles: [
      "human", "person", "deity", "god", "goddess", "mythological figure",
      "fictional character", "emperor", "king", "queen", "president",
      "politician", "actor", "actress", "singer", "writer", "author",
      "basketball player", "football player", "athlete", "scientist",
      "artist", "composer", "philosopher", "general", "poet", "painter",
    ],
  },
  {
    kind: "place",
    needles: [
      "city", "town", "village", "human settlement", "settlement", "capital",
      "state", "country", "sovereign state", "federal state", "u.s. state",
      "province", "county", "municipality", "region", "administrative",
      "river", "island", "mountain", "lake", "ocean", "sea ", "continent",
      "peninsula", "valley", "desert", "glacier", "territory", "district",
      "borough", "hamlet", "commune", "prefecture", "archipelago", "canal",
      "waterfall", "volcano", "cape", "bay", "strait", "plateau",
    ],
  },
  {
    kind: "organisation",
    needles: [
      "business", "company", "corporation", "organization", "organisation",
      "university", "college", "political party", "sports club",
      "football club", "basketball team", "band", "record label",
      "government agency", "nonprofit", "institution", "school",
    ],
  },
  {
    kind: "work",
    needles: [
      "film", "novel", "book", "album", "song", "painting",
      "television series", "video game", "written work", "play",
      "opera", "poem", "magazine", "newspaper", "software",
    ],
  },
  {
    kind: "organism",
    needles: [
      "taxon", "species", "genus", "bird", "mammal", "fish", "insect",
      "plant", "tree", "flower", "animal", "breed", "fungus", "bacteria",
    ],
  },
  {
    kind: "thing",
    needles: [
      "planet", "chemical element", "programming language", "language",
      "fruit", "food", "sport", "game", "religion", "philosophy",
      "science", "technology", "vehicle", "instrument", "weapon",
      "disease", "mineral", "metal", "material", "currency", "holiday",
      "festival", "award", "event", "war", "battle", "religious",
    ],
  },
];

/** Classify a candidate's kind from its instance-of labels first
 *  (structured evidence), then its description (unstructured).
 *  Within a text, the LONGEST matching needle wins — specificity
 *  before rule order, because substrings lie: "human settlement"
 *  contains "human" but is a place, and a first-match scan would
 *  call it a person. Returns the kind and the needle that fired. */
export function classifyKind(
  candidate: EntityCandidate,
): { kind: EntityKind; rule: string } | undefined {
  const scan = (text: string, source: string) => {
    let best: { kind: EntityKind; rule: string; len: number } | undefined;
    for (const { kind, needles } of KIND_RULES) {
      for (const needle of needles) {
        if (text.includes(needle) && (!best || needle.length > best.len)) {
          best = { kind, rule: `${source} ~ "${needle}"`, len: needle.length };
        }
      }
    }
    return best ? { kind: best.kind, rule: best.rule } : undefined;
  };
  return (
    scan(candidate.instanceOf.join(" ").toLowerCase(), "instance-of") ??
    scan((candidate.description ?? "").toLowerCase(), "description")
  );
}

/* ------------------------------------------------------------------ */
/* The ranker                                                          */
/* ------------------------------------------------------------------ */

/**
 * Rank candidates for a mention in context. Returns one breakdown
 * per candidate, best first; ties keep the incoming (search)
 * order. Pure and deterministic.
 */
export function rankEntities(
  candidates: readonly EntityCandidate[],
  context: RankContext,
): CandidateBreakdown[] {
  const maxSitelinks = Math.max(1, ...candidates.map((c) => c.sitelinks));
  const logMax = Math.log1p(maxSitelinks);
  const scored = candidates.map((candidate, index) => {
    // 1. Type agreement.
    let type: CandidateBreakdown["type"];
    if (!context.expectedKind) {
      type = { score: 0, kind: classifyKind(candidate)?.kind, verdict: "no-expectation" };
    } else {
      const classified = classifyKind(candidate);
      if (!classified) {
        type = { score: 0, kind: undefined, verdict: "unknown" };
      } else if (classified.kind === context.expectedKind) {
        type = { score: TYPE_WEIGHT, kind: classified.kind, verdict: "match", rule: classified.rule };
      } else {
        type = { score: -TYPE_WEIGHT, kind: classified.kind, verdict: "mismatch", rule: classified.rule };
      }
    }
    // 2. Prominence: log-scaled sitelinks, normalised to the list.
    const prominence = {
      score: (Math.log1p(candidate.sitelinks) / logMax) * PROMINENCE_WEIGHT,
      sitelinks: candidate.sitelinks,
    };
    // 3. Context overlap between the description and the context.
    const o = wordOverlap(candidate.description ?? "", context.contextText);
    const overlap = { score: o.count * OVERLAP_WEIGHT, words: o.words };
    // 4. Proximity to the situated place (Geography G1, design
    // note §6): only when the context carries a situated place
    // and the candidate carries coordinates — otherwise the
    // signal does not exist for this candidate and the total
    // is the three-signal sum it always was.
    let proximity: CandidateBreakdown["proximity"];
    let proximityScore = 0;
    if (context.situatedPlace && candidate.coordinates) {
      const distanceKm = haversineKm(context.situatedPlace, candidate.coordinates);
      proximityScore = PROXIMITY_WEIGHT * Math.max(0, 1 - distanceKm / PROXIMITY_RANGE_KM);
      proximity = { score: proximityScore, distanceKm };
    }
    const total = type.score + prominence.score + overlap.score + proximityScore;
    return { breakdown: { candidate, total, type, prominence, overlap, ...(proximity ? { proximity } : {}) }, index };
  });
  scored.sort((a, b) => b.breakdown.total - a.breakdown.total || a.index - b.index);
  return scored.map((s) => s.breakdown);
}
