/**
 * fork-r4.test.ts — slice R4 of the reply-planning programme
 * (design note §7.4/§8.9/§9.1/§10): disposition LIVE.
 *
 * The scenarios and declared effects are frozen in
 * docs/fork/transcripts/T-R4.md, authored before the build;
 * this file pins them at unit level:
 *  - the bias table: the two reference compositions, their
 *    boundaries inside the declared band, the neutral
 *    boundary exactly SUPPORT_HIGH, no bias under neutral;
 *  - channel (c) thresholds: the decisive windows change the
 *    level within the ceiling; the floor and the ceilings do
 *    not move under any composition (T-R4 §9);
 *  - channel (a) arbitration: comparable candidates re-rank
 *    by affinity to the predominant element, inside the
 *    comparable group only (T-R4 §6);
 *  - channel (b) move selection: at the restrainer junction
 *    the disposition selects between the two grounded moves
 *    (T-R4 §7);
 *  - channel (d) length: a lead-only composition speaks the
 *    lead member and holds the rest, recorded (T-R4 §6/§8);
 *  - the comparison discipline (T-R4 §4): conclusion fields
 *    identical across compositions; paired neutral runs
 *    trace-identical; no bias record under neutral;
 *  - the surface discipline: no reply names the ontology or
 *    the disposition, under any composition.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BIAS_BY_PREDOMINANT,
  BOUNDARY_MAX,
  BOUNDARY_MIN,
  COMPARABLE_SUPPORT_BAND,
  WATER_DISPOSITION,
  WOOD_DISPOSITION,
  affinityToPredominant,
  biasForComposition,
  effectiveHighBoundary,
  priceWithBoundary,
} from "../src/fork/disposition";
import { NEUTRAL_COMPOSITION } from "../src/fork/composition";
import { SUPPORT_FLOOR, SUPPORT_HIGH, priceReply } from "../src/fork/pricing";
import { planComposition, planPredication, type PricedConclusion } from "../src/fork/plan";
import { buildForkGraph, derive } from "../src/fork/join";
import { tiersOnPath, weakestTier } from "../src/fork/pricing";
import { newSession, type Session } from "../src/fork/session";
import { processTurn, type TurnResult } from "../src/fork/turn";
import type { Composition } from "../src/fork/composition";

const COMPS: [string, Composition][] = [
  ["neutral", NEUTRAL_COMPOSITION],
  ["wood", WOOD_DISPOSITION],
  ["water", WATER_DISPOSITION],
];

const LEAK = /\b(wood|fire|earth|metal|wuxing|yin|yang|element|elements|five elements)\b/i;

/* ---------------------------------------------------------------- */
/* The bias table                                                    */
/* ---------------------------------------------------------------- */

test("r4 table: the reference compositions and their declared postures", () => {
  assert.deepEqual(WOOD_DISPOSITION, { predominant: "Wood", secondary: "Fire", trace: "Earth" });
  assert.deepEqual(WATER_DISPOSITION, { predominant: "Water", secondary: "Metal", trace: "Fire" });
  assert.equal(biasForComposition(WOOD_DISPOSITION)?.highBoundary, 0.75);
  assert.equal(biasForComposition(WATER_DISPOSITION)?.highBoundary, 0.85);
  assert.equal(biasForComposition(WOOD_DISPOSITION)?.length, "full-set");
  assert.equal(biasForComposition(WATER_DISPOSITION)?.length, "lead-only");
  assert.deepEqual(biasForComposition(WOOD_DISPOSITION)?.movePreference, ["generating", "restrainer", "venting"]);
  assert.deepEqual(biasForComposition(WATER_DISPOSITION)?.movePreference, ["restrainer", "venting", "generating"]);
  for (const [, bias] of Object.entries(BIAS_BY_PREDOMINANT)) {
    assert.ok(bias!.highBoundary >= BOUNDARY_MIN && bias!.highBoundary <= BOUNDARY_MAX, "every table boundary is inside the declared band");
  }
  assert.equal(COMPARABLE_SUPPORT_BAND, 0.1);
});

