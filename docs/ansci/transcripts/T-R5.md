# T-R5 — fresh transcript scenarios for slice R5 (FROZEN)

Authored 2026-11-16, BEFORE the R5 build (cohesion as
construction rules, echo generalised, correction wired to
supersession — `src/ansci/plan.ts`, `src/ansci/generate.ts`,
`src/ansci/turn.ts`, `src/ansci/session.ts`), per §10's rule: a
slice's transcript scenarios are authored before the slice's
code first runs against them and are frozen once written.
Failures against these expectations are findings, to be
recorded in `T-R5-results.md` — this file is not edited to
fit the build's behaviour.

R5 is §8.7's S3 (cohesion), S4 (output reference), S12
(output repair) and S14 (echo) as construction rules over the
reply graph, inside §9.4.4's record: a connective is realised
only when its relation exists between the reply graph and the
session record; a correction replaces a session state and the
acknowledgement's content is the recorded delta; the reply
graph reuses the person's own nodes where the derivation
permits. Everything in this slice is disposition-neutral:
the neutral composition is in force throughout, and no bias
channel is extended.

## 0. What the parser actually gives (the investigation)

The correction scenario's sentences are decided by what the
parser honestly produces, probed against the shipped parser
before this file was written:

- "The soup is hot." — a clean predicate clause: subject
  node (soup, det "the"), predicate root (hot), indicative.
- "The soup is not hot." / "I am not furious." — the same
  shape with the negation ON the root: `states.negated`,
  with the negation record (negator, carrier). A negated
  state is represented as the same predication under a
  negated flag — there is no separate "negative state" node.
- "No, the soup is hot." — NOT supported: the parser takes
  "no" as the subject and drops "the soup" entirely; the
  recorded state is held by "no". "Actually, the soup is
  hot." fails the same way ("Actually" becomes the subject).
  "No, I was calm." parses "calm" as a verb with "no" as its
  patient. "I meant the red one." parses as an ordinary verb
  clause (mean, patient "red"/"one") with no correction
  content the record can use. **Sentence-initial correction
  markers are therefore out of scope for this slice**: the
  correction shapes the parser supports are the plain
  restatement (§5, §6 below) and the negation (§6). The
  prefixed forms are recorded here as a parser limitation,
  not silently absorbed.
- One recording gap the build must close first: the
  predicate-state recording site drops the parsed negation
  (the verb-state site already records it). Without it, a
  negated predicate state stands in the record as its
  positive — "I am not furious." currently records a second
  positive furious state. The polarity half of the trigger
  rule (§7) has nothing to read until that is fixed.

## 1. The cohesion mapping (data) and its sites

The relation → marker mapping is one data table:

| relation (reply graph ↔ session record) | marker | surface |
|---|---|---|
| continuation — a shared topic entity, active last turn | "and" | (see scoping) |
| consequence — a derivation from a prior state | "so" | (see scoping) |
| contrast — the reply's content controls a standing state | "but" | sentence-initial "But …" |
| return — a reactivated topic | "as for" | fronted "As for <the person's NP>, …", the clause's subject pronominalised |

Detection runs at the planner's predication sites (the
question site's single predication and the composition's
lead predication), reading a snapshot of the topic records
taken BEFORE the turn's own recording (the turn itself
touches the topic it reactivates) and the standing states
(turn < current). The checks, exactly:

- **return**: the reply subject's topic record (snapshot)
  has `raisedTurn < turn` and `lastTouchedTurn ≤ turn − 3` —
  raised earlier and untouched for at least two full
  intervening turns.
- **contrast**: the reply quality's classification element
  CONTROLS the element of a standing state from an earlier
  turn, excluding this turn's own recording and excluding
  the same predication of the same holder (asking after a
  state that stands is not a contrast with it).
- Precedence when both hold (data): **return before
  contrast**. One marker per reply graph.
- Every realised marker is recorded in the turn's trace
  with the relation and its ground (the turns, the states,
  the elements — trace text is architecture and may name
  them). The serialised reply graph carries the marker on
  its 'links' edge.

**Scoping, recorded before the build.** Continuation and
consequence are in the mapping and their relations are
defined, but they are NOT realised on the surface in this
slice, for stated reasons. Continuation is the default
condition of the question sites — the asked subject is
normally the active topic — so realising it would put an
"And" in front of every continuing answer: a connective
tic, not cohesion. Consequence has no site: no planner
derivation in the current wiring starts from a prior state
(the steering derivations that do are probe-worded, R1's
recorded scope). The generator's realisation is extended
for the markers this slice earns (return, contrast); the
other two rows stand as the design's mapping, unrealised
until a site earns them. Markers ride planner-built graphs
only — where the planner cannot speak and a probe rendering
stands, no marker is attached.

