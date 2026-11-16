/**
 * disposition.ts — disposition LIVE (reply-planning design note
 * §7.4, §8.9, §9.1; slice R4). The session's elemental
 * composition actually parameterises processing, through ONE
 * bias table consulted by every channel — the turn loop and
 * the planner hold no per-site conditionals about elements.
 *
 * §9.1's scope, enforced by construction: a composition may
 * bias (a) arbitration among comparable grounded candidates,
 * (b) move selection among grounded steering moves, (c) the
 * §9.2 qualification boundary WITHIN its declared band, and
 * (d) length among grounded behaviours at composition sites.
 * It may never create content, alter a classification, a
 * derivation or a price CEILING, override the decline FLOOR,
 * or touch the invariant core. The mechanisms below are built
 * so those "never"s are structural: arbitration re-ranks only
 * inside comparable groups of an already-priced order (a
 * below-floor candidate is dropped before ordering exists);
 * the threshold mechanism recomputes a level from pricing.ts's
 * exported ceiling table and the unmoved floor, changing only
 * which side of the high/middling boundary a support falls
 * on; length holds back grounded members, recorded, and
 * invents none.
 *
 * pricing.ts is NOT edited: its ceiling/floor constants stand
 * byte-identical, and the shifted boundary is applied here,
 * around its exported data (CEILING_BY_TIER, STRENGTH_ORDER,
 * SUPPORT_FLOOR, SUPPORT_HIGH). With no bias in force (the
 * neutral composition, or none supplied), every function
 * below returns exactly the pre-R4 computation — priceReply
 * itself, the standing order, the standing move — and no
 * bias record. The neutral composition's declared effect
 * ("none", composition.ts) is thereby testable, and T-R4
 * tests it.
 *
 * Every bias application is returned as a BiasRecord
 * (channel, candidates before, selection/order after, the
 * rule in words) for the caller to write into the trace —
 * §9.1's observable. A record is produced exactly when the
 * channel had something to decide, per channel:
 *  - arbitration: a comparable group of two or more was
 *    re-ranked (the record's before/after are equal when the
 *    affinity ranking confirms the standing order);
 *  - move: two or more grounded moves competed;
 *  - threshold: the shifted boundary changed the level the
 *    default boundary would give (the support lies in the
 *    decisive window between the two boundaries);
 *  - length: a lead-only composition held at least one
 *    grounded member back.
 *
 * The declared effects of the two reference compositions —
 * the scenarios, windows and orders their traces must show —
 * are frozen in docs/fork/transcripts/T-R4.md, authored
 * before this file. The bias channels read the composition's
 * PREDOMINANT rank only in this slice; secondary and trace
 * ranks are carried and traced, not read (T-R4 §1).
 * Register (§8.7 S10) is not wired: the generator has no
 * register variants to select among, and inventing wording
 * variants would not be selection among grounded behaviours
 * (T-R4 §3).
 */
import { CONTROLS, GENERATES, type Element } from "./sentence";
import { SUPPORT_CONTROLLING, SUPPORT_GENERATING, SUPPORT_SAME } from "./sense";
import {
  CEILING_BY_TIER,
  STRENGTH_ORDER,
  SUPPORT_FLOOR,
  SUPPORT_HIGH,
  priceReply,
  type PricedStrength,
  type StrengthLevel,
  type Tier,
} from "./pricing";
import { isNeutralComposition, type Composition } from "./composition";

/** The two reference compositions of T-R4, as data. */
export const WOOD_DISPOSITION: Composition = { predominant: "Wood", secondary: "Fire", trace: "Earth" };
export const WATER_DISPOSITION: Composition = { predominant: "Water", secondary: "Metal", trace: "Fire" };

/** The steering moves the turn loop's branches ground. */
export type SteeringMove = "restrainer" | "generating" | "venting";

export const STEERING_MOVE_LABEL: Record<SteeringMove, string> = {
  restrainer: "address the restrainer",
  generating: "follow the generating direction",
  venting: "meet the vented state from the restraining side",
};

