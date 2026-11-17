# SemanticAssessment

- **Schematic address:** `lpu/semantic-assessment`
- **Type:** Unit
- **State:** partial — **65% completed to goal** (set by us, assessed by the project, not measured or computed). Slices 1–3 built 2026-11-17: `src/fork/semantic-object.ts` (the type) + `src/fork/assess.ts` (creation) — an object for every parsed utterance, aspects classified through the OntologyCore, compositions rolled up; read by Coherence and the Planner. Detail in the "ALL BUILT" section below; suite 595/595. **Senses face added 2026-11-17:** at creation the assessment now also consults the Senses-Scening Unit (`lpu/senses-scening-unit`, over the OntologyCore's SenseUnit), and every object — person and reply alike — carries a `senses` face: per-channel entries (sight/hearing/smell/taste/touch/mind, present or none) plus the multi-sensory scene those entries bind into. **Quantity mentions added 2026-11-17:** at creation the assessment also consults the QuantificationLanguageUnit (`lpu/quantification-language-unit`, over the OKU's QuantificationUnit), and an object whose utterance carries quantity content carries the mentions (`object.quantities`); the turn loop applies them to the Session's quantity ledger after the object is recorded.

## What this unit is

The owner's direction (2026-11-16): somewhere in the Language Unit there is a
SemanticAssessment unit that answers **"What is this?"** — what the text is
saying — **and then the semantic objects can travel in the system.**

The Parser answers how the text is *built* (tokens, senses, slots, forms, the
meaning and connective graphs). This unit answers what the utterance *is*, as
a whole:

- its **kind** — a greeting, a closing, a question (and what kind of answer it
  expects), a statement, a feeling-statement, an introduction, a presence
  check, a correction;
- what it **asserts, asks or offers** — or that it asserts nothing;
- what it **leaves unexpressed** that its kind normally carries (the cause of
  a feeling, the object of a verb, the referent of a pronoun);
- its **register and mood**.

The assessment is packaged as a **semantic object** — a portable record that
travels the system along the pathways: Coherence judges its fit and prices
what is missing against the situation; the Planner chooses the move that
answers its kind; Session records it as the turn's event, where later objects
are checked against it and corrections supersede it.

## Where the working code lives today

Nowhere as a unit. The judgement is currently made implicitly, in pieces,
inside `src/fork/turn.ts` (interrogative branches, gap computation, statement
recording) and in `src/fork/sentence.ts`'s narrow `discourseAct` field
(topic-proposal / reason-query) — the two earliest assessment kinds, living in
the parse. This unit is where that judgement gathers into one recorded answer.

## Open design points

- Whether reply drafts are also semantic objects (the Planner's reply intent
  travelling to the Verbalizer, assessed outbound by Coherence) — Kavi's lean:
  yes, the same object kind in the other direction.
- Which consults the unit holds (Session, for reference and stream) — drawn
  when settled, not guessed.

## Capability audit (2026-11-16, owner's question: "Is our semantic object capable enough?")

The six fields as designed (kind, content, unexpressed, register & mood,
confidence, provenance) carry the scenarios designed so far: the greeting,
the feeling-statement with its missing cause, quality questions, corrections.
Five gaps found, in the order they bite — each field below names the consumer
that would read it, since a field without a reader is weight, not capability:

