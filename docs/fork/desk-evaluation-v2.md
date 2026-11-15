# Desk Evaluation — sentencesToWuxing-2 (the user's v2 extension)

Date: 2026-11-15. Evaluator: Kavi. Method: same discipline as the earlier
evaluations — claims fixed from the file's text first, then scored against
material the file did not design for where possible: the FrameNet signatures
and classification data from the depth-cycle evaluation, the built parser's
actual behaviour (parser transcript, holdout, slices A–C), and the depth
evaluation's own 8 sense probes re-run under the file's sense algorithm.
The file is the user's creative research layer (its v1 states the mapping is
not canonical); attested tradition, the file's proposals, and this analysis
are kept in distinct layers throughout.

The file extends the mapping to the three depth areas: §1 valency and
thematic roles, §2 morphology and aspect, §3 sense choice. A cycle audit of
its edges was given when the file arrived and is summarised in Part 4; the
section scores below judge the *claims*, the audit judges the *labels*.

---

## Part 1 — Valency and thematic roles (§1 of the file)

### 1.1 Valency declarations — ✓

*give* = 3 (agent, recipient, theme), *sleep* = 1. Checked against FrameNet:
Giving's core signature is [Donor, Recipient, Theme] — the file's declaration
matches the attested inventory exactly. (FrameNet names the giver Donor; the
file's Agent is the same slot.) The depth evaluation's claim 3 already
established that these signatures are what derived verbs lack; the file's
framing (valency = the number of Earth slots a Wood verb sprouts) is a
restatement, not a rival.

### 1.2 Role sub-types — 3 ✓ · 1 ◐ of 4

- **Agent = Central Earth, Patient = Grounded Earth** ✓ as positional
  description: agents are the unmarked subject, patients the unmarked object,
  across every signature the depth evaluation printed.
- **Experiencer = Central Earth but Fire-adjacent** ✓, and this is the
  sub-typing's one genuinely distinguishing prediction. Experiencers do sit in
  the central (subject) position in the perception and emotion frames
  (Perceiver, Experiencer are subject-side in the FrameNet data) — but the
  experiencer is also the one role whose position is famously unstable:
  psych-verb pairs (*I fear it* / *It frightens me*) flip experiencer between
  subject and object while agent/patient never flip this way. "Fire-adjacent"
  names exactly that instability — the role where the verb's heat is felt is
  the role that won't stay grounded. A label that predicts which role
  alternates is doing work.
- **Goal/Recipient = Peripheral Earth** ◐. Positionally true (last,
  dative-marked, the "far ground") but valency-false for the file's own
  example: the recipient of *give* is a core, obligatory slot (slot 2 of the
  file's own 3). "Peripheral" must mean positional, not optional — the file
  doesn't say which, and the difference matters to a checker: an omitted
  recipient is a valency violation, an omitted instrument is not.

### 1.3 Instrument = Metal-adjacent Earth — ✓ (the file's best §1 claim)

"Not a true Earth node — a tool, a mould applied to the action." This fixes
the *shape* of the depth evaluation's failed claim 1. That evaluation asked
the filler's element to predict the role and failed (tools unclassified,
*sadness* mispredicted). The file types the **slot** instead: a filler sits
in the *with*-slot as Metal-adjacent by construction, whatever the filler is.
Checked against the claim-1 cases: *with a knife / corkscrew / hammer / pen /
chopsticks* → instrument by slot-typing, no filler classification needed —
the coverage starvation that sank claim 1 dissolves for instruments. The
sub-type also predicts the instrument's known mobility: instruments can
surface in the central position when the agent is suppressed ("The key
opened the door") — a Metal-adjacent node moving central under exactly the
file's Water-suppression condition (§1.4) is internally coherent in a way a
plain Earth typing would not be.

What it does not solve: *with* also introduces manner ("with sadness") and
accompaniment ("with a friend"), and the file gives no rule for which
*with*-construction is present. The discrimination problem is not removed; it
is relocated to construction choice — which, in the file's own terms, is a
Metal question (which joint is this?). Better located, still open. ◐ on the
*with* family as a whole, ✓ on the instrument itself.

### 1.4 Water → Wood: argument suppression — ◐ (one ✓, one ✓, one ✗)

- **Agentless passive** ✓, and it names a real gap in the built parser. Our
  passive keeps meaning-graph edges identical to the active — correct when
  the by-agent is expressed ("bitten by the dog"), but "The book was given"
  currently records no agent slot at all, suppressed or otherwise. The file's
  suppressed-slot is the right representation: the slot exists in the verb's
  valency, is marked suppressed, and generation knows not to demand it.
- **Impersonals** ✓-ish ("It is said that…"): a slot-shaped absence, fairly
  described as suppression.
- **Weather** ✗ as stated. "It is raining — the Agent slot is negated out of
  existence": *rain* has valency zero (FrameNet Precipitation: no agent,
  ever). There is no slot to suppress; the dummy *it* is connective
  scaffolding, which is how the parser already (and correctly) treats it.
  Suppression presupposes a slot; the file overextends it to verbs that
  never had one.
- Edge label: Water→Wood is the generating closure, not an overcoming edge
  (Part 4).

### 1.5 Fire → Earth: role shift under mood — ◐

"If he were the agent…" — roles "held in potential, not actualized." The
built parser's conditional handling assigns roles normally inside the
condition clause and marks *mood* as a clause-level state; nothing about the
roles themselves changes, and the depth material offers no case where mood
reassigns a role (as opposed to suspending the whole clause's actuality).
The file's claim redescribes clause-level mood at role level; no
distinguishing prediction was found. It is also a generating edge labelled
as overcoming (Part 4).

### 1.6 Metal → Wood: valency blocking — ✓ (family), as redescription

True controlling edge, correctly labelled. The built checker already
implements this family (agreement, negation-carrier-tense — the K6
mechanism). The file's specific version — missing case marking cutting a
valency slot in rich-case languages — is standard case-government grammar
redescribed in cycle terms: true, but it predicts nothing the standard
account doesn't.

**§1 tally: 4 ✓ · 3 ◐ · 0 ✗** (with the weather sub-case of §1.4 a clear ✗
inside a ◐ claim).

---

## Part 2 — Morphology and aspect (§2 of the file)

### 2.1 Aspect as Wood growth patterns — ✓ as a specification, one ◐

Each pattern checked against what the built generator must carry:

- **Perfective = growth completed** ✓ — carried today via past/perfect.
- **Progressive = growth ongoing** ✓ as a name for a live loss: the parser
  canonicalises "Winter is coming" to "Winter comes" — the ongoing pattern
  is exactly what generation drops. The file's inventory specifies the fix.
- **Habitual = growth cyclical** — names a state the parser does not model
  at all (no habitual in the aspect states). A gap, now with a name in the
  scheme's own vocabulary.
- **Inchoative = growth initiated** — likewise unmodelled ("begin to", and
  on the Chinese side the inchoative uses of 起来 (qǐlái, "rise")). Gap named.
- **Resultative = growth frozen** ◐ — a productive tension, resolvable. The
  built parser puts the result *state* on a Fire node (the resultative
  construction rides the generating Wood→Fire arc: "gone brown"). The file
  puts resultative in Wood's pattern inventory. Both can hold at once: the
  *pattern* (the event froze into a state) is a property of the verb; the
  *state itself* (brown) is the Fire node. Pattern on the verb, state on the
  result — the two-address discipline the sentence layer already uses.

### 2.2 The morphological pipeline — ◐ (one ordering error)

Lemma → aspect selection → agreement → affixation → phonological
conditioning → suppletion → surface form.

Agreement before affixation before phonological conditioning is the standard
morphophonological order and matches the evidence (the *-ed* allomorphs are
chosen after the affix exists, by the sound it lands next to). **Suppletion's
placement is wrong, demonstrably:** *went* bears no affix at all — if
affixation and phonological conditioning have already applied to *go*, there
is nothing left for suppletion to replace, and *gone* is not *went* plus an
ending but a third listed form (cf. *be*: am/is/are/was/were/been — whole
forms selected per cell). Suppletion competes at the lemma→form step, before
agreement affixation, not after conditioning. Corrected pipeline: lemma →
aspect selection → **form selection (regular mould or banked suppletive
form)** → agreement → affixation → phonological conditioning → surface.
Also unstated in the file: the pipeline runs in the generation direction;
parsing runs it backwards (surface → strip affix → recover the aspect
pattern), which is where the parser actually meets it.

### 2.3 Suppletion as Water overriding Metal — ✓ as design, axiom not theorem

The edge (Water→Metal) is in neither cycle (Part 4). As a *design* the claim
earns its place: suppletion concentrates in the highest-frequency verbs
(*be, go, have, say, do*) — the forms worn smooth by deepest usage are the
ones that break the mould, which is what "the deep flow overrides the surface
mould" redescribes. Architecturally it tells the build where irregular forms
live: they are banked data (the irregular table the depth analysis already
called for, derivable from the raw WordNet zip), selected by usage depth
over the regular rule. That is a specification the *blowed* defect needs.

### 2.4 Allomorphy as Fire → Metal — ◐ (edge ✓, attribution loose)

Fire→Metal is true controlling, correctly labelled, and the phenomenon is
real (*-t / -d / -ed* chosen by the preceding sound). But the conditioning
factor is the stem-final phoneme — a property of the form itself, internal
to Metal's own operation. Calling the adjacent sound "Fire" is decorative:
nothing about heat, light, or adjectives does work in the conditioning.
Phenomenon ✓, edge ✓, elemental attribution ◐.

### 2.5 Fire → Wood: mood coerces aspect — ✗ as stated

The edge is in neither cycle. The example, "I would have been going," is
compositional stacking — modal + perfect + progressive, each layer regular
and independently omissible ("I would go", "I would have gone", "I would be
going"). No coercion of the progressive by the subjunctive is needed to
explain the form; the layers compose. As a claim about English it fails; as
a claim about some other language's mood-aspect interaction it is unevidenced
here.

### 2.6 Metal → Fire: agreement blocks mood — ◐

The edge reverses the controlling direction (the cycle has Fire→Metal).
The phenomenon — defective paradigms, moods unavailable in certain persons
(the file's Greek optative example; cf. English modals lacking forms,
*\*musted*) — is real. It is a redescription of defectiveness, with the edge
direction an addition to the system rather than a cycle instance.

**§2 tally: 1 ✓ · 4 ◐ · 1 ✗.**

---

## Part 3 — Sense choice (§3 of the file): the head-to-head

The file's algorithm: collect signals in four layers — Water (discourse,
topic, register), Fire (adjacent adjectives), Earth (collocates), Metal
(syntactic frame) — plus Wood (the verb's valency/argument types); agreement
decides; conflict resolves by priority **Water > Fire > Metal > Wood**, with
one exception (Metal outranks Water when the syntactic frame is obligatory).
Two design claims ride on it: sense is a **state on the node**, not a node;
and balanced pressures = **genuine ambiguity** (equilibrium), not a forced
pick.

Test set: the depth evaluation's 8 coherence probes (which the file's author
had not seen scored in this form) + the file's own 6 bank cases. The rival:
coherence scoring as evaluated (generating adjacency + restraint, variant A).

### 3.1 The depth evaluation's 8 probes under the file's algorithm

| Probe | Deciding layer | File's algorithm | Coherence (for comparison) |
|---|---|---|---|
| cold–temperature ("cold wind… winter snow") | Earth (wind/winter/snow) | ✓ temperature | ✓ (2 vs 1) |
| cold–illness ("in bed with a cold, coughing… fever") | Earth (bed/cough/fever) | ✓ illness | ✗ (−0.5 both variants) |
| spring–season ("spring flowers bloom… warm") | Earth (flowers/bloom) | ✓ season | ✓ (1 vs 0.5) |
| spring–source ("drank from the spring… water") | Earth (water/drank/stones) | ✓ source | ✗ (season sense won) |
| crane–bird ("marsh… wings") | Earth (marsh/wings) | ✓ bird | ✗ (0–0 tie, coverage silence) |
| crane–machine ("lifted steel beams… iron") | Earth (steel/iron/beams) | ✓ machine | ✗ (0–0 tie) |
| fall–season ("leaves turn… harvest… cool") | Earth (leaves/harvest) | ✓ season | ✓ (1 vs 0.5) |
| fall–waterfall ("drops from the rocks… pool") | Earth (rocks/pool) | ✓ waterfall | ✗ (0–0 tie) |

**8 ✓ · 0 ◐ · 0 ✗ — the file's algorithm sweeps the set that coherence
scoring went 2 ✓ · 2 ◐ · 4 ✗ on.** Two honest qualifications, both material:

1. **Every one of the 8 was decided by the Earth layer — collocation.** The
   file's Earth signals are co-occurring *words*, which need no elemental
   classification at all; that is why the coverage silence that tied
   coherence (marsh, wings, steel unclassified) does not touch it.
   Collocation is the oldest and strongest cue in word-sense disambiguation.
   The algorithm wins — but it wins on the layer that is conventional WSD
   wearing Earth clothing. The distinctively elemental machinery (Water
   discourse priority, Fire illumination) decided none of these 8, because
   single-sentence probes carry no discourse layer.
2. **Earth is missing from the file's own priority order.** The resolution
   hierarchy as written is Water > Fire > Metal > Wood — Earth, the layer
   that did all the work above, has no rank. Read strictly, the algorithm
   has no decider for any of these 8 probes (no Water, Fire, Metal, or Wood
   signal speaks in most of them). The sweep above scores the algorithm as
   intended, with Earth grounding as the default the ranked layers can
   overturn — which is a repair the file needs, not a reading it states.
   Proposed repair, in the file's own idiom: Earth is the ground the other
   pressures act on — collocation sets the base reading; Fire, Metal, Wood
   signals can overturn it; Water overturns all. That ordering (Earth as
   base, not as a rank) also matches §3's own table, where Earth "grounds
   the sense in the local structure."

### 3.2 The file's own bank cases

| Case | Verdict |
|---|---|
| B1 "bank after deposit → financial" (Wood constrains) | ✓ — the verb's argument expectations decide, unopposed by any higher layer |
| B2 "muddy bank → river" (Fire illuminates) | ✓ — adjective decides, unopposed |
| B3 "bank of the river" / "bank account" (Earth grounds) | ✓ — collocation, both directions |
| B4 "at the bank (location) vs with the bank (institution)" (Metal cuts) | ◐ — the frame distinguishes a place-reading from an institution-reading, but both are readings of the *same* financial sense (the building where the institution sits); Metal is not cutting river-vs-financial here, and B1's "at the bank" shows the location frame coexisting with the financial sense. The cut is real but finer than a sense boundary |
| B5 "the muddy bank of the Federal Reserve" (Water overrides Fire) | ◐ — the algorithm decides financial by stipulation (Water > Fire). Human judgment on the phrase is genuinely split — a muddy bank belonging to the Federal Reserve reads to many as metaphor or as the riverbank by the Fed's building. The file's own equilibrium insight counsels "undecided" when pressures balance; the priority axiom forecloses that here. The one case where the file's distinctive machinery fires is a case its own insight says may be undecidable |
| B6 "She banked the plane / a check" (Metal → Wood) | ◐ — outcome ✓ (the senses are correctly forced), attribution off: the frame is identical in both (transitive verb + object); the discriminating signal is the *object's identity* (plane vs check) — Earth collocation again, not the Metal joint |

**Bank tally: 3 ✓ · 3 ◐ · 0 ✗.** Combined sense score: **11 ✓ · 5 ◐ · 0 ✗ of
16**, against coherence's 2 · 2 · 4 on its subset.

### 3.3 The two design claims

- **Sense as a state on the node** ✓ — and it fits the built schema without
  renovation: meaning nodes already carry states (voice, mood, aspect). A
  sense state, set by layered pressure and revisable by discourse, is a
  smaller and truer claim than the current aspect-keyed table lookup, and it
  is how the (concept, aspect) discipline would actually be *chosen* at parse
  time rather than merely recorded.
- **Equilibrium = genuine ambiguity** ✓ — the file's most valuable §3 idea.
  Both rival mechanisms force a pick (coherence picks the higher score; the
  table picks the keyed aspect). A pressure model can decline to decide,
  which matches the fork's existing discipline (the confidence gate already
  refuses faint derivations; the turn loop already declines in shape). An
  undecided sense state is the same honesty one level down.
- **The priority order as a cycle consequence** ✗. Nothing in the generating
  or controlling cycles entails that discourse outranks syntax, or that
  locality loses to depth. The order is an **added axiom** — plausible (it
  matches WSD practice, where topic/register are strong priors), testable,
  and the file's real §3 contribution — but it should be carried as an axiom
  under test, not as a theorem of the cycles. Its only exercise so far is B5,
  its own constructed case, where the verdict is ◐.

**§3 tally: probes 11 ✓ · 5 ◐ · 0 ✗; design claims 2 ✓ · 1 ✗ (priority as
derived rather than stipulated).**

---

## Part 4 — Cycle audit summary (from the reading on arrival)

True controlling edges, correctly labelled: Metal→Wood (valency blocking;
syntax constrains verbal sense), Fire→Metal (allomorphy; metaphor),
Water→Fire (discourse overrides local illumination). Generating edges
mislabelled as overcoming — v1's pattern: Water→Wood (suppression),
Fire→Earth (role shift). Edges in neither cycle — additions to the system,
whatever their merits as mechanisms: Wood→Metal (aspect→affix),
Water→Metal (suppletion), Fire→Wood (mood coerces aspect), Metal→Fire
(agreement blocks mood). The built sentence layer's cycle tables
(`GENERATES`/`CONTROLS` in sentence.ts) should stay exactly the two true
cycles; the additions belong in the design layer as named hypotheses until
independently evidenced.

## Part 5 — Bottom line

**Score across the file: §1 — 4 ✓ · 3 ◐ · 0 ✗; §2 — 1 ✓ · 4 ◐ · 1 ✗;
§3 — 11 ✓ · 5 ◐ · 0 ✗ on probes, design claims 2 ✓ · 1 ✗.**

v2 is stronger than v1 where it counts most. Its sense algorithm beats the
coherence mechanism from the depth evaluation on that evaluation's own
probes — with the standing caveat that the wins concentrate in its Earth
(collocation) layer, and its most original machinery, the depth-priority
order, has so far fired only on its own constructed example. Its role
sub-typing repairs the shape of the failed role-by-element claim by typing
slots instead of fillers. Its aspect inventory names, in the scheme's own
vocabulary, the exact states the generator currently loses (progressive) or
never had (habitual, inchoative). Its weaknesses are consistent and the same
in kind as v1's: edge labels overclaim cycle membership (two mislabelled,
four invented), one pipeline ordering error (suppletion), and a tendency to
redescribe known grammar (case government, defectiveness, collocation) in
cycle vocabulary — redescription that earns its keep only where it also
predicts or specifies, as it does for the experiencer's instability, the
instrument's mobility, and the suppressed agent slot.

