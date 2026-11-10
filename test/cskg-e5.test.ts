/**
 * cskg-e5.test.ts — E5, the situation model (design §8): event
 * extraction with surface-supported participants, coreference
 * against the model, the four relation families with their
 * attribution stamps (asserted | known | inferred), state
 * tracking, consumption by referring questions, the FrameNet
 * side store (fixture bundle + absent-bundle degradation), and
 * the FrameNet status as a reported setup fact.
 *
 * Its own fixture graph: the soup/brother/tent furniture, a
 * rain→flooding Causes edge the causal family can CHECK
 * against (and a picnic move it cannot), and an ATOMIC-keyed
 * storm for the contents layer's new "event" kind.
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { test } from "node:test";
import { analyseInto } from "../src/cskg/discourse";
import {
  FULL_FRAMENET_COUNTS,
  frameNetStatus,
  frameRoleName,
  framesForVerb,
  loadFramesStore,
} from "../src/cskg/frames";
import { loadCskg, type CskgGraph } from "../src/cskg/loader";
import { createSession, type SessionState } from "../src/cskg/memory";
import { collectSetupFacts, decideSetup } from "../src/cskg/setup";
import {
  causalTestimony,
  mentionWords,
  mentionsWord,
  resolvePronoun,
} from "../src/cskg/situation";
import { runTurn } from "../src/cskg/turn";
import { createWorkspace } from "../src/cskg/workspace";

const HEADER =
  "id\tnode1\trelation\tnode2\tnode1;label\tnode2;label\trelation;label\trelation;dimension\tsource\tsentence";

function row(n1: string, rel: string, n2: string, src: string): string {
  return ["x", n1, rel, n2, "", "", "", "", src, ""].join("\t");
}

const ROWS = [
  row("/c/en/renovated", "/r/FormOf", "/c/en/renovate", "CN"),
  row("/c/en/soup", "/r/IsA", "/c/en/food", "CN"),
  row("/c/en/saturday", "/r/IsA", "/c/en/day", "CN"),
  row("/c/en/brother", "/r/IsA", "/c/en/man", "CN"),
  row("/c/en/man", "/r/IsA", "/c/en/person", "CN"),
  row("/c/en/girlfriend", "/r/IsA", "/c/en/woman", "CN"),
  row("/c/en/woman", "/r/IsA", "/c/en/person", "CN"),
  row("/c/en/sister", "/r/IsA", "/c/en/woman", "CN"),
  row("/c/en/rain", "/r/IsA", "/c/en/weather", "CN"),
  row("/c/en/rain", "/r/Causes", "/c/en/flooding", "CN"),
  row("/c/en/flooding", "/r/IsA", "/c/en/flood", "CN"),
  row("/c/en/garden", "/r/IsA", "/c/en/place", "CN"),
  row("/c/en/picnic", "/r/IsA", "/c/en/activity", "CN"),
  row("/c/en/tent", "/r/IsA", "/c/en/shelter", "CN"),
  row("/c/en/dinner", "/r/IsA", "/c/en/meal", "CN"),
  row("/c/en/storm", "at:xEffect", "/c/en/wet", "AT"),
];

let graphPromise: Promise<CskgGraph> | null = null;
function graph(): Promise<CskgGraph> {
  if (!graphPromise) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-e5-fixture-"));
    const file = path.join(dir, "fixture.tsv");
    fs.writeFileSync(file, [HEADER, ...ROWS].join("\n") + "\n");
    graphPromise = loadCskg(file);
  }
  return graphPromise;
}

const FIXTURE_FRAMENET = path.join(__dirname, "..", "..", "test", "fixtures", "framenet");

function say(g: CskgGraph, s: SessionState, input: string): string {
  return runTurn(g, s, input).text;
}

/* ---------------- E5a: extraction ---------------- */

