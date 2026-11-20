# Probe-2 Slice 7 — Amendment: the listing, and ruling (2) on every path

**Date:** 2026-11-20 · **Branch:** `track/probe2-fixes` · **Base:** `e4c9993` (Slice 8)
**Commission:** the owner's two rulings on the Slice 7 report, given the
same day the slice landed:

> (1) "'What is a capital?' ambiguity resolution can just list all
> answers for this case of ambiguity. 'What is a capital' has so many.
> Answering the first isn't right."
>
> (2) "It has nothing to do with Marx if it is determined this is a
> definition answer." — with the refinement: "unless capital is
> capitalized": the determination key is the word's **surface form in
> the question**; capitalised where capitalisation is meaningful (not
> sentence-initial), the question is name-shaped and the entity route
> governs; lowercase, the turn is a definition answer and instance
> synsets are excluded entirely.

This amendment changes one slice's behaviour in two places and audits
a third. Nothing else in the programme moved.

## What changed

### 1. The listing (`dictionary.ts`, `turn.ts`)

`chooseDictionarySense` now returns three forms of answer instead of
two:

- **one ordinary sense** → that sense answers alone (`via`
  "first-sense", unchanged);
- **a Lesk winner** → that sense answers alone (`via` "lesk",
  unchanged — the strictly-and-uniquely-greater positive-evidence rule
  is exactly as Slice 7 built it; the riverbank pin did not move);
- **several ordinary senses, no winner** → **`via` "listing"**: the
  reply lists ALL the ordinary senses, numbered in the dictionary's
  enumeration order, each with its gloss. As first built, this case
  answered the first sense standing; that is the behaviour ruling (1)
  supersedes.

There is **no cap** on the list's length. The measured lengths for
the extract's most polysemous nouns are recorded below, so a cap —
if the owner wants one — is set with real numbers.

The trace records the distinction in the trace's existing style:
`trace.dictionaryAnswer.via` is `"listing"`, and the record carries a
`senses` array (every listed sense's synset id, sense number and
gloss, in order) beside the head fields, which cite the first sense.
A listing is thereby distinguishable in any later trace reading from
a chosen sense: it is the evidence declining to discriminate, not a
choice.

### 2. Ruling (2) closed on the fall-through (`turn.ts`)

The audit (next section) found exactly one path by which a
definition-determined turn could still surface an instance gloss:
the **missing decline below the entity block**. When a wired
Wikidata consultation is set on the session for the subject in the
country shape, both gloss shapes stand down (the union composition
Slice 7 inherited), the turn falls through to that decline, and the
decline quoted the entity record — *"I have capital in my notes as
a book written by Karl Marx (1867) describing his economic theories,
but nothing that connects it to 'what'"*. The wrapper
(`wikidata-turn.ts`) keeps that decline as the reply on its
ambiguous and no-resolution outcomes, so the gloss reached the
visitor. Verified against the pre-amendment build by setting the
consultation on a session exactly as the wrapper sets it.

