/**
 * ansci-compose.test.ts — slice R2 of the reply-planning programme
 * (design note §7.1, §8.7 S13, §10): composition of conclusions.
 *
 * Pins, at unit level and at the wired turn site:
 *  - BOTH orderings are computed over the spoken members and
 *    recorded on the outcome — support order and relation-to-
 *    newest-state order — over conclusions harvested from the
 *    real join (derive() over salt), where they genuinely
 *    disagree (T-R2 scenario R2-2);
 *  - the active order is DEFAULT_ORDER, one named data constant
 *    ("support"); passing the other order as data flips the
 *    spoken order without any other change;
 *  - a member priced below the floor is dropped from the
 *    composition with the drop recorded (its pricing and its
 *    ground), and the composition still speaks; every member
 *    below the floor is the decline, its ground naming the
 *    shortfalls;
 *  - a mixed-strength set keeps each member's own qualification
 *    in the one graph — hedge modulator on the lightly-qualified
 *    predications, modal state on the qualified ones;
 *  - set presentation: the shared subject is one node, the
 *    members are predications joined by 'links' edges marked
 *    "and";
 *  - conclusions over differing subjects are an unrealisable
 *    outcome, named — composition is over one subject (S13);
 *  - the turn-level wiring: a season question composes its
 *    profile set with a composition record in the trace; a
 *    why-question keeps the single-conclusion causal path; a
 *    subject with no profile keeps the R1 single path;
 *  - the leak scan over every composed surface.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ORDER, planComposition, relationKindTo, type PricedConclusion } from "../src/ansci/plan";
import { buildForkGraph, derive } from "../src/ansci/join";
import { tiersOnPath, weakestTier } from "../src/ansci/pricing";
import { newSession } from "../src/ansci/session";
import { processTurn } from "../src/ansci/turn";

const LEAK = /\b(wood|fire|earth|metal|wuxing|yin|yang|element|elements|five elements)\b/i;

const SALT_SUBJECT = { lemma: "salt", form: "salt", det: "the", person: "3sg" };

/** The R2-2 member set: real conclusions harvested from the
 *  join over salt (the color/taste rows of the correspondence
 *  and generating neighbour sets), plus the disclosed fixture
 *  member below the floor. */
function saltConclusions(): PricedConclusion[] {
  const g = buildForkGraph();
  const d = derive(g, "salt");
  const picked = d.conclusions.filter(
    (c) =>
      (c.category === "color" || c.category === "taste" || c.category === "generates:color" || c.category === "generates:taste"),
  );
  const conclusions: PricedConclusion[] = picked.map((c) => ({
    subject: SALT_SUBJECT,
    qualityLemma: c.label,
    element: c.element,
    derivationPath: c.path,
    support: c.confidence,
    weakestTier: weakestTier(tiersOnPath(d, c))!,
  }));
  conclusions.push({
    subject: SALT_SUBJECT,
    qualityLemma: "cold",
    element: "Water",
    derivationPath: "fixture: salt —HAS_ELEMENT→ Water (0.35, fixture) —POLARITY_OF→ Yin —HAS_QUALITY→ cold",
    support: 0.35,
    weakestTier: "derived",
  });
  return conclusions;
}

test("compose: both orderings are computed over real join conclusions — and they disagree (T-R2 R2-2)", () => {
  const out = planComposition({ conclusions: saltConclusions(), newestStateElement: "Wood" });
  assert.equal(out.kind, "graph");
  if (out.kind !== "graph") return;
  // Support order: 0.9 before 0.765, ties in enumeration order.
  assert.deepEqual(out.supportOrder, ["black", "salty", "green", "sour"]);
  // Relation order against a Wood newest state: the Wood members
  // (same element) lead; the Water members (generating) follow.
  assert.deepEqual(out.relationOrder, ["green", "sour", "black", "salty"]);
  assert.notDeepEqual(out.supportOrder, out.relationOrder, "the two orderings genuinely disagree on this material");
});

test("compose: the active order is the DEFAULT_ORDER data constant, and switching it is a data change", () => {
  assert.equal(DEFAULT_ORDER, "support", "§7.1: support order is the default");
  const byDefault = planComposition({ conclusions: saltConclusions(), newestStateElement: "Wood" });
  assert.equal(byDefault.kind, "graph");
  if (byDefault.kind !== "graph") return;
  assert.equal(byDefault.activeOrder, DEFAULT_ORDER);
  assert.equal(byDefault.sentence, "The salt is likely black, and it is likely salty, and it may be green, and it may be sour.");
  const byRelation = planComposition({ conclusions: saltConclusions(), newestStateElement: "Wood", order: "relation" });
  assert.equal(byRelation.kind, "graph");
  if (byRelation.kind !== "graph") return;
  assert.equal(byRelation.activeOrder, "relation");
  // Same members, same prices — only the spoken order changed.
  assert.equal(byRelation.sentence, "The salt may be green, and it may be sour, and it is likely black, and it is likely salty.");
  assert.deepEqual(byRelation.supportOrder, byDefault.supportOrder);
  assert.deepEqual(byRelation.relationOrder, byDefault.relationOrder);
});

