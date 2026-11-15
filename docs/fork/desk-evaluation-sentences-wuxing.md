# AnSci Fork — Desk Evaluation: Sentences-to-Wuxing + Connective Graph

Date: 2026-11-15. Status: paper (desk) evaluation only. No code built.
Subject under test: the mapping in `sentencesToWuxing.txt` (user-supplied,
2026-11-15), which its own first line states has no canonical basis in
traditional thought — a creative application of the correlative model.
Question (user, 2026-11-15): does it work?

## Part 1 — Connective graph shape: SETTLED (Kavi's ruling, for the user's judgment)

**Decision: two linked subgraphs in one store, not one graph with three
edge families.**

- **Meaning graph** — the Wuxing graph from the file. Unordered. Wood root,
  Earth spine, Fire illumination, Metal relations, Water modulation;
  generating edges = construction, modification edges = exceptions.
  Persistent and bankable: this is what "Bank what works" stores.
- **Connective graph** — per-utterance and ephemeral. A chain of token
  nodes under NEXT edges, span/group nodes for phrases and clauses,
  precedence constraints, and topic/focus marking. This graph *takes the
  word order*.
- **Alignment** — REALIZES edges between them: a meaning node is realised
  by 0 tokens (dropped subject, omitted complementiser), 1 token, a
  contiguous span (multiword predicates), or — see R8 — a discontinuous set.

Rules:
- C1. The meaning graph contains **no** NEXT/BEFORE edges. Checkable as a
  lint-style invariant.
- C2. No reasoning path (correspondence, generating/restraint cycles) ever
  traverses a connective or alignment edge. Same discipline as the earlier
  rulings that taxonomy and correspondence, and WordNet and the ontology,
  stay separate joined layers: merging propagation regimes corrupts both.
- C3. Generation = meaning graph + the language's precedence templates →
  a new connective chain. Translation = keep the meaning graph, replace
  the connective graph wholesale.
- C4. Topic/focus lives in the connective graph (it is a fact about the
  saying), voice and negation live in the meaning graph as node states
  (they are facts about the claim, per the source file).
- C5. "Separate" is logical, not physical: one store, layer-tagged
  subgraphs. The alternative (one graph, third edge family) was rejected
  because a single missed edge-type filter in any traversal would let
  surface order leak into ontology reasoning, and because one meaning
  legitimately has many surfaces (active/passive, fronted/plain, English/
  Chinese) — a many-to-many relation that a subgraph pair states directly.

**Amendments to the source file adopted before testing** (so failures
below are not charged for known defects):
- A1. Two addresses per word: a *syntactic* element (job in the sentence)
  and a *semantic* element (place in the ontology). E.g. "furious":
  syntactic Fire (adjective), semantic Wood (anger). One typing collapses
  the fork's emotion cases.
- A2. Modification is its own edge type (MODIFIES), distinct from both
  the generating and the restraint cycles. The file's "overcoming" edges
  (Water→Wood for negation, Fire→Earth for subjunctive) are generation
  edges by the standard cycles, not restraint edges.

**Base rules allowed in scoring** = the file's schema + Part 1 + A1/A2.
Anything else a sentence needs is counted as an *extra rule demanded*.

## Part 2 — Method

30 items: E1–E10 everyday English (chat register), H1–H10 hard English
phenomena, C1–C10 Chinese. Each scored for:
- **Coverage**: ✓ parses under base rules · ◐ parses only with a named
  extra rule, or parses but misplaces the main content · ✗ fails.
- **Round-trip**: regenerate *from the meaning graph + templates* (the
  input's connective chain is discarded first — regenerating from a stored
  chain would be copying, not generation). Paraphrase with the same claim
  = pass; lost emphasis/topic = noted separately from lost content.
- **Discrimination**: for paired items, does the representation keep the
  pair apart (or, for order-only pairs, correctly keep meaning *together*)?
