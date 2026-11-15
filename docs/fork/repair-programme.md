# The repair programme and hypothesis registry

Date: 2026-11-15. Status: working programme, adopted from the v4
structural diagnosis (the user's `sentencesToWuxing-4.txt`) with the
four amendments recorded in the fork's evaluation thread. It governs
the repair of the ten weaknesses in `brief-weaknesses-for-ai.md`'s
terms: weaknesses in the scheme (sense priority, edge labels,
redescription), in the built parser (valency, generation, sentence
machinery, sense selection), and in the knowledge and the evidence
(unclassified ordinary things, unjudged precision, evaluator-shaped
evaluations).

The three layers stay distinct throughout: **attested tradition**,
**creative application** (the parts-of-speech mapping — under test
precisely because it is not canonical), and **analysis**. Nothing in
this programme promotes a claim from one layer to another.

**Update, 2026-11-15:** the classification protocol and the
threshold policy are ratified (Part A, "Ratified policy"), both
standing decisions are settled, and the H3a/H3b sense experiment is
preregistered (Part B). The sourced catalogue for Slice 1 is
`wp1-classification-survey.md`. Also adopted 2026-11-15, from the
v6 source-widening survey (`sentencesToWuxing-6.txt`): the revised
gap register (catalogue §3, with the WP1b scoping addendum in
catalogue §6) and the two derivation rules registered below as
H5 and H6.

---

## Part A — The repair programme

### Slice 0 — Label housekeeping (scoped)

The code's cycle tables are already pure: `GENERATES` / `CONTROLS` in
`src/fork/sentence.ts` are exactly the two closed cycles, and always
have been. The mislabelled edges live in the scheme documents, not in
the parser. Slice 0's real content is therefore not code — it is
**this registry** (Part B): every surviving non-cycle claim written
down as a named hypothesis with its evidence burden, and the settled
corrections carried forward so they are not re-litigated.

**Acceptance test (falsifiable):** every edge the parser emits carries
a cycle field of `generating` or `controlling` only where the arc is
in the two closed tables; every other relation the system uses is
either a typed pipeline operation or appears in Part B's registry.
A single emitted edge claiming cycle membership for an arc outside
the tables fails this slice. (The one declared meaning-graph addition,
`predicated-as`, computes its cycle field to `other` — see Part B,
settled corrections.)

### Slice 1 — Earth ontology coverage (weakness 8)

Build the ordinary-world classification: tools, substances,
materials, plants, animals — the content every prior evaluation
bottlenecked on. Parser-blocking, not decoration: role prediction,
coherence signals, and density behaviour all wait on it.

**Acceptance test:** on a predefined held-out set of ordinary
objects, classification coverage and correctness reach the declared
thresholds, **and** downstream measures (argument-role prediction,
sense-selection accuracy) improve against the pre-slice baseline on
held-out sentences. Density growth without downstream improvement
fails the slice — the added classifications must do work.

**Classification principle: settled** (see Ratified policy). The
ratified three-axis protocol governs this slice, and the
ordinary-object sample is piloted at 100 objects (20 per domain) to
validate the procedure before scaling to 500. The sourced catalogue
for the pilot is `wp1-classification-survey.md`.

### Slice 2 — Valency discipline (weakness 4)

Derived verbs currently arrive with permissive slots, so the
controlling Wood→Earth check cannot fire where coverage is widest.
Assign probable argument signatures by the verb's semantic
element-domain (the depth-cycle evaluation showed element predicts
signature *shape*: weather takes no agent, creation takes a created
thing, perception takes a stimulus and no patient), marked
derived-with-confidence, with FrameNet as the confirmation source.

**Acceptance test:** on held-out derived verbs, invalid-argument
rejection rises (e.g. *"She slept the book"* is flagged) while
legitimate alternations and figurative uses degrade gracefully
rather than hard-failing, and parse coverage does not collapse.
A valency layer that merely reduces coverage fails.

### Slice 3 — Sense equilibrium (weaknesses 1 and 7)

Replace dictionary-order sense selection with the layered pressure
model: sense as a state on the node, evidence collected per layer
(Water discourse, Fire local modifiers, Earth collocation, Metal
syntax, Wood verb expectations), equilibrium of pressures recorded
as genuine ambiguity rather than a forced pick. The Earth repair
applies (Earth as base reading — Part B). H3a vs H3b (Part B) is the
open question this slice must answer with data, not by stipulation.

**Acceptance test:** on a paragraph-level set where topic and
collocation conflict, human-judged, the implemented model beats
dictionary-order selection and matches or beats the rival hypothesis
(H3a/H3b) it does not implement; randomising dictionary order must
not change any outcome. If discourse overrides demonstrably
incompatible collocations without a defensible explanation, H3a
fails; if local grounding blocks discourse corrections that human
judges accept, H3b fails. The full preregistration of this test —
predictions, falsification conditions, three-party separation,
judging protocol, acceptance criteria — is recorded under H3a vs
H3b in Part B; it was frozen on 2026-11-15, before any test
materials exist.

### Slice 4 — Construction completeness (weakness 6)

The remaining sentence machinery. **Done in the repair tranche
(2026-11-15):** nominal predication via the declared `predicated-as`
relation （今天星期一 / "Today is Monday" parse and round-trip), and
suppressed-slot recording for agentless passives (EN and ZH 被）.
**Remaining:** copular wh-questions ("What is a cold?") and
contraction expansion — the holdout's largest failure family — and
*with*-construction discrimination (instrument / manner /
accompaniment), now located as a construction-choice problem.

**Acceptance test:** the holdout's copular/contraction failure family
parses at a declared rate with zero regressions on the existing
suite; *with*-constructions classify three ways on a held-out set at
a declared accuracy, with ambiguous cases recorded as ambiguous.

### Slice 5 — Generation completeness: aspect and morphology (weakness 5)

The generator realises 2 of the 5 aspect patterns (perfective,
resultative); progressive collapses ("is coming" → "comes"),
habitual and inchoative are unmodelled, and irregular pasts surface
as *blowed*. The three missing patterns are the non-affixal ones —
progressive needs an auxiliary chain, habitual/inchoative need
lexical or discourse cues — so the fix is architectural: aspect
realisation dispatched by pattern (affix / auxiliary chain / lexical
cue), with suppletion as form selection at the stem over a banked
listed-form inventory (v3's corrected pipeline).

**Acceptance test:** all five aspect patterns survive a
parse→generate round-trip in EN and ZH (progressive: "Winter is
coming" generates a progressive, ZH 正在 likewise); a held-out
irregular-verb set generates its listed forms (went, blew, ate —
never *goed*, *blowed*, *eated*).

### Slice 6 — Predictive validation (weakness 3)

Audit the elemental claims under the prediction-admission test
(Part B): any claim that cannot state a novel prediction the
conventional account does not make is retained as notation, not
promoted to mechanism.

**Acceptance test:** the audit table is complete for every elemental
claim in the design documents — each marked *predictive* (with its
discriminating test stated) or *descriptive* — and at least the two
standing candidates (experiencer position-flip; instrument promotion
under agent suppression) have their discriminating tests run on
unseen material.

### Slice 7 — Independent evaluation (weaknesses 9 and 10)

Hand-judged precision for derivations (the density run's proxy is
not judged correctness), a role-accuracy sample, an untouched test
set designed by neither the scheme's author nor its evaluator, and
native-speaker judgment on the Chinese side. The evaluation
infrastructure begins before Slice 1 and runs throughout; this slice
is where it becomes independent.

**Acceptance test:** judged precision and role accuracy are reported
against the declared thresholds on the untouched set; a result the
development side can reproduce only on its own sentences fails. The
declared thresholds are the ratified threshold policy below — until
they were ratified this slice could not pass or fail; it now can.

### Ratified policy (user ruling, 2026-11-15)

The two standing decisions below are **settled**. Both were proposed
in the v5 design review (`sentencesToWuxing-5.txt` §1–§2) and
ratified by the user on 2026-11-15, with one amendment (the pilot
size in §A.5, from the development side's review, accepted as part
of the ratification). They are policy now, not proposals: slices
pass or fail against them, and changing them requires a new ruling,
recorded here with its date.

#### A. The classification protocol (ratified)

**Classify aspects of an entity, never the entity wholesale.** Every
classification is an assertion about one aspect of a thing, on one of
three axes, recorded separately:

1. **Material** — what the thing is made of. The strongest axis:
   material categories are directly attested (the five materials,
   §B of `wp1-classification-survey.md`). A composite object is
   classified **by its components** (timber handle, metal blade),
   never forced into a single element; derived whole-object material
   assertions must not overwrite the component assertions.
2. **Nature** — the thing's characteristic properties. A nature
   classification is legitimate only through a **recorded property**
   (rigidity, flowing, taking an edge…), and the source wording is
   retained alongside any normalised property. "Feels Metal-like" is
   not a basis.
3. **Function** — what the thing does or is used for. Function
   carries **no automatic elemental assignment — phase null**. A
   functional correspondence may be proposed later only as a
   creative application that passes the prediction-admission test
   (Part B). That a knife cuts does not make its material Metal.

**Evidence levels** (recorded on every assertion):

- **Level A** — directly attested material classification: a source
  explicitly identifies the material as one of the five materials.
- **Level B** — attested characteristic correspondence: a source
  associates the thing with a phase through a stated property,
  nature, flavor, color, process, or other correspondence.
- **Level C** — project-derived: the project applies a documented
  characteristic to a new object. Tagged creative, always — a
  level-C assignment that happens to look obvious is still level C.

**Two standing cautions.** (i) A source's association of a thing via
one correspondence is **not** a classification of the whole entity:
that the Lingshu lists an animal in a flavor set classifies that
animal *by flavor*, and says nothing by itself about its substance,
behaviour, or function. (ii) **Abstention is legitimate**: an
unclassified object is better than an unsupported classification,
and abstentions are recorded as abstentions, not errors — subject to
the coverage bar in §B, which prevents passing by abstaining on
everything.

**Graph mapping.** The axes map onto the graph's existing
(concept, aspect) keying with aspect values **material / nature /
function**. Provenance (attested / creative / analysis) and evidence
level are carried per assertion, separately: a source's general
classification of a material does not attest every property of every
manufactured object containing it.

**Pilot amendment (ratified).** The ordinary-object sample is
piloted at **100 objects — 20 each of tools, substances, materials,
plants, animals** — to validate the procedure before scaling to the
500-object sample v5 proposed. The pilot's success criterion is a
reproducible procedure, not full assignment (protocol in
`wp1-classification-survey.md` §5).

#### B. The threshold policy (ratified)

Frozen as of ratification; thresholds are met on held-out samples,
never on development material, and confidence intervals are reported
with every rate.

*Derived conclusions (Slice 7, density runs):*

- Human-judged derived-conclusion **precision ≥ 90%**, with the
  lower bound of the 95% confidence interval **≥ 85%**; benchmark of
  ~400 independently sampled derivations, **3 independent judgments
  each**, with an adjudication procedure for disagreements and
  breakdowns by derivation depth and relation type.
- **Unsupported-inference rate ≤ 5%** (plausible-but-unestablished
  counts as unsupported, separately from incorrect).
- **Unresolved contradictions ≤ 1%** — an explicitly flagged conflict
  is a successful detection, not a failure — **and** contradiction
  **detection ≥ 95%** at baseline, rising to **≥ 97%** at ×10 density
  and **≥ 99%** at ×100 (measured on deliberately injected
  contradictions).

*Classification (Slice 1):*

- **Coverage ≥ 90%** at baseline, rising to **≥ 95%** (×10) and
  **≥ 97%** (×100).
- **Accuracy ≥ 90%** among classified assertions, with a
  **per-domain floor of 85%** and **unsupported assignments ≤ 5%**.
  Material, nature, and function results are reported separately.

*Valency (Slice 2):*

- Argument-role **precision ≥ 90%**; **invalid-argument rejection
  ≥ 85%**; **legitimate-argument acceptance ≥ 90%** (the rejection
  bar may not be met by refusing everything); **calibration error
  ≤ 0.10**.

*Aspect dispatcher (Slice 5):*

- **Irregular-form selection ≥ 98%** (the inventory is finite and
  the forms directly verifiable); **semantic preservation ≥ 95%**;
  **aspectual feature preservation in round-trip ≥ 95%**;
  five-pattern realisation at 100% of the supported pilot inventory.

*The density rule.* **Correctness bars never drop with density.**
As the ontology scales (×10, ×100), what rises is the evidence
burden: contradiction detection and classification coverage rise as
tabulated above, and two floor conditions apply at every density —
**no derivation-depth category below 85% precision** and **no active
relation type below 85% precision** — and **unsupported-conclusion
growth must not outgrow accepted-conclusion growth**.

*The proxy-validity test.* The density run's precision proxy
(path ≤ 3 ∧ confidence ≥ 0.6) fell 0.917 → 0.751 across ×100 scaling.
That proxy measures derivation characteristics, not judged truth.
When the first human-judged benchmark runs: if judged precision
holds at ≥ 90% while the proxy says otherwise, **the proxy is
invalid as a correctness measure** and is retired to a diagnostic;
if judged precision falls below 90%, the scaling problem is real
and the brakes, not the ruler, are what get repaired.

### Standing decisions — settled (2026-11-15)

1. **Slice 1 classification principle — SETTLED.** Ordinary things
   are classified under the ratified three-axis protocol above
   (attested material/nature scheme first, creative extensions
   tagged creative, function unassigned by default). This was the
   decision Slice 1 was blocked on; it is blocked no longer.
2. **Density / precision thresholds — SETTLED.** The ratified
   threshold policy above is the pass bar for Slices 1, 2, 5, and 7
   and for the density runs. DESIGN §5.2's open bar is closed by it.

---

## Part B — Hypothesis registry

Every surviving non-cycle claim, with its status and the evidence
that would settle it. The two cycle tables are the whole dynamics;
anything below is an addition and carries its own burden.

### H1 — Argument suppression and the Water→Wood closure

**Statement.** Argument suppression (agentless passive, impersonal)
is associated with the Water→Wood generating closure.
**Status.** Split. The **representation is adopted** (repair tranche,
2026-11-15): a suppressed valency slot stays declared on the
predicate's `suppressedRoles` state; the checker does not flag it;
generation neither demands nor invents a filler. The **cycle
association is a label with no testable content claimed** — Water→Wood
is the generating closure, not a controlling edge (v2's "overcoming"
label was a mislabel, corrected), and no prediction is currently
drawn from associating suppression with it.
**Evidence burden.** Any future claim that the closure association
*predicts* something (e.g. which constructions permit suppression, or
suppression interacting with clause chaining at the same closure
point) must pass the prediction-admission test before the label is
treated as mechanism.

### H2 — Metal→Fire licensing

**Statement.** Mood/aspect licensing restrictions — in some
languages certain moods are licensed only in certain aspectual
frames (e.g. subjunctive only in imperfective) — form a checker
constraint family running Metal→Fire: structure gates mood.
**Status.** Hypothesis, not implemented. (Recast in v3 from the
retracted mood-coerces-aspect claim; it is also the surviving content
of v2's "agreement blocks mood.") The edge direction is an addition:
the controlling cycle has Fire→Metal, not Metal→Fire.
**Discriminating test.** A language/construction where licensing
demonstrably blocks a mood–aspect combination that is otherwise
well-formed — the checker must flag exactly the blocked combination
and accept the licensed ones, on material not used to design the
rule.

### H3a vs H3b — Rival sense-priority hypotheses

**H3a — Discourse priority (v2's axiom).** In sense choice, deeper
layers override local ones: Water (discourse) > Fire (local
modifiers) > Metal (syntax) > Wood (verb expectations). "The muddy
bank of the Federal Reserve" resolves financial because discourse
outranks the adjective.
**H3b — Earth→Water restraint.** Local collocational grounding
(Earth) constrains discourse: Earth *controls* Water in the ke
cycle, so a demonstrably incompatible local grounding blocks a
discourse override. The same example may resolve as genuinely
ambiguous, or river-side, when the local evidence is strong.
**Status. PREREGISTERED (2026-11-15)** — predictions frozen below,
before any test materials exist; see the preregistration. Neither
hypothesis is established. H3a is an axiom — nothing in either cycle
entails it — whose only exercise so far is its own constructed
example, on which human judgment is split. H3b has a true
controlling relation behind it but has never been run.
**Interim implementation stance.** Earth as base reading: collocation
sets the default sense; other layers act as pressures that can
overturn it; balanced pressures record an undecided state. This is a
stance for building, not a verdict — and it is the implementation
that gets frozen under the preregistration before any materials are
seen.

#### Preregistration — the sense-selection experiment (frozen 2026-11-15)

Design per the v5 design review (`sentencesToWuxing-5.txt` §3),
entered into this registry before materials exist, so that the two
hypotheses can lose.

**Materials do not yet exist.** They must be constructed by parties
independent of both hypotheses' authors (see three-party separation
below). No item in any earlier evaluation — including "the muddy
bank of the Federal Reserve," which was constructed by H3a's own
side — counts as test material for this experiment. **The
implementation is frozen before the materials are seen**: the model
team receives the test only after this protocol and the predictions
below are locked, and may not modify the model after seeing the
items.

**Design.** A 2 × 2 factorial: **discourse topic** (financial /
river-geographical) × **local collocation** (financial / river), over
ambiguous target words (the *bank* family is the illustrative case,
not the item set). The two congruent cells (financial+financial,
river+river) are **controls**; the two conflict cells are the
**decisive observations**, because the hypotheses agree on the
controls and disagree only under conflict.

**Predictions, fixed in advance.**

| Critical condition | H3a (discourse priority) | H3b (Earth→Water restraint) |
| --- | --- | --- |
| Financial discourse + river collocation | Financial sense | River sense, or substantial resistance to financial override |
| River discourse + financial collocation | River sense | Financial sense, or substantial resistance to river override |

**Falsification conditions.** H3a is falsified as a general priority
rule if strong local collocations systematically determine
interpretation despite conflicting discourse, particularly across
multiple lexical items and constructions. H3b is falsified as a
general controlling rule if discourse consistently overrides strong
local collocations, including cases where the local grounding is
unambiguous. A mixed result indicates that neither universal rule is
sufficient; the follow-up question is then whether the interaction
depends on collocation strength, discourse coherence, lexical
ambiguity, or construction type — and no new cycle relationship is
to be created automatically to explain such a result.

**Three-party separation.** (i) **Materials team** — linguists or
trained language researchers who are not members of the project:
mine candidate ambiguous words from independently selected corpora,
identify naturally occurring collocation patterns, construct
controlled paragraphs, obtain separate review, then freeze the item
set and publish its hash or equivalent version identifier. They must
not know which hypothesis the developer favours. (ii) **Model team**
— registers the predictions (this entry) and freezes the
implementation; must not modify the model after seeing the test
items. (iii) **Judgment team** — interprets and annotates the
paragraphs; must never be shown the elemental classifications or the
rival hypotheses.

**Judging protocol.** At least **40 ambiguous lexical items** (noun
and verb senses; varied collocation strengths, discourse domains,
and sense frequencies), each in **4 conditions** (160 paragraph
instances); ~100 independent readers giving **~25 judgments per
instance** (~4,000 judgments). Presentation randomised; near-identical
versions of one item never in immediate succession. Per paragraph,
collect: the interpreted sense, a short paraphrase, confidence
(5-point), a coherence judgment, and whether the target remains
ambiguous. **Free interpretations are collected before any
forced-choice alternatives are shown**, and an **ambiguity response
is allowed**; the answer key is independently established from the
intended manipulation. Analysis: mixed-effects logistic or
multinomial model with participant and lexical item as varying
effects; the primary test is the discourse × collocation interaction.

**Acceptance criteria.** A hypothesis is supported only with: the
full item and judgment minimums above; a **statistically reliable
effect in the predicted direction**; a **practically meaningful
difference of at least 10 percentage points** on the critical
conditions; and **replication on a second, independently constructed
item set**. If both hypotheses explain the data, or neither reaches
the declared effect threshold, **the registry retains the rivalry as
unresolved** — no verdict is recorded, and the interim stance stays
a stance.

**The Chinese programme (separate).** The Chinese evaluation is
designed independently, **not** produced by translating the English
experiment. Native speakers (v5 proposes 60 for the initial study);
**original Chinese texts and sentences**; grammaticality,
naturalness, and intended-meaning judgments on a **7-point
acceptability scale**; grammatical, ungrammatical, and semantically
anomalous fillers; randomised, counterbalanced presentation;
mixed-effects ordinal analysis; independent native-speaker
adjudication. Three tests: **A — parsing** (is the sentence
grammatical, what does it mean, which roles are expressed, is the
parser's interpretation correct), **B — generation** (grammaticality,
naturalness, semantic fidelity of generated Chinese), **C — elemental
prediction** (derivations on phenomena not used in development,
judged on the linguistic and semantic result — never on agreement
with Five-Element theory). Standing control: the Chinese aspect
particles 了 (le) / 着 (zhe) / 过 (guò) are **not collapsed** into one
English-style aspect category; the shared representation must produce
appropriate Chinese constructions without assuming a one-to-one
mapping from English auxiliary forms.

### H4 — Wood→Metal (aspect→affix): REJECTED

**Statement (rejected).** Aspect directly generates affix, as a
Wood→Metal edge.
**Status.** Rejected as an edge (v3/v4). Wood→Metal is in neither
cycle. Morphology is a pipeline of explicitly typed operations —
lemma → aspect selection → **form selection** → agreement →
affixation → phonological conditioning → surface — and realisation
is by affix, auxiliary chain, or lexical/particle cue depending on
the aspect pattern and the language. No edge is drawn.

### H5 — ARTEFACT_MATERIAL_DOMINANCE_V1: artefact-level derivation from component materials

**Statement.** An artefact inherits an elemental classification
only when a specified, function-independent material aspect is
sufficiently dominant and structurally constitutive of the
artefact. The mere presence of a material, or the artefact's use,
is insufficient. Two-stage procedure: first establish the
artefact's composition and component structure; then decide
whether those material assertions support an artefact-level
assertion. (From the v6 survey, `sentencesToWuxing-6.txt` §2;
registered for GAP-1, whose revised statement is in
`wp1-classification-survey.md` §3.)
**Status. REGISTERED HYPOTHESIS (adopted 2026-11-15).** A proposed
project rule — `CREATIVE_APPLICATION` / `ANALYSIS`, never
`ATTESTED_TRADITION`. Not implemented; nothing has been banked
under it.

**Component record.** Each component is recorded with:

| Attribute | Meaning |
| --- | --- |
| `material` | Material identity, with its own evidence and phase assertion if justified |
| `mass_fraction` | Estimated fraction by mass, if known |
| `volume_fraction` | Estimated fraction by volume, if known |
| `structural_role` | Load-bearing, joining, enclosing, supporting, decorative, etc. |
| `operational_role` | Working edge, striking surface, handle, insulation, control, etc. |
| `replaceability` | Whether the component is replaceable without changing the artefact's identity |
| `evidence_quality` | Source and confidence for each component assertion |

These roles describe the artefact; they do not themselves assign
an element.

**Governance priority** (which component, if any, governs the
artefact-level assertion):

1. **Constitutive material dominance** — a material making up the
   artefact's defining body may govern when it is materially
   dominant and no other component has an equally strong claim.
2. **Structural dominance** — a component essential to the
   artefact's structural identity may govern when composition
   alone would be misleading.
3. **No automatic operational dominance** — the working part does
   not govern by performing the work: a metal blade does not make
   a wooden-handled tool Metal merely because the blade performs
   the cutting.
4. **No automatic majority rule** — the largest component by mass
   or volume does not govern if it is merely ballast, filler, or
   packaging.

**Proportions.** Proportions are evidence, not a universal voting
mechanism. One phase-bearing material clearly dominant in the
defining body, with other components incidental → a derived
single-phase assertion is permitted. Two or more materials
substantial and constitutive → component-level classifications
retained, normally abstain at artefact level. A small component
essential to identity but not materially dominant does not win by
importance alone; it requires an independently specified
structural rule. Composition unknown or disputed → abstain.
Composition varying across versions of the artefact → classify
the version or instance, not the generic name. **Candidate
dominance threshold: at least 70% of the defining body's mass or
volume**, provided the other materials are not independently
constitutive — a starting hypothesis, not a classical rule. The
choice of mass versus volume is fixed by material class and
measurement availability **before** evaluation; selecting whichever
denominator produces the desired classification is prohibited.

**Composite abstention.** An artefact remains phase-null at the
whole-object level when: no material is clearly dominant; the
dominant material differs depending on whether mass or volume is
used; a structurally essential component has a different phase and
no validated rule resolves the conflict; the object is a
functional assembly of independently substantial materials; or the
object has multiple materially distinct versions under the same
name. (A metal-headed, wooden-handled hammer keeps its component
classifications; it is not forced into Metal because the head is
the working part, nor into Wood because the handle is large. A
single artefact-level phase is not required for the ontology to be
useful.)

**Confidence policy.** A derived artefact assertion never inherits
its strongest component's confidence as though it were direct
attestation: C_artefact ≤ min(C_component, 0.80), and a
single-step derivation applies a further penalty — C_derived =
min(C_component, 0.80) × 0.80 — so even a component assertion at
confidence 1.0 yields at most **0.64** for a one-step
artefact-level inference. Deliberately conservative; the numerical
penalty is to be calibrated against human judgments later, not
treated as a metaphysical property of derivation.

**Required provenance tags** on every assertion derived under this
rule: `provenance_layer: CREATIVE_APPLICATION`,
`assertion_kind: DERIVED`,
`derivation_rule: ARTEFACT_MATERIAL_DOMINANCE_V1`,
`source_assertions: [component assertion IDs]`,
`derivation_steps`, `confidence` (calculated), `status:
PROVISIONAL`. The assertion retains links to its component
evidence and the exact rule version, and is never exported or
displayed as an attested classical classification.

**Falsification conditions.** The rule earns admission only if its
classifications predict independent judgments better than simpler
alternatives; the test set must include counterexamples selected
by someone other than the system's designers, including objects
where the largest material, the defining material, and the working
material differ.

| Prediction | Discriminating test | Failure condition |
| --- | --- | --- |
| Defining-body dominance predicts human material-based classification better than majority-by-mass alone | Blindly judge a held-out set of composite artefacts | No improvement over mass-only classification |
| Structural role can resolve some cases where composition alone cannot | Compare artefacts with similar proportions but different structural arrangements | Structural role adds no predictive value |
| Composite abstention is better than forced single-phase assignment | Ask independent annotators to classify artefacts and rate certainty | Abstentions are not more accurate or better calibrated than forced assignments |
| The rule generalises beyond familiar tools | Test unfamiliar artefacts and artefacts from different craft traditions | Performance collapses outside the hand-built seed set |

### H6 — WEATHER_ASPECT_DERIVATION_V1: phenomenon classification through physical aspects

**Statement.** A weather phenomenon is classified only through a
documented, defining physical aspect that corresponds to a climate
category — never by name, visual resemblance, associated season,
or a secondary effect alone. Four things are kept separate in
every assertion: `phenomenon` (rain, snow, hail, fog, frost,
thunderstorm), `physical_aspect` (precipitation, suspended
droplets, ice formation, temperature, air movement, moisture),
`climate_correspondence` (the relevant five-climate relation, if
supported), and `derivation_path` (the explicit rule connecting
the physical aspect to the climate category). (From the v6 survey,
`sentencesToWuxing-6.txt` §2; registered for GAP-5, whose revised
statement is in `wp1-classification-survey.md` §3.)
**Status. REGISTERED HYPOTHESIS (adopted 2026-11-15).** A proposed
project rule, not classical doctrine. Not implemented.

The five climate categories （风 wind, 热 heat, 湿 damp, 燥
dryness, 寒 cold — catalogue §1.5) are not interchangeable with
everyday weather labels. The *Suwen* material and the *Lingshu*
passage list such conditions as dryness, dampness, cold, heat,
wind, and rain — notably, the *Lingshu* list itself includes rain
alongside the other conditions. That is a reason not to silently
force every listed weather word into one of the five climate
slots.

**Derivation conditions.** A weather classification may be proposed
only if **all five** hold: (1) the phenomenon has a defined
physical aspect; (2) that aspect is directly connected to one of
the five climate categories by a predeclared mapping; (3) the
connection is not based solely on season, appearance, metaphor, or
a secondary consequence; (4) competing climate interpretations are
recorded; (5) the assertion is scoped to the aspect, not
automatically to the entire phenomenon. (Rain may produce
dampness, but precipitation and dampness are not identical — rain
can fall in a dry climate, and a damp environment can exist
without rain — so "rain → dampness" is at most a contextual causal
relation in a particular observation, never a permanent ontology
edge.)

**Provisional treatment** (initial, under this rule):

| Phenomenon | Candidate physical aspect | Initial treatment |
| --- | --- | --- |
| Wind | Moving air | Candidate Wood correspondence, if the project's source-based wind–Wood relation is explicitly in scope |
| Heatwave | Sustained high temperature | Candidate Fire correspondence |
| Persistent damp conditions | Moisture saturation or prolonged wetness | Candidate Earth correspondence, if the dampness relation is explicitly sourced |
| Dry spell | Lack of atmospheric or surface moisture | Candidate Metal correspondence, if the dryness relation is explicitly sourced |
| Cold spell | Sustained low temperature | Candidate Water correspondence |
| Rain | Liquid precipitation; may produce wetness or dampness | **Not automatically Earth or Water**; keep precipitation distinct from resulting dampness |
| Snow | Frozen precipitation; cold and water/ice properties | **Phase-null** unless a specific aspect rule is tested |
| Hail | Ice precipitation, often produced by convective storm processes | **Phase-null**; neither cold nor ice alone establishes Water |
| Fog | Suspended liquid droplets near the surface | Candidate moisture aspect, but not automatically dampness or Earth |
| Frost | Surface ice deposition | **Phase-null** pending a rule that distinguishes cold, freezing, and deposition |

**Confidence decay.** A separate rule from H5's, because weather
derivations can chain through physical observations: C_n = C_0 ×
0.75^n, where n is the number of inferred links between the
observed phenomenon and the climate classification — a **ceiling**,
not an automatic score:

| Derivation | Maximum confidence |
| --- | --- |
| Directly attested climate correspondence | Source-dependent; no project derivation penalty |
| One inferred physical-aspect link | 0.75 |
| Two inferred links | 0.56 |
| Three inferred links | 0.42 |
| Four inferred links | 0.32 |

Direct source assertions retain their own source confidence; the
decay applies to project inference, not to the historical text. If
the phenomenon has multiple plausible physical interpretations,
confidence should be lower, or the classification should abstain;
confidence never accumulates merely because several derived
statements repeat the same original assumption.

**Falsification conditions.**

| Prediction | Discriminating test | Failure condition |
| --- | --- | --- |
| Physical-aspect mapping predicts classifications better than word association | Blindly classify a held-out set of weather observations using physical descriptions without phenomenon names | No improvement over name-based classification |
| Rain and dampness are not equivalent | Compare rainy-but-dry-context cases with damp-but-rainless cases | Annotators consistently treat them as the same aspect |
| Multi-aspect treatment improves accuracy | Ask independent meteorological and Chinese-medicine domain judges to classify ambiguous phenomena | Multi-aspect representation does not improve agreement or calibration |
| Confidence decay reflects increasing inferential distance | Compare confidence with blind human accuracy by derivation depth | Confidence is not calibrated, or deeper derivations are no less reliable |

The first test set should include at least 100 observations or
carefully specified scenarios, with rain, fog, snow, hail, frost,
wind, heat, and dry conditions represented, deliberately including
edge cases rather than only textbook examples.

**Follow-on (recorded, NOT done).** Adopting this rule requires
re-scoping the existing whole-phenomenon weather entries in
`src/fork/classify.ts` — rain, snow, sleet, and hail currently
stand as whole-phenomenon Water assignments tagged `fork-creative`
(see catalogue §2.2, where they are UNCITED in scope) — to
aspect-level / provisional status under this rule. That re-scope
is a **separate implementation task**: it interacts with the join
tests and the density record, and it has **not** been done in this
adoption. The entries stand as they are until that task is taken
up.

### H7 — FLAVOR_BRIDGE_V1: bencao flavor assertions composed with Neijing flavor correspondences

**Statement.** A substance's recorded flavor in a *bencao* entry
may be composed with an attested *Neijing* flavor correspondence
to yield a correspondence of the substance's **recorded-flavor
aspect** to a phase — never a classification of the substance as a
whole. The two legs are distinct assertion kinds sharing a
controlled five-flavor vocabulary, and the graph keeps them
distinct: `MATERIA_MEDICA_FLAVOR` (substance —*has_recorded_flavor*→
flavor; entry-level, level A for that assertion) and the *Neijing*
correspondence assertions (flavor —*enters_viscus*→ viscus, *Suwen*
23 / *Lingshu* 56; flavor —*corresponds_with*→ phase, *Suwen* 4).
The preferred path is *Suwen* 4's direct flavor-to-phase-category
clause (its flavor and its category stated together, e.g. 其味酸，
其類草木） — **one** attested correspondence leg. The visceral path
(flavor → viscus → phase) is the fallback and must preserve both
relations when used. (From the v7 survey, `sentencesToWuxing-7.txt`
§1, answering Brief 4; the *Bencao Jing* preface — 藥有酸鹹甘苦辛
五味，又有寒熱溫涼四氣及有毒無毒 — and *Suwen* 23's five-entry list
were spot-verified verbatim at evaluation. Registered against the
mineral survey's negative result, `wp1b-mineral-survey.md`: 0 of 50
substances carries a phase assertion, but flavor is recorded
completely.)
**Status. REGISTERED HYPOTHESIS (adopted 2026-11-15, with
amendments A1 and A2 below).** Not implemented; **nothing is banked
under it.** The mineral survey's 50 substances become eligible for
H7-derived correspondences only under a separately approved
implementation pass.

**Admission conditions.** A bridged correspondence may be recorded
only if **all six** hold: (1) the substance has an explicit
five-flavor value in a named *bencao* entry and recension;
(2) the flavor is one of the five values used in the relevant
*Neijing* correspondence passage; (3) the phase mapping is
explicitly attested in that passage or another named, compatible
*Neijing* passage; (4) the output is scoped to the recorded-flavor
aspect, never the whole substance; (5) the output implies no
therapeutic indication, safety, efficacy, organ action, or
functional classification; (6) the derivation is recorded in full
(see Representation) — an unrecorded bridge is not admitted.

**Grade and confidence — the attested-chaining pricing rule.**
The composed correspondence sits at evidence grade **B** (the
weakest grade along the path). Its confidence is **not** computed
by H6's 0.75^n decay. The pricing distinction is general and is
registered as method, not only for this bridge: **decay prices
inferred links; compatibility prices attested links whose scopes
might mismatch.** H6's links are project inferences, so each costs
confidence. H7's links are independently attested textual
relations; the risk is whether the two sources use the shared term
compatibly. Hence:

  C_bridge = min(C_A, C_B) × K

where C_A is confidence in the entry-level flavor assertion, C_B
confidence in the textual flavor correspondence, and K the
scope-compatibility factor of the bridge.

**Amendment A1 — K is fixed per bridge (adopted with H7).** K is
a property of the bridge (this source-pair, this scope), assessed
**once**, with stated grounds and a predeclared value recorded
here; it is never re-assessed per substance. Per-entry variation
enters only through C_A (recension quality, term ambiguity in that
entry). If compatibility cannot be established for a proposed
bridge, the bridge abstains — no numerical value may be assigned
to disguise the uncertainty. For this bridge (*Bencao Jing*
recorded flavors ↔ *Neijing* five-flavor correspondences), **K =
0.90**, on these grounds: both traditions use the identical
five-value vocabulary as formal classification (the *Bencao*
preface states the five flavors as the medicinal classification
scheme, not as incidental taste words); the *Neijing* passages in
scope are dietary/medicinal in frame, the same broad frame as the
entries; and no systematic sense divergence between the two
flavor vocabularies was found in the surveyed material. K is a
registry parameter: it changes only by registry amendment citing
new evidence, and the falsification test below is its check.

**Amendment A2 — provenance pinned; B-derived ≠ B-direct (adopted
with H7).** Every H7 output carries `assertion_kind =
DERIVED_CORRESPONDENCE`, the analysis/derived provenance layer,
and `evidence_grade = B` understood as **B-derived** — a distinct
kind from a directly attested B correspondence. Queries for
attested correspondences must exclude B-derived records unless
they explicitly request them, and every derived record must be
reconstructible from its stored derivation path. A B-derived
correspondence must never be flattened, downstream, into a direct
attestation.

**Guard case — cinnabar （丹砂）.** Under this rule cinnabar
receives a sweet-flavor→Earth correspondence **for its recorded
flavor aspect** (Benjing layer: 味甘，微寒； no toxicity statement in
that layer). Its material aspect, its thermal nature, and its
indications are separate assertions, untouched by the bridge.
Colour or toxicity from a later layer (e.g. the *Baizhong Lu*
commentary's red-colour/Fire/Heart discussion) **must not veto**
the flavor assertion: aspects accumulate into a multi-aspect
profile with separate provenance; they do not compete for one
element slot. The correspondence licenses no statement about
cinnabar's safety or suitability — condition (5) and the record's
`limitations` field carry that, not reader discretion.

**Nature axis.** The four qi （寒熱溫涼） do **not** bridge to
phases under current evidence. The *Bencao* preface lists five
flavors and four qi as separate attributes; thermal nature belongs
to the yin-yang axis and stays phase-null unless a separate source
explicitly supports a specific correspondence. If a future
nature-bridge hypothesis conflicts with a flavor-derived
correspondence, the conflict is recorded as a cross-axis tension
to test — neither assertion is rewritten to remove it.

**Representation.** Both forms, jointly: explicit mediating flavor
nodes that reasoning visibly passes through, **and** a derived
correspondence record per output containing: `assertion_kind`,
provenance layer, `evidence_grade` (B-derived), subject (exact
substance and recension), `aspect = recorded_flavor`, mediator
(exact flavor value), `source_assertion_ids` (the flavor assertion
and the correspondence assertion), `source_texts` (text, chapter,
passage, recension), `rule_id` (H7, with version), `scope`,
`confidence` (computed as above), `limitations`, and `status`
(proposed / admitted / challenged / suspended / retracted).

**Falsification conditions.**

| Prediction | Discriminating test | Failure condition |
| --- | --- | --- |
| The bencao five-flavor field is compatible with the *Neijing* five-flavor correspondence in the stated scope (the K = 0.90 assessment) | Independently compare entry-level flavor descriptions and contemporary or near-contemporary explanations of the five flavors | Evidence that bencao flavor labels systematically denote a different classification, incompatible with the *Neijing* categories |
| The bridge predicts a correspondence of the flavor aspect, not the whole substance *(representation test)* | Blind judges classify flavor aspects separately from material, nature, and therapeutic indication | Judges cannot reliably distinguish the flavor correspondence from whole-substance elemental classification |
| The bridge does not license clinical conclusions | Test downstream inferences with explicit counterexamples and safety-sensitive cases (cinnabar first) | The system produces clinical or safety claims from the correspondence alone |
| The bridge is better than an unqualified vocabulary lookup | Compare qualified H7 against a simple flavor-to-element lookup on held-out entries and adversarial cases | H7 does not reduce scope errors or unsupported conclusions |

### Settled corrections carried forward

- **Suppletion placement (v3).** Suppletion is a form-selection
  event at the stem: *went* and *gone* are separate listed-form
  branches, chosen per aspect; the Metal cuts apply to whichever
  stem was selected. The v2 Water→Metal "overcoming" edge for
  suppletion is deleted.
- **Mood-coerces-aspect retracted (v3).** "I would have been going"
  is compositional stacking (modal + perfect + progressive), not an
  overcoming. The real interaction is licensing — see H2.
- **Earth missing from v2's priority order (v2 evaluation).** The
  layer that decided nearly every tested case had no rank. Repair:
  Earth as the base reading (see H3 interim stance).
- **The predicated-as relation (repair tranche).** Nominal
  predication is carried by a declared meaning-graph relation,
  `predicated-as`, between two Earth nodes. It is an architectural
  addition, **not a cycle edge** — its cycle field computes to
  `other`, and no reasoning path may traverse it as one. English
  realises it with a copula; Chinese with zero copula.
- **Prediction-admission test (v4) — the standing gate.** Any new
  elemental claim must record four fields before admission:
  (1) the conventional account — what ordinary linguistics already
  predicts; (2) the elemental account — what the Five-Element
  mechanism adds; (3) the novel prediction — what the elemental
  account predicts that the conventional account, as implemented,
  does not; (4) the discriminating test — what observation would
  distinguish the two. A claim that cannot supply field 3 is
  notation, not mechanism, and is recorded as such.

---

> The cycles determine the permitted dynamics. The ontology supplies
> what those dynamics operate upon. Experiments determine which
> proposed relationships have earned the right to remain.
