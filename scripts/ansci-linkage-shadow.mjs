#!/usr/bin/env node
/**
 * ansci-linkage-shadow.mjs — the coverage slice's shadow
 * measurement: run the bounded Link Grammar solver (shadow mode)
 * over the parser-comparison cases plus a sample of ordinary
 * chat sentences drawn from the repo's challenge/transcript
 * material, and report per-sentence status, linkage structure,
 * disjunct counts, bounds hit, and wall time. This is a
 * diagnostic, not a benchmark score: linkage counts under the
 * solver's stated leniencies are not upstream's counts, and a
 * complete linkage is structure evidence, not a meaning.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "../dist/src/ansci/parse.js";
import { solveLinkage } from "../dist/src/ansci/linkage.js";
import { enableWordnetLexicon } from "../dist/src/ansci/wordnet-lex.js";

enableWordnetLexicon(true);
const here = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(resolve(here, "../data/ansci/parser-comparison-v1.json"), "utf8"));

/* Ordinary chat sentences: greetings, requests, statements and
 * questions of the shapes the transcript/challenge material
 * exercises, at chat length. */
const CHAT_SAMPLE = [
  "Hello, how are you?",
  "Thank you very much.",
  "What is your name?",
  "The garden is beautiful in spring.",
  "She reads a book every day.",
  "The children are playing in the garden.",
  "He gave her a letter yesterday.",
  "We watched the rain fall all morning.",
  "The old man walks slowly to the market.",
  "Birds sing at dawn.",
  "The soup tastes good.",
  "My brother lives in a small village.",
  "The students asked the teacher a question.",
  "Winter is coming soon.",
  "The cat sleeps on the warm mat.",
];

function tokenizeLikeParser(text) {
  // The shadow solver takes the parser's own tokens; recover
  // them by solving over a rough split only for the standalone
  // rows — the parse-based rows below carry the real record.
  return text.replace(/([.?!,;:])/g, " $1 ").split(/\s+/).filter(Boolean);
}

const rows = [];
for (const item of cases) {
  if (item.language !== "en") continue;
  const t0 = performance.now();
  let shadow;
  let parsed = false;
  try {
    const p = parse(item.text, "en");
    parsed = true;
    shadow = p.linkageShadow;
  } catch {
    shadow = solveLinkage(tokenizeLikeParser(item.text));
  }
  const ms = performance.now() - t0;
  rows.push({ set: "comparison", id: item.id, text: item.text, parsed, ms, shadow });
}
for (const text of CHAT_SAMPLE) {
  const t0 = performance.now();
  let shadow;
  let parsed = false;
  try {
    const p = parse(text, "en");
    parsed = true;
    shadow = p.linkageShadow;
  } catch {
    shadow = solveLinkage(tokenizeLikeParser(text));
  }
  const ms = performance.now() - t0;
  rows.push({ set: "chat", id: text.slice(0, 24), text, parsed, ms, shadow });
}

for (const r of rows) {
  const s = r.shadow;
  if (!s) {
    console.log(JSON.stringify({ set: r.set, id: r.id, text: r.text, parsed: r.parsed, ms: Math.round(r.ms), shadow: "absent" }));
    continue;
  }
  console.log(
    JSON.stringify({
      set: r.set,
      id: r.id,
      text: r.text,
      parsed: r.parsed,
      ms: Math.round(r.ms),
      status: s.status,
      links: s.links.map((l) => `${s.tokens[l.left]}-${l.connector}-${s.tokens[l.right]}`),
      unused: s.unused,
      skipped: s.skipped,
      linkageCount: s.linkageCount,
      countCapped: s.countCapped,
      disjunctCost: s.disjunctCost,
      linkLength: s.linkLength,
      disjunctsGenerated: s.disjunctsGenerated,
      prunedDisjuncts: s.prunedDisjuncts,
      boundsHit: s.boundsHit,
      ...(s.note ? { note: s.note } : {}),
    }),
  );
}
const done = rows.filter((r) => r.shadow);
const complete = done.filter((r) => r.shadow.status === "complete").length;
console.error(
  `shadow measurement: ${done.length} rows, ${complete} complete, ` +
    `${done.filter((r) => r.shadow.status === "partial").length} partial, ` +
    `${done.filter((r) => r.shadow.status === "declined").length} declined, ` +
    `max ${Math.max(...rows.map((r) => r.ms)).toFixed(0)}ms per sentence (parse + shadow)`,
);
