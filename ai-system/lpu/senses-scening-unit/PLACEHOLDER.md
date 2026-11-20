# Senses-Scening Unit

- **Schematic address:** `lpu/senses-scening-unit`
- **Type:** Unit
- **State:** partial — **55% completed to goal** (set by us, assessed by the project, not measured or computed). Inbound built 2026-11-17: `src/ansci/senses-scening.ts` reads a parsed sentence's sensory content through the SenseUnit (`src/ansci/sense-unit.ts`) and builds the semantic object's `senses` face — per-channel entries plus the multi-sensory scene — at assessment, and populates reply objects' senses faces from the reply graph by the same wiring. The outbound direction (a reply object's sensory content mapped back into wording choices for the Generator) is still to build, as with the LEDU. The qualitative constraint network over scene placements (the qualreas port) was added 2026-11-17 — see the section at the end of this file.

## What this unit is

The owner's direction (2026-11-17): when a person is describing a
thing, a language-side unit produces **the senses/scene part of the
semantic object**, using the OntologyCore's SenseUnit as its
authority — and the scene **encompasses all the senses**: a
description of a nature scene has sight, sound, smell, etc., bound
into one scene, not a sight-only picture. (This supersedes the
earlier "Imaging-Scening" framing, which was vision only.)

The unit is maintained inside the LPU, parallel to the LEDU:

- **Inbound:** sensory content as expressed in language — "salty",
  "green", "loudly", "fragrant", "cold", "overripe" — mapped through
  the SenseUnit's framework (channel, discrimination, the OKU's filed
  phase where one exists), so a semantic object's senses face carries
  the framework's readings, not ad-hoc labels.
- **The scene:** the entries across *all* channels are bound into
  one described scene — the entities described, their sensory
  qualities across whichever channels are present, and the spatial
  arrangement where the sentence gives one (figure, relation,
  ground: the banana *sat on* the table).
- **Outbound (face only, so far):** a reply object carries a senses
  face populated from its reply graph by the same wiring. Mapping
  that face back into wording is still to build.

## The scene — the design call, stated

A scene is recorded **whenever a fragment carries scene content**:
any channel entry, or a spatial arrangement / location predication
over described entities. A scene is the binding of the described
entities and their sensory qualities (plus arrangement, when
given), so a single quality statement ("The soup is salty") is a
minimal scene — one entity, one taste quality, no arrangement —
and a turn with no sensory or scene content at all ("Hello",
"What time is it?") records every channel **none** and no scene.
Absence is a recorded fact, not a gap.

## The scene graph is persistent (owner's design addition, 2026-11-17)

The unit produces a **scene graph of what is talked about**, and
the scene graph **persists across the conversation** — it is not
rebuilt per utterance:

1. **Consult before producing.** Before producing a fragment's
   scene, the unit consults the Session's running scene (the
   assessment already reads the prior stream before recording;
   the scene wiring follows that pattern). If a scene is already
   established, the new fragment is placed **into** it: the
   object's senses face references the running scene's id and
   records what this turn adds/extends, rather than minting a
   detached scene. An entity already in the scene is referenced,
   not re-minted. A turn with no established scene starts one
   when it carries scene content. (v1 limit, stated: the Session
   tracks one running scene; scene *switching* — a wholly new
   scene while one stands — is not yet distinguished.)
