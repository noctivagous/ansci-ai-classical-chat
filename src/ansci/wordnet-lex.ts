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
 *    parser's default. One resolution preference is deliberate: a
 *    surface that is another lemma's selected irregular past or
 *    participle resolves to THAT lemma even when the surface is
 *    itself a lemma (found → find, not the homonymous 'found' =
 *    establish) — see irregularFormLemma. Derived verbs carry NO valency: slots is
 *    ["patient"] and required is [] — permissive by design, because
 *    WordNet gives no valency frames. The Wood→Earth checker therefore
 *    has nothing to check a derived verb against; that is a real
 *    limit, stated here rather than papered over.
 *  - NOUNS: a SimpleEntry (Earth), lemma normalised through the forms
 *    index (plurals resolve: rivers → river).
 *  - ADJECTIVES: a SimpleEntry (Fire syntactic).
 *  - ADVERBS: a SimpleEntry (Water, the hand lexicon's adverb
 *    element), derived since the extract's adverb restoration
 *    (2026-11-18, GAPS §6): the shipped extract carries the
 *    adverb block again, so 'usually' and 'indoors' resolve to
 *    their synsets. Derived adverbs carry no semanticElement —
 *    the climb and the classification table are noun/adjective
 *    machinery, and no classification is invented for them.
 *
 * Derived entries are registered into EN_LEXICON (only into keys the
 * hand lexicon has not claimed — the hand lexicon always wins) so
 * generate.ts, check.ts and turn.ts, which consult EN_LEXICON by
 * lemma, see them unchanged. Every key the provider writes is tracked
 * and removed again when the provider is disabled.
 *
 * REGISTRATION IS ADOPTION (2026-11-18, the lexicon-state fix):
 * deriving an entry does NOT register it. The wordnet* functions
 * below derive, cache and return — a caller that merely PROBES
 * (asks "could this surface be a verb here?") leaves the shared
 * lexicon untouched. A caller that ADOPTS the entry — assigns it
 * to an item, a node, a clause root — registers it explicitly
 * through registerDerivedEntry. Before this discipline, every
 * probe registered, and a registered derived verb could displace
 * the same surface's derived noun or adjective in EN_LEXICON, so
 * a later parse classified the word differently from an earlier
 * one: probe-poisoning ("You are welcome." reparsing as "You
 * welcome."), the imperative construction going single-use (its
 * signature requires the initial word NOT classified as a verb,
 * and the first parse's probe registered exactly that), and the
 * existential reparse crash ("snow" flipped to its verb entry).
 * Parse classification (parse.ts) likewise never takes a derived
 * entry from the registry: it re-derives in the parser's fixed
 * precedence, so a word's classification is a function of the
 * sentence and the shipped lexicon, never of parse history.
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
 *  - STUFF-CLASS STOPS (2026-11-18, Slice B of the B-bucket anchor
 *    expansion; design: slice-b-design.md): a sense's climb can also
 *    stop at a synset that names a stuff class (STUFF_CLASS_STOPS in
 *    classify.ts), taking the class's element under the registered
 *    rule R3 (STUFF_CLASS_R3_V1) at the class's flat specimen price.
 *    The result's viaClass field records the stop. The taxonomy
 *    assigns no element anywhere; R3 does, once, as data.
 *  - CREATURE-CLASS STOPS (2026-11-18, Slice A of the same
 *    expansion; design: slice-a-design.md): a sense's climb can
 *    also stop at a taxonomic synset registered as a stop for the
 *    Yueling creature classes of prediction rule P2
 *    (CREATURE_CLASS_YUELING_V1): when a sense's climb reaches a
 *    stop synset — without its path passing a carved-out
 *    exclusion subtree (the human and cetacean subtrees inside
 *    mammal) — the sense gains a class candidate: the class's
 *    element at P2's flat cap (0.80, no per-hop decay —
 *    membership in an audited subtree is binary, not a distance
 *    from an exemplar), aspect "animal", with the derivation
 *    named in the path string and in the result's viaClass
 *    field. Membership is by the recognised kind, never by
 *    anatomical feature-checks; the stops are id-keyed, with no
 *    string-match route. Creature classes P2 does not name
 *    (amphibians, arachnids, worms, cnidarians) have no stops
 *    and stay unclassified — located gaps, recorded in the
 *    slice report (docs/ansci/slice-a-report.md).
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
 * ANCHOR SENSE PINNING (2026-11-15, anchor-quality repair; the full
 * audit is docs/ansci/anchor-audit.md): the climb's anchor test used
 * to be a lemma-STRING match — a synset counted as carrying an
 * anchor concept if any of its lemmas spelled the concept. But the
 * string denotes the classified sense in only some of its synsets:
 * "beef" the complaint, "wind" the instrument class, "ice" the drug
 * slang all fired their anchors. The repair: an anchor fires only
 * on synsets that carry its classified sense. The sense-carrying
 * synsets are selected mechanically per anchor — by explicit
 * override data where the aspect names no gloss domain (the
 * trigram anchors), else by scoring the anchor lemma's synsets'
 * glosses against a cue lexicon for the aspect's domain and
 * pinning every synset that scores — plus the small explicit
 * exception list in classify.ts. An anchor no synset scores for
 * stays UNPINNED (legacy string match) and is named in the audit
 * report; a pinned anchor never falls back to string match.
 * CLIMB_ANCHORS keep string match by design: they are hand-curated
 * climb infrastructure, not classifications (assertion ≠ anchor).
 *
 * The provider is toggleable (enableWordnetLexicon) so the holdout
 * run can measure the parser with and without it. If the extract is
 * absent or unloadable, the provider silently disables and the
 * parser behaves exactly as it did before this module existed.
 */
