/**
 * turn.ts — the turn coordinator (design §2, §3).
 *
 * Runs one turn through the pieces, in the proposal's order:
 *   1. awareness loads (situation, person);
 *   2. memory supplies its standing context;
 *   3. the conversational early moves — replay and correction are
 *      memory's, questions about the situated self are awareness's
 *      (C classifies, F words the answers);
 *   4. discourse analyses the turn (the breakdown);
 *   5. intent classifies the objective; solve works — retrieval,
 *      solving, or a combination; articulation speaks;
 *   6. memory commits the turn's trace to the ring.
 *
 * The coordinator holds no conversational logic of its own: every
 * decision is a piece's function, every workspace field is written
 * by its owner, and every trace step cites the piece that acted.
 * The cascade's ORDER and its outcomes are the spike's, preserved
 * verbatim by the E1 restructure — E1 changes the structure, not
 * the behaviour (judged per §8 on the evaluation transcripts).
 *
 * E3 changes three outcomes, all inside solve's remit: the tool
 * branch runs the §6 set operations (exclusions applied as a
 * difference, fallback disclosed, conclusions about the tool
 * itself); the why branch takes solve's decline verdict and words
 * it as a named missing causation rather than a generic no-fact;
 * and "what happens" questions route to event-consequence content
 * before the ATOMIC reaction path. Every branch that reaches
 * solve records the turn's triage (retrieve | solve |
 * combination) in the trace.
 */
import { loadAwarenessInto } from "./awareness";
import {
  edgeText,
  renderAll,
  renderConclusion,
  renderCorrectionFact,
  renderCorrectionNoFact,
  renderCorrectionUnplaced,
  renderDeclineUnplaced,
  renderNoFact,
  renderSituationAnswer,
  renderStatementNoted,
  renderToolAnswer,
  renderToolDecline,
  renderToolFallbackNote,
  renderUnrelated,
  renderWhyNoCause,
  renderWhyNoTopic,
  speak,
} from "./articulate";
import {
  analyseInto,
  contentCandidates,
  matchEvent,
  pickSalient,
  resolveTerms,
  STOPWORDS,
} from "./discourse";
import {
  assignIntent,
  classifySurface,
  detectCorrection,
  detectFollowup,
  detectReplay,
  detectSituationQuestion,
  detectToolQuery,
  eventQuestionKind,
  hasRelatedPattern,
  hasWhyPattern,
  isBareWhy,
  isQuestionForm,
  type IntentKind,
} from "./intent";
import type { CskgGraph } from "./loader";
import {
  commitTrace,
  currentTopicId,
  remember,
  replayAnswer,
  supplyContextInto,
  type SessionState,
} from "./memory";
import {
  addConclusions,
  answerRelated,
  answerWhy,
  answerWhyQuestion,
  bestStatementFact,
  FACT_REL_PRIORITY,
  findTools,
  noteTriage,
  pickFact,
  solveEventConsequence,
  solveEventReaction,
  solveGenericFact,
  solveSurfaceIntent,
  topConclusions,
  turnContextIds,
} from "./solve";
import {
  createWorkspace,
  noteStep,
  type ThoughtTrace,
  type TurnWorkspace,
} from "./workspace";

export interface TurnResult {
  text: string;
  trace: ThoughtTrace;
  grounded: boolean;
}

