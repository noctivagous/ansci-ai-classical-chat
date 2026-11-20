# Wikidata adapter — plan and owner rulings (2026-11-19)

The design record for the Wikidata knowledge-base adapter. The
contract it implements is `docs/design-base-nets-and-chat.md` §3.6,
under the storage law of §3.4 (knowledge is stored only as
ontological associations), the provenance discipline of §3.5
(retrieved vs derived, never masquerading), §4.3 (SourceRecord) and
§4.4 (imports log and count what they skip).

## Owner rulings (settled — implemented as stated)

- **Timing: hybrid (1a).** The adapter core is built and
  fixture-tested ahead of need (this programme, slices W1–W3);
  runtime banking and answering integration follow as W2, and the
  place/situation end-to-end as W3. Nothing in W1 changes what the
  chat can answer today.
- **API access only (2a's access half).** No local Wikidata
  database, dump or mirror. Live access is the Wikidata Action API
  through a configurable endpoint — env `WIKIDATA_BASE_URL`,
  default `https://www.wikidata.org/w/api.php` — with a polite
  descriptive User-Agent and no API key. Tests never touch the
  network: gated tests run against recorded-shape fixtures
  committed in the repo (`test/fixtures/wikidata/`).
- **General core (2a's shape half).** No entity-type assumptions in
  code. The property→association mapping is a DATA TABLE
  (`src/ansci/wikidata-mapping.ts`), extensible by adding rows; the
  translator walks the table and knows nothing about states,
  planets or places as types.
- **Offline honesty.** When a lookup cannot be served (network
  failure, HTTP error, or a fixture source that does not carry the
  item), the client reports `{ status: "unavailable", reason }`.
  "Lookup unavailable" is a stated state, never dressed up as the
  item not existing, and never filled in by fabrication.

## Mapping table v1

| Property | Label | Becomes | Direction |
| :--- | :--- | :--- | :--- |
| P36 | capital | `CAPITAL_OF` (new) | inverted: capital —CAPITAL_OF→ territory |
| P17 | country | `LOCATED_IN` (new) | forward |
| P131 | located in the administrative territorial entity | `LOCATED_IN` (new) | forward |
| P361 | part of | `PART_OF` (existing, graph.ts) | forward |
| P625 | coordinate location | *(no edge)* — node properties `lat`/`lon` | node-properties |
| P31 | instance of | `IS_A` (existing classification association) | forward |
| P279 | subclass of | `IS_A` (existing classification association) | forward |

P31/P279 take `IS_A` because that is the graph's one existing
classification association (synset —IS_A→ hypernym in graph.ts;
the fork's CONCEPT_LINKS use the same name for concept
classification). No parallel taxonomy edge is invented.

Unmapped properties are **logged and counted** in a skip-log
(property id, English label when known, occurrence count, reason),
per §4.4's pattern — never silently dropped, never mapped to a
vague catch-all edge. A mapped edge property whose statement value
is not an item is likewise counted (`non-item-value`).

## Provenance

Every translated association is **retrieved-kind** (§3.5) with a
SourceRecord: `dataset: "wikidata"`, `baseVersion` = the fetch
date, `uri` = the subject item's QID, `retrievedFrom` = the
endpoint (or "fixture"). Structural facts import at the fixed
confidence **0.9** (§3.6, below §4.3's curated ceiling). Every KB
node record carries `neverPropagationAnchor: true` — KB nodes
never become propagation anchors on their own (§3.6, §6.1); W2's
banking must preserve the flag.

## Join proposals

An item joins the graph at the concept or synset it denotes.
Bridges are **proposed** from the English label and the enwiki
sitelink title, matched against WordNet lemmas (src/wordnet.ts
accessors) and fork concept names (classify.ts). Multiple distinct
candidates, or a label/sitelink mismatch, flag a **conflict** on
the proposal. Nothing is auto-joined silently — a proposal record
carries `autoJoined: false`, and accepting one is a later,
reviewed act (W2).

## Slices and gates

- **W1 — adapter core (this slice).** Endpoint client (fetch
  injected), wbgetentities/wbsearchentities parser, mapping table
  v1 as a data module, translator (associations + node properties
  + skip-log), join-proposal function, recorded-shape fixtures
  (Oklahoma Q1649, Texas Q1439, Mercury Q308) and fixture tests.
  Gate: the full suite, fork:demo, fork:holdout, fork:sense and
  ai:check all pass; fixture translation yields the expected
  association graph with no P-numbers as edge names and
  coordinates as properties, not edges.
- **W2 — runtime banking / answering integration.** Accepted join
  proposals and translated associations bank into the KB's own
  base partition as graph edges (adding `CAPITAL_OF`/`LOCATED_IN`
  to the graph's edge vocabulary), with SourceRecord nodes linked
  by `SOURCED_FROM`, the never-anchor flag preserved in the
  graph's representation, and retrieved facts rendered as plain
  statements of fact, never in derivation language (§3.5 rule 1,
  §9.5). Gate: a banked fixture place answers capital-of and
  containment questions with provenance visible in debug mode.
- **W3 — place end-to-end / situation associations.** Place
  imports derive hemisphere and latitude band from coordinates by
  the §8.10 rules (one implementation, two callers), climate where
  classified (§8.11), and a place import without coordinates is
  flagged incomplete. Gate: §3.6's place end-to-end — a fixture
  place's situation associations resolve from the KB and
  SA-TONIGHT passes in its computed form.

## Fixture provenance

The W1 fixtures were recorded live from wikidata.org on
2026-11-19 and trimmed to the properties and referenced-item
labels the tests exercise, keeping the API's response shape
(see `test/fixtures/wikidata/README.md`). One correction the live
recording established: Oklahoma is **Q1649**, not Q5215 (Q5215 is
"glossary of philosophy"); wbsearchentities for "Oklahoma"
returns Q1649 as its first hit.
