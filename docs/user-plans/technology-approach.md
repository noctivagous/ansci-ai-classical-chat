# AnSci AI Model — Technology Approach

## Revised for Node.js, TypeScript, and Vite

---

## 1. API Layer — OpenAI-Compatible Server

**Chosen stack: Express + TypeScript**

Express remains the most stable and widely supported Node.js web framework. We will implement `/v1/chat/completions`, `/v1/models`, and streaming support to achieve full OpenRouter compatibility.

- Pydantic equivalent: `zod` for request/response validation with full TypeScript inference.
- Streaming: `express` with `res.write()` and server-sent events format mimicking OpenAI's stream chunks.
- OpenAPI spec: `swagger-ui-express` auto-generated from Zod schemas if desired, or hand-maintained to match OpenAI's spec exactly.

Alternative: `Elysia` (Bun) if raw throughput becomes critical later, but Express is the safer default.

---

## 2. Knowledge Store — Graph Database

**Chosen stack: Neo4j with the official JavaScript driver (`neo4j-driver`). In-memory JSON for early prototyping.**

The graph stores the ontology as nodes (concepts, dictionary entries, polarities, elements, text passages) and directed relationships (mutual-generation, mutual-restraint, polarity-assignment, definition-of, sourced-from).

A dictionary plus a static ontology is not enough. AnSci is designed to grow by reading text — ancient Chinese medical texts, modern physics papers, or any natural-language source. An LLM reads the text, extracts entities and relationships, and proposes graph insertions. Because the graph grows through this ingestion loop, it will eventually hold thousands to tens of thousands of nodes. Neo4j is the correct primary target because:
- Graph traversal stays fast at scale.
- ACID transactions prevent concurrent ingestion requests from corrupting the graph.
- Cypher queries directly express ontology paths (e.g., find all concepts linked to Water through mutual-generation).
- The Neo4j Browser lets you visually inspect the graph after ingestion.

Example query (Cypher):
```cypher
MATCH (c:Concept {name: "derivative"})-[r:HAS_POLARITY]->(p:Polarity)
MATCH (c)-[r2:HAS_ELEMENT]->(e:Element)
RETURN c, p, e, r.confidence AS polarityConfidence
```

**Prototyping path**: Until ingestion volume justifies Neo4j, a TypeScript in-memory graph (adjacency list + JSON persistence) implements the same interface. This allows zero-setup development. When the graph grows or concurrent writes become necessary, swap the adapter for the Neo4j driver without changing engine code.

Structure:
- `Concept` nodes: atomic ontology (Yin, Yang, Wood, Fire...) and acquired concepts (derivative, electromagnetism...).
- `DictionaryEntry` nodes: word definitions that are independent of ontology but linked to concepts.
- `Relationship` edges: typed, directed, optionally weighted.

---

## 3. Reasoning Engine — Symbolic Logic in TypeScript

The core of AnSci is **not** a neural network. It is a TypeScript-based symbolic engine that traverses the knowledge graph.

### Components:

- **Query Interpreter**: Parses user natural language into structured graph traversal intent.
  - Hybrid approach: use `transformers.js` (ONNX runtime, local, no API calls) to embed user input and perform fuzzy similarity matching against graph node labels.
  - Produces a `QueryIntent` object (see below) that tells the reasoning engine what to look up, not just which node matched.
  - Pure-symbolic fallback: Levenshtein + synonym expansion against ontology labels.

- **QueryIntent** (TypeScript interface):
  ```typescript
  interface QueryIntent {
    matchedNodes: string[];          // e.g., ["derivative"]
    intentType: "definition" | "comparison" | "ontology_explanation" | "causal_chain" | "unknown";
    domainHint?: string;             // e.g., "mathematics"
    includeOntology: boolean;        // true if user explicitly asks about yin/yang
    traversalDepth: number;          // how many relationship hops to follow
    confidenceThreshold: number;     // minimum relationship confidence to include
  }
  ```
  The reasoning engine uses `intentType` and `includeOntology` to decide whether to traverse into atomic polarity/element nodes or stop at dictionary definitions and summaries.

