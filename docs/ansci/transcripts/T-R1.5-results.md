# T-R1.5 results — the generator-realisation gaps closed, T-R1 re-judged

Run 2026-11-16, after the R1.5 build (`src/ansci/generate.ts`,
`src/ansci/plan.ts`, `src/ansci/turn.ts`), via
`node scripts/ansci-r1-transcript.mjs` against the built tree,
plus the gate runs recorded at the bottom. `T-R1.md` and
`T-R1-results.md` are untouched. This slice is connective-layer
work (design note §4): the ontology decides content, stance
and strength — R1.5 teaches the generator to SAY what the
planner decided. pricing.ts's levels and table are unchanged;
no new node or edge vocabulary was introduced; English only.

## What was built

**G3 — qualification realised (the binding gap).**
`generate.ts`'s EN predicate path now reads two things it
never read: a **modal state** on the predicate root (the
modal carries the clause, the copula surfaces as bare "be"),
and **modulators** of the predicate root ('modulates' edges
in), placed before the complement. The EN verb path also
realises a modal state on the verb root (base form under the
modal, the aspect bundle riding under it) — until now "You
would go." generated as "You go.", the drop R1 cited. The
planner writes the priced level into the graph per one table
in `plan.ts` (`QUALIFICATION_BY_LEVEL`, as data):

| pricing level (§9.2) | written into the graph as | surface (salt/cold) |
|---|---|---|
| plain | no qualification state | "The salt is cold." |
| lightly-qualified | hedge modulator "likely" on the predicate | "The salt is likely cold." |
| qualified | modal state "may" on the predicate root | "The salt may be cold." |
| possibility | modal state "might" on the predicate root | "The salt might be cold." |

Every level has its own honest form in the existing state
vocabulary — the ladder is monotone (bare → likely → may →
might is a real weakening at each step) and **no level is
mapped onto a neighbour's form**. The hedge modulator is the
same device the ZH predicate path reads its degree words
through; "may"/"might" are values of the existing `modal`
state (the class the parser already records for
would/could/should).

**G1 — degree realised on EN predicate graphs.** The same
modulator reading carries degree: the ZH predicate path's
construction (a degree modulator before the quality), ported
to the EN predicate path. The planner takes a degree *grade*
and writes the modulator from one table in `plan.ts`
(`DEGREE_FORM`), graded on the season profile's own bands:

| grade (profile share) | form | surface |
|---|---|---|
| strongest (≥ 0.65) | most fully | "Winter is most fully cold." |
| strong (≥ 0.35) | fully | "… is fully cold." |
| faint (< 0.35) | slightly | "… is slightly cold." |

`turn.ts` grades the season profile's share and hands the
grade to the planner; qualification and degree compose
(hedge scopes over degree: "likely most fully cold"; a modal
carries both: "might be most fully cold").

**G2 — causal subordination realised.** Representation,
recorded as a choice: the reply graph holds a **second
predication** — the same subject and quality, carrying the
derivation's degree — joined to the main predicate root by a
**'links' edge whose marker is "because"**. 'links' is the
graph's existing clause-joining relation (its ZH use joins
the correlative construction's two verbs) and the edge
`marker` field is the connective layer's own device for
carrying a surface connective (the same field that carries
就 on chains-to edges) — no new vocabulary. The alternative,
the 'condition' edge, was rejected: it realises a
conditional, a different relation. The generator composes
the subordinate with the same predicate machinery as the
main clause (so its degree realises identically), joins with
", because ", and pronominalises a subordinate subject that
repeats the main subject to "it". The degree moves to the
subordinate under a demanded causal form: it is the ground
the why-answer states, as the probe's hand rendering also
put it there.

## The three failed turns, re-judged

**R1-1 turn 1 ("Is winter cold?") — PASS.** Reply: **"Winter
is most fully cold."** — generated end to end from the plan's
reply graph (wordingNotDerived: false). The derivation and
price are as frozen (winter —ELEMENT_OF→ Water —POLARITY_OF→
Yin —HAS_QUALITY→ cold; attested, support 1, level plain),
and the degree the profile computes now rides the graph as
the "most fully" modulator — the reply speaks the whole
derivation, not less than the probe's rendering spoke.

**R1-1 turn 3 ("Why is winter cold?") — PASS.** Reply:
**"Winter is cold, because it is most fully cold."** — the
causal form, built from the derivation under §7.2's default
(policy (a): asked why → causal form demanded). The trace
names the path, the support, the pricing record and the
reply graph; the graph carries the second predication and
the 'links'/"because" join (visible in the serialised graph
the trace records). Per §6 it now counts as a planned reply.

**R1-3 ("Is the soup cold?") — PASS (the primary
expectation).** Reply: **"The soup may be cold."** — the
derived-tier conclusion (support 0.8, ceiling and level
qualified) spoken QUALIFIED, from the reply graph: the modal
state "may" is on the graph's predicate root, the surface is
the generator's realisation of it, and the trace names the
path, the support, the pricing record (derived, qualified)
and the graph. The conclusion is not asserted plainly.

## Non-regression on the passed turns

- **R1-1 turn 2** — "The salt is cold.", byte-identical,
  still generated at plain strength.
