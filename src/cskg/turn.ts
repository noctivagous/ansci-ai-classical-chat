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
 *
 * Trace-file step (2026-11-09): a turn may opt into the graph
 * query log (collectQueries) — the coordinator lends the graph a
 * sink feeding the workspace's query list and detaches it in
 * finish(). The list rides out on TurnResult for the CLI's trace
 * file (tracefile.ts); no piece reads it, so a traced turn is a
 * byte-identical turn.
 *
 * E4 (the conversation frame): awareness loads role + person;
 * the Context module composes the operative context before
 * analysis; a pending clarification resolves before new
 * analysis; explicit remembers and person recall are memory's
 * early moves; statement turns run the set order (capture →
 * connections → classify with graph evidence → formulate per
 * role); definition-shaped questions run through the
 * AmbiguityResolver (study → organise → plan → consult →
 * examine, in that trace order); decline wording is the role's
 * style, decline honesty is not.
 */
import { loadAwarenessInto } from "./awareness";
import {
  edgeText,
  renderAll,
  renderClarificationAsk,
  renderConclusion,
  renderContinuityClause,
  renderCorrectionFact,
  renderCorrectionNoFact,
  renderCorrectionUnplaced,
  renderDeclineUnplaced,
  renderDeclineUnplacedPlain,
  renderDefinition,
  renderNamedReading,
  renderNoFact,
  renderNoFactPlain,
  renderRecall,
  renderRecallGeneral,
  renderRememberAck,
  renderRememberSessionOnly,
  renderSchmoozeFollowup,
  renderSituationAnswer,
  renderStateNoted,
  renderStatementNoted,
  renderToolAnswer,
  renderToolDecline,
  renderToolDeclinePlain,
  renderToolFallbackNote,
  renderUnrelated,
  renderWhyNoCause,
  renderWhyNoCausePlain,
  renderWhyNoTopic,
  speak,
} from "./articulate";
import { composeContextInto } from "./context";
import {
  chooseDefinition,
  definitionForSynset,
  definitionTraceNote,
  everydaySynsetId,
  senseClusterLabel,
} from "./definitions";
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
  classifyStatement,
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
  isDefinitionQuestion,
  isQuestionForm,
  type IntentKind,
} from "./intent";
import type { CskgGraph, QueryRecord } from "./loader";
import {
  commitTrace,
  currentTopicId,
  remember,
  replayAnswer,
  supplyContextInto,
  type PendingClarification,
  type SessionState,
} from "./memory";
import {
  activeFacts,
  captureExplicit,
  captureStatement,
  loadPersonData,
  personConnections,
  type CaptureResult,
} from "./person";
import { clusterEvidenceIds, filingClusters } from "./everydaysense";
import { resolveRivalReadings } from "./resolver";
import {
  addConclusions,
  answerRelated,
  answerWhy,
  answerWhyQuestion,
  bestStatementFact,
  contextFit,
  FACT_REL_PRIORITY,
  findTools,
  noteTriage,
  pickFact,
  relevanceFor,
  solveDefinitionAnswer,
  solveEventConsequence,
  solveEventReaction,
  solveGenericFact,
  solveStateReaction,
  solveSurfaceIntent,
  topConclusions,
  turnContextIds,
} from "./solve";
import { admissionFor, standingTrace } from "./standing";
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
  /**
   * The turn's graph queries, in issue order — populated only
   * when the turn opted into the query log (collectQueries);
   * empty otherwise. Write-only observation for the trace file.
   */
  queries: QueryRecord[];
  /** The session's configured place name, or null (trace files). */
  location: string | null;
}

