# Parsing and chatbot capability backlog

This table summarizes the current implementation and the gaps to close. A
module being present or passing its unit tests does not by itself show that
ordinary turns can reach it. Treat the gaps as audit findings to validate
against the per-node ledger and behavioral examples in `GAPS.md`.

| Area | What AnSci has | What’s missing or needed |
|---|---|---|
| **Token handling** | Tokenization, spelling resolution with SymSpell, variants, and English morphology support | Better handling for fragments, typos, contractions, informal chat, and browser use |
| **Sentence boundaries** | Some multi-clause handling and punctuation support | Reliable separation of multiple sentences in one turn; preserve each clause and its own predicate |
| **English parsing** | A hand-built parser with tested constructions for English and Chinese | Broader coverage of embedded requests, coordination, conditions, ellipsis, and ambiguous attachments |
| **Meaning graph** | Nodes, typed relations, roles, and surface alignment | A complete graph that preserves all content and clause structure; current failures can flatten tasks or drop relations |
| **Valency and roles** | Hand lexicon, FrameNet and VerbNet evidence, and missing-role assessment in the turn path | Wire the richer valency assessment into conversation; test it through `processTurn`; increase coverage and improve role accuracy |
| **Wuxing in language** | Generating and controlling cycles; cycle-based sense selection can change some English word classifications; steering uses cycle relations | Independent evaluation showing when cycles improve word sense, graph roles, parsing, or replies; Chinese sense selection is not wired |
| **Ontology and knowledge** | Wuxing-based classifications and propagation; some sourced lexical and world knowledge | Broader, better-grounded coverage; ensure knowledge is reachable from ordinary conversation and keep provenance visible |
| **External parser option** | Link Grammar was built locally and explored; a small adapter prototype maps basic subject and object links | Robust conversion of linkages into AnSci graphs; preserve ambiguity and uncertainty; handle embedded clauses and coordination |
| **Other libraries** | SymSpell is in use; CoreNLP and RelEx have been reviewed as possible sources | Adopt or port only components that fix measured gaps; assess runtime, model requirements, language coverage, and licenses first |
| **Reasoning and reply** | Traceable turn pipeline, records, derivations, steering, and reply planning | Make more modules reachable; improve ordinary request understanding and natural replies without hard-coded phrase paths |
| **Evaluation workflow** | Extensive unit tests, traces, challenge scripts, and a per-node audit ledger | An independently authored held-out conversation set; consistent graph and role scoring; enabled/disabled ablations; record regressions as well as wins |
| **System integration** | Many built modules and stores, some tested individually | Connect tested capabilities to `processTurn`; distinguish missing code, missing knowledge, interpretation errors, reasoning errors, and reply problems |

The main pattern is that AnSci has many real components, but testing each
component alone does not show that ordinary chat can reach or use it. The
per-node audit is in `GAPS.md`; parser results and the Link Grammar adapter
evaluation are in `docs/ansci/link-grammar-evaluation.md`.

## Suggested next step

Prioritize the gaps that currently break basic turns: sentence boundaries,
relation preservation, and end-to-end reachability. Turn each into a
behavioral case with an expected graph, trace evidence, and regression test.
