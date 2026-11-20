# Transcript Slice 0 — Entity Grounding — report (2026-11-19)

Slice 0 of the transcript fix programme commissioned from the
2026-11-19 diagnostic probe: the entity-grounding slice. The
diagnosis (K1, as corrected by the owner's erratum to the
probe report) was that Oklahoma is **not** absent from the
system's data — the bundled WordNet extract holds synset
9295833, "a state in south central United States" — but no
named entity ever reached the knowledge the answer path reads,
so "what is oklahoma?" (probe 14) declined with "nothing on
oklahoma in my notes" and "where is oklahoma?" (probe 11)
declined as unknown. This slice is the ingest that closes
that gap, principled over the whole extract, not an Oklahoma
special-case. Built in the worktree
`~/workspace/ansci-track-transcript` (branch
`track/transcript-fixes`, cut from origin/main 76996ae).
Local commit; push waits for the owner's word.

## What was built

**The entity store (`src/ansci/entities.ts`, new).** Built
once per process from the extract the repo already loads
(`getDefaultExtract`, src/wordnet.ts), cached beside it.

*How named-entity synsets are identified:* by the extract's
own **instance relation**, not by spelling. A noun synset
that stands as the source of an `instance` edge is a named
individual, an instance of the edge's target class synset
(Oklahoma —instance→ American state). The extract carries
8,614 instance edges over **7,756 distinct synsets**, and all
7,756 are grounded. Capitalisation was measured and rejected
as the marker: 24,647 noun synsets carry a capitalised lemma
— eponyms and derived terms ("French leave", "Freudian
slip"), acronyms, and ordinary instances alike — so a
capitalised lemma cannot distinguish a name from a common
noun, and grounding on it would make words the system should
decline on "known". The relation can: 7,748 of the 7,756
instance synsets also carry a capitalised lemma, and the 8
that do not ("church mouse", "lynx" the browser,
"off-Broadway"…) are instances still — the relation, not the
spelling, is the evidence.

Each record holds exactly the payload the data holds: the
synset's **gloss** (verbatim), its lemmas, its stable synset
id, its **type** — the instance target class(es) (most
entities hold one; Shakespeare holds two, dramatist and poet)
plus the class's hypernym chain (Oklahoma: American state →
state → administrative district → district → region →
location → object → physical entity → entity, climbed to the
root, bounded at 10 hops as a cycle guard). Nothing else is
asserted: no element classification (an entity is not a
Wuxing correspondence, and none is invented for it — a test
pins `lookupClassification("oklahoma") === undefined` and
zero HAS_ELEMENT edges), no location, no coordinates.

*Provenance:* every record, node and edge is tagged
**"wordnet-retrieved"** — the retrieved kind of
src/propagate.ts's provenance kinds (net edges are retrieved;
seed classifications are curated; conclusions are derived),
specialised with the source, the Open English WordNet 2024
extract (CC BY 4.0). The synset id rides on every record, so
any grounded answer traces to the exact synset it came from.

**The graph ingest (`src/ansci/join.ts`).**
`buildForkGraph` now calls `mergeEntities` last: one Concept
node per entity synset (id `entity-<synsetId>`, e.g.
`entity-wn-n09295833`), one node per class/ancestor synset,
an IS_A edge with aspect "instance" from each entity to each
of its classes, and IS_A edges up the classes' hypernym
chains — the same edge shape src/wordnet.ts's `mergeWordNet`
gives instance relations on the base layer. Per the design
record's knowledge-as-associations law, the type is a
relation between concepts and lives in the graph as edges;
the gloss is a value the entity carries and lives in the
node's properties. The fork graph goes from its former size
to **9,546 nodes / 10,512 edges**; the suite's wall time did
not grow (5m55 against the baseline's 6m10 on the same
machine).

