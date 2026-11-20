# Lesk sense ranking — report

**Date:** 2026-11-19 · **Branch:** track/lesk-and-entity-ranking, cut from origin/main 76996ae · **Scope:** Part 1 of the ranking build (Lesk). Part 2 (entity ranking) is reported separately in docs/fork/entity-ranking-report.md. Local commit only; nothing pushed.

## What was built

- **src/fork/lesk.ts** (new) — the Lesk algorithm (Lesk 1986) in its adapted form (Banerjee & Pedersen 2002): each candidate synset is scored by overlap between its *signature* (its own gloss and lemmas at full weight; glosses and lemmas of hypernyms, hyponyms/instances, meronyms/holonyms and similar-to synsets at 0.5) and the context — both the sentence's words directly and, as the adapted term, the signatures of the context words' senses (best-matching sense per context lemma, summed). A two-word phrase from the gloss appearing intact in the context earns a +1 bigram bonus. A most-frequent-sense prior (prior = 0.5 / sense index, read off WordNet's frequency ordering of senses in the extract) is added; one gloss word (1.0) always outweighs the largest prior (0.5).
- **Integration — the seam.** The parser's sense choice is made in `applySenseSelection` (src/fork/sense.ts), called from `parse()` for every English parse. Candidates are climb candidates (wordnet-lex.ts), one per anchored sense; coherence support votes per *element*; the choice is the element with the most support, **ties keep the baseline**. That tie is the one place the existing arithmetic itself declares an absence of evidence (it is the rival-split shape, R3). Lesk enters **exactly there, and nowhere else**:
  - Only when coherence support ties at the top between ≥2 live elements is Lesk consulted.
  - Each tied element is scored by the best Lesk total among its live candidates (a candidate ↔ synset address is read from the candidate's path, "[n sense 3: …]" — the same indexing `climbCandidates` itself uses; an unparseable address scores no evidence).
  - **Eligibility:** a candidate may speak for its element only with real overlap evidence (sentence + context score > 0). A prior-only score may not break a tie.
  - A unique Lesk maximum among the tied elements decides; a Lesk tie changes nothing. `SenseDecision` records `lesk` (per-element totals) and `leskTieBreak` when the break supplied the decision, so the choice stays explainable.
  - Coherence support that differs at all remains decisive; Lesk is never consulted. rivalSplits (R3) is deliberately untouched: it still reports coherence ties as ties — whether a Lesk-broken tie should stop being reported as a split is a follow-up question for the turn loop, not decided here.

Two defects found by measurement during the build, both fixed in lesk.ts and pinned by tests: (1) the light stemmer stripped "-ing" from nouns that merely end in those letters ("spring" → "spr", matching nothing) — the strip now requires a ≥4-letter stem after also raising the length guard; (2) gloss-generic words ("something", "somebody", "specific", "place", …) manufactured phantom evidence in near-empty contexts — they are stopped out, as in standard Lesk implementations.

## Measurement — baseline first, reproduced on unmodified 76996ae

All figures below are from my own runs in this worktree, quoted from the runs.

**A note on the expected baseline figure.** The commissioning brief quoted the expected-graph holdout at "~76.1% accuracy / 98.3% preservation". That reading is historical: docs/fork/repair-programme.md (Part G) records the sealed run reaching "G0 accuracy 99.6% (254/255 atoms), up from 76.1%" — the improvement landed on main before 76996ae. Reproduced on unmodified 76996ae, the gauge reads **99.6% / 98.8%**, and that is the baseline this build compares against.

| Gauge | Baseline (76996ae, unmodified) | After Part 1 | Movement |
|---|---|---|---|
| Test suite | tests 1055 / pass 1052 / fail 0 / skipped 3 | (final full run: see branch head — targeted tests below; the post-integration suite run before new tests were added read identically 1055 / 1052 / 0 / 3) | no regression |
| Demo (fork:demo) | 29/29 expectations met | 29/29 | none |
| Holdout (fork:holdout, 80 sentences) | OFF 54/80 parsed, 14 exact round-trips · ON 80/80 parsed, 29 exact round-trips · 0 regressions | identical — docs/fork/holdout-run.md is byte-identical after re-running | none |
| Sealed holdout80 (expected-graph) | G0 accuracy (pooled, 20 scored items) **99.6%** · preservation (mean per item) **98.8%** | **99.6%** · **98.8%** | none (the sealed items' scored features do not turn on these sense ties) |
| Sense set A (development) | coherence **11/11** vs climb baseline 3/11 | coherence **11/11** vs 3/11 | none net — see below |
| Sense set B (sealed) | coherence **5/6** vs climb baseline 3/6 | coherence **6/6** vs 3/6 | **+1: the stock case, fixed by the tie-break** |
| ai:check | OK — 89 nodes | OK — 89 nodes | none |

The entire sense-challenge diff is one row: `stock` — "The stock simmered in the pot." Coherence tied 0–0 (Metal baseline = the shares reading; expected Water = the soup reading); Lesk's overlap with *simmered/pot* is the only evidence in the sentence and it backs Water. Set A briefly regressed during development (11/11 → 10/11) when the tie-break let the frequency prior alone overturn "She found rest." — the brake control, whose context is empty. That failure produced the eligibility rule above (prior-only scores may not break ties); with it, A returned to 11/11 and the stock win survived, because stock's evidence is genuine overlap, not prior.

## Targeted WSD check (scripts/fork-lesk-wsd.mjs)

Sixteen sentences whose correct sense is context-determined, expected synset named by ID before the run, in the sense-challenge sets' style (builder-authored, internal evidence). Two rankers on identical inputs: Lesk's total vs the most-frequent-sense prior alone.

**Lesk 11/16 · MFS prior alone 3/16.**

Passes: cold (temperature), bank (river), bank (financial), bat (animal), bat (club), spring (water source), crane (machine), crane (bird), match (fire lighter), light (illumination device), novel (book).

Failures, each explainable from the scores:
- **cold — illness.** Temperature adjective wins (1.83) over the illness synset. *fever*'s own gloss ("a rise in the temperature of the body") feeds the temperature family's signatures — the context word argues for the wrong family, in the open.
- **spring — season.** The coil sense wins on context-gloss overlap (6.00) with every sentence score at 0: pure adapted-term noise in a weak-evidence sentence.
- **spring — coil** and **match — contest.** A *verb* sense of the lemma out-scores the expected noun sense when all parts of speech compete. Within the expected (noun) POS both rank correctly (coil 4.50 top noun; contest 5.35 top noun) — and the pipeline never faces the all-POS contest, since the parse knows the POS and climb candidates are noun/adjective only. The check scores all POS deliberately, as the harsher module-level test.
- **rock — stone.** A near-miss inside the right family: the geological-material sense (6.07) edges the lump-of-stone sense (5.88). Fine-grained distinctions between sibling senses are Lesk's known ceiling.

## Files

New: src/fork/lesk.ts · test/fork-lesk.test.ts (9 tests) · scripts/fork-lesk-wsd.mjs.
Edited: src/fork/sense.ts (the tie-break seam, the SenseDecision record, header note) · docs/fork/sense-challenge.md (regenerated by its gauge; the one-row stock diff above).

## What remains unchecked

- Whether Lesk evidence should also inform rivalSplits' reporting (left as-is, deliberately).
- Lesk at other candidate-picking seams (e.g. token resolution's candidate lists) — not attempted; the commission named the sense layer.
- The WSD check is 16 builder-authored sentences; it shows the mechanism discriminating where glosses discriminate, and failing where they don't. It is not a benchmark.