The fix is at the determination, not at the text: the block now
records the determination it made (`dictionaryDetermination`:
ordinary senses exist, the asking not name-shaped) on a variable the
decline site can read, whether or not the answer itself stood down.
A definition-determined subject's decline is worded from the
dictionary — *"I have capital in my dictionary with 6 ordinary
senses, but nothing that connects it to 'what'"* — and the instance
gloss is not quoted. The entity-worded decline stands for every
subject the determination does not cover (a grounded name asked
about as a name, stood down by the same consultation, keeps Slice
0's wording: there the gloss IS what is held on the subject).

## The determination, and the two casing tests

The follow-up asked whether the question-surface test and the synset
casing test can diverge, and directed that the question's surface
govern. Checked against the implementation:

- **The surface test already governs the determination wherever
  there is a determination to make.** `nameShaped` in `turn.ts` is
  read off the question: the subject phrase capitalised as it stands
  in the question (on the head, or on a qualifier — "Das"), in a
  shape where the subject never opens the sentence, so the capital
  is the asker's own mark. Where ordinary senses exist, that test —
  and only that test — routes between the dictionary and the entity
  record. The pinned pair holds and is re-pinned below: "what is
  Capital?" (mid-sentence capital) → the entity record (Marx);
  "what is capital?" / "what is a capital?" → the definition listing,
  no Marx.
- **The synset casing test does a different job and cannot
  diverge from the surface test, because it never routes.** It
  bounds WHICH synsets are ordinary senses: a synset counts only if
  one of its lemmas carries the word lowercase. That is what keeps a
  name the dictionary files as a word — the genus "Paris", the
  legendary "Atlantis" — out of the sense set. Its one visible
  consequence is at the boundary the surface test cannot reach: a
  lowercase asking whose word has NO lowercase-carrying synset
  ("paris", "atlantis") has no definition to draw — the dictionary
  holds no common noun under that spelling — so the word is
  name-shaped by construction and keeps the entity route or the
  decline. That is not the synset test overriding the surface; it is
  the dictionary's contents bounding what a definition answer can be
  drawn from. The governance is now stated in the code at the
  determination site.

## The audit for ruling (2) — what was checked

Every site where an instance synset's gloss can reach a reply was
read, and each was asked one question: can a definition-determined
turn (the dictionary shape's conditions: predicate "what", bare
unclassified subject, ordinary senses exist, not name-shaped) arrive
here?

| Site | Verdict |
| --- | --- |
| The dictionary shape itself (`turn.ts`) | Answers from `ordinaryNounSenses` only — instances are excluded at the store (`dictionary.ts`: non-instance + lowercase-carrying). Clean by construction; this amendment's listing draws on the same set. |
| The entity shape in the same block | Reached only when the asking is name-shaped or the lemma has no ordinary senses — never for a definition-determined turn. Standing, by the determination itself. |
| **The missing decline below the block** | **Was reachable** — via the consultation stand-down above. **Closed** (see §2). Pinned by a new test that sets the consultation as the wrapper sets it. |
| The derivation path below the block | Needs a Quality node for the predicate "what"; none exists, and a definition-determined turn's only exits are the block's answers or the decline (the probe of the stand-down case lands in the decline, not a derivation). Clean. |
| The IMP-2 fallthrough decline ("I have X as \<gloss\>, but nothing in what I know answers that") | Serves unrouted content questions — a different determination (Slice 0's design: name what is held). A "what is a X?" never reaches it: the predicate-question machinery returns first. Standing, stated here so the record shows it was read. |
| The where-reader ("where is a capital?") and the know-complement reader ("do you know what capital is?") | Their own determinations, not the dictionary shape's — the two doors Slice 7's report recorded as left standing, the owner's call. Not closed here: neither turn is determined to be a definition answer by the machinery this amendment governs. Flagged again, unchanged. |
| The of-phrase decline ("what is the capital of oklahoma?") | Slice 4's determination: a relational-value question, not a definition answer; its decline quotes the head noun's entity record under Slice 0's decline design. The stand-down is pinned untouched by this amendment's commission. Flagged here for the owner's eye, unchanged: it is the one remaining reply in which the Marx gloss is quoted outside a name-shaped asking — quoted as what the notes hold on "capital", in a decline about Oklahoma, not as an answer to a definition question. |

One more mid-way case was checked in the code: `chooseDictionarySense`
cannot decline after the block has committed to it — it returns
undefined only when the lemma has no ordinary senses or the extract
cannot load, and the block calls it only after
`ordinaryNounSenses` (same extract) returned a non-empty set. There
is no fall-through from inside the dictionary answer itself.

## Acceptance

| Case | Result |
| --- | --- |
| "what is a capital?" | **"Capital has 6 senses in my dictionary: (1) the upper part of a column that supports the entablature; (2) one of the large alphabetic characters used as the first letter in writing or printing proper names and sometimes for emphasis; (3) a seat of government; (4) a center that is associated more than any other with some activity or product; (5) wealth in the form of money or property owned by a person or business and human resources of economic value; (6) assets available for use in the production of further assets."** — the listing; Marx not in it, not mentioned |
| "what is capital?" (bare) | the same listing |
| "what is real?" (V1) | **"Real has 3 senses in my dictionary: (1) an old small silver Spanish coin; (2) the basic unit of money in Brazil; equal to 100 centavos; (3) any rational or irrational number."** — supersedes Slice 7's coin-only answer |
| "what is a bank?" (no context) | the listing of all 10 ordinary senses |
| "what is a bank?" after "the river runs to the sea." | the riverbank sense alone, via Lesk — **unchanged** |
| "what is turkey?" (lowercase) | the listing of its 4 ordinary senses (bird first) — supersedes Slice 7's bird-only pin; "What is Turkey?" still the republic, entity route |
| "what is Capital?" | the entity answer (Marx) — **unchanged**: the asker's capital makes it name-shaped |
| "what is Das Kapital?" | the entity answer (Marx) — **unchanged** |
| "what is das kapital?" (lowercase) | the dictionary listing — the recorded limit stands (the multiword lemma is not a parse unit) |
| "what is oklahoma?" | byte-for-byte the entity answer — **unchanged** |
| "what is capital?" under a wired country consultation for "capital" | the dictionary-worded decline (above) — no instance gloss; **new pin** |
| "what is paris?" / "what is atlantis?" / classified subjects / "what is the capital?" / "what is the capital of oklahoma?" | **unchanged** |

## Listing lengths — the measurement for a cap decision

Ordinary noun senses in the shipped extract, counted by
`ordinaryNounSenses` and pinned in the tests so a future extract
change re-measures loudly:

| Lemma | Senses | Lemma | Senses |
| --- | --- | --- | --- |
| head | 33 | bank | 10 |
| line | 30 | match | 9 |
| point | 26 | seal | 8 |
| set | 12 | date / club / school | 7 |
| capital / spring / rock / watch | 6 | real | 3 |

A "what is a head?" today would speak a 33-item list. That is the
honest consequence of ruling (1) with no cap; whether a cap (or a
first-few-plus-count form) is wanted is the owner's call, now with
the numbers in hand.

## Draft wordings — OWNER'S TO SETTLE

- The listing form, flagged in code: `<Word as asked, capitalised>
  has N senses in my dictionary: (1) <gloss>; (2) <gloss>; …` One
  typographic note: a gloss may itself contain a semicolon (the
  extract's own punctuation — bank's first sense does), so the
  numbering, not the punctuation, carries the list's structure.
- The stood-down decline's new clause: "I have X in my dictionary
  with N ordinary senses, but nothing that connects it to 'what'" —
  Slice 0's decline sentence with its first clause re-grounded on
  the dictionary determination.

## Pin bookkeeping

Superseded pins, each updated in place with the supersession
recorded: Slice 7's own tests for "what is a capital?", "what is
capital?", "what is das kapital?", "what is a bank?" (no context),
`chooseDictionarySense` no-context, "what is turkey?" (lowercase),
and V1 "what is real?"; and Slice 2's Family V pin for "what is
real?", superseded for the second time (Slice 7, then this
amendment). Two tests added: the consultation fall-through pin and
the listing-length measurements. `probe2-slice-7-report.md` carries
matching supersession notes at its moved pins.

## Gates (fresh complete runs, this branch)

| Gate | Result |
| --- | --- |
| Full suite | 1351 tests / 1348 pass / 0 fail / 3 skipped |
| Demo (`ansci:demo`) | 29/29 expectations met |
| Holdout (`ansci:holdout`) | 80/80 parsed, 0 parse / 0 round-trip regressions |
| Sense challenge | Set A 11/11 · Set B 6/6 |
| `ai:check` | OK (system-map 100 nodes; root page OK) |

(Baseline at `e4c9993`: 1349 / 1346 / 0 / 3 — this amendment adds 2
tests and changes no other gate figure.)

## Files

- `src/ansci/dictionary.ts` — the choice gains the "listing" form;
  the header's discipline section rewritten for the two rulings.
- `src/ansci/turn.ts` — the listing reply and trace record; the
  determination carried to the decline site, and the decline's
  dictionary wording; the governance of the two casing tests stated
  at the determination site.
- `test/ansci-probe2-slice7.test.ts` — the moved pins under recorded
  supersessions, plus the fall-through pin and the measurements.
- `test/ansci-probe2-slice2.test.ts` — the Family V pin for "what
  is real?", superseded again.
- `docs/ansci/probe2-slice-7-report.md` — supersession notes at the
  moved pins.
