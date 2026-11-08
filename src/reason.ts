/**
 * reason.ts — AnSci's symbolic reasoning engine.
 *
 * No embeddings, no neural net: a deterministic interpreter (exact /
 * synonym / Levenshtein token match) produces a QueryIntent exactly as
 * spec'd in docs/user-plans/ontologyGraph.txt, the engine traverses the
 * graph honouring the confidence threshold, and template generation turns
 * the traversed PATHS into an answer. The path is the explanation.
 *
 * Controlled ontology leakage (spec rule): when includeOntology is false,
 * answers must not mention polarity/element names. A guard enforces this
 * on the generated text as defence-in-depth.
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

export interface QueryIntent {
  matchedNodes: string[]; // node ids, subject first
  intentType: "definition" | "comparison" | "ontology_explanation" | "causal_chain" | "unknown";
  domainHint?: string;
  includeOntology: boolean;
  traversalDepth: number;
  confidenceThreshold: number;
}

export interface Answer {
  question: string;
  intent: QueryIntent;
  text: string;
  paths: Path[];
  /** Edges the engine actually used (post-threshold), for inspection/tests. */
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
  const q = ` ${question.toLowerCase()} `;
  const tokens = question.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const exact: { node: GraphNode; score: number }[] = [];
  const fuzzy: { node: GraphNode; score: number }[] = [];
  for (const node of graph.allNodes()) {
    if (node.type === "DictionaryEntry" || node.type === "TextPassage" || node.type === "GraphAdjustment")
      continue;
    const phrases = [node.name.toLowerCase(), ...graph.synonymsOf(node).map((s) => s.toLowerCase())];
    let hit = false;
    for (const phrase of phrases) {
      if (q.includes(` ${phrase} `) || q.includes(` ${phrase}?`) || q.trim().endsWith(phrase)) {
        exact.push({ node, score: phrase.length });
        hit = true;
        break;
      }
    }
    if (hit) continue;
    // Fuzzy fallback: a question token within edit distance of a name token.
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
  const isComparison = /\bcompare\b|\bdifference\b|\bversus\b|\bvs\b/.test(q) && matched.length >= 2;
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
    direction,
  };
}

function definitionOf(graph: Graph, node: GraphNode): { text: string; edge?: GraphEdge } {
  const defEdge = graph.outEdges(node.id, "DEFINED_AS")[0];
  const entry = defEdge ? graph.getNode(defEdge.to) : undefined;
  const base = entry?.definition ?? node.summary ?? `${node.name}: no definition recorded yet.`;
  const extra = node.summary && entry?.definition && node.summary !== entry.definition ? ` ${node.summary}` : "";
  return { text: base + extra, edge: defEdge };
}

