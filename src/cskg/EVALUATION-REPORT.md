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

## E1 restructure note (2026-11-09)

Slice E1 of the conversation-engine design (docs/design-conversation-engine.md
§8) split the spike's single converse.ts into the design's pieces —
awareness, discourse, intent, memory, solve, articulate — over a typed
turn workspace, with the module graph as data in engine-map.ts and
trace steps citing its node ids. Structure only; no behaviour was
meant to change, and the transcripts say it didn't:

- Baselines for both evaluation scripts were captured with the
  pre-restructure build, then re-run after. Sydney: byte-identical.
  Chicago: 27 of 28 answers identical; the single differing line is
  "What time is it?" (11:48 PM in the baseline run, 11:55 PM in the
  later one) — the answer is read from the real clock at run time,
  and the runs were minutes apart. A clock artefact, not a code
  difference; nothing to fix.
- Project suite 99/99 (the spike's 9 fixture tests included, import
  paths moved, assertions untouched); `tsc` clean. Demo web UI
  re-verified end to end (status + a chat exchange, Chicago).

## E2 discourse note (2026-11-09)

Slice E2 of the conversation-engine design (§8) rebuilt discourse's
side of the turn: the breakdown is now a small composition graph —
mentions with character spans, every candidate graph node per
mention (exact, article-stripped, form variant), phrase grouping
with head/modifier/coordinated roles, coordination splitting — and
topic choice is scored (phrase role, modifier class, sentence
position, surface-form presumption, attestation, and overlap with
memory's active topics: the memory → discourse edge, read for the
first time). The trace shows one step per mention: span, phrase,
role, candidate scores, the chosen referent and its reasons, and an
ambiguity note where rival candidates' neighbourhoods are disjoint.
Statement topic selection and question subject selection both
consume the ranking.

Totals (Chicago script, 28 turns): **25 grounded / 1 ungrounded /
1 declined / 1 wrong-sense**, up from 23 / 1 / 1 / 3. Every changed
turn, before → after:

- "My bananas have gone all brown." — "Bananas is a film." →
  "Banana is a herb." (wrong-sense → grounded; the film node and
  the fruit node are rival candidates of one mention, disjoint
  neighbourhoods, ambiguity recorded in the trace; the fruit node
  wins on attestation plus food-context overlap with the soup
  topic). Named turn (ii): improved.
- "It's the third day of rain here." — "Third is an echelon." →
  "Rain is a fresh water." (wrong-sense → grounded; "third" is a
  modifier-class mention attached to the "day of rain" phrase,
  whose head is rain; the standalone form "It is the third day of
  rain." answers the same). Named turn (i): improved.
- "What happens when it rains?" — "Rains involves most people stay
  inside homes." → "Rain is a fresh water." (grounded → grounded;
  the one quality dip. The mention's chosen referent is now
  "rain" — better attested and the conversation's established
  precipitation topic — where the spike's flat resolution kept the
  surface node "rains" and its event content. Listed openly: the
  answer is true and on-topic but definitional, where the old one
  answered the question asked.)

