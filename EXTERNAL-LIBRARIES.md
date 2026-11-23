# External libraries and data — an index by form

Everything AnSci uses that it did not write itself, organised by
*how* it enters the project — because the form decides how it
updates, what it costs, and what obligations ride along.

This file is the human-readable index/overview. **[NOTICE](NOTICE)
remains the legal attribution record**: full licence texts,
copyright holders and source citations live there, not here. Where
this index and NOTICE disagree, NOTICE governs.

Licences are given in short form. Versions are the exact ones in
the cited source files at the time of writing (2026-11-22).

---

## 1. Runtime dependencies

Recorded in `package.json` → `dependencies`, with exact pins in
`package-lock.json`. **How they update:** a deliberate lockfile
bump (`npm update` within the declared range, or an edited range)
followed by the full gates — never auto-update on build.

| Name | Version | Used for | Licence |
| :--- | :--- | :--- | :--- |
| wink-nlp | ^2.4.0 (locked 2.4.0) | NLP pipeline — sentence boundary detection, tokenization, POS tagging, named entities, lemmas. On this branch (`feat/wink-probes`) as an evidence-only provider (`src/ansci/wink.ts`); shadow probes, no production routing yet | MIT |
| wink-eng-lite-web-model | ^1.8.1 (locked 1.8.1) | The English language model wink-nlp runs on | MIT |
| wink-bm25-text-search | ^3.1.2 (locked 3.1.2) | BM25 retrieval over project records (probe on this branch) | MIT |
| planck | ^1.5.1 (locked 1.5.1) | Physics Unit engine (Box2D-style rigid-body simulation) — already on main | MIT (per `node_modules/planck/package.json`) |

**Transitive Wink packages** (not direct dependencies; they arrive
with the three Wink packages above and are recorded in
`package-lock.json`): wink-tokenizer 5.3.0, wink-helpers 2.0.0,
wink-nlp-utils 2.1.0, wink-porter2-stemmer 2.0.1, wink-distance
2.0.2, wink-jaro-distance 2.0.0 — plus a nested wink-nlp 1.14.3
that wink-bm25-text-search and wink-nlp-utils carry as their own
internal dependency. All MIT-family Wink packages by GRAYPE
Systems.

## 2. Development / build dependencies

Recorded in `devDependencies`; not shipped in the running system.

| Name | Version | Where | Used for |
| :--- | :--- | :--- | :--- |
| typescript | ^5.8.0 | repo root | Type-checking and compiling `src/` + `test/` |
| @types/node | ^24.0.0 | repo root | Node.js type definitions |
| react | ^19.1.0 | `demo/dashboard` (`dependencies` there) | Dashboard UI runtime |
| react-dom | ^19.1.0 | `demo/dashboard` | Dashboard UI rendering |
| vite | ^6.3.0 | `demo/dashboard` (dev) | Dashboard build / dev server |
| @vitejs/plugin-react | ^4.4.0 | `demo/dashboard` (dev) | React support for Vite |
| typescript | ^5.8.0 | `demo/dashboard` (dev) | Dashboard type-checking |

**Toolchain (not npm packages):** Node.js is the runtime for the
engine, tests and probe scripts. **Emscripten 3.1.56** is the WASM
build tool for the vendored Link Grammar build (§3; recorded in
NOTICE and `scripts/build-linkgrammar-wasm.sh`).

## 3. Vendored — code physically in the repo

**How it updates:** by re-running its build recipe and committing
the new artefacts. Nothing about it updates through npm.

| Name | Version | Location | Used for | Licence |
| :--- | :--- | :--- | :--- | :--- |
| Link Grammar (parser, compiled to WebAssembly) | Link Grammar 5.13.2, English dictionary 5.12.4, built with Emscripten 3.1.56 | `vendor/linkgrammar-wasm/` (`linkgrammar.js` + `linkgrammar.wasm`) | In-process syntactic parsing via `src/ansci/linkgrammar-wasm.ts` — first-linkage evidence for the parser (S/O adapter in `src/ansci/linkgrammar-adapter.ts`) | LGPL-2.1-or-later |

Rebuilt by `scripts/build-linkgrammar-wasm.sh` (embind wrapper in
`scripts/lg-wasm-wrapper/`). Full attribution in NOTICE.

## 4. Ported in-tree — external algorithms re-implemented in AnSci TypeScript

No package is installed and nothing is vendored; the algorithm
lives in AnSci's own source, credited in the file header. **How it
updates:** only by a manual re-port — there is no upstream to bump.

