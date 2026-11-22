// walk.mjs — the priced derivation engine for the derivation-closure testbed.
//
// Forward chaining over the generator graph (generators.mjs), under a
// budget (max depth + max steps). Every derived fact carries a PATH
// RECEIPT: the full derivation tree that produced it. Receipts serialise
// to a stable plain-JSON contract (see receiptToJSON) and can be REPLAYED
// from the generators alone (see replayReceipt) — a banked derivation is
// never just an assertion that a walk happened.
//
// Pricing is PLUGGABLE. Three arithmetics ship here:
//   weakest-link : path strength = min of hop strengths; paths combine by max
//   product      : path strength = product of hop strengths; paths combine
//                  (noisy-or) ONLY when their support sets are disjoint
//   tier-depth   : ordinal tiers + depth, no continuous numbers; a path is
//                  priced by the tier of its weakest support and its depth
// PLN is deliberately NOT among them (owner's ruling: it imports
// independence and evidence-count assumptions this system does not have;
// see README.md).

import { TIER } from './generators.mjs';

export const TESTIMONY_THRESHOLD = 0.6;   // numeric arithmetics
export const TIER_TESTIMONY_MIN_TIER = 2; // tier-depth: generic tier or better
export const TIER_TESTIMONY_MAX_DEPTH = 4;

const EPS = 1e-12;
export const factKey = (fact) => JSON.stringify(fact);

// ---------------------------------------------------------------- arithmetics
// Internal price forms: number (weakest-link, product) or {tier, depth}.
export const ARITHMETICS = {
  'weakest-link': {
    name: 'weakest-link',
    basePrice: (entry) => entry.strength,
    rulePrice: (premisePrices, rule) => Math.min(rule.factor, ...premisePrices),
    isBetter: (a, b) => a > b + EPS,
    combine: (a, b) => Math.max(a, b),
    testifies: (price) => price >= TESTIMONY_THRESHOLD,
    format: (price) => price.toFixed(3),
    toJSON: (price) => Math.round(price * 1e6) / 1e6,
  },
  'product': {
    name: 'product',
    basePrice: (entry) => entry.strength,
    rulePrice: (premisePrices, rule) =>
      premisePrices.reduce((acc, p) => acc * p, 1) * rule.factor,
    isBetter: (a, b) => a > b + EPS,
    // Caller guarantees this is only invoked for disjoint supports.
    combine: (a, b) => 1 - (1 - a) * (1 - b),
    testifies: (price) => price >= TESTIMONY_THRESHOLD,
    format: (price) => price.toFixed(3),
    toJSON: (price) => Math.round(price * 1e6) / 1e6,
  },
  'tier-depth': {
    name: 'tier-depth',
    basePrice: (entry) => ({ tier: entry.tier, depth: 0 }),
    rulePrice: (premisePrices, rule, depth) => ({
      tier: Math.min(rule.tier, ...premisePrices.map(p => p.tier)),
      depth,
    }),
    isBetter: (a, b) => a.tier > b.tier || (a.tier === b.tier && a.depth < b.depth),
    combine: (a, b) => (ARITHMETICS['tier-depth'].isBetter(a, b) ? a : b),
    testifies: (price, depth) =>
      price.tier >= TIER_TESTIMONY_MIN_TIER && depth <= TIER_TESTIMONY_MAX_DEPTH,
    format: (price) => `tier ${price.tier} @ depth ${price.depth}`,
    toJSON: (price) => ({ tier: price.tier, depth: price.depth }),
  },
};

// ------------------------------------------------------------------ matching
const isVar = (x) => typeof x === 'string' && x.startsWith('$');

function matchPattern(pattern, fact, binding) {
  if (pattern.length !== fact.length) return null;
  const b = new Map(binding);
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i];
    if (isVar(p)) {
      if (b.has(p) && b.get(p) !== fact[i]) return null;
      b.set(p, fact[i]);
    } else if (p !== fact[i]) return null;
  }
  return b;
}

function applyPattern(pattern, binding) {
  return pattern.map(p => (isVar(p) ? binding.get(p) : p));
}

// All ways to satisfy a rule's premises from the current fact map.
// Yields { binding, records } where records are the fact records used.
function* joins(rule, factsByPred, allFacts) {
  const rec = (idx, binding, records) => {
    if (idx === rule.premises.length) {
      return [{ binding, records }];
    }
    const pattern = rule.premises[idx];
    // Candidate facts: same predicate if the predicate is a constant.
    const candidates = isVar(pattern[0])
      ? allFacts
      : (factsByPred.get(pattern[0]) ?? []);
    const out = [];
    for (const record of candidates) {
      const b = matchPattern(pattern, record.fact, binding);
      if (b) out.push(...rec(idx + 1, b, [...records, record]));
    }
    return out;
  };
  yield* rec(0, new Map(), []);
}

