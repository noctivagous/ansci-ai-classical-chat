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
 * Consolidation (triage table): the cascade is data — one row
 * per take-up naming the form, the C detector that recognises
 * it, the solver that works it, and the decline when the set is
 * empty. Detectors stay in intent.ts, solvers stay in solve.ts
 * (or the kin piece owning the record), the coordinator walks
 * three tables in order: pre-context (replay), early moves,
 * late moves. Advice and the next ask-form are rows, not new
 * architecture.
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
  renderPhatic,
  renderAdviceAdditionDecline,
  renderAdviceAdditionDeclinePlain,
  renderAdviceAdditionNone,
  renderAdviceWearDecline,
  renderAdviceWearDeclinePlain,
  renderAdviceWearYes,
  renderValueOfDecline,
  renderValueOfDeclinePlain,
  renderCompositionDecline,
  renderCompositionDeclinePlain,
  renderNoSurfaceRelation,
  renderNoSurfaceRelationPlain,
  renderRecall,
  renderRecallGeneral,
  renderRecallMissing,
  renderRememberAck,
  renderRememberSessionOnly,
  renderSituationAnswer,
  renderStatementPlan,
  renderToolAnswer,
  renderToolDecline,
  renderToolDeclinePlain,
  renderToolFallbackNote,
  renderUnattestedAsk,
  renderUnattestedAskPlain,
  renderUnrelated,
  renderWhyNoCause,
  renderWhyNoCausePlain,
  renderWhyNoTopic,
  speak,
} from "./articulate";
import { composeContextInto } from "./context";
import {
  definitionForSynset,
  definitionTraceNote,
  glossHead,
  senseClusterLabel,
  settleSense,
} from "./definitions";
import { loadTurnAnnotation } from "./annotator";
import {
  analyseInto,
  contentCandidates,
  matchEvent,
  pickSalient,
  preferQuestionSubject,
  resolveTerms,
  STOPWORDS,
  type ResolvedTerm,
} from "./discourse";
import {
  assignIntent,
  classifyStatement,
  classifySurface,
  detectAdvice,
  detectValueOf,
  detectComposition,
  detectCorrection,
  detectFollowup,
  detectPersonRecall,
  detectPhatic,
  detectRemember,
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
import {
  addConclusions,
  answerRelated,
  answerWhy,
  answerWhyQuestion,
  attestationGap,
  bestStatementFact,
  contextFit,
  FACT_REL_PRIORITY,
  findTools,
  noteTriage,
  pickFact,
  relevanceFor,
  solveAdviceAddition,
  solveAdviceWear,
  solveValueOf,
  solveComposition,
  solveDefinitionAnswer,
  solveEventConsequence,
  solveEventReaction,
  solveGenericFact,
  solveSurfaceIntent,
  topConclusions,
  turnContextIds,
} from "./solve";
import {
  analyseSituationInto,
  answerSituationQuestion,
  answerSituationWhy,
  entityById,
} from "./situation";
import { admissionFor, standingTrace } from "./standing";
import { composeStatementReply } from "./statement";
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

  /**
   * The triage table (consolidation: the cascade as data). One
   * row per take-up: the form, the C detector (intent.ts) that
   * recognises it, the solver that works it (solve.ts, or the
   * kin piece owning the record), and the decline when the set
   * is empty. Detectors stay in C, solvers stay in E, the
   * coordinator walks the tables in order. Advice and the next
   * ask-form are rows, not new architecture.
   */
  interface TurnRoute {
    /** the form this row takes up (the triage-table key) */
    form: string;
    /** the C detector (intent.ts) that recognises the form */
    detect: string;
    /** the solver that works the form (E, or the owning kin piece) */
    solve: string;
    /** the decline when the set is empty */
    decline: string;
    /** the row's take-up, or null when the turn is not its form */
    run: () => TurnResult | null;
  }
  const walkRoutes = (routes: TurnRoute[]): TurnResult | null => {
    for (const route of routes) {
      const r = route.run();
      if (r) return r;
    }
    return null;
  };

  // Pre-context: replay re-queries NOTHING — not even the
  // operative context — so it runs before composition.
  const preContextRoutes: TurnRoute[] = [
    {
      form: "replay",
      detect: "C detectReplay",
      solve: "D memory.replayAnswer; F renderReplay",
      decline: "renderReplayNoPrevious",
      run: () => {
        // (0) replay: "why did you say that?" — stored trace, no re-query
        if (!detectReplay(lower)) return null;
        noteStep(ws, "memory", "replay", "replaying previous trace; graph not re-queried");
        const r = replayAnswer(g, session);
        return finish(r.text, "replay", r.grounded);
      },
    },
  ];
  const preContext = walkRoutes(preContextRoutes);
  if (preContext) return preContext;

  // 2b — E4: the Context module composes the frame + memory
  // into the OPERATIVE CONTEXT the rest of the turn is analysed
  // under (context.ts; G5's relocation — B, C and E read
  // ws.context from here on).
  composeContextInto(ws, session, g, personData);

  // Early moves: memory's and awareness's take-ups, before analysis.
  const earlyRoutes: TurnRoute[] = [];

  // (1) correction: "no, I meant the illness"
  earlyRoutes.push({
    form: "correction",
    detect: "C detectCorrection",
    solve: "E pickFact + settleSense (resolver); F renderCorrection*",
    decline: "renderCorrectionUnplaced / renderCorrectionNoFact",
    run: () => {
      const corr = detectCorrection(lower);
      if (!corr) return null;
      noteStep(ws, "memory", "correct", `user correction → "${corr.phrase}"`);
      const fixed = resolveTerms(g, corr.phrase);
      if (fixed.length) {
        const term = fixed[fixed.length - 1];
        // S12: the topic being superseded, read before the
        // re-resolution overwrites it — the repair names it.
        const prevTopic = currentTopicId(session);
        const prevTopicText = prevTopic !== undefined ? g.terms[prevTopic] : null;
        remember(session, term.id);
        noteStep(ws, "discourse", "resolve", `re-resolved: ${term.text}`);
        noteTriage(ws, "retrieve", "fact about the corrected term");
        // Definitions slice: a correction SETTLES the sense — when
        // the corrected term has a WordNet gloss, the reply gives
        // that sense's definition in place of a neighbourhood fact
        // ("No, I meant the common cold" → the illness gloss, the
        // "Got it —" acknowledgement unchanged). The sense runs
        // through the AmbiguityResolver over the referent — the
        // jacket/coat/chicken class — so the conversation (winter
        // coat, wear, go out) beats the cover/hair/cock readings.
        // No gloss → the fact path below, exactly as before.
        // The correction's own phrase disambiguates it ("winter
        // coat" beside "jacket"): the turn's contents are not
        // analysed yet at this early row, so the phrase's resolved
        // terms join the judged context explicitly.
        const phraseTerms = resolveTerms(g, corr.phrase);
        const reading = settleSense(
          g, g.terms[term.id],
          [...turnContextIds(g, ws), ...phraseTerms.map((t) => t.id)],
          contextFit,
          {
            historyKey: session.settledSenses[g.terms[term.id]] ?? null,
            stakes: "statement",
            disposition: role.clarificationDisposition,
            asksUsed: session.clarificationsAsked,
            askedLastTurn: session.lastTurnWasAsk,
            turnText: input,
          },
        );
        if (reading) {
          // Corrections never ask back: a statement is not a
          // question, so the verdict's key is answered even on a
          // weak standing (falling back to the score leader when
          // the verdict names no key), and the ground is traced.
          const synsetId = reading.verdict?.key ?? reading.choice.chosen.synsetId;
          // E4: the settled sense goes on record — the resolver's
          // ground 1 (what the person said) for later turns.
          session.settledSenses[g.terms[term.id]] = synsetId;
          noteStep(ws, "solve", "query", definitionTraceNote(reading.choice));
          if (reading.verdict) {
            noteStep(ws, "resolver", "resolve",
              `resolver over ${reading.choice.rivals.length} senses of "${g.terms[term.id]}": ${reading.verdict.reason} → ${reading.verdict.action}` +
              (reading.everyday ? `; everydaysense default: ${glossHead(g, g.terms[term.id], reading.everyday)}` : "; no everydaysense default"));
            if (reading.verdict.action === "name") {
              const label = reading.verdict.ranked.find((r) => r.key === reading.verdict!.key)?.label ?? "";
              const gloss = definitionForSynset(g, g.terms[term.id], synsetId);
              if (gloss) {
                return finish(
                  `${renderNamedReading(g.terms[term.id], label)} ` +
                  renderCorrectionFact(
                    g.terms[term.id],
                    renderDefinition(g.terms[term.id], gloss.gloss),
                    prevTopicText,
                    role.statementStrategy,
                  ),
                  "correction",
                  true,
                );
              }
            }
          }
          const gloss = definitionForSynset(g, g.terms[term.id], synsetId);
          if (gloss) {
            return finish(
              renderCorrectionFact(
                g.terms[term.id],
                renderDefinition(g.terms[term.id], gloss.gloss),
                prevTopicText,
                role.statementStrategy,
              ),
              "correction",
              true,
            );
          }
          // settled sense without gloss text — the fact path below
        }
        const fact = pickFact(g, term.id, sit, FACT_REL_PRIORITY, turnContextIds(g, ws), relevanceFor(ws));
        if (fact) {
          addConclusions(ws, [fact]);
          noteStep(ws, "solve", "conclude", "answered about the corrected term", [edgeText(g, fact.edge)]);
          return finish(renderCorrectionFact(g.terms[term.id], renderConclusion(g, fact), prevTopicText, role.statementStrategy), "correction", true);
        }
        return finish(renderCorrectionNoFact(g.terms[term.id], prevTopicText), "correction", false);
      }
      return finish(renderCorrectionUnplaced(corr.phrase), "correction", false);
    },
  });

  // (1b) E4 — a pending clarification resolves BEFORE any new
  // analysis (§5): the branches were pre-mapped when the ask
  // was made, so an ordinal or a branch's own words select the
  // reading and the ORIGINAL question is answered under it.
  // An input that answers nothing clears the pending state and
  // proceeds as a fresh turn — the ask is spent either way.
  earlyRoutes.push({
    form: "pending-clarification",
    detect: "session.pendingClarification (resolver pre-mapped branches)",
    solve: "resolver resolveRivalReadings; E solveDefinitionAnswer",
    decline: "cleared — new analysis proceeds",
    run: () => {
      const pending: PendingClarification | null = session.pendingClarification;
      if (!pending) return null;
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
      return null;
    },
  });

  // (1c) E4 — an explicit "remember that…": the write
  // discipline's second door (§5). Named person → the file,
  // acknowledged; general mode → a session note and an honest
  // word about its reach.
  earlyRoutes.push({
    form: "remember",
    detect: "C detectRemember",
    solve: "D memory captureExplicit / sessionNotes; F renderRemember*",
    decline: "none — the ack is unconditional",
    run: () => {
      const stated = detectRemember(input);
      if (!stated) return null;
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
    },
  });

  // (1d) E4 — person recall. The file question reads the file
  // (or honestly says general mode has none). Name and place
  // forms read the file when present, else this session's
  // stated facts — "do you remember my name?" is not a
  // question about the node *name*.
  earlyRoutes.push({
    form: "recall",
    detect: "C detectPersonRecall",
    solve: "D memory activeFacts / sessionFacts; F renderRecall*",
    decline: "renderRecallMissing / renderRecallGeneral",
    run: () => {
      const recall = detectPersonRecall(lower);
      if (!recall) return null;
      if (recall === "file") {
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
      if (recall === "name" || recall === "place") {
        const kindOk = (k: string) =>
          recall === "name" ? k === "name" : k === "lives-in" || k === "from";
        const fromFile = personData
          ? activeFacts(personData).filter((f) => kindOk(f.kind)).map((f) => f.display)
          : [];
        const fromSession = session.sessionFacts
          .filter((f) => kindOk(f.kind))
          .map((f) => f.display);
        const displays = fromFile.length ? fromFile : fromSession;
        if (displays.length) {
          noteStep(ws, "memory", "remember",
            `person recall (${recall}): ${displays.join("; ")}`);
          return finish(renderRecall(displays, []), "memory", true);
        }
        noteStep(ws, "memory", "remember",
          `person recall (${recall}): nothing stated this session`);
        return finish(renderRecallMissing(recall), "memory", false);
      }
      return null;
    },
  });

  // Surface phatic (S5): greetings, how-are-you, thanks, farewells
  // with no other content — including question-shaped ones
  // ("how are you?", "hey, how's it going?"). Taken up before
  // discourse so they never become graph subjects.
  earlyRoutes.push({
    form: "phatic",
    detect: "C detectPhatic",
    solve: "F renderPhatic (social, no graph testimony)",
    decline: "none — zero graph facts is success",
    run: () => {
      const phatic = detectPhatic(lower);
      if (!phatic) return null;
      noteStep(ws, "intent", "intent",
        `phatic-only turn (${phatic.kind}): social reply, no topic remembered, no graph testimony`);
      session.lastIntent = "statement";
      return finish(renderPhatic(phatic.kind, phatic.word), "statement", true);
    },
  });

  // (2) questions about the situated self
  earlyRoutes.push({
    form: "situation",
    detect: "C detectSituationQuestion",
    solve: "situationModel answerSituationQuestion; F renderSituationAnswer",
    decline: "none — the frame always answers",
    run: () => {
      const sitQ = detectSituationQuestion(lower);
      if (sitQ) {
        return finish(renderSituationAnswer(sitQ, sit), "situation", true);
      }
      return null;
    },
  });

  // The walk: the first row whose form matches takes the turn.
  // Order is the spike's, preserved verbatim by the E1 restructure.
  const early = walkRoutes(earlyRoutes);
  if (early) return early;

  // (3) discourse analyses the turn — B notes its own trace steps
  // (one per mention, plus the topic ranking) inside analyseInto.
  analyseInto(ws, g, loadTurnAnnotation(env, ws.input));
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
    : { factsWritten: [], patternsWritten: [], feeling: null, doing: null, newPerson: null, sessionKept: [] };
  const connections = personData && !isQuestionForm(lower)
    ? personConnections(ws, personData)
    : [];
  if (connections.length) {
    noteStep(ws, "intent", "intent",
      `person knowledge consulted first: the turn's contents touch ${connections.map((c) => `"${c.fact.display}" (via ${c.via})`).join(", ")}`);
  }

  // (3c) E5 — Situation analysis: the turn's happenings,
  // people and states enter the session's SITUATION MODEL
  // (entities, events, states, attributed relations — the
  // conversation's own micro-world, held in the session), and
  // the turn's pronouns resolve against it. Runs for
  // statements and questions alike; only statements assert
  // new events. situation.ts is the model's only writer; the
  // result feeds the statement acknowledgement and the
  // referring-question answers below.
  const sitResult = analyseSituationInto(ws, g, session, {
    isStatement: !isQuestionForm(lower),
    capture,
  });

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

  // Late moves: the analysed turn's take-ups, in the spike's order.
  const lateRoutes: TurnRoute[] = [];

  // (4) "what about X?" follow-up
  lateRoutes.push({
    form: "followup",
    detect: "C detectFollowup",
    solve: "E pickFact; F renderConclusion",
    decline: "noFact / declineUnplaced",
    run: () => {
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
      return null;
    },
  });

  // (5) bare "why?" — the standing EVENT first, the current
  // topic after (Item 5: a bare why asks about what is
  // happening; the model's own causal relations outrank a fresh
  // topic lookup, the same order stated why-questions use).
  lateRoutes.push({
    form: "bare-why",
    detect: "C isBareWhy",
    solve: "situationModel answerSituationWhy; E answerWhy",
    decline: "renderWhyNoCause / renderWhyNoTopic",
    run: () => {
      if (!isBareWhy(lower)) return null;
      const sitWhy = answerSituationWhy(ws, session, true);
      if (sitWhy) {
        noteTriage(ws, "retrieve", "the situation model's causal relation for the standing event (E5)");
        session.lastIntent = "why";
        return finish(sitWhy.text, "why", sitWhy.grounded);
      }
      const t = currentTopicId(session);
      if (t === undefined) return finish(renderWhyNoTopic(), "why", false);
      const cause = answerWhy(g, ws, t);
      if (cause) {
        noteTriage(ws, "retrieve", "the current topic's own causal edges");
        return finish(cause, "why", true);
      }
      // No causal testimony for the standing topic: the decline
      // must be the WHY-shaped one, naming the topic as the
      // missing cause — not the generic no-fact decline, which
      // claims the graph says nothing usable about a topic the
      // conversation may just have answered from (Loop 1,
      // extend-bare-why).
      noteTriage(ws, "solve", "bare why: no Causes testimony reaches the standing topic — why-shaped decline");
      return finish(
        plainDeclines
          ? renderWhyNoCausePlain(g.terms[t], null)
          : renderWhyNoCause(g.terms[t], null),
        "why",
        false,
      );
    },
  });

  const isQuestion = isQuestionForm(lower);
  const salient = pickSalient(g, resolved);

  // (6) tool-finding: "what can I open a wine bottle with?" — a
  // problem, solved with set operations (§6): the strict UsedFor
  // set, DIFFERENCE for stated exclusions, the disclosed fallback
  // only when the strict set is empty.
  lateRoutes.push({
    form: "tool",
    detect: "C detectToolQuery",
    solve: "E findTools (§6 set operations); F renderTool*",
    decline: "renderToolDecline",
    run: () => {
      const tool = detectToolQuery(lower);
      if (!tool) return null;
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
          ? renderToolDeclinePlain(tool.isOpen ? `opening ${tool.target}` : tool.target, tool.isOpen)
          : renderToolDecline(tool.isOpen ? `opening ${tool.target}` : tool.target, tool.isOpen),
        "tool", false,
      );
    },
  });

  // "Does X go in Y?" — two poles, HasA / PartOf / AtLocation.
  // Empty set declines; a neighbouring IsA of Y is not the answer.
  lateRoutes.push({
    form: "composition",
    detect: "C detectComposition",
    solve: "E solveComposition; F renderComposition*",
    decline: "renderCompositionDecline",
    run: () => {
      const composition = detectComposition(lower);
      if (!composition) return null;
      const r = solveComposition(g, ws, session, composition.inner, composition.outer);
      if (r) {
        noteTriage(ws, "retrieve",
          `composition: HasA/PartOf/AtLocation between "${composition.inner}" and "${composition.outer}"`);
        return finish(r, "fact", true);
      }
      noteTriage(ws, "solve",
        `composition: empty set between "${composition.inner}" and "${composition.outer}" — decline, no substitution`);
      return finish(
        plainDeclines
          ? renderCompositionDeclinePlain(composition.inner, composition.outer)
          : renderCompositionDecline(composition.inner, composition.outer),
        "fact",
        false,
      );
    },
  });

  // Recommendation: "what else should I put in?" (composition
  // members of the dish, empty-set decline) and "should I wear
  // a coat?" (UsedFor of the garment). Graph testimony is the
  // evidence; a neighbouring IsA is not the answer. Two rows:
  // addition and wear ask different sets.
  lateRoutes.push({
    form: "advice-addition",
    detect: "C detectAdvice (addition)",
    solve: "E solveAdviceAddition; F renderAdviceAddition*",
    decline: "renderAdviceAdditionDecline / renderAdviceAdditionNone",
    run: () => {
      const advice = detectAdvice(lower);
      if (!advice || advice.kind !== "addition") return null;
      const r = solveAdviceAddition(g, ws, session, advice.outer);
      if (r.grounded) {
        noteTriage(ws, "solve",
          `advice-addition: HasA/PartOf members of "${r.outer}"`);
        return finish(r.text, "advice", true);
      }
      noteTriage(ws, "solve",
        `advice-addition: empty composition set for "${r.outer ?? "(no dish)"}" — decline, no substitution`);
      const decline = r.outer
        ? (plainDeclines
          ? renderAdviceAdditionDeclinePlain(r.outer)
          : renderAdviceAdditionDecline(r.outer))
        : renderAdviceAdditionNone();
      return finish(decline, "advice", false);
    },
  });
  lateRoutes.push({
    form: "advice-wear",
    detect: "C detectAdvice (wear)",
    solve: "E solveAdviceWear; F renderAdviceWearYes",
    decline: "renderAdviceWearDecline",
    run: () => {
      const advice = detectAdvice(lower);
      if (!advice || advice.kind !== "wear") return null;
      const worn = solveAdviceWear(g, ws, session, advice.item);
      if (worn) {
        noteTriage(ws, "retrieve",
          `advice-wear: UsedFor of "${advice.item}"`);
        return finish(renderAdviceWearYes(worn), "advice", true);
      }
      noteTriage(ws, "solve",
        `advice-wear: empty UsedFor for "${advice.item}" — decline, no substitution`);
      return finish(
        plainDeclines
          ? renderAdviceWearDeclinePlain(advice.item)
          : renderAdviceWearDecline(advice.item),
        "advice",
        false,
      );
    },
  });

  // E5 — a follow-up or referring question the situation model
  // holds the answer to ("What are you making?", "When is
  // it?", "What's in it?", "Who is he bringing?", "Which
  // happened first?") is answered FROM THE MODEL — the record
  // of this conversation — not by a fresh topic lookup. A
  // question that is not the model's to answer returns null
  // here and falls through to the ordinary machinery unchanged.
  lateRoutes.push({
    form: "model-question",
    detect: "C isQuestionForm (model-held)",
    solve: "situationModel answerSituationQuestion",
    decline: "none — falls through to the machinery",
    run: () => {
      if (!isQuestion) return null;
      const sitAns = answerSituationQuestion(ws, session);
      if (sitAns) {
        noteTriage(ws, "retrieve", "answered from the session's situation model (E5)");
        session.lastIntent = "fact";
        return finish(sitAns.text, "fact", sitAns.grounded);
      }
      return null;
    },
  });

  // E2 subject selection: the analysed question's subjects,
  // armed once for the question rows below. Discourse's scored
  // topic ranking is consumed here; E1's ordering survives as
  // the fallback. A setup step, not a take-up.
  let questionCtx: { candidates: ResolvedTerm[]; primary: ResolvedTerm } | null = null;
  lateRoutes.push({
    form: "question-setup",
    detect: "isQuestionForm + resolved terms",
    solve: "B/D E2 ranking; D memory.remember (arms rows below)",
    decline: "none — a setup step",
    run: () => {
      if (!isQuestion || !resolved.length) {
        questionCtx = null;
        return null;
      }
      // E2: subject selection consumes discourse's scored topic
      // ranking; E1's ordering survives as the fallback.
      const ranked: ResolvedTerm[] = bd.topics.length ? bd.topics : contentCandidates(g, resolved);
      const candidates = preferQuestionSubject(ranked);
      const primary = candidates[0] ?? salient!;
      remember(session, primary.id);
      questionCtx = { candidates, primary };
      return null;
    },
  });

    // relatedness between two terms
    lateRoutes.push({
      form: "related",
      detect: "C hasRelatedPattern",
      solve: "E answerRelated",
      decline: "renderUnrelated",
      run: () => {
        const q = questionCtx;
        if (!q || !(hasRelatedPattern(lower) && q.candidates.length >= 2)) return null;
        const a = q.candidates[0];
        const b = q.candidates[1];
        const ans = answerRelated(g, ws, a.id, b.id);
        noteTriage(ws, "retrieve", "direct edge or shared neighbour between two mentioned terms");
        return finish(ans ?? renderUnrelated(g.terms[a.id], g.terms[b.id]), "related", ws.conclusions.length > 0);
      },
    });

    // why-questions over causes / effects — the empty-set decline
    // rule (§6): an empty causal set declines, naming the missing
    // causation, instead of borrowing a neighbouring word's edges.
    lateRoutes.push({
      form: "why",
      detect: "C hasWhyPattern",
      solve: "situationModel answerSituationWhy; E answerWhyQuestion",
      decline: "renderWhyNoCause",
      run: () => {
        const q = questionCtx;
        if (!q || !hasWhyPattern(lower)) return null;
        // E5: a why about one of the model's own events is
        // answered from the model's causal relations first —
        // the record of what was said, with its attribution
        // spoken, outranks a fresh graph search here
        const sitWhy = answerSituationWhy(ws, session);
        if (sitWhy) {
          noteTriage(ws, "retrieve", "the situation model's causal relation for this event (E5)");
          session.lastIntent = "why";
          return finish(sitWhy.text, "why", sitWhy.grounded);
        }
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
        // Gap 4c: the asked-about effect becomes the standing topic,
        // so a bare "Why?" afterwards continues the same happening
        // instead of falling back to whatever topic lingered.
        if (res.effectId != null) {
          remember(session, res.effectId);
          noteStep(ws, "memory", "remember", `why effect "${res.effectText}" is now the standing topic`);
        }
        return finish(
          plainDeclines
            ? renderWhyNoCausePlain(res.effectText, res.causeText)
            : renderWhyNoCause(res.effectText, res.causeText),
          "why", false,
        );
      },
    });

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
    lateRoutes.push({
      form: "event",
      detect: "C eventQuestionKind",
      solve: "E solveEventConsequence / solveEventReaction",
      decline: "none — falls through to attestation",
      run: () => {
        const q = questionCtx;
        if (!q) return null;
        const evKind = eventQuestionKind(lower);
        if (!evKind) return null;
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
        return null;
      },
    });

    // Value-of owns "what is the X of Y": mapped bindings answer;
    // unmapped and empty both decline. The form never falls
    // through to definition or a neighbouring fact.
    lateRoutes.push({
      form: "value-of",
      detect: "C detectValueOf",
      solve: "E solveValueOf; F renderValueOf*",
      decline: "renderValueOfDecline",
      run: () => {
        const asked = detectValueOf(lower);
        if (!asked) return null;
        const hit = solveValueOf(g, ws, session, asked.role, asked.bearer);
        if (hit.status === "hit") {
          noteTriage(ws, "retrieve",
            `value-of: role "${asked.role}" of "${asked.bearer}"`);
          return finish(hit.text, "fact", true);
        }
        noteTriage(ws, "solve",
          `value-of: empty set for the ${asked.role} of "${asked.bearer}" — decline, no substitution`);
        return finish(
          plainDeclines
            ? renderValueOfDeclinePlain(asked.role, asked.bearer)
            : renderValueOfDecline(asked.role, asked.bearer),
          "fact",
          false,
        );
      },
    });

    /* Loop 1 (design-abstention): Solve's attestation check.
     * What remains after this point is the definition route and
     * the generic-fact fallback — the two paths that substitute
     * a neighbouring fact when the asked fact itself is
     * unattested. The check runs here, after the situation
     * model, person recall and the related / why / event
     * answers have had their turns (situated testimony first),
     * and declines a specific-fact ask whose two poles no
     * testimony connects. */
    lateRoutes.push({
      form: "attestation",
      detect: "E attestationGap (specific-fact forms)",
      solve: "E attestationGap",
      decline: "renderUnattestedAsk",
      run: () => {
        if (!questionCtx) return null;
        const gap = attestationGap(g, ws, session);
        if (!gap) return null;
        noteTriage(ws, "solve", "attestation decline — the asked fact is unattested; no substitution");
        return finish(
          plainDeclines
            ? renderUnattestedAskPlain(gap.aText, gap.bText)
            : renderUnattestedAsk(gap.aText, gap.bText),
          gap.form === "value" ? "whatis" : "fact",
          false,
        );
      },
    });

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
    lateRoutes.push({
      form: "definition",
      detect: "C isDefinitionQuestion + classifySurface whatis",
      solve: "resolver resolveRivalReadings; E solveDefinitionAnswer",
      decline: "declineUnplaced / clarification ask",
      run: () => {
        const q = questionCtx;
        if (!q || !(classifySurface(lower) === "whatis" && isDefinitionQuestion(lower))) return null;
        if (detectValueOf(lower)) return null;
        const cand = q.candidates[0];
        if (!cand) {
          // No content candidate at all resolved: the word the
          // definition asks about is one the graph does not hold
          // ("what is a zorblax?"). The definition route's honest
          // answer is the unplaced decline, naming the word —
          // dereferencing candidates[0] here crashed the turn.
          noteStep(ws, "solve", "decline",
            "definition question with no resolved candidate — the asked word is unplaced");
          return declineUnplaced("whatis");
        }
        const termText = g.terms[cand.id];
        const settled = session.settledSenses[termText] ?? null;
        const reading = settleSense(
          g, termText, [...turnContextIds(g, ws), cand.id], contextFit,
          {
            historyKey: settled,
            stakes: "question",
            disposition: role.clarificationDisposition,
            asksUsed: session.clarificationsAsked,
            askedLastTurn: session.lastTurnWasAsk,
            turnText: input,
          },
        );
        const choice = reading?.choice ?? null;
        if (choice) {
          noteStep(ws, "solve", "query", definitionTraceNote(choice));
          if (choice.rivals.length < 2) {
            const ans = solveDefinitionAnswer(g, ws, session, cand, choice.chosen.synsetId);
            if (ans) {
              noteTriage(ws, "retrieve", "definition: the term's one glossed sense leads, neighbourhood follows");
              return finish(ans, "whatis", true);
            }
          } else if (reading?.verdict) {
            const verdict = reading.verdict;
            const everyday = reading.everyday;
            noteStep(ws, "resolver", "resolve",
              `resolver over ${choice.rivals.length} senses of "${termText}": ${verdict.reason} → ${verdict.action}` +
              (everyday ? `; everydaysense default: ${glossHead(g, termText, everyday)}` : "; no everydaysense default"));
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
        return null;
      },
    });

    // the classified question intents: C classified, E executes
    lateRoutes.push({
      form: "surface",
      detect: "C classifySurface",
      solve: "E solveSurfaceIntent",
      decline: "renderNoSurfaceRelation / generic fallback",
      run: () => {
        const q = questionCtx;
        if (!q) return null;
        const kind = classifySurface(lower);
        if (!kind) return null;
        const r = solveSurfaceIntent(g, ws, session, kind, q.candidates);
        if (r) {
          noteTriage(ws, "retrieve", `${kind} lookup over the subject's edges, ranked with the §6 floor`);
          return finish(r, kind, true);
        }
        // Empty-set decline (G10's shape, for purpose/location/…)
        // — a classified relation with no edges must not fall
        // through to a neighbouring IsA. whatis/property/antonym
        // keep the generic-fact fallback they have always had.
        if (kind !== "whatis" && kind !== "property" && kind !== "antonym") {
          const subj = q.candidates[0] ?? q.primary;
          remember(session, subj.id);
          noteTriage(ws, "solve",
            `${kind}: empty relation set for "${subj.text}" — decline, no substitution`);
          return finish(
            plainDeclines
              ? renderNoSurfaceRelationPlain(subj.text, kind)
              : renderNoSurfaceRelation(subj.text, kind),
            kind,
            false,
          );
        }
        return null;
      },
    });

    // generic question: best fact about the first candidate that has one
    lateRoutes.push({
      form: "generic-fact",
      detect: "unclassified question (C found no pattern)",
      solve: "E solveGenericFact",
      decline: "noFact",
      run: () => {
        const q = questionCtx;
        if (!q) return null;
        const generic = solveGenericFact(g, ws, session, q.candidates);
        if (generic) {
          noteTriage(ws, "retrieve", "best grounded fact about the subject");
          return finish(generic, "fact", true);
        }
        return noFact(q.primary.text, "fact");
      },
    });

  lateRoutes.push({
    form: "pronoun-fallback",
    detect: "C isQuestionForm, no resolved terms",
    solve: "E pickFact over the session topic",
    decline: "declineUnplaced",
    run: () => {
      if (!isQuestion || resolved.length) return null;
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
    },
  });

  // (7) statements — the statement-turn composition policy
  // lives in statement.ts (Loop 2, L2-X1: policy extracted
  // from the coordinator a piece at a time, behaviour-neutral;
  // the coordinator keeps order and route arbitration). The
  // composer produces conclusions and a plan; F words it —
  // the one-writer consolidation. Null = the turn carried
  // nothing the policy could take up.
  lateRoutes.push({
    form: "statement",
    detect: "non-question (C classified nothing to execute)",
    solve: "statement.composeStatementReply; F renderStatementPlan",
    decline: "declineUnplaced",
    run: () => {
      if (isQuestion) return null;
      const stmt = composeStatementReply({
        g, ws, session, env, role, capture, connections, sitResult,
        bd, resolved, salient, words, sit,
      });
      if (stmt) return finish(renderStatementPlan(g, ws, stmt, role), "statement", stmt.grounded);
      return null;
    },
  });

  // The walk: the first row whose form matches takes the turn.
  const late = walkRoutes(lateRoutes);
  if (late) return late;

  return declineUnplaced("statement");
}
