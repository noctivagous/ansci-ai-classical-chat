# Current Activity

Schematic address: `awareness/current-activity` · Type: Container · State: partial · 30% completed to goal

What is happening right now.

Working code today: —

Holds:
- `awareness/current-activity/composer` — Composer (module file: `composer.ts`)
- `awareness/current-activity/situation-statement` — Situation statement (module file: `situation-statement.ts`)
- `awareness/current-activity/last-act` — Last act (module file: `last-act.ts`)
- `awareness/current-activity/open-gaps` — Open gaps (module file: `open-gaps.ts`)

This is a placeholder: the unit's home in ai-system/ exists so the tree and the map agree. Its implementation migrates or is built here in a gated slice; until then the working code stays where PLACEHOLDER.md says it is.

**Open gaps reads the scene unknowns (2026-11-17).** The Open gaps
register's picture of what is currently missing includes the
conversation's open scene unknowns — facts about established scene
entities that no turn has supplied (the airport's city). Those slots
live on the scene graphs in Session's storage and are registered at
`session-and-situation/open-unknowns`; Open gaps **reads from that
register** and does not own the slots. The read relationship is
documented here and in the Open Unknowns placeholder; no Awareness
machinery for it is built in this arc.
