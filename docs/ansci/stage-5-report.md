# Depth stage 5 — report (Part F acceptance)

Built and run 2026-11-15. Runner: `npm run ansci:stage5`
(probes: `docs/ansci/stage5-admission-probes.md`). Suite at
close: **320/320**. All prior-stage runners at their recorded
metrics (valency 98.2% / 100% / 91.7%; aspect 19/19 + irregulars
73/74; construction census 12/12; sense A 11/11, B 5/6; demo
29/29 with 27 exact — the corpus grew by the three F1 sentences).

## The accounting (frozen 80-sentence holdout, WordNet on)

- Parse rate **80/80 = 100%**; generation failures **0**.
- Pooled feature preservation **97.7%** over 1,076 atoms in this
  runner (98.2% in the construction runner's warm state — the
  established ±0.5pt instrument band; reported as the range
  **97.7–98.2%**). The atom population grew (904 at baseline →
  1,076) because the record now carries more: negator and
  carrier atoms, numeral atoms, time-attachment atoms.
- **The aggregate bar (≥95%) is met.** Per-family, with carriers:

| Family | Score | Atoms | Carrier |
| --- | --- | --- | --- |
| negation | **91.2%** (floor 90%) | 113 | **ontology** — Water state + Metal carrier record (F.2) |
| number | 98.8% | 81 | **ontology** — classifier mediation atoms (F.3) |
| attachment | 95.0% | 20 | **ontology** — time edges into classified time nodes (F.4) |
| aspect | 100.0% | 81 | stage-2 machinery, unchanged |
| predicate / tense / voice | 100.0% | 81 ea | prior stages |
| entity | 97.8% | 229 | prior stages |
| mood | 98.9% | 87 | prior stages |
| connective | 97.0% | 101 | prior stages |
| roles | 92.7% | 123 | stage-1 machinery |
| construction | 50.0% | **2** | **under-tested** — reports as such under C.1, neither pass nor fail |
| suppressed | 66.7% | **3** | **declared ontology failure** (F.5) — under-tested in this corpus; the demo's agentless-passive case carries its evidence |

## Family reports

**Negation — the stage's headline.** Baseline: 84.4%, the weak
family, with F1 (Chinese preverbal negation dropped at parse)
invisible to preservation entirely. Now: the negation record is
a structured state (negator + carrier), ZH preverbal 不/没 is
consumed by the main loop and the verbless branch, 没 is a
function word, 没有 expands to its two morphemes, copula
negation is recorded in English ("She is not happy" regenerated
affirmative before this stage — F1's English twin, fixed), and
A-not-A keeps its embedded negator and its object. Evidence:
admission probe 15/15 (parse direction); generation direction
**negator correct 15/15**, exact 9/15 — the six non-exact are
named canonicalisations and limits, not negator errors: degree
很 retained （他很不忙， grammatical; the attested form drops it),
modal-scope negation in serial chains not distinguished
（他不想去学校 scopes over 想； the record negates the root verb),
progressive 在 not yet in the ZH aspect inventory (stage 2's
dispatcher covers 了/着/过）, and the two A-not-A rows, whose
plain-negative outputs carry the rule-selected negator as
designed. One mechanism refinement fell out of the probe and is
built: **没 absorbs the bounded particle** （他没去学校， never
他没去了学校） — the bounded feature is realised by the choice
of negator itself. The family's remaining holdout losses (10
atoms) are interrogative do-support/modal carriers in question
generation ("How do people feel…", "Can I still…") — aux atoms
bucketed in this family by the atomiser, but the phenomenon is
question formation, not negation; recorded under its right name
here rather than hidden in the family's score.

**Number.** The family held subject person only (baseline F2).
Counted quantities are atoms now (numeral + classifier + noun),
and the classifier machinery is complete at its admitted scope:
all common classifiers registered as function words （只/条/张/
匹/头/件/个/棵/朵/辆/间/封/首）, the counted-object branch fires
for each, 把 after a numeral is the classifier (and the
ba-construction branch is guarded by the verb it requires —
a counted phrase no longer crashes it), and the checker gains
`classifier-mismatch` alongside `missing-classifier`, policed
only where the noun's classifier is tabled. **Boundary,
declared:** the admission probe's prediction mechanism (51%
exact vs 10%/12% baselines) operates on English concepts and
WordNet paths; the ZH lexicon has no ZH→EN concept bridge, so
prediction for untabled ZH nouns is not wired into the parser.
What is deployed is selection-and-agreement where the noun's
own classification speaks — which is the part of F.3 that
touches round trips.

**Temporal.** Declarative temporal PPs resolve through the
`time` relation into the ontology's classified time concepts
(aspect season/time) instead of `location`: "He sleeps in
winter" no longer locates the sleeping in a place called
winter. 4/4 probe sentences resolve and round-trip exactly;
places remain locations. Case 12's precision modifier remains
a **declared ontology failure** (F.4): "exact" is a
representation atom with no ontology mechanism, unchanged.

**Suppressed.** Declared ontology failure (F.5), unchanged:
3 atoms in this corpus is an instrumentation verdict
(under-tested), and the remedy remains sealed material, not a
mechanism. The stage does not claim this family.

## Also in this push (the pre-stage-5 batch)

- **H6 follow-on:** frost and fog withdrawn to phase-null, ice
  re-scoped to the substance aspect, storm to its wind aspect
  (registry record in the programme). Table: 153 classifications.
- **P2 fixed:** CREATURE_CLASS_YUELING_V1 registered with its
  mapping verified against the *Liji, Yueling* and its
  commentary （鱗 Wood · 羽 Fire · 倮 Earth · 毛 Metal · 介
  Water, B-derived, cap 0.80), including the recorded friction
  with the attested livestock row.
- **500-run sample sheet:** `wp1-scaleup-sample.md` — 400 fresh
  objects, 80/domain, counted and verified.
- **Recorded debts:** possessive *has* fixed ("She has a cold"
  parses and round-trips; the perfect reading is untouched) and
  pre-verbal PPs fixed (subject PP modifiers are kept as
  modifier edges, EN). FrameNet LU selection: two gloss-overlap
  selectors were built, measured, and **rejected** (they fixed
  the recorded bad names but regressed valency acceptance
  100% → 87.5%); the mapped-count selector stands, and the
  experiment is recorded in `framenet-lex.ts`.

## Verdict

Stage 5 meets its amended acceptance (Part F.6): the aggregate
bar is met, the negation floor is met **by the ontology
mechanism it was amended to require**, and every family reports
its carrier — ontology, prior machinery, under-tested, or
declared failure. The depth programme (Part C.2, stages 0–5)
is complete. What remains open in the wider programme is
unchanged and human-shaped: WP2's judged benchmark, the H3
sense experiment's subjects, the 500-object run itself (sample
ready, P2 registered), and the elemental-prior trial, which
still waits on verbs carrying classifications.
