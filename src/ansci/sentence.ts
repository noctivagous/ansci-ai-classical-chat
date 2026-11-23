/**
 * sentence.ts — the AnSci fork's sentence layer: types, the two cycles,
 * and the lexicon. See docs/ansci/README.md and docs/ansci/DESIGN.md §2.2.
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

/**
 * The aspect feature bundle (WP4 spec): the five aspect patterns are
 * named configurations over these compositional features, not
 * exclusive states — perfect-progressive is {perfect, ongoing},
 * experiential is {perfect, experiential}, and so on.
 */
export interface AspectBundle {
  bounded?: boolean;
  ongoing?: boolean;
  perfect?: boolean;
  experiential?: boolean;
  habitual?: boolean;
  inchoative?: boolean;
  resultative?: boolean;
}

/**
 * Negation as a structured state of the predicate (Part F.2),
 * replacing the bare boolean as the record of record: the Water
 * state itself, its surface negator, and its carrier — the Metal
 * bearer of the clause's tense/agreement. EN: the carrier is the
 * auxiliary lemma (K6: "didn't arrive", never *"didn't arrived").
 * ZH: the preverbal negator carries itself, and its FORM （不/没）
 * is selected by the negated predicate's aspect bundle
 * (zhNegatorFor in aspect.ts). `negated` remains as the presence
 * flag every existing reader keys on; this record is what parse
 * writes and generation reads first.
 */
export interface NegationState {
  negator: string;
  carrier?: string;
}

