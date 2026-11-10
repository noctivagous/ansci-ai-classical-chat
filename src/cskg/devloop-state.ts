/**
 * devloop-state.ts — the dev-loop's on-disk state and run orchestration.
 *
 * Shared by devserver.ts (HTTP) and devcli.ts (one-shot CLI) so both
 * surfaces behave identically. ALL shared state lives in files under
 * .devloop/ (gitignored) — never in server memory — so a CLI call, a
 * server restart, and a /reload all see the same world:
 *
 *   .devloop/baselines/<script-name>.json   stored transcript baselines
 *   .devloop/declaration.json               the pending declaration
 *   .devloop/declaration-runs.json          runs accumulated toward it
 *   .devloop/last-diagnosis.json            the most recent diagnosis
 *
 * The judgment logic itself is pure (devloop-core.ts); this module
 * only moves files and sequences worker calls.
 */

import * as fs from "fs";
import * as path from "path";
import {
  clusterFailures,
  diffTranscripts,
  evaluateVerdict,
  parseProbeScript,
  scoreProbeRun,
  summariseTurns,
  toBaseline,
  validateDeclaration,
  type BaselineTurn,
  type Declaration,
  type ScriptRun,
  type Transcript,
  type TurnOutcome,
  type Verdict,
} from "./devloop-core";

export const REPO_ROOT = path.join(__dirname, "..", "..", "..");
export const STATE_DIR = path.join(REPO_ROOT, ".devloop");

/** The minimal worker surface this module needs (JSON-lines ops). */
export interface WorkerClient {
  call(op: string, args?: Record<string, unknown>): Promise<unknown>;
}

/* ---------------- file state ---------------- */

