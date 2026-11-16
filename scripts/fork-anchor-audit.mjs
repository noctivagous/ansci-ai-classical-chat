#!/usr/bin/env node
/**
 * fork-anchor-audit.mjs — anchor-quality audit of the WordNet
 * hypernym climb (2026-11-15). Dumps, for the census population
 * and for a named set of lemmas, every anchored candidate WITH its
 * full hypernym path (synset chain + glosses) as the REAL climb
 * computes it (climbAudit in wordnet-lex.ts — not a replica), so
 * waywardness is inspectable from the output, not asserted.
 *
 * Census definition (identical to the stage-4 census): lemmas
 * appearing in ≥3 distinct noun/adjective synsets of the extract;
 * candidates from climbCandidates; "ungated" = confidence ≥ the
 * join's gate. Prints: the pin report summary (which anchors are
 * pinned, by what route, and which remain unpinned), the census
 * counts, the distinct-element population, and full path dumps
 * for the named lemmas (the five wayward examples of the stage-4
 * report — rock, snap, kick, chalk, brass — plus the frozen-set
 * load-bearing words). Writes the full per-candidate dump to
 * docs/fork/anchor-audit-dump.jsonl.
 *
 * Run: npm run fork:anchor-audit (builds first).
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getDefaultExtract } from "../dist/src/wordnet.js";
import { anchorPinReport, climbAudit, climbCandidates } from "../dist/src/fork/wordnet-lex.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const NAMED = [
  // the five wayward examples named by the stage-4 report
  "rock", "snap", "kick", "chalk", "brass",
  // frozen-set load-bearing words (sense sets A and B, unit tests)
  "blow", "lettuce", "rest", "outpouring", "passion", "stock", "alabaster",
  // unit-test climbs
  "gale", "drizzle", "blizzard", "hurricane", "fury", "sleet",
];

function fmtTrail(hit) {
  return hit.trail
    .map((s) => `{${s.lemmas.join(", ")}} "${s.gloss}" [${s.id}]`)
    .join("\n      —IS_A→ ");
}

function dumpLemma(lemma) {
  console.log(`\n===== ${lemma} =====`);
  const senses = climbAudit(lemma);
  if (!senses.length) {
    console.log("  (no noun/adjective senses, or the table owns this concept)");
    return;
  }
  for (const s of senses) {
    console.log(`  [${s.pos} sense ${s.sense}] {${s.start.lemmas.join(", ")}} — "${s.start.gloss}" [${s.start.id}]`);
    if (s.hit) {
      const h = s.hit;
      console.log(`      —ANCHOR→ ${h.anchor} (${h.element} @${h.confidence}${h.gated ? ", GATED" : ""}) via ${h.via}, ${h.hops} hop(s)`);
      console.log(`      path: ${fmtTrail(h)}`);
    } else {
      console.log("      (no anchor within 6 hops)");
    }
  }
}

/* ---- pin report summary ---- */
const pins = anchorPinReport();
const byMode = new Map();
for (const p of pins) byMode.set(p.mode, (byMode.get(p.mode) ?? 0) + 1);
console.log("== Anchor pin report ==");
console.log(`anchors total: ${pins.length}`);
for (const [mode, n] of [...byMode.entries()].sort()) console.log(`  ${mode}: ${n}`);
const unpinned = pins.filter((p) => p.mode === "unpinned").map((p) => p.concept);
console.log(`unpinned anchors (legacy string match): ${unpinned.join(", ") || "(none)"}`);
const collisions = pins.flatMap((p) => p.collisions.map((c) => `${p.concept}: ${c}`));
console.log(`pin collisions (shared synsets, first-in-table wins): ${collisions.length}`);
for (const c of collisions) console.log(`  ${c}`);

/* ---- census ---- */
const ex = getDefaultExtract();
const lemmaSynsets = new Map();
ex.synsets.forEach((s, i) => {
  if (s.pos !== "n" && s.pos !== "a") return;
  for (const l of s.lemmas) {
    const key = l.toLowerCase();
    const set = lemmaSynsets.get(key) ?? new Set();
    set.add(i);
    lemmaSynsets.set(key, set);
  }
});
const population = [...lemmaSynsets.entries()].filter(([, set]) => set.size >= 3).map(([k]) => k).sort();
console.log("\n== Census ==");
console.log(`population (lemmas in ≥3 noun/adjective synsets): ${population.length}`);

let anyUngated = 0;
let twoOrMore = 0;
const distinct = [];
const dumpRows = [];
for (const lemma of population) {
  const cands = climbCandidates(lemma);
  if (cands.length) {
    for (const s of climbAudit(lemma)) {
      if (s.hit) {
        dumpRows.push(JSON.stringify({
          lemma, pos: s.pos, sense: s.sense,
          anchor: s.hit.anchor, element: s.hit.element, confidence: s.hit.confidence,
          hops: s.hit.hops, gated: s.hit.gated, via: s.hit.via,
          trail: s.hit.trail,
        }));
      }
    }
  }
  const ungated = cands.filter((c) => !c.gated);
  if (ungated.length) anyUngated++;
  if (ungated.length >= 2) twoOrMore++;
  if (new Set(ungated.map((c) => c.element)).size >= 2) {
    distinct.push(`${lemma} [${ungated.map((c) => `${c.element}@${c.confidence} via ${c.anchor}`).join(", ")}]`);
  }
}
console.log(`any ungated anchored candidate: ${anyUngated}`);
console.log(`≥2 ungated candidates: ${twoOrMore}`);
console.log(`candidates in distinct elements: ${distinct.length}`);
for (const d of distinct) console.log(`  ${d}`);

writeFileSync(join(root, "docs/fork/anchor-audit-dump.jsonl"), dumpRows.join("\n") + "\n");
console.log(`\nfull per-candidate dump: docs/fork/anchor-audit-dump.jsonl (${dumpRows.length} rows)`);

/* ---- named lemmas ---- */
console.log("\n== Named lemmas (full paths) ==");
for (const lemma of NAMED) dumpLemma(lemma);
