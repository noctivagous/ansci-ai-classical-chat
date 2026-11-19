/**
 * social.ts — the Social Unit (Awareness → Social Unit), slice S1
 * (2026-11-18; design: ansci-social-unit-design.md, owner's
 * rulings 1a–5a on that design).
 *
 * The unit reads the social situation and raises social demands;
 * it never speaks, never authors a reply, and never originates a
 * claim about the world. Recognition lives in SemanticAssessment
 * (assess.ts: greeting, leave-taking, thanks, self-query);
 * authorship stays with the Planner; wording with the
 * Verbalizer. The unit's product is a reading — signed
 * annotations on the semantic object's trail — plus the state of
 * its two registers, which live in the Session:
 *
 *  - The Interlocutor: the system's standing picture of the
 *    person it is talking with. It records only what an object
 *    attributes to the speaker with asserted commitment (the
 *    design's update rule): the register holds THAT they said
 *    it, as pointers to objects; the objects hold what was said.
 *  - Conversation: the phase machine (opening / open / closing /
 *    closed) and what is pending, consulted by the Planner from
 *    S2 on.
 *
 * S1 WAS SHADOW: the reading annotated and the registers
 * updated, and nothing in the reply path consumed any of it.
 * S2 (2026-11-18, under the owner's sequence authorization for
 * S2–S5) makes the first demands live: the reading now also
 * records each raised demand in the Conversation register's
 * obligations, and the Planner discharges greeting-return,
 * farewell-return and thanks-receipt through the unit's own
 * discharge function (one writer: the unit) as it authors the
 * matching moves in the turn loop. The phase machine is
 * consulted before initiative. self-answer obligations are
 * recorded and stand open — S3 discharges them; clarification
 * (S4) and the premise stance (S5) likewise. The greeting
 * realisation variants (to-the-point / welcoming) remain the
 * owner's configurations ruling, still open; the mirror is the
 * behaviour, as it was for the greeting before this unit.
 */
import { lookupClassification } from "./classify";
import { interlocutorKey } from "./interlocutor-store";
import { CAPABILITIES, LIMITS } from "./capabilities";
import { IDENTITY } from "./identity";
import type { SemanticObject } from "./semantic-object";
import type { Session } from "./session";

export interface InterlocutorRegister {
  /** "returning" is set only by cross-conversation persistence
   *  (S6): the store held a record under the identity the
   *  interlocutor has just stated in this conversation. It is
   *  never set before that statement, and never from a guess. */
  contact: "not-yet-known" | "first" | "returning";
  identity: { name: string; learnedHow: "stated"; learnedAt: string } | null;
  /** Object ids of the content-bearing acts established with
   *  this person — pointers, never copies. */
  establishedWithThem: string[];
  /** S6: what earlier conversations under this identity
   *  established, loaded from the store at the moment the
   *  identity was stated — topic lemmas, the durable core's
   *  rendering (pointers cannot cross conversations). Empty
   *  for first contact and for store-less sessions. */
  priorEstablished: string[];
  /** S6: how many conversations the store held for this
   *  identity before this one (0 on first contact). */
  priorConversations: number;
  /** Gaps addressed to them and still open. S1 raises none
   *  (clarifications arrive with S4); the field stands so the
   *  register's shape is the design's from the start. */
  addressedToThem: string[];
  socialState: { greeted: boolean; thankedCount: number; leaveTaken: boolean };
}

