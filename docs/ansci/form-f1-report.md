# Form F1 — Curves held, asked, applied (build report)

*Built 2026-11-20 in the track/form-build worktree from
origin/main `836a5d0`, under the owner's commission of the
form design note's slices F1–F3 ("build all of them"). The
design note (docs/ansci/form-design-note.md — branch
track/form-design) governs; this slice is its §9.1, building
§3 (Curves) against the declines of §8. Nothing is pushed;
the work stands as a local branch commit awaiting the
owner's word, like every push.*

## Placement, as built

The note's §2.2 reconciliation governs and the code states
it in its header: Mathematics is the container Unit inside
the OKU; the QuantificationUnit stands inside it over its
Numbers slice; Form is the **co-division of Mathematics**
this programme builds — sibling to the QuantificationUnit's
Number remit and to the Geometry seat, not a sub-part of
the QuantificationUnit. No map seat is created (the note's
§10 leaves the map wording to the owner); `ai:check` is
untouched and still passes on its 100 nodes.

The build is at the register level, as the note's slices
specify: the note settles Form's *acts over its register*
and deliberately leaves conversational authoring (§10.3)
and evaluation-as-a-Function (§10.5) open, so no turn-level
shapes are built here and `turn.ts` is untouched. The
acceptance sketches of §9 are met at the level they are
stated — held records, acts, declines — and pinned by
`test/ansci-form-f1.test.ts` (13 tests).

## What was built

- **The register of forms** (`src/ansci/form.ts`) — the
  division's append-only store, on the quantity ledger's
  discipline: records are appended, never edited; every
  record carries its provenance (canon / stated /
  convention / attested) as a required field — a form is
  held with where it came from, or it is not held.
  Process-level, like the banks; no file backing is
  claimed. The store opens with curves; proportions (F2)
  and patterns (F3) join the same register under the same
  discipline.
- **Curve records** (§3.1) — the three held forms, as data:
  a stated function (constant / line / parabola / sine,
  stated in terms the evaluator shares — records hold no
  code, so a record can be audited as held), control points
  with a stated interpolation (linear / step), and a named
  preset citation. Every record states its domain interval
  and what varies along it.
- **Lineage** (§3.3) — `editCurve` mints a new record
  citing its parent and stating the edit; the parent stands
  unchanged and citable; `auditCurveLineage` walks the
  chain root-to-record; `latestCurveInLineage` is a
  separate, explicit ask — nothing is silently re-shaped,
  and no consumer's citation is silently moved to the
  latest.
- **The asking acts** (`src/ansci/form-curves.ts`) —
  `evaluateCurve` (value at a point), `curveMonotonic`,
  `curveSteepest`, each returning the computation with the
  record it rests on and the method that produced it, per
  §3.4's "a computation, stated as one". Stated functions
  are decided exactly (a parabola's vertex, a sine's
  stationary points); point sets are decided from their
  points and their stated rule.
- **Application** — `applyCurve` serves the whole series
  or the first decline, never a partial series in silence.
  The consumer cites the record; the curve does not move
  into the consumer.

## Declines, at their locations (§8)

- **D1 (unknown preset)** — a preset citation resolves
  only against a record entered under that name **by a
  canon** (provenance kind `canon`, its source named). The
  shipped register enters **no canon** — the note's §3.2
  does not invent one and no §10 ruling has entered one —
  so every preset name declines D1, and a merely *stated*
  record under the name does not resolve the citation
  (pinned). When a canon entry is held, the citation
  resolves to the canon's own statement (pinned with a
  test-entered canon, provenance naming the test ruling —
  the machinery is proven without a canon being shipped).
- **D3 (outside the domain)** — outside the stated domain
  interval, and, for a points curve, outside the span of
  the points that state it: Form does not extrapolate.
- **D4 (no stated interpolation)** — a point set with no
  rule is held as points; asked as a curve, it declines —
  the set is not silently joined by the nearest rule.
- **D5 (undecidable)** — at the two locations this slice's
  forms produce: monotonicity over a stretch extending
  past a points curve's span, and steepest-where for a
  step-interpolated curve (its rate is zero along the
  steps and a discontinuity at the jumps — no steepest
  point stands as a number). Also at a canon entry that
  itself only cites another preset.
- **D8 (broken lineage)** — a record citing a parent the
  register does not hold answers nothing; the audit names
  the missing parent, and the orphan is not treated as a
  first record. An edit of such a record declines at the
  same break.
- **D9 (application without a domain)** — see the seam
  below.

D2, D6, D7, D10 belong to F2/F3 and to the testimony
boundary; they land with their slices.

## The animation seam, stated plainly (§3.4)

`evaluateAnimationCurve` takes a clock reading **from its
caller** — a value plus the standing the caller claims for
it — and names that standing in the answer's method. With
no reading supplied it declines D9: Form does not read a
clock, and does not treat the frame's stated time as a
reading. On this base **Timekeeping is not built** — it is
the time programme's work, proceeding in its own worktree
against the time note; what stands here is Slice 5's frame
(a stated time, explicitly not a reading). The seam is
therefore a function boundary, exactly where §3.4 draws
it: when Timekeeping lands, its readings are what a caller
passes here, and nothing in this module changes.

## Defaults taken (flagged for ratification)

- **No conversational curve authoring** — the register is
  held and asked at module level; §10.3's posture question
  is untouched, as the brief directed.
- **Evaluation stays Form's act** over its own holdings
  (§10.5 left as the note leaves it); no Functions-library
  entry is created.
- **Decline wordings are drafts** — every reply text in
  `form.ts`/`form-curves.ts` is marked the owner's to
  settle, in the house manner.

## Gates

Baseline reproduced on unmodified `836a5d0` before
building: suite 1390 tests / 1387 pass / 0 fail / 3
skipped · demo 29/29 · holdout 80/80 · sense A 11/11 ·
B 6/6 · ai:check OK (100 nodes).

At this slice (fresh complete runs): suite **1403 tests /
1400 pass / 0 fail / 3 skipped** (the baseline's 1390 plus
this slice's 13) · demo **29/29** · holdout **80/80, 0
parse / 0 round-trip regressions** · sense **A 11/11 ·
B 6/6** · ai:check **OK** (100 nodes).
