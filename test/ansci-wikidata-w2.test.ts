/**
 * ansci-wikidata-w2.test.ts — slice W2: banking, the lookup
 * trigger, and answering from the bank.
 *
 * Offline, fixtures only (test/fixtures/wikidata/): the source
 * is FixtureWikidataSource behind a counting wrapper, so the
 * no-fetch repeat is proven by the counter, not by assertion
 * about internals. Each test injects a FRESH WikidataBank —
 * the process-level default bank is never touched here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { newSession } from "../src/ansci/session";
import { processTurnWithWikidata } from "../src/ansci/wikidata-turn";
import { WikidataBank, mirrorBankIntoGraph, wikidataGraphNodeId } from "../src/ansci/wikidata-bank";
import { parseWikidataEntities, translateWikidataItems } from "../src/ansci/wikidata";
import {
  FixtureWikidataSource,
  type WikidataLookupResult,
  type WikidataSource,
} from "../src/ansci/wikidata-client";

function fixturesDir(): string {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "test", "fixtures", "wikidata");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(__dirname, "fixtures", "wikidata");
}
const FIXTURES = fixturesDir();
const load = (name: string): unknown => JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8"));

const FETCH_DATE = "2026-11-19";

/** The fixture source behind a call counter. */
function countingFixtureSource() {
  const inner = new FixtureWikidataSource(
    [load("oklahoma-wbgetentities.json"), load("texas-wbgetentities.json"), load("mercury-wbgetentities.json")],
    [load("oklahoma-wbsearchentities.json"), load("texas-wbsearchentities.json")],
  );
  const counter = { calls: 0, searches: 0, gets: 0 };
  const source: WikidataSource = {
    async searchEntities(search: string): Promise<WikidataLookupResult> {
      counter.calls++;
      counter.searches++;
      return inner.searchEntities(search);
    },
    async getEntities(ids: string[]): Promise<WikidataLookupResult> {
      counter.calls++;
      counter.gets++;
      return inner.getEntities(ids);
    },
  };
  return { source, counter };
}

const opts = (source: WikidataSource, bank: WikidataBank) => ({
  source,
  bank,
  fetchDate: FETCH_DATE,
  retrievedFrom: "fixture",
});

test("W2 first asking: a located knowledge decline fetches, banks and answers in the same turn", async () => {
  const { source, counter } = countingFixtureSource();
  const bank = new WikidataBank();
  const session = newSession();
  const r = await processTurnWithWikidata(session, "Where is Oklahoma?", opts(source, bank));
  assert.match(r.reply, /Oklahoma is in United States\./);
  assert.match(r.reply, /\(From Wikidata, Q1649\.\)/);
  assert.equal(r.trace.wikidata?.action, "looked-up-and-banked");
  assert.equal(r.trace.wikidata?.qid, "Q1649");
  assert.equal(r.trace.wikidata?.dataset, "wikidata");
  assert.equal(r.trace.wikidata?.fetched, true);
  assert.match(r.trace.wikidata?.priorDecline ?? "", /holds nothing on/i);
  assert.equal(r.trace.declineReason, undefined);
  // No masquerade: no derivation language is recorded for it.
  assert.equal(r.trace.derivationPath, undefined);
  assert.equal(r.trace.cyclePath, undefined);
  assert.ok(counter.calls > 0, "the first asking fetched");
  assert.ok(bank.nodeByName("Oklahoma"), "Oklahoma is banked");
  assert.equal(bank.nodeByName("Oklahoma")?.source.uri, "Q1649");
  assert.equal(bank.nodeByName("Oklahoma")?.source.dataset, "wikidata");
  assert.equal(bank.nodeByName("Oklahoma")?.source.baseVersion, FETCH_DATE);
  assert.equal(bank.nodeByName("Oklahoma")?.neverPropagationAnchor, true);
});

