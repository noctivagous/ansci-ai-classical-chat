/**
 * classify.ts — the fork's curated classification table (Slice B).
 *
 * Each entry classifies a (concept, aspect) pair to an element of the
 * ontology net, with a confidence and a provenance tag. Two layers are
 * kept distinct, per the fork's standing rule that attested tradition,
 * creative extension and analysis never blur:
 *
 *  - "fork-curated": the entry restates an attested correspondence —
 *    one the seed graph's attested tables already carry (src/seed.ts:
 *    the per-element correspondence rows for
 *    sound/color/taste/direction/emotion/organ, the season and
 *    time-of-day ELEMENT_OF edges, the trigram elements), or one a
 *    project survey has since verified in a named classical source
 *    (so far: the five planets, Suwen ch. 4 + Huainanzi Tianwen —
 *    see the planet rows).
 *  - "fork-creative": Kavi's extension by analogy from those tables.
 *    Same machinery, lower trust, always labelled.
 *
 * Classification is keyed by (concept, aspect): 'cold' the temperature
 * and 'cold' the illness are different entries with different elements —
 * the X1 wrong-address brake from the cycle-probe evaluation. A head
 * cold must never derive winter conclusions.
 */
import type { AspectKey } from "../graph";
import type { Element } from "./sentence";

export type Provenance = "fork-curated" | "fork-creative";

export interface ClassificationEntry {
  concept: string;
  /** Free-text sense label ("overall", "temperature", "illness", "emotion", …). */
  aspect: string;
  /** The engine's closed aspect key glossing `aspect`. */
  aspectKey: AspectKey;
  element: Element;
  confidence: number;
  provenance: Provenance;
  note?: string;
}

const cur = (
  concept: string, element: Element, aspect = "overall", aspectKey: AspectKey = "overall",
  confidence = 0.95, note?: string,
): ClassificationEntry => ({ concept, aspect, aspectKey, element, confidence, provenance: "fork-curated", note });
const cre = (
  concept: string, element: Element, aspect = "overall", aspectKey: AspectKey = "overall",
  confidence = 0.75, note?: string,
): ClassificationEntry => ({ concept, aspect, aspectKey, element, confidence, provenance: "fork-creative", note });

