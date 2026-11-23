/**
 * linkgrammar-semantic.ts — the RelEx tagging and semantic
 * passes, ported: the passes RelEx runs BEFORE its Stanford
 * file, plus the native relation view over their output.
 *
 * What upstream does (RelationExtractor.processSentence +
 * SentenceAlgorithmApplier.applyAlgs): strip subscripts, run
 * relex-tagging.algs, then relex-semantic.algs, each an ordered
 * list of algorithms applied in file order. The files mix
 * #TemplateActionAlg rules (the engine in
 * linkgrammar-stanford.ts runs them unchanged) with named Java
 * algorithms interleaved at fixed positions; those are ported
 * here, one by one, from the Java sources:
 *
 *   tagging:  MorphyAlg — lemma lookup; where RelEx used
 *             WordNet via JWNL (attested lemma + exception
 *             lists), AnSci uses its own Open English WordNet
 *             extract (src/wordnet.ts synsetsForSurface: exact
 *             lemma, closed forms index, regular stems accepted
 *             only when attested). Same contract: a root is
 *             returned only when the dictionary attests it.
 *             WordSequenceCombineAlg — merges G/ID-link chains
 *             (proper names, idioms) into the rightmost word.
 *             TwoWordCombineToLeftAlg / ToRightAlg — merges a
 *             matched link's two words into one (particles,
 *             "as many", "how much").
 *   semantic: TenseConjoinAlg — flattens the tense val/prev
 *             chain into `tense name`.
 *             PrepositionLinkAlg — a TemplateActionAlg whose
 *             extra code step writes ref prep-links from its
 *             bound variables (group-aware, indexed repeats).
 *
 * The semantic file's rules write the NATIVE RelEx relations
 * as `ref links _X` features; collectNativeRelations() below is
 * the view over them (upstream: OpenCogSchemeRel / SimpleView
 * walk the same features). Native output is evidence-only:
 * nothing in the parse path consumes it yet.
 *
 * Deviations from upstream, all deliberate: (1) MorphyAlg's
 * lemma source is AnSci's WordNet extract, not JWNL's
 * Princeton WordNet 3.0 — same algorithm, AnSci's data; where
 * the extract is unavailable the pass degrades to identity
 * (str stays the surface), never to a guessed stem.
 * (2) WordSequenceCombineAlg does not touch start_char (the
 * graph carries no char offsets) and does not re-run Morphy on
 * the combined node (upstream comments that code out too).
 * (3) Traversal is the engine's insertion-order walk, as in
 * the stanford port.
 *
 * License: clean-room port of Apache-2.0 RelEx algorithms
 * (opencog/relex, see NOTICE); the rule texts are the upstream
 * Apache-2.0 files, shipped verbatim.
 */
import {
  LgFeatureNode,
  applyRules,
  buildStanfordGraph,
  matchTemplateVars,
  parseAlgFile,
  walkGraphNodes,
  type LgAlgStep,
  type LgNamedAlg,
  type StanfordGraph,
  type StanfordLinkInput,
} from "./linkgrammar-stanford";
import { RELEX_SEMANTIC_ALGS, RELEX_TAGGING_ALGS } from "./linkgrammar-passes-rules";
import { parseSentenceWasm } from "./linkgrammar-wasm";
import { getDefaultExtract, synsetsForSurface } from "../wordnet";

/* ------------------------------------------------------------------ */
/* Morphy — the lemma source.                                          */
/*                                                                     */
/* MorphyJWNL answers, per word, a root per category (noun/verb/       */
/* adj/adv) or nothing. AnSci's extract answers the same question      */
/* through synsetsForSurface: candidates carry (lemma, pos) with       */
/* pos in the WordNet letters n/v/a/r.                                 */
/* ------------------------------------------------------------------ */

const WN_POS: Record<string, "noun" | "verb" | "adj" | "adv"> = {
  n: "noun",
  v: "verb",
  a: "adj",
  r: "adv",
};

