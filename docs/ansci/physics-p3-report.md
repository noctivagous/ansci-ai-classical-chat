# Physics P3 — trajectories become Form (build report)

*Built 2026-11-20 in the track/physics-build worktree on
top of P2 (`d293730`), under the owner's commission of
the physics design note's slices P1–P4. The design
note governs; this slice is its §9 P3, and its curve
record is the Form design note's §3.1/§3.3. Nothing is
pushed; the work stands as a local branch commit
awaiting the owner's word.*

## What was built

- **The curve record** (`src/ansci/form-curves.ts`) —
  the Form note's §3.1 held object, implemented ahead
  of Form's own build because Physics is its first
  producer (§7: "the trajectory is a curve — Form's
  keeping, Physics' production"). Control points with
  a STATED interpolation (linear — the only rule this
  rung states), a stated domain interval, a lineage
  citation, and a provenance statement. The register
  is append-only; the asking acts are value-at,
  first-crossing, and segment-rate, each a computation
  over the held points by the stated interpolation.
  A curve is not defined outside its interval:
  evaluation there returns nothing, and the caller
  declines at the interval rather than extrapolating.
- **Curve production** (`physics.ts simulate()`) —
  every run now derives, per dynamic body, three curve
  records from its sampled trajectory and holds them
  in the register with lineage citing the run: centre
  height over time; speed over time (finite
  differences of the sampled positions — the method
  stated in the record's range); and LOWEST-POINT
  height over time (the body's underside: centre minus
  the vertical extent at the sampled angle).
- **The motion shapes** (`physics-turn.ts`) — "when
  does the top block reach the ground?" and "how fast
  is the top block moving after N seconds?", answered
  from the standing run's held curves. This path never
  calls the engine: the lab's step counter is the
  audit, and the gated tests pin it unmoved across
  both shapes and across the declines.

## Two findings from the build, stated plainly

- **A tipped block's centre never reaches its half
  height.** Probing the half-off stack showed the top
  block's centre settling at 0.168 m (its half height
  is 0.15 m): it comes to rest tipped, and the event
  "reaches the ground" belongs to its UNDERSIDE, not
  its centre. That is why the run derives the
  lowest-point curve, and why the when-reach shape
  reads it. A centre-height reading would have
  answered "never" to a block lying on the floor.
- **Resting contact in this engine settles the
  geometric underside 0.011–0.015 m above the floor
  line** (the contact skin and slop of the stepping;
  measured across stack heights 2–5 at build time, the
  resting undersides were 0.0111–0.0147 m). The
  when-reach reading rule therefore carries a stated
  CONTACT BAND of 0.02 m — as P1's verdict rule
  carries its stated thresholds (tip ≥ 30°, unmoved
  within 0.05 m / 5°): "reaches the ground" is read as
  the underside entering the band, and the trace
  states the band wherever the reading is used. A
  body hovering or wedged above the band does not
  read as reached.

## Acceptance, against §9 P3

- **Motion questions answered from the record with
  the engine untouched** — gated conversationally:
  stack question (300 steps charged), then when-reach
  and how-fast answers with the step counter pinned
  at 300, and the replied numbers checked against the
  held curves' own evaluations.
- **A standing stack's top block reads as not
  reaching the ground** — from the same record, no
  re-stepping.
- **The declines are located** — no run standing:
  decline at the missing trajectory, no step charged.
  Past the domain interval (a speed asked at 9 s of a
  5 s curve): decline at the interval, the curve not
  extrapolated.
- **An edited curve is not confused with the
  simulated one** (Form §3.3) — gated at the register:
  an edit (a new record citing the simulated curve as
  parent) is answerable while its parent stands held,
  and is a distinct record; an ORPHAN (citing a parent
  that is not held) has a broken lineage and is not
  answerable-from — never treated as the simulated
  curve, never quietly repaired.

## Defaults taken, flagged for ratification

- **The lab's last run is process-level state**, like
  the geography register: a motion question reads the
  most recent run in the process, whichever
  conversation ran it. Session-scoping the trajectory
  is the owner's call when conversations multiply.
- **The contact band (0.02 m)** is a reading-rule
  constant of this engine's stepping, measured, not
  derived; a different engine or stepping regimen
  would want it re-measured. It stands in one named
  constant with its evidence stated beside it.
- **The speed curve's domain starts at the first
  step** (t = dt): speed at the initial instant is not
  among the samples, and the record's interval says
  so rather than covering it.
- All visitor-facing wordings on this path are
  DRAFT, flagged in code as the owner's to settle, as
  in P1/P2.

## Gates (fresh complete runs, this branch; P2 in brackets)

| Gate | Result |
| --- | --- |
| Full suite | 1410 tests · 1407 pass · 0 fail · 3 skipped [1404 · 1401 · 0 · 3] |
| Demo (`ansci:demo`) | 29/29 expectations met |
| Holdout (`ansci:holdout`) | 80/80 parsed, 0 parse / 0 round-trip regressions |
| Sense challenge | Set A 11/11 · Set B 6/6 |
| `ai:check` | OK (system-map 100 nodes; root page OK) |

## Files

- `src/ansci/form-curves.ts` — NEW: the Form curve
  record, its register, lineage discipline, and the
  asking acts.
- `src/ansci/physics.ts` — runs derive and hold the
  three trajectory curves; the lab keeps its register
  and its last run.
- `src/ansci/physics-turn.ts` — the motion shapes,
  their located declines, the contact band.
- `test/ansci-physics-p3.test.ts` — 6 tests.