2. **Unknown slots.** Scene entities carry **unknown slots**:
   facts about an established entity that the conversation has
   not supplied, held as explicit typed slots on the scene graph,
   persistent until a later object fills them (the fills pattern
   the object stream already uses). Slots live on the scene
   graph itself (owner's ruling, 2026-11-17); Session & Situation
   keeps the cross-scene register of currently-open unknowns at
   `session-and-situation/open-unknowns` as a derived view, and
   Awareness's Open gaps reads from that register. One slot-kind
   rule is filed so far: **airport → city**.
3. **Tier discipline.** Spatial facts in the scene graph stand in
   three tiers, kept distinct (see the spatial faculties below):
   **said** (the fountain is between the two bathrooms),
   **placed-by-scene** (the fountain is in the terminal, because
   the fragment was placed into the running scene), and
   **default-placed** (the spatial faculty's own coarse placement
   for an entity with no stated or placed location). Placed facts
   are never recorded as said.

### The design specimen (owner, 2026-11-17, verbatim in substance)

- "I was at the airport terminal waiting for a flight." →
  establishes scene: person at airport terminal, waiting for a
  flight; **airport.city = UNKNOWN slot**.
- AI: "OK"
- "and then I went to the drinking fountain located in between
  the two bathrooms." → fragment placed into the running airport
  scene: fountain between bathrooms (**said**), fountain +
  bathrooms in terminal (**placed**), person's movement sequenced
  after the waiting ("and then").

Parser standing for the specimen, recorded plainly: the full
first sentence does not survive the sentence layer (airport and
terminal are lost in its parse), so the gated test pins the
richest two-turn sequence the parser does accept — "I waited at
the airport." (establishes: person at airport, waiting;
airport.city opens UNKNOWN) then "I went to the fountain between
the bathrooms." (extends: fountain between bathrooms said;
fountain and bathrooms in the airport placed, derived-tier) —
and the specimen's full wording stands here as a located parse
gap, not as a claim about the build.

## The spatial faculties (owner's design note, 2026-11-17)

The unit has **spatial faculties**: it *places* things that enter
a scene without a stated location, somewhere plausible — the
owner's example: it places the bathrooms somewhere near the
airport terminal. The named faculties are:

- **containment assignment** — a placed fragment's located
  entities are contained in the scene's container (the fountain
  is in the airport);
- **proximity default** — an entity with no stated or placed
  location is default-placed in-or-near the container (the
  bathrooms somewhere in-or-near the airport);
- **between-ness** — a stated between relation binds its figure
  against two landmarks (see the QuantificationUnit note below);
- **support** — stated support relations (the banana sat *on*
  the table) stand as said;
- **person-location / movement** — the person's stated positions
  and movements (waiting at, went to) are tracked in the scene's
  event sequence and relations.

Placements are **qualitative and coarse** — containment, near,
between, on/support: a region, never coordinates, never invented
specifics (no "on the left", no distances). The exact position
stays an **unknown slot** on the entity (an `exact-location`
slot opens for every default-placed entity). Placements are
**defeasible**: a later statement can correct or refine one, via
the supersession pattern — the standing relation records the
turn that superseded it; nothing is edited in place.

## Quantification — the family this note named, placed and built 2026-11-17

Somewhere the system has to deal with quantification, and the
owner settled where (ruling, 2026-11-17). The family was placed
and built later the same day (the quantification arc): the
QuantificationUnit and its UnitsMeasurement Unit are registry
nodes inside the OKU, the QuantificationLanguageUnit is a
registry node in the LPU with its "uses" cord drawn, and the
working code lives in `src/ansci/quantification.ts`,
`src/ansci/units-measurement.ts` and
`src/ansci/quantification-language.ts`. Their own PLACEHOLDERs
carry the build record; the settled design, as recorded when
they were only named, stands below.

