# FND-101 — independent English expectations: progress record 2026-11-22

Suite: `loop/foundry-cases/english-development.json` (v1, development partition,
12 cases, 13 turns). Structure-validated and observability-checked with
`/tmp/fnd101-validate.mjs`: every input yields a visitor meaning graph through
`newSession + processTurn` (output: `OK: 12 cases ... all graphs observable`).
No scoring was done — `run` rejects `expect` blocks and `evaluate` is not
implemented (FND-102). This record is the vocabulary mapping FND-102 needs.

## Expectation vocabulary and graph mapping

- `root`: lemma of the node at `meaningGraph.rootId`.
- `roles[]`: edges `head -> dependent : relation`, matched by lowercase lemma:
  `{predicate: head-lemma, participant: dependent-lemma, role: relation}`.
  The predicate/participant names are verb-case names; for non-verbs the head
  may be a noun (reference-places-01/t2: `ball -> york : location`).
- `forbiddenRoles[]`: same shape; the edge must NOT exist. Negative controls.
- `attached[]`: an edge head -> participant must exist; relation unasserted.
  Used where patient/theme granularity is parser-specific (`chase`, `see`)
  so the suite does not bake in a representation choice.
- `roleOpen[]`: subset of `attached` where more than one relation is
  semantically live (ambiguity-instrument-01: telescope with `see`).
- `tense` / `mood` / `voice`: `root.states` on the graph root node.
- `negated`: `states.negated`; `negationCarrier`: `states.negation.carrier`.
- `construction`: `states.construction` (existential, reference t1).
- `qualifier[]`: `modifier -> head : relation` edges (ball qualifies game,
  new qualifies york — multiword place survives as a qualified node).
- `resolution`: `{pronoun, target, evidence}` checked against
  `trace.resolutions` entries (`{pronoun: it, resolvedTo: ball}`).
- `questionTarget`: the wh-word fills `{predicate, role}` (who is bite/agent).
- `reply.constraints`: `no-event-outcome` (polar: must not assert whether the
  event happened), `no-agent-identity` (wh: must not invent the agent);
  `abstentionPermitted: true` in both. Current decline replies satisfy these.

## Deliberate non-assertions

- reference-places-01/t2 asserts no `root`: the observed root is the `york`
  node, a representation decision for copular-locatives, not semantics.
  (An earlier draft asserted `ball`; the probe showed `york`. Corrected.)
- question-passive-01 asserts no `tense`: same open question as tense-passive-01.
- chase/see dependents assert `attached`, not patient-vs-theme.

## Known failure recorded in the suite

- tense-passive-01 (`known-failure`): "was bitten" expects `tense: past`,
  `voice: passive`. The system reports `tense: present` + `aux: was`
  (baseline §5; ENG-101). Roles for the same sentence are must-pass in
  roles-passive-01, so the failure is isolated to tense, not interpretation.

## Limits

Builder-authored, development partition only; no held-out set yet. Reply
constraints are strings awaiting formal checks in FND-102. Clock unpinned;
browser parity unverified (FND-200/201, unchanged).

Next: FND-102 — implement `evaluate` against this vocabulary.
