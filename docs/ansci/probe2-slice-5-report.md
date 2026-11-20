# Probe-2 Slice 5 — Time/date shapes from the frame (SD4, first half)

**Date:** 2026-11-20 · **Branch:** `track/probe2-fixes` · **Base:** `a093f57` + Slices 1–4
**Commission:** probe-2 diagnostic programme, item 5 (owner "rec", 2026-11-20).
**Attribution:** SD4 (system design) — the Situation frame (§8.1) already
held the time facts (supplied month/day/hour, season, daypart) and no
reply site read them; the questions died at the unanchored-definite
branch (Slice 4 stood it down for time words) and the knowledge routes.

## What was built (src/ansci/turn.ts)

A frame shape at the predication dispatch — the first interrogative
route a what-question reaches:

- `timeDateAskOf(parsed)` reads the ask off the parse: the predicate is
  the question word and a `time` node stands among the question's nodes
  ("what is the time [now]?") → a time ask; a `date`/`day` node → a
  date ask. A time/date noun carrying its own of-phrase ("the time of
  the meeting") is excluded — its answer is not the frame's reading,
  and the ordinary routes keep it.
- `answerTimeDateQuestion(session, trace, asked)` answers FROM the
  frame (`trace.timeAnswer` records the ask, the ground, and the
  frame's supplied readings):
  - **Time, frame standing:** the supplied hour, in 12-hour form —
    "It is about 2 PM." for hour 14. "About" because the frame holds
    no minutes; the answer states the hour and no more.
  - **Date, frame standing with month/day:** "The date is November
    20." — month and day; the frame holds no year, so none is given.
  - **No frame (the probes' case):** a decline located at the missing
    clock reading — "I can't answer that from what I know: this
    conversation has no clock reading — I wasn't given the time when
    we started." — never an invented time, never "The time is what."
  - **Frame without a calendar** (hour only): time answers; date
    declines located at the missing calendar reading.

## Draft wordings — OWNER'S TO SETTLE

All three reply texts above are hand-composed for this slice and are
flagged as draft in the code: the two decline forms and the two answer
forms. They follow the located-decline convention (the decline reasons
name the missing reading and avoid the substrings that would route the
map walk to the correspondence graph).

## Recorded limit

"what time is it?" / "what day is it?" lose their noun in the parse —
the wh-determiner construction files no time/date node — so this shape
cannot see them and they keep their previous routes. The probes used
the "what is the time/date" forms, which are covered; the limit is the
parse's, recorded here rather than worked around with a surface scan.

## Pin bookkeeping

Two Slice 2 Family V pins (time-now, date) and two Slice 4 assertions
(the date stand-down; V5's) recorded replies this slice was
commissioned to replace; they were updated to the frame shape's
behaviour with the supersessions recorded in the tests.

## Gates (fresh complete runs, this branch)

| Gate | Result |
| --- | --- |
| Full suite | 1298 tests / 1295 pass / 0 fail / 3 skipped |
| Demo (`ansci:demo`) | 29/29 expectations met |
| Holdout (`ansci:holdout`) | 80/80 parsed, 0 parse / 0 round-trip regressions |
| Sense challenge | Set A 11/11 · Set B 6/6 |
| `ai:check` | OK (system-map 100 nodes; root page OK) |

## Files

- `src/ansci/turn.ts` — `timeDateAskOf`, `answerTimeDateQuestion`,
  `MONTH_NAMES`, `trace.timeAnswer`, the dispatch claim.
- `test/ansci-probe2-slice5.test.ts` — 7 tests: framed V5/V6, the day
  variant, frame-less declines, hour-only frame, the of-phrase
  exclusion.
- `test/ansci-probe2-slice2.test.ts`, `test/ansci-probe2-slice4.test.ts`
  — pins updated under the recorded supersessions.
