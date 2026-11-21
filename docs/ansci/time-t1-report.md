# Time programme — T1 report: Timekeeping

Date: 2026-11-20. Branch: `track/time-build`, cut from
`origin/main` at **836a5d0** (the geography landing). Specification:
`docs/ansci/time-scheduling-design-note.md` §2 (Timekeeping) and §6
(slice T1), as amended. This report follows the house pattern: what
was built, what the acceptance showed, what was verified by
construction versus by test, the defaults taken (flagged for the
owner's ratification), and what remains open. Nothing was pushed;
the commit is local.

## Baseline (reproduced on 836a5d0 before any change)

| Gate | Figure |
|---|---|
| Suite | 1390 tests · 1387 pass · 0 fail · 3 skip |
| Demo | 29/29 expectations met |
| Holdout | 80/80 parsed · 0 regressions |
| Sense evals | A 11/11 · B 6/6 |
| ai:check | OK — 100 nodes |

The commissioned baseline figures reproduced exactly.

## What was built

**`src/ansci/timekeeping.ts`** — the Timekeeping family
(`functions/timekeeping`, seat state `partial`, on the map and in
the capability registry as the holdings `clock-consultation` and
`staleness-query`):

- **Clock consultation (§2.1).** A `ClockSource` interface — a
  clock is a consultation surface: asked, it answers or is
  unavailable, and an unavailable clock is a stated state, never
  an error and never a silent substitution. Two implementations:
  `HostClockSource` (the host's local clock — read locally, not a
  network call) and `FixtureClockSource` (settable instant and
  availability, for tests). `consultClock` banks the reading in a
  `ClockBank` with full provenance — kind `retrieved`, the clock
  named as the dataset with the retrieval date as its version,
  the source's name as the URI, and the session's `retrievedFrom`
  (standing discipline: a clock reading never claims to be stated
  by the interlocutor). A reading **warrants only the turn it was
  taken in** (`readingWarrantsTurn`).
- **Frame standing (§2.2).** `frameStanding` reports what the
  frame alone warrants: the stated date and time, with the season
  and daypart conventions named — and the date carries a **year
  only when the frame's own ISO supplied one**. No year is
  borrowed from anywhere: a frame that supplies no year leaves the
  year unstated, and the standing says so. (One frame-record
  amendment: `buildFrame` now retains the ISO year in
  `FrameRecord.supplied.year`; before T1 the year the caller
  supplied was dropped at the frame boundary, so the standing
  could not have been honest about it.)
- **`turnTimeStanding`** composes the two standings the way §2.2
  orders them — a wired clock first (its failure stated alongside
  when it is unavailable), the frame standing otherwise — and
  `compareStandings` states agreement or disagreement between a
  frame standing and a clock reading **without reconciling them**:
  disagreement is information, and which standing governs is the
  Planner's to price, never Timekeeping's to settle silently.
- **Staleness as one operation (§2.3).** `askStaleness` is the
  single entry over every banked holding with a shelf life: the
  weather bank (30-minute default), the place register's four
  kinds (coordinates 12 months, containment 6 months, what's-there
  30 days, route 7 days), and the Wikidata bank — which carries
  **no shelf life**, and so answers `no-shelf-life-stated`, never
  "fresh" (§2.3's named trap, held). Three honest answers only:
  fresh (with the remaining life), stale (with the overdue
  amount), or absent. `staleByHorizon` lists what is stale at an
  instant across the weather and place banks.
- **The wired consumer.** Time/date questions now consult the
  clock when the session has one wired and the frame cannot
  answer: a frame-less session with a wired clock answers "what
  time is it?" and "what is the date?" from the reading (trace
  route `clock`, the reading cited); an hour-only frame answers
  its time from the frame and its date from the clock. The frame
  route is unchanged and takes precedence whenever it can answer
  — a clock never overrides what the conversation itself stated.
  When the wired clock is unavailable, the existing decline
  stands **byte-identical** and the failed attempt is recorded on
  the trace (`clockAttempt`), so the decline's record shows the
  clock was tried.

**Registry and map.** Two holdings registered
(`clock-consultation`, `staleness-query`, held by
`functions/timekeeping`). One registry test invariant was
superseded with the reason recorded in the test: the blanket rule
"no entry held by a `functions/*` seat" stood while every
Functions family was a placeholder; T1 built the first one, so
the rule now enumerates the built families as data — its substance
(a placeholder seat is never a holding) is unchanged. The map
gained the `functions/timekeeping` node (percent **40** — a
set-by-us figure, flagged below), the Functions parent summary now
names Timekeeping as built, and the root page was synced by hand.

## Acceptance (§6, T1) — what the tests show

`test/ansci-time-t1.test.ts`, 16 tests, all passing:

- A frame-less session answers time and date from the host clock
  **with the reading cited on the trace**; the date answer carries
  the reading's year (the frame route's never does — that
  asymmetry is the §2.2 discipline made visible).
