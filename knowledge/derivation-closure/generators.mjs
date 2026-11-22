// generators.mjs — the kitchen/heat domain authored AS GENERATORS.
//
// Three kinds of content, and nothing else:
//   1. Material/substance property entries (the attested core): how each
//      material conducts, which contexts it withstands, and how it fails
//      in the contexts it does not withstand.
//   2. Artefact function entries: what each artefact type is FOR
//      (holds contents, is held in hand, insulates a hand, ...).
//   3. Derivation RULES that quantify over materials and artefacts.
//      No rule mentions a specific question, a specific artefact instance,
//      or a question's expected answer. Suitability and outcome verdicts
//      are NEVER stored here — they are derived by walk.mjs or not at all.
//
// Deliberate omission in v1 (documented in syllabus.mjs S5/S23): the v1
// rule set had NO thermal-mass property, so cast iron's heat retention —
// a mass effect — was invisible to it. That gap was left visible on
// purpose. v2 lifts the omission in a controlled way: materials now carry
// a `thermalMass` field and MASS_RULES below use it, but both are admitted
// ONLY by the v2 configuration (buildBaseFacts({ mass: true }) + the v2
// rule list in generators2.mjs). buildBaseFacts() with no options and the
// RULES list are exactly the v1 instrument, so v1 numbers still reproduce.

// tier ranks: premise facts (from a question's setup) = 4, attested core = 3,
// structural/definitional rules = 3, generic behavioural defaults = 2.
export const TIER = { premise: 4, attested: 3, structural: 3, generic: 2 };

// conducts: 'high' | 'medium' | 'low'  (qualitative kitchen scale)
// withstands: contexts the material comes through undamaged
// failsIn: context -> outcome for contexts it does not withstand
// thermalMass (v2): 'high' | 'medium' | 'low' — how much heat a typical
//   kitchen piece of the material stores. Cast iron is the high exemplar
//   (heavy for its size, the Dutch-oven effect); ceramic is also high
//   (dense stoneware — slow-cooker crocks are thermal-mass devices);
//   aluminium is low (light, responsive, sheds heat fast).
export const MATERIALS = {
  copper:         { conducts: 'high',   thermalMass: 'medium', withstands: ['freezer', 'warmRoom', 'hotLiquid', 'oven', 'hotPan', 'hotContact'], failsIn: {} },
  aluminum:       { conducts: 'high',   thermalMass: 'low',    withstands: ['freezer', 'warmRoom', 'hotLiquid', 'oven', 'hotPan', 'hotContact'], failsIn: {} },
  castIron:       { conducts: 'medium', thermalMass: 'high',   withstands: ['freezer', 'warmRoom', 'hotLiquid', 'oven', 'hotPan', 'hotContact'], failsIn: {} },
  stainlessSteel: { conducts: 'medium', thermalMass: 'medium', withstands: ['freezer', 'warmRoom', 'hotLiquid', 'oven', 'hotPan', 'hotContact'], failsIn: {} },
  ceramic:        { conducts: 'low',    thermalMass: 'high',   withstands: ['freezer', 'warmRoom', 'hotLiquid', 'oven', 'hotPan', 'hotContact'], failsIn: {} },
  glass:          { conducts: 'low',    thermalMass: 'medium', withstands: ['freezer', 'warmRoom', 'hotLiquid', 'oven', 'hotContact'],            failsIn: { hotPan: 'cracks' } },
  silicone:       { conducts: 'low',    thermalMass: 'low',    withstands: ['freezer', 'warmRoom', 'hotLiquid', 'oven', 'hotPan', 'hotContact'], failsIn: {} },
  wood:           { conducts: 'low',    thermalMass: 'low',    withstands: ['freezer', 'warmRoom', 'hotLiquid', 'hotContact'],                     failsIn: { oven: 'burns', hotPan: 'burns' } },
  plastic:        { conducts: 'low',    thermalMass: 'low',    withstands: ['freezer', 'warmRoom'],                                                failsIn: { oven: 'melts', hotPan: 'melts', hotContact: 'melts' } },
  paper:          { conducts: 'low',    thermalMass: 'low',    withstands: ['freezer', 'warmRoom', 'hotLiquid'],                                   failsIn: { oven: 'burns', hotPan: 'burns', hotContact: 'burns' } },
  cork:           { conducts: 'low',    thermalMass: 'low',    withstands: ['freezer', 'warmRoom', 'hotContact'],                                  failsIn: { oven: 'burns', hotPan: 'burns' } },
  ice:            { conducts: 'low',    thermalMass: 'low',    withstands: ['freezer'],                                                           failsIn: { warmRoom: 'melts', hotLiquid: 'melts', oven: 'melts', hotPan: 'melts', hotContact: 'melts' } },
};