/** One bias application, as the trace records it (§9.1). */
export interface BiasRecord {
  channel: "arbitration" | "move" | "threshold" | "length";
  /** The candidates in their standing (un-biased) order. */
  before: string[];
  /** The order or selection after the bias was applied. */
  after: string[];
  /** The rule that was applied, in words. */
  rule: string;
  /** What the application was applied TO, where several
   *  applications of one channel can occur in a turn (a
   *  composition's members are each priced separately) — set
   *  by the caller, naming the conclusion priced or ordered. */
  context?: string;
}

/** A predominant element's bias posture, as data. */
export interface DispositionBias {
  /** Steering moves, most preferred first. */
  movePreference: SteeringMove[];
  /** The high/middling boundary this posture applies, inside
   *  the declared band [BOUNDARY_MIN, BOUNDARY_MAX]. */
  highBoundary: number;
  /** Length behaviour at composition sites. */
  length: "full-set" | "lead-only";
}

/** The band the high/middling boundary may move within (§9.1,
 *  T-R4 §2). The floor and the ceilings are outside any band:
 *  they do not move. */
export const BOUNDARY_MIN = 0.7;
export const BOUNDARY_MAX = 0.9;

/**
 * Candidates whose supports differ by at most this much are
 * comparable — arbitration may re-rank them; candidates
 * further apart may not change places (T-R4 §2).
 */
export const COMPARABLE_SUPPORT_BAND = 0.1;

/**
 * The bias table: one posture per predominant element, the
 * single place disposition behaviour is declared. Elements
 * with no entry (and the neutral composition, whatever its
 * predominant) apply no bias — the standing computations run
 * exactly as before R4.
 */
export const BIAS_BY_PREDOMINANT: Partial<Record<Element, DispositionBias>> = {
  Wood: { movePreference: ["generating", "restrainer", "venting"], highBoundary: 0.75, length: "full-set" },
  Water: { movePreference: ["restrainer", "venting", "generating"], highBoundary: 0.85, length: "lead-only" },
};

/**
 * The bias in force for a session's composition, or undefined
 * when none is: the neutral composition (its declared effect
 * is none), or a predominant the table does not name. A table
 * entry whose boundary falls outside the declared band is a
 * broken declaration, not a bias — it throws rather than
 * quietly applying an out-of-band boundary.
 */
export function biasForComposition(composition: Composition): DispositionBias | undefined {
  if (isNeutralComposition(composition)) return undefined;
  const bias = BIAS_BY_PREDOMINANT[composition.predominant];
  if (!bias) return undefined;
  if (bias.highBoundary < BOUNDARY_MIN || bias.highBoundary > BOUNDARY_MAX) {
    throw new Error(
      `disposition boundary ${bias.highBoundary} for predominant ${composition.predominant} is outside the declared band [${BOUNDARY_MIN}, ${BOUNDARY_MAX}] (§9.1)`,
    );
  }
  return bias;
}

/** The high/middling boundary in force: the composition's, or
 *  pricing.ts's SUPPORT_HIGH when no bias applies. */
export function effectiveHighBoundary(composition?: Composition): number {
  return (composition ? biasForComposition(composition)?.highBoundary : undefined) ?? SUPPORT_HIGH;
}

/**
 * An element's affinity to a composition's predominant
 * element, in the sense layer's own weights (the direction
 * rule of T-R4 §2): same element 1.0; a generating relation
 * in either direction 0.8; a controlling relation in either
 * direction 0.4. Between two elements of the five, one of
 * these always holds.
 */
export function affinityToPredominant(composition: Composition, element: Element): number {
  const p = composition.predominant;
  if (element === p) return SUPPORT_SAME;
  if (GENERATES[p] === element || GENERATES[element] === p) return SUPPORT_GENERATING;
  if (CONTROLS[p] === element || CONTROLS[element] === p) return SUPPORT_CONTROLLING;
  return 0;
}

/* ------------------------------------------------------------------ */
/* (c) Thresholds: the boundary within its band                       */
/* ------------------------------------------------------------------ */

