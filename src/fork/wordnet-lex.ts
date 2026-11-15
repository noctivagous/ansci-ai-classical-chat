/**
 * wordnet-lex.ts — the WordNet lexicon provider for the fork parser.
 *
 * The hand lexicon in sentence.ts covers the evaluated vocabulary and
 * stops there: off that territory the parser used to fail ("no verb
 * found") or fall back to a proper-noun reading. This provider derives
 * lexicon entries for unknown English words from the existing Open
 * English WordNet extract (src/wordnet.ts, reused read-only), so the
 * parser's coverage is the dictionary's, not the test set's.
 *
 * What it derives, and the honest limits:
 *  - VERBS: a VerbEntry whose forms come from REGULAR morphology
 *    (third -s/-es/-ies, past/participle -ed with y→i and final-
 *    consonant doubling). Irregular pasts (blow→blew) are NOT
 *    generated; the surface still RESOLVES to the lemma through the
 *    extract's forms index for parsing, but its tense reads as the
 *    parser's default. Derived verbs carry NO valency: slots is
 *    ["patient"] and required is [] — permissive by design, because
 *    WordNet gives no valency frames. The Wood→Earth checker therefore
 *    has nothing to check a derived verb against; that is a real
 *    limit, stated here rather than papered over.
 *  - NOUNS: a SimpleEntry (Earth), lemma normalised through the forms
 *    index (plurals resolve: rivers → river).
 *  - ADJECTIVES: a SimpleEntry (Fire syntactic).
 *  - ADVERBS: NOT derived. The extract trimmed adverb synsets (its
 *    pos set is n/v/a), so there is nothing honest to derive from;
 *    unknown adverbs stay unknown.
 *
 * Derived entries are registered into EN_LEXICON (only into keys the
 * hand lexicon has not claimed — the hand lexicon always wins) so
 * generate.ts, check.ts and turn.ts, which consult EN_LEXICON by
 * lemma, see them unchanged. Every key the provider writes is tracked
 * and removed again when the provider is disabled.
 *
 * SEMANTIC CLIMBING (climbClassification): a concept the curated table
 * (classify.ts) does not know can still earn a semantic address by
 * climbing WordNet hypernyms (hypernym + instance relations) until a
 * synset carries a lemma the table DOES know — the anchor. Confidence
 * decays ×0.9 per hop from the anchor entry's confidence, and the
 * result is returned only if it clears the join's CONFIDENCE_GATE;
 * provenance is "wordnet-derived", a third layer kept distinct from
 * fork-curated and fork-creative. Senses are tried in extract order
 * (the dictionary's sense order); the first sense whose climb anchors
 * wins, and the winning sense is recorded in the path. Two data facts
 * this design had to absorb (verified against the OEWN 2024 extract):
 *  - blizzard's FIRST noun sense is "a series of unpleasant
 *    occurrences" (a rash of burglaries), which climbs nowhere; its
 *    weather sense is second, and climbs blizzard —IS_A→ storm in one
 *    hop. Strict first-synset climbing would strand it, so senses are
 *    tried in order until one anchors.
 *  - 'cold' never climbs at all: the curated table owns it, keyed by
 *    (concept, aspect) — temperature/Water vs illness/Metal — and the
 *    table always wins over the climb. That is the X1 brake. (In this
 *    extract the illness synset wn-n14389489 is the THIRD noun sense
 *    of 'cold' anyway; a head cold parsed as a bare noun gets the
 *    table's primary — temperature — entry unless an aspect is known.
 *    The aspect discipline, not the climb, is what keeps a head cold
 *    out of winter's conclusions, and derive(graph, 'cold',
 *    'illness') remains the guarded path.)
 * Adjectives have no hypernym tree in WordNet, so an adjective's
 * climb is its own synsets' lemmas only (hop 0).
 *
 * The provider is toggleable (enableWordnetLexicon) so the holdout
 * run can measure the parser with and without it. If the extract is
 * absent or unloadable, the provider silently disables and the
 * parser behaves exactly as it did before this module existed.
 */