test("compose: relation kinds follow the sense layer's precedence (same > generating > controlling > unrelated)", () => {
  assert.equal(relationKindTo("Wood", "Wood"), "same-element");
  assert.equal(relationKindTo("Wood", "Fire"), "generating", "Wood generates Fire");
  assert.equal(relationKindTo("Fire", "Wood"), "generating", "generating counts in either direction");
  assert.equal(relationKindTo("Wood", "Earth"), "controlling", "Wood controls Earth");
  assert.equal(relationKindTo("Earth", "Wood"), "controlling", "controlling counts in either direction (restraint asymmetry)");
  assert.equal(relationKindTo("Wood", "Metal"), "controlling", "Metal controls Wood — into the state also corroborates");
  assert.equal(relationKindTo("Wood", "Water"), "generating", "Water generates Wood");
});

test("compose: a below-floor member is dropped with the drop recorded, and the composition still speaks", () => {
  const out = planComposition({ conclusions: saltConclusions(), newestStateElement: "Wood" });
  assert.equal(out.kind, "graph");
  if (out.kind !== "graph") return;
  assert.equal(out.dropped.length, 1);
  assert.equal(out.dropped[0].qualityLemma, "cold");
  assert.equal(out.dropped[0].pricing.declined, true);
  assert.match(out.dropped[0].ground, /support 0\.35 is below the floor 0\.4/);
  // The dropped member is in neither spoken ordering and not in the graph.
  assert.ok(!out.supportOrder.includes("cold") && !out.relationOrder.includes("cold"));
  assert.ok(!out.graph.meaning.nodes.some((n) => n.lemma === "cold"));
  assert.equal(out.members.length, 4, "the other members are not dragged down");
});

test("compose: every member below the floor — or none offered — is the decline, ground named", () => {
  const fixture = saltConclusions().pop()!;
  const allLow = planComposition({ conclusions: [fixture] });
  assert.equal(allLow.kind, "declined");
  if (allLow.kind === "declined") assert.match(allLow.ground, /every conclusion offered is below the floor/);
  const empty = planComposition({ conclusions: [] });
  assert.equal(empty.kind, "declined");
  if (empty.kind === "declined") assert.match(empty.ground, /no conclusions were offered/);
});

test("compose: a mixed-strength set keeps each member's own qualification in the one graph", () => {
  const out = planComposition({ conclusions: saltConclusions(), newestStateElement: "Wood" });
  assert.equal(out.kind, "graph");
  if (out.kind !== "graph") return;
  assert.deepEqual(
    out.members.map((m) => [m.qualityLemma, m.level]),
    [
      ["black", "lightly-qualified"],
      ["salty", "lightly-qualified"],
      ["green", "qualified"],
      ["sour", "qualified"],
    ],
  );
  const g = out.graph.meaning;
  const rootOf = (lemma: string) => g.nodes.find((n) => n.lemma === lemma && n.role === "predicate")!;
  // Lightly-qualified members: a hedge modulator on their predication, no modal.
  for (const lemma of ["black", "salty"]) {
    const root = rootOf(lemma);
    assert.equal(root.states?.modal, undefined);
    assert.ok(
      g.edges.some((e) => e.relation === "modulates" && e.to === root.id && g.nodes.find((n) => n.id === e.from)?.lemma === "likely"),
      `${lemma} carries the hedge`,
    );
  }
  // Qualified members: the modal state on their own predication root.
  for (const lemma of ["green", "sour"]) {
    assert.equal(rootOf(lemma).states?.modal, "may", `${lemma} carries its own modal`);
  }
});

test("compose: set presentation — one shared subject node, predications joined by 'links' edges marked 'and' (S13)", () => {
  const out = planComposition({ conclusions: saltConclusions(), newestStateElement: "Wood" });
  assert.equal(out.kind, "graph");
  if (out.kind !== "graph") return;
  const g = out.graph.meaning;
  assert.equal(g.nodes.filter((n) => n.lemma === "salt").length, 1, "the subject is one node, shared by every member");
  assert.equal(g.edges.filter((e) => e.relation === "predicate").length, 4, "one predication per member");
  const joins = g.edges.filter((e) => e.relation === "links");
  assert.equal(joins.length, 3, "consecutive predications are joined");
  assert.ok(joins.every((e) => e.marker === "and"));
  assert.equal(g.rootId, "reply-predicate", "the first spoken member is the root");
});

test("compose: conclusions over differing subjects are unrealisable, named — not silently split", () => {
  const [first] = saltConclusions();
  const other: PricedConclusion = { ...first, subject: { lemma: "soup", form: "soup", det: "the", person: "3sg" } };
  const out = planComposition({ conclusions: [first, other] });
  assert.equal(out.kind, "unrealisable");
  if (out.kind === "unrealisable") assert.match(out.reason, /one subject/);
});

