/**
 * token-resolve.ts — OUR layer over the ported matcher (symspell.ts):
 * the resolution pipeline the Token submodule runs on words the
 * parser does not recognise, in a fixed order, every step recorded.
 *
 *   1. exact        — the parser already knows the token; silent.
 *   2. variant      — an attested edge in the Variant Graph
 *                     (ai-system/knowledge/variant-graph/variants.json):
 *                     shortforms, common misspellings, apostrophe-less
 *                     contractions, each carrying its own confidence.
 *                     A surface with several distinct canonicals is
 *                     NOT guessed here; it falls through with its
 *                     candidates noted.
 *   3. segmentation — the ported word segmentation, for joined forms
 *                     ("aboutit"), tried BEFORE the matcher: accepted
 *                     only when every part is exact (no part itself
 *                     corrected) and recognised by the parser. A
 *                     joined form whose parts also need correction
 *                     is not accepted in v1.
 *   4. matcher      — the ported SymSpell lookup over the Token
 *                     frequency dictionary, restricted to words the
 *                     parser can actually use, resolved only when the
 *                     best candidate clears the runner-up by the
 *                     declared margin (smaller distance, or at equal
 *                     distance at least twice the corpus count).
 *   5. unresolved   — the token stands as-is and the record carries
 *                     the best candidates found and a low confidence:
 *                     the gap is located at this token, not hidden.
 *
 * One ordering rule is declared: a UNIQUE variant edge preempts a
 * dictionary reading for tokens of length <= 2 — the shortform
 * territory, where "u" and "r" are also WordNet letter-nouns, and
 * in running text the shortform is the live reading. Recognised
 * words of any other length stand even when they are attested
 * misspelling surfaces ("form" is not corrected to "from").
 * Function words are never preempted.
 *
 * Nothing here names a word: the mechanism is word-blind, the
 * variants are data in the graph, and the examples in the tests are
 * tests, not code. Confidence policy (v1, declared, revisable):
 * variant edges carry their stored confidence; a matcher resolution
 * scores 0.85 at edit distance 1 and 0.60 at distance 2, discounted
 * toward 0.5 when a same-distance runner-up splits the frequency;
 * an accepted segmentation scores 0.70; an unresolved token reports
 * 0.30 when candidates exist, 0.10 when none do. Error density
 * erodes footing: each matcher/segmentation resolution already
 * applied in the same sentence multiplies the next one's confidence
 * by 0.8 (a correction is scored against a sentence assumed sound),
 * and a resolution discounted below 0.50 is not applied — the token
 * stands, recorded with its candidates. Variant edges are attested
 * data, not guesses, and neither erode nor are eroded.
 *
 * Data is loaded lazily on first use from the ai-system/ node
 * directories (the data lives with its node on the map). Where the
 * files cannot be read — the browser build stubs the filesystem —
 * the resolver is unavailable and tokens pass through unchanged:
 * the same degraded-configuration pattern as the other providers.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { SymSpell, type Suggestion } from "./symspell";
import { EN_LEXICON, type TokenResolution } from "./sentence";
import { ageOfAcquisitionOf } from "./normalcy-unit";

/**
 * The age-of-acquisition prior for a resolution's landing word
 * (the Glasgow scope extension, 2026-11-17): when the word a
 * resolution lands on — or, unresolved, its best candidate —
 * is one the Glasgow Norms rate LATE-acquired (mean band 6 or
 * above on the filed 1–7 band scale: typically acquired at
 * 11+ years), the labelled fact is returned for the record.
 * Knowledge for the gap machinery: a late-acquired word at a
 * resolution gap is a likelier comprehension-gap candidate.
 * The prior is attached to the record only — it never changes
 * an outcome, a replacement, or a confidence.
 */
function aoaPriorFor(term: string | undefined): string | undefined {
  if (!term) return undefined;
  const fact = ageOfAcquisitionOf(term);
  if (!fact || fact.mean < 6) return undefined;
  return (
    `'${term}' is a late-acquired word (age of acquisition band ${fact.mean}/7 — ${fact.scale}; ${fact.source}) — ` +
    "a likelier comprehension-gap candidate, as labelled knowledge for the gap machinery"
  );
}

export type { TokenResolution };

