# CSKG spike — evaluation report (2026-11-09)

**Question under test** (user rescope, 2026-11-09): can conversational
management, thought tracing, session memory and grounded rendering
work over CSKG alone — no ontology, no WordNet senses, no Wuxing?
The ontology track is explicitly deferred; Milestone 1's transcript
explicitly does **not** limit this evaluation.

**Verdict in one paragraph:** the conversation machinery ports cleanly
and the headline post-2d failures are genuinely fixed — statements get
grounded replies instead of declines, the corkscrew question finds its
tool (by an unexpected route, see below), and multi-turn
correction/follow-up/replay all work. What limits the chat now is not
the machinery but CSKG itself: its everyday causation is thinner than
ConceptNet's reputation (onions have *no* Causes edges in the merged
graph), its loose edges are rendered as faithfully as its good ones,
and term-level resolution can't tell a sentence fragment from a topic.

Reproduce:
```
npm run build
CSKG_CHAT_LOCATION=Chicago node dist/src/cskg/chat.js --script scripts/cskg-evaluation.txt --debug
CSKG_CHAT_LOCATION=Sydney  node dist/src/cskg/chat.js --script scripts/cskg-evaluation-sydney.txt --debug
CSKG_CHAT_LOCATION=Chicago node dist/src/cskg/chat.js --script scripts/cskg-explore.txt --debug
```
Evaluation run 2026-11-09 ~22:48–22:51 CST (the situation turns use the
real clock; season answers below are November-correct).

---

## Load (data/raw/cskg/cskg.tsv.gz, merged file)

| | |
|---|---|
| rows in file | 6,001,531 |
| dropped by relation filter | 1,058,061 (FormOf/DerivedFrom/Etymologically*/HasContext/fn:HasLexicalUnit/dbpedia/*/Not*/DistinctFrom — the filter runs first, so most non-English rows are inside this number) |
| dropped as malformed / self-loop / junk id | 53,439 |
| duplicate attestations merged into support | 94,933 |
| **edges kept** | **4,795,098** |
| **terms indexed** | **1,203,994** |
| load time | ~27 s per process start |

Storage is parallel typed arrays + CSR adjacency after a first
object-per-edge attempt OOMed Node's default heap. Provenance is a
per-edge dataset bitmask; **support = distinct datasets attesting the
edge** is the only confidence signal (CSKG carries no numeric weight
in this file) and drives the renderer's hedging. `cskg_star.tsv.gz`
also downloaded and verified; the spike loads the merged file.

## How the conversation layer is structured

- `src/cskg/loader.ts` — stream parse, normalisation (`/c/en/` strip,
  WordNet sense-suffix cut, ATOMIC `personx` removal), typed-array
  index. Kept vocabulary is CSKG's own relation names (ConceptNet
  core + `mw:MayHaveProperty` + ATOMIC `at:*`).
- `src/cskg/converse.ts` — longest-match closed-vocabulary resolution
  (multiword wins; one recorded trailing-`s` form variant; no
  stemming), head-word candidate expansion ("pot of soup" also offers
  "soup"), intent patterns per relation family, statements answered
  with the best-scoring grounded fact across candidates, a
  ThoughtTrace per turn kept in a 20-turn ring, session topic stack,
  correction re-resolution, and trace replay that does not re-query.
- `src/cskg/render.ts` — one template per relation, conclusions only,
  nothing invented; support ≥ 2 asserts, support = 1 softens.
- `src/cskg/chat.ts` — REPL + `--script`, `--debug` prints the trace
  (steps + exact edges) under each answer.
- CSKG has **no glosses**: "what is X" is an IsA + HasProperty
  neighbourhood sketch, not a definition. This shows.

## The Situation (situated self, minimal)

