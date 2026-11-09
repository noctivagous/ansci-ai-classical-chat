/**
 * thought.ts — Thought: the deliberation record of a single turn (§8).
 *
 * A ThoughtTrace is built as the turn runs — each step appended when the
 * operation happens — and decomposes the question into sub-questions
 * answered one graph operation at a time. Interim conclusions are small
 * structured facts, never prose; later steps may consume earlier
 * conclusions as inputs. Deliberation is bounded: at most 12 steps per
 * turn (checks included) and no step may re-run an identical
 * sub-question (§8.3). The renderer consumes conclusions + check
 * outcomes, never the steps (§8.4).
 */
import type { RouteDecision } from "./router";

export type ThoughtStepKind =
  | "lookup"
  | "route"
  | "climb"
  | "join"
  | "correspondence"
  | "antonym"
  | "partof"
  | "relate"
  | "check"
  // Slice 2c (§6): propagation steps, correspondence composition, and
  // engine operations (cycle operators, degree comparison, balance) are
  // distinct deliberation acts and are recorded as their own kinds —
  // the §8.5 sketch's union, extended the way §8.5's InterimConclusion
  // was already extended in 2b.
  | "propagate"
  | "compose"
  | "engine";

export interface InterimConclusion {
  id: string; // "c1", "c2", … — later steps cite these
  subjectId: string; // node or synset id the claim is about
  relation: string; // edge type or derived relation name
  objectId?: string; // node/synset id, when the claim has an object
  confidence: number;
  derivedFrom: string[]; // ThoughtStep ids that produced this claim
  /** Edge/aspect context where the relation is aspect-scoped (§6.6). */
  aspect?: string;
  /** The closed aspect key (§6.11) of the classification this claim
   *  carries, when aspect-scoped — the §8.2 conflict check keys by it
   *  in preference to the free-text aspect (§6.6). */
  aspectKey?: string;
  /** Middle nodes of the derivation, in path order (shared priors, anchors). */
  viaIds?: string[];
  /**
   * Renderer-facing structured payload — ids, counts and category labels
   * only, still never prose (e.g. a correspondence conclusion's category,
   * a climb's hop count). Names and wording are the renderer's job (§9).
   */
  facts?: Record<string, string | number>;
}

export interface ThoughtStep {
  id: string; // "s1", "s2", … in execution order
  kind: ThoughtStepKind;
  subQuestion?: string; // the decomposed question this step answers
  inputs: string[]; // term / synset / node / conclusion ids consumed
  paths: string[]; // path strings actually traversed (debug form)
  conclusion?: InterimConclusion;
  check?: "conflict" | "leakage" | "confidence-floor"; // check steps only
  outcome?: "pass" | "flagged" | "failed"; // check steps only
  note?: string;
}

export interface ThoughtTrace {
  turn: number;
  question: string; // the user's turn, verbatim
  steps: ThoughtStep[]; // ≤ 12 (§8.3)
  conclusions: InterimConclusion[];
  checks: {
    conflict: "pass" | "flagged" | "failed";
    leakage: "pass" | "flagged" | "failed";
    confidenceFloor: {
      weakestStepId?: string;
      weakestConfidence?: number;
      action: "none" | "hedge" | "downgrade";
    };
  };
  decision: RouteDecision; // §7.8 — the decision this trace led to
  boundHit?: boolean; // §8.3: deliberation stopped at the step bound
}

export const MAX_TRACE_STEPS = 12;

/**
 * Accumulates a ThoughtTrace while enforcing §8.3's bounds. `addStep`
 * returns the recorded step, the earlier identical step (cycle guard —
 * its conclusion is reused, no traversal repeats), or `null` when the
 * step bound is hit (the caller then works with what completed steps
 * support and the trace is marked `boundHit`).
 */
export class TraceBuilder {
  readonly steps: ThoughtStep[] = [];
  readonly conclusions: InterimConclusion[] = [];
  boundHit = false;
  private stepSeq = 0;
  private conclusionSeq = 0;
  private seenSubQuestions = new Map<string, ThoughtStep>();

