/**
 * cskg-e4.test.ts — E4, the conversation frame (design §8):
 * the Context module and G5's traceable difference, role packs,
 * the person file (two tiers, acknowledged writes, general-mode
 * amnesia), statement classification with the graph-evidence
 * channels, EverydaySense's filing-mass default, the
 * AmbiguityResolver's grounds and escalation, the standing
 * tuple's admissions, and pending clarifications.
 *
 * Its own fixture graph: a filing for "cold" whose illness
 * cluster outweighs temperature (the named case), an ATOMIC
 * tired event keyed by a bare state word, an ATOMIC keys event
 * with an xIntent profile (the classifier's graph-flip case),
 * and the coat/soup/library furniture the context and
 * classification tests need.
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { test } from "node:test";
import { computeSituation } from "../src/cskg/awareness";
import { composeContextInto } from "../src/cskg/context";
import {
  buildDefinitionsStore,
  chooseDefinition,
} from "../src/cskg/definitions";
import { analyseInto } from "../src/cskg/discourse";
import { defaultReading } from "../src/cskg/everydaysense";
import { classifyStatement } from "../src/cskg/intent";
import { loadCskg, type CskgGraph } from "../src/cskg/loader";
import { createSession, type SessionState } from "../src/cskg/memory";
import {
  activeFacts,
  captureStatement,
  clearPersonCache,
  loadPersonData,
  type CaptureResult,
} from "../src/cskg/person";
import { resolveRivalReadings, type RivalReading } from "../src/cskg/resolver";
import { loadRolePack, parseRolePack } from "../src/cskg/roles";
import { contextFit } from "../src/cskg/solve";
import { admissionFor, admissionPhrase } from "../src/cskg/standing";
import { runTurn } from "../src/cskg/turn";
import { createWorkspace } from "../src/cskg/workspace";

const HEADER =
  "id\tnode1\trelation\tnode2\tnode1;label\tnode2;label\trelation;label\trelation;dimension\tsource\tsentence";

function row(n1: string, rel: string, n2: string, src: string): string {
  return ["x", n1, rel, n2, "", "", "", "", src, ""].join("\t");
}

const ROWS = [
  // cold's filing: temperature alone (mass 1); the illness world
  // filed at two depths (mass 2, one cluster via the shared parent)
  row("/c/en/cold", "/r/IsA", "/c/en/temperature", "CN"),
  row("/c/en/cold", "/r/IsA", "/c/en/respiratory_disease", "CN"),
  row("/c/en/cold", "/r/IsA", "/c/en/communicable_disease", "CN"),
  row("/c/en/respiratory_disease", "/r/IsA", "/c/en/disease", "CN"),
  row("/c/en/communicable_disease", "/r/IsA", "/c/en/disease", "CN"),
  row("/c/en/common_cold", "/r/IsA", "/c/en/illness", "CN"),
  row("/c/en/illness", "/r/IsA", "/c/en/disease", "CN"),
  // the statement furniture
  row("/c/en/soup", "/r/IsA", "/c/en/dish", "CN"),
  row("/c/en/soup", "/r/IsA", "/c/en/dish", "WN"),
  row("/c/en/library", "/r/IsA", "/c/en/building", "CN"),
  row("/c/en/rain", "/r/IsA", "/c/en/precipitation", "CN"),
  // the coat world (Context's autumn facet word "coat" lives here)
  row("/c/en/winter_coat", "/r/IsA", "/c/en/coat", "CN"),
  row("/c/en/coat", "/r/UsedFor", "/c/en/keep_warm", "CN"),
  row("/c/en/coat", "/r/RelatedTo", "/c/en/winter", "CN"),
  // a bare state word keying an ATOMIC event (the state record's key)
  row("at:personx_is_tired", "at:xReact", "/c/en/exhausted", "AT"),
  row("at:personx_is_tired", "at:xWant", "/c/en/rest", "AT"),
  row("/c/en/tired", "/r/IsA", "/c/en/feeling", "CN"),
  // an event with an xIntent profile (the classifier's flip case)
  row("at:personx_loses_their_house_keys", "at:xIntent", "/c/en/find_them", "AT"),
  row("at:personx_loses_their_house_keys", "at:xReact", "/c/en/frustrated", "AT"),
];

let graphPromise: Promise<CskgGraph> | null = null;
function graph(): Promise<CskgGraph> {
  if (!graphPromise) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-e4-"));
    const file = path.join(dir, "fixture.tsv");
    fs.writeFileSync(file, [HEADER, ...ROWS].join("\n") + "\n");
    graphPromise = loadCskg(file, { cache: false });
  }
  return graphPromise;
}

const EMPTY_CAPTURE: CaptureResult = {
  factsWritten: [], patternsWritten: [], feeling: null, doing: null, newPerson: null,
};

function peopleEnv(): { env: NodeJS.ProcessEnv; dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-people-"));
  clearPersonCache();
  return { env: { CSKG_CHAT_PERSON: "sam", CSKG_CHAT_PEOPLE_DIR: dir }, dir };
}

/* ---------------- Part 1 — Context ------------------------------ */

