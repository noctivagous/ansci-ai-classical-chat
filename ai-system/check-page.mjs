// check-page.mjs — the root-page correspondence gate.
// Fails when the schematic root page (demo/dashboard/root/index.html)
// drifts from the registry in system-map.ts. The page carries its own
// copy of the registry as the SYSTEM_MAP percent table; this check
// diffs the two: a map node with no page entry, a page entry naming
// nothing in the map (a rename or removal the page never caught up
// with), or a percent the page states differently from the map.
// External nodes (percent null — Person, Clock, Weather) carry no
// percent and no badge on the page by design, so they must NOT appear
// in the page's table. Run: npm run ai:check (gate), or with --warn
// to report drift without failing (the dashboard dev script).
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const warnOnly = process.argv.includes("--warn");

function extract(file, openMarker, closeMarker, what) {
  const text = readFileSync(join(here, file), "utf8");
  const a = text.indexOf(openMarker), b = text.indexOf(closeMarker);
  if (a < 0 || b < 0) throw new Error(`${file}: data markers missing`);
  const block = text.slice(a, b);
  return JSON.parse(block.slice(block.indexOf("{"), block.lastIndexOf("}") + 1));
}

const map = extract("system-map.ts", "// <map-data>", "// </map-data>");

const pageFile = join(here, "..", "demo", "dashboard", "root", "index.html");
const pageText = readFileSync(pageFile, "utf8");
const smAt = pageText.indexOf("var SYSTEM_MAP=");
if (smAt < 0) throw new Error("root/index.html: SYSTEM_MAP table missing");
const smBlock = pageText.slice(smAt, pageText.indexOf("};", smAt));
const pageMap = {};
for (const m of smBlock.matchAll(/'([^']+)':(\d+)/g)) pageMap[m[1]] = Number(m[2]);

const errors = [];
const byId = new Map(map.nodes.map((n) => [n.id, n]));
for (const n of map.nodes) {
  if (n.percent === null) {
    if (n.id in pageMap) errors.push(`${n.id}: external node carries a percent on the root page (${pageMap[n.id]}%) — externals carry none`);
  } else if (!(n.id in pageMap)) {
    errors.push(`${n.id}: missing from the root page (no SYSTEM_MAP entry)`);
  } else if (pageMap[n.id] !== n.percent) {
    errors.push(`${n.id}: percent drift — map says ${n.percent}%, root page says ${pageMap[n.id]}%`);
  }
}
for (const id of Object.keys(pageMap))
  if (!byId.has(id)) errors.push(`${id}: on the root page but not in the map (renamed or removed?)`);

if (errors.length) {
  if (warnOnly) {
    console.error(`root-page check WARNING (${errors.length}) — the schematic page is stale; the map has moved on:`);
    for (const e of errors) console.error(`  - ${e}`);
    console.error(`  Refresh demo/dashboard/root/index.html from ai-system/system-map.ts to clear this.`);
  } else {
    console.error(`root-page check FAILED (${errors.length}):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
} else {
  const percented = map.nodes.filter((n) => n.percent !== null).length;
  const externals = map.nodes.length - percented;
  console.log(`root-page check OK: the root page carries all ${percented} percented nodes of the map (${externals} externals carry no percent, by design).`);
}
