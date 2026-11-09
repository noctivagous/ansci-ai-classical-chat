/**
 * seed.ts — the seeded AnSci graph, as a plain JSON-serializable structure.
 *
 * Design rule that makes the user's thesis demonstrable:
 *   qualities (cold, warm, dark, bright…) attach to POLARITIES (and a few
 *   to elements' polarity), concepts/seasons/times attach to elements and
 *   polarities — and there is deliberately NO direct winter→cold edge.
 *   "Winter is cold" must be *derived* by joining on the shared prior:
 *   winter —ELEMENT_OF→ Water —POLARITY_OF→ Yin —HAS_QUALITY→ cold.
 *   An LLM learns cold~winter statistically; AnSci derives it.
 */
import { Graph, GraphData, GraphEdge, GraphNode, slugify } from "./graph";

const nodes: GraphNode[] = [];
const edges: Omit<GraphEdge, "id">[] = [];

function n(node: Omit<GraphNode, "properties"> & { properties?: Record<string, unknown> }): string {
  nodes.push({ properties: {}, ...node });
  return node.id;
}
function e(from: string, type: GraphEdge["type"], to: string, extra?: Partial<GraphEdge>): void {
  edges.push({ from, to, type, ...extra });
}
const id = (name: string) => slugify(name);

/* ---------------- ATOMIC: polarities ---------------- */
const yin = n({ id: "yin", name: "Yin", type: "Polarity", layer: "atomic" });
const yang = n({ id: "yang", name: "Yang", type: "Polarity", layer: "atomic" });
e(yin, "CONTAINS_SEED", yang);
e(yang, "CONTAINS_SEED", yin);

/* ---------------- ATOMIC: elements (Wuxing) ---------------- */
const elements = ["Wood", "Fire", "Earth", "Metal", "Water"].map((name) =>
  n({ id: id(name), name, type: "Element", layer: "atomic" }),
);
const [wood, fire, earth, metal, water] = elements;

// Generation cycle: Wood→Fire→Earth→Metal→Water→Wood
for (let i = 0; i < elements.length; i++)
  e(elements[i], "MUTUAL_GENERATION", elements[(i + 1) % elements.length]);
// Restraint cycle: Wood→Earth→Water→Fire→Metal→Wood
const restraintOrder = [wood, earth, water, fire, metal];
for (let i = 0; i < restraintOrder.length; i++)
  e(restraintOrder[i], "MUTUAL_RESTRAINT", restraintOrder[(i + 1) % restraintOrder.length]);

// Element → polarity (spec note: Wood is Yang-rising, Metal is Yin-rising)
e(wood, "POLARITY_OF", yang, {});
nodes.find((x) => x.id === wood)!.properties["polarityNote"] = "yang-rising";
e(fire, "POLARITY_OF", yang);
e(metal, "POLARITY_OF", yin);
nodes.find((x) => x.id === metal)!.properties["polarityNote"] = "yin-rising";
e(water, "POLARITY_OF", yin);
// Earth is the centre/balance point: no single polarity edge by design.

/* ---------------- ATOMIC: qualities hang off polarities ---------------- */
function quality(name: string, polarity: string, synonyms: string[] = []): string {
  const q = n({
    id: id(name),
    name,
    type: "Quality",
    layer: "atomic",
    properties: synonyms.length ? { synonyms } : {},
  });
  e(polarity, "HAS_QUALITY", q);
  return q;
}
quality("cold", yin, ["cool", "cooler", "coolest", "coldness", "coolness", "chilly"]);
quality("dark", yin, ["darker", "darkness"]);
quality("still", yin, ["stillness", "quiet", "resting"]);
quality("low", yin, ["lower"]);
quality("moist", yin, ["wet", "damp"]);
quality("sinking", yin, ["descending"]);
quality("warm", yang, ["warmer", "warmest", "heat", "hot"]);
quality("bright", yang, ["brighter", "brightness", "light"]);
quality("active", yang, ["activity", "movement"]);
quality("high", yang, ["higher"]);
quality("dry", yang, ["dryness"]);
quality("rising", yang, ["ascending"]);

