# AnSci repository commands

This file is a command guide for an AI coding agent working in this repository.
The user can invoke a command in ordinary language, for example:

> Read cmd.md and run **improve system**.

`cmd.md: improve system` is shorthand for the same request when the CLI agent
receives that text. This file is not an executable shell program or a guarantee
that a CLI will load it automatically: the agent must be asked to read it, or
its CLI must be configured to include it. Direct user instructions and the
agent's operating permissions take precedence over this guide.

## menu

When the user says `cmd.md: menu`, show this top-level menu with one-line
descriptions and ask which command they want. Accept names or numbers and
ordinary language. If the requested command and its input are already clear,
proceed without displaying the menu first.

1. **improve system** — choose an improvement and work on it for a timeframe.
2. **resume improvement** — continue a recorded improvement run.
3. **commission work** — give a goal and timeframe; let the agent plan and proceed.
4. **investigate transcript** — locate and explain conversation failures.
5. **check system** — run relevant existing controls and report their results.
6. **audit module** — assess a module's implementation and reachability.
7. **inspect understanding** — show how AnSci interpreted an English input.
8. **review progress** — summarize recent work and evidence.
9. **evaluate proposal** — assess a library, dataset, or design for AnSci.
10. **analyze next** — assess the tracker and evidence; recommend what to improve next.

Commands are instructions to the agent, not shell commands. Follow the user's
scope and current permissions; suggest a concrete next step when reporting.

## Next commands (required after every command)

After completing any command in this file, end the response with a short
**Next commands** section. Recommend one best next command and, when useful,
one or two alternatives. Use this tree to select relevant follow-up work:

```text
menu
├── analyze next ── choose the highest-value ready task from the tracker
│   └── improve system ── select work, set a timeframe, then execute
├── commission work ── set a goal and timeframe; plan briefly and execute continuously
├── inspect understanding ── inspect a sentence's actual graph and trace
│   ├── investigate transcript ── diagnose a supplied conversation failure
│   └── improve system ── fix a supported, in-scope cause
├── audit module ── check implementation and live-path reachability
│   └── improve system ── connect or complete a supported gap
├── check system ── run focused headless controls
│   └── review progress ── summarize evidence and remaining work
├── evaluate proposal ── assess a tool, dataset, or architecture
│   └── analyze next ── prioritize it against current system gaps
└── resume improvement ── continue the saved task and progress record
```

Name commands exactly as listed in this file and give a brief reason for each
recommendation. Only recommend a command that exists here. If a command
requires user input or a timeframe, say so. If the best next step is outside
this command set, state it plainly as a recommendation and offer the closest
available command; do not invent a command name. Keep this section to a few
lines so it remains useful after short and long tasks alike.

This applies after successful work, an investigation, a blocked result, or an
error report. For `menu`, show the menu and then identify the most relevant
starting command from the user's context. If the user explicitly asks for no
suggestions, follow that instruction for that response.

## improve system

Use AnSci Foundry to identify and implement an evidence-backed improvement to
the system. The immediate priority is understanding English; the broader goal
is working, reachable system modules and organically generated conversation.
Generic mechanisms and ontology may help, but their effects must be measured.

### Choose work and a timeframe

1. Read `loop/FOUNDRY.md`, `loop/foundry-tasks.yaml`, the latest relevant Foundry results, `GAPS.md`, and
   the relevant code and controls. Check the repository's current branch and
   working tree before editing; preserve other work. Inspect only the portions
   needed to propose the options.
2. Offer two or three concrete choices based on current evidence. For each,
   state the problem, why it matters, the expected evidence of improvement,
   and any important uncertainty. Recommend one. Include an option to propose
   another task. Do not present a known failure as a proven diagnosis.
3. Ask the user to choose an option and provide a wall-clock working timeframe
   (for example, one hour). If the user has already supplied either, use it;
   ask only for what is missing. Do not treat silence as a choice or timeframe.
   If they direct the work immediately without a timeframe, ask for one before
   beginning the time-bounded loop.

### Work continuously within the chosen scope

Record the actual start time and deadline, the selected objective, and a short
plan in a durable progress entry under `loop/foundry-results/`. Use the current
clock to check remaining time throughout; allow time for verification and a
handoff. A timeframe is a target for active work, not a promise that the CLI
can run unattended or resume after its session ends. Do not claim to keep
working after the session has stopped. If interrupted, the next agent should
read the progress entry and check the working tree before resuming.

For each bounded slice:

1. Reproduce the behavior using the real turn path and record the input,
   resource configuration, output, graph when available, and trace. Prefer the
   headless Foundry CLI and existing controls; use a browser when the question
   actually concerns browser behavior or deployment.
