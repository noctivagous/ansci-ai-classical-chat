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
const GREETING_FORMS = new Set(["hello", "hi", "hey"]);

export function assessUtterance(parsed: ParsedSentence, ctx: AssessContext): SemanticObject[] {
  const { session, turn, surface } = ctx;
  const root = parsed.meaning.nodes.find((n) => n.id === parsed.meaning.rootId);

  // A greeting is a bare topic with no predication, drawn from a
  // small closed set of greeting forms — the assessment's
  // vocabulary knowledge, as the lexicon's tables are the
  // parser's. It carries no content at all; everything in its
  // handling comes from situation, coherence and disposition.
  const isGreeting = Boolean(
    root && root.role === "topic" && parsed.meaning.edges.length === 0 && GREETING_FORMS.has(root.lemma.toLowerCase()),
  );

  // A question is drawn two ways by the parse: a wh-question
  // records its questioned slot (query); a polar question carries
  // interrogative mood on the root and no query — what it opens
  // is the predication itself.
  const interrogative = root?.states?.mood === "interrogative";
  const kind: SemanticObject["act"]["kind"] = parsed.discourseAct
    ? parsed.discourseAct
    : isGreeting
      ? "greeting"
      : parsed.query || interrogative
        ? "question"
        : "statement";

  const trimmed = surface.trim();
  const form =
    kind === "greeting"
      ? trimmed.endsWith("?")
        ? "interrogative"
        : trimmed.endsWith("!")
          ? "exclamatory"
          : "declarative"
      : kind === "question" || kind === "reason-query"
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
  const confidence = parsed.discourseAct || parsed.query || interrogative || isGreeting ? 1 : 0.85;

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
    act: { kind, form, force: kind, ritual: kind === "greeting", streamRole },
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
