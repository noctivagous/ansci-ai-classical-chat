/**
 * semantic-object.ts — the semantic object: the system's internal
 * currency (owner's direction, 2026-11-16: the system works with
 * semantic objects and pushes them out as language — image, video
 * later).
 *
 * An object is the assessment of one utterance as a whole, packaged
 * to travel: created once (by SemanticAssessment for what arrives,
 * by the Planner for what the system will say), passed by reference
 * through the turn, annotated on its trail by every unit that
 * processes it, and stored by the session as a node in the stream's
 * graph of objects.
 *
 * Standing constraints from the design:
 *  - NO WORDING lives in an object, and nothing medium-specific:
 *    wording is a realiser's business, so the same object stays
 *    renderable as language now, image or video later.
 *  - RETENTION: every aspect records the concrete value (the
 *    emotion as named, the time as read — 3:50PM, the day, the
 *    year) ALONGSIDE any classification; a classification is a
 *    lossy layer over a lossless record, never a replacement.
 *  - Classification attaches to ASPECTS of the object, never to
 *    the object wholesale.
 *
 * Population is sliced (see ai-system/lpu/semantic-assessment/
 * PLACEHOLDER.md, "Code design"): slice 1 creates objects for the
 * kinds the turn loop already distinguishes, with holes only where
 * the parse itself names them; aspects and composition arrive in
 * slice 3, reply objects in slice 4.
 */
import type { ConnectiveGraph, MeaningGraph, TokenResolution } from "./sentence";
import type { Composition } from "./composition";
import type { QuantityMention } from "./quantification";

/** The act kinds an object can carry. Extended per slice, never
 *  renamed: slice 1 — the kinds the loop already distinguishes;
 *  later slices add the social acts (greeting, closing, …). */
export type ObjectKind =
  | "statement"
  | "question"
  | "topic-proposal"
  | "reason-query"
  | "greeting"
  | "leave-taking"
  | "thanks"
  | "self-query"
  | "reply";

export type StreamRole = "opens" | "answers" | "continues" | "corrects" | "closes";

/** A hole: something the object's kind normally carries that this
 *  utterance leaves unexpressed, held as an explicit node of the
 *  content so a reader finds it structurally. Slice 1 knows the
 *  two question holes the parse itself draws: a wh-question's
 *  questioned slot (ParsedSentence.query), and a polar question's
 *  questioned predication (the root carries interrogative mood
 *  and no query record — what is open is whether the predication
 *  holds). */
export type ObjectHole =
  | { kind: "questioned-slot"; relation: string; expectedType: string }
  | { kind: "questioned-predication"; relation: string; expectedType: "polarity" }
  /** A feeling stated with its cause unexpressed. Added by
   *  CoherenceAnalysis (coherence.ts), not by the assessment:
   *  what an utterance IS is the assessment's record; what it
   *  lacks, against the situation, is the coherence reading. */
  | { kind: "unexpressed-cause"; of: string };

/** Where an entity in the content stands with the stream:
 *  established (already in the record), new (first mention), or
 *  ungrounded (a definite reference with no referent — slice 1
 *  does not mark ungrounded; the parse does not yet say which
 *  references are definite). */
export interface GroundingMark {
  nodeId: string;
  lemma: string;
  status: "established" | "new" | "ungrounded";
}

/** One classified aspect of the object. `value` is the concrete,
 *  retained reading (a word, a clock time, a date); the elemental
 *  reading rides alongside it, with its tier and provenance.
 *  Populated from slice 3. */
export interface AspectReading {
  /** "emotion" | "desire" | "temporal" | "quality" | "domain" | … */
  aspect: string;
  value: string;
  element?: string;
  tier?: string;
  confidence?: number;
  source?: string;
}

/** The six sense channels (六根, the six roots): the inventory
 *  the SenseUnit (sense.ts) is the authority over. */
export type SenseChannel = "sight" | "hearing" | "smell" | "taste" | "touch" | "mind";

export const SENSE_CHANNELS: SenseChannel[] = ["sight", "hearing", "smell", "taste", "touch", "mind"];

/** One sensory entry in the senses face: a value the sentence
 *  SAYS, on one channel. `value` is the word as said (retention);
 *  the discrimination is what the channel distinguishes (colour,
 *  flavour, temperature, …); element/tier/source carry the OKU's
 *  filed reading where one exists. Implied channels/values never
 *  appear here — they are Coherence's derived-tier trail
 *  annotations, not entries. */