interface VariantEdge {
  surface: string;
  canonical: string;
  kind: string;
  register: string;
  confidence: number;
  source: string;
}

interface ResolverData {
  symspell: SymSpell;
  variants: Map<string, VariantEdge[]>;
}

let cached: ResolverData | null | undefined;

function loadData(): ResolverData | null {
  if (cached !== undefined) return cached;
  try {
    const aiSystem = path.join(__dirname, "..", "..", "..", "ai-system");
    const dictText = fs.readFileSync(
      path.join(aiSystem, "lpu", "parser", "token", "token-dictionary.txt"),
      "utf-8",
    );
    const variantsRaw = JSON.parse(
      fs.readFileSync(path.join(aiSystem, "knowledge", "variant-graph", "variants.json"), "utf-8"),
    ) as { edges: VariantEdge[] };

    const symspell = new SymSpell(2, 7);
    for (const line of dictText.split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const m = line.match(/^(\S+)\s+(\d+)$/);
      if (m) symspell.addWord(m[1], Number(m[2]));
    }
    // The hand lexicon's words are core vocabulary whatever the
    // corpus says; the variant canonicals likewise.
    for (const key of Object.keys(EN_LEXICON)) symspell.addWord(key, 1_000_000);
    const variants = new Map<string, VariantEdge[]>();
    for (const edge of variantsRaw.edges) {
      const list = variants.get(edge.surface);
      if (list) list.push(edge);
      else variants.set(edge.surface, [edge]);
      if (/^[a-z]+$/.test(edge.canonical)) symspell.addWord(edge.canonical, 500_000);
    }
    cached = { symspell, variants };
  } catch {
    cached = null; // data unavailable in this build (browser): pass through
  }
  return cached;
}

/** Whether the resolution data loaded in this process. */
export function tokenResolverAvailable(): boolean {
  return loadData() !== null;
}

/** Split a canonical form the way enTokenize splits contractions, so
 *  a resolved "don't" enters the item stream as do + n't. Mirrors
 *  parse.ts's contraction rules; keep the two in step. */
