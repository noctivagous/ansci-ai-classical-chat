/**
 * linkgrammar-stanford.ts — Stanford-style dependency output
 * over the WASM Link Grammar parse, by running RelEx's
 * Stanford-compatibility rules with a faithful port of the
 * RelEx rule engine.
 *
 * What this is: the 61 #TemplateActionAlg rules in
 * data/relex-stanford.algs (vendored verbatim upstream text,
 * see scripts/import-relex-stanford-algs.mjs) run against a
 * feature graph built from the first linkage, with the same
 * match/apply semantics the Java engine has — including the
 * aliasing makePath behaviour the rule set depends on
 * (`ref` nodes shared between a word and its relations).
 * Output is `rel(governor-i, dependent-j)` relations in the
 * Stanford naming the rules assign (det, aux, cop, prt,
 * and the other self-contained families), sorted
 * deterministically by (governor, dependent, relation).
 * One documented exception: SF_DET_POSS expects the older
 * label "Ds*w"; Link Grammar 5.13 emits "Ds*wc", which the
 * Java engine also fails to match (verified), so "whose"
 * currently yields det, not poss.
 *
 * What this is not: RelEx runs these rules AFTER its tagging
 * and semantic passes. This port runs the stanford file
 * standalone. Rule conditions that only the semantic pass can
 * satisfy — head-word percolation, NEGATIVE-FLAG, HEAD-FLAG
 * (main-verb marking), tense/first_verb, subj/obj/expl
 * propagation — therefore never match here, and the relations
 * that depend on them (nsubj, dobj, xsubj, csubj, neg,
 * nsubjpass, partmod, advcl/ccomp families, prep_*, agent)
 * are not produced. The AnSci adapter
 * (src/ansci/linkgrammar-adapter.ts) already covers the
 * subject/object core (agent/patient candidates, gated);
 * this layer adds the modifier/auxiliary/copula relations the
 * adapter never proposes. The gap list is asserted by tests,
 * not just documented: every semantic-dependent relation
 * family has a test pinning its absence.
 *
 * Deliberate deviations from the Java engine, all covered by
 * tests: (1) graph traversal order is insertion order
 * (Java iterates a HashMap); output relations are sorted, so
 * order never leaks into results. (2) `str` (morphology root)
 * is the lowercased linkage word with be-forms mapped to
 * "be" — the only `str` tests in the rule file are `be`,
 * `when|who`, which this answers exactly. (3) `pos` is never
 * set (RelEx sets it in its tagging pass; the one stanford
 * rule reading it, SF_INFMOD, matches nothing in RelEx
 * either). (4) No WordNet, no OpenNLP, no JNI: the graph is
 * built from the WASM linkage JSON directly.
 *
 * License: engine is a clean-room port of Apache-2.0 RelEx
 * algorithms (opencog/relex, see NOTICE); the rule text is
 * the upstream Apache-2.0 file, shipped verbatim.
 */
import { parseSentenceWasm } from "./linkgrammar-wasm";
import { RELEX_STANFORD_ALGS } from "./linkgrammar-stanford-rules";

/* ------------------------------------------------------------------ */
/* Feature graph nodes.                                                */
/*                                                                     */
/* Mirrors relex.feature.FeatureNode: a node is either a valued      */
/* leaf (a string) or a map of named child features, never both      */
/* (an empty map means "no features yet", not a value). Parents are   */
/* tracked so a node can be rewired in place (replaceSelfWith).       */
/* ------------------------------------------------------------------ */

export class LgFeatureNode {
  value: string | null = null;
  children: Map<string, LgFeatureNode> | null = new Map();
  parents: Set<LgFeatureNode> = new Set();

  constructor(value?: string) {
    if (value !== undefined) {
      this.children = null;
      this.value = value;
    }
  }

  get isValued(): boolean {
    return this.children === null;
  }

  isEmpty(): boolean {
    if (this.isValued) return this.value == null;
    return (this.children as Map<string, LgFeatureNode>).size === 0;
  }