Sydney script (3 turns): one change, grounded → grounded — "I'm
putting on a winter coat." now draws "Winter coat is a coat."
instead of "Coat is a clothing." (the fuller mention outranks its
own head-word expansion as the statement's topic).

Watch turn: "My brother is bringing his new girlfriend." still
answers "Brother is a monk." — unchanged. The breakdown now shows
why E2 cannot fix it: CSKG's loader merges WordNet senses onto one
node, so "brother" has no rival sense nodes to choose between
(sibling, male, monk and member are edges of a single node, and
the monk edge's support 2 beats sibling's 1 inside solve's fact
scoring). That is a within-node sense mixture — E3 (solve)
territory, not a topic-choice failure. The girlfriend phrase is
meanwhile scored as a topic in its own right; it simply does not
outscore the subject — and "new girlfriend" itself carries no
fact-bearing edge, only its head-word expansion "girlfriend" does.

Two scoring lessons recorded while tuning, both measured on the
live graph: overlap against the *union* of all topic neighbourhoods
is hub noise ("buying" shared 29 neighbours with a mid-conversation
union, the word "a" shared 40), so overlap is now the best
single-topic affinity at tiebreak strength (+1 per shared
neighbour, capped +15); and a gerund's object, not the gerund, is a
statement's topic ("buying a winter coat" briefly answered "Buying
is a buying activity." before the gerund–object phrase rule).

Tests: three fixture tests added (coordination splitting, ordinal
topic scoring, bananas sense choice); one pre-existing loader test
now filters to the edge it names, since the fixture's banana gained
a second IsA edge. Project suite 102/102; `tsc` clean. Nothing
pushed.

## E3 solve note (2026-11-09)

Slice E3 of the conversation-engine design (§6, §7, §8) rebuilt
solve's side of the turn, in two steps.

**Step 0 — the contents breakdown, factored out.** The §2
submodule inside B now lives in its own unit
(`src/cskg/contents.ts`), consumed by discourse: every mention
with a chosen referent is categorised into **people / places /
things / times** (the open kind set; times recognised from the
start). Each entry carries its mention, its candidate kinds WITH
scores and the signals that produced them, its chosen kinds (dual
membership allowed — "winter coat" records time+thing), its
chosen referent, and the speaker / here-elsewhere markers.
Signals are graph-derived where possible (IsA ancestry into
per-kind anchor sets, AtLocation participation for places) and
surface patterns for times (day and month names, seasons,
durations, "…day" expressions). Kind choices are noted in the
trace like every other choice B makes. **Diff check: both
evaluation scripts re-run after the factoring are byte-identical
to the pre-factoring runs (the clock line excepted)** — the step
changed no score, no choice, no answer, as declared.

**Step 1 — solve.** Four mechanisms, all recorded in the trace:

- **Triage, explicit.** Every turn that reaches solve notes its
  classification — retrieve | solve | combination — and what set
  the question asks about. "What happens when X?" is triaged as
  an event-consequence question and routed accordingly (below).
- **Set operations for tool problems.** The strict set (reverse
  UsedFor), DIFFERENCE for the person's stated exclusions (parsed
  by intent: "without a corkscrew", "don't have a corkscrew"),
  ranking inside the set, and the RelatedTo/IsA fallback widened
  only when the strict set is empty — disclosed in the reply and
  the trace (a combination). Tools are deduplicated by node, and
  conclusions are now about the tool itself (the old "to"
  citation named the tool's neighbour — half the corkscrew
  garble).
- **Ranking floor.** Conclusion sets rank by support, then by the
  other endpoint's affinity to the subject (specificity-weighted
  neighbourhood overlap: a shared neighbour counts 3 when its
  degree ≤ 120, 1 when ≤ 600, 0 for hubs). A support-1,
  zero-affinity member is not featured when at least n members
  are better attested or better connected.
- **Empty-set decline + within-node choice.** A why-question is
  answered only from a direct causal edge between two mentioned
  terms, the subject's own causal edges, a traced two-step chain
  through a stated cause (when-clause questions must LAND on the
  stated effect), or a mentioned ATOMIC event's xEffect — else it
  declines and names the missing causation. And rival edges of
  one merged node are scored by context fit as well as support:
  the best single corroboration between the edge TARGET's
  neighbourhood and the turn's contents + active context, worth
  at most +8 (never across a relation-priority level).

Totals (Chicago script, 28 turns): **26 grounded / 0 ungrounded /
2 declined / 0 wrong-sense**, from 25 / 1 / 1 / 1. No
previously-grounded turn became wrong-sense or declined; the one
new decline is the onion turn, which was the ungrounded one. The
named turns, before → after:

- (i) Onion — "Water can be caused by soaking in hotspring." →
  "This graph doesn't record that causation: it has no Causes
  edge from "chop onions" toward "water", and I won't borrow one
  from a neighbouring word." The data refused, honestly: onion
  carries NO Causes edge in CSKG at all (its nearest approach is
  RelatedTo: cry, crying, tears, eyes), so the causal set is
  empty by construction.
- (ii) Corkscrew — "You could use opener or corkscrew or
  corkscrew — Bottle opener is related to opener." → "You could
  use opener — Opener is related to bottle opener. It isn't
  recorded as directly used for that — I reached it through
  related terms instead." The excluded corkscrew is absent; no
  duplicated label; the trace records triage *combination* with
  the difference applied and route: fallback. (The strict set
  was empty even before the difference — the merged corkscrew
  node has no UsedFor edge; that is the data gap the fallback
  exists for.)
