# Monitoring programme — M2 report: consultation monitors over the weather chain

2026-11-21 · Branch `track/monitoring-build` · Base: M1 `4d30476` (on
`fd1c0bb`, the Time programme's final head). Local only — nothing
pushed, nothing merged.
Design: `docs/ansci/monitoring-design-note.md` §7.1 (the slice), §3.4
(the check), §8 (the catalogue).

## What was built

- **The weather check** (`runWeatherMonitorCheck` in
  `monitoring-turn.ts`): a due check consults through the weather
  wrapper's own chain — `bankConfiguredCoordinates`, the register's
  `resolvePlace` (configured → banked → consulted, with the situated
  place as the ranker's proximity evidence), the source's
  `currentConditions`, and the reading banked by
  `readingFromObservation`, the wrapper's one construction (exported
  from `weather-turn.ts` with `WeatherDeps`, `bankConfiguredCoordinates`
  and `situatedEvidence`, each export commented with its reason: one
  chain, one banking, two callers). The banking is noticed by any
  expectation waiting on the place's reading (`noteWeatherReadingBanked`),
  exactly as the wrapper's bankings are.
- **The comparison** (`recordWeatherCheck` in `monitoring.ts`): the
  condition word, precipitation beginning or ceasing, a reading
  arriving after unavailability, and a stated run of successive
  unavailability — against the last reading, which the new reading
  replaces in all cases where a reading exists (§3.4). The first check
  is the baseline (not-comparable). Unavailability is recorded as a
  stated state — last reading unchanged, next check as usual, nothing
  raised — unless the rule names it, where the firing is at the check
  the stated run is REACHED; a continuing run does not re-fire, a
  reset run that climbs again fires again at the same count.
- **The registrar seam** (`registerSituatedWeatherMonitor`):
  GeographyAwareness registers over the place the conversation is
  situated at — the interlocutor's stated place (the deictic centre),
  or the configured seat where no statement stands. Neither standing,
  the refusal is located at the subject in GeographyAwareness's terms.
  The place is carried as the conversation states it; the register's
  resolution normalises case on lookup.
- **The telling, priced as its own act**: a firing's demand proposes
  the telling and carries both readings; the wired layer prices the
  telling separately (`priceTelling`), and the outcome rides the
  firing (`telling: { priced: "told", wording }` or
  `{ priced: "declined", ground }`) and a `telling` entry in the
  monitor's history. The Unit does not speak; the told wording is a
  draft composed from the two readings.
- **Registration**: the M1 refusal on weather-reading subjects is
  lifted (the what's-there refusal stands until M3, same words). The
  staleness/content rule-kind separation is unchanged and now
  exercised from both sides.
- **Seat**: registry holding `monitor-consultation` added (the seat
  itself was placed in M1; this slice extends its holdings, percent
  unchanged).
- **Tests**: `test/ansci-monitoring-m2.test.ts`, 6 tests; the M1
  refusal test amended to the what's-there subject that keeps the
  refusal.

## The acceptance (§7.1), as exercised

A situated-place monitor (registrar "Awareness (GeographyAwareness)",
rules: condition word differs; precipitation begins or ceases) over a
scripted source: check 1 banks its reading as the wrapper banks
today's (fetched at the check's instant, expiring under the bank's
TTL) and records the baseline; check 2, same condition, records
no-change and raises nothing; check 3 (clear → rain, precipitation
begins) fires BOTH clauses — the trace shows the demand, both
readings, and the telling priced and told with its draft wording;
check 4 (rain continuing) is silent — precipitation continuing is not
precipitation beginning. The history stands `[registered,
not-comparable, no-change, change, telling, no-change]`. The declined
telling is exercised separately: priced, declined with its ground,
recorded on the firing and in the history, exactly as a declined
check is recorded.

## One bug found in M1's validation, fixed here

M1's rule/subject validation refused content rules over "a bank's own
holding" without scoping the refusal to bank subjects — unreachable
in M1 (consultation subjects were refused earlier in the same
function), exposed the moment M2 made a consultation subject
registrable. The refusal is now scoped to non-consultation subjects;
M1's refusal tests pass unchanged and M2's staleness-over-consultation
refusal test pins the other side. Recorded here because the M1 report
described the validation as complete: the description stood, one
branch of it was mis-scoped.

## Design readings taken (stated, not hidden)

1. **A monitor check's banking does not register the T2 re-check.**
   The monitor IS the standing watch for the place; a second refresh
   chain armed at the reading's expiry would compete with the
   monitor's next check (and M1's composition test shows what the two
   chains do when both stand: the earlier refresh wins and the later
   check finds the fact fresh). §7.1 says readings are banked "as the
   wrapper banks today's" — the banking construction and provenance
   are the wrapper's; the re-check registration is the answer path's
   behaviour for asked readings, not part of the banking.
2. **The unavailable-successive firing is at the reaching check**
   (run == count), not at every check past it — the crossing is the
   event, as with the staleness rules' entering semantics (M1 reading
   2).
3. **A check on a turn with no weather chain wired is unpriceable**,
   recorded in the history as such — the wiring's absence is a stated
   state, never improvised around with defaults the turn did not
   carry. (The chain's own assembly uses the weather wrapper's
   defaults for source and services, as the wrapper's does.)
4. **The situated place is the interlocutor's stated place first**,
   the configured seat second — GeographyAwareness's centre before
   its seat, which is the order its own weather shape reads "here".

## Defaults flagged for the owner's ratification

All of M1's flags stand. New in M2: the telling's draft wording
("The weather in <place> has changed: <new reading> — before, it
was: <last reading>.") is **owner's-to-settle**; tellings are priced
through where no pricing hook is wired (the standing default, as with
checks). Nothing in M2 was pushed or merged.

## Gates

M2, fresh complete runs on the slice tree: suite **1482 tests / 1479
pass / 0 fail / 3 skip** · demo 29/29 · holdout 80/80, 0 regressions ·
sense A 11/11, B 6/6 · ai:check OK (106 nodes).

## What remains open after M2

M3 follows: the monitor as an Expectation's mechanism (§7.3), over
the what's-there consultation. The note's §10 questions stand as
flagged in the M1 report.
