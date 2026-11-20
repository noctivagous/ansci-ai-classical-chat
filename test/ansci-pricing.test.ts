/**
 * ansci-pricing.test.ts — slice R0 of the reply-planning programme
 * (design note §9/§10): record and pricing foundations.
 *
 * Pins, at unit level:
 *  - the §9.2 pricing rule as data — ceiling by tier, support
 *    bands, the decline floor — across tier × support;
 *  - the tier mapping from the provenance strings the stores
 *    actually carry;
 *  - the §9.1 Composition format (ranked predominance, equality,
 *    rendering, the declared neutral default);
 *  - the §9.4 session-record fields, populated by real turns:
 *    state origins (classified with path/support/tier; parsed
 *    with no derivation dressed up as one), first-class topics,
 *    the disposition on the session, supersession as a delta;
 *  - the trace extensions: the disposition header on every turn,
 *    a pricing record where steering rests on a derivation, and
 *    §9.3's generating-margin flag on the branches it describes;
 *  - R0's acceptance condition: the four scripted scenarios
 *    produce reply text IDENTICAL to the unmodified tree (the
 *    expected strings below were captured from that tree before
 *    any R0 edit).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { newSession, supersedeState, type Session, type StateRecord } from "../src/ansci/session";
import { processTurn, type TurnResult } from "../src/ansci/turn";
import { SCENARIOS } from "../src/ansci/scenarios";
import {
  CEILING_BY_TIER,
  SUPPORT_FLOOR,
  SUPPORT_HIGH,
  priceReply,
  tierOfProvenance,
  weakestTier,
} from "../src/ansci/pricing";
import {
  NEUTRAL_COMPOSITION,
  compositionFromRanks,
  compositionRanks,
  compositionsEqual,
  isNeutralComposition,
  renderComposition,
} from "../src/ansci/composition";

function run(session: Session, turns: string[]): TurnResult[] {
  return turns.map((t) => processTurn(session, t));
}

/* ---------------- §9.2: the pricing rule ---------------- */

test("pricing: ceiling by tier is the §9.2 table, as data", () => {
  assert.deepEqual(CEILING_BY_TIER, {
    attested: "plain",
    established: "lightly-qualified",
    derived: "qualified",
    prediction: "possibility",
  });
  // The bands are the sense layer's weights, not new numbers.
  assert.equal(SUPPORT_HIGH, 0.8);
  assert.equal(SUPPORT_FLOOR, 0.4);
});

test("pricing: high support speaks at the ceiling, for every tier", () => {
  assert.deepEqual(priceReply("attested", 1.0), { ceiling: "plain", level: "plain", declined: false });
  assert.deepEqual(priceReply("attested", SUPPORT_HIGH), { ceiling: "plain", level: "plain", declined: false });
  assert.deepEqual(priceReply("established", 0.95), { ceiling: "lightly-qualified", level: "lightly-qualified", declined: false });
  assert.deepEqual(priceReply("derived", 0.95), { ceiling: "qualified", level: "qualified", declined: false });
  assert.deepEqual(priceReply("prediction", 0.95), { ceiling: "possibility", level: "possibility", declined: false });
});

test("pricing: middling support drops exactly one level", () => {
  assert.equal(priceReply("attested", 0.79).level, "lightly-qualified");
  assert.equal(priceReply("attested", SUPPORT_FLOOR).level, "lightly-qualified", "at the floor is still middling, not a decline");
  assert.equal(priceReply("established", 0.5).level, "qualified");
  assert.equal(priceReply("derived", 0.5).level, "possibility");
  // One level below possibility is the decline.
  assert.deepEqual(priceReply("prediction", 0.5), { ceiling: "possibility", level: "decline", declined: true });
});

test("pricing: support below the floor declines, whatever the ceiling", () => {
  for (const tier of ["attested", "established", "derived", "prediction"] as const) {
    const p = priceReply(tier, SUPPORT_FLOOR - 0.01);
    assert.equal(p.level, "decline", `${tier} below the floor declines`);
    assert.equal(p.declined, true);
    assert.equal(p.ceiling, CEILING_BY_TIER[tier], "the ceiling is still recorded");
  }
});

