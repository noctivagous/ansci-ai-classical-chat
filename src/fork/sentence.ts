/**
 * sentence.ts — the AnSci fork's sentence layer: types, the two cycles,
 * and the lexicon. See docs/fork/README.md and docs/fork/DESIGN.md §2.2.
 *
 * The mapping (user's sentencesToWuxing.txt, a creative application, not
 * tradition): Verb=Wood, Adjective=Fire, Noun=Earth, Preposition/
 * Conjunction=Metal, Adverb=Water. The generating cycle is construction;
 * the controlling cycle is constraint. Every content word carries TWO
 * addresses: its syntactic element (job in the sentence) and, where the
 * lexicon knows one, its semantic element (its sense's classification
 * in the ontology net, joined by element name to src/seed.ts).
 *
 * The meaning graph holds NO order information. Order lives only in
 * the connective graph; REALIZES alignment joins the two.
 */
import { seedGraphData } from "../seed";

export type Element = "Wood" | "Fire" | "Earth" | "Metal" | "Water";
export type Language = "en" | "zh";

/** Generating cycle (sheng): Wood→Fire→Earth→Metal→Water→Wood. */
export const GENERATES: Record<Element, Element> = {
  Wood: "Fire",
  Fire: "Earth",
  Earth: "Metal",
  Metal: "Water",
  Water: "Wood", // the closure: an adverbial / clause end feeds the next verb
};

/** Controlling cycle (ke): Wood→Earth, Earth→Water, Water→Fire, Fire→Metal, Metal→Wood. */
export const CONTROLS: Record<Element, Element> = {
  Wood: "Earth",
  Earth: "Water",
  Water: "Fire",
  Fire: "Metal",
  Metal: "Wood",
};

export type CycleKind = "generating" | "controlling" | "other";

/** Which cycle, if any, an element pair belongs to. */
export function cycleOf(from: Element, to: Element): CycleKind {
  if (GENERATES[from] === to) return "generating";
  if (CONTROLS[from] === to) return "controlling";
  return "other";
}

export interface NodeStates {
  voice?: "active" | "passive";
  negated?: boolean;
  mood?: "indicative" | "interrogative" | "imperative" | "subjunctive";
  aspect?: "perfect" | "progressive";
  tense?: "present" | "past";
  /** Surface auxiliary that carries tense for a negated/perfect clause (K6: the Metal carrier). */
  aux?: string;
  /** Verb form actually seen/produced: base | third | past | participle. */
  verbForm?: string;
  /** Copula tense for predicate (verbless-entry) clauses. */
  copulaTense?: "present" | "past";
  /** Construction template used, where the language has one (zh: ba/bei/serial/a-not-a). */
  construction?: string;
  /** Modal auxiliary riding on the clause (en would/can), for conditionals. */
  modal?: string;
  /** Interrogative sub-kind where the connective layer marks one ("why" questions). */
  questionKind?: string;
  /** ZH result complement seen on the verb (e.g. 走 'away' in 拿走). */
  result?: string;
  /** Person/number of the subject, for the Metal→Wood agreement check. */
  subjectPerson?: string;
}

export interface MeaningNode {
  id: string;
  lemma: string;
  /** Surface form as parsed (or canonical lemma for generated nodes). */
  form: string;
  syntacticElement: Element;
  /** Second address: this sense's element in the ontology net, if known. */
  semanticElement?: Element;
  /** Grammatical role this node fills (subject, patient, …), if any. */
  role?: string;
  /** Determiner carried from the connective layer for regeneration (en). */
  det?: string;
  /** Preposition that introduced this node (location/goal phrases), for regeneration. */
  prep?: string;
  /** ZH locative suffix carried for regeneration (e.g. 上 in 桌子上). */
  suffix?: string;
  /** True for question words （什么， EN what): an ordinary slot-filler that also carries interrogative force. */
  questionWord?: boolean;
  states?: NodeStates;
}

export type Relation =
  | "agent" | "patient" | "theme" | "recipient" | "location" | "goal"
  | "qualifies" | "modulates" | "predicate" | "chains-to"
  | "has-classifier" | "links"
  /* Slice A additions: */
  | "modifier"   // a clause graph attached to an Earth head (R5 relative clauses)
  | "result"     // resultative complement: the clause's outcome content (R6)
  | "degree"     // degree complement: how far the verb's quality runs (R6, ZH 得)
  | "condition"; // clause -> clause condition relation (Metal logical)

