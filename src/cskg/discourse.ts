/**
 * discourse.ts — engine piece B: the information processor
 * (design §2). What the person is saying, and who or what they are
 * talking about: a per-turn BREAKDOWN GRAPH — sentences and their
 * composition, mentions with character spans, every candidate
 * referent the graph offers for a mention, phrase grouping with
 * head/modifier roles, coordination splitting, and a scored choice
 * of referent and topic.
 *
 * E2 (design §7 classes 1, 5, 7; §8) replaces E1's flat
 * longest-match-as-answer with a two-phase analysis:
 *
 *   1. MENTION FINDING — the spike's closed-vocabulary longest
 *      match (CSKG's multiword terms are its strength), no stemming
 *      guesses; the only concession is a recorded trailing-"s"
 *      form variant. A matched span whose text is a coordination
 *      ("rain and snow") is SPLIT at the coordinator whenever both
 *      sides resolve on their own — the joint node is recorded as
 *      the split's origin, never chosen as a swallowed topic.
 *   2. CHOICE — each mention carries ALL its candidate nodes
 *      (exact, article-stripped, form variant). Candidates are
 *      scored by phrase role (head over modifier; ordinals and
 *      numbers are modifiers by class), by set overlap between the
 *      candidate's graph neighbourhood and the conversation's
 *      active topic set (the memory → discourse edge of the engine
 *      map, read here for the first time), by attestation, and by
 *      sentence position. The same scoring ranks the turn's topics
 *      (breakdown.topics), which statement topic selection and
 *      question subject selection both consume (solve.ts).
 *
 * CSKG reality, stated once: the loader normalises WordNet-sensed
 * node ids by cutting the sense suffix, so distinct senses usually
 * live on ONE merged node (brother = sibling + monk + member on a
 * single node). Rival *nodes* for one span exist mainly where a
 * form variant or an article form is a different node (bananas the
 * film vs banana the fruit). Where rivals do exist and their
 * neighbourhoods are disjoint, the breakdown records the ambiguity
 * and the trace shows the choice and its reasons; E2 does not open
 * a clarification dialogue (design §7.7 asks later).
 *
 * The breakdown is part of the trace (§4): analyseInto notes one
 * step per mention — span, phrase, role, candidates with scores,
 * the chosen referent and why — so a replay shows what the engine
 * thought the person was talking about.
 *
 * E3 step 0: the CONTENTS BREAKDOWN (§2's submodule inside B —
 * the turn's people, places, things and times) lives in its own
 * unit, contents.ts, consumed at the end of analyseInto below.
 * Factoring it out changed no score and no choice: the evaluation
 * transcripts are byte-identical before and after (clock line
 * excepted), which is the step's declared check (§8).
 *
 * Writes (engine map): `breakdown`. Reads: `activeContext`
 * (memory's active topics — the disambiguation context).
 */
import {
  chunkContainsSpan,
  isParserFunctionSpan,
  parserFunctionReason,
  type AnnotatorDoc,
} from "./annotator";
import { analyseContents, contentsTraceLine, type ContentsBreakdown } from "./contents";
import type { CskgGraph } from "./loader";
import { resolveRivalReadings } from "./resolver";
import type { ClarificationDisposition } from "./roles";
import { noteStep, type TurnWorkspace } from "./workspace";

export const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "do", "does", "did",
  "what", "why", "how", "when", "where", "who", "can", "could", "i",
  "you", "my", "me", "it", "its", "of", "to", "for", "in", "on", "at",
  "with", "about", "and", "or", "if", "so", "that", "this", "there",
  "be", "been", "am", "have", "has", "had", "will", "would", "should",
  "im", "i'm", "dont", "don't", "get", "got", "make", "making", "made",
  "think", "thinking", "know", "say", "said", "one", "some", "any",
  "use", "used", "using", "find", "found", "happen", "happens", "still",
]);

/**
 * The relations whose attestation makes a node a good topic.
 * Mirrors solve.ts's FACT_REL_PRIORITY (the relations solve will
 * actually speak from); kept in sync by hand — if a relation is
 * added there, add it here.
 */
export const ATTESTATION_RELATIONS = [
  "/r/IsA", "/r/UsedFor", "/r/Causes", "at:xEffect", "at:xReact",
  "/r/HasProperty", "/r/AtLocation", "/r/CapableOf", "/r/PartOf",
  "/r/HasA", "/r/MadeOf", "/r/HasSubevent", "at:oReact", "at:xWant",
];

/** Ordinals and quantity words are modifiers by class, never heads. */
const MODIFIER_WORDS = new Set([
  "first", "second", "third", "fourth", "fifth", "sixth", "seventh",
  "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth",
  "twentieth", "thirtieth", "fortieth", "fiftieth", "hundredth",
  "next", "last", "previous", "another",
]);

export interface ResolvedTerm {
  id: number;
  text: string;
  start: number; // word index
  words: number;
  formVariant?: string; // e.g. "bananas→banana"
}

/** A chosen referent with its topic score (breakdown.topics). */
export interface ScoredTerm extends ResolvedTerm {
  score: number;
  reasons: string[];
}

export type CandidateVia = "exact" | "form-variant" | "article-stripped";

/** One graph node a mention could mean, scored. */
export interface ReferentCandidate {
  id: number;
  text: string;
  via: CandidateVia;
  /** strongest single attested fact-bearing edge (dataset support) */
  maxSupport: number;
  /** summed support over fact-bearing out-edges */
  totalSupport: number;
  /** |neighbourhood(candidate) ∩ active topic set| */
  overlap: number;
  /** an ATOMIC event node (carries at: out-edges) */
  event: boolean;
  score: number;
  reasons: string[];
}

export type MentionRole = "head" | "modifier" | "coordinated" | "single";

/** One mention in the breakdown graph. */
export interface Mention {
  /** the surface span, as scanned (lowercased tokens, space-joined) */
  text: string;
  start: number; // first word index
  words: number;
  charStart: number; // offsets into Breakdown.lower
  charEnd: number;
  sentence: number; // sentence index within the turn
  /** phrase group index (mentions sharing a phrase share the number) */
  phrase: number;
  role: MentionRole;
  candidates: ReferentCandidate[];
  /** index into candidates of the chosen referent, -1 if none */
  chosen: number;
  /** a rival candidate with a disjoint neighbourhood exists */
  ambiguous: boolean;
  /** the AmbiguityResolver's ground-1 note, when it reviewed this mention (E4) */
  resolverNote?: string;
  /** whole-span text this mention was split out of, if coordinated-split */
  splitFrom?: string;
  /** indices of mentions coordinated with this one */
  coordinatedWith: number[];
  /** sentence-position component of the score (+8 first content mention of its sentence, else +2) */
  positionBonus: number;
}

