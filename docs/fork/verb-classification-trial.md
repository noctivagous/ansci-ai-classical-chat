# Verb classifications and the elemental-prior trial

Slice 4, 2026-11-16. Registry entry: H8 in
`docs/fork/repair-programme.md`. Generated trial results:
`docs/fork/prior-trial-results.md` (`npm run fork:prior-trial`).
This report is written in the plain register: what was built, what
the run showed, and what it did not show.

## What was missing

The stage-1 valency work left one evaluation permanently
unfinished. The elemental domain prior — the claim that a verb's
Five-Phase element predicts the *shape* of its argument structure
(which roles it takes, roughly) — was written as a predictor
(`predictSignatureShape`), but the trial of that predictor against
a FrameNet-only baseline could not run, because the system had no
way to assign an element to a verb. The existing classification
machinery (the curated table, and the WordNet hypernym climb built
on it) covers nouns and adjectives. For verbs it returned nothing —
verified at stage 1 for teach, fill, sing, paint and for bake and
send. This slice built the missing piece and then ran the trial.

## The search for a mechanism (what was tried, in order)

The classification had to satisfy three constraints: it must not
read FrameNet data (the prior has to work for verbs FrameNet does
not contain, and must not peek at the evidence it is tested
against); it must be one stated rule, not a pile of per-verb
decisions; and its outputs must carry a price and a provenance.

1. **Climb the verb's own hypernym chains to a classified
   anchor.** Dead. Verb chains stay inside verb synsets and
   converge on a handful of abstract roots (of 3,071 inventory
   verbs, the greedy first-sense chains end at 7 roots, 2,723 of
   them at "act/move"). The few anchor spellings a chain does meet
   are homograph accidents — "sing" meets "peach" (the slang sense
   *to peach* = to inform), "bake" meets "heat" as a lemma on a
   neighbouring synset, "wash" meets "flood". The first verb sense
   in the extract is also often not the relevant one (teach's first
   sense is "accustom gradually"; sing's is "divulge secrets").
2. **Cross from the verb to a noun via derivational relations,
   then climb as nouns do.** Dead in this data: the trimmed
   extract carries no derivational relations at all.
3. **Classify through the verb's FrameNet frame's noun LUs**
   (FrameNet groups the event noun with the verb, sense-safely).
   Measured: 392 of 3,071 inventory verbs (13%) have a chosen
   frame with a noun LU that climbs anywhere, and **none** of the
   12 challenge verbs do — event nouns (education, instruction,
   construction, transport) climb into abstraction, where no
   classified anchor lives.
4. **Read the element off the frame's place in the frame
   hierarchy.** Dead as a domain signal: the hierarchy's upper
   frames are structural (Event, Transitive_action,
   Intentionally_act), not semantic domains, and 1,145 inventory
   verbs' frames have no Inheritance ancestor at all.
5. **Score the frame's name and definition against phase-domain
   vocabularies.** Workable numbers, wrong architecture: it reads
   FrameNet text, so it cannot classify a genuinely unseen verb
   and it leans on the evidence under test. Rejected on the
   constraints, not on the numbers.
6. **Score the verb's WordNet synset glosses, chains included.**
   The chain glosses wash the signal out — most chains pass
   through the generic "change" synset, whose gloss vocabulary
   floods two elements, and the weather verbs flip element.
   Rejected on measurement.
7. **Score the verb's own synset glosses only.** Adopted — the
   rule below.

## The rule: VERB_DOMAIN_V1

A verb's semantic element is the phase whose process vocabulary
dominates the dictionary definitions of the verb's own senses.

- **Texts.** The glosses of all the lemma's verb synsets in the
  Open English WordNet extract. Every sense contributes; a cue
  word counts once per element however many glosses carry it.
- **Vocabulary.** Five cue lists, registered as data in
  `src/fork/framenet-lex.ts`. They state the phases' process
  domains: Wood — growth, expansion, rising, motion and transfer,
  shouting, sight; Fire — heat, combustion, light, cooking,
  joy and laughter, speech and cognition (in the correspondence
  system the heart governs the tongue and the mind); Earth —
  making and creation, transformation, nourishment, filling and
  holding, singing, pensiveness; Metal — severing, division,
  contraction, gathering-in, grief and weeping, smell; Water —
  precipitation, flow, descent, cold, stillness and storage,
  washing, groaning, fear, hearing. The emotion and perception
  words follow the tradition's attested five-emotion and
  five-orifice rows; the rest is the phases' process reading —
  creative in kind, and labelled so.
- **Assignment.** The element with the most distinct cue hits
  wins, but only if it scores at least 2 and strictly beats the
  runner-up. Otherwise the rule abstains: no element.
- **Price.** Confidence = min(0.75, 0.50 + 0.05 × (score +
  margin)) — never above the project's creative ceiling.
  Provenance on every output: `verb-domain-derived`, a derived
  layer distinct from the curated table and from the noun climb.
- **Falsification.** The trial below is the rule's test as the
  prior's input; the rule as a classification is falsified if its
  assignments fail to recover independently made domain groupings
  above base-rate chance (registry H8).

Worked examples, from the recorded held-out set: **teach** →
Fire (gloss cues: *impart, skill, knowledge* — cognition under
the heart); **fill** → Earth (*full, make, fill, occupy*);
**sing** → Earth (*make, produce, singing, sing* — singing is
the Earth voice in the attested five-voices row); **paint** →
Earth (*coat, make*, at the rule's floor: score 2, margin 1,
confidence 0.65).

## Coverage, stated plainly

Of the 3,071 verbs in the FrameNet signature inventory, the rule
classifies **574 (18.7%)**: Wood 235, Fire 86, Earth 175, Metal
24, Water 54. Counting the older noun climb where it happens to
reach a verb lemma, 636 (20.7%) classify by some route. The
other four-fifths abstain, and for them the prior is exactly the
baseline. Two honesty notes on the climb's contribution (92 of
the 636): some of those paths are homograph accidents — *pull*
reaches Metal through its noun sense "a drag (on a cigarette)"
via *breath* — which is why the rule, not the climb, is the
mechanism this slice stands behind. All four held-out verbs'
elements in the trial come from the rule alone; the climb
returns nothing for them. Of the 12 valency-challenge verbs, 11
classify; **show** abstains (its glosses are evidential — "establish
the validity of" — with no phase-domain majority).

Calibration against the depth-cycle evaluation's hand-made
domain groupings (claim 3), which were made before this rule
existed: of 13 scored verbs, **8 agree** (rain, snow, build,
give, go, grow, cut, burn), **3 abstain** (drizzle, make, worry),
**2 disagree by a rival reading the report does not hide** —
bake → Fire by heat, where the desk grouped it under creation;
fall → Water by descent, where the desk grouped it under motion.
Of the desk's perception verbs, see → Wood (sight, the liver's
orifice, as the desk had it); hear, smell and taste abstain.

