/**
 * reason.ts — AnSci's symbolic reasoning engine.
 *
 * No embeddings, no neural net: a deterministic interpreter (exact /
 * synonym / Levenshtein token match) produces a QueryIntent exactly as
 * spec'd in docs/user-plans/ontologyGraph.txt, and the engine traverses
 * the graph honouring the confidence threshold.
 *
 * SLICE 2b (§9.1): the reasoner produces NO prose. Handlers return
 * structured results — interim conclusions (§8.5), the paths behind
 * them (for debug), and the edges used — and record their traversals as
 * ThoughtTrace steps when given a TraceBuilder. All user-visible
 * wording lives in the translation layer (src/render.ts). The one-shot
 * `answer()` wrapper renders its result through the renderer's `debug`
 * mode, which reproduces the slice-1/2a presentation; `interpret()`
 * remains the legacy question classifier used by that wrapper and the
 * older tests. Router-fed turns enter through `answerIntent()` with a
 * pre-resolved intent (§7.2) and never pass through `interpret()`.
 */
import {
  Graph,
  GraphEdge,
  GraphNode,
  Path,
  PathStep,
  displayName,
  passesThreshold,
  renderPath,
} from "./graph";
import { climbToAnchor, mappedConceptForSynset } from "./wordnet";
import { TraceBuilder, findConflicts, type InterimConclusion } from "./thought";
import { renderAnswer } from "./render";
import type { RouteDecision } from "./router";
import {
  assessBalance,
  compareDegrees,
  compose,
  restrainedBy,
  type AspectKey,
} from "./engine";
import {
  bestPropagated,
  derivationPathText,
  statementsFor,
  type PropagatedStatement,
} from "./propagate";

export interface QueryIntent {
  matchedNodes: string[]; // node ids, subject first
  intentType:
    | "definition"
    | "comparison"
    | "ontology_explanation"
    | "causal_chain"
    | "correspondence"
    | "antonym_lookup"
    | "part_of"
    | "relatedness"
    | "situation"
    // Slice 2c (§6): the ontology as engine.
    | "restraint" // §6.5: what keeps X in check (restrainedBy operator)
    | "degree_compare" // §6.7: is A more Yin/Yang than B, in one aspect
    | "balance" // §6.8: a subject profile against a season baseline
    // Slice 2d (§5): FrameNet structure questions — the participants /
    // roles of a frame, what evokes it, which frame a word evokes.
    // Variants: "participants" | "evokers" | "frame_of".
    | "frame_participants"
    | "unknown";
  domainHint?: string;
  includeOntology: boolean;
  traversalDepth: number;
  confidenceThreshold: number;
  /** §7.7: correspondence category ("organ", "sound", …), when selected.
   *  For degree_compare (§6.7): the aspect key compared in.
   *  For frame_participants (§5): the trigger lemma the router resolved
   *  the frame through ("buy" for Commerce_buy), when it resolved one. */
  category?: string;
  /** Handler variant ("cycle", "incoming-classification", "sense-bridge",
   *  "polarity-check", "whole" | "parts" | "check" for part_of,
   *  "compose" for correspondence (§6.9); for degree_compare, the
   *  polarity asked about ("yin" | "yang"). */
  variant?: string;
  /** §6.8: the subject profile a balance turn judges — element id ->
   *  share (0..1) — stipulated by the question or a fixture. */
  profile?: Record<string, number>;
}

export interface ReasonerResult {
  question: string;
  intent: QueryIntent;
  conclusions: InterimConclusion[];
  paths: Path[];
  /** Edges the engine actually used (post-threshold), for inspection/tests. */
  usedEdges: GraphEdge[];
  /** True when the step bound stopped deliberation (§8.3). */
  partial: boolean;
}

export interface Answer {
  question: string;
  intent: QueryIntent;
  text: string;
  paths: Path[];
  usedEdges: GraphEdge[];
}

const ONTOLOGY_WORDS = [
  "yin",
  "yang",
  "wuxing",
  "five elements",
  "element",
  "ancient",
  "chinese science",
  "ontology",
  "polarity",
  "trigram",
  "hexagram",
  "framework",
  "correspond",
];
const DEFINITION_STARTERS = ["what is", "what are", "define", "definition of", "meaning of", "what does"];
const CYCLE_WORDS = ["follow", "follows", "following", "comes after", "come after", "next", "after"];

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 99;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array<number>(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return dp[m][n];
}

