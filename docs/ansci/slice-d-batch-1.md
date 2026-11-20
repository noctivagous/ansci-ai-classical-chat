# Slice D — batch 1 (PROPOSAL, awaiting the owner's tiered review)

Per-word overlay mappings, prepared 2026-11-18 under the
sequence authorization and Slice D's pre-rulings
(`slice-d-pre-rulings.md`, coverage measurement folder):

- **1b, tiered review.** Every proposal below carries a recorded
  rationale (in-loop review). Items that conflict with a
  registered heuristic, or where the proposer's confidence is
  low, are **contested** and listed separately for the owner's
  personal review. A blind sample of the clean items is drawn
  for the owner to file independently; a batch bounces if its
  sample error rate exceeds the bar.
- **2a, standing.** Overlay entries carry their own provenance
  (the derived tier), confidence capped at 0.80, reviewer and
  rationale recorded per entry.
- **3a, fill-only.** An overlay entry speaks only where the
  curated table and the climb are both silent. It never
  overrides either.
- **4a, scope.** Real-vocabulary leftovers only,
  high-occurrence first. Batch size was left unruled; this batch
  proposes **25 clean + 10 contested**.

Nothing in this document is in the code yet. The overlay module
is built, and the approved entries land in it, after this review
returns — the pause is the owner's seat in the process, per the
sequence authorization.

## The population, accounted

Slice C's split left **279 real-vocabulary B-unknown tokens**
(500-object corpus and holdout sources; the 1,488 test-suite-only
tokens are out of scope under 4a). They fall into:

- **~55 animal words** (badger, tiger, tortoise, penguin, …) —
  not D's. They are B in this tree only because Slice A's batch
  has not landed here; A's creature stops classify them, and the
  ones A leaves (frog, toad, spider, silkworm, …) are A's
  located gaps under its ruling 3a. An overlay entry for any of
  them would either collide with A or paper over its gap.
- **Batch 1: 35 words** (25 clean + 10 contested, below).
- **The rest (~190)** — no defensible per-word rationale exists
  today, and D does not force coverage: proper nouns (sarah,
  chicago, oklahoma), conversation words (people, brother,
  someone, mother), sentence fragments and gerunds (making,
  used, meant, bringing), meta-vocabulary (classifications,
  attestation, outcome), generic heads (substances, materials,
  components), artifacts whose element is a per-object
  composition question under H5 (rope, tent, umbrella,
  chopsticks, anvil), living plants and flowers whose calls
  were per-object in the pilot (lotus, peony, chrysanthemum),
  and preparations/animal products R3 teaches abstention on
  beyond the contested few named below.

## Clean proposals (25)

Reviewer for every entry: Kavi (in-loop), rationale as recorded.
Aspect is "overall" throughout; provenance will be the overlay's
own (derived tier).

| # | word | → | conf | rationale |
|---|---|---|---|---|
| 1 | fire | Fire | 0.80 | The phase's namesake phenomenon (combustion sense). Slice B took water → Water on the same ground; the table's silence on this lemma is a keying gap, not a judgment. 31 occurrences, the population's highest. |
| 2 | hemp | Wood | 0.60 | A plant fibre. The pilot's paper row (Wood · C 0.60, "constitutively plant fibre") is the precedent. |
| 3 | ceramic | Earth | 0.55 | Fired clay ware; the material is earth, the firing a preparation — priced a step under the stone-class flat 0.60 for the preparation. |
| 4 | cinnabar | Earth | 0.60 | A mineral （朱砂）; stone class under R3. Its WordNet chain runs through the moth sense's family and never reaches the rock stop. |
| 5 | cotton | Wood | 0.60 | A plant fibre (paper precedent). |
| 6 | lacquer | Wood | 0.45 | The pilot's own call (Wood · C 0.45, "a tree sap, prepared"). Below the join's 0.6 gate — recorded knowledge, inert in arbitration unless support raises it; the honest grade is not inflated to clear the gate. |
| 7 | paper | Wood | 0.60 | The pilot's own call (Wood · C 0.60). The English word is unmapped; the climb cannot see composition. |
| 8 | resin | Wood | 0.45 | A tree exudate — the lacquer row's family and grade. Sub-gate, as lacquer. |
| 9 | agate | Earth | 0.60 | A mineral (quartz kind); stone class. |
| 10 | brick | Earth | 0.55 | Baked clay (its own gloss); earth worked by fire, preparation discount as ceramic. |
| 11 | cement | Earth | 0.55 | A mineral powder preparation; earth class by material, preparation discount. |
| 12 | ear | Water | 0.70 | The attested orifice correspondence: the kidney opens into the ear （腎開竅於耳）, kidney is Water. The table holds the correspondence under its own keys; the English word is unmapped. |
| 13 | hematite | Earth | 0.60 | An iron-ore mineral; stone class. |
| 14 | magnetite | Earth | 0.60 | An iron-ore mineral; stone class. |
| 15 | mica | Earth | 0.60 | A sheet mineral; stone class. |
| 16 | orpiment | Earth | 0.60 | A mineral pigment （雌黃）; stone class. |
| 17 | quartz | Earth | 0.60 | A rock-forming mineral (its own gloss); stone class. |
| 18 | realgar | Earth | 0.60 | A mineral pigment （雄黃）; stone class. |
| 19 | sulphur | Earth | 0.60 | The pilot's "a stone that burns" (Earth · C); stone class. |
| 20 | turquoise | Earth | 0.60 | A mineral gemstone; stone class. |
| 21 | lazuli | Earth | 0.60 | Lapis lazuli, a mineral pigment stone; stone class. |
| 22 | flax | Wood | 0.60 | A plant fibre (paper precedent). |
| 23 | linen | Wood | 0.60 | Flax fibre cloth; the fibre rationale carries it. |
| 24 | ramie | Wood | 0.60 | A plant fibre (paper precedent). |
| 25 | crystal | Earth | 0.55 | The mineral kind (quartz family). Its glass sense is the pilot's T4-by-composition call and is not what this entry claims; priced under the flat 0.60 for the sense spread. |

