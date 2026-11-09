/**
 * router.ts — the router (§7): lookup first, then route, clarify, or
 * decline. Sits in front of the reasoner on every turn; hands it a
 * resolved QueryIntent instead of asking it to infer one from an
 * ambiguous sentence. Also the turn pipeline's conductor (§7.2, §8):
 * it owns SessionState (episodic memory), builds the ThoughtTrace with
 * the reasoner, computes the Situation (§8.9), runs the pre-speech
 * checks (§8.2), renders through the translation layer (§9), and is the
 * only writer of episodic state and experience events (§8.7).
 */
import { Graph, GraphNode } from "./graph";
import {
  answerIntent,
  type QueryIntent,
  type ReasonerResult,
} from "./reason";
import {
  climbToAnchor,
  getDefaultExtract,
  mappedConceptForSynset,
  synsetsForLemma,
  synsetsForSurface,
  type SynsetRecord,
  type WordNetExtract,
} from "./wordnet";
import {
  TraceBuilder,
  findConflicts,
  type ThoughtTrace,
} from "./thought";
import { renderAnswer, type RenderedAnswer } from "./render";
import {
  computeSituation,
  shadowSituation,
  type PlaceResolver,
  type Situation,
  type SituationLocation,
} from "./situation";
import { appendExperienceEvent, type ExperienceEvent } from "./experience";
import { directClassifications } from "./engine";

/* ------------------------------------------------------------------ */
/* §7.8 route types                                                    */
/* ------------------------------------------------------------------ */

export type SurfaceMode = "plain" | "framework" | "debug";

export type OntologyRole =
  | "primitive-element"
  | "primitive-polarity"
  | "primitive-trigram"
  | "mapped-concept"
  | "correspondence-value"
  | "quality"
  | "dictionary-only"
  | "absent";

export interface ResolvedTerm {
  surface: string;
  lemma: string;
  slot: "subject" | "object" | "target" | "quality" | "category" | "classifier-value";
  nodeId?: string; // ontology/seed node, when resolved to one
  synsetId?: string; // WordNet sense, when resolved to one
  ontologyRole?: OntologyRole;
  resolvedBy:
    | "curated-mapping"
    | "climb"
    | "topic"
    | "user"
    | "single-sense"
    | "frame"
    | "ontology-name";
}

export interface RouteToIntent {
  kind: "route";
  intent: QueryIntent;
  terms: ResolvedTerm[];
  surfaceMode: SurfaceMode;
  decisionReason: string; // tree step + discriminator, e.g. "D8/climb"
}

export interface ClarificationBranch {
  id: string;
  label: string;
  detail?: string;
  route: RouteToIntent; // fully resolved; execution may decline, never clarify
}

export type RouteDecision =
  | RouteToIntent
  | {
      kind: "clarify";
      question: string;
      branches: ClarificationBranch[];
      originalQuestion: string;
      surfaceMode: SurfaceMode;
      decisionReason: string; // e.g. "D5/presupposition-clash"
    }
  | {
      kind: "decline";
      reason: string; // internal reason code + explanation
      userMessage: string; // natural, surface-mode phrasing
      alternatives: Array<{
        label: string;
        route?: RouteToIntent; // dispatch directly when fully resolved
        question?: string; // otherwise, re-run this text as a fresh turn
      }>;
      surfaceMode: SurfaceMode;
      decisionReason: string; // e.g. "D6/unsupported-relation"
    };

/* ------------------------------------------------------------------ */
/* §7.6 session memory                                                 */
/* ------------------------------------------------------------------ */

export interface ResolvedSense {
  term: string; // canonical lemma, e.g. "cold"
  surface: string; // surface that settled it, e.g. "colds"
  synsetId: string;
  ontologyNodeId?: string; // mapped concept/anchor, when one exists
  resolvedBy: "curated-mapping" | "climb" | "topic" | "user" | "single-sense" | "frame";
  turn: number;
}

export interface TopicFrame {
  id: string; // e.g. "meteorology"
  label: string; // e.g. "weather"
  anchorNodeIds: string[]; // resolved subjects that established the frame
  evidenceTerms: string[]; // e.g. ["sleet", "precipitation"]
  setAtTurn: number;
  lastUsedTurn: number;
}

export interface PendingClarification {
  originalQuestion: string;
  askedAtTurn: number;
  branches: ClarificationBranch[]; // the same objects rendered to the user
}

export interface SessionCorrection {
  turn: number;
  term: string;
  fromSynsetId?: string;
  toSynsetId: string;
  userText: string;
}

export interface TrainerSignal {
  kind: "sense-correction";
  turn: number;
  term: string;
  originalQuestion: string;
  fromSynsetId?: string;
  toSynsetId: string;
  proposedAction: "propose-sense-bridge" | "propose-evaluation-case" | "none";
  status: "candidate";
}

export interface ResolvedTermRef {
  term: string;
  nodeId?: string;
  synsetId?: string;
  turn: number;
}

export interface SessionState {
  version: 1;
  graphStamp: string; // base edition + graph build identifier
  sessionId: string;
  turn: number;
  resolvedSenses: Record<string, ResolvedSense>; // key: lemma, or lemma#pos
  topicFrame?: TopicFrame;
  pendingClarification?: PendingClarification;
  corrections: SessionCorrection[];
  trainerSignals: TrainerSignal[];
  recentTerms: ResolvedTermRef[]; // bounded, most-recent-first
  recentThoughts: ThoughtTrace[]; // §8.5; bounded ring, last 20 turns
  /** §8.12: episodic situation overrides (user-stated place/season). */
  situationOverrides?: {
    location?: SituationLocation;
    seasonConceptId?: string;
  };
}

export function graphStampFor(extract: WordNetExtract): string {
  return `oewn-${extract.edition}+seed-v1`;
}

let sessionSeq = 0;
export function createSession(graphStamp: string): SessionState {
  return {
    version: 1,
    graphStamp,
    sessionId: `session-${++sessionSeq}`,
    turn: 0,
    resolvedSenses: {},
    corrections: [],
    trainerSignals: [],
    recentTerms: [],
    recentThoughts: [],
  };
}

/* ------------------------------------------------------------------ */
/* §7.3 term lookup                                                    */
/* ------------------------------------------------------------------ */

export interface SenseInfo {
  synsetId: string;
  pos: "n" | "v" | "a";
  lemmas: string[];
  gloss: string;
  mappedConceptId?: string;
  climb?: { anchorNodeId: string; anchorSynsetId: string; hops: number };
}

export interface OntologyMatch {
  nodeId: string;
  nodeType: string;
  layer: string;
  roles: OntologyRole[];
}

export interface TermLookup {
  surface: string;
  lemmaCandidates: { lemma: string; pos: "n" | "v" | "a" }[];
  senses: SenseInfo[];
  ontology: OntologyMatch[];
  dictionaryPresent: boolean;
  sessionSynsetId?: string;
}

interface OntologyIndex {
  byName: Map<string, GraphNode[]>;
  dictionaryWords: Map<string, string>;
}

const ontologyIndexCache = new WeakMap<Graph, OntologyIndex>();
function ontologyIndex(graph: Graph): OntologyIndex {
  let idx = ontologyIndexCache.get(graph);
  if (idx) return idx;
  idx = { byName: new Map(), dictionaryWords: new Map() };
  const add = (key: string, node: GraphNode) => {
    const list = idx!.byName.get(key);
    if (list) {
      if (!list.some((n) => n.id === node.id)) list.push(node);
    } else idx!.byName.set(key, [node]);
  };
  for (const node of graph.allNodes()) {
    if (node.type === "DictionaryEntry") {
      if (node.word) idx.dictionaryWords.set(node.word.toLowerCase(), node.id);
      continue;
    }
    if (
      node.type === "Synset" ||
      node.type === "TextPassage" ||
      node.type === "GraphAdjustment"
    )
      continue;
    add(node.name.toLowerCase(), node);
    for (const syn of graph.synonymsOf(node)) add(syn.toLowerCase(), node);
    // Correspondence values carry their particle in the name ("yu (羽)");
    // the bare leading word is also an index key ("yu").
    const lead = node.name.split(" (")[0];
    if (lead !== node.name) add(lead.toLowerCase(), node);
  }
  ontologyIndexCache.set(graph, idx);
  return idx;
}

function rolesFor(graph: Graph, node: GraphNode): OntologyRole[] {
  const roles: OntologyRole[] = [];
  switch (node.type) {
    case "Element":
      roles.push("primitive-element");
      break;
    case "Polarity":
      roles.push("primitive-polarity");
      break;
    case "Trigram":
      roles.push("primitive-trigram");
      break;
    case "Correspondence":
      roles.push("correspondence-value");
      break;
    case "Quality":
      roles.push("quality");
      break;
    default:
      break;
  }
  if (
    node.properties["synsetId"] !== undefined ||
    graph.outEdges(node.id, "MAPPED_TO").length > 0
  ) {
    roles.push("mapped-concept");
  }
  return roles;
}

const climbCache = new WeakMap<Graph, Map<string, SenseInfo["climb"] | null>>();
function climbOf(graph: Graph, synsetId: string): SenseInfo["climb"] | undefined {
  let cache = climbCache.get(graph);
  if (!cache) {
    cache = new Map();
    climbCache.set(graph, cache);
  }
  if (!cache.has(synsetId)) {
    const climb = climbToAnchor(graph, synsetId, 6);
    cache.set(
      synsetId,
      climb
        ? {
            anchorNodeId: climb.anchor.id,
            anchorSynsetId: climb.anchorSynset.id,
            hops: climb.chain.length,
          }
        : null,
    );
  }
  return cache.get(synsetId) ?? undefined;
}

/** Slot-text cleanups, in order: the phrase as given, minus "the",
 *  minus a trailing classifier word ("water element" → "water"). */
function candidateStrings(raw: string): string[] {
  const base = raw.trim().toLowerCase();
  const out: string[] = [];
  const push = (s: string) => {
    if (s && !out.includes(s)) out.push(s);
  };
  push(base);
  push(base.replace(/^(the|a|an)\s+/, ""));
  push(base.replace(/\s+(element|polarity|trigram)$/, ""));
  push(base.replace(/^(the|a|an)\s+/, "").replace(/\s+(element|polarity|trigram)$/, ""));
  return out;
}

export interface LookupContext {
  graph: Graph;
  extract: WordNetExtract;
  session: SessionState;
  /** The turn's computed Situation (§8.9) — set by routeTurn before
   *  routing, so frames that judge against the season here (§6.8
   *  balance) can read it. */
  situation?: Situation;
}

export function lookupTerm(ctx: LookupContext, rawSurface: string): TermLookup {
  const { graph, extract, session } = ctx;
  const idx = ontologyIndex(graph);
  const surface = rawSurface.trim();
  const result: TermLookup = {
    surface,
    lemmaCandidates: [],
    senses: [],
    ontology: [],
    dictionaryPresent: false,
  };
  for (const candidate of candidateStrings(surface)) {
    const nodes = idx.byName.get(candidate) ?? [];
    if (nodes.length > 0 && result.ontology.length === 0) {
      result.ontology = nodes.map((node) => ({
        nodeId: node.id,
        nodeType: node.type,
        layer: node.layer,
        roles: rolesFor(graph, node),
      }));
    }
    if (idx.dictionaryWords.has(candidate)) result.dictionaryPresent = true;
    const surfaceLookup = synsetsForSurface(extract, candidate);
    if (surfaceLookup.synsets.length > 0 && result.senses.length === 0) {
      result.lemmaCandidates = surfaceLookup.candidates;
      result.senses = surfaceLookup.synsets.map((s) => ({
        synsetId: s.id,
        pos: s.pos,
        lemmas: s.lemmas,
        gloss: s.gloss,
        mappedConceptId: mappedConceptForSynset(graph, s.id)?.id,
      }));
    }
    if (result.ontology.length > 0 || result.senses.length > 0) break;
  }
  // Session memory: a settled sense for any candidate lemma.
  for (const cand of result.lemmaCandidates) {
    const resolved =
      session.resolvedSenses[cand.lemma] ?? session.resolvedSenses[`${cand.lemma}#${cand.pos}`];
    if (resolved) {
      result.sessionSynsetId = resolved.synsetId;
      break;
    }
  }
  if (!result.sessionSynsetId) {
    const direct = session.resolvedSenses[surface.toLowerCase()];
    if (direct) result.sessionSynsetId = direct.synsetId;
  }
  return result;
}

/** Fill in climb results for a lookup's senses (bounded, cached). */
export function withClimbs(ctx: LookupContext, lookup: TermLookup): TermLookup {
  for (const sense of lookup.senses) {
    if (sense.climb === undefined) sense.climb = climbOf(ctx.graph, sense.synsetId);
  }
  return lookup;
}

