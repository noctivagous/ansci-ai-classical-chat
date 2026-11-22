# Link Grammar WASM slice — design brief

Status: BUILT 2026-11-22. The real Link Grammar 5.13.2 parser,
compiled to WebAssembly with Emscripten 3.1.56 and the English
dictionary (5.12.4) embedded, shipped as
`vendor/linkgrammar-wasm/linkgrammar.{js,wasm}` (~2.4 MB total)
and exposed to TypeScript as `parseSentenceWasm()` in
`src/ansci/linkgrammar-wasm.ts`. Verified: `test/ansci-linkgrammar-wasm.test.ts`
(3 tests) pins the first-linkage contract against the native
`link-parser` output for "This is a test."

This reverses the 2026-11-20 owner decision recorded in
`linkgrammar-dictionary-slice.md` ("no WASM binary; dictionary
port first"): the owner asked for the WASM build directly on
2026-11-22. The dictionary-data layer stands unchanged; the WASM
module is a second, in-process evidence source, not a replacement.
AnSci's parser and traces remain the system of record; nothing
here writes a meaning graph.

## What it is

- `scripts/lg-wasm-wrapper/wrapper.cpp` — embind wrapper: `init()`
  loads the embedded dictionary once; `parse(sentence)` returns
  `{"ok":true,"linkages":N,"words":[...],"links":[{left,right,label}]}`
  for the first linkage, or `{"ok":false,"error":...}`. Words
  include LEFT-WALL/RIGHT-WALL, exactly as the native parser reports.
- `scripts/build-linkgrammar-wasm.sh` — the full recipe: fresh
  upstream tarball → autoreconf → `emconfigure` (shared/java/
  python/sat/aspell/hunspell/editline off, regex=libc, blank
  PTHREAD flags for a single-threaded module, `-UHAVE_MALLOC_TRIM`
  because emscripten's malloc.h lacks `malloc_trim`) → `emmake`
  the `link-grammar/` library → `em++ --bind --embed-file` link.
- `src/ansci/linkgrammar-wasm.ts` — lazy singleton loader (repo-root
  relative path, `dist/`-safe) returning typed results.
- `vendor/linkgrammar-wasm/README.md` — provenance; NOTICE carries
  the LGPL attribution (extended 2026-11-22 to cover the solver).

## Parse-option parity with the native CLI (2026-11-22)

The first Foundry comparison (53 turns) showed WASM reporting zero
linkages where the CLI reported null-count linkages ("No complete
linkages found" + panic-mode parses). Root cause: the wrapper used
bare library defaults while the CLI escalates (null links),
runs linkage_limit 1000 (not 100), spell-guess 7 (not off), and a
30s cap. The wrapper now mirrors the CLI exactly: parse at
max_null 0, escalate to min_null 1 / max_null sentence-length on
zero, reset resources per call (the options object is reused),
and report `nullCount` alongside `linkages`. The three Foundry
no-linkage cases now match native counts and endpoints exactly.

Token-form parity: `linkage_get_word` returns full guess reasons
(`York[!<capitalized-words>]`); the wrapper shortens them to the
CLI display form (`York[!]`), matching what the native `(m)`-line
reader sees. Re-running the 53-turn Foundry comparison: 53/53 parse,
53/53 linkage counts, 52/53 endpoint multisets. The one remainder
(`Was the man bitten by the dog?`) is a native-reader artifact —
the reader takes word/connector fields from `(m) (e)` empty-word
lines as `(e)>connector` — while the WASM linkage agrees with the
CLI's Linkage 1 diagram link for link.

## Browser verification (step 5)

Measured 2026-11-22 in real Chrome via DevTools, loading the
shipped bytes (ESM glue + `linkgrammar.wasm`, dictionary
embedded): module load 57.5 ms, dictionary init 209.7 ms, first
parse 10.4 ms, subsequent parses 0.9–1.9 ms; JS heap steady at
~12.7 MB across load/init/parse (wasm linear memory is
separate; module file is 2.3 MB). All three probe sentences
parse with the expected linkages (2, recovered null-count 2,
7), labels matching the native CLI exactly.

Packaging: `scripts/build-linkgrammar-wasm.sh` emits the ESM
glue alongside the Node glue; `demo/dashboard/scripts/
prepare-browser-assets.mjs` stages both files to
`dist/ansci-data/linkgrammar/` under the same 25 MB
per-asset ceiling as the lexical bundles (a missing or
oversize file stops the web build); `engine-entry.ts` and the
chat app warm the module at startup without gating readiness
(chat stays usable on the positional parser when warming
fails). The full dashboard build (engine + dashboard + chat)
passes with the new imports, including the build control.
Not verified here: serving `dist/` over HTTP end-to-end in
a browser (the sandbox blocks local servers) and the actual
Cloudflare deployment, which needs owner credentials.

## Non-goals and limits

- First linkage only; no linkage ranking, no
  Java/Python bindings in the module (native ones live in /usr/local).
- Single-threaded by design (runs without SharedArrayBuffer).
- `linkgrammar.wasm` must sit next to `linkgrammar.js` (non-single-file
  build); the loader resolves both from the repo checkout.