## Contested — for the owner's personal review (10)

Each carries the proposer's tentative call and why it is
contested. None lands without the owner's word on the item.

| word | tentative | why contested |
|---|---|---|
| silk | Wood 0.45 | An animal product (silkworm filament) — R3 abstains on animal products, and the silkworm is Slice A's located gap. The Wood pull is the mulberry/silkworm company it keeps in the corpus. Arguably abstention is the right filing. |
| leather | Earth 0.45 | A prepared animal skin. R3's abstention family; the climb's abstention tests pin leather as anchorless by design. An overlay call here revisits that discipline per-word — the owner's call to make. |
| wool | Fire 0.40 | An animal fibre; its animal (sheep) is Fire in the livestock table, but fibre-by-animal's-class is a rule nobody has registered. Low confidence. |
| sesame | Wood 0.50 | A seed in the grains' company （麻 among the five grains in some lists), but the table's grain rows are name-specific and sesame is not among the banked ones. Low confidence. |
| camphor | Wood 0.45 | A tree-derived extract; preparations and extracts are R3's abstention family, the lacquer precedent pulls the other way. |
| coal | Wood 0.45 | Carbonised plant matter by origin; a fuel by use, and fuels were named non-stops in Slice B's design on R3 discipline. Origin vs use is a genuine fork. |
| saltpeter | Earth 0.50 | A mineral salt; the stone class covers minerals, but salts sit beside the table's own salt entry (which the table owns under its key) — a per-word salt call risks a quiet second filing. Low confidence. |
| flu | Metal 0.50 | An illness; the table's illness precedent is cold → Metal under the illness aspect. This entry would need the illness aspect, and whether overlay entries may carry a non-overall aspect is undesigned. |
| ink | Earth 0.40 | Traditionally pine soot in glue — a preparation of mixed origin (plant soot, animal glue). Low confidence; abstention defensible. |
| beeswax | Earth 0.40 | An animal product; R3 abstention family. Tentative Earth only by the wax-as-substance reading. Low confidence. |

## Blind sample — for the owner to file independently

Drawn by rule (every 3rd clean item: #1, 4, 7, 10, 13, 16, 19,
22), shown with the WordNet gloss of the sense the proposal
rests on, proposals withheld:

1. **fire** — "the process of combustion of inflammable materials producing heat and light and (often) smoke"
2. **cinnabar** — "a heavy reddish mineral consisting of mercuric sulfide; the chief source of mercury"
3. **paper** — (the writing material; gloss not needed)
4. **brick** — "rectangular block of clay baked by the sun or in a kiln; used as a building or paving material"
5. **hematite** — (an iron-ore mineral)
6. **orpiment** — (a yellow mineral pigment)
7. **sulphur** — (a pale yellow nonmetallic element, found in earth in combination)
8. **flax** — (a plant fibre)

Proposed bar, for the owner to set or accept: an item counts as
a sample error when the owner's independent filing names a
different element than the proposal (or files where the
proposal abstains, or vice versa); **more than 1 error in 8
bounces the batch** back for re-review before anything lands.

## After the review

The owner returns: the sample filings (and the error count
against the bar), a ruling on each contested item, and any
corrections to the clean list. Then, and only then: the overlay
module is built (fill-only consultation after table and climb,
its own provenance, per-entry reviewer + rationale), batch 1's
approved entries land in it with tests (fill-only precedence
pinned: an overlay entry never fires where the table or the
climb speaks), the batch is gated like the other slices, and
the next batch is drawn from the remaining population.

## Review outcome (2026-11-18)

The owner asked for the sample explained, rulings on the
contested items, and corrections to the clean list, then
ratified the recommendations as a block ("rec"):

- **The blind sample was unblinded at the owner's request**
  and explained item by item (proposal, rationale, strongest
  counter). The error-count mechanism therefore did not run:
  the sample served as an explained spot-check, not an
  independent filing. Recorded here so no later reading of this
  batch claims a blind audit that did not happen.
- **Contested items — accepted (4):** camphor → Wood @0.45
  (the pilot's lacquer row covers it exactly) · coal → Wood
  @0.45 (the pilot filed charcoal, also a fuel, as Wood by
  constitution) · saltpeter → Earth @0.55 (a mined mineral,
  硝石, a substance in its own right) · flu → Metal @0.50
  under aspect "illness" (the table's cold precedent; the
  ruling also settles that overlay entries may carry a
  non-overall aspect where the rationale is aspect-bound).
- **Contested items — abstentions stand (6):** silk (R3's
  animal-product abstention + its producer is Slice A's located
  gap) · leather (Slice B's tests pin it anchorless by design —
  a ruling already made, not a gap) · wool (its only rationale
  is an unregistered producer-class rule) · sesame (the
  grain-list 麻 names hemp, already filed on its own merits) ·
  ink (a mixed-origin preparation; waits for a composition
  record) · beeswax (an animal product no precedent pulls in).
- **Clean 25 — no item withdrawn, no element changed.** Two
  notes recorded: crystal's rationale is doubly routed (the
  mineral kind by stone class; crystal glass by the pilot's
  glass-by-composition call), and fire @0.80 stands at the cap
  on the owner's explicit ruling (decision 2a).
- **Build:** the overlay module (src/ansci/overlay.ts) landed
  with the 29 ratified entries; the join consults it last in
  deriveSentence; "overlay" prices at the derived tier. Gates
  and figures are in docs/ansci/slice-d-report.md.