import {
  getDefaultExtract,
  synsetsForLemma,
  synsetsForSurface,
  type WordNetExtract,
} from "../wordnet";
import type { AspectKey } from "../graph";
import { frameSignature } from "./framenet-lex";
import {
  EN_LEXICON,
  type Element,
  type LexEntry,
  type SimpleEntry,
  type VerbEntry,
} from "./sentence";
import { CLASSIFICATIONS, CLIMB_ANCHORS, lookupClassification, type ClassificationEntry } from "./classify";
import { CONFIDENCE_GATE } from "./join";
import { ingForm } from "./parse";

/* ---------------- provider state ---------------- */

let enabled = true;
let extractTried = false;
let extractCache: WordNetExtract | null = null;

function extract(): WordNetExtract | null {
  if (!extractTried) {
    extractTried = true;
    try {
      extractCache = getDefaultExtract();
    } catch {
      extractCache = null; // absent extract: provider silently off
    }
  }
  return extractCache;
}

/** True when the provider is switched on AND the extract loaded. */
export function wordnetAvailable(): boolean {
  return enabled && extract() !== null;
}

/**
 * Switch the provider on/off. Turning it off also removes every entry
 * it registered into EN_LEXICON, restoring the hand lexicon exactly —
 * the holdout run's baseline arm depends on that.
 */
export function enableWordnetLexicon(on: boolean): void {
  enabled = on;
  if (!on) {
    for (const key of derivedKeys) delete EN_LEXICON[key];
    derivedKeys.clear();
    derivedKeyOwner.clear();
    // The entry cache must go too: a cached derived entry would be
    // handed back by wordnetVerb/Noun/Adjective even with the lexicon
    // purged, silently defeating the toggle (caught in stage 1, where
    // a held-out arm kept seeing the signatures it had withheld).
    entryCache.clear();
    derivedLemmas.clear();
  }
}

/* ---------------- derived-entry registry ---------------- */

const derivedKeys = new Set<string>();
const derivedLemmas = new Set<string>();
const entryCache = new Map<string, LexEntry | undefined>();

/** True when this lemma's lexicon entry was derived by this provider. */
export function isWordnetDerived(lemma: string): boolean {
  return derivedLemmas.has(lemma.toLowerCase());
}

const derivedKeyOwner = new Map<string, LexEntry>();

/** Register a derived entry under the given keys, never overwriting a
 *  key the hand lexicon holds. One collision is resolved deliberately:
 *  a surface that is both a derived noun and a derived verb form
 *  ("blows") — the VERB entry takes the shared keys, because the
 *  by-lemma consumers (generate.ts, check.ts, turn.ts) consult
 *  EN_LEXICON for the verb's forms, while noun nodes carry their
 *  entry on the item itself. The parser resolves the surface's POS
 *  positionally, on the item, either way. */
function register(entry: LexEntry, keys: string[]): void {
  for (const key of keys) {
    if (EN_LEXICON[key] === undefined) {
      EN_LEXICON[key] = entry;
      derivedKeys.add(key);
      derivedKeyOwner.set(key, entry);
    } else if (derivedKeyOwner.has(key) && derivedKeyOwner.get(key) !== entry && entry.kind === "verb" && EN_LEXICON[key].kind !== "verb") {
      EN_LEXICON[key] = entry;
      derivedKeyOwner.set(key, entry);
    }
  }
  derivedLemmas.add(entry.lemma);
}

/* ---------------- regular morphology ---------------- */

/** Third-person singular: blow→blows, watch→watches, fly→flies. */
export function thirdForm(base: string): string {
  if (/(s|x|z|ch|sh)$/.test(base)) return base + "es";
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + "ies";
  return base + "s";
}