  constructor(
    readonly turn: number,
    readonly question: string,
  ) {}

  private key(kind: ThoughtStepKind, inputs: string[]): string {
    return `${kind}|${[...inputs].sort().join("|")}`;
  }

  addStep(init: {
    kind: ThoughtStepKind;
    subQuestion?: string;
    inputs: string[];
    paths?: string[];
    conclusion?: Omit<InterimConclusion, "id" | "derivedFrom"> & { derivedFrom?: string[] };
    check?: ThoughtStep["check"];
    outcome?: ThoughtStep["outcome"];
    note?: string;
  }): ThoughtStep | null {
    const key = this.key(init.kind, init.inputs);
    const prior = this.seenSubQuestions.get(key);
    if (prior) return prior; // cycle guard: reuse, never re-traverse (§8.3)
    if (this.steps.length >= MAX_TRACE_STEPS) {
      this.boundHit = true;
      return null;
    }
    const id = `s${++this.stepSeq}`;
    let conclusion: InterimConclusion | undefined;
    if (init.conclusion) {
      conclusion = {
        ...init.conclusion,
        id: `c${++this.conclusionSeq}`,
        derivedFrom: init.conclusion.derivedFrom ?? [id],
      };
      this.conclusions.push(conclusion);
    }
    const step: ThoughtStep = {
      id,
      kind: init.kind,
      subQuestion: init.subQuestion,
      inputs: init.inputs,
      paths: init.paths ?? [],
      conclusion,
      check: init.check,
      outcome: init.outcome,
      note: init.note,
    };
    this.steps.push(step);
    this.seenSubQuestions.set(key, step);
    return step;
  }

  /** Conclusions a step produced, by step id — for steps that cite inputs. */
  conclusionOf(stepId: string): InterimConclusion | undefined {
    return this.steps.find((s) => s.id === stepId)?.conclusion;
  }

  finish(
    decision: RouteDecision,
    checks: ThoughtTrace["checks"],
  ): ThoughtTrace {
    return {
      turn: this.turn,
      question: this.question,
      steps: this.steps,
      conclusions: this.conclusions,
      checks,
      decision,
      ...(this.boundHit ? { boundHit: true } : {}),
    };
  }
}

/**
 * §8.2 check 1 — conflict. Two conclusions conflict when they assign the
 * same subject incompatible objects for the same relation in the SAME
 * aspect (aspect-scoped reasoning, §6.6: bass is Yang by voice origin
 * and Yin by pitch — different aspects, not a conflict). Since slice
 * 2c, the key is the closed aspect key (§6.11) when the conclusion
 * carries one, falling back to the free-text aspect.
 */
export function findConflicts(
  conclusions: InterimConclusion[],
): { subjectId: string; relation: string; aspect?: string; conclusionIds: string[] }[] {
  const groups = new Map<string, InterimConclusion[]>();
  for (const c of conclusions) {
    if (!c.objectId) continue;
    if (!["HAS_POLARITY", "POLARITY_OF", "HAS_ELEMENT", "ELEMENT_OF"].includes(c.relation)) continue;
    const key = `${c.subjectId}|${c.relation}|${c.aspectKey ?? c.aspect ?? ""}`;
    const list = groups.get(key);
    if (list) list.push(c);
    else groups.set(key, [c]);
  }
  const conflicts: { subjectId: string; relation: string; aspect?: string; conclusionIds: string[] }[] = [];
  for (const [key, list] of groups) {
    const objects = new Set(list.map((c) => c.objectId));
    if (objects.size > 1) {
      const [subjectId, relation, aspect] = key.split("|");
      conflicts.push({
        subjectId,
        relation,
        aspect: aspect || undefined,
        conclusionIds: list.map((c) => c.id),
      });
    }
  }
  return conflicts;
}
