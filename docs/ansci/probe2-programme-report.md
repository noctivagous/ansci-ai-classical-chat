# Probe-2 Fix Programme — Final Report

**Date:** 2026-11-20 · **Branch:** `track/probe2-fixes` (LOCAL ONLY — nothing pushed, nothing merged)
**Base:** origin/main `a093f57c5a43506de335ea7df2aa68cd5ba1452c`
**Commission:** the probe-#2 diagnostic's proposed programme, items 1–6 (owner "rec", 2026-11-20).
**Specification:** `~/workspace/ansci-diagnostic-probe2-2026-11-20/REPORT.md` (attributions SD1–SD4, IM1–IM3, K1–K2).

## The six items, as committed

| # | Item | Commit | Slice report |
| --- | --- | --- | --- |
| 1 | Structural question detection (SD1) | `64fe94b` | probe2-slice-1-report.md |
| 2 | Question-word-in-answer-slot guard (SD3) | `335d90c` | probe2-slice-2-report.md |
| 3 | Tokeniser symbol set + structural typo tie-break (IM1, IM2) | `6a68fed` | probe2-slice-3-report.md |
| 4 | Unanchored-definite scope correction (SD2, IM3) | `2a88100` | probe2-slice-4-report.md |
| 5 | Time/date shapes from the frame (SD4, first half) | `18a282c` | probe2-slice-5-report.md |
| 6 | Weather on the Wikidata pattern (SD4 second half, K1) | `615fec3` | probe2-slice-6-report.md |

## Gates — baseline and final head, fresh complete runs

Baseline reproduced on unmodified `a093f57` before item 1:
suite 1258 tests / 1255 pass / 0 fail / 3 skipped · demo 29/29 ·
holdout 80/80, 0 regressions · sense A 11/11 · B 6/6 · ai:check OK.

| Gate | After item 6 (branch head) |
| --- | --- |
| Full suite | 1318 tests / 1315 pass / 0 fail / 3 skipped |
| Demo (`ansci:demo`) | 29/29 expectations met |
| Holdout (`ansci:holdout`) | 80/80 parsed, 0 parse / 0 round-trip regressions |
| Sense challenge | Set A 11/11 · Set B 6/6 |
| `ai:check` | OK (system-map 100 nodes; root page OK) |

Every item was gated the same way at its own commit; the per-item
figures are in the slice reports. The suite grew by exactly the
programme's own tests (60 across the six slice test files, net of
pin supersessions recorded in the tests themselves).

## Final acceptance — the full probe-#2 set re-run on the branch head

Protocol identical to the diagnostic's: fresh store-less sessions,
inputs verbatim, the runners' own harness with imports pointed at
this branch's build. 39 probes + 13 supplementary (S1 counted
per-turn: 58 turn-level comparisons).

- **Changed: 26. Unchanged: 32.** Every changed probe is one the
  programme targeted; every unchanged probe is a control, a
  legitimate-scope case, or S6b (below).
- **Family Q: all six pairs byte-identical with and without "?"** —
  the Slice 1 acceptance, at programme level.
- **Parser stops (rephrase requests) in the after set: none.**
- **Family T**: T7 "hwo are you?" now answers "I am fine." (was a
  decline on 'hwo'); T8 "how are you>" answers (was "Ok. Noted.");
  T1–T6, T9–T12 unchanged controls.
- **Family W**: all seven on their specified weather paths (W1/W2/
  W3/W5/W7 place-gap; W4/W6 lookup-needed for Oklahoma — the
  wrapper's fetch path, verified in Slice 6 against the recorded
  live fixtures).
- **Family V**: V2 → weather path; V5/V6 → frame declines naming
  the missing clock reading (with a supplied frame they answer
  from it — Slice 5's harness tests); V8 → knowledge decline;
  V1/V3 unchanged knowledge declines; **V4/V7 unchanged by
  design** — the unanchored-definite branch's legitimate scope,
  kept and pinned.
- **Supplementary**: S1's replayed transcript now takes a sane path
  on all seven turns (turns 6–7 changed: both weather asks name
  the place gap); S2/S3 answer stated weather from the record;
  S5a/S5c (no-"?") take the weather path; S5b takes the question
  path and declines at its shape instead of "Ok. Noted."; S6a
  declines at the knowledge like V8; S7a takes the place-gap path
  (its stated fact was about 'it', not the weather).
- **S6b is unchanged, plainly**: "what is a capital?" still
  receives the Marx *Capital* gloss. That is the diagnosis's K2 —
  recorded in probe #2 but **not among the six commissioned
  items**. Slice 4 stopped the gloss route only for
  of-phrase-anchored subjects, where it answered a question
  nobody asked; the bare "what is a capital?" case is the
  entity answer's designed shape and awaits the owner's word.

## Draft wordings — OWNER'S TO SETTLE (complete list)

This programme ships several visitor-facing texts, all
hand-composed, all flagged in code and in the slice reports:

1. Slice 2's guard decline: "I can't answer that from what I
   know: the value that question asks for is not something I have."
2. Slice 5's frame answers and declines: "It is about 2 PM." /
   "The date is November 20." / the no-clock and no-calendar
   decline forms.
3. Slice 6's weather texts: the place-gap reply ("I don't know
   where you are, so I can't say … there."), the lookup-needed
   decline, the record answer ("You said the weather is …"),
   the wrapper's lookup-unavailable and place-unresolved
   declines, and the reading composition ("In <resolved place>
   it is <t>°C and <condition>. (From Open-Meteo.)").

## What remains open

- **Live weather, one gap**: Open-Meteo's forecast endpoint
  began returning HTTP 429 for this VM's egress IP during
  Slice 6 (geocoding verified live; the forecast answered at
  fixture-recording time). The full live fetch→bank→answer
  run is verified on the recorded live fixtures and the 429
  decline path is verified live; a live re-run when the limit
  clears needs no code change.
- **Slice 2's guard** has no live turn-level trigger on this
  main (the interceptions shadow it, as diagnosed); it is
  verified at the planner→generator seam it guards.
- **"what time is it?"** loses its noun in the parse and keeps
  its previous route (recorded limit, Slice 5).
- **K2 / S6b** (above) — the owner's call, not this programme's.
- Nothing in this branch has been pushed or merged; the six
  commits and this report are local to
  `~/workspace/ansci-track-probe2`.
