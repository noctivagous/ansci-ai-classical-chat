#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, "../dist");
const failures = [];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = resolve(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

for (const path of [
  "index.html",
  "engine.js",
  "NOTICE",
  "ansci-data/wordnet/extract/manifest.json",
  "ansci-data/framenet/manifest.json",
]) {
  if (!existsSync(resolve(dist, path))) failures.push(`missing dist/${path}`);
}

const rootHtml = resolve(dist, "index.html");
if (existsSync(rootHtml)) {
  const html = readFileSync(rootHtml, "utf8");
  for (const marker of ['id="chatResourceStatus"', 'id="chatInput"', 'id="sayBtn"', "Required live engine failed to load", "Chat disabled while"]) {
    if (!html.includes(marker)) failures.push(`root schematic is missing required readiness gate marker ${JSON.stringify(marker)}`);
  }
  if (!/<input[^>]*id="chatInput"[^>]*disabled/.test(html) || !/<button[^>]*id="sayBtn"[^>]*disabled/.test(html)) {
    failures.push("root schematic composer must start disabled before lexical data readiness");
  }
}

for (const [label, relative] of [["WordNet", "ansci-data/wordnet/extract/manifest.json"], ["FrameNet", "ansci-data/framenet/manifest.json"]]) {
  const path = resolve(dist, relative);
  if (!existsSync(path)) continue;
  try {
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    for (const part of manifest.parts ?? []) {
      const asset = resolve(dirname(path), part.file);
      if (!asset.startsWith(dirname(path) + "/") || !existsSync(asset)) failures.push(`${label}: missing built part ${part.file}`);
    }
  } catch (error) {
    failures.push(`${label}: invalid built manifest (${error.message})`);
  }
}

const enginePath = resolve(dist, "engine.js");
if (existsSync(enginePath)) {
  const engine = readFileSync(enginePath, "utf8");
  for (const marker of ["/ansci-data", "status", "WordNet", "FrameNet"]) {
    if (!engine.includes(marker)) failures.push(`engine.js is missing browser data gate marker ${JSON.stringify(marker)}`);
  }
}

const chatBundles = walk(resolve(dist, "chat/assets")).filter((path) => path.endsWith(".js"));
if (chatBundles.length === 0) failures.push("missing built chat JavaScript bundle(s)");
else {
  const chat = chatBundles.map((path) => readFileSync(path, "utf8")).join("\n");
  for (const marker of ["/ansci-data", "Chat disabled", "WordNet", "FrameNet"]) {
    if (!chat.includes(marker)) failures.push(`chat bundle is missing required data gate marker ${JSON.stringify(marker)}`);
  }
}

const dashboardBundles = walk(resolve(dist, "dashboard/assets")).filter((path) => path.endsWith(".js"));
if (dashboardBundles.length === 0) failures.push("missing built dashboard JavaScript bundle(s)");
else {
  const dashboard = dashboardBundles.map((path) => readFileSync(path, "utf8")).join("\n");
  for (const marker of ["/ansci-data", "disabled", "WordNet", "FrameNet"]) {
    if (!dashboard.includes(marker)) failures.push(`dashboard bundle is missing required data gate marker ${JSON.stringify(marker)}`);
  }
}

if (failures.length) {
  console.error("Browser build control failed: required lexical data or fail-closed chat gate is missing.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Browser build control passed: required lexical bundles and chat readiness gates are present.");
