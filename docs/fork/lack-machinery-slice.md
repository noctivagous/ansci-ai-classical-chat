# Lack machinery — build report

*One slice, three parts, commissioned by the owner 2026-11-20
("Commission all three as one slice"). Branch
`track/lack-machinery` in `~/workspace/ansci-lack-machinery`,
based on origin/main `f40fad1`. Two commits: `6c1decd`
(Parts A+B), `f57c34f` (Part C). Not pushed — waits for the
owner's word.*

The slice makes the system's lack machinery real: a problem
can now name a missing *means* (not only a missing fact), the
system holds a declared inventory of what it can actually do
to audit such a requirement against, and every declined turn
now files the problem record the first ProblemSolving slice
built but left unwired.

## Part B — the capability registry (`src/fork/capability-registry.ts`)

A data registry of operations the system can actually
perform today. Entry shape: `id`, `name`, `takes`, `returns`,
`heldBy` (the map path of the holding unit), and `code`
(module path + function names, as data). Lookup API:
`capabilityById`, `allCapabilities`, `unbuiltSeatFor` — pure
functions over the data.

Registered holdings (each verified in the codebase before
registration; the module's tests re-verify every code
pointer against the named module's source, and every
`heldBy` against the system map):

| id | held by | code |
|---|---|---|
| `quantity-ledger` | `ontology-core/ontology-knowledge-unit/mathematics/quantification-unit` | `src/fork/quantification.ts`: `currentQuantity`, `currentQuantities`, `recordStated`, `applyDelta`, `applyTransfer` |
| `lexicon-lookup` | `knowledge/lexicon` | `src/wordnet.ts`: `synsetsForSurface`, `synsetsForLemma` |
| `graph-path-walk` | `ontology-core/ontology-knowledge-unit/correspondence-graph` | `src/graph.ts`: `Graph.findPath` |
| `classification-lookup` | `ontology-core/ontology-knowledge-unit/classification` | `src/fork/classify.ts`: `lookupClassification`, `classificationsOf` |
| `token-resolution` | `lpu/parser/token` | `src/fork/token-resolve.ts`: `resolveTokenList` (the SymSpell port, `src/fork/symspell.ts`, is its engine) |
| `sense-selection` | `lpu/parser/sense` | `src/fork/lesk.ts`: `leskSenseScores`, `leskCandidateScores` |
| `wikidata-lookup` | `intake/wikidata` | `src/fork/wikidata-client.ts`: `HttpWikidataSource.getEntities`, `HttpWikidataSource.searchEntities` |

All six commissioned candidates verified and registered;
none rejected. Notes on two: the quantity ledger's
*answering* surface (`answerHowMany`) is a turn-internal
function, so the entry registers the ledger itself, which
is the callable operation; token resolution is registered
at `resolveTokenList`, the operation the turn calls, with
the SymSpell port named as its engine rather than as a
separate holding.

Placeholder seats are explicitly **not** holdings. The
Functions families (`ordering-and-sorting`, `search`,
`editing`, `external-query`, `file-system`) and the
Geometry Unit are listed separately as
`UNBUILT_CAPABILITY_SEATS` — named so a lack can be
*located* at a seat, never registered as an ability.

## Part A — capability need kind + the audit

- `capability` joins the need registry in
  `src/fork/problem-records.ts` as the fourth kind
  (standing: registered), following the existing pattern:
  id, gloss, standing. Its gloss states how it closes:
  the step proceeds when the audit finds the operation
  held; a seat-exists-unbuilt or no-seat audit leaves the
  lack standing, located or unlocated respectively.
- `ProblemRecord` and `OpenProblemInput` gain an optional
  `capability` field naming the required operation by
  registry id.
- The audit, `auditCapability(requirement)` in
  `capability-registry.ts`, is pure — it consults only the
  registry data, performs no I/O, and calls no operation.
  It returns a typed verdict (`held` /
  `seat-exists-unbuilt` / `no-seat`), the entry or seat it
  rests on, and the **checked list**: what was checked, in
  order (registry first, then unbuilt seats). The checked
  list is part of the result — it is the material a
  failure account is assembled from.

## Part C — the decline wiring (`src/fork/turn.ts`)

One call site: the end of `processTurn`'s wrapper, after
`computeMapPath` — the single point every turn passes
through exactly once after its outcome is decided. When
the completed turn's trace carries a `declineReason` (the
turn's own decline signal — the same one
`applyInitiative`'s gate reads), the wrapper calls
`registerDecline(session, { ground: trace.declineReason,
derivationPath: trace.mapPath.join(" → ") },
session.turnCount)`.

