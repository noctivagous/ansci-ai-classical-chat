# Link Grammar exploratory evaluation

2026-11-20. Evaluated Link Grammar 5.13.2, English dictionary 5.12.4,
from the official release archive, built locally without installing it.
This is an exploratory comparison, not a sealed or independently scored
benchmark. The examples were chosen during the investigation, after seeing
the motivating inputs; they are not a held-out set.

The parser's first linkage connects `help` to the embedded verbs and the
verbs to their objects for “Can you help me plan a trip?” and “Can you
help me write a letter?”. It gives 16 valid linkages for each, showing that
the first linkage is a choice among alternatives, not a proven reading.
The existing AnSci parse places the embedded verb and object as separate
matrix excess/patient nodes; the local candidate annotation recognizes
the two simple forms but does not attach a clause to the graph.

Additional controls, first linkage inspected:

- “Can you help me?” and “Can you swim?” have no invented embedded verb.
- “Can you help me plan a trip and write a letter?” connects both verbs
  and their respective objects (63 valid linkages). The local annotation
  deliberately abstains on coordination.
- “Could you assist me to book a flight?” links `assist`, `to`, `book`
  and `flight`; “Please help her carry the boxes.” links `help`, `carry`
  and `boxes`. These go beyond the local help-only question shape.
- “Can you help me with my plan?” attaches the prepositional phrase;
  `plan` is a noun, a useful negative control.
- “Can you help me plan a trip if it rains?” includes the conditional
  clause; correct semantic scope has not been independently evaluated.
- “Can you help me not miss the train?” produced no complete linkage;
  its first partial linkage left `not` unused. It must not be treated as
  a successful interpretation or silently drop negation.
- “I saw the man with the telescope.” yielded 16 valid linkages. The
  first linkage is one reading; ambiguity needs further inspection.

Integration questions remain: translate typed links into AnSci's graph,
resolve controlled subjects and ambiguity, retain negation and token
provenance, identify partial parses, and decide how the parser is deployed
in Node and browser surfaces. Native build dependencies and LGPL obligations
must be reviewed for the chosen distribution. No runtime dependency or
production routing was added by this experiment. AnSci remains responsible
for interpretation, capability admission, reasoning and response.

## Repeatable parser comparison (2026-11-20)

Added `data/ansci/parser-comparison-v1.json` and
`scripts/ansci-parser-compare.mjs`. Run AnSci alone with
`npm run ansci:parser-compare`; add Link Grammar by setting
`LINK_GRAMMAR_BIN` and `LINK_GRAMMAR_CWD` to the locally built executable
and dictionary root. Each JSONL row records the provisional target, AnSci
root/nodes/edges/negation/embedded-task metadata, and Link Grammar's
linkage count plus first-linkage cost vector. It is a repeatable diagnostic,
not a scored gold benchmark: these 12 targets are builder-authored, not
independently reviewed, and link counts do not establish correct meaning.

Observed on the current checkout:

| Case | AnSci result | Link Grammar observation |
|---|---|---|
| Simple transitive | Correct root and agent/patient edges | 2 linkages; first has UNUSED=0 |
| Modal direct request | Root/object retained; `you` is absent | 2 linkages; first has UNUSED=0 |
| Embedded help request | Graph flattens `plan` and `trip` as separate patients; separate candidate metadata names `plan a trip` | 16 linkages; first connects help, me, plan, trip, but alternatives need semantic adjudication |
| Negated event | `book` has `negated=true`, with agent and patient | 6 linkages; first has UNUSED=0 and links `not` to `book` |
| Coordination | `and` becomes a patient; second verb is attached as `result` | 2 linkages; first connects both verb phrases and objects |
| Attachment ambiguity | Picks one `location` edge to binoculars | 4 linkages, but first has UNUSED=1; no conclusion about correct ambiguity handling |
| Short fragment | Throws `no verb found` | 8 linkages; first has UNUSED=0 but DIS=0.75 and treats `flights`/`please` as verbs, a misleading acceptance |
| Incomplete embedded task | No embedded-task candidate; `plan` is flattened as a patient | 22 linkages; first has UNUSED=0 |
| Conditional question | `flight`/`delayed` relation is lost; `if` is assigned as agent | 6 linkages; first has UNUSED=1 and DIS=2.00 |
| Two sentences | Both clauses are collapsed into one graph; `book` is incorrectly marked passive | 10 linkages; first has UNUSED=0, but this does not establish coreference |
| Telegraphic chat | `need`/`hotel` and `asap` are represented plausibly | 2 linkages; first attaches `asap` as the object of `need`, not `hotel` |
| Chinese control | Only `我` and `想` survive; booking and room content is lost | Not applicable; this Link Grammar build is English |

Link Grammar's output demonstrates the difference between syntactic coverage
and interpretation: it accepts the fragment, yet its first linkage assigns
surprising verb readings and carries a high disjunct cost. `Found N
linkages` counts alternatives, not confidence. Likewise, AnSci returning
one-root graph is not proof that all clauses or roles were preserved. This
comparison supports neither “Link Grammar solves the parser” nor “Wuxing
makes parsing work”; it identifies structural failures and supplies a
repeatable baseline for adapter tests.

## What the Wuxing evaluation demonstrates

The repository has different strengths of Wuxing-related evidence; they
must not be collapsed into a claim that the cycles dynamically parse
sentences:

* `sentence.ts` declares the generating/controlling maps and `cycleOf`;
  parser and planner edges often carry the corresponding cycle label. This
  is representational bookkeeping by itself, not evidence that a cycle
  changed an interpretation.
* `sense.ts` uses the maps in a real parse-stage decision for English.
  `parse.ts` calls `applySenseSelection` on the English path (the Chinese
  path returns before it), and it can change a derived noun/adjective's
  `semanticElement` when another live candidate receives more cycle-based
  support. `npm run ansci:sense` compares that output with isolated-climb
  baseline: A is 11/11 vs 3/11 and B is 6/6 vs 3/6. This shows a benefit on
  a narrow builder-authored set; B is hash-sealed but not independently
  authored, and this changes element/sense selection rather than syntactic
  structure or the user's words.
* `check.ts` has unit-tested cycle-related validators, but the turn path
  imports only `assessMissingRoles`. `checkSentence` and `assessValency`
  have no caller in `src/`; the full map audit independently identified the
  latter as unwired. Their unit tests do not show live conversational effect.
* `cycle-probe-evaluation.md` is explicitly a desk evaluation with no code
  built for its broad sentence-dynamics claim. Net propagation and the
  sense challenge are narrower evidence.
* `depth-cycle-evaluation.md` finds sense-by-coherence weak and coverage
  bound, role-by-element fails at current coverage, and valency-by-element
  works only at coarse grain in its offline evaluation.

So the evidence supports a real but narrow cycle-based sense-selection
effect. It does not yet show that Wuxing makes the general parser more
accurate, handles the failures above, or causes better conversational
replies. To test those claims, compare held-out inputs with the sense pass
enabled and disabled, score graph/role/sense changes against independently
adjudicated targets, and separately verify each proposed cycle mechanism is
reached from `processTurn`.

Next evaluate a preregistered, independently reviewed set of direct,
controlled, ambiguous, negated, coordinated and Chinese inputs. Measure
complete versus partial parses, task and role accuracy, ambiguity, runtime,
and effects of an adapter against AnSci's baseline; retain a separate
holdout. For Wuxing, run an enabled/disabled ablation on a held-out
conversational set and trace which cycle-based code paths fire. Verify the
chosen version's dictionaries and distribution license.
