/**
 * cskg-setup.test.ts — the TUI step's testable surface: pre-chat
 * setup decisions (setup.ts), the loader's cache-state probe and
 * load-path callback (loader.ts), and the TUI's pure helpers
 * (tui.ts). Everything runs over a tiny hand-written fixture in
 * scratch dirs — never the real data file, never a download.
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { test } from "node:test";
import type { Situation } from "../src/cskg/awareness";
import {
  cachePathFor,
  cacheStateFor,
  loadCskg,
} from "../src/cskg/loader";
import { createSession } from "../src/cskg/memory";
import type { RolePack } from "../src/cskg/roles";
import {
  collectSetupFacts,
  dataFileFacts,
  decideSetup,
  type SetupFacts,
} from "../src/cskg/setup";
import { buildTraceRecord, type TraceFileRecord } from "../src/cskg/tracefile";
import { frameHeaderLines, parseSlashCommand, traceViewLines } from "../src/cskg/tui";
import { runTurn } from "../src/cskg/turn";

const HEADER =
  "id\tnode1\trelation\tnode2\tnode1;label\tnode2;label\trelation;label\trelation;dimension\tsource\tsentence";

function row(n1: string, rel: string, n2: string, src: string): string {
  return ["x", n1, rel, n2, "", "", "", "", src, ""].join("\t");
}

const ROWS = [
  row("/c/en/banana", "/r/IsA", "/c/en/fruit", "CN"),
  row("/c/en/banana", "/r/HasProperty", "/c/en/yellow", "CN"),
  row("/c/en/onion", "/r/Causes", "/c/en/crying", "CN"),
];

function scratch(t: { after: (fn: () => void) => void }): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-setup-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function writeFixture(dir: string): string {
  const file = path.join(dir, "fixture.tsv");
  fs.writeFileSync(file, [HEADER, ...ROWS].join("\n") + "\n");
  return file;
}

/* ---------------- data facts + the decision ---------------- */

test("dataFileFacts reports presence and size, nothing more", (t) => {
  const dir = scratch(t);
  const missing = path.join(dir, "nope.tsv");
  assert.deepEqual(dataFileFacts(missing), { exists: false, sizeBytes: 0 });
  const file = path.join(dir, "data.tsv");
  fs.writeFileSync(file, "abc");
  assert.deepEqual(dataFileFacts(file), { exists: true, sizeBytes: 3 });
  fs.writeFileSync(file, "");
  assert.deepEqual(dataFileFacts(file), { exists: true, sizeBytes: 0 });
});

test("decideSetup: missing or empty data means install, before any load", () => {
  const base: SetupFacts = {
    data: { exists: false, sizeBytes: 0 },
    cache: "absent",
    framenet: "absent",
  };
  assert.equal(decideSetup(base).action, "install-data");
  assert.equal(
    decideSetup({ data: { exists: true, sizeBytes: 0 }, cache: "current", framenet: "full" }).action,
    "install-data",
    "an empty file is invalid even if a cache claims to mirror it",
  );
});

test("decideSetup: a current cache is the only fast path", () => {
  const data = { exists: true, sizeBytes: 100 };
  assert.equal(decideSetup({ data, cache: "current", framenet: "full" }).action, "load-from-cache");
  for (const cache of ["absent", "stale", "invalid"] as const) {
    const d = decideSetup({ data, cache, framenet: "absent" });
    assert.equal(d.action, "load-and-serialise", `cache ${cache} parses in full`);
    assert.ok(d.detail.length > 0, "the decision carries its reason");
  }
});

/* ---------------- the cache probe over a fixture lifecycle ---------------- */

test("cacheStateFor follows the cache lifecycle of a fixture", async (t) => {
  const dir = scratch(t);
  const file = writeFixture(dir);
  const cache = cachePathFor(file);

  assert.equal(cacheStateFor(file), "absent");
  let facts = collectSetupFacts(file);
  assert.equal(facts.data.exists, true);
  assert.equal(decideSetup(facts).action, "load-and-serialise");

  const paths: string[] = [];
  await loadCskg(file, { onPath: (via) => paths.push(via) });
  assert.deepEqual(paths, ["parse"], "the first load parses and reports it");
  assert.ok(fs.existsSync(cache), "the parse wrote the serialised index");
  assert.equal(cacheStateFor(file), "current");
  facts = collectSetupFacts(file);
  assert.equal(decideSetup(facts).action, "load-from-cache");

  await loadCskg(file, { onPath: (via) => paths.push(via) });
  assert.deepEqual(paths, ["parse", "cache"], "the second load takes the fast path");

  // the data changes → the index no longer names this source
  fs.appendFileSync(file, row("/c/en/soup", "/r/IsA", "/c/en/food", "CN") + "\n");
  assert.equal(cacheStateFor(file), "stale");
  await loadCskg(file); // rewrites the cache for the new fingerprint
  assert.equal(cacheStateFor(file), "current");

  // the cache is damaged beyond recognition
  fs.writeFileSync(cache, "this is not a serialised index");
  assert.equal(cacheStateFor(file), "invalid");

  fs.rmSync(cache);
  assert.equal(cacheStateFor(file), "absent");
});

