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
  /* Category filing (owner's ruling, 2026-11-18, the E1 data
   * pass): an emotion word is filed under its canonical category
   * and takes the category's Suwen element — anger → Wood, joy →
   * Fire, pensiveness/worry → Earth, grief/sadness → Metal, fear
   * → Water — because the category assignment is reliable; the
   * element follows the category, it is not fitted word by word.
   * A filing may carry a DEGREE qualifier, on Glasgow-register
   * arousal evidence (the register supplies degree evidence,
   * never the filing): furious is anger at high degree, gloomy
   * grief at low degree. A word whose category is not reliable
   * is NOT entered here at all — it registers without a fitting
   * (the LEDU's uncategorised register, ledu.ts) and waits on
   * the owner (GAPS §2). */
  cur("furious", "Wood", "emotion", "state", 0.9, "anger at full strength — high degree (Glasgow arousal 6.43, above anger's 5.64; degree evidence: the Glasgow register); the seed sentence lexicon already classes it Wood"),
  cur("angry", "Wood", "emotion", "state", 0.9, "anger at plain degree (Glasgow arousal 5.91, beside anger's 5.64); the seed sentence lexicon already classes it Wood"),
  cre("rage", "Wood", "emotion", "state", 0.85),
  cre("irritation", "Wood", "emotion", "state", 0.8),
  cre("nervous", "Wood", "emotion", "state", 0.7, "tension reads as Wood's rising, unvented"),
  cre("hope", "Wood", "emotion", "state", 0.7),
  cre("jealousy", "Wood", "emotion", "state", 0.65),
  cre("excitement", "Fire", "emotion", "state", 0.85),
  cre("happiness", "Fire", "emotion", "state", 0.85),
  cre("happy", "Fire", "emotion", "state", 0.85, "joy's everyday face, as happiness — category filing (joy → Fire)"),
  cre("glad", "Fire", "emotion", "state", 0.8, "joy's everyday face — category filing (joy → Fire)"),
  cre("excited", "Fire", "emotion", "state", 0.85, "the state of excitement — joy at high degree (Glasgow arousal 7.88; degree evidence: the Glasgow register)"),
  cre("pride", "Fire", "emotion", "state", 0.7),
  cre("shame", "Fire", "emotion", "state", 0.6, "the hot face of shame; contested — kept low"),
  cre("worry", "Earth", "emotion", "state", 0.9, "the everyday face of attested pensiveness"),
  cre("worried", "Earth", "emotion", "state", 0.9, "the state of worry, Earth"),
  cre("anxiety", "Earth", "emotion", "state", 0.8, "worry generalised"),
  cre("contentment", "Earth", "emotion", "state", 0.75),
  cre("relief", "Earth", "emotion", "state", 0.7),
  cre("boredom", "Earth", "emotion", "state", 0.65),
  cre("sadness", "Metal", "emotion", "state", 0.85, "grief's everyday face"),
  cre("sad", "Metal", "emotion", "state", 0.85, "grief's everyday face, as sadness — category filing (grief → Metal)"),
  cre("gloomy", "Metal", "emotion", "state", 0.7, "grief at low degree (Glasgow arousal 2.94, below sad's 3.94; degree evidence: the Glasgow register)"),
  cre("loneliness", "Metal", "emotion", "state", 0.7),
  cre("lonely", "Metal", "emotion", "state", 0.7, "grief's face, as loneliness — category filing (grief → Metal)"),
  cre("calm", "Water", "emotion", "state", 0.75, "stillness is Yin in the seed's quality table"),
  cre("dread", "Water", "emotion", "state", 0.8, "fear looking forward"),
  cre("afraid", "Water", "emotion", "state", 0.9, "the state of attested fear — category filing (fear → Water)"),
  cre("scared", "Water", "emotion", "state", 0.85, "fear's everyday state — category filing (fear → Water)"),

  /* ---- Emotions, the vocabulary pass (V1, 2026-11-19) ----
   * The sweep of the sealed conversation set and the
   * EmpatheticDialogues material (GAPS §2, the vocabulary
   * pass entry) found the feeling words no authority filed.
   * Each entry below is filed by one of the established
   * routes — the classification climb, the canonical face
   * (a category's state form or degree variant), the
   * category's own head entry — with its evidence in the
   * note. Words whose category assignment is not reliable
   * (disgusted, grateful, nostalgic, sentimental, surprised,
   * desperate, impressed, caring) are NOT entered here: they
   * stand as owner questions in GAPS §2, beside 'guilty'. */
  cre("disappointed", "Metal", "emotion", "state", 0.8, "grief at an unmet expectation — disappointment's feeling sense is 'a feeling of dissatisfaction that results when your expectations are not realized': dissatisfaction at the lost outcome is grief's family (category filing, grief → Metal). Degree unmarked (Glasgow arousal 3.82, beside sad's 3.94; degree evidence: the Glasgow register)"),
  cre("disappointment", "Metal", "emotion", "state", 0.8, "the feeling of dissatisfaction at an expectation not realized — grief's family (category filing, grief → Metal)"),
  cre("upset", "Earth", "emotion", "state", 0.85, "filed by the WordNet climb (the 'sorry' route): its state synset {disquieted, distressed, disturbed, upset, worried} IS the worried synset — the climb reaches the filed anchor 'worried' at hop 0 (Earth @0.9). The synset's gloss also names grief ('anxious uneasiness or trouble or grief'); that pole stands here, labelled — the filing is the climb's, not a harmonisation of the two"),
  cre("devastated", "Metal", "emotion", "state", 0.8, "grief at high degree — devastation's feeling sense is 'the feeling of being confounded or overwhelmed': grief overwhelmed, the register's high degree carried in the word's own sense (the Glasgow register carries no value for this word — recorded, not supplied)"),
  cre("proud", "Fire", "emotion", "state", 0.7, "the state of pride — its own gloss names pride ('feeling self-respect or pleasure in something by which you measure your self-worth'); category filing (pride → Fire), at pride's own confidence"),
  cre("annoyed", "Wood", "emotion", "state", 0.8, "anger at low degree — its synset gloss is 'aroused to impatience or anger': annoyance is irritation predicated, and irritation files under anger in the owner's attested table; the degree is the irritation family's, low"),
  cre("anxious", "Earth", "emotion", "state", 0.9, "the state of anxiety — category filing (worry → Earth), as 'worried' stands beside 'worry'"),
  cre("apprehension", "Water", "emotion", "state", 0.85, "fear at low degree — the owner's determination (2026-11-19, the attested fivefold table) files apprehension under fear as a family variant at low degree; entered here so the table carries the ruling beside the LEDU face and the register walk's filing layer (category filing, fear → Water)"),
  cre("apprehensive", "Water", "emotion", "state", 0.85, "the state of apprehension — fear at low degree (the owner's determination, 2026-11-19; category filing, fear → Water). Its synset mate 'worried' is no counter-evidence: the gloss ('mentally upset over possible misfortune or danger') is dread of a possible, fear's forward face — as 'dread' already files"),
  cre("ashamed", "Fire", "emotion", "state", 0.6, "the state of shame — category filing (shame → Fire); the category is contested and kept low, as its head entry records"),
  cre("embarrassed", "Fire", "emotion", "state", 0.6, "shame's state — its glosses name shame ('made to feel uncomfortable because of shame or wounded pride'; 'feeling... ashamed'); category filing (shame → Fire), contested and low with its category"),
  cre("terrified", "Water", "emotion", "state", 0.85, "fear at high degree — its gloss is 'thrown into a state of intense fear': the degree is in the word's own sense (the Glasgow register carries no value for this word — recorded, not supplied)"),
  cre("joyful", "Fire", "emotion", "state", 0.85, "joy's state form — category filing (joy → Fire)"),
  cre("hopeful", "Wood", "emotion", "state", 0.7, "the state of hope — category filing (hope → Wood), at hope's own confidence"),
  cre("optimistic", "Wood", "emotion", "state", 0.7, "hope's outlook form predicated as a state (the sealed set's own use: 'grateful and optimistic in one quick moment') — category filing (hope → Wood)"),
  cre("jealous", "Wood", "emotion", "state", 0.65, "the state of jealousy — category filing (jealousy → Wood), at jealousy's own confidence"),
  cre("content", "Earth", "emotion", "state", 0.75, "the adjective of contentment — satisfied; keyed to the emotion aspect, as the (concept, aspect) discipline keys 'cold' (the noun's content senses are not this entry); category filing (contentment → Earth)"),

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
 * CREATURE-CLASS STOPS — the class-level climb stop (Slice A of the
 * B-bucket anchor expansion, built 2026-11-18 under the owner's
 * rulings 1a–5a on the design in slice-a-design.md).
 *
 * A CLIMB_ANCHORS entry carries one concept and one element, but
 * "animal" has no single element: under the registered prediction
 * rule P2 CREATURE_CLASS_YUELING_V1 (docs/fork/repair-programme.md,
 * Part E/R2 — the five-creature scheme of the Liji, Yueling) the
 * element varies by creature class. So the WordNet climb needs a
 * stop at the level of the CLASS, not the concept: the taxonomy
 * delivers the creature to its kind, the kind is recognised as a
 * creature class, and the class carries the classification under
 * P2. WordNet's taxonomy assigns no element anywhere; the stops
 * below are climb infrastructure (like CLIMB_ANCHORS), NOT entries
 * in the classification table, and lookupClassification never
 * returns them.
 *
 * Membership is by the recognised kind — habitat and general form,
 * the tradition's own basis (Erya; Shuowen jiezi: the yu/chong
 * boundary is fluid and scalelessness never disqualified an animal
 * from yu — the catfish is a fish in the Chinese system). No stop
 * and no audit step feature-checks anatomy: the class placement is
 * a correlative assignment of the kind, not an inspection of the
 * specimen.
 *
 * A stop names a creature class, never an element. The class →
 * element mapping is P2, stated once, directly below.
 */