test("W2 second asking: the bank answers with NO further fetch — same session and fresh session", async () => {
  const { source, counter } = countingFixtureSource();
  const bank = new WikidataBank();
  const session = newSession();
  await processTurnWithWikidata(session, "Where is Oklahoma?", opts(source, bank));
  const afterFirst = counter.calls;
  assert.ok(afterFirst > 0);
  const again = await processTurnWithWikidata(session, "Where is Oklahoma?", opts(source, bank));
  assert.match(again.reply, /Oklahoma is in United States\./);
  assert.equal(again.trace.wikidata?.action, "answered-from-bank");
  assert.equal(again.trace.wikidata?.fetched, false);
  assert.equal(counter.calls, afterFirst, "the repeat performed no fetch");
  // A fresh session in the same process: the bank persists
  // across sessions, so still no fetch.
  const fresh = newSession();
  const freshAnswer = await processTurnWithWikidata(fresh, "Where is Oklahoma?", opts(source, bank));
  assert.match(freshAnswer.reply, /Oklahoma is in United States\./);
  assert.equal(freshAnswer.trace.wikidata?.action, "answered-from-bank");
  assert.equal(counter.calls, afterFirst, "the fresh session performed no fetch either");
});

test("W2 banking is idempotent: re-banking the same translation changes nothing", () => {
  const bank = new WikidataBank();
  const items = parseWikidataEntities(load("oklahoma-wbgetentities.json"));
  const translation = translateWikidataItems(items, { fetchDate: FETCH_DATE, retrievedFrom: "fixture" });
  const first = bank.bankTranslation(translation);
  assert.ok(first.addedNodes > 0 && first.addedAssociations > 0);
  const nodes = bank.nodeCount;
  const assocs = bank.associationCount;
  const second = bank.bankTranslation(translation);
  assert.equal(second.addedNodes, 0);
  assert.equal(second.addedAssociations, 0);
  assert.equal(second.alreadyBanked, first.addedNodes + first.addedAssociations);
  assert.equal(bank.nodeCount, nodes);
  assert.equal(bank.associationCount, assocs);
  // The graph mirror is idempotent too.
  const session = newSession();
  const m1 = mirrorBankIntoGraph(session.graph, bank);
  assert.ok(m1.addedNodes > 0 && m1.addedEdges > 0);
  const edgeCount = session.graph.allEdges().length;
  const m2 = mirrorBankIntoGraph(session.graph, bank);
  assert.equal(m2.addedNodes, 0);
  assert.equal(m2.addedEdges, 0);
  assert.equal(session.graph.allEdges().length, edgeCount);
});

test("W2 graph mirror: CAPITAL_OF/LOCATED_IN edges in the base partition, SOURCED_FROM, never-anchor preserved", async () => {
  const { source } = countingFixtureSource();
  const bank = new WikidataBank();
  const session = newSession();
  await processTurnWithWikidata(session, "Where is Oklahoma?", opts(source, bank));
  const okNode = session.graph.getNode(wikidataGraphNodeId("Q1649"));
  assert.ok(okNode, "the Oklahoma node is mirrored into the session graph");
  assert.equal(okNode.layer, "base");
  assert.equal(okNode.properties.neverPropagationAnchor, true);
  assert.equal(okNode.properties.lat, 35.5);
  assert.equal(okNode.properties.lon, -98);
  const types = session.graph.outEdges(okNode.id).map((e) => e.type);
  assert.ok(types.includes("LOCATED_IN"), "LOCATED_IN edge banked");
  assert.ok(types.includes("SOURCED_FROM"), "SOURCED_FROM edge banked");
  const capEdges = session.graph.allEdges().filter((e) => e.type === "CAPITAL_OF");
  assert.equal(capEdges.length, 1);
  assert.equal(session.graph.getNode(capEdges[0].from)?.name, "Oklahoma City");
  assert.equal(capEdges[0].confidence, 0.9);
  assert.equal(capEdges[0].properties?.provenanceKind, "retrieved");
  assert.equal(capEdges[0].properties?.sourceUri, "Q1649");
  assert.equal(capEdges[0].properties?.neverPropagationAnchor, true);
});