test("loadCskg with the cache disabled parses and writes nothing", async (t) => {
  const dir = scratch(t);
  const file = writeFixture(dir);
  const paths: string[] = [];
  await loadCskg(file, { cache: false, onPath: (via) => paths.push(via) });
  assert.deepEqual(paths, ["parse"]);
  assert.equal(fs.existsSync(cachePathFor(file)), false);
  assert.equal(cacheStateFor(file), "absent");
});

/* ---------------- TUI helpers ---------------- */

test("parseSlashCommand separates commands from conversation", () => {
  assert.equal(parseSlashCommand("What is a banana?"), null);
  assert.equal(parseSlashCommand("  tell me about soup"), null);
  assert.deepEqual(parseSlashCommand("/help"), { kind: "help" });
  assert.deepEqual(parseSlashCommand("/quit"), { kind: "quit" });
  assert.deepEqual(parseSlashCommand("/exit"), { kind: "quit" });
  assert.deepEqual(parseSlashCommand("/why"), { kind: "why" });
  assert.deepEqual(parseSlashCommand("/trace"), { kind: "trace", arg: null });
  assert.deepEqual(parseSlashCommand("/trace queries"), { kind: "trace", arg: "queries" });
  assert.deepEqual(parseSlashCommand("/role companion"), { kind: "role", arg: "companion" });
  assert.deepEqual(parseSlashCommand("/person none"), { kind: "person", arg: "none" });
  assert.deepEqual(parseSlashCommand("/person Sam Smith"), {
    kind: "person",
    arg: "Sam Smith",
  });
  assert.deepEqual(parseSlashCommand("/bogus x"), { kind: "unknown", name: "bogus" });
});

const ROLE: RolePack = {
  id: "assistant",
  label: "Assistant",
  statementStrategy: "acknowledge-and-offer",
  preferredRelations: [],
  declineStyle: "named-missing",
  clarificationDisposition: "ready",
  memoryAck: "I'll remember that.",
};

test("frameHeaderLines speaks the frame in plain words", () => {
  const sit: Situation = {
    now: new Date(2026, 10, 9, 19, 5),
    place: { name: "Chicago", hemisphere: "north", band: "temperate" },
    season: "autumn",
    daypart: "evening",
  };
  const general = frameHeaderLines(sit, ROLE, { kind: "general" });
  assert.match(general[0], /^Chicago · autumn · evening · /);
  assert.match(general[1], /role: Assistant \(assistant\)/);
  assert.match(general[1], /general mode/);
  const known = frameHeaderLines(sit, ROLE, { kind: "known", name: "Sam" });
  assert.match(known[1], /talking with Sam/);
  const unset = frameHeaderLines(
    { ...sit, place: null, season: null },
    ROLE,
    { kind: "general" },
  );
  assert.match(unset[0], /^place not set · season unknown · evening · /);
});

test("traceViewLines renders what the record carries, at its own level", async (t) => {
  const dir = scratch(t);
  const file = writeFixture(dir);
  const g = await loadCskg(file);
  const session = createSession();
  const res = runTurn(g, session, "What is a banana?", {}, new Date(), true);
  assert.ok(res.queries.length > 0, "the fixture turn issues queries");

  const stepsView = traceViewLines(buildTraceRecord(res, new Date(), "steps"));
  assert.match(stepsView[0], /^trace — turn 1 · intent: /);
  assert.ok(
    stepsView.some((l) => l.includes(`(${res.queries.length} graph queries`)),
    "a steps-level view states the query count and stops",
  );
  assert.ok(
    !stepsView.some((l) => l.startsWith("  queries (")),
    "a steps-level view lists no query entries",
  );

  const queriesView = traceViewLines(buildTraceRecord(res, new Date(), "queries"));
  assert.ok(queriesView.some((l) => l.startsWith("  queries (")), "queries are listed");
  assert.ok(queriesView.some((l) => l.includes("outEdges")), "accessors are named");

  // a fabricated record for the summary line and the no-query turn
  const fabricated: TraceFileRecord = {
    turn: 7,
    at: new Date().toISOString(),
    location: null,
    utterance: "…",
    reply: "…",
    grounded: true,
    intent: "fact",
    steps: [],
    queries: [
      { via: "outEdges", term: "onion", rel: "/r/Causes", hits: 0 },
      {
        via: "lemmaOf",
        summary: true,
        count: 10,
        distinctTerms: 8,
        zeroHits: 3,
        totalHits: 5,
      },
    ],
    queryCount: 11,
  };
  const lines = traceViewLines(fabricated);
  assert.ok(lines.some((l) => l.includes('outEdges "onion" /r/Causes → 0 hits')));
  assert.ok(lines.some((l) => l.includes("lemmaOf ×10 queries summarised")));
  const silent = traceViewLines({ ...fabricated, queries: [], queryCount: 0 });
  assert.ok(silent.some((l) => l.includes("(no graph queries")), "a recital says so");
});