function oneLevelDown(level: StrengthLevel): StrengthLevel {
  const i = STRENGTH_ORDER.indexOf(level);
  return STRENGTH_ORDER[Math.min(i + 1, STRENGTH_ORDER.length - 1)];
}

/**
 * Price a reply under a composition (§9.2 as §9.1(c) permits):
 * the ceiling from pricing.ts's table and the floor from
 * pricing.ts's constant — neither moves — with the
 * high/middling boundary the composition declares. With no
 * bias in force this IS priceReply (the same function is
 * called), so neutral pricing is the pre-R4 pricing by
 * construction, not by parallel reimplementation.
 *
 * A bias record is returned exactly when the shifted boundary
 * changes the level the default boundary would give — the
 * support lies in the decisive window between the two
 * boundaries. The floor's declines are identical under every
 * composition and are never recorded as bias: the floor did
 * not move, so nothing was biased.
 */
export function priceWithBoundary(
  weakestTierOnPath: Tier,
  support: number,
  composition?: Composition,
): { priced: PricedStrength; record?: BiasRecord } {
  const bias = composition ? biasForComposition(composition) : undefined;
  if (!bias || bias.highBoundary === SUPPORT_HIGH) return { priced: priceReply(weakestTierOnPath, support) };
  const ceiling = CEILING_BY_TIER[weakestTierOnPath];
  let priced: PricedStrength;
  if (support < SUPPORT_FLOOR) {
    priced = { ceiling, level: "decline", declined: true };
  } else {
    const level = support >= bias.highBoundary ? ceiling : oneLevelDown(ceiling);
    priced = { ceiling, level, declined: level === "decline" };
  }
  const unbiassed = priceReply(weakestTierOnPath, support);
  if (priced.level === unbiassed.level) return { priced };
  return {
    priced,
    record: {
      channel: "threshold",
      before: [`support ${support} against the default boundary ${SUPPORT_HIGH} → ${unbiassed.level}`],
      after: [`support ${support} against the boundary ${bias.highBoundary} → ${priced.level}`],
      rule:
        `the disposition (predominant ${composition!.predominant}) moves the high/middling boundary to ` +
        `${bias.highBoundary}, within its declared band [${BOUNDARY_MIN}, ${BOUNDARY_MAX}]; the tier ceiling ` +
        `(${ceiling}) and the floor (${SUPPORT_FLOOR}) do not move (§9.1(c))`,
    },
  };
}

/* ------------------------------------------------------------------ */
/* (a) Arbitration: re-ranking comparable candidates                  */
/* ------------------------------------------------------------------ */

/**
 * Re-rank an already-ordered candidate list inside its
 * comparable groups (T-R4 §2): groups are formed greedily
 * from the head — a candidate joins the current group while
 * its group key matches the group lead's and its support is
 * within COMPARABLE_SUPPORT_BAND of the GROUP LEAD's support
 * — and within a group of two or more, candidates are
 * re-ranked by affinity to the composition's predominant
 * element, ties keeping the standing order. Candidates
 * outside a group never move; a lone lead is never displaced.
 * With no bias in force the input order is returned
 * untouched and no record is made.
 */