export type CreatureClass = "scaled" | "feathered" | "naked" | "furred" | "shelled";

/** P2 CREATURE_CLASS_YUELING_V1, as data: 鱗 scaled → Wood ·
 *  羽 feathered → Fire · 倮 naked → Earth · 毛 furred → Metal ·
 *  介 shelled → Water. */
export const CREATURE_CLASS_ELEMENTS: Record<CreatureClass, Element> = {
  scaled: "Wood",
  feathered: "Fire",
  naked: "Earth",
  furred: "Metal",
  shelled: "Water",
};

/** P2's pricing: outputs grade B-derived, confidence capped at
 *  0.80. A class candidate is priced once at the cap — membership
 *  in an audited subtree is binary, not a distance from an
 *  exemplar, so the climb's per-hop decay does not apply inside a
 *  stop's subtree (owner's ruling 2a, 2026-11-18; under decay,
 *  51 of the 82 measured tokens would fall below the join's gate). */
export const CREATURE_CLASS_CAP = 0.8;

/**
 * The stops: OEWN synset ids (stable offset ids), each the root of
 * a subtree claimed for one creature class. Every subtree was
 * dumped and eyeballed before this data was written (the audit
 * procedure of docs/fork/anchor-audit.md, extended by
 * classStopReport in wordnet-lex.ts; the slice report is
 * docs/fork/slice-a-report.md). Stops are id-keyed from birth —
 * there is no string-match route to a creature class.
 */
