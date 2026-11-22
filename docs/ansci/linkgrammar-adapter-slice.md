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

## Gate (step 3): `scripts/ansci-linkgrammar-adapter-gate.mjs`

Measures all 56 turns of the 8 English Foundry fixtures against
`roles`/`forbiddenRoles` ground truth, the MASC role mapping
(A0→agent, A1→patient-family), and AnSci's own graph. Verdicts:
CORRECT (ground truth), AGREE (parser-compatible edge),
DIVERGE (parser gave the family elsewhere), NOVEL (both
silent), ABSTAIN (no candidate), UNMAPPED (no predicate node
to anchor to: existentials, copular-question restructuring).
Gate rule: PASS iff errors == 0; abstentions tolerated.

Measured 2026-11-22: PASS — 63 candidates, 37 CORRECT,
17 AGREE, 0 ERROR, 0 DIVERGE, 3 NOVEL, 6 UNMAPPED,
20 abstentions (3 recovered, 0 failed). Coverage: 13
interrogatives, 5 passives (all abstain by the MVp/by guard),
17 actives, inversion ("On the mat sat the cat" abstains, as
the F1 brief requires), introductory phrases, 3 MASC cases.
Refinements driven by the gate: passive suppression narrowed
from any-MVp to MVp-into-"by" (active "prepares people for"
keeps its A0 agent); verb-unmapped vs argument-unmapped split
into UNMAPPED vs NOVEL ("Who opened the door" surfaces a
patient the parser never noded).

## Non-goals (routing comes next)

- The adapter is not wired into `parse.ts`: the positional
  parser, the shadow solver, and F1 routing are untouched.
  Routing the proven slice into chat is step 4 of the goal and
  waits on this gate, which it now has.
- Intransitive subjects abstain (no O-link on the verb), as do
  copular S-subjects and all recovered parses. Widening any of
  these needs a measured gate, not optimism.
