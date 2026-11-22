// syllabus2.mjs — the v2 question set: converging paths, deeper chains,
// and the witness-arbitration re-asks. The v1 syllabus (syllabus.mjs) is
// untouched; these questions run only under the v2 configuration
// (generators2.mjs), except the witness section of run.mjs, which also
// checks them against the v1 configuration where a derivation exists.
//
// Question shape is v1's, plus `subsets`: any of 'converging', 'deep',
// 'witness' (a question may sit in two — D8 is both a deep chain and a
// witness case).
//
// CONVERGING questions are built so the expected verdict is reachable by
// two routes whose evidence (base facts) is disjoint. The scenario
// premises (instanceOf / madeOf, and — for these questions — the
// artefact's function fact, asserted directly as a premise, e.g.
// ['holdsContents', 'ceramicPot']) are the GIVEN WORLD, shared by both
// routes by construction; independence is a property of the evidence
// beyond the givens, which is how run.mjs counts routes (support modulo
// premises). Asserting the function fact as a premise rather than
// deriving it through the artefact type is deliberate: it keeps the two
// routes' evidence cleanly separable, and the premise is something the
// scenario states outright ("a pot, which holds contents, ...").

const inst = (id, artefact, material, extra = []) => [
  ['instanceOf', id, artefact],
  ['madeOf', id, material],
  ...extra,
];

