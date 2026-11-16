Has anyone tried to make a chat out of ConceptNet + WordNet + FrameNet?

No one has built a notable **chatbot** that specifically fuses all three — ConceptNet + WordNet + FrameNet — as a conversational system. But the pieces have been brought together in adjacent ways:

- **ConceptNet already absorbs WordNet.** ConceptNet 5 was built to "undo the synset assumption" from WordNet and re-encode it as a hypergraph, so querying ConceptNet already gives you WordNet-style lexical relations (synonymy, hypernymy, meronymy) plus commonsense edges on top. The original 2004 ConceptNet paper also used **FrameNet's** verb synonymsets and class hierarchies to derive `SuperThematicKLine` generalisations, so a sliver of FrameNet is baked in from the start.

- **CSKG (CommonSense Knowledge Graph)** is the closest thing to a unified trio. It integrates ConceptNet, WordNet, FrameNet, plus ATOMIC, Roget, Wikidata, and Visual Genome into a single 2.2M-node / 6M-edge graph with aligned edge types. It's used for commonsense QA, not chat, but it's the natural substrate if you wanted to build one.

- **Framester** is a linked-data hub connecting FrameNet ↔ WordNet ↔ VerbNet ↔ BabelNet ↔ DBpedia, but it doesn't include ConceptNet and isn't a chatbot.

- **Smaller projects** have used ConceptNet + WordNet (without FrameNet) for chatbot-like purposes — e.g., a 2015 Stockholm degree project and a TigerGraph + RASA + ConceptNet5 demo — but none add FrameNet on top.

**In short:** the integration layer already exists in ConceptNet (for WordNet) and in CSKG (for all three), but nobody has built a dedicated *conversational* agent on top of that full stack. The gap is really the dialogue management / response generation layer, not the knowledge integration.


## Milestone 1 — a chat on these graphs that talks like a chat

Milestone 1 is a working chat built on CSKG — the unified graph above (ConceptNet, WordNet, FrameNet, ATOMIC, Roget, a Wikidata subset, Visual Genome) — with our own conversation machinery on top of it: term resolution, questions answered from the graph's relations, statements received and remembered, a thought trace behind every answer, session memory with corrections, and a renderer that says only what the graph supports.

The chat stands on a situated foundation. It knows where it is and what time it is — place from configuration, time from the clock, season from the date and the hemisphere — computed fresh each turn. Situatedness is part of the foundation, not a feature to be added later: the system starts from a self in a world, not from a word-completion model wrapped in shells.

Acceptance is by transcript. We run free conversation — statements as well as questions, follow-ups, corrections, changes of topic — and read the transcripts. Where a transcript reads like talking with something, the milestone is being met. Where it reads like querying a database, the engine behind the chat gets another round of work; the iteration is always on the engine, never on hand-written answers. The projected transcript in docs/milestone-1.md belongs to the earlier plan and does not limit this milestone.

Deferred past this milestone: the ancient Chinese ontology (yin/yang, Wuxing) as the direction layer; building our own unified graph from the separate nets; bringing in outside information; and modifying the knowledge base. Those return once a real chat exists for them to serve.

Also watched for, under the project's emergence stance: behaviour the transcripts show that no rule was written to produce — recorded with its trace and classified honestly, as a coherent derivation, an artefact, or a bug.

---

## Status note — 2026-11-15 (added later; the document above stands as written)

Milestone 1's CSKG chat was built, and that track is now archived in place —
files, tests and data untouched. The project's centre has moved to the fork:
building out the Wuxing ontology as AnSci's own knowledge system (docs/fork/).
CSKG's role is supporting — a feeder, a benchmark, and a conventional-knowledge
baseline to develop and evaluate against — not the primary knowledge system,
and not slated for wholesale replacement: individual dependencies are retired
only when AnSci has demonstrated an adequate alternative. The long-term
objective is an independent knowledge system, not a CSKG interface with
Five-Element labels attached.
