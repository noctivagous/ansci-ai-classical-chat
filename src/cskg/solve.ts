/**
 * solve.ts — engine piece E: query / problem solving (design §2, §6).
 *
 * Triage per turn: information to retrieve (graph lookups over
 * relations), a problem to solve (construct a set satisfying stated
 * constraints), or a combination. E decides WHICH edges answer the
 * question actually asked and records them as the workspace's
 * conclusions; F (articulate.ts) owns every sentence template that
 * words them.
 *
 * E1's machinery is the spike's, rehoused: reverse UsedFor tool
 * finding (retrieval shading into solving — the constraint set is
 * assembled, ranked, and the merge-gap fallback route disclosed in
 * the trace), the why/causes walks, two-term relatedness, the
 * per-intent relation queries, and fact selection under situation
 * pressure.
 *
 * E3 (§6, §7, §8) makes the solving explicit:
 *   - TRIAGE: every turn's work is classified retrieve | solve |
 *     combination and noted in the trace (noteTriage).
 *   - SET OPERATIONS for tool problems: the strict UsedFor set,
 *     DIFFERENCE for the person's stated exclusions, and the
 *     disclosed RelatedTo/IsA fallback (a combination) only when
 *     the strict set is empty.
 *   - RANKING FLOOR: conclusion sets rank by support, then by the
 *     candidate's affinity to its subject, and a support-1,
 *     zero-affinity fact is not FEATURED when enough
 *     better-attested or better-connected members exist.
 *   - EMPTY-SET DECLINE: a why-question is answered only from the
 *     subject's own causal edges or a traced two-step chain
 *     through the subject; an empty causal set declines and names
 *     the missing causation — never a neighbouring word's edges.
 *   - WITHIN-NODE FACT CHOICE (§7 finding (c)): rival edges of one
 *     merged node are scored not by support alone but also by the
 *     fit between each edge TARGET's neighbourhood and the turn's
 *     contents + active context, so "brother" beside "girlfriend"
 *     can be a sibling rather than a monk.
 *
 * Writes (engine map): `conclusions` — via addConclusions(), the
 * only push. Reads: `breakdown`, `intent`, `activeContext`,
 * `situation`.
 */
import {
  situationallyRelevant,
  type Situation,
} from "./awareness";
import {
  edgeText,
  renderAll,
  renderBecauseLines,
  renderCausalLinkLine,
  renderCausedByLines,
  renderConclusion,
  renderDefinition,
  renderMeeting,
  renderStatePattern,
  type Conclusion,
} from "./articulate";
import { chooseDefinition, definitionTraceNote } from "./definitions";
import { pureTimeLabel } from "./contents";
import {
  contentCandidates,
  matchEvent,
  matchEventTemplate,
  resolveTerms,
  STOPWORDS,
  TEMPLATE_STRONG,
  tokenise,
  type EventTemplateMatch,
  type ResolvedTerm,
  type ScoredTerm,
} from "./discourse";
import { contextRelevance } from "./context";
import { definitionForSynset } from "./definitions";
import {
  classifySurface,
  isDefinitionQuestion,
  type EventQuestionKind,
  type SurfaceIntentKind,
} from "./intent";
import type { CskgEdge, CskgGraph } from "./loader";
import { remember, type SessionState } from "./memory";
import { noteStep, type TurnWorkspace } from "./workspace";

/** E's one write: add conclusions to the workspace. */
export function addConclusions(ws: TurnWorkspace, cs: Conclusion[]): void {
  ws.conclusions.push(...cs);
}

/* ---------------- triage (E3) ----------------------------------- */

export type TriageKind = "retrieve" | "solve" | "combination";

/** Record the turn's triage in the trace — which set the question asks about. */
export function noteTriage(ws: TurnWorkspace, kind: TriageKind, detail: string): void {
  noteStep(ws, "solve", "triage", `${kind} — ${detail}`);
}

/* ---------------- neighbourhood affinity (E3 → EverydaySense) ---
 *
 * Affinity between two nodes = the specificity-weighted overlap
 * of their neighbourhoods (a shared neighbour counts 3 when
 * specific, 1 when mid-frequency, 0 when a hub — §7 finding
 * (a)'s lesson). The measure was born here in E3; the E3 note
 * flagged it as a local precursor of EverydaySense typicality,
 * and E4 moved it to everydaysense.ts, its designed home. The
 * numbers are unchanged; solve imports and re-exports it.
 */

import { affinityBetween, clusterEvidenceIds, filingClusters } from "./everydaysense";
import { definitionCandidates, senseClusterLabel, senseEvidence } from "./definitions";
export { affinityBetween, typicalityOf } from "./everydaysense";

/**
 * Fit of a candidate node against a context set: the BEST SINGLE
 * corroboration, never a sum. §7 finding (a)'s lesson, learned
 * twice: summed over a dozen context nodes, affinity degrades
 * into "most connected node wins" (the hypernym "food" summed 272
 * against a banana-bread turn's accumulated topics and beat the
 * better-attested "quick bread"). One context node whose world
 * genuinely overlaps the target's is evidence; fifteen weak
 * overlaps are hub noise. Discourse's candidate scoring already
 * works this way (best-single-topic affinity); solve now matches.
 */
/** Does `node` inherit from `ancestor` within two IsA hops? */
function inheritsFrom(g: CskgGraph, node: number, ancestor: number): boolean {
  const hop1 = g.outEdges(node, "/r/IsA");
  if (hop1.some((e) => e.to === ancestor)) return true;
  return hop1.some((e1) =>
    g.outEdges(e1.to, "/r/IsA").some((e2) => e2.to === ancestor),
  );
}

export function contextFit(g: CskgGraph, targetId: number, contextIds: number[]): number {
  let fit = 0;
  for (const c of contextIds) {
    if (c === targetId) continue;
    // Inherited overlap is not corroboration: when the context
    // node is a kind of the target (banana IsA food) or the
    // target a kind of it, the target's neighbourhood contains
    // the context node's world BY CONSTRUCTION — a hypernym
    // "fits" everything under it. Sense corroboration is the
    // overlap that inheritance does not explain (girlfriend's
    // romantic cluster inside "male"'s world; nothing of the
    // sort connects "girlfriend" to "ally" once her IsA→ ally
    // edge is discounted).
    if (inheritsFrom(g, c, targetId) || inheritsFrom(g, targetId, c)) continue;
    const a = affinityBetween(g, targetId, c);
    // A whisper is not corroboration either: below 4 (two specific
    // shared neighbours, or one specific and one mid-frequency) a
    // single context node's overlap is coincidence on this graph —
    // the adjective fragment "big" shared a couple of neighbours
    // with the hub "place" and briefly made soup a place.
    if (a >= 4 && a > fit) fit = a;
  }
  return fit;
}

/** Pronoun labels: as context they are pure neighbourhood noise. */
const PRONOUN_LABELS = new Set([
  "i", "me", "you", "he", "she", "it", "we", "they", "him", "her",
  "us", "them", "his", "hers", "my", "mine", "your", "yours",
  "our", "ours", "their", "theirs", "i'm", "you're", "he's",
  "she's", "we're", "they're", "it's",
]);

/**
 * The context a fact choice is judged against (§7(c)): the turn's
 * categorised contents (contents.ts), its scored topics, and the
 * conversation's active topics from memory — with the noise
 * filtered out. Measured on the live graph: the pronoun node
 * "his" was a top topic of the brother turn and its neighbourhood
 * corroborated "member" (+13) over "male"; a remembered time
 * expression ("saturday") corroborated it too (+3). Pronouns and
 * time expressions are not what a fact choice is about, so they
 * never enter the context set.
 */