- (iii) Brother — "Brother is a monk." → "Brother is a male."
  Within-node scores: male 151 (support 1 → 143, fit +8: its
  neighbourhood shares girlfriend's romantic cluster — beau,
  boyfriend, harem, bros before hoes, manfriend), ally 150,
  member 147, monk 146, sibling 143. "Sibling" itself scores
  ZERO fit — its only shared neighbour with "girlfriend" is the
  hub "daughter" — so the family reading wins through "male",
  one of the two targets the design named as acceptable.
- (iv) Sydney coat — "…keeping warm. Coat can be used for catch
  pigeons." → "Coat can be used for keeping warm in winter. Coat
  can be used for keeping warm. Coat can be used for keep body
  warm." All eleven of coat's UsedFor edges carry support 1; the
  warmth uses share specific neighbours with "coat" (jacket,
  winter jacket), "catch pigeons" shares none — the floor leaves
  it out of the featured set rather than merely ranking it last.
- (v) Flu "why?" — the honest decline stands, unchanged. (The
  follow-up's fact flipped "Flu is a virus." → "Flu is an
  influenza." — grounded either way; influenza's neighbourhood
  corroborates against the cold context.)
- (vi) "What happens when it rains?" — "Rain is a fresh water."
  → "Rain can cause flooding. Rain can cause floods."
  Event-consequence routing: the subject is re-selected from all
  rival candidates (discourse's chosen "rain" over the surface
  "rains") for the first candidate carrying consequence edges;
  rain's own Causes edges answer. (In a fresh session the same
  question takes "rains" and its HasSubevent edges instead.)

Every other changed Chicago turn, before → after (all grounded →
grounded):

- "It's the third day of rain here." — "Rain is a fresh water."
  → "Rain is a precipitation." (fit vs the active water topic;
  the cleaner class of the two multiply-attested rivals).
- "Where would I find a penguin?" — zoo-then-antarctica →
  antarctica-then-zoo (affinity ranks antarctica's ice/snow
  neighbourhood first; both attested).
- "What is money used for?" — rich/needs/saving → buying/rich/
  pay for (affinity ranking inside the UsedFor set; "needs"
  shared only a hub and a stray with money's world).
- "Is a wheel part of a bicycle?" — chain/two tires/two wheels
  → chain/two wheels/two tires (same set, affinity order).

Sydney script (3 turns): the coat-purpose turn above is the only
change; season and the winter-coat statement are identical — the
statement briefly flipped to "Winter coat is a warm clothes."
during tuning (the source's own head-word expansion "coat"
corroborating a near-synonym target) and the own-family
exclusion below is what restored it, in both scripts.

Fit-scoring lessons, each measured on the live graph and each
now a stated rule in solve.ts: affinity must be the BEST SINGLE
corroboration, never a sum (summed, the hypernym "food" scored
272 against a banana-bread turn's accumulated topics); inherited
overlap is not corroboration (a context node that IsA the target
— banana under food, girlfriend under ally — contributes
nothing); a whisper is not corroboration (a single context node's
affinity below 4 is coincidence — the fragment "big" shared 31
weighted neighbours with the hub "place" and briefly made soup a
place); and the context itself must be filtered — pronouns
("his" corroborated "member" +13), pure time expressions, and
negative-score topic fragments never enter it, and neither does
the source's own lexical family. On exact score ties the
better-attested fact stands (§6: attestation first).

Undesigned behaviour: none observed. The penguin and money
reorderings above are the ranking floor's designed mechanism
acting on turns it was not tuned against; their outputs are
attested and on-topic, and they are listed rather than hidden.

Tests: eight fixture tests added (contents categorisation,
exclusion as difference, within-node brother choice, ranking
floor, why-decline, the two-mentioned-terms causal control, the
when-clause landing rule, event-consequence routing); the
pre-existing tool test was split — its question text carries the
exclusion, so under E3 semantics it now expects the bottle
opener, and a no-exclusion variant keeps the corkscrew
expectation. Project suite 110/110; `tsc` clean. Nothing pushed.

## Depth pass note (2026-11-09)

The first move of design §8 after E3: go DEEPER into CSKG before
building wider (§10 graph-first — derivation layers over the
graph, no new knowledge stores). Five seams, all in the loader /
discourse / solve / articulate layer:

1. **The sentence column is retained.** 584,511 of the kept edges
   now carry the dataset's natural assertion sentence (loader
   side store, first non-empty per deduped edge), exposed on
   CskgEdge and via graph.sentenceAt. Two more side stores ride
   along: HasContext (230,159 rows → tags on 159,333 terms) and
   FormOf (358,117 form→lemma pairs). Side stores sit outside
   the CSR index, so no degree, neighbourhood or ranking over
   the main index can shift.
2. **Event keying for ATOMIC.** A scored, traced template
   matcher (discourse.matchEventTemplate): the utterance's event
   clause is reduced to content lemmas, expanded by affix forms,
   the FormOf store and top /r/Synonym neighbours (every
   expansion recorded in the trace), and scored against the
   graph's ATOMIC event templates by weighted lemma overlap
   (exact 2 / form 1.5 / synonym 1 / root 0.75; F1 ranking).
   Acceptance needs F1 ≥ 0.5, at least one exact-or-form pair,
   matched weight ≥ 1.5, and COVERAGE ≥ 0.6 (below). It feeds
   solve's event-consequence path (a strong match, F1 ≥ 0.65,
   leads; a passing match is the fallback) and a new reaction
   path answering feel / react / want / need / intent questions
   from the matched event's own at: edges.
