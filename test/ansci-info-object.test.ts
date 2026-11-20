/**
 * ansci-info-object.test.ts — the information-object envelope
 * build (2026-11-17).
 *
 * What travels the system is an ENVELOPE + CORE (info-object.ts):
 * the semantic object stays the unchanged descriptive core; the
 * envelope carries the act, provenance, confidence, the route
 * (units that handled it) and the NEEDS — named open slots, each
 * with what would discharge it. Units amend the envelope only.
 *
 * Pinned here:
 *  1. THE WALL — for the apples sequence and the airport
 *     sequence, stripping the envelope from each stored
 *     information object yields exactly the semantic object the
 *     PRE-ENVELOPE pipeline produced. Baseline: a stored fixture
 *     (test/fixtures/envelope-wall-baseline.json) captured from
 *     the code at main d41e3de2 BEFORE the envelope existed, by
 *     running the same sequences through processTurn and JSON
 *     round-tripping the stored person objects; both sides of
 *     the comparison go through the same JSON normalisation.
 *     A second, fixture-free pin: wrapping an assessUtterance
 *     core adds exactly one key (envelope) and stripping
 *     restores the core deep-equal.
 *  2. NEED LIFECYCLE — needs are open at assessment; the apples
 *     question's answer need is discharged by the ledger's
 *     answer ("You have two apples left."); a predication
 *     question's answer need is discharged by the Planner's
 *     reply object; a quantity flag leaves a reconciliation
 *     need SURVIVING (on the envelope, the trace and the
 *     surviving-needs view). The flag turn's own reply is
 *     hand-worded and authors no reply object (the standing
 *     slice-4 boundary), so "surviving needs carried on the
 *     reply object" is pinned where a reply object exists —
 *     the Hello probe's third situation.
 *  3. THE THREE-SITUATION HELLO PROBE — "Hello" in a fresh
 *     session, in a session with history, and in a session
 *     where the system's last turn asked an unanswered
 *     question: in all three the route is exactly Assessment →
 *     Session & Situation → Coherence → Planner (no shortcut),
 *     the reply is a Planner-authored reply object, and the
 *     situate needs' discharge evidence differs by situation —
 *     the anything-owed need surviving only in the third, and
 *     carried onto that reply object's envelope.
 *  4. PLACEMENT NEEDS — the airport sequences: a default-placed
 *     entity's placement need is seeded referencing the scene
 *     graph's own slot (the slot's only store); a later fill
 *     discharges the standing need across turns; a spatial
 *     inconsistency leaves its placement need surviving and
 *     present in the open-unknowns register's surviving view.
 *  5. A decline's surviving answer need IS the located decline.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { listOpenUnknowns, listSurvivingNeeds, newSession, type Session } from "../src/ansci/session";
import { processTurn, type TurnResult } from "../src/ansci/turn";
import { parse } from "../src/ansci/parse";
import { assessUtterance } from "../src/ansci/assess";
import {
  createInformationObject,
  informationOf,
  stripEnvelope,
  type InformationObject,
  type Need,
} from "../src/ansci/info-object";
import type { SemanticObject } from "../src/ansci/semantic-object";
import { enableWordnetLexicon } from "../src/ansci/wordnet-lex";

const FIXTURE = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "..", "test", "fixtures", "envelope-wall-baseline.json"), "utf8"),
) as { apples: unknown[]; airport: unknown[] };

function run(session: Session, turns: string[]): TurnResult[] {
  return turns.map((t) => processTurn(session, t));
}
function persons(session: Session): InformationObject[] {
  return session.objects.filter((o) => o.producer === "person") as InformationObject[];
}
function needOf(info: InformationObject, kind: Need["kind"]): Need {
  const need = info.envelope.needs.find((n) => n.kind === kind);
  assert.ok(need, `expected a ${kind} need on ${info.id}`);
  return need;
}
const roundTrip = (o: unknown): unknown => JSON.parse(JSON.stringify(o)) as unknown;

/* ---------------- 1. the wall ---------------- */

