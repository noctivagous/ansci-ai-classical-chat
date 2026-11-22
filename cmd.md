# AnSci repository commands

This file is a command guide for an AI coding agent working in this repository.
The user can invoke a command in ordinary language, for example:

> Read cmd.md and run **improve system**.

`cmd.md: improve system` is shorthand for the same request when the CLI agent
receives that text. This file is not an executable shell program or a guarantee
that a CLI will load it automatically: the agent must be asked to read it, or
its CLI must be configured to include it. Direct user instructions and the
agent's operating permissions take precedence over this guide.

## improve system

Use AnSci Foundry to identify and implement an evidence-backed improvement to
the system. The immediate priority is understanding English; the broader goal
is working, reachable system modules and organically generated conversation.
Generic mechanisms and ontology may help, but their effects must be measured.

### Choose work and a timeframe

1. Read `loop/FOUNDRY.md`, the latest relevant Foundry results, `GAPS.md`, and
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
5. Update the progress entry with commands, results, changes, limitations,
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

When the user says `cmd.md: resume improvement`, inspect the latest Foundry
progress record, repository status, and current instructions. Summarize the
previous objective and next step, then ask for a new timeframe if one was not
provided. Continue within the previously selected scope unless the user changes
it. Recheck any baseline that may have become stale.
