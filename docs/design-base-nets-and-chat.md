# Design — Base Nets, Ontological Direction, and the In-App Chat

\*Status: design, 2026-11-08. Slice 1 (the direction layer) is built. \*\*Slice 2a
(WordNet + chat) is built\*\* (2026-11-08): OEWN 2024 extract bundled (117,008 synsets,
13.2 MB — over the 10 MB target, under the 16 MB snapshot cap; adverb synsets,
derivational edges and gloss examples trimmed), sense-keyed mappings, IS\_A climbing,
`npm run chat`; 21/21 tests. **The router (§7) is designed, build pending:** it
becomes slice **2b**, ahead of propagation. \*\*Thought and memory (§8) are
designed, build pending:\*\* the per-turn `ThoughtTrace` deliberation record and
the three-layer memory (semantic / episodic / experience) are designed before
2b is built, so 2b implements them rather than inventing them mid-code; the
trace, the episodic trace ring and the experience log are in 2b's scope, while
experience aggregation stays with slice 3. \*\*The translation layer (§9) is
designed, build pending:\*\* the renderer — until now only named in §7.1 — is
specified as a three-stage pipeline (content planning, realisation,
verification) that turns ThoughtTrace conclusions into sentences; its
template form and the dismantling of the reasoner's built-in prose are in
2b's scope, while the LLM renderer is slice 3 at the earliest. \*\*The ontology
as engine (§§6.5–6.12) is designed, build pending:\*\* §6 now also specifies the
machinery that makes the ontology compute — cycles as operators (including
restraint arbitration), aspect-scoped classifications, graded polarity and
season degree profiles, balance dynamics, and correspondence composition —
and it is in slice **2c**'s scope alongside propagation. \*\*Knowledge as
ontological associations and situated awareness (§§3.4–3.6, §§8.9–8.14) are
designed, build pending:\*\* everything the system stores is stored as
associations between concepts, under a derived-vs-retrieved provenance
discipline (§3.5); Wikidata is designed as the first knowledge-base source —
a source-plus-translator into association form, not a base net (slice **2f**,
after 2e); and the chat instance is a **situated self**, holding a per-turn
computed `Situation` (host, place, season-here, time of day) whose host-clock
core is in slice 2b's scope and whose computed light proportions arrive with
2f. **Document ingestion (§11) is designed, build pending:** the AI
reader — an LLM in the trainer role, reading registered documents
paragraph by paragraph and proposing citation-carrying associations
through the same propose→test→apply door as the chat trainer (§10.4) —
with the Huangdi Neijing, read from the Chinese, as the first document
and Suwen chapters 4–5 as its pilot — becomes slice **2g**, after 2f.
Renumbering note (2026-11-08): the
router was inserted as slice 2b, so propagation moved 2b→2c, FrameNet 2c→2d and
ConceptNet 2d→2e; the chat module moved from §7 to §8 and the build order from
§8 to §9. Second renumbering note (2026-11-08): thought and memory were
inserted as §8, so the chat module moved §8→§9 and the build order §9→§10.
Third renumbering note (2026-11-08): the translation layer was inserted as
§9, so the chat module moved §9→§10 and the build order §10→§11.
Fourth renumbering note (2026-11-08): document ingestion was inserted as
§11, so the build order moved §11→§12.
Slices 2b–2g and 3 below are not built. This document supersedes any earlier framing in which AnSci would
"replace" the classical word nets — it does not. It also records decisions the
user made after slice 1 shipped: ConceptNet is **self-hosted, not vendored**
(WordNet and FrameNet, being small and CC BY, bundle trimmed — §2), upstream data
is **never modified in place** (see §3, the overlay), WordNet enters **first**
(§1.1, §12), and the licensing picture is as corrected in §3.3.\*

---

## 1. Corrected architecture: nets as base, ontology as direction

AnSci has two halves, and they come from two different places.

**The base is a combination of the classical word nets**

| Net | What it contributes |
| --- | --- |
| **WordNet** (Open English WordNet) | The lexical backbone, and the **first net in**: synsets — disambiguated word *senses* — with glosses and the relations between them (hypernym/hyponym, meronym/holonym, antonym, …). Small enough to bundle trimmed in-repo, and its synsets are what ontological mappings are keyed to (§1.1). |
| **ConceptNet** (5.7.0) | Broad common-sense relations between everyday concepts: `IsA`, `HasProperty`, `CapableOf`, `UsedFor`, `AtLocation`, `Causes`, `RelatedTo`, `Antonym`, `Synonym`, `PartOf`, … |
| **FrameNet** (1.7) | Event structure: frames (situations), their frame elements (participants/roles), and the lexical units that evoke them. This is what lets the chat understand *who does what to whom*, which ConceptNet cannot express. |
| **VerbNet** | Adjunct to FrameNet: verb classes and role/event structure for verbs, used where FrameNet's coverage of a verb is thin. Later than FrameNet; not in the first import slice. |

**The direction is AnSci's own contribution.** Net concepts and frames are mapped
onto the **atomic prior graph** — yin/yang, the Five Elements (Wuxing), trigrams,
their generation/restraint cycles and correspondence tables — which slice 1 already
built (`src/seed.ts`, `src/graph.ts`, `src/reason.ts`). The nets supply breadth and
ordinary-language coverage; the ontology supplies what neither net has: a *reason*
two things belong together (a shared prior, derivable as a path), the cycles they
move in, and correspondences across sound, colour, taste, season, body and direction.

Slice 1 is therefore **the direction layer only**: a hand-seeded prior graph and a
symbolic reasoner that already derives, e.g.,
`winter —ELEMENT_OF→ Water —POLARITY_OF→ Yin —HAS_QUALITY→ cold` with no direct
winter→cold edge. Everything in §§2–7 is about giving that reasoner a real base to
work over — and, in §7, a router that decides what a question is actually asking
before the reasoner is allowed to traverse anything.

Layering, in the terms of the user's ontology spec (`docs/user-plans/ontologyGraph.txt`):

- **Atomic** (slice 1, immutable): priors. Never written by importers or propagation.
- **Dictionary** (slice 1): vocabulary authority; net imports must respect it (§4.4).
- **Acquired**: where net base edges and ontological mappings live, all
  confidence-bearing.
- **Source**: provenance. Net facts get source records, not text passages (§4.3).
- **Audit**: `GraphAdjustment` nodes — and, for net data, the overlay (§3) is built
  in the same spirit.

### 1.1 WordNet adapter — the first net in

WordNet comes first (slice 2a) because it is small, permissively licensed, and —
most importantly — keyed by *sense*, which is what our ontological mappings need
to attach to.

- **Source and licence.** Open English WordNet, **CC BY 4.0** (attribution in
  `NOTICE`, §3.3). We import **synsets** (sets of synonymous word forms sharing
  one sense), their **glosses**, and the relations between synsets:
  **hypernym/hyponym** (the taxonomy backbone), **meronym/holonym** (part/whole),
  **antonym**, **similar-to** (adjectives), **derivationally related forms**, and
  for verbs **entailment** and **causes**.
- **Mappings are keyed to synsets, not strings.** Each synset lands in the graph
  keyed by its **sense id**, with its word forms as labels and its gloss feeding
  the dictionary layer; ontological edges (`HAS_POLARITY`, `HAS_ELEMENT`, …)
  attach to the synset. This matters because of **polysemy**: *cold* the
  temperature sense and *cold* the illness sense (a head cold) are different
  synsets and must be free to map differently — the temperature sense toward
  Water/Yin, the illness sense wherever the body subgraph puts it. ConceptNet,
  by contrast, attaches its edges to **ambiguous strings** (`/c/en/cold`), so a
  ConceptNet edge cannot receive an ontological mapping until it has been
  resolved to a synset (§4). Strings are labels; synsets are addresses.
- **Size.** WordNet is small: a trimmed extract of synsets + glosses + the
  relations above is a few MB of text and **bundles in this repo** — no hosting
  and no runtime importer, unlike ConceptNet (§2.1). The full Open English
  WordNet download refreshes the bundle through the same importer.
- **Limits, honestly.** WordNet is a *lexical taxonomy* only. It has no real
  common-sense breadth — few `UsedFor` / `AtLocation` / `Causes` facts of the
  everyday kind, few multiword everyday phrases, and no situations or events at
  all. That is exactly what the other two nets add: **FrameNet** contributes
  situations (§5), **ConceptNet** contributes everyday common sense (§4).
  WordNet alone would give a working, testable chat over a narrow lexical
  world — which is precisely why it is the right *first* test of the ontology,
  not the final base.

**Not a base net:** Wikidata (structured data, **CC0**) is a possible later
*facts* adjunct — capitals, dates, identifiers — queried alongside the graph.
It is encyclopedic, not lexical or common-sense, so it is explicitly **not** a
chat base and not part of slices 2a–2e.

---

## 2. Size strategy and hosting: keep the repo light

### 2.1 Why the raw nets cannot live in the repo

- **ConceptNet 5.7** has ≈34 million edges across all languages. The assertions
  download is GB-scale compressed and several GB raw; a full self-hosted deployment
  (edges in Postgres) is \~15 GB with embeddings in community deployments.
- **FrameNet 1.7** is ≈855 MB as a full release — but most of that is the
  hand-annotated example-sentence corpus, which we do not import (§5).
- **WordNet** (Open English WordNet) is the exception that proves the rule: it is
  small enough that a trimmed synset + relation extract bundles in-repo (§1.1).
- GitHub blocks files over 100 MB and wants repositories under \~1 GB. Git LFS was
  considered and **rejected**: it would still make every clone carry the data, and
  the data is not ours to version — it is a pinned upstream snapshot (§3).

### 2.2 The decided shape (user direction, 2026-11-08; final tap pending)

1. **The base is hosted as a service, not stored as files.** The user can host
   ConceptNet on his own domain. The app never opens a dump file at runtime; it
   *queries an endpoint* (§2.3).
2. **Importer code lives in the repo; raw data does not.** Import scripts fetch the
   official dumps into `data/raw/` (gitignored) for building/refreshing a host or a
   local subset — the same role `node_modules/` plays for code dependencies.
3. **A small checked-in subset + fixtures** covers offline development and tests:
   a few hundred concepts around the seed's domains (seasons, weather, body, music,
   mathematics), stored as our own graph JSON. Tests never touch the network.
4. **What AnSci adds lives in the repo as the overlay** (§3) — small, textual,
   diffable. This is the actual intellectual property of the project.
5. **FrameNet is trimmed to structure, and bundled**: frames, frame elements,
   lexical units and frame relations only — no annotated sentences (§5). Being
   CC BY (§3.3), the trimmed bundle may ship in this repo with attribution
   (`NOTICE`), as may WordNet's (§1.1) — only ConceptNet needs a host.

### 2.3 One adapter, three interchangeable sources

The ConceptNet adapter (§4) is written against a **configurable base URL**:

```
CONCEPTNET_BASE_URL=https://api.conceptnet.io      # default: public API
CONCEPTNET_BASE_URL=https://conceptnet.example.com # the user's self-host
CONCEPTNET_BASE_URL=fixture://conceptnet-subset    # local subset, offline/tests
```

The adapter only relies on the standard ConceptNet lookup shape
(`GET /c/en/<term>` → JSON with an `edges[]` list), so the public API, a self-hosted
instance of the ConceptNet service, and a local fixture server/subset file are
interchangeable. This matters because the public API is a single point of failure:
it returned **502 Bad Gateway from its own host on 2026-11-08** (repeated checks),
which is also why the bulk assertions file — not the API — is the primary *import*
source (§4.1), while the endpoint is the primary *runtime query* source.

A self-host is a real service, not a static file: 34M edges want Postgres-scale
storage and an indexing pass. That cost is paid once, on the user's infrastructure,
and every AnSci deployment then shares it.

---

## 3. Modification: pristine base + AnSci overlay (never edit upstream in place)

**Rule: our changes are never written into the upstream net data.** The user raised
this directly — "we are modifying it" — and the structure below is the answer.

### 3.1 The three parts

**(a) BASE — pristine, version-pinned, read-only.**
A ConceptNet **5.7.0** snapshot (and later a FrameNet 1.7 snapshot), exactly as
published. Importers and the self-host serve it unaltered. Its version is recorded
everywhere it matters (`baseVersion: "conceptnet-5.7.0"`), so any fact can be
traced to the exact upstream release it came from.

**(b) OVERLAY — everything AnSci adds or changes, as delta records.**
Ontological mappings (`HAS_POLARITY`, `HAS_ELEMENT`, …), propagated edges (§6),
confidence reweights, deprecations of base edges we judge wrong, and brand-new
concepts the nets don't have — all of it lives in the overlay, and *only* there.
Each overlay record is a delta in the style of the spec's `GraphAdjustment` audit
nodes:

```json
{
  "id": "ov-2026-11-08-0001",
  "kind": "add-mapping | add-edge | reweight | deprecate | add-concept",
  "baseVersion": "conceptnet-5.7.0",
  "target": { "from": "snow", "type": "HAS_ELEMENT", "to": "Water" },
  "confidence": 0.63,
  "provenance": {
    "origin": "propagation | chat-trainer | human | text-ingestion",
    "derivationPath": "snow —IS_A→ precipitation —ASSOCIATED_WITH→ winter —ELEMENT_OF→ Water",
    "sourceDataset": "/data/globaldb/omcs"
  },
  "reason": "Snow inherits winter's element via IsA + association; see design §6.",
  "evaluationQuestion": "How does snow fit into ancient Chinese science?",
  "status": "applied | proposed | reverted | flagged"
}
```

A `deprecate` record does not delete the base edge; it *shadows* it in the merged
view, exactly as the spec's conflict rules already prescribe for the graph
(`status: "deprecated"` — excluded by the reasoner, kept for audit).

**(c) MERGED VIEW — what the reasoner and the hosted service actually serve.**
`merged = seed (atomic + dictionary) + base net edges + overlay applied in order`.
The reasoner in `src/reason.ts` already consumes a single `Graph`; slice 2 makes
that graph the merged view instead of the seed alone. Nothing downstream needs to
know which part a fact came from — but provenance can always answer that question.

### 3.2 Why this structure

- **Rebase for free.** When ConceptNet 5.8 (or a corrected 5.7.x) appears, we swap
  the pinned base and replay the overlay. Our work is the overlay; it survives.
  Overlay records whose targets vanish upstream surface as rebase conflicts to
  review, not silent losses.
- **Provenance stays clean.** "ConceptNet says X" and "AnSci maps X to Water" are
  different claims with different confidence and different authorities. Mixing them
  into one edited dump would make both unattributable.
- **The overlay is small.** Mappings, propagations and corrections are thousands of
  records, not millions. The overlay is what lives in the repo, is reviewed in
  diffs, and is what the in-app chat (§10) is allowed to write.

### 3.3 Licensing

- **ConceptNet is CC BY-SA 4.0.** Hosting a modified version is allowed, but the
  licence requires: **attribution** to ConceptNet / the Commonsense Computing
  Initiative, an **indication of changes** (the overlay *is* that indication, kept
  separate and inspectable), and **share-alike**: the redistributed *database*
  (base as served, and the overlay data) must be offered under CC BY-SA 4.0.
  This applies to the derived **data**, not to the application **code**, which can
  carry its own licence. Any public self-host must display the attribution.
- **FrameNet is CC BY (Attribution-only) since Release 1.5.** FrameNet's own
  1.5 release notes state: 'we are offering Release 1.5 under a Creative
  Commons Attribution-Only license' (CC BY 3.0; copyright remains with ICSI).
  That covers the 1.7 data imported in §5, and it means we may **modify**
  FrameNet data, **bundle** it (the trimmed structure bundle of §5 ships in
  this repo), and use it **commercially** — the only condition is
  **attribution**, discharged by a `NOTICE` file shipped as a build artifact
  alongside the data. **Open English WordNet is likewise CC BY 4.0** and gets
  the same treatment: bundle trimmed, credit in `NOTICE`.
- **The overlay is also a licence firewall.** Because upstream data is never
  merged in place (§3.1) and everything derived from ConceptNet lives in its
  own overlay partition, share-alike reaches **only that partition**. The
  permissive core — WordNet + FrameNet + the AnSci ontology itself — is never
  combined into a BY-SA dataset and is never contaminated by it; a deployment
  that dropped the ConceptNet partition would owe BY-SA nothing.

### 3.4 Knowledge as ontological associations

\*\*Principle (user direction, 2026-11-08): what the system stores as
knowledge, it stores in the form of ontological associations\*\* — edges
between concepts (and synsets) in the graph, confidence-bearing where the
acquired layer requires it, provenance-carrying always. There is no second
storage form: no fact tables, no side database of world data, no property
bags the reasoner consults behind the graph's back. If the chat knows
something, it knows it as an association it can traverse, cite in a
derivation, and show in debug mode.

Consequences:

- \*\*An external knowledge base is a source plus a translator, exactly like
  a net.\*\* The nets already work this way (pristine source, §3.1a; adapter;
  base partition — §§4–5). A knowledge base gets the same treatment: its
  adapter converts source records into **association form** — edges whose
  endpoints are existing concept/synset nodes — and lands them in the KB's
  own pristine base partition. The source's native schema (Wikidata's
  statement model, §3.6) stays outside the graph; only the associations
  cross over.
- **Association-shaped is the admission test.** *Capital-of*, *located-in*,
  *part-of*, *grows-in* are relations between concepts, so they become
  edges. A bare datum that is only a cell in someone else's table — an
  item identifier, a population figure with no relational role, a raw
  coordinate pair — does not pass the test. The criterion, stated flatly:
  \*\*if a “fact” needs a table cell rather than a relation between
  concepts, it doesn't belong in the graph; it may be referenced, not
  stored.\*\* References have their place — a `SourceRecord` (§4.3) can point
  at the source row, and a place's coordinates are stored as node
  *properties* precisely because they are computation inputs (§8.10), not
  claims the reasoner derives from. Neither is knowledge in the graph's
  sense.
- **One reasoning substrate, one audit story.** Because stored knowledge
  has exactly one form, every claim the chat can make can appear in a
  Thought step (§8.1), carry a derivation path (§3.5), and be checked by
  the translation layer's faithfulness scan (§9.5). That scan can be total
  precisely because there is nowhere else for knowledge to hide.

### 3.5 Derived vs retrieved: the provenance discipline

Every association in the merged view carries provenance, and its provenance
has a **kind**:

- **Retrieved** — imported from a source essentially as published: a net
  assertion (§§4–5), a KB statement (§3.6), a text passage. It carries a
  `SourceRecord` (§4.3) or a source-layer citation, and its confidence is
  the import conversion (§4.3) or a curated import value. Associations
  asserted by a person or by the trainer loop (overlay records with
  `origin: "human" | "chat-trainer"`, §3.1b) are retrieved-kind: a hand
  mapping is *evidence*, not an inference, and is recorded as such.
- **Derived** — produced by the system's own operations: the shared-prior
  join (§1), propagation (§6.2), the engine's operators and composition
  (§§6.5–6.9), correspondence lookups over curated tables. It carries a
  **derivation path** — the overlay record's `derivationPath` field (§3.1b)
  is exactly this — with each step's own kind marked.

The §3.1b provenance fields (`origin`, `derivationPath`, `sourceDataset`)
already carry this information; this section names the discipline they
implement. Three rules:

