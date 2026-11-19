/**
 * assess.ts — SemanticAssessment: the LPU unit that answers
 * "What is this?" (owner's direction, 2026-11-16).
 *
 * Takes the Parser's structure (a ParsedSentence) and renders the
 * assessment of the utterance as a whole, packaged as a semantic
 * object (semantic-object.ts) that then travels the system. The
 * judgement used to be made implicitly, in pieces, inside the
 * turn loop; this unit gathers it into one recorded answer.
 *
 * Slice 1 (shadow): kinds are the ones the loop already
 * distinguishes — a discourse act the parse named (topic-proposal,
 * reason-query), a question the parse recorded (its query slot),
 * or the default statement. Holes are only the slots the parse
 * itself names. Grounding reads the session as it stood BEFORE
 * this turn (the turn loop assesses before it records), so a mark
 * says what the stream had already established. Aspects and
 * composition are slice 3; nothing reads the object yet.
 *
 * One object per utterance in v1: the bundle type is an array,
 * and it grows past one when the parse yields several acts in a
 * single utterance.
 */
import type { Element, ParsedSentence } from "./sentence";
import type { Session } from "./session";
import type { AspectReading, GroundingMark, ObjectHole, SemanticObject } from "./semantic-object";
import { classificationsOf } from "./classify";
import { emotionAspect, emotionPriorFor } from "./ledu";
import { buildSensesFace } from "./senses-scening";
import { computeQuantityMentions } from "./quantification-language";
import { tierOfProvenance } from "./pricing";
import { compositionFromRanks, type Composition } from "./composition";
import { consultSituation, createInformationObject, type InformationObject } from "./info-object";
import { enIsFunctionWord } from "./parse";

/**
 * The object's aspect readings (slice 3): every content word the
 * OKU's classification table speaks for contributes its readings,
 * the concrete word retained as each reading's value. Emotion
 * readings route through the LEDU→EDU bridge (ledu.ts), which
 * names the canonical emotion; all other aspects come direct
 * from the table. Classification attaches to aspects, never to
 * the object wholesale.
 */
export function classifyAspects(parsed: ParsedSentence): AspectReading[] {
  const readings: AspectReading[] = [];
  const seen = new Set<string>();
  for (const n of parsed.meaning.nodes) {
    const push = (r: AspectReading) => {
      const key = `${r.aspect}:${r.value}`;
      if (!seen.has(key)) {
        seen.add(key);
        readings.push(r);
      }
    };
    const emotion = emotionAspect(n.lemma);
    if (emotion) push(emotion);
    for (const e of classificationsOf(n.lemma)) {
      if (e.aspect === "emotion") continue; // routed via the LEDU above
      push({
        aspect: e.aspect,
        value: n.lemma,
        element: e.element,
        tier: tierOfProvenance(e.provenance),
        confidence: e.confidence,
        source: `OKU classification table: '${e.concept}' (${e.aspect})`,
      });
    }
  }
  return readings;
}

/**
 * The composition roll-up (slice 3): the aspects' elements,
 * weighted by their classifications' confidences and summed,
 * ranked strongest first — a ranked predominance list in the
 * disposition format, never percentages. Ties keep first-seen
 * order. No classified aspect → no composition.
 */
export function rollUpComposition(readings: AspectReading[]): Composition | undefined {
  const weight = new Map<Element, number>();
  for (const r of readings) {
    if (!r.element) continue;
    const el = r.element as Element;
    weight.set(el, (weight.get(el) ?? 0) + (r.confidence ?? 0.5));
  }
  if (!weight.size) return undefined;
  const ranks = [...weight.entries()].sort((a, b) => b[1] - a[1]).map(([el]) => el);
  return compositionFromRanks(ranks.slice(0, 3));
}

export interface AssessContext {
  turn: number;
  /** The surface text as said — retained on the object. */
  surface: string;
  session: Session;
}

/** The closed set of English greeting forms (slice 2). A form's
 *  register rides on the retained surface; the mirror reply is
 *  generated from the object's own graph. */
const GREETING_FORMS = new Set(["hello", "hi", "hey", "greeting"]);

/**
 * The matter vocabulary of the elliptical return (C3 shape
 * (h), S1 2026-11-19): the facts-of-a-person the self-fact
 * family trades in — a birthplace, a family, an occupation,
 * a home, pets, hobbies — and the name, which is the
 * Identity table's fact, not a limits fact. A bare return
 * question resolves only to a matter in this vocabulary;
 * anything else in play (a feeling, a topic, an event) is
 * not a self-fact the return can ask after.
 */
export const RETURN_MATTERS: { pattern: RegExp; matter: string }[] = [
  { pattern: /\bbirth\s?place\b/, matter: "birthplace" },
  { pattern: /\bborn\b/, matter: "birthplace" },
  { pattern: /\bfamily\b/, matter: "family" },
  { pattern: /\bjob\b/, matter: "occupation" },
  { pattern: /\bname\b/, matter: "name" },
  { pattern: /\bhome\b/, matter: "home" },
  { pattern: /\bhobbies\b/, matter: "hobbies" },
  { pattern: /\bhobby\b/, matter: "hobbies" },
  { pattern: /\bpets\b/, matter: "pets" },
  { pattern: /\bpet\b/, matter: "pets" },
  { pattern: /\bdogs\b/, matter: "dogs" },
  { pattern: /\bdog\b/, matter: "dogs" },
  { pattern: /\bcats\b/, matter: "cats" },
  { pattern: /\bcat\b/, matter: "cats" },
  { pattern: /\bchildren\b/, matter: "children" },
];

