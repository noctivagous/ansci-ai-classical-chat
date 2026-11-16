/**
 * sense.ts — sense selection by coherence (depth programme stage 4,
 * Part C.2; the mechanism under the preregistered H3 rivalry).
 *
 * The problem: a derived classification is chosen by climb confidence
 * alone (wordnet-lex climbCandidate) — a property of the word in
 * isolation. Where a word has anchored senses in DIFFERENT elements,
 * the sentence it sits in is evidence the isolated choice ignores.
 *
 * The mechanism, stated tightly enough to be wrong:
 *  - Candidates: the word's ungated climb candidates (one per sense).
 *    Only candidates within CONFIDENCE_BAND of the best confidence
 *    are live — outside the band, climb confidence decides and
 *    context is never consulted. The band is the brake: it bounds
 *    how far coherence may reach (the X1 lesson — cycles amplify
 *    wrong classifications — is answered by refusing to let context
 *    overturn a decisive confidence gap).
 *  - Support: each DISTINCT context element (the other content
 *    nodes' elements, table first, then their own baseline climbs)
 *    votes once: same element 1.0; a generating relation in either
 *    direction 0.8; a controlling relation in either direction 0.4.
 *    RESTRAINT ASYMMETRY: a controlling relation INTO the candidate
 *    corroborates it — the sentence being about the element that
 *    restrains a sense's element is evidence FOR that sense, never
 *    against it. There is no negative term in the scorer.
 *  - Choice: the live candidate with the most support; ties keep the
 *    baseline. An overturn is recorded as a SenseDecision.
 *
 * Idempotent: context and baseline are computed from the table and
 * the cached baseline climb, never from a previously chosen element,
 * so re-applying the pass to an already-selected parse changes
 * nothing.
 *
 * Scope honesty: the census behind this stage found 28 words in the
 * whole extract with ungated candidates in distinct elements, many
 * reached through wayward anchor paths. This pass can only act
 * where genuine alternatives exist; it is not a general
 * word-sense-disambiguation engine, and the preregistered H3 human
 * experiment remains the arbiter of the H3a/H3b rivalry — this
 * mechanism is the in-loop operationalisation, not its verdict.
 */
import { GENERATES, CONTROLS, type Element, type ParsedSentence } from "./sentence";
import { lookupClassification } from "./classify";
import { climbCandidates, climbClassification } from "./wordnet-lex";

export const CONFIDENCE_BAND = 0.25;
export const SUPPORT_SAME = 1.0;
export const SUPPORT_GENERATING = 0.8;
export const SUPPORT_CONTROLLING = 0.4;

export interface SenseDecision {
  lemma: string;
  baseline: Element;
  chosen: Element;
  overturned: boolean;
  /** Support per live candidate element. */
  support: Partial<Record<Element, number>>;
  /** The distinct context elements that voted. */
  context: Element[];
}

/** An element's relation to a candidate element, for support. */
function relationSupport(contextElement: Element, candidate: Element): number {
  if (contextElement === candidate) return SUPPORT_SAME;
  if (GENERATES[contextElement] === candidate || GENERATES[candidate] === contextElement) return SUPPORT_GENERATING;
  if (CONTROLS[contextElement] === candidate || CONTROLS[candidate] === contextElement) return SUPPORT_CONTROLLING;
  return 0;
}

/** The baseline element picture of a node: table, then baseline climb. */
function baselineElementOf(lemma: string, current: Element | undefined): Element | undefined {
  return lookupClassification(lemma)?.element ?? climbClassification(lemma)?.element ?? current;
}

/** One node's sense analysis, shared by the selection pass and
 *  the rival-split detection (R3) so the two can never drift
 *  apart arithmetically: the ungated candidates, the live set
 *  (within CONFIDENCE_BAND of the best confidence, spanning at
 *  least two distinct elements), the baseline, the context
 *  elements and the support each live element earns. Undefined
 *  at exactly the points the selection pass skips a node. */
interface SenseAnalysis {
  baseline: Element;
  /** The live candidates (ungated, within the band). */
  live: ReturnType<typeof climbCandidates>;
  liveElements: Element[];
  context: Element[];
  support: Partial<Record<Element, number>>;
}

