# Physics P4 — joints, the second shape family, the borders (build report)

*Built 2026-11-20 in the track/physics-build worktree on
top of P3 (`17a757e`), under the owner's commission of
the physics design note's slices P1–P4. The design
note governs; this slice is its §9 P4. Nothing is
pushed; the work stands as a local branch commit
awaiting the owner's word.*

## What was built

- **Stated joints get behaviour** (`physics.ts`
  buildWorld) — the scene record carried joints from
  P1 and assembly validated their bodies; the world
  now instantiates them exactly as stated: revolute
  (a hinge) and distance (a link), anchors as stated,
  connected bodies not colliding with each other. A
  distance joint's length is not a separate stated
  value: it is the distance between the two stated
  anchors in the scene's initial state, computed from
  the record. Derivations now cite joints among their
  inputs (§4.2).
- **The slope family** (`physics-turn.ts`) — §6's
  reach / roll-to / slide-off kinds in their simplest
  determined forms: "will the wood ball roll to the
  bottom of the 30-degree slope?", "will the wood
  ball roll off the 30-degree slope?", "will the wood
  block slide off the 35-degree slope?" The words
  determine the mover, its material, and the angle;
  the slope's length (2 m), its foot's height (0.8 m),
  its material (stone) and the mover's size and
  placement are supplied and recorded as assumptions
  (§5.2), as P1's block size was. Outcomes are read
  off the trajectory by a stated rule: progress along
  the slope ≥ 90% of its length is reaching the
  bottom; progress beyond the foot + 0.05 m is going
  off; travel over 0.10 m is sliding.
- **The conversational border shapes** (§6) — "will
  the wood block float?" declines at the FLUID
  capability (buoyancy is not a rigid-body question),
  and "will the steel cube balance on its corner?"
  declines at the 3D capability (a corner is a
  three-dimensional determination; a planar scene's
  cube has edges). Assembly's border check fires
  before any material reading is consulted — the
  question turns on the capability whatever the
  material — and no step is charged.

## A P1 defect, found by this slice and fixed in it

The slope scenes exposed a real defect in P1's
fixture factory: **edge endpoints are stated in the
scene record in scene coordinates, but the engine's
shapes are local to their body**, and the factory
passed the stated endpoints through unconverted. P1's
only edge was the ground at level 0, whose body sits
at the origin — the one placement where the two
frames coincide, so every P1 gate passed over the
defect. The slope's edge (raised, offset) landed in
the wrong place entirely: movers fell onto a phantom
slope floating above the stated one, and the first
probe of this slice showed balls "stopping" mid-slope
and a block "sliding" on a 20-degree slope it should
have gripped — wrong answers with correct-looking
derivations, the worst kind. The factory now converts
(endpoints minus the body's stated position); the
ground-at-origin scenes are unaffected, every earlier
gate stands unchanged, and a regression test pins a
ground at a stated NONZERO level (a block dropped
onto ground stated at 0.5 m comes to rest with its
centre at 0.65 m, as stated). Stated plainly: P1's
fixture audit verified fixture PROPERTIES value by
value; it did not audit fixture GEOMETRY, and
geometry is where the defect lived. A geometry audit
belongs with the audit's next extension.

## Acceptance, against §9 P4

- **Joints** — a bar hinged at its end to a fixed
  pivot: the hinged end never leaves the pivot across
  the whole trajectory (deviation under 0.01 m; in
  the gated run it held to print precision), the
  centre stays on the hinge's circle, and the run is
  reproducible. The control — the identical scene
  with the joint unstated — falls away entirely. A
  block on a distance link keeps the link's length
  (0.8 m, the stated anchors' distance) within
  0.01 m throughout, against the same falling
  control. A joint naming an unplaced body still
  declines at the placement.
- **Per shape** — roll-to at 30° (wood ball: reaches
  the bottom), roll-off at 30° (rolls off), slide-off
  at 35° (wood block: slides off), slide-off at 20°
  (does not slide — it stays where it was placed,
  the friction reading deciding, as §5.2's
  sensitivity line says it should). A missing mover
  reading (mithril) declines at the reading, no step
  charged.
- **Borders** — fluids and 3D exercised
  conversationally (above); soft-body and fracture
  exercised at assembly; each decline names its
  capability kind, and none charges a step.

## Defaults taken, flagged for ratification

- **The slope family's supplied values** (2 m length,
  0.8 m foot, stone slope, mover sizes) stand as
  recorded assumptions in every slope derivation;
  richer slope descriptions in words are the §10 Q1
  shapes question, not this slice's to improvise.
- **The reading rules' thresholds** (90% for
  reaching, foot + 0.05 m for going off, 0.10 m for
  sliding) are stated constants of the wrapper, of a
  kind with P1's verdict thresholds and P3's contact
  band — the owner's to adjust when the shapes are
  reviewed.
- All visitor-facing wordings on the new paths are
  DRAFT, flagged in code as the owner's to settle.

## Gates (fresh complete runs, this branch; P3 in brackets)

| Gate | Result |
| --- | --- |
| Full suite | 1416 tests · 1413 pass · 0 fail · 3 skipped [1410 · 1407 · 0 · 3] |
| Demo (`ansci:demo`) | 29/29 expectations met |
| Holdout (`ansci:holdout`) | 80/80 parsed, 0 parse / 0 round-trip regressions |
| Sense challenge | Set A 11/11 · Set B 6/6 |
| `ai:check` | OK (system-map 100 nodes; root page OK) |

## Files

- `src/ansci/physics.ts` — joints instantiated in the
  world and cited in derivations; the edge-frame fix
  in the fixture factory.
- `src/ansci/physics-turn.ts` — the slope family, its
  reading rules and supplied assumptions; the
  conversational border shapes.
- `test/ansci-physics-p4.test.ts` — 6 tests.
