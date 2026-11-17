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

/** The act kinds an object can carry. Extended per slice, never
 *  renamed: slice 1 — the kinds the loop already distinguishes;
 *  later slices add the social acts (greeting, closing, …). */
export type ObjectKind =
  | "statement"
  | "question"
  | "topic-proposal"
  | "reason-query"
  | "greeting"
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
  };
  content: {
    meaning: MeaningGraph;
    connective: ConnectiveGraph;
    holes: ObjectHole[];
    grounding: GroundingMark[];
  };
  aspects: AspectReading[];
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