/** The per-turn breakdown (design §4): analysis, before judgement. */
export interface Breakdown {
  /** the turn's text, trimmed */
  text: string;
  lower: string;
  sentences: string[];
  /** tokens of the whole turn */
  words: string[];
  /** chosen referents, in mention order (the E1 view of the breakdown) */
  terms: ResolvedTerm[];
  /** the breakdown graph: mentions, candidates, phrases, choices */
  mentions: Mention[];
  /** chosen referents ranked as topics, best first (with head-word expansions) */
  topics: ScoredTerm[];
  /**
   * The parser sidecar's structure for this turn, when provided
   * (annotator.ts). Read-only input: it steers which spans are
   * referent-shaped, never what a span refers to.
   */
  annotation: AnnotatorDoc | null;
  /**
   * The contents breakdown (contents.ts, §2's submodule inside B):
   * the turn's people, places, things and times, categorised from
   * the chosen referents. Filled by analyseInto (it needs the
   * situated place, which is awareness's field); null until then.
   */
  contents: ContentsBreakdown | null;
}

/* ---------------- tokenisation with spans ----------------------- */

export interface TokenSpan {
  word: string;
  start: number; // char offset in the lowercased, punct-spaced text
  end: number;
}

const PUNCT = /[?!.,;:"“”()]/g;

/**
 * Tokens with character spans. The transform is length-preserving
 * (lowercase + punctuation → space), so spans index the lowercased
 * text and line up with the original up to case.
 */
export function tokeniseSpans(text: string): TokenSpan[] {
  const flat = text.toLowerCase().replace(PUNCT, " ");
  const out: TokenSpan[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(flat)) !== null) {
    out.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

export function tokenise(text: string): string[] {
  return tokeniseSpans(text).map((t) => t.word);
}

/** Sentence index for a char offset: breaks follow [.!?] at a boundary. */
function sentenceIndexAt(lower: string, breaks: number[], charStart: number): number {
  let s = 0;
  for (const b of breaks) if (b <= charStart) s++;
  return s;
}

function sentenceBreaks(lower: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < lower.length; i++) {
    const c = lower[i];
    if ((c === "." || c === "!" || c === "?") &&
        (i + 1 === lower.length || lower[i + 1] === " ")) {
      out.push(i + 1);
    }
  }
  return out;
}

/* ---------------- mention finding (the scan) -------------------- */

interface RawSpan {
  start: number; // word index
  words: number;
  text: string; // surface n-gram
  exactId?: number;
  variantId?: number;
  variantText?: string;
  splitFrom?: string;
  coordGroup?: number; // spans split from one whole share a group key
}

/** The node a phrase resolves to: exact, else its trailing-s variant. */
function lookupSpan(
  g: CskgGraph,
  phrase: string,
): { exactId?: number; variantId?: number; variantText?: string } {
  const exactId = g.id(phrase);
  const out: { exactId?: number; variantId?: number; variantText?: string } = {};
  if (exactId !== undefined) out.exactId = exactId;
  const parts = phrase.split(" ");
  const last = parts[parts.length - 1];
  if (last.endsWith("s") && last.length > 1) {
    const alt = [...parts.slice(0, -1), last.slice(0, -1)].join(" ");
    const altId = g.id(alt);
    if (altId !== undefined && altId !== exactId) {
      out.variantId = altId;
      out.variantText = alt;
    }
  }
  return out;
}

/**
 * Longest-match scan, E1's boundaries exactly: at each position the
 * longest n-gram (up to the graph's max term width) that exists in
 * the vocabulary — exactly, or by its recorded form variant — wins.
 */
function scanSpans(g: CskgGraph, words: string[]): RawSpan[] {
  const found: RawSpan[] = [];
  let i = 0;
  while (i < words.length) {
    let hit: RawSpan | null = null;
    const maxN = Math.min(g.maxTermWords, words.length - i);
    for (let n = maxN; n >= 1; n--) {
      const phrase = words.slice(i, i + n).join(" ");
      const lk = lookupSpan(g, phrase);
      if (lk.exactId !== undefined || lk.variantId !== undefined) {
        hit = { start: i, words: n, text: phrase, ...lk };
        break;
      }
    }
    if (hit) {
      found.push(hit);
      i += hit.words;
    } else {
      i++;
    }
  }
  return found;
}

/**
 * E1-compatible flat resolution (correction and follow-up paths use
 * it directly): longest match, form variants recorded, an
 * article-led hit replaced by the bare term when that exists.
 */
export function resolveTerms(g: CskgGraph, text: string): ResolvedTerm[] {
  const words = tokenise(text);
  return scanSpans(g, words).map((s) => {
    let id = (s.exactId ?? s.variantId)!;
    let t = s.exactId !== undefined ? s.text : s.variantText!;
    const formVariant =
      s.exactId === undefined ? `${s.text}→${s.variantText}` : undefined;
    const art = t.match(/^(?:a|an|the) (.+)$/);
    if (art) {
      const bareId = g.id(art[1]);
      if (bareId !== undefined) {
        id = bareId;
        t = art[1];
      }
    }
    const out: ResolvedTerm = { id, text: t, start: s.start, words: s.words };
    if (formVariant) out.formVariant = formVariant;
    return out;
  });
}

/**
 * Coordination splitting: a matched span containing " and " /
 * " or " whose BOTH sides resolve on their own is replaced by the
 * two sides as separate spans (recursively, for three-way splits).
 * The whole-span node is not kept as a candidate — the conjuncts
 * are the topics; the whole is remembered only as `splitFrom`.
 */
function splitCoordinations(g: CskgGraph, spans: RawSpan[]): RawSpan[] {
  const out: RawSpan[] = [];
  let groupSeq = 1;
  const visit = (s: RawSpan, group: number | undefined, origin: string | undefined): void => {
    const parts = s.text.split(" ");
    for (let k = 1; k < parts.length - 1; k++) {
      if (parts[k] !== "and" && parts[k] !== "or") continue;
      const left = parts.slice(0, k).join(" ");
      const right = parts.slice(k + 1).join(" ");
      const ll = lookupSpan(g, left);
      const rl = lookupSpan(g, right);
      if ((ll.exactId !== undefined || ll.variantId !== undefined) &&
          (rl.exactId !== undefined || rl.variantId !== undefined)) {
        const grp = group ?? groupSeq++;
        const org = origin ?? s.text;
        visit(
          { start: s.start, words: k, text: left, ...ll, splitFrom: org, coordGroup: grp },
          grp, org,
        );
        visit(
          { start: s.start + k + 1, words: parts.length - k - 1, text: right, ...rl, splitFrom: org, coordGroup: grp },
          grp, org,
        );
        return;
      }
    }
    out.push(group === undefined ? s : { ...s, splitFrom: origin, coordGroup: group });
  };
  for (const s of spans) visit(s, undefined, undefined);
  return out;
}

/* ---------------- candidates and scoring ------------------------ */

function attestation(g: CskgGraph, id: number): { max: number; total: number } {
  let max = 0;
  let total = 0;
  for (const rel of ATTESTATION_RELATIONS) {
    for (const e of g.outEdges(id, rel)) {
      total += e.support;
      if (e.support > max) max = e.support;
    }
  }
  return { max, total };
}

/** Endpoint set of a node (out + in), capped for hub safety. */
function neighbourhood(g: CskgGraph, id: number, cap = 600): Set<number> {
  const out = new Set<number>();
  for (const e of g.outEdges(id)) {
    out.add(e.to);
    if (out.size >= cap) return out;
  }
  for (const e of g.inEdgesFor(id)) {
    out.add(e.from);
    if (out.size >= cap) return out;
  }
  return out;
}

/**
 * One active topic's overlap set: the topic node itself plus its
 * (capped) neighbourhood. Affinity is measured against the topics
 * ONE AT A TIME and the best taken: against the union of all topic
 * neighbourhoods every common node "overlaps" and the signal is
 * pure hub noise (measured on the live graph: "buying" shared 29
 * neighbours with a mid-conversation union, "a" shared 40).
 */
interface TopicSet {
  topicId: number;
  set: Set<number>;
}

function buildTopicSets(g: CskgGraph, topicIds: number[]): TopicSet[] {
  return topicIds.map((t) => {
    const set = neighbourhood(g, t, 250);
    set.add(t);
    return { topicId: t, set };
  });
}

function candidatesForSpan(g: CskgGraph, s: RawSpan): ReferentCandidate[] {
  const out: ReferentCandidate[] = [];
  const seen = new Set<number>();
  const push = (id: number, text: string, via: CandidateVia): void => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push({
      id, text, via,
      maxSupport: 0, totalSupport: 0, overlap: 0,
      event: false, score: 0, reasons: [],
    });
  };
  if (s.exactId !== undefined) push(s.exactId, s.text, "exact");
  const art = s.text.match(/^(?:a|an|the) (.+)$/);
  if (art) {
    const bareId = g.id(art[1]);
    if (bareId !== undefined) push(bareId, art[1], "article-stripped");
  }
  if (s.variantId !== undefined) push(s.variantId, s.variantText!, "form-variant");
  return out;
}