## The trial

**Protocol, declared before the run** (it is written into the
runner's header, `scripts/fork-prior-trial.mjs`):

- *Arms.* PRIOR: for a target verb, take the modal signature
  shape among seen inventory verbs classified with the target's
  element (the existing predictor). BASELINE (FrameNet-only):
  the modal shape over the whole seen inventory — no elemental
  information.
- *Ground truth.* The target verb's own FrameNet signature shape.
- *Headline metric.* Exact shape match: agent flag, slot list
  and prep slot all equal. A partial-credit score (fraction of
  components matched) is reported alongside, as a secondary
  measure only.
- *Verdict rule* (from Part C.2, unchanged): the prior **fails**
  if the baseline matches or beats it on the headline metric.
- *Populations.* PRIMARY: the recorded stage-1 held-out set —
  teach, fill, sing, paint — withheld as a group. SECONDARY:
  leave-one-out over the 12 challenge verbs. SUPPORTING:
  leave-one-out over all 636 classified inventory verbs.

**Results.** Generated in full in `prior-trial-results.md`.

| Population | Prior exact | Baseline exact | Prior partial | Baseline partial |
| --- | ---: | ---: | ---: | ---: |
| Primary (held-out 4) | **0/4** | **0/4** | 0.646 | 0.417 |
| Secondary (challenge 12) | 1/12 | 0/12 | 0.500 | 0.396 |
| Supporting (classified 636) | 166/636 (26.1%) | 152/636 (23.9%) | 0.569 | 0.541 |

On the primary set, every prediction missed exactly: Earth's
modal shape (agent + theme) is one component short of fill's and
paint's true shapes (both carry a goal prep slot the mode drops),
and Fire's modal shape is the bare agent shape, two components
short of teach's. Sing's prediction (agent + theme) missed its
recipient slot the same way.

**Verdict: the prior FAILED the C.2 failure test.** On the
predeclared headline — the recorded held-out set, exact shape
match — the FrameNet-only baseline matches the prior, and the
rule of the test is that matching is failing. The prior remains
adopted nowhere: neither the predictor nor the classification is
called by any parse, check, or join path (verified by search;
their only callers are the two evaluation runners and tests).

## What the run does and does not show

It does not show that the element carries no valency information.
On every secondary measure the prior is ahead of the baseline —
partial credit at all three populations, exact match at the two
larger ones — which is the same shape as claim 3's original desk
verdict: the correspondence holds at coarse grain and fails at
fine grain. What failed here is a specific instrument: a *modal*
predictor judged at *exact* match. The reason is visible in the
groups themselves. Each element's verbs spread across 10–20
distinct signature shapes; the element shifts the distribution
(Earth's verbs are 28% agent+theme against a global mode of bare
agent) but for four of the five elements the single most common
shape is still the baseline's bare-agent shape, so a predictor
that must name one shape per element names the baseline's shape
and scores like it. The information is in the distribution, and
the modal predictor cannot express a distribution.

It also does not validate the classifications as *true*. They
are one rule's priced, provenanced readings of dictionary
definitions; the calibration against the desk groupings (8 of 13)
says the rule reads domains roughly as the project has read them
by hand, and no independent judge has scored the 574.

What it does show: the missing input now exists, the long-open
failure test has been run rather than carried, and its outcome
is on the record either way — which was the point of running it.
A retest would need a distributional predictor or a coarser
prediction target, on a larger held-out set, with its protocol
declared before the run and an argument for why that protocol is
the fair one. Registry entry H8 records what would change the
prior's status.

## Gates

- `npm test`: **355/355** (baseline 350 + 5 new verb-domain
  tests in `test/fork-verb-domain.test.ts`).
- `npm run typecheck`: clean.
- `npm run fork:demo`: 29/29 expectations met.
- `npm run fork:sense`: set A 11/11, set B 6/6.
- `npm run fork:valency`: role precision 98.2%, acceptance
  100.0%, rejection 91.7% — unchanged; the regenerated report now
  records the trial as RUN with its outcome.
- Foundation files: not edited in this slice. Verified against
  main by blob SHA — seed, engine, propagate and wordnet are
  byte-identical; graph.ts differs from main only in comments
  (the branch copy carries FrameNet slice-2d annotation comments
  main's copy lacks; the type and edge unions are identical), a
  pre-existing divergence of the working copy, not of this slice.
- No push.
