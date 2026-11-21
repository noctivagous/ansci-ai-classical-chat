/**
 * linkage.ts — the Link Grammar coverage slice's solver subset
 * (brief: docs/ansci/linkgrammar-coverage-slice.md).
 *
 * What this is: lazy per-sentence disjunct generation from the
 * dictionary's macro-expanded expression trees
 * (data/linkgrammar/trees-001.json, via src/linkgrammar.ts),
 * contextual pruning of the generated sets against the sentence
 * itself, and a bounded stack search for a planar, connected
 * linkage in the Sleator–Temperley sense — cost vector
 * (UNUSED, DIS, LEN) compared lexicographically, as upstream:
 * fewest unused words, then lowest total disjunct cost, then
 * lowest total link length.
 *
 * What it is not: the upstream parser. There is no post-
 * processing (4.0.knowledge), no constituent output, no panic
 * mode, and the wall policy is a stated leniency: left
 * connectors in the W / WV / Xw families are satisfiable by the
 * left wall from any word, and right connectors in RW / Xp by
 * the right wall. Multi-connectors (@) match zero or more
 * links, on both sides. These leniencies admit more linkages
 * than upstream counts (the shadow measurement in the Linkage
 * placeholder records the comparison); the search's job in
 * this slice is to produce structure evidence for the parser,
 * not to reproduce upstream's counts.
 *
 * Bounds are parameters, and a hit is recorded in the result,
 * never silent: sentence-length cap, per-form generation cap,
 * per-word pruned-disjunct cap, search-node budget, and a
 * linkage-count cap. On a bound the solver declines (or
 * returns its best partial) and the caller's parse stands —
 * the solver is a proposer, not a replacement.
 *
 * The layer is optional in the provider pattern: when the
 * Link Grammar table (or its trees) is absent, or the layer is
 * switched off, solveLinkage returns undefined and no shadow
 * record is produced.
 */

import { getDefaultLinkGrammarTable, type LinkGrammarExprTree } from "../linkgrammar";
import type { LinkageShadow } from "./sentence";

/* ---------------- connector machinery ---------------- */

/** The link family of a connector: strip @, the sign, any
 *  lower-case head/dependent prefix, and subscript letters —
 *  'Os+' -> 'O', '@MVp-' -> 'MV', 'dWV-' -> 'WV'. Mirrors the
 *  converter's connector_family. */
export function connectorFamily(conn: string): string {
  const c = conn.replace(/^@/, "").replace(/[+-]$/, "");
  let i = 0;
  while (i < c.length && c[i] >= "a" && c[i] <= "z") i++;
  let j = i;
  while (j < c.length && c[j] >= "A" && c[j] <= "Z") j++;
  return c.slice(i, j);
}

/** Upstream's easy_match (connectors.h): an initial lower-case
 *  letter on both sides must DIFFER (head vs dependent); the
 *  upper-case parts must be identical; trailing subscripts
 *  match character-wise with '*' as a wildcard, a shorter
 *  subscript matching a longer one's prefix. Signs and @ are
 *  stripped before comparison. */
export function easyMatch(a: string, b: string): boolean {
  const x = a.replace(/^@/, "").replace(/[+-]$/, "");
  const y = b.replace(/^@/, "").replace(/[+-]$/, "");
  const ix = x.length && x[0] >= "a" && x[0] <= "z" ? x[0] : null;
  const iy = y.length && y[0] >= "a" && y[0] <= "z" ? y[0] : null;
  if (ix && iy && ix === iy) return false;
  const sx = ix ? x.slice(1) : x;
  const sy = iy ? y.slice(1) : y;
  let i = 0;
  while (i < sx.length && sx[i] >= "A" && sx[i] <= "Z") i++;
  let j = 0;
  while (j < sy.length && sy[j] >= "A" && sy[j] <= "Z") j++;
  if (sx.slice(0, i) !== sy.slice(0, j)) return false;
  const tx = sx.slice(i);
  const ty = sy.slice(j);
  for (let k = 0; k < Math.min(tx.length, ty.length); k++) {
    if (tx[k] === "*" || ty[k] === "*" || tx[k] === ty[k]) continue;
    return false;
  }
  return true;
}

