# Monitoring Unit

Schematic address: `monitoring`
Type: Unit · State: partial (40%)

## What stands here

The Monitoring Unit (Monitoring programme M1, 2026-11-21; design:
`docs/ansci/monitoring-design-note.md`, which governs): the system's
standing watches. A monitor is a record — a subject and a source, an
interval (a pattern of intent, anchored, its standing named), a change
rule (no rule, no monitor), a registrar who alone may amend by
supersession or cancel, an expiry that is never omitted, and a
complete history of every check that ran, fired and unfired.

Built across the programme: the register over the system's own banks
(M1) — staleness monitors whose checks are Timekeeping staleness
questions, riding Scheduling due items, priced by the Planner, their
firings proposing the refresh as a scheduled re-consultation;
consultation monitors over the situated place's weather (M2), whose
checks run through the weather wrapper's chain and whose firings
raise a telling the Planner prices as its own act; and the monitor
as an Expectation's mechanism (M3) — a what's-there watch registered
under an expectation's own registrar, its expiry the expectation's
deadline exactly, the two records closing together whichever way the
wait ends. The silence discipline stands as designed throughout: a
no-change check is recorded and raises nothing; the one permitted
heartbeat — a single demand about a monitor whose checks are
repeatedly declined at pricing — is the only exception, and it is
about the watch, never the watched.

The Expectation contrast is the charter's spine: an expectation waits
for one arrival and closes; a monitor persists and raises only on
change. Where a monitor serves an expectation, the service is a
cross-citation on the two records, never a merger.

Code: `src/ansci/monitoring.ts` (the register, the standing
comparison, the endings), `src/ansci/monitoring-turn.ts` (the wired
layer). The waking limit is stated in every record's standing:
turn-boundary — checks run when the conversation runs; between turns
nothing is watched.