test("the wall: stripped cores deep-equal the pre-envelope baseline (apples)", () => {
  // Baseline regenerated 2026-11-18 for the ProblemSolving
  // router (owner's commission): each apples object now
  // carries the router's trail annotation — verified at
  // regeneration as the ONLY delta (33 added lines, nothing
  // else moved). The wall's claim is unchanged: wrapping
  // adds exactly the envelope, and the cores are otherwise
  // what the machinery produces.
  // Regenerated again 2026-11-18 for sealed-run mechanism 7
  // (the classification seam): the 'apple' node now carries
  // semanticElement Wood — the classification table's entry
  // reaching the node, as designed. Verified as the ONLY
  // delta (1 added line; the airport baseline is unchanged).
  const s = newSession();
  run(s, ["I have 5 apples.", "Sally bought 3 of them.", "How many do I have left?"]);
  const infos = persons(s);
  assert.equal(infos.length, 3);
  for (const info of infos) assert.ok(info.envelope, "the object travels with an envelope");
  assert.deepEqual(infos.map((o) => roundTrip(stripEnvelope(o))), FIXTURE.apples);
});

test("the wall: stripped cores deep-equal the pre-envelope baseline (airport)", () => {
  // Note (2026-11-18, §6 adverb restoration): 'between' keeps
  // this baseline by design — the parser leaves a between-node
  // in the graph and senses-scening builds its landmark
  // relation from it, so the adverb derivation does not claim
  // the token (see enItems). The baseline stands unchanged.
  const s = newSession();
  run(s, ["I waited at the airport.", "I went to the fountain between the bathrooms."]);
  const infos = persons(s);
  assert.equal(infos.length, 2);
  for (const info of infos) assert.ok(info.envelope, "the object travels with an envelope");
  assert.deepEqual(infos.map((o) => roundTrip(stripEnvelope(o))), FIXTURE.airport);
});

test("the wall: wrapping adds exactly the envelope key; stripping restores the core", () => {
  const s = newSession();
  const parsed = parse("The soup is hot.", "en");
  const [core] = assessUtterance(parsed, { turn: 1, surface: "The soup is hot.", session: s });
  const before = roundTrip(core) as Record<string, unknown>;
  const info = createInformationObject(core);
  assert.deepEqual(Object.keys(info).sort(), [...Object.keys(before), "envelope"].sort());
  assert.deepEqual(roundTrip(stripEnvelope(info)), before);
  // A core with no envelope strips to itself.
  const bare = { id: "x" } as unknown as SemanticObject;
  assert.equal(stripEnvelope(bare), bare);
  assert.equal(informationOf(bare), undefined);
});

/* ---------------- 2. need lifecycle ---------------- */

test("needs are open at assessment: a question's answer need, a greeting's situate needs", () => {
  const s = newSession();
  const [q] = assessUtterance(parse("Is the soup hot?", "en"), {
    turn: 1,
    surface: "Is the soup hot?",
    session: s,
  });
  const qInfo = createInformationObject(q);
  assert.equal(qInfo.envelope.act, "question");
  assert.deepEqual(qInfo.envelope.route, ["lpu/semantic-assessment", "lpu/senses-scening-unit"]);
  const answer = needOf(qInfo, "answer");
  assert.equal(answer.status, "open");
  assert.equal(answer.slot, "whether the questioned predication holds");

  const [g] = assessUtterance(parse("Hello.", "en"), { turn: 1, surface: "Hello.", session: s });
  const gInfo = createInformationObject(g);
  assert.equal(gInfo.envelope.act, "greeting");
  assert.deepEqual(
    gInfo.envelope.needs.map((n) => [n.kind, n.status]),
    [
      ["situate-who", "open"],
      ["situate-where", "open"],
      ["situate-owed", "open"],
    ],
  );
});

test("need lifecycle: the apples question's answer need is discharged by the ledger's answer", () => {
  const s = newSession();
  const [, , r3] = run(s, ["I have 5 apples.", "Sally bought 3 of them.", "How many do I have left?"]);
  assert.equal(r3.reply, "You have two apples left.");
  const qInfo = persons(s)[2];
  const answer = needOf(qInfo, "answer");
  assert.equal(answer.status, "discharged");
  assert.equal(answer.dischargedBy, "lpu/quantification-language-unit");
  assert.match(answer.evidence ?? "", /two apples/);
  assert.equal(qInfo.envelope.route[qInfo.envelope.route.length - 1], "lpu/quantification-language-unit");
  assert.equal(r3.trace.survivingNeeds, undefined);
});