export interface NodeStates {
  voice?: "active" | "passive";
  negated?: boolean;
  negation?: NegationState;
  mood?: "indicative" | "interrogative" | "imperative" | "subjunctive";
  aspect?: AspectBundle;
  tense?: "present" | "past";
  /** Surface auxiliary that carries tense for a negated/perfect clause (K6: the Metal carrier). */
  aux?: string;
  /** Verb form actually seen/produced: base | third | past | participle. */
  verbForm?: string;
  /** Copula tense for predicate (verbless-entry) clauses. */
  copulaTense?: "present" | "past";
  /** ZH copula surface the parse saw （是）, recorded on a nominal
   *  predication so generation re-emits it: ZH realises the
   *  'predicated-as' relation with no copula at all （今天星期一） or
   *  with 是 （他是老师）, and the graph must say which. */
  copulaForm?: string;
  /** ZH preverbal aspect marker the parse saw （在, progressive):
   *  generation re-emits it BEFORE its verb, where the post-verbal
   *  particle the bundle would otherwise select （着） does not go. */
  aspectMarker?: string;
  /** Construction template used, where the language has one (zh: ba/bei/serial/a-not-a). */
  construction?: string;
  /** Modal auxiliary riding on the clause (en would/can), for conditionals. */
  modal?: string;
  /** Interrogative sub-kind where the connective layer marks one ("why" questions). */
  questionKind?: string;
  /** ZH result complement seen on the verb (e.g. 走 'away' in 拿走). */
  result?: string;
  /** Valency slots that remain DECLARED on this predicate but are
   *  suppressed from realisation (repair H1): the agent of an agentless
   *  passive ("The book was given"), and any required slot the passive
   *  promotion skipped over (the recipient there). A suppressed slot is
   *  not a missing argument — the checker must not flag it, and
   *  generation must not demand or invent a filler for it. */
  suppressedRoles?: string[];
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
  | "condition"  // clause -> clause condition relation (Metal logical)
  /* Transcript Slice 1 additions: */
  | "complement" // verb -> clause: an embedded clause (wh- or that-)
  // standing as the verb's complement ("I know who you are",
  // "I know that you are here"). The edge runs from the matrix
  // verb (Wood) to the embedded clause's root, exactly as
  // "condition" runs from a main verb to its condition clause
  // and "modifier" from an Earth head to its relative clause.
  // It is a clause relation, NOT a cycle edge: its cycle field
  // computes from the endpoint elements as any other edge's
  // does, and no reasoning path may treat it as a valency arc —
  // check.ts counts it separately, as the frame's clausal
  // filler, never as an Earth argument.
  /* Transcript Slice 6 additions: */
  | "about"      // verb -> Earth: the about-phrase's topic — what the
  // verb's content ranges over ("what do you know ABOUT DOGS?",
  // "you know about dogs"). The edge runs from the verb (Wood)
  // to the topic node (Earth), which carries prep "about" for
  // regeneration, exactly as a location node carries its
  // preposition. It is NOT a valency arc: the topic is neither
  // the verb's theme (what is known is a different question
  // from what the knowing is about) nor a location, and
  // check.ts's ARG_RELATIONS deliberately excludes it, as it
  // excludes "complement". Before this relation the phrase had
  // no representation at all in a wh-question (the diagnostic's
  // IM3): 'about' classifies as an adverb in the item stream,
  // the wh-branch's PP loop stopped at it, and the topic the
  // visitor named never entered the graph.
  /* Repair tranche additions: */
  | "predicated-as" // nominal predication: an Earth topic predicated as an
  // Earth nominal （今天星期一， "Today is Monday"). A DECLARED architectural
  // addition — a meaning-graph relation type, NOT a cycle edge: its cycle
  // field computes to "other" (Earth→Earth is in neither cycle), and no
  // reasoning path may treat it as one. See docs/ansci/repair-programme.md.
  /* Stage 3 additions (Part D): */
  | "contains"   // containment: a container holds a contained entity
                 // ("What's in it?") — a meaning relation, NOT a cycle edge
  | "time";      // temporal location of a topic ("When is it?") — as above

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

/**
 * One token's resolution record (token-resolve.ts): a word the
 * parser did not recognise, and what the resolution pipeline did
 * with it — an attested variant-graph edge, a matcher correction, a
 * segmentation of a joined form, or an unresolved token whose gap
 * is located here, with the best candidates found and the score.
 */
export interface TokenResolution {
  surface: string;
  outcome: "variant" | "corrected" | "segmented" | "unresolved";
  /** The token list that entered the item stream in its place. */
  replacement: string[];
  /** Position of the replacement in the resolved token list. */
  tokenIndex: number;
  confidence: number;
  rule: string;
  candidates?: { term: string; distance: number; count: number }[];
  /** The age-of-acquisition PRIOR for the resolution's best
   *  candidate (the Glasgow scope extension, 2026-11-17): when
   *  the word the resolution lands on — or, unresolved, the
   *  best candidate found — is one the Glasgow Norms rate as
   *  LATE-acquired (mean band 6+ of the 1–7 band scale, i.e.
   *  typically acquired at 11+ years), the labelled fact rides
   *  the record: late-acquired words are likelier
   *  comprehension-gap candidates, which is knowledge for the
   *  gap machinery (Awareness), never an assumption about the
   *  person. The prior changes nothing about the resolution —
   *  outcome, replacement and confidence are computed exactly
   *  as without it (pinned in test/ansci-glasgow-priors.test.ts). */
  aoaPrior?: string;
}

/** The RelEx evidence record (see ParsedSentence.relexEvidence).
 *  One Stanford-style dependency relation as the full RelEx
 *  pipeline (tagging → semantic → stanford) produced it over the
 *  WASM Link Grammar linkage: governor/dependent are WORD
 *  INDICES INTO THE PARSE'S OWN TOKEN LIST (the routing maps
 *  the linkage's sentence positions onto the parse tokens; a
 *  relation whose words cannot be mapped is dropped, never
 *  guessed). `family` is the Stanford relation name (nsubj,
 *  dobj, neg, prep_at, …). */
export interface RelexEvidenceRelation {
  family: string;
  gov: number;
  dep: number;
  govWord: string;
  depWord: string;
}

export interface RelexEvidence {
  status: "complete" | "recovered" | "failed";
  relations: RelexEvidenceRelation[];
  /** Families present, for cheap presence checks. */
  families: string[];
}

/** One shadow linkage's record (see ParsedSentence.linkageShadow). */
export interface LinkageShadow {
  status: "complete" | "partial" | "declined";
  tokens: string[];
  tokenIndices: number[];
  links: { left: number; right: number; connector: string; family: string }[];
  unused: string[];
  skipped: string[];
  linkageCount: number;
  countCapped: boolean;
  disjunctCost: number;
  linkLength: number;
  /** Raw disjunct sequences the lazy generation actually
   *  pulled from the expression trees (generation is on
   *  demand; this is what the search consumed, not the
   *  sentence's full expansion). */
  disjunctsGenerated: number;
  /** Per solver token: disjuncts delivered by its stream
   *  after contextual filtering — the sets the search saw. */
  prunedDisjuncts: number[];
  searchNodes: number;
  boundsHit: string[];
  note?: string;
}

export interface ParsedSentence {
  meaning: MeaningGraph;
  connective: ConnectiveGraph;
  /** A conservatively identified embedded request, with token provenance.
   * This is a candidate interpretation, not a capability or execution claim. */
  embeddedTask?: { verb: string; object: string; verbToken: number; objectTokens: number[]; confidence: "candidate" };
  /** The Link Grammar shadow record (coverage slice, shadow
   *  landing): the bounded solver's result over the sentence's
   *  content tokens, recorded beside the parse. In the shadow
   *  stage NOTHING reads this record — no graph, check, or reply
   *  may consult it; family routing slices promote individual
   *  families only after their held-out gates pass. `tokens` are
   *  the solver's content words (lowercase, punctuation
   *  excluded); `tokenIndices` maps them back to the token list
   *  the parse ran on. `unused` are words a partial linkage left
   *  unlinked; `skipped` are words with no dictionary record
   *  (not UNUSED — the dictionary simply does not file them). */
  linkageShadow?: LinkageShadow;
  /** The RelEx Stanford evidence record (RelEx completion,
   *  routing stage): the full-pipeline Stanford relations over
   *  the WASM linkage, attached beside the parse by turn.ts's
   *  async pre-pass — parse() itself is synchronous and never
   *  runs the WASM. EVIDENCE ONLY in this slice: the record
   *  proposes dependency relations; no graph edge, check, or
   *  reply is written from it here. Consumers must treat it the
   *  way the adapter's relations are treated — proposals for
   *  AnSci's own arbitration (valency, check.ts), never direct
   *  meaning. Absent when the WASM linkage was unavailable,
   *  incomplete, or its words could not be mapped onto the
   *  parse's tokens. */
  relexEvidence?: RelexEvidence;
  /** Token resolutions applied before item classification, when any
   *  token needed them (token-resolve.ts). The connective graph is
   *  built over the resolved tokens; this record is the provenance
   *  of what was actually said. */
  tokenResolutions?: TokenResolution[];
  /** REALIZES: meaning node id → token indices that realise it (empty = zero realisation). */
  realizes: Record<string, number[]>;
  /** Clause-scope attachments in surface order (zh particles), for the scope-order check. */
  scopeAttachments: { form: string; kind: "aspect" | "question" | "attitude"; targetId?: string }[];
  /**
   * The query record (Part D decision D1, amendment A2): present when
   * the utterance questions a slot — the relation the questioned node
   * fills and the expected answer type, held as an expectation, not a
   * rigid rule. A question is never an assertion with a null filler.
   */
  query?: { relation: string; expectedType: string };
  /**
   * The discourse act (Part D decision D2, amendment A1), for
   * utterances that are complete discourse acts without being
   * propositions: a topic proposal, or a bare reason query whose
   * target is a discourse antecedent. Absence means the utterance is
   * propositional (or a bare nominal whose function is
   * discourse-recovered and deliberately unassigned).
   */
  discourseAct?: "topic-proposal" | "reason-query";
}

/* ---------------- Lexicon ----------------
 * Deliberately small: the evaluated vocabulary of the two desk
 * evaluations plus the words the regression tests use. The parser is
 * lexicon- and template-driven over this vocabulary — a mechanism
 * demonstrator, not a general NLP parser (docs/ansci/README.md). */

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
  /** Clausal-complement frame (Transcript Slice 1): this verb may
   *  take a whole clause — an embedded wh-question or a that-clause
   *  — as its complement, in place of the bare-NP filler of its
   *  first slot. The complement clause stands in the meaning graph
   *  under the 'complement' relation (verb → embedded clause root),
   *  not under the slot's own relation: a clause is not an Earth
   *  argument, and generation and the checker read it as a clause.
   *  Set on the hand entry for 'know'; the parser's know-class
   *  (parse.ts) extends the same construction to the cognition /
   *  report verbs it can resolve, whose derived entries carry no
   *  flag of their own. */
  clausalComplement?: boolean;
  forms: { base: string; third: string; past: string; participle: string };
  semanticElement?: Element;
  /** Provenance of this entry: set when the WordNet lexicon provider
   *  (wordnet-lex.ts) derived it at runtime instead of the hand lexicon. */
  source?: "wordnet";
  /** FrameNet frame signature backing this entry's slots, when the
   *  framenet-lex provider supplied them (Part C.4): the slots are
   *  frame evidence, not a permissive default. Absent on hand-lexicon
   *  entries (their frames are the lexicon's own) and on derived
   *  entries with no FrameNet LU (evidence-free, permissive). */
  frameSignature?: { frame: string; luId: number; slots: string[]; required: string[] };
  /** VerbNet coverage backing this entry's valency CHECK, when the
   *  verbnet-lex provider found the lemma in VerbNet 3.3 and no
   *  FrameNet signature was supplied (verbnet-lex.ts): the classes
   *  the verb belongs to and the argument shapes its frames allow
   *  (post-verbal bare-NP count + prepositional-argument presence,
   *  per frame). The entry's slots stay the permissive fallback —
   *  VerbNet evidence CHECKS the realised structure in check.ts
   *  rather than replacing the frame in v1. */
  verbnetSignature?: { classes: string[]; shapes: { np: number; pp: boolean }[] };
}