// Support disjointness is judged MODULO THE QUESTION'S PREMISES (v2):
// the premises are the given world of the question — every route to a
// conclusion about the same subject shares them (instanceOf / madeOf /
// scenario facts) by construction, and they are not evidence. Two routes
// are independent when their non-premise support (base facts from the
// generators) is disjoint. In v1 no fact had two derivations, so this
// changes no v1 result; it is what lets genuinely independent routes
// (a conduction route and a melting route) combine in v2.
export const coreSupport = (support, premiseKeys) =>
  support.filter(k => !premiseKeys.has(k));
export const supportsDisjoint = (a, b, premiseKeys) => {
  const coreB = new Set(coreSupport(b, premiseKeys));
  return !coreSupport(a, premiseKeys).some(k => coreB.has(k));
};

// -------------------------------------------------------------------- engine
// baseFacts: [{fact, tier, strength}] from generators.buildBaseFacts()
// premises:  [fact, ...] from a question's setup (tier 'premise', strength 1)
// Returns { facts: Map(key -> record), stepsUsed, budgetExhausted,
//           derivations: Map(key -> [{via, support, price, depth}]) }
// record: { fact, price, depth, support: [baseFactKey...], receipt: node }
// receipt node: { fact, via, price, depth, support, hopStrength, children }
// derivations is a side record of EVERY distinct rule application that
// produced a fact (deduped by rule + support), kept for analysis — the
// converging-path route counts in run.mjs read it. It never feeds pricing.
export function derive({ baseFacts, premises, rules, arithmetic, budget = {} }) {
  const arith = typeof arithmetic === 'string' ? ARITHMETICS[arithmetic] : arithmetic;
  const maxDepth = budget.maxDepth ?? 5;
  const maxSteps = budget.maxSteps ?? 20000;
  const premiseKeys = new Set(premises.map(factKey));
  const derivations = new Map();
  const seenDerivations = new Set();
  const track = (fact, via, support, price, depth) => {
    const dk = `${factKey(fact)}|${via}|${JSON.stringify(support)}`;
    if (seenDerivations.has(dk)) return;
    seenDerivations.add(dk);
    const k = factKey(fact);
    if (!derivations.has(k)) derivations.set(k, []);
    derivations.get(k).push({ via, support, price, depth });
  };

  const known = new Map();
  const insertBase = (fact, tier, strength, via) => {
    const entry = { tier, strength };
    const price = arith.basePrice(entry);
    known.set(factKey(fact), {
      fact, price, depth: 0, support: [factKey(fact)],
      receipt: { fact, via, price, depth: 0, support: [factKey(fact)], hopStrength: strength, children: [] },
    });
  };
  for (const bf of baseFacts) insertBase(bf.fact, bf.tier, bf.strength, 'base');
  for (const fact of premises) insertBase(fact, TIER.premise, 1.0, 'premise');

  let stepsUsed = 0;
  let budgetExhausted = false;
  let changed = true;

  while (changed && !budgetExhausted) {
    changed = false;
    // Snapshot indexes for this pass; records are read live so improvements
    // propagate on the next pass.
    const factsByPred = new Map();
    for (const record of known.values()) {
      const pred = record.fact[0];
      if (!factsByPred.has(pred)) factsByPred.set(pred, []);
      factsByPred.get(pred).push(record);
    }
    const allFacts = [...known.values()];

    for (const rule of rules) {
      for (const { binding, records } of joins(rule, factsByPred, allFacts)) {
        if (++stepsUsed > maxSteps) { budgetExhausted = true; break; }
        const conclusion = applyPattern(rule.conclusion, binding);
        const depth = 1 + Math.max(...records.map(r => r.depth));
        if (depth > maxDepth) continue;
        const price = arith.rulePrice(records.map(r => r.price), rule, depth);
        const support = [...new Set(records.flatMap(r => r.support))].sort();
        track(conclusion, rule.name, support, price, depth);
        const key = factKey(conclusion);
        const existing = known.get(key);
        const node = {
          fact: conclusion, via: rule.name, price, depth, support,
          hopStrength: rule.factor, children: records.map(r => r.receipt),
        };
        if (!existing) {
          known.set(key, { fact: conclusion, price, depth, support, receipt: node });
          changed = true;
        } else if (arith.isBetter(price, existing.price)) {
          known.set(key, { fact: conclusion, price, depth, support, receipt: node });
          changed = true;
        } else {
          // Combining: only product gains from a second path, and only when
          // the two paths rest on disjoint support — disjointness judged
          // modulo the question's premises (see coreSupport above).
          const disjoint = supportsDisjoint(existing.support, support, premiseKeys);
          if (disjoint) {
            const combined = arith.combine(existing.price, price);
            if (arith.isBetter(combined, existing.price)) {
              const combinedNode = {
                fact: conclusion, via: 'combine', price: combined, depth,
                support: [...new Set([...existing.support, ...support])].sort(),
                hopStrength: null, children: [existing.receipt, node],
              };
              known.set(key, { fact: conclusion, price: combined, depth, support: combinedNode.support, receipt: combinedNode });
              track(conclusion, 'combine', combinedNode.support, combined, depth);
              changed = true;
            }
          }
        }
      }
      if (budgetExhausted) break;
    }
  }

  return { facts: known, stepsUsed, budgetExhausted, arithmetic: arith, derivations };
}