export interface MeaningEdge {
  from: string;
  to: string;
  relation: Relation;
  /** Cycle provenance of the arc between the two nodes' syntactic elements. */
  cycle: CycleKind;
  /** Connective marker riding on this edge, if any (zh 就 on a chains-to edge). */
  marker?: string;
  /** The relation's own element typing where it differs from the endpoint
   *  arc (the condition relation is Metal logical, whatever it joins). */
  element?: Element;
}

export interface MeaningGraph {
  nodes: MeaningNode[];
  edges: MeaningEdge[];
  /** Id of the clause's entry node: the verb, or the predicate node for verbless entry (R1). */
  rootId: string;
  /** Syntactic element at which this clause enters the cycle. */
  entryElement: Element;
}

export interface Span {
  start: number;
  end: number; // exclusive
  label: string;
}

export interface ConnectiveGraph {
  language: Language;
  tokens: string[];
  /** NEXT chain: next[i] is the index of the token after i, or -1. */
  next: number[];
  spans: Span[];
  /** Token index of the topicalised constituent, if any (ba theme, bei theme, fronting). */
  topicTokenIndex?: number;
  /** Connective-only tokens that realise NO meaning node (R4 expletives,
   *  do-support): scaffolding the surface grammar demands. */
  scaffolding?: { index: number; kind: string }[];
}

export interface ParsedSentence {
  meaning: MeaningGraph;
  connective: ConnectiveGraph;
  /** REALIZES: meaning node id → token indices that realise it (empty = zero realisation). */
  realizes: Record<string, number[]>;
  /** Clause-scope attachments in surface order (zh particles), for the scope-order check. */
  scopeAttachments: { form: string; kind: "aspect" | "question" | "attitude"; targetId?: string }[];
}

/* ---------------- Lexicon ----------------
 * Deliberately small: the evaluated vocabulary of the two desk
 * evaluations plus the words the regression tests use. The parser is
 * lexicon- and template-driven over this vocabulary — a mechanism
 * demonstrator, not a general NLP parser (docs/fork/README.md). */

export interface VerbEntry {
  kind: "verb";
  lemma: string;
  element: "Wood";
  /** Nominal slots in surface order for bare NPs (prep slots are named separately). */
  slots: string[];
  /** Slots that MUST be filled (valency, Wood→Earth control). */
  required: string[];
  /** Slot filled by a prepositional phrase, and the prepositions that fill it. */
  prepSlot?: { slot: string; preps: string[]; required?: boolean };
  forms: { base: string; third: string; past: string; participle: string };
  semanticElement?: Element;
}

export interface SimpleEntry {
  kind: "noun" | "adjective" | "adverb" | "pronoun";
  lemma: string;
  element: Element;
  semanticElement?: Element;
  /** Question words （什么）: slot-fillers that carry interrogative force in situ. */
  question?: boolean;
  /** ZH: the classifier this noun generates (Earth→Metal), if it takes one. */
  classifier?: string;
  /** EN pronoun facts for agreement. */
  person?: "1sg" | "2" | "3sg" | "1pl" | "3pl";
}

export type LexEntry = VerbEntry | SimpleEntry;

const v = (
  lemma: string,
  slots: string[],
  required: string[],
  forms: Partial<VerbEntry["forms"]> & { base: string },
  extra?: Partial<VerbEntry>,
): VerbEntry => ({
  kind: "verb",
  lemma,
  element: "Wood",
  slots,
  required,
  forms: { third: forms.base + "s", past: forms.base + "ed", participle: forms.base + "ed", ...forms },
  ...extra,
});
const simple = (
  kind: SimpleEntry["kind"],
  lemma: string,
  element: Element,
  extra?: Partial<SimpleEntry>,
): SimpleEntry => ({ kind, lemma, element, ...extra });

export const EN_LEXICON: Record<string, LexEntry> = {};
export const ZH_LEXICON: Record<string, LexEntry> = {};

function en(entry: LexEntry, ...forms: string[]): void {
  for (const f of forms.length ? forms : [entry.lemma]) EN_LEXICON[f] = entry;
}
function zh(entry: LexEntry): void {
  ZH_LEXICON[entry.lemma] = entry;
}

