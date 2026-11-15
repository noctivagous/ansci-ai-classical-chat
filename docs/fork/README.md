# The AnSci Fork — in this repo, on this branch

The fork is a new, different project living **on the branch
`feat/ansci-fork` inside the classical repo** (`ansci-ai-classical-chat`),
at the user's decision on 2026-11-15. (DESIGN.md §6 records an earlier
recommendation of a sibling repo; the user chose the branch.) The
classical track on `main` — CSKG chat, E1–E5 — stays the laboratory and
is untouched by this work.

**What the fork is.** A lightweight classical system centred on
building out the ancient Chinese knowledge graph itself: a fully
interrelated ontology (TCM relationships for the body, the world,
astronomy associations) whose two dynamics — the generating cycle and
the controlling cycle of the Five Elements — serve as the operators
of both the knowledge net and a new sentence layer. Feeders (Wikidata
for facts, web search for procedures, a small model in strategic
chairs) and "Bank what works" (successful retrievals distilled into
the graph with provenance) are designed in DESIGN.md but **not built
yet**. The design's centre, evidence, and open decisions are in
DESIGN.md; the evidence base is the three evaluation reports beside
it (desk evaluation of 30 sentences, cycle probes, prediction run).

**What exists on this branch**

- The foundation, carried over **unchanged**: the seed ontology graph
  (`src/seed.ts` — yin/yang, the five elements with both cycles as
  edges, trigrams, correspondence tables), the graph types
  (`src/graph.ts`), and the cycle operators (`src/engine.ts`,
  `src/propagate.ts` — generation/restraint traversal, propagation
  with decay, restraint arbitration, conflict flagging, balance).
  The fork's semantic layer is meant to grow from this seed; the
  correspondence build-out (DESIGN slice 1) has not started.
- The sentence layer, new in `src/fork/`:
  - `sentence.ts` — types (meaning graph with **no order
    information**; connective graph holding the token chain, spans,
    topic, and connective-only scaffolding; REALIZES alignment), the
    GENERATES/CONTROLS cycle tables, the lexicon, and the semantic
    join (`semanticClassifications` keys a sentence's semantic
    addresses to the seed's element nodes by name).
  - `parse.ts` — inward: connective → meaning, for English and
    Chinese, by slot filling against verb-lexicon valency frames.
  - `check.ts` — the controlling cycle as a named-violation checker
    (valency, agreement, the negation-carrier rule, the question
    carrier rule, classifier and particle-scope rules).
  - `generate.ts` — outward: meaning + language templates → surface.
  - `test/fork.test.ts`, `test/fork-grammar.test.ts` — the desk
    evaluations converted to regression tests.
- The join, new in `src/fork/` (Slice B):
  - `classify.ts` — a curated classification table (158 entries:
    emotions & states, weather & seasons, food & cooking, body, world)
    keyed by (concept, aspect), each entry carrying a confidence and
    a provenance tag — `fork-curated` where it restates the seed's
    attested correspondence tables, `fork-creative` for extensions,
    so the layers stay separated.
  - `join.ts` — loads the table into a graph built from the seed and
    derives with the EXISTING machinery (engine composition and cycle
    operators, propagation with decay/arbitration/flagging): inherited
    correspondences with derivation paths and confidences, a
    confidence gate (0.6) on traversal, conflicts surfaced.
  - `scripts/fork-density.mjs` + `density-run.md` — the density /
    overgeneration run at ×1 / ×10 / ×100 staged synthetic load.
- The turn loop, new in `src/fork/` (Slice C):
  - `session.ts` — the light situation record (entities, events,
    states) built only from parsed meaning graphs; pronoun resolution
    by recency within a compatible set.
  - `turn.ts` — parse → record → reason → reply. Replies are steered
    by named cycle paths recorded in a per-turn trace; questions are
    answered from derivation paths; unanswerable questions decline
    naming what's missing; the ontology is never named in a reply.
  - `scenarios.ts` + `scripts/fork-transcript.mjs` +
    `transcript-sample.md` — the four scripted scenarios (anger/news,
    worry/sleep, winter questions, soup) with full traces.

Mechanisms actually implemented: SVO slot filling (EN/ZH); passive
as a voice state on the same meaning graph as the active; verbless
predication by cycle entry at Fire/Earth (R1); interrogative force
as clause-level mood (R2); clause chaining at the generating
closure Water→Wood (serial verbs, 就); ZH aspect/question particles
as clause-scope attachments with scope-order generation and
checking; classifier generation Earth→Metal; A-not-A formation and
its exclusion of 吗; the K6 negation-carrier mechanism (auxiliary
carries tense, main verb bare); two addresses per word (syntactic
vs semantic element); **(Slice A)** R3 gaps/displaced realisation
(EN wh-fronting with the question word filling its ordinary slot,
topic fronting — same meaning graph, topic marked in the connective
graph only); R4 expletives (existential *there*, weather *it*,
do-support — connective tokens realising no meaning node, re-emitted
by the construction template in generation); R5 clausal modifiers
(EN relatives with overt *that*, ZH clause+的 before its head, the
head filling the clause's gap; reduced relatives structurally);
R6 resultative/degree complements as main content (EN *gone brown*
on the generating Wood→Fire arc, *got hot*, ZH 跑得很快's 得 degree
complement); R8 discontinuous realisation （一边…一边： one Metal
relation realised by two non-adjacent tokens); conditionals with a
Metal-logical condition relation between clause graphs and
subjunctive mood state (*were* accepted for first person — Fire→Metal,
mood forcing structure; *was* in that slot is register variation and
the checker deliberately has no violation for it); ZH wh-in-situ
（什么 in its ordinary object slot, interrogative as clause mood).