export interface ConversationRegister {
  phase: "opening" | "open" | "closing" | "closed";
  /** What the conversation is waiting on. S1 held the shape
   *  only; S4 opens clarification entries (stance-repair is
   *  S5's). The S4 fields carry what the pending-fill reading
   *  needs: the located point, the question as asked (for the
   *  one re-ask), the offered candidates with the reading each
   *  names, the utterance being clarified where reprocessing
   *  is the fill's work, and the best reading the fallback
   *  proceeds on after two failed attempts. */
  pending: {
    kind: "clarification" | "question" | "stance-repair";
    openedBy: string;
    attempts: number;
    point?: string;
    question?: string;
    candidates?: { term: string; reading: string; element?: string }[];
    originalText?: string;
    bestReading?: string;
    bestElement?: string;
    /** S5: for a stance-repair pending, the premise it guards
     *  and the established ground the stance stated. */
    premise?: { subject: string; quality: string; established: string; source?: "record" | "graph" };
    openedTurn?: number;
  } | null;
  lastActs: { theirs: string | null; ours: string | null };
  /** The system's last substantive reply, as spoken
   *  (conversation-shapes C5, 2026-11-18): the record the
   *  restatement move reads when the visitor asks what the
   *  system meant. Written through recordLastReply below —
   *  the Planner reports each substantive reply as it is
   *  spoken (clarification questions, the rephrase request,
   *  ritual mirrors and restatements themselves are not
   *  substantive sayings and are never recorded here). */
  lastReply: { turn: number; text: string } | null;
  /** Sense readings the conversation itself has settled
   *  through clarification (S4): lemma → the reading chosen
   *  (or, at the attempt limit, the baseline the system
   *  proceeded on). A clarified lemma is not asked about
   *  again in this conversation. */
  clarifiedSenses: Record<string, { anchor: string; element: string }>;
  /** Premise disagreements the conversation has recorded
   *  (S5, design §8): the interlocutor insisted on a premise
   *  the stance had met; the system proceeded without
   *  adopting it, and the disagreement stands here — the
   *  session record of it, in plain renderings. */
  disagreements: { premise: string; established: string; turn: number }[];
  /** Demand ids the reading has raised and the Planner has not
   *  yet discharged (S2). The Planner asks the unit what is
   *  owed through this list (design §3.2); discharge goes
   *  through dischargeDemand below, so the unit stays the
   *  registers' one writer. */
  obligations: string[];
}

export function initialInterlocutor(): InterlocutorRegister {
  return {
    contact: "not-yet-known",
    identity: null,
    establishedWithThem: [],
    priorEstablished: [],
    priorConversations: 0,
    addressedToThem: [],
    socialState: { greeted: false, thankedCount: 0, leaveTaken: false },
  };
}

export function initialConversation(): ConversationRegister {
  return { phase: "opening", pending: null, lastActs: { theirs: null, ours: null }, lastReply: null, obligations: [], clarifiedSenses: {}, disagreements: [] };
}

/** Record the system's last substantive reply (C5): the
 *  Planner calls this as a substantive reply is spoken, and
 *  the restatement move reads it back when the visitor asks
 *  what the system meant. The unit keeps the record; it does
 *  not judge the reply — substantiveness is the caller's
 *  call, made on the trace of the turn that spoke it. */
export function recordLastReply(session: Session, entry: { turn: number; text: string }): void {
  session.conversation.lastReply = entry;
}

/**
 * Open a clarification pending (S4; design §7): the Planner
 * has asked, and the conversation now waits on the answer.
 * The unit — the registers' one writer — records it, and the
 * gap joins the Interlocutor's addressed-to-them list (the
 * field S1 held for exactly this). One clarification at a
 * time: opening one replaces any standing entry, which the
 * turn's own reading order makes unreachable in practice (a
 * standing pending is read, resolved or abandoned before any
 * new one can be raised).
 */
export function openClarification(
  session: Session,
  entry: {
    openedBy: string;
    point: string;
    question?: string;
    candidates?: { term: string; reading: string; element?: string }[];
    originalText?: string;
    bestReading?: string;
    bestElement?: string;
  },
): void {
  session.conversation.pending = { kind: "clarification", attempts: 0, openedTurn: session.turnCount, ...entry };
  if (!session.interlocutor.addressedToThem.includes(entry.openedBy)) {
    session.interlocutor.addressedToThem.push(entry.openedBy);
  }
}

/**
 * Open a stance-repair pending (S5; design §8): the stance
 * has been taken on a contradicted premise, and the
 * conversation now holds the premise open for repair — the
 * interlocutor may take the corrected ground (the pending
 * lapses), or insist, which the stance's second half meets
 * as a supposition. One stance per premise: the pending is
 * how the system knows the stance has already been given.
 */
