/**
 * devworker.ts — the dev-loop engine worker (docs/devloop.md).
 *
 * Loads the CSKG graph ONCE, holds named chat sessions, and speaks
 * JSON-lines over stdio to its supervisor (devserver.ts) or to a
 * one-shot CLI (devcli.ts):
 *
 *   request:  {"id": 1, "op": "ask", "session": "main", "text": "…"}
 *   response: {"id": 1, "ok": true, "result": {…}}
 *             {"id": 1, "ok": false, "error": "…"}
 *
 * On startup, after the graph loads, it emits one unsolicited line
 *   {"id": 0, "ok": true, "result": {"ready": true, …stats}}
 * so the parent knows when to start forwarding requests.
 *
 * stdout carries ONLY protocol lines; all diagnostics go to stderr.
 * Ops: status | design | ask | reset | runScript.
 *
 * The worker imports the engine; the supervisor imports nothing.
 * That split is what makes /reload possible: rebuild, kill the
 * worker, respawn — the supervisor (and its HTTP port) never move.
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { ENGINE_MAP } from "./engine-map";
import { loadCskg, type CskgGraph } from "./loader";
import { createSession, type SessionState } from "./memory";
import { buildTraceRecord } from "./tracefile";
import { runTurn } from "./turn";
import {
  STANDING_QUESTIONS,
  extractGapRegister,
  parseEvaluationScript,
  parseProbeScript,
  type TurnOutcome,
} from "./devloop-core";

const REPO_ROOT = path.join(__dirname, "..", "..", "..");

interface WorkerRequest {
  id: number;
  op: string;
  session?: string;
  text?: string;
  path?: string;
  lines?: string[];
  location?: string;
  probe?: boolean;
}

let graph: CskgGraph;
const sessions = new Map<string, SessionState>();

function sessionNamed(name: string | undefined): SessionState {
  const key = name && name.trim() ? name : "main";
  let s = sessions.get(key);
  if (!s) {
    s = createSession();
    sessions.set(key, s);
  }
  return s;
}

function envFor(location?: string): NodeJS.ProcessEnv {
  if (!location) return process.env;
  return { ...process.env, CSKG_CHAT_LOCATION: location };
}

function toOutcome(input: string, res: ReturnType<typeof runTurn>): TurnOutcome {
  return {
    input,
    reply: res.text,
    intent: res.trace.intent,
    grounded: res.grounded,
    steps: res.trace.steps.map((s) => ({
      piece: s.piece,
      kind: s.kind,
      detail: s.detail,
    })),
  };
}

function handle(req: WorkerRequest): unknown {
  switch (req.op) {
    case "status": {
      const st = graph.stats;
      return {
        ready: true,
        pid: process.pid,
        edges: st?.edges ?? null,
        terms: st?.terms ?? null,
        loadMs: st?.loadMs ?? null,
        sessions: [...sessions.keys()],
      };
    }
    case "design": {
      const docPath = path.join(REPO_ROOT, "docs", "design-conversation-engine.md");
      let gapRegister = "";
      try {
        gapRegister = extractGapRegister(fs.readFileSync(docPath, "utf8"));
      } catch {
        gapRegister = "";
      }
      return {
        engineMap: {
          nodes: ENGINE_MAP.nodes,
          edges: ENGINE_MAP.edges,
        },
        gapRegister,
        standingQuestions: STANDING_QUESTIONS,
      };
    }
    case "ask": {
      if (typeof req.text !== "string" || !req.text.trim()) {
        throw new Error("ask needs a non-empty text");
      }
      const session = sessionNamed(req.session);
      const res = runTurn(graph, session, req.text, envFor(req.location), new Date(), true);
      return {
        session: req.session ?? "main",
        reply: res.text,
        intent: res.trace.intent,
        grounded: res.grounded,
        // the turn's trace digest — buildTraceRecord at 'steps'
        // level: the module path and query count, no raw queries.
        trace: buildTraceRecord(res, new Date(), "steps"),
      };
    }
    case "reset": {
      const key = req.session && req.session.trim() ? req.session : "main";
      sessions.set(key, createSession());
      return { session: key, reset: true };
    }
    case "runScript": {
      let inputs: string[];
      if (Array.isArray(req.lines)) {
        inputs = req.lines;
      } else if (typeof req.path === "string") {
        const full = path.isAbsolute(req.path) ? req.path : path.join(REPO_ROOT, req.path);
        const text = fs.readFileSync(full, "utf8");
        inputs = req.probe
          ? parseProbeScript(text).map((p) => p.input)
          : parseEvaluationScript(text);
      } else {
        throw new Error("runScript needs a path or lines");
      }
      // A script run is a fresh session by contract — runs must be
      // reproducible and must not leak the interactive sessions.
      const session = createSession();
      const env = envFor(req.location);
      const turns: TurnOutcome[] = inputs.map((line) => {
        try {
          const res = runTurn(graph, session, line, env, new Date(), false);
          return toOutcome(line, res);
        } catch (err) {
          // Per-turn isolation: a turn that throws (the engine has
          // such paths — e.g. an unplaced definition question) must
          // not sink the whole run. It is recorded as an ungrounded
          // decline-shaped outcome so clustering counts it as the
          // failure it is, with the error as its signature detail.
          return {
            input: line,
            reply: "",
            intent: "error",
            grounded: false,
            steps: [
              {
                piece: "interface",
                kind: "decline",
                detail: `turn error: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
          };
        }
      });
      return { turns };
    }
    default:
      throw new Error(`unknown op: ${req.op}`);
  }
}

async function main(): Promise<void> {
  // Dev-loop runs judge the engine from a fixed situated self
  // unless the caller says otherwise (chat.ts uses the same env).
  if (!process.env.CSKG_CHAT_LOCATION) process.env.CSKG_CHAT_LOCATION = "Chicago";

  const dataPath =
    process.env.CSKG_PATH ??
    path.join(REPO_ROOT, "data", "raw", "cskg", "cskg.tsv.gz");
  if (!fs.existsSync(dataPath)) {
    console.error(
      `devworker: CSKG data not found at ${dataPath} — run scripts/install.mjs or set CSKG_PATH`,
    );
    process.exit(1);
  }
  console.error(`devworker: loading CSKG from ${dataPath} …`);
  graph = await loadCskg(dataPath);
  const st = graph.stats!;
  console.error(
    `devworker: loaded ${st.edges.toLocaleString()} edges / ${st.terms.toLocaleString()} terms ` +
      `in ${(st.loadMs / 1000).toFixed(1)}s`,
  );

  const send = (obj: unknown): void => {
    process.stdout.write(JSON.stringify(obj) + "\n");
  };
  send({
    id: 0,
    ok: true,
    result: { ready: true, pid: process.pid, edges: st.edges, terms: st.terms, loadMs: st.loadMs },
  });

  const rl = readline.createInterface({ input: process.stdin });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let req: WorkerRequest;
    try {
      req = JSON.parse(trimmed) as WorkerRequest;
    } catch {
      send({ id: -1, ok: false, error: "unparseable request line" });
      return;
    }
    try {
      const result = handle(req);
      send({ id: req.id, ok: true, result });
    } catch (err) {
      send({ id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
  rl.on("close", () => process.exit(0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
