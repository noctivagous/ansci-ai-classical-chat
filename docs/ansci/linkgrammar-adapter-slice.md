# Link Grammar syntax adapter slice — design brief

Status: BUILT 2026-11-22. `src/ansci/linkgrammar-adapter.ts`
adapts the first WASM linkage (`src/ansci/linkgrammar-wasm.ts`)
to candidate syntax relationships over the parser's own tokens.
Pinned by `test/ansci-linkgrammar-adapter.test.ts` (6 tests).

## What it does

- ALIGNMENT: linkage words (subscripted, wall-bracketed,
  guess-marked, lowercased) walk the caller's surface-case
  tokens with a greedy monotonic match. LEFT/RIGHT-WALL never
  align; punctuation may be skipped on either side; up to two
  caller tokens join one linkage word (AnSci-side contraction
  splits). Every linkage word records a token index or -1.
- CANDIDATES (complete linkages only, nullCount 0): an S-family
  link with exactly one verb side proposes `agent`; an O-family
  link with exactly one verb side proposes `patient`. Connector
  labels ride along untouched (`Ss`, `Ox`, `Osn`, `Op`), so
  later routing can split indirect objects from direct ones.
  Agent candidates additionally require the verb to carry an
  O-family link and require no MVp link anywhere (a passive
  S-subject is a patient, never an agent).
- RECOVERED linkages (nullCount > 0) contribute aligned links
  as evidence but no role candidates. Failure (no linkage at
  all, module error) resolves to `{ status: "failed", error }`
  and never throws.

## Non-goals (gate work comes next)

- The adapter is not wired into `parse.ts`: the positional
  parser, the shadow solver, and F1 routing are untouched. The
  Foundry comparison harness (step 3 of the goal) measures
  correct assignments, errors, and abstentions before any
  routing into chat.
- Intransitive subjects abstain (no O-link on the verb), as do
  copular S-subjects and all recovered parses. Widening any of
  these needs a measured gate, not optimism.