test("need lifecycle: a predication question's answer need is discharged by the record answer", () => {
  // RE-PIN (the Normalcy arc, Part 3a): the speaker stated the
  // asked predication, so the record answer (the said-so move)
  // answers it — hand-worded, no Planner reply object — and
  // the settlement discharges the answer need on the record's
  // evidence, the discharger being Session & Situation, whose
  // record settled the question. Planner-discharged answers
  // stand elsewhere (the derivation routes).
  const s = newSession();
  // Fixture restored (property-axes slice, 2026-11-18): C7
  // swapped the soup telling for the garden's, on the
  // since-removed cross-axis derivation (Part H); the soup
  // telling stands in the record to be said-so'd from again.
  // The claim under test — a record answer discharges the
  // answer need, discharged by Session & Situation — is
  // unchanged.
  const [, r2] = run(s, ["The soup is hot.", "Is the soup hot?"]);
  assert.equal(r2.reply, "You said so.");
  assert.equal(r2.trace.replyObject, undefined, "the record answer is hand-worded — no reply object");
  const answer = needOf(persons(s)[1], "answer");
  assert.equal(answer.status, "discharged");
  assert.equal(answer.dischargedBy, "session-and-situation");
});

test("need lifecycle: a quantity flag leaves a reconciliation need surviving", () => {
  const s = newSession();
  const [, r2] = run(s, ["I have 5 apples.", "Sally bought 7 of them."]);
  const flagInfo = persons(s)[1];
  const need = needOf(flagInfo, "reconciliation");
  assert.equal(need.slot, "you.apple");
  assert.equal(need.status, "surviving");
  assert.match(need.evidence ?? "", /exceeds the tracked amount \(5\)/);
  // Priced onto the trace and readable in the register's
  // surviving view. (The flag turn's reply is hand-worded —
  // no reply object exists on that turn; carrying onto a
  // reply object is pinned in the Hello probe below.)
  assert.deepEqual(r2.trace.survivingNeeds, [{ kind: "reconciliation", slot: "you.apple" }]);
  const view = listSurvivingNeeds(s);
  assert.equal(view.length, 1);
  assert.equal(view[0].kind, "reconciliation");
  assert.equal(view[0].objectId, flagInfo.id);
  assert.equal(view[0].turn, 2);
});

/* ---------------- 3. the three-situation Hello probe ---------------- */

const HELLO_ROUTE = [
  "lpu/semantic-assessment",
  "session-and-situation",
  "coherence/coherence-analysis",
  "reasoning/planner",
];

function assertHelloPath(s: Session, r: TurnResult): InformationObject {
  const info = persons(s)[persons(s).length - 1];
  assert.deepEqual(info.envelope.route, HELLO_ROUTE, "the route traverses the whole network — no shortcut");
  assert.ok(r.trace.replyObject, "the reply is a Planner-authored reply object");
  const replyObject = s.objects.find((o) => o.id === r.trace.replyObject?.id);
  assert.ok(replyObject);
  assert.equal(replyObject.act.force, "return greeting");
  return info;
}

test("hello probe (i): a fresh session's first turn", () => {
  const s = newSession();
  const [r] = run(s, ["Hello."]);
  assert.equal(r.reply, "Hello.");
  const info = assertHelloPath(s, r);
  const who = needOf(info, "situate-who");
  assert.equal(who.status, "discharged");
  assert.equal(who.dischargedBy, "session-and-situation");
  assert.match(who.evidence ?? "", /no prior record/);
  assert.match(needOf(info, "situate-where").evidence ?? "", /opens here/);
  assert.equal(needOf(info, "situate-owed").status, "discharged");
  const replyObject = s.objects.find((o) => o.id === r.trace.replyObject?.id) as InformationObject;
  assert.deepEqual(replyObject.envelope.needs, [], "nothing survived to carry");
});

test("hello probe (ii): a session with prior history — the situation reading differs", () => {
  const s = newSession();
  const [, r] = run(s, ["The soup is hot.", "Hello."]);
  assert.equal(r.reply, "Hello.");
  const info = assertHelloPath(s, r);
  const who = needOf(info, "situate-who");
  assert.equal(who.status, "discharged");
  assert.match(who.evidence ?? "", /stands in the session record: 1 prior utterance/);
  assert.match(needOf(info, "situate-where").evidence ?? "", /already stands at turn 2/);
  assert.equal(needOf(info, "situate-owed").status, "discharged");
});