test("E5a: a doing statement builds an event with surface-supported participants", async () => {
  const g = await graph();
  const s = createSession();
  say(g, s, "I'm making a big pot of soup on Saturday.");
  const model = s.situation;
  assert.equal(model.events.length, 1, "one event recorded");
  const ev = model.events[0];
  assert.equal(ev.verbLemma, "make");
  assert.match(ev.timeText ?? "", /Saturday/);
  const byRole = (role: string): string[] =>
    ev.participants
      .filter((p) => p.role === role)
      .map((p) => model.entities.find((e) => e.id === p.entityId)?.label ?? "?");
  const actor = byRole("actor");
  assert.equal(actor.length, 1);
  assert.ok(
    model.entities.find((e) => e.label === actor[0])?.speaker,
    "the actor is the speaker entity",
  );
  const objects = ev.participants.filter((p) => p.role === "object");
  const container = objects.find((p) => p.part === "container");
  const content = objects.find((p) => p.part === "content");
  assert.ok(container, "the pot is a participant, as the container");
  assert.ok(content, "the soup is a participant, as the content");
  assert.equal(
    model.entities.find((e) => e.id === content!.entityId)?.label,
    "soup",
  );
  // no invented participants: nothing beyond what the surface gave
  assert.ok(
    ev.participants.every((p) => ["actor", "object", "time"].includes(p.role)),
    "only actor/object/time roles — no recipient or instrument was stated, none appears",
  );
});

test("E5a: per-turn derivation keys a happening outside the hand verb list", async () => {
  const g = await graph();
  const s = createSession();
  say(g, s, "I renovated the kitchen.");
  const model = s.situation;
  const ev = model.events.find((e) => e.verbLemma === "renovate");
  assert.ok(ev, "renovated keys an event via the graph FormOf testimony, not the hand list");
  assert.match(ev!.objectText ?? "", /kitchen/);
  const actorPid = ev!.participants.find((p) => p.role === "actor");
  const actor = model.entities.find((e) => e.id === actorPid?.entityId);
  assert.ok(actor?.speaker, "the stated actor is the speaker");
});

test("E5a: the contents kind set gained 'event' — an ATOMIC-keyed mention is one", async () => {
  const g = await graph();
  const ws = createWorkspace(1, "The storm came.");
  analyseInto(ws, g);
  const contents = ws.breakdown?.contents;
  assert.ok(contents, "contents computed");
  assert.ok(
    contents!.events.some((e) => e.text === "storm"),
    "storm is categorised as an event (it carries at: edges), dually with thing",
  );
});

/* ---------------- E5a: coreference / identity ---------------- */

test("E5a: pronouns resolve against the model; one entity per referent", async () => {
  const g = await graph();
  const s = createSession();
  say(g, s, "My brother is bringing his new girlfriend.");
  const model = s.situation;
  const brothers = model.entities.filter((e) => e.label === "your brother");
  assert.equal(brothers.length, 1, "one entity for the brother");
  assert.equal(brothers[0].relationToSpeaker, "brother");
  const ev = model.events.find((e) => e.verbLemma === "bring");
  assert.ok(ev, "the bringing was recorded as an event");
  assert.ok(
    ev!.participants.some((p) => p.role === "actor" && p.entityId === brothers[0].id),
    "the brother is the event's actor",
  );
  const he = resolvePronoun(model, "he", 2);
  assert.equal(he.entityId, brothers[0].id, "\"he\" lands on the brother");
  // a later question mentioning him again does not duplicate him
  say(g, s, "What is he bringing?");
  assert.equal(
    s.situation.entities.filter((e) => e.label === "your brother").length,
    1,
    "still one brother entity after the pronoun turn",
  );
});

test("E5a: a repeated name lands on the same entity", async () => {
  const g = await graph();
  const s = createSession();
  say(g, s, "Sarah is my sister.");
  say(g, s, "Sarah likes soup.");
  const sarahs = s.situation.entities.filter((e) => e.label === "sarah");
  assert.equal(sarahs.length, 1);
  assert.ok(
    sarahs[0].surfaces.length >= 1 && sarahs[0].relationToSpeaker === "sister",
    "the same Sarah carries the stated relation",
  );
});

/* ---------------- E5 consumption ---------------- */

