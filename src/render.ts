/**
 * render.ts — the translation layer (§9): conclusions → sentences.
 *
 * Three stages: content planning (§9.2), template realisation (§9.4),
 * and post-realisation verification (§9.5). The renderer may phrase but
 * never invent: every factual claim in the output traces to a
 * conclusion the reasoner handed it, the user's question, a sanctioned
 * manifestation phrase (§9.3), or the licensed filler/hedge lexicon.
 *
 * Inputs are the ThoughtTrace's conclusions + checks, the RouteDecision
 * (its kind is the turn's speech act), the surface mode, and — read-only —
 * the graph as lexicon (names, glosses, dictionary manifestations, word
 * forms are dictionary-layer data; the renderer decides no facts).
 * Rendering is a pure function of these inputs, so one trace can be
 * re-rendered in another mode without re-running the reasoner (§8.4).
 * The renderer writes nothing (§8.7); violations travel back in the
 * RenderedAnswer for the router to log as renderer-gap events.
 */
import { Graph, GraphNode } from "./graph";
import type { InterimConclusion, ThoughtTrace } from "./thought";
import type { RouteDecision, SessionState, SurfaceMode } from "./router";
import { mappedConceptForSynset, type WordNetExtract } from "./wordnet";

export type SpeechAct = "answer" | "clarify" | "decline";
export type HedgeBand = "assert" | "soften" | "hedge"; // §9.4; < 0.50 never planned

export interface PlannedConclusion {
  conclusion: InterimConclusion;
  role: "load-bearing" | "supporting";
  rendering: "direct" | "manifestation" | "correspondence";
  hedgeBand: HedgeBand;
}

export interface RenderPlan {
  mode: SurfaceMode;
  speechAct: SpeechAct;
  selected: PlannedConclusion[];
  dropped: InterimConclusion[]; // reported, never silent (§9.2)
  antecedents: Record<string, string>; // pronoun → term/conclusion id
}

export interface RenderViolation {
  stage: "leakage" | "faithfulness";
  sentence: string;
  detail: string; // the forbidden term / untraceable claim
  resolution: "repaired" | "dropped" | "fallback";
}

export interface RenderedAnswer {
  text: string;
  mode: SurfaceMode;
  droppedConclusions: InterimConclusion[];
  violations: RenderViolation[]; // [] when stage 3 was clean
}

export interface RenderContext {
  graph: Graph;
  trace: ThoughtTrace;
  decision: RouteDecision;
  session?: SessionState;
  extract?: WordNetExtract;
  /** Re-render in another mode without re-running the reasoner (§8.4). */
  modeOverride?: SurfaceMode;
  /**
   * Test seam (RD-FAITHFULNESS-TRAP / RD-GAP-EVENT): replaces stage 2
   * with a stub realiser so stage 3 can be exercised against bad text.
   */
  realiseOverride?: (plan: RenderPlan, ctx: RenderContext) => string;
}

/* ------------------------------------------------------------------ */
/* Lexicon helpers (read-only graph access)                            */
/* ------------------------------------------------------------------ */

export function nodeName(graph: Graph, id: string | undefined): string {
  if (!id) return "";
  return graph.getNode(id)?.name ?? id;
}

function glossOf(graph: Graph, node: GraphNode): string | undefined {
  if (node.type === "Synset") {
    const gloss = node.properties["gloss"];
    return typeof gloss === "string" ? gloss : undefined;
  }
  const defEdge = graph.outEdges(node.id, "DEFINED_AS")[0];
  const entry = defEdge ? graph.getNode(defEdge.to) : undefined;
  return entry?.definition ?? node.summary;
}

/** §9.3: a concept's sanctioned plain-speech phrases, via its dictionary entry. */
export function manifestationsFor(
  graph: Graph,
  nodeId: string,
  aspect?: string,
): string[] {
  const defEdge = graph.outEdges(nodeId, "DEFINED_AS")[0];
  const entry = defEdge ? graph.getNode(defEdge.to) : undefined;
  const sets = entry?.manifestations ?? graph.getNode(nodeId)?.manifestations;
  if (!sets || sets.length === 0) return [];
  if (aspect) {
    const scoped = sets.find((s) => s.aspect === aspect);
    if (scoped) return scoped.phrases;
  }
  const general = sets.find((s) => s.aspect === undefined);
  return (general ?? sets[0]).phrases;
}

function isPrior(graph: Graph, id: string | undefined): boolean {
  if (!id) return false;
  const t = graph.getNode(id)?.type;
  return t === "Polarity" || t === "Element" || t === "Trigram";
}

function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function hedgeBandOf(confidence: number): HedgeBand {
  if (confidence >= 0.9) return "assert";
  if (confidence >= 0.7) return "soften";
  return "hedge";
}

/* ------------------------------------------------------------------ */
/* Stage 1 — content planning (§9.2)                                   */
/* ------------------------------------------------------------------ */

const LOAD_BEARING: Record<string, Set<string>> = {
  definition: new Set(["GLOSS", "DEFINED_AS", "SUMMARY"]),
  causal_chain: new Set(["HAS_QUALITY", "NO_PATH_TO", "FOLLOWED_BY"]),
  ontology_explanation: new Set([
    "ELEMENT_OF",
    "POLARITY_OF",
    "HAS_POLARITY",
    "HAS_ELEMENT",
    "HAS_TRIGRAM",
    "MUTUALLY_ROOTED_WITH",
    "MAPPED_TO",
    "NO_MAPPING",
    "NO_ANCHOR",
    "POLARITY_CHECK",
  ]),
  correspondence: new Set(["CORRESPONDS_TO", "ELEMENT_OF"]),
  antonym_lookup: new Set(["ANTONYM_OF", "NO_ANTONYM"]),
  part_of: new Set(["PART_OF", "NO_PART", "PART_OF_CHECK"]),
  relatedness: new Set([
    "RELATED_VIA",
    "SHARED_PRIOR",
    "OPPOSED_PRIOR",
    "COMMON_HYPERNYM",
    "NO_RELATION",
    "IS_A",
    "ANTONYM_OF",
    "PART_OF",
    "SIMILAR_TO",
  ]),
  comparison: new Set(["CONTRASTS_WITH", "RELATED_VIA", "SHARED_PRIOR", "OPPOSED_PRIOR", "COMMON_HYPERNYM", "NO_RELATION"]),
  situation: new Set(["SEASON_HERE", "TIME_OF_DAY", "SITUATION_SELF", "SHADOW_SEASON", "LOCATION_STATED", "TONIGHT"]),
  frame_participants: new Set(["FRAME", "HAS_FRAME_ELEMENT", "EVOKES"]),
};

export function planRender(
  graph: Graph,
  trace: ThoughtTrace,
  decision: RouteDecision,
  mode: SurfaceMode,
): RenderPlan {
  if (decision.kind !== "route") {
    return {
      mode,
      speechAct: decision.kind === "clarify" ? "clarify" : "decline",
      selected: [],
      dropped: [...trace.conclusions],
      antecedents: {},
    };
  }
  const intentType = decision.intent.intentType;
  const loadBearingRelations = LOAD_BEARING[intentType] ?? new Set<string>();
  const selected: PlannedConclusion[] = [];
  const dropped: InterimConclusion[] = [];
  const hasPositive = (rel: string) => trace.conclusions.some((c) => c.relation === rel);
  for (const c of trace.conclusions) {
    // §9.4: below 0.50 a conclusion is not asserted — dropped, reported.
    if (c.confidence < 0.5) {
      dropped.push(c);
      continue;
    }
    let role: "load-bearing" | "supporting" = "supporting";
    if (loadBearingRelations.has(c.relation)) role = "load-bearing";
    if (intentType === "ontology_explanation" && decision.intent.variant === "sense-bridge" && c.relation === "GLOSS")
      role = "load-bearing";
    if (intentType === "comparison" && (c.relation === "PROFILE" || c.relation === "GLOSS" || c.relation === "DEFINED_AS"))
      role = "supporting";
    if (c.relation === "NO_PATH_TO" && hasPositive("HAS_QUALITY")) role = "supporting";
    if (role === "supporting" && mode === "plain" && intentType !== "comparison" && c.relation === "CLIMBS_TO") {
      // §9.2: in plain mode the climb usually goes unsaid.
      dropped.push(c);
      continue;
    }
    let rendering: PlannedConclusion["rendering"] = "direct";
    if (mode === "plain") {
      if (c.relation === "PROFILE") rendering = "manifestation";
      else if (isPrior(graph, c.objectId) || isPrior(graph, c.subjectId)) {
        rendering =
          intentType === "correspondence" ? "correspondence" : "manifestation";
        // A prior-level conclusion with no sanctioned phrases cannot be
        // said plainly at all: it is dropped, and reported (§9.2/§9.3).
        const priorId = isPrior(graph, c.objectId) ? c.objectId! : c.subjectId;
        if (
          rendering === "manifestation" &&
          manifestationsFor(graph, priorId).length === 0 &&
          c.relation !== "HAS_QUALITY"
        ) {
          dropped.push(c);
          continue;
        }
      }
    }
    selected.push({ conclusion: c, role, rendering, hedgeBand: hedgeBandOf(c.confidence) });
  }
  const antecedents: Record<string, string> = {};
  const subjectTerm = decision.terms.find((t) => t.slot === "subject");
  if (subjectTerm) {
    const id = subjectTerm.nodeId ?? subjectTerm.synsetId;
    if (id) antecedents["it"] = id;
  }
  return { mode, speechAct: "answer", selected, dropped, antecedents };
}

/* ------------------------------------------------------------------ */
/* Stage 2 — realisation (§9.4): template renderer                     */
/* ------------------------------------------------------------------ */

interface RealiseCtx {
  graph: Graph;
  plan: RenderPlan;
  decision: RouteDecision;
  usedManifestations: Set<string>;
}