test("turn wiring: a season question composes its profile set, both orderings in the trace", () => {
  // RE-PIN (the Normalcy arc, 2026-11-17): this test's scenario
  // was "Is winter cold?" — the asked quality is winter's
  // CLASSIFYING quality, so the definitional answer (Part 3b)
  // now preempts composition for it; that route is pinned in
  // the next test. The composing scenario here is the
  // non-classifying season question ("Is summer hot?" — 'hot'
  // is a synonym of the profile's filed 'warm', not the filed
  // name, so the Classification does not settle it by
  // definition and the composition runs).
  const s = newSession();
  const r = processTurn(s, "Is summer hot?");
  assert.equal(r.reply, "Summer is most fully hot, and it is most fully bright.");
  assert.equal(r.trace.wordingNotDerived, false);
  assert.ok(r.trace.replyGraph, "the trace carries the composed reply graph");
  const comp = r.trace.composition;
  assert.ok(comp, "the trace carries the composition record");
  assert.equal(comp!.activeOrder, "support");
  assert.deepEqual(comp!.supportOrder, ["hot", "bright"]);
  assert.deepEqual(comp!.relationOrder, ["hot", "bright"], "no earlier state stands in the record — the orders coincide, and both are recorded");
  assert.deepEqual(
    comp!.members.map((m) => [m.quality, m.pricing.level]),
    [
      ["hot", "plain"],
      ["bright", "plain"],
    ],
  );
  assert.match(comp!.members[1].derivationPath, /summer —ELEMENT_OF→ Fire —POLARITY_OF→ Yang —HAS_QUALITY→ bright/);
  assert.deepEqual(comp!.dropped, []);
  const g = JSON.parse(r.trace.replyGraph!);
  assert.equal(g.edges.filter((e: { relation: string }) => e.relation === "links")?.[0]?.marker, "and");
});

test("turn wiring: a classifying season question is answered definitionally — composition does not apply", () => {
  // The Normalcy arc (Part 3b): "Is winter cold?" asks whether
  // a kind has its classifying quality; NormalcyAssessment's
  // obviousness flag carries the determination and the reply
  // cites the definition. The flag is internal — the reply
  // carries no verdict about oddity.
  const s = newSession();
  const r = processTurn(s, "Is winter cold?");
  assert.equal(r.reply, "That's its definition: winter is cold.");
  assert.equal(r.trace.composition, undefined, "no composition stands behind a definitional answer");
  assert.equal(r.trace.definitionalAnswer?.subject, "winter");
  assert.equal(r.trace.definitionalAnswer?.quality, "cold");
  assert.deepEqual(r.trace.normalcy?.flags.map((f) => f.kind), ["obviousness"]);
});

test("turn wiring: the light aspect's classifying quality is answered definitionally too", () => {
  // RE-PIN (the Normalcy arc): was the composition ordering
  // pin for "Is autumn dark?" — 'dark' is autumn's classifying
  // quality for the light aspect (its profile is yin-dominant
  // there), so the definitional answer preempts composition
  // for this question as for winter/cold.
  const s = newSession();
  const r = processTurn(s, "Is autumn dark?");
  assert.equal(r.reply, "That's its definition: autumn is dark.");
  assert.equal(r.trace.composition, undefined);
  assert.equal(r.trace.definitionalAnswer?.quality, "dark");
});

test("turn wiring: a why-question keeps the single-conclusion causal path — composition does not apply", () => {
  const s = newSession();
  const r = processTurn(s, "Why is winter cold?");
  assert.equal(r.reply, "Winter is cold, because it is most fully cold.");
  assert.equal(r.trace.composition, undefined);
});

test("turn wiring: subjects with no profile keep the R1 single-conclusion path, unchanged", () => {
  const salt = processTurn(newSession(), "Is the salt cold?");
  assert.equal(salt.reply, "The salt is cold.");
  assert.equal(salt.trace.composition, undefined);
  const soup = processTurn(newSession(), "Is the soup cold?");
  assert.equal(soup.reply, "The soup may be cold.");
  assert.equal(soup.trace.composition, undefined);
});

test("compose: no composed surface names the ontology (leak scan)", () => {
  const forms: string[] = [];
  const out = planComposition({ conclusions: saltConclusions(), newestStateElement: "Wood" });
  if (out.kind === "graph") forms.push(out.sentence);
  const rel = planComposition({ conclusions: saltConclusions(), newestStateElement: "Wood", order: "relation" });
  if (rel.kind === "graph") forms.push(rel.sentence);
  const s = newSession();
  for (const t of ["Is winter cold?", "Is summer hot?", "Is autumn dark?", "Why is winter cold?"]) {
    forms.push(processTurn(s, t).reply);
  }
  assert.ok(forms.length >= 6);
  for (const f of forms) assert.ok(!LEAK.test(f), `reply leaks ontology vocabulary: ${f}`);
});