export function arbitrateOrder<T>(
  items: T[],
  opts: {
    composition?: Composition;
    supportOf: (item: T) => number;
    elementOf: (item: T) => Element;
    labelOf: (item: T) => string;
    /** Grouping key beyond support proximity (relation order
     *  groups by relation weight); omit for a single key. */
    groupKeyOf?: (item: T) => string | number;
    /** Which ordering this is, named in the record's rule. */
    context: string;
  },
): { ordered: T[]; record?: BiasRecord } {
  const bias = opts.composition ? biasForComposition(opts.composition) : undefined;
  if (!bias || items.length < 2) return { ordered: items };
  const keyOf = opts.groupKeyOf ?? (() => 0);
  const groups: T[][] = [];
  for (const item of items) {
    const current = groups[groups.length - 1];
    const lead = current?.[0];
    if (
      lead !== undefined &&
      keyOf(item) === keyOf(lead) &&
      opts.supportOf(lead) - opts.supportOf(item) <= COMPARABLE_SUPPORT_BAND + 1e-9
    ) {
      current.push(item);
    } else {
      groups.push([item]);
    }
  }
  if (!groups.some((g) => g.length >= 2)) return { ordered: items };
  const predominant = opts.composition!.predominant;
  const ordered = groups.flatMap((group) =>
    group.length < 2
      ? group
      : [...group]
          .map((item, index) => ({ item, index }))
          .sort(
            (a, b) =>
              affinityToPredominant(opts.composition!, opts.elementOf(b.item)) -
                affinityToPredominant(opts.composition!, opts.elementOf(a.item)) ||
              a.index - b.index,
          )
          .map(({ item }) => item),
  );
  return {
    ordered,
    record: {
      channel: "arbitration",
      before: items.map(opts.labelOf),
      after: ordered.map(opts.labelOf),
      rule:
        `in ${opts.context}: candidates within ${COMPARABLE_SUPPORT_BAND} support of their group lead are comparable; ` +
        `comparable candidates are re-ranked by affinity to the disposition's predominant element (${predominant}) — ` +
        `same element ${SUPPORT_SAME}, generating ${SUPPORT_GENERATING}, controlling ${SUPPORT_CONTROLLING} (§9.1(a))`,
    },
  };
}

/* ------------------------------------------------------------------ */
/* (b) Move selection among grounded steering moves                   */
/* ------------------------------------------------------------------ */

/**
 * Select among the steering moves a turn actually grounds, by
 * the composition's declared preference. With no bias in
 * force, or fewer than two grounded moves, the standing
 * order's first move stands and no record is made — where
 * only one move is grounded, disposition has nothing to
 * decide, under any composition (T-R4 §3).
 */
export function selectMove(
  composition: Composition | undefined,
  grounded: SteeringMove[],
): { move: SteeringMove; record?: BiasRecord } {
  const bias = composition ? biasForComposition(composition) : undefined;
  if (!bias || grounded.length < 2) return { move: grounded[0] };
  const ordered = [...grounded].sort((a, b) => bias.movePreference.indexOf(a) - bias.movePreference.indexOf(b));
  return {
    move: ordered[0],
    record: {
      channel: "move",
      before: grounded.map((m) => STEERING_MOVE_LABEL[m]),
      after: ordered.map((m) => STEERING_MOVE_LABEL[m]),
      rule:
        `the disposition (predominant ${composition!.predominant}) selects among the grounded steering moves by its ` +
        `declared preference (${bias.movePreference.map((m) => STEERING_MOVE_LABEL[m]).join(" before ")}); ` +
        `ungrounded moves are never selected (§9.1(b))`,
    },
  };
}

/* ------------------------------------------------------------------ */
/* (d) Length at composition sites                                    */
/* ------------------------------------------------------------------ */

/**
 * Apply a composition's length behaviour to the members a
 * composition would speak, in the active order: full-set
 * speaks them all; lead-only speaks the lead member and
 * HOLDS the rest — grounded, priced members, returned for
 * the caller to record with their pricing, never dropped
 * silently and never invented. A record is made only when
 * at least one member is actually held.
 */
export function applyLength<T>(
  spokenInActiveOrder: T[],
  composition: Composition | undefined,
  labelOf: (item: T) => string,
): { spoken: T[]; held: T[]; record?: BiasRecord } {
  const bias = composition ? biasForComposition(composition) : undefined;
  if (!bias || bias.length !== "lead-only" || spokenInActiveOrder.length < 2) {
    return { spoken: spokenInActiveOrder, held: [] };
  }
  const spoken = spokenInActiveOrder.slice(0, 1);
  const held = spokenInActiveOrder.slice(1);
  return {
    spoken,
    held,
    record: {
      channel: "length",
      before: spokenInActiveOrder.map(labelOf),
      after: spoken.map(labelOf),
      rule:
        `the disposition (predominant ${composition!.predominant}) is lead-only at composition sites: the lead member ` +
        `is spoken and the remaining grounded members are held, recorded with their pricing (§9.1(d))`,
    },
  };
}
