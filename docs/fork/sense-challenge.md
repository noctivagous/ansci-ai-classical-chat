# Sense challenge — depth programme stage 4 (Part C.2)

Set A (development): `scripts/sense-challenge-a.tsv` (sha256 f508fc8125e719f9). Set B (sealed holdout): `scripts/sense-challenge-b.tsv` (sha256 5bf10f3a377515b3).
Authorship caveat (standing): both sets builder-authored against the sentences' evident readings, sealed by hash; not independently authored C.5 sets. Scores are internal evidence (C.5 demotions).

## The census ceiling

Of 8,094 extract lemmas with ≥3 noun/adjective senses, 729 have any ungated climb candidate, 183 have ≥2, and **64 have candidates in distinct elements** — as this tree stands after the 2026-11-18 merge landed Slice A's creature-class stops and Slice B's stuff-class stops together: Slice B alone stood at 509 / 79 / 27, and the creature stops raise the census again because an animal word's senses now reach their creature class beside the anchors (a stuff word's senses already reached their material class — rock's material sense → stone/Earth; brass's alloy sense → metal/Metal). Before that, the anchor-quality repair (2026-11-15, docs/fork/anchor-audit.md) had pinned each anchor to the synsets carrying its classified sense; at stage 4 the figures were 646 / 85 / 28 (census population 8,099 under that stage's tool definition), and several of the 28 reached their anchors by spelling rather than sense (rock via "sweet", brass via "wind") — those routes stay dead; the class candidates are new routes by sense, not the old ones restored. The sets below sample the genuine subset. This is the material the stage actually has; claims are sized to it.

## Scores

Set A: coherence **11/11** vs isolated-climb baseline **3/11**.
Set B (sealed, single run): coherence **5/6** vs baseline **3/6** — the gain survives on the held-out set.

### Set A

| Target | Sentence | Expected | Baseline | Coherence | Verdict | Detail |
| --- | --- | --- | --- | --- | --- | --- |
| blow | The blow of spring woke the garden. | Wood | Water | Wood | pass | support {"Water":1.2000000000000002,"Wood":1.4} |
| blow | The blow of snow buried the valley. | Water | Water | Water | pass | support {"Water":1,"Wood":0.8} |
| rest | She found rest in the garden. | Earth | Water | Earth | pass | support {"Water":0.4,"Earth":1} |
| rest | She found rest. | Water | Water | Water | pass | support {"Water":0,"Earth":0} |
| concern | Her concern grew in the garden. | Earth | Water | Earth | pass | support {"Earth":1,"Water":0.4} |
| passion | His passion became rage. | Wood | Fire | Wood | pass | support {"Fire":0.8,"Wood":1} |
| passion | His passion became joy. | Fire | Fire | Fire | pass | support {"Fire":1,"Wood":0.8} |
| thrill | A thrill of joy shook her. | Fire | Water | Fire | pass | support {"Fire":1,"Water":0.4} |
| puff | A puff of garden dust rose. | Metal | Wood | Metal | pass | support {"Metal":0.8,"Wood":0.4} |
| lettuce | The lemon shaded the lettuce. | Wood | Earth | Wood | pass | support {"Wood":1,"Earth":0.4} |
| outpouring | An outpouring of grief filled the room. | Water | Wood | Water | pass | support {"Water":0.8,"Wood":0.4} |

### Set B

| Target | Sentence | Expected | Baseline | Coherence | Verdict | Detail |
| --- | --- | --- | --- | --- | --- | --- |
| vexation | His vexation became anger. | Wood | Earth | Wood | pass | support {"Earth":0.4,"Wood":1} |
| gloominess | The gloominess became fear. | Water | Metal | Water | pass | support {"Metal":0.8,"Water":1} |
| acerbity | The acerbity of the lemon startled her. | Wood | Wood | Wood | pass | support {"Wood":1,"Fire":0.8} |
| beak | The beak pecked the grain. | Earth | Earth | Earth | pass | support {"Earth":0,"Metal":0} |
| alabaster | The alabaster was white. | Metal | Metal | Metal | pass | support {"Metal":1,"Water":0.8} |
| stock | The stock simmered in the pot. | Water | Metal | Metal | **FAIL** | support {"Metal":0,"Water":0} |

## Non-regression

Frozen holdout: parse rate **80/80** (stage-3 close: 80/80); pooled feature preservation **97.7%** (stage-3 close: 98.2%). The sense pass runs inside parse(), so these numbers are with the mechanism live. Instrument note: the preservation figure is warm-state dependent at the ±0.5pt level — derived entries register into the shared lexicon as sentences are parsed, so the atom population shifts slightly with what a runner has parsed before the corpus (measured directly: 97.7% cold vs 98.5% warmed, over ~1,080 atoms). The 0.5pt gap to the stage-3 figure is that instrument effect, not a located regression; parse rate, the hard floor, is unchanged.

## What this stage does and does not settle

- The mechanism (confidence band + same/generating/controlling support with restraint-as-corroboration, ties to baseline) is implemented in src/fork/sense.ts and runs on every EN parse. The band is the brake: context can never overturn a decisive confidence gap, answering the X1 amplification risk by construction.
- The preregistered H3a/H3b rivalry is NOT settled here. Its criterion requires the human instrument (native-speaker judgments on the 2×2 design frozen in Part B); this stage's sets are sentence-level and builder-authored. What the in-loop evidence shows is narrower: where genuine multi-element alternatives exist, sentence context re-chooses better than isolation on these items, and the restraint-asymmetry term is load-bearing in at least the concern case (support Earth 1.0 vs Water 0.4 — the Water score IS the asymmetry term).
- The sealed set now passes 6/6. Its one stage-4 failure is resolved, and not by tuning: in "The stock simmered in the pot." the Fire rival (stock as bloodline) reached its anchor through blood's lineage synset — itself a wayward spelling-match candidate of the kind the anchor-quality repair removed (blood is now pinned to its fluid synset), so the rival no longer exists and no decision is taken. The flaw that failure exposed is NOT fixed: generation support still runs in both directions — a candidate claims support from elements it generates, which are often merely downstream, not evidence. It has lost the wayward candidate it acted on. Direction-sensitive generation support remains the recorded v2 direction.
- The larger finding is the census: sense ambiguity BETWEEN elements is rare in this system because anchored senses are rare. The binding constraint on derived classification quality is anchor coverage, not sense choice — and since the anchor-quality repair, anchor paths are sense-pinned (the rock-via-"sweet" path was a spelling artifact and no longer exists). That re-aims the coverage work: better anchors beat better disambiguation.
