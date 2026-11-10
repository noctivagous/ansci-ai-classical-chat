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
import {
  composeConclusions,
  offerForPlannedDoing,
  renderAll,
  renderComposed,
  renderConclusion,
  renderCorrectionFact,
  renderCorrectionNoFact,
  renderPhatic,
  renderToolDecline,
  renderToolDeclinePlain,
  sentenceForEdge,
} from "../src/cskg/articulate";
import { seasonFor } from "../src/cskg/awareness";
import {
  buildDefinitionsStore,
  chooseDefinition,
  definitionCandidates,
  loadDefinitionsStore,
} from "../src/cskg/definitions";
import { analyseInto, matchEventTemplate, preferQuestionSubject, resolveTerms } from "../src/cskg/discourse";
import { verbLemmaPerTurn } from "../src/cskg/situation";
import {
  detectAdvice,
  detectValueOf,
  detectComposition,
  detectCorrection,
  detectLeadingPhatic,
  detectPersonRecall,
  detectPhatic,
  detectToolQuery,
} from "../src/cskg/intent";
import { contextFit, preferHappeningSubject } from "../src/cskg/solve";
import { cachePathFor, loadCskg, normaliseNode, relationForRoleNoun, termsFromEndpoint, type CskgGraph } from "../src/cskg/loader";
import { createSession } from "../src/cskg/memory";
import {
  appendTraceRecord,
  buildTraceRecord,
  parseTraceLevel,
  DEFAULT_TRACE_LEVEL,
  type QuerySummaryRecord,
  type TraceFileRecord,
  type TraceQueryEntry,
} from "../src/cskg/tracefile";
import type { QueryRecord } from "../src/cskg/loader";
import { runTurn } from "../src/cskg/turn";
import { createWorkspace } from "../src/cskg/workspace";

const HEADER =
  "id\tnode1\trelation\tnode2\tnode1;label\tnode2;label\trelation;label\trelation;dimension\tsource\tsentence";

function row(n1: string, rel: string, n2: string, src: string): string {
  return ["x", n1, rel, n2, "", "", "", "", src, ""].join("\t");
}

function rowL(
  n1: string, rel: string, n2: string, src: string, l1: string, l2: string,
): string {
  return ["x", n1, rel, n2, l1, l2, "", "", src, ""].join("\t");
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
  row("/c/en/soup", "/r/HasA", "/c/en/onion", "CN"),
  row("/c/en/people", "/r/AtLocation", "/c/en/town", "CN"),
  row("/c/en/people", "/r/AtLocation", "/c/en/town", "WN"),
  row("/c/en/coffee", "/r/AtLocation", "/c/en/kitchen", "CN"),
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
  row("/c/en/oklahoma", "/r/dbpedia/capital", "/c/en/oklahoma_city", "CN"),
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

test("Wikidata Q-ids intern by English labels, not the Q-string", () => {
  assert.deepEqual(termsFromEndpoint("Q21546392", "garlic"), ["garlic"]);
  assert.deepEqual(termsFromEndpoint("Q15121455", "garlic soup"), ["garlic soup"]);
  assert.deepEqual(termsFromEndpoint("/c/en/garlic", "ignored"), ["garlic"]);
  assert.deepEqual(termsFromEndpoint("Q1", ""), ["q1"]);
});

test("WD PartOf on labelled Q-ids is composition testimony on speech", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-wd-"));
  const file = path.join(dir, "wd.tsv");
  fs.writeFileSync(file, [
    HEADER,
    rowL("Q21546392", "/r/PartOf", "Q15121455", "WD", "garlic", "garlic soup"),
    row("/c/en/garlic_soup", "/r/IsA", "/c/en/soup", "CN"),
  ].join("\n") + "\n");
  const g = await loadCskg(file, { cache: false });
  const garlic = g.id("garlic");
  const soup = g.id("garlic soup");
  assert.notEqual(garlic, undefined);
  assert.notEqual(soup, undefined);
  assert.equal(g.id("q21546392"), undefined, "the Q-id is not a speakable term");
  const parts = g.outEdges(garlic!, "/r/PartOf");
  assert.ok(parts.some((e) => e.to === soup), "garlic PartOf garlic soup");
  const r = runTurn(g, createSession(), "do garlic go in garlic soup?");
  assert.equal(r.grounded, true);
  assert.match(r.text, /garlic/i);
  assert.doesNotMatch(r.text, /is a soup/i);
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

test("statement turn answers grounded, never a bare decline", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "I'm making a big pot of soup on Saturday.");
  assert.equal(r.grounded, true);
  assert.match(r.text, /soup/i);
  // Loop 2 (L2-A): the grounding is the conversation's own
  // record — the reply leads with the event the situation
  // model recorded, so the trace carries the event step even
  // when no graph conclusion is stated
  assert.match(r.text, /You are making a big pot of soup/);
  assert.ok(
    r.trace.steps.some((st) => st.piece === "situationModel" && /event ev/.test(st.detail)),
    "the recorded event is in the trace",
  );
});

test("telegraphic thinking-of is the intended doing, not a note on pretty", async () => {
  const g = await graph();
  const r = runTurn(g, createSession(), "pretty tired. thinking of making coffee");
  assert.equal(r.grounded, true);
  assert.match(r.text, /thinking of making coffee/i);
  assert.doesNotMatch(r.text, /Pretty — noted/i);
  assert.doesNotMatch(r.text, /female animal/i);
});