function analyseSenseNode(node: ParsedSentence["meaning"]["nodes"][number], nodes: ParsedSentence["meaning"]["nodes"]): SenseAnalysis | undefined {
  if (node.syntacticElement !== "Earth" && node.syntacticElement !== "Fire") return undefined;
  const candidates = climbCandidates(node.lemma).filter((c) => !c.gated);
  const elements = [...new Set(candidates.map((c) => c.element))];
  if (elements.length < 2) return undefined;
  const baseline = climbClassification(node.lemma)?.element;
  if (!baseline) return undefined;
  const bestConf = Math.max(...candidates.map((c) => c.confidence));
  const live = candidates.filter((c) => c.confidence >= bestConf - CONFIDENCE_BAND);
  const liveElements = [...new Set(live.map((c) => c.element))];
  if (liveElements.length < 2) return undefined;
  // Context: distinct elements of the OTHER content nodes.
  const contextSet = new Set<Element>();
  for (const other of nodes) {
    if (other.id === node.id) continue;
    if (other.syntacticElement !== "Earth" && other.syntacticElement !== "Fire") continue;
    const el = baselineElementOf(other.lemma, other.semanticElement);
    if (el) contextSet.add(el);
  }
  const context = [...contextSet];
  const support: Partial<Record<Element, number>> = {};
  for (const el of liveElements) {
    support[el] = context.reduce((sum, ctx) => sum + relationSupport(ctx, el), 0);
  }
  return { baseline, live, liveElements, context, support };
}

/**
 * Apply sense-by-coherence to a parsed sentence in place: derived
 * nodes with live multi-element candidates may have their
 * semanticElement re-chosen. Returns every decision considered
 * (including non-overturns) for reporting and tests.
 */
export function applySenseSelection(parsed: ParsedSentence): SenseDecision[] {
  const decisions: SenseDecision[] = [];
  const nodes = parsed.meaning.nodes;
  for (const node of nodes) {
    const analysis = analyseSenseNode(node, nodes);
    if (!analysis) continue;
    const { baseline, liveElements, context, support } = analysis;
    let chosen = baseline;
    let bestSupport = support[baseline] ?? 0;
    for (const el of liveElements) {
      if ((support[el] ?? 0) > bestSupport) {
        chosen = el;
        bestSupport = support[el] ?? 0;
      }
    }
    const overturned = chosen !== baseline;
    if (overturned) node.semanticElement = chosen;
    decisions.push({ lemma: node.lemma, baseline, chosen, overturned, support, context });
  }
  return decisions;
}

/* ------------------------------------------------------------------ */
/* Rival splits (slice R3: §2.3's second gap shape)                   */
/* ------------------------------------------------------------------ */

/** One side of a rival split: the derivation the sense arithmetic
 *  cannot separate from its rival — its landing element, the
 *  anchor concept the climb derivation lands on (the derivation's
 *  content, in a plain word), the candidate's confidence, the
 *  coherence support it earned in this sentence, and its path. */
export interface RivalDerivation {
  element: Element;
  anchor: string;
  aspect?: string;
  confidence: number;
  support: number;
  path: string;
}

export interface RivalSplit {
  lemma: string;
  nodeId: string;
  /** The element the selection pass proceeds with — on a split,
   *  it stands only by the tie-keep convention. */
  baseline: Element;
  /** The inseparable derivations, best confidence first. */
  rivals: RivalDerivation[];
}

/**
 * The nodes of a parsed sentence whose classification is SPLIT
 * between rival derivations (§2.3: finite ambiguity): at least
 * two live candidates in distinct elements whose coherence
 * supports are EQUAL at the top — compared at the project's
 * 4-decimal rounding, the rounding the climb confidences
 * themselves are computed at. The sense arithmetic then offers
 * no basis to choose: whichever element the selection pass
 * proceeds with, it proceeds by its tie-keep convention, not by
 * evidence. Supports that differ at all are decisive and are
 * NOT splits — the selection stands on them, as it should.
 *
 * Purely a report: this function changes nothing in the parse.
 * The turn loop (R3) asks the speaker to separate the rivals;
 * the selection pass's own choice is left exactly as it was.
 */
export function rivalSplits(parsed: ParsedSentence): RivalSplit[] {
  const nodes = parsed.meaning.nodes;
  const splits: RivalSplit[] = [];
  const round4 = (x: number): number => Math.round(x * 10000) / 10000;
  for (const node of nodes) {
    const analysis = analyseSenseNode(node, nodes);
    if (!analysis) continue;
    const { baseline, live, liveElements, support } = analysis;
    const top = Math.max(...liveElements.map((el) => round4(support[el] ?? 0)));
    const tied = liveElements.filter((el) => round4(support[el] ?? 0) === top);
    if (tied.length < 2) continue;
    const rivals: RivalDerivation[] = tied
      .map((el) => {
        // The element's representative derivation: its strongest
        // live candidate (the one the isolated choice would take
        // for that reading).
        const best = live
          .filter((c) => c.element === el)
          .reduce((a, b) => (b.confidence > a.confidence ? b : a));
        return {
          element: el,
          anchor: best.anchor,
          ...(best.aspect ? { aspect: best.aspect } : {}),
          confidence: best.confidence,
          support: round4(support[el] ?? 0),
          path: best.path,
        };
      })
      .sort((a, b) => b.confidence - a.confidence || a.element.localeCompare(b.element));
    splits.push({ lemma: node.lemma, nodeId: node.id, baseline, rivals });
  }
  return splits;
}
