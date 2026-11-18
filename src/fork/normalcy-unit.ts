/**
 * normalcy-unit.ts — the NormalcyUnit: the system's
 * medium-neutral authority on the NORMALCY of a communication,
 * sitting in the OntologyCore (ai-system/ontology-core/
 * normalcy-unit), beside the SenseUnit and the EDU.
 *
 * What this authority holds is the framework: the dimensions
 * along which a communication can be unremarkable or odd, and
 * the standards by which each is judged. It holds no medium
 * content: language reaches it through the LPU's
 * NormalcyAssessment (normalcy-assessment.ts), and a future
 * image bridge will reach it the same way — the EDU/SenseUnit
 * settlement, one slice over.
 *
 * THE GOVERNING PRINCIPLE (the owner's words, 2026-11-17):
 * external tables are used "for knowledge for the ontology
 * units about what is happening in the communications but not
 * to direct its values". Two tables are filed here as this
 * unit's knowledge about words:
 *  - wordfreq (data/wordfreq/): how often a word is used
 *    (Zipf frequency) — CC BY-SA 4.0 data;
 *  - the Glasgow Norms (data/glasgow/): how words are rated on
 *    nine psycholinguistic dimensions — CC BY 4.0.
 * Their values enter the system ONLY as labelled,
 * provenance-carrying facts (the accessors below return the
 * value WITH its source, or nothing). No table number ever
 * sets a price, crosses a threshold, or fires a flag by
 * itself: what counts as odd, what a flag costs, and what is
 * replied are the system's own judgements, made by its own
 * machinery (the dimensions and standards below, Coherence's
 * pricing, the Planner's moves). The tables say what a word
 * IS like; the framework says what that MEANS here.
 *
 * THE DIMENSIONS (v1) — each is a way a communication can
 * depart from the unremarkable, judged against a different
 * standing body of knowledge:
 *  - OBVIOUSNESS: the communication asks (or states) what the
 *    OKU's own Classification already settles. The standard is
 *    the system's, stated below: a predication is obvious iff
 *    the Classification settles it without testimony.
 *  - SELF-REDUNDANCY: the communication asks what the
 *    conversation's own record already settles — the speaker
 *    stated it, or it was answered. Judged against the Session
 *    record, by the bridge.
 *  - GIBBERISH: no content arrived — the utterance's content
 *    tokens could not be resolved to words the system knows.
 *    The only GRADED dimension in v1, and the grading is
 *    evidence, not a score that acts: token-resolution failure
 *    is what raises the flag; frequency and familiarity facts
 *    only say how strong the evidence stands.
 *
 * A flag is an INTERNAL reading. It is written on the
 * information object's envelope (it describes the
 * communication, never the content — the wall), priced by
 * CoherenceAnalysis by KIND, and recorded as an Awareness-side
 * note on the turn's trace. No reply ever speaks a flag or a
 * verdict about oddity: the outward communication is the
 * socially normal reply the situation calls for ("You said
 * so."), and the oddity stays where the specimen puts it —
 * an internal thought.
 */
import { seasonDegreeProfile } from "../engine";
import type { Graph } from "../graph";
import { lookupClassification } from "./classify";
import { getDefaultWordFreqTable } from "../wordfreq";
import {
  glasgowTableForUse,
  type GlasgowDimension,
  type GlasgowEntry,
} from "../glasgow";

/* ------------------------------------------------------------------ */
/* Flags                                                               */
/* ------------------------------------------------------------------ */

export type NormalcyFlagKind = "obviousness" | "self-redundancy" | "gibberish";

/** A labelled fact a flag rests on: what is known, and whose
 *  knowledge it is. Facts are the ONLY form in which external
 *  table values travel — a number never appears in the system
 *  without its provenance attached. */
export interface NormalcyKnowledge {
  source: string;
  fact: string;
}

