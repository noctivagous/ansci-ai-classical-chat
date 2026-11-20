# ReasoningErrorFailure Unit — PLACEHOLDER (0%)

- **Schematic address:** `reasoning/problem-solving/reasoning-error-failure`
  — a subunit of the ProblemSolving Unit, inside Reasoning
- **State:** placeholder — a seat on the schematic map, deliberately
  unbuilt
- **Kind:** Unit

## What this is

The **ReasoningErrorFailure Unit** (owner's direction, 2026-11-20):
the ProblemSolving Unit's own error-and-failure subunit. It follows
the system's bridge pattern — as SemanticAssessment in the LPU uses
the SemanticAssessmentUnit in the OntologyCore, this subunit does the
failure work **inside Reasoning** and files to the top-level
**ErrorFailure Unit**, which holds the authority: the authored
account and the accumulated failure knowledge.

When a strategy walk exhausts its approaches or reaches its loop
budget, or a step's requirement survives the capability audit unmet,
this subunit:

1. **assembles the attempt record** — the problem and its seat
   history, the strategies tried, the loops spent, the stopping step,
   the lack (capability or information), and the holdings that were
   checked before the lack was declared;
2. **marks the problem's record** with the failure, at its location;
3. **files the record** to the ErrorFailure Unit.

It is **not one of the six divisions**: the divisions are seats a
problem moves between; problems do not sit in this subunit, they pass
through it on their way to being accounted for.

The point of the pattern, in the owner's words: the counterpart
exists **so the host module does not have to reproduce the top-level
unit's functionality** — ProblemSolving uses the ErrorFailure Unit's
generic account-authoring through this subunit, the way the LPU uses
the EmotionDesireUnit's generic functionality through its
LanguageEmotionDesireUnit rather than rebuilding it.

## Standing rules

- **It never speaks.** The account it files is a typed record; the
  Planner authors any reply that carries the ErrorFailure Unit's
  account.
- **Assembly only.** It records what the walk did and found; it does
  not compose the explanation — that is the ErrorFailure Unit's work,
  from this record.

## What is deliberately not here yet

- **No filing machinery.** No record type, no route to the
  ErrorFailure Unit, nothing designed or built.
- **Nothing walks yet.** The strategy engine it serves is designed,
  not built; this seat waits with it.
