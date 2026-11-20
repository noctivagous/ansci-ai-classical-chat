# T-R6 — fresh transcript scenarios for slice R6 (FROZEN)

Authored 2026-11-16, BEFORE the R6 build (bounded initiative
in `src/ansci/turn.ts`; the awareness frame and the role slot
in `src/ansci/session.ts`), per §10's rule: a slice's
transcript scenarios are authored before the slice's code
first runs against them and are frozen once written.
Failures against these expectations are findings, to be
recorded in `T-R6-results.md` — this file is not edited to
fit the build's behaviour.

R6 is §8.10 (initiative: the gap machinery of §2.3 run on
the session instead of the turn) and §8.1 (awareness: the
frame classified, not read off a clock), inside §10's bound:
at most one initiative move in any five turns, and never
when the person's turn presents a gap or question of its
own. Everything in this slice is disposition-neutral: the
neutral composition is in force throughout, and no bias
channel is extended.

## 0. What the graph and the parser actually give (the investigation)

Probed against the shipped parser, the seed graph and the
classification table before this file was written:

- **Seasons.** The table classifies the four seasons under
  the aspect label "season" (spring Wood, summer Fire,
  autumn Metal, winter Water), all fork-curated at 0.95 —
  the attested Yueling correspondences §8.1 names. The seed
  graph carries the same rows as Season nodes with
  ELEMENT_OF edges, which the fork graph reuses.
- **Dayparts.** The graph DOES hold daypart content, on two
  legs. The table classifies the four times of day under
  the aspect label "time" (dawn Wood, midday Fire, dusk
  Metal, night Water), fork-curated at 0.95. And the seed's
  TimeOfDay nodes carry POLARITY_OF edges — dawn Yang,
  midday Yang, dusk Yin, night Yin. So a daypart is
  classified on both the element leg and the polarity leg;
  the unclassified-daypart fallback (record the daypart
  with the reason it cannot be classified) is implemented
  for the case a leg is missing, but on the graph as it
  stands no daypart needs it.
- **Which replies can carry an initiative move.** Read over
  `processTurn`'s return sites: among the steering replies
  only the restrainer branch's ends in a plain statement
  ("…That seems to be the thing holding the X back."); the
  venting, generating, need and plain-event replies all end
  in questions. The question sites' answers are plain
  statements, but the person's own question bars initiative
  on those turns (§1, gate 1). Corrections and declines are
  barred by gate 2. So in practice the move attaches at the
  restrainer site — the scenarios below are built on the
  turns the shipped loop actually produces, probed turn by
  turn before this file was written.
- **Corrections are per-holder; the restrainer search is
  not.** The correction trigger (§8.7 S12) matches states of
  the same holder, so a thing's states never correct the
  person's and vice versa — the scenarios use thing-states
  (the soup, the tea) for the restrainer pairs so no
  correction preempts the steering they rely on. The
  restrainer branch's wording is the probe's person-shaped
  wording even when the states are a thing's; that is
  standing behaviour, not this slice's to fix, and the
  expectations below are mechanism expectations (which
  branch, which states, what is appended), with verbatim
  replies pinned only where the pre-R6 probe already pins
  them.
- **Two things the record does not carry.** A standing
  event's clause tense and the parse's suppression
  declarations are not in the record (events carry verb,
  agent, patient, theme, location, recipient, turn, text).
  The persisting-gap scan (§1, shape (b)) therefore reads
  filled roles only — a role the person suppressed by
  construction would read as unfilled; that is a limit of
  reading the record rather than the parse, recorded here,
  not silently absorbed. And the record-based question is
  built in the past — the tense the loop's own
  acknowledgements use for recorded events ("You gave…") —
  since the record carries no tense to reuse.
- **The frame is not read by any steering site.** The
  steering branches read states of holders; the derivations
  read the graph. The frame is neither — a season is not a
  state a holder holds, and entering it as one would make
  the restrainer branch address persons about the weather
  of the session. No parallel reasoning path is built for
  it in this slice: the expectations for the frame (§6) are
  record and trace presence only, stated plainly there.

## 1. The initiative rule, stated exactly

At the end of `processTurn`, after the reply is formed, an
initiative scan runs. It appends ONE move to the reply when
ALL of these gates hold:

1. **The person's turn presented no question or gap of its
   own.** The turn was not interrogative, and the turn
   loop's gap computation found no fillable valency gap in
   it. (The trace records this as `personPresented` —
   "question" or "gap" — when either holds. The
   steering-preempted cases, where a gapped event's reply
   is a steering question rather than the gap question, are
   covered by gate 3.)
2. **The reply is neither a decline nor a correction
   acknowledgement** (no decline reason, no correction
   record in the trace).