// Substances that can themselves be the subject of an outcome question.
export const SUBSTANCES = {
  butter:   { withstands: ['freezer'], failsIn: { warmRoom: 'melts', hotLiquid: 'melts', oven: 'melts', hotPan: 'melts', hotContact: 'melts' } },
  iceCream: { withstands: ['freezer'], failsIn: { warmRoom: 'melts', hotLiquid: 'melts', oven: 'melts', hotPan: 'melts', hotContact: 'melts' } },
};

// What each artefact type is for. These are function facts, not verdicts.
export const ARTEFACT_PROPS = {
  bowl:        ['holdsContents'],
  mug:         ['holdsContents'],
  cup:         ['holdsContents'],
  plate:       ['holdsContents'],
  pot:         ['holdsContents', 'heatsContents'],
  kettle:      ['holdsContents', 'heatsContents'],
  bakingTray:  ['holdsContents', 'heatsContents'],
  bakingDish:  ['holdsContents', 'heatsContents'],
  fryingPan:   ['heatsContents', 'heldInHand'],
  spoon:       ['heldInHand'],
  spatula:     ['heldInHand'],
  ovenMitt:    ['heldInHand', 'insulatesHand'],
  trivet:      ['insulatesSurface'],
  iceTray:     [],
  cuttingBoard: [],
};

export const HOT_CONTEXTS = ['hotLiquid', 'oven', 'hotPan'];

// --------------------------------------------------------------------- rules
// A rule: { name, factor (per-hop strength), tier, premises, conclusion }.
// Patterns are fact arrays; elements starting with '$' are variables.
// The conclusion's predicate may itself be a variable (propTransfer).
const R = (name, factor, tier, premises, conclusion) =>
  ({ name, factor, tier, premises, conclusion });

