# AnSci — the gaps, in one file

Compiled 2026-11-18 at the user's direction: every known gap in the
project, in one place, at the root of the repo. Each gap is located
(where it lives), evidenced (how we know), and named with what would
close it. A gap here is a located gap — a place to work — not a
verdict on the project. Statuses are as of the date above; when a
gap closes, strike it here in the same commit that closes it.

The summary that prompted this file, from the anchor-expansion
recap: the coverage slices "widen what the classification machinery
reaches; they don't deepen what it knows." The gaps below are the
depth that widening does not buy.

## 1. World knowledge

- **No everyday commonsense in the system's own graph.** WordNet —
  the bundled lexical layer — has no `UsedFor`, `Causes`,
  `AtLocation`, `HasProperty` knowledge: nothing about what things
  are for, what they cause, or where they belong. The system can
  classify a kettle and say nothing about what a kettle does.
  *Evidence:* WordNet's relation inventory, recorded 2026-11-08.
  *Closes when:* §2 below is resolved — deliberately, not by
  importing a commonsense net as the foundation.
- **CSKG is a feeder, not yet a source of answers.** The trimmed
  CSKG bundle (80,466 edges) ships in the repo and the feeder maps
  21 relations, but the reply programme consulting CSKG at answer
  time is a separate step that has never been taken (decision
  recorded 2026-11-17: bundle = data availability, not reply
  integration). The feeder also drops every triple whose endpoints
  do not classify (`unclassified-endpoint`) — so CSKG's usable
  reach is capped by the same classification gap as §3.
  *Closes when:* a named need commissions reply-side consultation,
  and as classification coverage (§3) grows.
- **Other intakes are empty.** Model intake, web intake and
  Wikidata intake stand at 0% on the system map; the router is at
  30%. Nothing comes into the system except its shipped bundles and
  the classical-text ingests.
  *Closes when:* an intake is commissioned for a named purpose.

## 2. Conversation

- **There is no social layer.** A free-conversation probe
  (2026-11-16, 16 ordinary visitor inputs through the real turn
  loop) found: "Hello." → "Noted. What happened next?"; "How are
  you?" → decline; "Who are you?" / "What can you do?" → decline or
  parse failure; "The cat sat on the mat." attributed to the
  speaker. What exists is a derivation engine, a narrow
  quality-question answerer, and one emotion-statement steering
  routine. The surface is a parser demonstrator, not a chat.
  *Closes when:* a conversational layer is designed and built as
  its own programme — greetings, identity, thanks, leave-taking,
  and statements that are not about the speaker.