test("obligation modal is restated, not used as the actor", async () => {
  const g = await graph();
  const r = runTurn(g, createSession(), "I should probably make coffee");
  assert.equal(r.grounded, true);
  assert.match(r.text, /You should probably make coffee/i);
  assert.doesNotMatch(r.text, /^Should make/i);
  assert.doesNotMatch(r.text, /When's that happening/);
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

test("tool shapes: should/could ask the same problem as can", () => {
  const can = detectToolQuery("what can i use to open a wine bottle?");
  const should = detectToolQuery("what should i use to hang the cabinets?");
  const could = detectToolQuery("what could i use to pound nails?");
  for (const q of [can, should, could]) assert.ok(q, "each modal detects");
  assert.equal(should!.target, "hang the cabinets");
  assert.equal(should!.verb, null);
  assert.equal(should!.isOpen, false);
  assert.equal(could!.target, "pound nails");
  assert.equal(detectToolQuery("what is a hammer?"), null, "not every what-question is a tool ask");
  assert.equal(
    detectToolQuery("what should i use for dinner?")?.target, undefined,
    "the for-shape stays out of scope",
  );
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

test("S12: a correction that supersedes a topic owns the repair in words", async () => {
  const g = await graph();
  const s = createSession();
  runTurn(g, s, "What is a banana?");
  const r = runTurn(g, s, "No, I meant the peel");
  assert.equal(r.trace.intent, "correction");
  assert.match(r.text, /I had that as banana — you meant peel\./);
});

test("S12: a correction with no previous topic keeps the plain acknowledgement", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "No, I meant the peel");
  assert.equal(r.trace.intent, "correction");
  // the correction runs the resolver over the referent: a weak
  // standing names the reading taken (as definition answers do),
  // then the plain acknowledgement follows — the silent
  // score-leader path that produced jacket-as-cover is gone.
  assert.match(r.text, /^Taking peel as .* — Got it — peel\./);
});

test("repair frame: the role pack selects it, same repair either way", () => {
  const assistant = renderCorrectionFact("peel", "Peel is a skin.", "banana");
  const companion = renderCorrectionFact("peel", "Peel is a skin.", "banana", "react-and-share");
  assert.match(assistant, /^I had that as banana — you meant peel\./);
  assert.match(companion, /^Ah — I had that as banana, you meant peel\./);
  assert.match(
    renderCorrectionFact("peel", "Peel is a skin.", "banana", "unknown-strategy"),
    /^I had that as banana — you meant peel\./,
    "an unknown strategy falls back to the plain owning frame",
  );
});

test("adaptive offer: a timeless intended doing asks its timing", () => {
  assert.equal(
    offerForPlannedDoing("intended", null, "balanced", "acknowledge-and-offer"),
    "When's that happening?",
  );
  assert.equal(offerForPlannedDoing("ongoing", null, "balanced", "acknowledge-and-offer"), null,
    "a past doing has no open timing gap");
  assert.equal(offerForPlannedDoing("intended", "Saturday", "balanced", "acknowledge-and-offer"), null,
    "never when the turn already carries the answer");
  assert.equal(offerForPlannedDoing("intended", null, "listening", "acknowledge-and-offer"), null,
    "a listening frame stays silent");
  assert.equal(offerForPlannedDoing("intended", null, "balanced", "react-and-share"), null,
    "a sharing role shares instead of offering");
});

test("adaptive offer: a planned coat-buying asks when, end to end", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "I'm thinking of buying a winter coat.");
  assert.match(r.text, /thinking of buying a winter coat\. When's that happening\?/);
});

test("tool decline: the use-to shape takes the infinitive frame", () => {
  assert.match(renderToolDecline("opening wine bottles"), /used for opening wine bottles/);
  assert.match(renderToolDecline("hang the cabinets", false), /used to hang the cabinets/);
  assert.match(renderToolDeclinePlain("opening wine bottles"), /used for opening wine bottles/);
  assert.match(renderToolDeclinePlain("hang the cabinets", false), /used to hang the cabinets/);
});

test("why continuity: a bare Why? keeps asking about the same happening", async () => {
  const g = await graph();
  const s = createSession();
  const first = runTurn(g, s, "Why is soup green?");
  assert.equal(first.trace.intent, "why");
  assert.match(first.text, /doesn't record a cause for "soup"/i);
  const bare = runTurn(g, s, "Why?");
  assert.equal(bare.trace.intent, "why");
  assert.equal(bare.text, first.text,
    "the decline established soup as the standing topic — the bare follow-up continues it");
});

test("why poles: the happening outranks the top-scored noun", () => {
  const subjects = [{ text: "wall" }, { text: "paint" }, { text: "peeling" }];
  const isVerb = (w: string): boolean => w === "peeling";
  assert.deepEqual(preferHappeningSubject(subjects, isVerb), { text: "peeling" });
  assert.equal(
    preferHappeningSubject([{ text: "wall" }], isVerb),
    null,
    "no happening named — the caller keeps the top subject",
  );
  assert.deepEqual(
    preferHappeningSubject([], isVerb),
    null,
    "no subjects at all — the caller falls back down the chain",
  );
});

test("verb proof tiers: inflected forms testify, bare bases stay ambiguous", async () => {
  const g = await depthGraph();
  assert.equal(verbLemmaPerTurn(g, "apologizing"), "apologize");
  assert.equal(verbLemmaPerTurn(g, "apologizes"), null,
    "third-singular shares its ending with plural nouns, so it stays out");
  assert.equal(verbLemmaPerTurn(g, "apologize"), null,
    "the bare base proves nothing by itself");
  assert.equal(verbLemmaPerTurn(g, "banana"), null,
    "a noun with no inflection and no lemma is not a verb");
});

test("correction: the intended referent, not an em-dash tail or for-adjunct", () => {
  assert.deepEqual(detectCorrection("no, I meant the common cold"), { phrase: "the common cold" });
  assert.deepEqual(detectCorrection("no, I mean the food — the meat, for soup"), { phrase: "the food" });
  assert.deepEqual(detectCorrection("I meant the illness"), { phrase: "the illness" });
});

test("phatic: greeting, thanks and farewell take the social route", () => {
  assert.deepEqual(detectPhatic("hi there!"), { kind: "greeting", word: "hi there" });
  assert.deepEqual(detectPhatic("Thanks!"), { kind: "thanks", word: "thanks" });
  assert.deepEqual(detectPhatic("bye"), { kind: "farewell", word: "bye" });
  assert.deepEqual(detectPhatic("hey, how's it going?"), { kind: "greeting", word: "hey" });
  assert.deepEqual(detectPhatic("how are you?"), { kind: "greeting", word: "how are you" });
  assert.deepEqual(detectPhatic("thanks anyway"), { kind: "thanks", word: "thanks" });
  assert.equal(detectPhatic("hi, i renovated the kitchen"), null,
    "content-bearing turns are not phatic-only");
  assert.equal(detectPhatic("what is a banana?"), null);
  assert.equal(renderPhatic("greeting", "hi there"), "Hi there!");
  assert.equal(renderPhatic("thanks", "thanks"), "You're welcome!");
  assert.equal(renderPhatic("farewell", "bye"), "Bye!");
  assert.equal(renderPhatic("greeting", "how are you"), "Doing all right — thanks for asking.");
  assert.deepEqual(
    detectLeadingPhatic("thanks anyway. I think I'll go make that coffee now"),
    { kind: "thanks", word: "thanks", rest: "i think i'll go make that coffee now" },
  );
  assert.deepEqual(
    detectLeadingPhatic("hi, i renovated the kitchen"),
    { kind: "greeting", word: "hi", rest: "i renovated the kitchen" },
  );
  assert.deepEqual(
    detectLeadingPhatic("hey, just got in. how's it going?"),
    { kind: "greeting", word: "hey", rest: "just got in. how's it going?" },
  );
  assert.equal(detectLeadingPhatic("Hi, what is a banana?"), null);
  assert.equal(detectPhatic("hey, just got in. how's it going?"), null);
});

test("phatic: open and close end to end, content untouched", async () => {
  const g = await graph();
  const s = createSession();
  assert.equal(runTurn(g, s, "Hi there!").text, "Hi there!");
  assert.equal(runTurn(g, s, "Thanks!").text, "You're welcome!");
  assert.equal(runTurn(g, createSession(), "hey, how's it going?").text, "Hey!");
  assert.equal(runTurn(g, createSession(), "how are you?").text, "Doing all right — thanks for asking.");
  const mixed = runTurn(g, createSession(), "thanks anyway. I think I'll go make that coffee now");
  assert.match(mixed.text, /welcome/i);
  assert.match(mixed.text, /You go make that coffee now/i);
  assert.doesNotMatch(mixed.text, /I think go/i);
  const mixedHi = runTurn(g, createSession(), "hey, just got in. how's it going?");
  assert.match(mixedHi.text, /^Hey!/i);
  assert.doesNotMatch(mixedHi.text, /often word/i);
  const r = runTurn(g, s, "Hi, what is a banana?");
  assert.match(r.text, /banana/i, "the definition route still serves content after a greeting");
  assert.doesNotMatch(r.text, /^Hi there/, "no greeting swallowed the question");
});

test("G9: question scaffolding is not the location subject when a content object is present", () => {
  const picked = preferQuestionSubject([
    { text: "people" },
    { text: "coffee" },
  ]);
  assert.deepEqual(picked.map((c) => c.text), ["coffee"]);
  const onlyPeople = preferQuestionSubject([{ text: "people" }]);
  assert.deepEqual(onlyPeople.map((c) => c.text), ["people"]);
});

test("G9: where people keep coffee is about coffee", async () => {
  const g = await graph();
  const r = runTurn(g, createSession(), "where do people usually keep coffee?");
  assert.equal(r.grounded, true);
  assert.match(r.text, /coffee/i);
  assert.doesNotMatch(r.text, /town/i);
});

test("advice: detect addition and wear shapes", () => {
  assert.deepEqual(
    detectAdvice("yeah, chicken soup. I have chicken, carrots, and celery. what else should I put in?"),
    { kind: "addition", outer: null },
  );
  assert.deepEqual(
    detectAdvice("what else should I put in the soup?"),
    { kind: "addition", outer: "soup" },
  );
  assert.deepEqual(
    detectAdvice("so should I wear a coat if I go out?"),
    { kind: "wear", item: "coat" },
  );
  assert.equal(detectAdvice("what is a coat?"), null);
});

test("advice: what else to put in uses composition members, not IsA of a mentioned food", async () => {
  const g = await graph();
  const s = createSession();
  runTurn(g, s, "I'm making a big pot of soup tonight");
  const hit = runTurn(g, s, "what else should I put in?");
  assert.equal(hit.grounded, true);
  assert.match(hit.text, /onion/i);
  assert.doesNotMatch(hit.text, /is a food|is a cock/i);
  const s2 = createSession();
  const skip = runTurn(g, s2, "I'm making soup. I have onions. what else should I put in?");
  assert.equal(skip.grounded, false);
  assert.match(skip.text, /HasA|PartOf/);
  const corr = runTurn(g, s2, "No, I meant banana");
  assert.match(corr.text, /soup/i);
  assert.doesNotMatch(corr.text, /over here/i);
});

test("advice: wear a coat cites UsedFor, not IsA hair", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-advice-"));
  const file = path.join(dir, "advice.tsv");
  fs.writeFileSync(file, [
    HEADER,
    row("/c/en/coat", "/r/IsA", "/c/en/hair", "WN"),
    row("/c/en/coat", "/r/UsedFor", "/c/en/keep_warm", "CN"),
    row("/c/en/keep_warm", "/r/RelatedTo", "/c/en/winter", "CN"),
  ].join("\n") + "\n");
  const g = await loadCskg(file, { cache: false });
  const r = runTurn(g, createSession(), "should I wear a coat if I go out?");
  assert.equal(r.grounded, true);
  assert.match(r.text, /used for/i);
  assert.match(r.text, /warm/i);
  assert.doesNotMatch(r.text, /hair/i);
  const empty = runTurn(g, createSession(), "should I wear a zorblax?");
  assert.equal(empty.grounded, false);
  assert.match(empty.text, /UsedFor/);
});

test("value-of maps the role noun onto a kept relation and names the edge's object", async () => {
  const g = await graph();
  assert.deepEqual(detectValueOf("What is the capital of Oklahoma?"), {
    role: "capital",
    bearer: "oklahoma",
  });
  assert.deepEqual(detectValueOf("what's the capital of Oklahoma"), {
    role: "capital",
    bearer: "oklahoma",
  });
  assert.equal(detectValueOf("What is a banana?"), null);
  assert.equal(relationForRoleNoun("capital"), "/r/dbpedia/capital");
  assert.equal(relationForRoleNoun("purpose"), null);
  const hit = runTurn(g, createSession(), "What is the capital of Oklahoma?");
  assert.equal(hit.grounded, true);
  assert.match(hit.text, /Oklahoma City/);
  assert.doesNotMatch(hit.text, /largest city|livestock/i);
  const miss = runTurn(g, createSession(), "What is the capital of France?");
  assert.equal(miss.grounded, false);
  assert.match(miss.text, /capital/i);
  assert.doesNotMatch(miss.text, /Oklahoma City|largest city/i);
});

test("composition: does X go in Y uses HasA/PartOf/AtLocation, not IsA of Y", async () => {
  const g = await graph();
  assert.deepEqual(detectComposition("do onions go in soup?"), { inner: "onions", outer: "soup" });
  const hit = runTurn(g, createSession(), "do onions go in soup?");
  assert.equal(hit.grounded, true);
  assert.match(hit.text, /onion/i);
  assert.doesNotMatch(hit.text, /is a food/i);
  const miss = runTurn(g, createSession(), "do bananas go in soup?");
  assert.equal(miss.grounded, false);
  assert.match(miss.text, /HasA|PartOf|AtLocation/);
  assert.doesNotMatch(miss.text, /is a food|is a soup/i);
});

test("recall: same-session name is not a graph question about the node name", async () => {
  const g = await graph();
  const s = createSession();
  const stated = runTurn(g, s, "My name is James. I live in Chicago");
  assert.match(stated.text, /James/);
  assert.equal(detectPersonRecall("do you remember my name?"), "name");
  const r = runTurn(g, s, "do you remember my name?");
  assert.equal(r.grounded, true);
  assert.match(r.text, /James/);
  assert.doesNotMatch(r.text, /affinity/i);
  const place = runTurn(g, s, "where do I live?");
  assert.match(place.text, /Chicago/);
});

test("repair frame: the no-fact correction names the superseded topic too", () => {
  assert.match(
    renderCorrectionNoFact("oobleck", "banana"),
    /^I had that as banana — you meant oobleck\. I don't have much on oobleck/,
  );
  assert.match(
    renderCorrectionNoFact("oobleck"),
    /^Got it — oobleck\. I don't have much on it/,
    "no previous topic keeps the plain acknowledgement",
  );
  assert.match(
    renderCorrectionNoFact("oobleck", "oobleck"),
    /^Got it — oobleck\./,
    "a correction to the same topic is not a repair",
  );
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
  // Loop 2 (L2-C): the reply leads with the recorded state,
  // not the topic filing — the resolver evidence is the
  // breakdown assertion above; the reply just must not fall
  // to the ordinal's wrong sense
  assert.match(r.text, /Third day of rain/);
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
  // Loop 2 (L2-C): the reply leads with the recorded state;
  // the sense evidence is the chosen-candidate assertion
  // above — the reply just must not fall to the film sense
  assert.match(r.text, /Bananas are brown/);
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
  // Loop 2 (L2-D): the reply now leads with the recorded
  // event, so the fact choice is not what the reply shows;
  // what must still hold is that the monk filing surfaces
  // nowhere — the lead is the conversation's own record
  assert.match(r.text, /Your brother is bringing his new girlfriend/);
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
  row("/c/en/apologizing", "/r/FormOf", "/c/en/apologize", "CN"),
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
  assert.equal(g.stats!.formRows, 2, "FormOf lands in the side store");
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

/* ---------------- trace levels (2026-11-09) ----
 * Granularity at record-build time (tracefile.ts): steps keeps
 * the module path and a query count; queries keeps decision
 * queries individual and folds the bulk lemmaOf/id scans into
 * stated-count summaries; full keeps every record verbatim.
 * Collection is level-unaware — the same finished turn is built
 * at several levels below and must account for itself at each. */

const isSummary = (e: TraceQueryEntry): e is QuerySummaryRecord => "summary" in e;

/** How many issued queries a record accounts for: 1 per individual record, `count` per summary. */
const accountedFor = (rec: TraceFileRecord): number =>
  rec.queries.reduce((n, q) => n + (isSummary(q) ? q.count : 1), 0);

test("trace level steps: header and steps survive, queries become a count", async () => {
  const g = await graph();
  const s = createSession();
  const r = traced(g, s, "Why do my eyes water when I chop onions?");
  const rec = buildTraceRecord(r, new Date("2026-11-09T12:00:00.000Z"), "steps");
  assert.deepEqual(rec.queries, [], "no query records at the steps level");
  assert.equal(rec.queryCount, r.queries.length);
  assert.ok(rec.queryCount > 0, "the turn did issue queries — at this level the count is their only trace");
  assert.equal(rec.turn, r.trace.turn);
  assert.equal(rec.at, "2026-11-09T12:00:00.000Z");
  assert.ok("location" in rec);
  assert.equal(rec.utterance, "Why do my eyes water when I chop onions?");
  assert.equal(rec.reply, r.text);
  assert.equal(rec.grounded, r.grounded);
  assert.equal(rec.intent, r.trace.intent);
  assert.deepEqual(rec.steps, r.trace.steps, "the module path is intact");
});

test("trace level queries: decision records stay individual, scans summarise and reconcile", async () => {
  const g = await graph();
  const s = createSession();
  const r = traced(g, s, "Why do my eyes water when I chop onions?");
  const at = new Date("2026-11-09T12:00:00.000Z");
  const full = buildTraceRecord(r, at, "full");
  const q = buildTraceRecord(r, at, "queries");

  // full is the original record: the turn's query list verbatim.
  assert.deepEqual(full.queries, r.queries, "full keeps every query record verbatim");
  assert.equal(full.queryCount, r.queries.length);
  assert.equal(q.queryCount, r.queries.length);

  // The decline's evidence survives the level: the empty Causes
  // chain probe is an individual record, never folded into a
  // summary (it is an outEdges query — a decision, not a scan).
  const individual = q.queries.filter((e): e is QueryRecord => !isSummary(e));
  assert.ok(
    individual.some(
      (e) => e.via === "outEdges" && e.term === "crying" && e.rel === "/r/Causes" && e.hits === 0,
    ),
    "the 0-hit /r/Causes probe out of \"crying\" stays an individual record at the queries level",
  );
  // Individual records are exactly full's non-scan records, in order.
  assert.deepEqual(
    individual,
    full.queries.filter((e) => e.via !== "lemmaOf" && e.via !== "id"),
    "the queries level neither drops, invents nor reorders a decision record",
  );

  // Summaries exist only for the scan accessors, and every number
  // in them matches the full record exactly.
  const summaries = q.queries.filter(isSummary);
  assert.ok(summaries.length > 0, "the onion turn does scan (id at least) — a summary must exist");
  const fullQueries: QueryRecord[] = full.queries as QueryRecord[];
  for (const sum of summaries) {
    assert.ok(sum.via === "lemmaOf" || sum.via === "id", `unexpected summarised accessor: ${sum.via}`);
    const raw: QueryRecord[] = fullQueries.filter((e) => e.via === sum.via);
    assert.equal(sum.count, raw.length, `${sum.via}: summary count matches the full record`);
    assert.equal(sum.totalHits, raw.reduce((n, e) => n + e.hits, 0), `${sum.via}: totalHits`);
    assert.equal(sum.zeroHits, raw.filter((e) => e.hits === 0).length, `${sum.via}: zeroHits`);
    assert.equal(sum.distinctTerms, new Set(raw.map((e) => e.term)).size, `${sum.via}: distinctTerms`);
    // Placement: the summary sits where the accessor's first
    // query occurred — the records before it in q are individuals
    // whose counterparts all precede that first occurrence in full.
    const firstRaw: number = fullQueries.findIndex((e) => e.via === sum.via);
    const before = q.queries.slice(0, q.queries.indexOf(sum)).filter((e) => !isSummary(e));
    assert.equal(
      before.length,
      fullQueries
        .slice(0, firstRaw)
        .filter((e) => e.via !== "lemmaOf" && e.via !== "id").length,
      `${sum.via}: summary placed at its accessor's first occurrence`,
    );
  }

  // Nothing silently dropped at either level: summaries +
  // individuals account for every query the turn issued.
  assert.equal(accountedFor(q), full.queryCount, "queries level reconciles to the turn's total");
  assert.equal(accountedFor(full), full.queryCount, "full level reconciles to the turn's total");

  // The level earns its keep on the very turn whose log is evidence.
  assert.ok(
    JSON.stringify(q).length < JSON.stringify(full).length,
    `queries record (${JSON.stringify(q).length} bytes) should be smaller than full (${JSON.stringify(full).length} bytes)`,
  );
});

test("trace level: the default is queries, at the builder and in the parser", async () => {
  const g = await graph();
  const s = createSession();
  const r = traced(g, s, "What is a banana?");
  const at = new Date("2026-11-09T12:00:00.000Z");
  assert.equal(DEFAULT_TRACE_LEVEL, "queries");
  assert.deepEqual(
    buildTraceRecord(r, at),
    buildTraceRecord(r, at, "queries"),
    "buildTraceRecord without a level builds at queries",
  );
  assert.equal(parseTraceLevel(undefined), "queries", "an absent --trace-level parses to the default");
  assert.equal(parseTraceLevel("steps"), "steps");
  assert.equal(parseTraceLevel("queries"), "queries");
  assert.equal(parseTraceLevel("full"), "full");
});

test("trace level: an unknown level is rejected", () => {
  assert.throws(() => parseTraceLevel("verbose"), /invalid trace level "verbose"/);
  assert.throws(() => parseTraceLevel(""), /invalid trace level/);
  assert.throws(() => parseTraceLevel("FULL"), /invalid trace level/, "levels are exact, not case-folded");
});

/* ---------------- definitions (2026-11-09, closes G7) ----
 * The join to the repo's own WordNet glosses (definitions.ts):
 * provenance on every candidate, sense choice by filing share
 * + context fit + POS prior, the gloss leading definition-
 * shaped what-is turns (neighbourhood facts following), the
 * correction path giving the settled sense's definition, and
 * the fallbacks — no gloss, no change; other question shapes,
 * no change. */

test("definitions: the store joins terms to WordNet glosses, with provenance", () => {
  const store = loadDefinitionsStore();
  assert.equal(store.stats.synsets, 117008, "the full OEWN 2024 synset set");
  const headache = store.candidatesFor("headache");
  const pain = headache.find((c) => c.synsetId === "wn-n14571315");
  assert.ok(pain, "the pain synset is among headache's candidates");
  assert.equal(pain.pos, "n");
  assert.equal(pain.lemma, "headache");
  assert.match(pain.gloss, /pain in the head/);
  const cc = store.candidatesFor("common cold");
  assert.deepEqual(
    cc.map((c) => c.synsetId),
    ["wn-n14389489"],
    "common cold files under exactly the illness synset",
  );
});

test("definitions: candidates reach synsets through the graph's FormOf lemma", async () => {
  const g = await depthGraph(); // fixture: apologizes —FormOf→ apologize
  const cands = definitionCandidates(g, "apologizes");
  assert.ok(cands.length > 0, "the inflected form finds its lemma's synsets");
  assert.ok(cands.every((c) => c.lemma === "apologize"), "found under the lemma, not the form");
});

test("definitions: sense choice — filing share and context beat extraction order", async () => {
  const g = await graph();
  // a fabricated pair over the fixture graph's "coat": the paint
  // sense is filed FIRST (extraction order would pick it), but
  // its words resolve nowhere in the fixture; the garment
  // sense's "winter" lives in coat's world (RelatedTo winter,
  // shared warm neighbours).
  const store = buildDefinitionsStore(
    [
      { id: "wn-n90000001", pos: "n", gloss: "a layer of paint applied to a surface", lemmas: ["coat"] },
      { id: "wn-n90000002", pos: "n", gloss: "an outer garment worn to keep warm in winter", lemmas: ["coat"] },
    ],
    { source: "test", edition: "test", license: "test" },
  );
  const coat = g.id("coat")!;
  const winter = g.id("winter")!;
  const bare = chooseDefinition(g, "coat", [], contextFit, store);
  assert.equal(bare!.chosen.synsetId, "wn-n90000001",
    "no evidence either way: the first candidate stands (deterministic dominance)");
  const subjectOnly = chooseDefinition(g, "coat", [coat], contextFit, store);
  assert.equal(subjectOnly!.chosen.synsetId, "wn-n90000002",
    "the subject's own graph world already separates them: \"winter\" lives in it, the paint words resolve nowhere");
  const inContext = chooseDefinition(g, "coat", [coat, winter], contextFit, store);
  assert.equal(inContext!.chosen.synsetId, "wn-n90000002",
    "context corroborates the garment sense's world");
  assert.equal(inContext!.rivals.length, 2, "both rivals are recorded with scores");
});

test("definitions: sense choice — the graph's own filing endorses its sense", async () => {
  const g = await graph();
  // fixture banana IsA fruit [support 2 of 3]: a candidate whose
  // evidence names the filing ("fruit") takes the filing share
  // even with no other context.
  const store = buildDefinitionsStore(
    [
      { id: "wn-n90000003", pos: "n", gloss: "a curved yellow fruit with soft flesh", lemmas: ["banana"] },
      { id: "wn-n90000004", pos: "n", gloss: "an elongated herblike plant of the tropics", lemmas: ["banana"] },
    ],
    { source: "test", edition: "test", license: "test" },
  );
  const banana = g.id("banana")!;
  const choice = chooseDefinition(g, "banana", [banana], contextFit, store);
  assert.equal(choice!.chosen.synsetId, "wn-n90000003");
  assert.ok(choice!.taxonomy.includes("fruit"), "the filing evidence is named");
});

test("definitions: a definition-shaped what-is turn leads with the gloss, facts follow", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "What is a common cold?");
  assert.equal(r.grounded, true);
  assert.match(r.text, /^Common cold: a mild viral infection/);
  assert.match(r.text, /Common cold is an illness\./, "the neighbourhood fact the old reply carried still follows");
  assert.ok(
    r.trace.steps.some((st) => /definition: "common cold" → wn-n14389489/.test(st.detail)),
    "the trace carries the chosen sense and its provenance",
  );
});

test("definitions: a correction gives the settled sense's definition", async () => {
  const g = await graph();
  const s = createSession();
  runTurn(g, s, "What is a banana?");
  const r = runTurn(g, s, "No, I meant the common cold");
  assert.equal(r.trace.intent, "correction");
  assert.equal(r.grounded, true);
  assert.match(r.text, /^I had that as banana — you meant common cold\. Common cold: a mild viral infection/);
});

test("definitions: a term with no gloss falls back to exactly the old answer", async () => {
  const g = await graph();
  const s = createSession();
  // "brown banana" is a fixture term with no WordNet lemma:
  // the reply is the pre-slice neighbourhood answer, unchanged.
  const r = runTurn(g, s, "What is a brown banana?");
  assert.equal(r.grounded, true);
  assert.equal(r.text, "Brown banana is often sweet.");
  assert.ok(
    !r.trace.steps.some((st) => /definition:/.test(st.detail)),
    "no definition was attempted into the trace",
  );
});

test("definitions: non-definition questions keep their routing (purpose, made-of)", async () => {
  const g = await graph();
  const s = createSession();
  // "coat" HAS WordNet glosses; a purpose question must not
  // become a definition.
  const p = runTurn(g, s, "What is a coat used for?");
  assert.equal(p.grounded, true);
  assert.match(p.text, /keep warm/);
  assert.doesNotMatch(p.text, /^Coat:/, "no definition lead on a purpose turn");
  const m = runTurn(g, s, "What is a wine bottle made of?");
  assert.equal(m.grounded, true);
  assert.match(m.text, /made of glass/);
  assert.doesNotMatch(m.text, /^Wine bottle:/, "no definition lead on a made-of turn");
});

test("purpose: empty UsedFor declines instead of substituting a neighbouring fact", async () => {
  const g = await graph();
  const s = createSession();
  const r = runTurn(g, s, "What are onions for?");
  assert.equal(r.grounded, false);
  assert.match(r.text, /used for/i);
  assert.match(r.text, /UsedFor/);
  assert.doesNotMatch(r.text, /crying|bulb|cause/i,
    "Causes testimony on onion is not substituted for a purpose ask");
  const coat = runTurn(g, createSession(), "What is a coat used for?");
  assert.equal(coat.grounded, true, "a term with UsedFor still answers");
  assert.match(coat.text, /keep warm/);
  const why = runTurn(g, s, "why did you say that?");
  assert.match(why.text, /UsedFor/, "replay of an empty-set decline names the missing relation");
  assert.doesNotMatch(why.text, /conversation itself/);
});

// ---------------------------------------------------------------------------
// Item 3 — the singular Conclusion. A fixture with three weak
// UsedFor edges (hammer), a strong pair (mallet, support 2), one
// banked UsedFor sentence, and the FormOf rows the per-turn verb
// proof reads.

const COMPOSE_ROWS = [
  row("/c/en/hammer", "/r/UsedFor", "/c/en/hit", "CN"),
  row("/c/en/hammer", "/r/UsedFor", "/c/en/pound", "CN"),
  row("/c/en/hammer", "/r/UsedFor", "/c/en/whack", "CN"),
  row("/c/en/hammer", "/r/UsedFor", "/c/en/metal", "CN"),
  row("/c/en/paint", "/r/UsedFor", "/c/en/painting", "CN"),
  row("/c/en/painting", "/r/FormOf", "/c/en/paint", "CN"),
  row("/c/en/paint", "/r/UsedFor", "/c/en/coating", "CN"),
  row("/c/en/mallet", "/r/UsedFor", "/c/en/nails", "CN"),
  row("/c/en/mallet", "/r/UsedFor", "/c/en/screws", "CN"),
  rowS("/c/en/hammer", "/r/UsedFor", "/c/en/nails", "CN", "[[Hammer]] drives [[nails]]"),
  row("/c/en/hammer", "/r/IsA", "/c/en/tool", "CN"),
  row("/c/en/mallet", "/r/UsedFor", "/c/en/tap", "CN"),
  row("/c/en/mallet", "/r/UsedFor", "/c/en/tap", "WN"),
  row("/c/en/mallet", "/r/UsedFor", "/c/en/rap", "CN"),
  row("/c/en/mallet", "/r/UsedFor", "/c/en/rap", "WN"),
  row("/c/en/hitting", "/r/FormOf", "/c/en/hit", "CN"),
  row("/c/en/pounding", "/r/FormOf", "/c/en/pound", "CN"),
  row("/c/en/whacking", "/r/FormOf", "/c/en/whack", "CN"),
  row("/c/en/tapping", "/r/FormOf", "/c/en/tap", "CN"),
  row("/c/en/rapping", "/r/FormOf", "/c/en/rap", "CN"),
];

let composePromise: Promise<CskgGraph> | null = null;
function composeGraph(): Promise<CskgGraph> {
  if (!composePromise) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-compose-"));
    const file = path.join(dir, "fixture.tsv");
    fs.writeFileSync(file, [HEADER, ...COMPOSE_ROWS].join("\n") + "\n");
    composePromise = loadCskg(file);
  }
  return composePromise;
}

function composeEdges(g: CskgGraph, from: string, rel: string, tos: string[]): import("../src/cskg/articulate").Conclusion[] {
  const id = g.id(from)!;
  const wanted = new Set(tos);
  return g.outEdges(id, rel)
    .filter((e) => wanted.has(g.terms[e.to]))
    .sort((a, b) => (tos.indexOf(g.terms[a.to]) - tos.indexOf(g.terms[b.to])))
    .map((edge) => ({ edge, about: "from" as const }));
}

test("compose: three weak UsedFor conclusions aggregate into one headline", async () => {
  const g = await composeGraph();
  const cs = composeEdges(g, "hammer", "/r/UsedFor", ["hit", "pound", "whack"]);
  assert.equal(cs.length, 3);
  const cc = composeConclusions(g, cs);
  assert.equal(cc.headline.length, 3, "one group leads");
  assert.equal(cc.support.length, 0);
  assert.equal(renderComposed(g, cc), "A hammer can be used to hit, pound and whack.");
  assert.ok(cs.every((c) => c.via === "template"));
});

test("compose: strong support takes the plain modal", async () => {
  const g = await composeGraph();
  const cs = composeEdges(g, "mallet", "/r/UsedFor", ["tap", "rap"]);
  assert.equal(renderComposed(g, composeConclusions(g, cs)), "A mallet is used to tap and rap.");
});

test("compose: a banked conclusion keeps its sentence; templates still aggregate", async () => {
  const g = await composeGraph();
  const hid = g.id("hammer")!;
  const byTo = new Map(g.outEdges(hid, "/r/UsedFor").map((e) => [g.terms[e.to], e]));
  const cs = ["hit", "nails", "whack"].map((t) => ({ edge: byTo.get(t)!, about: "from" as const }));
  assert.equal(
    renderComposed(g, composeConclusions(g, cs)),
    "A hammer can be used to hit and whack. Hammer drives nails.",
  );
});

test("compose: a tautological conclusion is selected out, not said", async () => {
  const g = await composeGraph();
  const cs = composeEdges(g, "paint", "/r/UsedFor", ["painting", "coating"]);
  const cc = composeConclusions(g, cs);
  assert.equal(cc.dropped.length, 1, "painting resolves to the subject's own form");
  assert.equal(renderComposed(g, cc), "Paint can be used for coating.");
});

test("compose: noun groups aggregate in the for-frame; mixed groups stay separate", async () => {
  const g = await composeGraph();
  const nouns = composeEdges(g, "mallet", "/r/UsedFor", ["nails", "screws"]);
  assert.equal(renderComposed(g, composeConclusions(g, nouns)), "A mallet can be used for nails and screws.");
  const mixed = composeEdges(g, "hammer", "/r/UsedFor", ["hit", "metal"]);
  assert.equal(renderComposed(g, composeConclusions(g, mixed)), renderAll(g, mixed),
    "one verb plus one noun fits neither frame, so both render as before");
});

test("compose: mixed relations and singletons render exactly as before", async () => {
  const g = await composeGraph();
  const hid = g.id("hammer")!;
  const isa = g.outEdges(hid, "/r/IsA")[0];
  const hit = composeEdges(g, "hammer", "/r/UsedFor", ["hit"])[0];
  const mixed = [{ edge: isa, about: "from" as const }, hit];
  assert.equal(renderComposed(g, composeConclusions(g, mixed)), renderAll(g, mixed));
  assert.equal(renderComposed(g, composeConclusions(g, [hit])), renderConclusion(g, hit));
});

// ---------------------------------------------------------------------------
// G8 — the serialised index cache. A fixture exercising every store
// the cache carries: a sentence-bearing edge, a dedup across
// datasets, a union source in one row ("CN|WN"), two HasContext
// tags on one term, a FormOf pair, an ATOMIC event.

const CACHE_ROWS = [
  rowS("/c/en/banana", "/r/HasA", "/c/en/peel", "CN", "[[A banana]] has [[a peel]]"),
  row("/c/en/banana", "/r/HasA", "/c/en/peel", "WN"), // dedup: support 2, sentence adopted
  row("/c/en/banana", "/r/IsA", "/c/en/fruit", "CN|WN"), // union source, one row
  row("/c/en/brother", "/r/IsA", "/c/en/sibling", "CN"),
  row("/c/en/brother", "/r/HasContext", "/c/en/religion", "CN"),
  row("/c/en/brother", "/r/HasContext", "/c/en/family", "WN"),
  row("at:personx_loses_their_house_keys", "at:xReact", "/c/en/frustrated", "AT"),
  row("/c/en/apologizes", "/r/FormOf", "/c/en/apologize", "CN"),
  row("/c/en/apologize", "/r/IsA", "/c/en/act", "CN"),
];

function cacheFixture(extraRows: string[] = []): { file: string; cache: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-cache-"));
  const file = path.join(dir, "fixture.tsv");
  fs.writeFileSync(file, [HEADER, ...CACHE_ROWS, ...extraRows].join("\n") + "\n");
  return { file, cache: cachePathFor(file) };
}

/** Every accessor output of two graphs, compared exhaustively. */
function assertGraphsEqual(a: CskgGraph, b: CskgGraph): void {
  assert.deepEqual(b.terms, a.terms);
  assert.equal(b.maxTermWords, a.maxTermWords);
  assert.equal(b.edgeCount, a.edgeCount);
  for (let id = 0; id < a.terms.length; id++) {
    assert.deepEqual(b.outEdges(id), a.outEdges(id), `outEdges(${a.terms[id]})`);
    assert.deepEqual(b.inEdgesFor(id), a.inEdgesFor(id), `inEdgesFor(${a.terms[id]})`);
    assert.equal(b.degree(id), a.degree(id));
    assert.deepEqual(b.contextsOf(id), a.contextsOf(id));
  }
  assert.deepEqual(b.edgesOf("/r/IsA"), a.edgesOf("/r/IsA"));
  assert.deepEqual(b.eventTermIds(), a.eventTermIds());
  assert.equal(b.lemmaOf("apologizes"), a.lemmaOf("apologizes"));
  assert.equal(b.lemmaOf("banana"), a.lemmaOf("banana"));
  // parse stats survive the round trip verbatim (loadMs is the
  // one field that honestly differs — it is this load's duration)
  assert.deepEqual({ ...b.stats!, loadMs: 0 }, { ...a.stats!, loadMs: 0 });
}

test("cache: a parsed graph round-trips through the serialised index", async () => {
  const { file, cache } = cacheFixture();
  const g1 = await loadCskg(file);
  assert.ok(fs.existsSync(cache), "the parse wrote a cache beside the source");
  const mtime = fs.statSync(cache).mtimeMs;
  const g2 = await loadCskg(file);
  assert.equal(fs.statSync(cache).mtimeMs, mtime, "the second load was a pure read — no rewrite");
  assertGraphsEqual(g1, g2);
});

test("cache: a changed source fingerprint rebuilds and rewrites", async () => {
  const { file, cache } = cacheFixture();
  const g1 = await loadCskg(file);
  assert.equal(g1.id("zebra"), undefined);
  const mtime = fs.statSync(cache).mtimeMs;
  fs.appendFileSync(file, row("/c/en/zebra", "/r/IsA", "/c/en/animal", "CN") + "\n");
  const later = new Date(Date.now() + 5000);
  fs.utimesSync(file, later, later);
  const g2 = await loadCskg(file);
  assert.ok(g2.id("zebra") !== undefined, "the rebuilt graph knows the new term");
  assert.ok(fs.statSync(cache).mtimeMs > mtime, "the cache was rewritten for the new source");
  const g3 = await loadCskg(file);
  assertGraphsEqual(g2, g3);
});

test("cache: a corrupt cache falls back to the parse and is rewritten", async () => {
  const { file, cache } = cacheFixture();
  const g1 = await loadCskg(file);
  // flavour 1: not a cache at all (magic mismatch)
  fs.writeFileSync(cache, "this is not a serialised index");
  const g2 = await loadCskg(file);
  assertGraphsEqual(g1, g2);
  assert.equal(fs.readFileSync(cache).subarray(0, 4).toString("ascii"), "CKGI",
    "the fallback parse rewrote a valid cache");
  // flavour 2: valid framing, one flipped byte in the sections
  // (the checksum must catch what the structure cannot)
  const bytes = fs.readFileSync(cache);
  bytes[bytes.length - 5] = bytes[bytes.length - 5] ^ 0xff;
  fs.writeFileSync(cache, bytes);
  const g3 = await loadCskg(file);
  assertGraphsEqual(g1, g3);
  assert.equal(fs.readFileSync(cache).subarray(0, 4).toString("ascii"), "CKGI",
    "the checksum fallback also rewrote a valid cache");
});

test("cache: cache:false parses without writing anything", async () => {
  const { file, cache } = cacheFixture();
  const g = await loadCskg(file, { cache: false });
  assert.ok(g.id("banana") !== undefined);
  assert.ok(!fs.existsSync(cache), "no cache file was written");
});
