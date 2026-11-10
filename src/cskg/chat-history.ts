/**
 * chat-history.ts — the one-shot chat's memory (scripts/chat-once.mjs).
 *
 * The interactive REPL keeps its session in-process, which dies the
 * moment stdin closes. The one-shot method keeps no process: the
 * user's lines live in a history file, and each invocation builds a
 * fresh session, silently replays every stored line through runTurn
 * to rebuild that session, then answers the new turn and appends
 * it. Replay-in-process (not session serialisation) is what keeps
 * this honest: the rebuilt session is produced by the same turns,
 * so "why did you say that?" and corrections work across
 * invocations exactly as they do in one live sitting.
 */
import * as fs from "fs";
import * as path from "path";
import type { CskgGraph } from "./loader";
import { createSession, type SessionState } from "./memory";
import { runTurn } from "./turn";

/** Read stored user lines; missing file reads as no history. */
export function loadHistory(file: string): string[] {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** Append one user turn, creating the file (and its dir) as needed. */
export function appendHistory(file: string, line: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, line.trim() + "\n", "utf8");
}

/** Empty the history; a missing file stays missing. */
export function clearHistory(file: string): void {
  if (fs.existsSync(file)) fs.writeFileSync(file, "", "utf8");
}

/**
 * Rebuild a session by living each stored line in order. Results
 * are discarded — the session's topics, states and trace ring are
 * the product. A caller that then runs runTurn(session, next)
 * gets the answer the live session would have given.
 */
export function replayTurns(
  g: CskgGraph,
  session: SessionState,
  lines: string[],
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date(),
): void {
  for (const line of lines) runTurn(g, session, line, env, now);
}

/** Fresh session with the given history already lived. */
export function sessionForHistory(
  g: CskgGraph,
  lines: string[],
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date(),
): SessionState {
  const session = createSession();
  replayTurns(g, session, lines, env, now);
  return session;
}