/*
 * The scoring function (plain terms; applied per candidate):
 *
 *   phrase role      head +12 · coordinated +10 · single +6 · modifier −14
 *   modifier class   ordinal/number mention: a further −26 (and the
 *                    role is forced to modifier)
 *   sentence role    first content mention of its sentence +8, else +2
 *   surface form     exact +4 · article-stripped +3 · form variant −4
 *                    (the surface form is presumed right; a variant
 *                    must earn its way past it with context/attestation)
 *   event            an exactly-matched ATOMIC event node +10
 *   attestation      3×(strongest fact-bearing edge) + ⌊min(total
 *                    fact-bearing support, 12)/2⌋ — best-edge strength
 *                    dominates: a hub's thousand sup-1 edges (buying:
 *                    total 262) must not outscore a term whose facts
 *                    are few but multiply attested
 *   context overlap  +1 per neighbour shared with the best-
 *                    matching single active topic's neighbourhood,
 *                    capped at +15 (memory → discourse); a topic
 *                    never corroborates itself. Deliberately a
 *                    tiebreak-strength signal: shared-neighbour
 *                    counts over this graph are noisy (hub topics
 *                    and scene-word neighbours inflate them), so
 *                    overlap must never outvote role/attestation
 *   span width       +2 per extra word of the mention, capped +6
 *
 * Statement topic selection adds this score to solve's fact score;
 * question subject selection consumes the ranking directly.
 */
const W = {
  head: 12, coordinated: 10, single: 6, modifier: -14,
  modifierClass: -26, subject: 8, other: 2,
  exact: 4, article: 3, variant: -4, event: 10,
  overlapPer: 1, overlapCap: 15, widthPer: 2, widthCap: 6,
};

function isModifierClass(surface: string): boolean {
  return (
    MODIFIER_WORDS.has(surface) ||
    /^\d+$/.test(surface) ||
    /^\d+(?:st|nd|rd|th)$/.test(surface)
  );
}

function scoreCandidate(
  g: CskgGraph,
  cand: ReferentCandidate,
  mention: Mention,
  topicSets: TopicSet[],
): void {
  const att = attestation(g, cand.id);
  cand.maxSupport = att.max;
  cand.totalSupport = att.total;
  cand.event = g.outEdges(cand.id).some((e) => e.rel.startsWith("at:"));
  // Best single-topic affinity: neighbours shared with one topic's
  // neighbourhood, and the candidate's own topic entry skipped (a
  // remembered topic must not corroborate itself — that is what
  // let "rain" outscore "rains" when rain was already a topic).
  let overlap = 0;
  if (topicSets.length) {
    const hood = neighbourhood(g, cand.id);
    for (const ts of topicSets) {
      if (ts.topicId === cand.id) continue;
      let n = 0;
      for (const x of hood) if (ts.set.has(x)) n++;
      if (n > overlap) overlap = n;
    }
  }
  cand.overlap = overlap;

  const reasons: string[] = [];
  let score = 0;
  const roleW = W[mention.role];
  score += roleW;
  reasons.push(`role ${mention.role} ${roleW >= 0 ? "+" : ""}${roleW}`);
  if (isModifierClass(mention.text)) {
    score += W.modifierClass;
    reasons.push(`modifier class ${W.modifierClass}`);
  }
  const posW = mention.positionBonus;
  score += posW;
  reasons.push(`sentence position +${posW}`);
  const viaW = cand.via === "exact" ? W.exact : cand.via === "article-stripped" ? W.article : W.variant;
  score += viaW;
  reasons.push(`via ${cand.via} ${viaW >= 0 ? "+" : ""}${viaW}`);
  if (cand.event && cand.via === "exact") {
    score += W.event;
    reasons.push(`ATOMIC event +${W.event}`);
  }
  const attW = 3 * att.max + Math.floor(Math.min(att.total, 12) / 2);
  score += attW;
  reasons.push(`attestation +${attW} (best ${att.max}, total ${att.total})`);
  const ovW = Math.min(overlap * W.overlapPer, W.overlapCap);
  if (ovW > 0) {
    score += ovW;
    reasons.push(`context overlap ×${overlap} +${ovW}`);
  }
  const widthW = Math.min((mention.words - 1) * W.widthPer, W.widthCap);
  if (widthW > 0) {
    score += widthW;
    reasons.push(`span width +${widthW}`);
  }
  cand.score = score;
  cand.reasons = reasons;
}

/** Two neighbourhoods count as rival senses when their Jaccard is ~0. */
function disjoint(g: CskgGraph, a: number, b: number): boolean {
  const na = neighbourhood(g, a);
  const nb = neighbourhood(g, b);
  if (na.size < 3 || nb.size < 3) return false;
  let inter = 0;
  for (const n of na) if (nb.has(n)) inter++;
  return inter / (na.size + nb.size - inter) < 0.02;
}