| Algorithm / source | AnSci file | Used for | Licence of the original |
| :--- | :--- | :--- | :--- |
| SymSpell — Wolf Garbe (via the symspellpy reference port) | `src/ansci/symspell.ts` | Symmetric-delete spelling correction + word segmentation, inside token resolution (`token-resolve.ts`) | MIT |
| Sleator–Temperley linkage solver (bounded subset port) | `src/ansci/linkage.ts`, over the dictionary-data layer in `src/linkgrammar.ts` | Shadow linkage search over converted Link Grammar expression trees — structure evidence, not a replacement parser | LGPL-2.1-or-later (Link Grammar) |
| Lesk algorithm (Lesk 1986; adapted form, Banerjee & Pedersen 2002) | `src/ansci/lesk.ts` | Gloss-overlap sense ranking — a scorer, not a decider; its overlap machinery is reused by `entity-rank.ts` | Classical published algorithm (no package) |
| RelEx rule engine + Stanford/tagging/semantic rule files (opencog/relex) | `src/ansci/linkgrammar-stanford.ts` (engine + Stanford view), `src/ansci/linkgrammar-semantic.ts` (tagging/semantic passes, named algorithms, native view); rule texts vendored verbatim in `vendor/relex/` (§3 form) | Dependency relations over the WASM linkage: Stanford-style relations (standalone and full-pipeline) and native RelEx relations, as parser evidence | Apache License 2.0 |
| Relex2Logic rule patterns (opencog/opencog, `opencog/nlp/relex2logic/`) | `src/ansci/relex2logic-rules.ts` (patterns transcribed as data), `src/ansci/relex2logic.ts` (applier); upstream `.scm` files vendored read-only in `vendor/relex2logic/` for audit | Shadow logic-form records over the native relations, in AnSci's ParsedSentence/meaning-graph vocabulary — not Atomese, not routed | AGPL-3.0 upstream (see NOTICE: clean-room transcription of patterns/shapes only, no code copied) |
| Dershowitz & Reingold, *Calendrical Calculations*, 4th ed. — transliterated from the authors' public Lisp distribution (calendar-code2) | `src/ansci/calendar.ts` (Gregorian + general machinery, ch. 14 substrate) and `src/ansci/calendar-chinese.ts` (Chinese lunisolar calendar, ch. 18) | Calendar / Timeline resources — Gregorian and Chinese lunisolar conversion | Apache License 2.0 (the Lisp distribution) |
| Path-consistency over relation algebras (Allen 1983 / Mackworth PC tradition) | `src/ansci/qualreas.ts` | Qualitative reasoning over the converted qualreas algebra data (§5) — AnSci's own engine, written from the classical algorithm; qualreas credited for data and design | Classical published algorithms (no package) |

## 5. Converted data — derived tables in `data/`

External datasets converted by an import script into the trimmed,
re-encoded tables AnSci actually ships and reads. **How it
updates:** re-run the import script against a (possibly newer)
upstream release, then re-gate. Full attributions, copyright
holders and exactly-what-was-kept notes are in NOTICE.

| Dataset | Version / source | Licence (short form) | Import script |
| :--- | :--- | :--- | :--- |
| Open English WordNet (derived from Princeton WordNet) | OEWN 2024 / WordNet 3.1 | CC BY 4.0 / WordNet License | `scripts/import-wordnet.py` |
| FrameNet | Release 1.5, via the NLTK project's mirror | CC BY 3.0 | `scripts/import-framenet.py` |
| VerbNet | 3.3 | VerbNet 3.0 License | `scripts/import-verbnet.py` |
| CSKG (Ilievski, Szekely & Zhang, ESWC 2021; Zenodo 4331372) | Trimmed feeder bundle ships in `data/cskg/`; the full extract is a local install only (`data/raw/cskg/`, gitignored) | Treated as CC BY-SA 4.0 (see NOTICE for the record's CC BY 4.0 listing) | Feeder: `src/ansci/cskg-feed.ts` over the local extract |
| Link Grammar dictionary data | 5.13.2 / dictionary 5.12.4 — per-entry summaries + expression trees in `data/linkgrammar/` | LGPL-2.1-or-later | `scripts/import-linkgrammar.py` |
| qualreas relation algebras (RCC-8, Allen interval algebra, point algebra) | alreich/qualreas algebra JSON | MIT | `scripts/import-qualreas.py` |
| QUDT units vocabulary | QUDT (Quantities, Units, Dimensions and Types) | CC BY 4.0 | `scripts/import-qudt.py` |
| wordfreq frequency data | wordfreq 3.1.1, English "best" list (Zipf ≥ 2.0) | Data CC BY-SA 4.0 (wordfreq code Apache 2.0) | `scripts/import-wordfreq.py` |
| Glasgow Norms (Scott et al. 2019; 5,553 words × nine dimensions) | Article supplementary material (ESM 2) | CC BY 4.0 | `scripts/import-glasgow.py` |

## 6. External services consulted at runtime

Not libraries — nothing is bundled. AnSci's own clients call these
over HTTP and stamp every result with its provenance; several have
fixture sources for tests.

| Service | Client | Notes |
| :--- | :--- | :--- |
| Wikidata (Action API, `https://www.wikidata.org/w/api.php`) | `src/ansci/wikidata-client.ts` | API access only (owner ruling) — no local dump |
| api.weather.gov (National Weather Service) | `src/ansci/weather-client.ts` | No API key; coverage is the United States only — points outside it decline |
| Nominatim (`https://nominatim.openstreetmap.org`) | `src/ansci/geography-client.ts` | Geocoding for the Geography pair |
| Overpass API (`https://overpass-api.de/api/interpreter`) | `src/ansci/overpass-client.ts` | "What's there" queries around a place |
| OSRM | `src/ansci/osrm-client.ts` | Road distance / routing; endpoint configurable via `OSRM_BASE_URL` |

## 7. Explicitly NOT used

Recorded so future work does not re-litigate settled exclusions:

- **wink-embeddings-sg-100d** — excluded by owner decision
  2026-11-22. It is a ~310 MB installed / ~110 MB download vector
  file (350k words × 100 dimensions, JSON). Vectors themselves
  are permitted in AnSci (the boundary is: no runtime neural
  net), and the Wink packages in §1 are used without it; the
  embeddings package is simply not installed, not in
  `package.json`, and not in the lockfile.
