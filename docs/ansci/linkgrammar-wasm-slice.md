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

## Non-goals and limits

- First linkage only; no linkage ranking, no timeout tuning, no
  Java/Python bindings in the module (native ones live in /usr/local).
- Single-threaded by design (runs without SharedArrayBuffer).
- `linkgrammar.wasm` must sit next to `linkgrammar.js` (non-single-file
  build); the loader resolves both from the repo checkout.