/* ---------------- ATOMIC: trigrams (Bagua) ---------------- */
const trigrams: [string, string, string][] = [
  // name, meaning, element it corresponds to
  ["Qian", "Heaven", "Metal"],
  ["Kun", "Earth", "Earth"],
  ["Zhen", "Thunder", "Wood"],
  ["Xun", "Wind", "Wood"],
  ["Kan", "Water", "Water"],
  ["Li", "Fire", "Fire"],
  ["Gen", "Mountain", "Earth"],
  ["Dui", "Lake", "Metal"],
];
for (const [name, meaning, elementName] of trigrams) {
  const t = n({
    id: id(name),
    name,
    type: "Trigram",
    layer: "atomic",
    properties: { meaning },
  });
  e(t, "ELEMENT_OF", id(elementName));
}

/* ---------------- ATOMIC correspondences: seasons & times of day ---------------- */
function season(name: string, elementId: string, synonyms: string[] = []): string {
  const s = n({
    id: id(name),
    name,
    type: "Season",
    layer: "atomic",
    properties: synonyms.length ? { synonyms } : {},
  });
  e(s, "ELEMENT_OF", elementId);
  return s;
}
const spring = season("spring", wood);
const summer = season("summer", fire);
const autumn = season("autumn", metal, ["fall"]);
const winter = season("winter", water);

/* -------- Slice 2c (§6.11): season degree profiles, baselines, turning points --------
 * Atomic-layer data carried on the Season nodes' properties. The degree
 * profiles are §6.7's canonical table — INTERPRETIVE framework values
 * (the framework's qualitative ordering in indicative numbers), never
 * measurements; only the light + temperature aspects are seeded in 2c
 * (the activity column is a later row of §6.11). Baselines follow §6.8's
 * rule: the season's own element predominant, its generator and its
 * generated element present, the remaining two faint — with indicative
 * proportions (0.40 / 0.20 / 0.20 / 0.10 / 0.10, summing to 1) matching
 * §6.8's worked example, where a Fire share of 0.55 is judged against a
 * summer baseline of 0.40. Turning points (§6.5): the solstices only in
 * 2c — moments where a polarity is maximal in the light aspect and
 * already carries the turn toward its opposite, citing CONTAINS_SEED. */
const SEASON_YIN_SHARES: Record<string, { light: number; temperature: number }> = {
  spring: { light: 0.42, temperature: 0.45 },
  summer: { light: 0.18, temperature: 0.15 },
  autumn: { light: 0.58, temperature: 0.55 },
  winter: { light: 0.82, temperature: 0.85 },
};
const SEASON_TURNING_POINTS: Record<
  string,
  { name: string; aspectKey: string; extremum: string; turnsToward: string }
> = {
  winter: { name: "winter solstice", aspectKey: "light", extremum: "yin", turnsToward: "yang" },
  summer: { name: "summer solstice", aspectKey: "light", extremum: "yang", turnsToward: "yin" },
};
for (const seasonId of [spring, summer, autumn, winter]) {
  const node = nodes.find((x) => x.id === seasonId)!;
  const shares = SEASON_YIN_SHARES[seasonId];
  node.properties["degreeProfile"] = {
    light: { yinProportion: shares.light },
    temperature: { yinProportion: shares.temperature },
    source: "canonical-interpretive",
  };
  // Baseline (§6.8) computed off the generation cycle, not hand-listed:
  // own element predominant; generatedBy + generates present; rest faint.
  const own = elements.find((el) => {
    const edge = edges.find((x) => x.from === seasonId && x.type === "ELEMENT_OF");
    return edge?.to === el;
  })!;
  const ownIdx = elements.indexOf(own);
  const generatedByEl = elements[(ownIdx + elements.length - 1) % elements.length];
  const generatesEl = elements[(ownIdx + 1) % elements.length];
  const proportions: Record<string, number> = {};
  const bands: Record<string, string> = {};
  for (const el of elements) {
    // Bands are §6.8's rule stated by role; proportions are the
    // indicative numbers that accompany them (see the header note).
    if (el === own) {
      proportions[el] = 0.4;
      bands[el] = "predominant";
    } else if (el === generatedByEl || el === generatesEl) {
      proportions[el] = 0.2;
      bands[el] = "present";
    } else {
      proportions[el] = 0.1;
      bands[el] = "faint";
    }
  }
  node.properties["baseline"] = { proportions, bands, source: "canonical" };
  const tp = SEASON_TURNING_POINTS[seasonId];
  if (tp) node.properties["turningPoint"] = { ...tp, cites: "CONTAINS_SEED" };
}

