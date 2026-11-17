# Milestone 1 — a chat on these graphs that talks like a chat

**Status: revised 2026-11-09.** This milestone supersedes the earlier
Milestone 1 (a projected ConceptNet-stage transcript, written 2026-11-08),
which belonged to the previous plan of building up the separate nets one
by one. That document remains in this repository's history. The course
changed: start from the already-unified graph, prove a real chat on it,
and let everything else follow. The goal this milestone serves is stated
in `PROJECT-GOAL.md`.

## The milestone

A working chat built on CSKG — the CommonSense Knowledge Graph, which
unifies ConceptNet, WordNet, FrameNet, ATOMIC, Roget, a Wikidata subset
and Visual Genome (~2.16M nodes, ~6M edges) — with our own conversation
machinery on top of it:

- **Term resolution** over CSKG's vocabulary, multiword terms included.
- **Questions answered from the graph's relations** — what things are
  for, what they cause, where they are found, what they can do, what
  they are part of, and ATOMIC's event knowledge: what an event leads
  to, what someone doing it wants, needs and feels.
- **Statements received, not declined** — what the user tells the chat
  is absorbed into the conversation: a grounded response from the
  graph, and the topic remembered for follow-ups.
- **A thought trace behind every answer** — the edges and steps that
  produced it, replayable when the user asks "why did you say that?".
- **Session memory** — resolved topics persist across turns;
  corrections re-resolve.
- **A renderer that says only what the graph supports** — edges
  attested by several sources are asserted; single-source edges are
  softened; what the graph does not know is declined honestly, naming
  what could not be placed.

## The foundation: situated

The chat stands on a situated foundation, not on a word-completion
model wrapped in concentric software shells. It knows where it is and
what time it is — place from configuration, time from the clock, season
from the date and the hemisphere — computed fresh each turn, never
stored as knowledge. The system starts from a self in a world; language
is its outermost layer, not its core.

## Acceptance: by transcript

There is no fixed script for this milestone, and the superseded
transcript does not limit it. We run free conversation — statements as
well as questions, follow-ups, corrections, changes of topic — and read
the transcripts. Where a transcript reads like talking with something,
the milestone is being met. Where it reads like querying a database,
the engine behind the chat gets another round of work. Iteration is
always on the engine — resolution, selection, memory, rendering —
never on hand-written answers.

The first evaluation is the CSKG spike evaluation: everyday statements and
questions across cooking, weather, home objects, travel, money and
tiredness; the known hard cases (why eyes water chopping onions; opening
a wine bottle without a corkscrew); situation-conditioned turns (the
same question from Chicago in November and from Sydney in November);
and a multi-turn sequence with a follow-up, a correction and a
"why did you say that?". Every turn is scored — answered and grounded,
answered but ungrounded, declined, wrong sense — and the failures are
classified. That report is the first specimen under this milestone, not
its boundary.

## Deferred past this milestone

- The ancient Chinese ontology (yin/yang, Wuxing) as the direction
  layer over the graph.
- Building our own unified graph from the separate nets, with
  sense-keyed addressing and our own audited overlay.
- Bringing in outside information through adapters and ingestion.
- Modifying the knowledge base (the trainer loop: propose, review,
  test, apply).

These return once a real chat exists for them to serve.

## Watched for: undesigned behaviour

Under the project's emergence stance, the transcripts are also read for
behaviour no rule was written to produce. Any candidate is recorded
with its thought trace and classified honestly: a coherent derivation
nobody designed (an emergence candidate), a lookup artefact, or a bug.
