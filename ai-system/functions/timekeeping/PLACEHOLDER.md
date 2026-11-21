# Timekeeping

- **Schematic address:** `functions/timekeeping` — inside the Functions Unit
- **Type:** Unit
- **State:** partial — **40% completed to goal** (set by us, assessed by the project, not measured or computed). Seat placed and first slice built 2026-11-20 (Time programme T1; design: `docs/ansci/time-scheduling-design-note.md` §2).

## What stands here

The Functions Unit's time resource: the machinery both Scheduling
and Expectation read, defined over readings, not over what the
readings mean.

**The clock-consultation operation.** A clock is a *source*, read on
demand — one source wired, the host's clock. A reading is a
**retrieved fact**: the instant read, the timezone it stands in
(named as part of the reading — a host clock's zone is the host's,
and is said so), and a source record under the retrieved provenance
discipline (the §§3.5–3.6 shape the Wikidata bank established). A
clock reading is the limiting case of a banked reading: its content
and its fetch stamp coincide, so its shelf life is stated
differently — **a reading warrants the turn it was taken in**; a
later turn re-consults rather than inheriting a "now".

**The staleness operation.** Fresh / stale / absent, asked
uniformly over the banks under the shelf life each bank states for
its kind — the weather bank's TTL, the geography register's
per-kind table — plus the horizon form (what goes stale by a
stated moment) that Scheduling's re-consultation is built from.
Where a bank states no shelf life, the answer is **"no shelf life
stated"**, never "fresh": the Wikidata bank states none (a capital
does not expire), and none is invented for it.

**Two standings, unreconciled.** The frame is the conversation's
*stated* time; a clock reading is a consulted fact about the host's
world. The time/date shapes answer from the frame where a frame
reading stands; where none does and a clock is wired, they consult
and cite the reading. Where both stand and disagree, the
disagreement is statable (`compareStandings`), never silently
absorbed.

## What is deliberately not here

- **No arithmetic.** Durations and date differences are
  Quantification's Mathematics (and, on a grid, Calendar's — §8 of
  the design note). **No ordering.** Before/after over readings is
  Ordering And Sorting's. **No testimony.** What a time *means* —
  season, daypart, situated significance — stays with the frame's
  tables and Awareness.
- **No other clock wired.** A network time service, or the
  interlocutor's stated clock as a source, would be another source
  under the same operation, not new machinery.

Code: `src/ansci/timekeeping.ts` (`consultClock`, `askStaleness`,
`staleByHorizon`); the shapes' clock route in `src/ansci/turn.ts`.
Registered holdings: `clock-consultation`, `staleness-query`
(`src/ansci/capability-registry.ts`).
