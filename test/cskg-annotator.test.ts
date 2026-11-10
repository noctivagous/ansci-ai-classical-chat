/**
 * cskg-annotator.test.ts — the optional parser sidecar (annotator.ts).
 *
 * The contract: spaCy proposes structure, the graph still binds.
 * Without an annotation every turn behaves exactly as before; with
 * one, B demotes parser-function spans (hey/should), nudges noun
 * chunks, hears NER kind signals, and the situation scan gains a
 * VERB-lemma fallback. Fixture docs stand in for the sidecar, so
 * no spaCy install is needed to run these.
 */
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { test } from "node:test";
import {
  chunkContainsSpan,
  entityLabelsForSpan,
  isParserFunctionSpan,
  loadTurnAnnotation,
  parseAnnotatorDoc,
  verbLemmaForSpan,
} from "../src/cskg/annotator";
import { analyseInto } from "../src/cskg/discourse";
import { loadCskg, type CskgGraph } from "../src/cskg/loader";
import { createWorkspace } from "../src/cskg/workspace";

const HEADER =
  "id\tnode1\trelation\tnode2\tnode1;label\tnode2;label\trelation;label\trelation;dimension\tsource\tsentence";

function row(n1: string, rel: string, n2: string, src: string): string {
  return ["x", n1, rel, n2, "", "", "", "", src, ""].join("\t");
}

const ROWS = [
  row("/c/en/hey", "/r/RelatedTo", "/c/en/greeting", "CN"),
  row("/c/en/coffee", "/r/IsA", "/c/en/beverage", "CN"),
  row("/c/en/winter_coat", "/r/IsA", "/c/en/coat", "CN"),
  row("/c/en/coat", "/r/UsedFor", "/c/en/keep_warm", "CN"),
  row("/c/en/james", "/r/RelatedTo", "/c/en/greeting", "CN"),
];

let graphPromise: Promise<CskgGraph> | null = null;
function graph(): Promise<CskgGraph> {
  if (!graphPromise) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-annotator-"));
    const file = path.join(dir, "fixture.tsv");
    fs.writeFileSync(file, [HEADER, ...ROWS].join("\n") + "\n");
    graphPromise = loadCskg(file, { cache: false });
  }
  return graphPromise;
}

/** A hand-built stand-in for scripts/annotate-spacy.py output (wire JSON). */
function heyCoffeeDoc(): unknown {
  return {
    text: "hey coffee",
    tokens: [
      { i: 0, text: "hey", lemma: "hey", pos: "INTJ", tag: "UH", dep: "discourse", head: 1, start: 0, end: 3, ent: "" },
      { i: 1, text: "coffee", lemma: "coffee", pos: "NOUN", tag: "NN", dep: "ROOT", head: 1, start: 4, end: 10, ent: "" },
    ],
    entities: [],
    chunks: [{ start: 4, end: 10 }],
  };
}

test("annotator: validation accepts the sidecar shape, rejects garbage", () => {
  const doc = parseAnnotatorDoc(heyCoffeeDoc());
  assert.ok(doc && doc.tokens.length === 2, "fixture doc parses");
  for (const bad of [null, 42, "x", [], { text: "hey coffee" }, { text: "hey coffee", tokens: [{ i: 0 }] }]) {
    assert.equal(parseAnnotatorDoc(bad), null, `rejects ${JSON.stringify(bad)}`);
  }
});

test("annotator: helpers read spans by char overlap", () => {
  const doc = parseAnnotatorDoc(heyCoffeeDoc());
  assert.ok(doc, "fixture parses");
  assert.ok(isParserFunctionSpan(doc, 0, 3), "hey is parser-function");
  assert.ok(!isParserFunctionSpan(doc, 4, 10), "coffee is not");
  assert.ok(!isParserFunctionSpan(doc, 0, 10), "mixed span is not");
  assert.ok(chunkContainsSpan(doc, 4, 10), "coffee sits in a chunk");
  assert.ok(!chunkContainsSpan(doc, 0, 3), "hey does not");
  assert.deepEqual(entityLabelsForSpan(doc, 4, 10), []);
  assert.equal(verbLemmaForSpan(doc, 0, 10), null, "no verb in fixture");
});

test("annotator: VERB lemma fallback helper", () => {
  const doc = parseAnnotatorDoc({
    text: "they sauntered home",
    tokens: [
      { i: 0, text: "they", lemma: "they", pos: "PRON", tag: "PRP", dep: "nsubj", head: 1, start: 0, end: 4, ent: "" },
      { i: 1, text: "sauntered", lemma: "saunter", pos: "VERB", tag: "VBD", dep: "ROOT", head: 1, start: 5, end: 14, ent: "" },
      { i: 2, text: "home", lemma: "home", pos: "NOUN", tag: "NN", dep: "dobj", head: 1, start: 15, end: 19, ent: "" },
    ],
    entities: [],
    chunks: [],
  });
  assert.ok(doc, "verb fixture parses");
  assert.equal(verbLemmaForSpan(doc, 5, 14), "saunter");
  assert.equal(verbLemmaForSpan(doc, 0, 4), null, "pronoun is not a verb");
});

