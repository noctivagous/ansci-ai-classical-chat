# Transcript Fix Programme — final report (2026-11-19)

The programme commissioned from the 2026-11-19 diagnostic
probe (20 probes run against unmodified origin/main
76996ae; report and records in
`~/workspace/ansci-diagnostic-probe-2026-11-19/`), built as
eight slices on branch `track/transcript-fixes` in the
worktree `~/workspace/ansci-track-transcript`, over base
76996ae. This report is the programme's final acceptance
step: measurement and reporting only, no new build work.
All commits are local; nothing was pushed or merged.

## What was done at acceptance

- The branch and head were verified first: branch
  `track/transcript-fixes`, head 5837f53, working tree
  clean.
- All 20 diagnostic probes were re-run against the branch
  head (5837f53), using the diagnostic harness's own
  pattern: fresh store-less session per probe
  (`newSession()` with no store), single turn fed verbatim,
  reply and trace captured, one pass. The run output is
  saved outside the repo at
  `~/workspace/ansci-diagnostic-probe-2026-11-19/after-results.jsonl`;
  the diagnostic baseline (`results.jsonl`) was not
  overwritten. No probe errored; none of the 20 stops at
  `lpu/parser` on the head, and the rephrase text ("Could
  you put that another way?") appears in none of the 20
  replies.
- The full gates were run once more, fresh and complete,
  on the head. Figures are quoted in the gates section
  below; they match Slice 7's delivered figures exactly.

## Per-probe before / after

Baseline replies are from the diagnostic run against
76996ae (`results.jsonl`); after replies are from the
acceptance run against 5837f53 (`after-results.jsonl`).
Replies are shortened; the full texts are in those two
files. Attribution names the slice that produced the
change visible in the final reply.

| # | Input | Before (76996ae) | After (5837f53) | Slice |
|---|---|---|---|---|
| 1 | do you know who i am? | "Could you put that another way?" (stops at `lpu/parser`) | "No. You have not told me who you are." | 1 (parse) + 2 (register routing) |
| 2 | what do you know? | "…nothing you have told me says what was known." | unchanged | — (owner's undecided call; see Open) |
| 3 | who am i? | "…I have nothing on i in my notes, and I have no way to connect anything to 'who'." | "You have not told me who you are." | 2 |
| 4 | do you know my name? | "…I have nothing on name in what I know." | "No. You have not told me your name." | 2 |
| 5 | what can you do? | capabilities presentation | unchanged | — |
| 6 | who are you? | "I am AnSci. …" (identity text) | unchanged | — |
| 7 | do you know where oklahoma is? | "Could you put that another way?" (stops at `lpu/parser`) | "…I have oklahoma as a state in south central United States, but nothing in what I know answers that." | 0 (held-gloss decline) + 1 (parse); verified unchanged by 2 |
| 8 | do you know what a dog is? | "Could you put that another way?" (stops at `lpu/parser`) | "…nothing in what I know says what a dog is." (decline located at 'dog') | 1 (parse) + 2 (located routing) |
| 9 | i know who you are. | "Could you put that another way?" (stops at `lpu/parser`) | "Ok. Noted." | 1 |
| 10 | what do you know about dogs? | "…nothing you have told me says what was known." (about-phrase lost) | "…nothing you have told me says what was known about dogs." | 6 |
| 11 | where is oklahoma? | "…I have nothing on oklahoma in what I know." | "Oklahoma is a state in south central United States." | 4 (gloss as answer, on 0's grounding; 0 had first replaced the baseline decline with one naming what is held) |
| 12 | where are you? | "…I answer questions about what things are like, and that one asks something else." (question-shape decline) | "I don't have a place: nothing in my situation record says where I am." | 4 |
| 13 | where am i? | question-shape decline, as 12 | "I have no way of knowing where you are." | 4 |
| 14 | what is oklahoma? | "…I have nothing on oklahoma in my notes…" | "Oklahoma is a state in south central United States." | 0 |
| 15 | where is a dog? | question-shape decline, as 12 | "…nothing in what I know says where a dog is." (decline located at the subject) | 4 |
| 16 | what is your last name? | "I don't have a last." | "I have only the one name, AnSci." | 3 |
| 17 | what is your first name? | "I don't have a first." | "I have only the one name, AnSci." | 3 |
| 18 | what is your name? | "I am AnSci. …" (identity text) | unchanged | — |
| 19 | your last name is smith. | "Ok. Noted." (no stance; the false smith state stood banked) | "I have only the one name, AnSci." (stance from the Self tables; the smith state does not stand) | 5 |
| 20 | how are you? | "I am fine." | unchanged | — |

**Count: 15 of the 20 replies changed; 5 are unchanged**
(probes 2, 5, 6, 18, 20). Grouped by the slice that
produced the final change: Slice 0 — probe 14 (and, with
Slice 1, probe 7); Slice 1 — probes 9 (and, with Slice 2,
probes 1 and 8); Slice 2 — probes 1, 3, 4, 8; Slice 3 —
probes 16, 17; Slice 4 — probes 11, 12, 13, 15; Slice 5 —
probe 19; Slice 6 — probe 10; Slice 7 — no probe reply
(it changed the reply for construction-gap inputs outside
the 20; on Slice 6's head none of the 20 still drew the
rephrase, so none was eligible to change).

Every after-reply matches the acceptance reply recorded
in the corresponding slice report; the re-run surfaced no
discrepancy against any slice's delivered acceptance.

## Per-slice summary

Gate figures are each slice's delivered run, as recorded
in its report (`docs/fork/transcript-slice-{0..7}-report.md`).
Demo, holdout and sense figures are identical at every
slice unless noted: demo **29/29** (27 exact round-trips);
holdout **80/80 parsed** ON (OFF 54/80), flipped
fail→success 26, **0 parse regressions, 0 round-trip
regressions**; sense sets **A 11/11 · B 5/6**;
`npm run ai:check` OK (89 nodes, 22 cords, layout covers
89 nodes).

| Slice | Commit | Substance | Suite at that slice |
|---|---|---|---|
| 0 — entity grounding | 7347710 | Named-entity synsets identified by the extract's instance relation (7,756 synsets) grounded into the graph with gloss, type chain and "wordnet-retrieved" provenance; what-is questions about grounded entities answered from the record; declines about grounded entities name what is held. | 1063 pass, 0 fail (ℹ tests 1066, ℹ skipped 3) |
| 1 — clausal complement | a92762f | A `complement` clause relation, a hand-lexicon entry for 'know' carrying the clausal frame, and a construction that parses wh-/that-clauses as a verb's complement (know-class and the resolvable cognition/report verbs); generation composes the embedded clause. | 1073 pass, 0 fail (ℹ tests 1076, ℹ skipped 3) |
| 2 — know-question routing | 4136866 | Self-query recognition tightened to predications of the system; "who am i?", "do you know my name?" and "do you know who i am?" answered from the Interlocutor register; embedded what-is know-questions answered from what is held or declined located at their subject. | 1083 pass, 0 fail (ℹ tests 1086, ℹ skipped 3) |
| 3 — your-NP fix | 2cbfe3c | The your-NP self-fact shape files the possessed NP's head noun, not the token after "your"; modified name NPs are answered from the Identity table's one undivided name. | 1090 pass, 0 fail (ℹ tests 1093, ℹ skipped 3) |
| 4 — where-split | f1b2d82 | Where-questions split by subject: self-location answered from a new Place table beside the Self tables (stands unconfigured, so a decline naming self-location); visitor location declined as unknowable, or answered from the record where a 'live' telling established it; world location answered at gloss level from Slice 0's grounding, or declined located at the subject. One Slice 0 acceptance test (probe 11's decline) was superseded by this slice's commission and updated, recorded in the slice report. | 1100 pass, 0 fail (ℹ tests 1103, ℹ skipped 3) |
| 5 — premise / Self-tables guard | 6fb9a20 | A self-predication guard beside C7: a your-name predication contradicting the Identity table draws the stance reply, the asserted state is set aside, and the disagreement is recorded with the stance's source filed as "self". | 1109 pass, 0 fail (ℹ tests 1112, ℹ skipped 3) |
| 6 — about-phrase | 7716b6e | A dedicated `about` relation carries a verb's about-phrase in the parse, the event record (`about` field), the trace (`trace.aboutTopic`) and generation; probe 10's decline is now framed by its topic. Three standing readers built on the old positional filing were repaired to read the representation. Holdout record moved with this slice: exact round-trips ON 30 (was 29), mean meaning nodes 3.27 (was 3.26); `docs/fork/holdout-run.md` committed with the slice. | 1119 pass, 0 fail (ℹ tests 1122, ℹ skipped 3) |
| 7 — located decline for construction gaps | 5837f53 | By owner ruling (amending the S4 design for this class only): a parse failure that is recognisably a construction gap — clause-machinery failure, every word attested, no word guessed in, and one of three named signatures — surfaces as a located decline instead of the unnamed rephrase; no clarification pending is opened. Undecidable classes keep the rephrase. | 1127 pass, 0 fail (ℹ tests 1130, ℹ skipped 3); regenerated `docs/fork/holdout-run.md` byte-identical to Slice 6's, so not part of that commit |

## Build order, as executed

0 grounding → 1 complement → 2 know-routing → 3 your-NP →
4 where-split → 5 premise → 6 about → 7 located decline.

**The Wikidata slice was not built.** The diagnostic
report's erratum scheduled a Wikidata intake (item→synset
join, place-association requirement, banked with
provenance) as a later slice in this programme. It was
commissioned, then **held by owner ruling pending the
owner's plan**, and no part of it was built in any slice.
Every slice report records the hold. World-location
answers in this programme therefore rest on Slice 0's
WordNet grounding alone.

## Gates on the head (acceptance run, fresh and complete)

- `npm test`: **1127 pass, 0 fail** (ℹ tests 1130,
  ℹ skipped 3).
- `npm run fork:demo`: **29/29** expectations met,
  29 parsed, **27 exact round-trips**.
- `npm run fork:holdout`: ON **parsed 80/80 (100.0%)**,
  exact 30; OFF parsed 54/80; flipped fail→success 26;
  **parse regressions 0; round-trip regressions 0**. The
  regenerated `docs/fork/holdout-run.md` is byte-identical
  to the committed copy (the tree stayed clean).
- `npm run fork:sense`: Set A **11/11**, Set B **5/6** —
  unchanged.
- `npm run ai:check`: OK — 89 nodes, 22 cords, layout
  covers 89 nodes.

## Registry / GAPS

The system-map registry (`ai-system/`) and `GAPS.md` are
unchanged by this programme. Slices 0–7 each left them
unchanged, following the repo convention observed across
those slices — new machinery filed under the existing
homes (the turn layer's, the sentence layer's, Awareness
Self's) — and `ai:check` passes on the unchanged map.
This acceptance step does not change them either.

## What remains open

Gathered from the slice reports; nothing here was decided
or built at acceptance.

- **(a) "What do you know?" is the owner's undecided
  call.** What that question should answer — a
  capabilities presentation, the conversation record, or
  both — was flagged in the diagnostic report and is
  still undecided. Slices 2 and 6 deliberately left
  probe 2's behaviour untouched, and probe 10's outcome
  rides on the same question: it remains the
  missing-theme decline, now framed by its topic.
- **(b) Wikidata intake — held, not built** (see Build
  order). World-location therefore answers at gloss level
  only: the grounded entity's WordNet gloss, with no
  coordinates, no containment chain, and no richer place
  knowledge.
- **(c) Shipped wording flagged minimal draft, the
  owner's to settle.** Slice 3's one-name answer ("I have
  only the one name, AnSci." — also Slice 5's stance
  reply, which coined no sentence of its own); Slice 4's
  location declines (self-location: "I don't have a
  place: nothing in my situation record says where I
  am."; visitor location: "I have no way of knowing where
  you are."; the world decline form); Slice 7's
  construction-gap decline ("I can't take that sentence
  apart: its shape is one my sentence layer doesn't build
  yet.").
- **(d) The Place table stands unconfigured**
  (`place: null`). The configured-place arm of Slice 4's
  self-location answer is built but unexercised by any
  run; it is reached only through the table's data, and
  no deployment data sets it.
- **(e) Recorded edges**, as the slice reports state
  them:
  - A that-less complement silently misparses: "i think
    you are here." is rooted on 'here' with 'think' gone
    and is answered "Ok. Noted." It never reaches the
    parse-failure exit, so Slice 7's decline cannot see
    it; pinned unchanged (Slices 1, 7).
  - Surname coverage is an owner call: "what is your
    surname?" never reaches the your-NP shape and keeps
    its graph decline (Slice 3), and "your surname is
    smith." keeps its prior acknowledgement with the
    state standing (Slice 5).
  - Undecidable parse-failure classes keep the rephrase:
    failures with no named signature (e.g. "the dog is",
    "who the dog is"), the whole "no verb found" class,
    and sentences carrying an unattested or guessed-in
    word (Slice 7). Slice 7's decline covers three named
    signatures, not the construction inventory as a
    whole.
  - Multiword entity names are grounded in the store but
    unreachable as question subjects — the parser routes
    "new" in "New York" as the clause root (Slice 0).
  - NP-modifier and copular about-phrases are unclaimed:
    "a book about dogs" files 'about' as a modulator of
    the head, and "the book is about dogs" still fails at
    the predicate clause's complement (Slice 6). The
    imperative tell-about form keeps its older filing,
    and no reader yet answers from a standing about-topic.
  - "Is oklahoma a state?" is not answered from the
    instance edge: the reply states what is held and that
    nothing connects it to the asked quality — answering
    the type-check itself was left as a later slice's
    shape (Slice 0).
  - Where a lemma names both an instance synset and other
    senses, the what-is answer takes the instance record
    in extract order (Slice 0's stated rule). Atlantis is
    not grounded — its synset carries no instance edge —
    and still declines, located at the name (Slice 0).
  - Pronoun-subject complements the register does not own
    stand down from Slice 2's reader and keep the
    question-shape decline: "do you know what i am?",
    "do you know who she is?" (Slice 2). A visitor name
    stated in lowercase is not learned, by the standing
    capitalisation rule, so the register answers remain
    the not-told forms (Slice 2).
  - The elliptical return "What about your last name?" is
    not captured by the return shape on this tree and
    declines on an unrelated missing-role ground
    (Slice 3).
  - The world where-path answers with the gloss for every
    grounded entity, not only places: for a person the
    gloss is a biography line, not a location — recorded
    as known roughness; no cleaner place test exists in
    the held data (Slice 4). A visitor's copular location
    telling ("i am in paris.") records nothing the record
    leg can read, so that visitor still meets the
    no-way-of-knowing decline (Slice 4). Scene-placed
    where-questions are not answered from the scene
    (Slice 4).
  - Slice 5's guard decides the name slot only. A direct
    "you are X." predication carries no possessed NP
    naming its slot and is unguarded; a negated name
    assertion is outside C7's entry condition and keeps
    its prior behaviour; a two-word offered name is read
    as its final token (Slice 5). Capability and place
    predications draw no stance — capabilities in their
    natural dress are verb events, and the Place table
    holds no fact to contradict (Slice 5).
  - Slice 7's decline says a shape is not built; it does
    not build it — "tell me who i am." is declined, not
    answered, and whether any of the three signature
    constructions should be built (the NP-intervening
    complement is the named candidate, as a Slice 1
    extension) is a separate programme question
    (Slice 7).

## What this does not show

The 20 probes are the diagnostic set, not a coverage
claim: other clause-taking verbs, multi-turn behaviour
beyond the slices' pinned sequences, scene-placed and
frame-supplied sessions were outside the diagnostic's
scope and remain so here, except where a slice report
records a specific check. The gate figures show the
suite, demo, holdout and sense sets behave on this branch
as the slice reports delivered them; they do not show the
branch behaves identically off those sets. The shipped
wordings named above are drafts the owner has not yet
settled, and two programme questions — what "what do you
know?" should answer, and the Wikidata intake — stand
exactly where the owner left them: undecided and held.

Nobody independent has checked any of this. All gates and
probe runs in this programme, including this acceptance
run, were run in-loop on this branch by the same agent
process that built the slices; there has been no external
review, no second implementation, and no run on any other
machine or commit.
