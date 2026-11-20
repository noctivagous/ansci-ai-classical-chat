# Probe-2 Slice 2 — Question-word-in-answer-slot guard (SD3)

**Date:** 2026-11-20 · **Branch:** `track/probe2-fixes` · **Base:** `a093f57` + Slice 1
**Commission:** probe-2 diagnostic programme, item 2 (owner "rec", 2026-11-20).
**Attribution:** SD3 (system design) — the diagnostic's search found no post-plan
validation anywhere: nothing between planner and generator checked that a
declarative answer's value is resolved content rather than the question word
itself. The vacuous completion in the second transcript ("The weather is
what.") was unreachable in probe #2's families only because two earlier
interceptions happened to fire first on those inputs.

## What was built

The check now stands at the one seam every answer passes, in three parts:

1. **The inspection** (`src/ansci/generate.ts`, `unsoundAnswerValue`): a
   declarative reply graph is unsound when its value slot — the root itself,
   or the target of a `predicate` / `predicated-as` / `location` / `time` /
   `contains` edge — is an unresolved question word, judged by the parse's
   own `questionWord` mark or by lemma (a composed answer graph builds its
   value node from a lemma and may not carry the mark). Interrogative graphs
   are exempt outright: a question legitimately holds its question word —
   the gap questions the Planner composes are built from them.
2. **Checked generation** (`src/ansci/plan.ts`): every answer-producing plan
   function (`planPredication`, `planComposition`, `planCorrection`,
   `planRecordPredication`, the stance predication, `planThanksReceipt`,
   `planSelfIdentity`, `planWellbeingAnswer`) now generates through
   `generateAnswer`, which throws `UnsoundAnswerError` on an unsound graph.
   The question-producing plans (`planRoleQuestion`, `planClarification`)
   keep plain `generate` — exempt by construction.
3. **The turn-level conversion** (`src/ansci/turn.ts`): the former
   `processTurnInner` body runs under one wrapper; the wrapper catches
   `UnsoundAnswerError`, recovers the turn's own trace (filled by the body
   at creation through a holder), and converts the turn into a decline
   located at the unfilled value — `trace.answerGuard = {lemma, relation,
   ground}`, a decline reason naming the unfilled value, and a plan note.
   The decline reason deliberately avoids the substrings that route
   `computeMapPath` to the correspondence graph ("in my notes", "no path
   runs", "no way to connect"), so the walk ends where the refusal
   happened. Any other error propagates untouched.

## Acceptance — stated plainly

- **The previously-shadowed case is constructed at the seam**, as the
  commission allows ("or otherwise bypassed in a test"): a plan asked to
  predicate the question word itself — the exact graph the transcript's
  build evidently composed and spoke — is refused:
  `planPredication({subject: weather, qualityLemma: "what"})` and
  `planRecordPredication({stateLemma: "what"})` both throw
  `UnsoundAnswerError`; a real quality (`cold`) composes as before.
- **No live visitor input reaches the guard on this main.** A hunt over
  candidate inputs ("i am what.", "the weather is what.", "what am i?"
  after a stated state, and others) confirms every one is intercepted
  earlier — parse rephrase, the function-word stand-down, or a graph
  decline — exactly the shadowing the diagnosis described. The guard is
  therefore enforcement for paths where those interceptions do not fire,
  verified at the seam it guards; the wrapper's conversion is exercised
  by code path (the catch is the only route an `UnsoundAnswerError` can
  take out of a turn) but has no live trigger to demonstrate against.
- **Family V: no regression.** All eight Family V inputs produce
  byte-identical replies to the pre-slice build, and `trace.answerGuard`
  is unset on every one — the guard does not misfire on shadowed paths.
  (Several Family V replies are themselves the subjects of items 4–6;
  they change there, under those items' own acceptance, not here.)

## Draft wording — OWNER'S TO SETTLE

The guard's decline reply is hand-composed text and is flagged as such in
the code: **"I can't answer that from what I know: the value that
question asks for is not something I have."** It is minimal and follows
the located-decline convention (it names the unfilled value as the gap);
the owner may reword.

## Gates (fresh complete runs, this branch)

| Gate | Result |
| --- | --- |
| Full suite | 1273 tests / 1270 pass / 0 fail / 3 skipped |
| Demo (`ansci:demo`) | 29/29 expectations met |
| Holdout (`ansci:holdout`) | 80/80 parsed, 0 parse / 0 round-trip regressions |
| Sense challenge | Set A 11/11 · Set B 6/6 |
| `ai:check` | OK (system-map 100 nodes; root page OK) |

## Files

- `src/ansci/generate.ts` — `unsoundAnswerValue` + `UnsoundAnswerValue`.
- `src/ansci/plan.ts` — `UnsoundAnswerError`, `generateAnswer`, the nine
  answer-plan call sites switched to checked generation.
- `src/ansci/turn.ts` — `trace.answerGuard`, the wrapper/body split.
- `test/ansci-probe2-slice2.test.ts` — 7 tests: inspection (sound passes,
  interrogative exempt, question-word value detected), seam refusals and
  control, Family V regression pins.
