// check-map.mjs — the correspondence gate.
// Fails when the registry, the layout and the directory tree disagree:
// a node with no directory, a directory with no node, a layout entry
// naming nothing, a cord or trace step pointing at a missing node, or
// a state that does not match its percent. Run: npm run ai:check
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function extract(file, openMarker, closeMarker, what) {
  const text = readFileSync(join(here, file), "utf8");
  const a = text.indexOf(openMarker), b = text.indexOf(closeMarker);
  if (a < 0 || b < 0) throw new Error(`${file}: data markers missing`);
  const block = text.slice(a, b);
  return JSON.parse(block.slice(block.indexOf("{"), block.lastIndexOf("}") + 1));
}

const map = extract("system-map.ts", "// <map-data>", "// </map-data>");
const layout = extract("system-layout.ts", "// <layout-data>", "// </layout-data>");

const errors = [];
const byId = new Map();
for (const n of map.nodes) {
  if (byId.has(n.id)) errors.push(`duplicate node id: ${n.id}`);
  byId.set(n.id, n);
}
for (const n of map.nodes) {
  if (n.parent !== null && !byId.has(n.parent)) errors.push(`${n.id}: parent ${n.parent} missing`);
  const want = n.percent === null ? "external" : n.percent === 0 ? "placeholder" : n.percent === 100 ? "functional" : "partial";
  if (n.state !== want) errors.push(`${n.id}: state ${n.state} does not match percent ${n.percent}`);
  if (n.percent !== null && (n.percent < 0 || n.percent > 100)) errors.push(`${n.id}: percent out of range`);
  if (!layout.nodes[n.id]) errors.push(`${n.id}: no layout entry`);
  if (n.path) {
    const p = join(here, n.path);
    let ok = false;
    try { ok = statSync(p).isDirectory(); } catch { ok = false; }
    if (!ok) errors.push(`${n.id}: directory missing: ${n.path}`);
  }
}
for (const id of Object.keys(layout.nodes)) if (!byId.has(id)) errors.push(`layout entry for unknown node: ${id}`);

function walk(dir, rel) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    const claimed = [...byId.values()].some((n) => n.path === r);
    if (!claimed) errors.push(`directory with no node: ${r}`);
    walk(join(dir, e.name), r);
  }
}
walk(here, "");

for (const c of map.cords) {
  if (!byId.has(c.from)) errors.push(`cord from missing node: ${c.from}`);
  if (!byId.has(c.to)) errors.push(`cord to missing node: ${c.to}`);
}
for (const [name, steps] of Object.entries(map.traces))
  for (const s of steps) if (!byId.has(s)) errors.push(`trace ${name}: step names missing node: ${s}`);

if (errors.length) {
  console.error(`system-map check FAILED (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
const dirs = [...byId.values()].filter((n) => n.path).length;
console.log(`system-map check OK: ${map.nodes.length} nodes (${dirs} directories), ${map.cords.length} cords, ${Object.keys(map.traces).length} trace(s); layout covers ${Object.keys(layout.nodes).length} nodes.`);
