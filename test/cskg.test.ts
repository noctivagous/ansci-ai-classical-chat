/**
 * cskg.test.ts — spike tests over a tiny hand-written TSV fixture.
 * The fixture exercises: normalisation (WordNet-sensed ids, ATOMIC
 * personx events), support counting across datasets, longest-match
 * resolution, statement grounding, trace replay, correction, and the
 * situation core's hemisphere rule (December: north winter / south
 * summer — never month→season alone).
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { test } from "node:test";
import { sentenceForEdge } from "../src/cskg/articulate";
import { seasonFor } from "../src/cskg/awareness";
import { analyseInto, matchEventTemplate, resolveTerms } from "../src/cskg/discourse";
import { loadCskg, normaliseNode, type CskgGraph } from "../src/cskg/loader";
import { createSession } from "../src/cskg/memory";
import { appendTraceRecord, buildTraceRecord } from "../src/cskg/tracefile";
import { runTurn } from "../src/cskg/turn";
import { createWorkspace } from "../src/cskg/workspace";

const HEADER =
  "id\tnode1\trelation\tnode2\tnode1;label\tnode2;label\trelation;label\trelation;dimension\tsource\tsentence";

function row(n1: string, rel: string, n2: string, src: string): string {
  return ["x", n1, rel, n2, "", "", "", "", src, ""].join("\t");
}

const ROWS = [
  row("/c/en/banana", "/r/IsA", "/c/en/fruit", "CN"),
  row("/c/en/banana", "/r/IsA", "/c/en/fruit", "WN"), // second dataset -> support 2
  row("/c/en/banana", "/r/HasProperty", "/c/en/yellow", "CN"),
  row("/c/en/brown_banana", "/r/HasProperty", "/c/en/sweet", "CN"),
  row("/c/en/onion", "/r/Causes", "/c/en/crying", "CN"),
  row("/c/en/corkscrew", "/r/UsedFor", "/c/en/open_wine_bottles", "CN"),
  row("/c/en/wine_bottle", "/r/MadeOf", "/c/en/glass", "CN"),
  row("/c/en/soup", "/r/IsA", "/c/en/food", "CN"),
  row("/c/en/soup", "/r/AtLocation", "/c/en/bowl", "CN"),
  row("/c/en/common_cold", "/r/IsA", "/c/en/illness", "CN"),
  row("at:personx_chops_onions", "at:xEffect", "/c/en/cry", "AT"),
  row("/c/en/coat/n/wn/artifact", "/r/UsedFor", "/c/en/keep_warm", "CN"),
  // E2 discourse fixtures: a rival sense node for bananas (the film),
  // an ordinal with a multiply-attested fact, and a coordination
  // whose joint node exists in the vocabulary.
  row("/c/en/bananas", "/r/IsA", "/c/en/film", "WN"),
  row("/c/en/banana", "/r/IsA", "/c/en/food", "CN"),
  row("/c/en/banana", "/r/HasProperty", "/c/en/sweet", "CN"),
  row("/c/en/banana", "/r/AtLocation", "/c/en/bowl", "CN"),
  row("/c/en/banana", "/r/HasA", "/c/en/peel", "CN"),
  row("/c/en/banana", "/r/HasA", "/c/en/peel", "WN"), // support 2
  row("/c/en/third", "/r/IsA", "/c/en/echelon", "CN"),
  row("/c/en/third", "/r/IsA", "/c/en/echelon", "WN"), // support 2
  row("/c/en/day", "/r/IsA", "/c/en/period", "CN"),
  row("/c/en/rain", "/r/IsA", "/c/en/precipitation", "CN"),
  row("/c/en/rain", "/r/IsA", "/c/en/precipitation", "WN"), // support 2
  row("/c/en/rain", "/r/HasProperty", "/c/en/wet", "CN"),
  row("/c/en/snow", "/r/HasProperty", "/c/en/wet", "CN"),
  row("/c/en/rain_and_snow", "/r/IsA", "/c/en/weather", "CN"),
  // E3 solve fixtures: a second direct tool for the wine bottle
  // (so the exclusion test has something left after DIFFERENCE),
  // a merged node with rival IsA senses (the brother case: support
  // alone picks the monk; context — the girlfriend's world —
  // must arbitrate for the sibling), a UsedFor slot with one
  // zero-affinity member (the coat / catch-pigeons floor case),
  // a day name for the contents breakdown, and an event node with
  // a consequence edge (the rains case).
  row("/c/en/bottle_opener", "/r/UsedFor", "/c/en/open_wine_bottles", "WN"),
  row("/c/en/brother", "/r/IsA", "/c/en/monk", "CN"),
  row("/c/en/brother", "/r/IsA", "/c/en/monk", "WN"), // support 2
  row("/c/en/brother", "/r/IsA", "/c/en/sibling", "CN"),
  row("/c/en/brother", "/r/IsA", "/c/en/male", "CN"),
  row("/c/en/sibling", "/r/RelatedTo", "/c/en/family", "CN"),
  row("/c/en/girlfriend", "/r/RelatedTo", "/c/en/family", "CN"),
  row("/c/en/sibling", "/r/RelatedTo", "/c/en/relationship", "CN"),
  row("/c/en/girlfriend", "/r/RelatedTo", "/c/en/relationship", "CN"),
  row("/c/en/coat", "/r/UsedFor", "/c/en/keep_body_warm", "CN"),
  row("/c/en/coat", "/r/UsedFor", "/c/en/catch_pigeons", "CN"),
  row("/c/en/coat", "/r/UsedFor", "/c/en/wearing", "CN"),
  row("/c/en/coat", "/r/RelatedTo", "/c/en/winter", "CN"),
  row("/c/en/keep_warm", "/r/RelatedTo", "/c/en/winter", "CN"),
  row("/c/en/keep_body_warm", "/r/RelatedTo", "/c/en/winter", "CN"),
  row("/c/en/wearing", "/r/RelatedTo", "/c/en/winter", "CN"),
  row("/c/en/saturday", "/r/IsA", "/c/en/day", "CN"),
  row("/c/en/rains", "/r/HasSubevent", "/c/en/things_get_wet", "CN"),
];

let graphPromise: Promise<CskgGraph> | null = null;
function graph(): Promise<CskgGraph> {
  if (!graphPromise) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-fixture-"));
    const file = path.join(dir, "fixture.tsv");
    fs.writeFileSync(file, [HEADER, ...ROWS].join("\n") + "\n");
    graphPromise = loadCskg(file);
  }
  return graphPromise;
}

test("normaliseNode strips prefixes, senses and personx", () => {
  assert.equal(normaliseNode("/c/en/wine_bottle"), "wine bottle");
  assert.equal(normaliseNode("/c/en/coat/n/wn/artifact"), "coat");
  assert.equal(normaliseNode("at:personx_chops_onions"), "chops onions");
  assert.equal(normaliseNode("/c/fr/banane"), null);
  assert.equal(normaliseNode("/c/en/83/a/wn"), null);
});

test("loader dedups rows and counts dataset support", async () => {
  const g = await graph();
  const banana = g.id("banana")!;
  const fruit = g.id("fruit")!;
  const isa = g.outEdges(banana, "/r/IsA").filter((e) => e.to === fruit);
  assert.equal(isa.length, 1, "the CN and WN rows dedup to one edge");
  assert.equal(isa[0].support, 2);
  assert.deepEqual(isa[0].sources, ["CN", "WN"]);
});

test("longest match wins: brown banana over banana", async () => {
  const g = await graph();
  const found = resolveTerms(g, "my brown bananas are too ripe");
  assert.ok(found.some((f) => f.text === "brown banana"));
});

test("statement turn answers with a grounded fact, never a bare decline", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "I'm making a big pot of soup on Saturday.");
  assert.equal(r.grounded, true);
  assert.match(r.text, /soup/i);
  assert.ok(r.trace.conclusions.length >= 1);
});

test("tool question finds the corkscrew via reverse UsedFor", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "What can I open a wine bottle with?");
  assert.equal(r.grounded, true);
  assert.match(r.text, /corkscrew/i);
  assert.match(r.text, /bottle opener/i);
  assert.doesNotMatch(r.text, /related terms/, "direct route: no fallback disclosure");
});

test("E3: an exclusion removes the excluded tool from its own answer (DIFFERENCE)", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "What can I open a wine bottle with if I don't have a corkscrew?");
  assert.equal(r.grounded, true);
  assert.match(r.text, /bottle opener/i, "the remaining tool answers");
  assert.doesNotMatch(r.text, /corkscrew/i, "the excluded tool is absent from its own answer");
  assert.ok(
    r.trace.steps.some((st) => st.kind === "triage" && /difference/.test(st.detail)),
    "the trace records the triage and the difference",
  );
});

test("why did you say that replays the trace", async () => {
  const g = await graph();
  const s = createSession();
  runTurn(g, s, "What is a banana?");
  const r = runTurn(g, s, "Why did you say that?");
  assert.equal(r.trace.intent, "replay");
  assert.match(r.text, /banana —\/r\/IsA→ fruit/);
});

test("correction re-resolves to the corrected term", async () => {
  const g = await graph();
  const s = createSession();
  runTurn(g, s, "What is a banana?");
  const r = runTurn(g, s, "No, I meant the common cold");
  assert.equal(r.trace.intent, "correction");
  assert.match(r.text, /common cold/i);
});

test("season is a function of (date, hemisphere), never of the month alone", () => {
  const dec = new Date(2026, 11, 15);
  assert.equal(seasonFor(dec, { name: "Chicago", hemisphere: "north", band: "temperate" }), "winter");
  assert.equal(seasonFor(dec, { name: "Sydney", hemisphere: "south", band: "temperate" }), "summer");
  assert.equal(seasonFor(dec, { name: "Nowhere" }), null);
  assert.equal(seasonFor(dec, null), null);
});

test("situation question hedges when no location is configured", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "What season is it?", {});
  assert.match(r.text, /don't know where I am/i);
});

test("E2: coordination splits into two mentions, never one swallowed topic", async () => {
  const g = await graph();
  const ws = createWorkspace(0, "How are rain and snow related?");
  analyseInto(ws, g);
  const bd = ws.breakdown!;
  const rain = bd.mentions.find((m) => m.text === "rain");
  const snow = bd.mentions.find((m) => m.text === "snow");
  assert.ok(rain && snow, "both conjuncts are mentions");
  assert.equal(rain.splitFrom, "rain and snow");
  assert.equal(snow.splitFrom, "rain and snow");
  assert.equal(rain.phrase, snow.phrase, "conjuncts share a phrase");
  assert.ok(rain.coordinatedWith.length === 1 && snow.coordinatedWith.length === 1);
  const joint = g.id("rain and snow")!;
  assert.notEqual(rain.candidates[rain.chosen].id, joint);
  assert.notEqual(snow.candidates[snow.chosen].id, joint);
  assert.ok(!bd.topics.some((t) => t.id === joint), "joint node is never a topic");
});

test("E2: an ordinal mention cannot outscore the noun it modifies", async () => {
  const g = await graph();
  const ws = createWorkspace(0, "It's the third day of rain here.");
  analyseInto(ws, g);
  const bd = ws.breakdown!;
  const third = bd.mentions.find((m) => m.text === "third");
  assert.ok(third, "third is a mention");
  assert.equal(third.role, "modifier");
  assert.equal(bd.topics[0].text, "rain", "rain is the top-ranked topic");
  const s = createSession();
  const r = runTurn(g, s, "It's the third day of rain here.");
  assert.equal(r.grounded, true);
  assert.match(r.text, /precipitation/);
  assert.doesNotMatch(r.text, /echelon/);
});

test("E2: bananas — the fruit sense beats the film sense in a food conversation", async () => {
  const g = await graph();
  const ws = createWorkspace(0, "My bananas have gone all brown.");
  ws.activeContext = { topics: [g.id("soup")!], lastIntent: "statement" };
  analyseInto(ws, g);
  const mention = ws.breakdown!.mentions.find((m) => m.text === "bananas");
  assert.ok(mention, "bananas is a mention");
  assert.equal(mention.candidates.length, 2, "both sense nodes are candidates");
  assert.equal(mention.candidates[mention.chosen].text, "banana");
  const s = createSession();
  runTurn(g, s, "I'm making a big pot of soup on Saturday.");
  const r = runTurn(g, s, "My bananas have gone all brown.");
  assert.equal(r.grounded, true);
  assert.match(r.text, /fruit/);
  assert.doesNotMatch(r.text, /film/);
});

test("E3 contents: mentions are categorised into people, places, things, times", async () => {
  const g = await graph();
  const ws = createWorkspace(0, "My brother is bringing his new girlfriend on Saturday.");
  analyseInto(ws, g);
  const c = ws.breakdown!.contents;
  assert.ok(c, "the contents breakdown is recorded on the breakdown");
  assert.ok(c.people.some((e) => e.text === "brother"), "brother is a person (IsA→ sibling anchor)");
  assert.ok(c.times.some((e) => e.text.includes("saturday")), "saturday is a time (day name)");
  assert.ok(c.entries.length >= 3, "the turn's contents are itemised");
  for (const e of c.entries) {
    assert.ok(e.kinds.length >= 1 && e.chosen.length >= 1, "every entry carries its scored kinds (defeasible record)");
  }
  assert.ok(
    ws.trace.steps.some((st) => /contents:/.test(st.detail)),
    "kind choices are recorded in the trace",
  );
});

test("E3: within-node fact choice — context beats support (brother is a sibling, not a monk)", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "My brother is bringing his new girlfriend.");
  assert.equal(r.grounded, true);
  assert.match(r.text, /sibling/);
  assert.doesNotMatch(r.text, /monk/);
});

test("E3: ranking floor — a zero-affinity use is not featured when better-connected ones fill the slot", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "What is a coat used for?");
  assert.equal(r.grounded, true);
  assert.match(r.text, /keep warm/);
  assert.doesNotMatch(r.text, /pigeons/, "catch pigeons shares no neighbours with coat and is ranked out");
});

test("E3: why-question with an empty causal set declines, naming the missing causation", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "Why is the soup hot?");
  assert.equal(r.grounded, false);
  assert.match(r.text, /doesn't record a cause for "soup"/);
  assert.ok(r.trace.steps.some((st) => st.kind === "triage"), "triage is recorded");
});

test("E3: a causal edge between two mentioned terms still answers a why-question", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "Why does the onion cause crying?");
  assert.equal(r.grounded, true);
  assert.match(r.text, /Onion can cause crying/);
});

test("E3: with a when-clause, causation must land on the stated effect — a stray Causes edge does not answer", async () => {
  const g = await graph();
  const s = createSession();
  // the fixture graph HAS onion —Causes→ crying, but the question
  // asks about eyes watering: the edge does not land on the stated
  // effect side, so the empty-set rule declines (the onion gate).
  const r = runTurn(g, s, "Why do my eyes water when I chop onions?");
  assert.equal(r.grounded, false);
  assert.match(r.text, /doesn't record that causation/);
  assert.doesNotMatch(r.text, /crying/);
});

test("E3: 'what happens when X?' is answered from the event node's consequence edges", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "What happens when it rains?");
  assert.equal(r.grounded, true);
  assert.match(r.text, /Rains involves things get wet/);
});

/* ---------------- depth pass fixtures ---------------------------
 * A second, separate fixture graph for the depth pass (§8):
 * the sentence bank (a bracketed CN assertion on the banana's
 * HasA edge, plus a sentence-less duplicate row to test the
 * dedupe adoption), HasContext and FormOf side rows, ATOMIC
 * template events keyed as PersonX templates, and a subevent
 * sequence on "storm".
 */