test("annotator: loadTurnAnnotation only honours this turn's doc", () => {
  const json = JSON.stringify(heyCoffeeDoc());
  const good = loadTurnAnnotation({ ANSCI_ANNOTATION: json }, "hey coffee");
  assert.ok(good && good.tokens.length === 2, "inline JSON loads");
  assert.equal(loadTurnAnnotation({ ANSCI_ANNOTATION: json }, "other turn"), null, "stale doc refused");
  assert.equal(loadTurnAnnotation({ ANSCI_ANNOTATION: "not json" }, "hey coffee"), null, "garbage refused");
  assert.equal(loadTurnAnnotation({}, "hey coffee"), null, "unset is parser-free");
});

test("annotator: hey is a topic without the parser, skipped with it", async () => {
  const g = await graph();
  const plain = createWorkspace(1, "hey coffee");
  analyseInto(plain, g);
  const plainHey = plain.breakdown!.mentions.find((m) => m.text === "hey");
  assert.ok(plainHey && plainHey.chosen >= 0, "parser-free: hey resolves (the old bug)");

  const ws = createWorkspace(1, "hey coffee");
  analyseInto(ws, g, parseAnnotatorDoc(heyCoffeeDoc()));
  const hey = ws.breakdown!.mentions.find((m) => m.text === "hey");
  const coffee = ws.breakdown!.mentions.find((m) => m.text === "coffee");
  assert.ok(hey && hey.chosen < 0, "hey skipped, nothing chosen");
  assert.ok(hey?.resolverNote?.includes("parser"), "the skip is traced");
  assert.ok(coffee && coffee.chosen >= 0, "coffee still resolves");
  assert.ok(
    !ws.breakdown!.topics.some((t) => t.text === "hey"),
    "hey never reaches the topics",
  );
  assert.ok(
    ws.trace.steps.some((s) => s.detail.includes("read-only structure")),
    "the annotation itself is a trace step",
  );
});

test("annotator: noun chunks nudge the phrase, NER names the kind", async () => {
  const g = await graph();
  const ws = createWorkspace(1, "buying a winter coat");
  analyseInto(ws, g, parseAnnotatorDoc({
    text: "buying a winter coat",
    tokens: [
      { i: 0, text: "buying", lemma: "buy", pos: "VERB", tag: "VBG", dep: "ROOT", head: 0, start: 0, end: 6, ent: "" },
      { i: 1, text: "a", lemma: "a", pos: "DET", tag: "DT", dep: "det", head: 3, start: 7, end: 8, ent: "" },
      { i: 2, text: "winter", lemma: "winter", pos: "NOUN", tag: "NN", dep: "compound", head: 3, start: 9, end: 15, ent: "" },
      { i: 3, text: "coat", lemma: "coat", pos: "NOUN", tag: "NN", dep: "dobj", head: 0, start: 16, end: 20, ent: "" },
    ],
    entities: [],
    chunks: [{ start: 9, end: 20 }],
  }));
  const mention = ws.breakdown!.mentions.find((m) => m.text === "winter coat");
  assert.ok(mention && mention.chosen >= 0, "winter coat resolves");
  assert.ok(
    mention.candidates[mention.chosen].reasons.some((r) => r.includes("noun chunk")),
    "the chunk nudge is on the record",
  );
});

test("annotator: a PERSON tag makes james a person without a graph IsA", async () => {
  const g = await graph();
  const plain = createWorkspace(1, "james drinks coffee");
  analyseInto(plain, g);
  const plainEntry = plain.breakdown!.contents!.entries.find((e) => e.text === "james");
  assert.ok(plainEntry && !plainEntry.chosen.includes("person"), "parser-free: james is thing-only");

  const ws = createWorkspace(1, "james drinks coffee");
  analyseInto(ws, g, parseAnnotatorDoc({
    text: "james drinks coffee",
    tokens: [
      { i: 0, text: "james", lemma: "james", pos: "PROPN", tag: "NNP", dep: "nsubj", head: 1, start: 0, end: 5, ent: "PERSON" },
      { i: 1, text: "drinks", lemma: "drink", pos: "VERB", tag: "VBZ", dep: "ROOT", head: 1, start: 6, end: 12, ent: "" },
      { i: 2, text: "coffee", lemma: "coffee", pos: "NOUN", tag: "NN", dep: "dobj", head: 1, start: 13, end: 19, ent: "" },
    ],
    entities: [{ text: "james", label: "PERSON", start: 0, end: 5 }],
    chunks: [],
  }));
  const entry = ws.breakdown!.contents!.entries.find((e) => e.text === "james");
  assert.ok(entry && entry.chosen.includes("person"), "PERSON tag names the kind");
  assert.ok(
    entry!.kinds.find((k) => k.kind === "person")!.signals.some((s) => s.includes("NER PERSON")),
    "the signal is on the record",
  );
});
