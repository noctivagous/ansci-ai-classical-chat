# AnSci — AI Model

AnSci is a classical-AI system whose **mind is an ontology graph**, not a neural network.
An LLM learns that "cold" and "winter" go together statistically, in a 1000+-dimensional
embedding space. AnSci *already knows* they go together, a priori, because both are
Water/Yin — and night, also Yin, is longer in winter and cooler than day in every season.
Those correspondences are not training patterns. They are a **path through the graph**:

```
winter —ELEMENT_OF→ Water —POLARITY_OF→ Yin —HAS_QUALITY→ cold
```

The same graph of ontological priors interrelates the seasons, times of day, astronomy,
the human body, sounds (pentatonic notes), colours and tastes — everything mapped onto
yin/yang and the Five Elements (Wuxing). New domains (calculus, meteorology, music…)
are acquired by mapping their concepts onto those same priors, with confidence scores.

**The graph is the model. An LLM, when one is used at all, is only ever the trainer or
the translator — never the reasoner.**

## Try the CSKG chat

A self-contained spike in `src/cskg/` puts a working chat on CSKG, the unified
commonsense graph (ConceptNet, WordNet, FrameNet, ATOMIC, Roget's Thesaurus,
a Wikidata subset, Visual Genome). One install command fetches the data
(~112 MB) and builds everything; you can then chat with it in a small web UI
or in the terminal:

```sh
node scripts/install.mjs
```

See [demo/README.md](demo/README.md) for the quickstart, the three ways to
chat, configuration, and what to expect.

## Architecture

AnSci's base is a **combination of the classical word nets**: WordNet first
(synsets — the disambiguated senses that ontological mappings are keyed to),
FrameNet (with VerbNet as adjunct) for event and frame structure, and ConceptNet
for broad common-sense relations. WordNet and FrameNet are CC BY and bundle
trimmed in-repo; ConceptNet is CC BY-SA, is self-hosted, and lives in its own
overlay partition, so the permissive core is never contaminated by share-alike.
AnSci's own contribution is the **direction** those nets are taken in:
their concepts and frames are mapped onto the yin/yang + Wuxing prior graph, so
associations are derived from shared priors instead of learned statistically.
The base data is never edited in place — everything AnSci adds
lives in a small, audited **overlay**. Full design:
[docs/design-base-nets-and-chat.md](docs/design-base-nets-and-chat.md).
Slice 1 below is the direction layer only; the net base and router are slices 2a–2e
of that design. The next slice, **2b**, is the router (design doc §7): lookup-first
question routing with clarification and session memory, ahead of propagation (2c),
FrameNet (2d) and ConceptNet (2e).

## Slice 1 — what is built here

A working, tested symbolic core. No server, no database, no neural components yet:
the graph + reasoner is the point.

- `src/graph.ts` — node/edge types exactly as specified in `docs/user-plans/ontologyGraph.txt`
  (layers: atomic / dictionary / acquired / source / audit; confidence on acquired edges;
  GraphAdjustment audit nodes). Edges carry an optional **`aspect`**, because yin/yang are
  multi-aspect: bass is Yang in the aspect of *voice origin* (sung by men) and Yin in the
  aspect of *pitch* (low, dark, still). One label per concept would falsify the user's notes.
- `src/seed.ts` — the seeded graph as a plain JSON-serializable structure:
  - Atomic: Yin/Yang (+ `CONTAINS_SEED` both ways), the Five Elements with the full
    mutual-generation cycle (Wood→Fire→Earth→Metal→Water→Wood) and mutual-restraint
    cycle (Wood→Earth→Water→Fire→Metal→Wood), the eight trigrams.
  - Correspondence tables per element: pentatonic sound, colour, taste, direction,
    emotion, organ — plus seasons and times of day linked to element/polarity.
  - Qualities (cold, warm, dark, bright, still, active…) hang off the **polarities**,
    and concepts/seasons hang off elements/polarities. There is deliberately **no**
    winter→cold edge: the engine must *derive* it by joining on the shared prior.
  - Acquired examples from the user's notes, with confidences: derivative→Yang/Fire and
    integral→Yin/Water (mutually rooted), high/low pressure systems (multi-aspect),
    bass/treble (multi-aspect), and mercury→Water at 0.55 (an analogy, held back by
    the default threshold).
  - Dictionary entries (the vocabulary authority) for derivative, integral, seasons, etc.
- `src/reason.ts` — the symbolic reasoning engine:
  - `interpret()` — a deterministic interpreter (exact / synonym / fuzzy string match,
    **no embeddings**) producing the spec'd `QueryIntent`. Ontology words (*yin, yang,
    element, wuxing, ancient…*) and *why* questions set `includeOntology`; plain
    definition asks keep it off.
  - Traversal returns the actual **paths** used (node—edge→node steps, with confidence),
    respects `confidenceThreshold`, and performs shared-prior inference and
    generation-cycle reasoning ("what season follows winter?" → Water generates Wood → spring).
  - Template response generation with **controlled ontology leakage**: when
    `includeOntology` is false, answers cannot mention Yin/Yang/element names
    (enforced by a guard on the generated text, and by the tests).
- `src/cli.ts` — a small CLI.
- `test/reason.test.ts` — tests on Node's built-in test runner (see below).

## Slice 2a — WordNet base layer + chat (built)

The first base net is in, and the ontology is exercised over it end-to-end:

