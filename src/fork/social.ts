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
 * S1 IS SHADOW: the reading annotates and the registers update,
 * and nothing in the reply path consumes any of it — no reply
 * changes in this slice. The demands recorded in annotation data
 * (greeting-return, farewell-return, thanks-receipt,
 * self-answer) are the obligations S2 will teach the Planner to
 * discharge.
 */
import { lookupClassification } from "./classify";
import type { SemanticObject } from "./semantic-object";
import type { Session } from "./session";

export interface InterlocutorRegister {
  /** "returning" is set only by cross-conversation persistence
   *  (S6, deferred — ruling 5a); S1 knows first contact and the
   *  not-yet-known of a session's first moments. */
  contact: "not-yet-known" | "first" | "returning";
  identity: { name: string; learnedHow: "stated"; learnedAt: string } | null;
  /** Object ids of the content-bearing acts established with
   *  this person — pointers, never copies. */
  establishedWithThem: string[];
  /** Gaps addressed to them and still open. S1 raises none
   *  (clarifications arrive with S4); the field stands so the
   *  register's shape is the design's from the start. */
  addressedToThem: string[];
  socialState: { greeted: boolean; thankedCount: number; leaveTaken: boolean };
}

export interface ConversationRegister {
  phase: "opening" | "open" | "closing" | "closed";
  /** What the conversation is waiting on. Nothing opens a
   *  pending entry in S1 (clarification S4, stance S5); the
   *  shape is the design's. */
  pending: { kind: "clarification" | "question" | "stance-repair"; openedBy: string; attempts: number } | null;
  lastActs: { theirs: string | null; ours: string | null };
}

export function initialInterlocutor(): InterlocutorRegister {
  return {
    contact: "not-yet-known",
    identity: null,
    establishedWithThem: [],
    addressedToThem: [],
    socialState: { greeted: false, thankedCount: 0, leaveTaken: false },
  };
}

export function initialConversation(): ConversationRegister {
  return { phase: "opening", pending: null, lastActs: { theirs: null, ours: null } };
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

  // A conversation left in "closing" by the previous turn is
  // closed by this one's arrival: the farewell is presumed
  // exchanged. (Shadow presumption — S1 authors no farewell;
  // S2's farewell move will make the transition its own act.)
  if (cv.phase === "closing") {
    cv.phase = "closed";
    note("conversation closed (farewell presumed exchanged — shadow)");
  }

  if (il.contact === "not-yet-known") il.contact = "first";
  const lastSystem = [...session.objects].reverse().find((o) => o.producer === "system");
  if (lastSystem) cv.lastActs.ours = lastSystem.act.kind;

  const kind = object.act.kind;
  switch (kind) {
    case "greeting": {
      if (cv.phase === "open" && il.socialState.greeted) {
        note("greeting repeated in an open conversation", { demand: "greeting-return", repeated: true });
      } else {
        note(cv.phase === "closed" ? "greeting — the conversation reopens" : "greeting — the conversation opens", {
          demand: "greeting-return",
        });
        cv.phase = "open";
      }
      il.socialState.greeted = true;
      break;
    }
    case "leave-taking": {
      note("leave-taking — the conversation closes", { demand: "farewell-return" });
      cv.phase = "closing";
      il.socialState.leaveTaken = true;
      break;
    }
    case "thanks": {
      il.socialState.thankedCount += 1;
      note("thanks received (ritual — recorded as ritual, not as content)", { demand: "thanks-receipt" });
      break;
    }
    case "self-query": {
      note(`self-query (${object.act.selfQuery ?? "identity"}) — a question about the system itself`, {
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
      } else if (naming && il.identity && il.identity.name !== naming) {
        note(`a different name stated (${naming}); the recorded identity stands — corrections are a later slice`);
      }
      il.establishedWithThem.push(object.id);
      break;
    }
    case "question":
    case "topic-proposal":
    case "reason-query": {
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
  const subject = nodes.find((n) => n.role === "subject" && n.lemma.toLowerCase() === "i");
  if (!subject) return undefined;
  const edge = edges.find((e) => e.relation === "predicated-as" && e.from === subject.id);
  if (!edge) return undefined;
  const predicate = nodes.find((n) => n.id === edge.to);
  if (!predicate || !predicate.form) return undefined;
  if (!/^[A-Z]/.test(predicate.form)) return undefined;
  if (lookupClassification(predicate.lemma.toLowerCase())) return undefined;
  return predicate.form;
}