export const CLASSIFICATIONS: ClassificationEntry[] = [
  /* ---- Attested correspondence rows, restated (fork-curated) ---- */
  // Directions: east/Wood, south/Fire, centre/Earth, west/Metal, north/Water.
  cur("east", "Wood", "direction"), cur("south", "Fire", "direction"), cur("centre", "Earth", "direction"),
  cur("west", "Metal", "direction"), cur("north", "Water", "direction"),
  // Colors: green, red, yellow, white, black.
  cur("green", "Wood", "color"), cur("red", "Fire", "color"), cur("yellow", "Earth", "color"),
  cur("white", "Metal", "color"), cur("black", "Water", "color"),
  // Tastes: sour, bitter, sweet, pungent, salty.
  cur("sour", "Wood", "taste"), cur("bitter", "Fire", "taste"), cur("sweet", "Earth", "taste"),
  cur("pungent", "Metal", "taste"), cur("salty", "Water", "taste"),
  // Organs: liver, heart, spleen, lungs, kidneys.
  cur("liver", "Wood", "organ"), cur("heart", "Fire", "organ"), cur("spleen", "Earth", "organ"),
  cur("lungs", "Metal", "organ"), cur("kidneys", "Water", "organ"),
  // Seasons (seed ELEMENT_OF edges; Earth has no season in the four-season scheme).
  cur("spring", "Wood", "season", "temporal"), cur("summer", "Fire", "season", "temporal"),
  cur("autumn", "Metal", "season", "temporal"), cur("winter", "Water", "season", "temporal"),
  // Times of day (seed ELEMENT_OF edges).
  cur("dawn", "Wood", "time", "temporal"), cur("midday", "Fire", "time", "temporal"),
  cur("dusk", "Metal", "time", "temporal"), cur("night", "Water", "time", "temporal"),
  // Trigram correspondences carried in the seed.
  cur("thunder", "Wood", "trigram"), cur("wind", "Wood", "trigram"),
  cur("mountain", "Earth", "trigram"), cur("lake", "Metal", "trigram"),
  // The five attested emotions.
  cur("anger", "Wood", "emotion", "state"), cur("joy", "Fire", "emotion", "state"),
  cur("pensiveness", "Earth", "emotion", "state"), cur("grief", "Metal", "emotion", "state"),
  cur("fear", "Water", "emotion", "state"),
  // Weather/season anchors the seed's own derivations use.
  cur("cold", "Water", "temperature", "temperature", 0.95, "the temperature sense: winter's quality, derived in the seed by the shared Yin prior"),
  // H6 re-scope (2026-11-15): the whole-phenomenon weather entries that
  // stood here (rain/snow/sleet/hail, all Water under "weather") are
  // WITHDRAWN. Under WEATHER_ASPECT_DERIVATION_V1 a phenomenon is
  // classified only through a documented, defining physical aspect.
  // Rain's re-scoped provisional entry lives in the Weather & world
  // section (aspect "precipitation"); sleet, snow and hail are
  // phase-null — frozen or mixed precipitation, no documented aspect
  // route, named in H6 as deliberate non-assignments. The table asserts
  // nothing for them now. (Same-shape entries elsewhere in the table —
  // frost, ice, fog, storm — were noticed during this pass and are
  // recorded in the H6 registry note; they are outside this slice.)
  cur("salt", "Water", "food", "overall", 0.9, "by the attested salty taste of Water"),
  cur("sleep", "Water", "state", "state", 0.9, "night is Water in the seed's time-of-day table"),

  /* ---- Emotions & states, extended (fork-creative unless noted) ---- */
  cur("furious", "Wood", "emotion", "state", 0.9, "anger at full strength; the seed sentence lexicon already classes it Wood"),
  cre("rage", "Wood", "emotion", "state", 0.85),
  cre("irritation", "Wood", "emotion", "state", 0.8),
  cre("nervous", "Wood", "emotion", "state", 0.7, "tension reads as Wood's rising, unvented"),
  cre("hope", "Wood", "emotion", "state", 0.7),
  cre("jealousy", "Wood", "emotion", "state", 0.65),
  cre("excitement", "Fire", "emotion", "state", 0.85),
  cre("happiness", "Fire", "emotion", "state", 0.85),
  cre("pride", "Fire", "emotion", "state", 0.7),
  cre("shame", "Fire", "emotion", "state", 0.6, "the hot face of shame; contested — kept low"),
  cre("worry", "Earth", "emotion", "state", 0.9, "the everyday face of attested pensiveness"),
  cre("worried", "Earth", "emotion", "state", 0.9, "the state of worry, Earth"),
  cre("anxiety", "Earth", "emotion", "state", 0.8, "worry generalised"),
  cre("contentment", "Earth", "emotion", "state", 0.75),
  cre("relief", "Earth", "emotion", "state", 0.7),
  cre("boredom", "Earth", "emotion", "state", 0.65),
  cre("sadness", "Metal", "emotion", "state", 0.85, "grief's everyday face"),
  cre("loneliness", "Metal", "emotion", "state", 0.7),
  cre("calm", "Water", "emotion", "state", 0.75, "stillness is Yin in the seed's quality table"),
  cre("dread", "Water", "emotion", "state", 0.8, "fear looking forward"),

  /* ---- Body & everyday states (fork-creative) ---- */
  cre("tired", "Earth", "state", "state", 0.8, "the spleen's load in TCM idiom"),
  cre("fatigue", "Earth", "state", "state", 0.8),
  cre("hungry", "Earth", "state", "state", 0.8),
  cre("appetite", "Earth", "state", "state", 0.75),
  cre("digestion", "Earth", "state", "state", 0.8),
  cre("awake", "Fire", "state", "state", 0.7),
  cre("fever", "Fire", "state", "state", 0.8),
  cre("heartbeat", "Fire", "state", "state", 0.7),
  cre("pain", "Wood", "state", "state", 0.65, "pain as stagnation — a TCM idiom, held at modest confidence"),
  cre("tense", "Wood", "state", "state", 0.7),
  cre("restless", "Wood", "state", "state", 0.7),
  cre("breath", "Metal", "state", "state", 0.8, "the lungs' charge"),
  cre("cough", "Metal", "state", "state", 0.8),
  cre("headache", "Metal", "state", "state", 0.55, "weakly held: headaches have many houses"),
  cre("dizzy", "Metal", "state", "state", 0.55),
  cre("chills", "Water", "state", "state", 0.75),
  cre("sweat", "Water", "state", "state", 0.65),
  cre("thirsty", "Water", "state", "state", 0.7),
  cre("dream", "Water", "state", "state", 0.45, "deliberately below the join's confidence gate — the gate's test case"),

  /* ---- Body parts (fork-creative; TCM governance idioms) ---- */
  cre("eyes", "Wood", "body", "overall", 0.7, "the liver opens into the eyes"),
  cre("tendons", "Wood", "body", "overall", 0.7),
  cre("tongue", "Fire", "body", "overall", 0.7, "the heart opens into the tongue"),
  cre("blood", "Fire", "body", "overall", 0.7),
  cre("face", "Fire", "body", "overall", 0.6),
  cre("muscles", "Earth", "body", "overall", 0.7, "the spleen governs the muscles"),
  cre("mouth", "Earth", "body", "overall", 0.7),
  cre("stomach", "Earth", "body", "overall", 0.8, "the spleen's paired organ"),
  cre("skin", "Metal", "body", "overall", 0.7, "the lungs govern the skin"),
  cre("nose", "Metal", "body", "overall", 0.7),
  cre("hands", "Metal", "body", "overall", 0.55),
  cre("head", "Metal", "body", "overall", 0.5, "weakly held"),
  cre("bones", "Water", "body", "overall", 0.75, "the kidneys govern the bones"),
  cre("ears", "Water", "body", "overall", 0.7, "the kidneys open into the ears"),
  cre("hair", "Water", "body", "overall", 0.65),
  cre("feet", "Water", "body", "overall", 0.6),
  cre("back", "Water", "body", "overall", 0.6),
  cre("teeth", "Water", "body", "overall", 0.65, "teeth as surplus of bone"),
  cre("brain", "Water", "body", "overall", 0.6, "the sea of marrow, kidney-charged"),

  /* ---- Weather & world (mixed) ---- */
  cre("hot", "Fire", "temperature", "temperature", 0.85, "heat is summer's quality"),
  cre("warm", "Fire", "temperature", "temperature", 0.8),
  cre("cool", "Water", "temperature", "temperature", 0.8, "a seed synonym of cold"),
  cre("ice", "Water", "substance", "overall", 0.75, "H6 follow-on re-scope: ice as a SUBSTANCE (frozen water, the stuff itself, cf. the rainwater distinction) — no phenomenon reading is asserted"),
  // H6 follow-on (2026-11-15): frost and fog are WITHDRAWN to
  // phase-null. Frost is named phase-null in H6's own provisional
  // table (surface ice deposition; no aspect rule distinguishes
  // cold, freezing and deposition). Fog's candidacy runs through
  // moisture, whose Earth correspondence H6 explicitly refuses to
  // automate — a candidacy is recorded in the registry, not asserted
  // here. (Their climb-anchor roles, if any surface, are handled
  // through CLIMB_ANCHORS like snow's, never by re-asserting.)
  cre("precipitation", "Water", "weather", "overall", 0.85, "the IS_A parent the seed's winter derivations climb through"),
  cre("rain", "Water", "precipitation", "overall", 0.71, "H6-derived, provisional: defining aspect = liquid aqueous precipitation; C = 0.95 × 0.75, one derivation step under WEATHER_ASPECT_DERIVATION_V1; the moisture/effect route (rain → dampness → Earth) is a deliberate non-assignment under H6"),
  cre("storm", "Wood", "air movement", "overall", 0.71, "H6 follow-on re-scope: storm through its defining wind aspect only (wind–Wood is attested); its precipitation aspect is NOT asserted; C = 0.95 × 0.75, one derivation step under H6"),
  cre("breeze", "Wood", "weather", "overall", 0.75),
  cre("lightning", "Fire", "weather", "overall", 0.7),
  cre("heat", "Fire", "weather", "overall", 0.85),
  cre("sunshine", "Fire", "weather", "overall", 0.8),
  cre("dry", "Metal", "weather", "overall", 0.75, "autumn's dryness"),
  cre("drought", "Metal", "weather", "overall", 0.7),
  cre("flood", "Water", "weather", "overall", 0.85),
  cre("river", "Water", "place", "overall", 0.8),
  cre("sea", "Water", "place", "overall", 0.85),
  cre("forest", "Wood", "place", "overall", 0.85),
  cre("garden", "Earth", "place", "overall", 0.7),
  cre("sun", "Fire", "sky", "overall", 0.8),
  cre("moon", "Water", "sky", "overall", 0.8),
  // The five planets — upgraded from fork-creative to attested
  // (2026-11-15, at the user's word). The project first carried
  // these as its own addition by analogy; the WP1 survey then
  // found them stated in Suwen ch. 4, and WP1c found the
  // identical assignments in Huainanzi, Tianwen (139 BCE):
  // 歲星 Wood, 熒惑 Fire, 鎮星 Earth, 太白 Metal, 辰星 Water.
  // The heuristic landed where two early texts land — recorded
  // in the programme as a convergence: the system is logical,
  // and a heuristic can be developed to accord with it.
  cur("jupiter", "Wood", "planet", "overall", 0.9, "attested: Suwen ch. 4 and Huainanzi Tianwen — 歲星/Wood"),
  cur("mars", "Fire", "planet", "overall", 0.9, "attested: Suwen ch. 4 and Huainanzi Tianwen — 熒惑/Fire"),
  cur("saturn", "Earth", "planet", "overall", 0.9, "attested: Suwen ch. 4 and Huainanzi Tianwen — 鎮星/Earth"),
  cur("venus", "Metal", "planet", "overall", 0.9, "attested: Suwen ch. 4 and Huainanzi Tianwen — 太白/Metal"),
  cur("mercury", "Water", "planet", "overall", 0.9, "attested: Suwen ch. 4 and Huainanzi Tianwen — 辰星/Water"),

  /* ---- Five livestock & five grains (fork-curated, survey-verified) ----
   * Suwen ch. 4's five-direction table carries an animal row and a
   * grain row alongside the planets upgraded above (WP1 survey
   * §1.4). The pilot's grade-A livestock row (wp1-pilot-results §5)
   * rests on the same scheme. Entered 2026-11-15 in the anchor-
   * quality slice, on the planets precedent: survey-verified
   * attestation enters as fork-curated. Two citation wrinkles are
   * recorded, not flattened: ch. 4's own animal row names the HORSE
   * at Metal — the dog's Metal attestation is the Huainanzi Shize
   * autumn food pairing (麻與犬, WP1c §Shize) together with the
   * pilot's livestock row, which cites ch. 4 loosely; both animals
   * stand, source-scoped. And the centre grain 稷 and the south
   * grain 黍 are both "millet" in English — one English lemma
   * cannot carry two elements, so only the 黍 row is entered. */
  cur("chicken", "Wood", "animal", "overall", 0.9, "attested: Suwen ch. 4 five-animal row — 鷄, the East's animal (Wood). Supersedes the creative food entry below as this concept's primary; the surveyed sources place chicken at Wood"),
  cur("goat", "Fire", "animal", "overall", 0.9, "attested: Suwen ch. 4 — 羊, the South's animal (Fire)"),
  cur("sheep", "Fire", "animal", "overall", 0.9, "attested: Suwen ch. 4 — 羊 (yáng) covers sheep and goat alike; the South's animal (Fire)"),
  cur("cattle", "Earth", "animal", "overall", 0.9, "attested: Suwen ch. 4 — 牛, the Centre's animal (Earth)"),
  cur("horse", "Metal", "animal", "overall", 0.9, "attested: Suwen ch. 4 — 馬, the West's animal (Metal)"),
  cur("dog", "Metal", "animal", "overall", 0.9, "attested at Metal: Huainanzi Shize autumn pairing 麻與犬 (hemp & dog), and the pilot's grade-A five-livestock row; Suwen ch. 4's own animal row names the horse at Metal instead — both stand, source-scoped"),
  cur("pig", "Water", "animal", "overall", 0.9, "attested: Suwen ch. 4 — 彘, the North's animal (Water)"),
  cur("wheat", "Wood", "grain", "overall", 0.9, "attested: Suwen ch. 4 five-grain row — 麥, the East's grain (Wood)"),
  cur("millet", "Fire", "grain", "overall", 0.9, "attested: Suwen ch. 4 — 黍, the South's grain (Fire). The Centre's 稷 is also a millet in English; the shared lemma carries the 黍 row only, recorded not merged"),
  cur("rice", "Metal", "grain", "overall", 0.9, "attested: Suwen ch. 4 — 稻, the West's grain (Metal). The creative food entry below (Earth, grain food by analogy) remains as the (concept, aspect)-distinct food entry"),
  cur("bean", "Water", "grain", "overall", 0.9, "attested: Suwen ch. 4 — 豆, the North's grain (Water)"),

  /* ---- Food & cooking (fork-creative; tastes follow the attested rows) ---- */
  cre("soup", "Water", "food", "overall", 0.8, "a liquid food"),
  cre("broth", "Water", "food", "overall", 0.8),
  cre("tea", "Water", "food", "overall", 0.7),
  cre("fish", "Water", "food", "overall", 0.65),
  cre("sugar", "Earth", "food", "overall", 0.8, "by the attested sweet taste of Earth"),
  cre("honey", "Earth", "food", "overall", 0.8),
  cre("banana", "Earth", "food", "overall", 0.75, "sweet and soft"),
  cre("bread", "Earth", "food", "overall", 0.8, "grain food"),
  cre("rice", "Earth", "food", "overall", 0.85, "grain food — the attested grain-row entry (Metal, Suwen ch. 4) is this concept's primary; this food entry stands as the (concept, aspect) pair"),
  cre("cake", "Earth", "food", "overall", 0.75),
  cre("noodles", "Earth", "food", "overall", 0.8),
  cre("egg", "Earth", "food", "overall", 0.7),
  cre("milk", "Earth", "food", "overall", 0.7),
  cre("cheese", "Earth", "food", "overall", 0.65),
  cre("flour", "Earth", "food", "overall", 0.8),
  cre("tofu", "Earth", "food", "overall", 0.7),
  cre("peach", "Earth", "food", "overall", 0.7),
  cre("chicken", "Earth", "food", "overall", 0.6, "the meat as food; the animal itself is attested Wood (Suwen ch. 4) and that entry is this concept's primary"),
  cre("beef", "Earth", "food", "overall", 0.65),
  cre("stew", "Earth", "food", "overall", 0.7),
  cre("onion", "Metal", "food", "overall", 0.75, "pungent"),
  cre("garlic", "Metal", "food", "overall", 0.75, "pungent"),
  cre("ginger", "Metal", "food", "overall", 0.75, "pungent"),
  cre("pepper", "Metal", "food", "overall", 0.8, "pungent heat's carrier"),
  cre("pear", "Metal", "food", "overall", 0.6),
  cre("vinegar", "Wood", "food", "overall", 0.8, "sour"),
  cre("lemon", "Wood", "food", "overall", 0.8, "sour"),
  cre("apple", "Wood", "food", "overall", 0.6, "sour-sweet; sour leads"),
  cre("oil", "Earth", "food", "overall", 0.6),

  /* ---- The X1 brake: the illness sense of 'cold' is a different entry ---- */
  cre("cold", "Metal", "illness", "state", 0.7,
    "the respiratory illness sense — the lungs' trouble, NOT the temperature. Keyed by (concept, aspect) so it can never derive winter/temperature conclusions (cycle-probe X1)."),
];

