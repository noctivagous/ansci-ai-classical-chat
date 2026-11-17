# ai-system/ — the system's working directory

This directory is organised as the schematic map is drawn: every box
on the map is a node here, every node is a place in this tree, and a
trace through the map is a walk over these directories. It replaces
`src/fork/` as the project's working directory; `src/fork/` stays as
the reference implementation until each unit's replacement lands.

Three files keep the map and the code the same thing:

- `system-map.ts` — what exists: every node (id = its path), its
  module type, its state and percent completed to goal, the cords between
  nodes, and the named traces. The displayed map is drawn from this
  file.
- `system-layout.ts` — presentation only: each node's order among its
  siblings and any column/row placement. Rearranging the map means
  editing this file and nothing else.
- `check-map.mjs` — the correspondence gate (`npm run ai:check`):
  registry, layout and directory tree must agree, states must match
  percents, and every cord and trace step must name a real node.

State is read off percent completed to goal: 0 = placeholder (scaffold
only — the unit's PLACEHOLDER.md says where the working code lives
today), 1–99 = partial, 100 = functional. External sources (person,
clock, weather) carry no percent.

Migration proceeds unit by unit in gated slices: a unit's fork code
moves or is rebuilt here, its percent rises as the gates pass, and
the map — drawn from the registry — shows it happen.
