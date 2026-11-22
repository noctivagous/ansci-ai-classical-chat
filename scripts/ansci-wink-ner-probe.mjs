#!/usr/bin/env node
/**
 * Wink NER + POS + lemma probe, alongside Link Grammar WASM and
 * AnSci's own parse (2026-11-22). Shadow only — no routing into
 * entities.ts or parse.ts.
 *
 * Cases are builder-labelled (~20): multiword names in several
 * positions, and noun/verb-ambiguous forms (plan, book, saw,
 * leaves, flies) in both readings. "San Francisco" and the New
 * York sentences reuse material already in the repo (parse.ts
 * comments and transcript reports use New York; San Francisco
 * appears in the geography/weather test material).
 *
 * Per case, side by side:
 *   (i)   wink entities() spans, wink custom-entity (gazetteer)
 *         spans, wink POS + lemma per token;
 *   (ii)  Link Grammar WASM first linkage (words + links);
 *   (iii) AnSci parse() — nodes/roles for the target words.
 *
 * Scored questions:
 *   (a) multiword names: does a wink span keep the name whole
 *       where AnSci splits it into separate nodes?
 *   (b) ambiguity: how often do wink POS and the LG WASM linkage
 *       agree on noun-vs-verb for the target, and how often does
 *       each match the labelled reading? (LG reading is read off
 *       the target's links: an S/O-family link as the nominal
 *       side vs the verbal side, subscripts .n/.v on the word.)
 *   (c) lemmas: does wink's lemma for an inflected target equal
 *       the lemma AnSci's parse assigns the same token?
 */
import { parse } from "../dist/src/ansci/parse.js";
import { winkAnalyse, winkAvailable, winkCustomEntities } from "../dist/src/ansci/wink.js";
import { parseSentenceWasm, ensureLinkGrammarLoaded } from "../dist/src/ansci/linkgrammar-wasm.js";

if (!winkAvailable()) {
  console.log("wink not installed — npm install (wink is a recorded dependency in package.json)");
  process.exit(2);
}
await ensureLinkGrammarLoaded();

const GAZETTEER = [
  { name: "place", patterns: ["[New] [York]", "[San] [Francisco]", "[Los] [Angeles]"] },
  { name: "person", patterns: ["[Mary] [Jones]", "[John] [Smith]"] },
];

/** kind: "name" (target = the multiword string) or "ambig" (target word + labelled reading). */
const CASES = [
  // multiword names
  { id: "ny-object-of-prep", kind: "name", text: "I booked a room in New York.", target: "New York" },
  { id: "ny-subject", kind: "name", text: "New York is expensive.", target: "New York" },
  { id: "ny-goal", kind: "name", text: "She flew to New York.", target: "New York" },
  { id: "ny-agent-context", kind: "name", text: "In New York the dog bit the man.", target: "New York" },
  { id: "sf-goal", kind: "name", text: "She flew to San Francisco.", target: "San Francisco" },
  { id: "sf-subject", kind: "name", text: "San Francisco is foggy.", target: "San Francisco" },
  { id: "person-subject", kind: "name", text: "Mary Jones booked a room.", target: "Mary Jones" },
  { id: "person-object", kind: "name", text: "I met Mary Jones in New York.", target: "Mary Jones" },
  // noun/verb ambiguity — labelled reading of the target word
  { id: "plan-noun", kind: "ambig", text: "My plan is simple.", target: "plan", reading: "noun" },
  { id: "plan-verb", kind: "ambig", text: "Can you help me plan a trip?", target: "plan", reading: "verb" },
  { id: "book-noun", kind: "ambig", text: "The book is expensive.", target: "book", reading: "noun" },
  { id: "book-verb", kind: "ambig", text: "I booked a room.", target: "booked", base: "book", reading: "verb" },
  { id: "book-verb-imp", kind: "ambig", text: "Book a room for me.", target: "book", reading: "verb" },
  { id: "saw-noun", kind: "ambig", text: "The saw is sharp.", target: "saw", reading: "noun" },
  { id: "saw-verb", kind: "ambig", text: "I saw the woman.", target: "saw", reading: "verb" },
  { id: "leaves-noun", kind: "ambig", text: "The leaves are green.", target: "leaves", base: "leaf", reading: "noun" },
  { id: "leaves-verb", kind: "ambig", text: "He leaves at noon.", target: "leaves", base: "leave", reading: "verb" },
  { id: "flies-noun", kind: "ambig", text: "The flies are annoying.", target: "flies", base: "fly", reading: "noun" },
  { id: "flies-verb", kind: "ambig", text: "The bird flies south.", target: "flies", base: "fly", reading: "verb" },
  { id: "room-noun-lemma", kind: "ambig", text: "I booked two rooms.", target: "rooms", base: "room", reading: "noun" },
];

