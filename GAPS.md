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

A reconciliation pass the same day (2026-11-18, later still)
merges this file with a parallel copy that had been edited in
another worktree. That copy carried the ladder (below), the §2
bar, the §7 adjudication and the §8 programme and pre-ruling
records, but predated the Social Unit and classification builds
and the lexicon-state fix; this file carried those closures but
had never received the ladder, the bar or the adjudication.
The merged file below is the single record; both parent copies
are superseded.

The summary that prompted this file, from the anchor-expansion
recap: the coverage slices "widen what the classification machinery
reaches; they don't deepen what it knows." The gaps below are the
depth that widening does not buy.

## The ladder

The chatbot effort is tiered (owner's framing, 2026-11-18:
fluency and open-domain knowledge are wanted; the bar in §2 is
the first rung, not the destination). The rungs:

- **0 — Demonstrator** (the starting point: a derivation engine, no social
  layer).
- **1 — Presence** (the §2 bar: the Social Unit built; a
  situated conversational presence over the knowledge the graph
  already has, declining located-ly beyond it).
- **2 — Breadth** (more world in the graph: classification
  slices B–D, category anchors, the §1 commonsense relations
  grown deliberately, the CSKG reply question settled — the
  system declines less because it knows more; proceeds in
  parallel with rung 1).
- **3 — Discourse** (conversation with memory and repair: the
  Interlocutor's picture actually used — returning visitors
  recognised, conversation state carried — clarification
  dialogues that resolve, follow-ups, topic continuity; the
  Coherence container built out from 0%).
- **4 — Fluency** (surface realisation beyond the Verbalizer's
  40%: varied, natural English and Chinese, register held
  across a conversation, gated by native-speaker judgment on
  the Chinese side, §7).
- **5 — Open domain** (governed intake: the model/web/Wikidata
  intakes, today at 0%, commissioned and admitted under the
  provenance and testimony discipline — knowledge acquired
  beyond the shipped bundles without breaking the evidence
  rules; the hardest rung, because it must be earned through
  the intake machinery rather than bolted on. The discipline
  governs standing, not permission: *banked intake* and *live
  consultation with declared standing* are both legitimate —
  an answer may come from Wikidata at need, attributed on its
  face, without being banked in the data store first. Only
  unattributed assertion is prohibited. Full statement: §8.)

Standing on the ladder: rung 0 is measured; rung 1 is built
and pushed (Social Unit S1–S6), its acceptance run — the
sealed probe set of §2 — still the owner's to commission;
rung 2's classification slices A–D are built and pushed, while
its §1 items (commonsense relations, the CSKG reply question,
the intakes) are untouched; rungs 3–5 are located in the
sections below and essentially untouched, one rung-3 piece
excepted: Interlocutor persistence was built ahead as S6, on
synthetic-returner gates.

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
  *The bar (adopted 2026-11-18):* the owner's programme for a
  usable chatbot is — set the bar, design the Social Unit,
  build it in slices, then run the sealed probe set against
  this section's checklist. The bar is this checklist, stated:
  a visitor conversation works when the system (1) opens and
  closes — greets, acknowledges, takes leave — as social moves;
  (2) says who it is and what it can do; (3) thanks and is
  thanked without derailing; (4) takes statements that are not
  about the speaker without attributing them to the speaker;
  (5) answers from its graph under testimony discipline, its
  conversational claims tied to their source; (6) asks what was
  meant when it does not understand, as a move distinct from
  declining; (7) declines located-ly where it cannot answer —
  naming the gap, never surfacing a parse failure as a reply;
  (8) meets a false premise with a designed stance, neither
  agreeing nor contradicting by parser accident; (9) keeps the
  Interlocutor's picture — first contact or returning, identity
  known or unknown, what the conversation has established; and
  (10) holds turn-taking across a multi-turn exchange. The bar
  is not fluency, not open-domain knowledge, and not the
  chatbot era's success criteria.
  *Probe coverage note (2026-11-18):* the sealed probe set (next
  item) carries probes for most of this unit's contents, but of
  the Interlocutor's parts, "first contact or returning" is the
  one no harvested probe evidences — a run of the set cannot
  strike it. The unit's seam and its placement are design items
  no probe can evidence at all.
