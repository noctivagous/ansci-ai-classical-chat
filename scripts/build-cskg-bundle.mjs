/**
 * build-cskg-bundle.mjs — regenerate the shipped CSKG bundle
 * (data/cskg/cskg-trim.tsv + data/cskg/manifest.json) from the
 * locally installed full extract.
 *
 * The bundle was first generated 2026-11-17 as Run 2 of the CSKG
 * trim measurement, by a staged procedure performed by hand. This
 * script is that procedure, committed — the same one the
 * measurement recorded:
 *
 *   stage 1  relation filter — only relations the feeder maps
 *            (isCskgRelationMapped, src/fork/cskg-feed.ts);
 *   stage 2  English/source rules — concept-relation rows keep
 *            only when both node ids live under /c/en/ (ATOMIC
 *            rows pass on their relation: ATOMIC is English-only
 *            and its node ids live in the at: space); rows sourced
 *            exactly VG (Visual Genome) are excluded;
 *   stage 3  the feeder's own mapTriple as the endpoint stage —
 *            concept relations need both ends classified, ATOMIC
 *            relations need the event-rule anchoring. Kept links
 *            are written as the lean four-column TSV (from,
 *            relation, to, source code): from/to are mapTriple's
 *            normalised outputs, the relation its normalised name.
 *
 * The mapping itself is NOT reimplemented here: stage 1 asks the
 * compiled feeder, stage 3 calls it. The relation lists below are
 * the manifest's declared map description only — the script
 * cross-checks them against the feeder both ways (every declared
 * relation must be feeder-mapped; every relation that survives
 * stage 1 in the data must be declared) and fails loudly rather
 * than write a manifest the feeder disagrees with.
 *
 * Input: data/raw/cskg/cskg.tsv.gz (a local install artifact;
 * `node scripts/install.mjs` downloads it from Zenodo record
 * 4331372). ANSCI_CSKG_TSV overrides the extract path (the same
 * override cskg-ingest.ts honours); ANSCI_CSKG_BUNDLE_DIR
 * overrides the output directory (default data/cskg/).
 *
 * Deterministic: same extract + same feeder code ⇒ same bytes.
 * The manifest's counts are computed from the run, never
 * hard-coded; `firstGenerated` is carried over from the previous
 * manifest, `generated` is the date of this run.
 *
 * Run via: npm run fork:build-cskg-bundle
 */
import { createRequire } from "node:module";
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";
import * as readline from "node:readline";

const require = createRequire(import.meta.url);
const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..");

const EXTRACT_RELATIVE = path.join("data", "raw", "cskg", "cskg.tsv.gz");
const extractPath = process.env.ANSCI_CSKG_TSV ?? path.join(root, EXTRACT_RELATIVE);
const bundleDir = process.env.ANSCI_CSKG_BUNDLE_DIR ?? path.join(root, "data", "cskg");
const TSV_NAME = "cskg-trim.tsv";
const MANIFEST_NAME = "manifest.json";

function fail(message) {
  console.error(`build-cskg-bundle: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(extractPath)) {
  fail(
    `CSKG full extract not found at ${extractPath}.\n` +
      `The bundle regenerates from the installed extract, which is a local install artifact.\n` +
      `Install it with: node scripts/install.mjs  (downloads cskg.tsv.gz from Zenodo record 4331372 into data/raw/cskg/)`,
  );
}

let feeder;
try {
  feeder = require("../dist/src/fork/cskg-feed.js");
} catch {
  fail(
    `compiled feeder not found at dist/src/fork/cskg-feed.js.\n` +
      `Run npm run build first — or run this script via: npm run fork:build-cskg-bundle`,
  );
}
const { mapTriple, normaliseRelation, isCskgRelationMapped } = feeder;

/* The manifest's declared map description (feederMap). Behaviour
 * comes from the feeder; these lists are cross-checked against it. */
const CONCEPT_RELATIONS = [
  "Causes", "UsedFor", "AtLocation", "HasSubevent", "HasPrerequisite",
  "CapableOf", "PartOf", "HasProperty", "Desires", "MadeOf", "IsA", "RelatedTo",
];
const ATOMIC_RELATIONS = [
  "at:xNeed", "at:xEffect", "at:oEffect", "at:xReact", "at:oReact",
  "at:xWant", "at:oWant", "at:xIntent", "at:xAttr",
];
const ATOMIC_SET = new Set(ATOMIC_RELATIONS);
const DECLARED_SET = new Set([...CONCEPT_RELATIONS, ...ATOMIC_RELATIONS]);

for (const relation of DECLARED_SET) {
  if (!isCskgRelationMapped(relation)) {
    fail(
      `the script's declared map lists '${relation}', but the compiled feeder does not map it.\n` +
        `The feeder (src/fork/cskg-feed.ts) is the source of truth — update this script's declared lists to match it.`,
    );
  }
}

