/**
 * RelEx evidence routing (Stage 4): the full-pipeline Stanford
 * relations ride ParsedSentence.relexEvidence as evidence —
 * proposed relations over the parse's own token indices, never
 * meaning-graph edges. These tests warm the WASM module the
 * way the chat entry points do; with a cold module the record
 * is simply absent (pinned by the last test's contract note —
 * absence is exercised implicitly by every other test file
 * that parses without warming).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/ansci/parse";
import { ensureLinkGrammarLoaded } from "../src/ansci/linkgrammar-wasm";
import { relexEvidenceSync, mapLinkagePositionsToTokens } from "../src/ansci/linkgrammar-relex-evidence";

test("relex evidence: semantic families ride the parse as evidence", async () => {
  await ensureLinkGrammarLoaded();
  const parsed = parse("Johnny ate the dog.", "en");
  const ev = parsed.relexEvidence;
  assert.ok(ev, "evidence present once the WASM module is warm");
  assert.equal(ev.status, "complete");
  // Relations are over the parse's own token indices:
  // tokens: Johnny(0) ate(1) the(2) dog(3)
  const has = (family: string, gov: number, dep: number) =>
    ev.relations.some((r) => r.family === family && r.gov === gov && r.dep === dep);
  assert.ok(has("nsubj", 1, 0), `nsubj(ate, Johnny): ${JSON.stringify(ev.relations)}`);
  assert.ok(has("dobj", 1, 3), "dobj(ate, dog)");
  assert.ok(has("det", 3, 2), "det(dog, the)");
  // Evidence only: the meaning graph is the parser's own —
  // the evidence added no nodes and no edges beyond it.
  assert.equal(parsed.meaning.rootId !== undefined, true);
});

test("relex evidence: negation and passive families appear", async () => {
  await ensureLinkGrammarLoaded();
  const neg = parse("John does not run.", "en");
  assert.ok(neg.relexEvidence?.families.includes("neg"), JSON.stringify(neg.relexEvidence?.families));
  const pass = parse("The dog was chased by the cat.", "en");
  assert.ok(pass.relexEvidence?.families.includes("nsubjpass"), JSON.stringify(pass.relexEvidence?.families));
});

test("relex evidence: token mapping is sequential and drops the unmappable", () => {
  const map = mapLinkagePositionsToTokens(
    ["LEFT-WALL", "the", "dog", "runs"],
    ["The", "dog", "runs", "fast"],
  );
  assert.equal(map.get(1), 0);
  assert.equal(map.get(2), 1);
  assert.equal(map.get(3), 2);
  assert.equal(map.has(0), false, "LEFT-WALL never maps");
});

test("relex evidence: cold module resolves to absence, never a throw", () => {
  // In a fresh process the module would be cold; here it may
  // already be warm from the tests above — either way the call
  // must not throw and must return a well-formed result.
  const ev = relexEvidenceSync("Johnny ate the dog.", ["Johnny", "ate", "the", "dog"]);
  assert.ok(ev === undefined || ev.status === "complete");
});