export const CREATURE_CLASS_STOPS: { synset: string; creatureClass: CreatureClass; note: string }[] = [
  { synset: "wn-n01528948", creatureClass: "feathered", note: "{bird} — P2's clear leg: birds → 羽. Subtree (872 synsets) eyeballed: the flightless birds (kiwi, penguin, ostrich) are feathered by kind; the bat is not a member of this subtree" },
  { synset: "wn-n01894065", creatureClass: "furred", note: "{mammal, mammalian} — P2's clear leg: furred mammals → 毛. Subtree (1,188 synsets) eyeballed; the human and cetacean subtrees inside it are carved out by CREATURE_CLASS_EXCLUSIONS below" },
  { synset: "wn-n02195555", creatureClass: "scaled", note: "{insect} — scaled by the project's recorded ruling (insects are scaled; classify by overall life form). Subtree (455) eyeballed: spiders, scorpions, centipedes and the silkworm are NOT members of this subtree — P2 names no leg for the first three, and the silkworm's absence is a taxonomy-shape gap, both recorded in the slice report" },
  { synset: "wn-n02552099", creatureClass: "scaled", note: "{fish} — P2's clear leg: fish → 鱗. Subtree (618) eyeballed: membership by kind, not anatomy — the catfish is a fish here, as in the Chinese system; jellyfish and starfish are not members of this subtree" },
  { synset: "wn-n01756277", creatureClass: "scaled", note: "{snake, serpent, ophidian} — P2's clear leg: snakes → 鱗. The reptile synset as a whole is deliberately NOT a stop: its subtree mixes the scaled and the shelled" },
  { synset: "wn-n01703062", creatureClass: "scaled", note: "{lizard} — the scaled reptile kind, beside the snake stop; same reason the reptile synset itself is not a stop" },
  { synset: "wn-n01691276", creatureClass: "shelled", note: "{turtle} — P2's clear leg: turtles → 介" },
  { synset: "wn-n02008542", creatureClass: "shelled", note: "{crustacean} — P2's clear leg: crabs → 介 (the crab's animal sense climbs here; its louse sense is an insect and climbs there — the senses are separate climbs)" },
  { synset: "wn-n01989596", creatureClass: "shelled", note: "{bivalve} — the shelled mollusk kinds (clam, mussel, oyster, scallop). Chosen with the gastropod stop over the mollusk synset itself, on the audit dump (owner's ruling 5a): the mollusk subtree (86) also holds the cephalopods, which no P2 leg names; bivalve (35) + gastropod (34) capture every measured shelled token without them. Chitons and scaphopods — shelled kinds outside both stops — stay unreached, recorded in the slice report" },
  { synset: "wn-n01975695", creatureClass: "shelled", note: "{gastropod} — the shelled snail kinds (snail, abalone, conch, whelk); see the bivalve stop's note for why the stops sit here and not at mollusk" },
];