test("W2 offline honesty: an unavailable source draws the lookup-unavailable decline, not a nothing-held decline", async () => {
  const down: WikidataSource = {
    async searchEntities(): Promise<WikidataLookupResult> {
      return { status: "unavailable", reason: "fetch failed: network down (test stub)" };
    },
    async getEntities(): Promise<WikidataLookupResult> {
      return { status: "unavailable", reason: "fetch failed: network down (test stub)" };
    },
  };
  const bank = new WikidataBank();
  const session = newSession();
  const r = await processTurnWithWikidata(session, "Where is Oklahoma?", opts(down, bank));
  assert.match(r.reply, /could not look up Oklahoma/);
  assert.match(r.reply, /lookup was unavailable/);
  assert.doesNotMatch(r.reply, /I have nothing on/i);
  assert.equal(r.trace.wikidata?.action, "lookup-unavailable");
  assert.equal(bank.nodeCount, 0, "nothing was banked from a failed lookup");
});

test("W2 ambiguity: a conflicted join proposal banks nothing and the ordinary decline stands", async () => {
  // The Mercury shape, exercised on a subject whose turn does
  // reach the knowledge decline: the candidate finder (W1's
  // injectable) returns two rival synsets for the name — the
  // same conflict Mercury's four synsets produce at the W1
  // level (pinned in ansci-wikidata.test.ts) — so the join
  // proposal is conflicted and nothing may bank. (Mercury
  // itself cannot carry this test at the turn level: the
  // fork's classification table already holds 'mercury', so
  // its turn never ends in the knowledge decline that is the
  // trigger.)
  const { source } = countingFixtureSource();
  const rivalFinder = {
    synsetsFor: (name: string) => [
      { index: 0, id: "wn-n00000001", pos: "n" as const, offset: 1, gloss: `one reading of ${name}`, lemmas: [name] },
      { index: 1, id: "wn-n00000002", pos: "n" as const, offset: 2, gloss: `another reading of ${name}`, lemmas: [name] },
    ],
    hasConcept: () => false,
  };
  const bank = new WikidataBank();
  const session = newSession();
  const r = await processTurnWithWikidata(session, "Where is Oklahoma?", {
    ...opts(source, bank),
    candidateFinder: rivalFinder,
  });
  assert.match(r.reply, /I have nothing on oklahoma in what I know\./);
  assert.equal(r.trace.wikidata?.action, "lookup-ambiguous");
  assert.match(r.trace.wikidata?.detail ?? "", /distinct candidates/);
  assert.equal(bank.nodeByName("Oklahoma"), undefined, "a conflicted join banks nothing");
});

test("W2 consumers: capital and country answer from the bank, with no fetch", async () => {
  const { source, counter } = countingFixtureSource();
  const bank = new WikidataBank();
  const session = newSession();
  await processTurnWithWikidata(session, "Where is Oklahoma?", opts(source, bank));
  const afterBanking = counter.calls;
  const cap = await processTurnWithWikidata(session, "What is the capital of Oklahoma?", opts(source, bank));
  assert.match(cap.reply, /Oklahoma City is the capital of Oklahoma\./);
  assert.match(cap.reply, /\(From Wikidata, Q1649\.\)/);
  assert.equal(cap.trace.wikidata?.action, "answered-from-bank");
  const country = await processTurnWithWikidata(session, "What country is Oklahoma in?", opts(source, bank));
  assert.match(country.reply, /Oklahoma is in United States\./);
  assert.equal(country.trace.wikidata?.action, "answered-from-bank");
  assert.equal(counter.calls, afterBanking, "the consumers performed no fetch");
});

