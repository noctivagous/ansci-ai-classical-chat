# Slice D batch 1 — build report (2026-11-18)

What was done, what the delivered runs show, and what they do
not show. Batch 1's proposals, the owner's rulings, and the
review outcome are recorded in docs/fork/slice-d-batch-1.md;
this report covers the build that followed the ratification.

## What was built

- **src/fork/overlay.ts (new)** — the overlay partition: 29
  entries (the 25 clean proposals as ratified + camphor, coal,
  saltpeter, flu), each carrying element, aspect, confidence
  (capped at 0.80; fire sits at the cap on the owner's ruling),
  provenance "overlay", reviewer, and its recorded rationale.
  `lookupOverlay` mirrors the table's lookup shape (aspect
  match wins, else the concept's primary entry).
- **src/fork/join.ts** — deriveSentence consults the overlay
  LAST, for meaning nodes no earlier route classified (table
  derivation, semantic-address/climb route). An overlay node
  inherits its element's correspondence row at the entry's
  confidence, provenance "overlay". A sub-gate entry (lacquer,
  resin, camphor, coal at 0.45) is recorded as a gated
  derivation and yields no conclusions — the pilot's honest
  grades, not inflated to clear the gate. The Derivation
  classification provenance union gains "overlay".
- **src/fork/pricing.ts** — tierOfProvenance maps "overlay" to
  the derived tier (ruling 2a).
- **test/fork-overlay.test.ts (new)** — 7 tests: the batch as
  ratified (29 entries, cap, reviewer + rationale on every
  entry; the 4 accepted contested items present, the 6
  abstentions absent); the derived tier; flu's illness aspect;
  a sentence-level join (quartz → Earth, provenance "overlay",
  row inherited at 0.60); a sub-gate record (lacquer gated, no
  conclusions); a table word in the same sentence keeping its
  own provenance; and the eligibility invariant below.

## The fill-only law, as enforced

Fill-only (ruling 3a) is enforced two ways. In the join, the
overlay pass runs after every other route and skips any node
already classified. In the test suite, an invariant runs over
the entries themselves: every overlay concept must be one the
curated table does not own AND the climb does not classify. If
a future table or climb addition starts speaking for one of
these words, that test fails and the entry's retirement is
forced — precedence is maintained by the suite, not by memory.

Boundaries, stated: the overlay does not enter sense
arbitration (its candidate set is unchanged: table + climb),
and derive() — the graph-driven single-concept read — does not
consult it; the sentence join is where unclassified words
arrive. The turn trace's classification list still records
table hits only; overlay classifications surface through the
derivations they produce.

## Gates (delivered runs, this tree)

- Suite: **724 pass, 0 fail** (727 counted; +7 over Slice C's
  tree, all new overlay tests).
- Demo: **29/29** expectations, 27 exact round-trips.
- Holdout: **80/80 parsed**, no parse regressions. Mean
  classifications rose slightly (ON arm 0.40 → 0.41; sentences
  both arms parse 0.46 → 0.48) — overlay words now classify in
  holdout sentences; docs/fork/holdout-run.md regenerated.
- Sense sets: **A 11/11 · B 6/6**, unchanged.
- ai:check: OK (82 nodes).

## What this does not show

- The batch's blind-sample error bar was never run: the owner
  had the sample explained instead (recorded in the batch
  document). Batch 1's quality evidence is the explained
  spot-check and the owner's item rulings, not a blind audit.
- Overlay entries are lemma-level: a word's unmeant senses
  (cinnabar's moth, ear's corn) inherit the entry wherever no
  rival candidate exists for arbitration to prefer. Batch 1's
  document records this; nothing in the build removes it.
- Nobody independent has checked any of this; all gates are
  the project's own suite.

## State

Local commit on track/slice-b-design, stacked on Slice C's.
NOT PUSHED — the batch awaits its own push word, like Slices
A, B, and C. Batch 2 is drawn from the remaining population
(~190 tokens with no defensible per-word rationale recorded
in the batch document, plus whatever the post-merge
re-measurement shows) when the owner commissions it.
