# AnSci — the gaps, in one file

Compiled 2026-11-18 at the user's direction: every known gap in the
project, in one place, at the root of the repo. Each gap is located
(where it lives), evidenced (how we know), and named with what would
close it. A gap here is a located gap — a place to work — not a
verdict on the project. Statuses are as of the date above; when a
gap closes, strike it here in the same commit that closes it.

Findings applied 2026-11-18: the chatbot-era survey and the sealed
probe harvest (§2, §7). The found-ahead candidates drafted in §2
were ruled on the same day: the three drafted gaps are gaps of
record; the ten undrafted aspects remain candidates in the
harvest record.

Finishing sweep completed 2026-11-18: every percentage re-checked
against the system map (all agree), the headline numbers
re-checked against the coverage report, the depth baseline and
the Slice A design (all agree), prose and tree appendix
reconciled item for item, and the stale statuses found were
corrected in place. A correction followed the same day: §5 had
been compiled from the depth programme's stage-0 baseline and
the sweep re-checked it against that same document; §5 is now
stated against the programme's final (stage-5) accounting, and
the items it had wrongly carried as open are struck there with
their closing evidence. The sweep's other checks stand.

A further pass the same day (2026-11-18, later) reconciles this
file with the work that landed after the sweep: the Social Unit
programme (S1–S6) and the classification slices A–D were built
and pushed, and their items are struck or re-stated below with
their closing evidence; and the lexicon-state family of §5
(probe-poisoning and its three recorded faces) was fixed and is
struck there. Items the later work did not touch stand as the
sweep left them.

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
  *Closes when:* the system's own graph grows this knowledge
  deliberately — not by importing a commonsense net as the
  foundation. (The CSKG item below is the nearest feeder
  question; it does not close this one.)
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

