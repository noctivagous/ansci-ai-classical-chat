/**
 * fork-cskg-ingest.test.ts — live CSKG ingestion (cskg-ingest.ts).
 *
 * The extract is a local install artifact (data/raw/, gitignored),
 * so this suite must pass in BOTH states:
 *  - absent: status reporting and ingestion return the named absent
 *    result — no throw, no fabricated links. These tests always run,
 *    pointed at a path that does not exist.
 *  - installed: a bounded, subject-filtered run over the real extract
 *    keeps real links with provenance "cskg" and accounts for its
 *    drops. These tests skip cleanly when the data is not installed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import { cskgDataStatus, ingestCskg, streamCskgTriples } from "../src/fork/cskg-ingest";

const BOGUS = path.join(__dirname, "no-such-dir", "cskg.tsv.gz");

test("absent extract: status says so, ingestion reports absent with zero counts", async () => {
  const status = cskgDataStatus(BOGUS);
  assert.equal(status.installed, false);
  assert.equal(status.path, BOGUS);

  const report = await ingestCskg({ path: BOGUS, subjects: ["rain"], limit: 10 });
  assert.equal(report.status, "absent");
  assert.equal(report.scanned, 0);
  assert.deepEqual(report.kept, []);
  assert.deepEqual(report.drops, { "unclassified-endpoint": 0, "unmapped-relation": 0 });
});

test("absent extract: the triple stream yields nothing and does not throw", async () => {
  let count = 0;
  for await (const _triple of streamCskgTriples({ path: BOGUS })) count++;
  assert.equal(count, 0);
});

test("installed extract: rain's real triples ingest with provenance and drop accounting", async (t) => {
  if (!cskgDataStatus().installed) {
    t.skip("CSKG extract not installed in this tree (data/raw/cskg/) — absent-state tests above still apply");
    return;
  }
  const report = await ingestCskg({ subjects: ["rain"], limit: 400 });
  assert.equal(report.status, "installed");
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
    report.kept.length + report.drops["unclassified-endpoint"] + report.drops["unmapped-relation"],
    "every scanned triple is either kept or dropped with a named reason",
  );
});
