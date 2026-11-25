/**
 * structured-tokens.ts — closed structural recognizers for
 * contact and designator tokens: email addresses, URLs and
 * telephone numbers.
 *
 * CHECKLIST SOURCE (no code ported): LUIS's prebuilt-entity
 * catalog (Age, Currency, DatetimeV2, Dimension, Email,
 * GeographyV2, KeyPhrase, Number, Ordinal, Percentage,
 * PersonName, Phonenumber, Temperature, URL — LUIS reference,
 * "All Prebuilt entities", archived docs, LUIS retired
 * 2026-03-31). The catalog was walked against AnSci's own
 * recognizers; most of it is already covered (numbers by
 * parseNumberToken, dates by timekeeping/calendar, units by
 * units-measurement, places by the geography pair). What was
 * genuinely missing — and what this file supplies — is the
 * contact triple: patterns below are hand-written, closed
 * and structural, matched against the token surface only.
 * No model, no gazetteer, no network: a token either has
 * the shape or it does not.
 *
 * Scope discipline: recognition is all this file does. What
 * an address MEANS in the conversation (whose email it is,
 * what to do with it) stays with the session record and the
 * turn loop, which read the token this file recognised —
 * never the other way round.
 */

/** What a structured token is recognised as. */
export type StructuredTokenKind = "email" | "url" | "phone";

/** An email address: a local part, '@', and a dotted domain. */
export function isEmailAddress(surface: string): boolean {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(surface);
}

/**
 * A URL or bare domain: a dotted host whose final label
 * carries letters (so "2.0" and "1.5" are never URLs),
 * with an optional scheme, port and path. The '@' check
 * runs first in classifyStructuredToken, so an address
 * never reads as a URL.
 */
export function isUrl(surface: string): boolean {
  return /^(?:https?:\/\/)?(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}(?::\d+)?(?:\/[^\s]*)?$/i.test(surface);
}

/**
 * A telephone number: nothing but phone characters, with
 * 7–15 digits. Shorter digit strings are the quantity
 * layer's business (years, counts — "2026" is not a
 * phone number), and spaced formats ("+1 555 123 4567")
 * do not survive tokenization as one token — a stated
 * limitation, not a silent gap.
 */
export function isPhoneNumber(surface: string): boolean {
  if (!/^[+\d][\d\s().-]*$/.test(surface)) return false;
  const digits = surface.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

/** The token's structured kind, or undefined — email first,
 *  so an address never reads as a URL. */
export function classifyStructuredToken(surface: string): StructuredTokenKind | undefined {
  if (isEmailAddress(surface)) return "email";
  if (isUrl(surface)) return "url";
  if (isPhoneNumber(surface)) return "phone";
  return undefined;
}

const EMAIL_SPAN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const URL_SPAN = /(?:https?:\/\/|www\.)?(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}(?::\d+)?(?:\/[^\s]*)?/gi;

/**
 * Spans of structured tokens in running text, for the turn
 * layer's marks-pass segmentation: a sentence mark inside an
 * address or domain ("sam@example.com.") is the token's, not
 * a segment boundary — without this the turn split the
 * address in two and recorded "com" as the entity. Only
 * email and URL spans count: phone dots are digit-dot-digit
 * and the decimal rule already keeps them. Callers decide
 * the boundary from the span and the mark (see
 * splitTurnSegmentsDetailed): a dot followed by an uppercase
 * letter still breaks ("apples.Oranges" stays two segments),
 * so all-caps domains mid-text remain split — a stated
 * limitation, not a silent gap.
 */
export function structuredSpans(text: string): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  for (const re of [EMAIL_SPAN, URL_SPAN]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      out.push({ start: m.index, end: m.index + m[0].length });
    }
  }
  return out;
}

/** Whether this mark position sits strictly inside a
 *  structured span — and, for a dot, is followed by a
 *  lowercase letter (the missing-space guard above). */
export function insideStructuredSpan(text: string, punctAt: number, spans: { start: number; end: number }[]): boolean {
  const mark = text[punctAt];
  if (mark !== "." && mark !== "?" && mark !== "!") return false;
  const next = text[punctAt + 1];
  for (const s of spans) {
    if (s.start < punctAt && punctAt < s.end) {
      if (mark === ".") return next !== undefined && /[a-z]/.test(next);
      return true;
    }
  }
  return false;
}