export function openStanceRepair(
  session: Session,
  entry: { openedBy: string; premise: { subject: string; quality: string; established: string; source?: "record" | "graph" } },
): void {
  session.conversation.pending = {
    kind: "stance-repair",
    attempts: 0,
    openedTurn: session.turnCount,
    openedBy: entry.openedBy,
    point: `premise:${entry.premise.subject}:${entry.premise.quality}`,
    premise: entry.premise,
  };
}

/** Record a premise disagreement (S5; design §8): the
 *  interlocutor insisted, the system proceeded without
 *  adopting the premise, and the disagreement stands in the
 *  session record in plain renderings. */
export function recordDisagreement(session: Session, premise: string, established: string): void {
  session.conversation.disagreements.push({ premise, established, turn: session.turnCount });
}

/**
 * Persist the durable core (S6): when the session carries a
 * store and the interlocutor has stated an identity, write
 * the record for that identity — this conversation counted
 * once (the loaded count plus one), and the established
 * topics as the union of what earlier conversations
 * established and this conversation's topics so far. Called
 * at the end of every turn, so a conversation that ends
 * without a farewell has still left its core; a no-op for
 * store-less sessions and unnamed interlocutors (nothing is
 * ever written under no identity).
 */
export function persistInterlocutor(session: Session): void {
  const store = session.interlocutorStore;
  const identity = session.interlocutor.identity;
  if (!store || !identity) return;
  const topics = [...session.interlocutor.priorEstablished];
  for (const topic of session.topics) {
    if (!topics.includes(topic.lemma)) topics.push(topic.lemma);
  }
  store.put(interlocutorKey(identity.name), {
    name: identity.name,
    conversations: session.interlocutor.priorConversations + 1,
    establishedTopics: topics,
  });
}

/** Close the standing pending, whatever its resolution. */
export function closePending(session: Session): void {
  session.conversation.pending = null;
}

/** Count a failed fill attempt against the standing pending
 *  (design §7: attempts are counted in the Conversation
 *  register; there is no third clarification on the same
 *  point). Returns the new count. */
export function noteClarificationAttempt(session: Session): number {
  const pending = session.conversation.pending;
  if (!pending) return 0;
  pending.attempts += 1;
  return pending.attempts;
}

/**
 * Read an incoming turn against the standing clarification's
 * offered candidates (the pending-fill reading, design §7):
 * the fill names a candidate — by its offered term, on a word
 * boundary, case aside — and the match returns the candidate
 * with the reading it names. No match returns undefined; what
 * a non-matching turn means (a fresh start, or a failed
 * attempt) is the turn loop's judgement, not this function's.
 */
export function matchPendingFill(
  pending: NonNullable<ConversationRegister["pending"]>,
  text: string,
): { term: string; reading: string; element?: string } | undefined {
  if (!pending.candidates?.length) return undefined;
  const words = (s: string) => ` ${s.toLowerCase().replace(/[^a-z]+/g, " ")} `;
  const haystack = words(text);
  return pending.candidates.find((c) => haystack.includes(words(c.term)));
}

/** Record a clarified sense reading (S4): the conversation
 *  has settled this lemma's reading — by the interlocutor's
 *  choice at a fill, or by the baseline at the attempt
 *  limit — and the point is not asked about again. */
export function noteClarifiedSense(session: Session, lemma: string, reading: { anchor: string; element: string }): void {
  session.conversation.clarifiedSenses[lemma.toLowerCase()] = reading;
}

/** The Planner's questions to the unit (design §3.2): what
 *  phase the conversation is in, and which social obligations
 *  stand open. The unit's interface has no answer about content,
 *  wording or knowledge to give — that is the seam's shape. */
export function conversationPhase(session: Session): ConversationRegister["phase"] {
  return session.conversation.phase;
}

export function openDemands(session: Session): string[] {
  return [...session.conversation.obligations];
}

