#!/usr/bin/env node
/**
 * install.mjs — get the CSKG chat ready to run.
 *
 *   node scripts/install.mjs        (from the repo root)
 *
 * What it does, in order:
 *   1. checks Node >= 20 (the project's only prerequisite);
 *   2. makes sure data/raw/cskg/cskg.tsv.gz exists and is valid —
 *      downloads it from Zenodo record 4331372 if it is missing or
 *      corrupt (112 MB; the pre-merge cskg_star.tsv.gz is NOT needed
 *      by the chat and is never downloaded);
 *   3. installs dev dependencies if node_modules/ is missing;
 *   4. builds the TypeScript to dist/ (npm run build).
 *
 * Idempotent: run it again on a ready repo and it verifies what is
 * already there and changes nothing. Downloads go to a temp file and
 * are moved into place only after verification, so a failed run never
 * leaves a half-written file behind.
 */
import { spawnSync } from "node:child_process";
import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { get } from "node:https";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "data", "raw", "cskg");
const DATA_FILE = join(DATA_DIR, "cskg.tsv.gz");
const DOWNLOAD_URL =
  "https://zenodo.org/api/records/4331372/files/cskg.tsv.gz/content";
// Size of cskg.tsv.gz on Zenodo record 4331372 (verified 2026-11-09).
const EXPECTED_BYTES = 112_312_195;
const SIZE_TOLERANCE = 0.01; // accept within 1% of the record's size

function fail(message) {
  console.error(`\ninstall: ${message}`);
  process.exit(1);
}

function sizeIsSane(path) {
  if (!existsSync(path)) return false;
  const size = statSync(path).size;
  return Math.abs(size - EXPECTED_BYTES) <= EXPECTED_BYTES * SIZE_TOLERANCE;
}

/** Stream the whole file through gunzip; resolves to the decompressed
 *  byte count, rejects if the gzip stream is corrupt or truncated. */
async function gunzipPasses(path) {
  let bytes = 0;
  await pipeline(
    createReadStream(path),
    createGunzip(),
    async (source) => {
      for await (const chunk of source) bytes += chunk.length;
    },
  );
  return bytes;
}

async function verifyDataFile(path) {
  if (!sizeIsSane(path)) return false;
  try {
    const out = await gunzipPasses(path);
    return out > 0;
  } catch {
    return false;
  }
}

function download(url, dest, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    // Zenodo refuses requests without a User-Agent header (HTTP 403),
    // and Node's https sends none by default — so set one explicitly.
    const req = get(url, { headers: { "User-Agent": "ansci-install/0.1 (node)" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirectsLeft <= 0) return reject(new Error("too many redirects"));
        return resolve(download(res.headers.location, dest, redirectsLeft - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      const total = Number(res.headers["content-length"]) || EXPECTED_BYTES;
      let seen = 0;
      let lastPct = -1;
      const out = createWriteStream(dest);
      res.on("data", (chunk) => {
        seen += chunk.length;
        const pct = Math.floor((seen / total) * 100);
        if (pct >= lastPct + 5 || pct === 100) {
          lastPct = pct;
          process.stdout.write(
            `\r  downloading cskg.tsv.gz … ${pct}% (${(seen / 1e6).toFixed(0)} MB)`,
          );
        }
      });
      res.pipe(out);
      out.on("finish", () => {
        process.stdout.write("\n");
        resolve();
      });
      out.on("error", reject);
      res.on("error", reject);
    });
    req.setTimeout(120_000, () => req.destroy(new Error("download timed out (no data for 120 s)")));
    req.on("error", reject);
  });
}

