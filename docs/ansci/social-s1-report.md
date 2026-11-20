# Social Unit S1 — build report (Track 1)

*Built 2026-11-18 in the track/social-unit-s1 worktree from main
fcd2a96, under the owner's Track 1 commission: Social Unit slice
S1 per the design's §11 (~/workspace/ansci-social-unit-design.md;
rulings 1a–5a). Slices S2–S6 are not commissioned. Nothing is
pushed; the work stands as a local branch commit awaiting the
owner's word, like every push.*

## What was built

- **The registers live in the Session** (session.ts):
  `interlocutor` and `conversation`, initialised by newSession
  to the design's empty shapes (§5–§6 of the design).
- **The Social Unit's code home** (social.ts): the register
  types and initialisers, and `readSocial` — the social reading.
  It annotates the assessed object on its trail (unit
  `awareness/social-unit`) and updates the registers: phase
  transitions (opening → open on greeting; → closing on
  leave-taking; closing → closed on the next arrival, reopening
  read fresh), contact (not-yet-known → first), a stated-name
  identity learned from self-naming statements ("I'm Sam." — a
  predicated-as from the speaker to a capitalised form the table
  doesn't know as a common concept), the social state (greeted /
  thanked count / leave taken), last acts, and the
  established-with-them pointers — content acts only, per the
  design's update rule (only speaker-attributed content writes
  in). Demands (greeting-return, farewell-return,
  thanks-receipt, self-answer) are recorded in annotation data
  for S2; nothing consumes them yet.
- **Assessment kinds** (assess.ts, semantic-object.ts):
  `leave-taking` (bare topic from a closed set — goodbye, bye,
  farewell), `thanks` (the bare topic "Thanks." and the one
  predication "Thank you."), `self-query` (an interrogative
  predication of "you" by a question word — "Who are you?",
  "What are you?" — carrying `act.selfQuery: "identity"`). All
  recognised from the parse's structure in the greeting's
  manner, never from the raw surface. Thanks and leave-taking
  are marked ritual, as greetings are.
- **The seam** (turn.ts): the reading runs in the assessed loop
  after Coherence's inbound analysis, before planning; its notes
  surface as `trace.social`; the map path gains
  `awareness/social-unit` when the reading had something to say.
- **Registry**: Social Unit 0% → 20%, Interlocutor 10% → 30%,
  Conversation 0% → 15%, summaries and code pointers updated;
  the unit's PLACEHOLDER.md rewritten to record S1.

## S1 is shadow — and the gate that proves it

No reply path consumes the reading. The new test file pins the
pre-S1 replies for the new kinds' sentences exactly ("Goodbye."
→ "Ok. Noted."; the "Who are you?" decline verbatim), so a
future slice that starts answering them must change the pins
deliberately.

## Gates (delivered runs, this worktree)

- Suite: **705 pass, 0 fail** (708 tests counted by the runner;
  main's base passes 698, + 7 new in test/ansci-social.test.ts).
  Correction, same day: this report first stated 717, computed
  from the chat-build tree's 710 baseline — that tree carries
  Slice A's 12 unpushed tests, which main does not have. The
  figure here is the delivered run's.
- Demo corpus 29/29 (27 exact); parser holdout 80/80; sense
  sets A 11/11, B 6/6 — all unchanged.
- `npm run ai:check`: OK, 82 nodes.
- Hand-run conversation (annotations visible in traces, the
  design's gate shape): Hello. → "greeting — the conversation
  opens", phase open · I'm Sam. → "interlocutor identity
  learned — name stated: Sam" · Thank you. → "thanks received
  (ritual…)", count 1 · Who are you? → "self-query (identity) —
  a question about the system itself" · Goodbye. → "leave-taking
  — the conversation closes", phase closing · Hello. again →
  "conversation closed (farewell presumed exchanged — shadow)"
  + "greeting — the conversation reopens".

## Located gaps this slice exposes (not fixed here)

- **Capability self-queries are unreachable in S1.** "What can
  you do?" does not parse at all — the sentence layer draws no
  modal shape — so no object exists for the assessment to kind.
  The `selfQuery: "capability"` value stands reserved in the
  type. The gap is the sentence layer's (modal questions), the
  same family as several parser gaps in GAPS §5; S3 (self-facts)
  will need it or will answer capability questions only in the
  shapes the parser grows.
- **The closing → closed transition is a presumption in
  shadow**: S1 authors no farewell, so the reading presumes the
  farewell was exchanged when the next turn arrives. S2's
  farewell move makes the transition a real act; the note says
  "shadow" until then.
- A different name stated after an identity is recorded is
  annotated, not applied — corrections belong to a later slice,
  as the design's retention discipline suggests.
