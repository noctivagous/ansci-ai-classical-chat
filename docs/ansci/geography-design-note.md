# Geography — design note (2026-11-20)

The design record for geographic awareness: a GeographyKnowledgeUnit
in the Ontology Knowledge Unit and a GeographyAwareness submodule in
Awareness, with Nominatim, Overpass and OSRM consulted through
ExternalQuery on the pattern the Wikidata intake established.

**Status: DESIGN ONLY.** Nothing in this note is built. The two
homes, the consultation pattern, the resolution order and the
exclusions were settled by the owner in conversation on 2026-11-20
and are marked SETTLED where they appear. The build slices in §9
are PROPOSED, not commissioned. Open questions are collected in
§10 and are decided nowhere in this note.

## 0. Basis — what this design rests on

Read before writing, all on main `a093f57` unless noted:

- `src/ansci/place.ts` — the Place table (Awareness Self → Place).
  One configured place or none; as it stands, none, and the file
  records why that is a finding, not an omission: the Awareness
  frame is a time record and holds no place field.
- `src/ansci/session.ts` — `FrameInput` / `FrameRecord` /
  `buildFrame`: the session's situation record is time only
  (month/day/hour, season, daypart). There is no place in it.
- `src/ansci/social.ts` and `docs/ansci/social-s1-report.md` — the
  Social Unit (Awareness → Social Unit): the discipline
  GeographyAwareness inherits. It reads the social situation and
  raises demands; it never speaks, never authors a reply, and
  never originates a claim about the world. Its registers live in
  the Session; authorship stays with the Planner, wording with
  the Verbalizer.
- `src/ansci/wikidata.ts`, `src/ansci/wikidata-bank.ts`,
  `src/ansci/wikidata-client.ts` and
  `docs/ansci/wikidata-adapter-plan.md` — the consultation and
  banking precedent: API access only, no local dump or mirror
  (owner ruling, 2026-11-19); a configurable endpoint with a
  polite descriptive User-Agent and no key; tests against
  recorded fixtures, never the network; `{ status: "unavailable",
  reason }` as a stated state, never dressed up as absence; every
  banked fact retrieved-kind with a SourceRecord (§§3.5, 4.3 of
  `docs/design-base-nets-and-chat.md`), confidence 0.9, never a
  propagation anchor; the bank a process-level store, canonical
  behind its own accessors, with the session graph as mirror.
- `src/ansci/entities.ts` — Slice 0 grounding: named entities
  identified by WordNet instance synset, gloss + type,
  wordnet-retrieved provenance. Grounding is by attested synset,
  never by the question's capitalisation.
- `src/ansci/entity-rank.ts` — the entity ranker: three classical,
  explainable signals (type agreement ±3, prominence 0..+2 log
  sitelinks, context overlap +1/word via lesk.ts's one overlap
  implementation), full score breakdowns, built to order the
  Wikidata intake's join proposals. Its EVALUATION IS INCOMPLETE
  (fixture recording was interrupted by a provider 429; see
  `docs/ansci/entity-ranking-report.md`). §6 depends on it and
  says so.
- The weather modules of probe-2 Slice 6 — `weather.ts`,
  `weather-bank.ts`, `weather-client.ts`, `weather-turn.ts` —
  read on branch `track/probe2-fixes`, NOT on this main: at the
  time of writing that programme is built and gated locally and
  awaits the owner's push word. This note is written against the
  weather PATTERN (synchronous shape + async wrapper, banked
  readings with fetch time and a stated shelf life, the
  place-first resolution chain), which is source-agnostic. The
  weather source decision current at writing is api.weather.gov
  (US National Weather Service; no key, descriptive User-Agent
  required, addressed by coordinates), being re-pointed from
  Open-Meteo on that same branch after Open-Meteo's forecast
  endpoint rate-limited this deployment's egress.
- `ai-system/SCHEMATICS-LUOSHU.md` and `ai-system/system-map.ts` —
  placement language. Awareness already carries the seats `self`,
  `social-unit`, `place-and-time`, `surroundings` and
  `current-activity`; the OKU carries `correspondence-graph`,
  `classification`, `quantification-unit`, `paramorphic-concept-
  unit`. How the two new homes are worded against those seats is
  an open question (§10), not settled here.