export function turnContextIds(g: CskgGraph, ws: TurnWorkspace): number[] {
  const ids = new Set<number>();
  for (const e of ws.breakdown?.contents?.entries ?? []) {
    if (PRONOUN_LABELS.has(e.text)) continue;
    // a pure time entry ("on saturday") is not what a fact is about
    if (e.chosen.length === 1 && e.chosen[0] === "time") continue;
    // a residual-only entry ("big", "making") carries no kind
    // evidence of its own — fragments corroborate nothing
    if (Math.max(...e.kinds.map((k) => k.score)) < 2) continue;
    ids.add(e.referentId);
  }
  // the contents entries by text, and whether every mention of
  // a text is a phrase MODIFIER — for the fragment guard below
  const contentsKindPeak = new Map<string, number>();
  for (const e of ws.breakdown?.contents?.entries ?? []) {
    contentsKindPeak.set(e.text, Math.max(...e.kinds.map((k) => k.score)));
  }
  const modifierOnly = new Map<string, boolean>();
  for (const m of ws.breakdown?.mentions ?? []) {
    if (m.chosen < 0) continue;
    const text = m.candidates[m.chosen].text;
    modifierOnly.set(text, (modifierOnly.get(text) ?? true) && m.role === "modifier");
  }
  for (const t of ws.breakdown?.topics ?? []) {
    if (PRONOUN_LABELS.has(t.text) || pureTimeLabel(t.text)) continue;
    // only topics that scored as topical: a negative-score topic
    // is a fragment discourse itself rejected ("big", −2, in the
    // soup turn — whose size-collocation neighbourhood briefly
    // out-corroborated "dish" for the hub target "place"). The
    // coordinator applies the same ≥ 0 rule when feeding memory.
    if (t.score < 0) continue;
    // E4: a MODIFIER fragment with no kind evidence of its own
    // corroborates nothing, even when facet overlap lifted its
    // topic score over the ≥ 0 bar ("big" again, this time
    // riding the situation sets: its 31-point affinity with
    // "place" flipped the soup turn until this guard landed).
    // A head/coordinated topic is never a fragment, however
    // thin its kind evidence ("girlfriend" in the brother turn
    // is the corroboration that matters there).
    const peak = contentsKindPeak.get(t.text);
    if (peak !== undefined && peak < 2 && modifierOnly.get(t.text)) continue;
    ids.add(t.id);
  }
  for (const t of ws.activeContext?.topics ?? []) {
    const label = g.terms[t];
    if (label === undefined) continue;
    if (PRONOUN_LABELS.has(label) || pureTimeLabel(label)) continue;
    ids.add(t);
  }
  // E4: the person's recorded fact subjects/objects join the
  // set — person pressure enters the fact choice's
  // corroboration DURING analysis (context.ts composed them).
  // The situation's facet IDS deliberately do NOT join: they
  // are vocabulary words, not conversation topics, and at full
  // corroboration strength they import hub noise — measured
  // on the live graph, the autumn facet "leaf" corroborated
  // brother→"member" (affinity 6, a plant-anatomy
  // neighbourhood) past the genuine girlfriend→"male"
  // corroboration and flipped the turn to the wrong sense.
  // Situation pressure reaches solve through the relevance
  // channel instead (relevanceFor: Context's facets, +5 in
  // pickFactScored) and reaches discourse through its capped
  // overlap sets — pressure during analysis, at strengths the
  // evidence supports.
  if (ws.context) {
    for (const id of ws.context.personFactIds) ids.add(id);
  }
  return [...ids];
}

/**
 * The relevance function a fact choice should use for this
 * workspace: the operative context's own relevance (Context's
 * declared facets) when Context has composed, else the raw
 * situation check the spike used.
 */
export function relevanceFor(
  ws: TurnWorkspace,
): ((termText: string) => boolean) | undefined {
  const ctx = ws.context;
  const sit = ws.situation;
  if (!ctx || !sit) return undefined;
  return (termText: string) => contextRelevance(ctx, sit, termText);
}

/* ---------------- fact selection with situation pressure -------- */

export const FACT_REL_PRIORITY = [
  "/r/IsA", "/r/UsedFor", "/r/Causes", "at:xEffect", "at:xReact",
  "/r/HasProperty", "/r/AtLocation", "/r/CapableOf", "/r/PartOf",
  "/r/HasA", "/r/MadeOf", "/r/HasSubevent", "at:oReact", "at:xWant",
];

/**
 * Choose the single most presentable grounded fact about a term.
 * Ordering: relation priority, then dataset support, then the
 * Situation's seasonal/daypart relevance.
 *
 * E3 adds the WITHIN-NODE term (§7 finding (c)): when a merged
 * node's rival edges compete for the fact slot, each edge is also
 * scored by the fit between its TARGET's neighbourhood and the
 * turn's contents + active context (contextIds, the source node
 * itself excluded; the fit is the best single corroboration —
 * see contextFit). The fit is worth at most +8 — enough to cross
 * a support gap inside one relation level (support is 3 a level:
 * "sibling"/"male" at support 1 can beat "monk" at support 2 when
 * the turn's other contents live in the target's world), never
 * enough to cross a relation-priority level (10 per level) on fit
 * alone. Attestation stays one factor among several — it is no
 * longer the decider it was when it picked the monk.
 */
export function pickFactScored(
  g: CskgGraph,
  id: number,
  sit: Situation,
  rels: string[] = FACT_REL_PRIORITY,
  contextIds: number[] = [],
  relevance?: (termText: string) => boolean,
): { c: Conclusion; score: number } | null {
  // The source itself is not its own context, and neither is its
  // own lexical family: a head-word expansion of the source's own
  // phrase ("coat" inside "winter coat") must not corroborate a
  // near-synonym target ("warm clothes" shares 13 weighted
  // neighbours with "coat" — the source applauding itself).
  const srcText = g.terms[id];
  const ownFamily = (cid: number): boolean => {
    const t = g.terms[cid];
    return t === srcText || srcText.endsWith(` ${t}`) || t.endsWith(` ${srcText}`);
  };
  const context = contextIds.filter((c) => c !== id && !ownFamily(c));
  let best: { c: Conclusion; score: number; fit: number; support: number; labelLen: number } | null = null;
  for (const rel of rels) {
    for (const e of g.outEdges(id, rel)) {
      const c: Conclusion = { edge: e, about: "from" };
      let score = (rels.length - rels.indexOf(rel)) * 10 + e.support * 3;
      const fit = context.length ? Math.min(8, contextFit(g, e.to, context)) : 0;
      score += fit;
      // Situation relevance, read through the operative context
      // when the caller supplies it (E4): Context's facets, not
      // the raw situation, decide what is situationally live.
      if (relevance ? relevance(g.terms[e.to]) : situationallyRelevant(g.terms[e.to], sit)) score += 5;
      // prefer readable targets: very long targets are usually noise
      if (g.terms[e.to].split(" ").length > 6) score -= 4;
      const labelLen = g.terms[e.to].length;
      // Deterministic ties (§6: attestation first): better support,
      // then the shorter, more readable label, then raw fit. Fit
      // does its work inside the score; on an exact total, the
      // better-attested fact stands.
      if (
        !best || score > best.score ||
        (score === best.score &&
          (e.support > best.support ||
            (e.support === best.support &&
              (labelLen < best.labelLen ||
                (labelLen === best.labelLen && fit > best.fit)))))
      ) {
        best = { c, score, fit, support: e.support, labelLen };
      }
    }
  }
  return best;
}

export function pickFact(
  g: CskgGraph,
  id: number,
  sit: Situation,
  rels: string[] = FACT_REL_PRIORITY,
  contextIds: number[] = [],
  relevance?: (termText: string) => boolean,
): Conclusion | null {
  return pickFactScored(g, id, sit, rels, contextIds, relevance)?.c ?? null;
}

/**
 * The top n conclusions of one relation slot, ranked.
 *
 * E3 ranking (§6): attestation support first; then the other
 * endpoint's AFFINITY to the subject (specificity-weighted
 * neighbourhood overlap, the same measure as the within-node
 * choice) — a use that lives in the subject's world outranks an
 * exotic one; then situation relevance; then the shorter label.
 *
 * The ranking FLOOR: a candidate with minimal support (1) and
 * zero affinity is not featured when at least n members of the
 * set are better attested (support ≥ 2) or better connected
 * (affinity ≥ 1). The Sydney coat is the canonical case: of its
 * eleven UsedFor edges all carry support 1, but the warmth uses
 * share specific neighbours with "coat" (jacket, winter jacket)
 * while "catch pigeons" shares none — so the floor leaves it out
 * of the featured set rather than merely ranking it last.
 */
export function topConclusions(
  g: CskgGraph,
  id: number,
  rel: string,
  dir: "out" | "in",
  n: number,
  sit?: Situation,
): Conclusion[] {
  const edges = dir === "out" ? g.outEdges(id, rel) : g.inEdgesFor(id, rel);
  const otherId = (e: CskgEdge): number => (dir === "out" ? e.to : e.from);
  const aff = new Map<CskgEdge, number>(
    edges.map((e) => [e, affinityBetween(g, otherId(e), id)]),
  );
  const sorted = edges.slice().sort((a, b) =>
    b.support - a.support ||
    (aff.get(b) ?? 0) - (aff.get(a) ?? 0) ||
    (sit
      ? (situationallyRelevant(g.terms[otherId(b)], sit) ? 1 : 0) -
        (situationallyRelevant(g.terms[otherId(a)], sit) ? 1 : 0)
      : 0) ||
    g.terms[otherId(a)].length - g.terms[otherId(b)].length,
  );
  const eligible = sorted.filter((e) => e.support >= 2 || (aff.get(e) ?? 0) >= 1);
  const pool = eligible.length >= n ? eligible : sorted;
  return pool
    .slice(0, n)
    .map((edge) => ({ edge, about: dir === "out" ? "from" : "to" }));
}