import {
  getDefaultExtract,
  installDefaultExtract,
  synsetsForLemma,
  synsetsForSurface,
  type WordNetExtract,
} from "../wordnet";
import type { AspectKey } from "../graph";
import { frameSignature } from "./framenet-lex";
import { verbnetCoverage } from "./verbnet-lex";
import {
  EN_LEXICON,
  type Element,
  type LexEntry,
  type SimpleEntry,
  type VerbEntry,
} from "./sentence";
import {
  ANCHOR_SYNSET_EXCEPTIONS,
  ANCHOR_SYNSET_OVERRIDES,
  CLASSIFICATIONS,
  CLIMB_ANCHORS,
  CATEGORY_STOPS,
  CREATURE_CLASS_CAP,
  CREATURE_CLASS_ELEMENTS,
  CREATURE_CLASS_EXCLUSIONS,
  CREATURE_CLASS_STOPS,
  STUFF_CLASS_ELEMENTS,
  STUFF_CLASS_PRICES,
  STUFF_CLASS_STOPS,
  lookupClassification,
  type ClassificationEntry,
  type CreatureClass,
  type StuffClass,
} from "./classify";
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

/** Install the checked-in WordNet extract loaded by a browser asset
 *  adapter. This resets prior negative filesystem probes and derived
 *  entries so the required browser provider becomes the active source. */
export function installWordnetExtract(extract: WordNetExtract): void {
  enableWordnetLexicon(false);
  installDefaultExtract(extract);
  extractCache = extract;
  extractTried = true;
  enabled = true;
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
function lemmaFor(surface: string, pos: "n" | "v" | "a" | "r"): string | undefined {
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
  // The -ne class (conversation-shapes C8): a candidate that is
  // the lemma + "ne" is the participle — do→done, go→gone.
  // "done" ends in "ne", not "en"/"n", so both preferences
  // below missed it and the participle fell back to the past
  // ("what was did" in the role-question decline).
  participle ??=
    irregular.find((x) => x.endsWith("ne") && x.slice(0, -2) === lemma) ??
    irregular.find((x) => /en$/.test(x)) ??
    irregular.find((x) => /n$/.test(x));
  const past = irregular.find((x) => x !== participle) ?? participle;
  return { past, participle: participle ?? past };
}

/** A surface that is another verb lemma's SELECTED irregular past
 *  or participle resolves to that lemma: found → find, saw → see.
 *  lemmaFor checks lemma-identity first, so without this the
 *  surface 'found' derived the homonymous lemma 'found' (establish,
 *  regular paradigm) and "She found rest in the garden" regenerated
 *  as "She founds rest…" — the derived entry's paradigm, not the
 *  surface's tense, drove generation and the agreement check.
 *  Selection is by irregularForms' own verdict (the forms index
 *  also attests regularised strong forms — "beginned" — which prove
 *  nothing), candidates in extract order. The recorded limit: the
 *  homonymous lemma's bare present ("they found schools" =
 *  establish) becomes unreachable through this provider; position
 *  and frequency favour the strong-verb reading, and the -ed/-s
 *  surfaces of the homonymous lemma still resolve to it. */
function irregularFormLemma(surface: string): string | undefined {
  const ex = extract();
  if (!ex) return undefined;
  const key = surface.toLowerCase();
  const cands = (ex.forms.get(key) ?? []).filter((c) => c.pos === "v" && c.lemma !== key);
  for (const c of cands) {
    const irr = irregularForms(c.lemma);
    if (irr.past === key || irr.participle === key) return c.lemma;
  }
  return undefined;
}

export function wordnetVerb(surface: string): VerbEntry | undefined {
  if (!enabled) return undefined;
  const lemma = irregularFormLemma(surface) ?? lemmaFor(surface, "v");
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
    // than licensed. Where FrameNet is silent but VerbNet covers
    // the lemma, the entry additionally carries the VerbNet shapes
    // (verbnetSignature) that check.ts checks the realised
    // structure against — the frame stays permissive, the check
    // is no longer blind.
    const sig = frameSignature(lemma);
    // VerbNet evidence, only where FrameNet gave none: the entry
    // keeps the permissive frame, but carries the VerbNet shapes
    // check.ts checks the realised structure against (verbnet-lex).
    const vn = sig ? undefined : verbnetCoverage(lemma);
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
      ...(vn ? { verbnetSignature: { classes: vn.classes, shapes: vn.shapes } } : {}),
    };
    entryCache.set(cacheKey, entry);
  }
  // No registration here: derivation is not adoption (see the
  // header). The caller that adopts this entry registers it.
  return entry;
}

/**
 * Register a derived entry a consumer has ADOPTED — assigned to
 * an item, a node, or a clause root — under the keys the
 * providers have always used: a verb under its five forms, a
 * noun or adjective under its lemma and the surface it was
 * adopted from. Registration exists for the by-lemma consumers
 * (generate.ts, check.ts, turn.ts); it is not a classification
 * source, and probing never calls this.
 */
export function registerDerivedEntry(entry: LexEntry, surface?: string): void {
  if (entry.kind === "verb") {
    const f = (entry as VerbEntry).forms;
    register(entry, [f.base, f.third, f.past, f.participle, ingForm(entry.lemma)]);
  } else {
    register(entry, surface ? [entry.lemma, surface.toLowerCase()] : [entry.lemma]);
  }
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
    // The classification seam (sealed-run mechanism 7): a
    // table-owned lemma never climbs — the X1 brake reserves
    // it for the classification table — but until now the
    // table was never applied here either, so garden, ginger
    // and cold entered via WordNet and landed unclassified.
    // The table's own primary entry now reaches the node when
    // the climb gives nothing. This settles nothing about
    // WHICH entry a concept like cold should lead with — the
    // value is whatever the table itself lists first, exactly
    // as every other lookupClassification caller receives it.
    const tableElement = climb ? undefined : lookupClassification(lemma)?.element;
    entry = {
      kind: "noun",
      lemma,
      element: "Earth",
      ...(climb ? { semanticElement: climb.element } : tableElement ? { semanticElement: tableElement } : {}),
      source: "wordnet",
    };
    entryCache.set(cacheKey, entry);
  }
  // No registration here: derivation is not adoption (see the
  // header). The caller that adopts this entry registers it.
  return entry;
}

