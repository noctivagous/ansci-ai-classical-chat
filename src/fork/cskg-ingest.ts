/**
 * cskg-ingest.ts — live CSKG ingestion for the fork feeder.
 *
 * cskg-feed.ts is the mapping half: one triple in the loader's shape
 * becomes one fork link record (or a named drop). This module is the
 * reading half the feeder header always pointed at: it streams the
 * installed CSKG extract and feeds its triples through mapTriple.
 *
 * The data is a LOCAL INSTALL ARTIFACT, not repo content: the extract
 * lives at data/raw/cskg/cskg.tsv.gz (the merged CSKG graph, Zenodo
 * 4331372, the same files the classical loader in src/cskg/loader.ts
 * reads), and data/raw/ is gitignored — a fresh checkout has no data
 * and nothing here pretends otherwise. Availability is a reported
 * state, never an assumption: cskgDataStatus() says whether the
 * extract is installed, and ingestCskg() on an absent extract
 * returns status "absent" with zero counts instead of throwing or
 * fabricating links. The suite must pass in both states.
 *
 * Path resolution: ANSCI_CSKG_TSV overrides; otherwise the extract is
 * located by walking up from this module toward the repo root, the
 * same convention the WordNet extract loader uses (src/wordnet.ts).
 *
 * Runs are bounded by design. The full extract carries ~6M edges;
 * ingestion takes an optional subject filter (normalised labels) and
 * a limit on how many matched triples are fed through the mapper.
 * What comes back is the kept links (provenance "cskg" throughout,
 * applied by the mapper) plus drop counts by named reason — the
 * abstention accounting is part of the result, not a side effect.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";
import * as readline from "node:readline";
import { mapTriple, normaliseConcept, type CskgLink, type CskgTriple } from "./cskg-feed";

export interface CskgDataStatus {
  installed: boolean;
  /** Absolute path of the extract that was (or would be) read. */
  path: string;
}

export interface CskgIngestOptions {
  /** Extract path override (defaults to cskgExtractPath()). */
  path?: string;
  /** Normalised subject labels to keep; omit to scan every subject. */
  subjects?: string[];
  /** Max matched triples fed through the mapper (default 1000). */
  limit?: number;
}

export interface CskgIngestReport {
  status: "installed" | "absent";
  path: string;
  /** Triples fed through mapTriple (after the subject filter). */
  scanned: number;
  kept: CskgLink[];
  drops: { "unclassified-endpoint": number; "unmapped-relation": number };
}

const EXTRACT_RELATIVE = path.join("data", "raw", "cskg", "cskg.tsv.gz");

/** Locate the extract: env override, else walk up from this module. */
export function cskgExtractPath(): string {
  const override = process.env.ANSCI_CSKG_TSV;
  if (override) return override;
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, EXTRACT_RELATIVE);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Not found: return the conventional repo-root location so the
  // status report names the path where the data would be installed.
  return path.join(__dirname, "..", "..", "..", EXTRACT_RELATIVE);
}

export function cskgDataStatus(extractPath: string = cskgExtractPath()): CskgDataStatus {
  return { installed: fs.existsSync(extractPath), path: extractPath };
}

/**
 * Stream triples out of the extract in the feeder's input shape:
 * subject/object are the TSV's label columns, relation the raw
 * "/r/..." name. An absent extract yields nothing (no throw) — the
 * caller's status report is where absence is surfaced.
 */
export async function* streamCskgTriples(
  options: CskgIngestOptions = {},
): AsyncGenerator<CskgTriple> {
  const extractPath = options.path ?? cskgExtractPath();
  if (!fs.existsSync(extractPath)) return;
  const wanted = options.subjects
    ? new Set(options.subjects.map((s) => normaliseConcept(s)))
    : null;
  const limit = options.limit ?? 1000;
  let matched = 0;

  const lines = readline.createInterface({
    input: fs.createReadStream(extractPath).pipe(zlib.createGunzip()),
    crlfDelay: Infinity,
  });
  let columns: { n1: number; rel: number; n2: number } | null = null;
  for await (const line of lines) {
    if (!columns) {
      const fields = line.split("\t");
      columns = {
        n1: fields.indexOf("node1;label"),
        rel: fields.indexOf("relation"),
        n2: fields.indexOf("node2;label"),
      };
      continue;
    }
    const fields = line.split("\t");
    const subject = fields[columns.n1] ?? "";
    if (wanted && !wanted.has(normaliseConcept(subject))) continue;
    yield {
      subject,
      relation: fields[columns.rel] ?? "",
      object: fields[columns.n2] ?? "",
    };
    matched++;
    if (matched >= limit) {
      lines.close();
      return;
    }
  }
}

/**
 * Ingest: stream the extract through mapTriple and account for the
 * outcome — kept links with provenance "cskg", drops by named reason.
 * Absent data is a reported state ("absent", all counts zero), never
 * an exception and never a fabricated link.
 */
export async function ingestCskg(options: CskgIngestOptions = {}): Promise<CskgIngestReport> {
  const extractPath = options.path ?? cskgExtractPath();
  const status = cskgDataStatus(extractPath);
  const report: CskgIngestReport = {
    status: status.installed ? "installed" : "absent",
    path: extractPath,
    scanned: 0,
    kept: [],
    drops: { "unclassified-endpoint": 0, "unmapped-relation": 0 },
  };
  if (!status.installed) return report;
  for await (const triple of streamCskgTriples(options)) {
    report.scanned++;
    const result = mapTriple(triple);
    if (result.ok) report.kept.push(result.link);
    else report.drops[result.reason]++;
  }
  return report;
}
