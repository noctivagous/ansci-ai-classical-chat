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

## External tools to use

Use libraries at the narrow seam they solve; do not make a dependency's
output the meaning graph without preserving provenance, ambiguity, and
failure status.

| Tool | Recommended use here | Do not rely on it for | Integration cost / fit |
|---|---|---|---|
| **Link Grammar** | First runtime candidate for English structure. Continue the tested `S`/`O` adapter, then investigate clause, negation, coordination, and fragment links with held-out cases. Keep its linkages as sourced proposals that AnSci validates and interprets. | General conversation understanding, capability decisions, or correct replies by itself | Best fit. The local Link Grammar source includes an Emscripten `link-parser.wasm` build and copies dictionary data, but its JavaScript binding is a Node CLI wrapper. A small typed API and browser packaging would still be needed. LGPL-2.1-or-later applies. |
| **OpenNLP** | Compare its sentence detector and tokenizer on AnSci's sentence-boundary and chat-register cases; keep it optional if it measurably reduces boundary errors. | Meaning graph, ontology reasoning, or open-domain conversational parsing | Java runtime and model files. Its released models use statistical methods, not necessarily neural networks; still learned behavior rather than explicit Wuxing rules. Apache project, model artifacts have their own terms. |
| **Stanford CoreNLP / Stanford Parser** | Use as an offline reference for constituency/dependency outputs and carefully selected utilities or test cases. | A lightweight TypeScript parser or a symbolic Wuxing engine | Java, model jars, large downloads, and GPL licensing. Porting parser code/models would be a separate project; borrow behavior and test cases first. |
| **BLLIP** | Optional offline benchmark for English constituency alternatives if Link Grammar leaves a specific structural question unanswered. | Browser runtime or unsupervised general conversation | C/Python runtime plus downloaded WSJ or domain model; model is trained and domain-limited. This gives an independent parser baseline, not a drop-in TypeScript module. |
| **CG-3** | Later experiment for applying explicit contextual constraints to tagged tokens or an existing dependency graph, if AnSci writes and owns the English rules. | Raw-text parser, tokenizer, or automatic source of a complete analysis | C++ toolchain and a hand-authored CG grammar are needed; GPL-3.0. Treat as a rule engine experiment after upstream parse proposals exist. |
| **NLTK / pyStatParser** | Learning, small grammar prototypes, and classroom-style fixtures for individual constructions | Production chatbot parsing | Python and manually supplied grammar or external trained parser. Useful for understanding and test design, not as a runtime integration target. |
| **FreeLing** | Consider only if a multilingual morphology/POS/NER pipeline becomes a concrete need and its license fits distribution plans. | A low-friction browser component | C++ stack, language data, APIs around native components, and AGPL terms make it a poor first integration for this TypeScript project. |
| **MaltParser / EngCG / Minipar** | Consult published methods or use only if an available, maintained artifact solves a measured case better than the leading options. | A default dependency based on historical accuracy figures | The names in the candidate list do not establish a maintained, compatible model and runtime for this application. Verify artifacts, training data, language/register, and licenses before spending integration effort. |

### Recommendation

1. Keep AnSci's parser and traces as the system of record. Run Link Grammar
   alongside it on the English benchmark and adapt one linkage family at a
   time. Feed accepted proposals into AnSci only after role mapping and
   uncertainty behavior pass held-out tests.
2. Probe the local WebAssembly build for browser loading, dictionary size,
   cold-start time, and structured access to links. The current binding is a
   Node CLI; do not assume it already provides a browser API.
3. Use OpenNLP's sentence detector as a narrow comparison on multi-sentence
   and fragment inputs. Adopt it only if its model improves the measured
   baseline enough to justify a separate Java service or porting effort.
4. Treat CoreNLP/BLLIP as reference parsers for offline comparisons. Use
   CG-3 only after the upstream tokens/readings/dependencies are available
   and there is a clear set of explicit constraints AnSci wants to own.

These recommendations follow the repository's current evidence: Link
Grammar helps expose useful typed links on simple cases, while the exploratory
adapter still misses or mislabels embedded requests, clause subjects,
fragments, and some chat-register objects. The documented case set is small
and builder-authored, so it is a candidate selection guide rather than proof
of accuracy. Recheck each tool's current version, model provenance, and
license before distribution.
