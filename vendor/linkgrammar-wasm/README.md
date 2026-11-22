# vendor/linkgrammar-wasm — generated artifacts (do not edit)

Emscripten build of the Link Grammar 5.13.2 C library with the
English dictionary (5.12.4) embedded. Loaded by
`src/ansci/linkgrammar-wasm.ts`; rebuilt by
`scripts/build-linkgrammar-wasm.sh` (see `docs/ansci/linkgrammar-wasm-slice.md`).

- `linkgrammar.js` — Emscripten glue (MODULARIZE factory
  `createLinkGrammar`, environments node+web), embind exports
  `init()` and `parse(sentence) -> JSON`.
- `linkgrammar.wasm` — the compiled parser (~2.3 MB, dictionary
  embedded at `/lgdict`, single-threaded: no SharedArrayBuffer /
  COOP-COEP requirement).
- `linkgrammar-esm.js` — the same glue as an ES module
  (EXPORT_ES6, environments web+node) for the browser bundle;
  instantiated with locateFile pointing at `linkgrammar.wasm`.

License: compiled from LGPL-2.1-or-later sources
(https://github.com/opencog/link-grammar); same terms apply.
See NOTICE.
