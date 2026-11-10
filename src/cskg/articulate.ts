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
import { BALANCED_DISPOSITION, type Disposition } from "./disposition";
import type { CskgEdge, CskgGraph } from "./loader";
import type { RolePack } from "./roles";
import type { StatementPlan } from "./statement";
import { noteStep, type TurnWorkspace } from "./workspace";

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

/* ---------------- compose: the singular Conclusion (Item 3, S1/S2/S13) ---
 *
 * Design §2 F: compose forms a Conclusion — the structured set of
 * things this reply will communicate, selected, ordered and
 * grouped — from the turn's reasoning, and articulation renders
 * it. The Conclusion carries each item's attestation (the edge),
 * and the turn logs it in the trace, so "why did you say that?"
 * can point at it.
 *
 * This leaf wires the first path through it: same-relation
 * template conclusions about one subject aggregate into one
 * headline sentence instead of N staccato template sentences
 * (S1 aggregation, S13 set presentation). Banked conclusions keep
 * their dataset phrasing and render separately; mixed-relation
 * sets and singletons render exactly as renderAll would, so only
 * an aggregatable group moves a transcript. Limits: aggregation
 * covers /r/UsedFor about-from this leaf; support mixes split
 * into separate sentences (no understating); a verb object is
 * proven per turn by its gerund mapping back through the graph's
 * FormOf (junk gerund rows remain a limit).
 */

export interface ComposedConclusion {
  /** the leading group: what the reply leads with */
  headline: Conclusion[];
  /** everything else, attested backup said after */
  support: Conclusion[];
  /** selected out as vacuous (object is the subject's own form) */
  dropped: Conclusion[];
}

/**
 * Gap 5, S2 selection: a conclusion whose object resolves to the
 * subject's own form says nothing beyond the term ("paint is for
 * painting") — selected out before grouping, whatever its
 * phrasing path (banked or template). The drop is the
 * directing layer's selection, not a testimony judgment.
 */
export function isTautological(g: CskgGraph, c: Conclusion): boolean {
  const subject = composeSubject(g, c);
  const object = composeObject(g, c);
  if (!object || !subject) return false;
  if (object.toLowerCase() === subject.toLowerCase()) return true;
  return g.lemmaOf(object) === subject;
}

/** one aggregatable run: same relation, subject, modal and phrasing path */
interface ComposeRun {
  key: string;
  members: Conclusion[];
  banked: boolean;
}

function composeSubject(g: CskgGraph, c: Conclusion): string {
  return c.about === "from" ? g.terms[c.edge.from] : g.terms[c.edge.to];
}

function composeObject(g: CskgGraph, c: Conclusion): string {
  return c.about === "from" ? g.terms[c.edge.to] : g.terms[c.edge.from];
}

function composeStrong(c: Conclusion): boolean {
  return c.edge.support >= 2;
}

/**
 * Per-turn verb proof for an aggregation object: the gerund the
 * data would form for it maps straight back through the graph's
 * own FormOf testimony (hitting→hit, but metalling→metal is the
 * documented junk-row limit). Multi-word objects never qualify.
 */
function isVerbObject(g: CskgGraph, obj: string): boolean {
  if (!/^[a-z]{2,}$/.test(obj)) return false;
  if (/\s/.test(obj)) return false;
  return g.lemmaOf(gerundOf(obj)) === obj;
}

function joinList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * A run aggregates this leaf only for the covered shape:
 * 2+ template conclusions, one /r/UsedFor about-from subject,
 * one modal, every object a per-turn proven verb.
 */
