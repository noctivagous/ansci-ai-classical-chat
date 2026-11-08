# AnSci — Architecture Concept

## What This Is

AnSci is an AI whose mind is an **ontology graph**, not a neural network. It answers questions by traversing a knowledge graph rooted in ancient Chinese cosmology (yin/yang, Wuxing, trigrams, hexagrams) and extended by reading text.

The neural components are **interface helpers only**: they turn user text into graph queries, and graph facts into fluent English. They do not store knowledge, do not reason, and do not decide what is true. The graph does.

Because the graph is built by having an LLM read texts — ancient medical classics, modern physics, anything — it grows continuously. It is a **living knowledge structure** that improves with each ingested text and with human curation.

---

## The Core Insight

A regular LLM stores knowledge as statistical patterns in billions of weights. It "knows" that winter is cold because it has seen the phrase "cold winter" millions of times. It has no underlying reason.

AnSci knows that winter is cold because:
- Winter is linked to the Water element.
- Water is linked to maximum Yin.
- Yin is linked to cold, dark, stillness.
- Therefore, winter is cold.

This is not a hand-coded rule. It is a **path through the graph** that emerges from the ontology itself. The same structure generates explanations for seasons, emotions, the human body, electromagnetism, and calculus — because all of them are mapped onto the same underlying framework.

---

## Why This Is Not Just a Knowledge Graph with an LLM Wrapper

Most "knowledge graph + LLM" systems use the graph as a retrieval layer: they fetch relevant triples and feed them into a prompt for an LLM to summarize. The LLM still does the reasoning.

AnSci does the opposite:
- The **graph is the reasoner**. It traverses relationships, resolves conflicts by confidence score, and decides which facts to include.
- The **LLM is the translator**. It turns graph paths into English, but it does not decide what is true.
- The **ontology is generative**. New facts are derived from old ones by graph traversal, not by training data.

This means AnSci can explain *why* it believes something: it can show you the exact path from your question to the answer, with source passages, confidence scores, and the rules it followed.

---

## The Four Layers of the Graph

### 1. Atomic Layer — The Fixed Cosmos

Yin, Yang, the Five Elements (Wood, Fire, Earth, Metal, Water), the Eight Trigrams, and eventually the 64 Hexagrams. These are immutable. They define the rules of the system.

Relationships here are absolute truths:
- Water generates Wood.
- Fire restrains Metal.
- Yin contains the seed of Yang.

No confidence score is needed. These are the axioms.

### 2. Dictionary Layer — The Vocabulary Authority

Before AnSci can ingest a text about derivatives or electromagnetism, it needs to know what those words mean. The DictionaryEntry nodes provide canonical definitions.

When the ingestion LLM reads a passage and encounters a word, it **must query the dictionary first**:
- If "derivative" is already defined as a mathematical concept, the LLM uses that definition.
- If a word is unknown, the LLM proposes a definition, which is stored with status "proposed" and flagged for human review.

This prevents drift. Without a dictionary authority, an LLM reading 100 texts might slowly redefine "derivative" differently in each one.

### 3. Acquired Layer — The Growing World

This is where text becomes structure. When the ingestion pipeline reads the *Yellow Emperor's Classic*, it extracts concepts like "pulse" and "seasonal harmony" and maps them onto the atomic ontology:

```
Concept: "winter pulse"
  -> HAS_POLARITY -> Yin
  -> HAS_ELEMENT -> Water
  -> DEFINED_AS -> DictionaryEntry "pulse"
  -> SOURCED_FROM -> TextPassage "neijing-suwen-ch1-p3"
```

When it reads a modern physics text, it does the same:

```
Concept: "Lenz's law"
  -> HAS_POLARITY -> Yin (mutual-inhibition aspect)
  -> HAS_ELEMENT -> Metal (restraint, contraction)
  -> ASSOCIATED_WITH -> "Faraday's law"
  -> SOURCED_FROM -> TextPassage "physics-text-ch12-p210"
```

All acquired relationships carry a **confidence score**. This is crucial because:
- The same text might produce conflicting mappings from different passages.
- The reasoning engine can exclude low-confidence mappings by default.
- A human reviewer can see which facts are well-supported and which are speculative.

### 4. Source Layer — The Audit Trail

Every acquired fact links back to the exact passage from which it was extracted. This means:
- You can ask "Where did you learn that?" and AnSci retrieves the original text.
- You can verify or dispute any fact by reading its source.
- The graph is not a black box. It is an annotated, debatable structure.

---

## The Ingestion Loop: How the Graph Grows

AnSci is not a static database that you query. It is a system that **learns by reading**, and the LLM that reads the text is also the trainer that evaluates and adjusts the graph.

**The graph is the model. The LLM is the trainer.**

```
You provide a text (PDF, markdown, web page, anything)
        |
        v
Text Chunker splits it into overlapping paragraphs
        |
        v
PHASE 1: READ & EXTRACT (LLM as student)
  Ingestion LLM reads each chunk and proposes graph insertions
        |
        v
Dictionary Authority checks: does this word already have a definition?
        |
        v
Graph Merge Logic: deduplicate, resolve conflicts by confidence, flag ambiguities
        |
        v
Source Tracking: link every new fact to the original passage
        |
        v
PHASE 2: EVALUATE (LLM as grader)
  LLM generates test questions from the original text
  LLM queries the graph through the reasoning engine
  LLM compares graph answers to expected answers from the text
        |
        v
PHASE 3: ADJUST (LLM as editor)
  If graph answer is wrong: LLM traces the error to the responsible relationship
  LLM proposes a fix: update confidence, deprecate, re-link, or add missing connections
  Fix is applied and logged as a GraphAdjustment node
        |
        v
Repeat Phase 2 until the graph produces consistently correct output
        for the ingested text.
```

