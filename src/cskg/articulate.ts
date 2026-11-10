/**
 * articulate.ts — engine piece F: communication articulation
 * (design §2; grows from the spike's render.ts).
 *
 * What to say and how to say it. Every sentence template the chat
 * can produce lives here: conclusions are restated, never extended
 * — the renderer adds no fact, no number, no causal link that is
 * not in the edge it was handed. Hedging is mechanical, driven by
 * dataset support:
 *   support >= 2 (two or more CSKG datasets attest the edge)
 *     -> plain assertion
 *   support == 1
 *     -> softened form ("often", "can", "tends to")
 * CSKG has no glosses, so relation sentences here are relations
 * restated in English, or fixed conversational templates
 * (declines, acknowledgements, answers about the situated self)
 * whose wording the coordinator selects but does not compose.
 * Definition text is the one exception: the Definitions slice
 * joins terms to the repo's WordNet glosses (definitions.ts),
 * and renderDefinition below is their S16 form — the gloss
 * quoted as attested, never extended, exactly like an edge.
 *
 * For now the style target is simply normal responses (proposal:
 * "for now should be just getting normal responses"); selection and
 * grounding outrank polish.
 *
 * Writes (engine map): `reply` — via speak(), the only assignment.
 */
import type { Situation } from "./awareness";
import type { CskgEdge, CskgGraph } from "./loader";
import type { TurnWorkspace } from "./workspace";

export interface Conclusion {
  edge: CskgEdge;
  /** which endpoint the sentence is about (the other is the content) */
  about: "from" | "to";
  /**
   * The rendering path renderConclusion actually took for this
   * conclusion — the depth pass's sentence bank, or the relation
   * template. Set at render time; the coordinator logs it in the
   * trace (turn.ts), so a reply's provenance is per-conclusion.
   */
  via?: "sentence" | "template";
}

/** F's one write: place the finished reply in the workspace. */
export function speak(ws: TurnWorkspace, text: string): void {
  ws.reply = text;
}

function article(term: string): string {
  return /^[aeiou]/.test(term) ? "an" : "a";
}

export function edgeText(g: CskgGraph, e: CskgEdge): string {
  return `${g.terms[e.from]} —${e.rel}→ ${g.terms[e.to]} [${e.sources.join("+")}]`;
}

/* ---------------- the sentence bank (depth pass, S9) ------------
 *
 * 604,768 CSKG rows carry a natural assertion sentence for their
 * edge ("[[A banana]] has [[a peel]]"); the loader now retains
 * the first per deduped edge. When a featured edge's sentence is
 * usable, F renders the dataset's own phrasing — cleaned of its
 * [[ ]] markup — instead of the relation template. Usable means
 * the sentence's bracketed terms ARE the edge's endpoints: the
 * segments, normalised (articles and possessives stripped,
 * trailing-s variants allowed), must match the two endpoint
 * labels as a set (two brackets), or — with one bracket — match
 * one endpoint while the other endpoint's words all appear in
 * the sentence. Anything else (no brackets, mismatched terms,
 * leftover markup, over-long) falls back to the template: the
 * bank may only ever restate the edge it is attached to, in the
 * dataset's own words — it adds no fact the template would not.
 */

const SEG_LEAD = /^(?:a|an|the|your|my|his|her|their|our|its)\s+/;

function normaliseSegment(seg: string): string {
  return seg
    .toLowerCase()
    .replace(/[.!?,;:]+$/g, "")
    .replace(SEG_LEAD, "")
    .replace(/\s+/g, " ")
    .trim();
}

function segmentMatchesLabel(seg: string, label: string): boolean {
  if (seg === label) return true;
  // trailing-s tolerance, either direction ("bananas" ~ "banana")
  if (seg.length > 2 && seg.endsWith("s") && seg.slice(0, -1) === label) return true;
  if (label.length > 2 && label.endsWith("s") && label.slice(0, -1) === seg) return true;
  return false;
}

