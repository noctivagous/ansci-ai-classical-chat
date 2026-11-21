# Link Grammar dictionary slice — design brief

Status: BUILT 2026-11-21 on `track/linkgrammar-dict` (local commits; not
pushed — the push word is separate). Measured as built: 453 macros, 1,810
word entries, 80,067 forms seen, 59,291 shipped in 1,420 entries;
22,040,067 disjuncts expanded, 1,316,092 dropped by default-dialect cost,
none over the expansion cap. Coverage report: 59,290 forms in the parser's
inventory; 6,662 of 8,754 derivable verb lemmas. Consumers as scoped
below: the `screenshots` classification case in `enItems`, and
`valency-linkgrammar-disallowed` firing on "She absconds the rabbit." and
silent beside VerbNet/FrameNet. One scope refinement against §3 as
written: what ships per entry is a summary computed from the FULL
expansion (live-disjunct count, O-capacity, minimum cost, provenance)
rather than the disjunct sets themselves — at 20.7M live disjuncts the
sets are not a shippable table, and the two consumers read exactly the
summarised quantities; the reduction is recorded in the manifest and
the Linkage placeholder. Owner decisions recorded 2026-11-20: Link Grammar
is the first external-parser candidate for English structure; **no WASM
binary**; dictionary port first, solver only if measured results demand it.
Placement (agreed): a new Parser submodule, `lpu/parser/linkage`, beside
Token / Sense / Valency / Aspect & Forms. Working code follows the VerbNet
precedent: `scripts/import-linkgrammar.*` (build-time conversion) →
`data/linkgrammar/` (manifest + parts) → `src/ansci/linkgrammar-lex.ts`
(provider), consumed as evidence by `parse.ts` / `check.ts`. AnSci's parser
and traces remain the system of record; nothing here writes a meaning
graph.

## Source, as measured (2026-11-20, upstream master d937b69)

- Link Grammar 5.13.x, English dictionary 5.12.4, LGPL-2.1 (bindings
  metadata: 2.1-or-later). Active upstream; the C core is ~37k lines.
- `data/en/4.0.dict`: 13,900 lines / 460 KB. It is not a word table: it is
  a macro system — 445 distinct `<macro>` names (463 definition heads),
  928 entry heads — where each entry's expression uses `&`, `or`, `{ }`
  (optional), `[ ]` with a numeric cost, and `@` (multi-connector).
  Example: `plan.v` expands through `<vc-plan>`, which is
  `<vc-trans> or ({@MV+} & {<to-verb> or TH+ or Zs- or <embed-verb> or VC+})`.
- Word lists live in `data/en/words/`: 90 files, 92,132 subscripted forms
  (`abandons.v`), 74,893 distinct base forms after stripping subscripts.
  The dict *includes* these files at class heads; common verbs
  (`have`, `make`, `go`, `help`…) are additionally defined inline in the
  dict itself, so the full vocabulary is dict-heads ∪ words-files.
- The upstream JavaScript binding is an Emscripten CLI wrapper
  (v0.0.0, stdin/stdout, `-s WASM=1`): no typed linkage API exists to
  adopt. This is the concrete basis for the no-WASM ruling — the WASM
  route would still require owning the packaging and scraping CLI text.

## Coverage, measured against AnSci's vocabulary

Method: strip LG subscripts, reduce both sides with a simple
de-inflection (s/es/ies, -ed, -ing variants), exact-match. Approximate —
it undercounts (irregulars, doubled consonants) and is stated as a floor,
not a score.

| Vocabulary | Size | In LG (floor) |
|---|---:|---:|
| WordNet extract, all single-word lemmas | 85,196 | 37.0% |
| WordNet extract, verb lemmas | 8,754 | 79.7% |

The 37% is expected, not a defect: the WordNet extract carries the full
rare-noun inventory, while the LG dictionary is a common-English grammar
(~75k forms). Verbs — the class whose disjuncts carry S/O/valency shape,
and the class the parser derives most — are covered at ~80% before
counting the dict's inline entries. The conversion's own coverage report
(see Gates) replaces these floor numbers with exact per-class counts.

## What the conversion does

1. Parse the dict expression grammar (macros, `&`, `or`, optionals,
   costed alternatives, multi-connectors) and the words-file includes.
2. Expand macros recursively to a per-word-form disjunct set, keeping:
   the connector multiset per disjunct, its cost, and its provenance
   (dict line / macro chain), so every shipped record can be traced back
   to its source expression — the same provenance discipline as the
   VerbNet conversion.
3. Restrict output to AnSci's evaluated vocabulary (hand lexicon ∪ the
   WordNet extract lemmas the parser can derive), exactly as the
   resolver's recognise filter restricts SymSpell's dictionary. Words
   outside that vocabulary are not shipped.
4. Emit `data/linkgrammar/manifest.json` + parts, and record in the
   manifest what was *not* converted (below), with counts, not silence.

## What is not converted (v1), stated plainly

- **The solver.** No linkage search, no counting DP, no post-processing
  (`4.0.knowledge`, constituent knowledge, affix/regex files). If the
  dictionary slice's held-out results show a solver is needed, that is a
  separate programme with its own brief.
- **Idiomatic / multiword entries** whose head is not a single word form.
- **Chinese.** No LG dictionary is used on the `parseZh` path at all.

## Consumers (v1) — evidence only, on the VerbNet v1 pattern

1. `enItems()` classification: a word form whose LG disjuncts are
   verb-only / noun-only settles the classification the positional
   heuristics currently guess at (the verb-slot capture family). Where
   LG and the heuristics agree, nothing changes; where LG has no entry,
   the heuristics stand.
2. `check.ts`: a syntax cross-check beside the VerbNet family — a
   realised bare-object count beyond every LG disjunct's `O` capacity
   for that verb form is a located `valency-linkgrammar-disallowed`
   style violation. It speaks only where the existing providers are
   evidence-free, as VerbNet v1 did.
3. Non-consumers in v1: sense selection (`sense.ts`), the Planner,
   generation, and the turn path's replies. Wiring into `processTurn`
   behaviour waits for the held-out gate below.

## Gates

- Conversion counts pinned in a test (forms in, forms shipped, macros
  expanded, entries dropped by kind), plus a coverage report function
  on the `verbnetCoverageReport()` pattern.
- `ansci:parser-compare` 12 cases: no case worse; the coordination and
  conditional cases' *evidence* (not yet their graphs) must show the
  LG disjuncts that distinguish them.
- Full suite, typecheck, `ai:check` green in the worktree.
- A held-out set (not the 12 builder-authored comparison cases) scored
  before any consumer is wired past evidence-only.
- `NOTICE` gains the LGPL attribution and the conversion's source
  statement before anything ships.

## Open questions for the build slice

- Disjunct blowup: some verb classes expand to very large disjunct sets.
  Measure the distribution; a cap, if one is needed, is recorded in the
  manifest with its count, never applied silently.
- Subscript mapping: LG form subscripts (`.v`, `.v-d`, `.g`, `.n`…)
  need an explicit table onto AnSci's `verbForm` / kind tags.
- Cost semantics: disjunct costs ship as data in v1 but no consumer
  prices with them until a calibration exists (the Token slice's
  uncalibrated error model is the cautionary precedent).