- **Ontology Traverser**: Executes Cypher queries or traverses the in-memory graph to resolve relationships, polarities, and Wuxing cycles. Respects the `confidenceThreshold` from QueryIntent — relationships below that confidence are ignored, which prevents weakly inferred mappings from polluting answers.

- **Response Generator**: Template-and-logic system that produces natural language from graph-derived facts. Must handle multi-dimensional descriptions (e.g., bass notes are male-origin/yang but low-pitch/yin). The `includeOntology` flag gates whether polarity and element names appear in the output.

---

## 4. Knowledge Ingestion & Training Loop

**The graph is the model. The LLM is the trainer.**

AnSci does not train neural weights. It trains a knowledge graph. The LLM reads texts, extracts structured knowledge, and writes it into the graph. Then it evaluates whether the graph produces correct, consistent answers. If not, it adjusts the graph — adding relationships, modifying mappings, deprecating weak connections — and re-evaluates. This is a training loop, but the model being trained is the graph, not a neural network.

### The Training Loop

```
Phase 1: READ & EXTRACT (LLM as student)
  LLM reads a text chunk (ancient Chinese medical text, modern physics, etc.)
  LLM extracts entities, proposes relationships, maps to yin/yang/Wuxing
        |
        v
Phase 2: VALIDATE & INSERT (LLM as builder)
  Dictionary authority check
  Graph merge logic (deduplicate, resolve conflicts, flag ambiguities)
  Insert into graph with confidence scores and source tracking
        |
        v
Phase 3: EVALUATE (LLM as grader)
  LLM poses test questions to the graph via the reasoning engine
  LLM compares graph-generated answers against the original text
  LLM identifies inconsistencies, gaps, or incorrect mappings
        |
        v
Phase 4: ADJUST (LLM as editor)
  If a mapping is wrong: lower confidence, deprecate, or remove
  If a mapping is missing: add it with appropriate confidence
  If a concept is misclassified: re-link to correct atomic nodes
        |
        v
Repeat from Phase 3 until the graph produces consistently correct output
        for the ingested text.
```

This means the LLM is not just dumping extracted facts into the graph. It is actively **training the graph** to be correct. The same passage might be re-read multiple times, each pass refining the graph structure based on evaluation feedback.

### Architecture

```
Raw text (PDF / markdown / plain text)
   |
   v
Text Chunker (paragraph-level, with overlap)
   |
   v
Ingestion LLM (OpenAI API or local endpoint)
   |
   +-- Structured extraction prompt:
       "Given the following passage, extract entities, propose relationships,
        classify by yin/yang and Wuxing if applicable, and assign confidence
        scores. Before proposing a new entity, check if it matches an existing
        dictionary entry and use that definition."
   |
   v
Validation Layer (Zod schema)
   |
   v
Dictionary Authority Check
   |-- Does the proposed concept name match a DictionaryEntry?
   |   |-- YES → adopt the canonical definition, do not override.
   |   |-- NO  → create a new DictionaryEntry (flagged for review).
   |
   v
Graph Merge Logic
   |-- Does the concept already exist as an acquired node?
   |   |-- YES → merge relationships. If the new relationship conflicts with an
   |   |         existing one (e.g., different polarity), keep the higher-confidence
   |   |         one and flag the conflict.
   |   |-- NO  → create the node and relationships.
   |
   v
Insert into Neo4j (or in-memory graph) via parameterized Cypher
   |
   v
Source Tracking: link every new node/relationship to the original TextPassage node
   |
   v
Evaluation LLM (same or separate endpoint)
   |-- Generates test questions from the original text
   |-- Queries the graph through the reasoning engine
   |-- Compares graph answers to expected answers
   |-- Proposes graph adjustments if discrepancies found
   |
   v
Adjustment Logic
   |-- Apply proposed changes: update confidence, deprecate, add, or re-link
   |-- Log all adjustments with reason and source passage
```