/**
 * Make sure the CSKG data file at `dataFile` exists and
 * verifies, downloading a fresh copy from Zenodo when it does
 * not (or when the existing copy is missing bytes or corrupt).
 * Returns "present" when the file was already good, "downloaded"
 * when a fresh copy was fetched. Throws an Error — its message
 * ready to show the user — on any failure; the download goes to
 * a temp file beside the target and is moved into place only
 * after verification, so no partial file is ever left behind.
 *
 * Exported for the TUI's pre-chat setup, which offers this same
 * install before the first turn when the data is missing. The
 * install command below runs it as step 2 of the full install.
 * Progress lines go through `log` (console.log by default);
 * download percentage is written by download() itself.
 */
export async function ensureCskgDataFile(dataFile = DATA_FILE, log = console.log) {
  if (await verifyDataFile(dataFile)) {
    log("  already present and valid — nothing to download.");
    return "present";
  }
  if (existsSync(dataFile)) {
    log("  existing file is missing bytes or corrupt — fetching a fresh copy.");
  } else {
    log("  not present — downloading from Zenodo (record 4331372, ~112 MB).");
  }
  const dir = dirname(dataFile);
  const tmp = join(dir, `cskg.tsv.gz.tmp-${process.pid}`);
  try {
    mkdirSync(dir, { recursive: true });
    await download(DOWNLOAD_URL, tmp);
  } catch (err) {
    try { unlinkSync(tmp); } catch { /* nothing to clean */ }
    throw new Error(
      `download failed (${err.message}). Check your network connection and run this again; ` +
        "no partial file was left behind.",
    );
  }
  if (!(await verifyDataFile(tmp))) {
    try { unlinkSync(tmp); } catch { /* nothing to clean */ }
    throw new Error(
      "the downloaded file failed verification (wrong size or corrupt gzip). " +
        "Nothing was installed; please run this again.",
    );
  }
  renameSync(tmp, dataFile);
  log("  downloaded and verified.");
  return "downloaded";
}

function run(cmd, args, label) {
  console.log(`\n== ${label}`);
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) fail(`${label} could not start (${result.error.message}). Is npm on your PATH?`);
  if (result.status !== 0) fail(`${label} failed (exit ${result.status}).`);
}

async function main() {
  console.log("AnSci — CSKG chat install\n");

  // 1. Node version
  const major = Number(process.versions.node.split(".")[0]);
  console.log(`Node ${process.versions.node}`);
  if (!(major >= 20)) {
    fail(
      `Node >= 20 is required and this is ${process.versions.node}. ` +
        "Install a current Node from https://nodejs.org and run this again.",
    );
  }

  // 2. CSKG data (the ensure step is shared with the TUI's
  // pre-chat setup, which offers the same install in place)
  console.log("\n== CSKG data (data/raw/cskg/cskg.tsv.gz)");
  console.log(
    "   (Only the merged cskg.tsv.gz is needed; the pre-merge cskg_star.tsv.gz is not downloaded.)",
  );
  try {
    await ensureCskgDataFile(DATA_FILE);
  } catch (err) {
    fail(err.message);
  }

  // 3. Dependencies
  if (existsSync(join(ROOT, "node_modules"))) {
    console.log("\n== Dependencies\n  node_modules/ already present — skipping npm install.");
  } else {
    run("npm", ["install"], "Installing dev dependencies (npm install)");
  }

  // 4. Build
  run("npm", ["run", "build"], "Building (npm run build)");

  console.log(`
Done. Three ways to chat (run from the repo root):

  Web UI (recommended)   node demo/web/server.mjs
                         then open http://localhost:4173 in a browser
  Command line           node dist/src/cskg/chat.js
  Terminal UI            node demo/tui/tui.mjs

Optional: tell the chat where it is, so its season and time answers
are situated. Set before starting any of the above:

  CSKG_CHAT_LOCATION=Chicago CSKG_CHAT_HEMISPHERE=north

(CSKG_CHAT_HEMISPHERE is "north" or "south"; the web UI's port is set
with PORT, default 4173.) See demo/README.md for details.
`);
}

// Run the install only when invoked directly — the TUI imports
// ensureCskgDataFile from this module and must not trigger a
// full install by importing it.
const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((err) => fail(err.message ?? String(err)));
}
