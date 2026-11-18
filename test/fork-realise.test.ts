/**
 * fork-realise.test.ts — slice R1.5 of the reply-planning
 * programme: closing the generator-realisation gaps R1
 * recorded (docs/fork/transcripts/T-R1-results.md, G1–G3).
 *
 * Connective-layer work (design note §4): the ontology
 * decides content, stance and strength; this slice teaches
 * the generator to SAY what the planner decided. Pins:
 *  - G3: every pricing level (§9.2) is spoken distinctly from
 *    a reply graph — plain bare, lightly-qualified hedged,
 *    qualified under "may", possibility under "might" — and
 *    a modal state on a VERB root is realised, not dropped
 *    ("You would go." no longer generates as "You go.");
 *  - G1: a degree modulator on an EN predicate graph is
 *    realised (the ZH predicate path's degree reading, ported);
 *    the plan's degree grades surface as slightly / fully /
 *    most fully;
 *  - G2: a reply graph carrying a causal subordinate (a
 *    'links' edge marked "because") generates the
 *    because-form;
 *  - the surface ban covers every new form: no element,
 *    polarity or cycle vocabulary in any of them.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generate } from "../src/fork/generate";
import { planPredication } from "../src/fork/plan";
import { cycleOf, type MeaningNode, type NodeStates, type ParsedSentence } from "../src/fork/sentence";
import { newSession } from "../src/fork/session";
import { processTurn } from "../src/fork/turn";
import { SCENARIOS } from "../src/fork/scenarios";

/** The surface ban, extended to the cycle words the task names. */
const LEAK = /\b(wood|fire|earth|metal|wuxing|yin|yang|elements?|generating|controlling)\b/i;

const SALT = {
  subject: { lemma: "salt", form: "salt", det: "the", person: "3sg" },
  qualityLemma: "cold",
  derivationPath: "salt —HAS_ELEMENT {food} (0.90)→ Water —POLARITY_OF→ Yin —HAS_QUALITY→ cold",
};

test("realise: the four spoken levels are four distinct surfaces", () => {
  const plain = planPredication({ ...SALT, support: 0.9, weakestTier: "attested" });
  const lightly = planPredication({ ...SALT, support: 0.9, weakestTier: "established" });
  const qualified = planPredication({ ...SALT, support: 0.8, weakestTier: "derived" });
  const possibility = planPredication({ ...SALT, support: 0.5, weakestTier: "derived" });
  const surfaces = [plain, lightly, qualified, possibility].map((o) => (o.kind === "graph" ? o.sentence : o.kind));
  assert.deepEqual(surfaces, [
    "The salt is cold.",
    "The salt is likely cold.",
    "The salt may be cold.",
    "The salt might be cold.",
  ]);
  assert.equal(new Set(surfaces).size, 4, "no level borrows a neighbour's form");
});

test("realise: degree grades on an EN predicate graph (G1)", () => {
  const faint = planPredication({ ...SALT, support: 0.9, weakestTier: "attested", degree: "faint" });
  const strong = planPredication({ ...SALT, support: 0.9, weakestTier: "attested", degree: "strong" });
  const strongest = planPredication({ ...SALT, support: 0.9, weakestTier: "attested", degree: "strongest" });
  assert.equal(faint.kind === "graph" && faint.sentence, "The salt is slightly cold.");
  assert.equal(strong.kind === "graph" && strong.sentence, "The salt is fully cold.");
  assert.equal(strongest.kind === "graph" && strongest.sentence, "The salt is most fully cold.");
});

test("realise: the generator reads a degree modulator on a hand-built predicate graph", () => {
  // The generator-level pin, independent of the planner: a
  // 'modulates' node on an EN predicate root surfaces before
  // the complement — the reading the ZH predicate path has
  // always made, now on the EN path.
  const subject: MeaningNode = { id: "s", lemma: "winter", form: "winter", syntacticElement: "Earth" };
  const root: MeaningNode = {
    id: "q", lemma: "cold", form: "cold", syntacticElement: "Fire", role: "predicate",
    states: { copulaTense: "present", mood: "indicative", subjectPerson: "3sg" },
  };
  const deg: MeaningNode = { id: "d", lemma: "slightly", form: "slightly", syntacticElement: "Water" };
  const graph: ParsedSentence = {
    meaning: {
      nodes: [subject, root, deg],
      edges: [
        { from: "s", to: "q", relation: "predicate", cycle: cycleOf("Earth", "Fire") },
        { from: "d", to: "q", relation: "modulates", cycle: cycleOf("Water", "Fire") },
      ],
      rootId: "q",
      entryElement: "Fire",
    },
    connective: { language: "en", tokens: [], next: [], spans: [] },
    realizes: {},
    scopeAttachments: [],
  };
  assert.equal(generate(graph), "Winter is slightly cold.");
});

