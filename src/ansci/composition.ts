/**
 * composition.ts — elemental compositions (reply-planning design
 * note §9.1, slice R0).
 *
 * Disposition (§7.4), the role (§8.1) and the morphs (§8.9) are all
 * parameterised by ONE format: a ranked predominance list —
 * predominant, secondary, trace — never percentages, never a
 * vector of weights (the format the bridge-graph design settled
 * for compositions of modern terms). A Composition is data: an
 * ordered list of elements with at most three ranks. Two
 * compositions are the same when their ranked lists are the same.
 *
 * Scope (§9.1, stated here so later slices inherit it): a
 * composition MAY bias arbitration among grounded candidates,
 * move selection among grounded moves, the §9.2 qualification
 * thresholds within their declared band, and register/length
 * parameters. It MAY NEVER create content, alter a classification
 * or its price, override the decline floor, or touch the
 * invariant core (attestation, the decline, memory's write
 * discipline). In R0 nothing consumes a composition for
 * behaviour — the session carries one and the trace names it.
 *
 * Admission (§9.1): a composition is admitted only with a
 * declared transcript effect. The neutral default below declares
 * its effect here: NONE — sessions run under NEUTRAL_COMPOSITION
 * must select, qualify and decline exactly as a session with no
 * disposition bias at all. R4, which wires disposition into the
 * processes, is where that declaration becomes testable; it
 * stands recorded from the start so the default can never
 * quietly acquire a bias.
 */
import type { Element } from "./sentence";

export interface Composition {
  predominant: Element;
  secondary?: Element;
  trace?: Element;
}

/**
 * The declared neutral composition: Earth predominant. Earth is
 * the centre in the seed's attested tables (direction: centre;
 * the centre position among the five) — the one element whose
 * predominance declares a position rather than a direction.
 * Declared transcript effect: none (see the header).
 */
export const NEUTRAL_COMPOSITION: Composition = { predominant: "Earth" };

/** The composition's ranks in order, strongest first. */
export function compositionRanks(c: Composition): Element[] {
  const ranks: Element[] = [c.predominant];
  if (c.secondary) ranks.push(c.secondary);
  if (c.trace) ranks.push(c.trace);
  return ranks;
}

/**
 * Build a composition from an ordered rank list, enforcing the
 * format's invariants: at least one rank, at most three, no
 * element at two ranks.
 */
export function compositionFromRanks(ranks: Element[]): Composition {
  if (ranks.length < 1 || ranks.length > 3) {
    throw new Error(`a composition has one to three ranks, got ${ranks.length}`);
  }
  if (new Set(ranks).size !== ranks.length) {
    throw new Error(`a composition's ranks are distinct elements, got ${ranks.join(", ")}`);
  }
  return { predominant: ranks[0], secondary: ranks[1], trace: ranks[2] };
}

/** Two compositions are the same when their ranked lists are. */
export function compositionsEqual(a: Composition, b: Composition): boolean {
  const ra = compositionRanks(a);
  const rb = compositionRanks(b);
  return ra.length === rb.length && ra.every((el, i) => el === rb[i]);
}

export function isNeutralComposition(c: Composition): boolean {
  return compositionsEqual(c, NEUTRAL_COMPOSITION);
}

/** The trace rendering: every rank named, strongest first. */
export function renderComposition(c: Composition): string {
  const parts = [`predominant ${c.predominant}`];
  if (c.secondary) parts.push(`secondary ${c.secondary}`);
  if (c.trace) parts.push(`trace ${c.trace}`);
  return parts.join(", ");
}
