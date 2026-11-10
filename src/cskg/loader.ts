/**
 * loader.ts — CSKG spike: stream-parse the CSKG KGTK TSV (Ilievski et
 * al., ESWC 2021; Zenodo record 4331372) into an in-memory adjacency
 * index keyed by normalised English terms.
 *
 * SPIKE SCOPE: this package is a self-contained experiment (2026-11-09
 * rescope). It does NOT touch the ontology pipeline (src/graph.ts,
 * src/wordnet.ts, src/framenet.ts, src/router.ts …). No MAPPED_TO
 * bridging, no propagation, no Wuxing. The question it answers is
 * narrower: can conversational management, thought tracing, session
 * memory and grounded rendering work over CSKG alone?
 *
 * Real schema of data/raw/cskg/cskg.tsv.gz (verified from the file):
 *   id, node1, relation, node2, node1;label, node2;label,
 *   relation;label, relation;dimension, source, sentence
 * `source` is the dataset column (CN, AT, RG, VG, WD, WN, FNC, FN, and
 * unions like "CN|WN") — preserved per edge as a bitmask and used as
 * the confidence proxy: support = number of distinct datasets
 * attesting the same (term, relation, term). CSKG carries no per-edge
 * numeric weight in this file, so support is all we have; the
 * renderer hedges on it.
 *
 * Node ids come in three shapes:
 *   /c/en/<term>                     plain ConceptNet-style term
 *   /c/en/<term>/n/wn/<sense>        WordNet-sensed term
 *   at:personx_<event_phrase>        ATOMIC event (PersonX …)
 * Normalisation: strip the prefix, cut any /<pos>/wn/… suffix,
 * underscores → spaces, drop the "personx" actor token from ATOMIC
 * events. CSKG has no glosses — "what is X" answers must be built from
 * the IsA / HasProperty neighbourhood (see converse.ts).
 *
 * Kept relations (spike vocabulary, CSKG's own names preserved):
 * the ConceptNet conversational core (IsA, HasProperty, UsedFor,
 * Causes, AtLocation, CapableOf, PartOf, HasA, MadeOf, RelatedTo,
 * Synonym, Antonym, SimilarTo, LocatedNear, HasSubevent,
 * HasPrerequisite, CausesDesire, MotivatedByGoal, Desires, CreatedBy,
 * Entails, HasFirstSubevent, HasLastSubevent, DefinedAs, InstanceOf,
 * ReceivesAction, MannerOf), mw:MayHaveProperty, and the ATOMIC
 * event relations (xEffect, oEffect, xWant, oWant, xReact, oReact,
 * xNeed, xIntent, xAttr).
 * Dropped, counted in the load report: DerivedFrom /
 * Etymologically* (word-shape, not conversation), fn:HasLexicalUnit
 * (frame plumbing already covered by the main pipeline),
 * /r/dbpedia/* (encyclopedic trivia), Not* negations (fewer than
 * 700 rows), DistinctFrom, SymbolOf.
 * Non-English endpoints are dropped and counted (either side).
 *
 * DEPTH PASS (2026-11-09, design §8/§10 graph-first): three more
 * seams of the file are retained, each in a SIDE STORE outside the
 * CSR edge index, so no degree, neighbourhood or ranking computed
 * over the main index can shift:
 *   - the SENTENCE column: 604,768 rows carry a natural assertion
 *     sentence ("[[A banana]] has [[a peel]]"). The first non-empty
 *     sentence per deduped edge is kept and exposed on CskgEdge —
 *     S9's phrasing bank (articulate renders it when its bracketed
 *     terms match the edge's endpoints).
 *   - HasContext (~238k rows): register/context tags per term,
 *     kept as termId → tag list (graph.contextsOf) — the evidence
 *     seam for E4's resolver and EverydaySense; contents records
 *     the tags in the trace, nothing scores with them yet.
 *   - FormOf (~379k rows): inflected form → lemma, kept as a
 *     string map (graph.lemmaOf) — the event template matcher's
 *     expansion source (discourse.ts), alongside /r/Synonym.
 * Every string a side store retains passes through freshString():
 * a raw split field is a V8 sliced string that keeps its whole
 * source line (and, through the gzip stream, large decompressor
 * chunks) alive — retaining 585k raw sentence fields pinned
 * ~680 MB of heap; the copies cost ~30 MB.
 *
 * QUERY LOG (2026-11-09, the trace-file step before E4): the
 * accessors on CskgGraph are the engine's single graph choke
 * point — no piece touches the CSR arrays or the side stores
 * directly (label reads via `terms[]` on already-materialised
 * edges are not queries). Each accessor reports its call to
 * `graph.querySink` when a turn has installed one: accessor name,
 * key term, relation/direction where applicable, hit count. The
 * sink is passive and write-only; with no sink installed the
 * recording costs one null test per call and changes nothing.
 *
 * STORAGE: edges live in parallel typed arrays (from/to as Int32,
 * relation as Uint8 index, provenance as a dataset bitmask), deduped
 * by a numeric sort, with CSR adjacency in both directions. A first
 * cut with per-edge objects and a string-keyed dedup Map OOMed Node's
 * default heap on the full file; this layout loads the whole kept
 * vocabulary in well under it. CskgEdge objects are materialised on
 * demand by the query methods and never stored.
 */
