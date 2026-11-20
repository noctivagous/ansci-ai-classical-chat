# H7 banking pass — the mineral survey's 50 substances

Date: 2026-11-15. Slice 1 of the four-slice commission ("do all
of these items then push everything"). Implements hypothesis H7
(FLAVOR_BRIDGE_V1) as registered in `repair-programme.md`,
including amendments A1 and A2, over the 50 substances of
`wp1b-mineral-survey.md`. Code: `src/ansci/flavor-bridge.ts`;
tests: `test/ansci-h7.test.ts`. Nothing was pushed by this slice;
the parent pushes the batch.

## What was done

Each survey substance was tested against H7's six admission
conditions. Where a named bencao entry and recension states an
explicit five-flavor value, a derived correspondence was banked:
the substance's **recorded-flavor aspect** to a phase, composed
from the entry's flavor and the flavor→phase correspondence of
*Suwen* ch. 4 （金匱真言論） — the registry's preferred leg, one
attested correspondence leg （其味酸，其類草木 → Wood; 其味苦，
其類火 → Fire; 其味甘，其類土 → Earth; 其味辛，其類金 → Metal;
其味鹹，其類水 → Water). The flavor leg is the survey's fetched
entry text: the *Benjing* stratum in Sun Xingyan's
reconstruction for the 46 *Benjing* items, the transmitted
*Bielu* entries for the 4 *Bielu* additions.

**Result: 45 of the 50 substances qualified; 46 records were
banked** （芒消's entry states two flavors, 味辛苦， and banks one
record per recorded flavor value — recorded as recorded, never
forced to one). By phase: Earth 14, Metal 19, Fire 7, Wood 5,
Water 1. By stratum: 41 records from *Benjing* entries, 5 from
*Bielu* entries.

**5 substances were skipped, each for a stated reason:**

| Substance | Reason |
|---|---|
| 鐵精 (survey 32) | The entry states thermal nature only （平） and no flavor word. Condition (1) fails — there is no flavor value to bridge, and the nature axis does not bridge under H7. |
| 鐵 (34) | No flavor and no nature stated in the entry. Condition (1) fails. |
| 錫鏡鼻 (43) | No flavor in the substance's own clause: in Sun it shares the 粉錫 entry, whose flavor clause belongs to 粉錫； its own Zhenglei flavor was not fetched in the survey. Banking 粉錫's flavor for it would be a transfer, not a recorded value. |
| 戎鹽 (45) | No flavor in its own *Benjing* main clause. A flavor （鹹） appears only in the merged transmitted head line shared by the three salt entries, where it cannot be attributed to this substance's entry. |
| 大鹽 (46) | Same as 戎鹽： no flavor in its own clause; 甘鹹 appears only in the shared merged head line. |

Two judgement calls inside the qualifying set, recorded rather
than smoothed over. **鐵落 (33)** banks: Sun merges it into the
鐵精 entry, but the flavor wording stands in 鐵落's own clause
of that entry, so the value is its own — priced at the merged-
entry C_A tier. **鉛丹 (41)** banks on Sun's reading （味辛微寒）
with the recension dispute carried on the record: the Zhenglei
SK1441 head line reads 味平微寒， and 平 is not among the five
flavors. Amendment A1 routes exactly this kind of per-entry
variation through C_A, so the dispute lowers the price instead
of voiding or hiding the record.

## Confidence arithmetic

C_bridge = min(C_A, C_B) × K, with **K = 0.90** fixed per
bridge (A1 — assessed once for this source pair, never
re-assessed per substance) and **C_B = 0.95** throughout (the
*Suwen* ch. 4 clauses are explicit and were verified in the
WP1 survey). C_A is the only per-entry variable:

- **0.95** — *Benjing* stratum, explicit single flavor, no
  recorded variant touching the flavor → C_bridge **0.855**
  (39 records).
