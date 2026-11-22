# FND-102 — implement Foundry evaluation: progress record 2026-11-22

Implemented `evaluate` for explicit expectations.

## What changed

- `src/ansci/foundry-evaluate.ts` (new): pure matcher `evaluateTurn(graph,
  trace, reply, expect)` plus `verdictOf`. Covers the FND-101 vocabulary:
  root, roles, forbiddenRoles, attached, roleOpen, tense/mood/voice,
  negated, negationCarrier, construction, qualifier, resolution (against
  `trace.resolutions`), questionTarget (interrogative filler), and reply
  constraints — which report `abstained`, since no mechanical
  reply-entailment check exists and a word match would be a self-authored
  heuristic, not evidence.
- `scripts/ansci-foundry.mjs`: `evaluate --suite <file> --json` branch.
  Suite validation (schemaVersion 1, chat profile, required resources,
  unique IDs, explicit must-pass|known-failure status, expect on every
  turn; violations exit 2). Each case runs in a fresh session, turns in
  order. Report carries per-turn checks, per-case verdicts
  (pass/fail/known-failure/unexpected-pass) and a summary. Exit 0 only
  when no must-pass check fails and no known-failure unexpectedly passes;
  exit 1 otherwise. `run` output is byte-identical in shape to before
  (shared turn helper; `semanticObject` retained).
- `test/ansci-foundry-evaluate.test.ts` (new, 6 tests, registered in t3):
  pass/fail roles, forbidden trip-wire, passive tense failure with passing
  roles, not-observable single-check behavior, resolution/qualifier/wh
  target, negation carrier and attached/open roles. 6/6 green.
- `loop/FOUNDRY.md`: status lines updated (evaluate implemented; compare
  still proposed; exit-1 conditions documented).

## Evidence

- `loop/foundry-results/evaluation-english-development-2026-11-22.json`:
  first evaluation of the FND-101 suite — 12 cases, 11 must-pass `pass`,
  `tense-passive-01` holds as `known-failure` (tense expected past,
  observed present), 2 reply checks `abstained`, exit 0.
- `run` regression: baseline input still runs (6 cases, 7 turns, all
  graphs observable, exit 0).
- Negative control: `evaluate` on the expectation-less baseline exits 2
  with `evaluate requires status must-pass or known-failure`.

## Limits and notes

- `npm run foundry` (build-then-run wrapper) currently short-circuits on
  the pre-existing `src/ansci/physics.ts` planck build errors, which exit
  tsc nonzero even though dist emits. All runs above invoked
  `node scripts/ansci-foundry.mjs` directly on a fresh build. The physics
  errors are untouched and out of scope.
- Units tier: 260/267 pass; the 7 failures (quantification ledger,
  problem-solving, social S5) reproduce on the clean tree with this work
  stashed — pre-existing, unrelated.
- Reply constraints remain ungraded by design (abstained, visible).

Next: FND-103 (compare) or ENG-101 (passive tense now has a failing
expectation to fix against).
