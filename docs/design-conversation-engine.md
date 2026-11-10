# Design — the conversation engine

**Status: 2026-11-09, build authorised.** Source: the user's proposal
`docs/user-plans/chat-pieces.txt` ("Analysis of Communication"),
discussed and refined the same day. This design governs the CSKG track
(`src/cskg/`); the goal it serves is in `PROJECT-GOAL.md`, the milestone
in `docs/milestone-1.md`, and the evidence it answers to is
`src/cskg/EVALUATION-REPORT.md`.

**The system in one sentence** (the user's formulation,
2026-11-09): we are building a system that **brings out CSKG's
capabilities into an emergent scenario** — the live conversation
— **and we have values, which is the I Ching.** Three layers:
CSKG is the latent competence (it already knows what a sentence
looks like, how a person in an event feels, how the other party
reacts, what words mean in context — verified against the data,
§10); the conversation engine is the elicitation machinery that
brings that competence out, turn by turn, in a scenario where
undesigned behaviour can emerge and be watched for; and the
Book of Changes ValueSystem is the direction layer over
selection (§5/S2). Build order still serves the fundamentals
first — a working chat before the value layer is built — but
the architecture names all three from the start.

The result is an **analogue to the LLM, but we have control**
(the user's formulation, 2026-11-09): the same conversational
ambition, reached through attested knowledge and inspectable
machinery instead of opaque weights — every claim traceable to
edges, every admission read off measured axes, values explicit
rather than baked in, and modification governed by an immutable
core. The division of labour is exact: **CSKG supplies the
knowledge; we provide all of the resources and modules that
bring CSKG into a situation — and that machinery is ours.** We
do not rebuild knowledge the graph already holds; we build the
bringing-out, which is the part that does not exist anywhere.

## 1. The shape: a graph of pieces over a shared workspace

The program is a graph of interrelated pieces. The pieces are modules
with contracts — what each consumes, what each produces — and their
interrelations ("informs" edges) are explicit. The wiring is **not**
message-passing objects: pieces are functions over one shared, typed
**turn workspace**. A turn's workspace accumulates everything the turn
knows — situation, person, breakdown, intent, conclusions — and at the
end of the turn it *is* the thought trace. Nothing hides in flight;
any answer can be reopened and dissected, which the project's
determinism and its emergence watch both require.

The module graph exists **as data** in the repo
(`src/cskg/engine-map.ts`): nodes are the pieces, edges are their
informs-relations with the workspace fields each edge carries. The
trace cites the map's node ids, so a replay reads as a path through
the engine. Adding a piece edits the map and the code in one motion.

## 2. The pieces

Following the proposal's letters:

- **A — Awareness** (`awareness.ts`; grows from today's `situation.ts`).
  The situated self: place, time, season from (date, hemisphere),
  daypart — computed per turn, never stored as knowledge. Plus the
  **person**: who is talking. Unknown → general mode. A configured
  person → their context is loaded into the workspace (see §5).
  Plus the **role**: who the chat is in this conversation (§5).
  Awareness loads the whole frame of the conversation — where and
  when it is, who it is talking to, and who it is.
  *Writes:* `situation`, `person`, `role`. *Reads:* configuration,
  the clock.
- **B — Information processor / discourse** (`discourse.ts`).
  What the person is saying, and who or what they are talking about:
  a per-turn **breakdown graph** — sentences and their composition,
  mentions, candidate referents in the knowledge graph, chosen
  referents. Replaces flat longest-match resolution as the primary
  analysis (longest-match survives inside it as the mention finder).
  *Writes:* `breakdown`. *Reads:* the turn text, the graph index,
  memory's active topics (disambiguation context).

  Inside B sits the **contents breakdown** submodule (the user's
  term, 2026-11-09): it breaks the incoming communication into its
  **people, places, and things**, and is the place of subanalysis
  for each kind. People: speaker, the person themselves, or a third
  party; known or new; their relation to the chatter. Places: here
  or elsewhere relative to the situated self; hemisphere- and
  season-bearing where relevant. Things: senses and graph referents,
  as above. The other pieces consume the categorised contents —
  awareness and memory read the people, solve reads things and
  places, articulation's situation-relevance reads the places — so
  a kind-specific analysis has exactly one home.

  Two amendments govern the submodule (agreed 2026-11-09). First,
  **the category set is open**: people, places and things ship
  first; *times* are recognised from the start (the awareness piece
  already thinks in times, and "the third day of rain" is partly a
  time expression); *events* join at E5. New kinds extend the
  contents record without restructuring it — the triad is a
  starting inventory, not a closed ontology of communication.
  Second, **categorisation is defeasible**: a mention's kind is a
  scored choice with its candidates kept in the trace, never a hard
  silent sort — "winter" can be time and thing, "Chicago" in
  "Chicago-style pizza" is no place at all, "home" can honestly be
  two kinds at once. Dual membership is allowed where it is real;
  a wrong kind must be as visible in the trace as a wrong referent,
  because every downstream piece inherits it.
- **C — Intent analyzer** (`intent.ts`). The person's objective:
  inform, ask (and what kind), correct, request help with a problem,
  continue a topic, ask about the conversation itself. B and C are
  adjacent and may share a pass, but their outputs are separate
  workspace fields: what was said vs what is wanted.
  For **statements** the analysis runs in a set order (the user's
  worked example, 2026-11-09): first **query what is known about
  the person** — the person file and the chat's own history — for
  connections (people, preferences, plans in play); then classify
  the statement's conversational intent, including **schmoozing**
  (phatic sharing: the person is making conversation, and the
  fitting reply is social — interest, an invitation to elaborate —
  with zero graph facts a perfectly good outcome) versus
  **connected** (the statement bears on the person, their people,
  or the conversation's ongoing concerns) versus plain informing.
  The reply is formulated only after this analysis — what the
  person wants, what they are saying, the context, the history.
  *Writes:* `intent`. *Reads:* `breakdown`, `situation`, `person`,
  memory.
- **D — Memory** (`memory.ts`). Short-term: this conversation —
  active topics and referents, the trace ring, corrections.
  Long-term: the person file and what it accumulates (§5). Memory is
  a standing context the other pieces query, not a pipeline stage.
  *Writes:* `activeContext` each turn; long-term updates only via
  stated facts. *Reads:* `breakdown`, `intent`.
- **Context** (`context.ts`). The composition point of the frame:
  it takes awareness's situation, person and role, and memory's
  conversation state, and assembles the turn's **operative
  context** — active topics with their weights, the facets of the
  situation relevant to analysis, the person's facts in play, the
  role's dispositions. The analysis pieces (B, C, E) and
  articulation read the operative context rather than the raw
  frame fields, so contextual pressure acts **during analysis** —
  on which referents get preferred, which candidates get gathered,
  which facts get selected — not as a late tiebreak over facts
  already chosen. (This is the relocation that answers G5: the
  spike's selection pressure showed no observable effect because
  it was applied once, at the end, where attestation dominates;
  pressure inside analysis is a different mechanism.) Context's
  assembly is recorded in the trace — what it weighted, and why —
  so its influence is observable whether or not an answer flips.
  *Writes:* `context`. *Reads:* `situation`, `person`, `role`,
  memory's state.
- **E — Query / problem solving** (`solve.ts`). Triage per turn:
  *information to retrieve* (graph lookups over relations),
  *a problem to solve* (construct a set that satisfies stated
  constraints — §6), or *a combination*. Produces conclusions with
  their edges, or an honest empty result. *Writes:* `conclusions`.
  *Reads:* `breakdown`, `intent`, `activeContext`, `situation`.
- **F — The Response module** (`articulate.ts`; from today's
  `render.ts`; named by the user, 2026-11-09). Two steps inside
  one module. **Compose:** from the turn's chain of thought and
  reasoning (solve's derivations, as recorded in the workspace)
  it forms a **Conclusion** — the structured set of things this
  reply will communicate, selected, ordered and grouped
  (aggregation S1 and selection S2 live here). **Articulate:**
  the Conclusion is rendered to surface text *according to
  determined parameters* — role, the standing tuple, register,
  length — the morph step of §10. Nothing is invented at either
  step; the Conclusion carries each item's attestation and
  standing, and the trace shows the Conclusion itself, so "why
  did you say that?" can point at it. *Writes:* `conclusion`,
  `reply`. *Reads:* `conclusions` and the reasoning chain,
  `intent`, `context`.
- **G — Technology interface.** The shells — CLI chat, demo web UI,
  TUI — unchanged in kind; they drive the turn coordinator and hold
  no conversational logic.

The **turn coordinator** (`turn.ts`) runs one turn: A loads, B
analyses, C judges intent, D supplies context, E works, F speaks, D
commits the turn to memory and the trace ring.

## 3. The turn, in the proposal's order

1. Query awareness: where and when is this, and who is talking —
   general, or a specific person whose context loads in.
2. Query the information processor: what is being said, and about
   whom or what — the breakdown graph.
3. Query the intent analyzer: the person's objective (2 and 3 may
   overlap in one pass; their outputs stay distinct).
4. Place the turn in the conversation: memory, the logic train so
   far, the standing objective, and the relationship to the chatter.
5. Response work (E): problem, retrieval, or both.
6. Response formulation (F): what to say, how to say it — normal
   responses for now.
7. Send (G).

## 4. The turn workspace

One typed object per turn, fields written by exactly one piece each:
`situation` (A), `person` (A), `breakdown` (B), `intent` (C),
`activeContext` (D's contribution), `conclusions` (E), `reply` (F),
plus `trace` — the ordered record of which pieces acted and what each
decided, citing engine-map node ids. The breakdown graph is part of
the trace: replaying "why did you say that?" shows what the engine
thought the person was talking about, which is where most wrong
answers are born.

## 5. Memory and the person

- **Short-term** lives in the session: active topics/referents with
  their graph nodes, the last turns' traces, corrections.
- **Long-term** is a person file: JSON under `data/people/`
  (gitignored), one file per person, human-readable and editable by
  the person themselves. Contents: a name, stated facts (each with
  when it was stated), preferences the person has expressed.
  Selection: `CSKG_CHAT_PERSON=<name>` or a `person` field in demo
  configuration; unset → general mode, and general mode writes
  nothing long-term.
- **Write discipline:** long-term memory records only what the person
  states about themselves ("my brother…", "I live in…") or what they
  explicitly ask to be remembered — never inferences, never other
  people's data beyond what the person said. A statement absorbed
  into long-term memory is acknowledged in the reply when it happens
  ("I'll remember that") — memory writes are never silent.
- The relationship ("I know the person chatting") enters through
  `person` in the workspace: articulation may use the person's name
  and known context; it does not perform familiarity it has not
  earned — context first, tone tricks never.
- **Person state, in two tiers** (the user's direction,
  2026-11-09). The person model also holds **transient/current
  state** — how the person is now: feelings, current doings,
  present circumstances ("I feel tired") — session-scoped,
  superseded by newer state, allowed to lapse; distinct from the
  **permanent/last-known** facts above, which persist until
  contradicted. Habitual markers ("all the time") are recorded on
  the current state as standing patterns, promoted toward
  last-known when they recur. Capture happens in the contents
  breakdown (people: the speaker) and **does not depend on the
  graph having anything to say back** — a statement about the
  speaker is person state first and a graph topic second. The
  captured state is also a canonical lookup key: ATOMIC's
  person-centred knowledge (reactions, wants, needs, effects
  around a state or event) is consulted *from the state record*,
  which is what lets a captured "tired" support a grounded
  response — recognition, anticipation — and lets Context carry
  the state into later turns. This narrows G6 for self-statements
  specifically; general paraphrase reach remains E5's problem.

### Role: who the chat is

A statement is answered according to the chat's **role** (the
user's direction, 2026-11-09). The role is the self's stance in the
conversation — *assistant*, companion, tutor — and it shapes two
things: how articulation responds (a statement met as an assistant
is acknowledged with its actionable content drawn out and help
offered; met as a companion it is reacted to and shared) and how
solve *uses the graph* on the role's behalf (which relations and
facts are preferred when several would serve, what follow-up, if
any, the reply carries).

- **Role resources.** Roles are data, not code: packs under
  `roles/` declaring, per role, its statement strategy, its
  preferred relations for fact selection, its follow-up policy
  (whether it asks, and at most how much), and its decline style.
  Resources accumulate around role over time; the engine loads the
  configured pack at startup (`CSKG_CHAT_ROLE`, default
  `assistant`). Building a new role is writing a pack, not patching
  the engine.
- **Grounding outranks role.** A role shapes selection and stance,
  never licence: an assistant that does not know still declines —
  it declines *like an assistant*, naming what it could do instead.
  No role pack may raise a claim above its attestation.
- **The frame.** Role (who I am), situation (where and when I am)
  and person (who you are) together form the conversation's frame,
  all loaded by awareness, all visible in the trace.

### Ambiguity resolution and clarification

Ambiguity is handled by an **AmbiguityResolver** submodule (the
user's refinement, 2026-11-09), used by discourse and by solve,
which first tries to *resolve* the rival readings on two grounds,
in this order:

1. **What the person said** — the conversation's history and the
   person model: established topics, earlier usage by this person
   ("his brother" has meant the sibling all along), corrections
   on record.
2. **Common sense** — the **EverydaySense** module (below): which
   reading is the ordinary one in ordinary life, absent any cue
   to the contrary.

Only when resolution fails or stays too close does the resolver
escalate to the clarification decision — ask, name the reading,
or proceed — and *that* decision is taken over the whole of the
situation (the user's direction, 2026-11-09), not the ambiguity
score alone. Its further inputs:

- the **score gap** between rival readings (a near-tie argues for
  asking);
- the **semantic distance** between the rivals (family-brother vs
  monk-brother are different worlds — a wrong pick derails; near
  synonyms cost nothing);
- **topic gravity** — whether one reading continues the active
  topic and the other breaks it (gravity already disambiguates in
  E2's scoring; the analyzer judges when gravity is *enough*);
- **cost asymmetry** — a wrong casual acknowledgement is cheap and
  correctable; a wrong answer to a direct question wastes the
  person's turn and may be acted on;
- the **interruption budget** — clarifications already asked in
  this conversation; never two in a row, patience is a resource;
- the **role's** clarification disposition (a role-pack field:
  an assistant may ask readily, a companion sparingly);
- the **person** — a known person's established usage can settle
  silently what a stranger's cannot.

Outputs: *answer* (silently, the common case), *answer naming the
reading* ("Taking brother as family — …"), or *ask*. An ask is
rendered by articulation with its branches **pre-mapped** to the
rival referents, and memory holds the **pending clarification** so
the next turn resolves it before any new analysis ("the second
one", "my brother, the sibling"). The resolver's reasoning —
which ground settled it, or why it escalated — is recorded in the
trace like every other decision. It lands in full with E4 (two of
its inputs — role disposition and person history — arrive there);
a reduced form over gap, distance, gravity, cost and budget may
land earlier if a slice needs it.

### EverydaySense: the common-sense module

The resolver's second ground needs a home. **EverydaySense**
(the user's chosen name, 2026-11-09 — plain, descriptive, and
impossible to confuse with CSKG in code or prose) holds the
engine's standing
judgements of ordinariness: which reading of a word is the
default one, which attested facts are typical of a thing and
which are exotic. It serves more than ambiguity — the coat that
"catches pigeons" is a typicality failure, and solve's ranking
floor is half a common-sense judgement. Discipline: EverydaySense
**stores no world facts** (it can never become a shadow knowledge
base); it holds judgements *about* readings and facts, derived
where possible from the graph's own statistics (attestation and
relation distributions across a node's neighbourhood) plus a
small, visible set of curated defaults. Consumers: the
AmbiguityResolver, solve's ranking, articulation's plausibility
check. It joins the engine map as its own node when built
(scheduled with E4, against the resolver).

### Standing: the certainty / clarity / knownnessFelt tuple

A cross-cutting measure (the user's concept, 2026-11-09) that any
item in the system may carry — a reading, a fact, a situation
relation, a person fact, a topic. Three axes, kept as a **tuple**
and never collapsed into one number, because they vary
independently and different consumers need different axes:

- **certainty** — how strongly the evidence supports it:
  attestation and corroboration in the graph, or attribution in
  the situation model (asserted < inferred < known, roughly).
  Reference frame: the evidence.
- **clarity** — how sharply the item itself is specified: one
  referent cleanly picked out, or a smudge of candidates. A
  reading can be perfectly clear and quite possibly wrong
  (brother-the-monk); a thing can be certainly present and
  unclear (something in the pantry smells). Reference frame: the
  representation.
- **knownnessFelt** — how *known* the item feels within this
  conversation and relationship: has it come up, is it active,
  did the person themselves establish it. Deliberately a felt,
  discourse-relative quantity — it decays as turns pass and
  refreshes on mention. Reference frame: the conversation.
  It is the axis whose absence made attested-but-alien facts
  ("Third is an echelon") land as non sequiturs: certainty and
  clarity were adequate; felt knownness was zero.

Consumers, by axis: the AmbiguityResolver reads clarity (and the
clarity gap between rivals) plus certainty of its grounds;
solve's ranking floor reads certainty and knownnessFelt;
articulation calibrates hedging by certainty ("is" / "seems" /
"you mentioned") and introduction by knownnessFelt (never
re-introduce what is felt-known; gloss what is not); memory's
promotion and lapse rules move certainty and knownnessFelt over
time; the trace reports the tuple wherever a decision turned on
it, so "why did you say that?" can be answered in these terms.
Adoption is progressive: E4's new machinery (resolver,
EverydaySense) carries it natively; discourse and solve adopt it
field by field as slices touch them.

The tuple also gives articulation a truthful first-person
epistemic vocabulary — three different admissions for three
different failures, each naming the axis that bottomed out, and
each carrying its own remedy:

- **"I don't know"** — certainty absent: the knowledge is not
  there (the empty set). Remedy: the honest decline.
- **"I am unsure"** — certainty low: something is there but the
  evidence is weak or conflicting. Remedy: present it hedged,
  with its evidence, or say what would settle it.
- **"I am not clear"** — clarity low: knowledge exists but the
  referent or reading cannot be pinned down. Remedy: the
  resolver's path — name the reading taken, or ask.

(And knownnessFelt gives the fourth register: "that's new to
me" — and its inverse, earned continuity: "as you said…".)
Where the tuple is known, articulation must not blur these into
one generic apology: which phrase is used is read off the axes,
so the admission is a report of the system's actual state, not a
performance of humility.

## 6. Solving: set operations and the empty set

**The consultation loop, in tiers** (the user's direction,
2026-11-09). On anything it is asked, the system keeps
consulting CSKG in a loop until it can make an answer — but in
**tiers**, each tier a declared widening, every transition
recorded in the trace:

1. **Direct** — the subject as resolved, the relation actually
   asked (E3's strict sets and direct edges).
2. **Resolved** — rival candidates re-selected, within-node
   choice by context fit (E3).
3. **Keyed and expanded** — ATOMIC template keying, synonym and
   form expansion (the depth pass).
4. **Chained** — short traced chains: two-step causation,
   subevent sequences (E3/depth pass).
5. **Neighbourhood fallback** — RelatedTo/IsA widening,
   *disclosed* in the reply (E3's tool route).
6. **The earned decline** — the final tier, which reports the
   search and names the missing relation (the onion reply is a
   tier-6 output).

The guardrail that keeps the loop honest: the tiers are
**finite**, and the loop's loyalty is to grounding, not to
answering — an unbounded loop that *must* answer would
eventually manufacture one, which is the hotspring failure
returning through the back door. Tier reached is evidence: it
feeds the conclusion's certainty, and articulation calibrates
to it (a tier-5 answer is disclosed and hedged as a tier-1
answer is not).

**Two directions of consultation** (the user's distinction,
2026-11-09). Every query the loop makes is one of two kinds,
and the trace tags which:

1. **For us** — the system consulting the graph about its own
   operation: *how to do a thing* (procedures: subevents,
   prerequisites, how an apology or a conversation goes) and
   *what a thing is* (definitions and IsA structure, feeding
   contents categorisation, typicality, resolver evidence).
   This is the graph as the system's own competence manual —
   and the legitimate front door of governed self-improvement:
   a procedure the system lacks is looked up before it is
   built.
2. **For the chatter** — consultation on the person's behalf:
   *information* (their questions, answered) and *response*
   (the material replies are built from, including reaction
   knowledge used to respond fittingly).

The standards differ by direction: for-us knowledge shapes
behaviour durably, so its errors compound across turns and it
is held to the stricter bar; for-chatter information is
per-turn and correctable by the chatter in the open.

The loop's movement across the graph is **hopping** — traversal
from node to node along attested edges — and hopping is this
system's emergence engine (the user's observation, 2026-11-09):
with this much information in the graph, a decision tree that
hops across it can arrive at answers that are **unexpected but
coherent and valuable** — unexpected because no one scripted
the path, coherent because every hop is an attested edge, and
valuable when the landing place genuinely serves the turn. The
trace is what certifies the difference between such an arrival
and a drift into noise: an emergence candidate is a hop-chain
whose steps all check out and whose destination nobody aimed
at.

Retrieval is a lookup; solving is a construction. The solve piece
treats constraints as set operations over graph neighbourhoods:

- **Intersection** — things satisfying several constraints at once
  (opens bottles ∩ found in kitchens).
- **Difference** — minus what the person has excluded ("…without a
  corkscrew" removes the corkscrew from its own answer set).
- **Union / ranked fallback** — when the strict intersection is
  empty, widen one step (UsedFor → RelatedTo + IsA routes, as the
  corkscrew turn already improvised) and *say* that a fallback was
  used.
- **Ranking inside a set** — by attestation support first (the
  quality floor: a coat "used for catching pigeons" must rank below
  ordinary uses, or be filtered when better-attested members exist).

**Decline discipline (the empty-set rule):** when the working set for
the question actually asked is empty, the answer declines and names
the missing relation — it never substitutes a neighbouring set. The
onion failure (any Causes edge touching any mentioned word, offered
as the answer) is the canonical violation this rule exists to
prevent. Triage decides *which* set the question asks about before
any edge is gathered.

## 7. Failure classes → pieces

From the evaluation report, in its ranked order:

1. *Topic capture by non-topic terms* → B (composition analysis)
   + set-overlap scoring: candidate topics are scored by overlap
   between the breakdown's referents and the conversation's active
   topic set, not by raw match length alone.
2. *Data gaps at famous joints* → E's decline discipline (the gap
   is the data's; the overreach was ours).
3. *No quality floor on attested edges* → §6 ranking/filtering.
4. *Clause-shaped targets break grammar* → F, fed by B's cleaner
   referent boundaries.
5. *Coordination swallowing* ("rain and snow" as one node) → B
   splits coordinations before matching.
6. *Label collisions* → B keeps node identity under labels; the
   trace shows node ids in debug.
7. *No sense separation* → B + D: candidate senses intersected with
   active context before choosing. (Ambiguity behaviour — record
   and answer vs ask — is an open product decision; the standing
   default is record-and-answer.)

**E2 findings, absorbed (2026-11-09).** (a) Set overlap is computed
as *best-single-topic affinity*: overlap against the union of all
active topics' neighbourhoods is hub noise on the live graph and
drowns every other signal. (b) B's phrase rules include the
**gerund–object** form ("buying a winter coat" — the object is the
head, the gerund a modifier), without which verb hubs capture
statements about their objects. (c) Sense separation has **two
forms** in CSKG: rival *nodes* for one mention (discourse's choice;
the bananas case) and rival *edges within one merged node* — the
common case, since CSKG merges WordNet's senses into single nodes
(`brother` carries sibling, male, monk and member edges at once).
The second form is solve's within-node fact choice, and it is E3
work: support alone picks monk (2 attestations) over sibling (1);
context must arbitrate.

## 8. Build order and judging

The evaluation discipline (per the milestone): the same evaluation
scripts run after **every** slice, plus that slice's named new turns.
Each slice below declares its expected transcript effect in advance;
a slice is judged on exactly that declaration.

- **E1 — Foundation** *(enables; judged on no regression).* The
  engine map as data; the turn workspace; `converse.ts` split into
  the §2 pieces with behaviour preserved. Same scores on the
  evaluation scripts; any transcript diff explained line by line.
- **E2 — Discourse** *(moves transcripts; judged with E1 in place).*
  The breakdown graph, coordination splitting, topic scoring by
  set overlap. Named turns that must improve: "It is the third day
  of rain." (no longer captured by "third"), the bananas statement
  (film sense must not win), statement topic choice generally.
- **E3 — Solve** *(moves transcripts).* Triage, set operations,
  ranking floor, the empty-set decline rule. Named turns: the onion
  question (must decline, naming the missing causation), the
  corkscrew question (right tool, clean presentation, fallback
  disclosed), "Why?" about the flu (decline stands), Sydney's coat
  (pigeons ranked out or the turn declines to feature it).
- **CSKG depth pass** *(first move after E3; the user's
  direction, 2026-11-09).* Before building more systems, point
  at the graph: CSKG already carries knowledge about how people
  handle things — linguistically, socially, procedurally — that
  the engine barely touches (census below, §10). The pass wires
  the richest seams in: the loader keeps the **sentence column**
  (604,768 attested natural phrasings, currently discarded) as a
  surface-realisation resource (S9); solve gains **event
  knowledge** (ATOMIC: xReact 74k, xWant 129k, xNeed 96k,
  xIntent 58k, xEffect 100k, oReact/oWant — consulted from
  person-state records and event topics), **sequence knowledge**
  (HasSubevent 25k, HasPrerequisite 25k, first/last subevents —
  the "what happens when…" family), and **context knowledge**
  (HasContext 238k — words in their contexts, feeding the
  resolver and EverydaySense). Judged on named turns: the rain
  question gains event content, a tired-state turn gains a
  reaction/want-grounded response, and no grounded totals fall.
- **Definitions** *(small slice, after E3; closes G7 — LANDED
  2026-11-09, evaluation report note).* A `definitions.ts`
  source in the CSKG package joining terms to the repo's own
  WordNet glosses (lemma + part of speech, sense chosen by
  contents/context); "what is X" answers lead with the gloss,
  neighbourhood facts follow. Judged on the what-is turns
  gaining true definitions with the contextually right sense, no
  regressions elsewhere. As landed: the store loads lazily as a
  side store (synset parts only); sense choice runs filing
  share → context fit → POS prior; corrections give the settled
  sense's definition; S16's form is "Term: gloss."
- **Trace files** *(small step before E4, landed 2026-11-09).*
  The ThoughtTrace and a central graph-query log are persisted
  per turn: the chat CLI's `--trace` appends one JSON line per
  turn (utterance, reply, grounded, intent, the trace steps
  verbatim, and every graph query — accessor, key term,
  relation/direction, hit count — recorded passively at the
  loader's accessors, the engine's single graph choke point).
  What it gives E4's judgement: stored, diffable traces — the
  Context module's "traceable difference" becomes a file diff
  between runs rather than an impression, declines carry their
  query-level evidence (the empty Causes set behind the onion
  turn is a line in the file), and emergence candidates can be
  certified against a derivation that survives the session.
  Recording is opt-in per turn and write-only; traced and
  untraced transcripts are byte-identical. Records are built at
  a granularity chosen by `--trace-level` (`steps` | `queries` |
  `full`, default `queries`): `steps` keeps the module path plus
  the turn's query count, `queries` keeps decision queries
  individual (decline evidence included) while the bulk lemmaOf/
  id scans collapse into per-accessor summaries whose counts
  reconcile to the turn's total, and `full` keeps every query
  verbatim — collapsing happens at record-build time, so
  collection stays complete and level-unaware.
- **E4 — The conversation frame: role and person** *(enables, then
  moves — LANDED 2026-11-09, evaluation report note).* Opens with the **Context module** (§2) — the frame made
  operative during analysis; its evidence is the
  situation-conditioned evaluation turns showing a traceable
  difference, or G5's claim is retired. Then role packs (`roles/`,
  assistant first and default),
  statement strategy and follow-up policy in articulation,
  role-shaped fact selection in solve; the person file, its
  loading, acknowledged memory writes, name/context use. Judged
  two ways: the same statement set run under two roles produces
  replies true to each role and equally grounded; and a scripted
  two-session sequence where facts stated in session one are
  context in session two, while general mode remembers nothing.
  As landed: Context's difference is traceable in discourse
  scoring (the coat case, G5 below); both role judgements pass
  8/8 grounded; the two-session sequence fires the §5 canonical
  pair from the file; the resolver + EverydaySense + tuple
  landed with it (G1/G3 closed below). Two honest limits ride
  with the landing: the classifier's graph-evidence channels
  are traced but weightless on today's natural statements
  (they discriminate on fixture-keyed statements; statement
  phrasing does not yet key ATOMIC templates), and the coat
  definition still leads with the fur sense in a clothing
  conversation (filing 25.1 vs garment 20.7 — the context
  channel cannot cross that filing gap; recorded in the note).

- **E5 — Event structure and the situation model** *(later piece,
  decided 2026-11-09; scope grown the same day).* E2's breakdown
  stays deliberately shallow (phrases, topics, referents). Reading
  a sentence as an *event* — who is doing what to whom, with
  participants in roles — is a separate slice after E2, with its
  own named turns. It is the depth at which statements stop being
  answered with topic facts and start being answered as
  happenings, and at which pronoun resolution gets its full form.
  Around the events sits a **situation model**: a small live
  graph, owned by a **Situation analysis** module, holding the
  conversation's own micro-world — its entities, events, states
  and the relations among them — distinct from CSKG, which holds
  world knowledge. Relation families are established by their own
  modules over that one model:
  - **CausalityRelation** — causal links between the situation's
    events and states (rain → ground wet → picnic moved), checked
    against CSKG's causal knowledge where possible;
  - **social relations** — *knows*, *isRelativeOf*, works-with,
    belongs-to, between the situation's people (the person model
    is this family's long-term home);
  - **temporal relations** — before/after/during, durations
    ("the third day of rain"), plans vs past;
  - **state tracking** — entity and person states and their
    changes (a changed state is a small event);
  - **identity/coreference** — "his new girlfriend", "her" and
    "Sarah" are one entity in the model; the substrate G4's full
    form resolves against.
  Every situation relation carries its **attribution**:
  *asserted* by the person, *known* from the graph, or *inferred*
  by the engine — and inferred relations are marked as inferences
  wherever they are used. Slices: E5a events + participants +
  coreference; E5b the relation families.
  *Landed* (2026-11-10): Situation analysis (`src/cskg/situation.ts`)
  owns the model — held in the session (`SessionState.situation`)
  and written to the workspace as the `situationModel` snapshot,
  registered in the engine map like every other piece. E5a:
  entities (one per referent, surfaces accumulate), events from
  statement turns (the person's captured doings first, then a
  clause scan over the design's action vocabulary; participants
  only where the surface supports them — actor, object,
  recipient, instrument, place, time; a container phrase yields
  container + content participants), states, and pronoun /
  definite-reference resolution against the model (G4's full
  form). The contents kind set gained **event** (a mention whose
  referent carries ATOMIC `at:` edges, or files under an event
  anchor — dual with thing). E5b: the four relation families as
  sections over the one model — causality (stated links checked
  against CSKG's Causes testimony: checked → *known*, stated →
  *asserted*, juxtaposition → *inferred*, the stamp spoken in
  why-answers), social (possessive and stated relations;
  write-through to the person file only via person.ts's own
  acknowledged fact discipline — a named relation statement is
  filed as a note fact there, never silently by the model),
  temporal (explicit markers → asserted; telling order →
  inferred and marked as such when used), state tracking (a
  changed state is a small event linked to the state it
  supersedes). Consumption: referring and follow-up questions
  (what/when/who/what's-in/order/how-am-I) answer from the
  model before any fresh topic lookup; a why about a modelled
  event answers from its causal relations first; a first-person
  doing statement gains an event acknowledgement clause beside
  its topic acknowledgement (a pre-declared transcript effect).
  Frame schemas name the roles where a frame matches the verb:
  `src/cskg/frames.ts` is a read-only side store over the
  FrameNet bundle (Definitions discipline — lazy, absent is not
  an error), and the FULL bundle (1,019 frames, manifest counts
  verified) is E5's best substrate: `scripts/install.mjs`
  installs it, the importers print status words
  (full / fixture-only / absent; a partial import installs
  nothing and exits non-zero), and the TUI's setup reports the
  status without blocking on it. Judged on the five named
  sequences in the E5 note (soup, two-person pronouns,
  temporal, causal checked-vs-unchecked, state change) plus
  the Chicago/Sydney evaluations. Honest limits ride with the
  landing, recorded in the note: extraction is a surface
  discipline over a fixed action-verb vocabulary (paraphrase
  beyond it does not key events — G6's remaining half); the
  statement acknowledgement for non-doing statements is still
  topic-led (the model records their events silently); model
  answers phrase events in the person's own words, so their
  grammar is the saying debt's, not yet solved; durations and
  during-relations are named in the design but only
  before/after and planned-vs-past landed.

E1+E2 may be read together (E2 is where E1 pays off); E3 and E4 are
each judged on their own transcripts. The contents-breakdown
submodule (§2, piece B) is factored out as the opening,
behaviour-neutral step of E3 — named and bounded in code, with the
evaluation diff as its check — rather than disturbing E2's landing.

**Loop 1 (2026-11-10)** — the first dev-loop pass (diagnose →
problem tree → declared, verdict-judged leaves) landed three
engine changes outside the E-slice order: the definition route's
unplaced-word decline (a crash fix), two situation-question forms
(the doing-form's am/I subject; a stated-duration answer for
how-long asks, closing the duration half of E5b's named
temporal family), and Solve's **attestation check** (G10,
§9) — the decision layer consulting the graph's silence about
what was asked, as E5b consults its causal testimony. Each leaf
was declared before editing and judged by verdict under the dev
loop; the loop report lives outside the repo with the tree.

## 9. Feature gaps — the watch list

Maintained per the user's standing instruction (2026-11-09): gaps
are logged here as they are spotted, mentioned in slice reports
when a build encounters them, and closed together. **Graph-first
rule** (the user's standing instruction, 2026-11-09): apply
CSKG itself to every gap whenever it can be done, at any time;
only when the graph proves insufficient do we discuss building
a module for it. Statuses:
**open** (undecided/unbuilt), **decided** (settled, awaiting its
slice), **closing** (a running slice owns it), **closed**.

- **G1 — Ambiguity behaviour.** When rival readings genuinely tie:
  ask, name the reading, or silently record-and-answer? *Decided*
  (2026-11-09): neither fixed policy — an **AmbiguityResolver**
  submodule resolves first on (1) what the person said
  (history/memory) and (2) common sense, and escalates to a
  whole-situation clarification decision only when resolution
  fails (§5); lands in full with E4. The common-sense ground
  indicates a dedicated module — **EverydaySense** (§5), named to avoid
  any clash with CSKG. Until then the default is
  record-and-answer. Encountered at: bananas (scoring resolved
  it), brother (E3's within-node choice).
  *Closed* (2026-11-09, E4): the resolver and EverydaySense
  landed as designed (resolver.ts, everydaysense.ts) — grounds
  in order (history, EverydaySense, score), escalation over
  gap/distance/gravity/cost/budget/disposition, asks with
  pre-mapped branches and pending state resolved before new
  analysis. Live evidence: definition questions ask (bat,
  crane, bass), name (bank), and answer by EverydaySense
  (cold); discourse runs the ground-1 review on near-ties.
  EverydaySense's defaults are filing-cluster mass over the
  graph's own IsA filings; its curated set is still empty —
  derivation has sufficed so far.
- **G2 — Event structure.** Sentences as happenings with
  participants, not topics. *Decided*: slice E5 — grown
  (2026-11-09) into a **situation model** with Situation analysis
  and relation-family modules (CausalityRelation, social,
  temporal, state, coreference), every relation attributed
  asserted/known/inferred (§8).
  *Closed* (2026-11-10, E5): the situation model landed —
  statements build events with surface-supported participants
  into the session-held model, follow-up and referring
  questions answer from it, and the named sequences (soup,
  pronouns, temporal, causal, state change) show happenings
  followed across turns for the first time. The residue is
  extraction reach (the fixed action-verb vocabulary — G6's
  remaining half) and the saying of events, not the structure.
- **G3 — Statement response shape.** What a statement reply should
  do. *Decided*: answered by role (§5) — implementation in E4.
  *Closed* (2026-11-09, E4): statement replies are formulated
  per the classification (schmooze / connected / informing /
  state), the role pack's strategy and follow-up policy, and
  the operative context; schmooze follow-ups are formed from
  the statement's own slot (a narrated doing, a person
  introduced as new), and a connected statement says its
  connection (the continuity clause). Judged under two roles
  in the E4 note (J2).
- **G4 — Pronouns.** *She/he/it* pointing at active referents.
  *Open*; a light version (most recent compatible referent) is
  cheap at any time, the full version rides with E5.
  *Closed* (2026-11-10, E5): the full version landed with the
  situation model — pronouns and definite references resolve
  against the model's entities and events (kind- and
  relation-compatible, recency inside the compatible set;
  "it" prefers the latest event's object, "then" the latest
  event), every resolution is traced, and the identity
  relations carry the *inferred* stamp. The named two-person
  sequence is the evidence: "he" lands on the brother across
  turns, and both follow-ups answer from his event. Limit:
  resolution is recency+compatibility only — no salience
  weighting beyond the topic machinery the model already
  inherits, and a pronoun with two live compatible referents
  takes the most recent without asking.
- **G5 — Situation selection pressure has no observed effect.**
  The mechanism (prefer season/daypart-relevant facts) is in, but
  Chicago-vs-Sydney runs showed no flip — the effect sits below
  the data's noise floor. *Decided* (2026-11-09): the pressure is
  relocated into a **Context module** (§2) that informs the
  response *during analysis*; it opens E4, and its named evidence
  is the situation-conditioned turns — an observable, traceable
  difference, or the claim is honestly retired.
  *Closed by evidence* (2026-11-09, E4): the Context module
  landed and the named evidence exists — on identical input
  (the Sydney script's coat turn under both locations), the
  "winter coat" candidate scores 30 in Chicago against 25 in
  Sydney, the difference being the context-overlap channel
  (×6 vs ×1) fed by Context's facet sets, with the compose
  steps naming the facets in both traces. The honest limit
  rides with the closure: the pressure moved scores inside
  analysis; it did not flip a selection in these turns, and at
  full corroboration strength it proved harmful (facet-word
  affinities flipped the brother turn before being withdrawn
  to the relevance/overlap channels — measured in the E4 note).
- **G6 — Paraphrase reach.** Statements like "I feel tired all the
  time" never reach ATOMIC's event/reaction nodes; literal-term
  matching is the ceiling. *Narrowed* (2026-11-09): for
  self-statements the capture-first rule (§5, person state) makes
  the statement land as a canonical state record regardless of
  wording, and ATOMIC is consulted from that record. General
  paraphrase reach for other content remains *open*; related to
  G2/E5. The narrowing *landed* with E4 (2026-11-09): the tired
  turns reach the "feels tired" event from the state record in
  both evaluations and sessions. (The classifier's own event
  keying over statement phrasing matched nothing live — the
  E4 note's probe result; that is the general-reach half of
  this gap, still open.)
  *Narrowed again* (2026-11-10, E5): the situation model's
  event extraction is a second, independent reach — a clause
  scan over an action-verb vocabulary (regular + irregular
  forms), subject-verb disambiguation (an article-governed
  noun that is also a verb form does subject duty), and a
  per-clause ATOMIC `matchEvent` keying recorded on the event.
  Live evidence: every statement in the five named E5
  sequences extracts its happening(s), including third-person
  and past-tense statements the classifier never keyed. What
  remains open is reach beyond the vocabulary: a happening
  phrased with a verb outside the set (or a nominalisation)
  still keys nothing, and the vocabulary is a list, not a
  derivation — extending it from the graph's own verb
  inventory (the graph-first move) is the recorded next step
  for this gap, not yet taken.
- **G7 — No definitions.** CSKG carries no glosses, so "what is X"
  is a neighbourhood sketch, never a definition. *Decided*
  (2026-11-09, verified against the data): WordNet IS one of
  CSKG's sources, but only its terms and relations crossed over —
  the gloss text did not (CSKG's DefinedAs is term→term; banana
  carries relations only, no definition). The repo's own WordNet
  import, however, has the glosses (definition text per synset).
  Cure: join the CSKG package to the repo WordNet as a
  definitions layer, sense chosen by contents/context; scheduled
  as the small Definitions slice in §8.
  *Closed* (2026-11-09, Definitions slice): the join is
  `src/cskg/definitions.ts` — a lazily loaded side store over
  the extract's synset parts (lemma + POS + gloss, provenance
  on every candidate), terms reaching synsets via the loader's
  FormOf lemma machinery; sense chosen by filing share (the
  support-weighted share of the term's IsA filing a candidate's
  evidence accounts for), then solve's context fit, then a POS
  prior. Definition-shaped "what is/are" turns lead with the
  gloss (S16 form), neighbourhood facts follow; corrections
  give the settled sense's definition; no gloss falls back to
  the previous answer exactly.
- **G8 — Cold start.** ~27 s graph load, no serialised index.
  *Closed* (2026-11-09, evaluation report note): the built
  graph is serialised to a binary cache derived from the
  source path (`<data>.index.bin`, in data/raw/cskg/ for the
  shipped dataset) — CSR arrays and side stores as raw bytes
  plus offset-tabled string blobs, under a header carrying a
  source fingerprint (size + mtime + sha256 of the first/last
  256 KiB), the relation and dataset vocabularies, and a
  sha256 over all section bytes. loadCskg deserialises on a
  fingerprint match and falls back to the full parse (which
  rewrites the cache) on any doubt — absence, mismatch,
  corruption — so a bad cache can never crash or silently
  mis-serve the chat. Measured on the day: parse 31.3–33.0 s
  → cache load 1.8–2.3 s (≈15×), cache file 170.6 MiB, cache
  write ≈2.5 s one-off after a parse; Chicago/Sydney
  transcripts from a cache-loaded process byte-identical to
  the parsed process (clock line excepted). Provenance masks
  are re-mapped through the header's dataset table on load,
  since mask bits are numbered by parse encounter order.
- **G9 — Question scaffolding treated as a topic.** Exposed by
  the depth pass probe (2026-11-09): "What do people want when
  they can't sleep?" — with no event match, the generic path
  answered a junk fact about *people* ("People is a better."),
  an attested edge about a scaffolding word. Words that frame a
  question (people, someone, happens) are not topics. Related S9
  evidence from the same probe: ATOMIC template labels render
  roughly ("they was late to office") — event-label articulation
  is saying-side work. *Closed* (2026-11-10, first unscripted-chat
  loop): discourse `preferQuestionSubject` drops scaffolding
  (people, someone, thing, …) when a content object is also a
  candidate — "Where do people keep coffee?" is about coffee;
  a question whose only candidate is scaffolding still keeps it.
  Event-template matching already dropped the same words
  (`EVENT_UTT_DROP`); this closes the generic/location subject
  pick. S9 event-label wording remains open.
- **G10 — Unattested specific-fact asks answered by substitution.**
  Exposed by the abstention probes (2026-11-10): questions whose
  asked fact the graph does not attest — a neighbour's phone
  number, last night's match result, the population of a city
  *at this moment* — were answered with a definition of, or an
  arbitrary fact about, a term the question contains: grounded
  in the graph, ungrounded in the question. No piece owned the
  responsibility "is what was asked attested at all?".
  *Closed* (2026-11-10, Loop 1): Solve gained the **attestation
  check** (`attestationGap`, trace step solve/attest): a
  specific-fact ask names two poles (bearer/subject and the
  value, role, count or event asked for); the asked fact counts
  as attested when a direct graph edge connects the poles or
  a record of this conversation states them together (a count
  is attested only by a record — edges carry no instance
  counts). The coordinator consults it after situated testimony
  (situation model, person recall, related/why/event answers)
  and before the definition route and generic fallback, for
  whatis-shaped and unclassified asks only; the decline names
  the poles and the missing connection. Verified by the
  abstention probes under the dev loop's declaration gate
  (8/8 declines; no other scripted turn moved). Honest limits:
  four ask forms are recognised (value-of, who-role/event,
  how-many, specific past event / future property); a specific
  ask in another shape still falls through to the old routes.
- **Composition-in ("does X go in Y?").** Exposed by the
  unscripted-chat sitting (2026-11-10): "do onions go in chicken
  soup?" had no surface kind, so the generic path answered an
  IsA of the outer ("Chicken soup is a soup."). *Closed*
  (2026-11-10, first unscripted-chat loop): `detectComposition`
  plus `solveComposition` look for HasA / PartOf / AtLocation
  between the poles; an empty set declines in G10's shape and
  does not substitute a neighbouring IsA. Advice-shaped
  follow-ups ("what else should I put in?") remain undesigned.
- **Advice (addition and wear).** Exposed by the unscripted-chat
  sitting (2026-11-10): "what else should I put in?" after
  chicken soup was a generic IsA of chicken ("Chicken is a
  cock."); "should I wear a coat?" was IsA hair. *Closed*
  (2026-11-10, advice loop): `detectAdvice` plus
  `solveAdviceAddition` / `solveAdviceWear`. Addition gathers
  HasA / PartOf members of the dish in play (this turn's dish
  first, then named, then the situation model's food object)
  and subtracts what the person already said they have; an
  empty set declines in G10's shape and does not substitute a
  neighbouring IsA, a parent dish, or an AtLocation scene. Wear answers from the
  garment's UsedFor (the node that carries uses, not an IsA
  homonym); wear/warm uses outrank other uses when present.
  Honest limits: this dump has no chicken-soup ingredients, so
  that sitting addition declines; extra Wikidata is a later
  corpus. Resolver-on-statements (chicken→cock, coat→hair on
  non-advice turns) stays open.
- **Same-session recall forms.** Exposed by the same sitting:
  "do you remember my name?" after a stated name was a graph
  question about the node *name* ("Name is an affinity."),
  because recall only matched the file question and general
  mode never kept stated facts on the session. *Closed*
  (2026-11-10): `detectPersonRecall` distinguishes file / name
  / place; capture always writes `sessionFacts`; name and place
  forms read the file when present, else this session. "What
  do you remember about me?" in general mode still names the
  missing file.
- **Wikidata-CS unattached to speech.** Exposed while designing
  advice (2026-11-10): CSKG includes Wikidata-CS (~102k WD
  rows, 15 ConceptNet-mapped relations), but Q-ids interned as
  `q1432535` while speech resolves `/c/en/chicken soup`. Labels
  (`node1;label`) sat unused. WD PartOf/MadeOf is real
  composition testimony (garlic → garlic soup; noodle → noodle
  soup) that the engine could not hear. *Closed* (loader
  identity): Q-id endpoints intern by English labels and join
  the ConceptNet term of the same name; PartOf/MadeOf already
  in KEEP feed composition. Honest limits: Wikidata-CS is not
  full Wikidata — chicken soup has no ingredient PartOf in this
  dump; `/r/dbpedia/*` and DistinctFrom stay dropped (genre,
  genus, occupation, distinctness — not composition). Extra WD
  properties are not in the file to keep.

## 10. Toward a real conversation: capability map and morphs

### What a real conversation still needs

Grouped by the side of the conversation they serve, with status —
*have* (in the running engine), *designed* (in this document,
unbuilt), *missing* (not yet designed):

- **Understanding.** *Have:* breakdown into mentions/topics,
  coordination splitting, corrections. *Building:* solve's triage
  (E3). *Designed:* the contents submodule's people/places/things/
  times analysis, EverydaySense, the AmbiguityResolver,
  definitions. *Missing:* paraphrase reach beyond self-statements
  (E5's event matching — landed 2026-11-10 as situation.ts's
  clause scan plus per-clause ATOMIC keying — is the current
  answer; reach beyond its verb vocabulary is G6's open half).
- **Deciding.** *Have:* basic intent (statement/question/why/
  correction). *Designed:* the Context module assembling operative
  parameters, the clarification decision, standing-tuple
  consumers. *Landed with E4 (2026-11-09):* the Context module,
  the clarification decision (resolver), the tuple's first
  consumers, and statement classification. *Missing:* an initiative policy — when the chat may
  ask, offer, or reopen a topic on its own motion (the role's
  follow-up policy is only a seed).
- **Saying.** *Have:* grounded one-fact replies, honest declines.
  *Designed:* the epistemic vocabulary read off the tuple,
  role-shaped statement strategies, definition-led answers.
  The thinnest side overall; its aspects are registered as
  **S1–S16** below for one-by-one ruling. A conversation of
  single-fact turns reads as interrogation no matter how good
  the facts are.

### The saying register (S1–S16)

- **S1 Aggregation** — several conclusions in one reply.
  *Decided* (2026-11-09): lives in the Response module's compose
  step — the chain of thought and reasoning is formed into a
  Conclusion, which articulation then renders.
- **S2 Content selection & ordering** — which conclusions, how
  many, headline vs support. *Decided* (2026-11-09): the compose
  step queries **Context** and a **ValueSystem** — a moral-based
  value layer drawn from the **Book of Changes** — to select and
  order what the reply leads with. Flags recorded with the
  ruling: (1) this consciously reverses Milestone 1's deferral
  of the ontology as direction layer — for the *selection*
  function only, not for knowledge content; (2) the ValueSystem
  **orders and selects among grounded conclusions**; suppressing
  a grounded answer on value grounds is a different, heavier
  power, not granted by this ruling and requiring its own;
  (3) the Book of Changes value layer does not exist yet and is
  its own build; compose must run correctly with it absent
  (values neutral) so the fundamentals never block on it.
  **Source** (the user, 2026-11-09): the **Blofeld translation**
  is the ValueSystem's text; the **prefaces to Legge and to
  Blofeld inform** its framing. Care: Blofeld (1965) is in
  copyright — the layer encodes the hexagrams' structure and
  value judgements *derived* under that reading, never the
  translation's text embedded in the repo. The original text
  may be consulted in Chinese, but **no Chinese goes into the
  repo for now** (the user's rule, 2026-11-09) — Kavi
  translates; the repo stays English.
- **S3 Cohesion** — connectives and discourse markers between
  turns and topics. *Sample solution sketched* (2026-11-09):
  articulate first computes **cohesion links** between the
  Conclusion and the prior discourse (from Context and the topic
  stack) — continuation, consequence, contrast, return,
  time-anchor — and each link type licenses specific markers.
  A marker is emitted only when its link exists in the
  workspace: **connectives are claims**, so unearned markers are
  banned, and a linkless reply plainly stated is correct output.
- **S4 Output reference** — pronouns and definite references in
  the chat's own output. *Missing.*
- **S5 Phatic turns** — greetings, closings, thanks,
  acknowledgements, fitted to daypart and relationship.
  Its engine-side counterpart is phatic *intent* recognition
  — the schmoozing class in piece C (§2): a phatic statement's
  correct reply is social continuation, not a fact.
  *Engine side landed* (2026-11-09, E4): the schmoozing class
  is live in piece C (classification with person knowledge
  first and graph evidence weighed), and its replies are
  social continuations formed from the statement's contents.
  *Surface turns landed* (2026-11-10, first unscripted-chat
  loop): bare and tagged greetings (`hey, how's it going?`),
  how-are-you family, thanks (including `thanks anyway`),
  farewells, and a leading-thanks clause on a mixed turn
  (`thanks anyway. I'll go make coffee`) — the social move
  is taken up and the rest keeps its normal route. Daypart
  and relationship fitting remain open.
- **S6 Epistemic forms** — hedges and the three admissions read
  off the tuple. *Designed.* *Landed for the resolver path*
  (2026-11-09, E4): the tuple is carried by the E4 machinery,
  and the definition path's examination step reads the
  admission off the verdict's axes (the ask form opens with
  "I am not clear…"); solve's and discourse's progressive
  adoption remains as slices touch them.
- **S7 Role statement strategies** — acknowledge-and-offer vs
  react-and-share. *Designed* (role packs). *Landed*
  (2026-11-09, E4): packs under `roles/` (assistant,
  companion), judged two ways in the E4 note (J2).
- **S8 Question forms** — clarification asks (branches
  pre-mapped), follow-ups, offers. *Partly designed.*
  *Clarification asks landed* (2026-11-09, E4): the resolver's
  ask renders with pre-mapped branches (words + graph
  footprint), sets pending state, and resolves by ordinal,
  branch words, or category naming; follow-ups exist as the
  schmooze forms (S5/S7). Offers remain undesigned.
- **S9 Surface realisation** — fact-to-sentence grammar:
  agreement, articles, clause combining, given-before-new.
  *Crude and fragile* (duplication and clause-shaped-target
  failures on record).
- **S10 Register & tone** — formality, warmth, directness as
  parameters. *Missing as a mechanism.*
- **S11 Length calibration** — reply length fitted to the turn.
  *Missing.*
- **S12 Output repair** — owning a wrong previous turn in words
  ("I said monk — I meant your brother"). *Missing* (corrections
  are absorbed silently today).
- **S13 Set presentation** — graceful lists for set-shaped
  answers instead of dumps or silent truncation. *Crude.*
- **S14 Echo & mirroring** — grounding by echoing the person's
  own words back. *Missing.*
- **S15 Delivery shape** — segmentation and streaming of the
  reply at the interface. *Parked* (piece G territory).
  *Partially landed* (TUI step, 2026-11-09): terminal delivery
  exists — the TUI presents whole replies under a situated
  header with an optional per-turn trace view, after a
  pre-chat setup (data, serialise, configure); segmentation
  and streaming remain parked.
- **S16 Definition form** — genus-and-difference answers from
  the gloss layer. *Landed* (Definitions slice, 2026-11-09):
  the form is "Term: gloss." — the attested gloss quoted, the
  neighbourhood facts following it.

- **Conversing over time.** *Have:* topic memory, trace replay.
  *Designed:* person state (two tiers) and long-term memory,
  pending clarifications, situation model (E5). *Landed with
  E4 (2026-11-09):* person state (two tiers), the person file,
  pending clarifications. *Missing:*
  topic shift and return as first-class moves ("back to the
  soup"), and the milestone's real acceptance instrument —
  **unscripted conversation**: free chats with a person, judged
  as transcripts, alongside the scripted evaluations. Plus
  performance (G8): a 27-second cold start and slow turns break
  conversational feel before any content does.

### First move: use CSKG itself (graph-first)

The governing economy (the user's direction, 2026-11-09): for
every designed capability, ask first what CSKG already knows
that answers it, and build the thinnest derivation layer over
the graph — modules hold *questions and judgements*, the graph
holds the knowledge. **The architecture itself is revisable on
the same evidence**: we do not have to build architecture on
everything, and when the graph turns out to tell us about
something a module was designed to hold, the design changes —
modules shrink or retire (EverydaySense's typicality, now
largely graph statistics, is the first instance). The design
document is a living hypothesis about where the graph ends and
our machinery begins, and the boundary moves as we measure. A census of the graph as loaded
(6,001,531 edges) shows how much is sitting unused:

- **How people handle things** (ATOMIC, 711k edges): xAttr
  133k, xWant 129k, xEffect 100k, xNeed 96k, xReact 74k,
  xIntent 58k, oWant 54k, oEffect 35k, oReact 31k — what people
  in an event typically feel, want, need, intend, and what
  follows from it.
- **How events unfold**: HasSubevent 25k, HasPrerequisite 25k,
  HasFirst/LastSubevent ~6k, Causes 17k, MotivatedByGoal 9.5k.
- **Linguistics**: Synonym 1.25M, Antonym 401k, FormOf 379k,
  DerivedFrom 326k, HasContext 238k, MannerOf 13k; FrameNet's
  lexical units 59k — word behaviour, in the graph.
- **Attested phrasing**: 604,768 edges carry a natural-language
  sentence (the ConceptNet assertion sentences) — a phrasing
  bank for S9 that the loader currently throws away.
- **Limits, honestly**: DefinedAs is only 2,173 edges (G7 still
  needs the WordNet gloss join), and RelatedTo alone is 1.7M
  edges of useful haze — graph-first raises the premium on
  ranking and declines (E3's work); it does not replace the
  machinery. FormOf carries junk mappings (i→y, off→ov,
  the→lack of supplies, metalling→metal): per-turn derivation
  must prove verb shape (inflectional ending, single-token base,
  closed-class exclusions) and never trust a bare lemma —
  the standing lesson of items 2 and gap 4, enforced in code,
  not just noted here. CSKG knows *about* conversation; the conversation
  manager is still ours to build — but it should be built thin,
  pointing at the graph.

### Morphs: parameterised pieces

The paramorphic idea (the user's concept, from the
paramorphic-components work): **one underlying component, many
forms, the form generated from a declared parameter set.** Applied
to the engine: a piece's logic stays fixed while its behaviour is
parameter-selected — and the Context module is what computes the
parameter vector each turn, from the frame (role pack, person
file, situation). The engine is already growing morphs in embryo:
role packs are parameter bundles; the engine map makes structure
itself data; the standing tuple *selects* among articulation's
epistemic forms.

Where morphs buy real adaptability here:

- **Articulation as one morph.** A single "communicate this
  conclusion" component whose forms — plain assertion, hedged
  assertion, naming-the-reading, question, decline-with-
  alternative — are selected by tuple × intent × role parameters,
  instead of separate code paths per form.
- **Policy parameters in packs.** Resolver escalation thresholds,
  the ranking floor's strictness, EverydaySense's defaults,
  initiative frequency: declared in packs (role packs first),
  changeable without engine surgery.
- **Per-person morphing.** The person file doubles as an
  accumulating parameter set (directness, verbosity, topics that
  land) — over time the chat quite literally morphs around a
  known person, within the write discipline of §5.
- **Situation parameters.** Daypart and season parameterise
  openings, initiative and selection, through Context.

The guardrail, generalising the role rule: **an invariant core
never morphs** — attestation and grounding, the empty-set
decline, the tuple's semantics, memory's write discipline.
Parameters select among grounded behaviours; no parameter set
may license an ungrounded one. And morphs are judged like
everything else here: a parameter change declares its expected
transcript effect and runs the evaluation; parameters ship in
packs with defaults, never as loose knobs, so the space stays
testable.

### Self-modification: the pattern, deferred

The user's essay *Self-Modifying Systems* (preserved verbatim at
`docs/user-plans/self-modifying-systems.txt`) describes a machine
that carries, beside its decision graph, a second decision
structure for *modifying* that graph — examining, changing,
testing. Its central pattern is already this design's guardrail,
arrived at independently in the morphs discussion above: **an
unchanging core surrounded by modifiable features**, change kept
gradual and purposeful, equilibrium as the guiding principle,
and unanticipated phenomena *expected* from self-change — which
is this project's emergence stance with the stakes raised.

Classified for this system, following the essay's own order:

- **Immutable core** (never self-modified, rarely human-modified):
  grounding and attestation, the empty-set decline, the tuple's
  semantics, memory's write discipline, the trace itself.
- **First mutable area — settings and logs.** The essay's
  flattest category is also ours: packs and parameters (role
  packs, resolver thresholds, ranking settings) are the settings;
  the thought traces and evaluation results are the logs. The
  essay's mechanism — *change configuration by mechanical
  analysis of the logs* — is, at this stage, our slice
  discipline with the builders as the modifying layer: trace
  analysis → a proposed change with a declared expected effect →
  evaluation → adoption or rejection, every step human-approved.
- **Equilibrium gauges.** The signals that would ever justify a
  change are monitored quantities, not vibes: decline rate
  (deficiency), ungrounded-answer rate (excess), clarification
  rate, topic-capture rate. A gauge out of band is what *opens*
  a modification question.
- **Later mutable areas, in the programme's own order:**
  knowledge-base contents (gated behind a working chat, per the
  programme), then — last and most cautiously — the engine map's
  wiring itself.
- **Not now.** No autonomous self-modification is designed or
  built until the fundamentals stand: solve's correctness (E3),
  the conversation frame (E4), and basic conversational saying.
  A system that modifies itself before it can reliably converse
  would be tuning an instrument that does not yet play. The
  essay's closing image is already implemented, incidentally:
  the clock — every memory and trace in this system is stamped
  with the situation's time, the face at which all internal
  efforts arrive.

### Outcome-backward derivation (method)

Systems are derived backwards from outcomes (the user's
direction, 2026-11-09): declare the statement→reply pairs the
system should be able to produce, then derive the machinery
that produces them *from analysis* — the replies themselves are
never hand-written. This formalises the project's standing rule
(iterate on the engine until transcripts look like chat) into a
design method, and each saying capability starts from its
outcome pairs. The canonical first pair, from the user's worked
example — one statement, two legitimate outcomes, the analysis
deciding which:

- "I'm making a big pot of soup Saturday." → **"And what made
  you want to do that?"** — derived machinery: schmoozing intent
  (C), interest/elaboration question forms (S8), role parameters.
- "I'm making a big pot of soup Saturday." → **"Well, he'll
  like that — he likes soup."** — derived machinery: person
  memory holding a third party's preference, the situation
  model's social relations, an occasion link (Saturday). Flag:
  if the occasion link is inference rather than established,
  attribution discipline applies to the reply too — the honest
  forms are the conditional ("If he's coming, he'll like
  that…") or the schmooze question first.

### Problem-solving patterns (parked)

Parked 2026-11-09 (the user's call: too much for E4, but allowed
to influence it). Source material verbatim in
`docs/user-plans/problem-solving-acronyms.txt` — educators'
acronyms for working a problem in named steps (S.O.L.V.E.:
Study the problem, Organize the facts, Line up a plan, Verify
with action, Examine results; I.D.E.A.L.: Identify, Define,
Explore options, Action, Look back; and a dozen siblings).

The shape, when unparked: a pattern for procedure-shaped turns
built on the consultation/authority line. The *meta*-procedure
— the step skeleton — is engine structure, ours. The *domain*
procedure it walks (prerequisites, subevent sequences, needs,
uses) is the graph's testimony, consulted never obeyed. A
pattern is selected by problem type under Context (the
discourse typing says a procedure is wanted; the domain typing
says where the testimony lives) and executed as a named
consultation sequence, so the trace reads in the skeleton's
order: study → organise → plan → act → examine.

I.D.E.A.L. is the closest frame: its Explore-options step is
solve's rival-candidate arbitration under another name, and
Look back is this project's examine step — the trace, the
transcript, the evaluation. One rule every variant worth
adopting shares, and this design keeps: the verify/examine
step is non-negotiable and last.

Influence already exerted: E4's definition path orders its
trace study → organise → plan → consult → examine, with
examine explicit and last (recorded in the E4 evaluation
note). When this is unparked, its slice declares — per problem
type — the consultation sequence and the transcript effect it
will be judged on, like every other slice.

## 11. Direction recorded 2026-11-10: the entity, distance, and the loop

Recorded from the owner's direction during the transcript
reference improve round on Stock Conversation A. These are
standing rulings for all later slices, stated once here.

**The telos.** The chat is an entity, not a question-answerer.
It knows it is talking to someone; it knows the situation, how
to analyse it, how to find out answers, how to solve problems.
It will have a personality and temperament later (deliberately
deferred, not now), and a situated self that knows where it is,
what time it is, and in time the weather and other senses of
its frame. The end state: a person has a very real experience
with the chat, believing it is a real entity — earned by the
machinery working, never performed. Deepened later still, its
decisions will be informed by the classical layer: a situation
read through Taiji (the whole and its two turning tendencies),
assessed through the 64 hexagrams, its temperament shaped from
Wuxing. SURFACE RULE for that layer: built into the
architecture, never announced in the chat — no naming of
hexagrams, phases, or Taiji in replies; the classical structure
shapes assessment and response silently, and its only evidence
is the quality of the conversation.

**The graph-distance rule.** The graph must not be close to the
response. A turn travels through the whole architecture —
memory, the state of things, who the person is, the processing
machinery — and the reply is the product of that. A direct
graph query result pasted as a response ("Ladder is a type of
degree") is an architecture violation, wherever it occurs: each
intervening piece must transform what it touches (weigh,
combine, contextualise), never merely relay. Traceable is
not identical: a conclusion the engine forms by processing
what the edges attest — combined under arbitration (E3),
selected and grouped (compose), inferred and stamped as
inferred — does not exist verbatim in the graph, and need not.
Every element it is built from is attested, and the trace shows
the derivation. What is banned is unattested content smuggled
in any form — a new entity, a new relation, a number no edge
holds — never transformation itself. Heavy processing of what
the edges have is the job; pasting what they have is the
violation. On statement turns there is no graph-to-response
path at all; testimony may inform a statement reply only as
arbitrated, combined conclusions that serve the conversation,
and otherwise the situation machinery answers with a clean
acknowledgement.

**Questions come from the adaptive tree.** A question is a
conclusion the architecture reaches by processing the specific
thing said, the whole conversation, memory, the situation and
the person — never an appendage scheduled by policy. It may be
asked only for a genuine gap or fork the person can fill, and
never when the conversation already contains the answer. The
resolver's clarification and the person layer's name admission
are the model instances; the role follow-up stands re-grounded
under this rule or silent.

**Disposition: the frame's riding assumptions.** The same
opening line may legitimately be answered many ways, depending
on what the entity knows of the person and the subjects,
whether it is the first thing said, and what memory exists.
What decides is the setup — the riding assumptions the frame
carries: "I won't ask much upfront, I'll just listen" vs "I'll
ask a certain amount". These assumptions are named and
gathered in one place — the DISPOSITION (disposition.ts,
loaded with the frame by awareness, carried in the operative
context, registered on the engine map): an elicitation
appetite (listening / balanced / gathering) and pattern-speech
readiness. The disposition is setup the turn consults, like
the role, not a pipeline stage: it sets the adaptive tree's
appetites, never its schedule. CORRECTION (owner, 2026-11-10):
the example question ("How old is Marcus? And you?") was an
example of a question ARISING NATURALLY, not a behaviour to
mechanise — the valued-facts inventory first built here
(age/relation, with its generated question) was a
conversational template and has been REMOVED (round 3, leaf
T1). The disposition is inclination only; what is worth asking
must emerge from the processing over the situation, the
person and the conversation. Defaults reproduce the standing
behaviour exactly; the seed of the later Wuxing temperament
lives here, as explicit, inspectable stance.

**Answers are sequences, combined.** No response is the result
of a single query: one query gathers too little information to
decide on. Answering follows an adaptive tree — the next query
chosen from what earlier queries returned (contested evidence
branches to discriminating queries, thin evidence widens, a
dominant attested result concludes) — and the conclusion is
formed by combining multiple results under arbitration:
agreement strengthens, conflict is named or asked about, never
silently stacked. The resolver's study → organise → plan →
consult → examine is the working instance; the other routes
convert to the same shape.

**The working loop: transcript reference improve.** Take a
stock conversation (A: the sailing conversation,
scripts/probes/stock-a-sailing.txt), go through it and fix all
of its problems inside the architecture until its handling is
natural; then make a new stock conversation and repeat. A turn
counts as fixed only by a deep solution — the aspect actually
working, checkable in the trace and the model state — not by a
line that merely reads well. Fresh scenarios run alongside as
the anti-overfit check, and transcripts are the acceptance
evidence, read in the chat as it improves.

**Division of labour (restated).** CSKG testifies: facts,
relations, and their absence — silence is evidence for a
decline. Ours is the directing layer: state, memory, decision,
chain of thought — which may consult the graph as evidence
wherever honest, but is never expected from it. Policy lives in
named pieces on the engine map; the turn coordinator conducts,
extracting one policy at a time, behaviour-neutral, proven by
identical transcript diffs.