`src/cskg/situation.ts`: a `Situation` is computed per turn and never
stored — `{ now (real clock), place (env CSKG_CHAT_LOCATION /
CSKG_CHAT_HEMISPHERE + a small built-in place table), season, daypart
}`. Season is a plain fact of (date, hemisphere): December is winter
in Chicago and summer in Sydney; with no hemisphere configured the
season is *unknown*, never guessed from the month (unit-tested). No
Wuxing/yin-yang reading of any of it. The three sanctioned uses:
(1) direct questions (time / season / where-are-you, hedged when
unset); (2) a +5 selection bonus for season/daypart-relevant facts
when facts compete for the one-fact slot; (3) nothing else.

**Where it influenced answers:** the direct questions are correct in
both hemispheres (below). The selection pressure produced **no
observable flip** in this evaluation: the same statement in Chicago and
Sydney drew the same kind of fact, and "keep warm in winter" appears
in Sydney's coat answer in November (Sydney spring) because support
and relation priority outscored the seasonal bonus. The mechanism is
in; its effect at this weighting is below the noise floor of the data.

---

## Evaluation transcript (Chicago) — verbatim, with scores

Scores: **G** answered-grounded · **U** answered-ungrounded ·
**D** declined · **W** wrong-sense / wrong-topic.

### A. Statements (all three flat-declined in the post-2d system)

| # | Turn | Answer | Score |
|---|---|---|---|
| 1 | I'm making a big pot of soup on Saturday. | Soup is a dish. | G |
| 2 | My brother is bringing his new girlfriend. | Brother is a monk. | W — `brother —IsA→ monk` is a real edge and the wrong sense entirely |
| 3 | I'm thinking of selling my bike online. | Bike is a bicycle. | G (banal) |

### B. The two ConceptNet-shaped questions

| # | Turn | Answer | Score |
|---|---|---|---|
| 4 | Why do my eyes water when I chop onions? | Water can be caused by soaking in hotspring. | **U** — a real edge (`soaking in hotspring —Causes→ water`) answering a different question. Root cause is data: **onion has zero Causes edges in CSKG** (grep-verified), so the why-machinery grabbed the only causal edge touching any resolved term instead of declining. |
| 5 | What can I open a wine bottle with if I don't have a corkscrew? | You could use opener or corkscrew or corkscrew — Bottle opener is related to opener. | **G, with defects** — the right tool is in there. CSKG's merged corkscrew has **no UsedFor edge** (merge artefact); the answer was assembled by the RelatedTo+IsA fallback (`corkscrew —RelatedTo→ opening wine`, `corkscrew —IsA→ bottle opener`). Defects: "corkscrew" appears twice (two CSKG nodes normalise to one label) and the citation sentence names the wrong edge. |

### C. Milestone-1 subset

| # | Turn | Answer | Score |
|---|---|---|---|
| 6 | My bananas have gone all brown. | Bananas is a film. | W — CSKG's `bananas` node *is* the film; the exact plural match beat the fruit |
| 7 | Can I still make banana bread with them? | Banana bread is a quick bread. | G (true, only weakly responsive) |
| 8 | It's the third day of rain here. | Third is an echelon. | W — the fragment "third" outscored the topic "rain" on support |
| 9 | I'm thinking of buying a winter coat. | Winter coat is a coat. | G |
| 10 | Is ginger tea a warming food? | Ginger is a herb. | G (answers about an ingredient, not the question) |

### D. Free everyday questions

| # | Turn | Answer | Score |
|---|---|---|---|
| 11 | What is a headache? | Headache is an ache. | G (thin — no glosses exist) |
| 12 | Why do people get headaches? | Get headache can be caused by thinking. | G — the edge is real; the causation is ConceptNet noise |
| 13 | What can I use a hammer for? | Hammer can be used for hit. … pound. … whack. | G |
| 14 | Where would I find a penguin? | You can often find penguin at zoo. … at antarctica. | G |
| 15 | What is a passport used for? | Passport can be used for identification. … control entry into country. | G |
| 16 | How are a coat and a jacket related? | Coat is related to jacket. | G (direct edge; thin) |
| 17 | What is money used for? | Money can be used for rich. … needs. … saving. | G (mixed-quality targets, all attested) |
| 18 | What happens when it rains? | Rains involves most people stay inside homes. | G (apt content, clause-shaped target breaks grammar) |
| 19 | Is a wheel part of a bicycle? | Bicycle has chain. Bicycle has two tires. Bicycle has two wheels. | G — indirect affirmative via HasA listing |
| 20 | What is a bicycle made of? | Bicycle is made of metal. | G |

