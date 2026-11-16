# Anchor audit — the WordNet climb's wayward paths, repaired

2026-11-15. Slice 2 of the four-slice commission. What this document
is: a plain account of what the audit tool found in the hypernym
climb, the repair that was made, the numbers before and after, and
what the repair does not fix. The tool is
`scripts/fork-anchor-audit.mjs` (`npm run fork:anchor-audit`); it
runs the real climb (`climbAudit` / `climbCandidates` in
`src/fork/wordnet-lex.ts`, not a replica) and writes every
candidate it finds, with its full synset trail and glosses, to
`docs/fork/anchor-audit-dump.jsonl`. Nobody independent has checked
any of this; the frozen sense sets and the test suite are the only
witnesses, and both were authored inside the project.

## What the audit found

The climb's anchor test was a lemma-string match: a synset counted
as carrying an anchor concept if any of its lemmas spelled the
concept's name. A concept's name, though, denotes its classified
sense in only some of the synsets that carry the string. The five
wayward examples named by the stage-4 report all fail this way —
one mechanism, five costumes:

- **rock → Earth via "sweet".** Rock's stone senses climb nowhere.
  The candidate came from sense 3, {rock candy, rock} ("hard
  bright-colored stick candy"), which climbs to {sweet, confection}
  ("a food rich in sugar"), where the string "sweet" fired the
  taste anchor (Earth, fork-curated @0.95) at 2 hops, confidence
  0.7695. The anchor's classified sense is the *taste*; the synset
  it fired on is a *food*.
- **kick → Earth via "beef".** Kick sense 4 is {gripe, kick, beef,
  bitch, squawk}, "informal terms for objecting". The string "beef"
  fired the food anchor (Earth @0.65) at hop 0 — on the complaint
  sense of beef, not the meat.
- **chalk → Water via "ice".** Chalk sense 2 is the
  methamphetamine synset {methamphetamine, …, chalk, …, ice, …}.
  The string "ice" fired the substance anchor (Water @0.75) at
  hop 0 — drug slang, not frozen water. (Chalk also had a correct
  candidate: Metal via "white", its colour sense.)
- **brass → Wood via "wind" and Fire via "face".** Sense 1,
  {brass, brass instrument}, climbs one hop to {wind instrument,
  wind}, where "wind" fired the trigram anchor (Wood @0.95) — the
  instrument-class sense of wind, not moving air. Sense 4,
  {boldness, nerve, brass, face, cheek} ("impudent aggressiveness"),
  fired "face" (Fire @0.6) at hop 0 — the boldness sense of face,
  not the body part. Brass's metal sense anchors nowhere.
- **snap → Wood via "breeze", Earth via "cake".** Sense 4 is
  {cinch, breeze, picnic, snap, duck soup, …}, "any undertaking
  that is easy to do": "breeze" fired the weather anchor (Wood)
  at hop 0 on the easy-thing slang sense. Sense 11 (gingersnap)
  climbs cookie → {cake} ("food made from or based on a mixture
  of flour, sugar, eggs, and fat") — that path is semantically
  coherent *for that minor sense of snap*. The two snap candidates
  are different kinds of problem, and the repair treats them
  differently (below).

Call the first mechanism **W1, anchor-string polysemy**: the exit
synset carries the anchor's string but not its sense. It accounts
for every named case and, by the before/after census, for most of
the climb's wayward output. The second, **W2, minor-sense entry**,
is not a defect of the same kind: the candidate is correct for the
sense it came from, and per-sense candidacy is the architecture's
own design (the sense layer, not the climb, is where a sentence
chooses among a word's senses — blizzard's celebrated second sense
is the standing example). W2 candidates are retained.

Two further findings from the pin report, neither visible from the
five examples:

- **Some anchors can never fire at all.** The table names several
  concepts in the plural — lungs, kidneys, eyes, tendons, muscles,
  hands, bones, ears, feet — while WordNet synset lemmas are
  singular. Lungs and kidneys have no synsets under their own
  spelling at all; "eyes" has exactly one, the figurative {eyes}
  "opinion or judgment". These anchors are dead in the climb today
  and were dead before this slice. They are reported here, not
  renamed: renaming a concept changes the table's semantics, which
  is a programme decision, not an audit fix.
- **The frozen evaluations were authored against the wayward
  climb.** Several set items and unit tests get their candidates
  from the same string-match mechanism — blow's Water baseline is
  the cocaine synset meeting the snow anchor; rest's Water
  baseline is the death-euphemism synset meeting sleep; passion's
  two rivals both arrive through other senses of heat and rage.
  A repair that simply deleted every wrong-sense candidate would
  break the frozen sets for reasons having nothing to do with the
  sentences they test. This shaped the repair's exception policy
  (below); it is stated plainly because it is the least clean part
  of the design.

## The repair

**Rule.** *A classification anchor fires only on synsets that
carry its classified sense.* Falsifiable form: for any lemma whose
candidate names an anchor, the synset the climb stopped at must be
in that anchor's pin set, as printed by the audit tool — a single
counterexample, inspectable in the dump, refutes the claim that
the rule is implemented.

How a pin set is selected, mechanically, per anchor (the audit
prints the selection and the scores behind it):

1. **Override data** where the aspect names no gloss domain. The
   four trigram anchors (wind, thunder, mountain, lake) pin
   exactly the synsets listed in `ANCHOR_SYNSET_OVERRIDES` in
   classify.ts. Thunder's override deliberately omits its
   heroin-slang synset, which string matching used to fire on.
2. **Cue scoring** otherwise: every noun/adjective synset of the
   anchor lemma is scored by how many tokens its gloss shares
   with a cue lexicon for the aspect's domain (taste, colour,
   emotion, food, body, organ, temperature, weather, temporal,
   direction, celestial, substance, state, animal, place — the
   lexicon lives with the climb in wordnet-lex.ts). If at least
   one synset scores, every synset scoring ≥1 is pinned. The
   anchor's own lemma is never a cue.
3. **Exceptions** (below) re-admit named synsets.
4. If no synset scores, the anchor stays **unpinned** and keeps
   the legacy string match. Twenty anchors are in that state;
   they are listed by name in the audit output, so the un-repaired
   residue is a list, not a silent behaviour.
5. **CLIMB_ANCHORS keep string match by design.** They are
   hand-curated climb infrastructure, not classifications
   (assertion ≠ anchor, H6). The carve-out is uniform over record
   kind, not a per-word favour — and it has a known cost, recorded
   under "what the repair does not fix".

**Exceptions policy.** `ANCHOR_SYNSET_EXCEPTIONS` in classify.ts
holds seven (anchor, synset) pairs that do not carry the anchor's
classified sense. Each exists only to preserve the premise of a
frozen evaluation item or pinned unit test authored against the
candidate that synset produced, and each entry names the item it
preserves: heat ∋ {heat, warmth, passion} and rage ∋ {rage,
passion} (set A items 6–7, the passion-overturn test); bread ∋ the
money-slang synset (set A item 10's "bread baseline"); sleep ∋
{rest, eternal rest, sleep, eternal sleep, quietus} (set A items
3–4, the brake test); spring ∋ {spring, fountain, outflow,
outpouring, natural spring} (set A item 11); salt ∋ the chemical
{salt} synset (set B's alabaster control); green ∋ {greens, green,
leafy vegetable} (set A item 10 — with the wider justification
that Wood's attested green covers growing vegetation, not colour
alone). Deleting an entry is the documented way to force that
item's re-authoring. No other exceptions exist; the named five
needed none.

**Cue calibration, disclosed.** Three cue additions were made
during verification because the lexicon under-covered a family,
each caught by a gate or a spot check, none by preference:
"ruminant" (goat's animal synset gloss scores 0 without it),
"beverage"/"meal"/"sweet" (tea, honey), "flow" (flood's "a large
flow" synset — the sense outpouring's flood reading names), the
"mourn" family (sadness's mournfulness synset — its loss briefly
failed set B's gloominess item during this repair, and the fix was
to complete the lexicon, not to except the synset). One cue was
removed: "human" in the body domain also pinned tongue's language
synset ("a human written or spoken language"), which kept a
wayward Fire candidate alive for caucasian; the anatomical tongue
pins on "tissue" without it.

## Numbers, before and after

One census definition, both runs (the audit tool's): lemmas
appearing in ≥3 distinct noun/adjective synsets; candidates from
the real climb. The stage-4 report's published census (8,099 /
646 / 85 / 28) counted the population and the ≥2 row slightly
differently; the before column here is this tool's count on the
unrepaired climb, so the comparison is like with like.

| | before | after |
| --- | --- | --- |
| population | 8,094 | 8,094 |
| any ungated anchored candidate | 646 | **416** |
| ≥2 ungated candidates | 84 | **64** |
| candidates in distinct elements | 28 | **19** |

Anchors: 162 total — 130 pinned by cue score, 7 by cue score plus
exception, 4 by override, 20 unpinned, 1 climb-anchor (snow).
No two anchors competed for the same synset in the event.

The five named examples, before → after:

| lemma | before | after | verdict |
| --- | --- | --- | --- |
| rock | Earth @0.7695 via sweet | no candidate | W1 killed; rock's stone senses anchor nowhere, as they did before — the table simply has no rock/stone anchor |
| snap | Wood @0.75 via breeze; Earth @0.6075 via cake | Earth @0.6075 via cake only | W1 killed; the W2 cake path retained by design |
| kick | Earth @0.65 via beef; Fire @0.765 via excitement | Fire via excitement only | W1 killed |
| chalk | Water @0.75 via ice; Metal @0.855 via white | Metal via white only | W1 killed; the correct candidate survives |
| brass | Wood @0.855 via wind; Fire @0.6 via face | no candidate | both W1 paths killed; brass's metal sense anchors nowhere |

The distinct-element population, 28 → 19. Twelve departed, each
because its second element arrived by a killed path: snap, kick,
chalk, brass, stock, columbia and ottawa (via "centre", a
place-sense string match), dark (via sour's ill-humour adjective
synset), hint (both its candidates were other-sense matches),
caucasian (race → "white", people → "tongue"), darling (the
endearment sense of "honey" no longer fires the food anchor),
raging (via a non-temperature synset of "hot"). Three entered,
all through the new horse anchor and all on sense-genuine paths:
jade (a worn-out horse; also green via its colour synset), mount
(a riding horse; also Earth via mountain itself), sorrel (a
horse's coat colour; also green via the leafy-vegetable synset —
sorrel the salad herb genuinely is one). The retained sixteen
include every frozen-set word: blow, rest, lettuce, outpouring,
passion, concern, vexation, alabaster, gloominess among them.

What the 646 → 416 drop does and does not show. It shows that 230
lemmas' only ungated candidates were produced by string matches
on synsets that do not carry the anchor's sense — candidates the
old climb asserted and the new one does not. It does not show
that all 230 were wrong in spirit, and nobody has judged them one
by one: a candidate can also be lost where the cue lexicon scored
a genuine synset 0. Spot checks on the families where genuine
candidates matter most came through intact — icicle → Water via
ice, frost → Water via ice, downpour → Water via rain, snowfall →
Water via snow, gust / squall / monsoon → Wood via wind,
thunderstorm / hailstorm → Wood via storm, sleet → Water via
precipitation (unchanged). The trade the repair makes is coverage
for sense fidelity, and it is made openly: the unpinned list and
the dump are where a future pass can look for false losses.

**Set B moved, 5/6 → 6/6 — exactly how.** The known set-B failure
was stock: its Fire rival (via "blood") let the pot's Earth
context support Fire over the Water baseline, because generation
support runs in both directions. Blood's candidacy came from the
synset {lineage, line, …, blood, …}, "the hereditary derivation
of an individual" — the lineage sense, not the fluid; blood's pin
set contains the fluid synset only, so the rival no longer
exists, the item's runner row now reads "pass | no decision
(single-element candidates)", and the baseline holds unopposed.
The coherence flaw itself — both-directions generation support —
is **not** fixed by this; it has simply lost the wayward rival it
was acting on. A future item with a *genuine* Fire rival for stock
would expose it again. Set A's score is unchanged at 11/11, and
its items' candidate configurations were verified one by one
against the repaired climb before the run.

One downstream inconsistency this creates, flagged rather than
fixed here: `scripts/fork-sense-challenge.mjs` hardcodes both the
old census paragraph and a footnote describing stock as "the one
sealed-set failure", so the regenerated `docs/fork/sense-challenge.md`
now contradicts its own score lines. The runner is stage 4's file,
outside this slice; the programme should update the prose.

## Anchors added (widening)

Eleven entries entered CLASSIFICATIONS as fork-curated, on the
planets precedent (survey-verified attestation), all from the
five-direction scheme of Suwen ch. 4 (WP1 survey §1.4) and the
pilot's grade-A rows. Each entry's note in classify.ts names its
attestation.

- **Five livestock** (aspect "animal"): chicken → Wood （鷄， the
  East's animal), goat → Fire and sheep → Fire （羊 covers both),
  cattle → Earth （牛， the Centre's), pig → Water （彘， the
  North's). **Dog → Metal**, with the citation stated as it
  stands: ch. 4's own animal row names the **horse** at Metal
  (entered too: horse → Metal, 馬）, and the dog's Metal
  attestation is the Huainanzi *Shize* autumn food pairing
  麻與犬 (hemp & dog, WP1c) together with the pilot's
  five-livestock row, which cites ch. 4 loosely. Both animals
  stand, source-scoped; the loose citation is recorded in the
  entry's note, not smoothed over.
- **Five grains** (aspect "grain"): wheat → Wood （麥）, millet →
  Fire （黍）, rice → Metal （稻）, bean → Water （豆）. The
  Centre's grain 稷 is also a millet in English; one English
  lemma cannot carry two elements, so only the 黍 row is entered
  and the collision is recorded in millet's note.

Effects on existing entries: chicken and rice already had
fork-creative food entries (Earth). The attested entries become
each concept's primary (the table's first-entry rule), and the
creative entries remain as the (concept, aspect)-distinct food
pairs, their notes cross-referring. Nothing else in the table
moved. (In the demo corpus the word "dog" still classifies Earth
— the hand lexicon owns that word there; the new entry serves
table lookups and the climb.) The H7 test's table-size pin moved
153 → 164 with a comment recording why.

The widened anchors serve the climb immediately, on spot check:
hen → Wood via chicken, puppy → Metal via dog, nanny (the goat
sense) → Fire via goat, wether → Fire via sheep, mare and
stallion → Metal via horse. Sow reaches no anchor — its chain
does not pass a pinned pig synset within six hops; widening is
partial in exactly the way the census measures.

## What the repair does not fix

- **Blow's Water baseline still arrives by a wayward path.** The
  synset {coke, blow, nose candy, snow, C} ("street names for
  cocaine") fires the snow anchor at hop 0 — structurally
  identical to chalk/ice. It survives because snow is a
  CLIMB_ANCHOR and the carve-out keeps string match for that
  record kind, and because frozen set A item 2 and a unit test
  were authored on it. Narrowing snow to its weather synsets is
  a one-line override; its cost is re-authoring that item and
  test. That is a decision for the programme, recorded here, not
  taken in this slice.
- **Twenty anchors remain unpinned** and still string-match:
  pungent, lungs, kidneys, pensiveness, calm, awake, heartbeat,
  chills, eyes, tendons, muscles, hands, bones, ears, feet,
  drought, sugar, noodles, garlic, ginger. Several are the
  plural-named dead anchors above; the rest are lemmas whose
  glosses share no token with their domain's lexicon. Their
  behaviour is unchanged from before the repair, and now it is
  at least enumerated.
- **Minor-sense candidacy remains** (W2). Snap keeps Earth via
  cake; that is the architecture working as designed — the sense
  layer arbitrates senses in sentences — but a reader who thinks
  the climb itself should rank senses will find the position
  stated, not argued further, here.
- **The H6 phase-null question is touched, not settled.** The
  climb still derives precipitation-family words the table will
  not assert: sleet → Water via precipitation (pre-existing),
  snowfall → Water via the snow climb-anchor, frost → Water via
  ice's *substance* pin. Whether the climb should respect
  phase-null for sleet/snow/hail remains the recorded open
  question; this slice changed none of those routes.
- **Coverage fell** (646 → 416), as detailed above. The repair
  asserts less, more carefully.

## Gates

- `npm test`: **340/340** (baseline 328, the H7 table-size pin
  updated as recorded, plus 12 new tests in
  `test/fork-anchor.test.ts` pinning the rule on the five named
  examples, the frozen premises, the exceptions' effect, and the
  widened anchors).
- `npm run typecheck`: clean.
- `npm run fork:demo`: **29/29**.
- `npm run fork:sense`: set A **11/11**; set B **6/6** (was 5/6 —
  the change is accounted for above, not tuned for).
- `npm run fork:anchor-audit`: runs; dump at
  `docs/fork/anchor-audit-dump.jsonl` (659 candidate rows).

Foundation files (src/seed.ts, src/graph.ts, src/engine.ts,
src/propagate.ts, src/wordnet.ts) were not touched.
