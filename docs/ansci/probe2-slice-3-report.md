# Probe-2 Slice 3 — Tokeniser symbol set + structural typo tie-break (IM1, IM2)

**Date:** 2026-11-20 · **Branch:** `track/probe2-fixes` · **Base:** `a093f57` + Slices 1–2
**Commission:** probe-2 diagnostic programme, item 3 (owner "rec", 2026-11-20).
**Attribution:** IM1 + IM2 (implementation) — two places where the surface's
own evidence was mishandled: symbols other than [.?!] and the comma rode
into tokens as content, and the spelling matcher's frequency margin was
the only evidence allowed to separate same-distance candidates.

## IM1 — the tokeniser's strip set (src/ansci/parse.ts)

`enTokenize` now removes a run of surface symbols at either edge of every
raw token, before the contraction chain and every other rule reads it,
and drops a token made only of symbols. The set is explicit and closed
(`> < / \ | @ # $ % ^ & * _ ~ ` " " " ( ) [ ] { } : ; … • · « » — –`):
sentence marks, the comma, the apostrophe and the hyphen are NOT in it —
they are grammatical or word-internal and the existing rules own them —
and nothing inside a token is touched (an abbreviation's periods, a
time's colon, a hyphenated form all stand). "who are you>?" now tokenises
as who/are/you: no layer ever sees "you>", and the turn no longer depends
on the matcher luckily correcting the glued form (probe T2's survival on
the base was exactly that luck). "hello>" greets; a standalone ">" is
dropped rather than filed.

## IM2 — the structural tie-break (src/ansci/token-resolve.ts)

When the matcher's margin fails — or no recogniser-usable candidate
stands at all — the new exported `structuralTieBreak` may still resolve
the token, from two structural signals, each only narrowing a pool of
same-distance candidates:

1. **The slot.** Sentence-initial before an inverted auxiliary/copula,
   the surviving parse admits a question word and nothing else ("two"
   has no reading in "___ are you?"). The pool for this signal is drawn
   from ALL matcher candidates, for a measured reason: the recogniser
   consults the hand lexicon and the WordNet noun/adjective/adverb
   paths, and the wh-adverbs (how, what, where, when, which) stand in
   none of them — dedicated parse branches own those words — so the
   usable filter is blind to exactly the class this slot admits. (On
   the base, "hwo"'s usable pool was [who, two]; "how" never reached
   the margin test at all.) For this closed class the slot itself is
   the admissibility evidence.
2. **The onset.** A typo overwhelmingly preserves its first letter:
   "hwo" was written starting with h, which separates "how" from "who"
   after the slot left both standing.

A tie inside the admitted class, or anywhere the signals leave more
than one candidate, returns undefined — the token declines unresolved,
as before. The token itself is never a "correction" (a correctly
spelled wh-adverb stands at step 5, and correcting it to itself would
erode the sentence's later guesses for nothing). A structural pick
scores 0.70 — the segmentation step's declared value — eroded like
every guess, recorded with rule `matcher:symspell+structural-tiebreak`
and the full candidate pool it was picked from.

## Acceptance

- **Family T**: T2 "who are you>?" answers as T1, with no resolution
  record carrying ">" as content; T8 "how are you>" → "I am fine."
  (with Slice 1); T9 "hello>" → "Hello."; T3–T6, T10–T12 unchanged.
  T7 "hwo are you?" now resolves hwo→how by the structural tie-break
  and answers "I am fine.", as "how are you?" does.
- **Still declines, pinned**: "whre" mid-sentence ("i know whre he
  lives.") stands unresolved — were/where/wire tie on every signal
  available there; and at the pure-function level, "whmo" in the slot
  itself ties inside the admitted class (whom/who) and declines. The
  tie-break narrows; it does not guess.

## Gates (fresh complete runs, this branch)

| Gate | Result |
| --- | --- |
| Full suite | 1283 tests / 1280 pass / 0 fail / 3 skipped |
| Demo (`ansci:demo`) | 29/29 expectations met |
| Holdout (`ansci:holdout`) | 80/80 parsed, 0 parse / 0 round-trip regressions |
| Sense challenge | Set A 11/11 · Set B 6/6 |
| `ai:check` | OK (system-map 100 nodes; root page OK) |

## Files

- `src/ansci/parse.ts` — the edge-symbol strip in `enTokenize`.
- `src/ansci/token-resolve.ts` — `structuralTieBreak` + `onsetNarrow`,
  wired into the matcher step (runs when the margin fails or no usable
  candidate stands); pipeline header updated; the resolver loop is
  indexed so the slot context (position, next token) is available.
- `test/ansci-probe2-slice3.test.ts` — 10 tests: IM1 surface cases,
  T7 end-to-end, pure-function pins for both signals and both
  still-tie cases, the self-correction guard.