3. **The reply does not end with a question.**
4. **The bound permits.** The session records the turns of
   past initiative moves. A move at turn t forbids another
   before t + 5: initiative may fire at turn n only when
   n − (last initiative turn) ≥ 5, or no move stands. That
   is the window rule for "at most one initiative move in
   any five turns".
5. **A candidate stands** (below) and is not excluded.

The two candidate shapes — §8.10's two gaps:

- **(a) An unexpressed state.** A standing state S with a
  classified origin (a derivation stands behind it: the
  origin's path, support and tier, §9.4.1), not negated,
  recorded at least two turns ago (S.turn ≤ turn − 2),
  whose lemma the predication construction can predicate —
  not a verb: the construction predicates qualities, not
  doings (the R5 scoping for verb-carried states) — and
  **unexpressed**: no state recorded with turn > S.turn has
  element GENERATES[S.element]. "Expressed" is read over
  recorded states, any holder — the record's only
  element-bearing content. The frame (§2) does not count as
  expression: it is the situation's frame, not content the
  conversation expressed. Excluded: S is the state this
  turn's restrainer steering addressed (the reply already
  took that thread up), and S has already grounded an
  initiative move while this same record stands (a state
  once taken up is not taken up again; if the person
  re-states it, the new record is a new candidate).
  **The move** is the planner's predication of S over its
  holder, priced from S's origin — support and tier from
  the origin, the derivation path the origin's
  classification leg — built by `planPredication`, the
  transform every priced predication uses.
- **(b) A persisting gap.** A standing event E from an
  earlier turn (E.turn < turn) and a role R such that R is
  required by E's verb (a bare slot in
  `frameSignature.required ?? required`, or the verb's
  required prep slot), R is not the agent, R has a question
  word (`ROLE_QUESTION_WORD`), E does not fill R, and no
  recorded event of the same verb fills R — the gap remains
  unfilled in the record. Excluded: (E, R) has already
  grounded an initiative move. **The move** is the R3
  question transform (`planRoleQuestion`) run on the
  record: the verb's entry, its past form, agent "you",
  the filled roles from the record in frame order (thing
  roles carrying the record's definite article, as the
  loop's own acknowledgements name them — "the soup").

Candidates are tried oldest grounding record first (the
state's or event's turn); on a tie of turns, shape (a)
before shape (b). The first candidate whose move the
planner builds fires; at most one move per turn. The move
is appended to the reply as its own sentence. The trace
records it under `initiative`: the shape, the ground in
words (the state, its generating direction, the turns
elapsed — or the event, its verb and role, the turns
elapsed), the move's kind, the appended sentence, and the
pricing when the move is a predication. The session records
the move (`initiatives`); the bound and the no-repeat rule
read that record. No gap in the record → no move, however
long the silence: initiative never manufactures an opening.

## 2. The awareness frame and the role slot, stated exactly

`newSession` gains an optional frame input — the shell's
shape: a plain record `{ month?, day?, hour, dateISO? }`
(hour always; month and day may ride the ISO date instead).
Fork:chat/dashboard wiring of real clocks is R7's; here the
parameter exists and tests supply it.

- **Season** from the month by a stated convention:
  meteorological seasons, northern hemisphere — months
  3–5 spring, 6–8 summer, 9–11 autumn, 12/1/2 winter. The
  convention is connective-layer: it maps a calendar to a
  season NAME. The season's classification is the table's
  (§0): the frame's season entry carries the table entry's
  element and a state origin in R0's style (classification
  leg, confidence as support, tier of its provenance). A
  frame input with no month records no season, with the
  reason named ("no month supplied").
- **Daypart** from the hour by a stated convention: hours
  5–10 dawn, 11–16 midday, 17–22 dusk, 23–4 night. Its
  classification is read from the graph as it stands (§0):
  the element leg from the table's "time" entry (with its
  origin, as for the season) and the polarity leg from the
  seed node's POLARITY_OF edge, the leg recorded as its
  path text ("night —POLARITY_OF→ Yin"). A leg the graph
  does not hold is recorded as absent with the reason, and
  the daypart stands with what legs exist — never with an
  invented one.
- The frame lives in the session record (`session.frame`)
  as classified content in the same style as state origins,
  and every turn's trace header carries it (`trace.frame`),
  beside the disposition. A session opened with no frame
  input carries no frame, and its traces carry none.
- **The role slot (§8.1).** The session record gains a role
  composition beside the disposition (`session.role`),
  default the neutral composition, rendered in every
  trace's header (`trace.role`). NO behaviour reads it in
  this slice: it is a slot for later work, and §6 pins its
  inertness.

## 3. Scenario R6-1 — initiative from an unexpressed state

