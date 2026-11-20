# T-R6 — results (slice R6: bounded initiative, the awareness frame)

Run 2026-11-16 against the frozen scenarios in `T-R6.md`
(that file is untouched). Verdicts are per scenario, from the
turn loop's actual replies and traces; the suite pins them in
`test/ansci-r6.test.ts`.

## R6-1 — initiative from an unexpressed state — PASS

Turns 1–4 carry no initiative record. At turn 5 the
restrainer reply gains exactly one appended sentence — the
planner's predication of the standing state, priced from its
origin (attested, support 0.9 → plain): "You were held from
sweet, and you were green. What is the green about? That
seems to be the thing holding the sweet back. **You are
furious.**" The trace's initiative record names the shape,
the ground (you/furious, turn 1; its generating direction
Wood→Fire unexpressed; 4 turns elapsed), the move and its
pricing; the serialised reply graph is the predication's.
The addressed state at turn 5 is sweet, and sweet is not the
ground: what keeps sweet out is the addressed-state
exclusion, as the frozen file anticipated — its generating
direction (Metal) is also unexpressed, so the arithmetic
alone would have admitted it, as the younger of the two
candidates in any case (furious, turn 1, is older).

## R6-2 — initiative from a persisting gap — PASS

The give event's theme gap is never asked on its own turn
(turn 2's reply is the venting reply, byte-identical to the
pre-R6 build) and persists in the record. At turn 4 the
restrainer reply gains the R3 question built from the
record: "…That seems to be the thing holding the sleep
back. **What did you give him?**" — the same surface the
parse-based transform produced in T-R3. The initiative
record names the event (give, turn 2), the role (theme) and
the 2 turns elapsed. The sleep state grounds no shape-(a)
move, as frozen: its lemma is a verb, and the predication
construction does not predicate doings.

## R6-3 — the bound — PASS

Initiative fires at turns 5 and 10 only, over the ten-turn
conversation. Turn 5 takes the OLDEST candidate — soup/cold
(turn 1), not you/worried (turn 2) — appending "The soup is
cold." at its origin's price (attested, 0.95 → plain).
Turns 7 and 9 have candidates standing (worried among them)
and plain-statement replies, and no initiative fires: the
bound alone bars them (7 − 5 = 2, 9 − 5 = 4, both < 5), and
both replies are byte-identical to the pre-R6 build's. At
turn 10 the bound permits (10 − 5 = 5) and the move grounds
on worried — cold, taken up at turn 5, is not taken up again
while the same record stands — appending "You may be
worried." at worried's price (derived tier, fork-creative,
support 0.9 → qualified). Turn 2 pins the age rule: a
plain-statement reply with cold only one turn old fires
nothing. `session.initiatives` holds exactly the two
records, at turns 5 and 10.

## R6-4 — control (i): the person's own questions and gaps — PASS

No initiative on any turn; `session.initiatives` stays
empty; every reply is byte-identical to the pre-R6 build's.
Turn 2 is the clean pin the frozen file designed: furious
stands unexpressed, the reply is a plain statement, and the
person's own question (recorded in the trace as
`personPresented: "question"`) is the only bar.

## R6-5 — control (iii): an expressed direction — PASS

No initiative on any turn. Turn 2's soup/hot (Fire) is
GENERATES[Wood] — the standing furious state's generating
direction expressed — and at turn 4, where the restrainer
reply is a plain statement and furious is old enough,
unaddressed and within the bound, expressedness is the only
bar: turn 4's reply carries no appended predication. Hot,
the addressed state at turn 4, grounds no move either.

## R6-6 — the awareness frame and the role slot — PASS

- **A (winter night).** The frame stands in the record
  classified on every leg the graph holds: season winter →
  Water with a classified origin (leg "winter —HAS_ELEMENT→
  Water", support 0.95, tier attested, provenance
  fork-curated); daypart night → Water with its table origin
  (aspect "time", fork-curated, 0.95) and polarity Yin with
  its leg recorded ("night —POLARITY_OF→ Yin"). No leg
  needed the unclassified fallback. Every trace header
  carries the frame and the neutral role. The two turns'
  replies are byte-identical to an unframed session's —
  in this slice no processing reaches the frame, as the
  frozen file stated; the winter answer is reached through
  the person's question subject.
- **B (summer midday; role inertness).** Season summer →
  Fire; daypart midday → Fire, polarity Yang. With the role
  set by hand to a Wood-predominant composition, the reply
  is byte-identical to the neutral-role session's and the
  trace header renders the set composition: the slot is
  present, shown, and inert.
- **C (hour only).** Daypart night, classified as in A; the
  season is absent with its reason recorded ("no month
  supplied…").
- **D (no input).** No frame in the record or any trace;
  the role stands neutral; behaviour is the pre-R6 build's.

The investigation's daypart finding, for the record: the
graph holds daypart polarity (the seed's TimeOfDay
POLARITY_OF edges: dawn Yang, midday Yang, dusk Yin, night
Yin) and the table holds daypart elements (aspect "time"),
so the frame's daypart is classified on both legs. The
calendar mappings (meteorological seasons by month;
dayparts by hour) are implemented as named connective-layer
conventions (`SEASON_CONVENTION` / `DAYPART_CONVENTION` in
session.ts); the classifications they feed are the table's
and the seed's, never the convention's.

## Non-regression and gates

- Suite: **531 pass / 0 fail** (518 at the slice's baseline
  + 13 new R6 tests). Typecheck clean.
- Initiative fired inside NO prior transcript set and none
  of the four scripted scenarios: the T-R1–T-R5 test files
  pin their replies verbatim (any appended move would have
  failed them), the scripted scenarios carry an explicit
  no-initiative sweep in `test/ansci-r6.test.ts`, and the
  demo exhibit is unchanged (29/29 expectations, 27 exact
  round-trips).
- Stage-5 preservation re-run: pooled feature preservation
  **97.7%** (over 1,079 atoms — the population grows as the
  record carries more, as the stage-5 report itself notes;
  the percentage is unchanged), negation generation
  direction exact 13/15, rule-selected negator present
  14/15.
- Foundation files (`src/seed.ts`, `src/graph.ts`,
  `src/engine.ts`, `src/propagate.ts`, `src/wordnet.ts`)
  verified byte-identical to the copies staged on main;
  `src/ansci/pricing.ts` untouched. The classification table
  was read, never edited. Nothing pushed.