function stateFile(...parts: string[]): string {
  return path.join(STATE_DIR, ...parts);
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

/** Baseline filename for a script path (basename, sanitised). */
export function baselineName(script: string): string {
  const base = path.basename(script).replace(/[^A-Za-z0-9._-]+/g, "_");
  return `${base}.json`;
}

export function loadBaseline(script: string): BaselineTurn[] | null {
  return readJson<BaselineTurn[]>(stateFile("baselines", baselineName(script)));
}

export function saveBaseline(script: string, turns: Transcript): void {
  writeJson(stateFile("baselines", baselineName(script)), toBaseline(turns));
}

export function loadDeclaration(): Declaration | null {
  return readJson<Declaration>(stateFile("declaration.json"));
}

export function saveDeclaration(d: Declaration): void {
  writeJson(stateFile("declaration.json"), d);
  // A new declaration voids runs accumulated toward any previous one.
  writeJson(stateFile("declaration-runs.json"), {});
}

export function clearDeclaration(): void {
  for (const f of ["declaration.json", "declaration-runs.json"]) {
    try {
      fs.unlinkSync(stateFile(f));
    } catch {
      /* already gone */
    }
  }
}

function loadDeclarationRuns(): Record<string, ScriptRun> {
  return readJson<Record<string, ScriptRun>>(stateFile("declaration-runs.json")) ?? {};
}

function saveDeclarationRuns(runs: Record<string, ScriptRun>): void {
  writeJson(stateFile("declaration-runs.json"), runs);
}

/* ---------------- worker runs ---------------- */

export async function runScriptViaWorker(
  worker: WorkerClient,
  script: string,
  opts: { probe?: boolean; location?: string } = {},
): Promise<Transcript> {
  const res = (await worker.call("runScript", {
    path: script,
    probe: opts.probe ?? false,
    location: opts.location,
  })) as { turns: TurnOutcome[] };
  return res.turns;
}

export function isProbeScript(script: string): boolean {
  return script.replace(/\\/g, "/").includes("scripts/probes/");
}

/* ---------------- /run orchestration ---------------- */

export interface RunOutcome {
  script: string;
  transcript: Transcript;
  /** true when this run stored (or re-stored) the baseline */
  baselineStored: boolean;
  /** diff vs the stored baseline; null when the baseline was just stored */
  diff: ReturnType<typeof diffTranscripts> | null;
  /** verdict, present when a declaration is pending and this run completed it */
  verdict?: Verdict;
  /** interim verdict state while a multi-script declaration is incomplete */
  verdictPending?: Verdict;
}

export async function processRun(
  worker: WorkerClient,
  script: string,
  opts: { saveBaseline?: boolean; location?: string } = {},
): Promise<RunOutcome> {
  const transcript = await runScriptViaWorker(worker, script, {
    probe: isProbeScript(script),
    location: opts.location,
  });
  let baseline = loadBaseline(script);
  let baselineStored = false;
  if (!baseline || opts.saveBaseline) {
    saveBaseline(script, transcript);
    baseline = toBaseline(transcript);
    baselineStored = true;
  }
  const diff = baselineStored && !opts.saveBaseline ? null : diffTranscripts(baseline, transcript);
  const outcome: RunOutcome = {
    script,
    transcript,
    baselineStored,
    diff: baselineStored && !opts.saveBaseline ? null : diff,
  };

  const declaration = loadDeclaration();
  if (declaration && declaration.changes.some((c) => c.script === script)) {
    const runs = loadDeclarationRuns();
    runs[script] = { baseline: loadBaseline(script), current: transcript };
    // processRun stores the just-run transcript as the baseline when
    // none existed; for verdict purposes the baseline must be the
    // PRE-declaration one. When this run created it, baseline and
    // current are the same run, so undeclared-change detection is
    // vacuous but assertion checking still applies. That is the
    // honest reading: declare first, THEN baselines matter.
    saveDeclarationRuns(runs);
    const verdict = evaluateVerdict(declaration, runs);
    if (verdict.complete) {
      outcome.verdict = verdict;
      clearDeclaration();
    } else {
      outcome.verdictPending = verdict;
    }
  }
  return outcome;
}

/* ---------------- /diagnose orchestration ---------------- */

export const DEFAULT_DIAGNOSIS_SCRIPTS: string[] = [
  "scripts/cskg-evaluation.txt",
  "scripts/probes/abstention.txt",
  "scripts/probes/coreference.txt",
  "scripts/probes/kbqa.txt",
  "scripts/probes/correction.txt",
];

export interface ProbeReport {
  script: string;
  turns: number;
  annotated: number;
  met: number;
  passRate: number | null;
  unmet: { input: string; reasons: string[]; reply: string }[];
}

export interface Diagnosis {
  at: string;
  scripts: string[];
  totals: ReturnType<typeof summariseTurns>;
  clusters: ReturnType<typeof clusterFailures>;
  probes: ProbeReport[];
  perScript: { script: string; summary: ReturnType<typeof summariseTurns> }[];
}

export async function processDiagnose(
  worker: WorkerClient,
  scripts: string[] = DEFAULT_DIAGNOSIS_SCRIPTS,
  opts: { location?: string } = {},
): Promise<Diagnosis> {
  const allTurns: TurnOutcome[] = [];
  const probes: ProbeReport[] = [];
  const perScript: Diagnosis["perScript"] = [];
  for (const script of scripts) {
    const probe = isProbeScript(script);
    const turns = await runScriptViaWorker(worker, script, {
      probe,
      location: opts.location,
    });
    allTurns.push(...turns);
    perScript.push({ script, summary: summariseTurns(turns) });
    if (probe) {
      const full = path.isAbsolute(script) ? script : path.join(REPO_ROOT, script);
      const parsed = parseProbeScript(fs.readFileSync(full, "utf8"));
      const scored = scoreProbeRun(parsed, turns);
      probes.push({
        script,
        turns: scored.turns,
        annotated: scored.annotated,
        met: scored.met,
        passRate: scored.annotated > 0 ? scored.met / scored.annotated : null,
        unmet: scored.unmet,
      });
    }
  }
  const diagnosis: Diagnosis = {
    at: new Date().toISOString(),
    scripts,
    totals: summariseTurns(allTurns),
    clusters: clusterFailures(allTurns),
    probes,
    perScript,
  };
  writeJson(stateFile("last-diagnosis.json"), diagnosis);
  return diagnosis;
}

/* ---------------- declare ---------------- */

export function processDeclare(raw: unknown): Declaration {
  const declaration = validateDeclaration(raw);
  saveDeclaration(declaration);
  return declaration;
}
