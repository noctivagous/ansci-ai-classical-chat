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
- **Timekeeping** — `functions/timekeeping` — the time resource
  (placed and first slice built 2026-11-20, Time programme T1):
  clock readings as consultations (a reading is a retrieved fact
  and warrants the turn it was taken in) and staleness asked
  uniformly of every bank. Scheduling, Expectation, Calendar and
  Timeline are proposed beside it in the time design note
  (`docs/ansci/time-scheduling-design-note.md`) and take their
  seats as their slices land.
- **Scheduling** — `functions/scheduling` — commitments held as
  records (built 2026-11-20, Time programme T2): a session-scoped
  register of scheduled items, the turn-boundary opening sweep
  that raises due demands for the Planner to price (registration
  is not authorisation), and scheduled re-consultation as the
  one wired consumer.
- **Expectation** — `functions/expectation` — the waiting
  resource (built 2026-11-20, Time programme T3), chartered
  jointly with the lack machinery: a watch over a problem
  record, its satisfier stated checkably, satisfaction routed
  through the gates (never admitted by being waited for), and
  timeout kept as information.
- **Calendar** — `functions/calendar` — the grid (built
  2026-11-20, Time programme C1): date systems held as
  knowledge in a systems register (Gregorian, ISO, Julian in
  C1), conversion between held systems as computation under
  the derived provenance kind, and grid arithmetic distinct
  from duration arithmetic — the Calendrical Calculations
  port.
- **Timeline** — `functions/timeline` — the line (built
  2026-11-20, Time programme C3): Timeline objects for the
  three owner kinds (the conversation's own first), Allen's
  interval algebra ported (thirteen relations, composition
  table as data), durations read off the line, and
  Scheduling's placement fields made live alongside.

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
