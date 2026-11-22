#!/usr/bin/env node
/** Gate harness: WASM Link Grammar adapter vs Foundry ground truth.
 *
 * For every turn in the English Foundry fixtures, runs the narrow
 * adapter (src/ansci/linkgrammar-adapter.ts) on the parser's own
 * tokens and judges each candidate:
 *
 * - CORRECT: a roles expect block (or the MASC role mapping)
 *   asserts the same predicate/participant/role.
 * - ERROR: a forbiddenRoles entry asserts it, a roles entry gives
 *   the same pair an incompatible role, or AnSci's own graph
 *   gives the same pair an incompatible relation.
 * - AGREE: no ground truth either way, but AnSci's graph carries
 *   a compatible edge (same verb and argument lemmas).
 * - DIVERGE: the parser assigns the role-family elsewhere.
 * - NOVEL: neither ground truth nor parser says anything.
 * - ABSTAIN: the adapter proposed nothing (recovered, failed,
 *   or a complete linkage with no clear S/O).
 * - UNMAPPED: a candidate token has no AnSci node (cannot judge).
 *
 * Patient-family compatibility: an adapter `patient` candidate
 * matches AnSci/roles relations patient, theme, or recipient.
 *
 * GATE: PASS iff errors == 0. Abstentions are tolerated and
 * counted — the positional parser remains the fallback.
 *
 * Usage: npm run build && node scripts/ansci-linkgrammar-adapter-gate.mjs
 * Writes loop/foundry-results/linkgrammar-adapter-gate-<date>.json
 * (working output, not committed) and prints the verdict.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { adaptLinkGrammarSyntax } from "../dist/src/ansci/linkgrammar-adapter.js";
import { enTokenize, parse } from "../dist/src/ansci/parse.js";

const FIXTURES = [
  "english-baseline.json",
  "english-development.json",
  "english-ewt-scout-v1.json",
  "english-fresh-ai-v1.json",
  "english-initial-adverbs-v1.json",
  "english-introductory-pp-v1.json",
  "english-masc-scout-v1.json",
  "english-time.json",
];

const ROLE_FAMILY = { agent: ["agent"], patient: ["patient", "theme", "recipient"] };

const compatible = (candidateKind, relation) =>
  (ROLE_FAMILY[candidateKind] ?? []).includes(relation);

const lower = (s) => String(s ?? "").toLowerCase();

function tokenLemmaMap(p) {
  const map = new Map();
  for (const n of p.meaning.nodes ?? []) {
    for (const t of p.realizes?.[n.id] ?? []) {
      if (!map.has(t)) map.set(t, n.lemma);
    }
  }
  return map;
}

function ansciEdges(p) {
  const byId = new Map((p.meaning.nodes ?? []).map((n) => [n.id, n.lemma]));
  return (p.meaning.edges ?? []).map((e) => ({
    from: lower(byId.get(e.from)),
    relation: e.relation,
    to: lower(byId.get(e.to)),
  }));
}

function judgeCandidate(cand, verbLemma, argLemma, roles, forbidden, edges) {
  const want = { predicate: verbLemma, participant: argLemma };
  if (
    roles.some(
      (r) =>
        lower(r.predicate) === want.predicate &&
        lower(r.participant) === want.participant &&
        compatible(cand.kind, r.role),
    )
  )
    return "CORRECT";
  if (
    forbidden.some(
      (r) =>
        lower(r.predicate) === want.predicate &&
        lower(r.participant) === want.participant &&
        compatible(cand.kind, r.role),
    )
  )
    return "ERROR";
  if (
    roles.some(
      (r) =>
        lower(r.predicate) === want.predicate &&
        lower(r.participant) === want.participant,
    )
  )
    return "ERROR";
  const samePair = edges.filter((e) => e.from === want.predicate && e.to === want.participant);
  if (samePair.some((e) => compatible(cand.kind, e.relation))) return "AGREE";
  if (samePair.length > 0) return "ERROR";
  const familyElsewhere = edges.some(
    (e) => e.from === want.predicate && compatible(cand.kind, e.relation),
  );
  return familyElsewhere ? "DIVERGE" : "NOVEL";
}

const roleMapping = JSON.parse(
  readFileSync("loop/foundry-cases/masc-ansci-role-mapping-v1.json", "utf8"),
);
const mappedByCase = new Map();
for (const m of roleMapping.mappings ?? []) {
  for (const id of m.caseIds ?? []) mappedByCase.set(id, m);
}

const rows = [];
for (const file of FIXTURES) {
  const fixture = JSON.parse(readFileSync(`loop/foundry-cases/${file}`, "utf8"));
  for (const c of fixture.cases ?? []) {
    for (const t of c.turns ?? []) {
      const { tokens } = enTokenize(t.input);
      let p = null;
      try {
        p = parse(t.input, "en");
      } catch (e) {
        rows.push({ fixture: file, id: c.id, turn: t.id, text: t.input, parseError: String(e?.message ?? e) });
        continue;
      }
      const lemmas = tokenLemmaMap(p);
      const edges = ansciEdges(p);
      const adapter = await adaptLinkGrammarSyntax(t.input, tokens);
      const roles = t.expect?.roles ?? [];
      const forbidden = t.expect?.forbiddenRoles ?? [];
      const mapping = mappedByCase.get(c.id);
      const verdicts = [];
      for (const cand of adapter.candidates ?? []) {
        const verbLemma = lower(lemmas.get(cand.verbToken));
        const argLemma = lower(lemmas.get(cand.argToken));
        if (!verbLemma) {
          // The parser built no predicate node (existential,
          // copular-question restructuring): nothing to anchor
          // the judgment to.
          verdicts.push({ candidate: cand, verdict: "UNMAPPED" });
          continue;
        }
        if (!argLemma) {
          // Anchored verb, argument the parser never noded
          // ("Who opened the door?" leaves the door unattached):
          // adapter-novel by construction.
          verdicts.push({
            candidate: { ...cand, verbLemma, argLemma: null },
            verdict: "NOVEL",
          });
          continue;
        }
        let verdict = judgeCandidate(cand, verbLemma, argLemma, roles, forbidden, edges);
        // MASC role mapping as independent ground truth:
        // A0 head must take agent, A1 head a patient-family role.
        if (mapping && verdict !== "ERROR") {
          const a0head = lower(caseHead(c, "A0_head"));
          const a1head = lower(caseHead(c, "A1_head"));
          if (cand.kind === "agent" && a0head) {
            verdict = argLemma === a0head ? "CORRECT" : "ERROR";
          } else if (cand.kind === "patient" && a1head) {
            verdict = argLemma === a1head ? "CORRECT" : verdict === "ERROR" ? "ERROR" : "AGREE";
          }
        }
        verdicts.push({
          candidate: { ...cand, verbLemma, argLemma },
          verdict,
        });
      }
      rows.push({
        fixture: file,
        id: c.id,
        turn: t.id,
        text: t.input,
        status: c.status ?? null,
        voice: t.expect?.voice ?? null,
        interrogative: /\?\s*$/.test(t.input),
        adapterStatus: adapter.status,
        nullCount: adapter.nullCount ?? null,
        linkages: adapter.linkages ?? 0,
        error: adapter.error ?? null,
        verdicts,
        abstained: (adapter.candidates ?? []).length === 0,
      });
    }
  }
}

function caseHead(c, key) {
  return c.sourceAnnotation?.[key] ?? null;
}

const counts = { CORRECT: 0, ERROR: 0, AGREE: 0, DIVERGE: 0, NOVEL: 0, UNMAPPED: 0 };
let abstains = 0;
let recovered = 0;
let failed = 0;
for (const r of rows) {
  if (!r.verdicts) continue;
  if (r.abstained) abstains++;
  if (r.adapterStatus === "recovered") recovered++;
  if (r.adapterStatus === "failed") failed++;
  for (const v of r.verdicts) counts[v.verdict] = (counts[v.verdict] ?? 0) + 1;
}
const byFixture = {};
for (const r of rows) {
  const b = (byFixture[r.fixture] ??= { turns: 0, correct: 0, error: 0, abstain: 0 });
  b.turns++;
  for (const v of r.verdicts ?? []) {
    if (v.verdict === "CORRECT" || v.verdict === "AGREE") b.correct++;
    if (v.verdict === "ERROR") b.error++;
  }
  if (r.abstained) b.abstain++;
}
const errors = rows.flatMap((r) =>
  (r.verdicts ?? [])
    .filter((v) => v.verdict === "ERROR")
    .map((v) => ({ id: r.id, turn: r.turn, text: r.text, candidate: v.candidate })),
);
const verdict = errors.length === 0 ? "PASS" : "FAIL";
const report = {
  schemaVersion: 1,
  gate: "adapter propose-only; PASS iff errors == 0",
  verdict,
  summary: {
    turns: rows.length,
    candidates: Object.values(counts).reduce((a, b) => a + b, 0),
    ...counts,
    abstains,
    recovered,
    failed,
  },
  byFixture,
  errors,
  rows,
};
const stamp = new Date().toISOString().slice(0, 10);
const outPath = `loop/foundry-results/linkgrammar-adapter-gate-${stamp}.json`;
writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ verdict, summary: report.summary, byFixture, outPath }, null, 1));
if (verdict !== "PASS") process.exitCode = 1;
