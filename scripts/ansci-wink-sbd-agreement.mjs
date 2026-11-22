#!/usr/bin/env node
/**
 * Wink SBD agreement audit (2026-11-22, the SBD routing slice).
 *
 * BEFORE Wink SBD could be routed into splitTurnSegments' seat,
 * both splitters were run over a corpus assembled from repo
 * material and every disagreement enumerated and classified:
 *
 *   (a) wink-right   — the regex splitter is demonstrably wrong
 *                      (it cuts inside an abbreviation / initial,
 *                      or merges across a real boundary);
 *   (b) regex-right  — Wink is demonstrably wrong (it cuts a
 *                      continuation, or merges across a boundary
 *                      the marks plainly draw);
 *   (c) ambiguous    — genuinely different-but-defensible, or a
 *                      formatting-only difference (ellipsis
 *                      placement, quote attachment).
 *
 * Corpus (all repo material, English only — the ZH control in
 * parser-comparison is out of AnSci's current scope):
 *   pc:*        data/ansci/parser-comparison-v1.json EN texts
 *   concat:*    pairwise/trio concatenations of those texts
 *               (the SBD probe's set (b), re-derived)
 *   edge:*      the SBD probe's authored edge set (set (c),
 *               copied verbatim from ansci-wink-sbd-probe.mjs)
 *   probes:*    turn lines of scripts/probes/*.txt (comment and
 *               blank lines dropped)
 *   behaviour:* turns of test/fixtures/ansci-behaviour-cases.json
 *   family:*    an authored extension set added during the
 *               audit's own investigation: fragment first
 *               segments followed by a lowercase interrogative
 *               onset ("just got in. how is it going?" and kin),
 *               plus two controls Wink does split. Expected
 *               splits are builder-labelled (two segments —
 *               the full stop plainly draws the boundary).
 *
 * OUTCOME (2026-11-22): class (b) is NON-EMPTY and MATERIAL —
 * Wink systematically merges a fragment first segment with a
 * following lowercase interrogative sentence (1 corpus case in
 * the stock phatic conversation, 10/10 in the authored family),
 * and the merged segment parses under the fragment's root, so
 * the enquiry is never taken up as its own act. Under the
 * slice's stop rule, Wink SBD was NOT routed into
 * splitTurnSegments; the regex splitter stands unchanged. This
 * audit is the slice's deliverable.
 *
 * EXTENSION — THE HYBRID (2026-11-22, the SBD veto slice): the
 * owner chose the narrow hybrid (regex primary; Wink consulted
 * only to VETO a regex boundary whose left segment ends
 * abbreviation-shaped). This script now runs THREE splitters —
 * the verbatim regex copy, the Wink routed form, and the
 * PRODUCTION splitTurnSegments imported from dist (the hybrid
 * as shipped, not a copy) — and holds the hybrid to its
 * contract over the same corpus:
 *   (i)   on every class (b) text the hybrid equals the regex;
 *   (ii)  on every class (a) text the hybrid equals Wink;
 *   (iii) where regex and Wink agreed, the hybrid agrees;
 *   (iv)  on class (c) texts the hybrid's choice is reported.
 * A miss on (i) or (ii) fails the hybrid: this script then
 * exits 1. The two-splitter classification above remains a
 * measurement; the hybrid verdict is the gate.
 *
 * The regex side is a VERBATIM copy of splitTurnSegments from
 * src/ansci/turn.ts at e419b26 (the probes commit), mechanically
 * stripped of TypeScript annotations only — comments included,
 * so the copy can be diffed against its source. The Wink side
 * is winkSentences() (src/ansci/wink.ts) with the SAME two
 * post-passes the current splitter applies after its marks
 * pass (IMP-4(b) interrogative comma split; greeting peel),
 * copied into applyPostPasses() — the routing keeps those
 * post-passes on either base, so the audit compares the bases.
 *
 * Classification is by declared rules over the differing
 * boundaries (see classify()), with a small builder-labelled
 * override table for cases the rules cannot decide. Prints
 * every disagreement in full; ends with one JSON summary line.
 * Exit 0 when the hybrid (see EXTENSION below) meets its
 * contract, 1 when it misses; the two-splitter classification
 * itself remains a measurement.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { winkAvailable, winkSentences } from "../dist/src/ansci/wink.js";
import { splitTurnSegments } from "../dist/src/ansci/turn.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

if (!winkAvailable()) {
  console.log("wink not available — cannot run the agreement audit");
  process.exit(2);
}

/* ================= the regex splitter, verbatim at e419b26 ================= */
function splitTurnSegmentsRegexVerbatim(text) {
  const trimmed = text.trim();
  /* Segmentation by sentence marks, kept where the marks are
   * (IMP-1, the implementation programme, 2026-11-19): the
   * earlier form collected the punctuated parts and used them
   * only when they re-joined into the whole text exactly — so
   * a missing space after a period ("…chihuahua.It'll…",
   * "…back.big dogs…") or an unpunctuated tail ("…what a
   * bummer") discarded the segmentation whole and the turn fell
   * to the merged parse, whose token exit then sank it entire.
   * The marks are boundaries wherever they stand: text between
   * two boundaries that is not whitespace is a segment of its
   * own (the unpunctuated tail), and a boundary whose mark is a
   * decimal point (a digit on both sides) is no boundary at
   * all. Where coverage was exact before, the segments are the
   * same as before. */
  const boundaryRe = /[^.!?]+[.!?]+["')\]]*/g;
  const rawMatches = [];
  let m;
  while ((m = boundaryRe.exec(trimmed)) !== null) {
    rawMatches.push({ start: m.index, end: m.index + m[0].length });
  }
  const boundaries = [];
  let extendFrom;
  for (const r of rawMatches) {
    const punctAt = r.start + trimmed.slice(r.start, r.end).search(/[.?!]/);
    const isDecimal =
      trimmed[punctAt] === "." && /\d/.test(trimmed[punctAt - 1] ?? "") && /\d/.test(trimmed[r.end] ?? "");
    if (isDecimal) {
      // Not a boundary: the segment it belongs to runs on, and the
      // next real boundary's span extends back over it.
      if (extendFrom === undefined) extendFrom = r.start;
      continue;
    }
    boundaries.push({ start: extendFrom ?? r.start, end: r.end });
    extendFrom = undefined;
  }
  let segments;
  if (boundaries.length === 0) {
    segments = [trimmed];
  } else {
    segments = [];
    let cursor = 0;
    for (const bnd of boundaries) {
      const gap = trimmed.slice(cursor, bnd.start).trim();
      if (gap) segments.push(gap);
      segments.push(trimmed.slice(bnd.start, bnd.end).trim());
      cursor = bnd.end;
    }
    const tail = trimmed.slice(cursor).trim();
    if (tail) segments.push(tail);
    if (segments.length === 0) segments = [trimmed];
  }
  /* IMP-4(b) (the implementation programme, 2026-11-19): a
   * comma-joined telling + question is two acts in one
   * sentence's dress ("I put the salt in the soup, did I
   * mention the soup?"; P-042's "...iced tea, do you have
   * one?"). The merged parse drops the telling clause into
   * the question's root, the record never registers it, and
   * the question is then answered from a record the turn
   * itself should have written. Where a segment ends with
   * the question mark and a comma inside it opens an
   * interrogative clause — an auxiliary, modal, do-form or
   * wh-word at the clause's head — the comma is a segment
   * boundary of the sentence marks' kind: each part is
   * taken up by its own machinery, the telling registering
   * before the question is answered (the S5 principle —
   * content a merged parse dropped is carried by its
   * segment — at the clause boundary). The head before the
   * comma must carry at least two words, so a comma inside
   * a single question does not split it. */
  const INTERROGATIVE_ONSETS = new Set([
    "do", "did", "does", "can", "could", "will", "would", "is", "are", "was", "were",
    "have", "has", "had", "may", "might", "shall", "should", "who", "what", "when", "where", "why", "how",
  ]);
  const splitInterrogative = (s) => {
    if (!s.trimEnd().endsWith("?")) return [s];
    const commaAt = s.indexOf(",");
    if (commaAt < 0) return [s];
    const head = s.slice(0, commaAt).trim();
    const tail = s.slice(commaAt + 1).trim();
    if (head.split(/\s+/).length < 2) return [s];
    const onset = tail.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z']/g, "");
    if (!onset || !INTERROGATIVE_ONSETS.has(onset)) return [s];
    return [head, tail];
  };
  segments = segments.flatMap(splitInterrogative);
  const GREETING_HEAD = "(?:hello|hi|hey)(?:\\s+there)?|good morning|good afternoon|good evening|good night";
  const peel = (s) => {
    const m = s.match(new RegExp(`^(${GREETING_HEAD})\\s*,\\s*(.+)$`, "i"));
    if (m) return [`${m[1]}.`, m[2]];
    // The comma-less fused greeting (S2, the S programme,
    // 2026-11-19): a greeting head running straight into a
    // how-enquiry with no punctuation between ("good evening
    // how are you?", "hey there how are you today?") is the
    // same fusion the comma form draws, and segments the
    // same way — the head is a greeting phrase and the tail
    // must open with the enquiry's 'how'. A greeting head
    // before any other continuation is not peeled.
    const m2 = s.match(new RegExp(`^(${GREETING_HEAD})\\s+(how\\b.+)$`, "i"));
    return m2 ? [`${m2[1]}.`, m2[2]] : null;
  };
  if (segments.length === 1) {
    segments = peel(segments[0]) ?? segments;
  } else if (segments.length > 1) {
    const p = peel(segments[0]);
    if (p) segments = [...p, ...segments.slice(1)];
  }
  return segments;
}


/* ================= the Wink side: SBD + the same post-passes ================= */
function applyPostPasses(segments) {
  const INTERROGATIVE_ONSETS = new Set([
    "do", "did", "does", "can", "could", "will", "would", "is", "are", "was", "were",
    "have", "has", "had", "may", "might", "shall", "should", "who", "what", "when", "where", "why", "how",
  ]);
  const splitInterrogative = (s) => {
    if (!s.trimEnd().endsWith("?")) return [s];
    const commaAt = s.indexOf(",");
    if (commaAt < 0) return [s];
    const head = s.slice(0, commaAt).trim();
    const tail = s.slice(commaAt + 1).trim();
    if (head.split(/\s+/).length < 2) return [s];
    const onset = tail.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z']/g, "");
    if (!onset || !INTERROGATIVE_ONSETS.has(onset)) return [s];
    return [head, tail];
  };
  segments = segments.flatMap(splitInterrogative);
  const GREETING_HEAD = "(?:hello|hi|hey)(?:\\s+there)?|good morning|good afternoon|good evening|good night";
  const peel = (s) => {
    const m = s.match(new RegExp(`^(${GREETING_HEAD})\\s*,\\s*(.+)$`, "i"));
    if (m) return [`${m[1]}.`, m[2]];
    // The comma-less fused greeting (S2, the S programme,
    // 2026-11-19): a greeting head running straight into a
    // how-enquiry with no punctuation between ("good evening
    // how are you?", "hey there how are you today?") is the
    // same fusion the comma form draws, and segments the
    // same way — the head is a greeting phrase and the tail
    // must open with the enquiry's 'how'. A greeting head
    // before any other continuation is not peeled.
    const m2 = s.match(new RegExp(`^(${GREETING_HEAD})\\s+(how\\b.+)$`, "i"));
    return m2 ? [`${m2[1]}.`, m2[2]] : null;
  };
  if (segments.length === 1) {
    segments = peel(segments[0]) ?? segments;
  } else if (segments.length > 1) {
    const p = peel(segments[0]);
    if (p) segments = [...p, ...segments.slice(1)];
  }
  return segments;
}

function splitTurnSegmentsWinkRouted(text) {
  const trimmed = text.trim();
  const base = winkSentences(trimmed);
  if (!base) return null;
  const cleaned = base.map((s) => s.trim()).filter((s) => s.length > 0);
  if (cleaned.length === 0) return [trimmed];
  return applyPostPasses(cleaned);
}

/* ================= corpus ================= */
const corpus = [];
{
  const cases = JSON.parse(readFileSync(resolve(root, "data/ansci/parser-comparison-v1.json"), "utf8"));
  const en = cases.filter((c) => c.language === "en");
  for (const c of en) corpus.push({ id: `pc:${c.id}`, text: c.text });
  const singles = en.filter((c) => c.id !== "sentence-boundary" && c.id !== "chat-register");
  for (let i = 0; i < singles.length; i++) {
    const a = singles[i];
    const b = singles[(i + 1) % singles.length];
    corpus.push({ id: `concat:${a.id}+${b.id}`, text: `${a.text} ${b.text}` });
  }
  for (let i = 0; i + 2 < singles.length; i += 3) {
    const trio = singles.slice(i, i + 3);
    corpus.push({ id: `concat:${trio.map((c) => c.id).join("+")}`, text: trio.map((c) => c.text).join(" ") });
  }
}
const edge = [
  { id: "abbrev-dr", text: "Dr. Smith booked a room. It was expensive." },
  { id: "abbrev-us", text: "The U.S. team arrived. They stayed." },
  { id: "abbrev-mr-mrs", text: "Mr. Jones and Mrs. Lee arrived. They booked rooms." },
  { id: "decimal-in-split", text: "It cost 3.5 dollars. He paid it." },
  { id: "decimal-single", text: "The price is 3.5 dollars." },
  { id: "question-statement", text: "Could you book a room? I need it tonight." },
  { id: "exclamation", text: "What a view! The room was lovely." },
  { id: "fragment", text: "Flights, please." },
  { id: "telegraphic", text: "need hotel asap" },
  { id: "ellipsis", text: "Well... I suppose so. Book it then." },
  { id: "quoted-two", text: '"Book the room," she said. "It looks fine."' },
  { id: "quoted-mid", text: 'She said "book the room." He did.' },
  { id: "single", text: "I booked a room." },
];
for (const e of edge) corpus.push({ id: `edge:${e.id}`, text: e.text });
{
  const dir = resolve(root, "scripts/probes");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".txt")).sort()) {
    const lines = readFileSync(resolve(dir, f), "utf8").split("\n");
    let n = 0;
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      n += 1;
      corpus.push({ id: `probes:${f}:${n}`, text: t });
    }
  }
}
{
  const cases = JSON.parse(readFileSync(resolve(root, "test/fixtures/ansci-behaviour-cases.json"), "utf8"));
  for (const c of cases) {
    (c.turns ?? []).forEach((t, i) => corpus.push({ id: `behaviour:${c.id}:${i + 1}`, text: t }));
  }
}