- `scripts/import-wordnet.py` — reproducible importer: downloads the **Open English
  WordNet 2024** WNDB release (CC BY 4.0, see `NOTICE`) and writes a compact trimmed
  extract to `data/wordnet/extract/` — a `manifest.json` plus chunked
  `part-*.json` files, each ≤ 3.2 MB (117,008 synsets; 153,758 relations;
  16.05 MB total). The extract is chunked because the original single
  13.2 MB file exceeded the GitHub snapshot-push transport limit (HTTP 413).
  Kept: all noun/verb/adjective synsets with glosses, hypernym (+instance), meronym
  (subtype preserved), antonym, similar-to, entailment, causes. Trimmed: adverb
  synsets, derivationally-related edges, and gloss usage examples (definitions kept
  in full). Raw downloads land in `data/raw/` (gitignored).
- `src/wordnet.ts` — loads the extract as `Synset` nodes on a new `base` layer
  (provenance `source: "wordnet"`), maps relations to `IS_A` / `PART_OF` /
  `ANTONYM_OF` / `SIMILAR_TO` / `ENTAILS` / `CAUSES` edges, and bridges seed concepts
  to exact **sense ids** (`SENSE_MAPPINGS`): the quality *cold* maps to the temperature
  adjective synset `wn-a01258433` only — the illness synset `wn-n14389489` ("common
  cold") is a different node and stays unmapped.
- Reasoner, additively: a word with no seed node resolves to its synsets, and the
  engine **climbs `IS_A`** (≤ 6 hops, confidence ×0.9 per hop) to a mapped anchor —
  *sleet* and *hail* were never hand-mapped, but both climb to *precipitation*
  (a curated Water/Yin anchor, alongside *snow* and *frost*), so the chat answers
  "why is sleet cold?" with the full WordNet segment visible in its path. Sense
  choice is by climbability: hail-the-greeting climbs nowhere, hail-the-ice-pellets
  climbs in one hop.
- `src/chat.ts` — the chat: `npm run chat` (REPL; `/quit` or EOF exits) or
  `npm run chat -- --script examples/chat-demo.txt` for a scripted run.
- `test/wordnet.test.ts` — extract counts, cold disambiguation, both climb paths,
  no-leak definitions over WordNet words, and the scripted chat run.

## Slice 2d — FrameNet layer (built; installed on demand)

FrameNet (design doc §5) is the second base net: frames — situation
schemas with roles — rather than words. It is **not bundled in this
repo**; it is installed by one command, which downloads the release
from a public mirror (NLTK's nltk_data; no Berkeley form) and imports
the complete inventory:

```bash
python3 scripts/import-framenet.py   # fetch (if needed) + import
```

That writes the bundle to `data/framenet/` (gitignored, like the raw
download). Until it is run, the chat works exactly as before and frame
questions decline honestly ("FrameNet is not installed — run the
installer"). Once installed, questions like *"who are the participants
when someone buys something?"* answer Buyer/Goods/Seller/Money from
frame structure (`Commerce_buy`), and propagation can lean on frames
through their evoking words (§6.2's EVOKES rule). FrameNet Release 1.5
is CC BY 3.0 — see `NOTICE`. A small checked-in fixture
(`test/fixtures/framenet/`) backs the offline test suite.

## Try it

```bash
npm install
python3 scripts/import-framenet.py   # optional: the FrameNet layer
npm test

npm run ask -- "why is winter cold?"
npm run ask -- "why is the night cooler?"
npm run ask -- "what is a derivative in math?"            # no ontology leaks in
npm run ask -- "how does the concept of derivative fit into ancient Chinese science?"
npm run ask -- "what season follows winter?"
npm run ask -- "what is the yin yang polarity of bass?"   # both aspects, not one label
npm run ask -- "how does mercury fit into ancient Chinese science?"        # 0.55 mapping held back
npm run ask -- "how does mercury fit into ancient Chinese science?" --threshold=0.5

npm run chat                                       # WordNet + ontology REPL
npm run chat -- --script examples/chat-demo.txt    # scripted demo: sleet/hail climb, common-cold sense
```

## Tooling choices (kept minimal on purpose)

- **Only dev dependencies: TypeScript + @types/node.** No runtime dependencies at all.
- **Tests use Node's built-in test runner** (`node --test`) instead of vitest: the suite
  is pure graph logic, needs no watch mode, snapshots or coverage tooling, and one less
  dependency keeps the prototype's install at seconds. If the suite later needs those
  features, vitest is a drop-in swap (same `test`/`assert` style).
- **No Express, Neo4j or ONNX in slice 1.** The user's technology plan
  (`docs/user-plans/technology-approach.md`) already specifies the order: in-memory
  JSON graph first, Neo4j behind the same interface when ingestion volume justifies it,
  an OpenAI-compatible Express API later, and local ONNX only as an interface helper.
  Slice 1 proves the reasoner those layers will serve.

## Source material

`docs/user-plans/` and `docs/user-ref/` contain **the user's own original plans and
reference notes, copied verbatim** (dated 2026-05-20, from Archive-2.zip). They are the
project's source material and are distinct from the code in `src/`, which is an
implementation of them. Design decisions taken while implementing (e.g. the `aspect`
field, Earth having no single polarity edge as the centre point, qualities attaching to
polarities so inference is a real join) are noted in the code comments.

## Roadmap (from the user's plans, not yet built)

1. Ingestion loop: LLM-as-trainer reads texts, proposes graph insertions against the
   dictionary authority, evaluates, and adjusts — every change logged as a GraphAdjustment.
2. In-memory JSON persistence → Neo4j adapter behind the same `Graph` interface.
3. OpenAI-compatible API (`/v1/chat/completions`) so the model can be listed like an LLM.
4. Vite dashboard: graph visualisation, flagged-proposal review, "where did you learn that?"
