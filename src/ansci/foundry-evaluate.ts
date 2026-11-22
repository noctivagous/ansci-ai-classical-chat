// Foundry evaluation matching (FND-102).
//
// Pure functions that check one turn's observed meaning graph, trace and
// reply against the independent expectations authored in FND-101. The
// vocabulary is defined in
// loop/foundry-results/fnd-101-expectations-2026-11-22.md; keep this module
// and that document in agreement when either changes.

export type CheckOutcome = "pass" | "fail" | "abstained" | "not-observable";

export interface EvalCheck {
  id: string;
  expected: unknown;
  observed: unknown;
  outcome: CheckOutcome;
  evidence?: string;
}

export interface RoleAssertion {
  predicate: string;
  participant: string;
  role: string;
}

export interface AttachedAssertion {
  predicate: string;
  participant: string;
}

export interface QualifierAssertion {
  head: string;
  modifier: string;
  relation: string;
}

export interface ResolutionAssertion {
  pronoun: string;
  target: string;
  evidence: string;
}

export interface TurnExpect {
  root?: string;
  roles?: RoleAssertion[];
  forbiddenRoles?: RoleAssertion[];
  attached?: AttachedAssertion[];
  roleOpen?: AttachedAssertion[];
  tense?: string;
  mood?: string;
  voice?: string;
  negated?: boolean;
  negationCarrier?: string;
  construction?: string;
  qualifier?: QualifierAssertion[];
  resolution?: ResolutionAssertion;
  questionTarget?: { predicate: string; role: string };
  reply?: { abstentionPermitted?: boolean; constraints?: string[] };
}

// Minimal structural view of the observed graph and trace. Deliberately
// narrow so evaluation does not couple to parser internals.
export interface EvalGraphNode {
  id: string;
  lemma: string;
  role?: string | null;
  states?: Record<string, unknown> | null;
}

export interface EvalGraph {
  nodes: EvalGraphNode[];
  edges: { from: string; to: string; relation: string }[];
  rootId: string;
}

export interface EvalTrace {
  resolutions?: { pronoun: string; resolvedTo: string }[] | null;
}

const lower = (value: unknown): string =>
  typeof value === "string" ? value.toLowerCase() : "";

function findNode(graph: EvalGraph, lemma: string): EvalGraphNode | undefined {
  return graph.nodes.find((node) => lower(node.lemma) === lower(lemma));
}

function findEdge(
  graph: EvalGraph,
  headLemma: string,
  dependentLemma: string,
  relation?: string,
): { from: string; to: string; relation: string } | undefined {
  const head = findNode(graph, headLemma);
  const dependent = findNode(graph, dependentLemma);
  if (!head || !dependent) return undefined;
  return graph.edges.find(
    (edge) =>
      edge.from === head.id &&
      edge.to === dependent.id &&
      (relation === undefined || edge.relation === relation),
  );
}

