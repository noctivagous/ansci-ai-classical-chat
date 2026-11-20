# T-R2 results — composition of conclusions, judged against the frozen scenarios

Run 2026-11-16, after the R2 build (`planComposition` in
`src/ansci/plan.ts`, the 'and'-chain in `src/ansci/generate.ts`,
the season-set wiring in `src/ansci/turn.ts`), via
`node scripts/ansci-r2-transcript.mjs` against the built tree,
plus the gate runs recorded at the bottom. `T-R2.md`,
`T-R1.md`, `T-R1-results.md` and `T-R1.5-results.md` are
untouched. pricing.ts is untouched — no re-pricing; no new
node or edge vocabulary was introduced; English only.

## What was built

**The composition transform** (`planComposition`, plan.ts).
Its inputs are priced conclusions — subject, quality lemma,
the element the derivation stands on, derivation path,
support, weakest tier, optional degree — and its outcomes
mirror the single-conclusion transform's: a composed reply
graph, a priced decline, or a named unrealisability
(conclusions over differing subjects: composition is over
one subject, §8.7 S13). Pricing is per conclusion and
unchanged: a member below the floor is dropped with the
drop recorded (pricing + ground), and does not drag the
others down; every member below the floor is the decline,
its ground naming each shortfall.

**Both orderings, as data.** Support order: support
descending, ties in enumeration order. Relation order: by
the conclusion's relation to the newest state's element,
with the precedence stated as one data table
(`RELATION_PRECEDENCE`) whose weights are the sense layer's
own support weights — same element 1.0, generating (either
direction) 0.8, controlling (either direction) 0.4,
unrelated 0 — the arbitration pattern §2.1 names, grounded
in §2.1's steering logic (what the state is; then the
generating direction the steering follows; then the
restrainer it addresses; then the unrelated), and carrying
the sense scorer's restraint asymmetry with it (a
controlling relation corroborates, never counts against).
Within a relation kind, ties fall to support, then
enumeration. The active order is `DEFAULT_ORDER` — one named
data constant, value "support" (§7.1's decision) — and both
orderings are computed and recorded on every outcome, so
the comparison §7.1 requires is visible per composition.

**Realisation.** One reply graph: the shared subject node
once; one predication per spoken member in the active order,
each built exactly as planPredication builds one — its own
qualification states from `QUALIFICATION_BY_LEVEL`, its own
degree modulator — so a mixed-strength set keeps each
member's level on its own predication, never flattened.
Consecutive predications are joined by a 'links' edge whose
marker is "and": the graph's existing clause-joining
relation and marker device, the machinery R1.5's causal form
uses with "because". generate.ts's EN predicate path now
walks that chain, composing each clause with the same
predicate machinery (a chained subject repeating the main
subject surfaces as "it", as in the causal form). No causal
subordinate is built by the composition: the causal form
remains the single-conclusion transform's (§7.2), and
composing subordinates for a set is not part of this slice
(the scoping T-R2 froze).

**The wired site.** In `answerPredicateQuestion`: when the
subject carries a season degree profile and the asked
quality is one of the profile's aspect qualities (the
membership table is data in turn.ts — temperature: cold/
warm; light: dark/bright — the two aspects the seed
profiles), the turn composes the profile set: one conclusion
per aspect, each derived by its own shared-prior path, priced
by the same formulas the single path uses (the asked member
reuses the very path, support and tier already computed),
graded by its profile share, enumerated asked-aspect first.
The relation order's reference point is the newest state
from an EARLIER turn (the question turn's own parse state is
the question's content, not a state the reply responds to);
with none, every member is unrelated and relation order
falls back through support to enumeration. The trace gains a
composition record: active order, both orderings, the
newest state taken against, per-member pricing and
derivation path, and any dropped member with its ground.
A why-question is excluded by construction (the causal form
is demanded of the asked conclusion alone) and a subject
with no profile never reaches the composition.

## Verdicts

**R2-1 turn 1 ("Is winter cold?") — PASS.** Reply:
**"Winter is most fully cold, and it is most fully dark."**
One generated reply graph (wording-not-derived false), one
shared subject, two predications joined by a 'links'/"and"
edge; both members attested, support 1, level plain, degrees
strongest (shares 0.85 temperature, 0.82 light). Support
order [cold, dark]; relation order [cold, dark] — no earlier
state stands in the record, so the orders coincide, and the
trace records both, as frozen.

**R2-1 turn 2 ("Is summer hot?") — PASS.** Reply: **"Summer
is most fully hot, and it is most fully bright."** The set
{hot (asked; the person's own lemma, its derivation path
running to the graph's warm node), bright (light aspect,
share 0.82, strongest)}, both plain at support 1; orders
[hot, bright]. The trace's relation order was taken against
turn 1's recorded state (cold, Water): both members stand on
Fire, which Water controls — a controlling relation for each
— so the tie falls through support to enumeration, and the
orders coincide again. This turn's origin change against
the scripted scenario is itemised below.

**R2-1 turn 3 ("Is autumn dark?") — PASS.** Reply: **"Autumn
is fully dark, and it is fully cold."** The asked quality is
the light aspect's, and the set is enumerated asked-first:
[dark, cold] — dark at degree strong (share 0.58), cold at
strong (0.55) — both plain; support order [dark, cold]: on
the tie the asked quality leads, as frozen.

**R2-1 turn 4 ("Why is winter cold?") — PASS.** Reply:
**"Winter is cold, because it is most fully cold."** — the
R1.5 causal reply, unchanged; no composition record is
taken. The frozen scoping holds: the causal form is the
single-conclusion transform's, and composition does not
apply to a why-question.

**R2-2 (composition over derive()'s salt conclusions,
newest state Wood) — PASS, with the genuine disagreement.**
The members were harvested from the real join in its own
conclusion order — black and salty (correspondence, Water,
0.9, established → lightly-qualified), green and sour
(cycle-neighbour generates:, Wood, 0.765, established →
qualified) — plus the disclosed fixture member (cold, 0.35,
derived). Results, exactly as frozen:

- Support order **[black, salty, green, sour]**; relation
  order **[green, sour, black, salty]** — the Wood members
  are the same element as the newest state (furious, Wood,
  established by a real turn) and lead under relation order;
  the Water members follow (Water generates Wood). The
  orders disagree in the leading member and overall. A
  genuine ordering disagreement IS constructible from the
  real graph — over the join's conclusions, whose members
  stand on different elements at different supports. (At the
  turn loop's speaking site it is not: a season set's
  members share the subject's one classification and one
  support per path family, and R2-1's traces show the two
  orders coinciding there. Both halves of that finding are
  the frozen file's own framing, now evidenced.)
- Active order (the DEFAULT_ORDER data constant, support):
  **"The salt is likely black, and it is likely salty, and
  it may be green, and it may be sour."** With the order
  passed as data ("relation"), the same members at the same
  prices speak as **"The salt may be green, and it may be
  sour, and it is likely black, and it is likely salty."** —
  switching the default is that one data change, and the
  trace records both orderings under either setting.
- Mixed strength kept per member: black/salty carry the
  hedge modulator ("likely") on their own predications,
  green/sour the modal state "may" on theirs — verified in
  the graph, not only the surface (fork-compose.test.ts).
- The fixture member is dropped: absent from the graph and
  from both spoken orderings, recorded with its pricing and
  its ground ("support 0.35 is below the floor 0.4"). The
  composition speaks without it.
- The frozen caveat stands and is repeated here: this
  scenario pins the composition's ordering, pricing and
  drop rule over real priced conclusions; the turn loop does
  not speak correspondence conclusions as quality
  predications today, and several correspondence labels are
  not adjectives of the sentence lexicon. The composed
  sentences above are the transform's output over the join's
  own conclusion labels, not a claim that a speaking site
  for them exists yet.

**R2-3 (boundaries) — PASS.** "Is the salt cold?" →
**"The salt is cold."** and "Is the soup cold?" → **"The
soup may be cold."** — byte-identical to the R1/R1.5 forms,
no composition record on either trace: no profile, no set,
nothing changed where there is one conclusion. The
all-below-floor composition declines with its ground naming
the member's shortfall; the empty composition declines
("no conclusions were offered to compose") — neither is an
empty reply or a bare "I don't know" (§6).

## Non-regression and the itemised origin changes

Wording changed ONLY where a turn's origin changed from a
single predication to a composed set under R2 — both are
season questions in the set's scope, both itemised here:

| turn | before (R1.5) | after (R2) | mechanism |
|---|---|---|---|
| scripted winter-cold turn 2, "Is summer hot?" | "Summer is most fully hot." | "Summer is most fully hot, and it is most fully bright." | §7.1/§8.7 S13: the season question composes the profile set — the light-aspect quality joins the asked one in a single composed reply graph |
| T-R1 scenario R1-1 turn 1, "Is winter cold?" (also fork-realise's wired-sites pin) | "Winter is most fully cold." | "Winter is most fully cold, and it is most fully dark." | the same set composition, over winter's profile |

Consequent pin updates, each with its reason recorded at the
site: `test/ansci-pricing.test.ts`'s EXPECTED_REPLIES
winter-cold entry for "Is summer hot?" (and the acceptance
test's title and header note now name R2's change beside
R1.5's); `test/ansci-realise.test.ts`'s wired-sites assertion
for "Is winter cold?"; `docs/ansci/transcript-sample.md`
regenerated by its own harness. T-R1's other turns are
byte-identical (salt and soup single-conclusion; the why
turns causal), the anger/worry steering turns are untouched
(their replies predicate no conclusion — R1's recorded
scope), and the four scripted scenarios otherwise stand.

New tests: `test/ansci-compose.test.ts` (13) — both orderings
over the real join harvest and their disagreement; the
DEFAULT_ORDER constant and the data-only switch; the
relation-kind precedence against the sense weights; the
drop rule and the all-below-floor/empty declines; per-member
qualification in the graph; the S13 graph shape (one subject
node, 'links'/"and" joins); differing subjects unrealisable;
the turn-level wiring (season set composed with its record,
asked-first enumeration, why-question excluded, profile-less
subjects unchanged); and the leak scan over every composed
surface.

## Gates

- **Tests: 472 pass / 0 fail** (baseline 459; +13 new in
  fork-compose.test.ts; pin updates as itemised above).
- **Typecheck: clean** (`tsc --noEmit`).
- **Round-trip preservation (stage-5 measurement,
  scripts/ansci-stage5.mjs): held exactly.** Pooled feature
  preservation 97.7% over 1079 atoms; §5.1 generation
  direction 13/15 exact, negator present 14/15; §5.3 F1
  family 12/12; §5.4 temporal 4/4; corpus 80/80 parsed, 0
  generation failures — identical to R1.5's recorded numbers.
  Held rather than changed, for a statable reason: the frozen
  corpus's parsed graphs carry no 'links'/"and" chains on a
  predicate root, so the new realisation has nothing to fire
  on there; it fires on planner-built composition graphs.
- **Foundation files byte-identical** (sha256, matching the
  values R1.5 recorded): src/seed.ts 9aaef80a…,
  src/graph.ts e15ee119…, src/engine.ts 5fd29ef3…,
  src/propagate.ts 982779ac…, src/wordnet.ts fd7bb4b2….
  pricing.ts untouched, as required.

## Still unrealisable, named

- **Composing causal subordinates for a set.** A why-question
  over a season still takes the single-conclusion causal
  path; a set-wide causal form ("why" answered for every
  member) is not built. The scoping was frozen in T-R2
  before the build, and R2-1 turn 4 pins the boundary.
- **A speaking site for correspondence conclusions.** The
  composition transform orders and prices the join's
  conclusions correctly (R2-2), but no turn-loop site speaks
  a correspondence row as predications of its subject — the
  surface form for that material is the definition-form work
  (§8.7 S16) of a later slice, not R2's.
- **The relation order's reference at the question site is
  thin.** It reads the newest earlier state in the record;
  in a fresh session there is none, and relation order
  degenerates to support-then-enumeration (recorded in the
  trace as the absence of a newest state). Nothing richer —
  an intent arc, a topic weighting — exists in the record
  yet for it to read (§1 scope).
