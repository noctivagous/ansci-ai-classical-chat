/**
 * turn.ts — one conversational turn of the fork (Slice C).
 *
 * Pipeline: parse (sentence layer) → record (session situation) →
 * reason (join derivations + the two cycles) → reply.
 *
 * Reply discipline, per the design's transcript gate (§5.1):
 *  - the reply is composed from the SITUATION (what the person said,
 *    taken up in second person) plus ONE steering choice made by the
 *    cycles, and the trace names that choice per turn;
 *  - steering by cycle: a state whose element GENERATES the next
 *    content is followed in the generating direction (toward its
 *    expression); a state that CONTROLS an earlier state is addressed
 *    itself, to release what it restrains; an expression already
 *    vented is met from the restraining side;
 *  - questions the net can answer are answered FROM the derivation
 *    path (shared-prior join), rendered in plain words;
 *  - when the net has no testimony, the turn declines in shape and
 *    names what is missing (AnSci's abstention discipline);
 *  - the ontology is NEVER named on the surface: no element, polarity
 *    or cycle vocabulary appears in replies (a test scans for it).
 *    Trace text is internal and may name the machinery.
 *
 * R0 (reply-planning programme, design note §9/§10) adds trace and
 * record structure only — no reply behaviour changes. The trace now
 * opens with the session's disposition composition (§9.1); where
 * the steering rests on a derivation, the derivation's strength
 * price is computed via pricing.ts and recorded beside it (§9.2),
 * not acted on; and the trace flags the turns whose steering was
 * selected by a generating relation (§9.3's audit hook — see
 * generatingMargin below).
 *
 * R4 (design note §7.4/§9.1, disposition.ts) makes the session's
 * disposition LIVE: at the restrainer junction it selects between
 * the two grounded steering moves, and at the planner's speaking
 * sites the prices, orderings and spoken set are computed through
 * its bias channels. Every application is recorded in the trace
 * (dispositionBias). Under the default neutral disposition nothing
 * fires and every behaviour above is the pre-R4 behaviour.
 *
 * R5 (design note §8.7 S3/S12/S14, T-R5) adds three construction
 * rules. Cohesion: at the question site, a reply earns a
 * connective marker only when its relation to the record exists
 * (return for a reactivated topic, contrast for content that
 * controls a standing state), detected in detectCohesion and
 * recorded in the trace. Correction: a statement whose new state
 * corrects a standing one (the trigger rule is findCorrection's)
 * supersedes it, and the turn's reply is the planner's delta
 * graph — the acknowledgement is the recorded delta, nothing
 * else. And the venting steering passes over negated states: a
 * corrected 'not furious' is not a state an event vents.
 *
 * R6 (design note §8.10/§8.1, T-R6) adds the session-level step
 * and the trace header's frame. After the reply is formed, a
 * bounded initiative scan (applyInitiative, below the turn
 * body) looks for a session-level gap — a standing classified
 * state whose generating direction has gone unexpressed, or a
 * valency gap persisting on a standing event — and, when every
 * gate holds (the person's turn presented no question or gap
 * of its own; the reply is no decline or correction and does
 * not end with a question; the bound of one move in any five
 * turns permits), appends ONE planner-built move taking that
 * thread up. No gap in the record, no move: initiative never
 * manufactures an opening. The trace header now also carries
 * the session's role composition and, when the shell supplied
 * one, its awareness frame (§8.1) — record and header content
 * only in this slice; no steering site reads the frame.
 *
 * R7.5 (design note §11.4's second clause, T-R7.5) closes the
 * finding R7's dashboard check recorded: the predication
 * question site now reads the record BEFORE deriving. When a
 * standing state of the asked subject occupies the asked
 * quality's aspect slot (the R5 aspect determination), the
 * record answers — the reply predicates the standing state,
 * built by the planner's record graph, with no pricing
 * fabricated for it — and the question's own fresh recording
 * of the asked quality is set aside rather than left standing
 * beside the state that answered. A why-question is answered
 * from the record only when the standing state contradicts
 * its presupposition; when the standing state IS the asked
 * predication, the why asks for the derivation itself and
 * the derivation answers as before. Where no standing state
 * occupies the slot, the site is exactly the pre-R7.5 site.
 */
import { seasonDegreeProfile } from "../engine";
import { EN_LEXICON, type MeaningNode, type ParsedSentence, type TokenResolution, type VerbEntry } from "./sentence";
import { CONTROLS, GENERATES, type Element } from "./sentence";
import { enIsFunctionWord, parse } from "./parse";
import { isAttestedWord } from "./token-resolve";
import { classificationsOf, lookupClassification, type ClassificationEntry } from "./classify";
import { climbClassification, climbRecognitions } from "./wordnet-lex";
import { derive, type Derivation, type DerivedConclusion } from "./join";
import { classifiedOrigin, holderOf, recordEntity, resolvePronoun, supersedeRecord, supersedeState, type FrameRecord, type Session, type StateRecord, type SupersessionRecord, type TopicRecord } from "./session";
import { renderComposition } from "./composition";
import { priceDerivation, tierOfProvenance, weakestTier, type PricingRecord, type Tier } from "./pricing";
import { priceWithBoundary, selectMove, type BiasRecord } from "./disposition";
import { COHESION_MARKERS, ROLE_QUESTION_WORD, planClarification, planComposition, planCorrection, planPredication, planRecordPredication, planRoleQuestion, planSelfIdentity, planThanksReceipt, planWellbeingAnswer, serialiseReplyGraph, type CohesionRelation, type CompositionOrder, type DegreeGrade, type PredicationSubject, type PricedConclusion, type QuestionFilledRole } from "./plan";
import { rivalSplits } from "./sense";
import { assessInformation, assessUtterance } from "./assess";
import { SENSE_CHANNELS } from "./semantic-object";
import {
  dischargeAnswerNeed,
  dischargeFilledSceneNeeds,
  informationOf,
  noteHandled,
  seedQuantityNeeds,
  seedSceneNeeds,
} from "./info-object";
import { analyseInbound, analyseOutbound, analyseSenses, compareCompositions, isCorrespondenceTerm, premiseDegree, premiseSupport, priceNormalcyFlags, priceSurvivingNeeds } from "./coherence";
import { closePending, conversationPhase, dischargeDemand, matchPendingFill, noteClarificationAttempt, noteClarifiedSense, openClarification, openStanceRepair, persistInterlocutor, readSocial, recordDisagreement, recordLastReply, requestCapabilities, requestIdentity } from "./social";
import { routeProblemSolving } from "./problem-solving";
import { assessNormalcy, normalcyFlagOf, FUNCTION_WORDS } from "./normalcy-assessment";
import { assessMissingRoles } from "./check";
import { applySceneUpdate } from "./senses-scening";
import { applyQuantityMentions, currentQuantity, latestKindFor } from "./quantification";
import { normaliseKind, parseNumberToken, pluraliseKind, renderQuantity } from "./quantification-language";
import { authorReplyObject } from "./reply";
import { generate } from "./generate";
import { canonicalEmotion, type EmotionKind } from "./edu";
import { uncategorisedEmotionWord } from "./ledu";

export interface TurnTrace {
  turn: number;
  input: string;
  /** Header (§9.1): the session's disposition composition, named
   *  in every turn's trace. Architecture only — never surface. */
  disposition: string;
  /** Header (§8.1): the session's role composition, named beside
   *  the disposition in every turn's trace. A slot in this
   *  slice — no behaviour reads it. Architecture only. */
  role: string;
  /** Header (§8.1): the session's awareness frame, when the
   *  shell supplied one at session opening — the classified
   *  season and daypart, with their origins. Absent when the
   *  session was opened without a frame input. */
  frame?: FrameRecord;
  /**
   * R6 (§8.10, gate 1): the person's own turn presented a
   * question ("question") or a fillable valency gap ("gap") of
   * its own — initiative never fires on such a turn, whatever
   * the reply's shape. Set where the turn loop learns it: the
   * interrogative branches, and the gap computation when it
   * finds a gap (asked or not).
   */
  personPresented?: "question" | "gap";
  /**
   * R6 (§8.10): the standing state this turn's restrainer
   * steering addressed — the state restrained, which the reply
   * took up. Initiative does not re-take, on the same turn, a
   * thread the reply already took up.
   */
  addressedState?: { holder: string; lemma: string; turn: number };
  /**
   * R6 (§8.10): the initiative move appended to this turn's
   * reply, when one fired — its shape, its ground in words
   * (the state and its unexpressed generating direction, or
   * the event and its persisting gap, with the turns elapsed),
   * the move's kind and exact appended sentence, and the
   * pricing when the move is a predication. The move's reply
   * graph is in replyGraph where the turn's own reply built
   * none.
   */
  initiative?: {
    shape: "unexpressed-state" | "persisting-gap" | "standing-feeling" | "topic-return";
    ground: string;
    move: "predication" | "question";
    sentence: string;
    state?: { holder: string; lemma: string; turn: number };
    event?: { verb: string; turn: number; role: string };
    pricing?: PricingRecord;
  };
  parseSummary: string;
  classifications: { concept: string; element: Element; confidence: number; provenance: string }[];
  /** Slice C recognitions: lemmas neither the table nor the climb
   *  classified, whose kind the climb still recognised (a function
   *  category, no element claimed). The decline diagnosis reads
   *  these: the gap is located at classification, not at kind. */
  recognitions: { concept: string; category: string; stopSynset: string }[];
  resolutions: { pronoun: string; resolvedTo: string }[];
  /** Token resolutions from the sentence layer (token-resolve.ts):
   *  words the parser did not recognise and what resolved them —
   *  variant-graph edge, matcher correction, segmentation — or the
   *  unresolved record locating the gap at that token. */
  tokenResolutions: TokenResolution[];
  /** The named cycle arc that steered the reply, when one did. */
  cyclePath?: string;
  /** The derivation path the reply was built from, when one was. */
  derivationPath?: string;
  /** The §9.2 strength price of the derivation the steering rests
   *  on — computed and recorded in R0, not acted on. Absent when
   *  no derivation steered the turn, or when nothing on the path
   *  carries a priceable tier. */
  pricing?: PricingRecord;
  /**
   * R7.5 (§11.4, T-R7.5): the record answer, when the question
   * site answered from the session record instead of deriving —
   * the standing state that answered (its holder, lemma,
   * negated flag and the turn it was recorded), the quality
   * asked, the slot determination in words, the supersession
   * chain for that slot in recorded order, and the recording
   * skip when the question's own fresh state was set aside.
   * A record answer carries NO pricing record and NO
   * derivation path: it is not a ladder derivation, and no
   * tier or support is fabricated for it — the record is the
   * answer's source, and this field names it.
   */
  answeredFromRecord?: {
    state: { holder: string; lemma: string; negated?: boolean; turn: number };
    askedQuality: string;
    slot: string;
    supersessions: {
      replaced: { lemma: string; negated?: boolean; turn: number };
      replacing: { lemma: string; negated?: boolean; turn: number };
      turn: number;
    }[];
    recordingSkipped?: string;
  };
  /**
   * R1 (the recognition programme, 2026-11-19): a question this
   * turn answered from the CONVERSATION RECORD — the general
   * record-first source (GAPS §2's grounding-in-conversation
   * item, in its record form). The record is consulted before
   * the graph and before any decline, and the answer is
   * attributed as from the conversation: an event the person
   * told, rendered under "You told me"; the conversation's
   * established topic; or the person's standing feeling state,
   * predicated by the planner's record graph. The source is
   * named here in every case — a record answer never presents
   * as graph knowledge, and carries no pricing.
   */
  recordAnswer?: {
    source: "event" | "topic" | "feeling" | "mention" | "self-fact";
    ground: string;
    event?: { verb: string; role: string; filler: string; turn: number };
    topic?: string;
    state?: { holder: string; lemma: string; negated?: boolean; turn: number };
  };
  /**
   * R2 (the recognition programme, 2026-11-19): the
   * recognition receipt, when this turn's acknowledgement
   * showed what the turn established instead of the bare
   * "Ok." — the recorded state it predicates, or the
   * recorded event it renders, with the turn it stands from.
   * Absent when the bare acknowledgement stood (nothing the
   * turn established qualified, or the turn was the first).
   */
  recognition?: {
    kind: "state" | "event";
    detail: string;
    /** X1: the link the receipt showed to material established
     *  on an earlier turn — the earlier event it rendered, or
     *  the established topic it named. */
    link?: { kind: "event" | "topic"; turn: number; lemma: string };
  };
  /**
   * E1 (the emotional-uptake programme, 2026-11-19): a feeling
   * this turn registered FEELINGS-FIRST — read from the person's
   * own first-person statement on the surface because the
   * sentence layer did not register it: its clause could not be
   * taken apart, the turn sank at the token exit, or the merged
   * parse carried the turn on another root and the feeling
   * clause fell out of the graph. The authority that files the
   * word as a feeling is named (the classification table's
   * emotion aspect, the EDU's canonical emotions, or the LEDU's
   * uncategorised register); a feeling filed with no element
   * says so by the element's absence.
   */
  feelingFirst?: { lemma: string; authority: string; element?: string; negated?: boolean };
  /**
   * §9.3's audit flag, at the closest honest point this probe
   * offers: the probe computes no numeric arbitration margin, so
   * the flag records the steering branch's BASIS. True when the
   * branch taken was selected by a generating relation (the
   * generating follow and the generating closure) — the move
   * exists solely because a generating relation holds, the term
   * whose both-directions counting in the sense scorer is the
   * recorded X1 flaw. False when a controlling relation selected
   * the branch. Absent when no cycle relation steered the turn.
   */
  generatingMargin?: boolean;
  /** Why no cycle path steered this turn (event-only turns), or the
   *  decline reason for unanswerable turns. */
  steeringNote?: string;
  /** X3 (the X programme, 2026-11-19): where a steering
   *  branch's reply divides into the segment's own content
   *  (an echo, a predication) and the steering move it
   *  carries (the follow-up question), the content half —
   *  the form the segment's reply takes when its steering
   *  stands down inside a composition. Absent where the
   *  reply is the move whole (the restrainer branch), whose
   *  stand-down form is the plain acknowledgement. */
  steeringBaseReply?: string;
  declineReason?: string;
  /** The semantic objects this turn's utterance was assessed as
   *  (assess.ts): id and kind per object. Absent on a parse
   *  failure — no parse, no assessment. */
  semanticObjects?: { id: string; kind: string }[];
  /** The sense channels present in this turn's objects' senses
   *  faces (senses-scening.ts), in channel order. Absent when
   *  every channel is none. Drives the mapPath's pass through
   *  lpu/senses-scening-unit. */
  sensesPresent?: string[];
  /** The running scene this turn's fragment referenced
   *  (session.scenes): its id and this fragment's role in it. */
  scene?: { id: string; role: string };
  /** The ProblemSolving router's record for this turn
   *  (problem-solving.ts): the needs attached to the turn's
   *  objects and the ground the routing stood on — the
   *  person's instruction, or the assessment of the object.
   *  Drives the mapPath's pass through reasoning/problem-solving. */
  problemSolving?: { needs: string[]; ground: string };
  /** The quantity ledger changes this turn produced
   *  (quantification.ts, applied from the objects' quantity
   *  mentions): plain-words summaries, in order — a stated
   *  amount, a transfer, a flag. Absent when the turn carried
   *  no quantity content the ledger wires. Drives the
   *  mapPath's pass through lpu/quantification-language-unit. */
  quantities?: string[];
  /** A how-many question answered from the ledger
   *  (quantification.ts): the holder and kind asked after,
   *  the tracked amount read (null = a bounded unknown — the
   *  conversation said some, never how many), and the
   *  rendering spoken. */
  quantityAnswer?: { holder: string; kind: string; amount: number | null; rendered: string };
  /** CoherenceAnalysis's readings of this turn's objects
   *  (coherence.ts): the annotation notes, in order. Present
   *  only when the analysis had something to say. */
  coherence?: string[];
  /** The Social Unit's readings of this turn's objects
   *  (social.ts, S1 2026-11-18): the annotation notes, in order.
   *  Present only when the reading had something to say. S1 is
   *  shadow — no reply path consumes these yet. */
  social?: string[];
  /** The reply object this turn's planner-composed reply was
   *  authored as (reply.ts, slice 4): id and kind. Absent when
   *  the reply is the probe's hand wording. */
  replyObject?: { id: string; kind: string };
  /** The envelope's surviving needs for this turn (2026-11-17):
   *  the needs seeded on this turn's information objects that
   *  no unit discharged, priced by Coherence at the turn's
   *  settlement — data for the reply decision, and, when the
   *  turn declines, the located decline (the decline is AT
   *  these needs). */
  survivingNeeds?: { kind: string; slot: string }[];
  /**
   * NormalcyAssessment's priced flags for this turn (the
   * Normalcy arc, 2026-11-17): the bridge's readings of the
   * communication (normalcy-assessment.ts), priced by
   * CoherenceAnalysis by kind (coherence.ts), and recorded
   * here as an AWARENESS-SIDE note — the internal thought.
   * Internal only, by the hard rule: no reply text carries a
   * flag, a standing, or a verdict about oddity.
   */
  normalcy?: {
    flags: { kind: string; strength?: string; detail: string; standing?: string }[];
    awarenessNote: string;
  };
  /** The record answer in the "You said so." family (Part 3a):
   *  the question was settled by the speaker's own earlier
   *  statement, named here — its turn and the flag's reading. */
  saidSo?: { stateTurn: number; ground: string };
  /** The definitional answer (Part 3b): the question asked
   *  whether a kind has its classifying quality, and the
   *  Classification answered, cited as definition. */
  definitionalAnswer?: { subject: string; quality: string; ground: string };
  /** The unanchored-definite question (Part 3d ii): a definite
   *  noun phrase whose referent stands in neither the scene
   *  graph nor the Session record, asked after instead of
   *  answered past. */
  unanchoredDefinite?: { lemma: string; ground: string };
  /** The gibberish repair (Part 3e): the turn arrived with no
   *  resolvable content (the joint Normalcy+Coherence flag),
   *  and the reply is the repair question. */
  gibberishRepair?: { detail: string };
  /** A hand-worded answer's discharge record: the sites whose
   *  replies are the probe's wording (the record answer, the
   *  definitional answer) name who answered and on what
   *  evidence, so the settlement discharges the question's
   *  answer need exactly as the ledger's how-many hook does. */
  handAnswered?: { by: string; evidence: string };
  /**
   * The schematic walk of the turn: the ordered node ids
   * (ai-system/system-map.ts) the turn actually passed through,
   * computed in processTurn from this trace's own evidence — the
   * same records the dashboard reads. The root page's map walks
   * exactly this list. A decline's path ends at the node where
   * the turn stopped.
   */
  mapPath?: string[];
  /**
   * R1 (design note §10): true when the spoken wording is the
   * probe's hand wording rather than generated from a
   * plan-built reply graph. Set true by default at trace
   * creation; cleared only when the planner's graph speaks.
   */
  wordingNotDerived?: boolean;
  /** The serialised reply graph the reply was generated from,
   *  when the planner built one (§6: the trace names it). */
  replyGraph?: string;
  /** What the planner did or could not do this turn, where that
   *  is not already carried by the fields above: an unrealised
   *  qualification level, a demanded-but-unrealisable causal
   *  form, a retained probe rendering and its reason. */
  planNote?: string;
  /**
   * R2 (§7.1, §8.7 S13): the composition record, when the reply
   * composed several priced conclusions into one graph — the
   * active order, BOTH orderings of the spoken members (the
   * comparison §7.1 requires be visible), the newest state the
   * relation order was taken against, each member's price and
   * derivation, and any member dropped below the floor with
   * its ground.
   */
  composition?: {
    activeOrder: CompositionOrder;
    supportOrder: string[];
    relationOrder: string[];
    newestState?: { lemma: string; element: Element };
    members: { quality: string; pricing: PricingRecord; derivationPath: string }[];
    dropped: { quality: string; pricing: PricingRecord; ground: string }[];
    /** R4 (§9.1(d)): members held by the disposition's length
     *  behaviour — grounded and priced, not spoken. Present
     *  only when a lead-only composition held any. */
    held?: { quality: string; pricing: PricingRecord; ground: string }[];
  };
  /**
   * R4 (§9.1's observable): the disposition bias records of
   * this turn — every application of a bias channel (move,
   * threshold, arbitration, length), with the candidates
   * before and the selection after. Absent under the neutral
   * composition: its declared effect is none, and no channel
   * fires. Architecture only — never surface.
   */
  dispositionBias?: BiasRecord[];
  /**
   * R3 (§2.3, first gap shape): the valency gap the reply's
   * follow-up question was generated from, when one was — the
   * verb, the unfilled required role, and the ground in words.
   * The question graph itself is in replyGraph.
   */
  gapQuestion?: { verb: string; role: string; ground: string };
  /**
   * R3 (§2.3, second gap shape): the rival split the reply's
   * clarification question was generated from, when one was —
   * the word, the baseline the sense pass proceeds with, both
   * rival derivations (their landing element and anchor, their
   * confidence and their — equal — support), and the ground.
   */
  clarification?: {
    lemma: string;
    baseline: Element;
    rivals: { element: Element; anchor: string; confidence: number; support: number }[];
    ground: string;
  };
  /** Social Unit S4: this turn was read against a standing
   *  clarification pending — what the fill reading found and
   *  did (filled by a named candidate, abandoned for a usable
   *  new turn, a failed attempt, or the attempt-limit
   *  fallback). */
  clarificationFill?: {
    point: string;
    outcome: "filled" | "abandoned" | "attempt-failed" | "fallback";
    detail: string;
  };
  /** Conversation-shapes C1: this turn was a fused turn — it
   *  carried several sentence segments, at least one of them a
   *  social act — and was taken as a sequence of acts in the
   *  stream, each processed as its own turn; the replies were
   *  composed in order. The segments and their replies, as
   *  processed. The trace itself is the last segment's. */
  segmented?: { segment: string; reply: string }[];
  /** Conversation-shapes C5: this turn's reply was a ritual
   *  mirror or receipt (greeting, farewell, thanks) — a social
   *  exchange, not a substantive saying, so the wrapper does
   *  not record it as the last substantive reply. */
  ritualReply?: boolean;
  /** Recognition programme R3: this turn's reply is a boundary
   *  reply — a receipt (thanks) or a closing (farewell): a
   *  designed move, complete in itself, that neither the
   *  initiative scan nor a later segment's steering inside a
   *  composition may ride on. (Declines and corrections carry
   *  their own trace fields and are boundaries by the same
   *  rule; a greeting mirror is not — the conversation is
   *  opening, not bounding.) */
  boundaryReply?: boolean;
  /** Recognition programme R3: this turn's reply was composed
   *  from segment replies (see `segmented`); the composition's
   *  own record — how many segments stand in the composed
   *  reply, how many of them were boundary replies (a receipt,
   *  a decline, a correction, a closing), how many steering
   *  replies stood down under the composition gate, and how
   *  many duplicate bare acknowledgements the shaping
   *  collapsed. The initiative scan reads the boundary count:
   *  the composed trace is the last segment's, so an earlier
   *  segment's boundary reply would otherwise be invisible
   *  to it. */
  segmentComposition?: { segments: number; boundaryReplies: number; steeringStoodDown: number; acksCollapsed: number };
  /** Conversation-shapes C5: this turn was the visitor's own
   *  clarification request and the reply restated this
   *  recorded saying — the record the restatement read. */
  restatedReply?: { turn: number; text: string };
  /** Social Unit S5: the premise stance — a presupposition
   *  Coherence's premise degree found contradicted (by the
   *  record or the graph), the stance taken on it, or an
   *  insistence met on a standing stance-repair pending. */
  stance?: {
    subject: string;
    presupposed: string;
    established: string;
    source: "record" | "graph";
    outcome: "stated" | "insistence-met-as-supposition" | "insistence-not-adopted" | "absence-stated";
    ground: string;
  };
  /**
   * R5 (§8.7 S3): the cohesion a planner reply earned against
   * the session record, when a marker was realised — the
   * relation, the marker it earned, and the ground (the topic's
   * raised/last-touched turns, or the standing state and the
   * controlling relation). Set only where the planner's graph
   * actually spoke with the marker. Absent when no relation
   * held: an unearned marker is an ungrounded claim and is
   * never attached.
   */
  cohesion?: { relation: CohesionRelation; marker: string; ground: string };
  /**
   * R5 (§8.7 S12): the supersession this turn's statement
   * recorded, when the correction trigger fired — the delta
   * (both states with their negated flags and turns), the rule
   * that fired, and its ground. The reply is the delta graph
   * (replyGraph); its acknowledgement is built from this
   * record and the person's own subject material, nothing else.
   */
  correction?: {
    rule: "polarity" | "value";
    holder: string;
    replaced: { lemma: string; negated?: boolean; turn: number };
    replacing: { lemma: string; negated?: boolean; turn: number };
    ground: string;
    /** Set when the supersession stands but no acknowledgement
     *  graph was built (a verb-carried state): why, in words.
     *  It rides the correction record because the steering
     *  branches write planNote for their own account. */
    note?: string;
  };
}

export interface TurnResult {
  reply: string;
  trace: TurnTrace;
}

