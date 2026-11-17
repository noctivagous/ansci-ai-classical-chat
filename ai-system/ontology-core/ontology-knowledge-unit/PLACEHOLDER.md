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

## Where the working code lives today

`src/fork/classify.ts` (the table and its consumers) and the foundation
graph (`src/graph.ts`, `src/seed.ts`). The turn loop's trace path names the
correspondence graph at this address.
