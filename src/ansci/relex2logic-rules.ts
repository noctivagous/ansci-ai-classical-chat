/**
 * relex2logic-rules.ts — the Relex2Logic rule inventory,
 * transcribed as data.
 *
 * Upstream (opencog/opencog, opencog/nlp/relex2logic/): each
 * rule is a Scheme BindLink — a pattern over RelEx's native
 * dependencies plus word-lemma plumbing, with AbsentLink
 * guards — whose ExecutionOutputLink calls a grounded schema
 * in rule-helpers.scm that builds predicate-argument atoms.
 * The .scm files are vendored verbatim in vendor/relex2logic/
 * for auditing; this table is the transcription the TS
 * applier (relex2logic.ts) runs: for each rule, the dependency
 * pattern (role -> native relation -> role), the lemma roles,
 * the feature conditions, the absent guards, and the output
 * shape in AnSci terms.
 *
 * Output kinds (the grounded schemas' shapes, mapped):
 *   predication — EvaluationLink(PredicateNode verb-instance,
 *     ListLink(args)): the verb instance as predicate over its
 *     argument instances, in pattern role order. A role marked
 *     questioned contributes a variable instead of its
 *     instance (upstream: _$qVar arguments / wh-rules replace
 *     the instance with a fresh VariableNode, and the record
 *     becomes a SatisfyingSet — AnSci: the ParsedSentence
 *     `query` record, never an assertion with a null filler).
 *   predadj — SP/TOBE: the subject instance predicated-as the
 *     adjective instance (AnSci 'predicate'/'predicated-as').
 *   negation — negative-rule: the verb instance's predicate
 *     under NotLink (AnSci: root states.negated / NegationState).
 *   complement — comp: the complement clause standing under
 *     the matrix predicate (AnSci 'complement').
 *
 * LICENCE NOTE: the opencog/opencog repository is AGPL-3.0
 * (with the OpenCog linking exception) unless a file says
 * otherwise; the R2L files carry no per-file licence header.
 * This table is therefore a clean-room transcription of the
 * rules' *patterns and output shapes* (the linguistic content),
 * written from reading the sources — no Scheme code is copied
 * or transliterated. See NOTICE.
 */

export type R2LRole = "subj" | "verb" | "obj" | "iobj" | "pred" | "qvar" | "comp";

export interface R2LRule {
  /** Upstream rule name (the BindLink's define). */
  name: string;
  /** Upstream file it was transcribed from. */
  source: string;
  /** Dependency pattern: [relation, governorRole, dependentRole]. */
  deps: [string, R2LRole, R2LRole][];
  /** Feature conditions: [role, feature] — the role's word must
   *  carry the feature (upstream word-feat / NEGATIVE-FLAG /
   *  HYP-derived atoms). */
  feats?: [R2LRole, string][];
  /** Absent guards: [relation, governorRole, dependentRole]. */
  absent?: [string, R2LRole, R2LRole][];
  /** Extra condition, where the pattern is not pure deps. */
  extra?: "passive-tense";
  /** The grounded schema's output shape. */
  output:
    | { kind: "predication"; predicate: R2LRole; args: R2LRole[] }
    | { kind: "predadj"; subject: R2LRole; predicate: R2LRole }
    | { kind: "negation"; predicate: R2LRole }
    | { kind: "complement"; verb: R2LRole; clause: R2LRole };
  /** The role whose instance is the questioned variable
   *  (wh-rules): its argument slot becomes a variable and the
   *  record carries a query instead of a plain assertion. */
  questioned?: R2LRole;
  /** Example sentence from the upstream file's comment. */
  example?: string;
}

export const R2L_RULES: R2LRule[] = [
  {
    name: "SV",
    source: "rules/SV.scm",
    deps: [["_subj", "verb", "subj"]],
    output: { kind: "predication", predicate: "verb", args: ["subj"] },
    example: "You suck.",
  },
  {
    name: "svo",
    source: "rules/svo.scm",
    deps: [
      ["_subj", "verb", "subj"],
      ["_obj", "verb", "obj"],
    ],
    absent: [["_iobj", "verb", "iobj"]],
    output: { kind: "predication", predicate: "verb", args: ["subj", "obj"] },
    example: "Johnny ate the dog.",
  },
  {
    name: "SVIO1",
    source: "rules/SVIO1.scm",
    deps: [
      ["_subj", "verb", "subj"],
      ["_obj", "verb", "obj"],
      ["_iobj", "verb", "iobj"],
    ],
    output: { kind: "predication", predicate: "verb", args: ["subj", "iobj", "obj"] },
    example: "John gave Mary the book.",
  },
  {
    name: "passive",
    source: "rules/passive.scm",
    deps: [["_obj", "verb", "obj"]],
    extra: "passive-tense",
    output: { kind: "predication", predicate: "verb", args: ["qvar", "obj"] },
    questioned: "qvar",
    example: "The dog was chased by the cat. (agent slot left a variable)",
  },
  {
    name: "SP",
    source: "rules/SP.scm",
    deps: [["_predadj", "subj", "pred"]],
    output: { kind: "predadj", subject: "subj", predicate: "pred" },
    example: "She is happy.",
  },
  {
    name: "TOBE",
    source: "rules/TOBE.scm",
    deps: [
      ["_to-be", "verb", "pred"],
      ["_subj", "verb", "subj"],
    ],
    output: { kind: "predadj", subject: "subj", predicate: "pred" },
    example: "She looks good.",
  },
  {
    name: "neg",
    source: "rules/neg.scm",
    deps: [],
    feats: [["verb", "negative"]],
    output: { kind: "negation", predicate: "verb" },
    example: "You do not smell good, sir.",
  },
  {
    name: "whichobjQ",
    source: "rules/whichobjQ.scm",
    deps: [
      ["_subj", "verb", "subj"],
      ["_obj", "verb", "obj"],
      ["_det", "obj", "qvar"],
    ],
    feats: [["qvar", "which"]],
    output: { kind: "predication", predicate: "verb", args: ["subj", "obj"] },
    questioned: "obj",
    example: "Which book did you read?",
  },
  {
    name: "whichsubjSVOQ",
    source: "rules/whichsubjSVOQ.scm (the whichsubjQ family member whose pattern is pure _subj/_obj/_det)",
    deps: [
      ["_subj", "verb", "subj"],
      ["_obj", "verb", "obj"],
      ["_det", "subj", "qvar"],
    ],
    feats: [["qvar", "which"]],
    output: { kind: "predication", predicate: "verb", args: ["subj", "obj"] },
    questioned: "subj",
    example: "Which dog chased the cat?",
  },
  {
    name: "where-q",
    source: "rules/where-q.scm",
    deps: [["_where", "verb", "qvar"]],
    output: { kind: "predication", predicate: "verb", args: ["qvar"] },
    questioned: "qvar",
    example: "Where do you go every night?",
  },
  {
    name: "comp",
    source: "rules/comp.scm",
    deps: [["_comp", "comp", "verb"]],
    output: { kind: "complement", verb: "verb", clause: "comp" },
    example: "I know that you are a fool.",
  },
];
