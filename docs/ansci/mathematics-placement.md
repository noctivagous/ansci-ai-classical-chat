# Mathematics placement — report

Built 2026-11-19, commissioned by the owner the same day.
Authority: the owner's direction and ruling of 2026-11-18,
recorded in the ProblemSolving design §9 (workspace-local,
`~/workspace/ansci-problemsolving-design.md`): Mathematics
sits inside the OKU; the Quantification Unit moves one
level down under it, staying over its Numbers slice; the
Geometry Unit joins it there. Branch
`track/mathematics-placement`, based on main `e3e0daf`.
Not pushed — a push waits for the owner's word for this
specific push.

## What changed

- **Mathematics seated** —
  `ontology-core/ontology-knowledge-unit/mathematics`
  (Unit, placeholder, 0%), order 3 among the OKU's children,
  with `mathematics/PLACEHOLDER.md` stating what the
  container is and is not (a container, not a solver;
  MathPS delegates to its residents).
- **QuantificationUnit moved one level down** — new address
  `ontology-core/ontology-knowledge-unit/mathematics/quantification-unit`,
  UnitsMeasurement nested inside it at the corresponding
  address. The directory moved with the node
  (`git mv`), the layout entries re-keyed, and every
  reference updated: the OKU's placeholder, both moved
  units' placeholders, the QuantificationLanguageUnit's
  placeholder, and the header comments of
  `src/ansci/quantification.ts` and
  `src/ansci/units-measurement.ts`. Nothing about the unit
  itself changed — same code, same Numbers slice, same
  ledger, same 45% standing.
- **The "uses" cord re-pointed** —
  QuantificationLanguageUnit → QuantificationUnit now
  targets the new address.
- **Geometry Unit seated as a placeholder** —
  `ontology-core/ontology-knowledge-unit/mathematics/geometry-unit`
  (Unit, placeholder, 0%), order 2 inside Mathematics, with
  a placeholder statement recording that its contents have
  never been stated and nothing is designed or built.

## Deliberately not done

- **No Geometry need kind.** Ruling 3 of the same decision:
  the kind is registered when the Geometry Unit is *built*,
  and a placeholder seat is not a build. Geometry-shaped
  problems still route nowhere, as ruled.
- **No MathPS build.** The MathPS section of ProblemSolving
  remains unbuilt; this placement gives it its delegation
  targets' addresses, nothing more.
- **No code moved.** `src/ansci/quantification.ts` and
  `src/ansci/units-measurement.ts` keep their paths; only
  their header comments' stated addresses changed. No test
  referenced the old map address, and none was edited.
