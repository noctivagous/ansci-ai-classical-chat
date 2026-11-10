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
 */
import * as fs from "fs";
import type { QueryRecord } from "./loader";
import type { TurnResult } from "./turn";
import type { TraceStep } from "./workspace";

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
  /** the turn's graph queries, in issue order */
  queries: QueryRecord[];
}

/** Build the file record for one finished turn. */
export function buildTraceRecord(
  res: TurnResult,
  at: Date = new Date(),
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
    queries: res.queries,
  };
}

/**
 * Append one turn's record as a single JSON line. Append mode is
 * the contract: a resumed run continues the same file.
 */
export function appendTraceRecord(file: string, rec: TraceFileRecord): void {
  fs.appendFileSync(file, JSON.stringify(rec) + "\n", "utf8");
}
