/**
 * symspell.ts — a TypeScript port of SymSpell, the symmetric-delete
 * spelling-correction algorithm by Wolf Garbe (MIT License; original
 * C# at github.com/wolfgarbe/SymSpell, reference port symspellpy by
 * mammothb). Ported 2026-11-16 at the owner's direction: spelling
 * correction and word segmentation are solved classical problems, so
 * the engine room is ported, not reinvented. What this file does NOT
 * contain is anything of ours — no variant graph, no confidence
 * policy, no provenance; that integration layer is token-resolve.ts.
 *
 * The algorithm, in brief: for every dictionary word, all strings
 * obtainable by deleting up to maxEditDistance characters from its
 * prefix are precomputed into an index (delete -> words). Lookup
 * generates the input's own deletes level by level; any dictionary
 * word sharing a delete is a candidate, verified with the true
 * Damerau–Levenshtein distance and ranked by distance, then corpus
 * frequency. Because only deletes are generated (never insertions,
 * substitutions or transpositions of the dictionary), lookup stays
 * fast over large dictionaries — the property the classical engine's
 * naive scan lacked when it exempted the WordNet synsets from fuzzy
 * matching for slowness.
 *
 * Port notes: symspellpy's Verbosity modes collapse here to "all
 * verified suggestions, sorted" — the caller (token-resolve) applies
 * the margin policy. wordSegmentation follows symspellpy's
 * composition dynamic program (linear time, log-probability sums)
 * with a plain array in place of its circular buffer; the optimum
 * composition is the same, tie-breaking among equal compositions may
 * differ in rare cases.
 */

export interface Suggestion {
  term: string;
  distance: number;
  count: number;
}

export interface Segmentation {
  /** The input with spaces inserted, uncorrected parts kept as-is. */
  segmented: string;
  /** The segmented string with each part replaced by its top correction. */
  corrected: string;
  distanceSum: number;
  logProbSum: number;
}

/** True Damerau–Levenshtein distance (adjacent transposition costs 1,
 *  substrings may be edited more than once), after the algorithm in
 *  symspellpy's editdistance.py. */
export function damerauLevenshtein(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;
  const INF = lenA + lenB;
  // d has (lenA+2) x (lenB+2) entries; row/col 0 hold INF guards.
  const d: number[][] = Array.from({ length: lenA + 2 }, () => new Array<number>(lenB + 2).fill(0));
  d[0][0] = INF;
  for (let i = 0; i <= lenA; i++) {
    d[i + 1][0] = INF;
    d[i + 1][1] = i;
  }
  for (let j = 0; j <= lenB; j++) {
    d[0][j + 1] = INF;
    d[1][j + 1] = j;
  }
  const da = new Map<string, number>();
  for (let i = 1; i <= lenA; i++) {
    let db = 0;
    for (let j = 1; j <= lenB; j++) {
      const i1 = da.get(b[j - 1]) ?? 0;
      const j1 = db;
      let cost = 1;
      if (a[i - 1] === b[j - 1]) {
        cost = 0;
        db = j;
      }
      d[i + 1][j + 1] = Math.min(
        d[i][j] + cost, // substitution
        d[i + 1][j] + 1, // insertion
        d[i][j + 1] + 1, // deletion
        d[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1), // transposition
      );
    }
    da.set(a[i - 1], i);
  }
  return d[lenA + 1][lenB + 1];
}

/** All strings one deletion away from `word`. */
function deletesOf(word: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < word.length; i++) out.push(word.slice(0, i) + word.slice(i + 1));
  return out;
}

export class SymSpell {
  readonly maxDictionaryEditDistance: number;
  readonly prefixLength: number;
  private words = new Map<string, number>();
  private deletes = new Map<string, string[]>();
  private maxLength = 0;
  /** Sum of all dictionary counts (the N of the segmentation probabilities). */
  totalCount = 0;

