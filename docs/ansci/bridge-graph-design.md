# The Modern-Science Bridge Graph — design note

Status: DESIGN NOTE (2026-11-15). Commissioned by the user as a
short note for judgment before anything is built. Nothing in
this note is implemented.

## 1. What it is

A **separate** graph whose nodes are the major terms of modern
science — electromagnetism, oxidation, photosynthesis, the
integral, insulin — each carrying bridge assertions that place
it in relation to the ancient ontology: its yin-yang polarity,
its Wuxing composition, its behaviour in the cycles.

It exists so that modern knowledge can be brought into relation
with the ancient system **without pretending the ancients said
it**. A bridge assertion is a modern interpretive claim, made by
us, about a modern thing. The ancient graph's entries are
evidence-qualified — attested, derived under a registered rule,
predicted with a price. Bridge assertions are none of those, and
they must never be stored where they could be mistaken for one
of them.

## 2. Seed and standard

The graph is seeded by the user's own bridge writings, kept in
`docs/user-ref/`:

- `ai-classica-science-bridge-graph.txt` — worked mappings:
  electromagnetism read through Taiji (mutual generation, the
  seed of the opposite, Lenz's law as opposition arising from
  action); exothermic/endothermic reactions; the periodic
  elements as Wuxing compositions with one phase predominant
  (oxygen predominantly Fire, nitrogen predominantly Water,
  carbon Earth); states of matter as element-states (liquid
  manifests Water, gas Fire, solid Metal — mercury at room
  temperature is a metal manifesting a Water state); paired
  biological systems (photosynthesis/respiration,
  anabolism/catabolism, excitatory/inhibitory neurons,
  insulin/glucagon); mathematics (odd/even, the integral and
  the derivative as a pair).
- `charofempirsci.txt` — "Balancing on the Edge of Destruction":
  the thesis that gives the bridge its point of view. Modern
  technology characteristically **inverts the controlling
  cycle**: Fire should melt Metal; instead Metal is made to
  contain Fire at Metal's breaking point (rockets, combustion
  engines, electrical wires), with Water conscripted to cool —
  a posture of maximisation at boundary conditions, against the
  system's moderation.

These two files are the standard any fill — human or machine —
is measured against. They are the user's research and are never
edited by the project.

## 3. Separation rules

1. The bridge lives in its own store. It **references** ancient
   concepts by identifier; it never writes into the ancient
   graph, and no ancient-side record cites a bridge assertion
   as evidence.
2. Ancient-side reasoning (propagation over the cycles) does
   not traverse bridge edges silently. A query that wants the
   bridge view asks for it explicitly — the same discipline as
   REALIZES on the sentence layer: alignment edges exist to be
   crossed deliberately, not by accident.
3. Every surface that shows bridge material labels it as the
   bridge: modern terms, our interpretation.

## 4. Node model

A bridge node carries:

- `term` and `domain` (physics, chemistry, biology,
  mathematics, medicine, technology, …);
- `gloss` — the modern definition, stated neutrally, in modern
  science's own terms. The gloss makes no ancient claim; the
  bridge assertions do that, separately, so the two can be
  disagreed with independently;
- synonyms / alternate names, where they matter.

## 5. Bridge assertions — five shapes

The seed writings use five distinct shapes of claim. The schema
keeps them distinct; flattening them into "X is Fire" would
discard the reasoning that makes the seed worth graphing.

1. **Polarity.** A yin or yang assignment, normally one half of
   a named pair, stored with its pair link: excitatory (yang) /
   inhibitory (yin) neurons; addition (yang) / subtraction
   (yin); convergence (yin) / divergence (yang).
2. **Predominance composition.** A Wuxing composition with one
   phase predominant and lesser shares named: oxygen
   predominantly Fire; magnesium Fire-strong within an
   alkali-earth Metal/Earth composition. Shares are a ranked
   list (predominant, secondary, trace), not percentages —
   the seed argues predominance, not measure.
3. **State manifestation.** Aspect-keyed, under the same
   (concept, aspect) discipline as the ancient side: a
   substance *in a state* manifests an element — liquid →
   Water, gas → Fire, solid → Metal — without the substance
   itself changing its composition claim.
4. **Process sequence.** A process told as an ordered run of
   phases over its stages: stored potential (Water) → motion
   (Wood) → peak impact (Fire) → stabilisation (Earth) →
   return to dormancy (Metal).
5. **Cycle posture.** A technology or practice characterised
   by a cycle relation, including inversions: rocketry as
   Fire contained by Metal against the controlling direction,
   held at the breaking point; deforestation-for-mining as the
   Wood–Metal control relation inverted.

Every assertion, of any shape, carries:

- `ground` — the semblance it rests on, in words (what the
  thing does, how it behaves, what it resembles in the system's
  terms). **An assertion without a stated ground is not
  banked; it is returned to its author.**
- `provenance` — `user` (from the seed writings or the user's
  word), `llm-draft` (machine-proposed, unreviewed), or
  `reviewed` (a human has checked it against the standard).
- `confidence` — priced, as on the ancient side; an LLM draft
  starts low and rises only through review.
- `status` and date; every assertion is individually
  reversible. Competing assertions about the same term are
  preserved in conflict, never silently merged — as with
  competing predictions on the ancient side.

## 6. Filling it — later, by machine, under gate

The user intends the graph to be filled out later by a fast
hosted model (Muse Ember was named). The procedure follows the
classification runs' pattern:

1. **Term lists by domain**, drawn from standard references;
   the term list is reviewed before any assertion is drafted.
2. **Drafting from the seed as the standard** — the model works
   from the seed writings' examples and reasoning style, term
   by term, producing assertions in the five shapes, each with
   its ground stated.
3. **Sampled review before banking** — stratified samples per
   domain and shape; assertions in always-review categories
   (cycle-posture claims, compositions that would drive
   derivations) are reviewed whole, not sampled.
4. Drafts that fail review are recorded as failures with
   reasons — they are the calibration data for the next pass,
   as the blind-run disagreements were for the classification
   protocol.

## 7. Relation to the rest of the project

- The ancient ontology stays the centre (CSKG strategy,
  2026-11-15): the bridge is the project's own interpretive
  layer over modern science, a different job from CSKG's
  (conventional knowledge as comparison and baseline).
- The bridge gives the chat work a way to *meet* modern
  questions: a modern term arrives, the bridge places it, and
  the ancient system's correspondences become reachable from
  it — with the join always labelled as the bridge's reading,
  never as attested knowledge.

## 8. Open questions for the user

1. Compositions as ranked lists (this note's proposal) vs
   rough proportions, where the seed's language supports them.
2. Must a polarity assertion always name its pair, or may a
   term carry a polarity alone where no natural pair exists?
3. Review strictness for the first machine fill: sampled (this
   note's proposal) or whole-corpus, given the fill is meant to
   be large?
4. The graph's working name.
