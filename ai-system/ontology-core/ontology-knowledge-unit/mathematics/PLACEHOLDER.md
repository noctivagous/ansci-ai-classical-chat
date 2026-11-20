# Mathematics

- **Schematic address:** `ontology-core/ontology-knowledge-unit/mathematics` — inside the Ontology Knowledge Unit
- **Type:** Unit
- **State:** placeholder — **0% completed to goal** (set by us, assessed by the project, not measured or computed). Placement built 2026-11-19: the seat, this statement, and the QuantificationUnit's move. Mathematics has no code of its own and no machinery; it is the container the ruling names.

## What this unit is

Mathematics is the larger unit inside the OKU that holds the
**Quantification Unit** and the **Geometry Unit**, which will work
with each other — the owner's direction of 2026-11-18, recorded in
the ProblemSolving design (§9) and ruled the same day: Mathematics
sits inside the OKU, the Quantification Unit moves one level down
under it staying over its Numbers slice, and the Geometry Unit
joins it there.

## Its residents

- **QuantificationUnit** (`mathematics/quantification-unit`, 45%) —
  moved here 2026-11-19, with the UnitsMeasurement Unit nested
  inside it as before. Nothing about the unit itself changed: same
  code (`src/fork/quantification.ts`), same Numbers slice, same
  ledger. Only its address moved.
- **Geometry Unit** (`mathematics/geometry-unit`, placeholder) —
  a seat only. Its contents have never been stated; nothing is
  designed or built.

## What Mathematics is not

Mathematics is a container, not a solver. ProblemSolving's MathPS
section delegates its solving to the units standing here —
quantification problems to the Quantification Unit and its ledger,
geometry problems to the Geometry Unit when it exists — and keeps
no math machinery of its own, exactly as ProblemSolving delegates
quantification today. And per the 2026-11-18 ruling, **no Geometry
need kind is registered until the Geometry Unit is built**: until
then geometry-shaped problems route nowhere and are not forced
under "quantification".
