# Transcript Slice 1 — Clausal Complement — report (2026-11-19)

Slice 1 of the transcript fix programme commissioned from the
2026-11-19 diagnostic probe: the clausal-complement slice.
**Build-order numbering:** the programme's slices are numbered
in build order — Slice 0 (entity grounding, commit 7347710) was
built first, and this slice, the programme's item 1 (sentence
layer: a clausal-complement construction), is built second.
The Wikidata intake the probe report's erratum schedules is a
later slice in the same programme and is **on hold by owner
ruling**; nothing in this slice touches it.

The diagnosis (SD1, with IM2 as its mechanism and K2 as a
contributing gap): `parseEnBody` (`src/fork/parse.ts`) was a
single-clause dispatch keyed on the FIRST be/verb item in the
whole token stream; the relation inventory in `sentence.ts` had
clause relations for condition, modifier (relative), result and
degree but no complement-clause relation; verb slots took NP
chunks only; and 'know' had no hand-lexicon entry, reaching the
parser only through the WordNet fallback with an NP theme frame.
Consequences, all measured in the probe: "do you know who i
am?", "do you know where oklahoma is?", "do you know what a dog
is?" and the statement "i know who you are." all stopped at
`lpu/parser`, and "i know that you are here." silently
misparsed — rooted on 'here', with 'know' gone, the embedded
clause taken as the main clause. Built in the worktree
`~/workspace/ansci-track-transcript` (branch
`track/transcript-fixes`, on Slice 0's 7347710). Local commit;
push waits for the owner's word.

## What was built

**The relation (`src/fork/sentence.ts`).** A new Relation,
`"complement"`: matrix verb → embedded clause root, the same
shape the layer already uses for clause-to-clause structure —
"condition" runs from a main verb to its condition clause,
"modifier" from an Earth head to its relative clause. It is a
clause relation, not a valency arc: the checker counts Earth
arguments from its own relation set, so a complement clause is
neither an excess argument nor an NP filler, and no reasoning
path treats it as a cycle edge. The complementiser, where there
is one, rides on the edge's marker field ("that"), as the
relative's "that" and the chain marker already do.

**The lexicon (`src/fork/sentence.ts`).** `VerbEntry` gains a
`clausalComplement` flag — the frame fact that a verb may take a
whole clause in place of its first slot's NP filler — and 'know'
enters the hand lexicon carrying it (K2). Its NP frame is the
fallback's own (slots `["theme"]`, required `[]`, FrameNet
'Familiarity' as it was derived), so every know + NP parse keeps
the shape it has always had; what the entry adds is the
irregular paradigm (knows/knew/known) as the lexicon's own
record and the clausal frame. The entry is registered under the
lemma only, deliberately: the inflected surfaces adopt it by
lemma through the verb-slot fallback's existing hand-entry
precedence, but registering the surface 'knows' itself made it
a hand-vocabulary correction target for the token matcher —
with the WordNet provider off, "blows" then "corrected" to
'knows' (edit distance 2) and parsed, where a standing test
pins its failure. A hand surface is a correction target; a hand
lemma is a frame. (Found by the full suite on this slice's
first run; see Gates.)

**The construction (`src/fork/parse.ts`).** A candidate scan
runs before the verb-slot fallback and the single-clause
dispatch — the two places that key on the first be/verb item in
the whole stream (IM2; the fallback's copula guard is the same
hijack from the other side, refusing to upgrade a derived
matrix verb whenever an embedded copula is present, which is
why "i think that you are here." misparsed too). The scan
probes, without adopting anything, for the first clause-taking
verb followed immediately by 'that' or a wh-word. The
know-class is 'know' itself (by its flag) plus the cognition /
report verbs the parser can already resolve — think, believe,
say, wonder, remember, understand, hope, forget, learn,
suppose, imagine, realize/realise, notice, see, hear, feel,
tell, mean — stated once as `EN_CLAUSAL_COMPLEMENT_VERBS`. A
relative 'that' follows a noun, never the verb, so it is never
this signature.

The build is two-sided and falls through whole:

