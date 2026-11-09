/**
 * thought.test.ts — slice 2b acceptance, §8.8 (TM-*): the ThoughtTrace,
 * the experience log, replay without re-reasoning, and the step bound.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildChatGraph, getDefaultExtract } from "../src/wordnet";
import { buildSeedGraph } from "../src/seed";
import { answerIntent, type QueryIntent } from "../src/reason";
import { TraceBuilder } from "../src/thought";
import { readExperienceEvents } from "../src/experience";
import {
  createSession,
  graphStampFor,
  runTurn,
  type SessionState,
} from "../src/router";
import { renderAnswer } from "../src/render";

const graph = buildChatGraph();
const extract = getDefaultExtract();

function session(): SessionState {
  return createSession(graphStampFor(extract));
}
function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ansci-exp-"));
}

test("TM-TRACE-COMPARE: comparison trace has >=3 steps incl. a synthesis join", () => {
  const s = session();
  const r = runTurn(graph, s, "compare winter and summer", { extract, experienceDir: null });
  assert.ok(r.trace.steps.length >= 3, `steps: ${r.trace.steps.length}`);
  const profiles = r.trace.conclusions.filter((c) => c.relation === "PROFILE");
  const subjects = new Set(profiles.map((c) => c.subjectId));
  assert.ok(subjects.has("winter") && subjects.has("summer"), "both subjects profiled");
  const synthesis = r.trace.steps.some((st) => st.kind === "join" || st.kind === "relate");
  assert.ok(synthesis, "a synthesis step consumes the profiles");
  const contrast = r.trace.conclusions.find((c) =>
    ["CONTRASTS_WITH", "RELATED_VIA", "SHARED_PRIOR", "OPPOSED_PRIOR"].includes(c.relation),
  );
  assert.ok(contrast, "a synthesis conclusion relates the two subjects");
});

test("TM-GAP-LOG: the banana decline appends exactly one gap-hit naming banana", () => {
  const dir = tempDir();
  const s = session();
  runTurn(graph, s, "why is a banana curved?", { extract, experienceDir: dir });
  const events = readExperienceEvents(dir);
  assert.equal(events.length, 1, JSON.stringify(events));
  assert.equal(events[0].kind, "gap-hit");
  if (events[0].kind === "gap-hit") {
    assert.ok(events[0].unanchoredTerms.includes("banana"));
    assert.match(events[0].decisionReason, /^D10\//);
  }
});

test("TM-CORRECTION-LOG: exactly one correction event with the same ids as the session", () => {
  const dir = tempDir();
  const s = session();
  const opts = { extract, experienceDir: dir };
  runTurn(graph, s, "why is sleet cold?", opts);
  runTurn(graph, s, "what about cold?", opts);
  runTurn(graph, s, "no, I meant the illness", opts);
  const events = readExperienceEvents(dir);
  const corrections = events.filter((e) => e.kind === "correction");
  assert.equal(corrections.length, 1, JSON.stringify(events));
  assert.equal(events.length, 1, `no other events that session: ${JSON.stringify(events)}`);
  const ev = corrections[0];
  if (ev.kind === "correction") {
    assert.equal(ev.fromSynsetId, "wn-a01258433");
    assert.equal(ev.toSynsetId, "wn-n14389489");
    assert.equal(ev.fromSynsetId, s.corrections[0].fromSynsetId);
    assert.equal(ev.toSynsetId, s.corrections[0].toSynsetId);
  }
});

test("TM-REPLAY: 'why did you say that?' re-renders without re-running the reasoner", () => {
  const s = session();
  let calls = 0;
  const spy: typeof answerIntent = (g, q, i, rec) => {
    calls++;
    return answerIntent(g, q, i, rec);
  };
  const opts = { extract, experienceDir: null, answerIntentFn: spy };
  const t1 = runTurn(graph, s, "why is winter cold?", opts);
  assert.equal(t1.rendered.mode, "plain");
  assert.equal(calls, 1);
  const t2 = runTurn(graph, s, "why did you say that?", opts);
  assert.equal(calls, 1, "the reasoner must not re-run for a replay");
  assert.equal(t2.rendered.mode, "framework");
  assert.match(t2.rendered.text, /Yin/);
});

test("TM-BOUND: deliberation past 12 steps returns a partial, boundHit answer", () => {
  const seed = buildSeedGraph();
  const intent: QueryIntent = {
    intentType: "comparison",
    matchedNodes: ["winter", "summer", "spring", "autumn", "night", "midday", "precipitation"],
    includeOntology: true,
    traversalDepth: 4,
    confidenceThreshold: 0.8,
  };
  const rec = new TraceBuilder(1, "compare winter, summer, spring, autumn, night, midday and precipitation");
  const result = answerIntent(seed, "compare many things", intent, rec);
  assert.equal(result.partial, true);
  const decision = {
    kind: "route" as const,
    intent,
    terms: intent.matchedNodes.map((id) => ({
      surface: id,
      lemma: id,
      slot: "subject" as const,
      nodeId: id,
      resolvedBy: "ontology-name" as const,
    })),
    surfaceMode: "plain" as const,
    decisionReason: "test/bound",
  };
  const trace = rec.finish(decision, {
    conflict: "pass",
    leakage: "pass",
    confidenceFloor: { action: "none" },
  });
  assert.equal(trace.boundHit, true);
  assert.ok(trace.steps.length <= 12);
  const rendered = renderAnswer({ graph: seed, trace, decision });
  assert.ok(rendered.text.length > 0, "a partial answer is rendered from completed steps");
  assert.match(rendered.text, /as far as I got/);
});
