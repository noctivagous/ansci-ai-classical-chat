# T-R2 — fresh transcript scenarios for slice R2 (FROZEN)

Authored 2026-11-16, BEFORE the composition transform
(`planComposition` in `src/fork/plan.ts`) was written, per
§10's rule: a slice's transcript scenarios are authored before
the slice's code first runs against them and are frozen once
written. Failures against these expectations are findings, to
be recorded in `T-R2-results.md` — this file is not edited to
fit the build's behaviour.

R2 is §7.1 built both ways and §8.7's S13: several priced
conclusions compose into ONE reply — ordered by support
(the default) or by relation to the newest state, both
orderings computed and recorded in the trace — and a set of
predications over a shared derivation presents its members
under the one subject. Expectations are stated as MECHANISM
expectations — which conclusions, at what levels, in which
order under each ordering, what the trace must name — never
as expected verbatim strings, because the wording of a
planned reply is the generator's, not the test's. The
standing disciplines apply to every turn: the trace names
each member's derivation, support and pricing record and the
reply graph (§6); no reply names the ontology on the surface
(the leak scan); a decline cites its ground.

Two orderings, as data (stated here so the expectations below
are checkable against the rules, not against the build):

- **Support order**: conclusions by support, descending.
  Ties keep the enumeration order the caller supplied (the
  set is enumerated asked-quality first at the question site;
  the join's own conclusion order at the composition site).
- **Relation order**: conclusions by their relation to the
  newest state in the session record — a state from an
  earlier turn; the current turn's own parse state is the
  question's content, not a state the reply responds to.
  Precedence is the sense layer's support weights (§2.1's
  arbitration pattern, sense.ts): same element 1.0, a
  generating relation in either direction 0.8, a controlling
  relation in either direction 0.4, unrelated 0. Within a
  relation kind, ties fall to support descending, then to
  enumeration order. With no earlier state in the record,
  every member is unrelated and relation order falls back
  through support to enumeration order.
- The **active** order — the one the reply speaks — is the
  default: support order, held in one named data constant
  (`DEFAULT_ORDER`). Switching the default is that one data
  change; the trace records both orderings either way (§7.1).

A conclusion priced below the floor (§9.2) is DROPPED from
the composition, with the drop recorded — it does not drag
the other members down, and it is not silently omitted. If
every member is below the floor, the composition is the
decline, its ground naming each member's shortfall (§6).

## Scenario R2-1 — set presentation at the question site (turn-level)

The turn loop's one speaking site for derivations is the
predicate-question site, and a season subject is where it
holds several conclusions at once: the season's degree
profile (seed §6.11) carries two aspects — temperature and
light — and each aspect's majority-side quality is derived
by its own shared-prior path (subject —ELEMENT_OF→ element
—POLARITY_OF→ polarity —HAS_QUALITY→ quality), at the degree
the profile's share grades to (bands: ≥0.65 strongest,
≥0.35 strong, below faint). That set — one subject, one
classification, one shared derivation family, several
derived qualities — is S13's shape, and it is the set this
scenario pins. The set is enumerated asked-quality first,
then the remaining aspect in profile order (temperature,
then light).

Turns (one session):
1. "Is winter cold?"
2. "Is summer hot?"
3. "Is autumn dark?"
4. "Why is winter cold?"

Expectations:
- Turn 1: the set is {cold, dark}. Cold: temperature aspect,
  the profile's temperature share is 0.85 toward the cold
  side — degree strongest. Dark: light aspect, share 0.82 —
  degree strongest. Both paths are the seed's atomic legs
  under winter's attested classification: support 1, weakest
  tier attested, level plain, each. Support order [cold,
  dark] (a tie, kept in enumeration order). No state from an
  earlier turn stands in the record, so relation order
  falls back to the same [cold, dark] — the two orders
  coincide here, and the trace records both, plus the
  composition record (active order, per-member pricing,
  per-member derivation path). The reply is ONE generated
  reply graph: one shared subject node, two predications,
  joined by a 'links' edge whose marker is "and"; the second
  predication's subject surfaces as "it" (the connective
  layer's ordinary anaphora, as in R1.5's causal form). The
  wording is generated (wording-not-derived false).
