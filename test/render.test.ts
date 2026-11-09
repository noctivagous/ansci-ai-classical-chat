/**
 * render.test.ts — slice 2b acceptance, §9.7 (RD-*): the three-stage
 * renderer — mode trio on one conclusion set, hedge bands, the
 * faithfulness trap, plain-mode clarification and decline, and the
 * renderer-gap experience event on a forced violation.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildChatGraph, getDefaultExtract } from "../src/wordnet";
import { TraceBuilder, type InterimConclusion } from "../src/thought";
import { renderAnswer as render } from "../src/render";
import {
  createSession,
  graphStampFor,
  runTurn,
  type RouteDecision,
  type SessionState,
} from "../src/router";
import { readExperienceEvents } from "../src/experience";

const graph = buildChatGraph();
const extract = getDefaultExtract();

function session(): SessionState {
  return createSession(graphStampFor(extract));
}

type ConclusionInit = Omit<InterimConclusion, "id" | "derivedFrom">;

function fixtureTrace(
  question: string,
  conclusions: ConclusionInit[],
  decision: RouteDecision,
) {
  const b = new TraceBuilder(1, question);
  conclusions.forEach((c, i) => {
    b.addStep({ kind: "join", inputs: [`fixture-${i}`], conclusion: c });
  });
  return b.finish(decision, {
    conflict: "pass",
    leakage: "pass",
    confidenceFloor: { action: "none" },
  });
}

function routeDecision(
  intentType: string,
  matchedNodes: string[],
  surfaceMode: "plain" | "framework" | "debug",
  extra?: { category?: string; variant?: string },
): RouteDecision {
  return {
    kind: "route",
    intent: {
      intentType: intentType as never,
      matchedNodes,
      includeOntology: true,
      traversalDepth: 3,
      confidenceThreshold: 0.7,
      category: extra?.category,
      variant: extra?.variant,
    },
    terms: matchedNodes.map((id) => ({
      surface: id,
      lemma: id,
      slot: "subject" as const,
      nodeId: id,
      resolvedBy: "ontology-name" as const,
    })),
    surfaceMode,
    decisionReason: "test/fixture",
  };
}

test("RD-MODE-TRIO: one conclusion set, three modes, content preserved", () => {
  const conclusions: ConclusionInit[] = [
    {
      subjectId: "precipitation",
      relation: "HAS_POLARITY",
      objectId: "yin",
      confidence: 0.85,
      aspect: "weather",
    },
    {
      subjectId: "precipitation",
      relation: "HAS_ELEMENT",
      objectId: "water",
      confidence: 0.88,
    },
  ];
  const decision = routeDecision("ontology_explanation", ["precipitation"], "plain");
  const trace = fixtureTrace("how does precipitation fit?", conclusions, decision);
  const loadBearingId = trace.conclusions[0].id;

  const plain = render({ graph, trace, decision, modeOverride: "plain" });
  assert.deepEqual(plain.violations, [], JSON.stringify(plain.violations));
  assert.doesNotMatch(plain.text, /\bYin\b|\bYang\b|Wuxing/);
  assert.match(plain.text, /cold|dark|heavy|still/i, "a sanctioned manifestation phrase carries the content");
  assert.ok(
    !plain.droppedConclusions.some((c) => c.id === loadBearingId),
    "the load-bearing conclusion is rendered (via manifestation), not dropped",
  );

  const framework = render({ graph, trace, decision, modeOverride: "framework" });
  assert.match(framework.text, /Yin/);

  const debug = render({ graph, trace, decision, modeOverride: "debug" });
  assert.match(debug.text, /precipitation/i);
  assert.match(debug.text, /Yin/);
  assert.match(debug.text, /0\.85/);
});

test("RD-HEDGE-BANDS: assertion strength follows the §9.4 bands", () => {
  const cases: { confidence: number; expect: RegExp; absent?: RegExp }[] = [
    { confidence: 0.95, expect: /winter is cold/i, absent: /tends|may/ },
    { confidence: 0.8, expect: /tends to be cold/i },
    { confidence: 0.6, expect: /may be cold/i },
  ];
  for (const { confidence, expect, absent } of cases) {
    const decision = routeDecision("causal_chain", ["winter", "cold"], "plain");
    const trace = fixtureTrace("why is winter cold?", [
      {
        subjectId: "winter",
        relation: "HAS_QUALITY",
        objectId: "cold",
        confidence,
        viaIds: ["water", "yin"],
      },
    ], decision);
    const out = render({ graph, trace, decision });
    assert.match(out.text, expect, `confidence ${confidence}: ${out.text}`);
    if (absent) assert.doesNotMatch(out.text, absent);
  }
  // Below the floor: not asserted, and reported as dropped.
  const decision = routeDecision("causal_chain", ["winter", "cold"], "plain");
  const trace = fixtureTrace("why is winter cold?", [
    {
      subjectId: "winter",
      relation: "HAS_QUALITY",
      objectId: "cold",
      confidence: 0.4,
      viaIds: ["water", "yin"],
    },
  ], decision);
  const out = render({ graph, trace, decision });
  assert.doesNotMatch(out.text, /is cold|tends to be cold|may be cold/i);
  assert.ok(out.droppedConclusions.some((c) => c.relation === "HAS_QUALITY"));
});

test("RD-FAITHFULNESS-TRAP: an untraceable entity is flagged and never ships", () => {
  const decision = routeDecision("definition", ["winter"], "plain");
  const trace = fixtureTrace("what is winter?", [
    { subjectId: "winter", relation: "GLOSS", confidence: 1 },
  ], decision);
  const out = render({
    graph,
    trace,
    decision,
    realiseOverride: () => "Winter is the season of the zorblax.",
  });
  assert.ok(out.violations.some((v) => v.stage === "faithfulness"));
  assert.doesNotMatch(out.text, /zorblax/);
});

test("RD-FIRE-PLAIN: the Fire clarification in plain mode is a natural question", () => {
  const s = session();
  const r = runTurn(graph, s, "What element is Fire?", { extract, experienceDir: null });
  assert.equal(r.decision.kind, "clarify");
  assert.equal(r.rendered.mode, "plain");
  assert.deepEqual(r.rendered.violations, [], JSON.stringify(r.rendered.violations));
  assert.match(r.rendered.text, /Quick check/);
  assert.match(r.rendered.text, /1\. Fire itself/);
  assert.match(r.rendered.text, /2\. The things classed under Fire/);
  assert.match(r.rendered.text, /3\. Ordinary fire/);
  assert.doesNotMatch(r.rendered.text, /D5|decisionReason|matchedNodes|b1/);
});

test("RD-DECLINE-NATURAL: the D10 decline is natural, offers the definition, no machinery", () => {
  const s = session();
  const r = runTurn(graph, s, "why is a banana curved?", { extract, experienceDir: null });
  assert.equal(r.decision.kind, "decline");
  assert.equal(r.rendered.mode, "plain");
  assert.match(r.rendered.text, /can't explain it from a cause/);
  assert.match(r.rendered.text, /say what a banana means/);
  assert.doesNotMatch(
    r.rendered.text,
    /graph|ontology|synset|threshold|D10|intent|the system has/i,
  );
});

test("RD-GAP-EVENT: a forced leakage violation ships the fallback and logs one renderer-gap", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ansci-exp-"));
  const s = session();
  const r = runTurn(graph, s, "what is winter?", {
    extract,
    experienceDir: dir,
    realiseOverride: () => "Winter is Yin.",
  });
  assert.doesNotMatch(r.rendered.text, /\bYin\b/);
  assert.ok(r.rendered.violations.some((v) => v.stage === "leakage"));
  const events = readExperienceEvents(dir);
  const gaps = events.filter((e) => e.kind === "renderer-gap");
  assert.equal(gaps.length, 1, JSON.stringify(events));
  const ev = gaps[0];
  if (ev.kind === "renderer-gap") {
    assert.equal(ev.stage, "leakage");
    assert.match(ev.detail, /yin/i);
  }
});
