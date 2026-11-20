# Social Unit S4 — report (2026-11-18)

Slice S4 of the Social Unit design (§11): the clarification
move end to end. Bar items 6 and 7. Built in the worktree
`~/workspace/ansci-track-social-seq` (branch
`track/social-unit-seq`, stacked on S3's commit) under the
owner's sequence authorization for S2–S5. Local commit; push
waits for the owner's word.

## What was built

**The pending register is live.** S1 held its shape; S4 makes
it machinery. The Conversation register's pending entry now
carries what the fill reading needs — the located point, the
question as asked, the offered candidates with the reading
each names, the utterance being clarified, and the best
reading the fallback proceeds on — and the register gains
`clarifiedSenses`, the readings a conversation has settled.
All writes go through the unit's functions in social.ts
(`openClarification`, `closePending`,
`noteClarificationAttempt`, `noteClarifiedSense`,
`matchPendingFill`): the unit remains the registers' one
writer, and opening a clarification also files the gap in
the Interlocutor's addressed-to-them list, the field S1 held
for exactly this.

**The fill reading.** A standing clarification is read
against the next turn FIRST, in two stages. Before parsing:
a candidate-less pending (the context request, the rephrase
request) is answered by the continuation itself and closes;
a fill naming an offered candidate resolves the point — for
a token, the chosen word is substituted into the original
sentence, which is then processed as the turn (the guessed
reading is never recorded); for a sense, the chosen reading
becomes the conversation's settled reading for the lemma and
the fragment is consumed as the answer ("Noted — as in
broth."). After assessment: a turn that did not fill but
stands as a usable turn of its own abandons the pending —
the conversation has moved on and the point is not chased,
though it may be raised again if it recurs. A turn that is
neither counts as an attempt: the question is re-asked once,
and at the second failure the system proceeds on its best
reading and says so ("I'll take 'stock' in the mammal sense,
then." / "I'll take 'wethr' as water." — the latter then
processes the original sentence on that reading). There is
no third clarification on the same point.

**The four triggers, at their located sources:**

- **(a) Token** — a new site in the turn, reading the parse's
  own token record: a resolution standing "unresolved" with
  genuine rival candidates, or a matcher correction whose
  recorded confidence fell below the matcher's own
  undiscounted distance-2 score (0.60) with a rival at the
  same distance. The offered candidates are filtered by the
  resolver's own test — a candidate is offered only if the
  sentence parses with it standing in. An unresolved token
  with no candidates leaves as the rephrase request. The
  asking turn records nothing of the sentence's content.
- **(b) Sense** — the R3 rival-split site already asked the
  question ("Do you mean the stock as in mammal, or as in
  broth?"); S4 gives the asking its conversation machinery:
  it opens the pending (candidates = each rival's anchor plus
  its sense's own lemmas, so a fill may name the reading in
  any of the words the senses carry), respects
  `clarifiedSenses` (a settled lemma is not asked again —
  before S4 the same question returned on every later use of
  the word), and its fallback settles on the baseline rival.
  Ruling 3a's abstention is now conversational: the sense
  pass still tie-keeps a baseline in the parse (the
  classification layer is untouched), but the reply no longer
  proceeds on the guess as if it were knowledge.
- **(c) Referent** — the unanchored-definite site ("What
  table? You just started talking.") now opens the pending;
  the continuation closes it, and with the referent grounded
  the same question asked again is answered ("The table is
  cold.").
- **(d) Whole utterance** — the parse-failure return is now
  the designed rephrase request, "Could you put that another
  way?", which names no failure; the trace keeps the located
  gap, and the pending opens for the rephrase.

**Two collisions found by the full suite, fixed at their
locations (8 failures on the first run, all in other
programmes' specimens):**

- "How many apples do I have?" drew "Did you mean How, or
  how?" — the token record marks sentence-initial "How"
  unresolved with one candidate, "how" at distance 0: the
  record of a capital the resolver's dictionary lacks, not a
  doubt. The trigger now counts only genuine rivals —
  distinct words at a real distance; a case-only candidate
  names no choice.
- "blorp. zizzle. frak." drew a token clarification instead
  of the gibberish repair: a whole utterance with no
  resolvable content is the gibberish flag's ground (the
  Normalcy programme's designed move), and the token trigger
  now stands down where that flag is priced.

## Gates (delivered runs, this tree)

- Suite: **758 pass, 0 fail** (761 counted; S3's tree's
  751/754 plus S4's seven new social tests).
- Demo **29/29** (27 exact); holdout **80/80 parsed**, 0
  parse regressions (the one round-trip regression is the
  known pre-existing provider effect).
- Sense sets **A 11/11 · B 5/6** — unchanged.
- `npm run ai:check` OK (82 nodes).
- Transcripts per trigger class, through the real turn loop
  in the test file: the stock tie asked, filled, settled and
  not re-asked; the weak token ("wethr", corrected to water
  at 0.46) asked, filled with "weather", and the weather
  statement — not the guessed one — is what the session
  records; attempts re-asked once and falling back on both
  classes; abandonment by a usable turn; the referent arc;
  the rephrase arc.

Registry: Social Unit 55% → 70%, Conversation 35% → 55%;
summaries updated, the unit's PLACEHOLDER records S4, and
every awareness node's percent was diffed against HEAD —
exactly the two intended changes stand.

## What this does not show

The (b) asking keeps its R3 reach: statement turns. A split
inside a question is still not asked about (the interrogative
returns run earlier) — the design's trigger is general, the
wiring's reach is the existing site's, recorded here rather
than widened silently. A sense fill is acknowledged, not
re-steered: the original statement stands recorded (the R3
order), its steering was preempted by the question, and S4
does not re-run a past turn's steering under the chosen
reading — the settled reading governs later turns, which is
where the transcripts show it working. A token fill is
matched on the offered words only; a person answering in
other words ("the wet kind") is a failed attempt by the
machinery's lights, bounded by the two-attempt rule rather
than understood. The one-candidate case is not asked (a
single neighbour is not a choice); the token stands as the
resolver left it. As with S2 and S3, the sealed probe run
remains the holder's, at the end of the sequence.
