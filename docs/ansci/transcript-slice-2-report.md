# Transcript Slice 2 — Know-Question Routing — report (2026-11-19)

Slice 2 of the transcript fix programme commissioned from the
2026-11-19 diagnostic probe: the know-question routing slice.
**Build-order numbering:** the programme's slices are numbered
in build order — Slice 0 (entity grounding, commit 7347710),
Slice 1 (clausal complement, commit a92762f), and this slice,
the programme's item 2 (route the parsed know-questions),
built third. The Wikidata intake the probe report's erratum
schedules is a later slice in the same programme and is **on
hold by owner ruling**; nothing in this slice touches it.

The diagnosis (IM4, with K3 as its filing error): there was
no who-am-i path. "who am i?" parsed 'who' as the clause
root/predicate and declined at the graph ("nothing on i in
my notes"); "do you know my name?" declined as graph
knowledge ("nothing on name in what I know"). The
Interlocutor register — the one place a visitor identity
lives — was consulted for greetings and recognition but
never for an identity question. Visitor identity is session
fact, not graph knowledge, and was filed as the latter.
Slice 1 then made the embedded forms parse, and two of them
completed through a self path that did not address what was
asked: "do you know who i am?" and "do you know what a dog
is?" were both answered with the system's own identity text.
Built in the worktree `~/workspace/ansci-track-transcript`
(branch `track/transcript-fixes`, on Slice 1's a92762f).
Local commit; push waits for the owner's word.

## What was built

**The recognition fix (`src/ansci/assess.ts`).** The self
path's cause sat in SemanticAssessment's self-query
recognition, not in the turn layer: `isSelfQuery` required
only *some* predicated-as edge anywhere in the graph, a
"you" node anywhere, and a who/what question word anywhere.
In "do you know who i am?" the predication is the visitor's
(i → who), one clause down inside Slice 1's complement, and
"you" is only the matrix verb's agent — three unrelated
nodes satisfied the three unrelated checks. The recognition
now requires the predication to be *of* the system: a
predicated-as edge running from the "you" node to the
who/what question word. "who are you?" and "what are you?"
keep the identity answer (their predication genuinely is of
"you"), and so does "do you know who you are?" — the
embedded predication there is of the system, and the
identity text is a true answer to it. Every other embedded
form is released to the routing below.

**The register readers (`src/ansci/turn.ts`).** Two sites,
both reading the Interlocutor register through the session,
following the register/reader conventions the X4 family
established (the Social Unit requests facts and holds no
copy of its own; the register is the answer's source, cited
on the trace as `recordAnswer` with the told-at provenance):

- *In `answerPredicateQuestion`*, beside the X4 name-value
  reader: the predicated-as shape with subject "i" and
  predicate "who" — "who am i?" — is answered from the
  register: the stated name predicated of the visitor
  ("You are Sam."), or the honest not-told ("You have not
  told me who you are."). The graph decline it replaces
  named 'i' as a notes gap; the register's absence is a
  different, located fact, and the reply says which.
- *A new reader, `answerKnowQuestion`*, called in the
  interrogative path alongside the X4 self-fact readers,
  before the missing-role and fallthrough declines. Narrow
  by construction — root 'know', agent 'you' — and routed
  by what the question asks after:
  - *My name* (theme 'name' under the visitor's possessive):
    the register answers in the X4 name-remembrance reader's
    own forms — "Yes. Your name is Sam." where a name was
    learned, "No. You have not told me your name." where
    none was. The two readers now agree because they read
    the same register.
  - *Who the visitor is* (complement predicating 'who' of
    'i'): the register answers — "Yes. You are Sam." / "No.
    You have not told me who you are."
  - *What a thing is* (complement predicating 'what' of a
    thing subject): answered about the subject from what
    the system holds — a grounded entity's record, on
    Slice 0's grounding ("Yes. Oklahoma is a state in south
    central United States.", the synset cited on the trace
    as `entityAnswer`) — or declined **located at the
    subject**, naming it as the gap, in the fallthrough
    decline's convention ("nothing in what I know says what
    a dog is", decline ground located at 'dog'). A pronoun
    subject stands the branch down: persons are the
    register's and the ordinary paths' matter, not a thing's
    definition.

Everything else stands down deliberately. The NP-theme
forms already decline located at their theme through the
fallthrough ("do you know dogs?", "do you know the
answer?"), an entity theme naming what is held ("do you
know oklahoma?"); the where-complements likewise decline
located at their subject, naming the held gloss (probe 7).
No reply in either family changed.

**The name the register learns from.** The two-turn check
uses the system's established self-naming form, read from
the Social Unit's S6 machinery (`statedName`, social.ts):
a predicated-as from the speaker — or from the name-noun
under the speaker's possessive — to a capitalised form the
classification table does not know as a common concept.
"my name is Sam." is learned ('Sam', stated, with the
receipt "Ok. Noted, Sam."); the lowercase "my name is sam."
is not, by that standing rule, and the register answers for
it remain the not-told forms — verified below, stated here
so the rule is visible rather than discovered.

## The flagged non-decision: "what do you know?"

What "what do you know?" should answer — a capabilities
presentation, the conversation record, or both — is an
**owner's design call, flagged in the diagnostic report and
still undecided**. This slice deliberately leaves that
turn's behaviour exactly as Slice 1 left it. It is not the
new reader's shape (its theme is the question word itself,
which no branch touches), and its reply was verified
unchanged, verbatim, before and after: "I can't answer that
from what I know: nothing you have told me says what was
known." (the missing-role decline, ground: the theme of
'know'). Probe 10 ("what do you know about dogs?", IM3's
about-phrase) rides on the same undecided question and is
likewise unchanged.

## Acceptance (probe harness pattern, fresh store-less sessions, this tree's dist)

Verbatim replies, one pass:

| Input | Reply |
|---|---|
| who am i? | "You have not told me who you are." |
| do you know my name? | "No. You have not told me your name." |
| do you know who i am? | "No. You have not told me who you are." |
| do you know what a dog is? | "I can't answer that from what I know: nothing in what I know says what a dog is." |
| do you know what oklahoma is? | "Yes. Oklahoma is a state in south central United States." |
| do you know what a cat is? | "I can't answer that from what I know: nothing in what I know says what a cat is." |
| what do you know? | "I can't answer that from what I know: nothing you have told me says what was known." (unchanged from Slice 1 head) |

The two-turn check (one session, in order):

| Turn | Input | Reply |
|---|---|---|
| 1 | my name is Sam. | "Ok. Noted, Sam." |
| 2 | who am i? | "You are Sam." |
| 3 | do you know my name? | "Yes. Your name is Sam." |
| 4 | do you know who i am? | "Yes. You are Sam." |
| 5 | what is my name? | "Your name is Sam." (the X4 reader, unchanged) |

Controls unchanged, verbatim: probe 5 ("what can you do?"
— the capabilities presentation), probe 6 ("who are you?"
— the identity text), probe 7 ("do you know where oklahoma
is?" — the located entity decline), probe 20 ("how are
you?" — "I am fine."), and the Slice 1 acceptance set apart
from the three replies this slice was commissioned to
re-route (probes 1, 8 and "do you know my name?" — Slice 1's
test pins for those three were updated to the routed
replies, its parse pins untouched). No acceptance probe
stops at `lpu/parser`, and none of the register answers
carries a decline: the walk for probes 1, 3 and 4 now runs
session-and-situation → verbalizer on a `recordAnswer`
grounded in the register, where probe 3's walk formerly
ended at the correspondence graph and probe 4's at a
knowledge decline located at 'name'.

The same turns are pinned in
`test/ansci-transcript-slice2.test.ts` (10 tests: the three
register answers fresh, the learned-name sequence across
all three identity forms, the located decline at 'dog', the
entity answer, the unheld-subject decline, the assessment
tightening in both directions, probe 2's standing reply,
and the control set), so the acceptance lives in the suite,
not only in this run.

## Gates (delivered runs, this tree, after the final fix)

- Suite: **1083 pass, 0 fail** (ℹ tests 1086, ℹ skipped 3) —
  Slice 1's delivered run was 1073 pass / 0 fail (ℹ tests
  1076, ℹ skipped 3); the difference is this slice's 10 new
  tests, and nothing else moved.
- Demo **29/29** (27 exact round-trips); holdout **80/80
  parsed** ON (OFF 54/80), flipped fail→success 26, **0 parse
  regressions, 0 round-trip regressions**.
- Sense sets **A 11/11 · B 5/6** — unchanged.
- `npm run ai:check` OK (89 nodes, 22 cords, layout covers
  89 nodes).

All figures identical to Slice 1's delivered gates except
the suite count, which grew by exactly this slice's tests.

## What this does not show

The routing answers the identity and name questions from
the register and the embedded what-is questions from what
the system holds or a decline located at their subject; it
does not widen what the system knows. "do you know what a
dog is?" declines because the direct question declines too
— the system holds correspondences for 'dog' but no
definition, and the decline now names that gap at 'dog'
instead of answering a different question. Pronoun-subject
complements the register does not own — "do you know what
i am?" (what-kind, not who), "do you know who she is?" —
stand down from the new reader and keep the question-shape
decline they had once the self-query misreading is removed;
they are recorded here as the routing's present edge, not
papered over. The register's contents remain exactly what
S6 learns: a stated name, nothing inferred — a visitor who
never states one is answered as not-told on every form, and
a name stated in lowercase is not learned, by the standing
capitalisation rule above. "what do you know?" stands
undecided, as recorded. Nobody independent has checked any
of this; it is one build, one gate pass, on one commit.