## 1. The settled design (owner, 2026-11-20)

1. **Two homes.** Geographic capability is owned by a designed
   pair, not scattered across wrappers: a
   **GeographyKnowledgeUnit** (knowledge-side, in the OKU) and
   **GeographyAwareness** (situated-side, a submodule of
   Awareness, sibling of the Social Unit).
2. **Consultation, not holding.** Places are resolved by
   consulting named external sources through ExternalQuery, on
   the Wikidata pattern. Functions are machinery, not testimony:
   what a consultation returns enters only banked, with
   provenance, or it does not enter at all.
3. **The resolution order is standing policy** of the
   GeographyKnowledgeUnit: **configured → banked →
   conversation-stated → consulted**. (§2.3 states the order in
   full, including the place a question names itself.)
4. **Native API support is the route to geographic awareness**:
   Nominatim (geocoding), Overpass (what's-there), OSRM (routing
   as computation), and weather.gov addressed by coordinates.
   Map tiles and planet extracts are EXCLUDED (§7).
5. **Ambiguity is never silently resolved.** Namesakes go to the
   entity ranker; an unresolved tie is a located decline or a
   clarification, never a pick (§6).

## 2. GeographyKnowledgeUnit — the knowledge home

Placement: a unit inside the Ontology Knowledge Unit, alongside
SenseUnit and QuantificationUnit — knowledge-side in content,
core-side in custody, because its register is banked knowledge
but its resolution policy steers other units' turns.

### 2.1 What it owns

- **The place register** (§2.2): every place the system has
  resolved, in one store behind its own accessors, on
  wikidata-bank.ts's canonical-store reasoning — retrieved facts
  have a different provenance and epistemic status from the
  classification table and the seed graph, so they live behind
  their own accessors rather than merged into either.
- **The resolution order** (§2.3) as policy, stated once, here —
  inherited by every place-shaped consumer (weather first of
  them) instead of re-implemented per wrapper, which is how
  Slice 6 had to state it privately.
- **The geographic question shapes' home**: where-is,
  what's-in, what's-near, how-far. A shape is asked of the
  register first; consultation happens only on a miss, a stale
  entry, or an ambiguity the register cannot settle.

### 2.2 The place register

One record per resolved place. Fields, each with its own
provenance — a record is a bundle of separately-attested facts,
not one attestation:

| Field | Content | Typical source |
| :--- | :--- | :--- |
| names | the name as resolved, plus attested variants | grounding, Nominatim, Wikidata |
| coordinates | lat/lon point, and what the point stands for (a state name resolves to a point — the register records the point and its standing, as weather-bank.ts's `resolvedName` already insists: a reading for a capital's point is not a reading for the whole state) | Wikidata P625, Nominatim |
| containment | LOCATED_IN / PART_OF chain as attested | Wikidata (P17/P131/P361), Overpass |
| kind | the place's type as attested (city, state, river…) | grounding synset, P31 |
| per-fact provenance | retrieved-kind SourceRecord per fact: dataset, uri/id, fetch date (§§3.5, 4.3 discipline; confidence 0.9 for structural facts, as the Wikidata intake) | — |
| fetched-at / expires-at | per fact-kind, under the shelf-life table (§2.4) | — |

Banking is idempotent, keyed by the resolved place's identity,
on wikidata-bank.ts's pattern; re-consulting an already-banked
fact adds nothing and changes nothing, and the counts say what
was added.

### 2.3 The resolution order (SETTLED, stated in full)

When a turn needs a place, the demand reaches the unit carrying
any place the question itself names — a question that names its
place asks about that place, and the named place is the demand's
argument, not a step in the order. The order then runs:

1. **Configured** — the deployment's configured place
   (GeographyAwareness's seat, §3; today the Place table, and
   today unconfigured).
2. **Banked** — the register already holds the place, fresh
   under its shelf life.
3. **Conversation-stated** — a place this conversation has
   established (the interlocutor's stated place, a residence
   event; read from the conversation record where it stands, as
   Slice 6 reads it).
4. **Consulted** — an ExternalQuery consultation (§4), banked on
   return.

A step that produces a candidate does not end the matter if the
candidate is ambiguous (§6) or stale (§2.4): ambiguity goes to
the ranker at whichever step raised it; staleness falls through
to consultation.