- **Extra rules**: unique new rules tallied at the end. That tally is the
  verdict on the file's "two operations (grow, override)" claim.

## Part 3 — Everyday English (E1–E10)

| # | Sentence | Cov. | Notes |
|---|---|---|---|
| E1 | The angry cook quickly chopped the onions. | ✓ | The schema's home turf: Wood root, Earth spine, Fire local to Earth, Water into Wood, valency met. Round-trip ✓. |
| E2 | I'm making a big pot of soup on Saturday. | ✓ | Progressive = Wood aspect state; Saturday as Earth satellite via Metal ("on"). Round-trip ✓. |
| E3 | My bananas have gone all brown. | ◐ | Resultative: "brown" carries the main news but is Fire complement of the verb, not an Earth-attached modifier. Needs R6 (complement content). |
| E4 | Can I still make banana bread with them? | ◐ | Modal "can" = Water ✓, pronoun = secondary Earth ✓, but interrogative force itself has no node — mood in the file covers indicative/subjunctive/imperative only. Needs R2. Inversion itself is connective-only ✓. |
| E5 | Sarah is my sister. | ◐ | Copula is a dummy Wood root; the content is a noun predicate (kinship). Needs R1 (predicate root / nominal predication). |
| E6 | I lent him the ladder yesterday. | ✓ | Ditransitive with no marker for the recipient: the connective slot order alone assigns recipient vs theme. **The connective graph earns its keep here** — the file alone (order as a Water afterthought) cannot do this. |
| E7 | She was furious when she heard the news. | ◐ | Two clauses joined by Metal "when" ✓; A1 two-address typing handles furious (syntactic Fire / semantic Wood) ✓; but "furious" is an adjectival predicate — R1 again. |
| E8 | The soup needs more salt. | ✓ | Stative Wood root; degree "more" as Water/Fire degree state. Round-trip ✓. |
| E9 | He put the book on the table. | ✓ | Obligatory locative: "put" valency includes a required Metal slot. Valency doing real work, as the file intends. |
| E10 | We're going to visit my mother next week. | ◐ | "Going to" = one Wood realised by a span ✓ (connective grouping). "Next week" = a bare Earth span doing Water's job (time modification, no Metal marker). Type mismatch; connective slot template rescues the parse, the element typing does not. |

Subtotal: 5 ✓ · 5 ◐ · 0 ✗

## Part 4 — Hard English (H1–H10)

| # | Sentence | Cov. | Notes |
|---|---|---|---|
| H1 | She hadn't yet arrived. | ✓ | The file's flagship case, and it works — with A2: negation/perfect as MODIFIES on the Wood node, "yet" as clause-scope Water. (As literal "overcoming/restraint" edges it would have been mis-typed.) |
| H2 | If I were king, I would abdicate. | ◐ | Subjunctive + modal ✓ in spirit; "were king" is nominal predication (R1), and "if" states a *condition* relation between clauses, more than a Metal join — the file's Metal relation types do include "logical", so this is a stretch of an existing slot, not a new one. |
| H3 | The onions were chopped by the cook. | ✓ | **Best result in the set.** Passive = same meaning graph as the active, voice as a Wood node state, different connective chain. The two-graph split states this directly. Discrimination vs active ✓. |
| H4 | That book, I haven't read. | ◐ | Meaning: fronted Earth fills the object slot. Parser needs to accept an *empty* object position — R3 (gap/displaced realisation). Topic marking is connective ✓ (C4). Round-trip from meaning alone loses the fronting (emphasis lost, claim kept). |
| H5 | There is a cat on the roof. | ◐ | Existential "there": an Earth node with no referent, but the schema requires a referent ID on every Earth node. Needs R4 (expletive/presentational nodes). |
| H6 | The dog bites the man. / The man bites the dog. | ✓ | Discrimination pair: identical words, meaning differs *only* by connective slot order. Passes, and only because of Part 1 — this pair is the connective graph's reason to exist. |
| H7 | What did you make? | ◐ | Wh-fronting (R3, reused), interrogative force (R2, reused), "did" = a dummy Wood token realising no meaning (R4 family, reused). No *new* rule beyond the three already demanded. |
| H8 | John thinks that Mary believes the soup needs salt. | ✓ | Recursive clause graphs; "that" as Metal realised by 1 token here and 0 tokens in "John thinks Mary left" — zero realisation (Part 1) handles the omission with no extra rule. |
| H9 | The horse raced past the barn fell. | ✗ | Garden path: "raced" must be a reduced-relative participle, not the Wood root, so root-finding fails on first pass and the schema has no reanalysis. R5 (clausal modifier) names the structure but not the recovery. The one clean failure in English. |
| H10 | It is raining. | ◐ | Weather "it": expletive again (R4, reused); a zero-valency Wood root strains "valency = how many Earth nodes it grows into" but 0 is at least statable. |