export function wordnetAdverb(surface: string): SimpleEntry | undefined {
  if (!enabled) return undefined;
  const lemma = lemmaFor(surface, "r");
  if (!lemma) return undefined;
  const cacheKey = "r:" + lemma;
  let entry = entryCache.get(cacheKey) as SimpleEntry | undefined;
  if (!entry) {
    if (entryCache.has(cacheKey)) return undefined;
    entry = {
      kind: "adverb",
      lemma,
      element: "Water",
      source: "wordnet",
    };
    entryCache.set(cacheKey, entry);
  }
  // No registration here, as with noun/adjective: derivation is
  // not adoption. The caller that adopts this entry registers it.
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
    // Same seam as wordnetNoun (mechanism 7): the table's
    // primary entry reaches the node when the climb gives
    // nothing for a table-owned lemma.
    const tableElement = climb ? undefined : lookupClassification(lemma)?.element;
    entry = {
      kind: "adjective",
      lemma,
      element: "Fire",
      ...(climb ? { semanticElement: climb.element } : tableElement ? { semanticElement: tableElement } : {}),
      source: "wordnet",
    };
    entryCache.set(cacheKey, entry);
  }
  // No registration here: derivation is not adoption (see the
  // header). The caller that adopts this entry registers it.
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
  /** Set only on a class candidate (Slice A creature classes,
   *  Slice B stuff classes): the class the climb stopped at —
   *  exactly one of creatureClass / stuffClass, keyed by rule —
   *  the registered rule that prices it, and the stop synset.
   *  Absent on ordinary anchor candidates. */
  viaClass?: {
    creatureClass?: CreatureClass;
    stuffClass?: StuffClass;
    rule: "CREATURE_CLASS_YUELING_V1" | "STUFF_CLASS_R3_V1";
    stopSynset: string;
    stopLemmas: string[];
  };
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

/* ---------------- anchor sense pinning ----------------
 * The rule (falsifiable): a classification anchor fires on a
 * synset only if that synset is in the anchor's pin set — the
 * synsets of the anchor lemma whose glosses carry the classified
 * sense, selected as described in the module header. Selection is
 * mechanical and inspectable via anchorPinReport(): overrides
 * (classify.ts data) for the trigram anchors; otherwise every
 * noun/adjective synset of the lemma whose gloss shares at least
 * one token with the aspect domain's cue lexicon is pinned, when
 * at least one synset scores; the exception list then re-admits
 * named synsets. If no synset scores, the anchor is unpinned and
 * keeps the legacy string match — the audit names those anchors,
 * so the un-repaired residue is a list, not a silent behaviour. */

const CUE_DOMAINS: Record<string, string[]> = {
  taste: ["taste", "tasting", "flavor", "flavour", "acid", "acidic"],
  color: ["color", "colour", "chromatic", "hue", "shade", "tint", "pigment"],
  emotion: ["feeling", "emotion", "emotional", "anger", "angry", "fear", "fearful", "afraid", "joy", "sorrow", "grief", "mourn", "mournful", "mournfulness", "anxiety", "anxious", "worry", "worried", "sadness", "sad", "happiness", "happy", "arouse", "aroused", "arouses", "arousal", "desire", "mental", "state", "intense", "extreme", "passion", "relax", "relaxation"],
  food: ["food", "meat", "flesh", "edible", "dish", "cooked", "cooking", "cuisine", "grain", "cereal", "seed", "fruit", "vegetable", "baked", "soup", "beverage", "meal", "sweet"],
  body: ["head", "person", "animal", "body", "skin", "eye", "mouth", "nose", "ear", "hand", "organ", "tissue", "hair"],
  organ: ["organ", "gland", "glandular", "body", "anatomical", "anatomy"],
  temperature: ["temperature", "hot", "cold", "warm", "heat", "thermal", "freezing", "frozen"],
  weather: ["water", "falling", "drops", "vapor", "vapour", "cloud", "atmosphere", "atmospheric", "wind", "rain", "snow", "hail", "sleet", "thunder", "lightning", "storm", "air", "weather", "frozen", "temperature", "energy", "moisture", "flow"],
  temporal: ["season", "growth", "time", "day", "night", "morning", "evening", "dawn", "dusk", "light", "hour", "period", "year"],
  direction: ["direction", "compass", "point"],
  celestial: ["sun", "moon", "star", "planet", "celestial", "satellite", "solar", "orbit"],
  substance: ["substance", "solid", "liquid", "frozen", "freezing", "material", "matter", "chemical", "compound", "mineral"],
  state: ["state", "rest", "sleep", "consciousness", "unconscious", "feeling", "sensation", "pain", "physical", "process", "breathing", "respiration", "air", "symptom", "hurt", "body", "energy", "strength"],
  animal: ["animal", "mammal", "bird", "fowl", "domestic", "domesticated", "bred", "species", "genus", "wild", "creature", "livestock", "ruminant"],
  place: ["water", "land", "area", "region", "body", "flowing", "stream", "lake", "sea", "ocean", "forest", "trees", "cultivated"],
};

/** Aspect label → cue domain. Aspects absent here (and anchors
 *  with an override) take the override/unpinned paths. "trigram"
 *  is absent deliberately: a trigram aspect names a correspondence
 *  row, not a gloss domain — those anchors pin by override only. */
const ASPECT_DOMAIN: Record<string, string> = {
  taste: "taste", color: "color", emotion: "emotion",
  food: "food", grain: "food", body: "body", organ: "organ",
  temperature: "temperature", weather: "weather", precipitation: "weather",
  "air movement": "weather", season: "temporal", time: "temporal",
  direction: "direction", sky: "celestial", planet: "celestial",
  substance: "substance", state: "state", animal: "animal", place: "place",
};

function glossTokens(gloss: string): Set<string> {
  const out = new Set<string>();
  for (const raw of gloss.toLowerCase().split(/[^a-z]+/)) {
    if (!raw) continue;
    out.add(raw);
    if (raw.length > 3 && raw.endsWith("s")) out.add(raw.slice(0, -1));
  }
  return out;
}

