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

**Blocked on a user decision** (see Standing decisions): the
classification principle — by what ordinary things are classified —
must be ruled before coverage thresholds mean anything.

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
judges accept, H3b fails.

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
development side can reproduce only on its own sentences fails.

### Standing decisions owed by the user

1. **Slice 1 classification principle.** Are ordinary things
   classified by the attested material/nature scheme first (the
   five-materials tradition), with creative extensions tagged as
   creative — or on another basis (function, use, modern taxonomy)?
   Coverage thresholds are meaningless until this is ruled.
2. **Density / precision thresholds.** The density run's §5.2 pass
   bar was never set, and no precision threshold exists for Slices 1,
   4, or 7. Numbers proposed by the development side require the
   user's ruling before any slice can pass or fail against them.

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
**Status.** Rivals; neither established. H3a is an axiom — nothing in
either cycle entails it — whose only exercise so far is its own
constructed example, on which human judgment is split. H3b has a
true controlling relation behind it but has never been run.
**Interim implementation stance.** Earth as base reading: collocation
sets the default sense; other layers act as pressures that can
overturn it; balanced pressures record an undecided state. This is a
stance for building, not a verdict.
**Discriminating test.** A paragraph-level set where topic and
collocation conflict, human-judged (Slice 3's acceptance test): H3a
predicts discourse wins; H3b predicts local incompatibility blocks
or undecides. Whichever pattern the judgments follow is the one that
earns implementation as mechanism.

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
