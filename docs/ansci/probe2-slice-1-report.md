# Probe-2 Slice 1 — structural question detection

**Date:** 2026-11-20 · **Branch:** track/probe2-fixes · **Base:** a093f57
**Diagnosis:** SD1 (diagnostic probe #2 report) · **Ruling:** the owner's — questions without "?" should be detected.

## What was built

Interrogative mood is now one layer decision, taken in `parseEn`
(parse.ts) at the single call site every parse branch inherits:

- A new exported helper, `structuralQuestionOnset(tokens)`, reads the
  sentence's FORM over the *resolved* token stream: a question-word
  onset (wh-fronting — what/who/where/when/which/how/why/whose/whom),
  or a sentence-initial auxiliary / copula / modal — subject–aux
  inversion, the form an English yes/no or do-support question takes.
  Discourse openers (",", and, but, so, well) are skipped as
  scaffolding when the onset is read.
- `parseEn` OR-s the tokeniser's punctuation flag with the structural
  signal (`formInterrogative`) and passes that to every parse attempt.
  The per-branch accident — wh-branches hard-coding interrogative, the
  rest inheriting the "?" flag — is thereby closed at the source: the
  branches still set mood from the one flag they are handed, and the
  flag is now the layer's decision, not the punctuation's.
- The tag-question strip (IMP-2) keeps the punctuation flag alone: a
  tag is defined by its mark, and its stripped reading is attempted as
  the statement it is. Tag questions remain statements (pinned).

Statements are untouched by construction and by test: a declarative
opens with its subject, not an auxiliary or a question word, so
"i am in oklahoma." and "i am in oklahoma" (no mark at all) both bank
as statements, as do "the dog is black." and "you are fine".

## Acceptance (probe #2, Family Q + S5 + T8)

- Q4 "how are you" → "I am fine.", identical to its "?" twin (was:
  "Ok. Noted.", banked as a statement).
- Q5 "do you know my name" → "No. You have not told me your name.",
  identical to its twin (was: "Ok. Noted.").
- Q1–Q3, Q6 pairs were identical before and are identical now.
- S5 class — "is it raining", "can you hear me", "how is the weather"
  without "?" — all take the question path and match their "?" twins;
  none is acknowledged as a statement.
- T8 "how are you>" also answers "I am fine." already at this slice
  (the onset is structural and the matcher corrects `you>`); Slice 3
  makes the tokeniser side principled.
- Pinned in `test/ansci-probe2-slice1.test.ts` (8 tests), every
  expectation verified against this tree's build before pinning.

## Gates (fresh complete runs; baseline reproduced first on unmodified a093f57)

Baseline: suite 1258 tests / 1255 pass / 0 fail / 3 skipped · demo 29/29 ·
holdout 80/80 parsed, 0 regressions · sense A 11/11 · B 6/6 · ai:check OK.

After Slice 1: suite **1266 tests / 1263 pass / 0 fail / 3 skipped**
(+8, the slice's tests) · demo **29/29** · holdout **80/80 parsed,
0 parse / 0 round-trip regressions** · sense **A 11/11 · B 6/6**
(unchanged) · ai:check **OK** (system-map 100 nodes; root page OK).

## Notes

- One behaviour beyond the commissioned families, observed and left
  standing: literary conditional inversion ("had i known, i would
  have left.") now takes the interrogative onset ("had" is an
  auxiliary onset) and declines on its content rather than parsing as
  a conditional statement. No suite case pins the old reading; the
  construction is rare in visitor text and its decline is located and
  honest. Recorded here rather than silently accepted.
- No visitor-facing wording was introduced or changed by this slice.