/**
 * CREATURE_CLASS_EXCLUSIONS — subtrees carved out of a stop's
 * subtree, each with its grounds stated (the ANCHOR_SYNSET_EXCEPTIONS
 * discipline: data, owned here; the climb's rule has no per-lemma
 * cases). A climb whose path passes through an excluded synset does
 * not fire the stop above it.
 */
export const CREATURE_CLASS_EXCLUSIONS: { synset: string; reason: string }[] = [
  { synset: "wn-n02511603", reason: "{homo, man, human being, human} — inside the mammal stop's subtree, but the Yueling commentary's own placement puts the human in the naked class (人土屬，其類為倮): the naked class's type member cannot file as furred. (No naked-class stop is asserted by this slice; the human simply does not take the furred class.)" },
  { synset: "wn-n02097141", reason: "{cetacean, cetacean mammal, blower} — the whale kind is unsettled between the two systems: WordNet files it inside mammal, while the tradition's habitat-and-form reckoning stands it with the great fish. Not a clear member of the furred class; its assignment is a ruling for another day, not this stop's to make" },
];

/**
 * STUFF-CLASS STOPS — the class-level climb stop for stuffs (Slice B
 * of the B-bucket anchor expansion, built 2026-11-18 under the
 * sequence authorization; design: slice-b-design.md in the coverage
 * measurement folder, decisions 1a–4a as recommended there).
 *
 * The registered basis is the classification pilot's stuff-class
 * ruling R3 (docs/fork/wp1-pilot-results.md §6): a substance's
 * material axis is its stuff-class where a class exists —
 * stone-class minerals → Earth · C; a metal → Metal; water itself
 * → Water · A — and preparations, expressed juices, oils and
 * animal products have no class anchor and abstain. The pilot's
 * materials rows add the plant-origin calls (paper Wood · C,
 * charcoal Wood · C, lacquer Wood · C). H5 is not a climb rule
 * (it derives an artefact's element from per-object composition
 * records); H6 governs weather phenomena, not stuffs; H7's
 * outputs are already banked table entries. So the climb needs a
 * stop at the level of the stuff CLASS, as Slice A built for
 * creature classes: the taxonomy delivers the stuff to its class,
 * and the class carries the classification under R3.
 *
 * The stops below are climb infrastructure (like CLIMB_ANCHORS),
 * NOT entries in the classification table, and
 * lookupClassification never returns them. A stop names a stuff
 * class, never an element. The class → element mapping is R3,
 * stated once, directly below. Membership is by the recognised
 * kind: no stop and no audit step judges a specimen's composition
 * — the pilot's per-object composition calls (paper, charcoal)
 * are not taxonomy-readable and stay with the classification
 * programme.
 */
export type StuffClass = "stone" | "metal" | "wood" | "water" | "earth";

/** R3, as data: stone → Earth · metal → Metal · wood → Wood ·
 *  water → Water · earth → Earth. */
export const STUFF_CLASS_ELEMENTS: Record<StuffClass, Element> = {
  stone: "Earth",
  metal: "Metal",
  wood: "Wood",
  water: "Water",
  earth: "Earth",
};