const WALL_LEFT = new Set(["W", "WV", "Xw"]);
const WALL_RIGHT = new Set(["RW", "Xp"]);
const MAX_DISJUNCT_COST = 10.0; // the dictionary's own max-disjunct-cost

/* ---------------- disjunct generation ---------------- */

export interface Disjunct {
  /** Left connectors, nearest-first (expression order). */
  lefts: string[];
  /** Right connectors, nearest-first (expression order). */
  rights: string[];
  cost: number;
}

interface GenOut {
  seqs: [string[], number][];
  capped: boolean;
}

function genTree(tree: LinkGrammarExprTree, cap: number): GenOut {
  switch (tree[0]) {
    case "c":
      return { seqs: [[[tree[1]], 0]], capped: false };
    case "e":
      return { seqs: [[[], 0]], capped: false };
    case "|": {
      const seqs: [string[], number][] = [];
      let capped = false;
      for (const child of tree[1]) {
        const g = genTree(child, cap);
        for (const s of g.seqs) seqs.push(s);
        capped = capped || g.capped;
        if (seqs.length > cap) return { seqs: seqs.slice(0, cap), capped: true };
      }
      return { seqs, capped };
    }
    case "&": {
      let acc: [string[], number][] = [[[], 0]];
      let capped = false;
      for (const child of tree[1]) {
        const g = genTree(child, cap);
        capped = capped || g.capped;
        const next: [string[], number][] = [];
        for (const [s1, c1] of acc) {
          for (const [s2, c2] of g.seqs) {
            next.push([[...s1, ...s2], c1 + c2]);
            if (next.length > cap) return { seqs: next.slice(0, cap), capped: true };
          }
        }
        acc = next;
      }
      return { seqs: acc, capped };
    }
    case "?": {
      const g = genTree(tree[1], cap);
      return { seqs: [[[], 0] as [string[], number], ...g.seqs], capped: g.capped };
    }
    case "$": {
      const g = genTree(tree[2], cap);
      return { seqs: g.seqs.map(([s, c]) => [s, c + tree[1]] as [string[], number]), capped: g.capped };
    }
  }
}

export interface FormDisjuncts {
  disjuncts: Disjunct[];
  rawGenerated: number;
  generationCapped: boolean;
}

const genCache = new Map<string, FormDisjuncts | undefined>();
const GEN_CACHE_MAX = 1024;

/** Generate one word form's disjuncts from its entries'
 *  expression trees: union over entries, cost-pruned at the
 *  dictionary's max-disjunct-cost, deduplicated by connector
 *  sequence keeping the cheapest cost. Generation is the
 *  solver's dominant cost and chat vocabulary repeats, so
 *  results are memoised per form (bounded; the cache is a
 *  pure function of the dictionary table). */
export function generateDisjuncts(form: string, genCap = 40_000): FormDisjuncts | undefined {
  if (genCap === 40_000 && genCache.has(form)) return genCache.get(form);
  const out = generateDisjunctsFresh(form, genCap);
  if (genCap === 40_000) {
    if (genCache.size >= GEN_CACHE_MAX) genCache.clear();
    genCache.set(form, out);
  }
  return out;
}

function generateDisjunctsFresh(form: string, genCap: number): FormDisjuncts | undefined {
  const table = getDefaultLinkGrammarTable();
  if (!table) return undefined;
  const refs = table.forms.get(form);
  if (!refs) return undefined;
  const best = new Map<string, Disjunct>();
  let raw = 0;
  let capped = false;
  for (const [eid] of refs) {
    const tree = table.trees[eid];
    if (!tree) continue;
    const g = genTree(tree, genCap);
    capped = capped || g.capped;
    raw += g.seqs.length;
    for (const [seq, cost] of g.seqs) {
      if (cost > MAX_DISJUNCT_COST) continue;
      const lefts = seq.filter((c) => c.endsWith("-"));
      const rights = seq.filter((c) => c.endsWith("+"));
      const key = `${lefts.join(" ")}|${rights.join(" ")}`;
      const prev = best.get(key);
      if (!prev || cost < prev.cost) best.set(key, { lefts, rights, cost });
    }
  }
  return { disjuncts: [...best.values()], rawGenerated: raw, generationCapped: capped };
}