export interface SenseEntry {
  nodeId: string;
  value: string;
  discrimination?: string;
  element?: string;
  tier?: string;
  source?: string;
}

/** A spatial relation in a scene fragment, with its tier kept
 *  distinct (the spatial-faculty design, 2026-11-17):
 *  - "said": the sentence states it (the fountain between the
 *    bathrooms);
 *  - "placed-by-scene": placement in the running scene gives it
 *    (the fountain in the airport);
 *  - "default-placed": the spatial faculty's own coarse placement
 *    for an entity with no stated/placed location (the bathrooms
 *    somewhere in-or-near the airport) — a region, never
 *    coordinates or invented specifics; the exact position stays
 *    an unknown slot on the entity.
 *  figure/ground are lemmas (scene-graph grain); the node ids are
 *  carried when the relation comes from this fragment's graph. */
export interface SceneRelationRecord {
  figure: string;
  figureNodeId?: string;
  relation: string;
  ground: string;
  groundNodeId?: string;
  tier: "said" | "placed-by-scene" | "default-placed";
  basis?: string;
}

/** The scene part of the senses face: this fragment's reference
 *  to the conversation's PERSISTENT scene graph (session.ts).
 *  The face references the running scene by id and records what
 *  this turn adds — it is not a detached per-utterance scene. */
export interface SceneFace {
  /** The running scene's id in Session's scene storage. */
  id: string;
  /** establishes: this turn started the scene. extends: the
   *  fragment was placed into an already-established scene.
   *  references: a reply object naming the standing scene
   *  (reply faces never mutate the scene graph in v1). */
  role: "establishes" | "extends" | "references";
  /** Node ids of this fragment's described entities. */
  entities: string[];
  /** Spatial relations this fragment states (tier "said"). */
  arrangements: SceneRelationRecord[];
  /** Relations placement gives (tier "placed-by-scene" or
   *  "default-placed"), labelled — never recorded as said. */
  placed: SceneRelationRecord[];
  unknownsOpened: { of: string; kind: string }[];
  unknownsFilled: { of: string; kind: string; value: string }[];
}

/** The senses face of a semantic object (2026-11-17): every
 *  channel present or none (null), plus the scene the entries
 *  bind into when the fragment carries scene content. Produced
 *  by the Senses-Scening Unit (senses-scening.ts) over the
 *  SenseUnit's authority (sense.ts), at assessment for person
 *  objects and at authoring for reply objects. */
export interface SensesFace {
  channels: Record<SenseChannel, SenseEntry[] | null>;
  scene?: SceneFace;
}

/** A signed annotation on the object's trail: one unit's
 *  processing of the object, attributed. The object stays the
 *  producer's; the trail is the system's record of what was done
 *  with it. */
export interface TrailAnnotation {
  unit: string;
  note: string;
  data?: Record<string, unknown>;
}

