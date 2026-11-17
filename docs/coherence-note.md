# Coherence — a note captured 2026-11-16

The owner's note, recorded the day the project reoriented to the
map-based approach. This is a design capture, not a built thing:
nothing in the code does this yet, and its place on the map is not
yet settled ("somewhere in the map").

## The note

The AI will have, somewhere in the map, what we would call
**CoherenceAnalysis** and **CoherenceDemand**.

It is the **Coherence Demand possessed by the system** that will say
"this doesn't make sense" when faced with something nonsensical. It
has responses and analysis of what to do when something doesn't make
sense to it, maintains its personal boundaries, and replies
accordingly.

This applies conceptually at a **situation level** and at the
**micro, chat level** — where the user says something nonsensical
and out of turn and the AI replies with something natural *because
of this*.

## The worked example

> "I was furious" — as the first thing said by an unknown person —
> → CoherenceProcessor → … → **"Furious about what?"**

The reply might come from an **"I don't know the situation" degree
level** and its properties, including:

- **who is talking**,
- **what information is missing**,
- **whether information in the stream fits into what has been said**.

## Where it touches what already exists (Kavi's reading, labelled as such)

- The **declines direction** (2026-11-16: a decline is a located
  gap, closed at its location) is this note's territory at the
  sentence level — the situation-response case ("Is the table
  cold?" said first, by nobody known, about nothing established →
  "What are you talking about?") is a coherence response, not a
  refusal.
- The **Awareness Unit** holds two of the three properties already:
  who is talking (Interlocutor standing) and the situation
  statement. The third — stream fit — is a judgement over the
  **Session record** (what has been said) against what is arriving.
- The planner's **gap questions** (a missing role → "What was put
  in the soup?") are the same shape one level down: a named missing
  piece, asked for naturally. Coherence is that shape at the level
  of the whole situation.
- The **steering probe** the free-conversation probe exposed (every
  statement forced into the speaker's-emotional-event mould) is
  what a system *without* a coherence demand does instead: it
  cannot say "this doesn't fit", so it files the misfit somewhere.

## Placement — settled 2026-11-16

The owner settled it the same evening: **its own unit, consulting
Awareness and Session & Situation.** It is in the registry as
placeholders at 0% — `coherence` (Unit) holding
`coherence/coherence-demand` (Register) and
`coherence/coherence-analysis` (Unit), with "consults" cords to
`awareness` and `session-and-situation` — and drawn on the map in
the placeholder treatment. Nothing is built; the registry records
the decision, not an implementation.

## Open

- **Placement on the map.** Settled — see above.
- **The degree levels.** "I don't know the situation" is named as a
  degree level with properties — the scale and its other levels are
  not yet defined.
- **Boundaries.** "Maintains its personal boundaries and replies
  accordingly" — what the boundaries are is setup (disposition and
  configuration territory), not yet specified.