/* ---------------- the classified question intents --------------- */

const SURFACE_BUILDERS: Record<
  SurfaceIntentKind,
  (g: CskgGraph, id: number, sit: Situation) => Conclusion[]
> = {
  purpose: (g, id, sit) => topConclusions(g, id, "/r/UsedFor", "out", 3, sit),
  // AtLocation only: Visual Genome's LocatedNear is spatial noise
  // at conversational scale ("penguin near computer").
  location: (g, id, sit) => [
    ...topConclusions(g, id, "/r/AtLocation", "out", 3, sit),
  ],
  madeof: (g, id, sit) => topConclusions(g, id, "/r/MadeOf", "out", 3, sit),
  part: (g, id, sit) => [
    ...topConclusions(g, id, "/r/PartOf", "out", 2, sit),
    ...topConclusions(g, id, "/r/HasA", "out", 3, sit),
  ],
  capability: (g, id, sit) => topConclusions(g, id, "/r/CapableOf", "out", 3, sit),
  property: (g, id, sit) => [
    ...topConclusions(g, id, "/r/HasProperty", "out", 3, sit),
    ...topConclusions(g, id, "/r/IsA", "out", 1, sit),
  ],
  antonym: (g, id) => topConclusions(g, id, "/r/Antonym", "out", 1),
  // what-is: the IsA + HasProperty neighbourhood. On a
  // definition-shaped turn (intent.isDefinitionQuestion) the
  // WordNet gloss leads and this set follows it (Definitions
  // slice); on any other whatis turn it is the whole answer, as
  // before. Over-long targets are usually mangled sentence
  // fragments in ConceptNet ("ache ailment condition"), so cap
  // their length.
  whatis: (g, id, sit) => [
    ...topConclusions(g, id, "/r/IsA", "out", 4, sit)
      .filter((c) => g.terms[c.edge.to].split(" ").length <= 2),
    ...topConclusions(g, id, "/r/HasProperty", "out", 4, sit)
      .filter((c) => g.terms[c.edge.to].split(" ").length <= 4),
    ...topConclusions(g, id, "/r/UsedFor", "out", 1, sit),
  ].slice(0, 4),
};

/**
 * Execute one classified question intent: the subject is the first
 * candidate (in preference order) that actually yields conclusions —
 * a longer match must not hide a richer term it contains. Returns
 * the rendered answer, or null when no candidate yields anything.
 *
 * Definitions slice: on a definition-shaped what-is turn, the
 * candidate's WordNet gloss (definitions.ts — sense chosen
 * against the turn's judged context plus the candidate itself)
 * LEADS the answer, and the neighbourhood conclusions this
 * function has always produced follow it, un dropped — the
 * gloss replaces nothing the old reply carried. A candidate
 * with a gloss but no neighbourhood still answers (the gloss
 * alone); a candidate with neither is skipped, exactly as
 * before; a term with no synsets gets exactly the old answer.
 */
export function solveSurfaceIntent(
  g: CskgGraph,
  ws: TurnWorkspace,
  session: SessionState,
  kind: SurfaceIntentKind,
  candidates: ResolvedTerm[],
): string | null {
  const build = SURFACE_BUILDERS[kind];
  const sit = ws.situation!;
  const definitionTurn =
    kind === "whatis" && isDefinitionQuestion(ws.input.toLowerCase());
  const context = definitionTurn ? turnContextIds(g, ws) : [];
  for (const cand of candidates.slice(0, 4)) {
    const cs = build(g, cand.id, sit);
    const choice = definitionTurn
      ? chooseDefinition(g, g.terms[cand.id], [...context, cand.id], contextFit)
      : null;
    if (!cs.length && !choice) continue;
    if (cs.length) addConclusions(ws, cs);
    session.lastIntent = kind;
    if (choice) noteStep(ws, "solve", "query", definitionTraceNote(choice));
    for (const c of cs) {
      noteStep(ws, "solve", "conclude", kind, [edgeText(g, c.edge)]);
    }
    remember(session, cand.id);
    if (!choice) return renderAll(g, cs);
    const definition = renderDefinition(g.terms[cand.id], choice.chosen.gloss);
    return cs.length ? `${definition} ${renderAll(g, cs)}` : definition;
  }
  return null;
}

/** Generic question fallback: best fact about the first candidate that has one. */
export function solveGenericFact(
  g: CskgGraph,
  ws: TurnWorkspace,
  session: SessionState,
  candidates: ResolvedTerm[],
): string | null {
  const sit = ws.situation!;
  const context = turnContextIds(g, ws);
  for (const cand of candidates.slice(0, 4)) {
    const fact = pickFact(g, cand.id, sit, FACT_REL_PRIORITY, context, relevanceFor(ws));
    if (fact) {
      addConclusions(ws, [fact]);
      session.lastIntent = "fact";
      remember(session, cand.id);
      noteStep(ws, "solve", "conclude", "generic grounded fact", [edgeText(g, fact.edge)]);
      return renderConclusion(g, fact);
    }
  }
  return null;
}

/**
 * The statement acknowledgement fact: the best-SCORING fact across
 * the event match and all content candidates (incl. head-word
 * expansions) — first-with-a-fact let thin terms ("third",
 * "bananas"-the-film) beat richer ones ("rain", "banana").
 *
 * E2: the pool is discourse's scored topic ranking when the caller
 * supplies it, and each candidate's total is fact score + topic
 * score. The fact score's relation-priority steps (10 points per
 * level) mean topic score mostly breaks fact ties and punishes
 * fragment captures ("third" the ordinal modifier, topic score
 * deeply negative) — a rich fact about the actual topic now beats
 * an equally-ranked fact about a sentence fragment.
 */
export function bestStatementFact(
  g: CskgGraph,
  sit: Situation,
  ev: ResolvedTerm | null,
  resolved: ResolvedTerm[],
  primary: ResolvedTerm,
  factRels: string[],
  topics: ScoredTerm[] = [],
  contextIds: number[] = [],
  relevance?: (termText: string) => boolean,
): Conclusion | null {
  let fact: Conclusion | null = null;
  let bestScore = -Infinity;
  const topicScoreOf = new Map(topics.map((t) => [t.id, t.score]));
  const pool: { term: ResolvedTerm; topicScore: number }[] = [];
  if (ev) pool.push({ term: ev, topicScore: topicScoreOf.get(ev.id) ?? 0 });
  if (topics.length) {
    for (const t of topics) pool.push({ term: t, topicScore: t.score });
  } else {
    for (const t of contentCandidates(g, resolved)) {
      pool.push({ term: t, topicScore: 0 });
    }
  }
  if (!ev) pool.push({ term: primary, topicScore: topicScoreOf.get(primary.id) ?? 0 });
  const seenIds = new Set<number>();
  for (const cand of pool) {
    if (seenIds.has(cand.term.id)) continue;
    seenIds.add(cand.term.id);
    const scored = pickFactScored(g, cand.term.id, sit, factRels, contextIds, relevance);
    if (scored && scored.score + cand.topicScore > bestScore) {
      bestScore = scored.score + cand.topicScore;
      fact = scored.c;
    }
  }
  return fact;
}

/* ---------------- why / causes ---------------------------------- */

export function answerWhy(
  g: CskgGraph,
  ws: TurnWorkspace,
  topic: number,
): string | null {
  const incoming = g.inEdgesFor(topic, "/r/Causes");
  if (incoming.length) {
    const cs = incoming
      .slice()
      .sort((a, b) => b.support - a.support)
      .slice(0, 2)
      .map((edge) => ({ edge, about: "to" as const }));
    addConclusions(ws, cs);
    noteStep(ws, "solve", "query", `Causes into "${g.terms[topic]}"`, cs.map((c) => edgeText(g, c.edge)));
    return renderBecauseLines(g, cs);
  }
  const fact = pickFact(g, topic, ws.situation!, ["/r/Causes", "/r/HasPrerequisite", "at:xNeed"], turnContextIds(g, ws), relevanceFor(ws));
  if (fact) {
    addConclusions(ws, [fact]);
    return renderConclusion(g, fact);
  }
  return null;
}

