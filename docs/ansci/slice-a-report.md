# Slice A report — creature-class climb stops (2026-11-18)

Slice A of the B-bucket anchor expansion (proposal:
`~/workspace/ansci-coverage-measurement/anchor-expansion-proposal.md`;
design: `slice-a-design.md` in the same folder; owner's rulings
1a–5a, 2026-11-18). Built in the fork's chat-build tree; base files
verified byte-identical to main before the build began.

## What was built

The WordNet climb gained a second kind of hit. Ten taxonomic
synsets are registered in `src/ansci/classify.ts` as stops for the
Yueling creature classes of prediction rule P2
CREATURE_CLASS_YUELING_V1 — bird → feathered, mammal → furred,
insect / fish / snake / lizard → scaled, turtle / crustacean /
bivalve / gastropod → shelled — with the class → element mapping
stated once as data (`CREATURE_CLASS_ELEMENTS`) and two exclusion
records (the human subtree and the cetacean subtree inside
mammal), each with its grounds written out. When a sense's climb
reaches a stop synset without its path passing an excluded
synset, the sense gains a class candidate: the class's element,
aspect "animal", priced flat at P2's cap of 0.80 with no per-hop
decay (ruling 2a), the derivation named in the candidate's path
(`—CLASS→ … ⇒ furred (Metal, CREATURE_CLASS_YUELING_V1 @0.8)`)
and in a `viaClass` field on the result. The stops are id-keyed;
there is no string-match route to a class. The classification
table itself gained no entries — stops are climb infrastructure,
and `lookupClassification` never returns them. Table-owned
concepts still never climb, so the five-livestock assertion row
continues to outrank the class rule structurally.

Assignment is by the tradition's own basis — the recognised kind
(habitat and general form), never anatomical feature-checks; no
stop and no audit step inspects a specimen's features. The
catfish files as a fish, as it does in the Chinese system.

The mollusk shape (ruling 5a) was settled by the audit dump, as
delegated: the mollusk subtree (86 synsets) also holds the
cephalopods, which no P2 leg names, while bivalve (35) +
gastropod (34) capture every measured shelled token. The stops
therefore sit at bivalve and gastropod, and there is no mollusk
stop.

## Gates, as run

- **Pinning audit for the class synsets** — `npm run
  fork:anchor-audit` now prints a creature-class section and
  writes `docs/ansci/class-stop-dump.json` (every stop's full
  subtree, eyeballed before the data was finalised). Impurities
  found and resolved: the human and cetacean subtrees inside
  mammal → exclusion records; the cephalopods inside mollusk →
  the deeper-stops shape above; chitons and scaphopods (shelled
  kinds outside both mollusk stops) stay unreached, named below.
  On the census population (8,094 lemmas), class candidates were
  eyeballed in the distinct-element list: every one traces to a
  genuine animal sense of its lemma (amazon the parrot, crab the
  louse, swift the lizard, queen the cat and the insect). No
  class candidate appeared on a non-animal sense.
- **Suite** — 710 tests in this tree (698 before this slice's
  tests). The 12 new tests in `test/ansci-class-climb.test.ts`
  pass (candidate shape and path, flat pricing at 5 hops,
  exclusions not firing for whale / porpoise / narwhal / human,
  the dolphin split — whale sense withheld, dolphinfish sense
  files scaled — table-owned chicken not climbing, concrete
  anchors still winning their senses (kid → goat, hen →
  chicken), and the located gaps staying gaps: silkworm, frog,
  spider, yak). The first full run stood at 709/710: the one
  failure was the anchor-pinning suite's stock test, whose name
  asserted the broth baseline "stands unopposed" — Slice A
  changed that premise (the livestock sense's Metal class
  candidate now stands beside the broth Water; the test's actual
  claim, that blood's lineage synset supplies no Fire rival,
  still holds). The test was corrected to the new truth, in the
  test and not the mechanism; the confirming full re-run then
  passed 710/710.
- **Demo corpus** — 29/29, 27 exact, unchanged.
- **Sense sets** — A 11/11 unchanged. **B 5/6, down from 6/6** —
  see "The one regression" below.