- **QuantificationUnit** — its home is **inside the Ontology
  Knowledge Unit** (owner's correction, 2026-11-17, superseding
  an earlier System-level seat): it lives in the OKU, over the
  Numbers slice, alongside the correspondence graph, the
  classification table and the Numbers slice itself. It consults
  Session & Situation and the scene graph, and tracked quantity
  state lives on those graphs. It assists in tracking
  quantities: stated counts across turns ("I have 5 apples,
  Sally bought 3 of them, how many do I have left" → 5−3=2,
  computed from tracked state, not from the sentence alone) and
  *implied* counts ("between" implies **two** bathrooms). The
  OKU holds a **Numbers slice** (the classical number
  correspondences), and the QuantificationUnit is that slice's
  specialist reader, the way the EDU and the SenseUnit are
  specialists over their OKU slices — **no private number lore
  in the unit**. The Numbers relationship is now **containment**,
  not just a link: the unit sits in the OKU over the slice. (The
  slice's first deposit was banked in the senses arc's data
  pass, 2026-11-17: Suwen ch. 4's number row —
  其數八/七/五/九/六 for Wood/Fire/Earth/Metal/Water — in the
  OKU's ingested store, `INGESTED_ASSERTIONS_CH4_NUMBERS`.)
- **QuantificationLanguageUnit** — its **language bridge**, in
  the **LPU** (the EDU/LEDU pattern): maps quantity as expressed
  in language — numerals, number words, quantifiers,
  construction-implied counts like between→two — into the
  QuantificationUnit's records inbound, and renders tracked
  quantities back into language outbound. The
  QuantificationLanguageUnit **uses the QuantificationUnit** —
  its "uses" cord points to the QuantificationUnit at its OKU
  home; the QuantificationUnit sits **in** the OKU over the
  Numbers slice it reads.
  The QuantificationUnit will also have **Luoshu capabilities
  built in**: the Luoshu 3×3 magic square (numbers 1–9 in the
  nine palaces, rows/columns/diagonals summing to 15, 5 at the
  centre) is machinery *inside the QuantificationUnit itself* —
  number↔palace positions, the 15 balance invariant, the palace
  flight path — **distinct** from the OKU Numbers slice it links
  into: filed correspondences live in the OKU; the square is the
  unit's working apparatus. **Labelled tension, unharmonised:**
  the Suwen ch. 4 number row files Wood's number as **8** (the
  completion number) for the east, while the Luoshu places **3**
  in the east palace and **8** in the north-east — two attested
  arrangements, kept as two.