Subtotal: 4 ✓ · 5 ◐ · 1 ✗

## Part 5 — Chinese (C1–C10)

| # | Sentence | Cov. | Notes |
|---|---|---|---|
| C1 | 我吃饭了。(Wǒ chī fàn le — "I ate / I have eaten.") | ◐ | Clean SVO core ✓. But aspect 了 (le, perfective particle) sits at clause end, far from the verb it modifies: an aspect (Wood-category, per the file) behaving with Water's long-range reach. Clause-scope attachment needed — R7. |
| C2 | 冬天很冷。(Dōngtiān hěn lěng — "Winter is very cold.") | ✗ | No verb at all; the adjective *is* the predicate. Root-always-Wood has nowhere to put the sentence's main claim. R1 fixes it (Fire as predicate root), but under base rules this fails. |
| C3 | 他把书放在桌子上。(Tā bǎ shū fàng zài zhuōzi shàng — "He put the book on the table.") | ◐ | 把 (bǎ) construction: the object is fronted before the verb and marked. Meaning = E9's, connective = a dedicated construction template. No new *meaning* rule; the template count grows — see verdict note on templates vs rules. |
| C4 | 书被他拿走了。(Shū bèi tā ná zǒu le — "The book was taken away by him.") | ◐ | 被 (bèi) passive: voice reversal exactly as H3 ✓, plus a compound verb-away span and clause-final 了 (R7, reused). |
| C5 | 我昨天去北京了。(Wǒ zuótiān qù Běijīng le — "I went to Beijing yesterday.") | ◐ | Time word *before* the verb (English: after) — per-language precedence templates state this cleanly ✓. But Beijing is a bare Earth goal with no Metal marker (compare E10), and 了 recurs (R7). |
| C6 | 他跑得很快。(Tā pǎo de hěn kuài — "He runs very fast.") | ◐ | 得 (de) degree complement: as E3, the main news ("very fast") lives in a complement, not in the root. R6, reused across languages. |
| C7 | 今天星期一。(Jīntiān xīngqīyī — "Today is Monday.") | ✗ | Pure nominal predication, no copula, no verb. Same failure as C2, Earth-flavoured. R1 fixes both. |
| C8 | 你吃了吗？(Nǐ chī le ma — "Have you eaten?") | ◐ | Interrogative force realised by a single clause-final particle 吗 (ma) in the connective graph — the cleanest realisation of R2 in either language: force is a connective-layer fact here almost visibly. Plus 了 (R7). |
| C9 | 我买的书很贵。(Wǒ mǎi de shū hěn guì — "The book I bought is expensive.") | ◐ | Relative clause *before* its head noun, joined by 的 (de) — a whole clause graph doing Fire's modifying job (R5 family), with reversed precedence vs English (template ✓); main clause is again a verbless adjective predicate (R1). Three known items, no new rule. |
| C10 | 他一边走一边唱歌。(Tā yìbiān zǒu yìbiān chànggē — "He sings while he walks.") | ◐ | Correlative 一边…一边 (yìbiān…yìbiān, "while…while"): one Metal relation realised by two *discontinuous* tokens. Span grouping as defined is contiguous — R8 (discontinuous realisation). |

