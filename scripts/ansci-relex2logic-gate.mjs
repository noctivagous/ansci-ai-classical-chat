#!/usr/bin/env node
/**
 * Gate: Relex2Logic shadow records (src/ansci/relex2logic.ts).
 *
 * Each case names the upstream rule it exercises (vendored in
 * vendor/relex2logic/, transcribed in
 * src/ansci/relex2logic-rules.ts) and the output shape the
 * rule's grounded schema builds upstream, mapped to AnSci's
 * ParsedSentence / meaning-graph vocabulary. Assertions check
 * the mapped shape: predicate lemma, argument edges by slot
 * relation, the `query` record for questioned roles (never an
 * assertion with a null filler), negation as a predicate mark,
 * complement as a clause attachment record.
 *
 * Known upstream-faithful gap: "Where do you go every night?"
 * — RelEx's semantic pass reads "night" as the adverbial head
 * (_advmod(go, night)) and produces no _%atLocation, so
 * where-q cannot fire; the same input in upstream RelEx has
 * the same native output. The where-q case uses the input
 * where the location dependency exists ("Where did John put
 * it?", _%atLocation(put, where) — verified in the native
 * gate's family).
 *
 * Usage: node scripts/ansci-relex2logic-gate.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { relex2logic } = await import(
  path.join(root, "dist", "src", "ansci", "relex2logic.js")
);

function edgesOf(rec) {
  if (!rec.graph) return [];
  const byId = new Map(rec.graph.nodes.map((n) => [n.id, n]));
  const rootNode = byId.get(rec.graph.rootId);
  // Root lemma as the instances carry it (the tagging lemma of
  // the surface instance: "ate" -> "eat", "chased" -> "chase").
  return rec.graph.edges.map(
    (e) => `${rootNode.lemma} -${e.relation}-> ${byId.get(e.to).lemma}`,
  );
}

const CASES = [
  {
    text: "Johnny ate the dog.",
    rule: "svo",
    source: "rules/svo.scm — SVO-rule: EvaluationLink over (subj, obj)",
    expect: (recs) => {
      const r = recs.find((x) => x.rule === "svo");
      return r && edgesOf(r).join(";") === "eat -agent-> Johnny;eat -theme-> dog" && !r.query;
    },
  },
  {
    text: "You suck.",
    rule: "SV",
    source: "rules/SV.scm — SV-rule over _subj alone",
    expect: (recs) => {
      const r = recs.find((x) => x.rule === "SV");
      return r && edgesOf(r).join(";") === "suck -agent-> you";
    },
  },
  {
    text: "John gave Mary the book.",
    rule: "SVIO1",
    source: "rules/SVIO1.scm — SVIO-rule: EvaluationLink over (subj, iobj, obj)",
    expect: (recs) => {
      const r = recs.find((x) => x.rule === "SVIO1");
      return r && edgesOf(r).join(";") === "give -agent-> John;give -recipient-> Mary;give -theme-> book";
    },
  },
  {
    text: "The dog was chased by the cat.",
    rule: "passive",
    source: "rules/passive.scm — passive-rule2: EvaluationLink over (_$qVar, obj); agent is a fresh variable upstream",
    expect: (recs) => {
      const r = recs.find((x) => x.rule === "passive");
      return r && edgesOf(r).join(";") === "chase -theme-> dog" && r.query?.relation === "agent";
    },
  },
  {
    text: "She is happy.",
    rule: "SP",
    source: "rules/SP.scm — SV-rule shape over _predadj: the adjective predicated of the subject",
    expect: (recs) => {
      const r = recs.find((x) => x.rule === "SP");
      return r && edgesOf(r).join(";") === "happy -predicate-> she";
    },
  },
  {
    text: "She looks good.",
    rule: "TOBE",
    source: "rules/TOBE.scm — to-be-rule over _to-be + _subj",
    expect: (recs) => {
      const r = recs.find((x) => x.rule === "TOBE");
      return r && edgesOf(r).join(";") === "good -predicate-> she";
    },
  },
  {
    text: "He is taller than John.",
    rule: "SP (comparative subject)",
    source: "rules/SP.scm over the comparative's _predadj(he, taller) — the _comparative/_pobj structure stays in the native relations",
    expect: (recs) => {
      const r = recs.find((x) => x.rule === "SP");
      return r && edgesOf(r).join(";") === "tall -predicate-> he";
    },
  },
  {
    text: "You do not smell good, sir.",
    rule: "neg",
    source: "rules/neg.scm — negative-rule: the predicate instance under NotLink (here: root-state mark on smell)",
    expect: (recs) => {
      const r = recs.find((x) => x.rule === "neg");
      return r && r.kind === "negation" && r.negatedPredicateIdx === 4;
    },
  },
  {
    text: "Which book did you read?",
    rule: "whichobjQ",
    source: "rules/whichobjQ.scm — the object instance replaced by _$qVar; SatisfyingSet upstream, `query` record here",
    expect: (recs) => {
      const r = recs.find((x) => x.rule === "whichobjQ");
      return r && r.query?.relation === "theme" &&
        edgesOf(r).join(";") === "read -agent-> you";
    },
  },
  {
    text: "Which dog chased the cat?",
    rule: "whichsubjSVOQ",
    source: "rules/whichsubjSVOQ.scm — the subject instance replaced by _$qVar",
    expect: (recs) => {
      const r = recs.find((x) => x.rule === "whichsubjSVOQ");
      return r && r.query?.relation === "agent" &&
        edgesOf(r).join(";") === "chase -theme-> cat";
    },
  },
  {
    text: "Where did John put it?",
    rule: "where-q",
    source: "rules/where-q.scm — where-rule over _%atLocation: the location argument is the questioned variable",
    expect: (recs) => {
      const r = recs.find((x) => x.rule === "where-q");
      return r && r.query?.relation === "location";
    },
  },
  {
    text: "I know that you are a fool.",
    rule: "comp",
    source: "rules/comp.scm — complement-rule: EvaluationLink(PredicateNode that-instance, ListLink(PredicateNode are-instance))",
    expect: (recs) => {
      const r = recs.find((x) => x.rule === "comp");
      return r && r.kind === "complement" && r.complement?.clauseHeadIdx === 3 && r.complement?.verbIdx === 5;
    },
  },
];

let passed = 0;
const failures = [];
for (const c of CASES) {
  const r = await relex2logic(c.text);
  const ok = r.status === "complete" && c.expect(r.records);
  if (ok) passed++;
  else failures.push({ text: c.text, rule: c.rule, status: r.status, rules: r.records.map((x) => x.rule) });
  console.log(`${ok ? "PASS" : "FAIL"}  [${c.rule}] ${c.text}`);
  if (!ok) console.log(`      fired: ${r.records.map((x) => x.rule).join(", ") || "none"} (status ${r.status})`);
}

const report = {
  gate: "relex2logic-shadow",
  date: "2026-11-23",
  verdict: failures.length === 0 ? "PASS" : "FAIL",
  summary: { cases: CASES.length, passed },
  failures,
};
const outDir = path.join(root, "loop", "foundry-results");
await mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, "relex2logic-gate-2026-11-23.json");
await writeFile(outPath, JSON.stringify(report, null, 1) + "\n");
console.log(JSON.stringify({ ...report, outPath: path.relative(root, outPath) }, null, 1));
process.exit(failures.length === 0 ? 0 : 1);