import * as fs from "fs";
import * as readline from "readline";
import * as zlib from "zlib";

export const KEEP_RELATIONS: ReadonlySet<string> = new Set([
  "/r/IsA", "/r/HasProperty", "/r/UsedFor", "/r/Causes", "/r/AtLocation",
  "/r/CapableOf", "/r/PartOf", "/r/HasA", "/r/MadeOf", "/r/RelatedTo",
  "/r/Synonym", "/r/Antonym", "/r/SimilarTo", "/r/LocatedNear",
  "/r/HasSubevent", "/r/HasPrerequisite", "/r/CausesDesire",
  "/r/MotivatedByGoal", "/r/Desires", "/r/CreatedBy", "/r/Entails",
  "/r/HasFirstSubevent", "/r/HasLastSubevent", "/r/DefinedAs",
  "/r/InstanceOf", "/r/ReceivesAction", "/r/MannerOf",
  "mw:MayHaveProperty",
  "at:xEffect", "at:oEffect", "at:xWant", "at:oWant", "at:xReact",
  "at:oReact", "at:xNeed", "at:xIntent", "at:xAttr",
]);

const REL_INDEX = new Map<string, number>();
const REL_NAMES: string[] = [];
for (const r of KEEP_RELATIONS) {
  REL_INDEX.set(r, REL_NAMES.length);
  REL_NAMES.push(r);
}

const SRC_BIT = new Map<string, number>();
const SRC_NAMES: string[] = [];
function srcBit(code: string): number {
  let b = SRC_BIT.get(code);
  if (b === undefined) {
    b = SRC_NAMES.length;
    SRC_BIT.set(code, b);
    SRC_NAMES.push(code);
  }
  return b;
}
function maskSources(mask: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < SRC_NAMES.length; i++) if (mask & (1 << i)) out.push(SRC_NAMES[i]);
  return out;
}
function popcount(n: number): number {
  let c = 0;
  while (n) { n &= n - 1; c++; }
  return c;
}

/**
 * One recorded graph query (trace files, 2026-11-09). The graph's
 * accessors report each call to the query sink when one is
 * installed; the record names the accessor, the key it was keyed
 * on, the relation/direction restriction where the accessor has
 * one, and how many results came back. Recording is strictly
 * write-only observation: nothing in the engine ever reads the
 * log, and no ranking, selection, filtering or ordering may
 * depend on it.
 */
export interface QueryRecord {
  /** the accessor that was called ("id", "outEdges", …) */
  via: string;
  /** the key term (or looked-up string) the query was keyed on */
  term?: string;
  /** the relation the query was restricted to, when it was */
  rel?: string;
  /** traversal direction, where the accessor takes one */
  dir?: "out" | "in";
  /** how many results the accessor returned */
  hits: number;
}

/** A per-turn consumer of query records; see CskgGraph.querySink. */
export type QuerySink = (rec: QueryRecord) => void;