/* English verbs (valency frames are the Wood→Earth control data). */
en(v("chop", ["patient"], ["patient"], { base: "chop", third: "chops", past: "chopped", participle: "chopped" }), "chop", "chops", "chopped");
en(v("put", ["theme"], ["theme"], { base: "put", third: "puts", past: "put", participle: "put" },
  { prepSlot: { slot: "location", preps: ["on", "in"], required: true } }), "put", "puts");
en(v("lend", ["recipient", "theme"], ["recipient", "theme"], { base: "lend", third: "lends", past: "lent", participle: "lent" }), "lend", "lends", "lent");
en(v("bite", ["patient"], ["patient"], { base: "bite", third: "bites", past: "bit", participle: "bitten" }), "bite", "bites", "bit", "bitten");
en(v("go", [], [], { base: "go", third: "goes", past: "went", participle: "gone" },
  { prepSlot: { slot: "goal", preps: ["to"] } }), "go", "goes", "went", "gone");
en(v("arrive", [], [], { base: "arrive", third: "arrives", past: "arrived", participle: "arrived" }), "arrive", "arrives", "arrived");
en(v("make", ["patient"], ["patient"], { base: "make", third: "makes", past: "made", participle: "made" }), "make", "makes", "made");
en(v("sleep", [], [], { base: "sleep", third: "sleeps", past: "slept", participle: "slept" }), "sleep", "sleeps", "slept");
/* Slice A verbs: gaps/fronting, relatives, resultatives, conditionals, weather. */
en(v("read", ["patient"], ["patient"], { base: "read", third: "reads", past: "read", participle: "read" }), "read", "reads");
en(v("buy", ["patient"], ["patient"], { base: "buy", third: "buys", past: "bought", participle: "bought" }), "buy", "buys", "bought");
en(v("rain", [], [], { base: "rain", third: "rains", past: "rained", participle: "rained" }), "rain", "rains", "rained", "raining");
en(v("race", [], [], { base: "race", third: "races", past: "raced", participle: "raced" },
  { prepSlot: { slot: "location", preps: ["past"] } }), "race", "races", "raced");
en(v("fall", [], [], { base: "fall", third: "falls", past: "fell", participle: "fallen" }), "fall", "falls", "fell", "fallen");
en(v("get", [], [], { base: "get", third: "gets", past: "got", participle: "gotten" }), "get", "gets", "got", "gotten");
en(v("abdicate", [], [], { base: "abdicate", third: "abdicates", past: "abdicated", participle: "abdicated" }), "abdicate", "abdicates", "abdicated");
en(v("hear", ["patient"], ["patient"], { base: "hear", third: "hears", past: "heard", participle: "heard" }), "hear", "hears", "heard");
en(v("shout", [], [], { base: "shout", third: "shouts", past: "shouted", participle: "shouted" },
  { prepSlot: { slot: "recipient", preps: ["at"] } }), "shout", "shouts", "shouted");
en(v("worry", [], [], { base: "worry", third: "worries", past: "worried", participle: "worried" }), "worry", "worries", "worried");
en(v("need", ["theme"], ["theme"], { base: "need", third: "needs", past: "needed", participle: "needed" }), "need", "needs", "needed");

/* English nouns / pronouns / adjectives / adverbs. */
for (const n of ["cook", "onions", "book", "table", "ladder", "dog", "man", "school", "news",
  "cat", "roof", "horse", "barn", "king", "bananas", "soup", "salt", "summer", "bread", "cake", "pot"])
  en(simple("noun", n, "Earth"));