test("r4 table: the neutral composition applies no bias, anywhere", () => {
  assert.equal(biasForComposition(NEUTRAL_COMPOSITION), undefined);
  assert.equal(effectiveHighBoundary(NEUTRAL_COMPOSITION), SUPPORT_HIGH, "the neutral boundary is exactly SUPPORT_HIGH");
  assert.equal(effectiveHighBoundary(WOOD_DISPOSITION), 0.75);
  assert.equal(effectiveHighBoundary(WATER_DISPOSITION), 0.85);
  assert.equal(effectiveHighBoundary(undefined), SUPPORT_HIGH);
  // Neutral pricing IS priceReply, across tiers and supports.
  for (const tier of ["attested", "established", "derived", "prediction"] as const) {
    for (const support of [0.3, 0.5, 0.77, 0.8, 0.9, 1]) {
      const { priced, record } = priceWithBoundary(tier, support, NEUTRAL_COMPOSITION);
      assert.deepEqual(priced, priceReply(tier, support));
      assert.equal(record, undefined);
      assert.deepEqual(priceWithBoundary(tier, support).priced, priceReply(tier, support), "no composition: the standing price");
    }
  }
});

test("r4 affinity: the direction rule in the sense layer's weights", () => {
  assert.equal(affinityToPredominant(WOOD_DISPOSITION, "Wood"), 1.0, "same element");
  assert.equal(affinityToPredominant(WOOD_DISPOSITION, "Fire"), 0.8, "Wood generates Fire");
  assert.equal(affinityToPredominant(WOOD_DISPOSITION, "Water"), 0.8, "Water generates Wood");
  assert.equal(affinityToPredominant(WOOD_DISPOSITION, "Earth"), 0.4, "Wood controls Earth");
  assert.equal(affinityToPredominant(WOOD_DISPOSITION, "Metal"), 0.4, "Metal controls Wood");
  assert.equal(affinityToPredominant(WATER_DISPOSITION, "Metal"), 0.8, "Metal generates Water");
  assert.equal(affinityToPredominant(WATER_DISPOSITION, "Wood"), 0.8, "Water generates Wood");
  assert.equal(affinityToPredominant(WATER_DISPOSITION, "Fire"), 0.4, "Water controls Fire");
  assert.equal(affinityToPredominant(WATER_DISPOSITION, "Earth"), 0.4, "Earth controls Water");
});

/* ---------------------------------------------------------------- */
/* Channel (c): thresholds — windows, and the invariants (T-R4 §9)   */
/* ---------------------------------------------------------------- */

test("r4 threshold: the decisive windows change the level, within the ceiling", () => {
  // Salt's neighbour family: established tier at 0.765 — Wood's window.
  assert.equal(priceWithBoundary("established", 0.765, NEUTRAL_COMPOSITION).priced.level, "qualified");
  const wood = priceWithBoundary("established", 0.765, WOOD_DISPOSITION);
  assert.equal(wood.priced.level, "lightly-qualified", "0.765 clears Wood's 0.75 boundary: at the ceiling");
  assert.equal(wood.priced.ceiling, "lightly-qualified");
  assert.equal(wood.record?.channel, "threshold");
  assert.equal(priceWithBoundary("established", 0.765, WATER_DISPOSITION).priced.level, "qualified");
  assert.equal(priceWithBoundary("established", 0.765, WATER_DISPOSITION).record, undefined, "0.765 is in neither Water window side — middling under both boundaries");
  // Winter's neighbour family: established tier at 0.8075 — Water's window.
  assert.equal(priceWithBoundary("established", 0.8075, NEUTRAL_COMPOSITION).priced.level, "lightly-qualified");
  assert.equal(priceWithBoundary("established", 0.8075, WOOD_DISPOSITION).priced.level, "lightly-qualified");
  const water = priceWithBoundary("established", 0.8075, WATER_DISPOSITION);
  assert.equal(water.priced.level, "qualified", "0.8075 falls short of Water's 0.85 boundary: one level down");
  assert.equal(water.record?.channel, "threshold");
  // The soup case: derived tier at exactly 0.8.
  assert.equal(priceWithBoundary("derived", 0.8, WOOD_DISPOSITION).priced.level, "qualified");
  assert.equal(priceWithBoundary("derived", 0.8, WOOD_DISPOSITION).record, undefined, "0.8 is the excluded top of Wood's window");
  assert.equal(priceWithBoundary("derived", 0.8, WATER_DISPOSITION).priced.level, "possibility");
});

