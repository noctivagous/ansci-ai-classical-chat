# T-R3 — fresh transcript scenarios for slice R3 (FROZEN)

Authored 2026-11-16, BEFORE the R3 build (the question
transform in `src/ansci/plan.ts`, the sense-rival detection in
`src/ansci/sense.ts`, and the turn.ts wiring), per §10's rule:
a slice's transcript scenarios are authored before the
slice's code first runs against them and are frozen once
written. Failures against these expectations are findings,
to be recorded in `T-R3-results.md` — this file is not edited
to fit the build's behaviour.

R3 is §2.3's questions and §6's declines: questions generated
from genuine gaps, and every decline citing its ground. The
two gap shapes, and the rules the build implements (stated
here so the expectations are checkable against the rules, not
against the build):

- **Valency gap.** A role the turn's own event verb requires
  — a bare slot in `frameSignature.required ?? required`, or
  the verb's required prep slot — that the turn does not
  fill and the parse does not declare suppressed. FILLABLE
  (askable) means: a participant role of an event the person
  is themselves reporting — they know its participants.
  Never asked about: the agent (the speaker is the agent of
  their own report; a suppressed agent is the person's own
  construction — H1: declared, not missing); any suppressed
  role; a gap on an EARLIER turn's event (initiative's
  territory, R6); and anything whose filler is the system's
  knowledge rather than the person's (a missing
  classification is a decline ground, not a question). One
  gap is asked per turn — the first in frame order; any
  others are recorded in the trace.
- **Asking rule.** Asking is a move among others (§2.1), not
  a default. A gap question is asked only at the plain-event
  site — where no cycle steering has claimed the turn and
  the probe's follow-up is a content question — and there it
  REPLACES the probe's follow-up wording for that turn; the
  acknowledgment remains the probe's, and the trace records
  that split of origins. The steering branches are not
  preempted by a gap. A rival clarification, by contrast,
  preempts statement steering entirely: a reply cannot
  honestly steer by a classification that is split.
- **Rival split.** A node's classification is split when the
  sense machinery's own arithmetic leaves two derivations
  inseparable: at least two live candidates (ungated, within
  the confidence band of the best) in distinct elements,
  whose coherence supports are EQUAL at the top (compared at
  the project's 4-decimal rounding). The baseline then stands
  only by the sense pass's tie-keep convention — a convention,
  not evidence — and the one person who can separate the
  derivations is the speaker. Supports that differ, however
  slightly, are decisive and never clarify.

Expectations are stated as MECHANISM expectations — what gap
or split backs the turn, what the trace must name — never as
expected verbatim strings, because under R3 the wording of a
generated question is the generator's, not the test's. The
standing disciplines apply to every turn: the trace names the
question's ground (the gap, or both rival derivations with
their supports) and the reply graph where one was built (§6);
no reply names the ontology on the surface (the leak scan);
a decline cites its ground in plain words on the surface,
not only in the trace.

## Scenario R3-1 — a valency-gap question: the theme of give

Turns:
1. "I gave him."
2. "I gave him the book."

Expectations:
- Turn 1: the event is give; the recipient (him) is filled,
  the theme is required and unfilled — a fillable valency
  gap. The reply acknowledges the event and asks about
  exactly that role, the question GENERATED from a question
  graph whose questioned element is the theme slot (the
  natural surface: a what-question over the event, with the
  filled recipient carried). The trace names the gap (verb
  give, role theme) as the question's ground and carries the
  question graph; the acknowledgment's origin is recorded as
  the probe's.
- Turn 2: both required roles are now filled. No gap exists,
  so no gap question is asked; the turn is an ordinary event
  turn. (That the same verb asked at turn 1 and does not ask
  at turn 2 is the discipline working, not an inconsistency.)

## Scenario R3-2 — valency gaps of the other two kinds

Turns (one session):
1. "I gave the book."
2. "I put the onions."

Expectations:
- Turn 1: give's lone full-NP object takes the required
  object role (theme: the book, by the parser's lone-object
  alternation); the RECIPIENT is the required role left
  unfilled. The reply asks after exactly the recipient — a
  who-question over the event, the filled theme carried.
  The trace names the gap (verb give, role recipient).
- Turn 2: put's theme is filled (the onions); its location
  is a REQUIRED prep slot and no place is given — a valency
  gap of the prep-slot kind. The reply asks after exactly
  the place — a where-question over the event, the filled
  theme carried. The trace names the gap (verb put, role
  location, via the required prep slot).