function planned(plan: RenderPlan, relation: string): PlannedConclusion[] {
  return plan.selected.filter((p) => p.conclusion.relation === relation);
}

function subjectDisplay(rc: RealiseCtx, c: InterimConclusion): string {
  const node = rc.graph.getNode(c.subjectId);
  if (node?.type === "Synset") {
    const word = c.facts?.word;
    return typeof word === "string" ? word : node.name;
  }
  return node?.name ?? c.subjectId;
}

function phraseFor(
  rc: RealiseCtx,
  c: InterimConclusion,
  mode: SurfaceMode,
): string {
  const graph = rc.graph;
  const obj = nodeName(graph, c.objectId);
  const aspect = c.aspect ? `, in the aspect of ${c.aspect}` : "";
  switch (c.relation) {
    case "HAS_ELEMENT":
    case "ELEMENT_OF":
      return `the ${obj} element`;
    case "MUTUALLY_ROOTED_WITH":
      return `mutually rooted with ${obj}`;
    case "MAPPED_TO":
      return mode === "plain" ? `closely tied to ${obj}` : `mapped to ${obj}`;
    default:
      return `${obj}${aspect}`;
  }
}

function realiseDefinition(rc: RealiseCtx): string[] {
  const graph = rc.graph;
  const out: string[] = [];
  for (const p of [...planned(rc.plan, "GLOSS"), ...planned(rc.plan, "DEFINED_AS"), ...planned(rc.plan, "SUMMARY")]) {
    const c = p.conclusion;
    const node = graph.getNode(c.subjectId);
    if (!node) continue;
    if (node.type === "Synset") {
      const gloss = glossOf(graph, node);
      const word = typeof c.facts?.word === "string" ? c.facts.word : node.name;
      if (gloss) out.push(`${cap(gloss.replace(/\.$/, ""))}.`);
      const senseCount = typeof c.facts?.senseCount === "number" ? c.facts.senseCount : 1;
      if (senseCount > 1) {
        out.push(
          `"${cap(word)}" has other senses too — say more if you meant a different one.`,
        );
      }
    } else {
      const entry = c.objectId ? graph.getNode(c.objectId) : undefined;
      const base = entry?.definition ?? node.summary ?? "";
      const extra =
        node.summary && entry?.definition && node.summary !== entry.definition
          ? ` ${node.summary}`
          : "";
      if (base) out.push(base + extra);
    }
  }
  return out;
}

function realiseCausal(rc: RealiseCtx, mode: SurfaceMode): string[] {
  const graph = rc.graph;
  const out: string[] = [];
  for (const p of planned(rc.plan, "HAS_QUALITY")) {
    const c = p.conclusion;
    const subject = subjectDisplay(rc, c);
    const quality = nodeName(graph, c.objectId).toLowerCase();
    if (mode === "plain") {
      // §9.4 hedge bands: the sentence form follows the conclusion's band.
      const band = hedgeBandOf(c.confidence);
      if (band === "assert") out.push(`Yes — ${subject} is ${quality}.`);
      else if (band === "soften") out.push(`${cap(subject)} tends to be ${quality}.`);
      else out.push(`${cap(subject)} may be ${quality} in some cases.`);
      // Seasonal support from the shared prior's manifestations (§9.3).
      const node = graph.getNode(c.subjectId);
      const polarityId = (c.viaIds ?? []).find((id) => graph.getNode(id)?.type === "Polarity");
      if (band === "assert" && polarityId && node && (node.type === "Season" || node.type === "TimeOfDay")) {
        const phrases = manifestationsFor(graph, polarityId, "weather").filter(
          (ph) => ph !== quality,
        );
        if (phrases.length >= 2) {
          const scope = node.type === "Season" ? "time of year" : "part of the day";
          out.push(`It is the ${phrases[0]} and ${phrases[1]} ${scope}.`);
          phrases.slice(0, 2).forEach((ph) => rc.usedManifestations.add(ph));
        }
      }
    } else {
      // framework: the chain itself, from the supporting conclusions.
      const chain = rc.plan.selected
        .filter(
          (s) =>
            s.role === "supporting" &&
            ["ELEMENT_OF", "POLARITY_OF", "HAS_QUALITY", "HAS_POLARITY", "HAS_ELEMENT"].includes(
              s.conclusion.relation,
            ),
        )
        .map((s) => {
          const sc = s.conclusion;
          const sn = nodeName(graph, sc.subjectId);
          const on = nodeName(graph, sc.objectId);
          switch (sc.relation) {
            case "ELEMENT_OF":
              return `${sn} belongs to ${on}`;
            case "POLARITY_OF":
            case "HAS_POLARITY":
              return `${sn} is ${on}${sc.aspect ? ` in the aspect of ${sc.aspect}` : ""}`;
            case "HAS_QUALITY":
              return `${sn} carries the quality ${on.toLowerCase()}`;
            case "HAS_ELEMENT":
              return `${sn} belongs to the ${on} element`;
            default:
              return `${sn} — ${on}`;
          }
        });
      const climb = planned(rc.plan, "CLIMBS_TO")[0]?.conclusion;
      const head = `Yes — ${subject} is ${quality}.`;
      if (climb) {
        const anchorName = nodeName(graph, climb.objectId);
        const anchorSynset = typeof climb.facts?.anchorSynsetId === "string" ? climb.facts.anchorSynsetId : "";
        out.push(
          `${head} ${cap(subject)} is a kind of ${nodeName(graph, anchorSynset).toLowerCase()}, which is tied to ${anchorName} — and ${anchorName} leads to ${quality}.`,
        );
      } else if (chain.length > 0) {
        out.push(`${head} ${cap(chain.join("; "))}.`);
      } else {
        out.push(head);
      }
    }
  }
  for (const p of planned(rc.plan, "NO_PATH_TO")) {
    const c = p.conclusion;
    const subject = subjectDisplay(rc, c);
    const quality = nodeName(graph, c.objectId).toLowerCase();
    out.push(
      mode === "plain"
        ? `That doesn't hold in what I know — ${subject} doesn't lead to ${quality} there.`
        : `No — ${subject} does not derive ${quality}: nothing connects them at the current threshold.`,
    );
  }
  for (const p of planned(rc.plan, "FOLLOWED_BY")) {
    const c = p.conclusion;
    const subject = subjectDisplay(rc, c);
    const next = nodeName(graph, c.objectId);
    if (mode === "plain") {
      out.push(`${cap(next)} follows ${subject.toLowerCase()}.`);
    } else {
      const [el, nextEl] = (c.viaIds ?? []).map((id) => nodeName(graph, id));
      const nextNode = graph.getNode(c.objectId!);
      const tail = nextNode?.type === "Season" && el && nextEl
        ? ` — ${el} generates ${nextEl}, and ${nextEl} is the element of ${next.toLowerCase()}, so ${next.toLowerCase()} follows ${subject.toLowerCase()}`
        : "";
      out.push(`${cap(subject)} is ${el}.${tail ? "" : ""} In the mutual-generation cycle${tail}.`);
    }
  }
  // §7.4 D11: a partial answer states its limit conversationally.
  for (const p of planned(rc.plan, "UNANCHORED_TERM")) {
    const term = typeof p.conclusion.facts?.term === "string" ? p.conclusion.facts.term : "";
    if (!term) continue;
    const subject = subjectDisplay(rc, p.conclusion);
    out.push(
      mode === "plain"
        ? `I can't explain ${term} itself yet — only the ${subject.toLowerCase()} side of it.`
        : `Note: ${term} itself is not mapped yet; this covers ${subject} only.`,
    );
  }
  return out;
}

