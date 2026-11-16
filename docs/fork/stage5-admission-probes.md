# Stage 5 admission probes (Part F.1/F.6) — run 2026-11-15

Part F requires each stage-5 mechanism to pass the four-field
prediction-admission test **before** it is built, and requires a
failed probe to be reported as a result. Runner:
`npm run fork:stage5-probes` (sets: `scripts/negation-probe.tsv`,
`scripts/classifier-probe.tsv`; both frozen once run).

## Probe 1 — ZH negator selection (Part F.2)

*Conventional account:* aspect-conditioned negator allomorphy.
*Elemental account:* the negation (Water) state's surface form is
a function of the negated (Wood) predicate's aspect bundle; its
carrier relation is the Metal → Wood control verified for English
at K6. *Novel prediction:* one bundle rule predicts the negator in
configurations the parser has never handled (A-not-A questions,
experiential bundles, serial predicates). *Discriminating test:*
held-out-style items scored against the most-frequent default
(always 不） and a surface rule （没 iff the string shows 了/过/有）.

**Result: bundle rule 15/15** (all items parsed), including both
novel A-not-A configurations (2/2). Always-不： 7/15. The surface
rule also scores 15/15 on this canonical set — the two rules only
diverge where the marker is absent from the string or present
without being aspectual, and the probe set does not separate
them. The bundle rule is nevertheless the admissible mechanism,
for a reason the tie makes sharper, not weaker: **the surface
rule does not exist at generation time.** Generation starts from
the meaning graph, where there is no string to inspect; the
negator must be chosen from the bundle. A rule that only works
on finished surface text cannot be the system's mechanism.

*Instrument corrections during the run (configurations kept):*
the 是+NP copula item was replaced by an adjective-state item
(ZH nominal copula is unbuilt — a separate parser gap; 不 with 是
is categorical anyway) and the 会-modal item dropped (modal 会
unbuilt; 想 covers the volitional configuration). The probe
required lexicon additions （有/看/喝/喜欢 verbs, 茶/猫 nouns, 高
adjective), now in `sentence.ts`. First-run root-assignment
misses （有 and 看过 read as modifiers of their objects) were
lexicon absences, resolved by those additions.

**Verdict: ADMITTED.** B2's acceptance includes this probe
re-run in the generation direction (affirmative parse → negate
by the rule → string comparison).

## Probe 2 — classifier prediction (Part F.3)

*Conventional account:* classifier choice is lexical, by semantic
class. *Elemental account:* the measure is the Metal the Earth
noun generates (Earth → Metal); the noun's place in the ontology
predicts the classifier family. *Novel prediction:* prediction
beats the 个 default on held-out nouns, probabilistically.
*Discriminating test:* ontology route vs always-个 vs a
WordNet-gloss shape rule.

**Result: ontology route 21/41 exact (51%)** — always-个 4/41
(10%), gloss-shape 5/41 (12%). Family-level hits concentrate
exactly where the account says signal lives: elongated animals
（条： fish, snake), bound volumes （本： book, dictionary),
animals （只/匹/头 incl. both specials), plants （棵/朵）,
vehicles （辆）, rooms （间）, documents/works （封/首）.
The misses are equally structured: the flat family 张 0/5, the
handled family 把 0/5, the item family 件 0/2 — shape- and
grip-classes with no substance/path signal — plus first-synset
sense noise in the extract (cat's first noun synset is the
CT-scan sense; magazine's is the cartridge clip; apple over-
reaches to 棵 through its tree sense).

*Instrument correction:* the first run scored the ontology route
4/41 because it read the gated climb's trail — which exists only
when a climb reaches a table anchor, as most ordinary nouns'
never do. The corrected instrument reads the noun's hypernym
neighbourhood in the same extract the climb walks.

**Verdict: ADMITTED with stated scope.** The B3 mechanism
predicts only where the path signal fires; the 张/把/件 families
are outside its scope and fall back to the noun's tabled
classifier, else 个 recorded as a default. The checker's
wrong-classifier violation applies only within scope.

## What this means for the build

Both mechanisms are admitted. Per Part F.6 the stage-5 report
will score each family twice: its bar, and its carrier — these
two mechanisms, with these probe results as their admission
record.