/** Regular past/participle: arrive→arrived, try→tried, stop→stopped. */
export function regularPast(base: string): string {
  if (/e$/.test(base)) return base + "d";
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + "ied";
  // Final-consonant doubling after a single short vowel (stop, drop).
  if (/^[^aeiou]*[aeiou][^aeiouwx]$/.test(base)) return base + base.slice(-1) + "ed";
  return base + "ed";
}

/* ---------------- sense resolution ---------------- */

/** Resolve a surface to a lemma of the wanted POS: exact lemma first,
 *  then the extract's forms index (blows → blow, rivers → river).
 *  The forms index is consulted directly, not only through
 *  synsetsForSurface: a surface can be a lemma in its own right for
 *  one POS ("bends", the decompression sickness, is a noun lemma)
 *  while the forms index still attests it as another POS's inflection
 *  (bends → bend, verb) — synsetsForSurface's exact-lemma shortcut
 *  would hide the second fact. */
function lemmaFor(surface: string, pos: "n" | "v" | "a"): string | undefined {
  const ex = extract();
  if (!ex) return undefined;
  const key = surface.toLowerCase();
  if (synsetsForLemma(ex, key).some((s) => s.pos === pos)) return key;
  const formCand = (ex.forms.get(key) ?? []).find((c) => c.pos === pos);
  if (formCand) return formCand.lemma;
  const cand = synsetsForSurface(ex, key).candidates.find((c) => c.pos === pos);
  if (cand) return cand.lemma;
  // Regular-morphology fallback: the forms index does not list every
  // regular inflection ("happened" is missing though "baked" is
  // present). Strip the regular endings and accept a candidate only
  // if it is an attested lemma of the right POS — the synset check is
  // the guard against over-stripping.
  if (pos === "v") {
    const stems: string[] = [];
    if (key.endsWith("ied") && key.length > 4) stems.push(key.slice(0, -3) + "y");
    if (key.endsWith("ing") && key.length > 5) {
      const base = key.slice(0, -3);
      stems.push(base, base + "e");
      if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) stems.push(base.slice(0, -1));
    }
    if (key.endsWith("ed") && key.length > 4) {
      const base = key.slice(0, -2);
      stems.push(base, base + "e", key.slice(0, -1));
      if (base.length > 2 && base[base.length - 1] === base[base.length - 2]) stems.push(base.slice(0, -1));
    }
    if (key.endsWith("s") && key.length > 3) stems.push(key.slice(0, -1));
    for (const stem of stems) {
      if (synsetsForLemma(ex, stem).some((s) => s.pos === "v")) return stem;
    }
  }
  return undefined;
}

/* ---------------- entry derivation ---------------- */

/* ---------------- irregular-form selection (WP4 spec §4) ----------------
 * The extract's forms index holds non-identity inflections only.
 * Inverted per lemma, the attested verb surfaces are filtered by
 * form class (the index also contains regularised forms of strong
 * verbs — "beginned" is an attested surface — so membership alone
 * proves nothing). Selection: the u-form of an a/u ablaut pair
 * (sang/sung, drank/drunk, began/begun) is the participle, else an
 * -en/-n candidate is; a candidate that is another candidate + -en
 * (sunken over sunk) is dropped as the derived form; the past takes
 * the remaining candidate. Identity-past verbs (cut, hit) and
 * identity participles (become) are invisible to the index and keep
 * the regular/default form — a recorded gap. */
let verbFormsIndex: Map<string, string[]> | null = null;