1. **Bundling** — one utterance, several acts ("Hello, I'm Sam, and I was
   furious about the letter"). One kind per object breaks on the second
   scenario we named. Repair: an utterance yields a small ordered bundle of
   objects, or one object holding several acts. Reader: Planner, Session.
2. **Stream role** — opens / answers / continues / corrects / closes /
   digresses. A fragment ("Furious.") is only interpretable against the
   pending question, and the repeated greeting is partly an opener in a
   non-opening slot. This is why the unit must consult Session: kind can be
   text-local, stream role cannot. Reader: Coherence.
3. **Grounding status** — per entity: established in the stream, established
   in the situation, new, or *ungrounded*. "The table" in "Is the table
   cold?" is not unexpressed content; it is a definite reference with no
   referent — the failure shape the situation response ("What are you
   talking about?") is made of. Reader: Coherence.
4. **Force distinct from form, and ritual marking** — "Can you pass the
   salt?" is interrogative in form, a request in force; "How are you?" at
   an opening is ritual, and its ritual answer ("Fine, thanks.") must be
   recorded *as ritual*, not banked as a wellbeing report. Reader: Planner,
   Session.
5. **Attribution and speaker commitment** — asserted / supposed / wondered /
   reported-by-another. "I think the soup is hot" must not enter the record
   as "the soup is hot"; "She said he's furious" is her claim, not the
   speaker's. Reader: Session, the harborer discipline.

Known limit, not a gap to close by adding a field: irony ("Great, just
great.") — the designed answer is competing candidate objects under the
confidence field, not detection.

## Sketch of the object (Kavi's draft, 2026-11-16 — for the owner's ruling, not settled)

Owner's direction for the sketch: use the Five Elements in the object too,
for all kinds of things like emotion, time of day, etc.; and the object can
have an order tree or graph to it so that it retains coherence.

- **Identity & provenance** — id, turn, who produced it, the surface text and
  its token resolutions; supersedes / superseded-by links.
- **Act** — kind, with form and force distinguished; ritual marker; stream
  role; bundle position when the utterance carries several acts.
- **Content graph** (the order graph) — predications, entities and qualities
  as a graph in their discourse order, with the connective relations among
  parts. **Holes are nodes**: an unexpressed cause/object/referent is an
  explicit typed node in the graph, so Coherence reads the structure and
  finds the holes rather than re-deriving them. Each entity node carries its
  grounding status; each predication carries attribution and commitment.
- **Aspect classifications — the Five Elements face.** Classification
  attaches to ASPECTS of the object, never to the object wholesale (the
  standing classification rule): each classifiable aspect — the emotion
  aspect, the temporal aspect (time of day, season, when the content is
  set), domain and quality aspects — carries {element, tier, confidence,
  source} from the existing Classification table and correspondence
  machinery. The aspects roll up into a **composition**: a ranked
  predominance list, the same format as a disposition. Three compositions
  then exist in comparable form — the object's, the situation's (season /
  daypart), and the system's disposition — and coherence among them
  (resonance, control-cycle tension) becomes computable rather than judged.
- **Retention rule (owner, 2026-11-16): classification never replaces the
  value.** Every aspect records the concrete value AND its classification,
  side by side: the emotion as named (anger), the time as read (3:50PM, the
  day, the year). The elemental reading is a lossy layer over a lossless
  record; the object keeps both, each labelled.
- **Emotion and desire aspects use 七情六欲 (qīqíng liùyù, "seven emotions
  and six desires")** (owner, 2026-11-16), the traditional framework. The
  seven emotions and their phase correspondences (the 五志 wǔzhì core):
  喜 (xǐ, joy) → Fire · 怒 (nù, anger) → **Wood** · 思 (sī, pensiveness) →
  Earth · 悲 (bēi, grief) → Metal · 憂 (yōu, worry) → Metal · 恐 (kǒng,
  fear) → Water · 驚 (jīng, fright) → unsettled in the tradition (it
  scatters the qi; sources differ) — recorded as the edge it is, not forced.
  (Correction logged: Kavi's sketch example said fury → Fire; anger is
  Wood, 肝 (gān, the liver). Joy is Fire's emotion.) The six desires are
  cravings of the six senses — eyes, ears, nose, tongue, body, mind — and
  classify through the attested orifice correspondences: eyes → Wood
  (liver), tongue → Fire (heart), mouth → Earth (spleen), nose → Metal
  (lung), ears → Water (kidney); mind's correspondence is the unsettled
  one of that set.
- **Assessment standing** — confidence overall and per part; competing
  candidate objects where the assessment is ambiguous; what the object is
  owed (an answer, an acknowledgment) and which of its holes stay pending.
- **Across the stream, objects form a graph too**: an answer object links to
  the hole it fills, a correction supersedes, an elaboration attaches. The
  conversation's coherence is retained by that graph, not by any single
  object.

What stays out, by the standing rule: wording and anything medium-specific —
the object must remain renderable as language now, image or video later.

## Code design — creates, carries, reads (Kavi's draft, 2026-11-16 — for the owner's ruling)

One sentence: **an object is created once, travels by reference through the
turn, accumulates signed annotations from the units that process it, and is
stored by Session as a node in the stream's graph of objects.**

### Creates — two sites

1. **SemanticAssessment** (`assess(parsed, sessionView) → SemanticObject[]`,
   living here in `ai-system/lpu/semantic-assessment/`; today the judgement
   is scattered through `src/fork/turn.ts`). A bundle out, because one
   utterance can carry several acts. Its steps reuse machinery that already
   exists, gathered into one recorded answer:
   - *kind* — from the parse shape, the sentence layer's discourse features
     and the mood Token recorded;
   - *holes* — from the valency/gap computation the turn loop already runs
     (a missing role becomes a typed hole node in the content graph);
   - *grounding* — each entity checked against the session view (entities
     and topics already recorded): established / new / ungrounded;
   - *stream role* — against the session view's pending state (an open
     question makes this object its answer; a repeated opening act is an
     opener out of place);
   - *aspects* — classified through the OntologyCore (below);
   - *composition* — the aspects rolled up into the ranked predominance
     list, the disposition format.
2. **The Planner** creates **reply objects** — the same type, kind
   *reply-intent*, authored by the system. The Verbalizer reads a reply
   object and renders it; it does not author objects.

### Carries

- The turn loop passes the object by reference from stage to stage; the
  loop's flow becomes the object's itinerary (and the trace's mapPath gains
  `lpu/semantic-assessment`).
- **The trail:** each unit that processes the object appends a *signed
  annotation* (unit, verdict, price, note) to the object's trail. The
  object stays the speaker's; the trail is the system's, every entry
  attributed — the provenance discipline applied to processing.
- **Session stores objects** as its Events: the stream becomes a graph of
  objects linked by *fills* (an answer fills a hole), *supersedes* (a
  correction), *answers*, *elaborates*. The session's existing supersession
  deltas become link records between objects.
- The trace records the object's id and kind per turn.

### Reads

| Reader | Reads | Writes |
| :--- | :--- | :--- |
| CoherenceAnalysis | act, holes, grounding, stream role, composition, the stream graph | fit/demand annotations on the trail |
| Planner | kind, holes, coherence annotations, disposition | the reply object |
| Derivation | the content graph (via the object) | derivation results, priced, on the trail |
| Session | the whole object | storage, links, standing updates |
| Verbalizer | the reply object only | surface text (no object) |
| LEDU (outbound) | a reply object's emotion/desire aspects | wording choices for the Generator |

### How it uses the OntologyCore

| Consumer | Core piece | When | The call in today's terms |
| :--- | :--- | :--- | :--- |
| SemanticAssessment | OKU — Classification table | at creation, per classifiable aspect (quality, domain, temporal) | `classify(concept, aspect)` → {element, tier, confidence, source} (`src/fork/classify.ts`) |
| SemanticAssessment, via LEDU | EDU — the 七情六欲 framework | at creation, for emotion/desire aspects | LEDU maps the language expression → EDU names the emotion/desire and its correspondences |
| SemanticAssessment, via the Senses-Scening Unit | SenseUnit — the channel framework （六根/六塵 channels, Xunzi discriminations, Suwen phase rows in the OKU) | at creation, for the object's `senses` face and its scene | the Senses-Scening Unit maps sensory words → the SenseUnit names the channel/discrimination and the OKU files the phase where one exists |
| Derivation | OKU — Correspondence graph | when the Planner's question needs a path | the cycle walks Derivation already runs, now addressed through the object |
| CoherenceAnalysis | OKU — Correspondence graph | comparing compositions (object × situation × disposition) | relation between two phases: generating / controlling / same / none |
| Planner | OKU — both | move selection and pricing, as today | unchanged machinery, object-addressed |

**Settled (owner, 2026-11-16): the EDU's correspondence data lives in the
OKU.** The classification table already carries emotion entries (anger →
Wood is one); the EDU is the specialist authority that interprets the
emotion/desire slice of the core: the OKU holds, the EDU speaks for its
domain.

**The larger-graph question (owner, 2026-11-16) — Kavi's position, for
ruling:** the EDU makes use of the OKU's whole correspondence graph, not
only its own slice. Its *authority* is its slice (it names emotions and
desires and their filed correspondences — a lookup). Its *reach* is the
graph: from an emotion's phase it can walk — what generates that phase,
what it generates, what controls it, what it controls, and the cross-domain
correspondences (phase → season, direction, flavour, organ, sense). The
type specimen is classical: the Suwen's emotion counteractions
（情志相勝， qíngzhì xiāngshèng) are the controlling cycle read through the
emotions — grief (Metal) overcomes anger (Wood), anger overcomes
pensiveness (Earth), pensiveness overcomes fear (Water), fear overcomes
joy (Fire), joy overcomes worry (Metal). None of those are filed *in* the
emotion entries; they exist only as walks on the larger graph. The guard:
a walked consequence is a *relation with a tier* (B-derived), reported as
such and annotated — never an edit to the filed data, and never by itself a
claim about a person; Coherence and the Planner price what a relation is
worth in the situation. Without the reach, the EDU would be a lookup table
with a name — the classification table already does lookup.

### Migration slices — ALL BUILT 2026-11-17 (owner's commission: "build everything, 1–4 and this too")

1. Shadow objects — `semantic-object.ts` + `assess.ts`, suite gate
   `test/fork-semantic-object.test.ts`.
2. First readers — `coherence.ts` (inbound) + the Planner's two
   readings in the turn loop; gate `test/fork-coherence.test.ts`.
3. Aspect wiring — `edu.ts`, `ledu.ts`, aspects + compositions at
   creation, composition comparisons; gate `test/fork-aspects.test.ts`.
   The EDU's larger-graph reach (the owner's "this too") —
   `edu-reach.ts`; gate `test/fork-edu-reach.test.ts`.
4. Reply objects — `reply.ts` + the outbound analysis; the Planner
   authors a reply object at every graph-composed speaking site;
   gate `test/fork-reply-object.test.ts`.

### Migration slices (the original build order, as drafted)

1. **Shadow objects** — the type + `assess()` for the kinds the loop already
   distinguishes (statement, question, correction, topic-proposal,
   reason-query); objects created, trailed, stored and traced; *nothing
   reads them yet*, behaviour unchanged. Gate: traces show the objects; the
   suite stays green.
2. **First readers** — Coherence annotations + the Planner read objects for
   the two designed scenarios (the greeting; the feeling-statement with its
   missing cause). This is where the greeting trace becomes buildable.
3. **Aspect wiring** — OKU classification and the LEDU→EDU call join
   creation; compositions computed and compared.
4. **Reply objects** — the Planner authors them; the Verbalizer consumes
   them; outbound coherence judges the object before wording.
