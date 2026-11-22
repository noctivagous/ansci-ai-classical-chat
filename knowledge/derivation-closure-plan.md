# Derivation-closure — plan and record

*Plan proposed in discussion 2026-11-22; Phase 0 and Slices 1–2 (as a
standalone testbed) built and run the same day at the owner's commission.
Owner rulings carried in this plan: no PLN formulas (their assumptions —
counted evidence, independence, base rates — do not fit a
provenance-tier system; the arithmetic is pluggable and chosen by
measurement); generators hand-authored while the shape is being proven;
no turn-path consumer until the machinery is understood.*

## The design in one paragraph

Basic knowledge as generators + a seed core, not as inventory: a small
attested core (classification, correspondences, rules) whose *closure*
under priced derivation walks is the effective knowledge; derivations
used in real turns materialise into a bank (tier 3) with replayable path
receipts; the big external graphs demote to oracles, consulted at a
located lack and banked on arrival. Full design note in
`basic-knowledge-sources.md`.

## Phase 0 + Slices 1–2 — DONE, as a standalone testbed

Location: `knowledge/derivation-closure/` (plain Node ESM, no
dependencies, nothing in `src/` touched).

- **Syllabus**: materials & heat in the kitchen — 38 concepts, 57
  questions (54 scorable, 3 contested and excluded), each with an
  expected verdict and justification.
- **Generators**: 35 general quantified rules over material properties,
  artefact composition and contexts. No per-question facts.
- **Baseline**: 25 stored facts of trim quality, lookup only.
- **Walk**: seed/goal/budget forward chaining, three pluggable
  arithmetics (weakest-link, product decay with disjoint-support
  combining, tier-and-depth), path receipts serialised to a stable JSON
  contract (`receipts.json`, kind-ready for a future paramorphic viewer
  kind), replay verifier.

### Results (actual run, 2026-11-22)

```
approach              answered  correct  acc(all)  wrong&confident
baseline (lookup)           23       22     40.7%              1
closure (weakest-link)      54       52     96.3%              2
closure (product)           54       52     96.3%              2
closure (tier-depth)        54       52     96.3%              2
receipts banked: 168 — replay verification 168/168
```

### What the run established, and what it did not

- **Coverage claim holds** in this domain: derivation from generators
  answered every scorable question; lookup answered only what was
  stored. Baseline accuracy where it spoke was comparable (95.7%).
- **The arithmetic question is UNDECIDED.** All three arithmetics tied
  on every metric; mean derivation depth was 1.39, too shallow for
  decay policies to diverge, and no conclusion was reached by two
  independent paths (combining fired 0 times in 168 receipts).
- **The run's sharpest finding: pricing is blind to a missing axis.**
  Both closure errors are one error — cast-iron heat retention, which
  runs through thermal mass, an axis the generator set omits. Every
  arithmetic priced those derivations at full testimony strength.
  Pricing weighs support *inside* the model; it cannot see what the
  model lacks. The baseline won that question outright, because a trim
  carries memorised assertions a derivation cannot reach. Consequence
  for the architecture: stored facts are not obsolete under closure —
  they are **witnesses** against the model's blind spots, and a
  derivation/fact conflict is itself a signal (a missing-axis alarm)
  that should register as a located lack.
- Not shown: anything beyond one small hand-authored domain; authoring
  generators at syllabus scale without answers leaking into rules; any
  live-conversation behaviour.

## Next — testbed v2 (owner accepted, 2026-11-22)

One build, same harness, four additions:

1. **Thermal-mass axis** — does adding the missing axis repair the two
   cast-iron errors, and at what authoring cost? Prices the
   missing-axis failure mode.
2. **Converging-path questions** — conclusions reachable by two
   genuinely independent routes, so combining fires and the arithmetics
   can separate (or tie again, honestly, at depth).
3. **Deeper chains** — questions needing 3–5 hops, where decay policies
   diverge.
4. **Witness arbitration** — derived conclusion vs banked fact in
   conflict: which wins, at what price, and whether the conflict
   registers as a located lack.

Gate for leaving the testbed: an arithmetic chosen on measurement, and
the witness rule stated. Only then: a turn-path consumer (one named
question family — suitability/property), the paramorphic receipt kind,
and tier-3 materialisation in the real bank.

## Standing caveats

- One domain is one domain. Every number above is an instrument
  reading, not an architecture result.
- The GAPS audit's lesson applies: no consumer gets wired before its
  machinery is understood.