## 2. Scenario R5-1 — return, with its negative control

One session; turns:

1. "The soup is cold."
2. "I was furious."
3. "I shouted at him."
4. "Is the soup cold?"

Facts: the soup topic is raised at turn 1 (the statement's
subject). Turns 2–3 raise and vent the anger state; neither
touches the soup topic. At turn 4 the snapshot shows the
soup topic raised at 1, last touched at 1 — untouched for
two full intervening turns — and the person's question
reactivates it.

Expectations:

- Turn 4's reply is the planner's predication (soup → cold,
  priced qualified as in T-R4-1) carrying the return marker:
  it begins "As for the soup, " and predicates with the
  subject pronominalised — "As for the soup, it may be
  cold." The trace records the cohesion (relation "return",
  marker "as for", the ground naming the topic's raised and
  last-touched turns), and the serialised reply graph
  carries a 'links' edge marked "as for" from the subject
  node to the predicate root.
- Turns 1–3 are unchanged from the pre-R5 build (statement
  and steering turns carry no planner graph to mark).

Negative control (R5-1b), a separate session:

1. "The soup is cold."
2. "Is the soup cold?"

The soup topic was touched at turn 1 — the immediately
preceding turn — so no reactivation exists. Turn 2's reply
is the bare predication "The soup may be cold.", the trace
carries NO cohesion record, and the reply graph carries no
'links' marker edge. (The contrast check also cannot fire:
the only standing state is the same predication of the same
holder, which the rule excludes.)

## 3. Scenario R5-2 — contrast, with its negative control

One session; turns:

1. "The soup is hot."
2. "Is the soup cold?"

Facts: turn 1 records the standing state soup/hot (its
classification's element is Fire). Turn 2's reply predicates
cold of the soup; cold's classification element is Water,
and Water CONTROLS Fire — the reply's content stands in a
controlling relation to a standing state. The soup topic
was touched at turn 1, so no return competes.

Expectations:

- Turn 2's reply carries the contrast marker, sentence-
  initial: "But the soup may be cold." The trace records
  the cohesion (relation "contrast", marker "but", the
  ground naming the standing hot state and the controlling
  relation), and the reply graph carries the 'links' edge
  marked "but".
- Turn 1 is unchanged from the pre-R5 build.

Negative control: R5-1b is the control — the same reply
content ("The soup may be cold.") with no controlling
relation in the record carries no marker. A marker on the
control turn, or none here, is a slice failure.

## 4. Scenario R5-3 — echo as graph facts

Echo expectations are stated as facts about the reply
graph's nodes (provenance visible in the serialised graph
the trace carries), not as wording. R1 built the predication
sites' subject reuse and R3 the gap question's filled-role
reuse; this slice pins the standing sites and extends reuse
to its two new constructions (the fronted topic phrase, the
correction graph).

One session; turns:

1. "I made the soup yesterday."
2. "Is the soup cold?"

Expectations:

- Turn 2's serialised reply graph: the subject node is the
  person's own node material — lemma "soup", form "soup",
  det "the" — not a bare lemma node. (The derivation permits
  the reuse: the reply predicates over the very entity the
  person named, in the form they named it.)
- In R5-1 turn 4, the fronted phrase realises that same
  material: "As for the soup, …" — the determiner is the
  person's, from their parse.
- In R5-4 turn 2 (§5), the correction graph's subject node
  likewise carries the person's material (form "soup",
  det "the") from the correction turn's own parse.

## 5. Scenario R5-4 — correction by restatement (value)

One session; turns:

1. "The soup is cold."
2. "The soup is hot."
3. "The soup is cool."

Facts: cold and hot are both classified under the aspect
label "temperature", with different elements (Water, Fire).
Cool is also "temperature" (Water). The trigger rule is §7.

Expectations:

- Turn 1: the state soup/cold stands. No supersession.
- Turn 2: the VALUE rule fires. The session records exactly
  one supersession delta: replaced soup/cold (turn 1),
  replacing soup/hot (turn 2). The standing states hold hot
  and no cold for the soup. The reply is generated from a
  graph built from the delta: the replaced state struck
  under negation, the replacing state predicated, the two
  joined by a 'links' edge marked "but" — "The soup is not
  cold, but it is hot." The trace carries the correction
  record (both states, the rule, the aspect-slot ground)
  and the serialised delta graph.
- Turn 3: the rule fires again, and the state it supersedes
  is HOT — the corrected state is the one standing to be
  corrected: delta replaced soup/hot (turn 2), replacing
  soup/cool (turn 3); reply "The soup is not hot, but it is
  cool." After turn 3 the soup's only standing state is
  cool; cold appears nowhere in the standing set. This is
  the later-turn demonstration: steering and any further
  correction read the record post-supersession.
