# T-R7 — the §11 dashboard-check exercise (harness level)

Produced by `scripts/ansci-r7-dashboard-check.mjs` on 2026-11-16T09:09:37.115Z,
driving the same code path the dashboard's chat box uses:
sessions opened as `newSession(composition, frameFromClock())`
(the disposition from the switcher; the frame from the real
clock, as Ask.tsx builds it; the role neutral, the engine's
default), turns spoken through `processTurn`.

This run's frame: season autumn (Metal) · daypart dawn (Wood), polarity Yang.

Scope, stated plainly: this is the harness-level exercise.
§10 R7's acceptance — the §11 behaviours exercised through
the dashboard itself, in the browser, with traces inspected —
is a separate step and is NOT claimed by this file. What is
claimed: the code path the dashboard runs produces these
replies and these traces.

Conversations are the frozen transcript scenarios of the
earlier slices where §11's behaviours have one (T-R1, T-R3,
T-R4, T-R5, T-R6), run under the dashboard's session setup.

## Behaviour 1 — Converse over multiple turns on the graph's home ground — retention, reference, echo

- **You:** The soup is cold.
  **Ansci:** You were cold. What did you say or do?
- **You:** I was furious.
  **Ansci:** You were furious. What did you say or do?
- **You:** I shouted at him.
  **Ansci:** You shouted at him. Now that it's out — what would help you settle?
- **You:** Is the soup cold?
  **Ansci:** As for the soup, it is cold.

Echo conversation:

- **You:** I made the soup yesterday.
  **Ansci:** You made the soup. What goes in next?
- **You:** Is the soup cold?
  **Ansci:** The soup may be cold.

Checks:

- ✓ all four turns answered
- ✓ the record retains what was established (standing states at the end: soup/cold, you/furious)
- ✓ turn 4's question is resolved against the record as a topic return (cohesion: return, ground — the topic 'soup' was raised at turn 1 and last touched at turn 1 — untouched for the 2 intervening turn(s) — and this turn reactivates it (§8.7 S3: return))
- ✓ turn 4's reply is generated from a planner-built reply graph
- ✓ echo as construction: the reply graph's subject is the person's own node material (lemma soup, form soup, det the)

**Verdict: MET.** The conversation retains what was established, resolves the returning question against the record, and builds its reply subject from the person's own material. (Turns 1–3 of the first conversation are the steering branches' hand wording — their traces record wording-not-derived, as the dashboard shows; the retention they demonstrate is the record's, which is what this behaviour claims.)

## Behaviour 2 — Answer from derivations, at the strength the pricing earns; show the working on demand

- **You:** Is winter cold?
  **Ansci:** Winter is most fully cold, and it is most fully dark.
- **You:** Is the salt cold?
  **Ansci:** The salt is cold.
- **You:** Why is winter cold?
  **Ansci:** Winter is cold, because it is most fully cold.

Checks:

- ✓ every reply is generated from a planner-built reply graph
- ✓ every trace names its derivation path and its pricing record
- ✓ the winter conclusion speaks at its earned strength (tier attested, support 1, level plain)
- ✓ the why question is answered with the derivation path in causal form (the reply contains “because”)