export interface NormalcyFlag {
  kind: NormalcyFlagKind;
  /** What the communication shows, in words — the reading. */
  detail: string;
  /** The graded strength of the evidence (gibberish only in
   *  v1): a label the pricing may read, never a number that
   *  prices. */
  strength?: "strong" | "moderate";
  /** The labelled knowledge the reading rests on. */
  knowledge: NormalcyKnowledge[];
  /** Structured evidence for the reply moves (the record state
   *  a self-redundancy flag rests on; the subject/quality an
   *  obviousness flag names). */
  data?: Record<string, unknown>;
  /** CoherenceAnalysis's pricing of this flag, by kind — set
   *  by priceNormalcyFlags (coherence.ts). Absent until priced. */
  priced?: { by: string; standing: string };
}

export const NORMALCY_DIMENSIONS: { kind: NormalcyFlagKind; standard: string }[] = [
  {
    kind: "obviousness",
    standard:
      "a predication is obvious iff the OKU Classification settles it without testimony — " +
      "in v1, a kind's classifying quality: the quality the kind's own degree profile files as dominant for that aspect",
  },
  {
    kind: "self-redundancy",
    standard:
      "a question is self-redundant iff the conversation's own record already settles it — " +
      "the speaker stated the very predication, or the same question stands answered in the stream",
  },
  {
    kind: "gibberish",
    standard:
      "an utterance is gibberish when no content arrived: its content tokens failed token resolution " +
      "and none is attested as a real word by the filed knowledge (wordfreq / the Glasgow Norms); " +
      "frequency and familiarity facts grade the evidence, they never raise the flag",
  },
];

/* ------------------------------------------------------------------ */
/* The obviousness standard: a kind's classifying quality              */
/* ------------------------------------------------------------------ */

/** The degree profile's aspect set — the same membership table
 *  the turn loop composes season answers over (turn.ts's
 *  SEASON_PROFILE_SET), filed here because the standard is the
 *  authority's: for each profile aspect, its two polarity
 *  quality names. */
export const PROFILE_ASPECTS: { aspect: "temperature" | "light"; yin: string; yang: string }[] = [
  { aspect: "temperature", yin: "cold", yang: "warm" },
  { aspect: "light", yin: "dark", yang: "bright" },
];

export interface ClassifyingQuality {
  subject: string;
  quality: string;
  aspect: string;
  /** The subject profile's yin share for the aspect (0..1). */
  share: number;
  /** The quality the profile files as dominant for the aspect. */
  dominant: string;
}

/**
 * The obviousness determination, in the Classification's own
 * terms: `quality` is `subject`'s CLASSIFYING quality when the
 * subject carries a degree profile (the Classification's
 * degree record for the kind) and the quality is the profile's
 * dominant quality for the quality's aspect. "Is winter
 * cold?" asks exactly this; "Is winter dark?" likewise (the
 * light aspect); "Is winter warm?" does not — warm is not
 * what winter's profile files as dominant for temperature.
 * A subject with no profile, or a quality outside the profile
 * aspects, is not settled by the Classification in this sense
 * — the determination abstains rather than generalising.
 */
export function classifyingQuality(
  graph: Graph,
  subjectLemma: string,
  qualityLemma: string,
): ClassifyingQuality | undefined {
  const subjectNode = graph.nodeByName(subjectLemma);
  if (!subjectNode) return undefined;
  const profile = seasonDegreeProfile(graph, subjectNode.id);
  if (!profile) return undefined;
  const qualityNode = graph
    .allNodes()
    .find((n) => n.type === "Quality" && (n.name === qualityLemma || graph.synonymsOf(n).includes(qualityLemma)));
  if (!qualityNode) return undefined;
  /* The asked quality must BE the profile's filed name for its
   * side — not merely a synonym of it. The graph files 'hot' as
   * a synonym of the 'warm' quality node, but "Is summer hot?"
   * is not the definition's own wording: the link from the
   * asked word to the filed quality is exactly what a
   * derivation walks, priced. The definitional settlement is
   * for the predication the profile itself states. */
  const entry = PROFILE_ASPECTS.find((e) => e.yin === qualityLemma || e.yang === qualityLemma);
  if (!entry) return undefined;
  if (qualityNode.name !== entry.yin && qualityNode.name !== entry.yang) return undefined;
  const share = profile.aspects[entry.aspect];
  if (share === undefined) return undefined;
  const dominant = share >= 0.5 ? entry.yin : entry.yang;
  if (qualityLemma !== dominant) return undefined;
  return { subject: subjectLemma, quality: qualityLemma, aspect: entry.aspect, share, dominant };
}