function aggregateFrame(
  g: CskgGraph,
  run: ComposeRun,
): string | null {
  if (run.banked || run.members.length < 2) return null;
  const first = run.members[0];
  if (first.edge.rel !== "/r/UsedFor" || first.about !== "from") return null;
  const subject = composeSubject(g, first);
  const objects = run.members.map((c) => composeObject(g, c));
  const modal = run.members.every(composeStrong) ? "is" : "can be";
  for (const c of run.members) c.via = "template";
  if (objects.every((o) => isVerbObject(g, o))) {
    return `${cap(article(subject))} ${subject} ${modal} used to ${joinList(objects)}.`;
  }
  // Gap 5: the noun frame — same relation, subject and modal,
  // none of them verb-proven. Mixed groups (one verb, one noun)
  // stay separate: neither frame says them honestly.
  if (objects.every((o) => !isVerbObject(g, o))) {
    return `${cap(article(subject))} ${subject} ${modal} used for ${joinList(objects)}.`;
  }
  return null;
}

/**
 * Select, order and group: runs keep encounter (rank) order, the
 * first run is the headline, the rest is support. Order never
 * changes here — ranking stays solve's work (S2 selection beyond
 * headline/support is a later leaf).
 */
export function composeConclusions(
  g: CskgGraph,
  cs: Conclusion[],
  headlineMax = 3,
): ComposedConclusion {
  if (!cs.length) return { headline: [], support: [], dropped: [] };
  // S2 selection first: vacuous conclusions never reach grouping.
  // Never strand the turn: if everything would drop, keep the first.
  let kept = cs.filter((c) => !isTautological(g, c));
  if (!kept.length) kept = cs.slice(0, 1);
  const dropped = cs.filter((c) => !kept.includes(c));
  const runs: ComposeRun[] = [];
  for (const c of kept) {
    const banked = sentenceForEdge(g, c.edge) !== null;
    const key = [
      c.edge.rel, c.about, composeSubject(g, c),
      composeStrong(c) ? "strong" : "weak",
      banked ? "bank" : "template",
    ].join("|");
    const run = runs.find((r) => r.key === key);
    if (run) run.members.push(c);
    else runs.push({ key, members: [c], banked });
  }
  const headline = runs[0].members.slice(0, headlineMax);
  const overflow = runs[0].members.slice(headlineMax);
  const support = [...overflow, ...runs.slice(1).flatMap((r) => r.members)];
  return { headline, support, dropped };
}

/** Render the composed Conclusion: aggregated runs collapse, all else renders as before. */
export function renderComposed(g: CskgGraph, cc: ComposedConclusion): string {
  const parts: string[] = [];
  const renderRun = (members: Conclusion[]): void => {
    const banked = members.length
      ? sentenceForEdge(g, members[0].edge) !== null
      : false;
    const framed = aggregateFrame(g, { key: "", members, banked });
    if (framed !== null) parts.push(framed);
    else for (const c of members) parts.push(renderConclusion(g, c));
  };
  // re-group each side by run so support keeps its own grouping
  const regroup = (ms: Conclusion[]): Conclusion[][] => {
    const runs: ComposeRun[] = [];
    for (const c of ms) {
      const banked = sentenceForEdge(g, c.edge) !== null;
      const key = [
        c.edge.rel, c.about, composeSubject(g, c),
        composeStrong(c) ? "strong" : "weak",
        banked ? "bank" : "template",
      ].join("|");
      const run = runs.find((r) => r.key === key);
      if (run) run.members.push(c);
      else runs.push({ key, members: [c], banked });
    }
    return runs.map((r) => r.members);
  };
  for (const runMembers of regroup(cc.headline)) renderRun(runMembers);
  for (const runMembers of regroup(cc.support)) renderRun(runMembers);
  return parts.join(" ");
}

/* ---------------- the state pattern (L2-M3) ----------------
 *
 * A stated feeling is answered with the GENERAL PATTERN it
 * belongs to — what people in that state typically feel, want
 * and do. That is the classical gesture this engine exists
 * for: pattern-knowledge over the particular. But ATOMIC's
 * script phrases are fragments — a finite verb phrase for the
 * event ("waits nervously"), bare tails for the rest
 * ("injured", "cries") — and pasting them raw into sentence
 * frames produced agreement-broken soup ("they want to
 * injured", "they cries"). So the pattern is rendered with
 * real morphology, and GATED: a sentence is included only
 * when its forms can be put right from the graph's own lemma
 * knowledge; if no sentence can be said correctly, the
 * pattern is declined whole and the state stands as captured.
 */