### 2.4 Shelf lives — per kind, stated

Weather established the discipline (a reading expires; a capital
does not); geography generalises it. Every banked fact-kind
carries a stated TTL; a fact past its TTL answers nothing and
triggers re-consultation or a located decline.

| Fact kind | Shelf life | Reasoning |
| :--- | :--- | :--- |
| Coordinates (geocode) | 12 months | A named place's point is survey-grade stable; the TTL exists so the bank re-attests rather than fossilises, not because movement is expected. |
| Reverse geocode (point → place) | 12 months | Same ground as coordinates. |
| Containment (LOCATED_IN / PART_OF) | 6 months | Administrative boundaries do change — annexations, new municipalities — but on a scale of years; six months re-attests well inside any real change's notice. |
| Place kind / names | 12 months | Renamings happen (and are historically attested events when they do); a year is short against them. |
| What's-there (POI presence, Overpass) | 30 days | Businesses and facilities open and close on a scale of weeks-to-months; a year-old POI claim would be presented as current long past its warrant. |
| Route / travel time (OSRM) | 7 days, IF banked | Road geometry is stable; closures and works are not. Whether routes bank at all is an open question (§10); the TTL is stated so the question has a price attached either way. |
| Weather reading | 30 minutes | Already built (weather-bank.ts, probe-2 Slice 6). Recorded here so the table is complete; the reading stays the weather bank's, not the register's. |

### 2.5 What it never does

- Holds no mirror of any external dataset (§7).
- Serves weather: readings are the weather bank's. The unit
  supplies the place and the point; weather.gov, addressed by
  those coordinates, supplies the reading.
- Guesses a coordinate, a containment, or a namesake (§6).
- Originates a fact: every register entry traces to grounding,
  a banked consultation, or the conversation record. The unit
  curates; it does not testify on its own behalf.

## 3. GeographyAwareness — the situated home

Placement: a submodule of Awareness, sibling of the Social Unit
(`awareness/social-unit` on the map). Where GeographyKnowledgeUnit
holds what the system knows about places durably,
GeographyAwareness holds where THIS conversation is situated —
per-session, and only for the session.

### 3.1 What it holds

- **The configured seat**: the deployment's place, taken up at
  session opening. Today this is the Place table (place.ts),
  whose standing content is `null` — no place configured — and
  whose header records the honest ground: the system runs
  wherever it is run and no shell records a place for it. Under
  this design the table becomes GeographyAwareness's
  configuration (§8), with the same honesty: an unconfigured seat
  is a stated state, and the self-location decline that names it
  remains the correct answer to "where are you?" until a
  deployment configures one.
- **The interlocutor-stated place**: "I am in Oklahoma", "I live
  in Tulsa" — taken up from the conversation record (the
  residence event, or the record's own location graph for the
  speaker, as Slice 6 reads both). GeographyAwareness holds THAT
  they stated it, as a pointer to the record; the record holds
  what was said — the Social Unit's update rule, applied to
  place: only speaker-attributed content writes in.
- **The deictic centre**: the place that "here", "near me" and
  "where am I?" refer to in this conversation — the configured
  seat for the system's "here", the interlocutor's stated place
  for theirs, and the distinction between the two kept explicit,
  because "what is the weather?" from a visitor asks about the
  VISITOR's here, not the deployment's.
- **Shifts**: when the conversation moves ("and in Tulsa?"), the
  centre moves, as a recorded shift — the earlier centre is not
  erased, it is superseded in the register's session view, the
  way the Social Unit's phase machine records transitions rather
  than overwriting them.

### 3.2 The discipline (the Social Unit's, stated for space)

GeographyAwareness **reads the spatial situation and raises
demands on the Planner; it never speaks, never authors a reply,
and never originates a world claim.** Its product is a reading —
annotations on the turn's trail plus the state of its session
register — exactly the Social Unit's product shape. When "where
am I?" is answered, the answer's facts come from the register or
a consultation; GeographyAwareness only establishes which place
the question is about. Authorship stays with the Planner;
wording with the Verbalizer; the visitor-facing text of any
place claim is the owner's, as place.ts already records for the
configured place's text.

### 3.3 What it never does

