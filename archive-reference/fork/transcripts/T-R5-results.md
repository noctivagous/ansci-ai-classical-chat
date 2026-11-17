# T-R5 — results (slice R5: cohesion, echo, repair)

Run 2026-11-16 against the frozen scenarios in `T-R5.md`
(that file is untouched). Verdicts are per scenario, from the
turn loop's actual replies and traces; the suite pins them in
`test/fork-r5.test.ts`.

## R5-1 — return — PASS

Turn 4 of ["The soup is cold.", "I was furious.", "I shouted
at him.", "Is the soup cold?"] replies **"As for the soup,
it may be cold."** The trace's cohesion record names the
relation (return), the marker ("as for") and the ground —
the topic raised at turn 1, last touched at turn 1, two
intervening turns — and the serialised reply graph carries
the 'links' edge marked "as for" from the subject node to
the predicate root. Turns 1–3 are byte-identical to the
pre-R5 build.

**Negative control R5-1b — PASS.** ["The soup is cold.",
"Is the soup cold?"] replies "The soup may be cold." — no
cohesion record in the trace, no marker edge in the graph.
The topic was touched on the immediately preceding turn, so
no reactivation exists, and none is claimed.

## R5-2 — contrast — PASS

["The soup is hot.", "Is the soup cold?"] turn 2 replies
**"But the soup may be cold."** The cohesion record's ground
names the standing state (hot, Fire, turn 1) and the
controlling relation the reply's content stands in to it
(cold, Water, controls Fire). The control is R5-1b: the same
reply content with no controlling relation in the record
carries no marker. Turn 1 is unchanged.

## R5-3 — echo — PASS

The serialised reply graph for ["I made the soup yesterday.",
"Is the soup cold?"] shows the subject node as the person's
own material — lemma "soup", form "soup", det "the" — not a
bare lemma node. The same provenance holds at the slice's
two new constructions: the fronted phrase in R5-1 realises
"the soup" with the person's determiner, and the correction
graph in R5-4 is built over the subject node from the
correction turn's own parse (det "the" in its serialised
graph).

## R5-4 — correction by restatement (value) — PASS

- Turn 2 ("The soup is hot."): the value rule fires; exactly
  one delta (replaced cold@1 → replacing hot@2); the reply
  is generated from the delta graph — **"The soup is not
  cold, but it is hot."** — and preempts steering (no cycle
  path claimed).
- Turn 3 ("The soup is cool."): the rule fires against the
  CORRECTED state — delta replaced hot@2 → replacing cool@3,
  reply "The soup is not hot, but it is cool." After turn 3
  the soup's only standing state is cool. The later turn
  reads the record post-supersession, as required.
- **Control R5-4b — PASS.** A first "The soup is hot."
  records no supersession and no correction record; the
  state stands as a new state under ordinary steering.

## R5-5 — correction by negation (polarity) — PASS

- Turn 2 ("I am not furious."): one delta through
  `supersedeState` — replaced furious (positive, turn 1),
  replacing furious (negated, turn 2) — and the reply is the
  collapsed delta graph, **"You are not furious."**
- Turn 3 ("I shouted at him."): no venting cycle path is
  claimed. The trace's steering note names the skip: the
  standing state is the negated 'not furious', a negated
  state is not a state an event vents, and it was passed
  over. The record holds exactly the one negated state; the
  superseded positive state is not in the record at all.
- **Control R5-5b — PASS.** A first "I am not furious."
  records the negated state as new, with no supersession —
  which also pins the recording fix the slice needed: before
  R5 the predicate site dropped the parsed negation and this
  sentence recorded a second positive state.

## Further behaviour the build established (unit-pinned)

- **A question never triggers.** "Is the soup hot?" after
  "The soup is cold." records its state but supersedes
  nothing. A restated same value at the same polarity does
  not trigger either.
- **Verb-carried corrections record, but do not graph.**
  "I can't sleep." → "I can sleep." records the polarity
  delta through the turn loop (the R0 shape), the corrected
  state stands and steers ("You sleep. …"), and the
  correction record carries a note naming why no
  acknowledgement graph was built: 'sleep' names something
  the person does, not a quality the predication
  construction predicates. The first version of this build
  let the graph be attempted and produced "You are not
  sleep, but it are sleep." — the gate now stands in front
  of the construction, and the gap is named in the trace
  instead of spoken.
