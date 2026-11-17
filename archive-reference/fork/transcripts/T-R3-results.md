# T-R3 results — slice R3 judged against the frozen scenarios

Run 2026-11-16, after the R3 build (the question transform in
`src/fork/plan.ts`, rival-split detection in `src/fork/sense.ts`,
the turn.ts wiring, and two minimal connective extensions in
`src/fork/generate.ts`), via `node scripts/fork-r3-transcript.mjs`
against the built tree. The frozen expectations are in
`T-R3.md`, unedited. Verdicts are per §6: a reply counts only
when its trace names the question's ground — the gap, or both
rival derivations with their supports — and the reply graph
built from it.

Summary: **all five scenarios pass**, one with a mechanism
note (R3-4 turn 2). Two findings are recorded at the end,
both pre-existing limits the run exposed rather than R3
defects; neither was fixed in this slice.

## R3-1 — valency gap, theme of give: PASS

- Turn 1 ("I gave him."): "You gave. What did you give him?"
  The trace names the gap (verb give, role theme) as the
  question's ground; the reply graph is the parser's own
  wh-shape over the event — verb root interrogative, the
  filled recipient carried as the person's own node, the
  questioned element (what, questionWord) sitting in the
  theme slot. The acknowledgment's origin is recorded as the
  probe's (planNote; wordingNotDerived stays set), the
  question's as the planner's — the split of origins is in
  the trace, not hidden.
- Turn 2 ("I gave him the book."): both required roles
  filled; no gap record, no gap question. The follow-up is
  the probe's pre-existing theme-triggered wording, as
  before R3.

## R3-2 — recipient and location gaps: PASS

- Turn 1 ("I gave the book."): "You gave the book. Who did
  you give the book?" — the lone object took the theme by
  the parser's lone-object alternation, the recipient is the
  gap, and the who-question carries the filled theme.
- Turn 2 ("I put the onions."): "You put the onions. Where
  do you put the onions?" — the gap is the required prep
  slot (location), named as such in the trace. One
  observation, recorded as finding F2 below: the question is
  present-tense because the parser records the ambiguous
  form "put" as base/present; the transform reuses the
  clause's recorded tense rather than inventing one.

## R3-3 — rival-derivation clarification: PASS (both runs)

- R3-3a ("I found rest."): "Do you mean rest as in sleep, or
  as in relief?" — generated from the clarification graph
  (the ambiguous entity predicated as each rival content,
  the two predications joined by an or-marked links edge).
  The alternatives are the rival derivations' landing
  concepts. The trace names both derivations — sleep
  (Water) at support 0, confidence 0.9; relief (Earth) at
  support 0, confidence 0.7 — and the ground: equal support,
  the baseline standing only by the tie-keep convention.
  wordingNotDerived is false: the reply is the planner's.
- R3-3b ("I found rest in the garden."): no clarification;
  the garden's context separates the supports (Earth 1,
  Water 0.4) and the turn proceeds as an ordinary event
  turn. The pair pins the criterion as authored.

## R3-4 — declines of each ground kind, in conversation: PASS, with a mechanism note