/* ---------------- phrases and roles ----------------------------- */

/** Union-find over mention indices for phrase grouping. */
class UnionFind {
  private parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[rb] = ra;
  }
}

/**
 * Phrase grouping and roles over one sentence's mentions (grouping
 * only ever joins two CONTENT mentions):
 *  - a gerund mention followed closely by another content mention
 *    forms a verb phrase: the following mention (the object) is
 *    the head, the gerund a modifier;
 *  - coordination-split partners, and mentions joined only by
 *    "and"/"or" (or by nothing — tokenisation strips commas, so a
 *    comma list and a compound look alike; both are co-topics),
 *    share a phrase as `coordinated`;
 *  - an of-phrase (A "of" B, or A ending in "of" directly before
 *    B) shares a phrase: B is the head (the substance — "pot of
 *    soup", "day of rain"), A a modifier;
 *  - an ordinal/number mention, or a lone word directly before a
 *    multiword mention, attaches to its phrase as a modifier.
 */
/** Surfaces that can follow a gerund without being its object. */
const NON_OBJECT_HEADS = new Set([
  "his", "her", "their", "my", "your", "its", "our", "him", "them",
  "this", "that", "it", "he", "she", "they", "we",
]);

function assignPhrasesAndRoles(
  mentions: Mention[],
  words: string[],
): void {
  const uf = new UnionFind(mentions.length);
  const coordinated = new Set<number>();
  const ofLeft = new Set<number>();
  const ofRight = new Set<number>();
  const ordinalAttached = new Set<number>();
  const gerundLeft = new Set<number>();
  const gerundRight = new Set<number>();
  const modifierAttached = new Set<number>();

  // Gerund–object phrases, over consecutive CONTENT mentions (a
  // function-word mention may sit between them: "buying a winter
  // coat", "bringing his new girlfriend"). The gerund names the
  // activity; the object is what the statement is about — the
  // object is the phrase head, the gerund a modifier. Without
  // this, "buying" (a 424-degree hub with a sup-1 IsA fact) could
  // capture a statement about a coat.
  const contentIdx = mentions
    .map((m, i) => (isContentSurface(m.text) ? i : -1))
    .filter((i) => i >= 0);
  for (let k = 0; k + 1 < contentIdx.length; k++) {
    const i = contentIdx[k];
    const j = contentIdx[k + 1];
    const a = mentions[i];
    const b = mentions[j];
    if (a.sentence !== b.sentence) continue;
    if (b.start - (a.start + a.words) > 2) continue;
    if (!/^[a-z]+ing$/.test(a.text) || a.text.length < 5) continue;
    if (isModifierClass(a.text) || NON_OBJECT_HEADS.has(b.text)) continue;
    uf.union(i, j);
    gerundLeft.add(i);
    gerundRight.add(j);
  }

  // Adjacent mention pairs, in order. Grouping applies only
  // between two content mentions — function words are graph terms
  // too ("i'm", "of", "a"), and grouping through them chained a
  // whole sentence into one "coordinated" blob. Checks are
  // ordered: a split partnership and an of-phrase must be
  // recognised before plain adjacency, which would otherwise
  // swallow both.
  for (let i = 0; i + 1 < mentions.length; i++) {
    const a = mentions[i];
    const b = mentions[i + 1];
    if (a.sentence !== b.sentence) continue;
    if (!isContentSurface(a.text) || !isContentSurface(b.text)) continue;
    const gap = words.slice(a.start + a.words, b.start);
    const joinCoordinated = (): void => {
      uf.union(i, i + 1);
      coordinated.add(i);
      coordinated.add(i + 1);
      a.coordinatedWith.push(i + 1);
      b.coordinatedWith.push(i);
    };
    // coordination-split partners (adjacent, same origin span)
    if (a.splitFrom !== undefined && a.splitFrom === b.splitFrom) {
      joinCoordinated();
      continue;
    }
    // joined only by and/or
    if (gap.length === 1 && (gap[0] === "and" || gap[0] === "or")) {
      joinCoordinated();
      continue;
    }
    // of-phrase: A …of B, or A ending in "of" directly before B
    const aEndsOf = a.text === "of" || a.text.endsWith(" of");
    const ofGap =
      (gap.length === 1 && gap[0] === "of") ||
      (gap.length === 2 && gap[0] === "of" &&
        (gap[1] === "a" || gap[1] === "an" || gap[1] === "the"));
    if (ofGap || (aEndsOf && gap.length === 0)) {
      uf.union(i, i + 1);
      ofLeft.add(i);
      ofRight.add(i + 1);
      continue;
    }
    if (gap.length === 0 && isModifierClass(a.text)) {
      // ordinal/number directly before a mention: attaches as modifier
      uf.union(i, i + 1);
      ordinalAttached.add(i);
      continue;
    }
    if (gap.length === 0 && a.words === 1 && b.words >= 2) {
      // a lone word directly before a multiword mention reads as
      // its modifier ("big" in "big pot of soup", "new" in "new
      // girlfriend" when the pair scans separately)
      uf.union(i, i + 1);
      modifierAttached.add(i);
      continue;
    }
    if (gap.length === 0) {
      // plain adjacency: a compound or a comma list (tokenisation
      // strips commas, so the two look alike) — co-topics, one phrase
      joinCoordinated();
      continue;
    }
  }

  // phrase numbers in first-appearance order
  const phraseOf = new Map<number, number>();
  let next = 0;
  mentions.forEach((m, i) => {
    const root = uf.find(i);
    if (!phraseOf.has(root)) phraseOf.set(root, next++);
    m.phrase = phraseOf.get(root)!;
  });

  mentions.forEach((m, i) => {
    // Head/modifier relations outrank coordination: a mention can
    // be both (an of-phrase head that also sits next to a stray
    // content word), and its role inside its own phrase is the
    // head/modifier one.
    if (isModifierClass(m.text)) m.role = "modifier";
    else if (ofLeft.has(i) || gerundLeft.has(i)) m.role = "modifier";
    else if (ofRight.has(i) || gerundRight.has(i)) m.role = "head";
    else if (coordinated.has(i)) m.role = "coordinated";
    else if (ordinalAttached.has(i) || modifierAttached.has(i)) m.role = "modifier";
    else m.role = "single";
  });
}

/* ---------------- the breakdown builder ------------------------- */