One session; turns:

1. "I was furious."
2. "I heard the news."
3. "The soup is sweet."
4. "I made the soup yesterday."
5. "The soup is green."

Facts (probed): turn 1 records you/furious (Wood, classified
origin, attested tier at 0.9); its generating direction is
Fire, and no later turn records a Fire state — turns 3 and 5
record soup/sweet (Earth) and soup/green (Wood). Turns 2–4's
replies all end in questions (venting, generating, venting),
so no move can attach before turn 5. Turn 5's green controls
the standing sweet (Wood→Earth), so the restrainer branch
speaks — a plain-statement reply — and the state it
addresses is sweet, not furious. Sweet itself is no
candidate at turn 5: it is the addressed state. (Its
generating direction, Metal, is also unexpressed — the
exclusion, not the arithmetic, is what keeps it out, and
the results file will say which.)

Expectations:

- Turns 1–4: no initiative record in any trace;
  `session.initiatives` stays empty.
- Turn 5: the reply is the restrainer reply with ONE
  appended sentence — the planner's predication of the
  standing state at its origin's price (attested, support
  0.9 → plain): "You are furious." Full reply: "You were
  held from sweet, and you were green. What is the green
  about? That seems to be the thing holding the sweet
  back. You are furious." The trace's initiative record
  names shape "unexpressed-state", the ground (the state
  you/furious recorded at turn 1, its generating direction
  Wood→Fire unexpressed, 4 turns elapsed), the move (a
  predication) and its pricing (weakest tier attested,
  support 0.9, level plain). The serialised reply graph is
  the predication's graph. `session.initiatives` holds
  exactly this one record.

## 4. Scenario R6-2 — initiative from a persisting gap

One session; turns:

1. "I slept."
2. "I gave him."
3. "I heard the news."
4. "The soup is sweet."

Facts (probed): turn 1 records the verb-carried state
you/sleep (Water) and its event. Turn 2's give event fills
the recipient (him) and leaves the theme — a required
role — unfilled; the venting branch claims that turn (the
standing sleep state is what it meets), so the gap is
computable but never asked, and it persists: no later event
of give fills it. Turn 3's reply ends in a question. Turn
4's sweet (Earth) controls the standing sleep (Earth→
Water): the restrainer branch speaks, a plain statement.
The sleep state is no shape-(a) candidate — its lemma is a
verb, and the predication construction does not predicate
doings — so the standing gap is the candidate.

Expectations:

- Turns 1–3: no initiative record; the give gap is never
  asked on its own turn (turn 2's reply is the venting
  reply, unchanged from the pre-R6 build).
- Turn 4: the reply is the restrainer reply with ONE
  appended sentence — the R3 question built from the
  record over the give event: "What did you give him?"
  Full reply: "You were held from sleep, and you were
  sweet. What is the sweet about? That seems to be the
  thing holding the sleep back. What did you give him?"
  The trace's initiative record names shape
  "persisting-gap", the ground (the event give at turn 2,
  its required theme role unfilled in the record, 2 turns
  elapsed) and the move (a question). `session.initiatives`
  holds exactly this one record.

## 5. Scenario R6-3 — the bound, over a long conversation

One session; turns:

1. "The soup is cold."
2. "I was worried."
3. "The tea is hot."
4. "I heard the news."
5. "The soup is salty."
6. "I made the soup yesterday."
7. "The pie is sweet."
8. "I cooked the rice."
9. "The juice is salty."
10. "The cake is sweet."

Facts (probed): two candidates stand early and stay
unexpressed — soup/cold (Water, turn 1; its direction Wood
is never recorded after it) and you/worried (Earth, turn 2;
its direction Metal is never recorded after it). The
restrainer branch speaks at turns 2, 5, 7, 9 and 10 (each
new state controls a standing one); the other turns' replies
end in questions. At turn 2 cold is only one turn old — the
age rule (§1, shape (a)) keeps it out, so no move fires
there even though the reply is a plain statement.

Expectations:

- Turn 5: initiative fires on the OLDEST candidate — cold,
  not worried — appending its predication at its origin's
  price (attested, 0.95 → plain): "The soup is cold." The
  initiative record names the state (soup/cold, turn 1)
  and 4 turns elapsed.
- Turns 7 and 9: candidates still stand (worried among
  them) and the replies are plain statements, but NO
  initiative fires — the bound: 7 − 5 = 2 and 9 − 5 = 4 are
  both < 5. No initiative record in either trace, and the
  replies are byte-identical to the pre-R6 build's.
