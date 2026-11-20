/**
 * cskg-ingest.ts — live CSKG ingestion for the fork feeder.
 *
 * cskg-feed.ts is the mapping half: one triple in the loader's shape
 * becomes one fork link record (or a named drop). This module is the
 * reading half the feeder header always pointed at: it feeds triples
 * from the resolved CSKG source through mapTriple.
 *
 * TWO SOURCES, ONE RESOLUTION ORDER (2026-11-17 — the bundle ships):
 *  1. The shipped bundle, data/cskg/cskg-trim.tsv: a trimmed subset
 *     of CSKG (80,466 edges, CC BY-SA 4.0 — see data/cskg/manifest.json
 *     and NOTICE) that is part of the repo, so a fresh clone ingests
 *     real testimony with nothing installed. The bundle is
 *     PRE-TRIMMED: it stores mapTriple's own normalised outputs as a
 *     lean four-column TSV (from, relation, to, source code). It is
 *     still read through mapTriple here, not loaded as pre-mapped
 *     links: the mapper is deterministic and re-derives the identical
 *     link records, so both sources share one mapping path and one
 *     honest kept/dropped accounting instead of a second link format
 *     that could drift from the feeder's rules.
 *  2. The full extract, data/raw/cskg/cskg.tsv.gz (the merged CSKG
 *     graph, Zenodo 4331372, the same file the classical loader in
 *     src/cskg/loader.ts reads): a LOCAL INSTALL artifact under
 *     gitignored data/raw/, used when the bundle is absent — and the
 *     source a re-trim would run against. scripts/install.mjs
 *     downloads it.
 * An explicit extract choice — the `path` option or the
 * ANSCI_CSKG_TSV environment override — forces route 2 even when
 * the bundle is present (that is how the raw behaviour stays
 * reachable, and testable, in a tree where the bundle ships).
 *
 * Availability is a reported state, never an assumption: when
 * neither source is present, ingestCskg() returns status "absent"
 * with zero counts instead of throwing or fabricating links, and
 * cskgDataStatus() / resolveCskgSource() say what was found. The
 * suite must pass in every state.
 *
 * Path resolution follows the WordNet extract loader's convention
 * (src/wordnet.ts): walk up from this module toward the repo root.
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

export type CskgSourceKind = "bundle" | "extract";

export interface CskgSource {
  kind: CskgSourceKind;
  /** Absolute path of the file that source reads. */
  path: string;
}

export interface CskgDataStatus {
  installed: boolean;
  /** Absolute path of the extract that was (or would be) read. */
  path: string;
}

export interface CskgIngestOptions {
  /** Extract path override (defaults to cskgExtractPath()). Setting
   *  this — or ANSCI_CSKG_TSV — forces the raw-extract route. */
  path?: string;
  /** Bundle path override (defaults to cskgBundlePath()). */
  bundlePath?: string;
  /** Normalised subject labels to keep; omit to scan every subject. */
  subjects?: string[];
  /** Max matched triples fed through the mapper (default 1000). */
  limit?: number;
}

export interface CskgIngestReport {
  status: "installed" | "absent";
  /** Which source the triples came from; "none" when absent. */
  source: CskgSourceKind | "none";
  path: string;
  /** Triples fed through mapTriple (after the subject filter). */
  scanned: number;
  kept: CskgLink[];
  drops: {
    "unclassified-endpoint": number;
    "unmapped-relation": number;
    "unanchored-endpoint": number;
  };
}

const EXTRACT_RELATIVE = path.join("data", "raw", "cskg", "cskg.tsv.gz");
const BUNDLE_RELATIVE = path.join("data", "cskg", "cskg-trim.tsv");

/** Walk up from this module looking for a repo-relative file. */
function walkUp(relative: string): string | undefined {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, relative);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

/** Locate the extract: env override, else walk up from this module. */
export function cskgExtractPath(): string {
  const override = process.env.ANSCI_CSKG_TSV;
  if (override) return override;
  const found = walkUp(EXTRACT_RELATIVE);
  if (found) return found;
  // Not found: return the conventional repo-root location so the
  // status report names the path where the data would be installed.
  return path.join(__dirname, "..", "..", "..", EXTRACT_RELATIVE);
}

/** Locate the shipped bundle by walking up from this module. */
export function cskgBundlePath(): string {
  const found = walkUp(BUNDLE_RELATIVE);
  if (found) return found;
  return path.join(__dirname, "..", "..", "..", BUNDLE_RELATIVE);
}

