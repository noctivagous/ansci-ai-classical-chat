/**
 * annotator.ts — the optional parser sidecar's contract (piece B input).
 *
 * spaCy (or Stanza/CoreNLP behind the same shape) proposes per-turn
 * STRUCTURE — tokens with POS/lemma/dependency labels, entities,
 * noun chunks — and discourse reads it as read-only signals. It never
 * binds a span to a node (longest-match on CSKG stays the referent
 * finder) and it never speaks (C/E/F still only use graph testimony).
 *
 * Absent (the default): every consumer behaves exactly as before.
 * The sidecar's char offsets line up with the turn because B's
 * tokeniser is length-preserving (lowercase + punctuation → space),
 * so alignment is by char overlap, never by re-tokenising.
 */
import * as fs from "fs";

/** One token, in spaCy's pipeline vocabulary (UPOS pos, PTB tag). */
export interface AnnotatorToken {
  index: number;
  text: string;
  lemma: string;
  pos: string;
  tag: string;
  dep: string;
  head: number;
  startChar: number;
  endChar: number;
  ent: string;
}

export interface AnnotatorEntity {
  text: string;
  label: string;
  startChar: number;
  endChar: number;
}

export interface AnnotatorChunk {
  startChar: number;
  endChar: number;
}

/** One turn's worth of parser structure. `sents` rides along unused. */
export interface AnnotatorDoc {
  text: string;
  tokens: AnnotatorToken[];
  entities: AnnotatorEntity[];
  chunks: AnnotatorChunk[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

/**
 * Validate an unknown value as an AnnotatorDoc. Never throws:
 * anything malformed is null, and the turn falls back to no-parser
 * behaviour. Sizes are capped so a hostile file cannot blow up B.
 */
export function parseAnnotatorDoc(v: unknown): AnnotatorDoc | null {
  if (!isRecord(v)) return null;
  const text = str(v.text);
  if (text === null || text.length > 10000) return null;
  if (!Array.isArray(v.tokens) || v.tokens.length > 10000) return null;
  const tokens: AnnotatorToken[] = [];
  for (const t of v.tokens) {
    if (!isRecord(t)) return null;
    const index = num(t.i);
    const tokText = str(t.text);
    const lemma = str(t.lemma);
    const pos = str(t.pos);
    const tag = str(t.tag);
    const dep = str(t.dep);
    const head = num(t.head);
    const start = num(t.start);
    const end = num(t.end);
    const ent = str(t.ent);
    if (
      index === null || tokText === null || lemma === null ||
      pos === null || tag === null || dep === null ||
      head === null || start === null || end === null || ent === null
    ) return null;
    if (start < 0 || end < start || end > text.length + 1) return null;
    tokens.push({
      index, text: tokText, lemma, pos, tag, dep, head,
      startChar: start, endChar: end, ent,
    });
  }
  const entities: AnnotatorEntity[] = [];
  if (v.entities !== undefined) {
    if (!Array.isArray(v.entities) || v.entities.length > 1000) return null;
    for (const e of v.entities) {
      if (!isRecord(e)) return null;
      const eText = str(e.text);
      const label = str(e.label);
      const start = num(e.start);
      const end = num(e.end);
      if (eText === null || label === null || start === null || end === null) return null;
      entities.push({ text: eText, label, startChar: start, endChar: end });
    }
  }
  const chunks: AnnotatorChunk[] = [];
  if (v.chunks !== undefined) {
    if (!Array.isArray(v.chunks) || v.chunks.length > 1000) return null;
    for (const c of v.chunks) {
      if (!isRecord(c)) return null;
      const start = num(c.start);
      const end = num(c.end);
      if (start === null || end === null || start < 0 || end < start) return null;
      chunks.push({ startChar: start, endChar: end });
    }
  }
  return { text, tokens, entities, chunks };
}

/** Token indices overlapping a char span. */
export function tokensForCharSpan(
  doc: AnnotatorDoc,
  startChar: number,
  endChar: number,
): AnnotatorToken[] {
  return doc.tokens.filter(
    (t) => t.startChar < endChar && t.endChar > startChar,
  );
}

/**
 * A span that is pure parser function — interjections (hey, hi) and
 * auxiliaries (should, could): scaffolding around a happening, never
 * a referent. Discourse skips choosing for these instead of
 * stoplisting each word by hand.
 */
export function isParserFunctionSpan(
  doc: AnnotatorDoc,
  startChar: number,
  endChar: number,
): boolean {
  const toks = tokensForCharSpan(doc, startChar, endChar);
  return (
    toks.length > 0 &&
    toks.every((t) => t.pos === "INTJ" || t.pos === "AUX")
  );
}

/** Why a span was skipped, for the trace. */
export function parserFunctionReason(
  doc: AnnotatorDoc,
  startChar: number,
  endChar: number,
): string {
  const toks = tokensForCharSpan(doc, startChar, endChar);
  const tags = [...new Set(toks.map((t) => `${t.text}/${t.pos}`))].join(" ");
  return `parser: function words (${tags}) — not a referent, skipped`;
}

/** Entity labels overlapping a char span (PERSON, GPE, …). */
export function entityLabelsForSpan(
  doc: AnnotatorDoc,
  startChar: number,
  endChar: number,
): string[] {
  return doc.entities
    .filter((e) => e.startChar < endChar && e.endChar > startChar)
    .map((e) => e.label);
}

/**
 * The parser's verb lemma for a char span, or null. VERB only —
 * auxiliaries stay scaffolding (the situation scan already walks
 * past them to the speaker). A fallback for verbs outside the
 * hand list whose FormOf testimony is missing or junk.
 */
export function verbLemmaForSpan(
  doc: AnnotatorDoc,
  startChar: number,
  endChar: number,
): string | null {
  const tok = tokensForCharSpan(doc, startChar, endChar)
    .find((t) => t.pos === "VERB");
  if (!tok) return null;
  const lemma = tok.lemma.toLowerCase();
  return /^[a-z]{2,}$/.test(lemma) ? lemma : null;
}

/** A mention-sized span sitting inside one noun chunk. */
export function chunkContainsSpan(
  doc: AnnotatorDoc,
  startChar: number,
  endChar: number,
): boolean {
  return doc.chunks.some(
    (c) => c.startChar <= startChar && c.endChar >= endChar,
  );
}

/**
 * This turn's annotation, when the caller provided one. ANSCI_ANNOTATION
 * is either inline JSON or @a-file-path; the doc is used only when
 * its text is exactly this turn's (a stale file must never steer a
 * new turn). Anything missing or malformed is null — the turn runs
 * parser-free, exactly as before.
 */
export function loadTurnAnnotation(
  env: NodeJS.ProcessEnv,
  text: string,
): AnnotatorDoc | null {
  const raw = env.ANSCI_ANNOTATION;
  if (!raw) return null;
  try {
    const json = raw.startsWith("@")
      ? fs.readFileSync(raw.slice(1), "utf8")
      : raw;
    const doc = parseAnnotatorDoc(JSON.parse(json));
    if (!doc || doc.text !== text) return null;
    return doc;
  } catch {
    return null;
  }
}