Subtotal: 0 ✓ · 8 ◐ · 2 ✗

Known untested Chinese areas (not in the set, flagged not scored):
classifiers, serial-verb chains, topic chains across sentences,
sentence-final particles beyond 吗/了 (mood/attitude layer looks
connective-side and rich).

## Part 6 — Tallies and verdict

**Coverage: 9 ✓ · 18 ◐ · 3 ✗ (of 30).**

**Extra rules demanded (unique, beyond the file + Part 1 + A1/A2):**
- R1 Predicate root — nominal/adjectival predication; any element may
  root a verbless clause. Demanded by E5, E7, H2, C2, C7, C9. **One rule,
  six items, both languages — the highest-value fix in the evaluation.**
- R2 Interrogative force / speech act. E4, H7, C8.
- R3 Gap / displaced realisation for fronted constituents. H4, H7.
- R4 Expletive / dummy nodes (existential *there*, weather *it*,
  do-support). H5, H10, H7.
- R5 Clausal modifiers (relative clauses, incl. reduced relatives).
  H9, C9. Names C9's structure; does not by itself solve H9's reanalysis.
- R6 Complement content (resultative / degree complements carry the main
  news). E3, C6.
- R7 Clause-scope particle attachment (了, clause-final aspect). C1, C4,
  C5, C8.
- R8 Discontinuous realisation (correlative pairs). C10.

**Verdict, in three parts:**

1. **The file's strong claim fails.** "The parser needs only two rules
   (grow, override)" does not survive contact with 30 ordinary-to-hard
   sentences: 8 extra rules are demanded, plus the 2 amendments and the
   connective layer it treated as a secondary property. As a *complete*
   grammar, it does not work as written.

2. **The core survives, and the extra rules are the good kind.** The
   canonical clause (E1, E2, E6, E8, E9, H1, H3, H6, H8) is handled
   cleanly, and the failures are not a spray of one-offs: the same few
   rules recur across items *and across languages* (R1 in English and
   Chinese; R6 in E3 and C6; R2 in E4 and C8). A rule that fixes six
   items in two languages is a discovery about the schema's shape, not a
   patch. Notably, most extra rules land in the connective layer or in
   root-generalisation — not in the Wuxing typing itself. Construction
   templates (把, 被, 一边…一边) grow per language; that growth should be
   counted separately from grammar rules in any future run, since
   templates are data, not mechanism.

3. **The Wuxing labels themselves did almost no predictive work in this
   test — with one partial exception.** Item by item, "Wood" behaved
   exactly as "verb" and the generating edges as an ordinary dependency
   parse; the passes are passes for dependency grammar + the connective
   split, not yet for the elements. The exception: the file's locality
   claim (Fire local, Water long-range) held for attributive adjectives
   and for negation/aspect scope — and its failures were exactly the
   predicative adjectives (C2, E7), i.e. the claim is a true tendency of
   one use, not a law. **What this evaluation does not test at all** is
   the semantic layer: whether classifying *meanings* by element
   (anger → Wood) yields correct correspondences and useful inference.
   That is the fork's central thesis and it needs its own evaluation;
   nothing here confirms or refutes it.

**Bottom line:** build on it as a scaffold — dependency-shaped meaning
graph + settled connective graph + R1–R8 as the first work list — and do
not claim the 5-cycle is the grammar. The next evaluation, if the user
wants one, should test the semantic layer directly: classify a set of
emotion/state statements onto the attested correspondences and check
whether the inherited neighbourhood produces right, useful replies
(transcripts as the acceptance test, per standing AnSci method).

## Part 7 — Addendum (2026-11-15, after the user's challenge): the cycles were not accounted

The user asked three things: why "scaffold"; whether it works *for this*;
and whether the analysis accounted for the controlling and generative
cycles **in the net**. On the third: **no, it did not**, and that changes
parts of the verdict above.

