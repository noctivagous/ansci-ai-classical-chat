# Scheduling

- **Schematic address:** `functions/scheduling` — inside the Functions Unit
- **Type:** Unit
- **State:** partial — **40% completed to goal** (set by us, assessed by the project, not measured or computed). Seat placed and built 2026-11-20 (Time programme T2; design: `docs/ansci/time-scheduling-design-note.md` §3).

## What stands here

The Functions Unit's commitment resource: commitments held as
records, defined over registrations, not over what the commitments
mean.

**The register.** A session-scoped register of scheduled items
(the register pattern of the session's problem register). An item
records: what is **owed**, stated in the registering unit's terms;
its **trigger** — a time, or a time and a condition, never a bare
condition (a bare condition is an Expectation's satisfaction or
nothing); its **registrar** — only the registering unit may cancel
or amend its own items; its **registration stamp**, an instant on
a named standing (a frame fact or a clock reading, §2.2's
discipline); the **registration's own shelf life** — past it an
un-fired item lapses instead of standing forever, and "no expiry"
is a stated value with a reason, never an omitted field; the
**on-due demand**, stated at registration so the firing is
auditable against it; and **placement fields** (calendar,
timeline) that stand in the record from this slice and become
live with the Calendar/Timeline slices (§8.10).

**Registration is not authorisation.** An item's presence records
that a unit committed to ask; it does not pre-approve the act.
Pricing happens when the item falls due, by the Planner, on the
situation then standing.

**The opening sweep.** At each turn's opening, before the new
input is planned, the register is swept under the turn's best
time standing: due items raise their demands, lapsed
registrations close as lapsed, and the outcomes ride the turn's
trace as annotations — visible to the Planner, never merged into
the visitor's input. A registration made during a turn stands
from the next turn's sweep forward. Scheduling **never acts**:
it does not execute the owed action, does not author a reply,
does not originate a claim. A due item the Planner declines
closes with that decline as its closing evidence; every end is
a recorded end — fired-and-done, fired-and-declined, or lapsed —
none a silence.

**The one wired consumer** is scheduled re-consultation (§3.3,
§5.2): a banked weather reading registers its own refresh, and
at the sweep where it falls due the weather wrapper prices and
executes it — the firing, the pricing and the re-bank all in the
trace. A re-check whose source is unavailable is a stated state
recorded on the item; the wait continues, and no stale reading
is served in its place.

## The waking limit, standing as designed

The entity is turn-based; nothing inside it runs between turns.
An item whose time passes mid-silence is fired at the next
turn's opening sweep, and its record says when it fell due and
when it was taken up. Finer waking needs a **host driver** — a
process outside the entity holding the wall-clock watch. This
slice builds no driver; it builds the contract's entity side:
the pure queries `whatIsDue` / `whatIsOpen`, and clock readings
entering only as Timekeeping consultations. A driver may never
execute a scheduled action, admit testimony, author a reply, or
cancel or amend a registration (§3.4).

## What is deliberately not here

- **No conversational authoring.** A visitor asking to be
  reminded is a shapes-and-posture question (§7 of the design
  note), not built; registrations today are made by units.
- **No persistence.** The register is session-scoped (§7.2's
  conservative default, flagged for ratification).
- **No recurrence firing.** Placement for a recurrence is
  designed (§8.10) and its fields stand in the record; whether
  periodic firing enters a build is the Calendar/Timeline
  slices' question.

Code: `src/ansci/scheduling.ts` (`registerSchedule`,
`sweepSchedule`, `declineDueItem`, `whatIsDue`, `whatIsOpen`);
the opening sweep wired in `src/ansci/turn.ts`; the weather
re-consultation consumer in `src/ansci/weather-turn.ts`.
Registered holdings: `schedule-registration`, `schedule-sweep`
(`src/ansci/capability-registry.ts`).