export const RULES = [
  // An instance has every function property of its artefact type.
  R('propTransfer', 0.97, TIER.structural,
    [['instanceOf', '$A', '$T'], ['artefactProp', '$T', '$P']],
    ['$P', '$A']),

  // An artefact conducts as its material conducts.
  R('artefactConducts', 0.97, TIER.structural,
    [['madeOf', '$A', '$M'], ['conducts', '$M', '$L']],
    ['conducts', '$A', '$L']),

  // Definitional readings of the conduction scale.
  R('conductsWellHigh', 0.98, TIER.structural, [['conducts', '$X', 'high']],   ['conductsWell', '$X', 'yes']),
  R('conductsWellMed',  0.98, TIER.structural, [['conducts', '$X', 'medium']], ['conductsWell', '$X', 'partly']),
  R('conductsWellLow',  0.98, TIER.structural, [['conducts', '$X', 'low']],    ['conductsWell', '$X', 'no']),
  R('insulatesLow',     0.98, TIER.structural, [['conducts', '$X', 'low']],    ['insulates', '$X', 'yes']),
  R('insulatesMed',     0.98, TIER.structural, [['conducts', '$X', 'medium']], ['insulates', '$X', 'partly']),
  R('insulatesHigh',    0.98, TIER.structural, [['conducts', '$X', 'high']],   ['insulates', '$X', 'no']),

  // Survival of a material in a context, read off the property entries.
  R('survivesYes', 0.98, TIER.structural, [['withstands', '$X', '$C']],            ['survivesIn', '$X', '$C', 'yes']),
  R('survivesNo',  0.98, TIER.structural, [['failsIn', '$X', '$C', '$O']],         ['survivesIn', '$X', '$C', 'no']),

  // Outcomes: for a material/substance subject directly...
  R('outcomeMaterialFail', 0.98, TIER.structural, [['failsIn', '$X', '$C', '$O']],    ['outcome', '$X', '$C', '$O']),
  R('outcomeMaterialFine', 0.98, TIER.structural, [['withstands', '$X', '$C']],       ['outcome', '$X', '$C', 'staysFine']),
  // ...and for an artefact instance, through its material.
  R('outcomeFail', 0.95, TIER.structural,
    [['madeOf', '$A', '$M'], ['failsIn', '$M', '$C', '$O']],
    ['outcome', '$A', '$C', '$O']),
  R('outcomeFine', 0.95, TIER.structural,
    [['madeOf', '$A', '$M'], ['withstands', '$M', '$C']],
    ['outcome', '$A', '$C', 'staysFine']),

  // Oven safety of an instance, through its material.
  R('ovenSafeYes', 0.95, TIER.structural,
    [['madeOf', '$A', '$M'], ['withstands', '$M', 'oven']],
    ['ovenSafe', '$A', 'yes']),
  R('ovenSafeNo', 0.95, TIER.structural,
    [['madeOf', '$A', '$M'], ['failsIn', '$M', 'oven', '$O']],
    ['ovenSafe', '$A', 'no']),

  // --- Generic behavioural defaults (tier 'generic', factor 0.85). ---------
  // Keeping contents hot/cold: conduction through the wall is the mechanism
  // this model knows. (Thermal mass is NOT modelled — see header.)
  R('keepsHotLow',  0.85, TIER.generic, [['conducts', '$A', 'low'],    ['holdsContents', '$A']], ['keepsContentsHot', '$A', 'yes']),
  R('keepsHotMed',  0.85, TIER.generic, [['conducts', '$A', 'medium'], ['holdsContents', '$A']], ['keepsContentsHot', '$A', 'partly']),
  R('keepsHotHigh', 0.85, TIER.generic, [['conducts', '$A', 'high'],   ['holdsContents', '$A']], ['keepsContentsHot', '$A', 'no']),
  R('keepsColdLow',  0.85, TIER.generic, [['conducts', '$A', 'low'],    ['holdsContents', '$A']], ['keepsContentsCold', '$A', 'yes']),
  R('keepsColdMed',  0.85, TIER.generic, [['conducts', '$A', 'medium'], ['holdsContents', '$A']], ['keepsContentsCold', '$A', 'partly']),
  R('keepsColdHigh', 0.85, TIER.generic, [['conducts', '$A', 'high'],   ['holdsContents', '$A']], ['keepsContentsCold', '$A', 'no']),

  // Even heating of a vessel that heats contents.
  R('heatsEvenlyHigh', 0.85, TIER.generic, [['conducts', '$A', 'high'],   ['heatsContents', '$A']], ['heatsEvenly', '$A', 'yes']),
  R('heatsEvenlyMed',  0.85, TIER.generic, [['conducts', '$A', 'medium'], ['heatsContents', '$A']], ['heatsEvenly', '$A', 'partly']),
  R('heatsEvenlyLow',  0.85, TIER.generic, [['conducts', '$A', 'low'],    ['heatsContents', '$A']], ['heatsEvenly', '$A', 'no']),

  // Retaining its OWN heat once off the heat (conduction-loss model only).
  R('retainsHeatLow',  0.85, TIER.generic, [['conducts', '$A', 'low'],    ['heatsContents', '$A']], ['retainsHeat', '$A', 'yes']),
  R('retainsHeatMed',  0.85, TIER.generic, [['conducts', '$A', 'medium'], ['heatsContents', '$A']], ['retainsHeat', '$A', 'partly']),
  R('retainsHeatHigh', 0.85, TIER.generic, [['conducts', '$A', 'high'],   ['heatsContents', '$A']], ['retainsHeat', '$A', 'no']),

  // Holding a utensil that sits in something hot.
  R('safeHoldLow',  0.85, TIER.generic,
    [['conducts', '$A', 'low'],    ['heldInHand', '$A'], ['context', '$A', '$C'], ['hotContext', '$C']],
    ['safeToHold', '$A', 'yes']),
  R('safeHoldMed',  0.85, TIER.generic,
    [['conducts', '$A', 'medium'], ['heldInHand', '$A'], ['context', '$A', '$C'], ['hotContext', '$C']],
    ['safeToHold', '$A', 'partly']),
  R('safeHoldHigh', 0.85, TIER.generic,
    [['conducts', '$A', 'high'],   ['heldInHand', '$A'], ['context', '$A', '$C'], ['hotContext', '$C']],
    ['safeToHold', '$A', 'no']),

  // Hand protection: insulation alone is not enough — the mitt's material
  // must also withstand hot contact (this is what paper and plastic fail).
  R('protectsHandYes', 0.85, TIER.generic,
    [['conducts', '$A', 'low'], ['insulatesHand', '$A'], ['madeOf', '$A', '$M'], ['withstands', '$M', 'hotContact']],
    ['protectsHand', '$A', 'yes']),
  R('protectsHandFails', 0.90, TIER.generic,
    [['insulatesHand', '$A'], ['madeOf', '$A', '$M'], ['failsIn', '$M', 'hotContact', '$O']],
    ['protectsHand', '$A', 'no']),
  R('protectsHandConducts', 0.85, TIER.generic,
    [['conducts', '$A', 'high'], ['insulatesHand', '$A']],
    ['protectsHand', '$A', 'no']),

  // Surface protection (trivets): same two-condition shape.
  R('protectsSurfaceYes', 0.85, TIER.generic,
    [['conducts', '$A', 'low'], ['insulatesSurface', '$A'], ['madeOf', '$A', '$M'], ['withstands', '$M', 'hotContact']],
    ['protectsSurface', '$A', 'yes']),
  R('protectsSurfaceFails', 0.90, TIER.generic,
    [['insulatesSurface', '$A'], ['madeOf', '$A', '$M'], ['failsIn', '$M', 'hotContact', '$O']],
    ['protectsSurface', '$A', 'no']),
];