1. **No masquerade.** A retrieved association never presents as derived,
   and a derived conclusion never presents as a sourced fact. Provenance
   kind is part of the record, survives merging, and is what debug mode
   shows. The faithfulness scan (§9.5) checks claims against their
   provenance kind: a claim phrased as a derivation (“because …”, the
   join's associational language) must trace to a derived conclusion or to
   a derivation step in the turn's Thought; a retrieved fact renders as a
   plain statement of fact, and the renderer may not dress it in derivation
   language it does not have — plausibility is not provenance, and neither
   is the provenance *kind* negotiable at render time.
2. **Derivation may consume retrieved steps, and says so.** Most
   interesting conclusions are mixed. *Sleet —IS\_A→ precipitation* is
   retrieved (WordNet); *precipitation —HAS\_ELEMENT→ Water* is a curated
   association (retrieved-kind, origin `human`); the join's conclusion
   *sleet is Water-classified* is derived, and its provenance is the full
   step list with kinds marked — not a single label. A conclusion is only
   as derived as its path, and the path is the record.
3. **Conflicts between the kinds are flagged, never auto-resolved.** When
   a derived association and a retrieved one disagree — opposing polarity
   or element on the same (subject, aspect), per §6.6, or a retrieved edge
   contradicting a derived leaning above threshold — §6.4's flagging takes
   over unchanged. Neither kind outranks the other automatically: settling
   it by kind would make imports unfalsifiable in one direction and the
   ontology a rubber stamp in the other. Resolution is a trainer-loop act
   (§10.4) writing a `GraphAdjustment` — deprecating the retrieved edge in
   the overlay (§3.1b), or correcting the mapping that fed the derivation.

**Text sources join the same discipline.** A retrieved association whose
source is a *passage* rather than a dataset row enters through document
ingestion (§11): proposed first, citation-carrying, applied only through
the §10.4 door — never written into the graph in place.

### 3.6 First knowledge-base source: Wikidata

**Why Wikidata first.** Three reasons, in the style of §1.1's reasoning:
its licence is **CC0** (§1.1) — no attribution or share-alike machinery at
all, the lightest possible terms (§3.3); its statements are already
relation-shaped (subject–property–object), so translation into association
form (§3.4) distorts them least of any large knowledge base; and it covers
exactly what the nets lack — places, people, organisms, works: entities
with world-level relations, where WordNet has only words and ConceptNet
only common sense.

**Relationship to §1.1.** §1.1 called Wikidata “not a base net” and “not
part of slices 2a–2e”, and both stand. It is not a *base net*: the chat's
lexical and common-sense base is the nets (§1), and nothing there changes.
What this section adds is a fourth role — **knowledge-base source** — with
its own slice, **2f**, after 2e (§12). Encyclopedic knowledge enters as
associations under §§3.4–3.5; it does not become a rival base the chat runs
on.

**Adapter contract** (same altitude as §§4–5):

- **Source and endpoint.** Wikidata items and statements, fetched through
  a configurable endpoint in the §2.3 style (working name
  `WIKIDATA_BASE_URL`: a SPARQL/query endpoint or a dump-subset service),
  with a recorded-shape fixture source for offline work and tests —
  importing never happens at runtime and tests never touch the network
  (§2.2).
- **Join key: item → concept/synset.** An item joins the graph at the
  concept or synset it denotes. Bridges are proposed from the item's
  English label and sitelink title matched against WordNet lemmas and seed
  concept names — exact-label candidates, with ambiguity resolved the way
  §7.3 lookup resolves it: the adapter *proposes* bridges, conflicts are
  flagged (§3.5 rule 3), nothing is joined silently. Items that join
  nothing may still enter as new concept nodes in the KB's own base
  partition — they are source data, like synsets; AnSci-originated
  concepts remain overlay-only (§3.1b).
- **Property → association mapping** (first set; the importer logs and
  counts what it skips, per §4.4):

  | Wikidata property | AnSci association | Notes |
  |---|---|---|
  | capital (P36) | `CAPITAL_OF` — **new** | inverted at import: the capital —CAPITAL\_OF→ its country/territory |
  | country (P17), located in the administrative territorial entity (P131) | `LOCATED_IN` — **new** | world-level containment of places; distinct from ConceptNet's `AT_LOCATION` (§4.2), which says where a thing is typically found |
  | part of (P361) | `PART_OF` (existing, §4.2) | world-level parthood (a region part of a country); §6.2's curated-only propagation for `PART_OF` applies unchanged |
  | habitat / distribution statements for organisms; climate classification statements for places | `GROWS_IN` — **new** / climate correspondence (§8.11) | the organism↔place and place↔climate links the situation machinery consumes |
  | coordinate location (P625) | *(no edge)* — node properties `lat`/`lon` | a computation input (§3.4's criterion), never an association |

- **Confidence and provenance.** KB associations are **retrieved**-kind
  (§3.5), each batch linked to a `SourceRecord` (`dataset: "wikidata"`,
  `baseVersion` = the pinned extract date, `uri` = the item id) via
  `SOURCED_FROM` (§4.3). Structural facts (capitals, containment) import
  at a fixed high confidence (0.9, below the curated ceiling of §4.3), and
  KB-imported nodes never become propagation anchors on their own —
  anchors are curated (§6.1).
- **The place-association requirement.** Importing a **place** must also
  import or derive its **situation associations** — hemisphere, latitude
  band, climate class — because those, not its capital, are what the
  ontology can reason over (§8.11): they are what season-here, night
  proportion and direction reasoning consume. Hemisphere and latitude band
  are computed from the coordinates at import, by the same §8.10 rules
  that compute the live `Situation` — one implementation, two callers.
  A place import *without* coordinates is incomplete and is flagged as
  such: the place can still answer capital-of and containment questions,
  but it cannot take part in situation reasoning until it has them.

**Build placement:** slice **2f** (§12), after ConceptNet (2e) — the join
machinery, overlay discipline and situation object it feeds are all built
by then.

---

## 4. ConceptNet adapter

ConceptNet is the **third net to land** (slice 2e, §12): WordNet (§1.1) and
FrameNet (§5) go first — they are small, CC BY, and give the chat a testable
world sooner. ConceptNet remains the **breadth layer**, the everyday common
sense neither of the others has; this adapter is unchanged in substance, only
later in the order.

### 4.1 Input format (bulk assertions file — the primary import source)

ConceptNet distributes all edges as a gzipped, tab-separated file
(`conceptnet-assertions-5.7.0.tsv.gz`). Each line has **5 tab-separated fields**:

```
/a/[/r/IsA/,/c/en/snow/,/c/en/precipitation/]	/r/IsA	/c/en/snow	/c/en/precipitation	{"dataset": "/d/wiktionary/en", "weight": 2.0, "sources": [...]}
```

1. the edge URI, 2. the relation (`/r/<Relation>`), 3. the start node,
2. the end node (both `/c/<lang>/<term>` URIs, terms underscore-joined,
optionally sense-suffixed, e.g. `/c/en/bass/n/…`), 5. a JSON metadata object
carrying `weight`, `dataset`, and `sources`.

Parsing rules: keep only `/c/en/…` endpoints (**English-only filter** — other
languages are a later, separate import); strip the sense suffix but retain it in
the source record; normalise `ice_crystal` → display name `ice crystal`, node id
via the existing `slugify()` in `src/graph.ts`. The same parser consumes the
runtime endpoint's JSON (`edges[]` entries expose `rel`, `start`, `end`,
`weight`, `dataset` in the same shape), so bulk import and endpoint query share
one normalisation path.

### 4.2 Relation mapping

ConceptNet relations map onto AnSci edge types as follows. Existing types are
reused wherever the meaning matches; new types are proposed only where no
existing type carries the meaning, and are named in the spec's style
(`UPPER_SNAKE`, directed, confidence-bearing in the acquired layer).

| ConceptNet relation | AnSci edge type | Status |
| --- | --- | --- |
| `RelatedTo` | `ASSOCIATED_WITH` | existing |
| `Synonym` | `SYNONYM_OF` | existing |
| `DefinedAs` | `DEFINED_AS` (→ DictionaryEntry) | existing |
| `IsA` | `IS_A` | **new** — taxonomy is not `MAPPED_TO` (which means "mapped onto the ontology") |
| `HasProperty` | `HAS_PROPERTY` | **new** — target may be a Quality or a Concept; the reasoner's shared-prior join treats a Quality target like `HAS_QUALITY` |
| `CapableOf` | `CAPABLE_OF` | **new** |
| `UsedFor` | `USED_FOR` | **new** |
| `AtLocation` | `AT_LOCATION` | **new** |
| `Causes` | `CAUSES` | **new** |
| `Antonym` | `ANTONYM_OF` | **new** — needed by the polarity-flip propagation rule (§6) |
| `PartOf` | `PART_OF` | **new** |
| `HasContext` | *(no edge)* — recorded as the concept's domain hint (`domain` / `properties`) | metadata, not a concept↔concept relation |

Other relations (`Desires`, `HasSubevent`, `Entails`, `MadeOf`, …) are \*\*not
imported in slice 2e\*\*; the importer logs and counts what it skips rather than
silently dropping or force-fitting them.

### 4.3 Confidence and provenance

ConceptNet weights are heuristic scores assigned by its import readers —
typically ≥ 1.0, unbounded, **not** probabilities. They must not be copied into
our 0.0–1.0 confidence scale raw. Proposed conversion, a saturating map:

```
confidence = min(0.95, weight / (weight + 1))     // weight 1 → 0.50, 2 → 0.67, 4 → 0.80, 9 → 0.90
```

The cap (0.95) reserves near-certainty for human-curated mappings, per the
spec's confidence bands. Weights below 1.0 land below the reasoner's default
answer threshold and are imported but effectively held back — consistent with
how slice 1 already treats the mercury→Water analogy at 0.55.

Provenance: net data has no text passage, so `TextPassage` is the wrong node.
Propose a sibling source node — working name **`SourceRecord`** (new node type,
source layer) — with fields `{ dataset, baseVersion, uri, retrievedFrom }`
(e.g. dataset `/d/wiktionary/en`, uri the `/a/…` edge URI). Every imported node
and edge links to its record(s) via the existing `SOURCED_FROM` edge type, so
"where did you learn that?" works for net facts exactly as for text facts.

### 4.4 Import discipline

- **Dictionary authority still rules** (spec ingestion rule 1): if an imported
  term matches a `DictionaryEntry`, the concept links to it via `DEFINED_AS` and
  the dictionary definition is never overwritten by net data.
- **Deduplication by (from, type, to)**: a re-import merges, keeping the higher
  confidence, exactly per the spec's merge logic.
- **The atomic layer is untouchable**: imports may *link to* atomic nodes but
  never create, rename or rewire them. A net assertion that contradicts an
  atomic edge is flagged, not applied.
- Imports write **base** records (into the local/host graph store), never overlay
  records. Only mappings, propagations and corrections are overlay (§3).

---

## 5. FrameNet adapter

### 5.1 Input

FrameNet 1.7 is distributed as XML: a **frame index**, one XML file per **frame**
(definition, frame elements with core/non-core status, lexical units), a
**lexical-unit index**, and **frame-relation** data. The importer reads those
files from `data/raw/framenet/` when refreshing the bundle; the trimmed
structure bundle itself **ships in this repo** under CC BY, with attribution in
`NOTICE` (see §3.3).

**Excluded: the annotated-sentence corpus** (full-text annotation XML). It is the
bulk of the 855 MB release, it illustrates usage rather than defining structure,
and AnSci's reasoner has no use for example sentences in slice 2. If example
sentences are ever wanted (e.g. for response phrasing), they can be fetched from
a self-host later without changing this design.

### 5.2 Node types: dedicated `Frame`, `FrameElement`, `LexicalUnit`

**Decision: add three new node types** — `Frame`, `FrameElement`, `LexicalUnit`
— rather than reusing `Concept` with typed edges.

Why: a frame is not a concept. It is a *situation schema* — `Commerce_buy` is
not a thing in the world, it is a template with roles (Buyer, Goods, Seller,
Money) that events instantiate. Collapsing frames into `Concept` would (a) lose
the core/non-core distinction that says which roles a situation *requires*,
(b) confuse the reasoner, whose subject-ranking and definition paths treat
`Concept` as "a thing that can have a polarity/element" — a frame acquires an
ontological mapping only *through* its typical fillers and evoking words, which
is a different, weaker claim that must stay distinguishable, and (c) make
frame-to-frame relations (inheritance etc.) indistinguishable from
concept-to-concept relations in path output.

New edges (spec style):

| FrameNet structure | AnSci representation |
| --- | --- |

| Frame has frame element (core / non-core) | frame —`HAS_FRAME_ELEMENT`→ FrameElement, FE kind stored on the edge's properties / FE node (\`core: true | false\`) |

| Lexical unit evokes frame | LexicalUnit —`EVOKES`→ Frame |
| Lexical unit names an existing graph concept | LexicalUnit —`MAPPED_TO`→ Concept (existing type) |
| Frame relations: Inheritance / Using / Subframe | Frame —`INHERITS_FROM` / `USES_FRAME` / `SUBFRAME_OF`→ Frame (**new**) |
| Frame element corresponds across frames (FE-to-FE mapping in frame relations) | recorded in properties on the relation edge; no separate edge type in 2d |

The bridge to the rest of the graph is the lexical unit: `buy.v` evokes
`Commerce_buy` and maps to the Concept `buy`. Once that bridge exists, a question
about an *event* ("who receives the goods when someone buys…?") can be answered
from frame structure, and ontological propagation (§6) can flow from a mapped
concept into the frame it evokes — as a flagged, weaker inference, never as if
the frame itself were a concept.

All FrameNet imports are base data with `SourceRecord` provenance
(`dataset: "framenet-1.7"`, `baseVersion: "1.7"`), under the same discipline as
§4.4.

---

## 6. Ontological direction: propagation from anchors, and the ontology as engine

Importing the nets gives breadth. This step is what makes the result *AnSci*:
spreading ontological mappings from the concepts slice 1 already mapped
(**anchors**) across net relations, so a concept nobody hand-mapped still earns a
defensible polarity/element position — with the derivation kept as provenance.
§§6.1–6.4 design that propagation. §§6.5–6.12 then design the machinery that
makes the ontology itself *compute* — the **ontology as engine**: the cycles as
operators, aspect-scoped and graded classifications, balance dynamics, and
correspondence composition. Propagation without the engine leaves the priors
acting as mere join keys; the engine is what the priors are *for*.

### 6.1 Anchors

Anchors are the slice-1 seed's curated mappings: winter→Water/Yin, summer→Fire/Yang,
night→Yin, derivative→Yang/Fire (0.92/0.88), integral→Yin/Water, the pressure
systems, bass/treble (multi-aspect), and every atomic correspondence. Anchor edges
have mapping status **`curated`**. Everything propagation writes has status
**`propagated`**. (Implementation note: `GraphEdge` today has no properties bag;
slice 2c adds a minimal one, or stores status + derivation on the overlay record —
§3.1 — which references the edge id. Either way, status is data, not convention.)

### 6.2 Propagation rules (per relation type, with decay)

Propagation is one pass per relation hop; confidence multiplies at each hop, so
influence dies with distance. Maximum propagation depth: **2 hops** in slice 2c.

| Step | Rule | Decay |
| --- | --- | --- |
| `IS_A` | Child inherits the parent's `HAS_POLARITY` / `HAS_ELEMENT`: precipitation is mapped → snow `IS_A` precipitation inherits it. Taxonomy is the strongest net relation, so inheritance is strong. | × 0.9 |
| `HAS_PROPERTY` / `CAPABLE_OF` | The *property/capability concept* carries the mapping; the bearer gains it in the aspect of that property (e.g. something `CapableOf` glowing gains Fire-leaning *in the aspect of light emission*). The mapping flows property → bearer, aspect-scoped. | × 0.85, aspect required |
| `ASSOCIATED_WITH` (`RelatedTo`) | Weak association only: the target gains a **leaning** — a mapping whose confidence is multiplied hard and which lands *below the reasoner's default answer threshold* (0.7). Leanings can support a derivation path but are never asserted as a concept's mapping on their own. | × 0.6 |
| `ANTONYM_OF` | Polarity **flips** (Yin↔Yang) at reduced confidence: the antonym of a Yin concept is Yang-leaning. Elements do **not** flip (there is no "opposite element" in Wuxing; see §6.3). | × 0.7, polarity only |
| `PART_OF` / `AT_LOCATION` | The part/location shares the whole's element only if the whole's mapping is `curated`; polarity does not propagate through parthood. | × 0.7, element only |
| FrameNet `EVOKES` | A frame whose evoking lexical unit maps to an anchored concept gains a *frame-level leaning*, used only for event interpretation, recorded against the frame, never rewritten as a concept mapping. | × 0.6 |

**Worked example (the slice-2c acceptance case).** The nets give
`snow —IS_A→ precipitation` (a WordNet hypernym edge; ConceptNet asserts the
same `IsA`, weight 2.0 → confidence 0.67) and
`precipitation —ASSOCIATED_WITH→ winter`. Winter is an anchor (Water, Yin).
Propagation: winter's element reaches precipitation as a leaning
(1.0 × 0.6 = 0.60 via association), and snow inherits through `IS_A` from any
curated element precipitation holds — and where precipitation only *leans*, snow
inherits the leaning at × 0.9, still labelled `propagated` with the full
derivation path `snow —IS_A→ precipitation —ASSOCIATED_WITH→ winter —ELEMENT_OF→ Water`
stored as its provenance (an overlay record, §3). The reasoner can then explain
snow's cold the same way it explains winter's — through Water/Yin — while being
able to say, if asked, that this mapping was *derived*, not curated. If a later
text ingestion curates snow directly, the curated edge supersedes the propagated
one (same target, higher authority — not a conflict, §6.4).

### 6.3 What does NOT propagate (deliberately)

- **Elements do not travel the restraint cycle as "opposition."** Yang's antonym
  is Yin, but Fire's antonym is not Water by logic — it is Water by the
  *correspondence tables* (seasonal/thermal opposition), which are curated
  atomic content. Propagation must not invent element opposites.
- **Generation/restraint are not inheritance.** `Water generates Wood` does not
  make a Water concept partly Wood. The cycles are traversed by the *reasoner*
  for cycle questions (as slice 1 already does), not copied onto nodes by
  propagation. (§6.5 turns that traversal into named operators; §6.10's
  successor leaning is the one narrow exception, and it writes a
  temporal-aspect *leaning*, never an element classification.)
- **No propagation through&#32;`SYNONYM_OF`&#32;beyond the synonym itself** (a synonym
  shares its twin's mappings by definition — that is a merge, not a propagation,
  and it is recorded as such).
- **Nothing propagates&#32;*into*&#32;the atomic or dictionary layers, ever.**

### 6.4 Conflicts, status, and thresholds

- **Conflicts are flagged, never silently overwritten.** If two anchors imply
  different polarities/elements for the same concept *in the same aspect*, both
  propagated edges are written with status `flagged` (excluded from answers) and
  a review item is created. This is the spec's conflict rule applied to
  propagation, unchanged.
- **Multi-aspect is preserved.** Propagation writes aspect-scoped edges using the
  existing `aspect` field (the bass precedent: Yang {voice origin}, Yin {pitch}).
  A conflict in one aspect does not flag the concept's other aspects.
- **Thresholds do the gating.** The reasoner's defaults already encode the
  policy: definitions at 0.8, ontology/causal answers at 0.7. Propagated edges
  (typically 0.5–0.65 after decay) sit below assertion level — they enrich
  derivation paths and "leaning" language, and a `--threshold` lowering (as the
  CLI already supports) can surface them deliberately. `curated` > `propagated`
  whenever both target the same (concept, aspect): the curated edge wins and the
  propagated one is marked superseded, not deleted.

### 6.5 The ontology as engine, I: cycles as operators

Slice 1 stores the two cycles as edges (`MUTUAL_GENERATION`,
`MUTUAL_RESTRAINT` in `src/seed.ts`). The engine promotes them from stored
facts to **operators** the reasoner applies:

| Operator | Definition (over the seed's edges) | Reads as |
| --- | --- | --- |
| `generates(E)` | the element `E —MUTUAL_GENERATION→` points to | Wood → Fire |
| `generatedBy(E)` | the inverse: who generates `E` | Fire → Wood |
| `restrains(E)` | the element `E —MUTUAL_RESTRAINT→` points to | Wood → Earth |
| `restrainedBy(E)` | the inverse: who restrains `E` | Fire → Water |

The generation order is Wood→Fire→Earth→Metal→Water→Wood; the restraint order
is Wood→Earth→Water→Fire→Metal→Wood (both as seeded, both as the user's Taiji
note records them from the *Chunqiu Fanlu* tradition: "wood generates fire,
fire generates earth … wood conquers earth, etc."). The user's electromagnetism
note makes the same structural point in modern dress — Lenz's law is generation
*with built-in inhibition* — which is why restraint is an operator in its own
right, not a footnote to generation.

**Concept-level temporal reasoning.** A concept classified under element `E`
inherits `E`'s cycle position *in the temporal aspect only*: "what follows
spring?" resolves spring → Wood → `generates(Wood)` = Fire → the season of
Fire, summer. For an arbitrary Wood concept, the engine can state what phase
it moves toward. Such statements are *derived*, not stored: confidence =
classification confidence × 0.8, and they never become classifications
themselves. (This generalises the one cycle intent slice 1 already answers.)

**Restraint, use 1 — moderation reasoning.** "What keeps Fire in check?" is
`restrainedBy(Fire)` = Water, answered directly from the operator with the
`Water —MUTUAL_RESTRAINT→ Fire` edge as its derivation. No propagation, no
table lookup: the cycle computes it.

**Restraint, use 2 — arbitration between propagated leanings.** When
propagation (§6.10) is about to merge two leanings for the same
(concept, aspect) that point to *different elements* `E₁`, `E₂`, and one
restrains the other — say `restrains(E₂) = E₁` — the leaning toward the
*restrained* element `E₂` is **damped**: confidence × 0.7 and degree band
(§6.7) dropped one step. The other leaning stands. Rules and limits:

- Damping **never deletes**. Both leanings are written; the damped one's
  derivation path records the arbitration ("damped by restraint arbitration:
  leanings toward Fire and Water; Water restrains Fire").
- Arbitration applies **only between two&#32;`propagated`&#32;leanings**. It never
  damps a `curated` classification, and it is applied **once** — no cascading
  re-arbitration of the result.
- Arbitration resolves *element competition only*. If, after damping, the
  same (concept, aspect) still carries opposing *polarities* at assertion
  level, §6.4's flagging takes over unchanged.

**Mutual rootedness and turning points.** The atomic layer already stores
`Yin —CONTAINS_SEED→ Yang` and its inverse, and the seed's derivative/integral
pair carries `MUTUALLY_ROOTED_WITH` — the concept-level form of the Taiji
note's principle that the opposites are interdependent: "each contain the
presence of its opposite (the small dot of yang within yin, and vice versa).
There is yin within yang and yang within yin." The engine makes the
*extremes* of that principle citable as first-class atomic facts —
**turning points**: moments where a polarity is maximal in an aspect and
already carries the turn toward its opposite ("yang extreme births yin, and
vice versa", in the note's summary of reciprocal transformation 轉化). The
canonical set, from the note's solar-terms passage — "points of
maximum/minimum (solstices) and balance (equinoxes). The winter solstice is
like night's midnight. The summer solstice is like daytime's noon":

| Turning point | Aspect | Extremum | Turn toward |
| --- | --- | --- | --- |
| Winter solstice | light | Yin maximal | Yang (light returns) |
| Summer solstice | light | Yang maximal | Yin |
| Midnight | light | Yin maximal (daily) | Yang |
| Noon | light | Yang maximal (daily) | Yin |

(Equinoxes are the complementary *balance points* — neither maximal, the two
in equilibrium — and are recorded the same way.) A turning point is stored as
an atomic fact attached to its season/time node (§6.11), and the engine cites
it as evidence: the §6.7 comparison "is winter more Yin than autumn?" points
at the winter solstice, not just at a number.

### 6.6 The ontology as engine, II: aspect-scoped reasoning

The user's treble/bass note is blunt about the principle: "Yin and yang are
not classifiers in a superficial way, however. They are properties found in
all things in **multiple aspects**." So the engine's unit of classification
is never a bare concept → polarity statement. It is a tuple:

```
(concept, aspect) → (element?, polarity?, degree?, confidence, status)
```

An edge with no `aspect` (several exist in the seed — derivative → Yang,
precipitation → Water) is read as carrying the default aspect
**overall character**; the seed's own aspect strings ("overall character
(dispersing, clear skies)") already use it. The rules:

- **Joins are aspect-matched.** A shared-prior join (§1, the reasoner's core
  move) consumes classifications within the *same* aspect by default. A
  concept that is Yin in the aspect of temperature joins to cold; its Yang
  classification in some other aspect is simply not in that join.
- \*\*Cross-aspect composition is allowed only through explicit correspondence
  paths\*\* — the correspondence tables (§6.9), which are curated atomic
  content and therefore sanctioned bridges. There is no general cross-aspect
  join. The reason is structural: nearly every interesting concept is Yin in
  *some* aspect and Yang in *another*; an uncontrolled cross-aspect join
  would let everything reach both cold and warm, and the engine would prove
  everything and mean nothing.
- **Conflict is defined per (concept, aspect).** A conflict exists only when
  the *same* (concept, aspect) carries opposing polarities — or different
  elements — above the §6.4 flagging threshold. Opposing polarities in
  *different* aspects are legal, expected, and never flagged. The canonical
  case is the user's note on singing: "To be dark and low, and more still,
  which is a lower frequency in the sound wave, are yin characteristics. To
  be bright and high, and more active, a higher frequency in the sound wave,
  are yang characteristics" — while the *voice origin* runs the other way
  (bass is sung by men, treble by women). The seed encodes exactly this:
  bass is Yang {voice origin} and Yin {pitch}; treble is the inverse; the
  high-pressure system is Yang {overall character} and Yin {sinking air}.
  None of these is a conflict, and the engine must be able to say so.
- **Thought records the aspect.** Every classification a Thought step (§8)
  consumes is recorded with its aspect, and the §8.2 conflict check is keyed
  by (subject, aspect) — a trace deriving Yin {pitch} and Yang {voice
  origin} for bass passes the check precisely because the aspects differ.

### 6.7 The ontology as engine, III: graded polarity and proportion

"Night is Yin" is true and too coarse: the founding observation of this
project is that night is a *greater proportion* of winter than of summer.
Classifications therefore carry a **degree**:

- **Bands (canonical form):** `predominant` | `present` | `faint` — the
  share of an aspect held by that polarity.
- **Proportion (optional refinement):** a number 0..1, recorded only where a
  source supports it. Within one aspect, the two polarities' proportions sum
  to 1 where both are recorded. Bands are read off proportions when present:
  `predominant` ≥ 0.65, `present` 0.35–0.65, `faint` < 0.35.

The seed already hints at degree informally — Wood's `POLARITY_OF` edge
carries the note "yang-rising", Metal's "yin-rising": degree *in motion*
through a phase. §6.11 formalises the bands; the rising/falling trend is a
later refinement.

**Comparison reasoning.** "Is winter more Yin than autumn?" compares degrees
**within one aspect** (here, light): winter `predominant` vs autumn
`present` → yes, with the winter solstice (§6.5) citable as the peak the
curve runs through. Ordering is by band, then by proportion where both sides
have one. A comparison with no stated aspect uses the aspect the question
implies (light, for seasons and times of day) or the default aspect;
comparing *across* aspects is a category error the router (§7) declines or
clarifies, never an occasion to average the two.

**Seasonal degree profiles.** Each season node carries a **degree profile**:
the Yin proportion of three aspects at the season's midpoint, anchored by
the turning points. The values below are *canonical framework values* —
they encode the framework's qualitative ordering (winter is the Yin
extreme of light and temperature; the equinox seasons cross balance) in
indicative numbers, and are stored as atomic-layer data (§6.11):

| Season | light (Yin share) | temperature (Yin share) | activity (Yin share) |
| --- | --- | --- | --- |
| Spring | 0.42 — present, falling | 0.45 — present | 0.35 — present |
| Summer | 0.18 — faint | 0.15 — faint | 0.20 — faint |
| Autumn | 0.58 — present, rising | 0.55 — present | 0.50 — present |
| Winter | 0.82 — predominant | 0.85 — predominant | 0.75 — predominant |

**Honesty note.** These are *interpretive* values — the framework's reading
of the year — not measurements. The actual night-length fraction for a date
and latitude is computable astronomy; supplying measured values alongside
(or instead of) the canonical profile is knowledge-base territory — the
source is designed in §3.6 and the computation in §8.10, **not here** — and
the two must never be conflated in a derivation: a
profile lookup is a framework fact, sourced to the atomic layer.

### 6.8 The ontology as engine, IV: balance dynamics

The *Huangdi Neijing* tradition, as the user's Taiji note summarises it,
applies the framework to health exactly this way: "yin and yang must
balance; excess or deficiency disrupts ebb/flow." The engine's form of that
reasoning:

- A **subject** — a season, a place, a dish, a piece of music, or (in
  framework mode only) a person — has a **profile**: a distribution over the
  five elements (band or proportion per element), optionally with
  per-aspect polarity degrees (§6.7).
- A **baseline** profile exists per context: what the framework expects.
  Slice 2c ships baselines **per season** only (the season's own element
  `predominant`, its generator and its generated element `present`, the
  remaining two `faint` — stored as atomic-layer data, §6.11).
- **Excess(E)** holds when a subject's share of `E` exceeds the baseline by
  a stated margin: its band is above the baseline band, or its proportion
  exceeds the baseline proportion by ≥ 0.15. **Deficiency(E)** is the
  symmetric shortfall.

Inference rules (framework-internal derivations, in order):

1. **Manifestations.** Excess(E) → the subject tends toward E's
   correspondence profile (§6.9): its emotion, organ, taste, colour,
   direction — filtered to the domains that make sense for the subject type.
2. **Moderation.** The moderating influence on an excess of E is
   `restrainedBy(E)` — the element that restrains it (§6.5). Excess Fire is
   moderated by Water.
3. **Downstream feed.** Excess(E) also feeds `generates(E)`: an excess of
   Wood puts pressure on Fire. An excess is never only about its own phase.
4. **Support.** Deficiency(E) is supported by `generatedBy(E)` — the phase
   that generates it — and E's own correspondences manifest weakly.

**Worked example (framework mode).** A subject profile heavy in Fire,
assessed against the high-summer baseline (Fire already `predominant`
there, so the margin is demanding — say the profile is Fire 0.55 against a
0.40 baseline proportion). The engine concludes: excess(Fire) → Fire
manifestations (heat, restlessness; heart; joy tipping to agitation;
bitter; red; south), moderator = `restrainedBy(Fire)` = **Water** (rest,
cooling, stillness — Water's own profile), and downstream pressure on
`generates(Fire)` = Earth. In framework mode that derivation is shown as
what it is. In plain mode it surfaces only as hedged manifestation language
per §9's bands ("in high summer, too much heat and pace tends to…"), with
Water's moderating role phrased as rest and cooling, not as an element name.

**Honesty rule.** Balance conclusions are derivations \*inside the
framework\* — the system's worldview applied consistently — and their
epistemic status **may not be upgraded by rendering**. §9's faithfulness
scan treats a balance conclusion like any other: its surface form is capped
at the hedge band of its confidence, and it may **never** surface as a
medical claim — no diagnosis, no treatment recommendation. "Water moderates
Fire" is a framework relation; in plain mode it can inform tendency
language, and that is the ceiling.

### 6.9 The ontology as engine, V: correspondence composition

The correspondence tables (§1, `src/seed.ts`) stop being passive data once
composition is a named operation:

```
compose(term, targetDomain?) =
  term → classification (element E, aspect a, confidence c)     [§6.6 tuple]
       → E's correspondence row                                  [atomic, curated]
       → the row's entries (in targetDomain, or all domains)
```

- **Confidence rule.** The composition's confidence is **c** — the source
  classification's confidence. The correspondence step itself is canonical
  atomic content and costs **no decay** (atomic edges carry no confidence;
  they are absolute, per `src/graph.ts`).
- **Aspect guard.** Composition stays within E's correspondence table —
  that table *is* the sanctioned cross-aspect bridge of §6.6 — and the
  source classification's aspect `a` is recorded in the derivation. Where a
  term's element classification holds only in a narrow aspect (mercury →
  Water {state at room temperature}, the seed's deliberate 0.55 analogy),
  composition through it is marked **analogy** and inherits the restriction:
  the renderer may not present mercury's "correspondences" as though the
  classification were unrestricted.
- **Worked example.** The pentatonic note **yu (羽)** sits in the table as
  Water's sound (`sound-yu (羽) —CORRESPONDS_TO→ Water`; composition walks
  the table's edges in reverse, from the element outward). Composing yu
  across all domains yields Water's row: \*\*winter, kidneys, fear, salty,
  black, north\*\* — at atomic confidence, because yu's membership in the
  table is itself atomic. One curated row, six derived associations, none of
  them stored against yu individually: this is the cross-domain join the
  whole architecture exists to make cheap.

### 6.10 How the engine changes propagation

The propagation of §§6.1–6.4 runs *under* the engine's rules:

- **Leanings carry (aspect, degree band).** A propagated statement is the
  full §6.6 tuple, with degree: inheritance through `IS_A` from a
  `predominant` curated classification may carry `present`; every other
  propagated leaning is `faint`; \*\*no propagated statement is ever
  `predominant`\*\* — predominance is curated or atomic, or it is not claimed.
  Degree steps down across hops exactly as confidence multiplies (§6.2).
- **Restraint arbitration at merge time.** When propagation merges leanings
  for one (concept, aspect) and two of them compete as elements, §6.5's
  arbitration runs before anything is written: the restrained element's
  leaning is damped (× 0.7, band down one step), the damping is recorded in
  the derivation path, and §6.4's flagging remains the backstop for what
  arbitration cannot settle (same-aspect polarity opposition).
- **One generation step: successor leanings.** Propagation may traverse
  exactly **one** `MUTUAL_GENERATION` step from a classified element to
  write a **successor leaning**: a concept classified under Wood gains a
  `faint` leaning toward Fire's qualities *in the temporal aspect* ("what
  this phase moves toward"), at confidence = classification confidence ×
  0.5. This does not contradict §6.3: the concept gains **no** `HAS_ELEMENT`
  edge to Fire and no Fire classification in any other aspect — a temporal
  leaning is all it is, and it is labelled as such in its derivation.
  Precedence is strict: curated > propagated (direct) > successor leaning.
  A successor leaning that contradicts a direct classification in the same
  aspect yields silently — recorded as superseded, never flagged, never
  asserted over the direct statement.

### 6.11 Seed and schema deltas

What the atomic/dictionary layer and the edge schema need, beyond slice 1.
("2c" = required by slice 2c; "later" = designed here, built when a slice
needs it.)

| Delta | Layer / form | When |
| --- | --- | --- |
| Degree band (`predominant`/`present`/`faint`) + optional `proportion` on polarity statements | Rides the edge-properties bag §6.1 already requires (on `HAS_POLARITY` / overlay records); bands mandatory on propagated leanings | **2c** |
| Aspect keys: the seed's free-text aspects gain closed **keys** — `overall`, `light`, `temperature`, `activity`, `pitch`, `voice-origin`, `air-motion`, `formation`, `state` — with the existing text kept as the key's gloss (e.g. "pitch (low, dark, more still — lower frequency)") | Atomic vocabulary; keys on new edges in 2c, seed edges backfilled to keys in the same pass | **2c** |
| Turning-point facts: solstices (winter/summer), stored as atomic facts on the season nodes, citing `CONTAINS_SEED` | Atomic | **2c** |
| Season degree profiles (§6.7 table: light + temperature aspects) | Atomic data on `Season` node properties | **2c** |
| Season baselines (§6.8: own element predominant, generator + generated present, rest faint) | Atomic data on `Season` node properties | **2c** |
| Cycle operators (`generates`/`generatedBy`/`restrains`/`restrainedBy`) + restraint arbitration | Reasoner functions over existing `MUTUAL_GENERATION`/`MUTUAL_RESTRAINT` edges — **no schema delta** | **2c** |
| Correspondence composition | Reasoner operation over existing `CORRESPONDS_TO` edges — **no schema delta** | **2c** |
| Fixture subject profiles for balance tests (a Fire-heavy profile vs the summer baseline) | Test fixtures only; no product schema | **2c** |
| Turning-point facts: equinox balance points; midnight/noon daily analogues | Atomic | later |
| Season degree profiles: the `activity` aspect column | Atomic data | later |
| Degree backfill on curated seed classifications (beyond the profiles above) | Acquired/atomic annotation pass | later |
| Degree *trend* (`rising`/`falling`) formalising Wood's "yang-rising" and Metal's "yin-rising" notes | Edge property on `POLARITY_OF` | later |
| Baselines for other contexts (place, dish, music, person); deriving subject profiles from user text | Atomic data + router work | later |
| Measured degree values from a knowledge base (astronomy etc.) | KB layer — **not designed in this document** (§6.7 honesty note) | later |

### 6.12 Evaluation: the engine acceptance cases (OE-\*)

Slice 2c's done-when (§12) includes these, alongside the §6.2 snow case:

- **OE-RESTRAINT.** "What keeps Fire in check?" (framework/debug) → **Water**,
  derived by the `restrainedBy` operator over the \`Water —MUTUAL\_RESTRAINT→
  Fire\` edge, with that edge in the shown derivation — not from any stored
  Fire→Water fact.
- **OE-PROPORTION.** "Is winter more Yin than autumn?" in the **light**
  aspect → yes: winter `predominant` (0.82) vs autumn `present` (0.58), with
  the winter-solstice turning point cited. The same question with aspects
  mixed (winter's light degree vs autumn's temperature degree) is not
  answered by comparison — it declines/clarifies per §6.7.
- **OE-ASPECT-NONCONFLICT.** The bass fixture (Yang {voice-origin}, Yin
  {pitch}) passes the §8.2 conflict check with **no conflict flagged**, and
  both classifications remain independently retrievable by aspect-scoped
  queries.
- **OE-EXCESS.** The §6.8 worked example as a fixture: Fire-heavy profile vs
  the summer baseline → conclusions include excess(Fire), at least the
  heart/bitter/red manifestations, moderator **Water**, and downstream
  pressure on Earth. Its plain-mode rendering passes §9's leakage +
  faithfulness scans and contains **no medical claim**.
- **OE-COMPOSE.** `compose(yu)` → a set including **winter** and **kidneys**
  (and fear/salty/black/north), at the source classification's confidence —
  atomic, so asserted without hedge.
- **OE-SUCCESSOR.** A Wood-classified fixture concept gains a successor
  leaning toward Fire: aspect `temporal`, band `faint`, confidence strictly
  below its direct classification's — and in a precedence fixture where the
  concept also holds a direct classification, the direct statement is what
  answers, with the leaning recorded as superseded where they conflict.

---

## 7. The router: lookup first, then route, clarify, or decline

Slices 1 and 2a built a graph and a reasoner, but the chat's weakest part is
the doorway into them. `src/reason.ts` currently lets `interpret()` find
subjects by string position and type rank. The 2026-11-08 probe showed the
result: “which element is anger?” latched onto *element*, “what does the water
element correspond to in the body?” latched onto *correspond*, plurals such as
*kidneys* did not resolve at all, and “what is the opposite of cold?” returned
a definition of *opposite* even though the graph already contains the antonym.
Those are routing failures, not missing graph facts.

The router is therefore the next layer, and slice 2b builds it before more
data or propagation. It sits in front of the reasoner on every turn and makes
three decisions the reasoner should not have to guess at:

1. **What kind of question is this?**
2. **Which sense of which term — or which ontology node — fills each slot?**
3. \*\*Should the system answer, ask a clarifying question, or honestly say
   that this is not answerable yet?\*\*

The reasoner remains the graph-search component. The router does not replace
its shared-prior joins, cycle traversal or confidence rules; it hands the
reasoner a resolved `QueryIntent` instead of asking the reasoner to infer one
from an ambiguous sentence.

### 7.1 The surface principle: rooted in the ontology, not dressed in it

The end goal is a **real chat**: talking to AnSci should feel like using a
variation of an LLM chat. The ontology is the hidden root system. It decides
what the system knows, how facts connect, and why an answer follows — but an
ordinary user should not have to see roots in order to use the plant.

That gives three presentation modes, chosen by the router for each turn:

| Surface mode | When | What the user sees |
| --- | --- | --- |
| `plain` | Default; everyday questions, definitions, lexical relations, and ordinary explanations. | Natural conversational prose. No graph paths, edge names, synset ids, confidence narration, or “in this system / in this framework” scaffolding. Ontology terms are not used as explanatory jargon. |
| `framework` | The user explicitly asks about AnSci, ancient Chinese science, yin/yang, the elements as a framework, correspondences, or how a concept fits that framework. | Natural prose that **may name** the relevant priors and relationships, because the framework is now the subject. Still no raw path printout unless debug is also on. |
| `debug` | Developer/test presentation, enabled by configuration or a CLI flag such as `--debug`, never by accident in an ordinary turn. | Today's slice-2a presentation: intent, thresholds, resolved ids, paths, “derived, not stored” narration, and the evidence needed to test the system. |

`includeOntology` and surface mode are different controls. A `plain` answer
may be *derived through* the ontology internally; it simply cannot expose the
ontology as surface jargon. An explicit framework question sets both
`includeOntology: true` and `surfaceMode: "framework"`. Debug is orthogonal
presentation for developers: it may accompany either mode in tests, but is not
the product default.

#### The renderer

The component that turns a reasoner result into the visible answer is the
**renderer**. The reasoner supplies structured facts and paths; the renderer
owns wording. Its rule is the dictionary layer's no-drift discipline applied
to output:

> **The renderer may phrase, but it may never invent.** Every factual claim
> in the surface answer must be supported by a fact, gloss, correspondence,
> relation or path step the reasoner handed it.

The renderer is a full pipeline stage of its own — content planning,
realisation, and post-realisation verification — and is designed in §9; this
section states only the principle it serves. In brief: for slice 2b the
renderer is template-based; the reasoner hands it conclusions, never prose
(§9.1); in `plain` mode a prior-level conclusion is rendered through its
manifestations, not its name (§9.3); and every rendered answer passes the
leakage and faithfulness scans before it ships (§9.5). A later LLM renderer
(slice 3 at the earliest) is bound by the same contract (§9.4).

Clarifications and declines obey the same surface rule (§§7.4–7.5): a
clarification should sound like a person checking what was meant, not like a
decision tree exposing its branches, and a decline should sound like “I don’t
know much about that yet,” not like a database error.

### 7.2 Position and turn pipeline

Every chat surface — the CLI in slice 2b and the in-app chat in slice 3 —
calls the router first. There is no supported path from raw user text directly
to `reason.answer()` in a conversational session.

```text
user turn
   |
   v
+-------------------+      yes     +------------------------------+
| pending reply or  | -----------> | dispatch the stored branch   |
| correction?       |              | route; do not re-parse it    |
+-------------------+              +------------------------------+
   | no                                       |
   v                                          v
candidate terms -> lookup WordNet + ontology + session memory
   |
   v
decision tree (§7.4)
   |----------------------|-----------------------|
   v                      v                       v
 route                 clarify                 decline
   |                      |                       |
   v                      v                       v
reasoner: facts/paths   store branches in       natural answer +
   |                    session; ask once       useful alternatives
   v
renderer (surface mode set by the router)
   |
   v
answer + updated SessionState + any TrainerSignals
```

Implementation shape: a new `src/router.ts` exposes a session-aware turn
function (working signature `routeTurn(graph, session, text)`), returning a
`RouteDecision` (§7.8), the next `SessionState`, and any trainer signals
(§7.6). `src/chat.ts` owns one `SessionState` per REPL or `--script` run.
The reasoner gains an entry point that accepts a pre-resolved `QueryIntent`
(working name `answerIntent(graph, question, intent)`); the existing
`answer(graph, question)` remains as the one-shot/legacy wrapper used by the
CLI and older tests. Router-fed handlers may return structured facts in
addition to today's draft text so the renderer can honour §7.1.

### 7.3 Term lookup first

The decision tree queries the word net — and the ontology index — **before**
it classifies the question. Lookup is evidence gathering, not answer
generation.

**Step 0 — deixis and self-reference, before candidate terms (§8.13).**
Some expressions in a turn do not name concepts at all: *here*, *now*,
*today*, *tonight*, *this winter*, *this late in the year* point at the
system's **Situation** (§8.9) — the per-turn reading of place, date and
hour computed from the host clock and any known location — and
self-questions (“where are you?”, “what time is it for you?”) point at the
same object. The router resolves them against the Situation *before*
candidate-term generation: a deictic expression becomes a situated
referent (tonight → this date's night at this location, with its night
proportion per §8.10) and enters lookup as an already-resolved term; a
self-question routes to the Situation directly and is answered from it in
the current surface mode (§8.12). Hypothetical shifts (“and tomorrow
night?”, “what if I were in Sydney?”) are computed against a \*derived
copy\* — a shadow Situation (§8.13); the stored Situation never mutates for
a hypothetical. If a deictic expression needs a location the Situation
doesn't have, §8.12's rule applies: clarify, or answer with the assumption
stated.

#### Candidate terms and question slots

The router first identifies the question frame and its slots from the
sentence shape: for example, *classification* (“which element is X?”),
*correspondence* (“what sound goes with X?”), *antonym* (“what is the opposite
of X?”), *part-of* (“what does X belong to?”), *causal quality* (“why is X
cold?”), *relatedness* (“how are X and Y related?”), *definition*, and the
existing cycle/comparison/ontology-explanation frames.

It then generates candidate content terms from index keys, preferring the
longest attested phrase but retaining overlapping candidates with their
character spans. The index contains:

- ontology node names and synonyms (seed concepts, elements, polarities,
  qualities, seasons, times of day, trigrams, correspondence values);
- dictionary words;
- WordNet lemmas; and
- inflected surface forms from the morphology index (§7.3, below).

A word consumed as a frame label is not automatically a subject. In “which
element is anger?”, *element* names the requested classifier and *anger*
fills the target slot. In “what does the water element correspond to in the
body?”, *Water* fills the source slot, *body* selects the organ category, and
*correspond* is the verb that names the frame — even though WordNet also has
verb senses for it. Conversely, “what is an element?” really is asking about
*element*, because there the word fills the definition target slot.

If two incompatible candidates claim the same slot, the router does not fall
back to today's type-rank guess. That unresolved competition is itself input
to the decision tree: another discriminator may settle it, or the outcome is
clarification or decline.

#### What lookup records

For each candidate term, lookup records all of the following that apply:

```ts
interface TermLookup {
  surface: string;                 // as typed: "kidneys"
  span: [number, number];          // character span in the turn
  lemmaCandidates: LemmaCandidate[]; // exact lemma, or forms-index candidates

  wordNet: {
    present: boolean;
    senses: Array<{
      synsetId: string;            // e.g. "wn-n05412543"
      pos: "n" | "v" | "a";
      lemmas: string[];
      gloss: string;
      mappedConceptId?: string;    // via a MAPPED_TO bridge, if one exists
      climb?: {                      // result of the existing IS_A climb
        anchorNodeId: string;
        anchorSynsetId: string;
        hops: number;
      };
    }>;
  };

  ontology: {
    present: boolean;
    matches: Array<{
      nodeId: string;
      nodeType: NodeType;
      layer: Layer;
      roles: OntologyRole[];
      // Only the relation summary relevant to routing: e.g. "has
      // CORRESPONDS_TO -> Water", "is ELEMENT_OF Water", "has antonyms".
      relationHints: string[];
    }>;
  };

  dictionary: { present: boolean; entryId?: string };
  session: {
    resolvedSynsetId?: string;     // from SessionState, if already settled
    topicCompatibleSynsetIds: string[];
  };
}

type OntologyRole =
  | "primitive-element"
  | "primitive-polarity"
  | "primitive-trigram"
  | "mapped-concept"
  | "correspondence-value"
  | "quality"
  | "dictionary-only"
  | "absent";
```

Roles are a set, not a single label. *Fire* is both a WordNet word with
several senses and the ontology node with role `primitive-element`; that
overlap is exactly what the presupposition branch in §7.4 needs to see.
Likewise *anger* has WordNet emotion senses and an ontology match as a
`correspondence-value` (`emotion-anger —CORRESPONDS_TO→ Wood`), while *cold*
has a seed Quality node, a directly mapped temperature synset, and an unmapped
illness synset.

A lookup also pre-computes the two discriminators the tree is allowed to use:
whether a sense is directly mapped, and whether the existing bounded
`climbToAnchor()` reaches a mapped anchor. It does **not** silently choose a
sense merely because it appears first in the extract. Extract order is offset
order, not human sense priority — that is how *thunder* acquired “street names
for heroin” as its default gloss in the probe.

#### Morphology: the importer materialises a forms index

**Decision: morphology is importer data, not router guesswork.** The router
will not stem, strip suffixes, or invent a lemma at runtime. Instead,
`scripts/import-wordnet.py` gains a closed surface-form index in the extract:

```json
"forms": {
  "kidneys": [["kidney", "n"]],
  "children": [["child", "n"]],
  "went": [["go", "v"]],
  "leaves": [["leaf", "n"], ["leave", "v"]]
}
```

Only non-identity forms are stored. A form maps to \*\*lemma + part-of-speech
candidates\*\*, never directly to one synset, so ambiguity survives lookup and
remains the decision tree's problem. The importer builds the index from two
attested sources:

1. the WNDB exception files (`noun.exc`, `verb.exc`, `adj.exc`, and
   `adv.exc` if adverbs return), which list irregular surface → lemma pairs;
   and
2. WordNet's Morphy detachment rules applied **in reverse, at import time**,
   to the attested lemma inventory — regular noun plurals, verb
   `-s`/`-ed`/`-ing` forms (including `e`-drop and consonant-doubling
   variants), and adjective comparative/superlative forms. A generated form
   is emitted only when its base lemma + POS is itself attested in the
   extract, so the index stays closed and reviewable.

The current importer parses the WNDB `data.*` files but not the exception
files, and the current extract has no `forms` field; adding both is explicit
slice-2b importer work. `synsetsForLemma()` gains a surface-aware companion
(working name `synsetsForSurface()`): exact lemma lookup first, then the
forms index, returning the same synset records either way while preserving
`surface`, canonical lemma and POS candidates in the `TermLookup`. Slice 2b
covers inflected single words and exact multiword lemmas; inflecting the head
word inside a multiword phrase (“common colds”) is not claimed.

### 7.4 The decision tree

The tree is **ordered**: the first matching branch wins, and every decision
records a reason string so tests and debug presentation can show *why* this
route was taken. “Route” below means returning a `RouteToIntent` (§7.8) with
all required terms already resolved to node/synset ids.

| Step | Condition | Outcome |
| --- | --- | --- |
| **D0 — pending reply** | `SessionState.pendingClarification` exists and the new turn matches a branch by number, branch label, distinguishing keyword, or a restatement that uniquely overlaps one branch. | Dispatch that branch's stored route directly. Mark any sense it settles as `resolvedBy: "user"`. Do not re-run subject matching from scratch. If the turn is plainly a new question, clear the pending clarification and continue at D1. |
| **D1 — correction** | The turn corrects a prior resolution (“no, I meant the illness”, “not that cold — the other one”) and session memory contains the corrected term/antecedent. | Replace the session resolution (§7.6), emit a trainer signal, and route the corrected referent in the same turn. With no antecedent, clarify what term is being corrected. |
| **D2 — no resolvable content** | After slot extraction, no candidate term resolves in either index and the turn is not a follow-up or correction. | Decline naturally and say what kinds of questions are answerable. Do not manufacture a subject from a verb or frame word. |
| **D3 — absent term** | A term required by the frame is absent from both WordNet and the ontology/dictionary indexes. | Honest unknown for that term. If edit distance over canonical lemmas/ontology names yields a close near miss, offer it as a labelled alternative (“Did you mean *kidney*?”); never auto-route to the near miss. Without a near miss, offer definition/relationship alternatives for any other resolved term in the question. |
| **D4 — elliptical follow-up** | A required subject/object slot is empty, but the turn supplies a new slot value (“what about the liver?”, “and in winter?”) and session memory holds a compatible prior frame and antecedent. | Fill the missing slot(s) from memory, retain the prior intent unless the fragment clearly changes it, and continue at D6 with the completed frame. If memory has no compatible antecedent, clarify which term or question the fragment continues. |
| **D5 — presupposition clash** | A classification frame asks what kind K a target is (“what element is X?”, “what polarity is X?”), but lookup says X **is itself** a primitive of kind K (role `primitive-element`, `primitive-polarity` or `primitive-trigram`). | **Clarify.** The question's presupposition is false or ambiguous: the user may mean the primitive itself, the things classified under it, or an ordinary-language sense of the same word. Canonical case: Fire, worked in full in §7.5. |
| **D6 — unsupported relation** | The frame names a relation or explanation type, the terms resolve, but neither §7.7 nor an existing reasoner handler traverses that relation. | Capability-decline: say that relation is not answerable yet and name what **is** answerable about the same term (definition, correspondences, antonyms, parts, ontology profile, as applicable). **Anti-pattern, forbidden:** falling through to a definition of the relation word itself — the observed “what is the opposite of cold?” → definition of *opposite* failure. |
| **D7 — direct route** | Every required slot is resolved uniquely: an ontology node; a single WordNet sense; a session-resolved sense; or a sense selected by the frame's POS/category (for example, the adjective quality sense in an antonym question). | Route to the matching intent with the resolved ids, thresholds and surface mode. |
| **D8 — one discriminator** | A term has multiple senses, but exactly one candidate sense survives all applicable discriminators: it is directly mapped; its bounded IS\_A climb reaches an anchor relevant to the requested intent; it matches the session topic frame; or it is the only sense of the POS/category the frame requires. | Route silently with that sense and record how it was resolved (`climb`, `topic`, `curated-mapping`, or `frame`). This is the existing hail case: the greeting sense climbs nowhere, the ice-pellets sense reaches precipitation in one hop. |
| **D9 — no discriminator** | Multiple senses remain and no D8 discriminator separates them. | **Clarify** with sense branches (§7.5). Labels come from glosses/referents, not from internal ids in the product surface. If there are more than four candidate senses after frame/POS filtering, group them into at most four labelled sense groups whose stored routes answer at that group level; do not begin a second clarification round to subdivide a group. |
| **D10 — known but unanchored** | The term/sense resolves, but the requested causal or ontology relation needs a mapping or anchor that lookup shows is absent. | Coverage-decline, naturally phrased, with alternatives that are answerable (usually the definition and any lexical relations). Example: *banana* is a known fruit and its gloss even says “crescent-shaped”, but neither a causal shape explanation nor an ontology anchor exists, so “why is a banana curved?” must not be answered by invention. |
| **D11 — supported partial answer** | A multi-term question has one unanchored secondary term, but a resolved primary term supports a narrower answer that does not require inventing the missing relation. | Route the narrower intent and require the renderer to state the limit conversationally. Example: in “why do people sleep at night?”, *sleep* is not mapped and no sleep-at-night causal fact exists, but *night* is resolved; the answer may explain night's still/resting character while plainly not claiming the graph explains sleep itself. If the unanchored term is the primary subject, D10 applies instead. |

Two global rules cut across the tree:

- **Sense evidence beats word order.** A mapped or climbable sense outranks
  extract order; a session/user resolution outranks both for the rest of that
  session.
- **A route must name its evidence.** If neither lookup nor memory can say
  which node/synset a slot refers to, the tree may not route on a guess.

### 7.5 Clarification as a first-class response

A clarification is not an error message. It is a conversational turn whose
branches are already routes.

```ts
interface ClarificationBranch {
  id: string;                 // "1", "2", … as rendered
  label: string;              // short, in the user's framing
  detail?: string;            // gloss/referent, when a label alone is ambiguous
  route: RouteToIntent;       // fully resolved except for answer generation
}

interface ClarificationTurn {
  question: string;           // the visible question, in surface-mode language
  branches: ClarificationBranch[]; // 2–4 branches
  originalQuestion: string;
  askedAtTurn: number;
}
```

Rules:

- **Branches are pre-mapped.** Selecting a branch dispatches its stored
  `RouteToIntent`; the follow-up reply is matched against branch ids, labels
  and distinguishing keywords (§7.4 D0), not parsed as a brand-new question.
- **One round maximum per original user turn.** A stored branch route may
  route or decline, but it may not itself clarify. If the chosen branch turns
  out to be unanswerable, the answer is an honest decline with alternatives.
- **Pending state lasts for the next turn.** A new, unrelated question clears
  it (§7.4 D0). This keeps clarification conversational instead of modal.
- **Leakage rules bind questions too.** If the user's framing was plain, the
  clarification labels use ordinary referents and glosses — “the temperature
  word” versus “the illness” for *cold* — not “the Yin/Water sense”. Ontology
  vocabulary may appear only when the user invoked the framework, when the
  term itself is the framework term under discussion, or in debug output.
- **Ask like a person.** No decision-tree terminology, no synset ids, no
  “ambiguous input” language in the product surface. Debug presentation may
  show the branch → route mapping alongside the same text.

#### Worked example: “What element is Fire?”

1. **Frame:** classification. Classifier = *element*; target slot = *Fire*.
2. **Lookup:** the ontology contains `fire`, type `Element`, role
   `primitive-element`, with `fire —POLARITY_OF→ Yang` and incoming
   correspondence/classification edges. WordNet contains 21 *fire* senses,
   including combustion (`wn-n13713767`, “the process of combustion of
   inflammable materials producing heat and light and (often) smoke”) and a
   classical-element sense (`wn-n15092374`).
3. **Tree:** D5 fires before ordinary multi-sense handling. The question asks
   which element Fire belongs to, but Fire is itself one of the elements.
   Answering “Fire” would be a tautology that may not be what was meant;
   answering for the phenomenon without asking would be a guess.
4. **Clarification** (the user invoked *element*, so naming the framework
   here does not violate the plain-surface rule):

   > Quick check — in this framework, Fire is one of the five basic elements
   > itself. Did you mean:
   >
   > 1. **Fire itself** — what it stands for and what goes with it
   > 2. **The things classed under Fire** — seasons, concepts and phenomena
   > 3. **Ordinary fire** — flames and burning

5. **Branch routes:**

- **Branch 1 → Fire itself.** Stored route: `ontology_explanation` plus the
     correspondence profile (§7.7), terms resolved to the `fire` Element
     node, `surfaceMode: "framework"`. The answer can cover Yang polarity,
     summer, joy/heart, red, bitter, south and the `zhi` sound, and Fire's
     generation/restraint relations — every item taken from direct graph
     facts.
- **Branch 2 → things classed under Fire.** Stored route:
     `ontology_explanation` in the incoming-classification direction, terms
     resolved to `fire`. The handler collects nodes pointing into Fire —
     `ELEMENT_OF` (summer, the Li trigram), `HAS_ELEMENT` (derivative, high
     pressure system) and any future mapped concepts — grouped by relation,
     instead of pretending Fire has outgoing edges to its members.
- **Branch 3 → ordinary fire.** Stored route: `ontology_explanation`,
     terms resolved to the combustion synset `wn-n13713767` **and** its
     ontology anchor `fire`. Slice 2b adds the gloss-verified sense bridge
     `fire —MAPPED_TO→ wn-n13713767` to `SENSE_MAPPINGS`, so the selected
     phenomenon sense has the same kind of explicit bridge as sleet's anchor
     chain; the answer distinguishes the phenomenon (flames/burning) from
     the category it is classed under, rather than conflating them.

A reply of “3”, “ordinary fire”, “flames”, or “I mean burning” selects branch
3 under D0. A reply that asks something new clears the pending clarification
and is routed fresh.

### 7.6 Session memory

The router's memory is deliberately small, explicit, and session-scoped. It
remembers what the conversation has settled; it is not a user profile and it
does not silently become global graph truth.

```ts
export interface SessionState {
  version: 1;
  graphStamp: string;          // base edition + graph build identifier
  turn: number;
  resolvedSenses: Record<string, ResolvedSense>; // key: lemma, or lemma#pos
  topicFrame?: TopicFrame;
  pendingClarification?: PendingClarification;
  corrections: SessionCorrection[];
  trainerSignals: TrainerSignal[];
  recentTerms: ResolvedTermRef[]; // bounded, most-recent-first
  recentThoughts: ThoughtTrace[]; // §8.5; bounded ring, last 20 turns
}

export interface ResolvedSense {
  term: string;                // canonical lemma, e.g. "cold"
  surface: string;             // surface that settled it, e.g. "colds"
  synsetId: string;
  ontologyNodeId?: string;     // mapped concept/anchor, when one exists
  resolvedBy: "curated-mapping" | "climb" | "topic" | "user" | "single-sense" | "frame";
  turn: number;
}

export interface TopicFrame {
  id: string;                  // e.g. "meteorology"
  label: string;               // e.g. "weather"
  anchorNodeIds: string[];     // resolved subjects that established the frame
  evidenceTerms: string[];     // e.g. ["sleet", "precipitation"]
  setAtTurn: number;
  lastUsedTurn: number;
}

export interface PendingClarification {
  originalQuestion: string;
  askedAtTurn: number;
  branches: ClarificationBranch[]; // the same objects rendered to the user
}

export interface SessionCorrection {
  turn: number;
  term: string;
  fromSynsetId?: string;
  toSynsetId: string;
  userText: string;
}

export interface TrainerSignal {
  kind: "sense-correction";
  turn: number;
  term: string;
  originalQuestion: string;
  fromSynsetId?: string;
  toSynsetId: string;
  proposedAction: "propose-sense-bridge" | "propose-evaluation-case" | "none";
  status: "candidate";
}
```

Lifetime and ownership:

- One `SessionState` object per chat session. The CLI creates one for a REPL
  or `--script` run; scripted multi-turn evaluation therefore uses the same
  memory semantics as an interactive session.
- `routeTurn()` receives and returns the state; the router keeps no
  module-level mutable session. Slice 3's in-app chat can serialise the same object
  per conversation/thread and restore it verbatim.
- `graphStamp` guards persistence: if the WordNet edition or graph build
  changes, stored synset ids are revalidated on restore; stale resolutions
  are dropped rather than trusted.
- A topic frame is evidence, not a lock. It can discriminate senses under
  D8, but a directly mapped sense or an explicit user correction outranks it.

#### Corrections become trainer candidates — through the existing loop

A correction has two effects, on two different timescales:

1. **Immediately, in this session:** the corrected synset replaces the old
   entry in `resolvedSenses` with `resolvedBy: "user"`, a
   `SessionCorrection` is appended, and the current turn is re-routed to the
   corrected referent. For the rest of the session, the user's meaning wins.
2. **Later, as a trainer candidate:** the router appends a `TrainerSignal`.
   It does **not** write the graph. In the in-app trainer loop (§10.4), a
   signal is consumed exactly like any other discovered failure:

- if the correction implies a bridge should exist or change (the corrected
     sense should carry a mapping the wrong sense carried, or vice versa),
     the trainer calls `graph-propose-mapping` with an overlay record whose
     target is that sense bridge, using the original question as
     `evaluationQuestion`;
- `test-run` re-checks the original question against the proposal;
- only `graph-apply` makes it global, and that is what writes the
     `GraphAdjustment` audit node (§10.3–§10.4).
- If the correction is purely conversational — the user meant the illness
     sense of *cold* in a health discussion, but no global bridge should
     change — `proposedAction` is `propose-evaluation-case`: the signal
     becomes a `test-add` candidate and a session preference, not a mapping
     proposal.

In slice 2b's CLI, trainer signals are retained in `SessionState` and listed
in debug output. No CLI correction writes to the graph or the overlay.

### 7.7 New intents the router feeds

The router makes four relation families answerable using data already in the
merged graph, and repairs comparison. These are reasoner work items under the
slice-2b build; propagation (§6, slice 2c) is not required for any of them.
`QueryIntent.intentType` gains `"correspondence"`, `"antonym_lookup"`,
`"part_of"` and `"relatedness"`.

#### Correspondence — `correspondence`

- **Route condition:** a forward question resolves its source to an Element
  (“what does Water correspond to?”, “what goes with Fire?”, optionally with
  a category: body, sound, colour/color, taste, direction, emotion, organ,
  season); or a reverse question resolves its target to a correspondence
  value and asks for its element (“which element is anger?”).
- **Traversal:** forward — incoming `CORRESPONDS_TO` edges to the element,
  grouped by the source correspondence node's `properties.category`
  (`sound`, `color`, `taste`, `direction`, `emotion`, `organ`). The question's
  category selects one group; **body maps to the&#32;`organ`&#32;group** in slice 2b.
  If the user asks for the whole profile, season/time links (`ELEMENT_OF`
  into the element from Season/TimeOfDay nodes) may be reported as separate,
  clearly-labelled groups, not misrepresented as `CORRESPONDS_TO` edges.
  Reverse — the correspondence node's outgoing `CORRESPONDS_TO` edge gives
  the element directly: `emotion-anger —CORRESPONDS_TO→ Wood`.
- **Answer facts/shape:** grouped category → values, with the path for each
  group retained for debug. Plain rendering stays conversational: “For the
  body, Water goes with the kidneys.” A full-profile answer is a short
  grouped list, not a dump of edge names.

#### Antonym — `antonym_lookup`

- **Route condition:** the frame asks for an opposite/antonym of a resolved
  term. The target sense must be settled by D7/D8: a mapped seed quality,
  a session resolution, a topic/frame fit, or exactly one antonym-bearing
  sense with a distinct result. If different senses yield different antonyms
  and nothing discriminates them, D9 clarifies instead.
- **Traversal:** `ANTONYM_OF` in both stored directions (the relation is
  symmetric in meaning, but each stored edge is lemma-specific). The edge's
  `aspect` records the lemma pair (for example `cold ↔ hot`) and selects the
  displayed target lemma when the target synset has several lemmas.
- **Answer facts/shape:** the antonym lemma, the selected source sense (gloss
  retained for debug/disambiguation), and the edge used. For the canonical
  case, temperature-*cold* (`wn-a01258433`) → **hot**. A plain antonym answer
  is lexical and gains no ontology decoration.

#### Part-of / has-part — `part_of`

- **Route condition:** the frame asks what X is part of / belongs to, what
  parts X has, or whether X is part of Y. A body/anatomy frame or session
  topic selects the anatomical sense where several exist (finger the body
  part, not finger the glove part or unit of length).
- **Traversal — orientation is pinned to the data, not the edge name.** In
  the current extract, `PART_OF` edges run **whole → component**: `hand`
  → `finger`, and `finger` → `fingertip`/`fingernail`/`knuckle`. Therefore:
  “what is X part of?” reads **incoming** `PART_OF` edges (their sources are
  the wholes); “what parts does X have?” reads **outgoing** `PART_OF` edges
  (their targets are the components); a yes/no check inspects both. Results
  are grouped by the edge `aspect` subtype (`part`, `substance`, `member`).
  Slice-2b tests pin the hand/finger orientation so a future loader cleanup
  cannot silently reverse the answers.
- **Answer facts/shape:** only the direction asked for, as whole/component
  statements with paths retained. Canonical case: finger (anatomical synset
  `wn-n05647705`) is part of a **hand**.

#### Relatedness — `relatedness`

- **Route condition:** two terms are resolved and the frame asks how they are
  related, what connects them, or how one fits with the other.
- **Traversal:** search for the shortest **meaningful** connection, in this
  ranked order: (1) a direct curated/ontology relation between the resolved
  concepts, including a path through their elements' generation/restraint
  cycle; (2) a shared prior join (same or opposed element/polarity/quality);
  (3) a direct lexical relation (`IS_A`, `ANTONYM_OF`, `PART_OF`,
  `SIMILAR_TO`); (4) a WordNet common hypernym. `DEFINED_AS`, `SOURCED_FROM`
  and administrative `MAPPED_TO` hops are not themselves a relationship
  (a `MAPPED_TO` bridge may connect a synset to its concept so the concept's
  relations can be searched, but the bridge is not reported as the answer).
  Depth is bounded (4 ontology steps, 6 WordNet steps, as in the existing
  climb).
- **Answer facts/shape:** a plain-language statement of the relation, the
  supporting path for debug, and — where both terms have ontology profiles —
  the salient agreement or contrast. Canonical case: winter and summer are
  related as opposed points of the same seasonal cycle — winter resolves to
  Water/Yin and summer to Fire/Yang, with
  `winter —ELEMENT_OF→ Water —MUTUAL_RESTRAINT→ Fire ←ELEMENT_OF— summer`
  as the ontology path — **not** as the definition of either word alone.

#### Comparison — existing intent, repaired

Comparison is not a new intent, but the router changes its inputs and the
handler must change with them. The router supplies exactly two resolved
subjects; the current handler's fallback (definitions of the matched nodes,
which in the probe degenerated into text about the word *compare*) is
removed for router-fed turns. The handler gathers, for each subject: its
definition/gloss, any relatedness result between the pair (§7.7), and its
ontology profile when one exists. In `plain` surface mode the renderer
contrasts ordinary, supported features (season length of day, temperature,
dictionary facts); in `framework` mode it may contrast the priors directly
(Water/Yin versus Fire/Yang for winter versus summer).

### 7.8 Types sketch

The router's public types live beside the existing `QueryIntent` naming. The
route variant embeds a `QueryIntent` whose `matchedNodes` are already the
resolved node ids, in slot order (subject first), so the reasoner never has
to re-derive them.

```ts
import type { QueryIntent } from "./reason";

export type SurfaceMode = "plain" | "framework" | "debug";

export interface ResolvedTerm {
  surface: string;
  lemma: string;
  slot: "subject" | "object" | "target" | "quality" | "category" | "classifier-value";
  nodeId?: string;             // ontology/seed node, when resolved to one
  synsetId?: string;           // WordNet sense, when resolved to one
  ontologyRole?: OntologyRole;
  resolvedBy: "curated-mapping" | "climb" | "topic" | "user" | "single-sense" | "frame" | "ontology-name";
}

export interface RouteToIntent {
  kind: "route";
  intent: QueryIntent;         // intentType gains the §7.7 values
  terms: ResolvedTerm[];
  surfaceMode: SurfaceMode;
  decisionReason: string;      // tree step + discriminator, e.g. "D8/climb"
}

export interface ClarificationBranch {
  id: string;
  label: string;
  detail?: string;
  route: RouteToIntent;        // fully resolved; execution may decline, never clarify
}

export type RouteDecision =
  | RouteToIntent
  | {
      kind: "clarify";
      question: string;
      branches: ClarificationBranch[];
      originalQuestion: string;
      surfaceMode: SurfaceMode;
      decisionReason: string;  // e.g. "D5/presupposition-clash"
    }
  | {
      kind: "decline";
      reason: string;          // internal reason code + explanation
      userMessage: string;     // natural, surface-mode phrasing
      alternatives: Array<{
        label: string;
        route?: RouteToIntent; // dispatch directly when fully resolved
        question?: string;     // otherwise, re-run this text as a fresh turn
      }>;
      surfaceMode: SurfaceMode;
      decisionReason: string;  // e.g. "D6/unsupported-relation"
    };
```

`SessionState`, `TermLookup` and their supporting types are sketched in
§§7.3 and 7.6. Debug output serialises the whole `RouteDecision`; product
output renders only the answer, clarification question, or decline message.

### 7.9 Evaluation: the probe suite, router cases, and the feel target

The 13 questions from the 2026-11-08 investigation become a named regression
suite — **Router Probe Suite** (`RPS`) — with the expected decision recorded
*before* the build, so slice 2b is judged against the failures that motivated
it. The questions are listed verbatim:

| # | Question (verbatim) | Expected decision / route | Expected result |
| --- | --- | --- | --- |
| RPS-01 | why is summer warm | route — `causal_chain` | summer resolved to the seed Season; answer derives warm through Fire/Yang (`summer —ELEMENT_OF→ Fire —POLARITY_OF→ Yang —HAS_QUALITY→ warm` in debug). |
| RPS-02 | why is the night cooler than the day | route — `causal_chain`, comparative | *cooler* resolves to the `cold` Quality via its synonyms; night derives through Yin. No generic seed *day* node is invented; the comparative is answered from night's side, as today. |
| RPS-03 | what does the water element correspond to in the body | route — `correspondence`, category `organ` | Water is the source; *correspond* is not the subject. Answer: **kidneys**. |
| RPS-04 | which element is anger | route — `correspondence`, reverse | *anger* resolves to the correspondence value, not the word *element*. Answer: **Wood**. |
| RPS-05 | why is a banana curved | decline — D10, known but unanchored | *banana* resolves (fruit sense); the answer offers the definition as an alternative and invents no causal or ontological explanation of its shape. |
| RPS-06 | is thunder yang | clarify — D9, no discriminator | No sense is silently chosen and “street names for heroin” is never the default answer. Branches are labelled by the noun senses' glosses (lightning noise / prolonged deep noise / the slang sense). |
| RPS-07 | what is the opposite of cold | route — `antonym_lookup` | Temperature sense `wn-a01258433` selected via the mapped Quality; answer: **hot**. Never a definition of *opposite*. |
| RPS-08 | compare winter and summer | route — `comparison` | Both seasons resolved as the two subjects; the answer contrasts them and states their relation. Never a definition of *compare*. |
| RPS-09 | why do people sleep at night | route — D11 partial, `causal_chain`/`ontology_explanation` for night | *night* is resolved and its still/resting character may be explained; *sleep* is explicitly unmapped, and the answer must not claim the graph explains why people sleep. |
| RPS-10 | what part of the body does a finger belong to | route — `part_of`, whole direction | Anatomical finger sense `wn-n05647705`; answer: **hand**, via the incoming `PART_OF` edge (§7.7 orientation rule). |
| RPS-11 | tell me about kidneys | route — `definition` | The forms index resolves *kidneys* → lemma *kidney*, synset `wn-n05412543`; the answer is its gloss, with no ontology terms in plain mode. |
| RPS-12 | how are winter and summer related | route — `relatedness` | The Water/Fire restraint path and opposed seasonal profiles (§7.7); never the definition of *summer* alone. |
| RPS-13 | what sound goes with the water element | route — `correspondence`, category `sound` | Answer: **yu (羽)**. *element* is the classifier, not the subject. |

Router-specific scripted cases, run against one shared `SessionState` per
script:

- **RPS-FIRE — the Fire clarification (§7.5).** Turn 1, “What element is
  Fire?”, returns `kind: "clarify"` with the three branches. Three separate
  runs reply “1”, “the things classed under Fire”, and “flames” respectively;
  each dispatches its stored route (D0) and answers for that branch's
  resolved terms, with no second clarification.
- **RPS-THUNDER-TOPIC — topic frame resolves a sense silently.** Turn 1 asks
  “why is sleet cold?”, establishing a weather topic frame. Turn 2 asks “is
  thunder yang?”: the meteorological sense `wn-n07540248` is selected with
  `resolvedBy: "topic"` (D8) — never the heroin sense — and the answer then
  honestly reports that this sense has no Yang mapping yet, rather than
  asserting one.
- **RPS-CORRECTION — a user correction wins and becomes a signal.** In a
  weather-framed session, “what about cold?” resolves to the temperature
  sense; the user replies “no, I meant the illness”. The router replaces the
  session resolution with `wn-n14389489` (`resolvedBy: "user"`), answers for
  the illness sense in the same turn, records a `SessionCorrection`, and
  appends a `TrainerSignal` with \`proposedAction:
  "propose-evaluation-case"\` (no global bridge change is implied). A later
  bare “cold” in the same session still means the illness until the user
  changes it.
- **RPS-ELLIPSIS — an elliptical follow-up inherits the frame.** Turn 1:
  “what does the water element correspond to in the body?” → kidneys. Turn 2:
  “what about the liver?” fills the correspondence frame from memory and
  routes the reverse lookup for the liver, answering with its element,
  **Wood** — it does not ask “the liver what?” and does not restart as a
  bare definition unless the user then asks for one.
- **RPS-SURFACE — the feel target, as a scan.** A scripted everyday
  conversation (definitions, lexical relations, and ontology-derived answers
  such as “why is sleet cold?”, asked in plain language) is run twice. The
  **plain run's** visible text must contain zero framework terms — *yin*,
  *yang*, *Wuxing*, *trigram*, the element names used as framework terms,
  edge names such as `HAS_QUALITY`, synset ids, and “in this framework”
  scaffolding — while the **paired debug run** of the same script shows the
  paths proving those answers were ontology-derived. “Rooted but not
  visible” is thus a testable property of the pair of runs, not a hope.
  The same script asserts the conversational side of the feel target:
  clarifications arrive as questions with selectable options, follow-ups
  resolve without the user restating context, and a correction is honoured
  on later turns — multi-turn coherence is part of passing, not polish.

**Slice 2b is done when:**

- all 13 RPS cases pass with the expected decision kind, tree step, resolved
  node/synset ids, and answer content above;
- RPS-FIRE, RPS-THUNDER-TOPIC, RPS-CORRECTION, RPS-ELLIPSIS and RPS-SURFACE
  pass as scripted multi-turn runs;
- the morphology fixtures resolve through the forms index (kidneys→kidney,
  children→child, went→go, leaves→{leaf, leave});
- clarification and decline text passes the plain-mode leakage scan, and
  debug mode still shows decisions, resolved ids and paths on demand;
- the pre-existing 21 tests still pass, including the slice-1 winter
  derivation and the slice-2a cold disambiguation.

---

## 8. Thought and memory

§7 gave the router a decision tree and a small session memory, but two things
were still unnamed when slice 2b was first scoped: what happens *inside* a
turn between routing and speaking, and what the system as a whole remembers
across turns and across sessions. This section names both, before the 2b
build, so the turn pipeline is built against these definitions: **Thought**
is the deliberation record of a single turn; **Memory** is the three-layer
system — semantic, episodic, experience — that Thought reads from and the
router writes to.

### 8.1 Thought: the deliberation record

For each turn, before anything is rendered, the turn pipeline (the router
directing, the reasoner executing) produces a **ThoughtTrace**: the explicit,
structured record of the deliberation that led to the turn's decision. A
trace is built *as the turn runs* — each step is appended when the operation
happens — never reconstructed afterwards from the finished answer.

A trace decomposes the question into sub-questions and answers them one step
at a time. Each step is one graph operation, of one of these kinds:

- `lookup` — term/sense resolution against WordNet, the ontology and session
  memory (§7.3);
- `route` — a decision-tree step (§7.4), with its `decisionReason`;
- `climb`, `join`, `correspondence`, `antonym`, `partof`, `relate` — the
  traversals of §7.7 and the existing reasoner, each recording its inputs
  (term, synset and node ids), the paths actually used, and an \*\*interim
  conclusion\*\*.

An interim conclusion is a small structured fact — subject id, relation,
object id, confidence, and the step ids it derived from — never prose.
Interim conclusions accumulate in the trace, and \*\*later steps may consume
earlier conclusions as inputs\*\*. That one mechanism is what makes multi-step
answers possible at all:

- a **comparison** is two sub-deliberations (one per subject), each ending in
  a profile conclusion, plus a synthesis step — a `join` whose inputs are
  the two profile conclusions and whose conclusion is the contrast;
- a **why-chain through a propagated leaning** (slice 2c) is a `climb` step
  whose conclusion (this term leans on that anchor) feeds a `join` step
  against the question's other term;
- a **relatedness** answer is a `relate` step consuming both terms' resolved
  profiles, rather than searching outward from raw words.

The renderer never sees steps (§8.4). It consumes the trace's conclusions
and check outcomes — the *results* of deliberation, not its transcript.

### 8.2 Pre-speech checks

Every trace ends with three named check steps, run after the substantive
steps and before the decision is final. They are steps in the trace, not
side effects, so a failure is inspectable in debug like any other step.

1. **Conflict check.** If two conclusions in the trace disagree — same
   subject, incompatible relation/object (a term deriving both a Yin and a
   Yang leaning above threshold; a correspondence profile contradicting a
   climb result) — the turn may not silently pick one. The outcome is one
   of: *soften* (render both as tendencies, the weaker one hedged),
   *present both* (framework mode: show the disagreement and its sources),
   or *clarify* (downgrade the decision to a clarification whose branches
   are the conflicting readings). In slice 2b, conflicts can only come from
   the loaded graph; propagation (§6, slice 2c) is the expected main source
   later, and its conflict flagging (§6.4) reports into this same check.
2. **Leakage check.** The conclusions to be rendered are scanned against the
   turn's surface mode (§7.1): in `plain` mode, no conclusion may surface
   using framework terms, edge names or synset ids; in `framework` mode,
   priors may be named but raw paths stay in debug. A flagged claim is
   re-rendered from its structured fact by the template renderer — never
   patched up in prose after the fact.
3. **Confidence floor.** The weakest *load-bearing* step — a step whose
   conclusion the final answer actually depends on — is compared with the
   route's threshold. Below the floor, the check emits a \*\*hedge
   instruction\*\* to the renderer (the claim is phrased as a tendency, not a
   fact); when the weakness is in sense resolution rather than in a derived
   fact, it downgrades the decision to `clarify` or `decline` (§7.4 D9/D10
   cover those cases; the check is where they are re-invoked, with the trace
   as evidence).

### 8.3 Bounds on deliberation

Deliberation is bounded, in two ways:

- **Step bound: at most 12 steps per turn**, checks included. A
  decomposition that would exceed the bound stops there; the decision falls
  back to what the completed steps support.
- **Cycle guard:** no step may re-run an identical sub-question — same step
  kind, same resolved inputs — within one trace. A repeated sub-question
  returns the earlier step's conclusion instead of traversing again.

When the bound stops a turn, the trace records `boundHit: true` and the
answer is a **partial answer**: rendered only from completed steps'
conclusions, honest about being partial in the same natural register as a
decline (§7.1) — not an error, and never padded out by the renderer.

### 8.4 Visibility: a log, not a story

Thought is internal machinery.

- `debug` surface mode serialises the whole trace alongside the
  `RouteDecision` (§7.8).
- The slice-3 trainer UI (§10.1) shows the trace as the turn's steps — the
  deliberation *is* the inspectable activity of the turn.
- `plain` and `framework` surfaces never see steps, conclusions or checks;
  they see only the rendered answer.
- “Why did you say that?” is answered from the stored trace (§8.6, episodic
  memory): its conclusions are re-rendered in `framework` mode. The reasoner
  is **not** re-run.

This is a deliberate contrast with an LLM's chain-of-thought. A language
model's “reasoning” text is a statistical narration produced alongside the
answer; nothing guarantees any step of it actually happened. A ThoughtStep
is the opposite kind of object: each one corresponds to an actual graph
operation that either happened or did not, with the ids and paths it used.
The trace is a log, not a story — which is why the trainer loop (§10.4) can
debug a failed answer from it, and why the user can be shown real work on
request.

### 8.5 Thought types

```ts
import type { RouteDecision } from "./router"; // §7.8

export type ThoughtStepKind =
  | "lookup" | "route" | "climb" | "join" | "correspondence"
  | "antonym" | "partof" | "relate" | "check";

export interface InterimConclusion {
  id: string;                  // "c1", "c2", … — later steps cite these
  subjectId: string;           // node or synset id the claim is about
  relation: string;            // edge type or derived relation name
  objectId?: string;           // node/synset id, when the claim has an object
  confidence: number;
  derivedFrom: string[];       // ThoughtStep ids that produced this claim
}

export interface ThoughtStep {
  id: string;                  // "s1", "s2", … in execution order
  kind: ThoughtStepKind;
  subQuestion?: string;        // the decomposed question this step answers
  inputs: string[];            // term / synset / node / conclusion ids consumed
  paths: string[];             // path strings actually traversed (debug form)
  conclusion?: InterimConclusion;
  check?: "conflict" | "leakage" | "confidence-floor"; // check steps only
  outcome?: "pass" | "flagged" | "failed";             // check steps only
  note?: string;
}

export interface ThoughtTrace {
  turn: number;
  question: string;            // the user's turn, verbatim
  steps: ThoughtStep[];        // ≤ 12 (§8.3)
  conclusions: InterimConclusion[];
  checks: {
    conflict: "pass" | "flagged" | "failed";
    leakage: "pass" | "flagged" | "failed";
    confidenceFloor: {
      weakestStepId?: string;
      weakestConfidence?: number;
      action: "none" | "hedge" | "downgrade";
    };
  };
  decision: RouteDecision;     // §7.8 — the decision this trace led to
  boundHit?: boolean;          // §8.3: deliberation stopped at the step bound
}
```

The renderer (§9; introduced in §7.1) consumes `conclusions` plus `checks`
(hedge instructions, leakage flags) — **not** raw `steps`. Steps exist for
debug output, the trainer UI, episodic replay, and evaluation.

### 8.6 Memory: three layers, one system

“Memory” in AnSci is not one store. It is three layers with different
contents, lifetimes and writers — and confusing them is how a system ends up
silently promoting a conversational remark into knowledge. The layers:

**Layer 1 — Semantic memory: the graph itself.** The merged graph — atomic
layer, dictionary, base nets (§1.1, §4, §5) and the AnSci overlay (§3) — is
the system's long-term knowledge: permanent, versioned, audited. The router
and the reasoner read it; neither writes it. Its \*\*only writer is the
trainer loop\*\* (§10.4): `graph-propose-mapping` → `test-run` →
`graph-apply`, and `graph-apply` is what writes the `GraphAdjustment` audit
node (§10.3). If a fact is not in the graph through that loop, the system
does not “know” it — no matter how often it came up in conversation.

**Layer 2 — Episodic memory: the session.** `SessionState` (§7.6) —
resolved senses, topic frame, pending clarification, corrections — is the
memory of *this conversation*. As of this section it also holds the
session's recent ThoughtTraces: `recentThoughts` (§7.6), a bounded ring of
the **last 20 turns**' traces. The ring is what makes follow-ups cheap and
answers checkable: an elliptical follow-up (§7.4 D4) can cite conclusions
already reached, and “why did you say that?” replays the stored trace's
conclusions in `framework` mode instead of re-deriving them (§8.4).
Episodic memory dies with the session unless slice 3 serialises it per
thread (§7.6); it never writes the graph.

**Layer 3 — Experience memory: the cross-session log.** New in this section:
an **append-only event log outside the graph**, recording how conversations
actually went, across sessions. Four event kinds:

- **corrections** — term, wrong sense, right sense, and the turn context
  (the same facts as the `SessionCorrection` / `TrainerSignal` pair in
  §7.6, persisted beyond the session);
- **clarification resolutions** — the question asked, the branches offered,
  and the branch the user chose;
- **gap hits** — every decline or clarification-for-missing-knowledge event
  (§7.4 D3 absent term, D10 known but unanchored; a D2 decline is logged
  when candidate terms were extracted but resolved nowhere), with the
  unanchored term(s) that caused it, counted.
- **renderer gaps** — every stage-3 verification failure in the translation
  layer (§9.5): which scan failed, the offending detail, and how it was
  resolved (repaired / dropped / fallback). They rank renderer bugs for the
  trainer the way gap hits rank missing mappings.

```ts
export type ExperienceEvent =
  | { kind: "correction"; at: string; sessionId: string; question: string;
      term: string; fromSynsetId?: string; toSynsetId: string }
  | { kind: "clarification-resolved"; at: string; sessionId: string;
      question: string; branchId: string; resolvedTermIds: string[] }
  | { kind: "gap-hit"; at: string; sessionId: string; question: string;
      unanchoredTerms: string[]; decisionReason: string }
  | { kind: "renderer-gap"; at: string; sessionId: string; question: string;
      stage: "leakage" | "faithfulness"; detail: string;
      resolution: "repaired" | "dropped" | "fallback" };
```

Storage: JSONL files under **`data/experience/`** — beside `data/wordnet/`
in layout, but **gitignored like&#32;`data/raw/`**. It is the user's
conversation data: local-first, never committed, never part of the merged
graph or of a snapshot push.

What experience memory is *for*: aggregation (designed here, built in slice
3, §10) folds the log into the trainer's work queue — gap-hit counts rank
the most-asked-about unanchored terms, and those get mapping proposals
first; repeated corrections on one term flag its sense bridge for review.
Nothing in experience memory is **ever auto-promoted** to semantic memory:
promotion happens only through the trainer loop, with tests, exactly as
§7.6 already specifies for corrections.

### 8.7 Lifecycle and write discipline

| Layer | Contents | Lifetime | Writer | Reader | User control |
| --- | --- | --- | --- | --- | --- |
| Semantic (the graph) | atomic + dictionary + base nets + overlay | permanent, versioned | trainer loop only (§10.4, via `graph-apply`) | router, reasoner, chat tools | inspect (`graph-inspect`); change only via reviewed proposals |
| Episodic (`SessionState`) | resolved senses, topic frame, pending clarification, corrections, last-20 ThoughtTraces, situation overrides (user-stated place, §8.12) | one conversation (serialisable per thread in slice 3) | router (`routeTurn`) | router, renderer, trace replay | clear session |
| Experience (`data/experience/`) | corrections, clarification resolutions, gap hits, renderer gaps (JSONL) | cross-session, until cleared | router (events appended at turn end); renderer gaps reported by the renderer, appended by the router | trainer aggregation (slice 3), user | inspect the log; clear experience |

Write-discipline rules, without exception in slice 2b:

- The **router** writes episodic state and experience events. It is the only
  component that touches either.
- The **reasoner writes nothing.** It is a pure function of (graph, intent);
  its operations enter the ThoughtTrace only because the turn pipeline
  records them as steps.
- The **renderer writes nothing.** It consumes conclusions and check outcomes
  and produces text.
- The **trainer loop** is the only writer of semantic memory (§10.4).

### 8.8 Evaluation additions (thought and memory)

These extend §7.9 and are part of slice 2b's done-when (§12):

- **TM-TRACE-COMPARE.** RPS-08 (“compare winter and summer”) produces a
  ThoughtTrace with **≥3 steps, including a synthesis step** — a `join`
  consuming both subjects' profile conclusions (§8.1).
- **TM-GAP-LOG.** A question declined for missing knowledge (RPS-05, the
  banana) appends **exactly one** `gap-hit` experience event naming the
  unanchored term (`banana`), and no other experience event that turn.
- **TM-CORRECTION-LOG.** The RPS-CORRECTION flow updates episodic state
  (the illness sense, `resolvedBy: "user"`) **and** appends exactly one
  `correction` experience event with the same from/to synset ids.
- **TM-REPLAY.** After a plain-mode answer, “why did you say that?” replays
  the stored trace's conclusions in `framework` mode; a spy on the reasoner
  proves it was **not** re-run.
- **TM-BOUND.** A pathological question engineered to decompose past 12
  steps returns a partial answer rendered only from completed steps, with
  `boundHit: true` in the trace and no fabricated completion.

### 8.9 The situated self: the `Situation` object

§7.6 gave the router a memory of the conversation, and §§8.1–8.8 gave the
system a record of its deliberation. Neither says *where or when* the
conversation is happening — yet the ontology is, to a large degree, a
theory of place and season: direction correspondences in the seed's
tables, season degree profiles (§6.7), turning points in the year and the
day (§6.5). A chat that can derive “winter is Yin-predominant in the light
aspect” but cannot say whether it *is* winter where it sits is missing the
fact its own framework most wants. So, from the start, the chat instance
is a **situated self**: beside `SessionState`, the turn pipeline maintains
a `Situation` — a per-turn reading of the system's place, date and hour.

```ts
export interface Situation {
  instant: string;               // ISO 8601; refreshed every turn, never a stored fact
  timezone?: string;             // IANA name, when the host provides one
  location?:
    | { lat: number; lon: number;
        source: "host-config" | "user-stated" | "kb";
        label?: string }         // "Chicago", when known
    | { unknown: true };
  host: {
    description: string;         // what the system is, e.g. "a program on a server" (§8.12)
    machineLocationNote?: string;// deployer note, e.g. "hosted in a data centre;
                                 // the physical location is nominal"
  };
  derived: SituationDerived;     // §8.10 — computed, never asserted
}

export interface SituationDerived {
  dayOfYear: number;
  hemisphere?: "north" | "south" | "equatorial";
  latitudeBand?: "polar" | "temperate" | "tropical";
  seasonHere?: string;           // concept id of the season predominant HERE, now (§8.10a)
  timeOfDayPhase: string;        // concept id on the day cycle: night / dawn / midday / dusk (§8.10c)
  lightAspect:    { yinProportion?: number;
                    band: "predominant" | "present" | "faint";
                    source: "computed" | "canonical" };
  activityAspect: { yinProportion?: number;
                    band: "predominant" | "present" | "faint";
                    source: "computed" | "canonical" };
}
```

Rules of the object:

- **Derived fields are computed per turn** from (`instant`, `location`) by
  the rules in §8.10. They are recomputed, never stored as facts, and
  never written to the graph: two turns at different instants hold
  different Situations, and both are correct. The Situation is a reading,
  not a record.
- **Use is traced.** When a derived value is actually consumed in
  deliberation, the ThoughtTrace records it — as inputs of the step that
  consumed them (§8.1) — so “why did you say tonight would be long?”
  replays the night proportion the answer used (§8.4), not a fresh
  computation at a later hour.
- **Ownership.** The Situation is computed by the turn pipeline (host
  clock and configuration, plus the episodic override of §8.12) and read
  by the router. It lives *beside* `SessionState`, not inside it:
  `SessionState` is what the conversation has settled; the Situation is
  what the world currently is. The one write path from conversation into
  it is the user-stated location (§8.12), held as an episodic override and
  applied at computation time — the Situation object itself is still
  rebuilt every turn.

### 8.10 Computing the situation

**(a) Season-here: a function of (date, hemisphere), never of month.**
The year is anchored on §6.5's turning and balance points — solstices
maximal, equinoxes in balance. In the northern hemisphere, the season for
a date is the season whose arc (equinox→solstice→equinox) contains it; in
the southern hemisphere the season is the opposite one, shifted six
months. `seasonHere` names that season concept; the predominant-phase
reading then comes from the season's element and degree profile (§6.7).

> **The December rule.** Season is a function of (date, hemisphere),
> never of the month alone: December is Water-predominant in the northern
> temperate zone and Fire-predominant in the southern temperate zone. Any
> computation — or any test fixture — that maps a calendar month directly
> to a season is defective by definition, whatever it outputs.

In the **equatorial band** (|latitude| ≤ 10°, `hemisphere: "equatorial"`)
the solstice swing is small and the lived rhythm is wet/dry rather than
hot/cold. Fallback, stated once and applied uniformly: `seasonHere` is the
season of the *nearest* solstice/equinox anchor, and its degree band is
capped at `present` — the engine never claims predominance at the equator
from the calendar alone. Wet/dry character arrives through climate
(§8.11), not through the season.

**(b) Night proportion: the engine's measured input.** From (date,
latitude), by the standard solar computation — named here with its
inputs and outputs, not derived: **solar declination** δ is approximated
from day-of-year (`δ ≈ −23.44° · cos(360°/365 · (N + 10))`); the
**sunrise hour-angle equation** `cos H = −tan φ · tan δ` (φ = latitude)
gives day length `2H/15` hours, and \*\*night proportion = 1 − dayLength /
24\*\*. Where `|tan φ · tan δ| > 1` there is no sunrise or no sunset that
day: polar night or polar day, night proportion 1 or 0 — the extremal
values §8.11 names. The output feeds §6.7's light-aspect Yin proportion
**directly**: this computation is where the engine's *measured* values
come from, the loop §6.7's honesty note left open. Marking is part of the
value: `derived.lightAspect.source` is `"computed"` when coordinates fed
the formula. When location is unknown, no proportion is computed; where a
season is established by other means (a user-stated season, §8.12), the
light aspect falls back to §6.7's canonical season profile, marked
`source: "canonical"` — and where no season is established either, the
light aspect reports only what the clock supports (rule (c)).

**(c) Time of day: the clock on the day cycle.** Local time (instant +
timezone; host local time when no timezone is known) maps onto §6.5's
daily turning points: midnight is Yin-maximal, noon Yang-maximal, in the
light and activity aspects. The interpolation rule is deliberately
simple: Yin proportion is 1.0 at midnight, 0.5 at sunrise, 0.0 at noon,
0.5 at sunset, **linear between those anchors**. Where the location is
known, the computed sunrise/sunset of rule (b) replace the nominal 06:00
/ 18:00 anchors. `timeOfDayPhase` names the seed time-of-day concept
(night / dawn / midday / dusk) whose sector contains the local time.
Activity-aspect proportion follows the same curve; its `source` is
`"canonical"` — the day-cycle shape is framework doctrine, not a
measurement.

**(d) Direction: a correspondence, not a computation.** The seed's
direction correspondences (category `direction`: north–Water, south–Fire,
east–Wood, west–Metal, centre–Earth) apply two ways. To *terms*: a
question naming a direction resolves to the correspondence value, exactly
as §7.7's correspondence intent already handles. To *places*: “north of
here”, “the city north of us” combine `Situation.location` with KB place
associations (§3.6 — coordinates and `LOCATED_IN`) to determine a
bearing, and the bearing then engages the direction correspondence. The
Situation itself stores no facing — the system has none; direction enters
only through referenced places.

### 8.11 Location aspects

Location is not one fact. It reaches the reasoning through five aspects —
each with its own source and its own consumers:

| Aspect | What it is | Where its value comes from | What reasoning it feeds |
| --- | --- | --- | --- |
| **Direction** | the compass correspondence: north–Water, south–Fire, east–Wood, west–Metal, centre–Earth | the seed's atomic correspondence table | the correspondence intent (§7.7); relative-bearing reasoning over places (§8.10d) |
| **Hemisphere** | which half of the planet — the season-inversion aspect | the sign of latitude (`north` / `south`; `equatorial` within ±10°) | season-here (§8.10a) — the December rule |

| **Latitude band** | `polar` ( | φ | ≥ 66.5°), `temperate`, `tropical` ( | φ | ≤ 23.5°): how far the proportion machinery can swing | computed from coordinates (§8.10b) | the night-proportion range; season strength caps (§8.10a). Polar night is the maximal-Yin light condition — §6.5's turning-point extremum as a *place*, lasting weeks, not a moment |

| **Climate** | arid vs humid, and the classification behind it: why two places at the same latitude and date sit differently in the framework — damp engages Earth's associations and the moist quality, aridity the dry | KB climate statements for places (§3.6); for the Situation, the configured place's climate association when that place is KB-joined | balance-dynamics baselines (§6.8); correspondence composition (§6.9) |
| **Interiority** | the *host* aspect: the system is inside a computer. Its environment is computational — no weather reaches it, no light; it has no surroundings in the physical sense at all | host configuration (`Situation.host`, §8.9) | self-knowledge and the honesty discipline (§8.12). The Situation's season and hour describe the world *as the system knows it* — by clock, place and report — not a body it has |

### 8.12 Honesty of the situated self

The system knows what it is, and knows how it knows. Both are designed,
not emergent:

- **What it is:** `Situation.host.description` is stated configuration —
  “a program running on a server”, or whatever the deployer writes.
  Self-knowledge answers use it verbatim in substance; the system never
  describes itself as embodied, located in a body, or present somewhere it
  is not.
- **How it knows:** exactly four channels — the **clock** (instant and
  timezone from the host), **configuration** (a host place, when the
  deployer set one), the **conversation** (a user-stated place or
  season), and the **knowledge base** (a named place's associations,
  §3.6). Nothing else. It has no senses: it never claims to feel the
  temperature, see the light, or observe the weather. At 03:00 it knows
  the *hour*; the darkness it reports is computed (§8.10), and in
  `framework`/`debug` mode is named as computed.
- **Never fabricate a place or a sensation.** If `Situation.location`
  is unknown, no answer may contain a place the system doesn't have.
  When a question *needs* a location the Situation lacks, the router (§7)
  either **clarifies** (“whereabouts are you? — tonight's length depends
  on it”) or answers **with the assumption stated** on the surface (“if
  you're in the northern temperate zone, …”). Clarify when no true
  unconditional answer exists; state the assumption when a true
  conditional one is still useful.
- **User-stated location updates the situation — episodically.** “I'm in
  Sydney” writes an override into `SessionState` (the one extension to
  §8.7's write discipline; the table's episodic row lists it), marked
  `source: "user-stated"`, applied from the next turn's computation, and
  it outranks host configuration for the session — deictic words (*here*,
  *tonight*) mean the speaker's here. It never writes the graph: a user
  saying where they are is not a KB fact (§8.7, semantic layer untouched).
- **Self-questions route to the Situation.** “Where are you?”, “what time
  is it for you?”, “is it winter where you are?” are answered from the
  Situation's fields — host description, location state, derived block —
  in the current surface mode (§8.13 step 0 routes them). With location
  unknown, the honest answer is available and is the designed one: it
  doesn't know where this machine is; it is a program on a server, and
  nobody has told it the place.

### 8.13 Deixis: *here*, *now*, *tonight*

Deictic expressions are resolved against the Situation \*\*before term
lookup\*\* — §7.3 step 0, specified here. Resolution rewrites them into
situated referents the rest of the pipeline treats as ordinary resolved
terms:

- *here* → `Situation.location` (or unknown → §8.12's clarify /
  stated-assumption behaviour);
- *now*, *today* → the Situation's instant and date;
- *tonight* → the night of that date at that location: a date plus its
  night-proportion reading (§8.10b), entering deliberation as a lookup
  result, not a word;
- *this winter* → `seasonHere` if it is winter here; otherwise the
  nearest winter arc *for this hemisphere*;
- *this late in the year* → day-of-year position relative to the
  hemisphere's turning points (§6.5) — late toward the solstice that is
  actually approaching here.

**Hypotheticals shift a copy, never the original.** “And tomorrow night?”
computes with `instant + 1 day` in a derived copy of the Situation. “What
if I were in Sydney?” builds a **shadow Situation** from the KB place's
associations (§3.6 — coordinates, hemisphere, climate) and computes
against that. Derived and shadow values are marked hypothetical in the
ThoughtTrace (the consuming step records the situation source — `shadow`
plus the place it came from), and the session's real Situation is
untouched: the next plain turn still resolves against it. SA-SHADOW
(§8.14) asserts exactly this.

### 8.14 Evaluation additions (situated awareness)

These extend §7.9 and §8.8; which parts are slice 2b's done-when and
which land with 2f is marked in §12:

- **SA-DECEMBER.** One instant, two situations — Chicago (41.878, −87.630)
  and Sydney (−33.869, 151.209): `seasonHere` and the predominant phase are
  opposite (winter/Water vs summer/Fire), and debug mode shows both
  derivations with their (date, hemisphere) inputs. The December rule as a
  regression test.
- **SA-TONIGHT.** With a known latitude and date, “will tonight be long?”
  is answered from the computed night proportion's band — plain mode, zero
  framework terms (§9.5 scan). \*The computed-proportion path lands with
  slice 2f (§12); in 2b this case passes in its canonical-fallback form.\*
- **SA-UNKNOWN-PLACE.** No location configured: no place name appears
  anywhere in the answer (scan-checked, §9.5), and the turn ends in
  clarification or a stated-assumption answer per §8.12.
- **SA-SMALL-HOURS.** Instant 03:00 local: the trace's time-of-day reading
  is `night`, its activity-aspect band is Yin-predominant (§8.10c), and a
  question about the hour or about rest is answered consistently with the
  night side of the day cycle.
- **SA-SHADOW.** “What if I were in Sydney — would it be winter there?”,
  asked with a northern configured place: the answer computes against a
  shadow Situation (→ no; the season is inverted), the trace marks the
  situation values hypothetical, and a following “and here?” resolves
  against the unchanged real Situation — asserted by comparing the real
  Situation's derived values before and after the turn.

---

## 9. The translation layer: from conclusions to sentences

§7 routes a turn and §8 deliberates it, but neither produces a sentence.
Until now, sentences have come from hard-coded template strings inside
`src/reason.ts` — one per intent branch, with the debug narration baked into
the same strings (“Yes — ${subject} is ${quality} in this system, and that
is derived, not stored: … Path: ${path.text}.”). That coupling is why the
current chat sounds like a system reporting on itself: the component that
decides *what is true* also decides *how to say it*, in one voice, for every
audience. §7.1 stated the surface principle and named the component that
owns wording — the **renderer**. This section designs that component as a
pipeline stage in its own right: the **translation layer**.

### 9.1 Position and contract

The turn pipeline is now four stages, each with one job:

```text
router (§7)  →  thought (§8)  →  translation (§9)  →  surface
decides what    deliberates in    turns conclusions     the user
is asked        structured facts  into sentences        reads it
```

**Hard rule: the reasoner produces no prose.** For router-fed turns the
reasoner returns structured results only — conclusions, the paths behind
them (for debug), and caveats. Every user-visible sentence is produced by
the translation layer. Slice 2b dismantles the legacy templates in
`src/reason.ts` accordingly: their factual content becomes conclusions
emitted by the traversals, their wording becomes renderer templates
(rewritten per surface mode), and the one-shot `answer()` wrapper renders
through the renderer's `debug` mode rather than through private strings.

Renderer inputs — nothing else reaches it:

- the ThoughtTrace's `conclusions` and `checks` (§8.5), including the
  confidence floor's hedge instructions and any leakage flags;
- the `RouteDecision` (§7.8): its kind is the turn's **speech act**, and a
  clarify/decline decision carries its stored content (branches,
  alternatives) for the renderer to realise — the decision's draft phrasing,
  where the §7.8 sketch carries one, is input to the renderer, never final
  text;
- the surface mode (§7.1), carried on the decision;
- `SessionState` (§7.6), read-only, for antecedents (§9.2).

Renderer output is a `RenderedAnswer` (§9.6): the text, the mode it was
rendered in, the conclusions the planner dropped, and the violations stage 3
found and repaired. Rendering is a pure function of these inputs, so the
same trace can be re-rendered in another mode without re-running the
reasoner — the mechanism behind episodic replay (§8.4) and the paired
plain/debug surface scan (RPS-SURFACE). And per §8.7, \*\*the renderer writes
nothing\*\*: no memory layer, no graph, no log. Violations it reports travel
back in the `RenderedAnswer`; the router appends any experience event
(§9.5).

### 9.2 Stage 1 — content planning

Planning turns the trace's conclusions into a `RenderPlan` (§9.6): what
will be said, in what order, and *how* each piece may be rendered.

**Selection.** Every conclusion is classified:

- **load-bearing** — the conclusion the answer exists to state: the join
  result, the correspondence value, the antonym. Always selected, unless
  the confidence floor (§8.2) already downgraded the turn.
- **supporting** — facts that justify or colour the load-bearing one: an
  anchor's summary, the second profile in a comparison. Selected subject to
  mode and length.
- **dropped** — everything else. Dropped conclusions are listed in the
  plan and in `RenderedAnswer.droppedConclusions`: dropping is a reported
  decision, never a silent disappearance, so a debug run can always answer
  “the system derived X but didn't say it — why?”

**Ordering.** Answer first, support after. In a comparison, the synthesis
conclusion (the contrast) is load-bearing and the two profiles are its
support. In a why-answer, the shared-prior conclusion leads and the climb
that reached it follows only in `framework`/`debug` modes; in `plain` mode
the climb is support that usually goes unsaid.

**Surface-mode filtering.** The plan records, per selected conclusion, a
rendering instruction (`direct` | `manifestation` | `correspondence`,
§9.6):

- `plain` — a conclusion whose subject or object is a prior (an element, a
  polarity, a trigram) or another framework term **may not name it**. It
  renders via **manifestations** (§9.3), or through its plain downstream
  correspondences — the kidneys, winter, rain: ordinary dictionary words —
  or it is dropped. Conclusions about ordinary concepts render directly.
- `framework` — priors and correspondences may be named; rendering is
  direct, with manifestations available as colour.
- `debug` — **planning is bypassed**: no selection, no filtering. The
  output serialises conclusions, paths and trace (the §7.1 debug
  presentation). Stage 3 still runs, but only to report, never to block:
  debug is allowed to contain everything plain mode forbids.

**Speech-act forms.** The decision kind sets the plan's shape:

- **answer** (a route decision): as above.
- **clarify**: the plan is built from the decision's stored branches
  (§7.5) — a question stem plus one entry per branch. No conclusions are
  rendered (there are none yet), and branch *routes* are never rendered,
  only their labels and details.
- **decline**: the plan states the honest limit in mode-appropriate terms
  and offers the decision's alternatives (§7.8). Nothing about the missing
  knowledge may be embellished, exemplified or guessed at.
- **hedge** is not a separate act but a plan modifier: the confidence-floor
  check (§8.2) marks specific conclusions as hedged, and §9.4's lexicon —
  not the template author's taste — fixes their wording strength.

**Antecedent planning.** An output sentence may use a pronoun or an
elliptical reference only when its antecedent is (a) a term resolved this
turn, or (b) present in the session's `recentTerms` or topic frame (§7.6);
the plan records which antecedent each pronoun binds to (`antecedents`,
§9.6). A pronoun without a planned antecedent is a planning error: re-plan
with the full noun phrase. This is the output-side mirror of §7.4 D4's
input-side ellipsis resolution — the renderer may only *use* references the
conversation has actually established.

### 9.3 Manifestations: how priors show up in ordinary speech

Plain mode forbids naming the priors, yet many conclusions are *about*
priors. The renderer therefore needs sanctioned everyday language for them.
Without it, template authors — or a later LLM — will invent colour on the
spot, which is exactly the invention §7.1 forbids. The sanctioned language
lives in the data, not in the renderer:

**`DictionaryEntry`&#32;gains a&#32;`manifestations`&#32;field**: curated sets of
everyday-language phrases describing how a concept characteristically
**shows up** in ordinary speech, optionally scoped by aspect. The priors
need them above all — Yin, Yang, the five elements, the trigrams — but any
dictionary concept may carry them.

```ts
// graph.ts — DictionaryEntry nodes gain one field:
export interface ManifestationSet {
  aspect?: string;      // "weather" | "mood" | "body" | … — the edge-aspect vocabulary
  phrases: string[];    // canonical everyday wording, dictionary-reviewed
}
// GraphNode (type "DictionaryEntry"):  manifestations?: ManifestationSet[]
```

For Yin, the weather/mood set reads along the lines of: \*cold, dark, heavy,
still, drawing inward\*. For Water in a weather aspect: \*rain, rivers,
flowing down, gathering\*. The phrases are deliberately plain words — they
are what the framework's root looks like when it surfaces as ordinary
experience.

Rules:

- Manifestations live in the **dictionary layer** — canonical, versioned,
  drift-proof, exactly like definitions. The dictionary exists to stop
  wording drift; manifestation wording is wording. Changing how Yin sounds
  in plain speech is a dictionary edit and is reviewed like one.
- An LLM may **propose** manifestation additions (in the trainer chat,
  §10), but only the trainer loop applies them (§8.7: the trainer loop is
  semantic memory's only writer). An unapplied proposal changes nothing the
  renderer is allowed to say.
- Plain-mode rendering of a prior-level conclusion may use **only**: (a)
  the concept's manifestations; (b) the conclusion's own plain-word
  concepts (winter, the kidneys, rain); (c) licensed filler (§9.5). It may
  never use the framework name itself, a synonym of it, or a calque of it —
  “the water phase” is still naming Water.

**Worked example.** One conclusion set, three surfaces. The load-bearing
conclusion (from a climb + join over a stretch of wet weather):

```text
{ subject: precipitation, relation: polarity-leaning, object: Yin,
  confidence: 0.85, aspect: weather }
```

with a supporting conclusion that the weather in question is precipitation:

- **plain** (rendering: `manifestation`, hedge band `soften`): “Three days
  of rain and grey like this tends to weigh people down — everything feels
  heavier and slower, and getting outside between showers usually helps
  more than people expect.” Built from Yin's weather/mood manifestations
  and the plain concept *rain*; the prior is never named, and confidence
  0.85 lands as *tends to* (§9.4).
- **framework** (rendering: `direct`): “Precipitation leans Yin — cold,
  dark, heavy and still — which is why a long wet stretch drags mood and
  energy down.”
- **debug**: the conclusion, its confidence, and the path that produced
  it, serialised.

The three modes must agree on **content** — the same conclusion ids covered
— while differing completely in vocabulary. That agreement is what
RD-MODE-TRIO (§9.7) asserts.

### 9.4 Stage 2 — realisation

**The template renderer (slice 2b).** Templates are keyed by speech act and
conclusion shape, with several phrasings per key so repeated answers do not
sound mechanically identical; selection among phrasings is deterministic
(derived from the trace, e.g. a hash of turn + conclusion ids) so tests are
reproducible. Its grammar machinery is minimal but strict:

- **Forms come from the index, never guessed.** Pluralisation, subject–verb
  agreement and possessives use the importer's forms index (§7.3) — the
  same closed data the router resolves *kidneys* with. When a needed form
  is absent from the index, the template falls back to the lemma form
  rather than guessing a stem: the output-side twin of the router's
  no-guessing rule.
- **Relation phrasing.** Each relation has per-mode verb phrases: a
  correspondence renders in `framework` mode as “corresponds to”, in
  `plain` mode through the concrete value itself (“For the body, Water
  goes with the kidneys” — itself framework-named only because that
  example's mode allows it; in plain mode the same conclusion surfaces via
  manifestations or is dropped, per the plan).
- **List joining.** Correspondence profiles and other multi-value
  conclusions join as natural lists (“the kidneys and the bladder”), with a
  final “and”, grouped by category when the plan selects several groups
  (§7.7) rather than flattened into one run.
- **Sentence combining.** A load-bearing conclusion and its support combine
  into one or two sentences: claim, then support. In `framework` mode the
  support may appear as a because-clause naming the path's middle nodes; in
  `plain` mode the support usually surfaces instead as its observable
  consequence — which is the manifestations mechanism (§9.3) doing the
  work again.

**The hedge lexicon.** Wording strength is a function of the conclusion's
confidence, fixed by this table — never by a template author's feel for the
sentence:

| Confidence | Band | Wording |
| --- | --- | --- |
| ≥ 0.90 | `assert` | stated plainly (“Winter is the cold season.”) |
| 0.70–0.90 | `soften` | “tends to”, “usually”, “generally” |
| 0.50–0.70 | `hedge` | “may”, “can”, “in some cases” |
| < 0.50 | — | **not asserted**: the planner drops the conclusion, or its weakness downgrades the turn to clarify/decline (§8.2) |

Conclusions derived from atomic-layer edges carry no confidence (absolute,
per the graph spec) and are treated as `assert` band. A hedged conclusion
keeps its band in the plan (§9.6), so debug output can show *why* a sentence
says “tends to”.

**Clarifications and declines** are realised from the decision's stored
content (§7.8): a clarification renders its branch labels/details as a
natural question with selectable options; a decline renders the honest
limit plus the alternatives as offers. Both obey the surface mode —
including the licensed exception that a clarification may use framework
terms **the user themselves used** in the question being clarified (the
Fire case, §7.5, is unaskable otherwise).

**The LLM renderer (later — slice 3 at the earliest; NOT in slice 2b).**
When it arrives, it is a drop-in behind the same contract, bound by the
same rules:

- **Input contract:** the `RenderPlan` (conclusions, rendering
  instructions, hedge bands), the manifestations for any prior-level
  conclusion in it, the surface mode, and a register note (plain /
  framework). It does **not** receive the raw graph, the ThoughtTrace
  steps, or the user's raw question text beyond what the plan passes
  (resolved terms, planned antecedents).
- It chooses no facts, senses, routes or confidences (§7.1); a word form it
  was not given is a gap to report, not a licence to guess.
- Its output passes the **same stage-3 verification** (§9.5). Any failure
  follows the same failure policy, ending at the template fallback.

Slice 2b ships the template renderer only. §§9.2, 9.3, 9.5 and 9.6 are
renderer-agnostic, so the LLM renderer changes nothing upstream of stage 2.

### 9.5 Stage 3 — verification

Realisation is followed by two scans over the finished text (in `debug`
mode they report but do not block).

**(a) Leakage scan** — per-mode forbidden content. In **`plain`** mode:

- framework terms: *yin*, *yang*, *Wuxing*, “the five elements” as a
  framework phrase, trigram names — and element names \*\*used as framework
  terms\*\*. The scan is plan-aware first (a sentence realising a prior-level
  conclusion with `rendering: "direct"` is already a violation) and
  term-list second, because “water” the liquid is a plain word and only
  “Water” the element is leakage;
- machinery: edge-type names (`HAS_QUALITY`, `CORRESPONDS_TO`, …), synset
  ids, confidence numerals, step ids and decision codes (`D5`, `RPS-03`);
- system narration: “in this system”, “in this framework”, “derived, not
  stored”, “the graph …”, “is mapped to” — the legacy templates' voice
  (§9.1) is the canonical list of what plain mode must never sound like.

In **`framework`** mode only machinery is forbidden — synset ids, edge-type
names, confidence numerals, decision codes — unless the user asked for the
machinery itself, in which case `debug` is the right mode and routing
should have chosen it. Licensed exceptions in both modes: framework terms
the user used in this turn's question (§9.4), and the user's own words
quoted back in a correction echo.

**(b) Faithfulness scan** — every content-bearing token or entity in the
output must trace to exactly one of:

- a selected conclusion — its subject/object vocabulary, relation phrasing
  (§9.4) or dictionary forms;
- the user's question — terms echoed back;
- a manifestation phrase the plan used;
- the **licensed filler list** — function words, the hedge lexicon (§9.4),
  and speech-act formulae (“Do you mean …?”, “I don't know much about that
  yet, but …”).

Numbers are checked strictly: a numeral or quantity in the output must
equal a number present in a conclusion (a count of correspondence values,
a branch count, a step count in debug). No other numbers may appear. An
untraceable entity or claim is a violation however plausible it sounds:
**plausibility is not provenance.**

**Failure policy.**

1. **Re-render once**, with the violations listed. Template mode drops or
   repairs the offending sentences; if a load-bearing conclusion has to be
   dropped, the answer degrades to the partial/decline form (§8.3) —
   visibly honest, never padded out. LLM mode regenerates under the same
   plan with the violations named.
2. If the re-render still violates, ship the **minimal template fallback**:
   an answer built only from load-bearing conclusions, realised by the most
   conservative templates.
3. **Shipping a violating answer is forbidden.** There is no path by which
   a known violation reaches the user. Every verification failure —
   including ones the fallback rescued — is reported in the
   `RenderedAnswer` and appended by the router as a `renderer-gap`
   experience event (§8.6) at turn end, so stage-3 failures become
   trainer-visible data with a count, not silent shame.

### 9.6 Translation types

```ts
import type { InterimConclusion } from "./thought";   // §8.5
import type { SurfaceMode } from "./router";          // §7.8

export type SpeechAct = "answer" | "clarify" | "decline";

export type HedgeBand = "assert" | "soften" | "hedge";  // §9.4; < 0.50 never planned

export interface PlannedConclusion {
  conclusion: InterimConclusion;
  role: "load-bearing" | "supporting";
  rendering: "direct" | "manifestation" | "correspondence";
  hedgeBand: HedgeBand;
}

export interface RenderPlan {
  mode: SurfaceMode;
  speechAct: SpeechAct;
  selected: PlannedConclusion[];
  dropped: InterimConclusion[];          // reported, never silent (§9.2)
  antecedents: Record<string, string>;   // pronoun → term/conclusion id it binds to
}

export interface RenderViolation {
  stage: "leakage" | "faithfulness";
  sentence: string;
  detail: string;                        // the forbidden term / untraceable claim
  resolution: "repaired" | "dropped" | "fallback";
}

export interface RenderedAnswer {
  text: string;
  mode: SurfaceMode;
  droppedConclusions: InterimConclusion[];
  violations: RenderViolation[];         // [] when stage 3 was clean
}
```

The `DictionaryEntry` manifestations extension is sketched in §9.3.

### 9.7 Evaluation additions (translation layer)

These extend §§7.9 and 8.8 and are part of slice 2b's done-when (§12):

- **RD-MODE-TRIO.** One fixed conclusion set (the §9.3 precipitation/Yin
  example plus its support) rendered in all three modes: `plain` passes
  both stage-3 scans with the content preserved via manifestations and no
  prior named; `framework` names Yin; `debug` serialises conclusions and
  paths. Content equivalence is asserted on the conclusion ids covered,
  not on wording.
- **RD-HEDGE-BANDS.** Four fixtures — one conclusion each at confidence
  0.95 / 0.80 / 0.60 / 0.40 — render respectively as: asserted plainly /
  softened (“tends to”) / explicitly hedged (“may”) / absent from the text
  and present in `droppedConclusions`.
- **RD-FAITHFULNESS-TRAP.** A stub renderer (a fixture template variant or
  a stub LLM) emits an answer containing an entity present in no
  conclusion, the question, any manifestation or the filler list: the
  faithfulness scan flags it, the fallback ships, and the shipped text does
  not contain the entity.
- **RD-FIRE-PLAIN.** The Fire clarification (§7.5) rendered in `plain`
  mode from its stored branches: a natural question with the three options,
  no framework lecture beyond the terms the user used, and no branch routes
  exposed.
- **RD-DECLINE-NATURAL.** The D10 decline (the banana, RPS-05) rendered in
  `plain` mode: the limit stated naturally, the definition offered as an
  alternative, no machinery terms and no system narration.
- **RD-GAP-EVENT.** A forced stage-3 violation (a fixture template
  emitting a forbidden term) results in: the fallback shipped, exactly one
  `renderer-gap` experience event appended with the scan stage and detail,
  and no violating text in the user-visible output.

---

## 10. Chat module: borrowed selectively from ALE, as a reference system

The app will include an AI chat module so an LLM agent can work \*\*from inside the
app\*\*: run tests against the classical model, find where it fails, and improve it.
This is the user's original "LLM is trainer" loop, given a home.

The reference implementation is **ALE (ai-live-web-editor)** — a working system
the user knows. Per the user's explicit instruction, ALE is a \*\*reference, not a
port\*\*: we take the shapes that fit and leave the rest.

### 10.1 What to take from ALE

- **The streaming turn-loop shape.** Server runs a turn as: user message → streamed
  text deltas + discrete **tool steps** (name, args summary, result) → a terminal
  **done event** carrying usage. AnSci's server (Express, per the technology plan)
  implements the same event shape over SSE, so the UI pattern below works unchanged
  in spirit.
- **The tool-registry pattern.** ALE registers agent tools as one file per tool
  family, each a typed `execute()` the loop dispatches by name. AnSci copies this
  pattern: one file per graph-tool family under `src/chat/tools/`, Zod-validated
  arguments (the technology plan already specifies Zod), no framework magic.
- **The BYOK connection pattern.** The model comes from a user-supplied,
  OpenAI-compatible provider connection; **the API key lives server-side only**
  (in `.env`, as in ALE's connections store), is never sent to the browser, never
  logged, and never written into the graph. Any OpenAI-compatible endpoint works,
  including a local one.
- **The chat UI's turn/step presentation.** A turn renders as the assistant's text
  with its tool steps visible as inspectable activity (what was queried, what was
  changed) — for AnSci this is not decoration: the tool steps *are* the training
  audit trail's human-readable form.

### 10.2 What NOT to take

- **The Mastra stack** (agent framework, memory, storage). AnSci's loop is small
  and its state is the graph; a direct fetch-based tool loop keeps dependencies
  minimal, as the technology plan already decided ("No LangChain required").
- **File-editing tools.** ALE's agent edits project files; AnSci's agent edits a
  *knowledge graph* through the tools in §10.3. No raw file access.
- **The live-page / verify gate.** ALE verifies rendered web pages; AnSci's
  equivalent verification is the evaluation suite (§10.5), not a browser gate.
- **The planning system, workbench, and editor surfaces.** Out of scope entirely;
  AnSci's dashboard (later slice) is a graph surface, not a code editor.

### 10.3 AnSci's chat tools (the graph toolset)

| Tool | Effect |
| --- | --- |
| `graph-query` | Run the symbolic reasoner (`reason.answer()`) on a question; returns answer text **and the paths used**. Read-only. |
| `graph-inspect` | Show a node's edges (in/out), confidences, aspects, mapping status, and provenance/source records. Read-only. |
| `graph-propose-mapping` | Create an overlay record with status `proposed` (mapping, reweight, deprecation, new concept). Changes nothing the reasoner serves until applied. |
| `graph-apply` | Apply a proposed overlay record: the change takes effect in the merged view **and** a `GraphAdjustment` audit node is written (spec fields: adjustmentType, target, old/new value, reason, evaluationQuestion, expected vs actual answer, confidence before/after). |
| `net-import-concept` | Fetch one concept's edges via the ConceptNet adapter (§4, through `CONCEPTNET_BASE_URL`) or a frame via the FrameNet adapter, and merge as base data. Returns what was added/merged/skipped. |
| `test-run` | Run the evaluation suite (§10.5) against the current merged view; returns per-question pass/fail with the actual path taken. Read-only. |
| `test-add` | Append a question to the evaluation suite (with expected answer/path fragments), so a failure the trainer just fixed becomes a permanent regression test. |

Write tools (`graph-apply`, `test-add`) operate **only** on the overlay and the
test suite — the chat agent has no tool that can touch base net data or the
atomic layer (§§3, 6.3).

### 10.4 The trainer-loop protocol

The chat agent's system prompt encodes the loop from the user's architecture
plan (evaluate → adjust → re-evaluate), as a protocol, not a suggestion:

1. **Run tests** (`test-run`). If all pass, report and stop — do not "improve"
   unprompted.
2. **On failure, inspect before changing**: `graph-query` the failing question,
   read the path the reasoner actually took, `graph-inspect` the nodes on it.
   Name the responsible edge (or missing edge) explicitly.
3. **Propose** the smallest fix (`graph-propose-mapping`): relink, confidence
   change, new mapping, or deprecation — with a reason citing the expected vs
   actual answer.
4. **Apply** (`graph-apply`) — this writes the `GraphAdjustment` audit node.
5. **Re-run tests** (`test-run`). The fix is only claimed with a passing re-run;
   if other questions regressed, say so and iterate or revert (the adjustment's
   status becomes `reverted`, the overlay record stays for audit).
6. **Lock it in**: `test-add` any newly discovered failure mode as a permanent
   evaluation question.

The document reader (§11) is a second trainer workflow over this same
protocol: it reads a registered text instead of a failing question, but
its proposals enter by the identical propose→apply door and write the
identical audit nodes. There is no ingestion-only write path.

### 10.5 Evaluation suite format

A JSON file (`tests/eval/questions.json` — outside the unit-test folder because
the chat agent, not just `npm test`, consumes it). Each entry:

```json
{
  "id": "eval-winter-cold-001",
  "question": "why is winter cold?",
  "expectedAnswerContains": ["Water", "Yin", "cold"],
  "expectedPathFragments": ["winter —ELEMENT_OF→ Water", "Yin —HAS_QUALITY→ cold"],
  "forbiddenInAnswer": [],
  "includeOntology": true,
  "confidenceThreshold": 0.7
}
```

Checks are deliberately mechanical, reusing what `reason.answer()` already
returns: answer text contains the expected terms, the returned path text contains
the expected fragments, and — for definition questions — `forbiddenInAnswer`
enforces controlled ontology leakage (the same rule the unit tests already check
with `guardNoLeakage`). Slice 1's existing unit-test cases seed the first suite
entries.

---

## 11. Document ingestion: the AI reader

The nets (§§4–5) and the knowledge base (§3.6) are not the only way
knowledge enters. The user's architecture plan and ontology spec both
describe the graph *growing by reading*: an LLM reads a text, extracts
what it says, and the graph absorbs it — with every absorbed fact linked
back to the exact passage it came from. The spec's Source layer exists
for this, and its worked `TextPassage` example is already a Neijing
passage (`neijing-suwen-ch1-p3`). This section designs that mechanism.

An AI **reader** — an LLM in the trainer role of §10, given a document
instead of a failing question — works through a registered text section
by section, paragraph by paragraph, and **proposes** associations in
graph form, each pinned to the passage it was read from. Proposals enter
the graph by exactly one door, the propose→test→apply loop of §10.4.
The first document is the **Huangdi Neijing** (黃帝內經), read \*\*from
the Chinese\*\* — the text slice 1's hand-seeded correspondence tables
classically derive from, which makes it both the natural first source
and a real test of the mechanism: the pilot (§11.7) can compare what
the text says against what we seeded by hand.

### 11.1 The pipeline

| Stage | Input | Output | Who / what acts | Gate |
| --- | --- | --- | --- | --- |
| **Acquire** | A source text (web export, file) | A registered, version-pinned `Document` (§11.2); the raw text stored under `data/` | Human, with a fetch script | Source availability and terms verified at build time; licence and version recorded in the registry entry before anything is read |
| **Segment** | The pinned text | `DocumentSection` / `DocumentParagraph` records with stable ids; one `TextPassage` source node per paragraph | A deterministic segmenter (script, not an LLM) | Paragraph ids unique and stable; paragraph text stored verbatim — segmentation never silently edits, translates or re-punctuates (any editorial normalisation is recorded on the record) |
| **Read** | One paragraph, plus its section context and the dictionary (§11.4) | `Extraction` records (§11.3) — or an explicit read-with-no-proposal record | The reader (LLM, trainer role) | Every extraction carries a paragraph ref and a quote; coverage is auditable — no paragraph is silently skipped |
| **Propose** | Extraction records | Overlay records, status `proposed` (§3.1b), including glossary proposals (§11.4) | The ingestion driver — mechanical conversion, no second interpretation pass | The spec's checks: dictionary authority, atomic-link validation, deduplication comparison (§11.3) |
| **Review / test** | One section's proposed batch | Accepted / flagged split; the section's variant report (§11.5); spot-check results | A reviewer other than the reader (human, or an independent second-reader pass), plus the evaluation gates | §11.6's quality gates |
| **Apply** | Accepted proposals | Merged-view associations, each `SOURCED_FROM` its `TextPassage`; `GraphAdjustment` audit nodes | §10's `graph-apply` door — the same tool, the same audit | **No citation, no insertion**, and quote-span verification — both mechanical (§11.3) |

Two properties of the pipeline as a whole:

- **The reader is a trainer, not an importer.** The nets' importers
  (§§4–5) convert published datasets mechanically; the reader
  *interprets*, and interpretation is exactly what the
  propose/review/apply discipline exists for. Nothing in the Read or
  Propose stages writes the live graph.
- **Batches are identified and re-runnable.** Reading happens in
  **batches** — one reader configuration over one pinned document
  version, typically one section at a time — and each batch records who
  read:

```ts
interface ExtractionBatch {
  id: string;
  documentId: string;
  documentVersion: string;        // the pinned version read (§11.2)
  sectionId?: string;
  reader: { provider: string; model: string };  // the BYOK connection's model (§10.1)
  parameters: Record<string, unknown>;          // temperature etc., as run
  promptVersion: string;           // the reader prompt is versioned like code
  startedAt: string;               // ISO timestamp
}
```

Re-running the same document version under a different reader or prompt
produces a *new* batch whose extractions can be diffed against the old:
reader quality is measurable across models and over time, and a bad
batch can be rejected wholesale without touching what earlier batches
applied.

### 11.2 Document registry and citation addresses

Documents live in the **source layer**, as registry records:

```ts
interface Document {
  id: string;            // "huangdi-neijing"
  title: string;         // "Huangdi Neijing 黃帝內經 (Yellow Emperor's Inner Classic)"
  language: string;      // "zh" — classical Chinese
  source: string;        // where this copy came from: "Chinese Text Project" | "zh Wikisource" | …
  sourceUrl?: string;
  version: string;       // pinned edition / acquisition, e.g. "ctext-acquired-2026-11"
  acquiredAt: string;    // ISO date
  license: string;       // see below
}

interface DocumentSection {
  id: string;            // "neijing-suwen-ch5"
  documentId: string;
  title: string;         // "Suwen ch. 5 — 陰陽應象大論"
  order: number;
}

interface DocumentParagraph {
  id: string;            // "neijing-suwen-ch5-p12" — the citation address
  sectionId: string;
  order: number;
  rawText: string;       // verbatim, as pinned
}
```

- **Paragraph records are the spec's&#32;`TextPassage`&#32;nodes.** The spec's
  Source layer already defines `TextPassage` (`sourceTitle`, `chapter`,
  `page`, `rawText`, `language`), and its worked example id is
  `neijing-suwen-ch1-p3`; the registry adopts that id style unchanged. A
  paragraph record *is* a TextPassage in the graph (source layer), so
  `SOURCED_FROM` links applied associations to it directly.
- **A citation is (document, section, paragraph, quote span)** — in
  practice the versioned paragraph id plus the quote (§11.3).
  Paragraph ids are **permanent addresses**: once any extraction cites
  an id, that id and its text are never edited or reused. Corrections
  to a text arrive as a new version, not as edits.
- **Version pinning works like the bases (§3.1a).** The registry entry
  pins the exact copy read. Re-acquiring the text — a different
  edition, a corrected transcription — creates a \*\*new document
  version\*\* with its own paragraph records (version-qualified where
  ids would collide), and existing citations keep resolving against
  the version they were made against. Texts are small next to the nets
  (§2), so keeping superseded versions is cheap; silently re-pointing
  a citation at different words would be a provenance forgery.
- **The first document: Huangdi Neijing (黃帝內經)** — the *Suwen*
  (素問) and *Lingshu* (靈樞), read **from the Chinese text**. The
  work itself is ancient and **public domain**. Candidate acquisitions
  are the **Chinese Text Project** (ctext.org) and **zh Wikisource**.
  Standing rule, learned from the ConceptNet experience (§4): each
  source's availability and terms — including any terms attaching to
  its digital transcription or editorial apparatus, as distinct from
  the ancient work — are **verified at build time**, and what was
  verified is recorded in the registry entry (`source`, `version`,
  `license`). The acquired raw text and its provenance are stored
  locally under `data/` (gitignored raw, like `data/raw/`), with a
  **small checked-in fixture** — a few paragraphs of the pilot
  chapters — so tests exercise segmentation, citation resolution and
  quote verification offline.

### 11.3 Extraction records

One paragraph yields zero or more extractions:

```ts
interface Extraction {
  id: string;
  batch: string;                  // ExtractionBatch id (§11.1)
  paragraphRef: string;           // DocumentParagraph id — the citation address
  quote: string;                  // the exact Chinese span relied on
  workingTranslation: string;     // the reader's English rendering of the span (§11.4)
  readingNotes: string;           // how the span was parsed; alternatives considered
  proposed: ProposedAssociation[];
  readerConfidence: number;       // the spec's bands, below
  ambiguity?: string;             // set when the span supports more than one reading (§11.4)
}

interface ProposedAssociation {
  subject: string;                // a concept name/id, or a Chinese term key (§11.4)
  relation: EdgeType;             // HAS_POLARITY | HAS_ELEMENT | ASSOCIATED_WITH | CORRESPONDS_TO | …
  object: string;
  aspect?: string;                // where the classification is aspect-scoped (§6.6)
  confidence: number;             // per association; the extraction's readerConfidence is the ceiling
}
```

Rules:

- \*\*Proposals are overlay records, status `proposed`, and nothing
  more.\*\* Converting an extraction yields overlay records (§3.1b) whose
  provenance `origin` is `"text-ingestion"` — the value §3.1b's enum
  already reserves for this. The reader never writes the live graph;
  the **only door in is §10's propose→test→apply**, writing
  `GraphAdjustment` audit nodes like every other change.
- **HARD RULE: no citation, no insertion.** The apply step
  mechanically rejects any proposal whose citation does not resolve to
  a pinned paragraph. This is not a guideline for reviewers; it is a
  check in the apply path, and DI-NO-CITE (§11.8) tests it.
- **Quote spans are verbatim, and that is mechanically checkable.**
  `quote` must be a substring of the pinned paragraph's `rawText`,
  character for character. Apply verifies this and rejects on
  mismatch. This is the pipeline's main defence against the reader's
  characteristic failure: quoting a passage that does not exist.
- **Confidence follows the spec's ingestion bands** (ontologyGraph.txt,
  ingestion rule 5): explicit statement in the text **0.90–1.0**;
  strong inference with textual support **0.70–0.89**; weak inference
  or analogy **0.50–0.69**; below **0.50** the reader must not propose
  at all, and the propose stage rejects it. Classification claims are
  capped by what the passage actually says: an explicit correspondence
  table is 0.9+; a mapping read *into* a metaphor is inference and
  prices itself accordingly.
- **The spec's propose-stage checks are adopted as gates**
  (ontologyGraph.txt, ingestion rules 1–4): dictionary authority
  (rule 1, §11.4); deduplication comparison (rule 2 — the same
  (from, type, to) already present: keep the higher confidence, and
  surface both in review); atomic-link validation (rule 3 — a
  polarity/element target that is not an existing atomic node rejects
  the proposal outright); source tracking (rule 4 — every applied item
  receives its `SOURCED_FROM` link at apply). Where the spec's
  conflict rule says "keep the higher confidence", this design's §6.4
  refinement governs: both assertions are retained and flagged rather
  than the lower one silently dropped — a losing assertion here is a
  citable reading of a real passage, not an extraction error. Within
  one source, §11.5's variant mechanics take this further.

### 11.4 Reading from the Chinese

The Neijing is read in Chinese, and that changes the dictionary layer,
not just the input format.

- **The dictionary becomes bilingual.** Classical Chinese terms are
  the reader's primary extraction keys — the text's own words (肝,
  風, 陰陽, 五行…) — so `DictionaryEntry` gains language-qualified
  entries: a Chinese-headed entry carries the term as its `word`, its
  reading (pinyin) and a gloss, in the spec's entry shape with
  `language: "zh"`. A Chinese-headed entry **bridges**: term → the
  concept it names (the concept links to the entry via `DEFINED_AS`,
  the dictionary layer's existing mechanic) → a WordNet synset \*\*where
  a fitting one exists\*\*. Many of the text's terms have no fitting
  synset — 肝 as the Neijing means it is a functional system, not only
  the anatomical organ — and then the bridge honestly ends at the
  concept. Forcing a synset would import the wrong sense: §1.1's
  discipline, applied in the other direction.
- **The glossary grows from the text, not from a textbook.** The
  reader proposes glossary entries through the same door as
  associations: a `DictionaryEntry` with status `proposed` (spec
  rule 1), carrying the term, its reading, a gloss, and its passage
  evidence — the extraction's citation. Review promotes `proposed` →
  `approved`, and only approved entries bind later readers (dictionary
  authority). Importing a modern TCM glossary wholesale was considered
  and rejected: it would freeze modern settled readings into the
  authority layer and hide how the text itself uses its terms — the
  drift the dictionary exists to prevent, arriving pre-installed.
- **Working translations are reader artifacts.** Each extraction's
  `workingTranslation` is the reader's rendering *for reviewers*,
  attached to the extraction record. It is revisable — a later batch
  may translate the same span better — without touching any applied
  knowledge. The canonical artifacts are the pinned Chinese passage
  and the applied association with its citation. If a translation is
  later judged wrong, the remedy is re-reading that paragraph in a
  new batch and adjusting through the door, never editing an applied
  association in place (§3's discipline, unchanged).
- **Classical Chinese, honestly.** The text is terse — subjects and
  objects are routinely implicit — polysemous, and carries two
  millennia of commentary, so some spans have genuinely contested
  readings. The mechanism's answer is recording, not resolving: a
  contested span sets the extraction's `ambiguity`, may yield rival
  proposed associations each carrying that note, and reaches review
  *as* a contest. A reader that silently picks one reading has
  destroyed information the graph was built to keep.

### 11.5 Variants within a source

**Motivating fact: the Neijing does not agree with itself.** Its
five-phase correspondence schemes are stated in several chapters and
do not match in every slot — the tables of Suwen ch. 4 and ch. 5, the
pilot chapters (§11.7), differ in individual assignments. A naive
ingestion flattens this into self-contradiction and then "resolves"
it by whichever passage happened to be read last. This design treats
the disagreement as data:

- \*\*Chapter is part of every citation (§11.2), so variants are
  distinguishable by construction.\*\* Each scheme lands as
  source-scoped assertions — associations whose `SOURCED_FROM` points
  at *their* passage — and they **coexist** in the graph. Provenance,
  not preference, is what tells them apart.
- **Collisions surface, mechanically.** Where two passages'
  assertions collide on the same (subject, aspect) slot, §6.4's
  conflict flagging marks the pair `flagged`, and the review stage
  (§11.6) collects the collision into a \*\*per-document variant
  report\*\*: slot, both assertions, both citations, both confidences.
  Nothing is merged, averaged or dropped to produce the report.
- **Ingestion never picks a winner.** Choosing a canonical scheme
  *for a given use* — e.g. which table the correspondence intent
  (§7.7) serves by default — is a later, separate act: a
  dictionary-layer / curated-overlay decision by the trainer loop
  (§10.4), recorded as a `GraphAdjustment` with its reason, reversible
  like every other adjustment. It is not something a reading batch
  may do as a side effect.

### 11.6 Review and quality gates

Review proceeds **per section**: one chapter's proposals are reviewed
as a batch, because that is the unit a reviewer can hold against the
text. Five gates — the first two mechanical and total, the rest
sampled or produced:

1. **Citation completeness — 100%, mechanical.** Every applied
   proposal resolves to a pinned paragraph. This is §11.3's hard rule
   enforced at apply; the gate is that the apply log shows zero
   exceptions — there is no path around it to audit.
2. **Verbatim-quote verification — 100%, mechanical.** Every applied
   extraction's quote is verified as a substring of its pinned
   paragraph at apply (§11.3). A failed verification rejects the
   extraction, not just the item.
3. **Spot-check precision — sampled, target ≥ 90%.** A sample of the
   section's extractions (at least 20, or 10% of the section's
   extractions, whichever is larger) is judged by a reviewer other
   than the reader — a human, or an independent second-reader pass
   under a different model or prompt. Each sampled extraction is
   judged **correct** (association and classification faithful to the
   span), **flagged-ambiguous** (the span is genuinely contestable and
   the extraction said so), or **wrong** (silent error:
   mistranslation, misclassification, invented relation). The gate is
   **≥ 90% correct-or-flagged-ambiguous**. The metric is shaped
   deliberately: it punishes *silent* error and rewards a reader that
   knows when a passage is ambiguous (§11.4).
4. **Variant report — produced per section.** Every §6.4 collision
   among the section's applied assertions (and against earlier
   sections of the same document) appears in the document's variant
   report (§11.5). The gate is that the report exists and is complete
   against the flag log — not that it is empty. An empty variant
   report for the Neijing would be suspicious, not reassuring.
5. **Seed-comparison report — pilot only** (§11.7).

A section that fails a gate is not partially applied by default: its
accepted items may apply, its failures return as a re-read task for a
new batch (§11.1), and the gate results are recorded with the batch,
so reader quality is tracked per section over time.

### 11.7 The Neijing pilot

**Scope: Suwen chapters 4 (金匱真言論) and 5 (陰陽應象大論)** — the
chapters that state the yin-yang and five-phase correspondence
schemes (season, direction, organ, emotion, flavour, colour, sound…)
in tabular prose. They are the pilot for three reasons: slice 1's
hand-seeded correspondence tables (per element: sound, colour, taste,
direction, emotion, organ — `src/seed.ts`) classically derive from
exactly this material, so the text can be checked against knowledge
the system already holds; the two chapters' schemes differ in places,
so §11.5's variant handling is exercised by real data immediately,
not by a fixture invented for it; and the chapters are short enough
that a human can review every extraction, not just a sample.

**What the pilot proves:** pipeline precision against gate 3 with
full human review in place of the sample; citation mechanics
end-to-end (DI-CITE, DI-NO-CITE); variant coexistence on real
intra-text disagreement (DI-VARIANT); and bilingual glossary
mechanics — the chapters' core terms (陰陽, 五行, 肝心脾肺腎,
風寒暑濕燥火…) become Chinese-headed dictionary entries through the
door (DI-GLOSSARY).

**The pilot's real deliverable is the seed-comparison report** (gate
5, §11.6): the correspondence tables extracted from ch. 4–5 set
against the current hand-seeded tables, with \*\*every difference
enumerated\*\* in three classes — in the text but not the seed; in the
seed but not these chapters; and conflicting (same slot, different
value, both cited). The report goes to the user for judgment. Only
after that judgment do text-sourced assertions replace or supplement
seed assertions, and then through the trainer door as ordinary
adjustments — pilot ingestion itself never rewrites the seed.

**Pilot done-when:** both chapters acquired, registered and segmented
with stable paragraph ids; every paragraph read (extracted, or
recorded read-with-no-proposal); gates 1–4 pass under full review;
the seed-comparison report exists and enumerates the differences
(DI-PILOT-REPORT).

**After the pilot:** the rest of the **Suwen**, section by section as
review-batched ingestion runs; then the **Lingshu** — channels,
acupoints, clinical material, denser terminology and correspondingly
more glossary growth. The order is not arbitrary: correspondence and
theory precede clinical detail, because later chapters' extractions
lean on the dictionary the earlier ones built.

**What ingestion gives the system, once running.** (a) The
correspondence tables stop being unsourced hand-seed assertions and
become **citable knowledge** — the same content where the seed was
right, now with a passage behind every row, and corrected where it
wasn't, visibly. (b) The **body/medicine domain at depth**: organs as
functional systems, channels, flavours, climates, the six qi — a
domain the seed sketches in five organ rows becomes the graph's
richest region, because it is the text's home ground. (c) \*\*Textual
statements of the dynamics\*\*: the Neijing states generation and
restraint behaviour in prose, across many chapters and contexts, and
ingestion gives §6's engine canonical material to classify and cite,
beyond the bare cycle edges of the atomic layer. And generally (d):
the acquired layer grows *by reading*, per the user's architecture
plan, with every growth step proposed, gated, cited and reversible.

### 11.8 Evaluation additions (document ingestion)

These are part of slice 2g's done-when (§12):

- **DI-CITE.** An applied association from the pilot: following its
  citation resolves to the pinned paragraph record, and the
  extraction's `quote` is verified as a verbatim substring of that
  paragraph's `rawText`.
- **DI-NO-CITE.** A proposal with its citation removed (or pointing
  at a nonexistent paragraph) is \*\*rejected by the apply step
  mechanically\*\* — not flagged for later, not applied-with-warning:
  rejected, with the rejection recorded in the batch log.
- **DI-VARIANT.** Two pilot chapters asserting differing values for
  the same correspondence slot produce \*\*two coexisting source-scoped
  assertions\*\*, a §6.4 flag on the pair, and exactly one entry in the
  document's variant report naming both citations. No merge, no
  winner, no third synthetic value.
- **DI-GLOSSARY.** A reader glossary proposal (肝 → the *liver (zang)*
  concept, say) applies through the same propose→apply door as any
  association; afterwards the Chinese term resolves through its
  dictionary entry to the concept in lookup (§7.3), and the entry's
  passage evidence is its citation.
- **DI-PILOT-REPORT.** The seed-comparison report for Suwen 4–5
  exists and enumerates differences in the three classes of §11.7
  (text-only, seed-only, conflicting), each conflicting item carrying
  both the seed's provenance and the passage citation.

---

## 12. Build order

| Slice | Contents | Done when |
| --- | --- | --- |
| **2a — BUILT 2026-11-08** | WordNet first (§1.1): Open English WordNet importer → **trimmed synset + relation extract bundled in-repo** (CC BY 4.0, attribution in `NOTICE`): synsets, glosses, hypernym/hyponym, meronym/holonym, antonym, similar-to, derivationally related forms, verb entailment/causes. **Re-key slice 1's seed mappings from strings to synset sense ids**, and stand up a **small ontology-test chat subset**: the reasoner answering over the bundled WordNet graph, so the ontology is exercised end-to-end before the bigger nets arrive. | The bundled extract loads offline; seed mappings resolve to sense ids — *cold* the temperature sense and *cold* the illness sense are distinct synsets, free to map differently (the re-keying test case); the test-chat subset answers its questions from WordNet paths; existing 10 tests still pass. |
| **2b** | **The router (§7)**: term lookup against WordNet + ontology before any traversal; morphology forms index added by the WordNet importer; the decision tree (route / clarify / decline); `SessionState` with resolved senses, topic frame, pending clarifications and corrections; the reasoner accepts a pre-resolved `QueryIntent`; new intent handlers for correspondence, antonym, part-of and relatedness, plus the comparison repair; and the surface layer — router-set `plain` / `framework` / `debug` modes. **The translation layer (§9)**: the three-stage template renderer — content planning (§9.2), realisation with the confidence hedge lexicon (§9.4), and post-realisation leakage + faithfulness verification with fallback (§9.5) — including the dictionary `manifestations` field (§9.3); and, as part of the same work, **dismantling the reasoner's prose**: `src/reason.ts`'s hard-coded answer templates are removed and the reasoner returns conclusions/facts only (§9.1). The LLM renderer (§9.4) is explicitly **not** in 2b — it is slice 3 at the earliest. **Thought and memory (§8)**: the turn pipeline produces a bounded `ThoughtTrace` per turn (decomposition, interim conclusions, the three pre-speech checks, 12-step bound) and `SessionState` gains the last-20-traces ring; the **experience log** — append-only JSONL under `data/experience/` (gitignored) — records corrections, clarification resolutions, gap hits and renderer gaps (aggregation into the trainer's work queue is slice 3, not 2b). **Situated awareness (§§8.9–8.13)**: the turn pipeline computes a `Situation` per turn — host clock and timezone, an optional configured location, season-here and time-of-day phase derived by the §8.10 rules with §6.7's canonical profiles as the light-aspect source, marked `canonical` — and the router consults it from the first build: deictic resolution is lookup step 0 (§7.3) and self-questions answer from it (§8.12). No knowledge base is required for any of this; the computed night-proportion path arrives with the knowledge base in 2f. Slice 2b uses only mappings and edges already loaded — propagation (§6) is deliberately *not* a dependency. | §7.9's criteria in full: the 13-question probe suite passes with the expected decision, resolved terms and answer content for each; the Fire clarification dispatches all three stored branch routes; scripted session cases pass for topic-frame thunder, a user sense correction, an elliptical follow-up, and the plain/debug surface scan; morphology fixtures (kidneys→kidney and friends) resolve; **plus §8.8's TM cases** — the comparison trace has ≥3 steps incl. a synthesis step, a missing-knowledge decline appends exactly one gap-hit event, a correction appends exactly one correction event, “why did you say that?” replays the stored trace without re-running the reasoner, and the 12-step bound yields a partial answer with `boundHit` set; **plus §9.7's RD cases** — the mode-trio rendering of one conclusion set, the hedge-band fixtures, the faithfulness trap caught with fallback shipped, the plain-mode Fire clarification, the natural decline, and the renderer-gap event on a forced violation; **plus §8.14's SA cases in their 2b form** — SA-DECEMBER (opposite predominant phases for the Chicago and Sydney situations, both derivations shown in debug), SA-UNKNOWN-PLACE (no fabricated place; clarification or stated assumption), SA-SMALL-HOURS (03:00 local reads as `night` in the activity aspect) and SA-SHADOW (a hypothetical place computed in a shadow Situation, the real one unchanged) pass, and SA-TONIGHT passes in its canonical-fallback form (its computed-proportion path is slice 2f); the pre-existing 21 tests still pass. |
| **2c** | **Propagation** (§§6.1–6.4, §6.10): mapping status, decay rules, antonym flip, conflict flagging, derivation-path provenance as overlay records; propagated leanings carry (aspect, degree band) and merge under restraint arbitration. **The ontology as engine** (§§6.5–6.9, §6.11): cycle operators (`generates` / `generatedBy` / `restrains` / `restrainedBy`) with concept-level temporal reasoning and restraint arbitration; aspect-scoped classification — same-aspect joins, cross-aspect composition only via correspondence paths; graded polarity (bands + optional proportion), solstice turning points and season degree profiles; balance dynamics over subject profiles vs season baselines (fixture profiles only in 2c); correspondence composition as a first-class operation; the §6.11 seed/schema deltas marked 2c (degree on polarity statements, aspect keys, turning points, season profiles + baselines). | The **snow worked example** (§6.2) passes as a test over the WordNet hypernym path plus fixture association edges: snow derives Water/Yin through precipitation/winter, labelled `propagated`, and "why is snow cold?" answers with that path; **plus §6.12's OE cases** — OE-RESTRAINT (Water via the `restrainedBy` operator, derivation shown), OE-PROPORTION (winter > autumn in the light aspect, from degree bands, solstice cited; mixed-aspect comparison not answered), OE-ASPECT-NONCONFLICT (the bass fixture flags no conflict), OE-EXCESS (Fire manifestations + Water as moderator + Earth downstream; plain-mode rendering passes §9's scans with no medical claim), OE-COMPOSE (yu → winter/kidneys at atomic confidence), OE-SUCCESSOR (Fire leaning, `faint`, below the direct classification, precedence respected). Existing tests still pass. |
| **2d** | FrameNet adapter (§5): frame/FE/LU import, frame relations, LU→Concept bridge; **trimmed structure bundle ships in-repo** (CC BY, attribution in `NOTICE`). Starter frame set chosen for immediate usefulness: **seasons/weather** (e.g. natural phenomena, temperature), **commerce** (`Commerce_buy`/`Commerce_sell` — the canonical worked example), plus whatever frames the starter LUs evoke. | Frames for the starter set are inspectable; "who are the participants when someone buys something?" answers Buyer/Goods/Seller/Money from frame structure. |
| **2e** | ConceptNet last (§4): TSV parser + endpoint client behind `CONCEPTNET_BASE_URL`, with the **user's self-host** as the runtime source (§2.3); relation mapping (§4.2); weight→confidence (§4.3); `SourceRecord` provenance. ConceptNet-derived material lives in its **own overlay partition** (§3.3 licence firewall). **Fixture-tested** — the live API was down (502) when this was designed, so tests run against recorded-shape fixtures, and the endpoint client is verified against the fixture source, not the public API. Imports land as base data (§4.4). | Importing the fixture subset yields the expected graph; `snow` exists with its `IS_A`/`ASSOCIATED_WITH` edges and source records; the ConceptNet-derived overlay partition is separable from the permissive core; unit tests pass. |
| **2f** | **Knowledge base: Wikidata** (§3.6): an association-form adapter in the §§4–5 pattern — items joined to concepts/synsets, the property→association mapping (capital-of, located-in, part-of world-level, grows-in / climate), `SourceRecord` provenance under the derived-vs-retrieved discipline (§3.5), a configurable endpoint in the §2.3 style with a recorded-shape fixture source, and CC0 terms (no attribution machinery, §3.6). Place imports carry their **situation associations** — coordinates as properties, hemisphere and latitude band computed at import by the §8.10 rules, climate where classified (§3.6, §8.11). **Situated awareness, computed path** (§8.10b): the solar night-proportion computation wired into the `Situation`, so derived light-aspect values are `computed` wherever a place — configured, user-stated, or KB-joined — supplies coordinates. | Fixture-tested: importing the fixture subset yields the expected association graph (edges onto existing nodes, none in the source's native schema); a **place end-to-end** passes — Sydney imported with coordinates, hemisphere and climate, and SA-DECEMBER's Sydney side then resolves its situation associations from the KB; provenance kinds are visible in debug mode, and a retrieved fact is never rendered in derivation language (§3.5 rule 1, §9.5); **SA-TONIGHT passes in its computed form** — the night proportion for the fixture place and date matches the fixture's precomputed value and its band drives the answer; existing tests still pass. |
| **2g** | **Document ingestion: the AI reader** (§11): the pipeline — acquire → segment → read → propose → review/test → apply through §10's door (§11.1); a document registry with version-pinned documents and paragraph citation addresses (§11.2); extraction records under the no-citation-no-insertion rule and verbatim-quote verification (§11.3); bilingual dictionary growth — Chinese-headed entries proposed from the text itself (§11.4). **First document: the Huangdi Neijing**, read from the Chinese (public domain; source availability and terms verified at build), raw text under `data/` (gitignored) with a small checked-in fixture. **Pilot: Suwen chapters 4–5.** | The **DI cases** (§11.8) pass — DI-CITE (the citation resolves and the quote is a verbatim substring), DI-NO-CITE (apply mechanically rejects an uncited proposal), DI-VARIANT (differing chapter schemes coexist source-scoped, with one variant-report entry; no merge, no winner), DI-GLOSSARY (a glossary proposal applies through the same door and the term then bridges to its concept) — and the **pilot gates** (§§11.6–11.7) pass for Suwen 4–5: 100% citation completeness and verbatim-quote verification, ≥90% spot-check precision under full review, per-section variant reports produced, and the **seed-comparison report (DI-PILOT-REPORT)** enumerating every difference between the text-extracted and hand-seeded correspondence tables; existing tests still pass. |
| **3** | Chat module (§10): **server loop + graph tools first** (streaming turn loop, BYOK connection, the seven tools, trainer-loop prompt), evaluation suite + `test-run` wired to it, experience-log aggregation into the trainer's work queue (§8.6), **UI last** (turn/step presentation over the same event stream, ThoughtTraces shown as the turn's steps). | From inside the app: ask the trainer to run the suite, watch it fix a deliberately broken mapping via propose→apply→re-run, and find the `GraphAdjustment` node it wrote. |

Explicitly **not** in these slices: VerbNet import (after 2e), hexagram expansion
of the atomic layer, Neo4j (behind the same `Graph` interface when volume
justifies it), the OpenAI-compatible `/v1/chat/completions` serving API and the
Vite dashboard (the technology plan's later steps — the chat module's server is
an internal trainer endpoint, not the public model API).

---

\*Sources inside this repo: the user's plans (`docs/user-plans/`), slice-1 code
(`src/graph.ts`, `src/reason.ts`, `src/seed.ts`), and the Grok conversation on
WordNet/ConceptNet/FrameNet the user shared on 2026-11-08. ALE references are to
the user's ai-live-web-editor repository, used as a reference implementation.\*