/**
 * The unit's requests to Awareness Self (design §9, ruling 2a):
 * when a self-query arrives, the unit — the Planner's one
 * address for "who are we, socially" — asks the Self tables
 * for the facts and hands them on. The tables (identity.ts,
 * capabilities.ts) are the one source; the unit holds no copy,
 * so the self it presents cannot drift from the self the rest
 * of Awareness reads. S3: identity and capability answers are
 * composed from exactly what these return.
 */
export function requestIdentity(): { name: string; kindLine: string } {
  return { name: IDENTITY.name, kindLine: IDENTITY.kindLine };
}

export function requestCapabilities(): { capabilities: string[]; limits: string[] } {
  return { capabilities: [...CAPABILITIES], limits: [...LIMITS] };
}

/**
 * Discharge one open demand: the Planner has authored the move
 * that discharges it, and the unit — the registers' one writer —
 * records the discharge. Discharging farewell-return completes
 * the closing the leave-taking opened: the farewell has now
 * actually been exchanged (by the system's own act), so the
 * phase moves closing → closed here, in the same turn, rather
 * than by S1's next-turn presumption.
 */
export function dischargeDemand(session: Session, demand: string): void {
  const cv = session.conversation;
  cv.obligations = cv.obligations.filter((d) => d !== demand);
  if (demand === "farewell-return" && cv.phase === "closing") cv.phase = "closed";
}

const UNIT = "awareness/social-unit";

/**
 * The social reading of one assessed person object: annotate its
 * trail and update the registers. Runs after Coherence's inbound
 * analysis, before planning (turn.ts). Person objects only —
 * reply objects are the system's own acts and are read by the
 * outbound judge, not here.
 */
