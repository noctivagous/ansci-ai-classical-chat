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
The repair work is governed by `repair-programme.md` beside it —
the slice programme for the ten known weaknesses, the hypothesis
registry for every surviving non-cycle claim, and the two standing
user decisions (Slice 1 classification principle; density/precision
thresholds).

The WP2 benchmark infrastructure the programme specifies is built
and described in `wp2-tooling.md`: the sealed-materials machinery
(C.5 — manifest, hashing, author/operator/custodian operations,
G0-accuracy scoring per amendment A1) and the review-triage queue
machinery (C.6). The judging itself awaits independent humans, as
specified; nothing in the tooling simulates it.

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
- The WordNet lexicon provider, new in `src/fork/`:
  - `wordnet-lex.ts` — derives lexicon entries for English words the
    hand lexicon does not know, from the existing Open English
    WordNet extract (`src/wordnet.ts`, reused read-only; if the
    extract is absent the provider silently disables and the parser
    behaves as before). Verbs get regular-morphology forms and a
    permissive frame (slots `[patient]`, nothing required — WordNet
    gives no valency, so the Wood→Earth checker has nothing to check
    a derived verb against; that limit is stated in the module, not
    hidden). Nouns and adjectives derive with their lemma normalised
    through the extract's forms index. Adverbs are NOT derived: the
    extract trimmed adverb synsets, so there is nothing honest to
    derive from. Derived entries are marked `source: "wordnet"`,
    registered into the lexicon only where the hand lexicon has not
    claimed the key (the hand lexicon always wins), and removed
    again when the provider is toggled off.
  - Semantic climbing: a concept the curated table does not know can
    climb WordNet hypernyms to a classified anchor (gale —IS_A→ wind,
    Wood @0.855; drizzle —IS_A→ rain, Water), confidence decaying
    ×0.9 per hop and gated at the join's 0.6 — hurricane's climb
    finds the storm anchor at 3 hops but decays to 0.51 and is
    refused. Climbed classifications carry the third provenance tag
    `wordnet-derived` and join through `deriveSentence` with the
    anchor's correspondence row inherited. Tabled concepts are never
    climbed (the table, with its (concept, aspect) discipline, owns
    them — that is the X1 brake: 'cold' the illness still derives no
    winter).
  - `scripts/fork-holdout.mjs` + `holdout-run.md` — the holdout run:
    80 sentences from the OLD chat's evaluation files (written for a
    different system, never fitted to this parser), parsed with the
    provider OFF vs ON. Headline: parse rate 31.3% → 85.0%, 43
    sentences flipped fail→success, zero parse or round-trip
    regressions; exact round-trip stays low (8/68) because
    generation canonicalises. The run's own document carries the
    full lists and the honest reading, including the classification
    mean's denominator effect.
- The CSKG feeder interface, new in `src/fork/`:
  - `cskg-feed.ts` — the mapping from CSKG triples (the loader's
    shape, `src/cskg/loader.ts`) to fork link records: Causes →
    causal, UsedFor → function, AtLocation → location,
    HasSubevent/HasPrerequisite → ordered procedure-chain links,
    IsA → classification evidence only (never a direct assertion),
    RelatedTo → weak association kept only when both ends classify;
    anything else drops with a named reason, as does any triple
    whose ends cannot be classified by the table or the WordNet
    climb. The mapping is fixture-tested; live ingestion lives in
    `cskg-ingest.ts`, which streams the CSKG extract
    (`data/raw/cskg/cskg.tsv.gz`, a local install artifact —
    `data/raw/` is gitignored, so a fresh checkout has no data)
    through the mapper with drop accounting. Availability is a
    reported state: with no extract installed, ingestion returns
    status "absent" and banks nothing; it is not faked either way,
    and the test suite passes in both states.
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
  - `scripts/fork-chat.mjs` — the unscripted line-at-a-time runner
    (`npm run fork:chat`, alias `npm run chat:fork`): each typed line
    is one turn through the loop above, reply plus trace printed. It
    exercises the WordNet-backed parser, so sentences the hand
    lexicon could not take apart now parse in the runner — and the
    trace shows it. The reply composition limits in the turn loop
    itself (below) are unchanged by that.

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
**(Repair tranche, 2026-11-15)** nominal predication: an Earth topic
predicated as an Earth nominal takes the declared `predicated-as`
relation — a meaning-graph relation type, **not a cycle edge** (its
cycle field computes to `other`) — with the EN copula as its
connective realisation and ZH zero copula （今天星期一 / *Today is
Monday.* both parse and round-trip; the outright failure this closes
was recorded in the parser transcript: 今天星期一 previously
degenerated to the single node 一）; agentless passives keep the
suppressed valency slots **declared** on the predicate's
`suppressedRoles` state (the agent in *The book was given.*, plus
the recipient the promotion skipped; ZH 饭被吃了 likewise) — the
checker does not flag a suppressed slot as a missing argument, and
generation neither demands nor invents a filler, while expressed
by-agent passives remain edge-identical to their actives.

**Honest limits — read before believing any of this generalises**

- The parser is **template-driven**, and its English lexicon is now
  the hand lexicon **plus** the WordNet provider above — the holdout
  run (`holdout-run.md`) measures what that buys on sentences the
  parser was never fitted to (parse rate 31.3% → 85.0%). It remains
  a mechanism demonstrator, not a general NLP parser: the template
  shapes are still the evaluated ones, and Chinese has no provider
  (its lexicon is still the hand one). Derived-verb limits, stated
  plainly: no valency (nothing for the checker to check), regular
  morphology only (the surface *blew* resolves to *blow* for parsing,
  but a generated past reads *blowed* — visible in the turn loop's
  acknowledgements), and progressive aspect in a main clause
  canonicalises in generation (*Winter is coming* now analyses
  *come* as the verb and generates *Winter comes.*).
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
