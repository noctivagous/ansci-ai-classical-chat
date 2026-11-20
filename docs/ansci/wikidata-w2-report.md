# Slice W2 — Wikidata lookup + banking + answering: report (2026-11-19)

Built in the wikidata track's worktree (branch
`track/wikidata-adapter`, on W1's `baf0d14`). **Local only —
not pushed, not merged, no other worktree touched.** The
design record is `docs/ansci/wikidata-adapter-plan.md`; W1's
report is `docs/ansci/wikidata-w1-report.md`.

## Slice 0 re-base — REMAINING WORK (flagged, per the commission)

Slice 0 (entity grounding) has **not** landed on
`track/transcript-fixes` (its head is still the `76996ae`
base), so W2 was built, per the commission's fallback, against
the name-resolution the current main affords: the turn layer's
nameable-subject path (`nameableQuestionSubject`,
`src/ansci/turn.ts`) and the located knowledge-decline sites.
**Re-basing W2 onto Slice 0's grounding, when it lands, is
remaining work** — the lookup trigger currently keys on the
decline sites named below, and a grounding-based subject
resolution would replace the wrapper's surface-shape subject
extraction for the consumer shapes.

## Banking — store choice and justification

W1's translator output lands in a **dedicated banked store**,
`src/ansci/wikidata-bank.ts` (`WikidataBank`; the process-level
`defaultWikidataBank` is the instance the turn layer reads),
following `ingested.ts`'s separate-store reasoning: retrieved
facts have a different provenance and epistemic status from
the hand-governed classification table and from the seed's
correspondence graph — they are what a named external dataset
said — so they live behind their own accessors rather than
being merged into either. The plan's graph representation is
kept as a **mirror**, not a second authority:
`mirrorBankIntoGraph` writes the bank into the session graph's
base partition — Concept nodes at layer `"base"` carrying QID,
lat/lon and `neverPropagationAnchor` in their properties, one
source node per subject QID linked by `SOURCED_FROM`, and the
associations as edges at confidence 0.9 with retrieved
provenance in the edge properties. For that mirror,
`CAPITAL_OF` and `LOCATED_IN` were added to `src/graph.ts`'s
`EdgeType` union (W1's flagged item).

Banked records carry, as required: retrieved-kind provenance
with the SourceRecord (dataset `"wikidata"`, uri = subject
QID, baseVersion = fetch date, retrievedFrom = endpoint or
"fixture"), confidence **0.9**, and
`neverPropagationAnchor: true` on every node and association,
preserved in the graph mirror's properties. **Banking is
idempotent** — associations keyed by (fromQid, type, toQid,
property), nodes by QID; re-banking returns added-counts of 0
(pinned by test). **Persistence: the bank is process-level —
it persists across sessions within a process (a fresh session
answers from it with no fetch, proven below), and it is NOT
file-backed, so it does not persist across process restarts.**
No persistence beyond that is claimed.

## The lookup trigger

`processTurn` is synchronous and every caller in the repo
depends on that; a live lookup is async. The trigger
therefore lives in an **async wrapper**,
`src/ansci/wikidata-turn.ts` (`processTurnWithWikidata`), with
a driver in fork-chat's pattern at
`scripts/ansci-wikidata-chat.mjs`. The ordinary `processTurn`
is unchanged in behaviour (one additive trace field,
`trace.wikidata`, and the `intake/wikidata` node in its
map-path when that field is set).

Per turn, the wrapper:

1. Runs the ordinary turn.
2. **Bank first:** for a first-consumer shape whose answer
   the bank holds, the reply is re-answered from the bank —
   **no fetch** — with `trace.wikidata.action =
   "answered-from-bank"` and the retrieved provenance
   (dataset + QID) in the record.
3. **Trigger:** else, where the turn ended in the located
   knowledge decline for a nameable subject — the IMP-2
   fallthrough ("I have nothing on X in what I know"), the
   tell/posed-matter decline, or `answerPredicateQuestion`'s
   "nothing on X in my notes" — the name is resolved via
   `wbsearchentities`: the **first exact-label hit in search
   rank** is the candidate (rank is the search's relevance
   judgement among exact-label bearers — live evidence below:
   "Texas" is also a Scottish band, Q916484), gated by W1's
   join proposal (status `"proposed"`, `conflict: false`).
   On resolution the item is fetched, translated, banked,
   mirrored into the session graph, and the question is
   **re-answered from the bank as the same turn's reply**,
   `action = "looked-up-and-banked"`. The prior decline is
   kept in the record for audit.
   - **Extension, recorded:** the capital shape's first asking
     does not reach a knowledge decline — it ends at
     `answerPredicateQuestion`'s unanchored-definite exit
     ("What capital?"), because "the capital" presupposes a
     referent. That exit is a trigger for the capital shape
     too; without it the capital consumer could never bank on
     a first asking.
4. **Offline honesty:** a `{status:"unavailable"}` from
   search or fetch produces the lookup-unavailable decline —
   *"I could not look up X — the lookup was unavailable, so I
   can't say whether anything is held on it"* — worded as a
   lookup failure, never as absence, with
   `action = "lookup-unavailable"` in the trace. A conflicted
   join proposal or no exact resolution banks nothing and
   leaves the ordinary located knowledge decline standing,
   with the ambiguity in `trace.wikidata`
   (`"lookup-ambiguous"` / `"lookup-no-resolution"`).

**No masquerade (§3.5):** banked answers are plain statements
of fact carrying their source — e.g. `Oklahoma City is the
capital of Oklahoma. (From Wikidata, Q1649.)` — and the trace
records no derivation path, cycle path or pricing for them.

**Fetch discipline (a live-run lesson, fixed):** references
are fetched only for endpoints a *mapped edge* names, in
chunks of ≤50 ids. The Action API refuses larger
`wbgetentities` requests and its error shape parses as zero
items; the first live run (below) banked QID-named endpoints
for exactly this reason. A regression test with a stub that
mimics the 50-id refusal pins the chunking offline.

## Consumer coverage

| Shape | Coverage | Evidence |
| :--- | :--- | :--- |
| "where is X?" | **Full** (offline); live partial — see acceptance | LOCATED_IN chain from the bank (Oklahoma → United States), with the WordNet gloss level beside it where the join supplied one ("a state in south central United States") |
| "what is the capital of X?" | **Full** (offline); live bank-answer demonstrated pre-fix with the QID-name defect | CAPITAL_OF from the bank (Oklahoma City / Austin) |
| "what country is X in?" | **Full** (offline); live not demonstrated (429, below) | LOCATED_IN to a country, P17 preferred, chain followed otherwise |

Each consumer also triggers the lookup on a first asking
(capital via the unanchored-definite extension, country via
the predicate decline) — pinned by test.

**Ambiguity at the turn level** is tested through W1's
injectable candidate finder (two rival synsets → conflicted
proposal → nothing banked, ordinary decline stands), because
Mercury itself cannot carry a turn-level test: the fork's
classification table already holds 'mercury', so a Mercury
turn never ends in the knowledge decline that is the trigger.
Mercury's proposal-level conflict remains pinned by W1's
tests.

## Live acceptance — PARTIAL, stopped by HTTP 429

Run with the real client via `scripts/ansci-wikidata-chat.mjs`
(fetch counter in the driver), before the chunking fix:

- "Where is Oklahoma?" — fetch #1 `searchEntities("Oklahoma")`
  resolved **Q1649** (first exact-label hit; join proposal
  unconflicted); fetch #2 `getEntities(Q1649)`; fetch #3 the
  references call with ~180 ids, which the API answered with
  its error shape (the >50-id refusal), so only **1 node and
  5 associations banked, endpoints under raw QIDs**. The where
  answer therefore failed (`lookup-no-resolution`) and the
  repeat re-fetched — the defect the chunking fix addresses.
- "What is the capital of Oklahoma?" — **0 fetches**,
  answered from the bank: *"Q34863 is the capital of
  Oklahoma. (From Wikidata, Q1649.)"* — the bank-first
  no-fetch path proven live, with the QID-name defect visible
  in the capital's name.
- Subsequent calls (fresh-session Oklahoma, Texas ×2) met
  **HTTP 429** from wikidata.org. The replies were the
  designed lookup-unavailable declines (the offline-honesty
  path, firing live). **Per the rate-limit rule a 429 is a
  hard stop for the provider in this task: no further live
  calls were made.** Texas live banking, the fresh-session
  live repeat, and the corrected chunking path are therefore
  **not live-verified**; they are verified offline (fixtures
  + the 50-id stub). Re-running the driver in a later session
  is the remaining live-acceptance step.

Offline, the full acceptance sequence passes against
fixtures with a counting source: first asking fetches, banks
and answers; second asking in the same session and in a
fresh session performs **zero** fetches (`answered-from-bank`);
Texas Q1439 banks and answers the same way (capital Austin).

## Tests (offline, fixtures only)

`test/ansci-wikidata-w2.test.ts` — 10 tests: first-asking
fetch+bank+answer; second-asking no-fetch (fetch counter),
same and fresh session; idempotent re-bank (store and graph
mirror); graph-mirror shape (base partition, SOURCED_FROM,
never-anchor, 0.9, retrieved provenance); unavailable-client
decline wording; ambiguous-name decline (conflicted join);
capital + country consumers from the bank (no fetch);
capital + country first-asking triggers; the ≤50-id chunking
regression; non-consumer turns untouched. New fixtures
recorded live 2026-11-19 and committed with the fixture
README updated: `texas-wbsearchentities.json`,
`mercury-wbsearchentities.json` (both untrimmed, limit 3).

## Gates (fresh complete runs, figures verbatim)

- `npm test` — ℹ tests 1078 · ℹ pass 1075 · ℹ fail 0 ·
  ℹ skipped 3 · ℹ cancelled 0 · ℹ todo 0
  (W1: 1068/1065 — the +10 are W2's tests)
- `npm run ansci:demo` — "demo/wuxing-parser: 29/29 expectations
  met · 29 parsed · 27 exact round-trips"
- `npm run ansci:holdout` — "ON: parsed 80/80 (100.0%), exact 29,
  mean classifications 0.47"; "flipped fail->success: 26; parse
  regressions: 0; round-trip regressions: 0" (OFF: parsed 54/80)
- `npm run ansci:sense` — "Set A: coherence **11/11** vs
  isolated-climb baseline **3/11**"; "Set B (sealed, single run):
  coherence **5/6** vs baseline **3/6**"
- `npm run ai:check` — "system-map check OK: 89 nodes (69
  directories), 22 cords, 1 trace(s); layout covers 89 nodes."
  (The `intake/wikidata` entry and placeholder were updated to
  65% with the W2 modules named.)

## What remains

- **Slice 0 re-base** (flagged above): re-key the trigger and
  subject extraction on Slice 0's entity grounding when it
  lands on `track/transcript-fixes`.
- **Live acceptance completion:** re-run
  `scripts/ansci-wikidata-chat.mjs` in a later session (after
  the 429 window) to verify Texas Q1439 live, the fresh-session
  live repeat at zero fetches, and the chunking fix against
  the real API.
- **W3** — place end-to-end: hemisphere/latitude band computed
  from banked coordinates (§8.10), climate where classified,
  coordinate-less places flagged incomplete; SA-TONIGHT in its
  computed form.
- Known limits of this slice, stated plainly: the bank is
  process-level only (no file backing); resolution trusts
  search rank among exact-label bearers, gated by the join
  proposal; consumer detection is the three commissioned
  surface shapes, not a general question grammar; the ordinary
  synchronous `processTurn` (the dashboard, the transcript
  runners) does not look anything up — only the wrapper does.