export interface AnchorPinSynset {
  id: string;
  lemmas: string[];
  gloss: string;
  via: "override" | "cue" | "exception";
  score?: number;
}
export interface AnchorPinInfo {
  concept: string;
  element: Element;
  aspect: string;
  mode: "override" | "cue" | "cue+exception" | "override+exception" | "exception-only" | "unpinned" | "climb-anchor";
  pinned: AnchorPinSynset[];
  /** Every noun/adjective synset of the lemma, with its cue score
   *  (cue modes only) — the selection, inspectable. */
  synsets: (AnchorPinSynset & { score: number })[];
  /** Synsets another anchor pinned first (shared-synset rivals). */
  collisions: string[];
}

interface AnchorPin {
  concept: string;
  entry: ClassificationEntry;
  via: "override" | "cue" | "exception";
}
interface PinState {
  bySynset: Map<number, AnchorPin>;
  unpinned: Set<string>;
  climbOnly: Set<string>;
  report: AnchorPinInfo[];
}

let pinState: PinState | null = null;

function ensurePins(ex: WordNetExtract): PinState {
  if (pinState) return pinState;
  const bySynset = new Map<number, AnchorPin>();
  const unpinned = new Set<string>();
  const climbOnly = new Set<string>();
  const report: AnchorPinInfo[] = [];
  const classificationConcepts = new Set(CLASSIFICATIONS.map((e) => e.concept));
  const idToIndex = new Map<string, number>();
  ex.synsets.forEach((s, i) => idToIndex.set(s.id, i));
  const exceptionsByConcept = new Map<string, { synset: string }[]>();
  for (const x of ANCHOR_SYNSET_EXCEPTIONS) {
    const list = exceptionsByConcept.get(x.concept) ?? [];
    list.push(x);
    exceptionsByConcept.set(x.concept, list);
  }

  for (const [concept, entry] of anchorByConcept) {
    if (!classificationConcepts.has(concept)) {
      // CLIMB_ANCHORS-only record: string match by design (the
      // carve-out — these are climb infrastructure, not assertions).
      climbOnly.add(concept);
      report.push({ concept, element: entry.element, aspect: entry.aspect, mode: "climb-anchor", pinned: [], synsets: [], collisions: [] });
      continue;
    }
    const synsets = synsetsForLemma(ex, concept).filter((s) => s.pos === "n" || s.pos === "a");
    const pinned: AnchorPinSynset[] = [];
    const collisions: string[] = [];
    const pin = (index: number, via: AnchorPin["via"], score?: number) => {
      const existing = bySynset.get(index);
      if (existing) {
        if (existing.concept !== concept) collisions.push(`${ex.synsets[index].id} (pinned for ${existing.concept} first)`);
        return;
      }
      bySynset.set(index, { concept, entry, via });
      const s = ex.synsets[index];
      pinned.push({ id: s.id, lemmas: [...s.lemmas], gloss: s.gloss, via, ...(score !== undefined ? { score } : {}) });
    };
    let mode: AnchorPinInfo["mode"];
    let scored: (AnchorPinSynset & { score: number })[] = [];
    const override = ANCHOR_SYNSET_OVERRIDES[concept];
    if (override) {
      mode = "override";
      for (const id of override) {
        const index = idToIndex.get(id);
        if (index !== undefined) pin(index, "override");
      }
    } else {
      const domain = ASPECT_DOMAIN[entry.aspect];
      const cues = domain ? (CUE_DOMAINS[domain] ?? []).filter((c) => c !== concept) : [];
      scored = synsets.map((s) => {
        const tokens = glossTokens(s.gloss);
        const score = cues.reduce((n, c) => n + (tokens.has(c) ? 1 : 0), 0);
        return { id: s.id, lemmas: [...s.lemmas], gloss: s.gloss, via: "cue" as const, score };
      });
      const max = scored.reduce((m, s) => Math.max(m, s.score), 0);
      if (domain && max >= 1) {
        mode = "cue";
        scored.forEach((s, i) => {
          if (s.score >= 1) pin(synsets[i].index, "cue", s.score);
        });
      } else {
        mode = "unpinned";
        unpinned.add(concept);
      }
    }
    const exceptions = exceptionsByConcept.get(concept) ?? [];
    for (const x of exceptions) {
      const index = idToIndex.get(x.synset);
      if (index === undefined) continue;
      const before = pinned.length;
      pin(index, "exception");
      if (pinned.length > before) {
        if (mode === "cue") mode = "cue+exception";
        else if (mode === "override") mode = "override+exception";
        else if (mode === "unpinned") {
          mode = "exception-only";
          unpinned.delete(concept);
        }
      }
    }
    report.push({ concept, element: entry.element, aspect: entry.aspect, mode, pinned, synsets: scored, collisions });
  }
  pinState = { bySynset, unpinned, climbOnly, report };
  return pinState;
}

/** The pin selection for every anchor, as computed — the audit's
 *  inspectable record of which synsets each anchor may fire on. */
