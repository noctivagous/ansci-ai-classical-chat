#!/usr/bin/env node
/**
 * Wink SBD probe (2026-11-22). Shadow only — nothing here routes
 * into parse.ts or turn.ts.
 *
 * Question: does wink-nlp's sentence boundary detection split
 * multi-sentence input correctly where AnSci's parser demonstrably
 * fails — the parser-comparison case `sentence-boundary`
 * ("I booked a room. It was expensive."), which AnSci collapses
 * into one graph with `book` marked passive — and does parsing
 * the Wink-split sentences separately repair that downstream?
 *
 * Sets:
 *   (a) the sentence-boundary case itself;
 *   (b) concatenations of the other single-sentence English
 *       parser-comparison cases (expected count = components);
 *   (c) an authored edge set (abbreviations, decimals, question+
 *       statement, exclamation, fragment, telegraphic, ellipsis,
 *       quoted speech). Expected splits are builder-labelled.
 *
 * Scoring per case: exact (split text matches expected exactly),
 * count-only (right number of sentences, different text), wrong.
 * Prints a table + one JSON summary line at the end.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "../dist/src/ansci/parse.js";
import { winkAvailable, winkSentences } from "../dist/src/ansci/wink.js";

const here = dirname(fileURLToPath(import.meta.url));

if (!winkAvailable()) {
  console.log("wink not installed — install the probe deps with:");
  console.log("  npm install (wink is a recorded dependency in package.json)");
  process.exit(2);
}

const norm = (s) => s.replace(/\s+/g, " ").trim();
function scoreSplit(text, expected) {
  const got = (winkSentences(text) ?? []).map(norm);
  const want = expected.map(norm);
  if (JSON.stringify(got) === JSON.stringify(want)) return { verdict: "exact", got };
  if (got.length === want.length) return { verdict: "count-only", got };
  return { verdict: "wrong", got };
}

/* ---------- (a) + (b): parser-comparison cases ---------- */
const cases = JSON.parse(
  readFileSync(resolve(here, "../data/ansci/parser-comparison-v1.json"), "utf8"),
);
const en = cases.filter((c) => c.language === "en");
const boundary = en.find((c) => c.id === "sentence-boundary");
const singles = en.filter((c) => c.id !== "sentence-boundary" && c.id !== "chat-register");

const rows = [];
function runSet(setName, items) {
  for (const item of items) {
    const { verdict, got } = scoreSplit(item.text, item.expected);
    rows.push({ set: setName, id: item.id, category: item.category ?? setName, verdict, got: got.length, want: item.expected.length });
    console.log(
      `${verdict.padEnd(10)} [${setName}] ${item.id}: got ${got.length} sentence(s), want ${item.expected.length}`,
    );
    if (verdict !== "exact") console.log(`           text: ${item.text}\n           got:  ${JSON.stringify(got)}`);
  }
}

runSet("a-boundary", [
  { id: boundary.id, text: boundary.text, expected: ["I booked a room.", "It was expensive."] },
]);

const concatItems = [];
for (let i = 0; i < singles.length; i++) {
  const a = singles[i];
  const b = singles[(i + 1) % singles.length];
  concatItems.push({
    id: `${a.id}+${b.id}`,
    text: `${a.text} ${b.text}`,
    expected: [a.text, b.text],
  });
}
for (let i = 0; i + 2 < singles.length; i += 3) {
  const trio = singles.slice(i, i + 3);
  concatItems.push({
    id: trio.map((c) => c.id).join("+"),
    text: trio.map((c) => c.text).join(" "),
    expected: trio.map((c) => c.text),
  });
}
runSet("b-concat", concatItems);