- **0.90** — *Bielu* stratum (attribution best-supported, per
  the survey's stratum notes), or a *Benjing* flavor in the
  substance's own clause of a merged entry （鐵落） →
  C_bridge **0.81** (6 records).
- **0.70** — 鉛丹， flavor disputed across recensions →
  C_bridge **0.63** (1 record).

The arithmetic is pinned by test: every record stores its
C_A / C_B / K inputs, and the test recomputes each confidence
from them.

## Representation, and its grounds

The records live in a **separate store**,
`DERIVED_CORRESPONDENCES` in `src/ansci/flavor-bridge.ts`,
behind a dedicated accessor (`derivedCorrespondencesOf`,
`allDerivedCorrespondences`). `CLASSIFICATIONS` and
`lookupClassification` are untouched — not one line of
`classify.ts` changed.

The grounds are amendment A2's. A B-derived record is a
distinct kind from a directly attested correspondence, and
attested-correspondence queries must exclude B-derived records
unless they explicitly request them. `CLASSIFICATIONS` has no
B-derived kind — its provenance union is fork-curated /
fork-creative, and `lookupClassification` is the ordinary
lookup the parser, the join, and the turn loop all use. Banking
these records there would either blur the union or let the
ordinary lookup silently return derived records as
classifications. In the separate store the distinction is
structural, not conventional: every record carries
`assertion_kind = DERIVED_CORRESPONDENCE` and
`evidence_grade = B-derived` at the type level.

Each record stores its **full derivation path**: the bencao
text, stratum, witness/recension, entry, and the flavor wording
in the source's own terms; the *Suwen* chapter and the exact
correspondence clause; and the two source-assertion ids
(`flavor:<substance>@<stratum>`, `suwen4:<flavor>-<phase>`).
A test checks every record's path fields are non-empty and
that the ids match the record's own flavor and phase, so each
record is reconstructible from what it stores. The flavor leg
is stored inside the path rather than as a separate node table,
because nothing consumes it yet; the ids are stable if a later
slice promotes the legs to first-class assertions.

The sharp case the separation exists for is in the table
already: `lookupClassification("mercury")` returns the attested
planet row (Water, fork-curated). The substance 水銀's banked
record — pungent flavor → Metal — lives only in the derived
store, reachable by the derived accessor (including by hanzi).
Neither leaks into the other; a test pins both sides.

**Nothing consumes the new store.** No parser, join, or turn
code reads it. Banking was the deliverable; whether and how
the derived correspondences feed reasoning is a later decision,
and until then the records change no behaviour anywhere in the
system.

## The guard case

Cinnabar （丹砂） banks as the registry requires: sweet flavor
（味甘， the *Benjing* layer in Sun) → Earth, on the
recorded-flavor aspect only, at 0.855. Its record's limitations
state that the *Benjing* layer's silence on toxicity is
neither asserted nor implied by the record, and that later
layers' colour/toxicity discussion does not veto the flavor
assertion. No classification of cinnabar as a whole was
created — `lookupClassification("cinnabar")` still returns
nothing.

## What the records do and do not license

A banked record licenses exactly one statement: *this
substance's recorded flavor, in this named entry and recension,
corresponds under H7 to this phase* — at the stated confidence,
as a derived correspondence. Every record carries the boundary
in its `limitations` field, not in reader discretion: it
licenses **no** statement about the substance as a whole, not a
material classification, not its thermal nature, and — per
admission condition (5) — **no indication, safety, efficacy,
organ-action, or function claim**. The survey's headline
finding stands unchanged: 0 of the 50 substances carries a
five-phase assertion in the tradition, and this pass adds none;
it adds flavor-aspect correspondences derived under a
registered rule, labelled derived.

## What this does not show

The pass shows the bridge can be applied to the survey set
under its own admission conditions, with the arithmetic and
provenance the registry prescribes. It does not show the
bridge is *right*: H7's falsification conditions (independent
comparison of the two flavor vocabularies; blind judges
separating flavor-aspect correspondences from whole-substance
classification; the held-out comparison against an unqualified
flavor lookup) are untested by this slice, and the banked
records inherit that openness. Nobody outside the project has
checked the flavor transcriptions against the entry texts
beyond the survey's own fetching.

## Gates

- `npm test`: **328/328 pass** (320 baseline + 8 new H7 tests).
- `npm run typecheck`: clean.
- `npm run ansci:demo`: **29/29 expectations met**, 27 exact
  round-trips — unchanged, as expected: nothing consumes the
  new store.
- Foundation files (`seed.ts`, `graph.ts`, `engine.ts`,
  `propagate.ts`, `wordnet.ts`) and `classify.ts` untouched.
