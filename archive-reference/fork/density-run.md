# Density / overgeneration run — first measurements (2026-11-15)

Run with `npm run fork:density` (script: `scripts/fork-density.mjs`).
This is the DESIGN §5.2 test, run for measurement. **No pass bar was
pre-set**: §5.2 says the bar is set with the user before the run, and
that has not happened yet — so this document reports numbers against
the design's qualitative criteria, and the bar remains the user's to
set. Nothing here is a pass/fail verdict.

## Method

- **Base**: the fork's curated classification table (158 entries,
  `src/fork/classify.ts`) joined into the seed graph
  (`src/fork/join.ts`): 251 nodes / 313 edges.
- **Synthetic stages**: a seeded LCG (same load every run) generates
  ×10 and ×100 stage loads — fresh concepts classified across all five
  elements and the engine's aspect keys at confidence 0.55–1.00, ~8%
  carrying a second, conflicting same-aspect classification. Crucially,
  each synthetic concept also links into the existing net
  (ASSOCIATED_WITH, 20% IS_A, to a random curated or synthetic
  concept), so propagation traffic flows across the question set's
  neighbourhood. (A first version without links stressed nothing —
  disconnected islands cannot overgenerate into the question set — and
  its flat numbers are not reported, because they measured nothing.)
- **Fixed question set** (14 questions, the transcript/evaluation
  domains): winter, cold:temperature, cold:illness, anger, furious,
  worry, sleep, soup, salt, rain, sleet, fear, grief, joy. Each is run
  through `derive()` in `src/fork/join.ts`.
- **Precision proxy**: the fraction of derived conclusions whose
  derivation path is ≤ 3 edges AND whose confidence is ≥ the join's
  gate (0.6). It is a proxy, not hand-judged precision: §5.2's sampled
  hand-judging remains to be done.
- **Arbitration firings** are counted from the existing propagation
  pass's own notes (`src/propagate.ts` restraint arbitration), and
  conflict flags from its review items / flagged statements.

## Numbers

| Measure | curated ×1 | ×10 | ×100 |
|---|---|---|---|
| Classifications | 158 | 1,675 | 16,745 |
| Graph nodes / edges | 251 / 313 | 1,673 / 3,252 | 15,893 / 32,542 |
| Conclusions over the fixed question set | 447 | 488 | 546 |
| Precision proxy | 0.917 | 0.842 | 0.751 |
| Propagated statements (whole graph) | 190 | 10,137 | 112,854 |
| Restraint-arbitration firings | 0 | 929 | 10,523 |
| Flagged statements | 0 | 143 | 1,652 |
| Propagation review items | 0 | 109 | 1,047 |
| Join-level conflicts on the question set | 0 | 0 | 0 |
| Gated questions | 0 | 0 | 0 |

## Honest reading

- **Conclusion growth on the question set is strongly sublinear**:
  ×106 the classifications buys only +22% conclusions (447 → 546).
  The brakes — per-relation decay, the depth limit, supersede by
  curated classifications, the confidence gate — are doing visible
  work. This is the single most encouraging number in the run.
- **The precision proxy degrades steadily** (0.92 → 0.84 → 0.75). What
  leaks in at density is mostly long-path, low-confidence propagated
  material arriving on questioned concepts from synthetic neighbours.
  Even at base the proxy is below 1: successor leanings (faint by
  design, lowest precedence, confidence halved) are counted as
  conclusions but fail the proxy's confidence arm — part of the
  degradation is therefore the proxy's strictness, not noise. How much
  is real overgeneration needs the hand-judged sample §5.2 specifies.
- **The arbitration and flagging machinery scales roughly linearly**
  with load (arbitration ×11 per decade of classifications; review
  items ×9.6; flagged statements ×11.5). Nothing explodes
  combinatorially, but nothing is free either: at ×100 the pass
  produces 112,854 propagated statements graph-wide, and a review
  queue of 1,047 items is far beyond hand review — at real density the
  review queue itself would need triage (the gardener's chair, DESIGN
  §2.4, is one candidate; unbuilt).
- **Join-level conflicts on the questioned concepts stayed 0** at all
  stages: the synthetic same-aspect conflicts land on synthetic
  concepts and surface through propagation flagging instead. The
  (concept, aspect) scoping held — no questioned concept acquired a
  second direct classification.
- Runtime for all three stages including graph builds: ~15 s on this
  machine. The ×100 stage is not a practical interactive load; it is a
  stress bound.

**What this does not show**: whether the conclusions that arrive at
density are *right* (no hand-judged sample yet), whether arbitration
damps the *right* side in contested cases, and whether the review
queue's signal-to-noise is usable. The §5.2 pass bar — how much proxy
degradation, how much conclusion growth, is acceptable — is still the
user's to set before any verdict is claimed.