  constructor(maxDictionaryEditDistance = 2, prefixLength = 7) {
    this.maxDictionaryEditDistance = maxDictionaryEditDistance;
    this.prefixLength = prefixLength;
  }

  get wordCount(): number {
    return this.words.size;
  }

  has(word: string): boolean {
    return this.words.has(word);
  }

  countOf(word: string): number {
    return this.words.get(word) ?? 0;
  }

  /** Register a word with its corpus frequency, indexing its deletes. */
  addWord(word: string, count: number): void {
    if (count <= 0) return;
    const prev = this.words.get(word);
    if (prev !== undefined) {
      this.words.set(word, prev + count);
      this.totalCount += count;
      return;
    }
    this.words.set(word, count);
    this.totalCount += count;
    if (word.length > this.maxLength) this.maxLength = word.length;
    for (const del of this.editsPrefix(word)) {
      const list = this.deletes.get(del);
      if (list) list.push(word);
      else this.deletes.set(del, [word]);
    }
  }

  /** The delete neighbourhood of the word's prefix, out to the
   *  dictionary edit distance (symspellpy's _edits_prefix). */
  private editsPrefix(word: string): Set<string> {
    const prefix = word.length > this.prefixLength ? word.slice(0, this.prefixLength) : word;
    const set = new Set<string>();
    let frontier = [prefix];
    for (let dist = 0; dist < this.maxDictionaryEditDistance; dist++) {
      const next: string[] = [];
      for (const item of frontier) {
        if (item.length > 1) {
          for (const del of deletesOf(item)) {
            if (!set.has(del)) {
              set.add(del);
              next.push(del);
            }
          }
        }
      }
      frontier = next;
    }
    return set;
  }

  /**
   * All verified suggestions for `phrase` within maxEditDistance,
   * sorted by distance ascending, then count descending. An exact
   * dictionary hit returns just itself at distance 0.
   */
  lookup(phrase: string, maxEditDistance = this.maxDictionaryEditDistance): Suggestion[] {
    if (maxEditDistance > this.maxDictionaryEditDistance) {
      throw new Error("maxEditDistance exceeds the dictionary edit distance");
    }
    const suggestions: Suggestion[] = [];
    if (phrase.length - maxEditDistance > this.maxLength) return suggestions;

    const exact = this.words.get(phrase);
    if (exact !== undefined) {
      suggestions.push({ term: phrase, distance: 0, count: exact });
      return suggestions;
    }
    if (maxEditDistance === 0) return suggestions;

    const consideredDeletes = new Set<string>();
    const consideredSuggestions = new Set<string>([phrase]);
    let candidates: string[] = [];
    const phrasePrefixLen = Math.min(phrase.length, this.prefixLength);
    candidates.push(phrase.slice(0, phrasePrefixLen));

    const consider = (term: string): void => {
      if (consideredSuggestions.has(term)) return;
      consideredSuggestions.add(term);
      const distance = damerauLevenshtein(phrase, term);
      if (distance <= maxEditDistance) {
        suggestions.push({ term, distance, count: this.words.get(term) ?? 0 });
      }
    };

    while (candidates.length > 0) {
      const next: string[] = [];
      for (const candidate of candidates) {
        const lenDiff = phrasePrefixLen - candidate.length;
        if (lenDiff > maxEditDistance) continue;
        // The candidate is itself a dictionary word (a delete of the phrase).
        if (this.words.has(candidate) && candidate !== phrase) consider(candidate);
        // Words whose indexed deletes meet this candidate.
        const indexed = this.deletes.get(candidate);
        if (indexed) for (const term of indexed) consider(term);
        // Generate the candidate's deletes for the next level.
        if (candidate.length > 1 && lenDiff < maxEditDistance) {
          for (const del of deletesOf(candidate)) {
            if (!consideredDeletes.has(del)) {
              consideredDeletes.add(del);
              next.push(del);
            }
          }
        }
      }
      candidates = next;
    }
    suggestions.sort((x, y) => x.distance - y.distance || y.count - x.count);
    return suggestions;
  }

