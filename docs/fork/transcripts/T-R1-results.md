# T-R1 results — slice R1 judged against the frozen scenarios

Run 2026-11-16, after the R1 build (`src/fork/plan.ts` +
the turn.ts wiring), via `node scripts/fork-r1-transcript.mjs`
against the built tree. The frozen expectations are in
`T-R1.md`, unedited. Verdicts are per §6: a reply counts only
when its trace names the derivation it rests on, its support,
its pricing record and the reply graph built from it — a
reply that reads well without those does not count.

Summary: **4 scenarios pass in full or in the part that was
theirs to test (R1-2, R1-4, R1-5, and R1-1 turn 2); three
turns fail, all three on generator-realisation gaps, each
named below.** No expectation was edited after the run.

## R1-1 — quality questions at plain strength

**Turn 1 ("Is winter cold?") — FAIL (wording origin).**
Expected: a reply generated from a plan-built reply graph at
plain strength. Actual reply: "Yes — winter is cold: it is
the season turned most fully toward cold." — the probe's
season degree-profile rendering. The derivation and price
are exactly as expected (path winter —ELEMENT_OF→ Water
—POLARITY_OF→ Yin —HAS_QUALITY→ cold; attested, support 1,
level plain), but no reply graph was built
(wordingNotDerived: true). Mechanism: the profile rendering's
content is a DEGREE — how strongly the quality runs in the
season — and the reply graph has no degree state the EN
generator realises on a predicate clause, so replacing the
rendering with the plan's bare predication would speak LESS
of the derivation than the probe already speaks. The build
retained the rendering and recorded the reason in the trace
(planNote). This is generator gap **G1** (below).

**Turn 2 ("Is the salt cold?") — PASS.**
Actual reply: "The salt is cold." — generated end to end
from the plan's reply graph. Trace names all four required
items: the derivation path (salt —HAS_ELEMENT {food} (0.90)→
Water —POLARITY_OF→ Yin —HAS_QUALITY→ cold), the support
(0.9), the pricing record (attested, ceiling plain, level
plain), and the serialised reply graph (subject node reusing
the person's own "the salt" material; quality node as
predicate root; the declarative 'predicate' edge).
wordingNotDerived: false. This is the winter-class case —
the shared-prior quality question — answered from a
generated graph.

**Turn 3 ("Why is winter cold?") — FAIL (mechanism); the
why-answer is present in content.**
Expected: the causal form built from the derivation — or,
if the generator cannot realise it, the gap recorded and the
wording marked not derived. Actual reply: "Winter is cold,
because it is the season turned most fully toward cold —
cold runs at its strongest there." The because-clause is
there, and it answers why — but it is the probe's
hand-worded profile rendering, not a causal subordinate
realised from a reply graph; no reply graph exists in the
trace (wordingNotDerived: true, the retention recorded in
planNote). Per §6 it does not count as a planned reply.
Mechanism: generate.ts has NO causal-subordinate realisation
at all — the graph's only clause-linking relation,
'condition', realises a conditional, a different relation —
so plan.ts returns the demanded causal form as unrealisable
rather than passing a bare conclusion off as a why-answer.
Generator gap **G2**.

## R1-2 — worry arc (anger shape, different content): PASS

- Turn 1 ("I bought the book."): no derivation, no pricing
  record, wording recorded as not derived, steering note
  present — as expected.
- Turn 2 ("I was worried."): generating steering as expected
  — cyclePath Earth→Metal (generating); the derivation is
  worried's generates: conclusion (…—MUTUAL_GENERATION→
  Metal —CORRESPONDS_TO→ shang （商）); pricing record
  present with weakest tier derived and level possibility
  (support 0.765, middling under a qualified ceiling — the
  §9.2 arithmetic, as authored). The reply takes up turn 1's
  event ("when you bought the book") and asks toward
  expression ("What did you say when you bought the book?").
- Turn 3 ("I made the soup."): controlling steering as
  expected — cyclePath Wood→Earth (controlling); the
  derivation is the restrained-by conclusion
  (…—MUTUAL_RESTRAINT→ Wood —CORRESPONDS_TO→ jue （角）);
  pricing record present (derived, 0.765, possibility). The
  reply acknowledges the event and asks what would help
  settle.

Recorded deviation from §10's compressed acceptance line
("anger turns 2–3 are generated"): turns 2–3 here are
derivation-STEERED and priced, but their wording remains the
probe's, and the trace says so on both turns (planNote:
"steering turn…"). Mechanism: those replies predicate no
derivation conclusion — they acknowledge the person's own
stated state, tied to the recorded event by a temporal
adjunct ("when you bought the book") that the generator
cannot realise on a predicate graph, and ask the steering
question, whose transform (a question built on a gap) is
R3's. Generating the predication core alone would have
dropped the situation uptake the turn discipline requires.

