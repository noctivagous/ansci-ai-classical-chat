# AnSci test hierarchy — audit

Date: 2026-11-19 · Tree audited: `~/workspace/ansci-integrate`, branch `integrate/imp-discourse`, tip `d71009c`
Status: APPLIED locally 2026-11-19 (owner's word in the test-hierarchy chat).
The tier scripts and manifest below are implemented and verified; no test was
deleted. Not yet pushed — the push waits for the owner's push word.

## What was counted, plainly

| Measure | Count |
|---|---|
| Test files in `test/` | 80 |
| Statically named `test('…')` cases | 1,055 |
| Total `test(` call sites (incl. loop/template-generated) | 1,106 |
| Lines of test code | 17,727 |
| Exact duplicate test titles across files | 0 real (see below) |

Runtime counts reported on other tips differ (e.g. 1,018 pass / 3 skipped on the
recognition-programme tip) because some files skip cleanly when the optional
FrameNet bundle is absent, and loop-generated cases expand at run time.
A full run of this tree did not finish within 120 s in the check on 2026-11-19.

## Headline findings

1. **The suite is not duplicated in the way its size suggests.** There are no
   exact duplicate titles, and the 6 apparent repeats (`specimen:`, `adverbs:`,
   `mech4:` …) are loop-generated names truncated in extraction, not copies.
2. **Overlap is by input, not by assertion.** 123 input sentences are used in
   more than one file — 367 file-uses in total. The extreme case is by design:
   - `The soup is hot.` — 18 files
   - `I was furious.` — 11 files
   - `Is winter cold?` / `Is the salt cold?` / `Is the soup cold?` — 8 files each

   Each file asserts a *different layer* on the same input (parse, semantic
   object, coherence, pricing, social, uptake…). That is good for locating a
   failure and bad for gate cost: one behaviour change can break the same
   sentence in a dozen files, and the reader has to work out which layer
   actually regressed.
3. **Coverage is concentrated in the turn loop.** `src/ansci/session` is imported
   by 33 test files and `src/ansci/turn` by 32; `src/ansci/parse` by 23;
   `src/ansci/wordnet-lex` by 14. Most of the suite is end-to-end turn tests,
   not unit tests — which is why the full gate is slow.
4. **Two generations are tested in parallel.** The original engine
   (`src/engine, propagate, reason, render, router, thought, situation, wordnet, framenet`)
   and the fork (`src/ansci/*`) each have a full suite. Both engines are still
   live — the fork's join tests reuse `src/engine`/`src/propagate` read-only —
   so neither suite is dead, but they should not carry equal gate weight.
5. **The sealed probes are not in this count.** `ansci-sealed.test.ts` (7 tests)
   tests the sealing *machinery* on a fixture. The sealed conversation probes
   themselves live outside `test/` and remain a separate, on-purpose run (T5).
6. **Programme files are the growth.** Files named for a programme or slice
   (R, S, IMP, X, recognition, conversation-shapes, E4, E5) hold 376 of 1,106
   call sites (34%). They were exit gates for their slice. Their assertions
   are the historical record that the slice's declared effects held.

## The hierarchy

Gate rule: a tier runs at the stated cadence; a failure in a lower tier never
outranks a failure in a higher one. Nothing is deleted by being demoted.

### T0 — Invariants · every commit, block everything · 9 files, 70 call sites

The disciplines that define AnSci. If one of these fails, the system is not
AnSci any more, whatever else passes.

| File | Tests | Pins |
|---|---:|---|
| ansci-negation.test.ts | 7 | Negation as a Water state, both languages; the F1 defect family |
| ansci-coherence.test.ts | 7 | Coherence reads objects against the prior stream; planner decision points |
| ansci-triage.test.ts | 6 | Review queue: no admission without review path, confidence caps |
| ansci-sealed.test.ts | 7 | Sealing machinery: tamper detection, blind view, hash |
| ansci-tokenresolve.test.ts | 14 | SymSpell/token gate between a bad token and a parse-failure decline |
| ansci-ingest.test.ts | 10 | NO CITATION, NO INSERTION — refused twice, even behind a forged pass |
| ansci-lexicon-state.test.ts | 7 | Lexicon-state family; derived entries must not poison later probes |
| ansci-join.test.ts | 7 | Classification join at working strength; X1 table-ownership brake |
| ansci-sense.test.ts | 5 | Sense selection: coherence may overturn only inside the confidence band |

### T1 — Core pipeline · every commit · 18 files, 187 call sites

Parse → semantic object → plan → realise → turn, plus the original engine the
fork still reuses.

| File | Tests | Pins |
|---|---:|---|
| ansci.test.ts | 15 | Fork sentence layer; desk evaluations, cycle probes, prediction run |
| ansci-grammar.test.ts | 20 | Grammar completion: expletives, clausal modifiers, conditionals |
| ansci-repair.test.ts | 9 | Repair tranche: nominal predication, agentless passives |
| ansci-constructions.test.ts | 8 | Copular questions, fragments, imperatives, F3 crash pair |
| ansci-semantic-object.test.ts | 7 | SemanticAssessment shadow objects (§7 expected-graph layer) |
| ansci-plan.test.ts | 8 | Planner transform R1 |
| ansci-realise.test.ts | 8 | Realisation gaps R1.5, connective layer |
| ansci-compose.test.ts | 15 | Composition of conclusions R2, both orderings |
| ansci-reply-object.test.ts | 5 | Replies authored as semantic objects |
| ansci-turn.test.ts | 11 | Turn loop and session disciplines (§5.1) |
| ansci-features.test.ts | 8 | Depth/expected-graph metric: dropped feature = loss, changed = contradiction |
| engine.test.ts | 10 | Original engine: cycle operators, graded polarity, balance |
| reason.test.ts | 13 | Reasoning over the seed graph |
| propagate.test.ts | 12 | Propagation, per-relation decay, non-propagation list |
| render.test.ts | 6 | Three-stage renderer, hedge bands, faithfulness trap |
| router.test.ts | 21 | Router probe suite and scripted sessions |
| thought.test.ts | 5 | ThoughtTrace, replay without re-reasoning |
| situation.test.ts | 6 | Situation model, canonical fallback form |

**Daily gate = T0 + T1 = 27 files, 257 call sites** (vs 80 files / 1,106 today).

### T2 — Knowledge bank and sources · when graph/data changes, and before merge · 18 files, 247 call sites

A failure here means banked knowledge or a source no longer lands where it was
banked — the verification record for LLM-proposed, test-verified mappings.

| File | Tests | Pins |
|---|---:|---|
| cskg.test.ts | 92 | CSKG fixture graph: normalisation, support counting, longest match, grounding — *mixed tier, see note* |
| wordnet.test.ts | 14 | WordNet base layer, cold disambiguation |
| ansci-wordnet.test.ts | 13 | WordNet lexicon provider, climb, confidence gate, X1 brake |
| framenet.test.ts | 10 | FrameNet acceptance, fixture bundle tier |
| ansci-framenet.test.ts | 5 | FrameNet valency provider, three-state assessment |
| ansci-verbnet.test.ts | 6 | VerbNet valency provider |
| ansci-verb-domain.test.ts | 5 | VERB_DOMAIN_V1 classification and domain prior |
| ansci-anchor.test.ts | 12 | Anchor quality: sense-pinned anchors only |
| ansci-class-climb.test.ts | 12 | Creature-class climb (Slice A) |
| ansci-stuff-climb.test.ts | 10 | Stuff-class climb (Slice B) |
| ansci-recognition.test.ts | 9 | Recognised-but-unclassified climb outcome (Slice C) |
| ansci-overlay.test.ts | 7 | Per-word overlay partition, fill-only law (Slice D) |
| ansci-h7.test.ts | 8 | H7 flavor bridge banking pass |
| ansci-glasgow-priors.test.ts | 10 | Glasgow dimensions as provenance-carrying priors |
| ansci-cskg-feed.test.ts | 12 | CSKG feeder mapping (fixture tests) |
| ansci-cskg-ingest.test.ts | 8 | Live CSKG ingestion, resolution order |
| ansci-cskg-bundle.test.ts | 2 | CSKG bundle regeneration script |
| ansci-senses.test.ts | 12 | SenseUnit + Senses-Scening over all human senses |

Note on `cskg.test.ts`: at 92 tests / 1,477 lines it is the single largest file
and it straddles T1–T4 (fixture graph, statement grounding, tool questions,
repair frames). It is filed in T2 by its fixture/bank centre of gravity, but
splitting it by subject is the one structural change this audit recommends
before any deletion pass.

### T3 — Units and subsystems · when that unit changes · 19 files, 226 call sites

| File | Tests | Pins |
|---|---:|---|
| ansci-pricing.test.ts | 18 | Pricing foundations R0: ceilings, support bands, decline floor |
| ansci-mechanisms.test.ts | 18 | Eight adjudicated parser mechanisms (GAPS §5) |
| ansci-normalcy.test.ts | 25 | Normalcy arc: move chosen, evidence source, flag raised |
| ansci-social.test.ts | 30 | Social Unit S1–S2: recognition kinds, interlocutor store |
| ansci-emotional-uptake.test.ts | 17 | E programme: feelings-first registration |
| ansci-uptake.test.ts | 20 | Uptake move family UP-1/UP-2 |
| ansci-discourse-record.test.ts | 9 | Discourse Record reader (pure derivation) |
| ansci-discourse-wiring.test.ts | 6 | Discourse Record consultees wired (DR-2) |
| ansci-quantification.test.ts | 16 | QuantificationUnit ledger, UnitsMeasurement wiring |
| ansci-units-qudt.test.ts | 7 | QUDT port into UnitsMeasurement |
| ansci-qualreas.test.ts | 6 | qualreas relation algebra (RCC-8, Allen) port |
| ansci-edu-reach.test.ts | 6 | EDU larger-graph reach |
| ansci-aspects.test.ts | 6 | Aspect wiring; emotion via LEDU→EDU bridge |
| ansci-aspect.test.ts | 6 | Aspect feature bundle: EN families, ZH particles, Vendler |
| ansci-adverbs.test.ts | 5 | Adverb restoration (GAPS §6) |
| ansci-classifier.test.ts | 4 | Classifier agreement (stage 5, F.3) |
| ansci-info-object.test.ts | 13 | Information-object envelope + core |
| ansci-mappath.test.ts | 10 | Schematic correspondence gate: trace.mapPath |
| ansci-problem-solving.test.ts | 4 | ProblemSolving Unit placeholder: seat, approach graphs, router |

### T4 — Programme gates · before merge to main / weekly · 16 files, 376 call sites

Exit gates for named programmes and the CSKG conversation builds. Keep all;
run as a block before a merge, not per edit. A failure here after T0–T3 pass
means a programme's declared effect regressed — serious, but it is located
by the higher tiers first.

| File | Tests | Programme |
|---|---:|---|
| ansci-imp-programme.test.ts | 57 | Implementation programme (2026-11-19) |
| ansci-s-programme.test.ts | 56 | S programme: edges R and E left named |
| ansci-x-programme.test.ts | 28 | X programme: cross-turn recognition |
| ansci-recognition-programme.test.ts | 32* | Recognition programme |
| ansci-conversation-shapes.test.ts | 34 | Conversation-shapes: fixes from sealed probe run |
| ansci-r3.test.ts | 21 | R3: gap questions, grounded declines |
| ansci-r4.test.ts | 15 | R4: disposition live |
| ansci-r5.test.ts | 18 | R5: cohesion, echo, correction as supersession |
| ansci-r6.test.ts | 15 | R6: bounded initiative, awareness frame |
| ansci-r7.5.test.ts | 12 | R7.5: predication question site reads standing state |
| cskg-e4.test.ts | 37* | E4: conversation frame, roles, person file |
| cskg-e5.test.ts | 17 | E5: situation model, relation families |
| cskg-setup.test.ts | 8 | TUI/setup decisions, loader cache state |
| cskg-annotator.test.ts | 7 | Parser sidecar (spaCy proposes, graph binds) |
| cskg-devloop.test.ts | 19 | Dev-loop toolset pure logic: diff, verdicts, clustering |
| chat-history.test.ts | 4 | One-shot chat replay contract |

\* Counts are `test(` call sites; the statically-named count for these two
files is lower (31 and 34 in the earlier extraction) because some cases are
generated from data tables.

### T5 — Sealed and diagnostic probes · on purpose only, never a gate

No files in `test/`. The sealed conversation probe set and the diagnostic
probe runs live outside the suite, are scored when deliberately opened, and
a result there is a research finding, not a build break. `ansci-sealed.test.ts`
(T0) covers only the sealing machinery.

## Duplicate / subsumption review

No file is recommended for outright deletion. Five pairs/groups were checked
for subsumption; the verdict in each case is *demote or keep*, not delete:

| # | Group | What overlaps | Verdict |
|---|---|---|---|
| 1 | R files (fork-r3…r7.5, 81) vs fork-plan/compose/pricing/realise (46) | Same planner modules, end-to-end vs unit level | Keep both. R files already demoted to T4; unit files are the T1/T3 gate. |
| 2 | Legacy suite (9 files, 111) vs fork suite | WordNet, FrameNet, routing tested in both generations | Keep both while both engines live. If the original engine is ever retired, this group is the first deletion candidate — as a block, by that decision, not piecemeal. |
| 3 | cskg.test.ts (92) vs cskg-e4/e5 (54) | Same loader/memory/turn imports; shared inputs (`What is a banana?`, `Why did you say that?`) | Keep. Split cskg.test.ts by subject first; re-audit after the split. |
| 4 | Conversation-shapes (34) vs IMP/S/X/recognition programmes (173) | Same sealed-probe failure families; shared inputs (`The garden is cold.` in 6 files, the friend-died sentence in 4) | Keep as T4. Re-audit after the next sealed run: if a shape is now covered by a programme test with the same assertion, that shape test is a deletion candidate then. |
| 5 | Climb tests (anchor 12 + class 12 + stuff 10 + recognition 9) vs fork-wordnet (13) | The WordNet climb asserted at provider level and again at climb level | Not duplicates — layered assertions on one mechanism. Keep; they are how a climb failure gets located. |

Estimated deletion ceiling after a second, assertion-level pass: **under 10%**,
and most of it would come from group 2 or 4 following a decision made for
other reasons — not from tidying.

## Applied scripts (2026-11-19)

Implemented as a manifest + runner, so re-tiering a file is a one-line change
in `test/tiers.json`, not an edit to `package.json`:

- `test/tiers.json` — the manifest: every test file's primary tier (the tables
  above in machine-readable form).
