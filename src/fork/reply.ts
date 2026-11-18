/**
 * reply.ts — reply objects: the Planner as a creation site
 * (slice 4 of the semantic-object build).
 *
 * Where the Planner composes a reply from a graph — a plan
 * outcome in the turn loop — it now also AUTHORS the reply as a
 * semantic object: producer "system", the reply graph as its
 * content, the move it answers as its force, its aspects
 * classified by the same wiring that classifies an utterance
 * (assess.ts), linked to the object it answers. The object is
 * stored in the stream's graph beside the utterances, and
 * Coherence judges it outbound (coherence.ts, analyseOutbound)
 * before the Verbalizer's wording — the generated sentence —
 * is spoken.
 *
 * The boundary, stated plainly: replies the probe still words
 * by hand (the steering strings, trace.wordingNotDerived) get
 * NO reply object yet. Reply objects exist exactly where the
 * Planner composes from a graph today; the hand-worded replies
 * join when their wording is derived.
 *
 * Since the envelope build (2026-11-17) the authored object is
 * an INFORMATION object (info-object.ts): its envelope carries
 * the surviving needs of the object it answers.
 */
import type { ParsedSentence } from "./sentence";
import type { Session } from "./session";
import type { SemanticObject } from "./semantic-object";
import { classifyAspects, rollUpComposition } from "./assess";
import { buildSensesFace } from "./senses-scening";
import { wrapReplyObject, type InformationObject } from "./info-object";

export interface AuthorReplyInput {
  /** The reply graph the Planner composed (a plan outcome). */
  graph: ParsedSentence;
  turn: number;
  session: Session;
  /** The object this reply answers, when the turn has one. */
  inbound?: SemanticObject;
  /** The move, in words ("return greeting", "valency gap
   *  question", "predication") — the reply object's force. */
  move: string;
}

export function authorReplyObject(input: AuthorReplyInput): InformationObject {
  const { graph, turn, session, inbound, move } = input;
  const systemCount = session.objects.filter((o) => o.producer === "system").length;
  const aspects = classifyAspects(graph);
  const composition = rollUpComposition(aspects);
  const root = graph.meaning.nodes.find((n) => n.id === graph.meaning.rootId);
  const obj: SemanticObject = {
    id: `obj-${turn}r-${systemCount + 1}`,
    turn,
    producer: "system",
    act: {
      kind: "reply",
      form: root?.states?.mood ?? "indicative",
      force: move,
      // Ritual inbounds (Social Unit S2): the greeting's mirror
      // was the first; the farewell mirror and the thanks
      // receipt are ritual exchanges of the same kind — recorded
      // as ritual, never banked as reports.
      ritual:
        inbound?.act.kind === "greeting" || inbound?.act.kind === "leave-taking" || inbound?.act.kind === "thanks",
      streamRole:
        inbound && inbound.act.kind === "leave-taking"
          ? "closes"
          : inbound &&
              (inbound.act.kind === "question" ||
                inbound.act.kind === "greeting" ||
                inbound.act.kind === "reason-query" ||
                inbound.act.kind === "thanks")
            ? "answers"
            : "continues",
    },
    content: { meaning: graph.meaning, connective: graph.connective, holes: [], grounding: [] },
    aspects,
    // The reply object's senses face, from the reply graph by
    // the same Senses-Scening wiring (2026-11-17) — reference
    // mode: it names the standing scene, never mutates it.
    senses: buildSensesFace(graph, session, "reference"),
    ...(composition ? { composition } : {}),
    confidence: 1,
    links: { ...(inbound ? { follows: inbound.id } : {}) },
    trail: [{ unit: "reasoning/planner", note: `authored as a reply object: ${move}` }],
  };
  // The envelope (2026-11-17): the reply object travels as an
  // information object too, carrying the surviving needs of
  // the object it answers — priced by Coherence before this
  // authoring (the turn loop settles the inbound first), and
  // carried as data for the reply decision.
  return wrapReplyObject(obj, inbound);
}