function rowS(n1: string, rel: string, n2: string, src: string, sentence: string): string {
  return ["x", n1, rel, n2, "", "", "", "", src, sentence].join("\t");
}

const DEPTH_ROWS = [
  rowS("/c/en/banana", "/r/HasA", "/c/en/peel", "CN", "[[A banana]] has [[a peel]]"),
  row("/c/en/banana", "/r/HasA", "/c/en/peel", "WN"), // duplicate: sentence adopted, support 2
  rowS("/c/en/banana", "/r/IsA", "/c/en/fruit", "CN", "[[banana]] is a kind of [[melon]]"), // brackets lie: rejected
  rowS("/c/en/orange", "/r/HasA", "/c/en/segments", "CN", "[[An orange]] has [[segments]]"),
  row("/c/en/brother", "/r/IsA", "/c/en/sibling", "CN"),
  row("/c/en/brother", "/r/HasContext", "/c/en/religion", "CN"),
  row("/c/en/lose", "/r/Synonym", "/c/en/misplace", "CN"),
  row("at:personx_loses_their_house_keys", "at:xReact", "/c/en/frustrated", "AT"),
  row("at:personx_loses_their_house_keys", "at:xReact", "/c/en/upset", "AT"),
  row("at:personx_apologizes", "at:xIntent", "/c/en/make_amends", "AT"),
  row("at:personx_apologizes", "at:oReact", "/c/en/forgiving", "AT"),
  row("/c/en/apologizes", "/r/FormOf", "/c/en/apologize", "CN"),
  // "apologize" as a term in its own right (as in the real graph):
  // without it discourse's empty-knowledge gate declines the
  // intent question before solve ever runs.
  row("/c/en/apologize", "/r/IsA", "/c/en/act", "CN"),
  // a term with no event template and no presentable fact: the
  // no-match decline case
  row("/c/en/juggle", "/r/RelatedTo", "/c/en/circus", "CN"),
  // the coverage-rule case: an event sharing only the generic
  // word "sleep" with a "can't sleep" question
  row("at:personx_lets_persony_sleep", "at:xWant", "/c/en/rest", "AT"),
  row("/c/en/storm", "/r/HasFirstSubevent", "/c/en/wind_picks_up", "CN"),
  row("/c/en/storm", "/r/HasSubevent", "/c/en/rain_falls", "CN"),
  row("/c/en/storm", "/r/HasLastSubevent", "/c/en/skies_clear", "CN"),
  row("/c/en/storm", "/r/Causes", "/c/en/flooding", "CN"),
];

