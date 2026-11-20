# AnSci Fork — Cycle-Probe Evaluation

Date: 2026-11-15. Desk (paper) evaluation, no code built. Follows the
addendum (Part 7) of `desk-evaluation-sentences-wuxing.md`, which found
the first evaluation had not accounted for the generating and controlling
cycles in the net, and corrected its verdict accordingly.

**Claim under test:** the two cycles are the *dynamics* of the sentence
representation —
- **Generating (sheng)** Wood→Fire→Earth→Metal→Water→Wood =
  construction: assembly order within a clause, and closure/flow into
  the next clause.
- **Controlling (ke)** Wood→Earth, Earth→Water, Water→Fire, Fire→Metal,
  Metal→Wood = constraint: each element checks, limits, or forces
  structure on the one it controls.
And, joined to the ontology net via the semantic address (amendment A1),
the same cycles running over *meanings*, where earlier AnSci engine work
already implements them as operators (generation/restraint traversal,
per-relation decay, restraint arbitration, conflict flagging, balance
assessment).

**Scoring:** ✓ the cycle operation predicts or decides the case with no
extra rule · ◐ mechanism is right but needs lexical/construction data,
or is coherent-but-unproven · ✗ cycle (as stated) predicts wrong.
Where the source file's version and the corrected cycle differ, both
are scored.

## Generating probes (G1–G6)

| # | Probe | Score | Notes |
|---|---|---|---|
| G1 | Assembly order, single clause: build "The angry cook quickly chopped the onions" by traversing Wood→Fire→Earth→Metal→Water | ◐ | The traversal is a valid *assembly dependency* order (verb/valency decided first, modulation last), but it is not the surface order (connective templates own that) and not the only valid assembly order. Generating cycle = construction logic, not word order — consistent with the settled two-graph shape. |
| G2 | Closure across clauses: the end of one clause feeds the next clause's Wood. "She heard the news. Then she shouted." / 我吃了饭就去睡觉。(Wǒ chī le fàn jiù qù shuìjiào — "I ate, then went to sleep.") | ✓ | Clause chaining sits exactly at the Water→Wood closure point; sequential markers (then, 就 jiù) realise the closure edge. The first evaluation scored multi-clause items for structure only and never for this — the cycle predicts where chaining markers live. |
| G3 | Result/manner generation: "My bananas have gone all brown" / "The soup got hot" / 他跑得很快。(degree complement) | ✓ | Result and manner expressions are *generated from the verb* (Wood→Fire), not attached to a noun. This is the generating arc doing predictive work: it says where resultatives attach. (Re-scores E3/C6 of the first evaluation.) |
| G4 | Fire→Earth in production: generating a description, modifiers are produced as illumination of an Earth node already chosen | ◐ | Assembly follows the cycle in both languages; surface placement differs (Chinese modifiers precede the head, English adjectives precede but relative clauses follow) — again assembly ≠ surface, connective templates carry the difference. |
| G5 | Earth→Metal→Water chain: "a big pot of soup on Saturday" — noun generates its relational structure (Metal), which channels its modulation (Water) | ✓ | Each step's choices constrain the next in cycle order: the preposition available depends on the noun, the adverbial scope on the resulting phrase. Ordinary dependency parsing records these arcs but does not order their *decisions*; the cycle does. |
| G6 | Generation entry at Water: the source file's own generation procedure starts from a Water node (deep intent/modality) and chooses the root Wood from it | ✓ | Coherent only because the cycle closes: Water is a legitimate entry point precisely because Water→Wood is an arc. A DAG-shaped schema could not state its own generation procedure this way. Also the formal counterpart of R1's fix (a cycle has no privileged entry point, so Fire/Earth-rooted verbless clauses are rotations, not exceptions). |

Subtotal: 4 ✓ · 2 ◐ · 0 ✗

## Controlling probes (K1–K6)