- **Person subjects repeat in chained clauses.** The delta
  graph for "I was furious." → "I was worried." generates
  "You were not furious, but you were worried." — the
  generator's repeated-subject anaphora now uses "it" only
  for things (the causal subordinate's override got the
  same guard). Un-negation ("I am not furious." → "I am
  furious.") generates the two-clause delta form "You are
  not furious, but you are furious." — both states named,
  as the frozen construction rule states; it reads as a
  correction acknowledgement, stilted but exact.

## Itemised changes in earlier sets

Every pre-existing test (502) passes unmodified, and the
four scripted scenarios' replies are byte-identical to the
pre-R5 probes. The reply changes in earlier transcript sets
are exactly these, each with its earning relation:

1. **T-R2's question sequence, turn 4** ("Why is winter
   cold?" after winter/summer/autumn questions): "Winter is
   cold, because it is most fully cold." → **"As for
   winter, it is cold, because it is most fully cold."**
   The return relation genuinely exists (winter raised at
   turn 1, untouched through turns 2–3, reactivated at
   turn 4) — the change anticipated in T-R5 §8. The single-
   turn form (fresh session) is unchanged.
2. **An unpinned steering sequence changed kind, by the
   trigger rule's own terms:** "I was worried." → "I was
   furious." previously steered as a restrainer address
   (branch (a): furious controls worried); under the value
   rule the second statement is a correction of the first
   (same holder, same aspect slot 'emotion', different
   value) and now replies "You were not worried, but you
   were furious.", with worried superseded. No test or
   transcript set pinned the old reply. This is the trigger
   rule the slice was instructed to implement, applied to a
   sequence the parser cannot mark either way — recorded
   here so the choice is visible: where a restatement and a
   new state are indistinguishable, the record now reads
   the later same-slot value as the correction of the
   earlier one.

No marker appears anywhere its relation does not exist:
the two negative controls pin the absences, and the full
suite's pinned replies (which include every T-R1–T-R4
turn the earlier slices chose to pin) are unchanged.

## Scoping recorded

- **Continuation and consequence are not realised** (T-R5
  §1, stated before the build): continuation is the default
  condition of the question sites and marking it would be a
  connective tic; consequence has no site, since no planner
  derivation in the current wiring starts from a prior
  state. Both stand in the mapping data (`COHESION_MARKERS`)
  and the generator realises the sentence-initial device for
  all four markers; detection earns return and contrast.
- **Sentence-initial correction markers are a parser
  limitation**, recorded in T-R5 §0: "No, …" / "Actually, …"
  lose their subject in the current parser, so the slice's
  correction shapes are the plain restatement and the
  negation — the forms the parser supports.
- **The acknowledgement is unpriced** at every site the
  parser supports (T-R5 §7): no derivation backs a corrected
  state (soup → hot has no path in the net; a person's
  states have no holder derivation), so the delta graph is
  the record's own predication. The priced variant is not
  built.
- **Verb-carried corrections** supersede and steer on the
  corrected state but build no acknowledgement graph (see
  above); the gap is named on the correction record.

## Gates

- `npm test`: **518 pass / 0 fail** (502 pre-existing, all
  unmodified, + 16 new in `test/fork-r5.test.ts`).
- `npm run typecheck`: clean.
- Stage-5 preservation re-run (`npm run fork:stage5`):
  **pooled feature preservation 97.7% over 1079 atoms** —
  identical to the pre-R5 figure.
- Foundation files (`src/seed.ts`, `src/graph.ts`,
  `src/engine.ts`, `src/propagate.ts`, `src/wordnet.ts`) and
  `src/fork/pricing.ts` are byte-identical (untouched; their
  modification times predate the slice). Files changed:
  `src/fork/session.ts` (supersedeRecord added),
  `src/fork/plan.ts` (cohesion mapping + marker wiring,
  planCorrection), `src/fork/generate.ts` (cohesion
  realisation, "but" chain join, person-subject anaphora
  guard), `src/fork/turn.ts` (topic snapshot, correction
  trigger + reply, cohesion detection, venting skip,
  predicate-site negation recording), plus this slice's
  frozen scenarios, these results, and the new test file.
- Disposition-neutrality: no bias channel was touched and
  every scenario above ran under the default neutral
  composition; the R4 suites pass unmodified.