export function runTurn(
  g: CskgGraph,
  session: SessionState,
  input: string,
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date(),
): TurnResult {
  session.turnCount++;
  const ws: TurnWorkspace = createWorkspace(session.turnCount, input);

  // 1 — awareness loads: the situated self, and who is talking.
  loadAwarenessInto(ws, now, env);
  const sit = ws.situation!;
  noteStep(ws, "awareness", "situate",
    `${sit.daypart}; season: ${sit.season ?? "unknown"}; place: ` +
    (sit.place ? `${sit.place.name} (${sit.place.hemisphere ?? "hemisphere unknown"})` : "unset"));

  // 2 — memory's standing context for this turn.
  supplyContextInto(ws, session);

  const finish = (text: string, intent: IntentKind, grounded: boolean): TurnResult => {
    assignIntent(ws, intent);
    speak(ws, text);
    // Depth pass: the trace records which rendering path each
    // spoken conclusion took — the sentence bank (S9) or the
    // relation template. renderConclusion marks the conclusions
    // it actually rendered; unrendered conclusions stay unmarked.
    const rendered = ws.conclusions.filter((c) => c.via);
    if (rendered.length) {
      noteStep(ws, "articulate", "conclude",
        `render paths: ${rendered.map((c) => `${edgeText(g, c.edge)} via ${c.via}`).join("; ")}`);
    }
    ws.trace.intent = intent;
    ws.trace.answer = text;
    commitTrace(session, ws.trace);
    return { text, trace: ws.trace, grounded };
  };

  const lower = input.trim().toLowerCase();

  // (0) replay: "why did you say that?" — stored trace, no re-query
  if (detectReplay(lower)) {
    noteStep(ws, "memory", "replay", "replaying previous trace; graph not re-queried");
    const r = replayAnswer(g, session);
    return finish(r.text, "replay", r.grounded);
  }

  // (1) correction: "no, I meant the illness"
  const corr = detectCorrection(lower);
  if (corr) {
    noteStep(ws, "memory", "correct", `user correction → "${corr.phrase}"`);
    const fixed = resolveTerms(g, corr.phrase);
    if (fixed.length) {
      const term = fixed[fixed.length - 1];
      remember(session, term.id);
      noteStep(ws, "discourse", "resolve", `re-resolved: ${term.text}`);
      noteTriage(ws, "retrieve", "fact about the corrected term");
      const fact = pickFact(g, term.id, sit, FACT_REL_PRIORITY, ws.activeContext?.topics ?? []);
      if (fact) {
        addConclusions(ws, [fact]);
        noteStep(ws, "solve", "conclude", "answered about the corrected term", [edgeText(g, fact.edge)]);
        return finish(renderCorrectionFact(g.terms[term.id], renderConclusion(g, fact)), "correction", true);
      }
      return finish(renderCorrectionNoFact(g.terms[term.id]), "correction", false);
    }
    return finish(renderCorrectionUnplaced(corr.phrase), "correction", false);
  }

  // (2) questions about the situated self
  const sitQ = detectSituationQuestion(lower);
  if (sitQ) {
    return finish(renderSituationAnswer(sitQ, sit), "situation", true);
  }

  // (3) discourse analyses the turn — B notes its own trace steps
  // (one per mention, plus the topic ranking) inside analyseInto.
  analyseInto(ws, g);
  const bd = ws.breakdown!;
  const resolved = bd.terms;
  const words = bd.words;

  // helpers ------------------------------------------------------------
  const declineUnplaced = (intent: IntentKind): TurnResult => {
    const unplaced = words.filter(
      (w) => w.length > 2 && !STOPWORDS.has(w) &&
        !resolved.some((r) => r.text.split(" ").includes(w)),
    );
    noteStep(ws, "discourse", "decline", `unplaced: ${unplaced.join(", ") || "(none)"}`);
    return finish(renderDeclineUnplaced(unplaced), intent, false);
  };
  const noFact = (termText: string, intent: IntentKind): TurnResult => {
    noteStep(ws, "solve", "decline", `no usable edges for "${termText}"`);
    return finish(renderNoFact(termText), intent, false);
  };

  // (4) "what about X?" follow-up
  const followup = detectFollowup(lower);
  if (followup) {
    const cand = resolveTerms(g, followup.query);
    if (cand.length) {
      const term = cand[cand.length - 1];
      remember(session, term.id);
      noteStep(ws, "intent", "intent", `follow-up topic: ${term.text}; reusing intent ${session.lastIntent}`);
      noteTriage(ws, "retrieve", "fact about the follow-up topic, judged against the conversation's contents");
      const fact = pickFact(g, term.id, sit, FACT_REL_PRIORITY, turnContextIds(g, ws));
      if (fact) {
        addConclusions(ws, [fact]);
        return finish(renderConclusion(g, fact), "followup", true);
      }
      return noFact(term.text, "followup");
    }
    return declineUnplaced("followup");
  }

  // (5) bare "why?" — apply to the current topic
  if (isBareWhy(lower)) {
    const t = currentTopicId(session);
    if (t === undefined) return finish(renderWhyNoTopic(), "why", false);
    const cause = answerWhy(g, ws, t);
    if (cause) {
      noteTriage(ws, "retrieve", "the current topic's own causal edges");
      return finish(cause, "why", true);
    }
    return noFact(g.terms[t], "why");
  }

  const isQuestion = isQuestionForm(lower);
  const salient = pickSalient(g, resolved);

  // (6) tool-finding: "what can I open a wine bottle with?" — a
  // problem, solved with set operations (§6): the strict UsedFor
  // set, DIFFERENCE for stated exclusions, the disclosed fallback
  // only when the strict set is empty.
  const tool = detectToolQuery(lower);
  if (tool) {
    const excludedIds = new Set<number>();
    const excludedLabels = new Set<string>();
    for (const phrase of tool.exclusions) {
      excludedLabels.add(phrase);
      for (const r of resolveTerms(g, phrase)) {
        excludedIds.add(r.id);
        excludedLabels.add(g.terms[r.id]);
      }
    }
    const search = findTools(g, tool.target, tool.verb, excludedIds, excludedLabels);
    noteTriage(ws,
      search.route === "fallback" ? "combination" : "solve",
      `tool problem: UsedFor set for "${tool.target}"` +
        (tool.exclusions.length
          ? `; difference: − {${tool.exclusions.join(", ")}} (strict set ${search.directBeforeExclusion} → ${search.directAfterExclusion})`
          : "") +
        `; route: ${search.route}`);
    if (search.hits.length) {
      // conclusions are about the TOOL (the edge's source): the old
      // "to" citation named the tool's neighbour instead of the
      // tool's own edge — half of the corkscrew garble.
      addConclusions(ws, search.hits.map((h) => ({ edge: h.edge, about: "from" as const })));
      for (const c of ws.conclusions) {
        noteStep(ws, "solve", "conclude", "tool candidate", [edgeText(g, c.edge)]);
      }
      const tools = search.hits.map((h) => h.toolText);
      let text = renderToolAnswer(tools, renderAll(g, ws.conclusions.slice(0, 1)));
      if (search.route === "fallback") text += " " + renderToolFallbackNote(search.hits.length);
      return finish(text, "tool", true);
    }
    return finish(
      renderToolDecline(tool.isOpen ? `opening ${tool.target}` : tool.target),
      "tool", false,
    );
  }

  if (isQuestion && resolved.length) {
    // E2: subject selection consumes discourse's scored topic
    // ranking; E1's ordering survives as the fallback.
    const candidates = bd.topics.length ? bd.topics : contentCandidates(g, resolved);
    const primary = candidates[0] ?? salient!;
    remember(session, primary.id);

    // relatedness between two terms
    if (hasRelatedPattern(lower) && candidates.length >= 2) {
      const a = candidates[0];
      const b = candidates[1];
      const ans = answerRelated(g, ws, a.id, b.id);
      noteTriage(ws, "retrieve", "direct edge or shared neighbour between two mentioned terms");
      return finish(ans ?? renderUnrelated(g.terms[a.id], g.terms[b.id]), "related", ws.conclusions.length > 0);
    }

    // why-questions over causes / effects — the empty-set decline
    // rule (§6): an empty causal set declines, naming the missing
    // causation, instead of borrowing a neighbouring word's edges.
    if (hasWhyPattern(lower)) {
      const res = answerWhyQuestion(g, ws, resolved);
      if (res.kind === "answer") {
        noteTriage(ws,
          res.chained ? "combination" : "retrieve",
          res.chained
            ? "causal chain through the stated cause (two traced steps)"
            : "the subject's own causal edges");
        session.lastIntent = "why";
        return finish(res.text, "why", true);
      }
      noteTriage(ws, "retrieve", "the causal set for the asked relation is empty — decline, no substitution");
      return finish(renderWhyNoCause(res.effectText, res.causeText), "why", false);
    }

    // feelings / what-happens / wants / needs / intentions. "What
    // happens when X?" is triaged as an EVENT-CONSEQUENCE
    // question (§6, E3): the subject is the event node and the
    // expected content is its consequence edges — solve
    // re-selects the subject from all rival candidates, since
    // discourse's better-attested referent ("rain") carries no
    // event content where "rains" does. The depth pass adds the
    // TEMPLATE paths: a paraphrased event the question names
    // ("lose their keys", "can't sleep") is matched to ATOMIC's
    // PersonX template keys by lemma overlap, and the asked
    // family (feel/react/want/need/intent) is answered from the
    // matched event's own at: edges. Both template paths run
    // only where the E3 paths found nothing, or (a strong match
    // in solveEventConsequence) where they plainly should lead.
    const evKind = eventQuestionKind(lower);
    if (evKind) {
      if (evKind === "happens") {
        const cons = solveEventConsequence(g, ws);
        if (cons) {
          noteTriage(ws, "retrieve", "event-consequence: the event node's consequence/involvement edges");
          session.lastIntent = "feel";
          return finish(cons, "feel", true);
        }
      }
      if (evKind === "happens" || evKind === "feel" || evKind === "react") {
        const ev = matchEvent(g, words, resolved);
        if (ev) {
          const cs = [
            ...topConclusions(g, ev.id, "at:xReact", "out", 1),
            ...topConclusions(g, ev.id, "at:oReact", "out", 1),
            ...topConclusions(g, ev.id, "at:xEffect", "out", 1),
          ];
          if (cs.length) {
            addConclusions(ws, cs);
            noteTriage(ws, "retrieve", "reactions/effects of the matched ATOMIC event");
            session.lastIntent = "feel";
            return finish(renderAll(g, cs), "feel", true);
          }
        }
      }
      const templ = solveEventReaction(
        g, ws, session, evKind === "happens" ? "feel" : evKind,
      );
      if (templ) {
        noteTriage(ws, "retrieve",
          `${evKind} of the template-matched ATOMIC event (paraphrase keying)`);
        session.lastIntent = "feel";
        return finish(templ, "feel", true);
      }
    }

    // the classified question intents: C classified, E executes
    const kind = classifySurface(lower);
    if (kind) {
      const r = solveSurfaceIntent(g, ws, session, kind, candidates);
      if (r) {
        noteTriage(ws, "retrieve", `${kind} lookup over the subject's edges, ranked with the §6 floor`);
        return finish(r, kind, true);
      }
    }

    // generic question: best fact about the first candidate that has one
    const generic = solveGenericFact(g, ws, session, candidates);
    if (generic) {
      noteTriage(ws, "retrieve", "best grounded fact about the subject");
      return finish(generic, "fact", true);
    }
    return noFact(primary.text, "fact");
  }

  if (isQuestion && !resolved.length) {
    // pronouns may still reach the session topic
    const t = currentTopicId(session);
    if (t !== undefined && /\b(it|that|this|they|them)\b/.test(lower)) {
      const fact = pickFact(g, t, sit);
      if (fact) {
        addConclusions(ws, [fact]);
        return finish(renderConclusion(g, fact), "fact", true);
      }
    }
    return declineUnplaced("question");
  }

  // (7) statements: grounded acknowledgement, never a flat decline
  if (resolved.length) {
    const ev = matchEvent(g, words, resolved);
    const primary = ev ?? bd.topics[0] ?? salient!;
    remember(session, primary.id);
    // E2: memory's active set is fed by the scored topics (the
    // best few that scored as topical), not by every resolved
    // fragment — "third" no longer becomes a conversation topic.
    for (const t of bd.topics.slice(0, 4)) {
      if (t.score >= 0) remember(session, t.id);
    }
    noteStep(ws, "intent", "intent", ev ? `statement; ATOMIC event match: ${ev.text}` : "statement");
    noteTriage(ws, "retrieve", "grounded acknowledgement fact; within-node choice judged against the turn's contents");
    const factRels = ev
      ? ["at:xEffect", "at:xReact", "at:xWant", "at:oReact", "/r/IsA", "/r/HasProperty"]
      : FACT_REL_PRIORITY;
    const fact = bestStatementFact(g, sit, ev, resolved, primary, factRels, bd.topics, turnContextIds(g, ws));
    if (fact) {
      addConclusions(ws, [fact]);
      noteStep(ws, "solve", "conclude", "statement acknowledgement fact", [edgeText(g, fact.edge)]);
      session.lastIntent = "fact";
      return finish(renderConclusion(g, fact), "statement", true);
    }
    return finish(renderStatementNoted(g.terms[primary.id]), "statement", false);
  }

  return declineUnplaced("statement");
}
