# Ordering And Sorting

- **Schematic address:** `capabilities/ordering-and-sorting` — inside the Capabilities Unit
- **Type:** Unit
- **State:** placeholder — **0% completed to goal** (set by us, assessed by the project, not measured or computed). Placeholder seat placed 2026-11-19. Nothing is built.

## What stands here

The owner's direction (2026-11-19): a place in the Capabilities Unit
for **algorithms to sort and order data of different types**.

The generic notion: the operations are defined over **elements plus an
ordering** — a comparator, a key, a ranking, a partial order. Sorting,
ordering by a supplied key, ranking, and ordering under a partial order
are the one machinery, whatever the elements are. The caller supplies
the elements and the terms of the ordering (stability, how ties stand,
ascending or descending, total or partial); the unit supplies the
algorithms.

It is **not data-specific**: no sort here knows what it is sorting.
Words, records, candidates, quantities and priced claims are all just
elements under an ordering a caller declared.

## What is deliberately not here yet

- **No algorithm banked.** Which algorithms belong here, and in what
  form, is a design question for a later slice.
- **No caller wired.** Sorting and ordering done today inside other
  units stays where it is until a slice moves or re-expresses it, on
  the owner's commission.