2. Classify the first supported cause as missing module, missing knowledge,
   incorrect interpretation, faulty reasoning rule, reply generation, or
   unsupported input. Record uncertainty and alternative explanations when
   the evidence does not resolve them. Check whether existing code is reached
   before concluding it is missing.
3. Make a small, general improvement where the evidence supports one. Define
   expected effects and negative controls before measuring. Keep knowledge,
   interpretation, reasoning, and wording concerns distinct. Do not add a
   special-case response to fit a single transcript.
4. Run relevant focused checks and applicable repository gates. Compare before
   and after, including regressions and cases where the system abstains. A
   parse or round trip alone does not prove correct understanding. Do not tune
   repeatedly against sealed or independently held-out cases.
5. Update the relevant task and subtasks in `loop/foundry-tasks.yaml`, and the progress entry with commands, results, changes, limitations,
   and a concrete next step. If time remains and that step is within the
   selected scope and user authorization, proceed without waiting for another
   prompt. Select a different approach if evidence rules out the prior one.

Use small, standard, or review model roles when the CLI supports them and the
user has authorized delegation: choose the least costly role suitable for the
task, and escalate difficult diagnosis, design, or review. Do not assume that
model switching or autonomous background execution exists in a particular CLI.

Pause for the user when a needed decision is outside the selected scope, a
permission or external action is required, a data license is unresolved, or
repeated regressions cannot be explained. A difficult task by itself is not a
reason to stop. Never alter held-out expectations to make a result pass.
Commit useful work when authorized; push only when the user's current
instructions authorize pushing. Respect any newer user instruction immediately.

### At the deadline or a pause

Leave the repository and progress record in a resumable state. Report what
changed, evidence and checks, known gaps or unfinished work, any commits, and
the next recommended step. Include the exact command needed to resume if it is
useful. Do not portray an unfinished run or unverified result as complete.

## resume improvement

When the user says `cmd.md: resume improvement`, inspect the task tracker and latest Foundry
progress record, repository status, and current instructions. Summarize the
previous objective and next step, then ask for a new timeframe if one was not
provided. Continue within the previously selected scope unless the user changes
it. Recheck any baseline that may have become stale.

## commission work

Use this mode when the user gives a goal and a time budget and wants the agent
to keep progressing through the best next steps. Example:

> Read `cmd.md`. Commission work to improve English question understanding
> for one hour. Follow the Foundry tracker, update progress, and commit verified
> slices, but do not push.

Before acting, confirm from the request the goal, scope, timeframe, and commit
or push boundary. Ask only for information that is missing and materially
changes the work. If the goal and timeframe are explicit, do not insert the
`improve system` options round; give a brief proposed sequence and begin. A
plan is a status update, not a request for approval. If the user gives a goal
but no timeframe, ask for the timeframe while doing useful read-only scoping.
If the goal is too broad for the budget, choose and state a valuable first
bounded slice, preserving the broader goal in the progress record.

Create a progress entry under `loop/foundry-results/` with objective, included
and excluded scope, actual start and deadline, planned slices, model tier,
baseline or starting evidence, status, and next action. Mark relevant tracker
tasks `in_progress` when work starts; add tasks with stable IDs if needed.
Then work continuously through implementation, controls, and evidence updates
until the stated outcome is met, time expires, or an escalation condition in
`improve system` applies. At each slice boundary, update the progress entry and
tracker, identify the best in-scope next step, and proceed without waiting for
another prompt. Reorder or replace slices when results invalidate the plan;
record why. Keep enough time for verification and a clear handoff. Do not
promise background work after the active session ends; the progress entry must
allow a later `resume improvement` command to continue it.

The user authorizes work inside the stated goal and time budget. Treat commit,
push, deployment, external messages, purchases, and other external effects
according to the user's explicit boundary and the repository's current
instructions; a request for continuous implementation does not itself imply
permission to push. Never broaden the task merely because time remains. If the
user says “up to” a duration or gives a stopping condition, stop when it is
met. Report actual elapsed work, completed and incomplete slices, checks and
their results, commits, tracker changes, and the next recommendation.

## investigate transcript

Example: `cmd.md: investigate transcript`, followed by a conversation and its
traces. Obtain the transcript if it was not supplied. Preserve turn order and
any supplied environment information; reproduce with Foundry when possible,
and identify configuration differences and any behavior that cannot be
reproduced. Inspect the first point where the observed meaning or behavior
diverges from a supported expectation, along with later consequences. Classify
likely causes using the categories in `improve system`, distinguish evidence
from hypotheses, and identify the relevant code and trace fields. Explain the
findings in plain language and suggest a general fix and controls. An
investigation alone does not authorize modifying the system; implement a fix
when the user's request also calls for one.

## check system

