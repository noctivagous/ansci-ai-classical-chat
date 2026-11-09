/**
 * converse.ts — CSKG spike conversation layer.
 *
 * Patterns adapted from the main pipeline (src/router.ts, src/thought.ts,
 * src/render.ts) but rebuilt for CSKG alone: NO ontology, NO WordNet
 * senses, NO propagation. What carries over is the discipline:
 *   - closed-vocabulary term resolution (longest match wins; CSKG's
 *     multiword terms are its strength), no stemming guesses — the only
 *     concession is a recorded trailing-"s" form variant;
 *   - a ThoughtTrace per turn (typed steps + conclusions citing the
 *     exact edges used), kept in a ring; "why did you say that?"
 *     replays the stored trace WITHOUT re-querying the graph;
 *   - session state (topic stack, last intent) so follow-ups,
 *     corrections and bare "why?" work;
 *   - statements are first-class: they never flat-decline by default —
 *     the reply reflects ONE true graph fact about the most salient
 *     resolved term (or ATOMIC event) and stores the terms for later;
 *   - honest declines that name the term that couldn't be placed.
 *
 * Situation use is limited to the three sanctioned ways (see
 * situation.ts): direct questions, fact-selection pressure, nothing
 * else.
 */
import type { CskgEdge, CskgGraph } from "./loader";
import { edgeText, renderConclusion, type Conclusion } from "./render";
import {
  computeSituation,
  situationallyRelevant,
  type Situation,
} from "./situation";

/* ---------------- traces & session ---------------- */

export type TraceStepKind =
  | "situate" | "resolve" | "intent" | "query" | "conclude"
  | "decline" | "replay" | "correct" | "remember";

export interface TraceStep {
  kind: TraceStepKind;
  detail: string;
  edges?: string[];
}

export interface ThoughtTrace {
  turn: number;
  input: string;
  intent: string;
  steps: TraceStep[];
  conclusions: Conclusion[];
  answer: string;
}

export interface SessionState {
  /** resolved term ids, most recent last */
  topics: number[];
  lastIntent: string;
  traces: ThoughtTrace[];
  turnCount: number;
}

export function createSession(): SessionState {
  return { topics: [], lastIntent: "fact", traces: [], turnCount: 0 };
}

export interface TurnResult {
  text: string;
  trace: ThoughtTrace;
  grounded: boolean;
}

/* ---------------- term resolution ---------------- */

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "do", "does", "did",
  "what", "why", "how", "when", "where", "who", "can", "could", "i",
  "you", "my", "me", "it", "its", "of", "to", "for", "in", "on", "at",
  "with", "about", "and", "or", "if", "so", "that", "this", "there",
  "be", "been", "am", "have", "has", "had", "will", "would", "should",
  "im", "i'm", "dont", "don't", "get", "got", "make", "making", "made",
  "think", "thinking", "know", "say", "said", "one", "some", "any",
  "use", "used", "using", "find", "found", "happen", "happens", "still",
]);

export interface ResolvedTerm {
  id: number;
  text: string;
  start: number; // word index
  words: number;
  formVariant?: string; // e.g. "bananas→banana"
}

