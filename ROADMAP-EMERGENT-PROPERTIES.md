# ROADMAP — Emergent Properties

Status: design roadmap, recorded 2026-11-19. Nothing in this document is built.
Phase 1 is the work in progress; Phase 2 is a later change of regime, not a
current programme.

## Near-term viability roadmap — 2026-11-21

The immediate goal is a dependable chatbot within a measured range of use,
not open-domain fluency or emergence. We do not yet know what percentage of
ordinary sentences or chat turns it handles correctly: the existing cases
target specific grammar patterns and are not a random sample.

| Gap | What the evidence says |
|---|---|
| Some capabilities are built but the normal chat path does not call them. | The system-map audit lists modules without a processTurn consumer. This is an integration gap, not proof that sentence parsing fails. |
| Some tested sentence patterns lose important structure. | The 21-case sealed parser set passes graph checks at F1 5/5, F2 3/4, F3 1/4, F4 0/4, F5 1/4. The F2 coat sentence still chooses the wrong root. These targeted cases do not estimate everyday accuracy. |
| Overall chat reliability is unknown. | There is no representative end-to-end evaluation showing how often ordinary dialogue survives parsing, meaning construction, and reply generation without losing or inventing meaning. |
| Some planned reasoning and ontology effects are not implemented or connected. | The system-map audit locates unbuilt Awareness composition and no traceable Hexagram effect. These gaps limit those capabilities; they do not mean the parser cannot handle most sentences. |

**Next decision:** author a small, independent sample of ordinary chat turns and
measure how often the live chat path preserves their meaning through to its
reply. Use the traces to decide whether the first fix should connect an existing
module or improve parsing. Keep this sample separate from development controls
and the sealed parser set.

## The phasing claim

Emergent behaviour is not programmed first. The order is:

```
Phase 1:  a system that can do a thing —
          a repertoire of competent local doings, in a working pipeline
Phase 2:  a dynamics over that repertoire —
          properties added so the composition of those doings is no
          longer enumerated in advance
```

Without Phase 1 there is nothing for emergence to be made *from*. A system
whose units cannot yet greet, answer, decline in a located way, ask a
question from a gap, give advice, or acknowledge would, under any dynamics,
only recombine its failures. In Holland's terms: adaptive systems recombine
building blocks that already work.

For AnSci, Phase 1 is the move pipeline: move selection by cycle relation,
reply-graph assembly as a graph-to-graph transform, assertion strength from
derivation support, questions generated only from graph gaps (an unfilled
valency role, or a classification split between rival derivations). That
pipeline has to work end to end, in a plain fixed order, before loosening
the order means anything.

## The Phase 1 condition that protects Phase 2

Phase 2 is cheap or expensive depending on one Phase 1 decision:

| Phase 1 built as | Phase 2 cost |
|---|---|
| A hard-coded sequence, each unit assuming the previous one finished fully and will never be revisited | Rewrite — the sequence is baked into every unit |
| Units as need-dischargers over the information ball, with control kept outside the units | Replace the controller only — the units do not change |

AnSci is already on the second line, by the information-object ruling of
2026-11-17:

- The ball is an **envelope + core**.
- The **core** is the semantic object: purely descriptive, unchanged as it
  travels; nothing imperative is ever written into it.
- The **envelope** carries instructions (the turn's speech-act shape,
  provenance, confidence, route so far) and **needs** — named open slots,
  each with what would discharge it.
- Units specialise by which needs they can discharge, and amend the
  envelope only.
- A need surviving the whole route *is* the located decline; the Planner
  prices surviving needs directly.

Phase 1 acceptance therefore has a second criterion beside "does the
pipeline produce good replies": **every unit must behave as if it did not
know where in the order it sits.** If a unit secretly depends on being
third in the sequence, Phase 2 will find it.

Concretely, in Phase 1:

- The controller / scheduler is a separate, deliberately dumb, fixed-order
  component — explicitly a placeholder, not a design commitment.
- The route is logged on every envelope (route-so-far already exists).
- Units discharge needs and amend envelopes; they do not call the next
  unit, and they do not assume a successor.

## Phase 2: the ball's traversal as the emergence locus