export function assessUtterance(parsed: ParsedSentence, ctx: AssessContext): SemanticObject[] {
  const { session, turn, surface } = ctx;
  const root = parsed.meaning.nodes.find((n) => n.id === parsed.meaning.rootId);

  // A greeting is a bare topic with no predication, drawn from a
  // small closed set of greeting forms — the assessment's
  // vocabulary knowledge, as the lexicon's tables are the
  // parser's. It carries no content at all; everything in its
  // handling comes from situation, coherence and disposition.
  const isGreeting = Boolean(
    (root && root.role === "topic" && parsed.meaning.edges.length === 0 && GREETING_FORMS.has(root.lemma.toLowerCase())) ||
      // The there-form (S2, the S programme, 2026-11-19):
      // "hey there." graphs as the topic 'there' qualified by
      // the greeting word — the same bare greeting carrying
      // its address particle, no content. Drawn so the fused
      // forms ("hey there how are you today?") meet a greeting
      // segment the mirror can return, not a statement ack.
      (root &&
        root.role === "topic" &&
        root.lemma.toLowerCase() === "there" &&
        parsed.meaning.edges.length > 0 &&
        parsed.meaning.edges.every((e) => {
          if (e.relation !== "qualifies" || e.to !== root.id) return false;
          const src = parsed.meaning.nodes.find((n) => n.id === e.from);
          return src !== undefined && GREETING_FORMS.has(src.lemma.toLowerCase());
        })),
  );

  // The daypart greetings (conversation-shapes C1, 2026-11-18):
  // "Good morning." — the daypart as topic, qualified by "good"
  // (parse.ts's daypart fragment), or the bare daypart ("Morning.").
  // The closed set is the daypart vocabulary itself; "night" is
  // the daypart farewell, below, not a greeting.
  const DAYPART_GREETINGS = new Set(["morning", "afternoon", "evening"]);
  const goodQualified = (lemma: string) =>
    Boolean(
      root &&
        root.role === "topic" &&
        root.lemma.toLowerCase() === lemma &&
        parsed.meaning.edges.every((e) => {
          if (e.relation !== "qualifies" || e.to !== root.id) return false;
          const src = parsed.meaning.nodes.find((n) => n.id === e.from);
          return src?.lemma.toLowerCase() === "good";
        }),
    );
  const isDaypartGreeting = Boolean(root && DAYPART_GREETINGS.has(root.lemma.toLowerCase()) && goodQualified(root.lemma.toLowerCase()));
  const isDaypartFarewell = goodQualified("night");

  // The wellbeing query is recognised further below, with the
  // other social acts (it needs the interrogative reading).

  // A question is drawn two ways by the parse: a wh-question
  // records its questioned slot (query); a polar question carries
  // interrogative mood on the root and no query — what it opens
  // is the predication itself.
  const interrogative = root?.states?.mood === "interrogative";

  // The social acts (Social Unit S1, 2026-11-18; design:
  // ansci-social-unit-design.md §1–§2). Each is recognised from
  // the parse's own structure, in the greeting's manner — a bare
  // topic from a closed set, or one fixed predication shape —
  // never from the raw surface.
  const LEAVE_TAKING_FORMS = new Set(["goodbye", "bye", "farewell"]);
  const isLeaveTaking = Boolean(
    (root && root.role === "topic" && parsed.meaning.edges.length === 0 && LEAVE_TAKING_FORMS.has(root.lemma.toLowerCase())) ||
      isDaypartFarewell,
  );
  // The see-you farewell (conversation-shapes C1, 2026-11-18):
  // "See you then." — an imperative see whose only matter is the
  // addressed "you" and at most a closing-time word. It is the
  // closing fused thanks turns end with ("Thank you very much.
  // See you then."); the imperative of any other content is not
  // this act.
  const SEE_YOU_TAIL = new Set(["see", "you", "then", "later", "soon", "tomorrow"]);
  const isSeeYou = Boolean(
    root &&
      root.role === "verb" &&
      root.lemma.toLowerCase() === "see" &&
      root.states?.mood === "imperative" &&
      parsed.meaning.nodes.some((n) => n.lemma.toLowerCase() === "you") &&
      parsed.meaning.nodes.every((n) => SEE_YOU_TAIL.has(n.lemma.toLowerCase())),
  );
  // Thanks arrives two ways: the bare topic ("Thanks.") and the
  // one predication "Thank you." — a thank-verb whose only edge
  // is its recipient. The bare topic may carry its quantifier
  // ("Many thanks."): a qualifies edge from "many" is part of
  // the form, not content (conversation-shapes C1, 2026-11-18).
  // The quantified forms' shapes changed under the union
  // (merge fix, 2026-11-19): with the §6 adverb restoration the
  // intensifier is in the graph — "very" modulates the verb —
  // and where "so much" tails the form, the chunk machinery
  // heads that tail chunk at "much", so the bare topic reads
  // "much" qualified by "thanks" and "so", and the predication's
  // recipient node is "much" qualified by "you" and "so". The
  // recognition reads those shapes too: an intensifier riding
  // the form is part of the form, never content — but any other
  // edge (an agent on the verb, content qualifying the
  // recipient) takes the turn out of the form, as before.
  const INTENSIFIERS = new Set(["so", "very", "much"]);
  const nodeOf = (id: string) => parsed.meaning.nodes.find((n) => n.id === id);
  const isThanks = Boolean(
    root &&
      ((root.role === "topic" &&
        root.lemma.toLowerCase() === "thanks" &&
        parsed.meaning.edges.every((e) => {
          if (e.relation !== "qualifies") return false;
          const src = nodeOf(e.from);
          return src?.lemma.toLowerCase() === "many" || src?.lemma.toLowerCase() === "much";
        })) ||
        (root.role === "topic" &&
          root.lemma.toLowerCase() === "much" &&
          parsed.meaning.edges.length > 0 &&
          parsed.meaning.edges.every((e) => {
            if (e.relation !== "qualifies" || e.to !== root.id) return false;
            const src = nodeOf(e.from)?.lemma.toLowerCase();
            return src === "thanks" || INTENSIFIERS.has(src ?? "");
          }) &&
          parsed.meaning.edges.some((e) => nodeOf(e.from)?.lemma.toLowerCase() === "thanks")) ||
        (root.role === "verb" &&
          root.lemma.toLowerCase() === "thank" &&
          (() => {
            const rootOut = parsed.meaning.edges.filter((e) => e.from === root.id);
            const recipient = rootOut.find((e) => e.relation === "recipient");
            if (!recipient || !rootOut.every((e) => e.relation === "recipient")) return false;
            const recipNode = nodeOf(recipient.to);
            if (!recipNode) return false;
            const recipLemma = recipNode.lemma.toLowerCase();
            if (recipLemma !== "you" && recipLemma !== "much") return false;
            const rest = parsed.meaning.edges.filter((e) => e.from !== root.id);
            const restOk = rest.every(
              (e) =>
                (e.relation === "modulates" &&
                  e.to === root.id &&
                  INTENSIFIERS.has(nodeOf(e.from)?.lemma.toLowerCase() ?? "")) ||
                (e.relation === "qualifies" &&
                  e.to === recipient.to &&
                  (nodeOf(e.from)?.lemma.toLowerCase() === "you" ||
                    INTENSIFIERS.has(nodeOf(e.from)?.lemma.toLowerCase() ?? ""))),
            );
            if (!restOk) return false;
            // A "much" recipient is the intensifier chunk's
            // head; the thanked person must be inside it.
            if (recipLemma === "much" && !rest.some((e) => nodeOf(e.from)?.lemma.toLowerCase() === "you")) return false;
            return true;
          })())),
  );
  // A self-query asks about the system itself: an interrogative
  // predication of "you" by a question word ("Who are you?",
  // "What are you?").
  const isSelfQuery = Boolean(
    interrogative &&
      parsed.meaning.edges.some((e) => e.relation === "predicated-as") &&
      parsed.meaning.nodes.some((n) => n.lemma.toLowerCase() === "you") &&
      parsed.meaning.nodes.some((n) => n.questionWord && (n.lemma.toLowerCase() === "who" || n.lemma.toLowerCase() === "what")),
  );
  // The capability self-query (Social Unit S3, 2026-11-18):
  // "What can you do?" — an interrogative whose verb root is
  // the lexical "do", whose agent is "you", whose clause
  // carries the modal "can", and whose questioned slot is
  // "what". S1 could not recognise it because the sentence
  // layer drew no shape for it at all; S3's parse fix (the
  // lexical-do pass in parse.ts) draws the shape, and this
  // recognition reads it. The modal is required: "What do you
  // do?" asks after an occupation, not a capability, and stays
  // an ordinary question.
  const isCapabilityQuery = Boolean(
    interrogative &&
      root?.role === "verb" &&
      root.lemma.toLowerCase() === "do" &&
      (root.states?.aux === "can" || root.states?.modal === "can") &&
      parsed.meaning.nodes.some((n) => n.lemma.toLowerCase() === "you") &&
      parsed.meaning.nodes.some((n) => n.questionWord && n.lemma.toLowerCase() === "what"),
  );

  // The wellbeing query (conversation-shapes C1, 2026-11-18):
  // "How are you?" and its fused kin — the greeting's ritual
  // exchange (semantic-object.ts: the greeting's "How are you?"
  // and its "Fine." are recorded as ritual). Recognition is from
  // the parse's own content, as with the other social acts: an
  // interrogative whose every node is phatic material — the
  // "how" question word, the addressed "you", greeting words and
  // the light verbs the fused forms carry — and nothing else.
  // A question with any content word in it ("How is the garden?",
  // "How do you know?") is not this act and is never captured.
  const PHATIC_LEMMAS = new Set([
    "how", "you", "hello", "hi", "hey", "there", "today", "tonight", "do", "doing", "go", "going", "are", "is", "it", "up", "fine", "well",
  ]);
  const allPhatic = parsed.meaning.nodes.every((n) => PHATIC_LEMMAS.has(n.lemma.toLowerCase()));
  // The parse's own token record, normalised — positional
  // evidence for the two recognitions below whose matter the
  // graph itself drops (the possessed noun of "your rank", the
  // degree of "how old"): the tokens are the parse's record of
  // the surface, read by position, never scanned for content.
  const tokens = parsed.connective.tokens.map((t) => t.toLowerCase().replace(/[^a-z']/g, ""));
  const tokenAfter = (w: string): string | undefined => {
    const i = tokens.indexOf(w);
    return i >= 0 ? tokens[i + 1] : undefined;
  };
  // The time-of-day adjuncts the enquiry carries ("today",
  // "tonight" — S2, the S programme, 2026-11-19): the doing
  // forms draw the adjunct as the verb's patient ("how are
  // you doing tonight?" graphs do/how/tonight), which the
  // patient guard below read as a manner question's object.
  // A time word in the patient slot is the exchange's frame,
  // not something done or known, and does not defeat the
  // recognition; "tonight" joins "today" in the phatic set
  // on the same ground.
  const TIME_WORDS = new Set(["today", "tonight"]);
  const isWellbeingQuery = Boolean(
    interrogative &&
      allPhatic &&
      parsed.meaning.nodes.length > 0 &&
      // A patient or theme edge means the question asks after
      // something done or known ("How do you do it?") — a manner
      // question, not the ritual exchange. A time-word target
      // is the adjunct case above and does not defeat it.
      !parsed.meaning.edges.some(
        (e) =>
          (e.relation === "patient" || e.relation === "theme") &&
          !TIME_WORDS.has(parsed.meaning.nodes.find((n) => n.id === e.to)?.lemma.toLowerCase() ?? ""),
      ) &&
      // "How" opening on anything but the copula is a degree
      // question ("How old are you?" — the graph is identical
      // to "How are you?" and only the token record separates
      // them): not the ritual exchange. (Guard added with C3,
      // which draws the age shape as a self-fact query.)
      (!parsed.meaning.nodes.some((n) => n.lemma.toLowerCase() === "how") ||
        tokenAfter("how") === "are" ||
        tokenAfter("how") === "is") &&
      (parsed.meaning.nodes.some((n) => n.lemma.toLowerCase() === "how") ||
        root?.lemma.toLowerCase() === "you"),
  );

  // The self-fact query (conversation-shapes C3, 2026-11-18):
  // a question whose subject is the system and whose matter is
  // a fact about it that the Self tables do not hold — the
  // interlocutor questions the probe run measured (occupation,
  // pets, rank, birthplace, degree, family). S3 drew identity
  // and capability narrowly and these fell to declines and
  // token clarifications; the drawn family here is closed in
  // the same spirit — each shape is a parse structure, and a
  // shape not drawn fails honestly as before. The matter is
  // recorded on the act (act.selfFact); the Planner's answer
  // is the plain denial the limits facts support — the system
  // has no occupation, pets or birthplace, and saying so IS
  // the answer, never a decline-by-gap.
  let selfFactMatter: string | undefined;
  let selfFactName = false;
  if (interrogative && !isSelfQuery && !isCapabilityQuery && !isWellbeingQuery) {
    const nodes = parsed.meaning.nodes;
    const edges = parsed.meaning.edges;
    const youNode = nodes.find((n) => n.lemma.toLowerCase() === "you");
    const agentToYou = Boolean(
      youNode && edges.some((e) => e.relation === "agent" && e.to === youNode.id),
    );
    const rootId = parsed.meaning.rootId;
    if (root?.role === "verb" && agentToYou) {
      if (root.lemma.toLowerCase() === "have") {
        // (a) Possession: "Do you have a cat?" — the theme or
        // patient the having ranges over is the matter.
        const m = edges
          .filter((e) => e.from === rootId && (e.relation === "theme" || e.relation === "patient"))
          .map((e) => nodes.find((n) => n.id === e.to))
          .find((n) => n && n.lemma.toLowerCase() !== "any" && n.lemma.toLowerCase() !== "what");
        if (m) selfFactMatter = m.form.toLowerCase();
        // S1 (the S programme, 2026-11-19): the wh-NP form —
        // "What pets do you have?" questions the having
        // itself, and the graph keeps only the question word
        // in the theme slot; the possessed noun rides in the
        // question word's own phrase and the graph drops it.
        // The token record holds it by position, as it holds
        // the degree of shape (e): the token after "what",
        // when it is a content word (not the frame's own
        // scaffolding — "What do you have?" leaves 'do' there
        // and is not captured). Run 2 met this shape with the
        // missing-role decline ("nothing you have told me
        // says what was had") — the matter was on the surface
        // the whole time.
        if (!selfFactMatter) {
          const questioned = edges
            .filter((e) => e.from === rootId && (e.relation === "theme" || e.relation === "patient"))
            .map((e) => nodes.find((n) => n.id === e.to))
            .find((n) => n && n.questionWord && n.lemma.toLowerCase() === "what");
          if (questioned) {
            const m2 = tokenAfter("what");
            if (m2 && m2 !== "any" && !enIsFunctionWord(m2)) selfFactMatter = m2;
          }
        }
      } else if (root.lemma.toLowerCase() === "do" && root.states?.tense !== "past") {
        // (c) Occupation: "What do you do (for a living)?" —
        // the questioned patient is "what" and the doing is
        // present-tense. The modal-less twin of the capability
        // shape, which S3's comment already names as asking
        // after an occupation; "What did you do?" (past, an
        // event) is not captured.
        const asksWhat = edges.some(
          (e) =>
            e.from === rootId &&
            e.relation === "patient" &&
            nodes.some((n) => n.id === e.to && n.questionWord && n.lemma.toLowerCase() === "what"),
        );
        // S1 (the S programme, 2026-11-19): the doing's sphere
        // discriminates the matter. A purpose adjunct naming
        // leisure — "for fun", carried in the token record
        // (the graph drops the adjunct whole) — asks what the
        // system does for enjoyment, not what its occupation
        // is; run 2 answered it with the occupation denial
        // ("I don't have a job."), which answers a question
        // the visitor did not ask. The leisure matter is the
        // limits vocabulary's own: hobbies, the matter the
        // have-shape already files for "Do you have any fun
        // hobbies?" — the denial is the same sentence either
        // way, and it is the honest one here.
        const forFun = tokens.some((t, i) => t === "for" && tokens[i + 1] === "fun");
        if (asksWhat && forFun) selfFactMatter = "hobbies";
        else if (asksWhat) selfFactMatter = "occupation";
      } else if (root.lemma.toLowerCase() === "live" && nodes.some((n) => n.questionWord && n.lemma.toLowerCase() === "where")) {
        selfFactMatter = "home";
      } else if (root.lemma.toLowerCase() === "get") {
        // (e) "What degree did you get?" — the matter rides
        // before the auxiliary and the graph drops it; the
        // token record holds it by position.
        const m = tokenAfter("what");
        if (m && new Set(["degree", "diploma", "job", "rank"]).has(m)) selfFactMatter = m;
      }
      // (b) The consumed-object possession: "Do you have any
      // pets?" — the sentence layer drew the possessed noun as
      // the verb itself (root "pet", form "pets", the do
      // auxiliary standing), leaving no patient or theme. The
      // signature is exact: an inflected root (form ≠ lemma)
      // with the do auxiliary, an agent "you", and no object
      // edge at all. A genuine verb root ("Do you eat meat?")
      // carries its object edge or stands in its base form.
      if (
        !selfFactMatter &&
        root.states?.aux === "do" &&
        !edges.some((e) => e.from === rootId && (e.relation === "patient" || e.relation === "theme" || e.relation === "recipient")) &&
        root.form.toLowerCase() !== root.lemma.toLowerCase()
      ) {
        selfFactMatter = root.form.toLowerCase();
      }
      // (g) Family origin (S1, the S programme, 2026-11-19):
      // "Do you come from a big family?" — the question ranges
      // over the system's belonging, and the graph draws the
      // matter plainly: a 'family' node standing as the
      // source (a location edge with the 'from' preposition)
      // of a verb the addressee agents. The size word rides as
      // the node's qualifier and is not the matter; the matter
      // is the family itself, and the limits answer is the
      // plain denial, as for the other biography facts. Run 2
      // met this shape with the question-shape decline.
      if (
        !selfFactMatter &&
        edges.some(
          (e) =>
            e.from === rootId &&
            e.relation === "location" &&
            nodes.some((n) => n.id === e.to && n.lemma.toLowerCase() === "family" && n.prep === "from"),
        )
      ) {
        selfFactMatter = "family";
      }
    }
    // (e) Birthplace: "Where were you born?" — the passive
    // bear's questioned slot is the place, and the born one is
    // constructionally the addressee: the parse draws no "you"
    // node at all (the agent slot is the questioned "where"),
    // so this shape keys on the verb and the question word.
    if (!selfFactMatter && root?.role === "verb" && root.lemma.toLowerCase() === "bear" && nodes.some((n) => n.questionWord && n.lemma.toLowerCase() === "where")) {
      selfFactMatter = "birthplace";
    }
    // (d) The your-NP question: "What is your rank?" — the
    // graph draws "your" predicated as "what" and drops the
    // possessed noun; the token record holds it by position.
    // "Name" is the Identity table's own fact and routes to
    // the identity flavour, not the denial.
    if (!selfFactMatter) {
      const yourNode = nodes.find((n) => n.lemma.toLowerCase() === "your");
      const whatNode = nodes.find((n) => n.questionWord && n.lemma.toLowerCase() === "what");
      if (
        yourNode &&
        whatNode &&
        edges.some((e) => e.from === yourNode.id && e.to === whatNode.id && e.relation === "predicated-as")
      ) {
        const m = tokenAfter("your");
        if (m === "name") selfFactName = true;
        else if (m) selfFactMatter = m;
      }
    }
    // (f) Age: "How old are you?" — "how" predicated of "you"
    // with "old" in the token record (see the wellbeing guard).
    if (!selfFactMatter && root?.lemma.toLowerCase() === "you" && tokenAfter("how") === "old") {
      selfFactMatter = "age";
    }
  }
  // (h) The elliptical return (S1, the S programme,
  // 2026-11-19): "What about yours?" / "What about you?" asks
  // the system's counterpart of a matter the conversation has
  // just put in play — the visitor states their own fact and
  // returns the question in its elliptical form, the matter
  // carried by the exchange, not by the sentence. The graph
  // draws the return as a lone topic node (no verb, no
  // interrogative mood), so this shape reads the surface —
  // the whole utterance must be the return and nothing else
  // ("What about the strike?" points at a topic, not the
  // addressee, and is never captured) — and, for the bare
  // forms, the visitor's immediately preceding surface: the
  // last person object's retained surface, the record of
  // what was actually said. A your-NP return names its
  // matter on its face, as shape (d) files any possessed
  // noun. A bare return resolves only to a matter of the
  // return vocabulary — the facts-of-a-person this family
  // trades in — and only when the preceding surface speaks
  // in the first person (the visitor stating THEIR fact: a
  // possessive phrase, a born statement, a have-possession);
  // a matter word inside a statement about something else is
  // a topic in play, not a counterpart being asked after.
  // Run 2 met the shape with a decline about the preceding
  // statement's subject ("I have nothing on rico in my
  // notes") — the matter was in the exchange the whole time.
  if (!selfFactMatter && !selfFactName && !parsed.meaning.nodes.some((n) => n.role === "verb")) {
    const ret = /^\s*(?:and\s+|so\s+)?what about (yours|you|your\s+([a-z][a-z\s]*?))\s*[?.!]?\s*$/i.exec(surface);
    if (ret) {
      if (ret[2]) {
        const np = ret[2].trim().replace(/\s+/g, " ");
        const hit = RETURN_MATTERS.find((r) => r.pattern.test(np));
        if (np === "name") selfFactName = true;
        else selfFactMatter = hit ? hit.matter : np;
      } else {
        const prior = [...session.objects].reverse().find((o) => o.producer === "person" && o.surface);
        const priorSurface = prior?.surface?.toLowerCase() ?? "";
        if (/\b(my|i|i'm|i've|me)\b/.test(priorSurface)) {
          const hit = RETURN_MATTERS.find((r) => r.pattern.test(priorSurface));
          if (hit?.matter === "name") selfFactName = true;
          else if (hit) selfFactMatter = hit.matter;
        }
      }
    }
  }
  const isSelfFactQuery = Boolean(selfFactMatter) || selfFactName;

  // The visitor's own clarification request (conversation-
  // shapes C5, 2026-11-18): "What do you mean?" / "What did
  // you mean?" — an interrogative whose verb root is "mean",
  // whose agent is the addressed "you", and whose questioned
  // patient is "what". It asks after the system's own last
  // saying, not after the world: routed by the ordinary
  // question path it declined ("nothing you have told me says
  // what was meant" — the record it asked after was the
  // system's, which the question path does not read). "What
  // does 'cold' mean?" is not this act: its subject is the
  // word, not "you", and it stays a sense question.
  const isMeanQuery = Boolean(
    interrogative &&
      root?.role === "verb" &&
      root.lemma.toLowerCase() === "mean" &&
      parsed.meaning.edges.some(
        (e) =>
          e.from === parsed.meaning.rootId &&
          e.relation === "agent" &&
          parsed.meaning.nodes.some((n) => n.id === e.to && n.lemma.toLowerCase() === "you"),
      ) &&
      parsed.meaning.edges.some(
        (e) =>
          e.from === parsed.meaning.rootId &&
          (e.relation === "patient" || e.relation === "theme") &&
          parsed.meaning.nodes.some((n) => n.id === e.to && n.questionWord && n.lemma.toLowerCase() === "what"),
      ),
  );

  // The offer of help (S2, the S programme, 2026-11-19):
  // "Can I help you?" is a social act in question dress —
  // the visitor offers the system a service. The graph draws
  // it plainly when the modal heads the clause (root 'help',
  // modal 'can'/'may', the visitor as agent, the system as
  // patient); the how-prefixed form ("How can I help you?")
  // draws its agent as 'how' and loses the shape, so the
  // token record carries that variant, read by position as
  // the C3 shapes read it. Run 2 routed all three of its
  // specimens to the question path's question-type decline.
  const isOfferHelp = Boolean(
    (interrogative &&
      root?.role === "verb" &&
      root.lemma.toLowerCase() === "help" &&
      (root.states?.aux === "can" || root.states?.modal === "can" || root.states?.aux === "may" || root.states?.modal === "may") &&
      parsed.meaning.edges.some(
        (e) =>
          e.from === parsed.meaning.rootId &&
          e.relation === "agent" &&
          parsed.meaning.nodes.some((n) => n.id === e.to && n.lemma.toLowerCase() === "i"),
      ) &&
      parsed.meaning.edges.some(
        (e) =>
          e.from === parsed.meaning.rootId &&
          e.relation === "patient" &&
          parsed.meaning.nodes.some((n) => n.id === e.to && n.lemma.toLowerCase() === "you"),
      )) ||
      (() => {
        const i = tokens.indexOf("how");
        return (
          i >= 0 &&
          (tokens[i + 1] === "can" || tokens[i + 1] === "may") &&
          tokens[i + 2] === "i" &&
          tokens[i + 3] === "help" &&
          tokens[i + 4] === "you"
        );
      })(),
  );

  // The either/or question (S2, the S programme, 2026-11-19):
  // a question whose answer space is presented as two named
  // alternatives, addressed to the system. Two drawn forms:
  // the preference form — a preference verb ('prefer',
  // 'like') the system agents, with an 'or' node in the
  // graph joining the alternatives ("Do you prefer milk or
  // dark?", P-056); and the being form — a copula predication
  // of 'you' whose predicate carries two qualifying nodes,
  // one of them the 'or' itself and the other the first
  // alternative ("Are you an aunt or uncle yet?", P-107).
  // The being form's neither-answer asserts the system is
  // neither alternative, which is false exactly when an
  // alternative names the system's own kind — so an
  // alternative from the kind vocabulary defeats the shape
  // and the turn keeps its ordinary path.
  const SYSTEM_KIND_WORDS = new Set(["system", "ai", "computer", "program", "machine", "bot", "assistant"]);
  const choicePreference = Boolean(
    interrogative &&
      root?.role === "verb" &&
      (root.lemma.toLowerCase() === "prefer" || root.lemma.toLowerCase() === "like") &&
      parsed.meaning.edges.some(
        (e) =>
          e.from === parsed.meaning.rootId &&
          e.relation === "agent" &&
          parsed.meaning.nodes.some((n) => n.id === e.to && n.lemma.toLowerCase() === "you"),
      ) &&
      parsed.meaning.nodes.some((n) => n.lemma.toLowerCase() === "or"),
  );
  let choiceAlternatives: [string, string] | undefined;
  if (
    interrogative &&
    root?.states?.copulaTense &&
    parsed.meaning.edges.some(
      (e) =>
        e.to === parsed.meaning.rootId &&
        e.relation === "predicated-as" &&
        parsed.meaning.nodes.some((n) => n.id === e.from && n.lemma.toLowerCase() === "you"),
    )
  ) {
    const quals = parsed.meaning.edges
      .filter((e) => e.to === parsed.meaning.rootId && e.relation === "qualifies")
      .map((e) => parsed.meaning.nodes.find((n) => n.id === e.from))
      .filter((n) => n !== undefined);
    const altNode = quals.find((n) => n.lemma.toLowerCase() !== "or");
    const hasOr = quals.some((n) => n.lemma.toLowerCase() === "or");
    const article = (w: string) => (/^[aeiou]/i.test(w) ? "an" : "a");
    if (
      altNode &&
      hasOr &&
      !SYSTEM_KIND_WORDS.has(altNode.lemma.toLowerCase()) &&
      !SYSTEM_KIND_WORDS.has(root.lemma.toLowerCase())
    ) {
      const first = `${altNode.det ?? article(altNode.form)} ${altNode.form.toLowerCase()}`;
      const second = `${root.det ?? article(root.form)} ${root.form.toLowerCase()}`;
      choiceAlternatives = [first, second];
    }
    // The or-headed variant of the same form: for some
    // alternative pairs the chunker heads the predicate with
    // the 'or' itself and drops the second alternative from
    // the graph ("Are you a cat or a dog?" — predicate 'or',
    // 'cat' its qualifier, 'dog' nowhere). The token record
    // holds the dropped alternative by position, as it holds
    // the C3 shapes' dropped matter: the token after "or",
    // with its own article when one precedes it.
    if (!choiceAlternatives && root.lemma.toLowerCase() === "or" && altNode) {
      const oi = tokens.indexOf("or");
      const afterOr = oi >= 0 ? tokens[oi + 1] : undefined;
      const secondIsDet = afterOr === "a" || afterOr === "an";
      const secondName = secondIsDet ? tokens[oi + 2] : afterOr;
      if (
        secondName &&
        !enIsFunctionWord(secondName) &&
        !SYSTEM_KIND_WORDS.has(altNode.lemma.toLowerCase()) &&
        !SYSTEM_KIND_WORDS.has(secondName)
      ) {
        const first = `${altNode.det ?? root.det ?? article(altNode.form)} ${altNode.form.toLowerCase()}`;
        const second = `${secondIsDet ? afterOr : article(secondName)} ${secondName}`;
        choiceAlternatives = [first, second];
      }
    }
  }
  const choiceQuery: "preference" | "being" | undefined = choicePreference
    ? "preference"
    : choiceAlternatives
      ? "being"
      : undefined;

  // The parser's discourse act stands unless the assessment's
  // own self-fact recognition (shape (h), the elliptical
  // return) has read the utterance: the return's graph is a
  // lone topic node, which the parser names a topic proposal,
  // but the assessment has resolved its matter from the
  // exchange, and that reading is the act it is.
  const kind: SemanticObject["act"]["kind"] =
    parsed.discourseAct && !(isSelfFactQuery && parsed.discourseAct === "topic-proposal")
      ? parsed.discourseAct
      : isGreeting || isDaypartGreeting || isWellbeingQuery
      ? "greeting"
      : isLeaveTaking || isSeeYou
        ? "leave-taking"
        : isThanks
          ? "thanks"
          : isSelfQuery || isCapabilityQuery || isSelfFactQuery
            ? "self-query"
            : parsed.query || interrogative
              ? "question"
              : "statement";

  const trimmed = surface.trim();
  const form =
    kind === "greeting" || kind === "leave-taking" || kind === "thanks"
      ? trimmed.endsWith("?")
        ? "interrogative"
        : trimmed.endsWith("!")
          ? "exclamatory"
          : "declarative"
      : kind === "question" || kind === "reason-query" || kind === "self-query"
        ? "interrogative"
        : (root?.states?.mood ?? "indicative");

  const holes: ObjectHole[] = parsed.query
    ? [{ kind: "questioned-slot", relation: parsed.query.relation, expectedType: parsed.query.expectedType }]
    : interrogative
      ? [{ kind: "questioned-predication", relation: "predication", expectedType: "polarity" }]
      : [];

  const known = new Set<string>();
  for (const e of session.entities) known.add(e.lemma);
  for (const t of session.topics) known.add(t.lemma);
  const grounding: GroundingMark[] = parsed.meaning.nodes
    .filter((n) => n.syntacticElement === "Earth")
    .map((n) => ({
      nodeId: n.id,
      lemma: n.lemma,
      status: known.has(n.lemma) ? ("established" as const) : ("new" as const),
    }));

  // The previous PERSON object: reply objects (slice 4) are
  // stored in the same stream, and the stream role of an
  // utterance is read against utterances, not replies.
  const prev = [...session.objects].reverse().find((o) => o.producer === "person");
  const streamRole: SemanticObject["act"]["streamRole"] =
    turn === 1
      ? "opens"
      : prev && (prev.act.kind === "question" || prev.act.kind === "reason-query")
        ? "answers"
        : "continues";

  // Declared v1 confidence policy: a kind the parse structurally
  // determined (a named discourse act, a recorded query) is a
  // certain reading of the act's form; the default statement
  // reading carries the residual doubt that the act may yet prove
  // social — the doubt slice 2's readers start spending.
  const confidence = parsed.discourseAct || parsed.query || interrogative || isGreeting || isDaypartGreeting || isLeaveTaking || isSeeYou || isThanks || isSelfQuery || isSelfFactQuery ? 1 : 0.85;

  const aspects = classifyAspects(parsed);
  const composition = rollUpComposition(aspects);
  // The senses face, produced by the Senses-Scening Unit at
  // creation (2026-11-17): computed against the session's
  // running scene as it stands BEFORE this object is recorded;
  // the turn loop applies the scene update afterwards.
  const senses = buildSensesFace(parsed, session, "describe");
  // The quantity mentions, read by the QuantificationLanguageUnit
  // at creation (2026-11-17): stated and implied quantities in
  // the utterance, with the OKU Numbers reading attached where
  // filed. The turn loop applies them to the Session's ledger
  // after the object is recorded, as it does the scene update.
  const quantities = computeQuantityMentions(parsed);

  const obj: SemanticObject = {
    id: `obj-${turn}-${session.objects.length + 1}`,
    turn,
    producer: "person",
    surface,
    ...(parsed.tokenResolutions ? { tokenResolutions: parsed.tokenResolutions } : {}),
    act: {
      kind,
      form,
      force: kind,
      ritual: kind === "greeting" || kind === "leave-taking" || kind === "thanks",
      streamRole,
      ...(kind === "self-query"
        ? {
            selfQuery: (isCapabilityQuery
              ? "capability"
              : selfFactMatter
                ? "fact"
                : "identity") as "identity" | "capability" | "fact",
            ...(selfFactMatter ? { selfFact: selfFactMatter } : {}),
          }
        : {}),
      ...(isWellbeingQuery ? { wellbeing: true } : {}),
      ...(isMeanQuery ? { meanQuery: true } : {}),
      ...(isOfferHelp ? { offerHelp: true } : {}),
      ...(choiceQuery ? { choiceQuery, ...(choiceAlternatives ? { choiceAlternatives } : {}) } : {}),
    },
    content: { meaning: parsed.meaning, connective: parsed.connective, holes, grounding },
    aspects,
    senses,
    ...(quantities.length ? { quantities } : {}),
    ...(composition ? { composition } : {}),
    confidence,
    links: { ...(prev ? { follows: prev.id } : {}) },
    trail: [{ unit: "lpu/semantic-assessment", note: `assessed as ${kind}` }],
  };
  /* The affect-prior consultation (the Glasgow scope
   * extension, 2026-11-17): where the LEDU derived an emotion
   * reading for a word, the bridge's affect prior — the
   * NormalcyUnit's labelled Glasgow valence/arousal/dominance
   * facts for that word — is consulted and the consultation
   * filed on the trail. Knowledge alongside the derivation,
   * never a second derivation: the reading stands exactly as
   * the EDU derived it, and a word with a prior but no EDU
   * derivation gets no reading and no annotation. */
  for (const r of aspects) {
    if (r.aspect !== "emotion") continue;
    const prior = emotionPriorFor(r.value);
    if (!prior) continue;
    const parts = [
      prior.valence ? `valence ${prior.valence.mean}/9` : undefined,
      prior.arousal ? `arousal ${prior.arousal.mean}/9` : undefined,
      prior.dominance ? `dominance ${prior.dominance.mean}/9` : undefined,
    ].filter(Boolean);
    obj.trail.push({
      unit: "lpu/language-emotion-desire-unit",
      note:
        `affect prior consulted for '${r.value}': ${parts.join(", ")} ` +
        "(the Glasgow Norms, labelled knowledge — the EDU's derivation stands as derived; the prior directed nothing)",
      data: {
        affectPrior: {
          word: r.value,
          ...(prior.valence ? { valence: prior.valence.mean } : {}),
          ...(prior.arousal ? { arousal: prior.arousal.mean } : {}),
          ...(prior.dominance ? { dominance: prior.dominance.mean } : {}),
        },
      },
    });
  }
  return [obj];
}

/**
 * The assessment as the system now travels it (the envelope
 * build, 2026-11-17): each assessed core is wrapped in its
 * ENVELOPE (info-object.ts) at creation — SemanticAssessment
 * creates the information object — and Session & Situation's
 * reading is taken against the session as it stands (before
 * the turn loop records the object), discharging a phatic
 * turn's situate needs from actual session state. The core
 * inside is exactly the object assessUtterance builds; the
 * envelope is attached, never written into it.
 */
export function assessInformation(parsed: ParsedSentence, ctx: AssessContext): InformationObject[] {
  return assessUtterance(parsed, ctx).map((core) => {
    const info = createInformationObject(core);
    consultSituation(info, ctx.session);
    return info;
  });
}