/* ---------- (c): authored edge set (builder-labelled) ---------- */
const edge = [
  { id: "abbrev-dr", category: "abbreviation", text: "Dr. Smith booked a room. It was expensive.", expected: ["Dr. Smith booked a room.", "It was expensive."] },
  { id: "abbrev-us", category: "abbreviation", text: "The U.S. team arrived. They stayed.", expected: ["The U.S. team arrived.", "They stayed."] },
  { id: "abbrev-mr-mrs", category: "abbreviation", text: "Mr. Jones and Mrs. Lee arrived. They booked rooms.", expected: ["Mr. Jones and Mrs. Lee arrived.", "They booked rooms."] },
  { id: "decimal-in-split", category: "decimal", text: "It cost 3.5 dollars. He paid it.", expected: ["It cost 3.5 dollars.", "He paid it."] },
  { id: "decimal-single", category: "decimal", text: "The price is 3.5 dollars.", expected: ["The price is 3.5 dollars."] },
  { id: "question-statement", category: "question+statement", text: "Could you book a room? I need it tonight.", expected: ["Could you book a room?", "I need it tonight."] },
  { id: "exclamation", category: "exclamation", text: "What a view! The room was lovely.", expected: ["What a view!", "The room was lovely."] },
  { id: "fragment", category: "fragment", text: "Flights, please.", expected: ["Flights, please."] },
  { id: "telegraphic", category: "telegraphic", text: "need hotel asap", expected: ["need hotel asap"] },
  { id: "ellipsis", category: "ellipsis", text: "Well... I suppose so. Book it then.", expected: ["Well... I suppose so.", "Book it then."] },
  { id: "quoted-two", category: "quoted speech", text: '"Book the room," she said. "It looks fine."', expected: ['"Book the room," she said.', '"It looks fine."'] },
  { id: "quoted-mid", category: "quoted speech", text: 'She said "book the room." He did.', expected: ['She said "book the room."', "He did."] },
  { id: "single", category: "single", text: "I booked a room.", expected: ["I booked a room."] },
];
runSet("c-edge", edge);

/* ---------- per-category summary ---------- */
const byCategory = new Map();
for (const r of rows) {
  const k = r.category;
  if (!byCategory.has(k)) byCategory.set(k, { exact: 0, countOnly: 0, wrong: 0, n: 0 });
  const c = byCategory.get(k);
  c.n++;
  if (r.verdict === "exact") c.exact++;
  else if (r.verdict === "count-only") c.countOnly++;
  else c.wrong++;
}
console.log("\nPer-category:");
for (const [k, c] of byCategory) {
  console.log(`  ${k.padEnd(20)} n=${c.n} exact=${c.exact} count-only=${c.countOnly} wrong=${c.wrong}`);
}
const totals = rows.reduce(
  (a, r) => ({ ...a, [r.verdict === "count-only" ? "countOnly" : r.verdict]: a[r.verdict === "count-only" ? "countOnly" : r.verdict] + 1 }),
  { exact: 0, countOnly: 0, wrong: 0 },
);

/* ---------- downstream: parse(whole) vs parse(wink sentences) ---------- */
function summarise(text) {
  try {
    const p = parse(text, "en");
    const nodes = p.meaning.nodes;
    const root = nodes.find((n) => n.id === p.meaning.rootId);
    const book = nodes.find((n) => n.lemma === "book");
    const expensive = nodes.find((n) => n.lemma === "expensive");
    const expensiveEdge = expensive
      ? p.meaning.edges.find((e) => e.to === expensive.id || e.from === expensive.id)
      : undefined;
    return {
      root: root?.lemma ?? null,
      bookVoice: book?.states?.voice ?? null,
      nodes: nodes.map((n) => n.lemma),
      expensive: expensive
        ? { isRoot: expensive.id === p.meaning.rootId, edge: expensiveEdge ? `${expensiveEdge.relation}` : null }
        : null,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
const whole = summarise(boundary.text);
const parts = winkSentences(boundary.text) ?? [];
const split = parts.map((s) => ({ text: s, ...summarise(s) }));
console.log("\nDownstream (sentence-boundary case):");
console.log(`  parse(whole)        : ${JSON.stringify(whole)}`);
for (const s of split) console.log(`  parse(${JSON.stringify(s.text)}): ${JSON.stringify({ root: s.root, bookVoice: s.bookVoice, nodes: s.nodes, expensive: s.expensive })}`);
const repaired =
  whole.bookVoice === "passive" &&
  split[0]?.bookVoice === "active" &&
  split[1]?.expensive?.isRoot === true;
console.log(`  failure repaired by split-parse: ${repaired}`);

console.log("\n" + JSON.stringify({ probe: "wink-sbd", totals, n: rows.length, downstream: { whole, split, repaired } }));