test("hello probe (iii): a system question stands unanswered — the owed need survives onto the reply object", () => {
  enableWordnetLexicon(true); // the dashboard's standing state; also this module's default
  const s = newSession();
  const [r1, r2] = run(s, ["I found rest.", "Hello."]);
  assert.equal(r1.reply, "Do you mean rest as in sleep, or as in relief?");
  assert.equal(r2.reply, "Hello.");
  const info = assertHelloPath(s, r2);
  assert.equal(needOf(info, "situate-who").status, "discharged");
  const owed = needOf(info, "situate-owed");
  assert.equal(owed.status, "surviving", "no greeting discharges a standing debt");
  assert.match(owed.evidence ?? "", /clarification question/);
  assert.deepEqual(r2.trace.survivingNeeds, [{ kind: "situate-owed", slot: owed.slot }]);
  // Carried onto the reply object's envelope — data for the
  // reply decision, recorded on the reply itself.
  const replyObject = s.objects.find((o) => o.id === r2.trace.replyObject?.id) as InformationObject;
  assert.equal(replyObject.envelope.needs.length, 1);
  assert.equal(replyObject.envelope.needs[0].kind, "situate-owed");
  assert.equal(replyObject.envelope.needs[0].status, "surviving");
  assert.deepEqual(listSurvivingNeeds(s).map((n) => n.kind), ["situate-owed"]);
});

/* ---------------- 4. placement needs ---------------- */

test("placement needs: seeded for default-placed entities, referencing the scene graph's slots; a fill discharges across turns", () => {
  const s = newSession();
  run(s, ["I waited at the airport.", "I went to the fountain between the bathrooms."]);
  const scene = s.scenes[0];
  const t2 = persons(s)[1];
  const placements = t2.envelope.needs.filter((n) => n.kind === "placement");
  assert.deepEqual(
    placements.map((n) => n.slot).sort(),
    ["bathroom-1.exact-location", "bathroom-2.exact-location"],
  );
  for (const need of placements) {
    assert.deepEqual(need.ref, { sceneId: scene.id, of: need.slot.split(".")[0], slotKind: "exact-location" });
    // One source of truth: the referenced slot stands on the
    // scene graph itself, still open.
    const slot = scene.unknowns.find((u) => u.of === need.ref?.of && u.kind === need.ref?.slotKind);
    assert.ok(slot, "the referenced slot is the scene graph's own");
    assert.equal(slot.status, "open");
  }
  // The turn-1 envelope's airport.city need stands (surviving
  // its own turn's route) until the fill arrives at turn 4.
  const t1 = persons(s)[0];
  const city = t1.envelope.needs.find((n) => n.kind === "placement" && n.slot === "airport.city");
  assert.ok(city);
  assert.equal(city.status, "surviving");
  run(s, ["I went to the bathrooms.", "The airport is in Chicago."]);
  assert.equal(city.status, "discharged");
  assert.equal(city.dischargedBy, "lpu/senses-scening-unit");
  assert.match(city.evidence ?? "", /filled at turn 4 with 'chicago'/);
  assert.ok(!listOpenUnknowns(s).some((u) => u.of === "airport"));
});

test("placement needs: a spatial inconsistency's need survives and appears in the register's surviving view", () => {
  const s = newSession();
  run(s, ["I waited at the airport.", "The airport is in Chicago.", "Chicago is in the airport."]);
  const t3 = persons(s)[2];
  const need = t3.envelope.needs.find((n) => n.kind === "placement" && n.slot === "chicago.spatial-consistency");
  assert.ok(need, "the inconsistency seeded a placement need on the turn's envelope");
  assert.equal(need.status, "surviving");
  assert.deepEqual(need.ref, { sceneId: s.scenes[0].id, of: "chicago", slotKind: "spatial-consistency" });
  // The register's derived view reads it off the stream…
  const view = listSurvivingNeeds(s).filter((n) => n.slot === "chicago.spatial-consistency");
  assert.equal(view.length, 1);
  assert.equal(view[0].objectId, t3.id);
  // …while the slot itself lives only on the scene graph.
  assert.ok(listOpenUnknowns(s).some((u) => u.of === "chicago" && u.kind === "spatial-consistency" && u.status === "open"));
});

/* ---------------- 5. the located decline ---------------- */

test("a decline's surviving answer need is the located decline", () => {
  const s = newSession();
  const [r] = run(s, ["How many bananas do I have?"]);
  assert.ok(r.trace.declineReason, "the turn declines");
  const info = persons(s)[0];
  const answer = needOf(info, "answer");
  assert.equal(answer.status, "surviving");
  assert.deepEqual(r.trace.survivingNeeds, [{ kind: "answer", slot: answer.slot }]);
});
