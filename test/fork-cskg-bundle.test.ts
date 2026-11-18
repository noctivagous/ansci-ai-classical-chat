/**
 * fork-cskg-bundle.test.ts — the bundle regeneration script
 * (scripts/build-cskg-bundle.mjs).
 *
 * The script re-trims the shipped CSKG bundle from the installed
 * full extract by the feeder's own rules. These tests run it
 * against a SMALL hand-built extract fixture — never the real
 * 6M-edge extract — with the output pointed at a temp directory:
 * one row per stage outcome (kept, unmapped-relation, English
 * rule, VG rule, unclassified-endpoint, ATOMIC anchored,
 * ATOMIC unanchored), plus the absent-extract refusal. The real
 * regeneration is verified by re-running the script against the
 * installed extract and diffing against the shipped bundle
 * (byte-identical for the Run 2 trim, 2026-11-18); that run is a
 * maintainer action, not a suite test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as zlib from "node:zlib";
import { spawnSync } from "node:child_process";

const REPO_ROOT = path.join(__dirname, "..", "..");
const SCRIPT = path.join(REPO_ROOT, "scripts", "build-cskg-bundle.mjs");

const HEADER =
  "id\tnode1\trelation\tnode2\tnode1;label\tnode2;label\trelation;label\trelation;dimension\tsource\tsentence";

function row(id: string, n1: string, rel: string, n2: string, l1: string, l2: string, source: string): string {
  return [id, n1, rel, n2, l1, l2, "", "", source, ""].join("\t");
}

const FIXTURE = [
  HEADER,
  // kept: a concept triple both of whose ends classify.
  row("k1", "/c/en/rain", "/r/AtLocation", "/c/en/forest", "rain", "forest", "CN"),
  // stage 1: Antonym is not a feeder-mapped relation.
  row("s1", "/c/en/rain", "/r/Antonym", "/c/en/snow", "rain", "snow", "CN"),
  // stage 2: node1 is a bare Wikidata Q-id, not under /c/en/.
  row("s2", "Q475510", "/r/IsA", "/c/en/river", "q475510", "river", "WD"),
  // stage 2: VG-sourced rows are excluded even when English and mapped.
  row("s3", "/c/en/rain", "/r/AtLocation", "/c/en/forest", "rain", "forest", "VG"),
  // stage 3: 'crying' classifies neither by table nor by climb.
  row("s4", "/c/en/onion", "/r/Causes", "/c/en/crying", "onion", "crying", "CN"),
  // kept: an ATOMIC triple that anchors by the event rule.
  row("k2", "at:personx_gives_persony_a_hug", "at:xEffect", "at:feels_tired",
    "personx gives persony a hug", "feels tired", "AT"),
  // stage 3: an ATOMIC triple with no known head verb drops unanchored.
  row("s5", "at:personx_zqxwv_the_blorp", "at:xEffect", "at:tired",
    "personx zqxwv the blorp", "tired", "AT"),
].join("\n") + "\n";

function runScript(env: Record<string, string>) {
  return spawnSync("node", [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("the regeneration script trims a fixture extract by the feeder's rules", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-bundle-"));
  const fixturePath = path.join(dir, "cskg.tsv.gz");
  const outDir = path.join(dir, "bundle");
  fs.writeFileSync(fixturePath, zlib.gzipSync(FIXTURE));

  const run = runScript({ ANSCI_CSKG_TSV: fixturePath, ANSCI_CSKG_BUNDLE_DIR: outDir });
  assert.equal(run.status, 0, run.stderr);

  const tsv = fs.readFileSync(path.join(outDir, "cskg-trim.tsv"), "utf8");
  assert.equal(
    tsv,
    "rain\tAtLocation\tforest\tCN\n" +
      "personx gives persony a hug\tat:xEffect\tfeels tired\tAT\n",
  );

  const manifest = JSON.parse(fs.readFileSync(path.join(outDir, "manifest.json"), "utf8"));
  assert.deepEqual(manifest.stages, {
    raw: 7,
    afterRelationFilter: 6,
    afterEnglishAndSourceRules: 4,
    kept: 2,
  });
  assert.deepEqual(manifest.counts, {
    edges: 2,
    byRelation: { AtLocation: 1, "at:xEffect": 1 },
    bySource: { AT: 1, CN: 1 },
  });
  assert.equal(manifest.parts[0].count, 2);
  assert.equal(manifest.parts[0].bytes, Buffer.byteLength(tsv));
  assert.equal(manifest.license, "CC BY-SA 4.0");
});

test("the regeneration script refuses an absent extract, naming the install route", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cskg-bundle-absent-"));
  const outDir = path.join(dir, "bundle");
  const run = runScript({
    ANSCI_CSKG_TSV: path.join(dir, "no-such-extract.tsv.gz"),
    ANSCI_CSKG_BUNDLE_DIR: outDir,
  });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /install\.mjs/);
  assert.match(run.stderr, /4331372/);
  assert.equal(fs.existsSync(path.join(outDir, "cskg-trim.tsv")), false);
});
