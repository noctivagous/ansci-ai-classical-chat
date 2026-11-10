/**
 * Statement-turn composition — the reply policy for STATEMENT
 * turns, extracted from the turn coordinator (Loop 2, L2-X1:
 * policy leaves turn.ts a small piece at a time, each
 * extraction behaviour-neutral and diff-verified; the
 * coordinator keeps order, workspace hand-offs and route
 * arbitration, policy lives in named pieces).
 *
 * The policy, in composition order: person knowledge was
 * consulted first (capture + connections, run by the
 * coordinator before this piece); the classifier judges the
 * statement's conversational intent with the graph's evidence
 * weighed in; the reply is then composed from the
 * conversation's own records FIRST — the situation leads
 * (L2-A/C/D), the feeling's general pattern (L2-M3) — with
 * graph testimony admitted only as the graph-distance rule
 * allows (L2-R: a bare classification is never an utterance),
 * and the role's follow-up policy closes. A schmooze reply
 * succeeds socially with the grounded fact it can honestly
 * add PLUS the follow-up its slot licenses; zero graph facts
 * is a complete success for the class, never a decline.
 */
import type { Situation } from "./awareness";
import {
  edgeText,
  renderConclusion,
  renderContinuityClause,
  renderEventLead,
  renderEventLeadFor,
  renderFeelingLead,
  renderRememberAck,
  renderSchmoozeFollowup,
  renderStateLead,
  renderStateNoted,
  renderStatementNoted,
} from "./articulate";
import { STOPWORDS, matchEvent, type Breakdown, type ResolvedTerm } from "./discourse";
import { classifyStatement } from "./intent";
import type { CskgGraph } from "./loader";
import { remember, type SessionState } from "./memory";
import type { CaptureResult, PersonConnection } from "./person";
import type { RolePack } from "./roles";
import { entityById, type SituationTurnResult } from "./situation";
import {
  FACT_REL_PRIORITY,
  addConclusions,
  bestStatementFact,
  noteTriage,
  relevanceFor,
  solveStateReaction,
  turnContextIds,
} from "./solve";
import { noteStep, type TurnWorkspace } from "./workspace";

/**
 * Number and ordinal words (Loop 2, L2-J): a statement fact
 * ABOUT one of these is an opaque classification ("Three is
 * a number."), never a comprehensible acknowledgement.
 */
const NUMBER_TOPIC_WORDS = new Set([
  "zero", "one", "two", "three", "four", "five", "six", "seven",
  "eight", "nine", "ten", "eleven", "twelve", "thirteen",
  "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
  "nineteen", "twenty", "hundred", "thousand", "million", "billion",
  "first", "second", "third", "fourth", "fifth", "sixth",
  "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth",
  "number", "numbers",
]);

/** Everything the coordinator hands the statement policy. */
export interface StatementDeps {
  g: CskgGraph;
  ws: TurnWorkspace;
  session: SessionState;
  env: NodeJS.ProcessEnv;
  role: RolePack;
  capture: CaptureResult;
  connections: PersonConnection[];
  sitResult: SituationTurnResult;
  bd: Breakdown;
  resolved: ResolvedTerm[];
  salient: ResolvedTerm | null;
  words: string[];
  sit: Situation;
}

/**
 * Compose a statement turn's reply, or null when the turn
 * carried nothing the policy could take up (no resolved
 * content, no capture) — the coordinator then declines the
 * statement as unplaced, as before.
 */