/* ---------------- tiers from provenance ---------------- */

test("tiers: the provenance strings the stores carry map to the ladder", () => {
  assert.equal(tierOfProvenance("fork-curated"), "attested", "T1: attested restatements");
  assert.equal(tierOfProvenance("seed-atomic"), "attested", "the seed's own tables, which fork-curated restates");
  assert.equal(tierOfProvenance("ingested"), "established", "attested in a named source, not yet promoted");
  assert.equal(tierOfProvenance("fork-creative"), "derived", "extension by analogy is inference");
  assert.equal(tierOfProvenance("wordnet-derived"), "derived", "T3 names the climbs");
  assert.equal(tierOfProvenance("verb-domain-derived"), "derived", "§9.2 names verb-domain classifications");
  assert.equal(tierOfProvenance("B-derived"), "derived", "the flavor bridge's evidence grade");
  assert.equal(tierOfProvenance("cskg"), undefined, "an unmapped provenance surfaces as unpriceable, never a guess");
  assert.equal(tierOfProvenance(""), undefined);
});

test("tiers: a path prices at its weakest tier", () => {
  assert.equal(weakestTier(["attested", "established"]), "established");
  assert.equal(weakestTier(["attested", "derived", "established"]), "derived");
  assert.equal(weakestTier(["prediction", "attested"]), "prediction");
  assert.equal(weakestTier([]), undefined);
});

/* ---------------- §9.1: compositions ---------------- */

test("composition: ranked predominance — equality, ranks, rendering", () => {
  const a = compositionFromRanks(["Wood", "Fire", "Water"]);
  assert.deepEqual(compositionRanks(a), ["Wood", "Fire", "Water"]);
  assert.equal(renderComposition(a), "predominant Wood, secondary Fire, trace Water");
  assert.ok(compositionsEqual(a, { predominant: "Wood", secondary: "Fire", trace: "Water" }));
  assert.ok(!compositionsEqual(a, { predominant: "Wood", secondary: "Water", trace: "Fire" }), "rank order is the composition");
  assert.ok(!compositionsEqual(a, { predominant: "Wood", secondary: "Fire" }), "a missing rank is a different composition");
  assert.equal(renderComposition({ predominant: "Metal" }), "predominant Metal");
});

test("composition: the format's invariants are enforced", () => {
  assert.throws(() => compositionFromRanks([]), /one to three ranks/);
  assert.throws(() => compositionFromRanks(["Wood", "Fire", "Earth", "Metal"]), /one to three ranks/);
  assert.throws(() => compositionFromRanks(["Wood", "Wood"]), /distinct/);
});

test("composition: the neutral default is declared and recognisable", () => {
  assert.deepEqual(NEUTRAL_COMPOSITION, { predominant: "Earth" });
  assert.ok(isNeutralComposition(NEUTRAL_COMPOSITION));
  assert.ok(!isNeutralComposition({ predominant: "Wood" }));
  assert.equal(renderComposition(NEUTRAL_COMPOSITION), "predominant Earth");
});

/* ---------------- §9.4: the session record ---------------- */

test("record: classified states carry their classification leg, support and tier", () => {
  const s = newSession();
  run(s, SCENARIOS[0].turns);
  const furious = s.states.find((st) => st.lemma === "furious")!;
  assert.deepEqual(furious.origin, {
    kind: "classified",
    path: "furious —HAS_ELEMENT→ Wood",
    support: 0.9,
    tier: "attested",
    provenance: "fork-curated",
  });
  const s2 = newSession();
  run(s2, SCENARIOS[1].turns);
  const worried = s2.states.find((st) => st.lemma === "worried")!;
  assert.equal(worried.origin.kind, "classified");
  assert.equal(worried.origin.tier, "derived", "worried is a fork-creative entry — inference, not attestation");
  assert.equal(worried.origin.provenance, "fork-creative");
});

test("record: a state with no classification behind it has a parsed origin, not a dressed-up derivation", () => {
  const s = newSession();
  processTurn(s, "The ladder is big.");
  const big = s.states.find((st) => st.lemma === "big")!;
  assert.deepEqual(big.origin, { kind: "parsed" });
});

