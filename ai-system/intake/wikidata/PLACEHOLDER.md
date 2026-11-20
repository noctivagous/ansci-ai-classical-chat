# Wikidata

Schematic address: `intake/wikidata` · Type: Source · State: partial · 85% completed to goal

Facts tier. Slices W1 (adapter core), W2 (lookup + banking +
answering) and W3 (place associations) built 2026-11-19
(plan: `docs/fork/wikidata-adapter-plan.md`; reports:
`docs/fork/wikidata-w1-report.md`,
`docs/fork/wikidata-w2-report.md`,
`docs/fork/wikidata-w3-report.md`).

Working code today: src/fork/wikidata.ts (parser, translator,
join proposals), src/fork/wikidata-client.ts (Action API endpoint
client, fetch injected; fixture source), src/fork/wikidata-mapping.ts
(the property→association mapping table, v1, as a data module),
src/fork/wikidata-bank.ts (the banked retrieved-facts store, its
graph mirror, and the W3 banked situation associations),
src/fork/wikidata-turn.ts (the async turn wrapper: bank-first
answering, the lookup trigger, the lookup-unavailable and
ambiguous declines), src/situation.ts (the shared §8.10
computation both the live Situation and the bank call)

## What W1 built

API access only (owner ruling): no local Wikidata database, dump
or mirror. The endpoint is configurable via `WIKIDATA_BASE_URL`
(default `https://www.wikidata.org/w/api.php`), no key, polite
User-Agent. A failed lookup reports
`{ status: "unavailable", reason }` — "lookup unavailable" is a
stated state, never a fabricated absence. Tests never touch the
network: they run against recorded-shape fixtures in
`test/fixtures/wikidata/` (live-recorded 2026-11-19, trimmed;
Oklahoma is Q1649 — Q5215 is "glossary of philosophy").

The core is general: no entity-type assumptions in code. The
mapping is a data table (wikidata-mapping.ts), extensible by
adding rows:

| Property | Becomes |
| :--- | :--- |
| P36 capital | `CAPITAL_OF` (new), inverted — capital —CAPITAL_OF→ territory |
| P17 country, P131 located-in | `LOCATED_IN` (new) |
| P361 part of | `PART_OF` (existing) |
| P625 coordinates | no edge — node properties `lat`/`lon` |
| P31 instance of, P279 subclass of | `IS_A` (existing classification association) |

Unmapped properties are logged and counted in a skip-log
(property, label when known, count, reason), never silently
dropped and never force-fitted. Every association is
retrieved-kind with a SourceRecord (dataset "wikidata",
baseVersion = fetch date, uri = item QID) at fixed confidence
0.9, and every KB node record carries
`neverPropagationAnchor: true`.

Join proposals: bridges from the English label + enwiki sitelink
title against WordNet lemmas and fork concept names; multiple
candidates or a label/sitelink mismatch flag a conflict on the
proposal. Nothing is auto-joined (`autoJoined: false`).

## What W2 built

Banking: W1 translations bank idempotently into a dedicated
store (wikidata-bank.ts — ingested.ts's separate-store
reasoning: retrieved facts keep their own provenance and
accessors), mirrored into the session graph's base partition:
CAPITAL_OF/LOCATED_IN joined graph.ts's EdgeType union,
SourceRecord nodes are linked by SOURCED_FROM, coordinates and
neverPropagationAnchor ride in node properties, edges carry
retrieved provenance at confidence 0.9. The bank is
process-level: it persists across sessions in a process, and
is not file-backed.

Answering: processTurn is synchronous, so the lookup lives in
an async wrapper (wikidata-turn.ts). The first consumers —
"where is X?", "what is the capital of X?", "what country is
X in?" — answer from the bank with no fetch. On a located
knowledge decline the wrapper resolves the name (first
exact-label hit in search rank, gated by the unconflicted
join proposal), fetches the item plus the references its
mapped edges name (≤50-id chunks — the API's limit), banks,
and re-answers as the same turn's reply; the trace's wikidata
record carries the retrieved provenance (dataset + QID) and
no derivation language is used. An unavailable source draws a
lookup-unavailable decline, distinct from the nothing-held
decline; a conflicted or unresolvable name leaves the
ordinary decline standing, noted in the trace.

## What W3 built

Place associations (§3.6, §8.10–§8.11): the §8.10 computation
was factored into shared exported primitives in
src/situation.ts (hemisphereForLatitude,
latitudeBandForLatitude, seasonForDayOfYear, and the §8.10b
solar night proportion — solarDeclinationDegrees,
nightProportionFor, computedLightAspect) used by BOTH
computeSituation and the bank — one implementation, two
callers. At bank time a node carrying lat/lon banks a
situation association (hemisphere, latitude band) marked
derived-kind with its steps marked per §3.5 rule 2 (retrieved
P625 coordinates → derived computation); the graph mirror
carries the same marking. A banked node without coordinates
is flagged incomplete: it still answers capital/containment,
but situationForPlace / nightForPlace over it return a
located decline naming the missing coordinates — no canonical
profile is substituted. Consumption is at the bank level
(situationForPlace feeds banked coordinates into
computeSituation itself, location source "kb"; nightForPlace
is SA-TONIGHT in computed form), because the fork turn layer
has no place-situation question shape yet. The Sydney fixture
is HAND-SHAPED (not live-recorded): W2's live run met HTTP
429 from wikidata.org, a hard stop — W3 made no live call.
Climate (§8.11) remains unmapped-and-skip-logged in v1: no
mapping-table row covers a climate classification property,
and the correct property/value shape could not be verified
without the live access the 429 stop forbids (W3 report).

## What remains

- Slice 0 re-base: re-key W2's lookup trigger and subject
  extraction on Slice 0's entity grounding when it lands.
- W2's live acceptance completion (Texas Q1439 live banking,
  the fresh-session live repeat, the ≤50-id chunking fix
  against the real API) — outstanding under the wikidata.org
  HTTP 429 hard stop; not to be retried until a later session
  takes it up.
- Climate mapping (§8.11), when a climate classification
  property's shape can be verified and a row added to the
  mapping data table.