test("W2 consumers on a first asking: capital and country each trigger the lookup and answer", async () => {
  const { source, counter } = countingFixtureSource();
  // Capital first: the first asking ends at the unanchored-
  // definite exit, which is the capital shape's trigger.
  const bankA = new WikidataBank();
  const cap = await processTurnWithWikidata(newSession(), "What is the capital of Texas?", opts(source, bankA));
  assert.match(cap.reply, /Austin is the capital of Texas\./);
  assert.equal(cap.trace.wikidata?.action, "looked-up-and-banked");
  assert.equal(cap.trace.wikidata?.qid, "Q1439");
  // Country first: the first asking ends in the predicate
  // question's knowledge decline.
  const bankB = new WikidataBank();
  const country = await processTurnWithWikidata(newSession(), "What country is Texas in?", opts(source, bankB));
  assert.match(country.reply, /Texas is in United States\./);
  assert.equal(country.trace.wikidata?.action, "looked-up-and-banked");
  assert.equal(country.trace.wikidata?.qid, "Q1439");
  assert.ok(counter.calls > 0);
});

test("W2 regression (first live run): references are fetched mapped-only, in ≤50-id chunks", async () => {
  // The live API refuses wbgetentities requests over 50 ids
  // (its error shape parses as zero items). This stub mimics
  // that refusal and serves an item naming 60 mapped
  // references: without chunking the endpoints would bank
  // under raw QIDs and the where/capital answers would fail.
  const entity = (id: string, label: string, claims: Record<string, unknown> = {}) => ({
    id,
    labels: { en: { language: "en", value: label } },
    claims,
  });
  const itemClaim = (qid: string) => [
    { mainsnak: { snaktype: "value", datatype: "wikibase-item", datavalue: { type: "wikibase-entityid", value: { id: qid } } } },
  ];
  const entities: Record<string, unknown> = {
    Q900: entity("Q900", "Oklahoma", {
      P36: itemClaim("Q901"),
      P17: itemClaim("Q902"),
      P131: Array.from({ length: 60 }, (_, i) => itemClaim(`Q${1000 + i}`)[0]),
    }),
    Q901: entity("Q901", "Capital City"),
    Q902: entity("Q902", "Some Country"),
  };
  for (let i = 0; i < 60; i++) entities[`Q${1000 + i}`] = entity(`Q${1000 + i}`, `Place ${i}`);
  let maxRequest = 0;
  const stub: WikidataSource = {
    async searchEntities(): Promise<WikidataLookupResult> {
      return { status: "ok", data: { searchinfo: { search: "Oklahoma" }, search: [{ id: "Q900", label: "Oklahoma" }] } };
    },
    async getEntities(ids: string[]): Promise<WikidataLookupResult> {
      maxRequest = Math.max(maxRequest, ids.length);
      if (ids.length > 50) return { status: "ok", data: { error: { code: "too-many-ids" } } };
      const out: Record<string, unknown> = {};
      for (const id of ids) if (entities[id]) out[id] = entities[id];
      return { status: "ok", data: { entities: out } };
    },
  };
  const bank = new WikidataBank();
  const r = await processTurnWithWikidata(newSession(), "What is the capital of Oklahoma?", opts(stub, bank));
  assert.ok(maxRequest <= 50, `no request exceeded 50 ids (max ${maxRequest})`);
  assert.match(r.reply, /Capital City is the capital of Oklahoma\./);
  assert.equal(r.trace.wikidata?.qid, "Q900");
  assert.ok(bank.nodeByName("Some Country"), "the P17 endpoint banked under its name, not its QID");
});

test("W2 non-consumer turns are untouched by the wrapper", async () => {
  const { source, counter } = countingFixtureSource();
  const bank = new WikidataBank();
  const session = newSession();
  const r = await processTurnWithWikidata(session, "Hello.", opts(source, bank));
  assert.equal(r.trace.wikidata, undefined);
  assert.equal(counter.calls, 0);
});
