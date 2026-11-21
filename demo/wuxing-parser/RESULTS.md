# Results — the Wuxing sentence layer, scored (generated)

Generated 2026-11-21 by `npm run ansci:demo`. **29/29 expectations met · 29 parsed · 27 exact round-trips.**

Scored against the expectations in `sentences.tsv`: a sentence
passes when the parser does what the corpus says it should —
including the two sentences whose expectation is to be
*flagged* by the controlling-cycle checker. A FAIL here is a
real result and stays in the table until the parser improves.

| # | Sentence | Demonstrates | Expectation | Result |
| --- | --- | --- | --- | --- |
| 1 | The dog bit the man. | canonical clause: predicate, agent, patient | `exact` | pass |
| 2 | The man was bitten by the dog. | passive — the meaning graph must be identical to the active | `exact` | pass |
| 3 | I was furious. | two addresses: adjective in syntax (Fire), anger in the net (Wood) | `exact` | pass |
| 4 | She didn't arrive. | negation arrives on a Metal carrier (the auxiliary), which carries the tense | `exact` | pass |
| 5 | She didn't arrived. | the K6 violation: tense on both carrier and verb — must be flagged | `flagged:negation-carrier-tense` | pass |
| 6 | What did you make? | fronted question word, gap in the object slot | `exact` | pass |
| 7 | There is a cat on the roof. | expletive: 'there' classifies nothing | `exact` | pass |
| 8 | It is raining. | weather predication: rain with no Earth participant | `exact` | pass |
| 9 | My bananas have gone all brown. | resultative change of state on the generating arc | `exact` | pass |
| 10 | If I were king, I would abdicate. | conditional + subjunctive mood | `exact` | pass |
| 11 | The soup needs more salt. | food vocabulary joining the net by taste correspondence | `exact` | pass |
| 12 | Today is Monday. | nominal predication in English: the predicated-as relation | `exact` | pass |
| 13 | He was given a book. | passive with the agent suppressed — recorded, never invented back | `exact` | pass |
| 14 | The wind blows from the east. | a verb the hand lexicon does not list (WordNet-fed, if enabled) | `exact` | pass |
| 15 | Winter is coming. | season as subject, progressive canonicalised | `canonical` | pass |
| 16 | 我吃了饭。 | aspect particle as clause scope, not a word in the chain | `exact` | pass |
| 17 | 他一边走一边唱歌。 | one correlative relation realised by two discontinuous tokens | `exact` | pass |
| 18 | 你买什么？ | wh-in-situ: the question word stays in its object slot | `exact` | pass |
| 19 | 今天星期一。 | verbless nominal predication — entry at Earth, predicated-as | `exact` | pass |
| 20 | 他很忙。 | adjectival predication with no copula (R1) | `exact` | pass |
| 21 | 他跑得很快。 | degree complement carrying the main content | `exact` | pass |
| 22 | 他买三本书。 | classifier present: numeral–classifier–noun in fixed order | `exact` | pass |
| 23 | 他买三书。 | missing classifier — must be flagged | `flagged:missing-classifier` | pass |
| 24 | 你去不去？ | A-not-A question form | `exact` | pass |
| 25 | 他走了吗？ | sentence-final particles in scope order （了 before 吗） | `exact` | pass |
| 26 | 饭被吃了。 | agentless 被 passive: the agent slot is suppressed, not filled | `exact` | pass |
| 27 | 他不去学校。 | preverbal negation 不 — dropped at parse until stage 5 (defect F1) | `exact` | pass |
| 28 | 他没去学校。 | preverbal negation 没， selected by the aspect bundle (Part F.2) | `exact` | pass |
| 29 | 他去没去学校？ | A-not-A with the bounded-reading negator 没 | `exact` | pass |

## Scoreboard history

| Date | Expectations met | Parsed | Checker-clean | Exact round-trips | Expected flags raised |
| --- | --- | --- | --- | --- | --- |
| 2026-11-15 | 26/26 | 26 | 24 | 23 | 2 |
| 2026-11-15 | 26/26 | 26 | 24 | 24 | 2 |
| 2026-11-16 | 29/29 | 29 | 27 | 27 | 2 |
