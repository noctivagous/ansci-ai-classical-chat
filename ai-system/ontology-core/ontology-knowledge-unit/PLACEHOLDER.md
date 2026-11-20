# Ontology Knowledge Unit (OKU)

- **Schematic address:** `ontology-core/ontology-knowledge-unit`
- **Type:** Unit
- **State:** partial — **60% completed to goal** (set by us, assessed by the project, not measured or computed)

## What this unit is

The owner's direction (2026-11-16): "A OKU, Ontology Knowledge Unit will
live in the OntologyCore and it will contain the Correspondence graph and
Classification table."

The OKU is the OntologyCore's knowledge unit: the system's ontology as
held, consultable knowledge.

## What it contains

- **Correspondence graph** (Store, 75%) — the meaning graph: correspondences,
  with the generating and controlling cycles as its relations.
- **Classification** (Table, 60%) — the classification table: (concept,
  aspect) assertions with provenance and confidence; 164 entries.

Both moved here from Knowledge on 2026-11-16. Knowledge keeps the lexicon,
the variant graph and the banked stores.

## Its resident unit (2026-11-17)

The OKU also holds the **Numbers slice** — the classical number
correspondences, whose first deposit is Suwen ch. 4's number row
（其數八/七/五/九/六 for Wood/Fire/Earth/Metal/Water), banked in the
ingested store (`src/fork/ingested.ts`,
`INGESTED_ASSERTIONS_CH4_NUMBERS`) — and, since 2026-11-17, an active
unit of its own living over that slice: the **QuantificationUnit**
(45%), the slice's specialist reader, with the **UnitsMeasurement Unit**
(50%) nested inside it. Language reaches them through the LPU's
QuantificationLanguageUnit. Since 2026-11-19 the QuantificationUnit
stands one level down, inside **Mathematics**
(`ontology-core/ontology-knowledge-unit/mathematics`) — the larger
unit the owner ruled (2026-11-18) to hold the Quantification Unit and
the **Geometry Unit** together, the two to work with each other; the
Geometry Unit stands there as a placeholder seat, its contents not
yet stated. The QuantificationUnit's address is now
`ontology-core/ontology-knowledge-unit/mathematics/quantification-unit`. The QuantificationUnit keeps no private
number lore: the filed numbers live here, in the OKU; the unit holds
the machinery (the ledger operations, the implied counts, the
Luoshu).

## Its newest resident unit (2026-11-19)

The **ParamorphicConcept Unit**
(`ontology-core/ontology-knowledge-unit/paramorphic-concept-unit`,
placeholder, 0%) — the owner's ruling, 2026-11-19: all paramorphic
concepts are in a ParamorphicConcept Unit in the OKU. It holds the six
concepts of the paramorphic-components record — Grid, Graph, Tree,
Path, Protocol, Logic — as a registry of data (substrate, parameters,
shared operations, the system's instances, invariants) in
`src/fork/paramorphic-concepts.ts`. The instances (this unit's own
correspondence graph and classification table among them) stay where
they live; nothing is moved, and no engine runs yet.

## Where the working code lives today

`src/fork/classify.ts` (the table and its consumers) and the foundation
graph (`src/graph.ts`, `src/seed.ts`). The turn loop's trace path names the
correspondence graph at this address.
