# Slice W1 — Wikidata adapter core: report (2026-11-19)

Built in the wikidata track's worktree (branch
`track/wikidata-adapter`, cut from origin/main `76996ae`).
**Local only — not pushed.** The design record and owner rulings
are in `docs/fork/wikidata-adapter-plan.md`; the contract is
design §3.6 under §§3.4–3.5, §4.3 and §4.4.

## What was built, and where

The adapter lives in `src/fork/`, where the repo's other adapters
live (wordnet-lex.ts, cskg-feed.ts, cskg-ingest.ts) — plain data
records out, no graph mutation; banking is W2. Three modules:

- `src/fork/wikidata-client.ts` — the endpoint client. Live access
  is the Wikidata Action API only (no local DB/dump/mirror), via
  env `WIKIDATA_BASE_URL` (default
  `https://www.wikidata.org/w/api.php`), polite User-Agent, no key.
  Fetch is injected (`FetchLike`), so tests substitute the fixture
  source. Failures return `{ status: "unavailable", reason }` —
  never a throw across the interface, never a fabricated entity.
  `FixtureWikidataSource` serves the committed fixtures through
  the same interface and reports misses as unavailable.
- `src/fork/wikidata-mapping.ts` — the property→association
  mapping table v1 as a DATA module (contents below). The core
  holds no property knowledge and no entity-type assumptions;
  extending the adapter is adding a row.
- `src/fork/wikidata.ts` — the core: `parseWikidataEntities` /
  `parseWikidataSearch` (wbgetentities/wbsearchentities shapes →
  plain item records; Wikidata's native statement model stops
  here, §3.4), `translateWikidataItems` (items → association
  records + node records + skip-log), and `proposeWikidataJoin`
  (item → concept/synset bridge proposals).

Tests: `test/fork-wikidata.test.ts` (13 tests) against the
fixtures; no test touches the network.

Schematic home updated: `ai-system/intake/wikidata/PLACEHOLDER.md`
(placeholder → partial, 40%) and the `intake/wikidata` registry
entry in `ai-system/system-map.ts`; `npm run ai:check` passes.

## Mapping table v1, as built

| Property | Association | Direction |
| :--- | :--- | :--- |
| P36 capital | `CAPITAL_OF` (new) | inverted: capital —CAPITAL_OF→ territory |
| P17 country | `LOCATED_IN` (new) | forward |
| P131 located in the administrative territorial entity | `LOCATED_IN` (new) | forward |
| P361 part of | `PART_OF` | forward |
| P625 coordinate location | *(no edge)* — node properties `lat`/`lon` | node-properties |
| P31 instance of | `IS_A` | forward |
| P279 subclass of | `IS_A` | forward |

`PART_OF` and `IS_A` are the graph's existing associations
(src/graph.ts: PART_OF is the meronym→holonym type with a
propagation rule already in propagate.ts; IS_A is the
classification association — synset→hypernym in graph.ts, and the
fork's CONCEPT_LINKS/join extraLinks use the same name for concept
classification). P31/P279 take IS_A for that reason: no parallel
taxonomy edge was invented. `CAPITAL_OF` and `LOCATED_IN` are new,
as §3.6 names them; they exist in W1 as association-record types —
adding them to graph.ts's EdgeType union is W2's banking work.

Unmapped properties are logged and counted in the skip-log
(property, label when known, count, reason `unmapped-property`;
a mapped edge property with a non-item value counts as
`non-item-value`). In the fixtures: Oklahoma skips P1082
population ×1, P571 inception ×1, P37 official language ×1;
Texas skips P1082 ×1, P571 ×1; Mercury skips none.

## Provenance, as built

Every association is retrieved-kind with a SourceRecord
(`dataset: "wikidata"`, `baseVersion` = fetch date, `uri` =
subject QID, `retrievedFrom` = endpoint or "fixture"), at the
fixed structural confidence 0.9. Every node record and every
association carries `neverPropagationAnchor: true` (§3.6/§6.1);
W2's banking must preserve it in the graph's representation.

## Join proposals, as built

Candidates come from the English label and the enwiki sitelink
title (normalised: lowercase, parenthetical qualifier stripped),
matched against WordNet noun synsets (`synsetsForLemma` over the
shipped extract) and fork concept names (`classificationsOf`).
More than one distinct candidate, or a label/sitelink mismatch,
sets `conflict: true` with a reason on the proposal. Every
proposal carries `autoJoined: false` — the mechanism proposes,
nothing joins. Fixture outcomes: Oklahoma → its single synset,
no conflict; Texas → single synset; Mercury → conflict (four
WordNet noun synsets for "mercury", plus the fork's concept of
the same name).

## Fixture provenance — live-recorded

wikidata.org was reachable from this VM (HTTP 200 from the Action
API). The fixtures in `test/fixtures/wikidata/` were recorded
live on 2026-11-19 and trimmed to the exercised statements,
keeping the API's response shape (see that directory's README):

- Oklahoma — **Q1649**. The slice brief named Q5215; that QID is
  "glossary of philosophy", verified live. `wbsearchentities` for
  "Oklahoma" returns Q1649 first, and Q1649's label is Oklahoma.
  The brief's intent (the state of Oklahoma) is what was built;
  the QID is the correction.
- Texas — Q1439 (second US state).
- Mercury — Q308 (the non-place item; also the ambiguous join
  case above).

Oklahoma's translated graph, as the tests pin it: Oklahoma City
—CAPITAL_OF→ Oklahoma; Oklahoma —LOCATED_IN→ United States (P17
and P131, two statements); Oklahoma —PART_OF→ contiguous United
States; Oklahoma —IS_A→ U.S. state; coordinates 35.5/−98 as node
properties, never an edge; no P-number appears as an edge name.

## Gates (fresh runs, this tree, figures verbatim)

- `npm test` — ℹ tests 1068 · ℹ pass 1065 · ℹ fail 0 ·
  ℹ skipped 3 · ℹ cancelled 0 · ℹ todo 0
- `npm run fork:demo` — "demo/wuxing-parser: 29/29 expectations
  met · 29 parsed · 27 exact round-trips"
- `npm run fork:holdout` — "ON: parsed 80/80 (100.0%), exact 29,
  mean classifications 0.47"; "flipped fail->success: 26; parse
  regressions: 0; round-trip regressions: 0" (OFF: parsed 54/80)
- `npm run fork:sense` — "Set A: coherence **11/11** vs
  isolated-climb baseline **3/11**"; "Set B (sealed, single run):
  coherence **5/6** vs baseline **3/6**"
- `npm run ai:check` — "system-map check OK: 89 nodes (69
  directories), 22 cords, 1 trace(s); layout covers 89 nodes."

## What remains

- **W2** — runtime banking/answering: bank accepted proposals and
  associations into the KB base partition (CAPITAL_OF/LOCATED_IN
  join graph.ts's EdgeType union; SourceRecord nodes linked by
  SOURCED_FROM; never-anchor flag preserved); retrieved facts
  render as plain statements, never derivation language.
- **W3** — place end-to-end: hemisphere/latitude band computed
  from coordinates at import (§8.10), climate where classified,
  coordinate-less places flagged incomplete; SA-TONIGHT in its
  computed form.

Nothing in W1 changes what the chat can answer today, and no
Wikidata data is banked anywhere by this slice.
