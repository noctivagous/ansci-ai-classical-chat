# Token

Schematic address: `lpu/parser/token` · Type: Unit · State: partial · 95% completed to goal

Breaks the sentence into addressed tokens, and resolves the words it does not recognise — Variant Graph first, then the ported SymSpell matcher and its segmentation — every resolution recorded with its confidence in the trace, and an unresolved word locating the gap at itself.

Working code today: src/ansci/sentence.ts (tokenisation), src/ansci/symspell.ts (the ported matcher), src/ansci/token-resolve.ts (the resolution pipeline), wired in src/ansci/parse.ts.

Held in this directory: token-dictionary.txt — the matcher's frequency dictionary (top 12,000 of SymSpell's published English frequency dictionary, unfiltered) — and build-dictionary.mjs, its generator (sources and method in that file). Restricting corrections to words the parser can use is the resolver's recognise filter, not the dictionary's business.

Still open: the browser build cannot read the data files (the filesystem is stubbed there), so resolution is a Node-context capability for now; the error model is distance + frequency, not yet calibrated from the Variant Graph's attested pairs; confirmed resolutions are not yet banked back into the graph.
