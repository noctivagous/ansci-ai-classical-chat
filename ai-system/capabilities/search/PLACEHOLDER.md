# Search

- **Schematic address:** `capabilities/search` — inside the Capabilities Unit
- **Type:** Unit
- **State:** placeholder — **0% completed to goal** (set by us, assessed by the project, not measured or computed). Placeholder seat placed 2026-11-19. Nothing is built.

## What stands here

The owner's direction (2026-11-19): a generic **Search** unit inside
the Capabilities Unit.

The generic notion: the operations are defined over **a space plus a
criterion** — find by key or by predicate, match a pattern, traverse a
structure, return the best or nearest candidate under a supplied
measure. The caller supplies the space, the criterion, and what counts
as found; the unit supplies the machinery. A sequence, a table, a graph
and a store are all just spaces to search.

It is **not data-specific**: no search here knows what it is searching,
and what a result *means* belongs to the caller, never to this unit.

## What is deliberately not here yet

- **No algorithm banked.** Which search machinery belongs here, and in
  what form, is a design question for a later slice.
- **No caller wired.** Searching done today inside other units — the
  lexicon lookups, the graph walks, the retrieval pipeline — stays
  where it is and keeps its own meaning; this seat does not claim it.