export function irregularForms(lemma: string): { past?: string; participle?: string } {
  const ex = extract();
  if (!ex) return {};
  if (!verbFormsIndex) {
    verbFormsIndex = new Map();
    for (const [surface, cands] of ex.forms) {
      for (const c of cands) {
        if (c.pos !== "v") continue;
        const list = verbFormsIndex.get(c.lemma) ?? [];
        if (!list.includes(surface)) list.push(surface);
        verbFormsIndex.set(c.lemma, list);
      }
    }
  }
  const surfaces = verbFormsIndex.get(lemma) ?? [];
  // Filter by FORM CLASS, not by equality with this module's own
  // regularisers: the index itself contains regularised forms of
  // strong verbs ("beginned", "forgetted" are attested surfaces in
  // it), and its doubling rules differ from the local ones. A strong
  // past/participle never ends in -ed or -ing and is never the
  // third-person form, so those classes are excluded wholesale.
  const thirdVariants = new Set([thirdForm(lemma), lemma + "s", lemma + "es"]);
  const candidates = surfaces.filter(
    (x) => x !== lemma && !thirdVariants.has(x) && !/ing$/.test(x) && !/ed$/.test(x),
  ).sort();
  // A candidate that is another candidate + -en/-n is the derived
  // adjectival-style form (sunken from sunk) — but only when a third
  // candidate (the past) exists alongside: with just [broke, broken]
  // the longer form IS the participle, and dropping it was a real
  // error this rule's first version made on the whole o-class.
  const irregular = candidates.filter(
    (x) => !(candidates.length >= 3 && candidates.some((y) => y !== x && x.startsWith(y) && /^(e?n)$/.test(x.slice(y.length)))),
  );
  if (!irregular.length) return {};
  // Ablaut pairs first (sang/sung, began/begun): the u-form is the
  // participle. Then the -en/-n preference (written, taught-class).
  let participle: string | undefined;
  if (irregular.length === 2) {
    const [a, b] = irregular;
    if (a.length === b.length) {
      const diffs = [...a].map((ch, i) => (ch !== b[i] ? i : -1)).filter((i) => i >= 0);
      if (diffs.length === 1 && a[diffs[0]] === "a" && b[diffs[0]] === "u") participle = b;
      else if (diffs.length === 1 && b[diffs[0]] === "a" && a[diffs[0]] === "u") participle = a;
    }
  }
  participle ??= irregular.find((x) => /en$/.test(x)) ?? irregular.find((x) => /n$/.test(x));
  const past = irregular.find((x) => x !== participle) ?? participle;
  return { past, participle: participle ?? past };
}

export function wordnetVerb(surface: string): VerbEntry | undefined {
  if (!enabled) return undefined;
  const lemma = lemmaFor(surface, "v");
  if (!lemma) return undefined;
  const cacheKey = "v:" + lemma;
  let entry = entryCache.get(cacheKey) as VerbEntry | undefined;
  if (!entry) {
    if (entryCache.has(cacheKey)) return undefined;
    const irr = irregularForms(lemma);
    const past = irr.past ?? regularPast(lemma);
    // Valency: FrameNet frame evidence when an LU exists for this
    // lemma (framenet-lex, Part C.4); otherwise the permissive
    // fallback — one optional patient, nothing required — which the
    // valency assessment (check.ts) reports as evidence-free rather
    // than licensed.
    const sig = frameSignature(lemma);
    entry = {
      kind: "verb",
      lemma,
      element: "Wood",
      slots: sig ? sig.slots : ["patient"],
      // FrameNet core is not obligation (core FEs are routinely
      // null-instantiated), so a signature contributes NO VerbEntry
      // required slots: the binary checker must not flag an
      // intransitive use of a transitively-framed derived verb. The
      // signature's core-object record lives on frameSignature and
      // is judged by the three-state assessment, where an unfilled
      // core object is unusual-but-licensed, not unsupported.
      required: [],
      ...(sig?.prepSlot ? { prepSlot: { slot: sig.prepSlot.slot, preps: sig.prepSlot.preps } } : {}),
      forms: { base: lemma, third: thirdForm(lemma), past, participle: irr.participle ?? past },
      source: "wordnet",
      ...(sig ? { frameSignature: { frame: sig.frame, luId: sig.luId, slots: sig.slots, required: sig.required } } : {}),
    };
    entryCache.set(cacheKey, entry);
  }
  register(entry, [entry.forms.base, entry.forms.third, entry.forms.past, entry.forms.participle, ingForm(lemma)]);
  return entry;
}