test("record: topics are first-class, with raised and last-touched turns", () => {
  const s = newSession();
  run(s, SCENARIOS[3].turns);
  assert.deepEqual(s.topics.find((t) => t.lemma === "soup"), { lemma: "soup", raisedTurn: 1, lastTouchedTurn: 3 });
  assert.deepEqual(s.topics.find((t) => t.lemma === "salt"), { lemma: "salt", raisedTurn: 2, lastTouchedTurn: 3 });
});

test("record: the session carries its disposition and turn counter", () => {
  const s = newSession();
  assert.ok(isNeutralComposition(s.disposition), "the default session disposition is the declared neutral");
  run(s, SCENARIOS[0].turns);
  assert.equal(s.turnCount, 3);
  const custom = newSession({ predominant: "Wood", secondary: "Fire" });
  const [r] = run(custom, ["I was furious."]);
  assert.equal(r.trace.disposition, "predominant Wood, secondary Fire", "a session's composition is the one it was started with");
});

test("record: supersession is a delta, and a supersession of nothing records nothing", () => {
  const s = newSession();
  run(s, SCENARIOS[1].turns.slice(0, 1)); // "I can't sleep."
  const standing = s.states.find((st) => st.lemma === "sleep")!;
  assert.equal(standing.negated, true);
  const corrected: StateRecord = { ...standing, negated: false, turn: 2, origin: { kind: "parsed" } };
  const delta = supersedeState(s, corrected);
  assert.ok(delta, "the delta is returned");
  assert.equal(delta!.replaced.negated, true);
  assert.equal(delta!.replacing.negated, false);
  assert.equal(delta!.turn, 2);
  assert.equal(s.supersessions.length, 1);
  assert.equal(s.states.filter((st) => st.lemma === "sleep").length, 1, "the corrected state stands in place of the old");
  assert.equal(s.states.find((st) => st.lemma === "sleep")!.negated, false);
  const none = supersedeState(s, { holder: "you", lemma: "rage", turn: 3, origin: { kind: "parsed" } });
  assert.equal(none, undefined);
  assert.equal(s.supersessions.length, 1, "no standing state, no delta");
});

/* ---------------- trace extensions ---------------- */

test("trace: every turn's header names the session's disposition composition", () => {
  for (const scenario of SCENARIOS) {
    const s = newSession();
    for (const r of run(s, scenario.turns)) {
      assert.equal(r.trace.disposition, "predominant Earth");
    }
  }
});

test("trace: derivation-steered turns carry a pricing record; unsteered turns carry none", () => {
  const s = newSession();
  const [t1, t2] = run(s, SCENARIOS[0].turns);
  assert.equal(t1.trace.pricing, undefined, "the pure event turn rests on no derivation");
  // Anger followed in the generating direction: the reply rests on
  // the generates: conclusion of furious's derivation — a cycle-
  // neighbour over attested legs, at 0.9 × 0.85 support.
  assert.deepEqual(t2.trace.pricing, {
    weakestTier: "established",
    support: 0.765,
    ceiling: "lightly-qualified",
    level: "qualified",
    declined: false,
  });
  const w = newSession();
  const [wq] = run(w, SCENARIOS[2].turns);
  assert.deepEqual(wq.trace.pricing, {
    weakestTier: "attested",
    support: 1,
    ceiling: "plain",
    level: "plain",
    declined: false,
  }, "the winter path prices at plain-assertion strength, as §3's worked shape says");
});

test("trace: §9.3's flag names the steering branch's basis", () => {
  const s = newSession();
  const [a1, a2, a3] = run(s, SCENARIOS[0].turns);
  assert.equal(a1.trace.generatingMargin, undefined, "no cycle relation steered the event turn");
  assert.equal(a2.trace.generatingMargin, true, "the generating follow exists solely because a generating relation holds");
  assert.equal(a3.trace.generatingMargin, false, "the vented event is met from the restraining side — a controlling basis");
  const w = newSession();
  const [, w2] = run(w, SCENARIOS[1].turns);
  assert.equal(w2.trace.generatingMargin, false, "the controlling branch addresses the restrainer");
  const q = newSession();
  const [wq] = run(q, SCENARIOS[2].turns);
  assert.equal(wq.trace.generatingMargin, undefined, "the shared-prior answer has no cycle arbitration to audit");
});