export function composeStatementReply(
  deps: StatementDeps,
): { text: string; grounded: boolean } | null {
  const {
    g, ws, session, env, role, capture, connections, sitResult,
    bd, resolved, salient, words, sit,
  } = deps;
  // (7) statements — E4's set order (§2, piece C): person
  // knowledge was consulted first (capture + connections,
  // above); the classifier has judged the statement's
  // conversational intent with the graph's evidence weighed
  // in; the reply is formulated only now — per the class, the
  // role's strategy and follow-up policy, and the operative
  // context. A schmooze reply succeeds socially with the
  // grounded fact it can honestly add PLUS the follow-up its
  // slot licenses; zero graph facts is a complete success for
  // the class, never a decline.
  if (resolved.length || capture.feeling || capture.doing || capture.newPerson || capture.factsWritten.length) {
    const ev = resolved.length ? matchEvent(g, words, resolved) : null;
    const primary = ev ?? bd.topics[0] ?? (resolved.length ? salient : null);
    if (primary) {
      remember(session, primary.id);
      // E2: memory's active set is fed by the scored topics (the
      // best few that scored as topical), not by every resolved
      // fragment — "third" no longer becomes a conversation topic.
      for (const t of bd.topics.slice(0, 4)) {
        if (t.score >= 0) remember(session, t.id);
      }
    }
    if (ev) noteStep(ws, "intent", "intent", `statement; ATOMIC event match: ${ev.text}`);
    const cls = classifyStatement(
      g, ws, capture, connections, env.CSKG_CLASSIFY_GRAPH !== "off",
    );
    noteTriage(ws, "retrieve",
      `statement (${cls.kind}): person knowledge first, classification weighed, reply per role "${role.id}" + operative context`);
    // every file write is acknowledged in the reply, in the
    // role's voice — never silent (§5)
    const ackSuffix = capture.factsWritten.length
      ? ` ${renderRememberAck(role.memoryAck, capture.factsWritten[0].display)}`
      : capture.patternsWritten.length
        ? ` ${role.memoryAck}`
        : "";

    // a stated feeling: the reply is drawn from the canonical
    // state record — ATOMIC consulted FROM the record (§5)
    if (cls.kind === "state" && capture.feeling) {
      const reaction = solveStateReaction(g, ws, capture.feeling.canonical);
      // Loop 2 (L2-M3): when the state's general pattern can
      // be said, the reply first takes up the PERSON's state
      // in second person — the pattern answers the person,
      // not the room. No sayable pattern → the plain noted
      // acknowledgement, as before.
      const lead = reaction ? renderFeelingLead(capture.feeling.text) : null;
      const base = reaction
        ? (lead ? `${lead} ${reaction}` : reaction)
        : renderStateNoted(capture.feeling.text, capture.feeling.pattern);
      session.lastIntent = "fact";
      return { text: base + ackSuffix, grounded: reaction !== null };
    }

    if (!primary) {
      // nothing resolved, but the statement still landed —
      // as person data (a name, a fact for the file)
      return { text:         capture.factsWritten.length
          ? renderRememberAck(role.memoryAck, capture.factsWritten[0].display)
          : renderStatementNoted(capture.doing ?? capture.newPerson ?? "that"), grounded: false };
    }

    // the grounded acknowledgement fact, role-shaped in its
    // selection (the pack's preferred relations lead) and
    // judged against the operative context
    const factRels = ev
      ? ["at:xEffect", "at:xReact", "at:xWant", "at:oReact", "/r/IsA", "/r/HasProperty"]
      : [
          ...role.preferredRelations,
          ...FACT_REL_PRIORITY.filter((r) => !role.preferredRelations.includes(r)),
        ];
    let fact = bestStatementFact(
      g, sit, ev, resolved, primary, factRels, bd.topics,
      turnContextIds(g, ws), relevanceFor(ws),
    );
    // Loop 2 (L2-J): the comprehensibility floor. A statement
    // fact whose SUBJECT is a time topic (the contents
    // categorisation's own verdict), a number or ordinal word,
    // or a bare function word is an opaque classification —
    // "Summer is a single.", "Three is a number." — and
    // surfacing it makes the reply nonsense. Suppress it: the
    // composition below falls back to the plain
    // noted-acknowledgement (or a situation lead, when the
    // model recorded one). A reply that doesn't make sense is
    // worse than a plain acknowledgement.
    if (fact) {
      const subjectId = fact.about === "from" ? fact.edge.from : fact.edge.to;
      const subjectText = (g.terms[subjectId] ?? "").toLowerCase();
      const timeTopic = (bd.contents?.times ?? []).some((t) => t.referentId === subjectId);
      if (timeTopic || NUMBER_TOPIC_WORDS.has(subjectText) || STOPWORDS.has(subjectText)) {
        noteStep(ws, "solve", "conclude",
          `statement fact suppressed (L2-J): a classification of "${subjectText}" — a time/number/auxiliary topic — is not a comprehensible reply; acknowledgement only`);
        fact = null;
      }
    }
    // Loop 2 (L2-R): THE GRAPH-DISTANCE RULE (user, 2026-11-10).
    // On statement turns there is no direct graph-to-response
    // path. A bare classification edge of a topic noun (IsA)
    // is testimony, not an utterance: "Ladder is a type of
    // degree" pastes a filing where the reply should be the
    // product of the whole architecture — situation, person,
    // state. L2-A already drops the classification when a
    // situation lead composes; this closes the no-lead path:
    // when the only fact on offer is a classification, it is
    // suppressed and the composition falls to the clean
    // noted-acknowledgement. Graph testimony still informs
    // statement replies as arbitrated, combined conclusions
    // (the pattern route above, event-incident facts under
    // L2-A) — never as a lone filing. Question routes keep
    // their arbitrated use of testimony, untouched.
    if (fact && fact.edge.rel === "/r/IsA") {
      noteStep(ws, "solve", "conclude",
        `statement fact suppressed (L2-R, graph-distance rule): a bare classification ("${edgeText(g, fact.edge)}") is testimony, not an utterance — no graph-to-response path on a statement turn; acknowledgement only`);
      fact = null;
    }
    let text: string;
    let grounded = false;
    // Loop 2 (L2-A): when the statement recorded the speaker's
    // own event in the situation model, the reply LEADS with
    // that event — the reply is about what the person just
    // said they are doing, in second person, with its stated
    // time. The acknowledgement fact survives only when it is
    // about the event term itself (its effects, reactions,
    // wants — the factRels' first entries when an ATOMIC event
    // matched); a bare classification of the object noun
    // ("Soup is a type of dish", "A bike is a bicycle") is
    // dropped instead of leading the reply. Where no event
    // was recorded, composition is unchanged.
    const doing = sitResult.doingEvent;
    const factAboutEvent =
      fact !== null && ev !== null && (fact.edge.from === ev.id || fact.edge.to === ev.id);
    // Loop 2 (L2-C): the freshest state this statement recorded
    // in the situation model — circumstance (a duration) or
    // property kinds only: feelings have their own branch
    // above, and doing-states belong to the event family the
    // lead above already covers. Consulted only when no doing
    // event leads.
    const stateLead = doing
      ? null
      : [...sitResult.statesAdded]
          .reverse()
          .find((s) => (s.kind === "circumstance" || s.kind === "property") && !s.supersededBy) ?? null;
    // Loop 2 (L2-D): a recorded event with a STATED non-speaker
    // actor and an object — the happening the person reported
    // about someone or something else. A person-actor qualifies
    // only when the model can name them as the person did (a
    // capitalised name surface, or a "your <relation>" label):
    // a bare role word ("cousin", "friend") means the model
    // does not actually know who acted, and leading with it
    // would fake that knowledge. The weather dummy (actor ==
    // the phenomenon itself) never qualifies.
    const thirdEvent = doing
      ? null
      : sitResult.events.find((e) => {
          if (!e.objectText) return false;
          const actorP = e.participants.find((p) => p.role === "actor");
          const actor = actorP ? entityById(session.situation, actorP.entityId) : null;
          if (!actor || actor.speaker) return false;
          if (actor.label.toLowerCase() === e.verbLemma) return false;
          // the actor must be a referent THIS TURN's contents
          // categorisation actually placed — a person, thing,
          // place or time in the breakdown. A function-word
          // mention artefact ("because", sitting in the actor
          // slot of a junk extraction like "swim very well")
          // is categorised as nothing, and never leads.
          const categorised = bd.contents
            ? [...bd.contents.people, ...bd.contents.things,
               ...bd.contents.places, ...bd.contents.times]
                .some((en) => en.referentId !== null && en.referentId === actor.referentId)
            : false;
          if (!categorised) return false;
          if (actor.kind === "person") {
            return actor.surfaces.some((s) => /^[A-Z]/.test(s)) ||
              actor.label.toLowerCase().startsWith("your ");
          }
          return true;
        }) ?? null;
    const thirdActor = thirdEvent
      ? entityById(session.situation,
          thirdEvent.participants.find((p) => p.role === "actor")!.entityId)
      : null;
    if (doing) {
      text = renderEventLead(doing.verb, doing.action, doing.timeText, doing.mode, doing.intentMarker);
      grounded = true; // grounded in the conversation's own record
      if (fact && factAboutEvent) {
        addConclusions(ws, [fact]);
        noteStep(ws, "solve", "conclude", "statement fact about the event itself", [edgeText(g, fact.edge)]);
        text += ` ${renderConclusion(g, fact)}`;
      }
    } else if (thirdEvent && thirdActor) {
      // Loop 2 (L2-D): the reply leads with the reported
      // happening — the person told us what someone is doing,
      // and the reply is about that, not about a filing on
      // one of its nouns. The topic fact is dropped, as in
      // the L2-A/L2-C leads.
      text = renderEventLeadFor(thirdActor.label, thirdEvent.verb, thirdEvent.action, thirdEvent.timeText);
      grounded = true; // grounded in the conversation's own record
    } else if (stateLead) {
      // Loop 2 (L2-C): no doing was recorded, but the statement
      // recorded a state — the reply leads with the state as
      // reported (the situation model's own record), and the
      // topic fact is dropped the same way L2-A drops it: the
      // reply is about what the person said is so, not about
      // a filing on the weather noun.
      const ent = entityById(session.situation, stateLead.entityId);
      text = renderStateLead(ent?.label ?? null, stateLead.text, stateLead.kind);
      grounded = true; // grounded in the conversation's own record
    } else if (fact) {
      addConclusions(ws, [fact]);
      noteStep(ws, "solve", "conclude", "statement acknowledgement fact", [edgeText(g, fact.edge)]);
      text = renderConclusion(g, fact);
      grounded = true;
    } else {
      text = renderStatementNoted(g.terms[primary.id]);
    }
    // connected: the reply SAYS the connection the person
    // model found — a recorded preference whose object is the
    // statement's topic earns the continuity clause. The
    // clause is PERSON content, so it does not depend on a
    // graph fact surviving (L2-R): it appends to whatever
    // the composition produced, acknowledgement included.
    if (cls.kind === "connected") {
      const pref = connections.find(
        (c) => c.via === "object" && c.fact.kind === "preference" && c.fact.subject !== "self",
      );
      if (pref) text += ` ${renderContinuityClause(pref.fact.display, pref.fact.subject)}`;
    }
    // the role's follow-up policy decides whether the class
    // earns a follow-up, and the statement's own slot forms it
    const stance =
      cls.kind === "schmooze" ? role.followupPolicy.schmooze
      : cls.kind === "connected" ? role.followupPolicy.connected
      : role.followupPolicy.informing;
    if (stance === "follow-up") {
      // Loop 2 (L2-M): the motivation follow-up ("what made
      // you want to do that?") is never asked when a motive is
      // already on record — a motive link into this doing, or
      // a feeling the person stated earlier that is still
      // live. Asking anyway reads as not having listened.
      const speakerEnt = session.situation.entities.find((e) => e.speaker);
      const motiveOnRecord = cls.followupSlot === "doing" && (
        (sitResult.doingEvent !== null &&
          session.situation.relations.some(
            (r) => r.family === "causal" && r.to === sitResult.doingEvent!.id)) ||
        (speakerEnt !== undefined &&
          session.situation.states.some(
            (s) => s.entityId === speakerEnt.id && s.kind === "feeling" &&
              !s.supersededBy && s.turn < session.turnCount))
      );
      if (motiveOnRecord) {
        noteStep(ws, "intent", "intent",
          "follow-up suppressed: the motivation question is not asked — a motive is already on record in the situation model");
      } else {
        text += ` ${renderSchmoozeFollowup(cls.followupSlot, g.terms[primary.id])}`;
      }
    }
    // E5's appended "Noted as an event" clause is gone (Loop 2,
    // L2-A): the recorded event now LEADS the reply above
    // instead of trailing it as machinery narration.
    text += ackSuffix;
    session.lastIntent = "fact";
    return { text: text, grounded: grounded };
  }
  return null;
}
