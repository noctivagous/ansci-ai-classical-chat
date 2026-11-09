/**
 * router.test.ts — slice 2b acceptance, §7.9: the Router Probe Suite.
 * The 13 probe questions with their expected decisions, resolved ids and
 * answer content, plus the scripted session cases (RPS-FIRE,
 * RPS-THUNDER-TOPIC, RPS-CORRECTION, RPS-ELLIPSIS, RPS-SURFACE) and the
 * §7.3 morphology fixtures. Decisions are asserted, not just text: the
 * probe suite exists because text-only checks let the old doorway bugs
 * (wrong subject, wrong sense, wrong intent) pass unnoticed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChatGraph, getDefaultExtract, synsetsForSurface } from "../src/wordnet";
import {
  createSession,
  graphStampFor,
  runTurn,
  type RouteDecision,
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
function routeOf(r: TurnResult): Extract<RouteDecision, { kind: "route" }> {
  assert.equal(r.decision.kind, "route", `expected route, got ${r.decision.kind} for: ${r.rendered.text}`);
  return r.decision as Extract<RouteDecision, { kind: "route" }>;
}

/* ------------------------- the 13 probes --------------------------- */

test("RPS-01: 'why is summer warm' routes causal_chain via the seed Season", () => {
  const r = turn(session(), "why is summer warm?");
  const d = routeOf(r);
  assert.equal(d.intent.intentType, "causal_chain");
  assert.equal(d.terms[0].nodeId, "summer");
  assert.equal(
    r.result?.paths[0]?.text,
    "summer —ELEMENT_OF→ Fire —POLARITY_OF→ Yang —HAS_QUALITY→ warm",
  );
  assert.match(r.rendered.text, /summer is warm/i);
});

test("RPS-02: comparative answered from night's side; cooler -> cold Quality", () => {
  const r = turn(session(), "why is the night cooler than the day?");
  const d = routeOf(r);
  assert.equal(d.intent.intentType, "causal_chain");
  assert.equal(d.terms.find((t) => t.slot === "subject")?.nodeId, "night");
  assert.equal(d.terms.find((t) => t.slot === "quality")?.nodeId, "cold");
  assert.match(r.rendered.text, /night is cold/i);
});

test("RPS-03: correspondence forward, category organ -> kidneys", () => {
  const r = turn(session(), "what does the water element correspond to in the body?");
  const d = routeOf(r);
  assert.equal(d.intent.intentType, "correspondence");
  assert.equal(d.intent.category, "organ");
  assert.equal(d.terms[0].nodeId, "water");
  assert.match(r.rendered.text, /kidneys/i);
});

test("RPS-04: 'which element is anger' is a reverse correspondence", () => {
  const r = turn(session(), "which element is anger?");
  const d = routeOf(r);
  assert.equal(d.intent.intentType, "correspondence");
  assert.equal(d.terms[0].nodeId, "emotion-anger");
  assert.match(r.rendered.text, /Wood/);
});