  get(key: string): LgFeatureNode | null {
    if (this.isValued) {
      throw new Error("string-valued FeatureNodes have no keys");
    }
    return (this.children as Map<string, LgFeatureNode>).get(key) ?? null;
  }

  set(key: string, target: LgFeatureNode | null): void {
    if (this.isValued) {
      throw new Error("cannot set key-value pair for a string-valued FeatureNode");
    }
    if (key == null) throw new Error("key was null");
    const kids = this.children as Map<string, LgFeatureNode>;
    const old = kids.get(key);
    if (target === null) {
      kids.delete(key);
    } else {
      target.parents.add(this);
      kids.set(key, target);
    }
    if (old !== undefined && ![...kids.values()].includes(old)) {
      old.parents.delete(this);
    }
  }

  forceValue(val: string): void {
    if (this.children !== null && this.children.size > 0) {
      throw new Error("Must clear features before forcing value.");
    }
    this.children = null;
    this.value = val;
  }

  forceFeatures(): void {
    if (this.value != null) {
      throw new Error("Must set value to null before forcing features.");
    }
    if (this.children == null) this.children = new Map();
  }

  pathTarget(path: string[]): LgFeatureNode | null {
    let cur: LgFeatureNode | null = this;
    for (const step of path) {
      if (cur === null) return null;
      if (cur.isValued) return null;
      cur = cur.get(step);
    }
    return cur;
  }

  makePath(path: string[], target: LgFeatureNode | null): void {
    let cur: LgFeatureNode = this;
    for (let i = 0; i < path.length; i++) {
      if (cur.isValued) {
        throw new Error("cannot traverse a valued node while making a path");
      }
      const last: LgFeatureNode = cur;
      let nxt = cur.get(path[i]);
      if (nxt == null) {
        nxt = i === path.length - 1 ? target : new LgFeatureNode();
        if (nxt == null) throw new Error("cannot make a path to a null target");
        last.set(path[i], nxt);
      }
      cur = nxt;
    }
  }

  substitute(oldF: LgFeatureNode, newF: LgFeatureNode): void {
    if (oldF === newF || this.isValued) return;
    for (const [k, v] of [...(this.children as Map<string, LgFeatureNode>)]) {
      if (v === oldF) this.set(k, newF);
    }
  }

  replaceSelfWith(other: LgFeatureNode): void {
    if (other === this) return;
    for (const p of [...this.parents]) p.substitute(this, other);
    if (this.parents.size > 0) {
      throw new Error("replace self failed");
    }
  }

  mergeWith(other: LgFeatureNode): LgFeatureNode {
    if (other === this) return this;
    if (other.isEmpty()) {
      other.replaceSelfWith(this);
      return other;
    }
    if (this.isEmpty()) {
      this.replaceSelfWith(other);
      return this;
    }
    if (this.isValued) {
      if (!other.isValued || other.value !== this.value) {
        throw new Error("cannot merge into a non-empty valued node");
      }
    } else {
      if (other.isValued) {
        throw new Error("cannot merge a valued node into a feature node");
      }
      for (const name of other.getFeatureNames()) {
        const otherf = other.get(name) as LgFeatureNode;
        const thisf = this.get(name);
        if (otherf !== thisf) {
          throw new Error("cannot merge inconsistent features: " + name);
        }
      }
    }
    return this;
  }

  copyInto(other: LgFeatureNode): LgFeatureNode {
    if (other === this) return this;
    if (this.isValued) {
      if (!other.isValued) {
        throw new Error("cannot merge a nonvalued node into a valued node");
      }
    } else if (other.isValued) {
      throw new Error("cannot merge a valued node into a feature node");
    }
    if (!this.isValued) {
      for (const name of other.getFeatureNames()) {
        this.set(name, other.get(name) as LgFeatureNode);
      }
    }
    return this;
  }

