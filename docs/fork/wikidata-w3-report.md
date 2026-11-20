# Slice W3 — Wikidata place associations: report (2026-11-19)

Built in the wikidata track's worktree (branch
`track/wikidata-adapter`, on W2's `755f843`). **Local only —
not pushed, not merged, no other worktree touched.** The
design record is `docs/fork/wikidata-adapter-plan.md`; the
contract is design §3.6 (the place-association requirement)
under §§3.4–3.5, with the computation of §8.10 and the
location-aspect taxonomy of §8.11.

**No live Wikidata call was made in this slice.** W2's live
acceptance met HTTP 429 from wikidata.org, which is a hard
stop for that provider in this programme; W3 honoured it.
The Sydney fixture is therefore **hand-shaped** (below),
exactly as the fixture README's live-recorded vs hand-shaped
distinction requires it to be labelled.

## The shared §8.10 computation — where it lives, who calls it

Before W3, `src/situation.ts` held the hemisphere and latitude
band rules inline inside `computeSituation`, and the §8.10b
solar night-proportion computation did not exist in code at
all (the module header said it "arrives with the knowledge
base in slice 2f"). W3 factored the computation into shared,
exported primitives in that same module — **one
implementation, two callers** (§8.10's rule):

- `hemisphereForLatitude(lat)` — §8.11: sign of latitude,
  `equatorial` within ±10°.
- `latitudeBandForLatitude(lat)` — §8.11: `polar` |φ| ≥ 66.5°,
  `tropical` |φ| ≤ 23.5°, else `temperate`.
- `seasonForDayOfYear(dayOfYear, hemisphere)` — §8.10a: the
  northern arc season, inverted in the south (the December
  rule); equatorial takes the nearest-anchor season.
- `solarDeclinationDegrees(dayOfYear)` — §8.10b:
  δ ≈ −23.44° · cos(360°/365 · (N + 10)).
- `nightProportionFor(dayOfYear, lat)` — §8.10b: sunrise
  hour-angle cos H = −tan φ · tan δ, day length 2H/15 hours,
  night proportion = 1 − dayLength/24; |tan φ · tan δ| > 1
  clamps to polar day (0) / polar night (1).
- `computedLightAspect(dayOfYear, lat)` — the night proportion
  as §6.7's light-aspect Yin proportion, marked
  `source: "computed"` (the marking is part of the value).

Caller 1 is the live Situation: `computeSituation` now calls
the hemisphere/band/season primitives instead of its former
inline copies — behaviour unchanged, and the pre-existing
situation tests (SA-DECEMBER, SA-TONIGHT-canonical,
SA-UNKNOWN-PLACE, SA-SMALL-HOURS, SA-SHADOW) pass unmodified.
Its light aspect remains the canonical season profile in this
slice (the 2b form those tests pin); the computed proportion
is consumed by caller 2.

Caller 2 is the bank (`src/fork/wikidata-bank.ts`): at bank
time, and again at consumption time (below), through exactly
these functions — no forked or reimplemented solar/season
math anywhere in the slice.

## What was built

**Bank-time situation associations.** In
`WikidataBank.bankTranslation`, a node carrying lat/lon node
properties now also banks a `WikidataSituationAssociation`:
hemisphere and latitude band computed by the shared
primitives, keyed by QID alongside the node. Provenance
(§3.5): the association is **derived-kind**, and its record
carries its steps with kinds marked per step (rule 2) —
step 1 `retrieved`: the coordinates (Wikidata P625, with the
node's SourceRecord: dataset "wikidata", uri = the item QID,
baseVersion, retrievedFrom); step 2 `derived`: the §8.10
computation over them. The graph mirror carries the same
marking in node properties (`hemisphere`, `latitudeBand`,
`situationProvenance: "derived: …"`, `situationIncomplete:
false`). Retrieved facts stay retrieved: the LOCATED_IN /
CAPITAL_OF associations keep `provenanceKind: "retrieved"`,
and no computed band is ever recorded as a sourced fact
(rule 1) — both directions are pinned by test.

**The incomplete flag.** A banked node without coordinates
has no situation association and is flagged incomplete:
`placeCompleteness(name)` returns `"complete" | "incomplete"
| undefined` (undefined = not banked at all — a different
state), `isIncompletePlace(name)` reads it, and the graph
mirror writes `situationIncomplete: true` with no hemisphere
on such nodes. §3.6's terms hold: the place can still answer
capital/containment (W2's consumers are untouched by the
flag — pinned by test on Austin/Texas), but it cannot take
part in situation reasoning.

**Consumption — bank level, stated plainly.** The fork turn
layer has **no place-situation question shape yet**: W2's
consumers are the where/capital/country shapes, and the fork
session's frame (`src/fork/session.ts` FrameInput/FrameRecord)
takes a month/hour, not a named place. Inventing a new
question-shape family was out of this slice's scope, so
consumption is wired at the bank level — the level the
existing situation tests exercise for the SA cases — as two
accessors on `WikidataBank`:

- `situationForPlace(name, instant, timezone?)` — the
  SA-DECEMBER shape. For a complete banked place it feeds the
  banked coordinates into **`computeSituation` itself** (the
  live Situation's own code path) with the location sourced
  `"kb"` and labelled with the place's name, and returns the
  resulting Situation plus the banked association. For an
  incomplete place it returns a **located decline** naming
  the missing coordinates (Wikidata P625) and stating that no
  canonical profile is substituted for the place's own.
- `nightForPlace(name, instant)` — SA-TONIGHT in its computed
  form: the same incomplete-flag gate, then
  `computedLightAspect(dayOfYear, bankedLat)` — night
  proportion, band, `source: "computed"`, and `long` read off
  the band (`predominant`).

Wiring these into a turn-level question shape is follow-on
work for whichever slice adds place-situation shapes to the
turn layer; nothing here pretends that shape exists.

## Climate — unmapped-and-skip-logged in v1, and why

**No climate association is banked in v1, and no mapping row
was added.** Reasons, plainly: (1) no row of the mapping data
table covers a climate classification property, and the
translator's contract is that unmapped properties are logged
and counted in the skip-log, never force-fitted — that is
what happens to any climate statement today; (2) no fixture
in the repo — live-recorded or hand-shaped — carries a
climate classification statement, so there is nothing to
translate or pin by test; (3) the correct property and its
value shape (item-valued climate classes vs a code-valued
classification) could not be verified without live Wikidata
access, which the 429 hard stop forbids in this programme —
adding an unverified row to the data table would risk
mapping the wrong property, which is worse than an honest
skip. The banked situation association's `climate` field
exists and is never populated by this slice (pinned by
test). Adding the row(s) once the property's shape can be
verified is the recorded follow-on.

## Fixtures

- `test/fixtures/wikidata/sydney-wbgetentities.json` —
  **HAND-SHAPED**, labelled as such in the fixture README and
  here. Written by hand in the documented wbgetentities
  response shape (the same trimming the live-recorded
  fixtures keep): Q3130 Sydney with P625 coordinates
  **−33.87, 151.21** (the commission's values; §8.14 names
  −33.869, 151.209), P17 → Q408 Australia, P131 → Q3224 New
  South Wales, P31 → Q515 city; referenced items label-only.
- The coordinateless case **reuses** the W2 Texas fixture:
  Austin (Q16559) banks label-only, with no P625 statement.

## Gate evidence (§12 / 2f criteria, fixture-side)

Tests: `test/fork-wikidata-w3.test.ts` — 6 tests.

- **Sydney banking:** hemisphere `south`, latitude band
  `temperate` (|−33.87| is between 23.5° and 66.5°), computed
  at bank time from the banked coordinates; the values equal
  the shared primitives' outputs.
- **SA-DECEMBER from the bank:** `situationForPlace("Sydney",
  2026-12-25)` resolves from the bank (location source `"kb"`)
  → seasonHere `summer`, light band `faint` (Fire-side); the
  northern banked side (Oklahoma, from its fixture) →
  `winter`, band `predominant`. Opposite, per the December
  rule.
- **SA-TONIGHT computed form:** `nightForPlace("Sydney",
  2026-12-25)` → night proportion **0.4062637538…**, band
  `present`, `long: false`, `source: "computed"`. The test
  computes the expected value independently from §8.10b's
  published inputs (δ from day-of-year 359; cos H = −tan φ ·
  tan δ at φ = −33.87; day length 2H/15; night = 1 − day/24)
  and asserts agreement to 1e-12, and that the precomputed
  constant 0.4062637538 holds to 1e-9. (December at Sydney:
  the day is longer than the night — the band, not a
  canonical profile, drives the answer.)
- **Incomplete flag:** Austin banks flagged incomplete;
  `situationForPlace` and `nightForPlace` over it decline,
  the reason naming the missing coordinates and the P625
  source, with no canonical substitution; the capital
  consumer over Texas still answers.
- **Provenance:** the situation association's steps are
  [retrieved (P625, Q3130), derived (computed)] and its kind
  is `derived`; the LOCATED_IN associations remain
  `retrieved`; the mirror's properties carry the same
  marking.

## Gates (fresh complete runs, figures verbatim)

- `npm test` — ℹ tests 1084 · ℹ pass 1081 · ℹ fail 0 ·
  ℹ skipped 3 · ℹ cancelled 0 · ℹ todo 0
  (W2: 1078/1075 — the +6 are W3's tests)
- `npm run fork:demo` — "demo/wuxing-parser: 29/29 expectations
  met · 29 parsed · 27 exact round-trips"
- `npm run fork:holdout` — "ON: parsed 80/80 (100.0%), exact 29,
  mean classifications 0.47"; "flipped fail->success: 26; parse
  regressions: 0; round-trip regressions: 0" (OFF: parsed 54/80)
- `npm run fork:sense` — "Set A: coherence **11/11** vs
  isolated-climb baseline **3/11**"; "Set B (sealed, single run):
  coherence **5/6** vs baseline **3/6**"
- `npm run ai:check` — "system-map check OK: 89 nodes (69
  directories), 22 cords, 1 trace(s); layout covers 89 nodes."
  (The `intake/wikidata` entry and placeholder were updated to
  85% with the W3 build named.)

## What remains (carried forward, unchanged in substance)

- **Slice 0 re-base** (from W2, still outstanding): Slice 0
  (entity grounding) has not landed on
  `track/transcript-fixes`, so W2's lookup trigger still keys
  on the nameable-subject decline sites; re-basing W2/W3's
  consumption onto Slice 0's grounding, when it lands, is
  remaining work.
- **W2's unverified live items** (still outstanding, **not
  retried in this slice** under the 429 hard stop): Texas
  Q1439 live banking, the fresh-session live repeat at zero
  fetches, and the ≤50-id chunking fix against the real API.
  All three are verified offline (fixtures + the 50-id stub);
  re-running `scripts/fork-wikidata-chat.mjs` live is a later
  session's step, after the 429 window.
- **Climate mapping** (§8.11): add the mapping-table row(s)
  once a climate classification property's shape can be
  verified; until then climate statements are
  unmapped-and-skip-logged.
- **Turn-level place-situation shapes**: the bank-level
  consumption above is the wired level for this slice; a
  turn shape ("what season is it in X?", "will tonight be
  long in X?") belongs to a later slice.
- Known limits carried from W2, unchanged: the bank is
  process-level only (no file backing); the live Situation's
  light aspect remains canonical-profile (2b form) — the
  computed proportion reaches answers through the bank-fed
  place path in this slice.