/**
 * Net relations between classified concepts, so the existing propagation
 * pass has structure to travel: IS_A inheritance (children inherit the
 * parent's leanings at decay) and ASSOCIATED_WITH leanings.
 */
/**
 * CLIMB_ANCHORS — anchor-only records for the WordNet hypernym climb.
 * These are NOT classifications: lookupClassification never returns
 * them and the join derives nothing from them. They exist because an
 * assertion and an anchor are different jobs. The seed graph carries
 * snow as a curated Water exemplar (its winter derivations climb
 * through it); when the H6 re-scope withdrew the table's snow
 * assertion, the climb silently lost the anchor other words' senses
 * terminate at (blow's snow sense lost its Water candidate entirely).
 * The anchor is restored here, explicitly labelled, so the table can
 * stay phase-null while the climb keeps its infrastructure.
 */
export const CLIMB_ANCHORS: ClassificationEntry[] = [
  { concept: "snow", aspect: "weather", aspectKey: "overall", element: "Water", confidence: 0.9, provenance: "fork-curated", note: "anchor only, NOT a classification (H6 phase-null stands for the table): the seed graph's curated Water exemplar for the precipitation family" },
];

/**
 * ANCHOR_SYNSET_OVERRIDES — explicit synset pins for anchors whose
 * classified sense no gloss-cue domain can select (anchor-quality
 * repair, 2026-11-15; the rule and its grounds are in
 * docs/fork/anchor-audit.md). The four trigram anchors are the case:
 * their aspect names a correspondence row, not a sense domain, so
 * the mechanical cue test has nothing to score. Each override lists
 * the OEWN synset ids (stable offset ids) that carry the classified
 * sense — data, stated here, falsifiable against the extract.
 * Note thunder's heroin-slang synset (wn-n02883610) is deliberately
 * NOT listed: under string matching it fired Wood on drug paths.
 */
