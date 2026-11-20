# Functions Unit

- **Schematic address:** `capabilities` — top level of the System, underneath the OntologyCore
- **Type:** Unit
- **State:** placeholder — **0% completed to goal** (set by us, assessed by the project, not measured or computed). Placeholder seats placed 2026-11-19. Nothing is designed beyond the statement below and nothing is built.

## What stands here

The owner's direction (2026-11-19): a Functions Unit at the top level
of the map, holding **generic resource units** — machinery the rest of
the system draws on, defined once over abstract material and used
everywhere, **not data-specific**.

The unit owns no data of its own and knows nothing of what the material
it operates on means. A caller supplies the material and the terms; the
capabilities supply the operations. Nothing here is about words,
quantities, emotions or any other particular content of the system —
those stay in the units that own them.

## Placed inside

- **Ordering And Sorting** — `functions/ordering-and-sorting` —
  the algorithms that sort and order data of different types, over
  elements plus an ordering.
- **Search** — `functions/search` — generic search, over a space
  plus a criterion.
- **Editing** — `functions/editing` — the generic editing notions
  that go with anything that bears ranges: ranges, trim, roll edit,
  and the rest, alike for strings, media data, and any other
  range-bearing material.
- **ExternalQuery** — `functions/external-query` — resources for
  querying anything on the web: a query stated in common form,
  dispatched to the source it names, its result received in a declared
  common shape with its source named.
- **FileSystem** — `functions/file-system` — the generic
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

## What this unit is — and is not (owner's discussion, 2026-11-20)

This unit was placed as the **Capabilities Unit** (2026-11-19) and
renamed the **Functions Unit** the next day, when the owner separated
two jobs the word "capability" was doing:

- **The library of operations — this unit.** Generic functions over
  abstract material, called mid-step inside larger processes (a step
  of a problem-solving walk needs a search, an ordering, an edit, a
  query, a file operation). A function takes material and returns
  material; it knows nothing, decides nothing, testifies to nothing.
- **The inventory of holdings — not this unit.** What the system can
  actually do spans many units: the OKU's mathematics, quantification
  and geometry, the nets' knowledge, the session record, consultation
  through Intake. That inventory is answered by a **capability
  registry held as data**: every built operation registers itself
  (name, what it takes, what it returns), wherever it lives. A
  placeholder seat — including every seat in this unit today — is
  explicitly **not** a holding.

**The per-step gate (designed, not built).** A problem-solving step
declares its requirement in the registry's terms. The check runs the
registry and the distributed holdings in order; where the requirement
is a generic operation, the gate's question is the owner's: *"Do I
need anything from the Functions Unit?"* A lack is declared only on
that audit, located at the step and, where a seat exists but is
unbuilt, at that seat; a requirement with no seat anywhere is an
unlocated lack — a new-seat question for the owner, not a silent
failure. The audit trail (what was checked) is part of the failure
record the ErrorFailure Unit accounts from.
