# Time programme — C3 report: Timelines and placement

Date: 2026-11-20. Branch: `track/time-build`, on C2's
commit 5b72cf7 (base `origin/main` 836a5d0). Specification:
`docs/ansci/time-scheduling-design-note.md` §8.7–§8.11
and §8.12 slice C3. House pattern throughout. Nothing
was pushed; the commit is local.

## What was built

**`src/ansci/timeline.ts`** — the Timeline family
(`functions/timeline`, seat state `partial`, holdings
`timeline-relations` and `timeline-duration-read-off`),
and the placement machinery in `src/ansci/scheduling.ts`
(holding `schedule-placement`) with the deadline
placement in `src/ansci/expectation.ts`:

- **Allen's algebra, ported (§8.8).** The thirteen
  basic relations computed from their endpoint
  definitions (nine comparisons), the converse
  structure, and the composition table **materialised
  as data by enumeration**: every endpoint ordering of
  three proper intervals over six ranks is generated,
  the orderings standing in the two given relations are
  kept, and the relations the third pair can stand in
  are collected. The table was not transcribed from a
  printed rendering — a copying error there would be
  silent; the enumeration can only be wrong if the
  endpoint definitions are, and those are the nine
  comparisons the tests exercise directly. Borders
  kept: no fourteenth relation (a composition result is
  a *set* of basics — the algebra's own general
  relation), no metric reasoning inside the algebra, a
  computed relation cited as a computation inheriting
  the weaker of the two extents' standings.
- **Timeline objects for the three owner kinds
  (§8.7).** The **conversation's own** first: built
  from the session's records — problems opened,
  expectations registered, schedule items registered
  and taken up — on the turn-order axis, inventing
  nothing. A **plan's**: the schedule register viewed
  as a line, entries the commitments themselves,
  extents from registration to the due instant (the
  trigger's instant where the item still stands —
  found and fixed in this slice's testing: the first
  cut read only the stamped due instant, leaving every
  standing item unplaced). A **knowledge** timeline:
  the builder holds what an intake gives it; the
  record states plainly that no chronology is banked
  today and no production path calls it.
- **Durations read off the line (§8.9)**: the
  difference of two extents' starts on the line's
  axis, as a derivation — through the fixed-date
  conversion where the endpoints stand in different
  systems, and the derivation says so.
- **§3.1's placement fields live (§8.10).**
  `placementDates` computes a pattern's landings on a
  named grid: the pattern as Form's Repetition record
  states it (period and phase; the short-month rule
  stated **at the placement** — last-day or skip), the
  dates as the grid lands them, on the Gregorian,
  Julian and Chinese grids. `buildCalendarPlacement`
  writes the item's `calendarPlacement` field from that
  computation. Timeline placements are **re-computed
  at the sweep**: a stated relation that stops holding
  is an event on the item's record, recorded once —
  not a silent edit, and not a trace annotation.
- **The deadline's home (§8.10).** An Expectation's
  deadline is placed at registration — its date on the
  Gregorian grid (a fixed date), its line the
  conversation's own timeline — and §4.6's timeout
  evidence cites the placement it was evaluated
  against.
- **The declines (§8.11)** at their locations: the
  unplaceable entry (relations and durations decline
  at the placement, not at the event), the relation
  across unconverted systems (not computed by silently
  sharing a grid), the duration without both endpoints
  (one standing alone is a date, not a duration), and
  the unheld-system decline for placements naming an
  unheld grid.

## Acceptance (§8.12, C3) — what the tests show

`test/ansci-time-c3.test.ts`, 12 tests, all passing:

- **The thirteen relations** from endpoint examples,
  with the converse structure checked on every pair
  swapped; **the composition table** against the
  paper's own worked example (during ∘ precedes =
  {precedes}), the equals identity across all thirteen,
  non-emptiness and **converse symmetry over all 169
  cells**.
- **§8.10's pair, side by side**: from 31 January 2026,
  monthly-on-the-31st (last-day rule) lands 31 Jan,
  28 Feb, 31 Mar; every-30-days lands 31 Jan, 2 Mar,
  1 Apr; the skip rule lands 31 Jan, 31 Mar, 31 May.
  On the lunisolar grid, monthly-on-the-29th walks
  months 1–6 of 2026 landing on each month's 29th, and
  fourteen monthly landings through 2033 meet the leap
  eleventh month where the system places it.
- **A plan's line**: two commitments registered five
  days apart stand `precedes`, and the duration read
  off the line is 5 days; a knowledge line's duration
  across systems (30 days) carries the conversion on
  its derivation.
- **Placement relations re-computed**: a stated
  `precedes` the line computes as `starts` is recorded
  as a lapse event once across two sweeps; a relation
  that holds records nothing.
- **The deadline placed**: a registered expectation
  carries its placement (Gregorian, R.D. of the
  deadline's date, the conversation's line), and the
  timeout past the deadline cites the placement in its
  evidence.
- **The declines**, each asserted at its location with
  its ground in the text.

## Gates (fresh, complete runs on this slice's tree)

| Gate | Figure |
|---|---|
| Suite | 1461 tests / 1458 pass / 0 fail / 3 skipped (C2’s 1448, +13 across the slice’s files) |
| Demo | 29/29 |
| Holdout | 80/80, 0 regressions |
| Sense evals | A 11/11 · B 6/6 |
| ai:check | OK — 105 nodes (85 directories); root page carries all 102 percented nodes |
| C3 tests | 12/12 (in the suite figure) |

## Defaults taken — flagged for ratification

1. **Map percent 40** for `functions/timeline`.
2. **The composition table is generated, not
   transcribed** — a port decision taken under the
   house's solved-problem rule in reverse: where a
   printed table could carry a silent copying error,
   the algebra's own definitions generate it, and the
   tests pin the generation to the paper's example and
   the algebra's symmetries. If the owner wants the
   table also checked against a published rendering
   cell by cell, that is a further verification, not
   done here.
3. **Point extents ride the interval machinery**: a
   point (start === end) is placed by the same endpoint
   comparisons (a point inside an interval stands
   `during` it). Allen's algebra is stated for proper
   intervals; the point readings are the definitions
   read literally, flagged here.
4. **A plan entry's extent** runs registration → due
   instant (the trigger's, where unstamped). Another
   defensible extent (the due instant as a point) was
   not taken; the interval is what makes relations
   between commitments informative.
5. **Form is cited, not imported**: the pattern record
   is Scheduling's statement in Form's terms (Form is
   designed, not built); when Form's Repetition lands,
   the pattern type should become Form's own — a
   consolidation the owner schedules.
6. **Recurring firing stays out of scope** (§3.3, as
   amended by §8.10): C3 builds the placement — the
   record of where a recurring commitment stands and
   the dates it lands on — not a recurring trigger.
   The trigger still governs firing.

## What remains open after C3

- **No conversational authoring of Timelines** (§7
  question 7): entries arrive from the session's
  records and the register, never from conversation.
- **No knowledge timeline is populated** (§7 question
  8): the testimony route for chronology is an intake
  the programme does not perform.
- The trio's composition with **Monitoring** (standing
  comparisons over placements and staleness horizons)
  is designed in the monitoring note, unbuilt — its
  M-slices are a separate commission.
- §4.6's **telling** (the timeout's demand becoming a
  self-turn) remains unwired, as T3 left it: the
  timeout is filed and cited against its placement;
  speaking it unprompted is the host-driver question
  (§7 question 1), still the owner's.
