# Transcript Slice 5 — Premise-Checking / Self Tables — report (2026-11-19)

Slice 5 of the transcript fix programme commissioned from
the 2026-11-19 diagnostic probe: premise checking against
the Self tables (the probe report's fix-programme item 5).
**Build-order numbering:** the programme's slices are
numbered in build order — Slice 0 (entity grounding,
commit 7347710), Slice 1 (clausal complement, commit
a92762f), Slice 2 (know-question routing, commit 4136866),
Slice 3 (your-NP matter fix, commit 2cbfe3c), Slice 4
(where-split, commit f1b2d82), and this slice, built sixth.
The Wikidata intake the probe report's erratum schedules
is a later slice in the same programme and is **on hold by
owner ruling**; nothing in this slice touches it.

The diagnosis (SD3, second half): the one assertion-stance
mechanism (C7, turn.ts) fires only when Coherence's
`premiseDegree` (coherence.ts) returns a contradiction
sourced from the GRAPH, with an established quality.
`premiseDegree` reads session states and the ontology
graph; it never consults the Self tables (identity.ts,
capabilities.ts), where the system's own name/facts live.
Probe 19 — "your last name is smith." — drew the bare
acknowledgement "Ok. Noted.", no stance, and the false
state `{holder: "your", lemma: "smith"}` stood banked in
the record afterwards (verified in the diagnostic's
supplementary check S-B). Later self-answers were
unaffected only because they read the tables, not the
states. Built in the worktree
`~/workspace/ansci-track-transcript` (branch
`track/transcript-fixes`, on Slice 4's f1b2d82). Local
commit; push waits for the owner's word.

## The design choice: a guard beside C7, not an extension of premiseDegree

The scope offered two forms: extend the C7 trigger, or add
a self-predication guard beside it. The guard was built.
Its grounds, from the code:

- `premiseDegree`'s contract is a degree over a subject +
  quality predication, read against the record and the
  graph. A self-predication's decisive material is in
  neither place: the parse DROPS the possessed noun, so
  which fact of the system is being predicated (the slot)
  exists only in the token record — the reading Slice 3's
  shape (d) already makes in assessment — and the authority
  that decides it (the Self tables) is reached through the
  Social Unit's one address (`requestIdentity`, social.ts).
  Both are turn-layer materials; Coherence imports neither
  the tables nor the token record, and making it do so
  would widen the unit's seam for one consumer.
- What the guard shares with C7 is the CONSEQUENCE, and
  that it reuses exactly, in the same block, immediately
  after C7's graph-contradiction branch: the reply states
  the established ground, the asserted state is set aside
  (spliced from the record), and the disagreement is
  recorded (`recordDisagreement`). The trace files the
  stance with a new source, **"self"** (the `trace.stance`
  union widens by that one member), so the stance's
  authority is visible in the trace as other record
  answers' sources are — testimony discipline: the stance
  speaks from the Self table and says so in its ground.

One consequence of C7's pattern is deliberately NOT
reused: no stance-repair pending opens. The pending's
insistence renderings are built from subject/quality
lemmas ("X is Y, as I have it"), and no lemma pair renders
a your-NP premise truthfully ("Your is AnSci, as I have
it" is not a sentence). A repeat assertion needs no
pending to be met: the guard reads each telling's own
predication, so the repeat meets the same stance and the
false state is set aside again — pinned by test. The
graph stance's insistence path is untouched.

## What was built

**The guard (`src/fork/turn.ts`, inside the C7 assertion
block).** It is entered on exactly the turns C7 is entered
on — a statement whose predicated-as predication banked an
unnegated state this turn — and fires when:

1. the predication's subject is "your" (the visitor
   addressing the system; a first-person telling about the
   visitor's own name draws subject "name", holder "name",
   and never reaches it — "my name is sam." is untouched);
2. the possessed NP's head, read from the tokens after
   "your" to the first function word (Slice 3's reading),
   is **"name"** — bare or modified ("your name", "your
   last name", "your first name"); and
3. the offered value differs from the Identity table's
   name.

The offered value is the predicate **as the visitor wrote
it**: the final token of the assessed object's retained
surface. This reading was forced by measurement: the
parse's lemma — and its token stream alike — carries the
token resolver's substitution for an unknown name, so
"your name is ansci." arrives in the graph as lemma
"anti", and no comparison read from the parse could ever
find agreement with the table. The surface is what the
visitor actually claimed, and it is what is compared
(case aside) against `requestIdentity().name`.

Where the value differs, the turn returns the stance:
the reply is Slice 3's name composer
(`selfNamePartAnswer()` — "I have only the one name,
AnSci."), the asserted state is spliced out, the
disagreement stands as `{premise: "your name is
⟨offered⟩", established: "my name is AnSci"}`, and
`trace.stance` files subject "your", the presupposed
lemma, established "AnSci", source "self", with a ground
naming the Identity table as the authority. Where the
value AGREES, the guard stands down entirely: the
ordinary acknowledgement answers and the telling stands
in the record as told, as any agreed telling does.

**Coverage — what the tables honestly decide, and no
more.** The name is the one slot a Self table holds as a
value a predication can contradict. The other tables were
read for relevance and found to hold no contradictable
fact for this shape:

- **Place (Slice 4):** the table stands unconfigured — it
  holds NO place, which is the absence of a fact, not a
  rival fact a predication could contradict; and the
  location predication ("you are in paris.") banks no
  state for a stance to set aside. It keeps its prior
  behaviour, pinned by test.
- **Capabilities & limits:** the table holds sentences,
  not slot values, and capability claims in their natural
  dress ("you can fly.") draw verb EVENTS, not
  predicated-as states — the assertion machinery this
  guard extends keys on the banked state, so it honestly
  does not reach them. They keep their prior behaviour,
  pinned by test.
- Any other your-NP head (a favourite colour, a home) is
  a slot no table covers: existing behaviour stands, no
  coverage invented — the coverage control below.

**The shipped wording — no new sentence coined.** The
stance reply is Slice 3's already-shipped composer,
"I have only the one name, AnSci.", whose wording Slice
3's report flagged as **MINIMAL / DRAFT** — the final
visitor-facing wording of Self facts is the owner's, as
identity.ts's header records for the whole table family.
This slice adds no visitor-facing sentence of its own;
the disagreement renderings and trace grounds are record
text, not spoken text.

**Registry / GAPS.** Following slices 0–4, the system-map
registry (`ai-system/`) and `GAPS.md` are left unchanged:
`ai:check` passes on the unchanged map (89 nodes), and the
guard files under the existing C7 / Awareness Self homes —
C7's block is where it stands, and the Identity table it
reads already lives there.

## Acceptance (probe harness pattern, fresh store-less sessions, this tree's dist)

Probe 19 and its S-B sequence, verbatim:

| Turn | Input | Reply |
|---|---|---|
| 19 | your last name is smith. | "I have only the one name, AnSci." |
| S-B 2 | what is your last name? | "I have only the one name, AnSci." |
| S-B 3 | what is your name? | "I am AnSci. I am a small classical-AI system. I understand simple English statements and questions, and I answer from what I know, saying so when I don't." |

After probe 19, `session.states` is `[]` — the smith state
does NOT stand in the record (S-B's finding reversed), and
no smith state stands at any point in the sequence.
Probe 19's `trace.stance` files subject "your",
presupposed "smith", established "AnSci", source "self",
outcome "stated", and a ground naming Awareness Self's
Identity table as the authority; the disagreement record
holds `{premise: "your name is smith", established: "my
name is AnSci", turn: 1}`.

Agreement, coverage and control cases, verbatim from the
same runs:

| Input | Reply | Standing |
|---|---|---|
| your name is ansci. | "Ok. Noted." | agreement — no stance; the telling stands as told (state lemma "anti", the parse's reading of the surface) |
| your name is AnSci. | "Ok. Noted." | agreement — no stance |
| your name is bob. | "I have only the one name, AnSci." | stance, source "self"; no state stands |
| your first name is smith. | "I have only the one name, AnSci." | stance, source "self"; no state stands |
| your favourite colour is red. | "Ok. Noted." | coverage control — no stance; the state stands as told, prior behaviour |
| your home is paris. | "Ok. Noted." | coverage control — no stance; prior behaviour |
| you are in paris. | "Ok. Noted." | unreached form — no state banked, no stance |
| you can fly. | "Ok. Noted." | unreached form — verb event, no stance |
| Winter is hot. | "Winter is cold, as I have it." | C7's graph stance, unchanged (source "graph") |

The full 20-probe run reproduces every Slice 0–4
acceptance reply verbatim (probes 1–18 and 20 as on Slice
4's tree); probe 19 is this slice's one changed reply.
The acceptance also lives in the suite:
`test/fork-transcript-slice5.test.ts` (9 tests: the
table's standing as the guard's authority, probe 19 with
its trace and record assertions, the S-B sequence, the
name slot's generality, the repeat-assertion behaviour,
the agreement control in both casings, the coverage
controls, the unreached forms, and the probe 5/6/16/20 +
graph-C7 control set).

## Gates (delivered runs, this tree, after the final fix)

- Suite: **1109 pass, 0 fail** (ℹ tests 1112, ℹ skipped
  3) — Slice 4's delivered run was 1100 pass / 0 fail
  (ℹ tests 1103, ℹ skipped 3); the difference is this
  slice's 9 new tests, and nothing else moved.
- Demo **29/29** (27 exact round-trips); holdout **80/80
  parsed** ON (OFF 54/80), flipped fail→success 26, **0
  parse regressions, 0 round-trip regressions**.
- Sense sets **A 11/11 · B 5/6** — unchanged.
- `npm run ai:check` OK (89 nodes, 22 cords, layout
  covers 89 nodes).

All figures identical to Slice 4's delivered gates except
the suite count, which grew by exactly this slice's tests.

## What this does not show

The guard decides the NAME slot only, because that is the
one Self-table fact held as a contradictable value.
Second-person predications of other kinds keep their
prior behaviour, each for a stated reason, and each is an
edge this slice records rather than papers over: a direct
"you are X." predication carries no possessed NP naming
its slot, so the machinery cannot honestly tell a name
claim ("you are bob.") from a kind or quality claim
("you are a robot.", "you are happy.") — and the Identity
table's kindLine is a sentence, not a value a kind claim
could be contradicted against — so no direct-form guard
was built. A name claim under a synonym head never
reaches the guard: "your surname is smith." parses with
"surname" itself as the subject (holder "surname"), and
keeps its prior acknowledgement with the state standing —
whether surname should route to the Identity table is the
same coverage call Slice 3 recorded for surname
questions, the owner's to settle. A NEGATED name
assertion ("your name is not smith.") is outside C7's
entry condition (the block requires an unnegated asserted
state, as it does for graph premises) and keeps its prior
behaviour: acknowledged, the negated state standing —
which is, in content, agreement with the table, arrived
at without a stance. A two-word offered name ("your name
is ansci smith.") draws the stance: the comparison reads
the surface's final token as the offered value, and a
multi-word name is not the one name the table holds —
the stance's content (the held name, stated) is true,
but the reading of a multi-word value as its last token
is this slice's simplification, recorded here. The
configured-place question does not arise: the Place
table stands unconfigured, and if a deployment ever sets
a place there, a location predication would still bank
no state and draw no stance under this slice — that
extension would be a new trigger, not this guard's
unfinished half. Nobody independent has checked any of
this; it is one build, one gate pass, on one commit.