/** Root of `word` in the given Morphy category, or null when the
 *  extract attests no root there. Multiword lemmas come back
 *  with spaces, as the extract stores them; RelEx's names use
 *  underscores, so spaces are folded to underscores.
 *
 *  Source order follows MorphyJWNL's own contract — "get the
 *  lemma of an inflected form" — NOT synsetsForSurface's
 *  sense-lookup precedence: Morphy asks the forms index
 *  (morphological derivations) FIRST, because a surface that is
 *  itself a rare lemma ("ate" the goddess, "chased" as an
 *  engraving term) must still lemmatize to its verb root when
 *  the category asked for is verb. Exact-lemma candidates are
 *  the fallback, then the attested regular stems. */
export function morphyRoot(
  word: string,
  category: "noun" | "verb" | "adj" | "adv",
): string | null {
  let extract;
  try {
    extract = getDefaultExtract();
  } catch {
    return null;
  }
  const key = word.toLowerCase();
  const pick = (cands: { lemma: string; pos: string }[]): string | null => {
    for (const cand of cands) {
      if (WN_POS[cand.pos] === category) return cand.lemma.replace(/ /g, "_");
    }
    return null;
  };
  const fromForms = pick(extract.forms.get(key) ?? []);
  if (fromForms != null) return fromForms;
  const lookup = synsetsForSurface(extract, word);
  return pick(lookup.candidates);
}

function morphyAlg(node: LgFeatureNode): void {
  // Mirrors relex.algs.MorphyAlg.applyTo.
  const strNode = node.get("str");
  if (strNode == null || !strNode.isValued) return;
  const original = strNode.value as string;
  if (original === "LEFT-WALL") return;
  if (original.startsWith("[")) return;
  // Work-around for a WordNet bug (his -> him), kept verbatim.
  if (original === "his") return;
  const posNode = node.get("POS");
  if (posNode == null || !posNode.isValued) {
    throw new Error("All nodes with 'str' should have 'POS'");
  }
  const pos = posNode.value as string;
  let root: string | null = null;
  let type: string | null = null;
  if (pos === "noun" || pos === "verb" || pos === "adj" || pos === "adv") {
    root = morphyRoot(original, pos);
    type = pos;
  } else if (pos === "WORD") {
    for (const cat of ["noun", "verb", "adj", "adv"] as const) {
      const r = morphyRoot(original, cat);
      if (r != null && r.toLowerCase() !== original.toLowerCase()) {
        root = r;
        type = cat;
        break;
      }
    }
  }
  if (root == null || type == null) return;
  const morph = new LgFeatureNode();
  morph.set("root", new LgFeatureNode(root));
  morph.set("type", new LgFeatureNode(type));
  node.set("morph", morph);
  if (root.toLowerCase() !== original.toLowerCase()) {
    node.set("str", morph.get("root") as LgFeatureNode);
  }
}

/* ------------------------------------------------------------------ */
/* Link helpers over the graph's link nodes (LinkView/LinkableView).   */
/* ------------------------------------------------------------------ */

function linkLabel(link: LgFeatureNode): string | null {
  const lab = link.get("LAB");
  return lab && lab.isValued ? (lab.value as string) : null;
}

function numLinks(node: LgFeatureNode, dir: -1 | 1): number {
  const f = node.get(dir < 0 ? "num_left_links" : "num_right_links");
  if (f == null || !f.isValued) return 0;
  return parseInt(f.value ?? "0", 10) || 0;
}

function getLink(node: LgFeatureNode, dir: -1 | 1, i: number): LgFeatureNode | null {
  return node.get((dir < 0 ? "linkL" : "linkR") + i);
}

function linkEnd(link: LgFeatureNode, side: "F_L" | "F_R"): LgFeatureNode | null {
  return link.get(side);
}

/* ------------------------------------------------------------------ */
/* WordSequenceCombineAlg — merge a G/ID chain into its rightmost      */
/* word: ref name and str become the underscore-joined names, the      */
/* other members' str is blanked and their name removed.               */
/* ------------------------------------------------------------------ */

const NAME_LABEL_RE = /^G[a-z*]*$/;
const ENTITY_LABEL_RE = /^ID[A-Z]*[a-z*]*$/;

function isCombineLabel(label: string): boolean {
  return NAME_LABEL_RE.test(label) || ENTITY_LABEL_RE.test(label);
}

function nextCombineNode(node: LgFeatureNode, dir: -1 | 1): LgFeatureNode | null {
  const nl = numLinks(node, dir);
  for (let i = 0; i < nl; i++) {
    const fn = getLink(node, dir, i);
    if (!fn) continue;
    const label = linkLabel(fn);
    if (label != null && isCombineLabel(label)) {
      return linkEnd(fn, dir < 0 ? "F_L" : "F_R");
    }
  }
  return null;
}

