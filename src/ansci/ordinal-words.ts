/**
 * ordinal-words.ts — the closed ordinal table: first through
 * twentieth, plus digit forms ("1st", "2nd") with validated
 * suffixes ("11st" is malformed and reads as no ordinal).
 *
 * A LEAF module by design: the sentence layer (parse.ts's
 * token recognition) and the LPU bridge
 * (quantification-language.ts) both read this table, and the
 * sentence layer cannot import the bridge — the bridge
 * imports the session, and loading the session inside the
 * parser's own load broke disposition pricing downstream
 * (found by bisect: r4 failed with the import, passed
 * without it). One table, no imports, no cycle.
 *
 * Ordinals are NOT amounts — no ledger entry counts "the
 * first apple" as one apple — and they never name a counted
 * kind; the bridge enforces both, reading this table.
 */

/** first through twentieth, as language files rank. */
const ORDINAL_WORDS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
  sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15,
  sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20,
};

/**
 * A token's rank, if it is one: an ordinal word, or a digit
 * ordinal with a valid suffix.
 */
export function parseOrdinalToken(token: string): number | undefined {
  const t = token.toLowerCase();
  if (ORDINAL_WORDS[t] !== undefined) return ORDINAL_WORDS[t];
  const m = /^(\d+)(st|nd|rd|th)$/.exec(t);
  if (!m) return undefined;
  const n = Number.parseInt(m[1], 10);
  const mod100 = n % 100;
  const mod10 = n % 10;
  const valid =
    m[2] === "st"
      ? mod10 === 1 && mod100 !== 11
      : m[2] === "nd"
        ? mod10 === 2 && mod100 !== 12
        : m[2] === "rd"
          ? mod10 === 3 && mod100 !== 13
          : mod10 === 0 || mod10 >= 4 || mod100 === 11 || mod100 === 12 || mod100 === 13;
  return valid ? n : undefined;
}
