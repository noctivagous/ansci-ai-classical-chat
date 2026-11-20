# Capabilities Unit

- **Schematic address:** `capabilities` — top level of the System, underneath the OntologyCore
- **Type:** Unit
- **State:** placeholder — **0% completed to goal** (set by us, assessed by the project, not measured or computed). Placeholder seats placed 2026-11-19. Nothing is designed beyond the statement below and nothing is built.

## What stands here

The owner's direction (2026-11-19): a Capabilities Unit at the top level
of the map, holding **generic resource units** — machinery the rest of
the system draws on, defined once over abstract material and used
everywhere, **not data-specific**.

The unit owns no data of its own and knows nothing of what the material
it operates on means. A caller supplies the material and the terms; the
capabilities supply the operations. Nothing here is about words,
quantities, emotions or any other particular content of the system —
those stay in the units that own them.

## Placed inside

- **Ordering And Sorting** — `capabilities/ordering-and-sorting` —
  the algorithms that sort and order data of different types, over
  elements plus an ordering.
- **Search** — `capabilities/search` — generic search, over a space
  plus a criterion.
- **Editing** — `capabilities/editing` — the generic editing notions
  that go with anything that bears ranges: ranges, trim, roll edit,
  and the rest, alike for strings, media data, and any other
  range-bearing material.
- **ExternalQuery** — `capabilities/external-query` — resources for
  querying anything on the web: a query stated in common form,
  dispatched to the source it names, its result received in a declared
  common shape with its source named.
- **FileSystem** — `capabilities/file-system` — the generic
  operations over a tree of named places holding content: paths,
  listing, reading and writing, creating and removing, moving and
  copying, asking what stands at a path.

## What is deliberately not here yet

- **No algorithms banked, no callers wired.** Existing code elsewhere
  in the system sorts, searches and edits in place, inside the units
  that needed it. None of it is moved, re-expressed or rewired by this
  placement; drawing it together under these units is later work, on
  the owner's commission, slice by slice.
- **No data-specific variants.** If an operation turns out to need
  knowledge of a particular kind of data, that part belongs to the
  unit that owns the data — this unit keeps only the generic notion.
