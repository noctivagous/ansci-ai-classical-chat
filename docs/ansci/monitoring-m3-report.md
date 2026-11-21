# Monitoring programme — M3 report: the monitor as an Expectation's mechanism

2026-11-21 · Branch `track/monitoring-build` · Base: M2 `be860da` (on
M1 `4d30476`, on `fd1c0bb`, the Time programme's final head). Local
only — nothing pushed, nothing merged.
Design: `docs/ansci/monitoring-design-note.md` §7.3 (the slice),
§7.3.1–§7.3.3 (the mechanism's terms), §4 (the contrast the slice must
not blur); the time note's §4.3–§4.6 (the joint charter, the gates,
the timeout).

## What was built

- **The what's-there check** (`runWhatsThereMonitorCheck` in
  `monitoring-turn.ts`): the register resolves the place, the Overpass
  consultation answers for the monitor's bounded category at the
  client's default radius (10 km — the radius the what's-there shapes
  use; a monitor-specific radius is not a record field at this rung),
  and the set is banked into the register with the geography wrapper's
  own entry construction and retrieved provenance.
- **The comparison** (`recordWhatsThereCheck` in `monitoring.ts`):
  the arrival clause and the stated unavailability run, under the
  same discipline as the weather check's — unavailability recorded as
  a stated state, the last reading unchanged, nothing raised unless
  the rule names it. An empty set is a reading: the source answered.
- **The mechanism's registration** (`registerMonitorForExpectation`):
  the cross-citation made structural — the monitor's registrar IS
  the expectation's registering unit, its expiry IS the expectation's
  deadline exactly, `servesExpectationId` names the wait on the
  monitor's record, and the rule defaults to the arrival clause.
  Refusals located at the expectation: none stands under the id, or
  it already ended.
- **The joint closing, both ways.** Satisfied: the check's banked set
  is offered through `offerSatisfier` (route: consultation; the gate
  named in the offer is the banking itself, with its retrieved
  provenance) — the expectation closes satisfied, the evidence files
  into the problem record, which closes with it, and the monitor
  closes as `closed-by-expectation` in the same turn, its satisfied
  outcome riding the trace's `expectationSweep` beside the sweep's
  own. Timeout: the expectation's sweep raises the timeout, and the
  wrapper's joint-closing pass (`closeMonitorsForEndedExpectations`,
  run BEFORE the expiry pass, so the cause is named correctly) closes
  the monitor with it — `closed-by-expectation`, its closedHow naming
  the expectation's timed-out end. A reading arriving after the
  expectation ended is recorded on the monitor as a late arrival
  (`noted`): it banks, it satisfies nothing.
- **Registration completed for what's-there subjects**: the M1/M2
  not-wired refusal is lifted; the bounded category table is now the
  validation — a category outside it is refused at the subject (no
  consultable source stands behind it; the client takes categories
  from the table, never a raw query), and a weather-content rule over
  a what's-there subject is refused at the rule as unsatisfiable as
  stated. The M1 refusal test has tracked the wiring slice by slice
  and now pins the category refusal.
- **Seat**: registry holding `monitor-expectation-mechanism` added;
  the seat's placeholder text now states the Unit's full reach.
- **Tests**: `test/ansci-monitoring-m3.test.ts`, 5 tests.

## The acceptance (§7.3), as exercised

T3's walk re-run with the monitor as the mechanism: a lack-of-information
problem (the what's-there question's decline, filed), an expectation
over it (registrar "the geography wrapper", deadline 30 minutes), and
the monitor registered as its mechanism. **Satisfied ending:** with
the source down, the check records the unavailability and raises
nothing, both records open; with the source up, the check banks the
set (two schools; a bench element is filtered out by the category
table; entries banked nearest-first, as the wrapper banks them),
fires the arrival, offers the set, and the records close together —
expectation satisfied, problem record closed with the filed evidence,
monitor `closed-by-expectation`, history `[registered, unavailable,
change, ended]`, and no check runs after. **Timeout ending:** the
source stays down; two checks record the unavailable run, raising
nothing; past the deadline the expectation's timeout raises with its
demand, the problem record stands (the need reverts to a standing
lack, §4.6), and the monitor closes with it — `closed-by-expectation`
naming the timed-out end, not a bare expiry, though its expiry WAS
the deadline. A what's-there monitor standing alone (no expectation)
is also exercised: registrable, its arrival an ordinary demand, the
monitor persisting past its firing.

## Design readings taken (stated, not hidden)

1. **The banking is the gate named in the offer.** §4.4 requires the
   offer to carry the gates' verdict from the machinery that ran
   them; for a consultation result, the machinery is the register's
   banking under retrieved provenance, and the offer says exactly
   that. The expectation does not re-run gates, and neither does the
   monitor.
2. **The joint-closing pass runs before the expiry pass**, so a
   monitor whose term and whose expectation's end are the same event
   is closed under the cause that explains it. An expectation that
   ended by a route other than this monitor (satisfied by an
   intervening banking, cancelled) closes its monitor the same way —
   the pass reads the expectation's status, not the route.
3. **An empty set satisfies.** The satisfier is a what's-there
   RESULT; a consultation that answers "none within the radius" has
   delivered the fact the wait was for, and the banked empty set is
   what the waiting question is then answered from.
4. **The monitor's radius is the client's default**, not a record
   field: §7.3 does not name a radius, and the what's-there shapes'
   own default is the only stated one. Flagged below.

## Defaults flagged for the owner's ratification

All of M1's and M2's flags stand. New in M3: the what's-there
monitor's radius (the client's 10 km default, above). The mechanism's
registration is a unit's act (the expectation's registrar), as
registration has been throughout the programme — no conversational
surface. Nothing in M3 was pushed or merged.

## Gates

M3, fresh complete runs on the slice tree: suite **1487 tests / 1484
pass / 0 fail / 3 skip** · demo 29/29 · holdout 80/80, 0 regressions ·
sense A 11/11, B 6/6 · ai:check OK (106 nodes).

## What remains open after M3

The programme report closes the build. The note's §10 questions stand
as flagged across the three slice reports: mandatory expiry (the lean
followed), cancellation and change-rule authorship (registrars only),
map placement wording, and the defaults named per slice.