- Turn 1 ("Is the table cold?"): missing-classification
  decline; the surface names the ground ("I have nothing on
  table in my notes"), as the standing shape already did.
- Turn 2 ("I bought the onions."): handled normally — the
  conversation continues. MECHANISM NOTE: the reply is the
  venting steering ("Now that it's out — what would help
  you settle?"), because turn 1's question predication was
  recorded as a standing state (cold, of the table) before
  the question branch ran, and an event after a state is
  steered as its venting. That recording behaviour predates
  R3 and is not changed by it; it is named here because the
  frozen expectation says only "handled normally", and the
  trace (cycle path, pricing record) shows why the normal
  handling took this shape. Recorded as finding F3.
- Turn 3 ("What did I put in the soup?"): missing-role
  decline. Surface: "I can't answer that from what I know:
  nothing you have told me says what was put." The trace's
  ground names the verb and the role (the theme of 'put',
  filled by no put event in the situation). The pre-R3
  surface ("That question is outside what I can work
  through at the moment") is gone. One shortfall against
  the frozen text's optional clause: the phrase is not
  seasoned with "in the soup", because the wh-parse itself
  drops post-gap material in object questions — the place
  never reaches the meaning graph the decline is built
  from. Finding F1.
- Turn 4 ("Is the pot cold?", fixture in force): the priced
  support-shortfall decline, re-pinned in conversation form
  — pricing record declined at support 0.35 against the
  floor 0.4, the ground with its numbers in the trace, the
  faintness named on the surface.
- Turn 5 ("Is the salt cold?"): answered normally from the
  derivation, generated, at plain strength. Three declines
  of three grounds did not end the conversation.

## R3-5 — negative controls: PASS

- Turn 1 ("Is the salt cold?"): answered; the reply contains
  no question; no gap or clarification record.
- Turn 2 ("I read the book."): read's required patient is
  filled — no gap record; the reply is the probe's
  pre-existing follow-up, unchanged in origin, exactly as
  T-R1's R1-5 pinned it.
- Turn 3 ("I gave him the book."): the same verb as R3-1
  turn 1 with both roles filled asks nothing. The transform
  fires on the gap, not on the verb.

## The asking rule, as built (stated for the record)

A gap question is asked only at the plain-event site of the
turn loop — no cycle steering has claimed the turn, the mood
is indicative — and there it replaces the probe's follow-up
wording for that turn; the acknowledgment remains the
probe's. Steering branches are never preempted by a gap. A
rival clarification preempts all statement steering: the
reply is the clarification alone. One gap per turn (first in
frame order; the rest are named in planNote) and one
clarification per turn (further split nodes likewise named).
Fillable means a required role of the current turn's own
event verb, unsuppressed, other than the agent; gaps on
earlier turns' events are never asked about (R6's
territory), and a missing classification is never a question
— it is a decline ground.

## Decline inventory (every decline site in the turn loop)

- Parse failure: ground — the sentence could not be taken
  apart by the sentence layer; already named on the surface
  before R3 ("I couldn't take that sentence apart — could
  you put it another way?"). Unchanged.
- Predicate question, missing piece (answerPredicateQuestion):
  grounds — no classification for the subject, no quality
  node for the predicate, or no path between them; already
  named on the surface in plain words before R3. Unchanged.
- Priced decline (planner): ground — the support shortfall,
  with numbers in the trace and the faintness on the surface
  (R1). Unchanged.
- Interrogative over a verb (no predicate edge): REWORKED in
  R3. Before, one groundless surface for every shape. Now:
  where the parse's query record names a questioned role and
  no recorded event of the verb fills it, the ground is the
  missing role, named on the surface and in the trace; where
  the record fills it, or no query record exists, the ground
  is the question's shape, likewise named. No site at this
  branch has a ground that is not computable from the parse
  and the record.
- Composition declined at the question site: not a spoken
  decline — the outcome is recorded in planNote and the
  single-conclusion path answers or declines on its own
  ground (R2). Unchanged.

## Findings

- **F1 — the wh-parse drops post-gap material in object
  questions.** Parsing "What did I put in the soup?" builds
  the agent and the questioned theme, and returns; the "in
  the soup" phrase never enters the meaning graph (subject
  questions keep their post-verbal material; object
  questions do not). Consequences visible in this run: the
  missing-role decline cannot season its phrase with the
  place the person did supply, and the question's own
  recorded event lacks its location. Pre-existing; a parser
  change, outside R3's scope. The decline's ground is
  unaffected — the missing piece is named either way.
- **F2 — tense-ambiguous verb forms carry the parser's
  reading into generated questions.** "Put" is recorded as
  base/present, so its gap question is present-tense. The
  transform reuses the recorded tense by design; if the
  reading is wrong, the error is the parser's ambiguity,
  surfaced honestly rather than corrected by invention.
- **F3 — a question turn's predication stands in the record
  as a state.** Recording runs before the question branch,
  so a declined question ("Is the table cold?") leaves its
  predicate standing as a state of its subject, and the
  next event turn is steered against it (R3-4 turn 2).
  Pre-existing; whether a question's predication should
  stand as a state is a recording-discipline question for a
  later slice, named here because this run made it visible.