- ~~**There is no social layer.**~~ **Closed 2026-11-18** by
  the Social Unit programme (below): designed against the
  GAPS §2 checklist and built in slices S1–S6, pushed to main
  (`67341f9`). The 2026-11-16 probe's findings are the record
  of what it replaced: "Hello." → "Noted. What happened
  next?"; "How are you?" → decline; "Who are you?" / "What
  can you do?" → decline or parse failure; "The cat sat on
  the mat." attributed to the speaker. What the programme
  built is the conversational layer this item asked for —
  greetings, identity, thanks, leave-taking as social moves,
  self-answers from the Self tables, clarification, the
  premise stance, and the Interlocutor's picture. What
  remains of the item is its acceptance evidence: the sealed
  probe set (next-but-one item) is still unrun, and that run
  is the owner's to commission.
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
  conversation itself forms. That picture existed on the map
  only as `awareness/surroundings/interlocutor-standing`, a
  Register at 10% whose current code is recorded as "almost
  none"; under this placement it moves into the Social Unit and
  is built there. Placement of the unit is the user's direction,
  stated as "might be inside Awareness" — to be confirmed when
  the unit is designed; the Interlocutor's inclusion in it is
  settled.
  *Status (2026-11-18):* placed on the system map — the Social
  Unit stands inside Awareness holding the Interlocutor (the
  register, moved from Surroundings, at its new address
  `awareness/social-unit/interlocutor`) and Conversation; the
  map's correspondence check passes (82 nodes). What remains of
  this item is the design itself and the confirmation of the
  Awareness placement at design time.
  *Closes when:* the Social Unit is designed (its contents, its
  seam with the turn loop and the reply planner, what it may and
  may not originate) and placed on the system map.
  *Status (2026-11-18, later):* **the closes-condition is
  met.** The design was delivered and its five decisions ruled
  as recommended — placement inside Awareness confirmed
  (ruling 1a), self-facts requested from the Self tables (2a),
  support-free sense ties routed to clarification (3a),
  Coherence supplying the contradiction degree (4a),
  Interlocutor persistence identity-keyed (5a, timing later
  superseded by the owner's direct commission). The unit was
  then built in slices S1–S6 under a sequence authorization
  and pushed to main; on the map the Social Unit stands at
  95%, the Interlocutor at 75%, Conversation at 70%.
  *Probe coverage note (2026-11-18):* the sealed probe set (next
  item) carries probes for most of this unit's contents, but of
  the Interlocutor's parts, "first contact or returning" is the
  one no harvested probe evidences — a run of the set cannot
  strike it. The unit's seam and its placement are design items
  no probe can evidence at all.
- **Conversation now has assessment material — sealed, unrun.**
  A survey of late-2010s–2021 chatbot evaluation (2026-11-18)
  yielded an inventory of 40 assessment aspects in 12 groups;
  from its shortlist, 128 probes were harvested (DailyDialog 35,
  EmpatheticDialogues 32, Persona-Chat/ConvAI2 28,
  BlendedSkillTalk 18, Wizard of Wikipedia Test Unseen 15), each
  with an expected-behaviour note written in this project's terms
  before any run. The set is sealed (sha256 `d77c072f…6a1`),
  held outside the repo at `~/workspace/ansci-sealed-probes/`,
  and is not to be read by whoever designs or builds the Social
  Unit. What was taken from that era is its *tests and aspects
  only* — no designs, no response styles, and none of its success
  criteria (its specificity scores would count a located decline
  as a generic failure; that judgement is the era's, not ours).
  FED and Bot-Adversarial Dialogue were excluded, their licences
  unverifiable from the sources' own documentation; adversarial
  pressure is covered only by DailyDialog items.
  *Closes when:* nothing here closes by itself — the set is run
  only on the owner's commission, and its report is read against
  this section's checklist (the tree appendix).
  *Note (2026-11-18, later):* still unrun. One confound the run
  would have faced is now removed: the parser's lexicon-state
  family (§5) made a sentence's parse depend on what the same
  process had parsed before it, which over 128 sequential
  probes would have made results uninterpretable; that family
  is closed.
- **Found ahead of the checklist — gaps of record (accepted
  2026-11-18).** 18 of the sealed probes test things this
  section did not name. They cluster where conversation meets
  testimony, not in the social layer. Three were drafted in this
  file's form and accepted by the owner as gaps of record:
  - *Grounding in conversation.* When a reply draws on knowledge
    the system was given or holds, nothing keeps what it says
    tied to that knowledge: the era tested this as
    using-provided-knowledge (10 found-ahead probes), correctness
    / not making things up (6), and grounding on unseen topics
    (6). In this project's terms: testimony discipline is
    enforced for graph answers and has no conversational form.
    *Closes when:* a reply's use of provided or held knowledge
    is checkable against its source, in conversation as it is
    for derivation.
    *Status (2026-11-18, later):* still open in its general
    form. The premise stance (below) and the record-first
    answers cover the cases where the system's own record or
    graph supplies the ground; a general conversational form
    of testimony discipline — any reply's use of provided
    knowledge checkable against its source — has not been
    built as such.
  - *Clarification behaviour.* The decline discipline locates a
    gap and stops; nothing in the conversation layer asks the
    interlocutor what was meant instead of guessing or stopping
    (6 found-ahead probes; the survey flags this as an aspect
    the era itself under-assessed). *Closes when:*
    asking-for-clarification exists as a designed move, distinct
    from a decline, with its own conditions.
    *Status (2026-11-18, later):* **closed** by Social Unit
    slice S4 (pushed in `67341f9`): the clarification move
    exists with its own conditions — the addressability test,
    four trigger classes, one question per turn, candidates
    offered, at most two attempts per point, then a stated
    fallback reading.
  - *False-premise inputs.* No designed stance exists toward a
    partner who asserts something false and invites agreement
    (2 probes). Agreement would break testimony discipline; flat
    contradiction is not a social move either. *Closes when:*
    the response to a false premise is a designed behaviour, not
    an accident of the parser.
    *Status (2026-11-18, later):* **closed** by Social Unit
    slice S5 (pushed in `67341f9`): on a contradiction degree
    from Coherence, the stance states the established ground,
    re-offers the question under it, and on insistence answers
    under supposition framing without adopting the premise;
    the disagreement is recorded.
  - *Also found ahead, not drafted:* relevance / maintaining
    context (5 probes), informativeness (5), error recovery (2),
    question-asking balance (2), recognising the interlocutor's
    feeling (1), topic shifting (1), understandability (1),
    whole-conversation coherence (1), nonsense inputs (1),
    adversarial provocation (1). These remain candidates in the
    harvest record (`HARVEST.md` in the sealed set's folder),
    not gaps of record.
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
  *Status (2026-11-18, later):* partly answered by the Social
  Unit programme: identity and capabilities stand at 75%
  (S3's tables, requested by the unit, never copied), the
  self container at 25%, and the person-side picture exists
  as the Interlocutor (75%) with Conversation at 70%. What
  remains open in this item is unchanged in kind: Coherence's
  fuller degree levels and boundary specifics (S5 consumed
  the contradiction degree only), Session & Situation's
  open-unknowns, and the Verbalizer.

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
  Slice A's design was presented and corrected in the fork chat;
  its five decisions were ruled on 2026-11-18, all as recommended
  (§4), and the build is commissioned there.
  *Status (2026-11-18, later):* **all four slices built and
  pushed** in the five-batch merge (`e6f14ab`). On the same
  instrument and population, Slice A alone moved D from 432
  (15.2%) to 517 (18.2%), all of it in the climb sub-kind;
  Slice C's split of the post-B remainder reads B-recognised
  343 / B-unknown 1,767, and the merged tree's sense census
  stands at 729 / 183 / 64 (≥3-sense lemmas with any / ≥2 /
  distinct-element candidates). The B bucket is therefore
  much reduced but not empty: what remains in it is the
  B-unknown population, addressed per-word only where a
  defensible rationale exists (Slice D batch 1 banked 29;
  its remaining population takes its own commission). The
  two items below — the gold sense sample and the verb
  route — are untouched by the slices and stand open.
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
  *Status (2026-11-18, later):* Slice A was built and pushed
  with the stops and exclusions as ruled; under ruling 3 these
  classes **stay T5 as located gaps for a future ruling** —
  the item stands open in exactly that form, not as unworked
  build scope.
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
  *Status (2026-11-18):* the correction is in the design — the
  catfish caveat is gone (a scaleless fish is simply a fish; no
  stop or audit step feature-checks anatomy), and the cetacean
  exclusion is re-grounded on kind-membership rather than bare
  skin. The design's five decisions were ruled on 2026-11-18,
  all as recommended: (1) taxonomy stops, id-keyed, with
  exclusion records, certified by the audit; (2) class pricing
  flat at the P2 cap, 0.80, hops recorded, walk bounded at 6;
  (3) the classes P2 does not name stay T5, located gaps for a
  future ruling; (4) the mammal stop ships with the human and
  cetacean exclusions as data from day one; (5) the mollusk
  stop's shape is the build audit's to choose between the two
  pre-approved shapes. The build is commissioned in the fork
  chat.
  *Status (2026-11-18, later):* the build landed as ruled —
  the audit's dump settled the mollusk shape (deeper stops at
  bivalve and gastropod; no mollusk stop), and the closes
  condition above is met: the corrected design was accepted,
  and its named gaps were ruled on or left T5 by the rulings
  themselves.

## 5. Parser depth (the depth programme's residue)

The depth programme (stages 0–5) is complete; its final
accounting is the stage-5 report. Frozen-holdout state: pooled
feature preservation 97.7–98.2% against the 95% bar (met);
parse rate 80/80; generation failures 0.

Correction (2026-11-18): this section as first compiled
presented the programme's stage-0 baseline as its current
state. The struck items below were already closed by stage 5
when this file was written; they are kept struck, with their
closing evidence, rather than deleted, so the error stays
visible in the record.

- ~~**Negation (F1).** Chinese preverbal negation (不 / 没)
  dropped at parse; negation preservation 84.4% against its
  90% floor.~~ **Closed by depth stage 5.** Negation is a
  structured state — the Water state with its Metal carrier,
  negator and carrier recorded, not a boolean flag; preverbal
  不/没 is consumed by the parser's main loop and the verbless
  branch, and 没有 expands to its two morphemes. The negation
  family preserves at 91.2% against the 90% floor, met by the
  ontology mechanism it was amended to require; the admission
  probe ran negator-correct 15/15 in both directions. F1's
  English twin (copula negation regenerating as the
  affirmative) was fixed in the same stage.
- ~~**Constructions and generator throws.** 12 of the 80
  holdout sentences unparsed; the generator throws on 2 of
  68.~~ **Closed by stage 5:** parse rate 80/80, generation
  failures 0. What remains is different in kind: the suppressed
  family is a declared ontology failure (66.7% on 3 atoms,
  F.5), its evidence carried by the demo's agentless-passive
  case.
- **Construction family — measured (2026-11-18).** A dedicated
  set (scripts/construction-family-challenge.tsv; report:
  docs/fork/construction-family-challenge.md) ran 41 core
  items, built to the eight branches that set
  `states.construction` (en imperative / existential /
  weather; zh ba / bei / correlative / a-not-a / serial),
  through the stage-5 instrument: recognition 41/41, family
  preservation **89.1% over 46 atoms** — the holdout's
  50%-on-2 superseded as evidence. Seven of the eight
  constructions preserve at 100%. The family's whole measured
  loss is the imperative defect stated next; one further core
  item's round trip crashed at reparse, also stated.
  *Re-run (2026-11-18, later), after the lexicon-state fix
  below:* **47/47 completed round trips at 100%** — every
  family at 100%, imperative 5/5 — and the instrument's
  failure list is down to two parse failures, both honest:
  the ba resultative 他把门关上 (pre-existing, unchanged)
  and the bei item below, which now fails as a located parse
  error instead of crashing. The set's imperative probe
  "Tell her about the garden.", documented in the set itself
  as not parsing in a cold process, now parses cold: its
  blocker was the "her" re-read, whose can-head test counted
  an entry-less default-classified item ("about" — §6's
  adverb hole wearing a "proper" classification) as evidence
  a noun phrase could follow; the test now requires an entry
  for that. The root — "about" carrying no preposition
  classification of its own — remains §6's item.
- ~~**Lexicon state: probe registration (probe-poisoning).**
  The WordNet provider registered every entry it derived —
  including entries derived by a mere probe, when the parser
  asked "could this word be a verb here?" and went on to use
  a different reading — and parse classification read the
  registry. A registered derived verb could displace the
  same surface's derived noun or adjective, so a word's
  classification depended on what the process had parsed
  before: "You are welcome." parses as a predication first
  and as "You welcome." second (found during Social Unit
  S2, recorded in its report; the Planner's thanks receipt
  was built around it). The three items below are this
  family's other faces.~~ **Closed 2026-11-18.** Two halves:
  in wordnet-lex.ts, derivation no longer registers —
  registration is adoption, through `registerDerivedEntry`,
  called only where a caller assigns the entry to an item,
  a node, or a clause root; in parse.ts, classification
  never takes a derived entry from the registry, re-deriving
  in the parser's fixed precedence, so classification is a
  function of the sentence and the shipped lexicon, never
  of parse history. One consumer had silently relied on the
  poisoning: the initiative scan excluded the S5 record
  arc's candidate state only because its lemma had been
  probe-registered as a verb; the fix there is at the turn
  layer — initiative now stands down on stance turns, whose
  replies are complete designed moves (the stance already
  restates the ground the candidate would volunteer).
  Evidence: `test/fork-lexicon-state.test.ts` (6 tests,
  including parse-twice stability), the construction-family
  re-run above, and the full gates in
  `docs/fork/lexicon-state-report.md`. Nobody outside this
  loop has checked the fix.
- ~~**Imperative construction state is single-use per
  process.** 0/5 on the new set: every imperative records
  the atom at parse and loses it at reparse, although the
  generated surface is the identical sentence. Parsing
  registers the sentence-initial word as a verb in the
  shared lexicon, and the imperative branch's signature
  requires that word to NOT be verb-classified — the branch
  consumes its own precondition. (Stage 5's lost holdout
  atom was this same case: "Tell me about winter.")~~
  **Closed 2026-11-18** by the lexicon-state fix above:
  classification no longer reads derived registrations, so
  the signature's precondition survives its own parse. The
  construction-family set reads imperative **5/5 at 100%**;
  "Tell me about winter." round-trips with its construction
  intact.
- ~~**Existential reparse crash on a mass-noun subject.**
  "There is snow in winter." parses, and generates its
  identical surface, which then fails to reparse in the
  instrument's process ("cannot parse existential subject")
  — the existential chunking is lexicon-state-sensitive,
  so under the instrument's accounting the item contributes
  no atoms at all.~~ **Closed 2026-11-18** by the same fix:
  "snow" is noun-classified on every parse, the generated
  existential reparses, and the family reads **8/8 at
  100%**.
- ~~**bei with an unattested verb crashes.** 猫被狗咬了 —
  its verb is not a ZH lexicon entry — throws a TypeError
  from the bei branch's unchecked dereference instead of
  failing as a parse error.~~ **Closed 2026-11-18:** the
  branch guards the missing entry and the sentence fails
  as a located parse error ("cannot parse bei passive of:
  猫被狗咬了 — the verb after 被 (bèi, "by") has no lexicon
  entry"), as this item's closes-condition required.
- **Aspect.** Aspect & Forms stands at 90% on the map (feature
  bundles, irregular forms selected, both languages) and the
  aspect family scored 100% on the stage-5 holdout; the
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
  (Earth) layer, none by the elemental machinery itself. The
  stage-5 verdict names the same wait in the wider programme:
  the H3 experiment's subjects, and the elemental-prior trial,
  which waits on verbs carrying classifications (§3).
- **Valency residue.** Stage 1 closed the original blindness
  (FrameNet signatures, then VerbNet shapes for the verbs
  FrameNet misses: 4,135 of 11,604 verb lemmas checkable). What
  remains, stated in the VerbNet placeholder: no sense
  disambiguation (a lemma's shapes are the union of its classes,
  so the check fires only on excess beyond *all* classes), no
  obligations (fewer arguments than a frame allows is never
  flagged), lexicalised frames excluded, and VerbNet's own sense
  splits can flag ordinary English (the "ferment" case).
- **Sealed-run divergences (from §7's expected-graph run,
  2026-11-18) — unadjudicated.** Against expectations authored
  blind and sealed before the run, G0 accuracy on the 20 scored
  holdout items is 76.1%. The divergences group into three
  shapes: (1) whole-root-predicate substitution — 3 items
  (H-004, H-047, H-070) carry 66 of the 99 divergences: the
  expected root predicate's whole bundle is absent and the
  subject/topic noun carries a predicate bundle instead (rain
  for flood, tea for food, people for take); (2) wh-question
  role/person shape — 3 items (H-007, H-008, H-012): the
  wh-word stands as agent, the pronoun's entity atom is lost,
  subjectPerson reads unmarked; (3) aspect-value shape — 5
  items: expected bounded/ongoing aspect atoms lost, `aspect =
  unmarked` added on the same predicate; with tense on
  did-questions contradicted past → present on 2 of them.
  Each is author expectation ≠ parser output; neither side is
  adjudicated here.
  *Closes when:* the shapes are adjudicated item by item
  against the design record — parser defect, author error, or
  a determination the record never made (§7) — and the parser
  defects among them are fixed or located as their own gaps.

## 6. Lexical and token layer

- **Adverbs are absent from the extract.** The WordNet extract
  was trimmed to n/v/a; an adverb token (usually, indoors) has
  no synset in the shipped data even though full WordNet has it.
- ~~**Inflection gaps in the forms index.** Regular pasts the
  index does not list (happened → happen) do not resolve through
  the surface lookup, though wordnet-lex's morphology fallback
  can catch some in the parser path.~~ **Closed 2026-11-18:**
  the surface lookup gained the regular-morphology fallback
  (stems accepted only when attested as lemmas; index-listed
  forms keep precedence); audit over the 2,841 measured tokens:
  18 gained resolution, 0 changed, 0 lost.
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

- ~~**No sealed expected graphs.** G0 correctness is still
  measured only by the checker proxy; the sealed-set tooling
  exists (WP2), the sealed expected graphs do not.~~ **Closed
  for the frozen holdout, with a recorded demotion
  (2026-11-18).** A sealed expected-graph set for the 80
  holdout sentences now exists (manifest
  `wp2-holdout80-g0-2026-11-18`, hash `f552b631…e1fc`, seals
  verified before the run), authored blind — from the sentences
  and the design documents, in a separate context, sealed
  before any run — and scored in one custodian run: **G0
  accuracy 76.1%** (194 of 255 expected atoms) beside **98.3%
  preservation** on the same items. The gap between the two
  numbers is the point of the instrument: the round trip is
  near-total while a quarter of G0's content diverges from
  independent expectation. *The demotion, stated plainly:* the
  author was an in-loop agent, not the independent human author
  WP2 specifies; the set is the approximated form (the stage-3
  construction set is the precedent), and WP2's
  independent-human benchmark remains open below. Scored pool:
  20 of 80 items — see the next item for why.
- **The design record underdetermines G0 for most of the
  holdout.** Of the 80 items, 53 were sealed as indeterminate:
  blind authoring from the documents capped at 25% of the
  corpus, because what G0 should be exists, at those places,
  only as parser behaviour. The named blockers: unslottable
  objects — what the graph does when a verb's object fits no
  FrameNet slot (~12 items); when-clause link type (5);
  feel + adjective complement shape (5); bare temporal
  adjuncts; time/season/location query shapes. A further 7
  items were exposed before authoring (named in the baseline
  and stage-5 records, or present in the tooling's own
  fixture), declared in the manifest and excluded.
  *Closes when:* the missing determinations are written into
  the design record — as design, not reverse-engineered from
  parser output — and a re-authored set scores a materially
  larger share of the corpus.
- **Sealed-run divergences, unadjudicated (§5's to settle).**
  The run's 99 non-preserved atoms group into shapes, the
  largest being whole-root-predicate substitution (3 items,
  66 divergences: the expected root predicate's bundle absent,
  a different node — in all three the subject/topic noun —
  carrying a predicate bundle instead), wh-question
  role/person shape (3 items), and aspect-value shape (5
  items: expected bounded/ongoing atoms lost, `unmarked`
  added). Each divergence is author expectation ≠ parser
  output; which side is wrong is not yet adjudicated. They are
  recorded as a located item in §5.
- **The evidence is evaluator-shaped.** Probes and benchmarks
  were designed and scored inside this loop; precision has been
  measured against ratified thresholds on the classification
  programme, but there has been no native-speaker judgment on the
  Chinese side, and the human-judged sense benchmark waits on
  judges this loop cannot supply.
  *Partly answered for conversation (2026-11-18):* the sealed
  probe set of §2 is material from outside this loop — other
  people's test sentences, expectations written in this project's
  terms before any run, held under seal from the Social Unit's
  future designer. It has not been run; the parser and
  classification evidence above stands as stated.
- **Correctness bars are policy, not yet proof at scale.** The
  ratified rule — bars never drop as density scales, the evidence
  burden rises — has been applied at 100- and 500-object scale,
  not beyond it.

## 8. Standing decisions this file does not settle

- Slice A build: commissioned 2026-11-18 in the fork chat, the
  five design decisions ruled as recommended (§4). The classes
  with no P2 leg stay T5 under ruling 3 — a future ruling, not
  this build, settles them.
  *Status (2026-11-18, later):* built, gated, and pushed in
  the five-batch merge (`e6f14ab`); the full record is
  `docs/fork/slice-a-report.md`.
- Slices B, C, D: accepted in shape and order (2026-11-18), each
  awaiting its own commission.
  *Status (2026-11-18, later):* commissioned as a sequence
  (B → C → D without further commissions, D's batches pausing
  for the owner), built, gated, and pushed in the five-batch
  merge (`e6f14ab`). Slice D batch 1 was reviewed and ratified
  by the owner before its build; batch 2 takes its own
  commission.
- CSKG reply integration (§1): not taken.
- Found-ahead candidates (§2): ruled on 2026-11-18 — grounding
  in conversation, clarification behaviour and false-premise
  inputs are gaps of record; the ten undrafted aspects remain
  candidates in the harvest record.
- Push of this file: the word was given on 2026-11-18, with the
  tree appendix below; the findings pass and the finishing sweep
  were given their push word the same day. A further word the
  same day covers the batch that followed: the Social Unit's
  map placement, the Slice A rulings, the §5 correction, and
  the three slice records (§5 construction family, §6
  inflection, §7 expected graphs) with their code, tests and
  run records.

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
│   ├─ [x] Build the social layer the probe found absent
│   │      (built 2026-11-18: Social Unit programme S1–S6,
│   │       pushed in 67341f9; acceptance = the sealed run below)
│   ├─ [x] Design the SOCIAL UNIT — inside Awareness (user placement)
│   │   ├─ [x] Contents: greeting / leave-taking · identity as presented
│   │   │        thanks · acknowledgement · turn-taking
│   │   ├─ [x] Hold conversation inside it
│   │   ├─ [x] Hold the Interlocutor: interlocutor-standing moves here
│   │   │        from surroundings (Register, 10%, code "almost none") —
│   │   │        identity known/unknown, first contact or returning,
│   │   │        the picture the conversation itself accumulates
│   │   ├─ [x] Define its seam with the turn loop and reply planner
│   │   └─ [x] Place it on the system map (2026-11-18: Social Unit,
│              the Interlocutor moved in, Conversation — map check
│              passes); confirm Awareness placement at design time
│              (confirmed: ruling 1a, design as ruled)
│   ├─ [ ] Run the sealed conversation probe set — 128 probes,
│   │        sealed 2026-11-18, held outside the repo; commission
│   │        only, and report against this checklist. Note: no
│   │        probe evidences "first contact or returning"
│   ├─ [ ] Grounding in conversation — testimony discipline has
│   │        no conversational form (found ahead; accepted 2026-11-18;
│   │        premise/record cases covered by S5, general form open)
│   ├─ [x] Clarification behaviour — asking what was meant, as a
│   │        designed move distinct from a decline (found ahead;
│   │        built as Social Unit S4, pushed in 67341f9)
│   ├─ [x] False-premise inputs — a designed stance toward a false
│   │        assertion inviting agreement (found ahead; built as
│   │        Social Unit S5, pushed in 67341f9)
│   └─ [ ] Build out the situated self the planner plans with
│          (identity/capabilities now 75% · Interlocutor 75% ·
│           Conversation 70% · Coherence fuller levels unbuilt ·
│           Verbalizer 40%)
│
├─ 3. Classification coverage  (measured 2026-11-18)
│   ├─ [x] Slice A — animal pilot, class-level climb stop
│          (built + pushed 2026-11-18 in e6f14ab; §4)
│   ├─ [x] Slice B — stuff categories, registered-rules only
│          (built + pushed 2026-11-18 in e6f14ab)
│   ├─ [x] Slice C — recognised-but-unclassified climb outcome
│          (built + pushed 2026-11-18 in e6f14ab)
│   ├─ [x] Slice D — per-word overlay mappings, sized after A–C
│          (batch 1 built + pushed 2026-11-18 in e6f14ab;
│           further batches take their own commission)
│   ├─ [ ] Create a gold sense sample so "works" can be audited
│   │      (correctness inside D is currently unproven)
│   └─ [ ] Give verbs a classification route
│          (202 tokens parse-only; the climb is nouns/adjectives only)
│
├─ 4. Slice A's own located gaps
│   ├─ [x] Rule on the classes with no P2 leg, or leave T5
│   │      (ruled 2026-11-18, ruling 3a: left T5 as located gaps
│   │       — amphibian · arachnid · worm · cnidarian, 13 of 95
│   │       tokens; a future ruling may revisit)
│   ├─ [ ] Fix the taxonomy-shape gaps (silkworm · centipede)
│   └─ [x] Judge class assignment by the tradition's own method
│          (done in the design as corrected, 2026-11-18 —
│           Erya / Shuowen: habitat + form, correlative —
│           never anatomical; fish/creature boundaries are fluid)
│
├─ 5. Parser depth  (depth programme complete — stage-5 accounting)
│   ├─ [x] F1 — Chinese preverbal negation (closed by stage 5:
│          structured state; negation 91.2% vs its 90% floor)
│   ├─ [x] Construction parse residue + generator throws
│          (closed by stage 5: parse 80/80, generation failures 0)
│   ├─ [x] Test the construction family properly (done 2026-11-18:
│          89.1% over 46 atoms on a dedicated set; 7 of 8
│          constructions at 100% — re-run after the lexicon-state
│          fix: 47/47 completed round trips, all families at 100%)
│   ├─ [x] Fix the lexicon-state family: probe registration
│          (probe-poisoning) — registration is adoption now, and
│          classification never reads a derived entry from the
│          registry (closed 2026-11-18; §5)
│   ├─ [x] Fix the imperative construction state (single-use per
│          process — closed by the lexicon-state fix; 5/5 on the set)
│   ├─ [x] Fix the existential reparse crash (mass-noun subject —
│          closed by the lexicon-state fix; family 8/8)
│   ├─ [x] Guard the bei branch against unattested verbs (guarded
│          2026-11-18: a located parse error instead of a TypeError)
│   ├─ [ ] Answer the suppressed family (declared ontology failure,
│          F.5 — 66.7% on 3 atoms)
│   ├─ [ ] Finish aspect per the challenge set (unit at 90%;
│          family 100% on the stage-5 holdout)
│   ├─ [ ] Run the H3 sense experiment — needs materials + judges
│   │      (priority order is an axiom under test, no discourse test set)
│   ├─ [ ] Adjudicate the sealed-run divergences (76.1% accuracy):
│          root-predicate substitution ×3 · wh-question role shape
│          ×3 · aspect-value shape ×5 — parser defect, author error,
│          or a determination the record never made, item by item
│   └─ [ ] Valency residue: sense-split the union-of-classes check,
│          add obligations, admit lexicalised frames (ferment case)
│
├─ 6. Lexical and token layer
│   ├─ [ ] Restore adverbs (extract trimmed to n/v/a — usually, indoors)
│   ├─ [x] Close forms-index inflection gaps (happened → happen)
│          (closed 2026-11-18: regular-morphology fallback in the
│           surface lookup; audit 18 gained / 0 changed / 0 lost)
│   ├─ [ ] Multiword coverage (only 60 of 185 object phrases are lemmas)
│   ├─ [ ] Make token resolution work in the browser build (Node-only now)
│   ├─ [ ] Calibrate the error model from attested variant pairs
│   └─ [ ] Bank confirmed resolutions back (Variant Graph at 45%)
│
├─ 7. Evidence and evaluation
│   ├─ [x] Produce sealed expected graphs (done 2026-11-18 for the
│          frozen holdout: G0 accuracy 76.1% beside 98.3%
│          preservation; blind in-loop author — demotion recorded)
│   ├─ [ ] Write the missing design determinations so a re-authored
│          set can score more of the corpus (53 of 80 indeterminate:
│          unslottable objects · when-clauses · feel+adjective ·
│          bare temporals · query shapes)
│   ├─ [ ] WP2's independent-human benchmark (the full WP2 claim;
│          human-shaped, cannot be supplied inside this loop)
│   ├─ [ ] Get judgment from outside this loop (evaluator-shaped evidence;
│          for conversation, partly answered — sealed probe set, §2, unrun)
│   ├─ [ ] Get native-speaker judgment on the Chinese side
│   └─ [ ] Prove the correctness bars at beyond-500 scale
│          (bars never drop as density scales — applied, not yet proven)
│
└─ 8. Standing decisions (not gaps — decisions owed)
    ├─ [x] Commission the Slice A build (commissioned 2026-11-18,
           fork chat; five decisions ruled as recommended)
    ├─ [x] Commission slices B, C, D in turn (commissioned as a
           sequence 2026-11-18; built + pushed in e6f14ab)
    ├─ [ ] Decide CSKG reply integration (see §1)
    ├─ [x] Rule on the found-ahead candidates (ruled 2026-11-18, §2)
    └─ [x] Give the word to push GAPS.md itself (given 2026-11-18;
           findings pass + finishing sweep given their word the
           same day)
```
