/**
 * pricing.ts — strength pricing for replies (reply-planning
 * design note §9.2, slice R0).
 *
 * §2.2 prices a reply by its derivation's support alone. That is
 * half the price: the other half is the standing of the
 * classifications the derivation rests on — the tiers of Part E's
 * epistemic ladder (docs/ansci/repair-programme.md §E.3), which
 * the classification work already keeps distinct. This module is
 * the rule stated once, as data: a ceiling per tier, support
 * bands, and a pure function from (weakest tier on the path,
 * support) to the strength a reply may be spoken at. In R0 the
 * price is computed and recorded in the trace; nothing speaks
 * differently because of it yet.
 *
 * The tiers (ladder T1–T4; T5 "unresolved" is the absence of a
 * classification — no path carries it, and the decline is its
 * outcome, so it is not a tier here):
 *
 *  - attested (T1): directly attested — grade A material,
 *    `fork-curated` restatements, and the seed graph's own
 *    tables (`seed-atomic` in join.ts's Derivation records,
 *    which is what `fork-curated` is defined as restating).
 *  - established (T2): established correspondence — grade
 *    B-direct, conclusions composed over the seed's attested
 *    correspondence legs. No provenance string maps here
 *    directly; the tier enters through a derivation's legs
 *    (see weakestTierOnPath). `ingested` assertions also map
 *    here: a named chapter's statement, banked verbatim-scoped,
 *    is established in its source — but the project has not
 *    promoted it into its own classification voice, so it does
 *    not price at the attested ceiling.
 *  - derived (T3): registered-heuristic inference — B-derived
 *    records (the flavor bridge's evidence grade), `wordnet-
 *    derived` climbs, `verb-domain-derived` classifications,
 *    and `fork-creative` table entries. The ladder's T3 row
 *    names the rule outputs and climbs; `fork-creative` is
 *    placed here by the same reasoning the verb-domain rule
 *    states of its own outputs ("fork-creative in kind", priced
 *    under a creative ceiling): an extension by analogy from
 *    attested rows is inference, never attestation.
 *  - prediction (T4): a registered rule applied beyond its
 *    validated range. No runtime provenance string maps here
 *    today — predictions live in evaluation reports, not in a
 *    store the turn loop reads. The tier exists because §9.2's
 *    table requires its ceiling; tierOfProvenance maps nothing
 *    to it, deliberately.
 */
import { SUPPORT_CONTROLLING, SUPPORT_GENERATING } from "./sense";
import type { Derivation, DerivedConclusion } from "./join";

export type Tier = "attested" | "established" | "derived" | "prediction";

/** Tiers strongest → weakest. A path prices at its weakest. */
export const TIER_ORDER: Tier[] = ["attested", "established", "derived", "prediction"];

/**
 * The tier a classification's provenance string earns, or
 * undefined when the string names no standing this module knows
 * (an unmapped provenance must surface, never silently price).
 */
export function tierOfProvenance(provenance: string): Tier | undefined {
  switch (provenance) {
    case "fork-curated":
    case "seed-atomic":
      return "attested";
    case "ingested":
      return "established";
    case "fork-creative":
    case "wordnet-derived":
    case "verb-domain-derived":
    case "B-derived":
    case "overlay":
      return "derived";
    default:
      return undefined;
  }
}

/** The weakest of a set of tiers; undefined for the empty set. */
export function weakestTier(tiers: Tier[]): Tier | undefined {
  let weakest: Tier | undefined;
  for (const t of tiers) {
    if (!weakest || TIER_ORDER.indexOf(t) > TIER_ORDER.indexOf(weakest)) weakest = t;
  }
  return weakest;
}

/** Spoken strengths, strongest → weakest. */
export type StrengthLevel = "plain" | "lightly-qualified" | "qualified" | "possibility" | "decline";

export const STRENGTH_ORDER: StrengthLevel[] = ["plain", "lightly-qualified", "qualified", "possibility", "decline"];