export interface CskgEdge {
  from: number; // term id
  rel: string;
  to: number; // term id
  /** distinct datasets attesting this (from, rel, to) */
  support: number;
  /** dataset codes, e.g. ["CN","WN"] */
  sources: string[];
  /**
   * The row's natural assertion sentence, when one attests this
   * edge ("[[A banana]] has [[a peel]]") — the depth pass's
   * sentence bank. First non-empty sentence wins at dedupe time.
   */
  sentence?: string;
}

export interface LoadStats {
  rowsSeen: number;
  rowsKept: number;
  droppedRelation: number;
  droppedNonEnglish: number;
  droppedMalformed: number;
  duplicateRows: number;
  terms: number;
  edges: number;
  loadMs: number;
  /** deduped edges carrying a retained assertion sentence */
  sentencesKept: number;
  /** HasContext rows stored in the side store */
  contextRows: number;
  /** terms carrying at least one HasContext tag */
  contextTerms: number;
  /** FormOf pairs stored in the side store */
  formRows: number;
}

/** Relation indices of the ATOMIC (at:) family, for event tests. */
const AT_REL_INDICES: ReadonlySet<number> = new Set(
  REL_NAMES.map((r, i) => (r.startsWith("at:") ? i : -1)).filter((i) => i >= 0),
);

/**
 * A fresh, flat copy of a string the loader will RETAIN in a side
 * store. A split field is a V8 sliced string: it keeps its entire
 * source line alive — and, lines being slices of decompressor
 * chunks, potentially a whole chunk. The Buffer round-trip forces
 * an independent string of the field's own size.
 */
function freshString(s: string): string {
  return s ? Buffer.from(s, "utf8").toString("utf8") : s;
}

/** Normalise a raw CSKG node id to a term string, or null if unusable. */
export function normaliseNode(raw: string): string | null {
  if (!raw) return null;
  let s = raw;
  if (s.startsWith("/c/")) {
    const parts = s.split("/");
    // /c/en/<term>[/<pos>/wn/<sense>…] — language is parts[2]
    if (parts[2] !== "en") return null;
    s = parts[3] ?? "";
  } else if (s.startsWith("at:")) {
    s = s.slice(3);
  } else if (/^[a-z]+:/.test(s)) {
    // fn:/wd:/vg: prefixed ids (star file): keep the lexical tail
    s = s.slice(s.indexOf(":") + 1);
    const slash = s.indexOf("/");
    if (slash >= 0) s = s.slice(0, slash);
  } else {
    const slash = s.indexOf("/");
    if (slash >= 0) s = s.slice(0, slash);
  }
  s = s.replace(/_/g, " ").toLowerCase().trim();
  // ATOMIC actor tokens are scaffolding, not content
  s = s.replace(/\bpersonx\b/g, "").replace(/\bperson x\b/g, "");
  s = s.replace(/\s+/g, " ").trim();
  if (!s || !/[a-z]/.test(s)) return null;
  return s;
}

export class CskgGraph {
  terms: string[] = [];
  termId = new Map<string, number>();
  /** max words in any indexed term (bounds longest-match scanning) */
  maxTermWords = 1;
  stats: LoadStats | null = null;

  // typed edge store (filled by loadCskg)
  eFrom = new Int32Array(0);
  eTo = new Int32Array(0);
  eRel = new Uint8Array(0);
  eMask = new Uint32Array(0);
  // CSR adjacency: edge indices grouped by endpoint
  outOff = new Int32Array(0);
  outIdx = new Int32Array(0);
  inOff = new Int32Array(0);
  inIdx = new Int32Array(0);

  // Depth-pass side stores (NOT part of the edge index — see the
  // header note): per-edge assertion sentences by edge index,
  // HasContext tags by term id, FormOf form → lemma by string.
  edgeSentences = new Map<number, string>();
  contextTags = new Map<number, string[]>();
  formLemmas = new Map<string, string>();
  private eventIds: number[] | null = null;

  /**
   * The passive query-log sink (trace files). A turn that wants
   * its queries recorded installs one (turn.ts); every accessor
   * below reports to it. Null — the default — means no recording:
   * logQuery returns on the null test before building a record,
   * so an inactive log costs nothing and can change nothing.
   */
  querySink: QuerySink | null = null;

