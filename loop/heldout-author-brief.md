# Foundry English held-out set: author brief

Status: preparation, 2026-11-22. No independent held-out set has been
created or run. This brief asks an author independent of AnSci's builders to
create one; a separate custodian protects it. See `docs/ansci/wp2-tooling.md`
and `docs/ansci/repair-programme.md` Part C.5 for the existing protocol.

## Roles and separation

- **Author:** someone independent of the people and agents implementing the
  system and its fixes. Write the sentences and meaning expectations without
  running AnSci or reading its outputs. Disclose any relevant involvement or
  prior exposure. A new AI session is not automatically independent; record
  who controls it, its context and its access if one assists.
- **Custodian:** a different party who receives the private set, checks it,
  seals and records its version and hash, and controls access. Do not commit
  hidden examples or expected answers to the public repository before the
  evaluation. A hash establishes integrity, not independence or secrecy.
- **Operator:** runs the agreed evaluation without tuning on its cases. Agree
  with the custodian how the runner receives the input and how detailed outputs
  are protected; Foundry's current JSON reports can expose case text and
  expectations, so do not treat its ordinary report as a blind protocol.

## Authoring task

Write ordinary English examples covering active and passive roles, reversed
participants, past and present tense, negation, yes/no and wh questions,
multi-turn reference and location, and unfamiliar combinations. Include
unambiguous cases with independently stated meanings and negative controls;
mark ambiguous cases and acceptable interpretations. Avoid using the existing
development sentences as a source of wording. Document sample size, selection
method, case families, and any exclusions before the first run. The initial
scope is English understanding, not response style or general intelligence.

For each item provide a stable ID, input turns, and a plain-English answer key:
predicate/event, participants and their roles, tense, negation, question
target, and reference when applicable. State which properties are intended to
be judged and which are uncertain. For conversations, specify what later turns
refer to and what has actually been established. Do not force a single answer
for a genuinely ambiguous sentence. Include examples where abstention is the
appropriate outcome if a role or reference cannot be determined.

The custodian and operator must map those answers to Foundry's supported
expectations before the run, flag unsupported or ambiguous mappings for human
review, and retain the original answer key. Foundry currently matches nodes by
lemma, which can be ambiguous for repeated words; avoid claiming those cases
are reliably scored until the matcher supports identity. Reply entailment
checks currently abstain, so do not count them as passed. The agent that wrote
the code must not silently alter the answer key to make results pass.

## Before running

1. Agree on the question, sample selection, primary metric, denominators,
   abstention and missing-graph treatment, and regression rule. Set thresholds
   before seeing outputs. Report case-family counts and uncertainty as well as
   any aggregate; a small sample cannot establish broad language competence.
2. Pin the system revision, fixture clock, resources and session configuration;
   record known differences from the deployed browser chat. Preserve a clean
   baseline and keep the set hidden during development.
3. Use the existing sealed-set tooling only after checking its schema and
   compatibility with the Foundry suite and output. The current repository
   does not establish an integrated blind Foundry workflow. If needed, build
   that adapter and check it with synthetic public cases first.
4. Custodian records the frozen set hash and participants' roles. Run once
   under the agreed protocol, preserve the raw report privately, and publish
   only agreed summaries. Further fixes require a fresh held-out set or a
   clearly disclosed reuse; the original becomes development data if exposed.

## Next action

Recruit an independent author and a separate custodian, and agree how they will
privately exchange the material. In parallel, assess and implement the sealed
Foundry adapter using synthetic data. Do not label a set independently authored
or sealed until the roles, provenance and custody can be verified.