let depthPromise: Promise<CskgGraph> | null = null;
function depthGraph(): Promise<CskgGraph> {
  if (!depthPromise) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-depth-"));
    const file = path.join(dir, "fixture.tsv");
    fs.writeFileSync(file, [HEADER, ...DEPTH_ROWS].join("\n") + "\n");
    depthPromise = loadCskg(file);
  }
  return depthPromise;
}

test("depth: the loader retains the sentence column per edge and counts the side stores", async () => {
  const g = await depthGraph();
  const banana = g.id("banana")!;
  const hasa = g.outEdges(banana, "/r/HasA");
  assert.equal(hasa.length, 1, "CN and WN rows still dedup to one edge");
  assert.equal(hasa[0].support, 2);
  assert.equal(hasa[0].sentence, "[[A banana]] has [[a peel]]",
    "the first non-empty sentence is adopted across the dedupe");
  assert.equal(g.stats!.sentencesKept, 3, "every sentence row is retained");
  assert.equal(g.stats!.contextTerms, 1, "HasContext lands in the side store");
  assert.equal(g.stats!.formRows, 1, "FormOf lands in the side store");
  // the side relations never became edges
  const brother = g.id("brother")!;
  assert.equal(g.outEdges(brother, "/r/HasContext").length, 0);
  const apologizes = g.id("apologizes")!;
  assert.ok(g.outEdges(apologizes).every((e) => e.rel !== "/r/FormOf"));
});

