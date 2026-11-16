# T-R4 — fresh transcript scenarios for slice R4 (FROZEN)

Authored 2026-11-16, BEFORE the R4 build (the disposition
bias mechanism in `src/fork/disposition.ts` and its wiring in
`src/fork/plan.ts` / `src/fork/turn.ts`), per §10's rule: a
slice's transcript scenarios are authored before the slice's
code first runs against them and are frozen once written.
Failures against these expectations are findings, to be
recorded in `T-R4-results.md` — this file is not edited to
fit the build's behaviour.

R4 is §7.4 and §8.9 made live, inside §9.1's scope: the
session's disposition composition actually parameterises
processing. §9.1 admits a composition only with a declared
transcript effect, visible in traces. This file IS that
declaration for the two reference compositions below: their
effects are stated mechanically, per bias channel, before
the mechanism exists. The neutral composition's declared
effect — "none", recorded in `composition.ts` at R0 — is
answered here too (§4 below).

## 1. The three compositions (data)

- **NEUTRAL** — the declared default: predominant Earth, no
  other ranks (`NEUTRAL_COMPOSITION`). Declared effect: none.
- **WOOD** — predominant Wood, secondary Fire, trace Earth.
  (Fire is the element Wood generates — its expressive
  direction; Earth is the element Wood controls.)
- **WATER** — predominant Water, secondary Metal, trace Fire.
  (Metal is the element that generates Water — its gathering
  direction; Fire is the element Water controls.)

In R4 every bias channel reads the PREDOMINANT rank only.
The secondary and trace ranks are carried in the composition
and named in every trace header (§9.1), but no channel reads
them in this slice; that scoping is stated here so no result
below is read as evidence about them.

## 2. The bias table (declared values)

One bias table, keyed by predominant element, consulted by
every channel — the turn and planner code holds no per-site
conditionals. Values:

| predominant | move preference (strongest first) | high/middling boundary | length at composition sites |
|---|---|---|---|
| Wood | generating, restrainer, venting | 0.75 | full-set |
| Water | restrainer, venting, generating | 0.85 | lead-only |
| Earth (neutral) | — no bias: the standing code order and constants — | 0.8 (= `SUPPORT_HIGH`) | full-set |

- **The boundary band.** The high/middling boundary of §9.2's
  pricing (`SUPPORT_HIGH` = 0.8, the generating support
  weight) may move only within **[0.7, 0.9]**. Both declared
  values lie inside. The FLOOR (`SUPPORT_FLOOR` = 0.4) and
  every tier CEILING (`CEILING_BY_TIER`) never move, under
  any composition: the boundary gates only whether a support
  speaks AT its ceiling or one level below it. `pricing.ts`
  is not edited; the shifted boundary is applied by the bias
  mechanism around pricing.ts's exported table.
- **Comparable candidates.** Two candidates are comparable
  when their supports differ by at most **0.1**
  (`COMPARABLE_SUPPORT_BAND`). Comparable groups are formed
  over a standing order greedily from its head: a candidate
  joins the current group while its support is within the
  band of the GROUP LEAD's support (no transitive chaining).
