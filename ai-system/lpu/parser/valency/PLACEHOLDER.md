# Valency

Schematic address: `lpu/parser/valency` · Type: Unit · State: partial · 90% completed to goal

What arguments each verb takes, and in which roles.

Working code today: src/ansci/framenet-lex.ts, src/ansci/verbnet-lex.ts, features.ts

This is a placeholder: the unit's home in ai-system/ exists so the tree and the map agree. Its implementation migrates or is built here in a gated slice; until then the working code stays where PLACEHOLDER.md says it is.

## The VerbNet evidence source (built 2026-11-17)

The recorded gap this closes: WordNet-derived verbs received a
permissive frame (slots ["patient"], required []) that licensed
everything, and the checker was blind to their argument violations —
the three-state assessment (check.ts) could only call their
arguments evidence-free / unusual-but-licensed.

- **Source:** VerbNet 3.3, the official distribution
  (verbnet-3.3.tar.gz from verbs.colorado.edu, University of
  Colorado), fetched 2026-11-17 and verified as the real VerbNet
  3.x data (329 top-level class files in the tarball's own DTD/XSD
  format).
- **License:** the VerbNet 3.0 License, stated on the Colorado
  downloads page to apply to all VerbNet 3.X versions — permission
  to use, copy, modify and distribute for any purpose and without
  fee or royalty, provided the copyright notice and statements
  appear on ALL copies. VerbNet 3.X Copyright 2009 by University
  of Colorado. The full text is reproduced in the repo NOTICE file
  and in data/verbnet/manifest.json.
- **Conversion:** scripts/import-verbnet.py (build-time) →
  data/verbnet/manifest.json + part-001.json (337 KB), loaded by
  src/verbnet.ts, consulted by src/ansci/verbnet-lex.ts. Per verb
  lemma: its class membership(s); per class (601, subclasses
  included): the thematic-role inventory and each frame reduced
  to an argument shape — post-verbal bare-NP roles in order,
  prepositional arguments, clausal/lexical flags. Frame semantics,
  selectional restrictions, examples and WordNet sense keys are
  not converted. 303 multiword/hyphenated member names were
  dropped (the parser's lemmas are single words); the count is in
  the manifest, not silent.
- **Coverage (measured 2026-11-17):** VerbNet 3.3 files 6,791
  member rows; the conversion keeps 4,310 single-word verb lemmas
  in 601 classes. Against the parser's own verb inventory (hand
  lexicon ∪ the WordNet extract's verb lemmas: 11,604 lemmas),
  4,135 lemmas are VerbNet-covered with a checkable frame
  (verbnetCoverageReport() in verbnet-lex.ts; pinned in
  test/ansci-verbnet.test.ts).
- **What the check does (v1):** for a derived verb with no
  FrameNet signature, wordnet-lex.ts attaches the VerbNet shapes
  (VerbEntry.verbnetSignature). check.ts then judges the realised
  structure: more bare objects than any frame's post-verbal NP
  count, or a prepositional argument where no frame has one, is a
  located failure — the binary checker names it
  `valency-verbnet-disallowed` (naming the verb, its classes, the
  allowed maximum and the realised count), and the three-state
  assessment marks the arguments **unsupported**, basis "verbnet".
  A structure some frame allows is **supported**, basis "verbnet".
- **What it does not do (v1), stated plainly:**
  - No sense disambiguation: a lemma's shapes are the UNION of
    its classes' frames, so the check fires only on excess beyond
    ALL of the verb's classes (the FrameNet provider's
    single-frame choice is the neighbouring known weakness).
  - No obligations: VerbNet frames list alternations, not
    requirements; a covered verb used with fewer arguments is
    not flagged (the FrameNet precedent: core ≠ obligatory).
    Derived entries keep required [].
  - Lexicalised frames ("take care") are excluded from the
    shapes; a verb covered only by those is treated as uncovered.
  - Hand-lexicon verbs and FrameNet-backed verbs are untouched:
    the provider speaks only where the entry would otherwise be
    evidence-free.
  - A known data consequence: a verb whose transitive sense
    VerbNet files in a different subclass than its intransitive
    (e.g. "ferment") can be flagged for a use ordinary English
    allows. That is VerbNet's own sense split surfacing through
    the union rule, recorded here rather than patched over.