- Turn 10: the bound permits (10 − 5 = 5). Initiative
  fires on worried — cold, already taken up at turn 5, is
  not taken up again while the same record stands —
  appending its predication at its origin's price
  (derived tier — worried is a fork-creative entry —
  support 0.9 → qualified): "You may be worried." The
  initiative record names the state (you/worried, turn 2),
  8 turns elapsed, and the pricing (weakest tier derived,
  support 0.9, level qualified).
- `session.initiatives` holds exactly two records, at
  turns 5 and 10. No other turn in the conversation
  carries an initiative record.

## 6. Controls

### R6-4 — control (i): the person's own questions and gaps bar every turn

One session; turns:

1. "I was furious."
2. "Why is winter cold?"
3. "Is summer hot?"
4. "I gave him."
5. "Is autumn dark?"

Facts: furious (turn 1) stands unexpressed at turn 2 — no
Fire state has been recorded — and turn 2's reply is a
plain statement ("Winter is cold, because it is most fully
cold."). The ONLY bar at turn 2 is gate 1: the person's
turn is a question of their own. (From turn 3 the recorded
summer/hot state is Fire, so furious is expressed thereafter
anyway; the file does not pretend turns 3–5 pin gate 1 for
furious.) Turn 4's event carries a fillable gap of the
person's own, and its reply is the venting question. Turn 5
is the person's question again.

Expectations: no initiative record on any turn;
`session.initiatives` stays empty; every reply is
byte-identical to the pre-R6 build's.

### R6-5 — control (iii): an expressed direction grounds no initiative

One session; turns:

1. "I was furious."
2. "The soup is hot."
3. "I heard the news."
4. "The tea is cold."
5. "Is winter cold?"

Facts: turn 2 records soup/hot (Fire) — Fire is exactly
GENERATES[Wood], the generating direction of the standing
furious state, so furious is EXPRESSED from turn 2 on.
Turn 4's cold (Water) controls the standing hot (Water→
Fire): the restrainer branch speaks, a plain statement, and
the state it addresses is hot. At turn 4 furious is old
enough (3 turns), unaddressed, and the bound permits — the
only bar is its expressedness. Hot is no candidate either:
it is the addressed state. Turn 5 is the person's question.

Expectations: no initiative record on any turn;
`session.initiatives` stays empty; every reply is
byte-identical to the pre-R6 build's. In particular turn
4's reply carries no appended predication of furious.

### R6-6 — the awareness frame and the role slot

Four sessions:

- **A.** Opened with frame input `{ month: 1, day: 15,
  hour: 23 }`. Turns: "Why is winter cold?", "I was
  furious." Expectations: `session.frame.season` is winter
  — element Water, origin classified with provenance
  fork-curated, tier attested, support 0.95, leg "winter
  —HAS_ELEMENT→ Water". `session.frame.daypart` is night —
  element Water with its table origin (aspect "time",
  fork-curated, 0.95), polarity Yin with its leg recorded
  ("night —POLARITY_OF→ Yin"). Every turn's trace carries
  the frame and the role ("predominant Earth", the neutral
  composition). The replies are byte-identical to the same
  turns run in an unframed session: in this slice no
  processing reaches the frame (§0), and the winter answer
  is reached through the person's question subject, not
  through the frame — the expectation is record and trace
  presence only, pinned by that identity.
- **B.** Opened with frame input `{ month: 7, hour: 14 }`.
  Turn: "I was furious." Expectations: the season is
  summer (Fire, fork-curated, attested); the daypart is
  midday (Fire, fork-curated) with polarity Yang. Then, in
  a second session opened with the same frame, the role is
  set by hand to a Wood-predominant composition before the
  same turn: the reply is byte-identical to the first
  session's, and the trace's role renders the set
  composition — the slot is present, shown, and inert.
- **C.** Opened with frame input `{ hour: 3 }` (no month).
  Expectations: the daypart is night, classified as in A;
  the season is absent, with the reason recorded (no month
  supplied). The trace carries the frame in that shape.
- **D.** Opened with no frame input. Expectations:
  `session.frame` is absent and no trace carries a frame;
  the role is present and neutral. All behaviour is the
  pre-R6 build's.

## 7. Non-regression and surface discipline

- Initiative must NOT fire inside any prior transcript set
  (T-R1 through T-R5), the four scripted scenarios, or the
  standing suite's conversations. Their sessions are short
  or busy — questions, corrections, declines, question-
  ending replies — and any firing there is a finding to
  report, not a pin to move.
- The leak scan runs over every reply in every scenario
  above, appended moves included; no reply names the
  ontology, the initiative machinery or the frame.
- Foundation files (`src/seed.ts`, `src/graph.ts`,
  `src/engine.ts`, `src/propagate.ts`, `src/wordnet.ts`)
  and `src/ansci/pricing.ts` are byte-identical after the
  build; the classification table is read, never edited.