/* ---------------- R0 acceptance: identical replies ---------------- */

// Captured from the unmodified tree (scenario runner over dist)
// before any R0 edit; R0 changes no reply behaviour. R1.5 note:
// the winter-cold entries below are the ONE authorised change
// since — all three turns changed origin there (the probe's
// season degree-profile hand rendering → the planner's
// generated reply graph), which R1.5's gate permits and
// docs/ansci/transcripts/T-R1.5-results.md itemises with
// before/after. R2 note: the "Is summer hot?" entry changed
// origin once more (single predication → the composed season
// set, §7.1/§8.7 S13), itemised in
// docs/ansci/transcripts/T-R2-results.md. Normalcy-arc note
// (2026-11-17): three further entries changed under the
// acknowledgement move (Part 3c) — a plain event telling with
// no open need and no gap now gets the plain receipt instead
// of the steering follow-up ("What was in it?" / "What goes
// in next?"): anger-news turn 1 and soup turns 1 and 3, each
// itemised inline below. Every other entry is byte-identical
// to the pre-R0 capture.
const EXPECTED_REPLIES: Record<string, string[]> = {
  "anger-news": [
    // Normalcy arc: was "You heard the news. What was in it?" —
    // a plain telling, acknowledged.
    "Ok. Noted.",
    "You were furious when you heard the news. What did you say when you heard the news?",
    "You shouted at him. Now that it's out — what would help you settle?",
  ],
  "worry-sleep": [
    "You can't sleep. What's on your mind when you lie awake?",
    "You couldn't sleep, and you were worried. What is the worry about? That seems to be the thing holding the sleep back.",
  ],
  "winter-cold": [
    // R1.5: generated from the plan's reply graph — the bare
    // conclusion plus the causal subordinate built from the
    // derivation's degree ("most fully"), where the probe's
    // hand rendering dressed the same content in a relative
    // clause the generator cannot build.
    "Winter is cold, because it is most fully cold.",
    // R1.5: generated from the plan's reply graph, the degree
    // carried as a modulator — sentence-initial capitalisation
    // is the generator's, as R1's results anticipated.
    // R2: the season question now composes the profile set
    // (§7.1/§8.7 S13) — summer's light-aspect quality joins the
    // asked one in a single composed reply graph. Itemised in
    // docs/ansci/transcripts/T-R2-results.md.
    "Summer is most fully hot, and it is most fully bright.",
    "Winter is dark, because it is most fully dark.",
  ],
  soup: [
    // Normalcy arc: was "You made the soup. What goes in
    // next?" — a plain telling, acknowledged (the food closure
    // no longer asks after every telling).
    "Ok. Noted.",
    "The soup needs more salt. How does it taste so far?",
    // Normalcy arc: was "You put the salt in the soup. What
    // goes in next?" — a fully specified telling, acknowledged.
    // Recognition programme R2 (2026-11-19): the plain
    // acknowledgement is now the recognition receipt — the
    // telling established a recorded event with its object
    // filled, so the receipt shows it. Itemised here; no
    // other entry in the four scenarios changes (their
    // telling turns are first turns, questions, or steering
    // replies — none is a bare acknowledgement over
    // registrable content).
    // X programme X1 (2026-11-19): the receipt appends the
    // one link the record holds — turn 2's need event shares
    // the put event's content lemma 'salt' and is a different
    // event, not a re-telling, so the link renders it under
    // attribution. Itemised here, in the same manner.
    "Ok. You put the salt in the soup. You told me the soup needed the salt.",
  ],
};

test("R0 acceptance: the four scenarios' reply text is identical to before R0, except the itemised R1.5 winter-cold origin changes, R2's itemised summer set change, the Normalcy arc's itemised acknowledgement changes, the recognition programme's itemised receipt change, and the X programme's itemised receipt-link change", () => {
  for (const scenario of SCENARIOS) {
    const s = newSession();
    const replies = run(s, scenario.turns).map((r) => r.reply);
    assert.deepEqual(replies, EXPECTED_REPLIES[scenario.name], `${scenario.name} replies changed beyond the recorded exceptions`);
  }
});
