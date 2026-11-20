# Transcript Slice 3 — Your-NP Matter Fix — report (2026-11-19)

Slice 3 of the transcript fix programme commissioned from the
2026-11-19 diagnostic probe: the your-NP matter fix.
**Build-order numbering:** the programme's slices are numbered
in build order — Slice 0 (entity grounding, commit 7347710),
Slice 1 (clausal complement, commit a92762f), Slice 2
(know-question routing, commit 4136866), and this slice, the
programme's item 3 (fix the your-NP matter extraction), built
fourth. The Wikidata intake the probe report's erratum
schedules is a later slice in the same programme and is **on
hold by owner ruling**; nothing in this slice touches it.

The diagnosis (IM1, the implementation half of SD3):
assessment's your-NP self-fact shape — shape (d) of the C3
self-fact family in `src/ansci/assess.ts` — read its matter
positionally as `tokenAfter("your")`, because the graph drops
the possessed noun. In a two-word possessed NP that token is
the modifier, not the head noun, so "what is your last name?"
filed the matter "last" and the turn layer's hand denial
template (`selfFactDenial`, turn.ts) spoke it as a noun:
"I don't have a last." (probe 16). Probe 17 ("what is your
first name?") was the same mechanism with "first". Only the
exact token "name" routed to identity (probe 18, "what is
your name?" → "I am AnSci." via the full planner/generator
path). Built in the worktree `~/workspace/ansci-track-transcript`
(branch `track/transcript-fixes`, on Slice 2's 4136866).
Local commit; push waits for the owner's word.

## What was built

**The head-noun extraction (`src/ansci/assess.ts`, shape (d)).**
The shape now reads the possessed NP as a span: the tokens
after "your", running until the first function word
(`enIsFunctionWord` — determiner, preposition, auxiliary,
question word, modal, be-form or pronoun), and files the
span's LAST token as the matter — the NP's head noun, for
two-word and longer NPs generally. "your last name" files
"name", "your favourite colour" files "colour", "your rank"
still files "rank". No word is special-cased: first/last are
never named in the code, and the generality is pinned by
test ("middle name", "full name", "favourite colour").

**The name routing (same shape).** Where the head is "name":

- A bare name NP (span of one, "your name") sets
  `selfFactName` exactly as before and routes to the identity
  flavour — probe 18's path is untouched.
- A MODIFIED name NP ("last name", "first name", any
  modifier) files the matter "name" under the fact flavour.
  The act's `selfFact` field documents this reading
  (`src/ansci/semantic-object.ts`): "name" there marks a
  modified name NP, answered from the Identity table, not
  denied.

**The identity-derived answer (`src/ansci/turn.ts`).** In the
self-query branch's fact flavour, the matter "name" is
answered by a new composer, `selfNamePartAnswer`, beside
`selfFactDenial`: it requests the Identity table through the
Social Unit's one address (`requestIdentity`, social.ts —
the same address every self fact uses) and answers from the
one name the table holds, undivided. Every other matter
keeps the plain denial exactly as before, now naming the
actual possessed head noun because the matter itself is
corrected upstream.

**The shipped wording — MINIMAL / DRAFT, flagged.** The
answer shipped is:

> "I have only the one name, AnSci."

That is the minimal truthful form the mechanism needs: the
Identity table (`src/ansci/identity.ts`) holds one name,
"AnSci", with no first/last division, so a part-of-name
question is answered by saying so, with the name. **The
exact visitor-facing wording of Self facts is the owner's**
— identity.ts's own header records that the final text of
any visitor-facing claim about the system is his, and this
sentence is draft in exactly that sense, shipped so the
mechanism is complete and truthful, and flagged here and in
the code comment for him to settle or replace.

## Acceptance (probe harness pattern, fresh store-less sessions, this tree's dist)

Verbatim replies, one pass:

| # | Input | Reply |
|---|---|---|
| 16 | what is your last name? | "I have only the one name, AnSci." |
| 17 | what is your first name? | "I have only the one name, AnSci." |
| 18 | what is your name? | "I am AnSci. I am a small classical-AI system. I understand simple English statements and questions, and I answer from what I know, saying so when I don't." (unchanged — the identity path) |

Generality and controls, verbatim from the same run:

| Input | Reply |
|---|---|
| what is your middle name? | "I have only the one name, AnSci." |
| what is your full name? | "I have only the one name, AnSci." |
| What is your rank? | "I don't have a rank." (the existing C3 control, unchanged) |
| what is your favourite colour? | "I don't have a colour." (the corrected matter: the head noun, not "favourite") |
| what is your phone number? | "I don't have a number." |
| what can you do? | "I can talk over simple statements and questions. I remember what this conversation has established. I can explain what I based an answer on, in plain terms. My knowledge is small and fixed." (probe 5, unchanged) |
| who are you? | the identity text, as probe 18 (probe 6, unchanged) |
| how are you? | "I am fine." (probe 20, unchanged) |

Probes 16 and 17 carry no decline: the walk runs through
the self-answer branch on a plan note that names the source
("the Identity table holds one name, undivided, and the
answer is derived from it"), where before it ran the same
designed table path with a template fed the wrong matter.
The same turns are pinned in
`test/ansci-transcript-slice3.test.ts` (7 tests: probes 16
and 17 with the filed matter asserted on the act, the
modifier generality, probe 18's unchanged identity routing,
the one-word and longer-NP controls with their filed
matters, and the probe 5/6/20 control set), so the
acceptance lives in the suite, not only in this run.

## Gates (delivered runs, this tree, after the final fix)

- Suite: **1090 pass, 0 fail** (ℹ tests 1093, ℹ skipped 3) —
  Slice 2's delivered run was 1083 pass / 0 fail (ℹ tests
  1086, ℹ skipped 3); the difference is this slice's 7 new
  tests, and nothing else moved.
- Demo **29/29** (27 exact round-trips); holdout **80/80
  parsed** ON (OFF 54/80), flipped fail→success 26, **0 parse
  regressions, 0 round-trip regressions**.
- Sense sets **A 11/11 · B 5/6** — unchanged.
- `npm run ai:check` OK (89 nodes, 22 cords, layout covers
  89 nodes).

All figures identical to Slice 2's delivered gates except
the suite count, which grew by exactly this slice's tests.

## What this does not show

The fix corrects what the your-NP shape files and answers
the name-part questions from the Identity table; it does
not widen the shape's reach. The elliptical return with a
modified name NP — "What about your last name?" — is not
captured by shape (h) on this tree (its parse draws a verb
node, so the return reading, which requires none, stands
down, and the turn declines on an unrelated missing-role
ground); that is a parse/return-shape matter recorded here
as this slice's edge, not papered over. Name questions
whose head is a synonym rather than "name" itself do not
reach this mechanism either: "what is your surname?" never
arrives at shape (d) on this tree and keeps its prior
graph decline ("I have nothing on surname in my notes") —
whether a surname question should reach the Identity table
is a coverage call of the same kind the owner settles with
the name-part wording above. The
shipped name-part sentence is minimal draft wording, as
flagged. Nobody independent has checked any of this; it is
one build, one gate pass, on one commit.