**What the evaluation actually did with the cycles.** It flattened them
into static labels: generating edges were scored as ordinary dependency
arcs, and amendment A2 replaced the file's "overcoming" edges with a
generic MODIFIES type. A test that removes the cycle operations before
scoring cannot then conclude the cycles did no work — verdict point 3
above is therefore overstated and is corrected here. A2 was motivated
(the file's examples Water→Wood and Fire→Earth are generating edges, not
controlling ones), but the right move was to correct the file's edges to
the true controlling cycle and test *those*, not to dissolve the cycle
into MODIFIES.

**The cycles, correctly stated, against the sentence schema.**
Generating (sheng): Wood→Fire→Earth→Metal→Water→Wood.
Controlling (ke): Wood→Earth, Earth→Water, Water→Fire, Fire→Metal,
Metal→Wood.

- The file's five structural edges *are* the generating cycle in order
  (Verb→Adjective→Noun→Preposition→Adverb→next Verb). Dependency grammar
  predicts none of the closure: that the last arc feeds the *next*
  clause's verb is a cycle claim, and the multi-clause items (E7, H8,
  C4, C10) were never scored for it. Clause-final particles (C1's 了)
  sitting at the closure point, feeding the next clause, look less like
  a patch (R7) under this lens and more like the closure position —
  suggestive, not proven, but untested rather than failed.
- Controlling edges map onto grammar as *constraints*, and several were
  used in scoring without being named: Wood→Earth is valency (the verb
  controls how many Earth nodes, in what roles — credited generically in
  E6/E9); Fire→Metal is mood controlling structure (the subjunctive
  forcing structural change in H2 — scored as a "stretch", under the
  controlling cycle it is a prediction); Metal→Wood is the file's own
  agreement-constrains-verb example.
- **The set contained no controlling-cycle probes at all**: no agreement
  pair or agreement violation (Metal→Wood), no negated adjective/mood
  (Water→Fire, the true controlling route for negation of expression —
  the file's Water→Wood negation-of-tense remains mis-cycled, and A2
  stands for that item), no scope-restraint item (Earth→Water).
- Two re-scores follow. E3 ("gone brown"): the result adjective is the
  generating arc Wood→Fire itself, so structurally it parses under the
  cycle; R6 shrinks to an information-structure point (the complement
  carries the main news), not a structural rule. R1 (verbless predication,
  C2/C7): a cycle has no privileged starting point, so "root is always
  Wood" is the file's DAG overlay contradicting its own cycle; letting
  the clause enter the cycle at Fire or Earth is a correction *from* the
  cycle, not a patch bolted onto it.
- **"In the net" was also not done.** The sentence graph was scored
  standalone, never joined to the AnSci ontology net, where the cycles
  already exist as operators in the earlier engine work (generation /
  restraint traversal, per-relation decay, restraint arbitration,
  balance assessment). With A1's semantic address joined, cycle dynamics
  between *meanings* (e.g. semantic Wood in "furious") would bear on
  what the system says next. That interaction — sentence graph ×
  ontology net, cycles running in both — is the fork's actual design,
  and it remains entirely untested.

**Corrected verdict.** "Scaffold" was the wrong word for the fork's
purpose. Judged as a standalone complete grammar, the schema is
incomplete (Parts 3–6 stand). But the fork does not need a standalone
grammar; it needs a sentence representation that parses in and generates
out *inside* the net — and for that purpose the schema works on the
canonical clause, its extensions are systematic, and its organising
claim should be stated as: **the two cycles are the dynamics of the
representation** (generating = construction and cross-clause flow,
controlling = constraint and arbitration). That claim is *not yet
tested*: it needs a dedicated cycle-probe set — agreement pairs and
violations, negated mood/adjectives, subjunctive structure change,
multi-clause generating closure, and semantic-cycle effects on replies —
run with the sentence graph joined to the ontology net.