3. **Sequence knowledge.** "What happens when X" now composes
   HasFirstSubevent → HasSubevent → HasLastSubevent chains in
   attested order before the remaining consequence relations
   fill the set (to three, as E3 had it, or to the sequence's
   length when longer). A subject with no subevent edges
   produces exactly E3's set.
4. **Context evidence.** The contents breakdown records each
   chosen referent's HasContext tags into the trace (brother →
   religion, roman catholic, african american vernacular
   english, in the live graph). Trace-only; nothing scores with
   them yet — the seam for E4's resolver and EverydaySense.
5. **The sentence bank (S9's first resource).** When a featured
   edge's sentence has bracketed terms matching the edge's
   endpoints, articulation renders the cleaned dataset sentence
   instead of the relation template; the trace logs each spoken
   conclusion's path ("render paths: … via sentence/template").
   A sentence whose brackets do not match the endpoints is
   refused (fixture-pinned: a sentence claiming "melon" on a
   banana—IsA→fruit edge is never rendered).

### Load and memory

Load 28.2 s → 31.0–31.7 s (+~11%: the side-row parsing and the
string copies below). Peak memory on the same instrument is
unchanged (heapUsed 464 MB vs 465 MB baseline; RSS 719 MB vs
735 MB); the side stores' retained cost after GC is ~120 MB
(585k sentences / 358k form pairs / 159k context-tagged terms).
One near-miss worth recording: a raw split field is a V8 sliced
string that keeps its whole source line — and, through the gzip
stream, large decompressor chunks — alive; the first cut
retained the sentence fields raw and pinned ~680 MB of extra
heap. Everything a side store retains now passes through a
fresh-string copy (~30 MB of strings) and the pinning is gone.

### Chicago and Sydney — no regression

Chicago holds at **26 grounded / 0 ungrounded / 2 declined /
0 wrong-sense**; Sydney is stable. Eighteen Chicago turns and
one Sydney turn changed, every one a sentence-bank re-rendering
of the SAME edge content in the dataset's own words — no
previously-grounded turn lost, both declines untouched, the
brother gate fact intact. Named turn, before/after:

- "What happens when it rains?" — before: "Rain can cause
  flooding. Rain can cause floods." After: "Something that
  might happen as a consequence of rain is flooding. Something
  that might happen as a consequence of rain is floods." Same
  two Causes edges (rain→flooding, rain→floods), now rendered
  from their attested CN sentences — the banked phrasing even
  carries its own hedge ("might happen").
- Elsewhere the bank mostly repairs the templates' article-less
  English: "Soup is a dish." → "Soup is a type of dish.";
  "Brother is a male." → "A brother is a male."; "Bicycle has
  chain." → "A bicycle has a chain."; hammer's middle use →
  "You can use a hammer to pound."; the Sydney coat's middle
  use → "A coat is for keeping warm." The penguin locations
  take CN's locative phrasings ("Somewhere a penguin can be is
  in antarctica. Something you find at a zoo is a penguin.") —
  attested and on-topic, if less tidy.

### The event evaluation (new probe script, declared before running)

scripts/cskg-evaluation-events.txt — eight event / feeling /
want / need / intent questions in varied phrasings, Chicago, one
session. Before this pass none of these questions could reach
ATOMIC's person-centred relations at all: no literal term in
them names an ATOMIC event. Outcomes, as they came out:

1. "How do people feel when they lose their keys?" —
   GROUNDED via template match "loses 's keys" (F1 0.70,
   coverage 0.88; lose→loses by form, keys exact): xReact
   upset, frustrated; xEffect "was late to office". The event
   label's "'s" is the graph's own possessive remnant, carried
   into the rendering verbatim.
2. "What do people want when they can't sleep?" — the matcher's
   first cut keyed the WRONG event, "lets persony sleep"
   (F1 0.50 on the single generic pair "sleep"; the
   discriminative "can't" matched nothing — the graph keys the
   true event with a misspelling, "can n't fall asleep", whose
   parts pair too weakly). The acceptance rule gained COVERAGE
   (weighted precision ≥ 0.6: a match must account for most of
   what the person said; every true match in this run covers
   ≥ 0.75, the wrong one 0.50). With the rule, the matcher
   honestly reports no match over 98 candidates — and the turn
   falls back exactly as it did before this pass, which exposes
   a pre-existing flaw in the OLD generic path: it answers with
   a junk fact about the question's scaffolding word ("People
   is a better." — the real edge people —/r/IsA→ better [CN]).
   Recorded here as a known failure class for a later slice:
   question scaffolding ("people") is not a topic.
3. "What happens when you stay up all night?" — GROUNDED via
   STRONG template match "stays up all night studying"
   (F1 0.83, coverage 0.94), leading the event-consequence
   turn: xEffect "loses sleep", xReact "exhausted and sleepy".
4. "How do people react when someone apologizes?" — GROUNDED
   via "apologizes profusely" (F1 0.67, coverage 1.0; the graph
   has no plain "personx apologizes" event at all — its ATOMIC
   apology events are the profusely and to-'s-boss variants):
   oReact hurt, upset; xReact remorseful.
5. "How do people feel when they get lost?" — GROUNDED via
   "gets lost" (F1 0.88): xReact confused, scared; xEffect
   "goes home".
6. "What do people need when they go to the beach?" —
   GROUNDED via "goes at the beach" (F1 0.88 — ATOMIC's own
   label phrasing): xNeed "get fishing gear", "drive to the
   beach".
7. "What do people intend when they apologize?" — GROUNDED
   via "apologizes profusely" (F1 0.50, coverage 0.75;
   apologize→apologizes by form): xIntent "to be forgiven",
   "to make ammends" (ATOMIC's spelling, verbatim).
8. "How do people feel when it rains?" (the control) —
   CHANGED, and reported as such: the pass keys it to the
   ATOMIC event "catches in the rain" (F1 0.50, coverage 0.75;
   rains→rain bridged by FormOf) and answers from its edges —
   xReact wet, curious; oReact wet; xEffect "a chill". Before
   the pass this question had no event route and fell to a
   generic rain fact. The keying is defensible (being caught in
   the rain is the event the question is about, and "wet" is
   the attested feeling), "curious" is attested but exotic —
   a typicality judgement, which is EverydaySense's future
   work, not the matcher's. The named Chicago rain turn
   ("what happens") is unaffected beyond its phrasing (above).

Rendering honesty: the ATOMIC templates remain the spike's
rough ones ("they was late to office", "want to to sleep too"
in an earlier cut, "Goes at the beach first needs …"). The
depth pass changed WHICH edges answer these questions, not how
prettily event labels read; articulation of event labels is
saying-side work (design §10), still thin.

### Undesigned behaviour

None observed. The "catches in the rain" keying (turn 8) is the
matcher's designed mechanism acting on a turn it was not tuned
against; it is listed rather than hidden. The coverage rule was
designed from turn 2's failure AFTER the probe was declared —
the probe did its job — and the rule is stated generally, with
a fixture test pinning it.

Tests: ten fixture tests added (loader sentence retention and
side-store counts, contextsOf/lemmaOf, HasContext in the
contents trace, sentence bank render + lying-brackets refusal,
template keying of a paraphrased feeling question with its
expansions traced, intent via xIntent, subevent ordering, the
coverage rule, the no-match decline). Project suite 120/120;
`tsc` clean. Nothing pushed.

## Trace-file step note (2026-11-09)

A small, behaviour-neutral step before E4, at the user's
direction: the ThoughtTrace used to live only in the session's
ring and in --debug's console output — when a session ended,
the record of why each reply happened ended with it, and a
re-run is not the same turn (situation lines read the real
clock). Now a turn's derivation can be persisted, with the
graph queries it issued as first-class records.

What was built:

- **A central query log at the loader's accessors.** The
  CskgGraph accessors are the engine's single graph choke
  point — verified by grep before building: no piece touches
  the CSR arrays or the depth-pass side stores directly (label
  reads via `terms[]` on already-materialised edges are not
  queries, and internal helpers — `materialise`,
  `isAtomicEvent` — are not accessors). Every accessor
  (`id`, `outEdges`, `inEdgesFor`, `edgesOf`, `topEdges`,
  `contextsOf`, `lemmaOf`, `eventTermIds`, `degree`) reports
  to `graph.querySink` when a turn has installed one:
  { via, term, rel, dir, hits }. `topEdges` was rerouted
  through the private gather so it records one query under
  its own name instead of two under its delegates'. The sink
  is installed by `runTurn` only for a turn that opts in
  (`collectQueries`), appended to the workspace's query list,
  and detached in `finish()`. Recording is write-only: no
  piece reads the log, and with no sink installed an accessor
  pays one null test and builds nothing.
- **The trace file** (`src/cskg/tracefile.ts`; the CLI's new
  `--trace`). One JSON line per turn, appended: { turn, at,
  location, utterance, reply, grounded, intent, steps
  (verbatim), queries }. In --script mode `--trace` alone
  defaults to the script path + ".trace.jsonl"; interactive
  mode requires an explicit path and refuses without one.
  Append mode — a resumed run continues the file. Generated
  .trace.jsonl files are local artifacts, not source.

Gate: suite 120 → 123 (three new tests, below); `tsc` clean.
Chicago and Sydney run with tracing OFF and ON: Sydney
byte-identical outright; Chicago byte-identical except the
real-clock line (the two runs straddled a minute: 2:20 AM vs
2:21 AM on "What time is it?"). The Chicago trace file holds
28 lines for 28 turns.

First readings — the log paying rent immediately:

1. The onion decline's evidence is literal. The turn issues
   `outEdges("chop onions", "/r/Causes")` three times and
   `outEdges("onion", "/r/Causes")` / `("onions", …)` twice
   each — every one returns **0 hits** on the production
   graph. The empty set the reply names is a set of lines in
   the file. (The fixture graph, by design, gives onion one
   stray Causes edge to crying; there the evidence is the
   chain probe `outEdges("crying", "/r/Causes")` → 0, and the
   fixture test pins exactly that.)
2. The brother turn issues 4,324 queries. The within-node
   arbitration re-probes the same IsA sets (brother's 11,
   sibling's 2, male's 5, monk's 5, girlfriend's 4) once per
   candidate per scoring pass — no within-turn caching. The
   answer is right; the log prices how it is reached.
3. "What happens when it rains?" issues 64,951 queries,
   64,760 of them `lemmaOf`: the template matcher re-lemmatises
   the words of all 23,811 ATOMIC event keys on every matching
   turn (`eventTermIds` itself is cached; the per-key word
   lemmatisation is not). Trace files are correspondingly
   large — Chicago's 28 turns are 9.6 MB, dominated by
   event-matching turns. This is designed machinery whose
   cost was invisible until the log existed; a candidate
   optimisation for a later slice, deliberately NOT taken
   here — this step is observation only.

### Undesigned behaviour

None observed. The volumes in readings 2–3 are designed
mechanisms acting as built; the step's whole point is that
their costs are now measured rather than suspected, and they
are listed rather than hidden.

Tests: three fixture tests added (the onion turn's query log
holds the empty Causes evidence and the sink is detached
afterwards; the trace writer emits one parseable JSON line
per turn with the required fields, append-mode, and the
replay turn's query log is empty; traced vs untraced replies
are identical across four turns, and an untraced turn records
nothing). Project suite 123/123; `tsc` clean. Nothing pushed.

## Trace levels note (2026-11-09)

A follow-up the same day, also at the user's direction: the
first traced Chicago file was 9.6 MB — a record nobody opens
pinpoints nothing. Trace records are now built at a
granularity, chosen by `--trace-level <steps|queries|full>`
(default `queries`; an unknown level is a clean CLI error
before the graph loads). Collapsing happens in tracefile.ts
at record-build time, from the turn's complete query list —
collection (turn.ts) stays level-unaware and complete, so
replay and every other consumer are untouched, and no reply
can depend on the level. Every record also carries
`queryCount`, the turn's total issued queries.

- **steps** — header + steps only, `queries: []`, the total in
  `queryCount`. The module path, nothing else.
- **queries** (default) — decision queries stay individual
  (edge lookups by relation/direction, contextsOf, degree —
  including every zero-hit record a decline rests on); the two
  bulk-scan accessors, `lemmaOf` and `id`, collapse per turn
  into one summary per accessor —
  { via, summary: true, count, distinctTerms, zeroHits,
  totalHits } — placed where that accessor first occurred.
  The counts are stated, never silent: summary counts +
  individual records reconcile to `queryCount` on every line
  (verified mechanically on both regenerated files).
- **full** — every query record verbatim, in issue order:
  the original record shape in its `queries` array.

Measured (Chicago, 28 turns; transcripts byte-identical
across levels and vs tracing off, the real-clock line
excepted):

- full: 9,584,366 bytes — the step's baseline, regenerated
  and confirmed.
- queries: 6,822,369 bytes.
- steps: 67,789 bytes.

Sydney (3 turns): full 375,889; queries 373,927; steps 5,679.
The on-disk trace files were regenerated at the default
level (Chicago 6,822,369 bytes; Sydney 373,927).

One measurement corrects the previous note's framing. That
note said the 9.6 MB was "dominated by event-matching turns"
— true per turn, but the accessor histogram shows only ONE
of the four big turns is a lemmaOf scan (turn 18, "What
happens when it rains?": 64,760 lemmaOf of 64,951 queries;
the queries level removes almost exactly that mass,
~2.7 MB). The other three — the coat statement (43,312
outEdges + 9,967 degree of 53,642), the bananas (16,890 +
7,542 of 24,570), the rain statement (12,117 + 4,949 of
17,195) — are solve's within-node arbitration re-probing
edge sets and degrees per candidate per scoring pass, the
no-within-turn-caching cost the previous note's reading 2
observed on the brother turn, now attributed per accessor.
Those are decision-accessor records, so the queries level
keeps them individual by design — which is why Sydney
barely shrinks (its coat turn is 5,210 outEdges of 5,825
queries; there was almost no scan noise to collapse). The
dramatic reduction lives at the steps level; the queries
level's gain is that a scan turn no longer buries the
decision records around it. Whether arbitration probing
should itself summarise at some future level is a question
the log can now ask precisely; not taken here.

### Undesigned behaviour

None observed. The levels reshape records after the turn is
finished; the runs above differ only in the clock line.

Tests: four fixture tests added (steps keeps header + steps
with queries as a count; queries keeps the onion decline's
0-hit Causes probe individual, summaries match the full
record's counts/hits/terms exactly and sit at their
accessor's first occurrence, both levels reconcile to the
turn total, and the queries record is smaller than full;
the default is queries at builder and parser; unknown
levels are rejected). Project suite 127/127; `tsc` clean.
Nothing pushed.

## Definitions slice note (2026-11-09)

G7 is closed: CSKG terms now join to the repo's own WordNet
glosses (Open English WordNet 2024, the slice-2a extract —
117,008 synsets, glosses kept at import, examples stripped).

**What was built.** `src/cskg/definitions.ts`: a side store in
the depth-pass style — only the extract's synset parts are
read (the relations/forms parts are skipped), indexed by
normalised lemma (148,858 keys), loaded LAZILY on the first
definition request, outside `loadCskg` and outside the CSR
index, so no degree, neighbourhood or ranking can shift.
Candidates for a term come through the loader's lemma
machinery (the term itself, then its FormOf lemma via
`graph.lemmaOf`), each carrying provenance: synset id, lemma,
part of speech, gloss. Sense choice runs three channels in
precedence — FILING SHARE (the support-weighted fraction of
the term's 1-hop IsA filing that the candidate's evidence
words account for, at one or two hops), CONTEXT FIT (solve's
best-single contextFit, capped at 8), and a POS prior
(noun > verb > adjective) — with extraction order breaking
exact ties. On a definition-shaped "what is/are" turn
(intent.isDefinitionQuestion — "what does X do" is not one),
the chosen gloss leads in S16 form ("Term: gloss.") and the
neighbourhood conclusions the turn has always produced follow
it, undropped. A correction gives the settled term's
definition in place of a neighbourhood fact, the "Got it —"
acknowledgement unchanged. No gloss → exactly the old answer;
every other question shape (purpose, made-of, part, …) is
never attempted. The chosen sense, its filing evidence, and
every rival's score are traced (definition steps appear on
Chicago turns 11, 21, 22 at every trace level; trace files
verified writing at steps/queries/full).

**Why the measure has three channels** (probed on the live
graph before wiring; each channel exists because the previous
design failed a named word):
- Plain context fit crowns the WRONG headache: solve's
  contextFit discounts inherited overlap by design, so the
  pain sense's evidence scores 0 — the graph files headache
  under ache under pain — while the metaphorical anxiety
  sense's "worry" corroborates at 25. The filing channel is
  the signal the discount throws away.
- Raw IsA-closure membership crowns the wrong passport: the
  merged node files every sense at full strength
  ("characteristic" [support 2] beside "legal document"
  [support 2]). The SHARE separates them — the document chain
  accounts for more of the filing, and the recommendation
  sense's remaining words corroborate nothing (its context
  fit is 0; the document sense's citizen/travel/country fit
  7/6/5).
- Evidence from the term's own lexical family is excluded
  ("coldness" for cold, "pass" for passport): a sense
  applauding its own string is not corroboration — solve's
  own-family rule, mirrored. Live outcomes: headache → the
  pain synset (20 vs 12 in probe context; 28 in the run),
  passport → the document synset (17 vs 10/8), money → "the
  most common medium of exchange" (14.7, order over the
  currency sense's equal 14.7), bicycle → the vehicle synset.

**Named turns, before → after.**
- "What is a headache?" — "Headache is a type of ache." →
  "Headache: pain in the head caused by dilation of cerebral
  arteries or muscle contractions or a reaction to drugs.
  Headache is a type of ache."
- "What is a cold?" — the four IsA facts → "Cold: the absence
  of heat." leads, all four facts follow unchanged. Honest
  note: cold's three noun senses TIE at 12 on a bare turn
  (filing separates none of them; every context fit caps),
  so extraction order gives the temperature reading — the
  same reading the old reply led with. The illness sense is
  reached by the path the design names for it:
- "No, I meant the common cold" — "Got it — common cold.
  Common cold is a disease." → "Got it — common cold. Common
  cold: a mild viral infection involving the nose and
  respiratory passages (but not the lungs)." ("common cold"
  files under exactly one synset; the choice is deterministic,
  filing evidence "infection".)