Judgment calls, stated:

- **The signal.** Declines are produced at many sites
  inside `processTurnInner`; the wrapper + `declineReason`
  is the one place they all converge, and it is the
  codebase's own convention for "this turn declined".
  Segmented and clarification-fallback turns compose
  inside the inner function, so the wrapper sees the
  turn's final outcome, not a segment's.
- **The location.** `DeclineRecordLike.derivationPath`
  is filled with the turn's map path — the route the
  information ball took, ending where it stopped. The
  PlanOutcome's own derivation path exists only inside
  the inner function's local outcomes and is not carried
  on the trace; the map path is the location the turn
  itself computes and publishes.
- **The capability kind is not filed from the wiring.**
  No decline the turn produces mechanically names a
  missing operation rather than missing knowledge in its
  data — decline grounds name knowledge gaps, parse
  failures, and support shortfalls. Inventing a text
  classifier to split them would fabricate the
  distinction, so every wired decline files under
  `lack-of-information` (ruling 6a), and capability needs
  are filed by a step's audit when the walk exists.
- **The wikidata wrapper is second-order.** It reads the
  same `declineReason` after `processTurn` returns and
  may answer by consultation or restate the decline as
  lookup-unavailable. The record filed here stands for
  the turn's own priced decline, which is what the
  register keeps (design §4); the wrapper's outcomes ride
  its own trace fields, as before.

The wiring is purely additive: one import and one filing
block in the wrapper; no reply text, pricing, steering,
or answering logic changes. `problem-records.ts`'s header
and `registerDecline`'s doc were brought up to date in the
same commit (they said, of the first slice, that nothing
called them from the turn).

## Tests

- `test/fork-capability-registry.test.ts` (new, 8 tests):
  registry contents exact; every code pointer verified
  against the named module's source; every holder/seat
  path verified as a map node; no placeholder seat
  registered; the three audit verdicts with their checked
  lists; the capability kind and a record filed under it.
- `test/fork-decline-register-wiring.test.ts` (new,
  5 tests): a declined turn files exactly one record at
  its location with the decline's ground as subject; the
  decline's reply is byte-identical to the standing text;
  an answered turn and an ask-back turn file nothing;
  declines accumulate across a session with correct ids
  and turns.
- **One existing test updated, disclosed:** 
  `test/fork-problem-records.test.ts`'s need-registry
  contents pin asserted exactly three kinds; Part A
  extends that registry to four by commission, so the pin
  (list, title, and a standing assertion for the new kind)
  was updated to the new contents. No other existing test
  was edited, and no test was weakened.

## Gates

Run at the branch head (after both build commits):

- `npm run ai:check` — green: 100 nodes (80 directories),
  22 cords; root page carries all 97 percented nodes.
  Unchanged, as expected — this slice touches no map data.
- `npm run typecheck` — clean.
- Full suite (`npm test`) — **1258 tests: 1255 pass /
  0 fail / 3 skipped**. Baseline on main was 1245 tests
  (1242 pass / 0 fail / 3 skipped); the delta is exactly
  this slice's 13 new tests. No existing test failed; one
  existing assertion was updated by commission (the
  registry contents pin, disclosed above).
- Transcript probe (`npm run fork:transcript`, 4
  scenarios / 11 turns): the regenerated sample differs
  from the committed one — and the identical diff (6
  insertions, 8 deletions, byte-identical) reproduces on
  a pristine checkout of origin/main `f40fad1`, so the
  drift is pre-existing on main (the acknowledgement move
  landed after the sample was last regenerated), not an
  effect of this slice. Part C's replies are exactly
  main's. The regenerated file was **not** taken into
  this branch — the staleness belongs to the programme
  that landed the move, not to this slice.
- The tier scripts (`test:t0` … `test:programmes`)
  partition the same suite and were covered by the full
  run; the holdout/sealed batteries evaluate knowledge
  changes, of which this slice makes none.

## What this slice does not do

No approach walking, no loop budget, no ErrorFailure
filing — the audit's checked list is the material those
will consume. No map percent changes: ProblemSolving
stays a placeholder seat; the wiring is one call site,
not the unit built. The registry will need a registration
discipline as operations are built (an entry lands with
the operation it names, verified the same way these were).
