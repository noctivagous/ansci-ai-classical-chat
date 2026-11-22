# MASC to AnSci role mapping, version 1

Machine-readable mapping: `loop/foundry-cases/masc-ansci-role-mapping-v1.json`.
It maps only three selected MASC/PropBank examples. It does not define a
general rule such as “A0 means agent” or “A1 means patient.” Original roleset
labels remain attached to every case.

| Source annotation | AnSci interpretation for this example | Scoring treatment |
|---|---|---|
| `prepare.01` A0 Goodwill | `prepare -> Goodwill : agent` | Score direct edge |
| `prepare.01` A1 people | `prepare -> people : theme` (patient is a separately reported acceptable relation) | Score relation and report which one occurred |
| `find.01` A0 “We scientists”, head *We* / phrase head *scientists* | Direct `find -> scientists : agent`, with `we -> scientists : qualifies` | Accept and report the two-edge path; do not demand `find -> we` |
| `find.01` A1 facts | `find -> facts : theme` (patient is a separately reported acceptable relation) | Score relation and report which one occurred |
| `call.01` A0 Michael, A1 Goodwill | Semantic mapping unresolved pending the historical frameset | Retain participant-attachment evidence only; do not score semantic roles |

The two-edge `find.01` path is a representation alignment decision for this
appositional phrase, not a claim that all PropBank spans should be rewritten
to AnSci phrase heads. A future evaluator should retain both the source token
span/head and the AnSci node/path, and report direct versus indirect matches
separately. Foundry now reads this mapping during evaluation and records each path and whether it is direct or indirect. Unresolved mappings abstain. This small development set is not an estimate of general role accuracy.

## Evidence and limits

The mapping uses the checked-in scout fixture and graph snapshots:
`loop/foundry-cases/english-masc-scout-v1.json` and
`loop/foundry-results/english-masc-scout-v1-graphs-2026-11-22.json`.
The snapshots show AnSci's `prepare` agent/theme assignment and `find`
agent/theme plus the `we -> scientists` qualifier. In the `call` case Michael
is absent, so the mapping makes no claim about how AnSci should represent him.

This is a development mapping, not a validated scoring instrument. The scout
set has three sentences; `call.01` remains blocked on confirming the historical
PropBank frameset, and repeated lemmas require token identity before they can be scored reliably.

## Focused evaluation

The mapped scout evaluation passed four mapped arguments: three direct paths and one indirect path. Two call arguments abstained because their historical roleset remains unresolved. These results cover only the declared checks, and do not establish complete sentence understanding. Command: `npm run foundry --silent -- evaluate --suite loop/foundry-cases/english-masc-scout-v1.json --json`.