/**
 * A verb surface's base form, vouched for by the graph: the
 * lemma map records inflected surfaces, and a word already in
 * base form may have no entry there — then the word itself
 * serves, when it carries no inflectional ending and the
 * graph holds it as a term.
 */
function verbBaseOf(g: CskgGraph, word: string): string | null {
  const lemma = g.lemmaOf(word);
  if (lemma) return lemma;
  if (!/s$|ed$|en$|ing$/.test(word) && g.id(word) !== undefined) return word;
  return null;
}

/** The copula's forms — a closed function-word paradigm. */
const COPULA = new Set(["is", "am", "are", "was", "were", "be", "been", "being"]);

/** The -ing form of a base verb (standard spelling rules). */
function gerundOf(base: string): string {
  if (base.endsWith("ie")) return `${base.slice(0, -2)}ying`;
  if (base.length > 2 && /[^aeiou]e$/.test(base)) return `${base.slice(0, -1)}ing`;
  if (/[^aeiou][aeiou][^aeiouwxy]$/.test(base)) return `${base}${base.slice(-1)}ing`;
  return `${base}ing`;
}

/**
 * The base form for an ATOMIC effect tail after "they": the
 * tail is stored as a finite third-person form ("cries",
 * "yawns", "goes") whose lemma is the base. A participle
 * ("injured") is the person's PASSIVE — "they injured" would
 * reverse it — so participles are unsayable here and rejected.
 */
function effectBaseOf(g: CskgGraph, word: string): string | null {
  const lemma = g.lemmaOf(word);
  if (!lemma) {
    return /s$|ed$|en$|ing$/.test(word) || g.id(word) === undefined ? null : word;
  }
  if (lemma !== word) return word.endsWith("s") ? lemma : null;
  return /s$|ed$|en$/.test(word) ? null : word;
}

/**
 * Render one ATOMIC event's reaction conclusions as the
 * general pattern, said correctly — or null when it cannot
 * be. The event label becomes a gerund clause ("waiting
 * nervously"); PersonX may stand as the label's subject (the
 * pattern supplies its own), but a person placeholder in any
 * argument position is a slot the saying cannot fill, and
 * the event is unsayable.
 */
