# Time programme — T2 report: Scheduling

Date: 2026-11-20. Branch: `track/time-build`, on T1's commit
c939d33 (base `origin/main` 836a5d0). Specification:
`docs/ansci/time-scheduling-design-note.md` §3 (Scheduling),
§5.2–§5.3, and §6 slice T2. House pattern: what was built,
what the acceptance showed, construction vs test, defaults
taken (flagged), what remains open. Nothing was pushed; the
commit is local.

## What was built

**`src/ansci/scheduling.ts`** — the Scheduling family
(`functions/scheduling`, seat state `partial`, holdings
`schedule-registration` and `schedule-sweep`):

- **The register (§3.1).** A session-scoped register on the
  Session (the problem register's pattern; initialised
  empty). The record carries every field the note's table
  names: `owed` (the registering unit's own statement —
  Scheduling holds it, never interprets it), `trigger`,
  `registeredBy`, the registration stamp (`registeredAtISO`
  plus `registeredAtStanding` — the standing's own statement
  of itself, so the stamp names its standing as §2.2
  requires), the registration's own shelf life, `onDue`
  (the demand, stated at registration), and the two
  placement fields (`calendarPlacement`,
  `timelinePlacement`) standing in the record's shape,
  awaiting C3 to make them live. Trigger kinds: `at`,
  `after` (a duration from a stated anchor — the anchor is
  part of the trigger, stated at registration from the
  standing; unanchorable registrations are refused, stated),
  and `at-and-condition` (the condition stated in terms a
  **named** evaluator can evaluate — the sweep asks the
  evaluator the caller supplies; Scheduling never
  interprets condition text). A bare condition is not a
  trigger kind, by construction.
- **Registration ≠ authorisation, enforced at the
  register.** Registering fires nothing, prices nothing,
  approves nothing. Two refusals exist at the register,
  both stated: a "no expiry" registration without its
  reason (§3.1: a stated value with a reason, never an
  omitted field), and an "after" trigger no standing can
  anchor.
- **The registrar-only rule (§3.1).** `cancelSchedule` /
  `amendSchedule` refuse any unit but the registering one,
  with the ground stated; the registrar's cancel closes
  the item stamped (when, and how).
