/**
 * linkgrammar-wasm.ts — in-process Link Grammar parsing via WebAssembly.
 *
 * Loads vendor/linkgrammar-wasm/ (an Emscripten build of the Link
 * Grammar 5.13.2 C library with the English dictionary embedded)
 * and exposes one async function, parseSentenceWasm(), that returns
 * the first linkage as plain JSON: the word list (including the
 * LEFT-WALL / RIGHT-WALL boundary words, as the native parser
 * reports them) and the labelled links between word indices.
 *
 * This complements the dictionary-data layer (src/linkgrammar.ts):
 * that layer ships a converted per-form summary table for evidence
 * consumers; this layer runs the real parser in-process, with no
 * native binary or server, in Node and (with a bundler serving the
 * adjacent .wasm file) in the browser. The module is loaded lazily
 * and exactly once; dictionary load cost is paid on first parse.
 *
 * License: the loaded module is compiled Link Grammar code and
 * data, LGPL-2.1-or-later (see NOTICE and
 * vendor/linkgrammar-wasm/README.md).
 */
import * as path from "path";

export interface LinkGrammarWasmLink {
  /** Index into words[] of the left end of the link. */
  left: number;
  /** Index into words[] of the right end of the link. */
  right: number;
  /** Link Grammar connector label, e.g. "Ss*b", "Osm", "Xp". */
  label: string;
}

export interface LinkGrammarWasmSuccess {
  ok: true;
  /** Number of linkages the parser found (only the first is returned). */
  linkages: number;
  /** Null-link count of the returned linkage (0 for a complete linkage). */
  nullCount: number;
  /** Words of the first linkage, boundary walls included. */
  words: string[];
  /** Labelled links of the first linkage. */
  links: LinkGrammarWasmLink[];
}

export interface LinkGrammarWasmFailure {
  ok: false;
  error: string;
  linkages?: number;
}

export type LinkGrammarWasmResult =
  | LinkGrammarWasmSuccess
  | LinkGrammarWasmFailure;

interface LinkGrammarWasmModule {
  /** Loads the embedded dictionary; returns "" on success, error text otherwise. */
  init(): string;
  /** Parses one sentence; returns a JSON-encoded LinkGrammarWasmResult. */
  parse(sentence: string): string;
}

const GLUE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "vendor",
  "linkgrammar-wasm",
  "linkgrammar.js",
);

let modulePromise: Promise<LinkGrammarWasmModule> | undefined;
let loadedModule: LinkGrammarWasmModule | undefined;

function loadModule(): Promise<LinkGrammarWasmModule> {
  if (!modulePromise) {
    const factory = require(GLUE_PATH) as () => Promise<LinkGrammarWasmModule>;
    modulePromise = factory().then((mod) => {
      const err = mod.init();
      if (err) {
        modulePromise = undefined;
        throw new Error(`linkgrammar-wasm init failed: ${err}`);
      }
      loadedModule = mod;
      return mod;
    });
  }
  return modulePromise;
}

/**
 * Warm the module (load + dictionary init). Chat entry points
 * await this at startup; the synchronous parse path below
 * falls back when it was never warmed (or warming failed),
 * so callers that cannot await stay correct.
 */
export async function ensureLinkGrammarLoaded(): Promise<void> {
  await loadModule();
}

/** True once ensureLinkGrammarLoaded() has resolved successfully. */
export function isLinkGrammarLoaded(): boolean {
  return loadedModule !== undefined;
}

/**
 * Synchronous parse for use inside the synchronous parse loop.
 * Never throws: when the module is cold it resolves to
 * { ok: false } and the caller falls back to the positional
 * parser, exactly as if the adapter had abstained.
 */
export function parseSentenceWasmSync(
  sentence: string,
): LinkGrammarWasmResult {
  try {
    if (!loadedModule) {
      return { ok: false, error: "link-grammar module not loaded" };
    }
    return JSON.parse(loadedModule.parse(sentence)) as LinkGrammarWasmResult;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Parse one English sentence with the embedded Link Grammar parser.
 * Resolves to the first linkage, or { ok: false } when the sentence
 * has no valid linkage.
 */
export async function parseSentenceWasm(
  sentence: string,
): Promise<LinkGrammarWasmResult> {
  try {
    const mod = await loadModule();
    return JSON.parse(mod.parse(sentence)) as LinkGrammarWasmResult;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
