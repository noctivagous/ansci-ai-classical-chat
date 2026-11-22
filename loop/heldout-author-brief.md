# Held-out authoring brief (Foundry)

Standing instructions for producing a Foundry held-out suite. This brief
governs authoring only: scoring runs through the unchanged `evaluate` and
`compare` commands, which grade any suite carrying `expect` blocks.

## Why held-out cases exist

The development suite (`loop/foundry-cases/english-development.json`) is
builder-authored: its cases were written alongside the system they grade,
and some expectations were corrected against observed output during
authoring (documented in `loop/foundry-results/fnd-101-expectations-2026-11-22.md`).
A second suite by the same hand would share its blind spots. Held-out
cases earn their name from independent authorship plus sealing, not from
a partition label alone.

## The independence rule

The held-out author must not have authored, tuned, or read the
development suite or the sessions that produced it. Concretely: the
agent that wrote `english-development.json` — including the author of
this brief — is excluded from authoring held-out cases. The owner
commissions and approves the author (precedent: the GAPS sealed probe
set, run only on the owner's commission). The brief may be drafted by
anyone; it cites only public rules, so drafting it leaks nothing.

## Case contract

- Same expectation vocabulary as the development suite: root, roles,
  forbidden roles, attached/role-open, tense/mood/voice, negated and
  negation carrier, construction, qualifier, resolution with
  `trace.resolutions` evidence, question target, and reply
  `contains`/`excludes` for told-echo surfacing only. See
  `loop/foundry-results/fnd-101-expectations-2026-11-22.md` for the
  graph mapping `evaluate` implements; do not extend the vocabulary
  without extending the matcher first.
- Family coverage mirrors the development families (active, reversed,
  passive, negation plus a cross-verb variant, polar/wh/passive
  questions, present/past tense, multi-turn reference with pronoun
  resolution, ambiguity with permitted-open roles) plus at least one
  novel family the development suite does not cover.
- Negative controls are required: forbidden roles, an honestly
  declining case, and a question-records-nothing control.
- Every expectation is authored from English semantics, never copied
  from system output. Where the author is unsure (representation
  choices such as copular roots, patient/theme granularity), assert
  the weaker form (`attached`, omitted root) and record why.

## Metadata and sealing

- Suite metadata must identify the author, provenance, partition
  `held-out`, and version (`loop/FOUNDRY.md`, input format v1).
- Seal before any measured change: record the sha256 of the suite
  file in the progress record that commissions the measured work.
  Any later edit breaks the seal and must be re-recorded, never
  silently absorbed. For the mechanised variant (author/operator/
  custodian separation, blind operator views, content hashes), see
  `src/ansci/sealed.ts`; Foundry's minimum is the recorded hash plus
  the no-tuning rule below.
- Never tune the system against held-out cases, and never weaken a
  held-out expectation to make a change pass. A failing held-out
  case is either a system defect or a wrong expectation — the author,
  not the implementer, adjudicates which.

## Acceptance for a future suite

The suite is ready when it runs clean through `evaluate` structurally
(exit 0 on a system that satisfies it, or documented failures),
`compare` shows it comparable case-by-case with the development suite
where families overlap, and its record names the author, the seal,
the commissioning note, and the limits carried over from authoring.
