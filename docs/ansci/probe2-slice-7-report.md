# Probe-2 Slice 7 — The dictionary shape for a common-noun "what is a X?" (K2, owner ruling "1a")

**Date:** 2026-11-20 · **Branch:** `track/probe2-fixes` · **Base:** `a093f57` + Slices 1–6
**Commission:** the owner's "1a" (2026-11-20) on the question the
diagnostic left open — why "what is a capital?" answered with Marx's
*Capital* instead of going to the dictionary.
**Attribution:** K2 (knowledge/sense) as corrected by the code trace
and the erratum appended to the diagnostic report the same day: the
gloss's source is WordNet instance synset wn-n07425466 via
`entities.ts` grounding, NOT CSKG material; and the deeper finding
is that no dictionary route existed at all — no answering shape read
a regular synset's gloss, so the entity shape (the only gloss route)
answered a common noun with the instance's gloss whenever an
instance synset shared the lemma. The route never passed through
sense selection (a direct lemma→record map), which is why the Lesk
seam could not catch it.

## What was built

- **`dictionary.ts`** (new) — the dictionary store and the sense
  choice. An **ordinary sense** of a lemma is a noun synset that
  passes two tests read off the dictionary itself: it is not an
  instance synset (entities.ts's mark — the entity route's), and it
  carries the lemma in its lowercase form, the casing the
  dictionary gives a common noun. The second test is what keeps a
  regular synset that files a NAME out of the dictionary: the genus
  "Paris" (lemmas "Paris" / "genus Paris") and the legendary
  "Atlantis" are regular synsets, but no lemma of theirs carries
  the word lowercase — there is no lowercase word "paris" for the
  genus to be a sense of. Senses are enumerated exactly as the
  lexicon enumerates them — `synsetsForLemma` order filtered to
  the noun synsets, numbered from 1 (the climb's "[n sense N]",
  lesk.ts's sense index) — and `chooseDictionarySense` picks the
  first ordinary sense unless Lesk promotes a later one (below).
  Provenance is wordnet-retrieved; the chosen synset's id rides on
  every choice.
- **`turn.ts`** — the dictionary shape inside the entity shape's
  own block in `answerPredicateQuestion` (same conditions:
  predicate "what", not why, no of-phrase anchor, subject
  unclassified), ahead of the `lookupEntity` consultation, with
  `trace.dictionaryAnswer` cited like the entity answer's synset
  and the map path reading it off the correspondence graph, as
  the entity answer's does. Placement there — not earlier — is
  the no-pre-emption guarantee: the definitional/classification
  answers above and the derivation below are untouched, and the
  unanchored-definite branch still stands between the question
  and both gloss shapes ("what is the capital?" still asks after
  its referent).

## The stand-down rule (the operationalisation, stated)

The entity shape stands down when the lemma carries ordinary
senses AND the question is not name-shaped. Name-shaped is read
off the turn's own evidence:

- **No ordinary senses** → name-shaped by construction. The word
  has no common-noun life to define: all its noun synsets are
  instances ("oklahoma", "texas"), or its only regular synsets
  file a name ("paris", "atlantis").
- **The subject phrase stands capitalised in the question** →
  name-shaped. In this shape the subject never opens the
  sentence, so a capital on the phrase is the asker's own
  name-mark, in the form the parse preserves — on the head, or on
  a qualifier ("Das" in "Das Kapital", whose head's form follows
  its lemma). Grounding is untouched: capitalisation still
  manufactures no entity (Atlantis capitalised still declines);
  it only routes between two records already held.

A lowercase common noun with ordinary senses is
dictionary-shaped, and the entity record under its lemma —
Marx's book for "capital", the republic for "turkey" — is not
what the question asks.

## Sense order — one honesty note

"First sense" is first in the system's own dictionary
enumeration (above). Verified against the shipped extract while
building: that enumeration coincides with synset-offset order in
the extract's arrays, and it is NOT WordNet's corpus-frequency
order — blizzard's storm sense is frequency-first but stands
second here; capital's money senses stand seventh and eighth.
So "what is a capital?" answers with the column-top gloss (n
sense 1), not "a seat of government" (n sense 5). That is the
dictionary this system actually holds, in the only order its
other readers (the climb, Lesk, the entity index) have ever
used; the extract carries no frequency order to re-sort by.
Whether the owner wants the enumeration itself revisited is a
separate question from this slice — flagged, not decided here.

*(Amendment, same day: the owner answered the first-sense
question differently — a many-sensed word is not answered by
its first sense at all; the no-winner case now LISTS all the
ordinary senses, in this enumeration order. The order itself
is unchanged and still governs the listing. See
`probe2-slice-7-amendment-report.md`.)*

## The Lesk discipline (mirroring sense.ts)

The first ordinary sense is the standing answer. Lesk
(`leskSenseScores`) may promote a later sense ONLY on
gloss-overlap evidence from the conversation (the prior turns'
lemmas, in the record's grain, plus the question's own other
words):

- a sense's evidence is its overlap alone
  (sentenceScore + CONTEXT_GLOSS_WEIGHT × contextScore); the
  most-frequent-sense prior inside Lesk's total is never
  counted — in this shape the dictionary order IS the prior,
  and counting it again would let frequency, not evidence,
  move the answer;
- promotion requires the challenger's evidence to be positive,
  strictly greater than the first sense's, and uniquely the
  greatest among the later senses — a tie at the top is the
  evidence declining to discriminate, and the first sense
  stands, exactly as a Lesk tie changes nothing in sense.ts.

Pinned behaviour: after "the river runs to the sea.", "what is
a bank?" answers with the riverbank sense (wn-n09378458,
evidence 4.5 against the ridge sense's 3.25 and the first
sense's 1.5). Most river contexts leave the ridge and riverbank
senses tied, and then nothing is promoted — the test's context
is the one whose evidence discriminates, and the test says so.

## Acceptance

| Case | Result |
| --- | --- |
| "what is a capital?" | **"Capital is the upper part of a column that supports the entablature."** (wn-n03003474, first-sense) — never Marx *(superseded by the amendment: the six ordinary senses are now LISTED — see the amendment report)* |
| "what is capital?" (bare) | the same dictionary answer *(superseded likewise: the listing)* |
| "what is oklahoma?" | **byte-for-byte the entity answer** ("Oklahoma is a state in south central United States."), entity route entire |
| "What is Capital?" | the entity answer (Marx) — the asker's own capital makes it name-shaped |
| "what is Das Kapital?" | the entity answer (Marx) — the capital stands on the phrase's qualifier |
| "what is das kapital?" | the dictionary answer — **recorded limit**: the multiword lemma is not a parse unit (the parse draws subject 'capital' with 'das' qualifying it, and no "das kapital" lemma is constructed here, per commission); lowercase, the asking is indistinguishable from a lowercase qualified common noun *(the dictionary answer is now the listing)* |
| "what is a bank?" (no context) | the first ordinary sense (wn-n00165946, the flight maneuver) *(superseded by the amendment: all ten ordinary senses are listed)* |
| "what is a bank?" after a river conversation | the riverbank sense, via Lesk (above) |
| "what is turkey?" / "What is Turkey?" | the bird, from the dictionary / the republic, from the entity record *(the lowercase half is superseded by the amendment: turkey's four ordinary senses are listed, the bird first)* |
| "what is paris?" | the city, from the entity record — the genus is not an ordinary sense (entity acceptance, Slice 0, stands) |
| "what is atlantis?" | the standing decline, located at the name — ungrounded, and the dictionary only files it capitalised (Slice 0's honest edge stands) |
| "what is salt?" / "what is a dog?" / "what is happiness?" | unchanged — classified subjects keep their routes; the shape's own conditions exclude them |
| "what is the capital of oklahoma?" (V8) | unchanged — the of-phrase stand-down still routes it to the knowledge decline |
| "what is the capital?" | unchanged — the unanchored-definite branch still asks after its referent |

**Control change, reported as commissioned:** V1 "what is
real?" no longer declines. 'real' is unclassified and carries
three ordinary noun senses, so the dictionary answers: **"Real
is an old small silver Spanish coin."** (wn-n13621112). V3
"what is happiness?" is unchanged (classified, emotion — the
shape never sees it). The Slice 2 Family V pin for V1 was
updated under a recorded supersession, in that file's own
convention.

*(Amendment, same day: the V1 reply is superseded again — the
three senses are now listed: "Real has 3 senses in my
dictionary: (1) an old small silver Spanish coin; (2) the
basic unit of money in Brazil; equal to 100 centavos; (3) any
rational or irrational number." The Slice 2 pin carries the
second supersession.)*

## Draft wordings — OWNER'S TO SETTLE

The reply form, flagged in code: `<Word as asked, capitalised>
is <gloss>.` — it mirrors the entity answer's form ("Oklahoma
is a state in south central United States."). One consequence
of mirroring it exactly: glosses that open with a bare noun
phrase read without an article ("Turkey is large gallinaceous
bird with fan-shaped tail; …") — the entity answer has the
same property with its glosses, and no article was invented
here to smooth it.

*(Amendment, same day: a second draft form joins this one —
the listing: `<Word as asked, capitalised> has N senses in my
dictionary: (1) <gloss>; (2) <gloss>; …` — also the owner's
to settle, and recorded in the amendment report with the
stood-down decline's new clause.)*

## Two doors left as they stand (recorded, not built)

The same collision is reachable through two other readers,
outside this slice's commissioned shape: the know-complement
("do you know what capital is?" → "Yes. Capital: Critique of
Political Economy is …", Transcript Slice 2's reader) and the
where-reader ("where is a capital?" answers with the same
gloss). Both consult `lookupEntity` for their own shapes;
extending the dictionary stand-down to them is the owner's
call, not this slice's.

## Pin bookkeeping

One pin superseded: Slice 2's Family V entry for "what is
real?" (above), updated in place with the supersession
recorded. The five failures the first full-suite run showed
(atlantis ×3, paris, the V1 pin) are what produced the
ordinary-sense casing test: the first implementation treated
every non-instance synset as a dictionary sense, and the
suite's standing acceptance (paris the city, atlantis the
decline) is what the casing test now preserves — pinned in
this slice's tests at both the store and the turn level.

## Gates (fresh complete runs, this branch)

| Gate | Result |
| --- | --- |
| Full suite | 1337 tests / 1334 pass / 0 fail / 3 skipped |
| Demo (`ansci:demo`) | 29/29 expectations met |
| Holdout (`ansci:holdout`) | 80/80 parsed, 0 parse / 0 round-trip regressions |
| Sense challenge | Set A 11/11 · Set B 6/6 |
| `ai:check` | OK (system-map 100 nodes; root page OK) |

(Baseline at Slice 6: 1318 / 1315 / 0 / 3 — this slice adds 19
tests and changes no other gate figure.)

## Files

- `src/ansci/dictionary.ts` — new: the ordinary-sense store,
  the Lesk-disciplined choice, wordnet-retrieved provenance.
- `src/ansci/turn.ts` — the dictionary shape inside the
  entity block, `trace.dictionaryAnswer`, the map-path entry.
- `test/ansci-probe2-slice7.test.ts` — 19 tests (the store,
  capital in all its forms, oklahoma byte-for-byte, the
  paris/atlantis acceptance, the turkey pair, first-sense
  and Lesk-promoted bank, classified controls, the V1
  change, the unanchored control).
- `test/ansci-probe2-slice2.test.ts` — the V1 pin under the
  recorded supersession above.
- Outside the repo: the erratum appended to
  `~/workspace/ansci-diagnostic-probe2-2026-11-20/REPORT.md`
  (K2's attribution corrected: WordNet instance synset
  wn-n07425466 via entities.ts, not CSKG; the deeper
  finding — no dictionary route existed — and this slice
  as the fix). No commit covers that file; it is not in
  the repo.

## Amendment (same day, the owner's two rulings)

This slice was amended the day it landed, on the owner's
rulings quoted in `probe2-slice-7-amendment-report.md`: the
many-sensed no-winner case now lists all the ordinary senses
instead of answering the first, and the one fall-through by
which a definition-determined turn could still surface an
instance gloss (the stood-down consultation's decline) is
closed. The supersession notes above mark every pin that
moved; the Lesk discipline, the stand-down rule and the
determination itself are unchanged — the amendment report is
the record for both changes, the audit behind the second, and
the listing lengths measured for a possible cap.