| # | Probe | Score | Notes |
|---|---|---|---|
| K1 | Metal→Wood, agreement: "She goes" / *"She go"; generation must select the verb form the subject's number (Metal cut) forces | ✓ | Controlling edge predicts both the error detection and the generation choice. In Chinese the edge is *dormant* — no agreement morphology — and the cycle correctly predicts there is nothing to catch; the nearest Chinese analogue runs the other arc: the noun (Earth) generates its classifier (Metal structure), and a wrong classifier is the same *kind* of violation, caught Earth-side. Language-parameterised edges, not failures. |
| K2 | Water→Fire, negated/modulated expression: "She is not happy" / "The soup is not very hot" / *"very not hot" | ◐ | Negation and degree (Water) restrain the adjective/mood (Fire): scope and ordering fall out — restraint applies to the generated Fire content, and degree must be generated before restraint can apply to it, which is why "very not hot" fails. Fine scope facts (what exactly "not" covers in "not very hot" vs "very hot, not warm") need lexical data on top. |
| K3 | Fire→Metal, mood forces structure: "If I were king" (not *was*, formal register); imperative "Be quiet!" (subject dropped, bare stem) | ◐ | Mood (Fire) controlling structure (Metal) predicts that a mood change *forces structural change* — the first evaluation scored this a "stretch" of a conjunction slot; under the controlling cycle it is a prediction. Register variation (colloquial "if I was") is template data, hence ◐ not ✓. |
| K4 | Wood→Earth, valency control: *"He put the book." (missing required locative) / *"She slept the bed." (excess Earth) / "He put the book on the table." | ✓ | The strongest controlling result. The verb controls how many Earth nodes may/must appear and in what roles; the cycle edge detects both deficiency and excess, in parsing and in generation. This was credited as generic "valency" in the first evaluation — it is the controlling cycle's first arc. |
| K5 | Earth→Water, scope restraint: "He only chopped the onions" vs "He chopped only the onions"; "She said yesterday she had left" (which clause does "yesterday" modify?) | ◐ | The active Earth ground restrains where Water modulation may attach: "only" changes claim with its Earth anchor, exactly an Earth→Water restraint fact. The cycle names the ambiguity and its locus; resolving it needs discourse/situation data. |
| K6 | Negation of tense, retested with the *correct* cycle. Source file: Water→Wood directly. Corrected: controlling input to Wood is Metal. | file ✗ · corrected ✓ | The corrected cycle explains facts the file's version cannot: English negation must arrive on a Metal carrier — an auxiliary — and that carrier then controls the Wood form: "She didn't arrive" (auxiliary carries tense, main verb bare) and *"She didn't arrived" is ungrammatical *because* Metal→Wood control forbids tense on both. Do-support, usually a stipulation, falls out of routing negation through the controlling cycle's actual arcs. Strongest single piece of evidence in this evaluation that correcting to the true cycles pays. |

Subtotal (corrected scheme): 3 ✓ · 3 ◐ · 0 ✗

## Net-join probes (N1–N5) — cycles over meanings, sentence graph joined to the ontology net

| # | Probe | Score | Notes |
|---|---|---|---|
| N1 | Anchor derivation: "Why is winter cold?" — winter and cold share Water/Yin; unmapped hyponyms (sleet, hail, rain) inherit the classification by propagation | ✓ | **Already test-verified in the earlier engine work**, not just desk-argued: cycle operators + propagation built and re-verified 2026-11-08/09 (suite 80/80; sleet/hail/rain/virga inherit Water 0.7841 / Yin 0.7574; the snow fixture chain yields Water at exactly 0.54, faint, derived; curated classifications supersede propagated ones). The cycles in the net demonstrably work at this layer. |
| N2 | Statement dynamics: "She was furious when she heard the news." Semantic address: anger = Wood. Generating: Wood→Fire (expression — the raised voice, the telling). Controlling: Metal restrains Wood; Wood restrains Earth. | ◐ | The cycle gives the *reply* somewhere specific to go that is not a template: toward the Fire expression (what was said/done) or the Metal restraint (what was lost — grief checks anger, in the correspondence and in life). Mechanism coherent and specific; whether replies along cycle paths read as good chat is a transcript question, not a desk question. |
| N3 | State chain: "I can't sleep, my mind keeps racing, I keep worrying." Racing = Fire excess; worry = Earth; sleep/rest = Water. Earth→Water controlling: worry restrains Water. | ◐ | The cycle chain Fire-excess + Earth→Water restraint yields a targeted conversational path — address the worry (Earth) to release sleep (Water) — rather than a direct reply about sleep. This is the TCM reading stated as graph dynamics, and it is *derivable in the net*, not hand-scripted. Usefulness unproven until transcripts; also note the standing honesty rule from the net design: balance conclusions never surface as medical claims. |
| N4 | Balance across a conversation: profile the semantic elements of a user's turns against a baseline (the net engine's assessBalance: subject profile vs seasonal baseline, excess/deficiency at a stated margin, restraining element as moderator) | ◐ | The operator exists and was verified against season profiles in the earlier work. Its fork use — steering a conversation's direction by excess/deficiency — is designed, not built, and its value is exactly what transcripts would judge. |
| N5 | Conflict and arbitration: a statement carrying strong opposed classifications ("cold hands, but furious" — Water and Wood/Fire signals together) | ✓ | The net's rule is already specified and acceptance-tested in the earlier design (OE-RESTRAINT etc.): restraint arbitration damps a propagated leaning once (×0.7, band down, recorded, never deleted), §6.4-style flagging when both sides are strong, curated classifications supersede propagated ones, and aspect-scoping means opposed elements on *different aspects* are not a conflict at all (the treble/bass case). The cycles come with brakes, and the brakes have tests. |

