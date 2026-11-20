/**
 * triage.ts — the review-triage queue machinery (repair programme
 * Part C.6, "Review triage (density)").
 *
 * The density run's propagation review queue reached 1,047 items —
 * beyond hand review — and C.6 is the policy for queues of that
 * shape. This module mechanises the policy's bookkeeping:
 *
 *  - Rule status and instance status are SEPARATE fields. A
 *    validated rule's unreviewed instances remain machine-derived
 *    and provisional — usable for exploratory search, never as
 *    independently verified evidence. Nothing in this module lets
 *    one field borrow the other's standing.
 *  - The always-review list: critical and high risk classes get
 *    100% human review before admission. No sampling touches them.
 *  - Medium (stratified sample review, exceptions escalated) and
 *    low (statistical audit): seeded stratified sampling with
 *    finite-population-corrected sizes — for a queue of ~1,047 the
 *    audit sample is ~283 (95% confidence, ±5%).
 *  - Admitted confidence: C_admitted = min(C_source,
 *    C_rule-calibration, C_instance), with C_instance never 1.0
 *    for an unreviewed instance.
 *  - Escalation: a sampled unsupported-inference rate above 5%, an
 *    unresolved-contradiction rate above 1%, or a lower 95%
 *    precision bound below the ratified bar suspends automatic
 *    admission for that stratum.
 *
 * The module judges nothing itself: it selects, counts and caps.
 * The reviews are human work, as the policy requires.
 */

export type RiskClass = "critical" | "high" | "medium" | "low";

/** The RULE's standing — validated once, by its own instrument. */
export type RuleStatus = "validated" | "provisional" | "superseded";

/** The INSTANCE's standing — its own field, never the rule's. */
export type InstanceStatus =
  | "unreviewed"
  | "sampled"
  | "reviewed-supported"
  | "reviewed-unsupported"
  | "escalated";

export interface ReviewItem {
  item_id: string;
  /** The stratum the item is sampled and escalated within
   *  (a domain, a source family, an entity type — the queue's own
   *  grouping). */
  stratum: string;
  risk_class: RiskClass;
  rule_id: string;
  rule_status: RuleStatus;
  instance_status: InstanceStatus;
  c_source: number;
  c_rule_calibration: number;
  c_instance: number;
}

/** The mechanical form of "C_instance never 1.0 for an unreviewed
 *  instance": an unreviewed instance's confidence is capped here
 *  before the min() is taken. */
export const UNREVIEWED_INSTANCE_CAP = 0.99;

export function admittedConfidence(item: ReviewItem): number {
  const cInstance =
    item.instance_status === "unreviewed"
      ? Math.min(item.c_instance, UNREVIEWED_INSTANCE_CAP)
      : item.c_instance;
  return Math.min(item.c_source, item.c_rule_calibration, cInstance);
}

/** The always-review list (C.6): critical and high classes, 100%
 *  human review before admission. */
export function alwaysReviewQueue(items: ReviewItem[]): ReviewItem[] {
  return items.filter((i) => i.risk_class === "critical" || i.risk_class === "high");
}

/** Finite-population-corrected sample size for a proportion at the
 *  given confidence and margin (worst-case p = 0.5):
 *  n = N·n₀ / (N + n₀ − 1), n₀ = z²·p(1−p)/e².
 *  For N = 1,047 at 95% / ±5% this gives ≈283 — the figure C.6
 *  quotes for the density queue. */
export function auditSampleSize(population: number, margin = 0.05, z = 1.96): number {
  if (population <= 0) return 0;
  const n0 = (z * z * 0.25) / (margin * margin);
  return Math.min(population, Math.ceil((population * n0) / (population + n0 - 1)));
}

/** Deterministic seeded RNG (mulberry32): a sample is reproducible
 *  from its seed, so a drawn sample can be re-derived and audited. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface StratifiedSample {
  /** item_ids selected for review, grouped by stratum. */
  by_stratum: Record<string, string[]>;
  total: number;
  /** Strata too small to sample at the requested minimums —
   *  reported as under-tested rather than silently passed over. */
  under_tested_strata: string[];
}

/**
 * Stratified sample over the medium/low population: the target size
 * is the audit size for the whole sampled population, allocated
 * across strata in proportion to stratum size, with a per-stratum
 * minimum (default 5, or the whole stratum when smaller). Critical
 * and high items are never sampled — they are on the always-review
 * list instead, and are excluded here even if passed in.
 */
export function stratifiedSample(
  items: ReviewItem[],
  options: { seed: number; per_stratum_min?: number; margin?: number },
): StratifiedSample {
  const min = options.per_stratum_min ?? 5;
  const pool = items.filter((i) => i.risk_class === "medium" || i.risk_class === "low");
  const target = auditSampleSize(pool.length, options.margin);
  const strata = new Map<string, ReviewItem[]>();
  for (const item of pool) {
    const list = strata.get(item.stratum) ?? [];
    list.push(item);
    strata.set(item.stratum, list);
  }
  const rng = seededRng(options.seed);
  const byStratum: Record<string, string[]> = {};
  const underTested: string[] = [];
  let total = 0;
  for (const [stratum, list] of [...strata.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const share = Math.round((list.length / Math.max(1, pool.length)) * target);
    const take = Math.min(list.length, Math.max(Math.min(min, list.length), share));
    if (list.length <= min) underTested.push(stratum);
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    byStratum[stratum] = shuffled.slice(0, take).map((i) => i.item_id);
    total += take;
  }
  return { by_stratum: byStratum, total, under_tested_strata: underTested };
}

export interface StratumReviewResult {
  stratum: string;
  sampled: number;
  unsupported: number;
  contradictions: number;
  /** Lower 95% confidence bound of the stratum's precision. */
  precision_lower_bound: number;
  ratified_bar: number;
}

export interface EscalationVerdict {
  stratum: string;
  suspended: boolean;
  reasons: string[];
}

/** The C.6 escalation rules, mechanically: any one suspends
 *  automatic admission for the stratum pending investigation. */
export function escalationCheck(result: StratumReviewResult): EscalationVerdict {
  const reasons: string[] = [];
  if (result.sampled > 0 && result.unsupported / result.sampled > 0.05) {
    reasons.push(`unsupported-inference rate ${(result.unsupported / result.sampled).toFixed(3)} > 5%`);
  }
  if (result.sampled > 0 && result.contradictions / result.sampled > 0.01) {
    reasons.push(`unresolved-contradiction rate ${(result.contradictions / result.sampled).toFixed(3)} > 1%`);
  }
  if (result.precision_lower_bound < result.ratified_bar) {
    reasons.push(`lower 95% precision bound ${result.precision_lower_bound} < ratified bar ${result.ratified_bar}`);
  }
  return { stratum: result.stratum, suspended: reasons.length > 0, reasons };
}