function timeOfDay(name: string, polarityId: string, elementId: string | null, synonyms: string[] = []): string {
  const t = n({
    id: id(name),
    name,
    type: "TimeOfDay",
    layer: "atomic",
    properties: synonyms.length ? { synonyms } : {},
  });
  e(t, "POLARITY_OF", polarityId);
  if (elementId) e(t, "ELEMENT_OF", elementId);
  return t;
}
const night = timeOfDay("night", yin, water, ["nighttime", "night-time"]);
const midday = timeOfDay("midday", yang, fire, ["noon"]);
timeOfDay("dawn", yang, wood, ["sunrise", "morning"]);
timeOfDay("dusk", yin, metal, ["sunset", "evening"]);

/* ---------------- Element correspondence tables ----------------
 * The Five Elements map across subjects — the same element recurs in
 * sound, colour, taste, direction, emotion and the body. That recurrence
 * is what makes the graph "deeply related" rather than a list of facts. */
const correspondenceTable: Record<
  string,
  { sound: string; color: string; taste: string; direction: string; emotion: string; organ: string }
> = {
  Wood: { sound: "jue (角)", color: "green", taste: "sour", direction: "east", emotion: "anger", organ: "liver" },
  Fire: { sound: "zhi (徵)", color: "red", taste: "bitter", direction: "south", emotion: "joy", organ: "heart" },
  Earth: { sound: "gong (宮)", color: "yellow", taste: "sweet", direction: "centre", emotion: "pensiveness", organ: "spleen" },
  Metal: { sound: "shang (商)", color: "white", taste: "pungent", direction: "west", emotion: "grief", organ: "lungs" },
  Water: { sound: "yu (羽)", color: "black", taste: "salty", direction: "north", emotion: "fear", organ: "kidneys" },
};
for (const [elementName, row] of Object.entries(correspondenceTable)) {
  for (const [category, value] of Object.entries(row)) {
    const cid = `${category}-${id(value)}`;
    if (!nodes.some((x) => x.id === cid)) {
      n({
        id: cid,
        name: value,
        type: "Correspondence",
        layer: "atomic",
        properties: { category },
      });
    }
    e(cid, "CORRESPONDS_TO", id(elementName));
  }
}

/* ---------------- DICTIONARY layer ---------------- */
function dictionary(
  word: string,
  definition: string,
  partOfSpeech: string,
  domain: string,
  manifestations?: { aspect?: string; phrases: string[] }[],
): string {
  return n({
    id: `dict-${id(word)}`,
    name: word,
    type: "DictionaryEntry",
    layer: "dictionary",
    word,
    definition,
    partOfSpeech,
    domain,
    status: "approved",
    ...(manifestations ? { manifestations } : {}),
  });
}
const dictEntries: Record<string, string> = {
  derivative: dictionary(
    "derivative",
    "A measure of how a function changes as its input changes; the instantaneous rate of change at a particular point.",
    "noun",
    "mathematics",
  ),
  integral: dictionary(
    "integral",
    "A mathematical object that can be interpreted as the area under a curve or the accumulation of a quantity.",
    "noun",
    "mathematics",
  ),
  winter: dictionary(
    "winter",
    "The coldest season of the year, falling between autumn and spring, with the shortest days and longest nights.",
    "noun",
    "common",
  ),
  summer: dictionary(
    "summer",
    "The warmest season of the year, falling between spring and autumn, with the longest days.",
    "noun",
    "common",
  ),
  spring: dictionary(
    "spring",
    "The season between winter and summer, when plants begin to grow again.",
    "noun",
    "common",
  ),
  autumn: dictionary(
    "autumn",
    "The season between summer and winter, when leaves fall and temperatures decline.",
    "noun",
    "common",
  ),
  night: dictionary(
    "night",
    "The period of darkness between sunset and sunrise.",
    "noun",
    "common",
  ),
  midday: dictionary(
    "midday",
    "The middle of the day; noon, when the sun is at its highest.",
    "noun",
    "common",
  ),
  bass: dictionary(
    "bass",
    "The lowest range of the human singing voice, or the lowest notes of an instrument.",
    "noun",
    "music",
  ),
  treble: dictionary(
    "treble",
    "The highest range of the human singing voice, or the highest notes of an instrument.",
    "noun",
    "music",
  ),
  "high pressure system": dictionary(
    "high pressure system",
    "A region where atmospheric pressure is higher than in surrounding areas, associated with sinking air and clear skies.",
    "noun",
    "meteorology",
  ),
  "low pressure system": dictionary(
    "low pressure system",
    "A region where atmospheric pressure is lower than in surrounding areas, associated with rising air, cloud formation and precipitation.",
    "noun",
    "meteorology",
  ),
};
e(winter, "DEFINED_AS", dictEntries["winter"]);
e(summer, "DEFINED_AS", dictEntries["summer"]);
e(spring, "DEFINED_AS", dictEntries["spring"]);
e(autumn, "DEFINED_AS", dictEntries["autumn"]);
e(night, "DEFINED_AS", dictEntries["night"]);
e(midday, "DEFINED_AS", dictEntries["midday"]);