function buildBreakdown(
  g: CskgGraph,
  text: string,
  activeTopics: number[],
  extraTopicIds: number[] = [],
  historyIds: ReadonlySet<number> = new Set(),
  disposition: ClarificationDisposition = "moderate",
  annotation: AnnotatorDoc | null = null,
): Breakdown {
  const lower = text.toLowerCase();
  const spans = tokeniseSpans(text);
  const words = spans.map((t) => t.word);
  const breaks = sentenceBreaks(lower);
  const rawSpans = splitCoordinations(g, scanSpans(g, words));

  const mentions: Mention[] = rawSpans.map((s) => {
    const charStart = spans[s.start].start;
    const charEnd = spans[s.start + s.words - 1].end;
    const m: Mention = {
      text: s.text,
      start: s.start,
      words: s.words,
      charStart,
      charEnd,
      sentence: sentenceIndexAt(lower, breaks, charStart),
      phrase: 0,
      role: "single",
      candidates: candidatesForSpan(g, s),
      chosen: -1,
      ambiguous: false,
      coordinatedWith: [],
      positionBonus: W.other,
    };
    if (s.splitFrom !== undefined) m.splitFrom = s.splitFrom;
    return m;
  });

  assignPhrasesAndRoles(mentions, words);

  // sentence position: first content mention of each sentence +8
  const firstContent = new Map<number, number>();
  mentions.forEach((m, i) => {
    if (!isContentSurface(m.text)) return;
    if (!firstContent.has(m.sentence)) firstContent.set(m.sentence, i);
  });
  mentions.forEach((m, i) => {
    m.positionBonus = firstContent.get(m.sentence) === i ? W.subject : W.other;
  });

  // score candidates, choose, record ambiguity. E4: the topic
  // sets include the operative context's situation facets —
  // Context pressure enters candidate scoring DURING analysis
  // (G5's relocation), beside memory's active topics.
  const topicSets = buildTopicSets(g, [...activeTopics, ...extraTopicIds]);
  for (const m of mentions) {
    // Parser function spans (INTJ/AUX: hey, should) are scaffolding,
    // never referents — skip choosing instead of stoplisting words.
    if (annotation && isParserFunctionSpan(annotation, m.charStart, m.charEnd)) {
      m.chosen = -1;
      m.resolverNote = parserFunctionReason(annotation, m.charStart, m.charEnd);
      continue;
    }
    for (const c of m.candidates) scoreCandidate(g, c, m, topicSets);
    // A mention sitting inside one noun chunk ("winter coat") is
    // phrase-shaped: a small nudge, applied to every rival alike.
    if (annotation && chunkContainsSpan(annotation, m.charStart, m.charEnd)) {
      for (const c of m.candidates) {
        c.score += 2;
        c.reasons.push("parser: noun chunk (+2)");
      }
    }
    let best = -1;
    m.candidates.forEach((c, ci) => {
      if (best < 0 || c.score > m.candidates[best].score) best = ci;
    });
    m.chosen = best;
    if (best >= 0) {
      const chosenId = m.candidates[best].id;
      m.ambiguous = m.candidates.some(
        (c, ci) => ci !== best && disjoint(g, chosenId, c.id),
      );
    }
  }

  // E4: the AmbiguityResolver's ground-1 review. Where rival
  // candidates score within a near-tie and one of them is a
  // referent the conversation (or the person model) has already
  // established, what the person said settles the choice —
  // silently, and recorded on the mention for the trace.
  if (historyIds.size) {
    for (const m of mentions) {
      if (m.candidates.length < 2 || m.chosen < 0) continue;
      const sorted = m.candidates
        .map((c, i) => ({ c, i }))
        .sort((a, b) => b.c.score - a.c.score);
      const gap = sorted[0].c.score - sorted[1].c.score;
      if (gap >= 4) continue;
      const historyCand = m.candidates.find((c) => historyIds.has(c.id));
      if (!historyCand) continue;
      const verdict = resolveRivalReadings({
        rivals: m.candidates.map((c) => ({
          key: String(c.id),
          label: c.text,
          score: c.score,
          cluster: null,
          gravity: historyIds.has(c.id),
        })),
        historyKey: String(historyCand.id),
        stakes: "statement",
        disposition,
        asksUsed: 0,
        askedLastTurn: false,
      });
      if (verdict.key !== null && verdict.key !== String(m.candidates[m.chosen].id)) {
        const idx = m.candidates.findIndex((c) => String(c.id) === verdict.key);
        if (idx >= 0) {
          m.chosen = idx;
          m.resolverNote = `resolver (ground 1, history): ${verdict.reason}`;
        }
      } else if (verdict.ground === "history") {
        m.resolverNote = `resolver (ground 1, history): ${verdict.reason}`;
      }
    }
  }

  // chosen referents, in mention order (the E1 view)
  const terms: ResolvedTerm[] = [];
  const seenTerm = new Set<number>();
  for (const m of mentions) {
    if (m.chosen < 0) continue;
    const c = m.candidates[m.chosen];
    if (seenTerm.has(c.id)) continue;
    seenTerm.add(c.id);
    const t: ResolvedTerm = { id: c.id, text: c.text, start: m.start, words: m.words };
    if (c.via === "form-variant") t.formVariant = `${m.text}→${c.text}`;
    terms.push(t);
  }

  // topics: scored chosen referents + head-word expansions
  const topics: ScoredTerm[] = [];
  const seenTopic = new Set<number>();
  for (const m of mentions) {
    if (m.chosen < 0) continue;
    const c = m.candidates[m.chosen];
    if (!isContentSurface(c.text)) continue;
    if (seenTopic.has(c.id)) continue;
    seenTopic.add(c.id);
    const t: ScoredTerm = {
      id: c.id, text: c.text, start: m.start, words: m.words,
      score: c.score, reasons: [...c.reasons],
    };
    if (c.via === "form-variant") t.formVariant = `${m.text}→${c.text}`;
    topics.push(t);
  }
  const expansions: ScoredTerm[] = [];
  for (const t of [...topics]) {
    if (t.text.split(" ").length < 2) continue;
    const parts = t.text.split(" ");
    for (const candText of [parts[parts.length - 1], parts.slice(1).join(" ")]) {
      for (const variant of [candText, candText.replace(/s$/, "")]) {
        const id = g.id(variant);
        if (id !== undefined && !seenTopic.has(id)) {
          seenTopic.add(id);
          expansions.push({
            id, text: variant, start: t.start, words: 1,
            score: t.score - 8,
            reasons: [`head-word expansion of "${t.text}" (−8)`],
          });
        }
      }
    }
  }
  topics.push(...expansions);
  topics.sort((a, b) => b.score - a.score || a.start - b.start || b.words - a.words);

  return {
    text,
    lower,
    sentences: text.split(/(?<=[.!?])\s+/).filter(Boolean),
    words,
    terms,
    mentions,
    topics,
    contents: null,
    annotation,
  };
}

function isContentSurface(text: string): boolean {
  return (
    !text.split(" ").every((w) => STOPWORDS.has(w)) &&
    !/^(what|how|why|where|when|who|which)\b/.test(text)
  );
}

/**
 * B's turn entry: analyse the turn text into the workspace. The
 * annotation is the parser sidecar's read-only structure (or null
 * for parser-free behaviour); turn.ts loads it from ANSCI_ANNOTATION.
 */
