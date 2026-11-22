/**
 * wink.ts — the Wink NLP evidence provider (probe slice, 2026-11-22).
 *
 * Wink (wink-nlp + wink-eng-lite-web-model, MIT) is an external
 * classical NLP pipeline: sentence boundary detection, POS tagging,
 * lemmatisation, and pattern-type named entities (DATE / MONEY /
 * TIME / CARDINAL / ...), plus a learnCustomEntities() gazetteer
 * mechanism for project-specific spans. This module is AnSci's
 * only doorway to it, in the provider pattern of
 * linkgrammar-lex.ts / wordnet-lex.ts:
 *
 *   - OPTIONAL AT RUNTIME: wink is a recorded runtime dependency
 *     (owner decision, 2026-11-22: package.json `dependencies` —
 *     wink-nlp ^2.4.0, wink-eng-lite-web-model ^1.8.1,
 *     wink-bm25-text-search ^3.1.2; exact pins in the lockfile,
 *     ranges so `npm update` flows fixes in; NOT vendored, and
 *     wink-embeddings-sg-100d is explicitly excluded). It is still
 *     loaded by dynamic require and every entry point returns
 *     `undefined` when the packages cannot load, so a broken or
 *     partial install degrades the evidence layer instead of
 *     breaking the chat. ANSCI_WINK=off in the environment
 *     disables the provider outright (the operator's switch,
 *     and the fallback test's seam).
 *   - ROUTED USE — EXACTLY ONE (2026-11-22): the SBD veto in
 *     turn.ts's splitTurnSegments. Wink's sentence splits are
 *     consulted there only to veto a regex segmentation
 *     boundary whose left segment ends abbreviation-shaped;
 *     Wink never creates a boundary, and the regex segmentation
 *     stands wherever the veto does not fire (and whenever
 *     this provider returns undefined). Everything else here —
 *     POS, lemmas, entity spans, and the BM25 probe — remains
 *     shadow/probe only: nothing in parse.ts or entities.ts
 *     routes through this module.
 *   - EVIDENCE ONLY: what comes back is a record of what Wink
 *     proposed (sentence splits, token POS/lemma, entity spans),
 *     with provenance attached. AnSci validates and interprets;
 *     Wink never writes meaning, roles or facts.
 *   - MEASURED LIMITS (from the probe scripts, not the vendor's
 *     claims): the lite model's built-in NER recognises pattern
 *     types only — it returns NO span for proper names such as
 *     "New York", "Paris" or "Barack Obama". Multiword names come
 *     back whole only through learnCustomEntities() with a
 *     gazetteer the project supplies (and banks, with provenance,
 *     the way the place register does). POS is Universal POS;
 *     lemmas are lowercased citation forms ("New" -> "new").
 *
 * English only, matching AnSci's current scope (the owner parked
 * Chinese until it is feasible later); Wink's lite model is an
 * English model in any case.
 *
 * License: MIT (Wink, GRAYPE Systems). See NOTICE if this layer
 * is ever promoted beyond the probe.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface WinkTokenRecord {
  /** Surface form as Wink tokenised it. */
  value: string;
  /** Universal POS tag (NOUN / VERB / PROPN / ...). */
  pos: string;
  /** Lowercased citation form per Wink's lemmatiser. */
  lemma: string;
  /** Wink token type (word / punctuation / number / ...). */
  type: string;
}

export interface WinkEntityRecord {
  value: string;
  /** Built-in pattern type (DATE / MONEY / ...) or a custom type. */
  type: string;
}

export interface WinkAnalysis {
  provenance: "wink-nlp+wink-eng-lite-web-model";
  sentences: string[];
  tokens: WinkTokenRecord[];
  /** Built-in entities() spans (pattern types only — see header). */
  entities: WinkEntityRecord[];
}

export interface WinkCustomEntityDef {
  name: string;
  /** Wink CER patterns, e.g. "[New] [York]". */
  patterns: string[];
}

interface WinkNlpInstance {
  readDoc(text: string): any;
  its: any;
  learnCustomEntities(defs: WinkCustomEntityDef[], config?: object): void;
}

let cached: WinkNlpInstance | null | undefined;

/** Load wink lazily, exactly once; null when the packages are absent. */
function loadWink(): WinkNlpInstance | null {
  // The operator's switch, read on every call so it also serves
  // as the fallback test's seam: ANSCI_WINK=off reports the
  // provider unavailable, whatever is installed or cached.
  if (process.env.ANSCI_WINK === "off") return null;
  if (cached !== undefined) return cached;
  try {
    // Non-literal require: wink is a recorded runtime dependency
    // whose absence must degrade this layer, never break a load.
    const moduleName = "wink-nlp";
    const modelName = "wink-eng-lite-web-model";
    const winkNlp = require(moduleName);
    const model = require(modelName);
    cached = winkNlp(model) as WinkNlpInstance;
  } catch {
    cached = null;
  }
  return cached;
}

/** True when the wink packages are installed and loadable. */
export function winkAvailable(): boolean {
  return loadWink() !== null;
}

function analyseWith(nlp: WinkNlpInstance, text: string): WinkAnalysis {
  const doc = nlp.readDoc(text);
  const its = nlp.its;
  const tokens: WinkTokenRecord[] = [];
  doc.tokens().each((t: any) => {
    tokens.push({
      value: t.out(),
      pos: t.out(its.pos),
      lemma: t.out(its.lemma),
      type: t.out(its.type),
    });
  });
  const entities: WinkEntityRecord[] = (doc.entities().out(its.detail) ?? []).map(
    (e: any) => ({ value: String(e.value), type: String(e.type) }),
  );
  return {
    provenance: "wink-nlp+wink-eng-lite-web-model",
    sentences: doc.sentences().out() as string[],
    tokens,
    entities,
  };
}

/**
 * Full analysis of one text, or undefined when wink is absent.
 * The analysis as a whole is shadow evidence (probes and tests);
 * its sentences field alone also feeds the routed SBD veto via
 * winkSentences below.
 */
export function winkAnalyse(text: string): WinkAnalysis | undefined {
  const nlp = loadWink();
  if (!nlp) return undefined;
  return analyseWith(nlp, text);
}

/**
 * Sentence boundaries only, or undefined. Consumers: probe 1,
 * the agreement audit, and the one routed use — the SBD veto
 * in turn.ts's splitTurnSegments (see this file's header).
 */
export function winkSentences(text: string): string[] | undefined {
  return winkAnalyse(text)?.sentences;
}

/**
 * Custom-entity (gazetteer) spans for one text, or undefined when
 * wink is absent. A fresh instance is built per call so learned
 * definitions never leak between callers — probe-grade cost,
 * stated plainly; a routed version would cache per gazetteer.
 */
export function winkCustomEntities(
  text: string,
  defs: WinkCustomEntityDef[],
): WinkEntityRecord[] | undefined {
  try {
    const moduleName = "wink-nlp";
    const modelName = "wink-eng-lite-web-model";
    const winkNlp = require(moduleName);
    const model = require(modelName);
    const nlp = winkNlp(model) as WinkNlpInstance;
    nlp.learnCustomEntities(defs, { matchValue: false, usePOS: true, useEntity: true });
    const doc = nlp.readDoc(text);
    return (doc.customEntities().out(nlp.its.detail) ?? []).map((e: any) => ({
      value: String(e.value),
      type: String(e.type),
    }));
  } catch {
    return undefined;
  }
}
