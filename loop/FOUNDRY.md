# AnSci Foundry: CLI and data contract

Status: first `run` implementation, 2026-11-21. Evaluation and comparison
remain design targets. Foundry is the
trace-led development testbed for AnSci's English conversation system.
For the user-facing improvement and resume commands, see root `cmd.md`.
`loop/LOOP.md` describes an existing CSKG executor and its different CLI;
Foundry should reuse useful mechanisms without treating that CLI as the AnSci
turn path.

## Purpose and boundaries

Run the real conversation pipeline without a browser, expose what it understood
and did, compare observations with explicit expectations, and give an agent a
repeatable way to select and verify a small improvement. The initial priority is
English meaning and roles; subsequent slices extend the same loop to module
reachability and behavior. The Five Phases and other ontology effects are
hypotheses to measure, with attribution and ablations where appropriate.

Foundry does not equate parsing with understanding, a trace with correctness,
or a passing self-authored case with independent validation. It reports absent
evidence rather than inventing a graph, role, module activation, or cause.

## Proposed commands

All commands run from the repository root, use compiled current source, and
write machine-readable JSON to stdout with diagnostics on stderr. A wrapper
must build first or refuse a stale build. These command names are proposed:

```sh
npm run foundry --silent -- run --input loop/foundry-cases/english-baseline.json --json
npm run foundry --silent -- evaluate --suite cases/english-development.json --json
npm run foundry --silent -- compare --before results/before.json --after results/after.json --json
```

`run` is implemented; the other two commands are proposed. `run` processes each conversation in a fresh session and preserves turn order.
`evaluate` runs a declared suite and scores only its explicit assertions.
`compare` reports changes, improvements, regressions, and incomparable cases;
it never silently compares different case versions or runtime configurations.
Use exit 0 for successful execution (and no failed required checks for
`evaluate`), 1 for failed required checks, and 2 for invalid input, missing
required resources, or execution errors. Known failures are reported separately;
an unexpectedly passing known failure is also reported for review.

## Input format, version 1

One JSON document contains a version, run configuration, and cases. A case is
an independent conversation; turn IDs are unique within it. Example:

```json
{
  "schemaVersion": 1,
  "configuration": { "profile": "chat", "resources": "required" },
  "cases": [{
    "id": "roles-active-01",
    "status": "must-pass",
    "turns": [{
      "id": "t1",
      "input": "The dog bit the man.",
      "expect": {
        "root": "bite",
        "roles": [
          { "predicate": "bite", "participant": "dog", "role": "agent" },
          { "predicate": "bite", "participant": "man", "role": "patient" }
        ],
        "negated": false
      }
    }]
  }]
}
```

The example expresses an intended semantic contract; implementation must map
it explicitly to actual graph relations and document any vocabulary differences.
Expectations may also specify forbidden roles, resolution targets, uncertainty
or permitted abstention, trace evidence, and reply constraints. Do not treat an
omitted expectation as a negative assertion. Refer to graph nodes by stable
fixture identifiers when repeated lemmas make matching ambiguous. Fixture
metadata must identify author, provenance, development or held-out partition,
and version. Do not weaken an expectation to make a change pass.

## Output format, version 1

Every result contains `schemaVersion`, run ID, timestamp, source revision and
dirty status, fixture digest, runtime profile and actual resource readiness and
versions. Each case contains its ID, status and ordered turn results. Each turn
contains the input, reply, reply provenance when evidenced, the raw structured
trace and map path, and the observed meaning graph or an explicit unavailable
reason. Include checks as `{id, expected, observed, outcome, evidence}` with
outcomes `pass`, `fail`, `abstained`, or `not-observable` as applicable. Keep
raw information alongside any normalized summary so a diagnosis can be
audited. Missing data and parse failures are distinct from empty graphs.

Extract the visitor's semantic object from the same session used for the turn,
as the existing baseball dialogue control does. Establish how to identify it
reliably for repeated inputs and failed turns before relying on surface-text
matching. `TurnResult` currently exposes reply and trace; it does not itself
promise a complete input graph. Where data is unavailable, report that gap.

The current `chat` profile uses `newSession` and synchronous `processTurn` with
an in-memory session, no interlocutor store, and the default clock behavior.
It does not yet prove parity with the browser chat or the file-backed CLI chat.
The `chat` profile must document its actual entry point, session initialization,
providers, and clock. Required resources must be loaded and verified before
processing, with a clear error if unavailable. Pin or record clock and other
settings for reproducibility; don't claim parity with browser deployment until
the two configurations and entry paths have been compared. Optional alternate
profiles must be named and never silently substituted.

## Scoring and safeguards

Begin with explicit graph assertions: predicate, participants and roles,
negation, tense, question type, and reference where observable. Report results
by family, including omissions, incorrect assignments, abstentions, and
not-observable checks. Graph matching must preserve distinct entities and
relations; lemma presence alone is not evidence of correct roles. Report raw
counts and denominators. Compare paired active/passive, reversed-role, negated,
and ambiguity cases alongside negative controls.

Keep builder-authored development cases separate from independently authored
held-out cases. Seal held-out expectations before a measured change and avoid
repeated tuning against them. Define acceptance and regression rules before
running a slice. A result may reveal a missing module, missing knowledge,
incorrect interpretation, faulty reasoning rule, reply-generation problem, or
unsupported input; record competing explanations if the trace cannot decide.

## Agent cycle and progress record

1. Read the task, relevant map and prior progress; establish a reproducible
   baseline and resource configuration.
2. Inspect failed cases and trace evidence; state the earliest supported cause
   and a falsifiable proposed general mechanism.
3. Make one bounded change, using existing libraries and generic modules when
   justified. Record how it reaches `processTurn`.
4. Run focused controls, applicable test tiers, and before/after comparisons;
   run the agreed independent gate at the appropriate checkpoint.
5. Record revision, inputs and digests, commands, outcomes, regressions,
   uncertainty, decision, and a concrete next task in a durable progress record.
   Continue to that task within the user's authorization and resource limits.

Escalate ambiguous causes, repeated unexplained regressions, changes to core
contracts, unresolved data rights, or decisions outside the authorized scope.
Never quietly change a sealed case or count an unconnected module as working.
Use configurable `small`, `standard`, and `review` agent roles rather than
hard-coding model names; task difficulty and failed reviews govern escalation.
Push only under the user's current authorization.

## First implementation slice and acceptance

Implement `run` first by adapting `ansci:audit` and the graph extraction in
`ansci-baseball-dialogue-controls.mjs`; do not fork the conversation engine.
Then add a small independently specified English graph suite and `evaluate`;
add `compare` once two compatible result files exist. The first slice is ready
when a multi-turn run emits valid versioned JSON with real path, reply, resource
status, and observed graph or explicit reason for its absence; repeated runs
under pinned settings are comparable; missing resources fail visibly; and the
existing chat path and relevant controls remain intact. Document measured runtime
and any unresolved parity gaps. A browser is unnecessary for this gate.