// Find the best-priced value for a goal {pred, subject, context?}.
// Returns { value, price, depth, receipt, conflict } or null (no derivation).
export function queryGoal(derived, goal) {
  const arith = derived.arithmetic;
  const prefix = goal.context === undefined
    ? [goal.pred, goal.subject]
    : [goal.pred, goal.subject, goal.context];
  const candidates = [];
  for (const record of derived.facts.values()) {
    const f = record.fact;
    if (f.length === prefix.length + 1 && prefix.every((p, i) => f[i] === p)) {
      candidates.push({ value: f[f.length - 1], ...record });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (arith.isBetter(a.price, b.price)) return -1;
    if (arith.isBetter(b.price, a.price)) return 1;
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.value < b.value ? -1 : 1;
  });
  const best = candidates[0];
  const rival = candidates.find(c => c.value !== best.value);
  const conflict = rival !== undefined
    && !arith.isBetter(best.price, rival.price)
    && !arith.isBetter(rival.price, best.price);
  return { value: best.value, price: best.price, depth: best.depth, receipt: best.receipt, conflict };
}

// ------------------------------------------------------- receipt JSON contract
// The stable, plain-JSON form of a path receipt — the contract a future
// paramorphic "derivation viewer" component kind would consume:
//   { seed, goal, steps, finalPrice, arithmetic, verdict }
//   seed:       the leaf facts (base + premise) the derivation stands on
//   goal:       the derived fact, as [pred, ...args]
//   steps:      ordered derivation steps, premises before conclusions;
//               each { from: [fact...], rule, to: fact, hopStrength }
//               (rule is a rule name, 'base', 'premise', or 'combine')
//   finalPrice: number (weakest-link/product) or {tier, depth} (tier-depth)
//   verdict:    'assert' (at/above testimony threshold) | 'qualified'
export function receiptToJSON(record, arith) {
  const steps = [];
  const emitted = new Map(); // receipt node -> step index
  const seed = new Map();     // factKey -> fact
  const emit = (node) => {
    if (emitted.has(node)) return;
    for (const child of node.children) emit(child);
    emitted.set(node, steps.length);
    if (node.children.length === 0) seed.set(factKey(node.fact), node.fact);
    steps.push({
      from: node.children.map(c => c.fact),
      rule: node.via,
      to: node.fact,
      hopStrength: node.hopStrength,
    });
  };
  emit(record.receipt);
  return {
    seed: [...seed.values()],
    goal: record.fact,
    steps,
    finalPrice: arith.toJSON(record.price),
    arithmetic: arith.name,
    verdict: arith.testifies(record.price, record.depth) ? 'assert' : 'qualified',
  };
}