const family = [
  { id: "frag-how-is", text: "just got in. how is it going?" },
  { id: "frag-how-was", text: "just got in. how was it?" },
  { id: "frag-how-do", text: "just got in. how do you feel?" },
  { id: "frag-what-is", text: "just got in. what is up?" },
  { id: "frag-where", text: "just got in. where were you?" },
  { id: "frag-who", text: "just got in. who is there?" },
  { id: "frag-when", text: "just got in. when is dinner?" },
  { id: "frag-why", text: "just got in. why not?" },
  { id: "frag-can", text: "just got in. can you talk?" },
  { id: "frag-are", text: "just got in. are you ok?" },
  { id: "control-full-clause", text: "I am home. how are you?" },
  { id: "control-greeting", text: "hey. how's it going?" },
];
for (const f of family) corpus.push({ id: `family:${f.id}`, text: f.text });

/* ================= classification ================= */
const ABBREV_END = /(^|\s)(dr|mr|mrs|ms|st|jr|sr|prof|hon|fig|approx|dept|est|u\.s|u\.k|e\.g|i\.e|a\.m|p\.m|[A-Z])\.$/i;
function boundariesOf(segs) {
  // Boundary positions in the whitespace-normalised joined stream.
  const out = [];
  let acc = "";
  for (let i = 0; i < segs.length - 1; i++) {
    acc += (i ? " " : "") + segs[i].replace(/\s+/g, " ").trim();
    out.push(acc.length);
  }
  return out;
}
function classify(text, regexSegs, winkSegs) {
  const rb = new Set(boundariesOf(regexSegs));
  const wb = new Set(boundariesOf(winkSegs));
  const regexOnly = [...rb].filter((x) => !wb.has(x));
  const winkOnly = [...wb].filter((x) => !rb.has(x));
  const normJoin = (segs) => segs.join(" ").replace(/\s+/g, " ").trim();
  // Differing boundaries analysed against the segment that ends there.
  const segEndingAt = (segs, pos) => {
    let acc = "";
    for (let i = 0; i < segs.length; i++) {
      acc += (i ? " " : "") + segs[i].replace(/\s+/g, " ").trim();
      if (acc.length === pos) return segs[i];
      if (acc.length > pos) return null;
    }
    return null;
  };
  let sawA = false;
  let sawB = false;
  let sawC = false;
  const INTERROGATIVE_ONSET = /^(how|what|where|who|when|why|can|could|do|does|did|are|is|was|were|will|would|have|has|shall|should|may|might)\b/i;
  for (const pos of regexOnly) {
    const seg = segEndingAt(regexSegs, pos) ?? "";
    if (ABBREV_END.test(seg.trim())) sawA = true; // regex cut inside an abbreviation/initial
    else if (/\.\.\.$/.test(seg.trim()) || /…$/.test(seg.trim())) sawC = true; // ellipsis boundary: hesitation vs break is genuinely open
    else {
      // Did Wink's segment run on past this boundary into a new
      // sentence opening with an interrogative onset? Then Wink
      // merged across a plainly drawn boundary: regex right.
      const rest = normJoin(winkSegs).slice(pos).trim().replace(/^[.!?]+\s*/, "");
      if (INTERROGATIVE_ONSET.test(rest)) sawB = true;
      else sawC = true; // no abbreviation or interrogative story: needs the override table or stays ambiguous
    }
  }
  for (const pos of winkOnly) {
    const idx = boundariesOf(winkSegs).indexOf(pos);
    const next = winkSegs[idx + 1] ?? "";
    if (/^[a-z]/.test(next.trim())) sawB = true; // Wink cut and the continuation runs on lowercase: over-split
    else sawA = true; // Wink found a boundary (capitalised onset) the marks pass merged over
  }
  // Same boundaries, different segment text (quote/space attachment).
  if (regexOnly.length === 0 && winkOnly.length === 0) return "c";
  if (sawB) return "b";
  if (sawA && !sawC) return "a";
  if (sawA && sawC) return "c";
  return "c";
}
/* Builder-labelled overrides, applied after the rules, for cases
 * inspected by hand (id -> class). Filled from the audit's own
 * disagreement listing; each entry names its reason in the run
 * that produced it. Empty until the first run is inspected. */
