/**
 * engine-entry.ts — the live engine for the schematic root page.
 *
 * Built by vite.engine.config.ts into dist/engine.js, a sibling of
 * the root page (dist/index.html). The page probes for this script:
 * when it loads, window.AnSciLive exists but chat stays disabled until
 * both required lexical datasets are installed. Every sentence typed
 * into the "A Person Says" box then runs through the real turn loop
 * (src/ansci/turn.ts processTurn) against a session held here. The page
 * never falls back to recorded replies. Nothing here is canned: say() is
 * processTurn, and the walk the page draws is the trace's own
 * mapPath — the schematic addresses the turn actually took.
 */
import { newSession, type Session } from "../../../src/ansci/session";
import { processTurn } from "../../../src/ansci/turn";
import { initializeBrowserLexicalData, type BrowserLexicalReadiness } from "./browser-lexical-data";

export interface LiveTurn {
  reply: string;
  /** The schematic node ids the turn actually passed through. */
  path: string[];
  /** True when the turn stopped short: a decline or a parse failure. */
  stopped: boolean;
  /** The stop's own words (the reply text of a stopped turn). */
  stopText: string;
}

interface AnSciLiveApi {
  status: "loading" | "ready" | "error";
  reason?: string;
  resources?: BrowserLexicalReadiness;
  say: (text: string) => LiveTurn;
  reset: () => void;
}

let session: Session | undefined;

function say(text: string): LiveTurn {
  if (!session) throw new Error("Chat is disabled until required WordNet and FrameNet data finish loading.");
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
  if (session) session = newSession();
}

(window as unknown as { AnSciLive: AnSciLiveApi }).AnSciLive = {
  status: "loading",
  say,
  reset,
};

const live = (window as unknown as { AnSciLive: AnSciLiveApi }).AnSciLive;
initializeBrowserLexicalData().then(
  (resources) => {
    session = newSession();
    live.resources = resources;
    live.status = "ready";
    window.dispatchEvent(new Event("ansci-engine-status"));
  },
  (error: unknown) => {
    live.reason = error instanceof Error ? error.message : String(error);
    live.status = "error";
    window.dispatchEvent(new Event("ansci-engine-status"));
  },
);