/** The Classification facts an obviousness reading rests on,
 *  as labelled knowledge. */
export function obviousnessKnowledge(graph: Graph, cq: ClassifyingQuality): NormalcyKnowledge[] {
  const facts: NormalcyKnowledge[] = [];
  const sc = lookupClassification(cq.subject);
  if (sc) {
    facts.push({
      source: "OKU classification table",
      fact: `'${cq.subject}' is classified as '${sc.concept}' (${sc.aspect}, ${sc.element})`,
    });
  }
  const qc = lookupClassification(cq.quality);
  if (qc) {
    facts.push({
      source: "OKU classification table",
      fact: `'${cq.quality}' is classified as '${qc.concept}' (${qc.aspect}, ${qc.element})`,
    });
  }
  facts.push({
    source: "OKU degree profile (the Classification's degree record)",
    fact:
      `'${cq.subject}'s ${cq.aspect} profile files '${cq.dominant}' as its dominant quality ` +
      `(yin share ${cq.share}) — the predication is settled by the classification itself, without testimony`,
  });
  return facts;
}

/* ------------------------------------------------------------------ */
/* Filed knowledge about words: wordfreq + the Glasgow Norms           */
/* ------------------------------------------------------------------ */

/** A word's filed frequency fact (wordfreq): its Zipf value
 *  with provenance, or undefined when the word is not attested
 *  in the filed table (below the trim floor, or not a word the
 *  source knows) or the table is absent. Absence is reported
 *  as absence — never as a measured zero. */
export function wordFrequencyOf(word: string): { zipf: number; source: string } | undefined {
  const table = getDefaultWordFreqTable();
  if (!table) return undefined;
  const zipf = table.zipf.get(word.toLowerCase());
  if (zipf === undefined) return undefined;
  return { zipf, source: `wordfreq (${table.edition})` };
}

/** A word's Glasgow Norms entry — all nine dimensions, as
 *  published — or undefined when the word is not in the table
 *  or the layer is absent/withheld. Disambiguated
 *  presentations are filed under their full published string;
 *  this lookup is by the bare word's own row. */
export function glasgowEntry(word: string): GlasgowEntry | undefined {
  const table = glasgowTableForUse();
  if (!table) return undefined;
  return table.entries.get(word.toLowerCase());
}

/** One dimension's labelled fact about a word: the published
 *  mean, with the scale it stands on and its provenance. This
 *  is the ONLY shape in which a Glasgow value travels to a
 *  consumer — knowledge about the communication, labelled,
 *  never a bare number looking for a decision to direct. */
export interface GlasgowFact {
  dimension: GlasgowDimension;
  mean: number;
  sd: number;
  n: number;
  scale: string;
  source: string;
}

const GLASGOW_SCALES: Record<GlasgowDimension, string> = {
  arousal: "9-point (calm ↔ excited)",
  valence: "9-point (negative ↔ positive)",
  dominance: "9-point (controlled ↔ in control)",
  concreteness: "7-point (abstract ↔ concrete)",
  imageability: "7-point (hard ↔ easy to picture)",
  familiarity: "7-point (unfamiliar ↔ familiar)",
  aoa: "7-point (2-year bands: 1 = 0–2 years … 7 = 13+ years)",
  size: "7-point (small ↔ big)",
  gender: "7-point (1 = strongly feminine-associated … 7 = strongly masculine-associated)",
};

export function glasgowFact(word: string, dimension: GlasgowDimension): GlasgowFact | undefined {
  const entry = glasgowEntry(word);
  if (!entry) return undefined;
  const [mean, sd, n] = entry[dimension];
  return {
    dimension,
    mean,
    sd,
    n,
    scale: GLASGOW_SCALES[dimension],
    source: "the Glasgow Norms (Scott et al. 2019)",
  };
}

/** A word's familiarity fact (the Glasgow dimension wired to
 *  NormalcyAssessment in this arc). */
export function familiarityOf(word: string): GlasgowFact | undefined {
  return glasgowFact(word, "familiarity");
}