export const ANCHOR_SYNSET_OVERRIDES: Record<string, string[]> = {
  wind: ["wn-n11748694"], // {wind, air current, current of air} — air moving…
  thunder: ["wn-n07520497", "wn-n07540248"], // the noise; the crashing noise from expanding air
  mountain: ["wn-n09525229"], // {mountain, mount} — a land mass that projects…
  lake: ["wn-n09494190"], // {lake} — a body of (usually fresh) water surrounded by land
};

/**
 * ANCHOR_SYNSET_EXCEPTIONS — (anchor, synset) pairs re-admitted to
 * an anchor's pin set although the synset does not carry the
 * anchor's classified sense. Policy (anchor-audit.md): an exception
 * exists ONLY to preserve the premise of a frozen evaluation item
 * or pinned unit test that was authored against the candidate the
 * string-matching climb produced through that synset. Each entry
 * names the item it preserves; deleting an entry is the documented
 * way to force that item's re-authoring. These are data, owned
 * here — the climb's rule itself has no per-lemma cases.
 */
export const ANCHOR_SYNSET_EXCEPTIONS: { concept: string; synset: string; reason: string }[] = [
  { concept: "heat", synset: "wn-n04695764", reason: "{heat, warmth, passion} 'the trait of being intensely emotional' — preserves sense set A items 6–7 and the fork-sense unit test, whose passion baseline (Fire) is this candidate; heat's classified aspect is weather, so the trait synset is not its sense" },
  { concept: "rage", synset: "wn-n14282795", reason: "{rage, passion} 'something that is desired intensely' (the craze sense, not anger) — preserves sense set A items 6–7 and the passion-overturn unit test, whose Wood rival is this candidate" },
  { concept: "bread", synset: "wn-n13616658", reason: "the money-slang synset {boodle, bread, cabbage, …, lettuce, …} — preserves sense set A item 10, whose named foil is lettuce's Earth baseline through this synset ('the bread baseline')" },
  { concept: "sleep", synset: "wn-n14205477", reason: "{rest, eternal rest, sleep, eternal sleep, quietus} 'euphemisms for death' — preserves sense set A items 3–4 and the fork-sense brake unit test ('She found rest.'): rest has no other route to sleep, and the items test the brake against this baseline" },
  { concept: "spring", synset: "wn-n09609392", reason: "{spring, fountain, outflow, outpouring, natural spring} 'a natural flow of ground water' — preserves sense set A item 11: outpouring's Wood baseline is this synset meeting the SEASON anchor; the water-source sense is not the season sense" },
  { concept: "salt", synset: "wn-n15263882", reason: "{salt} 'a compound formed by replacing hydrogen in an acid…' (the chemical sense) — preserves sense set B's alabaster item, a supported-baseline control whose live rival is alabaster's climb through gypsum and calcium sulphate to this synset" },
  { concept: "green", synset: "wn-n07856613", reason: "{greens, green, leafy vegetable} — preserves sense set A item 10 (lettuce's Wood candidate); the justification is wider than the item: Wood's attested green correspondence covers growing vegetation in the seed tables, not colour alone" },
];

