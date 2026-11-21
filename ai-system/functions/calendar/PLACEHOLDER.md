# Calendar

- **Schematic address:** `functions/calendar` — inside the Functions Unit
- **Type:** Unit
- **State:** partial — **40% completed to goal** (set by us, assessed by the project, not measured or computed). Seat placed and first slice built 2026-11-20 (Time programme C1; design: `docs/ansci/time-scheduling-design-note.md` §8.3–§8.5).

## What stands here

The Functions Unit's **grid resource**: the dates a commitment
stands on. Calendar and Timeline are held structures with
operations over them (§8.2's split): a date system is a
*holding* — knowledge, kept under the provenance discipline —
while conversion, grid arithmetic and relation computation are
*operations*, generic machinery in the Functions pattern.

**The systems register.** A calendar system, as a holding
(§8.3), is a record: its name and **provenance** (the attested
statement of the system — where it is described, and by what
intake the description was banked); its **epoch and year
count**; its **month structure**; its **intercalation rule**;
and its **named points of the year**, where the system has
them.

**C1 holds three arithmetical systems** — specified completely
by arithmetic in Part I of the port's source:

- The **Gregorian** — the grid the frame's ISO input already
  assumes, the civil calendar of the host clock's readings.
- The **ISO week calendar** — years of 52 or 53 whole weeks.
- The **Julian** — held for historical European dates, the
  standing example of a third holding (§8.3).

**The port (§8.5).** The machinery is Dershowitz & Reingold,
*Calendrical Calculations*, 4th edition (Cambridge University
Press, 2018), ported from the authors' own public Lisp
distribution (Apache License 2.0) — the algorithms as the book
states them. Calendrics is not re-derived here (the owner's
solved-problem rule). Every date converts through the book's
fixed-date count (R.D.).

**Conversion is computation.** A converted date takes the
**derived provenance kind** the geography work established: it
cites its inputs — the date as stated and the system it stands
in, the system converted to, and the conversion machinery —
and through them the two system records' provenance. A
converted date is never testimony that a date *is* anything in
the second system; it is the grid's answer, auditable to the
systems held.

**Grid arithmetic is not duration arithmetic (§8.4).** "+ 30
days" is a duration question — Quantification's, grid-free,
the same on every calendar that has days. "One month from
now" is a grid question: a month is a unit of a *system*,
irregular by convention, and only the grid answers it. From 31
January the two give 28 February and 2 March — different, both
correct, side by side in the C1 tests. Month addition's stated
rule for a lacking day: the target month's last day. (A
placement's own February rule is stated on the item, §8.10 —
C3's field, not this operation's.)

**Unheld systems decline (§8.11).** A date, a conversion or a
placement naming a system the register does not hold declines
at the holding, in the catalogue's words; the machinery does
not approximate a system from its name.

**The Chinese lunisolar stands held (C2, 2026-11-20).** An
*astronomical* system (the book's Part II): conversions are
computed astronomy — new moons and solar terms at the
Chinese standard-time meridian — in `calendar-chinese.ts`,
which registers the system and its machinery with
`calendar.ts`'s dispatch at load. Its record states the
qualifications (§8.5): the astronomical basis, the location
(the meridian is part of the system — Beijing, UTC+8 since
1929, local mean time before), and the **modern post-1645
system only** — conversions before 1645 carry the
qualification on their derivation rather than passing as
the calendar in force. Its **24 solar terms** are held as
the system's named points (`SOLAR_TERMS`), each with its
longitude and the index the term machinery returns; a
term-level question ("which solar term are we in?") is
answered by `currentSolarTerms` over the holding (§8.6).
The year's sexagesimal name rides the record. Verified
against the reference implementation's own outputs,
regenerated with its round-trips checked (the C2 report
tells the first generation's failure plainly), and on the
2033 case: the leap month is the **eleventh**, landed by
the machinery, not asserted.

## What is deliberately not here yet

- **The frame's conventions do not move.** `SEASON_CONVENTION`
  stays a connective-layer convention over Gregorian months;
  it does not start citing Calendar. A consumer that needs a
  *term* asks Calendar; a consumer that needs a season
  *name* keeps the convention (§8.6).
- **No default grid is chosen** for a conversation (§7,
  question 6 — the owner's situated question, open).
- **Grid month addition for the lunisolar** is not an
  operation here: stepping Chinese months runs through the
  conversion machinery (a month is a new-moon interval, not
  a count), and no slice has specified it as an operation.

Code: `src/ansci/calendar.ts` (`CalendarRegister`,
`convertDate`, `addMonths`, `weekdayOf`, `daysInMonth`, the
fixed-date port) and `src/ansci/calendar-chinese.ts`
(`chineseFromFixed`, `fixedFromChinese`, `chineseNewYear`,
`currentSolarTerms`, the astronomy substrate). Registered
holdings: `calendar-conversion`, `calendar-grid-arithmetic`,
`calendar-lunisolar-conversion`, `calendar-solar-terms`
(`src/ansci/capability-registry.ts`).