export function answer(
  graph: Graph,
  question: string,
  opts?: { confidenceThreshold?: number; includeOntology?: boolean },
): Answer {
  const intent = interpret(graph, question);
  if (opts?.confidenceThreshold !== undefined) intent.confidenceThreshold = opts.confidenceThreshold;
  if (opts?.includeOntology !== undefined) intent.includeOntology = opts.includeOntology;
  const threshold = intent.confidenceThreshold;
  const matched = intent.matchedNodes
    .map((id) => graph.getNode(id))
    .filter((x): x is GraphNode => !!x);
  const paths: Path[] = [];
  const usedEdges: GraphEdge[] = [];
  const use = (edge: GraphEdge) => {
    if (!usedEdges.some((e) => e.id === edge.id)) usedEdges.push(edge);
  };

  if (matched.length === 0) {
    return {
      question,
      intent,
      text: "I don't have anything in the graph that matches that yet. The graph grows by ingestion and curation; this concept has not been mapped onto the ontology.",
      paths,
      usedEdges,
    };
  }

  // Subject = the thing being asked about. Polarity/element/quality nodes
  // named in the question ("the yin yang polarity of bass") are not it.
  const SUBJECT_RANK: Record<string, number> = {
    Concept: 0,
    Season: 1,
    TimeOfDay: 1,
    Correspondence: 2,
    Trigram: 2,
    Element: 3,
    Polarity: 4,
    Quality: 5,
  };
  const subject =
    [...matched].sort((a, b) => (SUBJECT_RANK[a.type] ?? 9) - (SUBJECT_RANK[b.type] ?? 9))[0] ??
    matched[0];
  const quality = matched.find((nd) => nd.type === "Quality");

  /* ---- Cycle question: "what season follows winter?" ---- */
  if (intent.intentType === "causal_chain" && CYCLE_WORDS.some((w) => question.toLowerCase().includes(w))) {
    const seasonNode = matched.find((nd) => nd.type === "Season");
    const startNode = seasonNode ?? (subject.type === "Element" ? subject : undefined);
    if (startNode) {
      let elementEdge: GraphEdge | undefined;
      let elementNode: GraphNode | undefined;
      if (startNode.type === "Element") {
        elementNode = startNode;
      } else {
        elementEdge = graph.outEdges(startNode.id, "ELEMENT_OF")[0];
        elementNode = elementEdge ? graph.getNode(elementEdge.to) : undefined;
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
      if (elementNode && genEdge && nextElement) {
        const steps: PathStep[] = [];
        if (elementEdge) {
          use(elementEdge);
          steps.push(stepOf(graph, elementEdge));
        }
        use(genEdge);
        steps.push(stepOf(graph, genEdge));
        if (nextSeasonEdge && nextSeason) {
          use(nextSeasonEdge);
          steps.push(stepOf(graph, nextSeasonEdge, "reverse"));
        }
        const path: Path = { steps, text: renderPath(steps) };
        paths.push(path);
        const tail = nextSeason
          ? `, and ${nextElement.name} is the element of ${nextSeason.name.toLowerCase()} — so ${nextSeason.name.toLowerCase()} follows ${startNode.name.toLowerCase()}`
          : "";
        return {
          question,
          intent,
          text: `${startNode.name} is ${elementNode.name}. In the mutual-generation cycle, ${elementNode.name} generates ${nextElement.name}${tail}. Path: ${path.text}.`,
          paths,
          usedEdges,
        };
      }
    }
  }

  /* ---- Causal / why question with a quality: derive via shared prior ---- */
  if (quality && subject.id !== quality.id && intent.intentType === "causal_chain") {
    const path = graph.findPath(subject.id, quality.id, {
      edgeTypes: ["ELEMENT_OF", "HAS_ELEMENT", "POLARITY_OF", "HAS_POLARITY", "HAS_QUALITY", "MAPPED_TO", "ASSOCIATED_WITH"],
      confidenceThreshold: threshold,
      maxDepth: intent.traversalDepth + 1,
    });
    if (path) {
      path.steps.forEach((s) => {
        const e = graph.allEdges().find((x) => x.id === s.edgeId);
        if (e) use(e);
      });
      paths.push(path);
      const priors = path.steps
        .slice(0, -1)
        .map((s) => s.toName)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(" and ");
      return {
        question,
        intent,
        text:
          `Yes — ${subject.name.toLowerCase()} is ${quality.name} in this system, and that is derived, not stored: ` +
          `${subject.name} and ${quality.name} meet at the shared prior${priors ? ` (${priors})` : ""}. ` +
          `Path: ${path.text}. No direct ${subject.name}→${quality.name} fact exists in the graph; the association follows from the ontology.`,
        paths,
        usedEdges,
      };
    }
    return {
      question,
      intent,
      text: `The graph derives no path from ${subject.name} to ${quality.name} at confidence ≥ ${threshold.toFixed(2)}, so I won't assert that association.`,
      paths,
      usedEdges,
    };
  }

  /* ---- Ontology explanation ---- */
  if (intent.intentType === "ontology_explanation" || (intent.includeOntology && intent.intentType !== "definition")) {
    const ontoEdges = graph
      .outEdges(subject.id)
      .filter((e) => ["HAS_POLARITY", "HAS_ELEMENT", "HAS_TRIGRAM", "MAPPED_TO", "MUTUALLY_ROOTED_WITH", "POLARITY_OF", "ELEMENT_OF"].includes(e.type))
      .filter((e) => passesThreshold(e, threshold));
    for (const e of ontoEdges) {
      use(e);
      const steps = [stepOf(graph, e)];
      paths.push({ steps, text: renderPath(steps) });
    }
    if (ontoEdges.length === 0) {
      return {
        question,
        intent,
        text: `${subject.name} has no ontology mappings that pass the confidence threshold (${threshold.toFixed(2)}). Any weaker mappings are held back rather than asserted.`,
        paths,
        usedEdges,
      };
    }
    const phrases = ontoEdges.map((e) => {
      const target = graph.getNode(e.to)?.name ?? e.to;
      const kind =
        e.type === "HAS_ELEMENT" || e.type === "ELEMENT_OF"
          ? `the ${target} element`
          : e.type === "MUTUALLY_ROOTED_WITH"
            ? `mutually rooted with ${target}`
            : e.type === "MAPPED_TO"
              ? `mapped to ${target}`
              : target;
      const aspect = e.aspect ? `, in the aspect of ${e.aspect}` : "";
      const conf = e.confidence !== undefined ? ` (confidence ${e.confidence.toFixed(2)})` : "";
      return `${kind}${aspect}${conf}`;
    });
    const rooted = ontoEdges.find((e) => e.type === "MUTUALLY_ROOTED_WITH");
    const extra = rooted
      ? ` It is mutually rooted with ${graph.getNode(rooted.to)?.name}: each contains the seed of the other.`
      : "";
    return {
      question,
      intent,
      text: `In this framework, ${subject.name} is associated with ${phrases.join("; ")}.${subject.summary ? ` That fits because: ${subject.summary}` : ""}${extra}`,
      paths,
      usedEdges,
    };
  }

  /* ---- Comparison (plain): both definitions, no leakage ---- */
  if (intent.intentType === "comparison") {
    const parts: string[] = [];
    for (const nd of matched.slice(0, 3)) {
      const d = definitionOf(graph, nd);
      if (d.edge) {
        use(d.edge);
        const steps = [stepOf(graph, d.edge)];
        paths.push({ steps, text: renderPath(steps) });
      }
      parts.push(`${nd.name}: ${d.text}`);
    }
    const text = guardNoLeakage(parts.join(" "));
    return { question, intent, text, paths, usedEdges };
  }

  /* ---- Definition (default for plain asks): dictionary + summary only ---- */
  {
    const d = definitionOf(graph, subject);
    if (d.edge) {
      use(d.edge);
      const steps = [stepOf(graph, d.edge)];
      paths.push({ steps, text: renderPath(steps) });
    }
    const text = intent.includeOntology ? d.text : guardNoLeakage(d.text);
    return { question, intent, text, paths, usedEdges };
  }
}
