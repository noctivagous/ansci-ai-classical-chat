# Physics P1 — the scene record and one shape (build report)

*Built 2026-11-20 in the track/physics-build worktree on
top of origin/main `836a5d0`, under the owner's
commission of the physics design note's slices P1–P4
("build all of them"). The design note
(docs/ansci/physics-design-note.md, branch
track/physics-design) governs; this slice is its §9 P1.
Nothing is pushed; the work stands as a local branch
commit awaiting the owner's word.*

## What was built

- **The Physics Unit's core** (`src/ansci/physics.ts`) —
  the scene record as a held artefact (§5.1), assembly
  (§5.2), stepping (§4.1), and the outcome entered as a
  **derived fact** (§4.2, the kind geography G3 created:
  a computed fact cites its inputs' provenance and
  carries none of its own). A derivation record cites
  the scene as described (with every stated assumption
  marked as an assumption), the held material readings
  used (values + standing + provenance), the engine and
  its stepping parameters, and the question — so the
  record cannot be silently re-read as answering
  another (§4.2), and re-running it is the audit (§4.3).
- **Planck adopted and pinned (§2.1).** The artefact,
  verified against the installed package at build time
  and re-verified by a gated test on every run:
  **npm `planck` 1.5.1, licence MIT** (the current
  `planck` line; the pre-1.0 `planck-js` line was zlib,
  as §2.1 warned — the pinned artefact is the MIT one).
  `package.json` gains `"planck": "^1.5.1"` as the
  project's first runtime dependency; installation is
  local to the worktree (npm), nothing global changed.
- **The material register (§3.2)** — readings held once,
  cited everywhere, never duplicated into the engine
  layer as literals: the scene record cites a reading's
  values WITH its standing and provenance, and the one
  fixture factory takes those cited values. A register
  keeps superseded standings in its history (P2's
  re-derivation discipline is designed into the record
  from here). P1 enters a small **owner-authored
  programme seed** (wood, stone, steel, ice) whose
  standing says plainly that it is interim and not an
  attested table; P2's attested intake supersedes it.
- **Named defaults only (§5.3)** — Earth gravity at its
  held value (9.81 m/s²), and the ground plane supplied
  only where a description presupposes it, RECORDED AS
  AN ASSUMPTION in the scene record, never as a silent
  default. A scene with no ground assembles and its
  blocks fall — pinned by test, because scenes without
  ground are meaningful and the difference decides
  outcomes.
- **One question shape** (`src/ansci/physics-turn.ts`) —
  the will-it-fall / does-it-stand class over the
  simplest described scene (§9 P1, §10 Q1's stated
  limit): "will the stack of three wood blocks fall?",
  its half-off form ("…with the top block half off"),
  and the does-it-stand mirror. The wrapper runs the
  ordinary turn first (record and trace), then the
  Unit's work; the reply names the computation as the
  computation (§4.2). The trace gains a `physics`
  record (turn.ts) in the geography record's manner.
- **The outcome is read by a stated rule** (§4.1
  movement 3): a body has fallen if it tipped ≥ 30°,
  slid at least half its own width sideways, or dropped
  at least its own height; a run stands if every
  dynamic body ends within 0.05 m and 5° of its start;
  otherwise it "moved" — shifted without falling, and
  the reply says so rather than rounding to a fate.

## The fixture audit (§5.3, P1 acceptance)

The engine's own fixture defaults are never inherited,
proven three ways in `test/ansci-physics-p1.test.ts`:

1. **By construction** — `createFixtureFromReading` is
   the only fixture factory in the Unit, and it has no
   path that omits a value: density, friction and
   restitution are all required arguments taken from a
   cited reading.
2. **By inspection** — a test scene in a material
   ("auditite") whose reading differs from Planck's
   fixture defaults on every axis (1234 / 0.93 / 0.61
   against defaults 0 / 0.2 / 0) is built WITHOUT
   stepping (`buildWorld`), and every fixture in the
   world — box, circle, and the ground's edge — is read
   back and compared value by value against the
   reading. All carry the reading's values.