export function runTurn(
  g: CskgGraph,
  session: SessionState,
  input: string,
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date(),
  collectQueries = false,
): TurnResult {
  session.turnCount++;
  const ws: TurnWorkspace = createWorkspace(session.turnCount, input);

  // Query log (trace files): opt-in and passive. When asked, the
  // turn lends the graph a sink that appends to the workspace's
  // query list; finish() detaches it. Nothing reads the list
  // during the turn, so recording cannot affect the reply. The
  // unconditional assignment also clears any sink a faulted
  // earlier turn might have left installed.
  g.querySink = collectQueries ? (rec) => { ws.queries.push(rec); } : null;

  // 1 — awareness loads the FRAME: the situated self, who is
  // talking, and who the chat is (the role pack).
  loadAwarenessInto(ws, now, env);
  const sit = ws.situation!;
  const role = ws.role!;
  noteStep(ws, "awareness", "situate",
    `${sit.daypart}; season: ${sit.season ?? "unknown"}; place: ` +
    (sit.place ? `${sit.place.name} (${sit.place.hemisphere ?? "hemisphere unknown"})` : "unset") +
    `; role: ${role.id} (${role.statementStrategy}); person: ` +
    (ws.person?.kind === "known" ? ws.person.name : "general"));

  // 2 — memory's standing context for this turn.
  supplyContextInto(ws, session);

  // The person file loads here (named person only; general
  // mode loads and writes nothing). The Context module's
  // composition itself runs after the replay early move below:
  // a replay by design re-queries NOTHING, and composition's
  // facet resolutions are graph queries — they belong to turns
  // that analyse, not to turns that recite.
  const personData = loadPersonData(env);

  const finish = (text: string, intent: IntentKind, grounded: boolean): TurnResult => {
    g.querySink = null; // the turn's last act of recording is over
    // the interruption budget's memory: only a clarification
    // ask leaves this set (the resolver's never-two-in-a-row).
    session.lastTurnWasAsk = intent === "clarification";
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
    return {
      text,
      trace: ws.trace,
      grounded,
      queries: ws.queries,
      location: sit.place ? sit.place.name : null,
    };
  };

  const lower = input.trim().toLowerCase();

  // (0) replay: "why did you say that?" — stored trace, no re-query
  if (detectReplay(lower)) {
    noteStep(ws, "memory", "replay", "replaying previous trace; graph not re-queried");
    const r = replayAnswer(g, session);
    return finish(r.text, "replay", r.grounded);
  }

  // 2b — E4: the Context module composes the frame + memory
  // into the OPERATIVE CONTEXT the rest of the turn is analysed
  // under (context.ts; G5's relocation — B, C and E read
  // ws.context from here on).
  composeContextInto(ws, session, g, personData);

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
      // Definitions slice: a correction SETTLES the sense — when
      // the corrected term has a WordNet gloss, the reply gives
      // that sense's definition in place of a neighbourhood fact
      // ("No, I meant the common cold" → the illness gloss, the
      // "Got it —" acknowledgement unchanged). No gloss → the
      // fact path below, exactly as before.
      const choice = chooseDefinition(
        g, g.terms[term.id], [...turnContextIds(g, ws), term.id], contextFit,
      );
      if (choice) {
        // E4: the settled sense goes on record — the resolver's
        // ground 1 (what the person said) for later turns.
        session.settledSenses[g.terms[term.id]] = choice.chosen.synsetId;
        noteStep(ws, "solve", "query", definitionTraceNote(choice));
        return finish(
          renderCorrectionFact(
            g.terms[term.id],
            renderDefinition(g.terms[term.id], choice.chosen.gloss),
          ),
          "correction",
          true,
        );
      }
      const fact = pickFact(g, term.id, sit, FACT_REL_PRIORITY, turnContextIds(g, ws), relevanceFor(ws));
      if (fact) {
        addConclusions(ws, [fact]);
        noteStep(ws, "solve", "conclude", "answered about the corrected term", [edgeText(g, fact.edge)]);
        return finish(renderCorrectionFact(g.terms[term.id], renderConclusion(g, fact)), "correction", true);
      }
      return finish(renderCorrectionNoFact(g.terms[term.id]), "correction", false);
    }
    return finish(renderCorrectionUnplaced(corr.phrase), "correction", false);
  }

  // (1b) E4 — a pending clarification resolves BEFORE any new
  // analysis (§5): the branches were pre-mapped when the ask
  // was made, so an ordinal or a branch's own words select the
  // reading and the ORIGINAL question is answered under it.
  // An input that answers nothing clears the pending state and
  // proceeds as a fresh turn — the ask is spent either way.
  const pending: PendingClarification | null = session.pendingClarification;
  if (pending) {
    session.pendingClarification = null;
    const ord = lower.match(/\b(first|second|third|fourth)\b/);
    const ordIdx = ord ? ["first", "second", "third", "fourth"].indexOf(ord[1]) : -1;
    let branchIdx = ordIdx >= 0 && ordIdx < pending.branches.length ? ordIdx : -1;
    if (branchIdx < 0) {
      const inputWords = new Set(lower.split(/[^a-z']+/).filter((w) => w.length > 2));
      let bestHits = 0;
      pending.branches.forEach((b, i) => {
        const hits = (b.matchWords ?? []).filter((w) => inputWords.has(w)).length;
        if (hits > bestHits) {
          bestHits = hits;
          branchIdx = i;
        }
      });
      if (bestHits === 0) branchIdx = -1;
    }
    if (branchIdx < 0) {
      // category naming: a reply word that resolves to a graph
      // id inside one branch's footprint (its cluster + IsA
      // ancestors) selects that branch — "the animal one"
      let bestHits = 0;
      pending.branches.forEach((b, i) => {
        if (!b.matchIds?.length) return;
        let hits = 0;
        for (const w of lower.split(/[^a-z']+/).filter((x) => x.length > 2)) {
          const id = g.id(w);
          if (id !== undefined && b.matchIds.includes(id)) hits++;
        }
        if (hits > bestHits) {
          bestHits = hits;
          branchIdx = i;
        }
      });
      if (bestHits === 0) branchIdx = -1;
    }
    if (branchIdx >= 0) {
      const branch = pending.branches[branchIdx];
      noteStep(ws, "resolver", "resolve",
        `pending clarification resolved before new analysis: "${pending.termText}" → branch "${branch.label}"`);
      if (pending.kind === "definition" && branch.synsetId) {
        session.settledSenses[pending.termText] = branch.synsetId;
        const termId = g.id(pending.termText);
        if (termId !== undefined) {
          const ans = solveDefinitionAnswer(
            g, ws, session,
            { id: termId, text: pending.termText, start: 0, words: pending.termText.split(" ").length },
            branch.synsetId,
          );
          if (ans) return finish(ans, "clarification", true);
        }
        const gloss = definitionForSynset(g, pending.termText, branch.synsetId);
        if (gloss) return finish(renderDefinition(pending.termText, gloss.gloss), "clarification", true);
      }
      return finish(`Understood — ${branch.label}.`, "clarification", false);
    }
    noteStep(ws, "resolver", "resolve",
      `the pending clarification ("${pending.termText}") was not answered by this turn — cleared; new analysis proceeds`);
  }

  // (1c) E4 — an explicit "remember that…": the write
  // discipline's second door (§5). Named person → the file,
  // acknowledged; general mode → a session note and an honest
  // word about its reach.
  const remM = lower.match(/^(?:please\s+)?remember that\s+(.+?)[.!?]?$/);
  if (remM) {
    const stated = input.trim().replace(/^(?:please\s+)?remember that\s+/i, "").replace(/[.!?]+$/, "");
    if (personData) {
      const res = captureExplicit(stated, env);
      noteStep(ws, "memory", "remember",
        `explicit remember: "${stated}" → ${res.fact ? `written to the person file: ${res.fact.display}` : "nothing written"}`);
      if (res.fact) return finish(renderRememberAck(role.memoryAck, res.fact.display), "memory", true);
      return finish(role.memoryAck, "memory", false);
    }
    session.sessionNotes.push(stated);
    noteStep(ws, "memory", "remember",
      `explicit remember in general mode: "${stated}" held as a session note only — nothing persists`);
    return finish(renderRememberSessionOnly(), "memory", false);
  }

  // (1d) E4 — person recall: "what do you remember about me?"
  // reads the file back. General mode's answer is honest:
  // nothing is stored.
  if (/\bwhat do you (?:remember|know) about me\b|\bdo you remember me\b|\bwhat have i told you\b/.test(lower)) {
    if (personData) {
      const facts = activeFacts(personData).map((f) => f.display);
      const patterns = personData.patterns.map(
        (p) => `you feel ${p.text} ${p.marker} (a standing pattern)`,
      );
      noteStep(ws, "memory", "remember",
        `person recall: ${facts.length} fact(s) and ${patterns.length} pattern(s) read from the file`);
      return finish(renderRecall(facts, patterns), "memory", facts.length > 0);
    }
    noteStep(ws, "memory", "remember", "person recall in general mode: no file exists — nothing is stored");
    return finish(renderRecallGeneral(), "memory", false);
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

  // (3b) E4 — person capture and person knowledge, consulted
  // FIRST for statements (§2, piece C's set order): what the
  // statement itself states about the speaker is captured
  // (facts to the file, state to the session — each write
  // traced, and acknowledged in the reply the statement branch
  // composes), and the recorded facts this turn's contents
  // touch are gathered as connections. Questions are not
  // captured: capture is a statement-side discipline.
  const capture: CaptureResult = !isQuestionForm(lower)
    ? captureStatement(ws, session, env)
    : { factsWritten: [], patternsWritten: [], feeling: null, doing: null, newPerson: null };
  const connections = personData && !isQuestionForm(lower)
    ? personConnections(ws, personData)
    : [];
  if (connections.length) {
    noteStep(ws, "intent", "intent",
      `person knowledge consulted first: the turn's contents touch ${connections.map((c) => `"${c.fact.display}" (via ${c.via})`).join(", ")}`);
  }

  // helpers ------------------------------------------------------------
  // Decline STYLE is the role's (packs may word a decline
  // plainly or by naming the missing relation); the honesty —
  // the empty set itself — is never the role's to change (§5).
  const plainDeclines = role.declineStyle === "plain";
  const declineUnplaced = (intent: IntentKind): TurnResult => {
    const unplaced = words.filter(
      (w) => w.length > 2 && !STOPWORDS.has(w) &&
        !resolved.some((r) => r.text.split(" ").includes(w)),
    );
    noteStep(ws, "discourse", "decline", `unplaced: ${unplaced.join(", ") || "(none)"}`);
    return finish(
      plainDeclines ? renderDeclineUnplacedPlain(unplaced) : renderDeclineUnplaced(unplaced),
      intent, false,
    );
  };
  const noFact = (termText: string, intent: IntentKind): TurnResult => {
    noteStep(ws, "solve", "decline", `no usable edges for "${termText}"`);
    return finish(
      plainDeclines ? renderNoFactPlain(termText) : renderNoFact(termText),
      intent, false,
    );
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
      const fact = pickFact(g, term.id, sit, FACT_REL_PRIORITY, turnContextIds(g, ws), relevanceFor(ws));
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
      plainDeclines
        ? renderToolDeclinePlain(tool.isOpen ? `opening ${tool.target}` : tool.target)
        : renderToolDecline(tool.isOpen ? `opening ${tool.target}` : tool.target),
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
      return finish(
        plainDeclines
          ? renderWhyNoCausePlain(res.effectText, res.causeText)
          : renderWhyNoCause(res.effectText, res.causeText),
        "why", false,
      );
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

    // E4 — a definition-shaped what-is turn runs through the
    // AmbiguityResolver before solve executes. The flow keeps
    // the study → organise → plan → consult → examine shape:
    // the sense choice STUDIES the candidates, EverydaySense
    // ORGANISES them by its default, the resolver PLANS
    // (answer / name / ask) over the whole situation, solve
    // CONSULTS the graph under the settled reading, and the
    // EXAMINATION step — last, and pointed at in the trace —
    // reads the verdict's standing tuple for the admission
    // the reply carries. No gloss → null, and the turn keeps
    // exactly its previous route.
    if (classifySurface(lower) === "whatis" && isDefinitionQuestion(lower)) {
      const cand = candidates[0];
      const termText = g.terms[cand.id];
      const choice = chooseDefinition(
        g, termText, [...turnContextIds(g, ws), cand.id], contextFit,
      );
      if (choice) {
        noteStep(ws, "solve", "query", definitionTraceNote(choice));
        if (choice.rivals.length < 2) {
          const ans = solveDefinitionAnswer(g, ws, session, cand, choice.chosen.synsetId);
          if (ans) {
            noteTriage(ws, "retrieve", "definition: the term's one glossed sense leads, neighbourhood follows");
            return finish(ans, "whatis", true);
          }
        } else {
          const glossHead = (synsetId: string): string => {
            const c = definitionForSynset(g, termText, synsetId);
            if (!c) return synsetId;
            // the gloss's head phrase: its first substantial
            // segment (a gloss may open with a parenthetical or
            // a comma — an empty branch label would leave the
            // person nothing to answer with)
            const head = c.gloss
              .replace(/[()]/g, " ")
              .split(/[,;]/)
              .map((s) => s.trim())
              .find((s) => s.split(/\s+/).filter(Boolean).length >= 3);
            return (head ?? c.gloss).split(/\s+/).slice(0, 7).join(" ");
          };
          const settled = session.settledSenses[termText] ?? null;
          const everyday = everydaySynsetId(g, termText, contextFit);
          const verdict = resolveRivalReadings({
            rivals: choice.rivals.map((r) => ({
              key: r.synsetId,
              label: glossHead(r.synsetId),
              score: r.score,
              cluster: senseClusterLabel(g, termText, r.synsetId),
              gravity: false,
            })),
            historyKey: settled,
            everydayKey: everyday,
            stakes: "question",
            disposition: role.clarificationDisposition,
            asksUsed: session.clarificationsAsked,
            askedLastTurn: session.lastTurnWasAsk,
            knownness: settled ? { [settled]: 0.8 } : {},
          });
          noteStep(ws, "resolver", "resolve",
            `resolver over ${choice.rivals.length} senses of "${termText}": ${verdict.reason} → ${verdict.action}` +
            (everyday ? `; everydaysense default: ${glossHead(everyday)}` : "; no everydaysense default"));
          const admission = admissionFor(verdict.standing);
          noteStep(ws, "resolver", "examine",
            `examination: standing ${standingTrace(verdict.standing)}; admission read off the axes: ${admission ?? "none — the reply asserts plainly"}`);
          if (verdict.action === "ask") {
            const branches = verdict.ranked.slice(0, 2).map((r) => {
              const c = definitionForSynset(g, termText, r.key);
              // the branch's graph footprint: its filing
              // cluster's evidence ids plus their IsA ancestors
              // — so a reply naming the reading's CATEGORY
              // ("the animal one") selects it, not only a reply
              // quoting the gloss's own words.
              const clusterLabel = senseClusterLabel(g, termText, r.key);
              const matchIds = new Set<number>();
              if (clusterLabel) {
                const cluster = filingClusters(g, cand.id)
                  .find((cl) => cl.anchorText === clusterLabel);
                if (cluster) {
                  for (const id of clusterEvidenceIds(cluster)) matchIds.add(id);
                  for (const id of [...matchIds]) {
                    for (const e1 of g.outEdges(id, "/r/IsA")) {
                      matchIds.add(e1.to);
                      for (const e2 of g.outEdges(e1.to, "/r/IsA")) matchIds.add(e2.to);
                    }
                  }
                }
              }
              return {
                key: r.key,
                label: r.label,
                synsetId: r.key,
                matchWords: c
                  ? [...c.lemmas, ...c.gloss.toLowerCase().split(/[^a-z']+/)]
                      .filter((w) => w.length > 2)
                  : [],
                matchIds: [...matchIds],
              };
            });
            session.pendingClarification = {
              termText,
              kind: "definition",
              branches,
              askedTurn: session.turnCount,
            };
            session.clarificationsAsked++;
            noteTriage(ws, "retrieve", "definition: readings too close to choose — the resolver asks, branches pre-mapped");
            return finish(
              renderClarificationAsk(termText, branches.map((b) => b.label)),
              "clarification", false,
            );
          }
          const ans = solveDefinitionAnswer(g, ws, session, cand, verdict.key!);
          if (ans) {
            noteTriage(ws, "retrieve",
              `definition: settled by ${verdict.ground} — the settled sense's gloss leads, neighbourhood follows`);
            if (verdict.action === "name") {
              const label = verdict.ranked.find((r) => r.key === verdict.key)?.label ?? "";
              return finish(`${renderNamedReading(termText, label)} ${ans}`, "whatis", true);
            }
            return finish(ans, "whatis", true);
          }
        }
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
      const base = reaction ?? renderStateNoted(capture.feeling.text, capture.feeling.pattern);
      session.lastIntent = "fact";
      return finish(base + ackSuffix, "statement", reaction !== null);
    }

    if (!primary) {
      // nothing resolved, but the statement still landed —
      // as person data (a name, a fact for the file)
      return finish(
        capture.factsWritten.length
          ? renderRememberAck(role.memoryAck, capture.factsWritten[0].display)
          : renderStatementNoted(capture.doing ?? capture.newPerson ?? "that"),
        "statement", false,
      );
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
    const fact = bestStatementFact(
      g, sit, ev, resolved, primary, factRels, bd.topics,
      turnContextIds(g, ws), relevanceFor(ws),
    );
    let text: string;
    let grounded = false;
    if (fact) {
      addConclusions(ws, [fact]);
      noteStep(ws, "solve", "conclude", "statement acknowledgement fact", [edgeText(g, fact.edge)]);
      text = renderConclusion(g, fact);
      grounded = true;
    } else {
      text = renderStatementNoted(g.terms[primary.id]);
    }
    // connected: the reply SAYS the connection the person
    // model found — a recorded preference whose object is the
    // statement's topic earns the continuity clause
    if (cls.kind === "connected" && fact) {
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
      text += ` ${renderSchmoozeFollowup(cls.followupSlot, g.terms[primary.id])}`;
    }
    text += ackSuffix;
    session.lastIntent = "fact";
    return finish(text, "statement", grounded);
  }

  return declineUnplaced("statement");
}