/* ---------------- Dictionary entries for the priors (§9.3) ----------------
 * The priors (polarities, elements, trigrams) had no DictionaryEntry
 * nodes; §9.3 puts manifestations in the dictionary layer, so they get
 * entries like every other canonical term — definition plus the
 * aspect-scoped manifestation phrase sets the plain-mode renderer may
 * use instead of the framework name. Phrases are deliberately plain
 * words: what the root looks like as ordinary experience. */
const priorEntries: Record<string, string> = {
  yin: dictionary(
    "yin",
    "The dark, cold, still, receptive pole of a complementary pair; the shaded side.",
    "noun",
    "framework",
    [
      { phrases: ["cold", "dark", "heavy", "still", "drawing inward"] },
      { aspect: "weather", phrases: ["cold", "dark", "heavy", "still", "drawing inward"] },
      { aspect: "mood", phrases: ["heavy", "slow", "weighed down", "quiet"] },
      { aspect: "body", phrases: ["cool", "resting", "gathering in"] },
      { aspect: "activity", phrases: ["still", "resting", "quiet", "gathering in"] },
      { aspect: "light", phrases: ["dark", "dim", "long-nighted"] },
    ],
  ),
  yang: dictionary(
    "yang",
    "The bright, warm, active, rising pole of a complementary pair; the sunlit side.",
    "noun",
    "framework",
    [
      { phrases: ["warm", "bright", "light", "active", "rising"] },
      { aspect: "weather", phrases: ["warm", "bright", "sunny", "active"] },
      { aspect: "mood", phrases: ["bright", "quick", "lifted", "lively"] },
      { aspect: "body", phrases: ["warm", "active", "moving"] },
      { aspect: "activity", phrases: ["active", "moving", "busy", "rising"] },
      { aspect: "light", phrases: ["bright", "light", "long-dayed"] },
    ],
  ),
  wood: dictionary(
    "wood",
    "The phase of growth and rising: sprouting, reaching, beginning.",
    "noun",
    "framework",
    [
      { phrases: ["growing", "reaching up", "fresh growth"] },
      { aspect: "weather", phrases: ["new growth", "rising sap", "green shoots"] },
      { aspect: "mood", phrases: ["eager", "pushing forward", "impatient"] },
    ],
  ),
  fire: dictionary(
    "fire",
    "The phase of full expansion: heat, brightness, activity at its peak.",
    "noun",
    "framework",
    [
      { phrases: ["heat", "brightness", "rising", "spreading"] },
      { aspect: "weather", phrases: ["heat", "bright sun", "drying warmth"] },
      { aspect: "mood", phrases: ["bright", "restless", "quick", "warm-hearted"] },
    ],
  ),
  earth: dictionary(
    "earth",
    "The central phase of settlement and nourishment: the balance point between rising and falling.",
    "noun",
    "framework",
    [
      { phrases: ["settled", "steady", "nourishing", "in the middle"] },
      { aspect: "weather", phrases: ["damp", "settled", "heavy air"] },
      { aspect: "mood", phrases: ["settled", "worrying", "turning things over"] },
    ],
  ),
  metal: dictionary(
    "metal",
    "The phase of contraction and refinement: cooling, drying, letting go.",
    "noun",
    "framework",
    [
      { phrases: ["crisp", "clear", "contracting", "cool and dry"] },
      { aspect: "weather", phrases: ["crisp", "clear", "cooling", "drying"] },
      { aspect: "mood", phrases: ["quiet", "reserved", "letting go"] },
    ],
  ),
  water: dictionary(
    "water",
    "The phase of storage and depth: flowing down, gathering, resting at the lowest point.",
    "noun",
    "framework",
    [
      { phrases: ["flowing down", "gathering", "deep", "still"] },
      { aspect: "weather", phrases: ["rain", "flowing down", "gathering", "soaking in"] },
      { aspect: "mood", phrases: ["heavy", "slow", "sinking", "wary"] },
      { aspect: "body", phrases: ["deep", "storing", "resting"] },
    ],
  ),
};
for (const [priorId, entryId] of Object.entries(priorEntries)) {
  e(priorId, "DEFINED_AS", entryId);
}
const trigramManifestations: Record<string, string[]> = {
  Qian: ["the open sky", "clear heights"],
  Kun: ["the ground underfoot", "open fields"],
  Zhen: ["a sudden crack and rumble", "a startling jolt"],
  Xun: ["a moving breeze", "a gentle penetrating wind"],
  Kan: ["deep water", "a hidden current"],
  Li: ["open flame", "bright light clinging to what it burns"],
  Gen: ["a still ridge", "a mountain at rest"],
  Dui: ["a calm pool", "open, still water"],
};
for (const [name, meaning] of trigrams.map(([nm, mn]) => [nm, mn] as const)) {
  const phrases = trigramManifestations[name];
  if (!phrases) continue;
  const entryId = dictionary(
    name.toLowerCase(),
    `One of the eight trigrams: ${meaning}.`,
    "noun",
    "framework",
    [{ phrases }],
  );
  e(id(name), "DEFINED_AS", entryId);
}