export type WhyResult =
  | { kind: "answer"; text: string; chained: boolean }
  | { kind: "decline"; effectText: string; causeText: string | null };

/**
 * A why-question, under the EMPTY-SET DECLINE RULE (§6).
 *
 * The set the question asks about is fixed BEFORE any edge is
 * gathered: the causation running between what the person stated
 * as cause and what they stated as effect. Allowed answers, in
 * order:
 *   1. a direct causal edge between two mentioned terms;
 *   2. with a "when" clause (the person split cause from effect):
 *      a Causes edge out of a cause-side subject that LANDS on an
 *      effect-side subject, else a traced two-step chain
 *      cause —Causes→ middle —Causes→ effect (a combination);
 *   3. without one: Causes out of, or into, the turn's own
 *      subjects — the subject's own causal edges;
 *   4. an ATOMIC event among the mentioned terms and its xEffect.
 * Anything else is the empty set, and the turn DECLINES, naming
 * the missing causation. E2's version looped over every candidate
 * in either direction and took the first Causes edge touching
 * anything — that is how "water" (an effect-side word whose own
 * Causes-in happened to exist, from "soaking in hotspring")
 * answered a question about onions. The neighbouring set is never
 * substituted.
 */
export function answerWhyQuestion(
  g: CskgGraph,
  ws: TurnWorkspace,
  resolved: ResolvedTerm[],
): WhyResult {
  // edges connecting two resolved terms are the strongest answer
  const ids = new Set(resolved.map((r) => r.id));
  for (const r of resolved) {
    for (const e of g.outEdges(r.id)) {
      if (ids.has(e.to) && (e.rel === "/r/Causes" || e.rel === "at:xEffect" || e.rel === "at:oEffect")) {
        const c: Conclusion = { edge: e, about: "from" };
        addConclusions(ws, [c]);
        noteStep(ws, "solve", "conclude", "causal edge between two mentioned terms", [edgeText(g, e)]);
        return {
          kind: "answer",
          text: e.rel === "/r/Causes" ? renderCausalLinkLine(g, e) : renderConclusion(g, c),
          chained: false,
        };
      }
    }
  }

  const bd = ws.breakdown;
  const topics: { id: number; text: string; start: number }[] =
    bd && bd.topics.length ? bd.topics : contentCandidates(g, resolved);
  const whenWord = bd ? bd.words.indexOf("when") : -1;

  if (bd && whenWord >= 0) {
    // The question splits its subjects: before "when" the effect
    // side, after it the stated cause. Causation must run from
    // the cause side to the effect side — an edge into an
    // effect-side word from anywhere else (the hotspring) is a
    // neighbouring set, not this question's set.
    const causeSubjects = topics.filter((t) => t.start > whenWord).slice(0, 3);
    const effectSubjects = topics.filter((t) => t.start < whenWord);
    const effectIds = new Set<number>(effectSubjects.map((t) => t.id));
    for (const m of bd.mentions) {
      if (m.chosen < 0) continue;
      // mention side by its first word's position relative to "when"
      if (m.start < whenWord) effectIds.add(m.candidates[m.chosen].id);
    }
    // 2a — a cause-side subject's own Causes edge, landing on the effect side
    for (const s of causeSubjects) {
      const landed = g.outEdges(s.id, "/r/Causes").filter((e) => effectIds.has(e.to));
      if (!landed.length) continue;
      const cs = landed
        .slice()
        .sort((a, b) => b.support - a.support)
        .slice(0, 2)
        .map((edge) => ({ edge, about: "to" as const }));
      addConclusions(ws, cs);
      noteStep(ws, "solve", "query",
        `Causes out of cause-side "${s.text}", landing on the effect side`,
        cs.map((c) => edgeText(g, c.edge)));
      return { kind: "answer", text: renderCausedByLines(g, cs), chained: false };
    }
    // 2b — a traced two-step chain through the cause side
    for (const s of causeSubjects) {
      for (const e1 of g.outEdges(s.id, "/r/Causes")) {
        const e2 = g.outEdges(e1.to, "/r/Causes").find((e) => effectIds.has(e.to));
        if (!e2) continue;
        const cs = [
          { edge: e2, about: "to" as const },
          { edge: e1, about: "to" as const },
        ];
        addConclusions(ws, cs);
        noteStep(ws, "solve", "query",
          `causal chain: "${s.text}" —Causes→ "${g.terms[e1.to]}" —Causes→ effect side`,
          cs.map((c) => edgeText(g, c.edge)));
        return { kind: "answer", text: renderCausedByLines(g, cs), chained: true };
      }
    }
    noteStep(ws, "solve", "decline",
      `causal set empty: no Causes edge or two-step chain from the cause side ` +
      `(${causeSubjects.map((t) => t.text).join(", ") || "none resolved"}) to the effect side`);
    return {
      kind: "decline",
      effectText: effectSubjects[0]?.text ?? topics[0]?.text ?? resolved[0]?.text ?? "that",
      causeText: causeSubjects[0]?.text ?? null,
    };
  }

  // Loop 2 (L2-Y): the sense check. A subject discourse derived
  // as the HEAD-WORD EXPANSION of a richer subject ("fall" from
  // "leaves fall") is a fragment: its Causes edges testify for
  // the bare word's dominant sense — a person tumbling — not
  // for the phrase's sense, leaves descending. A fragment's
  // testimony is admitted only when the edge's other endpoint
  // is itself among the turn's resolved subjects — frame-
  // connected, the same discipline as step 1 — so the edge
  // speaks about THIS question's world, not the word's other
  // lives. Otherwise the fragment is passed over, with the
  // reason traced; whole subjects testify exactly as before.
  const fragmentOf = new Map<number, string>();
  for (const t of topics) {
    const reason = (t as { reasons?: string[] }).reasons
      ?.find((x) => x.startsWith("head-word expansion of"));
    const richer = reason?.match(/head-word expansion of "([^"]+)"/)?.[1];
    if (richer) fragmentOf.set(t.id, richer);
  }
  const frameIds = new Set<number>([...ids, ...topics.map((t) => t.id)]);

  // No stated cause: the subject's own causal edges, out then in —
  // the spike's order, over the turn's top subjects only.
  const subjects = topics.slice(0, 6);
  for (const dir of ["out", "in"] as const) {
    for (const cand of subjects) {
      const gathered = (dir === "out"
        ? g.outEdges(cand.id, "/r/Causes")
        : g.inEdgesFor(cand.id, "/r/Causes")
      )
        .slice().sort((a, b) => b.support - a.support);
      if (!gathered.length) continue;
      let edges = gathered;
      const richer = fragmentOf.get(cand.id);
      if (richer !== undefined) {
        edges = gathered.filter((e) =>
          frameIds.has(dir === "out" ? e.to : e.from));
        if (!edges.length) {
          noteStep(ws, "solve", "query",
            `Causes ${dir === "out" ? "out of" : "into"} "${cand.text}" not admitted (L2-Y sense check): ` +
            `"${cand.text}" is the head word of this question's subject "${richer}", and its ` +
            `${gathered.length} Causes edge(s) belong to the bare word's other senses — ` +
            `none connects to a subject this question named`);
          continue;
        }
        noteStep(ws, "solve", "query",
          `Causes ${dir === "out" ? "out of" : "into"} "${cand.text}" admitted under the L2-Y sense check: ` +
          `${edges.length} of ${gathered.length} edge(s) connect to a subject this question named`);
      }
      edges = edges.slice(0, 2);
      const cs = edges.map((edge) => ({ edge, about: dir === "out" ? ("from" as const) : ("to" as const) }));
      addConclusions(ws, cs);
      noteStep(ws, "solve", "query",
        `Causes ${dir === "out" ? "out of" : "into"} "${cand.text}"`,
        cs.map((c) => edgeText(g, c.edge)));
      return {
        kind: "answer",
        text: dir === "out"
          ? cs.map((c) => renderConclusion(g, c)).join(" ")
          : renderCausedByLines(g, cs),
        chained: false,
      };
    }
  }
  const ev = matchEvent(g, resolved.flatMap((r) => r.text.split(" ")), resolved);
  if (ev) {
    const cs = topConclusions(g, ev.id, "at:xEffect", "out", 2);
    if (cs.length) {
      addConclusions(ws, cs);
      return { kind: "answer", text: renderAll(g, cs), chained: false };
    }
  }
  noteStep(ws, "solve", "decline",
    `causal set empty: no Causes edges for "${subjects[0]?.text ?? "the subject"}"`);
  return {
    kind: "decline",
    effectText: subjects[0]?.text ?? resolved[0]?.text ?? "that",
    causeText: null,
  };
}