test("E4 context: composition records facets, weights and the frame in the trace", async () => {
  const g = await graph();
  const ws = createWorkspace(1, "anything");
  ws.situation = computeSituation(new Date(2026, 10, 9, 12), { CSKG_CHAT_LOCATION: "Chicago" });
  ws.role = loadRolePack({});
  ws.activeContext = { topics: [], lastIntent: "fact" };
  composeContextInto(ws, createSession(), g, null);
  const ctx = ws.context!;
  assert.equal(ctx.roleId, "assistant");
  assert.ok(ctx.situationFacets.some((f) => f.text === "autumn" && f.via === "season"));
  assert.ok(ctx.situationFacets.some((f) => f.text === "coat"), "autumn's vocabulary carries the coat facet");
  assert.ok(
    ws.trace.steps.some((s) => s.piece === "context" && s.kind === "compose"),
    "composition is a trace step of the context piece",
  );
});

test("E4 context (G5): the same coat turn scores differently under autumn and spring facets", async () => {
  const g = await graph();
  const scoreIn = (location: string): { score: number; traced: string } => {
    const ws = createWorkspace(1, "I'm thinking of buying a winter coat.");
    ws.situation = computeSituation(new Date(2026, 10, 9, 12), { CSKG_CHAT_LOCATION: location });
    ws.role = loadRolePack({});
    ws.activeContext = { topics: [], lastIntent: "fact" };
    composeContextInto(ws, createSession(), g, null);
    analyseInto(ws, g);
    const mention = ws.breakdown!.mentions.find((m) => m.text === "winter coat");
    assert.ok(mention && mention.chosen >= 0, "winter coat resolves");
    const cand = mention.candidates[mention.chosen];
    return { score: cand.score, traced: cand.reasons.join("; ") };
  };
  const autumn = scoreIn("Chicago"); // northern November: autumn facets include "coat"
  const spring = scoreIn("Sydney"); // southern November: spring facets do not
  assert.ok(
    autumn.score > spring.score,
    `operative context moved the candidate during analysis (autumn ${autumn.score} > spring ${spring.score})`,
  );
  assert.match(autumn.traced, /context overlap/, "the difference is the context-overlap channel, named in the reasons");
});

/* ---------------- Part 2 — role packs ---------------------------- */

test("E4 roles: packs load as data, default assistant, companion contrasts", () => {
  const a = loadRolePack({});
  assert.equal(a.id, "assistant");
  assert.equal(a.statementStrategy, "acknowledge-and-offer");
  assert.equal(a.declineStyle, "named-missing");
  const c = loadRolePack({ CSKG_CHAT_ROLE: "companion" });
  assert.equal(c.statementStrategy, "react-and-share");
  assert.equal(c.declineStyle, "plain");
  assert.equal(c.clarificationDisposition, "sparing");
  assert.ok(c.preferredRelations.includes("at:xReact"));
  assert.notEqual(c.memoryAck, a.memoryAck, "each role acknowledges memory in its own voice");
});

test("E4 roles: an unknown pack is a configuration error, and a malformed pack is rejected", () => {
  assert.throws(() => loadRolePack({ CSKG_CHAT_ROLE: "wizard" }), /role pack "wizard" not found/);
  assert.throws(
    () => parseRolePack(JSON.stringify({ id: "x", statementStrategy: "improvise" }), "x.json"),
    /statementStrategy/,
  );
});