export function wordnetNoun(surface: string): SimpleEntry | undefined {
  if (!enabled) return undefined;
  const lemma = lemmaFor(surface, "n");
  if (!lemma) return undefined;
  const cacheKey = "n:" + lemma;
  let entry = entryCache.get(cacheKey) as SimpleEntry | undefined;
  if (!entry) {
    if (entryCache.has(cacheKey)) return undefined;
    const climb = climbClassification(lemma);
    entry = {
      kind: "noun",
      lemma,
      element: "Earth",
      ...(climb ? { semanticElement: climb.element } : {}),
      source: "wordnet",
    };
    entryCache.set(cacheKey, entry);
  }
  register(entry, [lemma, surface.toLowerCase()]);
  return entry;
}

export function wordnetAdjective(surface: string): SimpleEntry | undefined {
  if (!enabled) return undefined;
  const lemma = lemmaFor(surface, "a");
  if (!lemma) return undefined;
  const cacheKey = "a:" + lemma;
  let entry = entryCache.get(cacheKey) as SimpleEntry | undefined;
  if (!entry) {
    if (entryCache.has(cacheKey)) return undefined;
    const climb = climbClassification(lemma);
    entry = {
      kind: "adjective",
      lemma,
      element: "Fire",
      ...(climb ? { semanticElement: climb.element } : {}),
      source: "wordnet",
    };
    entryCache.set(cacheKey, entry);
  }
  register(entry, [lemma, surface.toLowerCase()]);
  return entry;
}

/* ---------------- semantic climbing ---------------- */

export interface ClimbResult {
  element: Element;
  /** The anchor concept's aspect (the climb inherits the anchor's sense). */
  aspect: string;
  aspectKey: AspectKey;
  /** Anchor entry confidence × 0.9^hops. */
  confidence: number;
  hops: number;
  /** The classified concept the climb reached. */
  anchor: string;
  /** Human-readable climb: synset lemmas walked, sense used, anchor. */
  path: string;
  provenance: "wordnet-derived";
}

const MAX_CLIMB_HOPS = 6;
const HOP_DECAY = 0.9;

/** Anchor vocabulary: the curated table's concepts (whose curated
 *  layer restates the seed graph's correspondence tables), plus the
 *  anchor-only CLIMB_ANCHORS — seed exemplars that are deliberately
 *  NOT classifications (see classify.ts: an assertion and an anchor
 *  are different jobs; H6's phase-null governs the table, not the
 *  climb's infrastructure). First entry per concept wins, so a real
 *  classification always outranks an anchor-only record. */
const anchorByConcept = new Map<string, ClassificationEntry>();
for (const e of CLASSIFICATIONS) {
  if (!anchorByConcept.has(e.concept)) anchorByConcept.set(e.concept, e);
}
for (const e of CLIMB_ANCHORS) {
  if (!anchorByConcept.has(e.concept)) anchorByConcept.set(e.concept, e);
}

let hypernymUp: Map<number, number[]> | null = null;
function hypernymAdjacency(ex: WordNetExtract): Map<number, number[]> {
  if (hypernymUp) return hypernymUp;
  const up = new Map<number, number[]>();
  for (const kind of ["hypernym", "instance"]) {
    const flat = ex.relations[kind] ?? [];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      const from = flat[i] as number;
      const to = flat[i + 1] as number;
      const list = up.get(from);
      if (list) list.push(to);
      else up.set(from, [to]);
    }
  }
  hypernymUp = up;
  return up;
}

interface ClimbCandidate extends ClimbResult {
  gated: boolean;
}

/** The best climb found for a lemma, whether or not it clears the
 *  gate (gated candidates carry gated: true). Exported for tests and
 *  for honest reporting of what the gate turned away. */