export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[?!.,;:"“”()]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Longest-match resolution against the closed term index. Scans left
 * to right; at each position the longest n-gram (up to the graph's
 * max term width) that exists in the vocabulary wins.
 */
export function resolveTerms(g: CskgGraph, text: string): ResolvedTerm[] {
  const words = tokenise(text);
  const found: ResolvedTerm[] = [];
  let i = 0;
  while (i < words.length) {
    let hit: ResolvedTerm | null = null;
    const maxN = Math.min(g.maxTermWords, words.length - i);
    for (let n = maxN; n >= 1; n--) {
      const phrase = words.slice(i, i + n).join(" ");
      const id = g.id(phrase);
      if (id !== undefined) {
        hit = { id, text: phrase, start: i, words: n };
        break;
      }
      // recorded form variant: trailing -s on the last word only
      if (n >= 1 && words[i + n - 1].endsWith("s")) {
        const alt = words.slice(i, i + n);
        alt[n - 1] = alt[n - 1].slice(0, -1);
        const altPhrase = alt.join(" ");
        const altId = g.id(altPhrase);
        if (altId !== undefined) {
          hit = {
            id: altId, text: altPhrase, start: i, words: n,
            formVariant: `${phrase}→${altPhrase}`,
          };
          break;
        }
      }
    }
    if (hit) {
      // "a coat" and "coat" are different CSKG nodes, and the bare
      // term is almost always the rich one — prefer it when it exists.
      const art = hit.text.match(/^(?:a|an|the) (.+)$/);
      if (art) {
        const bareId = g.id(art[1]);
        if (bareId !== undefined) hit = { ...hit, id: bareId, text: art[1] };
      }
      found.push(hit);
      i += hit.words;
    } else {
      i++;
    }
  }
  return found;
}

/** ATOMIC events are terms carrying at: outgoing edges. */
export function isEventTerm(g: CskgGraph, id: number): boolean {
  return g.outEdges(id).some((e) => e.rel.startsWith("at:"));
}

/** Best ATOMIC event whose words overlap the input's content words. */
export function matchEvent(
  g: CskgGraph,
  words: string[],
  candidates: ResolvedTerm[],
): ResolvedTerm | null {
  const content = new Set(words.filter((w) => !STOPWORDS.has(w)));
  let best: { term: ResolvedTerm; score: number } | null = null;
  for (const cand of candidates) {
    if (!isEventTerm(g, cand.id)) continue;
    const evWords = cand.text.split(" ").filter((w) => !STOPWORDS.has(w));
    const overlap = evWords.filter((w) => content.has(w)).length;
    const score = overlap / Math.max(1, evWords.length);
    if (overlap >= 1 && score >= 0.5 && (!best || score > best.score)) {
      best = { term: cand, score };
    }
  }
  return best?.term ?? null;
}

/* ---------------- fact selection with situation pressure -------- */

const FACT_REL_PRIORITY = [
  "/r/IsA", "/r/UsedFor", "/r/Causes", "at:xEffect", "at:xReact",
  "/r/HasProperty", "/r/AtLocation", "/r/CapableOf", "/r/PartOf",
  "/r/HasA", "/r/MadeOf", "/r/HasSubevent", "at:oReact", "at:xWant",
];

/**
 * Choose the single most presentable grounded fact about a term.
 * Ordering: relation priority, then dataset support, then — the
 * Situation's one quiet job — seasonal/daypart relevance.
 */
export function pickFactScored(
  g: CskgGraph,
  id: number,
  sit: Situation,
  rels: string[] = FACT_REL_PRIORITY,
): { c: Conclusion; score: number } | null {
  let best: { c: Conclusion; score: number } | null = null;
  for (const rel of rels) {
    for (const e of g.outEdges(id, rel)) {
      const c: Conclusion = { edge: e, about: "from" };
      let score = (rels.length - rels.indexOf(rel)) * 10 + e.support * 3;
      if (situationallyRelevant(g.terms[e.to], sit)) score += 5;
      // prefer readable targets: very long targets are usually noise
      if (g.terms[e.to].split(" ").length > 6) score -= 4;
      if (!best || score > best.score) best = { c, score };
    }
  }
  return best;
}

export function pickFact(
  g: CskgGraph,
  id: number,
  sit: Situation,
  rels: string[] = FACT_REL_PRIORITY,
): Conclusion | null {
  return pickFactScored(g, id, sit, rels)?.c ?? null;
}

function topConclusions(
  g: CskgGraph,
  id: number,
  rel: string,
  dir: "out" | "in",
  n: number,
  sit?: Situation,
): Conclusion[] {
  const all = (dir === "out" ? g.outEdges(id, rel) : g.inEdgesFor(id, rel))
    .slice()
    .sort((a, b) => {
      let d = b.support - a.support;
      if (d === 0) {
        const other = (e: CskgEdge) => g.terms[dir === "out" ? e.to : e.from];
        d = other(a).length - other(b).length; // shorter targets read better
      }
      if (sit) {
        const other = (e: CskgEdge) => g.terms[dir === "out" ? e.to : e.from];
        d +=
          (situationallyRelevant(other(b), sit) ? 1 : 0) -
          (situationallyRelevant(other(a), sit) ? 1 : 0);
      }
      return d;
    })
    .slice(0, n);
  return all.map((edge) => ({ edge, about: dir === "out" ? "from" : "to" }));
}

function renderAll(g: CskgGraph, cs: Conclusion[]): string {
  return cs.map((c) => renderConclusion(g, c)).join(" ");
}

/* ---------------- the turn ---------------- */

export function runTurn(
  g: CskgGraph,
  session: SessionState,
  input: string,
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date(),
): TurnResult {
  const sit = computeSituation(now, env);
  session.turnCount++;
  const steps: TraceStep[] = [];
  const conclusions: Conclusion[] = [];
  steps.push({
    kind: "situate",
    detail:
      `${sit.daypart}; season: ${sit.season ?? "unknown"}; place: ` +
      (sit.place ? `${sit.place.name} (${sit.place.hemisphere ?? "hemisphere unknown"})` : "unset"),
  });

  const finish = (text: string, intent: string, grounded: boolean): TurnResult => {
    const trace: ThoughtTrace = {
      turn: session.turnCount, input, intent, steps, conclusions,
      answer: text,
    };
    session.traces.push(trace);
    if (session.traces.length > 20) session.traces.shift();
    return { text, trace, grounded };
  };

  const text = input.trim();
  const lower = text.toLowerCase();

  // (0) replay: "why did you say that?" — stored trace, no re-query
  if (/\bwhy did you say that\b|\bhow do you know\b|\bwhere did you get that\b/.test(lower)) {
    const prev = session.traces[session.traces.length - 1];
    steps.push({ kind: "replay", detail: "replaying previous trace; graph not re-queried" });
    if (!prev) {
      return finish("I haven't said anything yet in this conversation.", "replay", false);
    }
    const edgeLines = prev.conclusions.map((c) => edgeText(g, c.edge));
    const why = edgeLines.length
      ? `Because of what I found in the graph: ${edgeLines.join("; ")}.`
      : `That answer didn't rest on any graph edge — it came from the conversation itself.`;
    return finish(why, "replay", prev.conclusions.length > 0);
  }

  // (1) correction: "no, I meant the illness"
  const corr = lower.match(/^(?:no|nope)[,.]?\s+(?:i meant|i mean|not that,? i meant)\s+(.+?)[.!?]?$/) ??
    lower.match(/^i meant\s+(.+?)[.!?]?$/);
  if (corr) {
    const fixed = resolveTerms(g, corr[1]);
    steps.push({ kind: "correct", detail: `user correction → "${corr[1]}"` });
    if (fixed.length) {
      const term = fixed[fixed.length - 1];
      remember(session, term.id);
      steps.push({ kind: "resolve", detail: `re-resolved: ${term.text}` });
      const fact = pickFact(g, term.id, sit);
      if (fact) {
        conclusions.push(fact);
        steps.push({ kind: "conclude", detail: "answered about the corrected term", edges: [edgeText(g, fact.edge)] });
        return finish(`Got it — ${g.terms[term.id]}. ${renderConclusion(g, fact)}`, "correction", true);
      }
      return finish(`Got it — ${g.terms[term.id]}. I don't have much on it in this graph yet.`, "correction", false);
    }
    return finish(`I couldn't place "${corr[1]}" in this graph — nothing I know is called that.`, "correction", false);
  }

  // (2) situation questions
  if (/\bwhat time is it\b|\bwhat(?:'s| is) the time\b/.test(lower)) {
    const t = sit.now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return finish(`It's ${t} here — ${sit.daypart} by the clock I'm running on.`, "situation", true);
  }
  if (/\bwhat season is it\b|\bwhich season/.test(lower)) {
    if (!sit.place) {
      return finish(
        "I don't know where I am — no location is configured, and a month alone doesn't make a season. " +
          `It's ${sit.now.toLocaleDateString([], { month: "long" })} on my clock; in the northern hemisphere that's one season, in the southern the opposite.`,
        "situation", true,
      );
    }
    if (!sit.season) {
      return finish(
        `${sit.place.name} doesn't have temperate-style seasons I can name from the calendar — I won't guess one.`,
        "situation", true,
      );
    }
    return finish(
      `In ${sit.place.name} it's ${sit.season} just now (${sit.now.toLocaleDateString([], { month: "long" })}, ${sit.place.hemisphere}ern hemisphere).`,
      "situation", true,
    );
  }
  if (/\bwhere are you\b|\bwhere am i\b/.test(lower)) {
    return finish(
      sit.place
        ? `I'm set up as being in ${sit.place.name}. That's configuration, not a sense — I can't feel a place.`
        : "Nowhere in particular — no location is configured for me, so I answer without a place.",
      "situation", true,
    );
  }

  // (3) resolve terms
  const resolved = resolveTerms(g, text);
  for (const r of resolved) {
    steps.push({
      kind: "resolve",
      detail: `term: "${r.text}"${r.formVariant ? ` (form variant ${r.formVariant})` : ""}`,
    });
  }
  const words = tokenise(text);

  // helpers ------------------------------------------------------------
  const topicId = (): number | undefined =>
    session.topics[session.topics.length - 1];
  const declineUnplaced = (intent: string): TurnResult => {
    const unplaced = words.filter(
      (w) => w.length > 2 && !STOPWORDS.has(w) &&
        !resolved.some((r) => r.text.split(" ").includes(w)),
    );
    steps.push({ kind: "decline", detail: `unplaced: ${unplaced.join(", ") || "(none)"}` });
    const named = unplaced.length ? `"${unplaced.slice(0, 3).join('", "')}"` : "any of that";
    return finish(
      `I couldn't place ${named} in what I know yet — this graph has no entry I can attach it to.`,
      intent, false,
    );
  };
  const noFact = (termText: string, intent: string): TurnResult => {
    steps.push({ kind: "decline", detail: `no usable edges for "${termText}"` });
    return finish(
      `I know the term "${termText}", but this graph doesn't say anything usable about it.`,
      intent, false,
    );
  };

  // (4) "what about X?" follow-up
  const aboutMatch = lower.match(/^what about (?:the |a |an )?(.+?)[?]?$/);
  if (aboutMatch) {
    const cand = resolveTerms(g, aboutMatch[1]);
    if (cand.length) {
      const term = cand[cand.length - 1];
      remember(session, term.id);
      steps.push({ kind: "intent", detail: `follow-up topic: ${term.text}; reusing intent ${session.lastIntent}` });
      const fact = pickFact(g, term.id, sit);
      if (fact) {
        conclusions.push(fact);
        return finish(renderConclusion(g, fact), "followup", true);
      }
      return noFact(term.text, "followup");
    }
    return declineUnplaced("followup");
  }

  // (5) bare "why?" — apply to the current topic
  if (/^why[?]?$/.test(lower.trim())) {
    const t = topicId();
    if (t === undefined) return finish("Why what? We haven't landed on a topic yet.", "why", false);
    const cause = answerWhy(g, session, t, steps, conclusions, sit);
    if (cause) return finish(cause, "why", true);
    return noFact(g.terms[t], "why");
  }

  const isQuestion = lower.endsWith("?") || /^(what|why|how|where|when|who|can|could|is|are|do|does)\b/.test(lower);
  const salient = pickSalient(g, resolved);

  // (6) tool-finding: "what can I open a wine bottle with?"
  const openMatch = lower.match(/what can i open (?:a |an |the )?(.+?) with/);
  const useToMatch = lower.match(/what can i use to (.+?)[?]?$/);
  if (openMatch || useToMatch) {
    const hits = findTool(g, openMatch ? openMatch[1] : useToMatch![1], openMatch ? "open" : null);
    steps.push({ kind: "query", detail: `UsedFor reverse lookup for "${openMatch ? openMatch[1] : useToMatch![1]}"` });
    if (hits.length) {
      conclusions.push(...hits.map((edge) => ({ edge, about: "to" as const })));
      for (const c of conclusions) steps.push({ kind: "conclude", detail: "tool candidate", edges: [edgeText(g, c.edge)] });
      const tools = hits.map((e) => g.terms[e.from]);
      return finish(`You could use ${tools.join(" or ")} — ${renderAll(g, conclusions.slice(0, 1))}`, "tool", true);
    }
    return finish(
      `I don't have a tool for that in this graph — nothing here is recorded as used for ${openMatch ? `opening ${openMatch[1]}` : useToMatch![1]}.`,
      "tool", false,
    );
  }

  if (isQuestion && resolved.length) {
    const candidates = contentCandidates(g, resolved);
    const primary = candidates[0] ?? salient!;
    remember(session, primary.id);

    // relatedness between two terms
    if (/\brelated\b|\bhave in common\b|\bconnection between\b/.test(lower) && candidates.length >= 2) {
      const a = candidates[0];
      const b = candidates[1];
      const ans = answerRelated(g, a.id, b.id, steps, conclusions);
      return finish(ans ?? `${cap(g.terms[a.id])} and ${g.terms[b.id]} don't share any neighbours I can find within two steps.`, "related", conclusions.length > 0);
    }

    // why-questions over causes / effects
    if (lower.startsWith("why") || /\bwhat causes\b/.test(lower)) {
      const ans = answerWhyQuestion(g, resolved, steps, conclusions, sit);
      if (ans) {
        session.lastIntent = "why";
        return finish(ans, "why", true);
      }
      return noFact(primary.text, "why");
    }

    // feelings / what-happens: ATOMIC events
    if (/\bfeel\b|\bwhat happens\b/.test(lower)) {
      const ev = matchEvent(g, words, resolved);
      if (ev) {
        const cs = [
          ...topConclusions(g, ev.id, "at:xReact", "out", 1),
          ...topConclusions(g, ev.id, "at:oReact", "out", 1),
          ...topConclusions(g, ev.id, "at:xEffect", "out", 1),
        ];
        if (cs.length) {
          conclusions.push(...cs);
          session.lastIntent = "feel";
          return finish(renderAll(g, cs), "feel", true);
        }
      }
    }

    // Intent by surface pattern. The subject is the first candidate
    // (in preference order) that actually yields conclusions — a
    // longer match must not hide a richer term it contains.
    const subjText = primary.text;
    const pick = (intent: string, cs: Conclusion[]): TurnResult | null => {
      if (!cs.length) return null;
      conclusions.push(...cs);
      session.lastIntent = intent;
      for (const c of cs) steps.push({ kind: "conclude", detail: intent, edges: [edgeText(g, c.edge)] });
      return finish(renderAll(g, cs), intent, true);
    };
    const pickAcross = (
      intent: string,
      build: (id: number) => Conclusion[],
    ): TurnResult | null => {
      for (const cand of candidates.slice(0, 4)) {
        const r = pick(intent, build(cand.id));
        if (r) {
          remember(session, cand.id);
          return r;
        }
      }
      return null;
    };
    let r: TurnResult | null = null;
    if (/\bused for\b|\bwhat (?:is|are) .+ for\b|\bwhat can i use .+ for\b/.test(lower)) {
      r = pickAcross("purpose", (id) => topConclusions(g, id, "/r/UsedFor", "out", 3, sit));
    } else if (/\bwhere\b/.test(lower)) {
      // AtLocation only: Visual Genome's LocatedNear is spatial noise
      // at conversational scale ("penguin near computer").
      r = pickAcross("location", (id) => [
        ...topConclusions(g, id, "/r/AtLocation", "out", 3, sit),
      ]);
    } else if (/\bmade of\b/.test(lower)) {
      r = pickAcross("madeof", (id) => topConclusions(g, id, "/r/MadeOf", "out", 3, sit));
    } else if (/\bpart/.test(lower)) {
      r = pickAcross("part", (id) => [
        ...topConclusions(g, id, "/r/PartOf", "out", 2, sit),
        ...topConclusions(g, id, "/r/HasA", "out", 3, sit),
      ]);
    } else if (/\bwhat can\b.*\bdo\b|\bcapable\b/.test(lower)) {
      r = pickAcross("capability", (id) => topConclusions(g, id, "/r/CapableOf", "out", 3, sit));
    } else if (/\bwhat is .+ like\b|\blike\?$/.test(lower)) {
      r = pickAcross("property", (id) => [
        ...topConclusions(g, id, "/r/HasProperty", "out", 3, sit),
        ...topConclusions(g, id, "/r/IsA", "out", 1, sit),
      ]);
    } else if (/\bopposite of\b/.test(lower)) {
      r = pickAcross("antonym", (id) => topConclusions(g, id, "/r/Antonym", "out", 1));
    } else if (/\bwhat (?:is|are|does)\b/.test(lower)) {
      // what-is: IsA + HasProperty neighbourhood (CSKG has no glosses).
      // Over-long targets are usually mangled sentence fragments in
      // ConceptNet ("ache ailment condition"), so cap their length.
      r = pickAcross("whatis", (id) => [
        ...topConclusions(g, id, "/r/IsA", "out", 4, sit)
          .filter((c) => g.terms[c.edge.to].split(" ").length <= 2),
        ...topConclusions(g, id, "/r/HasProperty", "out", 4, sit)
          .filter((c) => g.terms[c.edge.to].split(" ").length <= 4),
        ...topConclusions(g, id, "/r/UsedFor", "out", 1, sit),
      ].slice(0, 4));
    }
    if (r) return r;

    // generic question: best fact about the first candidate that has one
    for (const cand of candidates.slice(0, 4)) {
      const fact = pickFact(g, cand.id, sit);
      if (fact) {
        conclusions.push(fact);
        session.lastIntent = "fact";
        remember(session, cand.id);
        steps.push({ kind: "conclude", detail: "generic grounded fact", edges: [edgeText(g, fact.edge)] });
        return finish(renderConclusion(g, fact), "fact", true);
      }
    }
    return noFact(subjText, "fact");
  }

  if (isQuestion && !resolved.length) {
    // pronouns may still reach the session topic
    const t = topicId();
    if (t !== undefined && /\b(it|that|this|they|them)\b/.test(lower)) {
      const fact = pickFact(g, t, sit);
      if (fact) {
        conclusions.push(fact);
        return finish(renderConclusion(g, fact), "fact", true);
      }
    }
    return declineUnplaced("question");
  }

  // (7) statements: grounded acknowledgement, never a flat decline
  if (resolved.length) {
    const ev = matchEvent(g, words, resolved);
    const primary = ev ?? salient!;
    remember(session, primary.id);
    for (const r of resolved) {
      if (!r.text.split(" ").every((w) => STOPWORDS.has(w))) remember(session, r.id);
    }
    steps.push({ kind: "intent", detail: ev ? `statement; ATOMIC event match: ${ev.text}` : "statement" });
    const factRels = ev
      ? ["at:xEffect", "at:xReact", "at:xWant", "at:oReact", "/r/IsA", "/r/HasProperty"]
      : FACT_REL_PRIORITY;
    // The acknowledgement fact is the best-SCORING fact across the
    // event match and all content candidates (incl. head-word
    // expansions) — first-with-a-fact let thin terms ("third",
    // "bananas"-the-film) beat richer ones ("rain", "banana").
    let fact: Conclusion | null = null;
    {
      let bestScore = -Infinity;
      const pool = [
        ...(ev ? [ev] : []),
        ...contentCandidates(g, resolved),
        ...(ev ? [] : [primary]),
      ];
      const seenIds = new Set<number>();
      for (const cand of pool) {
        if (seenIds.has(cand.id)) continue;
        seenIds.add(cand.id);
        const scored = pickFactScored(g, cand.id, sit, factRels);
        if (scored && scored.score > bestScore) {
          bestScore = scored.score;
          fact = scored.c;
        }
      }
    }
    if (fact) {
      conclusions.push(fact);
      steps.push({ kind: "conclude", detail: "statement acknowledgement fact", edges: [edgeText(g, fact.edge)] });
      session.lastIntent = "fact";
      return finish(renderConclusion(g, fact), "statement", true);
    }
    return finish(
      `${cap(g.terms[primary.id])} — noted. This graph doesn't tell me much about it yet, but I'll keep it in mind for what follows.`,
      "statement", false,
    );
  }

  return declineUnplaced("statement");
}

function remember(session: SessionState, id: number): void {
  if (session.topics[session.topics.length - 1] !== id) session.topics.push(id);
  if (session.topics.length > 12) session.topics.shift();
}

const QUESTION_LED = /^(what|how|why|where|when|who|which)\b/;

function isContentTerm(r: ResolvedTerm): boolean {
  return (
    !r.text.split(" ").every((w) => STOPWORDS.has(w)) && !QUESTION_LED.test(r.text)
  );
}

function pickSalient(g: CskgGraph, resolved: ResolvedTerm[]): ResolvedTerm | null {
  const cands = contentCandidates(g, resolved);
  return cands[0] ?? resolved[0] ?? null;
}

/**
 * Candidate subjects in preference order: content terms (multiword
 * first, then sentence order), then head-word expansions of multiword
 * terms ("pot of soup" also offers "soup"; "chop onions" offers
 * "onion"). Intents try candidates in order until one yields facts —
 * a longer match must not hide the richer shorter term inside it.
 */
export function contentCandidates(
  g: CskgGraph,
  resolved: ResolvedTerm[],
): ResolvedTerm[] {
  const content = resolved.filter(isContentTerm);
  const ordered = content
    .slice()
    .sort((a, b) => b.words - a.words || a.start - b.start);
  const seen = new Set(ordered.map((r) => r.id));
  const out = [...ordered];
  for (const r of content) {
    if (r.words < 2) continue;
    const parts = r.text.split(" ");
    for (const candText of [parts[parts.length - 1], parts.slice(1).join(" ")]) {
      for (const variant of [candText, candText.replace(/s$/, "")]) {
        const id = g.id(variant);
        if (id !== undefined && !seen.has(id)) {
          seen.add(id);
          out.push({ id, text: variant, start: r.start, words: 1 });
        }
      }
    }
  }
  return out;
}

function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

/* ---------------- why / causes ---------------- */

function answerWhy(
  g: CskgGraph,
  _session: SessionState,
  topic: number,
  steps: TraceStep[],
  conclusions: Conclusion[],
  _sit: Situation,
): string | null {
  const incoming = g.inEdgesFor(topic, "/r/Causes");
  if (incoming.length) {
    const cs = incoming
      .slice()
      .sort((a, b) => b.support - a.support)
      .slice(0, 2)
      .map((edge) => ({ edge, about: "to" as const }));
    conclusions.push(...cs);
    steps.push({ kind: "query", detail: `Causes into "${g.terms[topic]}"`, edges: cs.map((c) => edgeText(g, c.edge)) });
    return cs.map((c) => {
      const e = c.edge;
      return e.support >= 2
        ? `${cap(g.terms[e.to])} happens because of ${g.terms[e.from]}.`
        : `${cap(g.terms[e.to])} can be caused by ${g.terms[e.from]}.`;
    }).join(" ");
  }
  const fact = pickFact(g, topic, _sit, ["/r/Causes", "/r/HasPrerequisite", "at:xNeed"]);
  if (fact) {
    conclusions.push(fact);
    return renderConclusion(g, fact);
  }
  return null;
}

function answerWhyQuestion(
  g: CskgGraph,
  resolved: ResolvedTerm[],
  steps: TraceStep[],
  conclusions: Conclusion[],
  sit: Situation,
): string | null {
  // edges connecting two resolved terms are the strongest answer
  const ids = new Set(resolved.map((r) => r.id));
  for (const r of resolved) {
    for (const e of g.outEdges(r.id)) {
      if (ids.has(e.to) && (e.rel === "/r/Causes" || e.rel === "at:xEffect" || e.rel === "at:oEffect")) {
        const c: Conclusion = { edge: e, about: "from" };
        conclusions.push(c);
        steps.push({ kind: "conclude", detail: "causal edge between two mentioned terms", edges: [edgeText(g, e)] });
        return e.rel === "/r/Causes"
          ? `${cap(g.terms[e.from])} can cause ${g.terms[e.to]} — that's the link this graph has between the two.`
          : renderConclusion(g, c);
      }
    }
  }
  // otherwise: causes into, or causes out of, any candidate term —
  // including head-word expansions ("chop onions" also offers "onion")
  const candidates = contentCandidates(g, resolved);
  // Actor side first: in "why does Y happen when I do X", X is the
  // cause and Y the effect, so outgoing Causes from any candidate
  // outrank incoming Causes into a stray term (e.g. "water").
  for (const dir of ["out", "in"] as const) {
    for (const cand of candidates.slice(0, 6)) {
      const edges = (dir === "out"
        ? g.outEdges(cand.id, "/r/Causes")
        : g.inEdgesFor(cand.id, "/r/Causes")
      )
        .slice().sort((a, b) => b.support - a.support).slice(0, 2);
      if (!edges.length) continue;
      const cs = edges.map((edge) => ({ edge, about: dir === "out" ? ("from" as const) : ("to" as const) }));
      conclusions.push(...cs);
      steps.push({
        kind: "query",
        detail: `Causes ${dir === "out" ? "out of" : "into"} "${cand.text}"`,
        edges: cs.map((c) => edgeText(g, c.edge)),
      });
      return dir === "out"
        ? cs.map((c) => renderConclusion(g, c)).join(" ")
        : cs.map((c) => `${cap(g.terms[c.edge.to])} can be caused by ${g.terms[c.edge.from]}.`).join(" ");
    }
  }
  const primary = candidates[0] ?? pickSalient(g, resolved)!;
  const ev = matchEvent(g, resolved.flatMap((r) => r.text.split(" ")), resolved);
  if (ev) {
    const cs = topConclusions(g, ev.id, "at:xEffect", "out", 2);
    if (cs.length) {
      conclusions.push(...cs);
      return renderAll(g, cs);
    }
  }
  const fact = pickFact(g, primary.id, sit, ["/r/Causes"]);
  if (fact) {
    conclusions.push(fact);
    return renderConclusion(g, fact);
  }
  return null;
}

/* ---------------- relatedness ---------------- */

function answerRelated(
  g: CskgGraph,
  a: number,
  b: number,
  steps: TraceStep[],
  conclusions: Conclusion[],
): string | null {
  // direct edge?
  for (const e of g.outEdges(a)) {
    if (e.to === b) {
      const c: Conclusion = { edge: e, about: "from" };
      conclusions.push(c);
      steps.push({ kind: "query", detail: "direct edge", edges: [edgeText(g, e)] });
      return renderConclusion(g, c);
    }
  }
  for (const e of g.outEdges(b)) {
    if (e.to === a) {
      const c: Conclusion = { edge: e, about: "from" };
      conclusions.push(c);
      steps.push({ kind: "query", detail: "direct edge (reverse)", edges: [edgeText(g, e)] });
      return renderConclusion(g, c);
    }
  }
  // shared neighbours (one intermediate, either direction)
  const neighA = new Map<number, CskgEdge>();
  for (const e of [...g.outEdges(a), ...g.inEdgesFor(a)]) {
    neighA.set(e.from === a ? e.to : e.from, e);
  }
  const shared: { mid: number; ea: CskgEdge; eb: CskgEdge }[] = [];
  for (const e of [...g.outEdges(b), ...g.inEdgesFor(b)]) {
    const other = e.from === b ? e.to : e.from;
    const ea = neighA.get(other);
    if (ea) shared.push({ mid: other, ea, eb: e });
  }
  if (!shared.length) return null;
  shared.sort((x, y) => y.ea.support + y.eb.support - (x.ea.support + x.eb.support));
  const s = shared[0];
  conclusions.push({ edge: s.ea, about: "from" }, { edge: s.eb, about: "from" });
  steps.push({
    kind: "query",
    detail: `shared neighbour "${g.terms[s.mid]}" (path length 2)`,
    edges: [edgeText(g, s.ea), edgeText(g, s.eb)],
  });
  return (
    `${cap(g.terms[a])} and ${g.terms[b]} meet at ${g.terms[s.mid]}: ` +
    `${renderConclusion(g, { edge: s.ea, about: "from" })} ` +
    `${renderConclusion(g, { edge: s.eb, about: s.eb.from === b ? "from" : "to" })}`
  );
}

/* ---------------- tool finding ---------------- */

/**
 * Reverse UsedFor lookup: phrases like "open wine bottle" live on the
 * TARGET side of UsedFor (corkscrew —UsedFor→ open wine bottles).
 * Match targets containing the action verb (if given) and the object
 * term's head words.
 */
export function findTool(g: CskgGraph, objectText: string, verb: string | null): CskgEdge[] {
  const objWords = tokenise(objectText).filter((w) => !STOPWORDS.has(w));
  const wordIn = (w: string, set: Set<string>): boolean =>
    set.has(w) || set.has(w + "s") || (w.endsWith("s") && set.has(w.slice(0, -1)));
  const hits: { e: CskgEdge; score: number }[] = [];
  for (const e of g.edgesOf("/r/UsedFor")) {
    const target = g.terms[e.to];
    const targetWords = new Set(target.split(" "));
    let score = 0;
    const verbHit = verb ? wordIn(verb, targetWords) : false;
    if (verbHit) score += 2;
    let objHits = 0;
    for (const w of objWords) if (wordIn(w, targetWords)) objHits++;
    score += objHits;
    // the action named in the target is what makes it a tool FOR this:
    // "open wine bottles" beats any phrase merely containing the words
    if (verbHit && objHits >= 1) score += 3;
    if (objWords.length && objHits === objWords.length) score += 1;
    if (score >= 4) hits.push({ e, score });
  }
  const direct = hits
    .sort((a, b) => b.score - a.score || b.e.support - a.e.support)
    .slice(0, 3)
    .map((h) => h.e);
  if (direct.length) return direct;

  // Fallback: some tools lost their UsedFor edge in CSKG's merge
  // (corkscrew has none — only RelatedTo "opening wine" / "wine
  // opener" and IsA "bottle opener"). A term counts as a candidate
  // tool when it is RelatedTo a phrase naming the action+object AND
  // is itself classed as a tool/opener-class artefact.
  const verbStem = verb ? verb.replace(/e$/, "") : null;
  const fallback: { e: CskgEdge; score: number }[] = [];
  for (const e of g.edgesOf("/r/RelatedTo")) {
    const target = g.terms[e.to];
    const targetWords = new Set(target.split(" "));
    let score = 0;
    if (verbStem && [...targetWords].some((w) => w.startsWith(verbStem))) score += 2;
    for (const w of objWords) if (wordIn(w, targetWords)) score += 1;
    if (score < 3) continue;
    const isToolish = g
      .outEdges(e.from, "/r/IsA")
      .some((isa) => /\b(tool|opener|device|instrument|utensil)\b/.test(g.terms[isa.to]));
    if (isToolish) fallback.push({ e, score });
  }
  return fallback
    .sort((a, b) => b.score - a.score || b.e.support - a.e.support)
    .slice(0, 3)
    .map((h) => h.e);
}