**Name collisions (`src/graph.ts`).** The first full-suite
run of this slice failed five tests (the S4 referent test and
the Normalcy unanchored-definite specimens), and the cause is
recorded here because it shaped the design: the furniture
synset "table" (wn-n04443959) stands in the class chain of
table-shaped entities, so the merge added a class node named
"table", and checks that read a `nodeByName` hit as "the
graph holds this kind" — the unanchored-definite check above
all — stopped asking after the referent of "the table". An
entity or its class can share a name with an ordinary concept
("turkey" names a country and a bird), so entity and class
nodes are **never name referents**: `Graph.nodeByName` skips
nodes carrying the entity/entityClass property flags, the
nodes stand in the graph by id and edge, and `lookupEntity`
is the entities' name index — the one path that resolves a
name to its grounded entity. A test pins both halves
(`nodeByName("table")` and `nodeByName("oklahoma")` return
nothing; "Is the table cold?" again answers "What table? You
just started talking.").

**The answers (`src/ansci/turn.ts`).** Three sites, all
reading the one grounding:

- *The entity answer.* In `answerPredicateQuestion`, a
  what-is question (the predicate is the question word
  itself) whose subject is a grounded entity and not a
  classified concept is answered from the record: the name
  predicated with its gloss — "Oklahoma is a state in south
  central United States." The trace carries `entityAnswer`
  (subject, name, synsetId, classes, ground), the settlement
  discharges the answer need through `handAnswered` like the
  definitional answer's, and the schematic walk runs through
  the correspondence graph to the Verbalizer. The wording is
  the synset's own gloss, verbatim — including its semicolons
  (Texas, Paris below); no prose was written for any entity.
- *The fallthrough decline.* An unrouted question about a
  grounded entity ("where is oklahoma?") no longer claims
  nothing is held: the decline names what IS held (the gloss,
  the synset, the provenance) and locates the gap past it —
  knowledge beyond the entity's gloss and type.
- *The missing-piece text.* A quality question about a
  grounded entity ("is oklahoma a state?") likewise no longer
  says "I have nothing on oklahoma in my notes"; it says what
  is held and that nothing connects it to the asked quality.
  Answering the type-check itself from the instance edge is a
  later slice's shape, not this one's — the gap stays located
  here rather than papered over.

## Acceptance (probe harness pattern, fresh store-less sessions, this tree's dist)

Verbatim replies, one pass:

| Input | Reply |
|---|---|
| what is oklahoma? | "Oklahoma is a state in south central United States." |
| what is texas? | "Texas is the second largest state; located in southwestern United States on the Gulf of Mexico." |
| what is paris? | "Paris is the capital and largest city of France; and international center of culture and commerce." |
| what is atlantis? | "I can't answer that from what I know: I have nothing on atlantis in my notes, and I have no way to connect anything to 'what'." |
| where is oklahoma? | "I can't answer that from what I know: I have oklahoma as a state in south central United States, but nothing in what I know answers that." |
| is oklahoma a state? | "I can't answer that from what I know: I have oklahoma in my notes as a state in south central United States, but nothing that connects it to 'state', and I have no way to connect anything to 'state'." |
| what is blorptown? | "Could you put that another way?" (unchanged: an unattested word, the pre-existing repair path) |

Atlantis is the honest edge made visible: it is in the
extract and capitalised, but its synset carries no instance
edge (a legendary island filed as a regular noun synset), so
it is not grounded and still declines, located at the name —
grounding did not make every capitalised word "known".
Controls behaved as at baseline ("who are you?", "what can
you do?", "how are you?" all answer as before). The same
turns are pinned in `test/ansci-entities.test.ts` (11 tests),
so the acceptance lives in the suite, not only in this run.

## Gates (delivered runs, this tree, after the final fix)

- Suite: **1063 pass, 0 fail** (ℹ tests 1066, ℹ skipped 3) —
  the baseline run on the unmodified tree was 1052 pass / 0
  fail (ℹ tests 1055, ℹ skipped 3); the difference is this
  slice's 11 new tests, and nothing else moved.
- Demo **29/29** (27 exact round-trips); holdout **80/80
  parsed** ON (OFF 54/80), flipped fail→success 26, **0 parse
  regressions, 0 round-trip regressions**.
- Sense sets **A 11/11 · B 5/6** — unchanged.
- `npm run ai:check` OK (89 nodes, 22 cords, layout covers
  89 nodes).

## What this does not show

The grounding answers *what a named entity is* — gloss and
type — and nothing more, because that is all the extract
holds for an instance. "Where is oklahoma?" still declines:
the system holds no place facts, and the gloss's rough
geography ("south central United States") is quoted in the
decline as what is held, not dressed up as a location answer.
The Wikidata intake the erratum schedules as a later slice
(item→synset join, place-association requirement, banked with
provenance) is where place knowledge would come from; it is
not stubbed here, it is simply not this slice. Multiword
names ("New York") are grounded in the store but unreachable
as question subjects — the parser routes "new" as the clause
root, a pre-existing parse limitation this slice does not
touch. Where a lemma names both an instance synset and other
senses, the what-is answer takes the instance record in
extract order (Chicago answers as the city, its instance
sense; the card-game sense is a different synset and is not
the entity) — stated here as the slice's rule, not hidden in
the lookup. Nobody independent has checked any of this; it is
one build, one gate pass, on one commit.