- **Affinity (the arbitration direction rule).** Within a
  comparable group, candidates are re-ranked by their
  element's affinity to the composition's predominant
  element, using the sense layer's own weights (sense.ts):
  same element 1.0; a generating relation in either
  direction 0.8; a controlling relation in either direction
  0.4. (Between two elements of the five, one of these
  always holds.) Ties in affinity fall back to the standing
  order within the group. A candidate outside the band of
  the group's lead is never re-ranked into it; a clear
  winner (a lead no other candidate is comparable to) is
  never displaced; a below-floor candidate is never raised
  (pricing runs before ordering, and the floor is not the
  bias mechanism's to move).

## 3. The four channels, and when each writes a trace record

Every bias application is written into the turn's trace as a
bias record (channel, the candidates in their standing
order, the order/selection after the bias, the rule in
words). R7's dashboard switcher will display these records.
A record is written exactly when the channel had something
to decide:

- **(a) Arbitration** — at the composition transform's two
  orderings (support order; relation order). A record is
  written when a comparable group of two or more is
  re-ranked under a non-neutral composition — including when
  the affinity ranking confirms the standing order (the
  record's before/after are then equal, and say so by
  being equal). In relation order, comparability requires
  the same relation weight AND supports within the band.
- **(b) Move selection** — at the steering junction where
  two grounded moves compete. In the current wiring exactly
  one such junction exists: a new state that CONTROLS an
  earlier state grounds both "address the restrainer"
  (branch (a)) and "follow the generating direction"
  (branch (c)). A record is written when both moves are
  grounded and the composition is non-neutral; the
  selection follows the declared move preference. Where
  only one move is grounded there is no record and no
  effect, under any composition. (The venting move, branch
  (b), never competes with either in the current wiring —
  it requires an event with no new state — so its place in
  the preference lists is declared data with no contested
  site in this slice.)
- **(c) Thresholds** — at the planner's speaking sites
  (single predication; composition members), where §9.2's
  price is acted on. A record is written when the support
  falls in the boundary's DECISIVE WINDOW — the interval
  between the composition's boundary and the default 0.8 —
  where the shifted boundary changes the level the default
  would give. Outside the window the boundary decides
  nothing and no record is written. The steering branches'
  record-only pricing (a price computed for the trace, not
  spoken from) is NOT biased in this slice: the threshold
  channel governs spoken strength, and a steering reply's
  wording is not priced speech. That scoping is declared
  here, not discovered later.
- **(d) Length** — at the composition transform: under a
  lead-only composition, when two or more members stand
  above the floor, only the lead member (in the active
  order) is spoken; the rest are HELD — recorded in the
  composition record with their pricing and the selection's
  ground. A record is written when at least one member is
  held. Held members are grounded conclusions, priced
  identically to the other runs; they are not dropped
  (below-floor members are dropped, as in R2, a different
  record).
- **Register** (§8.7 S10) is NOT wired in this slice, and
  the reason is recorded here rather than the channel being
  faked: the generator has no register variants to select
  among — every grounded behaviour the reply layer can
  produce differs in content, strength, order or length,
  not in register. Inventing register variants would be new
  surface wording, not selection among grounded behaviours.

Under NEUTRAL, no channel ever writes a record and no
outcome differs from the pre-R4 build: the default session
disposition stays neutral, so every pre-existing transcript
and test must hold byte-identically.

## 4. The comparison discipline (what "same conclusions" means)

Each scenario runs identically under NEUTRAL, WOOD and
WATER sessions (fresh session per composition). The runs are
compared on CONCLUSION FIELDS, mechanically:

- the session record after each turn (states with holder,
  lemma, element, negated flag, turn; events; topics);
- every priced conclusion spoken as a predication: subject,
  quality, weakest tier, support, CEILING (the level may
  differ — that is channel (c)'s declared difference; the
  ceiling may not);
- declines and their grounds;
- at composition sites, the full priced member set (spoken
  plus held), each member's tier, support and ceiling.

These fields must be IDENTICAL across the three runs of a
scenario. Differences are permitted ONLY at the declared
places: the spoken ORDER of comparable candidates (a), the
steering move selected and the steering fields that name it
(`cyclePath`, and the derivation/pricing the selected move
rests on — each move rests on its own derivation, §2.1, so
those fields differ as a consequence of the declared move
difference, and are listed as part of it) (b), the spoken
LEVEL within its ceiling (c), the spoken SUBSET at a
composition site (d) — and the carriers of those differences
themselves: the disposition header and the bias records.
A difference anywhere else, or a conclusion field that
differs, is a slice failure: it is reported, and the
scenarios are not tuned to hide it.

The neutral composition's declared "none" is answered by:
paired NEUTRAL-vs-NEUTRAL runs of every scenario are
trace-identical (full trace JSON), and no neutral trace
carries a bias record.

## 5. Scenario R4-1 — the threshold channel at the question site (turn-level)

One session per composition; turns:
1. "Is the soup cold?"
2. "Is the salt cold?"

Facts (from the shipped graph, checkable in `classify.ts`
and the join): soup is Water by a `fork-creative`
classification — tier DERIVED, ceiling qualified — and the
shared-prior path to cold carries support exactly **0.8**.
Salt is attested, its path support **0.9**, ceiling plain.

Expectations:
- Turn 1: the conclusion (soup–cold, derived, support 0.8,
  ceiling qualified) is identical in all three runs. The
  LEVEL differs by the declared window [0.8, 0.85): NEUTRAL
  (boundary 0.8) and WOOD (0.75) speak AT the ceiling —
  qualified, the modal form ("may"); WATER (boundary 0.85)
  finds 0.8 middling and drops one level — possibility, the
  weaker modal form ("might"). A threshold bias record
  appears in the WATER trace only (0.8 lies in Water's
  decisive window, and in neither Wood's [0.75, 0.8) — 0.8
  is its excluded top — nor neutral's empty window).
- Turn 2: support 0.9 is above every boundary: plain under
  all three compositions, no bias record in any trace. The
  control turn: the threshold channel touches nothing here.

## 6. Scenario R4-2 — arbitration + threshold over the join's real conclusions (composition-level)

Composition-level, in R2-2's pattern and for its stated
reason: the turn loop's speaking site composes sets whose
members share one classification and one support family, so
cross-element comparables at one support do not arise
there; the join's `derive()` output is where they live.
The composition transform is invoked directly over the
subject **salt**, its members the COLOR rows harvested from
`derive(graph, "salt")` in the join's enumeration order:

- black — correspondence, element Water, support 0.9
- green — generates:color, element Wood, support 0.765
- white — generated-by:color, element Metal, support 0.765
- red — restrains:color, element Fire, support 0.765
- yellow — restrained-by:color, element Earth, support 0.765

Each member's weakest tier is ESTABLISHED (attested root,
correspondence/cycle legs — `tiersOnPath`), ceiling
lightly-qualified. No newest state stands in the record, so
relation order's members are all "unrelated" and relation
order falls back through support to enumeration, before
any bias. The comparable group is {green, white, red,
yellow} at 0.765; black's 0.9 differs from the group lead
by 0.135 — outside the band — so black is never re-ranked.

Expectations:
- Conclusions identical across runs: the five members, their
  tiers, supports and ceilings; no drops, no declines.
- Levels (channel (c)): the 0.765 members stand in WOOD's
  decisive window [0.75, 0.8): WOOD speaks them AT the
  ceiling — lightly-qualified; NEUTRAL and WATER (0.765
  below both 0.8 and 0.85, middling in both) speak them one
  level down — qualified. Black at 0.9 speaks
  lightly-qualified under all three. Threshold bias records
  appear in the WOOD run only, one per window member.
- Support order (channel (a)): NEUTRAL [black, green,
  white, red, yellow] (support, then enumeration). WATER:
  affinity to Water ranks the generating pair {green
  (Wood), white (Metal)} at 0.8 above the controlling pair
  {red (Fire), yellow (Earth)} at 0.4, ties in enumeration
  order — [black, green, white, red, yellow]: the affinity
  ranking CONFIRMS the standing order, and the arbitration
  record's before/after are equal. WOOD: affinity to Wood
  ranks green (same, 1.0), then red (Fire — generating,
  0.8), then the controlling pair {white (Metal), yellow
  (Earth)} at 0.4 in enumeration order — [black, green,
  red, white, yellow]. The declared WOOD↔WATER difference
  in order is exactly the red/white swap, inside the
  comparable group; black leads under all three.
- Relation order: all members unrelated, so it falls back
  to the support-then-enumeration order and the same
  comparable-group re-ranking applies to it (comparability
  there: equal relation weight, supports within the band).
  Relation order therefore equals support order in each
  run, and the trace records both.
- Length (channel (d)): WOOD and NEUTRAL speak the full
  set. WATER speaks the LEAD member only — black — and
  holds green, white, red, yellow, each recorded with its
  pricing and the selection's ground. The held members'
  pricing is identical to the other runs' (they are priced
  before the length selection, and their levels are part of
  the conclusion fields compared above — including the
  threshold differences of the WOOD run, which is a
  difference in the held/spoken members' LEVELS only,
  never in tier, support or ceiling).