/* ---------------- SOURCE layer ---------------- */
const userNotes = n({
  id: "user-notes-ansci",
  name: "User's AnSci notes",
  type: "TextPassage",
  layer: "source",
  sourceTitle: "AnSci-AI-Model.txt / nct-ancientscience-TrebleAndBass.txt (user's own notes, docs/user-ref/)",
  rawText:
    "Derivative is Yang / integral is Yin, mutually rooted; high pressure (yang) disperses clouds, its sinking air is yin; bass is yang by male voice origin but yin by low pitch; treble is yin by female voice origin but yang by high, active pitch.",
  language: "en",
});

/* ---------------- ACQUIRED layer ---------------- */
function concept(
  name: string,
  domain: string,
  summary: string,
  synonyms: string[] = [],
): string {
  const c = n({
    id: id(name),
    name,
    type: "Concept",
    layer: "acquired",
    domain,
    summary,
    properties: synonyms.length ? { synonyms } : {},
  });
  e(c, "SOURCED_FROM", userNotes);
  return c;
}

// Calculus pair — derivative Yang/Fire, integral Yin/Water, mutually rooted.
const derivative = concept(
  "derivative",
  "mathematics",
  "Instantaneous, active, breaking-apart change: the rate at which a quantity changes at a single point.",
);
const integral = concept(
  "integral",
  "mathematics",
  "Accumulation and wholeness: gathering infinitesimal pieces into a total.",
);
e(derivative, "DEFINED_AS", dictEntries["derivative"]);
e(integral, "DEFINED_AS", dictEntries["integral"]);
e(derivative, "HAS_POLARITY", yang, { confidence: 0.92 });
e(derivative, "HAS_ELEMENT", fire, { confidence: 0.88 });
e(integral, "HAS_POLARITY", yin, { confidence: 0.91 });
e(integral, "HAS_ELEMENT", water, { confidence: 0.87 });
e(derivative, "MUTUALLY_ROOTED_WITH", integral, { confidence: 0.95 });
e(integral, "MUTUALLY_ROOTED_WITH", derivative, { confidence: 0.95 });
const instantaneous = concept(
  "instantaneous rate of change",
  "mathematics",
  "How fast a quantity is changing at one exact point.",
);
const accumulation = concept(
  "accumulation",
  "mathematics",
  "A total built up by adding many small contributions.",
);
e(derivative, "MAPPED_TO", instantaneous, { confidence: 0.95 });
e(integral, "MAPPED_TO", accumulation, { confidence: 0.94 });

