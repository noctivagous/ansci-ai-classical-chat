#!/usr/bin/env node
import { cpSync, existsSync, readFileSync, rmSync, statSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../..");
const out = resolve(here, "../dist/ansci-data");
const maxAssetBytes = 25 * 1024 * 1024;
const failures = [];

function validateBundle(name, sourceDir, requiredKinds, countKeys) {
  const manifestPath = resolve(sourceDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    failures.push(`${name}: missing ${manifestPath}`);
    return false;
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    failures.push(`${name}: invalid manifest ${manifestPath}: ${error.message}`);
    return false;
  }
  if (!Array.isArray(manifest.parts) || manifest.parts.length === 0) {
    failures.push(`${name}: manifest has no data parts`);
    return false;
  }
  const seenKinds = new Set();
  const rowCounts = new Map();
  let valid = true;
  for (const part of manifest.parts) {
    const partPath = resolve(sourceDir, part.file);
    if (!partPath.startsWith(resolve(sourceDir) + "/") || !existsSync(partPath)) {
      failures.push(`${name}: missing or unsafe part ${part.file}`);
      valid = false;
      continue;
    }
    const size = statSync(partPath).size;
    if (part.bytes !== undefined && size !== part.bytes) {
      failures.push(`${name}: ${part.file} is ${size} bytes; manifest declares ${part.bytes}`);
      valid = false;
    }
    if (size > maxAssetBytes) {
      failures.push(`${name}: ${part.file} is ${size} bytes; Cloudflare's per-static-asset limit is ${maxAssetBytes} bytes`);
      valid = false;
      continue;
    }
    let rows;
    try {
      rows = JSON.parse(readFileSync(partPath, "utf8"));
    } catch (error) {
      failures.push(`${name}: invalid JSON in ${part.file}: ${error.message}`);
      valid = false;
      continue;
    }
    if (!Array.isArray(rows) || rows.length !== part.count) {
      failures.push(`${name}: ${part.file} expected ${part.count} rows, found ${Array.isArray(rows) ? rows.length : "non-array JSON"}`);
      valid = false;
    }
    seenKinds.add(part.kind);
    rowCounts.set(part.kind, (rowCounts.get(part.kind) ?? 0) + (Array.isArray(rows) ? rows.length : 0));
  }
  for (const kind of requiredKinds) {
    if (!seenKinds.has(kind)) {
      failures.push(`${name}: manifest is missing required ${kind} data`);
      valid = false;
    }
  }
  for (const [kind, countKey] of Object.entries(countKeys)) {
    const actual = rowCounts.get(kind) ?? 0;
    const expected = manifest.counts?.[countKey];
    if (actual !== expected) {
      failures.push(`${name}: ${kind} parts contain ${actual} rows; manifest counts.${countKey} declares ${expected}`);
      valid = false;
    }
  }
  if (!manifest.source || !manifest.edition || !manifest.license) {
    failures.push(`${name}: manifest must declare source, edition, and license`);
    valid = false;
  }
  if (valid) console.log(`${name}: validated ${manifest.parts.length} data parts (${manifest.source}, ${manifest.edition})`);
  return valid;
}

let linkgrammarOk = true;
const wordnetDir = resolve(repo, "data/wordnet/extract");
const framenetDir = resolve(repo, "data/framenet");
const wordnetOk = validateBundle("WordNet", wordnetDir, ["synsets", "relations", "forms"], {
  synsets: "synsets", relations: "relations", forms: "forms",
});
const framenetOk = validateBundle("FrameNet", framenetDir, ["frames", "relations"], {
  frames: "frames", relations: "frameRelations",
});

if (!wordnetOk || !framenetOk || !linkgrammarOk) {
  console.error("Required browser lexical data is unavailable. The web build is stopped; the chat must not ship in a degraded configuration.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(dirname(out), { recursive: true });
cpSync(wordnetDir, resolve(out, "wordnet/extract"), { recursive: true });
cpSync(framenetDir, resolve(out, "framenet"), { recursive: true });
cpSync(resolve(repo, "NOTICE"), resolve(here, "../dist/NOTICE"));
// Link Grammar WASM (vendor/linkgrammar-wasm/): the ESM glue the
// browser loader imports plus the compiled module it
// instantiates via locateFile. Same 25MB per-asset ceiling as
// the lexical bundles (Cloudflare static-asset limit).
const linkgrammarDir = resolve(repo, "vendor/linkgrammar-wasm");
linkgrammarOk = true;
for (const file of ["linkgrammar-esm.js", "linkgrammar.wasm"]) {
  const src = resolve(linkgrammarDir, file);
  if (!existsSync(src)) {
    failures.push(`linkgrammar: missing ${src} (run scripts/build-linkgrammar-wasm.sh)`);
    linkgrammarOk = false;
    continue;
  }
  const size = statSync(src).size;
  if (size > maxAssetBytes) {
    failures.push(`linkgrammar: ${file} is ${size} bytes; Cloudflare's per-static-asset limit is ${maxAssetBytes} bytes`);
    linkgrammarOk = false;
    continue;
  }
  mkdirSync(resolve(out, "linkgrammar"), { recursive: true });
  cpSync(src, resolve(out, "linkgrammar", file));
}
if (linkgrammarOk) console.log(`linkgrammar: staged ESM glue + wasm module`);
console.log(`Required WordNet and FrameNet browser assets copied to ${out}`);