/**
 * Resolve which source ingestion reads, in the order the header
 * states: an explicit extract choice (the `path` option or
 * ANSCI_CSKG_TSV) forces the raw extract; otherwise the shipped
 * bundle when present; otherwise the installed extract; otherwise
 * undefined — the absent state, reported by the caller.
 */
export function resolveCskgSource(options: CskgIngestOptions = {}): CskgSource | undefined {
  if (options.path !== undefined || process.env.ANSCI_CSKG_TSV) {
    const extractPath = options.path ?? cskgExtractPath();
    return fs.existsSync(extractPath) ? { kind: "extract", path: extractPath } : undefined;
  }
  const bundlePath = options.bundlePath ?? cskgBundlePath();
  if (fs.existsSync(bundlePath)) return { kind: "bundle", path: bundlePath };
  const extractPath = cskgExtractPath();
  if (fs.existsSync(extractPath)) return { kind: "extract", path: extractPath };
  return undefined;
}

/** Extract-specific status (the install artifact's presence). The
 *  shipped bundle is not an install; resolveCskgSource() is the
 *  overall picture. */
export function cskgDataStatus(extractPath: string = cskgExtractPath()): CskgDataStatus {
  return { installed: fs.existsSync(extractPath), path: extractPath };
}

function wantedSubjects(options: CskgIngestOptions): Set<string> | null {
  return options.subjects ? new Set(options.subjects.map((s) => normaliseConcept(s))) : null;
}

/** Stream triples out of the full extract: subject/object are the
 *  TSV's label columns, relation the raw "/r/..." name. */
async function* streamExtractTriples(
  extractPath: string,
  options: CskgIngestOptions,
): AsyncGenerator<CskgTriple> {
  const wanted = wantedSubjects(options);
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

/** Stream triples out of the shipped bundle: the lean four-column
 *  TSV (from, relation, to, source code), plain text, no header.
 *  The source column is the bundle's provenance record; the triple
 *  shape the feeder consumes is the first three columns. */
async function* streamBundleTriples(
  bundlePath: string,
  options: CskgIngestOptions,
): AsyncGenerator<CskgTriple> {
  const wanted = wantedSubjects(options);
  const limit = options.limit ?? 1000;
  let matched = 0;

  const lines = readline.createInterface({
    input: fs.createReadStream(bundlePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of lines) {
    if (!line) continue;
    const fields = line.split("\t");
    if (fields.length < 3) continue;
    const subject = fields[0] ?? "";
    if (wanted && !wanted.has(normaliseConcept(subject))) continue;
    yield {
      subject,
      relation: fields[1] ?? "",
      object: fields[2] ?? "",
    };
    matched++;
    if (matched >= limit) {
      lines.close();
      return;
    }
  }
}

function streamFromSource(
  source: CskgSource,
  options: CskgIngestOptions,
): AsyncGenerator<CskgTriple> {
  return source.kind === "bundle"
    ? streamBundleTriples(source.path, options)
    : streamExtractTriples(source.path, options);
}

/**
 * Stream triples from the resolved source in the feeder's input
 * shape. No source present yields nothing (no throw) — the caller's
 * status report is where absence is surfaced.
 */
export async function* streamCskgTriples(
  options: CskgIngestOptions = {},
): AsyncGenerator<CskgTriple> {
  const source = resolveCskgSource(options);
  if (!source) return;
  yield* streamFromSource(source, options);
}

/**
 * Ingest: stream the resolved source through mapTriple and account
 * for the outcome — kept links with provenance "cskg", drops by
 * named reason. Absent data is a reported state ("absent", all
 * counts zero), never an exception and never a fabricated link.
 */
export async function ingestCskg(options: CskgIngestOptions = {}): Promise<CskgIngestReport> {
  const source = resolveCskgSource(options);
  const report: CskgIngestReport = {
    status: source ? "installed" : "absent",
    source: source ? source.kind : "none",
    path: source ? source.path : (options.path ?? cskgExtractPath()),
    scanned: 0,
    kept: [],
    drops: { "unclassified-endpoint": 0, "unmapped-relation": 0, "unanchored-endpoint": 0 },
  };
  if (!source) return report;
  for await (const triple of streamFromSource(source, options)) {
    report.scanned++;
    const result = mapTriple(triple);
    if (result.ok) report.kept.push(result.link);
    else report.drops[result.reason]++;
  }
  return report;
}