export function renderStatePattern(
  g: CskgGraph,
  eventLabel: string,
  cs: Conclusion[],
): { text: string; used: Conclusion[] } | null {
  let words = eventLabel.toLowerCase().split(/\s+/).filter(Boolean);
  if (words[0] === "personx") words = words.slice(1);
  words = words.filter((w) => w !== "___");
  if (!words.length || words.some((w) => w === "personx" || w === "persony")) return null;
  // The event clause in its two frames: the when-frame of a
  // reaction and the after-frame of a want/effect. A lexical
  // verb gives one gerund clause for both ("waiting
  // nervously"). A copula event ("is tired") is a STATE, not
  // an action: the when-frame takes the bare complement
  // ("when tired"), the after-frame the being-form ("after
  // being tired").
  let whenClause: string;
  let afterClause: string;
  if (COPULA.has(words[0])) {
    const rest = words.slice(1).join(" ");
    if (!rest) return null;
    whenClause = rest;
    afterClause = `being ${rest}`;
  } else {
    const headBase = verbBaseOf(g, words[0]);
    if (!headBase) return null;
    whenClause = afterClause = [gerundOf(headBase), ...words.slice(1)].join(" ");
  }
  const gerundClause = afterClause;

  const sentences: string[] = [];
  const used: Conclusion[] = [];
  for (const c of cs) {
    if (sentences.length >= 3) break;
    const obj = (g.terms[c.edge.to] ?? "").toLowerCase().trim();
    if (!obj || /\bpersonx\b|\bpersony\b/.test(obj)) continue;
    const ow = obj.split(/\s+/).filter(Boolean);
    const others = c.edge.rel.startsWith("at:o");
    let sentence: string | null = null;
    if (c.edge.rel === "at:xReact" || c.edge.rel === "at:oReact") {
      // "People often feel <obj> when <event>" — the object is
      // a feeling word/phrase; a finite verb form in it would
      // break the frame, so it is gated out.
      const finiteInside = ow.some((w) => {
        const l = g.lemmaOf(w);
        return l !== undefined && l !== w && w.endsWith("s");
      });
      if (ow.length <= 3 && !finiteInside) {
        sentence = others
          ? `Others often feel ${obj} when ${whenClause}.`
          : `People ${c.edge.support >= 2 ? "" : "often "}feel ${obj} when ${whenClause}.`;
      }
    } else if (c.edge.rel === "at:xEffect" || c.edge.rel === "at:oEffect") {
      const base = effectBaseOf(g, ow[0]);
      if (base && ow.length <= 4) {
        sentence = `After ${gerundClause}, ${others ? "others" : "they"} ${[base, ...ow.slice(1)].join(" ")}.`;
      }
    } else if (c.edge.rel === "at:xWant" || c.edge.rel === "at:oWant") {
      // "they want to <phrase>" — the phrase must be an
      // infinitive the data itself gives ("to go home"), or a
      // bare base-verb phrase. A participle object
      // ("injured") would need a guessed "be" and reverses
      // who acts — declined.
      let phrase: string | null = null;
      if (obj.startsWith("to ") && ow.length <= 5 && verbBaseOf(g, ow[1])) {
        phrase = obj.slice(3);
      } else {
        const l = g.lemmaOf(ow[0]);
        if ((l === undefined || l === ow[0]) && !/s$|ed$|en$/.test(ow[0]) && ow.length <= 4) {
          phrase = obj;
        }
      }
      if (phrase) {
        sentence = `After ${gerundClause}, ${others ? "others" : "they"} want to ${phrase}.`;
      }
    }
    if (sentence) {
      sentences.push(sentence);
      used.push(c);
    }
  }
  if (!sentences.length) return null;
  const text = sentences.join(" ");
  if (/\bpersonx\b|\bpersony\b/i.test(text)) return null;
  return { text, used };
}

/**
 * The addressed lead for a feeling statement whose pattern
 * rendered (L2-M3): the person's own state, taken up in
 * second person from the record, before the general pattern
 * speaks. Null when the recorded text can't head the frame.
 */
export function renderFeelingLead(feelingText: string): string | null {
  const t = feelingText.trim().toLowerCase();
  if (!t || t.length > 40 || /^like\b/.test(t)) return null;
  return `You're ${t}.`;
}

