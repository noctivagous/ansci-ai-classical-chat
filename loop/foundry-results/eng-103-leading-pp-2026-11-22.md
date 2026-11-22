# ENG-103: introductory prepositional phrase handling — 2026-11-22

Status: implemented; v2 regression clean, v3 suite green, t0/core green.
Full `npm test` was running at handoff; confirm it before closing the task.

## Problem

A sentence-initial adjunct PP defeated the subject chunker, so the
clause parsed subjectless and dropped both the agent and the adjunct:

- "In the morning, the dog bit the man." → bite/man only (dog dropped, morning dropped)
- "In New York the dog bit the man." → bite/man only (dog and New York dropped)
- "On the mat sat the cat." → sit/cat only (mat dropped)

Reproduced via the real turn path (`foundry evaluate` on a probe
suite): agent role and adjunct attachment checks failed; root, tense
and patient were correct. Cause is structural, not lexical: `enChunk`
fails on a leading preposition, `subj` stays undefined, and the main
verbal path only reads material from the verb onward.

## Change (`src/ansci/parse.ts`)

- `enLeadingPPs`: claims one or more prep + chunk phrases at the
  content start (each with an optional comma); only `EN_PREP`
  prepositions. `enLeadingPPSlot`: verb prep-slot, "to" as goal,
  else location with the post-verbal temporal resolution.
- Main verbal path: clause built from the strip end; adjuncts attach
  to the root with the post-verbal slot rule (same graph shape as the
  unfronted sentence, per R3). The pre-verbal adverb scan skips only
  the stripped ranges. Topic-fronting detection now starts at the
  strip end.
- Copular predicate branch: same strip; adjuncts attach as subject
  modifiers (amendment-A3 tail-PP idiom). Existential branch: same
  strip before 'there'; adjuncts attach to the presented theme.
- Out of scope (documented in code): adverb-led openers
  ("After dinner, she left." — 'after' classifies as an adverb, and
  claiming it collides with subordinate clauses such as
  "After she left, we ate."); PP-led wh-questions.

## Evidence

- Before: `eng-103-before-2026-11-22.json` — v2 suite on clean tree,
  17/17 pass.
- After (same fixture): `eng-103-after-2026-11-22.json` — 17/17 pass;
  `compare` before→after: 0 gains, 0 regressions, 0 incomparable.
- Probe (pre-fix: 3/3 fail): all pass post-fix.
- Suite v3 (`english-development.json` version 3, three new
  `pp-leading-*` cases): `eng-103-v3-2026-11-22.json` — 15 cases,
  20 turns, all pass.
- Tiers: t0 71/71, core 249/249.
- Parity: "in the morning / on the mat" attach as `location` in both
  leading and trailing position ('morning' carries no season/time
  ontology class, so no `time` slot either way).

## Next

Confirm the full `npm test` result, then mark ENG-103 done. Follow-up
candidate: adverb-led temporal openers (after/before/during) with a
subordinate-clause guard.