### E. Multi-turn: correction, follow-up, bare why, replay, situation

| # | Turn | Answer | Score |
|---|---|---|---|
| 21 | What is a cold? | Cold is a temperature. Cold is a respiratory disease. Cold is a communicable disease. Cold is a disease. | G — all senses piled up; CSKG has no sense separation, the correction flow is the remedy |
| 22 | No, I meant the common cold | Got it — common cold. Common cold is a disease. | G |
| 23 | What about the flu? | Flu is a virus. | G (loose IsA — flu is *caused by* a virus; the edge says IsA) |
| 24 | Why? | I know the term "flu", but this graph doesn't say anything usable about it. | **D** — honest; CSKG has no Causes edges for flu in either direction |
| 25 | Why did you say that? | That answer didn't rest on any graph edge — it came from the conversation itself. | G — replay correctly reports the *decline's* trace |
| 26 | What season is it? | In Chicago it's autumn just now (November, northern hemisphere). | G |
| 27 | What time is it? | It's 10:51 PM here — night by the clock I'm running on. | G |
| 28 | Where are you? | I'm set up as being in Chicago. That's configuration, not a sense — I can't feel a place. | G |

**Main evaluation totals: 23 G / 1 U / 1 D / 3 W of 28.**

### Sydney run (same month, opposite hemisphere)

| Turn | Answer | Score |
|---|---|---|
| What season is it? | In Sydney it's spring just now (November, southern hemisphere). | G |
| I'm thinking of buying a winter coat. | Coat is a clothing. | G |
| What is a coat used for? | Coat can be used for looking good. Coat can be used for keeping warm. Coat can be used for catch pigeons. | G — third target is an attested ConceptNet edge (`coat —UsedFor→ catch pigeons`); the graph really says that |

### Exploratory turns (Chicago)

| Turn | Answer | Score |
|---|---|---|
| I'm planning a camping trip in the mountains. | Camping is a sleeping outside. | G (gerund-phrase target, awkward) |
| How are rain and snow related? | Rain and snow and related don't share any neighbours I can find within two steps. | **D** — `rain and snow` is itself a single CSKG node; longest match swallowed both conjuncts and the node has no shared neighbours to offer |
| What is the opposite of hot? | The opposite of hot is cold. | G — crisp, via CSKG's Antonym edge (resolution matched the whole phrase `opposite of hot` as one node; head-word expansion rescued it) |
| I feel tired all the time. | Time is a single. | W — "time" captured the acknowledgement; ATOMIC feeling-events never fired |
| What about coffee? | Coffee is a beverage. | G — topic switch works |
| Tell me about winter. | Winter is a spend. | W — attested junk edge (`winter —IsA→ spend`) |
| What do people take to the beach? | People is an animal trainers. | W — no intent covers the pattern; salience picked "people" |
| Why do we sleep? | Sleep can cause improvement in health. | G — an *effect* offered as a reason (see Undesigned behaviour) |

---

## Failure classes, ranked

1. **Topic capture by non-topic terms** (turns 2, 6, 8, explore-tired,
   explore-beach, explore-winter). Resolution + support scoring cannot
   distinguish the sentence's topic from fragments ("third"),
   secondary nouns ("brother"), plural-form traps ("bananas" the
   film) or loose junk edges ("winter IsA spend"). No POS/discourse
   model exists in the spike; this is the single largest class.
2. **CSKG data gaps at famous joints.** Onion: zero Causes edges.
   Flu: zero Causes edges either way. Corkscrew: UsedFor lost in
   CSKG's merge. Everyday causation in the merged graph is markedly
   thinner than raw ConceptNet's reputation — a finding about CSKG,
   not about the machinery.