const today = (() => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
})();

/* firstGenerated carries over from the previous manifest, if any. */
let firstGenerated = today;
const previousManifestPath = path.join(bundleDir, MANIFEST_NAME);
if (fs.existsSync(previousManifestPath)) {
  try {
    const previous = JSON.parse(fs.readFileSync(previousManifestPath, "utf8"));
    firstGenerated = previous.firstGenerated ?? previous.generated ?? today;
  } catch {
    fail(`existing manifest at ${previousManifestPath} is not readable JSON — refusing to overwrite it blind.`);
  }
}

fs.mkdirSync(bundleDir, { recursive: true });
const tmpTsvPath = path.join(bundleDir, `${TSV_NAME}.tmp-${process.pid}`);
const out = fs.createWriteStream(tmpTsvPath, { encoding: "utf8" });

const stages = { raw: 0, afterRelationFilter: 0, afterEnglishAndSourceRules: 0, kept: 0 };
const byRelation = {};
const bySource = {};
const seenMapped = new Set();

const lines = readline.createInterface({
  input: fs.createReadStream(extractPath).pipe(zlib.createGunzip()),
  crlfDelay: Infinity,
});

let columns = null;
for await (const line of lines) {
  if (!columns) {
    const fields = line.split("\t");
    columns = {
      n1: fields.indexOf("node1"),
      rel: fields.indexOf("relation"),
      n2: fields.indexOf("node2"),
      n1label: fields.indexOf("node1;label"),
      n2label: fields.indexOf("node2;label"),
      source: fields.indexOf("source"),
    };
    if (Object.values(columns).some((i) => i < 0)) {
      out.close();
      fs.rmSync(tmpTsvPath, { force: true });
      fail(`extract header at ${extractPath} lacks an expected column (node1, relation, node2, node1;label, node2;label, source).`);
    }
    continue;
  }
  if (!line) continue;
  const fields = line.split("\t");
  stages.raw++;

  /* Stage 1 — relation filter, by the feeder's own word. */
  const relation = normaliseRelation(fields[columns.rel] ?? "");
  if (!isCskgRelationMapped(relation)) continue;
  seenMapped.add(relation);
  stages.afterRelationFilter++;

  /* Stage 2 — English/source rules. */
  const source = fields[columns.source] ?? "";
  if (source === "VG") continue;
  if (!ATOMIC_SET.has(relation)) {
    const n1 = fields[columns.n1] ?? "";
    const n2 = fields[columns.n2] ?? "";
    if (!n1.startsWith("/c/en/") || !n2.startsWith("/c/en/")) continue;
  }
  stages.afterEnglishAndSourceRules++;

  /* Stage 3 — the feeder's mapTriple decides. Triples are built
   * exactly as cskg-ingest.ts builds them from the extract:
   * the label columns, the relation column as spelled. */
  const result = mapTriple({
    subject: fields[columns.n1label] ?? "",
    relation: fields[columns.rel] ?? "",
    object: fields[columns.n2label] ?? "",
  });
  if (!result.ok) continue;
  stages.kept++;
  byRelation[relation] = (byRelation[relation] ?? 0) + 1;
  bySource[source] = (bySource[source] ?? 0) + 1;
  if (!out.write(`${result.link.from}\t${relation}\t${result.link.to}\t${source}\n`)) {
    await new Promise((resolve) => out.once("drain", resolve));
  }
}
await new Promise((resolve, reject) => {
  out.once("error", reject);
  out.end(resolve);
});

