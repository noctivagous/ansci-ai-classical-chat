# AnSci Fork — Design (draft v0.1, 2026-11-15)

Status: DRAFT for the user's judgment. Nothing in this project has been
built. Evidence base: `desk-evaluation-sentences-wuxing.md`,
`cycle-probe-evaluation.md`, `prediction-run-and-baseline.md`
(all in this folder), plus the user's `sentencesToWuxing.txt`.

## 1. What this project is

A new, different project forked in spirit from AnSci — not a
replacement for the classical repo (`noctivagous/ansci-ai-classical-chat`,
CSKG-based, E1–E5), which stays as the laboratory.

The classical track's two blocking problems (user, 2026-11-15):
(1) knowledge acquisition — all needed knowledge cannot easily be
installed; (2) the classical parsers/generators depend on the graph
and take a long while to build out.

The fork's centre (user, 2026-11-15): **build out the ancient Chinese
knowledge graph itself** — a fully interrelated ontology carrying the
TCM relationships about the human body, the world, and the
associations of astronomy — on the thesis that classifying a thing in
that ontology brings it much closer to other knowledge and yields
information about it by correspondence. Emotion is the worked example:
anger → Wood → Liver / spring / east / wind / sour / shouting.

Design stance: the graph is the model. Models (small, fast) serve in
strategic chairs — routing, extraction, maintenance — never as the
mind. Lightweight and runnable anywhere is a hard constraint.

## 2. Architecture

### 2.1 The ontology net (the spine)
- Starts from the existing seed in the classical repo's earlier track:
  `src/seed.ts` (87 nodes / 117 edges: yin/yang, CONTAINS_SEED, the
  five elements with both cycles as edges, 8 trigrams, seasons, times,
  per-element correspondence tables), `src/graph.ts` (layers: atomic /
  dictionary / acquired / source / audit; confidence on acquired
  edges; GraphAdjustment audit), `src/engine.ts` + `src/propagate.ts`
  (cycle operators, propagation with per-relation decay, restraint
  arbitration, conflict flagging, balance assessment — built and
  test-verified 2026-11-08/09).
- The fork's first build work is growing this seed into the full
  correspondence graph, sourced: correspondence tables ingested from
  classical texts (the Neijing/Suwen correspondence chapters first)
  with per-passage citations in the source layer; variant schemes
  coexist as source-scoped assertions, never flattened. Attested
  material and creative extensions are kept in separate layers with
  different provenance and trust, always.
- Dynamics: the generating cycle (Wood→Fire→Earth→Metal→Water→Wood)
  and controlling cycle (Wood→Earth, Earth→Water, Water→Fire,
  Fire→Metal, Metal→Wood) are operators, not labels — construction
  and flow; constraint and arbitration.
- The brakes travel with the cycles (non-negotiable, per the
  cycle-probe evaluation's negative controls): per-relation decay,
  restraint arbitration, (concept, aspect)-scoped classifications,
  conflict flagging, curated supersedes propagated, classification
  confidence gates traversal. Overgeneration at density is the main
  known threat to the design.

### 2.2 The sentence layer
- Two linked subgraphs in one store (settled 2026-11-15):
  - **Meaning graph** — unordered; nodes typed by syntactic element
    (Verb=Wood, Adjective=Fire, Noun=Earth, Preposition/Conjunction=
    Metal, Adverb=Water, per the user's creative mapping — a creative
    application, not tradition, held as a tested hypothesis);
    generating edges = construction, controlling edges = constraint,
    node states for voice/negation/mood. Contains no order edges.
  - **Connective graph** — per-utterance; token NEXT chain, phrase/
    clause spans, precedence templates per language, topic/focus
    marking. This graph takes the word order.
  - **REALIZES alignment** between them (0 / 1 / span / discontinuous
    tokens per meaning node). No reasoning path traverses connective
    or alignment edges.
- Every word carries **two addresses**: syntactic element (its job in
  the sentence) and semantic element (its sense's classification in
  the ontology net). The join between the sentence layer and the net
  is the semantic address, sense-keyed, in the acquired layer.
- Grammar work list from the evaluations: rules R1–R8 (predicate
  root / cycle entry at any element; interrogative force; gap /
  displaced realisation; expletives; clausal modifiers; complement
  content — largely dissolved into the generating Wood→Fire arc;
  clause-scope particle attachment; discontinuous realisation), plus
  per-language construction templates as data （把， 被， 一边…一边，
  A-not-A, serial verbs, classifiers…).
- Parsing = inward (connective → meaning → semantic addresses);
  generation = outward (meaning → precedence templates → connective
  chain → surface). The ontology is never named on the surface
  (standing AnSci surface rule).

### 2.3 Feeders and banking ("Bank what works")
- Routing by source, every answer provenance-labelled
  (graph / Wikidata / web / model / memory):
  local graph first → Wikidata for facts (dishes, ingredients,
  origins — it holds no procedures) → web search for how-to /
  procedural knowledge → small model last.
- Web search at runtime is permitted by the user (2026-11-15) as an
  optional tier over the offline local graph.
- Banking gate: a successful retrieval is distilled into the overlay
  (acquired layer) as structure — e.g. a recipe's steps become
  subevent/prerequisite chains on the dish node — with provenance and
  source, only if it passes consistency checks (steps ordered and
  complete; ingredients consistent with graph facts; extraction lands
  in real relations). Failures stay cache-only. Banked items are
  individually reversible; pristine sources (CSKG, the attested
  atomic layer) are never edited in place.