/** Find graph nodes named (or synonym-named, or near-named) in the question. */
export function matchNodes(graph: Graph, question: string): GraphNode[] {
  // Punctuation counts as a word boundary: "common cold?" must still match
  // the phrase "common cold" (slice 2a — synset multiword lemmas need this).
  const q = ` ${question.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  const tokens = question.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const exact: { node: GraphNode; score: number }[] = [];
  const fuzzy: { node: GraphNode; score: number }[] = [];
  for (const node of graph.allNodes()) {
    if (node.type === "DictionaryEntry" || node.type === "TextPassage" || node.type === "GraphAdjustment")
      continue;
    const phrases = [node.name.toLowerCase(), ...graph.synonymsOf(node).map((s) => s.toLowerCase())];
    // Score by the LONGEST matching phrase: a node whose two-word lemma
    // ("common cold") matches must outrank nodes matching only "common" or
    // only "cold" — that is the whole point of sense-keyed matching.
    let best = -1;
    for (const phrase of phrases) {
      if (q.includes(` ${phrase} `) || q.includes(` ${phrase}?`) || q.trim().endsWith(phrase)) {
        best = Math.max(best, phrase.length);
      }
    }
    if (best >= 0) {
      exact.push({ node, score: best });
      continue;
    }
    // Fuzzy fallback: a question token within edit distance of a name token.
    // Synsets are exempt: with ~117k of them, fuzzy matching is both slow and
    // wrong-headed — WordNet lookup is by lemma, exact by design (slice 2a).
    if (node.type === "Synset") continue;
    const nameTokens = node.name.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
    for (const qt of tokens) {
      if (qt.length < 4) continue;
      if (nameTokens.some((nt) => levenshtein(qt, nt) <= (nt.length >= 7 ? 2 : 1))) {
        fuzzy.push({ node, score: 1 });
        break;
      }
    }
  }
  exact.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: GraphNode[] = [];
  for (const { node } of [...exact, ...fuzzy]) {
    if (!seen.has(node.id)) {
      seen.add(node.id);
      out.push(node);
    }
  }
  return out;
}

export function interpret(graph: Graph, question: string): QueryIntent {
  const q = question.toLowerCase();
  const matched = matchNodes(graph, question);
  const hasOntologyWord = ONTOLOGY_WORDS.some((w) => q.includes(w));
  const isWhy = /\bwhy\b/.test(q) || /\bcooler\b|\bcolder\b|\bwarmer\b/.test(q);
  const isCycle = CYCLE_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(q)) &&
    matched.some((nd) => nd.type === "Season" || nd.type === "Element");
  const isComparison = /\bcompare\b|\bdifference\b|\bvs\b/.test(q) && matched.length >= 2;
  const isDefinition = DEFINITION_STARTERS.some((s) => q.includes(s));

  let intentType: QueryIntent["intentType"] = "unknown";
  let includeOntology = false;
  let confidenceThreshold = 0.75;
  let traversalDepth = 3;

  if (isCycle || isWhy) {
    intentType = "causal_chain";
    includeOntology = true; // a "why" here asks for the prior-driven reason
    confidenceThreshold = 0.7;
    traversalDepth = 4;
  } else if (hasOntologyWord) {
    intentType = "ontology_explanation";
    includeOntology = true;
    confidenceThreshold = 0.7;
    traversalDepth = 3;
  } else if (isComparison) {
    intentType = "comparison";
    confidenceThreshold = 0.8;
  } else if (isDefinition) {
    intentType = "definition";
    includeOntology = false; // controlled leakage: plain ask, plain answer
    confidenceThreshold = 0.8;
    traversalDepth = 1;
  }

  const domainHint = /\bmath/.test(q)
    ? "mathematics"
    : /\bweather|pressure|meteorolog/.test(q)
      ? "meteorology"
      : /\bmusic|sing|song|pitch/.test(q)
        ? "music"
        : undefined;

  return {
    matchedNodes: matched.map((nd) => nd.id),
    intentType,
    domainHint,
    includeOntology,
    traversalDepth,
    confidenceThreshold,
  };
}

const ONTOLOGY_TERMS = /\b(Yin|Yang|Wood|Fire|Earth|Metal|Water|Wuxing|trigram|hexagram)\b/;

/** Defence-in-depth: strip any sentence leaking ontology terms when not allowed. */
export function guardNoLeakage(text: string): string {
  const sentences = text.split(/(?<=\.)\s+/);
  const kept = sentences.filter((s) => !ONTOLOGY_TERMS.test(s));
  return (kept.length ? kept : sentences.slice(0, 1)).join(" ").trim();
}

/* ------------------------------------------------------------------ */
/* Shared traversal helpers                                            */
/* ------------------------------------------------------------------ */

function stepOf(graph: Graph, edge: GraphEdge, direction: "forward" | "reverse" = "forward"): PathStep {
  return {
    from: edge.from,
    fromName: displayName(graph.getNode(edge.from), edge.from),
    edgeType: edge.type,
    edgeId: edge.id,
    to: edge.to,
    toName: displayName(graph.getNode(edge.to), edge.to),
    confidence: edge.confidence,
    aspect: edge.aspect,
    aspectKey: edge.aspectKey,
    direction,
  };
}

const PROFILE_EDGE_TYPES = [
  "ELEMENT_OF",
  "POLARITY_OF",
  "HAS_POLARITY",
  "HAS_ELEMENT",
  "HAS_TRIGRAM",
  "MAPPED_TO",
  "MUTUALLY_ROOTED_WITH",
] as const;

const CAUSAL_EDGE_TYPES = [
  "ELEMENT_OF",
  "HAS_ELEMENT",
  "POLARITY_OF",
  "HAS_POLARITY",
  "HAS_QUALITY",
  "MAPPED_TO",
  "ASSOCIATED_WITH",
] as const;

/** Direct ontology-profile facts of a seed node, as conclusion payloads. */
function profileFacts(
  graph: Graph,
  nodeId: string,
  threshold: number,
): {
  relation: string;
  objectId: string;
  confidence: number;
  aspect?: string;
  aspectKey?: AspectKey;
  edge: GraphEdge;
  facts?: Record<string, string | number>;
}[] {
  return graph
    .outEdges(nodeId)
    .filter((e) => (PROFILE_EDGE_TYPES as readonly string[]).includes(e.type))
    .filter((e) => passesThreshold(e, threshold))
    .map((e) => ({
      relation: e.type,
      objectId: e.to,
      confidence: e.confidence ?? 1,
      aspect: e.aspect,
      aspectKey: e.aspectKey,
      edge: e,
      // Atomic edges carry no score (§9.4: absolute); the debug renderer
      // needs to know so it doesn't print a confidence for them.
      facts: e.confidence === undefined ? { atomic: 1 } : undefined,
    }));
}

/** The polarity a node derives through its element (winter → Water → Yin). */
function derivedPolarity(
  graph: Graph,
  nodeId: string,
  threshold: number,
): { polarityId: string; viaId: string; confidence: number } | undefined {
  const elEdge = graph
    .outEdges(nodeId, "ELEMENT_OF")
    .filter((e) => passesThreshold(e, threshold))[0];
  if (!elEdge) return undefined;
  const polEdge = graph
    .outEdges(elEdge.to, "POLARITY_OF")
    .filter((e) => passesThreshold(e, threshold))[0];
  if (!polEdge) return undefined;
  return {
    polarityId: polEdge.to,
    viaId: elEdge.to,
    confidence: Math.min(elEdge.confidence ?? 1, polEdge.confidence ?? 1),
  };
}

/** The node's effective polarity: direct edges first, then via element. */
function effectivePolarity(
  graph: Graph,
  nodeId: string,
  threshold: number,
): { polarityId: string; confidence: number; aspect?: string } | undefined {
  const direct = graph
    .outEdges(nodeId)
    .filter(
      (e) =>
        (e.type === "POLARITY_OF" || e.type === "HAS_POLARITY") &&
        passesThreshold(e, threshold),
    );
  if (direct.length > 0) {
    return { polarityId: direct[0].to, confidence: direct[0].confidence ?? 1, aspect: direct[0].aspect };
  }
  const derived = derivedPolarity(graph, nodeId, threshold);
  if (derived) return { polarityId: derived.polarityId, confidence: derived.confidence };
  // Slice 2c (§6): a propagated leaning is the last resort — derived,
  // labelled, and still gated by the caller's threshold (§6.4).
  const st = bestPropagated(graph, nodeId, "HAS_POLARITY", "overall");
  if (st && st.confidence >= threshold) {
    return { polarityId: st.objectId, confidence: st.confidence, aspect: st.aspectKey };
  }
  return undefined;
}

interface HandlerCtx {
  graph: Graph;
  question: string;
  intent: QueryIntent;
  rec: TraceBuilder;
  paths: Path[];
  usedEdges: GraphEdge[];
  use: (edge: GraphEdge) => void;
  threshold: number;
}

function glossOf(graph: Graph, node: GraphNode): string | undefined {
  if (node.type === "Synset") {
    const gloss = node.properties["gloss"];
    return typeof gloss === "string" ? gloss : undefined;
  }
  const defEdge = graph.outEdges(node.id, "DEFINED_AS")[0];
  const entry = defEdge ? graph.getNode(defEdge.to) : undefined;
  return entry?.definition ?? node.summary;
}

/** The display word for a synset in this question (longest lemma present). */
function wordOfSynset(question: string, node: GraphNode): string {
  const lemmas = Array.isArray(node.properties["lemmas"])
    ? (node.properties["lemmas"] as string[])
    : [node.name];
  return (
    [...lemmas]
      .sort((a, b) => b.length - a.length)
      .find((l) => question.toLowerCase().includes(l.toLowerCase())) ?? node.name
  );
}

/* ------------------------------------------------------------------ */
/* Handlers — each returns conclusions; wording is the renderer's job  */
/* ------------------------------------------------------------------ */

function definitionConclusion(ctx: HandlerCtx, node: GraphNode): void {
  const { graph, rec, intent } = ctx;
  if (node.type === "Synset") {
    const word = wordOfSynset(ctx.question, node);
    const sameWord = ctx.intent.matchedNodes
      .map((id) => graph.getNode(id))
      .filter((nd): nd is GraphNode => !!nd && nd.type === "Synset")
      .filter((nd) => wordOfSynset(ctx.question, nd).toLowerCase() === word.toLowerCase()).length;
    rec.addStep({
      kind: "lookup",
      subQuestion: `what does "${word}" mean in this sense?`,
      inputs: [node.id],
      conclusion: {
        subjectId: node.id,
        relation: "GLOSS",
        confidence: 1,
        facts: { word, senseCount: Math.max(1, sameWord), hops: 0 },
      },
    });
    return;
  }
  const defEdge = graph.outEdges(node.id, "DEFINED_AS")[0];
  if (defEdge) ctx.use(defEdge);
  rec.addStep({
    kind: "lookup",
    subQuestion: `what is ${node.name}?`,
    inputs: [node.id],
    paths: defEdge ? [renderPath([stepOf(graph, defEdge)])] : [],
    conclusion: {
      subjectId: node.id,
      relation: defEdge ? "DEFINED_AS" : "SUMMARY",
      objectId: defEdge?.to,
      confidence: 1,
    },
  });
  void intent;
}

function causalSeed(ctx: HandlerCtx, subject: GraphNode, quality: GraphNode): void {
  const { graph, rec, intent, threshold } = ctx;
  const path = graph.findPath(subject.id, quality.id, {
    edgeTypes: [...CAUSAL_EDGE_TYPES],
    confidenceThreshold: threshold,
    maxDepth: intent.traversalDepth + 1,
  });
  if (!path) {
    rec.addStep({
      kind: "join",
      subQuestion: `does ${subject.name} derive ${quality.name}?`,
      inputs: [subject.id, quality.id],
      conclusion: {
        subjectId: subject.id,
        relation: "NO_PATH_TO",
        objectId: quality.id,
        confidence: 1,
        facts: { threshold },
      },
    });
    return;
  }
  path.steps.forEach((s) => {
    const e = graph.allEdges().find((x) => x.id === s.edgeId);
    if (e) ctx.use(e);
  });
  ctx.paths.push(path);
  const viaIds = path.steps.slice(0, -1).map((s) => s.to);
  const confidence = Math.min(
    1,
    ...path.steps.map((s) => s.confidence ?? 1),
  );
  rec.addStep({
    kind: "join",
    subQuestion: `why is ${subject.name} ${quality.name}?`,
    inputs: [subject.id, quality.id],
    paths: [path.text],
    conclusion: {
      subjectId: subject.id,
      relation: "HAS_QUALITY",
      objectId: quality.id,
      confidence,
      viaIds,
    },
  });
  // The chain itself, as supporting profile conclusions (framework/debug).
  for (const s of path.steps.slice(0, -1)) {
    rec.addStep({
      kind: "join",
      inputs: [s.from, s.to],
      paths: [renderPath([s])],
      conclusion: {
        subjectId: s.from,
        relation: s.edgeType,
        objectId: s.to,
        confidence: s.confidence ?? 1,
        aspect: s.aspect,
        aspectKey: s.aspectKey,
      },
    });
  }
}

function causalSynset(ctx: HandlerCtx, candidates: GraphNode[], quality?: GraphNode): void {
  const { graph, rec, intent, threshold } = ctx;
  const wantsCausal = !!quality;
  for (const cand of candidates) {
    const climb = climbToAnchor(graph, cand.id, 6);
    if (!climb) continue;
    const word = wordOfSynset(ctx.question, cand);
    const climbSteps: PathStep[] = climb.chain.map((e, i) => {
      ctx.use(e);
      return { ...stepOf(graph, e), confidence: Math.round(0.9 ** (i + 1) * 100) / 100 };
    });
    ctx.use(climb.bridge);
    const bridgeStep = stepOf(graph, climb.bridge, "reverse");
    const climbPath: Path = {
      steps: [...climbSteps, bridgeStep],
      text: renderPath([...climbSteps, bridgeStep]),
    };
    const hops = climb.chain.length;
    const climbConfidence = Math.round(0.9 ** hops * 0.99 * 100) / 100;
    const climbStep = rec.addStep({
      kind: "climb",
      subQuestion: `what mapped concept does ${word} climb to?`,
      inputs: [cand.id, climb.anchorSynset.id],
      paths: [climbPath.text],
      conclusion: {
        subjectId: cand.id,
        relation: "CLIMBS_TO",
        objectId: climb.anchor.id,
        confidence: climbConfidence,
        viaIds: [climb.anchorSynset.id],
        facts: { hops, anchorSynsetId: climb.anchorSynset.id, word },
      },
    });

    if (wantsCausal && quality) {
      const tail = graph.findPath(climb.anchor.id, quality.id, {
        edgeTypes: [...CAUSAL_EDGE_TYPES],
        confidenceThreshold: threshold,
        maxDepth: intent.traversalDepth + 1,
      });
      if (!tail) continue;
      tail.steps.forEach((s) => {
        const e = graph.allEdges().find((x) => x.id === s.edgeId);
        if (e) ctx.use(e);
      });
      const steps = [...climbSteps, bridgeStep, ...tail.steps];
      const path: Path = { steps, text: renderPath(steps) };
      ctx.paths.push(path);
      const tailConf = Math.min(1, ...tail.steps.map((s) => s.confidence ?? 1));
      rec.addStep({
        kind: "join",
        subQuestion: `why is ${word} ${quality.name}?`,
        inputs: [cand.id, quality.id, ...(climbStep?.conclusion ? [climbStep.conclusion.id] : [])],
        paths: [path.text],
        conclusion: {
          subjectId: cand.id,
          relation: "HAS_QUALITY",
          objectId: quality.id,
          confidence: Math.round(climbConfidence * tailConf * 100) / 100,
          viaIds: [
            climb.anchorSynset.id,
            climb.anchor.id,
            ...tail.steps.slice(0, -1).map((s) => s.to),
          ],
        },
      });
      return;
    }

    // Ontology explanation via the anchor concept.
    const facts = profileFacts(graph, climb.anchor.id, threshold);
    if (facts.length === 0) continue;
    ctx.paths.push(climbPath);
    for (const f of facts) {
      ctx.use(f.edge);
      const steps = [stepOf(graph, f.edge)];
      ctx.paths.push({ steps, text: renderPath(steps) });
      rec.addStep({
        kind: "join",
        inputs: [climb.anchor.id, f.objectId],
        paths: [renderPath(steps)],
        conclusion: {
          subjectId: climb.anchor.id,
          relation: f.relation,
          objectId: f.objectId,
          confidence: f.confidence,
          aspect: f.aspect,
          facts: f.facts,
        },
      });
    }
    return;
  }
  // Slice 2c (§6): no climb reached an anchor — but propagation may
  // have leaned this synset toward a prior (an antonym flip, a part's
  // shared element, an association). Propagated conclusions are
  // derived-kind and carry their decayed confidence; the renderer
  // hedges them by band, per §6.4. Curated paths above keep precedence.
  for (const cand of candidates) {
    if (propagatedSynset(ctx, cand, quality)) return;
  }

  // No candidate's chain reached a mapped anchor.
  const cand = candidates[0];
  if (!cand) return;
  const word = wordOfSynset(ctx.question, cand);
  rec.addStep({
    kind: "climb",
    subQuestion: `does ${word} reach a mapped concept?`,
    inputs: [cand.id],
    conclusion: {
      subjectId: cand.id,
      relation: "NO_ANCHOR",
      confidence: 1,
      facts: { hops: 6, word },
    },
  });
}

/**
 * The propagated profile of a synset (§6): its usable direct
 * statements, recorded as `propagate` steps; when a quality is asked
 * for, the join through the leaned polarity (directly, or via the
 * leaned element's polarity) completes the causal chain. Returns true
 * when any propagated conclusion was emitted.
 */
function propagatedSynset(
  ctx: HandlerCtx,
  cand: GraphNode,
  quality?: GraphNode,
): boolean {
  const { graph, rec } = ctx;
  const word = wordOfSynset(ctx.question, cand);
  const direct = statementsFor(graph, cand.id).filter(
    (s) => s.kind === "direct" && s.mappingStatus === "propagated",
  );
  if (direct.length === 0) return false;
  const polStatement = direct
    .filter((s) => s.relation === "HAS_POLARITY")
    .sort((a, b) => b.confidence - a.confidence)[0];
  const elStatement = direct
    .filter((s) => s.relation === "HAS_ELEMENT")
    .sort((a, b) => b.confidence - a.confidence)[0];

  // The synset's propagated polarity: stated directly, or read off its
  // leaned element (element -> polarity is the atomic POLARITY_OF join).
  let polarityId: string | undefined;
  let polarityConfidence = 0;
  let polarityStatement: PropagatedStatement | undefined;
  if (polStatement) {
    polarityId = polStatement.objectId;
    polarityConfidence = polStatement.confidence;
    polarityStatement = polStatement;
  } else if (elStatement) {
    const polEdge = graph.outEdges(elStatement.objectId, "POLARITY_OF")[0];
    if (polEdge) {
      polarityId = polEdge.to;
      polarityConfidence = Math.round(elStatement.confidence * (polEdge.confidence ?? 1) * 100) / 100;
      polarityStatement = elStatement;
    }
  }

  const emitStatement = (st: PropagatedStatement) => {
    rec.addStep({
      kind: "propagate",
      subQuestion: `what does propagation say about ${word}?`,
      inputs: [cand.id, st.objectId],
      paths: [derivationPathText(graph, st)],
      conclusion: {
        subjectId: cand.id,
        relation: st.relation,
        objectId: st.objectId,
        confidence: st.confidence,
        aspectKey: st.aspectKey,
        facts: {
          propagated: 1,
          statementId: st.id,
          band: st.band,
          derivation: derivationPathText(graph, st),
        },
      },
    });
  };

  if (quality) {
    if (!polarityId || !polarityStatement) return false;
    const qualityPolarity = graph.inEdges(quality.id, "HAS_QUALITY")[0]?.from;
    if (qualityPolarity !== polarityId) return false;
    emitStatement(polarityStatement);
    const viaText =
      polarityStatement.relation === "HAS_ELEMENT"
        ? `${derivationPathText(graph, polarityStatement)} —POLARITY_OF→ ${graph.getNode(polarityId)?.name ?? polarityId} —HAS_QUALITY→ ${quality.name}`
        : `${derivationPathText(graph, polarityStatement)} —HAS_QUALITY→ ${quality.name}`;
    ctx.paths.push({ steps: [], text: viaText });
    rec.addStep({
      kind: "join",
      subQuestion: `why is ${word} ${quality.name}?`,
      inputs: [cand.id, quality.id],
      paths: [viaText],
      conclusion: {
        subjectId: cand.id,
        relation: "HAS_QUALITY",
        objectId: quality.id,
        confidence: polarityConfidence,
        viaIds: [polarityId],
        facts: { propagated: 1, word },
      },
    });
    return true;
  }

  // Ontology profile from propagated statements alone.
  let emitted = false;
  for (const st of [polStatement, elStatement]) {
    if (!st) continue;
    emitStatement(st);
    emitted = true;
  }
  return emitted;
}

function handleCycle(ctx: HandlerCtx, startNode: GraphNode): boolean {
  const { graph, rec, threshold } = ctx;
  let elementEdge: GraphEdge | undefined;
  let elementNode: GraphNode | undefined;
  // §6.5: a concept inherits its element's cycle position in the
  // temporal aspect — the classification may be atomic (ELEMENT_OF)
  // or an acquired mapping (HAS_ELEMENT, e.g. derivative -> Fire).
  let classificationConfidence = 1;
  if (startNode.type === "Element") {
    elementNode = startNode;
  } else {
    elementEdge =
      graph.outEdges(startNode.id, "ELEMENT_OF")[0] ??
      graph.outEdges(startNode.id, "HAS_ELEMENT").filter((e) => passesThreshold(e, threshold))[0];
    elementNode = elementEdge ? graph.getNode(elementEdge.to) : undefined;
    classificationConfidence = elementEdge?.confidence ?? 1;
  }
  const genEdge = elementNode
    ? graph.outEdges(elementNode.id, "MUTUAL_GENERATION").filter((e) => passesThreshold(e, threshold))[0]
    : undefined;
  const nextElement = genEdge ? graph.getNode(genEdge.to) : undefined;
  const nextSeasonEdge = nextElement
    ? graph.inEdges(nextElement.id, "ELEMENT_OF").find((e) => {
        const src = graph.getNode(e.from);
        return src?.type === "Season";
      })
    : undefined;
  const nextSeason = nextSeasonEdge ? graph.getNode(nextSeasonEdge.from) : undefined;
  if (!elementNode || !genEdge || !nextElement) return false;
  const steps: PathStep[] = [];
  if (elementEdge) {
    ctx.use(elementEdge);
    steps.push(stepOf(graph, elementEdge));
    rec.addStep({
      kind: "join",
      inputs: [startNode.id, elementNode.id],
      paths: [renderPath([stepOf(graph, elementEdge)])],
      conclusion: {
        subjectId: startNode.id,
        relation: elementEdge.type,
        objectId: elementNode.id,
        confidence: elementEdge.confidence ?? 1,
        aspectKey: elementEdge.aspectKey,
      },
    });
  }
  ctx.use(genEdge);
  steps.push(stepOf(graph, genEdge));
  rec.addStep({
    kind: "join",
    inputs: [elementNode.id, nextElement.id],
    paths: [renderPath([stepOf(graph, genEdge)])],
    conclusion: {
      subjectId: elementNode.id,
      relation: "MUTUAL_GENERATION",
      objectId: nextElement.id,
      confidence: 1,
    },
  });
  if (nextSeasonEdge && nextSeason) {
    ctx.use(nextSeasonEdge);
    steps.push(stepOf(graph, nextSeasonEdge, "reverse"));
    rec.addStep({
      kind: "join",
      inputs: [nextSeason.id, nextElement.id],
      paths: [renderPath([stepOf(graph, nextSeasonEdge, "reverse")])],
      conclusion: {
        subjectId: nextSeason.id,
        relation: "ELEMENT_OF",
        objectId: nextElement.id,
        confidence: 1,
      },
    });
  }
  const path: Path = { steps, text: renderPath(steps) };
  ctx.paths.push(path);
  rec.addStep({
    kind: "join",
    subQuestion: `what follows ${startNode.name}?`,
    inputs: [startNode.id, (nextSeason ?? nextElement).id],
    paths: [path.text],
    conclusion: {
      subjectId: startNode.id,
      relation: "FOLLOWED_BY",
      objectId: (nextSeason ?? nextElement).id,
      // §6.5: a temporal statement is derived, not stored — its
      // confidence is the classification's confidence × 0.8, and it
      // never becomes a classification itself.
      confidence: Math.round(classificationConfidence * 0.8 * 1000) / 1000,
      aspectKey: "temporal",
      viaIds: [elementNode.id, nextElement.id],
    },
  });
  return true;
}

function handleCausal(ctx: HandlerCtx): void {
  const { graph, intent } = ctx;
  const matched = intent.matchedNodes
    .map((id) => graph.getNode(id))
    .filter((x): x is GraphNode => !!x);
  const quality = matched.find((nd) => nd.type === "Quality");
  if (intent.variant === "cycle" || CYCLE_WORDS.some((w) => ctx.question.toLowerCase().includes(w))) {
    // A routed cycle intent may start from any classified concept
    // (§6.5 concept-level temporal reasoning); the legacy classifier
    // path keeps its Season/Element starts.
    const startNode =
      matched.find((nd) => nd.type === "Season") ??
      matched.find((nd) => nd.type === "Element") ??
      (intent.variant === "cycle" ? matched[0] : undefined);
    if (startNode && handleCycle(ctx, startNode)) return;
  }
  const SUBJECT_RANK: Record<string, number> = {
    Concept: 0,
    Season: 1,
    TimeOfDay: 1,
    Correspondence: 2,
    Trigram: 2,
    Synset: 2,
    Element: 3,
    Polarity: 4,
    Quality: 5,
  };
  const subject =
    [...matched].sort((a, b) => (SUBJECT_RANK[a.type] ?? 9) - (SUBJECT_RANK[b.type] ?? 9))[0] ??
    matched[0];
  if (!subject) return;
  if (subject.type === "Synset") {
    const otherNames = new Set(
      matched.filter((nd) => nd.type !== "Synset").map((nd) => nd.name.toLowerCase()),
    );
    let candidates = matched.filter(
      (nd) =>
        nd.type === "Synset" &&
        !(Array.isArray(nd.properties["lemmas"])
          ? (nd.properties["lemmas"] as string[])
          : []
        ).some((l) => otherNames.has(l.toLowerCase())),
    );
    if (candidates.length === 0) candidates = [subject];
    candidates = [...candidates].sort(
      (a, b) =>
        (mappedConceptForSynset(graph, a.id) ? 0 : 1) - (mappedConceptForSynset(graph, b.id) ? 0 : 1),
    );
    causalSynset(ctx, candidates, quality && subject.id !== quality.id ? quality : undefined);
    return;
  }
  if (quality && subject.id !== quality.id) {
    causalSeed(ctx, subject, quality);
    return;
  }
  // A "why" with no quality target degrades to the ontology profile.
  handleOntology(ctx);
}

function handleOntology(ctx: HandlerCtx): void {
  const { graph, rec, intent, threshold } = ctx;
  const matched = intent.matchedNodes
    .map((id) => graph.getNode(id))
    .filter((x): x is GraphNode => !!x);
  // Subject choice mirrors the causal handler's ranking: framework terms
  // the question merely mentions ("the yin yang polarity of bass") are
  // not the subject — the concept being profiled is.
  const SUBJECT_RANK: Record<string, number> = {
    Concept: 0,
    Season: 1,
    TimeOfDay: 1,
    Correspondence: 2,
    Trigram: 2,
    Synset: 2,
    Element: 3,
    Polarity: 4,
    Quality: 5,
  };
  const subject =
    [...matched].sort((a, b) => (SUBJECT_RANK[a.type] ?? 9) - (SUBJECT_RANK[b.type] ?? 9))[0] ??
    matched[0];
  if (!subject) return;

  if (intent.variant === "sense-bridge") {
    // §7.5 Fire branch 3: the phenomenon synset AND its anchor concept.
    const synset = matched.find((nd) => nd.type === "Synset");
    const concept = matched.find((nd) => nd.type !== "Synset");
    if (synset) definitionConclusion(ctx, synset);
    if (concept && synset) {
      const bridge = graph
        .outEdges(concept.id, "MAPPED_TO")
        .find((e) => e.to === synset.id);
      if (bridge) {
        ctx.use(bridge);
        rec.addStep({
          kind: "join",
          inputs: [concept.id, synset.id],
          paths: [renderPath([stepOf(graph, bridge)])],
          conclusion: {
            subjectId: concept.id,
            relation: "MAPPED_TO",
            objectId: synset.id,
            confidence: bridge.confidence ?? 1,
          },
        });
      }
    }
    if (concept) emitProfile(ctx, concept);
    return;
  }

  if (intent.variant === "incoming-classification") {
    // §7.5 Fire branch 2: members are found by walking edges INTO the node.
    for (const edgeType of ["ELEMENT_OF", "HAS_ELEMENT"] as const) {
      for (const e of graph.inEdges(subject.id, edgeType)) {
        if (!passesThreshold(e, threshold)) continue;
        ctx.use(e);
        rec.addStep({
          kind: "join",
          subQuestion: `what is classed under ${subject.name}?`,
          inputs: [e.from, subject.id],
          paths: [renderPath([stepOf(graph, e, "reverse")])],
          conclusion: {
            subjectId: e.from,
            relation: edgeType,
            objectId: subject.id,
            confidence: e.confidence ?? 1,
            aspect: e.aspect,
            facts: { direction: "incoming" },
          },
        });
      }
    }
    return;
  }

  if (intent.variant === "polarity-check") {
    const asked = matched.find((nd) => nd.type === "Polarity");
    const target = matched.find((nd) => nd.type !== "Polarity") ?? subject;
    let conceptId: string | undefined;
    if (target.type === "Synset") {
      conceptId = mappedConceptForSynset(graph, target.id)?.id;
      if (!conceptId) {
        const climb = climbToAnchor(graph, target.id, 6);
        if (climb) {
          conceptId = climb.anchor.id;
          rec.addStep({
            kind: "climb",
            inputs: [target.id, climb.anchorSynset.id],
            conclusion: {
              subjectId: target.id,
              relation: "CLIMBS_TO",
              objectId: climb.anchor.id,
              confidence: Math.round(0.9 ** climb.chain.length * 0.99 * 100) / 100,
              viaIds: [climb.anchorSynset.id],
              facts: { hops: climb.chain.length, anchorSynsetId: climb.anchorSynset.id },
            },
          });
        }
      }
    } else {
      conceptId = target.id;
    }
    const pol = conceptId ? effectivePolarity(graph, conceptId, threshold) : undefined;
    rec.addStep({
      kind: "join",
      subQuestion: `is ${target.name} ${asked?.name ?? ""}?`,
      inputs: [target.id, ...(asked ? [asked.id] : [])],
      conclusion: {
        subjectId: target.id,
        relation: "POLARITY_CHECK",
        objectId: asked?.id,
        confidence: 1,
        facts: {
          verdict: !asked || !pol ? "unknown" : pol.polarityId === asked.id ? "yes" : "no",
          ...(pol ? { actualPolarity: pol.polarityId } : {}),
          ...(conceptId ? { concept: conceptId } : {}),
        },
      },
    });
    return;
  }

  if (subject.type === "Synset") {
    // Legacy sense selection is ontological, not statistical: try the
    // matched senses mapped-first and let the climb discriminate (hail
    // the greeting climbs nowhere; hail the ice pellets reaches
    // precipitation). Router-fed intents arrive with one sense resolved.
    let candidates = matched.filter((nd) => nd.type === "Synset");
    if (candidates.length === 0) candidates = [subject];
    candidates = [...candidates].sort(
      (a, b) =>
        (mappedConceptForSynset(graph, a.id) ? 0 : 1) - (mappedConceptForSynset(graph, b.id) ? 0 : 1),
    );
    causalSynset(ctx, candidates, undefined);
    return;
  }
  emitProfile(ctx, subject);
}

function emitProfile(ctx: HandlerCtx, subject: GraphNode): void {
  const { graph, rec, threshold } = ctx;
  const facts = profileFacts(graph, subject.id, threshold);
  if (facts.length === 0) {
    rec.addStep({
      kind: "join",
      subQuestion: `how does ${subject.name} fit the ontology?`,
      inputs: [subject.id],
      conclusion: {
        subjectId: subject.id,
        relation: "NO_MAPPING",
        confidence: 1,
        facts: { threshold },
      },
    });
    return;
  }
  for (const f of facts) {
    ctx.use(f.edge);
    const steps = [stepOf(graph, f.edge)];
    ctx.paths.push({ steps, text: renderPath(steps) });
    rec.addStep({
      kind: "join",
      inputs: [subject.id, f.objectId],
      paths: [renderPath(steps)],
      conclusion: {
        subjectId: subject.id,
        relation: f.relation,
        objectId: f.objectId,
        confidence: f.confidence,
        aspect: f.aspect,
        aspectKey: f.aspectKey,
        facts: f.facts,
      },
    });
  }
}

function handleCorrespondence(ctx: HandlerCtx): void {
  const { graph, rec, intent } = ctx;
  const subject = intent.matchedNodes
    .map((id) => graph.getNode(id))
    .find((x): x is GraphNode => !!x);
  if (!subject) return;
  if (subject.type === "Correspondence") {
    // Reverse: the value's outgoing CORRESPONDS_TO names its element.
    for (const e of graph.outEdges(subject.id, "CORRESPONDS_TO")) {
      ctx.use(e);
      rec.addStep({
        kind: "correspondence",
        subQuestion: `which element does ${subject.name} correspond to?`,
        inputs: [subject.id, e.to],
        paths: [renderPath([stepOf(graph, e)])],
        conclusion: {
          subjectId: subject.id,
          relation: "CORRESPONDS_TO",
          objectId: e.to,
          confidence: 1,
          facts: { category: String(subject.properties["category"] ?? "") },
        },
      });
    }
    if (intent.variant === "compose") {
      // §6.9: composition walks the element's whole row outward — the
      // associations are derived on the spot, at the classification's
      // confidence (atomic here, so unhedged), never stored.
      const comp = compose(graph, subject.id, intent.category);
      if (comp) {
        for (const entry of comp.entries) {
          rec.addStep({
            kind: "compose",
            subQuestion: `what does ${subject.name} reach through ${graph.getNode(comp.elementId)?.name ?? comp.elementId}?`,
            inputs: [subject.id, entry.nodeId],
            conclusion: {
              subjectId: entry.nodeId,
              relation: "COMPOSE_ENTRY",
              objectId: comp.elementId,
              confidence: comp.confidence,
              aspectKey: comp.aspectKey,
              facts: {
                category: entry.category,
                sourceTerm: subject.id,
                analogy: comp.analogy ? 1 : 0,
              },
            },
          });
        }
      }
    }
    return;
  }
  // Forward: incoming CORRESPONDS_TO edges grouped by category (§7.7).
  const byCategory = new Map<string, GraphEdge[]>();
  for (const e of graph.inEdges(subject.id, "CORRESPONDS_TO")) {
    const src = graph.getNode(e.from);
    const cat = String(src?.properties["category"] ?? "other");
    if (intent.category && cat !== intent.category) continue;
    const list = byCategory.get(cat);
    if (list) list.push(e);
    else byCategory.set(cat, [e]);
  }
  for (const [cat, edges] of byCategory) {
    for (const e of edges) {
      ctx.use(e);
      rec.addStep({
        kind: "correspondence",
        subQuestion: `what ${cat} corresponds to ${subject.name}?`,
        inputs: [e.from, subject.id],
        paths: [renderPath([stepOf(graph, e, "reverse")])],
        conclusion: {
          subjectId: e.from,
          relation: "CORRESPONDS_TO",
          objectId: subject.id,
          confidence: 1,
          facts: { category: cat },
        },
      });
    }
  }
  if (!intent.category) {
    // Full profile: seasons / times of day pointing into the element are
    // ELEMENT_OF facts, reported as their own labelled groups (§7.7).
    for (const e of graph.inEdges(subject.id, "ELEMENT_OF")) {
      const src = graph.getNode(e.from);
      if (!src || (src.type !== "Season" && src.type !== "TimeOfDay")) continue;
      ctx.use(e);
      rec.addStep({
        kind: "correspondence",
        subQuestion: `what season/time belongs to ${subject.name}?`,
        inputs: [e.from, subject.id],
        paths: [renderPath([stepOf(graph, e, "reverse")])],
        conclusion: {
          subjectId: e.from,
          relation: "ELEMENT_OF",
          objectId: subject.id,
          confidence: 1,
          facts: { category: src.type === "Season" ? "season" : "time of day" },
        },
      });
    }
  }
}

function handleAntonym(ctx: HandlerCtx): void {
  const { graph, rec, intent } = ctx;
  let synset = intent.matchedNodes
    .map((id) => graph.getNode(id))
    .find((nd): nd is GraphNode => !!nd && nd.type === "Synset");
  const subjectNode = intent.matchedNodes
    .map((id) => graph.getNode(id))
    .find((x): x is GraphNode => !!x);
  if (!synset && subjectNode) {
    // A seed node (e.g. the cold Quality): its MAPPED_TO synset carries
    // the lexical antonym edges.
    const bridge = graph.outEdges(subjectNode.id, "MAPPED_TO")[0];
    synset = bridge ? graph.getNode(bridge.to) : undefined;
    if (bridge) ctx.use(bridge);
  }
  if (!synset) return;
  const edges = [
    ...graph.outEdges(synset.id, "ANTONYM_OF"),
    ...graph.inEdges(synset.id, "ANTONYM_OF"),
  ];
  if (edges.length === 0) {
    rec.addStep({
      kind: "antonym",
      inputs: [synset.id],
      conclusion: { subjectId: synset.id, relation: "NO_ANTONYM", confidence: 1 },
    });
    return;
  }
  const seen = new Set<string>();
  for (const e of edges) {
    const otherId = e.from === synset.id ? e.to : e.from;
    if (seen.has(otherId)) continue;
    seen.add(otherId);
    ctx.use(e);
    const [srcLemma, tgtLemma] = (e.aspect ?? "").split(" ↔ ");
    const outgoing = e.from === synset.id;
    rec.addStep({
      kind: "antonym",
      subQuestion: `what is the opposite of ${synset.name}?`,
      inputs: [synset.id, otherId],
      paths: [renderPath([stepOf(graph, e, outgoing ? "forward" : "reverse")])],
      conclusion: {
        subjectId: synset.id,
        relation: "ANTONYM_OF",
        objectId: otherId,
        confidence: 1,
        facts: {
          sourceLemma: (outgoing ? srcLemma : tgtLemma) ?? synset.name,
          targetLemma: (outgoing ? tgtLemma : srcLemma) ?? graph.getNode(otherId)?.name ?? otherId,
        },
      },
    });
  }
}

function handlePartOf(ctx: HandlerCtx): void {
  const { graph, rec, intent } = ctx;
  const subject = intent.matchedNodes
    .map((id) => graph.getNode(id))
    .find((x): x is GraphNode => !!x);
  if (!subject) return;
  const variant = intent.variant ?? "whole";
  if (variant === "check") {
    const other = intent.matchedNodes
      .map((id) => graph.getNode(id))
      .filter((x): x is GraphNode => !!x)[1];
    if (!other) return;
    const whole = graph
      .inEdges(subject.id, "PART_OF")
      .some((e) => e.from === other.id);
    const component = graph
      .outEdges(subject.id, "PART_OF")
      .some((e) => e.to === other.id);
    rec.addStep({
      kind: "partof",
      inputs: [subject.id, other.id],
      conclusion: {
        subjectId: subject.id,
        relation: "PART_OF_CHECK",
        objectId: other.id,
        confidence: 1,
        facts: { verdict: whole ? "part-of" : component ? "has-part" : "none" },
      },
    });
    return;
  }
  // Orientation is pinned to the data (§7.7): PART_OF edges run
  // whole → component. "What is X part of?" reads INCOMING edges;
  // "what parts does X have?" reads OUTGOING edges.
  const edges =
    variant === "parts"
      ? graph.outEdges(subject.id, "PART_OF")
      : graph.inEdges(subject.id, "PART_OF");
  if (edges.length === 0) {
    rec.addStep({
      kind: "partof",
      inputs: [subject.id],
      conclusion: {
        subjectId: subject.id,
        relation: "NO_PART",
        confidence: 1,
        facts: { direction: variant === "parts" ? "component" : "whole" },
      },
    });
    return;
  }
  for (const e of edges) {
    ctx.use(e);
    const otherId = variant === "parts" ? e.to : e.from;
    rec.addStep({
      kind: "partof",
      subQuestion:
        variant === "parts"
          ? `what parts does ${subject.name} have?`
          : `what is ${subject.name} part of?`,
      inputs: [subject.id, otherId],
      paths: [renderPath([stepOf(graph, e, variant === "parts" ? "forward" : "reverse")])],
      conclusion: {
        subjectId: subject.id,
        relation: "PART_OF",
        objectId: otherId,
        confidence: 1,
        facts: {
          subtype: e.aspect ?? "part",
          direction: variant === "parts" ? "component" : "whole",
        },
      },
    });
  }
}

/** Resolve a relatedness/comparison subject to its concept + profile. */
function profileConclusion(
  ctx: HandlerCtx,
  node: GraphNode,
): { conceptId: string; elementId?: string; polarityId?: string; qualityId?: string } {
  const { graph, rec, threshold } = ctx;
  let conceptId = node.id;
  if (node.type === "Synset") {
    const mapped = mappedConceptForSynset(graph, node.id);
    if (mapped) {
      conceptId = mapped.id;
    } else {
      const climb = climbToAnchor(graph, node.id, 6);
      if (climb) {
        conceptId = climb.anchor.id;
        rec.addStep({
          kind: "climb",
          inputs: [node.id, climb.anchorSynset.id],
          conclusion: {
            subjectId: node.id,
            relation: "CLIMBS_TO",
            objectId: climb.anchor.id,
            confidence: Math.round(0.9 ** climb.chain.length * 0.99 * 100) / 100,
            viaIds: [climb.anchorSynset.id],
            facts: { hops: climb.chain.length, anchorSynsetId: climb.anchorSynset.id },
          },
        });
      }
    }
  }
  const concept = graph.getNode(conceptId);
  const viaIds: string[] = [];
  let elementId: string | undefined;
  let polarityId: string | undefined;
  let qualityId: string | undefined;
  if (concept) {
    const el = graph
      .outEdges(conceptId, "ELEMENT_OF")
      .filter((e) => passesThreshold(e, threshold))[0];
    if (el) {
      elementId = el.to;
      viaIds.push(el.to);
    } else if (concept.type === "Element") {
      elementId = conceptId;
    }
    const pol = effectivePolarity(graph, conceptId, threshold);
    if (pol) {
      polarityId = pol.polarityId;
      if (!viaIds.includes(pol.polarityId)) viaIds.push(pol.polarityId);
    }
    // The subject's signature quality: shortest derivation to any Quality.
    for (const q of graph.allNodes().filter((nd) => nd.type === "Quality")) {
      const p = graph.findPath(conceptId, q.id, {
        edgeTypes: [...CAUSAL_EDGE_TYPES],
        confidenceThreshold: threshold,
        maxDepth: 4,
      });
      if (p && p.steps.length > 0) {
        qualityId = q.id;
        if (!viaIds.includes(q.id)) viaIds.push(q.id);
        break;
      }
    }
  }
  rec.addStep({
    kind: "join",
    subQuestion: `what is the profile of ${node.name}?`,
    inputs: [node.id, conceptId],
    conclusion: {
      subjectId: node.id,
      relation: "PROFILE",
      objectId: conceptId !== node.id ? conceptId : undefined,
      confidence: 1,
      viaIds,
    },
  });
  return { conceptId, elementId, polarityId, qualityId };
}

const RELATE_EDGE_TYPES = [
  "ELEMENT_OF",
  "POLARITY_OF",
  "HAS_POLARITY",
  "HAS_ELEMENT",
  "MUTUAL_GENERATION",
  "MUTUAL_RESTRAINT",
] as const;

/** Bidirectional shortest path between two concept ids (relatedness §7.7). */
function relatePath(
  graph: Graph,
  aId: string,
  bId: string,
  threshold: number,
  maxDepth = 4,
): Path | null {
  if (aId === bId) return null;
  const allowed = new Set<string>(RELATE_EDGE_TYPES);
  const visited = new Map<string, PathStep[]>();
  visited.set(aId, []);
  let frontier = [aId];
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (const cur of frontier) {
      const baseSteps = visited.get(cur)!;
      const hops: { edge: GraphEdge; direction: "forward" | "reverse" }[] = [
        ...graph.outEdges(cur).map((edge) => ({ edge, direction: "forward" as const })),
        ...graph.inEdges(cur).map((edge) => ({ edge, direction: "reverse" as const })),
      ];
      for (const { edge, direction } of hops) {
        if (!allowed.has(edge.type) || !passesThreshold(edge, threshold)) continue;
        const neighbour = direction === "forward" ? edge.to : edge.from;
        if (visited.has(neighbour)) continue;
        const steps = [...baseSteps, stepOf(graph, edge, direction)];
        if (neighbour === bId) return { steps, text: renderPath(steps) };
        visited.set(neighbour, steps);
        next.push(neighbour);
      }
    }
    frontier = next;
  }
  return null;
}

function relateTwo(
  ctx: HandlerCtx,
  a: GraphNode,
  b: GraphNode,
): { pa: ReturnType<typeof profileConclusion>; pb: ReturnType<typeof profileConclusion> } {
  const { graph, rec, threshold } = ctx;
  const pa = profileConclusion(ctx, a);
  const pb = profileConclusion(ctx, b);
  // (1) a direct curated/ontology relation between the resolved concepts,
  // including a path through the generation/restraint cycles.
  const path = relatePath(graph, pa.conceptId, pb.conceptId, threshold);
  if (path) {
    path.steps.forEach((s) => {
      const e = graph.allEdges().find((x) => x.id === s.edgeId);
      if (e) ctx.use(e);
    });
    ctx.paths.push(path);
    rec.addStep({
      kind: "relate",
      subQuestion: `how are ${a.name} and ${b.name} related?`,
      inputs: [a.id, b.id],
      paths: [path.text],
      conclusion: {
        subjectId: a.id,
        relation: "RELATED_VIA",
        objectId: b.id,
        confidence: 1,
        viaIds: path.steps.slice(0, -1).map((s) => (s.direction === "forward" ? s.to : s.from)),
        facts: { pathRelation: path.steps.map((s) => s.edgeType).join(">") },
      },
    });
    return { pa, pb };
  }
  // (2) a shared or opposed prior join.
  if (pa.elementId && pa.elementId === pb.elementId) {
    rec.addStep({
      kind: "relate",
      inputs: [a.id, b.id],
      conclusion: {
        subjectId: a.id,
        relation: "SHARED_PRIOR",
        objectId: b.id,
        confidence: 1,
        viaIds: [pa.elementId],
      },
    });
    return { pa, pb };
  }
  if (pa.polarityId && pb.polarityId && pa.polarityId !== pb.polarityId) {
    rec.addStep({
      kind: "relate",
      inputs: [a.id, b.id],
      conclusion: {
        subjectId: a.id,
        relation: "OPPOSED_PRIOR",
        objectId: b.id,
        confidence: 1,
        viaIds: [pa.polarityId, pb.polarityId],
      },
    });
    return { pa, pb };
  }
  if (pa.polarityId && pa.polarityId === pb.polarityId) {
    rec.addStep({
      kind: "relate",
      inputs: [a.id, b.id],
      conclusion: {
        subjectId: a.id,
        relation: "SHARED_PRIOR",
        objectId: b.id,
        confidence: 1,
        viaIds: [pa.polarityId],
      },
    });
    return { pa, pb };
  }
  // (3) a direct lexical relation between two synsets.
  if (a.type === "Synset" && b.type === "Synset") {
    const lexical = [...graph.outEdges(a.id), ...graph.inEdges(a.id)].find(
      (e) =>
        (e.from === a.id && e.to === b.id) || (e.from === b.id && e.to === a.id),
    );
    if (lexical) {
      ctx.use(lexical);
      rec.addStep({
        kind: "relate",
        inputs: [a.id, b.id],
        paths: [renderPath([stepOf(graph, lexical)])],
        conclusion: {
          subjectId: a.id,
          relation: lexical.type,
          objectId: b.id,
          confidence: 1,
        },
      });
      return { pa, pb };
    }
    // (4) a WordNet common hypernym.
    const ancestorsOf = (id: string): Map<string, number> => {
      const out = new Map<string, number>([[id, 0]]);
      let frontier = [id];
      for (let d = 1; d <= 6; d++) {
        const next: string[] = [];
        for (const f of frontier) {
          for (const e of graph.outEdges(f, "IS_A")) {
            if (!out.has(e.to)) {
              out.set(e.to, d);
              next.push(e.to);
            }
          }
        }
        frontier = next;
      }
      return out;
    };
    const ancA = ancestorsOf(a.id);
    const ancB = ancestorsOf(b.id);
    let best: { id: string; total: number } | undefined;
    for (const [id, d] of ancA) {
      const db = ancB.get(id);
      if (db !== undefined && (!best || d + db < best.total)) best = { id, total: d + db };
    }
    if (best) {
      rec.addStep({
        kind: "relate",
        inputs: [a.id, b.id],
        conclusion: {
          subjectId: a.id,
          relation: "COMMON_HYPERNYM",
          objectId: b.id,
          confidence: 0.8,
          viaIds: [best.id],
        },
      });
      return { pa, pb };
    }
  }
  rec.addStep({
    kind: "relate",
    inputs: [a.id, b.id],
    conclusion: {
      subjectId: a.id,
      relation: "NO_RELATION",
      objectId: b.id,
      confidence: 1,
    },
  });
  return { pa, pb };
}

function handleRelatedness(ctx: HandlerCtx): void {
  const { graph, intent } = ctx;
  const [a, b] = intent.matchedNodes
    .map((id) => graph.getNode(id))
    .filter((x): x is GraphNode => !!x);
  if (!a || !b) return;
  relateTwo(ctx, a, b);
}

function handleComparison(ctx: HandlerCtx): void {
  const { graph, rec } = ctx;
  const subjects = ctx.intent.matchedNodes
    .map((id) => graph.getNode(id))
    .filter((x): x is GraphNode => !!x)
    .filter((nd) => nd.type !== "Quality");
  const profiles: ReturnType<typeof profileConclusion>[] = [];
  for (const subject of subjects) {
    if (rec.boundHit) break;
    definitionConclusion(ctx, subject);
    if (rec.boundHit) break;
    profiles.push(profileConclusion(ctx, subject));
  }
  if (subjects.length >= 2 && !rec.boundHit) {
    const { pa, pb } = relateTwoPassive(ctx, subjects[0], subjects[1], profiles[0], profiles[1]);
    void pa;
    void pb;
    const [a, b] = subjects;
    const contrastVia = [
      ...(profiles[0]?.elementId ? [profiles[0].elementId] : []),
      ...(profiles[0]?.polarityId ? [profiles[0].polarityId] : []),
      ...(profiles[1]?.elementId ? [profiles[1].elementId] : []),
      ...(profiles[1]?.polarityId ? [profiles[1].polarityId] : []),
    ];
    rec.addStep({
      kind: "join",
      subQuestion: `how do ${a.name} and ${b.name} contrast?`,
      inputs: [a.id, b.id],
      conclusion: {
        subjectId: a.id,
        relation: "CONTRASTS_WITH",
        objectId: b.id,
        confidence: 1,
        viaIds: [...new Set(contrastVia)],
      },
    });
  }
}

/** Relatedness search reusing already-computed profiles (§8.1 synthesis). */
function relateTwoPassive(
  ctx: HandlerCtx,
  a: GraphNode,
  b: GraphNode,
  pa: ReturnType<typeof profileConclusion>,
  pb: ReturnType<typeof profileConclusion>,
): { pa: typeof pa; pb: typeof pb } {
  const { graph, rec, threshold } = ctx;
  const path = relatePath(graph, pa.conceptId, pb.conceptId, threshold);
  if (path) {
    path.steps.forEach((s) => {
      const e = graph.allEdges().find((x) => x.id === s.edgeId);
      if (e) ctx.use(e);
    });
    ctx.paths.push(path);
    rec.addStep({
      kind: "relate",
      subQuestion: `how are ${a.name} and ${b.name} related?`,
      inputs: [a.id, b.id],
      paths: [path.text],
      conclusion: {
        subjectId: a.id,
        relation: "RELATED_VIA",
        objectId: b.id,
        confidence: 1,
        viaIds: path.steps.slice(0, -1).map((s) => (s.direction === "forward" ? s.to : s.from)),
        facts: { pathRelation: path.steps.map((s) => s.edgeType).join(">") },
      },
    });
  }
  return { pa, pb };
}

function handleDefinition(ctx: HandlerCtx): void {
  const { graph, intent } = ctx;
  const matched = intent.matchedNodes
    .map((id) => graph.getNode(id))
    .filter((x): x is GraphNode => !!x);
  const SUBJECT_RANK: Record<string, number> = {
    Concept: 0,
    Season: 1,
    TimeOfDay: 1,
    Correspondence: 2,
    Trigram: 2,
    Synset: 2,
    Element: 3,
    Polarity: 4,
    Quality: 5,
  };
  const subject =
    [...matched].sort((x, y) => (SUBJECT_RANK[x.type] ?? 9) - (SUBJECT_RANK[y.type] ?? 9))[0] ??
    matched[0];
  if (subject) definitionConclusion(ctx, subject);
}

/* ------------------------------------------------------------------ */
/* Engine handlers (slice 2c, §6.5–§6.9)                               */
/* ------------------------------------------------------------------ */

/**
 * §6.5 restraint, use 1 — moderation reasoning. "What keeps Fire in
 * check?" is answered by the `restrainedBy` OPERATOR over the cycle
 * edges: no stored Fire->Water fact is consulted (there is none).
 */
function handleRestraint(ctx: HandlerCtx): void {
  const { graph, rec, intent } = ctx;
  const subject = intent.matchedNodes
    .map((id) => graph.getNode(id))
    .find((x): x is GraphNode => !!x);
  if (!subject) return;
  let elementId: string | undefined;
  if (subject.type === "Element") {
    elementId = subject.id;
  } else {
    const el =
      graph.outEdges(subject.id, "ELEMENT_OF")[0] ??
      graph.outEdges(subject.id, "HAS_ELEMENT")[0];
    elementId = el?.to ?? bestPropagated(graph, subject.id, "HAS_ELEMENT", "overall")?.objectId;
    if (el) ctx.use(el);
  }
  const restrainer = elementId ? restrainedBy(graph, elementId) : undefined;
  const edge =
    restrainer && elementId
      ? graph.outEdges(restrainer, "MUTUAL_RESTRAINT").find((e) => e.to === elementId)
      : undefined;
  if (!elementId || !restrainer || !edge) {
    rec.addStep({
      kind: "engine",
      subQuestion: `what keeps ${subject.name} in check?`,
      inputs: [subject.id],
      conclusion: { subjectId: subject.id, relation: "NO_RESTRAINT", confidence: 1 },
    });
    return;
  }
  ctx.use(edge);
  rec.addStep({
    kind: "engine",
    subQuestion: `what keeps ${subject.name} in check?`,
    inputs: [subject.id, restrainer],
    paths: [renderPath([stepOf(graph, edge, "reverse")])],
    conclusion: {
      subjectId: subject.id,
      relation: "RESTRAINED_BY",
      objectId: restrainer,
      confidence: 1,
      viaIds: [elementId],
      facts: { element: elementId, operator: "restrainedBy", cycle: "restraint" },
    },
  });
}

/**
 * §6.7 degree comparison: two seasons, ONE aspect, ordering by band
 * then proportion, with the higher side's turning point cited when it
 * has one in that aspect. The profiles are atomic data; the verdict is
 * a derivation over them.
 */
function handleDegreeCompare(ctx: HandlerCtx): void {
  const { graph, rec, intent } = ctx;
  const [a, b] = intent.matchedNodes
    .map((id) => graph.getNode(id))
    .filter((x): x is GraphNode => !!x);
  if (!a || !b) return;
  const aspectKey = (intent.category as AspectKey | undefined) ?? "light";
  const polarityId = intent.variant === "yang" ? "yang" : "yin";
  const cmp = compareDegrees(graph, a.id, b.id, aspectKey, polarityId);
  if (!cmp) {
    rec.addStep({
      kind: "engine",
      subQuestion: `are ${a.name} and ${b.name} comparable in the ${aspectKey} aspect?`,
      inputs: [a.id, b.id],
      conclusion: {
        subjectId: a.id,
        relation: "NO_DEGREE_PROFILE",
        objectId: b.id,
        confidence: 1,
        facts: { aspect: aspectKey },
      },
    });
    return;
  }
  rec.addStep({
    kind: "engine",
    subQuestion: `is ${a.name} more ${polarityId} than ${b.name} in the ${aspectKey} aspect?`,
    inputs: [a.id, b.id],
    conclusion: {
      subjectId: a.id,
      relation: "DEGREE_COMPARE",
      objectId: b.id,
      confidence: 1,
      aspectKey,
      facts: {
        aspect: aspectKey,
        polarity: polarityId,
        aShare: Math.round(cmp.aShare * 100) / 100,
        bShare: Math.round(cmp.bShare * 100) / 100,
        aBand: cmp.aBand,
        bBand: cmp.bBand,
        verdict: cmp.verdict,
        ...(cmp.turningPoint
          ? { turningPoint: cmp.turningPoint.name, turningPointSide: cmp.turningPointSide ?? "" }
          : {}),
      },
    },
  });
}

/**
 * §6.8 balance dynamics: the intent's subject profile judged against
 * the matched season's baseline. Conclusions are framework-internal
 * derivations (confidence from the atomic baseline + stipulated
 * profile); manifestations are the excess element's correspondence
 * row, filtered as §6.8's worked example filters it (the sound domain
 * is not among the domains that make sense for a season-judged
 * profile, and the example's own list omits it).
 */
function handleBalance(ctx: HandlerCtx): void {
  const { graph, rec, intent } = ctx;
  const season = intent.matchedNodes
    .map((id) => graph.getNode(id))
    .find((x): x is GraphNode => !!x);
  if (!season) return;
  const assessment = assessBalance(graph, { proportions: intent.profile ?? {} }, season.id);
  if (!assessment) {
    rec.addStep({
      kind: "engine",
      subQuestion: `what is the baseline for ${season.name}?`,
      inputs: [season.id],
      conclusion: {
        subjectId: season.id,
        relation: "NO_BASELINE",
        confidence: 1,
        facts: { frame: "balance baseline" },
      },
    });
    return;
  }
  const name = (id: string) => graph.getNode(id)?.name ?? id;
  const emitManifestations = (entry: (typeof assessment.excess)[number]) => {
    for (const [category, entries] of entry.manifestations) {
      if (category === "sound") continue; // §6.8's filter, per its example
      for (const e2 of entries) {
        rec.addStep({
          kind: "compose",
          inputs: [e2.nodeId, entry.elementId],
          conclusion: {
            subjectId: e2.nodeId,
            relation: "CORRESPONDS_TO",
            objectId: entry.elementId,
            confidence: 1,
            facts: { category, viaBalance: "1" },
          },
        });
      }
    }
  };
  for (const entry of assessment.excess) {
    rec.addStep({
      kind: "engine",
      subQuestion: `is there an excess of ${name(entry.elementId)} against the ${season.name} baseline?`,
      inputs: [season.id, entry.elementId],
      conclusion: {
        subjectId: season.id,
        relation: "BALANCE_EXCESS",
        objectId: entry.elementId,
        confidence: 1,
        facts: {
          element: entry.elementId,
          subjectShare: entry.subjectShare ?? 0,
          baselineShare: entry.baselineShare,
          baselineBand: entry.baselineBand,
          subjectBand: entry.subjectBand ?? "",
          frame: "excess baseline season profile",
        },
      },
    });
    if (entry.moderatorId) {
      rec.addStep({
        kind: "engine",
        subQuestion: `what moderates an excess of ${name(entry.elementId)}?`,
        inputs: [entry.elementId, entry.moderatorId],
        conclusion: {
          subjectId: season.id,
          relation: "BALANCE_MODERATOR",
          objectId: entry.moderatorId,
          confidence: 1,
          facts: { forElement: entry.elementId },
        },
      });
    }
    if (entry.downstreamId) {
      rec.addStep({
        kind: "engine",
        subQuestion: `what does an excess of ${name(entry.elementId)} feed?`,
        inputs: [entry.elementId, entry.downstreamId],
        conclusion: {
          subjectId: season.id,
          relation: "BALANCE_DOWNSTREAM",
          objectId: entry.downstreamId,
          confidence: 1,
          facts: { forElement: entry.elementId },
        },
      });
    }
    emitManifestations(entry);
  }
  for (const entry of assessment.deficiency) {
    rec.addStep({
      kind: "engine",
      subQuestion: `is there a deficiency of ${name(entry.elementId)} against the ${season.name} baseline?`,
      inputs: [season.id, entry.elementId],
      conclusion: {
        subjectId: season.id,
        relation: "BALANCE_DEFICIENCY",
        objectId: entry.elementId,
        confidence: 1,
        facts: {
          element: entry.elementId,
          subjectShare: entry.subjectShare ?? 0,
          baselineShare: entry.baselineShare,
          baselineBand: entry.baselineBand,
          subjectBand: entry.subjectBand ?? "",
          frame: "deficiency baseline season profile",
        },
      },
    });
    if (entry.moderatorId) {
      rec.addStep({
        kind: "engine",
        subQuestion: `what supports a deficiency of ${name(entry.elementId)}?`,
        inputs: [entry.elementId, entry.moderatorId],
        conclusion: {
          subjectId: season.id,
          relation: "BALANCE_SUPPORT",
          objectId: entry.moderatorId,
          confidence: 1,
          facts: { forElement: entry.elementId, frame: "supports" },
        },
      });
    }
    emitManifestations(entry);
  }
  if (assessment.excess.length === 0 && assessment.deficiency.length === 0) {
    rec.addStep({
      kind: "engine",
      subQuestion: `does this profile sit within the ${season.name} baseline?`,
      inputs: [season.id],
      conclusion: {
        subjectId: season.id,
        relation: "BALANCE_IN_RANGE",
        confidence: 1,
        facts: { frame: "excess deficiency baseline season profile" },
      },
    });
  }
}

/* ------------------------------------------------------------------ */
/* Entry points                                                        */
/* ------------------------------------------------------------------ */

/**
 * The router-fed entry point (§7.2): run a pre-resolved intent and
 * return structured results only. When `rec` is given, traversals are
 * recorded as ThoughtTrace steps in it (§8.1).
 */
/**
 * §5 frame questions. The handler reads frame structure only — FEs and
 * evoking units — and emits it as conclusions; a frame is a situation
 * schema, so no classification machinery touches it here. Element sets
 * are emitted core-first (FN document order within each group) as ONE
 * step with many conclusions: reading the set is a single act (§8.3
 * counts acts, and a 15-element frame must not exhaust the bound).
 */
function handleFrame(ctx: HandlerCtx): void {
  const { graph, rec, intent } = ctx;
  const frame = intent.matchedNodes
    .map((id) => graph.getNode(id))
    .find((nd): nd is GraphNode => !!nd && nd.type === "Frame");
  if (!frame) return;
  const variant = intent.variant ?? "participants";
  const trigger = intent.category;

  const feEdges = graph.outEdges(frame.id, "HAS_FRAME_ELEMENT");
  const coreEdges = feEdges.filter((e) => e.properties?.core === true);
  const luEdges = graph
    .inEdges(frame.id, "EVOKES")
    .filter((e) => graph.getNode(e.from)?.type === "LexicalUnit");

  rec.addStep({
    kind: "frame",
    subQuestion: `what is the frame ${frame.name}?`,
    inputs: [frame.id],
    conclusion: {
      subjectId: frame.id,
      relation: "FRAME",
      objectId: frame.id,
      confidence: 1,
      facts: {
        feCount: feEdges.length,
        coreCount: coreEdges.length,
        luCount: luEdges.length,
        ...(trigger ? { trigger } : {}),
      },
    },
  });

  if (variant === "evokers") {
    const conclusions = luEdges.map((e) => {
      const lu = graph.getNode(e.from)!;
      ctx.use(e);
      return {
        subjectId: lu.id,
        relation: "EVOKES",
        objectId: frame.id,
        confidence: 1,
        facts: {
          lemma: String(lu.properties["lemma"] ?? lu.name),
          pos: String(lu.properties["pos"] ?? ""),
        },
      };
    });
    if (conclusions.length > 0) {
      rec.addStep({
        kind: "frame",
        subQuestion: `what evokes ${frame.name}?`,
        // Inputs name the units read — [frame.id] alone would collide
        // with the FRAME step above in the §8.3 cycle guard.
        inputs: [frame.id, ...luEdges.map((e) => e.from)],
        conclusions,
      });
    }
    return;
  }

  // participants / frame_of: the evoking link (when a trigger word
  // resolved this frame) and then the element set.
  if (trigger) {
    const luEdge = luEdges.find(
      (e) => graph.getNode(e.from)?.properties["lemma"] === trigger,
    );
    if (luEdge) {
      ctx.use(luEdge);
      const lu = graph.getNode(luEdge.from)!;
      const step = stepOf(graph, luEdge, "forward");
      rec.addStep({
        kind: "frame",
        subQuestion: `what does ${trigger} evoke?`,
        inputs: [lu.id, frame.id],
        paths: [renderPath([step])],
        conclusion: {
          subjectId: lu.id,
          relation: "EVOKES",
          objectId: frame.id,
          confidence: 1,
          facts: { lemma: trigger, pos: String(lu.properties["pos"] ?? "") },
        },
      });
      ctx.paths.push({ steps: [step], text: renderPath([step]) });
    }
  }
  const ordered = [
    ...coreEdges,
    ...feEdges.filter((e) => e.properties?.core !== true),
  ];
  const conclusions = ordered.map((e) => {
    ctx.use(e);
    return {
      subjectId: frame.id,
      relation: "HAS_FRAME_ELEMENT",
      objectId: e.to,
      confidence: 1,
      facts: { core: e.properties?.core === true ? 1 : 0 },
    };
  });
  if (conclusions.length > 0) {
    rec.addStep({
      kind: "frame",
      subQuestion: `what are the participants in ${frame.name}?`,
      inputs: [frame.id, ...ordered.map((e) => e.to)],
      conclusions,
    });
    for (const e of coreEdges) {
      const step = stepOf(graph, e, "forward");
      ctx.paths.push({ steps: [step], text: renderPath([step]) });
    }
  }
}

export function answerIntent(
  graph: Graph,
  question: string,
  intent: QueryIntent,
  rec?: TraceBuilder,
): ReasonerResult {
  const builder = rec ?? new TraceBuilder(0, question);
  const paths: Path[] = [];
  const usedEdges: GraphEdge[] = [];
  const ctx: HandlerCtx = {
    graph,
    question,
    intent,
    rec: builder,
    paths,
    usedEdges,
    use: (edge: GraphEdge) => {
      if (!usedEdges.some((e) => e.id === edge.id)) usedEdges.push(edge);
    },
    threshold: intent.confidenceThreshold,
  };

  if (intent.matchedNodes.length > 0) {
    switch (intent.intentType) {
      case "causal_chain":
        handleCausal(ctx);
        break;
      case "ontology_explanation":
        handleOntology(ctx);
        break;
      case "correspondence":
        handleCorrespondence(ctx);
        break;
      case "antonym_lookup":
        handleAntonym(ctx);
        break;
      case "part_of":
        handlePartOf(ctx);
        break;
      case "relatedness":
        handleRelatedness(ctx);
        break;
      case "comparison":
        handleComparison(ctx);
        break;
      case "restraint":
        handleRestraint(ctx);
        break;
      case "degree_compare":
        handleDegreeCompare(ctx);
        break;
      case "balance":
        handleBalance(ctx);
        break;
      case "frame_participants":
        handleFrame(ctx);
        break;
      case "definition":
      case "unknown":
      default:
        handleDefinition(ctx);
        break;
    }
  }

  return {
    question,
    intent,
    conclusions: builder.conclusions,
    paths,
    usedEdges,
    partial: builder.boundHit,
  };
}

/**
 * The one-shot legacy wrapper: interpret + answerIntent + the
 * renderer's debug mode (§9.1), reproducing the slice-1/2a
 * presentation for the CLI and the older tests.
 */
export function answer(
  graph: Graph,
  question: string,
  opts?: { confidenceThreshold?: number; includeOntology?: boolean },
): Answer {
  const intent = interpret(graph, question);
  if (opts?.confidenceThreshold !== undefined) intent.confidenceThreshold = opts.confidenceThreshold;
  if (opts?.includeOntology !== undefined) intent.includeOntology = opts.includeOntology;
  const rec = new TraceBuilder(1, question);
  const result = answerIntent(graph, question, intent, rec);
  const decision: RouteDecision = {
    kind: "route",
    intent,
    terms: intent.matchedNodes.map((id) => {
      const node = graph.getNode(id);
      return {
        surface: node?.name ?? id,
        lemma: (node?.name ?? id).toLowerCase(),
        slot: "subject" as const,
        ...(node?.type === "Synset" ? { synsetId: id } : { nodeId: id }),
        resolvedBy: "ontology-name" as const,
      };
    }),
    surfaceMode: "debug",
    decisionReason: "legacy/interpret",
  };
  const checks = {
    conflict: findConflicts(result.conclusions).length > 0 ? ("flagged" as const) : ("pass" as const),
    leakage: "pass" as const,
    confidenceFloor: { action: "none" as const },
  };
  const trace = rec.finish(decision, checks);
  const rendered = renderAnswer({ graph, trace, decision });
  return {
    question,
    intent,
    text: rendered.text,
    paths: result.paths,
    usedEdges: result.usedEdges,
  };
}