const TOPIC_KEYWORDS: Record<string, string[]> = {
  meteorology: [
    "weather", "rain", "snow", "storm", "cloud", "lightning", "thunder",
    "wind", "hail", "sleet", "precipitation", "temperature", "sky",
    "season", "winter", "summer", "freezing", "frost",
  ],
  music: ["pitch", "voice", "singing", "song", "note", "sound", "instrument", "range", "musical"],
};

function topicFit(ctx: LookupContext, sense: SenseInfo): boolean {
  const topic = ctx.session.topicFrame;
  if (!topic) return false;
  const keywords = TOPIC_KEYWORDS[topic.id] ?? [];
  const glossTokens = new Set(sense.gloss.toLowerCase().split(/[^a-z]+/));
  if (keywords.some((k) => glossTokens.has(k))) return true;
  if (sense.climb && topic.anchorNodeIds.includes(sense.climb.anchorNodeId)) return true;
  if (sense.mappedConceptId && topic.anchorNodeIds.includes(sense.mappedConceptId)) return true;
  const anchor = sense.climb
    ? ctx.graph.getNode(sense.climb.anchorNodeId)
    : sense.mappedConceptId
      ? ctx.graph.getNode(sense.mappedConceptId)
      : undefined;
  return anchor?.domain === topic.id;
}

/* ------------------------------------------------------------------ */
/* Frame detection                                                     */
/* ------------------------------------------------------------------ */

type Frame =
  | { kind: "replay" }
  | { kind: "correction"; descriptor: string }
  | { kind: "location_statement"; place: string }
  | { kind: "self_question"; variant: "self" | "time" }
  | { kind: "season_here"; askedSeason?: string }
  | { kind: "tonight" }
  | { kind: "shadow_season"; place: string; askedSeason?: string }
  | { kind: "polarity_check"; targetText: string; polarity: "yin" | "yang" }
  | { kind: "classification"; classifier: "element" | "polarity" | "trigram"; targetText: string }
  // Slice 2c (§6): the engine's question forms.
  | { kind: "restraint"; targetText: string }
  | { kind: "degree_compare"; aText: string; polarity: "yin" | "yang"; bText: string; aspectWord?: string }
  | { kind: "degree_mixed"; aText: string; polarity: "yin" | "yang"; aAspect: string; bText: string; bAspect: string }
  | { kind: "balance"; elementText: string; seasonText?: string }
  | { kind: "correspondence"; sourceText?: string; targetText?: string; category?: string }
  | { kind: "antonym"; targetText: string }
  | { kind: "part_of"; targetText: string; variant: "whole" | "parts"; otherText?: string }
  | { kind: "relatedness"; aText: string; bText: string }
  | { kind: "comparison"; aText: string; bText: string }
  | { kind: "cycle"; targetText: string }
  | { kind: "causal"; subjectText: string; qualityText?: string; objectText?: string; unanchoredActivity?: string }
  | { kind: "ontology"; targetText: string }
  | { kind: "definition"; targetText: string }
  | { kind: "bare"; targetText: string }
  | { kind: "unsupported"; targetText?: string }
  | { kind: "unknown" };

function norm(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ").replace(/[?!.\s]+$/, "");
}

const SEASON_WORDS = ["spring", "summer", "autumn", "fall", "winter"];

