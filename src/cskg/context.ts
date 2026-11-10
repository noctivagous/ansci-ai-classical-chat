/**
 * context.ts — the Context module (design §2; E4 Part 1, the
 * relocation that answers G5).
 *
 * Context is the composition point of the frame: it takes
 * awareness's situation, person and role, and memory's
 * conversation state, and assembles the turn's OPERATIVE
 * CONTEXT — the weighted topics, the situation facets relevant
 * to analysis, the person's facts in play, the person's current
 * state, the role's dispositions. The analysis pieces (B, C, E)
 * and articulation read the operative context rather than the
 * raw frame fields, so contextual pressure acts DURING analysis
 * — on which referents get preferred, which candidates get
 * gathered, which facts get selected — not as a late tiebreak
 * over facts already chosen. (The spike's selection pressure
 * showed no observable effect precisely because it was applied
 * once, at the end, where attestation dominates.)
 *
 * Context's assembly is recorded in the trace — what it
 * weighted, and why — so its influence is observable whether or
 * not an answer flips: the situation-conditioned evaluation
 * turns are judged on these records (steps-level trace diffs
 * between two situations over identical input).
 *
 * Writes (engine map): `context`. Reads: `situation`, `person`,
 * `role`, `activeContext` (memory's state).
 */
import {
  DAYPART_WORDS,
  SEASON_WORDS,
  situationallyRelevant,
  type Situation,
} from "./awareness";
import { BALANCED_DISPOSITION, describeDisposition, type Disposition } from "./disposition";
import type { CskgGraph } from "./loader";
import type { SessionState } from "./memory";
import { activeFacts, type PersonFileData } from "./person";
import type { RolePack } from "./roles";
import { noteStep, type TurnWorkspace } from "./workspace";

export interface SituationFacet {
  /** the facet's word ("spring", "rain", "night") */
  text: string;
  /** its graph id, when the word resolves */
  id: number | null;
  via: "season" | "daypart" | "season-word" | "daypart-word";
}

export interface TopicWeight {
  id: number;
  /** recency weight in (0, 1]: the freshest topic weighs 1 */
  weight: number;
}

export interface OperativeContext {
  /** memory's active topics, recency-weighted */
  topicWeights: TopicWeight[];
  /** the situation's facets, as words and (where possible) graph ids */
  situationFacets: SituationFacet[];
  /** resolved facet ids — a context set solve and discourse consult */
  situationIds: number[];
  /** graph ids of the person's recorded fact subjects/objects that resolve */
  personFactIds: number[];
  /** the person's facts in play, as display sentences */
  personFactsInPlay: string[];
  /** the person's latest stated feeling/doing, if any this session */
  stateInPlay: string | null;
  /** a clarification is pending from the previous turn */
  pendingClarification: boolean;
  /** the role whose dispositions this context carries */
  roleId: string;
  /** the frame's riding assumptions (disposition.ts, §11) */
  disposition: Disposition;
}

/**
 * Compose the turn's operative context into the workspace.
 * Runs after awareness and memory's supply, before discourse —
 * the order is the mechanism (G5): everything downstream reads
 * the frame through this composition.
 */
export function composeContextInto(
  ws: TurnWorkspace,
  session: SessionState,
  g: CskgGraph,
  personData: PersonFileData | null,
): void {
  const sit = ws.situation!;
  const role = ws.role!;

  // Active topics, recency-weighted: the most recent topic is
  // the conversation's centre of gravity; older ones fade.
  const topics = ws.activeContext?.topics ?? [];
  const topicWeights: TopicWeight[] = topics.map((id, i) => ({
    id,
    weight: Math.round((1 / (1 + (topics.length - 1 - i))) * 100) / 100,
  }));

  // Situation facets: the season and daypart themselves, plus
  // their relevance vocabularies, resolved into the graph where
  // the words exist there. These ids are the situation's own
  // context set — a candidate or fact whose world overlaps them
  // is situationally live THIS turn.
  const facets: SituationFacet[] = [];
  const seenFacet = new Set<string>();
  const addFacet = (text: string, via: SituationFacet["via"]): void => {
    if (seenFacet.has(text)) return;
    seenFacet.add(text);
    facets.push({ text, id: g.id(text) ?? null, via });
  };
  if (sit.season) {
    addFacet(sit.season, "season");
    for (const w of SEASON_WORDS[sit.season]) addFacet(w, "season-word");
  }
  addFacet(sit.daypart, "daypart");
  for (const w of DAYPART_WORDS[sit.daypart]) addFacet(w, "daypart-word");
  const situationIds = facets
    .map((f) => f.id)
    .filter((id): id is number => id !== null);

  // The person's facts in play: every recorded fact (the file
  // is small by discipline), with the graph ids its subject and
  // object resolve to — solve's context set gains them, so a
  // fact choice can be corroborated by the person's own world.
  const personFactsInPlay: string[] = [];
  const personFactIds: number[] = [];
  if (personData) {
    for (const f of activeFacts(personData)) {
      personFactsInPlay.push(f.display);
      for (const text of [f.object, f.subject]) {
        const id = g.id(text.toLowerCase());
        if (id !== undefined && !personFactIds.includes(id)) personFactIds.push(id);
      }
    }
  }

  const latestState = session.personStates.length
    ? session.personStates[session.personStates.length - 1]
    : null;
  const disposition = ws.disposition ?? { ...BALANCED_DISPOSITION };

  ws.context = {
    topicWeights,
    situationFacets: facets,
    situationIds,
    personFactIds,
    personFactsInPlay,
    stateInPlay: latestState ? `${latestState.kind}: ${latestState.text}` : null,
    pendingClarification: session.pendingClarification !== null,
    roleId: role.id,
    disposition,
  };

  noteStep(ws, "context", "compose",
    `operative context: situation facets [${facets.map((f) => f.text).join(", ")}] ` +
    `(${situationIds.length} resolved in the graph); ` +
    `topics weighted [${topicWeights.map((t) => `${g.terms[t.id] ?? t.id}×${t.weight}`).join(", ") || "none"}]; ` +
    `person facts in play: ${personFactsInPlay.length}` +
    (latestState ? `; person state in play: ${latestState.kind} "${latestState.text}"` : "") +
    `; role: ${role.id} (${role.statementStrategy}, clarification ${role.clarificationDisposition})` +
    `; disposition: ${describeDisposition(disposition)}` +
    (session.pendingClarification
      ? `; a clarification is pending ("${session.pendingClarification.termText}")`
      : ""));
}

/**
 * Situation relevance, as the operative context owns it: the
 * spike's season/daypart vocabulary check, widened with the
 * context's own facet words (the same words, but now they are
 * Context's declared facets, traced at composition). Solve's
 * fact choice consults THIS, not the raw situation — the
 * relocation G5 asked for.
 */
export function contextRelevance(
  ctx: OperativeContext,
  sit: Situation,
  termText: string,
): boolean {
  if (situationallyRelevant(termText, sit)) return true;
  const lower = termText.toLowerCase();
  return ctx.situationFacets.some((f) => lower.includes(f.text));
}

/** The role dispositions Context carries for this turn. */
export function roleOf(ws: TurnWorkspace): RolePack {
  return ws.role!;
}
