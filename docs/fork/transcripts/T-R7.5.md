# T-R7.5 — record-first answers at the question site (frozen expectations)

Slice R7.5 of the reply-planning programme. Closes the §11.4
finding recorded in T-R7-dashboard-check.md (Behaviour 4): a
question about a subject must read the session record's
standing state for that subject BEFORE deriving from the
classification table. Authored and frozen before the build,
2026-11-16. Verdicts go in T-R7.5-results.md.

## The rule being built

At the predication-question site (turn.ts's
answerPredicateQuestion — plain and why questions alike), for
the asked (subject, quality):

1. Find the subject's standing states from earlier turns.
2. Determine whether one occupies the asked quality's SLOT,
   by the R5 aspect determination: the slot is the asked
   quality's classification aspect (lookupClassification of
   the asked quality, the same lookup that classified the
   states), and a standing state occupies it when its own
   lemma's classification aspect is the same. Where the asked
   quality is unclassified, the slot test is lemma equality:
   the standing state is the asked quality or its negation.
3. If a standing state occupies the slot, the RECORD answers,
   with one distinction for why-questions:
   - a plain question is answered from the record whenever
     the slot is occupied, whether the standing state is the
     asked quality or another value in the slot;
   - a why-question is answered from the record only when
     the standing state CONTRADICTS the asked predication
     (a different value in the slot, or the asked quality
     under the opposite polarity) — deriving would predicate
     a quality the record says does not stand. When the
     standing state IS the asked predication, the why asks
     for the derivation itself, and the derivation answers
     as today (the causal form; Behaviour 2's pin).
4. The record answer predicates THE STANDING state — its
   lemma, its negated flag — built as a reply graph by the
   planner (planRecordPredication, in planPredication's
   construction style, planCorrection's no-pricing stance).
   The trace names the record as the source: the standing
   state and its turn, the supersession chain for that slot,
   and the slot determination. NO pricing is fabricated: a
   record answer is not a ladder derivation, so the trace
   carries answeredFromRecord and NO pricing record and NO
   derivation path.
5. The recording fix: when the record answers, the asked
   quality is NOT recorded as a new standing state (the
   question turn's own fresh recording of it is set aside,
   the skip named in the trace). When no standing state
   occupies the slot, recording proceeds exactly as today
   (T-R3's F3 untouched).

## Frozen expectations

### (a) The §11.4 sequence verbatim

Turns: "The soup is cold." / "The soup is hot." / "The soup
is cool." / "Is the soup cold?" (the corrections are the
restatements whose acknowledgements read "The soup is not
cold, but it is hot." and "The soup is not hot, but it is
cool.").

- Turn 4 is answered FROM THE RECORD: the reply predicates
  the standing state — "The soup is cool." (the exact surface
  is the machinery's; the expectation is the content: the
  standing state cool, NOT the table's cold derivation, and
  no modal borrowed from the table's price — never "may").
- The turn-4 trace names the record as the source:
  answeredFromRecord with the standing state (cool, turn 3)
  and the supersession chain for the slot (cold → hot at
  turn 2, hot → cool at turn 3).
- No pricing record and no derivation path on turn 4.
- No fresh cold state is recorded: at the end, the soup's
  standing states are exactly [cool].

### (b) Match control

Turns: "The soup is cold." / "Is the soup cold?".

- Answered from the record: "The soup is cold." — plain
  predication of the standing state.
- The trace shows the record answered (answeredFromRecord,
  state cold at turn 1); the table derivation is not what
  answers (no derivation path, no pricing).
- At the end the soup's standing states are exactly [cold]
  — the question's own fresh recording was set aside.

### (c) Different-aspect control

Turns: "The soup is sweet." / "Is the soup cold?".

- The standing state (sweet) is in a DIFFERENT slot from the
  asked quality: the aspect determination used is recorded —
  asked quality cold classifies under aspect "temperature";
  the standing state's lemma sweet classifies under aspect
  "taste". Slots differ, so the record does not answer.
- The derivation path proceeds exactly as today: the reply
  is "The soup may be cold.", with derivation path and
  pricing as today, and no answeredFromRecord.
- Recording proceeds as today (F3): the question's cold
  predication stands in the record beside sweet.

### (d) No-standing-state control

Turn: "Is the salt cold?" (fresh session).

- Byte-identical to today: "The salt is cold.", derivation
  path and pricing (attested, support 0.9, plain) as today,
  no answeredFromRecord.

### (e) Replacement is the asked quality

Turns: "The soup is cold." / "The soup is hot." / "Is the
soup hot?".

- Answered from the record with the REPLACEMENT: "The soup
  is hot."
- answeredFromRecord names the standing state (hot, turn 2)
  and the chain behind it (cold → hot at turn 2).
- At the end the soup's standing states are exactly [hot].

### (f) Negated standing state

Turns: "The soup is not cold." / "Is the soup cold?".

- The standing state is cold under negation; it occupies
  the slot (the asked quality itself, negated).
- The record answer predicates the standing state as it
  stands: "The soup is not cold."

### (g) Why-question against a contradicting record

Turns: "The soup is cold." / "The soup is cool." / "Why is
the soup cold?".

- The standing state (cool) contradicts the why-question's
  presupposition (cold). The record answers: "The soup is
  cool." No causal form is built from the cold derivation —
  deriving would predicate a quality the record says does
  not stand.

### (h) Why-question matching the record — derivation stands

Turn: "Why is winter cold?" (and the Behaviour 2 sequence
"Is winter cold?" / "Is the salt cold?" / "Why is winter
cold?").

- Unchanged from today: the causal form from the derivation
  ("Winter is cold, because it is most fully cold."), with
  derivation path and pricing as today — even though turn 1
  of the sequence recorded winter/cold (F3), because the
  standing state IS the asked predication and the why asks
  for the derivation itself.

## What does not change

- What the table derivation concludes when it does run.
- Recording on turns the record does not answer (F3).
- The record never overrides a question about a different
  slot (c), and never fires without a standing state (d).
- No new node or edge vocabulary; English only.