/** R3's pricing for a climb candidate: one flat price per class,
 *  taken from the pilot's own specimen for that class (design
 *  decision 2a) — stone 0.60 (the granite row, "stone class by
 *  analogy"), metal 0.80 (iron filings, "the metal itself"),
 *  wood 0.60 (paper, "constitutively plant fibre"), earth 0.60
 *  (the stone-class analogy the pilot's clay-family calls ride),
 *  water 0.80 (the specimen is attested-grade 0.95; a climb
 *  candidate is capped at the derived tier's working ceiling so
 *  it never outranks the table's attested entries). Membership
 *  in an audited subtree is binary, not a distance from an
 *  exemplar, so the per-hop decay does not apply inside a stop's
 *  subtree — the Slice A 2a shape. Every price clears the join's
 *  0.6 gate, so every candidate these stops produce can join. */
export const STUFF_CLASS_PRICES: Record<StuffClass, number> = {
  stone: 0.6,
  metal: 0.8,
  wood: 0.6,
  water: 0.8,
  earth: 0.6,
};

/**
 * The stops: OEWN synset ids, each the root of a subtree claimed
 * for one stuff class. Every subtree was dumped and eyeballed
 * before this data was written (stuffStopReport in
 * wordnet-lex.ts; the dump is docs/fork/stuff-stop-dump.json; the
 * slice report is docs/fork/slice-b-report.md). Stops are
 * id-keyed from birth — there is no string-match route to a
 * stuff class. The generic heads (substance, material, matter)
 * and the functional groupings (food, fuel, mixture) are
 * deliberately NOT stops: R3 gives them no element.
 */
export const STUFF_CLASS_STOPS: { synset: string; stuffClass: StuffClass; note: string }[] = [
  { synset: "wn-n14945132", stuffClass: "stone", note: "{rock, stone} (subtree 79, eyeballed) — rock as MATERIAL ('material consisting of the aggregate of minerals'): the stone class's taxonomy head. Marble reaches it in one hop, granite via igneous rock. The other rock synset (wn-n09581945, a lump / natural object) is a different sense branch and is not a stop. Obsidian stands inside this subtree as an igneous rock — the pilot's glass-family abstention concerned manufactured glass and glaze, not a natural rock" },
  { synset: "wn-n14873092", stuffClass: "metal", note: "{metallic element, metal} (subtree 130, eyeballed) — the elements head of the metal class (iron, copper, silver, tin, zinc, lead climb here). R3: a metal → 金" },
  { synset: "wn-n14834351", stuffClass: "metal", note: "{alloy} (subtree 95, eyeballed) — the metal class's second head: steel climbs here, bronze via copper-base alloy. Alloys are metals as stuffs (design decision 3a). Its parent mixture is NOT a stop — mixture holds every blended substance in the language" },
  { synset: "wn-n15352510", stuffClass: "wood", note: "{wood} (subtree 136, eyeballed) — the substance ('the hard fibrous substance of a tree'), not the tree: oak's and teak's wood senses pass through it while their tree senses climb the organism branch, so R1 (living plants are not materials) is preserved by per-sense climbing. The stop is this synset itself, not its parent plant material, which holds fibres and extracts the pilot judged per-object" },
  { synset: "wn-n08085056", stuffClass: "water", note: "{water, H2O} (subtree 13, eyeballed) — the liquid stuff sense ('the part of the earth's surface covered with water' body sense and the H2O-compound sense are separate branches). R3: water itself → Water, the phase's namesake substance. Its hyponyms (fresh water, salt water) climb into it. Snow and ice do not reach it — the H6 phase-null question stays open and untouched by this slice" },
  { synset: "wn-n15092552", stuffClass: "earth", note: "{earth, ground} (subtree 57, eyeballed) — soil and ground as material: clay, kaolin, loess, sand, mould climb here. Included under design decision 1a: R3's stone class by the pilot's own analogy — kaolin already denotes an Earth record in the table (白石脂), and every clay-family call the pilot made landed Earth" },
];