- **Parser holdout** — 80/80 parsed, unchanged; no parse
  regressions. One round-trip difference ("Why do people get
  headaches?" round-trips exactly only with the provider off)
  was checked: no word in that sentence has any climb candidate,
  class or anchor, so the slice's mechanism cannot be its cause;
  it is a provider on/off effect of the pre-existing kind. The
  holdout also shows the slice working: "Where would I find a
  penguin?" is among the sentences the provider arm parses.
- **Coverage re-measurement** — the original instrument
  (`measure.mjs`) run with the population held identical and the
  climb taken from this build: **D 432 → 517 (15.2% → 18.2%)**,
  all of the movement in the climb sub-kind (70 → 155); B 2,127
  → 2,034; A unchanged at 273.

## The B-animal accounting (95 tokens)

80 of the 95 tokens with animal ancestry moved out of B:

- **77 to D** — 76 of them carrying a class candidate with the
  creature class named in its climb path (furred 22, feathered
  20, scaled 24, shelled 10), plus "mammals", the mammal stop
  synset's own plural surface (its singular takes the furred
  class at hop 0, as does "bird" the feathered).
- **3 to C** (divergent senses — arbitration work, honestly
  labelled): crab (crustacean Water, insect Wood — the louse
  sense), peacock (bird Fire, insect Wood — the butterfly),
  tortoiseshell (mammal Metal — the cat, insect Wood — the
  butterfly).

15 stay in B, each accounted for:

- **No P2 leg** (owner's ruling 3a — left T5 as located gaps for
  a future ruling): frog, toad (amphibians), spider, scorpion
  (arachnids), earthworm, leech (worms), coral, jellyfish
  (cnidarians).
- **Cephalopods, by the audit-chosen shape**: octopus, squid —
  they reach the mollusk synset, which is deliberately not a
  stop; no P2 leg names their kind.
- **Taxonomy shape**: silkworm — the tradition's own scaled
  exemplar, but its WordNet chain runs through larva and
  moth-family synsets that never pass the insect synset. A
  Slice D (per-word overlay) case, if anywhere.
- **No leg and no route**: centipede.
- **The category word itself**: animal, animals — classlessness
  is the correct result for the word that names the whole set.
- **Beyond the bound**: yak — mammal at 8 hops; the 6-hop bound
  was kept (ruling 2a's terms), and this is its measured cost.

The design's scope estimate was 82; the measured outcome is 80.
The difference is exactly octopus and squid, which the estimate
counted through a mollusk stop that ruling 5a then replaced with
the deeper stops.

## The one regression

Sense set B's stock item — "The stock simmered in the pot.",
expected Water (broth) — now fails. Stock's livestock sense
climbs to the mammal stop and gains a Metal candidate at the
same 0.80 as the broth candidate; the sentence gives neither
sense any support (support reads Metal 0, Water 0), and the
sense pass falls back to the isolated best, which is now the
class candidate. No exception or exclusion was taken to protect
the set: the livestock sense is a real sense of the word and its
class candidate is a legitimate classification of that sense.
What the failure exposes is the arbitration's tie behaviour —
with zero support on both sides it still produces a guess
instead of abstaining. That sits in the same family as the
already-recorded v2 direction (generation support runs in both
directions); abstention on support-free ties is now recorded
alongside it in `docs/ansci/sense-challenge.md`, whose census and
stock paragraphs were corrected to the post-slice figures in
this build. Whether to commission that arbitration work is a
separate decision; nothing in this slice touches `sense.ts`.

## What this does not show

- The new candidates' effect on open conversation is untested
  beyond the instruments above; the sets are small and
  builder-authored, as their own reports state.
- The class rule's accuracy against the tradition is inherited
  from P2's registration, not re-measured here; the livestock
  disagreements P2 already records (cattle, sheep, dog) stand
  as the known limit of class-level prediction, and this slice
  adds subtree members at the same grading without per-animal
  verification — eyeballing a subtree dump checks kind
  membership, not each member's traditional placement.
- Nobody independent has checked any of this.

## Files in this slice

`src/ansci/classify.ts` (stop/exclusion data),
`src/ansci/wordnet-lex.ts` (climb branch, `viaClass`,
`classStopReport`), `test/ansci-class-climb.test.ts` (new),
`test/ansci-anchor.test.ts` (the stock test's premise corrected,
see the suite gate above),
`scripts/ansci-anchor-audit.mjs` (class-stop section),
`scripts/ansci-sense-challenge.mjs` (census and stock text
corrected), `docs/ansci/class-stop-dump.json` (new),
`docs/ansci/anchor-audit-dump.jsonl` (regenerated),
`docs/ansci/sense-challenge.md` (regenerated),
`docs/ansci/holdout-run.md` (regenerated), and this report.
