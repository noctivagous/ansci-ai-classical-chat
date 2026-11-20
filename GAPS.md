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
  *Run 3 record (2026-11-19, on the owner's commission; full
  report and per-probe results held outside the repo at
  `~/workspace/ansci-probe-run3-output/`):* the set was run
  once against `88472eb` — the tip of
  `track/recognition-programme`, the R, E and S programmes
  stacked — unmodified, in its own worktree, the seal
  verified before running (sha256 `d77c072f…6a1`,
  unchanged). Protocol identical to runs 1 and 2. Baseline
  gates on the tested tree: suite 937 pass / 0 fail / 3
  skipped; demo 29/29; holdout clean; sense A 11/11 · B
  5/6; `ai:check` OK. 128 probes, 385 turns, 0 machinery
  errors. **Verdicts: 25 pass (20%), 64 partial (50%), 39
  fail (30%)** — against run 2's 18 / 64 / 46 and the
  R-tip retrospective's 20 / 63 / 45 (per source:
  DailyDialog 35 → 9/20/6; EmpatheticDialogues 32 →
  2/12/18; Persona-Chat 28 → 10/11/7; BlendedSkillTalk 18
  → 4/9/5; Wizard of Wikipedia 15 → 0/12/3). **Regressions:
  none** — ten probes improved on run 2, eight on the
  R-tip run, none worsened, and every earlier pass held.
  Read against the bar (pass/partial/fail, run 2 beside):
  (1) opens/closes 5/9/1 of 15 (was 4/7/4); (2)
  self-answers 6/2/0 of 8 (was 4/4/0 — now the strongest
  item: S1's leisure, family, elliptical-return and
  have-phrasing answers all fired in the wild); (3) thanks
  6/4/0 of 10 (was 5/4/1); (4) attribution and
  acknowledgement 5/25/25 of 55 (was 5/24/26); (5)
  testimony/grounding 0/15/5 of 20 (unchanged — still no
  passes in four runs; its notes demand answers grounded
  in what the exchange established, which no slice yet
  built had produced in a form the set can see); (6)
  clarification 0/8/3 of 11 (unchanged); (7) decline form:
  the bar's population is unchanged and its evidencing
  probes fail on their other turns, not on the final's
  form; (8) false premise 0/2/0 of 2 (unchanged — and see
  the stance check below); (9) interlocutor's picture
  4/11/8 of 23 (unchanged); (10) turn-taking 10/24/15 of
  49 (was 7/23/19). The two negatives held again across
  all 385 turns, counted explicitly: **zero confabulation
  and zero misattribution**. The run's most serious
  near-case is named in the report: the first-person echo
  — P-068's "Ok. My major is science." and P-103's "Ok.
  Mine is green.", the visitor's facts rendered in the
  system's first person; counted as person-rendering
  garbles under the standing standard, where a stricter
  standard would count P-068 as one misattribution (the X
  programme's person discipline, below, is built against
  exactly this shape). The specific checks the programmes
  named: **P-030 is recovered end to end** (T1 "Ok.
  Noted.", T2 "Ok.", T3 "Ok.") — the R-tip regression is
  repaired, but the name is held without ever being
  referred back to, so the probe stands at partial: the
  regression repaired, the recognition not yet earned,
  and that gap is the X programme's named target. **The
  absence stance (S3) fired nowhere** — no probe asserts
  a checkable claim about a correspondence-order subject
  in the unsupported middle, and the husky probe ends
  "Ok.", partial exactly as S predicted and as Part I's
  own scope requires; there was also no stance
  over-firing anywhere. Like R1 before it, S3 built a
  behaviour this instrument cannot see; if the stance is
  ever to be measured, it needs a targeted instrument of
  its own. The run-2 spurious-clarification family is
  gone (every offender at Zipf ≥ 3.0 passes unclarified;
  token-clarification finals 2 → 0), but the class is not
  empty: one new token firing above the bar ("'em", Zipf
  4.57, P-125) and one spurious *sense* clarification
  (Blue, P-122) stand as located remainders. S2's
  either/or form did not fire on its named specimen
  (P-056 still draws the question-type decline); its
  offer-of-help form did (P-065, P-066). Failure shapes:
  rephrase finals 27 → 14, of which 11 fall in the
  `_comma_` artifact family and only 3 exist outside it —
  E2's audit expectation borne out in shape; bare-"Ok."
  finals 21 (up from the R-tip run's 17, honestly: several
  garbled-receipt and decline finals became plain acks — a
  plainer failure, not a worse one); ack+receipt finals
  46; ack piles 0; decline finals 17; greeting-receipt
  turns 30. Two new shapes are S5's, both named in the
  report: **steering tails inside composed replies** —
  R3's gating holds on standalone receipts, but
  compositions appended the venting tail after receipts
  and even before a thanks receipt, twice in one reply in
  two probes (steering finals 2 → 4 against the R-tip
  run); the X programme's composition discipline (X3,
  below) is built against this — and **echoes over
  particle/clitic themes** ("You donned the t.", P-081,
  P-091; "You won the be to t.", P-083; "You are one.",
  P-035), against which X1's admission vetoes are built.
  EmpatheticDialogues did not move at all against run 2
  (2/12/18): its notes demand recognition of emotional
  content across turns. *Limits, as the report states
  them:* scoring was in-loop judgment under run 1's
  rubric, 35 verdicts carried from the R-tip scoring on
  identical behaviour rather than re-judged — nobody
  independent scored this run; partner turns were not
  fed; bar 9's first-contact/returning part is
  unevidenced. *Judgment on striking:* these numbers do
  not strike the Social Unit item either. What run 3
  shows is the R+E+S stack's gains consolidated with no
  regressions, bar 2 substantially met, and the bar's
  recognition layer — bars 4, 5 and 9's positive halves —
  still open in exactly the form the owner commissioned
  the X programme against ("we want the leap"): receipts
  and answers that draw on the whole conversation record,
  not the current segment. The item stands, with this run
  as its third record; run 4, against the X tip, is the
  run that judges it.
  *Run 4 record (2026-11-19, on the owner's commission; full
  report and per-probe results held outside the repo at
  `~/workspace/ansci-probe-run4-output/`):* the set was run
  once against `d867a8b` — the tip of
  `track/recognition-programme`, the R, E, S and X
  programmes stacked — unmodified, in its own worktree, the
  seal verified before running (sha256 `d77c072f…6a1`,
  unchanged). Protocol identical to runs 1–3; this run's
  baseline is run 3, the staircase R-tip → run 3 → run 4
  isolating the X programme. Baseline gates on the tested
  tree: suite 965 pass / 0 fail / 3 skipped; demo 29/29;
  holdout clean; sense A 11/11 · B 5/6; `ai:check` OK. 128
  probes, 385 turns, 0 machinery errors. **Verdicts: 26
  pass (20%), 65 partial (51%), 37 fail (29%)** — against
  run 3's 25 / 64 / 39 (per source: DailyDialog 35 →
  9/20/6, its membership changed though its counts did
  not; EmpatheticDialogues 32 → 3/12/17 — moved for the
  first time since run 2, both movements on probes whose
  notes turn on retained material; Persona-Chat 28 →
  10/12/6; BlendedSkillTalk 18 → 4/9/5; Wizard of
  Wikipedia 15 → 0/12/3, unmoved for the fourth
  consecutive scoring — its notes turn on
  testimony-bounded knowledge answers no slice in this
  stack addressed). **Movement: four up, one down** —
  P-030 partial → pass (the name referred back to at last:
  "Ok. Ok. Her name is roxie." — the stack's first pass
  earned purely by referring back), P-079 partial → pass
  (the apology is no longer cross-examined at the final),
  P-027 and P-042 fail → partial; of run 3's 25 passes, 24
  hold. The one regression is **P-072, pass → partial**: a
  garbled attributed tail ("You are welcome. You watched
  the now.") appended to a thanks receipt by the
  receipt-link machinery — recorded as a located item
  against X1 below. Read against the bar (pass/partial/
  fail, run 3 beside): (1) opens/closes 6/8/1 of 15 (was
  5/9/1); (2) self-answers 6/2/0 of 8 (unchanged); (3)
  thanks 6/4/0 of 10 (unchanged); (4) attribution and
  acknowledgement 6/25/24 of 55 (was 5/25/25); (5)
  testimony/grounding 0/15/5 of 20 (unchanged — zero
  passes in five consecutive scorings; see the
  instrument-blindness note below); (6) clarification
  0/8/3 of 11 (unchanged); (7) decline form 0/9/20 of 29
  (its population drops by one — P-042's final no longer
  declines); (8) false premise 0/2/0 of 2 (unchanged — the
  absence stance fired nowhere again, zero firings for the
  fourth consecutive run, by the design record's own
  scope); (9) interlocutor's picture 5/11/7 of 23 (was
  4/11/8); (10) turn-taking 10/25/14 of 49 (was 10/24/15).
  The two negatives held again across all 385 turns,
  counted explicitly: **zero confabulation and zero
  misattribution** — the fifth consecutive scoring at
  zero, on the run where receipts first drew on retained
  material, the place a confabulation would appear if one
  were coming; every retained-material reference traces to
  something the visitor actually said in that probe's fed
  turns. Run 3's most serious near-case class is
  **mechanically absent**: a scan for the visitor's facts
  rendered in the system's first person finds zero
  instances (run 3: two) — P-068 now "Ok. Your major is
  science.", P-103 "Ok. Yours is green."; X1's person
  discipline is verified across the whole set, not only on
  its specimens. **Steering discipline verified
  mechanically:** replies carrying two or more steering
  markers fell 2 → 0, steering finals 4 → 2 (both single,
  standalone moves identical to run 3 — not composition
  leaks), and no boundary segment — thanks, closing,
  receipt — carries a steering move anywhere in the run;
  X3's composition discipline holds in the wild. Of 47
  ack+receipt finals, **9 reference material from an
  earlier turn** (run 3: effectively none) — five by
  explicit marker ("We were talking about…", "You told
  me…"), four by inspection (P-001's standing feeling,
  P-030's name, P-047's told fact, P-124's want): roughly
  one ack+receipt final in five now reaches back; the rest
  remain current-turn receipts. The particle/clitic echo
  family run 3 named is gone everywhere it appeared — most
  of the 41 behaviour changes are deletions of garble.
  P-008's composed final is clean and empty where it was
  dirty and empty: the tails are gone, recognition did not
  take their place. The run's most serious near-case is
  P-042's false denial of a same-turn telling, recorded
  against X2 at the grounding item below; the topic-link
  discrimination gap and the attributed-rendering garbles
  are recorded against X1 at the recognition item below.
  Failure shapes: rephrase finals 14 (11 in the `_comma_`
  artifact family, 3 outside it — identical to run 3);
  bare-"Ok." finals 22; ack+receipt finals 47; ack piles
  0; decline finals 16; token-clarification finals 0;
  greeting-receipt turns 30. *The instrument-blindness
  finding, recorded as a fact about the instrument, not
  the mechanisms:* a mechanical scan of the sealed set
  finds **no probe, at any turn, asking a feeling-history
  question, a mention-check question, or any question
  about the visitor's own earlier statements** — no "Did I
  mention…?", no "How did I feel?", no "Was I worried?",
  no "What did I say?", no "Do you remember…?" — and no
  negated-feeling input exists in the set either. X2's
  record answers, X4's readers-as-answers and X0's
  refinement are therefore unevidenced by this instrument
  either way, in the same position as S3's absence stance
  and R1 before them; what this run evidences of X is X1's
  receipt links, X3's steering discipline and the person
  discipline. If those mechanisms are to be measured, they
  need a targeted instrument of their own. *Limits, as the
  report states them:* scoring was in-loop judgment under
  run 1's rubric — nobody independent scored this run; 87
  verdicts carried from run 3's scoring on identical
  behaviour rather than re-judged; partner turns were not
  fed; bar 9's first-contact/returning part is
  unevidenced. *On striking:* no judgement is entered
  here. Five scorings in, bars 4, 5 and 9 stand on their
  negative halves — bar 5 without a pass in any scoring —
  and whether the item is struck is the owner's to judge.
  The item stands, with this run as its fourth record.
  *Run 5 record (2026-11-19, on the owner's commission; full
  report and per-probe results held outside the repo at
  `~/workspace/ansci-probe-run5-output/`):* first, the
  integration it ran against. The two programme branches
  from `9486833` — `track/recognition-programme` at
  `2e56956` (IMP-1..4) and `build/discourse-uptake` at
  `510f82b` (the Discourse Record reader and the uptake
  move family) — were merged on `integrate/imp-discourse`
  (merge commit `d032908`) in a separate worktree. One
  textual conflict, in `src/fork/turn.ts`: the trace's
  recognition-link record and `earlierLink` — resolved by
  keeping both programmes' fields (IMP-3's link sentence,
  DR-2's history spine) and both legs (DR-2's history leg
  ahead of X1's event leg, under IMP-3's standing-topic
  discipline, which the history leg now also observes);
  `GAPS.md`, `session.ts` and `plan.ts` merged cleanly,
  both programmes' §2 entries whole. The seam was audited
  against the uptake design's gating: IMP's new reply
  paths are all question-answerers (the self-query,
  possession, tellings, mention and feeling-history
  routes) and declines — not acknowledgement sites — and
  its statement paths (tag questions taken up as
  statements, IMP-4's clause-boundary split) flow through
  the ordinary composition that holds the four wired
  `tryUptakeReply` sites; **no seam wiring was added, and
  none was improvised.** Gates on the integrated tip:
  suite 1052 pass / 0 fail / 3 skipped (1055 tests — the
  union of both branches); demo 29/29; holdout clean;
  sense A 11/11 · B 5/6; `ai:check` OK. The set was then
  run once against `d032908`, unmodified, in its own
  worktree, the seal verified before running (sha256
  `d77c072f…6a1`, unchanged; the runner recomputes and
  aborts on mismatch). Protocol identical to runs 1–4,
  with one behaviour-neutral capture addition (the uptake,
  recognition and closingFact trace records, so firings
  can be counted from traces). 128 probes, 385 turns, 0
  machinery errors. **Verdicts: 30 pass (23%), 72 partial
  (56%), 26 fail (20%)** — against run 4's 26 / 65 / 37
  (per source: DailyDialog 35 → 12/18/5;
  EmpatheticDialogues 32 → 3/19/10; Persona-Chat 28 →
  11/12/5; BlendedSkillTalk 18 → 4/10/4; Wizard of
  Wikipedia 15 → 0/13/2, its pass count unmoved for the
  fifth consecutive scoring). **Movement: fifteen up, one
  down.** The invariants held for the sixth consecutive
  scoring: **zero confabulation and zero
  misattribution** across all 385 turns. Read against the
  bar (pass/partial/fail, run 4 beside, on the scoring
  script's assignment): (1) opens/closes 6/8/1 of 15
  (unchanged); (2) self-answers 6/2/0 of 8 (unchanged);
  (3) thanks 8/2/0 of 10 (was 6/4/0); (4) attribution and
  acknowledgement 7/32/16 of 55 (was 6/25/24); (5)
  testimony/grounding 0/18/2 of 20 (was 0/15/5 — **zero
  passes in six consecutive scorings**); (6)
  clarification 2/6/3 of 11 (was 0/8/3 — **the bar's first
  passes in any scoring**: P-090's person clarification
  and P-076); (7) decline form 1/9/6 of 16 (was 0/10/6 —
  its first pass, P-076); (8) false premise 0/2/0 of 2
  (unchanged, by Part I's recorded scope); (9)
  interlocutor's picture 5/13/5 of 23 (was 5/11/7); (10)
  turn-taking 12/25/12 of 49 (was 10/25/14). Failure
  shapes: **rephrase finals fell 14 → 1** (the last, P-121,
  is instrument-family); bare-"Ok." finals 25;
  ack+receipt finals 58; decline finals 16.
  *Per family, against the causal analysis's counted
  upside:* **IMP's sentence layer (C3, 12 primaries)
  delivered at partial grade** — the family went from
  10 fail / 2 partial to 2 fail / 10 partial, eight probes
  converting fail → partial as their turns were taken up;
  the two standing fails are P-009 (the 'rest' sense split
  — IMP-1's named residual, fired here and priced: neither
  offered sense is the visitor's meaning) and P-029 (a C6
  rendering garble). **IMP's decline routing (C5, 9)
  delivered** — three conversions to pass (P-056's
  either/or form fires at last; P-076's wondering question
  routed to its located admission; P-090's clarification),
  P-119 fail → partial, and located declines across the
  family; bars 6–7's standing zero lines are broken.
  **IMP's gating completion (~7) delivered on its named
  specimens** — P-072's run-4 regression is repaired (the
  thanks receipt stands alone; the probe passes again),
  P-005's and P-013's steering stand-downs hold, P-086's
  gap questions are gone, P-127's 'wow' link is gone; its
  named remainders stand exactly as recorded (P-050's
  possession answer does not fire in context; P-053's
  'day' link is byte-identical to run 4). **The design
  families moved nothing at verdict grain, and the run
  prices why.** *C1 uptake (19 primaries): zero movement*
  (13 partial / 6 fail in both runs). Uptake fired on
  three turns in the whole set (P-044, P-059, P-079) and
  stood down on four (P-001, P-005, P-014, P-037 — every
  one the phase gate, in 'opening'); only P-059's firing
  is visible in a reply. Two firings (P-044's 'dream',
  P-079's 'hope') were **built, recorded in the trace and
  in the episode register, then discarded** — both
  feelings are verb-carried, and branch (c)'s verb-carried
  early return runs after `tryUptakeReply` has registered
  the firing: a composition-order defect at UP-2's seam
  with the verb-carried shape, located here, not yet
  repaired. And the priced remainder: **the unfiled-words
  class ('disappointed', 'upset', 'devastated', 'proud')
  costs 0 of the 19 on this set** — no C1 telling speaks
  in it; only 2 of the 19 contain any filed feeling word
  at all. The other 17 carry their register narratively,
  in events and evaluations, with no predicated visitor
  feeling — UP-1's recorded scope line (event-carried
  registers are not claimed in v1) is what bounds the
  family's reach here, not the vocabulary. Empathetic-
  Dialogues' fails halved (17 → 10) on the sentence
  layer's conversions; its pass count has not moved
  since run 4. *C4 discourse (9 primary / 15 touched):
  zero movement on both rings.* The type specimen is
  byte-identical to run 4: **P-036** — "Ok. You injured
  the leg. We were talking about the leg." The history
  leg needs two earlier items in which the topic fills a
  rendered role; this record holds the injury inside a
  clause the ledger took up as 'used the weight', so the
  spine is not served and the lemma-grade link answers as
  before — the history-grade link verified on the build's
  constructed sessions does not fire at this set's
  recording grain. P-068's closing fact likewise did not
  fire. Where the reader's servings did show: P-110's
  told-me garble tail is gone and its loss is referred
  back accurately ("You told me the parent died."), and
  P-103's noise-grade link is dropped. *The run's one
  regression is **P-024, partial → fail**:* the visitor's
  sympathy turn ("I am sorry… I truly hope you find a
  resolution") now draws the venting steering
  cross-examination ("You were sorry. What did you say
  or do?") where run 4 receipted it ("You hope.") — the
  turn's 'sorry', filed as grief under E1's climb, is
  registered as a steering state where run 4's parse
  carried the turn on 'hope'; the steering is the family's
  ordinary move over a fresh visitor feeling, misapplied
  to a formula of sympathy. Attributed to the
  implementation side (the registration/segmentation
  interplay), not to uptake, which never assessed the
  turn. Turn-level regressions without verdict change:
  P-014's first turn, P-043's "I don't work fine.",
  P-050's second turn, P-025's added 'right' link. *The
  instrument family (C2, 17) is unchanged, as expected* —
  all movement above is read net of it. *Limits, as the
  report states them:* scoring was in-loop judgment under
  run 1's rubric — nobody independent scored this run;
  60 verdicts carried from run 4 on identical behaviour;
  partner turns were not fed; bar 9's
  first-contact/returning part is unevidenced. The two
  design families' zero movement is a statement about
  this instrument's grain as much as about the machinery:
  the record-probes instrument (56/0/0 at the IMP tip)
  and the builds' specimens show the mechanisms working
  where records are rich and feelings are filed; this
  set's harvested grain is thinner on both counts. *On
  striking:* no judgement is entered here; the bar is
  the owner's to strike or not. The item stands, with
  this run as its fifth record.
  *Run 6 record (2026-11-19, on the owner's commission; full
  report and per-probe results held outside the repo at
  `~/workspace/ansci-probe-run6-output/`):* the set was run
  once against `bbe9986` — the narrative-uptake programme's
  tip on this file's integrated base (`d71009c`): UN-1 (the
  event-register authority and the narrative ground), UN-2
  (the narrative rendering licence), and the FIX slice (the
  three located items) — unmodified, in its own worktree,
  the seal verified before running (sha256 `d77c072f…6a1`,
  unchanged; the runner recomputes and aborts on mismatch).
  Protocol identical to runs 1–5; the uptake trace now also
  carries its ground (stated | narrative) and, on narrative
  ground, the event-register entry, so the grounds are
  counted apart. 128 probes, 385 turns, 0 machinery errors.
  **Verdicts: 30 pass (23%), 73 partial (57%), 25 fail
  (20%)** — against run 5's 30 / 72 / 26 (per source:
  DailyDialog 12/18/5, unchanged; EmpatheticDialogues
  3/20/9, P-024's move the family's only change;
  Persona-Chat 11/12/5, unchanged; BlendedSkillTalk 4/10/4,
  unchanged; Wizard of Wikipedia 0/13/2, unchanged — its
  pass count unmoved for the sixth consecutive scoring).
  **Movement: one up, none down** — **P-024, fail →
  partial**: run 5's regression is repaired (FIX (ii),
  recorded under the C1 item below); the turn receipts the
  sympathy 'sorry' and no longer cross-examines it, and
  what keeps it from a pass is the hope segment's own
  steering over a hope whose object the same breath
  states. The invariants held for the seventh consecutive
  scoring: **zero confabulation and zero misattribution**
  across all 385 turns. 124 probes are byte-identical to
  run 5; the four differing probes are P-024 (above),
  P-036 and P-044 (verdicts held; under the C1 item below)
  and P-019 (first turn only — a garbled trailing segment
  absent; the two systems answer the turn identically in
  isolation, the difference a process-level lexicon-state
  effect of running the set in one process; final reply
  identical, verdict carried). Read against the bar
  (pass/partial/fail, run 5 beside, on the scoring
  script's assignment): (1) opens/closes 6/8/1 of 15
  (unchanged); (2) self-answers 6/2/0 of 8 (unchanged);
  (3) thanks 8/2/0 of 10 (unchanged); (4) attribution and
  acknowledgement 7/33/15 of 55 (was 7/32/16 — P-024);
  (5) testimony/grounding 0/18/2 of 20 (unchanged — **zero
  passes in seven consecutive scorings**); (6)
  clarification 2/6/3 of 11 (unchanged); (7) decline form
  1/9/6 of 16 (unchanged); (8) false premise 0/2/0 of 2
  (unchanged); (9) interlocutor's picture 5/13/5 of 23
  (unchanged); (10) turn-taking 12/26/11 of 49 (was
  12/25/12 — P-024). Failure shapes: rephrase finals 1
  (P-121, unchanged); bare-"Ok." finals 25; ack+receipt
  finals 59; decline finals 16. *Limits, as the report
  states them:* scoring was in-loop judgment under run
  1's rubric — nobody independent scored this run; 124
  verdicts carried on identical behaviour; partner turns
  were not fed; bar 9's first-contact/returning part is
  unevidenced. *On striking:* no judgement is entered
  here; the bar is the owner's to strike or not. The
  item stands, with this run as its sixth record.
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
    *Status (2026-11-19, R1 of the recognition programme):*
    the record form is now built as a general answering
    source — the conversation record is consulted FIRST in
    the answering order, before the graph and before any
    decline. A question over a told event whose asked role a
    recorded event fills is answered from the record,
    attributed as a telling ("You told me you put the salt
    in the soup."); a question after what the conversation
    is about is answered from the Topic records ("We were
    talking about the soup."); "How do I feel?" is answered
    from the speaker's standing feeling state (filed as a
    feeling by the classification table's emotion aspect or
    the EDU's canonical names); and the R7.5 record answers
    now read through the record's grain, so the speaker's
    own predicate questions ("Am I worried?") reach the
    standing state the record holds under 'you' — before R1
    they declined on the raw lemma ("nothing on i in my
    notes") while the state stood in the record, and left
    the question's own duplicate recording standing beside
    it. An event the record cannot attribute to a holder is
    not rendered as anyone's doing, and a question the
    record does not answer keeps its decline. What remains
    open is the item's general form as stated above: a
    checkability discipline over any reply's use of provided
    knowledge, beyond these record sources.
    *Status (2026-11-19, X2 of the X programme, in the
    worktree, unpushed):* **the record's answers now read
    the record as it accumulated, not only its standing
    surface.** (a) *Feeling history:* "How did I feel?" and
    the past-tense "Was I worried?" answer from the feeling
    chain — superseded links read back from the
    supersession record, standing links from the states,
    earlier links predicated in the past and the last in
    the present — where the R1 occupant answer gave only
    the standing feeling; present-tense feeling questions
    keep the R1/R7.5 answers. (b) *Mention checks:* "Did I
    mention X?" / "Did I tell you about X?" answer yes or
    no from the record as it stood before the turn,
    counting only statement turns' records — a question's
    own mention of X is not a telling of X. Both are
    record answers in R1's discipline: attributed as the
    record's, never the graph's, and absence in the record
    declines honestly. (c) *Accumulated tellings — not
    built, the remainder located:* "What did I tell you
    about the soup?" cannot be answered, because the
    wh- shape's parse drops the about-phrase at the
    sentence layer (the S5 status above records the same
    drop from the merging side), so the asked lemma never
    reaches any answerer. The repair belongs to the parse
    layer, not to an answerer built to guess its argument.
    What remains open is unchanged in kind: the item's
    general form — a checkability discipline over any
    reply's use of provided knowledge, beyond the record
    sources now built — and bar 5's verdict is run 4's to
    give (run 3 left it at 0/15/5, zero passes in four
    runs; any pass at all is signal).
    *Run 4 note (2026-11-19, located by probe run 4
    against this slice):* **the mention check reads the
    wrong record for a question whose own turn contains a
    telling.** P-042: the visitor stated their favourite
    drink (iced tea) in the same turn, and the check —
    answering from the record as it stood BEFORE the turn
    — replied "No. You have not told me you have one.": a
    false denial of a telling that had already happened,
    the first time in five scorings the memory machinery
    has asserted something false about what the visitor
    said. The pre-turn snapshot is the right record
    against a question's own mention masquerading as a
    telling; it is the wrong record where the turn itself
    registered tellings before the question. The check
    must run against the record including the current
    turn's own registered tellings. (The probe still
    improved fail → partial on its other turns — the
    either/or drink question is now answered at all — and
    both facts stand.) Run 4 also establishes this
    slice's evidence position: the sealed set asks no
    mention-check, feeling-history or record question at
    any turn (the mechanical scan recorded in the run 4
    record above), so the slice's answers stand
    unevidenced by that instrument either way.
  - *The implementation programme (IMP; owner's rulings,
    2026-11-19).* After run 4 the owner commissioned a
    causal analysis before any further building (diagnosis
    before fixes: every non-passing run-4 probe attributed
    by cause — system design, implementation, knowledge,
    instrument; the analysis is held outside the repo at
    `~/workspace/ansci-causal-analysis.md`). The owner's
    rulings on it: **the implementation programme runs
    first** — the located implementation causes, priced and
    certain — **with the design phase widened to cover both
    design items** (the Discourse Record reader; the
    empathic-uptake move family) **running in parallel as a
    design-only track**; and **empathic uptake is
    CHARTERED** — a capability whose owner is to be
    designed in that parallel phase, not a charter
    exclusion, and not this programme's to build. IMP's
    slices are the analysis's implementation causes in its
    order: IMP-1 the sentence layer (C3), IMP-2 decline
    routing and location (C5), IMP-3 initiative/link gating
    completion (the C4/C6 gating remainder), IMP-4 the
    parse and record-answer completions the record-probes
    instrument priced. Statuses are recorded per slice
    below, against the analysis's cause items.
    *Status (2026-11-19, IMP-1 — causal analysis C3, the
    sentence layer sinks receivable turns; 12 primaries:
    P-009, P-010, P-018, P-019, P-021, P-025, P-028, P-029,
    P-032, P-081, P-087, P-113):* **the sinks are closed,
    by general mechanisms, none keyed to probe wording.**
    The glued-comma transcription ("_comma_") is a comma,
    normalised where commas are normalised; sentence
    punctuation glued to a word mid-text is the sentence's
    mark, split off as the final mark is stripped
    (abbreviations keep their periods); "won't" splits as
    will + n't (the "can't" precedent, both tokenisers);
    segmentation keeps the marks where they stand —
    missing-space boundaries and unpunctuated tails segment,
    a decimal point is no boundary (the old splitter's
    exact-rejoin test discarded the whole segmentation on
    any of these, merging receivable turns into one
    unparseable whole); a sentence-initial coordinating
    conjunction is scaffolding and content begins after it
    (P-087's plain declarative); verbless fragments widen
    to the bare nominal's kin — a prepositional fragment
    and a fragment behind discourse markers are complete
    discourse acts (P-081's "Yes, in most circumstances.");
    the bare quantifiers (most/all/any) stand in a chunk's
    determiner slot on positional evidence — they are
    degree adverbs elsewhere ("gone all brown" keeps its
    modulating 'all', a demo pin) and determiners only
    where a noun phrase follows; a hyphenated compound of
    attested parts is a formed word, not a doubtful one;
    and the token exit's arbitration is completed — a
    rival reading must preserve the sentence's root (a
    candidate that re-reads the sentence as a different
    event was never a reading of the token: "recall" in
    P-009's "hopes reall high"), the token that IS the
    root excepted, and rivals that are one lexeme in
    several word classes (real/really) are one reading.
    All twelve primaries' turns are taken up; controls
    hold (wethr still asks with/water/weather; a mistyped
    root still asks). Two admission vetoes the uptake
    exposed were completed in their own families: a state
    whose lemma is a closed-class function word is
    recorded as parsed but never receipted (R2) nor
    returned to (X3's topic-return) — the resultative
    "so" mis-read as a quality ("It is so." / "The roof is
    so.", on P-030's third turn, whose pinned replies the
    veto restores exactly). *One residual stands, located:*
    P-009's final turn now meets the §2.3 rival split over
    'rest' (sleep vs relief) where it once sank — the
    sense-split family the analysis counts under C6, not
    C3; the sentence layer's part is done. *Gates:* suite
    985 pass / 0 fail / 3 skipped (965 baseline + 20 new);
    demo 29/29; holdout clean; sense A 11/11 · B 5/6;
    ai:check OK. *One re-pin:* the E1 verb-carried-feeling
    test — its turn's unpunctuated second sentence is now
    segmented and its found event earns the receipt it
    earns as its own turn; the feeling registration and
    steering shape the test pins are untouched, and the
    reason stands in place.
    *Status (2026-11-19, IMP-2 — causal analysis C5, decline
    routing and location; 9 primaries: P-041, P-050, P-056,
    P-076, P-090, P-115, P-116, P-119, P-126):* **the
    declines are located and the questions routed, by
    general mechanisms.** A decline now names the gap it
    stands at: a tag question is a statement with a tag
    (the tag is scaffolding, stripped at the parse under an
    onset guard — P-116's "It must be a very stressful job
    right?" is taken up as the statement it is); the
    possession answer routes on the possession-verb class
    (have/own/possess), the matter read from an excess fill
    where the verb carries no valency frame ("Do you own
    guns?" — "I don't have any guns."); a polar verb
    question to the system, modal or bare present, is a
    self-query in the ability flavour and draws the plain
    denial in the question's own frame ("Can you swim?" —
    "I can't swim."; "Do you eat meat?" — "I don't eat
    meat."), cognition and telling verbs excepted, and an
    unanchored person pronoun in its patient draws the
    clarification that owns it ("Can you take he away from
    me?" — "Who do you mean by 'he'?", P-090); the
    self-presentation request routes to the identity
    presentation in its imperative, modal and
    wondering-wrapped frames (P-041); the wondering frame's
    posed question and the tell-me request's about-phrase
    are recorded as matters and discharged at the knowledge
    location, the net's absence verified before the decline
    names them ("I have nothing on life insurance in what I
    know.", P-076; "the Prisoner of Azkaban", P-119); and
    the question path's fallthrough locates at knowledge
    when the question names a subject the net holds nothing
    on (paramedics, P-116's segment; restaurants, P-056's
    greeting segment; strike, P-115) — the shape text stands
    only where no subject can be named. P-056's either/or
    specimen itself already answered at the IMP-1 tip: its
    run-4 failure was the old segmentation merging the
    question into its turn, IMP-1's cause, not the built
    form's firing conditions, which inspection verified
    whole. Two completions the routing exposed: 'her'
    before a lone adjective is the object pronoun (an
    adjective evidences a noun phrase only when a head
    follows it — "You took her away." keeps its patient),
    and the ability flavour's object renders under the S0
    admission. *Two residuals stand, located:* P-050 in
    context — its turn is an unpunctuated run-on whose
    merged parse roots on 'hunt', so the possession answer
    does not fire (the decline it draws is at least located
    at knowledge, naming 'hunting'); no run-on
    clause-splitting mechanism exists, and none was carved
    for the specimen. And the either/or form's bars 6–7
    record is unchanged by this slice — the routing to the
    built forms is repaired; what the sealed set asks of
    them is run 5's to measure. *Gates (with IMP-3, built in
    the same working pass):* suite 1006 pass / 0 fail / 3
    skipped (985 at IMP-1 + 11 new IMP-2 tests + 10 new
    IMP-3 tests); demo 29/29; holdout clean; sense A 11/11
    · B 5/6; ai:check OK. *One re-pin:* the C3
    not-captured test — "Do you eat meat?" leaves the
    ordinary-questions list because the routing now owns
    it as a self-query by design (the plain denial is
    asserted positively in this slice's tests); the other
    four controls stand.
    *Status (2026-11-19, IMP-3 — the initiative/link
    gating completion, the analysis's §7 item 5; ~7
    primaries across C5's sibling and C6's groups):*
    **the gating is completed, by general mechanisms.**
    (i) The X1 receipt link stands under the composition's
    boundary discipline: the link's rendered sentence is
    recorded on its trace, and in a composition carrying a
    boundary reply (thanks/farewell/decline/closing) the
    shaping strips it and counts the strip — P-072's
    regression family; the receipt itself, the segment's
    own content, stands. Beside it, a deictic time word is
    not a thing fill at either admission (soundThingFill,
    soundBareFill): "You watched the now." no longer
    stands to be kept — P-072's final turn is now the
    thanks receipt alone. (ii) Steering over a feeling the
    telling itself binds to its object, or occasions by a
    mediated report, stands down in every branch of the
    family: the of-phrase after the feeling's own word
    ("scared of bugs"), or a read/heard/watched/learned
    event of the visitor's standing on the feeling's turn
    (P-005's grief over a news story — the read event is
    the turn's own record), judged for the fresh-state and
    restrainer branches on the turn's parse and for the
    venting branch on the standing feeling's own turn's
    retained surface, so no branch of the family steers
    from a feeling another branch stood down over. The
    feeling stands registered either way; an unbound
    feeling steers as before (the P-008 control). (iii)
    The topic leg discriminates above the bare lemma: a
    topic raised inside the visitor turn being composed is
    that turn's own material and grounds no link inside it
    (P-034's 'meat', raised by a sibling segment); the
    admission refuses the scaffolding and time-frame
    classes (P-127's 'wow'); the event leg — an earlier
    event's own structure, X1's priced shape — is
    unchanged, and P-036's 'leg' link stands. The
    consumed-object possession shape ("I have a cell
    phone" drawn as an event of phoning) premises neither
    an echo nor a gap question, at the plain-event branch
    or in the initiative scan, where the persisting gap
    over it was P-086's second specimen; the shape is
    judged on the parse's tokens at the branch and on the
    event record's retained surface in the scan. *One
    residual stands, located:* P-053's 'day' link — the
    topic's only path into the receipt's content is a
    mis-resolved fill (the recording resolved a dropped
    slot to a time adjunct's noun), and in the record as
    recorded that is indistinguishable from a sound
    return; the link stands or falls with the resolution,
    which is the rendering family's (C6) account, and the
    same mis-resolution produces the receipt clause "You
    typed the day." beside it. *Three re-pins, each with
    its reason in place:* the E1 P-005 test (the steering
    tail is this slice's intended target; the registration
    assertions are untouched), the E1 P-013 test (the same
    stand-down over the object-bound feeling; the found
    event's receipt stands), and the R3 P-072 test (the
    segment's echo fails the fill admission, so no steering
    reply is produced to stand down — the discipline holds
    a fortiori); the X1 link-trace assertions carry the
    link's sentence since (i).
    *Status (2026-11-19, IMP-4 — the parse and record-answer
    completions the record-probes instrument priced; its
    run-1 record was 50 pass / 2 partial / 4 fail):* **the
    completions are built, each a general mechanism.**
    (a) The accumulated-tellings reader (X2's located
    remainder, built): "What did I tell you about X?" reads
    its topic from the token stream after "about" — the
    phrase the wh- parse drops — and answers with the
    record's accumulation over the topic: states predicated
    of it (standing and superseded, in turn order) and
    events it fills in any role, its agent included, each
    rendered under the family's admissions and spoken under
    the told-me attribution; nothing told answers so,
    plainly. The instrument's family stood 1 control pass /
    4 fail on the identical missing-role decline ("nothing
    you have told me says who it was told to"); all four now
    answer with the accumulation, and the control stands.
    Two rendering grains stand as the family's own, not
    this reader's: a lone location drops from the event
    clause ("the sister lived" — Chicago unnamed), and a
    role noun predicated of a third person drops its
    article (the planner's standing 3sg grain). (b) A
    comma-joined telling + question composes at the
    interrogative clause boundary — the S5 principle at the
    clause's scale: the telling registers before the
    question is answered, so the mention configuration
    affirms in one turn ("I put the salt in the soup, did I
    mention the soup?" — "Yes. You mentioned the soup."),
    and P-042's question reaches the self answerer that
    owns it instead of the merged parse's mis-drawn
    possession denial; its first segment's uptake exposes a
    steering garble over the mis-predicated 'sleeper' state
    that the merged parse previously hid — the rendering
    family's account, recorded here. (c) The feeling
    history's negative branch: "Was I sad?" over a record
    holding feelings but no sadness answers "No." with the
    standing feeling beside it (RP-008, RP-051 — the
    instrument's two partials); the asked feeling standing
    in the record still answers from it, and a feeling-less
    record is untouched. (d) The mention check and the
    possession check render the visitor's possessive back
    as the second person: "You told me about your
    favourite." (e) The told-me attributed constructions
    stand under the S0-family admission, completed against
    the event's own retained surface: a determiner-spoken
    fill whose word stands only preposition-led ("went to
    work") or degree-adverb-led ("so well") in its telling
    did not stand as the clause's object there, and the
    clause stands down whole — P-110's "The accident got
    the well." and its told-me repetition both fall; sound
    fills render as before (the soup control). P-071's
    specimen no longer reproduces on the current record
    (IMP-1..3 changed what its turns record); the mechanism
    is verified on the constructed shape and on P-110.
    *Gates:* suite 1018 pass / 0 fail / 3 skipped (1006 at
    IMP-3 + 12 new IMP-4 tests); demo 29/29; holdout clean;
    sense A 11/11 · B 5/6; ai:check OK. *One test rewritten,
    with its reason in place:* X2c, which pinned this
    remainder as unbuilt, now pins the built behaviour.
    *Verification (the programme's close):* the
    record-probes instrument re-run against this
    programme's tip (`2134dcd`, in a separate checkout;
    seal verified by the runner before running; the
    instrument unmodified) — **56 pass / 0 partial / 0
    fail, against run 1's 50 / 2 / 4; invariants zero;
    0 machinery errors.** Accumulated tellings 5/0/0 (from
    1/0/4); feeling-history 8/0/0 (RP-008's negative
    branch); controls 6/0/0 (RP-051); the mention checks
    hold 9/0/0 with the person conversion in place
    (RP-013/014/050). Forty-six probes' replies are
    byte-identical to run 1 — the movement is confined to
    the ten probes in IMP-4's families. Outputs at
    `~/workspace/ansci-record-probes-run2-output/`
    (REPORT.md, results.jsonl, raw-results.jsonl,
    run-probes.mjs, score.py). The run prices record
    answers only: IMP-4(b) and (e) are evidenced by the
    programme's tests and specimens, and IMP-1..IMP-3's
    families are sealed run 5's to measure.
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
  - *The absence outcome (2026-11-19, S3 of the S
    programme, in the worktree, unpushed):* the stance
    family had a second hole the two runs measured without
    naming as this item's: a checkable claim the graph does
    not support drew neither compliance nor endorsement —
    and no stance (bar 8, 0/2/0 in both runs; the husky
    claim is unsupported, not contradicted). The owner's
    ruling is recorded as **Part I of the repair
    programme**: the degree has three outcomes, and where
    an asserted predication is checkable — its quality
    classified on an aspect the graph speaks to, and its
    subject a term of the graph's correspondence order
    (carrying an ELEMENT_OF or POLARITY_OF assignment of
    its own: a season, a time, an element) — and the graph
    neither supports it (premiseSupport in coherence.ts,
    over the degree's own edge family, the axes rule
    included) nor contradicts it, the reply states the
    absence, located on the claim: "I don't have {subject}
    as {quality} in what I know." The consequences differ
    from contradiction's in every part: the asserted state
    stands in the record as told, no disagreement is
    recorded, no stance-repair pending opens, and the
    stance is stated at the claim's first telling only.
    The subject leg is the scope's centre (Part I.2): a
    classified thing — the soup, the garden, the tea of
    the conversation's ordinary business — only receives
    an assignment, and predications about it are tellings
    that keep the ordinary path; the axes repair's soup
    case stands as the repair left it (absence of degree,
    recorded as told, no stance), and the build's first
    scope — any graph node as subject — was corrected on
    exactly this evidence after it fired across the
    corpus's own telling fixtures. *Residue, per I.5:* the
    husky claim's own surface
    (a causal claim in explanation dress, its parse filing
    no predication, its subject and quality outside the
    graph's vocabulary) remains a partial-grade shape; what
    closed is the degree's outcome for asserted
    predications the system can price.
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
  *Status (2026-11-19, R3 of the recognition programme, in the
  worktree, unpushed):* **the append-to-boundaries half is
  closed.** Run 2 also showed the move appending steering
  tails to receipts and declines that should close (P-072,
  P-124, P-079). The initiative scan now never appends to a
  receipt or a closing: the standalone turn is gated on the
  reply's boundary mark (set by the thanks receipt and the
  farewell mirror), and a composed turn is gated on its
  composition record — the composed trace is the last
  segment's, so an earlier segment's boundary reply is
  recorded where the scan can read it. Inside a composition
  the same discipline binds the segments' own steering: a
  segment's steering reply stands down to the plain
  acknowledgement when an earlier segment of the same
  composition closed a boundary, and when the state it would
  steer from is one the segment itself carried by a verb (a
  doing re-verbalised as a feeling — the P-079 shape). A
  greeting is not a boundary, and standalone turns are
  untouched. The staleness half — what the candidates
  themselves are drawn from — is R4's, and the item stands
  open on it.
  *Status (2026-11-19, R4 of the recognition programme, in the
  worktree, unpushed):* **closed.** The closes-when test reads
  "settled candidates" as candidates standing in the record
  *and soundly derived* — the specimens' staleness was
  mis-derivation, not age — and the scan now admits only
  those. A steering predication is formed only from a state
  that was predicated, never from one the same parse carried
  by a verb (recorded together with its own event of the
  same verb: "I have horses…" filed you/horse beside
  horse(a=you), and the move predicated "You are horse." —
  the lexicon-kind check passed it because positional
  adoption had left the lemma a noun entry). A gap question,
  which addresses the visitor by construction, is grounded
  only in the visitor's own events — another agent's, or an
  agent-less fragment's, ground none ("What did you run?"
  over the turtle's running; "What did you bear?" over a
  fragment with no settled agent). And every fill such a
  question would render must be sound — a thing-word in the
  determiner slots (a noun in the lexicon, a classified
  concept, or a referent the conversation recorded as an
  entity), a referring word in the bare ones — or the
  candidate is dropped whole, not verbalised around the
  garble ("the it", "the using"). Sound candidates fire
  exactly as before, pinned beside the dropped ones. One
  specimen stands deliberately unchanged: "What did you
  buy?" (P-075) is grammatical, correctly addressed, and
  asks after a role the record genuinely lacks — its
  wrongness is the parse's dropped object, the parser
  programme's to repair, not the verbalisation's.
  *Status (2026-11-19, X3 of the X programme, in the
  worktree, unpushed):* **the scan's grounds now include
  recognition, and its composition discipline is
  completed.** (i) Run 3 found R3's gating holding on
  standalone receipts but steering tails still appended
  inside composed replies — after receipts, before a
  thanks receipt, twice in one reply. The discipline now
  binds the composition as a whole: a boundary anywhere
  in a composed reply stands every steering segment down,
  at most one steering move stands per composed reply,
  and a stood-down segment keeps its own content (the
  venting echo, the generating predication, carried on
  `trace.steeringBaseReply`) losing only the move. Three
  R3 pins re-pinned to the stand-down form, reasons in
  place. (ii) Two recognition grounds stand in the scan,
  ranked after the priced and gap shapes: *standing-
  feeling* — the visitor's latest standing feeling filed
  by E1's authorities but unclassified ('guilty' and its
  kin, which the priced shape cannot price), predicated
  from the record, unpriced; and *topic-return* — an
  established topic's standing parsed state, untouched
  since its turn, predicated from the record. The grounds
  are earlier material only: statement turns only (a
  question's presupposition grounds nothing), negation
  respected (X0's discipline at the scan), pronouns and
  verb-holders barred as qualities and topics. A steering
  move that merely repeats the current segment's content
  is not a recognition ground and does not fire as one.
- **The acknowledgement echo assumes the visitor as agent.**
  (Located by R4 of the recognition programme, 2026-11-19;
  open.) The statement branches' acknowledgement family
  renders a recorded event as the visitor's doing, with its
  fills as they stand — "You ran. What did you run?" over
  the turtle's running (P-097), "You bought." over Mary's
  buying, "You cook the it in the using." over a pronoun
  theme and a verb-form location (P-037) — whatever agent
  and fills the parse recorded. R4's soundness rules bind
  the initiative scan; the turn's own echo and gap question,
  which are the reply programme's designed moves, do not
  yet observe them. *Closes when:* the echo and the own-turn
  gap question are formed only over events whose recorded
  agent is the visitor, with their fills under the same
  soundness rule, or render the agent they were given.
  *Status (2026-11-19, S0 of the S programme, in the
  worktree, unpushed):* **closed.** One admission now binds
  every rendering of a recorded event or state in the
  acknowledgement family — the echo, its gap question, the
  venting steering's echo, the steering temporal clause,
  the recognition receipts, and the R1 record answer's
  clause (soundEventClause / soundBareFill /
  correctedAdoption in turn.ts): the subject is the record's
  agent in the record's grain ("You" for the visitor, "The
  X" for a named third party), never an assumed visitor;
  every determiner fill must be a thing-word (R4's
  authorities: lexicon noun, classified concept, recorded
  entity), every bare fill a referring word or a noun; the
  gap questions premise the visitor as the event's agent
  and are asked only over the visitor's own events; and no
  rendering speaks a lemma the token resolver's matcher
  substituted for a different written word (a variant or a
  segmentation, being the person's own word in attested
  dress, is not barred). A rendering that fails admission
  stands down whole — the plain acknowledgement speaks
  instead. The specimens: P-097's turn is "Ok. Noted." (no
  echo, no gap question over the turtle's event); P-037's
  cooking turn is "Ok." (the venting steering stands down
  over agent 'hobby' with theme 'it' and location 'using');
  P-079's sorry steering takes its plain forms ("You were
  sorry. What did you say or do?" — the temporal clause's
  recorded patient failed admission); and **P-030
  recovers**: its final turn is "Ok." — "You named the
  her." stands down on the pronoun patient, and "Her name
  is movie." stands down because 'movie' is the matcher's
  substitution for the written name 'Roxie'. The state the
  parse recorded stands in the record untouched — the
  admission binds renderings, not recording; a rendering of
  a state recorded in an EARLIER turn cannot test its
  adoption, the state record carrying no surface provenance
  — that residue is recorded here, not papered over.
  Sound controls stand byte-identical (the venting "You
  put the salt in the soup. Now that it's out…", the
  temporal "…when you heard the news.", the receipt "Ok.
  The mary bought the flower.", the gap question "You gave.
  What did you give him?").
- **Self-questions beyond C3's drawn family, and the
  occupation shape's over-firing on leisure.** (Located by
  probe run 2, 2026-11-18; the run's record above names the
  shapes.) Three drawn-family remainders declined or were
  met by the wrong machinery: birthplace asked as the
  elliptical return "What about yours?" (P-047), family
  size ("Do you come from a big family?", P-097), and the
  have-phrasing of the pets question ("What pets do you
  have?", P-111) — and the occupation shape fired on a
  leisure question ("What do you do for fun?" answered "I
  don't have a job.", P-060). *Closes when:* the family
  grows by general shapes — the doing's sphere
  discriminates the matter, the questioned noun the graph
  drops is filed from the surface's own record, and the
  elliptical return is read as the self-query it is when
  the system's corresponding fact is a limits fact.
  *Status (2026-11-19, S1 of the S programme, in the
  worktree, unpushed):* **closed for the named shapes.**
  Four additions, all in assess.ts's C3 family except where
  noted: (i) the do-shape's matter is discriminated by the
  doing's sphere — a purpose adjunct naming leisure ("for
  fun", read from the token record, the graph dropping the
  adjunct whole) files the matter as hobbies, and the
  answer is the limits denial in its own terms ("I don't
  have any hobbies.", the same sentence the have-shape
  gives "Do you have any fun hobbies?"); the occupation
  answers stand byte-identical. (ii) The wh-NP have-shape:
  when the theme the having ranges over is the question
  word itself, the possessed noun rides in the question
  word's own phrase and the graph drops it — the token
  after "what" files the matter when it is a content word
  ("What pets do you have?" → "I don't have any pets.";
  "What do you have?" leaves the auxiliary there and is
  not captured). (iii) The family-origin shape: a 'family'
  node standing as the source (a location edge with the
  'from' preposition) of a verb the addressee agents files
  the family ("I don't have a family."). (iv) Shape (h),
  the elliptical return: the whole utterance is "what
  about" + yours/you/your-NP and nothing else (a topic
  return — "What about the strike?" — is never captured);
  a your-NP return names its matter on its face; a bare
  return resolves its matter from the visitor's immediately
  preceding surface (the last person object's retained
  surface) when that surface speaks in the first person
  and puts a matter of the family's vocabulary in play —
  a possessive phrase, a born statement, a have-possession
  (RETURN_MATTERS in assess.ts). The name routes to the
  identity presentation, the Identity table's fact, not a
  denial. Because the parser names the return's lone topic
  node a topic proposal, the assessment's self-fact
  recognition now outranks that one discourse act; and the
  composition gate (segmentActKind in turn.ts) classifies
  a return-shaped segment as a self-query, the matter being
  resolvable only once the preceding segments are recorded.
  P-047's turn now answers "Ok. Noted. I don't have a
  birthplace." *Residues, recorded not papered over:* a
  bare return whose matter sits in a preceding segment the
  sentence layer could not take up at all (P-111's "i've a
  pet", skipped by the composition) still cannot resolve —
  the matter never entered the record; and run 2's second
  C3 over-firing (a fused greeting + health enquiry
  answered with the full self-introduction) stands
  untouched — it is an initiative-gating question, not a
  shape question, and S1 does not reach it.
- **Social forms the C-stack did not draw: the offer of
  help, the either/or question, the remaining how-are-you
  phrasings.** (Located by probe run 2, 2026-11-18; the
  run's record above names the shape: question-type
  declines persisting behind received greetings, 43 turns
  across 36 probes.) The fused turn's greeting segment was
  received and its content segment declined, because three
  forms had no drawing: "Can I help you?" (P-065, P-066,
  P-070) routed to the question path as a question-type
  mismatch; either/or questions ("Do you prefer milk or
  dark?", P-056; "Are you an aunt or uncle yet?", P-107)
  read as property questions about the alternatives; and
  the how-are-you family beyond its first drawing — the
  doing forms with time adjuncts ("how are you doing
  tonight?"), the comma-less fused greeting heads ("good
  evening how are you?", "hey there how are you today?"),
  and the there-greeting as a segment. *Closes when:* each
  form is drawn on the shape it names and answered as the
  act it is, under the C-stack's narrowness discipline.
  *Status (2026-11-19, S2 of the S programme, in the
  worktree, unpushed):* **closed for the named forms.**
  (i) The offer of help is recognised in assess.ts (the
  graph shape — root 'help' under 'can'/'may', the visitor
  as agent, the system as patient — and the how-prefixed
  variant read from the token record, its graph drawing
  the agent as 'how'), flagged on the act (act.offerHelp);
  the Social Unit's reading records it as the act it is
  and raises an offer-answer demand, and the Planner
  answers in kind with a clean decline — "No, thank you."
  — stating no need and inventing none, and not seizing
  the helper's role the visitor is standing in. Fused
  forms compose ("Good evening. No, thank you.").
  (ii) The either/or is drawn as a question form with two
  addressed sub-forms, answered from the limits facts: the
  preference form (a 'prefer'/'like' root the system
  agents, an 'or' node joining the alternatives) answers
  "I don't have a preference."; the being form (a copula
  predication of 'you' whose predicate carries the 'or'
  and the first alternative as qualifiers) answers in the
  question's own form — "I am not an aunt or an uncle." —
  with an or-headed variant recovering the dropped second
  alternative from the token record ("I am not a cat or a
  dog."). An alternative naming the system's own kind
  (system/ai/computer/program/machine/bot/assistant)
  defeats the being form, so the neither-answer never
  denies a held self-fact; a volition form ("Do you want
  tea or coffee?") and an either/or not addressed to the
  system are not captured. (iii) The wellbeing family
  widens by its own material: 'tonight' joins the phatic
  set beside 'today', and the patient/theme guard no
  longer counts a time-word target as a manner question's
  object (the doing forms graph the adjunct as patient);
  splitTurnSegments peels greeting phrases with their
  'there' ("hi there, …") and comma-less greeting heads
  before a how-tail ("good evening how are you?"); the
  there-greeting itself is drawn (a topic 'there'
  qualified only by a greeting word) and mirrors as a
  greeting; 'greetings' joins the greeting forms. The
  specimens now answer "Hello. I am fine.", "Hey there. I
  am fine.", "Greetings. I am fine." *Residues, recorded:*
  a vocative inside the enquiry segment still sinks it
  ("Hello, Mr. Black, how are you?" — the parse draws the
  title as the predication's subject and drops the 'how';
  P-079 keeps its decline); the adjective either/or ("Are
  you happy or sad?" — the second alternative dropped, the
  predication drawn otherwise) is not drawn, its honest
  answer belonging to the feelings register's questions,
  not this form's; and the fragment either/or ("business
  or pleasure??", P-050) rides on partner-supplied context
  the protocol does not feed and stays undrawn.
- **Multi-sentence turns took the merged parse by
  default.** (Located across both probe runs; C1/C2 built
  the exceptions.) Segmentation existed only where a
  social segment fused (C1) or a failure exit recovered
  (C2); every other multi-sentence turn went to the
  sentence layer as one utterance, and the merged parse
  merged or silently dropped segment content — themes and
  about-phrases a segment carried never reached the record
  or the reply. *Closes when:* the segmented route is the
  default for multi-sentence turns, the merged parse
  remains only where a single graph is genuinely required
  (the cases named), and nothing a segment carries is
  dropped without a name.
  *Status (2026-11-19, S5 of the S programme, in the
  worktree, unpushed):* **closed.** The head of the turn
  now composes every multi-segment turn
  (composeSegmentTurns, R3's shaping as before); a
  composition that takes nothing up still falls through to
  the merged path, whose exits remain the second line. The
  merged route's surviving cases are named in the code:
  (1) a segment's own processing; (2) the
  clarification-fallback re-entry (the system's own
  reprocessing of one utterance on a settled reading);
  (3) a standing clarification pending WITH candidates —
  the fill is judged against the whole turn as delivered;
  (4) a whole-turn gibberish judgement — the Normalcy
  Unit's flag is read on the utterance as one object, and
  segmenting a gibberish turn produced a per-segment
  clarification cascade in place of the designed repair,
  so the head route yields to the flag (read by a
  read-only pre-assessment in the flow's own order). A
  segment that cannot be taken up is skipped and named in
  the trace, as C2 established; per-segment failure stays
  located. Four pins moved with the route change, each
  recorded in place: the C1 scope pin (its premise was the
  scope S5 generalises), the C2 recovery's ground string
  (the composition now happens at the head), the R3 P-086
  pile (the first segment is now genuinely the first turn,
  and its fuller bare form is the ack that stands), and an
  E1 composition reply (the leading segment's
  acknowledgement now stands at the head). *Residues,
  recorded:* the brief's second specimen — "What did I say
  about the soup?" losing its about-phrase — is not a
  merging loss: the question is one sentence, and its own
  graph drops the about-phrase at the sentence layer; S5
  gives such a question its own parse wherever it rides in
  a longer turn, but the drop itself is a parse-layer
  remainder, standing. P-075's dropped 'flowers' is the
  same species (a single-sentence need-statement whose
  theme the graph does not carry to the gap question).
- **Composed replies pile up bare acknowledgements.**
  (Located by probe run 2, 2026-11-18; the run's record
  above names the shape.) C2's segment composition
  concatenated the per-segment replies as they came, so a
  multi-act turn whose acts were mostly tellings answered
  with a pile — "Ok. Ok. Ok. Ok." (five finals in run 2) —
  one acknowledgement per act, reading as no acknowledgement
  of the turn as a whole. *Closes when:* a composition is
  shaped as one reply — a single leading acknowledgement,
  the substantive segment replies kept, duplicates
  collapsed.
  *Status (2026-11-19, R3 of the recognition programme, in
  the worktree, unpushed):* **built.** The composition now
  shapes its replies: the plain acknowledgement forms ("Ok.",
  "Ok. Noted.") collapse — the first stands when it precedes
  the composition's first substantive reply, every other is
  dropped — while named acknowledgements and recognition
  receipts, which carry the name or what was retained, stand
  wherever they fall. `trace.segmented` keeps the segment
  replies as processed; the shaping and the stand-downs are
  counted in the trace's composition record. Whether the
  shaped replies meet the bars' standard is the probe's to
  judge (run 3).
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
  *Status (2026-11-19, R2 of the recognition programme, in the
  worktree, unpushed):* **the receipt form is built.** Where a
  statement turn's reply would be the bare "Ok." and the turn
  established something the registers hold, the acknowledgement
  now shows it, rendered from the record's own fields by the
  existing constructions: a predicated state through the
  Planner's predication construction ("Ok. The garden is
  cold."; "Ok. You are happy."), a recorded event with its
  object filled as a clause in the statement branches' own
  family shape ("Ok. You put the salt in the soup."). The
  discipline is narrow by construction — only this turn's
  established content, only as the record holds it: the first
  turn keeps its fuller form (already the receipt's base), the
  naming turn keeps C6's (the name is that turn's
  recognition), negated tellings and verb-carried states are
  not predicated, objectless events render no clause, and a
  quantity-bearing telling keeps the plain form (its retention
  is the ledger's to show; the owner-approved apples specimen
  pins it). Topics are named through the state or event that
  established them; a bare entity mention with neither remains
  a bare acknowledgement — that residue, and whether the
  receipts meet the bars' full standard, are the probe's to
  judge (run 3).
  *Status (2026-11-19, E1 of the emotional-uptake programme,
  in the worktree, unpushed):* **the feeling half is built.**
  What a turn established now includes a feeling the visitor
  stated in the first person even when its clause did not
  parse (the feelings-first registration, next item): such a
  feeling is receipted by the same construction — "Ok. Noted.
  You are sad." where run 2 answered the rephrase request —
  and an element-carrying feeling steers as a parsed one
  does. Registered feelings are also the record the R1
  feeling answers read, so "Am I worried?" reaches a feeling
  however it was registered. The residue stands as R2 left
  it: a bare entity mention with neither state nor event is
  still a bare acknowledgement, and run 3 judges the whole.
  *Status (2026-11-19, X1 of the X programme, in the
  worktree, unpushed):* **receipts now draw on the whole
  record, not the current segment.** A formed receipt
  appends one link to earlier material the record holds:
  an earlier EVENT sharing a content lemma with this
  turn's event, rendered under attribution through the
  shared admission ("Ok. You put the salt in the soup.
  You told me the soup needed the salt." — the need told
  at turn 2, the putting at turn 3); else an established
  TOPIC named by the receipt's referring lemmas, re-
  tellings excepted — the P-036 specimen: "Ok. You
  injured the leg. We were talking about the leg.", where
  run 3's receipt showed the event and no connection.
  Narrow by construction, as R2 was: the link must be in
  the record (entity/topic identity, an earlier event's
  shared lemma) — resemblance is not a link — first
  mentions render exactly as before, and anything the
  admission will not speak falls back to the plain form.
  Three disciplines came with it, each against a shape
  run 3 named. *A name is recorded as told:* a
  capitalised matcher-corrected surface after the first
  token records the surface, not the guess — P-030's
  name stands in the record as 'roxie', so its receipt
  now renders "Ok. Her name is roxie." where S0 could
  only stand the garbled form down (run 3's "repaired,
  not yet recognised" is this slice's follow-through;
  whether it earns the probe's pass is run 4's to say).
  *Person discipline:* the record constructions render
  the visitor's 'my'/'mine' as 'your'/'yours' — run 3's
  most serious near-case ("Ok. My major is science.",
  P-068; "Ok. Mine is green.", P-103) is the shape this
  closes. *Admission vetoes:* closed function words and
  single-character fragments are not fills (run 3's
  particle/clitic echoes — "You donned the t.", "You won
  the be to t.", "You are one."), and numerals are not
  receipted qualities. Seven R/S pins re-pinned, each
  with its reason in place; at the programme's gating,
  three further pins (the soup receipt in the turn tests
  and in the R0 acceptance, the C4 name pin) were
  re-pinned to the linked and as-told forms with their
  reasons recorded — each verified as the designed
  behaviour against the trace, not merely accepted.
  *Run 4 remainder (2026-11-19, located by probe run 4
  against this slice):* **the link machinery renders
  recognition past the point the record or the moment
  supports.** Three shapes. (i) *The link path is
  apparently not under R3's boundary discipline the way
  initiative is:* P-072's final was the clean "You are
  welcome." in run 3; run 4 appends a garbled attributed
  tail — "You are welcome. You watched the now." — to the
  THANKS receipt, and the probe's pass went with it (pass
  → partial, the run's only regression). A receipt link
  must stand down on a boundary reply as a steering move
  does. (ii) *The topic link does not yet discriminate a
  conversation's topic from any word the conversation
  contained:* it fires on content lemmas — true topics
  (the leg, P-036; the tea, P-080; the seed, P-097; the
  summer, P-103); thin (the meat, P-034 — the current
  turn's own word echoed back as if it were history);
  noise-grade (the day, P-053; the wow, P-127 — the
  visitor's exclamation rendered as a topic). (iii) *The
  attributed rendering runs ahead of the rendering it
  carries:* "You told me…" turns rose 1 → 3 in run 4 and
  two of the three are garbled — "You told me the accident
  got the well." (P-110), "You told me you went the work."
  (P-071) — genuinely held material scrambled under
  attribution (S0-adjacent: the attribution form is
  admitted where the clause it carries would not be). And
  the standing specimen of the slice's limit: P-036's link
  fires in its designed form — "Ok. You injured the leg.
  We were talking about the leg." — and the probe does
  not move, because the note demands connection to the
  HISTORY (the pain, the stopped weightlifting), and a
  topic-grade link is not a history-grade connection. That
  gap — topic-grade against history-grade recognition —
  is where this item now stands.
  *Status (2026-11-19, X4 of the X programme, in the
  worktree, unpushed):* **the Interlocutor's picture is
  used continuously, not only at the naming turn.** The
  self-fact readers answer from the picture as told —
  testimony: the visitor's claims, held as theirs.
  Occupation: "What do I do?" and its "for work" form
  answer from the standing noun state, where the
  missing-role decline stood. Possession: "Do I have a
  dog?" answers yes or no from the record's have-events,
  in the question's own theme material. Name
  remembrance: "Do you remember my name?" answers from
  the Interlocutor register, and the name-value question
  is caught in the predicate answerer — "What is my
  name?" from the register, "What is her name?" from the
  standing name state (P-030's other half: the name is
  now not only held and receipted, but answerable).
  Receipts acknowledge the person: a self-state the
  record already holds is receipted under the told-me
  attribution ("You told me you are guilty."), and the
  initiative scan no longer grounds on a state the
  current turn itself re-stated — a ground must be
  earlier material. The picture's contents bound every
  one of these: the system asserts nothing about the
  visitor that they did not establish. With X1, this
  item's closes-when is met in its acknowledgement form
  — acknowledgements name established topics, registered
  feelings and the visitor's own told facts from the
  record, in the reply programme's own forms — and bar
  9's full standard, like bars 4 and 5, is run 4's to
  judge: run 3 left it at 4/11/8, its passes all
  self-answer probes, the system's picture of itself.
- **A feeling registers only when its clause parses.**
  (Located by probe run 2, 2026-11-18; the run's record above
  names the shape — the rephrase-final remainder is the
  multi-clause emotional core.) A feeling entered the record
  only through a parsed predication, so a turn whose feeling
  clause was carried by a verb ("I'm so scared…", graphed on
  'scare'), dropped by a merged parse ("i'm so excited
  because…", graphed on 'excite'), or sunk with its turn at
  the token exit ("I'm so sad because i've…") registered
  nothing — and the whole turn fell to the rephrase request
  or the bare acknowledgement, feeling and all.
  *Status (2026-11-19, E1 of the emotional-uptake programme,
  in the worktree, unpushed):* **built — feelings-first
  registration.** A segment carrying a clear first-person
  emotion statement registers the feeling even when the
  clause does not parse: it is the visitor's own stated
  feeling, so testimony is safe. The scan reads clause-
  initial first-person frames (the copula forms, the feeling
  form, the feel forms, negated feel forms) over the turn's
  segments and their because/but/and clauses, and files the
  word it finds through the system's existing authorities
  only — the classification table's emotion aspect, the
  EDU's canonicalEmotion map, the LEDU's uncategorised
  register. Registration runs where a feeling could
  otherwise be lost: the parse-failure exit and the token
  exit (the receipt replaces the rephrase), the record
  block of a merged parse (the feeling then steers or is
  receipted as any recorded state), and inside compositions,
  where a feeling-carrying unparseable segment is routed
  through the turn machinery instead of skipped. Supersession
  is the record's own: worried stands down when happy is
  stated. The disciplines are the standing ones: only the
  visitor's own stated feeling (a third person's registers
  nothing), only as stated (no inference), subject-less
  fragments ("kinda getting worried") are not read, and a
  copula adjective immediately followed by "not" does not
  file ("I'm afraid not" is a formula, not a fear report).
  *The filing rule (the owner's ruling, 2026-11-18, as
  built):* an emotion word files under its canonical
  category and takes the category's Suwen element — anger →
  Wood, joy → Fire, pensiveness/worry → Earth, grief/
  sadness → Metal, fear → Water — recorded with that
  provenance (category filing + Suwen category fitting).
  E1 filed the everyday words the evidence touches: angry
  (anger), happy/glad/excited (joy), sad/gloomy/lonely
  (grief), afraid/scared (fear). A filing may carry a
  **degree qualifier** — the same species of qualifier as
  Part H's rate on a cycle relation (rust: Fire controlling
  Metal, slow): furious is anger at high degree, excited is
  joy at high degree, gloomy is grief at low degree; the
  Glasgow register (data/glasgow) is the degree evidence
  where a filing carries one (furious arousal 6.43 > angry
  5.91; excited 7.88; gloomy 2.94 < sad 3.94) — evidence
  only: Glasgow has no categories and supplies no filing.
  A **mixed** emotion word is not an average of categories:
  it is named by the cycle relation between its components
  — the owner's example is bittersweet (the Wood controls
  the sweet, Earth; a second reading stands beside it:
  bitter, Fire, generating the sweet). Bittersweet is a
  design-informing example — a specimen the general
  machinery must be able to express — not a determination:
  neither reading is encoded as the word's entry, and no
  mix machinery is built in E1. No new graph was needed for
  any of this: the filings are table additions in the OKU
  data-in-code layer (the classification table, the EDU's
  canonical-face map), where EDU data was settled to live
  (2026-11-16); CSKG does not deal with it (its trim holds
  only undirected RelatedTo edges and person-attribute
  rows — no category filing, no degree, no fittings).
  *Awaiting the owner:* **guilty** — it names a feeling, and
  registers (element-less, receipted from the record), but
  no category claims it reliably: it stands between grief
  (regret over what was done) and shame (the self as seen),
  and a fitting, if one is made, is the owner's to give.
  'sorry' was held on the same ground briefly — in
  conversation the word is formula first (all seven run-2
  occurrences are formulas) — and is filed under grief:
  its feeling sense is sorrow, its WordNet climb reaches
  grief's anchor and derives Metal independently, and the
  owner's ruling names grief its natural filing; the two
  authorities agree, and the formula uses are the social
  layer's forms, which never reach a predication. The
  judgement is recorded so the owner can reverse it with a
  word. *Remainders:* subject-less and embedded feeling
  fragments stay unread by design; what run 3 shows of the
  feeling half of bar 4 is the probe's to judge.
  *Addendum (2026-11-19, S4 of the S programme):* two of
  this item's specimen turns changed route under frequency
  attestation — the P-005 shape and the negated-feeling
  shape sank on "i've", a word of ordinary currency, which
  S4(a) attests; both turns now take the ordinary statement
  path, the feelings register (negation included) exactly
  as the receipt recorded it, and the E1 tests were
  re-pinned to the new route with the reason in place. The
  token-exit's feelings-first receipt stands for genuinely
  unattested sinks. *A remainder the route change made
  visible, recorded not built:* on the ordinary path, a
  verb-carried NEGATED feeling steers in the unnegated
  form — "I don't feel sad." draws "You were sad. What did
  you say or do?", though the record holds the state
  negated. The behaviour predates S4 (it needs no attested
  token) and belongs to the steering family's soundness,
  beside S0's items; widening it is a determination, not a
  fix, and it is not S4's to make.
  *Status (2026-11-19, X0 of the X programme, in the
  worktree, unpushed):* **closed — the determination was
  made and built.** Steering respects the record's
  negation: branches (a) and (c) of the steering family
  gate on the new state's negation, the stand-down is
  named in `trace.steeringNote`, and the acknowledgement
  path answers the turn — "I don't feel sad." now draws
  "Ok. Noted." over the state standing negated, and the
  restrainer branch stands down the same way ("I don't
  feel worried." after a sleep telling draws "Ok.", not
  "…and you were worried."). Branch (b) and the
  initiative scan already excluded negated states and
  needed no gate. One E1 pin re-pinned, its reason in
  place. *Refinement, made at the programme's gating the
  same day:* the gate as first built stood down EVERY
  negated state in branches (a) and (c), and the gate run
  caught what that cost — "I couldn't sleep." drew the
  plain ack with no cycle path, breaking the priced
  steering's founding specimen (the worry-sleep scenario,
  r4-3). The stand-down's object is a rendering that
  DROPS the negation — branch (a)'s predication and
  branch (c)'s predicated shape both speak the state in
  its positive form — while branch (c)'s verb-carried
  shape renders the negation itself ("You can't
  sleep."). The gate therefore stands down a negated
  state only where no negation-faithful shape stands for
  it: branch (a) keeps the gate whole, branch (c) admits
  a negated verb-carried state, and the specimen steers
  again with its cycle path, pinned in the X tests beside
  the stand-down specimens. The rule the refinement
  states: steering from a negation it renders faithfully
  is not the misreading; steering that asserts what the
  record denies is.
- **The rephrase remainder, measured.** (E2 of the
  emotional-uptake programme, 2026-11-19.) The run-2 record
  above describes the 81 rephrase finals as "the multi-clause
  emotional and narrative core whose every segment defeats
  the sentence layer". Measured against run 2's raw results,
  that description does not hold: 48 of the 81 turns have
  every segment parsing standalone. The exits decompose as
  ~65 token-exit (the whole parse succeeds; one unresolved
  token with no candidates sinks the turn) and ~15 parse-exit.
  The token sinks are mostly not words: punctuation tokens
  ('--', a spaced '.', '?', ':)', ~20), the corpus's own
  '_comma_' transcription artifacts (~15 — instrument noise,
  not a system gap), digit tokens ('2007', '98%', ~12), fused
  tokens ('a.m.when', 'chihuahua.It'), and genuine unknown
  words and typos ('wallmart', 'girlfirned'). Segment-level
  parse failures inside multi-clause turns number 63 segments
  in 55 turns, and most are fragments and interjections —
  the social layer's territory, the S programme's — not
  narrative constructions.
  *Status (2026-11-19, E2, in the worktree, unpushed):*
  **the general constructions in the remainder are built.**
  (1) *Degree adverb grading a quality* — "a very kind
  statement" (P-019), "in a really bad spot" (P-010), "very
  good schools" (P-105): no chunk admitted an adverb +
  adjective pair, so the complement threw where the quality
  resolved noun-first ('good', 'bad', 'kind') and silently
  dropped its noun where it did not ("It is a really big
  house" graphed as 'big' alone). The chunker now admits
  the pair — the quality after a degree adverb is read as
  an adjective on position's evidence (a noun adjunct
  cannot be graded), the adverb attaches to the quality's
  node by the modulates closure — and the copular branch
  reads a bare predicate quality the same way ("The spot
  was really bad"). (2) *Object-head relative clauses* —
  "I have a part-time job that I love" (P-024): the R5
  relative branch, built for the subject-head shape,
  fired on any relative whose verb was verb-kind, rooted
  it on the clause-initial chunk, and threw on the absent
  copula; and the have-reclassification scan counted the
  relative's verb as the main clause's participle, keeping
  'have' an auxiliary with no main verb to serve. The
  branch is now gated to its shape (the clause-initial
  chunk's head is the item 'that' follows) and the scan
  stops at a relative 'that': the turn parses on the
  possession, the relative's content riding as the
  ordinary path's attachments — dropped as a clause, as
  it already was for other verbs' object relatives.
  (3) *Punctuation at the token exit*: a token with no
  letters or digits is not a word and cannot be the
  located gap the exit names — in a single-sentence turn,
  whose only sink it would be, it no longer sinks the
  turn (P-024's turn is taken up whole); a multi-sentence
  turn keeps the sink, the exit being the segment
  recovery's trigger and the recovery the better
  instrument there (the P-086 shape). *Remainders, located
  and not built:* digit tokens still sink their turns
  (P-030's "2007" — a number is content; whether a digit
  string's form attests it, as a capital attests a name,
  is a token-layer determination this programme does not
  hold); the subject-head relative with a verbal main
  clause ("The man that I saw has left") still throws —
  the R5 branch's copula assumption, a parser programme's
  shape, not this one's; the relative clause's content
  still does not survive as a clause in object position
  (the merged-parse content drop, already the S
  programme's inheritance); and the '_comma_' artifacts
  stand as measured — the instrument's noise, which no
  system mechanism should be built to absorb.
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
- **The accumulated record had no reader, and the current
  telling's register no answerer.** (Causal analysis,
  2026-11-19, causes C4 and C1; the analysis and the design
  record are held outside the repo. The owner's rulings of
  2026-11-19 commission the build: the reader as an
  Awareness unit beside the Social Unit, raising no
  demands; uptake as a Planner move family; one
  acknowledgement head per reply.) C4: the session ledgers
  held every fact, but no unit read them into a discourse
  structure — `TopicRecord` carried a lemma and two turn
  numbers with no linkage to its events or predications,
  and X1's link reconstructed connection by lemma-scan at
  render time. C1: empathic uptake of the current telling
  had no owner — the acknowledgement family's positive
  half was receipts, which show the record neutrally
  whatever register the telling carried. C4's primaries:
  P-001, 008, 033, 036, 061, 068, 105, 107, 112. C1's
  primaries: P-004, 007, 015–017, 020, 026, 027, 031, 044,
  082, 083, 085, 108–110, 120, 123, 128. Neither closes
  here: each closes on a commissioned sealed run meeting
  its primaries, invariants at zero (the design record's
  closes-when); the statuses below are build records, not
  verdicts.
  *Status (2026-11-19, DR-1 of the discourse/uptake
  programme, branch `build/discourse-uptake`, unpushed):*
  **the reader core is built** —
  `src/fork/discourse-record.ts` (unit
  awareness/discourse-record): topic histories (a topic →
  its events, standing states, and superseded states
  recovered from the supersession deltas, sequenced by
  turn and stream order), state movements (supersession
  chains as first-class objects), a per-holder state
  timeline, salience, and open threads (standing subject
  matter available for return, owed by nobody — not the
  Conversation register's pending). Every serving is a
  pure derivation on consult over the ledgers — no second
  store — and every served item carries a pointer to its
  ledger source; the unit tests audit the pointers to the
  records they name. The reader never speaks, never
  authors, never originates a claim, and raises no
  demands; consultees pull (DR-2 wires them).
  *Salience determination (owner ruling 5, 2026-11-19 —
  the weights set at build, recorded here as the
  determination):* standing-ness is the gate (a topic
  with no standing state held by it and no event
  mentioning it scores 0 and opens no thread); recurrence
  is the spine term, +1.0 per history item (events,
  standing states, superseded states alike — each is a
  turn the conversation spent on the topic); recency is
  a bounded bonus, +2.0 × 1/(1 + age in turns since the
  topic was last touched) — worth at most two returns and
  decaying hyperbolically, so freshness alone never
  outranks recurrence, and an old recurrent topic stays
  reachable at a closing many turns later.
  Visitor-emphasis is named and excluded from v1: the
  record carries no emphasis signal distinct from
  recurrence and the Social reading, and inventing one
  would file evidence nobody recorded. Gates at DR-1:
  suite 973 pass / 0 fail / 3 skipped (baseline 965 + 8
  reader tests); demo 29/29; holdout clean; sense
  A 11/11 · B 5/6; `ai:check` OK.
  *Status (2026-11-19, DR-2, same branch, unpushed):*
  **the consultees are wired** — the reader never speaks;
  each consultee pulls. (i) *Receipts:* X1's link consults
  the reader through the Planner's priced history source
  (plan.ts's `historySource` — a topic's history served
  with its salience as the source's price): where the
  established state's subject names a topic with a served
  history, the link renders the history's salient spine —
  the topic sentence plus its earliest and latest earlier
  events under S0's admission (P-036's shape: "We were
  talking about the leg. You told me you hurted the leg.
  You told me you rested the leg."), the spine's ledger
  pointers recorded in the trace. The leg is gated on the
  state-receipt call: on the event-receipt call the event
  leg's specific link (the earlier event sharing this
  event's fills) already is history-grade and is not
  displaced (the soup scenario's pin, re-pinned nowhere —
  it failed once in development and the gate is the fix).
  Lemma legs remain the fallback where no history
  qualifies. (ii) *Initiative:* the scan gains movement
  grounds — a feeling that moved (supersession chain,
  reader-served) whose head stands grounds a
  standing-feeling candidate its head's classified origin
  bars from shape (c) — and topic-return grounds are
  ranked by the reader's salience within their shape (the
  T-R6 cross-shape order untouched). (iii) *The Planner:*
  the priced source itself is the wiring (consumed by the
  receipt link and the closing); grounding question
  ANSWERS on histories — bar 5's full ask — remains the
  recorded remainder, not built here. (iv) *Closings:* the
  farewell mirror carries the reader's top-ranked standing
  fact where a topic's salience clears 3.0 under the
  determination and its latest standing state is
  unnegated, predicable and not the closing turn's own
  (P-068's shape: "Goodbye. The daughter is tall."), the
  serving named in trace.closingFact; a thin record closes
  with the mirror alone. Gates at DR-2: suite 979 pass /
  0 fail / 3 skipped (+6 wiring tests, no re-pins); demo
  29/29; holdout clean; sense A 11/11 · B 5/6; `ai:check`
  OK.
  *Status (2026-11-19, UP-1 + UP-2, same branch,
  unpushed):* **the uptake move family is built** —
  `src/fork/uptake.ts`, a Planner move family whose ground
  is the register authorities' filings as evidence with
  provenance, read by the same walk in the same order as
  E1's filing (the classification table's emotion aspect,
  the EDU canonical filings by way of the LEDU's canonical
  face map, the LEDU uncategorised register), joined with
  the telling's own predications (the feeling; the states
  it stands among — a third party's state is the move's
  object where the visitor's own reaction is the register;
  the event the telling rides with) and the reader's
  servings (the register's state timeline: a returning
  grief is not a new grief; and the event the register's
  earlier telling itself carried, served by the reader's
  event timeline, rides as a return's object — P-020's
  congratulation carries the achievement from the record).
  Rendering is generated from those inputs by the
  Planner's transforms — a stance predication (the record
  files exactly two stance qualities: 'glad' for joy,
  'sorry', the sympathy stance, for the rest; the matching
  lives in the object and in the degree modulator the high
  degree carries), the feeling predicated, the object
  after it under S0's admission. No stored phrases exist
  anywhere in the family, and the no-template audit is a
  test: same-register replies across different tellings
  share only what the shared inputs derive. The move
  never asks a question, and asserts nothing about the
  world — it takes a stance toward what the visitor
  supplied. Its record (the register episodes met) is the
  Planner's move record, kept in the session beside the
  initiative records — not the reader's.
  *Determinations recorded at build:* the ground's weight
  — degree (high 3, plain 2, low 1), +1 for a returning
  register, +1 for a riding event — and the threshold at
  2: a plain first telling is owed the move, a low-degree
  passing mention alone is receipt matter. The episode
  discipline: a restatement on the very next turn is the
  same episode (P-110's must-not) unless the record moved
  — a new word in the register, or a family supersession
  changing lemma or polarity, re-arms; a return after
  other conversation is a new episode, met on its
  returning ground. Grief's pace: where the move fires
  for grief it is the reply's whole acknowledgement — the
  generating follow stands down unpriced; for the other
  registers the follow may follow the head under its own
  derivation, the steering's ack half standing down (one
  acknowledgement head per reply, owner's ruling 4).
  *Gating as designed:* owed in an open-phase content
  statement with no higher business; stood down by a
  pending clarification or stance-repair, a non-open
  phase (ritual segments and closing boundaries), a
  matcher-substituted feeling (S0's discipline), the
  threshold, and the episode rule; question and request
  turns never reach the family's sites at all (P-086's
  limiting case holds by construction), and a third
  party's feeling with no marked visitor register grounds
  nothing (P-005's shape). Wired at four acknowledgement
  sites: the feeling-steering branch (composed; whole for
  grief), the third-person branch (the visitor's own
  reaction, the third party's state as object — P-083's
  shape), the event branch (a feeling riding with an
  event), and the acknowledgement fallback (the registers
  no steering branch can claim — the uncategorised, the
  unsettled canonical). The restrainer and venting
  branches are NOT wired: their business is relational
  steering over two records — higher business — and the
  move stands down there by the design's ordering.
  *Scope lines, recorded as built:* event-carried
  registers with no visitor feeling filed are not claimed
  in v1 — no existing authority files loss, achievement
  or threat on events, and inventing a verb-list authority
  would be an improvised filing; negated feelings ground
  nothing (X0's discipline generalised); the apology
  formula ('sorry' as the visitor's own word) is excluded
  by name — its meeting belongs to the social layer's
  forms, and the move over it would only echo. *Located
  remainders the sealed run will meet:* 'disappointed',
  'upset', 'devastated' and 'proud' file under NO
  authority (no classification entry, no canonical face),
  so the commiseration specimen's natural words draw no
  register — a vocabulary pass's business, recorded here
  rather than improvised; 'tired' files an emotion aspect
  at low degree and falls under the threshold as a passing
  mention. Three re-pins, all the same intended change of
  head (the E1 uncategorised-feeling pin, the X4
  restated-feeling pin, the R3 fused-feeling pin), each
  with its reason in place. Gates at UP-1 + UP-2: suite
  999 pass / 0 fail / 3 skipped (979 + 20 uptake tests +
  the reader's event-timeline test); demo 29/29; holdout
  clean; sense A 11/11 · B 5/6; `ai:check` OK. C1's
  closes-when stands as the design record states it — a
  commissioned sealed run meeting the 19 primaries at
  register, the negative gating specimens demonstrably not
  firing, the no-template audit passing; this build is
  the mechanism, not the judgement.
  *Status (2026-11-19, UN-1 + UN-2 + FIX — the
  narrative-uptake programme, branch
  `build/uptake-narrative` on the integrated tip
  `d71009c`, unpushed):* **the narrative ground is built**
  — UP-1's scope line above ("event-carried registers are
  not claimed in v1") is superseded by an authority, as
  the line itself foresaw. UN-1: `src/fork/event-register.ts`,
  a banked event-register table sibling to the
  classification table, filing event-kinds under the
  registers (death / loss / harm of a bound person →
  grief; the visitor's achievement → joy; threat to a
  bound person → fear; ruin of the visitor's own
  undertaking → grief at low degree), each entry this
  programme's determination with its ground recorded as a
  note. The governing doctrine is the owner's (below):
  register and degree are separate axes — the register
  from the event-kind, the degree from the kind's weight
  at the binding's closeness, the two determinations
  named apart in every derivation. The binding is half of
  every entry: the visitor's own agency or patienthood,
  kin by the surface's possessive or by unattributed
  standing in the visitor's own telling, possession in
  the surface; an event bound to nobody in the room (the
  neighbour's father — a competing possessor stands in
  the surface; the newborn in the news story) matches
  nothing. The guards are the family's: a modal,
  subjunctive or negated clause is not a told event; a
  telling occasioned by a mediated report on its own turn
  stands down (IMP-3's discipline). `assessNarrativeGround`
  stands beside the stated ground in `uptake.ts`, priced
  as derived support: the narrative threshold is 3 (the
  stated ground's is 2), cleared through the degree axis
  alone (high 3, plain 2, low 1, a returning event-kind
  +1) — a parent's death clears it on its telling; a
  plain narrative ground is receipt matter until the
  register returns. UN-2: the rendering licence is
  narrower than the stated ground's, by testimony
  discipline — the stance, and the event as told under
  the record's own S0 admission; **never a feeling
  predicated of the visitor**, who stated none. Where a
  stated feeling rides a narrative event, the stated
  ground owns the predication, as UP-1 already composes.
  The arm is wired at the plain-event branch and the
  acknowledgement fallback, only where the turn carries
  no stated feeling candidate; traces carry the ground
  (stated | narrative) and the entry id. The no-template
  audit gains a narrative arm. FIX, the three items run
  5 located: (i) branch (c)'s verb-carried early return
  no longer discards a registered firing — it composes
  under it as the branch's other path does (P-044,
  P-079); (ii) the steering ground discriminates a
  feeling bound to another's situation — `feelingObjectBound`
  gains the sympathy/apology leg (the formula 'sorry
  for …'; the empathy clause 'sorry, because I
  know/understand …', or a because-clause addressed to
  'you'), and its emotion test the LEDU-face disjunct,
  without which 'sorry' was judged by no leg;
  registration stands (E1's filing is the owner's), the
  receipt answers the turn (P-024; controls pinned: an
  own-act apology and an unbound own grief still steer);
  (iii) an adverbial subordinate clause carrying its own
  verb and roles records its own event at the recording
  layer — the span after the first adverbial
  subordinator, parsed on its own, roles as told, ahead
  of the root event (adverbial clauses only; complements
  and relatives stay the root's material; conditionals
  stay the conditional construction's; one per sentence;
  events only) — P-036's injury now stands in the ledger
  at its own grain, and run 6's reading of what that
  does and does not serve is in the run record above.
  Two re-pins, both the same intended change (FIX
  (iii)'s): the X1 P-036 specimen and the IMP-3 P-036
  control, whose link grade rose from topic to event,
  each reasoned in place. Gates per slice and at the
  programme tip: suite 1079 pass / 0 fail / 3 skipped;
  demo 29/29; holdout clean; sense A 11/11 · B 5/6;
  `ai:check` OK. *Withheld from the table, as owner
  questions:* anger at a complained-of act (the
  complaint's meeting is the social layer's, and no entry
  files it) and pensiveness at a setback (a real
  correspondence the programme judged contestable without
  a stated feeling) — the table ships without both, and
  they stand in the programme's report to the owner, not
  in the code. *Located remainders:* the DR-2 history
  leg's gating (state-receipt calls only) and its
  two-item threshold — P-036's full spine does not serve
  on the sealed conversation, by the reader's design, not
  the ledger's grain; the stance selection for the
  uncategorised registers ('sorry' for everything but
  joy), priced by P-044's held verdict in run 6; the
  subordinate clause's own modality is not retained, so
  narrative assessment reads root events only.
  *Owner determinations recorded (2026-11-19, the
  emotion filings):* first, a correction. An earlier
  same-day filing message (excitement/joy/love → Fire;
  grief/sadness/pensiveness → Metal; anger/irritation →
  Wood; fear/apprehension/fright → Water) was **corrected
  by the owner before any code was changed under it** —
  "we are going for attested in the tradition" — and is
  superseded in full: pensiveness → Metal, fright →
  Water and love → Fire under that message are withdrawn
  and were never carried. The governing determination is
  the **attested fivefold table**: Wood 木 anger /
  frustration — liver; Fire 火 joy / elation — heart;
  Earth 土 worry / pensiveness — spleen; Metal 金 grief
  / sadness — lung; Water 水 fear — kidney. Family
  variants sit inside the registers at degrees:
  excitement/elation under joy, irritation/frustration
  under anger, sadness under grief, apprehension under
  fear at low degree. **Worry files with pensiveness at
  Earth** — the standing tension (the classification
  table classes worry as Earth; the framework's canonical
  憂 stands at Metal) resolves to the table's Earth
  filing under this ruling, both provenances recorded,
  neither harmonised away. **Fright 驚 is not in the
  table**: it keeps its canonical unsettled standing.
  **Love is not in the table**: it stands in no filing,
  and its standing is reported, not changed. Adopted the
  same day (the owner's ".", accepting the
  recommendations): the **layered mapping** — the seven
  emotions （七情： joy, anger, worry, pensiveness,
  grief, fear, fright) are the *recognition vocabulary*,
  words filing into the seven-name space with variants at
  degrees; the five wills （五志） are the
  *correspondence layer*, element and organ attached
  where attested (joy Fire/heart, anger Wood/liver,
  pensiveness Earth/spleen, **worry Earth/spleen**, grief
  Metal/lung, fear Water/kidney). **Fright stands
  recognised but UNSEATED**: no element, no organ
  (attested — fright disorders the qi rather than
  residing); where 'fright' reaches the uptake ground it
  does so as a recognised register with no element
  correspondence, and the register walk now says so in
  those terms. **The six desires stay in the SenseUnit**:
  no desire→element bridge is built in this programme;
  the orifice bridge is deferred until a desire needs an
  element. *What the determinations changed in code, and
  what already agreed:* the register walk
  (`registerOf`/`degreeOf` in `uptake.ts`) gains the
  owner's filing layer — worry read at Earth/spleen with
  both provenances named in its authority string;
  apprehension filed under fear at low degree, elation
  under joy, frustration under anger (all three filed
  nowhere before); fright's authority string restated in
  the layered terms (recognised, unseated). Already in
  agreement, untouched: pensiveness at Earth/spleen
  (canonical, in the EDU's table and the classification
  table alike); excitement under joy/Fire; irritation
  under anger/Wood; sadness under grief/Metal; love
  filed nowhere. *Located divergence, recorded not
  rebuilt:* the EDU's canonical table itself
  (`edu.ts`) still seats 憂 (worry) at Metal/lung,
  against the ruling's correspondence seat of
  Earth/spleen; the layered mapping aligns what this
  programme touches (the register walk reads worry at
  Earth), and the EDU table's own restatement is a
  separate piece of work, not this programme's to
  improvise.

- **The vocabulary pass — V1: the register-word filings
  (2026-11-19, the owner's "1a" commission; branch
  `build/vocabulary-pass` on the narrative-uptake tip).**
  The discourse build's located remainder named four words
  no authority filed — disappointed, upset, devastated,
  proud — and the commission added a systematic sweep. The
  sweep extracted the emotion-bearing vocabulary of the
  sealed conversation set (the 128 probes' visitor turns)
  and the EmpatheticDialogues material (its 32 emotion
  labels among them): 169 candidates, tested against the
  three authorities (the classification table's emotion
  aspect; the LEDU's canonical face and the EDU's canonical
  names; the LEDU's uncategorised register). 17 stood
  filed; 152 filed under none. Each unfiled word was
  determined by the established routes only — the
  classification climb (WordNet ancestry to a filed anchor,
  the route that settled 'sorry'), the canonical face (a
  category's state form or degree variant; Glasgow arousal
  admissible as degree evidence only, cited as provenance),
  the category's own head entry — or withheld as
  contestable, under the standing rule that category
  fittings beyond the record are the owner's to give.
  **Filed (17 classification entries, 15 canonical faces):**
  *disappointed* → grief/Metal, plain degree — the
  canonical-face route: disappointment's feeling sense is
  dissatisfaction at an expectation not realized, grief's
  family (Glasgow arousal 3.82, beside sad's 3.94; degree
  evidence: the Glasgow register). *disappointment* →
  grief/Metal (the feeling noun of the same). *upset* →
  worry/Earth — **the climb's filing**: its state synset
  {disquieted, distressed, disturbed, upset, worried} IS
  the worried synset, so the climb reaches the filed
  anchor 'worried' at hop 0; the synset's gloss also names
  grief ('anxious uneasiness or trouble or grief') — that
  pole is recorded in the entry's note, labelled, and the
  filing is the climb's, not a harmonisation of the two.
  *devastated* → grief/Metal at **high degree** (its
  feeling sense: 'the feeling of being confounded or
  overwhelmed'; the Glasgow register carries no value for
  the word — recorded in the note, not supplied; the noun
  'devastation' was NOT filed — its dominant senses are
  destruction events, unlike the pure feeling-noun
  'sadness'). *proud* → pride/Fire at pride's own 0.7 (its
  gloss names pride). *annoyed* → anger/Wood at **low
  degree** (its gloss: 'aroused to impatience or anger' —
  annoyance is irritation predicated, and irritation files
  under anger in the owner's table). *anxious* →
  worry/Earth, the state of anxiety, as 'worried' stands
  beside 'worry' (the climb's rival — 'nervous' at
  Water/0.7 — is recorded here, not in the entry: the state
  synsets name uneasiness, and the category route governs
  the state form as it governed 'worried'). *apprehension*
  → fear/Water at low degree, and *apprehensive* → fear/
  Water at low degree — the owner's own 2026-11-19
  determination, entered in the table so it stands beside
  the LEDU face and the register walk's filing layer that
  already carried it (apprehensive's synset mate 'worried'
  is no counter-evidence: its gloss is dread of a possible,
  fear's forward face, as 'dread' already files).
  *ashamed* → shame/Fire and *embarrassed* → shame/Fire,
  both at shame's contested 0.6 (embarrassed's glosses name
  shame outright). *terrified* → fear/Water at **high
  degree** ('thrown into a state of intense fear'; no
  Glasgow value — recorded). *joyful* → joy/Fire (the
  state form). *hopeful* → hope/Wood and *optimistic* →
  hope/Wood (the sealed set's own use predicates it as a
  state: 'grateful and optimistic in one quick moment').
  *jealous* → jealousy/Wood. *content* (the adjective) →
  contentment/Earth, keyed to the emotion aspect as the
  (concept, aspect) discipline keys 'cold'; the noun's
  senses are not this entry.
  **The worry-seat discipline (a located fragmentation,
  recorded, not repaired here).** Two of the filings —
  'anxious' and 'upset' — stand WITHOUT a canonical face,
  deliberately. A face to 'worry' would route their
  register reading through the EDU's canonical seat for
  憂 (Metal) ahead of the table — against the owner's
  layered determination, which seats the worry register at
  Earth. The worry faces the owner's determination itself
  covers (worry/worried/anxiety) read their filing from
  that layer in the register walk; 'anxious' and 'upset'
  register under their own names at Earth until that layer
  is extended, which is its owner's to do. The uptake
  behaviour is otherwise identical (the stance and the
  threshold read the register's filing, not its name); what
  fragments is the register NAME in the trace ('anxious',
  'upset' — not 'worry') and any future counting by
  register.
  **P-027, before and after.** Before: "I am disappointed."
  drew "Ok." — no register stood, no uptake was owed, and
  the specimen's commiseration shape was pinned as this
  pass's located remainder. After: the feeling registers
  through the table (grief, Metal); the trace prices it
  grief / plain degree / weight 2 — the plain first-telling
  weight, clearing the stated threshold (2) on its own
  numbers, no threshold tuned — and the reply is the
  move's whole acknowledgement at grief's pace: "I am
  sorry. You are disappointed." Over the specimen's own
  telling ("My weekend was ruined. I am disappointed.")
  the event is receipted and the feeling met: "Ok. I am
  sorry. You are disappointed." The uptake test's remainder
  pin is re-pinned to the filed behaviour, its reason in
  place.
  **Two machinery notes.** (i) The anchor audit gained two
  named collided anchors: 'anxious' and 'apprehension' are
  cue anchors whose every cue-selected synset was pinned
  first by a named rival (the anxiety synset is 'nervous''s
  pin; apprehension's fear synset is 'dread''s) — the
  report already named collisions as inspectable; the
  anchor test's invariant now admits the state only when
  the shortfall is fully explained by the named collisions.
  No climb behaviour changed: the pins were the rivals'
  before these entries existed. (ii) 'proud' meets the
  standing stance remainder — the move's stance is 'sorry'
  for every register but joy — so a pride telling is met
  "I am very sorry. You are proud." (its degree is high by
  the Glasgow evidence, arousal 6.09, read by the degree
  machinery's standing rule). The filing makes pride
  reachable; the stance selection is the move family's
  recorded remainder, not this pass's to tune.
  **Not filed, with evidence (the sweep's negative
  results).** 'irked' (P-012's object-experiencer use, "it
  really irked me"): its category is not in doubt —
  irritation, anger at low degree — but NO filing was
  entered, because the word cannot reach the filing
  machinery: the verb stands outside the parse's verb
  inventory (every carrier shape sinks at the parse exit)
  and its surface mis-resolves at the token layer ('irked'
  → 'red'). A table entry would be inert data claiming a
  filing the system cannot use; the word waits on the verb
  inventory, not on a category judgement. The stances and
  traits (anticipating, confident, prepared, faithful,
  trusting, shy) file nothing — no register claims them.
  'alone' is a circumstance (P-113's own testimony: "i am
  alone but i'm not lonely" — loneliness carries the
  feeling). 'bad' (P-010 "I felt really bad") is unspecific
  negative, borrowing its register from context; no
  category claims it. 'hurt' in the material is a verb
  done to a third party; 'hate' a verb of attitude toward
  an object; neither is a predicated state. 'empty',
  'trapped', 'lost', 'down' appear in idiom or event uses
  only. The stimulus-side adjectives (scary, stressful,
  terrible) name the occasion, not the feeler's state —
  the state forms are the filings' business. 'pleasure'
  appears in the formula "business or pleasure??" — the
  social layer's, though it climbs to joy in isolation.
  'tired' already stands filed as a body state (Earth) —
  not an emotion filing, untouched. Two grouped residues
  are extraction artefacts, listed as groups, no filing
  sought: frame-pattern false positives (function words
  and fragments the feeling-frame pattern caught) and
  norm evaluatives (amazing, awesome, beautiful, good,
  great, nice, wonderful and their kin — appraisals of
  things, not predicated states). 'desire' stands where
  the owner's ruling put it: the six desires stay in the
  SenseUnit. 'love' stands exactly as it stood — **no
  filing, its standing reported, not changed** (23 probes
  use it; the attested table does not carry it).
  **'guilty' stands unchanged** — the uncategorised
  register, element-less, the owner's to fit; its
  candidacies (grief, shame) stand as §2's earlier record
  states them.
  **Withheld — the owner's questions (unencoded, listed
  verbatim for the owner's word).**
  (1) *disgusted / disgust* (P-027's own Empathetic-
  Dialogues label): no seat among the seven claims it.
  For standing outside the scheme: disgust's core is
  revulsion at contamination, a rejection reflex the
  七情 list does not name. For Earth: the spleen/stomach
  idiom — revulsion is the stomach's rejection, and
  pensiveness/worry's seat is the spleen — a creative
  fitting, and weak. Withheld.
  (2) *grateful / gratitude* (P-015 predicates it):
  for joy/Fire — the pride precedent (a warm social
  feeling filed under its head at Fire) and its gloss, 'a
  feeling of thankfulness and appreciation'. Against: it
  is a directed, moral-social feeling — thankfulness
  TOWARD a benefactor — of a kind the seven do not
  obviously house. Withheld.
  (3) *nostalgic / nostalgia*: a MIX by the owner's own
  doctrine, and mixes are named by cycle relation, not
  averaged — grief/Metal for the loss leg ('unhappy about
  being away and longing for familiar things') and
  pensiveness/Earth for the longing-thought leg. No mix
  machinery exists; filing either leg alone would misname
  it. Withheld. **ANSWERED (2026-11-19): the owner ruled
  the mix — nostalgia is a mix of pensiveness, sadness and
  joy — and commissioned the machinery ("do mix
  machinery"). Both provenances stand: this question's
  two-leg reading, from the word's gloss (grief/Metal +
  pensiveness/Earth), and the owner's three-component
  ruling, which adds the joy/Fire leg the gloss reading
  did not carry. The entry stands filed in the emotion-mix
  table; the mix programme's entry below records it.**
  (4) *sentimental*: grief/Metal candidacy (tenderness
  toward what is past) against pensiveness/Earth
  (dwelling in feeling-thought); its uses in the material
  are too thin to price the legs. Withheld. **ANSWERED
  (2026-11-19): the owner ruled sentimental a mix of ALL
  FIVE elements — the five seated registers standing at
  once — superseding both single-leg candidacies above,
  which stand here as the question's provenance. The entry
  stands filed in the emotion-mix table; the mix
  programme's entry below records it.**
  (5) *surprised / surprise* (P-108 predicates it): the
  fright candidacy — 驚 is recognised in the seven but
  UNSEATED under the owner's layered mapping, and
  surprise's gloss ('the astonishment you feel when
  something totally unexpected happens') is fright's
  shape. Against: English surprise is valence-free (a
  pleasant surprise is not startle), and filing an
  unseated register's English face is a determination
  about fright itself. Withheld — this question is
  fright's standing, asked through its commonest word.
  (6) *impressed*: for joy/Fire via admiration ('a
  feeling of delighted approval and liking'); against —
  it is an evaluative stance toward another's work, not
  a state the seven name. Withheld.
  (7) *desperate*: for grief via despair (its gloss:
  'arising from or marked by despair or loss of hope';
  P-015's state-list use); against — its dominant use is
  urgency ('desperate for…', a desperate situation), and
  the despair filing would be carried by a minority
  sense. Withheld.
  (8) *caring*: love's everyday face in the material. The
  question is not caring's category but love's standing:
  whether the head's unfiled standing extends to its
  faces. Withheld with its head.
  (9) *Sentence-initial capitals and attestation* (§6's
  audit): 'Oulong' (P-080) is absent from the wordfreq
  table in both spellings ('oulong' too) and stands
  capitalised sentence-initially, where the proper-name
  pass deliberately does not reach — its specimen is
  'Wethr', a sentence-initial misspelling correctly
  doubted. Run 6 doubted 'Oulong' ("Did you mean long, or
  ruling?") and the parse then read 'long' into the
  telling. Extending the pass to sentence-initial
  capitals attests Oulong and every sentence-initial
  misspelling alike; holding it keeps the Wethr
  discipline and doubts the Oulongs. The pass's boundary
  is the owner's to move. Withheld.
  (10) *Regular derivations and attestation* (§6's
  audit): 'fascinatingly' is absent as a whole while its
  stem attests at 4.13. A suffix rule (a regular -ly
  derivation attests by its stem) is a form-class rule of
  the hyphen pass's family; against it, the same corpus
  carries derivations misspelt ('stupidiest'), and the
  rule attests both shapes alike. Withheld.

- **The emotion-mix programme — a mix becomes a filing form
  (2026-11-19, the owner's commission: "do mix machinery").**
  The owner's doctrine, standing since the bittersweet
  discussion: an emotion can be a MIX of elements, as a
  material is; a mix is filed by its COMPONENTS and their
  CYCLE RELATIONS — never averaged, never collapsed to a
  single element or register. Register and degree remain
  separate axes; a mix carries its own degree evidence. The
  layered scheme stands over the form: the components are
  named in the 七情 recognition space and seated by the 五志
  correspondence.
  **MIX-1 · The filing form.** The entries live in a table
  of their own, `src/fork/emotion-mix.ts`, beside the
  classification table: an entry names its word(s), its
  components as (register, element) pairs, and its
  provenance, in the vocabulary pass's manner. A mix word
  stands in NO classification entry — an entry asserts one
  element, and entering a mix word there would collapse it
  at the data layer. The components' cycle relations are
  DERIVED from the elements by the existing cycle machinery
  (GENERATES/CONTROLS, sentence.ts), never stored as
  assertions. The LEDU reading for a mix word (ledu.ts,
  served by the assessment behind the seated reading)
  serves the mix as such: the word as said (retention), its
  components, and their relations, the mix form named in
  the source line; the reading asserts no element, so a mix
  contributes nothing to the composition roll-up — a mix is
  not a predominance claim over an object.
  **The two entries (owner determinations, 2026-11-19).**
  *nostalgia / nostalgic*: pensiveness (Earth) + grief
  (Metal) + joy (Fire). The owner named the components
  "pensiveness, sadness, joy": sadness stands in the entry
  as the GRIEF component — sadness is grief's canonical
  face (the classification table files 'sad' under grief),
  so the component is the register and the owner's word is
  its face; both provenances are named in the entry's note.
  Derived structure: a generating chain Fire→Earth→Metal,
  with Fire also controlling Metal. *sentimental*: ALL
  FIVE elements — the five seated registers standing at
  once (anger Wood, joy Fire, pensiveness Earth, grief
  Metal, fear Water); both cycles run fully among its
  components. Worry is not a sixth component: it shares
  pensiveness' Earth seat, and the ruling counts elements.
  Fright is no component of any mix under this form: it is
  unseated, and a mix of elements has no seatless
  component. The two entries answer withheld questions (3)
  and (4) above, which are marked answered with both
  provenances.
  **MIX-2 · The register walk reads mixes** (uptake.ts's
  registerOf/degreeOf, and the E1 registration path in
  turn.ts's fileFeelingWord). A mix word registers as a MIX
  register (key `mix:<name>`); E1 registration records the
  state with the mix's name as its concept, no element, and
  the stated origin. The determinations:
  (i) DEGREE — the mix's own: Glasgow arousal read on the
  word itself at the family's standing thresholds, cited as
  provenance; a mix has no single register to borrow a
  degree from, and no component's degree or arousal is
  read. Both ruled words price PLAIN: 'nostalgic' carries
  no Glasgow value (the unmarked degree, said so in the
  evidence), 'sentimental' arousal 5.588.
  (ii) WEIGHT — the stated-ground spine, unchanged: degree
  (high 3 / plain 2 / low 1) + returning 1 + riding event
  1, threshold 2. The visitor DID state a feeling, in their
  own word; the mix form is named in the derivation. A
  mix's return is read on the MIX's own timeline (its
  register key), never on a component's: a component's
  standings add no weight — they feed the stance alone.
  Specimens: "I am nostalgic." — weight 2, fires. Restated
  after other conversation — returning, weight 3, met
  again (a new episode).
  (iii) STANCE — the determination: the stance follows the
  ONE component register the visitor's own record
  foregrounds — a component feeling of theirs standing
  (unnegated) in the record at the telling — and where no
  component is foregrounded, or more than one is, NO stance
  sentence is generated: the predication of the word as
  told is the whole acknowledgement head (the neutral
  acknowledgement). Choosing either filed stance
  unconditionally would collapse every telling of the mix
  to that one component; the foregrounded-component rule
  reads the stance off the visitor's own telling instead.
  Foregrounding reads REGISTERS, not elements: worry
  standing does not foreground the pensiveness component
  (they share the Earth seat but are two recognition
  registers), and a negated component state foregrounds
  nothing (the absence family owns negations). Specimens:
  sadness told, then "I am nostalgic." → "I am sorry. You
  are nostalgic." (grief foregrounded); joy standing, then
  nostalgia → "I am glad. You are nostalgic."; nothing
  standing → "You are nostalgic." alone. Through the front
  door the two-components-standing case is rare by the
  ledger's own grain — the value supersession keeps one
  emotion-aspect value standing — and the rule for it is
  pinned at ground level in the programme's tests.
  (iv) PREDICATION — the mix WORD as told is predicated
  ("You are nostalgic."), as for any stated feeling; no
  component is ever predicated of the visitor (they did
  not state one). The trace carries the mix's name and
  components on firing and on stand-down — the record's
  proof the mix was never collapsed.
  **MIX-3 · Presentation to future consumers**
  (determinations only; no Advice build stands in this
  programme). (a) THE ADVICE ANALYSIS (the Advice Unit
  design — workspace record ansci-advice-unit-design.md —
  is the consumer-to-be): what this programme's readings
  serve it is the mix GROUND — the component list as
  (register, element) pairs, the pairwise relations
  derived among them, and the foregrounded component where
  the record shows one. The analysis's counteraction reads
  PER COMPONENT: each seated component has a cycle
  position, and the 情志相勝 walk runs from each
  component's element; a mix as a whole has no element, so
  there is no single counteraction for it, and the mix is
  never an advice instrument as a whole. The serving also
  names the relations INSIDE the mix — a component can
  already counteract another within the visitor's own
  feeling (nostalgia: joy/Fire controls grief/Metal) —
  which is the analysis's natural first read alongside the
  foregrounded component. (b) THE DISCOURSE RECORD
  READER's movement servings, determined from the ledger's
  actual grain (and verified at reply level in the
  programme's tests): a mix register behaves as ONE
  register for return and timeline purposes — the reader
  serves it through the state timeline under its own
  register key, standing and polarity-superseded links
  alike — and as NO element for supersession purposes. The
  value rule can never fire for or against a mix state:
  registration passes it no classification aspect (a mix
  filing has none) and it carries no element, and a seated
  replacer reads the standing state's aspect from the
  classification table, where a mix word stands in no
  entry. Only the polarity rule reaches a mix state: the
  same word restated negated supersedes it. So a seated
  feeling stated after a mix does not supersede the mix,
  and a mix stated after a seated feeling does not
  supersede it — the mix register stands BESIDE the seated
  registers in the ledger, not in their slot; movement
  chains (built from the supersession deltas) contain a
  mix only at a polarity link.
  **Bittersweet stands untouched.** Its two readings —
  Wood controls the sweet (Earth), and bitter = Fire
  generating the sweet on the flavour axis — stand
  unreconciled in this record (the E programme's entry
  above carries both), neither is a ruled filing, and no
  mix entry encodes it: it remains the standing example
  awaiting the owner's reconciliation.
  The mix form now exists for the day the owner rules it.
  **Gates.** MIX-1: suite 1095 pass / 0 fail / 3 skipped
  (baseline 1090/0/3 + the five new tests), demo 29/29,
  holdout clean, sense A 11/11 · B 5/6, ai:check OK.
  MIX-2 and final: suite 1106 pass / 0 fail / 3 skipped
  (the MIX-2 code tip; MIX-3 changes no code), demo 29/29, holdout
  clean, sense A 11/11 · B 5/6, ai:check OK. No re-pins
  beyond the vocabulary pass's two withheld pins for the
  answered words (reasoned in place in its test file): no
  existing behaviour moved — the negative control
  ("I am sad.") is byte-identical, and every new leg stands
  only where no authority filed before, so the full suite
  is itself the regression check.

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
- **Attestation breadth: what counts as a word the system
  may not doubt.** (Located by the sealed probe runs; the
  conversation-facing record is §2's.) The token
  clarification's attestation (C4) read two sources — the
  hand lexicon and the resolver's own dictionary — and
  correct words neither files drew spurious clarifications
  across both runs (run 1: 12 finals; run 2's survivors:
  "Canning", "socialize", "roam", "lol", and the finals
  "replicate", "Dang"). Two determinations, ruled
  2026-11-19 (S4 of the S programme, in the worktree,
  unpushed):
  *Determination 1 — frequency attestation.* The repo's
  wordfreq table (`data/wordfreq`, wordfreq 3.1.1, CC
  BY-SA) is an attestation source for the clarification
  trigger: a word whose Zipf frequency reaches **3.0**
  (one occurrence per million words — ordinary currency)
  attests itself, though no lexicon files it
  (FREQUENCY_ATTESTATION_ZIPF in token-resolve.ts, read by
  isAttestedWord beside the existing sources). The line is
  drawn from the runs' own evidence: every surviving
  spurious specimen stands at or above it (canning 3.31,
  socialize 3.16, roam 3.46, lol 5.05, replicate 3.55,
  dang 3.65), and the corpus's genuine misspellings stand
  below it or outside the table (cimbing, wethr
  unattested; the keyboard row qwerty at 2.5). Below the
  line nothing changes — a rare or unattested token the
  resolver cannot settle triggers exactly as before, and
  where the table cannot load the older sources attest
  alone. *Residue, recorded:* the determination binds the
  clarification trigger (the turn layer's exit); the
  resolver still corrects a frequent-but-unfiled word
  inside the parse itself ("socialize" → "socialist"),
  and where the corrected graph fails, a short sentence
  sinks at the parse exit rather than the token exit —
  attestation at the resolver's own step is a further
  determination, not this one. The probe's own socialize
  turn, carried by its segments, is taken up whole.
  *Determination 2 — digit attestation.* A token carrying
  digits and no letters attests by its form, as a capital
  attests a name (the digit pass in turn.ts's token exit,
  beside C4's proper-name pass): a digit string is not a
  word a lexicon could file or fail to file — "2007" is a
  year, complete as written. This reverses E2's standing
  treatment (a digit token sank the turn, its gap located)
  on the attestation question only: the token no longer
  triggers a clarification, while the parse's own handling
  of the number is untouched, and a letter-digit mix keeps
  the ordinary discipline. The specimen is P-030's first
  turn ("…died on Christmas of 2007."), the rephrase
  bucket's largest single located remainder after
  punctuation: the turn is now taken up whole, and P-030's
  conversation stands recovered end to end (with S0's
  receipt soundness on its final turn).
  *The margin audited (the vocabulary pass, 2026-11-19).*
  Every word type the two sealed sets use (1,099 types:
  the conversation set's visitor turns and the v2 holdout's
  items) was tested against the attestation union and the
  turn layer's form passes. In the narrow band of the line
  (Zipf 2.7–3.3) stand 33 types: 21 at or above 3.0,
  attested by Determination 1 as drawn; 12 below it.
  Failing the union entirely: 36 types, of which the
  passes cover 21 — 15 digit strings (Determination 2),
  the hyphen compounds 'ex-girlfriend' and 'part-time'
  (IMP-1's compound pass; their parts stand at 4.81/4.68
  and 5.78/6.29), and 4 mid-sentence capitals (the C4
  proper-name pass: 'Darlene', 'Goblet' in its title,
  'Kalina', 'Ravenclaw'). Of the 15 types no pass covers,
  6 are the corpus's own misspellings ('cimbing',
  'girlfirned', 'stupidiest', 'wallmart', 'jst', 'reall')
  — the doubt working as designed — and the
  correctly-spelled remainder ('barbeque' 2.70,
  'calisthenics' 2.38, 'condiment' 2.70, 'corkscrew' 2.71,
  'geyser' 2.80, 'irked' 2.75, 'overheated' 2.89,
  'squeezes' 2.79, 'talker' 2.96, 'teases' 2.84,
  'typewriters' 2.71) drew **no** spurious clarification
  in run 6: the resolver settled each inside the parse,
  attestation being the trigger's last source, not its
  only one. ('irked' sank at the parse exit, not the token
  exit — its verb stands outside the parse's verb
  inventory; §2's vocabulary entry records it.)
  *Determination: the line stands as drawn at 3.0.*
  Lowering it toward 2.7 would attest eleven words that
  caused no failure, and the set's own error-shaped forms
  stand immediately beneath any lowered line ('jst' 2.44,
  'reall' 2.08, 'qwerty' 2.5). Two classes are recorded
  without a rule. *The possessive class:* 'neighbour's'
  (H-072) fails the union while its stem attests — a
  regular form, and the hyphen pass's inflection strips
  are its sibling shape — but its one sealed occurrence
  drew no clarification (it was confidently corrected to
  the plural inside the parse: the resolver-step residue
  Determination 1 already names as a further
  determination), and every pass in that exit answers a
  named failure; this one has none yet. The rule's shape
  is recorded here — a token ending in 's whose stem
  attests is attested by its stem — for the day a specimen
  fails on it. *The derivation class:* 'fascinatingly'
  (absent as a whole; its stem 'fascinating' stands at
  4.13) drew no doubt in run 6 either; it stands as an
  owner question in §2's vocabulary entry, beside the
  sentence-initial capitals, because the same corpus
  carries derivations misspelt ('stupidiest'), and a
  suffix rule attests both shapes alike.

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
  *Second determinations pass — the vocabulary pass
  (2026-11-19, the owner's "1a" commission; determinations
  entered as Part J of the repair programme; builds verified
  against the items' own sentences in
  test/fork-vocab-pass.test.ts — the items carry no expected
  graphs, so verification is the determined atom's presence
  on the item's text with its negative controls, not a
  score).* **Unblocked (7):** H-014 — the `contains` edge
  the parse already produced now atomises as a link (J.2),
  the G.5-pattern fix; H-059 — a turn-initial "No," before a
  tensed clause atomises as `discourse: act = correction`
  (J.1; generation does not yet carry the opener, so the
  atom's G1 preservation is a named remainder); H-060,
  H-068 — `discourse: act = topic-proposal`, the act the
  parse has recorded since D2, now atomised (J.1); H-061 —
  `discourse: act = reason-query` (J.1); H-020 — the ordinal
  atomises as the predicate's `ordering` attachment (J.3);
  H-021 — `chains-to` extended to the English ordering
  words: `tent|chains-to|campfire = before` (J.3, the named
  first candidate, landed). **Determination entered, item
  still blocked (1):** H-002 — the causal adjunct's atom is
  determined (J.4: `attachment: <cause>|cause =
  <predicate>`), but the parse never produces the main
  clause for its sentence ('moved' and 'picnic' become no
  nodes at all; the graph holds 'rain' as root, 'we',
  'indoors'); it waits on the English parse taking up a
  clause with a causal adjunct. **Still blocked, their
  waits made precise (13):** H-018 — the chains-to family's
  remaining member: its order is between clauses, and the
  English parse demotes 'cooked' to a `result` edge of
  'set', 'dinner' to its patient; waits on English
  multi-clause chaining in the parse (the zh chains-to path
  is the existing pattern; J.3). H-025 — the parse takes
  'people' as predicate and 'react' as patient; waits on
  verb coverage for 'react' and when-clause subordination.
  H-032 — its outcome content already atomises (`brown |
  result = go`, verified); the resulting-state predication
  waits on the parse retaining a category for result
  complements (the node records for 'brown' and the
  particle 'up' are identical in shape). H-033 — 'day'
  never becomes a node; waits on the copular-NP path over
  ordinal + of-PP descriptions. H-053 — both nouns dropped
  by the parse (passive 'relate', suppressed agent); H-066
  — 'rain' misread as predicate, 'related' as its result;
  both wait on coordinated-subject formation in questions.
  H-057 — 'make' misread as active with the bicycle as
  agent, the stranded 'of' lost; waits on the 'be made of'
  construction, and behind it on bicycle material data,
  which no determination here supplies. H-072 — the asked
  entity never becomes a node; the possessive 's is
  silently corrected to a plural inside the parse
  ('neighbour's' → 'neighbours' in its token record);
  waits on possessive-NP formation. H-075 — partitive,
  existential and quantity-question shapes none formed;
  waits on all three. H-076 — the parse roots the
  description at 'stock', losing 'price', 'Apple' and
  'right now'; waits on NP-head determination in copular
  questions. H-077 — partially atomised (the atoms that
  stand: `president | qualifies = current`, `president |
  modifier | chess`, `president | predicated-as | who`);
  'club' and 'in my town' never become nodes; waits on
  compound-NP formation and trailing-PP attachment. H-078 —
  'will' taken as the predicate root; waits on modal-copula
  question formation. H-079 — no determination entered, by
  design: F.4's declared ontology failure stands, and
  entering a determination for 'exact' would be the
  owner-level decision the item waits on (J.5). *What this
  item still waits on:* the third leg of its closes-when —
  a further re-authored set scoring these items (a
  custodian step, beyond this pass) — and, for the 14 items
  above whose determinations are entered or whose waits are
  named, the parse mechanisms each names.
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
│   ├─ [x] Second determinations pass for the 21 vocabulary-blocked
│          items (discourse acts · opposition · event ordering ·
│          manner · containment · cause; chains-to extension the
│          named first candidate) — DONE 2026-11-19, the vocabulary
│          pass: determinations entered as repair-programme Part J;
│          7 items unblocked (H-014, H-059, H-060, H-061, H-068,
│          H-020, H-021), H-002's determination entered with the
│          item still blocked on the parse, 13 still blocked with
│          their waits made precise (§7's item, in place). The
│          closes-when's third leg — a further re-authored set
│          scoring these items — remains a custodian step.
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