- The correction replies preempt steering on their turns
  (as the clarification preempts in R3): no cycle path is
  claimed for turns 2–3.

Never-stated control (R5-4b), a fresh session:

1. "The soup is hot."

No standing state matches, so: no supersession is recorded
(`supersessions` stays empty), no correction record appears
in the trace, and the state is recorded as a new state,
handled by the ordinary steering that follows a fresh state.
A delta here is a slice failure — a supersession of nothing
is not an event (§9.4.4).

## 6. Scenario R5-5 — correction by negation (polarity)

One session; turns:

1. "I was furious."
2. "I am not furious."
3. "I shouted at him."

Facts: turn 2's parse carries the negation on the root
(§0). The standing state and the new state share holder
(you) and lemma (furious) and differ only in the negated
flag — the POLARITY rule (§7).

Expectations:

- Turn 2: exactly one supersession delta, recorded through
  `supersedeState`: replaced you/furious (not negated,
  turn 1), replacing you/furious (negated, turn 2). The
  reply is the delta graph for a polarity correction: the
  struck form and the replacing form coincide (the same
  lemma under negation), so the graph is the single
  predication of the corrected state — "You are not
  furious." The trace carries the correction record (rule
  "polarity", both states with their negated flags).
- Turn 3: the venting steering must NOT take the corrected
  state as the state vented. The replaced positive state no
  longer stands — it is not in the record at all — and the
  replacing state is a negation, which is not a state an
  event vents. Expectation, at the trace level: no venting
  cycle path is claimed for turn 3, and the trace names the
  skip (the standing state is the negated 'not furious';
  it was passed over, and why). The record still holds
  exactly the one negated furious state.

Never-stated control (R5-5b), a fresh session:

1. "I am not furious."

No standing furious state exists: no supersession, no
correction record; the negated state is recorded as a new
state. (What the ordinary steering then says is pre-existing
behaviour, not pinned here; the pinned facts are the record
and the absence of a delta.)

## 7. The trigger rule, stated exactly

A statement turn — indicative mood; a question turn never
triggers, though it records its state as before — that
records a state S for holder H supersedes a standing state
(a state already in the record with turn < S.turn and the
same holder) when either:

- **POLARITY**: a standing state has S's lemma and the
  opposite negated flag (an absent flag counts as false).
  The most recent such state is the one replaced; the delta
  is recorded by `supersedeState` (session.ts), or by
  exact-record removal in the same module when an earlier
  duplicate of the same (holder, lemma) stands in front of
  the matched state, so the delta names the state actually
  replaced.
- **VALUE**: a standing state has a different lemma, a
  different element, and a classification whose aspect label
  equals the aspect label of S's classification — both
  states classified, the aspect read from the same lookup
  that classified them when they were recorded. The most
  recent such state is the one replaced.

Otherwise — the same lemma at the same polarity, a different
aspect, the same element, an unclassified state on either
side of the value rule — the new state records alongside the
standing ones, exactly as before this slice. When a delta is
recorded, the turn's reply is the correction reply (§5/§6)
and steering does not also run for that turn.

The acknowledgement's construction, also stated exactly:
the reply graph is built in the planner from the delta
record and the person's own subject material — one
predication striking the replaced state (its lemma under
negation) and one predicating the replacing state (its
lemma, its negated flag), joined by a 'links' edge marked
"but"; when the two predications coincide (the polarity
case), the graph is the single replacing predication. No
field of the acknowledgement comes from anywhere but the
delta record and that subject material. At the correction
sites the parser supports, no derivation backs the corrected
state (soup → hot has no path in the net; a person's states
have no holder derivation), so the predication is the
record's own, unpriced — the priced, derivation-backed
variant is not built, and that scoping is recorded here
rather than discovered later.

## 8. Non-regression and the one anticipated change

The four scripted scenarios, T-R1–T-R4 and the standing
suite hold except where a relation genuinely exists. One
change is anticipated by the rules above and named here in
advance: in T-R2's question sequence ("Is winter cold?",
"Is summer hot?", "Is autumn dark?", "Why is winter
cold?"), the final turn reactivates the winter topic after
two full intervening turns, so its generated reply gains
the return marker ("As for winter, …"). Any other changed
reply in the earlier sets is reported in T-R5-results.md
with its earning relation named — or, if no relation earns
it, as a failure. A marker appearing where its relation
does not exist is a failure, not a change.

Surface discipline: the leak scan runs over every reply in
every scenario above, controls included; no reply names the
ontology, the cohesion machinery or the disposition.
