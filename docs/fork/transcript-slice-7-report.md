# Transcript Slice 7 — Located Decline for Construction Gaps — report (2026-11-19)

Slice 7 of the transcript fix programme commissioned from
the 2026-11-19 diagnostic probe: the located decline for
construction gaps (the probe report's fix-programme item 7,
which the report itself left as an owner decision, not a
build item). **Build-order numbering:** the programme's
slices are numbered in build order — Slice 0 (entity
grounding, commit 7347710), Slice 1 (clausal complement,
commit a92762f), Slice 2 (know-question routing, commit
4136866), Slice 3 (your-NP matter fix, commit 2cbfe3c),
Slice 4 (where-split, commit f1b2d82), Slice 5
(premise/Self-tables guard, commit 6fb9a20), Slice 6
(about-phrase, commit 7716b6e), and this slice, built
eighth and last in the build order. The Wikidata intake
the probe report's erratum schedules is a later slice in
the same programme and is **on hold by owner ruling**;
nothing in this slice touches it.

**Authority.** The diagnostic (SD4) found that a parser
failure is surfaced as "Could you put that another way?" —
the S4 whole-utterance rephrase (turn.ts, design §7d), a
request that by design never names the failure — which
locates the gap in the VISITOR's phrasing even when the
gap is the system's own construction inventory. The owner
ruled: **a system-side CONSTRUCTION gap surfaces as a
LOCATED decline, not an unnamed rephrase; the rephrase
request stays for genuine ambiguity.** This slice
implements that ruling, and records here that it **amends
the S4 design by owner ruling**, for the construction-gap
class only. Built in the worktree
`~/workspace/ansci-track-transcript` (branch
`track/transcript-fixes`, on Slice 6's 7716b6e). Local
commit; push waits for the owner's word.

## The path as found

The whole-utterance rephrase stands at the parse-failure
exit of `processTurnInner` (turn.ts): the merged parse
throws; segment recovery (C2) and the feelings-first
receipt (E1) each get their chance; then S4's trigger (d)
opens a candidate-less clarification pending and returns
"Could you put that another way?", with
`trace.declineReason` holding only "the sentence could not
be taken apart by the sentence layer". Slice 1 removed the
know-class instances of this (probes 1, 7, 8, 9 no longer
stop at the parser); the remaining population reaching
this exit is other unbuilt constructions, mixed with
unknown words, fragments and garble — which is why the
ruling needs a decidable distinction, not a blanket
rewording of the exit. (Two other rephrase sites exist and
are NOT this path: the token exit, §7a, where a successful
parse carries an unresolved token with no candidates —
that gap is already located at its token in the trace, and
the task's scope is the parse-failure path; and the
clarification re-ask, which replays a standing pending's
own question. Neither is touched.)

The evidence available at the exit, in code: the thrown
error's message (the parser's clause sites word themselves
"cannot parse complement / subject / copular question /
main clause / condition clause / existential subject of:
…", against "no verb found in: …" and the bei-passive's
lexicon wording); the error's token resolutions, already
filed on the trace; and the attestation check the token
exit already trusts (`isAttestedWord`, token-resolve.ts —
the C4 rule that a word the shipped lexicon attests is not
in doubt).

## What was built (turn.ts only)

**The classifier (`constructionGapOf`).** A parse failure
is recognisably a construction gap only when EVERY
condition holds — the bar is deliberately conservative:

1. **A clause-machinery failure**: the error matches one
   of the six "cannot parse …" clause sites above. "No
   verb found" is excluded by name: it cannot distinguish
   a fragment or garble from a verb the inventory lacks.
   The bei-passive throw is excluded: it names a missing
   lexicon entry, a word gap, not a construction.
2. **Every word attested**: each word of the surface
   passes `isAttestedWord`, with the token exit's own
   passes (a capitalised non-initial token is a name; a
   digit string attests by form). A sentence carrying an
   unattested word may be sinking on that word.
3. **No word guessed in**: no token resolution with a
   "corrected" or "segmented" outcome stands — where the
   matcher supplied a word, the surface as written was not
   established as well-formed. An "unresolved" record whose
   surface is itself attested (the C4 positional case,
   e.g. "whose") is no bar.
