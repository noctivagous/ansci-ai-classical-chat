# Linkage

**Percent:** 60%

**Kind:** Parser submodule (Link Grammar dictionary evidence
+ bounded solver, shadow mode)

## What it holds

Linkage is the Parser's Link Grammar seat: the converted
English dictionary of the Link Grammar parser
(opencog/link-grammar, Sleator & Temperley), held as
per-word-form evidence — which word classes a form's entries
file it under, how many bare objects (O+ connectors) its
disjuncts license at most, and where in the source dictionary
each record came from. It is evidence in the family's sense,
beside Valency's VerbNet frames and Aspect & Forms' Vendler
record: consulted by the parser and the checker, never the
meaning graph itself.

The dictionary slice (2026-11-21, brief at
`docs/ansci/linkgrammar-dictionary-slice.md`) converted the
dictionary, not the parser: there is no solver here, no
linkage search, and no planarity or connectivity checking.
The upstream system's JS binding is an Emscripten CLI wrapper
with no typed linkage API, and the owner ruled out a WASM
binary; the runtime route is this pure-TypeScript dictionary
port, with the native binary admissible only as an offline
evaluation oracle. If a later slice needs real linkage
evidence, it re-decides the solver question on measurements
this slice's records make possible.

## What is real now

- **The conversion** (`scripts/import-linkgrammar.py`): the
  dictionary's expression grammar — macros, `&`/`or`,
  `{...}` optionals, `[...]` costed alternatives, `@`
  multi-connectors, words-file includes — is parsed and every
  entry's macros expanded recursively to its full disjunct
  set (22,541,246 disjuncts over 1,810 word entries; 453
  macros — counts as extended by the coverage slice's
  supplement, below). What ships per entry is a summary computed from
  that full expansion: the live-disjunct count (after the
  default dialect's cost pruning, which the dictionary's own
  `max-disjunct-cost` of 10 makes dead — 1,543,537 disjuncts,
  recorded in the manifest), the largest bare-object
  capacity of any live disjunct (an `@O+` multi-connector
  counts as unbounded), the minimum cost, and provenance
  (the entry's line in `4.0.dict`, its macro chain). The
  full disjunct sets do not ship; the summaries are the
  record the two consumers below actually read.
- **The shipped vocabulary** is AnSci's evaluated vocabulary
  — the hand lexicon's forms together with the WordNet
  extract's lemmas and surface forms, extended by the
  coverage slice's closed-class supplement (see below):
  60,154 of the 80,067 dictionary forms seen ship, in 1,571
  entries, under `data/linkgrammar/` with a manifest on the
  VerbNet pattern (source, edition, licence, counts, and the
  not-converted list: the solver beyond the bounded subset,
  idiom/multiword heads — 1,342 dropped — the knowledge,
  affix and regex files, and the 21,691 heads outside the
  evaluated vocabulary).
- **The provider** (`src/ansci/linkgrammar-lex.ts`, over the
  loader `src/linkgrammar.ts`): lookup by word form returns
  the union of the form's entries — classes evidenced,
  subscripts, total live disjuncts, maximum O-capacity,
  provenance — and is silent when the data is absent or
  switched off, on the VerbNet provider's contract.
  `linkgrammarCoverageReport()` measures the dictionary
  against the parser's own inventory: 59,290 of its forms
  covered (the supplement's closed-class forms are not in
  the WordNet-derived inventory either), and 6,662 of the
  8,754 derivable single-word verb
  lemmas — broader verb coverage than VerbNet's 4,135, from
  a source whose classes are usage classes rather than
  Levin classes.

## The two consumers (evidence-only)

- **Classification** (`parse.ts` `enItems`): where the whole
  WordNet derivation chain leaves a form unclassified — it
  would sit as a proper name with no entry — unanimous
  noun-only dictionary evidence settles it as a noun. The
  case on record is `screenshots`, which the WordNet extract
  files only under the verb: "Screenshots appeared." read
  its subject as a name before, and as the common noun now.
  The entry the evidence builds is not registered; the
  classification is recomputed from the shipped tables in
  the same fixed precedence as every derived entry. Verb-only
  evidence is deliberately not applied here: a surface's verb
  reading is positional in this parser, and the verb slot is
  resolved after the subject chunk is known.
- **The checker's cross-check** (`check.ts`): a derived verb
  no other provider reaches — no FrameNet signature, no
  VerbNet signature, its frame evidence-free — is checked
  against the dictionary's capacity for the verb form used:
  more realised bare objects than every live disjunct allows
  is the located violation `valency-linkgrammar-disallowed`.
  On record: "She absconds the rabbit." fires (the form's
  entries license no object at all), the intransitive use is
  silent, and the check stays silent beside VerbNet's own
  violation for "She blushed the rabbit." and beside a
  FrameNet-signed verb, because it speaks only where the
  existing providers are evidence-free.

## The coverage slice — shadow landing (2026-11-21)

Brief: `docs/ansci/linkgrammar-coverage-slice.md`. Stage 1 of
three (shadow landing; the held-out set and family routing
follow as their own landings, gated per family).

- **Expression trees ship.** The converter now also emits
  each shipped entry's macro-expanded expression tree
  (`data/linkgrammar/trees-001.json`, aligned by index with
  the entry records): 1,571 trees, 321,953 nodes total,
  largest 1,407, none over the converter's 100,000-node cap
  (an over-cap tree would ship as null and be counted in
  `treesOversized` — the cut is on the record, never silent).
- **The vocabulary grew a closed-class supplement.** The
  dictionary slice's evaluated vocabulary is WordNet-derived
  and excludes the closed classes by construction (WordNet
  files no 'the'); a solver cannot link an ordinary sentence
  while 'the', 'and', 'with', 'of', 'that', 'if' have no
  entries. The converter now supplements the vocabulary with
  every base filed bare or under a j-*/d/p/c/e subscript in
  the dictionary's own heads, plus the modal auxiliaries
  (2,441 supplemented bases, counted in the manifest):
  60,154 forms ship in 1,571 entries, 22,541,246 disjuncts
  expanded. The supplement files no subscripted content
  entry, so the dictionary slice's kind-based consumers are
  unchanged (their tests' pins moved only in the counts).
- **The solver** (`src/ansci/linkage.ts`): lazy per-sentence
  disjunct streams from the trees — cross-products enumerated
  on demand in odometer order, deduplicated and contextually
  filtered as pulled, delivered in approximate cost order,
  with the raw enumeration shared across solves in a process
  — and a bounded stack search for a planar, connected
  linkage under upstream's connector matching (`easy_match`)
  and the (UNUSED, DIS, LEN) cost vector compared
  lexicographically. It returns the best complete linkage,
  or the best partial with its UNUSED set, or a located
  decline. Bounds are parameters and every hit is recorded:
  sentence-length cap 24, sentence weight cap 160,000 (the
  summed live-disjunct counts, known exactly from the
  conversion before any generation), per-word delivered cap
  512, search budget 3,000 nodes, time budget 25 ms.
- **Shadow integration**: the solver runs beside `parseEn`
  and its record rides `ParsedSentence.linkageShadow`
  (tokens, token indices, links, UNUSED, skipped, counts,
  bounds hit). Nothing reads the record — no graph, check,
  or reply — in this stage.

### The shadow measurement (shipped defaults)

`scripts/ansci-linkage-shadow.mjs` over the 12 comparison
cases plus 15 ordinary chat sentences, at the shipped
bounds: **8 complete, 15 partial, 3 declined (weight-cap),
0 absent**. Plain transitives link correctly and completely
("I booked a room.": i-S-booked, a-D-room, booked-O-room;
the negated case links 'not' — did-O-not — and completes).
The partials are mostly budget partials: the 25 ms / 3,000-
node chat-duty budget stops the search on anything with a
large verb or a second clause, and the record says so
(`time-budget`, `disjunct-cap:*` on the bounds list). The
best-linkage cost model also diverges from upstream on some
shapes — the modal case's best complete linkage under
roomier bounds misattaches (book-O-a, could-I-room) where
upstream's post-processing would not — so a complete record
is structure evidence, not a certified parse. Counts are
lower bounds whenever a budget hit is recorded. Three chat
sentences decline on weight alone ("The old man walks
slowly to the market.", "Birds sing at dawn.", "The students
asked the teacher a question." — heavy common verbs), which
is the weight cap doing its stated job: the shadow never
taxes a parse for the heavy tail.

Costs, plainly: solver time per ordinary in-cap sentence is
bounded by the budgets (≤ ~25 ms of search plus generation
pulls); the full suite's wall time on this machine rose
from 5m14s (baseline, 1,549 tests) to 12m22s (1,556 tests)
with the shadow riding every English parse — the price of
the instrument, recorded so a later slice can judge whether
to move it off the hot path. Gate at landing: suite 1,556
(1,553 pass / 0 fail / 3 skip), typecheck clean, ai:check
green, `ansci:parser-compare` identical to baseline on all
12 cases, shadow records present for all 12 comparison
cases (the fragment case, which AnSci declines, carries its
record from the standalone solver in the measurement).

### The held-out set (stage 2, sealed)

`data/ansci/linkage-heldout-v1.json` — 21 fresh cases across
the five families, builder-authored and sealed before any
routing (sha256 of the canonical body; v2 seal
`0219a292…`, v1 `91180303…` superseded pre-routing for
graph-vocabulary conventions only — object relations as
patient|theme alternatives, three unlemmatised verb forms —
with the reason recorded in the set itself). It is NOT
independently authored, and the record does not pretend
otherwise. Baseline against the unrouted parser and the
shadow (generous bounds), scored by
`scripts/ansci-linkage-heldout.mjs`:

| family | graph content | shadow complete + full agreement |
|---|---|---|
| F1 core S/O/MV | 5/5 | 3/5 |
| F2 PP attachment | 2/4 | 0/4 |
| F3 relatives | 1/4 | 0/4 |
| F4 coordination | 0/4 | 0/4 |
| F5 complements | 1/4 | 0/4 |

The graph column is the routing gate's floor: F1's content
already survives positionally on these plain cases; F2–F5
fail in the ways the brief named (PPs dropped or flattened,
relatives read as recipients/patients of the matrix verb,
coordination flattened with 'and' as patient, fronted
conditionals unparseable). The shadow column is the
caution: outside F1 the solver's best linkage rarely
carries the family's signature links completely, so routing
that leans on exact links will often have nothing to walk.

### Family routing — F1 landed in part, F2 onward stopped

**F1 (core S/O/MV) — the O side landed, the S side refused,
MV unrouted.** In the main branch, a ditransitive's two bare
objects are classified by a complete linkage's O-links —
O*n marks the indirect object, plain O the direct — and
where that classification contradicts the positional slot
assignment, the slots swap (`parse.ts`, F1 object
classification). Measured firings on current material:
**zero** — on every ditransitive in the held-out set, the
comparison cases and a probe set ("She gave him a book.",
"He showed the students a photo.", "I sent the company a
letter."), the linkage agrees with position wherever it
completes, so the mechanism is armed and agreement-verified
rather than observed changing a parse. The S side does NOT
route: recovering a missing subject from an S-link was
built, probed, and refused — on "On the mat sat the cat."
it installed the locative as agent (agent:mat) where the
positional parse honestly carries none, because the
linkage's S partner in locative inversion is the locative
phrase. MV does not route: the positional adverb path
already preserves the set's MV content. F1 gate at landing:
held-out F1 5/5, parser-compare identical on all 12, suite
1,557 (1,554 pass / 0 fail / 3 skip), typecheck and
ai:check green.

**F2 (PP attachment) — attempted, gate failed at 2/4;
routing stops here.** A main-branch PP re-pointing (a
verb-attached PP moves under a noun when a complete linkage
links the preposition left to that noun's head) was built
and gated: it changed nothing on the set, and the family's
failures are not attachment choices. "A tall woman in a red
coat entered." fails because the positional path selects
'coat' as the verb (a root-selection failure upstream of
any PP decision), and "The key to the cabinet is missing."
drops the PP inside the copular branch, which the
main-branch routing surface never reaches. The shadow also
carries no usable attachment signal on these cases (0/4
complete with the expected links at generous bounds). The
attempt was reverted — only landed families ship routing
code. Per the brief's rule, a failed family gate stops
routing: F3, F4 and F5 were not attempted. Their baselines
stand on the record above as the next slice's starting
evidence.

## What is deliberately not here

- **No F2–F5 routing.** PP attachment, relatives,
  coordination and complements do not read the shadow
  record; only F1's object classification does, under the
  conditions above. The post-processing knowledge files are
  still not converted, and the solver's wall policy and @
  semantics are stated leniencies (see
  `src/ansci/linkage.ts`), so its linkage counts are not
  upstream's counts.
- **No disjunct sets.** Only the per-entry summaries ship.
  A consumer that needs the actual connector sequences —
  subject-link (S) directionality, say, or the cost-ranked
  alternatives — needs a new conversion decision, not a
  wider read of this one.
- **No three-state assessment.** `assessValency` does not
  take a `linkgrammar` basis in this slice: the cross-check
  is binary (fires or silent) beside the VerbNet family,
  and promoting dictionary capacity into the per-argument
  supported/unsupported judgement is a separate decision.
- **No other consumers.** Sense selection, the Planner,
  generation and reply behaviour read nothing from this
  table; the dictionary's sense-bearing subscripts are
  recorded as classes, not senses.
- **Chinese.** The seat is English-only, like the
  dictionary converted; `parseZh` is untouched.

## Where the code lives

- `scripts/import-linkgrammar.py` — the build-time
  conversion, on the `import-verbnet.py` pattern.
- `data/linkgrammar/` — manifest + part files (the shipped
  summaries).
- `src/linkgrammar.ts` — the optional table loader.
- `src/ansci/linkgrammar-lex.ts` — the provider: lookup,
  class evidence, O-capacity, coverage report.
- Consumers: `src/ansci/parse.ts` (`enItems`),
  `src/ansci/check.ts` (the cross-check family).
- `src/ansci/linkage.ts` — the coverage slice's bounded
  solver and shadow integration (`parse.ts` attaches the
  record); `scripts/ansci-linkage-shadow.mjs` — its
  measurement.
- Tests: `test/ansci-linkgrammar.test.ts` — pinned
  conversion counts, the coverage report, provider lookups,
  and the consumer cases named above;
  `test/ansci-linkage.test.ts` — tree pins, connector
  matching, lazy generation, solver and shadow cases.
- Attribution: `NOTICE` (LGPL-2.1-or-later, on the VerbNet
  pattern).
