# ProblemSolving Unit

Schematic address: `reasoning/problem-solving` · Type: Unit · State: placeholder · 0% completed to goal

A general-purpose problem-solving unit inside Reasoning (owner's commission, 2026-11-18) — not limited to mathematics. Problems reach it by routing: a router in the turn asks "does this need problem-solving?" — because the person instructed a solution, or because the AI assessed the object as needing one — and attaches the needs to the object itself, routed here. Quantification is the first wired signal, on both grounds: an object carrying quantity content is routed on the assessment, and a how-many question is routed on the instruction. The unit's repertoire is the standard acronym cycles people use — OODA (Observe, Orient, Decide, Act; rapid decision cycles), PDCA (Plan, Do, Check, Act; continuous improvement), and the rest as they are registered — each held as a small graph of steps with the cycle edge that closes it, because these processes are cycles and the graph is their honest shape.

Working code today: `src/fork/problem-solving.ts` (the approach registry and the router), `src/fork/turn.ts` (the router's two call sites and the map path)

This is a placeholder: the seat, the router and the approach graphs are wired; no approach engine runs yet. What the router records today is the recognition — the needs on the object, the route on the trace — while the solving itself remains wherever it already lives (the quantity ledger, for the wired signal). Building the engines that walk an approach graph against a routed problem is this unit's future work, in gated slices of its own.