test("r4 invariants: the floor and the ceilings do not move, under any composition", () => {
  for (const [, comp] of COMPS) {
    // The floor: below it, decline everywhere, ground naming 0.4.
    for (const tier of ["derived", "prediction"] as const) {
      const { priced } = priceWithBoundary(tier, 0.35, comp);
      assert.equal(priced.declined, true, `${tier} at 0.35 declines under ${comp.predominant}`);
      assert.equal(priced.level, "decline");
    }
    // Ceilings: a derived conclusion never speaks plain, however high the support.
    assert.equal(priceWithBoundary("derived", 0.95, comp).priced.level, "qualified");
    assert.equal(priceWithBoundary("established", 0.95, comp).priced.level, "lightly-qualified");
    assert.equal(priceWithBoundary("attested", 0.95, comp).priced.level, "plain");
    assert.equal(SUPPORT_FLOOR, 0.4);
  }
  // The boundary governs only ceiling-vs-one-down: a prediction
  // at 0.77 is spoken as a possibility only under Wood — and
  // this is not the floor moving (0.77 > 0.4 everywhere; at
  // 0.35 the same tier declines under all three, above).
  assert.equal(priceWithBoundary("prediction", 0.77, NEUTRAL_COMPOSITION).priced.level, "decline");
  assert.equal(priceWithBoundary("prediction", 0.77, WATER_DISPOSITION).priced.level, "decline");
  const woodPred = priceWithBoundary("prediction", 0.77, WOOD_DISPOSITION);
  assert.equal(woodPred.priced.level, "possibility");
  assert.equal(woodPred.priced.ceiling, "possibility", "at its ceiling, not above it");
});

test("r4 threshold at the speaking site: the soup predication under Water speaks one level down", () => {
  const input = {
    subject: { lemma: "soup", form: "soup", det: "the", person: "3sg" },
    qualityLemma: "cold",
    derivationPath: "soup —HAS_ELEMENT→ Water —POLARITY_OF→ Yin —HAS_QUALITY→ cold",
    support: 0.8,
    weakestTier: "derived" as const,
  };
  const neutral = planPredication(input);
  assert.equal(neutral.kind, "graph");
  if (neutral.kind === "graph") {
    assert.equal(neutral.level, "qualified");
    assert.equal(neutral.sentence, "The soup may be cold.");
    assert.equal(neutral.bias, undefined);
  }
  const water = planPredication({ ...input, disposition: WATER_DISPOSITION });
  assert.equal(water.kind, "graph");
  if (water.kind === "graph") {
    assert.equal(water.level, "possibility");
    assert.equal(water.sentence, "The soup might be cold.");
    assert.equal(water.pricing.ceiling, "qualified", "the ceiling did not move — the level fell within it");
    assert.equal(water.bias?.length, 1);
    assert.equal(water.bias?.[0].channel, "threshold");
  }
  const wood = planPredication({ ...input, disposition: WOOD_DISPOSITION });
  assert.equal(wood.kind, "graph");
  if (wood.kind === "graph") {
    assert.equal(wood.level, "qualified");
    assert.equal(wood.bias, undefined, "0.8 is outside Wood's decisive window: no application, no record");
  }
});

/* ---------------------------------------------------------------- */
/* R4-2: arbitration + threshold + length over derive() (T-R4 §6)    */
/* ---------------------------------------------------------------- */

function saltColorConclusions(): PricedConclusion[] {
  const graph = buildForkGraph();
  const d = derive(graph, "salt");
  const wanted = ["black", "green", "white", "red", "yellow"];
  return wanted.map((label) => {
    const c = d.conclusions.find((x) => x.label === label && (x.category === "color" || x.category.endsWith(":color")))!;
    return {
      subject: { lemma: "salt", form: "salt", det: "the", person: "3sg" },
      qualityLemma: label,
      element: c.element!,
      derivationPath: c.path,
      support: c.confidence,
      weakestTier: weakestTier(tiersOnPath(d, c))!,
    };
  });
}