export interface SimpleEntry {
  kind: "noun" | "adjective" | "adverb" | "pronoun";
  lemma: string;
  element: Element;
  semanticElement?: Element;
  /** Provenance of this entry: set when a lexicon provider derived
   *  it at runtime instead of the hand lexicon — the WordNet
   *  provider (wordnet-lex.ts), or the Link Grammar provider
   *  (linkgrammar-lex.ts), whose noun reading of a form the
   *  WordNet chain leaves unclassified is adopted in parse.ts
   *  under the dictionary's noun-only class evidence. */
  source?: "wordnet" | "linkgrammar";
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
en(v("give", ["recipient", "theme"], ["recipient", "theme"], { base: "give", third: "gives", past: "gave", participle: "given" }), "give", "gives", "gave", "given");
en(v("bite", ["patient"], ["patient"], { base: "bite", third: "bites", past: "bit", participle: "bitten" }), "bite", "bites", "bit", "bitten");
en(v("go", [], [], { base: "go", third: "goes", past: "went", participle: "gone" },
  { prepSlot: { slot: "goal", preps: ["to"] } }), "go", "goes", "went", "gone");
en(v("have", ["theme"], ["theme"], { base: "have", third: "has", past: "had", participle: "had" }), "have", "has", "had");
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
/* Transcript Slice 1: 'know' enters the hand lexicon. Until this
 * entry it reached the parser only through the WordNet fallback
 * (FrameNet 'Familiarity': one theme slot, nothing required at the
 * VerbEntry level), so the verb at the centre of the know-questions
 * was among the least-specified in the lexicon (diagnosis K2) and
 * no frame anywhere said it could take a clause. The NP frame is
 * the fallback's own — slots ["theme"], required [] — so every
 * know + NP parse keeps the shape it has always had; what the hand
 * entry adds is the irregular forms as the lexicon's own record
 * and the clausal-complement frame: "know who i am", "know that
 * you are here" fill the theme's place with a clause, under the
 * 'complement' relation.
 * Registered under the LEMMA only, deliberately: the inflected
 * surfaces reach this entry by lemma through the verb-slot
 * fallback's hand-entry precedence (the same adoption that gives
 * an unregistered surface of 'make' the hand frame), so no parse
 * changes — but registering the surface 'knows' itself made it a
 * hand-vocabulary correction target for the token matcher, and
 * with the WordNet provider off "blows" then "corrected" to
 * 'knows' (edit distance 2) and parsed, where the provider-off
 * parity test (fork-wordnet.test.ts) pins its failure. A hand
 * surface is a correction target; a hand lemma is a frame. */
en(v("know", ["theme"], [], { base: "know", third: "knows", past: "knew", participle: "known" },
  { clausalComplement: true }), "know");

/* English nouns / pronouns / adjectives / adverbs. */
for (const n of ["cook", "onions", "book", "table", "ladder", "dog", "man", "school", "news",
  "cat", "roof", "horse", "barn", "king", "bananas", "soup", "salt", "summer", "bread", "cake", "pot",
  "today", "monday", "holiday"])
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
en(simple("pronoun", "her", "Earth", { person: "3sg" }), "her");
en(simple("pronoun", "me", "Earth", { person: "1sg" }), "me");
en(simple("pronoun", "us", "Earth", { person: "1pl" }), "us");
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
en(simple("adverb", "first", "Water"));

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
zh(v("有", ["theme"], ["theme"], { base: "有" }));
zh(v("看", ["patient"], [], { base: "看" }));
zh(v("喝", ["patient"], [], { base: "喝" }));
zh(v("喜欢", ["patient"], [], { base: "喜欢" }));
zh(v("来", [], [], { base: "来" }));
zh(v("游泳", [], [], { base: "游泳" }));
/* 想 heads a serial chain: its complement is the following verb,
 * chained by the ordinary serial machinery — which is also what
 * gives preverbal negation its scope （他不想去学校 negates 想，
 * not 去）. */
zh(v("想", [], [], { base: "想" }));
zh(simple("noun", "饭", "Earth"));
zh(simple("noun", "茶", "Earth"));
zh(simple("noun", "猫", "Earth", { classifier: "只" }));
zh(simple("noun", "书", "Earth", { classifier: "本" }));
zh(simple("noun", "桌子", "Earth", { classifier: "张" }));
zh(simple("noun", "冬天", "Earth", { semanticElement: "Water" }));
zh(simple("noun", "学校", "Earth"));
zh(simple("noun", "北京", "Earth"));
/* Copula-complement professions （他是老师）: Earth nouns like any
 * other nominal predicate. */
zh(simple("noun", "老师", "Earth"));
zh(simple("noun", "医生", "Earth"));
/* Nominal predication vocabulary （今天星期一）: time nominals and the
 * weekday names as Earth nouns. */
zh(simple("noun", "今天", "Earth"));
for (const d of ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日", "星期天"])
  zh(simple("noun", d, "Earth"));
zh(simple("noun", "节日", "Earth"));
zh(simple("pronoun", "我", "Earth", { person: "1sg" }));
zh(simple("pronoun", "你", "Earth", { person: "2" }));
zh(simple("pronoun", "他", "Earth", { person: "3sg" }));
zh(simple("pronoun", "她", "Earth", { person: "3sg" }));
zh(simple("adjective", "冷", "Fire", { semanticElement: "Water" }));
zh(simple("adjective", "高", "Fire"));
zh(simple("adjective", "快", "Fire"));
zh(simple("adjective", "贵", "Fire"));
zh(simple("adjective", "忙", "Fire"));
zh(simple("pronoun", "什么", "Earth", { question: true }));

/** ZH function words: not content nodes, but the connective/scope layer needs their kinds. */
export const ZH_FUNCTION: Record<string, string> = {
  "了": "aspect-particle",
  "着": "aspect-particle",
  "过": "aspect-particle",
  "吗": "question-particle",
  "吧": "attitude-particle",
  "不": "negation",
  "没": "negation",
  "是": "copula",
  "会": "modal",
  "没有": "negation",
  "把": "ba-marker",
  "被": "bei-marker",
  "在": "preposition",
  "上": "locative-suffix",
  "很": "degree",
  "就": "chain-marker",
  "本": "classifier",
  "只": "classifier",
  "条": "classifier",
  "张": "classifier",
  "匹": "classifier",
  "头": "classifier",
  "件": "classifier",
  "个": "classifier",
  "棵": "classifier",
  "朵": "classifier",
  "辆": "classifier",
  "间": "classifier",
  "封": "classifier",
  "首": "classifier",
  "三": "numeral",
  "一": "numeral",
  "二": "numeral",
  "两": "numeral",
  "四": "numeral",
  "五": "numeral",
  "六": "numeral",
  "七": "numeral",
  "八": "numeral",
  "九": "numeral",
  "十": "numeral",
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