en(simple("noun", "sister", "Earth"));
en(simple("noun", "winter", "Earth", { semanticElement: "Water" }));
en(simple("pronoun", "i", "Earth", { person: "1sg" }), "i");
en(simple("pronoun", "you", "Earth", { person: "2" }), "you");
en(simple("pronoun", "it", "Earth", { person: "3sg" }), "it");
en(simple("pronoun", "them", "Earth", { person: "3pl" }), "them");
en(simple("pronoun", "she", "Earth", { person: "3sg" }), "she");
en(simple("pronoun", "he", "Earth", { person: "3sg" }), "he");
en(simple("pronoun", "him", "Earth", { person: "3sg" }), "him");
en(simple("pronoun", "we", "Earth", { person: "1pl" }), "we");
en(simple("pronoun", "they", "Earth", { person: "3pl" }), "they");
en(simple("adjective", "angry", "Fire", { semanticElement: "Wood" }));
en(simple("adjective", "furious", "Fire", { semanticElement: "Wood" }));
en(simple("adjective", "cold", "Fire", { semanticElement: "Water" }));
en(simple("adjective", "brown", "Fire"));
en(simple("adjective", "big", "Fire"));
en(simple("adjective", "hot", "Fire", { semanticElement: "Fire" }));
en(simple("adjective", "dark", "Fire", { semanticElement: "Water" }));
en(simple("adjective", "worried", "Fire", { semanticElement: "Earth" }));
en(simple("adverb", "quickly", "Water"));
en(simple("adverb", "all", "Water"));
en(simple("adverb", "yet", "Water"));
en(simple("adverb", "yesterday", "Water"));
en(simple("adverb", "then", "Water"));

/* Chinese entries (lemmas are the surface strings; tokenisation is longest-match). */
zh(v("吃", ["patient"], [], { base: "吃" }));
zh(v("放", ["theme"], ["theme"], { base: "放" },
  { prepSlot: { slot: "location", preps: ["在"], required: true } }));
zh(v("拿", ["patient"], ["patient"], { base: "拿" }));
zh(v("去", [], [], { base: "去" }));
zh(v("睡觉", [], [], { base: "睡觉" }));
zh(v("走", [], [], { base: "走" }));
zh(v("唱歌", [], [], { base: "唱歌" }));
zh(v("买", ["patient"], ["patient"], { base: "买" }));
zh(v("跑", [], [], { base: "跑" }));
zh(simple("noun", "饭", "Earth"));
zh(simple("noun", "书", "Earth", { classifier: "本" }));
zh(simple("noun", "桌子", "Earth"));
zh(simple("noun", "冬天", "Earth", { semanticElement: "Water" }));
zh(simple("noun", "学校", "Earth"));
zh(simple("pronoun", "我", "Earth", { person: "1sg" }));
zh(simple("pronoun", "你", "Earth", { person: "2" }));
zh(simple("pronoun", "他", "Earth", { person: "3sg" }));
zh(simple("adjective", "冷", "Fire", { semanticElement: "Water" }));
zh(simple("adjective", "快", "Fire"));
zh(simple("adjective", "贵", "Fire"));
zh(simple("pronoun", "什么", "Earth", { question: true }));

/** ZH function words: not content nodes, but the connective/scope layer needs their kinds. */
export const ZH_FUNCTION: Record<string, string> = {
  "了": "aspect-particle",
  "吗": "question-particle",
  "吧": "attitude-particle",
  "不": "negation",
  "把": "ba-marker",
  "被": "bei-marker",
  "在": "preposition",
  "上": "locative-suffix",
  "很": "degree",
  "就": "chain-marker",
  "本": "classifier",
  "三": "numeral",
  "一": "numeral",
  "二": "numeral",
  "两": "numeral",
  "的": "relative-marker",
  "得": "degree-marker",
  "一边": "correlative",
};

/* ---------------- Semantic join to the seed net ---------------- */

export interface SemanticClassification {
  lemma: string;
  syntacticElement: Element;
  semanticElement: Element;
  /** Id of the element node in src/seed.ts's graph (e.g. "wood"). */
  seedElementId: string;
}

/**
 * The join point to the ontology net: for each meaning node carrying a
 * semantic address, return its classification keyed to the seed graph's
 * element node by name. This does not reimplement the ontology engine —
 * src/engine.ts and src/propagate.ts operate on the seed graph; this
 * function only hands them the element ids a sentence classifies to.
 */
export function semanticClassifications(parsed: ParsedSentence): SemanticClassification[] {
  const seedIds = new Set(seedGraphData.nodes.filter((n) => n.type === "Element").map((n) => n.id));
  const out: SemanticClassification[] = [];
  for (const node of parsed.meaning.nodes) {
    if (!node.semanticElement) continue;
    const seedElementId = node.semanticElement.toLowerCase();
    if (!seedIds.has(seedElementId)) continue;
    out.push({
      lemma: node.lemma,
      syntacticElement: node.syntacticElement,
      semanticElement: node.semanticElement,
      seedElementId,
    });
  }
  return out;
}
