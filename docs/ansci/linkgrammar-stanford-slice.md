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

## Completion (2026-11-23): the gaps above are closed where upstream closes them

The standalone mode above is unchanged (it remains the cold
path and its absence pins stand). Alongside it, the full
upstream pipeline now runs — tagging → semantic → stanford —
in src/ansci/linkgrammar-semantic.ts over the vendored
relex-tagging.algs / relex-semantic.algs, with the six named
algorithms ported (Morphy over AnSci's own WordNet extract).
Mechanism survey: docs/ansci/relex-semantic-survey.md.

Full-pipeline gate (same 98 inputs, statuses identical):
156 → 402 relations. New families: nsubj 99, dobj 52,
advmod 39, nn +3, aux +2, cop +2, nsubjpass 6, neg 5, num 4,
expl 3, partmod 3, poss 3, xcomp 3, advcl 2, appos 2,
ccomp 2, csubj 2, iobj 2, acomp 2, mark 2, and singletons.
Zero non-merge rule errors; the 72 feature-merge errors are
the ones upstream's applier swallows by design (classified
in the gate report).

What still cannot fire, upstream-faithfully: prep_* and
agent — the shipped semantic file's only live
PrepositionLinkAlg call is commented out, so `ref
prep-links` is never populated (upstream produces prep_at
only in its --expand-preps mode, a different feature path);
and infmod — SF_INFMOD tests a `pos` feature no upstream
file writes. Both absences are pinned by tests with the
reason recorded.

Native relations (Stage 2): the semantic file's own output
(`ref links _X`) is exposed as nativeRelations() —
_subj/_obj/_iobj/_expl/_predadj/_pobj/_comparative/… —
gated on 12 cited cases. Relex2Logic (Stage 3) consumes
them in shadow: src/ansci/relex2logic.ts applies the
transcribed rule inventory and emits logic records in
AnSci's ParsedSentence vocabulary (questions as the `query`
record, never null-filled assertions); gate 12/12.

Routing (Stage 4): the full pipeline's Stanford relations
ride ParsedSentence.relexEvidence (src/ansci/
linkgrammar-relex-evidence.ts, attached in parse.ts beside
the linkage shadow) as EVIDENCE — proposals over the parse's
own token indices, peer of the adapter. Nothing consumes
the record to decide anything yet; the native and R2L
outputs remain unrouted shadow outputs.