  /**
   * Divide `phrase` into words, correcting each part against the
   * dictionary (symspellpy's word_segmentation, after Garbe's
   * triangular composition method). Existing spaces are allowed.
   */
  wordSegmentation(
    phrase: string,
    maxEditDistance = this.maxDictionaryEditDistance,
    maxSegmentationWordLength = this.maxLength,
  ): Segmentation {
    const input = phrase.normalize("NFKC").replace(/-/g, "");
    if (!input) return { segmented: "", corrected: "", distanceSum: 0, logProbSum: 0 };
    const arraySize = Math.min(maxSegmentationWordLength, input.length);
    interface Comp {
      segmented: string;
      corrected: string;
      distanceSum: number;
      logProbSum: number;
    }
    const empty: Comp = { segmented: "", corrected: "", distanceSum: 0, logProbSum: 0 };
    const compositions: Comp[] = new Array<Comp>(arraySize).fill(empty);
    // symspellpy's circular indexing: the composition for the prefix
    // ending at position p lives in slot (p - 1) % arraySize; column j
    // extends the prefix that ended at j, and writes prefixes ending
    // at j + i. The answer is the slot for the full length.
    const slotFor = (prefixLen: number) => (prefixLen - 1) % arraySize;

    for (let j = 0; j < input.length; j++) {
      const imax = Math.min(input.length - j, maxSegmentationWordLength);
      for (let i = 1; i <= imax; i++) {
        let part = input.slice(j, j + i);
        let separatorLen = 0;
        let topEd = 0;
        if (part.startsWith(" ")) {
          part = part.slice(1);
        } else {
          separatorLen = 1; // the space did not exist; it had to be inserted
        }
        topEd += part.length;
        part = part.replace(/ /g, "");
        topEd -= part.length;

        let topResult = "";
        let topLogProb = 0;
        const results = part ? this.lookup(part.toLowerCase(), maxEditDistance) : [];
        const top = results[0]; // lookup sorts by distance, then count: [0] is symspellpy's TOP
        if (top) {
          topResult = top.term;
          if (part.length > 0 && part[0] === part[0].toUpperCase() && part[0] !== part[0].toLowerCase()) {
            topResult = topResult.charAt(0).toUpperCase() + topResult.slice(1);
          }
          topEd += top.distance;
          topLogProb = Math.log10(top.count / this.totalCount);
        } else {
          topResult = part;
          topEd += part.length;
          topLogProb = Math.log10(10.0 / this.totalCount / Math.pow(10, part.length));
        }

        const destIdx = slotFor(j + i);
        if (j === 0) {
          compositions[destIdx] = {
            segmented: part,
            corrected: topResult,
            distanceSum: topEd,
            logProbSum: topLogProb,
          };
        } else if (
          i === maxSegmentationWordLength ||
          ((compositions[destIdx].distanceSum === compositions[slotFor(j)].distanceSum + topEd ||
            compositions[destIdx].distanceSum === compositions[slotFor(j)].distanceSum + separatorLen + topEd) &&
            compositions[destIdx].logProbSum < compositions[slotFor(j)].logProbSum + topLogProb) ||
          compositions[slotFor(j)].distanceSum + separatorLen + topEd < compositions[destIdx].distanceSum
        ) {
          const prev = compositions[slotFor(j)];
          compositions[destIdx] = {
            segmented: prev.segmented ? prev.segmented + " " + part : part,
            corrected: prev.corrected ? prev.corrected + " " + topResult : topResult,
            distanceSum: prev.distanceSum + separatorLen + topEd,
            logProbSum: prev.logProbSum + topLogProb,
          };
        }
      }
    }
    const finalComp = compositions[slotFor(input.length)];
    return {
      segmented: finalComp.segmented,
      corrected: finalComp.corrected,
      distanceSum: finalComp.distanceSum,
      logProbSum: finalComp.logProbSum,
    };
  }
}