test("E5 consumption: the soup follow-ups answer from the model", async () => {
  const g = await graph();
  const s = createSession();
  say(g, s, "I'm making a big pot of soup Saturday.");
  assert.match(say(g, s, "What are you making?"), /making a big pot of soup/);
  assert.match(say(g, s, "When is it?"), /Saturday/);
  assert.match(say(g, s, "What's in it?"), /[Ss]oup/);
});

test("E5 consumption: who is he bringing — the event's object, as stated", async () => {
  const g = await graph();
  const s = createSession();
  say(g, s, "My brother is bringing his new girlfriend.");
  assert.match(say(g, s, "What is he bringing?"), /bringing his new girlfriend/);
  assert.match(say(g, s, "Who is he bringing?"), /His new girlfriend/);
});

/* ---------------- E5b: temporal ---------------- */

test("E5b temporal: an explicitly sequenced telling is asserted; order questions use it", async () => {
  const g = await graph();
  const s = createSession();
  say(g, s, "First we set up the tent, then we cooked dinner.");
  const model = s.situation;
  assert.ok(model.events.length >= 2, "both happenings recorded");
  const rel = model.relations.find(
    (r) => r.family === "temporal" && r.kind === "before",
  );
  assert.ok(rel, "a before relation exists");
  assert.equal(rel!.attribution, "asserted",
    "the person sequenced them with 'then' — asserted, not inferred");
  assert.match(say(g, s, "Which happened first?"), /First: set up the tent/);
});

/* ---------------- E5b: causal ---------------- */

test("E5b causal: CSKG testimony is checkable, and a checked link stamps known", async () => {
  const g = await graph();
  const rain = g.id("rain")!;
  const flooding = g.id("flooding")!;
  const hit = causalTestimony(g, [rain], [flooding]);
  assert.ok(hit, "the fixture's rain —Causes→ flooding is found");
  assert.match(hit!.edge, /Causes/);
  assert.equal(causalTestimony(g, [rain], [g.id("picnic")!]), null,
    "no testimony is invented for a pair the graph does not link");

  const s = createSession();
  say(g, s, "The rain flooded the garden.");
  const rel = s.situation.relations.find((r) => r.family === "causal");
  assert.ok(rel, "the flood event's causal link was recorded");
  assert.equal(rel!.attribution, "known",
    "graph-checked testimony upgrades the stamp to known");
  assert.match(say(g, s, "Why is the garden flooded?"), /graph backs/);
});

test("mention matching: function words never count, substrings never count", () => {
  assert.deepEqual(mentionWords("moved the picnic indoors"), ["moved", "picnic", "indoors"]);
  assert.ok(!mentionWords("why is paint peeling off the walls?").includes("the"),
    "the commonest word in the question is never offered as a mention");
  assert.equal(mentionsWord("why is paint peeling off the walls?", "peeling"), true);
  assert.equal(mentionsWord("the weather is nice", "eat"), false,
    "eat does not match inside weather");
  assert.equal(mentionsWord("they met because of the rain", "rain"), true);
});