Example: `cmd.md: check system — parser`. Identify the requested scope; if none
is supplied, choose a practical headless overview and say what it covers. Read
current scripts and test-tier instructions before selecting commands. Existing
starting points include `npm run ansci:audit`, `npm run ansci:parser-compare`,
`npm run ansci:root-copula-controls`, `npm run ansci:baseball-dialogue-controls`,
and the relevant `test:t0` or `test:core` tiers. Choose controls appropriate
to the question, report commands and configuration, and distinguish failures,
known gaps, skipped checks, and checks not run. Do not call a limited check a
full system audit. Foundry `evaluate` and `compare` are design targets until
implemented; inspect their current status instead of assuming they exist.

## audit module

Example: `cmd.md: audit module — ErrorFailure`. Find the relevant map node,
implementation, callers, tests, inputs and outputs. Trace its route from the
live chat entry point and distinguish built and reachable, built but unwired,
partial, unbuilt, and not yet verified. Use existing controls or a suitable
headless probe to support claims when practical; describe evidence limits.
Report gaps, likely dependencies, and a small next step. Update an existing
audit record if the user requests it or an ongoing audit authorizes that work.

## inspect understanding

Example: `cmd.md: inspect understanding — The dog bit the man.` Use the
provided sentence or conversation; ask for input if absent. Create a temporary
Foundry v1 input and run `npm run foundry --silent -- run --input <file> --json`.
Explain the observed predicate, participants, roles, negation, tense, question
form, reference, and path where present; show the reply and note unavailable
or ambiguous information. Compare the graph with the sentence without assuming
the graph is correct. Report the resource and session configuration and any
differences from the user's chat environment. A multi-turn input runs in one
session. Do not claim that the current `run` command automatically grades it.

## review progress

Example: `cmd.md: review progress`. Read recent relevant Foundry progress and
results, the applicable gap or audit records, and repository status and recent
commits. Summarize what was implemented, what the recorded checks actually
show, unresolved issues, and the next recommended action. Note stale or
conflicting evidence and distinguish local commits from confirmed remote state.
This is a review; do not edit the records unless the user requests an update.

## analyze next

Example: `cmd.md: analyze next` or `cmd.md: analyze what should be improved next`.
Read `loop/foundry-tasks.yaml`, relevant progress and results, `GAPS.md`, and
the code or controls needed to evaluate candidate work. Check dependencies,
current status and evidence against the repository; do not assume an old task
or observation remains accurate. Prioritize English understanding, actual
turn-path reachability, expected impact, risk, and the ability to measure a
general improvement. Recommend one ready task and explain why, its evidence,
dependencies, uncertainty, and a concrete first step; mention alternatives
and blocked work when useful. Analysis alone does not start implementation.
Update the tracker when the analysis finds supported changes to status,
dependencies or evidence, and explain those updates. If no updates are
justified, leave it unchanged. Use the tracker rules below.

## Task tracker rules

`loop/foundry-tasks.yaml` is the shared, human-readable task index. Tasks and
subtasks have stable IDs; `parent` expresses hierarchy, `depends_on` identifies
prerequisites, and `related` provides non-blocking links. References name IDs
in the same file. Keep IDs unique, dependencies acyclic, and references valid.
Statuses are `todo`, `in_progress`, `blocked`, `done`, and `cancelled`;
only `done` satisfies a dependency. A blocked task needs a concrete blocker;
do not infer completion from its children's status alone. Give every change a
dated evidence or progress entry with a repository path or other verifiable
reference, and preserve prior entries. Update status as work actually begins,
blocks, or meets its stated completion criteria. Keep uncertainties explicit.
If concurrent changes are present, reconcile them rather than overwriting them.
The tracker is an index, not a replacement for detailed traces, `GAPS.md`, or
the progress records. No automated YAML tracker or validation command exists
yet; the agent reads and edits the file directly, and checks its structure and
references when changing it. Never claim a task was verified without evidence.

Each task also carries a `model_tier` recommendation: `low` for bounded,
mechanical work with clear checks, `medium` for localized implementation or
diagnosis, and `high` for complex architecture, evaluation design, or review.
The `model_tier_reason` explains the recommendation. These are guidance, not
proof that a particular model can perform the work or that the active CLI can
switch models. Reassess the tier when scope or evidence changes; escalate when
results are ambiguous or checks fail, and record the reason in task history.
Delegate or switch models only when the user's instructions and CLI allow it.
When recommending next work, include the suggested tier and rationale.

## evaluate proposal

Example: `cmd.md: evaluate proposal — a semantic role labeling library`.
Identify the problem, then inspect AnSci's corresponding code and existing
evidence. Research current primary documentation and licensing when external
software or data is involved. Compare expected benefit, integration and
runtime costs, non-neural requirements, data rights, provenance, and whether
the result can reach the real turn path. Propose a small baseline and a
held-out or independent comparison with clear success and regression criteria.
Separate observed results from vendor claims and recommendations. A proposal
evaluation does not itself authorize installing or redistributing a resource.
