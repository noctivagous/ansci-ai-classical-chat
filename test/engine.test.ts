/**
 * engine.test.ts — slice 2c acceptance, §6.5–§6.12: the OE-* cases,
 * the cycle operators, aspect-scoped classification (the treble/bass
 * non-conflict), graded polarity and turning points as seed data,
 * balance dynamics with the §6.8 honesty rule, correspondence
 * composition, and concept-level temporal reasoning at x0.8.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSeedGraph } from "../src/seed";
import { buildChatGraph, getDefaultExtract } from "../src/wordnet";
import {
  assessBalance,
  compareDegrees,
  compose,
  directClassifications,
  generatedBy,
  generates,
  restrainedBy,
  restrains,
  seasonBaseline,
  seasonDegreeProfile,
} from "../src/engine";
import { propagateGraph, statementsFor } from "../src/propagate";
import { findConflicts, TraceBuilder, type InterimConclusion } from "../src/thought";
import { answerIntent, type QueryIntent } from "../src/reason";
import { renderAnswer } from "../src/render";
import {
  createSession,
  graphStampFor,
  runTurn,
  type SessionState,
  type TurnResult,
} from "../src/router";

const graph = buildChatGraph();
const extract = getDefaultExtract();

function session(): SessionState {
  return createSession(graphStampFor(extract));
}
function turn(s: SessionState, q: string): TurnResult {
  return runTurn(graph, s, q, { extract, experienceDir: null });
}

test("§6.5 cycle operators over the seed's atomic cycle edges", () => {
  const seed = buildSeedGraph();
  assert.equal(generates(seed, "wood"), "fire");
  assert.equal(generates(seed, "water"), "wood");
  assert.equal(generatedBy(seed, "fire"), "wood");
  assert.equal(restrains(seed, "wood"), "earth");
  assert.equal(restrains(seed, "water"), "fire");
  assert.equal(restrainedBy(seed, "fire"), "water");
  assert.equal(restrainedBy(seed, "wood"), "metal");
});

test("§6.11 seed deltas: degree profiles (light+temperature), baselines, solstice turning points; later rows absent", () => {
  const seed = buildSeedGraph();
  const winter = seasonDegreeProfile(seed, "winter");
  assert.equal(winter?.aspects.light, 0.82);
  assert.equal(winter?.aspects.temperature, 0.85);
  assert.equal(winter?.source, "canonical-interpretive"); // §6.7: framework values, not measurements
  assert.equal(seasonDegreeProfile(seed, "summer")?.aspects.light, 0.18);
  assert.equal(seasonDegreeProfile(seed, "autumn")?.aspects.light, 0.58);
  // The activity column is a §6.11 'later' row: not seeded in 2c.
  assert.equal(winter?.aspects.activity, undefined);

  const summer = seasonBaseline(seed, "summer");
  assert.equal(summer?.bands.fire, "predominant"); // its own element leads
  assert.equal(summer?.proportions.fire, 0.4); // §6.8's indicative proportion
  assert.equal(summer?.bands.water, "faint");
  assert.equal(summer?.bands.wood, "present"); // the generator sits present

  const tp = (id: string) =>
    seed.getNode(id)?.properties["turningPoint"] as { name?: string; turnsToward?: string } | undefined;
  assert.equal(tp("winter")?.name, "winter solstice");
  assert.equal(tp("winter")?.turnsToward, "yang");
  assert.equal(tp("summer")?.name, "summer solstice");
  assert.equal(tp("spring"), undefined, "equinoxes are a later row (§6.11)");
  assert.equal(tp("autumn"), undefined);
});

test("OE-RESTRAINT: 'what keeps fire in check?' is answered by the restrainedBy operator", () => {
  const r = turn(session(), "what keeps fire in check?");
  assert.equal(r.decision.kind, "route");
  if (r.decision.kind !== "route") return;
  assert.equal(r.decision.intent.intentType, "restraint");
  const c = r.trace.conclusions.find((x) => x.relation === "RESTRAINED_BY");
  assert.ok(c, "a RESTRAINED_BY conclusion exists");
  assert.equal(c.objectId, "water");
  assert.equal(c.facts?.element, "fire");
  assert.match(r.rendered.text, /Water restrains Fire/);
  const debug = renderAnswer({
    graph,
    trace: r.trace,
    decision: r.decision,
    extract,
    modeOverride: "debug",
  });
  assert.match(debug.text, /MUTUAL_RESTRAINT/, "the derivation shows the restraint edge itself, not a stored fact");
});

test("OE-PROPORTION: winter is more Yin than autumn in the light aspect; solstice cited; no numerals on the framework surface", () => {
  const r = turn(session(), "is winter more yin than autumn?");
  assert.equal(r.decision.kind, "route");
  if (r.decision.kind !== "route") return;
  assert.equal(r.decision.intent.intentType, "degree_compare");
  const c = r.trace.conclusions.find((x) => x.relation === "DEGREE_COMPARE");
  assert.ok(c);
  assert.equal(c.facts?.aShare, 0.82);
  assert.equal(c.facts?.bShare, 0.58);
  assert.equal(c.facts?.aBand, "predominant");
  assert.equal(c.facts?.bBand, "present");
  assert.equal(c.facts?.verdict, "more");
  assert.equal(c.facts?.turningPoint, "winter solstice");
  assert.match(r.rendered.text, /more Yin/);
  assert.match(r.rendered.text, /predominant/);
  assert.match(r.rendered.text, /winter solstice/);
  assert.doesNotMatch(r.rendered.text, /\d+\.\d+/, "§9.5: proportions live in the trace, never in framework text");
  assert.deepEqual(r.rendered.violations, []);
});

test("OE-PROPORTION (mixed aspects): comparing across aspects declines — it is a category error (§6.7)", () => {
  const r = turn(session(), "is winter more yin in light than autumn in temperature?");
  assert.equal(r.decision.kind, "decline");
});

test("OE-ASPECT-NONCONFLICT: bass is Yang in voice-origin and Yin in pitch — no conflict, by construction", () => {
  const seed = buildSeedGraph();
  const cls = directClassifications(seed, "bass");
  const yang = cls.find((c) => c.objectId === "yang");
  const yin = cls.find((c) => c.objectId === "yin");
  assert.equal(yang?.aspectKey, "voice-origin");
  assert.equal(yin?.aspectKey, "pitch");
  // The §8.2 conflict check is keyed by (subject, aspect): the profile
  // passes it, because the two classifications live in different aspects.
  const conclusions: InterimConclusion[] = cls.map((c, i) => ({
    id: `t${i}`,
    subjectId: "bass",
    relation: c.relation,
    objectId: c.objectId,
    aspectKey: c.aspectKey,
    confidence: c.confidence,
    derivedFrom: [],
  }));
  assert.deepEqual(findConflicts(conclusions), []);
  // Propagation flags nothing for bass either, and treble is the inverse.
  const res = propagateGraph(seed);
  assert.ok(res.reviewItems.every((ri) => !ri.statementIds.some((id) =>
    statementsFor(seed, "bass").some((s) => s.id === id),
  )));
  const treble = directClassifications(seed, "treble");
  assert.equal(treble.find((c) => c.objectId === "yang")?.aspectKey, "pitch");
  assert.equal(treble.find((c) => c.objectId === "yin")?.aspectKey, "voice-origin");
  // The aspect keys come from §6.6's closed vocabulary, backfilled on the seed.
  const hp = directClassifications(seed, "high-pressure-system").filter(
    (c) => c.relation === "HAS_POLARITY",
  );
  assert.deepEqual(
    hp.map((c) => `${c.objectId}@${c.aspectKey}`).sort(),
    ["yang@overall", "yin@air-motion"],
  );
});

test("OE-EXCESS: a Fire-heavy profile against the summer baseline (§6.8 worked example)", () => {
  const a = assessBalance(graph, { proportions: { fire: 0.55 } }, "summer");
  assert.ok(a);
  assert.equal(a.excess.length, 1);
  const ex = a.excess[0];
  assert.equal(ex.elementId, "fire");
  assert.equal(ex.baselineShare, 0.4);
  assert.equal(ex.moderatorId, "water", "the restraining element moderates");
  assert.equal(ex.downstreamId, "earth", "the excess feeds what Fire generates");
  const cats = new Map([...ex.manifestations.entries()].map(([k, v]) => [k, v.map((e) => e.nodeId)]));
  assert.ok(cats.get("organ")?.includes("organ-heart"));
  assert.ok(cats.get("taste")?.includes("taste-bitter"));
  assert.ok(cats.get("color")?.includes("color-red"));

  const r = turn(session(), "what balances an excess of fire in summer?");
  assert.equal(r.decision.kind, "route");
  if (r.decision.kind !== "route") return;
  assert.equal(r.decision.intent.intentType, "balance");
  const rels = r.trace.conclusions.map((c) => c.relation);
  assert.ok(rels.includes("BALANCE_EXCESS"));
  assert.ok(rels.includes("BALANCE_MODERATOR"));
  assert.ok(rels.includes("BALANCE_DOWNSTREAM"));
  assert.ok(
    r.trace.conclusions.some((c) => c.relation === "CORRESPONDS_TO" && c.subjectId === "organ-heart"),
    "manifestations arrive as correspondence conclusions",
  );
  assert.match(r.rendered.text, /Water/);
  assert.match(r.rendered.text, /Earth/);
  assert.match(r.rendered.text, /heart/);
  assert.notEqual(r.trace.boundHit, true, "the balance turn fits the §8.3 trace bound");

  // §6.8 honesty rule: the plain surface speaks manifestations only —
  // no element names, no medical claims of any kind.
  const plain = renderAnswer({
    graph,
    trace: r.trace,
    decision: r.decision,
    extract,
    modeOverride: "plain",
  });
  assert.deepEqual(plain.violations, []);
  assert.doesNotMatch(plain.text, /diagnos|treatment|prescri|patient|symptom/i);
  assert.doesNotMatch(plain.text, /\b(Fire|Water|Earth|Wood|Metal)\b/, "no framework names in plain mode");
});

test("OE-COMPOSE: yu reaches Water's whole row at atomic confidence (§6.9)", () => {
  const seed = buildSeedGraph();
  const comp = compose(seed, "sound-yu");
  assert.ok(comp);
  assert.equal(comp.elementId, "water");
  assert.equal(comp.confidence, 1, "composition confidence is the classification's — atomic, unhedged");
  assert.equal(comp.analogy, false);
  const ids = comp.entries.map((e) => e.nodeId);
  for (const want of ["winter", "organ-kidneys", "emotion-fear", "taste-salty", "color-black", "direction-north"]) {
    assert.ok(ids.includes(want), `compose(yu) reaches ${want}`);
  }
  // A domain-scoped composition returns just that domain.
  const organOnly = compose(seed, "sound-yu", "organ");
  assert.deepEqual(organOnly?.entries.map((e) => e.nodeId), ["organ-kidneys"]);
  // A narrow-aspect classification composes by analogy, at its own confidence.
  const merc = compose(seed, "mercury");
  assert.equal(merc?.confidence, 0.55);
  assert.equal(merc?.analogy, true);

  const r = turn(session(), "what does yu correspond to?");
  assert.equal(r.decision.kind, "route");
  if (r.decision.kind !== "route") return;
  assert.ok(r.trace.conclusions.some((c) => c.relation === "COMPOSE_ENTRY"));
  assert.match(r.rendered.text, /winter/);
  assert.match(r.rendered.text, /kidneys/);
  assert.deepEqual(r.rendered.violations, []);
});

test("§6.5 temporal reasoning: concept-level cycle derivations at classification x 0.8", () => {
  const seed = buildSeedGraph();
  const mk = (matchedNodes: string[], variant = "cycle"): QueryIntent => ({
    intentType: "causal_chain",
    matchedNodes,
    includeOntology: true,
    traversalDepth: 3,
    confidenceThreshold: 0.5,
    variant,
  });
  const rec1 = new TraceBuilder(1, "what follows winter?");
  const r1 = answerIntent(seed, "what follows winter?", mk(["winter"]), rec1);
  const f1 = r1.conclusions.find((c) => c.relation === "FOLLOWED_BY");
  assert.ok(f1, "winter is followed by something");
  assert.equal(f1.objectId, "spring");
  assert.ok(Math.abs(f1.confidence - 0.8) < 1e-9, `atomic classification x 0.8, got ${f1.confidence}`);

  const rec2 = new TraceBuilder(1, "what follows from derivative?");
  const r2 = answerIntent(seed, "what follows from derivative?", mk(["derivative"]), rec2);
  const f2 = r2.conclusions.find((c) => c.relation === "FOLLOWED_BY");
  assert.ok(f2, "derivative inherits Fire's cycle position (temporal aspect)");
  assert.equal(f2.objectId, "earth", "Fire generates Earth");
  assert.ok(Math.abs(f2.confidence - 0.704) < 1e-9, `0.88 classification x 0.8, got ${f2.confidence}`);
});

test("§6.7 compareDegrees: band order first, then proportion; turning point cited for the higher side", () => {
  const seed = buildSeedGraph();
  const cmp = compareDegrees(seed, "winter", "autumn", "light", "yin");
  assert.equal(cmp?.verdict, "more");
  assert.equal(cmp?.aBand, "predominant");
  assert.equal(cmp?.bBand, "present");
  assert.equal(cmp?.turningPoint?.name, "winter solstice");
  const rev = compareDegrees(seed, "autumn", "winter", "light", "yin");
  assert.equal(rev?.verdict, "less");
  assert.equal(rev?.turningPointSide, "b");
});