export function anchorPinReport(): AnchorPinInfo[] {
  const ex = extract();
  if (!ex) return [];
  return ensurePins(ex).report;
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

/* ---------------- creature-class stops ----------------
 * The stops and exclusions are data in classify.ts (synset ids).
 * Here they are resolved once against the extract: stops by synset
 * index for the climb's test, exclusions as an id set the climb's
 * paths are checked against. */

interface ClassStop {
  creatureClass: CreatureClass;
  synset: string;
  lemmas: string[];
}
interface ClassStopState {
  byIndex: Map<number, ClassStop>;
  exclusionIds: Set<string>;
}

let classStopState: ClassStopState | null = null;

function ensureClassStops(ex: WordNetExtract): ClassStopState {
  if (classStopState) return classStopState;
  const idToIndex = new Map<string, number>();
  ex.synsets.forEach((s, i) => idToIndex.set(s.id, i));
  const byIndex = new Map<number, ClassStop>();
  for (const stop of CREATURE_CLASS_STOPS) {
    const index = idToIndex.get(stop.synset);
    if (index === undefined) continue;
    byIndex.set(index, {
      creatureClass: stop.creatureClass,
      synset: stop.synset,
      lemmas: [...ex.synsets[index].lemmas],
    });
  }
  classStopState = {
    byIndex,
    exclusionIds: new Set(CREATURE_CLASS_EXCLUSIONS.map((x) => x.synset)),
  };
  return classStopState;
}

export interface ClassStopInfo {
  synset: string;
  lemmas: string[];
  gloss: string;
  creatureClass: CreatureClass;
  element: Element;
  /** Every synset in the stop's subtree, the stop itself included. */
  subtreeSize: number;
  /** Sorted headwords of the subtree's synsets — the audit dump. */
  members: string[];
  /** Exclusion roots inside this subtree, with their subtrees. */
  exclusionsApplied: { synset: string; lemmas: string[]; reason: string; subtreeSize: number }[];
}

/** The class-stop selection, as computed — the audit's inspectable
 *  record of each stop's subtree and the exclusions carved from
 *  it. Mirrors anchorPinReport's role for anchors. */
export function classStopReport(): ClassStopInfo[] {
  const ex = extract();
  if (!ex) return [];
  const stops = ensureClassStops(ex);
  const idToIndex = new Map<string, number>();
  ex.synsets.forEach((s, i) => idToIndex.set(s.id, i));
  const down = new Map<number, number[]>();
  for (const kind of ["hypernym", "instance"] as const) {
    const flat = ex.relations[kind] ?? [];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      const from = flat[i] as number;
      const to = flat[i + 1] as number;
      const list = down.get(to);
      if (list) list.push(from);
      else down.set(to, [from]);
    }
  }
  const subtreeOf = (root: number): Set<number> => {
    const out = new Set<number>([root]);
    const queue = [root];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const next of down.get(cur) ?? []) {
        if (out.has(next)) continue;
        out.add(next);
        queue.push(next);
      }
    }
    return out;
  };
  const out: ClassStopInfo[] = [];
  for (const [index, stop] of stops.byIndex) {
    const subtree = subtreeOf(index);
    const exclusionsApplied: ClassStopInfo["exclusionsApplied"] = [];
    for (const x of CREATURE_CLASS_EXCLUSIONS) {
      const xi = idToIndex.get(x.synset);
      if (xi === undefined || !subtree.has(xi)) continue;
      exclusionsApplied.push({
        synset: x.synset,
        lemmas: [...ex.synsets[xi].lemmas],
        reason: x.reason,
        subtreeSize: subtreeOf(xi).size,
      });
    }
    const s = ex.synsets[index];
    out.push({
      synset: stop.synset,
      lemmas: stop.lemmas,
      gloss: s.gloss,
      creatureClass: stop.creatureClass,
      element: CREATURE_CLASS_ELEMENTS[stop.creatureClass],
      subtreeSize: subtree.size,
      members: [...subtree].map((i) => ex.synsets[i].lemmas[0]).sort(),
      exclusionsApplied,
    });
  }
  return out;
}
/* ---------------- stuff-class stops ----------------
 * The stops are data in classify.ts (synset ids). Here they are
 * resolved once against the extract: stops by synset index for
 * the climb's test. (The creature-class stops directly above
 * follow the same pattern with an added exclusion set; the two
 * class branches were built in parallel trees and united in the
 * merge that landed both.) */

interface StuffStop {
  stuffClass: StuffClass;
  synset: string;
  lemmas: string[];
}

let stuffStopState: { byIndex: Map<number, StuffStop> } | null = null;

function ensureStuffStops(ex: WordNetExtract): { byIndex: Map<number, StuffStop> } {
  if (stuffStopState) return stuffStopState;
  const idToIndex = new Map<string, number>();
  ex.synsets.forEach((s, i) => idToIndex.set(s.id, i));
  const byIndex = new Map<number, StuffStop>();
  for (const stop of STUFF_CLASS_STOPS) {
    const index = idToIndex.get(stop.synset);
    if (index === undefined) continue;
    byIndex.set(index, {
      stuffClass: stop.stuffClass,
      synset: stop.synset,
      lemmas: [...ex.synsets[index].lemmas],
    });
  }
  stuffStopState = { byIndex };
  return stuffStopState;
}

export interface StuffStopInfo {
  synset: string;
  lemmas: string[];
  gloss: string;
  stuffClass: StuffClass;
  element: Element;
  price: number;
  /** Every synset in the stop's subtree, the stop itself included. */
  subtreeSize: number;
  /** Sorted headwords of the subtree's synsets — the audit dump. */
  members: string[];
}

/** The stuff-stop selection, as computed — the audit's inspectable
 *  record of each stop's subtree. Mirrors anchorPinReport's role
 *  for anchors. */
export function stuffStopReport(): StuffStopInfo[] {
  const ex = extract();
  if (!ex) return [];
  const stops = ensureStuffStops(ex);
  const down = new Map<number, number[]>();
  for (const kind of ["hypernym", "instance"] as const) {
    const flat = ex.relations[kind] ?? [];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      const from = flat[i] as number;
      const to = flat[i + 1] as number;
      const list = down.get(to);
      if (list) list.push(from);
      else down.set(to, [from]);
    }
  }
  const subtreeOf = (root: number): Set<number> => {
    const out = new Set<number>([root]);
    const queue = [root];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const next of down.get(cur) ?? []) {
        if (out.has(next)) continue;
        out.add(next);
        queue.push(next);
      }
    }
    return out;
  };
  const out: StuffStopInfo[] = [];
  for (const [index, stop] of stops.byIndex) {
    const subtree = subtreeOf(index);
    const s = ex.synsets[index];
    out.push({
      synset: stop.synset,
      lemmas: stop.lemmas,
      gloss: s.gloss,
      stuffClass: stop.stuffClass,
      element: STUFF_CLASS_ELEMENTS[stop.stuffClass],
      price: STUFF_CLASS_PRICES[stop.stuffClass],
      subtreeSize: subtree.size,
      members: [...subtree].map((i) => ex.synsets[i].lemmas[0]).sort(),
    });
  }
  return out;
}