test("depth: contextsOf and lemmaOf read the side stores", async () => {
  const g = await depthGraph();
  assert.deepEqual(g.contextsOf(g.id("brother")!), ["religion"]);
  assert.equal(g.lemmaOf("apologizes"), "apologize");
  assert.equal(g.lemmaOf("banana"), undefined);
});

test("depth: the contents breakdown records HasContext evidence in the trace", async () => {
  const g = await depthGraph();
  const s = createSession();
  const r = runTurn(g, s, "My brother is coming over.");
  assert.ok(
    r.trace.steps.some((st) => /contexts: religion/.test(st.detail)),
    "the brother entry carries its HasContext tag into the trace",
  );
});

test("depth: the sentence bank renders the dataset's own sentence when brackets match", async () => {
  const g = await depthGraph();
  const banana = g.id("banana")!;
  const hasa = g.outEdges(banana, "/r/HasA")[0];
  assert.equal(sentenceForEdge(g, hasa), "A banana has a peel.",
    "markup stripped, capitalised, punctuated");
  const s = createSession();
  const r = runTurn(g, s, "Tell me about the orange.");
  assert.equal(r.grounded, true);
  assert.match(r.text, /An orange has segments\./);
  assert.ok(
    r.trace.steps.some((st) => /render paths: .*via sentence/.test(st.detail)),
    "the trace logs the sentence path",
  );
});

