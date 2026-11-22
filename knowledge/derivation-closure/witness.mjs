// witness.mjs — witness arbitration (v2, addition 4).
//
// The derivation closure and the stored-fact baseline are two witnesses
// to the same world. When they disagree about a question's goal, the
// disagreement is never silently averaged away: it is DETECTED,
// RESOLVED by the stated rule below, and RECORDED as a located lack —
// a 'witness-conflict' entry naming the goal, both values, both
// strengths, the resolution, and whether the resolution matched the
// syllabus's expected verdict. A conflict the rule resolves against the
// derivation is still a lack: something in the generators or the store
// is wrong, and the entry says where.
//
// THE STATED RULE (owner-commissioned):
//   1. A stored fact WINS over a derivation when the derivation's price
//      is below the assert threshold — a qualified derivation may not
//      talk over testimony.
//   2. A stored fact also WINS when it is uncontested direct testimony
//      about that exact goal (scope 'specific') — even an
//      assert-strength derivation does not override direct testimony;
//      the disagreement is banked as a lack for a human to settle.
//   3. A derivation WINS only when its price is at assert strength AND
//      the stored fact is a generic class claim (scope 'generic') —
//      the trim's overgeneralisations are exactly what derivation is
//      for, and the fact is flagged in the conflict entry.
//
// Silence is not a conflict: if either witness has nothing to say about
// the goal, there is nothing to arbitrate.

// derived: a queryGoal() hit ({ value, price, depth, ... }) or null when
//          the closure derived nothing for the goal.
// fact:    a stored-fact entry ({ pred, subject, context?, value, scope })
//          or null when the store is silent.
// arith:   the pricing arithmetic in force (its testifies() decides
//          whether the derivation is at assert strength).
// Returns null when there is no conflict, else the conflict record.
export function arbitrate({ question, derived, fact, arith }) {
  if (!fact || !derived) return null;
  if (derived.value === fact.value) return null;

  const atAssert = arith.testifies(derived.price, derived.depth);
  const verdict = atAssert ? 'assert' : 'qualified';
  let winner, reason;
  if (!atAssert) {
    winner = 'stored-fact';
    reason = `derivation price ${arith.format(derived.price)} is below the assert threshold (verdict: ${verdict}) — a qualified derivation may not talk over testimony`;
  } else if (fact.scope === 'specific') {
    winner = 'stored-fact';
    reason = 'the stored fact is direct testimony about this exact goal (scope: specific) — an assert-strength derivation does not override it; the disagreement is recorded as a lack';
  } else {
    winner = 'derivation';
    reason = 'derivation is at assert strength and the stored fact is a generic class claim (scope: generic) — the derivation wins and the fact is flagged';
  }
  const resolution = winner === 'derivation' ? derived.value : fact.value;
  const { pred, subject, context } = question.goal;
  return {
    type: 'witness-conflict',
    question: question.id,
    goal: { pred, subject, ...(context ? { context } : {}) },
    derivedValue: derived.value,
    derivedPrice: arith.format(derived.price),
    derivedVerdict: verdict,
    factValue: fact.value,
    factScope: fact.scope,
    winner,
    resolution,
    matchesExpected: resolution === question.expected,
    expected: question.expected,
    reason,
  };
}
