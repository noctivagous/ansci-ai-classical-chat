/**
 * Statement-turn composition — the reply policy for STATEMENT
 * turns, extracted from the turn coordinator (Loop 2, L2-X1:
 * policy leaves turn.ts a small piece at a time, each
 * extraction behaviour-neutral; the coordinator keeps order,
 * workspace hand-offs and route arbitration, policy lives in
 * named pieces).
 *
 * The policy, in composition order: person knowledge was
 * consulted first (capture + connections, run by the
 * coordinator before this piece); the classifier judges the
 * statement's conversational intent with the graph's evidence
 * weighed in; the reply is then PLANNED from the
 * conversation's own records FIRST — the situation leads
 * (L2-A/C/D), the feeling's general pattern (L2-M3) — with
 * graph testimony admitted only as the graph-distance rule
 * allows (L2-R: a bare classification is never an utterance),
 * and the role's follow-up policy closes. A schmooze reply
 * succeeds socially with the grounded fact it can honestly
 * add PLUS the follow-up its slot licenses; zero graph facts
 * is a complete success for the class, never a decline.
 *
 * Consolidation (one writer): this piece produces conclusions
 * (via solve.addConclusions) and a StatementPlan — data only,
 * no sentences. articulate.renderStatementPlan words every
 * variant and speak() voices it, so F is the turn's only
 * speaker and this piece never imports a renderer.
 */