function realiseOntology(rc: RealiseCtx, mode: SurfaceMode): string[] {
  const graph = rc.graph;
  const out: string[] = [];
  const decision = rc.decision;
  const variant = decision.kind === "route" ? decision.intent.variant : undefined;

  // Sense-bridge (Fire branch 3): gloss + classification + profile.
  if (variant === "sense-bridge") {
    out.push(...realiseDefinition(rc));
    const bridge = planned(rc.plan, "MAPPED_TO")[0]?.conclusion;
    if (bridge) {
      const concept = nodeName(graph, bridge.subjectId);
      out.push(
        mode === "plain"
          ? `That is the everyday burning — different from ${concept} as a category.`
          : `In the framework, that phenomenon is classed under ${concept}.`,
      );
    }
    return out;
  }

  // Incoming classification (Fire branch 2).
  const incoming = rc.plan.selected.filter((p) => p.conclusion.facts?.direction === "incoming");
  if (incoming.length > 0) {
    const element = nodeName(graph, incoming[0].conclusion.objectId);
    const byElement = incoming
      .filter((p) => p.conclusion.relation === "ELEMENT_OF")
      .map((p) => nodeName(graph, p.conclusion.subjectId).toLowerCase());
    const byAssoc = incoming
      .filter((p) => p.conclusion.relation !== "ELEMENT_OF")
      .map((p) => nodeName(graph, p.conclusion.subjectId).toLowerCase());
    const parts: string[] = [];
    if (byElement.length) parts.push(`${joinList(byElement)} by element`);
    if (byAssoc.length) parts.push(`${joinList(byAssoc)} by association`);
    out.push(`Classed under ${element}: ${parts.join("; ")}.`);
    return out;
  }

  for (const p of planned(rc.plan, "POLARITY_CHECK")) {
    const c = p.conclusion;
    const subject = subjectDisplay(rc, c);
    const verdict = c.facts?.verdict;
    const actual = typeof c.facts?.actualPolarity === "string" ? nodeName(graph, c.facts.actualPolarity) : undefined;
    const asked = nodeName(graph, c.objectId);
    if (verdict === "yes") {
      out.push(
        mode === "plain"
          ? `Yes — ${subject} is on the ${manifestationsFor(graph, c.objectId!, "activity").slice(0, 2).join(" and ")} side.`
          : `Yes — ${subject} is ${asked}.`,
      );
    } else if (verdict === "no") {
      out.push(
        mode === "plain"
          ? `No — ${subject} runs the other way.`
          : `No — ${subject} is ${actual}, not ${asked}.`,
      );
    } else {
      out.push(
        `I don't have a settled reading for ${subject} yet — that sense isn't connected to anything more in what I know, so I won't claim it either way.`,
      );
    }
  }

  for (const p of planned(rc.plan, "NO_MAPPING")) {
    const subject = subjectDisplay(rc, p.conclusion);
    out.push(
      mode === "plain"
        ? `I don't have a settled reading of ${subject} yet.`
        : `${cap(subject)} has no settled place in the framework yet — any weaker associations are held back rather than asserted.`,
    );
  }
  for (const p of planned(rc.plan, "NO_ANCHOR")) {
    const c = p.conclusion;
    const node = graph.getNode(c.subjectId);
    const word = typeof c.facts?.word === "string" ? c.facts.word : (node?.name ?? c.subjectId);
    const gloss = node ? glossOf(graph, node) : undefined;
    out.push(
      `${cap(word)} is in the dictionary I use${gloss ? ` — "${gloss}"` : ""} — but I can't connect it to anything more yet.`,
    );
  }

  // The profile itself.
  const profile = rc.plan.selected.filter((p) =>
    ["ELEMENT_OF", "POLARITY_OF", "HAS_POLARITY", "HAS_ELEMENT", "HAS_TRIGRAM", "MUTUALLY_ROOTED_WITH", "MAPPED_TO"].includes(
      p.conclusion.relation,
    ),
  );
  if (profile.length > 0) {
    const subject = subjectDisplay(rc, profile[0].conclusion);
    const node = graph.getNode(profile[0].conclusion.subjectId);
    if (mode === "plain") {
      const phrases: string[] = [];
      for (const p of profile) {
        const objId = p.conclusion.objectId;
        if (!objId) continue;
        for (const ph of manifestationsFor(graph, objId)) {
          if (!phrases.includes(ph)) phrases.push(ph);
        }
        manifestationsFor(graph, objId).forEach((ph) => rc.usedManifestations.add(ph));
      }
      if (phrases.length > 0) {
        out.push(`In ordinary terms, ${subject} is ${joinList(phrases.slice(0, 4))}.`);
      }
    } else {
      const phrases = profile.map((p) => phraseFor(rc, p.conclusion, mode));
      out.push(`In this framework, ${subject} is associated with ${phrases.join("; ")}.`);
      if (node?.summary) out.push(`That fits because: ${node.summary}`);
      const rooted = profile.find((p) => p.conclusion.relation === "MUTUALLY_ROOTED_WITH");
      if (rooted) {
        out.push(
          `It is mutually rooted with ${nodeName(graph, rooted.conclusion.objectId)}: each contains the seed of the other.`,
        );
      }
    }
  }
  return out;
}

const CATEGORY_LABELS: Record<string, string> = {
  organ: "the body",
  sound: "sound",
  color: "colour",
  taste: "taste",
  direction: "direction",
  emotion: "feeling",
  season: "season",
  "time of day": "time of day",
};

function realiseCorrespondence(rc: RealiseCtx, mode: SurfaceMode): string[] {
  const graph = rc.graph;
  const out: string[] = [];
  const all = rc.plan.selected.filter((p) =>
    ["CORRESPONDS_TO", "ELEMENT_OF"].includes(p.conclusion.relation),
  );
  // §6.9 composition conclusions: the element's whole row, walked.
  const composed = planned(rc.plan, "COMPOSE_ENTRY");
  if (all.length === 0 && composed.length === 0) return out;
  // Category-scoped (the route selected one category): answer inside it.
  const askedCategory = rc.decision.kind === "route" ? rc.decision.intent.category : undefined;
  if (askedCategory) {
    const pool = composed.length > 0 ? composed : all;
    const element = nodeName(graph, pool[0].conclusion.objectId);
    const values = pool.map((p) => nodeName(graph, p.conclusion.subjectId).toLowerCase());
    const label = CATEGORY_LABELS[askedCategory] ?? askedCategory;
    const verb = mode === "plain" ? "goes with" : "corresponds to";
    out.push(`In ${label}, ${element} ${verb} ${joinList(values)}.`);
    return out;
  }
  // Reverse: subject is the correspondence value.
  const firstNode = all.length ? graph.getNode(all[0].conclusion.subjectId) : undefined;
  if (firstNode?.type === "Correspondence") {
    for (const p of all) {
      const value = nodeName(graph, p.conclusion.subjectId);
      const element = nodeName(graph, p.conclusion.objectId);
      out.push(
        mode === "plain"
          ? `${cap(value)} goes with ${element}.`
          : `${cap(value)} corresponds to ${element}.`,
      );
    }
    if (composed.length > 0) {
      // The composition walks outward from the element: render the row
      // in the forward grouped shape.
      const element = nodeName(graph, composed[0].conclusion.objectId);
      const groups = new Map<string, string[]>();
      for (const p of composed) {
        const cat = String(p.conclusion.facts?.category ?? "other");
        const list = groups.get(cat) ?? [];
        list.push(nodeName(graph, p.conclusion.subjectId).toLowerCase());
        groups.set(cat, list);
      }
      const parts = [...groups.entries()].map(([cat, values]) => {
        const label = CATEGORY_LABELS[cat] ?? cat;
        return `${label}: ${joinList(values)}`;
      });
      out.push(`What goes with ${element} — ${parts.join("; ")}.`);
    }
    return out;
  }
  // Forward: group by category.
  const element = nodeName(graph, all[0].conclusion.objectId);
  const groups = new Map<string, string[]>();
  for (const p of all) {
    const cat = typeof p.conclusion.facts?.category === "string" ? p.conclusion.facts.category : "other";
    const list = groups.get(cat) ?? [];
    list.push(nodeName(graph, p.conclusion.subjectId).toLowerCase());
    groups.set(cat, list);
  }
  if (groups.size === 1) {
    const [[cat, values]] = [...groups.entries()];
    const label = CATEGORY_LABELS[cat] ?? cat;
    out.push(`For ${label}, ${element} goes with ${joinList(values)}.`);
  } else {
    const parts = [...groups.entries()].map(([cat, values]) => {
      const label = CATEGORY_LABELS[cat] ?? cat;
      return `${label}: ${joinList(values)}`;
    });
    out.push(`What goes with ${element} — ${parts.join("; ")}.`);
  }
  return out;
}

function realiseAntonym(rc: RealiseCtx): string[] {
  const out: string[] = [];
  for (const p of planned(rc.plan, "ANTONYM_OF")) {
    const c = p.conclusion;
    const src = typeof c.facts?.sourceLemma === "string" ? c.facts.sourceLemma : subjectDisplay(rc, c);
    const tgt = typeof c.facts?.targetLemma === "string" ? c.facts.targetLemma : nodeName(rc.graph, c.objectId);
    out.push(`The opposite of ${src} is ${tgt}.`);
  }
  for (const p of planned(rc.plan, "NO_ANTONYM")) {
    out.push(`I don't have an opposite recorded for ${subjectDisplay(rc, p.conclusion)}.`);
  }
  return out;
}

function realisePartOf(rc: RealiseCtx): string[] {
  const graph = rc.graph;
  const out: string[] = [];
  for (const p of planned(rc.plan, "PART_OF_CHECK")) {
    const c = p.conclusion;
    const subject = subjectDisplay(rc, c);
    const other = nodeName(graph, c.objectId).toLowerCase();
    const verdict = c.facts?.verdict;
    out.push(
      verdict === "part-of"
        ? `Yes — ${subject} is part of the ${other}.`
        : verdict === "has-part"
          ? `${cap(subject)} has the ${other} as one of its parts — the other way round.`
          : `Not that I have recorded — ${subject} and the ${other} aren't linked as part and whole.`,
    );
  }
  const wholes = planned(rc.plan, "PART_OF").filter((p) => p.conclusion.facts?.direction === "whole");
  const parts = planned(rc.plan, "PART_OF").filter((p) => p.conclusion.facts?.direction === "component");
  if (wholes.length > 0) {
    const subject = subjectDisplay(rc, wholes[0].conclusion);
    const names = wholes.map((p) => nodeName(graph, p.conclusion.objectId).toLowerCase());
    out.push(`${cap(subject)} is part of ${joinList(names.map((n) => `the ${n}`))}.`);
  }
  if (parts.length > 0) {
    const subject = subjectDisplay(rc, parts[0].conclusion);
    const names = parts.map((p) => nodeName(graph, p.conclusion.objectId).toLowerCase());
    out.push(`${cap(subject)} has parts: ${joinList(names)}.`);
  }
  for (const p of planned(rc.plan, "NO_PART")) {
    const subject = subjectDisplay(rc, p.conclusion);
    out.push(
      p.conclusion.facts?.direction === "component"
        ? `I don't have parts recorded for ${subject}.`
        : `I don't have ${subject} placed inside anything larger yet.`,
    );
  }
  return out;
}

function profileQuality(rc: RealiseCtx, subjectId: string): string | undefined {
  const profile = rc.plan.selected.find(
    (p) => p.conclusion.relation === "PROFILE" && p.conclusion.subjectId === subjectId,
  );
  if (!profile) return undefined;
  const q = (profile.conclusion.viaIds ?? []).find(
    (id) => rc.graph.getNode(id)?.type === "Quality",
  );
  return q ? nodeName(rc.graph, q).toLowerCase() : undefined;
}

