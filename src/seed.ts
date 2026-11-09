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
e(highPressure, "HAS_POLARITY", yang, { confidence: 0.85, aspect: "overall character (dispersing, clear skies)" });
e(highPressure, "HAS_POLARITY", yin, { confidence: 0.8, aspect: "sinking air" });
e(highPressure, "HAS_ELEMENT", fire, { confidence: 0.72 });
e(lowPressure, "HAS_POLARITY", yin, { confidence: 0.84, aspect: "overall character (gathering, condensing, moist)" });
e(lowPressure, "HAS_POLARITY", yang, { confidence: 0.78, aspect: "rising air" });

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
e(precipitation, "HAS_POLARITY", yin, { confidence: 0.85, aspect: "falling water from the sky" });
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
e(frost, "HAS_POLARITY", yin, { confidence: 0.87, aspect: "freezing formation on surfaces" });
e(frost, "HAS_ELEMENT", water, { confidence: 0.85 });

// Music — the treble/bass multi-aspect case from the user's notes:
// a concept is not Yin OR Yang; it is one in one aspect, the other in another.
const bass = concept("bass", "music", "The lowest vocal or instrumental range.", ["bass clef"]);
const treble = concept("treble", "music", "The highest vocal or instrumental range.", ["treble clef"]);
e(bass, "DEFINED_AS", dictEntries["bass"]);
e(treble, "DEFINED_AS", dictEntries["treble"]);
e(bass, "HAS_POLARITY", yang, { confidence: 0.85, aspect: "voice origin (sung by men)" });
e(bass, "HAS_POLARITY", yin, { confidence: 0.9, aspect: "pitch (low, dark, more still — lower frequency)" });
e(treble, "HAS_POLARITY", yin, { confidence: 0.85, aspect: "voice origin (sung by women)" });
e(treble, "HAS_POLARITY", yang, { confidence: 0.9, aspect: "pitch (high, bright, more active — higher frequency)" });

// A deliberately weaker mapping, so confidence thresholds have something to filter:
// the user's notes say the metal mercury *manifests a state* corresponding to
// Water at room temperature — an analogy, not an identity, hence 0.55.
const mercury = concept(
  "mercury",
  "chemistry",
  "A chemical element that is a liquid metal at room temperature.",
);
e(mercury, "HAS_ELEMENT", water, { confidence: 0.55, aspect: "state at room temperature (liquid)" });

export const seedGraphData: GraphData = { nodes, edges: edges.map((x, i) => ({ id: `seed-edge-${i + 1}`, ...x })) };

export function buildSeedGraph(): Graph {
  return Graph.fromJSON(seedGraphData);
}