**Honest limits — read before believing any of this generalises**

- The parser is **lexicon- and template-driven over the evaluated
  vocabulary** (the words in the lexicon in `sentence.ts`, roughly
  the 30 evaluation sentences plus the probe/test sentences). It is a
  mechanism demonstrator, not a general NLP parser. Words outside the
  lexicon fail or fall back to a proper-noun reading.
- **Garden-path reanalysis is a named non-goal.** The reduced-relative
  STRUCTURE of *The horse raced past the barn fell* is supported
  (last verb roots the clause; *raced…* is a modifier clause), but
  recovering that reading after first taking *raced* as the root —
  the reanalysis itself — is not implemented.
- The density run (`density-run.md`) reports measurements only:
  **the §5.2 pass bar was not pre-set by the user**, so no stage is
  claimed to pass or fail. Headline: question-set conclusion growth
  is strongly sublinear (+22% for ×106 classifications) while the
  precision proxy degrades steadily (0.92 → 0.84 → 0.75); the
  hand-judged precision sample §5.2 specifies has not been done.
- The transcript gate (§5.1) has been run only as four SCRIPTED
  scenarios (`transcript-sample.md`) — the user's unscripted
  acceptance chat has not happened, and conversational use of the
  cycle dynamics beyond these scenarios remains unproven.
- Reply composition in the turn loop is scoped: acknowledgements are
  built from the situation record and follow-ups are chosen by the
  steering arc, but the follow-up wordings are a small hand-written
  set keyed to the arc and the situation's content — not open-ended
  generation from arbitrary meaning graphs. The sentence layer's
  generator is not yet the reply surface.
- Pronoun resolution is recency-within-a-compatible-set only (named
  in `session.ts`): no agreement features beyond the pronoun class,
  no bridging. It will misresolve in longer conversations; the trace
  records what it resolved to.
- Aspect placement canonicalises in generation: 我吃饭了 generates
  as 我吃了饭 (both grammatical; an aspect nuance the layer does
  not model). Topic fronting likewise regenerates as the unfronted
  claim (emphasis is a connective fact, not regenerated).
- Nothing on this branch has been pushed anywhere; per standing
  rules, pushes need the user's explicit word for that specific
  change.
