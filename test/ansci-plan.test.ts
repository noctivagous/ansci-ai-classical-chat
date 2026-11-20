/**
 * ansci-plan.test.ts — slice R1 of the reply-planning programme
 * (design note §2/§5/§9.2/§10): the planner transform.
 *
 * Pins, at unit level:
 *  - a plain-priced derivation becomes a reply graph in the
 *    parser's own record type, and the generator realises it
 *    as the bare predication;
 *  - a derivation priced below the floor yields the priced
 *    decline, its ground naming the support shortfall;
 *  - the qualified levels (lightly-qualified, qualified,
 *    possibility) are each spoken at their own strength from
 *    the reply graph (R1.5 closed gap G3: the qualification
 *    rides as states the generator realises — a hedge
 *    modulator, the modal states "may" / "might");
 *  - a demanded causal form (a why-question, §7.2 policy (a))
 *    is built from the derivation's degree content (R1.5,
 *    gap G2); demanded of a derivation with no degree, it
 *    remains unrealisable and is not passed off as a bare
 *    conclusion;
 *  - the turn-level wiring: a planned question turn carries
 *    the serialised reply graph in its trace and clears the
 *    wording-not-derived record.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { planPredication, serialiseReplyGraph } from "../src/ansci/plan";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";

const SALT = {
  subject: { lemma: "salt", form: "salt", det: "the", person: "3sg" },
  qualityLemma: "cold",
  derivationPath: "salt —HAS_ELEMENT {food} (0.90)→ Water —POLARITY_OF→ Yin —HAS_QUALITY→ cold",
};

test("plan: a plain-priced derivation builds a reply graph the generator realises as the bare predication", () => {
  const out = planPredication({ ...SALT, support: 0.9, weakestTier: "attested" });
  assert.equal(out.kind, "graph");
  if (out.kind !== "graph") return;
  assert.equal(out.sentence, "The salt is cold.");
  assert.equal(out.level, "plain");
  assert.deepEqual(out.pricing, { weakestTier: "attested", support: 0.9, ceiling: "plain", level: "plain", declined: false });
  // The graph is the parser's own record type: subject node,
  // predicated quality as root, the declarative relation.
  const g = out.graph.meaning;
  assert.equal(g.rootId, "reply-predicate");
  assert.deepEqual(g.edges.map((e) => e.relation), ["predicate"]);
  assert.equal(g.nodes.find((n) => n.id === "reply-subject")?.lemma, "salt");
  assert.equal(g.nodes.find((n) => n.id === "reply-predicate")?.lemma, "cold");
  // The serialised trace form names nodes, edges and root.
  const ser = JSON.parse(serialiseReplyGraph(out.graph));
  assert.equal(ser.rootId, "reply-predicate");
  assert.equal(ser.edges[0].relation, "predicate");
});

test("plan: support below the floor is the priced decline, ground named with its numbers", () => {
  const out = planPredication({
    subject: { lemma: "pot", form: "pot", det: "the", person: "3sg" },
    qualityLemma: "cold",
    derivationPath: "pot —HAS_ELEMENT {food} (0.35)→ Water —POLARITY_OF→ Yin —HAS_QUALITY→ cold",
    support: 0.35,
    weakestTier: "derived",
  });
  assert.equal(out.kind, "declined");
  if (out.kind !== "declined") return;
  assert.equal(out.pricing.declined, true);
  assert.equal(out.pricing.level, "decline");
  assert.match(out.ground, /support 0\.35 is below the floor 0\.4/);
});

test("plan: each qualified level is spoken at its own strength, from the graph (R1.5, G3)", () => {
  // [tier, support, expected level, expected sentence, graph mark]
  const cases = [
    ["established", 0.9, "lightly-qualified", "The salt is likely cold.", "hedge"],
    ["derived", 0.8, "qualified", "The salt may be cold.", "may"],
    ["derived", 0.5, "possibility", "The salt might be cold.", "might"],
    ["attested", 0.5, "lightly-qualified", "The salt is likely cold.", "hedge"],
  ] as const;
  const sentences = new Set<string>();
  for (const [tier, support, level, sentence, mark] of cases) {
    const out = planPredication({ ...SALT, support, weakestTier: tier });
    assert.equal(out.kind, "graph", `${tier} @ ${support} is speakable since R1.5`);
    if (out.kind !== "graph") return;
    assert.equal(out.level, level);
    assert.equal(out.sentence, sentence);
    // Normalise away the qualification carrier (hedge adverb,
    // or modal + "be" for the copula) to compare conclusions.
    sentences.add(out.sentence.replace("is likely ", "is ").replace("may be ", "is ").replace("might be ", "is "));
    // The qualification is IN the graph, not in pasted wording:
    // a hedge modulator node, or the modal state on the root.
    const g = out.graph.meaning;
    const root = g.nodes.find((n) => n.id === g.rootId)!;
    if (mark === "hedge") {
      const hedge = g.nodes.find((n) => n.lemma === "likely");
      assert.ok(hedge, "the hedge is a node in the graph");
      assert.ok(g.edges.some((e) => e.from === hedge!.id && e.to === root.id && e.relation === "modulates"));
    } else {
      assert.equal(root.states?.modal, mark, "the modal state is on the predicate root");
    }
  }
  // The four cases are three distinct surfaces (the two
  // lightly-qualified cases coincide, as the table says they should).
  assert.equal(sentences.size, 1, "all cases predicate the same conclusion — only the strength differs");
});

test("plan: a demanded causal form is built from the derivation's degree (R1.5, G2)", () => {
  const out = planPredication({ ...SALT, support: 0.9, weakestTier: "attested", causalDemanded: true, degree: "strongest" });
  assert.equal(out.kind, "graph");
  if (out.kind !== "graph") return;
  assert.equal(out.sentence, "The salt is cold, because it is most fully cold.");
  // The graph carries the causal subordinate: a second
  // predication joined to the root by a 'links' edge whose
  // marker is the connective.
  const g = out.graph.meaning;
  const link = g.edges.find((e) => e.relation === "links");
  assert.ok(link, "the reply graph carries the causal join");
  assert.equal(link!.marker, "because");
  assert.equal(link!.from, g.rootId, "the join runs from the main predicate");
  const ser = JSON.parse(serialiseReplyGraph(out.graph));
  assert.equal(ser.edges.find((e: { relation: string }) => e.relation === "links")?.marker, "because", "the trace's graph names the connective");
});

test("plan: a demanded causal form with no degree content remains unrealisable, not passed off as a bare conclusion", () => {
  const out = planPredication({ ...SALT, support: 0.9, weakestTier: "attested", causalDemanded: true });
  assert.equal(out.kind, "unrealisable");
  if (out.kind !== "unrealisable") return;
  assert.match(out.reason, /carries no degree/);
  // The path still rides on the outcome, as the causal material.
  assert.equal(out.derivationPath, SALT.derivationPath);
});

test("turn wiring: a planned question turn speaks from the graph and names it in the trace", () => {
  const s = newSession();
  const r = processTurn(s, "Is the salt cold?");
  assert.equal(r.reply, "The salt is cold.");
  assert.equal(r.trace.wordingNotDerived, false, "the wording came from the plan's graph");
  assert.ok(r.trace.replyGraph, "the trace carries the reply graph");
  const g = JSON.parse(r.trace.replyGraph!);
  assert.equal(g.nodes.find((n: { lemma: string }) => n.lemma === "salt")?.det, "the", "the reply graph reuses the person's own subject node material");
  assert.deepEqual(r.trace.pricing, { weakestTier: "attested", support: 0.9, ceiling: "plain", level: "plain", declined: false });
  assert.match(r.trace.derivationPath ?? "", /salt —HAS_ELEMENT/);
});

test("turn wiring: a derived-tier question is spoken qualified, from the graph (R1.5)", () => {
  const s = newSession();
  const r = processTurn(s, "Is the soup cold?");
  // R1 pinned this turn to the probe's wording because the
  // generator could not realise the qualified level (gap G3).
  // Since R1.5 the planner speaks it: the modal state is in
  // the reply graph and the surface is the qualified form —
  // the conclusion is NOT asserted plainly (§9.2).
  assert.equal(r.reply, "The soup may be cold.");
  assert.equal(r.trace.wordingNotDerived, false, "the wording came from the plan's graph");
  assert.ok(r.trace.replyGraph, "the trace carries the reply graph");
  const g = JSON.parse(r.trace.replyGraph!);
  assert.equal(g.nodes.find((n: { id: string }) => n.id === "reply-predicate")?.states?.modal, "may");
  assert.equal(r.trace.pricing?.level, "qualified");
  assert.match(r.trace.planNote ?? "", /at qualified strength/);
});

test("turn wiring: turns with no derivation record their wording as not derived", () => {
  const s = newSession();
  const r = processTurn(s, "I read the book.");
  assert.equal(r.trace.wordingNotDerived, true);
  assert.equal(r.trace.pricing, undefined);
  assert.equal(r.trace.replyGraph, undefined);
});