/**
 * The ceiling table (§9.2), as data: the strongest level a reply
 * resting on a path of this tier may be spoken at. B-direct's
 * "plain or lightly qualified" is taken at lightly qualified —
 * the conservative reading: a conclusion composed over
 * correspondence legs is one step removed from the attested row
 * itself, and only the bare attested classification prices at
 * plain.
 */
export const CEILING_BY_TIER: Record<Tier, StrengthLevel> = {
  attested: "plain",
  established: "lightly-qualified",
  derived: "qualified",
  prediction: "possibility",
};

/**
 * The support bands (§9.2), tied to the sense layer's weights
 * rather than invented: a derivation speaks at its ceiling when
 * its support is at least a generating relation's worth (0.8);
 * it declines below the weakest support the sense layer
 * recognises at all — a controlling relation's worth (0.4).
 * Between the two, support is middling and the level drops one.
 */
export const SUPPORT_HIGH = SUPPORT_GENERATING;
export const SUPPORT_FLOOR = SUPPORT_CONTROLLING;

export interface PricedStrength {
  ceiling: StrengthLevel;
  level: StrengthLevel;
  declined: boolean;
}

function oneLevelDown(level: StrengthLevel): StrengthLevel {
  const i = STRENGTH_ORDER.indexOf(level);
  return STRENGTH_ORDER[Math.min(i + 1, STRENGTH_ORDER.length - 1)];
}

/**
 * Price a reply: the ceiling from the weakest tier on its
 * derivation path, then support sets the level at or below the
 * ceiling — high support speaks at the ceiling, middling drops
 * one level, support below the floor is the decline (§2.2),
 * whatever the ceiling. A prediction-tier path at middling
 * support also lands on the decline: one level below
 * possibility is the decline.
 */
export function priceReply(weakestTierOnPath: Tier, support: number): PricedStrength {
  const ceiling = CEILING_BY_TIER[weakestTierOnPath];
  if (support < SUPPORT_FLOOR) return { ceiling, level: "decline", declined: true };
  const level = support >= SUPPORT_HIGH ? ceiling : oneLevelDown(ceiling);
  return { ceiling, level, declined: level === "decline" };
}

/** A pricing decision as the trace records it (§9.2: ceiling,
 *  support and resulting level, beside the derivation). */
export interface PricingRecord extends PricedStrength {
  weakestTier: Tier;
  support: number;
}

/**
 * The tiers standing on one derivation's path to one conclusion:
 * the tier of the classification at the path's root, plus the
 * tier of the legs the conclusion travels — correspondence and
 * cycle-neighbour conclusions are composed over the seed's
 * attested correspondence rows (established legs, T2), and
 * propagated conclusions are statements the propagation pass
 * inferred rather than rows any table carries (derived, T3).
 */
export function tiersOnPath(derivation: Derivation, conclusion: DerivedConclusion): Tier[] {
  const tiers: Tier[] = [];
  if (derivation.classification) {
    const root = tierOfProvenance(derivation.classification.provenance);
    if (root) tiers.push(root);
  }
  if (conclusion.kind === "correspondence" || conclusion.kind === "cycle-neighbour") {
    tiers.push("established");
  } else if (conclusion.kind === "propagated") {
    tiers.push("derived");
  }
  return tiers;
}

/**
 * Price the derivation a reply rests on, at the conclusion it
 * rests on. Returns undefined when nothing on the path carries a
 * tier this module can price — the caller records no pricing
 * rather than a fabricated one.
 */
export function priceDerivation(derivation: Derivation, conclusion: DerivedConclusion): PricingRecord | undefined {
  const weakest = weakestTier(tiersOnPath(derivation, conclusion));
  if (!weakest) return undefined;
  const support = conclusion.confidence;
  return { weakestTier: weakest, support, ...priceReply(weakest, support) };
}