/* ---------------- lazy disjunct streams ----------------
 *
 * Upstream never enumerates a word's disjuncts: its matcher
 * works on the expression structure directly. Full enumeration
 * is this port's measured bottleneck (a common verb's tree
 * expands to six figures of sequences), so the solver pulls
 * disjuncts lazily: each word gets a stream that enumerates
 * its trees' cross-products on demand (odometer order, the
 * eager generator's order), deduplicates and contextually
 * filters as it goes, and caches what it has delivered so the
 * backtracking search can replay a word's disjuncts for free.
 * A subtree array materialised inside an &-node is capped
 * (ARRAY_CAP) with the hit recorded on the stream; the
 * product itself is never materialised.
 */

const ARRAY_CAP = 20_000;

interface GenState {
  arrayCapHit: boolean;
}

function* genTreeLazy(tree: LinkGrammarExprTree, st: GenState): Generator<[string[], number]> {
  switch (tree[0]) {
    case "c":
      yield [[tree[1]], 0];
      return;
    case "e":
      yield [[], 0];
      return;
    case "|":
      for (const child of tree[1]) yield* genTreeLazy(child, st);
      return;
    case "?":
      yield [[], 0];
      yield* genTreeLazy(tree[1], st);
      return;
    case "$":
      for (const [s, c] of genTreeLazy(tree[2], st)) yield [s, c + tree[1]];
      return;
    case "&": {
      const arrs: [string[], number][][] = [];
      for (const child of tree[1]) {
        const arr: [string[], number][] = [];
        for (const item of genTreeLazy(child, st)) {
          arr.push(item);
          if (arr.length >= ARRAY_CAP) {
            st.arrayCapHit = true;
            break;
          }
        }
        arrs.push(arr);
      }
      if (arrs.some((a) => a.length === 0)) return;
      const idx = arrs.map(() => 0);
      for (;;) {
        const seq: string[] = [];
        let cost = 0;
        for (let k = 0; k < arrs.length; k++) {
          const [s, c] = arrs[k][idx[k]];
          for (const conn of s) seq.push(conn);
          cost += c;
        }
        yield [seq, cost];
        let p = arrs.length - 1;
        while (p >= 0) {
          idx[p]++;
          if (idx[p] < arrs[p].length) break;
          idx[p] = 0;
          p--;
        }
        if (p < 0) return;
      }
    }
  }
}

/** A word form's connector inventories, read off its entries'
 *  trees without expansion: the names it can offer leftward
 *  (its right connectors) and rightward (its left connectors). */
function formInventories(form: string): { leftNames: Set<string>; rightNames: Set<string> } | undefined {
  const table = getDefaultLinkGrammarTable();
  if (!table) return undefined;
  const refs = table.forms.get(form);
  if (!refs) return undefined;
  const leftNames = new Set<string>();
  const rightNames = new Set<string>();
  const walk = (tree: LinkGrammarExprTree) => {
    const stack: LinkGrammarExprTree[] = [tree];
    while (stack.length) {
      const node = stack.pop()!;
      if (node[0] === "c") {
        const name = node[1].replace(/^@/, "");
        if (name.endsWith("-")) leftNames.add(name.slice(0, -1));
        else if (name.endsWith("+")) rightNames.add(name.slice(0, -1));
      } else if (node[0] === "&" || node[0] === "|") {
        for (const ch of node[1]) stack.push(ch);
      } else if (node[0] === "?") {
        stack.push(node[1]);
      } else if (node[0] === "$") {
        stack.push(node[2]);
      }
    }
  };
  for (const [eid] of refs) {
    const tree = table.trees[eid];
    if (tree) walk(tree);
  }
  return { leftNames, rightNames };
}

