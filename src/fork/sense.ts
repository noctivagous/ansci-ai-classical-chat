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
    if (node.syntacticElement !== "Earth" && node.syntacticElement !== "Fire") continue;
    const candidates = climbCandidates(node.lemma).filter((c) => !c.gated);
    const elements = [...new Set(candidates.map((c) => c.element))];
    if (elements.length < 2) continue;
    const baseline = climbClassification(node.lemma)?.element;
    if (!baseline) continue;
    const bestConf = Math.max(...candidates.map((c) => c.confidence));
    const live = candidates.filter((c) => c.confidence >= bestConf - CONFIDENCE_BAND);
    const liveElements = [...new Set(live.map((c) => c.element))];
    if (liveElements.length < 2) continue;
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
