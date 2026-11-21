# Form F3 — Repetition: patterns held, detection with its floor (build report)

*Built 2026-11-20 in the track/form-build worktree on top
of Form F2 (`3e614a5`), under the owner's commission of the
form design note's slices F1–F3 ("build all of them"). The
design note (docs/ansci/form-design-note.md — branch
track/form-design) governs; this slice is its §9.3, building
§5 (Repetition) against the declines of §8. Nothing is
pushed; the work stands as a local branch commit awaiting
the owner's word.*

## What was built

- **Pattern records** (`src/ansci/form-repetition.ts`, the
  store in `src/ansci/form.ts`) — a repetition held as
  knowledge: the repeating unit as a sequence of steps,
  the domain the steps run over, the period **as its
  source states it** (the record holds the statement;
  detection works in steps, where the period is the unit's
  length), its provenance, and its lineage — patterns
  stand under §3.3's append-only discipline, applied to
  patterns as §5.3 directs: an edit is a new record citing
  its parent, the parent's citation still resolving to the
  parent.
- **The known cycles** (§5.2) — `enterKnownCycles` gives
  the cycles the system already traffics in a second,
  citable statement as pattern records: the **generating
  cycle (sheng)** and the **controlling cycle (ke)**, their
  units **read from the `GENERATES`/`CONTROLS` constants in
  sentence.ts by following them**, never re-typed here, so
  the record cannot drift from the machinery it cites; the
  **seasons** and **dayparts**, citing `SEASON_CONVENTION`
  and `DAYPART_CONVENTION` in session.ts, whose text stands
  in the records' provenance. The conventions stay where
  they are and keep doing their work — nothing is migrated.
- **Detection** (§5.2) — `detectRepetition` over a given
  sequence of steps (labels or numbers): the smallest
  consistent period, matched against the known cycles by
  unit up to rotation, the match naming the cycle and the
  sequence's phase in it. An assertion's method states
  what it is: a computation over given material, claiming
  nothing about the world the sequence came from (§6).
- **The standing register** (`src/ansci/form-standing.ts`)
  — the composition the note leaves standing: a register
  with F2's named proportions and F3's known cycles
  entered, each with its provenance, and **no preset
  canon** — a bare register and the standing register
  alike decline preset names at D1, as designed.
- **The Scheduling cord, specified not built** (§5.3) —
  `citePattern` resolves a citation to the record **as it
  stands**; a later edit does not move it, and the
  lineage's latest is a separate, explicit ask
  (`latestPatternInLineage`). No Scheduling code is
  touched: whether periodic triggers are admitted is
  Scheduling's extension to make, and this slice builds
  only what such a trigger would cite.

## The evidence floor, as implemented (§5.2)

The floor is implemented **exactly as the note states
it** — a repetition may be asserted only when the
sequence shows at least two full periods: the unit
observed complete at least twice, three occurrences of
its boundary (sequence length ≥ 2·period + 1). It is not
loosened anywhere for an acceptance; the tests pin its
edges:

- the §7.3 daypart sequence (9 steps, period 4 — exactly
  at the floor) asserts and names the daypart cycle;
- one-and-a-half periods of the dayparts (6 steps)
  declines **D6**, the candidate (period 4, the daypart
  unit) named **as a candidate** in the decline's own
  wording;
- `[a, b, a, b]` — the unit complete twice but its
  boundary occurring only twice — declines D6 with
  candidate period 2; one more step asserts;
- a two-step constant sequence declines with candidate
  period 1; three steps assert period 1;
- a sequence too short to show even the smallest unit
  twice over declines D6 with no candidate to offer;
- a long sequence with no consistent period at any
  floor-checkable length returns the finding **"none"** —
  an answer about the given material, not a decline
  dressed as one.

## Declines, at their locations (§8)

- **D2** — a cycle or pattern resolved by a name the
  register does not hold.
- **D6** — as above; the decline states the floor and
  what the sequence does show.
- **D8** — a pattern citing a parent the register does
  not hold: its audit names the missing parent, as a
  curve's does.
- **D10 (world claim at the wrong gate)** — `testifyCycle`
  is the location: asked to witness that the world runs a
  cycle, Form returns `witnessDecline` (in `form.ts`,
  shared by all three members): it can state the form of
  the filed claim and cite its filing, or detect the
  pattern in given material — the claim itself belongs to
  the knowledge graph and its gates. Detection's own
  method strings carry the same boundary from the other
  side: an asserted repetition asserts about **this
  sequence**, never about the world it came from.

## Defaults taken (flagged for ratification)

- Cycle matching is by exact unit, up to rotation; a
  sequence repeating a sub-unit or a multiple of a known
  cycle's unit is asserted on its own terms without the
  cycle's name. Widening the match is a design question,
  not taken here.
- Decline wordings are drafts, the owner's to settle.

## Gates

At this slice (fresh complete runs): suite **1417 tests /
1414 pass / 0 fail / 3 skipped** (F2's 1408 plus this
slice's 9) · demo **29/29** · holdout **80/80, 0 parse /
0 round-trip regressions** · sense **A 11/11 · B 6/6** ·
ai:check **OK** (100 nodes).
