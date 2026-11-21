# Time programme — C2 report: the lunisolar holding

Date: 2026-11-20. Branch: `track/time-build`, on C1's
commit ab55407 (base `origin/main` 836a5d0).
Specification: `docs/ansci/time-scheduling-design-note.md`
§8.3, §8.5, §8.6, and §8.12 slice C2. House pattern
throughout. Nothing was pushed; the commit is local.

## What was built

**`src/ansci/calendar-chinese.ts`** — the Chinese
lunisolar held as an **astronomical** system
(`functions/calendar`; holdings
`calendar-lunisolar-conversion` and
`calendar-solar-terms`):

- **The full Part II port.** The dependency chain of
  `chinese-from-fixed` / `fixed-from-chinese`,
  transliterated from the authors' Lisp distribution:
  the ephemeris correction's piecewise polynomials,
  solar longitude (the 49-term Bretagnon & Simon series),
  lunar longitude (the 59-term Meeus series), the n-th
  new moon (24-term + 13-term series), lunar phase,
  aberration and nutation, the bisection inverse
  (`invert-angular`) to the book's stated accuracy, and
  the Chinese layer itself — the Beijing location with
  its era-varying zone (local mean time at 116°25′ E
  before 1929, UTC+8 from 1929), new moons and solar
  terms in Beijing time, the winter-solstice sui, the
  leap-month determination, the sexagesimal names. The
  coefficient series were extracted from the Lisp source
  **programmatically** at build time, not transcribed by
  hand. Not ported, because the calendar does not call
  them: lunar latitude, phase-at-or-after, the equation
  of time, precession.
- **Registration.** The module registers the system
  record into the default register and its machinery
  into `calendar.ts`'s conversion dispatch at load; C1's
  `convertDate` / `fromFixed` / `toFixed` route through
  it. `calendar.ts` gained the `ChineseDate` type, a
  machinery registry for non-arithmetical systems, and a
  per-system **qualification hook** (§8.5's "decline or
  qualify").
- **The system record (§8.3)** states the structure as
  the design requires: kind `astronomical`; the epoch
  (R.D. −963099, as the port computes it); months of 29
  or 30 days from new moon to new moon, days beginning
  at midnight in the Chinese standard-time zone — **the
  meridian stated as part of the system**; the
  intercalation rule (a month with no major solar term,
  in a thirteen-moon sui); and the **24 solar terms as
  named points** (§8.6) — each term with its longitude,
  its kind (jieqi/zhongqi), and the index the term
  machinery returns, so `currentSolarTerms` answers
  "which solar term are we in?" from the holding.
- **The qualifications (§8.5), where they bite.** The
  record's provenance states the **modern post-1645
  system only**; a conversion passing through a fixed
  date before 1645 carries the qualification on its
  derivation (via the hook), stating that the conversion
  gives the modern rules applied backwards, not the
  calendar in force. `daysInMonth` declines for the
  lunisolar at its own signature: a (year, month)
  question does not identify a lunar month (cycle, leap
  standing required), and the length is read from the
  conversion machinery instead.

## Acceptance (§8.12, C2) — what the tests show

`test/ansci-time-c2.test.ts`, 9 tests, all passing:

- **New Year** for eleven Gregorian years (1900–2034)
  against the reference implementation, cross-checked on
  independently known dates through C1's verified
  Gregorian port (31 Jan 1900, 10 Feb 2024, 29 Jan 2025,
  17 Feb 2026).
- **Conversions** at nine fixed dates spanning R.D.
  −9600 to 800000, each with an **exact round-trip**;
  plus round-trip identity over every day of a common
  year (2026) and the 2033 leap year.
- **2033: the leap month is the eleventh.** The year's
  month walk finds thirteen months — 1–12 and a leap
  11th beginning R.D. 742529 (Gregorian 2033-12-22),
  converted both directions; no leap seventh month
  anywhere in the year.
- **The terms**: at 20 Nov 2026 the standing terms are
  霜降 (Shuangjiang) and 立冬 (Lidong); the next major
  term begins R.D. 739942 (22 Nov, Minor Snow) and the
  next minor R.D. 739957 (7 Dec, Heavy Snow) — the real
  dates.
- **The qualification**: a 1600 conversion carries the
  post-1645 qualification on its derivation; a 2026
  conversion carries none.
- The frame's consumers are unchanged (§8.6): no frame
  code was touched in this slice.

## The vector failure, told plainly

The first generation of this slice's Chinese test
vectors — produced earlier in the programme by running
the reference implementation — was **wrong**: its New
Year figures disagreed with the reference
implementation's own round-trips and with known dates
(it had Chinese New Year 2024 at R.D. 738934, eight days
late; the true figure is 738926). The cause was not
isolated — the generating script was not preserved —
but the inconsistency was demonstrable, so the set was
discarded and **regenerated in one run whose outputs
were checked for internal consistency in the same run**
(every conversion round-tripped exactly inside the
reference implementation itself), then cross-checked
against the independently known anchors above. The port
agrees with the regenerated set on every value. One
conclusion of the earlier set survives regeneration and
is now properly evidenced: 2033's leap month is the
eleventh. The earlier set's other Chinese figures
should not be cited. (The C1 vectors — Gregorian,
Julian, ISO — came from a separate, consistent
generation and are unaffected; C1's anchors were
independently verified at the time.)

A second, smaller correction: an early draft of this
port carried an `amod` that was not the book's; it
corrupted month and year arithmetic in
`chinese-from-fixed` while leaving the New Year path
(agreement with the reference on all eleven years)
untouched — which is why the failure showed in
conversions first. The definition now matches C1's,
itself verified against the book's.

## Gates (fresh, complete runs on this slice's tree)

| Gate | Figure |
|---|---|
| Suite | 1448 tests / 1445 pass / 0 fail / 3 skipped (C1’s 1439, +9 C2) |
| Demo | 29/29 |
| Holdout | 80/80, 0 regressions |
| Sense evals | A 11/11 · B 6/6 |
| ai:check | OK — 104 nodes (84 directories); root page carries all 101 percented nodes |
| C2 tests | 9/9 (in the suite figure) |

## Defaults taken — flagged for ratification

1. **Map percent stays 40** for `functions/calendar`
   (the lunisolar completes the family's designed
   holdings; the percent is ours to set and the owner
   may set it otherwise).
2. **The qualification is carried, not declined**, for
   pre-1645 conversions — §8.5 offers "decline or
   qualify"; the derivation-carrying qualification was
   chosen, and the choice is recorded here for the
   owner to reverse.
3. **`daysInMonth`'s decline reuses the `no-months`
   status** with its ground stated in the detail text;
   the owner may prefer a distinct status name.

## What remains open after C2

- **No conversational surface** asks Calendar for terms
  or Chinese dates yet; §8.6's routing stands at the
  machinery level (the operation exists and is
  registered), as C1's did for conversions.
- **Grid month addition on the lunisolar** is not an
  operation: stepping Chinese months runs through the
  conversion machinery (C3's placements do exactly
  that), and no slice has specified it as a standalone
  operation.
- The **era-named historical systems** (a Tang date in
  its own calendar) remain unheld, declining at the
  holding (§8.11) — by design, not by omission.