- *The matrix side is checked first.* What remains of the items
  before the verb, once the carrier (auxiliary/modal) and the
  negator are set aside, must chunk as the subject entire — or
  be a single wh-word, the questioned-subject shape ("who knows
  who i am?", which gets the query record `{relation: "agent"}`).
  A noun that merely carries a complement-verb derivation fails
  this check and is passed over unadopted: "I have a feeling
  that I won." keeps its possession reading, root 'have'.
- *The embedded clause is then parsed as a clause in its own
  right*, into a scratch builder, in the shapes the layer
  already knows: wh-copular with clause-final copula ("who i
  am", "where oklahoma is", "what a dog is" — the wh-word is the
  embedded clause's questioned predicate/location and its root,
  its subject between the wh-word and the copula, exactly as the
  matrix copular question holds its questioned node as root);
  wh-verbal ("what you know" — the wh-word fills its ordinary
  slot one clause down, R3's rule); plain copular ("you are
  here", "a dog is an animal"); plain verbal ("you know dogs"),
  with the embedded verb's own arguments filled by the main
  path's rules. A complement-taking embedded verb takes its own
  complement recursively ("…that you know who i am").
- *Only then is the matrix verb adopted* and the graph
  assembled: matrix verb as root, agent edge to the subject, a
  'complement' edge to the embedded root. The candidate's and
  embedded items' classifications are snapshotted before the
  embedded parse and restored on any failure, so a discarded
  attempt leaves the item stream exactly as the fallthrough
  dispatch expects it. (Also found by the suite: the first build
  let a failed attempt's adopted 'won' stay verb-classified and
  steal the verb slot in "I have a feeling that I won.")

The matrix verb's states are the ordinary ones — mood from the
sentence's interrogative mark, tense and aspect from its form
and carrier, negation structured with its carrier — so a
negated or past matrix composes as any other clause ("I don't
know who i am.", "I knew who you were.").

**Generation (`src/fork/generate.ts`).** A matrix root carrying
a complement edge composes as agent + finite verb +
complementiser + the embedded clause composed from its own
root (wh + subject + copula for a wh-copular clause; subject +
copula + complement for a plain copular; subject + finite verb
+ arguments, questioned argument fronted, for a verbal one).
The branch runs before the wh-question path: the embedded
clause's question word is not the matrix clause's question, and
letting that path take it would re-ask the embedded clause as
the matrix one. Do-questions regenerate in the parser's
existing lossy style for them ("You know who i am?", as "do you
know my name?" already regenerated "You know my name?");
statements round-trip exactly (see Acceptance).

## Acceptance (probe harness pattern, fresh store-less sessions, this tree's dist)

Verbatim replies, one pass:

| Input | Reply | Walk ends |
|---|---|---|
| do you know who i am? | "I am AnSci. I am a small classical-AI system. I understand simple English statements and questions, and I answer from what I know, saying so when I don't." | verbalizer (completes) |
| do you know where oklahoma is? | "I can't answer that from what I know: I have oklahoma as a state in south central United States, but nothing in what I know answers that." | session-and-situation — decline located at 'oklahoma' |
| do you know what a dog is? | "I am AnSci. I am a small classical-AI system. I understand simple English statements and questions, and I answer from what I know, saying so when I don't." | verbalizer (completes) |
| i know who you are. | "Ok. Noted." | verbalizer (completes) |
| i know that you are here. | "Ok. Noted." | verbalizer (completes) |
| do you know my name? | "I can't answer that from what I know: I have nothing on name in what I know." | session-and-situation (control, unchanged) |
| do you know dogs? | "I can't answer that from what I know: I have nothing on dogs in what I know." | session-and-situation (control, unchanged) |
| who do you know? | "I can't answer that from what I know: nothing you have told me says what was known." | session-and-situation (control, unchanged) |

No acceptance probe stops at `lpu/parser`, and none draws the
rephrase request. The parse summaries name the construction:
probe 1's is `root 'know' (Wood, verb); nodes: i, who, you,
know` — 'know' retained as root in every row, and for the
that-clause the embedded clause stands in the graph as
you —predicated-as→ here under know —complement→ here, where
the baseline graph held only i and here with 'know' gone.

Two of the completions need a plain statement of what they are.
Probes 1 and 8 reach the verbalizer through the self-answer
path, because the embedded clause's predicated-as shape is one
SemanticAssessment's self-query recognition already reads — so
"do you know who i am?" (which asks after the *visitor*) and
"do you know what a dog is?" are answered with the system's own
identity text. That is a routing outcome downstream of this
slice's parse, and it is not a correct answer to either
question; routing the parsed know-questions — answering about
the complement's matter, or declining located at it — is the
programme's next slice (item 2), and this slice's bar was the
parse. What the parse changes is that the question now arrives
downstream whole, with its embedded clause in the graph, for
that routing to read. Probe 7 shows the shape of it: the same
construction, declined at a located point naming what is held.

The same turns are pinned in
`test/fork-transcript-slice1.test.ts` (10 tests: the lexicon
entry, the four probes' graph shapes, the that-clause root and
marker, the generalisation shapes, the NP controls, the
relative-'that' fallthrough, and the turn-level replies), so
the acceptance lives in the suite, not only in this run.

## Gates (delivered runs, this tree, after the final fix)

- Suite: **1073 pass, 0 fail** (ℹ tests 1076, ℹ skipped 3) —
  Slice 0's delivered run was 1063 pass / 0 fail (ℹ tests 1066,
  ℹ skipped 3); the difference is this slice's 10 new tests, and
  nothing else moved. The first full run of this slice failed
  two tests (1071 pass / 2 fail), both regressions of this
  slice's own making — the failed-attempt item leak and the
  'knows' matcher target described above — and both were fixed
  within scope and re-gated; no standing test was re-pinned.
- Demo **29/29** (27 exact round-trips); holdout **80/80
  parsed** ON (OFF 54/80), flipped fail→success 26, **0 parse
  regressions, 0 round-trip regressions**.
- Sense sets **A 11/11 · B 5/6** — unchanged.
- `npm run ai:check` OK (89 nodes, 22 cords, layout covers
  89 nodes).

All figures identical to Slice 0's delivered gates except the
suite count, which grew by exactly this slice's tests.

## What this does not show

The construction parses the know-questions; it does not answer
them. As recorded above, probes 1 and 8 currently complete
through a self-answer path that does not address what was
asked, and probe 9's statement is banked with a bare
acknowledgement — routing (programme item 2: answer about the
complement's matter from knowledge/record, or decline located
at it; "who am i?" and "do you know my name?" from the
Interlocutor register) is the next slice and was not touched
here. The about-phrase of probe 10 ("what do you know about
dogs?", IM3) is likewise untouched: it still parses as it did,
its about-phrase still outside the graph.

Claimed shapes are the ones stated: a complementiser or
wh-word *immediately* after the matrix verb. A that-less
complement ("i think you are here.") still misparses exactly
as at baseline — the embedded clause is taken as the main
clause — and a complement behind an intervening NP ("tell me
who i am.") still throws at the old site; both fall through
whole rather than taking a partial reading, and both are
recorded here as the construction's present edge, not papered
over. Embedded clauses are claimed in the copular and simple
verbal shapes listed; an embedded progressive, passive or
relative clause is not claimed. Nobody independent has checked
any of this; it is one build, one gate pass, on one commit.