// ------------------------------------------------------- v2: the mass axis
// Rules that use thermalMass. Exported separately from RULES and admitted
// only by the v2 configuration, so the v1 instrument is untouched.
//
// The retention rules are written FLAT (premises are the instanceOf /
// madeOf premises plus the material's thermalMass and the artefact type's
// function entry, all depth 0), in the same style as v1's ovenSafeYes /
// outcomeFine rules, which also conclude in one step from base + premise
// facts. Factor 0.92: a single well-attested mechanism (stored heat)
// applied directly, against 0.85 for v1's conduction defaults.
//
// Deliberate asymmetries, on physical grounds:
// - There is NO keepsHotMassLow rule. A low-mass INSULATING vessel (a
//   wooden bowl) keeps soup hot fine — the soup is the reservoir, the
//   wall is the leak, and the leak is conduction. Low mass alone does
//   not leak, so it must not conclude 'no' for contents.
// - retainsHeatMassLow (the vessel's OWN heat) needs no conduction
//   premise: a light vessel stores little heat, full stop.
export const MASS_RULES = [
  // An artefact has the thermal mass of its material (transfer, as
  // artefactConducts is for conduction).
  R('artefactMass', 0.97, TIER.structural,
    [['madeOf', '$A', '$M'], ['thermalMass', '$M', '$L']],
    ['thermalMass', '$A', '$L']),

  // High mass keeps contents hot (the pot/crock as heat reservoir) —
  // and, pre-chilled, keeps contents cold the same way.
  R('keepsHotMass', 0.92, TIER.generic,
    [['madeOf', '$A', '$M'], ['thermalMass', '$M', 'high'],
     ['instanceOf', '$A', '$T'], ['artefactProp', '$T', 'holdsContents']],
    ['keepsContentsHot', '$A', 'yes']),
  R('keepsColdMass', 0.92, TIER.generic,
    [['madeOf', '$A', '$M'], ['thermalMass', '$M', 'high'],
     ['instanceOf', '$A', '$T'], ['artefactProp', '$T', 'holdsContents']],
    ['keepsContentsCold', '$A', 'yes']),

  // High mass retains the vessel's own heat; low mass sheds it.
  R('retainsHeatMass', 0.92, TIER.generic,
    [['madeOf', '$A', '$M'], ['thermalMass', '$M', 'high'],
     ['instanceOf', '$A', '$T'], ['artefactProp', '$T', 'heatsContents']],
    ['retainsHeat', '$A', 'yes']),
  R('retainsHeatMassLow', 0.92, TIER.generic,
    [['madeOf', '$A', '$M'], ['thermalMass', '$M', 'low'],
     ['instanceOf', '$A', '$T'], ['artefactProp', '$T', 'heatsContents']],
    ['retainsHeat', '$A', 'no']),
];

// ------------------------------------------------------------ base fact base
// The attested core as flat facts. Each entry: { fact, tier, strength }.
// buildBaseFacts() with no options is EXACTLY the v1 fact base. The
// { mass: true } option (v2 configuration) additionally emits one
// thermalMass fact per material.
export function buildBaseFacts({ mass = false } = {}) {
  const facts = [];
  const add = (fact, strength = 0.95) =>
    facts.push({ fact, tier: TIER.attested, strength });

  for (const [m, props] of Object.entries(MATERIALS)) {
    add(['conducts', m, props.conducts]);
    if (mass) add(['thermalMass', m, props.thermalMass]);
    for (const c of props.withstands) add(['withstands', m, c]);
    for (const [c, o] of Object.entries(props.failsIn)) add(['failsIn', m, c, o]);
  }
  for (const [s, props] of Object.entries(SUBSTANCES)) {
    for (const c of props.withstands) add(['withstands', s, c]);
    for (const [c, o] of Object.entries(props.failsIn)) add(['failsIn', s, c, o]);
  }
  for (const [t, props] of Object.entries(ARTEFACT_PROPS))
    for (const p of props) add(['artefactProp', t, p], 0.90);
  for (const c of HOT_CONTEXTS) add(['hotContext', c]);

  return facts;
}