test("r4-2: conclusions identical across compositions; order and levels differ only as declared", () => {
  const runs = COMPS.map(([name, comp]) => {
    const out = planComposition({ conclusions: saltColorConclusions(), disposition: comp });
    assert.equal(out.kind, "graph");
    if (out.kind !== "graph") throw new Error("unreachable");
    return { name, out };
  });
  const conclusionFields = (out: (typeof runs)[number]["out"]) =>
    [...out.members, ...out.held]
      .map((m) => ({ quality: m.qualityLemma, tier: m.pricing.weakestTier, support: m.pricing.support, ceiling: m.pricing.ceiling }))
      .sort((a, b) => a.quality.localeCompare(b.quality));
  const [neutral, wood, water] = runs.map((r) => r.out);
  assert.deepEqual(conclusionFields(wood), conclusionFields(neutral), "wood: the same conclusions, tiers, supports, ceilings");
  assert.deepEqual(conclusionFields(water), conclusionFields(neutral), "water: the same conclusions, tiers, supports, ceilings");
  assert.equal(neutral.dropped.length + wood.dropped.length + water.dropped.length, 0, "no member is below the floor in any run");

  // Support order: neutral and Water stand in enumeration order;
  // Wood swaps red ahead of white, inside the comparable group.
  assert.deepEqual(neutral.supportOrder, ["black", "green", "white", "red", "yellow"]);
  assert.deepEqual(water.supportOrder, ["black", "green", "white", "red", "yellow"]);
  assert.deepEqual(wood.supportOrder, ["black", "green", "red", "white", "yellow"]);
  assert.deepEqual(wood.relationOrder, wood.supportOrder, "relation order falls back and re-ranks the same way here");
  assert.deepEqual(water.relationOrder, water.supportOrder);

  // Levels: black at its ceiling everywhere; the 0.765 members
  // speak at the ceiling only under Wood.
  const levels = (out: typeof neutral) =>
    Object.fromEntries([...out.members, ...out.held].map((m) => [m.qualityLemma, m.pricing.level]));
  assert.deepEqual(levels(neutral), { black: "lightly-qualified", green: "qualified", white: "qualified", red: "qualified", yellow: "qualified" });
  assert.deepEqual(levels(wood), { black: "lightly-qualified", green: "lightly-qualified", white: "lightly-qualified", red: "lightly-qualified", yellow: "lightly-qualified" });
  assert.deepEqual(levels(water), levels(neutral), "water: 0.765 is middling under both 0.8 and 0.85");

  // Length: Water speaks the lead member only and holds the rest.
  assert.deepEqual(water.members.map((m) => m.qualityLemma), ["black"]);
  assert.deepEqual(water.held.map((h) => h.qualityLemma), ["green", "white", "red", "yellow"]);
  assert.deepEqual(wood.held, []);
  assert.deepEqual(neutral.held, []);
  assert.deepEqual(neutral.members.map((m) => m.qualityLemma), neutral.supportOrder);

  // Bias records: Wood — four threshold (one per window member,
  // each contextualised) + two arbitration; Water — two
  // arbitration (before == after: the ranking confirms) + one
  // length; neutral — none.
  assert.equal(neutral.bias, undefined);
  const woodChannels = (wood.bias ?? []).map((b) => b.channel);
  assert.deepEqual(woodChannels, ["threshold", "threshold", "threshold", "threshold", "arbitration", "arbitration"]);
  assert.equal(new Set((wood.bias ?? []).filter((b) => b.channel === "threshold").map((b) => b.context)).size, 4, "each member's threshold application is separately named");
  const waterArb = (water.bias ?? []).filter((b) => b.channel === "arbitration");
  assert.equal(waterArb.length, 2);
  assert.deepEqual(waterArb[0].before, waterArb[0].after, "water's affinity ranking confirms the standing order, and the record says so by equality");
  assert.equal((water.bias ?? []).filter((b) => b.channel === "length").length, 1);
  assert.equal((water.bias ?? []).filter((b) => b.channel === "threshold").length, 0);
});

/* ---------------------------------------------------------------- */
/* Turn-level scenarios (T-R4 §5, §7, §8)                            */
/* ---------------------------------------------------------------- */

function runScenario(comp: Composition, turns: string[]): { session: Session; results: TurnResult[] } {
  const session = newSession(comp);
  return { session, results: turns.map((t) => processTurn(session, t)) };
}

