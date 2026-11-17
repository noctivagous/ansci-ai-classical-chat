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
import { parse } from "./parse";
import { lookupClassification } from "./classify";
import { derive, type Derivation, type DerivedConclusion } from "./join";
import { classifiedOrigin, holderOf, recordEntity, resolvePronoun, supersedeRecord, supersedeState, type FrameRecord, type Session, type StateRecord, type SupersessionRecord, type TopicRecord } from "./session";
import { renderComposition } from "./composition";
import { priceDerivation, tierOfProvenance, weakestTier, type PricingRecord, type Tier } from "./pricing";
import { priceWithBoundary, selectMove, type BiasRecord } from "./disposition";
import { COHESION_MARKERS, ROLE_QUESTION_WORD, planClarification, planComposition, planCorrection, planPredication, planRecordPredication, planRoleQuestion, serialiseReplyGraph, type CohesionRelation, type CompositionOrder, type DegreeGrade, type PredicationSubject, type PricedConclusion, type QuestionFilledRole } from "./plan";
import { rivalSplits } from "./sense";

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
    shape: "unexpressed-state" | "persisting-gap";
    ground: string;
    move: "predication" | "question";
    sentence: string;
    state?: { holder: string; lemma: string; turn: number };
    event?: { verb: string; turn: number; role: string };
    pricing?: PricingRecord;
  };
  parseSummary: string;
  classifications: { concept: string; element: Element; confidence: number; provenance: string }[];
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
  declineReason?: string;
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
  const required = new Set([
    ...(entry.frameSignature?.required ?? entry.required),
    ...(entry.prepSlot?.required ? [entry.prepSlot.slot] : []),
  ]);
  const filled = new Set<string>(parsed.meaning.edges.filter((e) => e.from === root.id).map((e) => e.relation));
  const suppressed = new Set(root.states?.suppressedRoles ?? []);
  const frameOrder = [...entry.slots, ...(entry.prepSlot ? [entry.prepSlot.slot] : [])];
  const gaps = frameOrder.filter((r) => required.has(r) && !filled.has(r) && !suppressed.has(r) && r !== "agent");
  return { entry, gaps };
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
function tryGapQuestion(trace: TurnTrace, parsed: ParsedSentence, root: MeaningNode): string | undefined {
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
  trace.planNote =
    "the acknowledgment is the probe's wording; the follow-up question is generated from the valency gap (replyGraph)" +
    (gaps.length > 1 ? `; further unfilled required roles not asked (one gap per turn): ${gaps.slice(1).join(", ")}` : "");
  return outcome.sentence;
}

