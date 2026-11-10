/**
 * chat-history.test.ts — the one-shot chat's replay contract
 * (scripts/chat-once.mjs): a fresh session that replays the stored
 * user lines must answer the next turn exactly as the live session
 * that actually lived those turns does. That equivalence is the
 * whole method — without it, per-invocation chats lose memory.
 *
 * Own fixture graph (same shape as test/cskg.test.ts): history
 * helpers plus replayed runTurns over a tiny hand-written TSV.
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { test } from "node:test";
import { loadCskg, type CskgGraph } from "../src/cskg/loader";
import { createSession } from "../src/cskg/memory";
import { runTurn } from "../src/cskg/turn";
import {
  appendHistory,
  clearHistory,
  loadHistory,
  replayTurns,
} from "../src/cskg/chat-history";

const HEADER =
  "id\tnode1\trelation\tnode2\tnode1;label\tnode2;label\trelation;label\trelation;dimension\tsource\tsentence";

function row(n1: string, rel: string, n2: string, src: string): string {
  return ["x", n1, rel, n2, "", "", "", "", src, ""].join("\t");
}

const ROWS = [
  row("/c/en/banana", "/r/IsA", "/c/en/fruit", "CN"),
  row("/c/en/banana", "/r/IsA", "/c/en/fruit", "WN"),
  row("/c/en/soup", "/r/IsA", "/c/en/food", "CN"),
  row("/c/en/coffee", "/r/IsA", "/c/en/beverage", "CN"),
];

let graphPromise: Promise<CskgGraph> | null = null;
function graph(): Promise<CskgGraph> {
  if (!graphPromise) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chat-history-fixture-"));
    const file = path.join(dir, "fixture.tsv");
    fs.writeFileSync(file, [HEADER, ...ROWS].join("\n") + "\n");
    graphPromise = loadCskg(file);
  }
  return graphPromise;
}

function tmpHistory(): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "chat-history-")), "history.txt");
}

test("loadHistory is empty for a missing file and skips blanks", () => {
  const f = path.join(os.tmpdir(), `chat-history-nope-${Date.now()}.txt`);
  assert.deepEqual(loadHistory(f), []);
  const h = tmpHistory();
  fs.writeFileSync(h, "first\n\n   \nsecond\n");
  assert.deepEqual(loadHistory(h), ["first", "second"]);
});

test("appendHistory round-trips lines in order", () => {
  const h = tmpHistory();
  appendHistory(h, "I'm making soup.");
  appendHistory(h, "What about coffee?");
  assert.deepEqual(loadHistory(h), ["I'm making soup.", "What about coffee?"]);
});

test("clearHistory empties the file", () => {
  const h = tmpHistory();
  appendHistory(h, "something");
  clearHistory(h);
  assert.deepEqual(loadHistory(h), []);
});

test("replayed session answers like the live session", async () => {
  const g = await graph();
  const prior = ["What is a banana?", "What is soup made of?"];
  const next = "Why did you say that?";

  const live = createSession();
  for (const line of prior) runTurn(g, live, line);
  const liveAnswer = runTurn(g, live, next);

  const replayed = createSession();
  replayTurns(g, replayed, loadHistoryRoundTrip(prior));
  const replayedAnswer = runTurn(g, replayed, next);

  assert.equal(replayedAnswer.text, liveAnswer.text);
  assert.equal(replayedAnswer.grounded, liveAnswer.grounded);
});

function loadHistoryRoundTrip(lines: string[]): string[] {
  const h = tmpHistory();
  for (const line of lines) appendHistory(h, line);
  return loadHistory(h);
}