test("depth: a sentence whose brackets do not match the endpoints is not used", async () => {
  const g = await depthGraph();
  const banana = g.id("banana")!;
  const isa = g.outEdges(banana, "/r/IsA")[0];
  assert.equal(sentenceForEdge(g, isa), null,
    "the sentence claims 'melon'; the edge says 'fruit' — the bank refuses it");
});

test("depth: template matching keys a paraphrased feeling question to the ATOMIC event", async () => {
  const g = await depthGraph();
  const res = matchEventTemplate(g, "how do people feel when they lose their keys".split(" "));
  assert.ok(res.match, "a match above threshold");
  assert.equal(res.match!.text, "loses their house keys");
  assert.ok(res.match!.matched.some((p) => p.utterance === "lose" && p.via === "form"),
    "lose reaches loses by form");
  const s = createSession();
  const r = runTurn(g, s, "How do people feel when they lose their keys?");
  assert.equal(r.grounded, true);
  assert.match(r.text, /frustrated/);
  assert.ok(
    r.trace.steps.some((st) => /event template match/.test(st.detail)),
    "the match is recorded in the trace",
  );
  assert.ok(
    r.trace.steps.some((st) => /lose → misplace \(synonym\)/.test(st.detail)),
    "the synonym expansion step is recorded in the trace",
  );
});

