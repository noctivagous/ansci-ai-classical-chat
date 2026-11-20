# Editing

- **Schematic address:** `capabilities/editing` — inside the Capabilities Unit
- **Type:** Unit
- **State:** placeholder — **0% completed to goal** (set by us, assessed by the project, not measured or computed). Placeholder seat placed 2026-11-19. Nothing is built.

## What stands here

The owner's direction (2026-11-19): an **Editing** unit inside the
Capabilities Unit, holding the generic notion that goes along with
editing anything — with **ranges, trim, roll edit, etc.** — alike for
strings, media data, and any other range-bearing material.

The generic notion: the operations are defined over **ranges of an
abstract range-bearing material**:

- **Range** — a bounded stretch of the material, addressed by its
  ends, that operations act on as one thing.
- **Insert / delete / replace** — within a range, or at a point.
- **Trim** — shorten a range from its head or its tail.
- **Roll edit** — move a boundary shared by two adjacent ranges, so
  one grows and the other shrinks by the same amount and the whole is
  preserved.
- **Split / join** — divide the material at a point, or unite adjacent
  ranges into one.
- **Move / copy** — take a range out and place it elsewhere, or place
  a copy of it.

A string, a media timeline and a token sequence are **instances** of
the material, not cases in the code: the unit holds no string-specific
and no media-specific editing, and knows nothing of what the ranges are
ranges of. What an edit *means* — what the material is, what may be cut
and what may not — belongs to the unit that owns the material.

## What is deliberately not here yet

- **No operation implemented.** The vocabulary above is the owner's
  statement of the notion, not a design: signatures, invariants and
  the treatment of overlapping or nested ranges are for a later slice.
- **No caller wired.** Editing done today inside other units stays
  where it is until a slice adopts this unit's operations, on the
  owner's commission.