  getFeatureNames(): string[] {
    if (this.isValued) {
      throw new Error("valued FeatureNodes have no features");
    }
    return [...(this.children as Map<string, LgFeatureNode>).keys()];
  }
}

/* ------------------------------------------------------------------ */
/* Template matching.                                                  */
/*                                                                     */
/* A template line is `<path...> sep target` with sep `=` or `!=`.    */
/* A path target `<a b>` walks features; a plain-string target is     */
/* matched against the node's value: `$var` binds, `%` matches only   */
/* missing-or-empty, otherwise `|`-separated alternatives where a     */
/* leading backslash marks a full-match regex in which `\.` stands    */
/* for `[a-z\*]` (Java Pattern semantics, mirrored here).             */
/* ------------------------------------------------------------------ */

function matchesVal(test: string, val: string): boolean {
  // Exact mirror of relex.feature.FeatureTemplate.matchesVal.
  if (test.startsWith("\\")) {
    test = test.slice(1);
    if (!test.startsWith("\\")) {
      const re = new RegExp("^(?:" + test.replace(/\\\./g, "[a-z\\*]") + ")$");
      return re.test(val);
    }
    return test === val;
  }
  return test === val;
}

export interface LgTemplateCond {
  path: string[];
  negated: boolean;
  targetPath: string[] | null;
  targetStr: string | null;
}

function parseCondLine(line: string): LgTemplateCond {
  const m = line.match(/^(<[^<>]*>)\s*(!=|=)\s*(.*)$/);
  if (!m) throw new Error("bad template line: " + line);
  const path = parsePath(m[1]);
  const rhs = m[3].trim();
  if (rhs.startsWith("<")) {
    return { path, negated: m[2] === "!=", targetPath: parsePath(rhs), targetStr: null };
  }
  return { path, negated: m[2] === "!=", targetPath: null, targetStr: rhs };
}

function parsePath(text: string): string[] {
  const t = text.trim();
  if (!t.startsWith("<")) throw new Error("not a path: " + text);
  const end = t.indexOf(">");
  if (end < 0) throw new Error("unterminated path: " + text);
  const inner = t.slice(1, end).trim();
  return inner === "" ? [] : inner.split(/\s+/);
}

function matchCond(
  node: LgFeatureNode,
  cond: LgTemplateCond,
  vars: Map<string, LgFeatureNode>,
): boolean {
  const fTarget = node.pathTarget(cond.path);
  if (fTarget == null) {
    // Java: missing path matches only a null-string target.
    return !cond.targetPath && cond.targetStr === "%";
  }
  if (cond.targetPath) {
    const gTarget = node.pathTarget(cond.targetPath);
    if (gTarget == null) throw new Error("path pair target missing");
    if (fTarget.isValued && gTarget.isValued) {
      return fTarget.value === gTarget.value;
    }
    return fTarget === gTarget;
  }
  const pathTarg = cond.targetStr as string;
  if (pathTarg === "%") {
    return fTarget.isEmpty() || (fTarget.isValued && (fTarget.value as string).length === 0);
  }
  if (pathTarg.startsWith("$")) {
    vars.set(pathTarg.slice(1), fTarget);
    return true;
  }
  if (!fTarget.isValued) return false;
  const val = fTarget.value as string;
  for (const alt of pathTarg.split(/\s*\|\s*/)) {
    if (matchesVal(alt, val)) return true;
  }
  return false;
}