  private logQuery(
    via: string,
    hits: number,
    term?: string,
    rel?: string,
    dir?: "out" | "in",
  ): void {
    const sink = this.querySink;
    if (!sink) return;
    // built in field order (via, term, rel, dir, hits) so raw
    // trace lines read consistently
    const rec: Partial<QueryRecord> & Pick<QueryRecord, "via"> = { via };
    if (term !== undefined) rec.term = term;
    if (rel !== undefined) rec.rel = rel;
    if (dir !== undefined) rec.dir = dir;
    rec.hits = hits;
    sink(rec as QueryRecord);
  }

  id(term: string): number | undefined {
    const found = this.termId.get(term);
    this.logQuery("id", found === undefined ? 0 : 1, term);
    return found;
  }

  /** The retained assertion sentence for an edge index, if any. */
  sentenceAt(edgeIndex: number): string | undefined {
    return this.edgeSentences.get(edgeIndex);
  }

  /** HasContext register tags recorded for a term (evidence only). */
  contextsOf(id: number): string[] {
    const tags = this.contextTags.get(id) ?? [];
    this.logQuery("contextsOf", tags.length, this.terms[id]);
    return tags;
  }

  /** FormOf: the lemma recorded for an inflected form, if any. */
  lemmaOf(form: string): string | undefined {
    const lemma = this.formLemmas.get(form);
    this.logQuery("lemmaOf", lemma === undefined ? 0 : 1, form);
    return lemma;
  }

  /** True when the term carries ATOMIC (at:) out-edges — an event. */
  isAtomicEvent(id: number): boolean {
    for (let k = this.outOff[id]; k < this.outOff[id + 1]; k++) {
      if (AT_REL_INDICES.has(this.eRel[this.outIdx[k]])) return true;
    }
    return false;
  }

  /** All ATOMIC event term ids (built once, cached). */
  eventTermIds(): number[] {
    if (!this.eventIds) {
      const out: number[] = [];
      for (let id = 0; id < this.terms.length; id++) {
        if (this.isAtomicEvent(id)) out.push(id);
      }
      this.eventIds = out;
    }
    this.logQuery("eventTermIds", this.eventIds.length);
    return this.eventIds;
  }

  intern(term: string): number {
    let id = this.termId.get(term);
    if (id === undefined) {
      id = this.terms.length;
      this.terms.push(term);
      this.termId.set(term, id);
      const w = term.split(" ").length;
      if (w > this.maxTermWords) this.maxTermWords = w;
    }
    return id;
  }

  get edgeCount(): number {
    return this.eFrom.length;
  }

  materialise(i: number): CskgEdge {
    const mask = this.eMask[i];
    const edge: CskgEdge = {
      from: this.eFrom[i],
      rel: REL_NAMES[this.eRel[i]],
      to: this.eTo[i],
      support: popcount(mask),
      sources: maskSources(mask),
    };
    const sentence = this.edgeSentences.get(i);
    if (sentence !== undefined) edge.sentence = sentence;
    return edge;
  }

  /** Materialised edges of one relation (small relations only). */
  edgesOf(rel: string): CskgEdge[] {
    const ri = REL_INDEX.get(rel);
    const out: CskgEdge[] = [];
    if (ri !== undefined) {
      for (let i = 0; i < this.eRel.length; i++) {
        if (this.eRel[i] === ri) out.push(this.materialise(i));
      }
    }
    this.logQuery("edgesOf", out.length, undefined, rel);
    return out;
  }

  private gather(off: Int32Array, idx: Int32Array, id: number, rel?: string): CskgEdge[] {
    const res: CskgEdge[] = [];
    const ri = rel !== undefined ? REL_INDEX.get(rel) : undefined;
    if (rel !== undefined && ri === undefined) return res;
    for (let k = off[id]; k < off[id + 1]; k++) {
      const i = idx[k];
      if (ri === undefined || this.eRel[i] === ri) res.push(this.materialise(i));
    }
    return res;
  }

  outEdges(id: number, rel?: string): CskgEdge[] {
    const res = this.gather(this.outOff, this.outIdx, id, rel);
    this.logQuery("outEdges", res.length, this.terms[id], rel);
    return res;
  }

  inEdgesFor(id: number, rel?: string): CskgEdge[] {
    const res = this.gather(this.inOff, this.inIdx, id, rel);
    this.logQuery("inEdgesFor", res.length, this.terms[id], rel);
    return res;
  }

