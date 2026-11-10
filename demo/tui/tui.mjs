#!/usr/bin/env node
/**
 * tui.mjs — the AnSci CSKG chat's terminal front door.
 *
 *   node demo/tui/tui.mjs
 *
 * An interactive launch runs a short SETUP before the first
 * turn (each step reported as it happens; any failure stops
 * before chat, with the reason):
 *
 *   1. data — the CSKG file (CSKG_PATH, or data/raw/cskg/
 *      cskg.tsv.gz) is checked. Missing or empty → the install
 *      is offered there and then (scripts/install.mjs's ensure
 *      step does the download + verification). Declined or
 *      failed → no chat: never enter a conversation on a
 *      missing graph.
 *   2. serialise — the loader's serialised index is probed. A
 *      current one loads in about two seconds and the TUI says
 *      so; a missing, stale or unreadable one means the load
 *      parses the data in full (~30 s) as a visible setup step
 *      with a running clock — and the loader writes a fresh
 *      index, so the cost is paid once, here, never as a
 *      silent hang inside the conversation.
 *   2b. framenet — the FrameNet bundle's status is REPORTED
 *      (absent | fixture-only | full), never a blocker: the
 *      chat proceeds in every state, and E5's event-role naming
 *      degrades to generic roles where no bundle (or only a
 *      small one) is present.
 *   3. configure — place, person, role: environment values
 *      when given, else quick prompts with defaults
 *      (Chicago / general mode / assistant), each skippable
 *      by pressing Enter.
 *
 * Then the chat: a session header carrying the situated frame
 * (place, season, daypart, role, person), the same engine and
 * the same answers as the CLI and the web UI (turn.ts and its
 * pieces — this file reasons about nothing), an optional
 * per-turn trace view at the trace file's own levels
 * (/trace off|steps|queries|full), and slash commands —
 * /help lists them.
 *
 * Non-interactive use is not the TUI's business: with piped
 * stdin or --script, this hands off to the command-line chat
 * (dist/src/cskg/chat.js) untouched, exactly as the placeholder
 * before it did — the evaluation harness drives that path.
 *
 * Cross-platform by construction: paths are built with
 * path.join, child processes are spawned as `node <file>` with
 * an args array (never a shell string), terminal colour is
 * ANSI, capability-gated (TTY + no NO_COLOR) and dropped
 * entirely when unavailable, and line input is Node's
 * readline, which tolerates CRLF. No external commands.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHAT_JS = join(ROOT, "dist", "src", "cskg", "chat.js");
const require = createRequire(import.meta.url);

function distReady() {
  return existsSync(CHAT_JS);
}

function printInstallHint() {
  console.error(
    "  The chat isn't built yet. Run the install first, from the repo root:\n\n    node scripts/install.mjs\n",
  );
}

/** Hand off to the command-line chat, untouched (non-interactive use). */
function handOffToCli(args) {
  const child = spawn(process.execPath, [CHAT_JS, ...args], {
    cwd: ROOT,
    stdio: "inherit",
  });
  child.on("error", (err) => {
    console.error(`could not start the chat: ${err.message}`);
    process.exit(1);
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

async function runInteractive() {
  const { loadCskg } = require(join(ROOT, "dist", "src", "cskg", "loader.js"));
  const { collectSetupFacts, decideSetup } = require(
    join(ROOT, "dist", "src", "cskg", "setup.js"),
  );
  const { createSession } = require(join(ROOT, "dist", "src", "cskg", "memory.js"));
  const { runTurn } = require(join(ROOT, "dist", "src", "cskg", "turn.js"));
  const { computeSituation, placeFromEnv } = require(
    join(ROOT, "dist", "src", "cskg", "awareness.js"),
  );
  const { loadRolePack, rolesDir } = require(join(ROOT, "dist", "src", "cskg", "roles.js"));
  const { personNameFromEnv } = require(join(ROOT, "dist", "src", "cskg", "person.js"));
  const { buildTraceRecord, TRACE_LEVELS } = require(
    join(ROOT, "dist", "src", "cskg", "tracefile.js"),
  );
  const { parseSlashCommand, frameHeaderLines, traceViewLines, HELP_LINES } = require(
    join(ROOT, "dist", "src", "cskg", "tui.js"),
  );

  const colour = Boolean(process.stdout.isTTY) && !("NO_COLOR" in process.env);
  const bold = (s) => (colour ? `\x1b[1m${s}\x1b[0m` : s);
  const dim = (s) => (colour ? `\x1b[2m${s}\x1b[0m` : s);

  /** The session's own environment: env values in force, edited by setup and by /role, /person. */
  const env = { ...process.env };
  const dataPath =
    env.CSKG_PATH ?? join(ROOT, "data", "raw", "cskg", "cskg.tsv.gz");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let atEof = false;
  let resolveEof;
  const eof = new Promise((r) => {
    resolveEof = r;
  });
  rl.on("close", () => {
    atEof = true;
    resolveEof();
  });
  rl.on("SIGINT", () => rl.close());
  // Lines are consumed through one queue, so type-ahead is
  // preserved: a line typed while setup is still loading is
  // answered by the next prompt, not dropped.
  const lineQueue = [];
  const lineWaiters = [];
  rl.on("line", (l) => {
    const w = lineWaiters.shift();
    if (w) w(l);
    else lineQueue.push(l);
  });
  const nextLine = () =>
    lineQueue.length > 0
      ? Promise.resolve(lineQueue.shift())
      : Promise.race([new Promise((res) => lineWaiters.push(res)), eof.then(() => null)]);
  /** One prompt, answered with the trimmed line; "" at EOF. */
  const ask = async (prompt) => {
    process.stdout.write(prompt);
    const l = await nextLine();
    return (l ?? "").trim();
  };

  const stop = (code) => {
    rl.close();
    process.exit(code);
  };

  console.log(bold("AnSci — CSKG chat"));
  console.log("");

  /* ---------------- setup 1: data ---------------- */
  console.log("Setup — data");
  let facts = collectSetupFacts(dataPath);
  let decision = decideSetup(facts);
  if (decision.action === "install-data") {
    console.log(`  ${decision.detail === "no data file" ? "No data file" : "The data file is empty"} at:`);
    console.log(`    ${dataPath}`);
    const answer = (
      await ask("  Download and install it now from Zenodo (~112 MB)? [Y/n] ")
    ).toLowerCase();
    if (answer === "n" || answer === "no") {
      console.log(
        "  No data, no chat — setup stopped. Run node scripts/install.mjs whenever you're ready.",
      );
      stop(0);
    }
    const { ensureCskgDataFile } = await import(
      new URL("../../scripts/install.mjs", import.meta.url)
    );
    try {
      await ensureCskgDataFile(dataPath, (line) => console.log(line));
    } catch (err) {
      console.error(`  Install failed: ${err.message}`);
      console.error("  Setup stopped — no chat started.");
      stop(1);
    }
    facts = collectSetupFacts(dataPath);
    decision = decideSetup(facts);
    if (decision.action === "install-data") {
      console.error("  The data file still does not check out after the install — setup stopped.");
      stop(1);
    }
  } else {
    console.log(
      `  Found ${dataPath} (${(facts.data.sizeBytes / 1e6).toFixed(0)} MB)`,
    );
  }

  /* ---------------- setup 2: serialise + load ---------------- */
  console.log("Setup — index");
  if (decision.action === "load-from-cache") {
    console.log("  The serialised index is current — loading through it.");
  } else {
    console.log(
      `  ${decision.detail[0].toUpperCase()}${decision.detail.slice(1)} — ` +
        "building the index now (one-off, about half a minute) and serialising it beside the data file.",
    );
  }
  let via = null;
  const started = Date.now();
  const spinner = process.stdout.isTTY
    ? setInterval(() => {
        process.stdout.write(`\r  loading … ${((Date.now() - started) / 1000).toFixed(0)}s`);
      }, 250)
    : null;
  let graph;
  try {
    graph = await loadCskg(dataPath, {
      onPath: (p) => {
        via = p;
      },
    });
  } catch (err) {
    if (spinner) {
      clearInterval(spinner);
      process.stdout.write("\r\x1b[K");
    }
    console.error(`  The graph could not be loaded: ${err.message}`);
    console.error(
      "  Setup stopped — no chat started. If the data file is damaged, " +
        `delete it and launch again to reinstall:\n    ${dataPath}`,
    );
    stop(1);
  }
  if (spinner) {
    clearInterval(spinner);
    process.stdout.write("\r\x1b[K");
  }
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const st = graph.stats;
  const sizeLine = `${st.edges.toLocaleString()} edges / ${st.terms.toLocaleString()} terms`;
  if (via === "cache") {
    console.log(`  Loaded through the serialised index in ${secs}s — ${sizeLine}.`);
  } else if (decision.action === "load-from-cache") {
    console.log(
      `  The serialised index could not be used after all, so the graph was parsed ` +
        `in full (${secs}s) and the index re-serialised — ${sizeLine}.`,
    );
  } else {
    console.log(
      `  Index built and serialised in ${secs}s — ${sizeLine}. ` +
        "Later launches load through it in a couple of seconds.",
    );
  }

  /* ---------------- setup 2b: FrameNet (a reported fact) ---------------- */
  // The FrameNet bundle is E5's participant-role source. Its
  // status is REPORTED here, never a blocker: the chat proceeds
  // in every state, and where the bundle is absent or small the
  // situation model's frame consultation degrades to generic
  // roles, saying so in the trace.
  console.log("Setup — FrameNet");
  if (facts.framenet === "full") {
    console.log(
      "  FrameNet bundle: full (1,019 frames) — event roles are named from the frames' own schemas.",
    );
  } else if (facts.framenet === "fixture-only") {
    console.log(
      "  FrameNet bundle: fixture-only — a small bundle is present, so event roles are frame-named " +
      "only where one of its frames matches, and generic elsewhere.",
    );
    console.log("  Complete it with: python3 scripts/import-framenet.py");
  } else {
    console.log(
      "  FrameNet bundle: absent — the chat proceeds; event roles use generic names (actor, object, …).",
    );
    console.log("  Install it with: python3 scripts/import-framenet.py");
  }

  /* ---------------- setup 3: configure ---------------- */
  console.log("");
  console.log("Setup — configure (Enter keeps the default)");
  if (env.CSKG_CHAT_LOCATION) {
    console.log(`  Place: ${env.CSKG_CHAT_LOCATION} (from CSKG_CHAT_LOCATION)`);
  } else {
    const loc = await ask("  Where is the chat? [Chicago] ");
    env.CSKG_CHAT_LOCATION = loc || "Chicago";
  }
  if (!placeFromEnv(env)?.hemisphere && !env.CSKG_CHAT_HEMISPHERE) {
    const hemi = (
      await ask(`  Hemisphere for ${env.CSKG_CHAT_LOCATION} — north or south [north] `)
    ).toLowerCase();
    if (hemi === "south") {
      env.CSKG_CHAT_HEMISPHERE = "south";
    } else {
      if (hemi && hemi !== "north") {
        console.log(`  (“${hemi}” isn't a hemisphere — using north.)`);
      }
      env.CSKG_CHAT_HEMISPHERE = "north";
    }
  }
  if (env.CSKG_CHAT_PERSON) {
    console.log(`  Person: ${env.CSKG_CHAT_PERSON} (from CSKG_CHAT_PERSON)`);
  } else {
    const name = await ask(
      "  Your name (Enter = general mode — nothing is kept between sessions): ",
    );
    if (name) env.CSKG_CHAT_PERSON = name;
  }
  if (env.CSKG_CHAT_ROLE) {
    console.log(`  Role: ${env.CSKG_CHAT_ROLE} (from CSKG_CHAT_ROLE)`);
  } else {
    let packs = [];
    try {
      packs = readdirSync(rolesDir(env))
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.slice(0, -".json".length));
    } catch {
      // no readable roles directory: the load below reports it
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await ask(
        `  Role pack [assistant]${packs.length ? ` (available: ${packs.join(", ")})` : ""}: `,
      );
      const name = r || "assistant";
      try {
        loadRolePack({ ...env, CSKG_CHAT_ROLE: name });
        env.CSKG_CHAT_ROLE = name;
        break;
      } catch (err) {
        console.log(`  ${err.message}`);
        if (attempt === 2) {
          console.error("  Setup stopped — no role to be.");
          stop(1);
        }
      }
    }
  }

  /* ---------------- chat ---------------- */
  let session = createSession();
  let traceLevel = "off";
  let turns = 0;

  const printFrame = () => {
    const sit = computeSituation(new Date(), env);
    const role = loadRolePack(env);
    const name = personNameFromEnv(env);
    const person = name ? { kind: "known", name } : { kind: "general" };
    for (const line of frameHeaderLines(sit, role, person)) console.log(line);
  };

  const doTurn = (text) => {
    turns++;
    const res = runTurn(graph, session, text, env, new Date(), traceLevel !== "off");
    console.log(res.text);
    if (traceLevel !== "off") {
      const rec = buildTraceRecord(res, new Date(), traceLevel);
      for (const line of traceViewLines(rec)) console.log(dim(line));
    }
    console.log("");
  };

  console.log("");
  printFrame();
  console.log(
    dim(
      "Ask or tell me things; “why did you say that?” replays my last reasoning. " +
        "/help lists the commands; /quit exits.",
    ),
  );
  console.log("");

  while (!atEof) {
    const line = await ask("> ");
    if (atEof) break;
    const t = line.trim();
    if (!t) continue;
    const cmd = parseSlashCommand(t);
    if (!cmd) {
      doTurn(t);
      continue;
    }
    if (cmd.kind === "quit") break;
    if (cmd.kind === "help") {
      for (const l of HELP_LINES) console.log(l);
      continue;
    }
    if (cmd.kind === "why") {
      console.log(dim("· why did you say that?"));
      doTurn("Why did you say that?");
      continue;
    }
    if (cmd.kind === "trace") {
      if (!cmd.arg) {
        console.log(`  trace view: ${traceLevel} — /trace off|steps|queries|full changes it`);
        continue;
      }
      const lvl = cmd.arg.toLowerCase();
      if (lvl === "off" || TRACE_LEVELS.includes(lvl)) {
        traceLevel = lvl;
        console.log(`  trace view: ${traceLevel}`);
      } else {
        console.log(`  /trace takes off, ${TRACE_LEVELS.join(", ")} — not “${cmd.arg}”`);
      }
      continue;
    }
    if (cmd.kind === "role") {
      if (!cmd.arg) {
        console.log(`  role: ${loadRolePack(env).id} — /role <name> switches packs`);
        continue;
      }
      try {
        const pack = loadRolePack({ ...env, CSKG_CHAT_ROLE: cmd.arg });
        env.CSKG_CHAT_ROLE = cmd.arg;
        console.log(
          `  Role is now ${pack.label} (${pack.id}) — it applies from your next message; the conversation continues.`,
        );
      } catch (err) {
        console.log(`  ${err.message}`);
      }
      continue;
    }
    if (cmd.kind === "person") {
      if (!cmd.arg) {
        const name = personNameFromEnv(env);
        console.log(
          name
            ? `  person: ${name} — /person <name> or /person none switches`
            : "  person: general mode — /person <name> switches",
        );
        continue;
      }
      if (cmd.arg.toLowerCase() === "none") {
        delete env.CSKG_CHAT_PERSON;
        session = createSession();
        console.log(
          "  Now in general mode — a fresh conversation; nobody's file is loaded or kept.",
        );
      } else {
        env.CSKG_CHAT_PERSON = cmd.arg;
        session = createSession();
        console.log(
          `  Now talking with ${cmd.arg} — a fresh conversation; their remembered facts (if any) are context again.`,
        );
      }
      printFrame();
      continue;
    }
    console.log(`  Unknown command “/${cmd.name}” — /help lists them.`);
  }
  console.log(`— session ended (${turns} ${turns === 1 ? "turn" : "turns"})`);
  rl.close();
}

async function main() {
  const args = process.argv.slice(2);
  if (!distReady()) {
    printInstallHint();
    process.exit(1);
  }
  // The TUI is the interactive path only: piped stdin, or any
  // of the command-line chat's own flags (--script, --debug,
  // --trace, --trace-level), belongs to the command-line chat,
  // whose behaviour is byte-for-byte what it has always been.
  const cliFlag = (a) =>
    a === "--script" ||
    a === "--debug" ||
    a === "--trace" ||
    a === "--trace-level" ||
    a.startsWith("--trace-level=");
  if (!process.stdin.isTTY || args.some(cliFlag)) {
    handOffToCli(args);
    return;
  }
  await runInteractive();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