const OVERRIDES = {
  // Inspected by hand: the regex cuts the initialism into
  // "The U." / "S." / "team arrived." — the same abbreviation
  // family as edge:abbrev-dr, which the rules do catch; the
  // boundary-position arithmetic drifts on initialisms (the
  // joined streams differ: "U. S." vs "U.S."), so the rule
  // could not see it. Wink is demonstrably right.
  "edge:abbrev-us": "a",
};

let agree = 0;
const counts = { a: 0, b: 0, c: 0 };
const disagreements = [];
/* The hybrid verdict: misses on the contract's clauses. */
const hybridMisses = { onAgree: [], onA: [], onB: [] };
const hybridCChoices = [];
for (const item of corpus) {
  const r = splitTurnSegmentsRegexVerbatim(item.text);
  const w = splitTurnSegmentsWinkRouted(item.text);
  const h = splitTurnSegments(item.text);
  const same = JSON.stringify(r) === JSON.stringify(w);
  if (same) {
    agree += 1;
    if (JSON.stringify(h) !== JSON.stringify(r)) {
      hybridMisses.onAgree.push({ id: item.id, text: item.text, regex: r, hybrid: h });
    }
    continue;
  }
  const cls = OVERRIDES[item.id] ?? classify(item.text, r, w);
  counts[cls] += 1;
  disagreements.push({ id: item.id, class: cls, text: item.text, regex: r, wink: w, hybrid: h });
  if (cls === "a" && JSON.stringify(h) !== JSON.stringify(w)) {
    hybridMisses.onA.push({ id: item.id, text: item.text, wink: w, hybrid: h });
  }
  if (cls === "b" && JSON.stringify(h) !== JSON.stringify(r)) {
    hybridMisses.onB.push({ id: item.id, text: item.text, regex: r, hybrid: h });
  }
  if (cls === "c") {
    hybridCChoices.push({
      id: item.id,
      choice: JSON.stringify(h) === JSON.stringify(r) ? "regex" : JSON.stringify(h) === JSON.stringify(w) ? "wink" : "neither",
    });
  }
}
console.log(`corpus: ${corpus.length} texts; agree ${agree}; disagree ${disagreements.length}`);
console.log(`classes: (a) wink-right ${counts.a}; (b) regex-right ${counts.b}; (c) ambiguous/equal ${counts.c}`);
for (const d of disagreements) {
  console.log(`\n[${d.class}] ${d.id}: ${JSON.stringify(d.text)}`);
  console.log(`  regex:  ${JSON.stringify(d.regex)}`);
  console.log(`  wink:   ${JSON.stringify(d.wink)}`);
  console.log(`  hybrid: ${JSON.stringify(d.hybrid)}`);
}
const hybridPass =
  hybridMisses.onAgree.length === 0 && hybridMisses.onA.length === 0 && hybridMisses.onB.length === 0;
console.log(`\nhybrid contract: (iii) agree-set misses ${hybridMisses.onAgree.length}; (ii) class (a) misses ${hybridMisses.onA.length}; (i) class (b) misses ${hybridMisses.onB.length}; (iv) class (c) choices ${JSON.stringify(hybridCChoices)}`);
console.log(`hybrid verdict: ${hybridPass ? "PASS" : "FAIL"}`);
for (const [clause, misses] of Object.entries(hybridMisses)) {
  for (const miss of misses) {
    console.log(`hybrid miss [${clause}] ${miss.id}: ${JSON.stringify(miss.text)}`);
    console.log(`  detail: ${JSON.stringify(miss)}`);
  }
}
console.log(JSON.stringify({ kind: "wink-sbd-agreement", corpus: corpus.length, agree, disagree: disagreements.length, classes: counts, ids: disagreements.map((d) => ({ id: d.id, class: d.class })), hybrid: { pass: hybridPass, misses: { onAgree: hybridMisses.onAgree.map((m) => m.id), onA: hybridMisses.onA.map((m) => m.id), onB: hybridMisses.onB.map((m) => m.id) }, cChoices: hybridCChoices } }));
if (!hybridPass) process.exit(1);