4. **A positive signature** of a named unbuilt
   construction matches the surface:
   - **(a) a clausal complement behind an intervening noun
     phrase** — a report verb (tell/ask/show) + a pronoun
     object + a wh-word + an embedded subject + a finite
     be/auxiliary in the embedded clause. This is Slice
     1's recorded fall-through, verbatim: Slice 1 built
     the complement directly behind the verb; the
     NP-intervening form ("tell me who i am.") was left
     throwing at the old site.
   - **(b) an infinitival subject clause** — "to" + a
     non-function word + a finite be + material after it
     ("to swim is fun."). The gerund form ("running is
     fun.") parses; the infinitival subject is not built.
   - **(c) a whose-question** — "whose" + a possessed NP +
     a finite be + material after it ("whose dog is
     this?"). The possessive question word heads no built
     question shape.

**The decline.** Where the classifier fires, the exit
returns the located decline instead of the rephrase:

> "I can't take that sentence apart: its shape is one my
> sentence layer doesn't build yet."

The wording is a **minimal draft in the system's
established decline voice** (the limit stated plainly,
then its ground — the form of "I don't have a place:
nothing in my situation record says where I am."),
**flagged the owner's to settle**, as every shipped
decline wording in this programme has been. The location
is carried in the trace by the standing conventions:
`trace.declineReason` names the construction gap and its
ground, and a new `trace.constructionGap` files the
recognised shape, the parse failure verbatim, and the
ground in words (the Slice 6 `aboutTopic` pattern). The
walk still stops at `lpu/parser` — the map now agrees
with a decline located there. **No clarification pending
is opened**: a located decline is not a clarification,
and the next turn is not its fill (pinned in the tests —
the turn after a decline is processed as itself, where
the turn after a rephrase is read against the pending).

## The boundary, stated exactly

**Decidable, and implemented:** the three signatures
above, under the four conditions. They are the classes
where the code's own evidence — machinery failure,
attested words, no guessed words, a positive unbuilt
shape — establishes that the sentence is well-formed and
the gap is the construction inventory.

**Undecidable in code, rephrase kept, not faked:**

- **Failures with no signature.** A truncated copular
  ("the dog is"), a copular question with no complement
  ("is the dog"), a lone subordinate clause ("who the dog
  is"), a truncated embedded clause ("tell me the dog
  is") all throw at clause sites with every word attested
  — and each may be a fragment the visitor abandoned
  rather than a shape the system lacks. No positive
  signature separates them from construction gaps, so
  they keep the rephrase (all pinned as controls).
- **"No verb found" failures.** "show the dog to me."
  (every word attested) and "the cat the dog the" reach
  the same wording; a fragment, garble, and a missing
  verb cannot be told apart there, so the whole wording
  class keeps the rephrase.
- **Sentences carrying an unattested or guessed word.**
  A well-formed sentence built on a rare word the
  attestation sources do not file (measured: "okapi" is
  unattested) is indistinguishable at this exit from a
  sentence sinking on an unknown word; both keep the
  rephrase.
- **The that-less complement never reaches this exit.**
  "i think you are here." — Slice 1's other recorded
  fall-through — does not stop at the parser at all: it
  silently misparses, rooted on 'here' with 'think' gone,
  and is answered "Ok. Noted." A parse-failure distinction
  cannot see a failure that does not happen; this slice
  does not pretend otherwise, and its behaviour is pinned
  unchanged in the tests as the recorded edge.
- **Embedded progressive/passive/relative complements**
  (Slice 1's third recorded family) no longer stop at the
  parser on this head — measured before building: "i know
  that you are being chased.", "i know that the dog is
  running." and "i think that the man who lives here is
  tall." all parse and are noted. Whatever they file is a
  parse-quality question, not this exit's.

**Genuine ambiguity and unresolvable input keep the
rephrase exactly as now** — the controls below include
the suite's standing rephrase cases (unknown-word and
garble inputs from the conversation-shapes, social and
S-programme tests, which pass unre-pinned).

## Acceptance (probe harness pattern, fresh store-less sessions, this tree's dist)

Construction inputs — verified to still stop at the
parser on Slice 6's head BEFORE any change (before-reply
and parse error recorded from that head), then re-run
after:

| Input | Before (Slice 6 head) | After |
|---|---|---|
| tell me who i am. | "Could you put that another way?" — `cannot parse complement of: tell me who i am.`, resolutions [] | "I can't take that sentence apart: its shape is one my sentence layer doesn't build yet." |
| tell me what a dog is. | "Could you put that another way?" — `cannot parse complement of: …` | the located decline |
| ask me who i am. | "Could you put that another way?" — `cannot parse complement of: …` | the located decline |
| show me who you are. | "Could you put that another way?" — `cannot parse complement of: …` | the located decline |
| to swim is fun. | "Could you put that another way?" — `cannot parse subject of: to swim is fun.`, resolutions [] | the located decline |
| whose dog is this? | "Could you put that another way?" — `cannot parse complement of: …` | the located decline |

The rephrase text is absent from every after-reply.
Trace evidence for the first row, verbatim:
`trace.constructionGap` = {shape: "a clausal complement
behind an intervening noun phrase", failure: "cannot
parse complement of: tell me who i am.", ground: "the
sentence's words are all attested and no resolution
guessed one in, the failure is the clause machinery's
('cannot parse complement'), and the surface carries the
signature of a clausal complement behind an intervening
noun phrase — a shape the sentence layer does not build;
the gap is the construction, located at the sentence
layer (lpu/parser) (Transcript Slice 7, owner ruling: a
system-side construction gap surfaces as a located
decline, amending S4's whole-utterance rephrase for this
class)"}; `trace.declineReason` = "the sentence could not
be taken apart by the sentence layer, and the failure is
a construction gap: " + that ground; walk
`["person", "lpu/parser"]`; no pending opened.

Controls — rephrase behaviour UNCHANGED, verbatim
"Could you put that another way?" before and after:
"Frobnicate the zanzibar splunge.", "Blorf wizzle
snarp.", "She acted in a film in blorpt." (the token-exit
rephrase), and the undecidable set "the dog is", "is the
dog", "who the dog is", "and then", "show the dog to
me.", "tell me the dog is".

**The 20 diagnostic probes:** on Slice 6's head, NONE of
the 20 still drew the rephrase (Slices 1–6 had already
cleared the four that did — probes 1, 7, 8, 9), so no
probe reply was eligible to change under this slice; the
full run after this slice reproduces every Slice 0–6
acceptance reply verbatim (probes 1–20 as on Slice 6's
tree). The acceptance therefore rests on the construction
inputs above, as the slice's commission anticipated. It
also lives in the suite: `test/fork-transcript-slice7.test.ts`
(8 tests: the three signatures and their generalisation,
the decline's trace and pending behaviour, the
unknown-word/garble controls with the pending lifecycle,
the undecidable-fragment controls, the that-less
boundary, and the Slice 0–6 control set).

## Gates (delivered runs, this tree, after the final fix)

- Suite: **1127 pass, 0 fail** (ℹ tests 1130, ℹ skipped
  3) — Slice 6's delivered run was 1119 pass / 0 fail
  (ℹ tests 1122, ℹ skipped 3); the difference is this
  slice's 8 new tests, and nothing else moved. No standing
  test was re-pinned: the standing rephrase cases (the
  conversation-shapes C2 controls, the social S4
  whole-utterance test, the S-programme S4b control) all
  carry unknown words or garble and pass as written.
- Demo **29/29** (27 exact round-trips); holdout **80/80
  parsed** ON (OFF 54/80), flipped fail→success 26, **0
  parse regressions, 0 round-trip regressions** — the
  regenerated `docs/fork/holdout-run.md` is byte-identical
  to Slice 6's, so it is not part of this commit.
- Sense sets **A 11/11 · B 5/6** — unchanged.
- `npm run ai:check` OK (89 nodes, 22 cords, layout
  covers 89 nodes). The registry (`ai-system/`) and
  `GAPS.md` are left unchanged, following slices 0–6: the
  classifier files under the turn layer's existing homes.

## What this does not show

The decline covers three named signatures, not the
construction inventory as a whole: an unbuilt shape with
no signature still draws the rephrase, and the report
above names the measured remainder rather than claiming
coverage. The signature list is a stated, extensible
inventory — a new unbuilt construction earns its decline
by being named and verified the same way, not by the
classifier generalising on its own. The decline says the
shape is not built; it does not build it — "tell me who i
am." is still not answered, only honestly declined, and
whether any of these constructions should be BUILT (the
NP-intervening complement is the obvious candidate, as a
Slice 1 extension) is a separate programme question this
slice does not decide. The shipped wording is a minimal
draft, the owner's to settle. Nobody independent has
checked any of this; it is one build, one gate pass, on
one commit.