/** The cleaned bank sentence for an edge, or null when unusable. */
export function sentenceForEdge(g: CskgGraph, e: CskgEdge): string | null {
  const raw = e.sentence;
  if (!raw) return null;
  const segments = [...raw.matchAll(/\[\[(.+?)\]\]/g)].map((m) => normaliseSegment(m[1]));
  if (!segments.length || segments.length > 2) return null;
  const from = g.terms[e.from];
  const to = g.terms[e.to];
  if (segments.length === 2) {
    const ok =
      (segmentMatchesLabel(segments[0], from) && segmentMatchesLabel(segments[1], to)) ||
      (segmentMatchesLabel(segments[0], to) && segmentMatchesLabel(segments[1], from));
    if (!ok) return null;
  } else {
    const seg = segments[0];
    const hitFrom = segmentMatchesLabel(seg, from);
    const hitTo = segmentMatchesLabel(seg, to);
    if (!hitFrom && !hitTo) return null;
    const otherWords = (hitFrom ? to : from).split(" ");
    const cleanedWords = new Set(
      raw.replace(/\[\[|\]\]/g, " ").toLowerCase().split(/\s+/),
    );
    if (!otherWords.every((w) => cleanedWords.has(w))) return null;
  }
  let cleaned = raw
    .replace(/^\s*\*\s*/, "")
    .replace(/\[\[|\]\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.includes("[[") || cleaned.includes("___")) return null;
  if (cleaned.split(" ").length > 30) return null;
  if (!/[.!?]$/.test(cleaned)) cleaned += ".";
  return cap(cleaned);
}

/** Restate one edge as one plain sentence about the chosen endpoint. */
export function renderConclusion(g: CskgGraph, c: Conclusion): string {
  const banked = sentenceForEdge(g, c.edge);
  if (banked !== null) {
    c.via = "sentence";
    return banked;
  }
  c.via = "template";
  const e = c.edge;
  const from = g.terms[e.from];
  const to = g.terms[e.to];
  const strong = e.support >= 2;
  const subj = c.about === "from" ? from : to;
  const obj = c.about === "from" ? to : from;
  const S = cap(subj);
  switch (e.rel) {
    case "/r/IsA":
      return c.about === "from"
        ? `${S} is ${article(obj)} ${obj}.`
        : `${cap(from)} is ${article(to)} ${to} — one example of ${subj}.`;
    case "/r/HasProperty":
    case "mw:MayHaveProperty":
      return strong ? `${S} is ${obj}.` : `${S} is often ${obj}.`;
    case "/r/UsedFor":
      return c.about === "from"
        ? strong
          ? `${S} is used for ${obj}.`
          : `${S} can be used for ${obj}.`
        : `${cap(from)} is used for ${to}.`;
    case "/r/Causes":
      return strong ? `${S} causes ${obj}.` : `${S} can cause ${obj}.`;
    case "/r/CausesDesire":
      return `${S} can make you want ${obj}.`;
    case "/r/AtLocation":
      return strong
        ? `You find ${subj} at ${obj}.`
        : `You can often find ${subj} at ${obj}.`;
    case "/r/LocatedNear":
      return `${S} is often found near ${obj}.`;
    case "/r/CapableOf":
      return `${S} can ${obj}.`;
    case "/r/PartOf":
      return c.about === "from" ? `${S} is part of ${obj}.` : `${S} has ${from} as a part.`;
    case "/r/HasA":
      return c.about === "from" ? `${S} has ${obj}.` : `${S} is something ${from} has.`;
    case "/r/MadeOf":
      return `${S} is made of ${obj}.`;
    case "/r/HasSubevent":
    case "/r/HasFirstSubevent":
    case "/r/HasLastSubevent":
      return `${S} involves ${obj}.`;
    case "/r/HasPrerequisite":
      return `${S} requires ${obj} first.`;
    case "/r/MotivatedByGoal":
      return `People do ${subj} in order to ${obj}.`;
    case "/r/Desires":
      return `${S} wants ${obj}.`;
    case "/r/CreatedBy":
      return `${S} was created by ${obj}.`;
    case "/r/Entails":
      return `${S} entails ${obj}.`;
    case "/r/ReceivesAction":
      return `${S} can be ${obj}.`;
    case "/r/MannerOf":
      return `${S} is a way of ${obj}.`;
    case "/r/DefinedAs":
      return `${S} is defined as ${obj}.`;
    case "/r/InstanceOf":
      return `${S} is an instance of ${obj}.`;
    case "/r/Synonym":
      return `${S} can also be called ${obj}.`;
    case "/r/Antonym":
      return `The opposite of ${subj} is ${obj}.`;
    case "/r/SimilarTo":
      return `${S} is similar to ${obj}.`;
    case "/r/RelatedTo":
      return `${S} is related to ${obj}.`;
    case "at:xEffect":
      return `After ${subj}, they ${obj}.`;
    case "at:oEffect":
      return `After ${subj}, others ${obj}.`;
    case "at:xWant":
      return `After ${subj}, they want to ${obj}.`;
    case "at:oWant":
      return `After ${subj}, others want to ${obj}.`;
    case "at:xReact":
      return strong
        ? `People feel ${obj} when ${subj}.`
        : `People often feel ${obj} when ${subj}.`;
    case "at:oReact":
      return `Others often feel ${obj} when ${subj}.`;
    case "at:xNeed":
      return `${S} first needs ${obj}.`;
    case "at:xIntent":
      return `The point of ${subj} is to ${obj}.`;
    case "at:xAttr":
      return `Someone who does that is ${obj}.`;
    default:
      return `${S} — ${e.rel} — ${obj}.`;
  }
}

export function joinSentences(sentences: string[]): string {
  return sentences.join(" ");
}

/**
 * The definition form (S16): "Term: gloss." — the dictionary
 * shape. The gloss is WordNet's attested text; F adds only the
 * term, the colon and the terminal stop, so the sentence can
 * never claim more than the synset says. Glosses are fragments
 * (noun phrases for noun senses), which the colon form carries
 * without forcing a verb the data doesn't have.
 */
export function renderDefinition(termText: string, gloss: string): string {
  const body = gloss.trim().replace(/\s+/g, " ");
  return `${cap(termText)}: ${body}${/[.!?]$/.test(body) ? "" : "."}`;
}

export function renderAll(g: CskgGraph, cs: Conclusion[]): string {
  return cs.map((c) => renderConclusion(g, c)).join(" ");
}

export function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

/* ---------------- causal phrasings (solve selects, F words) ----- */

/** "X happens because of Y." lines for Causes edges into a topic. */
export function renderBecauseLines(g: CskgGraph, cs: Conclusion[]): string {
  return cs.map((c) => {
    c.via = "template";
    const e = c.edge;
    return e.support >= 2
      ? `${cap(g.terms[e.to])} happens because of ${g.terms[e.from]}.`
      : `${cap(g.terms[e.to])} can be caused by ${g.terms[e.from]}.`;
  }).join(" ");
}

/** "X can be caused by Y." lines, one per Causes edge. */
export function renderCausedByLines(g: CskgGraph, cs: Conclusion[]): string {
  return cs.map((c) => {
    c.via = "template";
    return `${cap(g.terms[c.edge.to])} can be caused by ${g.terms[c.edge.from]}.`;
  }).join(" ");
}

/** The direct causal link between two terms the person mentioned. */
export function renderCausalLinkLine(g: CskgGraph, e: CskgEdge): string {
  return `${cap(g.terms[e.from])} can cause ${g.terms[e.to]} — that's the link this graph has between the two.`;
}

/** Two terms meeting at a shared neighbour, parts pre-rendered. */
export function renderMeeting(
  aText: string,
  bText: string,
  midText: string,
  partA: string,
  partB: string,
): string {
  return `${cap(aText)} and ${bText} meet at ${midText}: ${partA} ${partB}`;
}

export function renderUnrelated(aText: string, bText: string): string {
  return `${cap(aText)} and ${bText} don't share any neighbours I can find within two steps.`;
}

/* ---------------- answers about the situated self --------------- */

export type SituationQuestion = "time" | "season" | "place";

export function renderSituationAnswer(kind: SituationQuestion, sit: Situation): string {
  if (kind === "time") {
    const t = sit.now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `It's ${t} here — ${sit.daypart} by the clock I'm running on.`;
  }
  if (kind === "season") {
    if (!sit.place) {
      return (
        "I don't know where I am — no location is configured, and a month alone doesn't make a season. " +
        `It's ${sit.now.toLocaleDateString([], { month: "long" })} on my clock; in the northern hemisphere that's one season, in the southern the opposite.`
      );
    }
    if (!sit.season) {
      return `${sit.place.name} doesn't have temperate-style seasons I can name from the calendar — I won't guess one.`;
    }
    return `In ${sit.place.name} it's ${sit.season} just now (${sit.now.toLocaleDateString([], { month: "long" })}, ${sit.place.hemisphere}ern hemisphere).`;
  }
  return sit.place
    ? `I'm set up as being in ${sit.place.name}. That's configuration, not a sense — I can't feel a place.`
    : "Nowhere in particular — no location is configured for me, so I answer without a place.";
}

/* ---------------- conversational templates ---------------------- */

export function renderReplayNoPrevious(): string {
  return "I haven't said anything yet in this conversation.";
}

export function renderReplay(edgeLines: string[]): string {
  return edgeLines.length
    ? `Because of what I found in the graph: ${edgeLines.join("; ")}.`
    : `That answer didn't rest on any graph edge — it came from the conversation itself.`;
}

export function renderCorrectionFact(termText: string, factSentence: string): string {
  return `Got it — ${termText}. ${factSentence}`;
}

export function renderCorrectionNoFact(termText: string): string {
  return `Got it — ${termText}. I don't have much on it in this graph yet.`;
}

export function renderCorrectionUnplaced(phrase: string): string {
  return `I couldn't place "${phrase}" in this graph — nothing I know is called that.`;
}

export function renderDeclineUnplaced(unplaced: string[]): string {
  const named = unplaced.length ? `"${unplaced.slice(0, 3).join('", "')}"` : "any of that";
  return `I couldn't place ${named} in what I know yet — this graph has no entry I can attach it to.`;
}

export function renderNoFact(termText: string): string {
  return `I know the term "${termText}", but this graph doesn't say anything usable about it.`;
}

/**
 * The empty-set decline for a why-question (§6): the answer names
 * the missing causation instead of borrowing a neighbouring
 * word's edges. causeText is the stated cause when the question
 * named one ("when I chop onions"), null for a bare "why X?".
 */
export function renderWhyNoCause(effectText: string, causeText: string | null): string {
  return causeText
    ? `This graph doesn't record that causation: it has no Causes edge from "${causeText}" toward "${effectText}", and I won't borrow one from a neighbouring word.`
    : `This graph doesn't record a cause for "${effectText}" — no Causes edge in it reaches that, and I won't borrow one from a neighbouring word.`;
}

export function renderWhyNoTopic(): string {
  return "Why what? We haven't landed on a topic yet.";
}

export function renderToolAnswer(tools: string[], firstRendered: string): string {
  return `You could use ${tools.join(" or ")} — ${firstRendered}`;
}

export function renderToolDecline(usedForPhrase: string): string {
  return `I don't have a tool for that in this graph — nothing here is recorded as used for ${usedForPhrase}.`;
}

/** The §6 disclosure: the strict set was empty and a fallback route was used. */
export function renderToolFallbackNote(count: number): string {
  return count === 1
    ? "It isn't recorded as directly used for that — I reached it through related terms instead."
    : "None of these is recorded as directly used for that — I reached them through related terms instead.";
}

export function renderStatementNoted(termText: string): string {
  return `${cap(termText)} — noted. This graph doesn't tell me much about it yet, but I'll keep it in mind for what follows.`;
}

/* ---------------- E4: role, person and resolver forms ------------
 *
 * The saying side of the conversation frame (S5/S7, §5). Every
 * form below is a fixed conversational template selected by the
 * coordinator from the turn's ANALYSIS (the statement's class,
 * its contents slots, the role pack, the standing tuple) — the
 * same discipline as the spike's templates: F words what the
 * pieces decided, and a form's parameters come from the
 * statement's own contents, never from a stored reply.
 */

/**
 * A schmooze follow-up, formed from the statement's own slot:
 * a narrated doing/plan earns the motivation question (the
 * design's canonical form — "And what made you want to do
 * that?" is the shape a voluntary doing licenses); a person
 * introduced as new earns the meeting question; anything else
 * earns an invitation to say more about the topic itself.
 */
export function renderSchmoozeFollowup(
  slot: "doing" | "new-person" | "topic",
  topicText: string,
): string {
  if (slot === "doing") return "And what made you want to do that?";
  if (slot === "new-person") return "Have you met them yet?";
  return `Tell me more about the ${topicText}.`;
}

/**
 * The continuity clause for a CONNECTED statement (§5's worked
 * example): the statement's topic is the object of a recorded
 * preference held by one of the person's people — the reply
 * says the connection, with the inference's shape visible
 * ("he'll like that" is a hope about an occasion, stated as
 * one). Pronouns by the relation word, else "they".
 */
const SUBJECT_PRONOUN: Record<string, string> = {
  brother: "he", father: "he", boyfriend: "he", husband: "he", son: "he",
  sister: "she", mother: "she", girlfriend: "she", wife: "she", daughter: "she",
};

export function renderContinuityClause(display: string, subject: string): string {
  const pron = SUBJECT_PRONOUN[subject] ?? "they";
  return `And ${display} — ${pron}'ll like that.`;
}

/** A captured feeling with no graph reaction: the state, acknowledged as stated. */
export function renderStateNoted(feelingText: string, pattern: string | null): string {
  return pattern
    ? `${cap(feelingText)}, ${pattern} — noted. That sounds like a lot to carry.`
    : `${cap(feelingText)} — noted.`;
}

/**
 * The acknowledgement clause appended when a statement carried
 * a first-person DOING the situation model recorded as an event
 * (E5): the happening is acknowledged AS a happening —
 * participants and time ride in the action phrase — beside
 * whatever the statement strategy said about its topic.
 */
export function renderEventAcknowledgement(
  action: string,
  timeText: string | null,
  frameName: string | null,
): string {
  return `Noted as an event: ${action}${timeText ? ` (${timeText})` : ""}` +
    `${frameName ? ` — roles from the ${frameName} frame` : ""}.`;
}

/** A memory write's acknowledgement, in the role's voice, naming what was kept. */
export function renderRememberAck(ack: string, display: string): string {
  return `${ack} ${cap(display)}.`;
}

/** General mode's honest version: session-only, nothing filed. */
export function renderRememberSessionOnly(): string {
  return "I'll keep that in mind for this conversation — in general mode I don't keep a file for you, so it won't survive the session.";
}

/** "What do you remember about me?" — the file, read back plainly. */
export function renderRecall(factDisplays: string[], patternLines: string[]): string {
  const parts = [...factDisplays, ...patternLines];
  if (!parts.length) return "There's nothing in your file yet — you haven't told me anything to keep.";
  return `Here's what I have: ${parts.join("; ")}.`;
}

export function renderRecallGeneral(): string {
  return "I don't keep a file for you in general mode, so there's nothing stored about you from before this conversation.";
}

/**
 * The resolver's ASK (S8): opens with the clarity admission —
 * "I am not clear" is the tuple's clarity axis bottoming out —
 * and names the pre-mapped branches the person's answer will
 * select between.
 */
export function renderClarificationAsk(termText: string, labels: string[]): string {
  return `I am not clear which ${termText} you mean — ${labels.join(", or ")}?`;
}

/** The resolver's NAME form: the reading taken, stated before the answer. */
export function renderNamedReading(termText: string, label: string): string {
  return `Taking ${termText} as ${label} —`;
}

/* The companion's PLAIN decline style: the same empty sets and
 * the same honesty, worded briefly. Grounding outranks role —
 * only the wording differs (§5). */

export function renderNoFactPlain(termText: string): string {
  return `I don't know that one — this graph doesn't say anything usable about "${termText}".`;
}

export function renderWhyNoCausePlain(effectText: string, causeText: string | null): string {
  return causeText
    ? `I don't know — this graph has no Causes edge from "${causeText}" toward "${effectText}".`
    : `I don't know — this graph doesn't record a cause for "${effectText}".`;
}

export function renderDeclineUnplacedPlain(unplaced: string[]): string {
  const named = unplaced.length ? `"${unplaced.slice(0, 3).join('", "')}"` : "that";
  return `I don't know ${named} — it isn't in what I know yet.`;
}

export function renderToolDeclinePlain(usedForPhrase: string): string {
  return `I don't know a tool for that — nothing here is recorded as used for ${usedForPhrase}.`;
}