- Turn 2: the set is {hot, bright} — hot the asked quality
  (temperature, the hot side's share 0.85, degree strongest;
  the predicated lemma is the person's own, "hot"), bright
  the light aspect's quality (share 0.82, degree strongest).
  Both plain, support 1; orders [hot, bright] as in turn 1.
  This turn is also the scripted winter-cold scenario's
  second turn: its origin changes under R2 from a single
  predication to a set presentation. That change is
  authorised by these frozen expectations and must be
  itemised in the results, with the pin updates it forces.
- Turn 3: the asked quality is the LIGHT aspect's. The set
  is enumerated asked-first: {dark, cold} — dark (light,
  share 0.58 toward the dark side, degree strong), cold
  (temperature, share 0.55, degree strong). Both plain.
  Support order [dark, cold]: on a tie the asked quality
  leads. The reply presents dark first.
- Turn 4: a why-question demands the causal form (§7.2
  policy (a)). That form is the single-conclusion
  transform's (R1/R1.5): composition does NOT apply, no
  composition record is taken, and the reply is the causal
  reply R1.5 established, unchanged. Scoping, stated before
  the build: composing causal subordinates for a whole set
  is not part of R2.

## Scenario R2-2 — the two orders disagree, over the join's real conclusions (composition-level)

Why this scenario is composition-level, recorded before the
build: at the turn loop's speaking site a set's members all
stand on the subject's single classification — one element,
and one support per path family — so the two orders provably
coincide there (R2-1's traces show both, equal). A genuine
disagreement needs conclusions over one subject that stand
on DIFFERENT elements at DIFFERENT supports. The join's
`derive()` output is exactly that: a subject's own-element
correspondence row at the classification's confidence, and
its cycle neighbours' rows at that confidence decayed by
the cycle step. This scenario therefore exercises the
composition transform directly over `derive()`'s real
conclusions for one subject, in a session whose newest state
is established by a real turn. What it pins is the ordering,
the pricing and the drop rule of the composition over real
priced conclusions. What it does NOT claim: that the turn
loop speaks correspondence conclusions as quality
predications today — it does not, and several correspondence
labels are not adjectives of the sentence lexicon at all.
The composition transform's contract is subject + quality
lemma + price; the join's conclusion labels are its test
material here, and the gap between that material and a
speaking site is recorded, not papered over.

Setup: a session; the turn "I was furious." establishes the
newest state (furious — Wood by its attested classification).
The composition is then invoked over the subject salt, its
members harvested from `derive(graph, "salt")`, enumerated
in the join's own conclusion order, filtered to the color
and taste rows of the correspondence and generating
neighbour sets:

- black — correspondence (color), element Water, support
  0.9; weakest tier established (attested root, correspondence
  leg) → level lightly-qualified.
- salty — correspondence (taste), Water, 0.9, established →
  lightly-qualified.
- green — cycle-neighbour generates:color, element Wood,
  support 0.765, established → support middling → qualified.
- sour — cycle-neighbour generates:taste, Wood, 0.765,
  established → qualified.
- PLUS one disclosed fixture member, in R1-4's
  disclosed-fixture pattern: a priced conclusion over salt —
  quality "cold", element Water, support 0.35, weakest tier
  derived, its derivation path labelled as the fixture's —
  present solely to exercise §2.2's drop rule inside a
  composition. No below-floor conclusion over salt exists in
  the shipped graph to harvest (its one propagated conclusion
  stands at 0.45, above the floor), so the fixture supplies
  the case; it is not part of the shipped table or graph.

Expectations:
- Support order over the spoken members: [black, salty,
  green, sour] — 0.9 before 0.765, ties in enumeration
  order.
- Relation order (newest state Wood): green and sour stand
  on Wood — the SAME element as the newest state (weight
  1.0) — and lead, their tie falling to support then
  enumeration: [green, sour]. Black and salty stand on
  Water, which generates Wood — a generating relation
  (0.8) — and follow: [black, salty]. Relation order:
  [green, sour, black, salty]. It DISAGREES with support
  order — in the leading member and overall. This is the
  genuine disagreement case, from real graph content.
- The active order is the default (support): the reply
  speaks black, salty, green, sour in that order, as one
  reply graph over the shared subject; the trace (the
  composition record the runner prints) names both
  orderings and the active one.
- Mixed strength, kept per member: black and salty carry
  the lightly-qualified form (the hedge modulator), green
  and sour the qualified form (the modal state) — each in
  the one graph, on its own predication. No member's
  qualification leaks onto another; the set is not
  flattened to its strongest or weakest member's level.
- The fixture member is dropped: absent from the graph and
  from both spoken orderings; the composition record names
  it with its pricing and its ground (support 0.35 below
  the floor 0.4). The composition still speaks — a dropped
  member does not drag the others down.
- The composed surface passes the leak scan: no element,
  polarity or cycle vocabulary.

## Scenario R2-3 — boundaries: where composition does not apply (turn-level)

Turns (one session):
1. "Is the salt cold?"
2. "Is the soup cold?"

Expectations:
- Neither subject carries a degree profile, so no set
  exists: the single-conclusion R1 path speaks, byte-
  identical to the forms R1/R1.5 established ("The salt is
  cold." at plain strength; "The soup may be cold." at
  qualified), each trace carrying NO composition record.
  Composition changes nothing where there is one
  conclusion.
- Recorded alongside (pinned in the unit tests, printed by
  the runner): an empty conclusion list, and a list whose
  every member is below the floor, each compose to the
  DECLINE — the ground naming every member's shortfall —
  never to an empty reply or a bare "I don't know" (§6).