function realiseRelatedness(rc: RealiseCtx, mode: SurfaceMode): string[] {
  const graph = rc.graph;
  const out: string[] = [];
  for (const rel of ["RELATED_VIA", "SHARED_PRIOR", "OPPOSED_PRIOR", "COMMON_HYPERNYM", "IS_A", "ANTONYM_OF", "PART_OF", "SIMILAR_TO", "NO_RELATION"]) {
    for (const p of planned(rc.plan, rel)) {
      const c = p.conclusion;
      const a = subjectDisplay(rc, c);
      const b = nodeName(graph, c.objectId).toLowerCase();
      switch (rel) {
        case "RELATED_VIA": {
          if (mode === "plain") {
            const qa = profileQuality(rc, c.subjectId);
            const qb = c.objectId ? profileQuality(rc, c.objectId) : undefined;
            out.push(
              qa && qb
                ? `${cap(a)} and ${b} are opposite ends of the same cycle — ${a.toLowerCase()} is the ${qa} one, ${b} the ${qb} one.`
                : `${cap(a)} and ${b} sit at opposite ends of the same cycle.`,
            );
          } else {
            const rels = typeof c.facts?.pathRelation === "string" ? c.facts.pathRelation.split(">") : [];
            const nodes = [c.subjectId, ...(c.viaIds ?? []), c.objectId!];
            const verbFor = (r: string): string =>
              r === "MUTUAL_RESTRAINT"
                ? "restrains"
                : r === "MUTUAL_GENERATION"
                  ? "generates"
                  : r === "ELEMENT_OF"
                    ? "belongs to"
                    : r === "POLARITY_OF" || r === "HAS_POLARITY"
                      ? "is"
                      : "links to";
            const chainParts: string[] = [];
            for (let i = 0; i + 1 < nodes.length; i++) {
              const fromName = nodeName(graph, nodes[i]);
              const toName = nodeName(graph, nodes[i + 1]);
              chainParts.push(
                i === 0
                  ? `${cap(a)} ${verbFor(rels[i] ?? "")} ${toName}`
                  : `${fromName} ${verbFor(rels[i] ?? "")} ${toName}`,
              );
            }
            out.push(`${chainParts.join("; ")}.`);
          }
          break;
        }
        case "SHARED_PRIOR": {
          const prior = nodeName(graph, (c.viaIds ?? [])[0]);
          out.push(
            mode === "plain"
              ? `${cap(a)} and ${b} go together — they share the same character.`
              : `${cap(a)} and ${b} share the same prior: both belong to ${prior}.`,
          );
          break;
        }
        case "OPPOSED_PRIOR": {
          out.push(
            mode === "plain"
              ? `${cap(a)} and ${b} sit on opposite sides of the same pattern.`
              : `${cap(a)} and ${b} are opposed: ${nodeName(graph, (c.viaIds ?? [])[0])} against ${nodeName(graph, (c.viaIds ?? [])[1])}.`,
          );
          break;
        }
        case "COMMON_HYPERNYM": {
          const hyper = nodeName(graph, (c.viaIds ?? [])[0]).toLowerCase();
          out.push(`Both are kinds of ${hyper}.`);
          break;
        }
        case "IS_A":
          out.push(`${cap(a)} is a kind of ${b}.`);
          break;
        case "ANTONYM_OF":
          out.push(`${cap(a)} is the opposite of ${b}.`);
          break;
        case "PART_OF":
          out.push(`${cap(a)} is part of the ${b}.`);
          break;
        case "SIMILAR_TO":
          out.push(`${cap(a)} is similar to ${b}.`);
          break;
        case "NO_RELATION":
          out.push(`I don't have a connection recorded between ${a.toLowerCase()} and ${b} yet.`);
          break;
      }
    }
  }
  return out;
}

function realiseComparison(rc: RealiseCtx, mode: SurfaceMode): string[] {
  const graph = rc.graph;
  const out: string[] = [];
  out.push(...realiseDefinition(rc));
  const profiles = planned(rc.plan, "PROFILE");
  for (const p of profiles) {
    const c = p.conclusion;
    const name = subjectDisplay(rc, c);
    const element = (c.viaIds ?? []).find((id) => graph.getNode(id)?.type === "Element");
    const polarity = (c.viaIds ?? []).find((id) => graph.getNode(id)?.type === "Polarity");
    const quality = (c.viaIds ?? []).find((id) => graph.getNode(id)?.type === "Quality");
    if (mode === "framework" && (element || polarity)) {
      out.push(
        `${cap(name)} belongs to ${element ? nodeName(graph, element) : ""}${element && polarity ? ", " : ""}${polarity ? nodeName(graph, polarity) : ""}${quality ? `, and carries ${nodeName(graph, quality).toLowerCase()}` : ""}.`,
      );
    } else if (mode === "plain" && quality) {
      out.push(`${cap(name)} is the ${nodeName(graph, quality).toLowerCase()} one.`);
    }
  }
  out.push(...realiseRelatedness(rc, mode));
  return out;
}