function leftMostCombine(node: LgFeatureNode): LgFeatureNode {
  const next = nextCombineNode(node, -1);
  return next == null ? node : leftMostCombine(next);
}

function collectNames(
  current: LgFeatureNode,
  rightNode: LgFeatureNode,
  erase: boolean,
): string {
  let name = current.get("str")?.value ?? "";
  const orig = current.get("orig_str");
  if (orig && orig.isValued && orig.value !== "") name = orig.value as string;
  if (erase && current !== rightNode) {
    current.set("name", null);
    current.set("str", new LgFeatureNode(""));
  }
  if (current === rightNode) return name;
  const nxt = nextCombineNode(current, 1);
  if (nxt == null) return name;
  return name + "_" + collectNames(nxt, rightNode, erase);
}

function wordSequenceCombine(
  node: LgFeatureNode,
  vars: Map<string, LgFeatureNode>,
): void {
  const rightNode = vars.get("right");
  if (!rightNode) return;
  if (linkEnd(node, "F_R") !== rightNode) {
    throw new Error("variable 'right' is not properly assigned");
  }
  if (nextCombineNode(rightNode, 1) != null) return; // not rightmost
  const leftNode = leftMostCombine(rightNode);
  const bigName = collectNames(leftNode, rightNode, true);
  const bigNameF = new LgFeatureNode(bigName);
  const ref = rightNode.get("ref");
  if (ref) ref.set("name", bigNameF);
  rightNode.set("str", bigNameF);
  rightNode.set("collocation_end", rightNode);
  rightNode.set("collocation_start", leftNode);
}

/* ------------------------------------------------------------------ */
/* TwoWordCombine — merge the matched link's two words into one end.   */
/* ------------------------------------------------------------------ */

function twoWordCombine(node: LgFeatureNode, toLeft: boolean): void {
  const leftNode = linkEnd(node, "F_L");
  const rightNode = linkEnd(node, "F_R");
  if (!leftNode || !rightNode) return;
  const keep = toLeft ? leftNode : rightNode;
  const drop = toLeft ? rightNode : leftNode;
  const str =
    (leftNode.get("str")?.value ?? "") + "_" + (rightNode.get("str")?.value ?? "");
  const strF = new LgFeatureNode(str);
  const ref = keep.get("ref");
  if (ref) ref.set("name", strF);
  keep.set("str", strF);
  keep.set("collocation_end", rightNode);
  keep.set("collocation_start", leftNode);
  drop.set("str", new LgFeatureNode(""));
}

/* ------------------------------------------------------------------ */
/* TenseConjoinAlg — tense name = the val/prev chain joined by "_".    */
/* ------------------------------------------------------------------ */

function recursiveTenseExtract(node: LgFeatureNode | null): string {
  if (node == null) return "";
  let val = node.get("val")?.value ?? "";
  if (val == null) val = "";
  const prevVal = recursiveTenseExtract(node.get("prev"));
  const joiner = prevVal.length === 0 || val.length === 0 ? "" : "_";
  return prevVal + joiner + val;
}

function tenseConjoin(node: LgFeatureNode): void {
  const tenseNode = node.get("tense");
  if (!tenseNode) return;
  tenseNode.set("name", new LgFeatureNode(recursiveTenseExtract(tenseNode)));
}

/* ------------------------------------------------------------------ */
/* PrepositionLinkAlg — after the template actions run (super.apply),  */
/* write ref prep-links from the bound variables.                      */
/* ------------------------------------------------------------------ */

function groupMembersOf(node: LgFeatureNode): LgFeatureNode[] {
  if (node.isValued) return [];
  const out: LgFeatureNode[] = [];
  for (const name of node.getFeatureNames()) {
    if (/^member\d+$/.test(name)) {
      const kid = node.get(name);
      if (kid) out.push(kid);
    }
  }
  return out;
}