/**
 * A form's raw disjunct enumeration, shared across solves in
 * the process: enumeration, deduplication and the cost filter
 * are properties of the dictionary alone, so a form's stream
 * is built once and every sentence replays it from the cache,
 * pulling further only when a search goes deeper than any
 * before it. (The per-sentence contextual filter is NOT
 * shared — it depends on the sentence's other words.)
 */
class RawDisjunctStream {
  readonly cache: Disjunct[] = [];
  rawPulled = 0;
  arrayCapHit = false;
  exhausted = false;
  private seen = new Set<string>();
  private gen: Generator<Disjunct> | undefined;
  private st: GenState = { arrayCapHit: false };

  constructor(private trees: (LinkGrammarExprTree | null)[]) {}

  /** The k-th raw disjunct (deduplicated, cost-filtered), or
   *  undefined when enumeration is exhausted before it. */
  at(k: number): Disjunct | undefined {
    while (this.cache.length <= k && !this.exhausted) {
      if (!this.gen) this.gen = this.makeGen();
      const nxt = this.gen.next();
      if (nxt.done) {
        this.exhausted = true;
        break;
      }
      this.cache.push(nxt.value);
    }
    return this.cache[k];
  }

  private *makeGen(): Generator<Disjunct> {
    for (const tree of this.trees) {
      if (!tree) continue;
      for (const [seq, cost] of genTreeLazy(tree, this.st)) {
        this.rawPulled++;
        if (this.st.arrayCapHit) this.arrayCapHit = true;
        if (cost > MAX_DISJUNCT_COST) continue;
        const lefts = seq.filter((c) => c.endsWith("-"));
        const rights = seq.filter((c) => c.endsWith("+"));
        const key = `${lefts.join(" ")}|${rights.join(" ")}`;
        if (this.seen.has(key)) continue;
        this.seen.add(key);
        yield { lefts, rights, cost };
      }
    }
  }
}

const rawStreams = new Map<string, RawDisjunctStream>();

function rawStreamFor(form: string): RawDisjunctStream | undefined {
  const table = getDefaultLinkGrammarTable();
  if (!table) return undefined;
  let stream = rawStreams.get(form);
  if (!stream) {
    const refs = table.forms.get(form);
    if (!refs) return undefined;
    if (rawStreams.size >= GEN_CACHE_MAX) rawStreams.clear();
    stream = new RawDisjunctStream(refs.map(([eid]) => table.trees[eid]));
    rawStreams.set(form, stream);
  }
  return stream;
}

class DisjunctStream {
  readonly cache: Disjunct[] = [];
  private gen: Generator<Disjunct> | undefined;
  private exhausted = false;

  constructor(
    private raw: RawDisjunctStream,
    private accept: (d: Disjunct) => boolean,
  ) {}

  get rawPulled(): number {
    return this.raw.rawPulled;
  }
  get arrayCapHit(): boolean {
    return this.raw.arrayCapHit;
  }

  /** The k-th acceptable disjunct, or undefined when the
   *  stream is exhausted before it. Delivery is in approximate
   *  cost order: the generator's output is buffered in chunks,
   *  each chunk sorted by disjunct cost before delivery — the
   *  eager version's global cost sort is what let its branch-
   *  and-bound find good linkages early, and the chunked sort
   *  keeps that property without materialising the full set. */
  at(k: number): Disjunct | undefined {
    while (this.cache.length <= k && !this.exhausted) {
      if (!this.gen) this.gen = this.makeGen();
      const chunk: Disjunct[] = [];
      while (chunk.length < 32) {
        const nxt = this.gen.next();
        if (nxt.done) {
          this.exhausted = true;
          break;
        }
        chunk.push(nxt.value);
      }
      chunk.sort((a, b) => a.cost - b.cost);
      for (const d of chunk) this.cache.push(d);
      if (chunk.length === 0) break;
    }
    return this.cache[k];
  }

