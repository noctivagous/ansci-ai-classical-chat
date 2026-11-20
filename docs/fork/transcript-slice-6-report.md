# Transcript Slice 6 — About-Phrase Representation — report (2026-11-19)

Slice 6 of the transcript fix programme commissioned from
the 2026-11-19 diagnostic probe: represent the about-phrase
in know-questions (the probe report's fix-programme item 6).
**Build-order numbering:** the programme's slices are
numbered in build order — Slice 0 (entity grounding,
commit 7347710), Slice 1 (clausal complement, commit
a92762f), Slice 2 (know-question routing, commit 4136866),
Slice 3 (your-NP matter fix, commit 2cbfe3c), Slice 4
(where-split, commit f1b2d82), Slice 5 (premise/Self-tables
guard, commit 6fb9a20), and this slice, built seventh. The
Wikidata intake the probe report's erratum schedules is a
later slice in the same programme and is **on hold by
owner ruling**; nothing in this slice touches it.

The diagnosis (IM3): probe 10 — "what do you know about
dogs?" — parsed to only know/you/what, so it collapsed
into probe 2's missing-theme decline and the topic the
visitor named (dogs) was lost: its outcome was about
nothing instead of about dogs. Built in the worktree
`~/workspace/ansci-track-transcript` (branch
`track/transcript-fixes`, on Slice 5's 6fb9a20). Local
commit; push waits for the owner's word.

## The mechanism, as found in the code

The diagnostic named the loss; the mechanism is in the
item classification. `about` is **not** in the parser's
closed preposition set (`EN_PREP` in parse.ts holds only
on/in/by/to/with/past/at/from); the WordNet provider
derives it as an **adverb**. Every post-verbal site then
mishandles the phrase, each in its own way:

- the wh-question branch's post-gap PP loop tests
  `item.kind !== "prep"` and **breaks** — the phrase is
  silently dropped, which is probe 10's exact loss;
- the main verb path takes the word as a modulator
  (Water→verb) and the following chunk fills a bare frame
  slot — "i know about dogs." filed 'dog' as know's
  **theme**, the thing known, where the sentence says only
  what the knowing is about;
- the embedded-clause argument filler (`enFillVerbArgs`)
  does the same one clause down.

The parser already had one honest about-reading, in the
imperative branch: 'about' before a chunk is the
preposition, position deciding over classification ("The
about-PP check precedes the adverb check", parse.ts, on
"Tell me about winter."). This slice extends that reading
to the other post-verbal sites rather than inventing a
second one.

## The representation: a dedicated 'about' relation

**The design choice.** The about-PP attaches under a new
relation, **`about`** (sentence.ts), following the
relation conventions Slice 1 set for `complement`:

- the edge runs from the verb (Wood) to the topic node
  (Earth), and the node carries `prep: "about"` for
  regeneration, exactly as a location node carries its
  preposition; the node's role is "about";
- it is **not a valency arc**: check.ts's `ARG_RELATIONS`
  deliberately excludes it, as it excludes `complement` —
  no frame gains or loses an argument because a topic
  stands beside the clause;
- it is **not the theme**: what a knowing is about and
  what is known are different questions, and filing the
  topic as the theme (the old main-path behaviour) made
  the record claim the second from a sentence that said
  only the first — a later "what do you know?" after "i
  know about dogs." could be answered from that phantom
  theme; it no longer can;
- it is **not a location**: the PP loops' default slot for
  an unlisted preposition is `location`, and a topic is
  not a place the event happens in.

**Where the parse files it.** Every post-verbal site that
takes PPs, with the same positional rule ('about' before a
chunk is the preposition; a chunkless 'about' keeps its
adverb reading): the wh-question post-gap PP loop (probe
10's path), the wh subject-question loop ("who knows about
dogs?"), the main verb path's post-verbal loop (statements
and polar questions), and `enFillVerbArgs`, so an embedded
clause's verb carries its own topic ("i know that you know
about dogs."). The topic then survives by construction
into the semantic object, whose content *is* this meaning
graph (assess.ts wraps the parse unchanged).

**Where it is carried from there.**

- The session's event record gains an **`about`** field
  (session.ts `EventRecord`), recorded beside
  patient/theme/location/recipient: "know about dogs"
  tells what the knowing is about, not what is known, and
  the record now says exactly that.
- The trace files **`trace.aboutTopic`** (topic lemma,
  form as spoken, ground in words) for any turn whose root
  carries the edge, whatever the turn's outcome; the parse
  summary names the topic among the nodes ("nodes: know,
  you, what, dog").
- Generation composes it back: `orderedArgs` (generate.ts)
  carries the `about` relation among the relations it
  renders with their prepositions, so no statement or
  question form that reaches the machinery drops the
  phrase (round-trips pinned in the tests, including the
  embedded form).

**The turn layer's use of it.** Probe 10 still reaches the
missing-theme decline — see the boundary below — and that
decline's own machinery already phrases supplied PP
material into its reply (the tail that renders "what was
put in the soup"). With the topic in the graph, the reply
is "…nothing you have told me says what was known **about
dogs**." The decline's ground now also names the topic:
"…the question's about-topic is 'dog', carried in the
parse under the 'about' relation — the decline is about
that topic". `answerKnowQuestion` itself stands down for
this shape, deliberately, and its header comment records
why (Slice 6 note there).

**Repairs the new filing required, in scope.** Three
standing readers were built on the old positional filing
(the topic standing in the theme slot) and failed on the
new one; each was repaired to read the representation
rather than the position, and the failing tests are the
evidence (IMP-2 P-041, IMP-4(d), X2b — 3 failures in the
first full run, all of this family, none other):

- the mention check (`answerMentionFromRecord`): its
  matter is the theme **or** the about-topic ("Did I tell
  you about the soup?"), and its record test counts an
  event's `about` fill among the fills that mention a
  thing;
- SemanticAssessment's self-presentation recognition
  (`yourselfMatter`): 'yourself' as a telling's about-topic
  is its matter, as it was as its theme ("tell me a bit
  about yourself");
- the event-fill enumerations that read an event's content
  fills as a set (the recognition receipt's earlier-link,
  the accumulated-tellings reader, the initiative scan's
  standing-state check, and the Discourse Record's
  `eventLemmas`) include `about` among them.

**Registry / GAPS.** Following slices 0–5, the system-map
registry (`ai-system/`) and `GAPS.md` are left unchanged:
`ai:check` passes on the unchanged map (89 nodes), and the
relation files under the sentence layer's existing homes,
as `complement` did in Slice 1.

## The boundary kept: probe 2's answer is still the owner's call

What "what do you know?" should ANSWER — a capabilities
presentation, the conversation record, or both — is an
**owner's design call, flagged in the diagnostic report
and still undecided**. Slice 2 deliberately left probe
2's behaviour untouched, and this slice does too: probe
10's outcome remains the missing-theme decline family,
because what the about-form should answer is the same
undecided question. This slice is representation only —
the topic is carried in the parse/graph, the record and
the trace, and the outcome the turn reaches is framed by
it. Probe 2's reply is verified **unchanged verbatim**
below and pinned in the tests.

## Acceptance (probe harness pattern, fresh store-less sessions, this tree's dist)

Verbatim:

| Input | Reply |
|---|---|
| what do you know about dogs? | "I can't answer that from what I know: nothing you have told me says what was known about dogs." |
| what do you know? | "I can't answer that from what I know: nothing you have told me says what was known." (unchanged from Slice 5 head) |
| what do you know about oklahoma? | "I can't answer that from what I know: nothing you have told me says what was known about oklahoma." |
| what do you know about the dog? | "I can't answer that from what I know: nothing you have told me says what was known about the dog." |

Probe 10's trace evidence, verbatim: parse summary "root
'know' (Wood, verb); nodes: know, you, what, dog; mood:
interrogative"; `trace.aboutTopic` = {topic: "dog", form:
"dogs", ground: "the clause carries an about-phrase, and
the parse files its topic 'dog' under the 'about' relation
from 'know' (Transcript Slice 6) — the turn, and any
decline it reaches, is about that topic"}; decline reason
"the question asks for the theme of 'know', and no know
event in the situation fills that role — the missing role
is the decline's ground (§6); the question's about-topic
is 'dog', carried in the parse under the 'about' relation
— the decline is about that topic". The parse graph holds
edges know–agent→you, know–theme→what (the questioned
theme), know–about→dog.

Round-trips, verbatim: `generate(parse("what do you know
about dogs?"))` = "What do you know about dogs?";
"i know about dogs." → "I know about dogs."; "i know that
you know about dogs." → "I know that you know about
dogs.". The statement's event record is {verb: "know",
agent: "you", about: "dog", theme: undefined}.

The full 20-probe run reproduces every Slice 0–5
acceptance reply verbatim (probes 1–9 and 11–20 as on
Slice 5's tree); probe 10 is this slice's one changed
reply. The acceptance also lives in the suite:
`test/fork-transcript-slice6.test.ts` (10 tests: probe
10's parse and framing, probe 2 unchanged, the grounded-
entity variant, the determiner's ride, the statement
filing and its event record, the round-trips, the
construction's generality with the goal control, the
tell-about readers on the new filing, and the Slice 0–5
control set).

## Gates (delivered runs, this tree, after the final fix)

- Suite: **1119 pass, 0 fail** (ℹ tests 1122, ℹ skipped
  3) — Slice 5's delivered run was 1109 pass / 0 fail
  (ℹ tests 1112, ℹ skipped 3); the difference is this
  slice's 10 new tests, and nothing else moved.
- Demo **29/29** (27 exact round-trips); holdout **80/80
  parsed** ON (OFF 54/80), flipped fail→success 26, **0
  parse regressions, 0 round-trip regressions** — and the
  regenerated `docs/fork/holdout-run.md` records one
  further exact round-trip ON (30, was 29) and mean
  meaning nodes 3.27 (was 3.26): one corpus sentence's
  phrase now survives its round-trip. The file is
  committed with this slice as the run's own record.
- Sense sets **A 11/11 · B 5/6** — unchanged.
- `npm run ai:check` OK (89 nodes, 22 cords, layout
  covers 89 nodes).

All figures identical to Slice 5's delivered gates except
the suite count, which grew by exactly this slice's
tests, and the holdout run record noted above.

## What this does not show

The representation covers about-phrases standing as a
verb's post-verbal phrase — the know-question's shape and
its honest generalisations. It does not claim the other
places 'about' stands: an NP-modifier about-phrase ("a
book about dogs") still files 'about' as a modulator of
the head, a copular about ("the book is about dogs")
still fails at the predicate clause's complement, and the
imperative request form ("Tell me about dogs.") keeps its
older filing — its topic under tell's theme, prep "about"
retained — because that form's readers (the tell-me
matter in assessment, read from the token record) are
built on it; unifying it is a change to a working family,
not this slice's unfinished half, and it is recorded here
rather than silently left. The polar know-question ("do
you know about dogs?") carries its topic in the parse and
the trace as every form does, but its reply is unchanged
from before this slice: the fallthrough's located decline,
which names the topic as spoken ('dogs') through its
pre-existing token-cluster reading — no new routing was
built for the polar form, and what any know-question
should *answer* remains the owner's undecided call above.
A topic the conversation later returns to is recorded in
the event record and the topic/entity records as before,
but no reader yet answers *from* a standing about-topic
("what do you know about dogs?" after a telling about
dogs draws the same framed decline; the record-first
readers read event fills, and 'about' is now among them,
but the missing-theme question asks for a theme, and a
topic is not one). Nobody independent has checked any of
this; it is one build, one gate pass, on one commit.