export function cap(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * Perspective flip for a span of the PERSON's own words being
 * echoed back to them (Loop 2, L2-B): the situation model stores
 * surface spans as spoken — "selling my bike" — and an answer
 * that repeats them verbatim speaks about the wrong person.
 * Rendered for the addressee, the speaker's first-person
 * possessives turn second-person: my → your, mine → yours.
 *
 * Apply ONLY to model spans (event actions, object phrases,
 * entity labels) at the point where a reply echoes them about
 * the speaker. Never apply to graph text (terms, glosses, edge
 * restatements are quoted as attested) and never to the engine's
 * own first person in templates ("I couldn't place…").
 */
export function forAddressee(text: string): string {
  return text
    .replace(/\bmy\b/g, "your")
    .replace(/\bMy\b/g, "Your")
    .replace(/\bmine\b/g, "yours")
    .replace(/\bMine\b/g, "Yours")
    .replace(/\bme\b/g, "you")
    .replace(/\bMe\b/g, "You");
}

/**
 * The statement acknowledgement LEAD, composed from the
 * situation model's own event entry (Loop 2, L2-A): when a
 * statement records the speaker doing something, the reply is
 * about THAT — the event restated to the person in second
 * person, with its stated time — not about a topic noun. The
 * verb form follows the recorded surface: a gerund action takes
 * the progressive ("You are selling your bike"); a past or base
 * form stands as spoken ("You set up the tent"). The action span
 * is the person's own words, so it is perspective-flipped for
 * the addressee (L2-B) before it is echoed.
 */
/**
 * A recorded time expression as it should READ in a reply
 * (Loop 2, L2-L): the model stores the surface it sliced,
 * which can carry a title-cased form ("Tomorrow") from the
 * graph term it resolved through. A relative time word is a
 * circumstance, not a participant's name — it takes its
 * natural lowercase. Weekday and month names are names and
 * keep their capitals.
 */
const RELATIVE_TIME_WORDS = new Set(["tomorrow", "yesterday", "today", "tonight"]);
export function displayTime(timeText: string): string {
  const m = timeText.match(/^([A-Za-z]+)(.*)$/);
  if (!m) return timeText;
  return RELATIVE_TIME_WORDS.has(m[1].toLowerCase())
    ? m[1].toLowerCase() + m[2]
    : timeText;
}

export function renderEventLead(
  verbSurface: string, action: string, timeText: string | null,
  mode: "ongoing" | "intended" = "ongoing", intentMarker: string | null = null,
): string {
  const addressed = forAddressee(action);
  // Loop 2 (L2-K): an intended event renders AS an intention,
  // in the person's own marker — the mode the situation model
  // recorded — never as a present fact.
  const head = mode === "intended"
    ? intentMarker === "plan to"
      ? `You plan to ${addressed}`
      : `You're thinking of ${addressed}`
    : intentMarker
      ? `You ${intentMarker} ${addressed}`
    : /ing$/i.test(verbSurface.trim())
      ? `You are ${addressed}`
      : `You ${addressed}`;
  return `${head}${timeText ? `, ${displayTime(timeText)}` : ""}.`;
}

/**
 * The statement acknowledgement LEAD for a recorded STATE
 * (Loop 2, L2-C): when a statement records a state in the
 * situation model — a circumstance with its stated duration
 * ("third day of rain") or a property of a thing ("bananas …
 * brown") — the reply leads with the state AS REPORTED,
 * attributed to the person's telling (the record's own
 * attribution stamp), instead of a filing about the topic
 * noun. The state spans are the person's own words, so they
 * are perspective-flipped for the addressee (L2-B) first.
 */
/**
 * The third-person form of the event lead (Loop 2, L2-D):
 * a statement that reports someone else's (or something's)
 * happening leads with that happening, the actor named as
 * the model holds them — "Your brother is bringing his new
 * girlfriend.", "Rain flooded the garden." The action span
 * is the person's own words, perspective-flipped for the
 * addressee (the speaker inside it — "teaching me to sail" —
 * is "you" in the reply).
 */
export function renderEventLeadFor(
  actorLabel: string, verbSurface: string, action: string, timeText: string | null,
): string {
  const who = cap(forAddressee(actorLabel));
  const addressed = forAddressee(action);
  const head = /ing$/i.test(verbSurface.trim()) ? `${who} is ${addressed}` : `${who} ${addressed}`;
  return `${head}${timeText ? `, ${displayTime(timeText)}` : ""}.`;
}

export function renderStateLead(
  label: string | null, text: string, kind: string,
): string {
  if (kind === "circumstance" || !label) {
    return `${cap(forAddressee(text))} — as you said.`;
  }
  const who = cap(forAddressee(label));
  const verb = /s$/i.test(label.trim()) ? "are" : "is";
  return `${who} ${verb} ${forAddressee(text)} — as you said.`;
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

/* S12 output repair (Item 4, first morph leaf): a correction that
 * supersedes a previous topic owns the repair in words — the old
 * reading and the new one are both named — instead of absorbing
 * the correction silently. One component, selected by what the
 * turn knows (previous topic vs none, same vs changed); role and
 * tuple selection over the repair frame is the next slice.
 */
export function renderCorrectionFact(
  termText: string,
  factSentence: string,
  prevTopicText: string | null = null,
  /** Item 4 leaf 2: the role pack selects the repair frame —
   *  acknowledge-and-offer owns the correction plainly,
   *  react-and-share reacts first and shares it. */
  statementStrategy: string = "acknowledge-and-offer",
): string {
  if (
    prevTopicText &&
    prevTopicText.toLowerCase() !== termText.toLowerCase()
  ) {
    if (statementStrategy === "react-and-share") {
      return `Ah — I had that as ${prevTopicText}, you meant ${termText}. ${factSentence}`;
    }
    return `I had that as ${prevTopicText} — you meant ${termText}. ${factSentence}`;
  }
  return `Got it — ${termText}. ${factSentence}`;
}

export function renderCorrectionNoFact(
  termText: string,
  prevTopicText: string | null = null,
): string {
  if (
    prevTopicText &&
    prevTopicText.toLowerCase() !== termText.toLowerCase()
  ) {
    return `I had that as ${prevTopicText} — you meant ${termText}. I don't have much on ${termText} in this graph yet.`;
  }
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

export function renderToolDecline(usedForPhrase: string, open = true): string {
  // Gap B: the open shape already gerund-frames its target
  // ("used for opening wine"), but the use-to shape carries a
  // verb phrase ("hang the cabinets") — "used for hang" is
  // broken grammar, "used to hang" is the frame it needs.
  return open
    ? `I don't have a tool for that in this graph — nothing here is recorded as used for ${usedForPhrase}.`
    : `I don't have a tool for that in this graph — nothing here is recorded as used to ${usedForPhrase}.`;
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

/* S8 offers (Item 6, first adaptive offer): a question the
 * architecture concludes — never an appendage scheduled by
 * policy. The offer fires only for a genuine gap the person can
 * fill: a fresh intended doing with no time. The plan is the
 * situation model's own record; the gap is read off it; nothing
 * is asked when the turn already carries the answer (§11: the
 * role follow-up stands re-grounded under this rule or silent).
 */
export function renderOfferTiming(): string {
  return "When's that happening?";
}

/**
 * The adaptive offer gate: a timing offer only when the doing is
 * intended, timeless, fresh to this turn, the frame's appetite is
 * not listening-only, and the role's strategy is to offer.
 * Companion shares instead; a listening frame stays silent.
 */
export function offerForPlannedDoing(
  mode: string,
  timeText: string | null,
  elicitation: string,
  statementStrategy: string,
): string | null {
  if (mode !== "intended" || timeText !== null) return null;
  if (elicitation === "listening") return null;
  if (statementStrategy !== "acknowledge-and-offer") return null;
  return renderOfferTiming();
}

/**
 * The phatic reply (gap 1): greetings and farewells are echoed
 * in the person's own word (S14 mirroring, not a template —
 * the word is theirs), thanks gets the social acknowledgement.
 * No graph claim is made, so no attestation is needed; the turn
 * succeeds socially, which E4 names a complete success.
 */
export function renderPhatic(kind: "greeting" | "thanks" | "farewell", word: string): string {
  if (kind === "thanks") return "You're welcome!";
  const w = word.toLowerCase();
  if (/^(how(?:'s| is) it going|how are you(?: doing)?|what'?s up)$/.test(w)) {
    return "Doing all right — thanks for asking.";
  }
  return `${word.charAt(0).toUpperCase()}${word.slice(1)}!`;
}

/** A memory write's acknowledgement, in the role's voice, naming what was kept. */
export function renderRememberAck(ack: string, display: string): string {
  return `${ack} ${cap(display)}.`;
}

/** General mode's honest version: session-only, nothing filed. */
export function renderRememberSessionOnly(): string {
  return "I'll keep that in mind for this conversation — in general mode I don't keep a file for you, so it won't survive the session.";
}

/** General mode: a stated name/place kept for this session only. */
export function renderSessionFactAck(displays: string[]): string {
  return `I'll keep that in mind for this conversation — ${displays.join("; ")}.`;
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

/** Same-session name or place when nothing was stated. */
export function renderRecallMissing(kind: "name" | "place"): string {
  return kind === "name"
    ? "You haven't told me your name."
    : "You haven't told me where you live.";
}

/**
 * Empty-set decline for "does X go in Y?": the asked composition
 * is named, and a neighbouring IsA of Y is not substituted.
 */
export function renderCompositionDecline(inner: string, outer: string): string {
  return `This graph doesn't record that ${inner} go in ${outer} — no HasA, PartOf, or AtLocation edge between them, and I won't substitute a neighbouring fact.`;
}

export function renderCompositionDeclinePlain(inner: string, outer: string): string {
  return `I don't know whether ${inner} go in ${outer} — this graph has no HasA, PartOf, or AtLocation edge between them.`;
}

/** Empty composition set for "what else should I put in?". */
export function renderAdviceAdditionDecline(outer: string): string {
  return `This graph doesn't record what else to put in ${outer} — no HasA or PartOf ingredient of it, and I won't substitute a neighbouring fact.`;
}

export function renderAdviceAdditionDeclinePlain(outer: string): string {
  return `I don't know what else to put in ${outer} — this graph has no HasA or PartOf ingredient of it.`;
}

export function renderAdviceAdditionNone(): string {
  return "This graph doesn't record what else to put in — no dish is in play, and I won't substitute a neighbouring fact.";
}

/** Wear advice: the garment's UsedFor is the evidence for the yes. */
export function renderAdviceWearYes(evidence: string): string {
  return `Yes — ${evidence}`;
}

export function renderAdviceWearDecline(item: string): string {
  return `This graph doesn't record what a ${item} is used for — no UsedFor edge in it reaches that, and I won't substitute a neighbouring fact.`;
}

export function renderAdviceWearDeclinePlain(item: string): string {
  return `I don't know what a ${item} is used for — this graph has no UsedFor edge for it.`;
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

/**
 * The attestation decline (Loop 1, design-abstention): a
 * specific-fact ask whose two poles — the bearer/subject and
 * the value, role, count or event asked for — are connected by
 * no graph edge and stated in no record. The reply names the
 * poles and the missing connection, the same honesty shape as
 * the why-decline: the graph's silence about what was asked is
 * the answer, and no neighbouring fact is substituted.
 */
export function renderUnattestedAsk(aText: string, bText: string): string {
  return `This graph doesn't record that: nothing in it connects "${aText}" with "${bText}" — the fact asked for isn't attested here, and I won't substitute a neighbouring one.`;
}

export function renderUnattestedAskPlain(aText: string, bText: string): string {
  return `I don't know — this graph doesn't record that: nothing in it connects "${aText}" with "${bText}".`;
}

/**
 * Empty-set decline for a classified surface intent (purpose,
 * location, made-of, part, capability): the asked relation is
 * named, and a neighbouring IsA is not substituted. Same honesty
 * shape as the why-decline and G10's unattested-ask decline.
 */
export function renderNoSurfaceRelation(termText: string, kind: string): string {
  return `This graph doesn't record what "${termText}" ${surfaceAsked(kind)} — no ${surfaceRel(kind)} edge in it reaches that, and I won't substitute a neighbouring fact.`;
}

export function renderNoSurfaceRelationPlain(termText: string, kind: string): string {
  return `I don't know what "${termText}" ${surfaceAsked(kind)} — this graph has no ${surfaceRel(kind)} edge for it.`;
}

function surfaceAsked(kind: string): string {
  switch (kind) {
    case "purpose": return "is used for";
    case "location": return "is found at";
    case "madeof": return "is made of";
    case "part": return "is a part of";
    case "capability": return "is capable of";
    default: return "has that relation";
  }
}

function surfaceRel(kind: string): string {
  switch (kind) {
    case "purpose": return "UsedFor";
    case "location": return "AtLocation";
    case "madeof": return "MadeOf";
    case "part": return "PartOf";
    case "capability": return "CapableOf";
    default: return kind;
  }
}

export function renderToolDeclinePlain(usedForPhrase: string, open = true): string {
  return open
    ? `I don't know a tool for that — nothing here is recorded as used for ${usedForPhrase}.`
    : `I don't know a tool for that — nothing here is recorded as used to ${usedForPhrase}.`;
}

/* ---------------- statement plans (compose then articulate) ----
 *
 * The statement composer (statement.ts) produces a StatementPlan
 * — data only: conclusions already sit in the workspace, the
 * plan names which branch composed and what rides along. This
 * function words every variant, so the statement route keeps
 * one writer however the policy grows: F speaks, the policy
 * never does.
 */
export function renderStatementPlan(
  g: CskgGraph,
  ws: TurnWorkspace,
  plan: StatementPlan,
  role: RolePack,
): string {
  // Gap 1 stays word-for-word: the phatic-only reply is social
  // alone — no leading clause, no acknowledgement suffix.
  if (plan.content.kind === "phatic") {
    return renderPhatic(plan.content.phatic.kind, plan.content.phatic.word);
  }
  // every file write is acknowledged in the role's voice (§5)
  const ackSuffix =
    plan.rememberDisplay !== null && plan.rememberDisplay !== undefined
      ? ` ${renderRememberAck(role.memoryAck, plan.rememberDisplay)}`
      : plan.roleAck
        ? ` ${role.memoryAck}`
        : "";
  const withLead = (text: string): string =>
    plan.leading
      ? `${renderPhatic(plan.leading.kind, plan.leading.word)} ${text}`
      : text;
  const connectedClause = plan.connected
    ? ` ${renderContinuityClause(plan.connected.display, plan.connected.subject)}`
    : "";
  const c = plan.content;
  switch (c.kind) {
    case "state": {
      const lead = c.reactionText ? renderFeelingLead(c.feelingText) : null;
      const base = c.reactionText
        ? (lead ? `${lead} ${c.reactionText}` : c.reactionText)
        : renderStateNoted(c.feelingText, c.feelingPattern);
      return withLead(base + ackSuffix);
    }
    case "person-only-remember":
      return withLead(renderRememberAck(role.memoryAck, c.display));
    case "person-only-session":
      return withLead(renderSessionFactAck(plan.sessionAckDisplays));
    case "person-only-noted":
      return withLead(renderStatementNoted(c.text));
    case "leading-only":
      return plan.leading
        ? renderPhatic(plan.leading.kind, plan.leading.word)
        : "";
    case "doing": {
      let text = renderEventLead(
        c.doing.verb, c.doing.action, c.doing.timeText, c.doing.mode, c.doing.intentMarker);
      if (c.factAboutEvent && c.fact) text += ` ${renderConclusion(g, c.fact)}`;
      // S8, first adaptive offer (Item 6): the plan is fresh this
      // turn, its timing genuinely open, the frame willing to
      // ask, the role an offering one — the question concludes
      // from the model's own record, not from a slot.
      const disp: Disposition = ws.disposition ?? BALANCED_DISPOSITION;
      const offer = offerForPlannedDoing(
        c.doing.mode, c.doing.timeText, disp.elicitation, role.statementStrategy);
      if (offer) {
        noteStep(ws, "statement", "conclude",
          `adaptive offer: intended doing "${c.doing.action}" has no time; disposition ${disp.elicitation}; role ${role.id}`);
        text += ` ${offer}`;
      }
      return withLead(text + connectedClause + ackSuffix);
    }
    case "third-event":
      return withLead(
        renderEventLeadFor(c.third.actorLabel, c.third.verb, c.third.action, c.third.timeText) +
        connectedClause + ackSuffix);
    case "state-lead":
      return withLead(
        renderStateLead(c.lead.label, c.lead.text, c.lead.kind) +
        connectedClause + ackSuffix);
    case "fact":
      return withLead(renderConclusion(g, c.fact) + connectedClause + ackSuffix);
    case "session-ack":
      return withLead(
        renderSessionFactAck(plan.sessionAckDisplays) + connectedClause + ackSuffix);
    case "noted":
      return withLead(
        renderStatementNoted(c.termText) + connectedClause + ackSuffix);
  }
}