- Holds no geographic fact of its own: every place it points at
  is a register entry or a conversation-record pointer.
- Answers a question: it raises the demand (a place is needed;
  the centre is this; no place stands) and the turn machinery
  discharges it.
- Treats the system's place and the interlocutor's place as one
  fact. They are two seats, and conflating them is the error the
  deictic-centre split exists to prevent.

## 4. Consultations — ExternalQuery

Functions are machinery, not testimony. Each consultation below
is an ExternalQuery instance under Functions, wrapped in a client
on wikidata-client.ts's discipline: configurable endpoint,
identifying User-Agent, no key where the service needs none,
fetch injected so tests run on recorded fixtures and never touch
the network, and `{ status: "unavailable", reason }` returned —
never thrown across the interface, never fabricated past.

### 4.1 Nominatim — geocoding and reverse geocoding

- Endpoint: `nominatim.openstreetmap.org` (configurable).
  Forward: a place name → candidate points. Reverse: a point →
  the place that contains it.
- Discipline: the public server's usage policy is part of the
  design, not an operational detail — **at most 1 request per
  second**, an identifying User-Agent with contact, no bulk
  geocoding. The client enforces the rate; a queue that would
  breach it waits or declines as unavailable, it does not burst.
- What it dissolves: Slice 6's held-coordinates-only decline.
  Today a resolved place with no coordinates the system holds
  declines at the missing coordinates, because guessing them
  would fabricate. Nominatim is the non-guessing route: the
  place is consulted, the point banked with retrieved
  provenance, and weather (or Overpass, or OSRM) proceeds by
  coordinates. The decline remains for the cases consultation
  cannot cure — the source resolves no such place, or is
  unavailable (§9.4).
- Ambiguity is expected output: Nominatim returns namesakes.
  They are candidates for the ranker (§6), never a silent first
  hit.

### 4.2 Overpass — what's-there

- Endpoint: `overpass-api.de/api/interpreter` (configurable),
  read-only queries against OpenStreetMap data.
- What it attests: the ground fabric the encyclopedic sources do
  not carry — points of interest, water, roads, buildings, and
  containment read from the ground (a point inside a boundary)
  rather than from an encyclopedia's assertion. It is the
  testimony source for what's-near and what's-in shapes (§5.2).
- Discipline: Overpass queries can be slow and the public
  instance is a shared resource — queries are bounded (area,
  count, timeout) as data in the query templates, a timeout is
  `unavailable`, and what's-there results bank at the 30-day
  shelf life (§2.4), so repeat asking inside a month costs the
  service nothing.

### 4.3 OSRM — distance and travel time, as computation

- Endpoint: `routing.openstreetmap.de` (configurable; public
  demo server, ~1 req/sec, same client-side rate discipline as
  Nominatim).
- **A route is not testimony.** "How far is Tulsa from Oklahoma
  City?" resolves two places (§2.3), then COMPUTES over them:
  the answer is a Function output — road distance and travel
  time by the routing engine, or straight-line distance computed
  locally from the two banked points — and the reply shows its
  derivation (the two resolved places, the mode, the engine or
  the arithmetic), the way a derived fact in this system is
  never dressed as a retrieved one (§3.5's masquerade rule, run
  in the other direction). A route answer cites its inputs'
  provenance; it carries none of its own.
- An unresolvable endpoint stops the computation at that
  endpoint, located — there is no partial route.

### 4.4 weather.gov — addressed by the register

The weather source is not a geography consultation; it is a
consumer of one. GeographyKnowledgeUnit supplies the resolved
place and its coordinates; weather.gov (api.weather.gov —
points → grid → forecast/observation; no key; descriptive
User-Agent required) is addressed BY those coordinates, and the
reading banks in the weather bank under its own 30-minute shelf
life. weather.gov covers the United States only; a resolved
place outside its coverage declines at coverage (§9.4), and the
non-US fallback question is the owner's (§10).

## 5. The protocol between the pair

One direction of travel, three stations:

```
a place-shaped demand (from a question shape or another unit)
  → GeographyAwareness: the situated reading — which place this
    conversation means; the gap located HERE when no place stands
  → GeographyKnowledgeUnit: resolution under the order (§2.3) —
    register first, consultation on a miss, banking on return,
    the ranker on namesakes
  → the addressed consumer: a question shape answering from the
    register, or an external source addressed by coordinates
```