- **No Social Unit.** The conversational layer above has no home
  in the architecture. The user's placement (2026-11-18): a Social
  Unit *inside the Awareness Unit*, alongside self, surroundings
  and current-activity — awareness of the interlocutor as a social
  presence, not only as a source of statements. Conversation lives
  inside the Social Unit: greeting and leave-taking, identity and
  capabilities as socially presented, thanks, acknowledgement,
  turn-taking. And the Social Unit holds **the Interlocutor**
  (user's direction, 2026-11-18): the system's standing picture
  of the person it is talking with — identity known or unknown,
  first contact or returning, and the accumulating picture the
  conversation itself forms. That picture exists on the map today
  only as `awareness/surroundings/interlocutor-standing`, a
  Register at 10% whose current code is recorded as "almost
  none"; under this placement it moves into the Social Unit and
  is built there. Placement of the unit is the user's direction,
  stated as "might be inside Awareness" — to be confirmed when
  the unit is designed; the Interlocutor's inclusion in it is
  settled.
  *Closes when:* the Social Unit is designed (its contents, its
  seam with the turn loop and the reply planner, what it may and
  may not originate) and placed on the system map.
- **The situated self is mostly unbuilt.** On the system map:
  Awareness 35% (self 15%, identity and capabilities 0%),
  Session & Situation's open-unknowns 50%, Coherence as a whole 0%
  as a container with Coherence Analysis at 60% (the fuller
  mid-stream judgements, degree levels and boundary specifics of
  the coherence note are still to build), Verbalizer 40%, chat
  surface 45%. The reply-planning programme (R0–R7.5) is built;
  what it plans *with* — a standing picture of the situation and
  the person — is thin.
  *Closes when:* those units are built in their own slices; the
  map's percentages are the tracker.

## 3. Classification coverage (measured 2026-11-18)

Measured over 2,841 content tokens (holdout + test suite +
500-object vocabulary) with the system's own machinery. Full
report: the coverage measurement of 2026-11-18.

- **B — synset, no anchor: 2,127 tokens (74.9%).** The anchor
  inventory is 161 concrete correspondence exemplars plus one
  climb-only anchor; there are no category anchors, and zero B
  tokens have an anchor anywhere within 25 hops of ancestry.
  *Being worked:* the four accepted slices (A animal pilot on
  P2 CREATURE_CLASS_YUELING_V1 → B stuff categories,
  registered-rules only → C recognised-but-unclassified →
  D per-word overlay mappings), each separately commissioned.
  Slice A is at design stage in the fork chat.
- **Sense correctness inside "works" is unproven.** A token that
  climbs to one anchor counts as working whether or not that is
  the sense a sentence meant. The measurable proxy (bucket C,
  divergent anchored senses) is small — 9 tokens — but no gold
  sense labels exist to audit the rest.
  *Closes when:* a labelled sense sample exists and is judged.
- **Verbs earn no semantic classification from the climb.** 202
  measured tokens are verb-parse-only: they parse, and the climb
  (nouns/adjectives only, by design) says nothing about them.
  Verb classification waits on the classification programme, not
  on the dictionary.

## 4. Slice A's own located gaps (design, 2026-11-18)

From the Slice A design (class-level climb stop), which honestly
reaches 82 of its 95 measured animal tokens:

- **No P2 leg:** amphibian, arachnid, worm and cnidarian classes
  have no creature-class stop in P2 as registered — 13 of the 95
  tokens are unreached, including silkworm and centipede
  (taxonomy-shape gaps: their WordNet ancestry does not pass a
  class the design may stop at).
- **Class assignment is correlative, not anatomical.** Early
  Chinese glossaries (Erya, Shuowen jiezi) placed aquatic animals
  by habitat and general form, with fluid boundaries between
  魚 (yú, "fish") and 蟲 (chóng, "creatures / invertebrates");
  scalelessness never disqualified a fish. Any mechanical
  creature-class assignment that keys on anatomical features
  (scales, fur) imports a scientific criterion the tradition did
  not use. The design's assignment routes must be judged against
  the tradition's own method — kind recognised by habitat and
  form, class assigned correlatively.
  *Closes when:* the fork chat's design, as corrected on this
  point, is accepted and its named gaps are ruled on or left T5
  as located gaps for a future ruling.

## 5. Parser depth (the depth programme's residue)

Baseline: holdout feature preservation 96.3% vs the 95% bar —
negation preservation 84.4% against its 90% per-family floor.

- **Negation (F1).** Chinese preverbal negation (不 / 没) is
  dropped at parse: no negation atom in G0, invisible to
  preservation and to the checker. Recorded as open and small;
  not yet fixed. English negation preservation is the family's
  weakest at baseline.
- **Constructions.** 12 of the 80 holdout sentences still do not
  parse (copular wh-questions, contractions, fragments among
  them); the generator throws on 2 of 68 parsed holdout
  sentences, counted as full loss.
- **Aspect.** Built to 90% on the map (feature bundles, irregular
  forms selected, both languages), from a two-value state; the
  recorded residue is in the aspect challenge set
  (docs/fork/aspect-challenge.md) rather than closed outright.
- **Sense selection.** The coherence-based sense unit stands at
  70%: within a sentence it arbitrates, but the preregistered
  H3a/H3b sense experiment remains gated on its materials and
  judges — the elemental priority order (Water > Fire > Metal >
  Wood, with Earth as base) is an axiom under test, not a
  theorem, and it has no discourse-bearing test set yet:
  single sentences carry no discourse, and in the desk
  evaluation every coherence win was decided by the collocation
  (Earth) layer, none by the elemental machinery itself.
- **Valency residue.** Stage 1 closed the original blindness
  (FrameNet signatures, then VerbNet shapes for the verbs
  FrameNet misses: 4,135 of 11,604 verb lemmas checkable). What
  remains, stated in the VerbNet placeholder: no sense
  disambiguation (a lemma's shapes are the union of its classes,
  so the check fires only on excess beyond *all* classes), no
  obligations (fewer arguments than a frame allows is never
  flagged), lexicalised frames excluded, and VerbNet's own sense
  splits can flag ordinary English (the "ferment" case).

## 6. Lexical and token layer

- **Adverbs are absent from the extract.** The WordNet extract
  was trimmed to n/v/a; an adverb token (usually, indoors) has
  no synset in the shipped data even though full WordNet has it.
- **Inflection gaps in the forms index.** Regular pasts the index
  does not list (happened → happen) do not resolve through the
  surface lookup, though wordnet-lex's morphology fallback can
  catch some in the parser path.
- **Multiword thinness.** Of 185 genuinely multiword object
  phrases in the 500-object sample, only 60 are single WordNet
  lemmas; the rest resolve word-by-word at best.
- **Token resolution is Node-only.** The browser build cannot
  read the data files (filesystem stubbed), so SymSpell
  resolution and the Variant Graph do not run there. Token's own
  placeholder also records: the error model is distance +
  frequency, not yet calibrated from the Variant Graph's
  attested pairs; confirmed resolutions are not yet banked back.
- **Variant Graph at 45%.** 4,200 edges populated and consulted;
  what remains is the banking loop above.

## 7. Evidence and evaluation

- **No sealed expected graphs.** G0 correctness is still measured
  only by the checker proxy; the sealed-set tooling exists
  (WP2), the sealed expected graphs do not.
- **The evidence is evaluator-shaped.** Probes and benchmarks
  were designed and scored inside this loop; precision has been
  measured against ratified thresholds on the classification
  programme, but there has been no native-speaker judgment on the
  Chinese side, and the human-judged sense benchmark waits on
  judges this loop cannot supply.
- **Correctness bars are policy, not yet proof at scale.** The
  ratified rule — bars never drop as density scales, the evidence
  burden rises — has been applied at 100- and 500-object scale,
  not beyond it.

## 8. Standing decisions this file does not settle

- Slice A build: not commissioned — design first, in the fork
  chat, including rulings on the §4 gaps.
- Slices B, C, D: accepted in shape and order (2026-11-18), each
  awaiting its own commission.
- CSKG reply integration (§1): not taken.
- Push of this file: the word was given on 2026-11-18, with the
  tree appendix below.

## Appendix — the gaps as a tree, with task lists

```
AnSci — GAPS
│
├─ 1. World knowledge
│   ├─ [ ] Give the system's own graph everyday commonsense
│   │      (UsedFor / Causes / AtLocation — WordNet has none)
│   ├─ [ ] Take the CSKG reply-integration decision
│   │      (feeder ships 80,466 edges; replies never consult it;
│   │       its reach is capped by unclassified-endpoint drops)
│   └─ [ ] Commission an intake for a named purpose, or leave at 0%
│          (model · web · Wikidata intakes all 0%, router 30%)
│
├─ 2. Conversation
│   ├─ [ ] Build the social layer the probe found absent
│   │      (Hello → "Noted. What happened next?"; How are you? → decline)
│   ├─ [ ] Design the SOCIAL UNIT — inside Awareness (user placement)
│   │   ├─ [ ] Contents: greeting / leave-taking · identity as presented
│   │   │        thanks · acknowledgement · turn-taking
│   │   ├─ [ ] Hold conversation inside it
│   │   ├─ [ ] Hold the Interlocutor: interlocutor-standing moves here
│   │   │        from surroundings (Register, 10%, code "almost none") —
│   │   │        identity known/unknown, first contact or returning,
│   │   │        the picture the conversation itself accumulates
│   │   ├─ [ ] Define its seam with the turn loop and reply planner
│   │   └─ [ ] Place it on the system map; confirm Awareness placement
│   └─ [ ] Build out the situated self the planner plans with
│          (Awareness 35% · self 15% · identity/capabilities 0% ·
│           Coherence fuller levels unbuilt · Verbalizer 40%)
│
├─ 3. Classification coverage  (measured 2026-11-18)
│   ├─ [ ] Slice A — animal pilot, class-level climb stop (in design)
│   ├─ [ ] Slice B — stuff categories, registered-rules only
│   ├─ [ ] Slice C — recognised-but-unclassified climb outcome
│   ├─ [ ] Slice D — per-word overlay mappings, sized after A–C
│   ├─ [ ] Create a gold sense sample so "works" can be audited
│   │      (correctness inside D is currently unproven)
│   └─ [ ] Give verbs a classification route
│          (202 tokens parse-only; the climb is nouns/adjectives only)
│
├─ 4. Slice A's own located gaps
│   ├─ [ ] Rule on the classes with no P2 leg, or leave T5
│   │      (amphibian · arachnid · worm · cnidarian — 13 of 95 tokens)
│   ├─ [ ] Fix the taxonomy-shape gaps (silkworm · centipede)
│   └─ [ ] Judge class assignment by the tradition's own method
│          (Erya / Shuowen: habitat + form, correlative —
│           never anatomical; fish/creature boundaries are fluid)
│
├─ 5. Parser depth
│   ├─ [ ] F1 — stop dropping Chinese preverbal negation
│   │      (negation preservation 84.4% vs its 90% floor)
│   ├─ [ ] Close the construction residue (12 of 80 holdout sentences)
│   ├─ [ ] Stop the generator throwing on 2 of 68 parsed sentences
│   ├─ [ ] Finish aspect per the challenge set (unit at 90%)
│   ├─ [ ] Run the H3 sense experiment — needs materials + judges
│   │      (priority order is an axiom under test, no discourse test set)
│   └─ [ ] Valency residue: sense-split the union-of-classes check,
│          add obligations, admit lexicalised frames (ferment case)
│
├─ 6. Lexical and token layer
│   ├─ [ ] Restore adverbs (extract trimmed to n/v/a — usually, indoors)
│   ├─ [ ] Close forms-index inflection gaps (happened → happen)
│   ├─ [ ] Multiword coverage (only 60 of 185 object phrases are lemmas)
│   ├─ [ ] Make token resolution work in the browser build (Node-only now)
│   ├─ [ ] Calibrate the error model from attested variant pairs
│   └─ [ ] Bank confirmed resolutions back (Variant Graph at 45%)
│
├─ 7. Evidence and evaluation
│   ├─ [ ] Produce sealed expected graphs (G0 still rests on checker proxy)
│   ├─ [ ] Get judgment from outside this loop (evaluator-shaped evidence)
│   ├─ [ ] Get native-speaker judgment on the Chinese side
│   └─ [ ] Prove the correctness bars at beyond-500 scale
│          (bars never drop as density scales — applied, not yet proven)
│
└─ 8. Standing decisions (not gaps — decisions owed)
    ├─ [ ] Commission the Slice A build (design first, fork chat)
    ├─ [ ] Commission slices B, C, D in turn
    ├─ [ ] Decide CSKG reply integration (see §1)
    └─ [x] Give the word to push GAPS.md itself (given 2026-11-18)
```