This is a **training loop**, not a one-time import. The LLM does not just extract facts — it **trains the graph** to be correct. After the first pass, the graph might get a question wrong. The LLM identifies which relationship caused the error, adjusts it, and tests again. The same passage may be re-evaluated multiple times until the graph's answers converge to correctness.

Over time, the same concept accumulates multiple relationships from different sources. The graph becomes **more robust**, not more confused, because the LLM evaluates every new insertion against the existing structure and resolves conflicts by evidence quality rather than recency.

---

## The Query Loop: How AnSci Answers

```
User asks: "What is a derivative in math?"
        |
        v
Input Encoder (local neural net, ONNX)
  - Embeds the question.
  - Fuzzy-matches against all graph node names.
  - Returns a QueryIntent:
    { matchedNodes: ["derivative"],
      intentType: "definition",
      includeOntology: false,
      confidenceThreshold: 0.8 }
        |
        v
Reasoning Engine (symbolic, TypeScript)
  - Sees includeOntology is false.
  - Stops at DictionaryEntry "derivative" and the concept summary.
  - Does NOT traverse HAS_POLARITY or HAS_ELEMENT.
  - Does NOT mention Yang or Fire.
        |
        v
Response Generator (local neural net, ONNX)
  - Receives: { definition, summary }
  - Produces natural English:
    "A derivative is a measure of how a function changes as its input changes.
     It represents the instantaneous rate of change at a particular point."
```

Compare with:

```
User asks: "How does the concept of derivative fit into ancient Chinese science?"
        |
        v
Input Encoder returns QueryIntent:
  { matchedNodes: ["derivative"],
    intentType: "ontology_explanation",
    includeOntology: true,
    confidenceThreshold: 0.7 }
        |
        v
Reasoning Engine
  - Sees includeOntology is true.
  - Traverses:
    derivative -> HAS_POLARITY (confidence 0.92) -> Yang
    derivative -> HAS_ELEMENT (confidence 0.88) -> Fire
  - Gathers the ontology explanation.
        |
        v
Response Generator
  - Receives: { definition, polarity: "Yang", element: "Fire", reasoning }
  - Produces:
    "In this framework, the derivative is associated with Yang and the Fire element,
     because it represents instantaneous, active, breaking-apart change."
```

The same graph. The same concept. Two completely different answers, because the **reasoning engine** decides what to retrieve based on what the user actually wants.

---

## Why This Matters

### Verifiability
AnSci can show you the exact path from question to answer, with source passages and confidence scores. A regular LLM cannot.

### Consistency
Because the graph is a single shared structure, if you correct a mapping (e.g., "derivative is actually more Metal than Fire"), every future answer that touches derivative improves automatically. You do not need to retrain a model.

### Controlled Ontology Leakage
The ontology organizes truth internally but does not force itself into every conversation. A user asking about calculus gets a calculus answer. A user asking about cosmology gets a cosmology answer. The same system handles both because the graph is layered and the reasoning engine is selective.

### Growth Without Drift
The dictionary layer prevents the ingestion LLM from slowly redefining words. The confidence scores prevent weak inferences from being treated as facts. The source layer makes every fact debatable. The training audit layer (GraphAdjustment nodes) makes every change to the graph auditable — you can see exactly why the LLM changed a relationship, what question it was trying to fix, and whether the fix worked. The graph improves with each text instead of degrading.

---

## The Technology in Three Sentences

- **Node.js + Express** serves an OpenAI-compatible API.
- **Neo4j** (or an in-memory JSON graph for prototyping) stores the ontology, dictionary, acquired concepts, source passages, and training audit trail.
- **Local ONNX neural nets** (via `@xenova/transformers`) handle fuzzy input matching and natural-language response generation, but all reasoning is symbolic graph traversal in TypeScript.
- **An external LLM** (OpenAI API or local) trains the graph: reading texts, extracting knowledge, evaluating graph answers, and adjusting the graph until output is consistently correct.

---

## What Success Looks Like

**Month 1**: AnSci answers basic questions using seeded dictionary definitions and atomic ontology. It can explain why winter is cold in terms of Yin and Water.

**Month 3**: After ingesting the *Yellow Emperor's Classic*, AnSci answers TCM questions with specific terminology and can cite the exact passage it learned from. The LLM has evaluated and adjusted its own extractions dozens of times, converging on a stable TCM subgraph.

**Month 6**: After ingesting modern physics and mathematics texts, AnSci draws cross-domain connections — explaining that Lenz's law embodies mutual-inhibition, or that the derivative's Yang-nature is why it appears in the peak-action phase of the Wuxing cycle. The LLM has tested these mappings against textbook questions and corrected initial misclassifications.

**Month 12**: AnSci has read dozens of texts across domains. Its graph contains thousands of evaluated, confidence-weighted relationships. The LLM continues to train it: reading new texts, extracting knowledge, testing the graph, and adjusting until answers are correct. The graph is not just retrieved from; it is a **trained model** that improves with every text it reads.

---

*Last updated: 2026-05-20*