### 5.1 Worked chain — weather (the existing chain, generalised)

"what is the weather?" — Slice 6's chain, restated as the pair's
protocol (and the migration target of §8):

1. The weather shape fires; it needs a place it does not carry.
2. GeographyAwareness reads the situation: no place in the
   question; the interlocutor stated "I am in Oklahoma" two turns
   ago — the centre is Oklahoma, pointer to the record. (No
   stated place and no configured seat → the demand fails HERE,
   and the reply names the place gap — Slice 6's place-gap
   answer, unchanged in substance.)
3. GeographyKnowledgeUnit resolves Oklahoma: banked (the
   Wikidata intake banked Q1649 with P625 coordinates) → the
   register entry, fresh. On a register miss with no held
   coordinates, consultation: Nominatim, banked on return.
4. weather.gov is addressed by the coordinates; the reading
   banks in the weather bank with its fetch time; the reply
   states the reading, its point and its source — and names the
   point honestly (a state name resolves to a point; the reading
   is for that point).

### 5.2 Worked chain — what's-near (Overpass)

"what is near the university?" (a conversation situated in a
stated town):

1. The what's-near shape needs a centre point and a radius; the
   centre demand goes to GeographyAwareness, which supplies the
   situated place and the question's named anchor ("the
   university" — itself a place resolution, through the same
   protocol, one level down).
2. GeographyKnowledgeUnit resolves the anchor: register miss →
   Nominatim consultation → point banked. Namesake universities
   → the ranker, with the situated place as evidence (§6).
3. Overpass is queried for the shape's categories within the
   radius, bounded; results bank as what's-there facts (30-day
   shelf life) with Overpass provenance; the answer is composed
   from the banked set — names, kinds, distances from the anchor
   computed locally from points.
4. Declines: no situated place (gap at GeographyAwareness);
   anchor unresolvable or ambiguous past ranking (gap at
   resolution); Overpass unavailable (gap at the source — the
   banked set, if any and fresh, may still answer, and says it
   is answering from the bank).

### 5.3 Worked chain — how-far (OSRM)

"how far is Tulsa from here?"

1. Two place demands: Tulsa (named) and "here" (deictic —
   GeographyAwareness supplies the interlocutor's centre).
2. GeographyKnowledgeUnit resolves both under the order; each
   resolution is independent, and either can fail located at
   itself.
3. The computation runs over the two banked points: road
   distance/time via OSRM, straight-line distance computed
   locally; the reply shows the derivation — "Tulsa (resolved to
   Tulsa, Oklahoma) is about N road-miles from Oklahoma City,
   about M as the crow flies" — derived-kind, its inputs'
   provenance in the trace.
4. No testimony is banked from a route; whether the computed
   result itself banks is open (§10).

## 6. Ambiguity — namesakes and the entity ranker

Five Springfields is the normal case for place names, not an
edge case. The design's rule (SETTLED): **a namesake set goes to
the entity ranker; the ranker's order proposes, and a margin too
small to separate the leaders is an unresolved tie — a located
decline or a clarification question, never a silent pick.**