const conclusionFieldsOfTurn = (r: TurnResult) => ({
  tier: r.trace.pricing?.weakestTier,
  support: r.trace.pricing?.support,
  ceiling: r.trace.pricing?.ceiling,
  decline: r.trace.declineReason,
});
const recordFields = (s: Session) => ({
  states: s.states.map((x) => [x.holder, x.lemma, x.element, !!x.negated, x.turn]),
  events: s.events.map((x) => [x.verb, x.turn]),
  topics: s.topics.map((x) => [x.lemma, x.raisedTurn, x.lastTouchedTurn]),
});

test("r4-1: the threshold channel at the question site (turn-level)", () => {
  const turns = ["Is the soup cold?", "Is the salt cold?"];
  const runs = COMPS.map(([, comp]) => runScenario(comp, turns));
  for (let t = 0; t < turns.length; t++) {
    const fields = runs.map((r) => conclusionFieldsOfTurn(r.results[t]));
    assert.deepEqual(fields[1], fields[0], `turn ${t + 1}: wood's conclusion fields equal neutral's`);
    assert.deepEqual(fields[2], fields[0], `turn ${t + 1}: water's conclusion fields equal neutral's`);
  }
  const [neutral, wood, water] = runs.map((r) => r.results);
  assert.equal(neutral[0].trace.pricing?.level, "qualified");
  assert.equal(wood[0].trace.pricing?.level, "qualified");
  assert.equal(water[0].trace.pricing?.level, "possibility", "water: 0.8 falls in the decisive window [0.8, 0.85)");
  assert.equal(water[0].reply, "The soup might be cold.");
  assert.equal(neutral[0].reply, "The soup may be cold.");
  assert.equal(water[0].trace.dispositionBias?.length, 1);
  assert.equal(water[0].trace.dispositionBias?.[0].channel, "threshold");
  assert.equal(wood[0].trace.dispositionBias, undefined);
  // The control turn: support 0.9 clears every boundary.
  for (const r of [neutral, wood, water]) {
    assert.equal(r[1].trace.pricing?.level, "plain");
    assert.equal(r[1].trace.dispositionBias, undefined);
  }
});

test("r4-3: move selection on the restrainer junction (turn-level)", () => {
  const turns = ["I couldn't sleep.", "I was worried."];
  const runs = COMPS.map(([, comp]) => runScenario(comp, turns));
  const records = runs.map((r) => recordFields(r.session));
  assert.deepEqual(records[1], records[0], "wood: the session record is identical");
  assert.deepEqual(records[2], records[0], "water: the session record is identical");
  const [neutral, wood, water] = runs.map((r) => r.results);
  // Turn 1: one grounded move only — identical, no record, any composition.
  for (const r of [neutral, wood, water]) {
    assert.equal(r[0].reply, neutral[0].reply);
    assert.equal(r[0].trace.cyclePath, "Water→Wood (generating)");
    assert.equal(r[0].trace.dispositionBias, undefined);
  }
  // Turn 2: neutral and Water address the restrainer; Wood follows.
  assert.equal(neutral[1].trace.cyclePath, "Earth→Water (controlling)");
  assert.equal(neutral[1].trace.dispositionBias, undefined);
  assert.equal(water[1].reply, neutral[1].reply, "water selects the restrainer, as the standing order does");
  assert.equal(water[1].trace.cyclePath, "Earth→Water (controlling)");
  assert.equal(water[1].trace.dispositionBias?.length, 1);
  assert.equal(water[1].trace.dispositionBias?.[0].channel, "move");
  assert.deepEqual(water[1].trace.dispositionBias?.[0].before, water[1].trace.dispositionBias?.[0].after, "water's selection confirms the standing order");
  assert.equal(wood[1].trace.cyclePath, "Earth→Metal (generating)", "wood selects the generating follow");
  assert.equal(wood[1].trace.generatingMargin, true);
  assert.equal(wood[1].trace.dispositionBias?.[0].channel, "move");
  assert.deepEqual(wood[1].trace.dispositionBias?.[0].after, ["follow the generating direction", "address the restrainer"]);
  assert.notEqual(wood[1].reply, neutral[1].reply);
});