// -------------------------------------------------------------------- replay
// Re-execute a contract-form receipt from the generators + a question's
// premises. Confirms: every step is a valid application, hop strengths
// match, supports combine only when disjoint, and the recomputed final
// price equals the receipt's finalPrice at the same conclusion.
// Returns { ok: true, price } or { ok: false, error }.
export function replayReceipt(json, { baseFacts, premises, rules }) {
  const arith = ARITHMETICS[json.arithmetic];
  if (!arith) return { ok: false, error: `unknown arithmetic ${json.arithmetic}` };
  const rulesByName = new Map(rules.map(r => [r.name, r]));
  const baseByKey = new Map(baseFacts.map(bf => [factKey(bf.fact), bf]));
  const premiseKeys = new Set(premises.map(factKey));

  // Per fact: list of derivations {price, depth, support} in emission order.
  const derivations = new Map();
  const push = (fact, d) => {
    const k = factKey(fact);
    if (!derivations.has(k)) derivations.set(k, []);
    derivations.get(k).push(d);
  };
  const latest = (fact) => {
    const list = derivations.get(factKey(fact));
    return list && list.length ? list[list.length - 1] : null;
  };
  const priceEq = (a, b) => {
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-6;
    return a && b && a.tier === b.tier && a.depth === b.depth;
  };

  for (const step of json.steps) {
    if (step.rule === 'base' || step.rule === 'premise') {
      const entry = step.rule === 'base' ? baseByKey.get(factKey(step.to)) : null;
      if (step.rule === 'base' && !entry) return { ok: false, error: `base fact not in generators: ${factKey(step.to)}` };
      if (step.rule === 'premise' && !premiseKeys.has(factKey(step.to))) return { ok: false, error: `premise not in question setup: ${factKey(step.to)}` };
      const e = step.rule === 'base' ? entry : { tier: TIER.premise, strength: 1.0 };
      if (Math.abs(step.hopStrength - e.strength) > 1e-9) return { ok: false, error: `hopStrength mismatch at ${factKey(step.to)}` };
      push(step.to, { price: arith.basePrice(e), depth: 0, support: [factKey(step.to)] });
    } else if (step.rule === 'combine') {
      const list = derivations.get(factKey(step.to)) ?? [];
      if (list.length < 2) return { ok: false, error: `combine without two derivations at ${factKey(step.to)}` };
      const [a, b] = [list[list.length - 2], list[list.length - 1]];
      if (!supportsDisjoint(a.support, b.support, premiseKeys)) return { ok: false, error: `combine over non-disjoint support at ${factKey(step.to)}` };
      push(step.to, {
        price: arith.combine(a.price, b.price),
        depth: Math.max(a.depth, b.depth),
        support: [...new Set([...a.support, ...b.support])].sort(),
      });
    } else {
      const rule = rulesByName.get(step.rule);
      if (!rule) return { ok: false, error: `unknown rule ${step.rule}` };
      if (step.from.length !== rule.premises.length) return { ok: false, error: `arity mismatch in rule ${step.rule}` };
      if (Math.abs(step.hopStrength - rule.factor) > 1e-9) return { ok: false, error: `hopStrength mismatch in rule ${step.rule}` };
      let binding = new Map();
      for (let i = 0; i < rule.premises.length; i++) {
        binding = matchPattern(rule.premises[i], step.from[i], binding);
        if (!binding) return { ok: false, error: `premise ${i} of rule ${step.rule} does not match ${factKey(step.from[i])}` };
      }
      const conclusion = applyPattern(rule.conclusion, binding);
      if (factKey(conclusion) !== factKey(step.to)) return { ok: false, error: `rule ${step.rule} concludes ${factKey(conclusion)}, receipt says ${factKey(step.to)}` };
      const childPrices = [];
      const childDepths = [];
      const support = new Set();
      for (const fromFact of step.from) {
        const d = latest(fromFact);
        if (!d) return { ok: false, error: `step uses underived fact ${factKey(fromFact)}` };
        childPrices.push(d.price);
        childDepths.push(d.depth);
        d.support.forEach(s => support.add(s));
      }
      const depth = 1 + Math.max(...childDepths);
      push(step.to, { price: arith.rulePrice(childPrices, rule, depth), depth, support: [...support].sort() });
    }
  }

  const final = latest(json.goal);
  if (!final) return { ok: false, error: 'goal never derived' };
  if (!priceEq(final.price, json.finalPrice)) {
    return { ok: false, error: `final price mismatch: recomputed ${JSON.stringify(final.price)} vs receipt ${JSON.stringify(json.finalPrice)}` };
  }
  const verdict = arith.testifies(final.price, final.depth) ? 'assert' : 'qualified';
  if (verdict !== json.verdict) return { ok: false, error: `verdict mismatch: recomputed ${verdict} vs receipt ${json.verdict}` };
  const seedKeys = new Set(json.seed.map(factKey));
  for (const s of final.support) if (!seedKeys.has(s)) return { ok: false, error: `support fact ${s} missing from seed` };
  return { ok: true, price: final.price };
}