- The ranker (entity-rank.ts) already reasons over the right
  signals: type agreement (a where-question expects a place —
  the river and the basketball player named Springfield are
  separated here), prominence (sitelinks as prior), context
  overlap (lesk.ts's one implementation). Nominatim candidates
  arrive in a different shape from Wikidata candidates (no
  sitelinks; OSM carries its own importance value) — the
  candidate record the ranker consumes is extended by data
  mapping at the client, not by new signals in the ranker,
  following wikidata-mapping.ts's data-table precedent.
- **GeographyAwareness's situated place is itself ranking
  evidence, and distance enters the score.** A Springfield forty
  miles from the conversation's centre outranks a Springfield a
  thousand miles away, other signals near-equal. Stated as a
  design requirement on the ranker's context: the context record
  gains the situated place (when one stands), and proximity to
  it is a scored signal with its breakdown shown, like every
  other signal — the ranker shows its work per candidate, and
  distance is one more auditable line, not a hidden sort.
- **The dependency is stated honestly: the ranker's evaluation
  is incomplete.** Its fixture set was only partly recorded
  before a provider 429 stopped the recording (see
  entity-ranking-report.md); on the two recorded contexts it
  ranked 2/2 against search order's 0/2, which establishes no
  accuracy claim. Geography's G1 slice (§9) consumes the ranker
  for live resolution; completing the ranker's evaluation is a
  precondition of trusting it there, and G1's acceptance says so.

## 7. Exclusions (SETTLED, with reasons)

- **Map tiles** (tile.openstreetmap.org). Tiles are display, not
  knowledge: a tile cannot be banked, cited, or reasoned over,
  and the system has no map surface that testifies. If a future
  interface wants a map, that is the interface's business, light
  use under the tile policy — it is not geographic awareness and
  it does not enter this design.
- **Planet extracts and any local OSM mirror.** A weekly 89 GB
  PBF is a local database by another name, and the settled rule
  (owner, 2026-11-19, for Wikidata; restated for geography
  2026-11-20) is API access only: **the system's one local store
  is its bank of actually-consulted facts, each with
  provenance.** A mirror inverts that — everything held, nothing
  attested by a consultation the system made. Overpass already
  is the planet, queried on demand; the register holds what the
  system actually asked about, which is the subset it can speak
  for.

## 8. Migration — what happens to the existing pieces

Nothing in this section is built; it states what each slice in
§9 does to what exists, so the build has no surprises.

- **The Place table (place.ts)** becomes GeographyAwareness's
  configured seat: same data (a place name or `null`), same
  honesty, new custody. The Social Unit's self-location route
  ("where are you?" — Transcript Slice 4) requests the fact from
  GeographyAwareness instead of reading the table directly; the
  located decline for the unconfigured case is unchanged.
- **The Awareness frame (session.ts)** is a time record and
  stays one. GeographyAwareness's session register is a separate
  record beside it (the Social Unit's registers are the shape:
  session-held, unit-owned). No place field is added to
  FrameRecord; the frame's silence about place was the finding
  place.ts recorded, and the remedy is a home for place, not a
  field in a time record.
- **Slice 6's weather resolution chain generalises** into the
  pair's protocol (§5.1): weather.ts's private order (question →
  configured → conversation record) is the protocol's first
  instance, and G1 lifts it into the two units, leaving weather
  holding only its shapes, its bank and its source client. The
  weather wrapper's located declines (place-gap, lookup-needed,
  lookup-unavailable, place-unresolved) keep their locations;
  two of them (place-gap, and resolution generally) become the
  pair's declines, raised by the units rather than by weather.
