# T-R4 results — disposition live, judged against the frozen scenarios

Run 2026-11-16, after the R4 build (`src/fork/disposition.ts`,
the wiring in `src/fork/plan.ts` and `src/fork/turn.ts`), via
`node scripts/fork-r4-transcript.mjs` against the built tree,
plus the gate runs recorded at the bottom. `T-R4.md` is
untouched. `pricing.ts` is untouched — byte-identical,
verified by checksum: the shifted boundary is applied by the
bias mechanism around its exported table, exactly as the
frozen file required. No new node or edge vocabulary;
English only.

## What was built

**One bias mechanism** (`disposition.ts`). A bias table keyed
by predominant element — Wood: boundary 0.75, move preference
generating-first, full-set; Water: boundary 0.85, move
preference restrainer-first, lead-only — consulted by four
channel functions, with the neutral composition (and any
predominant the table does not name) returning no bias, so
every neutral computation is the pre-R4 computation by
construction (the threshold function literally calls
`priceReply` when no bias is in force). The four channels:

- **(a) Arbitration** (`arbitrateOrder`): re-ranks an
  already-priced, already-ordered candidate list inside its
  comparable groups (supports within 0.1 of the group lead;
  relation order additionally requires equal relation
  weight), by affinity to the predominant element in the
  sense layer's weights. Wired at both of `planComposition`'s
  orderings. A clear winner is never displaced (black at 0.9
  leads every R4-2 run); below-floor candidates never reach
  ordering at all.
- **(b) Move selection** (`selectMove`): at the one contested
  junction in the turn loop — a new state that controls an
  earlier state grounds both "address the restrainer" and
  "follow the generating direction" — the composition's
  preference selects. One grounded move: no record, no
  effect, any composition.
- **(c) Thresholds** (`priceWithBoundary`): recomputes a
  §9.2 level from pricing.ts's exported ceiling table and
  unmoved floor, with the composition's boundary in place of
  0.8. Wired where prices are spoken from: `planPredication`,
  `planComposition`'s members, and the question site's trace
  price (the same computation, de-duplicated in the trace).
  The steering branches' record-only pricing is NOT biased —
  the scoping declared in T-R4 §3.
- **(d) Length** (`applyLength`): at composition sites, a
  lead-only composition speaks the lead member of the active
  order and holds the rest — held members returned with
  their pricing and recorded in the composition record,
  distinct from below-floor drops. **Register is not wired**,
  for the reason declared in T-R4 §3: the generator has no
  register variants to select among.

Every application returns a bias record (channel, before,
after, rule, and — for threshold records — the conclusion
priced), which the turn loop writes to `trace.dispositionBias`
and the composition outcome carries in its `bias` field.
One application is recorded once: the question site computes
the spoken price twice (trace record, then the planner's own
computation of the same inputs), and identical records of
that one application are de-duplicated where they are
written.

## Verdicts, per scenario

