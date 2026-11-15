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
`wp1-classification-survey.md`.

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