- **The Wikidata bank's P625 coordinates become register
  entries — DESIGN QUESTION, with a recommendation.** Three
  treatments are possible: (i) a shared store (the register IS
  the Wikidata bank, extended); (ii) import on read (the register
  is its own store; when resolution needs a place, it reads the
  Wikidata bank's banked coordinates and banks a register entry
  citing them — provenance chains: register entry retrieved-from
  the bank, the bank's entry retrieved-from Wikidata); (iii)
  supersession (the register replaces the bank for places, and
  the bank's place facts migrate once). **Recommendation: (ii)
  import on read.** It keeps each store canonical for its own
  kind (the bank for Wikidata retrievals, the register for
  resolved places), it duplicates nothing silently — the register
  entry's provenance names the bank as its immediate source —
  and it lets places resolved from Nominatim, Overpass or the
  conversation join the same register without pretending they
  came from Wikidata. Supersession is the tidier end-state and
  the worse first step: it would move facts before the register
  has earned custody of them. The decision is the owner's (§10).

## 9. Build slices (PROPOSED — not commissioned)

Each slice: one branch, one worktree, full gates (suite, demo,
holdout, sense A/B, ai:check), a slice report, local commits
only — the programme discipline of the tracks before it.

### 9.1 G1 — Nominatim under the register, and the protocol

The register (GeographyKnowledgeUnit) and the situated register
(GeographyAwareness) built as shadow-first units on the Social
Unit's S1 pattern (reading + registers, no reply path consumed),
then the protocol wired for the consumers that exist: the Place
table's custody moves, the self-location route re-points, and
weather's chain (when the probe-2 programme has landed) lifts
into the pair. The Nominatim client (rate-limited, fixture-
tested) resolves register misses; the ranker consumes namesakes
with the situated place in context.
*Acceptance sketch:* a stated place with no held coordinates
resolves end-to-end (weather answers for a place only Nominatim
could place); the unconfigured self-location decline is
byte-identical; the ranker's completed evaluation is a stated
precondition, and G1 does not ship live resolution on an
unevaluated ranker.

### 9.2 G2 — Overpass what's-there

The what's-in / what's-near shapes over the register, bounded
query templates as data, what's-there banking at 30 days.
*Acceptance sketch:* what's-near answers from a recorded fixture
set with provenance in the trace; a repeat asking inside the
shelf life costs zero fetches; an unbounded or untemplated query
is impossible by construction, not by care.

### 9.3 G3 — OSRM how-far

The how-far shape as computation (§4.3): two resolutions, the
routing call, the derivation shown in the reply and the trace.
*Acceptance sketch:* how-far between two banked places answers
with its derivation; straight-line distance is always available
from banked points when OSRM is not; an unresolvable endpoint
declines at that endpoint.

### 9.4 The located declines catalogue (all slices)

Every geography failure is a located decline in the repo's
standing sense — the gap named at its location, never an unnamed
rephrase:

| Decline | Location of the gap |
| :--- | :--- |
| no place | GeographyAwareness: no configured seat, no stated place, none named — "I don't know where you are" is the shape of the answer |
| unresolvable place | GeographyKnowledgeUnit: the register misses and consultation resolves no such place |
| ambiguous place | the ranker: namesakes stand and the margin does not separate them — decline, or clarify by naming the leaders |
| source unavailable | the consulted Function: `{ status: "unavailable" }` — "lookup unavailable", never "no such place" |
| outside source coverage | the addressed source: e.g. weather.gov and a non-US place — the gap is the source's coverage, stated as such |
| stale-only facts | the register: the only entry is past its shelf life and re-consultation failed — the decline names staleness, and never serves the stale fact as current |

## 10. Open questions (the owner's — decided nowhere here)

1. **Non-US weather fallback.** weather.gov covers the United
   States only. Whether Open-Meteo (global, no key; its forecast
   endpoint rate-limited this deployment once) stands as the
   fallback for resolved places outside the US — or non-US
   weather simply declines at coverage — is undecided.
2. **Register persistence.** The register as designed is a
   process-level store, like the Wikidata and weather banks: it
   persists across sessions within a process and not across
   restarts. Whether the place register — the system's most
   durable kind of knowledge — earns file-backed persistence the
   banks have not is undecided.
3. **Do routes bank?** §2.4 prices a banked route at 7 days, but
   whether a computed route is banked at all, or recomputed per
   asking from banked points, is undecided. (Straight-line
   distance needs no decision: it is arithmetic over banked
   points, computed whenever asked.)
4. **Luoshu map placement wording.** Awareness already carries
   `place-and-time` and `surroundings` seats; whether
   GeographyAwareness is a new seat beside `social-unit`, or the
   grown form of one of those, and the GeographyKnowledgeUnit's
   exact seat wording among the OKU's children, are for the
   owner when the map is next drawn.
5. **P625 custody.** §8 recommends import-on-read for the
   Wikidata bank's coordinates; the choice among shared store,
   import on read, and supersession is the owner's.

## Appendix — sources relied on

Main `a093f57`: `src/ansci/place.ts`, `src/ansci/session.ts`
(FrameInput/FrameRecord), `src/ansci/social.ts`,
`src/ansci/wikidata-bank.ts`, `src/ansci/entity-rank.ts`,
`docs/ansci/wikidata-adapter-plan.md`,
`docs/ansci/social-s1-report.md`,
`docs/ansci/entity-ranking-report.md`,
`docs/design-base-nets-and-chat.md` (§§3.4–3.6, 4.3–4.4),
`ai-system/SCHEMATICS-LUOSHU.md`, `ai-system/system-map.ts`.
Branch `track/probe2-fixes` (unmerged at writing):
`src/ansci/weather.ts`, `src/ansci/weather-bank.ts`,
`src/ansci/weather-client.ts`, `src/ansci/weather-turn.ts`.
Settlements: Wikidata API-only ruling (owner, 2026-11-19);
geography design rulings (owner, 2026-11-20).
