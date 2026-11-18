/**
 * fork-cskg-ingest.test.ts — live CSKG ingestion (cskg-ingest.ts).
 *
 * Two sources, one resolution order (2026-11-17): the shipped
 * bundle (data/cskg/cskg-trim.tsv, part of the repo) first, the
 * full extract (data/raw/cskg/cskg.tsv.gz, a gitignored local
 * install artifact) when the bundle is absent — and an explicit
 * extract choice (path option / ANSCI_CSKG_TSV) forces the extract.
 * The suite must pass in every state:
 *  - absent (neither source): status reporting and ingestion return
 *    the named absent result — no throw, no fabricated links. These
 *    tests always run, pointed at paths that do not exist.
 *  - bundle: the shipped trim loads through the same mapper and
 *    yields its full edge count as links. These tests run wherever
 *    the bundle file is present (it ships, so: everywhere) and skip
 *    only in a tree that somehow lacks it.
 *  - extract: a bounded, subject-filtered run over the real extract
 *    keeps real links with provenance "cskg" and accounts for its
 *    drops. These tests pin the extract route explicitly (the
 *    default now prefers the bundle) and skip cleanly when the
 *    extract is not installed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  cskgBundlePath,
  cskgDataStatus,
  cskgExtractPath,
  ingestCskg,
  resolveCskgSource,
  streamCskgTriples,
} from "../src/fork/cskg-ingest";

const BOGUS = path.join(__dirname, "no-such-dir", "cskg.tsv.gz");
const BOGUS_BUNDLE = path.join(__dirname, "no-such-dir", "cskg-trim.tsv");
const BUNDLE_EDGES = 80466; // data/cskg/manifest.json, Run 2 trim (2026-11-17)

test("absent extract: status says so, ingestion reports absent with zero counts", async () => {
  const status = cskgDataStatus(BOGUS);
  assert.equal(status.installed, false);
  assert.equal(status.path, BOGUS);

  const report = await ingestCskg({ path: BOGUS, subjects: ["rain"], limit: 10 });
  assert.equal(report.status, "absent");
  assert.equal(report.source, "none");
  assert.equal(report.scanned, 0);
  assert.deepEqual(report.kept, []);
  assert.deepEqual(report.drops, {
    "unclassified-endpoint": 0,
    "unmapped-relation": 0,
    "unanchored-endpoint": 0,
  });
});

test("absent everywhere: bundle and extract both pointed nowhere reports absent", async () => {
  assert.equal(resolveCskgSource({ path: BOGUS, bundlePath: BOGUS_BUNDLE }), undefined);
  const report = await ingestCskg({ path: BOGUS, bundlePath: BOGUS_BUNDLE });
  assert.equal(report.status, "absent");
  assert.equal(report.source, "none");
  assert.equal(report.scanned, 0);
});

test("absent extract: the triple stream yields nothing and does not throw", async () => {
  let count = 0;
  for await (const _triple of streamCskgTriples({ path: BOGUS })) count++;
  assert.equal(count, 0);
});

test("shipped bundle: resolution prefers it, and the full trim ingests as links", async (t) => {
  if (!fs.existsSync(cskgBundlePath())) {
    t.skip("CSKG bundle not present in this tree (data/cskg/cskg-trim.tsv)");
    return;
  }
  const source = resolveCskgSource();
  assert.equal(source?.kind, "bundle");
  assert.equal(source?.path, cskgBundlePath());

  // No subject filter, limit above the edge count: the whole bundle
  // goes through mapTriple. The bundle stores the mapper's own
  // normalised outputs, so re-mapping reproduces every link — the
  // accounting must come back exact, with zero drops.
  const report = await ingestCskg({ limit: BUNDLE_EDGES + 1 });
  assert.equal(report.status, "installed");
  assert.equal(report.source, "bundle");
  assert.equal(report.scanned, BUNDLE_EDGES);
  assert.equal(report.kept.length, BUNDLE_EDGES);
  assert.deepEqual(report.drops, {
    "unclassified-endpoint": 0,
    "unmapped-relation": 0,
    "unanchored-endpoint": 0,
  });
  for (const link of report.kept) assert.equal(link.provenance, "cskg");

  // Both routes are represented: a concept-route link (rain
  // AtLocation forest, curated Water → Wood) and an event-rule
  // ATOMIC link (anchoring record, full phrases kept).
  const loc = report.kept.find((l) => l.kind === "location" && l.from === "rain" && l.to === "forest");
  assert.ok(loc, "rain AtLocation forest survives from the bundle as a location link");
  assert.equal(loc.fromElement, "Water");
  assert.equal(loc.toElement, "Wood");
  const atomic = report.kept.find((l) => l.anchoring?.rule === "event-rule");
  assert.ok(atomic, "the bundle carries event-rule anchored ATOMIC links");
});

test("shipped bundle: subject filter applies to bundle rows", async (t) => {
  if (!fs.existsSync(cskgBundlePath())) {
    t.skip("CSKG bundle not present in this tree (data/cskg/cskg-trim.tsv)");
    return;
  }
  const report = await ingestCskg({ subjects: ["rain"], limit: 50 });
  assert.equal(report.source, "bundle");
  assert.ok(report.scanned > 0, "rain has rows in the bundle");
  assert.ok(report.kept.length > 0, "some of rain's bundle rows survive the mapping");
  for (const link of report.kept) assert.equal(link.from, "rain");
});

test("env override: ANSCI_CSKG_TSV forces the extract route even with the bundle shipped", async (t) => {
  if (!cskgDataStatus().installed) {
    t.skip("CSKG extract not installed in this tree (data/raw/cskg/)");
    return;
  }
  const saved = process.env.ANSCI_CSKG_TSV;
  process.env.ANSCI_CSKG_TSV = cskgExtractPath();
  try {
    assert.equal(resolveCskgSource()?.kind, "extract");
  } finally {
    if (saved === undefined) delete process.env.ANSCI_CSKG_TSV;
    else process.env.ANSCI_CSKG_TSV = saved;
  }
});

test("env override: ANSCI_CSKG_TSV pointed nowhere reports absent, bundle notwithstanding", async (t) => {
  if (!fs.existsSync(cskgBundlePath())) {
    t.skip("CSKG bundle not present in this tree (data/cskg/cskg-trim.tsv)");
    return;
  }
  const saved = process.env.ANSCI_CSKG_TSV;
  process.env.ANSCI_CSKG_TSV = BOGUS;
  try {
    const report = await ingestCskg({ subjects: ["rain"], limit: 10 });
    assert.equal(report.status, "absent");
    assert.equal(report.source, "none");
  } finally {
    if (saved === undefined) delete process.env.ANSCI_CSKG_TSV;
    else process.env.ANSCI_CSKG_TSV = saved;
  }
});

test("installed extract: rain's real triples ingest with provenance and drop accounting", async (t) => {
  if (!cskgDataStatus().installed) {
    t.skip("CSKG extract not installed in this tree (data/raw/cskg/) — absent-state tests above still apply");
    return;
  }
  // The extract route, pinned explicitly: bundlePath pointed nowhere
  // so the shipped bundle cannot take precedence. This is the raw
  // behaviour the bundle-first default must not change.
  const report = await ingestCskg({ bundlePath: BOGUS_BUNDLE, subjects: ["rain"], limit: 400 });
  assert.equal(report.status, "installed");
  assert.equal(report.source, "extract");
  assert.ok(report.scanned > 0, "the subject filter matched real rows");
  assert.ok(report.kept.length > 0, "some of rain's triples survive the mapping");
  for (const link of report.kept) assert.equal(link.provenance, "cskg");

  // A verified real row: rain /r/AtLocation forest (ConceptNet source).
  // rain is curated Water (weather); forest is curated Wood (place).
  const loc = report.kept.find((l) => l.kind === "location" && l.from === "rain" && l.to === "forest");
  assert.ok(loc, "rain AtLocation forest survives as a location link");
  assert.equal(loc.fromElement, "Water");
  assert.equal(loc.toElement, "Wood");

  // rain also carries relations the fork does not map (Antonym,
  // Synonym, ...) — those drops are counted, not silent.
  assert.ok(report.drops["unmapped-relation"] > 0, "unmapped relations are accounted for");
  assert.equal(
    report.scanned,
    report.kept.length +
      report.drops["unclassified-endpoint"] +
      report.drops["unmapped-relation"] +
      report.drops["unanchored-endpoint"],
    "every scanned triple is either kept or dropped with a named reason",
  );
});