function prepLinkOne(
  modifiedRef: LgFeatureNode,
  prepObj: LgFeatureNode,
  prep: string,
): void {
  let prepLinks = modifiedRef.get("prep-links");
  if (!prepLinks) {
    prepLinks = new LgFeatureNode();
    modifiedRef.set("prep-links", prepLinks);
  }
  if (prepLinks.get(prep) == null) {
    prepLinks.set(prep, prepObj);
    return;
  }
  let i = 2;
  while (prepLinks.get(prep + i) != null) i++;
  prepLinks.set(prep + i, prepObj);
}

function prepositionLink(vars: Map<string, LgFeatureNode>): void {
  const modified = vars.get("modified");
  const prepNode = vars.get("prep");
  const prepObj = vars.get("prep_obj");
  if (!modified || !prepNode || !prepObj) return;
  const prep = prepNode.value ?? "";
  const members = groupMembersOf(modified);
  if (members.length > 0) {
    for (const m of members) {
      const ref = m.get("ref");
      if (ref) prepLinkOne(ref, prepObj, prep);
    }
  } else {
    const ref = modified.get("ref");
    if (ref) prepLinkOne(ref, prepObj, prep);
  }
}

/* ------------------------------------------------------------------ */
/* The applier: run a parsed .algs file's steps in file order.         */
/* ------------------------------------------------------------------ */

function applyNamedAlg(
  root: LgFeatureNode,
  alg: LgNamedAlg,
  onError?: (msg: string) => void,
): void {
  for (const node of walkGraphNodes(root)) {
    try {
      if (alg.kind === "MorphyAlg") {
        // MorphyAlg.canApplyTo: any unvalued node carrying str.
        if (!node.isValued && node.get("str") != null) morphyAlg(node);
        continue;
      }
      const vars = matchTemplateVars(node, alg.conds);
      if (vars == null) continue;
      switch (alg.kind) {
        case "WordSequenceCombineAlg":
          wordSequenceCombine(node, vars);
          break;
        case "TwoWordCombineToLeftAlg":
          twoWordCombine(node, true);
          break;
        case "TwoWordCombineToRightAlg":
          twoWordCombine(node, false);
          break;
        case "TenseConjoinAlg":
          tenseConjoin(node);
          break;
        case "PrepositionLinkAlg":
          prepositionLink(vars);
          break;
        default:
          onError?.(alg.signature + ": unported named algorithm " + alg.kind);
      }
    } catch (err) {
      onError?.(alg.signature + ": " + (err as Error).message);
    }
  }
}

export function applyAlgSteps(
  root: LgFeatureNode,
  steps: LgAlgStep[],
  onError?: (msg: string) => void,
): void {
  for (const step of steps) {
    if (step.type === "rule") applyRules(root, [step.rule], onError);
    else applyNamedAlg(root, step.alg, onError);
  }
}

/* ------------------------------------------------------------------ */
/* Cached parsed passes.                                               */
/* ------------------------------------------------------------------ */

let cachedTagging: LgAlgStep[] | null = null;
let cachedSemantic: LgAlgStep[] | null = null;

export function taggingSteps(): LgAlgStep[] {
  if (!cachedTagging) cachedTagging = parseAlgFile(RELEX_TAGGING_ALGS);
  return cachedTagging;
}

export function semanticSteps(): LgAlgStep[] {
  if (!cachedSemantic) cachedSemantic = parseAlgFile(RELEX_SEMANTIC_ALGS);
  return cachedSemantic;
}

/** Run the tagging then semantic passes over a graph built by
 *  buildStanfordGraph — the upstream applyAlgs order. Returns
 *  the collected rule/algorithm errors (empty when clean).
 *
 *  The graph root is LEFT-WALL, whose `wall` feature is itself
 *  (buildStanfordGraph mirrors LinkableView: every word's wall
 *  is the left wall node). PREP_TO_SF in the stanford file
 *  tests `<wall expand-preps> = %`: upstream sets expand-preps
 *  on the parse root only in --expand-preps mode
 *  (RelationExtractor), i.e. it is absent in the default flow
 *  this port mirrors, so prep-links flow into sf-links and the
 *  view prints them as prep_<prep>. */
export function applyTaggingAndSemantic(
  graph: StanfordGraph,
  onError?: (msg: string) => void,
): string[] {
  const errors: string[] = [];
  const collect = onError ?? ((m: string) => errors.push(m));
  applyAlgSteps(graph.root, taggingSteps(), collect);
  applyAlgSteps(graph.root, semanticSteps(), collect);
  return errors;
}

