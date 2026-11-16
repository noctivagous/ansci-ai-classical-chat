#!/usr/bin/env node
/**
 * fork-sealed.mjs — the sealed-materials protocol as commands
 * (repair programme Part C.5; machinery in src/fork/sealed.ts).
 *
 * The four commands are the four role operations, in order:
 *
 *   node scripts/fork-sealed.mjs seal   <draft.json> <manifest.json>
 *       AUTHOR: seal a draft manifest (hashes computed; the set is
 *       frozen from here — later edits are detectable).
 *   node scripts/fork-sealed.mjs verify <manifest.json>
 *       CUSTODIAN: check the manifest against its seals.
 *   node scripts/fork-sealed.mjs run    <manifest.json> <run.json>
 *       OPERATOR: run the frozen build over the BLIND operator view
 *       (item_id/text/language only — no expected graphs reach this
 *       step) and record raw output: G0 atoms, generated S1, G1
 *       atoms, plus the build id and the exact command.
 *   node scripts/fork-sealed.mjs score  <manifest.json> <run.json>
 *       CUSTODIAN: verify, then score — G0 accuracy against the
 *       sealed expected graphs (amendment A1) alongside G0↔G1
 *       preservation, per item, per family, per class, and per
 *       language (never pooled away). Prints the report and writes
 *       it beside the run file as <run>.scores.json.
 *
 * Nothing here authors items or judges them: a sealed set worthy of
 * the name is written by an author independent of the builders.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { parse } from "../dist/src/fork/parse.js";
import { generate } from "../dist/src/fork/generate.js";
import { extractFeatures } from "../dist/src/fork/features.js";
import { enableWordnetLexicon } from "../dist/src/fork/wordnet-lex.js";
import {
  sealManifest, verifyManifest, operatorView, scoreSealedRun,
} from "../dist/src/fork/sealed.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
enableWordnetLexicon(true);

const [cmd, a, b] = process.argv.slice(2);
const readJson = (p) => JSON.parse(readFileSync(p, "utf-8"));

function buildId() {
  try {
    return execSync("git rev-parse HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "working-tree (no git id available)";
  }
}

if (cmd === "seal") {
  const sealed = sealManifest(readJson(a));
  writeFileSync(b, JSON.stringify(sealed, null, 2) + "\n");
  console.log(`sealed ${sealed.items.length} items -> ${b}`);
  console.log(`manifest_hash: ${sealed.manifest_hash}`);
} else if (cmd === "verify") {
  const manifest = readJson(a);
  const v = verifyManifest(manifest);
  console.log(`manifest ${manifest.manifest_id}: ${v.ok ? "OK — seals intact" : "FAILED"}`);
  if (!v.manifest_hash_ok) console.log("  manifest_hash does not match its contents");
  for (const id of v.tampered_items) console.log(`  item modified after sealing: ${id}`);
  process.exit(v.ok ? 0 : 1);
} else if (cmd === "run") {
  const manifest = readJson(a);
  const v = verifyManifest(manifest);
  if (!v.ok) {
    console.error("manifest seals do not verify — the operator does not run an unsealed or modified set");
    process.exit(1);
  }
  const view = operatorView(manifest);
  const items = view.items.map((it) => {
    try {
      const g0 = parse(it.item_text, it.language);
      const generated = generate(g0);
      let g1Atoms = [];
      try {
        g1Atoms = extractFeatures(parse(generated, it.language));
      } catch {
        g1Atoms = [];
      }
      return { item_id: it.item_id, parsed: true, generated, g0_atoms: extractFeatures(g0), g1_atoms: g1Atoms };
    } catch (e) {
      return { item_id: it.item_id, parsed: false, error: String(e?.message ?? e), g0_atoms: [], g1_atoms: [] };
    }
  });
  const run = {
    manifest_id: view.manifest_id,
    manifest_hash: view.manifest_hash,
    build_id: buildId(),
    command: `node scripts/fork-sealed.mjs run ${a} ${b}`,
    items,
  };
  writeFileSync(b, JSON.stringify(run, null, 2) + "\n");
  console.log(`ran ${items.length} items (${items.filter((i) => i.parsed).length} parsed) -> ${b}`);
} else if (cmd === "score") {
  const manifest = readJson(a);
  const v = verifyManifest(manifest);
  if (!v.ok) {
    console.error("manifest seals do not verify — not scored");
    process.exit(1);
  }
  const report = scoreSealedRun(manifest, readJson(b));
  const pct = (x) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);
  console.log(`# Sealed run — G0 accuracy (A1) and preservation`);
  console.log(`manifest ${report.manifest_id} · build ${report.build_id}`);
  console.log(`scored items: ${report.scored_items} · unresolved (excluded, reported): ${report.unresolved_items}`);
  console.log(`G0 accuracy (pooled): ${pct(report.g0_accuracy_pooled)}`);
  for (const [lang, val] of Object.entries(report.g0_accuracy_by_language)) {
    console.log(`G0 accuracy [${lang}]: ${pct(val)}`);
  }
  for (const [cls, val] of Object.entries(report.g0_accuracy_by_class)) {
    console.log(`G0 accuracy [class ${cls}]: ${pct(val)}`);
  }
  console.log(`G0↔G1 preservation (mean per item): ${pct(report.preservation_pooled)}`);
  console.log(`\n| family | atoms | preserved | score |`);
  for (const [fam, f] of Object.entries(report.family_scores).sort(([x], [y]) => (x < y ? -1 : 1))) {
    console.log(`| ${fam} | ${f.atoms} | ${f.preserved} | ${pct(f.score)} |`);
  }
  console.log(`\n| item | class | status | parsed | G0 accuracy | preservation |`);
  for (const it of report.items) {
    console.log(`| ${it.item_id} | ${it.item_class} | ${it.item_status} | ${it.parsed} | ${pct(it.g0_accuracy)} | ${pct(it.preservation)} |`);
  }
  const out = b.replace(/\.json$/, "") + ".scores.json";
  writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nwrote ${out}`);
} else {
  console.error("usage: fork-sealed.mjs seal|verify|run|score <args>");
  process.exit(2);
}
