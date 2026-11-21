# Time programme — C1 report: Calendar held; the arithmetical conversions

Date: 2026-11-20. Branch: `track/time-build`, on T3's commit
1a87aa1 (base `origin/main` 836a5d0). Specification:
`docs/ansci/time-scheduling-design-note.md` §8.3–§8.5,
§8.11, and §8.12 slice C1. House pattern throughout.
Nothing was pushed; the commit is local.

## What was built

**`src/ansci/calendar.ts`** — the Calendar family
(`functions/calendar`, seat state `partial`, holdings
`calendar-conversion` and `calendar-grid-arithmetic`):

- **The systems register (§8.3).** `CalendarRegister`
  holds date systems as knowledge: each record states its
  name, its provenance (the describing source, named, and
  the intake that banked it), its epoch and year count,
  its month structure, and its intercalation rule. C1
  holds three **arithmetical** systems: the **Gregorian**
  (the grid the frame's ISO input already assumes), the
  **ISO week calendar**, and the **Julian** (§8.3's
  standing example of a third holding — for historical
  European dates).
- **The port (§8.5).** The conversion machinery is a
  port of Dershowitz & Reingold, *Calendrical
  Calculations*, 4th edition (2018), Part I's
  arithmetical chapters — the algorithms as the book
  states them, taken from the authors' own public Lisp
  distribution (github.com/EdReingold/calendar-code2,
  Apache License 2.0): the fixed-date (R.D.) substrate,
  the Gregorian, Julian and ISO conversions in both
  directions, leap rules, the ISO long-year rule. The
  Julian epoch is taken as the book defines it — from
  the Gregorian (R.D. −1) — not as an independent
  constant. Calendrics was not re-derived.
- **Conversion as computation (§8.5).** `convertDate`
  returns the converted date with a derivation record
  under the **derived provenance kind**: the date as
  stated and its system, the system converted to, the
  machinery, and the fixed date passed through. A
  converted date is never testimony, and the derivation
  says so in its own text.
- **Grid arithmetic (§8.4).** `addMonths` (with its
  stated rule: a lacking day lands on the target month's
  last day), `weekdayOf`, `daysInMonth`. The ISO system's
  lack of months is itself a stated answer (`no-months`),
  not an error. Duration arithmetic was not touched: it
  stays Quantification's, and the acceptance pair below
  is composed from the fixed count directly.
- **The unheld-system decline (§8.11).** Every operation
  naming a system returns the decline as data, located at
  the holding, in the catalogue's words; nothing is
  approximated from a system's name. A held system with
  no conversion machinery in the slice declines one step
  in, located at the missing machinery (the shape C2's
  registration will first take if its port is partial —
  see the C2 report).

## Acceptance (§8.12, C1) — what the tests show

`test/ansci-time-c1.test.ts`, 7 tests, all passing:

- **The port against its source.** 21 fixed dates from
  R.D. −214193 to 1000000 decompose in all three systems
  and recompose exactly, weekdays included; 18 further
  date-to-fixed vectors cover the leap and century edges
  (1900 not a Gregorian leap year, 2000 one; year 4, year
  400), the Julian epoch, and the 1582 cutover pair —
  Julian 1582-10-04 and Gregorian 1582-10-15 on
  consecutive fixed days, as history has them. A
  round-trip sweep (every 97th day over a million-day
  span, all three systems) holds identically.
- **Conversion with the derivation cited**: Gregorian
  2026-11-20 → Julian 2026-11-07, derivation kind
  `derived`, fixed 739940, three inputs cited.
- **The §8.4 pair, side by side**: from 31 January 2026,
  "one month from now" gives 28 February (the operation's
  stated rule) and "+ 30 days" gives 2 March — different,
  both correct, asserted unequal.
- **The unheld-system decline** for a system the register
  does not hold ("mayan"), in §8.11's words.

## How the vectors were obtained — stated plainly

The note directs the port's acceptance to run on the
book's own sample data (its Appendix C). The printed
table was **not** in the authors' public distribution
(the distribution carries the Lisp implementation and a
historical-dates file, not the appendix's table). What
was done instead: the authors' reference implementation
itself was executed (under SBCL, installed for the
purpose) and its outputs on a spread of fixed dates and
edge-case dates were taken as the vectors. That is the
book's machinery testifying about itself — stronger than
a transcribed table in one way (no transcription error),
weaker in another (it cannot catch a misunderstanding
shared by the reading of the code and the port — though
the port *is* a direct transliteration of that code, so
the residual risk is in the transliteration, which the
round-trip sweep and the independent anchors bound).
Independent anchors cross-checked: R.D. 719163 =
Thursday 1 January 1970; R.D. 1 a Monday; the 1582
cutover pair consecutive; R.D. −1721425 = Gregorian
−4713-11-24 (the Julian day number's epoch date). Nobody
independent has checked the port against the printed
Appendix C table itself; if the owner wants that check,
the table's Gregorian/Julian/ISO columns can be
transcribed from the book and run against the same test
file.

## Gates (fresh, complete runs on this slice's tree)

| Gate | Figure |
|---|---|
| Suite | 1439 tests / 1436 pass / 0 fail / 3 skipped (T3’s 1432, +7 C1) |
| Demo | 29/29 |
| Holdout | 80/80, 0 regressions |
| Sense evals | A 11/11 · B 6/6 |
| ai:check | OK — 104 nodes (84 directories); root page carries all 101 percented nodes |
| C1 tests | 7/7 (in the suite figure) |

## Defaults taken — flagged for ratification

1. **The Julian is held in C1**, beyond the slice text's
   named pair (Gregorian and ISO): it is Part I
   arithmetical, §8.3 names it the standing example of a
   third holding, and a conversion pair of Gregorian↔ISO
   alone would exercise the port thinly (ISO rides the
   Gregorian year). Flagged as a scope widening taken
   deliberately, reversible by removing one register
   entry.
2. **Month addition's lacking-day rule** is the
   operation's own stated rule (land on the last day).
   §8.10's placements state their rule on the item in
   C3; the two are deliberately independent — an item's
   placement may rule differently from this operation's
   default, and the item's rule governs the item.
3. **Map percent 40** for `functions/calendar`.

## What remains open after C1

- The **Chinese lunisolar** is C2's: an astronomical
  system, unheld today, so conversions naming it decline
  at the holding until C2's intake banks it.
- **No conversational surface** asks Calendar anything
  yet ("what weekday is…?", "one month from now" as
  shapes) — the note's C1 acceptance is at the machinery
  level, and the frame's consumers are unchanged (§8.6).
- **No default grid** is chosen for a conversation
  (§7 question 6, the owner's).
