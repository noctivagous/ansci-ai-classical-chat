/**
 * devserver.ts — the dev-loop supervisor (docs/devloop.md).
 *
 * A thin node:http server on DEVLOOP_PORT (default 4174, loopback
 * only). It imports NO engine modules — it speaks JSON-lines to a
 * devworker child process and owns exactly three things of its own:
 * the HTTP surface, the reload (build + worker swap), and the
 * file-backed state orchestration in devloop-state.ts.
 *
 *   GET  /status     engine + worker state
 *   GET  /design     engine map + gap register + standing questions
 *   POST /ask        {session?, text, location?} → reply + trace digest
 *   POST /reset      {session?} → fresh session
 *   POST /declare    a declaration (see devloop-core) → stored, or 400
 *   POST /run        {script, saveBaseline?, location?} → transcript,
 *                    diff vs baseline, verdict when a declaration completes
 *   POST /diagnose   {scripts?, location?} → counted failure clusters
 *                    + probe pass rates (also written to .devloop/)
 *   POST /reload     npm run build; on success swap the worker,
 *                    on failure return the tsc output verbatim
 *
 * Dev-only: this server exists so an AI (or a developer) can run
 * the ask → diagnose → declare → edit → reload → verdict loop.
 * It is not the public chat UI and binds loopback deliberately.
 */

import { spawn, spawnSync, type ChildProcess } from "child_process";
import * as http from "http";
import * as path from "path";
import {
  REPO_ROOT,
  processDeclare,
  processDiagnose,
  processRun,
  type WorkerClient,
} from "./devloop-state";

const PORT = Number(process.env.DEVLOOP_PORT ?? 4174);
const WORKER_JS = path.join(__dirname, "devworker.js");

/* ---------------- worker management ---------------- */

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
}

class Worker implements WorkerClient {
  private child: ChildProcess | null = null;
  private buffer = "";
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private readyPromise: Promise<void> = Promise.resolve();
  private readyResolve: (() => void) | null = null;
  pid: number | null = null;

  start(): void {
    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });
    const child = spawn(process.execPath, [WORKER_JS], {
      cwd: REPO_ROOT,
      stdio: ["pipe", "pipe", "inherit"],
    });
    this.child = child;
    this.pid = child.pid ?? null;
    child.stdout!.setEncoding("utf8");
    child.stdout!.on("data", (chunk: string) => this.onData(chunk));
    child.on("exit", (code, signal) => {
      const err = new Error(`devworker exited (code ${code}, signal ${signal})`);
      for (const p of this.pending.values()) {
        clearTimeout(p.timer);
        p.reject(err);
      }
      this.pending.clear();
      if (this.child === child) this.child = null;
    });
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    let idx: number;
    while ((idx = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) continue;
      let msg: { id: number; ok: boolean; result?: unknown; error?: string };
      try {
        msg = JSON.parse(line);
      } catch {
        continue; // not protocol — worker stdout is protocol-only, but never crash on noise
      }
      if (msg.id === 0) {
        this.readyResolve?.();
        continue;
      }
      const p = this.pending.get(msg.id);
      if (!p) continue;
      this.pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.ok) p.resolve(msg.result);
      else p.reject(new Error(msg.error ?? "worker error"));
    }
  }

  async call(op: string, args: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.child) this.start();
    await this.readyPromise;
    const id = this.nextId++;
    const timeoutMs = op === "runScript" ? 900_000 : 180_000;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => {
          this.pending.delete(id);
          reject(new Error(`worker op ${op} timed out after ${timeoutMs}ms`));
        },
        timeoutMs,
      );
      this.pending.set(id, { resolve, reject, timer });
      this.child!.stdin!.write(JSON.stringify({ id, op, ...args }) + "\n");
    });
  }

  async restart(): Promise<void> {
    const old = this.child;
    this.child = null;
    if (old) {
      old.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 200));
      try {
        old.kill("SIGKILL");
      } catch {
        /* already gone */
      }
    }
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("worker restarted"));
    }
    this.pending.clear();
    this.start();
    await this.readyPromise;
  }
}

/* ---------------- http surface ---------------- */

function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (c) => {
      data += c;
      if (data.length > 4_000_000) reject(new Error("request body too large"));
    });
    req.on("end", () => {
      if (!data.trim()) return resolve({});
      try {
        resolve(JSON.parse(data) as Record<string, unknown>);
      } catch {
        reject(new Error("request body is not valid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value, null, 2) + "\n";
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body);
}

async function main(): Promise<void> {
  const worker = new Worker();
  worker.start();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
    const route = `${req.method} ${url.pathname}`;
    try {
      switch (route) {
        case "GET /status": {
          const status = (await worker.call("status")) as Record<string, unknown>;
          sendJson(res, 200, { ...status, port: PORT, workerPid: worker.pid });
          return;
        }
        case "GET /design": {
          sendJson(res, 200, await worker.call("design"));
          return;
        }
        case "POST /ask": {
          const body = await readBody(req);
          sendJson(res, 200, await worker.call("ask", body));
          return;
        }
        case "POST /reset": {
          const body = await readBody(req);
          sendJson(res, 200, await worker.call("reset", body));
          return;
        }
        case "POST /declare": {
          const body = await readBody(req);
          try {
            const declaration = processDeclare(body);
            sendJson(res, 200, { stored: true, declaration });
          } catch (err) {
            sendJson(res, 400, { error: err instanceof Error ? err.message : String(err) });
          }
          return;
        }
        case "POST /run": {
          const body = await readBody(req);
          if (typeof body.script !== "string" || !body.script) {
            sendJson(res, 400, { error: "run needs {script}" });
            return;
          }
          const outcome = await processRun(worker, body.script, {
            saveBaseline: body.saveBaseline === true,
            location: typeof body.location === "string" ? body.location : undefined,
          });
          sendJson(res, 200, outcome);
          return;
        }
        case "POST /diagnose": {
          const body = await readBody(req);
          const scripts =
            Array.isArray(body.scripts) && body.scripts.every((s) => typeof s === "string")
              ? (body.scripts as string[])
              : undefined;
          const diagnosis = await processDiagnose(worker, scripts, {
            location: typeof body.location === "string" ? body.location : undefined,
          });
          sendJson(res, 200, diagnosis);
          return;
        }
        case "POST /reload": {
          const started = Date.now();
          const build = spawnSync("npm", ["run", "build"], {
            cwd: REPO_ROOT,
            encoding: "utf8",
            maxBuffer: 32 * 1024 * 1024,
          });
          const buildMs = Date.now() - started;
          if (build.status !== 0) {
            sendJson(res, 200, {
              ok: false,
              buildMs,
              errors: `${build.stdout ?? ""}${build.stderr ?? ""}`,
            });
            return;
          }
          await worker.restart();
          const status = (await worker.call("status")) as Record<string, unknown>;
          sendJson(res, 200, { ok: true, buildMs, workerPid: worker.pid, status });
          return;
        }
        default:
          sendJson(res, 404, { error: `no such route: ${route}` });
      }
    } catch (err) {
      sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.error(`devloop supervisor on http://127.0.0.1:${PORT} (worker pid ${worker.pid})`);
  });

  const shutdown = (): void => {
    server.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
