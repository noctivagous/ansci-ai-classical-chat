# Link Grammar Stanford (RelEx) slice — design brief

Status: BUILT 2026-11-22. `src/ansci/linkgrammar-stanford.ts`
runs RelEx's Stanford-compatibility rules over the WASM
linkage and returns Stanford-style dependency relations.
Gate: `scripts/ansci-linkgrammar-stanford-gate.mjs` — PASS.

## What it is

Option A after the wasmer-java investigation: wasmer-java
is a JVM-hosted WASM runtime (wrong direction — no JVM host
in this project), and RelEx cannot be compiled Java→WASM
(JNI to the C library plus JWNL/OpenNLP/OWL reflection).
Instead, the semantic-equivalent output is produced by
porting RelEx's rule engine and running its data:

- `vendor/relex/relex-stanford.algs` — the upstream rule
  file, verbatim (61 #TemplateActionAlg rules).
- `scripts/import-relex-stanford-algs.mjs` — generates
  `src/ansci/linkgrammar-stanford-rules.ts` (same text, CRLF
  normalised) so the browser bundle needs no data fetch.
- `src/ansci/linkgrammar-stanford.ts` — a faithful port of
  the engine: feature nodes with the aliasing makePath
  semantics the rules depend on (`ref` shared between a word
  and its relations, verified against the compiled Java
  engine), template matching with Java Pattern semantics
  (`\D\.*` → `D[a-z*]*`, ground-truthed in Java), actions
  (=, +=, <=, % clear, group-member appends), the rule
  applier sweep, graph construction from the WASM linkage
  (subscript splitting, guess-mark cutting, morphy-lite
  `str` for be-forms), and the Stanford view.

## Measured gate (2026-11-22)

98 inputs (42 TestStanford corpus sentences + 56 Foundry
turns): 95 complete, 3 recovered, 0 failed, 156 relations,
0 rule errors, 0 semantic-family leaks. Families produced:
det 114, aux 17, cop 10, auxpass 6, nn 4, attr 3, prt 1,
rcmod 1. Examples matching RelEx's documented output:
aux(go-7, can-6), cop(big-3, is-2), det(place-4, a-3).

## Deliberate gaps (asserted by tests, not hidden)

RelEx runs these rules after its tagging and semantic
passes. This port runs the stanford file standalone, so
relations needing semantic features (head-word percolation,
subj/obj/expl propagation, NEGATIVE-FLAG, HEAD-FLAG,
tense/first_verb) never fire: nsubj, dobj, advcl, ccomp,
xsubj, csubj, nsubjpass, neg, agent, partmod, infmod and
prep_* are absent by design. The AnSci adapter already
covers the subject/object core (gated, zero errors);
this layer adds the modifier/auxiliary/copula families.
One label-drift exception: SF_DET_POSS expects "Ds*w";
Link Grammar 5.13 emits "Ds*wc" (Java-verified mismatch),
so "whose" yields det, not poss.
