# Construction challenge — depth programme stage 3 (Part C.2 + Part D)

Set: `scripts/construction-challenge.tsv` (sha256 ef3ac441b41eebe8). Census = the 12 frozen-holdout parse failures; adversarial = the v9 §7 pairs; crashfix = the 2 stage-0 F3 generation crashes, scored as engineering.
Authorship caveat (standing): authored by the builder against the v9 design, sealed by the hash above; not an independently authored C.5 set. Scores are internal evidence (C.5 demotions).

## Ledger 1 — construction recognition (census, target ≥90%)

**12/12 = 100.0%** — target met.

## Ledger 2 — semantic representation (adversarial pairs, target 6/6)

**6/6 pairs** — no family cross-classification on the pairs.
- ✓ Who is Sarah? ‖ Sarah is a doctor.
- ✓ Where are you? ‖ Who are you?
- ✓ What's in it? ‖ What is it?
- ✓ What is the opposite of hot? ‖ What is hot?
- ✓ What about coffee? ‖ Coffee.
- ✓ Why? ‖ What about it?

## Ledger 3 — feature preservation and parse rate (frozen holdout)

Holdout parse rate **80/80 = 100.0%** (stage-2 close: 68/80 = 85.0%); pooled feature preservation on parsed round trips **98.2%** (stage-2 close: 95.9%).

## Ledger 4 — regression

Controls: **5/5** pass (required: all). Crashfix (engineering): **2/2** generate without throwing.

## Per-item results

| Class | Sentence | Result | Detail | Generation |
| --- | --- | --- | --- | --- |
| census | Who is Sarah? | pass | — | Who is Sarah? |
| census | When is it? | pass | — | When is it? |
| census | What's in it? | pass | — | What is in it? |
| census | Which happened first? | pass | — | Which happened first? |
| census | What is a headache? | pass | — | What is a headache? |
| census | What is a cold? | pass | — | What is a cold? |
| census | What about the flu? | pass | — | What about the flu? |
| census | Why? | pass | — | Why? |
| census | Where are you? | pass | — | Where are you? |
| census | What is the opposite of hot? | pass | — | What is the opposite of hot? |
| census | What about coffee? | pass | — | What about coffee? |
| census | What is the exact population of Chicago at this moment? | pass | — | What is the exact population of Chicago at this moment? |
| adversarial | Sarah is a doctor. | pass | — | Sarah is a doctor. |
| adversarial | Who are you? | pass | — | Who are you? |
| adversarial | What is it? | pass | — | What is it? |
| adversarial | What is hot? | pass | — | What is hot? |
| adversarial | Coffee. | pass | — | Coffee. |
| adversarial | What about it? | pass | — | What about it? |
| control | What did she bake? | pass | — | What did she bake? |
| control | The garden is flooded. | pass | — | The garden is flooded. |
| control | She has been baking a cake. | pass | — | She has been baking a cake. |
| control | Winter is coming. | pass | — | Winter is coming. |
| control | 他去了学校。 | pass | — | 他去了学校。 |
| crashfix | Why is the garden flooded? | pass | — | Why is the garden flooded? |
| crashfix | Tell me about winter. | pass | — | Tell me about winter. |

## Notes

- "What's in it?" generates in the canonical uncontracted form ("What is in it?"); the record round-trips identically, so the rt probes pass. Contraction is a connective-layer spelling, not a meaning distinction.
- Case 12 (population of Chicago) round-trips exactly, ahead of the A3 minimum (parse-side preservation); its precision/temporal atoms join stage 5's family accounting regardless — a round trip here does not mint the feature atoms.
- The two F3 crashes were parse defects wearing generation costumes: the inverted subject was dropped at parse (both), and the imperative's verb slot was stolen by a later noun with verb synsets ("Tell me…"). Generation gained only a defensive fallback; the fixes are at parse.
- Adjacent gap observed, out of scope: possessive "has" as a main verb ("She has a cold.") still fails — "has" is classified as an auxiliary only. Not a census case; recorded for a later tranche.
