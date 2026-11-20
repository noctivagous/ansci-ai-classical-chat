# Variant Graph

Schematic address: `knowledge/variant-graph` · Type: Store · State: partial · 45% completed to goal

AnSci's own graph of surface forms: variant nodes linked to the canonical forms they resolve to — shortforms, common misspellings, apostrophe-less contractions — each edge carrying register, provenance and confidence. Populated from published lists on the web, imported as sourced data, never hand-written into code. Consulted by Token during resolution; what is merely close is computed by the matcher, never stored; confirmed resolutions can be banked here.

The graph's data is populated: `variants.json` in this directory holds 4,200 edges (4,066 common misspellings, 66 shortforms, 68 apostrophe-less contraction forms), assembled 2026-11-16 from the published lists named in the file's sources header. The resolution code that consults it is built (src/ansci/token-resolve.ts, over the ported SymSpell in src/ansci/symspell.ts) and wired into the parser, in Node contexts; the browser build cannot read the data file yet. What remains: banking confirmed resolutions back into the graph.

Working code today: ai-system/knowledge/variant-graph/variants.json, consulted by src/ansci/token-resolve.ts

This is a placeholder: the unit's home in ai-system/ exists so the tree and the map agree. Its implementation migrates or is built here in a gated slice; until then the working code stays where PLACEHOLDER.md says it is.