**R4-1 (threshold, turn-level) — PASS.** The soup conclusion
(derived, support 0.8, ceiling qualified) is identical in all
three runs. Levels: neutral qualified ("The soup may be
cold."), Wood qualified with NO bias record (0.8 is the
excluded top of Wood's window), Water possibility ("The soup
might be cold.") with exactly one threshold record:

> before: support 0.8 against the default boundary 0.8 → qualified · after: support 0.8 against the boundary 0.85 → possibility · context: the pricing of soup → cold

The control turn (salt, support 0.9) is plain under all
three, no records.

**R4-2 (arbitration + threshold + length, composition-level)
— PASS.** Conclusions identical across runs (the runner's
mechanical comparison, below). Support orders: neutral
[black, green, white, red, yellow]; Water the same, its two
arbitration records showing before == after (the affinity
ranking confirms the standing order, as frozen); Wood
[black, green, red, white, yellow] — the declared red/white
swap inside the comparable group, black never displaced.
Relation order equals support order in each run, as frozen.
Levels: the 0.765 members speak lightly-qualified only under
Wood (four threshold records, one per member, each
contextualised); black speaks lightly-qualified everywhere.
Length: Water speaks "The salt is likely black." and holds
green, white, red, yellow with their pricing; Wood speaks
the full set — "The salt is likely black, and it is likely
green, and it is likely red, and it is likely white, and it
is likely yellow."

**R4-3 (move selection, turn-level) — PASS.** Turn 1
identical in all runs, no records (one grounded move). Turn
2: the session record is identical in all three runs (sleep
state negated at turn 1; worried state at turn 2; the sleep
event). Neutral addresses the restrainer (cyclePath
Earth→Water, no record). Water selects the restrainer too —
same reply as neutral — and writes the move record naming
both grounded moves, before == after. Wood selects the
generating follow: cyclePath Earth→Metal, reply "You were
worried. What did you say or do?", move record after =
[follow the generating direction, address the restrainer].
The steering fields that differ under Wood (cycle path, and
the derivation/record-only pricing the selected move rests
on — the generating branch rests on the generates:
conclusion at 0.765, the restrainer branch on the worried
derivation at 0.9) are the declared move difference's own
fields under T-R4 §4's carve-out; no predication is spoken
on this turn in any run.

**R4-4 (length, turn-level) — PASS, with one finding against
the frozen file (below).** The priced member sets are
identical across runs (spoken + held, with tier, support,
ceiling and level). Neutral and Wood speak both members
("Winter is most fully cold, and it is most fully dark.");
Water speaks the lead only ("Winter is most fully cold.")
and holds dark, priced plain, with a length record; likewise
summer/hot/bright.

**Finding (against T-R4 §8's text, not against the build).**
§8 declared that in R4-4 "neither the threshold nor the
arbitration channel has anything to decide: no bias record
of those channels in any run" — reasoning that the members
"stand on the SAME element". The traces show arbitration
records under Wood and Water (before == after in both
orderings). The frozen §8 sentence mis-applied the frozen
§2/§3 rules: comparability is defined by SUPPORT proximity
(the members stand at equal support 1 — a comparable group
of two), and §3's record policy writes a record whenever a
comparable group is re-ranked under a non-neutral
composition, including when the ranking confirms the order.
That the members share an element makes their affinities
equal, so the re-ranking cannot change their order — and it
does not — but the channel does process the group, and the
record is its observable. The build follows §2/§3 as
written; §8's expectation sentence was wrong about its own
rules' consequence. Every substantive §8 expectation (member
set, levels, orders, the length difference) holds. The
frozen file is not edited; the discrepancy is recorded here.

**R4-5 (invariants, unit-level) — PASS** (pinned in
`test/fork-r4.test.ts`). Below-floor conclusions decline
under all three compositions (derived and prediction tiers
at 0.35). Ceilings hold: derived at 0.95 speaks qualified
everywhere, established at 0.95 lightly-qualified
everywhere — never plain. The prediction case separates the
boundary from the floor as frozen: at 0.77, neutral and
Water decline (one level below possibility), Wood speaks
possibility at its ceiling; at 0.35 the same tier declines
under all three. Boundaries read 0.8 / 0.75 / 0.85, inside
[0.7, 0.9]; neutral pricing is `priceReply` across a
tier × support grid, deep-equal, no records.

**The neutral declaration — ANSWERED.** Paired
neutral-vs-neutral runs of every scenario produce identical
full trace JSON, and no neutral trace carries a bias record;
`planComposition` with the neutral composition is JSON-equal
to no composition at all. The default session disposition
remains neutral, and the pre-existing suite — which runs
neutral sessions throughout — passes unchanged (below), so
T-R1–T-R3 and the scripted scenarios are non-regressed.

## The pair comparison (T-R4 §4), and how it was checked

The runner extracts CONCLUSION FIELDS mechanically — the
session record (states, events, topics); for each
planner-spoken turn its tier, support, ceiling and decline;
at composition sites the full priced member set (spoken +
held) — and diffs them across the three runs. Steering
turns' trace pricing is excluded from the extraction
exactly as §4 carves it out (it is the selected move's own
field); it is printed per turn in the runner output for
inspection. Results: **R4-1 equal, R4-2 equal, R4-3 equal,
R4-4 equal** — no undeclared differences. Differences
present, all declared: spoken levels inside the decisive
windows (R4-1 Water; R4-2 Wood), the red/white order swap
(R4-2 Wood), the selected steering move and its own fields
(R4-3 Wood), the spoken subset (R4-2 and R4-4 Water), and
the carriers of those differences — the disposition header
and the bias records. No paired run reached different
conclusions.

Surface: the leak scan runs over every reply in every
scenario under every composition (pinned in the tests);
bias records live in traces only, and no reply names the
disposition.

## Gates

- `npm test`: **502 pass / 0 fail** (490 baseline + 12 new
  in `test/fork-r4.test.ts`).
- `npm run typecheck`: clean.
- Stage-5 preservation re-run (`scripts/fork-stage5.mjs`):
  pooled feature preservation **97.7%** over 1,079 atoms —
  the recorded stage-5 figure (97.7%); per-family figures
  unchanged in shape (aspect/predicate/tense/voice 100%).
- Foundation files byte-identical (sha256 verified):
  `src/seed.ts`, `src/graph.ts`, `src/engine.ts`,
  `src/propagate.ts`, `src/wordnet.ts` — and `src/fork/
  pricing.ts`, whose ceiling/floor constants and `priceReply`
  stand exactly as R0 left them.
- Not pushed (per the standing rule).
