# Entity ranking — report

**Date:** 2026-11-19 · **Branch:** track/lesk-and-entity-ranking · **Scope:** Part 2 of the ranking build. Local commit only; nothing pushed.

## What was built

**src/ansci/entity-rank.ts** (new) — a standalone, deterministic ranker for entity resolution, placed beside its sibling scorer (lesk.ts) in src/ansci/, where the Wikidata intake's code lives and will consume it (the intake's schematic home is ai-system/intake/wikidata; design §3.6 makes the adapter *propose* bridges with nothing joined silently — this ranker is the proposal orderer). Interface:

```
rankEntities(candidates, { mention, contextText, expectedKind? })
  → per-candidate breakdowns, best first:
    { total, type {score, kind, verdict, rule}, prominence {score, sitelinks}, overlap {score, words} }
```

Candidate shape (as commissioned): `{ id, label, description, sitelinks, instanceOf[] }`. The ranker depends on nothing from the parallel Wikidata branch.

**The three signals and their weights** (chosen a priori, before any evaluation data was seen, and not tuned afterwards):

1. **Type agreement — ±3.** The candidate's kind (place / person / organisation / work / organism / thing) is classified from its instance-of labels first, then its description, by a small rule table; within a text the *longest* matching needle wins (specificity before rule order — "human settlement" contains "human" but is a place; a first-match scan got this wrong in development and the fix is pinned by a test). Match +3, confident mismatch −3, unclassifiable 0, no expectation → signal abstains. Strongest weight because it is the only signal that can be flatly wrong about a candidate.
2. **Prominence — 0 to +2.** log1p(sitelink count), normalised by the candidate list's maximum. The prior's role, as in Lesk: orders near-equals, cannot overwhelm evidence (its whole range is worth two overlap words).
3. **Context overlap — +1 per word.** Word overlap between the candidate's description and the context text, computed by lesk.ts's `wordOverlap` — the one overlap implementation in the system, reused, not duplicated. The hitting words are returned in the breakdown (reported stemmed; the tokeniser stems both sides identically).

Ties keep the incoming (search) order. Every score decomposes into named facts — this system shows its work.

## The evaluation — INCOMPLETE, stated plainly

The commissioned evaluation (≥24 ambiguous-name cases with live-recorded Wikidata candidates) **could not be completed in this build session**, and this report does not pretend otherwise:

- The recorder (scripts/ansci-entity-fixtures-record.mjs) ran live on 2026-11-19. Two mentions were recorded (Springfield — full 8-candidate search list; Cambridge — expected item verified). On the third mention's wbgetentities call, **Wikidata answered HTTP 429 (rate limit)**. A 429 is a hard stop for the provider: no retries, no alternate endpoint. Recording ceased there.
- Salvaged honestly: the two Springfield candidate lists had already been returned verbatim (ids, labels, descriptions, search order) and are recorded in test/fixtures/entity-ranking-cases.json, with a `recordedNote` in the fixture itself stating what is missing: **sitelink counts and instance-of labels were never recorded for these candidates** (sitelinks recorded as 0, instanceOf as []), so in this record the prominence signal is inert and type classification runs on descriptions alone.
- The remaining 24 planned cases (Cambridge ×2, Washington ×3, Victoria ×2, Reading, Jordan ×3, Lincoln ×2, Mercury ×3, Apple ×2, Java ×2, Amazon ×2, Turkey ×2 — the full list is in the recorder) were **not recorded**. The recorder stands ready; its two known-bad expected-description substrings were corrected from the real returned descriptions. Re-running it when the provider permits completes the evaluation without any code change.

**What the partial record shows** (scripts/ansci-entity-eval.mjs, offline, reproducible):

| Case | Baseline (search order) | Ranker |
|---|---|---|
| Springfield — "Where is Springfield, the capital of Illinois?" (expected Q28515, search position 3) | Q2369961 (a Chelmsford suburb) — wrong | **Q28515** — type match (+3, "city") + overlap *capital, illinoi(s)* (+2) |
| Springfield — "He drove through Springfield, Missouri on the highway." (expected Q135615, search position 7) | Q2369961 — wrong | **Q135615** — type match (+3) + overlap *missouri* (+1) |

**Top-1 on the recorded partial set: ranker 2/2 · baseline 0/2.** Two cases prove the mechanism discriminates on real search data; they do not establish the commissioned accuracy claim, and no wider claim is made. In particular, the prominence signal and instance-of type classification have **no recorded-data evaluation at all** — they are exercised only by the synthetic unit tests (test/ansci-entity-rank.test.ts, 7 tests, hand-built lists labelled as such).

## Files

New: src/ansci/entity-rank.ts · test/ansci-entity-rank.test.ts · test/fixtures/entity-ranking-cases.json (partial record, see above) · scripts/ansci-entity-eval.mjs · scripts/ansci-entity-fixtures-record.mjs (dev-time recorder; the only network-touching script, never run by tests).

## What remains outstanding

1. **Re-run the recorder** when Wikidata permits, completing the 26-case fixture with sitelinks and instance-of labels; re-run the evaluation and amend this report with the full top-1 figures (ranker vs baseline), per signal.
2. The expectedKind currently arrives as a caller-supplied kind; wiring question shapes (where→place, who→person) and grounded-synset types to it belongs to the Wikidata intake build that consumes this module.
