# Derivation-closure testbed

A self-contained experiment for the derivation-closure (compounding
graph) design recorded in `../basic-knowledge-sources.md` ("Design note —
the compounding graph"). One domain — **materials & heat in the kitchen** —
is authored as *generators* (material properties, artefact functions,
general derivation rules), and a priced walk derives answers to a fixed
question set at query time instead of looking them up. A stored-facts
baseline runs the same questions by lookup only, for comparison.

## Run it

```
node knowledge/derivation-closure/run.mjs     # summary table + REPORT.md + receipts.json
node knowledge/derivation-closure/verify.mjs  # replay every banked receipt
```

Plain Node ESM, no dependencies, no build step.

## Files

| file | what it is |
| :--- | :--- |
| `syllabus.mjs` | The measuring instrument: ~38 concepts and 57 questions (property / suitability / what-happens-if), each with an expected verdict and justification. 3 are marked contested and excluded from scoring. |
| `generators.mjs` | The domain as generators: material/substance property entries, artefact function entries, and general quantified rules. No per-question facts. The v1 configuration deliberately has **no thermal-mass axis** — cast iron's heat retention (S5, S23) is the visible model gap. The file now also carries the v2 mass axis (`thermalMass` entries + `MASS_RULES`), admitted only by the v2 configuration. |
| `generators2.mjs` | v2 additions: extra property facts (brittleness, served-hot), the converging-path and deep-chain rules, and the composed v2 configuration (`buildBaseFactsV2()` + `RULES_V2`). |
| `syllabus2.mjs` | The v2 question set: 11 converging-path questions, 12 deep-chain questions (3–5 hops), 3 witness re-asks (one deep question is double-tagged). |
| `witness.mjs` | Witness arbitration: closure-vs-store conflicts, resolved by the stated rule and recorded as located lacks (type `witness-conflict`). |
| `stored-facts.mjs` | The baseline: ~25 direct goal-level assertions of the kind a trimmed shipped graph would hold. Lookup only, unpriced. v2 adds a `scope` (generic/specific) to each fact — used only by witness arbitration — plus 3 further facts kept out of the v1 baseline. |
| `walk.mjs` | The priced derivation engine: seed/goal/budget forward chaining, three pluggable pricing arithmetics, path receipts, receipt JSON serialisation, and receipt replay. |
| `run.mjs` | Runs baseline + closure × 3 arithmetics, prints the summary, writes `REPORT.md` and `receipts.json`, and self-verifies every banked receipt by replay. |
| `verify.mjs` | Standalone replay check of `receipts.json`. |
| `receipts.json` | Every derivation from the run in the stable receipt JSON contract — **this file is the kind-ready contract for a future paramorphic viewer kind** (a derivation/receipt viewer component would consume it directly). |
| `REPORT.md` | The run's full results, generated — do not hand-edit. |

## The receipt contract

Each receipt is plain JSON with stable field names:

```
{ question, config, seed, goal, steps, finalPrice, arithmetic, verdict }
  config     'v1' | 'v2' — the generator configuration the receipt ran under (v2 addition)
  seed       leaf facts (base + premise) the derivation stands on
  goal       the derived fact, as [pred, ...args]
  steps      ordered steps, premises before conclusions;
             each { from: [fact...], rule, to, hopStrength }
  finalPrice number (weakest-link / product) or {tier, depth} (tier-depth)
  verdict    'assert' | 'qualified' (below testimony threshold)
```

## Pricing arithmetics (pluggable)

- **weakest-link** — a path is as strong as its weakest hop; rival paths combine by max.
- **product** — hop strengths multiply; rival paths combine (noisy-or) *only* when their support sets are disjoint, so a shared premise is never counted twice.
- **tier-depth** — no continuous numbers: a conclusion is priced by the tier of its weakest support (premise > attested > generic) and its depth, and testifies only at generic tier or better within the depth cap.

**PLN is excluded, by the owner's ruling.** PLN's formulas assume
independent evidence and confidence-as-evidence-count; AnSci's support
comes from provenance tiers, and closure walks share subpaths by
construction, so independence fails in the normal case. The three
arithmetics above make no such assumptions. PLN's *revision* shape
(weighted averaging of genuinely independent support) remains a
candidate for the one place independence actually holds — separate
oracles agreeing — and is not used here.

## v2 — thermal mass, converging paths, deeper chains, witness arbitration

v2 keeps the v1 experiment intact (the v1 configuration reproduces v1's
numbers and receipts exactly) and runs a second configuration that
admits a thermal-mass axis, alongside a new question set. Headline
results from the current run (full tables in `REPORT.md`): the mass
axis — 12 one-word material entries and 5 rules — fixes S5 and S23
under all three arithmetics (the v1 set scores 54/54 under the v2
configuration, with exactly two verdict changes and a handful of
price/route-only changes, all listed in the report). All 11 converging
questions are reached by two genuinely independent routes; under
product the combine step fires in every converging goal receipt and
lifts prices (singles 0.85–0.95 → combined 0.95–0.98) but changes no verdict class. On
the deep subset (3–5 hops) accuracy ties again at 12/12, but the
arithmetics finally separate on *assertiveness*: weakest-link asserts
all 12, tier-depth 10 (its depth cap holds the two 5-hop chains),
product only 3 (multiplicative decay prices most deep chains below the
testimony threshold — correct but unassertable). Witness arbitration
detects 9 closure-vs-store conflicts per arithmetic; weakest-link and
tier-depth resolve all 9 to the expected verdict, product mis-resolves
one (D8: a correct-but-qualified deep derivation loses to a sloppy
generic stored fact — reported in the report as a located lack, not
tuned away).

## Standing caveat

This is an instrument, not a result about the whole architecture: one
domain, hand-authored generators, a hand-authored syllabus, both written
by the same author in the same session, ~54 scorable questions. It
measures whether a generator set's closure covers a syllabus cell better
than a stored-facts trim, and how the pricing arithmetics behave. It
says nothing yet about conversational scale, noisy grounding from real
sentences, or domains nobody designed generators around.