function ansciTarget(text, targetWords) {
  try {
    const p = parse(text, "en");
    const nodes = p.meaning.nodes;
    const hits = nodes.filter((n) => targetWords.includes((n.form ?? n.lemma).toLowerCase()) || targetWords.includes(n.lemma.toLowerCase()));
    return {
      nodeCount: hits.length,
      nodes: nodes.map((n) => n.lemma),
      targets: hits.map((n) => ({
        lemma: n.lemma,
        form: n.form,
        role: n.role ?? null,
        edges: p.meaning.edges
          .filter((e) => e.from === n.id || e.to === n.id)
          .map((e) => {
            const other = nodes.find((x) => x.id === (e.from === n.id ? e.to : e.from));
            return `${e.relation}:${other?.lemma ?? "?"}`;
          }),
      })),
      root: nodes.find((n) => n.id === p.meaning.rootId)?.lemma ?? null,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Read a noun/verb verdict for the target out of an LG linkage. */
function lgReading(lg, target) {
  if (!lg || lg.ok !== true) return { reading: null, why: "no linkage" };
  const words = lg.words.map((w) => w.replace(/\[[^\]]*\]/g, ""));
  const idx = words.findIndex((w) => w.toLowerCase().replace(/\.(v|n|a|g|d|s|p)(\-[a-z]+)?$/i, "") === target.toLowerCase());
  if (idx < 0) return { reading: null, why: "target not in linkage words" };
  const word = words[idx];
  const sub = word.match(/\.([a-z]+)(?:-|$)/i)?.[1] ?? "";
  const links = lg.links.filter((l) => l.left === idx || l.right === idx).map((l) => l.label);
  // Subscript is the dictionary's own class evidence: .v/.g verb, .n noun.
  if (sub.startsWith("v") || sub === "g") return { reading: "verb", why: `subscript .${sub}`, links };
  if (sub.startsWith("n")) return { reading: "noun", why: `subscript .${sub}`, links };
  // Fall back to link families: S/O link where target is the nominal end
  // is hard to orient without verb identification; report links only.
  return { reading: null, why: `subscript '${sub || "none"}'`, links };
}

const results = [];
for (const c of CASES) {
  const wink = winkAnalyse(c.text);
  const custom = winkCustomEntities(c.text, GAZETTEER) ?? [];
  const lg = await parseSentenceWasm(c.text);
  const targetWords = c.kind === "name" ? c.target.toLowerCase().split(" ") : [c.target.toLowerCase()];
  const ansci = ansciTarget(c.text, targetWords);

  const row = { id: c.id, kind: c.kind, text: c.text, target: c.target };

  if (c.kind === "name") {
    row.winkBuiltinWhole = (wink?.entities ?? []).some((e) => e.value === c.target);
    row.winkCustomWhole = custom.some((e) => e.value === c.target);
    // Honest measure: how many AnSci nodes cover the name's words
    // (1 would mean whole; the observed parses give 2 — the head
    // noun plus the first word as a separate qualifying node).
    row.ansciNodeCountForName = ansci.targets?.length ?? null;
    row.ansciNodes = ansci.nodes;
  } else {
    const wt = wink?.tokens.find((t) => t.value.toLowerCase() === c.target.toLowerCase());
    row.winkPos = wt?.pos ?? null;
    row.winkReading = wt ? (wt.pos === "VERB" || wt.pos === "AUX" ? "verb" : wt.pos === "NOUN" || wt.pos === "PROPN" ? "noun" : wt.pos) : null;
    row.winkLemma = wt?.lemma ?? null;
    const lgR = lgReading(lg, c.target);
    row.lgReading = lgR.reading;
    row.lgWhy = lgR.why;
    row.labelled = c.reading;
    row.winkMatch = row.winkReading === c.reading;
    row.lgMatch = lgR.reading === c.reading;
    row.agree = row.winkReading !== null && lgR.reading !== null ? row.winkReading === lgR.reading : null;
    // (c) lemma: wink lemma vs AnSci's lemma for the same token, and vs the dictionary base form.
    const aTarget = ansci.targets?.[0];
    row.ansciLemma = aTarget?.lemma ?? null;
    row.lemmaMatchesAnsci = row.winkLemma !== null && row.ansciLemma !== null ? row.winkLemma.toLowerCase() === row.ansciLemma.toLowerCase() : null;
    row.lemmaMatchesBase = row.winkLemma !== null ? row.winkLemma.toLowerCase() === (c.base ?? c.target).toLowerCase() : null;
    row.ansciRole = aTarget?.role ?? null;
  }
  row.lgWords = lg?.ok ? lg.words : null;
  row.lgLinks = lg?.ok ? lg.links.map((l) => `${lg.words[l.left]}-${l.label}-${lg.words[l.right]}`) : null;
  results.push(row);
  console.log(JSON.stringify(row));
}

/* ---------- scores ---------- */
const nameRows = results.filter((r) => r.kind === "name");
const ambRows = results.filter((r) => r.kind === "ambig");
const count = (rows, f) => rows.filter(f).length;
console.log("\n=== Scores ===");
console.log(`(a) multiword names (n=${nameRows.length}):`);
console.log(`    wink built-in entities keep whole : ${count(nameRows, (r) => r.winkBuiltinWhole)}/${nameRows.length}`);
console.log(`    wink gazetteer (CER) keeps whole  : ${count(nameRows, (r) => r.winkCustomWhole)}/${nameRows.length}`);
console.log(`    AnSci nodes per name (want 1)     : ${nameRows.map((r) => `${r.id}=${r.ansciNodeCountForName}`).join(", ")}`);
console.log(`(b) noun/verb ambiguity (n=${ambRows.length}):`);
console.log(`    wink POS matches label : ${count(ambRows, (r) => r.winkMatch)}/${ambRows.length}`);
console.log(`    LG WASM matches label  : ${count(ambRows, (r) => r.lgMatch)}/${ambRows.length} (reading extractable for ${count(ambRows, (r) => r.lgReading !== null)}/${ambRows.length})`);
console.log(`    wink–LG agreement      : ${count(ambRows, (r) => r.agree === true)}/${count(ambRows, (r) => r.agree !== null)} comparable`);
console.log(`(c) lemmas (n=${ambRows.length}):`);
console.log(`    wink lemma == AnSci lemma : ${count(ambRows, (r) => r.lemmaMatchesAnsci === true)}/${count(ambRows, (r) => r.lemmaMatchesAnsci !== null)}`);
console.log(`    wink lemma == base form   : ${count(ambRows, (r) => r.lemmaMatchesBase === true)}/${ambRows.length}`);
console.log("\n" + JSON.stringify({ probe: "wink-ner-pos-lemma", name: { n: nameRows.length, builtin: count(nameRows, (r) => r.winkBuiltinWhole), cer: count(nameRows, (r) => r.winkCustomWhole) }, ambig: { n: ambRows.length, winkPos: count(ambRows, (r) => r.winkMatch), lg: count(ambRows, (r) => r.lgMatch), lgReadable: count(ambRows, (r) => r.lgReading !== null), agree: count(ambRows, (r) => r.agree === true), comparable: count(ambRows, (r) => r.agree !== null) }, lemma: { matchesAnsci: count(ambRows, (r) => r.lemmaMatchesAnsci === true), matchesBase: count(ambRows, (r) => r.lemmaMatchesBase === true) } }));
