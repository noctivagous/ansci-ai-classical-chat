/**
 * framenet.test.ts — slice 2d acceptance, §5 + the §12 2d done-when.
 *
 * Two data tiers, by design (the bundle is a local install artifact,
 * gitignored; the repo ships the installer and this fixture):
 *  - the FIXTURE bundle (test/fixtures/framenet/, checked in, in the
 *    bundle's own format: Commerce_buy, Commerce_sell, Getting,
 *    Precipitation, Weather) backs the loader / linkage / chat tests,
 *    so the suite passes on a fresh clone with no download;
 *  - the FULL local bundle (data/framenet/, written by
 *    scripts/import-framenet.py) is verified when present and skipped
 *    gracefully when absent.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildChatGraph, getDefaultExtract, mappedConceptForSynset } from "../src/wordnet";
import {
  frameElementNodeId,
  frameNetInstalled,
  frameNodeId,
  loadFrameNetBundle,
  mergeFrameNet,
  DEFAULT_FRAMENET_PATH,
  type FrameNetBundle,
} from "../src/framenet";
import { statementsFor } from "../src/propagate";
import {
  createSession,
  graphStampFor,
  runTurn,
  type RouteDecision,
  type SessionState,
  type TurnResult,
} from "../src/router";

const extract = getDefaultExtract();
const FIXTURE_DIR = path.join(__dirname, "..", "..", "test", "fixtures", "framenet");
const REPO_ROOT = path.join(__dirname, "..", "..");

function fixtureGraph() {
  const graph = buildChatGraph();
  const bundle = loadFrameNetBundle(FIXTURE_DIR);
  const counts = mergeFrameNet(graph, bundle, extract);
  return { graph, bundle, counts };
}

function turn(graph: Parameters<typeof runTurn>[0], s: SessionState, q: string): TurnResult {
  return runTurn(graph, s, q, { extract, experienceDir: null });
}
function session(): SessionState {
  return createSession(graphStampFor(extract));
}

/* ------------------------- fixture bundle -------------------------- */

test("FN-FIXTURE: the checked-in fixture loads with its recorded counts", () => {
  const bundle = loadFrameNetBundle(FIXTURE_DIR);
  assert.deepEqual(bundle.counts, {
    frames: 5,
    frameElements: 57,
    lexicalUnits: 58,
    frameRelations: 2,
  });
  assert.equal(bundle.edition, "1.5");
  const buy = bundle.frames.find((f) => f.name === "Commerce_buy");
  assert.ok(buy, "fixture carries Commerce_buy");
  const core = buy!.fes.filter((f) => f.core).map((f) => f.name);
  assert.deepEqual(core, ["Buyer", "Goods"], "1.5 marks Buyer/Goods core in Commerce_buy");
  const names = buy!.fes.map((f) => f.name);
  for (const fe of ["Seller", "Money"]) assert.ok(names.includes(fe), `Commerce_buy has ${fe}`);
  const weather = bundle.frames.find((f) => f.name === "Precipitation");
  assert.ok(weather, "fixture carries a weather frame (Precipitation)");
  assert.ok(weather!.lus.some((lu) => lu.lemma === "snow"), "Precipitation is evoked by snow");
});