- **UnitsMeasurement Unit** — nested **inside** the
  QuantificationUnit (owner's ruling addition, 2026-11-17):
  the nesting runs OntologyCore ⊃ OKU ⊃ QuantificationUnit ⊃
  UnitsMeasurement Unit. It handles units of measurement for
  its parent — dimensions, conversion within a dimension,
  compatibility (unlike dimensions cannot be added or
  compared), measure words as counting units, modern units and
  the traditional Chinese units in which the banked classical
  quantities (e.g. bencao dosages) are stated. When it is put
  in, **Imperial and SI units will be added alongside the
  traditional Chinese units — three unit systems in the one
  dimension/conversion table**.

Both were first recorded here as **named, with settled homes,
to be placed and built in a later arc** after the senses arc
landed; that arc has now run (see the head of this section).
The one immediate consequence the senses arc itself carried is
in the scene graph: a "between" relation's landmark is
recorded as **two distinct entities** (`bathroom-1`,
`bathroom-2`), not a single plural node.

## Stated vs derived — the standing discipline

Only what the sentence **says** enters the senses face. A channel or
value the sentence merely implies — "overripe" implying a smell, a
sweetness, a softness — may be annotated on the object's trail by
Coherence as a **tier-"derived"** reading (the SenseUnit files the
implication; Coherence does the annotating). It never becomes an
entry in the face.

Per the retention rule, every entry keeps the concrete word **as
said** alongside its classification; the elemental reading never
replaces it. And per the object's standing rule, the face holds no
wording and nothing medium-specific.

## Who uses it / who it uses

- **Uses:** the SenseUnit (`ontology-core/sense-unit`) — the "uses"
  cord on the map.
- **Used by:** SemanticAssessment, which consults this unit at
  creation for every object (person and reply objects alike).

## Where the working code lives today

`src/ansci/senses-scening.ts` (built 2026-11-17), over the authority
in `src/ansci/sense-unit.ts`. Before that, no unit produced a senses part:
sensory words were classified as ordinary aspects (colour, taste,
temperature) with no channel named and no scene bound.

## The qualitative constraint network — the qualreas port (built 2026-11-17)

The scene's standing placements now form a **constraint network**
over a classical relation algebra, and the network is propagated
at every scene update:

- **Source:** qualreas (Alfred J. Reich,
  https://github.com/alreich/qualreas) — its relation algebras
  ship as JSON: RCC-8 (regions), Allen's interval algebra
  (intervals), the point algebra. **License: MIT** (Copyright
  (c) 2019 Alfred J. Reich), reproduced in the repo NOTICE file
  and data/qualreas/manifest.json.
- **Conversion:** scripts/import-qualreas.py (build-time) →
  data/qualreas/manifest.json + part-001.json (6 KB): the three
  algebras' relation inventories, converses and composition
  tables. Only the algebra DATA is taken.
- **Engine:** `src/ansci/qualreas.ts` — our own TypeScript
  path-consistency engine written from the classical algorithm
  (composition-consistency over a constraint network, Allen 1983
  lineage), crediting qualreas for data and design. Constraints
  are sets of base relations; propagation enforces
  C[i][j] ⊆ C[i][k] ∘ C[k][j] to a fixpoint; an emptied set is a
  contradiction, reported with the pair that emptied.
- **The bridge (this unit's own mapping):** the scene vocabulary
  maps to RCC-8 relation sets — "in" → {TPP, NTPP} (proper part,
  boundary contact unstated); "in-or-near" → {TPP, NTPP, PO, EC}
  (RCC-8 has no distance: "near" is the coarse reading — not
  properly outside, not containing); a "between" figure against
  each landmark → {DC, EC} (between-ness is ternary; this is its
  binary shadow). Verb-labelled relations (waited-at, went-to)
  are not spatial constraints in v1 and do not enter the network.
- **Derived relations:** pairs no standing relation relates
  directly gain a derived record on the scene graph
  (`scene.derivedRelations`, tier **placed-by-scene** — a
  derivation is never a said fact), recomputed wholesale at each
  update. Pinned end-to-end in test/ansci-qualreas.test.ts: the
  airport scene, once "The airport is in Chicago" stands, derives
  fountain–Chicago = {NTPP, TPP} (containment through the chain)
  and the bathrooms' looser {EC, NTPP, PO, TPP}.
- **Inconsistency:** a placement set the algebra shows to be
  contradictory (e.g. mutual containment: "The airport is in
  Chicago" + "Chicago is in the airport") is **flagged**, never
  silently kept: a `spatialFlags` record on the scene, the
  derived relations emptied, and an open unknown slot of kind
  **spatial-consistency** opened for the figure (the open
  unknowns discipline — Session & Situation's register reads it
  like any other slot).
- **Allen, stated plainly:** the scene model carries the event
  sequence's ORDER (turn order), not intervals, so Allen's
  algebra is pinned at the engine level over that sequence
  (wait → go → go derives e1 Before e3) and no Allen constraints
  are asserted in production paths in v1. The point algebra
  ships in the artefact unused so far.
- **The no-coordinates rule stands:** the network holds relation
  sets only. Nothing in this port introduces coordinates,
  distances or timestamps into the scene graph.

## The imageability slot (recorded 2026-11-17, the Glasgow scope extension)

This unit's earlier "Imaging-Scening" framing (vision only) was
superseded by the multi-sensory scene above, and **no
imaging-scening unit exists in the registry** — imaging is not a
node, and none was invented for this preparation. What exists,
prepared for a future imaging consumer, is the LABELLED ACCESS
PATH to the Glasgow Norms' imageability dimension:
`imageabilityOf(word)` in `src/ansci/normalcy-unit.ts` returns a
word's imageability fact (published mean on its 7-point scale,
with provenance) — which words are imageable, as knowledge. The
slot where a future imaging feed would attach is HERE, at the
unit that owns the scene's sensory content: were an imaging
reading ever built, it would consult that access path the way
the placement machinery consults the concreteness prior
(`placementPriorsFor` in `src/ansci/senses-scening.ts`). In v1
the path is deliberately UNCONSUMED: nothing reads imageability
in any production path, and no behaviour depends on it.