export function matchTemplate(
  node: LgFeatureNode,
  conds: LgTemplateCond[],
  vars: Map<string, LgFeatureNode>,
): boolean {
  for (const c of conds) {
    const hit = matchCond(node, c, vars);
    if (c.negated ? hit : !hit) return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Actions. `<path...> (=|+=|<=) <path...>|string|%|$var`.             */
/* doActionEquals/CopyIn/Append mirror the Java control flow exactly, */
/* including the fall-through that aliases both sides to one node.    */
/* ------------------------------------------------------------------ */

export interface LgAction {
  path: string[];
  kind: "=" | "+=" | "<=";
  targetPath: string[] | null;
  targetStr: string | null;
}

export function parseActionLine(line: string): LgAction {
  let idx = line.indexOf("<=");
  let kind: "=" | "+=" | "<=" = "<=";
  if (idx < 0) {
    idx = line.indexOf("+=");
    kind = "+=";
  }
  if (idx < 0) {
    idx = line.indexOf("=");
    kind = "=";
  }
  if (idx < 0) throw new Error("bad action line (no separator): " + line);
  const lhs = line.slice(0, idx).trim();
  const rhs = line.slice(idx + kind.length).trim();
  if (!lhs.startsWith("<")) throw new Error("bad action lhs: " + line);
  const path = parsePath(lhs);
  if (rhs.startsWith("<")) return { path, kind, targetPath: parsePath(rhs), targetStr: null };
  return { path, kind, targetPath: null, targetStr: rhs };
}

const MEMBER_PREFIX = "member";

function groupMembers(node: LgFeatureNode): LgFeatureNode[] {
  if (node.isValued) return [];
  const out: LgFeatureNode[] = [];
  for (const name of node.getFeatureNames()) {
    if (name.length > MEMBER_PREFIX.length && name.startsWith(MEMBER_PREFIX)) {
      const kid = node.get(name);
      if (kid) out.push(kid);
    }
  }
  return out;
}

function isGroup(node: LgFeatureNode): boolean {
  return groupMembers(node).length > 0;
}

function addGroupMember(group: LgFeatureNode, other: LgFeatureNode): void {
  if (other === group) return;
  if (isGroup(other)) {
    for (const m of groupMembers(other)) addGroupMember(group, m);
    return;
  }
  for (const m of groupMembers(group)) if (m === other) return;
  group.set(MEMBER_PREFIX + groupMembers(group).length, other);
}

function appendToSelf(
  ths: LgFeatureNode,
  other: LgFeatureNode,
  parent: LgFeatureNode,
  featName: string,
): void {
  if (other === ths) return;
  let group = ths;
  if (!isGroup(ths)) {
    group = new LgFeatureNode();
    addGroupMember(group, ths);
    parent.set(featName, group);
  }
  addGroupMember(group, other);
}

function doActionEquals(
  f: LgFeatureNode,
  path: string[],
  left: LgFeatureNode | null,
  right: LgFeatureNode | null,
  rightValStr: string | null,
  targetPath: string[] | null,
): void {
  if (left == null && right == null) {
    left = new LgFeatureNode();
    f.makePath(path, left);
  }
  // CASE 1 (fall-through from above is intentional, as in Java):
  if (right == null && rightValStr == null) {
    if (targetPath == null) throw new Error("missing target path");
    f.makePath(targetPath, left);
    return;
  }
  // CASE 2:
  if (right == null) {
    if (left == null) throw new Error("no left node for value assignment");
    if (!left.isEmpty() && !left.isValued) {
      throw new Error("cannot set a non-empty non-valued node to a value");
    }
    left.forceValue(rightValStr as string);
    return;
  }
  // CASE 3:
  if (left == null) {
    f.makePath(path, right);
    return;
  }
  left.mergeWith(right);
}

function doActionCopyIn(
  f: LgFeatureNode,
  path: string[],
  left: LgFeatureNode | null,
  right: LgFeatureNode | null,
  rightValStr: string | null,
  targetPath: string[] | null,
): void {
  if (left == null) {
    left = new LgFeatureNode();
    f.makePath(path, left);
  }
  if (right == null && rightValStr == null) {
    if (targetPath == null) throw new Error("missing target path");
    f.makePath(targetPath, left);
    return;
  }
  if (right == null) {
    if (left == null) throw new Error("no left node for value assignment");
    if (!left.isEmpty() && !left.isValued) {
      throw new Error("cannot set a non-empty non-valued node to a value");
    }
    left.forceValue(rightValStr as string);
    return;
  }
  left.copyInto(right);
}

function doActionAppend(
  f: LgFeatureNode,
  path: string[],
  left: LgFeatureNode | null,
  right: LgFeatureNode | null,
  rightValStr: string | null,
  _targetPath: string[] | null,
): void {
  if (left == null || left.isEmpty()) {
    doActionEquals(f, path, left, right, rightValStr, _targetPath);
    return;
  }
  if (left.isValued) {
    const leftValStr = left.value as string;
    let tail: string | null = rightValStr;
    if (right != null) {
      if (!right.isValued) throw new Error("cannot append nonvalued node to a valued one");
      tail = right.value;
    }
    left.forceValue(leftValStr + "_" + (tail ?? ""));
    return;
  }
  if (right == null || right.isValued || right.isEmpty()) {
    throw new Error("cannot append an empty node or value to a non-valued node");
  }
  if (left != null && right != null && !left.isEmpty() && !right.isEmpty()) {
    const parentPath = path.slice(0, -1);
    const leftParent = f.pathTarget(parentPath);
    if (leftParent == null) throw new Error("append target has no parent");
    appendToSelf(left, right, leftParent, path[path.length - 1]);
    return;
  }
  throw new Error("unhandled append case");
}

function doActionClear(f: LgFeatureNode, path: string[]): void {
  const left = f.pathTarget(path);
  if (left == null) return;
  const parent = f.pathTarget(path.slice(0, -1));
  if (parent == null) throw new Error("clear target has no parent");
  parent.set(path[path.length - 1], null);
}

export function doAction(
  f: LgFeatureNode,
  act: LgAction,
  vars: Map<string, LgFeatureNode>,
): void {
  const left = f.pathTarget(act.path);
  let right: LgFeatureNode | null = null;
  let rightValStr: string | null = null;
  if (act.targetPath != null) {
    right = f.pathTarget(act.targetPath);
  } else {
    const str = act.targetStr as string;
    if (str.startsWith("$")) {
      right = vars.get(str.slice(1)) ?? null;
    } else if (str === "%") {
      doActionClear(f, act.path);
      return;
    } else if (left == null) {
      right = new LgFeatureNode(str);
    } else {
      rightValStr = str;
    }
  }
  if (act.kind === "=") {
    doActionEquals(f, act.path, left, right, rightValStr, act.targetPath);
  } else if (act.kind === "<=") {
    doActionCopyIn(f, act.path, left, right, rightValStr, act.targetPath);
  } else {
    doActionAppend(f, act.path, left, right, rightValStr, act.targetPath);
  }
}

/* ------------------------------------------------------------------ */
/* Rule file + applier. A rule is a signature, a list of template     */
/* conditions, and a list of actions. Rules apply in file order;      */
/* each sweeps every reachable node depth-first (insertion order),    */
/* skipping already-visited nodes, catching per-node errors the way  */
/* SentenceAlgorithm does. Unknown # kinds are skipped loudly.        */
/* ------------------------------------------------------------------ */

export interface LgRule {
  signature: string;
  conds: LgTemplateCond[];
  actions: LgAction[];
}

function splitRuleBlocks(text: string): { kind: string; body: string }[] {
  const out: { kind: string; body: string }[] = [];
  let curKind: string | null = null;
  let cur: string[] = [];
  const flush = () => {
    if (curKind != null) out.push({ kind: curKind, body: cur.join("\n") });
    curKind = null;
    cur = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith(";")) continue;
    if (line.startsWith("#")) {
      flush();
      curKind = line.slice(1).trim();
      continue;
    }
    if (curKind == null) continue;
    cur.push(line);
  }
  flush();
  return out;
}

function parseRuleBlock(kind: string, body: string, skippedKinds: Set<string>): LgRule | null {
  if (kind !== "TemplateActionAlg") {
    skippedKinds.add(kind);
    return null;
  }
  const lines = body.split("\n");
  const signature = lines[0].trim();
  const rest = lines.slice(1);
  const eq = rest.findIndex((l) => l.trim() === "=");
  if (eq < 0) throw new Error("rule without = delimiter: " + signature);
  const conds = rest.slice(0, eq).map(parseCondLine);
  const actions = rest.slice(eq + 1).map(parseActionLine);
  return { signature, conds, actions };
}

export interface LgRuleSet {
  rules: LgRule[];
  skippedKinds: string[];
}

export function parseRuleFile(text: string): LgRuleSet {
  const skipped = new Set<string>();
  const rules: LgRule[] = [];
  for (const b of splitRuleBlocks(text)) {
    const r = parseRuleBlock(b.kind, b.body, skipped);
    if (r) rules.push(r);
  }
  return { rules, skippedKinds: [...skipped] };
}

function walkAll(root: LgFeatureNode): LgFeatureNode[] {
  const seen = new Set<LgFeatureNode>();
  const out: LgFeatureNode[] = [];
  const visit = (n: LgFeatureNode): void => {
    if (seen.has(n)) return;
    seen.add(n);
    out.push(n);
    if (n.isValued) return;
    for (const k of n.getFeatureNames()) {
      const c = n.get(k);
      if (c) visit(c);
    }
  };
  visit(root);
  return out;
}

export function applyRules(
  root: LgFeatureNode,
  rules: LgRule[],
  onError?: (msg: string) => void,
): void {
  for (const rule of rules) {
    for (const node of walkAll(root)) {
      const vars = new Map<string, LgFeatureNode>();
      let matched = false;
      try {
        matched = matchTemplate(node, rule.conds, vars);
      } catch (err) {
        onError?.(rule.signature + " match: " + (err as Error).message);
        continue;
      }
      if (!matched) continue;
      try {
        for (const act of rule.actions) doAction(node, act, vars);
        const sig = node.get("SIG");
        if (sig == null) node.set("SIG", new LgFeatureNode(rule.signature));
        else sig.forceValue((sig.value ?? "") + " " + rule.signature);
      } catch (err) {
        onError?.(rule.signature + " apply: " + (err as Error).message);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Feature graph construction from a WASM linkage.                     */
/*                                                                     */
/* Mirrors LocalLGParser + RelationExtractor.stripSubscripts: words    */
/* keep LEFT-WALL at index 0, guess-marked words are cut at the       */
/* first '[', null brackets are removed, subscripts are split off     */
/* (numerics like "3.2" keep theirs), RIGHT-WALL and its links are     */
/* dropped. `str` is the morphy-lite root (be-forms map to "be";      */
/* RelEx's full Morphy would lemmatize the rest, but no stanford      */
/* rule tests any other lemma, so identity is exact here). Every      */
/* word gets this/wall/NEXT/PREV/index_in_sentence/orig_str/str,       */
/* an ENTITY-FLAG when capitalized, and a ref identity carrying       */
/* name (= str) and nameSource (= the word), exactly what RelEx's     */
/* BASIC_REF tagging rule installs (LEFT-WALL gets no str/ref,        */
/* matching Morphy skipping it). lab_L/lab_R carry the full label;    */
/* no stanford rule reads them separately. subscript/POS/start/end     */
/* char offsets are not built: no stanford rule reads them (POS is    */
/* only ever assigned by the tagging pass we do not run; SF_INFMOD's  */
/* `<pos> = noun` matches nothing in RelEx either).                    */
/* ------------------------------------------------------------------ */

const BE_FORMS = new Set(["am", "is", "are", "was", "were", "be", "been", "being"]);

function stripGuessMarks(word: string): string {
  const idx = word.indexOf("[");
  let w = idx > 0 ? word.slice(0, idx) : word;
  w = w.replace(/\[/g, "").replace(/\]/g, "");
  return w;
}

function splitSubscript(word: string): [string, string | null] {
  const dot = word.lastIndexOf(".");
  if (dot > 0 && dot < word.length - 1) {
    const base = word.slice(0, dot);
    if (!/^\d+$/.test(base)) return [base, word.slice(dot)];
  }
  return [word, null];
}

function morphyLite(word: string): string {
  if (BE_FORMS.has(word.toLowerCase())) return "be";
  return word;
}

export interface StanfordLinkInput {
  left: number;
  right: number;
  label: string;
}

function setLink(
  ths: LgFeatureNode,
  left: LgFeatureNode,
  right: LgFeatureNode,
  leftLabel: string,
  rightLabel: string,
  label: string,
): void {
  ths.set("F_L", left);
  addLinkward(left, 1, ths);
  ths.set("F_R", right);
  addLinkward(right, -1, ths);
  ths.set("lab_L", new LgFeatureNode(leftLabel));
  ths.set("lab_R", new LgFeatureNode(rightLabel));
  ths.set("LAB", new LgFeatureNode(label));
}

function numLinks(node: LgFeatureNode, direction: -1 | 1): number {
  const f = node.get(direction < 0 ? "num_left_links" : "num_right_links");
  if (f == null || !f.isValued) return 0;
  return parseInt(f.value ?? "0", 10) || 0;
}

function addLinkward(node: LgFeatureNode, direction: -1 | 1, link: LgFeatureNode): void {
  const key = direction < 0 ? "num_left_links" : "num_right_links";
  const n = numLinks(node, direction);
  const f = node.get(key);
  if (f == null) {
    const nv = new LgFeatureNode(String(n + 1));
    node.set(key, nv);
  } else {
    f.forceValue(String(n + 1));
  }
  const prefix = direction < 0 ? "linkL" : "linkR";
  node.set(prefix + n, link);
}

export interface StanfordGraph {
  root: LgFeatureNode;
  words: LgFeatureNode[];
}

export function buildStanfordGraph(
  words: string[],
  links: StanfordLinkInput[],
): StanfordGraph {
  // Drop a trailing RIGHT-WALL and any link touching it.
  let end = words.length;
  if (end > 0 && words[end - 1] === "RIGHT-WALL") end -= 1;
  const kept = new Set<number>();
  for (let i = 0; i < end; i++) kept.add(i);

  const wordNodes: LgFeatureNode[] = [];
  let prev: LgFeatureNode | null = null;
  let leftWall: LgFeatureNode | null = null;
  for (let i = 0; i < end; i++) {
    const fn = new LgFeatureNode();
    if (i === 0) leftWall = fn;
    fn.set("this", fn);
    fn.set("wall", leftWall as LgFeatureNode);
    const bare = stripGuessMarks(words[i]);
    if (bare.length === 0) continue;
    const [base, _sub] = splitSubscript(bare);
    void _sub;
    fn.set("orig_str", new LgFeatureNode(base));
    fn.set("index_in_sentence", new LgFeatureNode(String(i)));
    if (/^[A-Z]/.test(base)) fn.set("ENTITY-FLAG", new LgFeatureNode("T"));
    if (prev) {
      prev.set("NEXT", fn);
      fn.set("PREV", prev);
    }
    // BASIC_REF equivalent: identity, name (= str), nameSource.
    if (base !== "LEFT-WALL") {
      const str = new LgFeatureNode(morphyLite(base));
      fn.set("str", str);
      const ref = new LgFeatureNode();
      ref.set("name", str);
      ref.set("nameSource", fn);
      fn.set("ref", ref);
    }
    wordNodes[i] = fn;
    prev = fn;
  }

  for (const l of links) {
    if (!kept.has(l.left) || !kept.has(l.right)) continue;
    const left = wordNodes[l.left];
    const right = wordNodes[l.right];
    if (!left || !right) continue;
    const link = new LgFeatureNode();
    setLink(link, left, right, l.label, l.label, l.label);
  }

  return { root: wordNodes[0], words: wordNodes };
}

/* ------------------------------------------------------------------ */
/* Stanford view: walk every node, emit `rel(gov-i, dep-j)` for each  */
/* sf-links relation found, resolved through nameSource, in          */
/* deterministic (governor, dependent, relation) order.                */
/* ------------------------------------------------------------------ */

export interface StanfordRelation {
  rel: string;
  gov: string;
  govIdx: number;
  dep: string;
  depIdx: number;
}

function wordOfNameSource(node: LgFeatureNode | null): LgFeatureNode | null {
  if (!node) return null;
  const ns = node.get("nameSource");
    if (!ns) return null;
  if (ns.isValued) return null;
  return ns;
}

function wordNameAndIndex(word: LgFeatureNode): { name: string; idx: number } | null {
  let orig: LgFeatureNode | null = null;
  let index: LgFeatureNode | null = null;
  try {
    orig = word.get("orig_str");
    index = word.get("index_in_sentence");
  } catch {
    return null;
  }
  if (!orig || !orig.isValued || !index || !index.isValued) return null;
  const idx = parseInt(index.value as string, 10);
  if (!Number.isFinite(idx)) return null;
  return { name: orig.value as string, idx };
}

export function collectStanfordRelations(root: LgFeatureNode): StanfordRelation[] {
  const out: StanfordRelation[] = [];
  const seen = new Set<LgFeatureNode>();
  const visit = (node: LgFeatureNode): void => {
    if (seen.has(node)) return;
    seen.add(node);
    if (!node.isValued) {
      const container = node.get("sf-links");
      if (container && !container.isValued) {
        // Skip LEFT-WALL hubs the way RelationForeach does.
        const nm = node.get("name");
        const isLeftWall = !!nm && nm.isValued && nm.value === "LEFT-WALL";
        if (!isLeftWall) {
          for (const rel of container.getFeatureNames()) {
            const target = container.get(rel);
            if (!target || target.isValued) continue;
            const members: LgFeatureNode[] = [];
            const m0 = target.get("member0");
            if (m0) {
              for (let i = 0; ; i++) {
                const m = target.get("member" + i);
                if (!m) break;
                members.push(m);
              }
            } else {
              members.push(target);
            }
            for (const m of members) {
              const govWord = wordOfNameSource(node);
              const depWord = wordOfNameSource(m);
              if (!govWord || !depWord) continue;
              const gov = wordNameAndIndex(govWord);
              const dep = wordNameAndIndex(depWord);
              if (!gov || !dep) continue;
              const relName = rel.startsWith("_") ? rel.slice(1) : "prep_" + rel;
              out.push({ rel: relName, gov: gov.name, govIdx: gov.idx, dep: dep.name, depIdx: dep.idx });
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

export function formatStanfordRelations(rels: StanfordRelation[]): string {
  return rels.map((r) => `${r.rel}(${r.gov}-${r.govIdx}, ${r.dep}-${r.depIdx})`).join("\n");
}

/* ------------------------------------------------------------------ */
/* Entry point: parse a sentence with the WASM engine and return its  */
/* Stanford-style relations. Only complete linkages produce            */
/* relations (recovered parses abstain, like the adapter).             */
/* ------------------------------------------------------------------ */

let cachedRules: LgRule[] | null = null;

function stanfordRules(): LgRule[] {
  if (!cachedRules) {
    const parsed = parseRuleFile(RELEX_STANFORD_ALGS);
    if (parsed.rules.length === 0) throw new Error("no stanford rules loaded");
    cachedRules = parsed.rules;
  }
  return cachedRules;
}

export interface StanfordParseResult {
  status: "complete" | "recovered" | "failed";
  linkages: number;
  nullCount: number;
  relations: StanfordRelation[];
  error?: string;
}

export async function stanfordRelations(text: string): Promise<StanfordParseResult> {
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
  const graph = buildStanfordGraph(parsed.words, parsed.links);
  const errors: string[] = [];
  applyRules(graph.root, stanfordRules(), (e) => errors.push(e));
  return {
    status: "complete",
    linkages: parsed.linkages,
    nullCount: 0,
    relations: collectStanfordRelations(graph.root),
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}