## Scenario R3-3 — a rival-derivation clarification

This scenario runs with the WordNet lexicon enabled, as the
dashboard runs it (the sense machinery's candidates exist
only then). Two runs:

- **R3-3a** — turn: "I found rest."
  The word rest carries two live climb derivations in
  distinct elements: Water at confidence 0.9, anchored at
  sleep (aspect: state), and Earth at confidence 0.7,
  anchored at relief (aspect: emotion) — both ungated, both
  within the confidence band. The sentence gives the sense
  arithmetic no context to separate them: coherence support
  is 0 for both. The classification is split by the rule
  above. Expectation: the reply is a clarification question,
  generated from a question graph; the alternatives it
  offers ARE the rival derivations' contents in plain words
  — rest as in sleep, or rest as in relief (the anchors each
  derivation lands on). The trace names both derivations
  (anchor, element, confidence, support) and the tie as the
  question's ground. No steering proceeds on the split
  classification.
- **R3-3b** — fresh session; turn: "I found rest in the garden."
  The same word, now with context: the garden's element
  votes, the supports separate (Earth 1, Water 0.4), the
  sense choice is decisive (and overturns the baseline).
  Expectation: NO clarification is asked; the turn is an
  ordinary event turn. The pair R3-3a/R3-3b pins the
  criterion: the same word clarifies exactly when the
  arithmetic cannot separate its derivations.

## Scenario R3-4 — declines of each ground kind, in conversation

Fixture (disclosed, synthetic): this scenario's session runs
with ONE fixture classification pushed for the run — pot:
Water, aspect "food", confidence 0.35, provenance
fork-creative — the same disclosed fixture as T-R1's R1-4.
Without it, turn 4's subject has no classification at all
and the turn would test the missing-classification ground a
second time instead of the support shortfall.

Turns:
1. "Is the table cold?"
2. "I bought the onions."
3. "What did I put in the soup?"
4. "Is the pot cold?" (fixture in force)
5. "Is the salt cold?"

Expectations:
- Turn 1 — missing classification: the decline's SURFACE
  names the ground in plain words (nothing on the table in
  the system's notes), as the standing decline shape already
  does; the trace carries the same ground.
- Turn 2: an ordinary event turn, handled normally — the
  conversation continues after a decline (§11.5).
- Turn 3 — missing role: the question asks for the theme of
  put. The situation holds a buy event and no put event at
  all, so the role the question asks after is filled by
  nothing the person has said. The reply declines, and its
  surface names the missing piece in plain words — that
  nothing the person has told the system says what was put
  in the soup (the question's own filled place may season
  the phrase; the missing piece is the thing put). The
  trace's decline ground names the verb and the role. A bare
  "that question is outside what I can work through" — the
  pre-R3 surface — fails this turn: it names no ground.
- Turn 4 — support shortfall: the priced decline of R1-4,
  re-pinned in conversation form. The surface names the
  faintness of what connects the pot to cold; the trace
  carries the pricing record (declined) and the ground with
  its numbers.
- Turn 5: answered normally from the derivation ("The salt
  is cold." in substance). After three declines of three
  different grounds, the conversation is still in progress —
  a decline is a turn, not an ending.

## Scenario R3-5 — negative controls: no gap, no question of R3's

Turns (fresh sessions where noted):
1. "Is the salt cold?"
2. "I read the book."
3. "I gave him the book."

Expectations:
- Turn 1: a fully specified, classifiable question. It is
  answered from its derivation and the reply asks NOTHING —
  no gap question, no clarification. (This is the
  zero-question control. A literal zero-question STATEMENT
  control does not exist in the probe's design — every
  plain-event branch ends in some follow-up — so turn 1 is
  the control for "no question is generated", and turns 2–3
  are the controls for the gap machinery specifically.)
- Turn 2: read's one required role (patient: the book) is
  filled. No gap question is generated — the trace carries
  no gap record — and no clarification (the book has no
  rival derivations). The reply is the probe's pre-existing
  event follow-up, unchanged in origin and marked
  not-derived, exactly as T-R1's R1-5 pinned it.
- Turn 3: give with both required roles filled. No gap
  question is generated, although turn R3-1.1 — the same
  verb with one role missing — asked one. The pair is the
  discipline's other half: the transform fires on the gap,
  not on the verb.
