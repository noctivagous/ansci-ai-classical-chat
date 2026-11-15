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


## Part C — Depth, independence, coverage (adopted 2026-11-15)

Adopted from the Brief 5 answer (the v8 document), with Kavi's amendments
A1 and A2 recorded where they apply. Full reasoning: the v8 desk
evaluation. This part supplies the working specification for WP2
(benchmark infrastructure) and the valency half of WP4.

### C.0 Three ledgers

The system is evaluated through three independent ledgers, and a gain in
one must never be presented as a gain in another:

1. **Mechanical feature preservation** — whether the system retains its
   own analysis through generation (C.1). A preserving round trip is NOT
   evidence the analysis was correct.
2. **Externally judged semantic correctness** — the human instruments
   (the preregistered H3 experiment; the human-judged derivation
   benchmark under Part B's ratified thresholds). Not suppliable inside
   the build loop; their absence is recorded, not papered over.
3. **Evidence-qualified ontology coverage** — classifications held at
   their evidence levels under the ratified protocol (C.6).

### C.1 The depth metric (feature preservation)

**Pipeline.** Original sentence → frozen parser → meaning graph G0 →
frozen generator → sentence S1 → same frozen parser → graph G1 →
mechanical feature comparison G0 ↔ G1. Surface exactness is reported as
a diagnostic only; feature preservation is the depth measure.

**Feature atoms.** Each feature is an atomic record (feature_id, family,
scope_id, value, source node/edge, required_for_round_trip) over the
families the parser actually represents: predicate and roles; role
realization (the six slot states); aspect features; number; mood; voice;
negation and modality with scope; suppressed slots; particle scope;
connective structure; entity reference. A represented feature may not be
omitted from scoring because the generator finds it hard; an
unimplemented feature is not scored as present. Uncertainty recorded in
G0 must survive as uncertainty, never silently become definite in G1.

**Outcomes.** Preserved (same key, same value) = 1. Canonicalized
(different surface, same normalized feature value and scope) = 1.
Partially preserved = fraction of atoms, only across atoms of a declared
multi-valued bundle. Lost, contradicted, duplicated, added = 0, with
duplicated/added reported separately as the spurious rate. A role swap
(Patient→Agent) is a contradiction, not partial credit. A dropped
numeral where number was represented is a loss; progressive→simple is
loss of the progressive atom; a suppressed agent becoming overt is a
realization change, not canonicalization.

**Scores.** Micro score P = matched atoms / required atoms in G0; macro
score = unweighted mean of per-family preservation over represented
families. Report lost rate, contradiction rate, spurious rate, family
scores, exact-string rate, and canonicalized rate alongside. A family
with too few atoms reports as under-tested, never as passing.

**Canonicalization discipline.** Canonicalization is a fixed, versioned
normalization function over feature values and known surface variants,
frozen before a run. No normalization exception may be added after
inspecting a failure and applied to the same test version.

**Records.** Every round trip emits one record per original atom
(round_trip_id; parser, generator, normalizer versions; sentence hashes;
feature_id; family; scope; original and reparsed values; outcome;
score), so any loss is traceable to one atom of one sentence.

**Bars.** The ratified aggregate bar stands: feature preservation ≥ 95%.
**Amendment A2 (policy note):** for this metric's first release, each
adequately sampled family must additionally reach ≥ 90%. This 90% family
floor is a target of THIS metric, adopted with it; it is not a revision
of the ratified threshold policy, whose 85% floors govern derivation
depth categories and relation types — a different instrument.

**Amendment A1 (G0 must also be scored).** Preservation against an
unscored G0 can certify consistent wrongness. In the baseline run and in
every sealed run, determinate items also report G0's accuracy against
the sealed expected graphs (C.5), alongside G0↔G1 preservation.

### C.2 The depth programme (stage order and frozen targets)

| Stage | Held-out target | Must not regress | Failure test |
| --- | --- | --- | --- |
| 0. Baseline instrumentation | Complete feature-level score for every round trip on the frozen 80-holdout and the 26-demo (reported separately, never pooled); every mismatch classified mechanically | Existing parse results unchanged | Same inputs + versions produce different records or scores |
| 1. Valency repair (C.4) | On a separate sealed valency challenge set: role precision ≥ 90%, invalid-argument rejection ≥ 85%, legitimate-argument acceptance ≥ 90% | Holdout parse rate ≥ 85%, no new regressions | FrameNet-only baseline matches or beats the elemental-prior model on unseen lexical units |
| 2. Aspect bundle + dispatcher | Aspect-feature preservation ≥ 95% on aspect-bearing round trips; overall feature preservation ≥ 90% on the holdout after this stage | Parse rate ≥ 85%; no loss in voice, mood, number, suppressed-slot families | Any of progressive / habitual / inchoative / resultative disappears or changes scope across a round trip |
| 3. Construction repair | ≥ 90% of the frozen copular-question, contraction, and fragment cases parse with the expected construction record | Existing holdout successes stay successful | A family improves only by misclassifying another family |
| 4. Sense selection (restraint asymmetry) | Beat the dictionary-order baseline on independently constructed conflict cases; meet the preregistered H3 criterion | No rise in unsupported-sense or contradiction rates | The gain disappears on the second sealed item set |
| 5. Remaining generation features | Aggregate feature preservation ≥ 95%, no critical family below 90% on an adequately sampled set | Parse rate ≥ 85%; no regression on the original holdout | The aggregate passes only because easy families dominate the denominator |

Stage 4 is gated: it begins only after the H3 predictions are frozen and
the relevant evidence features exist; an unvalidated elemental scoring
rule must never become a hidden fallback for dictionary order. Exact
string rate is reported at every stage but is never the primary measure,
and the global 95% bar is not claimable before stage 5.

### C.3 What is elemental here, and what is not

- **Valency: partly.** The argument inventory is lexical/frame evidence;
  the elemental domain prior is a defeasible hypothesis that must beat a
  FrameNet-only baseline on held-out lexical units or be removed.
- **Sense selection: potentially.** Restraint asymmetry is the one
  distinctive elemental mechanism in the depth programme. A candidate
  earns restraint-based corroboration only when (1) the relation is
  explicitly represented, (2) it is a valid member of the closed
  controlling cycle, (3) sense-specific evidence supports the relevant
  aspect, (4) the restraint predicts a distinction the conventional
  baseline does not already capture, and (5) it is tested against the
  negative control where the same cycle would amplify a wrong
  classification. Otherwise sense selection uses lexical, frame,
  collocation, and discourse evidence without elemental scoring.
- **Aspect/morphology, construction coverage, generation feature loss:
  not elemental.** These are representation and engineering problems;
  they are not to be dressed in cycle language.

### C.4 The valency contract

Three levels, with authorities: **domain prior** (weak, defeasible) →
**frame signature** (strong frame evidence) → **lexical-unit
realization** (primary source of argument licensing). Derivation runs
evidence-up, never element-down. A WordNet-derived verb receives a
lexical candidate, never a universal permissive frame.

Lexical-unit record: lexical_unit_id, lemma, sense_id, frame_id,
frame_element_id, grammatical_function, phrase_type, argument_status,
attestation_count, source_ids, source_version, confidence.
argument_status distinguishes: core-realized; core-optionally-unexpressed;
implicit; suppressed; elliptical; constructionally licensed; not normally
licensed. The checker returns three states — **supported**,
**unusual-but-licensed** (recognized alternation, coercion, or
metaphorical frame shift; inanimacy alone never makes an argument
unsupported), **unsupported**. Evaluation holds out entire lexical units,
never merely sentences containing known verbs.

### C.5 The sealed-materials protocol (standing evaluation protocol)

Adopted as the project's mechanical evaluation protocol, alongside — not
replacing — the two human instruments of ledger 2.

**Roles.** Item author (writes items, expected analyses, predictions;
may not modify anything after sealing). System operator (runs the frozen
build; may not inspect expected analyses before execution or change
anything mid-run). Custodian (holds the manifest, verifies hashes,
releases the scoring key after execution; for distinctive elemental
claims the custodian should be a different party from the author).

**Sealed per item:** item_id; item_text and language; source_id;
sampling_frame; selection_seed; item_class (positive control, negative
control, near-miss, brake case, discriminating case); target_claim_id;
conventional_prediction; elemental_prediction; expected_graph (feature
atoms, not a sentence-level label); acceptable_variants (finite, declared
in advance); excluded_decisions; scoring_rule_version;
parser_build_target; creation_timestamp; content_hash; manifest_hash.
A post-run claim that an unexpected output was "also acceptable" is
inadmissible. Each run preserves: commit/build id; parser, generator,
lexical provider, ontology, configuration, and normalizer versions; the
exact command and deterministic settings; raw outputs and reparsed
graphs; per-item and aggregate scores; the manifest and its hash. Any
component change makes a new run under a new manifest.

**Sampling.** Representative sampling (seeded, stratified by language,
construction family, length band, sentence type, lexical domain)
estimates ordinary performance; adversarial sampling (predeclared
structural criteria, never current parser success) tests distinctive
claims. The two are reported separately; neither impersonates the other.

**Item statuses.** Determinate (one expected graph; mechanical scoring);
finite ambiguity (declared set of acceptable graphs); unresolved (no
defensible expected graph — excluded from binary scoring but reported by
class and count; a set with too many unresolved items is defective and
redesigned before execution).

**Adversarial composition** (per 100 items): 40 discriminating, 20
near-miss, 20 brake/negative-control (including X1-style cases where a
wrong classification would be amplified if the brakes failed), 20
ordinary/positive controls. Every discriminating item carries the
prediction-admission fields, a negative control, and a falsification
condition; no elemental win is counted unless the conventional baseline
ran on the same item.

**Standing demotions (phrasing rules for all project reports).** The
demo corpus result (26/26, 23 exact) is a *fitted demonstration result*,
not a general parser accuracy result. The holdout's 85% is a *parse
success rate*, not a correct-meaning rate. The 6/6 prediction run and the
cycle-probe outcomes are *internal evidence* until an independently
authored sealed set reproduces them. Mechanical reproducibility is not
independent validation.

### C.6 Coverage policy (post-pilot)

**Prioritisation.** After the 100-object pilot (which proceeds under its
frozen protocol in the catalogue), tranches are selected by
D(x) = 0.50·F(x) + 0.30·E(x) + 0.20·R(x), all terms normalized to [0,1]:
F = log-normalized frequency in a frozen representative corpus; E =
failure demand, counting distinct held-out failure cases where the
candidate is a necessary missing classification (one missing node counts
once, however many downstream errors it causes); R = rotation need,
c_min / max(1, c_d) over accepted classifications per domain, recomputed
at tranche start. The weights are project policy, frozen per tranche,
reviewed only between tranches. **Eligibility gates precede ranking:**
stable identity or resolvable sense; at least one aspect in scope; an
admissible source or a registered derivation hypothesis; the aspect
distinguishable from the entity's other aspects; not a duplicate. A
candidate failing the evidence gate is recorded as a **coverage gap**,
never converted into a classification task. Selection inputs (corpus
snapshot, failure-log snapshot, domain counts, candidate list,
deduplication rules, formula, weights) are frozen per run; ties break by
distinct failure count, then frequency, then smaller domain count, then
lexical order of stable ID. Tranche size 20, at most 8 from one domain;
unfilled slots carry forward, never filled with unsupported items.

**Source admissibility.** A source is admissible for the assertion it
actually supports, not for every assertion about the entity. Identity,
composition, and property sources (craft texts and technical standards
for artefacts; botanical and zoological taxonomies for identity;
food-composition tables for nutrients) establish what they state and
nothing about phases; phase correspondences require an explicitly
attested correspondence source or a registered, tested derivation rule
(H5 for artefacts, H6 for weather aspects, H7 for flavor-mediated
correspondences). Confirmed absences stand as recorded: no early
five-phase taxonomy of individual tools exists in the surveyed sources;
botanical and zoological taxonomies supply no phase classification; no
general phase classification of ordinary places is established.

**Review triage (density).** Rule validation is not instance validation.
Risk classes: **critical** (new derivation rule or version; new
cycle-related relation; anything that could support clinical, safety,
efficacy, or function claims) and **high** (conflicting evidence;
multiple possible phases; composites; uncertain scope; contested sense;
cross-language transfer; disputed H7 leg; non-straightforward H5
dominance; multi-aspect weather) — 100% human review before admission.
**Medium** (validated rule, new source family/domain/entity type) —
stratified sample review, all exceptions escalated. **Low** (deterministic
reapplication of a validated rule to clear source assertions) —
statistical audit; for a queue of ~1,047, a stratified random sample of
~283 estimates overall error at 95% ±5% (finite-population corrected),
with per-stratum minimums and under-tested strata reported as such.
Rule status and instance status are separate fields: a validated rule's
unreviewed instances remain machine-derived and provisional, usable for
exploratory search only, never as independently verified evidence in a
high-confidence conclusion. Admitted confidence:
C_admitted = min(C_source, C_rule-calibration, C_instance), with
C_instance never set to 1.0 for an unreviewed instance. Escalation: a
sampled unsupported-inference rate above 5%, an unresolved-contradiction
rate above 1%, or a lower 95% precision bound below the ratified bar
suspends automatic admission for that stratum pending investigation.
Ratified thresholds do not drop at any density.

**Language parity.** (1) No cross-language promotion: an English
assertion never becomes an attested Chinese assertion by translation.
(2) Separate denominators: coverage, parse success, feature preservation,
and judged precision are reported per language; no pooled pass may hide a
Chinese failure. (3) Shared identity only when justified: bilingual
alignment connects language-specific lexical units without erasing sense
differences, and alignment is a candidate relation, never an attestation.
(4) Chinese claims require native-speaker judgment for grammaticality and
naturalness. (5) Coverage gate: a domain is not described as covered
while its Chinese lexical inventory is substantially incomplete; the
imbalance is published. The Chinese feeder is language-specific (CWN and
HowNet as sense resources, CCL for corpus evidence, COW for alignment
only — its Princeton-WordNet basis makes it an alignment resource, not
an independent authority), feeding the shared representation downstream
of Chinese sense resolution, with original Chinese wording retained in
every assertion.

### C.7 Consequences for the work packages

- **Next deliverable: the baseline feature-preservation report** (stage 0
  of C.2) — the metric implemented and run over the frozen holdout and
  demo corpora, including the A1 G0-accuracy report on determinate
  items — before any valency or aspect code changes.
- **WP2** now has its specification: C.1 (metric) + C.5 (protocol) +
  C.6 triage for the density side. The judging itself still requires
  independent humans (ledger 2).
- **WP4 valency**: the specification task is superseded by the C.4
  contract — remaining work is the FrameNet signature inventory and a
  build review against the contract, not a from-scratch spec. **WP4
  aspect** still needs its buildable spec from the v5 review (feature
  bundle, Vendler compatibility layer, dispatcher contract with
  abstention).
- The claim demotions of C.5 apply to the demo README and all future
  reports from adoption onward.

## Part D — Stage 3 architecture (v9, adopted 2026-11-15 with amendments)

Brief 6 asked which stage-3 families are the scheme's business and
which are templates. The answer (v9, desk evaluation at
~/workspace/ansci-fork/desk-evaluation-v9.md) is adopted with Kavi's
three amendments. No elemental claims are registered by it; the
cycles are untouched; contraction tokenisation and inversion word
order remain engineering.

**The three-way distinction.** An asserted proposition, a queried
proposition, and a discourse-dependent utterance are different
semantic states, possibly over the same underlying relation. The
meaning graph is not required to make every utterance a proposition.

**Decisions, as amended:**

- **D1 — Questions are operators over existing relations.** A
  question is never an assertion with a null filler. (Amendment A2:
  implemented by extending the existing question machinery — the
  questioned slot is the edge the question-word node fills — with an
  explicit query record carrying the relation and the expected
  answer type, held as expectations, not rigid rules. No parallel
  operator layer.)
- **D2 — Discourse acts are representable independently of
  propositions.** (Amendment A1: adopted at census size — a
  discourseAct field on ParsedSentence, at the discourse/turn
  interface rather than in the meaning graph, carrying
  topic-proposal and reason-query plus an explicit unresolved
  state. The wider act taxonomy requires cases before it is built.)
- **D3 — Ellipsis is licensed, never presumed.** Absence of an overt
  verb is not evidence of an elliptical verb; C.4's slot states
  apply only with a recoverable antecedent or a licensed
  construction. Generalised verbless predication is rejected as the
  universal fragment account.
- **D4 — Semantic relations are not collapsed by surface
  similarity.** Containment ("What's in it?") is not predicated-as;
  opposition is a distinct relation and is not the controlling
  cycle; event ordering ("Which happened first?") is not the
  generating or controlling cycles either — both refusals are
  recorded verbatim from v9.

**Acceptance for stage 3** (v9 §7's four ledgers): construction
recognition ≥90% on the frozen set (the 12 census cases, the §7
adversarial pairs, controls); semantic representation with no
systematic family misclassification (the adversarial pairs are the
operational test); feature preservation under the existing
thresholds; zero regressions. The two generation crashes are
engineering defects, scored separately from construction parsing.
(Amendment A3: case 12's measurement constraints are preserved
parse-side in this stage; their round-trip measurement belongs to
stage 5's family accounting.)