test("RPS-05: banana declines D10 with a definition offered", () => {
  const r = turn(session(), "why is a banana curved?");
  assert.equal(r.decision.kind, "decline");
  if (r.decision.kind !== "decline") return;
  assert.match(r.decision.decisionReason, /^D10\//);
  assert.match(r.rendered.text, /banana/);
  assert.ok(
    r.decision.alternatives.some((a) => a.route?.intent.intentType === "definition"),
    "definition offered as an alternative",
  );
  assert.doesNotMatch(r.rendered.text, /curved because|Yang|Yin/);
});

test("RPS-06: 'is thunder yang' clarifies D9; no sense is silently chosen", () => {
  const r = turn(session(), "is thunder yang?");
  assert.equal(r.decision.kind, "clarify");
  if (r.decision.kind !== "clarify") return;
  assert.match(r.decision.decisionReason, /^D9\//);
  assert.equal(r.decision.branches.length, 3);
  const labels = r.decision.branches.map((b) => b.label).join(" | ");
  assert.match(labels, /slang/);
  assert.match(labels, /lightning/);
  // The heroin sense exists only as a labelled branch, never a default.
  assert.match(r.rendered.text, /Which sense of thunder/);
});

test("RPS-07: opposite of cold -> hot, via the mapped temperature sense", () => {
  const r = turn(session(), "what is the opposite of cold?");
  const d = routeOf(r);
  assert.equal(d.intent.intentType, "antonym_lookup");
  assert.equal(d.terms[0].synsetId, "wn-a01258433");
  assert.match(r.rendered.text, /\bhot\b/);
});

test("RPS-08: compare winter and summer — two subjects, contrast + relation", () => {
  const r = turn(session(), "compare winter and summer");
  const d = routeOf(r);
  assert.equal(d.intent.intentType, "comparison");
  assert.deepEqual(
    d.terms.map((t) => t.nodeId),
    ["winter", "summer"],
  );
  assert.match(r.rendered.text, /coldest season/);
  assert.match(r.rendered.text, /warmest season/);
  assert.doesNotMatch(r.rendered.text, /Compare means|definition of compare/i);
});

test("RPS-09: sleep-at-night is a D11 partial; sleep is explicitly unmapped", () => {
  const r = turn(session(), "why do people sleep at night?");
  const d = routeOf(r);
  assert.equal(d.intent.intentType, "causal_chain");
  assert.match(d.decisionReason, /^D11\//);
  const unanchored = r.trace.conclusions.find((c) => c.relation === "UNANCHORED_TERM");
  assert.equal(unanchored?.facts?.term, "sleep");
  assert.match(r.rendered.text, /night/i);
  assert.match(r.rendered.text, /can't explain sleep itself/i);
});

test("RPS-10: finger belongs to hand, via the incoming PART_OF edge", () => {
  const r = turn(session(), "what part of the body does a finger belong to?");
  const d = routeOf(r);
  assert.equal(d.intent.intentType, "part_of");
  assert.equal(d.terms[0].synsetId, "wn-n05647705");
  assert.match(r.rendered.text, /\bhand\b/);
});

test("RPS-11: 'tell me about kidneys' — forms index to the kidney gloss, plain", () => {
  const r = turn(session(), "tell me about kidneys");
  const d = routeOf(r);
  assert.equal(d.intent.intentType, "definition");
  assert.equal(d.terms[0].synsetId, "wn-n05412543");
  assert.equal(r.rendered.mode, "plain");
  assert.match(r.rendered.text, /bean-shaped/);
  assert.doesNotMatch(r.rendered.text, /\b(Yin|Yang|Wuxing|trigram)\b/);
});

test("RPS-12: winter/summer relatedness via the Water–Fire restraint path", () => {
  const r = turn(session(), "how are winter and summer related?");
  const d = routeOf(r);
  assert.equal(d.intent.intentType, "relatedness");
  const via = r.trace.conclusions.find((c) => c.relation === "RELATED_VIA");
  assert.ok(via, "a RELATED_VIA conclusion exists");
  assert.ok(via.viaIds?.includes("water") && via.viaIds?.includes("fire"));
  assert.match(r.rendered.text, /winter/i);
  assert.match(r.rendered.text, /summer/i);
});

test("RPS-13: 'what sound goes with the water element' -> yu (羽)", () => {
  const r = turn(session(), "what sound goes with the water element?");
  const d = routeOf(r);
  assert.equal(d.intent.intentType, "correspondence");
  assert.equal(d.intent.category, "sound");
  assert.equal(d.terms[0].nodeId, "water");
  assert.match(r.rendered.text, /yu/);
});

/* ------------------------- morphology ------------------------------ */

test("morphology fixtures resolve through the closed forms index (§7.3)", () => {
  const kidneys = synsetsForSurface(extract, "kidneys");
  assert.ok(kidneys.synsets.some((s) => s.id === "wn-n05412543"));
  assert.ok(kidneys.candidates.some((c) => c.lemma === "kidney" && c.pos === "n"));

  const children = synsetsForSurface(extract, "children");
  assert.ok(children.candidates.some((c) => c.lemma === "child" && c.pos === "n"));

  const went = synsetsForSurface(extract, "went");
  assert.ok(went.candidates.some((c) => c.lemma === "go" && c.pos === "v"));

  const leaves = synsetsForSurface(extract, "leaves");
  const lemmas = new Set(leaves.synsets.flatMap((s) => s.lemmas));
  assert.ok(lemmas.has("leaf") && lemmas.has("leave"));
});

/* ------------------------- RPS-FIRE -------------------------------- */

function fireTurn1(): { s: SessionState; r: TurnResult } {
  const s = session();
  const r = turn(s, "What element is Fire?");
  assert.equal(r.decision.kind, "clarify");
  if (r.decision.kind === "clarify") {
    assert.match(r.decision.decisionReason, /^D5\//);
    assert.equal(r.decision.branches.length, 3);
  }
  return { s, r };
}

test("RPS-FIRE branch 1 ('1'): Fire itself, framework ontology profile", () => {
  const { s } = fireTurn1();
  const r = turn(s, "1");
  const d = routeOf(r);
  assert.equal(d.intent.intentType, "ontology_explanation");
  assert.equal(d.terms[0].nodeId, "fire");
  assert.equal(s.pendingClarification, undefined);
  assert.match(r.rendered.text, /Yang/);
});

test("RPS-FIRE branch 2 ('the things classed under Fire'): incoming classification", () => {
  const { s } = fireTurn1();
  const r = turn(s, "the things classed under Fire");
  const d = routeOf(r);
  assert.equal(d.intent.variant, "incoming-classification");
  assert.match(r.rendered.text, /summer/i);
});

test("RPS-FIRE branch 3 ('flames'): ordinary fire, sense-bridged", () => {
  const { s } = fireTurn1();
  const r = turn(s, "flames");
  const d = routeOf(r);
  assert.equal(d.intent.variant, "sense-bridge");
  assert.ok(d.intent.matchedNodes.includes("wn-n13713767"));
  assert.match(r.rendered.text, /combustion/i);
});

/* ------------------------- scripted sessions ----------------------- */

test("RPS-THUNDER-TOPIC: weather topic selects the meteorological sense", () => {
  const s = session();
  turn(s, "why is sleet cold?");
  assert.equal(s.topicFrame?.id, "meteorology");
  const r = turn(s, "is thunder yang?");
  const d = routeOf(r);
  assert.equal(d.terms[0].synsetId, "wn-n07540248");
  assert.equal(d.terms[0].resolvedBy, "topic");
  assert.match(r.rendered.text, /settled reading|isn't connected|won't claim/i);
  assert.doesNotMatch(r.rendered.text, /heroin/);
});

test("RPS-CORRECTION: the illness sense wins, persists, and signals", () => {
  const s = session();
  turn(s, "why is sleet cold?");
  const t2 = turn(s, "what about cold?");
  assert.equal(routeOf(t2).terms[0].synsetId, "wn-a01258433");
  assert.match(t2.rendered.text, /temperature/);

  const t3 = turn(s, "no, I meant the illness");
  assert.equal(routeOf(t3).terms[0].synsetId, "wn-n14389489");
  assert.match(t3.rendered.text, /viral infection/);
  assert.equal(s.resolvedSenses["cold"]?.synsetId, "wn-n14389489");
  assert.equal(s.resolvedSenses["cold"]?.resolvedBy, "user");
  assert.equal(s.corrections.length, 1);
  assert.equal(s.corrections[0].fromSynsetId, "wn-a01258433");
  assert.equal(s.corrections[0].toSynsetId, "wn-n14389489");
  assert.equal(s.trainerSignals.length, 1);
  assert.equal(s.trainerSignals[0].proposedAction, "propose-evaluation-case");

  const t4 = turn(s, "cold");
  assert.match(t4.rendered.text, /viral infection/);
});

test("RPS-ELLIPSIS: 'what about the liver?' inherits the correspondence frame", () => {
  const s = session();
  const t1 = turn(s, "what does the water element correspond to in the body?");
  assert.match(t1.rendered.text, /kidneys/i);
  const t2 = turn(s, "what about the liver?");
  const d = routeOf(t2);
  assert.equal(d.intent.intentType, "correspondence");
  assert.match(d.decisionReason, /^D4\//);
  assert.match(t2.rendered.text, /Wood/);
});

const FRAMEWORK_SCAN =
  /\bYin\b|\bYang\b|Wuxing|trigram|HAS_QUALITY|CORRESPONDS_TO|POLARITY_OF|wn-[a-z]\d{8}|in this framework/;

test("RPS-SURFACE: plain run leaks no framework terms; debug run shows the derivation", () => {
  const script = [
    "why is sleet cold?",
    "what is the common cold?",
    "what is the opposite of cold?",
    "tell me about kidneys",
    "how are winter and summer related?",
    "what about cold?",
    "no, I meant the illness",
    "why did you say that?",
  ];
  const s = session();
  const results = script.map((q) => turn(s, q));
  // Turns 1–7 are plain-mode; the replay (turn 8) is framework by design.
  for (const [i, r] of results.slice(0, 7).entries()) {
    assert.equal(r.rendered.mode, "plain", `turn ${i + 1} should be plain`);
    assert.doesNotMatch(r.rendered.text, FRAMEWORK_SCAN, `turn ${i + 1} leaked: ${r.rendered.text}`);
  }
  // Multi-turn coherence inside the same script.
  assert.match(results[5].rendered.text, /temperature/);
  assert.match(results[6].rendered.text, /viral infection/);
  assert.equal(results[7].rendered.mode, "framework");

  // Paired debug run of the same script: the ontology shows.
  const sd = session();
  const debugResults = script.map((q) =>
    runTurn(graph, sd, q, { extract, experienceDir: null, debug: true }),
  );
  assert.match(debugResults[0].rendered.text, /HAS_POLARITY|POLARITY_OF/);
  assert.match(debugResults[0].rendered.text, /Yin/);
  assert.match(debugResults[0].rendered.text, /precipitation/);
});
