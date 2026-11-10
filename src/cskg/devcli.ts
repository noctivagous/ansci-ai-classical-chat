/**
 * devcli.ts — the dev-loop's one-shot CLI twin (docs/devloop.md).
 *
 * Every dev-loop operation is available from a plain terminal as a
 * single command that prints JSON to stdout and exits:
 *
 *   node dist/src/cskg/devcli.js status
 *   node dist/src/cskg/devcli.js design
 *   node dist/src/cskg/devcli.js ask "What are you making?" [--session soup]
 *   node dist/src/cskg/devcli.js reset [--session soup]
 *   node dist/src/cskg/devcli.js run scripts/cskg-evaluation-e5-soup.txt [--save-baseline]
 *   node dist/src/cskg/devcli.js diagnose [script ...]
 *   node dist/src/cskg/devcli.js declare declaration.json     (or - for stdin)
 *   node dist/src/cskg/devcli.js verdict scripts/cskg-evaluation-e5-soup.txt
 *
 * The CLI starts its own short-lived devworker per invocation
 * (graph load ~2 s from the serialised index), shares ALL state
 * through .devloop/ files — identical semantics to the HTTP server
 * in devserver.ts — and exits. No daemon required, which is the
 * point: an AI agent in a terminal can drive the whole loop with
 * nothing but shell commands.
 *
 * stdout is JSON only; diagnostics go to stderr.
 */

import { spawn, type ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  REPO_ROOT,
  loadDeclaration,
  processDeclare,
  processDiagnose,
  processRun,
  type WorkerClient,
} from "./devloop-state";

const WORKER_JS = path.join(__dirname, "devworker.js");

class OneShotWorker implements WorkerClient {
  private child: ChildProcess;
  private buffer = "";
  private nextId = 1;
  private pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  private ready: Promise<void>;

  constructor() {
    this.child = spawn(process.execPath, [WORKER_JS], {
      cwd: REPO_ROOT,
      stdio: ["pipe", "pipe", "inherit"],
    });
    let readyResolve: () => void = () => {};
    this.ready = new Promise((r) => {
      readyResolve = r;
    });
    this.child.stdout!.setEncoding("utf8");
    this.child.stdout!.on("data", (chunk: string) => {
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
          continue;
        }
        if (msg.id === 0) {
          readyResolve();
          continue;
        }
        const p = this.pending.get(msg.id);
        if (!p) continue;
        this.pending.delete(msg.id);
        if (msg.ok) p.resolve(msg.result);
        else p.reject(new Error(msg.error ?? "worker error"));
      }
    });
  }

  async call(op: string, args: Record<string, unknown> = {}): Promise<unknown> {
    await this.ready;
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.child.stdin!.write(JSON.stringify({ id, op, ...args }) + "\n");
    });
  }

  stop(): void {
    try {
      this.child.stdin!.end();
      this.child.kill("SIGTERM");
    } catch {
      /* already gone */
    }
  }
}

function flagValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function print(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

const USAGE = `devcli — one-shot dev-loop commands (docs/devloop.md)
  status
  design
  ask "text" [--session name] [--location place]
  reset [--session name]
  run <script> [--save-baseline] [--location place]
  diagnose [script ...] [--location place]
  declare <declaration.json | ->     (JSON: {note, changes: [{script, input, mustContain?, mustNotContain?}], allowOtherChanges?})
  verdict <script>                   (run the script and judge the pending declaration)
`;

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    process.stderr.write(USAGE);
    process.exit(command ? 0 : 1);
  }
  const worker = new OneShotWorker();
  try {
    switch (command) {
      case "status": {
        print(await worker.call("status"));
        break;
      }
      case "design": {
        print(await worker.call("design"));
        break;
      }
      case "ask": {
        const text = rest.find((a) => !a.startsWith("--"));
        if (!text) throw new Error('ask needs a text argument: devcli ask "…"');
        print(
          await worker.call("ask", {
            text,
            session: flagValue(rest, "--session"),
            location: flagValue(rest, "--location"),
          }),
        );
        break;
      }
      case "reset": {
        print(await worker.call("reset", { session: flagValue(rest, "--session") }));
        break;
      }
      case "run": {
        const script = rest.find((a) => !a.startsWith("--"));
        if (!script) throw new Error("run needs a script path");
        print(
          await processRun(worker, script, {
            saveBaseline: rest.includes("--save-baseline"),
            location: flagValue(rest, "--location"),
          }),
        );
        break;
      }
      case "diagnose": {
        const scripts = rest.filter(
          (a, i) => !a.startsWith("--") && rest[i - 1] !== "--location",
        );
        print(
          await processDiagnose(worker, scripts.length > 0 ? scripts : undefined, {
            location: flagValue(rest, "--location"),
          }),
        );
        break;
      }
      case "declare": {
        const file = rest[0];
        if (!file) throw new Error("declare needs a JSON file path (or - for stdin)");
        const raw =
          file === "-"
            ? fs.readFileSync(0, "utf8")
            : fs.readFileSync(path.isAbsolute(file) ? file : path.join(process.cwd(), file), "utf8");
        const declaration = processDeclare(JSON.parse(raw));
        print({ stored: true, declaration });
        break;
      }
      case "verdict": {
        const script = rest.find((a) => !a.startsWith("--"));
        if (!script) throw new Error("verdict needs a script path");
        if (!loadDeclaration()) {
          print({ error: "no pending declaration — declare first" });
          process.exitCode = 1;
          break;
        }
        const outcome = await processRun(worker, script, {
          location: flagValue(rest, "--location"),
        });
        print({
          script,
          verdict: outcome.verdict ?? null,
          verdictPending: outcome.verdictPending ?? null,
          diff: outcome.diff,
        });
        if (outcome.verdict && !outcome.verdict.pass) process.exitCode = 1;
        break;
      }
      default:
        process.stderr.write(USAGE);
        throw new Error(`unknown command: ${command}`);
    }
  } finally {
    worker.stop();
  }
}

main().catch((err) => {
  print({ error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
