# ProblemSolving Unit

Schematic address: `reasoning/problem-solving` · Type: Unit · State: placeholder · 0% completed to goal

A general-purpose problem-solving unit inside Reasoning (owner's commission, 2026-11-18) — not limited to mathematics. Problems reach it by routing: a router in the turn asks "does this need problem-solving?" — because the person instructed a solution, or because the AI assessed the object as needing one — and attaches the needs to the object itself, routed here. Quantification is the first wired signal, on both grounds: an object carrying quantity content is routed on the assessment, and a how-many question is routed on the instruction. The unit's repertoire is the standard acronym cycles people use — OODA (Observe, Orient, Decide, Act; rapid decision cycles), PDCA (Plan, Do, Check, Act; continuous improvement), and the rest as they are registered — each held as a small graph of steps with the cycle edge that closes it, because these processes are cycles and the graph is their honest shape.

For issues of how to proceed in a general situation, the unit will carry an evaluation mechanism based on the 64 hexagrams, making use of OntologyCore (owner's addition, 2026-11-18): the hexagrams stand in the ontology the Ontology Knowledge Unit holds, and the evaluation reads them there — the unit keeps no hexagram copy of its own. A routed how-to-proceed problem is placed against the hexagram picture, and the evaluation's reading informs how the unit proceeds. Like the approach engines, the mechanism is recorded here as design, not built: no evaluation runs yet, and the router's need vocabulary gains its how-to-proceed kind when the mechanism is built.

The unit's divisions (owner's divisions, settled 2026-11-18 — all rulings as recommended) are six generic subunits, applicable to any dimension of what the AI encounters — for itself, for the user, for a person in a story provided, for a math problem:

Holds:
- `reasoning/problem-solving/external` — External problems: the encountered world
- `reasoning/problem-solving/abstract` — Abstract problems: ideas, meaning, value, how to proceed in general; the hexagram evaluation is this division's instrument
- `reasoning/problem-solving/internal` — Internal problems: error, lack of information, lack of how to do; the seat where solving is taken up
- `reasoning/problem-solving/internal-system` — Internal-system problems: the system's standing limits and condition, as they bear on external issues
- `reasoning/problem-solving/external-system` — External-system problems: the boundary, the system's interfaces to the outside
- `reasoning/problem-solving/user-problems` — User's problems: the intake seat

The divisions are **seats a problem moves between, not bins it is filed in**: a problem record carries its current seat and its history of seats, its **bearer** (the system / the user / a third party / the matter itself), and its **subject** (what it is about). The divisions are relational — where a problem stands relative to the system — which is what makes them generic across bearers and subjects. One standing route is the owner's: the user's problems feed back to Internal, where the solving is taken up. The six are the set for now; a seventh division would have to pass the same generality test — relational, bearer-independent, subject-independent.

The unit's **first build slice** (design §6; phase 1 design ruled 2026-11-18, build commissioned 2026-11-19) is built: the ProblemRecord type and its session-scoped register, seat movement with history, the need registry extended with `lack-of-information` and `how-to-proceed`, and the decline-registration function — in `src/fork/problem-records.ts`, with the register riding the Session (`session.problems`). It is deliberately **not wired**: nothing in the turn loop calls it, and the hook that will feed it real decline records is the wiring slice, separately commissioned. A `how-to-proceed` problem records and closes for its turn as `declined-priced`, the hexagram instrument being unbuilt. No approach walking, no hexagram evaluation, no MathPS in this slice.

Working code today: `src/fork/problem-solving.ts` (the approach registry and the router), `src/fork/problem-records.ts` (the first build slice: records, register, movement, decline registration), `src/fork/turn.ts` (the router's two call sites and the map path)

This is a placeholder: the seat, the router and the approach graphs are wired; no approach engine runs yet. What the router records today is the recognition — the needs on the object, the route on the trace — while the solving itself remains wherever it already lives (the quantity ledger, for the wired signal). Building the engines that walk an approach graph against a routed problem is this unit's future work, in gated slices of its own.