- The clock consulted at turn *N* does not warrant turn *N+1*.
- An unavailable clock banks nothing and states its unavailability;
  the turn's decline is the pre-T1 decline, byte for byte, with
  the attempt on the record.
- No clock wired: the pre-T1 behaviour exactly (the decline).
- Frame precedence: a stated frame time answers from the frame
  even with a clock wired.
- Staleness: fresh/stale/absent over weather and geography with
  the amounts; the Wikidata bank answers `no-shelf-life-stated`
  for a standing node; `staleByHorizon` orders by overdue amount.

## Gates (fresh, complete runs on this slice's tree)

| Gate | Figure |
|---|---|
| Suite | 1406 tests · 1403 pass · 0 fail · 3 skip (baseline 1390/1387/0/3; +16 = the T1 tests) |
| Demo | 29/29 expectations met |
| Holdout | 80/80 parsed · 0 parse regressions · 0 round-trip regressions |
| Sense evals | A 11/11 · B 6/6 |
| ai:check | OK — 101 nodes (81 directories); root page carries all 98 percented nodes |
| T1 tests | 16/16 (in the suite figure) |

## Verified by construction vs by test

- **By test:** every acceptance item above; the frame route's
  byte-stability (the probe-2 slice-5 suite passes unchanged);
  the registry invariants as amended.
- **By construction:** the provenance shape of a reading (it is
  the `Provenance` type the rest of the system already uses —
  no new provenance kind was invented); the year discipline (the
  standing reads only what `buildFrame` retained); staleness reads
  each bank's own retrieval stamps and shelf lives — no second
  copy of any TTL exists in `timekeeping.ts` beyond the place
  register's published per-kind constants, which it imports.

## Defaults taken — flagged for ratification

1. **Clock-route reply wordings are drafts** (owner's to settle,
   as every wording in this programme): time — "It is 3:04 PM.";
   date — "The date is November 20, 2026." Both follow the frame
   route's shapes; the date form differs from the frame route's
   ("Today's date is November 20.") only in carrying the year and
   naming itself a date from a reading rather than from the
   conversation's frame.
2. **Map percent 40** for `functions/timekeeping` — set by us,
   the usual convention for a built-but-partial family.
3. The session's clock is **wired by the host** (`newSession`
   options `clockSource` / `clockRetrievedFrom`); no session
   grows a clock on its own. This is the conservative reading of
   §2.1: a clock is a source the deployment provides, like the
   weather service's base URL.

## What remains open after T1

- §2.4's second wired consumer — **the weather re-check** — is
  T2's (it needs Scheduling to exist). The staleness operation it
  will consult is built and tested here.
- No conversational surface names the clock or staleness yet
  ("how old is that weather reading?" has no reader); the note
  does not ask T1 for one. The holdings are registered, so a
  capability lack over them now audits as *held*.
- The host clock's timezone is the host's own; a deployment that
  wants the situated place's timezone composes Timekeeping with
  GeographyAwareness — named in the note (§2.1) as composition,
  not built here.
