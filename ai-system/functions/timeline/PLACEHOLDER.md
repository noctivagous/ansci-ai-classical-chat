# Timeline

- **Schematic address:** `functions/timeline` — inside the Functions Unit
- **Type:** Unit
- **State:** partial — **40% completed to goal** (set by us, assessed by the project, not measured or computed). Seat placed and built 2026-11-20 (Time programme C3; design: `docs/ansci/time-scheduling-design-note.md` §8.7–§8.11).

## What stands here

The Functions Unit's **line resource** — the line to
Calendar's grid (§8.2's split). A Timeline is a held
object: an ordered set of **entries**, each with a name,
an **extent** (a point, or an interval with a start and
an end), and the extent's **standing**, stated the way
§2.2 requires of any stamp. A Timeline has an **owner**,
and the owner kind fixes where the object lives and how
its entries enter (§8.7):

- **The conversation's own timeline** — the session's
  turns and their events (problems opened, expectations
  registered, schedule items registered and taken up),
  built from the material that already stands in the
  session's records, on the turn-order axis. Its owner is
  the session; nothing is invented for it.
- **A plan's timeline** — Scheduling's register *viewed
  as a line*: the entries are the commitments themselves,
  their extents the interval from registration to the due
  instant. Nothing new is held.
- **A knowledge timeline** — a dynasty's, a reign's, a
  text's transmission. Its entries are knowledge and
  enter through the testimony gates, banked with
  provenance in their standings. The present record,
  stated honestly: **no chronology is banked today** — no
  production path populates one, and the intake that
  would is §7's question 8, the owner's.

**Allen's algebra, ported (§8.8).** Relations between
entries are James F. Allen's thirteen basic relations
(CACM 26(11), 1983) — precedes, meets, overlaps, starts,
during, finishes, equals and the six converses — computed
from their endpoint definitions, with the converse
structure and the **composition table** as data. The
table is materialised by enumerating endpoint orderings
of three intervals and reading off the resulting
relations — the table the enumeration produces, checked
against the paper's own worked example (A during B, B
precedes C ⇒ A precedes C) and the algebra's converse
symmetry, rather than transcribed from a printed
rendering where a copying error would be silent. Borders
kept: no fourteenth relation (an uncertain placement
states a *set* of basics, itself a relation in the
algebra); no metric reasoning inside the algebra; a
computed relation is a **derivation**, inheriting the
weaker of the two extents' standings — never testimony.

**Durations are read off the line (§8.9).** The
difference of two extents' starts on the line's axis —
on a date axis, Calendar's grid arithmetic over
Timeline's endpoints, through a conversion where the
endpoints stand in different systems (and the derivation
says so). One endpoint standing alone is a date, not a
duration: declined, not estimated.

**The declines (§8.11)** stand at their locations: an
entry whose extent cannot be stated in a held system or
a standing reading stands **unplaced**, named as such,
and relations and durations over it decline at the
placement; a relation between extents in different
systems with no conversion held declines rather than
silently sharing a grid; a duration without both
endpoints declines at the missing one.

**Placement went live alongside (in Scheduling, §8.10).**
§3.1's two fields are computed now: the calendar
placement (a pattern as Form's Repetition record states
it — period and phase, the short-month rule stated at
the placement — with the dates read from Calendar's
grid: monthly-on-the-31st and every-30-days produce
their two different sequences, and the placement, not
the trigger's wording, is the record of which was
meant) and the timeline placement (stated Allen
relations to named items, re-computed at the sweep; a
relation that stops holding is an event on the item's
record, not a silent edit). An Expectation's deadline is
placed the same way, and §4.6's timeout is evaluated
against the placement. Placement authorises nothing;
the trigger still governs firing, and recurring *firing*
as a product feature stays §3.3-out-of-scope — what C3
builds is the placement, as the note directs.

Code: `src/ansci/timeline.ts` (`conversationTimeline`,
`planTimeline`, `knowledgeTimeline`, `relateEntries`,
`durationBetweenEntries`, `relationBetween`,
`composeRelations`, `ALLEN_COMPOSITION_TABLE`) and the
placement machinery in `src/ansci/scheduling.ts`
(`placementDates`, `buildCalendarPlacement`,
`evaluateTimelinePlacements`). Registered holdings:
`timeline-relations`, `timeline-duration-read-off`
(`src/ansci/capability-registry.ts`); the placement
holding (`schedule-placement`) is Scheduling's.