  get delivered(): number {
    return this.cache.length;
  }

  private *makeGen(): Generator<Disjunct> {
    for (let k = 0; ; k++) {
      const d = this.raw.at(k);
      if (!d) return;
      if (!this.accept(d)) continue;
      yield d;
    }
  }
}

/* ---------------- the bounded search ---------------- */

export interface SolveBounds {
  lengthCap: number;
  perWordCap: number;
  searchBudget: number;
  countCap: number;
  /** Wall-clock budget for one sentence's search. The shadow
   *  runs beside every English parse, including the parser's
   *  internal re-parses, so its cost per sentence is capped in
   *  time as well as in nodes; a hit is recorded in the result
   *  ("time-budget") and the best partial stands as the record.
   *  The parse itself never depends on the shadow, so the
   *  budget's machine-dependence costs the record nothing. */
  timeBudgetMs: number;
  /** Sentence weight cap: the sum of the sentence's forms'
   *  live-disjunct counts, which the dictionary conversion
   *  recorded exactly per entry — so a sentence's enumeration
   *  weight is known before any generation happens. A sentence
   *  over the cap declines with the estimate on the record
   *  ("weight-cap"): deterministic, machine-independent, and
   *  the reason the shadow can ride every parse without
   *  taxing the heavy tail. */
  weightCap: number;
}

export const DEFAULT_BOUNDS: SolveBounds = {
  lengthCap: 24,
  perWordCap: 512,
  // The shadow runs beside every English parse, so its bounds
  // are set for chat duty: a plain sentence completes well
  // inside them, and a sentence that would need more records
  // its budget hit and returns its best partial as the record
  // instead of burning the parse's time. Callers measuring the
  // solver (scripts/ansci-linkage-shadow.mjs) pass the same
  // defaults — the measurement is of the shipped behaviour,
  // not of a research configuration.
  searchBudget: 3_000,
  countCap: 512,
  timeBudgetMs: 25,
  weightCap: 160_000,
};

interface StackEntry {
  word: number;
  conn: string;
  multi: boolean;
}

interface FoundLink {
  left: number;
  right: number;
  leftConn: string;
  rightConn: string;
}

let enabled = true;
export function setLinkageEnabled(on: boolean): void {
  enabled = on;
}
export function linkageEnabled(): boolean {
  return enabled;
}

/** Family routing switches (coverage slice, stage 3). A
 *  family routes only when its held-out gate has passed; the
 *  switch exists so a gate run can compare routed and unrouted
 *  behaviour on identical code. Routing reads ONLY complete
 *  linkages — a partial (UNUSED > 0) is evidence, never a
 *  parse, per the brief's hard rule. */
const routing = { f1: true };
export function setLinkageRouting(family: "f1", on: boolean): void {
  routing[family] = on;
}
export function linkageRouting(family: "f1"): boolean {
  return routing[family];
}

const PUNCT = new Set([".", "?", "!", ",", ";", ":"]);

/**
 * Solve one English sentence's linkage in shadow. `tokens` are
 * the parser's tokens (surface case, punctuation included);
 * punctuation tokens are excluded from the solver's stream and
 * are neither UNUSED nor skipped. Returns undefined when the
 * layer is off or the dictionary table is absent.
 */