export function readSocial(object: SemanticObject, session: Session): void {
  if (object.producer !== "person") return;
  const il = session.interlocutor;
  const cv = session.conversation;
  const note = (text: string, data?: Record<string, unknown>) =>
    object.trail.push({ unit: UNIT, note: text, ...(data ? { data } : {}) });
  // A raised demand is annotated on the object AND recorded in
  // the register's obligations (S2) — the annotation is the
  // turn's evidence, the obligation is what the Planner owes
  // until discharge.
  const raise = (text: string, data: Record<string, unknown> & { demand: string }) => {
    note(text, data);
    if (!cv.obligations.includes(data.demand)) cv.obligations.push(data.demand);
  };

  // A conversation left in "closing" by the previous turn is
  // closed by this one's arrival: the farewell is presumed
  // exchanged. (S1's presumption. Since S2 the farewell branch
  // normally discharges in the leave-taking turn itself and
  // dischargeDemand completes the closing there; this remains
  // for any path where a closing survives a turn boundary —
  // e.g. the leave-taking was not the turn's first object.)
  if (cv.phase === "closing") {
    cv.phase = "closed";
    note("conversation closed (farewell presumed exchanged)");
  }

  // Anything arriving in a closed conversation reopens it as a
  // fresh opening (design §6) — people do say one more thing
  // after goodbye. S1 read this only for greetings; S2 makes it
  // general, because the phase is now consulted (a conversation
  // stuck at closed would bar initiative and topic moves for
  // the rest of the session).
  if (cv.phase === "closed") {
    cv.phase = "opening";
    note("arrival in a closed conversation — treated as a fresh opening");
  }

  if (il.contact === "not-yet-known") il.contact = "first";
  const lastSystem = [...session.objects].reverse().find((o) => o.producer === "system");
  if (lastSystem) cv.lastActs.ours = lastSystem.act.kind;

  const kind = object.act.kind;
  switch (kind) {
    case "greeting": {
      if (cv.phase === "open" && il.socialState.greeted) {
        raise("greeting repeated in an open conversation", { demand: "greeting-return", repeated: true });
      } else {
        raise("greeting — the conversation opens", { demand: "greeting-return" });
        cv.phase = "open";
      }
      il.socialState.greeted = true;
      break;
    }
    case "leave-taking": {
      raise("leave-taking — the conversation closes", { demand: "farewell-return" });
      cv.phase = "closing";
      il.socialState.leaveTaken = true;
      break;
    }
    case "thanks": {
      il.socialState.thankedCount += 1;
      raise("thanks received (ritual — recorded as ritual, not as content)", { demand: "thanks-receipt" });
      break;
    }
    case "self-query": {
      raise(`self-query (${object.act.selfQuery ?? "identity"}) — a question about the system itself`, {
        demand: "self-answer",
        selfQuery: object.act.selfQuery ?? "identity",
      });
      break;
    }
    case "statement": {
      // A self-naming statement ("I'm Sam."): the parse draws a
      // predicated-as from the speaker to a capitalised form —
      // the parser's own proper-name signal (the retained form
      // keeps its case). Recorded as stated, never inferred from
      // anything weaker.
      const naming = statedName(object);
      if (naming && !il.identity) {
        il.identity = { name: naming, learnedHow: "stated", learnedAt: object.id };
        note(`interlocutor identity learned — name stated: ${naming}`);
        // S6: only now — identity stated, in this conversation
        // — may the store be consulted. A record under this
        // name makes the contact "returning" and loads what
        // earlier conversations established; before this
        // moment the system performed no recognition, and a
        // store miss changes nothing.
        const store = session.interlocutorStore;
        if (store) {
          const record = store.get(interlocutorKey(naming));
          if (record) {
            il.contact = "returning";
            il.priorEstablished = [...record.establishedTopics];
            il.priorConversations = record.conversations;
            note(
              `returning interlocutor — recognised under the identity just stated (S6): ${record.conversations} earlier conversation(s) under this name, ` +
                `${record.establishedTopics.length} established topic(s) carried`,
            );
          }
        }
      } else if (naming && il.identity && il.identity.name !== naming) {
        note(`a different name stated (${naming}); the recorded identity stands — corrections are a later slice`);
      }
      il.establishedWithThem.push(object.id);
      break;
    }
    case "question":
    case "topic-proposal":
    case "reason-query": {
      // The offer of help (S2, the S programme, 2026-11-19):
      // a social act in question dress — the reading records
      // it as the act it is and raises the offer-answer
      // demand; the Planner answers it in kind. The unit
      // itself says nothing, as ever.
      if (object.act.offerHelp) {
        raise("offer of help received — a social act in question dress", { demand: "offer-answer" });
      }
      // The either/or question (S2): a choice posed to the
      // system about its own preference or being — a
      // self-answer in the limits voice, raised as such.
      if (object.act.choiceQuery) {
        raise(`either/or question (${object.act.choiceQuery}) — a choice posed to the system about itself`, {
          demand: "self-answer",
          selfQuery: "fact",
        });
      }
      il.establishedWithThem.push(object.id);
      break;
    }
    default:
      break;
  }
  cv.lastActs.theirs = kind;
}

/** The speaker's stated name, when this object is a self-naming
 *  statement: a predicated-as edge from the "i" subject to a
 *  predicate whose retained form is capitalised and whose lemma
 *  the classification table does not know as a common concept. */
function statedName(object: SemanticObject): string | undefined {
  const { nodes, edges } = object.content.meaning;
  // Two drawn shapes: the speaker predicated as the name
  // ("I'm Sam." — subject "i"), and the name-noun predicated
  // as the name ("My name is Sam." — subject "name"; the
  // possessive is the speaker's by the statement's own
  // delivery, and no other subject-noun draws this reading).
  // The second shape was added with conversation-shapes C6
  // (2026-11-18): without it the commonest naming form never
  // reached the register at all, so no recognition could ever
  // show the name the visitor had given.
  const subject = nodes.find(
    (n) => n.role === "subject" && (n.lemma.toLowerCase() === "i" || n.lemma.toLowerCase() === "name"),
  );
  if (!subject) return undefined;
  const edge = edges.find((e) => e.relation === "predicated-as" && e.from === subject.id);
  if (!edge) return undefined;
  const predicate = nodes.find((n) => n.id === edge.to);
  if (!predicate || !predicate.form) return undefined;
  if (!/^[A-Z]/.test(predicate.form)) return undefined;
  if (lookupClassification(predicate.lemma.toLowerCase())) return undefined;
  return predicate.form;
}
