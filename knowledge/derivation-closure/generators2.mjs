// generators2.mjs — the v2 generator additions, and the v2 configuration.
//
// generators.mjs holds the v1 instrument (RULES + buildBaseFacts()) plus
// the thermal-mass axis (MASS_RULES + the thermalMass material field).
// This file holds everything else v2 adds: two small property axes
// (brittleness, served-hot), the converging-path predicates (responsive,
// coolsQuickly, plus second routes into outcome / keepsContentsCold /
// heatsEvenly), and the deep-chain rules (contents, vessels, utensils,
// tables, mitts) that only fire on the scenario premises the v2 syllabus
// supplies (contains / sitsOn / restsIn / usedToHold).
//
// The v2 CONFIGURATION is: buildBaseFactsV2() + RULES_V2 below. The v1
// configuration remains buildBaseFacts() + RULES from generators.mjs,
// byte for byte, so v1 results reproduce.

import { TIER, RULES, MASS_RULES, buildBaseFacts } from './generators.mjs';

const R = (name, factor, tier, premises, conclusion) =>
  ({ name, factor, tier, premises, conclusion });

// ------------------------------------------------------- extra base facts
// brittle: thermal-shock fragility. Only glass carries it in this domain
// (glass's hotPan failure in v1 is stored as a bare failsIn entry; v2
// additionally models WHY, which is what gives W5-style outcomes a
// second, independent derivation route).
export const BRITTLE = { glass: 'yes' };

// Substances that are served hot by nature (their contents start hot
// without any heating step in the scenario).
export const SERVED_HOT = ['soup', 'tea', 'boilingWater'];

export function buildExtraBaseFacts() {
  const facts = [];
  const add = (fact, strength = 0.95) =>
    facts.push({ fact, tier: TIER.attested, strength });
  for (const [m, v] of Object.entries(BRITTLE)) add(['brittle', m, v]);
  for (const s of SERVED_HOT) add(['servedHot', s]);
  return facts;
}

export function buildBaseFactsV2() {
  return [...buildBaseFacts({ mass: true }), ...buildExtraBaseFacts()];
}