/* ---------------- attestation (Loop 1: design-abstention) -------
 *
 * A responsibility Solve owns and no piece held before: some
 * questions ask for a SPECIFIC FACT — a value of a bearer, the
 * person filling a role or winning an event, a count, one
 * particular happening — and the graph either attests that fact
 * or it does not. When it does not, the honest answer is a
 * decline; what the engine did instead was substitute: define a
 * term the question contains, or offer an arbitrary fact about
 * a neighbouring term ("Night is a time of day." for last
 * night's match). The substitution is grounded in the graph but
 * not in the question.
 *
 * The check is about ATTESTATION OF WHAT WAS ASKED, never about
 * topics: a specific-fact ask names two poles — a bearer /
 * subject pole and a value / role / event pole — and the asked
 * fact is attested exactly when testimony connects the poles:
 * a direct graph edge between the pole nodes (either
 * direction, any relation — the loader's own accessors), or a
 * record of this conversation (a situation state, an entity, a
 * person-fact term in play) that states both poles together.
 * Silence on that connection is evidence, and the turn declines
 * on it, naming the poles.
 *
 * Conservative by construction:
 *   - only asks headed for the two substitution-prone paths
 *     are checked (surface intent whatis, or unclassified —
 *     the definition route and the generic-fact fallback);
 *     every classified intent keeps its own empty-set rules;
 *   - only four specific-fact FORMS are recognised (value-of,
 *     who-role / who-event, how-many, specific past event /
 *     future property) — a form whose poles cannot both be
 *     named from the question's own resolved terms is not the
 *     check's shape and falls through untouched;
 *   - situated testimony outranks the check: the coordinator
 *     consults it only after the situation model and person
 *     recall have had their turns, so a fact the person stated
 *     stays answerable;
 *   - a count ask is attested only by a record (the graph's
 *     edges carry no instance counts — sand↔beach edges exist
 *     and attest nothing about grains), never by an edge.
 */

export interface AttestationGap {
  form: "value" | "who" | "count" | "event";
  /** the bearer / subject pole, in the question's own words */
  aText: string;
  /** the value / role / count / event pole, in the question's own words */
  bText: string;
}

const ATTEST_TIME_TAIL =
  /\s+(right now|at this moment|at the moment|last night|today|tonight|tomorrow|yesterday)$/;

/** Copulas and auxiliaries are never the event a who/what-did
 * ask is about ("Who is Sarah?", "What did you do?"). */
const ATTEST_AUX = new Set([
  "is", "was", "are", "were", "am", "be", "been", "being",
  "do", "does", "did", "has", "have", "had",
]);

