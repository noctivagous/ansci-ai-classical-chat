/**
 * tracefile.ts — persistent turn traces (2026-11-09, the small
 * step before E4).
 *
 * Until now the ThoughtTrace lived only in the session's ring
 * and in --debug's console output: when a session ended, the
 * record of WHY each reply happened ended with it — and a
 * re-run is not the same turn, because situation lines read the
 * real clock. A trace file fixes that: one JSON line per turn,
 * appended beside the transcript, pairing what was said with
 * the trace steps that produced it and the graph queries the
 * turn actually issued (the loader's central query log — a
 * decline's empty set is in there, as evidence).
 *
 * The record is flat and grep-friendly on purpose: these files
 * are the evaluation discipline's diff surface, and E4's Context
 * module is judged on traceable differences between them.
 * Generated .trace.jsonl files are local artifacts, not source.
 *
 * GRANULARITY (2026-11-09, later the same day): the first traced
 * Chicago run was 9.6 MB for 28 turns — ~85% of it four turns
 * where the ATOMIC template matcher scans all ~24k event keys
 * and logs a lemmaOf/id record per key word. A file nobody can
 * open pinpoints nothing, so records are built at a LEVEL:
 *
 *   steps   — header + steps only; the turn's total query count
 *             rides in `queryCount`. A whole session is a few KB:
 *             the path through the modules, nothing else.
 *   queries — (default) decision queries stay individual records
 *             (edge lookups by relation/direction, context tags,
 *             degrees — including the zero-hit records a decline
 *             rests on), while the two bulk-scan accessors,
 *             `lemmaOf` and `id`, collapse per turn into one
 *             summary record per accessor (see QuerySummaryRecord),
 *             placed where that accessor's first query occurred.
 *             Summaries STATE their counts, so summary counts +
 *             individual records always reconcile to queryCount:
 *             nothing is silently dropped, only summarised.
 *   full    — every query record verbatim, in issue order:
 *             the forensic level, byte-for-byte the original
 *             record shape in its `queries` array.
 *
 * Collapsing happens HERE, at record-build time, from the
 * complete per-turn query list. Collection (turn.ts) stays
 * level-unaware and complete — replay and every other consumer
 * see the full log regardless of the level a file was built at,
 * and no reply can depend on the level.
 */
import * as fs from "fs";
import type { QueryRecord } from "./loader";
import type { TurnResult } from "./turn";
import type { TraceStep } from "./workspace";

/** The granularity a trace-file record is built at. */
export type TraceLevel = "steps" | "queries" | "full";

export const TRACE_LEVELS: readonly TraceLevel[] = ["steps", "queries", "full"];

/** The level used when none is named: decision queries kept, scans summarised. */
export const DEFAULT_TRACE_LEVEL: TraceLevel = "queries";

/**
 * Parse a --trace-level value. `undefined` (flag absent) yields
 * the default; anything outside the three levels throws, so the
 * CLI can reject it cleanly before any data loads.
 */
export function parseTraceLevel(value: string | undefined): TraceLevel {
  if (value === undefined) return DEFAULT_TRACE_LEVEL;
  if ((TRACE_LEVELS as readonly string[]).includes(value)) return value as TraceLevel;
  throw new Error(
    `invalid trace level "${value}" — expected one of: ${TRACE_LEVELS.join(", ")}`,
  );
}

/**
 * A collapsed run of bulk-scan queries at the `queries` level:
 * every lemmaOf/id query a turn issued, summarised per accessor.
 * `count` queries were summarised; `distinctTerms` counts the
 * distinct key terms among them; `zeroHits` how many came back
 * empty; `totalHits` sums their hit counts. The counts are the
 * contract: a reader can always reconcile the file against
 * `queryCount` on the same record.
 */