## 7. Scenario R4-3 — move selection on the restrainer junction (turn-level)

One session per composition; turns:
1. "I couldn't sleep."
2. "I was worried."

Facts: sleep is a classified verb-state (Water, attested);
worried is a classified state (Earth, `fork-creative`).
Earth CONTROLS Water, so at turn 2 two grounded moves
compete: address the restrainer (the worry restrains the
sleep) and follow the generating direction (Earth generates
Metal). Turn 1 grounds only the generating follow (no
earlier state stands to be restrained).

Expectations:
- Turn 1: identical in all three runs — same reply (the
  generating follow on the sleep state), same cycle path,
  no bias record (one grounded move only).
- Turn 2: the session record is identical in all three runs
  (sleep state, negated, turn 1; worried state, turn 2; the
  sleep event). The MOVE differs as declared: NEUTRAL takes
  the standing code order — address the restrainer; WATER's
  preference also selects the restrainer, and writes a move
  bias record naming both grounded moves and the selection;
  WOOD's preference selects the generating follow — its
  reply acknowledges the worry and follows toward
  expression, its cycle path is the generating arc, and its
  move bias record names the selection. The steering fields
  that differ (cycle path; the derivation and record-only
  pricing the selected move rests on) are the declared move
  difference's own fields (§4). No conclusion is spoken as a
  predication on this turn in any run (steering wording, as
  R1 scoped it), so no predication conclusion fields exist
  to differ.

