# Probe-2 Slice 4 — Unanchored-definite scope correction (SD2, IM3)

**Date:** 2026-11-20 · **Branch:** `track/probe2-fixes` · **Base:** `a093f57` + Slices 1–3
**Commission:** probe-2 diagnostic programme, item 4 (owner "rec", 2026-11-20).
**Attribution:** SD2 (system design) — a branch built for scene referents
presupposed by a definite NP ("the table") in fact captured every definite
subject the graph and Classification did not hold, including questions
whose answers live in records, the frame, or grounded knowledge it never
consulted; IM3 (implementation) — subject selection handed it 'now' as
the lemma to ask after.

## What was built (src/ansci/turn.ts)

The branch's condition in `answerPredicateQuestion` gains two stand-downs,
each read off the question itself, each recorded in the trace
(`trace.unanchoredStandDown = {lemma, ground}`):

1. **Of-phrase anchor.** The subject NP carries a `modifier` edge whose
   target bears `prep: "of"` — "the capital of Oklahoma", "the
   population of Chicago". Such a phrase presupposes no scene referent;
   its referent is relational, fixed by the of-object, and the
   grounded-entity and knowledge routes below are its home. (This
   required passing the turn's `parsed` graph into
   `answerPredicateQuestion` — one call site.)
2. **Time words.** The subject lemma is in `UNANCHORED_TIME_SUBJECTS`
   (now, today, tonight, tomorrow, yesterday, time, date, day, morning,
   afternoon, evening, noon, midnight). A time word names a moment, not
   a thing: 'now' is anchored by the asking itself, and time/date are
   the situation frame's readings. These questions belong to the
   frame's shapes (Slice 5) and the knowledge routes — never to a
   branch that asks after a moment as if it were an unmentioned object.

The **entity answer** (Transcript Slice 0) stands down on the of-phrase
ground too: it answers what a named entity IS for a bare subject, and
predicating the head noun's gloss does not answer a relational
question — for "capital" the extract's gloss is Marx's book, so V8's
pre-slice landing after the branch stand-down alone would have been
that gloss, spoken as the answer to "capital of Oklahoma".

## Acceptance

- **V8** "what is the capital of oklahoma?" now declines at the
  knowledge: *"I can't answer that from what I know: I have capital in
  my notes as a book written by Karl Marx (1867) describing his
  economic theories, but nothing that connects it to 'what', and I
  have no way to connect anything to 'what'."* — it names what is held
  and locates the gap at the connection, which is the decline form the
  Wikidata wrapper's lookup trigger reads. The general class behaves
  the same ("what is the population of chicago?").
- **W2/V5**: "What now?" no longer occurs; both stand down on 'now'
  and decline at the knowledge at this slice. Their final forms are
  owned by Slice 6 (weather) and Slice 5 (time) respectively.
- **V6** "what is the date?" stands down on 'date' and declines at the
  knowledge at this slice; Slice 5 owns its frame shape.
- **Legitimate scope kept, pinned**: "what is the answer?", "who is
  the president?", "what is the table?" still clarify exactly as
  before; a classified kind used definitely ("is the salt cold?")
  still answers from the classification.
- **Ownership stated**: "what is the weather?" still clarifies at this
  slice — Slice 6 owns routing it to the weather shape, per the
  commission's own note.
- One Slice 2 test's Family V pins recorded four replies this slice
  was commissioned to change (the two 'now' forms, "the date", V8);
  the pins were updated to the Slice 4 replies with the supersession
  recorded in the test. The guard assertion in that test (Slice 2's
  own) is unchanged and still applies to all eight entries.

## Gates (fresh complete runs, this branch)

| Gate | Result |
| --- | --- |
| Full suite | 1290 tests / 1287 pass / 0 fail / 3 skipped |
| Demo (`ansci:demo`) | 29/29 expectations met |
| Holdout (`ansci:holdout`) | 80/80 parsed, 0 parse / 0 round-trip regressions |
| Sense challenge | Set A 11/11 · Set B 6/6 |
| `ai:check` | OK (system-map 100 nodes; root page OK) |

## Files

- `src/ansci/turn.ts` — `UNANCHORED_TIME_SUBJECTS`, the two
  stand-downs + `trace.unanchoredStandDown`, the entity answer's
  of-phrase stand-down, `parsed` passed into
  `answerPredicateQuestion`.
- `test/ansci-probe2-slice4.test.ts` — 7 tests (V8, the of-phrase
  class, IM3, time-word stand-down, legitimate scope, weather
  ownership, classification control).
- `test/ansci-probe2-slice2.test.ts` — four Family V pins updated
  under the recorded supersession above.