function stateOf(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

const INTERROGATIVES = new Set([
  "who",
  "whom",
  "what",
  "which",
  "where",
  "when",
  "how",
  "why",
]);

export function evaluateTurn(
  graph: EvalGraph | null | undefined,
  trace: EvalTrace | null | undefined,
  reply: string,
  expect: TurnExpect,
): EvalCheck[] {
  if (!graph) {
    return [
      {
        id: "graph-present",
        expected: "one visitor meaning graph",
        observed: null,
        outcome: "not-observable",
        evidence: "no visitor semantic object with a meaning graph for this turn",
      },
    ];
  }
  const checks: EvalCheck[] = [];
  const root = graph.nodes.find((node) => node.id === graph.rootId) ?? null;
  const rootStates = stateOf(root?.states);

  if (expect.root !== undefined) {
    const observed = root ? lower(root.lemma) : null;
    checks.push({
      id: "root",
      expected: lower(expect.root),
      observed,
      outcome: observed === lower(expect.root) ? "pass" : "fail",
    });
  }

  for (const [index, assertion] of (expect.roles ?? []).entries()) {
    const edge = findEdge(graph, assertion.predicate, assertion.participant, assertion.role);
    checks.push({
      id: `role-${index}`,
      expected: `${assertion.predicate} -> ${assertion.participant} : ${assertion.role}`,
      observed: edge ? `${assertion.predicate} -> ${assertion.participant} : ${edge.relation}` : null,
      outcome: edge ? "pass" : "fail",
    });
  }

  for (const [index, assertion] of (expect.forbiddenRoles ?? []).entries()) {
    const edge = findEdge(graph, assertion.predicate, assertion.participant, assertion.role);
    checks.push({
      id: `forbidden-${index}`,
      expected: `no edge ${assertion.predicate} -> ${assertion.participant} : ${assertion.role}`,
      observed: edge ? `${assertion.predicate} -> ${assertion.participant} : ${edge.relation}` : "absent",
      outcome: edge ? "fail" : "pass",
    });
  }

  for (const [index, assertion] of (expect.attached ?? []).entries()) {
    const edge = findEdge(graph, assertion.predicate, assertion.participant);
    checks.push({
      id: `attached-${index}`,
      expected: `edge ${assertion.predicate} -> ${assertion.participant} (any relation)`,
      observed: edge ? `${assertion.predicate} -> ${assertion.participant} : ${edge.relation}` : null,
      outcome: edge ? "pass" : "fail",
    });
  }

  for (const [index, assertion] of (expect.roleOpen ?? []).entries()) {
    const edge = findEdge(graph, assertion.predicate, assertion.participant);
    checks.push({
      id: `open-${index}`,
      expected: `${assertion.predicate} -> ${assertion.participant} attached with role deliberately unasserted`,
      observed: edge ? `${assertion.predicate} -> ${assertion.participant} : ${edge.relation}` : null,
      outcome: edge ? "pass" : "fail",
      evidence: "attachment is asserted; the observed relation is reported, not graded",
    });
  }

  for (const key of ["tense", "mood", "voice", "construction"] as const) {
    const wanted = expect[key];
    if (wanted !== undefined) {
      const observed = rootStates[key] ?? null;
      checks.push({
        id: key,
        expected: wanted,
        observed,
        outcome: observed === wanted ? "pass" : "fail",
      });
    }
  }

  if (expect.negated !== undefined) {
    const observed = (rootStates.negated as boolean | undefined) ?? false;
    checks.push({
      id: "negated",
      expected: expect.negated,
      observed,
      outcome: observed === expect.negated ? "pass" : "fail",
    });
  }

  if (expect.negationCarrier !== undefined) {
    const observed = stateOf(rootStates.negation).carrier ?? null;
    checks.push({
      id: "negation-carrier",
      expected: expect.negationCarrier,
      observed,
      outcome: observed === expect.negationCarrier ? "pass" : "fail",
    });
  }

  for (const [index, assertion] of (expect.qualifier ?? []).entries()) {
    const edge = findEdge(graph, assertion.modifier, assertion.head, assertion.relation);
    checks.push({
      id: `qualifier-${index}`,
      expected: `${assertion.modifier} -> ${assertion.head} : ${assertion.relation}`,
      observed: edge
        ? `${assertion.modifier} -> ${assertion.head} : ${edge.relation}`
        : null,
      outcome: edge ? "pass" : "fail",
    });
  }

  if (expect.resolution) {
    const resolutions = trace?.resolutions ?? [];
    const match = resolutions.find(
      (entry) =>
        lower(entry.pronoun) === lower(expect.resolution!.pronoun) &&
        lower(entry.resolvedTo) === lower(expect.resolution!.target),
    );
    checks.push({
      id: "resolution",
      expected: `${expect.resolution.pronoun} -> ${expect.resolution.target} in ${expect.resolution.evidence}`,
      observed: match ? `${match.pronoun} -> ${match.resolvedTo}` : null,
      outcome: match ? "pass" : "fail",
      evidence: expect.resolution.evidence,
    });
  }

  if (expect.questionTarget) {
    const head = findNode(graph, expect.questionTarget.predicate);
    const filler = graph.nodes.find(
      (node) =>
        head !== undefined &&
        graph.edges.some(
          (edge) =>
            edge.from === head.id &&
            edge.to === node.id &&
            edge.relation === expect.questionTarget!.role,
        ) &&
        INTERROGATIVES.has(lower(node.lemma)),
    );
    checks.push({
      id: "question-target",
      expected: `interrogative fills ${expect.questionTarget.predicate}/${expect.questionTarget.role}`,
      observed: filler ? `${filler.lemma} : ${expect.questionTarget.role}` : null,
      outcome: filler ? "pass" : "fail",
    });
  }

  if (expect.reply) {
    // No mechanical reply-entailment check exists: a word match cannot show
    // the reply does or does not assert an outcome. Report abstained so a
    // limitation is visible instead of a passing self-authored heuristic.
    checks.push({
      id: "reply",
      expected: {
        abstentionPermitted: expect.reply.abstentionPermitted ?? false,
        constraints: expect.reply.constraints ?? [],
      },
      observed: { reply },
      outcome: "abstained",
      evidence: "reply constraints are not mechanically graded yet",
    });
  }

  return checks;
}

export type TurnVerdict = "pass" | "fail" | "not-observable";

export function verdictOf(checks: EvalCheck[]): TurnVerdict {
  if (checks.some((check) => check.outcome === "not-observable")) return "not-observable";
  return checks.some((check) => check.outcome === "fail") ? "fail" : "pass";
}
