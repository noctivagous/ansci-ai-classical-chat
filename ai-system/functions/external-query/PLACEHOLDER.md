# ExternalQuery

- **Schematic address:** `functions/external-query` — inside the Functions Unit
- **Type:** Unit
- **State:** placeholder — **0% completed to goal** (set by us, assessed by the project, not measured or computed). Placeholder seat placed 2026-11-19. Nothing is built.

## What stands here

The owner's direction (2026-11-19): an **ExternalQuery** unit inside
the Functions Unit, providing **resources for querying anything on
the web**.

The generic notion: the machinery of putting a question to something
outside the system, held once, in common form —

- **State a query** — what is asked, in what terms, against what kind
  of source, and what shape of answer is wanted.
- **Dispatch it** — to the source the query names, by the means that
  source takes.
- **Receive the result** — in a declared common shape, with its source
  named, so a caller can weigh where an answer came from.

A reference work, a catalogue, a live service and a public page are
all just sources a query can be put to. The unit knows nothing of what
is being queried and nothing of what an answer means; that belongs to
the caller.

It is **not data-specific**: no query here is written for one source
or one kind of content.

## The standing boundary

This unit supplies **querying machinery only**. What may enter the
system as knowledge, and under what standing, remains Intake's and the
gate's to decide — a result returned by a query is not testimony
admitted, and nothing here bypasses that.

## What is deliberately not here yet

- **No query machinery built, no source wired.** Which query forms
  belong here, and how a source's own way of being asked is adapted to
  the common form, is a design question for a later slice.
- **No caller wired.** Web consultation done today — Intake's Web
  source and live consultation with declared standing — stays where
  it is; this seat does not claim it.
- **The one working instance-in-effect.** The Wikidata adapter's
  fetch half — resolving an entity to its item and fetching it from
  the Action API — *is* this unit's machinery in source-specific
  form, and it is the only working web-querying in the system today.
  Per the owner's ruling (2026-11-19) the adapter is **not moved**
  here: the adapter as a whole is an Intake unit (its translation
  and banking half admits material as knowledge, which this unit by
  its charter does not do), so it stays at `intake/wikidata`,
  unmoved and unclaimed by this seat. When ExternalQuery gets its
  design slice, that fetch layer is the first thing re-expressed in
  the generic form.
