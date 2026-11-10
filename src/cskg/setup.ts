/**
 * setup.ts — pre-chat setup decisions (the TUI step, 2026-11-09).
 *
 * Before the first turn of an interactive session, three things
 * must be true: the data file exists, the graph is loaded, and
 * the frame (place, person, role) is configured. Historically
 * the first two happened invisibly inside the load — a missing
 * file was a dead error and a cold cache was a ~31 s hang before
 * the first prompt. This module holds the DECISION half of
 * making them explicit setup steps (the TUI in demo/tui runs
 * them): given the facts on disk, what should setup do?
 *
 * The decision is deliberately small and honest about what a
 * cheap check can know:
 *
 *   - data: the file is there or it is not; an empty file is
 *     invalid. That is ALL the cheap check claims — whether the
 *     bytes are a sound CSKG is the loader's judgement, made at
 *     load time, and a load failure aborts setup with the
 *     loader's own reason (the TUI says so, and points at the
 *     install).
 *   - cache: the loader's own probe (cacheStateFor) — the
 *     fingerprint comparison the load itself trusts, nothing
 *     re-derived here.
 *
 * Actions:
 *   install-data       — no usable data file: offer the install
 *                        (scripts/install.mjs's ensure step)
 *                        BEFORE any load is attempted; never
 *                        enter chat on a missing graph.
 *   load-from-cache    — the serialised index is current: the
 *                        load will take the fast path.
 *   load-and-serialise — data is fine but the index is absent,
 *                        stale or unreadable: the load parses in
 *                        full (a visible one-off step) and the
 *                        loader writes a fresh index.
 */
import * as fs from "fs";
import { frameNetStatus, type FrameNetStatus } from "./frames";
import { cacheStateFor, type CacheState } from "./loader";

/** The data file's cheap facts: presence and size, nothing more. */
export interface DataFileFacts {
  exists: boolean;
  sizeBytes: number;
}

export function dataFileFacts(dataPath: string): DataFileFacts {
  try {
    const st = fs.statSync(dataPath);
    return { exists: st.isFile(), sizeBytes: st.size };
  } catch {
    return { exists: false, sizeBytes: 0 };
  }
}

/** Everything setup decides from: the data file + its cache. */
export interface SetupFacts {
  data: DataFileFacts;
  cache: CacheState;
  /**
   * E5: the FrameNet bundle's status — a REPORTED fact, never a
   * blocker. The chat runs without it; E5's frame consultation
   * (situation.ts via frames.ts) degrades to generic roles when
   * the bundle is absent, and says so in the trace. The status
   * word is frames.ts's own: absent | fixture-only | full.
   */
  framenet: FrameNetStatus;
}

/** Collect the facts for one data file (and its cache beside it). */
export function collectSetupFacts(
  dataPath: string,
  cachePath?: string,
  framenetDir?: string,
): SetupFacts {
  return {
    data: dataFileFacts(dataPath),
    cache: cacheStateFor(dataPath, { cachePath }),
    framenet: frameNetStatus(framenetDir),
  };
}

export type SetupAction = "install-data" | "load-from-cache" | "load-and-serialise";

export interface SetupDecision {
  action: SetupAction;
  /** the reason, in words a setup report can quote verbatim */
  detail: string;
}

/** Decide the setup path from the facts. Pure; total. */
export function decideSetup(facts: SetupFacts): SetupDecision {
  if (!facts.data.exists) {
    return { action: "install-data", detail: "no data file" };
  }
  if (facts.data.sizeBytes <= 0) {
    return { action: "install-data", detail: "the data file is empty" };
  }
  switch (facts.cache) {
    case "current":
      return { action: "load-from-cache", detail: "the serialised index is current" };
    case "absent":
      return { action: "load-and-serialise", detail: "no serialised index yet" };
    case "stale":
      return {
        action: "load-and-serialise",
        detail: "the data file changed since the index was built",
      };
    case "invalid":
      return { action: "load-and-serialise", detail: "the serialised index is unreadable" };
  }
}
