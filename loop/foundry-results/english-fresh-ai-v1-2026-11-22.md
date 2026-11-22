# Fresh AI-authored English cases — first run

The 10 cases and their expectations were written and committed as `b14b1f9` before running. The author is a project collaborator with access to the code, earlier cases and results. This is development evidence, not an independent or sealed evaluation. The fixture is `loop/foundry-cases/english-fresh-ai-v1.json`; the full first report is alongside this record.

Command: `npm run foundry --silent -- evaluate --suite loop/foundry-cases/english-fresh-ai-v1.json --json`. Exit 1; four case verdicts pass and six fail. Four failures contain an expected `patient` role that was not found (chase/dog, push/cart, feed/horse, eat/cake); determine whether the graph's role is semantically wrong, uses a different legitimate role, or the expectation is too narrow. One reports `scratched` as present tense. One does not show the expected `it -> dog` resolution in the trace. Inspect raw traces and graphs before assigning causes or editing expectations. The result does not grade conversational quality and is too small to estimate general accuracy.

Next: inspect the failed cases with the real turn trace and meaning graph, then pick a general fix supported by evidence. Preserve this first report and the original expectations.