test("realise: qualification and degree compose — hedge scopes over degree, modal carries both", () => {
  const hedged = planPredication({ ...SALT, support: 0.5, weakestTier: "attested", degree: "strongest" });
  assert.equal(hedged.kind === "graph" && hedged.sentence, "The salt is likely most fully cold.");
  const modal = planPredication({ ...SALT, support: 0.5, weakestTier: "derived", degree: "strongest" });
  assert.equal(modal.kind === "graph" && modal.sentence, "The salt might be most fully cold.");
});

function verbGraph(states: NodeStates): ParsedSentence {
  const agent: MeaningNode = { id: "a", lemma: "you", form: "you", syntacticElement: "Earth", role: "agent" };
  const root: MeaningNode = { id: "v", lemma: "go", form: "go", syntacticElement: "Wood", role: "verb", states };
  return {
    meaning: {
      nodes: [root, agent],
      edges: [{ from: "v", to: "a", relation: "agent", cycle: cycleOf("Wood", "Earth") }],
      rootId: "v",
      entryElement: "Wood",
    },
    connective: { language: "en", tokens: [], next: [], spans: [] },
    realizes: {},
    scopeAttachments: [],
  };
}

test("realise: a modal state on a verb clause is spoken, not dropped (G3, verb-clause half)", () => {
  assert.equal(generate(verbGraph({ modal: "would", tense: "present", subjectPerson: "2", mood: "indicative" })), "You would go.");
  assert.equal(generate(verbGraph({ modal: "would", negated: true, tense: "present", subjectPerson: "2", mood: "indicative" })), "You would not go.");
  assert.equal(
    generate(verbGraph({ modal: "would", aspect: { perfect: true }, tense: "present", subjectPerson: "2", mood: "indicative" })),
    "You would have gone.",
  );
  // And the unmodalised clause is unchanged.
  assert.equal(generate(verbGraph({ tense: "past", subjectPerson: "2", mood: "indicative" })), "You went.");
});

test("realise: the wired sites speak from the plan (T-R1's three failed turns)", () => {
  const s = newSession();
  const t1 = processTurn(s, "Is winter cold?");
  // RE-PIN (the Normalcy arc, 2026-11-17): this turn no longer
  // reaches a wired plan site — 'cold' is winter's classifying
  // quality, so the definitional answer (Part 3b) answers it,
  // hand-worded by design (the probe's wording, citing the
  // definition). The remaining turns below still pin the
  // wired sites speaking from the plan.
  assert.equal(t1.reply, "That's its definition: winter is cold.");
  assert.equal(t1.trace.wordingNotDerived, true, "the definitional answer is the probe's wording, not a generated plan");
  assert.equal(t1.trace.definitionalAnswer?.quality, "cold");
  const t3 = processTurn(s, "Why is winter cold?");
  assert.equal(t3.reply, "Winter is cold, because it is most fully cold.");
  assert.equal(t3.trace.wordingNotDerived, false);
  const soup = processTurn(newSession(), "Is the soup cold?");
  assert.equal(soup.reply, "The soup may be cold.");
  assert.equal(soup.trace.wordingNotDerived, false);
});

test("realise: no new surface form names the ontology (leak scan)", () => {
  const forms: string[] = [];
  for (const o of [
    planPredication({ ...SALT, support: 0.9, weakestTier: "attested" }),
    planPredication({ ...SALT, support: 0.9, weakestTier: "established" }),
    planPredication({ ...SALT, support: 0.8, weakestTier: "derived" }),
    planPredication({ ...SALT, support: 0.5, weakestTier: "derived" }),
    planPredication({ ...SALT, support: 0.9, weakestTier: "attested", degree: "faint" }),
    planPredication({ ...SALT, support: 0.9, weakestTier: "attested", degree: "strong" }),
    planPredication({ ...SALT, support: 0.9, weakestTier: "attested", degree: "strongest" }),
    planPredication({ ...SALT, support: 0.9, weakestTier: "attested", causalDemanded: true, degree: "strongest" }),
    planPredication({ ...SALT, support: 0.5, weakestTier: "attested", degree: "strongest" }),
  ]) {
    assert.equal(o.kind, "graph");
    if (o.kind === "graph") forms.push(o.sentence);
  }
  forms.push(generate(verbGraph({ modal: "would", tense: "present", subjectPerson: "2", mood: "indicative" })));
  for (const scenario of SCENARIOS) {
    const s = newSession();
    for (const t of scenario.turns) forms.push(processTurn(s, t).reply);
  }
  assert.ok(forms.length >= 20, "the scan covers the new forms and every scripted reply");
  for (const f of forms) assert.ok(!LEAK.test(f), `reply leaks ontology vocabulary: ${f}`);
});
