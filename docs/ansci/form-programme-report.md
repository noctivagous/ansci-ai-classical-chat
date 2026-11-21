# Form programme — F1–F3 built (programme report)

*Built 2026-11-20 in the track/form-build worktree, cut
from origin/main `836a5d0` (fetched fresh at
commissioning), under the owner's commission of the form
design note's slices F1–F3 ("build all of them"). The
design note (docs/ansci/form-design-note.md — branch
track/form-design) governed throughout; where the
commissioning brief and the note differed, the note won,
and the one place that mattered is recorded below.
Nothing is pushed and nothing is merged: the programme
stands as three local commits plus this report on
track/form-build, awaiting the owner's word.*

## The stack

| Commit | Slice | What it built |
|---|---|---|
| `79a18a6` | F1 — Curves | the register of forms; curve records in the three held forms; lineage; evaluate / monotonic / steepest; application; the animation seam |
| `3e614a5` | F2 — Proportion | the relation record, ratio held as stated; state / compare / scale; doubling and half by name; conversion factors cited, not duplicated |
| `639b131` | F3 — Repetition | pattern records; the known cycles cited from their constants; detection under the evidence floor; the Scheduling cord as citation |

Per-slice reports: `form-f1-report.md`,
`form-f2-report.md`, `form-f3-report.md` (same directory).

## Placement, as the note's §2.2 states it

Form is built as the **co-division of Mathematics** the
reconciliation records — sibling to the QuantificationUnit
(which stands inside Mathematics over its Numbers slice)
and to the Geometry seat; not a sub-part of the
QuantificationUnit, not a Function, and **no map seat was
created** (§10.4 is the owner's). The code states this in
its header; `ai:check` passes untouched on its 100 nodes.
The register follows the EDU/SenseUnit specialist pattern
the note prescribes: one store (`src/ansci/form.ts`), one
module per member (form-curves / form-proportions /
form-repetition), the standing composition in
form-standing.ts.

## Gates (fresh complete runs at each slice)

Baseline reproduced on unmodified `836a5d0` before
building: suite 1390 / 1387 / 0 / 3 skipped · demo 29/29 ·
holdout 80/80 · sense A 11/11 · B 6/6 · ai:check OK.

| Slice | Suite | Demo | Holdout | Sense | ai:check |
|---|---|---|---|---|---|
| F1 | 1403 / 1400 / 0 / 3 | 29/29 | 80/80, 0 regressions | A 11/11 · B 6/6 | OK (100 nodes) |
| F2 | 1408 / 1405 / 0 / 3 | 29/29 | 80/80, 0 regressions | A 11/11 · B 6/6 | OK (100 nodes) |
| F3 | 1417 / 1414 / 0 / 3 | 29/29 | 80/80, 0 regressions | A 11/11 · B 6/6 | OK (100 nodes) |

27 new tests across the three slices (13 + 5 + 9), each
pinning its slice's §9 acceptance sketch. What the gates
do not show: no turn of conversation exercises any of this
yet (see the seam below), and nobody independent has
reviewed the decline wordings or the D5 locations.

## The disciplines, as kept

- **The evidence floor was implemented as designed, not
  loosened** — assertion requires the unit complete twice
  over (length ≥ 2·period + 1); below it, D6 names the
  candidate *as* a candidate. The floor's edges are pinned
  by tests, including the cases that fail it by one step.
- **No canon was invented.** The preset register ships
  empty and every preset name declines D1 — including in
  the standing register. The only named holdings are the
  ones the note itself holds: doubling and the half (§4.2),
  and the known cycles cited from their standing constants
  (§5.2). The easing family was **not** entered: the note
  mentions easing as §3.4's example of an application
  question, not as holdings — the brief's conditional
  ("only if the note's text holds them as candidates with
  standing") was read carefully, and it does not.
- **Lineage is append-only** for curves and patterns
  alike: edits mint new records citing parents; citations
  resolve to the record as it stood; the latest is a
  separate ask; a broken chain declines D8.
- **Form originates no world claims** (§6): every act
  returns computations stated as computations or forms
  stated as forms; the witness request declines D10 at a
  typed location.

## The seams, stated plainly

- **Module level only.** No conversational shapes were
  built and `turn.ts` is untouched: the note settles
  Form's acts over its register and leaves conversational
  authoring (§10.3) open, and the brief directed no
  authoring beyond a slice's acceptance — the acceptances
  are met at the level they are stated. Wiring Form's
  questions into the turn is future work the note has not
  yet specified.
- **Timekeeping was not built here.** The animation seam
  (`evaluateAnimationCurve`) takes a clock reading from
  its caller — a value plus the standing the caller claims
  for it — and declines D9 without one; the frame's stated
  time is not treated as a reading. On this base,
  Timekeeping is the time programme's work, proceeding in
  its own worktree. When it lands, its readings are what a
  caller passes across this boundary; nothing in Form
  changes.

## Defaults taken — flagged for ratification

1. **No conversational curve authoring** (note §10.3 left
   open, as directed).
2. **Evaluation stays Form's act** over its own holdings;
   evaluation-as-a-Function (§10.5) left exactly as the
   note leaves it — no Functions-library entry created.
3. **D5's locations** were chosen where this build's forms
   actually produce undecidable shape questions:
   monotonicity over a stretch past a points curve's span;
   steepest-where for a step-interpolated curve; a canon
   entry that itself only cites another preset. Other
   undecidable questions will find their own locations as
   the forms grow.
4. **Standing holdings are entered, not defaulted**: a
   bare register holds nothing (so D1/D2 are testable
   against it); `standingFormRegister()` composes the
   note's own holdings (doubling, half, the four known
   cycles) with their provenance stated.
5. **F2 commensurability**: D7 fires where both terms'
   dimensions are *known* and unlike with no stated
   relation; where a dimension cannot be determined at
   all, the stated ratio itself stands as the relation.
   (The stricter reading would refuse the recipe
   proportions the note's examples trade in.)
6. **F3 cycle matching** is by exact unit up to rotation;
   sub-unit and multiple matches are asserted on their own
   terms without the cycle's name.
7. **Every decline wording is a draft** — D1–D10's reply
   texts throughout the three modules are the owner's to
   settle, in the house manner.

## What remains open

- All of the note's §10: Form's remit against Space
  (§10.1), the canon's sources (§10.2 — the preset
  register stands empty until a ruling enters one),
  conversational authoring (§10.3), the map wording
  (§10.4), evaluation as a Function (§10.5).
- The Scheduling side of the §5.3 cord: periodic triggers
  are Scheduling's extension to build; Form's side — the
  citable record — stands.
- Turn-level wiring of Form's questions and declines, when
  the note or the owner specifies it.
