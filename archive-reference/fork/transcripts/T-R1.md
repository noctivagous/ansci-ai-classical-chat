# T-R1 — fresh transcript scenarios for slice R1 (FROZEN)

Authored 2026-11-16, BEFORE `src/fork/plan.ts` was written, per
§10's rule: a slice's transcript scenarios are authored before
the slice's code first runs against them and are frozen once
written. Failures against these expectations are findings, to
be recorded in `T-R1-results.md` — this file is not edited to
fit the build's behaviour.

None of these scenarios is copied from the four scripted
scenarios in `src/fork/scenarios.ts`. Expectations are stated
as MECHANISM expectations — what derivation backs the turn,
what strength (§9.2 pricing) it must speak at, what the trace
must name — never as expected verbatim strings, because under
R1 the wording of a planned reply is the generator's, not the
test's. The standing disciplines apply to every turn: the
trace names the derivation, its support and (from R1) the
pricing record and the reply graph where one was built (§6);
no reply names the ontology on the surface (the leak scan);
a decline cites its ground.

## Scenario R1-1 — quality questions answered from derivations at plain strength

Turns:
1. "Is winter cold?"
2. "Is the salt cold?"
3. "Why is winter cold?"

Expectations:
- Turn 1: the shared-prior derivation joins winter to cold
  (path winter —ELEMENT_OF→ Water —POLARITY_OF→ Yin
  —HAS_QUALITY→ cold). Its price is plain (attested tier,
  support 1). Under §2.3 the reply is GENERATED from a reply
  graph the planner builds out of that derivation — topic
  entity as subject, derived quality as predicated state —
  and the trace names the derivation path, the support, the
  pricing record (level plain) and the reply graph itself.
- Turn 2: the same shape through a fork classification: salt
  —HAS_ELEMENT→ Water —POLARITY_OF→ Yin —HAS_QUALITY→ cold,
  attested tier, support 0.9, level plain. The reply is
  generated from the plan's reply graph, at plain strength —
  a bare predication, no qualification — and the trace names
  path, support, pricing and reply graph as in turn 1.
- Turn 3: a why-question. Under §7.2's recorded default
  (policy (a), demand-driven), asking why DEMANDS the causal
  form: the reply speaks the conclusion with the derivation
  path as its causal subordinate, not the bare conclusion
  alone. The trace names the path the clause was built from.
  If the generator cannot realise the causal form from a
  reply graph, the turn must say so in its trace (the gap
  recorded, the wording marked not-derived) rather than
  silently answering a different question.

## Scenario R1-2 — a worry arc in the anger shape, different content

Turns:
1. "I bought the book."
2. "I was worried."
3. "I made the soup."

Expectations:
- Turn 1: a plain event. The book carries no classification
  and no state is recorded, so no derivation backs the turn:
  the reply is the probe's event acknowledgment, the trace
  records why no cycle steered it, carries NO pricing record,
  and (from R1) records the wording as not derived.
- Turn 2: the worried state is classified (Earth, by a
  fork-creative entry — derived tier). The generating
  direction steers the reply (Earth→Metal, generating): the
  trace names that cycle path, the derivation it rests on
  (the generates: conclusion of worried's derivation), and a
  pricing record whose weakest tier is derived and whose
  level the §9.2 arithmetic gives for support 0.765
  (possibility). The reply takes up turn 1's event and asks
  toward the state's expression.
- Turn 3: an event vents the standing state; the reply is
  met from the restraining side (Wood→Earth, controlling).
  The trace names the controlling cycle path, the
  restrained-by derivation it rests on, and its pricing
  record. The reply acknowledges the event and asks what
  would help settle.

## Scenario R1-3 — a conclusion on a derived-tier classification must not speak plainly

Turns:
1. "Is the soup cold?"

Expectations:
- The derivation joins soup to cold through soup's
  classification (soup —HAS_ELEMENT→ Water —POLARITY_OF→
  Yin —HAS_QUALITY→ cold). That classification is
  fork-creative: derived tier. Support is 0.8, so §9.2
  prices the reply at QUALIFIED — its ceiling — never plain.
- The reply therefore speaks the conclusion QUALIFIED, with
  the qualification carried in the reply graph as states the
  generator realises (§2.2), and the trace names the path,
  the support, the pricing record (weakest tier derived,
  level qualified) and the reply graph.
- If the generator cannot realise the qualified level, the
  turn must NOT silently assert the conclusion plainly: the
  trace records the unrealised level and the wording is
  marked not derived. A plain assertion of this conclusion,
  with nothing in the trace saying its price went unspoken,
  fails this scenario outright.

## Scenario R1-4 — a candidate derivation below the floor declines, naming its ground

Fixture (disclosed, synthetic): this scenario runs against a
session whose classification table is extended for the run by
ONE fixture entry — pot: Water, aspect "food", confidence
0.35, provenance fork-creative — the synthetic-load pattern
of the density run and the join tests' injected entries. The
entry is not part of the shipped table; without it, "pot"
has no classification at all and the turn is an ordinary
missing-piece decline, which is not what this scenario tests.

Turns:
1. "Is the pot cold?"

Expectations:
- The only candidate derivation joins pot to cold through
  the fixture classification (pot —HAS_ELEMENT→ Water
  —POLARITY_OF→ Yin —HAS_QUALITY→ cold) at support 0.35.
- 0.35 is below the pricing floor (0.4, §9.2): the priced
  outcome is the DECLINE, whatever the ceiling. The reply
  declines, and its ground names the support shortfall —
  that what connects the pot to cold is too weak to answer
  from — not a missing piece (the piece exists; it is too
  faint) and not a bare "I don't know" (§6).
- The trace carries the pricing record with declined=true,
  the derivation path, and the decline ground with its
  numbers. No reply graph is spoken from.

## Scenario R1-5 — a turn with no derivation at all keeps the probe's wording, marked

Turns:
1. "I read the book."

Expectations:
- No classification, no state, no derivation backs this
  turn. The reply is the probe's existing event
  acknowledgment and follow-up, unchanged in origin.
- The trace records the wording as NOT DERIVED (R1's new
  record), names why nothing steered the turn, and carries
  no pricing record and no reply graph.
