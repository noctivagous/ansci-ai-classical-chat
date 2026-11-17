# Archive — the two reference paths

AnSci is still AnSci, and the goal is still a chat. What changed on
2026-11-16 is the development approach: the project is now developed
**map-first**, against the schematic in `ai-system/` (see the root
README). The two paths the project took before that decision are kept
here as **reference** — material to consult and draw on, not the line
of active development.

Nothing here is discarded work. The map-based path uses both paths
daily: the live root page runs the fork's engine today, and the
correspondence ontology the map's Knowledge section is built around
is the fork's classification work. When a unit is built into
`ai-system/`, it is built *from* these references.

## The two paths

### 1. The classical CSKG track — `classical/`

The founding path: a chat built on CSKG, the unified commonsense
graph (ConceptNet, WordNet, FrameNet, ATOMIC, Roget's Thesaurus, a
Wikidata subset, Visual Genome), with the project's own conversation
machinery on top — term resolution, a thought trace behind every
answer, session memory with corrections, a situated foundation.

- Founding statement: `classical/PROJECT-GOAL.md` (stands as written,
  with its own later status notes).
- The project README as it stood before the 2026-11-16
  reorientation — the classical track's slice-by-slice record — is
  preserved at `classical/README-2026-11-15.md`.
- Design record: `classical/design-base-nets-and-chat.md`,
  `classical/design-conversation-engine.md`, `classical/milestone-1.md`.
- Development method: `classical/devloop.md` — the transcript-judged
  loop the project still works by.
- Code: `src/` (the engine) and `src/cskg/` — in place, still
  runnable (`npm run chat:cskg`), kept as the conventional-knowledge
  baseline and a knowledge feeder in a supporting role. It is no
  longer the centre of the project, and no substantial effort goes
  into expanding the CSKG integration.

### 2. The fork — `fork/`

The second path: build the ancient Chinese knowledge graph itself —
a fully interrelated ontology on the thesis that classifying a thing
by Wuxing (五行, wǔxíng, "five phases") yields information by
correspondence — with a sentence layer over it (a connective graph
linked by REALIZES to the meaning graph), a classification table
built under a prediction-admission discipline, and a reply-planning
programme that prices derivations and plans replies as graphs.

- Entry points: `fork/DESIGN.md` (the design), `fork/README.md`
  (the fork docs' own index), `fork/stage-5-report.md` (the depth
  programme's honest account, including its declared ontology
  failures), `fork/reply-planning-design.md` (the reply programme).
- The rest of `fork/` is the working record: challenge sets,
  evaluations, surveys, the repair programme, and the acceptance
  transcripts in `fork/transcripts/` — transcripts are the
  acceptance test, so they are kept with the designs they judge.
- Code: `src/fork/` — in place. It is the reference implementation
  the map-based path migrates from, unit by unit, and it still runs:
  the live root page's engine is this code, and
  `npm run fork:chat` starts its parser demonstrator (a demonstrator,
  not a finished chat).

## What is not copied here

- **Code.** The two paths' code stays at `src/` and `src/fork/` as
  the single reference implementations. Copying code into the
  archive would fork it; the archive holds the written record and
  points at the code.
- **Two machine data dumps** from the fork's audits —
  `docs/fork/anchor-audit-dump.jsonl` and
  `docs/fork/depth-baseline-records.jsonl` — stay at their original
  paths, beside the tooling that produced them. Their findings are
  written up in `fork/anchor-audit.md` and `fork/depth-baseline.md`.
- The user's own reference writings (`docs/user-ref/`,
  `docs/user-plans/`) are a separate library and stay where they are.

## A note on the originals

The documents copied here also still stand at their original paths
under `docs/`. This repository is maintained through snapshot pushes
that cannot delete files, so the originals remain until a git-side
move retires them. The copies in this directory are the archive of
record; if a copy and an original ever differ, the copy here is the
one to trust, and the difference is worth reporting.