- **R1-2 (all three turns)** — byte-identical replies. The
  steering turns' recorded deviation stands as R1 recorded
  it: derivation-steered and priced, wording the probe's,
  because those replies predicate no derivation conclusion
  (their question transform is R3's, not this slice's).
- **R1-4** — the priced decline is byte-identical, ground
  named with its numbers (support 0.35 below the floor 0.4).
- **R1-5** — byte-identical; wording recorded not derived,
  no pricing record, no reply graph, as frozen.

## Scripted-scenario wording changes (the authorised set)

Wording changed ONLY where a turn's origin changed from
probe to plan under the newly-realised forms — all three in
the winter-cold scenario, all three season degree-profile
turns R1 had retained:

| turn | before (probe hand rendering) | after (plan-generated) | mechanism |
|---|---|---|---|
| "Why is winter cold?" | "Winter is cold, because it is the season turned most fully toward cold — cold runs at its strongest there." | "Winter is cold, because it is most fully cold." | G2: the causal subordinate is now built from the derivation's degree content; the probe's relative-clause dressing ("the season turned most fully toward cold") is a construction the generator does not have, and the degree predication is the same content without it |
| "Is summer hot?" | "Yes — summer is hot: it is the season turned most fully toward hot." | "Summer is most fully hot." | G1: the degree rides the reply graph as a modulator; capitalisation is the generator's sentence-initial cap, as R1's results anticipated |
| "Why is winter dark?" | "Winter is dark, because it is the season turned most fully toward dark — dark runs at its strongest there." | "Winter is dark, because it is most fully dark." | G2, as turn 1 |

Consequent pin updates, each with its reason recorded at the
site: `test/ansci-pricing.test.ts`'s EXPECTED_REPLIES
winter-cold entries (the R0-acceptance test now names this
exception in its title); `test/ansci-turn.test.ts`'s Slice-C
matcher /summer is hot/ → /Summer is most fully hot/ (the
case-sensitive match cannot survive a generated sentence —
updated, not contorted around); `docs/ansci/transcript-sample.md`
regenerated by its own harness. All other scenarios
(anger-news, worry-sleep, soup) are byte-identical.

Test changes beyond pins: `test/ansci-plan.test.ts`'s two R1
unrealisability tests were rewritten to the new behaviour
(each level spoken from the graph; the causal form built
with degree, still unrealisable without), and its soup
turn-wiring test now pins the qualified spoken reply. New
file `test/ansci-realise.test.ts` (7 tests): the four levels
as four distinct surfaces; the three degree grades; the
generator-level modulator reading on a hand-built graph;
qualification × degree composition; verb-clause modal
realisation (plain, negated, perfect, and the unmodalised
clause unchanged); the three wired sites at turn level; and
a leak scan (element/polarity/cycle vocabulary) over every
new surface form plus all scripted replies.

## Gates

- **Tests: 459 pass / 0 fail** (baseline 451; +7 new in
  fork-realise.test.ts, +1 net in fork-plan.test.ts).
- **Typecheck: clean** (`tsc --noEmit`).
- **Round-trip preservation (stage-5 measurement,
  scripts/ansci-stage5.mjs): held exactly.** Pooled feature
  preservation 97.7% over 1079 atoms before and after; every
  family identical (negation 91.2%, roles 92.6%, entity
  97.8%, connective 97.1%, mood 98.9%, attachment 95.0%,
  aspect/tense/voice/predicate 100%, the rest unchanged);
  §5.1 generation direction 13/15 exact, negator present
  14/15; §5.3 F1 family 12/12; §5.4 temporal 4/4; corpus
  80/80 parsed, 0 generation failures. Held rather than
  improved, for a statable reason: the frozen holdout's
  parsed graphs carry no modal state on a plain verb clause
  and no modulators on a predicate root, so the new
  realisations have nothing to fire on there — they fire on
  planner-built graphs and modal-carrying graphs, which the
  corpus does not contain. No family dropped.
- **Foundation files byte-identical** (sha256, before =
  after): src/seed.ts 9aaef80a…, src/graph.ts e15ee119…,
  src/engine.ts 5fd29ef3…, src/propagate.ts 982779ac…,
  src/wordnet.ts fd7bb4b2….

## Still unrealisable, named

- **A demanded causal form for a derivation carrying no
  degree.** "Why is the salt cold?" still returns
  unrealisable from the planner: beyond the conclusion, that
  path's steps are correspondence assignments (an element, a
  polarity), which have no plain-words surface form under
  the surface ban — there is no honest because-clause to
  build. The turn falls back to the probe's rendering
  ("Salt is cold — the two belong together in everything I
  have on them."), wording marked not derived, the reason in
  the trace. This is G2's remaining half: the construction
  exists; this class of path has no surfaceable content for
  it.
- **Qualification realisation is present-tense**, as are all
  planner-built graphs today: the modal branch speaks "may
  be", with no past-modal form ("might have been") — no
  priced turn has yet demanded one.
- **A generated qualified reply does not re-parse with its
  qualification intact.** The parser's modal vocabulary is
  would/could/should, recorded only in conditionals;
  parsing "The soup may be cold." back yields a copula root
  with no modal state. The loop never re-parses its own
  replies, so nothing in the turn depends on it — recorded
  because §2.3's claim that the round-trip machinery applies
  to replies unchanged is, for the qualified levels, not yet
  true on the parse side. That is a parser task, not a
  generator one, and it is not this slice's.
