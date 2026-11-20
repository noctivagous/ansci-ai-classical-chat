# ProblemSolving Unit — first build slice report

Built 2026-11-19, commissioned by the owner the same day as the
next build after the ParamorphicConcept Unit. Design:
`~/workspace/ansci-problemsolving-design.md` (workspace-local,
phase 1, ruled 2026-11-18). Branch `track/problemsolving-unit`,
based on main `76996ae`. Not pushed — a push waits for the
owner's word for this specific push.

## Scope, as designed (§6)

The precondition the design set — R/E/S and probe run 3 landed
and pushed — stands met on the record (E+S+X on main as
`40fb56f`; probe run 3 complete at 25 / 64 / 39).

Built, in a new module and its own tests, with no edits to
`turn.ts`, the steering paths or the answering paths:

- `src/ansci/problem-records.ts` —
  - `ProblemRecord` (§3's type, verbatim in shape): seat +
    seat history, bearer, subject, need, ground, opened turn,
    status, closing evidence.
  - The session-scoped register (ruling 4a): records ride
    `session.problems` (the one supporting edit, in
    `session.ts`: the field and its initialisation — the same
    pattern as the quantity ledger and the other registers).
  - Seat movement with history, and the one standing route of
    record (user's problems → Internal) as a named rule.
  - The need registry extended per ruling 6a:
    `quantification` (wired, in problem-solving.ts — its
    router vocabulary is not widened), `lack-of-information`,
    `how-to-proceed`. A how-to-proceed problem opens closed
    for its turn at `declined-priced`, its closing evidence
    naming the unbuilt hexagram instrument.
  - The decline register (§4): `problemRecordFromDecline`, a
    pure function from a decline record (taken structurally,
    in the declined PlanOutcome's shape) to a ProblemRecord —
    seat internal, need lack-of-information, subject from the
    decline's ground, location from its derivation path — and
    `registerDecline`, its session-side companion.
  - `ProblemOutcome` (§3's union) as shapes only; nothing
    produces them yet.
- `src/ansci/problem-solving.ts` — header only: a pointer to
  the new module. The router and the approach registry are
  untouched.
- `ai-system/reasoning/problem-solving/PLACEHOLDER.md` — the
  slice recorded; the seat's state stays placeholder (the
  design's §7 acceptance-bar question is the owner's, unsettled).
- `test/ansci-problem-records.test.ts` — the registry's three
  kinds and standings; the record's shape on opening; movement
  as a recorded event; the standing route reaching only its
  own seat; how-to-proceed's turn-closing; the decline
  function's filing and its purity; session scope (a new
  session's register is empty).

## Deliberately not built

The wiring slice (the turn-side hook feeding real declines to
the register), the Mathematics map placement and MathPS (§9:
MathPS joins the first slice only on the owner's word, which
was not given for it), approach walking, the hexagram
evaluation, and cross-conversation persistence — each a
separate commission, as the design states.
