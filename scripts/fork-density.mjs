#!/usr/bin/env node
/**
 * fork-density.mjs — the density / overgeneration run (DESIGN §5.2).
 *
 * Stages synthetic classifications deterministically (a seeded LCG —
 * same load every run) at ×10 and ×100 over the curated table, attached
 * across all five elements and the engine's aspect keys. At each stage
 * the join's derivation runs over a FIXED question set, and we record:
 * derived-conclusion counts, a precision proxy (fraction of conclusions
 * whose path length <= 3 edges AND confidence >= the join's gate),
 * conflict-flag counts (join-level + propagation review items), and
 * restraint-arbitration firings (counted from propagation notes).
 *
 * No pass bar was pre-set by the user (DESIGN §5.2 leaves it open);
 * this script reports measurements. Run: npm run fork:density
 */
import { buildForkGraph, derive, CONFIDENCE_GATE } from "../dist/src/fork/join.js";
import { CLASSIFICATIONS } from "../dist/src/fork/classify.js";
import { getPropagation } from "../dist/src/propagate.js";

/* Deterministic LCG (Numerical Recipes constants). */
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const ELEMENTS = ["Wood", "Fire", "Earth", "Metal", "Water"];
const ASPECTS = [
  ["overall", "overall"],
  ["state", "state"],
  ["temperature", "temperature"],
  ["weather", "overall"],
  ["emotion", "state"],
  ["food", "overall"],
  ["body", "overall"],
  ["place", "overall"],
];

/** Synthetic stage load: `count` fresh concepts, ~8% carrying a second,
 *  conflicting classification in the same aspect — AND links into the
 *  existing net (ASSOCIATED_WITH / IS_A to a random curated or synthetic
 *  concept), so propagation traffic actually flows across the question
 *  set's neighbourhood. Unlinked synthetic islands would stress
 *  nothing, and an earlier version of this run showed exactly that. */
function synthetic(count, seed) {
  const rnd = lcg(seed);
  const entries = [];
  const links = [];
  const pool = [...new Set(CLASSIFICATIONS.map((e) => e.concept))];
  for (let i = 0; i < count; i++) {
    const [aspect, aspectKey] = ASPECTS[Math.floor(rnd() * ASPECTS.length)];
    const entry = {
      concept: `synthetic-${i}`,
      aspect,
      aspectKey,
      element: ELEMENTS[Math.floor(rnd() * ELEMENTS.length)],
      confidence: Math.round((0.55 + rnd() * 0.45) * 100) / 100,
      provenance: "fork-creative",
      note: "density-run synthetic load",
    };
    entries.push(entry);
    pool.push(entry.concept);
    if (rnd() < 0.08) {
      const other = ELEMENTS[Math.floor(rnd() * ELEMENTS.length)];
      if (other !== entry.element) {
        entries.push({ ...entry, element: other, confidence: Math.round((0.55 + rnd() * 0.45) * 100) / 100, note: "density-run synthetic conflict" });
      }
    }
    const target = pool[Math.floor(rnd() * (pool.length - 1))];
    if (target !== entry.concept) {
      links.push({ from: entry.concept, to: target, type: rnd() < 0.2 ? "IS_A" : "ASSOCIATED_WITH" });
    }
  }
  return { entries, links };
}

/** The fixed question set: the transcript/evaluation domains. */
const QUESTIONS = [
  ["winter"], ["cold", "temperature"], ["cold", "illness"], ["anger"], ["furious"],
  ["worry"], ["sleep"], ["soup"], ["salt"], ["rain"], ["sleet"], ["fear"], ["grief"], ["joy"],
];

function runStage(label, extra, extraLinks = []) {
  const graph = buildForkGraph(extra, extraLinks);
  let conclusions = 0;
  let precise = 0;
  let joinConflicts = 0;
  let gated = 0;
  for (const [concept, aspect] of QUESTIONS) {
    const d = derive(graph, concept, aspect);
    conclusions += d.conclusions.length;
    precise += d.conclusions.filter((c) => c.pathLength <= 3 && c.confidence >= CONFIDENCE_GATE).length;
    joinConflicts += d.conflicts.length;
    if (d.gated) gated++;
  }
  const prop = getPropagation(graph);
  const arbitration = prop.statements.filter((s) => s.notes.some((n) => n.includes("restraint arbitration"))).length;
  const flagged = prop.statements.filter((s) => s.mappingStatus === "flagged").length;
  return {
    stage: label,
    classifications: CLASSIFICATIONS.length + extra.length,
    graphNodes: graph.allNodes().length,
    graphEdges: graph.allEdges().length,
    questions: QUESTIONS.length,
    conclusions,
    precisionProxy: conclusions ? Math.round((precise / conclusions) * 10000) / 10000 : 1,
    joinConflicts,
    propagationReviewItems: prop.reviewItems.length,
    flaggedStatements: flagged,
    arbitrationFirings: arbitration,
    propagatedStatements: prop.statements.length,
    gatedQuestions: gated,
  };
}

const base = CLASSIFICATIONS.length;
const s10 = synthetic(base * 9, 1234567);
const s100 = synthetic(base * 99, 7654321);
const stages = [
  runStage("curated (×1)", []),
  runStage("×10", s10.entries, s10.links),
  runStage("×100", s100.entries, s100.links),
];
console.log(JSON.stringify({ gate: CONFIDENCE_GATE, questions: QUESTIONS.map((q) => q.join(":")), stages }, null, 2));
