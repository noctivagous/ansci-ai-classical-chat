/**
 * engine-entry.ts — the live engine for the schematic root page.
 *
 * Built by vite.engine.config.ts into dist/engine.js, a sibling of
 * the root page (dist/index.html). The page probes for this script:
 * when it loads, window.AnSciLive exists and every sentence typed
 * into the "A Person Says" box runs through the real turn loop
 * (src/fork/turn.ts processTurn) against a session held here;
 * when it does not load (the artifact preview), the page falls
 * back to its recorded turns. Nothing here is canned: say() is
 * processTurn, and the walk the page draws is the trace's own
 * mapPath — the schematic addresses the turn actually took.
 */
import { newSession, type Session } from "../../../src/fork/session";
import { processTurn } from "../../../src/fork/turn";

export interface LiveTurn {
  reply: string;
  /** The schematic node ids the turn actually passed through. */
  path: string[];
  /** True when the turn stopped short: a decline or a parse failure. */
  stopped: boolean;
  /** The stop's own words (the reply text of a stopped turn). */
  stopText: string;
}

let session: Session = newSession();

function say(text: string): LiveTurn {
  const result = processTurn(session, text);
  const stopped =
    Boolean(result.trace.declineReason) || result.trace.parseSummary === "parse failed";
  return {
    reply: result.reply,
    path: result.trace.mapPath ?? [],
    stopped,
    stopText: result.reply,
  };
}

function reset(): void {
  session = newSession();
}

(window as unknown as { AnSciLive: { say: typeof say; reset: typeof reset } }).AnSciLive = {
  say,
  reset,
};
