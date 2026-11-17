# QuantificationUnit

- **Schematic address:** `ontology-core/ontology-knowledge-unit/quantification-unit` — inside the Ontology Knowledge Unit, over its Numbers slice (owner's placement, 2026-11-17)
- **Type:** Unit
- **State:** partial — **45% completed to goal** (set by us, assessed by the project, not measured or computed). Built 2026-11-17: `src/fork/quantification.ts` reads the OKU Numbers slice, runs the Session-held quantity ledger (stated records, transfer/gain deltas, inconsistency flags), files the construction-implied counts, and holds the Luoshu as built-in machinery. Its one conversation reader is live: the how-many reader in the turn loop answers from the ledger. No larger-graph reach is built (it does not yet walk the OKU's graph from a number's phase, as the EDU walks from an emotion's), and the ledger's verbs are the ones the EN lexicon carries (have/buy/give — see the limits below).

## What this unit is

The owner's direction (2026-11-17): somewhere the system has to deal
with quantification, and a QuantificationUnit assists in tracking
these things. Its home is **inside the Ontology Knowledge Unit**
(owner's correction, 2026-11-17, superseding an earlier System-level
seat): it lives in the OKU, over the **Numbers slice**, alongside the
correspondence graph and the classification table. The relationship
to the Numbers is **containment**, not just a link.

**The EDU/SenseUnit pattern holds:** the unit is the specialist
reader of its OKU slice and keeps **no private number lore**. What
the tradition files about numbers lives in the OKU — today, Suwen
ch. 4's number row, banked through the ingestion pipeline in the
senses arc's data pass （其數八/七/五/九/六 for Wood/Fire/Earth/
Metal/Water; `INGESTED_ASSERTIONS_CH4_NUMBERS` in
`src/fork/ingested.ts`). Numbers the slice does not file (1, 2, 3,
4, 10, …) have **no reading** — the absence is the record, and no
phase is invented for them.

## The three jobs

1. **Read** — quantities stated ("I have 5 apples") and implied
   ("between" implies **two** bathrooms). The language side of
   reading is the QuantificationLanguageUnit's, in the LPU; this
   unit files what a construction implies (`IMPLIED_COUNTS`:
   between→exactly 2, both→2, pair→2, another→+1, a bare
   plural→at least 2 with the exact count an unknown, a/an→1).
   The between case is already realised in the scene graph: two
   distinct entities (`bathroom-1`, `bathroom-2`), not one plural
   node.
2. **Track** — a quantity ledger **held on the Session**
   (`session.quantities`; the state is the conversation's, not
   the unit's, as the scene graphs are). A record per (holder,
   kind): amount (or `null` — a **bounded unknown**, "some", a
   bare plural: a bound, not a number), unit, quantifier, tier
   (**said** / **derived**), turn, basis. Records are appended,
   never edited; the latest record for a (holder, kind) is the
   current amount. Events change it as **derived** records:
   purchases (gains, or transfers out of a tracked stock —
   "Sally bought 3 of them"), gifts (transfers). A transfer is
   atomic: if the source cannot cover it, **neither leg applies**.
3. **Compute** — how-many answers are read off the tracked state
   (5 − 3 = 2, computed by the ledger, not re-derived from the
   sentences), and impossible quantities are caught: a delta
   larger than the tracked amount is **flagged** as an
   inconsistency on `session.quantityFlags` and not applied —
   never silently negative; a delta against a bounded-unknown
   amount is flagged as unbounded likewise.

### The worked specimen (owner, 2026-11-17) — verbatim, passing

- "I have 5 apples." → stated: you : apple = 5 (said; the
  amount 5 carries its OKU Numbers reading, five → Earth).
- "Sally bought 3 of them." → transfer: you : apple 5 → 2,
  sally : apple 0 → 3 (derived).
- "How many do I have left?" → **"You have two apples left."** —
  read from the ledger's current record.

All three sentences survive the sentence layer as said, so the
specimen stands here as the design's worked case, pinned verbatim
in `test/fork-quantification.test.ts` — not as a parse gap. (The
sentence layer's own event record misreads turn 2's agent in its
reply wording — "You bought the 3" — a standing quirk of the
probe's steering, outside this unit; the ledger reads the parse's
agent, sally, directly.)

## The Luoshu, built in

The 洛書 (Luòshū, "Luo River writing") 3×3 magic square is
machinery **inside this unit** (owner, 2026-11-17): numbers 1–9
in the nine palaces （九宮）, south at the top — 4 9 2 / 3 5 7 /
8 1 6 — every row, column and diagonal summing to **15**, 5 at
the centre. The unit answers `luoshuNumberAt(palace)` /
`luoshuPalaceOf(number)`, exposes the invariant as a checkable
computation (`luoshuLineSums`), and holds the centre-out flight
path (5→6→7→8→9→1→2→3→4). The square is the unit's working
apparatus, **distinct** from the OKU Numbers slice it reads:
filed correspondences live in the OKU; the square lives here.

### Labelled tension — kept, not harmonised

The Suwen ch. 4 number row files Wood's number as **8** (the
completion number of the 3/8 pair) for the east. The Luoshu
places **3** in the east palace and **8** in the north-east.
Two attested arrangements of the same numbers, kept as two:
`numberReading()` speaks for the OKU slice, the Luoshu
functions for the square, and neither is rewritten in the
other's terms.

## Limits, stated plainly

- **Delta verbs are the EN lexicon's**: have, buy, give (checked
  against `sentence.ts`, 2026-11-17). *Take* and *eat* exist
  only on the Chinese side of the lexicon, so no delta is wired
  for them in English and no behaviour is claimed.
- **Pronoun-stock kind resolution is a heuristic**: "3 of them"
  draws on the kind another holder tracks (the most recent such
  record). It is named in the code as a heuristic, not dressed
  as reference resolution.
- **Compound number words are not composed** ("twenty five" is
  two nodes to the parser); the bridge reads one..twenty,
  hundred, thousand standing alone, and digit strings.
- The ledger tracks counts of kinds for holders. It does not
  yet price quantities into Coherence demands (a flagged
  inconsistency is recorded, not yet spoken about), and reply
  objects carry no quantity mentions in v1.

## Who uses it / who it uses

- **Uses:** the OKU Numbers slice (the ingested number row),
  by containment — this unit sits in the OKU over it.
- **Used by:** the QuantificationLanguageUnit
  (`lpu/quantification-language-unit`) — the "uses" cord on the
  map; and, through the ledger, the turn loop's how-many reader.
- **Contains:** the UnitsMeasurement Unit
  (`…/quantification-unit/units-measurement-unit`).

## Where the working code lives today

`src/fork/quantification.ts` (built 2026-11-17), over the ledger
state in `src/fork/session.ts` and the Numbers slice in
`src/fork/ingested.ts`. Before that, quantities existed only as
numeral nodes in parses — counted by nobody, tracked nowhere.