export interface QuerySummaryRecord {
  /** the accessor whose queries this summarises ("lemmaOf" | "id") */
  via: string;
  /** marks this as a summary, not a single query */
  summary: true;
  /** how many queries this record summarises */
  count: number;
  /** distinct `term` values among the summarised queries */
  distinctTerms: number;
  /** how many of the summarised queries returned 0 hits */
  zeroHits: number;
  /** the sum of the summarised queries' hit counts */
  totalHits: number;
}

/** One line of a trace file: either a single query or a scan summary. */
export type TraceQueryEntry = QueryRecord | QuerySummaryRecord;

/**
 * The accessors whose per-turn volume is scan noise rather than
 * decision evidence: the template matcher lemmatises and
 * id-resolves every ATOMIC key it sweeps. Everything else an
 * accessor does is a decision the turn actually made.
 */
const SCAN_ACCESSORS: ReadonlySet<string> = new Set(["lemmaOf", "id"]);

/**
 * Collapse a turn's complete query list for the `queries` level:
 * scan-accessor queries fold into one summary per accessor,
 * placed at that accessor's first occurrence; all other records
 * pass through untouched, in order. Pure and total-preserving:
 * (sum of summary counts) + (individual records) === input length.
 */
export function collapseScanQueries(queries: QueryRecord[]): TraceQueryEntry[] {
  const out: TraceQueryEntry[] = [];
  const accs = new Map<string, { rec: QuerySummaryRecord; terms: Set<string> }>();
  for (const q of queries) {
    if (!SCAN_ACCESSORS.has(q.via)) {
      out.push(q);
      continue;
    }
    let acc = accs.get(q.via);
    if (!acc) {
      acc = {
        rec: {
          via: q.via,
          summary: true,
          count: 0,
          distinctTerms: 0,
          zeroHits: 0,
          totalHits: 0,
        },
        terms: new Set<string>(),
      };
      accs.set(q.via, acc);
      out.push(acc.rec); // placed at first occurrence; filled in below
    }
    acc.rec.count += 1;
    if (q.term !== undefined) acc.terms.add(q.term);
    if (q.hits === 0) acc.rec.zeroHits += 1;
    acc.rec.totalHits += q.hits;
  }
  for (const acc of accs.values()) acc.rec.distinctTerms = acc.terms.size;
  return out;
}

export interface TraceFileRecord {
  /** 1-based turn number within the session */
  turn: number;
  /** ISO timestamp of the turn */
  at: string;
  /** the session's configured place name, or null */
  location: string | null;
  utterance: string;
  reply: string;
  grounded: boolean;
  intent: string;
  /** the turn's ThoughtTrace steps, verbatim */
  steps: TraceStep[];
  /**
   * The turn's graph queries, shaped by the build level: every
   * record verbatim (`full`), decision records plus scan
   * summaries (`queries`), or none (`steps`).
   */
  queries: TraceQueryEntry[];
  /** how many graph queries the turn issued in total, at any level */
  queryCount: number;
}

/**
 * Build the file record for one finished turn, at the given
 * level (default: `queries`). The turn's own query list is never
 * mutated — `full` passes it through, `queries` builds a new
 * array, `steps` drops it from the record only.
 */
export function buildTraceRecord(
  res: TurnResult,
  at: Date = new Date(),
  level: TraceLevel = DEFAULT_TRACE_LEVEL,
): TraceFileRecord {
  return {
    turn: res.trace.turn,
    at: at.toISOString(),
    location: res.location,
    utterance: res.trace.input,
    reply: res.text,
    grounded: res.grounded,
    intent: res.trace.intent,
    steps: res.trace.steps,
    queries:
      level === "full"
        ? res.queries
        : level === "queries"
          ? collapseScanQueries(res.queries)
          : [],
    queryCount: res.queries.length,
  };
}

/**
 * Append one turn's record as a single JSON line. Append mode is
 * the contract: a resumed run continues the same file.
 */
export function appendTraceRecord(file: string, rec: TraceFileRecord): void {
  fs.appendFileSync(file, JSON.stringify(rec) + "\n", "utf8");
}