Subtotal: 2 ✓ · 3 ◐ · 0 ✗

## Negative controls (X1–X3) — what the cycles must not do

| # | Probe | Result |
|---|---|---|
| X1 | Wrong-address amplification: "cold" (illness sense) misclassified to Water/temperature — the cycles will happily derive winter/season conclusions from a head cold | **Risk confirmed, mitigations exist in the net design**: sense-keyed mapping (dictionary layer), (concept, aspect) classification tuples, conflict flagging. The cycles amplify whatever address they are given; address quality is load-bearing. Any build must treat classification confidence as a gate on cycle traversal. |
| X2 | Order must not dissolve: a "flow" metaphor might predict free word order in English | ✓ Architecture holds: the cycles live in the meaning graph, which contains no order edges (settled connective shape, rule C1/C2); order predictions are the connective layer's alone. The separation is what prevents this false prediction. |
| X3 | Overgeneration at density: with five nodes, everything is within two cycle steps of everything | **Open risk, carried**: decay per relation, restraint arbitration, aspect scoping, and curated supersession are the specified brakes and were verified at seed scale (N1/N5). They are untested at fork density. This is the main known threat to the whole design and should be an explicit acceptance item in any build. |

## Verdict

**The claim survives its probes, at mechanism level.** Totals across
G/K/N: 9 ✓ · 8 ◐ · 0 ✗ for the corrected scheme (the one ✗ in the set
belongs to the source file's mis-routed negation edge, and correcting it
produced the evaluation's strongest result, K6).

Specifically:
1. **Controlling = constraint is the best-supported half.** Valency
   (K4), agreement (K1), mood-forced structure (K3), and the
   Metal-routed account of negation/do-support (K6) are cases where the
   cycle doesn't redescribe a known rule but *routes* it — several
   "stipulations" of ordinary grammar become one mechanism.
2. **Generating = construction + closure is supported with a
   refinement**: the cycle orders *decisions*, not words (G1/G4), and
   its distinctive prediction is closure — clause chaining and
   generation entry at any point of the cycle (G2/G6), which a
   DAG-shaped schema cannot state.
3. **In the net, the cycles are not speculative**: at the semantic
   layer they already have test evidence from the earlier engine work
   (N1/N5). What has no evidence yet is the *conversational* use of
   cycle dynamics (N2–N4) — coherent, specific, derivable mechanisms
   whose value only transcripts can judge, per standing AnSci method
   (transcripts are the acceptance test).
4. **The brakes are part of the claim.** X1/X3: cycles amplify their
   inputs and overgenerate at density unless decay, arbitration,
   aspect-scoping, and confidence gating travel with them. A fork build
   that implements the cycles without the brakes has not implemented
   the design that passed these probes.

**Bottom line, replacing the earlier report's:** the sentences-to-Wuxing
schema, corrected to the true cycles and joined to the ontology net,
works for the fork's purpose — not as a complete standalone grammar,
and not as a mere scaffold either, but as a representation whose
*dynamics* are the two cycles: generating constructs and flows,
controlling constrains and arbitrates, in the sentence graph and in
the net alike. The remaining unproven layer is conversational:
whether cycle-guided replies read as good chat. That is a transcript
evaluation, and it is the natural next step.