export const QUESTIONS_V2 = [
  // ---------------------------------------------------------- converging
  { id: 'G1', subsets: ['converging'], family: 'property', text: 'Does aluminium respond quickly to the burner (heat up and cool down fast)?',
    setup: [], goal: { pred: 'responsive', subject: 'aluminum' }, expected: 'yes',
    justification: 'Two independent reasons: aluminium conducts heat fast, and a typical aluminium piece is light — little stored heat — so it tracks the burner both ways.' },
  { id: 'G2', subsets: ['converging'], family: 'property', text: 'Does aluminium cool down quickly once off the heat?',
    setup: [], goal: { pred: 'coolsQuickly', subject: 'aluminum' }, expected: 'yes',
    justification: 'Same two mechanisms as G1, read in the cooling direction: high conduction sheds heat, low mass means there is little of it to shed.' },
  { id: 'G3', subsets: ['converging'], family: 'outcome', text: 'What happens if you put a glass plate directly on a hot burner?',
    setup: inst('glassPlate', 'plate', 'glass'),
    goal: { pred: 'outcome', subject: 'glassPlate', context: 'hotPan' }, expected: 'cracks',
    justification: 'The stored fact (glass fails on direct heat) and the mechanism agree: glass is brittle and conducts poorly, so the hot face expands against the cold bulk — thermal shock cracks it. Two routes, one verdict.' },
  { id: 'G4', subsets: ['converging'], family: 'suitability', text: 'Would an ice bowl keep ice cream cold?',
    setup: inst('iceBowl', 'bowl', 'ice', [['holdsContents', 'iceBowl']]),
    goal: { pred: 'keepsContentsCold', subject: 'iceBowl' }, expected: 'yes',
    justification: 'Two routes: the wall conducts poorly (ice/water is a mediocre conductor), and the wall is itself frozen — it absorbs incoming heat by melting, sacrificially. (Re-asks v1 S8 with the routes separated.)' },
  { id: 'G5', subsets: ['converging'], family: 'suitability', text: 'Would a ceramic pot keep soup hot?',
    setup: inst('ceramicPot', 'pot', 'ceramic', [['holdsContents', 'ceramicPot']]),
    goal: { pred: 'keepsContentsHot', subject: 'ceramicPot' }, expected: 'yes',
    justification: 'Two routes: ceramic conducts poorly (little leaks out), and a stoneware pot is massive — preheated, it is a heat reservoir in its own right (the slow-cooker crock effect).' },
  { id: 'G6', subsets: ['converging'], family: 'suitability', text: 'Does a ceramic pot stay hot for a long time after you take it off the heat?',
    setup: inst('ceramicPot', 'pot', 'ceramic', [['heatsContents', 'ceramicPot']]),
    goal: { pred: 'retainsHeat', subject: 'ceramicPot' }, expected: 'yes',
    justification: 'Two routes to the same verdict: poor conduction slows the loss, and high thermal mass means there is a great deal of heat to lose.' },
  { id: 'G7', subsets: ['converging'], family: 'suitability', text: 'Would a chilled ceramic bowl keep ice cream cold?',
    setup: inst('ceramicBowl', 'bowl', 'ceramic', [['holdsContents', 'ceramicBowl']]),
    goal: { pred: 'keepsContentsCold', subject: 'ceramicBowl' }, expected: 'yes',
    justification: 'Two routes: poor conduction slows heat coming in, and the chilled massive wall must itself be warmed before the contents can warm (mass works in both directions). (Re-asks v1 S9 with the routes separated.)' },
  { id: 'G8', subsets: ['converging'], family: 'suitability', text: 'Would a cast iron pan heat evenly?',
    setup: inst('castIronPan', 'fryingPan', 'castIron', [['heatsContents', 'castIronPan']]),
    goal: { pred: 'heatsEvenly', subject: 'castIronPan' }, expected: 'partly',
    justification: 'Both halves of the cast-iron story land on "partly": middling conduction gives hot spots over a burner, while high mass smooths them once the pan is hot. (Re-asks v1 S12 with the routes separated.)' },
  { id: 'G9', subsets: ['converging'], family: 'suitability', text: 'Does an aluminium pan stay hot for a long time after you take it off the heat?',
    setup: inst('aluminumPan', 'fryingPan', 'aluminum', [['heatsContents', 'aluminumPan']]),
    goal: { pred: 'retainsHeat', subject: 'aluminumPan' }, expected: 'no',
    justification: 'Two routes: it conducts its heat away quickly, and being light it never stored much. (Re-asks v1 S24 with the routes separated.)' },
  { id: 'G10', subsets: ['converging'], family: 'property', text: 'Does ceramic cool down quickly once off the heat?',
    setup: [], goal: { pred: 'coolsQuickly', subject: 'ceramic' }, expected: 'no',
    justification: 'Two routes: ceramic conducts poorly (heat leaves slowly) and is massive (there is a lot of heat to leave). Anyone who has handled a slow-cooker crock an hour later has verified this.' },
  { id: 'G11', subsets: ['converging'], family: 'property', text: 'Does ceramic respond quickly to the burner?',
    setup: [], goal: { pred: 'responsive', subject: 'ceramic' }, expected: 'no',
    justification: 'The cooling story read backwards: poor conduction plus high mass is exactly what "unresponsive" means for a vessel material.' },

  // ---------------------------------------------------------------- deep
  { id: 'D1', subsets: ['deep'], family: 'suitability', text: 'A copper bowl of hot soup sits on a cork trivet. Is the table underneath safe?',
    setup: [...inst('copperBowl', 'bowl', 'copper'), ...inst('corkTrivet', 'trivet', 'cork'),
            ['sitsOn', 'copperBowl', 'corkTrivet']],
    goal: { pred: 'tableSafe', subject: 'copperBowl' }, expected: 'yes',
    justification: 'Chain: the copper bowl transmits heat (it conducts and holds hot contents) -> the trivet must block it -> cork insulates and tolerates the contact, so the table is safe. Three derivation hops.' },
  { id: 'D2', subsets: ['deep'], family: 'suitability', text: 'A copper bowl of hot soup sits on a plastic trivet. Is the table underneath safe?',
    setup: [...inst('copperBowl', 'bowl', 'copper'), ...inst('plasticTrivet', 'trivet', 'plastic'),
            ['sitsOn', 'copperBowl', 'plasticTrivet']],
    goal: { pred: 'tableSafe', subject: 'copperBowl' }, expected: 'no',
    justification: 'Same chain as D1, but the trivet fails at the contact face (plastic melts), so the protection step concludes "no".' },
  { id: 'D3', subsets: ['deep'], family: 'outcome', text: 'Ice cream is served in a copper bowl and left in a warm room. How does it melt?',
    setup: [...inst('copperBowl', 'bowl', 'copper'), ['context', 'copperBowl', 'warmRoom'],
            ['contains', 'copperBowl', 'iceCream']],
    goal: { pred: 'contentsOutcome', subject: 'copperBowl', context: 'warmRoom' }, expected: 'meltsFast',
    justification: 'Chain: the bowl conducts well -> its heat-exchange rate with the room is fast -> the ice cream it contains, which melts at room temperature, melts fast.' },
  { id: 'D4', subsets: ['deep'], family: 'outcome', text: 'Ice cream is served in a ceramic bowl and left in a warm room. How does it melt?',
    setup: [...inst('ceramicBowl', 'bowl', 'ceramic'), ['context', 'ceramicBowl', 'warmRoom'],
            ['contains', 'ceramicBowl', 'iceCream']],
    goal: { pred: 'contentsOutcome', subject: 'ceramicBowl', context: 'warmRoom' }, expected: 'meltsSlow',
    justification: 'Same chain as D3 at the other rate: poor conduction -> slow heat exchange -> the ice cream still melts (a warm room always wins eventually), but slowly.' },
  { id: 'D5', subsets: ['deep'], family: 'suitability', text: 'A copper frying pan full of hot soup — is it safe to grab by the handle?',
    setup: [...inst('copperPan', 'fryingPan', 'copper'), ['contains', 'copperPan', 'soup']],
    goal: { pred: 'safeToHold', subject: 'copperPan' }, expected: 'no',
    justification: 'Chain: the pan contains hot soup -> the vessel itself becomes hot (it conducts) -> a hot vessel held in the hand is not safe to hold. Unlike v1 S19, the heat arrives via the contents, not via a context.' },
  { id: 'D6', subsets: ['deep'], family: 'suitability', text: 'You carry a wooden bowl of hot soup in both hands. Is it safe to hold?',
    setup: [...inst('woodenBowl', 'bowl', 'wood'), ['contains', 'woodenBowl', 'soup'],
            ['heldInHand', 'woodenBowl']],
    goal: { pred: 'safeToHold', subject: 'woodenBowl' }, expected: 'yes',
    justification: 'Chain: hot contents -> the vessel warms only gently (wood barely conducts) -> safe to hold. (The setup asserts heldInHand outright: the scenario says the bowl is carried in both hands; v1 artefact data does not list bowls as held-in-hand.)' },
  { id: 'D7', subsets: ['deep'], family: 'suitability', text: 'A silicone spatula rests in a copper pot of hot soup. Is it safe to pick up?',
    setup: [...inst('copperPot', 'pot', 'copper'), ['contains', 'copperPot', 'soup'],
            ...inst('siliconeSpatula', 'spatula', 'silicone'), ['restsIn', 'siliconeSpatula', 'copperPot']],
    goal: { pred: 'safeToHold', subject: 'siliconeSpatula' }, expected: 'yes',
    justification: 'Four hops: soup heats the pot -> the pot is a hot vessel -> a utensil resting in it takes heat only as its own conduction allows (silicone: barely) -> safe to hold.' },
  { id: 'D8', subsets: ['deep', 'witness'], family: 'suitability', text: 'A copper spoon rests in a copper pot of hot soup. Is it safe to pick up?',
    setup: [...inst('copperPot', 'pot', 'copper'), ['contains', 'copperPot', 'soup'],
            ...inst('copperSpoon', 'spoon', 'copper'), ['restsIn', 'copperSpoon', 'copperPot']],
    goal: { pred: 'safeToHold', subject: 'copperSpoon' }, expected: 'no',
    justification: 'D7 with the utensil material flipped: copper conducts, so the spoon becomes hot through the chain contents -> vessel -> utensil, and is not safe to pick up. Also a witness case: stored-facts.mjs carries a sloppy generic claiming such a spoon is safe to hold.' },
  { id: 'D9', subsets: ['deep'], family: 'suitability', text: 'You lift a copper pot of hot soup with a silicone oven mitt. Is your hand safe?',
    setup: [...inst('copperPot', 'pot', 'copper'), ['contains', 'copperPot', 'soup'],
            ...inst('siliconeMitt', 'ovenMitt', 'silicone'), ['usedToHold', 'siliconeMitt', 'copperPot']],
    goal: { pred: 'handSafe', subject: 'siliconeMitt' }, expected: 'yes',
    justification: 'Four hops: contents heat the vessel -> the vessel heats the mitt gripping it -> the mitt is a proven hand-protector -> the hand is safe.' },
  { id: 'D10', subsets: ['deep'], family: 'suitability', text: 'You lift a copper pot of hot soup with a paper oven mitt. Is your hand safe?',
    setup: [...inst('copperPot', 'pot', 'copper'), ['contains', 'copperPot', 'soup'],
            ...inst('paperMitt', 'ovenMitt', 'paper'), ['usedToHold', 'paperMitt', 'copperPot']],
    goal: { pred: 'handSafe', subject: 'paperMitt' }, expected: 'no',
    justification: 'D9 with the mitt material flipped: the paper mitt fails the protection step (it chars at contact), so the chain concludes the hand is not safe.' },
  { id: 'D11', subsets: ['deep'], family: 'outcome', text: 'A copper pot of water sits on a hot burner, with a copper spoon resting in it. Does the spoon get hot?',
    setup: [...inst('copperPot', 'pot', 'copper'), ['context', 'copperPot', 'hotPan'],
            ['contains', 'copperPot', 'water'],
            ...inst('copperSpoon', 'spoon', 'copper'), ['restsIn', 'copperSpoon', 'copperPot']],
    goal: { pred: 'utensilHot', subject: 'copperSpoon' }, expected: 'yes',
    justification: 'Five hops, and the contents start COLD (plain water, not a served-hot substance): burner heats the pot -> the pot\'s contents heat up -> the vessel becomes hot -> the resting utensil takes the heat (it conducts) -> the spoon is hot.' },
  { id: 'D12', subsets: ['deep'], family: 'outcome', text: 'A copper pot of water sits on a hot burner, with a wooden spoon resting in it. Does the spoon get hot?',
    setup: [...inst('copperPot', 'pot', 'copper'), ['context', 'copperPot', 'hotPan'],
            ['contains', 'copperPot', 'water'],
            ...inst('woodenSpoon', 'spoon', 'wood'), ['restsIn', 'woodenSpoon', 'copperPot']],
    goal: { pred: 'utensilHot', subject: 'woodenSpoon' }, expected: 'no',
    justification: 'D11 with the utensil material flipped at the last hop: the vessel is just as hot, but wood barely conducts, so the spoon does not get hot.' },

  // ------------------------------------------------------------- witness
  // Re-asks of v1 questions whose goals carry stored facts that conflict
  // (or, in X2/X4, conflicted under the v1 configuration). The witness
  // machinery lives in witness.mjs and run.mjs; these questions simply
  // put the conflicted goals inside the v2 set.
  { id: 'X1', subsets: ['witness'], family: 'property', text: 'Does stainless steel conduct heat well? (witness re-ask of P13)',
    setup: [], goal: { pred: 'conductsWell', subject: 'stainlessSteel' }, expected: 'partly',
    justification: 'The baseline carries the classic trim error — stainless filed as a plain good conductor (a generic claim). The derivation from the attested conduction entry says "partly", at full strength; arbitration should let the derivation flag the fact.' },
  { id: 'X2', subsets: ['witness'], family: 'suitability', text: 'Would a cast iron pot keep soup hot for a long time after the heat is off? (witness re-ask of S5)',
    setup: inst('castIronPot', 'pot', 'castIron'),
    goal: { pred: 'keepsContentsHot', subject: 'castIronPot' }, expected: 'yes',
    justification: 'The baseline carries "cast iron keeps contents hot" as direct testimony about this exact goal (specific). Under the v1 configuration the conduction-only derivation said "partly" and the fact should have won; under v2 the mass axis makes the derivation agree, and the conflict disappears.' },
  { id: 'X4', subsets: ['witness'], family: 'suitability', text: 'Does a cast iron pan stay hot for a long time after you take it off the heat? (witness re-ask of S23)',
    setup: inst('castIronPan', 'fryingPan', 'castIron'),
    goal: { pred: 'retainsHeat', subject: 'castIronPan' }, expected: 'yes',
    justification: 'The S23 twin of X2: specific stored testimony ("cast iron retains heat") against the v1 configuration\'s conduction-only "partly".' },
];