### Why this is not just "dumping text into a graph"

The LLM does not store the raw text. It reads the text, extracts meaning, maps it onto the existing ontology, and then **tests whether the graph can answer questions correctly**. If the graph produces a wrong answer, the LLM traces the error back to the responsible relationship and fixes it. This is training. The graph is the model. The LLM is the optimizer.

Every extracted fact is traceable back to its source passage via `SOURCED_FROM` relationships, so you can always ask "Where did you learn that?" and the engine can retrieve the original text. More importantly, the LLM can ask itself "Is this mapping still correct?" and re-evaluate it against new texts.

### Evaluation & Adjustment Types

The LLM evaluates the graph by posing questions and checking answers:

1. **Direct recall**: "What element is associated with winter?"
   - Expected: Water
   - If graph says Metal → LLM traces the HAS_ELEMENT relationship and corrects it.

2. **Inference chain**: "If winter is Water and Water generates Wood, what comes after winter?"
   - Expected: spring / Wood
   - If graph fails to traverse MUTUAL_GENERATION → LLM adds or strengthens the path.

3. **Cross-domain mapping**: "How does the derivative relate to the Yellow Emperor's concept of change?"
   - Expected: derivative → Yang → Fire → peak action → change
   - If graph answer is inconsistent with the text → LLM adjusts the acquired mapping.

4. **Conflict detection**: Two passages assign different polarities to the same concept.
   - LLM compares source evidence, keeps the better-supported mapping, deprecates the other.

All adjustments are logged as `GraphAdjustment` nodes linked to the affected relationships, creating an audit trail of how the model was trained.

### Node type: TextPassage

```cypher
(:TextPassage {
  id: "neijing-suwen-ch1-p3",
  sourceTitle: "Huangdi Neijing - Suwen",
  chapter: 1,
  page: 3,
  rawText: "...",
  language: "zh"
})
```

Every `Concept` or `Relationship` created during ingestion links back to one or more `TextPassage` nodes. This makes the knowledge graph auditable and debatable.

No LangChain required — direct fetch + Zod + retry logic is sufficient and keeps dependencies minimal.

---

## 5. Frontend / Dashboard — Vite + TypeScript

**Chosen stack: Vite + React + TypeScript**

Vite provides instant dev server startup and optimized builds. Use it for:

- A developer dashboard to inspect the knowledge graph, test queries, and visualize ontology nodes.
- A chat interface for human-in-the-loop testing of the OpenAI-compatible API.
- Graph visualization: `react-force-graph` or `cytoscape.js` for rendering the yin/yang/Wuxing network.

No heavy UI framework needed — start with plain React + TailwindCSS or similar lightweight styling.

---

## 6. Project Structure (Proposed)

```
ansci-ai-model/
├── packages/
│   ├── api/                    # Express + TypeScript OpenAI-compatible server
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   └── chat.ts     # /v1/chat/completions
│   │   │   ├── engine/         # Symbolic reasoning engine
│   │   │   ├── graph/          # Neo4j client + graph interface
│   │   │   └── ingestion/      # LLM-based knowledge extraction
│   │   └── package.json
│   │
│   └── dashboard/              # Vite + React frontend
│       ├── src/
│       │   ├── components/
│       │   └── pages/
│       └── package.json
│
├── docker-compose.yml          # Neo4j + API services
├── turbo.json                  # Monorepo task runner
└── pnpm-workspace.yaml         # pnpm workspaces
```

---

## 7. Key Dependencies

| Layer | Package | Purpose |
|-------|---------|---------|
| API | `express`, `@types/express` | HTTP server |
| API | `zod` | Request/response validation |
| API | `neo4j-driver` | Graph database client |
| API | `@xenova/transformers` | Local embedding for fuzzy matching |
| Dashboard | `vite`, `react`, `typescript` | Build tooling and UI |
| Dashboard | `react-force-graph-2d` | Graph visualization |
| Shared | `tsx` | TypeScript execution in dev |

