# FileSystem

- **Schematic address:** `capabilities/file-system` — inside the Capabilities Unit
- **Type:** Unit
- **State:** placeholder — **0% completed to goal** (set by us, assessed by the project, not measured or computed). Placeholder seat placed 2026-11-19. Nothing is built.

## What stands here

The owner's direction (2026-11-19): a **FileSystem** unit inside the
Capabilities Unit.

The generic notion: a file system is **a tree of named places holding
content** — directories that hold files and further directories,
addressed by paths. The operations that go with such a tree, held
once, generically:

- **Name and resolve** — a path picks out a place; a place can be
  asked for its own path, its parent, and what stands under it.
- **List** — what a place holds.
- **Read and write** — the content at a place, taken in or put down
  whole.
- **Create and remove** — places and content.
- **Move and copy** — content or a whole place, from one place to
  another.
- **Ask what stands there** — whether anything is at a path, what kind
  of thing it is, how large it is, when it changed.

The unit knows nothing of what any file contains or means. A document,
a data bundle and a program are all just content at a place; what the
content *is* belongs to the units that own it.

It is **not data-specific**: no operation here knows what kind of file
it is handling.

## What is deliberately not here yet

- **No operation implemented.** The system's code reads and writes
  files in place today, inside the units that needed it. None of that
  access is moved, wrapped or claimed by this seat; adopting these
  operations is later work, on the owner's commission.
- **No policy.** What may be read, written or trusted, and where, is
  not this unit's to decide — it supplies the machinery, not the
  permissions.