3. **By refusal** — a scene whose material has no held
   reading declines at assembly, before any world
   exists: the lab's step counter does not move, so no
   fixture is ever created from nothing (§7: the system
   does not charge for a scene it cannot assemble).

## Acceptance, against §9 P1

- A fixed described stack that **stands** (three wood
  blocks, aligned) and one that **falls** (the top
  block half off — it tips and drops by the stated
  rule; the blocks below stay unmoved), both
  **reproducible from their records**: two runs of the
  same scene record give deep-equal outcomes and
  deep-equal derivations (§4.3).
- A scene **declining at a missing material reading**
  ("mithril"): the decline names the material and the
  body, at assembly, located in the lack machinery's
  form (§§3.2, 5.2) — conversationally as well as at
  the API.
- The conversational shape answers **as a derived
  fact**: "By simulation, the stack of 3 wood blocks
  stands. (Computed by Planck from the scene as
  described … — not an observation of any real stack.)"

## Defaults taken, flagged for ratification

- **P1's seed readings** (wood 600/0.45/0.2, stone
  2500/0.7/0.1, steel 7850/0.4/0.3, ice 917/0.05/0.1)
  are owner-authored programme seed, standing
  `programme-seed-2026-11-20`, entered only so the
  first scenes can assemble; P2 supersedes them with
  attested intake. No reply presents them as attested.
- **The stepping regimen** — 1/60 s × 300 steps,
  velocityIterations 8, positionIterations 3 — is the
  design's stated regimen, part of every derivation
  record (§4.1), not an engine default silently
  adopted: it is named in code (`DEFAULT_STEPPING`)
  and cited in each derivation.
- **Custody of material readings** (§10 Q2) — the
  register stands in physics.ts beside the Unit,
  neither a Physics-owned table artefact nor an annex
  of the material record yet; the constraint holds
  either way (held once, cited everywhere). P2's
  intake artefact is where the custody question next
  becomes concrete.

## Draft wordings — OWNER'S TO SETTLE

The simulated reply forms (stands / falls / shifts)
and the missing-reading decline text in
physics-turn.ts are drafts flagged in code.

## §3.1, stated for the record

No Five Element axis determination is restated as a
physical property anywhere in this slice's code,
fixtures, or report: the seed and the register hold
behavioural quantities only (density, friction,
restitution), entered by the routes §3.2 names.

## Gates (fresh complete runs, this branch; baseline in brackets)

Baseline reproduced on unmodified `836a5d0` before
building: suite 1390 · 1387 · 0 · 3 · demo 29/29 ·
holdout 80/80 · sense A 11/11 B 6/6 · ai:check OK.

| Gate | Result |
| --- | --- |
| Full suite | 1399 tests · 1396 pass · 0 fail · 3 skipped [1390 · 1387 · 0 · 3] |
| Demo (`ansci:demo`) | 29/29 expectations met |
| Holdout (`ansci:holdout`) | 80/80 parsed, 0 parse / 0 round-trip regressions |
| Sense challenge | Set A 11/11 · Set B 6/6 |
| `ai:check` | OK (system-map 100 nodes; root page OK) |

## Files

- `src/ansci/physics.ts` — provenance, the material
  register and seed, the held gravity, the scene
  record, assembly, the fixture factory, stepping,
  outcomes, derivations, the lab.
- `src/ansci/physics-turn.ts` — the wrapper: the
  stack-fate shape, its described-scene builder, the
  located declines, the derived-fact replies.
- `src/ansci/turn.ts` — the trace gains the `physics`
  record.
- `test/ansci-physics-p1.test.ts` — 9 tests.
- `package.json` / `package-lock.json` — planck 1.5.1
  (MIT) adopted.