### What this changes for the build (recommendations, not yet built)

1. **Sense:** adopt the layered algorithm as the disambiguation design, with
   Earth ranked as the base reading the other layers overturn, equilibrium
   mapping to an undecided state, and coherence scoring demoted to a
   component inside the Earth layer (elemental agreement among *classified*
   collocates, where it adds signal collocation alone lacks). The priority
   order enters as a named axiom under test.
2. **Valency:** adopt the role sub-types as slot metadata — instrument slots
   typed Metal-adjacent by construction; add the suppressed-slot state for
   agentless passives (a real parser gap the file found).
3. **Morphology:** adopt the five aspect patterns as the aspect-state
   inventory (progressive first — it is a live generation loss); adopt the
   pipeline with suppletion moved to form selection; the irregular table is
   the banked form inventory the pipeline selects from.
4. **Not adopted as mechanisms:** the four non-cycle edges and the
   mood-coerces-aspect claim — carried as named hypotheses in the design
   layer only.

Open, as before: the priority axiom needs a discourse-bearing test set (real
paragraphs, not single sentences) before it is more than stipulated; the
*with*-construction discrimination (instrument / manner / accompaniment) is
relocated but unsolved; nothing in v2 touches the materials/artefacts
classification gap, which remains the parser's largest content debt.
