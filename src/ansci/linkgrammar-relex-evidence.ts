/**
 * linkgrammar-relex-evidence.ts — the routing seam for the
 * RelEx layer (RelEx completion, Stage 4).
 *
 * The peer of linkgrammar-adapter.ts: where the adapter adapts
 * the WASM linkage to candidate SYNTAX relationships, this
 * module adapts the full RelEx pipeline's Stanford relations
 * (tagging → semantic → stanford, Stages 1–2) to an EVIDENCE
 * record over the parser's own token list, in the adapter's
 * token-mapping discipline: linkage sentence positions are
 * mapped onto parser tokens by sequential case-insensitive
 * surface match, and a relation whose governor or dependent
 * cannot be mapped is dropped — never guessed.
 *
 * Synchronous, like the adapter's sync path: when the WASM
 * module is cold the record is absent and the parse proceeds
 * exactly as before. The record proposes; nothing here writes
 * a meaning-graph edge, and no consumer in this slice reads it
 * to decide anything — it rides the ParsedSentence as
 * `relexEvidence` for the arbitration slices that follow.
 */
import { parseSentenceWasmSync, type LinkGrammarWasmResult } from "./linkgrammar-wasm";
import {
  applyRules,
  buildStanfordGraph,
  collectStanfordRelations,
  stanfordRules,
} from "./linkgrammar-stanford";
import { applyTaggingAndSemantic } from "./linkgrammar-semantic";
import type { RelexEvidence } from "./sentence";

/** Map linkage word positions (1-based sentence positions as
 *  the stanford layer reports them, LEFT-WALL = 0) onto parser
 *  token indices by sequential surface match — the adapter's
 *  discipline. Linkage words carry dictionary subscripts
 *  ("Johnny.b", "ate.v-d") and bracketed guess marks; both are
 *  stripped before matching, as the adapter's normalization
 *  strips them. Returns linkage-position -> token index. */
export function mapLinkagePositionsToTokens(
  linkageWords: string[],
  tokens: string[],
): Map<number, number> {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[.?!]+$/, "")
      .replace(/\[|\]/g, "")
      .split(".")[0];
  const out = new Map<number, number>();
  let cursor = 0;
  for (let pos = 0; pos < linkageWords.length; pos++) {
    const word = linkageWords[pos];
    if (word === "LEFT-WALL" || word === "RIGHT-WALL") continue;
    const target = norm(word);
    if (!target) continue;
    for (let t = cursor; t < tokens.length; t++) {
      if (norm(tokens[t]) === target) {
        out.set(pos, t);
        cursor = t + 1;
        break;
      }
    }
  }
  return out;
}

/**
 * Build the RelEx evidence record for one sentence over the
 * parser's tokens. Returns undefined when the linkage is
 * unavailable, incomplete, or nothing maps — the record's
 * absence is silent, exactly like the linkage shadow's.
 */
export function relexEvidenceSync(
  text: string,
  tokens: string[],
): RelexEvidence | undefined {
  let parsed: LinkGrammarWasmResult;
  try {
    parsed = parseSentenceWasmSync(text);
  } catch {
    return undefined;
  }
  if (!parsed.ok || parsed.nullCount !== 0) {
    return undefined;
  }
  try {
    const graph = buildStanfordGraph(parsed.words, parsed.links);
    applyTaggingAndSemantic(graph);
    applyRules(graph.root, stanfordRules());
    const relations = collectStanfordRelations(graph.root);
    const mapping = mapLinkagePositionsToTokens(parsed.words, tokens);
    const mapped = [];
    for (const r of relations) {
      const gov = mapping.get(r.govIdx);
      const dep = mapping.get(r.depIdx);
      if (gov === undefined || dep === undefined) continue;
      mapped.push({
        family: r.rel,
        gov,
        dep,
        govWord: tokens[gov],
        depWord: tokens[dep],
      });
    }
    if (mapped.length === 0) return undefined;
    return {
      status: "complete",
      relations: mapped,
      families: [...new Set(mapped.map((r) => r.family))].sort(),
    };
  } catch {
    return undefined;
  }
}