## R1-3 — derived-tier conclusion must not speak plainly: FAIL (primary expectation), guard clause satisfied

Actual reply: "Soup is cold — the two belong together in
everything I have on them." The derivation and price are as
expected (soup —HAS_ELEMENT {food} (0.80)→ Water
—POLARITY_OF→ Yin —HAS_QUALITY→ cold; derived tier, support
0.8, ceiling qualified, level qualified) — but the
conclusion is NOT spoken qualified, and no reply graph was
built. The scenario's outright-failure clause (a plain
assertion with nothing in the trace saying its price went
unspoken) is NOT triggered: the trace names the unrealised
level and the mechanism (planNote: "priced at qualified
(§9.2) but the EN generator realises no qualification state
on a predicate graph…"), and the wording is marked not
derived. Mechanism — generator gap **G3**: the EN generator
realises no qualification state on a predicate graph. Modal
states are dropped on verb clauses ("You would go."
generates as "You go." — verified against parse/generate)
and never read on the predicate path; degree modulators are
read on the ZH predicate path only. So plan.ts returns every
non-plain level (lightly-qualified, qualified, possibility)
as unrealisable rather than writing a qualification the
generator would silently drop — which would have been worse:
a graph claiming a hedge the surface never speaks. Closing
G3 is a generator task (realise modal/degree states on EN
predicate graphs), and until it closes, NO qualified
conclusion can be spoken by the planner in English.

## R1-4 — below the floor declines, ground named: PASS

With the scenario's disclosed fixture (pot — Water, food,
0.35, fork-creative), the only candidate derivation prices
below the floor and the turn declines on exactly that
ground. Actual reply: "I can't answer that from what I
know: what connects pot to cold in my notes is too faint to
answer from." The trace carries the derivation path (pot
—HAS_ELEMENT {food} (0.35)→ Water —POLARITY_OF→ Yin
—HAS_QUALITY→ cold), the pricing record (derived, support
0.35, level decline, declined: true) and the decline ground
with its numbers ("support 0.35 is below the floor 0.4 —
the derivation from pot to cold is too weak to speak
from"). No reply graph was spoken from. The ground is the
support shortfall — not a missing piece (the piece exists)
and not a bare "I don't know" — as §6 requires. (The
decline's surface words are the loop's standing decline
shape; the outcome and its ground are the planner's, and
planNote records exactly that division.)

## R1-5 — no derivation at all: PASS

"I read the book." → "You read the book. What was in it?" —
the probe's wording, unchanged in origin; the trace records
wordingNotDerived: true, names why nothing steered the turn,
and carries no pricing record and no reply graph, as
expected.

## Generator-realisation gaps found (the R1 findings)

- **G1 — degree.** The EN generator realises no degree state
  on a predicate graph, so the season degree profile's
  content (a quality running at its strongest / strong /
  faint in a season) cannot be carried by a reply graph.
  The profile turns therefore remain probe-rendered in R1,
  recorded per turn. (This is also what keeps the scripted
  winter scenario's replies byte-identical — see the pin
  record below.)
- **G2 — causal subordination.** generate.ts realises no
  "because" form from any graph shape. The derivation path
  is carried in the plan record and the trace, so the
  why-form (§7.2) is buildable the day the generator gains
  the construction; today a demanded causal form is
  returned as unrealisable, never faked.
- **G3 — qualification.** No EN qualification state
  (modal or degree) is realised on a predicate graph, and
  modals are dropped on verb clauses. Only PLAIN is
  speakable by the planner in English. Every non-plain
  priced level is returned as unrealisable with the level
  named. This is the binding constraint on §9.2's speech
  pricing until the generator learns the states.

## Pin record (test/fork-pricing.test.ts)

**No pin changes.** All four scripted scenarios produce
byte-identical replies under R1 — the R0 acceptance test
passes unmodified — so no EXPECTED_REPLIES entry changed,
and there are no before/after pairs to itemise. The reason
is G1: the only scripted turns whose wording could have
changed origin are the winter scenario's three question
turns, and all three are season degree-profile turns, whose
rendering R1 retains (turns 1 and 3 are why-questions in any
case, where G2 also applies). One observation for whoever
rules on it later: the generated form of the scripted
turn 2 ("Is summer hot?") would be "Summer is hot." —
capitalised sentence-initially by the generator — which
test/fork-turn.test.ts's Slice-C content match
(/summer is hot/) would reject. That is a second,
independent reason the scripted set cannot change origin
until someone rules on the profile retention or the match;
it was not acted on here.
