/**
 * relex2logic.ts — the Relex2Logic applier, in AnSci terms.
 *
 * Consumes the native RelEx relations (linkgrammar-semantic.ts)
 * plus per-word records (lemma from the tagging pass's `str`,
 * features from the graph) and applies the rule inventory in
 * relex2logic-rules.ts — the transcription of upstream R2L's
 * BindLink patterns and grounded-schema output shapes
 * (opencog/opencog opencog/nlp/relex2logic/, see the rules
 * module for the licence note: patterns and shapes transcribed
 * clean-room, no Scheme copied).
 *
 * Output is NOT Atomese. Each fired rule produces a LogicRecord
 * whose graph is an AnSci MeaningGraph (sentence.ts vocabulary):
 *
 *   predication — a Wood predicate node (the verb instance,
 *     lemma = the tagging lemma) with its argument instances
 *     under the slot relations R2L's argument order implies
 *     (agent / recipient / theme — the same relations the
 *     positional parser and the LG adapter use). Upstream's
 *     ImplicationLink (instance ⇒ lemma) is the node's
 *     lemma/form pair; the InheritanceLinks are the argument
 *     nodes' lemma/form pairs.
 *   questioned — when the rule marks a role questioned, that
 *     argument is NOT asserted: the record carries the
 *     ParsedSentence `query` shape ({relation, expectedType})
 *     and the argument node is flagged questionWord, exactly
 *     AnSci's standing rule that a question is never an
 *     assertion with a null filler.
 *   predadj — an Earth/Fire predicate node predicated of the
 *     subject ('predicate' / 'predicated-as', as parse.ts's
 *     predRelation chooses).
 *   negation — no graph of its own: the record names the
 *     predicate instance whose root must carry
 *     states.negated (upstream: the predicate under NotLink).
 *   complement — the complement clause root standing under
 *     the matrix predicate via 'complement' (recorded as the
 *     clause head word; clause-internal structure is the
 *     native relations' own business in this shadow stage).
 *
 * SHADOW ONLY: nothing in parse.ts/turn.ts consumes these
 * records. The gate (scripts/ansci-relex2logic-gate.mjs) is
 * the consumer of record.
 */
import {
  LgFeatureNode,
  buildStanfordGraph,
  type StanfordGraph,
} from "./linkgrammar-stanford";
import {
  applyTaggingAndSemantic,
  collectNativeRelations,
  type NativeRelation,
} from "./linkgrammar-semantic";
import { parseSentenceWasm } from "./linkgrammar-wasm";
import { R2L_RULES, type R2LRole, type R2LRule } from "./relex2logic-rules";
import {
  cycleOf,
  type Element,
  type MeaningGraph,
  type MeaningNode,
} from "./sentence";

/* ------------------------------------------------------------------ */
/* Word records: what the R2L patterns read besides dependencies —     */
/* lemmas (word-lemma) and features (word-feat).                       */
/* ------------------------------------------------------------------ */

export interface R2LWord {
  /** Sentence index (linkage position, LEFT-WALL = 0). */
  idx: number;
  /** Surface form (orig_str). */
  form: string;
  /** Lemma: the tagging pass's `str` after Morphy (falls back
   *  to the surface). Upstream's WordNode for the instance. */
  lemma: string;
  /** Features the patterns test: "negative" (the ref carries
   *  NEGATIVE-FLAG), "which"/"where"/… for question words. */
  feats: Set<string>;
  /** The tense name the semantic pass conjoined, if any
   *  (contains "passive" for passive clauses — R2L's
   *  check-tense reads exactly this string). */
  tenseName?: string;
}

const QUESTION_WORDS = new Set([
  "which", "what", "who", "whom", "whose", "where", "when", "why", "how",
]);