function processTurnInner(session: Session, text: string): TurnResult {
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

  let parsed: ParsedSentence;
  try {
    parsed = parse(text, "en");
  } catch (err) {
    trace.tokenResolutions =
      (err as { tokenResolutions?: TokenResolution[] }).tokenResolutions ?? [];
    trace.parseSummary = "parse failed";
    trace.declineReason = "the sentence could not be taken apart by the sentence layer";
    return { reply: "I couldn't take that sentence apart — could you put it another way?", trace };
  }
  const root = nodeById(parsed, parsed.meaning.rootId);
  trace.parseSummary = `root '${root.lemma}' (${root.syntacticElement}${root.role ? ", " + root.role : ""}); nodes: ${parsed.meaning.nodes.map((n) => n.lemma).join(", ")}; mood: ${root.states?.mood ?? "indicative"}`;
  trace.tokenResolutions = parsed.tokenResolutions ?? [];

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
  for (const n of parsed.meaning.nodes) {
    if (n.id !== root.id && n.syntacticElement !== "Wood") classificationOf(n.lemma);
  }
  trace.classifications = trace.classifications.filter(
    (c, i, a) => a.findIndex((x) => x.concept === c.concept && x.element === c.element) === i,
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
     * the shape ground likewise. */
    const q = parsed.query;
    const verbEntry = EN_LEXICON[root.lemma] as VerbEntry | undefined;
    if (q && isVerbRoot && verbEntry && verbEntry.kind === "verb") {
      const QUESTION_FILLERS = new Set(["what", "who", "where", "when", "which", "why"]);
      const filledBefore = session.events.some((e) => {
        if (e.turn >= turn || e.verb !== root.lemma) return false;
        const v = (e as unknown as Record<string, unknown>)[q.relation];
        return typeof v === "string" && !QUESTION_FILLERS.has(v);
      });
      if (!filledBefore) {
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

  /* ---- R3 (§2.3, second gap shape): a rival split preempts
   * statement steering. The sense arithmetic cannot separate
   * two rival derivations of a word the person just used; a
   * reply that steered by the classification anyway would be
   * steering by the tie-keep convention. The clarification is
   * the reply; the turn's content stands recorded above. (The
   * interrogative returns above have already run, so this point
   * is reached only by statement turns.) ---- */
  {
    const splits = rivalSplits(parsed);
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

  // (a) The new state CONTROLS an earlier state: address the restrainer.
  // R4 (§9.1(b)): this is the steering junction where two grounded
  // moves compete — addressing the restrainer (this branch) and
  // following the new state's generating direction (branch (c)).
  // The session's disposition selects between them by its declared
  // preference; under the neutral composition the standing order
  // (this branch first) stands, with no record.
  if (thisState?.element) {
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
      const controller = CONTROLLER_OF[earlier.element];
      trace.cyclePath = `${controller}→${earlier.element} (controlling)`;
      const d = derive(session.graph, earlier.concept ?? earlier.lemma);
      const conclusion = d.conclusions.find((c) => c.category.startsWith("restrained-by:")) ?? d.conclusions[0];
      trace.derivationPath = conclusion?.path;
      recordPricing(trace, d, conclusion);
      noteSteeringScope(trace);
      trace.generatingMargin = false;
      const patient = thisEvent.patient ?? thisEvent.theme;
      const reply =
        `You ${pastOf(thisEvent.verb)}${patient ? ` the ${patient}` : ""}${thisEvent.recipient ? ` at ${thisEvent.recipient}` : ""}${thisEvent.location ? ` in the ${thisEvent.location}` : ""}. ` +
        `Now that it's out — what would help you settle?`;
      return { reply, trace };
    }
  }

  // (c) A fresh state: follow the generating direction toward expression.
  if (thisState?.element) {
    const generated = GENERATES[thisState.element];
    trace.cyclePath = `${thisState.element}→${generated} (generating)`;
    const d = derive(session.graph, thisState.concept ?? thisState.lemma);
    const conclusion = d.conclusions.find((c) => c.category.startsWith("generates:")) ?? d.conclusions[0];
    trace.derivationPath = conclusion?.path;
    recordPricing(trace, d, conclusion);
    noteSteeringScope(trace);
    trace.generatingMargin = true;
    const priorEvent = session.events.filter((e) => e.turn < turn).pop();
    if (isVerbRoot) {
      // A verb-carried state (can't sleep): acknowledge the state itself,
      // and follow the generating direction toward what fills it.
      const ack = thisState.negated ? `You can't ${thisState.lemma}.` : `You ${thisState.lemma}.`;
      const follow = thisState.lemma === "sleep"
        ? "What's on your mind when you lie awake?"
        : "What's on your mind when it happens?";
      return { reply: `${ack} ${follow}`, trace };
    }
    const ack = `You were ${thisState.lemma}${priorEvent?.patient ? ` when you ${pastOf(priorEvent.verb)} the ${priorEvent.patient}` : ""}.`;
    const follow = priorEvent?.patient
      ? `What did you say when you ${pastOf(priorEvent.verb)} the ${priorEvent.patient}?`
      : "What did you say or do?";
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

  // (f) A plain event: acknowledge it from the situation; if its patient
  // is classified food, the generating closure asks after the next step.
  if (thisEvent) {
    const patient = thisEvent.patient ?? thisEvent.theme;
    const patientClass = patient ? lookupClassification(patient) : undefined;
    const ackParts = [`You ${pastOf(thisEvent.verb)}`];
    if (thisEvent.theme && thisEvent.location) ackParts.push(`the ${thisEvent.theme} in the ${thisEvent.location}`);
    else if (patient) ackParts.push(`the ${patient}`);
    const ack = ackParts.join(" ") + ".";
    // R3: a fillable valency gap in the event replaces the
    // follow-up wording below with the generated gap question.
    const gapSentence = tryGapQuestion(trace, parsed, root);
    if (gapSentence) return { reply: `${ack} ${gapSentence}`, trace };
    if (patientClass?.aspect === "food" || thisEvent.theme) {
      const el = patientClass?.element ?? "Water";
      trace.cyclePath = `${el}→${GENERATES[el]} (generating closure)`;
      const d = patient ? derive(session.graph, patient) : undefined;
      trace.derivationPath = d?.conclusions[0]?.path;
      if (d) recordPricing(trace, d, d.conclusions[0]);
      noteSteeringScope(trace);
      trace.generatingMargin = true;
      return { reply: `${ack} What goes in next?`, trace };
    }
    // R5: a steering note already written (the venting skip
    // above) is the more specific account of this turn; the
    // generic note stands only where nothing else was said.
    if (!trace.steeringNote) trace.steeringNote = "event recorded as a topic; no state yet for the cycles to steer by";
    return { reply: `${ack} What was in it?`, trace };
  }

  trace.steeringNote = "statement recorded; nothing in it for the cycles to steer by";
  return { reply: "Noted. What happened next?", trace };
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
  | { shape: "persisting-gap"; groundTurn: number; event: EventRecordShape; role: string };

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
  for (const s of session.states) {
    if (s.turn > turn - 2) continue;
    if (s.negated) continue;
    if (!s.element) continue;
    if (s.origin.kind !== "classified" || !s.origin.path || s.origin.support === undefined || !s.origin.tier) continue;
    const entry = EN_LEXICON[s.lemma] as VerbEntry | undefined;
    if (entry && entry.kind === "verb") continue;
    const generated = GENERATES[s.element];
    if (session.states.some((o) => o.turn > s.turn && o.element === generated)) continue;
    const addressed = trace.addressedState;
    if (addressed && addressed.holder === s.holder && addressed.lemma === s.lemma && addressed.turn === s.turn) continue;
    if (session.initiatives.some((i) => i.state && i.state.holder === s.holder && i.state.lemma === s.lemma && i.state.stateTurn === s.turn)) continue;
    candidates.push({ shape: "unexpressed-state", groundTurn: s.turn, state: s });
  }
  for (const e of session.events) {
    if (e.turn >= turn) continue;
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
  const shapeRank = (c: InitiativeCandidate): number => (c.shape === "unexpressed-state" ? 0 : 1);
  candidates.sort((a, b) => a.groundTurn - b.groundTurn || shapeRank(a) - shapeRank(b));
  return candidates;
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
  const e = candidate.event;
  const entry = EN_LEXICON[e.verb] as VerbEntry;
  const frameOrder = [...entry.slots, ...(entry.prepSlot ? [entry.prepSlot.slot] : [])];
  const filled: QuestionFilledRole[] = [];
  for (const rel of frameOrder) {
    if (rel === candidate.role || rel === "agent") continue;
    const value = (e as unknown as Record<string, unknown>)[rel];
    if (typeof value !== "string" || !value) continue;
    filled.push({
      relation: rel,
      lemma: value,
      form: value,
      ...(rel === "patient" || rel === "theme" || rel === "location" ? { det: "the" } : {}),
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
  if (result.reply.trimEnd().endsWith("?")) return;
  const last = session.initiatives[session.initiatives.length - 1];
  if (last && turn - last.turn < 5) return;
  for (const candidate of initiativeCandidates(session, trace, turn)) {
    const move = buildInitiativeMove(session, trace, candidate);
    if (!move) continue;
    result.reply = `${result.reply} ${move.sentence}`;
    if (!trace.replyGraph) trace.replyGraph = serialiseReplyGraph(move.graph);
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
    "session-and-situation",
  );
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
 * One conversational turn: the turn body (parse → record →
 * reason → reply), then the initiative scan over the formed
 * reply (R6, §8.10).
 */
export function processTurn(session: Session, text: string): TurnResult {
  const result = processTurnInner(session, text);
  applyInitiative(session, result);
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
      .find((s) => s.holder === subjectLemma && s.turn < session.turnCount && occupiesSlot(s));
    if (occupant) {
      const matchesAsked = occupant.lemma === predicateLemma && !!occupant.negated === !!predicateNodeInParse.states?.negated;
      if (!isWhy || !matchesAsked) {
        const freshIdx = session.states.findIndex(
          (s) => s.turn === session.turnCount && s.holder === subjectLemma && s.lemma === predicateLemma,
        );
        let recordingSkipped: string | undefined;
        if (freshIdx >= 0) {
          session.states.splice(freshIdx, 1);
          recordingSkipped =
            `the question's own recording of ${subjectLemma}/${predicateLemma} at this turn was set aside — ` +
            `the record answered, and the asked quality is not left standing as a new state beside the state that answered (T-R7.5)`;
        }
        const chain = session.supersessions.filter(
          (d) => d.holder === subjectLemma && (occupiesSlot(d.replaced) || occupiesSlot(d.replacing)),
        );
        const cohesion = detectCohesion(session, topicsBefore, subjectLemma, occupant.lemma);
        const outcome = planRecordPredication({
          subject: {
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
        return { reply: outcome.sentence, trace };
      }
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
