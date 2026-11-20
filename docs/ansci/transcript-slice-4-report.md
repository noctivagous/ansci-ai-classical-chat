# Transcript Slice 4 — Where-Split — report (2026-11-19)

Slice 4 of the transcript fix programme commissioned from the
2026-11-19 diagnostic probe: the where-split (the probe
report's fix-programme item 4). **Build-order numbering:** the
programme's slices are numbered in build order — Slice 0
(entity grounding, commit 7347710), Slice 1 (clausal
complement, commit a92762f), Slice 2 (know-question routing,
commit 4136866), Slice 3 (your-NP matter fix, commit 2cbfe3c),
and this slice, built fifth. The Wikidata intake the probe
report's erratum schedules is a later slice in the same
programme and is **on hold by owner ruling**; nothing in this
slice touches it, and world-location is built at gloss/type
level from Slice 0's grounding only.

The diagnosis (SD2, with K1 as corrected): the where-questions
had no self/world routing, and self-location had no home.
SemanticAssessment's self-query recognition required a
`predicated-as` edge with a who/what question word, so a
where-question (a `location` relation) was never recognised
as self-directed; the Awareness frame (`FrameInput` /
`FrameRecord`, session.ts) holds month/day/hour, season and
daypart — no place field exists at all; and the two decline
texts the probes met split by an accidental nameable-subject
check in the fallthrough, not by self vs world. On Slice 3's
tree the four Group B probes stood: 11 "where is oklahoma?"
declined naming what Slice 0's grounding holds; 12 "where are
you?", 13 "where am i?" and 15 "where is a dog?" all drew the
question-shape decline ("this question shape is not one the
net can answer yet"). Built in the worktree
`~/workspace/ansci-track-transcript` (branch
`track/transcript-fixes`, on Slice 3's 2cbfe3c). Local commit;
push waits for the owner's word.

## The parse shape the split reads

All four probes draw ONE shape in the parse, verified on this
tree: the "where" question word is the root (role `location`,
questionWord), and the subject stands to it in a single
`location` edge (subject —[location]→ where), with
`parsed.query = {relation: "location", expectedType:
"location"}`. The subject alone decides whose location is
asked after, and the slice is the split by that subject. The
verb-carried where-forms are not this shape and keep their
owners: "where do you live?" roots on 'live' (the C3 self-fact
family, matter "home" — "I don't have a home."), "where were
you born?" on 'bear' (matter "birthplace"); both are pinned
unchanged in the slice's tests.

## What was built

**The split in assessment (`src/ansci/assess.ts`).** Beside the
existing self-query recognition, assessment now reads the
where shape: the location edge's source node is the question's
subject. Subject "you" files a self-query of a new flavour,
**"location"** (the `selfQuery` union in
`src/ansci/semantic-object.ts` gains the member, documented
there); subject "i" marks the act `visitorLocation`; any other
subject leaves the act a plain question for the turn layer's
world reader. One refinement the parse forced: a trailing time
word is mis-headed by the sentence layer as the subject, the
real subject standing as its qualifier ("where are you now?" —
now:subject, 'you' qualifying it). The time word is the
question's frame, not the located thing — the same reading the
wellbeing recognition already gives a time word in the patient
slot — so the split reads the subject through the qualifier
when the drawn subject is a time word carrying one. "Where are
you now?" routes as self-location; "where is the dog now?" as
the dog's world question.

**Self location: a Place table (`src/ansci/place.ts`, new), and
the design choice.** Self-location's fact now lives where the
Self tables live: a Place table alongside Identity and
Capabilities — deployment configuration, requested through the
Social Unit's one address (`requestPlace`, social.ts, beside
`requestIdentity` / `requestCapabilities`). The turn layer's
self-query branch gains a "location" arm that composes from
exactly what that request returns.

*The choice and its grounds.* The scope offered two honest
forms: answer from a configured Place fact, or decline naming
self-location as the gap. Which one the code supports is
decided by what the configuration honestly holds, and the
finding is that **no place is configured**: the Place table
stands with `place: null`. The grounds, from the frame/session
design: (1) the system's situation record is a *time* record
by type — the frame is built from a shell-supplied hour (and
month/day) and holds season and daypart; no shell supplies a
place and the type has no field for one, so there is no
session-side source a place could honestly come from;
(2) place, unlike the frame's time, does not vary by session —
it is a property of the deployment, which is the Self tables'
standing (Identity and Capabilities are likewise constant
across sessions), so the table, not the frame, is its home;
(3) inventing a place (a city, "the internet") would assert a
fact nothing holds. So the shipped behaviour is the second
form: a decline that names self-location as the gap, composed
from the table's standing. A deployment that does run
somewhere nameable sets the place in the table, as data, and
the same arm answers with it ("I am in ⟨place⟩." — that arm is
built and is exercised only through the table, never reached
while the table stands unconfigured). The frame was NOT
extended with a place field: that would create a second,
per-session home for a deployment fact, empty in every session
any shell currently opens. Recorded here as the slice's design
decision, owner's to revisit with the wording.

**Visitor location (`src/ansci/turn.ts`).** The
`visitorLocation` act gets its own branch, beside the other
act branches: the system has no way of knowing where the
visitor is — no register holds it and nothing perceives it —
with the one honest exception the scope names: where the
conversation itself established it, the record answers. The
record leg is narrow by construction: a recorded event with
the visitor as agent (the record's holder for the speaker is
"you"), a location fill, and the residence verb 'live' —
"i live in paris." stands in the event record as
`{verb: live, agent: you, location: paris}`, and "where am i?"
after it answers from that event, cited on the trace as a
record answer (`recordAnswer.source: "event"`). Any other
telling ("i went to paris.") establishes where the visitor
went, not where they are, and does not feed the leg. In a
fresh session the branch declines, naming the visitor's
location as the gap.

**World location (`src/ansci/turn.ts`, `answerWhereQuestion`).**
A reader in the interrogative chain, after the X4 self-fact
reader and before the missing-role machinery, keyed on the
copular where shape (root the "where" question word, a
location edge into it) and standing down for the "you"/"i"
subjects by construction. A grounded entity subject is
answered from Slice 0's entity record at the level the
grounding supports: the gloss, spoken as the answer, with the
synset and its wordnet-retrieved provenance cited in the trace
(`trace.entityAnswer`, the same field the what-is entity
answer files, its ground reworded for the where-question).
For Oklahoma the gloss IS a location-bearing answer at coarse
level — "a state in south central United States" states where
it is, at the only level held. Nothing richer is fetched or
invented: no coordinates, no containment chain — the intake
that would hold more is the held Wikidata slice. Any other
subject — a kind ("a dog": held by its classification, which
carries no whereabouts), an ungrounded name ("atlantis":
nothing held at all) — declines located at the subject the
question itself names, the decline reason distinguishing the
two standings.

**The shipped wording — MINIMAL / DRAFT, flagged.** Three
sentences ship with this slice:

> Self location: "I don't have a place: nothing in my situation record says where I am."
> Visitor location: "I have no way of knowing where you are."
> Visitor location, from the record: "You told me you live in Paris." (composed from the recorded event)

and the world decline: "I can't answer that from what I know:
nothing in what I know says where ⟨subject⟩ is." These are the
minimal truthful forms the mechanisms need. **The exact
visitor-facing wording is the owner's** — place.ts's header
records, as identity.ts's does for its table, that the final
text of any visitor-facing claim about the system is his; the
sentences are draft in exactly that sense, shipped so the
mechanisms are complete and truthful, and flagged here and in
the code comments for him to settle or replace.

**Registry / GAPS.** Following slices 0–3, the system-map
registry (`ai-system/`) and `GAPS.md` are left unchanged by
this slice: `ai:check` passes on the unchanged map (89 nodes),
and the Place table files under the existing Awareness Self
home exactly as identity.ts and capabilities.ts do — neither
carries a map node of its own.

**One prior acceptance test superseded.**
`test/ansci-entities.test.ts` pinned Slice 0's probe-11
behaviour — the where-question declining past what is held —
which this slice's commission expressly replaces (the held
gloss answers instead of declining). That test is updated to
pin the new behaviour, with the supersession recorded in its
comment; Slice 2 set the precedent (its commit revised Slice
1's pins the same way). The fallthrough decline the old test
exercised still stands for the shapes that reach it — probe 7
("do you know where oklahoma is?") keeps that exact reply,
pinned in this slice's control set.

## Acceptance (probe harness pattern, fresh store-less sessions, this tree's dist)

Verbatim replies, one pass over the diagnostic probe set:

| # | Input | Reply |
|---|---|---|
| 11 | where is oklahoma? | "Oklahoma is a state in south central United States." |
| 12 | where are you? | "I don't have a place: nothing in my situation record says where I am." |
| 13 | where am i? | "I have no way of knowing where you are." |
| 15 | where is a dog? | "I can't answer that from what I know: nothing in what I know says where a dog is." |

Probe 11 carries no decline: `trace.entityAnswer` files
subject "oklahoma", synset `wn-n09295833`, classes
["American state"], and a ground naming the provenance
("ingested into the graph with provenance
wordnet-retrieved"); the walk runs
`… → session-and-situation → reasoning/derivation →
ontology-core/ontology-knowledge-unit/correspondence-graph →
verbalizer`, as the what-is entity answer's does. Probe 12's
act files `kind: "self-query", selfQuery: "location"`, and its
decline reason reads "the question asks where the system is,
and no place is held for it: Awareness Self's Place table
stands unconfigured and the situation record (the Awareness
frame) holds time only — the gap is self-location, located at
the system itself (§6)". Probe 13's act files
`visitorLocation: true`, and its decline reason names "the
visitor's location, located at the visitor (§6)". The
question-shape decline text appears in **none** of the four
turns — nor anywhere in the 20-probe run.

The established-visitor case, verbatim from a two-turn run on
this tree: "i live in paris." → "Ok."; then "where am i?" →
"You told me you live in Paris.", answered from the record
(`recordAnswer` files the 'live' event of turn 1, location
'paris').

Generality and controls, verbatim from the same runs:

| Input | Reply |
|---|---|
| where is paris? | "Paris is the capital and largest city of France; and international center of culture and commerce." (grounded gloss, as held) |
| where is france? | "France is a republic in western Europe; the largest country wholly in Europe." |
| where is atlantis? | "I can't answer that from what I know: nothing in what I know says where atlantis is." (ungrounded — Slice 0's honest edge) |
| where are you now? | the self-location decline, as probe 12 (time-frame reading) |
| where is the dog now? | "…nothing in what I know says where the dog is." |
| where do you live? | "I don't have a home." (C3 shape, unchanged) |
| where were you born? | "I don't have a birthplace." (C3 shape, unchanged) |
| do you know where oklahoma is? | "I can't answer that from what I know: I have oklahoma as a state in south central United States, but nothing in what I know answers that." (Slice 2's routing, unchanged) |
| what is oklahoma? (probe 14) | "Oklahoma is a state in south central United States." (unchanged) |
| what can you do? (probe 5) | the capabilities presentation (unchanged) |
| who are you? (probe 6) | the identity text (unchanged) |
| how are you? (probe 20) | "I am fine." (unchanged) |

The full 20-probe run reproduces every Slice 0–3 acceptance
reply verbatim (probes 1–10, 14, 16–20 as on Slice 3's tree).
The acceptance also lives in the suite:
`test/ansci-transcript-slice4.test.ts` (10 tests: the Place
table's standing configuration, probes 11/12/13/15 with their
act filings and trace fields asserted, the established-visitor
record answer, the world path's generality in both directions,
the time-frame forms, the verb-carried controls, and the
probe 5/6/14/20 + know-where control set).

## Gates (delivered runs, this tree, after the final fix)

- Suite: **1100 pass, 0 fail** (ℹ tests 1103, ℹ skipped 3) —
  Slice 3's delivered run was 1090 pass / 0 fail (ℹ tests
  1093, ℹ skipped 3); the difference is this slice's 10 new
  tests, and nothing else moved. (One run on the way here
  failed exactly one test — Slice 0's probe-11 pin, superseded
  as recorded above — and the fresh complete run after its
  update is the figure quoted.)
- Demo **29/29** (27 exact round-trips); holdout **80/80
  parsed** ON (OFF 54/80), flipped fail→success 26, **0 parse
  regressions, 0 round-trip regressions**.
- Sense sets **A 11/11 · B 5/6** — unchanged.
- `npm run ai:check` OK (89 nodes, 22 cords, layout covers
  89 nodes).

All figures identical to Slice 3's delivered gates except the
suite count, which grew by exactly this slice's tests.

## What this does not show

The world path answers a where-question with the entity's
gloss for EVERY grounded entity, not only place entities:
for a person ("where is einstein?") the gloss is a biography
line, not a location — it is still the whole of what the
grounding holds, spoken at its level; the trace's ground
says exactly that and no more, so the roughness stands only
in the reply itself, which answers a where-question with a
what-fact. Restricting the answer to
place entities was considered and measured against Slice 0's
own type payload, and rejected on the measurement: the
obvious discriminator — the entity's type chain passing a
synset named "location", as Oklahoma's does (… → region →
location → …) — fails on genuine places whose chains climb
otherwise (Africa: continent → landmass → land → object;
Pacific Ocean and the Mississippi River: via "body of
water"; Greenland: via "land"), so a chain-restricted reader
would falsely decline "where is africa?" while answering
"where is oklahoma?". No cleaner place test exists in the
held data — that is precisely the richer place knowledge the
held Wikidata slice would bank — so the slice answers at
gloss level generally and records the non-place case here as
the known roughness, owner's to direct a later refinement
when the place data lands. The visitor record leg reads only the
residence verb's events: "i am in paris." — the copular form
— records no event or state the leg can read (verified on
this tree: the turn acknowledges and files nothing), so a
visitor who states their location that way still meets the
no-way-of-knowing decline; widening the record's capture of
copular location statements is a recording matter, not a
where-routing one, and is recorded here as this slice's edge.
Scene-placed where-questions ("where is the dog?" with a dog
placed in the running scene) are not answered from the scene:
the diagnostic left that case untested and this slice claims
no scene answerer — the decline names the classification's
lack of a whereabouts, which is true of the kind, and a
placed instance would need its own reader. The configured-
place arm of the Place table is unexercised by any run (the
table stands unconfigured; the arm is reached only through
the table's data). The shipped wordings are minimal draft, as
flagged. Nobody independent has checked any of this; it is
one build, one gate pass, on one commit.