import type { Situation } from "./awareness";
import { edgeText, type Conclusion } from "./articulate";
import { STOPWORDS, matchEvent, type Breakdown, type ResolvedTerm } from "./discourse";
import {
  BALANCED_DISPOSITION,
  type Disposition,
} from "./disposition";
import { classifyStatement, detectLeadingPhatic, detectPhatic } from "./intent";
import { definitionCandidates, settleSense } from "./definitions";
import type { CskgGraph } from "./loader";
import { remember, type SessionState } from "./memory";
import type { CaptureResult, PersonConnection } from "./person";
import type { RolePack } from "./roles";
import { entityById, isJunkActorLabel, type SituationTurnResult } from "./situation";
import {
  FACT_REL_PRIORITY,
  addConclusions,
  bestStatementFact,
  contextFit,
  noteTriage,
  relevanceFor,
  rivalSenseExclusion,
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

/** A phatic move, in the person's own word (gap 1). */
export interface StatementPhatic {
  kind: "greeting" | "thanks" | "farewell";
  word: string;
}

/** The speaker's recorded doing the reply leads with (L2-A). */
export interface StatementDoing {
  verb: string;
  action: string;
  timeText: string | null;
  mode: "ongoing" | "intended";
  intentMarker: string | null;
}

/** A reported happening about someone else (L2-D). */
export interface StatementThirdEvent {
  actorLabel: string;
  verb: string;
  action: string;
  timeText: string | null;
}

/** A recorded state the reply leads with (L2-C). */
export interface StatementStateLead {
  label: string | null;
  text: string;
  kind: string;
}

/**
 * The statement reply's CONTENT — one branch of the composition
 * policy, as data. Conclusions already sit in the workspace
 * (added via addConclusions during composition); the
 * acknowledgement fact travels as its Conclusion so F words it.
 * No sentence lives here.
 */
export type StatementContent =
  | { kind: "phatic"; phatic: StatementPhatic }
  | { kind: "state"; feelingText: string; feelingPattern: string | null; reactionText: string | null }
  | { kind: "person-only-remember"; display: string }
  | { kind: "person-only-session" }
  | { kind: "person-only-noted"; text: string }
  | { kind: "doing"; doing: StatementDoing; fact: Conclusion | null; factAboutEvent: boolean }
  | { kind: "third-event"; third: StatementThirdEvent }
  | { kind: "state-lead"; lead: StatementStateLead }
  | { kind: "fact"; fact: Conclusion }
  | { kind: "session-ack" }
  | { kind: "noted"; termText: string }
  | { kind: "leading-only" };

/**
 * The statement-turn plan: what the reply is built from. F
 * (articulate.renderStatementPlan) words every variant; the
 * ack suffix and the connected clause ride along as data so the
 * whole reply is assembled by the one writer.
 */
export interface StatementPlan {
  content: StatementContent;
  /** the leading social clause on a mixed turn, if any */
  leading: StatementPhatic | null;
  /** the session-fact acknowledgement's displays (session-ack branch) */
  sessionAckDisplays: string[];
  /** the file write's display for the ack suffix, if any */
  rememberDisplay: string | null;
  /** the ack suffix is the bare role voice (a pattern filed, no fact) */
  roleAck: boolean;
  /** the connected clause's recorded preference, if one earned it */
  connected: { display: string; subject: string } | null;
  grounded: boolean;
}

/**
 * Compose a statement turn's plan, or null when the turn
 * carried nothing the policy could take up (no resolved
 * content, no capture) — the coordinator then declines the
 * statement as unplaced, as before.
 */
export function composeStatementReply(
  deps: StatementDeps,
): StatementPlan | null {
  const {
    g, ws, session, env, role, capture, connections, sitResult,
    bd, resolved, salient, words, sit,
  } = deps;
  // Gap 1: a phatic-only turn is taken up before anything else —
  // greeting, thanks or farewell with no other content. The
  // reply is social (their word echoed back, or the thanks
  // acknowledgement); nothing is remembered as a topic and no
  // graph claim is made. Content-bearing turns ("hi, I
  // renovated…") never match and keep their normal route.
  const phatic = detectPhatic(ws.input.toLowerCase());
  if (phatic) {
    noteStep(ws, "statement", "compose",
      `phatic-only turn (${phatic.kind}): social reply, no topic remembered, no graph testimony`);
    session.lastIntent = "statement";
    const plan: StatementPlan = {
      content: { kind: "phatic", phatic },
      leading: null,
      sessionAckDisplays: [],
      rememberDisplay: null,
      roleAck: false,
      connected: null,
      grounded: true,
    };
    ws.statementPolicy = plan;
    return plan;
  }
  // Leading social clause on a mixed turn ("thanks anyway. I'll
  // go make coffee"): taken up first, the rest keeps its route.
  const leading = detectLeadingPhatic(ws.input.toLowerCase());
  // (7) statements — E4's set order (§2, piece C's set order):
  // person knowledge was consulted first (capture +
  // connections, above); the classifier has judged the
  // statement's conversational intent with the graph's evidence
  // weighed in; the reply is planned only now — per the class,
  // the role's strategy and follow-up policy, and the operative
  // context. A schmooze reply succeeds socially with the
  // grounded fact it can honestly add PLUS the follow-up its
  // slot licenses; zero graph facts is a complete success for
  // the class, never a decline.
  if (resolved.length || capture.feeling || capture.doing || capture.newPerson || capture.factsWritten.length || capture.sessionKept.length) {
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
    const sessionAckDisplays =
      !capture.factsWritten.length && capture.sessionKept.length
        ? capture.sessionKept.map((f) => f.display)
        : [];
    const rememberDisplay = capture.factsWritten.length
      ? capture.factsWritten[0].display
      : null;
    const roleAck = !capture.factsWritten.length && capture.patternsWritten.length > 0;
    const base = { leading, sessionAckDisplays, rememberDisplay, roleAck };

    // a stated feeling: the reply is drawn from the canonical
    // state record — ATOMIC consulted FROM the record (§5)
    if (cls.kind === "state" && capture.feeling) {
      // the disposition's pattern-speech assumption (§11):
      // "silent" holds the general pattern back entirely — the
      // state is still taken up and acknowledged as stated.
      // The default ("ready") is the standing behaviour: the
      // sayability gate inside solveStateReaction decides.
      const disp0: Disposition = ws.disposition ?? BALANCED_DISPOSITION;
      const reactionText = disp0.patternSpeech === "ready"
        ? solveStateReaction(g, ws, capture.feeling.canonical)
        : null;
      if (disp0.patternSpeech !== "ready") {
        noteStep(ws, "disposition", "intent",
          "the feeling's general pattern is not spoken: the disposition's pattern speech is silent — the state stands as captured");
      }
      session.lastIntent = "fact";
      const plan: StatementPlan = {
        content: {
          kind: "state",
          feelingText: capture.feeling.text,
          feelingPattern: capture.feeling.pattern,
          reactionText,
        },
        ...base,
        connected: null,
        grounded: reactionText !== null,
      };
      ws.statementPolicy = plan;
      return plan;
    }

    if (!primary) {
      // nothing resolved, but the statement still landed —
      // as person data (a name, a fact for the file or session)
      let content: StatementContent;
      let grounded: boolean;
      if (capture.factsWritten.length) {
        content = { kind: "person-only-remember", display: capture.factsWritten[0].display };
        grounded = false;
      } else if (sessionAckDisplays.length) {
        content = { kind: "person-only-session" };
        grounded = true;
      } else {
        content = { kind: "person-only-noted", text: capture.doing ?? capture.newPerson ?? "that" };
        grounded = false;
      }
      session.lastIntent = "fact";
      const plan: StatementPlan = {
        content,
        ...base,
        connected: null,
        grounded,
      };
      ws.statementPolicy = plan;
      return plan;
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
    // The resolver over the referent, on statements too: when
    // the acknowledgement fact's subject carries rival senses,
    // the conversation settles the reading — recorded as ground
    // 1, exactly as corrections do — and a fact testifying for
    // a RIVAL sense is suppressed, with the ground traced. The
    // jacket/coat class on statement turns: the garment reading
    // the conversation supports beats the cover reading.
    if (fact) {
      const subjectId = fact.about === "from" ? fact.edge.from : fact.edge.to;
      const subjectText = g.terms[subjectId] ?? "";
      if (definitionCandidates(g, subjectText).length > 1) {
        const reading = settleSense(
          g, subjectText, [...turnContextIds(g, ws), subjectId], contextFit,
          {
            historyKey: session.settledSenses[subjectText] ?? null,
            stakes: "statement",
            disposition: role.clarificationDisposition,
            asksUsed: session.clarificationsAsked,
            askedLastTurn: session.lastTurnWasAsk,
            turnText: ws.input,
          },
        );
        if (reading) {
          // statements never ask back: answer with the verdict's
          // key (falling back to the score leader), silently —
          // the reply is not about the sense choice, so unlike a
          // definition answer it names nothing.
          const synsetId = reading.verdict?.key ?? reading.choice.chosen.synsetId;
          session.settledSenses[subjectText] = synsetId;
          const ground = reading.verdict
            ? `resolver over ${reading.choice.rivals.length} senses: ${reading.verdict.reason} → ${reading.verdict.action}`
            : `single sense (${reading.choice.chosen.synsetId}) — nothing to arbitrate`;
          const exclusion = rivalSenseExclusion(g, subjectId, subjectText, synsetId, fact);
          if (exclusion) {
            noteStep(ws, "solve", "conclude",
              `statement fact suppressed (sense arbitration, ${ground}): "${edgeText(g, fact.edge)}" testifies for ${exclusion} — acknowledgement only`);
            fact = null;
          } else {
            noteStep(ws, "solve", "query",
              `statement sense settled ("${subjectText}" → ${synsetId}, ${ground}) — the acknowledgement fact stands in the settled sense's world`);
          }
        }
      }
    }
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
          // junk actors the scan matched as vocabulary, not
          // referents ("i think", "should"): the scan's own
          // discipline refuses them as actors, and the lead
          // refuses them as subjects — a lead must name
          // someone, not scaffolding.
          if (isJunkActorLabel(actor.label)) return false;
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
    let content: StatementContent;
    let grounded = false;
    if (doing) {
      if (fact && factAboutEvent) {
        addConclusions(ws, [fact]);
        noteStep(ws, "solve", "conclude", "statement fact about the event itself", [edgeText(g, fact.edge)]);
      }
      content = {
        kind: "doing",
        doing: {
          verb: doing.verb,
          action: doing.action,
          timeText: doing.timeText,
          mode: doing.mode,
          intentMarker: doing.intentMarker,
        },
        // grounded in the conversation's own record; the
        // acknowledgement fact rides along only when it is
        // about the event term itself
        fact: factAboutEvent ? fact : null,
        factAboutEvent,
      };
      grounded = true;
    } else if (thirdEvent && thirdActor) {
      // Loop 2 (L2-D): the reply leads with the reported
      // happening — the person told us what someone is doing,
      // and the reply is about that, not about a filing on one
      // of its nouns. The topic fact is dropped, as in the
      // L2-A/L2-C leads.
      content = {
        kind: "third-event",
        third: {
          actorLabel: thirdActor.label,
          verb: thirdEvent.verb,
          action: thirdEvent.action,
          timeText: thirdEvent.timeText,
        },
      };
      grounded = true;
    } else if (stateLead) {
      // Loop 2 (L2-C): no doing was recorded, but the statement
      // recorded a state — the reply leads with the state as
      // reported (the situation model's own record), and the
      // topic fact is dropped the same way L2-A drops it: the
      // reply is about what the person said is so, not about
      // a filing on the weather noun.
      const ent = entityById(session.situation, stateLead.entityId);
      content = {
        kind: "state-lead",
        lead: { label: ent?.label ?? null, text: stateLead.text, kind: stateLead.kind },
      };
      grounded = true;
    } else if (fact) {
      addConclusions(ws, [fact]);
      noteStep(ws, "solve", "conclude", "statement acknowledgement fact", [edgeText(g, fact.edge)]);
      content = { kind: "fact", fact };
      grounded = true;
    } else if (sessionAckDisplays.length) {
      content = { kind: "session-ack" };
      grounded = true;
    } else {
      content = { kind: "noted", termText: g.terms[primary.id] };
    }
    // connected: the reply SAYS the connection the person
    // model found — a recorded preference whose object is the
    // statement's topic earns the continuity clause. The
    // clause is PERSON content, so it does not depend on a
    // graph fact surviving (L2-R): it appends to whatever
    // the composition produced, acknowledgement included.
    let connected: StatementPlan["connected"] = null;
    if (cls.kind === "connected") {
      const pref = connections.find(
        (c) => c.via === "object" && c.fact.kind === "preference" && c.fact.subject !== "self",
      );
      if (pref) connected = { display: pref.fact.display, subject: pref.fact.subject };
    }
    // Template removal (round 3, T1+T2): the follow-up
    // apparatus that once stood here is REMOVED entire — the
    // valued-gap question (the disposition's fact inventory
    // generating "How old is your sister? And you?") and the
    // schmooze slot forms ("And what made you want to do
    // that?", "Have you met them yet?", "Tell me more about
    // the X."), together with the role stance, the L2-Q licence
    // gates and the L2-M motive check that existed only to
    // govern them. Fixed forms with slot-filling decide what
    // to say from a script; under §11 a question is a
    // conclusion of the processing or it is not spoken. A
    // statement reply now simply responds: what the composition
    // above produced is the whole reply.
    // E5's appended "Noted as an event" clause is gone (Loop 2,
    // L2-A): the recorded event now LEADS the reply above
    // instead of trailing it as machinery narration.
    //
    // The adaptive offer (S8, Item 6) fires at render time:
    // the plan is fresh this turn, its timing genuinely open,
    // the frame willing to ask, the role an offering one — F's
    // gate reads the plan's doing against the disposition and
    // role, so the question concludes from the model's own
    // record, never from a slot.
    session.lastIntent = "fact";
    const plan: StatementPlan = {
      content,
      ...base,
      connected,
      grounded,
    };
    ws.statementPolicy = plan;
    return plan;
  }
  // The turn carried nothing the policy could take up, but the
  // social clause still stands on its own — taken up alone.
  if (leading) {
    const plan: StatementPlan = {
      content: { kind: "leading-only" },
      leading,
      sessionAckDisplays: [],
      rememberDisplay: null,
      roleAck: false,
      connected: null,
      grounded: true,
    };
    ws.statementPolicy = plan;
    return plan;
  }
  return null;
}