/* ---------------- category stops: recognition ----------------
 * The stops are data in classify.ts (CATEGORY_STOPS). A sense the
 * climb did not classify can still be RECOGNISED: its walk passes
 * a synset naming a function category. The outcome is formal
 * (Slice C pre-rulings 1a–4a): it carries category, path and
 * hops — no element, no aspect, no classification confidence —
 * and nothing downstream may treat it as a candidate. */

interface CategoryStop {
  category: string;
  synset: string;
  lemmas: string[];
}

let categoryStopState: { byIndex: Map<number, CategoryStop> } | null = null;

function ensureCategoryStops(ex: WordNetExtract): { byIndex: Map<number, CategoryStop> } {
  if (categoryStopState) return categoryStopState;
  const idToIndex = new Map<string, number>();
  ex.synsets.forEach((s, i) => idToIndex.set(s.id, i));
  const byIndex = new Map<number, CategoryStop>();
  for (const stop of CATEGORY_STOPS) {
    const index = idToIndex.get(stop.synset);
    if (index === undefined) continue;
    byIndex.set(index, {
      category: stop.category,
      synset: stop.synset,
      lemmas: [...ex.synsets[index].lemmas],
    });
  }
  categoryStopState = { byIndex };
  return categoryStopState;
}

export interface CategoryStopInfo {
  synset: string;
  lemmas: string[];
  gloss: string;
  category: string;
  /** Every synset in the stop's subtree, the stop itself included. */
  subtreeSize: number;
  /** Sorted headwords of the subtree's synsets — the audit dump. */
  members: string[];
}

/** The category-stop selection, as computed — the audit's
 *  inspectable record of each stop's subtree. */
export function categoryStopReport(): CategoryStopInfo[] {
  const ex = extract();
  if (!ex) return [];
  const stops = ensureCategoryStops(ex);
  const down = new Map<number, number[]>();
  for (const kind of ["hypernym", "instance"] as const) {
    const flat = ex.relations[kind] ?? [];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      const from = flat[i] as number;
      const to = flat[i + 1] as number;
      const list = down.get(to);
      if (list) list.push(from);
      else down.set(to, [from]);
    }
  }
  const subtreeOf = (root: number): Set<number> => {
    const out = new Set<number>([root]);
    const queue = [root];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const next of down.get(cur) ?? []) {
        if (out.has(next)) continue;
        out.add(next);
        queue.push(next);
      }
    }
    return out;
  };
  const out: CategoryStopInfo[] = [];
  for (const [index, stop] of stops.byIndex) {
    const subtree = subtreeOf(index);
    const s = ex.synsets[index];
    out.push({
      synset: stop.synset,
      lemmas: stop.lemmas,
      gloss: s.gloss,
      category: stop.category,
      subtreeSize: subtree.size,
      members: [...subtree].map((i) => ex.synsets[i].lemmas[0]).sort(),
    });
  }
  return out;
}

/** One category stop met on a sense's climb path. */
export interface RecognitionStop {
  category: string;
  stopSynset: string;
  stopLemmas: string[];
  hops: number;
  /** True for the nearest stop on the path (ruling 4a). */
  primary: boolean;
}

/** A recognised-but-unclassified sense (Slice C, ruling 1a): the
 *  system knows the kind of thing the word names and claims no
 *  element for it. There is deliberately no element, aspect or
 *  confidence field on this type. */
export interface RecognitionResult {
  /** The primary (nearest) category. */
  category: string;
  stopSynset: string;
  stopLemmas: string[];
  hops: number;
  /** Human-readable walk to the primary stop. */
  path: string;
  /** Every category stop on the sense's climb paths, nearest first. */
  stops: RecognitionStop[];
  /** The sense this recognition belongs to (1-based, extract order). */
  sense: number;
  start: AuditSynset;
}

/** All category stops on one sense's climb paths (≤ MAX_CLIMB_HOPS),
 *  nearest first, each with the trail that first reached it. */
function categoryWalk(
  ex: WordNetExtract,
  startIndex: number,
): { stop: CategoryStop; hops: number; trail: number[] }[] {
  const stops = ensureCategoryStops(ex);
  const up = hypernymAdjacency(ex);
  const found = new Map<number, { stop: CategoryStop; hops: number; trail: number[] }>();
  const queue: { index: number; hops: number; trail: number[] }[] = [
    { index: startIndex, hops: 0, trail: [startIndex] },
  ];
  const seen = new Set<number>([startIndex]);
  while (queue.length) {
    const cur = queue.shift()!;
    const stop = stops.byIndex.get(cur.index);
    if (stop && !found.has(cur.index)) {
      found.set(cur.index, { stop, hops: cur.hops, trail: cur.trail });
    }
    if (cur.hops >= MAX_CLIMB_HOPS) continue;
    for (const next of up.get(cur.index) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push({ index: next, hops: cur.hops + 1, trail: [...cur.trail, next] });
    }
  }
  return [...found.values()].sort((a, b) => a.hops - b.hops);
}

/**
 * Recognitions for a lemma: one per noun sense the climb did NOT
 * classify (classification takes precedence, per sense — ruling
 * 3a), for senses whose walk passes at least one category stop.
 * Table-owned lemmas return [] (the table owns them; there is
 * nothing to recognise). Senses are in extract order.
 */