// Weather systems — multi-aspect polarity (overall vs. the air's motion).
const highPressure = concept(
  "high pressure system",
  "meteorology",
  "A region of higher-than-surrounding atmospheric pressure, bringing clear skies.",
  ["anticyclone", "high-pressure system"],
);
const lowPressure = concept(
  "low pressure system",
  "meteorology",
  "A region of lower-than-surrounding atmospheric pressure, bringing cloud and precipitation.",
  ["cyclone", "low-pressure system"],
);
e(highPressure, "DEFINED_AS", dictEntries["high pressure system"]);
e(lowPressure, "DEFINED_AS", dictEntries["low pressure system"]);
e(highPressure, "HAS_POLARITY", yang, { confidence: 0.85, aspect: "overall character (dispersing, clear skies)", aspectKey: "overall" });
e(highPressure, "HAS_POLARITY", yin, { confidence: 0.8, aspect: "sinking air", aspectKey: "air-motion" });
e(highPressure, "HAS_ELEMENT", fire, { confidence: 0.72 });
e(lowPressure, "HAS_POLARITY", yin, { confidence: 0.84, aspect: "overall character (gathering, condensing, moist)", aspectKey: "overall" });
e(lowPressure, "HAS_POLARITY", yang, { confidence: 0.78, aspect: "rising air", aspectKey: "air-motion" });

// Weather anchors (slice 2a) — curated mappings chosen so WordNet synsets
// can climb IS_A chains into the ontology: precipitation is the hypernym
// of snow, sleet and hail in WordNet, so mapping this one synset gives the
// reasoner a whole family of weather words it was never handed directly.
// Their WordNet sense links live in src/wordnet.ts (SENSE_MAPPINGS).
const precipitation = concept(
  "precipitation",
  "meteorology",
  "Water falling from clouds to earth in any form — rain, snow, hail, sleet or mist.",
);
// Aspect key (§6.11 backfill): the free-text aspect describes what
// precipitation IS — its overall character — so it keys as `overall`.
e(precipitation, "HAS_POLARITY", yin, { confidence: 0.85, aspect: "falling water from the sky", aspectKey: "overall" });
e(precipitation, "HAS_ELEMENT", water, { confidence: 0.88 });
const snow = concept(
  "snow",
  "meteorology",
  "Precipitation as ice crystals: the still, white, cold form of falling water.",
);
e(snow, "HAS_POLARITY", yin, { confidence: 0.88 });
e(snow, "HAS_ELEMENT", water, { confidence: 0.9 });
const frost = concept(
  "frost",
  "meteorology",
  "Ice crystals forming on cold surfaces; weather cold enough to cause freezing.",
);
e(frost, "HAS_POLARITY", yin, { confidence: 0.87, aspect: "freezing formation on surfaces", aspectKey: "formation" });
e(frost, "HAS_ELEMENT", water, { confidence: 0.85 });

// Music — the treble/bass multi-aspect case from the user's notes:
// a concept is not Yin OR Yang; it is one in one aspect, the other in another.
const bass = concept("bass", "music", "The lowest vocal or instrumental range.", ["bass clef"]);
const treble = concept("treble", "music", "The highest vocal or instrumental range.", ["treble clef"]);
e(bass, "DEFINED_AS", dictEntries["bass"]);
e(treble, "DEFINED_AS", dictEntries["treble"]);
e(bass, "HAS_POLARITY", yang, { confidence: 0.85, aspect: "voice origin (sung by men)", aspectKey: "voice-origin" });
e(bass, "HAS_POLARITY", yin, { confidence: 0.9, aspect: "pitch (low, dark, more still — lower frequency)", aspectKey: "pitch" });
e(treble, "HAS_POLARITY", yin, { confidence: 0.85, aspect: "voice origin (sung by women)", aspectKey: "voice-origin" });
e(treble, "HAS_POLARITY", yang, { confidence: 0.9, aspect: "pitch (high, bright, more active — higher frequency)", aspectKey: "pitch" });

// A deliberately weaker mapping, so confidence thresholds have something to filter:
// the user's notes say the metal mercury *manifests a state* corresponding to
// Water at room temperature — an analogy, not an identity, hence 0.55.
const mercury = concept(
  "mercury",
  "chemistry",
  "A chemical element that is a liquid metal at room temperature.",
);
e(mercury, "HAS_ELEMENT", water, { confidence: 0.55, aspect: "state at room temperature (liquid)", aspectKey: "state" });

export const seedGraphData: GraphData = { nodes, edges: edges.map((x, i) => ({ id: `seed-edge-${i + 1}`, ...x })) };

export function buildSeedGraph(): Graph {
  return Graph.fromJSON(seedGraphData);
}
