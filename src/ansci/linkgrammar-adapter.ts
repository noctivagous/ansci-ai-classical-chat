/**
 * linkgrammar-adapter.ts — narrow WASM Link Grammar syntax adapter.
 *
 * Turns a first linkage from the in-process parser
 * (src/ansci/linkgrammar-wasm.ts) into candidate syntax
 * relationships over the caller's token list:
 *
 * - ALIGNMENT: Link Grammar words (subscripted, wall-bracketed,
 *   guess-marked, lowercased, punctuation kept) are walked against
 *   the parser's tokens (surface case, contractions split,
 *   edge symbols stripped) with a greedy monotonic match that
 *   skips punctuation on either side and joins AnSci-side
 *   contraction splits. Every linkage word records its token
 *   index or -1 when unaligned.
 * - CANDIDATES (complete linkages only): an S-family link with
 *   exactly one verb side proposes an agent candidate; an
 *   O-family link with exactly one verb side proposes a patient
 *   candidate. Connector labels ride along untouched, so later
 *   routing can split O*n/Ox indirect objects from plain-O
 *   direct ones. Agent candidates additionally require the
 *   verb to carry an O-family link (a bare intransitive subject
 *   is left to the positional parser) and require no MVp link
 *   anywhere in the linkage (passive S-subjects are patients,
 *   not agents).
 * - RECOVERED linkages (nullCount > 0) contribute aligned links
 *   as evidence but no role candidates: unsupported stays
 *   unresolved rather than guessed by position.
 */
import { connectorFamily } from "./linkage";
import { kindOfSubscript } from "./linkgrammar-lex";
import {
  parseSentenceWasm,
  parseSentenceWasmSync,
  type LinkGrammarWasmLink,
  type LinkGrammarWasmResult,
} from "./linkgrammar-wasm";

export interface AlignedLink {
  /** AnSci token index of the link's left end (-1 unaligned). */
  left: number;
  /** AnSci token index of the link's right end (-1 unaligned). */
  right: number;
  /** Raw Link Grammar connector label, e.g. "Ss*b", "O*n", "MVp". */
  connector: string;
  /** Connector family, e.g. "S", "O", "MV" (see linkage.ts). */
  family: string;
}

export interface SyntaxCandidate {
  kind: "agent" | "patient";
  /** AnSci token index of the verb. */
  verbToken: number;
  /** AnSci token index of the argument. */
  argToken: number;
  /** The Link Grammar connector that proposed this candidate. */
  connector: string;
  /** "S" for agent candidates, "O" for patient candidates. */
  family: "S" | "O";
}

export interface AdapterResult {
  status: "complete" | "recovered" | "failed";
  /** Linkage count reported by the parser. */
  linkages: number;
  /** Null-link count of the returned linkage (0 = complete). */
  nullCount: number;
  /** First-linkage links aligned to the caller's tokens. */
  links: AlignedLink[];
  /** Role candidates (complete linkages only). */
  candidates: SyntaxCandidate[];
  error?: string;
}

/** Strip display metadata from a linkage word for alignment:
 *  null-link brackets, guess annotations, and the dictionary
 *  subscript; lowercase. "gave.v-d" -> "gave", "[though]" ->
 *  "though", "York[!]" -> "york". */
export function normalizeLinkageWord(word: string): string {
  return word
    .replace(/\[[!][^\]]*\]/g, "")
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/\.[a-z](-[a-z]+)?$/, "")
    .toLowerCase();
}

/** The dictionary subscript of a linkage word ("" when bare),
 *  with brackets and guess annotations removed first. */
function wordSubscript(word: string): string {
  const bare = word
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/\[[!][^\]]*\]/g, "");
  const dot = bare.lastIndexOf(".");
  return dot >= 0 ? bare.slice(dot + 1) : "";
}

function isVerbWord(word: string): boolean {
  return kindOfSubscript(wordSubscript(word)) === "verb";
}

const LG_PUNCT = new Set([".", ",", "?", "!", ";", ":"]);