export const CONCEPT_LINKS: { from: string; to: string; type: "IS_A" | "ASSOCIATED_WITH" }[] = [
  { from: "sleet", to: "precipitation", type: "IS_A" },
  { from: "snow", to: "precipitation", type: "IS_A" },
  { from: "hail", to: "precipitation", type: "IS_A" },
  { from: "rain", to: "precipitation", type: "IS_A" },
  { from: "frost", to: "ice", type: "ASSOCIATED_WITH" },
  { from: "furious", to: "anger", type: "ASSOCIATED_WITH" },
  { from: "rage", to: "anger", type: "ASSOCIATED_WITH" },
  { from: "worried", to: "worry", type: "ASSOCIATED_WITH" },
  { from: "anxiety", to: "worry", type: "ASSOCIATED_WITH" },
  { from: "sadness", to: "grief", type: "ASSOCIATED_WITH" },
  { from: "dread", to: "fear", type: "ASSOCIATED_WITH" },
  { from: "broth", to: "soup", type: "ASSOCIATED_WITH" },
  { from: "breeze", to: "wind", type: "ASSOCIATED_WITH" },
  { from: "storm", to: "wind", type: "ASSOCIATED_WITH" },
];

/** Look up the classification of a concept, optionally in one aspect
 *  (matched against the free aspect label or the aspect key). Without an
 *  aspect, the concept's primary entry (its first listed) is returned. */
export function lookupClassification(concept: string, aspect?: string): ClassificationEntry | undefined {
  const c = concept.toLowerCase();
  const entries = CLASSIFICATIONS.filter((e) => e.concept === c);
  if (!entries.length) return undefined;
  if (!aspect) return entries[0];
  return entries.find((e) => e.aspect === aspect || e.aspectKey === aspect) ?? entries[0];
}

/** All classifications of one concept, across aspects. */
export function classificationsOf(concept: string): ClassificationEntry[] {
  const c = concept.toLowerCase();
  return CLASSIFICATIONS.filter((e) => e.concept === c);
}