export function climbRecognitions(lemma: string): RecognitionResult[] {
  if (!enabled) return [];
  const ex = extract();
  if (!ex) return [];
  const key = lemma.toLowerCase();
  if (lookupClassification(key)) return [];
  const audit = climbAudit(key);
  const out: RecognitionResult[] = [];
  for (const sense of audit) {
    if (sense.pos !== "n" || sense.hit) continue; // classified senses never recognise
    const startIndex = ex.synsets.findIndex((s) => s.id === sense.start.id);
    if (startIndex < 0) continue;
    const walk = categoryWalk(ex, startIndex);
    if (!walk.length) continue;
    const stops: RecognitionStop[] = walk.map((w, i) => ({
      category: w.stop.category,
      stopSynset: w.stop.synset,
      stopLemmas: w.stop.lemmas,
      hops: w.hops,
      primary: i === 0,
    }));
    const first = walk[0];
    out.push({
      category: first.stop.category,
      stopSynset: first.stop.synset,
      stopLemmas: first.stop.lemmas,
      hops: first.hops,
      path:
        `${key} [n sense ${sense.sense}: ${sense.start.lemmas.join("/")}] ` +
        first.trail.map((i) => ex.synsets[i].lemmas.join("/")).slice(1).map((t) => `—IS_A→ ${t}`).join(" ") +
        `${first.hops ? " " : ""}—RECOGNISED→ ${first.stop.lemmas.join("/")} ⇒ kind: ${first.stop.category} (no classification)`,
      stops,
      sense: sense.sense,
      start: sense.start,
    });
  }
  return out;
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
  const pins = ensurePins(ex);
  const stuffStops = ensureStuffStops(ex);
  const classStops = ensureClassStops(ex);
  const out: ClimbCandidate[] = [];
  for (const pos of ["n", "a"] as const) {
    const synsets = synsetsForLemma(ex, key).filter((s) => s.pos === pos);
    for (let si = 0; si < synsets.length; si++) {
      const start = synsets[si];
      // BFS upward; adjectives have no hypernym edges, so for them
      // this is the hop-0 lemma check only — as WordNet gives it.
      // `excluded` records whether the path so far passed a
      // creature-class exclusion subtree (classify.ts): such a
      // path must not fire the creature-class stop above it.
      const queue: { index: number; hops: number; trail: string[]; excluded: boolean }[] = [
        { index: start.index, hops: 0, trail: [start.lemmas.join("/")], excluded: classStops.exclusionIds.has(start.id) },
      ];
      const seen = new Set<number>([start.index]);
      while (queue.length) {
        const cur = queue.shift()!;
        const synset = ex.synsets[cur.index];
        // Anchor test, post-repair: a pin on this synset wins; else
        // the legacy string match applies ONLY to anchors that are
        // unpinned or climb-only records. A pinned anchor's other
        // synsets no longer fire — that is the repair.
        let hit: string | undefined;
        const pin = pins.bySynset.get(cur.index);
        if (pin && pin.concept !== key) hit = pin.concept;
        if (!hit) {
          hit = synset.lemmas
            .map((l) => l.toLowerCase())
            .find((l) => l !== key && (pins.unpinned.has(l) || pins.climbOnly.has(l)));
        }
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
        // Creature-class stop: this synset is a registered P2
        // stop and the path here passed no exclusion subtree.
        // Priced once at P2's cap — see CREATURE_CLASS_CAP in
        // classify.ts. (The creature and stuff stop tables are
        // disjoint — organism subtrees vs substance subtrees —
        // so the order of the two class tests cannot matter.)
        if (!cur.excluded) {
          const stop = classStops.byIndex.get(cur.index);
          if (stop) {
            const element = CREATURE_CLASS_ELEMENTS[stop.creatureClass];
            out.push({
              element,
              aspect: "animal",
              aspectKey: "overall",
              confidence: CREATURE_CLASS_CAP,
              hops: cur.hops,
              anchor: stop.lemmas[0],
              path:
                `${key} [${pos} sense ${si + 1}: ${start.lemmas.join("/")}] ` +
                cur.trail.map((t) => `—IS_A→ ${t}`).slice(1).join(" ") +
                `${cur.hops ? " " : ""}—CLASS→ ${stop.lemmas.join("/")} ⇒ ${stop.creatureClass} (${element}, CREATURE_CLASS_YUELING_V1 @${CREATURE_CLASS_CAP})`,
              provenance: "wordnet-derived",
              viaClass: {
                creatureClass: stop.creatureClass,
                rule: "CREATURE_CLASS_YUELING_V1",
                stopSynset: stop.synset,
                stopLemmas: stop.lemmas,
              },
              gated: CREATURE_CLASS_CAP < CONFIDENCE_GATE,
            });
            break; // first hit on this sense's shortest path wins the sense
          }
        }
        // Stuff-class stop: this synset is a registered R3 stop.
        // Priced flat at the class's specimen price — see
        // STUFF_CLASS_PRICES in classify.ts. The aspect is the
        // pilot's axis name (material); the aspectKey stays
        // "overall" because AspectKey is a closed union owned by
        // the foundation graph module — the material reading is
        // carried by the aspect and by viaClass.
        {
          const stop = stuffStops.byIndex.get(cur.index);
          if (stop) {
            const element = STUFF_CLASS_ELEMENTS[stop.stuffClass];
            const price = STUFF_CLASS_PRICES[stop.stuffClass];
            out.push({
              element,
              aspect: "material",
              aspectKey: "overall",
              confidence: price,
              hops: cur.hops,
              anchor: stop.lemmas[0],
              path:
                `${key} [${pos} sense ${si + 1}: ${start.lemmas.join("/")}] ` +
                cur.trail.map((t) => `—IS_A→ ${t}`).slice(1).join(" ") +
                `${cur.hops ? " " : ""}—CLASS→ ${stop.lemmas.join("/")} ⇒ ${stop.stuffClass} (${element}, STUFF_CLASS_R3_V1 @${price})`,
              provenance: "wordnet-derived",
              viaClass: {
                stuffClass: stop.stuffClass,
                rule: "STUFF_CLASS_R3_V1",
                stopSynset: stop.synset,
                stopLemmas: stop.lemmas,
              },
              gated: price < CONFIDENCE_GATE,
            });
            break; // first hit on this sense's shortest path wins the sense
          }
        }
        if (cur.hops >= MAX_CLIMB_HOPS) continue;
        for (const next of up.get(cur.index) ?? []) {
          if (seen.has(next)) continue;
          seen.add(next);
          queue.push({
            index: next,
            hops: cur.hops + 1,
            trail: [...cur.trail, ex.synsets[next].lemmas.join("/")],
            excluded: cur.excluded || classStops.exclusionIds.has(ex.synsets[next].id),
          });
        }
      }
    }
  }
  return out;
}