/* ------------------------------------------------------------------ */
/* Native relation view.                                               */
/*                                                                     */
/* The semantic rules write relations onto each word's ref under       */
/* `links`: underscore names are the native dependencies, plain        */
/* names are prepositions/conjunctions/question words. The view        */
/* resolves both ends through nameSource, exactly as the stanford      */
/* view resolves sf-links. Grouped targets emit one relation per       */
/* member.                                                             */
/* ------------------------------------------------------------------ */

export interface NativeRelation {
  rel: string;
  gov: string;
  govIdx: number;
  dep: string;
  depIdx: number;
}

function nameSourceWord(node: LgFeatureNode | null): LgFeatureNode | null {
  if (!node) return null;
  const ns = node.get("nameSource");
  if (!ns || ns.isValued) return null;
  return ns;
}

function wordNameIndex(word: LgFeatureNode): { name: string; idx: number } | null {
  const orig = word.get("orig_str");
  const index = word.get("index_in_sentence");
  if (!orig || !orig.isValued || !index || !index.isValued) return null;
  const idx = parseInt(index.value as string, 10);
  if (!Number.isFinite(idx)) return null;
  return { name: orig.value as string, idx };
}

function relationTargets(target: LgFeatureNode): LgFeatureNode[] {
  const members = groupMembersOf(target);
  return members.length > 0 ? members : [target];
}

export function collectNativeRelations(root: LgFeatureNode): NativeRelation[] {
  const out: NativeRelation[] = [];
  const seen = new Set<LgFeatureNode>();
  const visit = (node: LgFeatureNode): void => {
    if (seen.has(node)) return;
    seen.add(node);
    if (!node.isValued) {
      const links = node.get("links");
      if (links && !links.isValued) {
        const nm = node.get("name");
        const isLeftWall = !!nm && nm.isValued && nm.value === "LEFT-WALL";
        if (!isLeftWall) {
          for (const rel of links.getFeatureNames()) {
            const target = links.get(rel);
            if (!target || target.isValued) continue;
            for (const m of relationTargets(target)) {
              const govWord = nameSourceWord(node);
              const depWord = nameSourceWord(m);
              if (!govWord || !depWord) continue;
              const gov = wordNameIndex(govWord);
              const dep = wordNameIndex(depWord);
              if (!gov || !dep) continue;
              out.push({ rel, gov: gov.name, govIdx: gov.idx, dep: dep.name, depIdx: dep.idx });
            }
          }
        }
      }
      for (const k of node.getFeatureNames()) {
        const c = node.get(k);
        if (c) visit(c);
      }
    }
  };
  visit(root);
  out.sort((a, b) => a.govIdx - b.govIdx || a.depIdx - b.depIdx || (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
  return out;
}

export function formatNativeRelations(rels: NativeRelation[]): string {
  return rels.map((r) => `${r.rel}(${r.gov}-${r.govIdx}, ${r.dep}-${r.depIdx})`).join("\n");
}

/* ------------------------------------------------------------------ */
/* Entry point: parse with the WASM engine, run tagging + semantic,    */
/* return the native relations. Complete linkages only, as with        */
/* the stanford entry point.                                           */
/* ------------------------------------------------------------------ */

export interface NativeParseResult {
  status: "complete" | "recovered" | "failed";
  linkages: number;
  nullCount: number;
  relations: NativeRelation[];
  error?: string;
}

export async function nativeRelations(text: string): Promise<NativeParseResult> {
  let parsed;
  try {
    parsed = await parseSentenceWasm(text);
  } catch (err) {
    return {
      status: "failed",
      linkages: 0,
      nullCount: 0,
      relations: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
  if (!parsed.ok || parsed.nullCount !== 0) {
    return {
      status: parsed.ok ? "recovered" : "failed",
      linkages: parsed.ok ? parsed.linkages : 0,
      nullCount: parsed.ok ? parsed.nullCount : 0,
      relations: [],
      error: parsed.ok ? undefined : parsed.error,
    };
  }
  const graph = buildStanfordGraph(parsed.words, parsed.links as StanfordLinkInput[]);
  const errors = applyTaggingAndSemantic(graph);
  return {
    status: "complete",
    linkages: parsed.linkages,
    nullCount: 0,
    relations: collectNativeRelations(graph.root),
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}