test("r4-4: the length channel at the question site (turn-level)", () => {
  const turns = ["Is winter cold?", "Is summer hot?"];
  const runs = COMPS.map(([, comp]) => runScenario(comp, turns));
  const memberSet = (r: TurnResult) =>
    [...(r.trace.composition?.members ?? []), ...(r.trace.composition?.held ?? [])]
      .map((m) => ({ quality: m.quality, tier: m.pricing.weakestTier, support: m.pricing.support, ceiling: m.pricing.ceiling, level: m.pricing.level }))
      .sort((a, b) => a.quality.localeCompare(b.quality));
  for (let t = 0; t < turns.length; t++) {
    const sets = runs.map((r) => memberSet(r.results[t]));
    assert.deepEqual(sets[1], sets[0], `turn ${t + 1}: wood's priced member set equals neutral's`);
    assert.deepEqual(sets[2], sets[0], `turn ${t + 1}: water's priced member set (spoken + held) equals neutral's`);
  }
  const [neutral, wood, water] = runs.map((r) => r.results);
  assert.equal(neutral[0].reply, "Winter is most fully cold, and it is most fully dark.");
  assert.equal(wood[0].reply, neutral[0].reply);
  assert.equal(wood[0].trace.composition?.held, undefined);
  assert.equal(water[0].reply, "Winter is most fully cold.");
  assert.deepEqual(water[0].trace.composition?.held?.map((h) => h.quality), ["dark"]);
  assert.equal(water[0].trace.composition?.held?.[0].pricing.level, "plain", "the held member keeps its price");
  assert.equal(water[1].reply, "Summer is most fully hot.");
  assert.deepEqual(water[1].trace.composition?.held?.map((h) => h.quality), ["bright"]);
  assert.equal(water[0].trace.dispositionBias?.filter((b) => b.channel === "length").length, 1);
  assert.equal(neutral[0].trace.dispositionBias, undefined);
});

/* ---------------------------------------------------------------- */
/* The neutral declaration, and the surface (T-R4 §4, §10)           */
/* ---------------------------------------------------------------- */

test("r4 neutral: paired neutral runs are trace-identical and carry no bias records", () => {
  const allTurns = [
    ["Is the soup cold?", "Is the salt cold?"],
    ["I couldn't sleep.", "I was worried."],
    ["Is winter cold?", "Is summer hot?"],
    ["I heard the news.", "I was furious.", "I shouted at him."],
  ];
  for (const turns of allTurns) {
    const a = runScenario(NEUTRAL_COMPOSITION, turns);
    const b = runScenario(NEUTRAL_COMPOSITION, turns);
    assert.equal(
      JSON.stringify(a.results.map((r) => r.trace)),
      JSON.stringify(b.results.map((r) => r.trace)),
      `neutral traces identical for: ${turns[0]}`,
    );
    for (const r of a.results) assert.equal(r.trace.dispositionBias, undefined, "no bias record under neutral");
  }
  // Explicit neutral composition == no composition, in the planner.
  const withNeutral = planComposition({ conclusions: saltColorConclusions(), disposition: NEUTRAL_COMPOSITION });
  const without = planComposition({ conclusions: saltColorConclusions() });
  assert.equal(JSON.stringify(withNeutral), JSON.stringify(without));
});

test("r4 surface: no reply under any composition names the ontology or the disposition", () => {
  const allTurns = [
    "Is the soup cold?",
    "Is the salt cold?",
    "I couldn't sleep.",
    "I was worried.",
    "Is winter cold?",
    "Is summer hot?",
    "Why is winter cold?",
  ];
  for (const [, comp] of COMPS) {
    const s = newSession(comp);
    for (const t of allTurns) {
      const r = processTurn(s, t);
      assert.ok(!LEAK.test(r.reply), `reply leaks ontology vocabulary (${comp.predominant}): ${r.reply}`);
      assert.ok(!/disposition|predominant/i.test(r.reply), `reply names the disposition: ${r.reply}`);
    }
  }
  const out = planComposition({ conclusions: saltColorConclusions(), disposition: WATER_DISPOSITION });
  assert.equal(out.kind, "graph");
  if (out.kind === "graph") assert.ok(!LEAK.test(out.sentence), `composed reply leaks: ${out.sentence}`);
});