- `scripts/test-tier.mjs` — the runner: resolves a tier name to its compiled
  files in `dist/test/`, errors (never silently passes) on an unknown tier or
  a missing build, and exits with the test runner's code.
- `package.json` scripts, each building first:
  - `npm run test:t0` — T0 only
  - `npm run test:core` — T0 + T1, the daily gate
  - `npm run test:bank` — T2
  - `npm run test:units` — T3
  - `npm run test:programmes` — T4
  - `npm test` — unchanged: the full suite, all tiers

Verification on this tree, 2026-11-19:

| Command | Result |
|---|---|
| `npm run test:t0` | 69 tests, 69 pass / 0 fail, 11.2 s of test time |
| `npm run test:core` | 247 tests, 247 pass / 0 fail, 44.1 s of test time |

`test:bank`, `test:units` and `test:programmes` use the same runner and
manifest and were not separately run; the full `npm test` remains the
pre-merge check that covers them.

## What nobody has checked

- Assertion-level duplication *inside* the shared-input groups: this audit
  compared titles, imports, headers and inputs, not every assertion body.
  Group 4 in particular could hide a few true duplicates.
- ~~Whether the tier gates pass clean on this tree~~ — now checked for the
  daily gate: `test:t0` 69/69 and `test:core` 247/247, both on 2026-11-19
  with a fresh build (see Applied scripts). The T2–T4 tier commands have
  not been separately run; the full suite that covers them did not finish
  within 120 s in the earlier check on this tree.
- Whether `ansci-integrate` is the right canonical tree: other worktrees
  range from 701 to 1,245 call sites, and the union tree will re-shuffle
  some of these files.

## Addendum — main has moved (2026-11-19, push staging)

The audit above was made on `integrate/imp-discourse` (80 files). Since then
the union landed on `main` (`e3e0daf`), which carries **98 test files** — the
same 80 plus 18 more. All 18 are classified in `test/tiers.json`, from their
file headers, so the manifest is complete on main:

| Tier | Added files |
|---|---|
| T2 bank (+6) | fork-entities, fork-entity-rank, fork-wikidata, fork-wikidata-w2, fork-wikidata-w3, fork-vocab-pass |
| T3 units (+4) | fork-lesk, fork-emotion-mix, fork-paramorphic-concepts, fork-problem-records |
| T4 programmes (+8) | fork-transcript-slice1…7, fork-uptake-narrative |

Tier sizes on main: T0 9 files · T1 18 · T2 24 · T3 23 · T4 24 = 98.
The daily gate is unchanged: T0+T1, 27 files — none of the 18 additions
belongs in it. The push staging worktree is `~/workspace/ansci-tiers-push`,
based on `origin/main` at `e3e0daf`, and the tier gate was re-verified there
before any push.
