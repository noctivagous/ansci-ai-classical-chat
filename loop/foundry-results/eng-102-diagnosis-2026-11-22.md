# ENG-102 — place names and reference: diagnosis 2026-11-22

Question: does "It was in New York" survive into the scene, or only into
the graph?

## Findings (all observed, not inferred)

1. The parse is correct. Turn 2 graphs `ball -> york : location` with
   `new` qualifying `york`, and `trace.resolutions` records
   `it -> ball`. The reference-places-01 suite case passes.
2. Nothing is recorded. After both turns: `session.events` is `[]`,
   `session.states` is `[]`; only entity mentions (`game`, `ball`,
   `york`) are filed. Two gates explain it, both in
   [turn.ts](file:///Users/jpratt/Developer/ansci-ai-classical-chat/src/ansci/turn.ts):
   the event ledger requires a Wood verb root
   (`isVerbRoot`, ~line 5582; `york` is not a verb, `game` is not
   either), and the state branch requires a predicate edge into the
   root (~line 5672; neither graph has one).
3. The drop is user-visible. "Where was the ball game?" → cannot answer;
   "Where was the ball?" → answers about a comedienne, from lexical
   knowledge, because the told location stands nowhere in the record.
   The turn-2 "Ok." is hand-worded (`wordingNotDerived`), masking the
   loss.

## Classification

Missing capability: no recording path for existential ("there was a
ball game") or copular-locative ("it was in New York") predications —
non-verb roots without predicate edges. Not an interpretation defect:
roles, the location edge, and the pronoun resolution are all correct.

## Next action (not taken here)

Design a recording path for locative/existential predications — e.g.
record the ball-in-york relation as a state or event with its holder —
with negative controls (questions record nothing; distinct occurrences
stay distinct), then extend the development suite with follow-up
question turns that prove the scene consults it. The current
graph-level expectations all pass, so this needs new suite cases,
not a fix against existing ones.