test("FN-IMPORTER: re-running the importer reproduces the fixture byte-for-byte", (t) => {
  const script = path.join(REPO_ROOT, "scripts", "import-framenet.py");
  const zip = path.join(REPO_ROOT, "data", "raw", "framenet", "framenet_v15.zip");
  if (!fs.existsSync(zip)) {
    t.skip("raw FrameNet zip not present locally — importer determinism checked where installed");
    return;
  }
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "fn-fixture-"));
  try {
    execFileSync("python3", [
      script,
      "--no-fetch",
      "--zip", zip,
      "--only", "Commerce_buy,Commerce_sell,Getting,Precipitation,Weather",
      "--out-dir", out,
    ], { stdio: "pipe" });
    for (const name of ["manifest.json", "part-001.json", "part-002.json"]) {
      assert.equal(
        fs.readFileSync(path.join(out, name), "utf-8"),
        fs.readFileSync(path.join(FIXTURE_DIR, name), "utf-8"),
        `${name} is byte-identical to a fresh importer run`,
      );
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      t.skip("python3 not available");
      return;
    }
    throw err;
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

/* ------------------------- loader + linkage ------------------------ */

test("FN-MERGE: fixture merge builds frames, elements, units and §5 edges", () => {
  const { graph, counts } = fixtureGraph();
  assert.deepEqual(counts, {
    frames: 5,
    frameElements: 57,
    lexicalUnits: 58,
    hasFrameElementEdges: 57,
    evokesEdges: 58,
    luSynsetEdges: 194,
    linkedLUs: 52,
    unmatchedLUs: 6,
    synsetEvokesEdges: 169,
    relationEdges: 2,
    relationsSkipped: 0,
  });
  const buy = graph.getNode(frameNodeId("Commerce_buy"));
  assert.equal(buy?.type, "Frame");
  assert.equal(buy?.layer, "base");
  // FE core flags ride the edge properties (§5.2).
  const buyerEdge = graph
    .outEdges(buy!.id, "HAS_FRAME_ELEMENT")
    .find((e) => graph.getNode(e.to)?.name === "Buyer");
  assert.equal(buyerEdge?.properties?.core, true);
  // Frame relations (§5.2 types): Commerce_buy inherits Getting;
  // Precipitation is a subframe of Weather.
  assert.ok(
    graph.outEdges(buy!.id, "INHERITS_FROM").some((e) => e.to === frameNodeId("Getting")),
    "Commerce_buy —INHERITS_FROM→ Getting",
  );
  assert.ok(
    graph
      .outEdges(frameNodeId("Precipitation"), "SUBFRAME_OF")
      .some((e) => e.to === frameNodeId("Weather")),
    "Precipitation —SUBFRAME_OF→ Weather",
  );
  const inh = graph.outEdges(buy!.id, "INHERITS_FROM")[0];
  assert.ok(
    Array.isArray(inh.properties?.feRelations) && (inh.properties!.feRelations as unknown[]).length > 0,
    "FE-to-FE correspondences recorded on the relation edge",
  );
});

test("FN-BRIDGE: LUs evoke their frame and name synsets by lemma+POS; the seed bridge is undisturbed", () => {
  const { graph } = fixtureGraph();
  const buyLu = graph
    .allNodes()
    .find((n) => n.type === "LexicalUnit" && n.properties["lemma"] === "buy");
  assert.ok(buyLu, "a buy lexical unit exists");
  assert.ok(
    graph.outEdges(buyLu!.id, "EVOKES").some((e) => e.to === frameNodeId("Commerce_buy")),
    "buy.v —EVOKES→ Commerce_buy",
  );
  const synsetLinks = graph.outEdges(buyLu!.id, "MAPPED_TO");
  assert.ok(synsetLinks.length > 0, "buy.v names at least one synset");
  assert.ok(
    synsetLinks.every((e) => graph.getNode(e.to)?.type === "Synset"),
    "LU MAPPED_TO lands on synsets",
  );
  assert.ok(
    synsetLinks.every((e) => e.properties?.bridge === "lemma-pos"),
    "the linkage is marked as AnSci's lemma+POS bridge, not FrameNet data",
  );
  // The guard: snow's synset still maps to the SEED concept, never to an LU.
  assert.equal(mappedConceptForSynset(graph, "wn-n11730995")?.id, "snow");
  // Unmatched LUs stay in the graph, unlinked and countable.
  const unmatched = graph
    .allNodes()
    .filter(
      (n) =>
        n.type === "LexicalUnit" && graph.outEdges(n.id, "MAPPED_TO").length === 0,
    );
  assert.equal(unmatched.length, 6);
});

test("FN-CONTACT: propagation reaches the Precipitation frame as a frame-level leaning (§6.2)", () => {
  const { graph } = fixtureGraph();
  const sts = statementsFor(graph, frameNodeId("Precipitation"));
  const el = sts.find((s) => s.relation === "HAS_ELEMENT" && s.objectId === "water");
  const pol = sts.find((s) => s.relation === "HAS_POLARITY" && s.objectId === "yin");
  assert.ok(el, "the frame leans Water through its evoking words");
  assert.ok(pol, "the frame leans Yin through its evoking words");
  assert.equal(el!.mappingStatus, "propagated");
  // The frame surfaces in debug paths from a mapped synset.
  const p = graph.findPath("wn-n11730995", frameNodeId("Precipitation"), {
    edgeTypes: ["EVOKES"],
    confidenceThreshold: 0,
  });
  assert.ok(p && p.text.includes("EVOKES"), `debug path exists: ${p?.text}`);
  // And the frame itself holds no classification of its own: frames
  // are not concepts (§5.2).
  assert.equal(graph.outEdges(frameNodeId("Precipitation"), "HAS_ELEMENT").length, 0);
  assert.equal(graph.outEdges(frameNodeId("Precipitation"), "HAS_POLARITY").length, 0);
});

/* ------------------------- chat behaviour -------------------------- */

test("FN-GATE: 'who are the participants when someone buys something?' answers Buyer/Goods/Seller/Money", () => {
  const { graph } = fixtureGraph();
  const r = turn(graph, session(), "who are the participants when someone buys something?");
  const d = r.decision as Extract<RouteDecision, { kind: "route" }>;
  assert.equal(r.decision.kind, "route");
  assert.equal(d.intent.intentType, "frame_participants");
  assert.equal(d.intent.matchedNodes[0], frameNodeId("Commerce_buy"));
  for (const fe of ["Buyer", "Goods", "Seller", "Money"]) {
    assert.ok(r.rendered.text.includes(fe), `answer names ${fe}: ${r.rendered.text}`);
  }
  assert.ok(!r.trace.boundHit, "the element set fits the step bound");
  assert.equal(r.rendered.violations.length, 0, "the answer passes §9's scans");
});

test("FN-WEATHER: participants of a weather frame (Precipitation, via snow)", () => {
  const { graph } = fixtureGraph();
  const r = turn(graph, session(), "what are the participants when it snows?");
  const d = r.decision as Extract<RouteDecision, { kind: "route" }>;
  assert.equal(r.decision.kind, "route");
  assert.equal(d.intent.matchedNodes[0], frameNodeId("Precipitation"));
  for (const fe of ["Precipitation", "Place", "Time", "Temperature"]) {
    assert.ok(r.rendered.text.includes(fe), `answer names ${fe}: ${r.rendered.text}`);
  }
});

test("FN-EVOKERS + FN-FRAME-OF: what evokes Commerce_buy, and what buy evokes", () => {
  const { graph } = fixtureGraph();
  const s = session();
  const r1 = turn(graph, s, "what evokes Commerce_buy?");
  assert.equal(r1.decision.kind, "route");
  assert.ok(r1.rendered.text.includes("buy"), r1.rendered.text);
  assert.ok(r1.rendered.text.includes("purchase"), r1.rendered.text);
  const r2 = turn(graph, s, "what frame does buy evoke?");
  assert.equal(r2.decision.kind, "route");
  assert.ok(r2.rendered.text.includes("Commerce_buy"), r2.rendered.text);
  assert.ok(r2.rendered.text.includes("Buyer"), r2.rendered.text);
});

/* ------------------------- optionality ----------------------------- */

test("FN-ABSENT: without the layer, frame questions decline with the installer named — and nothing else changes", () => {
  const graph = buildChatGraph(); // no FrameNet merged: the fresh-clone state
  const s = session();
  const r = turn(graph, s, "who are the participants when someone buys something?");
  assert.equal(r.decision.kind, "decline");
  assert.equal((r.decision as { decisionReason: string }).decisionReason, "D-frame/not-installed");
  assert.ok(r.rendered.text.includes("FrameNet is not installed"), r.rendered.text);
  assert.ok(r.rendered.text.includes("import-framenet.py"), r.rendered.text);
  // The rest of the chat is untouched by the layer's absence.
  const r2 = turn(graph, s, "why is winter cold?");
  assert.equal(r2.decision.kind, "route");
  assert.ok(r2.rendered.text.toLowerCase().includes("winter is cold"), r2.rendered.text);
  const r3 = turn(graph, s, "what is the opposite of cold?");
  assert.equal(r3.decision.kind, "route");
  assert.ok(r3.rendered.text.toLowerCase().includes("hot"), r3.rendered.text);
});

/* ------------------------- full bundle (when installed) ------------ */

test("FN-FULL: the full local bundle, when present, carries the complete 1.5 inventory", (t) => {
  if (!frameNetInstalled(DEFAULT_FRAMENET_PATH)) {
    t.skip("FrameNet bundle not installed (run scripts/import-framenet.py)");
    return;
  }
  const bundle: FrameNetBundle = loadFrameNetBundle(DEFAULT_FRAMENET_PATH);
  assert.deepEqual(bundle.counts, {
    frames: 1019,
    frameElements: 9634,
    lexicalUnits: 11942,
    frameRelations: 1676,
  });
  const graph = buildChatGraph();
  const counts = mergeFrameNet(graph, bundle, extract);
  assert.deepEqual(counts, {
    frames: 1019,
    frameElements: 9634,
    lexicalUnits: 11942,
    hasFrameElementEdges: 9634,
    evokesEdges: 11942,
    luSynsetEdges: 36975,
    linkedLUs: 8622,
    unmatchedLUs: 3320,
    synsetEvokesEdges: 33951,
    relationEdges: 1224,
    relationsSkipped: 452,
  });
  // The commerce gate over the full inventory, not just the fixture.
  const r = turn(graph, session(), "who are the participants when someone buys something?");
  assert.equal(r.decision.kind, "route");
  for (const fe of ["Buyer", "Goods", "Seller", "Money"]) {
    assert.ok(r.rendered.text.includes(fe), `full-bundle answer names ${fe}`);
  }
  // FE identity is the FN id: Activity_ongoing's two "Duration" FEs coexist.
  const durations = graph
    .outEdges(frameNodeId("Activity_ongoing"), "HAS_FRAME_ELEMENT")
    .filter((e) => graph.getNode(e.to)?.name === "Duration");
  assert.equal(durations.length, 2);
  assert.notEqual(durations[0].to, durations[1].to);
  assert.equal(frameElementNodeId(1418), "fn-fe:1418");
});