function normToken(token: string): string {
  return token.toLowerCase().replace(/'/g, "");
}

function normLgWord(word: string): string {
  return normalizeLinkageWord(word).replace(/'/g, "");
}

/**
 * Greedy monotonic alignment of linkage words to caller tokens.
 * Returns, per linkage word, the token index or -1. LEFT-WALL
 * and RIGHT-WALL never align. Punctuation may be skipped on
 * either side; up to two caller tokens may join one linkage
 * word (AnSci-side contraction splits: "can"+"n't" vs "cannot").
 */
export function alignWordsToTokens(
  lgWords: string[],
  tokens: string[],
): number[] {
  const aligned = new Array<number>(lgWords.length).fill(-1);
  let j = 0;
  for (let i = 0; i < lgWords.length; i++) {
    const w = normLgWord(lgWords[i]);
    if (w === "left-wall" || w === "right-wall" || w === "") {
      continue;
    }
    if (LG_PUNCT.has(w)) {
      // Linkage punctuation with no caller counterpart (a
      // stripped final mark) aligns nowhere; a matching mark
      // aligns when the caller kept it.
      const k = tokens.findIndex((t, idx) => idx >= j && t === lgWords[i]);
      if (k >= 0) {
        aligned[i] = k;
        j = k + 1;
      }
      continue;
    }
    let matched = false;
    for (let look = 0; look < 3 && j + look < tokens.length; look++) {
      if (normToken(tokens[j + look]) === w) {
        aligned[i] = j + look;
        j = j + look + 1;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    // One linkage word against two caller tokens
    // (contraction splits).
    for (let k = 1; k <= 2 && j + k < tokens.length; k++) {
      const joined = tokens
        .slice(j, j + k + 1)
        .map(normToken)
        .join("");
      if (joined === w) {
        aligned[i] = j;
        j = j + k + 1;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    // Otherwise leave the word unaligned and keep scanning:
    // a caller token the linkage merged or dropped (or vice
    // versa) must not drag the rest of the sentence with it.
    const skipTo = tokens.findIndex(
      (t, idx) => idx >= j && normToken(t) === w,
    );
    if (skipTo >= 0) {
      aligned[i] = skipTo;
      j = skipTo + 1;
    }
  }
  return aligned;
}

function verbSide(
  link: LinkGrammarWasmLink,
  words: string[],
): { verb: number; arg: number } | undefined {
  const lv = isVerbWord(words[link.left]);
  const rv = isVerbWord(words[link.right]);
  if (lv === rv) return undefined;
  return lv
    ? { verb: link.left, arg: link.right }
    : { verb: link.right, arg: link.left };
}

/**
 * Adapt one sentence's first linkage to candidate syntax
 * relationships over `tokens` (the parser's own token list,
 * surface case). Never throws: failure resolves to
 * { status: "failed", error }.
 */
export async function adaptLinkGrammarSyntax(
  text: string,
  tokens: string[],
): Promise<AdapterResult> {
  let parsed: LinkGrammarWasmResult;
  try {
    parsed = await parseSentenceWasm(text);
  } catch (err) {
    return {
      status: "failed",
      linkages: 0,
      nullCount: 0,
      links: [],
      candidates: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
  return buildAdapterResult(parsed, tokens);
}

/**
 * Synchronous adaptation for use inside the synchronous parse
 * loop. Never throws: when the module is cold (chat entry
 * points warm it at startup; nothing else does) it resolves
 * to status failed and the caller falls back to the positional
 * parser, exactly as if the adapter had abstained.
 */
export function adaptLinkGrammarSyntaxSync(
  text: string,
  tokens: string[],
): AdapterResult {
  return buildAdapterResult(parseSentenceWasmSync(text), tokens);
}

function buildAdapterResult(
  parsed: LinkGrammarWasmResult,
  tokens: string[],
): AdapterResult {
  if (!parsed.ok) {
    return {
      status: "failed",
      linkages: parsed.linkages ?? 0,
      nullCount: 0,
      links: [],
      candidates: [],
      error: parsed.error,
    };
  }
  const aligned = alignWordsToTokens(parsed.words, tokens);
  const links: AlignedLink[] = parsed.links.map((l) => ({
    left: aligned[l.left] ?? -1,
    right: aligned[l.right] ?? -1,
    connector: l.label,
    family: connectorFamily(l.label),
  }));
  const complete = parsed.nullCount === 0;
  const candidates: SyntaxCandidate[] = [];
  if (complete) {
    // A passive "by"-phrase (MVp into "by") marks the S-subject
    // as patient. Other MVp attachments ("prepares people for
    // ...") are not passives and do not suppress.
    const hasPassiveBy = parsed.links.some(
      (l) =>
        l.label.startsWith("MVp") &&
        normalizeLinkageWord(parsed.words[l.right] ?? "") === "by",
    );
    const verbsWithObjects = new Set<number>();
    for (const l of parsed.links) {
      if (connectorFamily(l.label) !== "O") continue;
      const sides = verbSide(l, parsed.words);
      if (sides) verbsWithObjects.add(sides.verb);
    }
    for (const l of parsed.links) {
      const family = connectorFamily(l.label);
      if (family !== "S" && family !== "O") continue;
      const sides = verbSide(l, parsed.words);
      if (!sides) continue;
      const leftToken = aligned[l.left] ?? -1;
      const rightToken = aligned[l.right] ?? -1;
      if (leftToken < 0 || rightToken < 0) continue;
      if (family === "S") {
        // A passive S-subject is a patient, never an agent;
        // a subject without an object is left to position.
        if (hasPassiveBy) continue;
        if (!verbsWithObjects.has(sides.verb)) continue;
        candidates.push({
          kind: "agent",
          verbToken: sides.verb === l.left ? leftToken : rightToken,
          argToken: sides.verb === l.left ? rightToken : leftToken,
          connector: l.label,
          family: "S",
        });
      } else {
        candidates.push({
          kind: "patient",
          verbToken: sides.verb === l.left ? leftToken : rightToken,
          argToken: sides.verb === l.left ? rightToken : leftToken,
          connector: l.label,
          family: "O",
        });
      }
    }
  }
  return {
    status: complete ? "complete" : "recovered",
    linkages: parsed.linkages,
    nullCount: parsed.nullCount,
    links,
    candidates,
  };
}