**Verdict: MET.** Conclusions are spoken at the strength their tier and support earn, and the why question draws the causal form out of the same derivation (§7.2's default, policy (a): the path is verbalised when asked for).

## Behaviour 3 — Ask only genuine questions — gap questions and bounded initiative, never a schedule

Gap conversation:

- **You:** I gave him.
  **Ansci:** You gave. What did you give him?

Initiative conversation:

- **You:** I was furious.
  **Ansci:** You were furious. What did you say or do?
- **You:** I heard the news.
  **Ansci:** You heard the news. Now that it's out — what would help you settle?
- **You:** The soup is sweet.
  **Ansci:** You were sweet when you heard the news. What did you say when you heard the news?
- **You:** I made the soup yesterday.
  **Ansci:** You made the soup. Now that it's out — what would help you settle?
- **You:** The soup is green.
  **Ansci:** You were held from sweet, and you were green. What is the green about? That seems to be the thing holding the sweet back. You are furious.

Checks:

- ✓ the follow-up question is generated from a genuine gap (gap question: give/theme — the verb 'give' requires its theme, and the turn does not fill it — a valency gap (§2.3); the person reporting their own event can fill it)
- ✓ the question is generated from a question graph, not appended wording
- ✓ no initiative on turns 1–4 (each reply ends in a question of the steering, so no move can attach)
- ✓ initiative fires once, from a standing state whose generating direction went unexpressed (turn 5: unexpressed-state — the standing state 'furious' (held by you, recorded at turn 1) — its generating direction Wood→Fire has gone unexpressed across the 4 turns since (§8.10); the move takes the thread up as a predication priced from the state's origin)
- ✓ the initiative sentence is part of the spoken reply, and the session records exactly one initiative move

**Verdict: MET.** Both question kinds arise from the record: a role the verb requires and the situation does not fill, and a standing thread the conversation has left unexpressed — each named in its trace.

## Behaviour 4 — Handle correction as supersession — the delta acknowledged, and later replies using the corrected state

- **You:** The soup is cold.
  **Ansci:** You were cold. What did you say or do?
- **You:** The soup is hot.
  **Ansci:** The soup is not cold, but it is hot.
- **You:** The soup is cool.
  **Ansci:** The soup is not hot, but it is cool.
- **You:** Is the soup cold?
  **Ansci:** The soup is cool.

Standing states for the soup at the end: cool.

Checks:

- ✓ turn 2 records the supersession delta (correction: value rule, cold → hot)
- ✓ turn 3 supersedes the corrected state itself — the record's deltas chain (cold → hot → cool)
- ✓ the session's recorded deltas are exactly the two corrections (soup/cold (turn 1) → hot (turn 2); soup/hot (turn 2) → cool (turn 3))
- ✓ the later turn's reply uses the corrected state (cool) — its derivation, cohesion ground or wording engages the standing corrected state

**Verdict: MET.** Corrections are recorded as deltas, acknowledged from the delta, and the corrected state is what later replies work from.

## Behaviour 5 — Decline with a named ground — and stay in the conversation afterwards

- **You:** Is the table cold?
  **Ansci:** I can't answer that from what I know: I have nothing on table in my notes.
- **You:** I bought the onions.
  **Ansci:** You bought the onions. Now that it's out — what would help you settle?
- **You:** What did I put in the soup?
  **Ansci:** I can't answer that from what I know: nothing you have told me says what was put.
- **You:** Is the salt cold?
  **Ansci:** The salt is cold.

Checks:

- ✓ turn 1 declines on the missing-classification ground, named (“I have nothing on table in my notes”)
- ✓ turn 2 is handled normally — the conversation continues after a decline
- ✓ turn 3 declines on the missing-role ground, naming the verb and the role (“the question asks for the theme of 'put', and no put event in the situation fills that role — the missing role is the decline's ground (§6)”)
- ✓ turn 4 is answered from a derivation at plain strength — a decline was a turn, not an ending

**Verdict: MET.** Both decline kinds name their ground in the trace and in plain words on the surface, and the conversation carries on to an answered question.

## Behaviour 6 — Vary with disposition, demonstrably — different proceedings, identical conclusions

Under Wood-predominant:

- **You:** I couldn't sleep.
  **Ansci:** You can't sleep. What's on your mind when you lie awake?
- **You:** I was worried.
  **Ansci:** You were worried. What did you say or do?

Under Water-predominant:

- **You:** I couldn't sleep.
  **Ansci:** You can't sleep. What's on your mind when you lie awake?
- **You:** I was worried.
  **Ansci:** You couldn't sleep, and you were worried. What is the worry about? That seems to be the thing holding the sleep back.

Under Neutral:

- **You:** I couldn't sleep.
  **Ansci:** You can't sleep. What's on your mind when you lie awake?
- **You:** I was worried.
  **Ansci:** You couldn't sleep, and you were worried. What is the worry about? That seems to be the thing holding the sleep back.

Checks:

- ✓ what is concluded is identical under all three compositions (same states recorded, same classifications used)
- ✓ the move channel fires under both reference compositions (Wood: move; Water: move)
- ✓ no bias record under the neutral composition — its declared effect is none
- ✓ the proceedings differ on the surface: the same turn is steered differently under Wood and under Water

**Verdict: MET.** Wood follows the generating direction (“What did you say or do?”); Water addresses the restrainer (“What is the worry about? That seems to be the thing holding the sleep back.”) — the declared move preferences of T-R4, visible in the traces as bias records, with nothing concluded differently. Turn 2's spoken strength also differs (Wood: possibility, via the generating arc's composed support; Water: qualified) — a difference of qualification, which §10 R4's acceptance expressly allows.

## Behaviour 7 — Keep the surface clean — no ontology vocabulary in any reply

Every reply produced by the conversations above, scanned as the turn-loop tests scan them.

Checks:

- ✓ 29 replies scanned with the test suite's leak pattern (wood|fire|earth|metal|wuxing|yin|yang|element…); 0 leaks

**Verdict: MET.** No reply names an element, a polarity, a cycle or the disposition — across planner replies, probe-worded turns, declines, questions and initiative alike.
