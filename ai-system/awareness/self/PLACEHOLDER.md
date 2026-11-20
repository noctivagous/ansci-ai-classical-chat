# Self

Schematic address: `awareness/self` · Type: Container · State: partial · 25% completed to goal

The system's picture of itself.

Two of its tables were built on 2026-11-18 (Social Unit S3), as data in `src/ansci/`: the Identity table (`src/ansci/identity.ts` — the name AnSci and the kind line) and the Capabilities & limits table (`src/ansci/capabilities.ts` — what the system can and cannot do, as plain first-person sentences). They are the one source for those facts: the Social Unit requests them when a self-query arrives and holds no copy. Their text is configuration — the design's draft content stands in them, and the final wording of any visitor-facing claim about the system is the owner's to settle there.

Working code today: `src/ansci/identity.ts`, `src/ansci/capabilities.ts` (the two tables); Disposition and Own state as their own nodes record.

Holds:
- `awareness/self/identity` — Identity (module file: `identity.ts`)
- `awareness/self/capabilities` — Capabilities & limits (module file: `capabilities.ts`)
- `awareness/self/disposition` — Current disposition (module file: `disposition.ts`)
- `awareness/self/own-state` — Own state (module file: `own-state.ts`)