/* The other cross-check direction: the data must not carry a
 * feeder-mapped relation the declared map does not name. */
for (const relation of seenMapped) {
  if (!DECLARED_SET.has(relation)) {
    fs.rmSync(tmpTsvPath, { force: true });
    fail(
      `the extract carries feeder-mapped relation '${relation}', which this script's declared map does not name.\n` +
        `Update CONCEPT_RELATIONS / ATOMIC_RELATIONS in scripts/build-cskg-bundle.mjs so the manifest describes the feeder's current map.`,
    );
  }
}

const tsvPath = path.join(bundleDir, TSV_NAME);
fs.renameSync(tmpTsvPath, tsvPath);
const tsvBytes = fs.statSync(tsvPath).size;

/* The manifest mirrors the shipped file's shape: compact JSON,
 * keys sorted at every level, no trailing newline. Every count is
 * computed from this run. */
function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort()) sorted[key] = sortDeep(value[key]);
    return sorted;
  }
  return value;
}

const manifest = sortDeep({
  v: 1,
  source:
    "CSKG: The CommonSense Knowledge Graph (Ilievski, Szekely & Zhang, ESWC 2021), USC Information Sciences Institute — data: Zenodo record 4331372, file cskg.tsv.gz",
  license: "CC BY-SA 4.0",
  attribution:
    "CSKG: The CommonSense Knowledge Graph, Ilievski, Szekely & Zhang, ESWC 2021, USC Information Sciences Institute. This bundle is a trimmed subset of CSKG, distributed under CC BY-SA 4.0; ShareAlike applies to this bundle data. CSKG unifies ConceptNet, WordNet, FrameNet, ATOMIC, Roget's Thesaurus, a Wikidata subset and Visual Genome; each edge in the bundle keeps its source code (AT, CN, CN|WN, WN) so component provenance survives.",
  generated: today,
  firstGenerated,
  generator:
    "Trim of the locally installed full extract (data/raw/cskg/cskg.tsv.gz) by the fork feeder's own rules (src/fork/cskg-feed.ts, mapTriple), produced by scripts/build-cskg-bundle.mjs (npm run fork:build-cskg-bundle). The bundle was first generated as Run 2 of the CSKG trim measurement (2026-11-17); this script is that staged procedure — relation filter, English/source rules, mapTriple as the endpoint stage — committed.",
  feederMap: {
    conceptRelations: CONCEPT_RELATIONS,
    atomicRelations: ATOMIC_RELATIONS,
    endpointRule:
      "Concept relations: both endpoints must classify (curated table in classify.ts, or the WordNet climb in wordnet-lex.ts). ATOMIC relations: event-rule anchoring (known head verb on the event side, classifiable head word on the other side).",
    englishRule:
      "Concept-relation rows: both node ids under /c/en/. ATOMIC rows pass on their relation (ATOMIC is English-only; its node ids live in the at: space). Rows sourced exactly VG (Visual Genome) are excluded.",
  },
  stages: {
    raw: stages.raw,
    afterRelationFilter: stages.afterRelationFilter,
    afterEnglishAndSourceRules: stages.afterEnglishAndSourceRules,
    kept: stages.kept,
  },
  counts: { edges: stages.kept, byRelation, bySource },
  parts: [
    {
      file: TSV_NAME,
      kind: "edges",
      format:
        "Lean TSV, four columns, no header: from (mapTriple's normalised output — concept label, or full phrase for ATOMIC), relation (as spelled in the source data), to, source code. Plain text, not gzipped, so the bundle diffs like the repo's other shipped data parts.",
      count: stages.kept,
      bytes: tsvBytes,
    },
  ],
});
fs.writeFileSync(path.join(bundleDir, MANIFEST_NAME), JSON.stringify(manifest), "utf8");

console.log(
  JSON.stringify(
    {
      extract: extractPath,
      bundleDir,
      stages,
      bySource,
      tsvBytes,
      generated: today,
      firstGenerated,
    },
    null,
    2,
  ),
);
