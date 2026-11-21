# Physics programme — build report (P1–P4)

*Built 2026-11-20/21 in the track/physics-build
worktree, cut from origin/main `836a5d0`, under the
owner's commission ("build all of them") of the
physics design note's slices P1–P4
(docs/ansci/physics-design-note.md, branch
track/physics-design). One commit per slice, full
gates per slice, a report per slice
(physics-p1-report.md … physics-p4-report.md).
Nothing is pushed or merged; the branch stands local
awaiting the owner's word.*

## The slices

| Slice | Commit | What it built |
| --- | --- | --- |
| P1 | `27a9c99` | Planck adopted and pinned; the scene record; assembly with located declines; the stack shape answered as a derived fact; the fixture audit (engine defaults never inherited) |
| P2 | `d293730` | Held material readings: the first attested intake (7 materials, per-value routes, restitution marked owner-authored); re-derivation after supersession |
| P3 | `17a757e` | Trajectories as Form curve records (§3.1 shape, lineage citing the derivation); motion questions answered from the record, step counter pinned |
| P4 | `401ae11` | Stated joints instantiated (revolute, distance); the slope family (roll-to / roll-off / slide-off); border declines exercised at fluids and 3D; the edge-frame fix (below) |

## The adopted artefact, as verified

`planck` **1.5.1**, licence **MIT** (verified from the
installed package at adoption, and pinned by a gated
test that fails if the installed version or licence
drifts from the constant the provenance statements
cite). The note's caution is discharged: the old
planck-js 0.3 line was zlib; the artefact actually
installed is the current planck line, MIT. It is the
project's first runtime dependency. Installation was
local to this worktree (npm); no global changes.

## The fixture audit

P1's acceptance instrument stands: every fixture in
an unstepped test world is created by the one factory
from a held reading, and the audit reads the fixtures
back value by value (density, friction, restitution)
against an unusual reading (1234 / 0.93 / 0.61) chosen
so no engine default (0 / 0.2 / 0) could masquerade as
it. P4's report records the audit's limit honestly:
it verified fixture PROPERTIES, not fixture GEOMETRY,
and a geometry defect (edge endpoints not converted
from scene to body-local coordinates) lived in P1
masked by the ground-at-origin placement, until the
slope scenes exposed it. It is fixed, regression-
pinned, and all earlier verdicts re-verified
unchanged. A geometry audit is the recorded next
extension of the instrument.

## Gates, across the programme (baseline in brackets)

Baseline reproduced on `836a5d0` before building:
suite 1390 · 1387 pass · 0 fail · 3 skipped; demo
29/29; holdout 80/80, 0 regressions; sense A 11/11,
B 6/6; ai:check OK.

| After | Suite | Demo | Holdout | Sense | ai:check |
| --- | --- | --- | --- | --- | --- |
| P1 | 1399 · 1396 · 0 · 3 | 29/29 | 0 regressions | A 11/11 · B 6/6 | OK |
| P2 | 1404 · 1401 · 0 · 3 | 29/29 | 0 regressions | A 11/11 · B 6/6 | OK |
| P3 | 1410 · 1407 · 0 · 3 | 29/29 | 0 regressions | A 11/11 · B 6/6 | OK |
| P4 | 1416 · 1413 · 0 · 3 | 29/29 | 0 regressions | A 11/11 · B 6/6 | OK |

26 new tests across the four physics test files; no
existing test changed its result at any slice.

## Design disciplines, as they stand in the build

- **Derived provenance (§4.2)** — every simulation
  answer cites the scene as described, the held
  readings with their standings, the assumptions
  assembly supplied, the joints where stated, the
  engine with version and licence, the stepping
  regimen, and the question. Replies name the
  computation as a computation, never as observation.
- **Determinism (§8)** — fixed scenes, fixed step
  counts (1/60 s × 300, iterations 8/3, stated);
  reproducibility is gated (deep-equal re-runs in P1
  and P4). A result is reproducible from its
  derivation record or it is not a result.
- **§3.1** — no Five Element axis determination is
  restated as a physical property anywhere in the
  code, the fixtures, the intake artefact, or these
  reports. The material readings are behavioural
  quantities with attested or authored provenance;
  the graph's material categories were never used as
  a source of values.
- **Borders (§6)** — fluids, soft bodies, fracture
  and 3D decline located at the capability, never
  approximated by the rigid-body engine; the declines
  charge no steps.
- **No conversational scene authoring** beyond each
  slice's acceptance shapes (§10 Q1 respected): the
  stack, the motion questions over a standing run,
  the slope family, and the two border shapes are the
  whole conversational surface.

## Defaults flagged for ratification (consolidated)

1. **P1 seed readings** stand only in deliberately
   seeded test labs; the conversational register
   carries P2's attested intake. The seed's values
   were interim and are superseded in the open.
2. **Range points in the intake** (granite 2.7 of
   2.6–2.8, wood friction 0.4 of 0.25–0.5, steel 0.6
   of 0.5–0.8, glass 0.9 of 0.9–1.0) are the intake's
   recorded choices; a later intake may choose
   otherwise under a new standing.
3. **Restitution is owner-authored throughout** the
   attested intake — no attested table was found —
   and every value's route says so.
4. **Custody of the readings** (§10 Q2): the artefact
   stands in data/physics/ in the Unit's own keeping;
   the annex-of-the-material-record alternative stays
   the owner's to choose.
5. **Reading-rule constants**: P1's verdict thresholds
   (tip ≥ 30°, unmoved 0.05 m / 5°), P3's contact band
   (0.02 m, measured from this engine's resting
   slop), P4's slope thresholds (90% / foot + 0.05 m /
   0.10 m), and the stepping regimen itself — all
   stated in code beside their grounds.
6. **Process-level state**: the material register,
   the curve register, and the lab's last run are
   process-level, as the geography register is;
   session-scoping is the owner's call.
7. **Pair readings** (§3.2) are not built: the
   engine's mixing law over self-coefficients does
   not reproduce every attested pair value (wood on
   stone computes ≈0.49 against the table's 0.2);
   recorded as a known limit in the P2 report.
8. **All visitor-facing wordings** on the physics
   paths are DRAFT, flagged in code as the owner's to
   settle.

## What remains open

- The note's §10 questions stand as the owner's:
  conversational scene authoring's line (Q1), custody
  (Q2, defaulted as above), the 3D revisit trigger
  (Q3), the Unit's map seat wording (Q4), assumption
  tolerance as doctrine (Q5).
- The fixture audit's geometry extension (from P4's
  finding).
- Form's own build will take over the curve register
  this programme implemented ahead of it
  (form-curves.ts is Form §3.1's record, held in the
  Physics lab meanwhile).
- Nothing in this programme was pushed, merged, or
  landed. The branch is track/physics-build at the
  programme report's commit; landing is the owner's
  word, as with every programme before it.
