# Link Grammar coverage slice — design brief

Status: BUILT + GATED 2026-11-21, all three stages — see
the Linkage placeholder's coverage section for the full
measured record. Stage 1 shadow landing (suite 1,556,
parser-compare identical); stage 2 held-out set sealed
(v2 `0219a292…`) with baselines F1 5/5, F2 2/4, F3 1/4,
F4 0/4, F5 1/4 on graph content; stage 3: F1 landed in part
(object classification routed; S-side refused on the
locative-inversion evidence; MV unrouted), F2 attempted and
failed its gate at 2/4, routing stopped per the brief's
rule — F3–F5 not attempted. Depends on the dictionary slice
(`docs/ansci/linkgrammar-dictionary-slice.md`, built on
`track/linkgrammar-dict`: conversion `d258675`, provider + consumers
`cc8b738`, tests `6da0aea`, submodule record `f5a06b9`). Owner decisions
carried forward: no WASM, no native binary in the runtime, AnSci's parser
and traces remain the system of record, English only.

## What "coverage" means here

The dictionary slice shipped per-entry *summaries* computed from the full
expansion (live-disjunct count, max O-capacity, min cost) — the quantities
its two evidence consumers read. It changed classification for a measured
10-form intersection and added one check family; the 12 parser-comparison
cases came out identical to baseline, by design. Coverage is the other
half: sentences whose *structure* the positional parser flattens or drops
— relative clauses, PP attachment, coordination, complement and
conditional clauses (the families named in `GAPS.md` and reproduced in
`data/ansci/parser-comparison-v1.json`). Those need a linkage: a
whole-sentence structure the Builder can walk. This brief is that slice.

## The missing input, and how the converter supplies it

A solver cannot run on summaries; it needs disjuncts. Shipping enumerated
disjunct sets is not viable — the dictionary slice measured 20,723,975
live disjuncts over the shipped entries. Upstream does not enumerate
either: it generates disjuncts lazily, per sentence, from the dictionary
expressions, with pruning. The coverage slice follows that shape:

1. **Converter extension** (`import-linkgrammar.py`, new output kind):
   ship, per shipped entry, the *macro-expanded expression tree* —
   macros already resolved by the existing memoised expansion, so the
   tree contains only connectors, `&`/`or`, optionals, costs and
   multi-connector marks. Expressions are compact (the source entries
   total ~1,800 in the dict); the manifest gains counts for this kind
   and the pinned-count tests extend, not replace.
2. **Lazy generator** (`src/ansci/linkage.ts`): given a sentence's word
   forms, generate each form's disjuncts from its expression tree on
   demand, applying the dictionary's cost semantics the converter
   already implements (default dialect, `max-disjunct-cost`). Generation
   is per-sentence and bounded; nothing is precomputed globally.

## The solver (subset, stated bounds)

- Sleator–Temperley counting search over the generated disjuncts:
  planar, connected, acyclic linkage; cost = disjunct costs + link
  length, as upstream. Return the best complete linkage, or the best
  partial linkage with its UNUSED set when no complete linkage exists.
- Bounds, recorded when hit, never silent: sentence-length cap,
  per-word disjunct cap, and a search budget; on any bound the solver
  declines and the current parser's result stands (a located decline,
  in the lack machinery's sense — the solver is a proposer, not a
  replacement).
- Ambiguity is data, not an embarrassment: the result records the
  linkage *count* and the chosen linkage's cost vector. Where several
  linkages tie, the first stands and the tie is recorded; sense
  coherence (`sense.ts`) as a later tie-breaker is a separate question,
  not assumed here.

## Integration: shadow first, then family by family

1. **Shadow mode (first landing).** `parseEnBody` runs as today; the
   solver also runs and its linkage is recorded in the trace beside the
   parse — links, cost, UNUSED, divergence notes where the linkage and
   the meaning graph disagree on S/O/PP structure. No behaviour changes.
   This is the measurement instrument for every later step.
2. **Family routing.** Each linkage family below is routed — the Builder
   walks the linkage for that family instead of the positional path —
   only after its held-out gate passes. Routing is per family and
   reversible by configuration, in the engine-choice pattern.

| Step | Family | Translation (link → meaning, via existing valency frames) | Failure it retires |
|---|---|---|---|
| F1 | `S` / `O` / `MV` core | S→agent, O→frame slot, MV→modulates | Positional recovery branches for covered shapes |
| F2 | `J` / `AN` | PP object→prepSlot/location/goal per frame; AN→qualifies | Dropped/defaulted PP attachment (wh- *about*-phrase) |
| F3 | `R*` relatives | Relative linkage→embedded clause graph on the head noun | Parse stops / clause dropped at relative *that* |
| F4 | `CC` coordination | Coordinated predicates share the agent; separate objects | *and* realised as a patient |
| F5 | Complements (`TH`, `Zs`, infinitive/`TO`) | Complement linkage→clause graph as the verb's argument | `embeddedTask` candidate annotation; conditional *if* as agent |

## Held-out gate (applies before F1, and per family after)

- A case set authored independently of the 12 comparison cases and of
  the GAPS examples used while designing — the comparison set is
  builder-authored and is a regression floor, not a score.
- Scored on **content preservation**: target nodes/edges present in the
  meaning graph, negation retained, no invented content — never on
  linkage counts (the dictionary evaluation's warning: counts are
  alternatives, not confidence; upstream's fragment accept at DIS 0.75
  is the standing example of a linkage that must not become a reading).
- Partial linkages never silently become parses: UNUSED > 0 keeps the
  current parser's result and records the partial as evidence only,
  until a family-specific ruling says otherwise (negation is the named
  hazard: the pulled evaluation's partial linkage dropped *not*).

## Non-goals

- Sentence segmentation of multi-sentence turns (a `turn.ts` problem;
  the solver is per-sentence by design).
- Fragment / telegraphic interpretation ("need hotel asap") — partial
  linkage is evidence for that work, not the work itself.
- Chinese. Generation (a linkage round-trip check on `generate.ts`
  output is a later, separate slice).
- Post-processing knowledge (`4.0.knowledge`) and constituent output.

## Gates per landing

Shadow: full suite + typecheck + `ai:check` green; parser-compare
identical (shadow changes no behaviour); trace records present for all
12 cases. Each family: its held-out cases pass, parser-compare no case
worse, suite green, and the family's routing recorded in the linkage
placeholder with its measured result — what it shows, and what it does
not show, in the stepped-back register.

## Open questions

- Search cost on real chat sentences: measure in shadow mode before any
  routing; the budget numbers come from that measurement, not from this
  brief.
- Expression-tree size for the largest verb classes: the converter
  extension measures it; if a class's tree is outsized, it is recorded
  in the manifest with its count, as the dictionary slice recorded its
  own scope cuts.
- Whether cost ties correlate with the sense-coherence signal strongly
  enough to justify the tie-breaker — shadow traces are the evidence.