3. **No quality floor on attested edges.** `thinking —Causes→ get
   headache`, `money —UsedFor→ rich`, `coat —UsedFor→ catch pigeons`
   are rendered as faithfully as good edges; support=1 hedging
   softens the claim but cannot rank sense.
4. **Clause- and fragment-shaped targets** break sentence grammar
   ("most people stay inside homes", "control entry into country",
   "a sleeping outside"). Length filters help definitions only.
5. **Coordination swallowing.** Multiword longest-match, CSKG's
   strength, eats "rain and snow" whole and strands the relatedness
   intent.
6. **Normalisation collisions.** Two CSKG nodes → one label
   ("corkscrew or corkscrew"); fallback answers can cite a sibling
   edge instead of the named tool's.
7. **No sense separation.** What-is piles every sense (cold =
   temperature + disease + …). The correction path is the only
   remedy, by spike design — but it means first answers on ambiguous
   words are shotgun blasts.

## Undesigned behaviour (observational only)

Watched for, per the project's emergence stance. Candidates found,
classified honestly — **no (a)-class genuine emergence was observed**:

1. **The corkscrew assembly** (turn 5). The direct UsedFor route does
   not exist in CSKG, yet "corkscrew" surfaced, chained from
   `RelatedTo: opening wine` + `IsA: bottle opener`. *Classification:
   (b) — a designed repair.* I wrote that fallback after inspecting
   the data; its aptness is engineered, not emergent. The only
   undesigned part is "opener" also surfacing, which is noise.
2. **The indirect "yes"** (turn 19). Asked *is a wheel part of a
   bicycle*, the system listed the bicycle's parts, wheels among
   them — which reads as an affirmative answer with evidence. The
   intent only fetched PartOf/HasA conclusions; the "yes" is the
   reader's pragmatic inference, nowhere represented in the system.
   *(b) lookup artefact that looks like reasoning.*
3. **Teleology from causation** (explore, sleep). "Why do we sleep?"
   → "Sleep can cause improvement in health" — an effect wearing a
   reason's clothes. Nobody wrote a teleology rule; it falls out of
   the actor-first Causes-out heuristic in why-questions. It happens
   to be the kind of answer a person would give, which is exactly
   why it must be labelled: *(b), a direction-of-fit error that
   reads well.*
4. **ATOMIC content in a statement** (earlier run). "I'm thinking of
   selling my bike online" once drew "Selling involves set price"
   from an ATOMIC event match. Event matching for statements was
   specified in the brief; the aptness of the specific content is in
   the data. *(b).* (In the final run, score-based fact selection
   preferred `bike —IsA→ bicycle` — the event fact lost on support.)
5. **"corkscrew or corkscrew"** (turn 5). *(c) bug* — two distinct
   CSKG nodes normalising to one label, both passing the tool filter.
6. **Situation-driven drift** — *not observed.* Same inputs in
   Chicago and Sydney selected the same facts; the seasonal bonus
   never flipped a winner. Reported as an absence, not dressed up.

## What it still can't do

- **Define anything.** No glosses exist in CSKG; what-is is a
  neighbourhood sketch, often thin ("Headache is an ache").
- **Reason causally where it matters most.** The two flagship causal
  questions of everyday life in this evaluation (onions, flu) have no
  causal edges in the merged graph at all. Multi-hop causal chaining
  is not attempted in answers (paths appear only in relatedness,
  ≤ 2 hops, debug-visible).
- **Use ATOMIC conversationally.** Events fire only when a resolved
  term literally *is* an ATOMIC event node; paraphrase ("I feel
  tired all the time") never reaches xReact/xEffect knowledge.
- **Handle quantities or facts.** The Wikidata-CS portion is inside
  CSKG, but the loader's vocabulary dropped `/r/dbpedia/*`; nothing
  numeric can be answered.
- **Tell topic from text** (failure class 1) — the ceiling on
  statement quality until some discourse/POS signal exists.
- **Start fast.** ~27 s load per process; no serialised index yet.
- Tests: spike adds 9 (fixture-based) — project suite 99/99, the
  pre-existing 90 untouched; `tsc` clean.