test("depth: intent questions reach the matched event's xIntent edges", async () => {
  const g = await depthGraph();
  const s = createSession();
  const r = runTurn(g, s, "What do people intend when they apologize?");
  assert.equal(r.grounded, true);
  assert.match(r.text, /make amends/);
});

test("depth: subevent chains compose in attested order — first, middle, last", async () => {
  const g = await depthGraph();
  const s = createSession();
  const r = runTurn(g, s, "What happens when there is a storm?");
  assert.equal(r.grounded, true);
  const first = r.text.indexOf("wind picks up");
  const middle = r.text.indexOf("rain falls");
  const last = r.text.indexOf("skies clear");
  assert.ok(first >= 0 && middle > first && last > middle,
    `ordered first → middle → last: ${r.text}`);
  assert.doesNotMatch(r.text, /flooding/,
    "the sequence fills the set; the Causes edge is not appended after it");
});

test("depth: a lone generic word does not key an event (the coverage rule)", async () => {
  const g = await depthGraph();
  const res = matchEventTemplate(g, "what do people want when they can't sleep".split(" "));
  assert.equal(res.match, null,
    "\"lets persony sleep\" shares only \"sleep\" — the discriminative \"can't\" is unaccounted");
  assert.equal(res.bestRejected?.text, "lets persony sleep");
});

test("depth: an event question with no template above threshold declines as before", async () => {
  const g = await depthGraph();
  const s = createSession();
  const r = runTurn(g, s, "How do people feel when they juggle?");
  assert.equal(r.grounded, false);
  assert.ok(
    r.trace.steps.some((st) => /no match above threshold/.test(st.detail)),
    "the failed match is recorded honestly",
  );
});