/* The remaining dimensions' labelled access (the scope
 * extension, 2026-11-17: "prepare for all, high to low").
 * Every accessor below returns the same GlasgowFact shape —
 * the published mean on its labelled scale, with provenance —
 * and every one is KNOWLEDGE for its consumer unit to weigh
 * by its own machinery. None of them sets a price, fires a
 * flag, or decides anything here; what each consumer does
 * with the prior is filed at the consumer's read point. */

/** The affect prior (for the EmotionDesireUnit, read through
 *  its language bridge, the LEDU): a word's valence, arousal
 *  and dominance facts, as one bundle. The EDU's own
 *  derivations remain authoritative — this bundle is word-level
 *  affect KNOWLEDGE the bridge may consult, and it creates no
 *  emotion reading where the EDU derives none. */
export function affectPriorFor(word: string): { valence?: GlasgowFact; arousal?: GlasgowFact; dominance?: GlasgowFact } | undefined {
  const valence = glasgowFact(word, "valence");
  const arousal = glasgowFact(word, "arousal");
  const dominance = glasgowFact(word, "dominance");
  if (!valence && !arousal && !dominance) return undefined;
  return { valence, arousal, dominance };
}

/** A word's concreteness fact (for Senses-Scening /
 *  SemanticAssessment): how concrete the word's referent is
 *  rated — the scene-ability prior. Concrete nouns are
 *  placeable candidates; abstract ones are not placed by
 *  default. A prior the scening machinery weighs, not a rule
 *  of this authority's. */
export function concretenessOf(word: string): GlasgowFact | undefined {
  return glasgowFact(word, "concreteness");
}

/** A word's imageability fact: how readily the word calls up
 *  a mental image. Prepared for the imaging side: there is no
 *  imaging-scening unit in the registry (the Senses-Scening
 *  placeholder records the slot — the "Imaging-Scening"
 *  framing it superseded), so in v1 this access path is
 *  deliberately UNCONSUMED: the labelled path exists, no
 *  consumer reads it yet. */
export function imageabilityOf(word: string): GlasgowFact | undefined {
  return glasgowFact(word, "imageability");
}

/** A word's semantic-size fact (for the QuantificationUnit /
 *  scene placement): the felt magnitude of the word's
 *  referent, available when weighing default placements and
 *  size predications. A prior, weighed by the consumer's own
 *  machinery; it moves no placement by itself in v1. */
export function semanticSizeOf(word: string): GlasgowFact | undefined {
  return glasgowFact(word, "size");
}

/** A word's age-of-acquisition fact (for token resolution /
 *  Awareness): the age band at which the word is typically
 *  acquired. Late-acquired words are likelier comprehension-gap
 *  candidates — knowledge for the gap machinery, never an
 *  assumption about the person speaking. */
export function ageOfAcquisitionOf(word: string): GlasgowFact | undefined {
  return glasgowFact(word, "aoa");
}

/** A word's gender-association fact — GUARDED KNOWLEDGE
 *  (the strictest preparation in the arc): the labelled access
 *  path exists so an ontology unit may KNOW a word's
 *  association strength as a fact about the communication.
 *  In v1 its values must not change any price, any flag, any
 *  referent or pronoun decision, or any reply — preparation is
 *  the access path and its labelling; consumption is
 *  knowledge-only. Pinned by test (fork-glasgow-priors.test.ts):
 *  a strongly-gendered word in an ordinary sentence produces
 *  identical pricing, flags and reply with the dimension's
 *  layer present vs withheld. */
export function genderAssociationOf(word: string): GlasgowFact | undefined {
  return glasgowFact(word, "gender");
}

/** Whether a word is ATTESTED as a real word by the filed
 *  knowledge — present in wordfreq's table or in the Glasgow
 *  Norms. Attestation is the gibberish standard's guard: a
 *  rare real word (low frequency, low familiarity) is still a
 *  word, and never counts as content that failed to arrive. */
export function wordAttested(word: string): { attested: boolean; by: string[] } {
  const by: string[] = [];
  if (wordFrequencyOf(word)) by.push("wordfreq");
  if (glasgowEntry(word)) by.push("the Glasgow Norms");
  return { attested: by.length > 0, by };
}
