# Social Unit

Schematic address: `awareness/social-unit` · Type: Unit · State: partial · 20% completed to goal

Awareness of the interlocutor as a social presence, not only as a source of statements. Holds the Interlocutor and Conversation. Designed 2026-11-18 (design: `~/workspace/ansci-social-unit-design.md`; placement inside Awareness confirmed at design time, owner's rulings 1a–5a).

Slice S1 (2026-11-18, this track's worktree): the social reading runs in the turn loop after Coherence's inbound analysis and annotates each assessed object in shadow — no reply changes — while the Interlocutor and Conversation registers live in the Session and update from the reading. Assessment recognises leave-taking, thanks, and self-query objects beside the greeting. Slices S2–S6 (moves through the Planner, self-facts, clarification, the premise stance, cross-conversation persistence) follow in turn, each on its own commission.

Working code today: `src/fork/social.ts` (the reading + the registers), `src/fork/assess.ts` (the social kinds), `src/fork/session.ts` (the registers held), `src/fork/turn.ts` (the seam)

Holds:
- `awareness/social-unit/interlocutor` — The Interlocutor (module file: `interlocutor-standing.ts`)
- `awareness/social-unit/conversation` — Conversation