  /** Best (highest-support, then shortest-label) edges of one relation. */
  topEdges(id: number, rel: string, dir: "out" | "in", n = 3): CskgEdge[] {
    // Straight to gather (not via outEdges/inEdgesFor) so a
    // topEdges call records ONE query, under its own name.
    const all = this.gather(
      dir === "out" ? this.outOff : this.inOff,
      dir === "out" ? this.outIdx : this.inIdx,
      id,
      rel,
    );
    const res = all
      .sort(
        (a, b) =>
          b.support - a.support ||
          this.terms[dir === "out" ? a.to : a.from].length -
            this.terms[dir === "out" ? b.to : b.from].length,
      )
      .slice(0, n);
    this.logQuery("topEdges", res.length, this.terms[id], rel, dir);
    return res;
  }

  degree(id: number): number {
    const d =
      this.outOff[id + 1] - this.outOff[id] + (this.inOff[id + 1] - this.inOff[id]);
    this.logQuery("degree", d, this.terms[id]);
    return d;
  }
}

export async function loadCskg(path: string): Promise<CskgGraph> {
  const started = Date.now();
  const g = new CskgGraph();
  const stats: LoadStats = {
    rowsSeen: 0, rowsKept: 0, droppedRelation: 0, droppedNonEnglish: 0,
    droppedMalformed: 0, duplicateRows: 0, terms: 0, edges: 0, loadMs: 0,
    sentencesKept: 0, contextRows: 0, contextTerms: 0, formRows: 0,
  };
  const fArr: number[] = [];
  const rArr: number[] = [];
  const tArr: number[] = [];
  const mArr: number[] = [];
  const sArr: string[] = [];
  // Depth-pass side stores, keyed by STRING during the parse: the
  // main vocabulary is interned only from kept edges, and a term
  // that appears solely in a HasContext row must not become a
  // resolvable mention (that would change discourse's behaviour).
  // The context map is re-keyed by term id once the index exists.
  const contextByTerm = new Map<string, Set<string>>();

  const stream = path.endsWith(".gz")
    ? fs.createReadStream(path).pipe(zlib.createGunzip())
    : fs.createReadStream(path);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let col: { n1: number; rel: number; n2: number; src: number; sen: number } | null = null;
  for await (const line of rl) {
    if (!line) continue;
    const fields = line.split("\t");
    if (col === null) {
      col = {
        n1: fields.indexOf("node1"),
        rel: fields.indexOf("relation"),
        n2: fields.indexOf("node2"),
        src: fields.indexOf("source"),
        sen: fields.indexOf("sentence"),
      };
      if (col.n1 < 0 || col.rel < 0 || col.n2 < 0 || col.src < 0) {
        throw new Error(`CSKG header missing expected columns: ${fields.join(",")}`);
      }
      continue;
    }
    stats.rowsSeen++;
    const relation = fields[col.rel] ?? "";
    const raw1 = fields[col.n1] ?? "";
    const raw2 = fields[col.n2] ?? "";

    // Depth-pass side relations: retained, but never in the edge
    // index (see the header note). Endpoints are normalised as
    // strings only — nothing is interned for a side row.
    if (relation === "/r/HasContext" || relation === "/r/FormOf") {
      const t1 = normaliseNode(raw1);
      const t2 = normaliseNode(raw2);
      if (t1 === null || t2 === null || t1 === t2) {
        stats.droppedMalformed++;
        continue;
      }
      if (relation === "/r/HasContext") {
        let tags = contextByTerm.get(t1);
        if (!tags) {
          tags = new Set();
          contextByTerm.set(freshString(t1), tags);
        }
        if (!tags.has(t2)) {
          tags.add(freshString(t2));
          stats.contextRows++;
        }
      } else if (!g.formLemmas.has(t1)) {
        g.formLemmas.set(freshString(t1), freshString(t2));
      }
      continue;
    }

    const relIdx = REL_INDEX.get(relation);
    if (relIdx === undefined) {
      stats.droppedRelation++;
      continue;
    }
    const t1 = normaliseNode(raw1);
    const t2 = normaliseNode(raw2);
    if (t1 === null || t2 === null) {
      if (
        (raw1.startsWith("/c/") && !raw1.startsWith("/c/en/")) ||
        (raw2.startsWith("/c/") && !raw2.startsWith("/c/en/"))
      ) {
        stats.droppedNonEnglish++;
      } else {
        stats.droppedMalformed++;
      }
      continue;
    }
    if (t1 === t2) {
      stats.droppedMalformed++;
      continue;
    }
    let mask = 0;
    for (const code of (fields[col.src] ?? "").split("|")) {
      if (code) mask |= 1 << srcBit(code);
    }
    fArr.push(g.intern(t1));
    rArr.push(relIdx);
    tArr.push(g.intern(t2));
    mArr.push(mask);
    const sen = col.sen >= 0 ? (fields[col.sen] ?? "").trim() : "";
    sArr.push(sen ? freshString(sen) : "");
    stats.rowsKept++;
  }

  // numeric sort by (from, rel, to) -> merge duplicate attestations
  const order = new Int32Array(fArr.length);
  for (let i = 0; i < order.length; i++) order[i] = i;
  order.sort((a, b) => {
    if (fArr[a] !== fArr[b]) return fArr[a] - fArr[b];
    if (rArr[a] !== rArr[b]) return rArr[a] - rArr[b];
    if (tArr[a] !== tArr[b]) return tArr[a] - tArr[b];
    return 0;
  });
  const eFrom: number[] = [];
  const eTo: number[] = [];
  const eRel: number[] = [];
  const eMask: number[] = [];
  const eSent: string[] = [];
  for (const i of order) {
    const last = eFrom.length - 1;
    if (
      last >= 0 &&
      eFrom[last] === fArr[i] && eRel[last] === rArr[i] && eTo[last] === tArr[i]
    ) {
      eMask[last] |= mArr[i];
      // a duplicate attestation may carry the sentence the first
      // row lacked; the first non-empty sentence wins
      if (eSent[last] === "" && sArr[i] !== "") eSent[last] = sArr[i];
      stats.duplicateRows++;
      continue;
    }
    eFrom.push(fArr[i]);
    eRel.push(rArr[i]);
    eTo.push(tArr[i]);
    eMask.push(mArr[i]);
    eSent.push(sArr[i]);
  }
  for (let i = 0; i < eSent.length; i++) {
    if (eSent[i] !== "") g.edgeSentences.set(i, eSent[i]);
  }
  stats.sentencesKept = g.edgeSentences.size;
  g.eFrom = Int32Array.from(eFrom);
  g.eTo = Int32Array.from(eTo);
  g.eRel = Uint8Array.from(eRel);
  g.eMask = Uint32Array.from(eMask);

  // CSR adjacency, both directions
  const nTerms = g.terms.length;
  const nEdges = g.eFrom.length;
  g.outOff = new Int32Array(nTerms + 1);
  g.inOff = new Int32Array(nTerms + 1);
  for (let i = 0; i < nEdges; i++) {
    g.outOff[g.eFrom[i] + 1]++;
    g.inOff[g.eTo[i] + 1]++;
  }
  for (let i = 0; i < nTerms; i++) {
    g.outOff[i + 1] += g.outOff[i];
    g.inOff[i + 1] += g.inOff[i];
  }
  g.outIdx = new Int32Array(nEdges);
  g.inIdx = new Int32Array(nEdges);
  const outCursor = Int32Array.from(g.outOff);
  const inCursor = Int32Array.from(g.inOff);
  for (let i = 0; i < nEdges; i++) {
    g.outIdx[outCursor[g.eFrom[i]]++] = i;
    g.inIdx[inCursor[g.eTo[i]]++] = i;
  }

  // Re-key the HasContext side store by term id, now that the
  // vocabulary exists; tags for terms the kept index never
  // interned are dropped (they name nothing the engine can reach).
  for (const [term, tags] of contextByTerm) {
    const id = g.termId.get(term);
    if (id !== undefined) g.contextTags.set(id, [...tags]);
  }
  stats.contextTerms = g.contextTags.size;
  stats.formRows = g.formLemmas.size;

  stats.terms = nTerms;
  stats.edges = nEdges;
  stats.loadMs = Date.now() - started;
  g.stats = stats;
  return g;
}