export interface SemanticObject {
  id: string;
  turn: number;
  /** Who authored the object: the person (an assessed utterance)
   *  or the system (a reply object, slice 4). */
  producer: "person" | "system";
  /** The surface text the object was assessed from — retained,
   *  per the retention rule. Reply objects carry no surface. */
  surface?: string;
  tokenResolutions?: TokenResolution[];
  act: {
    kind: ObjectKind;
    /** The utterance's grammatical form (the root's mood). */
    form: string;
    /** What the act is doing. In v1 force equals kind except
     *  where form and force visibly split; the split is priced
     *  properly when the social acts land. */
    force: string;
    /** Ritual exchanges (the greeting's "How are you?" and its
     *  "Fine.") are recorded AS ritual, never banked as reports.
     *  Nothing is ritual in slice 1. */
    ritual: boolean;
    streamRole: StreamRole;
    /** Present on self-query objects (Social Unit S1, 2026-11-18):
     *  what the question asks about the system itself. "identity"
     *  is the shape the sentence layer draws today ("Who are
     *  you?", "What are you?"); "capability" is reserved — the
     *  modal shapes it needs ("What can you do?") do not parse
     *  yet, a located sentence-layer gap. */
    selfQuery?: "identity" | "capability" | "fact" | "ability";
    /** Present on self-query objects of the "fact" flavour
     *  (conversation-shapes C3, 2026-11-18): the matter the
     *  question asks after, as spoken ("pets", "rank",
     *  "birthplace", "occupation") — a fact about the system
     *  the Self tables do not hold, whose honest answer is the
     *  plain denial the Planner composes from the limits
     *  facts. On "ability" objects (IMP-2, 2026-11-19) it
     *  carries instead the lexical verb of the polar verb
     *  question ("swim", "eat"), and abilityModal records the
     *  frame — modal ("Can you swim?") or bare present ("Do
     *  you eat meat?") — the denial is composed in. */
    selfFact?: string;
    abilityModal?: boolean;
    /** Present on statement objects whose wondering frame
     *  poses a question about the world (IMP-2, 2026-11-19):
     *  the embedded matter as spoken ("life insurance") and
     *  its head lemma, against which the Planner verifies
     *  the net's absence before locating the decline at
     *  knowledge. */
    posedMatter?: string;
    posedMatterHead?: string;
    /** Present on tell-me request objects (IMP-2,
     *  2026-11-19): the about-phrase as spoken ("the
     *  Prisoner of Azkaban") and its head lemma. */
    tellMatter?: string;
    tellMatterHead?: string;
    /** Present on greeting objects that are the wellbeing query
     *  ("How are you?" — conversation-shapes C1, 2026-11-18): the
     *  greeting's ritual exchange, recognised as a greeting in
     *  kind and marked here so the Planner answers it with the
     *  wellbeing move rather than the greeting mirror. */
    wellbeing?: boolean;
    /** Present on question objects that are the visitor's own
     *  clarification request ("What do you mean?" —
     *  conversation-shapes C5, 2026-11-18): the visitor asks
     *  what the SYSTEM meant, and the designed response is a
     *  restatement of the system's last substantive reply, from
     *  the record of what it actually said. Marked here so the
     *  Planner answers it with the restatement move rather than
     *  routing it to the question path, which declined it
     *  ("nothing you have told me says what was meant"). */
    meanQuery?: boolean;
    /** Present on question objects that are the visitor's
     *  offer of help ("Can I help you?" — S2, the S programme,
     *  2026-11-19): a social act in question dress — the
     *  visitor offers the system a service, and the designed
     *  response receives the offer as the act it is and
     *  answers it in kind. Marked here so the Planner answers
     *  it with the offer move rather than routing it to the
     *  question path, which declined it as a question-type
     *  mismatch (run 2: P-065, P-066, P-070). */
    offerHelp?: boolean;
    /** Present on question objects that pose the either/or
     *  form (S2, the S programme, 2026-11-19): a question
     *  whose answer space is presented as two named
     *  alternatives, addressed to the system. "preference"
     *  asks which of the two the system prefers ("Do you
     *  prefer milk or dark?"); "being" asks which of the two
     *  the system is ("Are you an aunt or uncle yet?"). The
     *  question path read both as property questions about
     *  the alternatives and declined; the either/or is its
     *  own form, answered from the limits facts. */
    choiceQuery?: "preference" | "being";
    /** The two alternatives of a "being" choice, as noun
     *  phrases with their articles ("an aunt", "an uncle"),
     *  in the surface's order — the material the neither-form
     *  answer is composed from. */
    choiceAlternatives?: [string, string];
  };
  content: {
    meaning: MeaningGraph;
    connective: ConnectiveGraph;
    holes: ObjectHole[];
    grounding: GroundingMark[];
  };
  aspects: AspectReading[];
  /** The senses face: per-channel sensory entries (present or
   *  none) and the scene reference, produced by the
   *  Senses-Scening Unit at creation (2026-11-17). */
  senses: SensesFace;
  /** The quantity mentions the QuantificationLanguageUnit
   *  read from the utterance (2026-11-17): stated and implied
   *  quantities, with the OKU Numbers reading attached where
   *  the slice files one. Present only when the utterance
   *  carries quantity content; the turn loop applies the
   *  mentions to the Session's ledger after the object is
   *  recorded (quantification.ts). Reply objects carry none
   *  in v1. */
  quantities?: QuantityMention[];
  /** The aspects rolled up: a ranked predominance list, the
   *  disposition format. Computed in slice 3. */
  composition?: Composition;
  /** The assessment's own confidence in this reading. */
  confidence: number;
  links: {
    /** The previous object in the stream, if any. */
    follows?: string;
    /** The object whose hole this one fills (slice 2+). */
    fills?: string;
    /** The object this one supersedes (slice 2+). */
    supersedes?: string;
  };
  trail: TrailAnnotation[];
}
