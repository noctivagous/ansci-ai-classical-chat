# Monitoring programme — programme report

2026-11-21 · Branch `track/monitoring-build`, worktree
`~/workspace/ansci-track-monitoring-build` · Base: `fd1c0bb` (the Time
programme's final head on `track/time-build`). Local only — nothing
pushed, nothing merged; the time-build worktree was only read.
Design: `docs/ansci/monitoring-design-note.md`, which governed; the
three slice reports (`monitoring-m1-report.md`,
`monitoring-m2-report.md`, `monitoring-m3-report.md`) carry the
per-slice detail, evidence, and readings.

## The dependency state found

The sequencing precondition was met in its complete form: the Time
programme's branch showed all six slice commits (T1 `c939d33`, T2
`a18edf9`, T3 `1a87aa1`, C1 `ab55407`, C2 `5b72cf7`, C3 `e6be9d2`) plus
its programme report (`fd1c0bb`), tree clean. This build cut from
that head — not an intermediate one — and reproduced its final gate
figures as its baseline before any change: suite 1461 / 1458 pass /
0 fail / 3 skip · demo 29/29 · holdout 80/80, 0 regressions · sense
A 11/11, B 6/6 · ai:check OK (105 nodes).

## What the programme built

One Unit, three slices, in the note's order:

- **M1 — the register and the bank over its own holdings**
  (`4d30476`). The monitor record (§2.2) on the Session; registration
  with the §8 refusals located; registrar-only cancel and
  supersession; expired-unclosed closing at the next sweep. Checks
  are Timekeeping staleness questions (fact form and weather-bank
  class form), riding Scheduling due items under a new
  `monitor-check` consumer, priced by the Planner through the wired
  layer (`monitoring-turn.ts`). A firing names the monitor, its
  registrar, the rule clause, and both readings, and proposes its
  refresh as a weather-reconsult Scheduling item — §7.2's chain,
  exercised end to end. The seat was placed (map node `monitoring`,
  40%; registry holdings `monitor-registration`, `monitor-check`).
- **M2 — consultation monitors over the weather chain** (`be860da`).
  A monitor over the situated place's weather, registered by
  GeographyAwareness through a registrar seam; checks consult through
  the weather wrapper's own chain and bank by its one construction;
  the comparison covers the condition word, precipitation beginning
  or ceasing, arrival, and the stated unavailability run. A firing's
  telling is priced as its own act and recorded told or declined.
  One M1 validation bug found and fixed (a refusal mis-scoped to bank
  subjects), recorded in the M2 report.
- **M3 — the monitor as an Expectation's mechanism** (`c1cc4ea`). A
  what's-there monitor registered under an expectation's own
  registrar, its expiry the deadline exactly, cross-cited; checks
  bank their sets into the geography register and offer them through
  the satisfaction seam. Both endings exercised: satisfaction closes
  the two records together; the timeout raises while the monitor's
  unavailable history raises nothing, and the monitor closes with it,
  named `closed-by-expectation`.

Across the programme: the silence discipline stands as designed
(no-change checks recorded in full, raising nothing; the one
permitted heartbeat — a single latched demand about a monitor whose
checks are repeatedly declined at pricing — and nothing broader);
registration is never authorisation (every check, and every telling,
is priced when it falls due); the waking limit is stated in every
record's standing (turn-boundary; driver-delivered refused, located,
because no host driver stands); the Expectation contrast is kept —
the two instruments share a cross-citation in M3 and never a record.

§3.2's reconciliation was made against the landed Form programme
(F1–F3 + its programme report, read before M1): the interval is a
period plus a named phase anchor, with an optional pattern citation
carried as data in Repetition's terms — cited, not imported, not
minted — and Repetition's detection floor is not applied to a stated
interval of intent. Detail in the M1 report.

## Gates, across the programme

Fresh complete runs per slice, on the slice tree:

| | suite | demo | holdout | sense | ai:check |
|---|---|---|---|---|---|
| baseline `fd1c0bb` | 1461 / 1458 / 0 / 3skip | 29/29 | 80/80, 0 regr. | A 11/11, B 6/6 | OK (105) |
| M1 | 1476 / 1473 / 0 / 3skip | 29/29 | 80/80, 0 regr. | A 11/11, B 6/6 | OK (106) |
| M2 | 1482 / 1479 / 0 / 3skip | 29/29 | 80/80, 0 regr. | A 11/11, B 6/6 | OK (106) |
| M3 | 1487 / 1484 / 0 / 3skip | 29/29 | 80/80, 0 regr. | A 11/11, B 6/6 | OK (106) |

26 new tests (15 + 6 + 5). No gate regressed at any slice. Gate
byproduct files were never committed.

## Defaults taken, flagged for the owner's ratification

Consolidated from the slice reports; each is a stated default in the
code or the record, none is a ruling:

1. **Expiry** — the note's mandatory lean followed: an omitted expiry
   is refused at registration; "no-expiry" stands only as a stated
   value with its reason (Scheduling's precedent). (§10.1)
2. **The waking floor** — 60 seconds (`TURN_BOUNDARY_FLOOR_MS`):
   below it, refusal at the interval, or the registrar's accepted
   restatement as a check at every turn.
3. **The heartbeat run** — 3 successive declined checks
   (`DECLINED_CHECK_HEARTBEAT_RUN`), latched at one per monitor.
4. **Standing** — turn-boundary only; driver-delivered refused at
   registration (no host driver stands).
5. **Cancellation and change-rule authorship** — registrars (units)
   only; rules change by supersession, never in place; no
   conversational registration or authoring surface was built.
   (§10.2, §10.3)
6. **First-look firing for staleness rules** — entering the named
   state includes a first check that finds it already there (the
   standing term before a first check is "unwatched", said in the
   demand). Content rules keep §3.4's first-check baseline.
7. **The change rule as a clause list** — fires when any clause
   fires, the firing naming the clause(s).
8. **A monitor check's banking does not register the T2 re-check** —
   the monitor is the watch; M1's composition test pins what the two
   chains do when both stand.
9. **The what's-there monitor's radius** — the client's 10 km
   default; not a record field at this rung.
10. **Map seat** — a single top-level Unit node `monitoring` at 40%,
    on the note §2.1's proposal; the §10.4 wording question stands
    open. Registers session-scoped; nothing persists.

All refusal, demand, and telling wordings are shapes in the §8
catalogue's terms — **owner's-to-settle**, as every programme's
wordings have been.

## What remains open

- The note's §10 questions stand as flagged above; nothing in the
  build forecloses them.
- Live-source verification: every check in this programme ran
  against fixture sources (the standing discipline — tests never
  touch the network). A live weather monitor turn and a live
  what's-there monitor turn against the real sources are owed the
  same kind of re-run the geography programme's G2 live answer is
  owed; the code paths are the wrappers' own, already live-verified
  in their programmes.
- The branch stands local: `fd1c0bb` → `4d30476` → `be860da` →
  `c1cc4ea` → this report. Landing it is the owner's word, as with
  every programme before it.