## 8. Scenario R4-4 — the length channel at the question site (turn-level)

One session per composition; turns:
1. "Is winter cold?"
2. "Is summer hot?"

Facts (R2-1's set): each turn composes the season's
two-aspect set — {cold, dark} for winter, {hot, bright} for
summer — both members attested-tier, support 1, ceiling
plain, degree strongest. Support 1 is outside every
decisive window and the members' supports are equal but
stand on the SAME element (the subject's), so neither the
threshold nor the arbitration channel has anything to
decide: no bias record of those channels in any run.

Expectations:
- The priced member set is identical across runs: both
  members, plain, support 1, in both orderings (support
  and relation orders coincide, as in R2-1).
- NEUTRAL and WOOD (full-set) speak both members, as R2
  established. WATER (lead-only) speaks the lead member
  only — cold for winter, hot for summer — and holds the
  other, recorded with its pricing and the selection's
  ground; a length bias record appears in the WATER traces
  only. The held member is not dropped and not a decline:
  the reply is the lead predication, whole.

## 9. Scenario R4-5 — the invariants (unit-level, all compositions)

Priced directly through the planner's transforms, under
NEUTRAL, WOOD and WATER alike:

- **The floor does not move.** A derived-tier conclusion at
  support 0.35 declines under all three compositions, its
  ground naming the floor 0.4. A prediction-tier conclusion
  at support 0.35 declines under all three.
- **Ceilings do not move.** A derived-tier conclusion at
  support 0.95 speaks QUALIFIED under all three — never
  plain, though 0.95 clears every boundary. An
  established-tier conclusion at support 0.95 speaks
  lightly-qualified under all three — never plain.
- **The boundary governs only ceiling-vs-one-down.** A
  prediction-tier conclusion at support 0.77: NEUTRAL and
  WATER price it middling — one level below possibility is
  the decline; WOOD (boundary 0.75) prices it at its
  ceiling — possibility. This is not the floor moving:
  0.77 is above the floor 0.4 under every composition, and
  the same conclusion at 0.35 declines everywhere (above).
- **The boundary stays in its band.** The bias table's
  boundaries for the three compositions are 0.8 / 0.75 /
  0.85, all within [0.7, 0.9]; the neutral boundary is
  exactly `SUPPORT_HIGH`.
- **No bias under neutral.** planPredication and
  planComposition invoked with the neutral composition (or
  none) return outcomes identical to the pre-R4 build's —
  the standing test suite is the evidence — and carry no
  bias records.

## 10. Surface discipline

No reply under any composition names the ontology or the
disposition: the standing leak scan (element, polarity and
cycle vocabulary) runs over every reply in every scenario,
and the bias records live in the trace only — no bias
record text reaches a reply. The composition's element
names appear in traces (headers, bias records) as
architecture, exactly as the disposition header has since
R0.