const CONTROLLER_OF: Record<Element, Element> = { Wood: "Metal", Fire: "Water", Earth: "Wood", Metal: "Fire", Water: "Earth" };

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nodeById(p: ParsedSentence, id: string): MeaningNode {
  return p.meaning.nodes.find((n) => n.id === id)!;
}
function targets(p: ParsedSentence, fromId: string, relation: string): MeaningNode[] {
  return p.meaning.edges.filter((e) => e.from === fromId && e.relation === relation).map((e) => nodeById(p, e.to));
}
function pastOf(lemma: string): string {
  const e = EN_LEXICON[lemma] as VerbEntry | undefined;
  return e && e.kind === "verb" ? e.forms.past : lemma;
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Record the §9.2 price of the derivation a steering branch rests
 *  on, at the conclusion it rests on. Records nothing when the
 *  branch rested on no conclusion or nothing on the path prices.
 *  R4 scoping (T-R4 §3): this price is record-only — no reply is
 *  spoken from it — so the disposition's threshold channel does
 *  NOT bias it; priceDerivation (the neutral price) stands. */
function recordPricing(trace: TurnTrace, derivation: Derivation, conclusion: DerivedConclusion | undefined): void {
  if (!conclusion) return;
  const pricing = priceDerivation(derivation, conclusion);
  if (pricing) trace.pricing = pricing;
}

/** Write disposition bias records into the trace (§9.1's
 *  observable). Under the neutral composition no channel ever
 *  produces a record, so the field stays absent — the neutral
 *  trace is the pre-R4 trace. One application is recorded
 *  once: the question site computes the spoken price twice
 *  (the trace record, then the planner's own computation of
 *  the same inputs), and identical records of that one
 *  application are de-duplicated here. */
function pushBias(trace: TurnTrace, records: BiasRecord[] | undefined): void {
  if (!records?.length) return;
  const list = (trace.dispositionBias ??= []);
  for (const record of records) {
    if (!list.some((r) => JSON.stringify(r) === JSON.stringify(record))) list.push(record);
  }
}

/**
 * R1 scope, recorded on derivation-steered turns: the steering
 * branches' replies predicate no derivation conclusion — they
 * acknowledge the person's own content and ask the steering
 * question — so the planner's transform (conclusion
 * predications, plan.ts) does not speak for them and their
 * wording remains the probe's. The note keeps that visible in
 * every such trace rather than letting the pricing record imply
 * a generated reply.
 */
function noteSteeringScope(trace: TurnTrace): void {
  if (!trace.derivationPath) return;
  trace.planNote =
    "steering turn: a derivation steered this reply but the reply predicates no derivation " +
    "conclusion — it acknowledges the person's own content and asks the steering question — " +
    "so its wording remains the probe's (R1's transform covers conclusion predications)";
}

/** The person's own subject material for a state of `holder`:
 *  the speaker is addressed as "you" (second person, whatever
 *  person their own sentence used); any other holder keeps its
 *  parsed node — form and determiner as the person gave them
 *  (§8.7 S14: the reply graph reuses the person's own nodes). */
function subjectMaterialFor(holder: string, node: MeaningNode | undefined, rootNode: MeaningNode): PredicationSubject {
  if (holder === "you") return { lemma: "you", form: "you", person: "2sg" };
  return {
    lemma: holder,
    form: node?.form ?? holder,
    ...(node?.det ? { det: node.det } : {}),
    ...(rootNode.states?.subjectPerson ? { person: rootNode.states.subjectPerson } : {}),
  };
}

/**
 * R5 (§8.7 S12; the trigger rule is T-R5 §7, stated there
 * exactly): does this statement's new state correct a standing
 * one? POLARITY — a standing state with the same lemma and the
 * opposite negated flag. VALUE — a standing state with a
 * different lemma, a different element, and the same
 * classification aspect label (both classified; the aspect is
 * read from the same lookup that classified each state when
 * it was recorded). The most recent match is the one replaced.
 * On a match the supersession is recorded here (the replacing
 * state stands in the record when this returns); on no match
 * nothing is recorded and the caller pushes the state as new.
 */
function findCorrection(
  session: Session,
  replacing: StateRecord,
  aspect: string | undefined,
): { delta: SupersessionRecord; rule: "polarity" | "value"; ground: string } | undefined {
  const standing = session.states.filter((s) => s.holder === replacing.holder && s.turn < replacing.turn);
  const polarity = [...standing].reverse().find((s) => s.lemma === replacing.lemma && !!s.negated !== !!replacing.negated);
  if (polarity) {
    // supersedeState removes the FIRST (holder, lemma) match:
    // when that is the matched state itself, it is the call.
    // When an earlier duplicate stands in front of it, remove
    // the matched record exactly, so the delta names the state
    // actually replaced.
    const first = session.states.find((s) => s.holder === replacing.holder && s.lemma === replacing.lemma);
    const delta = first === polarity ? supersedeState(session, replacing) : supersedeRecord(session, polarity, replacing);
    if (delta) {
      return {
        delta,
        rule: "polarity",
        ground:
          `the statement restates '${replacing.lemma}' for ${replacing.holder} with the opposite polarity ` +
          `(${polarity.negated ? "negated" : "positive"} at turn ${polarity.turn} → ${replacing.negated ? "negated" : "positive"}) — ` +
          `a correction supersedes the state it corrects (§8.7 S12)`,
      };
    }
  }
  if (aspect) {
    const value = [...standing].reverse().find((s) => {
      if (s.lemma === replacing.lemma || !s.element || !replacing.element || s.element === replacing.element) return false;
      return lookupClassification(s.lemma)?.aspect === aspect;
    });
    if (value) {
      const delta = supersedeRecord(session, value, replacing);
      if (delta) {
        return {
          delta,
          rule: "value",
          ground:
            `the statement restates the ${aspect} of ${replacing.holder}: '${value.lemma}' (${value.element}, turn ${value.turn}) ` +
            `gives way to '${replacing.lemma}' (${replacing.element}) — one value stands in the ${aspect} slot, ` +
            `so the new value supersedes the old (§8.7 S12)`,
        };
      }
    }
  }
  return undefined;
}

/**
 * R5 (§8.7 S3): the cohesion a question-site reply earns
 * against the session record, or undefined when no realised
 * relation holds. RETURN — the reply subject's topic (read
 * from the snapshot taken before this turn's own recording:
 * the turn reactivates the topic it asks after) was raised
 * earlier and left untouched for at least two full intervening
 * turns. CONTRAST — the reply quality's classification element
 * controls the element of a standing state from an earlier
 * turn, excluding this turn's own recording and the same
 * predication of the same holder. Precedence is data (T-R5
 * §1): return before contrast; one marker per reply.
 * Continuation and consequence are defined in the mapping
 * (plan.ts) but not realised in this slice — the scoping is
 * recorded in T-R5 §1.
 */
function detectCohesion(
  session: Session,
  topicsBefore: TopicRecord[],
  subjectLemma: string,
  qualityLemma: string,
): { relation: CohesionRelation; marker: string; ground: string } | undefined {
  const turn = session.turnCount;
  const topic = topicsBefore.find((t) => t.lemma === subjectLemma);
  if (topic && topic.raisedTurn < turn && topic.lastTouchedTurn <= turn - 3) {
    return {
      relation: "return",
      marker: COHESION_MARKERS.return,
      ground:
        `the topic '${subjectLemma}' was raised at turn ${topic.raisedTurn} and last touched at turn ${topic.lastTouchedTurn} — ` +
        `untouched for the ${turn - 1 - topic.lastTouchedTurn} intervening turn(s) — and this turn reactivates it (§8.7 S3: return)`,
    };
  }
  const qualityElement = lookupClassification(qualityLemma)?.element;
  if (qualityElement) {
    const restrained = session.states.find(
      (s) => s.turn < turn && s.element && CONTROLS[qualityElement] === s.element && !(s.holder === subjectLemma && s.lemma === qualityLemma),
    );
    if (restrained) {
      return {
        relation: "contrast",
        marker: COHESION_MARKERS.contrast,
        ground:
          `the reply's content '${qualityLemma}' (${qualityElement}) controls the standing state ` +
          `'${restrained.lemma}' (${restrained.element}, held by ${restrained.holder}, turn ${restrained.turn}) — ` +
          `${qualityElement}→${restrained.element} (controlling) (§8.7 S3: contrast)`,
      };
    }
  }
  return undefined;
}

/**
 * R3 (§2.3, first gap shape): the turn's event verb's unfilled
 * required roles, in frame order — a bare slot from
 * `frameSignature.required ?? required`, or the verb's required
 * prep slot — that the turn does not fill and the parse does
 * not declare suppressed. The agent is never a gap here: the
 * speaker is the agent of their own report, and a suppressed
 * agent is the person's own construction (H1: declared, not
 * missing). Only these gaps may be asked about, and only
 * because the person reporting their own event can fill them —
 * a participant of an event they were part of. A gap whose
 * filler would be the system's knowledge (a classification the
 * graph lacks) is not computed here at all: it is a decline
 * ground, not a question.
 */
function valencyGaps(parsed: ParsedSentence, root: MeaningNode): { entry: VerbEntry; gaps: string[] } | undefined {
  const entry = EN_LEXICON[root.lemma] as VerbEntry | undefined;
  if (!entry || entry.kind !== "verb") return undefined;
  /* The missing-core-role mode (check.ts, the Normalcy arc):
   * the askable missing roles of this verb, on its frame
   * evidence — the hand lexicon's obligations outright, a
   * FrameNet core role only when the construction is underway,
   * a VerbNet constituent shortfall likewise; ambiguous
   * evidence (a possibly elliptical or intransitive use) files
   * its gap as not askable, and it is not asked. The gaps are
   * returned in frame order, as before. */
  const askable = new Set(
    assessMissingRoles(parsed)
      .filter((m) => m.verb === root.lemma && m.askable)
      .map((m) => m.role),
  );
  if (!askable.size) return { entry, gaps: [] };
  const frameOrder = [...entry.slots, ...(entry.prepSlot ? [entry.prepSlot.slot] : [])];
  const gaps = frameOrder.filter((r) => askable.has(r));
  for (const role of askable) if (!gaps.includes(role)) gaps.push(role);
  return { entry, gaps };
}

/**
 * The directed-target gap (the Normalcy arc, Part 3d): a verb
 * whose frame carries exactly one elaboration beyond its agent
 * — a prepositional RECIPIENT, the person the act is directed
 * at ("shout at …") — reported with that target absent. The
 * role is not a required role (the R3 discipline asks after
 * obligations), and the specimen files the bare report as a
 * coherence gap of its own shape: an act of directing, with no
 * one it was directed at. Narrow by construction: the verb
 * must have NO bare object slots (any other elaboration the
 * frame offers takes the turn out of this shape), the slot
 * must be the recipient, unfilled and unsuppressed. The
 * question is hand-formed from the frame's own material (the
 * verb's past form, the slot's preposition, the role's
 * question word) because the role-question transform cannot
 * strand the preposition ("Who did you shout?" drops the
 * "at" the frame files).
 */
function directedTargetGap(
  parsed: ParsedSentence,
  root: MeaningNode,
): { role: string; question: string; ground: string } | undefined {
  const entry = EN_LEXICON[root.lemma] as VerbEntry | undefined;
  if (!entry || entry.kind !== "verb" || !entry.prepSlot || entry.prepSlot.required) return undefined;
  if (entry.slots.length) return undefined;
  const slot = entry.prepSlot.slot;
  if (slot !== "recipient") return undefined;
  if (root.states?.suppressedRoles?.includes(slot)) return undefined;
  if (parsed.meaning.edges.some((e) => e.from === root.id && e.relation === slot)) return undefined;
  const prep = entry.prepSlot.preps[0];
  const word = ROLE_QUESTION_WORD[slot];
  if (!prep || !word) return undefined;
  return {
    role: slot,
    question: `${cap(pastOf(entry.lemma))} ${prep} ${word}?`,
    ground:
      `the verb '${entry.lemma}' carries one elaboration beyond its agent — its directed target ` +
      `(${prep} + recipient) — and the report gives none: an act of directing with no one it was directed at`,
  };
}

/**
 * S0 (the S programme, 2026-11-19; GAPS §2's acknowledgement-
 * echo item): was this lemma put into this turn's parse by the
 * token resolver's MATCHER — a guess at a different word than
 * the one written? The resolutions record only tokens that
 * needed work; of its outcomes, only "corrected" substitutes a
 * different word on the matcher's say-so. A variant is the
 * same word in attested dress, a segmentation is the person's
 * own words split, and an unresolved token substitutes
 * nothing. A rendering — a receipt, an echo, a steering
 * predication — may speak the person's words in canonical or
 * inflected dress; it may not speak a matcher's guess as what
 * the person said ("Her name is Roxie" recorded the state
 * 'movie', the matcher's neighbour for the name, and the
 * receipt predicated it: P-030's regression in the R-tip run).
 */
function correctedAdoption(parsed: ParsedSentence, lemma: string): boolean {
  const target = lemma.toLowerCase();
  return (parsed.tokenResolutions ?? []).some(
    (r) =>
      r.outcome === "corrected" &&
      r.surface.toLowerCase() !== target &&
      r.replacement.some((t) => t.toLowerCase() === target),
  );
}

/**
 * S0: R4's bare-slot admission, named for the renderings that
 * share it: a fill spoken without a determiner (a recipient —
 * "to him", "at him") may be a referring word or a noun; a
 * verb, adverb or adjective lemma standing where a referent
 * belongs may not. A lemma the lexicon does not know passes,
 * as it does for the initiative scan — the bar is on known
 * wrong-kind fills, not on the unknown.
 */
/** The personal pronouns: the bare slot's legitimate
 *  function-word fills ("to him", "at her"). */
const BARE_PRONOUNS = new Set(["i", "you", "he", "she", "him", "her", "it", "them", "we", "they", "me", "us"]);

function soundBareFill(lemma: string): boolean {
  /* X1 (the X programme, 2026-11-19; probe run 3's fragment
   * echoes): a single-character fragment of a contraction or
   * compound is not a referring word, whichever authority
   * claims it — the parse positionally ADOPTS such fragments
   * as noun entries ("You won the be to t." — 't' is the
   * leavings of "won't", adopted where it stood), so the
   * veto precedes every leg below. */
  if (lemma.length < 2) return false;
  const entry = EN_LEXICON[lemma];
  if (entry) return entry.kind === "noun" || entry.kind === "pronoun";
  /* A closed function word the lexicon does not file is
   * grammar, not a referent — the personal pronouns
   * excepted, which are the bare slot's own legitimate
   * fills. */
  if (FUNCTION_WORDS.has(lemma.toLowerCase()) && !BARE_PRONOUNS.has(lemma.toLowerCase())) return false;
  return true;
}

/**
 * S0: render a recorded event as the acknowledgement family's
 * clause — subject, past verb, and the family's object
 * material — under the SAME soundness admission R4 set for
 * the initiative scan's predications, extended to every part
 * the clause would speak:
 *
 * - the subject is the record's agent, in the record's grain
 *   ("You" for the visitor; "The X" for a third party the
 *   record names with a thing-word). An event with no recorded
 *   agent, or an agent that is a referring word ("she", "it"),
 *   has no sound subject in this family's shape — the echo
 *   that assumed the visitor as agent of every event ("You
 *   ran." over the turtle's running, P-097) is the shape this
 *   admission replaces.
 * - the object material follows the family's order — the
 *   theme in its location, else the patient, else the theme —
 *   and every fill spoken with a determiner must be a
 *   thing-word (soundThingFill: a lexicon noun, a classified
 *   concept, or a referent the conversation recorded as an
 *   entity). A recorded object the clause cannot soundly show
 *   makes the clause unsound whole: the family does not render
 *   an event as objectless when the record holds an object
 *   ("You named the her." — the pronoun patient in a
 *   determiner slot — is the P-030 shape).
 * - the recipient is spoken bare and passes the bare-slot
 *   admission; a location spoken on its own (the venting
 *   branch's shape) passes the determiner admission. The
 *   plain-event echo never spoke the recipient (its pinned
 *   shape is subject, verb, object) — its call site opts out
 *   of the recipient rather than gain a fill under an
 *   admission change; the receipt and the record answer,
 *   which always spoke it, keep it.
 *
 * Returns the clause without terminal punctuation, or
 * undefined when any part it would speak fails admission —
 * the caller then falls back (the plain acknowledgement, the
 * branch standing down), never renders around the garble.
 */
function soundEventClause(
  session: Session,
  event: EventRecordShape,
  opts?: { lowerSubject?: boolean; recipientPrep?: "to" | "at"; independentLocation?: boolean; withRecipient?: boolean },
): string | undefined {
  const agent = event.agent;
  if (!agent) return undefined;
  let subject: string;
  if (agent === "you") subject = opts?.lowerSubject ? "you" : "You";
  else if (soundThingFill(session, agent)) subject = `${opts?.lowerSubject ? "the" : "The"} ${agent}`;
  else return undefined;
  const parts = [`${subject} ${pastOf(event.verb)}`];
  if (event.theme && event.location) {
    if (!soundThingFill(session, event.theme) || !soundThingFill(session, event.location)) return undefined;
    parts.push(`the ${event.theme} in the ${event.location}`);
  } else if (event.patient) {
    if (!soundThingFill(session, event.patient)) return undefined;
    parts.push(`the ${event.patient}`);
  } else if (event.theme) {
    if (!soundThingFill(session, event.theme)) return undefined;
    parts.push(`the ${event.theme}`);
  }
  if (event.recipient && opts?.withRecipient !== false) {
    if (!soundBareFill(event.recipient)) return undefined;
    parts.push(`${opts?.recipientPrep ?? "to"} ${event.recipient}`);
  }
  if (opts?.independentLocation && event.location && !(event.theme && event.location)) {
    if (!soundThingFill(session, event.location)) return undefined;
    parts.push(`in the ${event.location}`);
  }
  return parts.join(" ");
}

/**
 * The acknowledgement (the Normalcy arc, Part 3c): the reply
 * for a coherent statement turn that no substantive reader
 * claims — no open need, no gap, no steering relation. The
 * wording is the family's: a fuller note when the turn opens
 * the conversation, the plain receipt after.
 */
function acknowledgementFor(turn: number, name?: string): string {
  // Recognition in the acknowledgement (conversation-shapes
  // C6, 2026-11-18): when the Interlocutor's picture has just
  // gained the visitor's name — stated and learned on this
  // very turn — the acknowledgement addresses them by it. The
  // bare receipt told a visitor who had just named themselves
  // nothing back; bar item 9 (the Interlocutor's picture,
  // shown) is the ground. The wording stays the receipt's own,
  // with the name in the address position; turns where no name
  // was learned keep the bare forms exactly.
  if (name) return turn === 1 ? `Ok. Noted, ${name}.` : `Ok, ${name}.`;
  return turn === 1 ? "Ok. Noted." : "Ok.";
}

/**
 * X1 (the X programme, 2026-11-19): the link a receipt shows
 * to material established EARLIER in the conversation. R2's
 * receipt shows what THIS turn established; where the turn's
 * telling touches material an earlier turn established —
 * the same entity in an earlier event's fills, an
 * established topic — the receipt names the connection, so
 * recognition reaches across the conversation and not only
 * across the segment. Narrow by construction: the link must
 * be IN the record — an earlier event (strictly before this
 * turn) sharing a content lemma in its fills, rendered
 * under attribution through the same admission as every
 * record rendering (soundEventClause; an unsound clause is
 * passed over for an earlier sound one, never rendered
 * around), or else an established topic the turn's content
 * names, under the topic construction R1's topic answers
 * use ("We were talking about the X."), the topic lemma
 * passing the same soundness test those answers apply.
 * Resemblance is not a link: only record identity — the
 * lemma itself, in the record's own fields — connects.
 * First mentions find nothing earlier and render exactly as
 * before. The link appends to a FORMED receipt only: a turn
 * whose own telling earns no receipt does not gain one from
 * an earlier link alone.
 */
function earlierLink(
  session: Session,
  turn: number,
  contentLemmas: (string | undefined)[],
  opts?: { topicLemmas?: (string | undefined)[]; retoldState?: { holder: string; lemma: string } },
): { sentence: string; kind: "event" | "topic"; turn: number; lemma: string } | undefined {
  const clean = (list: (string | undefined)[]): Set<string> =>
    new Set(
      list.filter(
        (l): l is string => typeof l === "string" && l.length > 0 && !NON_THING_FILL.has(l.toLowerCase()),
      ),
    );
  const wanted = clean(contentLemmas);
  if (wanted.size === 0) return undefined;
  for (const ev of [...session.events].reverse()) {
    if (ev.turn >= turn) continue;
    const shared = [ev.patient, ev.theme, ev.location, ev.recipient].find((f) => f !== undefined && wanted.has(f));
    if (!shared) continue;
    const clause = soundEventClause(session, ev, { lowerSubject: true });
    if (!clause) continue;
    return { sentence: `You told me ${clause}.`, kind: "event", turn: ev.turn, lemma: shared };
  }
  /* The topic leg reads only the REFERRING lemmas (a state's
   * subject, an event's fills): a quality the turn predicated
   * is not a topic the conversation was about, even where the
   * topic register raised it alongside its subject ("We were
   * talking about the dry." — the S3 shape). And where the
   * established state is a RE-TELLING — the same state stands
   * in the record from an earlier turn — the topic link adds
   * nothing: the receipt itself already shows the retention,
   * and the link would only restate it. */
  const topicWanted = clean(opts?.topicLemmas ?? contentLemmas);
  if (topicWanted.size === 0) return undefined;
  if (opts?.retoldState) {
    const retold = opts.retoldState;
    const stoodEarlier =
      session.states.some((s) => s.turn < turn && s.holder === retold.holder && s.lemma === retold.lemma) ||
      session.supersessions.some(
        (d) => d.turn < turn && d.holder === retold.holder && (d.replaced.lemma === retold.lemma || d.replacing.lemma === retold.lemma),
      );
    if (stoodEarlier) return undefined;
  }
  for (const t of [...session.topics].reverse()) {
    if (t.raisedTurn >= turn) continue;
    if (!topicWanted.has(t.lemma)) continue;
    if (!soundTopicLemma(t.lemma)) continue;
    return { sentence: `We were talking about the ${t.lemma}.`, kind: "topic", turn: t.raisedTurn, lemma: t.lemma };
  }
  return undefined;
}

/**
 * The recognition receipt (R2, the recognition programme,
 * 2026-11-19; GAPS §2's "recognition in acknowledgements"
 * item): where a statement turn's reply would be the BARE
 * acknowledgement ("Ok." — the form for turns after the
 * first) and the turn itself established something the
 * registers hold, the receipt SHOWS what was retained — the
 * acknowledgement, then the record's own rendering of what
 * now stands. A state is rendered by the planner's record
 * predication (plan.ts — the construction the R7.5 record
 * answers use), authored as a reply object through
 * speakWithObject, following the gap-question site's split
 * of origins (the acknowledgement is the family's wording;
 * the predication is the planner's graph). An event is
 * rendered as a clause from the record's fields, in the
 * acknowledgement family's own shape (the rendering branch
 * (f)'s gap questions already ride on), its agent spoken in
 * the record's grain.
 *
 * The discipline, stated once: only what THIS turn
 * established, and only as the record holds it — a role the
 * parse dropped does not appear, so the receipt is the
 * record's honesty about itself; only a PREDICATED state
 * (a verb-carried state is a doing, and the predication
 * construction does not predicate doings — the same line
 * R4 draws for initiative); only an unnegated state (a
 * negated telling's content is an absence, and absence
 * receipts are the correction machinery's shape, not the
 * acknowledgement's); only an event with an agent and a
 * filled patient or theme (a clause needs both to be
 * rendered soundly); and only where the bare form would
 * have spoken — the first turn's "Ok. Noted." is already
 * the fuller receipt and keeps its form, as does the named
 * acknowledgement's turn (C6: the name is that turn's
 * recognition). When nothing qualifies, undefined — the
 * bare acknowledgement stands.
 *
 * S0 (the S programme, 2026-11-19) adds the rendering
 * admission the echo and the steering predications already
 * pass: the event clause is built by soundEventClause (the
 * record's agent in its grain, every determiner fill a
 * thing-word), and a state whose lemma the token resolver's
 * matcher substituted for a different written word is not
 * predicated. A rendering that fails admission stands down
 * whole — the bare acknowledgement speaks instead of a
 * garble ("You named the her." / "Her name is movie.",
 * P-030, the R-tip run's one regression).
 */
function recognitionReceipt(
  session: Session,
  trace: TurnTrace,
  turn: number,
  name: string | undefined,
  established: { state?: StateRecord; subject?: PredicationSubject; event?: EventRecordShape },
  parsed: ParsedSentence,
): string | undefined {
  if (turn === 1 || name) return undefined;
  // A turn the QuantificationLanguageUnit read keeps the
  // plain acknowledgement: its retention is the quantity
  // ledger's to show (in the how-many answers), the recorded
  // event's object in such a turn is the amount itself —
  // which the clause rendering would garble ("bought the
  // 3") — and the apples specimen (owner-approved, the
  // Normalcy arc) pins the plain form for exactly these
  // tellings. The receipt does not compete with the ledger.
  if (trace.quantities?.length) return undefined;
  const { state, subject, event } = established;
  // S0 (the S programme, 2026-11-19): the receipt's renderings
  // pass the soundness admission the echo and the steering
  // predications pass. A state whose lemma the token resolver's
  // matcher substituted for a different written word is not
  // predicated — the record holds the guess, but the receipt
  // may not speak it as what the person said (P-030: "Her name
  // is Roxie" recorded 'movie', and the receipt predicated the
  // guess). The state stands in the record; the showing stands
  // down, and the bare acknowledgement speaks instead.
  if (state && correctedAdoption(parsed, state.lemma)) return undefined;
  if (subject && correctedAdoption(parsed, subject.lemma)) return undefined;
  /* X1 (the X programme, 2026-11-19): a state whose lemma is
   * a numeral is a quantity, not a quality — the receipt
   * already stands down whole for quantity turns (above);
   * a numeral predicated as a quality is the same garble in
   * the state itself ("You are one." — 'one' is the leavings
   * of "one legged", P-035; probe run 3's fragment family). */
  if (state && parseNumberToken(state.lemma) !== undefined) return undefined;
  if (state && subject && !state.negated) {
    const outcome = planRecordPredication({ subject, stateLemma: state.lemma });
    trace.replyGraph = serialiseReplyGraph(outcome.graph);
    speakWithObject(session, trace, outcome.graph, "recognition receipt");
    /* X4 (the X programme, 2026-11-19): the restated
     * self-state. Where the visitor re-states a state of
     * their own that the record already holds from an
     * earlier turn (standing, or superseded and re-told),
     * the receipt acknowledges the PERSON, not only the
     * segment: the predication is rendered under the
     * told-me attribution — "You told me you are worried."
     * — which is the record's truth about the telling: it
     * was told, and it stands. A first telling keeps the
     * bare predication form. */
    const restated =
      state.holder === "you" &&
      (session.states.some(
        (s) => s.turn < state.turn && s.holder === state.holder && s.lemma === state.lemma && !!s.negated === !!state.negated,
      ) ||
        session.supersessions.some(
          (d) =>
            d.turn < state.turn &&
            d.holder === state.holder &&
            (d.replaced.lemma === state.lemma || d.replacing.lemma === state.lemma),
        ));
    const baseSentence = restated
      ? `You told me ${outcome.sentence.charAt(0).toLowerCase()}${outcome.sentence.slice(1)}`
      : outcome.sentence;
    trace.recognition = {
      kind: "state",
      detail:
        `the turn established the state '${state.lemma}' of ${state.holder} (turn ${state.turn}); the receipt predicates it from the record` +
        (restated
          ? " — restated: the record already held the state from an earlier turn, so the receipt renders it under the told-me attribution (X4)"
          : ""),
    };
    trace.planNote =
      (trace.planNote ? `${trace.planNote}; ` : "") +
      "recognition receipt (R2): the turn established a state and the bare acknowledgement would have shown " +
      "nothing of it — the receipt predicates the recorded state, from the record; the acknowledgement half " +
      "is the family's wording, the predication is the planner's record graph" +
      (restated
        ? "; the state restates one the record already held, and the receipt acknowledges the person under the told-me attribution (X4)"
        : "");
    /* X1: the link to earlier material, where the record
     * holds one (earlierLink) — appended to the formed
     * receipt, in the record family's wording. */
    const link = earlierLink(session, turn, [state.lemma, subject.lemma !== "you" ? subject.lemma : undefined], {
      topicLemmas: [subject.lemma !== "you" ? subject.lemma : undefined],
      retoldState: { holder: state.holder, lemma: state.lemma },
    });
    if (link) {
      trace.recognition.link = { kind: link.kind, turn: link.turn, lemma: link.lemma };
      trace.planNote +=
        `; the receipt also links to earlier material (X1): the ${link.kind} '${link.lemma}' established at turn ${link.turn} — ` +
        "the link is the record's own identity, rendered under attribution";
      return `${acknowledgementFor(turn)} ${baseSentence} ${link.sentence}`;
    }
    return `${acknowledgementFor(turn)} ${baseSentence}`;
  }
  if (event && event.agent && (event.patient || event.theme)) {
    // S0: the clause is built under the shared admission
    // (soundEventClause) — a fill the clause cannot soundly
    // show (a pronoun in a determiner slot: "You named the
    // her.", P-030) stands the receipt down whole, and the
    // bare acknowledgement speaks instead of the garble.
    const clause = soundEventClause(session, event);
    if (!clause) return undefined;
    trace.recognition = {
      kind: "event",
      detail:
        `the turn established the event '${event.verb}' (turn ${event.turn}) with its object filled; ` +
        `the receipt renders the recorded event, from the record's fields`,
    };
    trace.planNote =
      (trace.planNote ? `${trace.planNote}; ` : "") +
      "recognition receipt (R2): the turn established an event and the bare acknowledgement would have shown " +
      "nothing of it — the receipt renders the recorded event from the record's own fields";
    /* X1: the link to earlier material, where the record
     * holds one (earlierLink) — appended to the formed
     * receipt, in the record family's wording. */
    const link = earlierLink(session, turn, [event.patient, event.theme, event.location, event.recipient]);
    if (link) {
      trace.recognition.link = { kind: link.kind, turn: link.turn, lemma: link.lemma };
      trace.planNote +=
        `; the receipt also links to earlier material (X1): the ${link.kind} '${link.lemma}' established at turn ${link.turn} — ` +
        "the link is the record's own identity, rendered under attribution";
      return `${acknowledgementFor(turn)} ${clause}. ${link.sentence}`;
    }
    return `${acknowledgementFor(turn)} ${clause}.`;
  }
  return undefined;
}

/**
 * Attempt the generated gap question for a plain-event turn
 * (the asking rule of T-R3: at the plain-event site only, where
 * no cycle steering has claimed the turn, a fillable valency
 * gap's question REPLACES the probe's follow-up wording). On
 * success the trace carries the gap record and the question
 * graph, and the generated question is returned; the
 * acknowledgment the caller prepends remains the probe's, and
 * planNote records that split of origins (wordingNotDerived
 * therefore stays set). On unrealisability the reason is
 * recorded and undefined is returned — the probe's follow-up
 * stands, as it does when there is no gap.
 */
function tryGapQuestion(session: Session, trace: TurnTrace, parsed: ParsedSentence, root: MeaningNode): string | undefined {
  if ((root.states?.mood ?? "indicative") !== "indicative") return undefined;
  const found = valencyGaps(parsed, root);
  if (!found || !found.gaps.length) return undefined;
  // R6 (§8.10, gate 1): the person's turn presents a fillable
  // gap of its own — initiative never fires on this turn,
  // whether or not the question below is realised.
  trace.personPresented = "gap";
  const { entry, gaps } = found;
  const gap = gaps[0];
  const frameOrder = [...entry.slots, ...(entry.prepSlot ? [entry.prepSlot.slot] : [])];
  const filled: QuestionFilledRole[] = [];
  for (const rel of frameOrder) {
    const edge = parsed.meaning.edges.find((e) => e.from === root.id && e.relation === rel);
    if (!edge) continue;
    const n = nodeById(parsed, edge.to);
    if (n.questionWord) continue;
    filled.push({
      relation: rel,
      lemma: n.lemma,
      form: n.form,
      ...(n.det ? { det: n.det } : {}),
      ...(n.prep ? { prep: n.prep } : {}),
    });
  }
  /* S0 (the S programme, 2026-11-19): every fill the question
   * would render passes the shared admission before the
   * question is formed — a fill rendered with a determiner or
   * behind a preposition ("the X", "in the X") must be a
   * thing-word; a bare fill must be a referring word or a
   * noun. A question formed around an unsound fill is not
   * asked; the probe's follow-up stands, as it does when the
   * question is unrealisable. */
  for (const f of filled) {
    const sound = f.det || f.prep ? soundThingFill(session, f.lemma) : soundBareFill(f.lemma);
    if (!sound) {
      trace.planNote =
        `the valency gap (${entry.lemma}, ${gap}) could not be asked: its filled ${f.relation} ` +
        `('${f.lemma}') fails the rendering admission (S0) — the probe's follow-up stands`;
      return undefined;
    }
  }
  const outcome = planRoleQuestion({
    verb: entry,
    verbForm: root.form,
    ...(root.states?.tense ? { tense: root.states.tense } : {}),
    agent: { lemma: "you", form: "you" },
    filled,
    gapRole: gap,
  });
  if (outcome.kind !== "graph") {
    trace.planNote = `the valency gap (${entry.lemma}, ${gap}) could not be asked: ${outcome.reason}; the probe's follow-up stands`;
    return undefined;
  }
  trace.gapQuestion = {
    verb: entry.lemma,
    role: gap,
    ground:
      `the verb '${entry.lemma}' requires its ${gap}, and the turn does not fill it — a valency gap (§2.3); ` +
      `the person reporting their own event can fill it`,
  };
  trace.replyGraph = serialiseReplyGraph(outcome.graph);
  speakWithObject(session, trace, outcome.graph, "valency gap question");
  trace.planNote =
    "the acknowledgment is the probe's wording; the follow-up question is generated from the valency gap (replyGraph)" +
    (gaps.length > 1 ? `; further unfilled required roles not asked (one gap per turn): ${gaps.slice(1).join(", ")}` : "");
  return outcome.sentence;
}

/**
 * Slice 4: where the Planner speaks from a graph, it also
 * authors the reply as a semantic object (reply.ts), which
 * Coherence judges outbound (coherence.ts) before the wording
 * is spoken; the object is stored in the stream's graph and
 * named in the trace. Hand-worded replies (wordingNotDerived)
 * do not come through here.
 */
function speakWithObject(session: Session, trace: TurnTrace, graph: ParsedSentence, move: string): void {
  const inbound = [...session.objects].reverse().find((o) => o.producer === "person" && o.turn === trace.turn);
  // The envelope settlement at the Planner's door (2026-11-17):
  // the Planner's handling is recorded on the inbound's route;
  // a question's ANSWER need is discharged by this authoring —
  // the Planner authors a reply object answering it — and
  // Coherence prices whatever needs still stand as SURVIVING,
  // so the reply object's envelope (reply.ts) carries them.
  const inboundInfo = inbound ? informationOf(inbound) : undefined;
  if (inboundInfo) {
    noteHandled(inboundInfo, "reasoning/planner");
    if (inboundInfo.act.kind === "question" || inboundInfo.act.kind === "reason-query") {
      dischargeAnswerNeed(
        inboundInfo,
        "reasoning/planner",
        `the Planner authored a reply object answering the question (move: ${move})`,
      );
    }
    priceSurvivingNeeds(inboundInfo);
  }
  const replyObject = authorReplyObject({ graph, turn: trace.turn, session, inbound, move });
  analyseOutbound(replyObject, inbound, session);
  const replyInfo = informationOf(replyObject);
  if (replyInfo) noteHandled(replyInfo, "coherence/coherence-analysis");
  session.objects.push(replyObject);
  trace.replyObject = { id: replyObject.id, kind: replyObject.act.kind };
}

/**
 * The how-many reader (2026-11-17): a "How many …?" question
 * is answered from the Session's quantity ledger — the
 * QuantificationUnit's tracked state — never re-derived from
 * the sentences that built it. The sentence layer's parse of
 * a how-many question is mangled (its root keeps 'How' as the
 * agent and loses the counted noun), so the reader works from
 * the surface the person actually said: the kind named after
 * "many", when it names a kind the ledger tracks for the
 * speaker, else the speaker's most recently tracked kind.
 *
 * Three honest outcomes: a tracked number answers ("You have
 * two apples left." — "left" when the kind's record has been
 * changed by events, or the question itself says "left"); a
 * bounded unknown answers AS a bound (the conversation said
 * some, never how many); no record at all declines, with the
 * missing record as its ground. The wording is the probe's
 * hand wording from the ledger record; the trace names the
 * record it read.
 */
function answerHowMany(session: Session, trace: TurnTrace, text: string): TurnResult | undefined {
  const surface = text.trim();
  if (!/^how many\b/i.test(surface)) return undefined;
  // The ProblemSolving router (2026-11-18): a how-many
  // question is the person asking for a solving — the need
  // is attached to the question's object and routed to the
  // ProblemSolving Unit, on the instruction ground. (The
  // ledger answers below, as it does today; the route is
  // the recognition, recorded ahead of the unit's engines.)
  {
    const turnObject = session.objects.find((o) => o.turn === session.turnCount && o.producer === "person");
    if (turnObject && !trace.problemSolving) {
      routeProblemSolving(turnObject, ["quantification"], "a how-many question — solving asked for by the person");
      trace.problemSolving = { needs: ["quantification"], ground: "a how-many question — solving asked for by the person" };
    }
  }
  const holder = "you"; // the session's grain for the speaker
  const words = surface.replace(/[?.!]/g, "").split(/\s+/);
  const manyIdx = words.findIndex((w) => w.toLowerCase() === "many");
  const next = manyIdx >= 0 ? words[manyIdx + 1] : undefined;
  const AUX = new Set(["do", "does", "did", "have", "has", "had", "are", "is", "was", "were"]);
  let kind: string | undefined;
  if (next && !AUX.has(next.toLowerCase())) {
    const candidate = normaliseKind(next);
    if (currentQuantity(session, holder, candidate)) kind = candidate;
  }
  kind ??= latestKindFor(session, holder);
  if (!kind) {
    trace.declineReason =
      "the question asks how many, and the quantity ledger holds no tracked kind for the speaker — the missing record is the decline's ground";
    return {
      reply: "I can't answer that from what I know: you haven't told me how many of anything you have.",
      trace,
    };
  }
  const rec = currentQuantity(session, holder, kind);
  if (!rec) {
    trace.declineReason =
      `the question asks how many '${kind}', and the quantity ledger holds no record of that kind for the speaker — the missing record is the decline's ground`;
    return {
      reply: `I can't answer that from what I know: you haven't told me how many ${pluraliseKind(kind)} you have.`,
      trace,
    };
  }
  if (rec.amount === null) {
    trace.quantityAnswer = { holder, kind, amount: null, rendered: `some ${pluraliseKind(kind)} (a bounded unknown)` };
    trace.planNote =
      "how-many answered from the quantity ledger (quantification.ts): the tracked amount is a bounded unknown, answered as a bound, not a number";
    return {
      reply: `You told me you have some ${pluraliseKind(kind)}, but not how many.`,
      trace,
    };
  }
  const rendered = renderQuantity(rec.amount, kind);
  const changed = session.quantities.filter((q) => q.holder === holder && q.kind === kind).length > 1;
  const left = changed || /\bleft\b/i.test(surface);
  trace.quantityAnswer = { holder, kind, amount: rec.amount, rendered };
  trace.planNote =
    `how-many answered from the quantity ledger (quantification.ts): the current record for '${kind}' ` +
    `(turn ${rec.turn}, tier ${rec.tier}) — computed by the ledger's records, not re-derived from the sentences`;
  return { reply: `You have ${rendered}${left ? " left" : ""}.`, trace };
}

/**
 * Is this recorded state one the system itself files as a
 * feeling? The R1 feeling reader's test, named for the
 * readers that share it (R1's standing-feeling answer, X2's
 * feeling history): the state's lemma classifies under the
 * classification table's "emotion" aspect, or the EDU names
 * the lemma or its concept a canonical emotion. A state
 * neither authority files as a feeling is not read as one.
 */
function isFeelingState(s: StateRecord): boolean {
  return (
    lookupClassification(s.lemma)?.aspect === "emotion" ||
    canonicalEmotion(s.lemma) !== undefined ||
    (s.concept !== undefined && canonicalEmotion(s.concept) !== undefined)
  );
}

/**
 * Was this turn a TELLING? The turn objects carry each
 * turn's act kind; a record made on a question turn is the
 * question's own material (its mention, its presupposition),
 * not something the conversation established. The mention
 * check (X2) and the recognition initiative grounds (X3)
 * read the record through this distinction.
 */
function turnWasStatement(session: Session, turn: number): boolean {
  return session.objects.some((o) => o.producer === "person" && o.turn === turn && o.act?.kind === "statement");
}

/**
 * X2 (the X programme, 2026-11-19): the speaker's feeling
 * history as the record accumulated it — the feeling states
 * in recorded order, superseded links read back out of the
 * supersession record and standing links from the states
 * themselves, every link filed as a feeling by the system's
 * own authorities (isFeelingState). Consecutive duplicates
 * collapse: a feeling re-told is not a change. The chain is
 * the record's own order — nothing is inferred into it, and
 * a feeling the conversation never established is not a
 * link.
 */
function feelingChain(session: Session, beforeTurn: number): StateRecord[] {
  const links: StateRecord[] = [];
  for (const d of session.supersessions) {
    if (d.holder !== "you" || d.turn >= beforeTurn) continue;
    if (isFeelingState(d.replaced)) links.push(d.replaced);
  }
  for (const s of session.states) {
    if (s.holder !== "you" || s.turn >= beforeTurn) continue;
    if (isFeelingState(s)) links.push(s);
  }
  links.sort((a, b) => a.turn - b.turn);
  return links.filter(
    (l, i) => i === 0 || l.lemma !== links[i - 1].lemma || !!l.negated !== !!links[i - 1].negated,
  );
}

/**
 * X2: render a feeling chain as the answer's sentences —
 * every link but the last predicated in the past, the last
 * in the present (it is where the history arrives), each by
 * the planner's record construction over the speaker's own
 * subject. The trace names the record as the source; no
 * pricing is fabricated for a record answer.
 */
function renderFeelingHistory(session: Session, trace: TurnTrace, chain: StateRecord[], ground: string): TurnResult {
  const sentences: string[] = [];
  let lastGraph: ParsedSentence | undefined;
  chain.forEach((link, i) => {
    const outcome = planRecordPredication({
      subject: { lemma: "you", form: "you", person: "2sg" },
      stateLemma: link.lemma,
      ...(link.negated ? { negated: true } : {}),
      copulaTense: i < chain.length - 1 ? "past" : "present",
    });
    sentences.push(outcome.sentence);
    lastGraph = outcome.graph;
  });
  const last = chain[chain.length - 1];
  trace.recordAnswer = {
    source: "feeling",
    ground,
    state: { holder: last.holder, lemma: last.lemma, ...(last.negated ? { negated: true } : {}), turn: last.turn },
  };
  if (lastGraph) {
    trace.replyGraph = serialiseReplyGraph(lastGraph);
    speakWithObject(session, trace, lastGraph, "record answer (feeling history)");
  }
  trace.wordingNotDerived = false;
  trace.planNote =
    "answered from the conversation record (X2): the speaker's feeling history — the supersession chain and the " +
    "standing feeling, in the record's order, each link predicated by the planner's record graph (earlier links in " +
    "the past tense, the last in the present); the record is the answer's source, not the graph";
  return { reply: sentences.join(" "), trace };
}

/**
 * The feeling reader (R1, the recognition programme,
 * 2026-11-19): "How do I feel?" asks after the person's own
 * standing feeling — content the conversation record holds as
 * the speaker's states, which no graph derivation can supply
 * and which the shape decline below used to refuse while the
 * state stood in the record. The reader is narrow by
 * construction: the question's root is 'feel', the agent the
 * parse drew for it is the speaker themselves ('i' — a
 * question about another's feeling is not this shape), and
 * the record holds a standing state of the speaker that the
 * system itself files as a feeling: its lemma classifies
 * under the classification table's "emotion" aspect (the
 * same aspect determination that classified the state — the
 * R5 machinery), or the EDU names the lemma or its concept
 * a canonical emotion (edu.ts). A state neither authority
 * files as a feeling is not read as one here. The latest such
 * state answers, predicated by the planner's record graph in
 * the second person, exactly as the R7.5 record answers
 * predicate a standing state; the trace names the record as
 * the source and no pricing is fabricated. No standing
 * feeling → undefined, and the question takes the ordinary
 * path (its shape decline, unchanged).
 *
 * The subject evidence is read from the parse where the
 * parse keeps it (the agent it drew is 'i') and from the
 * surface where the parse drops it: a how-question's parse
 * keeps 'How' as the agent and loses the subject entirely
 * (the how-many reader above documents the same mangling
 * and works from the surface for the same reason). The
 * surface evidence is the first-person frame itself — "I
 * feel / I feeling" in the person's own words — and it is
 * accepted only when the parse drew no other subject.
 */
function answerFeelingFromRecord(
  session: Session,
  trace: TurnTrace,
  parsed: ParsedSentence,
  root: MeaningNode,
  text: string,
): TurnResult | undefined {
  if (root.lemma !== "feel") return undefined;
  const agent = targets(parsed, root.id, "agent")[0];
  const speakerSubject =
    agent?.lemma === "i" ||
    ((agent === undefined || agent.lemma.toLowerCase() === "how") && /\bi (feel|feeling)\b/i.test(text));
  if (!speakerSubject) return undefined;
  /* X2 (the X programme, 2026-11-19): the past-tense form of
   * the question ("How did I feel?") asks after the history,
   * not the standing feeling — it is answered from the
   * feeling chain: the change the record accumulated,
   * rendered as the change it was. A single-link chain
   * answers with that link in the past; no chain at all
   * leaves the question to the ordinary path. */
  if (/\bdid\b/i.test(text)) {
    const chain = feelingChain(session, session.turnCount);
    if (chain.length >= 2) {
      return renderFeelingHistory(
        session,
        trace,
        chain,
        `the question asks how the person felt, and the record holds a feeling history of ${chain.length} links ` +
          `(${chain.map((l) => `'${l.lemma}' at turn ${l.turn}`).join(", ")}) — the record answers with the history, as accumulated`,
      );
    }
    if (chain.length === 1) {
      const only = chain[0];
      const outcome = planRecordPredication({
        subject: { lemma: "you", form: "you", person: "2sg" },
        stateLemma: only.lemma,
        ...(only.negated ? { negated: true } : {}),
        copulaTense: "past",
      });
      trace.recordAnswer = {
        source: "feeling",
        ground:
          `the question asks how the person felt, and the record holds the one feeling state '${only.lemma}' ` +
          `(recorded at turn ${only.turn}) — the record answers, in the past tense the question asks in`,
        state: { holder: only.holder, lemma: only.lemma, ...(only.negated ? { negated: true } : {}), turn: only.turn },
      };
      trace.replyGraph = serialiseReplyGraph(outcome.graph);
      trace.wordingNotDerived = false;
      speakWithObject(session, trace, outcome.graph, "record answer (feeling)");
      trace.planNote =
        "answered from the conversation record (X2): the person's one recorded feeling, predicated in the past " +
        "tense by the planner's record graph — the record is the answer's source, not the graph";
      return { reply: outcome.sentence, trace };
    }
    return undefined;
  }
  const feeling = [...session.states]
    .reverse()
    .find((s) => s.holder === "you" && s.turn < session.turnCount && isFeelingState(s));
  if (!feeling) return undefined;
  const outcome = planRecordPredication({
    subject: { lemma: "you", form: "you", person: "2sg" },
    stateLemma: feeling.lemma,
    ...(feeling.negated ? { negated: true } : {}),
  });
  trace.recordAnswer = {
    source: "feeling",
    ground:
      `the question asks how the person feels, and the record holds their standing feeling state ` +
      `'${feeling.lemma}' (recorded at turn ${feeling.turn}) — the record answers, from the person's own established state`,
    state: { holder: feeling.holder, lemma: feeling.lemma, ...(feeling.negated ? { negated: true } : {}), turn: feeling.turn },
  };
  trace.replyGraph = serialiseReplyGraph(outcome.graph);
  trace.wordingNotDerived = false;
  speakWithObject(session, trace, outcome.graph, "record answer (feeling)");
  trace.planNote =
    "answered from the conversation record (R1): the person's standing feeling state, predicated by the planner's " +
    "record graph — the record is the answer's source, not the graph, and no pricing is fabricated for it";
  return { reply: outcome.sentence, trace };
}

/**
 * The mention check (X2, the X programme, 2026-11-19):
 * "Did I mention the soup?" / "Did I tell you about the
 * soup?" ask after the conversation's own record — whether
 * the thing stands in what the person established. The
 * shape decline used to refuse these while the record held
 * the answer either way. The reader is narrow by
 * construction: the root is 'mention' or 'tell', the agent
 * the parse drew is the speaker ('i'), and the theme the
 * parse kept is a word that could name a thing (not a
 * pronoun, not a question word, not a fragment). The record
 * test reads ONLY what stands from turns before this one —
 * topics raised, entities recorded, event fills, states
 * held or predicated of the thing — because a question turn
 * records its own mention of the thing, and counting it
 * would make every answer yes. The answer is the record's,
 * attributed as the person's own telling, in the family's
 * wording; absence in the record answers no, honestly —
 * the reader never declines a question the record settles.
 */
function answerMentionFromRecord(
  session: Session,
  trace: TurnTrace,
  parsed: ParsedSentence,
  root: MeaningNode,
  turn: number,
): TurnResult | undefined {
  if (root.lemma !== "mention" && root.lemma !== "tell") return undefined;
  const agent = targets(parsed, root.id, "agent")[0];
  if (agent?.lemma !== "i") return undefined;
  const theme = targets(parsed, root.id, "theme")[0];
  if (!theme) return undefined;
  const lemma = theme.lemma;
  if (lemma.length < 2 || NON_THING_FILL.has(lemma.toLowerCase())) return undefined;
  /* Only a TELLING counts: the thing must have entered the
   * record on a statement turn. A question turn records its
   * own mention of the thing it asks about (its topics, its
   * presupposed states) — counting those would make a
   * second question about the same thing answer yes on the
   * strength of the first question, which told nothing.
   * The turn objects carry each turn's act kind; a record
   * whose turn has no statement object behind it does not
   * count. */
  const statementTurns = new Set(
    session.objects.filter((o) => o.producer === "person" && o.act?.kind === "statement").map((o) => o.turn),
  );
  const toldAt = (t: number): boolean => t < turn && statementTurns.has(t);
  const mentioned =
    session.topics.some((t) => t.lemma === lemma && toldAt(t.raisedTurn)) ||
    session.entities.some((e) => e.lemma === lemma && toldAt(e.turn)) ||
    session.events.some(
      (e) => toldAt(e.turn) && [e.patient, e.theme, e.location, e.recipient].includes(lemma),
    ) ||
    session.states.some((s) => toldAt(s.turn) && (s.holder === lemma || s.lemma === lemma));
  const object = `${theme.det ? `${theme.det} ` : ""}${theme.form}`;
  const verbPhrase = root.lemma === "mention" ? "mentioned" : "told me about";
  const reply = mentioned
    ? `Yes. You ${verbPhrase} ${object}.`
    : `No. You have not ${verbPhrase} ${object}.`;
  trace.recordAnswer = {
    source: "mention",
    ground:
      `the question asks whether the person ${root.lemma === "mention" ? "mentioned" : "told of"} '${lemma}', and the record ` +
      (mentioned
        ? `holds it from an earlier STATEMENT turn (a topic, an entity, an event fill or a state recorded before turn ${turn} on a turn that told, not asked) — the record answers yes, as the person's own telling`
        : `holds nothing of it from any earlier statement turn — the record answers no, honestly`),
    topic: lemma,
  };
  trace.planNote =
    "answered from the conversation record (X2): the mention check reads the record as it stood before this turn — " +
    "the question's own mention of the thing is not counted toward the answer";
  trace.wordingNotDerived = true;
  return { reply, trace };
}

/**
 * The self-fact readers (X4, the X programme, 2026-11-19):
 * the Interlocutor picture used continuously. The visitor's
 * name (C6) was the picture's first piece; the facts the
 * visitor established about THEMSELVES — an occupation
 * claim, a possession, their name — are recognised when
 * asked after, answered from the picture as told. Testimony
 * discipline binds the whole family: the picture's contents
 * are the visitor's own claims, held as theirs ("You told
 * me you are a teacher."), and the system asserts nothing
 * about the visitor they did not establish. Three shapes,
 * each narrow by construction:
 *
 * - OCCUPATION: "What do I do?" (the parse roots at 'do',
 *   or at 'work' in the "for work" dress) with the speaker
 *   as agent and a 'what' patient — answered from the
 *   latest standing state of the speaker whose lemma the
 *   lexicon files as a noun (a role word: 'teacher'), told
 *   on a statement turn, unnegated, and not a feeling. A
 *   name state is not a noun to the lexicon, so identity
 *   stays the identity register's domain, not this one's.
 * - POSSESSION: "Do I have a dog?" — the root 'have', the
 *   speaker as agent, a theme the parse kept — answered
 *   from the record's have-events of the speaker: yes with
 *   the question's own theme material (their words for the
 *   thing), no honestly where no such event stands.
 * - NAME REMEMBRANCE: "Do you remember my name?" — the
 *   root 'remember' with a 'name' node the person gave in
 *   their own possessive — answered from the Interlocutor
 *   register: the name as learned, or the honest no.
 */
function answerSelfFactFromRecord(
  session: Session,
  trace: TurnTrace,
  parsed: ParsedSentence,
  root: MeaningNode,
  turn: number,
): TurnResult | undefined {
  const agent = targets(parsed, root.id, "agent")[0];
  if (root.lemma === "do" || root.lemma === "work") {
    if (agent?.lemma !== "i") return undefined;
    const what = targets(parsed, root.id, "patient")[0];
    if (what?.lemma !== "what") return undefined;
    const occupation = [...session.states]
      .reverse()
      .find(
        (s) =>
          s.holder === "you" &&
          s.turn < turn &&
          !s.negated &&
          turnWasStatement(session, s.turn) &&
          EN_LEXICON[s.lemma]?.kind === "noun" &&
          !isFeelingState(s),
      );
    if (!occupation) return undefined;
    const outcome = planRecordPredication({
      subject: { lemma: "you", form: "you", person: "2sg" },
      stateLemma: occupation.lemma,
    });
    trace.recordAnswer = {
      source: "self-fact",
      ground:
        `the question asks what the person does, and the Interlocutor picture holds their own occupation claim ` +
        `'${occupation.lemma}' (told at turn ${occupation.turn}) — the picture answers, as told: their claim, held as theirs`,
      state: { holder: occupation.holder, lemma: occupation.lemma, turn: occupation.turn },
    };
    trace.replyGraph = serialiseReplyGraph(outcome.graph);
    trace.wordingNotDerived = false;
    speakWithObject(session, trace, outcome.graph, "record answer (self-fact)");
    trace.planNote =
      "answered from the Interlocutor picture (X4): the visitor's occupation claim, predicated by the planner's " +
      "record graph under the told-me attribution — the picture's contents are the visitor's claims, not the system's knowledge of them";
    return { reply: `You told me ${outcome.sentence.charAt(0).toLowerCase()}${outcome.sentence.slice(1)}`, trace };
  }
  if (root.lemma === "have") {
    if (agent?.lemma !== "i") return undefined;
    const theme = targets(parsed, root.id, "theme")[0];
    if (!theme || theme.lemma.length < 2 || NON_THING_FILL.has(theme.lemma.toLowerCase())) return undefined;
    const told = [...session.events]
      .reverse()
      .find((e) => e.turn < turn && e.verb === "have" && e.agent === "you" && e.theme === theme.lemma);
    const object = `${theme.det ? `${theme.det} ` : ""}${theme.form}`;
    trace.recordAnswer = {
      source: "self-fact",
      ground: told
        ? `the question asks whether the person has '${theme.lemma}', and the record holds their telling of it ` +
          `(the have-event of turn ${told.turn}) — the picture answers yes, as told`
        : `the question asks whether the person has '${theme.lemma}', and the record holds no telling of it — ` +
          `the picture answers no, honestly`,
      ...(told ? { event: { verb: told.verb, role: "theme", filler: theme.lemma, turn: told.turn } } : {}),
    };
    trace.planNote =
      "answered from the Interlocutor picture (X4): the possession check reads the record's have-events of the " +
      "speaker — what they established about their own possessions, and nothing else";
    trace.wordingNotDerived = true;
    return {
      reply: told ? `Yes. You told me you have ${object}.` : `No. You have not told me you have ${object}.`,
      trace,
    };
  }
  if (root.lemma === "remember") {
    const nameNode = parsed.meaning.nodes.find((n) => n.lemma === "name" && n.det === "my");
    if (!nameNode) return undefined;
    const identity = session.interlocutor.identity;
    trace.recordAnswer = {
      source: "self-fact",
      ground: identity
        ? `the question asks whether the system remembers the visitor's name, and the Interlocutor register ` +
          `holds it ('${identity.name}', learned at ${identity.learnedAt}) — the register answers`
        : "the question asks whether the system remembers the visitor's name, and the Interlocutor register " +
          "holds none — the register answers no, honestly",
    };
    trace.planNote =
      "answered from the Interlocutor register (X4): the visitor's name is the picture's first content (C6), " +
      "held as told and answered from the register, not the graph";
    trace.wordingNotDerived = true;
    return { reply: identity ? `Yes. Your name is ${identity.name}.` : "No. You have not told me your name.", trace };
  }
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Feelings first (E1: the emotional-uptake programme, 2026-11-19)    */
/* ------------------------------------------------------------------ */

/**
 * A feeling the surface of a turn states in the first person,
 * filed by the system's authorities on emotion. The filing is
 * one of three, in the authorities' own order:
 *
 *  - the classification table files the word under its
 *    "emotion" aspect — under the category-filing rule (the
 *    owner's ruling, 2026-11-18) the entry's element IS the
 *    word's canonical category's Suwen element (joy → Fire,
 *    grief → Metal, anger → Wood, fear → Water, pensiveness →
 *    Earth), so the state the registration records carries the
 *    category's element with the entry's provenance;
 *  - the EDU names the word a canonical emotion (edu.ts) with
 *    no table entry of its own — today that is 'fright' alone,
 *    which the tradition leaves unsettled and which therefore
 *    files with no element, exactly as the framework holds it;
 *  - the LEDU's uncategorised register (ledu.ts) names the
 *    word a feeling whose category is NOT reliable — it
 *    registers with no element and no canonical face, and the
 *    word waits on the owner in GAPS §2.
 *
 * A word no authority files is not a feeling this reader can
 * register: the scan is keyed on the authorities, never on a
 * word list of its own.
 */
interface StatedFeeling {
  lemma: string;
  negated: boolean;
  entry?: ClassificationEntry;
  canonical?: EmotionKind;
  uncategorised?: boolean;
  authority: string;
}

function fileFeelingWord(word: string): Omit<StatedFeeling, "lemma" | "negated"> | undefined {
  const entry = classificationsOf(word).find((e) => e.aspect === "emotion");
  if (entry) {
    return {
      entry,
      authority:
        `the classification table files '${word}' under the emotion aspect (${entry.element}, ${entry.provenance}) — ` +
        `under the category-filing rule the element is its canonical category's Suwen element`,
    };
  }
  const canonical = canonicalEmotion(word);
  if (canonical) {
    return {
      canonical,
      authority:
        `the EDU names '${word}' a canonical emotion (${canonical.hanzi}, ${canonical.name})` +
        (canonical.element ? `, filed at ${canonical.element}` : " — the tradition leaves it unsettled, so it files with no element"),
    };
  }
  if (uncategorisedEmotionWord(word)) {
    return {
      uncategorised: true,
      authority:
        `the LEDU's uncategorised register names '${word}' a feeling with no reliable category — ` +
        `it registers with no element, and waits on the owner in GAPS §2`,
    };
  }
  return undefined;
}

/**
 * Match one clause against the first-person feeling frames.
 * The frames are the statement shapes in which a person states
 * their own feeling as the clause's own business: the copula
 * frames ("I am W", "I'm W", "I was W", "I have been W", "I am
 * feeling W") and the feel frames ("I feel W", "I felt W"),
 * each with an optional intensifier (so / really / very) and
 * the copula frames' optional "not". Returns the candidate
 * word, its polarity, and the clause's remainder after the
 * word — the remainder is read by the formula guard in the
 * scan: a copula adjective immediately followed by "not" is
 * doing formula work ("I'm afraid not"), not predicating a
 * feeling, and does not file.
 */
function matchFeelingFrame(clause: string): { word: string; negated: boolean; rest: string } | undefined {
  const c = clause.trim().toLowerCase().replace(/[.!?]+$/, "");
  let m: RegExpMatchArray | null;
  if ((m = c.match(/^i\s+(?:don't|do not|never)\s+feel\s+(?:so\s+|really\s+|very\s+)?([a-z]+)\b(.*)$/))) {
    return { word: m[1], negated: true, rest: m[2] };
  }
  if ((m = c.match(/^i\s+(?:feel|felt)\s+(?:so\s+|really\s+|very\s+)?([a-z]+)\b(.*)$/))) {
    return { word: m[1], negated: false, rest: m[2] };
  }
  if ((m = c.match(/^i\s+(?:am|'m)\s+feeling\s+(?:so\s+|really\s+|very\s+)?([a-z]+)\b(.*)$/))) {
    return { word: m[1], negated: false, rest: m[2] };
  }
  if ((m = c.match(/^i\s+(?:am|was)\s+(not\s+)?(?:so\s+|really\s+|very\s+)?([a-z]+)\b(.*)$/))) {
    return { word: m[2], negated: !!m[1], rest: m[3] };
  }
  if ((m = c.match(/^i'm\s+(not\s+)?(?:so\s+|really\s+|very\s+)?([a-z]+)\b(.*)$/))) {
    return { word: m[2], negated: !!m[1], rest: m[3] };
  }
  if ((m = c.match(/^i\s+have\s+been\s+(?:so\s+|really\s+|very\s+)?([a-z]+)\b(.*)$/))) {
    return { word: m[1], negated: false, rest: m[2] };
  }
  return undefined;
}

/**
 * Scan a turn's surface for a clear first-person emotion
 * statement: a clause that OPENS with one of the feeling
 * frames (clauses are the turn's sentence segments, split
 * further at commas and the clause connectives), whose word
 * the authorities file as a feeling. The first filed feeling
 * in surface order is the turn's stated feeling — the reader
 * registers one per turn, as the parse registers one root
 * state per turn. Feelings stated of anyone else, feelings
 * embedded under another clause's frame ("I think I am…"),
 * and subject-less fragments ("kinda getting worried") are
 * not this shape and are not read: the registration is of the
 * visitor's own stated feeling, nothing inferred.
 */
function scanStatedFeeling(text: string): StatedFeeling | undefined {
  for (const segment of splitTurnSegments(text)) {
    // The connective split does NOT include "so": in the
    // frames' own territory "so" is the intensifier ("I'm so
    // sad"), and splitting there would cut every intensified
    // feeling statement in half before the frame could read it.
    const clauses = segment.split(/\s*(?:,|;)\s+|\s+(?:because|but|and)\s+/i);
    for (const clause of clauses) {
      const hit = matchFeelingFrame(clause);
      if (!hit) continue;
      if (/^\s*not\b/.test(hit.rest)) continue;
      const filed = fileFeelingWord(hit.word);
      if (filed) return { lemma: hit.word, negated: hit.negated, ...filed };
    }
  }
  return undefined;
}

/**
 * Register a stated feeling in the record: a state of the
 * speaker ('you'), the word as the person said it, the filing's
 * element where the filing carries one, and an origin that
 * names the evidence — the classification's own origin for a
 * table-filed word, "stated" for a word filed by the EDU's
 * naming or the LEDU's uncategorised register (the statement
 * itself is the evidence; no derivation stands behind it).
 * The state passes through the same supersession as every
 * recorded state (findCorrection, R5): a feeling that restates
 * the emotion aspect at a different element supersedes the
 * standing one (worried → happy, once both are filed), and a
 * polarity restatement supersedes by polarity; the delta is
 * recorded on the trace as the record block records it.
 */
function registerStatedFeeling(
  session: Session,
  trace: TurnTrace,
  turn: number,
  felt: StatedFeeling,
  indicative: boolean,
): StateRecord {
  const element = felt.entry?.element ?? felt.canonical?.element;
  const state: StateRecord = {
    holder: "you",
    lemma: felt.lemma,
    ...(felt.entry ? { concept: felt.entry.concept } : felt.canonical ? { concept: felt.canonical.name } : {}),
    ...(element ? { element } : {}),
    ...(felt.negated ? { negated: true } : {}),
    turn,
    origin: felt.entry ? classifiedOrigin(felt.entry) : { kind: "stated" },
  };
  trace.feelingFirst = {
    lemma: felt.lemma,
    authority: felt.authority,
    ...(element ? { element } : {}),
    ...(felt.negated ? { negated: true } : {}),
  };
  if (indicative) {
    const found = findCorrection(session, state, felt.entry?.aspect);
    if (found) {
      const { delta, rule, ground } = found;
      trace.correction = {
        rule,
        holder: delta.holder,
        replaced: { lemma: delta.replaced.lemma, ...(delta.replaced.negated ? { negated: true } : {}), turn: delta.replaced.turn },
        replacing: { lemma: delta.replacing.lemma, ...(delta.replacing.negated ? { negated: true } : {}), turn: delta.replacing.turn },
        ground,
      };
      return state;
    }
  }
  session.states.push(state);
  return state;
}

/**
 * The feelings-first receipt, for the exits where a turn whose
 * feeling is clear on its surface would otherwise fall whole
 * to the rephrase request (the parse-failure exit; the token
 * exit): the feeling is registered, and the reply is the
 * acknowledgement with the recognition receipt (R2's
 * construction — the planner's record predication of the
 * registered state) instead of the rephrase. The rephrase
 * stands for a turn the system can make nothing of; a turn
 * that states a feeling in the first person is not that, even
 * when the rest of it defeats the sentence layer. Returns
 * undefined when the surface states no filed feeling — the
 * exits keep their designed behaviour exactly.
 */
function feelingsFirstReceipt(session: Session, trace: TurnTrace, turn: number, text: string): TurnResult | undefined {
  const felt = scanStatedFeeling(text);
  if (!felt) return undefined;
  const state = registerStatedFeeling(session, trace, turn, felt, true);
  const outcome = planRecordPredication({
    subject: { lemma: "you", form: "you", person: "2sg" },
    stateLemma: state.lemma,
    ...(state.negated ? { negated: true } : {}),
  });
  trace.replyGraph = serialiseReplyGraph(outcome.graph);
  speakWithObject(session, trace, outcome.graph, "recognition receipt (feelings-first)");
  trace.recognition = {
    kind: "state",
    detail:
      `the turn stated the feeling '${state.lemma}' in the first person and the sentence layer could not take the turn up; ` +
      `the feeling stands registered feelings-first (turn ${turn}) and the receipt predicates it from the record`,
  };
  trace.planNote =
    `feelings-first registration (E1): the sentence layer could not take this turn up, but the person's own first-person statement ` +
    `files a feeling — ${felt.authority} — so the feeling is registered and acknowledged with recognition instead of the whole turn ` +
    `falling to the rephrase request; the acknowledgement is the family's wording, the predication the planner's record graph`;
  return { reply: `${acknowledgementFor(turn)} ${outcome.sentence}`, trace };
}

/**
 * The self-fact denial (conversation-shapes C3, factored out
 * for S1): the plain denial the limits facts support for a
 * matter the Self tables do not hold, composed in visitor
 * language with the matter as the visitor spoke it. The
 * occupation's denial is joined by what the system does
 * instead — the Capabilities table's first sentence. The
 * "any" form follows the question's own surface (an "any" in
 * its tokens) or the matter's plural shape.
 */
function selfFactDenial(matter: string, tokens: string[]): string {
  if (matter === "occupation") {
    return `I don't have a job. ${requestCapabilities().capabilities[0]}`;
  }
  const anyForm =
    tokens.some((t) => t.toLowerCase() === "any") || matter.endsWith("s") || matter === "children";
  const article = anyForm ? "any" : /^[aeiou]/.test(matter) ? "an" : "a";
  return `I don't have ${article} ${matter}.`;
}

/**
 * The identity self-answer (Social Unit S3, factored out for
 * S1): the Social Unit requests the facts from Awareness
 * Self's Identity table (social.ts's one address), the
 * Planner predicates the name as a reply object, and the
 * table's kindLine rides beside the generated sentence.
 */
function selfIdentityReply(session: Session, trace: TurnTrace): string {
  const facts = requestIdentity();
  const authored = planSelfIdentity(facts.name);
  speakWithObject(session, trace, authored.graph, "self answer (identity)");
  dischargeDemand(session, "self-answer");
  trace.replyGraph = serialiseReplyGraph(authored.graph);
  trace.wordingNotDerived = false;
  return `${authored.sentence} ${facts.kindLine}`;
}

/**
 * Whether a topic lemma can be NAMED as the conversation's
 * topic (R1): the topic records are raised for every Earth
 * node the record block meets, which includes the chunker's
 * leavings (question words, pronouns, stray function lemmas).
 * A lemma names a topic only when the lexicon knows it as a
 * noun or a proper noun, or the classification table knows
 * the concept — the same two authorities that ground every
 * other content claim the system makes.
 */
function soundTopicLemma(lemma: string): boolean {
  const entry = EN_LEXICON[lemma];
  if (entry && entry.kind === "noun") return true;
  return lookupClassification(lemma) !== undefined;
}

/**
 * Split a turn's surface into its sentence segments (terminal
 * punctuation retained), with one peel: a leading greeting
 * segment set off by a comma ("Hello, how are you doing?") is
 * its own segment. Segmentation is stream mechanics only — it
 * recognises nothing; each segment is parsed and assessed by
 * the ordinary machinery, which does the recognising.
 */
function splitTurnSegments(text: string): string[] {
  const trimmed = text.trim();
  const parts = (trimmed.match(/[^.!?]+[.!?]+["')\]]*/g) ?? []).map((s) => s.trim()).filter(Boolean);
  let segments = parts.length && parts.join(" ") === trimmed ? parts : [trimmed];
  const GREETING_HEAD = "(?:hello|hi|hey)(?:\\s+there)?|good morning|good afternoon|good evening|good night";
  const peel = (s: string): string[] | null => {
    const m = s.match(new RegExp(`^(${GREETING_HEAD})\\s*,\\s*(.+)$`, "i"));
    if (m) return [`${m[1]}.`, m[2]];
    // The comma-less fused greeting (S2, the S programme,
    // 2026-11-19): a greeting head running straight into a
    // how-enquiry with no punctuation between ("good evening
    // how are you?", "hey there how are you today?") is the
    // same fusion the comma form draws, and segments the
    // same way — the head is a greeting phrase and the tail
    // must open with the enquiry's 'how'. A greeting head
    // before any other continuation is not peeled.
    const m2 = s.match(new RegExp(`^(${GREETING_HEAD})\\s+(how\\b.+)$`, "i"));
    return m2 ? [`${m2[1]}.`, m2[2]] : null;
  };
  if (segments.length === 1) {
    segments = peel(segments[0]) ?? segments;
  } else if (segments.length > 1) {
    const p = peel(segments[0]);
    if (p) segments = [...p, ...segments.slice(1)];
  }
  return segments;
}

/**
 * Take a multi-segment turn up segment by segment (conversation-
 * shapes C1/C2): each segment that parses as a single sentence
 * is processed as its own turn in the stream, segments that do
 * not parse are skipped and named, and the replies compose in
 * order — a segment's whole-utterance rephrase request drops
 * out of the composition when any other segment was taken up.
 * Returns null when nothing could be taken up (no segment
 * parses, or every taken-up segment itself ends at the
 * rephrase): the caller then gives the turn's own answer.
 */
function composeSegmentTurns(session: Session, text: string, ground: string): TurnResult | null {
  const segments = splitTurnSegments(text);
  if (segments.length <= 1) return null;
  const parts: { segment: string; result: TurnResult }[] = [];
  const skipped: string[] = [];
  for (const segment of segments) {
    try {
      parse(segment, "en");
    } catch {
      /* Feelings first (E1, the emotional-uptake programme,
       * 2026-11-19): a segment the sentence layer cannot take
       * apart is dropped from the composition — but a segment
       * that states a feeling in the first person is not
       * nothing, and dropping it drops the feeling whole.
       * Such a segment is routed through the turn machinery
       * anyway: its parse fails there too, and the parse-
       * failure exit registers the feeling and receipts it
       * (the feelings-first receipt), so the composition
       * carries the recognition. A segment with no stated
       * feeling is skipped and named, exactly as before. */
      if (scanStatedFeeling(segment)) {
        parts.push({ segment, result: processTurnInner(session, segment, { segmented: true }) });
      } else {
        skipped.push(segment);
      }
      continue;
    }
    parts.push({ segment, result: processTurnInner(session, segment, { segmented: true }) });
  }
  if (parts.length === 0) return null;
  const items = parts.map((p) => ({ segment: p.segment, result: p.result, reply: p.result.reply }));
  const REPHRASE = "Could you put that another way?";
  if (items.every((i) => i.reply === REPHRASE)) return null;
  const kept = items.filter((i) => i.reply !== REPHRASE);
  /* Reply shaping and the composition gate (recognition
   * programme R3, 2026-11-19). The per-segment replies are
   * composed under two disciplines the concatenation did not
   * observe:
   *
   * (1) Steering does not ride on a boundary, and does not
   * steer from a doing. A segment whose reply steers (its
   * trace carries a cycle path) stands down when an earlier
   * segment of this same composition closed a boundary —
   * its reply was a receipt, a decline, a correction or a
   * closing — because a steering tail on such a reply reads
   * as the conversation reopening what the boundary settled
   * (the probe run's P-072 and P-124 shapes). It also stands
   * down, boundary or none, when the state it would steer
   * from is one this very segment carried by a verb —
   * recorded at the segment's turn together with its own
   * event of the same verb — for the generating follow-up
   * is built for predicated states, and inside a composition
   * its re-verbalisation of a doing ("You hope. What's on
   * your mind when it happens?", the P-079 shape) reads as a
   * tail, not a move. The restrainer branch is excepted by
   * its marker: its addressed state is an earlier, settled
   * one, and its reply form is the designed one. Outside
   * compositions nothing changes — a standalone turn's
   * steering is untouched.
   *
   * X3 (the X programme, 2026-11-19) extends the same
   * discipline across the whole composition, on probe run
   * 3's evidence: a boundary LATER in the composition also
   * stands steering down (the tail before a thanks receipt
   * is the same reopening, in the other order), at most one
   * steering move stands per composed reply, and the
   * stand-down form is the segment's own content — its echo
   * or predication (trace.steeringBaseReply) — rather than
   * the bare acknowledgement, so the shaping costs the
   * segment its move, not its recognition. (The R3 form —
   * the plain acknowledgement — remains for a steering
   * reply that is the move whole.)
   *
   * (2) Duplicate bare acknowledgements collapse. The plain
   * forms ("Ok.", "Ok. Noted.") say nothing segment-specific,
   * so a pile of them ("Ok. Ok. Ok. Ok.", the P-086 shape) is
   * one acknowledgement, not four: the first stands when it
   * precedes the composition's first substantive reply, and
   * every other plain ack is dropped. Named acknowledgements
   * and recognition receipts are not bare — they carry the
   * name, or what was retained — and stand wherever they
   * fall. `trace.segmented` keeps the replies as processed;
   * the shaping is recorded here and in
   * `trace.segmentComposition`. */
  const isBoundary = (t: TurnTrace): boolean => Boolean(t.boundaryReply || t.declineReason || t.correction);
  /* X3 (the X programme, 2026-11-19; probe run 3's
   * composition finding): the discipline reaches the whole
   * composed reply, not only what follows a boundary. A
   * boundary ANYWHERE in the composition — before the
   * steering segment as well as after it (P-073's third
   * turn: a venting segment, then the thanks receipt) —
   * stands every steering segment down; and at most ONE
   * steering move stands in a composed reply, however many
   * segments steer (P-073's second turn carried the venting
   * tail three times; P-124's first, twice). A stood-down
   * segment keeps its own content — the echo or predication
   * its steering rode on (trace.steeringBaseReply) — and
   * loses only the move; a steering reply that is the move
   * whole (the restrainer branch) stands down to the plain
   * acknowledgement, as before. */
  const anyBoundary = kept.some((i) => isBoundary(i.result.trace));
  let boundarySeen = false;
  let steeringStood = false;
  let steeringStoodDown = 0;
  for (const item of kept) {
    const t = item.result.trace;
    if (t.cyclePath) {
      const verbCarried =
        !t.addressedState &&
        session.states.some(
          (st) =>
            st.turn === t.turn &&
            session.events.some((e) => e.turn === st.turn && e.verb === st.lemma && e.agent === st.holder),
        );
      if (boundarySeen || anyBoundary || verbCarried || steeringStood) {
        item.reply = t.steeringBaseReply ?? acknowledgementFor(t.turn);
        steeringStoodDown += 1;
      } else {
        steeringStood = true;
      }
    }
    if (isBoundary(t)) boundarySeen = true;
  }
  const boundaryReplies = kept.filter((i) => isBoundary(i.result.trace)).length;
  const isPlainAck = (r: string): boolean => r === "Ok." || r === "Ok. Noted.";
  let acksCollapsed = 0;
  let seenSubstantive = false;
  let keptFirstAck = false;
  const shaped: string[] = [];
  for (const item of kept) {
    if (isPlainAck(item.reply)) {
      if (!seenSubstantive && !keptFirstAck) {
        shaped.push(item.reply);
        keptFirstAck = true;
      } else {
        acksCollapsed += 1;
      }
    } else {
      seenSubstantive = true;
      shaped.push(item.reply);
    }
  }
  const trace = parts[parts.length - 1].result.trace;
  trace.segmented = parts.map((p) => ({ segment: p.segment, reply: p.result.reply }));
  trace.segmentComposition = { segments: kept.length, boundaryReplies, steeringStoodDown, acksCollapsed };
  trace.planNote =
    `${ground}: ${parts.length} of ${segments.length} sentence segments were taken as their own acts and the replies composed` +
    (skipped.length ? `; not taken up (unparseable as single sentences): ${skipped.map((s) => `"${s}"`).join(", ")}` : "") +
    (steeringStoodDown
      ? `; steering stood down on ${steeringStoodDown} segment(s) (recognition programme R3: steering does not ride on a receipt, decline, correction or closing, and does not steer from a verb-carried state inside a composition; X3: a boundary anywhere in the composition stands steering down, at most one steering move stands per composed reply, and a stood-down segment keeps its own content — its echo or predication — losing only the move)`
      : "") +
    (acksCollapsed ? `; ${acksCollapsed} duplicate bare acknowledgement(s) collapsed by the shaping` : "") +
    (trace.planNote ? `; final segment: ${trace.planNote}` : "");
  return { reply: shaped.join(" "), trace };
}

function processTurnInner(session: Session, text: string, opts?: { clarificationFallback?: boolean; segmented?: boolean }): TurnResult {
  /* Segmentation by default (S5, the S programme, 2026-11-19;
   * generalising conversation-shapes C1/C2): a turn carrying
   * several sentence segments is taken as what it is — a
   * sequence of acts in one turn. Each segment is processed
   * as its own turn in the stream — the registers, the
   * recording and the phase machine see each act as itself —
   * and the replies are composed in order under R3's
   * shaping. C1 composed only turns carrying a social
   * segment, and C2 composed only at the failure exits;
   * every other multi-sentence turn went to the sentence
   * layer as one utterance, and the merged parse merged or
   * silently dropped segment content (the probe runs'
   * dropped themes and about-phrases). The segmented route
   * is now the default for every multi-segment turn: nothing
   * a segment carries is dropped silently — a segment that
   * cannot be taken up is skipped and NAMED in the trace,
   * and its failure stays located there. A composition that
   * takes nothing up returns null and the turn falls through
   * to the merged path below, whose exits (the parse-failure
   * and token-exit recoveries among them) remain the second
   * line, exactly as before.
   *
   * The merged parse remains the route only where a single
   * graph is genuinely required, and the cases are named:
   * (1) a segment's own processing (opts.segmented — the
   * recursion's base case); (2) the clarification-fallback
   * re-entry (opts.clarificationFallback — the turn is the
   * system's own reprocessing of one original utterance on
   * a settled reading, not a new sequence of acts); (3) a
   * standing clarification pending WITH candidates — the
   * pending-fill reading judges the fill against the whole
   * turn as the visitor delivered it, and segmenting first
   * would let a segment consume a pending it was never
   * offered as. A candidate-less pending is answered by the
   * continuation itself and segments like any other turn;
   * (4) a whole-turn gibberish judgement (below) — the
   * Normalcy Unit's flag is read on the utterance as one
   * object, and the designed repair is a whole-turn move. */
  if (
    !opts?.segmented &&
    !opts?.clarificationFallback &&
    !(session.conversation.pending?.kind === "clarification" && session.conversation.pending.candidates?.length)
  ) {
    const segments = splitTurnSegments(text);
    if (segments.length > 1) {
      /* The gibberish exception (named with the route): the
       * gibberish judgement is a WHOLE-turn judgement — the
       * Normalcy Unit reads the utterance as one object and
       * flags it when no resolvable content stands anywhere
       * in it ("blorp. zizzle. frak."). Segmented, such a
       * turn meets a per-segment clarification cascade and
       * never reaches the designed move (the puzzled repair
       * question, the joint flag on the trace). So a turn
       * whose merged assessment carries the joint flag —
       * a statement with the gibberish flag and no aspects,
       * the token exit's own test — keeps the merged path.
       * The pre-assessment is read-only, as segmentActKind's
       * was; a merged parse that throws is the composition's
       * recovery ground, not this exception's. */
      let gibberishWholeTurn = false;
      try {
        const merged = parse(text, "en");
        const objs = assessInformation(merged, { turn: session.turnCount + 1, surface: text, session });
        if (objs[0]) assessNormalcy(merged, objs[0], session);
        gibberishWholeTurn = Boolean(
          objs[0] && normalcyFlagOf(objs[0], "gibberish") && objs[0].act.kind === "statement" && objs[0].aspects.length === 0,
        );
      } catch {
        gibberishWholeTurn = false;
      }
      if (!gibberishWholeTurn) {
        const composed = composeSegmentTurns(
          session,
          text,
          "segmentation by default (S5): the turn's sentence segments are taken as their own acts and the replies composed",
        );
        if (composed) return composed;
      }
    }
  }
  session.turnCount += 1;
  const turn = session.turnCount;
  const trace: TurnTrace = {
    turn,
    input: text,
    disposition: renderComposition(session.disposition),
    role: renderComposition(session.role),
    ...(session.frame ? { frame: session.frame } : {}),
    parseSummary: "",
    classifications: [],
    recognitions: [],
    resolutions: [],
    tokenResolutions: [],
    // R1: the probe's wording speaks unless the planner's graph
    // replaces it; the planner clears this where it speaks.
    wordingNotDerived: true,
  };
  /* R5 (§8.7 S3): the topic records as they stood BEFORE this
   * turn's own recording touches them. Cohesion's return check
   * reads the snapshot: the turn itself reactivates the topic
   * it asks after, which would erase the absence measured. */
  const topicsBefore: TopicRecord[] = session.topics.map((t) => ({ ...t }));

  /* The pending-fill reading (Social Unit S4, design §7): a
   * standing clarification is read against this turn FIRST,
   * before the turn is taken as itself.
   *
   * - A candidate-less pending (the context request, §7c; the
   *   rephrase request, §7d) is answered by the continuation
   *   itself: the pending closes and the turn proceeds.
   * - A fill naming an offered candidate resolves the point:
   *   for a token (§7a) the chosen word stands in the original
   *   sentence, which is then processed as this turn; for a
   *   sense (§7b) the chosen reading becomes the
   *   conversation's settled reading for the lemma and the
   *   fragment is consumed as the answer.
   * - A turn that neither fills nor (judged after assessment,
   *   below) stands as a usable turn of its own is a failed
   *   attempt — counted there, where the judgement can be
   *   made. */
  const standingAtEntry = session.conversation.pending;
  if (standingAtEntry?.kind === "clarification") {
    if (!standingAtEntry.candidates?.length) {
      trace.clarificationFill = {
        point: standingAtEntry.point ?? "clarification",
        outcome: "filled",
        detail: "a candidate-less clarification (context request or rephrase request) is answered by the continuation itself; the pending closes and the turn proceeds as itself",
      };
      closePending(session);
    } else {
      const fill = matchPendingFill(standingAtEntry, text);
      if (fill && standingAtEntry.point?.startsWith("token:") && standingAtEntry.originalText) {
        const surface = standingAtEntry.point.slice("token:".length);
        trace.clarificationFill = {
          point: standingAtEntry.point,
          outcome: "filled",
          detail: `the fill named '${fill.term}' for the token '${surface}'; the original sentence is processed with that reading`,
        };
        text = standingAtEntry.originalText.replace(new RegExp(`\\b${escapeRegExp(surface)}\\b`, "i"), fill.term);
        closePending(session);
      } else if (fill && standingAtEntry.point?.startsWith("sense:")) {
        const lemma = standingAtEntry.point.slice("sense:".length);
        noteClarifiedSense(session, lemma, { anchor: fill.reading, element: fill.element ?? "" });
        trace.clarificationFill = {
          point: standingAtEntry.point,
          outcome: "filled",
          detail: `the fill named the '${fill.reading}' reading of '${lemma}'; it is the conversation's settled reading now`,
        };
        closePending(session);
        trace.planNote = `clarification filled: '${lemma}' is read as in ${fill.reading} for this conversation (Social Unit S4, the pending-fill reading)`;
        return { reply: `Noted — as in ${fill.reading}.`, trace };
      }
    }
  }

  let parsed: ParsedSentence;
  try {
    parsed = parse(text, "en");
  } catch (err) {
    trace.tokenResolutions =
      (err as { tokenResolutions?: TokenResolution[] }).tokenResolutions ?? [];
    trace.parseSummary = "parse failed";
    trace.declineReason = "the sentence could not be taken apart by the sentence layer";
    /* Statement recovery (conversation-shapes C2, 2026-11-18):
     * the whole-utterance rephrase below is S4's trigger (d) —
     * for a turn the system can make nothing of. A long
     * narrative or emotional turn is not that: its whole
     * surface defeats the sentence layer (one unknown verb in
     * the second sentence sinks the turn), while its sentences
     * taken one at a time are clear statements the ordinary
     * machinery registers and answers — the sealed probe run
     * met 45 of its 128 final replies with the rephrase
     * request, most of them multi-sentence tellings. So before
     * the rephrase: take the turn's segments as their own acts,
     * exactly as the fused-turn composition does, skipping the
     * segments that do not parse (named in the trace, never
     * silently). If at least one segment is taken up, the turn
     * was received; the rephrase stands only when no segment
     * could be — the gibberish ground, unchanged. A single-
     * sentence failure has no segments to recover and keeps
     * the rephrase, as does a segment's own failure. */
    if (!opts?.segmented) {
      const recovered = composeSegmentTurns(
        session,
        text,
        "statement recovery (conversation-shapes C2): the whole turn could not be taken apart by the sentence layer",
      );
      if (recovered) return recovered;
    }
    /* Feelings first (E1, the emotional-uptake programme,
     * 2026-11-19): before the rephrase — a turn that states a
     * feeling in the first person, clearly, on its surface is
     * not a turn the system can make nothing of, even when its
     * clauses defeat the sentence layer. The feeling registers
     * and the receipt acknowledges it with recognition; the
     * rephrase stands only when no segment could be taken up
     * AND no feeling is stated. A segment's own failure reaches
     * here too (the composition routes a feeling-carrying
     * unparseable segment through this exit — see
     * composeSegmentTurns). */
    const feltReceipt = feelingsFirstReceipt(session, trace, turn, text);
    if (feltReceipt) return feltReceipt;
    // S4 (design §7d): the whole-utterance clarification — a
    // rephrase request that never names the failure (the trace
    // above keeps the located gap), with the pending opened so
    // the next turn is read as its answer. Before S4 the reply
    // named the failure ("I couldn't take that sentence
    // apart — …"); the designed form asks without naming it.
    openClarification(session, { openedBy: `turn:${turn}`, point: "utterance", question: "Could you put that another way?" });
    return { reply: "Could you put that another way?", trace };
  }
  const root = nodeById(parsed, parsed.meaning.rootId);
  trace.parseSummary = `root '${root.lemma}' (${root.syntacticElement}${root.role ? ", " + root.role : ""}); nodes: ${parsed.meaning.nodes.map((n) => n.lemma).join(", ")}; mood: ${root.states?.mood ?? "indicative"}`;
  trace.tokenResolutions = parsed.tokenResolutions ?? [];

  /* Semantic objects (slice 1 — shadow; slice 2 — first
   * readers): SemanticAssessment's reading of this utterance as
   * an object (assess.ts), made BEFORE this turn's own
   * recording, so grounding and stream role read the prior
   * stream; CoherenceAnalysis then reads the object against
   * that same prior stream (coherence.ts) and annotates its
   * trail. The objects are stored on the session and named in
   * the trace.
   *
   * Since the envelope build (2026-11-17) what the assessment
   * creates and the session stores is an INFORMATION object
   * (assessInformation, info-object.ts): the semantic object
   * as the unchanged core, wrapped in the envelope that
   * carries its act, its route and its needs. Each reader
   * below amends the envelope as it handles the object; the
   * turn's settlement (processTurn) prices what survives. */
  const assessed = assessInformation(parsed, { turn, surface: text, session });
  for (const o of assessed) {
    /* NormalcyAssessment (2026-11-17): the LPU's bridge to the
     * NormalcyUnit reads the object here — after Session &
     * Situation's situation consult (inside assessInformation)
     * and before CoherenceAnalysis — and files its flags on the
     * envelope; Coherence then prices them by kind, with its
     * other readings of the object. */
    assessNormalcy(parsed, o, session);
    analyseInbound(o, session);
    compareCompositions(o, session);
    /* The Social Unit's reading (social.ts, S1): after
     * Coherence's inbound analysis, before planning, as the
     * design's seam specifies. It annotates the object and
     * updates its Session registers; in S1 nothing downstream
     * consumes either — the reading is shadow. */
    readSocial(o, session);
    analyseSenses(o);
    priceNormalcyFlags(o);
    noteHandled(o, "coherence/coherence-analysis");
  }
  {
    const normalcyFlags = assessed.flatMap((o) =>
      (informationOf(o)?.envelope.normalcy ?? []).map((f) => ({
        kind: f.kind,
        ...(f.strength ? { strength: f.strength } : {}),
        detail: f.detail,
        ...(f.priced ? { standing: f.priced.standing } : {}),
      })),
    );
    if (normalcyFlags.length) {
      trace.normalcy = {
        flags: normalcyFlags,
        awarenessNote:
          `internal thought: that was odd — ${normalcyFlags.map((f) => f.kind).join(", ")} ` +
          "(NormalcyAssessment's flag, priced by CoherenceAnalysis; an internal register only — " +
          "the outward reply does not carry it)",
      };
    }
  }
  session.objects.push(...assessed);
  // The scene graph (2026-11-17): the fragment the assessment
  // produced is placed into the Session's running scene, after
  // the object is recorded — the face was computed against the
  // scene as it stood before this turn. The envelope's share
  // of the scene work (info-object.ts): the slots this
  // fragment OPENED on the scene graph seed placement needs
  // referencing them, and the slots it FILLED discharge the
  // placement needs standing in the stream for them.
  for (const o of assessed) {
    if (o.senses?.scene) {
      applySceneUpdate(session, parsed, o.senses, turn);
      seedSceneNeeds(o, session, turn);
      dischargeFilledSceneNeeds(session, o.senses.scene, turn);
    }
  }
  // The quantity ledger (2026-11-17): the mentions the
  // QuantificationLanguageUnit read at assessment are applied
  // to the Session's ledger by the QuantificationUnit, after
  // the objects are recorded — the mentions were read against
  // the conversation as it stood before this turn. The
  // envelope's share: flags the ledger raised this turn seed
  // reconciliation needs on the turn's objects.
  const quantityNotes: string[] = [];
  for (const o of assessed) {
    if (o.quantities?.length) {
      quantityNotes.push(...applyQuantityMentions(session, o.quantities, turn).applied);
      // The ProblemSolving router (2026-11-18): the object
      // carries quantity content — assessed by the AI from
      // the object itself, no instruction needed — so the
      // need is attached to the object and routed to the
      // ProblemSolving Unit (reasoning/problem-solving),
      // whose seat is a placeholder: the route is recorded,
      // and the ledger's own machinery remains the solver.
      routeProblemSolving(o, ["quantification"], "the object carries quantity content, assessed from the object");
      trace.problemSolving = { needs: ["quantification"], ground: "the object carries quantity content, assessed from the object" };
    }
  }
  for (const o of assessed) seedQuantityNeeds(o, session, turn);
  if (quantityNotes.length) trace.quantities = quantityNotes;
  trace.semanticObjects = assessed.map((o) => ({ id: o.id, kind: o.act.kind }));
  const sensesPresent = SENSE_CHANNELS.filter((c) => assessed.some((o) => o.senses?.channels[c]?.length));
  if (sensesPresent.length) trace.sensesPresent = sensesPresent;
  const sceneFace = assessed.find((o) => o.senses?.scene)?.senses.scene;
  if (sceneFace) trace.scene = { id: sceneFace.id, role: sceneFace.role };
  const coherenceNotes = assessed.flatMap((o) =>
    o.trail.filter((a) => a.unit === "coherence/coherence-analysis").map((a) => a.note),
  );
  if (coherenceNotes.length) trace.coherence = coherenceNotes;
  const socialNotes = assessed.flatMap((o) =>
    o.trail.filter((a) => a.unit === "awareness/social-unit").map((a) => a.note),
  );
  if (socialNotes.length) trace.social = socialNotes;

  /* The pending-fill reading, second stage (Social Unit S4,
   * design §7): a standing candidate clarification this turn
   * did not fill (the first stage, above, reads the fill). A
   * turn that is itself usable — a clause, a question, a
   * social act — abandons the pending: the conversation has
   * moved on and the point is not chased. A turn that is
   * neither a fill nor usable is a failed attempt: counted in
   * the register, re-asked once, and at the second failure the
   * system proceeds on its best reading and says it is doing
   * so — there is no third clarification on the same point. */
  {
    const pending = session.conversation.pending;
    if (pending?.kind === "clarification" && pending.candidates?.length && !opts?.clarificationFallback) {
      const first = assessed[0];
      const firstRoot = first?.content.meaning.nodes.find((n) => n.id === first.content.meaning.rootId);
      const usable =
        !!first &&
        (first.act.kind !== "statement" || firstRoot?.role === "verb" || firstRoot?.role === "predicate" || first.aspects.length > 0);
      if (usable) {
        trace.clarificationFill = {
          point: pending.point ?? "clarification",
          outcome: "abandoned",
          detail: "the turn did not fill the standing clarification but stands as a usable turn of its own; the pending is abandoned and the turn proceeds as itself",
        };
        closePending(session);
      } else {
        const attempts = noteClarificationAttempt(session);
        if (attempts >= 2 && pending.point?.startsWith("sense:")) {
          const lemma = pending.point.slice("sense:".length);
          noteClarifiedSense(session, lemma, { anchor: pending.bestReading ?? "", element: pending.bestElement ?? "" });
          trace.clarificationFill = {
            point: pending.point,
            outcome: "fallback",
            detail: `two failed attempts; the system proceeds on its best reading ('${pending.bestReading}') and says so — the reading stands as the conversation's settled one`,
          };
          closePending(session);
          trace.planNote = "clarification fallback (S4): two attempts failed to separate the readings; the best reading stands, and the reply says so";
          return { reply: `I'll take '${lemma}' in the ${pending.bestReading} sense, then.`, trace };
        }
        if (attempts >= 2 && pending.point?.startsWith("token:")) {
          const surface = pending.point.slice("token:".length);
          const best = pending.bestReading ?? "";
          trace.clarificationFill = {
            point: pending.point,
            outcome: "fallback",
            detail: `two failed attempts; the system proceeds on its best reading ('${best}' for '${surface}') and says so — the original sentence is then processed on that reading`,
          };
          closePending(session);
          trace.planNote = "clarification fallback (S4): two attempts failed; the reply states the best reading and the original sentence is processed on it";
          const onBest = (pending.originalText ?? "").replace(new RegExp(`\\b${escapeRegExp(surface)}\\b`, "i"), best);
          const inner = processTurnInner(session, onBest, { clarificationFallback: true });
          return { reply: `I'll take '${surface}' as ${best}. ${inner.reply}`, trace };
        }
        trace.clarificationFill = {
          point: pending.point ?? "clarification",
          outcome: "attempt-failed",
          detail: `the turn neither filled the clarification nor stands as a usable turn of its own; attempt ${attempts} of 2 — the question is re-asked once`,
        };
        trace.planNote = "clarification re-asked (S4): the attempt did not fill it; one re-ask, no third";
        return { reply: pending.question ?? "Could you put that another way?", trace };
      }
    }
  }

  /* The greeting (slice 2; envelope build 2026-11-17): the
   * Planner answers the greeting object with its mirror — the
   * reply is generated from the object's own graph, so the
   * register the person chose (Hello / Hi / Hey) is the
   * register returned. A greeting records nothing
   * propositional, so the turn ends here. The disposition-
   * shaped variants (a welcoming expansion, only when first)
   * wait on the chat-configuration ruling; the mirror is the
   * neutral behaviour.
   *
   * The envelope's rule for the phatic turn (the owner's
   * addition, 2026-11-17): a greeting is received through the
   * whole route — assessed, read against the situation (its
   * situate needs discharged by Session & Situation from
   * actual session state, info-object.ts), priced by
   * Coherence, and answered by the Planner authoring a reply
   * object from the assessed situation — at ANY stream
   * position, not only at the opening. There is no path from
   * the greeting act to a reply string except this authoring:
   * no greeting lookup, no template. (The pre-envelope code
   * took this branch only when the greeting opened the
   * exchange and let later greetings fall through to the
   * statement steering — the envelope build closes that
   * shortcut-shaped asymmetry.) */
  const openingObject = assessed[0];
  if (openingObject && openingObject.act.kind === "greeting" && openingObject.act.wellbeing) {
    /* The wellbeing answer (conversation-shapes C1, 2026-11-18):
     * the greeting object is the ritual "How are you?" — the
     * Planner answers it with the wellbeing predication the
     * design names for the exchange (planWellbeingAnswer),
     * authored as a reply object like every other move, and
     * the authoring discharges the Social Unit's greeting-
     * return demand. The mirror below is for the greeting
     * proper; a wellbeing query mirrored from its own graph
     * would generate the question back at the visitor. */
    const authored = planWellbeingAnswer();
    speakWithObject(session, trace, authored.graph, "wellbeing answer");
    dischargeDemand(session, "greeting-return");
    trace.planNote =
      "wellbeing answer (conversation-shapes C1): the greeting's ritual exchange answered with the wellbeing predication; recorded as ritual — nothing about the system's state is banked from it";
    trace.replyGraph = serialiseReplyGraph(authored.graph);
    trace.wordingNotDerived = false;
    return { reply: authored.sentence, trace };
  }
  if (openingObject && openingObject.act.kind === "greeting") {
    speakWithObject(session, trace, parsed, "return greeting");
    // S2: the authored mirror discharges the Social Unit's
    // greeting-return demand (the unit records the discharge).
    dischargeDemand(session, "greeting-return");
    trace.ritualReply = true;
    trace.planNote =
      openingObject.act.streamRole === "opens"
        ? "return greeting (the planner, reading the semantic object; coherence: fits)"
        : "return greeting (the planner, reading the information object — its situate needs read against the session; the reply is authored, not looked up)";
    trace.replyGraph = serialiseReplyGraph(parsed);
    trace.wordingNotDerived = false;
    return { reply: generate(parsed), trace };
  }

  /* The leave-taking (Social Unit S2, 2026-11-18): the Planner
   * answers the leave-taking object with its mirror, exactly as
   * the greeting — the reply is generated from the object's own
   * graph, so the register the person chose (Goodbye / Bye /
   * Farewell) is the register returned — and the authoring
   * discharges the unit's farewell-return demand, which
   * completes the closing in this turn (social.ts). A
   * leave-taking records nothing propositional, so the turn
   * ends here. Before S2 this act fell through to the statement
   * steering and was answered "Ok. Noted." — the free-
   * conversation probe's finding, closed at its location. */
  if (openingObject && openingObject.act.kind === "leave-taking") {
    speakWithObject(session, trace, parsed, "return farewell");
    dischargeDemand(session, "farewell-return");
    trace.ritualReply = true;
    trace.boundaryReply = true;
    trace.planNote =
      "return farewell (the planner, reading the leave-taking object; the mirror returns the register the person chose; the Social Unit's farewell-return demand is discharged and the conversation is closed)";
    trace.replyGraph = serialiseReplyGraph(parsed);
    trace.wordingNotDerived = false;
    return { reply: generate(parsed), trace };
  }

  /* Thanks (Social Unit S2, 2026-11-18): the receipt move. The
   * Planner authors the receipt's graph as a bare predication
   * (plan.ts's planThanksReceipt — constructed, not parsed,
   * for the reason recorded there) and the Verbalizer
   * generates from it; no wording is looked up. Thanks is
   * ritual (design §1 item 3): recorded as ritual, never as
   * content, and the pending thread — whatever the conversation
   * was about — survives a thanks untouched, so the turn ends
   * here like the other ritual exchanges. The authoring
   * discharges the unit's thanks-receipt demand. */
  if (openingObject && openingObject.act.kind === "thanks") {
    const receipt = planThanksReceipt();
    speakWithObject(session, trace, receipt.graph, "thanks receipt");
    dischargeDemand(session, "thanks-receipt");
    trace.ritualReply = true;
    trace.boundaryReply = true;
    trace.planNote =
      "thanks receipt (the planner, answering the thanks object with the receipt move; ritual — the pending thread is untouched; the Social Unit's thanks-receipt demand is discharged)";
    trace.replyGraph = serialiseReplyGraph(receipt.graph);
    trace.wordingNotDerived = false;
    return { reply: receipt.sentence, trace };
  }

  /* The self-query (Social Unit S3, 2026-11-18): answered from
   * record, never derived and never declined. The Social Unit
   * requests the facts from Awareness Self's tables (social.ts
   * — the unit is the Planner's one address for "who are we,
   * socially", ruling 2a) and the Planner presents them:
   *
   *  - identity: the name is predicated of the system as a
   *    reply object (planSelfIdentity; the Verbalizer words
   *    it), and the Identity table's kindLine rides beside it
   *    as the record's own sentence;
   *  - capability: the Capabilities & limits table presented
   *    as stored — its capabilities, then its first limit, the
   *    material one — the list IS the answer, so this branch
   *    composes from the table and authors no reply object
   *    (reply.ts's boundary: objects exist where the Planner
   *    composes from a graph).
   *
   * Either way the authoring discharges the unit's self-answer
   * demand. Before S3 both shapes fell into the question path
   * and declined ("I have nothing on you in my notes…") — the
   * system could not say who it was; bar item 2, closed at its
   * location. The capability shape additionally needed the
   * sentence layer to draw it at all (parse.ts's lexical-do
   * pass) before assessment could recognise it. */
  if (openingObject && openingObject.act.kind === "self-query") {
    const which = openingObject.act.selfQuery ?? "identity";
    if (which === "fact") {
      /* The self-fact answer (conversation-shapes C3, 2026-11-18):
       * the question asks after a fact about the system the Self
       * tables do not hold — an occupation, pets, a birthplace.
       * The honest answer is composed from the limits facts'
       * standing (the system is a small program, not a person
       * with a biography): the plain denial, in visitor
       * language, with the matter as the visitor spoke it. For
       * the occupation the denial is joined by what the system
       * does instead — the Capabilities table's first sentence,
       * requested through the same address as every self fact.
       * Like the capability presentation this branch composes
       * from the tables and authors no reply object. */
      const matter = openingObject.act.selfFact ?? "one";
      const reply = selfFactDenial(matter, parsed.connective.tokens);
      dischargeDemand(session, "self-answer");
      trace.planNote =
        `self answer (fact): the question asks after '${matter}' — a fact about the system the Self tables do not hold; the answer is the plain denial the limits facts support, never a decline-by-gap (conversation-shapes C3)`;
      trace.wordingNotDerived = true;
      return { reply, trace };
    }
    if (which === "capability") {
      const facts = requestCapabilities();
      dischargeDemand(session, "self-answer");
      trace.planNote =
        "self answer (capability): the Social Unit requested the facts from Awareness Self's Capabilities & limits table and the Planner presents them as stored — the capabilities, then the first limit";
      trace.wordingNotDerived = true;
      return { reply: [...facts.capabilities, facts.limits[0]].join(" "), trace };
    }
    trace.planNote =
      "self answer (identity): the Social Unit requested the facts from Awareness Self's Identity table; the Planner predicates the name from record and the table's kindLine rides beside the generated sentence";
    return { reply: selfIdentityReply(session, trace), trace };
  }

  /* The visitor's own clarification request (conversation-
   * shapes C5, 2026-11-18): "What do you mean?" asks what the
   * SYSTEM meant, and the designed response is a restatement —
   * the system's last substantive reply, re-said from the
   * Conversation register's record of what it actually said
   * (social.ts's lastReply, written by the turn wrapper as
   * each substantive reply is spoken). The saying is quoted
   * back in a plainer frame rather than re-derived: the record
   * is the authority for what was said, and a re-derivation
   * could drift from it. When the register holds nothing —
   * the request opens the conversation, or everything before
   * it was ritual or clarification — the reply says that
   * plainly. Either way this is an answer, never the question
   * path's decline ("nothing you have told me says what was
   * meant" — the record asked after was the system's own). */
  // The offer of help (S2, the S programme, 2026-11-19):
  // the visitor offers the system a service, and the reply
  // receives the offer as the act it is and answers it in
  // kind — a clean decline. The system states no need (it
  // has none it can state truly) and invents none; it does
  // not seize the helper's role the visitor is standing in,
  // and it does not route the act to the question path,
  // which declined it as a question-type mismatch (run 2:
  // P-065, P-066, P-070). The Social Unit read the act and
  // raised the demand; the Planner's decline discharges it.
  if (openingObject?.act.offerHelp) {
    dischargeDemand(session, "offer-answer");
    trace.planNote =
      "offer of help answered in kind (S2): the offer is received as the social act it is and declined cleanly — no need stated, none invented, the helper's role left with the visitor";
    trace.wordingNotDerived = true;
    return { reply: "No, thank you.", trace };
  }

  // The either/or question (S2, the S programme, 2026-11-19):
  // a choice between two named alternatives, addressed to
  // the system, is its own question form — the question path
  // read it as a property question about the alternatives
  // and declined (run 2: P-056, P-107). The answer comes
  // from the limits facts, in the form the question poses:
  // a preference the system does not hold is answered as no
  // preference; a being the system is neither of is answered
  // as neither, the alternatives named as the visitor named
  // them (the assessment composed the phrases; an alternative
  // naming the system's own kind defeats the shape there,
  // so the neither-form never denies a held self-fact).
  if (openingObject?.act.choiceQuery) {
    dischargeDemand(session, "self-answer");
    trace.wordingNotDerived = true;
    if (openingObject.act.choiceQuery === "preference") {
      trace.planNote =
        "either/or answered (S2, preference form): the choice is picked up as the real question it is and answered from the limits facts — the system holds no preference between the alternatives";
      return { reply: "I don't have a preference.", trace };
    }
    const [first, second] = openingObject.act.choiceAlternatives ?? ["one", "the other"];
    trace.planNote =
      "either/or answered (S2, being form): the choice is answered in its own form — the system is neither alternative, and says so with the alternatives named as posed";
    return { reply: `I am not ${first} or ${second}.`, trace };
  }

  if (openingObject && openingObject.act.meanQuery) {
    const last = session.conversation.lastReply;
    if (last) {
      trace.restatedReply = last;
      trace.planNote =
        "restatement (conversation-shapes C5): the visitor asks what the system meant; the reply re-says the last substantive reply from the Conversation register's record of what was actually said";
      trace.wordingNotDerived = true;
      return { reply: `I said: ${last.text}`, trace };
    }
    trace.planNote =
      "restatement (conversation-shapes C5): the visitor asks what the system meant, and the register holds no substantive reply to restate — the reply says so plainly";
    trace.wordingNotDerived = true;
    return { reply: "I have not said anything yet that I can restate.", trace };
  }

  /* The return acknowledgement (Social Unit S6): this turn
   * stated the interlocutor's identity, and the store held a
   * record under it — the contact is a returning one, and the
   * acknowledgement says so. Recognition is performed only
   * here, on the stated identity, never before it and never
   * from a guess (design §5); a first conversation under a
   * name, and every conversation without one, takes the
   * ordinary statement path below. */
  if (
    assessed[0]?.act.kind === "statement" &&
    session.interlocutor.contact === "returning" &&
    session.interlocutor.identity?.learnedAt === assessed[0].id
  ) {
    trace.planNote =
      "return acknowledgement (S6): the identity stated this turn keys a stored record — the reply acknowledges the return; nothing from the earlier conversation is imported as content, only the picture (contact, established topics) is loaded";
    return { reply: `Welcome back, ${session.interlocutor.identity.name}.`, trace };
  }

  /* The token clarification (Social Unit S4, design §7a and
   * the §3.3 table): a token the machinery resolved only
   * weakly, or not at all, is asked about — not guessed. The
   * located source is the parse's own token record: a
   * resolution standing as "unresolved", or a matcher
   * correction whose recorded confidence fell below the
   * matcher's own undiscounted distance-2 score (0.60) with a
   * rival candidate at the same distance. Only genuine rivals
   * count: a candidate that is the token itself in another
   * case ("How" → "how" at distance 0 — the record of a
   * capital the dictionary lacks, not a doubt) names no
   * choice, and a whole utterance with no resolvable content
   * is the gibberish repair's ground, not this trigger's.
   * The candidates offered are the ones that parse in this
   * sentence — the resolver's own retry test, applied at the
   * turn. An
   * unresolved token with no candidates leaves as the
   * rephrase request (§3.3). The asking turn records nothing
   * of the sentence's content: the sentence is processed when
   * the fill arrives, or on the best reading at the attempt
   * limit. */
  const gibberishTurn = Boolean(
    assessed[0] && normalcyFlagOf(assessed[0], "gibberish") && assessed[0].act.kind === "statement" && assessed[0].aspects.length === 0,
  );
  if (!opts?.clarificationFallback && !gibberishTurn) {
    for (const r of parsed.tokenResolutions ?? []) {
      const isUnresolved = r.outcome === "unresolved";
      const applied = r.replacement[0];
      const appliedDistance = applied ? r.candidates?.find((c) => c.term === applied)?.distance : undefined;
      /* The attested-surface rule (conversation-shapes C4,
       * 2026-11-18): a token the shipped lexicon itself attests
       * is not in doubt, however the resolver scored it — the
       * record can leave an ordinary word "unresolved" for
       * positional reasons (the surface "her." carries its
       * sentence's period; "simple" and "fun" are attested
       * words the matcher scored against rarer neighbours),
       * and the probe run's spurious clarifications were
       * exactly these ("Did you mean here, her, or hero?").
       * The resolver's own doctrine is the same: recognised
       * words stand. The token is passed over; the sentence
       * proceeds on its parse. */
      const surfaceWord = r.surface.toLowerCase().replace(/[^a-z']/g, "");
      if (surfaceWord && isAttestedWord(surfaceWord)) continue;
      /* The proper-name pass (C4, same ground): a capitalised
       * token that is not sentence-initial is the parser's own
       * proper-name signal — the same signal the self-naming
       * reading trusts in social.ts. A name is open-class: the
       * lexicon cannot attest it, and "correcting" it ("Roxie"
       * → "movie, role, or rose") is not doubt but a category
       * error. Sentence-initial capitals get no pass — every
       * sentence opens with one, doubtful or not ("Wethr"). */
      if (r.tokenIndex > 0 && /^[A-Z]/.test(r.surface)) continue;
      /* The digit pass (S4(b), the S programme, 2026-11-19;
       * determination recorded in GAPS §6): a token carrying
       * digits and no letters attests by its form, as a
       * capital attests a name. A digit string is not a word
       * the lexicon could file or fail to file — "2007" is a
       * year, complete as written — and the matcher's doubt
       * about it ("2007" → a shorter numeral?) is the same
       * category error as correcting a name. E2 left digit
       * tokens sinking on the ground that a number is
       * content and its gap stays located; this determination
       * changes the attestation question only — the token no
       * longer triggers a clarification — while the parse's
       * own handling of the number is untouched. A token
       * mixing letters and digits ("2nd", a model number) is
       * a word-form and keeps the ordinary discipline. No
       * position restriction: a digit string is a digit
       * string at any position, where a capital is not. */
      if (!/[a-zA-Z]/.test(r.surface) && /\d/.test(r.surface)) continue;
      // Genuine rival readings only: a candidate that is the
      // token itself in another case ("How" → "how", distance
      // 0) is not a reading the person could choose between —
      // the record carries it because the capitalised form is
      // not in the resolver's dictionary, not because the word
      // is in doubt. Rivals are distinct words at a real
      // distance. A candidate that is a function word is not a
      // genuine rival either (C4): "too" beside "took" and
      // "tool" names no content choice a visitor could settle.
      const genuine = (r.candidates ?? []).filter(
        (c) => c.distance >= 1 && c.term.toLowerCase() !== r.surface.toLowerCase() && !enIsFunctionWord(c.term.toLowerCase()),
      );
      const rivals = genuine.filter((c) => applied && c.term.toLowerCase() !== applied.toLowerCase() && appliedDistance !== undefined && c.distance === appliedDistance);
      const isWeak = (r.outcome === "corrected" || r.outcome === "segmented") && r.confidence < 0.6 && rivals.length > 0;
      if (!isUnresolved && !isWeak) continue;
      /* A token with no letters or digits in it is not a word
       * (E2, the emotional-uptake programme, 2026-11-19): '--',
       * a spaced '.', ':)' — punctuation is the connective
       * layer's scaffolding, and this exit's located gap is a
       * WORD gap, a word the system might build on without
       * knowing it. Punctuation cannot be that gap: in a
       * single-sentence turn, whose only sink it would be, it
       * no longer sinks the turn — a narrative the sentence
       * layer took up whole ("…that I love -- and that
       * comes…") is not rephrased over its dash. A
       * multi-sentence turn keeps the sink: there the exit
       * is the segment recovery's trigger, and the recovery
       * is the better instrument (the P-086 shape — a merged
       * parse of four tellings is garbled where the
       * composition is sound). Digit-bearing tokens are
       * untouched by THIS exemption — their attestation is
       * the digit pass's business above (S4(b)): a pure
       * digit string attests by form there and never reaches
       * this point, and a letter-digit mix keeps its located
       * gap here, as before. */
      if (
        isUnresolved &&
        !(r.candidates?.length) &&
        !/[\p{L}\p{N}]/u.test(r.surface) &&
        splitTurnSegments(text).length <= 1
      ) {
        continue;
      }
      if (isUnresolved && !(r.candidates?.length)) {
        /* Statement recovery at the token exit (conversation-
         * shapes C2, 2026-11-18): this exit is the other place a
         * whole telling sinks on one word — the sentence layer
         * graphs what it can and leaves a token unresolved, and
         * a multi-sentence statement was answered with the
         * rephrase request for the whole turn. When the turn is
         * a statement with segments that stand as their own
         * sentences, take those up instead (the segment that
         * carries the unresolved token is skipped and named in
         * the trace); this turn's whole-surface object is
         * withdrawn from the stream, superseded by the segments'
         * own objects. A single-sentence statement keeps this
         * exit exactly as designed — there is nothing to
         * recover it into. */
        if (assessed[0]?.act.kind === "statement" && !opts?.segmented) {
          const recovered = composeSegmentTurns(
            session,
            text,
            `statement recovery (conversation-shapes C2): the token '${r.surface}' stands unresolved with no candidates, sinking the whole turn at the token exit`,
          );
          if (recovered) {
            for (let i = session.objects.length - 1; i >= 0; i--) {
              if (session.objects[i].producer === "person" && session.objects[i].turn === turn) {
                session.objects.splice(i, 1);
              }
            }
            return recovered;
          }
        }
        /* Feelings first at the token exit (E1, the emotional-
         * uptake programme, 2026-11-19): the recovery above
         * takes up a statement's segments, but a single-sentence
         * statement has none — and one unresolved token (a
         * contraction the token layer cannot resolve, 'i've')
         * sinks a turn whose feeling its first clause states
         * plainly ("I'm so sad because i've read…"). Before the
         * rephrase: if the surface states a filed feeling in
         * the first person, register it and receipt it. The
         * turn's own object stands (the turn is answered as
         * itself, not superseded by segments), and no
         * clarification is opened — the turn was received. */
        if (assessed[0]?.act.kind === "statement") {
          const feltReceipt = feelingsFirstReceipt(session, trace, turn, text);
          if (feltReceipt) return feltReceipt;
        }
        openClarification(session, { openedBy: assessed[0]?.id ?? `turn:${turn}`, point: `token:${r.surface}`, question: "Could you put that another way?" });
        trace.planNote = `token clarification (S4, §7a/§3.3): the token '${r.surface}' is unresolved and no candidates exist — the reply is the rephrase request; the located gap stays in the trace`;
        return { reply: "Could you put that another way?", trace };
      }
      if (isUnresolved && !genuine.length) continue;
      const terms = [
        ...new Set((isUnresolved ? genuine.map((c) => c.term) : [applied, ...genuine.map((c) => c.term)]).filter((t): t is string => !!t)),
      ];
      const offered = terms
        .filter((t) => {
          try {
            parse(text.replace(new RegExp(`\\b${escapeRegExp(r.surface)}\\b`, "i"), t), "en");
            return true;
          } catch {
            return false;
          }
        })
        .slice(0, 3);
      if (offered.length < 2) continue;
      const question =
        offered.length === 2
          ? `Did you mean ${offered[0]}, or ${offered[1]}?`
          : `Did you mean ${offered.slice(0, -1).join(", ")}, or ${offered[offered.length - 1]}?`;
      openClarification(session, {
        openedBy: assessed[0]?.id ?? `turn:${turn}`,
        point: `token:${r.surface}`,
        question,
        candidates: offered.map((t) => ({ term: t, reading: t })),
        originalText: text,
        bestReading: isUnresolved ? offered[0] : (applied ?? offered[0]),
      });
      trace.planNote = `token clarification (S4, §7a): the token '${r.surface}' stands ${isUnresolved ? "unresolved" : `resolved only weakly (confidence ${r.confidence})`} with rival candidates — the reply asks, naming them; the sentence is processed when the fill arrives`;
      return { reply: question, trace };
    }
  }

  /* Insistence (Social Unit S5, design §8): a standing
   * stance-repair pending, and this turn insists on the very
   * premise the stance met — by asserting it, or by asking
   * the same why-question again. The premise is re-read as a
   * supposition and never adopted: an assertion of it is not
   * recorded as a state (the disagreement is its record), and
   * a repeated question is answered under the supposition
   * framing. No second stance, no escalation. (The check
   * lives here, ahead of recording and question routing,
   * because either can carry the turn elsewhere — a repeated
   * why-question over a recorded state routes to the
   * explanation paths, and an assertion would supersede the
   * very state the stance rests on.) */
  {
    const pending = session.conversation.pending;
    if (pending?.kind === "stance-repair" && pending.premise) {
      const premise = pending.premise;
      // The predication, in either shape the parser draws it:
      // the copula's predicated-as edge, or a verb-rooted
      // reading where the quality stands as the root and the
      // subject as its agent.
      const pred = parsed.meaning.edges.find((e) => e.relation === "predicated-as" || e.relation === "predicate");
      const copulaSubj = pred ? parsed.meaning.nodes.find((n) => n.id === pred.from) : undefined;
      const copulaQual = pred ? parsed.meaning.nodes.find((n) => n.id === pred.to) : undefined;
      const rootNode = parsed.meaning.nodes.find((n) => n.id === parsed.meaning.rootId);
      const agentNode = parsed.meaning.edges
        .filter((e) => e.from === parsed.meaning.rootId && e.relation === "agent")
        .map((e) => parsed.meaning.nodes.find((n) => n.id === e.to))
        .find(Boolean);
      const predSubj = copulaSubj ?? (rootNode?.lemma.toLowerCase() === premise.quality ? agentNode : undefined);
      const predQual = copulaQual ?? (rootNode?.lemma.toLowerCase() === premise.quality ? rootNode : undefined);
      const assertsPremise =
        predSubj?.lemma.toLowerCase() === premise.subject && predQual?.lemma.toLowerCase() === premise.quality;
      const repeatsQuestion =
        rootNode?.states?.mood === "interrogative" &&
        rootNode?.states?.questionKind === "why" &&
        assertsPremise;
      if (repeatsQuestion) {
        recordDisagreement(session, `${premise.subject} is ${premise.quality}`, `${premise.subject} is ${premise.established}`);
        closePending(session);
        trace.stance = {
          subject: premise.subject,
          presupposed: premise.quality,
          established: premise.established,
          source: premise.source ?? "graph",
          outcome: "insistence-met-as-supposition",
          ground: "the premise was met by the stance on an earlier turn and the same why-question is asked again; it is re-read as a supposition and the disagreement is recorded",
        };
        trace.planNote =
          "insistence (S5): the premise is re-read as a supposition — the answer is framed under it, the premise is not adopted, and the disagreement stands in the record";
        return {
          reply: `Supposing ${premise.subject} were ${premise.quality} — I have nothing that would make ${premise.subject} ${premise.quality}. As I have it, ${premise.subject} is ${premise.established}.`,
          trace,
        };
      }
      if (assertsPremise && assessed[0]?.act.kind === "statement") {
        recordDisagreement(session, `${premise.subject} is ${premise.quality}`, `${premise.subject} is ${premise.established}`);
        closePending(session);
        trace.stance = {
          subject: premise.subject,
          presupposed: premise.quality,
          established: premise.established,
          source: premise.source ?? "graph",
          outcome: "insistence-not-adopted",
          ground: "the turn asserts the premise the stance already met; the assertion is not recorded — the disagreement is",
        };
        trace.planNote =
          "insistence by assertion (S5): the premise is not adopted and not recorded as a state; the disagreement stands in the record and the ground is restated briefly";
        return { reply: `${cap(premise.subject)} is ${premise.established}, as I have it.`, trace };
      }
    }
  }

  /* ---- gibberish repair (the Normalcy arc, Part 3e): a whole
   * utterance with no resolvable content — the joint
   * Normalcy+Coherence gibberish flag is priced on this turn's
   * object, and no classified aspect was extracted from it —
   * gets the puzzled, tentative repair question, before any
   * recording or steering can mistake its guessed fragments
   * for an event. The flag itself is never spoken as a
   * verdict; the reply ASKS. ---- */
  {
    const gib = assessed[0] ? normalcyFlagOf(assessed[0], "gibberish") : undefined;
    if (gib && assessed[0].act.kind === "statement" && assessed[0].aspects.length === 0) {
      trace.gibberishRepair = { detail: gib.detail };
      trace.planNote =
        "gibberish repair: the utterance arrived with no resolvable content (NormalcyAssessment's " +
        "gibberish flag, priced by CoherenceAnalysis) — the reply is the repair question, and nothing " +
        "from the utterance's guessed fragments is recorded or steered on";
      return { reply: "What is that? Gibberish?", trace };
    }
  }

  /* ---- record: entities, pronoun resolutions, events, states ---- */
  const resolve = (lemma: string): string => {
    if (lemma === "it" || lemma === "them") {
      const hit = resolvePronoun(session, lemma, turn);
      if (hit) {
        trace.resolutions.push({ pronoun: lemma, resolvedTo: hit.lemma });
        return hit.lemma;
      }
    }
    return holderOf(lemma);
  };
  for (const n of parsed.meaning.nodes) {
    if (n.syntacticElement === "Earth") recordEntity(session, n.lemma, turn);
  }
  const classificationOf = (lemma: string) => {
    const c = lookupClassification(lemma);
    if (c) trace.classifications.push({ concept: c.concept, element: c.element, confidence: c.confidence, provenance: c.provenance });
    else if (!climbClassification(lemma)) {
      // Slice C: neither the table nor the climb classifies this
      // lemma — record what the climb recognised instead, so the
      // turn's record distinguishes "kind known, element unclaimed"
      // from "wholly unknown".
      const rec = climbRecognitions(lemma)[0];
      if (rec) trace.recognitions.push({ concept: lemma, category: rec.category, stopSynset: rec.stopSynset });
    }
    return c;
  };

  const predEdge = parsed.meaning.edges.find((e) => (e.relation === "predicate" || e.relation === "predicated-as") && e.to === root.id);
  const isVerbRoot = root.syntacticElement === "Wood" && root.role === "verb";

  /* R5 (§8.7 S12): the state this turn records, held before it
   * is pushed — the correction trigger reads it against the
   * standing states first, since a correction replaces a
   * standing state rather than accumulating beside it. The
   * push (or the supersession standing in for it) happens in
   * one place, after both recording branches. */
  let newState: StateRecord | undefined;
  /** The new state's classification aspect label (the value
   *  rule's slot), when it is classified. */
  let newStateAspect: string | undefined;
  /** The person's own subject material for the new state —
   *  the correction graph's subject, when a correction fires. */
  let newStateSubject: PredicationSubject | undefined;
  /** Whether the new state is a predicated quality (its turn
   *  is a predicate clause) rather than a verb-carried state:
   *  the correction graph predicates qualities, so only a
   *  predicable correction gets the delta graph (§8.7 S12). */
  let newStatePredicable = false;

  if (isVerbRoot) {
    const agent = targets(parsed, root.id, "agent")[0];
    const ev = {
      verb: root.lemma,
      agent: agent ? resolve(agent.lemma) : undefined,
      patient: targets(parsed, root.id, "patient")[0]?.lemma,
      theme: targets(parsed, root.id, "theme")[0]?.lemma,
      location: targets(parsed, root.id, "location")[0]?.lemma,
      recipient: targets(parsed, root.id, "recipient")[0]?.lemma,
      turn,
      text,
    };
    if (ev.patient) ev.patient = resolve(ev.patient);
    if (ev.location) ev.location = resolve(ev.location);
    session.events.push(ev);
    // A classified verb-state (sleep) is also a state of its agent.
    const c = classificationOf(root.lemma);
    if (c && ev.agent) {
      newState = {
        holder: ev.agent, lemma: root.lemma, concept: c.concept, element: c.element,
        negated: root.states?.negated, turn, origin: classifiedOrigin(c),
      };
      newStateAspect = c.aspect;
      newStateSubject = subjectMaterialFor(ev.agent, agent, root);
    }
  } else if (predEdge) {
    const subject = nodeById(parsed, predEdge.from);
    const c = classificationOf(root.lemma);
    const holder = resolve(subject.lemma);
    newState = {
      holder,
      lemma: root.lemma,
      concept: c?.concept,
      element: c?.element ?? root.semanticElement,
      // R5: the predicate site records the parsed negation, as
      // the verb site already did — without it a negated state
      // stands in the record as its positive, and the polarity
      // half of the correction trigger has nothing to read.
      negated: root.states?.negated,
      turn,
      // No classification: the state is the person's own sentence
      // as parsed, its element the lexicon's semantic address —
      // origin "parsed", with no derivation behind it (§9.4.1).
      origin: c ? classifiedOrigin(c) : { kind: "parsed" },
    };
    newStateAspect = c?.aspect;
    newStateSubject = subjectMaterialFor(holder, subject, root);
    newStatePredicable = true;
  }
  /* X1 (the X programme, 2026-11-19): a name as told. The
   * token resolver's matcher substitutes its nearest known
   * word for an unknown one — for a quality that is a NAME
   * that substitution falsifies the record: "Her name is
   * Roxie." recorded the state name/movie, the matcher's
   * neighbour for the name, and every later reading of the
   * record (a receipt, a name answer) would speak the guess
   * as the person's word. A capitalised token the matcher
   * replaced, standing after the sentence's first token
   * (where capitalisation is the sentence's, not the word's),
   * is a name as the person told it: the state records the
   * surface the person wrote, with no classification of the
   * guess behind it — a name's provenance is the telling,
   * exactly as the identity register holds a name (C6).
   * Ordinary qualities keep the corrected lemma: a typo'd
   * quality word is read as the word it corrects to, which
   * is what the filings key on. */
  if (newState && predEdge) {
    const realisedTokens = parsed.realizes[root.id] ?? [];
    const nameCorrection = (parsed.tokenResolutions ?? []).find(
      (r) =>
        r.outcome === "corrected" &&
        r.tokenIndex > 0 &&
        realisedTokens.includes(r.tokenIndex) &&
        /^[A-Z]/.test(r.surface) &&
        r.surface.toLowerCase() !== root.lemma,
    );
    if (nameCorrection) {
      newState = {
        ...newState,
        lemma: nameCorrection.surface.toLowerCase(),
        concept: undefined,
        element: undefined,
        origin: { kind: "parsed" },
      };
      newStateAspect = undefined;
    }
  }
  for (const n of parsed.meaning.nodes) {
    if (n.id !== root.id && n.syntacticElement !== "Wood") classificationOf(n.lemma);
  }
  trace.classifications = trace.classifications.filter(
    (c, i, a) => a.findIndex((x) => x.concept === c.concept && x.element === c.element) === i,
  );
  trace.recognitions = trace.recognitions.filter(
    (r, i, a) => a.findIndex((x) => x.concept === r.concept && x.category === r.category) === i,
  );

  /* ---- R5 (§8.7 S12): the recorded state stands — by plain
   * push, or by the supersession the correction trigger fired.
   * A correction turn's reply is the correction reply (the
   * delta, predicated), and it preempts the rest of the turn,
   * as the clarification preempts steering in R3. Question
   * turns never trigger: they record, they do not assert. ---- */
  if (newState) {
    const found =
      (root.states?.mood ?? "indicative") === "indicative" ? findCorrection(session, newState, newStateAspect) : undefined;
    if (found) {
      const { delta, rule, ground } = found;
      trace.correction = {
        rule,
        holder: delta.holder,
        replaced: { lemma: delta.replaced.lemma, ...(delta.replaced.negated ? { negated: true } : {}), turn: delta.replaced.turn },
        replacing: { lemma: delta.replacing.lemma, ...(delta.replacing.negated ? { negated: true } : {}), turn: delta.replacing.turn },
        ground,
      };
      if (newStatePredicable && newStateSubject) {
        const outcome = planCorrection({
          subject: newStateSubject,
          replaced: { lemma: delta.replaced.lemma, ...(delta.replaced.negated ? { negated: true } : {}) },
          replacing: { lemma: delta.replacing.lemma, ...(delta.replacing.negated ? { negated: true } : {}) },
          copulaTense: root.states?.copulaTense ?? (root.states?.tense === "past" ? "past" : "present"),
        });
        trace.replyGraph = serialiseReplyGraph(outcome.graph);
        trace.wordingNotDerived = false;
        speakWithObject(session, trace, outcome.graph, "correction");
        trace.planNote =
          "reply is the planner's correction graph, built from the supersession delta (§8.7 S12): " +
          "the acknowledgement's content is the delta and the person's own subject material, nothing else";
        return { reply: outcome.sentence, trace };
      }
      // The supersession stands (findCorrection recorded it),
      // but a verb-carried state is not a quality the
      // predication construction can predicate — there is no
      // honest delta graph for it. Steering proceeds on the
      // corrected state, and the gap is named on the
      // correction record rather than papered over with a
      // broken predication.
      trace.correction.note =
        `no acknowledgement graph is built: the corrected state is verb-carried — '${newState.lemma}' names ` +
        `something the person does, not a quality the predication construction predicates — so steering ` +
        `proceeds on the corrected state`;
    } else {
      session.states.push(newState);
    }
  }

  /* Feelings first (E1, the emotional-uptake programme,
   * 2026-11-19): the parse took the turn up, but the merged
   * graph carried it on another root and the feeling clause
   * fell out — "I'm so sad because i've read…" graphed on
   * 'read', "i'm so excited because i'm finally going to
   * visit…" on 'excite' — so no state the recording above
   * made is the feeling the person stated. The surface still
   * states it, in the first person, and it is the person's
   * own stated feeling: it registers here, through the same
   * supersession as every recorded state, and the reply
   * branches below read it as they read any state of the
   * turn (an element-carrying feeling steers as a parsed one
   * does; an element-less one is shown by the recognition
   * receipt at the acknowledgement site). Narrow by
   * construction: the scan's clause-initial first-person
   * frames, a word the authorities file as a feeling, and
   * only when this turn's recording did not already register
   * that feeling. */
  let surfaceFeeling: StateRecord | undefined;
  {
    const felt = scanStatedFeeling(text);
    if (
      felt &&
      newState?.lemma !== felt.lemma &&
      !session.states.some((s) => s.turn === turn && s.lemma === felt.lemma)
    ) {
      surfaceFeeling = registerStatedFeeling(
        session,
        trace,
        turn,
        felt,
        (root.states?.mood ?? "indicative") === "indicative",
      );
    }
  }

  /* ---- questions: answer from the derivation, or decline in shape ---- */
  // R6 (§8.10, gate 1): an interrogative turn is the person's
  // own question — initiative never fires on it, whatever the
  // answer's shape.
  if (root.states?.mood === "interrogative") trace.personPresented = "question";
  if (root.states?.mood === "interrogative" && predEdge) {
    const subject = nodeById(parsed, predEdge.from);
    return answerPredicateQuestion(session, trace, subject, root, root.states?.questionKind === "why", topicsBefore);
  }
  if (root.states?.mood === "interrogative") {
    /* The how-many reader (2026-11-17): a "How many …?"
     * question is answered from the quantity ledger before
     * the shape declines below — the ledger, not the
     * sentence's shape, is what such a question asks after. */
    const howMany = answerHowMany(session, trace, text);
    if (howMany) return howMany;
    /* The feeling reader (R1, the recognition programme,
     * 2026-11-19): "How do I feel?" is answered from the
     * record's standing feeling state of the speaker, before
     * the shape declines below — the record is the first
     * source for what the conversation itself established. */
    const feelingAnswer = answerFeelingFromRecord(session, trace, parsed, root, text);
    if (feelingAnswer) return feelingAnswer;
    /* The mention check (X2, the X programme, 2026-11-19):
     * "Did I mention X?" / "Did I tell you about X?" are
     * answered from the record as it stood before this turn,
     * yes or no as the record stands. */
    const mentionAnswer = answerMentionFromRecord(session, trace, parsed, root, turn);
    if (mentionAnswer) return mentionAnswer;
    /* The self-fact readers (X4, the X programme,
     * 2026-11-19): occupation, possession and name
     * remembrance — the Interlocutor picture's contents,
     * answered as told. */
    const selfFactAnswer = answerSelfFactFromRecord(session, trace, parsed, root, turn);
    if (selfFactAnswer) return selfFactAnswer;
    /* R3 (§6): this decline, like every decline, cites its
     * ground. Where the parse carries a query record over a
     * verb, the question asks for the filler of one role of
     * that verb; if nothing the person has said fills that
     * role in a recorded event of the verb, the ground is the
     * MISSING ROLE, named in plain words on the surface. If
     * the record does fill it, the ground is the shape: the
     * net answers questions about what things are like, from
     * derivations — it does not yet answer questions over
     * recorded events. Shapes with no query record decline on
     * the shape ground likewise. (R1, 2026-11-19: the record
     * answers below now stand between this ground and the
     * declines — a role the record fills, and the
     * conversation's topic, are answered from the record
     * first; the declines stand for what the record does not
     * hold.) */
    const q = parsed.query;
    const verbEntry = EN_LEXICON[root.lemma] as VerbEntry | undefined;
    if (q && isVerbRoot && verbEntry && verbEntry.kind === "verb") {
      const QUESTION_FILLERS = new Set(["what", "who", "where", "when", "which", "why"]);
      const fillingEvent = [...session.events].reverse().find((e) => {
        if (e.turn >= turn || e.verb !== root.lemma) return false;
        const v = (e as unknown as Record<string, unknown>)[q.relation];
        return typeof v === "string" && !QUESTION_FILLERS.has(v);
      });
      const filledBefore = fillingEvent !== undefined;
      /* R1: the event answer. A recorded event of this verb
       * fills the asked role — the conversation itself
       * established what the question asks — so the answer
       * comes FROM THE RECORD, attributed as a telling ("You
       * told me …"), and the shape decline below never calls
       * the question unanswerable. The event must carry its
       * agent: the rendering speaks the record's agent in the
       * record's grain ('you' for the speaker, 'the X' for a
       * third party), and an event the record cannot
       * attribute is not rendered as anyone's doing. The
       * rendering is the record's fields — verb, patient /
       * theme, location, recipient — in the acknowledgement
       * family's own clause shape (branch (f) below). */
      if (fillingEvent && fillingEvent.agent) {
        const ev = fillingEvent;
        const filler = String((ev as unknown as Record<string, unknown>)[q.relation]);
        /* S0 (the S programme, 2026-11-19): the record answer
         * renders the event in the same family clause, so it
         * passes the same admission (soundEventClause). An
         * event whose fills cannot soundly be spoken is not
         * rendered as an answer — the declines below stand,
         * with the stand-down named in the plan note. */
        const clause = soundEventClause(session, ev, { lowerSubject: true });
        if (!clause) {
          trace.planNote =
            `the record holds an event of '${root.lemma}' filling the asked ${q.relation}, but its fills fail ` +
            `the rendering admission (S0) — the record answer stands down and the decline below speaks`;
        } else {
        trace.recordAnswer = {
          source: "event",
          ground:
            `the question asks for the ${q.relation} of '${root.lemma}', and the recorded event of turn ${ev.turn} ` +
            `fills it ('${filler}') — the record answers, as what the person told`,
          event: { verb: ev.verb, role: q.relation, filler, turn: ev.turn },
        };
        trace.handAnswered = {
          by: "session-and-situation",
          evidence: `the recorded event '${ev.verb}' of turn ${ev.turn} fills the asked ${q.relation} with '${filler}'`,
        };
        trace.planNote =
          "answered from the conversation record (R1): the recorded event fills the asked role — the reply renders " +
          "the event under the record attribution ('You told me'); the graph was not consulted and no derivation was run";
        return { reply: `You told me ${clause}.`, trace };
        }
      }
      if (!filledBefore) {
        /* R1: the topic answer. A question after what the
         * conversation is about — a talk/discuss question
         * asking its theme — is answered from the Topic
         * records: the established topic latest touched that
         * stands from before this turn and whose lemma can be
         * named (soundTopicLemma). The reply states the
         * topic as the conversation's own — "We were talking
         * about …" is the record speaking of itself, and no
         * graph content is claimed. No nameable topic stands
         * → the missing-role decline below, unchanged. */
        if ((root.lemma === "talk" || root.lemma === "discuss") && (q.relation === "theme" || q.relation === "patient")) {
          const topic = session.topics
            .filter((t) => t.raisedTurn < turn && soundTopicLemma(t.lemma))
            .sort((a, b) => b.lastTouchedTurn - a.lastTouchedTurn)[0];
          if (topic) {
            trace.recordAnswer = {
              source: "topic",
              ground:
                `the question asks what the conversation is about, and the Topic records hold '${topic.lemma}' ` +
                `(raised at turn ${topic.raisedTurn}, last touched at turn ${topic.lastTouchedTurn}) — the record answers`,
              topic: topic.lemma,
            };
            trace.handAnswered = {
              by: "session-and-situation",
              evidence: `the Topic record '${topic.lemma}' (raised turn ${topic.raisedTurn}) is the conversation's established topic`,
            };
            trace.planNote =
              "answered from the conversation record (R1): the established topic, from the Topic records — " +
              "the reply names what the conversation has established, and claims nothing from the graph";
            return { reply: `We were talking about the ${topic.lemma}.`, trace };
          }
        }
        // The question's own filled prep roles season the
        // phrase ("what was put in the soup") — the person's
        // own words for the part they did supply.
        const tail = parsed.meaning.edges
          .filter((e) => e.from === root.id && e.relation !== q.relation && e.relation !== "agent")
          .map((e) => nodeById(parsed, e.to))
          .filter((n) => n.prep && !n.questionWord)
          .map((n) => ` ${n.prep} ${n.det ? `${n.det} ` : ""}${n.form}`)
          .join("");
        const participle = verbEntry.forms.participle;
        const phrase =
          q.relation === "theme" || q.relation === "patient"
            ? `what was ${participle}${tail}`
            : q.relation === "recipient"
              ? `who it was ${participle} to${tail}`
              : q.relation === "location" || q.relation === "goal"
                ? `where it was ${participle}${tail}`
                : `what the ${q.relation} of '${root.lemma}' was${tail}`;
        trace.declineReason =
          `the question asks for the ${q.relation} of '${root.lemma}', and no ${root.lemma} event in the situation ` +
          `fills that role — the missing role is the decline's ground (§6)`;
        return {
          reply: `I can't answer that from what I know: nothing you have told me says ${phrase}.`,
          trace,
        };
      }
      trace.declineReason =
        `the question asks over a recorded event ('${root.lemma}'), and the net answers questions about what ` +
        `things are like, not questions over events — the question's shape is the decline's ground (§6)`;
      return {
        reply: "I can't answer that from what I know: that asks about something that happened, and I answer questions about what things are like.",
        trace,
      };
    }
    trace.declineReason = "this question shape is not one the net can answer yet";
    return {
      reply: "I can't answer that from what I know: I answer questions about what things are like, and that one asks something else.",
      trace,
    };
  }

  /* The name this turn's acknowledgements may address the
   * visitor by (conversation-shapes C6): the identity stated
   * and learned on this turn itself — the S6 check's pattern.
   * Read once here; the acknowledgement sites below pass it to
   * acknowledgementFor. A name learned on an earlier turn is
   * the return acknowledgement's and the initiative's ground,
   * not every receipt's. */
  const ackName =
    session.interlocutor.identity && session.interlocutor.identity.learnedAt === assessed[0]?.id
      ? session.interlocutor.identity.name
      : undefined;

  /* ---- R3 (§2.3, second gap shape): a rival split preempts
   * statement steering. The sense arithmetic cannot separate
   * two rival derivations of a word the person just used; a
   * reply that steered by the classification anyway would be
   * steering by the tie-keep convention. The clarification is
   * the reply; the turn's content stands recorded above. (The
   * interrogative returns above have already run, so this point
   * is reached only by statement turns.) ---- */
  {
    const allSplits = rivalSplits(parsed);
    // Social Unit S4: a lemma whose reading this conversation
    // has already settled through clarification is not asked
    // about again — the split stands in the trace of the sense
    // pass, but the conversational point is closed.
    const splits = allSplits.filter((s) => !session.conversation.clarifiedSenses[s.lemma.toLowerCase()]);
    if (allSplits.length && !splits.length) {
      trace.planNote = `the split classification of '${allSplits[0].lemma}' stands, but the conversation has already settled its reading ('${session.conversation.clarifiedSenses[allSplits[0].lemma.toLowerCase()].anchor}') through clarification — no second asking (Social Unit S4)`;
    }
    if (splits.length) {
      const split = splits[0];
      const node = nodeById(parsed, split.nodeId);
      const outcome = planClarification({
        subject: { lemma: node.lemma, form: node.form, ...(node.det ? { det: node.det } : {}) },
        alternatives: [split.rivals[0].anchor, split.rivals[1].anchor],
      });
      if (outcome.kind === "graph") {
        trace.clarification = {
          lemma: split.lemma,
          baseline: split.baseline,
          rivals: split.rivals.map((r) => ({ element: r.element, anchor: r.anchor, confidence: r.confidence, support: r.support })),
          ground:
            `the classification of '${split.lemma}' is split between rival derivations — ` +
            split.rivals.map((r) => `${r.anchor} (${r.element}) at support ${r.support}, confidence ${r.confidence}`).join(" vs ") +
            ` — at equal coherence support; the baseline (${split.baseline}) stands only by the sense pass's tie-keep convention`,
        };
        trace.replyGraph = serialiseReplyGraph(outcome.graph);
        trace.wordingNotDerived = false;
        speakWithObject(session, trace, outcome.graph, "clarification question");
        // Social Unit S4 (design §7b): the asking opens the
        // pending — the next turn is read as its fill first.
        // The candidates offered for matching are each rival's
        // anchor plus its sense's own lemmas (read off the
        // rival's path), so a fill may name the reading in any
        // of the words the senses themselves carry.
        {
          const senseLemmas = (path: string): string[] => {
            const m = path.match(/\[n sense \d+: ([^\]]+)\]/);
            return m ? m[1].split("/").map((w) => w.trim().toLowerCase()) : [];
          };
          const offered = split.rivals.slice(0, 2).flatMap((r) =>
            [...new Set([r.anchor.toLowerCase(), ...senseLemmas(r.path)])]
              .filter((t) => t !== split.lemma.toLowerCase())
              .map((t) => ({ term: t, reading: r.anchor, element: r.element })),
          );
          const baselineRival = split.rivals.find((r) => r.element === split.baseline) ?? split.rivals[0];
          openClarification(session, {
            openedBy: assessed[0]?.id ?? `turn:${turn}`,
            point: `sense:${split.lemma}`,
            question: outcome.sentence,
            candidates: offered,
            originalText: text,
            bestReading: baselineRival.anchor,
            bestElement: baselineRival.element,
          });
        }
        trace.planNote =
          `reply is the planner's clarification question over the split classification of '${split.lemma}' (§2.3)` +
          (split.rivals.length > 2 ? `; a third tied rival (${split.rivals[2].anchor}) is recorded in the clarification record but not offered` : "") +
          (splits.length > 1 ? `; further split nodes not asked (one clarification per turn): ${splits.slice(1).map((s) => s.lemma).join(", ")}` : "");
        return { reply: outcome.sentence, trace };
      }
      trace.planNote =
        `a clarification for the split classification of '${split.lemma}' was unrealisable: ${outcome.reason}; ` +
        `steering proceeds on the baseline (${split.baseline})`;
    }
  }

  /* ---- statements: steer by cycle ---- */
  const thisState = session.states.filter((s) => s.turn === turn && s.element).pop();
  const thisEvent = session.events.filter((e) => e.turn === turn).pop();

  /* The premise stance for an ASSERTED premise (Social Unit
   * S5's trigger, extended — conversation-shapes C7,
   * 2026-11-18): S5 wired the stance for why-questions only,
   * so a false premise carried as an assertion was recorded
   * and acknowledged, and the stance never appeared (the
   * probe run's bar-8 shape: the system neither complied nor
   * endorsed, but said nothing). The trigger is the same
   * degree, read the same way: this turn asserted a
   * predication (subject predicated as quality, unnegated),
   * and Coherence's premise degree finds it contradicted —
   * by the GRAPH. The record source is deliberately not this
   * trigger's: a predication the visitor's own record
   * contradicts is a correction of their record, which the
   * supersession machinery already answers; the stance is
   * for what the system's own knowledge contradicts. Absence
   * stays absence (no stance, the ordinary path), and mere
   * tension stays annotation-only, exactly as in S5.
   *
   * The response reuses S5's pattern: the established ground
   * is stated in plain words as the system's own knowledge,
   * the assertion is not recorded as a state (the
   * disagreement is its record — the asserted state recorded
   * above is set aside), and a stance-repair pending opens,
   * so an insistence on the premise meets the supposition
   * treatment the S5 block above already gives it. */
  {
    const predEdgeA = parsed.meaning.edges.find((e) => e.relation === "predicated-as" || e.relation === "predicate");
    const predSubjectA = predEdgeA ? nodeById(parsed, predEdgeA.from) : undefined;
    const assertedIdx =
      predSubjectA && assessed[0]?.act.kind === "statement" && !root.states?.negated
        ? session.states.findIndex(
            (s) => s.turn === turn && s.holder === predSubjectA.lemma.toLowerCase() && s.lemma === root.lemma && !s.negated,
          )
        : -1;
    if (predSubjectA && assertedIdx >= 0) {
      const subjectLemma = predSubjectA.lemma.toLowerCase();
      const check = premiseDegree(session, subjectLemma, root.lemma);
      if (check.degree === "contradiction" && check.source === "graph" && check.establishedQuality) {
        const established = check.establishedQuality;
        session.states.splice(assertedIdx, 1);
        recordDisagreement(session, `${subjectLemma} is ${root.lemma}`, `${subjectLemma} is ${established}`);
        openStanceRepair(session, {
          openedBy: `turn:${turn}`,
          premise: { subject: subjectLemma, quality: root.lemma, established, source: "graph" },
        });
        trace.stance = {
          subject: subjectLemma,
          presupposed: root.lemma,
          established,
          source: "graph",
          outcome: "stated",
          ground:
            `${check.ground ?? ""}; the premise arrived as an assertion (conversation-shapes C7) — ` +
            `the asserted state was set aside and the disagreement recorded, as an insisted premise's is`,
        };
        trace.planNote =
          "premise stance on an assertion (conversation-shapes C7, S5's pattern): Coherence's premise degree is contradiction from the graph — the reply states the established ground; the assertion is not adopted and does not stand as a state";
        return { reply: `${cap(predSubjectA.form)} is ${established}, as I have it.`, trace };
      }
      /* The absence stance (S3, the S programme, 2026-11-19;
       * determination recorded as Part I of the repair
       * programme): the same asserted predication, the degree
       * read the other way. Where the degree is absence, the
       * claim is CHECKABLE — its quality is classified on an
       * aspect the graph speaks to, and its subject is a term
       * of the graph's correspondence order (a season, a time,
       * an element — a claim about the standing order, not a
       * telling about a classified thing) — and the graph
       * neither supports it (premiseSupport, over the degree's
       * own edge family, the axes rule included) nor
       * contradicts it, then
       * silence would read as endorsement by default: the
       * reply states the absence, located on the claim, in
       * the visitor's language. The stance differs from
       * contradiction's in every consequence: the asserted
       * state STANDS in the record as told (the system does
       * not know otherwise — setting aside is for what it
       * knows against), no disagreement is recorded (there is
       * no established ground to disagree with), and no
       * stance-repair pending opens (an insistence meets the
       * same absence again, not a supposition treatment). A
       * claim already standing in the record from an earlier
       * turn does not draw the stance again — it was stated
       * at the claim's first telling, and the repeat is
       * record business. Uncheckable claims (a quality the
       * graph does not classify, a subject it does not hold)
       * and supported claims keep the ordinary path: absence
       * there is not a located gap, it is the conversation's
       * normal ground. */
      if (check.degree === "absence") {
        const alreadyTold = session.states.some(
          (s) => s.turn < turn && s.holder === subjectLemma && s.lemma === root.lemma && !s.negated,
        );
        // Checkable, per Part I.2: the quality is classified
        // on an aspect the graph speaks to, and the subject
        // is a term of the graph's correspondence order — a
        // claim about the standing order, not a telling about
        // a classified thing (the soup, the garden, the tea
        // of the conversation's ordinary business).
        const checkable =
          lookupClassification(root.lemma)?.aspect !== undefined && isCorrespondenceTerm(session, subjectLemma);
        if (!alreadyTold && checkable && !premiseSupport(session, subjectLemma, root.lemma)) {
          trace.stance = {
            subject: subjectLemma,
            presupposed: root.lemma,
            established: "",
            source: "graph",
            outcome: "absence-stated",
            ground:
              `Coherence's premise degree is absence and the graph holds no supporting path either — ` +
              `the claim is checkable (its quality is classified, its subject a term of the correspondence order) and unsupported; ` +
              `the asserted state stands in the record as told, and the reply states the absence rather than letting silence endorse it (S3)`,
          };
          trace.planNote =
            "absence stance (S3): an asserted checkable claim the graph neither supports nor contradicts — the reply states the absence, located on the claim; the assertion stands in the record as told";
          trace.wordingNotDerived = true;
          return { reply: `I don't have ${predSubjectA.form} as ${root.lemma} in what I know.`, trace };
        }
      }
    }
  }

  // (a) The new state CONTROLS an earlier state: address the restrainer.
  // R4 (§9.1(b)): this is the steering junction where two grounded
  // moves compete — addressing the restrainer (this branch) and
  // following the new state's generating direction (branch (c)).
  // The session's disposition selects between them by its declared
  // preference; under the neutral composition the standing order
  // (this branch first) stands, with no record.
  // S0 (the S programme, 2026-11-19): the steering branches
  // below speak the new state's lemma ("you were X", "What is
  // the X about?") — a lemma the token resolver's matcher
  // substituted for a different written word is not spoken
  // (correctedAdoption). A state so held stands in the record
  // and the acknowledgement path below answers the turn; the
  // cycles do not steer from a guess.
  const thisStateSpeakable = thisState ? !correctedAdoption(parsed, thisState.lemma) : false;
  /* X0 (the X programme, 2026-11-19): steering respects the
   * record's negation. Branches (a) and (c) below speak the
   * new state in its positive form ("you were sad", "What
   * did you say or do?") — over a state the record holds
   * NEGATED ("I don't feel sad." recording you/sad negated)
   * that steering asserts the very feeling the person denied,
   * which is a misreading of the record, not a move on it.
   * A negated feeling does not steer: the branches stand
   * down, the stand-down is named here, and the turn takes
   * the acknowledgement path (whose receipt already declines
   * to predicate a negated state). Branch (b) needs no gate:
   * it requires no new state, and its candidate scan already
   * passes negated states over (R5). The initiative scan
   * likewise already excludes negated states.
   * Refined at the programme's gating (2026-11-19): the
   * stand-down's object is a rendering that DROPS the
   * negation — branch (a)'s predication ("and you were X")
   * and branch (c)'s predicated shape ("You were X.").
   * Branch (c)'s verb-carried shape renders the negation
   * itself ("You can't sleep.") — steering that speaks the
   * record's negation faithfully is not the misreading, and
   * standing it down cost the priced steering its founding
   * specimen (the worry-sleep scenario: "I couldn't sleep."
   * drew the plain ack and no cycle path). So the gate
   * stands down a negated state only where no negation-
   * faithful shape stands for it: branch (a) keeps the gate
   * whole (it has no such shape), and branch (c) admits a
   * negated state that is verb-carried, whose only rendering
   * in the branch is the faithful one. */
  const thisStateNegated = Boolean(thisState?.negated);
  /* The verb-carried test, computed here with branch (c)'s
   * own evidence (the R3 composition guard's): the state
   * stands together with its own event of the same verb. */
  const thisStateVerbCarried = thisState
    ? isVerbRoot &&
      session.events.some((e) => e.turn === turn && e.verb === thisState.lemma && e.agent === thisState.holder)
    : false;
  if (thisState?.element && thisStateSpeakable && thisStateNegated && !thisStateVerbCarried) {
    trace.steeringNote =
      `the state '${thisState.lemma}' of this turn stands negated in the record ('not ${thisState.lemma}') — ` +
      "the steering family does not steer from an absence (X0): branches (a) and (c) stand down and the acknowledgement path answers the turn";
  }
  if (thisState?.element && thisStateSpeakable && !thisStateNegated) {
    const restrained = session.states.find(
      (s) => s.turn < turn && s.element && CONTROLS[thisState.element!] === s.element,
    );
    if (restrained) {
      const selection = selectMove(session.disposition, ["restrainer", "generating"]);
      pushBias(trace, selection.record ? [selection.record] : undefined);
      if (selection.move === "generating") {
        // The disposition selected the generating follow over
        // addressing the restrainer: branch (c) below speaks.
        // (Branch (b) cannot intervene — it requires no new state.)
        trace.steeringNote =
          "two grounded moves competed (the new state restrains an earlier state, and its generating " +
          "direction stands open); the disposition selected the generating follow — see the bias record";
      } else {
      trace.cyclePath = `${thisState.element}→${restrained.element} (controlling)`;
      // R6 (§8.10): this reply takes the restrained state's
      // thread up — initiative does not re-take it this turn.
      trace.addressedState = { holder: restrained.holder, lemma: restrained.lemma, turn: restrained.turn };
      const d = derive(session.graph, thisState.concept ?? thisState.lemma);
      trace.derivationPath = d.conclusions[0]?.path;
      recordPricing(trace, d, d.conclusions[0]);
      noteSteeringScope(trace);
      trace.generatingMargin = false;
      const stateNoun = thisState.lemma === "worried" ? "worry" : thisState.concept ?? thisState.lemma;
      const reply =
        `You ${restrained.negated ? "couldn't" : "were held from"} ${restrained.lemma === "sleep" ? "sleep" : restrained.lemma}, and you were ${thisState.lemma}. ` +
        `What is the ${stateNoun} about? That seems to be the thing holding the ${restrained.lemma} back.`;
      return { reply, trace };
      }
    }
  }

  // (b) An event vents an earlier state: meet it from the restraining side.
  if (thisEvent && !thisState) {
    const candidates = session.states.filter((s) => s.turn < turn && s.element);
    // R5 (§8.7 S12): a negated state is not a state an event
    // vents — after a correction, what stands is the negation
    // ('not furious'), and the superseded positive state is no
    // longer in the record at all. Negated candidates are
    // passed over for the most recent unnegated one, and the
    // skip is named in the trace rather than silent.
    const earlier = [...candidates].reverse().find((s) => !s.negated);
    const skipped = candidates.filter((s) => s.negated && (!earlier || s.turn > earlier.turn));
    if (skipped.length) {
      const named = skipped[skipped.length - 1];
      trace.steeringNote =
        `the standing state '${named.lemma}' (held by ${named.holder}, turn ${named.turn}) is negated — it stands as ` +
        `'not ${named.lemma}' — and a negated state is not a state an event vents; it was passed over` +
        (earlier ? "" : ", and no unnegated state stands for the venting steering to meet");
    }
    if (earlier?.element) {
      /* S0 (the S programme, 2026-11-19): the venting reply
       * speaks the event as the visitor's own doing and asks
       * after THEIR settling — it fires only over the visitor's
       * own event, rendered under the shared admission
       * (soundEventClause). An event of another agent, or one
       * whose fills fail admission ("You cook the it in the
       * using." — P-037, agent 'hobby', theme 'it', location
       * 'using'), stands the branch down: no cycle path, no
       * pricing is recorded for a steering that does not
       * happen, and the turn falls through to the plain-event
       * branch, which acknowledges the event under the same
       * admission or not at all. */
      const clause =
        thisEvent.agent === "you"
          ? soundEventClause(session, thisEvent, { recipientPrep: "at", independentLocation: true })
          : undefined;
      if (!clause) {
        trace.steeringNote =
          (trace.steeringNote ? `${trace.steeringNote}; ` : "") +
          `the venting steering stood down (S0): the event '${thisEvent.verb}' of this turn is ` +
          (thisEvent.agent !== "you"
            ? `recorded with agent '${thisEvent.agent ?? "none"}', not the visitor — it is not spoken as the visitor's doing`
            : "not soundly renderable from its recorded fills") +
          `; the earlier state '${earlier.lemma}' stands unvented for this turn's reply`;
      } else {
        const controller = CONTROLLER_OF[earlier.element];
        trace.cyclePath = `${controller}→${earlier.element} (controlling)`;
        const d = derive(session.graph, earlier.concept ?? earlier.lemma);
        const conclusion = d.conclusions.find((c) => c.category.startsWith("restrained-by:")) ?? d.conclusions[0];
        trace.derivationPath = conclusion?.path;
        recordPricing(trace, d, conclusion);
        noteSteeringScope(trace);
        trace.generatingMargin = false;
        trace.steeringBaseReply = `${clause}.`;
        const reply = `${clause}. ` + `Now that it's out — what would help you settle?`;
        return { reply, trace };
      }
    }
  }

  // (c) A fresh state: follow the generating direction toward expression.
  // X0: a negated state does not steer through a shape that
  // drops its negation (see the gate at branch (a)); a negated
  // verb-carried state enters, because the verb-carried shape
  // below is the one rendering that speaks the negation.
  if (thisState?.element && thisStateSpeakable && (!thisStateNegated || thisStateVerbCarried)) {
    /* Coherence demand (slice 2): a feeling stated at the
     * opening with its cause unexpressed, the situation unknown
     * — the Planner answers the demand recorded on this turn's
     * object (coherence.ts) instead of steering: it asks after
     * the cause. The state itself stands recorded above; only
     * the reply changes hands. */
    const turnObject = session.objects.find((o) => o.turn === turn && o.producer === "person");
    const demand = turnObject?.trail.find((a) => a.data?.demand === "unexpressed-cause");
    if (turn === 1 && thisState.holder === "you" && demand && turnObject) {
      turnObject.trail.push({
        unit: "reasoning/planner",
        note: "answered the coherence demand: asked after the unexpressed cause",
      });
      trace.planNote = "coherence demand (unexpressed cause, situation unknown): the planner asks after the cause";
      trace.steeringNote = "the generating steering stood down for the coherence demand";
      return { reply: `${cap(thisState.lemma)} about what?`, trace };
    }
    /* The acknowledgement move (the Normalcy arc, Part 3c) for
     * a state reported of a THIRD PERSON: the generating
     * steering below speaks to the holder in the second person
     * ("You were hot. What did you say or do?") — right for the
     * speaker's own states, a misaddress for a state the
     * speaker reports of something else ("The soup is hot.").
     * A reported state is a telling: it is acknowledged, and
     * steering stands down. */
    if (thisState.holder !== "you") {
      trace.steeringNote =
        "statement acknowledged (the acknowledgement move): the state is reported of " +
        `${thisState.holder}, not of the speaker — a telling, not a feeling to steer from`;
      // R2: the recognition receipt — a predicated state the
      // turn established is shown, not merely received. A
      // verb-carried state is not predicated (its lemma is a
      // doing), so the receipt stands down for it.
      if (newStatePredicable) {
        const receipt = recognitionReceipt(session, trace, turn, ackName, { state: thisState, subject: newStateSubject }, parsed);
        if (receipt) return { reply: receipt, trace };
      }
      return { reply: acknowledgementFor(turn, ackName), trace };
    }
    const generated = GENERATES[thisState.element];
    trace.cyclePath = `${thisState.element}→${generated} (generating)`;
    const d = derive(session.graph, thisState.concept ?? thisState.lemma);
    const conclusion = d.conclusions.find((c) => c.category.startsWith("generates:")) ?? d.conclusions[0];
    trace.derivationPath = conclusion?.path;
    recordPricing(trace, d, conclusion);
    noteSteeringScope(trace);
    trace.generatingMargin = true;
    const priorEvent = session.events.filter((e) => e.turn < turn).pop();
    /* The verb-carried shape below is for the state the ROOT
     * VERB itself carries (can't sleep) — its test is the
     * record's: the state stands together with its own event
     * of the same verb (the R3 composition guard's evidence),
     * computed at the X0 gate above as thisStateVerbCarried.
     * Since E1 the state the cycles steer from can be a
     * feelings-first PREDICATED feeling while the parse root
     * is an unrelated verb ("I feel happy", graphed on 'feel';
     * "They ended well, but I am glad", on 'end') — the bare
     * "You <lemma>." ack over such a state is a garble ("You
     * glad."), and the predicated shape below is its form. */
    const verbCarried = thisStateVerbCarried;
    if (verbCarried) {
      // A verb-carried state (can't sleep): acknowledge the state itself,
      // and follow the generating direction toward what fills it.
      const ack = thisState.negated ? `You can't ${thisState.lemma}.` : `You ${thisState.lemma}.`;
      const follow = thisState.lemma === "sleep"
        ? "What's on your mind when you lie awake?"
        : "What's on your mind when it happens?";
      trace.steeringBaseReply = ack;
      return { reply: `${ack} ${follow}`, trace };
    }
    /* S0 (the S programme, 2026-11-19): the temporal clause
     * renders the prior event as the visitor's doing, with its
     * patient in a determiner slot — it passes the same
     * admission as every other rendering of a recorded event:
     * the event must be the visitor's own (an event of another
     * agent is not spoken as "when you …"), and the patient
     * must be a sound thing-word. Where it fails ("when you
     * welled the thank" — the P-079 sorry steering, whose
     * recorded patient was a verb form in the slot), the ack
     * and the follow-up take their plain forms. */
    const temporalClause =
      priorEvent?.agent === "you" && priorEvent.patient && soundThingFill(session, priorEvent.patient)
        ? ` when you ${pastOf(priorEvent.verb)} the ${priorEvent.patient}`
        : undefined;
    const ack = `You were ${thisState.lemma}${temporalClause ?? ""}.`;
    const follow = temporalClause
      ? `What did you say${temporalClause}?`
      : "What did you say or do?";
    trace.steeringBaseReply = ack;
    return { reply: `${ack} ${follow}`, trace };
  }

  // (d) A classified verb-state (can't sleep): generating closure onward.
  // (Handled above via thisState when the verb carried a classification.)

  // (e) A need/state-of-affairs about a recorded thing (It needs more salt).
  if (isVerbRoot && root.lemma === "need") {
    const theme = targets(parsed, root.id, "theme")[0];
    const thing = thisEvent?.agent; // already resolved during recording
    if (theme) {
      const d = derive(session.graph, theme.lemma, "taste") ?? derive(session.graph, theme.lemma);
      const taste = d.conclusions.find((c) => c.category === "taste");
      trace.derivationPath = taste?.path ?? d.conclusions[0]?.path;
      recordPricing(trace, d, taste ?? d.conclusions[0]);
      noteSteeringScope(trace);
      trace.steeringNote = "answered from the theme's classification and its taste correspondence";
      return {
        reply: `${cap(thing ? `the ${thing}` : "it")} needs more ${theme.lemma}. How does it taste so far?`,
        trace,
      };
    }
  }

  // (f) A plain event. The gaps are asked first (R3's rule, and
  // the directed-target shape of Part 3d): a fillable gap is
  // the one follow-up a plain telling calls for. With no gap,
  // the ACKNOWLEDGEMENT move (the Normalcy arc, Part 3c) speaks:
  // a coherent statement with no open need and no gap gets the
  // plain receipt, and the steering machinery stands down —
  // the pre-arc follow-ups here ("What goes in next?", "What
  // was in it?") asked after every telling as a matter of
  // routine, which is exactly the not-quite-normal behaviour
  // the owner's specimen corrects (the apples telling: "Ok.").
  if (thisEvent) {
    /* S0 (the S programme, 2026-11-19): the echo is built
     * under the shared admission (soundEventClause) — the
     * record's agent in the record's grain, every fill sound.
     * An event that fails it ("You ran." over the turtle's
     * running, P-097; an object the record holds in a pronoun)
     * is not echoed at all: the plain acknowledgement leads,
     * and the receipt below judges the same event by the same
     * admission. The gap questions likewise premise the
     * visitor as the event's agent — the person reporting
     * their OWN event can fill its gap — so they are asked
     * only over an event the record attributes to the visitor;
     * over another's event the echo alone speaks, in the
     * agent's own grain. */
    const clause = soundEventClause(session, thisEvent, { withRecipient: false });
    const ack = clause ? `${clause}.` : acknowledgementFor(turn, ackName);
    // R3: a fillable valency gap in the event replaces the
    // follow-up wording below with the generated gap question.
    const gapSentence = thisEvent.agent === "you" ? tryGapQuestion(session, trace, parsed, root) : undefined;
    if (gapSentence) return { reply: `${ack} ${gapSentence}`, trace };
    const directed = thisEvent.agent === "you" ? directedTargetGap(parsed, root) : undefined;
    if (directed) {
      trace.personPresented = "gap";
      trace.gapQuestion = { verb: root.lemma, role: directed.role, ground: directed.ground };
      trace.planNote =
        "the follow-up question is hand-formed from the frame's directed-target material " +
        "(the role-question transform cannot strand the preposition); the acknowledgment is the probe's wording";
      return { reply: `${ack} ${directed.question}`, trace };
    }
    // R5: a steering note already written (the venting skip
    // above) is the more specific account of this turn; the
    // acknowledgement note stands only where nothing else was said.
    if (!trace.steeringNote) {
      trace.steeringNote =
        "statement acknowledged (the acknowledgement move): the event stands recorded, no need or gap " +
        "stands open, and no steering relation claims the turn — the steering machinery stands down";
    }
    // R2: the recognition receipt — an event the turn
    // established, with its object filled, is shown.
    const receipt = recognitionReceipt(session, trace, turn, ackName, { event: thisEvent }, parsed);
    if (receipt) return { reply: receipt, trace };
    // E1: the event carried no object to show, but the turn
    // stated a feeling the feelings-first scan registered
    // (the feel-verb's own clause is the common shape: "I
    // feel guilty" graphs as an objectless 'feel' event) —
    // the feeling is the turn's content to show, under the
    // same receipt construction and disciplines.
    if (surfaceFeeling && !trace.correction) {
      const feltReceipt = recognitionReceipt(session, trace, turn, ackName, {
        state: surfaceFeeling,
        subject: { lemma: "you", form: "you", person: "2sg" },
      }, parsed);
      if (feltReceipt) return { reply: feltReceipt, trace };
    }
    return { reply: acknowledgementFor(turn, ackName), trace };
  }

  trace.steeringNote =
    "statement acknowledged (the acknowledgement move): recorded, with nothing in it for the cycles " +
    "to steer by and no need or gap standing open";
  // R2: the recognition receipt — a state the turn
  // established that no steering branch claimed (it carries
  // no element for the cycles to steer by) is still shown
  // when it is a predicated, unnegated state and no
  // correction owns the turn.
  if (newState && newStatePredicable && !trace.correction) {
    const receipt = recognitionReceipt(session, trace, turn, ackName, { state: newState, subject: newStateSubject }, parsed);
    if (receipt) return { reply: receipt, trace };
  }
  // E1: a feeling this turn registered feelings-first, which
  // no steering branch claimed (it carries no element for the
  // cycles to steer by — the uncategorised register's words,
  // the unsettled canonical — or its supersession stands
  // recorded), is shown the same way: the receipt predicates
  // the registered state, from the record. R2's disciplines
  // bind it unchanged (not the first turn, not the naming
  // turn, not a negated state).
  if (surfaceFeeling && !trace.correction) {
    const receipt = recognitionReceipt(session, trace, turn, ackName, {
      state: surfaceFeeling,
      subject: { lemma: "you", form: "you", person: "2sg" },
    }, parsed);
    if (receipt) return { reply: receipt, trace };
  }
  return { reply: acknowledgementFor(turn, ackName), trace };
}

/* ------------------------------------------------------------------ */
/* Initiative (slice R6: §8.10 — the gap machinery on the session)    */
/* ------------------------------------------------------------------ */

/**
 * One initiative candidate: a session-level gap, in one of
 * §8.10's two shapes, with the turn of the record it grounds
 * on (the ordering key — oldest first).
 */
type InitiativeCandidate =
  | { shape: "unexpressed-state"; groundTurn: number; state: StateRecord }
  | { shape: "persisting-gap"; groundTurn: number; event: EventRecordShape; role: string }
  | { shape: "standing-feeling"; groundTurn: number; state: StateRecord }
  | { shape: "topic-return"; groundTurn: number; state: StateRecord };

/** The event record's shape as the scan reads it (session.ts's
 *  EventRecord, named here to keep the import list stable). */
type EventRecordShape = Session["events"][number];

/** Does this recorded event fill this role? The record's roles
 *  are its fields; a role the record has no field for (goal,
 *  time) is never filled in it. */
function eventFills(event: EventRecordShape, role: string): boolean {
  const value = (event as unknown as Record<string, unknown>)[role];
  return typeof value === "string" && value.length > 0;
}

/**
 * The session's standing initiative candidates, oldest
 * grounding record first, shape (a) before shape (b) on a tie
 * of turns (T-R6 §1 states the rule exactly):
 *
 * (a) UNEXPRESSED STATE — a standing state with a classified
 * origin, not negated, at least two turns old, predicable
 * (its lemma is not a verb entry: the predication
 * construction predicates qualities, not doings — the R5
 * scoping for verb-carried states), whose generating
 * direction has gone unexpressed: no state recorded after it
 * carries GENERATES[its element]. Read over recorded states,
 * any holder — the record's only element-bearing content.
 * Excluded: the state this turn's restrainer steering
 * addressed, and a state that already grounded a move while
 * this same record stands.
 *
 * (b) PERSISTING GAP — a standing event from an earlier turn
 * with a required role (the same computation as the turn's
 * own valency gaps, read off the record: the record carries
 * filled roles only, not the parse's suppression
 * declarations — T-R6 §0 records that limit) that the event
 * does not fill, no recorded event of the same verb fills,
 * and a question word exists for. One gap per event — the
 * first in frame order. Excluded: an (event, role) that
 * already grounded a move.
 */
function initiativeCandidates(session: Session, trace: TurnTrace, turn: number): InitiativeCandidate[] {
  const candidates: InitiativeCandidate[] = [];
  /* X4 (the X programme, 2026-11-19): a state this very
   * turn re-stated is the turn's own content — its reply
   * already takes it up (a steering branch, or the restated
   * receipt) — so no initiative candidate grounds on its
   * earlier standing twin: the move would only repeat what
   * the reply just showed ("Ok. You told me you are guilty.
   * You are guilty."). */
  const restatedThisTurn = new Set(
    session.states.filter((s) => s.turn === turn).map((s) => `${s.holder}/${s.lemma}`),
  );
  for (const s of session.states) {
    if (s.turn > turn - 2) continue;
    if (restatedThisTurn.has(`${s.holder}/${s.lemma}`)) continue;
    if (s.negated) continue;
    if (!s.element) continue;
    if (s.origin.kind !== "classified" || !s.origin.path || s.origin.support === undefined || !s.origin.tier) continue;
    // The registry read is sound for this question since the
    // lexicon-state fix (2026-11-18): registration is adoption,
    // so a verb entry stands here only when some parse actually
    // adopted the lemma as a verb — a verb-carried state —
    // never because a probe once derived one.
    const entry = EN_LEXICON[s.lemma] as VerbEntry | undefined;
    if (entry && entry.kind === "verb") continue;
    // Recognition programme R4: a state carried by a verb —
    // recorded at its turn together with its own event of the
    // same verb, by the same parse — is a doing the parse
    // mis-derived as a state, and the check above does not
    // catch it when the lemma's lexicon entry is not the verb
    // entry (positional adoption leaves it a noun entry:
    // "I have horses…" filed you/horse beside horse(a=you),
    // and the move predicated "You are horse."). A steering
    // predication may only be formed from a state whose
    // derivation is sound — predicated, not verb-carried.
    if (session.events.some((e) => e.turn === s.turn && e.verb === s.lemma && e.agent === s.holder)) continue;
    const generated = GENERATES[s.element];
    if (session.states.some((o) => o.turn > s.turn && o.element === generated)) continue;
    const addressed = trace.addressedState;
    if (addressed && addressed.holder === s.holder && addressed.lemma === s.lemma && addressed.turn === s.turn) continue;
    if (session.initiatives.some((i) => i.state && i.state.holder === s.holder && i.state.lemma === s.lemma && i.state.stateTurn === s.turn)) continue;
    candidates.push({ shape: "unexpressed-state", groundTurn: s.turn, state: s });
  }
  for (const e of session.events) {
    if (e.turn >= turn) continue;
    // Recognition programme R4: the question the move builds
    // addresses the visitor — its agent is "you" by
    // construction (buildInitiativeMove). An event of another
    // agent, or of none the parse settled, cannot soundly
    // ground it: "What did you run?" was asked over the
    // turtle's running, and "What did you bear?" over an
    // agent-less parse fragment. Such events ground no
    // candidate.
    if (e.agent !== "you") continue;
    const entry = EN_LEXICON[e.verb] as VerbEntry | undefined;
    if (!entry || entry.kind !== "verb") continue;
    const required = new Set([
      ...(entry.frameSignature?.required ?? entry.required),
      ...(entry.prepSlot?.required ? [entry.prepSlot.slot] : []),
    ]);
    const frameOrder = [...entry.slots, ...(entry.prepSlot ? [entry.prepSlot.slot] : [])];
    for (const role of frameOrder) {
      if (!required.has(role) || role === "agent") continue;
      if (!ROLE_QUESTION_WORD[role]) continue;
      if (eventFills(e, role)) continue;
      if (session.events.some((o) => o.verb === e.verb && eventFills(o, role))) continue;
      if (session.initiatives.some((i) => i.event && i.event.verb === e.verb && i.event.eventTurn === e.turn && i.event.role === role)) continue;
      candidates.push({ shape: "persisting-gap", groundTurn: e.turn, event: e, role });
      break;
    }
  }
  /* X3 (the X programme, 2026-11-19): recognition grounds.
   * The two shapes above price a classified state or
   * question a gap; these two take up what the conversation
   * ESTABLISHED and left standing, predicated from the
   * record, unpriced — as every record move is. The ground
   * is always earlier material (the same two-turn age bound
   * the scan already keeps): a move repeating the current
   * segment's content is not a candidate here, and a state
   * that already grounded a move does not ground another.
   *
   * (c) STANDING FEELING — the visitor's latest standing
   * feeling, filed as a feeling by E1's authorities (the
   * classification's emotion aspect, the EDU's canonical
   * names, the LEDU's uncategorised register), whose
   * origin is NOT classified: the classified feelings are
   * shape (a)'s ground, priced from their derivations; the
   * stated and parsed feelings — the uncategorised
   * register's words, 'guilty' and its kin — are the ones
   * (a) cannot price and no move has ever taken up. Not
   * negated (X0's discipline binds the initiative as it
   * binds the steering branches). Only the LATEST standing
   * feeling qualifies: an older one was superseded in the
   * conversation's own course, and the chain is X2's to
   * answer when asked, not the initiative's to reopen.
   *
   * (d) TOPIC RETURN — a standing state of an established
   * topic, parsed (a telling in the record's grain), the
   * topic untouched since the state's turn: no later touch
   * of the topic, no later state of the same holder, no
   * later event filling a role with it, and the R4
   * soundness guards (a predicable quality, not a
   * verb-carried doing; the holder a sound thing-word for
   * its determiner subject). The move predicates the
   * topic's standing state. Where an established topic
   * carries NO standing state, no sound move exists in
   * this machinery — none is manufactured; that is this
   * shape's recorded remainder. */
  {
    /* The filing test here reads all three of E1's emotion
     * authorities — the classification's emotion aspect and
     * the EDU's canonical names (isFeelingState), and the
     * LEDU's uncategorised register — because the shape's
     * ground is precisely the feelings E1 registered without
     * a classification: 'guilty' and its kin, which R1's
     * ANSWER reader deliberately does not read (an answer
     * claims the filing; an initiative move only takes the
     * stated feeling up, predicated as it stands). */
    const feelings = session.states.filter(
      (s) =>
        s.holder === "you" &&
        s.turn <= turn - 2 &&
        !s.negated &&
        s.origin.kind !== "classified" &&
        turnWasStatement(session, s.turn) &&
        (isFeelingState(s) || uncategorisedEmotionWord(s.lemma) !== undefined),
    );
    const latest = feelings[feelings.length - 1];
    if (
      latest &&
      !restatedThisTurn.has(`${latest.holder}/${latest.lemma}`) &&
      !session.initiatives.some(
        (i) => i.state && i.state.holder === latest.holder && i.state.lemma === latest.lemma && i.state.stateTurn === latest.turn,
      )
    ) {
      candidates.push({ shape: "standing-feeling", groundTurn: latest.turn, state: latest });
    }
  }
  for (const s of session.states) {
    if (s.origin.kind !== "parsed") continue;
    if (s.holder === "you") continue;
    if (s.turn > turn - 2) continue;
    /* Only a TELLING grounds a return: a state recorded on
     * a question turn is the question's presupposition, not
     * something the conversation established ("The clark is
     * office." — the state a question about Professor
     * Clark's office left behind). The same doctrine the
     * mention check (X2) reads. And the state's lemma must
     * be a predicable quality: a referring word in the
     * quality slot is the parse's leavings, not a state of
     * the topic ("The black is you."). */
    if (!turnWasStatement(session, s.turn)) continue;
    if (NON_THING_FILL.has(s.lemma.toLowerCase())) continue;
    const topic = session.topics.find((t) => t.lemma === s.holder);
    if (!topic) continue;
    if (!soundThingFill(session, s.holder)) continue;
    /* The holder must be a thing the conversation is about,
     * not a doing the parse left standing as a topic: a
     * holder the lexicon knows as a verb ("The thank is
     * nice." — the thanks segment's leavings) names no
     * topic a return can take up. */
    const holderEntry = EN_LEXICON[s.holder];
    if (holderEntry && holderEntry.kind === "verb") continue;
    const entry = EN_LEXICON[s.lemma] as VerbEntry | undefined;
    if (entry && entry.kind === "verb") continue;
    if (session.events.some((e) => e.turn === s.turn && e.verb === s.lemma && e.agent === s.holder)) continue;
    if (topic.lastTouchedTurn > s.turn) continue;
    if (session.states.some((o) => o.holder === s.holder && o.turn > s.turn)) continue;
    if (session.events.some((e) => e.turn > s.turn && [e.patient, e.theme, e.location, e.recipient].includes(s.holder))) continue;
    if (
      session.initiatives.some(
        (i) => i.state && i.state.holder === s.holder && i.state.lemma === s.lemma && i.state.stateTurn === s.turn,
      )
    ) {
      continue;
    }
    candidates.push({ shape: "topic-return", groundTurn: s.turn, state: s });
  }
  const shapeRank = (c: InitiativeCandidate): number =>
    c.shape === "unexpressed-state" ? 0 : c.shape === "persisting-gap" ? 1 : c.shape === "standing-feeling" ? 2 : 3;
  candidates.sort((a, b) => a.groundTurn - b.groundTurn || shapeRank(a) - shapeRank(b));
  return candidates;
}

/** Words that refer without naming a thing: a fill drawn from
 *  this stock cannot stand as a question's rendered object,
 *  whatever role it was recorded in. */
const NON_THING_FILL = new Set([
  "i", "you", "he", "she", "him", "her", "it", "them", "we", "they", "me", "us",
  "that", "this", "what", "which", "who",
]);

/**
 * Recognition programme R4: is this recorded fill a sound
 * thing-word for a question to render with a determiner? The
 * authorities are the lexicon's noun entries, the
 * classification table, and the session's own entity register
 * — a name the conversation mentioned stands in the third,
 * which is the record's own warrant for it.
 */
function soundThingFill(session: Session, lemma: string): boolean {
  if (NON_THING_FILL.has(lemma.toLowerCase())) return false;
  /* X1 (the X programme, 2026-11-19; probe run 3's fragment
   * echoes): a closed function word is grammar, not a thing —
   * never a determiner fill, whatever register recorded it
   * ("You moved the and in the country.", "You thought the
   * of.", "You won the be to t." — the entity register had
   * admitted the chunker's leavings as entities). And a
   * single-character fragment of a contraction or compound
   * is not a word at all ("You donned the t." — 't' is the
   * leavings of "don't"), whichever authority claims it:
   * the parse positionally adopts such fragments as noun
   * entries where they stood, so the veto precedes the
   * lexicon, classification and register legs alike. */
  if (FUNCTION_WORDS.has(lemma.toLowerCase())) return false;
  if (lemma.length < 2) return false;
  const entry = EN_LEXICON[lemma];
  if (entry && entry.kind === "noun") return true;
  if (lookupClassification(lemma)) return true;
  return session.entities.some((e) => e.lemma === lemma);
}

/**
 * Build one candidate's move through the planner — the same
 * transforms the turn's own replies use (planPredication for
 * the state, priced from its origin; planRoleQuestion for the
 * gap, built from the record). Returns undefined when the
 * planner cannot build the move (a priced decline, an
 * unrealisable question): the scan passes to the next
 * candidate, and if none builds, no move fires.
 */
function buildInitiativeMove(
  session: Session,
  trace: TurnTrace,
  candidate: InitiativeCandidate,
): { sentence: string; graph: ParsedSentence; pricing?: PricingRecord } | undefined {
  if (candidate.shape === "unexpressed-state") {
    const s = candidate.state;
    const subject: PredicationSubject =
      s.holder === "you"
        ? { lemma: "you", form: "you", person: "2sg" }
        : { lemma: s.holder, form: s.holder, det: "the", person: "3sg" };
    const outcome = planPredication({
      subject,
      qualityLemma: s.lemma,
      derivationPath: s.origin.path!,
      support: s.origin.support!,
      weakestTier: s.origin.tier!,
      disposition: session.disposition,
    });
    if (outcome.kind !== "graph") return undefined;
    pushBias(trace, outcome.bias);
    return { sentence: outcome.sentence, graph: outcome.graph, pricing: outcome.pricing };
  }
  if (candidate.shape === "standing-feeling" || candidate.shape === "topic-return") {
    /* X3: the record move — the standing state predicated
     * by the planner's record construction, from the
     * record's own fields. No pricing: no derivation backs
     * a record move, and none is fabricated (the R7.5
     * doctrine, at the initiative site). */
    const s = candidate.state;
    const outcome = planRecordPredication({
      subject:
        s.holder === "you"
          ? { lemma: "you", form: "you", person: "2sg" }
          : { lemma: s.holder, form: s.holder, det: "the", person: "3sg" },
      stateLemma: s.lemma,
      ...(s.negated ? { negated: true } : {}),
    });
    return { sentence: outcome.sentence, graph: outcome.graph };
  }
  const e = candidate.event;
  const entry = EN_LEXICON[e.verb] as VerbEntry;
  const frameOrder = [...entry.slots, ...(entry.prepSlot ? [entry.prepSlot.slot] : [])];
  const filled: QuestionFilledRole[] = [];
  for (const rel of frameOrder) {
    if (rel === candidate.role || rel === "agent") continue;
    const value = (e as unknown as Record<string, unknown>)[rel];
    if (typeof value !== "string" || !value) continue;
    /* Recognition programme R4: every fill the question would
     * render must be sound, or the candidate is dropped whole
     * — the move is not formed around a garbled fill. A fill
     * rendered with a determiner (patient, theme, location)
     * must be a thing-word: a noun in the lexicon, a
     * classified concept, or a referent the conversation
     * itself recorded as an entity (a mentioned name stands
     * there). A pronoun or demonstrative in such a slot names
     * nothing the question can carry ("the it", "the using"
     * were rendered from fills of these two kinds). A bare
     * fill (the recipient's, as in "What did you give him?")
     * may be a pronoun or a name, but not a verb, adverb or
     * adjective lemma standing where a referent belongs. */
    const withDet = rel === "patient" || rel === "theme" || rel === "location";
    if (withDet) {
      if (!soundThingFill(session, value)) return undefined;
    } else {
      const fillEntry = EN_LEXICON[value];
      if (fillEntry && fillEntry.kind !== "noun" && fillEntry.kind !== "pronoun") return undefined;
    }
    filled.push({
      relation: rel,
      lemma: value,
      form: value,
      ...(withDet ? { det: "the" } : {}),
    });
  }
  const outcome = planRoleQuestion({
    verb: entry,
    verbForm: pastOf(e.verb),
    tense: "past",
    agent: { lemma: "you", form: "you" },
    filled,
    gapRole: candidate.role,
  });
  if (outcome.kind !== "graph") return undefined;
  return { sentence: outcome.sentence, graph: outcome.graph };
}

/**
 * The initiative scan (§8.10; the rule is T-R6 §1, stated
 * there exactly). Runs after the reply is formed; appends at
 * most one move. The gates, in order: the person's turn
 * presented no question or gap of its own; the reply is
 * neither a decline nor a correction acknowledgement; the
 * reply does not end with a question; the bound permits (a
 * move at turn t forbids another before t + 5). No candidate
 * → no move, however long the silence: initiative never
 * manufactures an opening.
 */
function applyInitiative(session: Session, result: TurnResult): void {
  const { trace } = result;
  const turn = session.turnCount;
  if (trace.personPresented) return;
  if (trace.declineReason || trace.correction) return;
  // Social Unit S2 (design §6): the Planner consults the
  // Conversation phase before initiative — no initiative in
  // closing or closed. (A farewell turn's own reply passes
  // through here: without this guard an initiative could append
  // itself to the goodbye.)
  {
    const phase = conversationPhase(session);
    if (phase === "closing" || phase === "closed") return;
  }
  // Social Unit S5: a stance turn's reply is a designed move,
  // complete in itself — the stance already restates the
  // established ground, which is the very content an
  // unexpressed-state candidate would volunteer, so an
  // appended move could only repeat it. (Before the
  // lexicon-state fix this case was masked: the candidate
  // state's lemma had usually been probe-registered as a
  // verb by the time the scan ran, and the scan excluded it
  // for that accidental reason.)
  if (trace.stance) return;
  // Conversation-shapes C5: a restatement's reply is likewise a
  // designed move, complete in itself — it quotes the record of
  // what was said, and an appended steering move would garble
  // the quotation (and falsify the record the next restatement
  // reads).
  if (trace.restatedReply) return;
  // Recognition programme R3: a receipt or a closing is a
  // designed move, complete in itself — no initiative appends
  // to one. The trace's own boundaryReply covers the
  // standalone turn (a thanks receipt once drew an appended
  // predication: "You are welcome. The winter is cold."); a
  // composed turn's boundary segments stand in its
  // composition record, the composed trace being the last
  // segment's and an earlier segment's receipt otherwise
  // invisible here. (Declines and corrections are gated
  // above; a standalone closing is gated by the phase.)
  if (trace.boundaryReply) return;
  if (trace.segmentComposition && trace.segmentComposition.boundaryReplies > 0) return;
  if (result.reply.trimEnd().endsWith("?")) return;
  const last = session.initiatives[session.initiatives.length - 1];
  if (last && turn - last.turn < 5) return;
  for (const candidate of initiativeCandidates(session, trace, turn)) {
    const move = buildInitiativeMove(session, trace, candidate);
    if (!move) continue;
    result.reply = `${result.reply} ${move.sentence}`;
    if (!trace.replyGraph) trace.replyGraph = serialiseReplyGraph(move.graph);
    const lastPerson = [...session.objects].reverse().find((o) => o.producer === "person");
    const initiativeObject = authorReplyObject({ graph: move.graph, turn: trace.turn, session, inbound: lastPerson, move: `initiative (${candidate.shape})` });
    analyseOutbound(initiativeObject, lastPerson, session);
    const initiativeInfo = informationOf(initiativeObject);
    if (initiativeInfo) noteHandled(initiativeInfo, "coherence/coherence-analysis");
    session.objects.push(initiativeObject);
    if (candidate.shape === "unexpressed-state") {
      const s = candidate.state;
      trace.initiative = {
        shape: candidate.shape,
        ground:
          `the standing state '${s.lemma}' (held by ${s.holder}, recorded at turn ${s.turn}) — its generating ` +
          `direction ${s.element}→${GENERATES[s.element!]} has gone unexpressed across the ${turn - s.turn} turns ` +
          `since (§8.10); the move takes the thread up as a predication priced from the state's origin`,
        move: "predication",
        sentence: move.sentence,
        state: { holder: s.holder, lemma: s.lemma, turn: s.turn },
        ...(move.pricing ? { pricing: move.pricing } : {}),
      };
      session.initiatives.push({
        turn,
        shape: candidate.shape,
        state: { holder: s.holder, lemma: s.lemma, stateTurn: s.turn },
      });
    } else if (candidate.shape === "standing-feeling" || candidate.shape === "topic-return") {
      const s = candidate.state;
      trace.initiative = {
        shape: candidate.shape,
        ground:
          candidate.shape === "standing-feeling"
            ? `the visitor's feeling '${s.lemma}' (recorded at turn ${s.turn}, origin '${s.origin.kind}') stands ` +
              `unaddressed across the ${turn - s.turn} turns since — a feeling the classified scan cannot price, ` +
              `taken up from the record by predicating it as it stands (X3)`
            : `the established topic '${s.holder}' carries the standing state '${s.lemma}' (recorded at turn ${s.turn}), ` +
              `untouched across the ${turn - s.turn} turns since — the move returns to the topic by predicating ` +
              `its standing state from the record (X3)`,
        move: "predication",
        sentence: move.sentence,
        state: { holder: s.holder, lemma: s.lemma, turn: s.turn },
      };
      session.initiatives.push({
        turn,
        shape: candidate.shape,
        state: { holder: s.holder, lemma: s.lemma, stateTurn: s.turn },
      });
    } else {
      const e = candidate.event;
      trace.initiative = {
        shape: candidate.shape,
        ground:
          `the event '${e.verb}' recorded at turn ${e.turn} leaves its required ${candidate.role} unfilled, and ` +
          `no recorded event of '${e.verb}' fills it — a gap that persists across ${turn - e.turn} turns (§8.10); ` +
          `the move asks after it with the question transform run on the record`,
        move: "question",
        sentence: move.sentence,
        event: { verb: e.verb, turn: e.turn, role: candidate.role },
      };
      session.initiatives.push({
        turn,
        shape: candidate.shape,
        event: { verb: e.verb, eventTurn: e.turn, role: candidate.role },
      });
    }
    return;
  }
}

/**
 * The schematic walk of a finished turn: the ordered node ids
 * (ai-system/system-map.ts) the turn actually passed through,
 * computed from the trace's own evidence — the same records the
 * dashboard reads, so the map and the dashboard cannot disagree
 * about what ran. Pathway steps only: consulting a store is a
 * connection on the map, not a step — except where the journey's
 * whole point was the lookup and it came back empty (the
 * knowledge-gap decline ends at the correspondence graph it
 * searched). A decline's path ends at the node where the turn
 * stopped. A spoken reply ends at the Verbalizer; a planner-built
 * reply passes the Generator on its way there, and the probe's
 * hand-worded replies do not.
 */
function computeMapPath(trace: TurnTrace): string[] {
  const path: string[] = ["person"];
  if (trace.parseSummary === "parse failed") {
    // The sentence layer stopped the turn inside the Parser; no
    // submodule is named — the trace carries no stage detail.
    path.push("lpu/parser");
    return path;
  }
  path.push(
    "lpu/parser/token",
    "lpu/parser/sense",
    "lpu/parser/valency",
    "lpu/parser/aspect-and-forms",
    "lpu/parser",
    "lpu/semantic-assessment",
  );
  // The Senses-Scening Unit is consulted at creation whenever
  // the turn's object carries any channel present.
  if (trace.sensesPresent?.length) path.push("lpu/senses-scening-unit");
  // The QuantificationLanguageUnit likewise, on turns that
  // recorded quantity content or answered a how-many question
  // from the ledger.
  if (trace.quantities?.length || trace.quantityAnswer) path.push("lpu/quantification-language-unit");
  // The ProblemSolving Unit likewise, on turns its router
  // routed (problem-solving.ts): the needs were attached to
  // the turn's objects, on the instruction or the assessment.
  if (trace.problemSolving) path.push("reasoning/problem-solving");
  path.push("session-and-situation");
  /* NormalcyAssessment sits between Session & Situation and
   * CoherenceAnalysis in the settled placement: its node joins
   * the path whenever the bridge filed (and Coherence priced)
   * a flag this turn — including for the record and
   * definitional answers the flags ground, which return below. */
  if (trace.normalcy) path.push("lpu/normalcy-assessment");
  if (trace.answeredFromRecord) {
    path.push("reasoning/planner", "lpu/generator", "verbalizer");
    return path;
  }
  if (trace.declineReason) {
    if (trace.pricing && trace.planNote?.includes("priced decline")) {
      path.push("reasoning/derivation", "reasoning/pricing", "reasoning/decline-floor");
      return path;
    }
    if (
      trace.declineReason.includes("in my notes") ||
      trace.declineReason.includes("no path runs") ||
      trace.declineReason.includes("no way to connect")
    ) {
      path.push("reasoning/derivation", "ontology-core/ontology-knowledge-unit/correspondence-graph");
      return path;
    }
    // The remaining declines stop at the record: a missing role
    // or an unanswerable question shape — nothing further ran.
    return path;
  }
  if (trace.coherence?.length) path.push("coherence/coherence-analysis");
  if (trace.social?.length) path.push("awareness/social-unit");
  const correctionOnly = Boolean(trace.correction && trace.replyGraph && !trace.derivationPath);
  const planned = Boolean(trace.replyGraph || trace.gapQuestion || trace.clarification);
  const derived = Boolean(trace.derivationPath || trace.cyclePath);
  if ((derived || planned) && !correctionOnly) path.push("awareness");
  if (trace.derivationPath) path.push("reasoning/derivation");
  if (trace.pricing) path.push("reasoning/pricing");
  if (planned) path.push("reasoning/planner", "lpu/generator");
  path.push("verbalizer");
  if (trace.initiative) path.push("reasoning/planner", "lpu/generator", "verbalizer");
  return path;
}

/**
 * The envelope settlement (2026-11-17), run once the turn body
 * has formed its reply and before the initiative scan: a
 * how-many question the ledger answered discharges its answer
 * need HERE (the QuantificationLanguageUnit is its discharger
 * — that answer never passes the Planner, so it is settled
 * apart from speakWithObject's), and Coherence then prices
 * every need still open on this turn's information objects as
 * SURVIVING. The survivors are recorded on the trace: data for
 * the reply decision, and — on a declining turn — the located
 * decline. (Planner-answered turns were already settled at the
 * authoring site; pricing is idempotent, so the survivors are
 * simply collected here.)
 */
function settleTurnEnvelopes(session: Session, trace: TurnTrace): void {
  const survivors: { kind: string; slot: string }[] = [];
  for (const o of session.objects) {
    if (o.producer !== "person" || o.turn !== trace.turn) continue;
    const info = informationOf(o);
    if (!info) continue;
    if (trace.quantityAnswer) {
      if (
        dischargeAnswerNeed(
          info,
          "lpu/quantification-language-unit",
          `the quantity ledger answered the question: '${trace.quantityAnswer.rendered}' for ${trace.quantityAnswer.holder}`,
        )
      ) {
        noteHandled(info, "lpu/quantification-language-unit");
      }
    }
    /* The hand-worded answers (the Normalcy arc): the record
     * answer ("You said so.") and the definitional answer are
     * the probe's wording, not a planner graph's, but they
     * ANSWER the question all the same — the settlement
     * discharges the answer need on the evidence the trace
     * names, exactly as the quantity hook above does. */
    if (trace.handAnswered) {
      if (dischargeAnswerNeed(info, trace.handAnswered.by, trace.handAnswered.evidence)) {
        noteHandled(info, trace.handAnswered.by);
      }
    }
    for (const need of priceSurvivingNeeds(info)) survivors.push({ kind: need.kind, slot: need.slot });
  }
  if (survivors.length) trace.survivingNeeds = survivors;
}

/**
 * One conversational turn: the turn body (parse → record →
 * reason → reply), the envelope settlement, then the
 * initiative scan over the formed reply (R6, §8.10).
 */
export function processTurn(session: Session, text: string): TurnResult {
  const result = processTurnInner(session, text);
  // Social Unit S5: a stance-repair pending from an earlier
  // turn that this turn neither repaired nor insisted on
  // lapses — the repair window is the turn that follows the
  // stance, and the conversation has moved on.
  const standingPending = session.conversation.pending;
  if (standingPending?.kind === "stance-repair" && (standingPending.openedTurn ?? 0) < session.turnCount) {
    closePending(session);
  }
  // Social Unit S6: the durable core is persisted at the end
  // of every turn — a no-op unless the session carries a
  // store and the interlocutor has stated an identity.
  persistInterlocutor(session);
  settleTurnEnvelopes(session, result.trace);
  applyInitiative(session, result);
  /* The last-saying record (conversation-shapes C5): a
   * substantive reply — one that says something, as opposed
   * to a clarification question asked of the visitor, the
   * whole-utterance rephrase request, a ritual mirror or
   * receipt, or a restatement itself — is reported to the
   * Social Unit's register as it stands after initiative, in
   * the exact words spoken, so a later "What do you mean?"
   * can be answered from the record of what was actually
   * said. */
  {
    const pending = session.conversation.pending;
    const clarificationAsk =
      Boolean(result.trace.clarification) ||
      (pending?.kind === "clarification" && pending.openedTurn === session.turnCount);
    if (
      !result.trace.ritualReply &&
      !result.trace.restatedReply &&
      !clarificationAsk &&
      result.reply !== "Could you put that another way?"
    ) {
      recordLastReply(session, { turn: session.turnCount, text: result.reply });
    }
  }
  result.trace.mapPath = computeMapPath(result.trace);
  return result;
}

/* ------------------------------------------------------------------ */

/**
 * The season degree profile's aspect set (R2): the two aspects
 * the seed profiles (src/seed.ts §6.11 — light and temperature
 * only), each with the Quality node name of its two polarity
 * sides. This is the membership table of the set a season
 * question composes (§8.7 S13): one subject, one classification,
 * one shared derivation family, one derived quality per aspect.
 * Data, stated once; the wiring below enumerates it.
 */
const SEASON_PROFILE_SET: { aspect: "temperature" | "light"; yin: string; yang: string }[] = [
  { aspect: "temperature", yin: "cold", yang: "warm" },
  { aspect: "light", yin: "dark", yang: "bright" },
];

/**
 * "Why is winter cold?" / "Is summer hot?" — answered from the
 * record first when a standing state occupies the asked
 * quality's slot (R7.5, §11.4), else from the shared-
 * prior derivation (subject and predicate joined through the net), or
 * declined with the missing piece named. The planner speaks from the
 * derivation (plan.ts), priced by §9.2; a season subject's degree
 * profile — how strongly the quality runs in the season — is graded
 * and handed to the planner as the derivation's degree. The probe's
 * renderings stand only where the planner cannot speak.
 */
function answerPredicateQuestion(
  session: Session,
  trace: TurnTrace,
  subjectNodeInParse: MeaningNode,
  predicateNodeInParse: MeaningNode,
  isWhy: boolean,
  topicsBefore: TopicRecord[],
): TurnResult {
  const subjectLemma = subjectNodeInParse.lemma;
  const predicateLemma = predicateNodeInParse.lemma;
  /* R1 (the recognition programme, 2026-11-19): the record's
   * grain for the speaker is 'you' (session.ts: the speaker is
   * recorded as 'you', never by name) — a question the person
   * asks about THEMSELVES arrives with the subject lemma 'i',
   * and every record lookup below reads through the grain, so
   * "Am I worried?" finds the standing state the record holds
   * under 'you'. Before R1 the lookups compared the raw lemma
   * and a self-question could never be answered from the
   * record at all — it declined on "nothing on i in my notes"
   * while the state stood in the record. The graph lookups
   * further down keep the raw lemma: the graph's grain is its
   * own. holderOf is the identity for every other subject. */
  const recordHolder = holderOf(subjectLemma);
  const turnObject = session.objects.find((o) => o.turn === session.turnCount && o.producer === "person");

  /* X4 (the X programme, 2026-11-19): the name-value
   * question — "What is my name?" / "What is her name?"
   * asks for the VALUE standing in the name slot, which
   * the slot machinery below cannot read (its occupant
   * test looks for a state whose lemma is the asked
   * quality, and the asked quality here is the question
   * word itself). The picture answers: for the speaker's
   * own name, the Interlocutor register (C6's content,
   * held as told — or the honest no where no name was
   * learned); for a third party's, the standing name
   * state the record holds, predicated with the person's
   * own subject material. */
  if (subjectLemma === "name" && predicateLemma === "what" && !isWhy) {
    if (subjectNodeInParse.det === "my") {
      const identity = session.interlocutor.identity;
      trace.recordAnswer = {
        source: "self-fact",
        ground: identity
          ? `the question asks the visitor's name, and the Interlocutor register holds it ('${identity.name}', ` +
            `learned at ${identity.learnedAt}) — the register answers`
          : "the question asks the visitor's name, and the Interlocutor register holds none — the answer is the honest no",
      };
      trace.planNote =
        "answered from the Interlocutor register (X4): the visitor's name, held as told (C6) — the register is " +
        "the answer's source, not the graph";
      trace.wordingNotDerived = true;
      return { reply: identity ? `Your name is ${identity.name}.` : "You have not told me your name.", trace };
    }
    if (subjectNodeInParse.det === "her" || subjectNodeInParse.det === "his" || subjectNodeInParse.det === "their") {
      const nameState = [...session.states]
        .reverse()
        .find((s) => s.holder === "name" && s.turn < session.turnCount);
      if (nameState) {
        const outcome = planRecordPredication({
          subject: {
            lemma: "name",
            form: subjectNodeInParse.form,
            ...(subjectNodeInParse.det ? { det: subjectNodeInParse.det } : {}),
            person: "3sg",
          },
          stateLemma: nameState.lemma,
          ...(nameState.negated ? { negated: true } : {}),
        });
        trace.recordAnswer = {
          source: "self-fact",
          ground:
            `the question asks a name's value, and the record holds the name state '${nameState.lemma}' ` +
            `(told at turn ${nameState.turn}) — the record answers, as told`,
          state: { holder: nameState.holder, lemma: nameState.lemma, turn: nameState.turn },
        };
        trace.replyGraph = serialiseReplyGraph(outcome.graph);
        trace.wordingNotDerived = false;
        speakWithObject(session, trace, outcome.graph, "record answer (name)");
        trace.planNote =
          "answered from the conversation record (X4): the name state the record holds, predicated by the " +
          "planner's record graph with the person's own subject material";
        return { reply: outcome.sentence, trace };
      }
    }
  }

  /* Insistence on a standing stance (Social Unit S5, design
   * §8): the same why-question asked again over a premise the
   * stance has already met. The premise is re-read as a
   * supposition and answered under that framing — never
   * adopted, never debated — and the disagreement is recorded
   * in the session record. One stance per premise: this is
   * not a second stance, it is the first one's second half. */
  {
    const pending = session.conversation.pending;
    if (
      isWhy &&
      pending?.kind === "stance-repair" &&
      pending.premise?.subject === subjectLemma &&
      pending.premise?.quality === predicateLemma
    ) {
      const established = pending.premise.established;
      recordDisagreement(session, `${subjectLemma} is ${predicateLemma}`, `${subjectLemma} is ${established}`);
      closePending(session);
      trace.stance = {
        subject: subjectLemma,
        presupposed: predicateLemma,
        established,
        source: pending.premise.source ?? "graph",
        outcome: "insistence-met-as-supposition",
        ground: "the premise was met by the stance on an earlier turn and is now insisted on; it is re-read as a supposition and the disagreement is recorded",
      };
      trace.planNote =
        "insistence (S5): the premise is re-read as a supposition — the answer is framed under it, the premise is not adopted, and the disagreement stands in the record";
      return {
        reply: `Supposing ${subjectLemma} were ${predicateLemma} — I have nothing that would make ${subjectLemma} ${predicateLemma}. As I have it, ${subjectLemma} is ${established}.`,
        trace,
      };
    }
  }

  /* The unanchored definite (the Normalcy arc, Part 3d ii): the
   * question's subject is a definite noun phrase ("the table")
   * whose referent stands in NEITHER the scene graph NOR the
   * Session record. The evidence is read as it stood when the
   * question ARRIVED: the grounding marks on this turn's own
   * object (computed at assessment, against the prior stream)
   * say the phrase arrived new — the scene and entity records
   * cannot be consulted here, because by this site they
   * already hold the question's own mention of the phrase.
   * The Classification knows no such kind and the graph holds
   * no node for it. (The Classification check is what spares a
   * classified kind used definitely — "Is the salt cold?"
   * asks after a kind the system knows, and the ordinary
   * routes below answer it.) The reply asks after the referent
   * instead of declining past it; the question's own answer
   * need stays open — the turn asks back. NOT a Normalcy
   * dimension: this is a comprehension gap, and no flag rides
   * on it. */
  if (
    !isWhy &&
    subjectNodeInParse.det === "the" &&
    turnObject &&
    turnObject.content.grounding?.find((g) => g.nodeId === subjectNodeInParse.id)?.status === "new" &&
    !lookupClassification(subjectLemma) &&
    !session.graph.nodeByName(subjectLemma)
  ) {
    trace.unanchoredDefinite = {
      lemma: subjectLemma,
      ground:
        `the definite subject '${subjectLemma}' has no referent in the scene graph or the Session record ` +
        `(its grounding mark on this turn's object is 'new', and the Classification holds no such kind)`,
    };
    trace.planNote =
      "unanchored definite: the question presupposes a referent the conversation has not established — " +
      "the reply asks after the referent; the question's answer need stays open";
    const reply =
      session.turnCount === 1
        ? `What ${subjectLemma}? You just started talking.`
        : `What ${subjectLemma}? Nothing so far has mentioned one.`;
    // Social Unit S4 (design §7c): this context request is the
    // unit's move, and it opens the pending — the next turn is
    // read against it first (a candidate-less pending: the
    // continuation itself is the answer the move asks for).
    openClarification(session, { openedBy: turnObject?.id ?? `turn:${trace.turn}`, point: `referent:${subjectLemma}`, question: reply });
    return { reply, trace };
  }

  /* The record answer (the Normalcy arc, Part 3a): the Session
   * record already settles this question — the speaker stated
   * this very predication earlier in the conversation, and
   * NormalcyAssessment's self-redundancy flag on this turn's
   * object says so. The answer comes FROM THE RECORD, in the
   * "You said so." family, and outranks the graph and testimony
   * routes below: for a question about what was said, the
   * record is the authority. The flag was priced by
   * CoherenceAnalysis and is never spoken — the reply names
   * the settlement, not the oddity. */
  {
    const flag = turnObject ? normalcyFlagOf(turnObject, "self-redundancy") : undefined;
    /* Where an earned cohesion relation holds for this question
     * (a topic RETURNED to after turns away), the said-so move
     * stands down for the R7.5 record answer below: the marker
     * is carried by the planner's record graph, which is the
     * machinery that can carry it, and that answer is from the
     * record too. The plain restatement — no relation earned —
     * is the said-so family's ground. */
    const cohesionHere = !isWhy ? detectCohesion(session, topicsBefore, subjectLemma, predicateLemma) : undefined;
    if (
      !isWhy &&
      !cohesionHere &&
      flag?.data?.settledBy === "statement" &&
      flag.data.subject === subjectLemma &&
      flag.data.quality === predicateLemma
    ) {
      /* The question's own fresh recording of the asked quality
       * is set aside, exactly as at the R7.5 site: the record
       * answered, and the asked quality does not stand as a new
       * state beside the statement that settled it. (A
       * why-question never reaches here: it asks for the
       * derivation, and R7.5's standing doctrine — the record
       * answers a why-question only against its presupposition —
       * is untouched.) */
      const freshIdx = session.states.findIndex(
        (s) => s.turn === session.turnCount && s.holder === recordHolder && s.lemma === predicateLemma,
      );
      if (freshIdx >= 0) session.states.splice(freshIdx, 1);
      trace.saidSo = {
        stateTurn: Number(flag.data.stateTurn),
        ground:
          flag.detail +
          (freshIdx >= 0
            ? "; the question's own recording of the asked quality at this turn was set aside — the statement that settled it is the one that stands"
            : ""),
      };
      trace.handAnswered = { by: "session-and-situation", evidence: flag.detail };
      trace.planNote =
        "answered from the Session record: the speaker stated this predication earlier in the " +
        "conversation (NormalcyAssessment's self-redundancy flag, priced by CoherenceAnalysis) — " +
        "the record outranks the graph for a question about what was said";
      return { reply: "You said so.", trace };
    }
  }

  /* X2 (the X programme, 2026-11-19): the feeling-history
   * answer. A past-tense question the speaker asks about
   * their own feeling ("Was I worried?") is answered from
   * the feeling CHAIN when the record holds one — the
   * occupant answer below predicates only the standing
   * feeling ("You are happy."), which answers a question
   * about the past with the present and loses the change
   * the question asks after. The block's conditions are the
   * narrow ones: the speaker asking about themselves, the
   * asked quality filed as a feeling by the system's own
   * authorities, the question past-oriented (the parse's
   * tense on the asked quality), the asked feeling a link
   * in a chain of at least two. The question's own fresh
   * recording of the asked quality is set aside exactly as
   * at the R7.5 site — the record answered, and the asked
   * quality does not stand beside the answer. */
  if (recordHolder === "you" && !isWhy) {
    const askedIsFeeling =
      lookupClassification(predicateLemma)?.aspect === "emotion" || canonicalEmotion(predicateLemma) !== undefined;
    const pastOriented =
      predicateNodeInParse.states?.tense === "past" || predicateNodeInParse.states?.copulaTense === "past";
    if (askedIsFeeling && pastOriented) {
      const chain = feelingChain(session, session.turnCount);
      if (chain.length >= 2 && chain.some((l) => l.lemma === predicateLemma)) {
        const freshIdx = session.states.findIndex(
          (s) => s.turn === session.turnCount && s.holder === "you" && s.lemma === predicateLemma,
        );
        if (freshIdx >= 0) session.states.splice(freshIdx, 1);
        return renderFeelingHistory(
          session,
          trace,
          chain,
          `the question asks whether the person was '${predicateLemma}', and the record holds a feeling history ` +
            `of ${chain.length} links (${chain.map((l) => `'${l.lemma}' at turn ${l.turn}`).join(", ")}) in which ` +
            `'${predicateLemma}' stands — the record answers with the history, as accumulated`,
        );
      }
    }
  }

  /* R7.5 (§11.4's second clause; the rule is T-R7.5, stated
   * there exactly): the record answers first. When a standing
   * state of this subject, recorded on an earlier turn,
   * occupies the asked quality's SLOT — the asked quality's
   * classification aspect, by the same lookup that classified
   * the states (the R5 aspect determination); where the asked
   * quality is unclassified, the slot is the quality itself,
   * lemma equality, the standing state being that quality or
   * its negation — the answer predicates THE STANDING state,
   * and the derivation below never runs. A why-question is
   * answered from the record only when the standing state
   * contradicts its presupposition (a different value in the
   * slot, or the asked quality under the opposite polarity):
   * when the standing state IS the asked predication, the why
   * asks for the derivation itself, and the derivation
   * answers. When the record answers, the question turn's own
   * fresh recording of the asked quality is set aside — the
   * asked quality does not stand as a new state beside the
   * state that answered — and the skip is named in the trace.
   * The answer is built by the planner's record graph and
   * carries no pricing: the record is its source, not a
   * ladder derivation. */
  {
    const askedAspect = lookupClassification(predicateLemma)?.aspect;
    const occupiesSlot = (s: StateRecord): boolean =>
      askedAspect !== undefined
        ? lookupClassification(s.lemma)?.aspect === askedAspect
        : s.lemma === predicateLemma;
    const occupant = [...session.states]
      .reverse()
      .find((s) => s.holder === recordHolder && s.turn < session.turnCount && occupiesSlot(s));
    if (occupant) {
      const matchesAsked = occupant.lemma === predicateLemma && !!occupant.negated === !!predicateNodeInParse.states?.negated;
      if (!isWhy || !matchesAsked) {
        const freshIdx = session.states.findIndex(
          (s) => s.turn === session.turnCount && s.holder === recordHolder && s.lemma === predicateLemma,
        );
        let recordingSkipped: string | undefined;
        if (freshIdx >= 0) {
          session.states.splice(freshIdx, 1);
          recordingSkipped =
            `the question's own recording of ${subjectLemma}/${predicateLemma} at this turn was set aside — ` +
            `the record answered, and the asked quality is not left standing as a new state beside the state that answered (T-R7.5)`;
        }
        const chain = session.supersessions.filter(
          (d) => d.holder === recordHolder && (occupiesSlot(d.replaced) || occupiesSlot(d.replacing)),
        );
        const cohesion = detectCohesion(session, topicsBefore, subjectLemma, occupant.lemma);
        /* The subject material, in the record's grain (R1):
         * when the asked subject is the speaker, the answer
         * predicates the standing state of YOU — the system's
         * second person for the person it is talking with —
         * never of "I", which in the system's mouth would
         * claim the state for itself. */
        const outcome = planRecordPredication({
          subject:
            recordHolder === "you" && subjectLemma !== "you"
              ? { lemma: "you", form: "you", person: "2sg" }
              : {
                  lemma: subjectLemma,
                  form: subjectNodeInParse.form,
                  det: subjectNodeInParse.det,
                  person: predicateNodeInParse.states?.subjectPerson,
                },
          stateLemma: occupant.lemma,
          ...(occupant.negated ? { negated: true } : {}),
          ...(cohesion ? { cohesionMarker: cohesion.marker } : {}),
        });
        if (cohesion) trace.cohesion = cohesion;
        trace.answeredFromRecord = {
          state: {
            holder: occupant.holder,
            lemma: occupant.lemma,
            ...(occupant.negated ? { negated: true } : {}),
            turn: occupant.turn,
          },
          askedQuality: predicateLemma,
          slot:
            askedAspect !== undefined
              ? `the '${askedAspect}' aspect slot — the asked quality '${predicateLemma}' classifies under '${askedAspect}', ` +
                `and the standing state's lemma '${occupant.lemma}' classifies under the same aspect (the R5 aspect determination)`
              : `the asked quality '${predicateLemma}' is unclassified, so the slot is the quality itself — the standing state ` +
                `is that quality${occupant.negated ? " under negation" : ""} (lemma match)`,
          supersessions: chain.map((d) => ({
            replaced: { lemma: d.replaced.lemma, ...(d.replaced.negated ? { negated: true } : {}), turn: d.replaced.turn },
            replacing: { lemma: d.replacing.lemma, ...(d.replacing.negated ? { negated: true } : {}), turn: d.replacing.turn },
            turn: d.turn,
          })),
          ...(recordingSkipped ? { recordingSkipped } : {}),
        };
        trace.replyGraph = serialiseReplyGraph(outcome.graph);
        trace.wordingNotDerived = false;
        speakWithObject(session, trace, outcome.graph, "record predication");
        trace.steeringNote =
          "answered from the session record — the standing state for this subject in the asked quality's slot; " +
          "the classification table was not consulted for this answer";
        trace.planNote =
          "reply generated from the planner's record graph: it predicates the standing state as it stands in the record. " +
          "No pricing record is carried — a record answer is not a ladder derivation, and no tier or support is fabricated for it (T-R7.5)" +
          (isWhy
            ? "; the turn asked why, and the record contradicts the question's presupposition — the standing state is the answer, " +
              "and no causal form is built from a derivation the record does not support"
            : "");
        if (isWhy && !matchesAsked) {
          // Social Unit S5 (design §8): the record contradicts
          // the why-question's presupposition, and the stance
          // completes the pattern this answer already half
          // walks — the ground stated (the predication above),
          // the question not answered as posed, and now the
          // third beat: the conversation re-offered on the
          // corrected ground. The stance-repair pending opens
          // so an insistence is met as a supposition, never
          // adopted (one stance per premise).
          const establishedPhrase = occupant.negated ? `not ${occupant.lemma}` : occupant.lemma;
          openStanceRepair(session, {
            openedBy: `turn:${trace.turn}`,
            premise: { subject: subjectLemma, quality: predicateLemma, established: establishedPhrase, source: "record" },
          });
          trace.stance = {
            subject: subjectLemma,
            presupposed: predicateLemma,
            established: establishedPhrase,
            source: "record",
            outcome: "stated",
            ground: `the record holds '${subjectLemma}' as '${establishedPhrase}' from turn ${occupant.turn} — the why-question presupposes '${predicateLemma}'`,
          };
          const speakerSubject = recordHolder === "you" && subjectLemma !== "you";
          const askedSubjectPhrase = speakerSubject
            ? "you"
            : `${subjectNodeInParse.det ? `${subjectNodeInParse.det} ` : ""}${subjectLemma}`;
          return {
            reply: `${outcome.sentence} Did you mean why ${askedSubjectPhrase} ${speakerSubject ? "are" : "is"} ${establishedPhrase}?`,
            trace,
          };
        }
        return { reply: outcome.sentence, trace };
      }
    }
  }

  /* The definitional answer (the Normalcy arc, Part 3b): the
   * question asks whether a kind has its CLASSIFYING quality —
   * NormalcyAssessment's obviousness flag on this turn's object
   * already made exactly that determination (the same standard
   * the flag carries: the OKU Classification settles the
   * predication without testimony), so the move and the flag
   * agree by construction. The answer comes from the
   * Classification and cites that it holds by definition; the
   * flag itself — raised and priced internally — is never
   * spoken. A why-question is not this shape (it asks for the
   * derivation, and the derivation below answers it), and a
   * negated asking is not either. */
  {
    const flag = turnObject ? normalcyFlagOf(turnObject, "obviousness") : undefined;
    if (
      flag &&
      !isWhy &&
      !predicateNodeInParse.states?.negated &&
      flag.data?.subject === subjectLemma &&
      flag.data?.quality === predicateLemma
    ) {
      trace.definitionalAnswer = {
        subject: subjectLemma,
        quality: predicateLemma,
        ground: String(flag.data.ground ?? flag.detail),
      };
      trace.handAnswered = { by: "ontology-core/normalcy-unit", evidence: flag.detail };
      trace.planNote =
        "answered from the OKU Classification: the asked quality is the subject kind's classifying " +
        "quality (NormalcyAssessment's obviousness determination, priced by CoherenceAnalysis) — " +
        "the reply cites the definition; the flag is not spoken";
      trace.steeringNote =
        "answered from the classification — the predication holds by the kind's definition; " +
        "no derivation or testimony was needed";
      return { reply: `That's its definition: ${subjectNodeInParse.form} is ${predicateLemma}.`, trace };
    }
  }

  const graph = session.graph;
  const subjectNode = graph.nodeByName(subjectLemma);
  const qualityNode = graph.allNodes().find(
    (n) => n.type === "Quality" && (n.name === predicateLemma || graph.synonymsOf(n).includes(predicateLemma)),
  );
  const missing: string[] = [];
  if (!subjectNode || !lookupClassification(subjectLemma)) missing.push(`I have nothing on ${subjectLemma} in my notes`);
  if (!qualityNode) missing.push(`I have no way to connect anything to '${predicateLemma}'`);

  const path =
    subjectNode && qualityNode
      ? graph.findPath(subjectNode.id, qualityNode.id, {
          edgeTypes: ["ELEMENT_OF", "HAS_ELEMENT", "POLARITY_OF", "HAS_QUALITY", "CORRESPONDS_TO"],
          confidenceThreshold: 0,
        })
      : null;
  if (!path) {
    // Social Unit S5 (design §8): before a why-question
    // declines as a don't-know, Coherence's premise degree is
    // consulted. If the presupposed predication is positively
    // contradicted — the graph establishes the asked aspect's
    // other value — the reply is the stance, not a decline:
    // the question is not answered as posed, the established
    // ground is stated in plain words as the system's own
    // knowledge, and the conversation is re-offered on the
    // corrected ground. (An is-question carries no
    // presupposition and keeps the decline; mere absence is
    // §7c's territory, not this stance's.)
    if (isWhy) {
      const check = premiseDegree(session, subjectLemma, predicateLemma);
      if (check.degree === "contradiction" && check.establishedQuality) {
        const established = check.establishedNegated ? `not ${check.establishedQuality}` : check.establishedQuality;
        openStanceRepair(session, {
          openedBy: `turn:${trace.turn}`,
          premise: { subject: subjectLemma, quality: predicateLemma, established, source: check.source ?? "graph" },
        });
        trace.stance = {
          subject: subjectLemma,
          presupposed: predicateLemma,
          established,
          source: check.source ?? "graph",
          outcome: "stated",
          ground: check.ground ?? "",
        };
        trace.planNote =
          "premise stance (S5): Coherence's premise degree is contradiction — the reply states the established ground and re-offers the conversation on it; the question is not answered as posed and does not decline as a don't-know";
        // The question's own recording of the presupposed
        // quality is set aside (T-R7.5's discipline, applied
        // here): left standing, it would enter the record as
        // if established, and a later turn would answer from
        // the false premise itself.
        const freshIdx = session.states.findIndex(
          (s) => s.turn === session.turnCount && s.holder === subjectLemma && s.lemma === predicateLemma,
        );
        if (freshIdx >= 0) {
          session.states.splice(freshIdx, 1);
          trace.stance.ground +=
            `; the question's own recording of '${predicateLemma}' for '${subjectLemma}' at this turn was set aside — the presupposed quality does not stand as a state beside the stance`;
        }
        return {
          reply: `${cap(subjectNodeInParse.form)} is ${established}, as I have it. Did you mean why ${subjectNodeInParse.det ? `${subjectNodeInParse.det} ` : ""}${subjectLemma} is ${established}?`,
          trace,
        };
      }
    }
    if (!missing.length) missing.push(`no path runs from ${subjectLemma} to ${predicateLemma} in what I know`);
    trace.declineReason = missing.join("; ");
    return {
      reply: `I can't answer that from what I know: ${missing.join(", and ")}.`,
      trace,
    };
  }
  trace.derivationPath = path.text;
  // §9.2 pricing for the shared-prior path: support is the product
  // of the path's edge confidences; the tiers on the path are the
  // subject classification's tier, plus the established tier when
  // the path travels a correspondence leg (its other legs are the
  // seed's atomic assignment edges). Recorded, not acted on (R0).
  const subjectClass = lookupClassification(subjectLemma);
  // The priced inputs, kept in scope for the planner below (R1):
  // the same support and weakest tier the R0 record carries.
  let planSupport: number | undefined;
  let planTier: Tier | undefined;
  if (subjectClass) {
    const tiers: Tier[] = [];
    const rootTier = tierOfProvenance(subjectClass.provenance);
    if (rootTier) tiers.push(rootTier);
    if (path.steps.some((s) => s.edgeType === "CORRESPONDS_TO")) tiers.push("established");
    const weakest = weakestTier(tiers);
    if (weakest) {
      // Atomic seed edges carry no confidence score (graph.ts:
      // an unscored edge is an unqualified assertion), so an
      // unscored step contributes 1 to the product — no decay.
      const support = Math.round(path.steps.reduce((acc, s) => acc * (s.confidence ?? 1), 1) * 10000) / 10000;
      // R4 (§9.1(c)): the recorded price is the price the reply
      // will be spoken at — computed through the disposition's
      // threshold channel, the same computation the planner
      // makes below with the same inputs.
      const { priced, record } = priceWithBoundary(weakest, support, session.disposition);
      if (record) record.context = `the pricing of ${subjectLemma} → ${predicateLemma}`;
      pushBias(trace, record ? [record] : undefined);
      trace.pricing = { weakestTier: weakest, support, ...priced };
      planSupport = support;
      planTier = weakest;
    }
  }
  trace.steeringNote = "answered from the shared-prior derivation path";

  /* R5 (§8.7 S3): the cohesion this reply earns against the
   * record — detected here, and handed to the planner as a
   * marker. The trace's cohesion record is written only where
   * the planner's graph actually speaks (the graph branches
   * below), so a priced decline or a fallback rendering never
   * claims a marker it did not carry. */
  const cohesion = detectCohesion(session, topicsBefore, subjectLemma, predicateLemma);

  // The season degree profile, when the subject is a season and
  // the predicate is one of its polarity qualities: how strongly
  // the quality runs in the season. Since R1.5 the degree rides
  // the reply graph as a degree modulator (gap G1 closed), so it
  // is graded here — on the bands the probe's rendering used —
  // and handed to the planner; the probe's hand rendering at the
  // bottom remains only as the fallback for turns the planner
  // cannot speak.
  const profile = seasonDegreeProfile(graph, subjectNode!.id);
  const isColdSide = ["cold", "dark", "cool"].includes(predicateLemma);
  const aspectKey = predicateLemma === "dark" ? "light" : "temperature";
  const yinShare = profile?.aspects[aspectKey];
  const share = profile && yinShare !== undefined ? (isColdSide ? yinShare : 1 - yinShare) : undefined;
  const degree: DegreeGrade | undefined =
    share === undefined ? undefined : share >= 0.65 ? "strongest" : share >= 0.35 ? "strong" : "faint";

  /* R2 (§7.1, §8.7 S13): when the subject carries a degree
   * profile and the asked quality is one of the profile's
   * aspect qualities, the turn holds a SET of conclusions —
   * one per profile aspect, each derived by its own
   * shared-prior path at its profile degree — and the reply
   * composes the set (planComposition) rather than speaking
   * the asked conclusion alone. The set is enumerated asked
   * aspect first, then the remaining aspects in profile
   * order. The causal form is NOT composed: a why-question
   * demands it of the asked conclusion, and keeps the
   * single-conclusion path below (scoping recorded in T-R2). */
  if (profile && !isWhy && planTier && planSupport !== undefined && subjectClass) {
    const askedEntry = SEASON_PROFILE_SET.find((e) => e.yin === qualityNode!.name || e.yang === qualityNode!.name);
    if (askedEntry) {
      const subject = {
        lemma: subjectLemma,
        form: subjectNodeInParse.form,
        det: subjectNodeInParse.det,
        person: predicateNodeInParse.states?.subjectPerson,
      };
      const conclusions: PricedConclusion[] = [];
      let setComplete = true;
      for (const entry of [askedEntry, ...SEASON_PROFILE_SET.filter((e) => e !== askedEntry)]) {
        if (entry === askedEntry) {
          // The asked member is the derivation already priced
          // above — the same path, support and tier the
          // single-conclusion path would speak from.
          conclusions.push({
            subject,
            qualityLemma: predicateLemma,
            element: subjectClass.element,
            derivationPath: path.text,
            support: planSupport,
            weakestTier: planTier,
            ...(degree ? { degree } : {}),
          });
          continue;
        }
        const aspectShare = profile.aspects[entry.aspect];
        const memberNode =
          aspectShare === undefined
            ? undefined
            : graph.allNodes().find((n) => n.type === "Quality" && n.name === (aspectShare >= 0.5 ? entry.yin : entry.yang));
        const memberPath =
          memberNode && subjectNode
            ? graph.findPath(subjectNode.id, memberNode.id, {
                edgeTypes: ["ELEMENT_OF", "HAS_ELEMENT", "POLARITY_OF", "HAS_QUALITY", "CORRESPONDS_TO"],
                confidenceThreshold: 0,
              })
            : null;
        if (aspectShare === undefined || !memberNode || !memberPath) {
          setComplete = false;
          break;
        }
        const memberTiers: Tier[] = [];
        const rootTier = tierOfProvenance(subjectClass.provenance);
        if (rootTier) memberTiers.push(rootTier);
        if (memberPath.steps.some((s) => s.edgeType === "CORRESPONDS_TO")) memberTiers.push("established");
        const memberTier = weakestTier(memberTiers);
        if (!memberTier) {
          setComplete = false;
          break;
        }
        const memberShare = aspectShare >= 0.5 ? aspectShare : 1 - aspectShare;
        conclusions.push({
          subject,
          qualityLemma: memberNode.name,
          element: subjectClass.element,
          derivationPath: memberPath.text,
          support: Math.round(memberPath.steps.reduce((acc, s) => acc * (s.confidence ?? 1), 1) * 10000) / 10000,
          weakestTier: memberTier,
          degree: memberShare >= 0.65 ? "strongest" : memberShare >= 0.35 ? "strong" : "faint",
        });
      }
      if (setComplete && conclusions.length > 1) {
        const newestPrior = [...session.states].reverse().find((s) => s.turn < session.turnCount && s.element);
        const outcome = planComposition({
          conclusions,
          ...(newestPrior?.element ? { newestStateElement: newestPrior.element } : {}),
          disposition: session.disposition,
          ...(cohesion ? { cohesionMarker: cohesion.marker } : {}),
        });
        if (outcome.kind === "graph") {
          pushBias(trace, outcome.bias);
          if (cohesion) trace.cohesion = cohesion;
          trace.replyGraph = serialiseReplyGraph(outcome.graph);
          trace.wordingNotDerived = false;
          speakWithObject(session, trace, outcome.graph, "composition");
          trace.composition = {
            activeOrder: outcome.activeOrder,
            supportOrder: outcome.supportOrder,
            relationOrder: outcome.relationOrder,
            ...(newestPrior?.element ? { newestState: { lemma: newestPrior.lemma, element: newestPrior.element } } : {}),
            members: outcome.members.map((m) => ({ quality: m.qualityLemma, pricing: m.pricing, derivationPath: m.derivationPath })),
            dropped: outcome.dropped.map((d) => ({ quality: d.qualityLemma, pricing: d.pricing, ground: d.ground })),
            ...(outcome.held.length
              ? { held: outcome.held.map((h) => ({ quality: h.qualityLemma, pricing: h.pricing, ground: h.ground })) }
              : {}),
          };
          trace.planNote =
            `reply composed by the planner from ${outcome.members.length} priced conclusions over the season's shared ` +
            `derivation family (§7.1/§8.7 S13), spoken in ${outcome.activeOrder} order (the DEFAULT_ORDER data constant); ` +
            `both orderings are in the composition record` +
            (outcome.dropped.length ? `; ${outcome.dropped.length} member(s) dropped below the floor, recorded there` : "") +
            (outcome.held.length
              ? `; ${outcome.held.length} member(s) held by the disposition's length behaviour (lead-only), recorded in the composition record`
              : "");
          return { reply: outcome.sentence, trace };
        }
        // A declined or unrealisable composition cannot arise
        // here — the asked member is priced speakable above and
        // the set stands over one subject — but if one ever
        // did, the single-conclusion path below stands, with
        // the outcome noted rather than hidden.
        trace.planNote =
          outcome.kind === "declined"
            ? `composition declined: ${outcome.ground}; the single-conclusion path stands`
            : `composition unrealisable: ${outcome.reason}; the single-conclusion path stands`;
      }
    }
  }

  /* The planner takes the derivation from here (R1; the
   * qualified levels, the degree and the causal form since
   * R1.5). It builds the reply graph (or the priced decline)
   * and the generator realises it; where it still cannot — a
   * causal form demanded of a derivation carrying no degree
   * for the subordinate to state — the probe's renderings
   * below stand, with the reason in the trace. */
  if (planTier && planSupport !== undefined) {
    const outcome = planPredication({
      subject: {
        lemma: subjectLemma,
        form: subjectNodeInParse.form,
        det: subjectNodeInParse.det,
        person: predicateNodeInParse.states?.subjectPerson,
      },
      qualityLemma: predicateLemma,
      derivationPath: path.text,
      support: planSupport,
      weakestTier: planTier,
      causalDemanded: isWhy,
      ...(degree ? { degree } : {}),
      disposition: session.disposition,
      ...(cohesion ? { cohesionMarker: cohesion.marker } : {}),
    });
    if (outcome.kind === "graph") {
      pushBias(trace, outcome.bias);
      if (cohesion) trace.cohesion = cohesion;
      trace.replyGraph = serialiseReplyGraph(outcome.graph);
      trace.wordingNotDerived = false;
      speakWithObject(session, trace, outcome.graph, "predication");
      trace.planNote =
        `reply generated from the planner's reply graph at ${outcome.level} strength` +
        (isWhy
          ? "; the causal form the why-question demands (§7.2 policy (a)) is built from the derivation's degree content"
          : degree
            ? "; the derivation's degree rides the graph as a degree modulator, and under §7.2's default (demand-driven) the path itself is carried in the trace as causal material for a why-question"
            : `; under §7.2's default (demand-driven) the conclusion stands ${outcome.level === "plain" ? "bare" : "at its priced strength"} and the derivation path is carried in the trace as the causal material for a why-question`);
      return { reply: outcome.sentence, trace };
    }
    if (outcome.kind === "declined") {
      trace.declineReason = outcome.ground;
      trace.planNote =
        "priced decline (§9.2): the planner's outcome — no reply graph is spoken from; " +
        "the decline is rendered in the loop's standing shape, its ground the support shortfall";
      return {
        reply: `I can't answer that from what I know: what connects ${subjectLemma} to ${predicateLemma} in my notes is too faint to answer from.`,
        trace,
      };
    }
    trace.planNote = outcome.reason;
  } else {
    trace.planNote =
      "no priceable tier stands on this derivation path, so the planner cannot price it; the probe's rendering stands";
  }

  /* Fallbacks — the planner could not speak (no priceable tier,
   * or a demanded causal form with no degree content): the
   * season degree-profile rendering when there is a profile,
   * else the probe's plain rendering. */
  if (profile && yinShare !== undefined && share !== undefined) {
    if (share >= 0.65) {
      return {
        reply: isWhy
          ? `${cap(subjectLemma)} is ${predicateLemma}, because it is the season turned most fully toward ${predicateLemma} — ${predicateLemma} runs at its strongest there.`
          : `Yes — ${subjectLemma} is ${predicateLemma}: it is the season turned most fully toward ${predicateLemma}.`,
        trace,
      };
    }
    const strength = share >= 0.35 ? "strong" : "faint";
    return { reply: `${cap(subjectLemma)} is ${predicateLemma} — ${predicateLemma} runs ${strength} there.`, trace };
  }
  return {
    reply: `${cap(subjectLemma)} is ${predicateLemma} — the two belong together in everything I have on them.`,
    trace,
  };
}