test("E4 roles: decline style differs by pack, decline honesty does not", async () => {
  const g = await graph();
  const a = runTurn(g, createSession(), "What is a flu?", {});
  assert.equal(a.grounded, false);
  assert.match(a.text, /couldn't place/i, "assistant names what it could not place");
  const c = runTurn(g, createSession(), "What is a flu?", { CSKG_CHAT_ROLE: "companion" });
  assert.equal(c.grounded, false, "the companion declines the same empty set");
  assert.match(c.text, /don't know/i, "the companion declines plainly");
});

/* ---------------- Part 3 — person file --------------------------- */

test("E4 person: a stated fact is written to the file and acknowledged in the reply", async () => {
  const g = await graph();
  const { env, dir } = peopleEnv();
  const r = runTurn(g, createSession(), "I live in Chicago.", env);
  assert.match(r.text, /I'll remember that\./, "the write is acknowledged, never silent");
  assert.ok(fs.existsSync(path.join(dir, "sam.json")), "the person file exists");
  const data = loadPersonData(env)!;
  assert.deepEqual(activeFacts(data).map((f) => f.display), ["you live in Chicago"]);
});

test("E4 person: a contradicted single-valued fact is superseded, not silently deleted", async () => {
  const g = await graph();
  const { env } = peopleEnv();
  runTurn(g, createSession(), "I live in Chicago.", env);
  runTurn(g, createSession(), "I live in Denver.", env);
  const data = loadPersonData(env)!;
  assert.deepEqual(activeFacts(data).map((f) => f.object), ["Denver"]);
  assert.equal(data.facts.length, 2, "the superseded fact stays in the person's own record");
  assert.equal(data.facts[0].superseded, true);
});

test("E4 person: a habitual feeling is a standing pattern; a later session re-confirms it", async () => {
  const g = await graph();
  const { env } = peopleEnv();
  const r1 = runTurn(g, createSession(), "I feel tired all the time.", env);
  assert.match(r1.text, /I'll remember that\./, "the pattern write is acknowledged");
  const data = loadPersonData(env)!;
  assert.equal(data.patterns.length, 1);
  assert.equal(data.patterns[0].text, "tired");
  assert.equal(data.patterns[0].sessions, 1);
  runTurn(g, createSession(), "I feel tired all the time.", env);
  assert.equal(loadPersonData(env)!.patterns[0].sessions, 2, "promotion toward last-known: the session count grows");
});

test("E4 person: the state reply is drawn from the state record via ATOMIC", async () => {
  const g = await graph();
  const { env } = peopleEnv();
  const r = runTurn(g, createSession(), "I feel tired all the time.", env);
  assert.equal(r.grounded, true);
  assert.match(r.text, /exhausted|rest/, "the matched event's reaction/want edges answer from the record");
  assert.ok(
    r.trace.steps.some((s) => /state record "tired" keys ATOMIC event/.test(s.detail)),
    "the trace shows ATOMIC consulted from the canonical record",
  );
});

test("E4 person: general mode writes nothing and remembers nothing across sessions", async () => {
  const g = await graph();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-general-"));
  const env: NodeJS.ProcessEnv = { CSKG_CHAT_PEOPLE_DIR: dir };
  runTurn(g, createSession(), "I live in Chicago.", env);
  assert.deepEqual(fs.readdirSync(dir), [], "no person file is created in general mode");
  const recall = runTurn(g, createSession(), "What do you remember about me?", env);
  assert.match(recall.text, /general mode/, "general mode's recall is honestly empty");
});

test("E4 person: recall reads the file back; explicit remember uses the second door", async () => {
  const g = await graph();
  const { env } = peopleEnv();
  const s1: SessionState = createSession();
  runTurn(g, s1, "My name is Sam.", env);
  runTurn(g, s1, "I live in Chicago.", env);
  const recall = runTurn(g, createSession(), "What do you remember about me?", env);
  assert.match(recall.text, /your name is Sam/);
  assert.match(recall.text, /you live in Chicago/);
  const rem = runTurn(g, createSession(), "Remember that my brother likes soup.", env);
  assert.match(rem.text, /I'll remember that\./);
  assert.ok(
    activeFacts(loadPersonData(env)!).some((f) => f.subject === "brother" && f.object === "soup"),
    "the explicitly-remembered fact is in the file",
  );
});

test("E4 person: the companion acknowledges memory in its own voice", async () => {
  const g = await graph();
  const { env } = peopleEnv();
  const r = runTurn(g, createSession(), "I live in Chicago.", { ...env, CSKG_CHAT_ROLE: "companion" });
  assert.match(r.text, /I'll keep that in mind\./);
});

/* ---------------- Part 3 — statement classification -------------- */

test("E4 statements: the soup statement schmoozes — grounded fact plus the slot's follow-up", async () => {
  const g = await graph();
  const r = runTurn(g, createSession(), "I'm making a big pot of soup on Saturday.", {});
  assert.equal(r.grounded, true);
  assert.match(r.text, /Soup is a dish\./);
  assert.match(r.text, /And what made you want to do that\?/,
    "the canonical follow-up, formed from the doing slot");
  assert.ok(
    r.trace.steps.some((s) => /statement classification: schmooze/.test(s.detail)),
    "the classification and its channels are traced",
  );
});

test("E4 classifier: the graph channels flip a bare narrated event — and are traced per channel", async () => {
  const g = await graph();
  const classify = (graphEvidence: boolean) => {
    const ws = createWorkspace(1, "Losing my keys.");
    ws.situation = computeSituation(new Date(2026, 10, 9, 12), {});
    ws.role = loadRolePack({});
    ws.activeContext = { topics: [], lastIntent: "fact" };
    analyseInto(ws, g);
    return classifyStatement(g, ws, EMPTY_CAPTURE, [], graphEvidence);
  };
  const off = classify(false);
  assert.equal(off.kind, "informing", "no utterance cue and no graph evidence: plain informing");
  const on = classify(true);
  assert.equal(on.kind, "schmooze", "the keyed ATOMIC event is a narrated life event");
  assert.ok(on.channels.some((c) => /event-keying/.test(c) && /loses their house keys/.test(c)));
  assert.ok(on.channels.some((c) => /annotation/.test(c) && /xIntent ×1/.test(c)),
    "the xIntent profile is reported as its own channel");
  assert.equal(on.motivationLicensed, true);
});

test("E4 classifier: a stated state is its own class; a referential statement stays informing", async () => {
  const g = await graph();
  // state, captured from the speaker's own words
  const ws = createWorkspace(1, "I'm exhausted.");
  ws.situation = computeSituation(new Date(2026, 10, 9, 12), {});
  ws.role = loadRolePack({});
  ws.activeContext = { topics: [], lastIntent: "fact" };
  analyseInto(ws, g);
  const session = createSession();
  const capture = captureStatement(ws, session, {});
  assert.ok(capture.feeling, "\"I'm exhausted\" lands as a feeling in the state tier");
  assert.equal(classifyStatement(g, ws, capture, [], true).kind, "state");
  // informing control: referential content, no capture, no keying
  const ws2 = createWorkspace(1, "The library is on the corner.");
  ws2.situation = ws.situation;
  ws2.role = ws.role;
  ws2.activeContext = { topics: [], lastIntent: "fact" };
  analyseInto(ws2, g);
  const cls = classifyStatement(g, ws2, EMPTY_CAPTURE, [], true);
  assert.equal(cls.kind, "informing");
  assert.ok(cls.channels.some((c) => /neighbourhood/.test(c) && /referential/.test(c)),
    "the neighbourhood channel reports the referential character it weighed");
});

/* ---------------- Part 4 — EverydaySense, resolver, tuple -------- */

test("E4 everydaysense: cold's everyday default is the illness cluster, by filing mass", async () => {
  const g = await graph();
  const r = defaultReading(g, "cold")!;
  assert.equal(r.clusters.length, 2);
  assert.equal(r.default?.anchorText, "disease");
  assert.equal(r.basis, "filing mass");
  assert.ok(r.default!.share > 0.6, `illness outweighs temperature in cold's own filings (${r.default!.share})`);
});

test("E4 definitions: with context silent, EverydaySense's default decides the sense", async () => {
  const g = await graph();
  const store = buildDefinitionsStore(
    [
      { id: "wn-n90000011", pos: "n", gloss: "the absence of heat", lemmas: ["cold"] },
      { id: "wn-n90000012", pos: "n", gloss: "a mild viral infection involving the nose and respiratory passages", lemmas: ["cold", "common cold"] },
    ],
    { source: "test", edition: "test", license: "test" },
  );
  const choice = chooseDefinition(g, "cold", [], contextFit, store)!;
  assert.equal(choice.chosen.synsetId, "wn-n90000012",
    "the illness gloss leads a bare \"what is a cold?\" — the named case");
  assert.equal(choice.everyday, "disease");
  assert.equal(choice.esDecided, true, "without the channel, extraction order would have led with temperature");
});

const rival = (key: string, score: number, cluster: string | null = null, gravity = false): RivalReading =>
  ({ key, label: key, score, cluster, gravity });

test("E4 resolver: ground 1 — what the person said settles it, even against the score", () => {
  const v = resolveRivalReadings({
    rivals: [rival("monk", 10), rival("sibling", 6)],
    historyKey: "sibling",
    stakes: "question", disposition: "ready", asksUsed: 0, askedLastTurn: false,
  });
  assert.equal(v.action, "answer");
  assert.equal(v.key, "sibling");
  assert.equal(v.ground, "history");
});

test("E4 resolver: a clear score lead answers; a near-tie falls to EverydaySense's default", () => {
  const clear = resolveRivalReadings({
    rivals: [rival("a", 12), rival("b", 4)],
    stakes: "question", disposition: "ready", asksUsed: 0, askedLastTurn: false,
  });
  assert.equal(clear.action, "answer");
  assert.equal(clear.ground, "score");
  const tie = resolveRivalReadings({
    rivals: [rival("a", 10), rival("b", 9.6)],
    everydayKey: "b",
    stakes: "question", disposition: "ready", asksUsed: 0, askedLastTurn: false,
  });
  assert.equal(tie.action, "answer");
  assert.equal(tie.key, "b");
  assert.equal(tie.ground, "everydaysense");
});

test("E4 resolver: escalation asks only when far, questioned, and the budget allows", () => {
  const ask = resolveRivalReadings({
    rivals: [rival("bat-animal", 10, "animal"), rival("bat-club", 9.7, "artifact")],
    stakes: "question", disposition: "ready", asksUsed: 0, askedLastTurn: false,
  });
  assert.equal(ask.action, "ask");
  const secondInRow = resolveRivalReadings({
    rivals: [rival("bat-animal", 10, "animal"), rival("bat-club", 9.7, "artifact")],
    stakes: "question", disposition: "ready", asksUsed: 1, askedLastTurn: true,
  });
  assert.equal(secondInRow.action, "name", "never two asks in a row — the reading taken is named instead");
  const statement = resolveRivalReadings({
    rivals: [rival("bat-animal", 10, "animal"), rival("bat-club", 9.7, "artifact")],
    stakes: "statement", disposition: "ready", asksUsed: 0, askedLastTurn: false,
  });
  assert.equal(statement.action, "name", "a statement's cheap acknowledgement never spends an interruption");
  const gravity = resolveRivalReadings({
    rivals: [rival("a", 10, "x", true), rival("b", 9.7, "y")],
    stakes: "question", disposition: "ready", asksUsed: 0, askedLastTurn: false,
  });
  assert.equal(gravity.action, "answer", "topic gravity settles a close call without asking");
});

test("E4 tuple: the three admissions read off three different axis states", () => {
  assert.equal(admissionFor({ certainty: 0, clarity: 0.9, knownnessFelt: 0 }), "dont-know");
  assert.equal(admissionPhrase("dont-know"), "I don't know");
  assert.equal(admissionFor({ certainty: 0.9, clarity: 0.2, knownnessFelt: 0 }), "not-clear");
  assert.equal(admissionPhrase("not-clear"), "I am not clear");
  assert.equal(admissionFor({ certainty: 0.3, clarity: 0.9, knownnessFelt: 0 }), "unsure");
  assert.equal(admissionPhrase("unsure"), "I am unsure");
  assert.equal(admissionFor({ certainty: 0.9, clarity: 0.9, knownnessFelt: 0.5 }), null);
});

test("E4 clarification: a pending ask resolves before new analysis, by ordinal", async () => {
  const g = await graph();
  const { getDefinitionsStore } = await import("../src/cskg/definitions");
  const cands = getDefinitionsStore().candidatesFor("cold");
  const temp = cands.find((c) => /absence of heat/.test(c.gloss))!;
  const illness = cands.find((c) => /viral infection/.test(c.gloss))!;
  assert.ok(temp && illness, "the real store carries both readings of cold");
  const session = createSession();
  session.pendingClarification = {
    termText: "cold",
    kind: "definition",
    askedTurn: 1,
    branches: [
      { key: temp.synsetId, label: "the absence of heat", synsetId: temp.synsetId, matchWords: ["heat", "temperature"] },
      { key: illness.synsetId, label: "a mild viral infection", synsetId: illness.synsetId, matchWords: ["viral", "infection"] },
    ],
  };
  const r = runTurn(g, session, "The second one.", {});
  assert.match(r.text, /viral infection/, "the pre-mapped branch answers the original question");
  assert.equal(session.settledSenses["cold"], illness.synsetId, "the settled sense goes on record");
  assert.equal(session.pendingClarification, null);
});

test("E4 clarification: an unrelated turn clears the pending ask and proceeds fresh", async () => {
  const g = await graph();
  const session = createSession();
  session.pendingClarification = {
    termText: "cold",
    kind: "definition",
    askedTurn: 1,
    branches: [
      { key: "x", label: "the absence of heat", synsetId: "x", matchWords: ["heat"] },
      { key: "y", label: "a mild viral infection", synsetId: "y", matchWords: ["viral"] },
    ],
  };
  const r = runTurn(g, session, "I'm making a big pot of soup on Saturday.", {});
  assert.equal(session.pendingClarification, null, "the ask is spent");
  assert.match(r.text, /Soup is a dish\./, "the fresh turn is analysed on its own terms");
});