// ------------------------------------------------------------------- rules
export const EXTRA_RULES = [
  // --- Converging-path predicates: responsiveness and cooling speed. ---
  // Each verdict is reachable from the conduction entry AND from the
  // thermal-mass entry — two different attested properties, disjoint
  // support. Conduction rules are listed before mass rules so the
  // discovery order (and hence which route a max/best-of arithmetic
  // keeps) is deterministic.
  R('responsiveConductsHigh', 0.90, TIER.generic, [['conducts', '$M', 'high']],   ['responsive', '$M', 'yes']),
  R('responsiveConductsMed',  0.90, TIER.generic, [['conducts', '$M', 'medium']], ['responsive', '$M', 'partly']),
  R('responsiveConductsLow',  0.90, TIER.generic, [['conducts', '$M', 'low']],    ['responsive', '$M', 'no']),
  R('responsiveMassLow',      0.90, TIER.generic, [['thermalMass', '$M', 'low']],  ['responsive', '$M', 'yes']),
  R('responsiveMassHigh',     0.90, TIER.generic, [['thermalMass', '$M', 'high']], ['responsive', '$M', 'no']),

  R('coolsConductsHigh', 0.90, TIER.generic, [['conducts', '$M', 'high']],   ['coolsQuickly', '$M', 'yes']),
  R('coolsConductsLow',  0.90, TIER.generic, [['conducts', '$M', 'low']],    ['coolsQuickly', '$M', 'no']),
  R('coolsMassLow',      0.90, TIER.generic, [['thermalMass', '$M', 'low']],  ['coolsQuickly', '$M', 'yes']),
  R('coolsMassHigh',     0.90, TIER.generic, [['thermalMass', '$M', 'high']], ['coolsQuickly', '$M', 'no']),

  // --- Second routes into v1 predicates. --------------------------------
  // Thermal shock: a brittle, poorly-conducting vessel on direct heat
  // cracks because the hot face expands against the cold bulk. This is a
  // genuinely different mechanism from the stored failsIn entry (which
  // it corroborates for glass), resting on conducts + brittle instead.
  R('outcomeShock', 0.88, TIER.generic,
    [['madeOf', '$A', '$M'], ['conducts', '$M', 'low'], ['brittle', '$M', 'yes']],
    ['outcome', '$A', 'hotPan', 'cracks']),

  // A vessel whose wall itself melts at room temperature keeps contents
  // cold sacrificially: the wall absorbs heat as it melts (an ice bowl).
  // Independent of the conduction route into the same verdict.
  R('meltingWall', 0.88, TIER.generic,
    [['madeOf', '$A', '$M'], ['failsIn', '$M', 'warmRoom', 'melts'], ['holdsContents', '$A']],
    ['keepsContentsCold', '$A', 'yes']),

  // Even heating, second route: a high-mass vessel smooths burner hot
  // spots over time even when its conduction is only middling — the
  // other half of cast iron's 'partly' story.
  R('heatsEvenlyMass', 0.92, TIER.generic,
    [['madeOf', '$A', '$M'], ['thermalMass', '$M', 'high'],
     ['instanceOf', '$A', '$T'], ['artefactProp', '$T', 'heatsContents']],
    ['heatsEvenly', '$A', 'partly']),

  // --- Deep chains: contents -> vessel -> utensil / table / hand. -------
  // These fire only on v2 scenario premises (contains / sitsOn /
  // restsIn / usedToHold), which no v1 question supplies.
  R('contentsHotServed', 0.95, TIER.structural,
    [['contains', '$A', '$S'], ['servedHot', '$S']],
    ['contentsHot', '$A']),
  R('contentsHeating', 0.95, TIER.structural,
    [['context', '$A', 'hotPan'], ['heatsContents', '$A']],
    ['contentsHeating', '$A']),
  R('contentsHotHeated', 0.92, TIER.structural,
    [['contentsHeating', '$A'], ['contains', '$A', '$S']],
    ['contentsHot', '$A']),

  R('vesselHot', 0.90, TIER.generic,
    [['contentsHot', '$A'], ['conducts', '$A', 'high']],
    ['vesselHot', '$A']),
  R('vesselWarm', 0.90, TIER.generic,
    [['contentsHot', '$A'], ['conducts', '$A', 'low']],
    ['vesselWarm', '$A']),
  R('safeHoldVesselHot', 0.88, TIER.generic,
    [['vesselHot', '$A'], ['heldInHand', '$A']],
    ['safeToHold', '$A', 'no']),
  R('safeHoldVesselWarm', 0.88, TIER.generic,
    [['vesselWarm', '$A'], ['heldInHand', '$A']],
    ['safeToHold', '$A', 'yes']),

  R('utensilHotYes', 0.90, TIER.generic,
    [['restsIn', '$U', '$V'], ['vesselHot', '$V'], ['conducts', '$U', 'high']],
    ['utensilHot', '$U', 'yes']),
  R('utensilHotNo', 0.90, TIER.generic,
    [['restsIn', '$U', '$V'], ['vesselHot', '$V'], ['conducts', '$U', 'low']],
    ['utensilHot', '$U', 'no']),
  R('safeHoldUtensilHot', 0.88, TIER.generic,
    [['utensilHot', '$U', 'yes'], ['heldInHand', '$U']],
    ['safeToHold', '$U', 'no']),
  R('safeHoldUtensilCool', 0.88, TIER.generic,
    [['utensilHot', '$U', 'no'], ['heldInHand', '$U']],
    ['safeToHold', '$U', 'yes']),

  // Heat escaping through a vessel wall toward whatever it sits on.
  R('vesselTransmits', 0.90, TIER.generic,
    [['conducts', '$A', 'high'], ['holdsContents', '$A']],
    ['vesselTransmits', '$A']),
  R('tableSafeYes', 0.88, TIER.generic,
    [['vesselTransmits', '$A'], ['sitsOn', '$A', '$T'], ['protectsSurface', '$T', 'yes']],
    ['tableSafe', '$A', 'yes']),
  R('tableSafeNo', 0.88, TIER.generic,
    [['vesselTransmits', '$A'], ['sitsOn', '$A', '$T'], ['protectsSurface', '$T', 'no']],
    ['tableSafe', '$A', 'no']),

  // Rate at which a vessel in a context exchanges heat with its contents.
  R('heatGainFast', 0.92, TIER.structural,
    [['conducts', '$A', 'high'], ['context', '$A', '$C']],
    ['heatGain', '$A', '$C', 'fast']),
  R('heatGainSlow', 0.92, TIER.structural,
    [['conducts', '$A', 'low'], ['context', '$A', '$C']],
    ['heatGain', '$A', '$C', 'slow']),
  R('contentsMeltFast', 0.88, TIER.generic,
    [['heatGain', '$A', '$C', 'fast'], ['contains', '$A', '$S'], ['failsIn', '$S', '$C', 'melts']],
    ['contentsOutcome', '$A', '$C', 'meltsFast']),
  R('contentsMeltSlow', 0.88, TIER.generic,
    [['heatGain', '$A', '$C', 'slow'], ['contains', '$A', '$S'], ['failsIn', '$S', '$C', 'melts']],
    ['contentsOutcome', '$A', '$C', 'meltsSlow']),

  // A mitt between a hot vessel and a hand.
  R('mittHot', 0.90, TIER.generic,
    [['usedToHold', '$M', '$V'], ['vesselHot', '$V']],
    ['mittHot', '$M']),
  R('handSafeYes', 0.88, TIER.generic,
    [['mittHot', '$M'], ['protectsHand', '$M', 'yes']],
    ['handSafe', '$M', 'yes']),
  R('handSafeNo', 0.88, TIER.generic,
    [['mittHot', '$M'], ['protectsHand', '$M', 'no']],
    ['handSafe', '$M', 'no']),
];

// The v2 rule list: v1 rules first (their relative order is part of the
// v1 instrument), then the mass axis, then the v2 additions.
export const RULES_V2 = [...RULES, ...MASS_RULES, ...EXTRA_RULES];
