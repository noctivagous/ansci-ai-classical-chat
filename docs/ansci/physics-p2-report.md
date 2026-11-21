# Physics P2 — held material readings (build report)

*Built 2026-11-20 in the track/physics-build worktree on
top of P1 (`27a9c99`), under the owner's commission of
the physics design note's slices P1–P4. The design
note governs; this slice is its §9 P2. Nothing is
pushed; the work stands as a local branch commit
awaiting the owner's word.*

## What was built

- **The intake artefact** (`data/physics/material-
  readings.json`) — the first attested intake, and the
  held record of it: seven materials (wood, stone,
  steel, iron, ice, brick, glass), each entry carrying
  its three values AND, per value, its route. The
  artefact is the custody (§10 Q2's constraint holds:
  held once — in the artefact and the register's
  readings — cited everywhere, never duplicated into
  the engine layer as literals).
- **The loader** (`src/ansci/physics-materials.ts`) —
  reads and VALIDATES the artefact (an entry lacking a
  value, or a route for a value, fails the load loudly:
  traceability is the acceptance, not a nicety), and
  enters the set into a MaterialRegister under one
  standing, `intake-2026-11-20-engineering-toolbox`.
  Each reading's provenance names the intake as its
  dataset and carries the per-value routes in its
  detail, so a derivation citing the reading shows
  where every number came from. The conversational
  path's default register now carries the attested
  intake; P1's seed standings survive only in labs
  that seed them deliberately (the P1 tests).

## The values, and their routes — stated plainly

Consulted 2026-11-20: The Engineering ToolBox,
"Solids — Densities" and "Friction — Coefficients for
Common Materials and Surface Combinations"; Marks'
Standard Handbook via Perry's for cast iron.

- **Density** is retrieved throughout: wood as oak
  720 (ToolBox: Oak 0.72 ×10³), stone as granite 2700
  (2.6–2.8, point taken), steel 7850 (the standard
  value), iron as cast iron 7200 (Marks', sp. gr. 7.2),
  ice 917, brick as hard brick 2000 (ToolBox: 2.0),
  glass 2500 (2.4–2.8, point taken). Where a source
  gives a range, the point chosen is the intake's and
  the entry says so.
- **Friction** is retrieved where an attested SELF-pair
  stands: wood on wood (0.25–0.5 → 0.4), steel on steel
  (0.5–0.8 → 0.6), ice on ice at 0 °C (0.1), glass on
  glass (0.9–1.0 → 0.9). The held coefficient is a
  self-coefficient by the convention stated in the
  artefact; the engine's mixing law governs cross
  pairs in stepping.
- **Restitution is owner's authoring throughout** —
  no attested restitution table stands behind this
  intake — and every entry's restitution source line
  says "owner-authored" in so many words. A gated test
  pins exactly that: an authored value wearing the
  retrieved dataset's name would be the quiet upgrade
  §3.2 forbids.

## Acceptance, against §9 P2

- **Every reading traceable to its intake record** —
  gated: provenance kind, dataset, standing, and the
  per-value routes are all asserted per material, and
  the attested values themselves are spot-checked
  against the consulted tables.
- **Scenes cite readings by name; the missing-reading
  decline exercised across the set** — every attested
  material assembles a scene citing the intake
  standing; mithril, plastic, rubber and gold decline
  at the missing reading.
- **Re-derivation after supersession** — a stack's
  derivation under the P1 seed cites the seed standing
  and density 600; after the intake supersedes wood,
  a fresh assembly's derivation cites the intake
  standing and density 720, and says which standing it
  used; the earlier derivation stands exactly as
  written, and the register keeps both standings for
  audit.

## A limit, recorded (§3.2's pair readings)

An attested pair value need not be reproduced by the
engine's mixing law over the held self-coefficients:
wood on stone computes to about 0.49 from the held
values, against the ToolBox's attested pair value of
0.2. The design's remedy is pair readings proper —
readings OF a pairing, which §3.2 contemplates — and
they are not built in this slice: no question yet
turns on a specific pair's friction. Recorded here so
the approximation is a known one, not a discovered
one.

## Defaults taken, flagged for ratification

- **Custody** (§10 Q2): the artefact stands in
  data/physics/ in the Unit's own keeping. The
  alternative (an annex of the material record) stays
  the owner's to choose; nothing in the loader binds
  the register to the file's location beyond the
  walk-up path.
- **Range points**: where a table gives a range, the
  intake's chosen point (granite 2.7 of 2.6–2.8, wood
  friction 0.4 of 0.25–0.5, and so on) is recorded in
  the artefact as the intake's choice — a later intake
  may take a different point under a new standing
  without rewriting history.

## Gates (fresh complete runs, this branch; P1 in brackets)

| Gate | Result |
| --- | --- |
| Full suite | 1404 tests · 1401 pass · 0 fail · 3 skipped [1399 · 1396 · 0 · 3] |
| Demo (`ansci:demo`) | 29/29 expectations met |
| Holdout (`ansci:holdout`) | 80/80 parsed, 0 parse / 0 round-trip regressions |
| Sense challenge | Set A 11/11 · Set B 6/6 |
| `ai:check` | OK (system-map 100 nodes; root page OK) |

## Files

- `data/physics/material-readings.json` — the intake
  artefact: values, per-value routes, the friction
  convention.
- `src/ansci/physics-materials.ts` — the artefact's
  path, validation, and the register loader.
- `src/ansci/physics-turn.ts` — the default register
  takes the attested intake at the wrapper's load.
- `test/ansci-physics-p2.test.ts` — 5 tests.
