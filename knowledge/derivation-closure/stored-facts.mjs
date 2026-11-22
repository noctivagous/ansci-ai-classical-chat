// stored-facts.mjs — the BASELINE: a modest set of direct, goal-level
// assertions of the kind a trimmed shipped graph (a CSKG-style bundle)
// plausibly holds. The baseline answers a question ONLY by exact lookup
// of one of these facts; it derives nothing, and its answers carry no
// price — a lookup speaks or it is silent, so every wrong lookup is a
// wrong-and-confident answer by construction.
//
// The list is deliberately honest, not rigged: it holds the famous facts
// (copper conducts, ceramic mugs keep tea hot, cast iron retains heat —
// a classic commonsense assertion a trim really might carry, and one the
// derivation closure below gets WRONG) and at least one plausible error
// a real bundle contains (stainless steel filed as a plain good
// conductor, where the syllabus's expected verdict is 'partly').
//
// v2 adds a `scope` to every fact, used ONLY by witness arbitration
// (witness.mjs) — lookup ignores it, so v1 baseline numbers are
// unchanged:
//   'generic'  a general claim about a class (a material, a substance,
//              a kind of utensil) — the kind of assertion a trim
//              overgeneralises, and the kind a strong derivation may
//              legitimately defeat.
//   'specific' direct testimony about this exact goal (this instance,
//              this predicate) — a derivation must be very sure before
//              it talks over one of these, and under the stated witness
//              rule it never does.

export const BASELINE_FACTS = [
  // property-level (class claims -> generic)
  { pred: 'conductsWell', subject: 'copper', value: 'yes', scope: 'generic' },
  { pred: 'conductsWell', subject: 'wood', value: 'no', scope: 'generic' },
  { pred: 'conductsWell', subject: 'castIron', value: 'partly', scope: 'generic' },
  { pred: 'conductsWell', subject: 'glass', value: 'no', scope: 'generic' },
  { pred: 'conductsWell', subject: 'stainlessSteel', value: 'yes', scope: 'generic' }, // the plausible error (expected 'partly')
  { pred: 'insulates', subject: 'copper', value: 'no', scope: 'generic' },
  { pred: 'insulates', subject: 'wood', value: 'yes', scope: 'generic' },
  { pred: 'survivesIn', subject: 'ceramic', context: 'oven', value: 'yes', scope: 'generic' },
  { pred: 'survivesIn', subject: 'plastic', context: 'oven', value: 'no', scope: 'generic' },
  { pred: 'survivesIn', subject: 'silicone', context: 'oven', value: 'yes', scope: 'generic' },
  { pred: 'survivesIn', subject: 'copper', context: 'oven', value: 'yes', scope: 'generic' },
  // suitability-level (memorised compositional answers — a trim's strength;
  // direct testimony about the exact goal -> specific)
  { pred: 'keepsContentsHot', subject: 'ceramicMug', value: 'yes', scope: 'specific' },
  { pred: 'keepsContentsHot', subject: 'woodenBowl', value: 'yes', scope: 'specific' },
  { pred: 'keepsContentsHot', subject: 'castIronPot', value: 'yes', scope: 'specific' },
  { pred: 'keepsContentsHot', subject: 'glassMug', value: 'yes', scope: 'specific' },
  { pred: 'keepsContentsCold', subject: 'ceramicBowl', value: 'yes', scope: 'specific' },
  { pred: 'heatsEvenly', subject: 'aluminumTray', value: 'yes', scope: 'specific' },
  { pred: 'ovenSafe', subject: 'siliconeTray', value: 'yes', scope: 'specific' },
  { pred: 'ovenSafe', subject: 'plasticTray', value: 'no', scope: 'specific' },
  { pred: 'protectsHand', subject: 'siliconeMitt', value: 'yes', scope: 'specific' },
  { pred: 'safeToHold', subject: 'woodenSpoon', value: 'yes', scope: 'specific' },
  // outcome-level
  { pred: 'outcome', subject: 'plasticTray', context: 'oven', value: 'melts', scope: 'specific' },
  { pred: 'outcome', subject: 'woodenSpoon', context: 'hotLiquid', value: 'staysFine', scope: 'specific' },
  { pred: 'outcome', subject: 'siliconeSpatula', context: 'hotPan', value: 'staysFine', scope: 'specific' },
  { pred: 'outcome', subject: 'iceCream', context: 'warmRoom', value: 'melts', scope: 'generic' },
];

// v2 additions. These are NOT part of the v1 baseline: lookupBaseline
// never sees them, so the v1 baseline column reproduces exactly. They
// exist so the witness-arbitration cases have stored facts to conflict
// with (and so the v2 question set has a baseline column of its own).
export const BASELINE_FACTS_V2 = [
  // The famous assertion, as direct testimony about this exact goal.
  // Under the v1 configuration it contradicts the conduction-only
  // derivation of S23 ('partly') and should win.
  { pred: 'retainsHeat', subject: 'castIronPan', value: 'yes', scope: 'specific' },
  // A sloppy generic a trim might carry — "a spoon sitting in hot food
  // is fine to grab" — keyed here to the copper spoon of D8/S19. The
  // derivation says 'no'; whether the generic survives depends on the
  // derivation's price, which is exactly what the witness rule prices.
  { pred: 'safeToHold', subject: 'copperSpoon', value: 'yes', scope: 'generic' },
  // A junky generic in the other direction — "ceramic is a poor keeper
  // of heat" — against G5's two-route derivation of 'yes'. Seeded so
  // the witness set contains a derivation-win against a generic on a
  // suitability goal, not only on a property goal (X1).
  { pred: 'keepsContentsHot', subject: 'ceramicPot', value: 'no', scope: 'generic' },
];

export const ALL_BASELINE_FACTS = [...BASELINE_FACTS, ...BASELINE_FACTS_V2];

const key = (pred, subject, context) =>
  `${pred}|${subject}|${context ?? ''}`;

const INDEX = new Map(BASELINE_FACTS.map(f => [key(f.pred, f.subject, f.context), f.value]));
const INDEX_ALL = new Map(ALL_BASELINE_FACTS.map(f => [key(f.pred, f.subject, f.context), f.value]));

// Returns the stored value for the question's goal, or null (decline).
// v1 facts only — this is the baseline of record for the v1 question set.
export function lookupBaseline(question) {
  const { pred, subject, context } = question.goal;
  const v = INDEX.get(key(pred, subject, context));
  return v === undefined ? null : v;
}

// Same lookup over v1 + v2 facts (the v2 question set's baseline).
export function lookupStoredAll(question) {
  const { pred, subject, context } = question.goal;
  const v = INDEX_ALL.get(key(pred, subject, context));
  return v === undefined ? null : v;
}

// The stored fact ENTRY (value + scope) for a question's goal, or null.
// Witness arbitration needs the scope, not just the value.
export function findStoredFact(question, { all = true } = {}) {
  const { pred, subject, context } = question.goal;
  const list = all ? ALL_BASELINE_FACTS : BASELINE_FACTS;
  return list.find(f => f.pred === pred && f.subject === subject
    && (f.context ?? undefined) === (context ?? undefined)) ?? null;
}
