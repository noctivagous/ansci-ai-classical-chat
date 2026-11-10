#!/usr/bin/env node
/**
 * devloop-tree.mjs — draft a problem tree from the latest diagnosis.
 *
 * Part of the Muse Code loop-runner package (loop/LOOP.md). This
 * script DRAFTS; it does not decide. It reads
 * .devloop/last-diagnosis.json (running `devcli diagnose` first if
 * the file is absent, or when --refresh is passed) and emits
 * .devloop/problem-tree.draft.json: the diagnosis's failure
 * clusters and unmet probe expectations turned into candidate
 * leaves, each carrying its evidence and a heuristic
 * suggestedCategory.
 *
 * Heuristics (suggestions only, printed on every leaf):
 *   - cluster signature starts with "error|"      -> fix
 *     (a turn threw; a piece exists and misbehaves)
 *   - cluster is a why-decline ("why|…decline@…") -> data
 *     (check the graph's causal testimony before building
 *     anything — the decline may be correct)
 *   - probe expectations unmet, grouped by set    -> extend-or-design,
 *     marked unclassified
 *   - any other cluster                           -> unclassified
 *
 * Classification — category (fix / extend / design / data /
 * sorted-out), owner piece, and layer — is a judgment call owned
 * by the director/executor (loop/LOOP.md). The draft never writes
 * .devloop/problem-tree.json itself; a human/agent reviews the
 * draft, classifies the leaves, and saves the result there.
 *
 * Usage: node scripts/devloop-tree.mjs [--refresh]
 * Zero dependencies; Node >= 20.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_DIR = join(ROOT, ".devloop");
const DIAGNOSIS_PATH = join(STATE_DIR, "last-diagnosis.json");
const DRAFT_PATH = join(STATE_DIR, "problem-tree.draft.json");

const UNCLASSIFIED = "unclassified — director/executor to classify";

function loadDiagnosis(refresh) {
  if (!refresh && existsSync(DIAGNOSIS_PATH)) {
    return JSON.parse(readFileSync(DIAGNOSIS_PATH, "utf8"));
  }
  // No diagnosis on file (or --refresh): run the diagnose CLI,
  // which writes .devloop/last-diagnosis.json itself.
  const cli = join(ROOT, "dist", "src", "cskg", "devcli.js");
  if (!existsSync(cli)) {
    throw new Error(
      `no diagnosis at ${DIAGNOSIS_PATH} and the dev CLI is not built (${cli} missing) — run \`npm run build\` first`,
    );
  }
  const res = spawnSync(process.execPath, [cli, "diagnose"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.status !== 0) {
    throw new Error(
      `devcli diagnose failed (exit ${res.status}):\n${res.stderr || res.stdout || "(no output)"}`,
    );
  }
  if (!existsSync(DIAGNOSIS_PATH)) {
    throw new Error("devcli diagnose ran but wrote no last-diagnosis.json");
  }
  return JSON.parse(readFileSync(DIAGNOSIS_PATH, "utf8"));
}

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function draftTree(d) {
  const totals = d.totals ?? {};
  const probeSummary = (d.probes ?? [])
    .map((p) => `${p.script.split("/").pop().replace(/\.txt$/, "")} ${p.met}/${p.annotated}`)
    .join(", ");
  const source =
    `devcli diagnose, ${totals.turns ?? "?"} turns: ${totals.grounded ?? "?"} grounded, ` +
    `${totals.ungrounded ?? "?"} ungrounded, ${totals.declined ?? "?"} declined; probes: ${probeSummary}`;

  const branches = [];
  const byId = new Map();
  const branch = (id, label) => {
    if (!byId.has(id)) {
      const b = { id, label, leaves: [] };
      byId.set(id, b);
      branches.push(b);
    }
    return byId.get(id);
  };

  // --- failure clusters -------------------------------------------------
  for (const c of d.clusters ?? []) {
    const sig = c.signature ?? "";
    const examples = (c.examples ?? []).join(" / ");
    if (sig.startsWith("error|")) {
      branch("fix", "Fix — a piece exists and misbehaves (suggested)").leaves.push({
        id: `draft-fix-${slug(sig)}`,
        suggestedCategory: "fix",
        owner: UNCLASSIFIED,
        problem: `Turn(s) threw instead of answering (${c.count} occurrence(s)): ${examples}`,
        evidence: `diagnose cluster ${JSON.stringify(sig)}; examples: ${examples}`,
        layer: "ours — a piece misbehaves",
        status: "pending",
      });
    } else if (/^why\|/.test(sig) && sig.includes("decline@")) {
      branch("data", "Data — check the graph's testimony before building anything (suggested)").leaves.push({
        id: `draft-data-${slug(sig)}`,
        suggestedCategory: "data",
        owner: "CSKG testimony check",
        problem:
          `Why-question declined — causal testimony may be missing, or Solve may not be finding it: ${examples}. ` +
          `If the graph holds no such chain, the decline is CORRECT and this leaf closes with no action.`,
        evidence: `diagnose cluster ${JSON.stringify(sig)}; examples: ${examples}`,
        layer: "CSKG — testimony check",
        status: "pending",
      });
    } else {
      branch("unclassified", "Unclassified clusters — director/executor to classify").leaves.push({
        id: `draft-cluster-${slug(sig)}`,
        suggestedCategory: UNCLASSIFIED,
        owner: UNCLASSIFIED,
        problem: `Ungrounded turns sharing one outcome signature (${c.count} occurrence(s)): ${examples}`,
        evidence: `diagnose cluster ${JSON.stringify(sig)}; examples: ${examples}`,
        layer: UNCLASSIFIED,
        status: "pending",
      });
    }
  }

  // --- unmet probe expectations, grouped by set -------------------------
  for (const p of d.probes ?? []) {
    const unmet = p.unmet ?? [];
    if (!unmet.length) continue;
    const setName = (p.script ?? "probe").split("/").pop().replace(/\.txt$/, "");
    const b = branch(
      `probes-${slug(setName)}`,
      `Probe set ${p.script} — ${unmet.length} unmet expectation(s) of ${p.annotated} annotated (grouped by set; classify each leaf)`,
    );
    for (const u of unmet) {
      b.leaves.push({
        id: `draft-probe-${slug(setName)}-${slug(u.input ?? "")}`,
        suggestedCategory: "extend-or-design",
        owner: UNCLASSIFIED,
        problem: `Probe expectation unmet in ${p.script}: "${u.input}" — ${(u.reasons ?? []).join("; ")}`,
        evidence: `observed reply: ${JSON.stringify(u.reply ?? "")}; reasons: ${(u.reasons ?? []).join("; ")}`,
        layer: UNCLASSIFIED,
        status: "pending",
      });
    }
  }

  return {
    draft: true,
    note:
      "DRAFT ONLY — produced by scripts/devloop-tree.mjs from the latest diagnosis. " +
      "suggestedCategory values are heuristics, not decisions. The director/executor classifies every leaf " +
      "(fix / extend / design / data / sorted-out), sets owner and layer, and saves the result as " +
      ".devloop/problem-tree.json before any leaf is executed (loop/LOOP.md).",
    at: new Date().toISOString(),
    source,
    branches,
  };
}

function main() {
  const refresh = process.argv.includes("--refresh");
  const diagnosis = loadDiagnosis(refresh);
  const tree = draftTree(diagnosis);
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(DRAFT_PATH, JSON.stringify(tree, null, 1) + "\n");
  const leafCount = tree.branches.reduce((n, b) => n + b.leaves.length, 0);
  console.log(
    `draft problem tree: ${leafCount} leaf/leaves in ${tree.branches.length} branch(es) -> ${DRAFT_PATH}`,
  );
  for (const b of tree.branches) {
    console.log(`  ${b.id}: ${b.leaves.length} — ${b.label}`);
  }
  console.log(
    "This is a draft, not a decision: classify the leaves, then save as .devloop/problem-tree.json (loop/LOOP.md).",
  );
}

try {
  main();
} catch (err) {
  console.error(`devloop-tree: ${err.message}`);
  process.exit(1);
}
