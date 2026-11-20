# T-R7.5 — results: record-first answers at the question site

Run 2026-11-16, against the expectations frozen in
T-R7.5.md before the build. Suite: 542 pass / 0 fail (531
baseline + 11 new tests in test/ansci-r7.5.test.ts);
typecheck clean; stage-5 pooled feature preservation 97.7%
(the recorded instrument range, unchanged); dashboard build
succeeds.

## Verdicts on the frozen expectations

- **(a) The §11.4 sequence — MET.** "Is the soup cold?"
  after cold → hot → cool is answered "The soup is cool." —
  the standing state, predicated plainly, no modal from the
  table's price. The trace carries answeredFromRecord: the
  standing state (cool, turn 3), the slot determination
  (the 'temperature' aspect slot), the supersession chain
  (cold → hot at turn 2; hot → cool at turn 3), and the
  recording skip. No pricing record, no derivation path.
  The soup's standing states at the end are exactly [cool].
- **(b) Match control — MET.** "The soup is cold." stated,
  then asked: answered from the record, "The soup is
  cold.", trace naming the record (state cold, turn 1); the
  question's own recording set aside — exactly one cold
  stands.
- **(c) Different-aspect control — MET.** Standing sweet
  (aspect 'taste') does not answer a cold question (aspect
  'temperature'): the derivation proceeds byte-identically
  ("The soup may be cold.", priced qualified as today), and
  recording proceeds as today (F3) — sweet and cold both
  stand.
- **(d) No-standing-state control — MET.** "Is the salt
  cold?" is byte-identical to today, pricing record and
  derivation path included.
- **(e) Replacement is the asked quality — MET.** Asked
  "Is the soup hot?" after cold → hot: answered from the
  record with the replacement, "The soup is hot.", the
  chain (cold → hot) on the trace; exactly one hot stands.
- **(f) Negated standing state — MET.** "The soup is not
  cold." stands as cold under negation; asked "Is the soup
  cold?", the record predicates it as it stands: "The soup
  is not cold."
- **(g) Why against a contradicting record — MET.** "Why
  is the soup cold?" with cool standing: the record
  answers "The soup is cool."; no causal form is built
  from the cold derivation.
- **(h) Why matching the record — MET.** Behaviour 2's
  sequence is unchanged: "Winter is cold, because it is
  most fully cold.", derivation and pricing as today.

## The dashboard check, re-run

scripts/ansci-r7-dashboard-check.mjs exits 0. All seven
behaviours MET, including Behaviour 4: the later turn's
reply is "The soup is cool.", the standing states for the
soup at the end are exactly [cool], and both correction
deltas stand as before. T-R7-dashboard-check.md is
regenerated from this run. Behaviour 1's turn 4 also
changed, by the same rule (itemised below): "As for the
soup, it is cold." — the record answering with the return
marker earned as before.

## Per-site inventory: where else a derivation answers

The rule was applied at the one site that answers a
predication question by deriving, and audited at every
other site that derives:

- **answerPredicateQuestion (the predication question
  site)** — the rule is implemented here, at its head,
  before the missing-piece computation and the shared-prior
  path. It covers BOTH branches below, which are this
  function's own continuations:
  - *the single-conclusion path (planPredication)* —
    covered by the same head check.
  - *the season composition path (R2, planComposition)* —
    covered by the same head check: a season subject with
    a standing state in the asked slot is answered from
    the record before the set is composed. No frozen
    scenario exercises that combination (the composition
    scenarios ask about seasons never stated about), so
    no earlier result changes; the disposition is stated
    here so the coverage is deliberate, not accidental.
  - *why-questions* — the same site (the isWhy flag). The
    record answers only on contradiction (T-R7.5 (g)/(h)):
    a why asks for the derivation itself, and where the
    standing state IS the asked predication the derivation
    predicates nothing against the record.
- **The event-question decline site** (interrogative verb
  roots: "What did I put in the soup?") — cannot conflict:
  it derives nothing and predicates no quality; it declines
  on the record's own contents (a missing role in a
  recorded event) or on the question's shape.
- **The steering branches (a)/(b)/(c)** — cannot conflict:
  they predicate no derivation conclusion (their traces
  record exactly that, noteSteeringScope); what they speak
  is the person's own recorded content, which is the
  record by construction.
- **The need site (branch (e))** — cannot conflict: it
  predicates no quality of any subject; it derives the
  THEME's taste correspondence and asks after it. The
  subject's standing states are not its material.
- **The initiative predication (R6)** — cannot conflict:
  it predicates a standing state itself, priced from that
  state's origin. It is the record speaking, not a
  derivation against it.
- **The correction site (R5)** — cannot conflict: it is
  the record's own write path; the question turns that
  reach the question site never trigger it (mood-gated).

## Itemised changes to earlier sets

Every change below is a case where a standing state
genuinely occupied the asked quality's slot — the rule's
own condition. Nothing else moved: the T-R1–T-R4
transcript scripts re-run byte-identical, and the scripted
scenarios are unchanged.

1. **test/ansci-r5.test.ts, R5-1** — reply "As for the
   soup, it may be cold." → "As for the soup, it is
   cold." (standing cold occupies the slot; the return
   marker and its ground are unchanged, now riding the
   record graph).
2. **test/ansci-r5.test.ts, R5-1b** — reply "The soup may
   be cold." → "The soup is cold." (same occupation; the
   negative control's assertions — no cohesion, no marker
   edge — stand unchanged).
3. **test/ansci-r5.test.ts, R5-2** — the scenario (hot
   standing, cold asked) is displaced as a contrast pin:
   the record answers "The soup is hot." The test now
   pins the record answer; the derivation-site contrast
   it originally pinned is preserved in
   test/ansci-r7.5.test.ts, at a site the record does not
   occupy ("The soup is hot." / "Is the salt cold?" →
   "But the salt is cold.", contrast marker and ground
   as before).
4. **T-R7-dashboard-check.md, Behaviour 1** — turn 4's
   reply "As for the soup, it may be cold." → "As for
   the soup, it is cold.", and the end-of-conversation
   standing list loses the duplicate soup/cold (the
   recording fix). All Behaviour 1 checks still pass.
5. **T-R7-dashboard-check.md, Behaviour 4** — the
   finding itself: reply "The soup may be cold." → "The
   soup is cool."; standing states at the end "cool,
   cold" → "cool". Verdict NOT FULLY MET → MET.

## The trace representation, stated once

A record answer's trace carries `answeredFromRecord`
(the standing state with its turn, the asked quality, the
slot determination in words, the supersession chain for
the slot, the recording skip when one happened) and NO
`pricing` and NO `derivationPath`. The dashboard renders
the record answer under the derivation section of the
trace view (Ask.tsx): the standing state, its turn, and
the correction chain behind it, with the note that no
derivation or pricing stands behind the reply.