The potential for emergent behaviour in AnSci sits not in the core, which
should stay stable and auditable, but in **how the ball traverses the
system** — if that traversal is not predictable as a pipeline.

A pipeline is predictable in a specific sense:

```
route = f(turn type)
```

The same kind of turn always visits the same units in the same order,
whatever happened on the way.

A traversal stops being a pipeline when the next step is a function of
what the ball has *become* on the way:

```
next unit  ≠  next in list
next unit  =  f( open needs now,
                 needs added / split by the last discharge,
                 rival derivations still live,
                 prices after disposition modulation,
                 route so far on the envelope )
```

Five mechanisms do that work, all available inside the present design:

### 1. Opportunistic claiming

The classical solved problem for this is the **blackboard architecture**
(HEARSAY-II onward) — already the precedent named for the envelope
(FIPA ACL / KQML performative + content; blackboard activation records).
No fixed sequence: units watch the ball, claim a need they can discharge
at a price, and control emerges from the state of the ball. Phase 2 does
not need a new invention; it needs that control regime ported in place of
the fixed route.

### 2. Need generation mid-route

A unit discharging one need raises another it cannot discharge: a sense
settled but a classification split, an emotion reach raising a cause hole,
the Social Unit adding a situate-* need. A primitive version already
exists: in the Hello probe's third situation the situate-owed need
survived the route, was priced by Coherence, and carried onto the reply
object. In Phase 2 such a need would instead *re-route* the ball before a
reply is authored.

### 3. Revisiting / loops

Coherence or SemanticAssessment sends the ball *back* — not as an error,
as a normal move — because a later classification repriced an earlier
sense. A system where revisiting is routine, and how often it happens
depends on the ball, has attractors: some balls settle in one pass, some
oscillate and settle only after pricing damps them.

### 4. Rival claims, arbitrated by price

Two units can discharge the same need differently. If the winner is
decided at run time by support (with the weakest-link ceiling on strength),
coherence, and disposition bias — disposition being a Five-Element
combination that modulates processes generally and never supplies content —
and not by precedence in code, then a small difference in the opening ball
flips the winner, flips the route, and flips the reply composition.

This is the target kind of unpredictability: **deterministic but
sensitive.** Same ball, same route every time; a slightly different ball,
a legitimately different route — with the envelope log showing why at each
step. Random routing is also unpredictable and produces nothing; it is
not the target.

### 5. Settling as the stop condition

A pipeline stops at the end of the list. A ball system stops when no claim
is priced above threshold. Route length becomes an outcome, not a
constant, and needs still open at settling are the decline / clarification,
by definition.

## Phase 2 in one change of regime

```
Phase 2 controller:
  loop {
    units advertise claims on open needs
    → price claims (support × coherence × disposition)
    → discharge the highest claim
    → amend the envelope (needs discharged, added, split; route extended)
    → repeat until settling
  }
```

No unit signatures change. No core changes. The fixed scheduler of
Phase 1 is replaced, nothing else.

**Test:** run the same probe set under both controllers. The evidence for
emergence is route variance explained by envelope state, not by turn
type — and replies *composed* from parts in an order nobody enumerated,
rather than *selected* from a list.

## What emergent behaviour would realistically look like here

Weak, testable novelties only — not strong emergence, not consciousness:

- A clarification question whose target was not anticipated: it falls out
  of a sense tie, an emotion-desire reach, and a social demand coinciding
  on the same semantic object, none of which alone would have asked it.
- A reply move that is a combination — a decline located at sense level,
  delivered with an acknowledgement raised by the Social Unit and priced
  down by disposition — assembled in the reply graph, not selected as a
  template.
- Cross-domain transfer through the correspondence graph that was never
  banked as a pair: objects linked only after a multi-step walk through
  different axes change a sense selection in a later turn, and stay
  changed (hysteresis).
- Discourse repair across turns: the trailed semantic object and the
  Interlocutor picture constrain sense weights downward, so a later turn
  disambiguates an earlier one differently than it would have in
  isolation.

The test the literature imposes: could that exact behaviour have been
predicted by reading the graph and the code, without running the
conversation? If yes, it is not emergent in Bedau's sense, however clever
it is.