test("E5b causal: a stated because-of the graph cannot check stays asserted, and says so", async () => {
  const g = await graph();
  const s = createSession();
  say(g, s, "It's raining.");
  say(g, s, "We moved the picnic indoors because of the rain.");
  const rel = s.situation.relations.find((r) => r.family === "causal");
  assert.ok(rel, "the because-of link was recorded");
  assert.equal(rel!.attribution, "asserted");
  assert.match(rel!.note, /unchecked|no Causes testimony/);
  const why = say(g, s, "Why did we move the picnic?");
  assert.match(why, /reason you gave/);
  assert.match(why, /graph itself doesn't record/);
});

test("E5b causal: a bare Why? answers from the standing event first", async () => {
  const g = await graph();
  const s = createSession();
  say(g, s, "It's raining.");
  say(g, s, "We moved the picnic indoors because of the rain.");
  assert.match(say(g, s, "Why?"), /that's the reason you gave/,
    "the model's asserted causal link outranks the topic fallback");
});

/* ---------------- E5b: social ---------------- */

test("E5b social: a stated relation is the model's, attributed asserted", async () => {
  const g = await graph();
  const s = createSession();
  say(g, s, "Sarah is my sister.");
  const model = s.situation;
  const sarah = model.entities.find((e) => e.label === "sarah");
  assert.ok(sarah);
  const rel = model.relations.find(
    (r) => r.family === "social" && r.kind === "isRelativeOf" && r.from === sarah!.id,
  );
  assert.ok(rel, "isRelativeOf recorded");
  assert.equal(rel!.attribution, "asserted");
  assert.match(say(g, s, "Who is Sarah?"), /your sister/);
});

/* ---------------- E5b: state tracking ---------------- */

test("E5b state: a changed feeling supersedes the old state, as an event", async () => {
  const g = await graph();
  const s = createSession();
  say(g, s, "I feel tired today.");
  say(g, s, "I feel much better now.");
  const model = s.situation;
  const tired = model.states.find((st) => st.text === "tired");
  const better = model.states.find((st) => st.text === "better");
  assert.ok(tired && better, "both states are on record");
  assert.ok(tired!.supersededBy, "the tired state was superseded");
  assert.equal(better!.supersededBy, null, "the better state is the live one");
  const rel = model.relations.find(
    (r) => r.family === "state-change" && r.kind === "supersedes",
  );
  assert.ok(rel, "a supersedes relation links them");
  assert.equal(rel!.attribution, "asserted");
  const answer = say(g, s, "How am I feeling?");
  assert.match(answer, /better/);
  assert.match(answer, /tired/);
});

/* ---------------- frames.ts: the side store ---------------- */

test("E5 frames: the fixture bundle loads by the same code path and names roles", () => {
  const store = loadFramesStore(FIXTURE_FRAMENET);
  assert.ok(store, "fixture bundle loads");
  assert.equal(store!.status, "fixture-only");
  assert.equal(store!.counts.frames, 5);
  const buy = framesForVerb(store!, "buy");
  assert.ok(buy && buy.length > 0, "buy evokes a frame");
  assert.equal(buy![0].name, "Commerce_buy");
  assert.equal(frameRoleName(buy![0], "actor"), "Buyer");
  assert.equal(frameRoleName(buy![0], "object"), "Goods");
  assert.equal(frameRoleName(buy![0], "instrument"), "Means",
    "Commerce_buy's Means element names the instrument role");
  const weather = framesForVerb(store!, "storm");
  assert.ok(weather && weather.length > 0, "storm evokes the Weather frame");
  assert.equal(frameRoleName(weather![0], "actor"), null,
    "a role the frame has no element for stays generic (null), never invented");
});

test("E5 frames: an absent bundle degrades to null and 'absent' — never an error", () => {
  const missing = path.join(os.tmpdir(), "cskg-e5-no-such-framenet-dir");
  assert.equal(loadFramesStore(missing), null);
  assert.equal(frameNetStatus(missing), "absent");
  assert.equal(frameNetStatus(FIXTURE_FRAMENET), "fixture-only");
  assert.deepEqual(FULL_FRAMENET_COUNTS, {
    frames: 1019,
    frameElements: 9634,
    lexicalUnits: 11942,
    frameRelations: 1676,
  });
});

/* ---------------- setup: the reported FrameNet fact ---------------- */

test("E5 setup: FrameNet status is a reported fact, never a setup blocker", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-e5-setup-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const dataPath = path.join(dir, "data.tsv");
  fs.writeFileSync(dataPath, "x");
  const facts = collectSetupFacts(dataPath, undefined, FIXTURE_FRAMENET);
  assert.equal(facts.framenet, "fixture-only");
  const absent = collectSetupFacts(
    dataPath, undefined, path.join(dir, "no-framenet"));
  assert.equal(absent.framenet, "absent");
  // the decision itself is unchanged by the FrameNet fact:
  // data + cache decide, FrameNet only reports
  assert.equal(
    decideSetup({ data: { exists: true, sizeBytes: 10 }, cache: "current", framenet: "absent" }).action,
    decideSetup({ data: { exists: true, sizeBytes: 10 }, cache: "current", framenet: "full" }).action,
  );
});
