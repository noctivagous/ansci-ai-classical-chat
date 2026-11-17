# SemanticAssessment

- **Schematic address:** `lpu/semantic-assessment`
- **Type:** Unit
- **State:** placeholder — **0% completed to goal** (set by us, assessed by the project, not measured or computed)

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
