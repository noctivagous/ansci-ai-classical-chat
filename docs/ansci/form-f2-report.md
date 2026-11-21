# Form F2 — Proportion records (build report)

*Built 2026-11-20 in the track/form-build worktree on top of
Form F1 (`79a18a6`), under the owner's commission of the
form design note's slices F1–F3 ("build all of them"). The
design note (docs/ansci/form-design-note.md — branch
track/form-design) governs; this slice is its §9.2, building
§4 (Proportion) against the declines of §8. Nothing is
pushed; the work stands as a local branch commit awaiting
the owner's word.*

## What was built

- **The relation record** (`src/ansci/form-proportions.ts`,
  its store in `src/ansci/form.ts`) — a proportion is held
  in the same register as the curves, under the same
  discipline: the terms (each with what it measures, its
  dimension where known, its unit where it is one
  UnitsMeasurement files), the ratio **as stated by its
  source** (the record holds the statement and its factor;
  it does not re-derive the statement into a decimal it
  never claimed), its provenance (required — a proportion
  with no provenance is not held), and its standing (what
  the record may be used for: cited in an answer, used to
  scale a quantity, checked against a claimed relation).
- **The acts** (§4.1) — `stateProportion` (the ratio in
  words), `compareProportions` (Ordering's question asked
  of Form's records, answered from the stated ratios as
  held — the magnitudes are not re-measured),
  `scaleProportion` (the other term's value, with the
  derivation stated in full: the input, the stated ratio,
  the result — a computation, never testimony, on the
  geography programme's OSRM precedent).
- **The named register** (§4.2) — `enterStandingProportions`
  holds **doubling** and **the half** by name, their
  provenance stated as what it is: the owner's settled
  design, recorded in the note. A ratio may be cited by a
  held name and resolves to the named record's ratio.
  Beyond those two, **no canon is invented**: any further
  name declines D2, at hold time and at lookup alike. The
  Luoshu and the Suwen number row are not annexed — the
  note cites them as precedent for how such knowledge
  stands, and this slice follows the note.
- **Conversion factors cited, not duplicated** (§4.3) —
  `proportionFromConversion` holds a proportion whose ratio
  is a UnitsMeasurement factor, read from that table at
  hold time, its provenance naming the UnitsMeasurement
  record as its source. The factor's home does not move,
  and conversion questions still answer through
  UnitsMeasurement itself (pinned: `convert()` results are
  unchanged by the citation's existence). Form is not a
  second conversion route.

## Declines, at their locations (§8)

- **D2 (unknown named proportion)** — a ratio cited by an
  unheld name, a proportion resolved by an unheld name,
  and a term stated in a unit UnitsMeasurement does not
  file (the term's dimension cannot be read).
- **D7 (incommensurable terms)** — at hold: two terms of
  known unlike dimension with no stated relation making
  them comparable are refused, and nothing is held — a
  ratio is not manufactured by dividing the numbers
  anyway. With a stated relation (the acceptance's price:
  coins per kilogram), the same magnitudes hold, the
  relation standing in the record. At citation: a
  cross-dimension conversion has no factor to cite, and a
  temperature scale is not a ratio, so no proportion can
  cite it as one.

## Defaults taken (flagged for ratification)

- Where a term's dimension cannot be determined at all
  (no dimension stated, no unit), the stated ratio itself
  stands as the relation and the record holds — D7 fires
  only where both dimensions are **known** and unlike
  with no stated bridge. The alternative (refusing every
  dimension-free pair) would refuse the recipe proportions
  the note's own examples trade in; the report states the
  choice so it can be ruled on.
- Decline wordings are drafts, the owner's to settle.

## Gates

At this slice (fresh complete runs): suite **1408 tests /
1405 pass / 0 fail / 3 skipped** (F1's 1403 plus this
slice's 5) · demo **29/29** · holdout **80/80, 0 parse /
0 round-trip regressions** · sense **A 11/11 · B 6/6** ·
ai:check **OK** (100 nodes).
