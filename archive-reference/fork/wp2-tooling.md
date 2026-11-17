# WP2 benchmark infrastructure — what was built

Built 2026-11-15 as conventional engineering (no ontology work):
the machinery the repair programme specifies for WP2, so that a
sealed evaluation can be run the day an independent author and
independent judges exist. The judging itself is not built and not
simulated — it needs independent humans (programme Part C.5, C.7).

## Sealed sets (Part C.5) — `src/fork/sealed.ts`, `scripts/fork-sealed.mjs`

- **Manifest format** carrying the protocol's full per-item field
  set: item_id; item_text and language; source_id; sampling_frame;
  selection_seed; item_class (positive control, negative control,
  near-miss, brake case, discriminating case); item_status
  (determinate / finite-ambiguity / unresolved); target_claim_id;
  conventional_prediction; elemental_prediction; expected_graph as
  **feature atoms** (the features.ts vocabulary), not a
  sentence-level label; acceptable_variants (finite, declared in
  advance); excluded_decisions; scoring_rule_version;
  parser_build_target; creation_timestamp; content_hash;
  manifest_hash.
- **Hashing.** Canonical (key-sorted) JSON under SHA-256: a content
  hash per item over all its fields, and a manifest hash over the
  manifest head plus the ordered item hashes. Any post-sealing
  edit — an item text, an expected atom, a "variant" added after
  the fact — breaks verification and is named by item_id.
- **Roles as operations.** Author: `seal`. Operator: `run`, whose
  input is `operatorView()` — item_id, text, language, build
  target, and nothing else; expected graphs and predictions are
  absent from the view by construction. Custodian: `verify` before
  and after the run, and `score`, which refuses a run recorded
  against a different manifest hash. The run record preserves the
  build id, the exact command, raw generated output, and both
  atom sets (G0 and the reparse G1).
- **G0 accuracy (amendment A1).** Scoring reports, per item and in
  aggregate: G0's accuracy against the sealed expected graph (the
  features.ts comparison run with the expected atoms as the
  required side) **alongside** G0↔G1 preservation — preservation
  against an unscored G0 can certify consistent wrongness, and the
  two numbers now travel together. Finite-ambiguity items score
  against the best of their declared graphs and name which one
  matched. Unresolved items are excluded from binary scoring and
  reported by class and count. Aggregates are given pooled, per
  class, per family, and **per language** — separate denominators,
  so no pooled pass can hide a Chinese failure (C.6 parity).

## Review triage (Part C.6) — `src/fork/triage.ts`, `scripts/fork-triage.mjs`

- Queue records (JSONL) keep **rule status and instance status as
  separate fields**; a validated rule's unreviewed instances stay
  machine-derived and provisional, and admitted confidence is
  `min(C_source, C_rule-calibration, C_instance)` with an
  unreviewed instance's C_instance capped below 1.0.
- **Always-review list**: critical + high classes, whole — never
  sampled.
- **Stratified sampling** for medium/low: seeded (reproducible),
  finite-population-corrected sizes — a sampled population of
  1,047 draws ≈283 at 95% ±5% — allocated across strata in
  proportion to size with per-stratum minimums; strata too small
  for the minimum are taken whole and reported as under-tested.
- **Escalation**: per-stratum suspension when a sampled
  unsupported-inference rate exceeds 5%, an unresolved-
  contradiction rate exceeds 1%, or the lower 95% precision bound
  falls below the ratified bar.

## The fixture, and what its scores mean

`test/fixtures/sealed-draft.json` is a seven-item set the builders
authored to exercise this machinery (EN + ZH; determinate,
finite-ambiguity, and unresolved items; a discriminating item with
both predictions filled). Its expected graphs were taken from
parses verified correct by hand, so a clean run scores 100% — by
construction. Under the programme's own standing demotions that is
a *machinery check*, internal evidence only: it shows the seal
holds, the operator stays blind, the scorer refuses a foreign
run, and the reports come out in the specified shape. It is not a
parser accuracy result, and no WP2 claim may cite it.

## What remains for WP2 itself

An item author independent of the builders writes a real sealed
set (adversarial composition per C.5: per 100 items, 40
discriminating / 20 near-miss / 20 brake / 20 controls, every
discriminating item carrying both predictions, a negative control,
and a falsification condition); a custodian distinct from the
author holds it for distinctive elemental claims; independent
judges supply the human instruments. The tooling above is ready
for all three.