---

## 8. Critical Architectural Decisions

### Purity of the symbolic approach

**Neural nets are permanent, local-only interface helpers.**

We use `@xenova/transformers` (ONNX runtime, fully local, zero network calls) in three narrow roles:
1. **Input encoder**: Embeds user text and fuzzy-matches it to graph node labels or dictionary entries. Handles typos and synonyms without changing the graph.
2. **Response generator**: Takes facts retrieved from the graph and rephrases them into natural, fluent English. The graph provides the *truth*; the neural component provides the *voice*.
3. **Knowledge ingestion**: Used during build time (not runtime) to read texts and propose graph insertions. These proposals are validated against the dictionary layer before insertion.

**Crucial rule**: The graph is the silent backbone. If a user asks "What is a derivative in math?", the response generator must produce a normal mathematical explanation. It must NOT mention Yang or Fire unless the user explicitly asks about yin-yang ontology. The ontology organizes truth internally; it does not leak into user-facing text unless requested.

### Reasoning for unseen questions

The graph encodes *associative* and *conceptual* truth (derivative ↔ Yang ↔ Fire). It does not execute calculus. For procedural or mathematical answers, the graph stores the *classification* and *relationship* of the concept, and the response generator produces explanatory text. If computational answers are required later, a separate Wolfram Alpha or Python bridge can be invoked — but that is out of scope for the ontology engine itself.

### Atomic vs. learned knowledge

Three layers coexist in the same graph, each with a `layer` property:

- **Atomic**: Yin, Yang, Wuxing, trigrams, hexagrams, and their defined relationships. Immutable at runtime. These are the fixed cosmological framework.
- **Dictionary**: Vocabulary entries (words, definitions, part-of-speech, domain). The ingestion LLM must query the dictionary layer before creating new graph nodes. If a word exists, the LLM uses the provided definition rather than inventing its own. If a word does not exist, the LLM proposes a definition that is stored as a new DictionaryEntry, flagged for human review. This makes the dictionary an active authority, not a passive reference.
- **Acquired**: Ingested mappings from texts like the *Yellow Emperor's Classic* or modern concepts (e.g., electromagnetism → yin/yang). These nodes link *into* atomic nodes but are not atomic themselves. All acquired relationships carry a `confidence` score (0.0–1.0). The reasoning engine uses `confidenceThreshold` from QueryIntent to decide which relationships to trust.

This allows queries to filter by layer, source, and confidence. It also enables a refinement loop: as more texts are ingested, the same concept may accumulate multiple relationships from different sources. The graph becomes richer, and conflicting mappings are exposed for review rather than hidden.

---

## 9. Immediate Next Steps

1. **Initialize monorepo** with pnpm workspaces, Turbo, and TypeScript base configs.
2. **Scaffold Express API** with a single `/v1/chat/completions` stub that echoes back a test response in OpenAI format.
3. **Define the graph interface** in TypeScript (node types, relationship types, confidence scores, source tracking). Implement with an in-memory adjacency list + JSON persistence.
4. **Seed the atomic layer** — Yin, Yang, Wood, Fire, Earth, Metal, Water, trigrams, and their mutual-generation/restraint relationships.
5. **Seed the dictionary layer** with initial vocabulary and definitions (mathematics, physics, common terms).
6. **Build the query interpreter** — integrate `@xenova/transformers` for fuzzy concept matching, outputting a typed `QueryIntent`.
7. **Build the reasoning engine** — traverses the graph, respects confidence thresholds, and decides whether to include ontology paths based on `includeOntology`.
8. **Create the response generator** — graph facts → natural language. Verify it does NOT leak ontology terms unless explicitly asked.
9. **Build the ingestion pipeline** — chunk text, prompt an LLM for structured extraction with dictionary authority, validate with Zod, merge into graph with confidence scores and source tracking.
10. **Vite dashboard** — a minimal React app to query the API, visualize the graph, and review flagged ingestion proposals.

---

*Last updated: 2026-05-20*