- Local embeddings are computed with a tiny local embedding model
  over graph labels/glosses where vector lookup is needed; no source
  graph is expected to ship embeddings.

### 2.4 Model chairs (one small model, several chairs)
- Chairs: routing, extraction (web/text → graph structure),
  long-document parsing for ingestion, and the outer maintenance
  loop ("gardener": triage failures from traces as knowledge faults
  → overlay adjustments, or processing faults → code proposals).
- One provider interface; **hosted (e.g. Muse Ember) vs local
  (3–4B-class, Q4 ≈ 2–3 GB, CPU-runnable) first is an OPEN decision.**
- Standing rule for the gardener: code may learn how to ask, never
  what to answer — no factual answers patched into code or prompts.
  Graph banks (cheap, reversible) may be freer; code changes are
  propose-and-approve until the loop earns trust. Judge fixes on
  fresh holdout material, never only on the set that provoked them.
- **OPEN: gardener in the development loop only, or also banking
  live at runtime?**

## 3. Evidence so far (all desk-level, no fork code)

- Desk evaluation, 30 sentences EN/ZH: coverage 9 full / 18 partial /
  3 fail; canonical clause clean; "two rules only" claim fails;
  R1–R8 identified.
- Cycle-probe evaluation, 20 probes: corrected scheme 9 full /
  8 partial / 0 fail; strongest result K6 (negation routed through
  Metal explains do-support); semantic-layer cycles carry prior test
  evidence from the seed engine (80/80, propagation values verified).
- Prediction run: 6 predictions written from the cycles first
  (A-not-A ⊕ 吗 exclusion, wh-in-situ, classifier obligation/order,
  serial-verb chaining, relative-gap asymmetry, final-particle scope
  order) — 6/6 correct against established descriptions, with stated
  qualifications (evaluator-chosen phenomena, description-level
  checks).
- Baseline count: ~42 mechanism types for this scheme vs ~83 for a
  UD-style baseline over the same sentences, and the baseline still
  needs a separate system for semantics. Rough count, method stated
  in the report; the robust claims are the ratio, the interaction
  between mechanisms, and the shared semantic layer.

## 4. Build order (proposed slices, each gated, none approved yet)

0. **Home + seed extraction** — settle repo shape (see §6), carry the
   seed graph + engine operators over as the fork's starting point,
   verify the old tests still pass in the new home.
1. **Correspondence build-out** — ingest the attested correspondence
   tables with citations (Suwen correspondence chapters first);
   comparison report against the hand-authored seed for the user's
   judgment.
2. **Sentence layer** — meaning + connective graphs, cycle operators
   over them, R1–R8, EN + ZH templates for the evaluated phenomena;
   the 30-sentence set + 20 probes + 6 predictions become the
   standing evaluation, re-run as regression.
3. **The join** — semantic-address classifications at working density;
   **density gate (§5.2)** must pass before proceeding.
4. **Feeders + banking** — Wikidata, web search, banking gate,
   provenance labels end to end.
5. **Model chairs + gardener (dev loop)** — provider interface, one
   chair at a time; gardener propose-and-approve.
6. **Transcript gate (§5.1)** — the acceptance test for the whole
   fork, per standing AnSci method.

## 5. Acceptance gates still to be passed

### 5.1 Transcript evaluation (conversational layer — unproven)
Design: fresh scenarios (not the evaluation sentences), in which
cycle dynamics should steer replies — e.g. an anger statement
(Wood: reply path toward its Fire expression or its Metal
restraint), a worry/sleep statement (Earth restraining Water: reply
addresses the worry to release the sleep), a balance scenario across
several turns. Judging, per the user's standing standard: not good
surface replies but deep solutions — each reply must arise from a
cycle path visible in the trace (named per turn), with the ontology
never named on the surface; replies that could have come from a
template or a direct graph lookup pasted out fail the turn. Balance
conclusions never surface as medical claims.

### 5.2 Density / overgeneration test
Design: grow classifications in stages (seed scale → ×10 → ×100,
mix of curated, propagated, and banked-style acquired items) and at
each stage measure, on a fixed question set: precision of derived
conclusions (sampled and hand-judged), conflict-flag rate, how often
restraint arbitration fires, and whether confidence gating keeps
wrong-address amplification (the head-cold case) contained. Pass
bar to be set with the user before the run; a stage that fails stops
the build-out until the brakes are strengthened.

## 6. Open decisions (user's)

- **Repo shape**: branch of the classical repo vs sibling repo.
  Kavi's recommendation: sibling repo — you framed the fork as a new,
  different project; the classical repo stays the lab, and the seed
  is carried over in slice 0 either way.
- **Model first**: hosted Ember vs local small model, behind the
  provider interface (§2.4).
- **Gardener scope**: development loop only, or live runtime banking
  too (§2.4).
- This design doc itself: draft for judgment, not yet approved.

## 7. Standing rules carried over

Transcripts are the acceptance test; "evaluation", never "battery";
no GitHub push without the user's explicit word for that specific
change; the user's research kept visibly separate from Kavi's
additions; attested tradition, creative application, and Kavi's
analysis kept in distinct, labelled layers; ontology never named on
the chat surface; per-push approval (no standing push rule).
