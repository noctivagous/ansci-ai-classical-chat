#!/usr/bin/env node
/**
 * fork-entity-fixtures-record.mjs — DEV-TIME recorder for the
 * entity-ranking evaluation fixtures (docs/fork/entity-ranking-
 * report.md). This is the one script in the ranking build that
 * touches the network, and it is never run by tests: it records
 * real Wikidata candidate data ONCE, and the evaluation
 * (scripts/fork-entity-eval.mjs) runs offline against the record.
 *
 * For each case: wbsearchentities (the candidate list IN SEARCH
 * ORDER — that order is the baseline the ranker must beat), then
 * wbgetentities for sitelink counts and P31 (instance-of) labels.
 * The expected item per case is selected by a description
 * substring authored below; the printed table lets a human verify
 * every selection against the recorded descriptions before the
 * fixture is trusted.
 *
 * Run: node scripts/fork-entity-fixtures-record.mjs
 * Writes: test/fixtures/entity-ranking-cases.json
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://www.wikidata.org/w/api.php";
const UA = { "User-Agent": "AnSciEntityRankingFixtureRecorder/0.1 (classical-AI research; contact: repo noctivagous/ansci-ai-classical-chat)" };
const LIMIT = 8;

// [mention, context sentence, expectedKind, expected description substring]
const CASES = [
  ["Springfield", "Where is Springfield, the capital of Illinois?", "place", "capital city of the U.S. state of Illinois"],
  ["Springfield", "He drove through Springfield, Missouri on the highway.", "place", "in Missouri, United States"],
  ["Cambridge", "She studies at the university in Cambridge, England.", "place", "city in Cambridgeshire"],
  ["Cambridge", "He teaches at a university in Cambridge, Massachusetts.", "place", "city in Massachusetts"],
  ["Washington", "Washington crossed the Delaware with his army.", "person", "first president of the United States"],
  ["Washington", "Washington is a state in the Pacific Northwest.", "place", "state of the United States"],
  ["Washington", "Washington is the capital of the United States.", "place", "capital of the United States"],
  ["Victoria", "Queen Victoria reigned over the British Empire.", "person", "queen of the United Kingdom"],
  ["Victoria", "Victoria is a state in southeastern Australia.", "place", "state of Australia"],
  ["Reading", "Reading is a town in Berkshire, England.", "place", "town in Berkshire"],
  ["Jordan", "The Jordan flows into the Dead Sea.", "place", "river in Western Asia"],
  ["Jordan", "Jordan is a country in the Middle East.", "place", "country in Western Asia"],
  ["Jordan", "Michael Jordan played basketball for Chicago.", "person", "American basketball player"],
  ["Lincoln", "Lincoln was assassinated in a theatre in 1865.", "person", "president of the United States"],
  ["Lincoln", "Lincoln is the capital city of Nebraska.", "place", "capital of Nebraska"],
  ["Mercury", "Mercury is the smallest planet in the solar system.", "thing", "planet closest to the Sun"],
  ["Mercury", "Mercury was the Roman god of commerce and travel.", "person", "Roman god"],
  ["Mercury", "The thermometer broke and the mercury spilled out.", "thing", "chemical element"],
  ["Apple", "Steve Jobs founded Apple in California.", "organisation", "American multinational technology company"],
  ["Apple", "She ate an apple for lunch.", "thing", "fruit of the apple tree"],
  ["Java", "Java is an island in Indonesia.", "place", "island of Indonesia"],
  ["Java", "He writes computer programs in Java.", "thing", "programming language"],
  ["Amazon", "The Amazon is the largest river by discharge of water.", "place", "river in South America"],
  ["Amazon", "She ordered the book from Amazon.", "organisation", "American multinational technology company"],
  ["Turkey", "Turkey is a country between Europe and Asia.", "place", "country in West Asia and Southeast Europe"],
  ["Turkey", "They roasted a turkey for dinner.", "organism", "species of bird"],
];

async function api(params) {
  const url = API + "?" + new URLSearchParams({ format: "json", ...params }).toString();
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

const out = [];
for (const [mention, contextText, expectedKind, expectedDesc] of CASES) {
  const search = await api({ action: "wbsearchentities", search: mention, language: "en", limit: String(LIMIT) });
  const hits = search.search ?? [];
  const ids = hits.map((h) => h.id);
  const entities = await api({
    action: "wbgetentities",
    ids: ids.join("|"),
    props: "sitelinks|claims|descriptions|labels",
    languages: "en",
  });
  // Resolve P31 value labels in one batch.
  const p31ids = new Set();
  for (const id of ids) {
    for (const claim of entities.entities[id]?.claims?.P31 ?? []) {
      const v = claim.mainsnak?.datavalue?.value?.id;
      if (v) p31ids.add(v);
    }
  }
  let p31labels = {};
  if (p31ids.size) {
    const labelsRes = await api({ action: "wbgetentities", ids: [...p31ids].join("|"), props: "labels", languages: "en" });
    for (const [qid, e] of Object.entries(labelsRes.entities ?? {})) {
      p31labels[qid] = e.labels?.en?.value ?? qid;
    }
  }
  const candidates = hits.map((h) => {
    const e = entities.entities[h.id] ?? {};
    return {
      id: h.id,
      label: h.label ?? e.labels?.en?.value ?? h.id,
      description: h.description ?? e.descriptions?.en?.value ?? "",
      sitelinks: Object.keys(e.sitelinks ?? {}).length,
      instanceOf: (e.claims?.P31 ?? [])
        .map((c) => p31labels[c.mainsnak?.datavalue?.value?.id])
        .filter(Boolean),
    };
  });
  const expected = candidates.find((c) => (c.description ?? "").includes(expectedDesc));
  if (!expected) {
    console.log(`!! NO EXPECTED MATCH for ${mention} / "${expectedDesc}"`);
    for (const c of candidates) console.log(`   ${c.id} ${c.label} — ${c.description}`);
    process.exitCode = 1;
    continue;
  }
  console.log(`ok ${mention} -> ${expected.id} (${expected.label}) [search position ${candidates.indexOf(expected) + 1}/${candidates.length}] :: ${contextText}`);
  out.push({ mention, contextText, expectedKind, expected: expected.id, candidates });
}

writeFileSync(
  join(root, "test", "fixtures", "entity-ranking-cases.json"),
  JSON.stringify({ recordedNote: "Recorded live from the Wikidata API by scripts/fork-entity-fixtures-record.mjs; candidates in wbsearchentities order.", cases: out }, null, 2) + "\n",
);
console.log(`\nwrote ${out.length} cases`);
