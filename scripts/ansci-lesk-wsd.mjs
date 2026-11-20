#!/usr/bin/env node
/**
 * ansci-lesk-wsd.mjs — the targeted word-sense check for the Lesk
 * ranking build (docs/ansci/lesk-report.md).
 *
 * Sixteen sentences whose correct sense is determined by context,
 * authored for this check in the style of the sense-challenge sets
 * (builder-authored, internal evidence — not a C.5 set). Each case
 * names the expected synset BY ID, chosen from the lemma's synsets
 * before the run. Two rankers are scored on identical inputs:
 *  - LESK: leskSenseScores' total (adapted gloss overlap + the
 *    most-frequent-sense prior), top-ranked synset wins.
 *  - MFS: the prior alone (argmax prior; ties broken by extract
 *    order n, a, v, r then sense index) — the "just pick the most
 *    frequent sense" baseline Lesk must beat to earn its place.
 * Context lemmas are the sentence's content lemmas as the parser
 * would supply them (hand-listed per case, target excluded).
 *
 * Run: npm run build && node scripts/ansci-lesk-wsd.mjs
 */
import { leskSenseScores } from "../dist/src/ansci/lesk.js";
import { getDefaultExtract } from "../dist/src/wordnet.js";

const ex = getDefaultExtract();
const glossOf = (id) => ex.synsets.find((s) => s.id === id)?.gloss ?? "?";

// [lemma, sentence, context lemmas, expected synset id, reading]
const CASES = [
  ["cold", "The cold wind froze the lake.", ["wind", "freeze", "lake"], "wn-a01258433", "temperature (adjective)"],
  ["cold", "She stayed home with a bad cold and a fever.", ["stay", "home", "fever"], "wn-n14389489", "illness (common cold)"],
  ["bank", "He sat on the bank of the river and watched the water.", ["sit", "river", "watch", "water"], "wn-n09378458", "river bank"],
  ["bank", "She deposited her money in the bank.", ["deposit", "money"], "wn-n08574001", "financial institution"],
  ["bat", "The bat flew out of the cave at dusk.", ["fly", "cave", "dusk"], "wn-n02174276", "animal"],
  ["bat", "He swung the bat and hit the ball.", ["swing", "hit", "ball"], "wn-n02852244", "club"],
  ["spring", "The spring flowers bloom in the warm months.", ["flower", "bloom", "warm", "month"], "wn-n15492835", "season"],
  ["spring", "The spring in the old watch finally broke.", ["old", "watch", "break"], "wn-n04352383", "coil"],
  ["spring", "Clear water bubbled from the spring in the rocks.", ["clear", "water", "bubble", "rock"], "wn-n09609392", "water source"],
  ["rock", "They sat on a large rock by the road.", ["sit", "large", "road"], "wn-n09581945", "stone"],
  ["crane", "The crane lifted the heavy steel beams.", ["lift", "heavy", "steel", "beam"], "wn-n03176746", "machine"],
  ["crane", "A crane flew over the marsh.", ["fly", "marsh"], "wn-n02046895", "bird"],
  ["match", "He lit the match and started the fire.", ["light", "start", "fire"], "wn-n03785863", "fire lighter"],
  ["match", "The football match ended in a draw.", ["football", "end", "draw"], "wn-n07615050", "contest"],
  ["light", "The light from the lamp filled the room.", ["lamp", "fill", "room"], "wn-n03721199", "illumination device"],
  ["novel", "She wrote a novel about the war.", ["write", "war"], "wn-n06462925", "book"],
];

let leskPass = 0;
let mfsPass = 0;
const rows = [];
for (const [lemma, sentence, contextLemmas, expectedId, reading] of CASES) {
  const scores = leskSenseScores(lemma, sentence.split(/\s+/), contextLemmas);
  const byLesk = [...scores].sort((a, b) => b.total - a.total);
  const byPrior = [...scores].sort((a, b) => b.prior - a.prior);
  const leskOk = byLesk[0].synsetId === expectedId;
  const mfsOk = byPrior[0].synsetId === expectedId;
  if (leskOk) leskPass++;
  if (mfsOk) mfsPass++;
  rows.push({ lemma, sentence, reading, expectedId, top: byLesk[0], runnerUp: byLesk[1], leskOk, mfsOk });
}

for (const r of rows) {
  console.log(`${r.leskOk ? "PASS" : "FAIL"} ${r.lemma} — ${r.reading}`);
  console.log(`  sentence: ${r.sentence}`);
  console.log(`  expected: ${r.expectedId} "${glossOf(r.expectedId)}"`);
  console.log(`  lesk top: ${r.top.synsetId} [${r.top.pos} sense ${r.top.sense}] total=${r.top.total.toFixed(2)} (sentence=${r.top.sentenceScore}, context=${r.top.contextScore.toFixed(2)}, prior=${r.top.prior.toFixed(2)}) "${glossOf(r.top.synsetId)}"`);
  console.log(`  runner-up: ${r.runnerUp.synsetId} total=${r.runnerUp.total.toFixed(2)} "${glossOf(r.runnerUp.synsetId)}"`);
  console.log(`  mfs (prior alone): ${r.mfsOk ? "also correct" : "wrong"}`);
}
console.log(`\nLesk: ${leskPass}/${CASES.length} · MFS prior alone: ${mfsPass}/${CASES.length}`);