export function r2lWordsFromGraph(graph: StanfordGraph): R2LWord[] {
  const out: R2LWord[] = [];
  for (const w of graph.words) {
    if (!w) continue;
    const form = w.get("orig_str")?.value ?? "";
    const idx = parseInt(w.get("index_in_sentence")?.value ?? "-1", 10);
    if (!Number.isFinite(idx) || form === "LEFT-WALL") continue;
    const lemma = w.get("str")?.value || form;
    const feats = new Set<string>();
    const ref = w.get("ref");
    if (ref && ref.get("NEGATIVE-FLAG")) feats.add("negative");
    if (QUESTION_WORDS.has(form.toLowerCase())) feats.add(form.toLowerCase());
    const tenseName = w.pathTarget(["tense", "name"])?.value ?? undefined;
    out.push({ idx, form, lemma, feats, tenseName });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* The logic records.                                                  */
/* ------------------------------------------------------------------ */

export interface LogicRecord {
  /** The R2L rule that produced this record. */
  rule: string;
  /** Upstream file the rule was transcribed from. */
  source: string;
  kind: "predication" | "predadj" | "negation" | "complement";
  /** The meaning graph, for predication/predadj records. */
  graph?: MeaningGraph;
  /** REALIZES: node id -> sentence word indices. */
  realizes?: Record<string, number[]>;
  /** Present when a role was questioned: the slot the question
   *  ranges over (ParsedSentence.query shape). */
  query?: { relation: string; expectedType: string };
  /** For negation records: the word index of the predicate
   *  instance to mark negated. */
  negatedPredicateIdx?: number;
  /** For complement records: word indices of the matrix verb
   *  and the complement clause's head. */
  complement?: { verbIdx: number; clauseHeadIdx: number };
}

/** Slot relation for the i-th argument of a predication, by
 *  R2L argument order: subject first (agent), then — for the
 *  three-argument shape — recipient, then theme. */
function slotRelation(rule: R2LRule, role: R2LRole, position: number): string {
  if (rule.output.kind === "predication" && rule.extra === "passive-tense") {
    return role === "obj" ? "theme" : "agent";
  }
  if (role === "subj") return "agent";
  if (role === "iobj") return "recipient";
  if (role === "obj") return "theme";
  if (role === "qvar") return "location";
  return "theme";
}

function elementFor(word: R2LWord, isPredicate: boolean): Element {
  if (isPredicate) return "Wood";
  return "Earth";
}

export function applyR2LRules(
  relations: NativeRelation[],
  words: R2LWord[],
): LogicRecord[] {
  const byIdx = new Map(words.map((w) => [w.idx, w]));
  const relSet = (rel: string) => {
    const targets = new Set([rel]);
    // Question-word relations: RelEx names them _%atLocation
    // etc.; R2L's where-q pattern reads _%atLocation and its
    // output ranges over the location — the _where alias.
    if (rel === "_where") targets.add("_%atLocation");
    return relations.filter((r) => targets.has(r.rel));
  };
  const find = (rel: string, govIdx: number) =>
    relSet(rel).filter((r) => r.govIdx === govIdx);
  const records: LogicRecord[] = [];

  for (const rule of R2L_RULES) {
    // Candidate predicates: words that govern any dep relation
    // in the pattern (or, for feature-only rules, words with
    // the feature).
    const verbCandidates = new Set<number>();
    if (rule.deps.length > 0) {
      for (const [rel] of rule.deps) {
        for (const r of relSet(rel)) verbCandidates.add(r.govIdx);
      }
    } else if (rule.feats) {
      for (const w of words) if (w.feats.has("negative")) verbCandidates.add(w.idx);
    }

    for (const candIdx of verbCandidates) {
      // Bind roles by walking the dep pattern from the anchor:
      // the first dep's governor anchors; other deps must share
      // the roles already bound.
      const bind = new Map<R2LRole, number>();
      // Anchor on the FIRST dep's governor role — the pattern's
      // own entry point (SP: _predadj's governor is the subject;
      // TOBE: _to-be's governor is the verb; comp: _comp's
      // governor is the complementizer). Feature-only rules
      // anchor on the output's predicate role.
      const anchorRole: R2LRole =
        rule.deps.length > 0
          ? rule.deps[0][1]
          : rule.output.kind === "complement"
            ? "comp"
            : "verb";
      bind.set(anchorRole, candIdx);
      let ok = true;
      for (const [rel, govRole, depRole] of rule.deps) {
        const govIdx = bind.get(govRole);
        if (govIdx === undefined) {
          // Governor not yet bound: find a relation whose
          // dependent is a bound role and bind the governor.
          const depIdx0 = bind.get(depRole);
          const hit = relSet(rel).find((r) => r.depIdx === depIdx0);
          if (!hit) { ok = false; break; }
          bind.set(govRole, hit.govIdx);
          continue;
        }
        const hits = find(rel, govIdx);
        const hit = hits.find(
          (r) => bind.get(depRole) === undefined || bind.get(depRole) === r.depIdx,
        );
        if (!hit) { ok = false; break; }
        bind.set(depRole, hit.depIdx);
      }
      if (!ok) continue;
      // The candidate must be the anchor word the walk started
      // from (guards against walks that drifted to a different
      // anchor instance through shared dependents).
      if (bind.get(anchorRole) !== candIdx) continue;
      // Feature conditions.
      for (const [role, feat] of rule.feats ?? []) {
        const wi = bind.get(role);
        if (wi === undefined || !byIdx.get(wi)?.feats.has(feat)) { ok = false; break; }
      }
      if (!ok) continue;
      // Absent guards.
      for (const [rel, govRole, depRole] of rule.absent ?? []) {
        const govIdx = bind.get(govRole);
        if (govIdx !== undefined && find(rel, govIdx).length > 0) { ok = false; break; }
        void depRole;
      }
      if (!ok) continue;
      // Extra conditions.
      if (rule.extra === "passive-tense") {
        const verbIdx = bind.get("verb");
        const tense = verbIdx !== undefined ? byIdx.get(verbIdx)?.tenseName : undefined;
        if (!tense || !tense.includes("passive")) continue;
        // The questioned agent is a fresh variable role.
        bind.set("qvar", -1);
      }

      records.push(buildRecord(rule, bind, byIdx));
    }
  }
  return records;
}

function buildRecord(
  rule: R2LRule,
  bind: Map<R2LRole, number>,
  byIdx: Map<number, R2LWord>,
): LogicRecord {
  const out = rule.output;
  if (out.kind === "negation") {
    return {
      rule: rule.name,
      source: rule.source,
      kind: "negation",
      negatedPredicateIdx: bind.get(out.predicate),
    };
  }
  if (out.kind === "complement") {
    // Upstream complement-rule: the complementizer instance is
    // the predicate, the embedded verb instance its argument —
    // EvaluationLink(PredicateNode comp, ListLink(PredicateNode
    // pred)). AnSci shape: the clause stands under the
    // complementizer's clause; attaching it to the matrix verb
    // is post-processing upstream too, and stays out here.
    return {
      rule: rule.name,
      source: rule.source,
      kind: "complement",
      complement: {
        verbIdx: bind.get(out.verb) as number,
        clauseHeadIdx: bind.get(out.clause) as number,
      },
    };
  }
  // Graph-building outputs: predication and predadj.
  let seq = 0;
  const nodes: MeaningNode[] = [];
  const realizes: Record<string, number[]> = {};
  const mkNode = (wi: number, isPredicate: boolean): MeaningNode => {
    const w = byIdx.get(wi);
    const node: MeaningNode = {
      id: `n${++seq}`,
      lemma: w ? w.lemma : "?",
      form: w ? w.form : "?",
      syntacticElement: elementFor(w as R2LWord, isPredicate),
    };
    nodes.push(node);
    realizes[node.id] = wi >= 0 ? [wi] : [];
    return node;
  };
  const edges: MeaningGraph["edges"] = [];
  const edge = (from: MeaningNode, to: MeaningNode, relation: MeaningGraph["edges"][number]["relation"]) => {
    edges.push({ from: from.id, to: to.id, relation, cycle: cycleOf(from.syntacticElement, to.syntacticElement) });
  };

  if (out.kind === "predadj") {
    const subjNode = mkNode(bind.get(out.subject) as number, false);
    const predNode = mkNode(bind.get(out.predicate) as number, false);
    predNode.syntacticElement = "Fire";
    // parse.ts's predRelation: 'predicated-as' only for an
    // Earth root; an adjective (Fire) root takes 'predicate'.
    edge(predNode, subjNode, "predicate");
    return {
      rule: rule.name,
      source: rule.source,
      kind: "predadj",
      graph: { nodes, edges, rootId: predNode.id, entryElement: predNode.syntacticElement },
      realizes,
    };
  }

  // predication
  const predIdx = bind.get(out.predicate) as number;
  const predNode = mkNode(predIdx, true);
  let query: LogicRecord["query"];
  out.args.forEach((role, position) => {
    const wi = bind.get(role);
    if (wi === undefined) return;
    const relation = slotRelation(rule, role, position);
    if (rule.questioned === role || wi < 0) {
      // The questioned role contributes NO asserted argument:
      // upstream replaces the instance with a fresh
      // VariableNode and the record is a SatisfyingSet; here
      // the `query` record carries the slot and the argument
      // node stands only as the variable's restrictor (flagged
      // questionWord, no edge). A pure-variable role (passive's
      // agent) has no restrictor word at all.
      if (wi >= 0) {
        const argNode = mkNode(wi, false);
        argNode.questionWord = true;
      }
      query = { relation, expectedType: "entity" };
      return;
    }
    const argNode = mkNode(wi, false);
    edge(predNode, argNode, relation as MeaningGraph["edges"][number]["relation"]);
  });
  return {
    rule: rule.name,
    source: rule.source,
    kind: "predication",
    graph: { nodes, edges, rootId: predNode.id, entryElement: "Wood" },
    realizes,
    ...(query ? { query } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* Entry point: parse, run the passes, apply the rules. Shadow only.   */
/* ------------------------------------------------------------------ */

export interface R2LParseResult {
  status: "complete" | "recovered" | "failed";
  records: LogicRecord[];
  error?: string;
}

export async function relex2logic(text: string): Promise<R2LParseResult> {
  let parsed;
  try {
    parsed = await parseSentenceWasm(text);
  } catch (err) {
    return { status: "failed", records: [], error: err instanceof Error ? err.message : String(err) };
  }
  if (!parsed.ok || parsed.nullCount !== 0) {
    return {
      status: parsed.ok ? "recovered" : "failed",
      records: [],
      error: parsed.ok ? undefined : parsed.error,
    };
  }
  const graph = buildStanfordGraph(parsed.words, parsed.links);
  const errors = applyTaggingAndSemantic(graph);
  const relations = collectNativeRelations(graph.root);
  const words = r2lWordsFromGraph(graph);
  return {
    status: "complete",
    records: applyR2LRules(relations, words),
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}
