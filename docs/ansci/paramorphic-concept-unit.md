# ParamorphicConcept Unit — placeholder build report

Built 2026-11-19 on the owner's ruling and "rec" of the same day, in
the Paramorphic Theory chat. Branch `track/paramorphic-concept-unit`,
based on main `76996ae`. Not pushed — a push waits for the owner's
word for this specific push.

## The rulings built

1. **Placement (owner, 2026-11-19):** all paramorphic concepts are in
   a ParamorphicConcept Unit in the OKU. This supersedes the design
   chat's recommended placement (the form of the OKU's concept
   representation, no unit), which the owner did not take.
2. **Relation to instances (rec 1a):** the unit holds the generic
   concepts, their parameters and their shared operations; the
   system's existing structures are instances and stay where they
   live, referenced by address. Nothing moved, nothing re-expressed.
3. **Contents (rec 2a):** closed at the six of the
   paramorphic-components record — Grid, Graph, Tree, Path,
   Protocol, Logic. Network folds into Graph + Protocol, as that
   record ruled; adding a concept is the owner's ruling.
4. **First slice (rec 3a):** the ProblemSolving placeholder shape —
   map seat + placeholder + registry as data. No engine.

## What was built

- `ai-system/system-map.ts` + `ai-system/system-layout.ts`: the seat
  `ontology-core/ontology-knowledge-unit/paramorphic-concept-unit`,
  a Unit at placeholder 0%, order 4 among the OKU's children (after
  correspondence-graph, classification, quantification-unit).
- `ai-system/ontology-core/ontology-knowledge-unit/paramorphic-concept-unit/PLACEHOLDER.md`:
  the unit's statement — contents, the instance relation, the
  standing invariant (a parameter move may generate a derived
  candidate; it may never rewrite a filed row or upgrade a tier).
- `src/ansci/paramorphic-concepts.ts`: the registry. Each concept
  carries its substrate (components-record terms), its parameters
  (derived from the AnSci specimens), its shared operations as a
  named vocabulary, its AnSci instances with their addresses, its
  specimen standing, and its invariants. Protocol's instance list
  is empty and its standing says so — no specimen exists in this
  system, and none was invented.
- The OKU's PLACEHOLDER gains a "newest resident unit" note.
- `test/ansci-paramorphic-concepts.test.ts`: pins the closed list
  and its order, the registry shape per concept, the in-place
  instance references, the Tree entry's X1 brake, and Protocol's
  recorded emptiness.

## What was deliberately not built

No engine: no operation named in the registry runs, no consumer is
rewired, `classify.ts` / the correspondence graph / the join are
untouched, and the Mathematics map placement (Quantification under
Mathematics inside the OKU, ruled 2026-11-18 in the ProblemSolving
design) is not part of this slice — the QuantificationUnit stands
where main has it, a direct child of the OKU, until that placement
is commissioned.