/**
 * CATEGORY STOPS — recognition without classification (Slice C of
 * the B-bucket anchor expansion, built 2026-11-18 under the
 * owner's pre-rulings 1a–4a, recorded in
 * slice-c-pre-rulings.md). When a sense's climb finds no anchor
 * and no class stop, it can still end in RECOGNITION: the system
 * knows what kind of thing the word names, without any element
 * being claimed. A recognition is a formal climb outcome beside
 * classified and nothing (ruling 1a): it carries a category, a
 * path and hops — no element, no aspect, no classification
 * confidence — and it never enters sense arbitration as a
 * candidate.
 *
 * The stops are FUNCTION categories only (ruling 3a): what a
 * thing is for. Each is keyed by synset id and its subtree was
 * dumped and eyeballed before this data was written
 * (categoryStopReport in wordnet-lex.ts; the dump is
 * docs/fork/category-stop-dump.json; the slice report is
 * docs/fork/slice-c-report.md). The list was certified from
 * Slice B's audit dumps and the post-B coverage re-measurement,
 * as the sequence authorization directs. Deliberately NOT stops:
 * the scaffolding ancestors (entity, abstraction, physical
 * entity, object, artifact — a stop there would recognise
 * everything and mean nothing); instrumentality (artifact in
 * function dress; its concrete child, device, is the fallback
 * stop instead); structure (a formal category, not a function);
 * the organism kinds (animal, plant, vertebrate — kinds, not
 * functions); the abstracta (communication, cognition, act);
 * food's parent nutrient (the category word is not one a reply
 * could say; its solid members take the food stop).
 *
 * Classification always takes precedence (ruling 3a): a
 * recognition is computed only for a sense the climb did not
 * classify. Every stop on a sense's climb path is recorded, the
 * nearest marked primary (ruling 4a).
 */
export const CATEGORY_STOPS: { synset: string; category: string; note: string }[] = [
  { synset: "wn-n03233730", category: "device", note: "{device} — 'an instrumentality invented for a particular purpose': the fallback function stop for the gadget tail (abacus, compass, brake, filter) that passes no narrower stop. Subtree 3,048 — audited by its mid-level composition: every direct child is itself a device category (acoustic device, alarm, applicator, conductor, detector, electrical device, electronic device, …)" },
  { synset: "wn-n03618977", category: "implement", note: "{implement} — 'instrumentation used to effect an end'. Subtree 787, eyeballed" },
  { synset: "wn-n04517575", category: "tool", note: "{tool} — 'an implement used in the practice of a vocation', under implement; the pre-rulings' own example category ('it's a kind of tool'). Subtree 379, eyeballed" },
  { synset: "wn-n04583119", category: "utensil", note: "{utensil} — household implements. Subtree 99, eyeballed: the ware words inside it (china, porcelain, earthenware) are the vessel senses, members by kind" },
  { synset: "wn-n02774695", category: "appliance", note: "{appliance} — durable goods for home or office use. Subtree 74, eyeballed" },
  { synset: "wn-n03346401", category: "equipment", note: "{equipment} — 'an instrumentality needed for an undertaking or to perform a service'. Subtree 527, eyeballed: the loosest subtree on this list (sports gear, apparatus, game pieces) — every member is equipment by the taxonomy's filing, and the report records the looseness" },
  { synset: "wn-n03144303", category: "container", note: "{container} — 'any object that can be used to hold things'. Subtree 527, eyeballed" },
  { synset: "wn-n04590833", category: "vehicle", note: "{vehicle} — 'a conveyance that transports people or objects'. Subtree 548, eyeballed: missiles stand inside it as self-propelled conveyances and also under weapon; both stops record on those chains" },
  { synset: "wn-n04597104", category: "vessel", note: "{vessel, watercraft} — 'a craft designed for water transportation'. Subtree 197, eyeballed (named ships are instance members)" },
  { synset: "wn-n03100370", category: "clothing", note: "{clothing, article of clothing, vesture, wear, wearable, habiliment} — 'a covering designed to be worn on a person's body'. Subtree 585, eyeballed" },
  { synset: "wn-n03472662", category: "garment", note: "{garment} — 'an article of clothing', under clothing. Subtree 281, eyeballed (a few process nouns — ironing, laundry — are filed inside it; recorded in the report)" },
  { synset: "wn-n04632532", category: "weapon", note: "{weapon, arm, weapon system} — 'any instrument or instrumentality used in fighting or hunting'. Subtree 207, eyeballed: the chemical and biological agents inside it are weapons by use, which is the recognition principle" },
  { synset: "wn-n03459313", category: "furniture", note: "{furniture, piece of furniture, article of furniture} — 'furnishings that make a room ready for occupancy'. Subtree 206, eyeballed" },
  { synset: "wn-n07701837", category: "food", note: "{food, solid food} — 'any solid substance used as a source of nourishment'. Subtree 2,571, sampled at head, middle and tail: foods, dishes, drinks' solids and ingredients throughout. Recognition is not classification — R3's abstention on preparations is untouched; this stop claims a kind, never an element" },
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