export function analyseInto(
  ws: TurnWorkspace,
  g: CskgGraph,
  annotation: AnnotatorDoc | null = null,
): void {
  const text = ws.input.trim();
  // E4: discourse reads the OPERATIVE CONTEXT (context.ts) —
  // the situation's facet ids join memory's topics as scoring
  // context, and the history set (active topics + the person's
  // fact referents) is what the resolver's ground 1 reviews
  // against. Facet ids are capped: the season/daypart words
  // lead the facet list, and a dozen sets is pressure enough.
  const ctx = ws.context;
  const extraTopicIds = ctx ? ctx.situationIds.slice(0, 10) : [];
  const historyIds = new Set<number>([
    ...(ws.activeContext?.topics ?? []),
    ...(ctx?.personFactIds ?? []),
  ]);
  if (ctx) {
    noteStep(ws, "context", "compose",
      `discourse consults the operative context during analysis: situation facet sets [${ctx.situationFacets.slice(0, 10).map((f) => f.text).join(", ")}]; history set ${historyIds.size} referents`);
  }
  const bd = buildBreakdown(
    g, text, ws.activeContext?.topics ?? [],
    extraTopicIds, historyIds, ws.role?.clarificationDisposition ?? "moderate",
    annotation,
  );
  ws.breakdown = bd;
  if (annotation) {
    noteStep(
      ws, "discourse", "resolve",
      `parser: annotation (${annotation.tokens.length} tokens, ` +
      `${annotation.entities.length} entities, ${annotation.chunks.length} chunks) — ` +
      `read-only structure, longest-match still the referent finder`,
    );
  }
  for (const m of bd.mentions) {
    const candDesc = m.candidates
      .map((c) => `"${c.text}" (${c.via}, score ${c.score})`)
      .join(" | ");
    const chosen = m.chosen >= 0 ? m.candidates[m.chosen] : null;
    noteStep(
      ws, "discourse", "resolve",
      `mention "${m.text}" [${m.charStart}–${m.charEnd}] phrase ${m.phrase} role ${m.role}` +
        (m.splitFrom ? ` · split from "${m.splitFrom}"` : "") +
        `: ${candDesc}` +
        (chosen
          ? ` → chose "${chosen.text}" (${chosen.reasons.join("; ")})`
          : " → no candidate") +
        (m.ambiguous ? " · rival senses disjoint — ambiguity recorded" : "") +
        (m.resolverNote ? ` · ${m.resolverNote}` : ""),
    );
  }
  if (bd.topics.length) {
    noteStep(
      ws, "discourse", "resolve",
      `topics ranked: ${bd.topics
        .slice(0, 5)
        .map((t) => `${t.text} (${t.score})`)
        .join(", ")}`,
    );
  }
  // The contents breakdown (contents.ts): categorise the chosen
  // referents into people / places / things / times, and record
  // the kind choices in the trace like every other choice B makes.
  bd.contents = analyseContents(g, bd.mentions, bd.words, ws.situation?.place?.name ?? null, annotation);
  for (const e of bd.contents.entries) {
    noteStep(ws, "discourse", "resolve", contentsTraceLine(e));
  }
}

/* ---------------- event matching (ATOMIC) ----------------------- */

/** ATOMIC events are terms carrying at: outgoing edges. */
export function isEventTerm(g: CskgGraph, id: number): boolean {
  return g.outEdges(id).some((e) => e.rel.startsWith("at:"));
}

/** Best ATOMIC event whose words overlap the input's content words. */
export function matchEvent(
  g: CskgGraph,
  words: string[],
  candidates: ResolvedTerm[],
): ResolvedTerm | null {
  const content = new Set(words.filter((w) => !STOPWORDS.has(w)));
  let best: { term: ResolvedTerm; score: number } | null = null;
  for (const cand of candidates) {
    if (!isEventTerm(g, cand.id)) continue;
    const evWords = cand.text.split(" ").filter((w) => !STOPWORDS.has(w));
    const overlap = evWords.filter((w) => content.has(w)).length;
    const score = overlap / Math.max(1, evWords.length);
    if (overlap >= 1 && score >= 0.5 && (!best || score > best.score)) {
      best = { term: cand, score };
    }
  }
  return best?.term ?? null;
}

/* ---------------- event TEMPLATE matching (depth pass) ----------
 *
 * matchEvent above only finds ATOMIC events the utterance already
 * names as terms. But ATOMIC keys its events as PersonX interaction
 * templates — "personx loses their house keys", "personx can't
 * fall asleep", "personx stays up all night studying" — and a
 * paraphrased question ("How do people feel when they lose their
 * keys?") names none of them literally. This matcher is the
 * derivation layer over that keying (design §8 depth pass, §10
 * graph-first): it reduces the utterance's event clause to
 * content lemmas, expands them (affix forms, the loader's FormOf
 * side store, /r/Synonym neighbours — every expansion recorded),
 * and scores the graph's ATOMIC event templates by weighted
 * lemma overlap. It returns a match only above a stated
 * threshold, with the full scoring record for the trace; below
 * it, callers fall back exactly as they did before it existed.
 * It holds no knowledge of its own: every candidate is a graph
 * term, every conclusion drawn from it cites real at: edges.
 */

/** Words that scaffold an event QUESTION, never the event itself. */
const EVENT_UTT_DROP = new Set([
  "what", "how", "why", "when", "where", "who", "which",
  "do", "does", "did", "is", "are", "was", "were", "be", "been", "being",
  "can", "could", "will", "would", "shall", "should", "may", "might",
  "people", "person", "someone", "somebody", "anyone", "everyone",
  "you", "they", "he", "she", "we", "it", "i", "one",
  // the operative verbs of the question families themselves
  "want", "wants", "need", "needs", "feel", "feels", "react", "reacts",
  "intend", "intends", "happen", "happens", "happened",
  // articles, prepositions, possessives
  "a", "an", "the", "to", "in", "on", "at", "of", "for", "with",
  "their", "his", "her", "my", "your", "our", "its", "them", "him",
  "us", "me",
]);

/** Scaffolding inside an ATOMIC event LABEL (actor tokens, glue). */
const EVENT_LABEL_DROP = new Set([
  "personx", "persony", "a", "an", "the", "to", "in", "on", "at",
  "of", "for", "their", "his", "her", "my", "your", "our", "its",
]);

/**
 * The affix-form set of a word: the surface, its plausible base
 * forms (strip -s/-es/-ed/-ing, -ies→y, dedoubling, e-restoration)
 * and its plausible inflections (add -s/-es/-ed/-ing, -y→-ies).
 * Matching is set intersection, so "lose" reaches "loses" and
 * "apologize" reaches "apologizes" without a stemmer's opinions.
 */