- **The opening sweep (§3.5).** `sweepSchedule` runs at
  every turn's opening inside `processTurn` — the one
  entry every conversational turn passes through — before
  the new input is planned, under the turn's best time
  standing (Timekeeping's `turnTimeStanding`), and only
  when the register holds anything open (an empty register
  consults no clock and changes nothing). Due items raise
  their demands; registrations whose own shelf life passed
  before their trigger close **lapsed**; an item with no
  standing to price it is annotated **unpriceable** (the
  §5.3 decline located at Timekeeping's missing reading)
  and stands. Outcomes ride the trace as
  `trace.scheduleSweep` — annotations, never merged into
  the visitor's input. A registration made during a turn
  is stamped within it and stands from the next turn's
  sweep forward (§3.5.3) — structurally: the sweep has
  already run before any registration that turn can make.
- **The Planner's decline (§3.2, §5.3).** `declineDueItem`
  closes a due-raised item with the decline — naming the
  item, its registrar, and the ground — as its closing
  evidence. `closeFiredItem` stamps the fired-and-done
  end. Every end is a recorded end.
- **The driver contract's entity side (§3.4).**
  `whatIsDue` / `whatIsOpen` are pure queries: asking
  changes nothing (a test pins that). No host driver is
  built; the waking limit stands as designed — items are
  evaluated at turn boundaries, and an item's record says
  when it fell due (`dueAtISO`) and which turn took it up.

**The wired consumer (§5.2's chain).** In
`weather-turn.ts`: a reading banked by a live lookup now
registers its own refresh — an item owed by the weather
wrapper, due at the reading's expiry, its registration
expiring one further shelf life past the trigger. At a
later turn's opening sweep the item falls due; the
wrapper — the machinery the owed action names — prices
the demand and executes it: resolve the place through the
geography pair's protocol, fetch, re-bank, close the item
fired-and-done. The sweep outcome on the trace is
completed with the **pricing** and the **re-bank**, so the
acceptance's three trace elements (firing, pricing,
re-bank) all stand on the one outcome record. The
refreshed reading registers its own refresh — the chain
continues. If the turn's own business is a weather
question for the same place, it answers from the
re-banked reading with no second fetch. A re-check that
meets an unavailable source (or an unresolvable place, or
the coverage limit) is §5.3's stated state: recorded on
the item as an event, the item stands due, the wait
continues to its registration expiry, and the stale
reading is never served in its place.

One refactor, behaviour-preserving: the banked-reading
construction the lookup flow used inline is now a shared
helper (`readingFromObservation`) used by both the lookup
and the re-consultation, so the two bankings cannot drift.

## Acceptance (§6, T2) — what the tests show

`test/ansci-time-t2.test.ts`, 14 tests, all passing:

- The §3.1 record stands complete; both register refusals
  fire stated; the registrar-only rule refuses and the
  registrar's cancel closes stamped.
- A due item raises the demand stated at registration on
  the trace of the turn whose opening takes it up; before
  its time, the sweep is silent. Registration alone raises
  nothing even when the trigger is already past — the
  sweep, not the registration, is what raises it.
- A lapsed registration closes as lapsed with the
  catalogue's accounting ("a commitment the system let die
  is accounted, not vanished").
- No standing → unpriceable, located at the missing
  reading; the item stands.
- Time+condition: unassessed and unmet leave the item
  standing; holding fires it.
- The Planner's decline closes a due item with the
  decline as its closing evidence, naming item, registrar
  and ground; a standing item cannot be declined.
- **The §5.2 chain, end to end**: a reading banked with a
  one-minute TTL registers its refresh; at the next turn
  (a plain statement — the re-consultation does not hijack
  the turn's business) the sweep fires it, the wrapper
  re-consults exactly once, and the bank holds a fresh
  reading where the stale-only decline would have stood —
  firing, pricing and re-bank all asserted on the trace's
  sweep outcome. A weather question at the due turn
  answers from the re-banked reading with no extra fetch.
  With the source down at the due sweep: the outcome is
  `reconsult-unavailable`, the item stands due with the
  attempt on its record, and no fresh reading is banked.

## Gates (fresh, complete runs on this slice's tree)

| Gate | Figure |
|---|---|
| Suite | 1420 tests · 1417 pass · 0 fail · 3 skip (T1's 1406/1403/0/3; +14 = the T2 tests) |
| Demo | 29/29 expectations met |
| Holdout | 80/80 parsed · 0 parse regressions · 0 round-trip regressions |
| Sense evals | A 11/11 · B 6/6 |
| ai:check | OK — 102 nodes (82 directories); root page carries all 99 percented nodes |
| T2 tests | 14/14 (in the suite figure) |

## Verified by construction vs by test

- **By test:** every acceptance item above; the sweep's
  silence before due time; the chain's single re-fetch;
  the unavailable re-check's stated state.
- **By construction:** Scheduling never acts — the module
  contains no consultation, reply or execution code; its
  only effects are register mutations and outcome records.
  The sweep's place in `processTurn` is before planning,
  at the single public entry; segmented sub-turns recurse
  below it, so a multi-segment turn is swept once. The
  "never a bare condition" rule is the trigger union's
  shape, not a runtime check.

## Defaults taken — flagged for ratification

1. **The re-check's registration expiry**: the trigger
   (the reading's expiry) plus one further shelf life of
   the same length. The note fixes neither the firing
   point within the shelf life nor the registration's
   expiry for this consumer; firing is at the expiry
   instant itself — the first moment the reading is stale
   — so the refresh pre-empts the stale-only decline at
   any later asking, which is §3.3's stated purpose. A
   lead margin before expiry is the owner's to set if
   wanted.
2. **Map percent 40** for `functions/scheduling` — set by
   us, the T1 convention for a built-but-partial family.
3. **Session-scoped register** (§7.2's conservative
   default): nothing persists past the session. **No caps**
   (§7.4: the note proposes no number; none imposed).
   **No conversational registration** (§7.3): units
   register; visitors do not, in this slice.
4. Sweep annotation policy: standing items that are
   neither due nor lapsed are not annotated (the sweep is
   silent about what has not changed — Monitoring's
   silence discipline, applied here); unpriceable items
   are annotated at every sweep they persist through,
   since the Planner must price that state each turn.

## What remains open after T2

- **Scheduled self-turns** (§3.3's second demonstrator
  use) have their machinery — any unit may register one
  and its demand will be raised — but no unit registers
  one yet, and no conversational surface takes a raised
  self-turn demand up as a turn's business. That uptake
  is Planner work the note leaves to the slices that need
  it; T3's §5.1 chain is the first.
- Expectation's half of the §3.5 sweep (timeouts,
  satisfactions) is T3's; the sweep composition point in
  `processTurn` is ready for it.
- The placement fields stand empty in every record until
  C3; §3.5's sweep therefore compares instants, and
  §8.10's "the sweep compares dates" becomes true when
  Calendar lands.