/* ---------------- climb audit ----------------
 * The audit tool's window into the REAL climb (not a replica):
 * for each noun/adjective sense of a lemma, the full hypernym
 * trail of synset records walked and, where the climb anchored,
 * which anchor fired, by which route (pin / exception / override /
 * legacy string match on an unpinned anchor / climb-only anchor),
 * at what confidence. Waywardness is inspectable from this output. */

export interface AuditSynset {
  id: string;
  lemmas: string[];
  gloss: string;
}
export interface SenseAudit {
  pos: "n" | "a";
  sense: number;
  start: AuditSynset;
  hit?: {
    anchor: string;
    element: Element;
    confidence: number;
    hops: number;
    gated: boolean;
    via: "cue" | "exception" | "override" | "legacy" | "climb-anchor" | "class";
    viaClass?: { creatureClass?: CreatureClass; stuffClass?: StuffClass; stopSynset: string };
    trail: AuditSynset[];
  };
  /** Slice C: for a sense with no classification hit, the
   *  recognition its walk reaches (primary stop + how many stops
   *  the path records). Absent when the sense classifies or when
   *  no category stop is on its paths. */
  recognition?: { category: string; stopSynset: string; hops: number; stops: number };
}

export function climbAudit(lemma: string): SenseAudit[] {
  if (!enabled) return [];
  const ex = extract();
  if (!ex) return [];
  const key = lemma.toLowerCase();
  if (lookupClassification(key)) return []; // the table owns it — no climb
  const up = hypernymAdjacency(ex);
  const pins = ensurePins(ex);
  const stuffStops = ensureStuffStops(ex);
  const classStops = ensureClassStops(ex);
  const rec = (index: number): AuditSynset => {
    const s = ex.synsets[index];
    return { id: s.id, lemmas: [...s.lemmas], gloss: s.gloss };
  };
  const out: SenseAudit[] = [];
  for (const pos of ["n", "a"] as const) {
    const synsets = synsetsForLemma(ex, key).filter((s) => s.pos === pos);
    for (let si = 0; si < synsets.length; si++) {
      const start = synsets[si];
      const entry: SenseAudit = { pos, sense: si + 1, start: rec(start.index) };
      const queue: { index: number; hops: number; trail: number[]; excluded: boolean }[] = [
        { index: start.index, hops: 0, trail: [start.index], excluded: classStops.exclusionIds.has(start.id) },
      ];
      const seen = new Set<number>([start.index]);
      while (queue.length) {
        const cur = queue.shift()!;
        const synset = ex.synsets[cur.index];
        let hit: string | undefined;
        let via: "cue" | "exception" | "override" | "legacy" | "climb-anchor" = "legacy";
        const pin = pins.bySynset.get(cur.index);
        if (pin && pin.concept !== key) {
          hit = pin.concept;
          via = pin.via;
        }
        if (!hit) {
          const legacy = synset.lemmas
            .map((l) => l.toLowerCase())
            .find((l) => l !== key && (pins.unpinned.has(l) || pins.climbOnly.has(l)));
          if (legacy) {
            hit = legacy;
            via = pins.climbOnly.has(legacy) ? "climb-anchor" : "legacy";
          }
        }
        if (hit) {
          const anchor = anchorByConcept.get(hit)!;
          const confidence = Math.round(anchor.confidence * Math.pow(HOP_DECAY, cur.hops) * 10000) / 10000;
          entry.hit = {
            anchor: hit,
            element: anchor.element,
            confidence,
            hops: cur.hops,
            gated: confidence < CONFIDENCE_GATE,
            via,
            trail: cur.trail.map(rec),
          };
          break;
        }
        // Creature-class stop (Slice A): the audit shows the
        // same hit the real climb takes, exclusions included.
        if (!cur.excluded) {
          const stop = classStops.byIndex.get(cur.index);
          if (stop) {
            entry.hit = {
              anchor: stop.lemmas[0],
              element: CREATURE_CLASS_ELEMENTS[stop.creatureClass],
              confidence: CREATURE_CLASS_CAP,
              hops: cur.hops,
              gated: CREATURE_CLASS_CAP < CONFIDENCE_GATE,
              via: "class",
              viaClass: { creatureClass: stop.creatureClass, stopSynset: stop.synset },
              trail: cur.trail.map(rec),
            };
            break;
          }
        }
        // Stuff-class stop (Slice B): the audit shows the same
        // hit the real climb takes.
        {
          const stop = stuffStops.byIndex.get(cur.index);
          if (stop) {
            const price = STUFF_CLASS_PRICES[stop.stuffClass];
            entry.hit = {
              anchor: stop.lemmas[0],
              element: STUFF_CLASS_ELEMENTS[stop.stuffClass],
              confidence: price,
              hops: cur.hops,
              gated: price < CONFIDENCE_GATE,
              via: "class",
              viaClass: { stuffClass: stop.stuffClass, stopSynset: stop.synset },
              trail: cur.trail.map(rec),
            };
            break;
          }
        }
        if (cur.hops >= MAX_CLIMB_HOPS) continue;
        for (const next of up.get(cur.index) ?? []) {
          if (seen.has(next)) continue;
          seen.add(next);
          queue.push({
            index: next,
            hops: cur.hops + 1,
            trail: [...cur.trail, next],
            excluded: cur.excluded || classStops.exclusionIds.has(ex.synsets[next].id),
          });
        }
      }
      // Slice C: a hitless sense may still be recognised — the
      // audit is the decline diagnosis's window, so it shows the
      // recognition beside the absence of a hit.
      if (!entry.hit) {
        const walk = categoryWalk(ex, start.index);
        if (walk.length) {
          entry.recognition = {
            category: walk[0].stop.category,
            stopSynset: walk[0].stop.synset,
            hops: walk[0].hops,
            stops: walk.length,
          };
        }
      }
      out.push(entry);
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