export function formSet(w: string): Set<string> {
  const out = new Set<string>([w]);
  const add = (x: string): void => {
    if (x.length >= 2) out.add(x);
  };
  const dedouble = (b: string): string =>
    b.length >= 2 && b[b.length - 1] === b[b.length - 2] && !/[aeiou]/.test(b[b.length - 1])
      ? b.slice(0, -1)
      : b;
  if (w.endsWith("'s")) add(w.slice(0, -2));
  if (w.endsWith("ies") && w.length > 4) add(w.slice(0, -3) + "y");
  if (w.endsWith("ing") && w.length > 5) {
    const b = w.slice(0, -3);
    add(b); add(b + "e"); add(dedouble(b));
  }
  if (w.endsWith("ed") && w.length > 4) {
    const b = w.slice(0, -2);
    add(b); add(b + "e"); add(dedouble(b));
  }
  if (w.endsWith("es") && w.length > 3) add(w.slice(0, -2));
  if (w.endsWith("s") && w.length > 2) add(w.slice(0, -1));
  add(w + "s");
  add(w + "es");
  add(w + "ed");
  add(w + "ing");
  if (w.endsWith("e")) add(w.slice(0, -1) + "ing");
  if (/[^aeiou]y$/.test(w)) add(w.slice(0, -1) + "ies");
  return out;
}

/** Form keys of a word, bridged by the loader's FormOf side store. */
function lemmaKeys(g: CskgGraph, w: string): Set<string> {
  const keys = formSet(w);
  const lemma = g.lemmaOf(w);
  if (lemma && lemma !== w) {
    keys.add(lemma);
    for (const k of formSet(lemma)) keys.add(k);
  }
  return keys;
}

/** a-prefix derivation: asleep~sleep, awake~wake (weak evidence). */
function rootMatch(a: string, b: string): boolean {
  const [long, short] = a.length > b.length ? [a, b] : [b, a];
  return long.length === short.length + 1 && long[0] === "a" && long.slice(1) === short;
}

interface EventIndex {
  /** lemma key → ATOMIC event term ids whose labels use it */
  byKey: Map<string, number[]>;
  /** event term id → its content words (label minus scaffolding) */
  contentWords: Map<number, string[]>;
}

const eventIndexCache = new WeakMap<CskgGraph, EventIndex>();

function eventIndex(g: CskgGraph): EventIndex {
  let idx = eventIndexCache.get(g);
  if (idx) return idx;
  idx = { byKey: new Map(), contentWords: new Map() };
  for (const id of g.eventTermIds()) {
    const words = g.terms[id]
      .split(" ")
      .filter((w) => w && !EVENT_LABEL_DROP.has(w));
    if (!words.length) continue;
    idx.contentWords.set(id, words);
    const keys = new Set<string>();
    for (const w of words) for (const k of lemmaKeys(g, w)) keys.add(k);
    for (const k of keys) {
      const arr = idx.byKey.get(k);
      if (arr) arr.push(id);
      else idx.byKey.set(k, [id]);
    }
  }
  eventIndexCache.set(g, idx);
  return idx;
}

export interface TemplatePair {
  utterance: string;
  event: string;
  via: "exact" | "form" | "synonym" | "root";
  weight: number;
}

export interface EventTemplateMatch {
  id: number;
  text: string;
  /** F1 of weighted precision/recall over content words */
  score: number;
  /** weighted precision: how much of what the person SAID the match accounts for */
  coverage: number;
  matched: TemplatePair[];
  /** expansion steps that fed the winning match, for the trace */
  expansions: string[];
}

export interface EventTemplateResult {
  match: EventTemplateMatch | null;
  /** event templates scored (the candidate pool's size) */
  considered: number;
  /** best below-threshold candidate, for honest tracing */
  bestRejected: { text: string; score: number } | null;
  /** every expansion step generated from the utterance */
  expansions: string[];
}

const PAIR_WEIGHT = { exact: 2, form: 1.5, synonym: 1, root: 0.75 } as const;
export const TEMPLATE_THRESHOLD = 0.5;
/** A template match strong enough to lead an event-consequence turn. */
export const TEMPLATE_STRONG = 0.65;

/**
 * Score the graph's ATOMIC event templates against the utterance's
 * event clause (the words after the last "when", or all of them).
 * Deterministic: candidates are totally ordered by (F1, fewer
 * event words, higher attestation, lower term id).
 */