- "What is a passport used for?", "What is money used for?",
  "What is a bicycle made of?" — byte-identical (purpose and
  made-of routing never reach the definitions layer).

**Evaluation.** Chicago: 26 grounded / 0 ungrounded /
2 declined / 0 wrong-sense — the baseline HOLDS, and the
transcript diff against the pre-slice run is exactly the
three turns above plus the clock line: no turn changed
class. Sydney: byte-identical. Trace volume grew on the
definition turns (queries-level Chicago file 9.34 MB vs
6.82 MB pre-slice): sense-choice evidence resolution is
real graph work and the log records it like everything else.

**Load and memory.** The graph load is untouched (~31 s).
The store builds on first use: 215 ms in-function (~0.56 s
wall cold), +71 MB heap after GC — against the old track's
full extract load (560 ms, ~136 MB heap un-GC'd in the
first probe) for the same synsets, the saving being the
skipped relations/forms assembly.

**Known limit.** Where CSKG's own filing is sense-piled, the
share can crown the pile's heavier side: bare "coat" chooses
the animal-fur synset (its "hair" filing carries support 2)
over the garment senses. No evaluation turn asks what a coat
IS (coat questions are purpose-routed), and a clothing
conversation is the context channel's to win; recorded here
as the measure's honest edge, in the class E4's resolver
work owns.

### Undesigned behaviour

None observed. Every changed turn is one of the three the
slice aimed at, by the traced route it designed.

Tests: eight fixture tests added (store join + provenance;
FormOf-lemma candidates; filing+context choice over
fabricated synsets, incl. the empty-context order fallback
and the subject's-own-world separation; filing endorsement;
gloss-led what-is with facts following; the correction
definition; no-gloss fallback byte-identical; purpose and
made-of routing untouched). Project suite 135/135;
`tsc` clean. Nothing pushed.