export function attestationGap(
  g: CskgGraph,
  ws: TurnWorkspace,
  session: SessionState,
): AttestationGap | null {
  // Loop 2 (L2-H): the form patterns below are written in the
  // uncontracted shapes ("what is …"); a "what's" ask names
  // exactly the same poles and must meet the same check —
  // normalise the contraction for form matching only.
  const lower = ws.input.trim().toLowerCase().replace(/^what's\b/, "what is");
  const kind = classifySurface(lower);
  if (kind !== null && kind !== "whatis") return null;

  const clean = (s: string): string => s.replace(/[?.!]+$/, "").trim();
  /** The longest term discourse resolves inside a pole phrase. */
  const poleId = (phrase: string): number | null => {
    const rs = resolveTerms(g, phrase);
    if (!rs.length) return null;
    return [...rs].sort((x, y) => y.words - x.words || y.start - x.start)[0].id;
  };
  /** A direct edge between the two pole phrases' nodes. */
  const polesConnected = (aPhrase: string, bPhrase: string): boolean => {
    const a = poleId(aPhrase);
    const b = poleId(bPhrase);
    if (a === null || b === null || a === b) return false;
    return (
      g.outEdges(a).some((e) => e.to === b) ||
      g.outEdges(b).some((e) => e.to === a)
    );
  };
  const recordTexts: string[] = [
    ...session.situation.states.map((s) => s.text.toLowerCase()),
    ...session.situation.entities.map((e) => e.label.toLowerCase()),
    ...(ws.context?.personFactIds ?? [])
      .map((id) => g.terms[id]?.toLowerCase())
      .filter((t): t is string => !!t),
  ];
  const poleWords = (phrase: string): string[] =>
    phrase.split(/[^a-z']+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
  /** A single record stating words from both poles together. */
  const recordAttests = (aPhrase: string, bPhrase: string): boolean => {
    const aw = poleWords(aPhrase);
    const bw = poleWords(bPhrase);
    if (!aw.length || !bw.length) return false;
    return recordTexts.some(
      (t) => aw.some((w) => t.includes(w)) && bw.some((w) => t.includes(w)),
    );
  };
  const gap = (form: AttestationGap["form"], aText: string, bText: string): AttestationGap => {
    noteStep(ws, "solve", "decline",
      `attestation (${form}): the ask names "${aText}" and "${bText}" — no edge connects them and no record states it; the asked fact is unattested`);
    return { form, aText, bText };
  };

  let m: RegExpMatchArray | null;

  /* value-of: "what is the <NP> of <bearer>?" */
  m = lower.match(/^what (?:is|are) the (.+?) of (.+?)[?.!]?$/);
  if (m) {
    const np = clean(m[1]);
    const bearer = clean(m[2]).replace(ATTEST_TIME_TAIL, "");
    if (!polesConnected(np, bearer) && !recordAttests(np, bearer)) {
      return gap("value", bearer, np);
    }
    return null;
  }

  /* value-of, possessive: "what is <possessor>'s <NP>?" */
  m = lower.match(
    /^what (?:is|are) (?:(?:my|your|his|her|their|our) )?([a-z][a-z' -]*?)'s (.+?)[?.!]?$/,
  );
  if (m) {
    const bearer = clean(m[1]);
    const np = clean(m[2]);
    if (!polesConnected(np, bearer) && !recordAttests(np, bearer)) {
      return gap("value", bearer, np);
    }
    return null;
  }

  /* who: the person filling a role, or the outcome of an event */
  if (lower.startsWith("who ")) {
    const role = lower.match(/^who is the (.+?) of (.+?)[?.!]?$/);
    if (role) {
      const roleNp = clean(role[1]).replace(/^(current|present|new)\s+/, "");
      const org = clean(role[2]);
      if (!polesConnected(org, roleNp) && !recordAttests(org, roleNp)) {
        return gap("who", org, roleNp);
      }
      return null;
    }
    const ev = lower.match(/^who (\w+) (.+?)[?.!]?$/);
    if (ev && !ATTEST_AUX.has(ev[1])) {
      const lemma = g.lemmaOf(ev[1]);
      if ((lemma && lemma !== ev[1].toLowerCase()) || /ed$/.test(ev[1])) {
        // a past-tense content verb: the event's outcome is asked
        const subject = clean(ev[2])
          .replace(ATTEST_TIME_TAIL, "")
          .replace(/^the\s+/, "");
        const verbDisplay = lemma ?? ev[1];
        if (
          !polesConnected(subject, ev[1]) &&
          !polesConnected(subject, verbDisplay) &&
          !recordAttests(subject, verbDisplay)
        ) {
          return gap("who", subject, verbDisplay);
        }
        return null;
      }
    }
    return null;
  }

  /* count: "how many <counted> …?" — attested only by a record
   * that states a number for the counted thing */
  if (/^how many\b/.test(lower)) {
    const cm =
      lower.match(/^how many (.+?)(?: are there| is there| are| is| were| was| do| does| did)\b/) ??
      lower.match(/^how many (.+?)[?.!]?$/);
    if (cm) {
      const counted = clean(cm[1]);
      const placeM = lower.match(/\b(?:on|in|at) ([a-z][a-z ]+?)[?.!]?$/);
      const place = placeM ? clean(placeM[1]) : null;
      const head = counted.split(" ").pop() ?? counted;
      const stated = recordTexts.some(
        (t) =>
          t.includes(head) &&
          /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/.test(t),
      );
      if (!stated) return gap("count", counted, place ?? "a count");
      return null;
    }
    return null;
  }

  /* a specific past event: "what did <subject> <verb> …?" —
   * "did" itself carries the past, so the verb stands in base
   * form and any non-auxiliary verb is the asked event. */
  const past = lower.match(/^what did (.+?) (\w+) (.+?)[?.!]?$/);
  if (past && !ATTEST_AUX.has(past[2])) {
    const lemma = g.lemmaOf(past[2]);
    const subject = clean(past[1]);
    const rest = clean(past[3]);
    const restTerms = resolveTerms(g, rest)
      .filter((r) => r.words >= 1 && r.text.length > 2)
      .sort((a, b) => a.start - b.start);
    const objectDisplay = restTerms.length
      ? restTerms[0].text.replace(/^(for|on|in|at|to|with)\s+/, "")
      : (lemma ?? past[2]);
    const attested =
      polesConnected(subject, past[2]) ||
      (lemma ? polesConnected(subject, lemma) : false) ||
      restTerms.some((r) => polesConnected(subject, r.text)) ||
      recordAttests(subject, objectDisplay);
    if (!attested) return gap("event", subject, objectDisplay);
    return null;
  }

  /* a future property of a placed subject: "what will the
   * <NP> be like on <place>?" */
  const future = lower.match(
    /^what will (?:the )?(.+?) be like(?: (?:on|in|at) (.+?))?[?.!]?$/,
  );
  if (future) {
    const np = clean(future[1]);
    const place = future[2]
      ? clean(future[2]).replace(ATTEST_TIME_TAIL, "")
      : null;
    if (place) {
      if (!polesConnected(place, np) && !recordAttests(place, np)) {
        return gap("event", place, np);
      }
      return null;
    }
    return null;
  }

  return null;
}

/* ---------------- relatedness ----------------------------------- */

export function answerRelated(
  g: CskgGraph,
  ws: TurnWorkspace,
  a: number,
  b: number,
): string | null {
  // direct edge?
  for (const e of g.outEdges(a)) {
    if (e.to === b) {
      const c: Conclusion = { edge: e, about: "from" };
      addConclusions(ws, [c]);
      noteStep(ws, "solve", "query", "direct edge", [edgeText(g, e)]);
      return renderConclusion(g, c);
    }
  }
  for (const e of g.outEdges(b)) {
    if (e.to === a) {
      const c: Conclusion = { edge: e, about: "from" };
      addConclusions(ws, [c]);
      noteStep(ws, "solve", "query", "direct edge (reverse)", [edgeText(g, e)]);
      return renderConclusion(g, c);
    }
  }
  // shared neighbours (one intermediate, either direction)
  const neighA = new Map<number, CskgEdge>();
  for (const e of [...g.outEdges(a), ...g.inEdgesFor(a)]) {
    neighA.set(e.from === a ? e.to : e.from, e);
  }
  const shared: { mid: number; ea: CskgEdge; eb: CskgEdge }[] = [];
  for (const e of [...g.outEdges(b), ...g.inEdgesFor(b)]) {
    const other = e.from === b ? e.to : e.from;
    const ea = neighA.get(other);
    if (ea) shared.push({ mid: other, ea, eb: e });
  }
  if (!shared.length) return null;
  shared.sort((x, y) => y.ea.support + y.eb.support - (x.ea.support + x.eb.support));
  const s = shared[0];
  addConclusions(ws, [{ edge: s.ea, about: "from" }, { edge: s.eb, about: "from" }]);
  noteStep(ws, "solve", "query",
    `shared neighbour "${g.terms[s.mid]}" (path length 2)`,
    [edgeText(g, s.ea), edgeText(g, s.eb)]);
  return renderMeeting(
    g.terms[a],
    g.terms[b],
    g.terms[s.mid],
    renderConclusion(g, { edge: s.ea, about: "from" }),
    renderConclusion(g, { edge: s.eb, about: s.eb.from === b ? "from" : "to" }),
  );
}

/* ---------------- event consequence ------------------------------
 *
 * "What happens when X?" — triage classifies it as an
 * EVENT-CONSEQUENCE question: its subject is the event node and
 * its expected content is the event's consequence / involvement
 * edges, not a definition of the nearest noun. E2's discourse
 * prefers the better-attested referent ("rain") over the surface
 * event node ("rains"), which cost this turn its event content;
 * the repair is solve-side: the subject is re-selected from ALL
 * of the mentions' rival candidates, best-scored first, taking
 * the first candidate that actually carries consequence edges.
 */

/**
 * One subject's consequence conclusions, SEQUENCE-COMPOSED
 * (depth pass): the subevent family is presented in attested
 * order — HasFirstSubevent, then HasSubevent, then
 * HasLastSubevent — and only then do the remaining consequence
 * relations (effects, reactions, causes) fill the set to three,
 * in the order and caps E3 used. A subject with no subevent
 * edges produces exactly E3's set.
 */
export function consequenceConclusions(
  g: CskgGraph,
  id: number,
  sit: Situation,
): Conclusion[] {
  const firsts = topConclusions(g, id, "/r/HasFirstSubevent", "out", 1, sit);
  const middles = topConclusions(g, id, "/r/HasSubevent", "out", 2, sit);
  const lasts = topConclusions(g, id, "/r/HasLastSubevent", "out", 1, sit);
  const cs: Conclusion[] = [...firsts, ...middles, ...lasts];
  const target = Math.max(3, cs.length);
  for (const rel of ["at:xEffect", "at:oEffect", "at:xReact", "at:oReact", "/r/Causes"]) {
    if (cs.length >= target) break;
    const add = topConclusions(g, id, rel, "out", rel.startsWith("at:") ? 1 : 2, sit);
    cs.push(...add.slice(0, target - cs.length));
  }
  return cs;
}

/** The trace description of a template match: pairs and expansions. */
function templateNote(m: EventTemplateMatch): string {
  return (
    `event template match: "${m.text}" (F1 ${m.score.toFixed(2)}, coverage ${m.coverage.toFixed(2)}; ` +
    m.matched.map((p) => `${p.utterance}→${p.event} (${p.via})`).join(", ") +
    `)` +
    (m.expansions.length ? `; expansions: ${m.expansions.join("; ")}` : "")
  );
}

export function solveEventConsequence(
  g: CskgGraph,
  ws: TurnWorkspace,
): string | null {
  const bd = ws.breakdown;
  if (!bd) return null;
  // Depth pass: a STRONG template match leads. A paraphrased
  // event the question actually names ("stay up all night")
  // outranks a stray mention candidate ("night") that merely
  // carries an edge; below the strong bar, E3's subject
  // re-selection runs first and the template is the fallback.
  const templ = matchEventTemplate(g, bd.words);
  if (templ.match && templ.match.score >= TEMPLATE_STRONG) {
    const cs = consequenceConclusions(g, templ.match.id, ws.situation!);
    if (cs.length) {
      addConclusions(ws, cs);
      noteStep(ws, "solve", "query",
        `${templateNote(templ.match)} — strong match leads the event-consequence turn`,
        cs.map((c) => edgeText(g, c.edge)));
      return renderAll(g, cs);
    }
  }
  const candidates = bd.mentions
    .flatMap((m) => m.candidates)
    .slice()
    .sort((a, b) => b.score - a.score);
  const seen = new Set<number>();
  for (const cand of candidates) {
    if (seen.has(cand.id)) continue;
    seen.add(cand.id);
    const picked = consequenceConclusions(g, cand.id, ws.situation!);
    if (!picked.length) continue;
    addConclusions(ws, picked);
    noteStep(ws, "solve", "query",
      `event-consequence subject: "${cand.text}" (chosen from the mentions' rival candidates for its consequence edges)`,
      picked.map((c) => edgeText(g, c.edge)));
    return renderAll(g, picked);
  }
  if (templ.match) {
    const cs = consequenceConclusions(g, templ.match.id, ws.situation!);
    if (cs.length) {
      addConclusions(ws, cs);
      noteStep(ws, "solve", "query",
        `${templateNote(templ.match)} — fallback: no mention candidate carried consequence edges`,
        cs.map((c) => edgeText(g, c.edge)));
      return renderAll(g, cs);
    }
  }
  if (templ.considered > 0) {
    noteStep(ws, "solve", "query",
      `event template: no match above threshold over ${templ.considered} candidates` +
      (templ.bestRejected
        ? ` (best: "${templ.bestRejected.text}" at F1 ${templ.bestRejected.score.toFixed(2)})`
        : ""));
  }
  return null;
}

/* ---------------- event reactions (depth pass) -------------------
 *
 * The feeling / want / need / intent families: the question asks
 * how people in an event feel, react, what they want, need, or
 * intend — ATOMIC's person-centred relations. The event is found
 * by the TEMPLATE MATCHER (discourse.ts), not by literal mention:
 * conclusions are the matched event's own at: edges, ranked by
 * the same floor as every other set. A failed match returns null
 * and the coordinator falls back exactly as it did before.
 */

const REACTION_PLANS: Record<
  Exclude<EventQuestionKind, "happens">,
  [string, number][]
> = {
  feel: [["at:xReact", 2], ["at:oReact", 1], ["at:xEffect", 1]],
  react: [["at:oReact", 2], ["at:xReact", 1]],
  want: [["at:xWant", 2], ["at:oWant", 1]],
  need: [["at:xNeed", 2]],
  intent: [["at:xIntent", 2]],
};

export function solveEventReaction(
  g: CskgGraph,
  ws: TurnWorkspace,
  session: SessionState,
  kind: Exclude<EventQuestionKind, "happens">,
): string | null {
  const bd = ws.breakdown;
  if (!bd) return null;
  const templ = matchEventTemplate(g, bd.words);
  if (!templ.match) {
    noteStep(ws, "solve", "query",
      `event template: no match above threshold over ${templ.considered} candidates` +
      (templ.bestRejected
        ? ` (best: "${templ.bestRejected.text}" at F1 ${templ.bestRejected.score.toFixed(2)})`
        : ""));
    return null;
  }
  const m = templ.match;
  noteStep(ws, "solve", "query", templateNote(m));
  const cs: Conclusion[] = [];
  for (const [rel, n] of REACTION_PLANS[kind]) {
    cs.push(...topConclusions(g, m.id, rel, "out", n, ws.situation!));
  }
  if (!cs.length) {
    noteStep(ws, "solve", "decline",
      `template-matched event "${m.text}" carries no ${kind} edges`);
    return null;
  }
  addConclusions(ws, cs);
  remember(session, m.id);
  noteStep(ws, "solve", "conclude",
    `ATOMIC ${kind} of the template-matched event "${m.text}"`,
    cs.map((c) => edgeText(g, c.edge)));
  return renderAll(g, cs);
}

/* ---------------- tool finding (set operations, §6) --------------
 *
 * A tool question is a PROBLEM, solved as set operations:
 *   strict set  — tools whose UsedFor target names the action and
 *                 the object (reverse UsedFor lookup: phrases like
 *                 "open wine bottle" live on the TARGET side);
 *   DIFFERENCE  — minus the tools the person explicitly excluded
 *                 ("without a corkscrew" removes the corkscrew
 *                 from its own answer set, by node and by label);
 *   ranking     — inside the set, by match score then support;
 *   fallback    — only when the strict set is empty after the
 *                 difference: widen one step to RelatedTo phrases
 *                 naming the action+object whose source is classed
 *                 as a tool/opener-class artefact (some tools lost
 *                 their UsedFor edge in CSKG's merge — corkscrew
 *                 has none, only RelatedTo "opening wine" / "wine
 *                 opener" and IsA "bottle opener"). The widening
 *                 is a COMBINATION in triage terms and is disclosed
 *                 in the reply (renderToolFallbackNote) and trace.
 * Tools are deduplicated by node: one tool, one entry, however
 * many of its edges matched (the spike listed "corkscrew" twice).
 */

export interface ToolHit {
  edge: CskgEdge;
  toolId: number;
  toolText: string;
}

export interface ToolSearch {
  hits: ToolHit[];
  route: "direct" | "fallback" | "none";
  /** deduplicated strict-set size before the difference */
  directBeforeExclusion: number;
  /** deduplicated strict-set size after the difference */
  directAfterExclusion: number;
}

export function findTools(
  g: CskgGraph,
  objectText: string,
  verb: string | null,
  excludedIds: ReadonlySet<number> = new Set(),
  excludedLabels: ReadonlySet<string> = new Set(),
): ToolSearch {
  const objWords = tokenise(objectText).filter((w) => !STOPWORDS.has(w));
  const wordIn = (w: string, set: Set<string>): boolean =>
    set.has(w) || set.has(w + "s") || (w.endsWith("s") && set.has(w.slice(0, -1)));
  const excluded = (e: CskgEdge): boolean =>
    excludedIds.has(e.from) || excludedLabels.has(g.terms[e.from]);
  const dedupeRank = (hits: { e: CskgEdge; score: number }[]): ToolHit[] => {
    const best = new Map<number, { e: CskgEdge; score: number }>();
    for (const h of hits) {
      const cur = best.get(h.e.from);
      if (!cur || h.score > cur.score || (h.score === cur.score && h.e.support > cur.e.support)) {
        best.set(h.e.from, h);
      }
    }
    return [...best.values()]
      .sort((a, b) => b.score - a.score || b.e.support - a.e.support)
      .slice(0, 3)
      .map((h) => ({ edge: h.e, toolId: h.e.from, toolText: g.terms[h.e.from] }));
  };

  // the strict set: reverse UsedFor over the whole relation
  const strict: { e: CskgEdge; score: number }[] = [];
  for (const e of g.edgesOf("/r/UsedFor")) {
    const target = g.terms[e.to];
    const targetWords = new Set(target.split(" "));
    let score = 0;
    const verbHit = verb ? wordIn(verb, targetWords) : false;
    if (verbHit) score += 2;
    let objHits = 0;
    for (const w of objWords) if (wordIn(w, targetWords)) objHits++;
    score += objHits;
    // the action named in the target is what makes it a tool FOR this:
    // "open wine bottles" beats any phrase merely containing the words
    if (verbHit && objHits >= 1) score += 3;
    if (objWords.length && objHits === objWords.length) score += 1;
    if (score >= 4) strict.push({ e, score });
  }
  const directAll = dedupeRank(strict);
  const direct = dedupeRank(strict.filter((h) => !excluded(h.e)));
  if (direct.length) {
    return {
      hits: direct,
      route: "direct",
      directBeforeExclusion: directAll.length,
      directAfterExclusion: direct.length,
    };
  }

  // the disclosed fallback: RelatedTo + IsA routes (§6 union step)
  const verbStem = verb ? verb.replace(/e$/, "") : null;
  const fallback: { e: CskgEdge; score: number }[] = [];
  for (const e of g.edgesOf("/r/RelatedTo")) {
    if (excluded(e)) continue;
    const target = g.terms[e.to];
    const targetWords = new Set(target.split(" "));
    let score = 0;
    if (verbStem && [...targetWords].some((w) => w.startsWith(verbStem))) score += 2;
    for (const w of objWords) if (wordIn(w, targetWords)) score += 1;
    if (score < 3) continue;
    const isToolish = g
      .outEdges(e.from, "/r/IsA")
      .some((isa) => /\b(tool|opener|device|instrument|utensil)\b/.test(g.terms[isa.to]));
    if (isToolish) fallback.push({ e, score });
  }
  const fb = dedupeRank(fallback);
  return {
    hits: fb,
    route: fb.length ? "fallback" : "none",
    directBeforeExclusion: directAll.length,
    directAfterExclusion: direct.length,
  };
}

/* ---------------- E4: definitions under a settled reading --------
 *
 * The resolver (turn.ts) may settle a definition question's
 * reading before solve runs — by history, by EverydaySense, or
 * by naming the reading taken. This is solveSurfaceIntent's
 * definition path with the sense FORCED to the settled synset:
 * the gloss of exactly that synset leads, and the what-is
 * neighbourhood conclusions follow it, as they always have.
 */

/**
 * Phase 3 (P3-D) — the definition route's combination step.
 * The whatis queries gather the term's neighbourhood under
 * several relations, but the term node files EVERY sense's
 * edges together. The combination is arbitrated by the sense
 * the route chose: a conclusion whose endpoint belongs to a
 * RIVAL sense's filing cluster is excluded — named in the
 * trace, never stacked onto this sense's answer. Endpoints in
 * the chosen cluster, or in no cluster at all (properties,
 * uses), stand. No chosen cluster → no arbitration is
 * possible and the neighbourhood stands, noted.
 */
function arbitrateDefinitionCombination(
  g: CskgGraph,
  ws: TurnWorkspace,
  cand: ResolvedTerm,
  synsetId: string,
  cs: Conclusion[],
): Conclusion[] {
  const label = senseClusterLabel(g, g.terms[cand.id], synsetId);
  if (!label) {
    noteStep(ws, "solve", "arbitrate",
      `definition combination for "${g.terms[cand.id]}": no filing cluster holds the chosen sense — the gathered neighbourhood stands unarbitrated`);
    return cs;
  }
  const clusters = filingClusters(g, cand.id);
  const chosen = clusters.find((c) => c.anchorText === label);
  if (!chosen) return cs;
  const chosenIds = clusterEvidenceIds(chosen);
  for (const id of [...chosenIds]) {
    for (const e of g.outEdges(id, "/r/IsA")) chosenIds.add(e.to);
  }
  const rivalIds = new Set<number>();
  for (const c of clusters) {
    if (c === chosen) continue;
    for (const id of clusterEvidenceIds(c)) {
      if (!chosenIds.has(id)) rivalIds.add(id);
    }
  }
  // Second signal (P3-D, second pass): the synsets' own
  // evidence — a conclusion endpoint a RIVAL synset's lemmas
  // or gloss attests, and the chosen synset does not, is
  // rival-sense evidence even where the filing clusters merge
  // the two worlds into one cluster (kettle: pot and drum
  // share a cluster; their glosses share no words). Evidence
  // is sense-specific by construction, so it outranks cluster
  // co-membership. Attribution follows the design's filing
  // channel: an endpoint is attested for a sense when the
  // endpoint itself — or one of its own IsA parents — is in
  // the sense's evidence (so "containerful", filed under
  // "quantity", belongs to the quantity synset whose gloss
  // attests "quantity").
  const termText = g.terms[cand.id];
  const allCands = definitionCandidates(g, termText);
  const chosenCand = allCands.find((c) => c.synsetId === synsetId);
  const chosenEvidence = new Set<number>(
    chosenCand ? senseEvidence(g, chosenCand, termText).map((e) => e.id) : [],
  );
  const rivalEvidence = new Set<number>();
  for (const c of allCands) {
    if (c.synsetId === synsetId) continue;
    for (const e of senseEvidence(g, c, termText)) {
      if (!chosenEvidence.has(e.id)) rivalEvidence.add(e.id);
    }
  }
  // attested within two IsA hops — the same depth the
  // resolver's branch footprints walk (turn.ts): "containerful"
  // files under "indefinite quantity", whose own parent is the
  // "quantity" the quantity synset's gloss attests.
  const attested = (set: Set<number>, id: number): boolean => {
    if (set.has(id)) return true;
    const parents = g.outEdges(id, "/r/IsA").map((e) => e.to);
    if (parents.some((p) => set.has(p))) return true;
    return parents.some((p) =>
      g.outEdges(p, "/r/IsA").some((e) => set.has(e.to)));
  };
  const kept: Conclusion[] = [];
  const dropped: { c: Conclusion; why: string }[] = [];
  for (const c of cs) {
    const to = c.edge.to;
    if (attested(rivalEvidence, to) && !attested(chosenEvidence, to)) {
      dropped.push({ c, why: "a rival sense's own evidence" });
    } else if (rivalIds.has(to) && !attested(chosenEvidence, to)) {
      dropped.push({ c, why: "rival filing cluster" });
    } else kept.push(c);
  }
  if (dropped.length) {
    noteStep(ws, "solve", "arbitrate",
      `definition combination arbitrated for the chosen sense (filing cluster "${label}"): ` +
      `${kept.length} conclusions kept, ${dropped.length} rival-sense conclusions excluded (${dropped.map((d) => `${g.terms[d.c.edge.to]} — ${d.why}`).join("; ")}) — a rival sense's filings are not stacked onto this sense's answer`);
  } else {
    noteStep(ws, "solve", "arbitrate",
      `definition combination: every gathered filing belongs to the chosen sense's world (cluster "${label}", its own evidence) — nothing to arbitrate away`);
  }
  return kept;
}

export function solveDefinitionAnswer(
  g: CskgGraph,
  ws: TurnWorkspace,
  session: SessionState,
  cand: ResolvedTerm,
  synsetId: string,
): string | null {
  const gloss = definitionForSynset(g, g.terms[cand.id], synsetId);
  if (!gloss) return null;
  const gathered = SURFACE_BUILDERS.whatis(g, cand.id, ws.situation!);
  const cs = arbitrateDefinitionCombination(g, ws, cand, synsetId, gathered);
  if (cs.length) addConclusions(ws, cs);
  session.lastIntent = "whatis";
  remember(session, cand.id);
  for (const c of cs) {
    noteStep(ws, "solve", "conclude", "whatis", [edgeText(g, c.edge)]);
  }
  const definition = renderDefinition(g.terms[cand.id], gloss.gloss);
  return cs.length ? `${definition} ${renderAll(g, cs)}` : definition;
}

/* ---------------- E4: ATOMIC consulted from a state record -------
 *
 * A captured person state (person.ts) is a canonical record —
 * "tired", stated by the speaker. ATOMIC's person-centred
 * knowledge is consulted FROM that record (§5): the graph's
 * event templates whose content words the state names are the
 * key (the template matcher where the state phrases like an
 * event clause; a direct label scan where it does not — a bare
 * state word like "tired" keys the templates that contain it).
 * Conclusions are the matched event's own reaction / want /
 * effect edges, ranked by the usual floor. Nothing is drawn
 * from the raw utterance: the record is the key.
 */

export function solveStateReaction(
  g: CskgGraph,
  ws: TurnWorkspace,
  stateText: string,
): string | null {
  const words = tokenise(stateText.toLowerCase()).filter((w) => !STOPWORDS.has(w));
  if (!words.length) return null;
  // candidate events: templates whose label covers every state
  // word (form-tolerant), best coverage of the label first,
  // then attestation. A bounded scan over the event id list —
  // the same list the template matcher indexes.
  interface Cand { id: number; cover: number; support: number }
  const cands: Cand[] = [];
  for (const id of g.eventTermIds()) {
    const labelWords = g.terms[id].split(" ").filter((w) => w && w !== "personx" && w !== "persony");
    if (!labelWords.length) continue;
    const labelForms = new Set<string>();
    for (const w of labelWords) {
      labelForms.add(w);
      if (w.endsWith("s")) labelForms.add(w.slice(0, -1));
      if (w.endsWith("ing") && w.length > 5) labelForms.add(w.slice(0, -3));
    }
    // Loop 2 (L2-M3): prefix matching needs real morphology
    // on BOTH sides (≥3 letters). The derived-form set of
    // "dots the is and cross the ts" contains "t" (from
    // "ts"), and a one-letter form prefix-matches EVERY word
    // starting with that letter — "tired" and "today" both
    // "covered" by it, keying a template about dotting i's
    // for a tiredness state. Short forms attest nothing.
    const hit = words.every(
      (w) => labelForms.has(w) || labelForms.has(w + "s") ||
        (w.length >= 3 &&
          [...labelForms].some(
            (lf) => lf.length >= 3 && (lf.startsWith(w) || w.startsWith(lf)))),
    );
    if (!hit) continue;
    let support = 0;
    for (const e of g.outEdges(id)) if (e.rel.startsWith("at:")) support += e.support;
    cands.push({ id, cover: words.length / labelWords.length, support });
  }
  cands.sort((a, b) => b.cover - a.cover || b.support - a.support || a.id - b.id);
  for (const cand of cands.slice(0, 3)) {
    const cs: Conclusion[] = [];
    for (const [rel, n] of [["at:xReact", 1], ["at:xWant", 1], ["at:xEffect", 1], ["at:oReact", 1]] as [string, number][]) {
      cs.push(...topConclusions(g, cand.id, rel, "out", n, ws.situation!));
    }
    if (!cs.length) continue;
    // Loop 2 (L2-M3, generalising L2-M2's floor): the reaction
    // is the state's GENERAL PATTERN, rendered by
    // renderStatePattern with real morphology and a sayability
    // gate — raw script phrases pasted into sentence frames
    // ("they want to injured", "when waits nervously") are
    // declined whole, exactly as the PersonX/PersonY
    // renderings were under L2-M2, and the state stands as
    // captured.
    const pat = renderStatePattern(g, g.terms[cand.id], cs);
    if (!pat) {
      noteStep(ws, "solve", "query",
        `state reaction from "${g.terms[cand.id]}" declined (L2-M3): the pattern its edges attest could not be said correctly — not a comprehensible reply; the state stands as captured`);
      continue;
    }
    addConclusions(ws, pat.used);
    noteStep(ws, "solve", "query",
      `state record "${stateText}" keys ATOMIC event "${g.terms[cand.id]}" — reaction knowledge consulted from the record, rendered as the state's general pattern`,
      pat.used.map((c) => edgeText(g, c.edge)));
    return pat.text;
  }
  noteStep(ws, "solve", "query",
    `state record "${stateText}": no ATOMIC event keys it — the state stands as captured, without a graph reaction`);
  return null;
}