/* ---------------- trace files (2026-11-09, the step before E4) ----
 * The central query log (loader accessors → the sink a turn
 * installs) and the persistent trace file: the decline's empty
 * set as query-level evidence, one JSON line per turn, and the
 * guarantee that recording changes no reply. */

const traced = (
  g: CskgGraph,
  s: ReturnType<typeof createSession>,
  input: string,
) => runTurn(g, s, input, process.env, new Date(), true);

test("trace: the onion turn's query log holds the empty Causes set the decline rests on", async () => {
  const g = await graph();
  const s = createSession();
  const r = traced(g, s, "Why do my eyes water when I chop onions?");
  assert.equal(r.grounded, false);
  assert.match(r.text, /doesn't record that causation/);
  const causes = r.queries.filter((q) => q.rel === "/r/Causes");
  // The decline's evidence, at query level. The fixture's onion
  // HAS one Causes edge (to crying — the stray edge the E3 gate
  // refuses to borrow), so the cause side is consulted and the
  // direct query returns it; the two-step chain then probes out
  // of crying — the only node the onion side reaches — and THAT
  // Causes query comes back empty, which is where the search
  // honestly dies. (On the production graph onion has no Causes
  // edges at all, and the onion-side query itself is the 0.)
  assert.ok(
    causes.some((q) => q.via === "outEdges" && q.term === "onion" && q.hits === 1),
    `the cause side was never consulted for Causes; records: ${JSON.stringify(causes)}`,
  );
  assert.ok(
    causes.some((q) => q.via === "outEdges" && q.term === "crying" && q.hits === 0),
    `expected the chain's empty /r/Causes query (out of "crying"); records: ${JSON.stringify(causes)}`,
  );
  // the sink is the turn's, not the graph's: detached afterwards
  assert.equal(g.querySink, null);
});

test("trace file: one parseable JSON line per turn, with the required fields", async () => {
  const g = await graph();
  const s = createSession();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-trace-"));
  const file = path.join(dir, "run.trace.jsonl");
  const r1 = traced(g, s, "What is a banana?");
  appendTraceRecord(file, buildTraceRecord(r1, new Date("2026-11-09T12:00:00.000Z")));
  const r2 = traced(g, s, "Why did you say that?");
  appendTraceRecord(file, buildTraceRecord(r2, new Date("2026-11-09T12:00:05.000Z")));
  const lines = fs.readFileSync(file, "utf8").trim().split("\n");
  assert.equal(lines.length, 2, "append mode: the second run continues the file");
  const recs = lines.map((l) => JSON.parse(l));
  assert.equal(recs[0].turn, 1);
  assert.equal(recs[0].at, "2026-11-09T12:00:00.000Z");
  assert.ok("location" in recs[0]);
  assert.equal(recs[0].utterance, "What is a banana?");
  assert.equal(recs[0].reply, r1.text);
  assert.equal(recs[0].grounded, r1.grounded);
  assert.equal(recs[0].intent, r1.trace.intent);
  assert.ok(Array.isArray(recs[0].steps) && recs[0].steps.length > 0);
  assert.ok(Array.isArray(recs[0].queries) && recs[0].queries.length > 0);
  assert.equal(recs[1].turn, 2);
  // the replay turn re-queries nothing — its query log is empty
  assert.deepEqual(recs[1].queries, []);
});

test("trace: query logging does not change replies (on vs off)", async () => {
  const g = await graph();
  const inputs = [
    "I'm making a big pot of soup on Saturday.",
    "My brother is bringing his new girlfriend.",
    "Why do my eyes water when I chop onions?",
    "What happens when it rains?",
  ];
  const off = createSession();
  const on = createSession();
  for (const input of inputs) {
    const a = runTurn(g, off, input);
    const b = traced(g, on, input);
    assert.equal(b.text, a.text, `reply changed under tracing for: ${input}`);
    assert.equal(b.grounded, a.grounded);
    assert.deepEqual(b.queries.length > 0, true, `expected a query log for: ${input}`);
    assert.deepEqual(a.queries, [], "an untraced turn records nothing");
  }
});