function detectFrame(text: string): Frame {
  const t = norm(text);
  let m: RegExpMatchArray | null;

  if (/^(why did you say (that|this)|why that answer|how do you know that)$/.test(t)) {
    return { kind: "replay" };
  }
  if ((m = t.match(/^(?:no|nope)[,.]?\s+(?:i|we)\s+meant\s+(?:the\s+)?(.+)$/))) {
    return { kind: "correction", descriptor: m[1] };
  }
  if (/^(no|not that)\b/.test(t) && /(other one|the other|not that)/.test(t)) {
    return { kind: "correction", descriptor: t.replace(/^(no|not that)[,.]?\s*/, "") };
  }
  if ((m = t.match(/^(?:i'm|i am|we're|we are)\s+(?:in|at|living in)\s+(.+)$/))) {
    return { kind: "location_statement", place: m[1].trim() };
  }
  if ((m = t.match(/^i live in\s+(.+)$/))) {
    return { kind: "location_statement", place: m[1].trim() };
  }
  if ((m = t.match(/^what if (?:i|we) (?:were|was|moved|went|travelled|traveled) (?:in|to) (.+?)(?:[,.—–-]|\s+would|\s+is|\s+was|$)/))) {
    const rest = t.slice(t.indexOf(m[1]) + m[1].length);
    const asked = SEASON_WORDS.find((s) => rest.includes(s) || t.includes(`be ${s}`) || t.includes(`it ${s}`));
    return { kind: "shadow_season", place: m[1].trim(), askedSeason: asked === "fall" ? "autumn" : asked };
  }
  if (/^where are you( located| based)?$/.test(t) || /^where do you live$/.test(t)) {
    return { kind: "self_question", variant: "self" };
  }
  if (/^what time is it( for you)?$/.test(t) || /^what'?s the time( for you)?$/.test(t)) {
    return { kind: "self_question", variant: "time" };
  }
  if ((m = t.match(/^is it (spring|summer|autumn|fall|winter)( here| where you are)?$/))) {
    return { kind: "season_here", askedSeason: m[1] === "fall" ? "autumn" : m[1] };
  }
  if (/^what season is it( here| where you are)?$/.test(t)) {
    return { kind: "season_here" };
  }
  if (/^(and )?here$/.test(t)) {
    return { kind: "season_here" };
  }
  if (/^(will|is) tonight (be )?(long|short|dark|light)$/.test(t)) {
    return { kind: "tonight" };
  }
  if ((m = t.match(/^is (.+?) (yin|yang)$/))) {
    return { kind: "polarity_check", targetText: m[1], polarity: m[2] as "yin" | "yang" };
  }
  if ((m = t.match(/^(?:which|what) (element|polarity|trigram) is (.+)$/))) {
    return { kind: "classification", classifier: m[1] as "element" | "polarity" | "trigram", targetText: m[2] };
  }
  if ((m = t.match(/^what (element|polarity|trigram) does (.+?) belong to$/))) {
    return { kind: "classification", classifier: m[1] as "element", targetText: m[2] };
  }
  // Slice 2c engine frames (§6.5/§6.7/§6.8). The mixed-aspect form is
  // matched first: it is a category error the router must not route.
  if ((m = t.match(/^is (.+?) more (yin|yang) in (?:the )?(\w+) than (.+?) in (?:the )?(\w+)$/))) {
    return { kind: "degree_mixed", aText: m[1], polarity: m[2] as "yin" | "yang", aAspect: m[3], bText: m[4], bAspect: m[5] };
  }
  if ((m = t.match(/^is (.+?) more (yin|yang) than (.+?)(?: (?:in (?:the )?|in terms of )(\w+)(?: aspect)?)?$/))) {
    return { kind: "degree_compare", aText: m[1], polarity: m[2] as "yin" | "yang", bText: m[3], aspectWord: m[4] };
  }
  if ((m = t.match(/^what (?:keeps|holds) (.+?) in check$/)) || (m = t.match(/^what restrains (.+)$/))) {
    return { kind: "restraint", targetText: m[1] };
  }
  if ((m = t.match(/^what (?:balances|moderates) (?:an? )?(?:excess of )?(.+?)(?: in (spring|summer|autumn|fall|winter))?$/))) {
    return { kind: "balance", elementText: m[1], seasonText: m[2] };
  }
  if ((m = t.match(/^what happens (?:when|if) there(?:'s| is) (?:an? )?(?:excess of |too much )?(.+?)(?: in (spring|summer|autumn|fall|winter))?$/))) {
    return { kind: "balance", elementText: m[1], seasonText: m[2] };
  }
  if ((m = t.match(/^what does (.+?) correspond to(?: in (?:the )?(.+))?$/))) {
    return { kind: "correspondence", sourceText: m[1], category: m[2] };
  }
  if ((m = t.match(/^what (sound|color|colour|taste|direction|emotion|organ|organs) goes with (.+)$/))) {
    return { kind: "correspondence", targetText: m[2], category: m[1] };
  }
  if ((m = t.match(/^what (sound|color|colour|taste|direction|emotion|organ|organs) corresponds to (.+)$/))) {
    return { kind: "correspondence", targetText: m[2], category: m[1] };
  }
  if ((m = t.match(/^what goes with (.+)$/))) {
    return { kind: "correspondence", sourceText: m[1] };
  }
  if ((m = t.match(/^(?:what is |what's )?(?:the )?(?:opposite|antonym) of (.+)$/))) {
    return { kind: "antonym", targetText: m[1] };
  }
  if ((m = t.match(/^what part of the body does (.+?) belong to$/))) {
    return { kind: "part_of", targetText: m[1], variant: "whole" };
  }
  if ((m = t.match(/^what is (.+?) part of$/))) {
    return { kind: "part_of", targetText: m[1], variant: "whole" };
  }
  if ((m = t.match(/^what parts does (.+?) have$/))) {
    return { kind: "part_of", targetText: m[1], variant: "parts" };
  }
  if ((m = t.match(/^is (.+?) part of (.+)$/))) {
    return { kind: "part_of", targetText: m[1], variant: "whole", otherText: m[2] };
  }
  if ((m = t.match(/^how are (.+?) and (.+?) (?:related|connected)$/))) {
    return { kind: "relatedness", aText: m[1], bText: m[2] };
  }
  if ((m = t.match(/^how does (.+?) relate to (.+)$/))) {
    return { kind: "relatedness", aText: m[1], bText: m[2] };
  }
  if ((m = t.match(/^compare (.+?) and (.+)$/))) {
    return { kind: "comparison", aText: m[1], bText: m[2] };
  }
  if ((m = t.match(/^what is the difference between (.+?) and (.+)$/))) {
    return { kind: "comparison", aText: m[1], bText: m[2] };
  }
  if ((m = t.match(/^what (?:season |element )?follows (?:from )?(.+)$/)) || (m = t.match(/^what comes after (.+)$/))) {
    return { kind: "cycle", targetText: m[1] };
  }
  if ((m = t.match(/^why do (?:people|we|you) (.+?) at (.+)$/))) {
    return {
      kind: "causal",
      subjectText: m[2],
      unanchoredActivity: m[1].split(" ")[0],
    };
  }
  if ((m = t.match(/^why is (.+?) (\w+(?:er|est)) than (.+)$/))) {
    return { kind: "causal", subjectText: m[1], qualityText: m[2], objectText: m[3] };
  }
  if ((m = t.match(/^why is (.+?) (?:so )?(\w+)$/))) {
    return { kind: "causal", subjectText: m[1], qualityText: m[2] };
  }
  if ((m = t.match(/^why is (.+)$/))) {
    return { kind: "causal", subjectText: m[1] };
  }
  if ((m = t.match(/^how does (.+?) fit into (?:ancient chinese science|the framework|this framework|the system)$/))) {
    return { kind: "ontology", targetText: m[1] };
  }
  if ((m = t.match(/^what is the (?:yin.?yang )?polarity of (.+)$/))) {
    return { kind: "ontology", targetText: m[1] };
  }
  if ((m = t.match(/^(?:what is|what are|what does|define|definition of|meaning of|what'?s) (.+)$/))) {
    return { kind: "definition", targetText: m[1] };
  }
  if ((m = t.match(/^tell me about (.+)$/))) {
    return { kind: "definition", targetText: m[1] };
  }
  if ((m = t.match(/^what about (.+)$/))) {
    return { kind: "bare", targetText: m[1] };
  }
  if ((m = t.match(/^and (.+)$/))) {
    return { kind: "bare", targetText: m[1] };
  }
  if (/^(who|when|how (do|does|can|to))\b/.test(t)) {
    return { kind: "unsupported" };
  }
  if (/^[a-z][a-z' -]{0,40}$/.test(t)) {
    return { kind: "bare", targetText: t };
  }
  return { kind: "unknown" };
}

/* ------------------------------------------------------------------ */
/* Decision helpers                                                    */
/* ------------------------------------------------------------------ */

const INTENT_THRESHOLDS: Record<string, number> = {
  definition: 0.8,
  causal_chain: 0.7,
  ontology_explanation: 0.7,
  correspondence: 0.7,
  antonym_lookup: 0.8,
  part_of: 0.8,
  relatedness: 0.75,
  comparison: 0.8,
  situation: 1,
  restraint: 0.7,
  degree_compare: 0.7,
  balance: 0.7,
};

function makeIntent(fields: Partial<QueryIntent> & { intentType: QueryIntent["intentType"] }): QueryIntent {
  return {
    intentType: fields.intentType,
    matchedNodes: fields.matchedNodes ?? [],
    includeOntology: fields.includeOntology ?? fields.intentType !== "definition",
    traversalDepth:
      fields.traversalDepth ??
      (fields.intentType === "causal_chain" || fields.intentType === "comparison" || fields.intentType === "relatedness"
        ? 4
        : 3),
    confidenceThreshold: fields.confidenceThreshold ?? INTENT_THRESHOLDS[fields.intentType] ?? 0.7,
    category: fields.category,
    variant: fields.variant,
    profile: fields.profile,
  };
}

function frameworkTriggered(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\byin\b/.test(t) ||
    /\byang\b/.test(t) ||
    t.includes("ancient chinese") ||
    t.includes("framework") ||
    t.includes("correspond") ||
    t.includes("trigram") ||
    t.includes("wuxing") ||
    t.includes("five element") ||
    /\bwhich element\b/.test(t) ||
    /\bwhat element\b/.test(t)
  );
}

function senseBranchLabel(sense: SenseInfo): string {
  const gloss = sense.gloss;
  if (/slang|street name/i.test(gloss)) return "the slang sense";
  if (/lightning/i.test(gloss)) return "the noise of lightning";
  const head = gloss.split(/[,;(]/)[0].trim().replace(/^(a|an|the)\s+/i, "");
  const words = head.split(/\s+/).slice(0, 5).join(" ");
  return words.length < head.length ? `${words}…` : words;
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

const lemmaSetCache = new WeakMap<WordNetExtract, Set<string>>();
function allLemmas(extract: WordNetExtract): Set<string> {
  let set = lemmaSetCache.get(extract);
  if (!set) {
    set = new Set();
    for (const s of extract.synsets) for (const l of s.lemmas) set.add(l.toLowerCase());
    lemmaSetCache.set(extract, set);
  }
  return set;
}

/* ------------------------------------------------------------------ */
/* Sense choice (D7/D8) and clarify construction (D9)                  */
/* ------------------------------------------------------------------ */

interface SenseChoice {
  sense: SenseInfo;
  resolvedBy: ResolvedTerm["resolvedBy"];
}

function antonymBearing(graph: Graph, sense: SenseInfo): boolean {
  return graph.outEdges(sense.synsetId, "ANTONYM_OF").length > 0;
}
const ANATOMY_WORDS = new Set([
  "hand", "arm", "leg", "foot", "feet", "head", "body", "finger", "toe",
  "thumb", "wrist", "ankle", "elbow", "knee", "shoulder",
]);
/** A sense belongs to the anatomy frame when its part/whole neighbours
 *  or its gloss name the body system (finger -> hand), as opposed to a
 *  same-named artefact part (finger -> glove). */
function bodyPartFit(graph: Graph, sense: SenseInfo): boolean {
  if (!partBearing(graph, sense)) return false;
  const neighbours = [
    ...graph.outEdges(sense.synsetId, "PART_OF"),
    ...graph.inEdges(sense.synsetId, "PART_OF"),
  ];
  for (const e of neighbours) {
    const other = graph.getNode(e.from === sense.synsetId ? e.to : e.from);
    const lemmas = Array.isArray(other?.properties["lemmas"])
      ? (other!.properties["lemmas"] as string[])
      : [other?.name ?? ""];
    if (lemmas.some((l) => ANATOMY_WORDS.has(l.toLowerCase()))) return true;
  }
  return false;
}

function partBearing(graph: Graph, sense: SenseInfo): boolean {
  return (
    graph.outEdges(sense.synsetId, "PART_OF").length > 0 ||
    graph.inEdges(sense.synsetId, "PART_OF").length > 0
  );
}

/**
 * The D8 discriminators, in strength order. Returns a choice, or the
 * senses to clarify over when nothing discriminates. `frameFit` is the
 * D8 "frame" discriminator for intents that constrain sense category.
 */
function chooseSense(
  ctx: LookupContext,
  lookup: TermLookup,
  frameFit?: (sense: SenseInfo) => boolean,
): { choice?: SenseChoice; clarifySenses?: SenseInfo[] } {
  withClimbs(ctx, lookup);
  const senses = lookup.senses;
  if (senses.length === 0) return {};
  if (lookup.sessionSynsetId) {
    const sense = senses.find((s) => s.synsetId === lookup.sessionSynsetId);
    if (sense) {
      const key = sense.lemmas[0]?.toLowerCase();
      const record = key ? ctx.session.resolvedSenses[key] : undefined;
      return { choice: { sense, resolvedBy: record?.resolvedBy ?? "user" } };
    }
  }
  const mapped = senses.filter((s) => s.mappedConceptId);
  if (mapped.length === 1) return { choice: { sense: mapped[0], resolvedBy: "curated-mapping" } };
  if (mapped.length > 1) return { clarifySenses: mapped };
  const climbable = senses.filter((s) => s.climb);
  if (climbable.length === 1) return { choice: { sense: climbable[0], resolvedBy: "climb" } };
  const topical = senses.filter((s) => topicFit(ctx, s));
  if (topical.length === 1) return { choice: { sense: topical[0], resolvedBy: "topic" } };
  if (frameFit) {
    const fitting = senses.filter(frameFit);
    if (fitting.length === 1) return { choice: { sense: fitting[0], resolvedBy: "frame" } };
    if (fitting.length > 1 && climbable.length === 0) return { clarifySenses: fitting };
  }
  if (senses.length === 1) return { choice: { sense: senses[0], resolvedBy: "single-sense" } };
  return { clarifySenses: senses };
}

type SenseFrameKind =
  | "definition"
  | "causal"
  | "ontology"
  | "polarity_check"
  | "antonym"
  | "part_of";

function senseRoute(
  kind: SenseFrameKind,
  surface: string,
  synsetIds: string[],
  resolvedBy: ResolvedTerm["resolvedBy"],
  extra: { qualityId?: string; polarityId?: string; category?: string; variant?: string },
): RouteToIntent {
  const terms: ResolvedTerm[] = [
    {
      surface,
      lemma: surface.toLowerCase(),
      slot: "subject",
      synsetId: synsetIds[0],
      resolvedBy,
    },
  ];
  switch (kind) {
    case "definition":
      return {
        kind: "route",
        intent: makeIntent({ intentType: "definition", matchedNodes: synsetIds }),
        terms,
        surfaceMode: "plain",
        decisionReason: "D9/branch",
      };
    case "causal":
      return {
        kind: "route",
        intent: makeIntent({
          intentType: "causal_chain",
          matchedNodes: extra.qualityId ? [...synsetIds, extra.qualityId] : synsetIds,
        }),
        terms,
        surfaceMode: "plain",
        decisionReason: "D9/branch",
      };
    case "ontology":
      return {
        kind: "route",
        intent: makeIntent({ intentType: "ontology_explanation", matchedNodes: synsetIds }),
        terms,
        surfaceMode: "framework",
        decisionReason: "D9/branch",
      };
    case "polarity_check":
      return {
        kind: "route",
        intent: makeIntent({
          intentType: "ontology_explanation",
          matchedNodes: extra.polarityId ? [...synsetIds, extra.polarityId] : synsetIds,
          variant: "polarity-check",
        }),
        terms,
        surfaceMode: "framework",
        decisionReason: "D9/branch",
      };
    case "antonym":
      return {
        kind: "route",
        intent: makeIntent({ intentType: "antonym_lookup", matchedNodes: synsetIds }),
        terms,
        surfaceMode: "plain",
        decisionReason: "D9/branch",
      };
    case "part_of":
      return {
        kind: "route",
        intent: makeIntent({
          intentType: "part_of",
          matchedNodes: synsetIds,
          variant: extra.variant ?? "whole",
        }),
        terms,
        surfaceMode: "plain",
        decisionReason: "D9/branch",
      };
  }
}

/** D9: clarify over indistinguishable senses (at most four branches). */
function senseClarify(
  kind: SenseFrameKind,
  surface: string,
  senses: SenseInfo[],
  originalQuestion: string,
  extra: { qualityId?: string; polarityId?: string; variant?: string },
): RouteDecision {
  let groups: { label: string; senses: SenseInfo[] }[];
  if (senses.length <= 4) {
    groups = senses.map((s) => ({ label: senseBranchLabel(s), senses: [s] }));
  } else {
    const strong = senses.filter((s) => s.mappedConceptId || s.climb);
    const rest = senses.filter((s) => !strong.includes(s));
    groups = strong.map((s) => ({ label: senseBranchLabel(s), senses: [s] }));
    const byPos = new Map<string, SenseInfo[]>();
    for (const s of rest) {
      const list = byPos.get(s.pos) ?? [];
      list.push(s);
      byPos.set(s.pos, list);
    }
    for (const [pos, list] of byPos) {
      if (groups.length >= 4) break;
      groups.push({
        label: pos === "n" ? "the noun senses" : pos === "v" ? "the verb senses" : "the adjective senses",
        senses: list,
      });
    }
    groups = groups.slice(0, 4);
  }
  return {
    kind: "clarify",
    question: `Which sense of ${surface} did you mean?`,
    branches: groups.map((g, i) => ({
      id: `b${i + 1}`,
      label: g.label,
      detail: g.senses[0].gloss,
      route: senseRoute(
        kind,
        surface,
        g.senses.map((s) => s.synsetId),
        "user",
        extra,
      ),
    })),
    originalQuestion,
    surfaceMode: "plain",
    decisionReason: "D9/sense-ambiguity",
  };
}

/* ------------------------------------------------------------------ */
/* Decline builders (D2 / D3 / D6 / D10)                               */
/* ------------------------------------------------------------------ */

function nearMiss(ctx: LookupContext, term: string): string | undefined {
  const t = term.toLowerCase();
  if (t.length < 4) return undefined;
  const candidates = new Set<string>([
    ...ontologyIndex(ctx.graph).byName.keys(),
    ...allLemmas(ctx.extract),
  ]);
  let best: string | undefined;
  let bestDist = 3;
  for (const cand of candidates) {
    if (Math.abs(cand.length - t.length) > 2) continue;
    const d = levenshtein(t, cand);
    if (d < bestDist || (d === bestDist && best !== undefined && cand < best)) {
      best = cand;
      bestDist = d;
    }
  }
  return bestDist <= 2 ? best : undefined;
}

function declineUnknownTerm(
  ctx: LookupContext,
  term: string,
  originalText: string,
  mode: SurfaceMode,
): RouteDecision {
  const miss = nearMiss(ctx, term);
  if (miss) {
    return {
      kind: "decline",
      reason: `term not found: "${term}"`,
      userMessage: `"${term}" isn't in what I know yet. Did you mean "${miss}"?`,
      alternatives: [
        {
          label: `ask about ${miss}`,
          question: originalText.replace(new RegExp(term, "i"), miss),
        },
      ],
      surfaceMode: mode,
      decisionReason: "D3/unknown-term",
    };
  }
  return {
    kind: "decline",
    reason: `term not found: "${term}"`,
    userMessage: `"${term}" isn't in what I know yet — I can't place it in any word or idea I have.`,
    alternatives: [],
    surfaceMode: mode,
    decisionReason: "D3/unknown-term",
  };
}

function declineNoContent(mode: SurfaceMode): RouteDecision {
  return {
    kind: "decline",
    reason: "no resolvable content",
    userMessage:
      "I couldn't place any of that in what I know yet. I can answer questions about what words mean, seasons and weather, opposites, parts of things, and how ideas here connect — try one of those.",
    alternatives: [
      { label: "what does winter mean?", question: "what is winter?" },
      { label: "why is winter cold?", question: "why is winter cold?" },
    ],
    surfaceMode: mode,
    decisionReason: "D2/no-resolvable-content",
  };
}

/** D6: the frame names a relation the system does not serve. */
function declineUnsupported(
  ctx: LookupContext,
  termText: string,
  lookup: TermLookup,
  mode: SurfaceMode,
): RouteDecision {
  const alts: Array<{ label: string; route?: RouteToIntent; question?: string }> = [];
  if (lookup.senses.length > 0) {
    const pick =
      lookup.senses.find((s) => s.mappedConceptId) ??
      lookup.senses.find((s) => s.climb) ??
      lookup.senses[0];
    alts.push({
      label: `say what ${termText} means`,
      route: senseRoute("definition", termText, [pick.synsetId], "frame", {}),
    });
    const anchor = pick.mappedConceptId ?? pick.climb?.anchorNodeId;
    if (anchor) {
      alts.push({
        label: `show how ${termText} is classified`,
        route: {
          kind: "route",
          intent: makeIntent({ intentType: "ontology_explanation", matchedNodes: [pick.synsetId] }),
          terms: [
            { surface: termText, lemma: termText.toLowerCase(), slot: "subject", synsetId: pick.synsetId, resolvedBy: "frame" },
          ],
          surfaceMode: "framework",
          decisionReason: "D6/alternative",
        },
      });
    }
  }
  for (const match of lookup.ontology) {
    alts.push({
      label: `talk about ${ctx.graph.getNode(match.nodeId)?.name ?? termText}`,
      route: {
        kind: "route",
        intent: makeIntent({ intentType: "definition", matchedNodes: [match.nodeId] }),
        terms: [
          { surface: termText, lemma: termText.toLowerCase(), slot: "subject", nodeId: match.nodeId, resolvedBy: "ontology-name" },
        ],
        surfaceMode: mode,
        decisionReason: "D6/alternative",
      },
    });
    break;
  }
  return {
    kind: "decline",
    reason: "relation not served",
    userMessage: `That kind of question isn't one I can answer yet — I don't have a way to look it up. If it helps, I can still say things about ${termText}.`,
    alternatives: alts.slice(0, 3),
    surfaceMode: mode,
    decisionReason: "D6/unsupported-relation",
  };
}

/** D10: the term resolves, but nothing anchors it to a cause/category. */
function declineUnanchored(
  termText: string,
  lookup: TermLookup,
  askPhrase: string,
  mode: SurfaceMode,
): RouteDecision {
  const alts: Array<{ label: string; route?: RouteToIntent; question?: string }> = [];
  if (lookup.senses.length > 0) {
    alts.push({
      label: `say what ${termText} means`,
      route: senseRoute("definition", termText, [lookup.senses[0].synsetId], "frame", {}),
    });
  }
  const lemmaName = lookup.lemmaCandidates[0]?.lemma ?? termText;
  return {
    kind: "decline",
    reason: `term resolves but is unanchored: "${lemmaName}"`,
    userMessage: `I know what ${termText} is, but I can't ${askPhrase} — nothing I have connects ${termText} to a cause or a category that would explain it.`,
    alternatives: alts,
    surfaceMode: mode,
    decisionReason: "D10/unanchored",
  };
}

/* ------------------------------------------------------------------ */
/* routeTurn: the §7.2 pipeline up to the decision                     */
/* ------------------------------------------------------------------ */

export interface RouterOptions {
  extract?: WordNetExtract;
  now?: Date;
  timezone?: string;
  location?: SituationLocation;
  hostDescription?: string;
  placeResolver?: PlaceResolver;
  debug?: boolean;
  /** `npm run ask --threshold=` maps here (§7.2: a caller-set floor). */
  thresholdOverride?: number;
  experienceDir?: string | null;
  answerIntentFn?: typeof answerIntent;
  realiseOverride?: Parameters<typeof renderAnswer>[0]["realiseOverride"];
}

type EventDraft =
  | { kind: "correction"; question: string; term: string; fromSynsetId?: string; toSynsetId: string }
  | { kind: "clarification-resolved"; question: string; branchId: string; resolvedTermIds: string[] }
  | { kind: "gap-hit"; question: string; unanchoredTerms: string[]; decisionReason: string }
  | {
      kind: "renderer-gap";
      question: string;
      stage: "leakage" | "faithfulness";
      detail: string;
      resolution: "repaired" | "dropped" | "fallback";
    };

export interface RouteOutcome {
  decision: RouteDecision;
  builder: TraceBuilder;
  situation: Situation;
  shadow?: Situation;
  eventDrafts: EventDraft[];
  replayTrace?: ThoughtTrace;
}

function lookupStep(builder: TraceBuilder, lookup: TermLookup, note?: string): void {
  const inputs = [lookup.surface];
  for (const m of lookup.ontology) inputs.push(m.nodeId);
  for (const s of lookup.senses.slice(0, 6)) inputs.push(s.synsetId);
  builder.addStep({ kind: "lookup", inputs, note });
}

function nodeTerm(node: GraphNode, surface: string, slot: ResolvedTerm["slot"]): ResolvedTerm {
  return {
    surface,
    lemma: node.name.toLowerCase(),
    slot,
    nodeId: node.id,
    resolvedBy: "ontology-name",
  };
}

function synsetTerm(
  sense: SenseInfo,
  surface: string,
  resolvedBy: ResolvedTerm["resolvedBy"],
): ResolvedTerm {
  return {
    surface,
    lemma: (sense.lemmas[0] ?? surface).toLowerCase(),
    slot: "subject",
    synsetId: sense.synsetId,
    resolvedBy,
  };
}

function resolveQuality(
  ctx: LookupContext,
  qualityText: string,
): { nodeId: string; term: ResolvedTerm } | undefined {
  const lk = lookupTerm(ctx, qualityText);
  const q = lk.ontology.find((m) => m.roles.includes("quality"));
  if (q) {
    const node = ctx.graph.getNode(q.nodeId)!;
    return { nodeId: q.nodeId, term: { ...nodeTerm(node, qualityText, "quality") } };
  }
  for (const sense of lk.senses) {
    if (sense.mappedConceptId) {
      const node = ctx.graph.getNode(sense.mappedConceptId);
      if (node?.type === "Quality") {
        return {
          nodeId: node.id,
          term: { ...nodeTerm(node, qualityText, "quality"), synsetId: sense.synsetId },
        };
      }
    }
  }
  return undefined;
}

const CATEGORY_NORM: Record<string, string> = {
  colour: "color",
  body: "organ",
  organs: "organ",
};
function normCategory(category?: string): string | undefined {
  if (!category) return undefined;
  return CATEGORY_NORM[category] ?? category;
}

/* --- per-frame subject routing, shared with D4 continuation -------- */

function routeDefinitionTerm(
  ctx: LookupContext,
  targetText: string,
  builder: TraceBuilder,
  originalText: string,
): RouteDecision {
  const lk = lookupTerm(ctx, targetText);
  lookupStep(builder, lk);
  const onto =
    lk.ontology.find((m) => m.nodeType !== "Correspondence") ??
    (lk.senses.length === 0 ? lk.ontology[0] : undefined);
  if (onto && onto.nodeType === "Quality") {
    const node = ctx.graph.getNode(onto.nodeId)!;
    const synsetId = node.properties["synsetId"];
    // D7: a sense the user settled in this session outranks the mapping.
    if (lk.sessionSynsetId && lk.sessionSynsetId !== synsetId) {
      const record = ctx.session.resolvedSenses[targetText.toLowerCase()];
      return {
        kind: "route",
        intent: makeIntent({ intentType: "definition", matchedNodes: [lk.sessionSynsetId] }),
        terms: [
          {
            surface: targetText,
            lemma: targetText.toLowerCase(),
            slot: "subject",
            synsetId: lk.sessionSynsetId,
            resolvedBy: record?.resolvedBy ?? "user",
          },
        ],
        surfaceMode: "plain",
        decisionReason: "D7/session",
      };
    }
    if (typeof synsetId === "string" && lk.senses.some((s) => s.synsetId === synsetId)) {
      return {
        kind: "route",
        intent: makeIntent({ intentType: "definition", matchedNodes: [synsetId] }),
        terms: [
          {
            surface: targetText,
            lemma: targetText.toLowerCase(),
            slot: "subject",
            nodeId: onto.nodeId,
            synsetId,
            resolvedBy: "curated-mapping",
          },
        ],
        surfaceMode: "plain",
        decisionReason: "D8/curated-mapping",
      };
    }
  }
  if (onto) {
    const node = ctx.graph.getNode(onto.nodeId)!;
    return {
      kind: "route",
      intent: makeIntent({ intentType: "definition", matchedNodes: [onto.nodeId] }),
      terms: [nodeTerm(node, targetText, "subject")],
      surfaceMode: frameworkTriggered(originalText) ? "framework" : "plain",
      decisionReason: "D7/ontology-subject",
    };
  }
  if (lk.senses.length === 0 && lk.dictionaryPresent) {
    const entryId = ontologyIndex(ctx.graph).dictionaryWords.get(
      candidateStrings(targetText).find((c) => ontologyIndex(ctx.graph).dictionaryWords.has(c)) ?? "",
    );
    if (entryId) {
      return {
        kind: "route",
        intent: makeIntent({ intentType: "definition", matchedNodes: [entryId] }),
        terms: [
          { surface: targetText, lemma: targetText.toLowerCase(), slot: "subject", resolvedBy: "ontology-name" },
        ],
        surfaceMode: "plain",
        decisionReason: "D7/dictionary-only",
      };
    }
  }
  const { choice, clarifySenses } = chooseSense(ctx, lk);
  if (choice) {
    const route = senseRoute("definition", targetText, [choice.sense.synsetId], choice.resolvedBy, {});
    route.decisionReason = `D8/${choice.resolvedBy}`;
    return route;
  }
  if (clarifySenses) return senseClarify("definition", targetText, clarifySenses, originalText, {});
  return declineUnknownTerm(ctx, targetText, originalText, "plain");
}

function routeOntologyTerm(
  ctx: LookupContext,
  targetText: string,
  builder: TraceBuilder,
  originalText: string,
): RouteDecision {
  const lk = lookupTerm(ctx, targetText);
  lookupStep(builder, lk);
  const onto = lk.ontology.find((m) => !m.roles.includes("correspondence-value")) ?? lk.ontology[0];
  if (onto) {
    const node = ctx.graph.getNode(onto.nodeId)!;
    return {
      kind: "route",
      intent: makeIntent({ intentType: "ontology_explanation", matchedNodes: [onto.nodeId] }),
      terms: [nodeTerm(node, targetText, "subject")],
      surfaceMode: "framework",
      decisionReason: "D7/ontology-subject",
    };
  }
  const { choice, clarifySenses } = chooseSense(ctx, lk);
  if (choice) {
    if (!choice.sense.mappedConceptId && !choice.sense.climb) {
      return declineUnanchored(targetText, lk, "place it in any wider scheme", "framework");
    }
    const route = senseRoute("ontology", targetText, [choice.sense.synsetId], choice.resolvedBy, {});
    route.decisionReason = `D8/${choice.resolvedBy}`;
    return route;
  }
  if (clarifySenses) return senseClarify("ontology", targetText, clarifySenses, originalText, {});
  if (lk.senses.length === 0) return declineUnknownTerm(ctx, targetText, originalText, "framework");
  return declineUnanchored(targetText, lk, "place it in any wider scheme", "framework");
}

function routeCausalSubject(
  ctx: LookupContext,
  subjectText: string,
  quality: { nodeId: string; term: ResolvedTerm } | undefined,
  builder: TraceBuilder,
  originalText: string,
  partialActivity?: string,
): RouteDecision {
  const lk = lookupTerm(ctx, subjectText);
  lookupStep(builder, lk);
  const matched = (subjectId: string, terms: ResolvedTerm[], reason: string): RouteDecision => {
    if (partialActivity) {
      builder.addStep({
        kind: "lookup",
        inputs: [partialActivity],
        conclusion: {
          subjectId,
          relation: "UNANCHORED_TERM",
          confidence: 1,
          facts: { term: partialActivity },
        },
        note: "D11/partial-coverage",
      });
    }
    return {
      kind: "route",
      intent: makeIntent({
        intentType: "causal_chain",
        matchedNodes: quality ? [subjectId, quality.nodeId] : [subjectId],
      }),
      terms,
      surfaceMode: "plain",
      decisionReason: partialActivity ? "D11/partial-coverage" : reason,
    };
  };
  const onto = lk.ontology.find((m) => m.nodeType !== "Correspondence");
  if (onto) {
    const node = ctx.graph.getNode(onto.nodeId)!;
    const terms = [nodeTerm(node, subjectText, "subject")];
    if (quality) terms.push(quality.term);
    return matched(onto.nodeId, terms, "D7/ontology-subject");
  }
  const { choice, clarifySenses } = chooseSense(ctx, lk);
  if (choice) {
    if (!choice.sense.mappedConceptId && !choice.sense.climb) {
      return declineUnanchored(
        subjectText,
        lk,
        "explain it from a cause",
        "plain",
      );
    }
    const terms = [synsetTerm(choice.sense, subjectText, choice.resolvedBy)];
    if (quality) terms.push(quality.term);
    return matched(choice.sense.synsetId, terms, `D8/${choice.resolvedBy}`);
  }
  if (clarifySenses) {
    if (clarifySenses.every((s) => !s.mappedConceptId && !s.climb)) {
      return declineUnanchored(subjectText, lk, "explain it from a cause", "plain");
    }
    return senseClarify("causal", subjectText, clarifySenses, originalText, {
      qualityId: quality?.nodeId,
    });
  }
  if (lk.senses.length === 0 && lk.ontology.length === 0) {
    return declineUnknownTerm(ctx, subjectText, originalText, "plain");
  }
  return declineNoContent("plain");
}

/** D5: the classification target is itself a primitive of that kind. */
function primitiveClarify(
  ctx: LookupContext,
  frame: Extract<Frame, { kind: "classification" }>,
  lk: TermLookup,
  match: OntologyMatch,
  originalText: string,
): RouteDecision {
  const node = ctx.graph.getNode(match.nodeId)!;
  const name = node.name;
  const selfTerm: ResolvedTerm = {
    surface: name,
    lemma: name.toLowerCase(),
    slot: "subject",
    nodeId: node.id,
    ontologyRole: match.roles[0],
    resolvedBy: "ontology-name",
  };
  const branches: ClarificationBranch[] = [
    {
      id: "b1",
      label: `${name} itself`,
      detail: "what it stands for and what goes with it",
      route: {
        kind: "route",
        intent: makeIntent({ intentType: "ontology_explanation", matchedNodes: [node.id] }),
        terms: [selfTerm],
        surfaceMode: "framework",
        decisionReason: "D5/branch-self",
      },
    },
    {
      id: "b2",
      label: `The things classed under ${name}`,
      detail: "seasons, concepts and phenomena",
      route: {
        kind: "route",
        intent: makeIntent({
          intentType: "ontology_explanation",
          matchedNodes: [node.id],
          variant: "incoming-classification",
        }),
        terms: [selfTerm],
        surfaceMode: "framework",
        decisionReason: "D5/branch-classed",
      },
    },
  ];
  // §7.5 branch 3: the ordinary phenomenon sense, sense-bridged.
  const ordinary =
    lk.senses.find((s) => s.mappedConceptId) ??
    lk.senses.find((s) => s.synsetId === "wn-n13713767");
  if (ordinary) {
    branches.push({
      id: "b3",
      label: `Ordinary ${name.toLowerCase()}`,
      detail: match.nodeId === "fire" ? "flames and burning" : ordinary.gloss,
      route: {
        kind: "route",
        intent: makeIntent({
          intentType: "ontology_explanation",
          matchedNodes: [node.id, ordinary.synsetId],
          variant: "sense-bridge",
        }),
        terms: [
          selfTerm,
          {
            surface: name.toLowerCase(),
            lemma: name.toLowerCase(),
            slot: "object",
            synsetId: ordinary.synsetId,
            resolvedBy: "frame",
          },
        ],
        surfaceMode: "framework",
        decisionReason: "D5/branch-ordinary",
      },
    });
  }
  return {
    kind: "clarify",
    question: `Quick check — ${name} is one of the ${frame.classifier}s itself, so I want to be sure which you mean:`,
    branches,
    originalQuestion: originalText,
    surfaceMode: "plain",
    decisionReason: "D5/presupposition-clash",
  };
}

function matchPendingBranch(
  pending: PendingClarification,
  rawText: string,
): ClarificationBranch | undefined {
  const t = norm(rawText);
  if (/^[1-9]$/.test(t)) return pending.branches[Number(t) - 1];
  const ordinals: Record<string, number> = { first: 0, second: 1, third: 2, fourth: 3 };
  for (const [word, idx] of Object.entries(ordinals)) {
    if (t === word || t.includes(`${word} one`) || t.includes(`${word} option`)) {
      return pending.branches[idx];
    }
  }
  const stop = new Set(["the", "a", "an", "of", "one", "i", "mean", "meant", "that"]);
  const tTokens = new Set(
    t.split(/[^a-z]+/).filter((w) => w.length >= 3 && !stop.has(w)),
  );
  let best: ClarificationBranch | undefined;
  let bestScore = 0;
  let tie = false;
  for (const b of pending.branches) {
    const bTokens = new Set(
      `${b.label} ${b.detail ?? ""}`
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length >= 3 && !stop.has(w)),
    );
    let score = 0;
    for (const tok of tTokens) if (bTokens.has(tok)) score++;
    if (score > bestScore) {
      best = b;
      bestScore = score;
      tie = false;
    } else if (score === bestScore && score > 0) {
      tie = true;
    }
  }
  return bestScore > 0 && !tie ? best : undefined;
}

/* --- D1: corrections ------------------------------------------------ */

function ancestorTokens(graph: Graph, synsetId: string): Set<string> {
  const tokens = new Set<string>();
  const seen = new Set<string>([synsetId]);
  let frontier = [synsetId];
  for (let hop = 0; hop < 6 && frontier.length > 0; hop++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const e of graph.outEdges(id, "IS_A")) {
        if (seen.has(e.to)) continue;
        seen.add(e.to);
        next.push(e.to);
        const node = graph.getNode(e.to);
        if (node) {
          for (const w of node.name.toLowerCase().split(/[^a-z]+/)) if (w) tokens.add(w);
        }
      }
    }
    frontier = next;
  }
  return tokens;
}

function handleCorrection(
  ctx: LookupContext,
  descriptor: string,
  builder: TraceBuilder,
  originalText: string,
  eventDrafts: EventDraft[],
): RouteDecision {
  const session = ctx.session;
  const ref = session.recentTerms.find((r) => r.synsetId);
  if (!ref || !ref.synsetId) {
    return {
      kind: "decline",
      reason: "correction without antecedent",
      userMessage:
        "I don't have an earlier word to correct there — which word did you mean?",
      alternatives: [],
      surfaceMode: "plain",
      decisionReason: "D1/no-antecedent",
    };
  }
  const term = ref.term;
  const fromId = ref.synsetId;
  const descTokens = new Set(
    descriptor.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3),
  );
  const senses = synsetsForLemma(ctx.extract, term);
  const scored = senses.map((s) => {
    const hay = new Set<string>();
    for (const l of s.lemmas) {
      for (const w of l.toLowerCase().split(/[^a-z]+/)) if (w) hay.add(w);
    }
    for (const w of s.gloss.toLowerCase().split(/[^a-z]+/)) if (w) hay.add(w);
    for (const w of ancestorTokens(ctx.graph, s.id)) hay.add(w);
    let score = 0;
    for (const tok of descTokens) if (hay.has(tok)) score++;
    return { synset: s, score };
  });
  let to: SynsetRecord | undefined = scored
    .filter((x) => x.synset.id !== fromId && x.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.synset;
  if (!to && /\bother\b/.test(descriptor)) {
    to =
      senses.find((s) => s.id !== fromId && mappedConceptForSynset(ctx.graph, s.id)) ??
      senses.find((s) => s.id !== fromId && climbToAnchor(ctx.graph, s.id, 6)) ??
      senses.find((s) => s.id !== fromId);
  }
  if (!to) {
    return {
      kind: "decline",
      reason: `no alternative sense for "${term}"`,
      userMessage: `I don't have another sense of ${term} to switch to — that's the only one I know.`,
      alternatives: [],
      surfaceMode: "plain",
      decisionReason: "D1/no-alternative-sense",
    };
  }
  builder.addStep({
    kind: "lookup",
    inputs: [term, fromId, to.id],
        note: "D1/correction",
  });
  const turn = session.turn;
  session.resolvedSenses[term] = {
    term,
    surface: term,
    synsetId: to.id,
    ontologyNodeId: mappedConceptForSynset(ctx.graph, to.id)?.id,
    resolvedBy: "user",
    turn,
  };
  session.corrections.push({ turn, term, fromSynsetId: fromId, toSynsetId: to.id, userText: originalText });
  const fromMapped = mappedConceptForSynset(ctx.graph, fromId);
  const toMapped = mappedConceptForSynset(ctx.graph, to.id);
  const proposedAction: TrainerSignal["proposedAction"] =
    fromMapped && !toMapped && !session.topicFrame
      ? "propose-sense-bridge"
      : "propose-evaluation-case";
  let originalQuestion = "";
  for (let i = session.recentThoughts.length - 1; i >= 0; i--) {
    const d = session.recentThoughts[i].decision;
    if (d.kind === "route" && d.terms.some((t) => t.lemma === term)) {
      originalQuestion = session.recentThoughts[i].question;
      break;
    }
  }
  session.trainerSignals.push({
    kind: "sense-correction",
    turn,
    term,
    originalQuestion,
    fromSynsetId: fromId,
    toSynsetId: to.id,
    proposedAction,
    status: "candidate",
  });
  eventDrafts.push({ kind: "correction", term, fromSynsetId: fromId, toSynsetId: to.id, question: originalText });

  // Re-route the corrected referent in the same turn (§7.4 D1).
  for (let i = session.recentThoughts.length - 1; i >= 0; i--) {
    const d = session.recentThoughts[i].decision;
    if (d.kind === "route" && d.terms.some((t) => t.lemma === term)) {
      const matchedNodes = d.intent.matchedNodes.map((id) => (id === fromId ? to.id : id));
      if (!matchedNodes.includes(to.id)) {
        matchedNodes.unshift(to.id);
      }
      return {
        kind: "route",
        intent: { ...d.intent, matchedNodes },
        terms: d.terms.map((t) =>
          t.synsetId === fromId ? { ...t, synsetId: to.id, resolvedBy: "user" as const } : t,
        ),
        surfaceMode: d.surfaceMode,
        decisionReason: "D1/correction",
      };
    }
  }
  const route = senseRoute("definition", term, [to.id], "user", {});
  route.decisionReason = "D1/correction";
  return route;
}

/* --- frame dispatch -------------------------------------------------- */

function resolvePairSide(
  ctx: LookupContext,
  text: string,
  builder: TraceBuilder,
): { id?: string; term?: ResolvedTerm; clarifySenses?: SenseInfo[]; lookup: TermLookup } {
  const lk = lookupTerm(ctx, text);
  lookupStep(builder, lk);
  const onto = lk.ontology.find((m) => !m.roles.includes("correspondence-value")) ?? lk.ontology[0];
  if (onto) {
    const node = ctx.graph.getNode(onto.nodeId)!;
    return { id: onto.nodeId, term: nodeTerm(node, text, "subject"), lookup: lk };
  }
  const { choice, clarifySenses } = chooseSense(ctx, lk);
  if (choice) {
    return { id: choice.sense.synsetId, term: synsetTerm(choice.sense, text, choice.resolvedBy), lookup: lk };
  }
  return { clarifySenses, lookup: lk };
}

function pairClarify(
  intentType: "relatedness" | "comparison",
  surface: string,
  senses: SenseInfo[],
  otherId: string,
  surfaceFirst: boolean,
  originalText: string,
): RouteDecision {
  return {
    kind: "clarify",
    question: `Which sense of ${surface} did you mean?`,
    branches: senses.slice(0, 4).map((s, i) => ({
      id: `b${i + 1}`,
      label: senseBranchLabel(s),
      detail: s.gloss,
      route: {
        kind: "route",
        intent: makeIntent({
          intentType,
          matchedNodes: surfaceFirst ? [s.synsetId, otherId] : [otherId, s.synsetId],
        }),
        terms: [
          {
            surface,
            lemma: surface.toLowerCase(),
            slot: "subject",
            synsetId: s.synsetId,
            resolvedBy: "user",
          },
        ],
        surfaceMode: "plain",
        decisionReason: "D9/branch",
      },
    })),
    originalQuestion: originalText,
    surfaceMode: "plain",
    decisionReason: "D9/sense-ambiguity",
  };
}

function routeFrame(
  ctx: LookupContext,
  frame: Frame,
  text: string,
  builder: TraceBuilder,
): RouteDecision {
  const graph = ctx.graph;
  switch (frame.kind) {
    case "polarity_check": {
      const lk = lookupTerm(ctx, frame.targetText);
      lookupStep(builder, lk);
      const polLk = lookupTerm(ctx, frame.polarity);
      const polNode = polLk.ontology[0]
        ? graph.getNode(polLk.ontology[0].nodeId)!
        : undefined;
      const onto = lk.ontology.find((m) => m.layer !== "base");
      if (onto && polNode) {
        const node = graph.getNode(onto.nodeId)!;
        return {
          kind: "route",
          intent: makeIntent({
            intentType: "ontology_explanation",
            matchedNodes: [onto.nodeId, polNode.id],
            variant: "polarity-check",
          }),
          terms: [
            nodeTerm(node, frame.targetText, "subject"),
            { ...nodeTerm(polNode, frame.polarity, "classifier-value") },
          ],
          surfaceMode: "framework",
          decisionReason: "D7/ontology-subject",
        };
      }
      const nounSenses = lk.senses.filter((s) => s.pos === "n");
      if (nounSenses.length > 0 && nounSenses.length < lk.senses.length) {
        lk.senses = nounSenses;
      }
      const { choice, clarifySenses } = chooseSense(ctx, lk);
      if (choice && polNode) {
        const route = senseRoute("polarity_check", frame.targetText, [choice.sense.synsetId], choice.resolvedBy, {
          polarityId: polNode.id,
        });
        route.decisionReason = `D8/${choice.resolvedBy}`;
        return route;
      }
      if (clarifySenses) {
        return senseClarify("polarity_check", frame.targetText, clarifySenses, text, {
          polarityId: polNode?.id,
        });
      }
      if (lk.senses.length === 0 && lk.ontology.length === 0) {
        return declineUnknownTerm(ctx, frame.targetText, text, "framework");
      }
      return declineUnanchored(frame.targetText, lk, "say which way it leans", "framework");
    }

    case "classification": {
      const lk = lookupTerm(ctx, frame.targetText);
      lookupStep(builder, lk);
      const primRole = `primitive-${frame.classifier}` as OntologyRole;
      const clash = lk.ontology.find((m) => m.roles.includes(primRole));
      if (clash) return primitiveClarify(ctx, frame, lk, clash, text);
      const val = lk.ontology.find((m) => m.roles.includes("correspondence-value"));
      if (val) {
        const node = graph.getNode(val.nodeId)!;
        return {
          kind: "route",
          intent: makeIntent({ intentType: "correspondence", matchedNodes: [val.nodeId] }),
          terms: [nodeTerm(node, frame.targetText, "subject")],
          surfaceMode: "framework",
          decisionReason: "D-classification/correspondence-value",
        };
      }
      return routeOntologyTerm(ctx, frame.targetText, builder, text);
    }

    case "degree_mixed": {
      // §6.7: comparing across aspects is a category error — degrees
      // only ever compare within one aspect. Decline, don't average.
      return {
        kind: "decline",
        reason: `mixed aspects: ${frame.aAspect} vs ${frame.bAspect}`,
        userMessage: `That mixes two different aspects — ${frame.aText}'s ${frame.aAspect} against ${frame.bText}'s ${frame.bAspect} — and degrees only compare within a single aspect. Ask it within one aspect and I can answer.`,
        alternatives: [],
        surfaceMode: "framework",
        decisionReason: "D6/mixed-aspect",
      };
    }

    case "degree_compare": {
      const a = resolvePairSide(ctx, frame.aText, builder);
      const b = resolvePairSide(ctx, frame.bText, builder);
      const ASPECT_WORDS: Record<string, string> = {
        light: "light",
        daylight: "light",
        temperature: "temperature",
        activity: "activity",
      };
      const aspectKey = frame.aspectWord
        ? ASPECT_WORDS[frame.aspectWord.toLowerCase()]
        : "light"; // §6.7: seasons imply the light aspect by default
      if (!aspectKey) {
        return declineUnsupported(ctx, frame.aspectWord ?? "", { surface: frame.aspectWord ?? "", lemmaCandidates: [], senses: [], ontology: [], dictionaryPresent: false }, "framework");
      }
      const aNode = a.id ? graph.getNode(a.id) : undefined;
      const bNode = b.id ? graph.getNode(b.id) : undefined;
      if (aNode?.type === "Season" && bNode?.type === "Season") {
        return {
          kind: "route",
          intent: makeIntent({
            intentType: "degree_compare",
            matchedNodes: [aNode.id, bNode.id],
            category: aspectKey,
            variant: frame.polarity,
          }),
          terms: [a.term!, b.term!].map((t, i) => ({ ...t, slot: i === 0 ? "subject" : "object" }) as ResolvedTerm),
          surfaceMode: "framework",
          decisionReason: "D7/engine-degree",
        };
      }
      if (!a.id || !b.id) {
        return declineUnknownTerm(ctx, !a.id ? frame.aText : frame.bText, text, "framework");
      }
      return declineUnsupported(ctx, frame.aText, a.lookup, "framework");
    }

    case "restraint": {
      const lk = lookupTerm(ctx, frame.targetText);
      lookupStep(builder, lk);
      const onto =
        lk.ontology.find((m) => m.roles.includes("primitive-element")) ??
        lk.ontology.find((m) => m.layer !== "base");
      if (onto) {
        const node = graph.getNode(onto.nodeId)!;
        return {
          kind: "route",
          intent: makeIntent({ intentType: "restraint", matchedNodes: [onto.nodeId] }),
          terms: [nodeTerm(node, frame.targetText, "subject")],
          surfaceMode: "framework",
          decisionReason: "D7/engine-restraint",
        };
      }
      if (lk.senses.length === 0 && lk.ontology.length === 0) {
        return declineUnknownTerm(ctx, frame.targetText, text, "framework");
      }
      return declineUnsupported(ctx, frame.targetText, lk, "framework");
    }

    case "balance": {
      // §6.8 chat form: an excess of one element, judged against a
      // season baseline — the named season, or the season here from
      // the turn's Situation. The profile is the §6.8 worked example's
      // stipulation: the named element at a 0.55 share. (No lookup
      // steps are recorded in this case: a full balance turn — excess,
      // moderator, downstream, five manifestation conclusions, three
      // checks — exactly fills the §8.3 trace bound; the route step
      // and the decision's terms carry the resolution record.)
      const elLk = lookupTerm(ctx, frame.elementText);
      const el = elLk.ontology.find((m) => m.roles.includes("primitive-element"));
      if (!el) {
        if (elLk.senses.length === 0 && elLk.ontology.length === 0) {
          return declineUnknownTerm(ctx, frame.elementText, text, "framework");
        }
        return declineUnsupported(ctx, frame.elementText, elLk, "framework");
      }
      const elementNode = graph.getNode(el.nodeId)!;
      let seasonNode: GraphNode | undefined;
      if (frame.seasonText) {
        const sLk = lookupTerm(ctx, frame.seasonText);
        const sOnto = sLk.ontology.find((m) => m.nodeType === "Season");
        if (sOnto) seasonNode = graph.getNode(sOnto.nodeId);
      } else if (ctx.situation?.derived.seasonHere) {
        seasonNode = graph.getNode(ctx.situation.derived.seasonHere);
      }
      if (!seasonNode) {
        return {
          kind: "decline",
          reason: "balance needs a season baseline",
          userMessage:
            "Balance is judged against a season's baseline, and I don't have a season for it yet — name the season, or tell me where you are so I can work out the season here.",
          alternatives: [],
          surfaceMode: "framework",
          decisionReason: "D-engine/no-season",
        };
      }
      return {
        kind: "route",
        intent: makeIntent({
          intentType: "balance",
          matchedNodes: [seasonNode.id],
          profile: { [elementNode.id]: 0.55 },
        }),
        terms: [
          nodeTerm(elementNode, frame.elementText, "subject"),
          nodeTerm(seasonNode, frame.seasonText ?? seasonNode.name.toLowerCase(), "object"),
        ],
        surfaceMode: "framework",
        decisionReason: "D7/engine-balance",
      };
    }

    case "correspondence": {
      if (frame.sourceText) {
        const lk = lookupTerm(ctx, frame.sourceText);
        lookupStep(builder, lk);
        const el = lk.ontology.find((m) => m.roles.includes("primitive-element"));
        if (el) {
          const node = graph.getNode(el.nodeId)!;
          return {
            kind: "route",
            intent: makeIntent({
              intentType: "correspondence",
              matchedNodes: [el.nodeId],
              category: normCategory(frame.category),
            }),
            terms: [nodeTerm(node, frame.sourceText, "subject")],
            surfaceMode: "framework",
            decisionReason: "D-correspondence/forward",
          };
        }
        const val = lk.ontology.find((m) => m.roles.includes("correspondence-value"));
        if (val) {
          const node = graph.getNode(val.nodeId)!;
          return {
            kind: "route",
            // §6.9: "what does X correspond to?" for a table value is
            // the composition question — name the element, then walk
            // its whole row outward (a category, when asked, scopes it).
            intent: makeIntent({
              intentType: "correspondence",
              matchedNodes: [val.nodeId],
              category: normCategory(frame.category),
              variant: "compose",
            }),
            terms: [nodeTerm(node, frame.sourceText, "subject")],
            surfaceMode: "framework",
            decisionReason: "D-correspondence/reverse-compose",
          };
        }
        if (lk.ontology.length > 0 || lk.senses.length > 0) {
          return declineUnsupported(ctx, frame.sourceText, lk, "framework");
        }
        return declineUnknownTerm(ctx, frame.sourceText, text, "framework");
      }
      if (frame.targetText) {
        const lk = lookupTerm(ctx, frame.targetText);
        lookupStep(builder, lk);
        const category = normCategory(frame.category);
        const el = lk.ontology.find((m) => m.roles.includes("primitive-element"));
        if (el) {
          const node = graph.getNode(el.nodeId)!;
          return {
            kind: "route",
            intent: makeIntent({
              intentType: "correspondence",
              matchedNodes: [el.nodeId],
              category,
            }),
            terms: [nodeTerm(node, frame.targetText, "subject")],
            surfaceMode: "framework",
            decisionReason: "D-correspondence/forward",
          };
        }
        const val = lk.ontology.find((m) => m.roles.includes("correspondence-value"));
        if (val) {
          const elementEdge = graph.inEdges(val.nodeId, "CORRESPONDS_TO")[0];
          if (elementEdge) {
            const node = graph.getNode(val.nodeId)!;
            return {
              kind: "route",
              intent: makeIntent({
                intentType: "correspondence",
                matchedNodes: [elementEdge.from],
                category,
              }),
              terms: [nodeTerm(node, frame.targetText, "subject")],
              surfaceMode: "framework",
              decisionReason: "D-correspondence/two-hop",
            };
          }
        }
        if (lk.ontology.length > 0 || lk.senses.length > 0) {
          return declineUnsupported(ctx, frame.targetText, lk, "framework");
        }
        return declineUnknownTerm(ctx, frame.targetText, text, "framework");
      }
      return declineNoContent("framework");
    }

    case "antonym": {
      const lk = lookupTerm(ctx, frame.targetText);
      lookupStep(builder, lk);
      const q = lk.ontology.find((m) => m.roles.includes("quality"));
      if (q) {
        const node = graph.getNode(q.nodeId)!;
        // §7.9 RPS-07: the temperature sense is selected via the mapped
        // Quality — the route carries both ids.
        const synsetId = node.properties["synsetId"];
        const matchedNodes =
          typeof synsetId === "string" ? [q.nodeId, synsetId] : [q.nodeId];
        return {
          kind: "route",
          intent: makeIntent({ intentType: "antonym_lookup", matchedNodes }),
          terms: [
            {
              ...nodeTerm(node, frame.targetText, "subject"),
              ...(typeof synsetId === "string" ? { synsetId } : {}),
            },
          ],
          surfaceMode: "plain",
          decisionReason: "D8/curated-mapping",
        };
      }
      const { choice, clarifySenses } = chooseSense(ctx, lk, (s) => antonymBearing(graph, s));
      if (choice) {
        const route = senseRoute("antonym", frame.targetText, [choice.sense.synsetId], choice.resolvedBy, {});
        route.decisionReason = `D8/${choice.resolvedBy}`;
        return route;
      }
      if (clarifySenses) return senseClarify("antonym", frame.targetText, clarifySenses, text, {});
      if (lk.senses.length === 0) return declineUnknownTerm(ctx, frame.targetText, text, "plain");
      return declineUnsupported(ctx, frame.targetText, lk, "plain");
    }

    case "part_of": {
      const lk = lookupTerm(ctx, frame.targetText);
      lookupStep(builder, lk);
      const onto = lk.ontology.find((m) => m.nodeType !== "Correspondence");
      if (onto && !frame.otherText) {
        const node = graph.getNode(onto.nodeId)!;
        return {
          kind: "route",
          intent: makeIntent({ intentType: "part_of", matchedNodes: [onto.nodeId], variant: frame.variant }),
          terms: [nodeTerm(node, frame.targetText, "subject")],
          surfaceMode: "plain",
          decisionReason: "D7/ontology-subject",
        };
      }
      const bodyFrame = /\bbody\b/.test(text.toLowerCase());
      const { choice, clarifySenses } = chooseSense(
        ctx,
        lk,
        bodyFrame ? (s) => bodyPartFit(graph, s) : (s) => partBearing(graph, s),
      );
      if (choice) {
        const matchedNodes = [choice.sense.synsetId];
        let variant: string = frame.variant;
        if (frame.otherText) {
          const other = resolvePairSide(ctx, frame.otherText, builder);
          if (other.id) {
            matchedNodes.push(other.id);
            variant = "check";
          }
        }
        const route = senseRoute("part_of", frame.targetText, matchedNodes, choice.resolvedBy, { variant });
        route.intent.matchedNodes = matchedNodes;
        route.decisionReason = `D8/${choice.resolvedBy}`;
        return route;
      }
      if (clarifySenses) {
        return senseClarify("part_of", frame.targetText, clarifySenses, text, { variant: frame.variant });
      }
      if (lk.senses.length === 0 && lk.ontology.length === 0) {
        return declineUnknownTerm(ctx, frame.targetText, text, "plain");
      }
      return declineUnsupported(ctx, frame.targetText, lk, "plain");
    }

    case "relatedness":
    case "comparison": {
      const intentType = frame.kind === "relatedness" ? "relatedness" : "comparison";
      const a = resolvePairSide(ctx, frame.aText, builder);
      const b = resolvePairSide(ctx, frame.bText, builder);
      if (a.id && b.id) {
        return {
          kind: "route",
          intent: makeIntent({ intentType, matchedNodes: [a.id, b.id] }),
          terms: [a.term!, b.term!].map((t, i) => ({ ...t, slot: i === 0 ? "subject" : "object" }) as ResolvedTerm),
          surfaceMode: "plain",
          decisionReason: "D7/pair-resolved",
        };
      }
      if (a.clarifySenses && b.id) return pairClarify(intentType, frame.aText, a.clarifySenses, b.id, true, text);
      if (b.clarifySenses && a.id) return pairClarify(intentType, frame.bText, b.clarifySenses, a.id, false, text);
      const absentText = !a.id && !a.clarifySenses ? frame.aText : !b.id && !b.clarifySenses ? frame.bText : undefined;
      if (absentText) return declineUnknownTerm(ctx, absentText, text, "plain");
      return declineNoContent("plain");
    }

    case "cycle": {
      const lk = lookupTerm(ctx, frame.targetText);
      lookupStep(builder, lk);
      const onto =
        lk.ontology.find((m) => m.nodeType === "Season" || m.nodeType === "Element") ??
        // §6.5: any concept with an element classification inherits its
        // element's cycle position (temporal aspect) — derivative, say.
        lk.ontology.find((m) =>
          directClassifications(graph, m.nodeId).some((c) => c.relation === "HAS_ELEMENT"),
        );
      if (onto) {
        const node = graph.getNode(onto.nodeId)!;
        return {
          kind: "route",
          intent: makeIntent({
            intentType: "causal_chain",
            matchedNodes: [onto.nodeId],
            variant: "cycle",
          }),
          terms: [nodeTerm(node, frame.targetText, "subject")],
          surfaceMode: "plain",
          decisionReason: "D7/ontology-subject",
        };
      }
      if (lk.senses.length === 0 && lk.ontology.length === 0) {
        return declineUnknownTerm(ctx, frame.targetText, text, "plain");
      }
      return declineUnsupported(ctx, frame.targetText, lk, "plain");
    }

    case "causal": {
      const quality = frame.qualityText ? resolveQuality(ctx, frame.qualityText) : undefined;
      if (frame.objectText) {
        const objLk = lookupTerm(ctx, frame.objectText);
        lookupStep(builder, objLk, "comparative object; answered from the subject's side");
      }
      return routeCausalSubject(ctx, frame.subjectText, quality, builder, text, frame.unanchoredActivity);
    }

    case "ontology":
      return routeOntologyTerm(ctx, frame.targetText, builder, text);

    case "definition":
      return routeDefinitionTerm(ctx, frame.targetText, builder, text);

    case "bare": {
      const session = ctx.session;
      const lk = lookupTerm(ctx, frame.targetText);
      const lastRoute = [...session.recentThoughts]
        .reverse()
        .find((t) => t.decision.kind === "route" && !/^why did you say/.test(t.question))
        ?.decision as RouteToIntent | undefined;
      if (lastRoute?.intent.intentType === "correspondence") {
        const val = lk.ontology.find((m) => m.roles.includes("correspondence-value"));
        if (val) {
          lookupStep(builder, lk, "D4/ellipsis: slotted by role into the correspondence frame");
          const node = graph.getNode(val.nodeId)!;
          return {
            kind: "route",
            intent: makeIntent({ intentType: "correspondence", matchedNodes: [val.nodeId] }),
            terms: [nodeTerm(node, frame.targetText, "subject")],
            surfaceMode: "framework",
            decisionReason: "D4/ellipsis",
          };
        }
        const el = lk.ontology.find((m) => m.roles.includes("primitive-element"));
        if (el) {
          lookupStep(builder, lk, "D4/ellipsis: slotted by role into the correspondence frame");
          const node = graph.getNode(el.nodeId)!;
          return {
            kind: "route",
            intent: makeIntent({
              intentType: "correspondence",
              matchedNodes: [el.nodeId],
              category: lastRoute.intent.category,
            }),
            terms: [nodeTerm(node, frame.targetText, "subject")],
            surfaceMode: "framework",
            decisionReason: "D4/ellipsis",
          };
        }
      }
      // A quality term continues as a definition of that quality (§7.4 D4:
      // the frame cannot take it as a subject of the same shape).
      const isQuality =
        lk.ontology.some((m) => m.roles.includes("quality")) ||
        lk.senses.some(
          (s) => s.mappedConceptId && graph.getNode(s.mappedConceptId)?.type === "Quality",
        );
      if (isQuality) return routeDefinitionTerm(ctx, frame.targetText, builder, text);
      if (lastRoute) {
        switch (lastRoute.intent.intentType) {
          case "causal_chain": {
            const qTerm = lastRoute.terms.find((t) => t.slot === "quality");
            const quality = qTerm?.nodeId
              ? { nodeId: qTerm.nodeId, term: qTerm }
              : undefined;
            return routeCausalSubject(ctx, frame.targetText, quality, builder, text);
          }
          case "ontology_explanation":
            return routeOntologyTerm(ctx, frame.targetText, builder, text);
          case "antonym_lookup": {
            const sub: Frame = { kind: "antonym", targetText: frame.targetText };
            return routeFrame(ctx, sub, text, builder);
          }
          case "part_of": {
            const sub: Frame = {
              kind: "part_of",
              targetText: frame.targetText,
              variant: (lastRoute.intent.variant as "whole" | "parts") ?? "whole",
            };
            return routeFrame(ctx, sub, text, builder);
          }
          default:
            return routeDefinitionTerm(ctx, frame.targetText, builder, text);
        }
      }
      return routeDefinitionTerm(ctx, frame.targetText, builder, text);
    }

    case "unsupported": {
      for (const word of norm(text).split(/[^a-z]+/)) {
        if (word.length < 4) continue;
        const lk = lookupTerm(ctx, word);
        if (lk.ontology.length > 0 || lk.senses.length > 0) {
          lookupStep(builder, lk);
          return declineUnsupported(ctx, word, lk, "plain");
        }
      }
      return declineNoContent("plain");
    }

    default:
      return declineNoContent("plain");
  }
}

/* --- session finalisation ------------------------------------------- */

function finaliseSession(
  ctx: LookupContext,
  decision: RouteDecision,
  builder: TraceBuilder,
  rawText: string,
  turn: number,
): void {
  const session = ctx.session;
  builder.addStep({
    kind: "route",
    inputs: [decision.kind === "route" ? decision.intent.intentType : decision.kind],
        note: decision.decisionReason,
  });
  if (decision.kind === "clarify") {
    session.pendingClarification = {
      originalQuestion: decision.originalQuestion,
      askedAtTurn: turn,
      branches: decision.branches,
    };
    return;
  }
  if (decision.kind !== "route") return;
  for (const term of decision.terms) {
    if (term.synsetId) {
      const mapped = mappedConceptForSynset(ctx.graph, term.synsetId)?.id;
      const climb = climbOf(ctx.graph, term.synsetId);
      session.resolvedSenses[term.lemma] = {
        term: term.lemma,
        surface: term.surface,
        synsetId: term.synsetId,
        ontologyNodeId: term.nodeId ?? mapped ?? climb?.anchorNodeId,
        resolvedBy: term.resolvedBy === "ontology-name" ? "frame" : term.resolvedBy,
        turn,
      };
    }
    session.recentTerms = [
      { term: term.lemma, nodeId: term.nodeId, synsetId: term.synsetId, turn },
      ...session.recentTerms.filter((r) => r.term !== term.lemma),
    ].slice(0, 10);
  }
  const subjectTerm = decision.terms.find((t) => t.slot === "subject");
  const conceptId =
    subjectTerm?.nodeId ??
    (subjectTerm?.synsetId
      ? (mappedConceptForSynset(ctx.graph, subjectTerm.synsetId)?.id ??
        climbOf(ctx.graph, subjectTerm.synsetId)?.anchorNodeId)
      : undefined);
  const concept = conceptId ? ctx.graph.getNode(conceptId) : undefined;
  const weatherish =
    concept?.domain === "meteorology" ||
    TOPIC_KEYWORDS.meteorology.some((k) => rawText.toLowerCase().includes(k));
  if (weatherish) {
    const prior = session.topicFrame?.id === "meteorology" ? session.topicFrame : undefined;
    session.topicFrame = {
      id: "meteorology",
      label: "weather",
      anchorNodeIds: conceptId
        ? [...new Set([...(prior?.anchorNodeIds ?? []), conceptId])]
        : (prior?.anchorNodeIds ?? []),
      evidenceTerms: [
        ...new Set([...(prior?.evidenceTerms ?? []), subjectTerm?.surface ?? ""].filter(Boolean)),
      ],
      setAtTurn: prior?.setAtTurn ?? turn,
      lastUsedTurn: turn,
    };
  }
}

function situationRoute(
  variant: string,
  category: string | undefined,
  decisionReason: string,
): RouteToIntent {
  return {
    kind: "route",
    intent: makeIntent({ intentType: "situation", variant, category, matchedNodes: [] }),
    terms: [],
    surfaceMode: "plain",
    decisionReason,
  };
}

export function routeTurn(
  graph: Graph,
  session: SessionState,
  rawText: string,
  opts: RouterOptions = {},
): RouteOutcome {
  const extract = opts.extract ?? getDefaultExtract();
  const ctx: LookupContext = { graph, extract, session };
  session.turn += 1;
  const turn = session.turn;
  const builder = new TraceBuilder(turn, rawText);
  const eventDrafts: EventDraft[] = [];
  const timezone = opts.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const instant = opts.now ?? new Date();
  let situation = computeSituation({
    instant,
    timezone,
    location: session.situationOverrides?.location ?? opts.location,
    statedSeason: session.situationOverrides?.seasonConceptId,
    hostDescription: opts.hostDescription,
  });
  ctx.situation = situation;
  const frame = detectFrame(rawText);

  const finish = (decision: RouteDecision, shadow?: Situation): RouteOutcome => {
    if (opts.debug) decision.surfaceMode = "debug";
    if (opts.thresholdOverride !== undefined && decision.kind === "route") {
      decision.intent.confidenceThreshold = opts.thresholdOverride;
    }
    finaliseSession(ctx, decision, builder, rawText, turn);
    return { decision, builder, situation, shadow, eventDrafts };
  };

  // D0: a pending clarification takes the first interpretation attempt.
  const pending = session.pendingClarification;
  if (pending) {
    session.pendingClarification = undefined;
    const branch = matchPendingBranch(pending, rawText);
    if (branch) {
      builder.addStep({
        kind: "lookup",
        inputs: [rawText],
                note: "D0/pending-reply",
      });
      const decision: RouteToIntent = {
        ...branch.route,
        terms: branch.route.terms.map((t) =>
          t.synsetId ? { ...t, resolvedBy: "user" as const } : t,
        ),
      };
      eventDrafts.push({
        kind: "clarification-resolved",
        question: pending.originalQuestion,
        branchId: branch.id,
        resolvedTermIds: branch.route.terms
          .map((t) => t.nodeId ?? t.synsetId)
          .filter((x): x is string => Boolean(x)),
      });
      return finish(decision);
    }
    // No match: the pending clarification is discarded (one round only).
  }

  // §8.4 replay: re-render a stored trace; the reasoner is not re-run.
  if (frame.kind === "replay") {
    const found = [...session.recentThoughts]
      .reverse()
      .find((t) => t.decision.kind === "route" && !/^why did you say/.test(t.question));
    if (found && found.decision.kind === "route") {
      builder.addStep({
        kind: "lookup",
        inputs: [`trace:${found.turn}`],
                note: "replay: stored trace re-rendered, reasoner not re-run",
      });
      const outcome = finish(found.decision);
      outcome.replayTrace = found;
      return outcome;
    }
    return finish({
      kind: "decline",
      reason: "no prior trace to replay",
      userMessage:
        "There's nothing before this to point back to — ask me something first, and afterwards I can show you how I got the answer.",
      alternatives: [],
      surfaceMode: "plain",
      decisionReason: "D-replay/no-prior-trace",
    });
  }

  // D1: corrections.
  if (frame.kind === "correction") {
    return finish(handleCorrection(ctx, frame.descriptor, builder, rawText, eventDrafts));
  }

  // Step 0 (§7.3/§8.12): situation and self-reference.
  if (frame.kind === "location_statement") {
    builder.addStep({ kind: "lookup", inputs: [frame.place], note: "step0/location-statement" });
    const resolved = opts.placeResolver?.(frame.place);
    if (resolved) {
      const location: SituationLocation = {
        lat: resolved.lat,
        lon: resolved.lon,
        label: resolved.label,
        source: "user-stated",
      };
      session.situationOverrides = { ...session.situationOverrides, location };
      situation = computeSituation({ instant, timezone, location, hostDescription: opts.hostDescription });
      return finish(situationRoute("location-stated", undefined, "step0/location-statement"));
    }
    return finish({
      kind: "decline",
      reason: `place not resolvable: "${frame.place}"`,
      userMessage: `Noted — ${frame.place}. I don't have its position, so I can't work out its seasons or times of day from it yet.`,
      alternatives: [],
      surfaceMode: "plain",
      decisionReason: "D-situation/place-unresolved",
    });
  }
  if (frame.kind === "self_question") {
    return finish(
      situationRoute(
        frame.variant === "time" ? "time-of-day" : "self",
        undefined,
        "step0/self-reference",
      ),
    );
  }
  if (frame.kind === "season_here") {
    if (situation.derived.seasonHere) {
      return finish(situationRoute("season-here", frame.askedSeason, "step0/situation"));
    }
    const north = computeSituation({
      instant,
      timezone,
      location: { lat: 45, lon: 0, source: "host-config" },
    });
    const south = computeSituation({
      instant,
      timezone,
      location: { lat: -33, lon: 151, source: "host-config" },
    });
    const nameOf = (s: Situation) => {
      const id = s.derived.seasonHere;
      return id ? (graph.getNode(id)?.name.toLowerCase() ?? id) : "unknown";
    };
    return finish({
      kind: "decline",
      reason: "location unknown",
      userMessage: `I don't know where I am, so I can't say for here. If you're in the northern temperate zone, it's ${nameOf(north)} there just now; in the southern temperate zone, ${nameOf(south)}. Tell me the place and I'll answer directly.`,
      alternatives: [],
      surfaceMode: "plain",
      decisionReason: "D-situation/unknown-location",
    });
  }
  if (frame.kind === "tonight") {
    if (situation.derived.seasonHere) {
      return finish(situationRoute("tonight", undefined, "step0/situation"));
    }
    return finish({
      kind: "decline",
      reason: "location unknown",
      userMessage:
        "I don't know where I am, so I can't say how long tonight will be here. Tell me the place and I can answer from its season.",
      alternatives: [],
      surfaceMode: "plain",
      decisionReason: "D-situation/unknown-location",
    });
  }
  if (frame.kind === "shadow_season") {
    builder.addStep({
      kind: "lookup",
      inputs: [frame.place],
            note: "step0/shadow-situation",
    });
    const resolved = opts.placeResolver?.(frame.place);
    if (!resolved) {
      return finish({
        kind: "decline",
        reason: `place not resolvable: "${frame.place}"`,
        userMessage: `I don't have ${frame.place} in what I know, so I can't work out its season.`,
        alternatives: [],
        surfaceMode: "plain",
        decisionReason: "D-situation/place-unresolved",
      });
    }
    const shadow = shadowSituation(situation, {
      location: {
        lat: resolved.lat,
        lon: resolved.lon,
        label: resolved.label,
        source: "user-stated",
      },
    });
    return finish(
      situationRoute("shadow-season", frame.askedSeason, "step0/shadow-situation"),
      shadow,
    );
  }

  return finish(routeFrame(ctx, frame, rawText, builder));
}

/* ------------------------------------------------------------------ */
/* runTurn: route → reason → check → render → record (§7.2, §8)        */
/* ------------------------------------------------------------------ */

function hourInTimezone(instant: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(instant);
  return Number(parts.find((p) => p.type === "hour")?.value ?? 0);
}

function buildSituationConclusions(
  builder: TraceBuilder,
  decision: RouteToIntent,
  situation: Situation,
  shadow: Situation | undefined,
  graph: Graph,
): void {
  void graph;
  const d = situation.derived;
  const variant = decision.intent.variant;
  const locLabel = (s: Situation): string | undefined =>
    s.location && !("unknown" in s.location) ? s.location.label : undefined;
  const add = (
    conclusion: NonNullable<Parameters<TraceBuilder["addStep"]>[0]["conclusion"]>,
    note: string,
  ) => builder.addStep({ kind: "lookup", inputs: ["situation"], conclusion, note });
  switch (variant) {
    case "self": {
      const label = locLabel(situation);
      add(
        {
          subjectId: "situation",
          relation: "SITUATION_SELF",
          confidence: 1,
          facts: {
            hostDescription: situation.host.description,
            ...(label ? { locationLabel: label } : {}),
          },
        },
        "step0/self-reference",
      );
      break;
    }
    case "time-of-day": {
      add(
        {
          subjectId: d.timeOfDayPhase ?? "day",
          relation: "TIME_OF_DAY",
          confidence: 1,
          facts: {
            hour: hourInTimezone(
              new Date(situation.instant),
              situation.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
            ),
          },
        },
        "step0/time-of-day",
      );
      break;
    }
    case "season-here": {
      if (!d.seasonHere) break;
      const asked = decision.intent.category;
      add(
        {
          subjectId: d.seasonHere,
          relation: "SEASON_HERE",
          confidence: 1,
          facts: {
            askedSeason: asked ?? "",
            verdict: asked ? (asked === d.seasonHere ? "yes" : "no") : "statement",
          },
        },
        "step0/season-here",
      );
      break;
    }
    case "shadow-season": {
      if (!shadow?.derived.seasonHere) break;
      const asked = decision.intent.category;
      add(
        {
          subjectId: shadow.derived.seasonHere,
          relation: "SHADOW_SEASON",
          confidence: 1,
          facts: {
            place: locLabel(shadow) ?? "",
            askedSeason: asked ?? "",
            verdict: asked ? (asked === shadow.derived.seasonHere ? "yes" : "no") : "statement",
            hypothetical: 1,
          },
        },
        `hypothetical: shadow situation for ${locLabel(shadow) ?? "place"}`,
      );
      break;
    }
    case "tonight": {
      const light = situation.derived.lightAspect;
      add(
        {
          subjectId: d.seasonHere ?? "night",
          relation: "TONIGHT",
          confidence: 1,
          facts: {
            band: light.band,
            source: light.source,
            ...(light.yinProportion !== undefined ? { yinProportion: light.yinProportion } : {}),
          },
        },
        "step0/tonight-canonical",
      );
      break;
    }
    case "location-stated": {
      add(
        {
          subjectId: "situation",
          relation: "LOCATION_STATED",
          objectId: d.seasonHere,
          confidence: 1,
          facts: { place: locLabel(situation) ?? "" },
        },
        "step0/location-stated",
      );
      break;
    }
    default:
      break;
  }
}

export interface TurnResult {
  decision: RouteDecision;
  trace: ThoughtTrace;
  rendered: RenderedAnswer;
  session: SessionState;
  situation: Situation;
  result?: ReasonerResult;
}

export function runTurn(
  graph: Graph,
  session: SessionState,
  rawText: string,
  opts: RouterOptions = {},
): TurnResult {
  const extract = opts.extract ?? getDefaultExtract();
  const outcome = routeTurn(graph, session, rawText, opts);
  const { decision, builder } = outcome;

  const recordTrace = (trace: ThoughtTrace) => {
    session.recentThoughts = [...session.recentThoughts, trace].slice(-20);
  };
  const writeEvents = (rendered: RenderedAnswer) => {
    if (opts.experienceDir === null) return;
    const dir = opts.experienceDir ?? `${process.cwd()}/data/experience`;
    const at = new Date().toISOString();
    for (const draft of outcome.eventDrafts) {
      appendExperienceEvent({ ...draft, at, sessionId: session.sessionId } as ExperienceEvent, dir);
    }
    // §9.7 RD-GAP-EVENT: one renderer-gap event per violated answer,
    // carrying the first violation's stage and detail.
    const firstViolation = rendered.violations[0];
    if (firstViolation) {
      appendExperienceEvent(
        {
          kind: "renderer-gap",
          at,
          sessionId: session.sessionId,
          stage: firstViolation.stage,
          detail: firstViolation.detail,
          resolution: firstViolation.resolution,
          question: rawText,
        },
        dir,
      );
    }
    if (decision.kind === "decline" && /^D(2|3|10)\//.test(decision.decisionReason)) {
      const quoted = decision.reason.match(/"([^"]+)"/)?.[1];
      appendExperienceEvent(
        {
          kind: "gap-hit",
          at,
          sessionId: session.sessionId,
          question: rawText,
          decisionReason: decision.decisionReason,
          unanchoredTerms: quoted ? [quoted] : [],
        },
        dir,
      );
    }
  };

  // Replay: render the stored trace's conclusions in framework mode.
  if (outcome.replayTrace) {
    const checks: ThoughtTrace["checks"] = {
      conflict: "pass",
      leakage: "pass",
      confidenceFloor: { weakestConfidence: 1, action: "none" },
    };
    const trace = builder.finish(decision, checks);
    recordTrace(trace);
    const rendered = renderAnswer({
      graph,
      decision: outcome.replayTrace.decision,
      trace: outcome.replayTrace,
      modeOverride: "framework",
      extract,
    });
    return { decision, trace, rendered, session, situation: outcome.situation };
  }

  let result: ReasonerResult | undefined;
  if (decision.kind === "route") {
    if (decision.intent.intentType === "situation") {
      buildSituationConclusions(builder, decision, outcome.situation, outcome.shadow, graph);
    } else {
      result = (opts.answerIntentFn ?? answerIntent)(graph, rawText, decision.intent, builder);
    }
  }

  // §8.2 pre-speech checks over the structured conclusions.
  const conclusions = builder.conclusions;
  const conflicts = findConflicts(conclusions);
  const leakageFlag =
    decision.surfaceMode === "plain" &&
    conclusions.some((c) => {
      for (const id of [c.subjectId, c.objectId]) {
        if (!id) continue;
        const n = graph.getNode(id);
        if (
          n &&
          (n.type === "Polarity" || n.type === "Element" || n.type === "Trigram") &&
          !n.manifestations
        ) {
          return true;
        }
      }
      return false;
    });
  const floorSet = conclusions.filter(
    (c) =>
      !c.relation.startsWith("NO_") &&
      c.relation !== "CLIMBS_TO" &&
      c.relation !== "UNANCHORED_TERM",
  );
  const weakest = floorSet.length > 0 ? Math.min(...floorSet.map((c) => c.confidence)) : 1;
  const threshold = decision.kind === "route" ? decision.intent.confidenceThreshold : 0;
  const checks: ThoughtTrace["checks"] = {
    conflict: conflicts.length > 0 ? "flagged" : "pass",
    leakage: leakageFlag ? "flagged" : "pass",
    confidenceFloor: {
      weakestConfidence: weakest,
      action: weakest < 0.5 ? "downgrade" : weakest < threshold ? "hedge" : "none",
    },
  };
  // §8.2: the checks are also steps in the trace (subject to the bound).
  builder.addStep({ kind: "check", check: "conflict", outcome: checks.conflict, inputs: ["check:conflict"] });
  builder.addStep({ kind: "check", check: "leakage", outcome: checks.leakage, inputs: ["check:leakage"] });
  builder.addStep({
    kind: "check",
    check: "confidence-floor",
    outcome: checks.confidenceFloor.action === "none" ? "pass" : "flagged",
    inputs: ["check:confidence-floor"],
  });
  const trace = builder.finish(decision, checks);
  recordTrace(trace);
  const rendered = renderAnswer({
    graph,
    decision,
    trace,
    extract,
    realiseOverride: opts.realiseOverride,
  });
  writeEvents(rendered);
  return { decision, trace, rendered, session, situation: outcome.situation, result };
}