export function matchEventTemplate(g: CskgGraph, words: string[]): EventTemplateResult {
  const idx = eventIndex(g);
  const whenAt = words.lastIndexOf("when");
  const clause = whenAt >= 0 ? words.slice(whenAt + 1) : words;
  const utt: string[] = [];
  for (const w of clause) {
    if (!EVENT_UTT_DROP.has(w) && !utt.includes(w)) utt.push(w);
  }
  const expansions: string[] = [];
  if (!utt.length) return { match: null, considered: 0, bestRejected: null, expansions };

  // per-utterance-word resources: lemma keys, synonym surfaces
  const uttKeys = new Map<string, Set<string>>();
  const uttSyns = new Map<string, Set<string>>();
  for (const w of utt) {
    uttKeys.set(w, lemmaKeys(g, w));
    const lemma = g.lemmaOf(w);
    if (lemma && lemma !== w) expansions.push(`${w} → ${lemma} (FormOf)`);
    const syns = new Set<string>();
    const wid = g.id(w);
    if (wid !== undefined) {
      const top = g
        .outEdges(wid, "/r/Synonym")
        .filter((e) => !g.terms[e.to].includes(" ") && g.terms[e.to].length >= 3)
        .sort((a, b) => b.support - a.support)
        .slice(0, 4);
      for (const e of top) {
        syns.add(g.terms[e.to]);
        expansions.push(`${w} → ${g.terms[e.to]} (synonym)`);
      }
    }
    uttSyns.set(w, syns);
  }

  // candidate pool: events sharing any lemma or synonym key
  const pool = new Set<number>();
  for (const w of utt) {
    for (const k of uttKeys.get(w)!) {
      for (const id of idx.byKey.get(k) ?? []) pool.add(id);
    }
    for (const s of uttSyns.get(w)!) {
      for (const k of lemmaKeys(g, s)) {
        for (const id of idx.byKey.get(k) ?? []) pool.add(id);
      }
    }
  }

  const evKeys = new Map<string, Set<string>>();
  const keysOf = (w: string): Set<string> => {
    let ks = evKeys.get(w);
    if (!ks) {
      ks = lemmaKeys(g, w);
      evKeys.set(w, ks);
    }
    return ks;
  };
  const supportOf = (id: number): number => {
    let s = 0;
    for (const e of g.outEdges(id)) if (e.rel.startsWith("at:")) s += e.support;
    return s;
  };

  interface Scored {
    id: number;
    score: number;
    coverage: number;
    matchedWeight: number;
    pairs: TemplatePair[];
    strongPair: boolean;
    words: number;
    support: number;
  }
  const scored: Scored[] = [];
  for (const id of pool) {
    const evWords = idx.contentWords.get(id);
    if (!evWords) continue;
    // all candidate word pairs, best via first, greedily assigned
    const pairs: { u: string; e: string; via: TemplatePair["via"]; weight: number }[] = [];
    for (const u of utt) {
      for (const e of evWords) {
        let via: TemplatePair["via"] | null = null;
        if (u === e) via = "exact";
        else if ([...uttKeys.get(u)!].some((k) => keysOf(e).has(k))) via = "form";
        else if (
          uttSyns.get(u)!.has(e) ||
          [...uttSyns.get(u)!].some((s) => formSet(s).has(e) || formSet(e).has(s))
        ) via = "synonym";
        else if (rootMatch(u, e)) via = "root";
        if (via) pairs.push({ u, e, via, weight: PAIR_WEIGHT[via] });
      }
    }
    pairs.sort((a, b) => b.weight - a.weight);
    const usedU = new Set<string>();
    const usedE = new Set<string>();
    const taken: TemplatePair[] = [];
    let matchedWeight = 0;
    for (const p of pairs) {
      if (usedU.has(p.u) || usedE.has(p.e)) continue;
      usedU.add(p.u);
      usedE.add(p.e);
      taken.push({ utterance: p.u, event: p.e, via: p.via, weight: p.weight });
      matchedWeight += p.weight;
    }
    if (!matchedWeight) continue;
    const precision = matchedWeight / (2 * utt.length);
    const recall = matchedWeight / (2 * evWords.length);
    const f1 = (2 * precision * recall) / (precision + recall);
    scored.push({
      id, score: f1, coverage: precision, matchedWeight, pairs: taken,
      strongPair: taken.some((p) => p.via === "exact" || p.via === "form"),
      words: evWords.length, support: supportOf(id),
    });
  }
  scored.sort(
    (a, b) =>
      b.score - a.score || a.words - b.words || b.support - a.support || a.id - b.id,
  );
  const best = scored[0];
  if (!best) return { match: null, considered: pool.size, bestRejected: null, expansions };
  // Acceptance: F1 at the threshold, at least one exact-or-form
  // pair (a match may not rest on synonym/root drift alone),
  // matched weight ≥ 1.5 — one solid pair (a single-word event
  // like "personx apologizes" can never weigh more) — and
  // COVERAGE: the match must account for at least 60% of what
  // the person said. Coverage is what stops a lone generic word
  // from keying the wrong event: "can't sleep" matched "lets
  // persony sleep" on "sleep" alone (coverage 0.50 — the
  // discriminative "can't" unaccounted) while every true match
  // in the depth evaluation covers ≥ 0.75 of its question.
  const bestRejected =
    best.score < TEMPLATE_THRESHOLD || !best.strongPair ||
    best.matchedWeight < 1.5 || best.coverage < 0.6
      ? { text: g.terms[best.id], score: best.score }
      : null;
  if (bestRejected) {
    return { match: null, considered: pool.size, bestRejected, expansions };
  }
  const usedExpansions = expansions.filter((x) =>
    best.pairs.some((p) => x.startsWith(`${p.utterance} →`)),
  );
  return {
    match: {
      id: best.id,
      text: g.terms[best.id],
      score: best.score,
      coverage: best.coverage,
      matched: best.pairs,
      expansions: usedExpansions,
    },
    considered: pool.size,
    bestRejected: null,
    expansions,
  };
}

const QUESTION_LED = /^(what|how|why|where|when|who|which)\b/;

export function isContentTerm(r: ResolvedTerm): boolean {
  return (
    !r.text.split(" ").every((w) => STOPWORDS.has(w)) && !QUESTION_LED.test(r.text)
  );
}

/**
 * G9: words that frame a question (people, someone, happens)
 * are not the subject when a content object is also present.
 * "Where do people keep coffee?" is about coffee.
 */
export const QUESTION_SCAFFOLDING = new Set([
  "people", "someone", "somebody", "anyone", "everybody", "person",
  "persons", "one", "thing", "things", "stuff",
]);

/** Greeting/thanks words are social moves, never the topic. */
export const PHATIC_SCAFFOLDING = new Set([
  "hi", "hello", "hey", "howdy", "thanks", "thank", "thx", "ty",
  "bye", "goodbye",
]);

/** Degree adverbs modify a state; they are not the topic ("pretty tired"). */
export const DEGREE_SCAFFOLDING = new Set([
  "pretty", "really", "very", "quite", "rather", "fairly", "slightly",
]);

export function isPhaticSubject(text: string): boolean {
  const t = text.toLowerCase();
  const head = t.split(/\s+/)[0] ?? "";
  return PHATIC_SCAFFOLDING.has(head) || PHATIC_SCAFFOLDING.has(t);
}

export function isScaffoldSubject(text: string): boolean {
  const t = text.toLowerCase();
  const head = t.split(/\s+/)[0] ?? "";
  return isPhaticSubject(text) || DEGREE_SCAFFOLDING.has(head) || DEGREE_SCAFFOLDING.has(t);
}

export function preferQuestionSubject<T extends { text: string }>(candidates: T[]): T[] {
  const content = candidates.filter((c) => {
    const head = c.text.toLowerCase().split(/\s+/)[0] ?? "";
    return !QUESTION_SCAFFOLDING.has(head) && !QUESTION_SCAFFOLDING.has(c.text.toLowerCase()) &&
      !isScaffoldSubject(c.text);
  });
  return content.length ? content : candidates;
}

export function pickSalient(g: CskgGraph, resolved: ResolvedTerm[]): ResolvedTerm | null {
  const cands = contentCandidates(g, resolved);
  return cands[0] ?? resolved[0] ?? null;
}

/**
 * Candidate subjects in E1's preference order: content terms
 * (multiword first, then sentence order), then head-word expansions
 * of multiword terms ("pot of soup" also offers "soup"; "chop
 * onions" offers "onion"). Kept as the fallback ordering;
 * breakdown.topics (scored) is the primary ranking since E2.
 */
export function contentCandidates(
  g: CskgGraph,
  resolved: ResolvedTerm[],
): ResolvedTerm[] {
  const content = resolved.filter(isContentTerm);
  const ordered = content
    .slice()
    .sort((a, b) => b.words - a.words || a.start - b.start);
  const seen = new Set(ordered.map((r) => r.id));
  const out = [...ordered];
  for (const r of content) {
    if (r.words < 2) continue;
    const parts = r.text.split(" ");
    for (const candText of [parts[parts.length - 1], parts.slice(1).join(" ")]) {
      for (const variant of [candText, candText.replace(/s$/, "")]) {
        const id = g.id(variant);
        if (id !== undefined && !seen.has(id)) {
          seen.add(id);
          out.push({ id, text: variant, start: r.start, words: 1 });
        }
      }
    }
  }
  return out;
}