export function solveLinkage(tokens: string[], bounds: SolveBounds = DEFAULT_BOUNDS): LinkageShadow | undefined {
  if (!enabled) return undefined;
  const table = getDefaultLinkGrammarTable();
  if (!table || table.trees.length === 0) return undefined;

  const words: string[] = [];
  const tokenIndices: number[] = [];
  tokens.forEach((t, idx) => {
    if (!PUNCT.has(t)) {
      words.push(t.toLowerCase());
      tokenIndices.push(idx);
    }
  });
  const boundsHit: string[] = [];
  if (words.length > bounds.lengthCap) {
    return {
      status: "declined",
      tokens: words,
      tokenIndices,
      links: [],
      unused: [],
      skipped: [],
      linkageCount: 0,
      countCapped: false,
      disjunctCost: 0,
      linkLength: 0,
      disjunctsGenerated: 0,
      prunedDisjuncts: [],
      searchNodes: 0,
      boundsHit: ["length-cap"],
      note: `sentence of ${words.length} content words exceeds the length cap of ${bounds.lengthCap}`,
    };
  }

  // Sentence weight: exact from the conversion's per-entry
  // live-disjunct counts, before any generation.
  let weight = 0;
  for (const w of new Set(words)) {
    let form = w;
    let refs = table.forms.get(form);
    if (!refs && w.endsWith("'s")) {
      form = w.slice(0, -2);
      refs = table.forms.get(form);
    }
    if (refs) for (const [eid] of refs) weight += table.entries[eid].disjuncts;
  }
  if (weight > bounds.weightCap) {
    return {
      status: "declined",
      tokens: words,
      tokenIndices,
      links: [],
      unused: [],
      skipped: [],
      linkageCount: 0,
      countCapped: false,
      disjunctCost: 0,
      linkLength: 0,
      disjunctsGenerated: 0,
      prunedDisjuncts: words.map(() => 0),
      searchNodes: 0,
      boundsHit: ["weight-cap"],
      note: `sentence weight ${weight} (summed live disjuncts) exceeds the weight cap of ${bounds.weightCap}`,
    };
  }

  const skipped: string[] = [];
  const n = words.length;
  // Per-word supplies: a lazy disjunct stream, or null for a
  // word with no dictionary record (skipped — neither linked
  // nor UNUSED). Contextual filtering is folded into each
  // stream's accept test, from the other words' tree
  // inventories: a mandatory connector must be offerable by
  // some word on the side it points to, or be wall-fed.
  const inventories = words.map((w) => {
    let inv = formInventories(w);
    if (!inv && w.endsWith("'s")) inv = formInventories(w.slice(0, -2));
    if (!inv) skipped.push(w);
    return inv;
  });
  const matchMemo = new Map<string, boolean>();
  const offeredBy = (names: Set<string>, want: string): boolean => {
    for (const o of names) {
      const key = `${o}|${want}`;
      let hit = matchMemo.get(key);
      if (hit === undefined) {
        hit = easyMatch(o, want);
        matchMemo.set(key, hit);
      }
      if (hit) return true;
    }
    return false;
  };
  const streams: (DisjunctStream | null)[] = words.map((w, i) => {
    const inv = inventories[i];
    if (!inv) return null;
    const leftOffer = new Set<string>();
    for (let j = 0; j < i; j++) {
      const o = inventories[j];
      if (o) for (const c of o.rightNames) leftOffer.add(c);
    }
    const rightOffer = new Set<string>();
    for (let j = i + 1; j < n; j++) {
      const o = inventories[j];
      if (o) for (const c of o.leftNames) rightOffer.add(c);
    }
    const accept = (d: Disjunct): boolean => {
      for (const c of d.lefts) {
        if (c.startsWith("@") || WALL_LEFT.has(connectorFamily(c))) continue;
        if (!offeredBy(leftOffer, c.replace(/-$/, ""))) return false;
      }
      for (const c of d.rights) {
        if (c.startsWith("@") || WALL_RIGHT.has(connectorFamily(c))) continue;
        if (!offeredBy(rightOffer, c.replace(/\+$/, ""))) return false;
      }
      return true;
    };
    let form = w;
    if (!table.forms.get(form) && w.endsWith("'s")) form = w.slice(0, -2);
    const raw = rawStreamFor(form);
    return raw ? new DisjunctStream(raw, accept) : null;
  });
  const active = streams;
  let nodes = 0;
  let exhausted = true;
  let timeHit = false;
  const deadline = performance.now() + bounds.timeBudgetMs;
  const overTime = () => {
    if (timeHit) return true;
    if (performance.now() > deadline) {
      timeHit = true;
      exhausted = false;
      return true;
    }
    return false;
  };
  let count = 0;
  let countCapped = false;
  let best: { disj: number; len: number; links: FoundLink[] } | undefined;
  let bestPartial: { linkedCount: number; disj: number; len: number; links: FoundLink[]; linked: boolean[] } | undefined;

  const considerPartial = (links: FoundLink[], linked: boolean[], disj: number, len: number) => {
    const linkedCount = linked.filter(Boolean).length;
    if (
      !bestPartial ||
      linkedCount > bestPartial.linkedCount ||
      (linkedCount === bestPartial.linkedCount && (disj < bestPartial.disj || (disj === bestPartial.disj && len < bestPartial.len)))
    ) {
      bestPartial = { linkedCount, disj, len, links: [...links], linked: [...linked] };
    }
  };

  // Match word i's left connectors against the stack, yielding
  // every way to satisfy them (multi semantics included).
  function* matchLefts(
    li: number,
    lefts: string[],
    stack: StackEntry[],
    links: FoundLink[],
    len: number,
    i: number,
  ): Generator<{ stack: StackEntry[]; links: FoundLink[]; len: number; any: boolean }> {
    if (nodes > bounds.searchBudget) return;
    if (li === lefts.length) {
      yield { stack, links, len, any: links.length > 0 };
      return;
    }
    const lc = lefts[li];
    if (WALL_LEFT.has(connectorFamily(lc))) {
      yield* matchLefts(li + 1, lefts, stack, links, len, i);
      return;
    }
    if (lc.startsWith("@")) {
      // Zero uses.
      yield* matchLefts(li + 1, lefts, stack, links, len, i);
      // One use against the stack top (a multi right stays).
      const top = stack[stack.length - 1];
      if (top && easyMatch(top.conn, lc)) {
        const nstack = top.multi ? stack : stack.slice(0, -1);
        yield* matchLefts(li + 1, lefts, nstack, [...links, { left: top.word, right: i, leftConn: lc, rightConn: top.conn }], len + (i - top.word), i);
      }
      return;
    }
    // Mandatory: close unused multi tops until a match or a
    // non-multi mismatch ends the attempt.
    let st = stack;
    for (;;) {
      const top = st[st.length - 1];
      if (!top) return;
      if (easyMatch(top.conn, lc)) {
        const nstack = top.multi ? st : st.slice(0, -1);
        yield* matchLefts(li + 1, lefts, nstack, [...links, { left: top.word, right: i, leftConn: lc, rightConn: top.conn }], len + (i - top.word), i);
        return;
      }
      if (top.multi) {
        st = st.slice(0, -1);
        continue;
      }
      return;
    }
  }

  const rec = (i: number, stack: StackEntry[], links: FoundLink[], disj: number, len: number, linked: boolean[]) => {
    if (nodes > bounds.searchBudget) {
      exhausted = false;
      return;
    }
    nodes++;
    if ((nodes & 255) === 0 && overTime()) return;
    considerPartial(links, linked, disj, len);
    if (best && count >= bounds.countCap) return;
    if (i === n) {
      for (const e of stack) {
        if (!e.multi && !WALL_RIGHT.has(connectorFamily(e.conn))) return;
      }
      if (!linked.every(Boolean)) return;
      count++;
      if (count >= bounds.countCap) countCapped = true;
      if (!best || disj < best.disj || (disj === best.disj && len < best.len)) {
        best = { disj, len, links: [...links] };
      }
      return;
    }
    const set = active[i];
    if (set === null) {
      // Skipped word (no dictionary record): it takes no part;
      // it is neither linked nor UNUSED.
      const nl = [...linked];
      nl[i] = true; // does not block completeness; recorded in `skipped`
      rec(i + 1, stack, links, disj, len, nl);
      return;
    }
    if (best && disj >= best.disj) return; // costs only grow
    for (let k = 0; ; k++) {
      if (k >= bounds.perWordCap) {
        const hit = `disjunct-cap:${words[i]}`;
        if (!boundsHit.includes(hit)) boundsHit.push(hit);
        break;
      }
      const d = set.at(k);
      if (!d) break;
      if (best && disj + d.cost > best.disj) continue;
      // Cheap pre-filter, exact case only: when the disjunct's
      // FIRST left connector is mandatory and not wall-fed, it
      // must be able to meet the stack (top, or a deeper entry
      // past closable multi tops) before a matcher is built.
      const firstLeft = d.lefts[0];
      if (firstLeft && !firstLeft.startsWith("@") && !WALL_LEFT.has(connectorFamily(firstLeft))) {
        let ok = false;
        for (let si = stack.length - 1; si >= 0; si--) {
          if (easyMatch(stack[si].conn, firstLeft)) {
            ok = true;
            break;
          }
          if (!stack[si].multi) break;
        }
        if (!ok) continue;
      }
      for (const m of matchLefts(0, d.lefts, stack, [], 0, i)) {
        const nstack = [...m.stack];
        for (const rc of d.rights) nstack.push({ word: i, conn: rc, multi: rc.startsWith("@") });
        const nl = [...linked];
        if (m.links.length > 0) nl[i] = true;
        for (const l of m.links) nl[l.left] = true;
        rec(i + 1, nstack, [...links, ...m.links], disj + d.cost, len + m.len, nl);
        if (nodes > bounds.searchBudget) return;
      }
    }
  };
  rec(0, [], [], 0, 0, words.map(() => false));
  if (!exhausted) boundsHit.push(timeHit ? "time-budget" : "search-budget");
  streams.forEach((s, i) => {
    if (s?.arrayCapHit) boundsHit.push(`generation-cap:${words[i]}`);
  });
  const generated = streams.reduce((a, s) => a + (s ? s.rawPulled : 0), 0);
  const prunedCounts = streams.map((s) => (s ? s.delivered : 0));

  const toRecordLinks = (found: FoundLink[]) =>
    found.map((l) => ({
      left: l.left,
      right: l.right,
      connector: l.rightConn.replace(/^@/, "").replace(/\+$/, ""),
      family: connectorFamily(l.rightConn),
    }));

  if (best) {
    return {
      status: "complete",
      tokens: words,
      tokenIndices,
      links: toRecordLinks(best.links),
      unused: [],
      skipped,
      linkageCount: count,
      countCapped,
      disjunctCost: Math.round(best.disj * 10000) / 10000,
      linkLength: best.len,
      disjunctsGenerated: generated,
      prunedDisjuncts: prunedCounts,
      searchNodes: nodes,
      boundsHit,
    };
  }
  if (bestPartial && bestPartial.linkedCount > 0) {
    const unused = words.filter((w, i) => !bestPartial!.linked[i] && streams[i] !== null);
    return {
      status: "partial",
      tokens: words,
      tokenIndices,
      links: toRecordLinks(bestPartial.links),
      unused,
      skipped,
      linkageCount: 0,
      countCapped: false,
      disjunctCost: Math.round(bestPartial.disj * 10000) / 10000,
      linkLength: bestPartial.len,
      disjunctsGenerated: generated,
      prunedDisjuncts: prunedCounts,
      searchNodes: nodes,
      boundsHit,
      note: exhausted ? "no complete linkage exists under the solver's rules" : `${timeHit ? "time" : "search"} budget exhausted before a complete linkage was found`,
    };
  }
  return {
    status: "declined",
    tokens: words,
    tokenIndices,
    links: [],
    unused: words.filter((w, i) => streams[i] !== null),
    skipped,
    linkageCount: 0,
    countCapped: false,
    disjunctCost: 0,
    linkLength: 0,
    disjunctsGenerated: generated,
    prunedDisjuncts: prunedCounts,
    searchNodes: nodes,
    boundsHit,
    note: exhausted ? "no complete or partial linkage under the solver's rules" : `${timeHit ? "time" : "search"} budget exhausted with no linkage found`,
  };
}