- **Conversation now has assessment material — sealed; run
  2026-11-18 (record below).**
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
  *Note (2026-11-18, later):* one confound the run would have
  faced was removed before it ran: the parser's lexicon-state
  family (§5) made a sentence's parse depend on what the same
  process had parsed before it, which over 128 sequential
  probes would have made results uninterpretable; that family
  is closed.
  *Run record (2026-11-18, on the owner's commission; full
  report and per-probe results held outside the repo at
  `~/workspace/ansci-probe-run-output/`):* the set was run
  once against main `68d99d1`, unmodified, the seal verified
  before running (sha256 `d77c072f…6a1`, matching the sealed
  record in full). Protocol: a fresh, store-less session per
  probe; only the visitor's turns fed, in order — the other
  party's turns are the human partner's replies in the source
  dialogues, not visitor input — and source formatting
  artifacts fed verbatim. 128 probes, 385 turns, 0 machinery
  errors. **Verdicts: 7 pass (5%), 46 partial (36%), 75 fail
  (59%)** (per source: DailyDialog 35 → 2/12/21;
  EmpatheticDialogues 32 → 2/6/24; Persona-Chat 28 → 2/10/16;
  BlendedSkillTalk 18 → 1/8/9; Wizard of Wikipedia 15 →
  0/10/5). Read against the bar above, counting each probe
  toward every item it evidences (pass/partial/fail): (1)
  opens/closes 1/8/6 of 15; (2) self-answers 1*/3/4 of 8 —
  *the one pass is a mapping artifact; no probe asked the two
  exact shapes S3 built ("Who are you?", "What can you do?",
  both verified working on non-probe inputs), and every
  variant asked was declined or met with a token
  clarification; (3) thanks 2/3/5 of 10; (4) attribution and
  acknowledgement 2/17/36 of 55; (5) testimony/grounding
  0/11/9 of 20; (6) clarification 0/3/8 of 11; (7) decline
  form: of 71 decline/rephrase finals, none surfaced a raw
  parse failure, 6 were garbled in wording; (8) false premise
  0/2/0 of 2; (9) interlocutor's picture 0/9/14 of 23 — the
  "first contact or returning" part remains unevidenced by
  any probe, as the coverage note said; (10) turn-taking
  4/17/28 of 49. Two negatives held across all 385 turns:
  **zero confabulation and zero misattribution** — testimony
  discipline's negative half held everywhere, including under
  the two false-premise pressure probes, which scored partial
  because the designed stance did not appear either. The
  passes share one shape: a single formulaic move in the
  exact form the slices built for. The located failure
  shapes, in the report's order: the rephrase request as the
  default answer to ordinary emotional and narrative turns
  (45 of 128 finals); greetings fused with further content
  declined as question-type mismatches (47 turns, 37 probes);
  spurious token clarifications on correctly-spelled words
  (12 finals); self-questions beyond the two built shapes
  declining (shape 4 under bar 2); the visitor's own "What do
  you mean?" declined (4 probes); bare "Ok." where the note
  required recognition of content (36 finals — the gap
  between bar 4's negative half, held, and its positive half,
  not shown); fused thanks + closing receiving the thanks
  only; garbled steering/decline wording (small counts, the
  run's only unreadable replies). *Limits, as the report
  states them:* scoring was in-loop judgment by the runner
  against the probes' pre-written notes — nobody independent
  scored this run; because partner turns were not fed, notes
  needing partner-supplied facts could not fully pass (a
  different protocol would need its own commission); bar 9's
  first-contact/returning part is unevidenced. These numbers
  are the record of the run; they do not by themselves strike
  the Social Unit item above or below — what they show is
  where the bar stands unmet, item by item.
  *Run 2 record (2026-11-19, on the owner's commission; full
  report and per-probe results held outside the repo at
  `~/workspace/ansci-probe-run2-output/`):* the set was run
  once against the merged pre-push tree (`merge/programme`
  at `2f328fb`, unmodified — the C1–C8 conversation-shapes
  stack, the eight parser mechanisms, the §6 adverbs
  restoration, the Part G determinations and the
  property-axes repair), the seal verified before running
  (sha256 `d77c072f…6a1`, unchanged). Protocol identical to
  run 1: fresh, store-less session per probe; only the
  visitor's turns fed, in order; artifacts verbatim.
  Baseline gates on the tested tree: suite 836 counted /
  833 pass / 0 fail / 3 skipped; `ai:check` OK. 128 probes,
  385 turns, 0 machinery errors. **Verdicts: 18 pass (14%),
  64 partial (50%), 46 fail (36%)** — against run 1's 7 /
  46 / 75 (per source: DailyDialog 35 → 7/19/9,
  EmpatheticDialogues 32 → 2/12/18, Persona-Chat 28 →
  7/13/8, BlendedSkillTalk 18 → 2/8/8, Wizard of Wikipedia
  15 → 0/12/3). Movement: 22 probes fail → partial, 8 fail
  → pass, 3 partial → pass, all 7 run-1 passes held, and
  one regression (P-087, partial → fail: the bidding-worry
  turn drew a bare "Ok." in run 1 and the rephrase request
  in run 2). Read against the bar (pass/partial/fail, run 1
  beside): (1) opens/closes 4/7/4 of 15 (was 1/8/6); (2)
  self-answers 4/4/0 of 8 (was 1*/3/4 — run 2's passes are
  substantive: the occupation, rank and degree variants
  the probes actually ask are answered from the Self
  tables' limits facts; 22 self-answer turns against run
  1's 0); (3) thanks 5/4/1 of 10 (was 2/3/5 — fused thanks
  + closing now discharges both halves, P-067/P-071;
  quantified thanks received, P-074); (4) attribution and
  acknowledgement 5/24/26 of 55 (was 2/17/36); (5)
  testimony/grounding 0/15/5 of 20 (was 0/11/9 — still no
  passes, and still no confabulation); (6) clarification
  0/8/3 of 11 (was 0/3/8 — the visitor's "What do you
  mean?" is no longer declined: all four probes moved
  fail → partial on C5 restatements, two of them
  restating an acknowledgement, two drawing the plain
  nothing-to-restate answer the protocol makes true); (7)
  decline form: of 47 decline/rephrase finals (was 71),
  none surfaced a raw parse failure, and the garbled
  "what was did" occurs 0 times (its corrected form once)
  — the garble moved to steering-shaped finals, in about
  the same count; (8) false premise 0/2/0 of 2 —
  unchanged: neither probe complied or endorsed, and the
  designed stance appeared on neither (C7's trigger is
  graph contradiction; the husky claim is unsupported,
  not contradicted, and the arrest-flip is a role
  reversal, not an asserted predication); (9)
  interlocutor's picture 4/11/8 of 23 (was 0/9/14 — the
  four passes are self-answer probes, the system's
  picture of itself; recognition from retained visitor
  facts remains mostly absent, and first-contact/
  returning remains unevidenced, as the coverage note
  said); (10) turn-taking 7/23/19 of 49 (was 4/17/28).
  The two negatives held again across all 385 turns:
  **zero confabulation and zero misattribution**, counted
  explicitly. The located failure shapes, in the report's
  order: the rephrase request, halved and still the
  largest fail shape (27 finals, was 45; 81 turns, was
  129 — what remains is the multi-clause emotional and
  narrative core whose every segment defeats the sentence
  layer); the bare acknowledgement as the modal final
  (40 finals "Ok."/"Ok. Noted.", was 36, plus a form run
  1 did not produce — per-segment acknowledgement piles,
  five finals — C2's conversion of rephrase requests into
  acknowledgements, with the recognition the notes ask
  for still not shown: bar 4's positive half, C6's wider
  unbuilt part); question-type declines persisting behind
  received greetings (43 turns, 36 probes, contains-basis;
  greeting-receipt turns 1 → 21 — the decline moved to
  the fused turn's content segment: un-drawn how-are-you
  phrasings, the "Can I help you?" offer, plain either/or
  social questions); spurious token clarifications cut to
  2 finals (was 12 — "replicate", "Dang") and at least 9
  turns, on correct words the shipped lexicon does not
  attest; self-questions beyond C3's drawn family
  (birthplace as "What about yours?", family size, the
  have-phrasing of the pets question) and two C3
  over-firings ("What do you do for fun?" answered as
  occupation; a fused greeting + health enquiry answered
  with the full self-introduction); steering tails
  appended by the R6 initiative move to receipts and
  declines that should close, and one stance-form reply
  with no premise to answer ("Winter is winter, as I have
  it.", P-103). *Limits, as the report states them:*
  scoring was in-loop judgment against the pre-written
  notes, by the same operator standard as run 1 — nobody
  independent scored either run; partner turns were not
  fed, so notes needing partner-supplied facts could not
  fully pass; bar 9's first-contact/returning part is
  unevidenced. *Judgment on striking:* these numbers do
  not strike the Social Unit item either. The bar is the
  item's acceptance standard, and it stands unmet in
  full on every point — bar 2 comes closest (no fails,
  half partial), bars 4, 5 and 9 stand on their negative
  halves with the positive halves (recognition shown,
  answers grounded in what the exchange established)
  still not evidenced, and bar 8 is unmoved. What run 2
  shows is the bar's social layer substantially built —
  greetings, thanks, closings and self-answers now work
  in their natural fused forms, not only their exact
  ones — and its recognition layer still open. The item
  stands, with this run as its second record.
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
    *Extension (2026-11-18):* conversation-shapes slice C7
    extended the stance to asserted premises the graph
    contradicts (the probe run's two bar-8 probes carried
    theirs as assertions, where S5's why-question wiring never
    met them); the extension stands.
    *Reopening — the soup derivation (owner, 2026-11-18):*
    **not accepted as built.** C7's stance fired on a premise
    of the form "soup is cold", derived through soup → Water
    → Yin → cold. The owner reopened that consequence on
    design grounds: soup's Water correspondence is its
    *matter phase* — its constitution — while temperature is
    a separate property axis (hot/warm resolving toward
    Fire); deriving a temperature from the matter phase
    conflates the two axes. What is under repair is therefore
    not the stance but which derivations count as temperature
    contradictions. *Status:* open again on that point; a
    property-axes fix slice is to be built on the merged
    programme tree. Until it lands, the derivation stands in
    the build as C7 left it, recorded here as known-wrong in
    this respect.
    *Repair (2026-11-18, property-axes slice on the merged
    tree):* the doctrine is recorded as Part H of the repair
    programme — a material carries a combination of
    manifestations, one per axis (phase, temperature,
    reactivity, potential, composition, reflectivity), and no
    derivation crosses axes. premiseDegree's temperature
    check now consults temperature-axis determinations only:
    for a temperature predication the graph walk may enter
    the element spine only through a correspondence
    assignment (ELEMENT_OF / POLARITY_OF), never through a
    classification edge (HAS_ELEMENT) — a material's
    classification assigns its element on the entry's own
    aspect (for matter, its phase), and a phase path alone
    yields no temperature contradiction. Soup and rice
    temperature predications are now absence: "The soup is
    hot." is recorded as told, with no stance, and "Why is
    the soup hot?" declines as a don't-know. Winter's cold
    was and remains grounded on the temperature axis —
    winter enters by its correspondence assignment (winter →
    Water → Yin → cold; the seed states its temperature
    share, and cold is entered in the classification record
    as winter's quality under the temperature aspect) — and
    the bar-8 season assertions ("Summer is the coldest.",
    "Winter is the hottest.") still meet the stance,
    verified explicitly. The soup-pair specimen is restored
    to its original pins, with the premise correction
    recorded in place: C7's correction rested on the
    conflated derivation, and the stance's protected claim
    stands on the season cases. The eleven C7-era fixtures
    that had swapped telling subjects to the garden are
    restored to their natural subjects (soup; tea in one),
    each decision recorded in place. One consumer noted and
    left out of the repair's scope: the question-answerer
    and the composition engine still derive soup → cold as
    priced priors that speak hedged ("The soup may be
    cold."), not as established ground against a telling —
    re-founding them is the derivation layer's own
    programme. *Status:* **closed** on the reopened point;
    the stance machinery and C7's extension stand.
  - *Also found ahead, not drafted:* relevance / maintaining
    context (5 probes), informativeness (5), error recovery (2),
    question-asking balance (2), recognising the interlocutor's
    feeling (1), topic shifting (1), understandability (1),
    whole-conversation coherence (1), nonsense inputs (1),
    adversarial provocation (1). These remain candidates in the
    harvest record (`HARVEST.md` in the sealed set's folder),
    not gaps of record.
- **Initiative steering can append a stale predication.**
  (Located by the conversation-shapes build, 2026-11-18;
  open.) The R6 initiative machinery sometimes appends
  predications built from stale candidates to a reply — the
  probe run's garbled steering turns ("You agreed in the
  you…", P-011; also P-037, P-044) are this shape: readable
  moves carrying content the current turn never settled.
  *Closes when:* initiative draws only on the current turn's
  settled candidates, with a pinning test on the probe shapes.
- **Recognition in acknowledgements covers the name only.**
  (Located 2026-11-18; open.) Slice C6 made an acknowledgement
  address the visitor by name when the name was learned that
  turn. Naming what the conversation has established —
  retained topics, registered feelings — is the larger part
  of bar item 9, and it remains unbuilt: the Interlocutor's
  picture is kept and, the name aside, still not shown.
  *Closes when:* acknowledgements can name an established
  topic or a registered feeling from the record, in the reply
  programme's own forms.
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
- **Which axis the classification table's element states is
  undetermined.** The doctrine now distinguishes a substance's
  matter phase from its composition (repair programme,
  Part H.6); the table predates the distinction, and G0 entity
  atoms currently carry the table's element undifferentiated.
  Some entries plausibly state phase, others composition;
  nothing in the table says which.
  *Closes when:* a vocabulary/data pass rules the table's
  axis (or axes, per entry) and the atoms carry it.
  *Standing rule (owner, 2026-11-18):* where an alchemical
  fitting into Wuxing is needed beyond what the record
  states, the fitting is referred to the owner — asked, not
  improvised; a future slice packages the question instead of
  inventing the answer.
  *Status:* open; resolution belongs to a vocabulary/data
  pass, not the current push.

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
- ~~**Sealed-run divergences (from §7's expected-graph run,
  2026-11-18) — adjudicated the same day.** Against
  expectations authored blind and sealed before the run, G0
  accuracy on the 20 scored holdout items is 76.1%.
  Adjudication against the design record and the parser code
  (full report: the §7 adjudication of 2026-11-18) returned:
  **93 of the 99 divergence records are parser defects, 4 are
  author errors, 2 are record gaps** — and every one of the 61
  accuracy-side atoms (lost or contradicted) is a parser
  defect, so the 76.1% stands exactly as scored: nothing is
  given back. The 93 reduce to **eight mechanisms**:
  (1) *rain* sits in the hand lexicon only as a verb, captures
  the verb slot, and no recovery exists when the subject chunk
  fails on it (H-004); (2) the WordNet verb-fallback scan starts
  one token early when the subject chunk fails on a wh-word and
  upgrades the subject noun (*people*) to verb ahead of the
  real verb (H-070) — against its own comment's stated intent;
  (3) noun–noun compounds are not absorbed, so "ginger tea"
  chunks as "ginger" and the inverted copular branch roots on
  "tea", never consuming the complement (H-047); (4) the
  wh-branch attempts its subject chunk at the *be*-carrier
  token and, failing, assigns the wh-word the agent slot and
  drops the pronoun — the inverted-subject recovery the main
  path has is missing here (H-007, H-008, H-012); (5) the
  wh-branch builds root states by hand and never calls the
  aspect bundle, so progressive aspect is lost in wh-questions
  (same items); (6) on *did*-questions the carrier fixes tense
  in the design ("the carrier takes the tense, the verb stays
  in base form") but the main path reads tense and bounded-ness
  off the verb's base form, reporting present/unmarked (H-003,
  H-062); (7) a table-owned lemma's classification never
  reaches an English noun/adjective node — the climb excludes
  table-owned lemmas ("the table owns it") and no node path
  applies the table, so every table-owned noun entering via
  WordNet lands unclassified (garden, ginger, cold — and rain,
  over-determined under (1)); (8) *that* is classified as a
  determiner before any lexicon lookup and a lone determiner
  cannot chunk, so a *that* object is silently dropped (H-062;
  the parser has the determiner/pronoun reclassification
  precedent for *her* and none for *that*). The author errors
  are the three of-PP modifier connectives (the record
  determines `modifier`; the author's variant named the right
  question with the wrong relation) and one prep atom the
  builders' own fixture carries. The record gaps are the two
  extra `aux = is` atoms: the record contradicts itself on what
  `states.aux` is (see §7). One value stays undecided inside
  mechanism (7): *cold*'s correct element — the table's
  mechanical primary says Water/temperature, the sense-keyed
  design says Metal/illness; that the parser's `none` is wrong
  is not in dispute.
  *Closes when:* the eight mechanisms are fixed, each as its
  own slice, and a re-run of the sealed set (a new run against
  the unchanged seal) shows them gone.~~ **Closed 2026-11-18:**
  all eight mechanisms fixed, each as its own slice on
  `track/eight-mechanisms` (eight commits, each with its tests
  and full gates green at its commit: suite 792 pass / 0 fail
  at the last). The custodian re-run against the unchanged
  seal (seal verified intact first; run + scores at
  `scripts/sealed-holdout80-rerun.json` /
  `sealed-holdout80-rerun.scores.json`, build 5da3ad8) scores
  **G0 accuracy 99.6% (254/255 atoms), up from 76.1%
  (194/255)**, with all eight mechanism items at 100%:
  H-004 14%→100%, H-047 7%→100%, H-070 18%→100%, H-007 /
  H-008 / H-012 62%→100%, H-003 87%→100%, H-062 71%→100%.
  One atom of the 255 still diverges — see the residual item
  below; it is the one value this item already carried as
  undecided, not a mechanism.
- **Residual: *cold*'s element is a sense-priority question,
  not a parser seam.** The re-run's only divergent atom is
  H-058 ("What is a cold?"): expected Metal (the illness
  reading), the parser now returns Water. Before the fix the
  atom read `none` — mechanism (7)'s seam — and the seam is
  closed: the table's classification reaches the node. What
  reaches it is the table's own primary entry (temperature,
  Water, listed first in the table), while the sealed author
  scored the illness sense (Metal). Which sense an
  uncontextualised lookup should lead with is the value the
  adjudication left undecided, and it stays undecided here:
  nothing in the eight slices rules on it. *Closes when:* the
  cold sense-priority is decided on the record (table order,
  or sense selection by construction — "a cold" as a count
  noun naming the illness), and a re-run shows H-058's atom
  preserved. The v2 custodian run (2026-11-19, §7) landed
  the same way on the enlarged set: H-058 at 90.9%, this
  atom the carried-over items' only divergence.
- **A multi-sentence turn parsed as one graph can drop
  content silently.** (Located by the conversation-shapes
  build, 2026-11-18; open.) Slice C2 taught the turn layer
  to receive a telling through its parseable segments when a
  turn is segmented; where a multi-sentence turn instead
  parses as a single graph, part of its content can fail to
  reach any node and nothing records the loss — no decline,
  no note, no trace entry. *Closes when:* a merged parse
  accounts for every sentence's content or records what it
  dropped, with a pinning test.

## 6. Lexical and token layer

- ~~**Adverbs are absent from the extract.** The WordNet extract
  was trimmed to n/v/a; an adverb token (usually, indoors) has
  no synset in the shipped data even though full WordNet has it.~~
  **Closed 2026-11-18:** the extract was rebuilt by its own
  importer (`scripts/import-wordnet.py`, same OEWN 2024 source,
  same construction — the POS trim removed, nothing hand-made):
  synsets 117,008 → 120,630 (+3,622 adverb synsets), relations
  153,758 → 154,470 (+712 pointers to adverb synsets now
  resolve); the n/v/a parts are byte-identical, so existing
  indices stand. The provider derives adverb entries
  (`wordnetAdverb`, Water, no classification invented — the
  climb and the table are noun/adjective machinery), the
  classifier consults them between the adjective's exact and
  morphological readings, and the token recogniser counts them
  as known. The two recorded interactions: (1) *indoors* now
  resolves as the adverb itself — its exact adverb lemma
  answers before the -s-stripped adjective *indoor* the
  inflection slice recorded, and in "She waited indoors." it
  modulates the verb instead of landing as a result state;
  (2) *about* — the lexicon-state report's adverb/preposition
  hole — now carries adverb synsets (7) and a derived reading:
  "Tell her about winter." parses whole (her recipient, winter
  theme) where it fell through before, and the imperative's
  about-PP check now precedes its adverb check so "Tell me
  about winter." keeps its PP. *About*'s classification-table
  entry is still absent — the table is noun/adjective
  machinery — so that half of the hole stands as it was. One
  exception, by design: *between* is not claimed — the parser
  leaves a between-node in the graph and senses-scening builds
  its two-landmark relation from it, so the derivation does
  not reach the token (recorded in enItems). Blast-radius
  audit over a population reconstructed from this section's
  named sources (holdout corpora + sealed set + test suite +
  the 500-object sample files; 5,522 tokens — the original
  2,841-token list is held in the external measurement
  folder): 5,308 unchanged, 82 gained (no resolution → an
  adverb reading: usually, about, again, always, often…),
  132 changed — 128 of them the pure addition of an `:r`
  candidate beside the existing ones, and 4 the exact-lemma
  shortcut answering with an adverb lemma that is itself the
  surface (indoors, later, nearest, needs — each verified;
  the parser's per-POS lemma paths still reach needs'
  noun/verb readings where it asks for them) — and 0 lost.
  Two count pins restated for the larger extract (the
  definitions store's synset count; the merged graph's node
  and edge counts, +3,622 / +712 exactly). Gates: suite 797
  pass / 0 fail (800 counted), demo 29/29, holdout 80/80 ·
  exact 29 · 0 regressions, sense A 11/11 · B 5/6, ai:check OK.
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
- ~~**The design record underdetermines G0 for most of the
  holdout.** Of the 80 items, 53 were sealed as indeterminate:
  blind authoring from the documents capped at 25% of the
  corpus, because what G0 should be exists, at those places,
  only as parser behaviour.~~ The named blockers: unslottable
  objects — what the graph does when a verb's object fits no
  FrameNet slot (~12 items); when-clause link type (5);
  feel + adjective complement shape (5); bare temporal
  adjuncts; time/season/location query shapes; and (added by
  the adjudication) the definition of `states.aux` — the
  record contradicts itself, one text defining it as the
  carrier for negated/perfect clauses while the weather branch
  and the main path set it for progressive *be* and the
  generator reads it as the *be*-carrier. A further 7
  items were exposed before authoring (named in the baseline
  and stage-5 records, or present in the tooling's own
  fixture), declared in the manifest and excluded.
  *Determinations written and entered (2026-11-18):* the
  seven determinations are now settled design in the record —
  `docs/fork/repair-programme.md` Part G (G.1–G.7), each ruled
  2026-11-18 as recommended under the owner's standing
  instruction, written from the record's stated principles
  without reference to parser output (G.7, the lone-object
  alternation, is recorded there as a stipulation assembled
  from the record's existing pieces, its provenance stated).
  G.5's named atomiser extension is built (2026-11-18):
  topic-sourced `location` edges now atomise as attachments
  (`where|location = you`), gated green (suite 775 pass /
  0 fail; demo 29/29; holdout 80/80, no regressions; sense
  A 11/11, B 5/6; ai:check OK). G.6 resolves `states.aux` to
  the narrow Metal-carrier definition; the generator's
  progressive/weather usage is the side that must conform,
  recorded in Part G as owed to a future build slice — not
  yet done. *Scored-pool effect:* determinable items go from
  20 of 80 to 50 of 80 under G.1–G.6, 51 with the atomiser
  extension built, and 52 of 80 with G.7 (H73). *Still
  blocked (21):* discourse acts (H59, H60, H61, H68 — an
  atom-vocabulary decision, not a determination); relation
  and opposition questions (H53, H57, H66 — no opposition or
  relatedness relation in the vocabulary; H57 also lacks
  bicycle material data); event ordering (H18, H20, H21 — no
  ordering relation; extending `chains-to` is the named first
  candidate for a second determinations pass); manner (H25 —
  no manner relation); containment (H14 — the atomiser emits
  no atom for `contains`, the uncommissioned sibling of
  G.5's fix); causal adjunct (H2 — no cause relation);
  resultative *go* (H32), definite description + *here*
  (H33), possessive NP structure (H72), existential quantity
  query (H75), compounded PP/adjective atomisation (H77);
  and H76 (relation-question root), H78 (weather-question
  and future shapes), H79 (*exact* — F.4's declared ontology
  failure; no determination exists in the record to write).
  H73 was the remaining member of this list — its alternation
  rule existed only in parse code — and is unblocked by G.7,
  now stated as design. Each still-blocked family waits on a
  vocabulary change or on a rule being brought into the
  record, not on authoring effort. *Re-authored and sealed
  (2026-11-19):* the v2 set now exists —
  `scripts/sealed-holdout80-v2.json`, manifest
  `wp2-holdout80-g0-v2-2026-11-19`, hash `ee9f0ca7…77c`
  (file sha256 `09292b6d…40ad`), authored blind in a separate
  context from the enlarged record (Part G) and the first
  author's stated conventions, under the same recorded
  demotion as v1, and sealed before any run of this set. The
  20 items scored under v1 are carried over verbatim (their
  content hashes reproduce exactly under the v2 seal); 32
  more are authored — 29 determinate and 3 finite-ambiguity
  (H49 on its sub-gate classification, as G.1 directed; H11
  and H30 on the noun-internal of-PP `links` atom, the first
  author's uniform precedent at H56/H67/H80). Scored pool:
  **52 of 80** (44 determinate, 8 finite-ambiguity; 799
  primary expected atoms against v1's 255). The remaining 28
  stay unresolved, their blockers restated in current terms
  in the manifest (the 7 exposed items keep their exposure
  records verbatim). Suite green with the set present (775
  pass / 0 fail).
  *Custodian scoring run (2026-11-19, against the merged
  programme tree — `merge/programme` at `05ef562`, the union
  of the mechanisms, determinations/sealed-v2,
  conversation-shapes and page branches, gates green):* the
  seal was verified before running (manifest
  `wp2-holdout80-g0-v2-2026-11-19`, hash `ee9f0ca7…77c` —
  seals intact); the set was run once and scored once, no
  re-runs. **G0 accuracy 74.6% pooled over the 52 scored
  items**, beside v1's **76.1%** over its 20 items and the
  v1-set re-run's **99.6%** (§5). The pooled figure is not a
  trend reading: the 32 newly authored items are the corpus's
  harder shapes — the ones that were indeterminate — and
  score 66.3% mean per item, while **the 20 carried-over v1
  items score 99.6% mean again (99.55%), with exactly one
  atom diverging: H-058's *cold*** — expected Metal (the
  sealed record's illness sense), the parser produced Water
  (temperature); the item scores 90.9%. That is the
  adjudication's one undecided value, landing as §5's
  residual item already records it: mechanism 7's seam is
  closed and the table reaches the node; the remaining
  divergence is the sense choice itself, which no
  determination settled. Preservation 97.5% pooled. By
  family, the new items' losses concentrate in attachment
  (26.9% of 26 atoms) and suppressed (0 of 3), then number
  (68.9%), roles (70.8%) and negation (70.0%); predicate
  82.0%, entity 77.2%, connective 89.7%, mood 75.8%, tense /
  aspect / voice 77.0%. A per-determination breakdown is not
  given by the scoring machinery — the manifest carries no
  per-item determination tag — and the carried/new split
  above is the finest cut the record supports. The run is
  recorded in the repo at `scripts/sealed-holdout80-v2-run.json`
  with its scores beside it, following the v1 re-run's
  pattern. **Closed 2026-11-19:** the determinations are
  written into the design record as design, and the
  re-authored set has scored a materially larger share of
  the corpus (52 of 80 against 20). The 21 still-blocked
  items carry forward as their own item, next.
  *Closes when:* the missing determinations are written into
  the design record — as design, not reverse-engineered from
  parser output — and a re-authored set scores a materially
  larger share of the corpus.
- **The 21 still-blocked holdout items wait on vocabulary,
  not determinations.** (Carried forward from the item above
  on its closure, 2026-11-19.) Discourse acts (H59–H61,
  H68), relation and opposition questions (H53, H57, H66),
  event ordering (H18, H20, H21), manner (H25), containment
  (H14), causal adjunct (H2), and the single-shape items
  named in the item above each need a relation or atom the
  vocabulary does not contain, or a rule brought into the
  record. Extending `chains-to` for event ordering is the
  named first candidate. *Closes when:* a second
  determinations pass is commissioned on a vocabulary
  decision, the determinations are entered, and a further
  re-authored set scores these items.
- **Sealed-run divergences — adjudicated (§5 holds the
  detail).** Of the run's 99 non-preserved atoms, adjudication
  found 93 to be parser defects in eight mechanisms, 4 author
  errors, and 2 record gaps (the `states.aux` definition
  split, now in the item above). All 61 accuracy-side atoms
  are parser defects, so the 76.1% stands as scored. They are
  recorded as a located item in §5, closing when the eight
  mechanisms are fixed and a re-run against the unchanged seal
  shows them gone.
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

- The chatbot programme (ruled 2026-11-18): the bar stated in
  §2 is adopted; the Social Unit's design is commissioned in
  the main AnSci build chat (the chat that maintains the
  schematic map), the build follows in slices, and the sealed
  probe set is run only after the build, its report read
  against §2's checklist. The programme is tiered — the bar is
  the first rung, not the destination (owner's framing,
  2026-11-18: fluency and open-domain knowledge are wanted;
  the effort is characterised by its ladder). The rungs are
  stated at the top of this file, under "The ladder". The
  discipline does not prohibit intake — the intakes stand on
  the map because they are planned, and the
  owner states plainly (2026-11-18) that web and Wikidata
  intake will be needed. What the rule governs is standing,
  not permission, and standing has two legitimate modes
  (owner's correction, 2026-11-18 — a single admission gate
  was too restrictive): *banked intake*, where outside
  knowledge is admitted into the graph with its provenance and
  thereafter speaks with the standing of its partition; and
  *live consultation with declared standing*, where the system
  consults an outside source at need and the reply carries the
  source and its standing on its face — attributed, checkable,
  visibly not the graph's own knowledge. What remains
  prohibited is only the third mode: unattributed assertion —
  outside knowledge presented as the system's own held
  knowledge, or with no source at all. A claim must never
  carry more standing than it has; how it earns its standing
  may vary.
  *Status (2026-11-18, later):* the programme ran as ruled —
  the Social Unit was designed, built in slices S1–S6 and
  pushed; the sealed probe run is the step that remains, on
  the owner's commission.
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
- Slice C design decisions — PRE-RULED (owner's "rec",
  2026-11-18, ahead of the slice): (1) recognised-but-
  unclassified is a formal climb outcome, a third result kind
  visible to join/turn and decline diagnosis — not trace-only;
  (2) the slice's scope is the climb outcome, the audited stop
  list and the re-measurement splitting B into B-recognised /
  B-unknown — reply use is deferred to the Social Unit track;
  (3) function categories only, stops keyed by synset id, each
  subtree audit-dumped for judgment, scaffolding ancestors
  never counting; (4) the outcome records every category stop
  on the path, nearest marked primary. Its category list is
  certified against what B leaves. (Commissioned under the
  sequence authorization below; built on these rulings, §3.)
- Slice D rulings — PRE-RULED (owner's "rec", 2026-11-18,
  ahead of the slice): (1) review is TIERED — in-loop review
  with a recorded rationale for every proposed mapping; the
  owner personally reviews contested items (proposal conflicts
  with a registered heuristic, or proposer confidence low) and
  audits a blind sample of each batch, a batch bouncing if its
  sample error rate exceeds the bar; (2) overlay mappings carry
  their own provenance (derived tier, qualified in replies),
  confidence capped at 0.80, reviewer and rationale recorded
  per entry; (3) the overlay is FILL-ONLY — it speaks only
  where the curated table and the climb are silent, never
  overriding either (corrections of already-classified words
  remain table curation's work); (4) scope is the
  real-vocabulary leftovers, high-occurrence first, batched
  with a per-batch gate; test-suite vocabulary is out of
  scope. The slice's SIZE is not ruled and cannot be until the
  re-measurement after A–C lands; it is read off that
  measurement when the slice starts. (Commissioned under the
  sequence authorization below; batch 1 built on these
  rulings, §3 — with one recorded deviation: the blind sample
  was unblinded at the owner's request and explained item by
  item, so batch 1's evidence is the explained spot-check plus
  the owner's item rulings, not a blind audit.)
- Parallel tracks (ruled 2026-11-18): the Social Unit track
  (rung 1) and the classification track (rung 2) run
  concurrently in separate worktrees, neither waiting for the
  other; slices stay sequential within each track. Under this
  ruling the Social Unit's five design decisions were ruled as
  recommended (§2), build slice S1 is commissioned, and Slice B
  is commissioned as the classification track's next slice —
  both commissions in the main build chat. Social Unit slices
  S2–S6 still await their own commissions in turn.
  *Status (2026-11-18, later):* both tracks ran to completion
  under this ruling and the later sequence commissions —
  Social Unit S1–S6 and classification A–D are built and
  pushed (§2, §3).
- Sequence authorization (owner, 2026-11-18): the
  classification track runs B → C → D in order WITHOUT further
  commissions — as each slice's gates pass, the next proceeds
  on its pre-ruled design (C and D above), with a report at
  each slice boundary. Two limits stand: D's batches still
  pause for the owner's contested-item and blind-sample review
  (that is the tiered-review ruling, not a commission), and
  pushes remain per-word — the authorization covers building,
  not pushing. The Social Unit track is unaffected.
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
  run records. A further batch followed (Social Unit S1–S6,
  classification A–D, ProblemSolving placeholder, lexicon-state
  fix with its GAPS reconciliation) and was pushed the same
  day, main reaching `37fe145`. This merged file — the ladder,
  the §2 bar, the §7 adjudication and the §8 records above
  reconciled with those closures — awaits its own push word.

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
│   ├─ [x] Run the sealed conversation probe set (run 2026-11-18
│   │        on the owner's commission, against main 68d99d1, seal
│   │        verified: 128 probes / 385 turns / 0 machinery errors;
│   │        verdicts 7 pass / 46 partial / 75 fail; zero
│   │        confabulation and zero misattribution in 385 turns;
│   │        per-bar record in §2 — the numbers are the record,
│   │        not a striking of the bar. "First contact or
│   │        returning" remains unevidenced by any probe)
│   ├─ [x] Run 2 of the sealed set (run 2026-11-19 on the owner's
│   │        commission, against the merged pre-push tree
│   │        2f328fb, seal verified, protocol identical: 128
│   │        probes / 385 turns / 0 machinery errors; verdicts
│   │        18 pass / 64 partial / 46 fail; zero confabulation
│   │        and zero misattribution again; one regression,
│   │        P-087; per-bar record in §2 — the bar stands
│   │        unmet in full, its social layer substantially
│   │        built, its recognition layer still open)
│   ├─ [ ] Grounding in conversation — testimony discipline has
│   │        no conversational form (found ahead; accepted 2026-11-18;
│   │        premise/record cases covered by S5, general form open)
│   ├─ [x] Clarification behaviour — asking what was meant, as a
│   │        designed move distinct from a decline (found ahead;
│   │        built as Social Unit S4, pushed in 67341f9)
│   ├─ [x] False-premise inputs — a designed stance toward a false
│   │        assertion inviting agreement (found ahead; built as
│   │        Social Unit S5, pushed in 67341f9)
│   ├─ [x] Property axes: matter phase ≠ temperature — the soup
│   │        derivation reopened by the owner (2026-11-18) and
│   │        repaired the same day on the merged tree:
│   │        premiseDegree consults the temperature axis only,
│   │        soup tellings are recorded as told, and the season
│   │        stance stands on correspondence ground; doctrine
│   │        at repair-programme Part H (§2)
│   ├─ [ ] Initiative steering appends stale-candidate
│   │        predications to some replies (R6; located 2026-11-18)
│   ├─ [ ] Recognition in acknowledgements beyond the name —
│   │        retained topics and feelings (bar 9's larger part)
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
│   ├─ [ ] Give verbs a classification route
│   │      (202 tokens parse-only; the climb is nouns/adjectives only)
│   └─ [ ] Rule which axis the classification table's element
│          states — phase vs composition (doctrine at repair-
│          programme Part H.6; the table predates the
│          distinction and G0 atoms carry it undifferentiated;
│          fittings beyond the record are referred to the
│          owner — asked, not improvised)
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
│   ├─ [x] Adjudicate the sealed-run divergences (done 2026-11-18:
│          93 of 99 records are parser defects in 8 mechanisms;
│          4 author errors; 2 record gaps; the 76.1% stands)
│   ├─ [x] Fix the eight adjudicated parser mechanisms, each as its
│          own slice (closed 2026-11-18: eight slice commits on
│          track/eight-mechanisms; custodian re-run against the
│          unchanged seal scores G0 99.6%, up from 76.1%, all
│          eight items at 100%)
│   ├─ [ ] Decide cold's sense priority (H-058's atom: the table
│          leads with Water/temperature, the sealed record scores
│          Metal/illness — the adjudication's one undecided value)
│   ├─ [ ] Merged-parse turns can drop content silently
│   │        (multi-sentence turn parsed as one graph; located
│   │        2026-11-18 by the conversation-shapes build)
│   └─ [ ] Valency residue: sense-split the union-of-classes check,
│          add obligations, admit lexicalised frames (ferment case)
│
├─ 6. Lexical and token layer
│   ├─ [x] Restore adverbs (closed 2026-11-18: extract rebuilt by
│          its own importer with the adverb block — +3,622 synsets;
│          indoors resolves as the adverb, about's hole half-closed;
│          audit 5,308 unchanged / 82 gained / 132 changed / 0 lost
│          over the reconstructed population; between excepted by
│          design — the scening landmark interface)
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
│   ├─ [x] Write the missing design determinations so a re-authored
│          set can score more of the corpus (closed 2026-11-19:
│          determinations in repair-programme Part G.1–G.7, ruled
│          as recommended; G.5 atomiser extension built; v2 set
│          sealed and scored once on the merged tree — G0 74.6%
│          pooled over 52 items; the 20 v1 items at 99.6% again,
│          H-058's cold atom their only divergence)
│   ├─ [ ] Second determinations pass for the 21 vocabulary-blocked
│          items (discourse acts · opposition · event ordering ·
│          manner · containment · cause; chains-to extension the
│          named first candidate)
│   ├─ [ ] WP2's independent-human benchmark (the full WP2 claim;
│          human-shaped, cannot be supplied inside this loop)
│   ├─ [ ] Get judgment from outside this loop (evaluator-shaped evidence;
│          for conversation, partly answered — sealed probe set, §2, unrun)
│   ├─ [ ] Get native-speaker judgment on the Chinese side
│   └─ [ ] Prove the correctness bars at beyond-500 scale
│          (bars never drop as density scales — applied, not yet proven)
│
└─ 8. Standing decisions (not gaps — decisions owed)
    ├─ [x] Rule the chatbot programme (ruled 2026-11-18, §8: bar
           adopted · Social Unit designed + built S1–S6 · sealed
           probe run after the build, on the owner's commission)
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