## Conditions checklist — necessary, not sufficient

- [ ] Turn loop becomes iterative settling, not a pipeline: Planner,
      Coherence, EDU, SenseUnit and Social Unit iterate on the same
      ball / reply object until it stabilises or a priced decline is
      reached
- [ ] Wuxing becomes state dynamics: a vector updated each turn by input
      and by its own sheng / ke propagation, decaying over turns,
      modulating thresholds — not a static disposition label
- [ ] At least two units can veto / re-price each other's proposals in
      the same turn, with arbitration by support / pricing, not by fixed
      precedence
- [ ] Macro state (Session semantic object, Interlocutor, Conversation
      stance) measurably changes micro selection — with a logged case of
      a sense / move that flipped because of it
- [ ] Live perturbation continues: new testimony / interlocutor correction
      enters with provenance and changes later behaviour in the same
      session
- [ ] An emergence probe set: conversations run to see what forms,
      recorded, and compared against what inspection predicted — the gap
      is the evidence

Known counter-pressure, recorded plainly: AnSci's invariant core —
testimony only from the nets, located declines, strength capped by the
weakest classification on the path, disposition never supplying content —
pushes the system toward the ordered side. Those invariants are not up
for removal in Phase 2. They are why a countervailing source of
perturbation (interlocutor input changing the semantic object, competing
reaches, social demands the Planner did not already have) is a
requirement, not an ornament.

---

## Appendix: conclusions from the complex-systems / emergence literature

What the research has actually concluded, in the form that bears on this
system. No result in this literature says that adding complexity produces
emergence, or that a desired emergent behaviour can be specified in
advance and still be emergent. You specify the conditions, the
invariants, and the probe — then you record what actually forms.

1. **Weak emergence is the workable kind.** A macro pattern is emergent
   if it can be derived from the micro rules only by running them, not by
   inspection or shortcut deduction. Strong emergence — macro laws in
   principle irreducible to the micro level — remains contested and
   unproven in engineered systems. (Bedau 1997; Chalmers 2006)

2. **More is different.** At each level of organisation new regularities
   appear that are not in the vocabulary of the level below; a higher
   level is not just a summary of the lower one. Discourse behaviour is
   therefore not to be expected from token / sense rules alone.
   (Anderson 1972)

3. **Local interaction, no central controller.** Global order in complex
   adaptive systems comes from many agents following local rules and
   interacting repeatedly. A central controller that authors the outcome
   produces designed behaviour, not emergent behaviour.
   (Holland 1995; Reynolds; Wolfram)

4. **Non-linear feedback is necessary.** Linear, feed-forward chains
   produce sums of their parts. Loops — output feeding back to change
   thresholds, weights and next selections — are what produce attractors,
   hysteresis and path-dependence. (Kauffman 1993; Prigogine)

5. **Behaviour clusters at the edge of chaos.** Too ordered: frozen,
   repetitive, template-like. Too disordered: incoherent. Novel behaviour
   appears near a transition, and the system needs a tunable parameter
   that can move it toward and away from that transition.
   (Langton 1990; Kauffman's NK models; Bak, self-organised criticality)

6. **Diversity and degeneracy help.** Structurally different mechanisms
   that can do overlapping jobs — degeneracy, not mere redundancy — make
   novel combinations possible and robust. A monoculture representation
   is brittle. (Edelman; Tononi)

7. **Downward causation works by constraint.** Once a macro pattern
   forms — a stance, a situation, a conversation history — it constrains
   micro choices below it. It does not supply content; it prunes and
   biases selection. (Juarrero; Ellis)

8. **Self-organisation needs an open, historical, perturbed system.**
   Order in dissipative systems requires throughput and perturbation from
   outside, and the present state depends on the path taken. A closed,
   fully banked system settles onto its templates. (Prigogine; Haken)

Summary in one line: emergence, where it occurs, is a property of a
*running interaction topology* — many competent local units, non-linear
feedback, a tunable operating point, downward constraint from macro
state, and continuing perturbation — and it is recognised after the fact
by the gap between what running the system produces and what inspecting
it predicted.