function splitCanonical(form: string): string[] {
  if (/^can't$/i.test(form)) return ["can", "n't"];
  if (/n't$/i.test(form) && form.length > 3) return [form.slice(0, -3), "n't"];
  if (/^(what|where|when|who|how|it|that|there|he|she)'s$/i.test(form)) return [form.slice(0, -2), "is"];
  if (/^(you|we|they)'re$/i.test(form)) return [form.slice(0, -3), "are"];
  if (/^i'm$/i.test(form)) return ["I", "am"];
  return [form];
}

const topCandidates = (suggestions: Suggestion[]) =>
  suggestions.slice(0, 3).map((s) => ({ term: s.term, distance: s.distance, count: s.count }));

/** The parser's classification of a token, for the resolver's use:
 *  "function" (closed-class word), "known" (lexicon entry or a
 *  WordNet-derivable noun/adjective), or undefined (needs help). */
export type TokenClass = "function" | "known" | undefined;

/**
 * Resolve a token list. `recognize` is the parser's own
 * classification, reused. Returns the possibly-rewritten token
 * list and one record per token that needed work.
 */
export function resolveTokenList(
  tokens: string[],
  recognize: (lower: string) => TokenClass,
): { tokens: string[]; resolutions: TokenResolution[] } {
  const data = loadData();
  if (!data) return { tokens, resolutions: [] };
  const out: string[] = [];
  const resolutions: TokenResolution[] = [];
  let guessesApplied = 0;
  const erode = (base: number) => base * Math.pow(0.8, guessesApplied);

  for (const token of tokens) {
    const lower = token.toLowerCase();
    const cls = token === "," ? "function" : recognize(lower);
    if (cls === "function") {
      out.push(token);
      continue;
    }
    const atIndex = out.length;

    // 2. Variant graph — consulted before the known-word pass for
    // short tokens (the header's ordering rule); a recognised word
    // longer than two letters stands as itself.
    const edges = data.variants.get(lower);
    const canonicals = edges ? [...new Set(edges.map((e) => e.canonical))] : [];
    if (edges && canonicals.length === 1 && (cls === undefined || token.length <= 2)) {
      const edge = edges[0];
      const replacement = splitCanonical(edge.canonical);
      out.push(...replacement);
      resolutions.push({
        surface: token,
        tokenIndex: atIndex,
        outcome: "variant",
        replacement,
        confidence: edge.confidence,
        rule: `variant-graph:${edge.kind}`,
      });
      continue;
    }
    if (cls === "known") {
      out.push(token);
      continue;
    }
    if (token.length <= 1) {
      out.push(token);
      resolutions.push({
        surface: token,
        tokenIndex: atIndex,
        outcome: "unresolved",
        replacement: [token],
        confidence: 0.1,
        rule: "none",
      });
      continue;
    }

    // 3. Segmentation of a joined form, BEFORE the matcher: a long
    // token that splits into words the parser already knows, every
    // part exact (no part itself corrected), is a joined form, not
    // a misspelling — the matcher would otherwise happily delete
    // its way to a frequent neighbour ("aboutit" -> "about").
    // A joined form whose parts also need correction is NOT
    // accepted here (v1); it falls through to the matcher.
    if (lower.length >= 5 && erode(0.7) >= 0.5) {
      const seg = data.symspell.wordSegmentation(lower);
      const parts = seg.corrected.split(" ").filter(Boolean);
      if (
        parts.length >= 2 &&
        seg.corrected === seg.segmented &&
        parts.every((p) => recognize(p) !== undefined)
      ) {
        out.push(...parts);
        resolutions.push({
          surface: token,
        tokenIndex: atIndex,
          outcome: "segmented",
          replacement: parts,
          confidence: Math.round(erode(0.7) * 100) / 100,
          rule: "segmentation:symspell",
        });
        guessesApplied++;
        continue;
      }
    }

    // 4. Matcher, restricted to usable words.
    const maxEd = lower.length <= 4 ? 1 : 2;
    const all = data.symspell.lookup(lower, maxEd);
    const usable = all.filter((s) => recognize(s.term) !== undefined);
    const best = usable[0];
    if (best) {
      const runner = usable[1];
      const clearsMargin =
        !runner || best.distance < runner.distance || best.count >= 2 * runner.count;
      if (clearsMargin) {
        let confidence = best.distance === 1 ? 0.85 : 0.6;
        if (runner && runner.distance === best.distance) {
          confidence *= 0.5 + 0.5 * (best.count / (best.count + runner.count));
        }
        confidence = erode(confidence);
        if (confidence >= 0.5) {
          out.push(best.term);
          resolutions.push({
            surface: token,
        tokenIndex: atIndex,
            outcome: "corrected",
            replacement: [best.term],
            confidence: Math.round(confidence * 100) / 100,
            rule: "matcher:symspell",
            candidates: topCandidates(usable),
            ...(aoaPriorFor(best.term) ? { aoaPrior: aoaPriorFor(best.term) } : {}),
          });
          guessesApplied++;
          continue;
        }
        // Eroded below the floor by this sentence's earlier guesses:
        // the candidate is reported, not applied.
        out.push(token);
        resolutions.push({
          surface: token,
        tokenIndex: atIndex,
          outcome: "unresolved",
          replacement: [token],
          confidence: Math.round(confidence * 100) / 100,
          rule: "matcher:below-threshold",
          candidates: topCandidates(usable),
          ...(aoaPriorFor(best.term) ? { aoaPrior: aoaPriorFor(best.term) } : {}),
        });
        continue;
      }
    }

    // 5. Unresolved: the token stands; the gap is located here.
    out.push(token);
    const ambiguous = edges !== undefined && canonicals.length > 1;
    const bestCandidate = ambiguous ? canonicals[0] : all.length > 0 ? topCandidates(all)[0]?.term : undefined;
    resolutions.push({
      surface: token,
        tokenIndex: atIndex,
      outcome: "unresolved",
      replacement: [token],
      confidence: all.length > 0 ? 0.3 : 0.1,
      rule: ambiguous ? "variant-graph:ambiguous" : "none",
      ...(ambiguous
        ? { candidates: canonicals.map((c) => ({ term: c, distance: 0, count: 0 })) }
        : all.length > 0
          ? { candidates: topCandidates(all) }
          : {}),
      ...(aoaPriorFor(bestCandidate) ? { aoaPrior: aoaPriorFor(bestCandidate) } : {}),
    });
  }
  return { tokens: out, resolutions };
}