function realiseSituation(rc: RealiseCtx, mode: SurfaceMode): string[] {
  const graph = rc.graph;
  const out: string[] = [];
  for (const p of rc.plan.selected) {
    const c = p.conclusion;
    const f = c.facts ?? {};
    switch (c.relation) {
      case "SITUATION_SELF": {
        const desc = typeof f.hostDescription === "string" ? f.hostDescription : "a program";
        const where =
          typeof f.locationLabel === "string"
            ? `The place I've been given is ${f.locationLabel}.`
            : `Nobody has told me where this machine is, so I don't know the place.`;
        out.push(`I'm ${desc}. ${where}`);
        break;
      }
      case "SEASON_HERE": {
        const season = nodeName(graph, c.subjectId).toLowerCase();
        const verdict = f.verdict;
        out.push(
          verdict === "no"
            ? `No — here it's ${season}.`
            : verdict === "yes"
              ? `Yes — it's ${season} here.`
              : `Here, it's ${season}.`,
        );
        break;
      }
      case "TIME_OF_DAY": {
        const phase = nodeName(graph, c.subjectId).toLowerCase();
        out.push(`It's ${phase} here just now.`);
        break;
      }
      case "SHADOW_SEASON": {
        const place = typeof f.place === "string" ? f.place : "there";
        const season = nodeName(graph, c.subjectId).toLowerCase();
        out.push(
          f.verdict === "no"
            ? `No — if you were in ${place}, it would be ${season} there. The seasons run opposite between the two hemispheres.`
            : `Yes — in ${place} it would be ${season} too.`,
        );
        break;
      }
      case "TONIGHT": {
        // SA-TONIGHT in its 2b canonical-fallback form: the season's
        // canonical light profile stands in for the night's length.
        out.push(
          f.band === "predominant"
            ? "Yes — tonight will be a long one here: the dark part of the day is at its longest stretch of the year."
            : f.band === "present"
              ? "Tonight is middling here — neither the longest nor the shortest stretch of the year."
              : "No — tonight is a short one here: the dark part of the day is near its shortest stretch of the year.",
        );
        break;
      }
      case "LOCATION_STATED": {
        const place = typeof f.place === "string" ? f.place : "there";
        const season = c.objectId ? nodeName(graph, c.objectId).toLowerCase() : undefined;
        out.push(
          season
            ? `Noted — ${place}. There, it's ${season} at the moment.`
            : `Noted — ${place}. I'll take "here" to mean there.`,
        );
        break;
      }
      default:
        break;
    }
    void mode;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Slice 2c realisers (§6.5 restraint, §6.7 degrees, §6.8 balance)     */
/* ------------------------------------------------------------------ */

function realiseRestraint(rc: RealiseCtx, mode: SurfaceMode): string[] {
  const graph = rc.graph;
  const out: string[] = [];
  for (const p of planned(rc.plan, "NO_RESTRAINT")) {
    out.push(
      `I don't have ${subjectDisplay(rc, p.conclusion)} classed under an element, so I can't name what restrains it.`,
    );
  }
  for (const p of planned(rc.plan, "RESTRAINED_BY")) {
    const c = p.conclusion;
    const restrainer = nodeName(graph, c.objectId);
    const elementId = typeof c.facts?.element === "string" ? c.facts.element : c.objectId;
    const element = nodeName(graph, elementId);
    if (mode === "plain") {
      const elPhrases = manifestationsFor(graph, elementId ?? "");
      const modPhrases = manifestationsFor(graph, c.objectId ?? "");
      elPhrases.forEach((ph) => rc.usedManifestations.add(ph));
      modPhrases.forEach((ph) => rc.usedManifestations.add(ph));
      out.push(
        `The ${elPhrases[0] ?? element.toLowerCase()} is held back by the ${joinList(modPhrases.slice(0, 2))} side of things.`,
      );
    } else if (c.subjectId === elementId) {
      out.push(
        `${element} is held back by ${restrainer} — in the restraint cycle, ${restrainer} restrains ${element}.`,
      );
    } else {
      out.push(
        `${cap(subjectDisplay(rc, c))} is classed under ${element}, and ${element} is held back by ${restrainer} — in the restraint cycle, ${restrainer} restrains ${element}.`,
      );
    }
  }
  return out;
}

function realiseDegreeCompare(rc: RealiseCtx, mode: SurfaceMode): string[] {
  const graph = rc.graph;
  const out: string[] = [];
  for (const p of planned(rc.plan, "NO_DEGREE_PROFILE")) {
    const f = p.conclusion.facts ?? {};
    const aspect = typeof f.aspect === "string" ? f.aspect : "light";
    out.push(
      `I don't have the ${aspect} side recorded for ${subjectDisplay(rc, p.conclusion)} and ${nodeName(graph, p.conclusion.objectId)}, so I can't set them side by side on it.`,
    );
  }
  for (const p of planned(rc.plan, "DEGREE_COMPARE")) {
    const c = p.conclusion;
    const f = c.facts ?? {};
    const a = subjectDisplay(rc, c);
    const b = nodeName(graph, c.objectId);
    const aspect = typeof f.aspect === "string" ? f.aspect : "light";
    const polarityId = typeof f.polarity === "string" ? f.polarity : "yin";
    const pol = nodeName(graph, polarityId);
    const aBand = typeof f.aBand === "string" ? f.aBand : "";
    const bBand = typeof f.bBand === "string" ? f.bBand : "";
    const verdict = typeof f.verdict === "string" ? f.verdict : "";
    const turningPoint = typeof f.turningPoint === "string" ? f.turningPoint : "";
    if (mode === "plain") {
      const phrases = manifestationsFor(graph, polarityId, aspect);
      phrases.forEach((ph) => rc.usedManifestations.add(ph));
      const more = verdict === "more" ? a : verdict === "less" ? b : undefined;
      if (more) {
        out.push(
          `${cap(more)} runs more to the ${joinList(phrases.slice(0, 2))} side than ${more === a ? b : a}.`,
        );
      } else {
        out.push(`${cap(a)} and ${b} run about the same on that side.`);
      }
      continue;
    }
    if (verdict === "more") {
      out.push(
        `Yes — on the ${aspect} side, ${a} is more ${pol} than ${b}: ${a}'s ${pol} share runs ${aBand} and ${b}'s ${bBand}.`,
      );
      if (turningPoint) out.push(`${cap(a)}'s ${pol} side runs longest at the ${turningPoint}.`);
    } else if (verdict === "less") {
      out.push(
        `No — on the ${aspect} side, ${b} is the more ${pol} of the two: ${b}'s ${pol} share runs ${bBand} and ${a}'s ${aBand}.`,
      );
      if (turningPoint) out.push(`${cap(b)}'s ${pol} side runs longest at the ${turningPoint}.`);
    } else {
      out.push(
        `About the same — on the ${aspect} side, ${a} and ${b} each run ${aBand} in ${pol} share.`,
      );
    }
  }
  return out;
}

function realiseBalance(rc: RealiseCtx, mode: SurfaceMode): string[] {
  const graph = rc.graph;
  const out: string[] = [];
  const seasonName = (p: PlannedConclusion) => subjectDisplay(rc, p.conclusion);
  const manifestations = planned(rc.plan, "CORRESPONDS_TO").filter(
    (p) => p.conclusion.facts?.viaBalance === "1",
  );
  const byCategory = (list: PlannedConclusion[]) => {
    const groups = new Map<string, string[]>();
    for (const p of list) {
      const cat = String(p.conclusion.facts?.category ?? "");
      const arr = groups.get(cat) ?? [];
      arr.push(nodeName(graph, p.conclusion.subjectId));
      groups.set(cat, arr);
    }
    return [...groups.entries()].map(
      ([cat, values]) => `${CATEGORY_LABELS[cat] ?? cat}: ${values.join(", ")}`,
    );
  };

  for (const p of planned(rc.plan, "NO_BASELINE")) {
    out.push(
      `I don't have a baseline recorded for ${seasonName(p)}, so there is no balance reading for it yet.`,
    );
  }
  for (const p of planned(rc.plan, "BALANCE_EXCESS")) {
    const c = p.conclusion;
    const f = c.facts ?? {};
    const elementId = typeof f.element === "string" ? f.element : c.objectId;
    const element = nodeName(graph, elementId);
    const subjectBand = typeof f.subjectBand === "string" ? f.subjectBand : "";
    const baselineBand = typeof f.baselineBand === "string" ? f.baselineBand : "";
    if (mode === "plain") {
      const gen = manifestationsFor(graph, elementId ?? "");
      gen.forEach((ph) => rc.usedManifestations.add(ph));
      // §6.8 honesty rule: plain mode shows what the excess looks like,
      // in manifestation phrases and ordinary words only — the body and
      // mood sets of the element's own dictionary entry (§9.3), plus
      // the correspondence values whose names are ordinary words.
      const specific: string[] = [];
      const entries = manifestations.filter((x) => x.conclusion.objectId === elementId);
      const byCat = (cat: string) => entries.find((x) => x.conclusion.facts?.category === cat);
      const organ = byCat("organ");
      if (organ) specific.push(nodeName(graph, organ.conclusion.subjectId).toLowerCase());
      const mood = manifestationsFor(graph, elementId ?? "", "mood");
      mood.slice(0, 2).forEach((ph) => {
        specific.push(ph);
        rc.usedManifestations.add(ph);
      });
      for (const cat of ["taste", "color", "direction"]) {
        const e2 = byCat(cat);
        if (e2) specific.push(nodeName(graph, e2.conclusion.subjectId).toLowerCase());
      }
      out.push(
        `In ${seasonName(p).toLowerCase()}, this profile runs ${joinList(gen.slice(0, 2))}${specific.length ? ` — ${joinList(specific.slice(0, 4))}` : ""}.`,
      );
    } else {
      out.push(
        `${element} runs in excess for ${seasonName(p)} — its share runs ${subjectBand} where the baseline runs ${baselineBand}.`,
      );
      const parts = byCategory(manifestations.filter((x) => x.conclusion.objectId === elementId));
      if (parts.length) out.push(`${element} in excess goes with — ${parts.join("; ")}.`);
    }
  }
  for (const p of planned(rc.plan, "BALANCE_DEFICIENCY")) {
    const c = p.conclusion;
    const f = c.facts ?? {};
    const elementId = typeof f.element === "string" ? f.element : c.objectId;
    const element = nodeName(graph, elementId);
    const subjectBand = typeof f.subjectBand === "string" ? f.subjectBand : "";
    const baselineBand = typeof f.baselineBand === "string" ? f.baselineBand : "";
    if (mode === "plain") {
      const gen = manifestationsFor(graph, elementId ?? "");
      gen.forEach((ph) => rc.usedManifestations.add(ph));
      out.push(
        `In ${seasonName(p).toLowerCase()}, this profile runs short on the ${joinList(gen.slice(0, 2))} side.`,
      );
    } else {
      out.push(
        `${element} runs in deficiency for ${seasonName(p)} — its share runs ${subjectBand} where the baseline runs ${baselineBand}.`,
      );
    }
  }
  for (const p of planned(rc.plan, "BALANCE_MODERATOR")) {
    const c = p.conclusion;
    const element = nodeName(graph, typeof c.facts?.forElement === "string" ? c.facts.forElement : undefined);
    const moderator = nodeName(graph, c.objectId);
    if (mode === "plain") {
      const phrases = manifestationsFor(graph, c.objectId ?? "");
      phrases.forEach((ph) => rc.usedManifestations.add(ph));
      out.push(`It is held back by the ${joinList(phrases.slice(0, 2))} side — rest, and quiet.`);
    } else {
      out.push(`It is held back by ${moderator} — ${moderator} restrains ${element}.`);
    }
  }
  for (const p of planned(rc.plan, "BALANCE_DOWNSTREAM")) {
    const c = p.conclusion;
    const element = nodeName(graph, typeof c.facts?.forElement === "string" ? c.facts.forElement : undefined);
    if (mode === "plain") {
      const phrases = manifestationsFor(graph, c.objectId ?? "");
      phrases.forEach((ph) => rc.usedManifestations.add(ph));
      out.push(`The excess runs on into the ${joinList(phrases.slice(0, 2))} side.`);
    } else {
      out.push(`The excess runs on into ${nodeName(graph, c.objectId)} — ${element} generates ${nodeName(graph, c.objectId)}.`);
    }
  }
  for (const p of planned(rc.plan, "BALANCE_SUPPORT")) {
    const c = p.conclusion;
    const element = nodeName(graph, typeof c.facts?.forElement === "string" ? c.facts.forElement : undefined);
    out.push(`What supports it is ${nodeName(graph, c.objectId)} — ${nodeName(graph, c.objectId)} generates ${element}.`);
  }
  for (const p of planned(rc.plan, "BALANCE_IN_RANGE")) {
    out.push(
      `This profile runs inside the ${seasonName(p)} baseline — no element runs in excess or in deficiency.`,
    );
  }
  return out;
}

/* Slice 2d realiser (§5): frame structure questions. Frame names and
 * element names are data, not framework vocabulary — they are named in
 * every mode; what changes is only the framing sentence. */
function realiseFrame(rc: RealiseCtx, mode: SurfaceMode): string[] {
  const graph = rc.graph;
  const decision = rc.decision;
  if (decision.kind !== "route") return [];
  const variant = decision.intent.variant ?? "participants";
  const frameC = planned(rc.plan, "FRAME")[0]?.conclusion;
  const frameName = frameC ? nodeName(graph, frameC.subjectId) : "";
  const feCs = planned(rc.plan, "HAS_FRAME_ELEMENT");
  const feNames = feCs.map((p) => nodeName(graph, p.conclusion.objectId));
  const coreNames = feCs
    .filter((p) => p.conclusion.facts?.core === 1)
    .map((p) => nodeName(graph, p.conclusion.objectId));
  const evokes = planned(rc.plan, "EVOKES");
  const out: string[] = [];

  if (variant === "evokers") {
    const lemmas = [
      ...new Set(evokes.map((p) => String(p.conclusion.facts?.lemma ?? ""))),
    ].filter(Boolean);
    if (lemmas.length === 0) return out;
    const shown = lemmas.slice(0, 14);
    out.push(
      `${frameName} is evoked by ${joinList(shown)}${lemmas.length > shown.length ? ", and more besides" : ""}.`,
    );
    return out;
  }

  if (variant === "frame_of") {
    const ev = evokes[0]?.conclusion;
    const lemma = ev ? String(ev.facts?.lemma ?? "") : "";
    if (lemma) out.push(`${cap(lemma)} evokes the ${frameName} frame.`);
    if (feNames.length > 0) out.push(`Its participants are ${joinList(feNames)}.`);
    return out;
  }

  // participants
  if (feNames.length === 0) return out;
  out.push(
    mode === "framework"
      ? `${frameName} has these participants: ${joinList(feNames)}.`
      : `The participants are ${joinList(feNames)}.`,
  );
  if (coreNames.length > 0 && coreNames.length < feNames.length) {
    out.push(
      mode === "framework"
        ? `The core roles are ${joinList(coreNames)}.`
        : `The central roles are ${joinList(coreNames)}.`,
    );
  }
  return out;
}

function realiseAnswer(rc: RealiseCtx, mode: SurfaceMode): string {
  const decision = rc.decision;
  if (decision.kind !== "route") return "";
  const sentences: string[] = [];
  switch (decision.intent.intentType) {
    case "definition":
      sentences.push(...realiseDefinition(rc));
      break;
    case "causal_chain": {
      const causal = realiseCausal(rc, mode);
      // A causal route that degraded to an ontology profile (no quality
      // asked, or a D11 partial) renders its profile conclusions through
      // the ontology templates.
      const hasCausalCore = rc.plan.selected.some((p) =>
        ["HAS_QUALITY", "NO_PATH_TO", "FOLLOWED_BY"].includes(p.conclusion.relation),
      );
      if (!hasCausalCore) sentences.push(...realiseOntology(rc, mode), ...causal);
      else sentences.push(...causal);
      break;
    }
    case "ontology_explanation":
      sentences.push(...realiseOntology(rc, mode));
      break;
    case "correspondence":
      sentences.push(...realiseCorrespondence(rc, mode));
      break;
    case "antonym_lookup":
      sentences.push(...realiseAntonym(rc));
      break;
    case "part_of":
      sentences.push(...realisePartOf(rc));
      break;
    case "relatedness":
      sentences.push(...realiseRelatedness(rc, mode));
      break;
    case "comparison":
      sentences.push(...realiseComparison(rc, mode));
      break;
    case "situation":
      sentences.push(...realiseSituation(rc, mode));
      break;
    case "restraint":
      sentences.push(...realiseRestraint(rc, mode));
      break;
    case "degree_compare":
      sentences.push(...realiseDegreeCompare(rc, mode));
      break;
    case "balance":
      sentences.push(...realiseBalance(rc, mode));
      break;
    case "frame_participants":
      sentences.push(...realiseFrame(rc, mode));
      break;
    default:
      sentences.push(...realiseDefinition(rc));
      break;
  }
  return sentences.filter((s) => s.trim().length > 0).join(" ");
}

function realiseClarify(decision: Extract<RouteDecision, { kind: "clarify" }>): string {
  const lines = [decision.question];
  decision.branches.forEach((b, i) => {
    lines.push(`${i + 1}. ${b.label}${b.detail ? ` — ${b.detail}` : ""}`);
  });
  return lines.join("\n");
}

function realiseDecline(decision: Extract<RouteDecision, { kind: "decline" }>): string {
  const parts = [decision.userMessage];
  const offers = decision.alternatives.map((a) => a.label);
  if (offers.length > 0) {
    parts.push(`If it helps, I can ${joinList(offers)}.`);
  }
  return parts.join(" ");
}

/* ------------------------------------------------------------------ */
/* Stage 3 — verification (§9.5)                                       */
/* ------------------------------------------------------------------ */

const FILLER = new Set(
  (
    "the a an and or but if then than that this these those it its it's is are was were be been being " +
    "of to in on for with as at by from into about over under between through during " +
    "i you he she we they me him her us them my your his their our mine yours " +
    "what which who whom when where why how do does did can could may might shall should will would " +
    "not no yes so too very just also only even still yet already " +
    "one two three four five six seven eight nine ten first second " +
    "there here now then out up down off again further once " +
    "say says said mean means meant more most other another same different some far got"
  ).split(" "),
);

const HEDGE_WORDS = new Set(["tends", "tend", "usually", "generally", "often", "may", "can", "sometimes"]);

/** Words the templates themselves use to phrase relations (§9.4). */
const TEMPLATE_WORDS = new Set(
  (
    "belongs belong belonging goes go going part parts whole kind kinds opposite corresponds corresponding " +
    "classed cycle generates restrains share shared character side sides ends end same pattern tied set " +
    "leads lead connected connection recorded place inside anything larger yet either way round has have " +
    "dictionary use can't don't doesn't won't isn't isn't settled reading claim settled place held back " +
    "rather asserted weaker associations ordinary terms fits because mutually rooted contains seed each " +
    "other everyday burning different category phenomenon framework tied close closely time year day part " +
    "helps if what about noted take mean there moment just now running server program machine nobody " +
    "told given taken taken opposite run runs opposite ends longest shortest " +
    "explain explains itself dark stretch middling covers note unmapped resting quiet " +
    "associated association mapped element elements sense know enough cases worked rest haven haven't " +
    // Slice 2d (§5): the frame templates' own vocabulary.
    "participants roles role evoked evokes evoking frame frames involved central core besides"
  ).split(" "),
);

function tokensOf(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z'-]*/g) ?? []).map((t) => t.replace(/'s$/, ""));
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

interface InternalViolation extends RenderViolation {
  loadBearing: boolean;
}

function buildVocab(rc: RealiseCtx, ctx: RenderContext): { tokens: Set<string>; numbers: Set<string> } {
  const graph = rc.graph;
  const tokens = new Set<string>([...FILLER, ...HEDGE_WORDS, ...TEMPLATE_WORDS]);
  const numbers = new Set<string>();
  const addText = (t: string | undefined) => {
    if (!t) return;
    for (const tok of tokensOf(t)) tokens.add(tok);
    for (const num of t.match(/\d+(?:\.\d+)?/g) ?? []) numbers.add(num);
  };
  addText(ctx.trace.question);
  const addNode = (id: string | undefined, withGloss: boolean) => {
    if (!id) return;
    const node = graph.getNode(id);
    if (!node) return;
    addText(node.name);
    for (const s of graph.synonymsOf(node)) addText(s);
    const lemmas = node.properties["lemmas"];
    if (Array.isArray(lemmas)) for (const l of lemmas) addText(String(l));
    if (withGloss) addText(glossOf(graph, node));
  };
  for (const p of rc.plan.selected) {
    const c = p.conclusion;
    addNode(c.subjectId, true);
    addNode(c.objectId, c.relation === "GLOSS" || c.relation === "DEFINED_AS");
    for (const v of c.viaIds ?? []) addNode(v, false);
    if (c.facts) {
      for (const v of Object.values(c.facts)) {
        if (typeof v === "number") numbers.add(String(v));
        else addText(v);
      }
      // The renderer's own category labels are sanctioned template
      // vocabulary (§9.4): when a conclusion carries a category, the
      // label the templates print for it ("colour", "the body") traces.
      const cat = c.facts.category;
      if (typeof cat === "string" && CATEGORY_LABELS[cat]) addText(CATEGORY_LABELS[cat]);
    }
    if (p.rendering === "manifestation") {
      for (const id of [c.subjectId, c.objectId, ...(c.viaIds ?? [])]) {
        if (!id) continue;
        for (const aspect of [undefined, "weather", "mood", "activity", "body", "light"]) {
          for (const ph of manifestationsFor(graph, id, aspect)) addText(ph);
        }
      }
    }
  }
  for (const ph of rc.usedManifestations) addText(ph);
  if (ctx.decision.kind === "clarify") {
    addText(ctx.decision.question);
    for (const b of ctx.decision.branches) {
      addText(b.label);
      addText(b.detail);
    }
  }
  if (ctx.decision.kind === "decline") {
    addText(ctx.decision.userMessage);
    for (const a of ctx.decision.alternatives) addText(a.label);
  }
  // Word forms of allowed lemmas are traced through the forms index (§9.5:
  // "dictionary forms" — the same closed data the router resolves with).
  if (ctx.extract) {
    const surfaces: string[] = [];
    for (const [surface, cands] of ctx.extract.forms) {
      if (cands.some((cand) => tokens.has(cand.lemma))) surfaces.push(surface);
    }
    for (const s of surfaces) addText(s);
  }
  return { tokens, numbers };
}

function leakageScan(
  text: string,
  mode: SurfaceMode,
  question: string,
): InternalViolation[] {
  if (mode === "debug") return [];
  const violations: InternalViolation[] = [];
  const qTokens = new Set(tokensOf(question));
  const push = (sentence: string, detail: string, loadBearing: boolean) =>
    violations.push({ stage: "leakage", sentence, detail, resolution: "repaired", loadBearing });
  const sentences = splitSentences(text);
  const frameworkTerms: [RegExp, string][] = [
    [/\bwuxing\b/i, "wuxing"],
    [/\bfive elements\b/i, "five elements"],
    [/\b(Qian|Kun|Zhen|Xun|Kan|Li|Gen|Dui)\b/, "trigram name"],
    [/\bin this framework\b/i, "in this framework"],
    [/\bin this system\b/i, "in this system"],
    [/\bderived, not stored\b/i, "derived, not stored"],
    [/\bthe graph\b/i, "the graph"],
    [/\bis mapped to\b/i, "is mapped to"],
    [/\bthe ontology\b/i, "the ontology"],
  ];
  for (const sentence of sentences) {
    const found = new Set<string>();
    const test = (re: RegExp, detail: string) => {
      if (re.test(sentence) && !found.has(detail)) {
        found.add(detail);
        push(sentence, detail, false);
      }
    };
    if (mode === "plain") {
      for (const w of ["yin", "yang"]) {
        if (!qTokens.has(w)) test(new RegExp(`\\b${w}\\b`, "i"), w);
      }
      for (const [re, detail] of frameworkTerms) test(re, detail);
      // Element names used as framework terms: capitalised, mid-sentence,
      // and not words the user themselves used (§9.5 licensed exception).
      for (const m of sentence.matchAll(/\b(Wood|Fire|Earth|Metal|Water)\b/g)) {
        const idx = m.index ?? 0;
        const sentenceInitial = sentence.slice(0, idx).trim().length === 0;
        if (!sentenceInitial && !qTokens.has(m[1].toLowerCase())) {
          test(new RegExp(`\\b${m[1]}\\b`), `element name ${m[1]}`);
        }
      }
    }
    test(/\b[A-Z][A-Z_]{3,}\b/, "edge-type name");
    test(/wn-[nva]\d{8}/, "synset id");
    test(/\bD\d{1,2}\b/, "decision code");
    test(/\bRPS-\d+/, "case id");
    if (mode === "plain" || mode === "framework") {
      for (const m of sentence.matchAll(/\d+\.\d+/g)) {
        if (!question.includes(m[0])) test(/\d+\.\d+/, "confidence numeral");
      }
    }
  }
  // Load-bearing flag: a leaking sentence that carries a selected
  // conclusion's object name is load-bearing for repair purposes.
  return violations;
}

function faithfulnessScan(
  text: string,
  rc: RealiseCtx,
  ctx: RenderContext,
): InternalViolation[] {
  const { tokens, numbers } = buildVocab(rc, ctx);
  const violations: InternalViolation[] = [];
  const loadBearingNames = new Set<string>();
  for (const p of rc.plan.selected) {
    if (p.role !== "load-bearing") continue;
    for (const id of [p.conclusion.subjectId, p.conclusion.objectId]) {
      if (!id) continue;
      for (const tok of tokensOf(nodeName(rc.graph, id))) loadBearingNames.add(tok);
    }
  }
  for (const sentence of splitSentences(text)) {
    const bad: string[] = [];
    for (const tok of tokensOf(sentence)) {
      if (tok.length < 3) continue;
      if (!tokens.has(tok)) bad.push(tok);
    }
    for (const num of sentence.match(/\d+(?:\.\d+)?/g) ?? []) {
      if (!numbers.has(num) && !/^\d+$/.test(num)) bad.push(num);
      else if (!numbers.has(num) && Number(num) > 12 && ctx.decision.kind === "route") bad.push(num);
    }
    for (const detail of [...new Set(bad)]) {
      violations.push({
        stage: "faithfulness",
        sentence,
        detail: `untraceable: ${detail}`,
        resolution: "repaired",
        loadBearing: tokensOf(sentence).some((t) => loadBearingNames.has(t)),
      });
    }
  }
  return violations;
}

/* ------------------------------------------------------------------ */
/* Minimal fallback (§9.5 step 2): load-bearing conclusions only       */
/* ------------------------------------------------------------------ */

function minimalFallback(rc: RealiseCtx, mode: SurfaceMode): string {
  const graph = rc.graph;
  const decision = rc.decision;
  if (decision.kind === "clarify") {
    const [b1, b2] = decision.branches;
    return b2
      ? `Do you mean ${b1.label} or ${b2.label}?`
      : `Do you mean ${b1?.label ?? "something else"}?`;
  }
  if (decision.kind === "decline") return "I don't know enough about that yet.";
  const load = rc.plan.selected.filter((p) => p.role === "load-bearing");
  const parts: string[] = [];
  for (const p of load) {
    const c = p.conclusion;
    const subject = subjectDisplay(rc, c);
    switch (c.relation) {
      case "GLOSS":
      case "DEFINED_AS":
      case "SUMMARY": {
        const node = graph.getNode(c.subjectId);
        const gloss = node ? glossOf(graph, node) : undefined;
        if (gloss) parts.push(`${cap(gloss.replace(/\.$/, ""))}.`);
        break;
      }
      case "HAS_QUALITY":
        parts.push(`${cap(subject)} is ${nodeName(graph, c.objectId).toLowerCase()}.`);
        break;
      case "ANTONYM_OF":
        parts.push(`The opposite of ${subject} is ${typeof c.facts?.targetLemma === "string" ? c.facts.targetLemma : nodeName(graph, c.objectId)}.`);
        break;
      case "PART_OF":
        parts.push(`${cap(subject)} is part of the ${nodeName(graph, c.objectId).toLowerCase()}.`);
        break;
      case "CORRESPONDS_TO":
        parts.push(
          mode === "plain"
            ? `${cap(subject)} goes with ${manifestationsFor(graph, c.objectId!)[0] ?? "its counterpart"}.`
            : `${cap(subject)} corresponds to ${nodeName(graph, c.objectId)}.`,
        );
        break;
      default: {
        if (mode === "plain") {
          const phrases: string[] = [];
          for (const id of [c.objectId, c.subjectId]) {
            if (!id) continue;
            for (const ph of manifestationsFor(graph, id)) {
              if (!phrases.includes(ph)) phrases.push(ph);
            }
          }
          if (phrases.length) parts.push(`${cap(subject)}: ${joinList(phrases.slice(0, 3))}.`);
        } else {
          parts.push(`${cap(subject)} — ${nodeName(graph, c.objectId)}.`);
        }
        break;
      }
    }
  }
  return parts.join(" ") || "I don't know enough about that yet.";
}

/* ------------------------------------------------------------------ */
/* Debug realisation: the slice-1/2a presentation, from conclusions    */
/* (§9.1 — the legacy templates' wording, rebuilt on structured data)  */
/* ------------------------------------------------------------------ */

function debugPhrase(graph: Graph, c: InterimConclusion): string {
  const obj = nodeName(graph, c.objectId);
  const kind =
    c.relation === "HAS_ELEMENT" || c.relation === "ELEMENT_OF"
      ? `the ${obj} element`
      : c.relation === "MUTUALLY_ROOTED_WITH"
        ? `mutually rooted with ${obj}`
        : c.relation === "MAPPED_TO"
          ? `mapped to ${obj}`
          : obj;
  const aspect = c.aspect ? `, in the aspect of ${c.aspect}` : "";
  const conf =
    c.facts?.atomic === 1 ? "" : ` (confidence ${c.confidence.toFixed(2)})`;
  return `${kind}${aspect}${conf}`;
}

function definitionText(graph: Graph, node: GraphNode): string {
  if (node.type === "Synset") {
    const gloss = node.properties["gloss"];
    return typeof gloss === "string" ? gloss : `${node.name}: no gloss recorded.`;
  }
  const defEdge = graph.outEdges(node.id, "DEFINED_AS")[0];
  const entry = defEdge ? graph.getNode(defEdge.to) : undefined;
  const base = entry?.definition ?? node.summary ?? `${node.name}: no definition recorded yet.`;
  const extra =
    node.summary && entry?.definition && node.summary !== entry.definition ? ` ${node.summary}` : "";
  return base + extra;
}

function realiseDebug(ctx: RenderContext): string {
  const { graph, trace, decision } = ctx;
  if (decision.kind !== "route") {
    // Debug presentation of a clarify/decline: the stored content, plainly.
    return decision.kind === "clarify"
      ? realiseClarify(decision)
      : realiseDecline(decision);
  }
  const intent = decision.intent;
  const conclusions = trace.conclusions;
  const byRel = (rel: string) => conclusions.filter((c) => c.relation === rel);
  const stepPath = (c: InterimConclusion): string => {
    const step = trace.steps.find((s) => s.conclusion?.id === c.id);
    return step?.paths[0] ?? "";
  };
  if (intent.matchedNodes.length === 0) {
    return "I don't have anything in the graph that matches that yet. The graph grows by ingestion and curation; this concept has not been mapped onto the ontology.";
  }
  const subjectNode = graph.getNode(intent.matchedNodes[0]);
  const name = (id?: string) => (id ? (graph.getNode(id)?.name ?? id) : "");

  if (intent.intentType === "definition" || intent.intentType === "unknown") {
    const gloss = byRel("GLOSS")[0];
    if (gloss) {
      const node = graph.getNode(gloss.subjectId)!;
      const word = typeof gloss.facts?.word === "string" ? gloss.facts.word : node.name;
      let text = `${word}: ${definitionText(graph, node)}`;
      const senseCount = typeof gloss.facts?.senseCount === "number" ? gloss.facts.senseCount : 1;
      if (senseCount > 1) {
        const mapped = graph.inEdges(node.id, "MAPPED_TO").length > 0;
        text += ` (WordNet lists ${senseCount} senses for "${word}" here; ${mapped ? "this is the sense the ontology maps" : "this is the first"}.)`;
      }
      return text;
    }
    const def = byRel("DEFINED_AS")[0] ?? byRel("SUMMARY")[0];
    if (def && subjectNode) return definitionText(graph, subjectNode);
  }

  if (intent.intentType === "causal_chain") {
    const cycle = byRel("FOLLOWED_BY")[0];
    if (cycle) {
      const el = name(cycle.viaIds?.[0]);
      const nextEl = name(cycle.viaIds?.[1]);
      const nextNode = graph.getNode(cycle.objectId!);
      const tail =
        nextNode?.type === "Season"
          ? `, and ${nextEl} is the element of ${nextNode.name.toLowerCase()} — so ${nextNode.name.toLowerCase()} follows ${name(cycle.subjectId).toLowerCase()}`
          : "";
      return `${name(cycle.subjectId)} is ${el}. In the mutual-generation cycle, ${el} generates ${nextEl}${tail}. Path: ${stepPath(cycle)}.`;
    }
    const join = byRel("HAS_QUALITY")[0];
    const climb = byRel("CLIMBS_TO")[0];
    const quality = join ? name(join.objectId).toLowerCase() : "";
    if (join && climb) {
      const word = typeof climb.facts?.word === "string" ? climb.facts.word : name(climb.subjectId);
      const hops = typeof climb.facts?.hops === "number" ? climb.facts.hops : 0;
      const anchorSynsetId = typeof climb.facts?.anchorSynsetId === "string" ? climb.facts.anchorSynsetId : "";
      const anchorSynset = graph.getNode(anchorSynsetId);
      const anchorName = name(climb.objectId);
      const via = join.viaIds ?? [];
      const anchorIdx = via.indexOf(climb.objectId!);
      const priors = via
        .slice(anchorIdx + 1)
        .map((id) => name(id))
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(" and ");
      return (
        `Yes — ${word} is ${quality} in this system, derived through WordNet, not stored: ` +
        `${word} climbs ${hops} IS_A step${hops === 1 ? "" : "s"} to ${anchorSynset?.name ?? anchorSynsetId} (${anchorSynsetId}), ` +
        `the sense mapped to ${anchorName}, and ${anchorName} and ${quality} meet at the shared prior${priors ? ` (${priors})` : ""}. ` +
        `Path: ${stepPath(join)}.`
      );
    }
    if (join) {
      const priors = (join.viaIds ?? [])
        .map((id) => name(id))
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(" and ");
      const subjName = name(join.subjectId);
      return (
        `Yes — ${subjName.toLowerCase()} is ${quality} in this system, and that is derived, not stored: ` +
        `${subjName} and ${quality} meet at the shared prior${priors ? ` (${priors})` : ""}. ` +
        `Path: ${stepPath(join)}. No direct ${subjName}→${quality} fact exists in the graph; the association follows from the ontology.`
      );
    }
    const noPath = byRel("NO_PATH_TO")[0];
    if (noPath) {
      const threshold = typeof noPath.facts?.threshold === "number" ? noPath.facts.threshold : intent.confidenceThreshold;
      return `The graph derives no path from ${name(noPath.subjectId)} to ${name(noPath.objectId)} at confidence ≥ ${threshold.toFixed(2)}, so I won't assert that association.`;
    }
    const noAnchor = byRel("NO_ANCHOR")[0];
    if (noAnchor) {
      const node = graph.getNode(noAnchor.subjectId);
      const word = typeof noAnchor.facts?.word === "string" ? noAnchor.facts.word : name(noAnchor.subjectId);
      const qualityNode = intent.matchedNodes
        .map((id) => graph.getNode(id))
        .find((nd) => nd?.type === "Quality");
      return `The graph derives no path from ${word} to ${qualityNode?.name}: in WordNet, ${word} means "${node ? definitionText(graph, node) : ""}", and neither that sense nor its hypernym chain (6 IS_A hops) reaches a concept mapped onto the ontology, so I won't assert that association.`;
    }
  }

  if (intent.intentType === "ontology_explanation") {
    const noMapping = byRel("NO_MAPPING")[0];
    if (noMapping && subjectNode) {
      return `${subjectNode.name} has no ontology mappings that pass the confidence threshold (${intent.confidenceThreshold.toFixed(2)}). Any weaker mappings are held back rather than asserted.`;
    }
    const noAnchor = byRel("NO_ANCHOR")[0];
    if (noAnchor) {
      const node = graph.getNode(noAnchor.subjectId);
      const word = typeof noAnchor.facts?.word === "string" ? noAnchor.facts.word : name(noAnchor.subjectId);
      return `${word} is in WordNet — "${node ? definitionText(graph, node) : ""}" — but neither it nor its hypernym chain (6 IS_A hops) reaches a concept mapped onto the ontology yet.`;
    }
    const climb = byRel("CLIMBS_TO")[0];
    if (climb) {
      const word = typeof climb.facts?.word === "string" ? climb.facts.word : name(climb.subjectId);
      const anchorSynsetId = typeof climb.facts?.anchorSynsetId === "string" ? climb.facts.anchorSynsetId : "";
      const anchorSynset = graph.getNode(anchorSynsetId);
      const anchorName = name(climb.objectId);
      const phrases = conclusions
        .filter((c) => c.subjectId === climb.objectId)
        .map((c) => debugPhrase(graph, c));
      const anchorNode = graph.getNode(climb.objectId!);
      const climbStep = trace.steps.find((s) => s.conclusion?.id === climb.id);
      return (
        `${word} is not mapped directly. Through WordNet it is a kind of ${anchorSynset?.name ?? anchorSynsetId} ` +
        `(${anchorSynsetId}) — the sense this graph maps to ${anchorName}. ` +
        `In this framework, ${anchorName} is associated with ${phrases.join("; ")}.` +
        `${anchorNode?.summary ? ` That fits because: ${anchorNode.summary}` : ""} ` +
        `WordNet path: ${climbStep?.paths[0] ?? ""}.`
      );
    }
    // The profiled subject is whoever the profile conclusions are about —
    // matchedNodes[0] may be a framework term the question only mentions
    // ("the yin yang polarity of bass" matches Yang first).
    const PROFILE_RELATIONS = ["HAS_POLARITY", "HAS_ELEMENT", "HAS_TRIGRAM", "MAPPED_TO", "MUTUALLY_ROOTED_WITH", "POLARITY_OF", "ELEMENT_OF"];
    const profileSubjectId =
      conclusions.find((c) => PROFILE_RELATIONS.includes(c.relation))?.subjectId ??
      subjectNode?.id;
    const profileNode = profileSubjectId ? graph.getNode(profileSubjectId) : undefined;
    if (profileNode) {
      const profile = conclusions.filter(
        (c) => c.subjectId === profileNode.id && PROFILE_RELATIONS.includes(c.relation),
      );
      const phrases = profile.map((c) => debugPhrase(graph, c));
      const rooted = profile.find((c) => c.relation === "MUTUALLY_ROOTED_WITH");
      const extra = rooted
        ? ` It is mutually rooted with ${name(rooted.objectId)}: each contains the seed of the other.`
        : "";
      return `In this framework, ${profileNode.name} is associated with ${phrases.join("; ")}.${profileNode.summary ? ` That fits because: ${profileNode.summary}` : ""}${extra}`;
    }
  }

  if (intent.intentType === "comparison") {
    const parts: string[] = [];
    for (const id of intent.matchedNodes.slice(0, 3)) {
      const node = graph.getNode(id);
      if (node) parts.push(`${node.name}: ${definitionText(graph, node)}`);
    }
    const sentences = parts.join(" ").split(/(?<=\.)\s+/);
    const kept = sentences.filter((s) => !/\b(Yin|Yang|Wood|Fire|Earth|Metal|Water|Wuxing|trigram|hexagram)\b/.test(s));
    return (kept.length ? kept : sentences.slice(0, 1)).join(" ").trim();
  }

  // Router-only intents: serialise conclusions + paths (the §7.1 debug
  // presentation — intent, resolved ids, paths, evidence).
  const lines: string[] = [];
  for (const c of conclusions) {
    lines.push(
      `${name(c.subjectId) || c.subjectId} —${c.relation}→ ${c.objectId ? name(c.objectId) || c.objectId : ""} (confidence ${c.confidence.toFixed(2)})`,
    );
  }
  for (const step of trace.steps) {
    for (const p of step.paths) lines.push(`Path: ${p}`);
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* renderAnswer: the three stages as one pure function                 */
/* ------------------------------------------------------------------ */

export function renderAnswer(ctx: RenderContext): RenderedAnswer {
  const mode = ctx.modeOverride ?? ctx.decision.surfaceMode;
  if (mode === "debug") {
    // §9.2: planning is bypassed in debug; stage 3 reports but the
    // debug presentation is allowed to contain everything (§9.5).
    return { text: realiseDebug(ctx), mode, droppedConclusions: [], violations: [] };
  }
  const plan = planRender(ctx.graph, ctx.trace, ctx.decision, mode);
  const rc: RealiseCtx = {
    graph: ctx.graph,
    plan,
    decision: ctx.decision,
    usedManifestations: new Set<string>(),
  };
  let text: string;
  if (ctx.realiseOverride) {
    text = ctx.realiseOverride(plan, ctx);
  } else if (ctx.decision.kind === "clarify") {
    text = realiseClarify(ctx.decision);
  } else if (ctx.decision.kind === "decline") {
    text = realiseDecline(ctx.decision);
  } else {
    text = realiseAnswer(rc, mode);
  }
  if (ctx.trace.boundHit && ctx.decision.kind === "route") {
    text = `${text} That's as far as I got with that one — the rest I haven't worked through.`;
  }
  if (!text.trim()) {
    text = minimalFallback(rc, mode);
  }

  let violations: InternalViolation[] = [
    ...leakageScan(text, mode, ctx.trace.question),
    ...faithfulnessScan(text, rc, ctx),
  ];
  if (violations.length > 0) {
    const sentences = splitSentences(text);
    const badSentences = new Set(violations.map((v) => v.sentence));
    const loadBearingHit = violations.some((v) => v.loadBearing);
    const kept = sentences.filter((s) => !badSentences.has(s));
    if (!loadBearingHit && kept.length > 0) {
      // Repair: drop the offending sentences, keep the rest (§9.5 step 1).
      text = kept.join(" ");
      violations.forEach((v) => (v.resolution = "dropped"));
    } else {
      text = minimalFallback(rc, mode);
      violations.forEach((v) => (v.resolution = "fallback"));
    }
    // Final guard: a known violation never ships (§9.5 step 3).
    const remaining = [
      ...leakageScan(text, mode, ctx.trace.question),
      ...faithfulnessScan(text, rc, ctx),
    ];
    if (remaining.length > 0) {
      const bad = new Set(remaining.map((v) => v.sentence));
      const stripped = splitSentences(text).filter((s) => !bad.has(s));
      text = stripped.join(" ") || "I don't know enough about that yet.";
    }
  }
  return {
    text,
    mode,
    droppedConclusions: plan.dropped,
    violations: violations.map(({ loadBearing, ...v }) => {
      void loadBearing;
      return v;
    }),
  };
}