export function climbCandidate(lemma: string): ClimbCandidate | undefined {
  const all = climbCandidates(lemma);
  let best: ClimbCandidate | undefined;
  for (const candidate of all) {
    if (!best || candidate.confidence > best.confidence) best = candidate;
  }
  return best;
}

/**
 * Every anchored sense of a lemma, one candidate per sense (the best
 * anchor on that sense's shortest climb), in extract sense order.
 * climbCandidate picks among these by confidence alone — a property
 * of the word in isolation. Stage 4's sense-by-coherence pass
 * (sense.ts) chooses among them again with the sentence's other
 * classifications as evidence; this is the candidate set it sees.
 */
export function climbCandidates(lemma: string): ClimbCandidate[] {
  if (!enabled) return [];
  const ex = extract();
  if (!ex) return [];
  const key = lemma.toLowerCase();
  if (lookupClassification(key)) return []; // the table owns it
  const up = hypernymAdjacency(ex);
  const out: ClimbCandidate[] = [];
  for (const pos of ["n", "a"] as const) {
    const synsets = synsetsForLemma(ex, key).filter((s) => s.pos === pos);
    for (let si = 0; si < synsets.length; si++) {
      const start = synsets[si];
      // BFS upward; adjectives have no hypernym edges, so for them
      // this is the hop-0 lemma check only — as WordNet gives it.
      const queue: { index: number; hops: number; trail: string[] }[] = [
        { index: start.index, hops: 0, trail: [start.lemmas.join("/")] },
      ];
      const seen = new Set<number>([start.index]);
      while (queue.length) {
        const cur = queue.shift()!;
        const synset = ex.synsets[cur.index];
        const hit = synset.lemmas
          .map((l) => l.toLowerCase())
          .find((l) => l !== key && anchorByConcept.has(l));
        if (hit) {
          const anchor = anchorByConcept.get(hit)!;
          const confidence = Math.round(anchor.confidence * Math.pow(HOP_DECAY, cur.hops) * 10000) / 10000;
          out.push({
            element: anchor.element,
            aspect: anchor.aspect,
            aspectKey: anchor.aspectKey,
            confidence,
            hops: cur.hops,
            anchor: hit,
            path:
              `${key} [${pos} sense ${si + 1}: ${start.lemmas.join("/")}] ` +
              cur.trail.map((t) => `—IS_A→ ${t}`).slice(1).join(" ") +
              `${cur.hops ? " " : ""}—ANCHOR→ ${hit} (${anchor.element}, ${anchor.provenance} @${anchor.confidence})`,
            provenance: "wordnet-derived",
            gated: confidence < CONFIDENCE_GATE,
          });
          break; // first anchor on this sense's shortest path wins the sense
        }
        if (cur.hops >= MAX_CLIMB_HOPS) continue;
        for (const next of up.get(cur.index) ?? []) {
          if (seen.has(next)) continue;
          seen.add(next);
          queue.push({ index: next, hops: cur.hops + 1, trail: [...cur.trail, ex.synsets[next].lemmas.join("/")] });
        }
      }
    }
  }
  return out;
}

const climbCache = new Map<string, ClimbResult | undefined>();

/**
 * Climb a concept the curated table does not know to a classification,
 * or return undefined: table-owned concepts (the table wins), concepts
 * whose climb finds no anchor within 6 hops, and climbs whose decayed
 * confidence falls below the join's gate.
 */
export function climbClassification(lemma: string): ClimbResult | undefined {
  if (!enabled) return undefined; // not cached: a disabled provider must not poison the cache
  const key = lemma.toLowerCase();
  if (climbCache.has(key)) return climbCache.get(key);
  const candidate = climbCandidate(key);
  const result = candidate && !candidate.gated ? candidate : undefined;
  climbCache.set(key, result);
  return result;
}
