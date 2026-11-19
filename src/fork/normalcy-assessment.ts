/**
 * normalcy-assessment.ts — NormalcyAssessment (lpu/
 * normalcy-assessment): language's bridge to the NormalcyUnit
 * (normalcy-unit.ts), in the Senses-Scening shape — the
 * framework is the authority's, the mapping from text is this
 * bridge's.
 *
 * The bridge reads a freshly assessed information object —
 * its parse, its surface, and the Session as it stood before
 * this turn — and files NORMALCY FLAGS on the object's
 * ENVELOPE (info-object.ts): readings about the communication,
 * never about the content, so they ride the envelope side of
 * the wall. The bridge runs in the turn loop after Session &
 * Situation's reading (the situation consult inside
 * assessInformation) and before CoherenceAnalysis, which
 * prices the flags by kind (coherence.ts).
 *
 * The three dimensions in v1 (the authority files the
 * standards; the bridge works the evidence):
 *  - OBVIOUSNESS — a polar question whose predication the
 *    Classification already settles (the authority's
 *    classifyingQuality determination, run on this question's
 *    subject and quality).
 *  - SELF-REDUNDANCY — a question the Session record already
 *    settles: a standing state IS the asked predication and
 *    the speaker stated it, or the same question stands
 *    answered earlier in the stream.
 *  - GIBBERISH — no content arrived: every content token of
 *    the utterance failed to resolve directly, at least one
 *    failed outright, and none is attested as a real word by
 *    the filed knowledge. Token-resolution FAILURE raises the
 *    flag; wordfreq/Glasgow facts only grade its strength
 *    (the discipline pins, test/fork-normalcy.test.ts): a rare
 *    or unfamiliar REAL word — attested and resolvable, or
 *    merely attested though this parser's lexicon lacks it —
 *    never raises gibberish by itself, and no table value
 *    prices or fires anything.
 *
 * NOT a dimension here: unanchored definites ("What table?")
 * — that is a comprehension gap, a Part-3 reply matter in the
 * turn loop, not an oddity of the communication.
 */
import type { ParsedSentence } from "./sentence";
import type { SemanticObject } from "./semantic-object";
import type { Session } from "./session";
import { lookupClassification } from "./classify";
import type { InformationObject } from "./info-object";
import { noteHandled } from "./info-object";
import {
  classifyingQuality,
  familiarityOf,
  obviousnessKnowledge,
  wordAttested,
  wordFrequencyOf,
  type NormalcyFlag,
} from "./normalcy-unit";

const UNIT = "lpu/normalcy-assessment";

/** The closed function-word set: tokens that carry grammar,
 *  not content. A token outside this set is a content token
 *  for the gibberish reading. Exported for the rendering
 *  admission in turn.ts (X1, the X programme, 2026-11-19):
 *  a closed function word is never a referring fill, whatever
 *  register recorded it — the same distinction, read by the
 *  renderings that speak recorded fills aloud. */
export const FUNCTION_WORDS = new Set([
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "its", "our", "their", "mine", "yours",
  "the", "a", "an", "this", "that", "these", "those",
  "is", "am", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "have", "has", "had", "having",
  "will", "would", "can", "could", "shall", "should", "may", "might", "must",
  "to", "of", "in", "on", "at", "by", "for", "with", "from", "as", "into", "about", "over", "after", "before",
  "and", "or", "but", "so", "if", "then", "than",
  "not", "no", "yes", "what", "who", "whom", "where", "when", "why", "how", "which",
  "there", "here", "just", "very", "too", "also",
]);

function normaliseToken(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z']/g, "");
}

/** The question's subject and quality lemmas, when the parse
 *  draws a predication question (the same edges the turn
 *  loop's question site reads). */
function predicationOf(parsed: ParsedSentence): { subject: string; quality: string } | undefined {
  const root = parsed.meaning.nodes.find((n) => n.id === parsed.meaning.rootId);
  if (!root || root.states?.mood !== "interrogative") return undefined;
  const predEdge = parsed.meaning.edges.find(
    (e) => (e.relation === "predicate" || e.relation === "predicated-as") && e.to === root.id,
  );
  if (!predEdge) return undefined;
  const subject = parsed.meaning.nodes.find((n) => n.id === predEdge.from);
  if (!subject) return undefined;
  return { subject: subject.lemma, quality: root.lemma };
}

/* ------------------------------------------------------------------ */
/* Gibberish                                                           */
/* ------------------------------------------------------------------ */

interface TokenReading {
  token: string;
  status: "direct" | "guessed" | "real-unparsed" | "failed";
  replacement?: string[];
}

function gibberishFlag(parsed: ParsedSentence, info: InformationObject): NormalcyFlag | undefined {
  const surface = info.surface ?? "";
  const tokens = [...new Set((surface.toLowerCase().match(/[a-z']+/g) ?? []).map(normaliseToken))].filter(
    (t) => t.length > 0 && !FUNCTION_WORDS.has(t),
  );
  if (!tokens.length) return undefined;
  const resolutions = new Map<string, NonNullable<ParsedSentence["tokenResolutions"]>[number]>();
  for (const r of parsed.tokenResolutions ?? []) resolutions.set(normaliseToken(r.surface), r);

  const readings: TokenReading[] = [];
  for (const token of tokens) {
    const r = resolutions.get(token);
    if (!r) {
      readings.push({ token, status: "direct" });
    } else if (r.outcome === "unresolved") {
      // The parser could not resolve it. Is it nevertheless a
      // REAL word — attested by the filed knowledge, merely
      // missing from this parser's lexicon? Then it is a gap
      // in the lexicon, not content that failed to arrive.
      readings.push({ token, status: wordAttested(token).attested ? "real-unparsed" : "failed" });
    } else {
      readings.push({ token, status: "guessed", replacement: r.replacement });
    }
  }
  const failed = readings.filter((r) => r.status === "failed");
  const direct = readings.filter((r) => r.status === "direct");
  const realUnparsed = readings.filter((r) => r.status === "real-unparsed");
  const guessed = readings.filter((r) => r.status === "guessed");
  if (!failed.length || direct.length || realUnparsed.length) return undefined;

  // Grading — evidence only. A guess that landed on a word of
  // ordinary currency suggests misspelt real speech (weaker);
  // outright failure everywhere, with guesses landing nowhere
  // ordinary, is the strong shape. The labels are this
  // bridge's qualitative reading of the facts; no number here
  // fires or prices anything.
  const knowledge: NormalcyFlag["knowledge"] = [];
  for (const r of failed) {
    knowledge.push({
      source: "token resolution (the sentence layer)",
      fact: `'${r.token}' could not be resolved to any word the system knows`,
    });
    knowledge.push({
      source: "wordfreq + the Glasgow Norms",
      fact: `'${r.token}' is attested in neither table — not a rare real word, an unattested one`,
    });
  }
  let landedOrdinary = false;
  for (const r of guessed) {
    const landed = (r.replacement ?? []).map(normaliseToken).find((w) => w.length > 0);
    if (!landed) continue;
    const freq = wordFrequencyOf(landed);
    if (freq) {
      knowledge.push({
        source: freq.source,
        fact: `the correction '${r.token}' → '${landed}' lands on a word of ${freq.zipf >= 4 ? "ordinary" : "rare"} currency (Zipf ${freq.zipf})`,
      });
      if (freq.zipf >= 4) landedOrdinary = true;
    }
    const fam = familiarityOf(landed);
    if (fam) {
      knowledge.push({
        source: fam.source,
        fact: `'${landed}' is rated for familiarity at ${fam.mean}/7 (${fam.scale})`,
      });
    }
  }
  const strength: NormalcyFlag["strength"] =
    !landedOrdinary && failed.length * 2 >= readings.length ? "strong" : "moderate";
  return {
    kind: "gibberish",
    detail:
      `no content arrived: of ${readings.length} content token(s), ${failed.length} failed resolution outright` +
      (guessed.length ? ` and ${guessed.length} arrived only as a spelling guess` : "") +
      ", and none is attested as a real word",
    strength,
    knowledge,
    data: { failed: failed.map((r) => r.token), guessed: guessed.map((r) => r.token) },
  };
}

/* ------------------------------------------------------------------ */
/* The bridge                                                          */
/* ------------------------------------------------------------------ */

/**
 * Read one assessed information object for normalcy and file
 * its flags on the envelope. Runs against the session as it
 * stood BEFORE this turn's object is recorded (the turn loop
 * calls it where the other pre-recording readers run).
 */
export function assessNormalcy(
  parsed: ParsedSentence,
  info: InformationObject,
  session: Session,
): NormalcyFlag[] {
  const flags: NormalcyFlag[] = [];
  const pred = predicationOf(parsed);
  const root = parsed.meaning.nodes.find((n) => n.id === parsed.meaning.rootId);

  if (pred && info.act.kind === "question") {
    // OBVIOUSNESS — the Classification settles the asked
    // predication (the authority's standard). A why-question
    // asks for the derivation, not the predication — the
    // standing exclusion, as at the record site.
    if (root?.states?.questionKind !== "why") {
      const cq = classifyingQuality(session.graph, pred.subject, pred.quality);
      if (cq) {
        flags.push({
          kind: "obviousness",
          detail:
            `the question asks whether ${cq.subject} is ${cq.quality} — ${cq.subject}'s classifying ` +
            `quality for ${cq.aspect}, settled by the classification itself`,
          knowledge: obviousnessKnowledge(session.graph, cq),
          data: { subject: cq.subject, quality: cq.quality, aspect: cq.aspect },
        });
      }
    }

    // SELF-REDUNDANCY — the record already settles it. The
    // settlement is the record's CURRENT one for the asked
    // slot: the latest standing state of this holder occupying
    // the asked quality's aspect slot (the R7.5 occupant
    // determination, mirrored — the asked quality's
    // classification aspect, or the quality itself where it is
    // unclassified). Only when that occupant IS the asked
    // predication does the speaker's own statement settle the
    // question; an older matching state under a later,
    // different occupant settles nothing — the record's answer
    // there is the occupant, and the record site gives it.
    const askedNegated = Boolean(root?.states?.negated);
    const askedAspect = lookupClassification(pred.quality)?.aspect;
    const occupiesSlot = (s: Session["states"][number]): boolean =>
      s.holder === pred.subject &&
      (askedAspect !== undefined ? lookupClassification(s.lemma)?.aspect === askedAspect : s.lemma === pred.quality);
    const occupant = [...session.states].reverse().find(occupiesSlot);
    let standing =
      occupant && occupant.lemma === pred.quality && !!occupant.negated === askedNegated ? occupant : undefined;
    /* The occupant must be the SPEAKER'S STATEMENT of the
     * predication. A state can also stand in the record from
     * a QUESTION turn — the question's own predication is
     * recorded (F3) — and a question does not state anything:
     * if the occupant's origin turn is a question, the
     * settlement, if any, is the answered-earlier kind, which
     * the search below files. (Asking "Is the salt cold?"
     * twice: the first turn's recorded predication is the
     * question's, not a statement — the flag must not say the
     * speaker stated it.) */
    if (standing) {
      const origin = [...session.objects]
        .reverse()
        .find((o) => o.producer === "person" && o.turn === standing!.turn);
      if (origin && origin.act.kind === "question") standing = undefined;
    }
    if (standing) {
      flags.push({
        kind: "self-redundancy",
        detail:
          `the record already settles the question: '${standing.holder} is ${standing.negated ? "not " : ""}${standing.lemma}' ` +
          `stands in the record from turn ${standing.turn} — the speaker stated it themselves`,
        knowledge: [
          {
            source: "the Session record",
            fact: `the standing state ${standing.holder}/${standing.lemma} was recorded at turn ${standing.turn} from the speaker's own statement`,
          },
        ],
        data: { subject: pred.subject, quality: pred.quality, settledBy: "statement", stateTurn: standing.turn },
      });
    } else {
      // …or the same question stands answered earlier in the
      // stream (a prior question object whose answer need the
      // route discharged).
      const answered = [...session.objects].reverse().find((o) => {
        if (o.producer !== "person" || o.turn >= info.turn || o.act.kind !== "question") return false;
        const m = o.content.meaning;
        const oRoot = m.nodes.find((n) => n.id === m.rootId);
        const oEdge = m.edges.find(
          (e) => (e.relation === "predicate" || e.relation === "predicated-as") && e.to === m.rootId,
        );
        const oSubject = oEdge ? m.nodes.find((n) => n.id === oEdge.from) : undefined;
        if (!oRoot || !oSubject || oSubject.lemma !== pred.subject || oRoot.lemma !== pred.quality) return false;
        const env = (o as InformationObject).envelope;
        return Boolean(env?.needs.some((n) => n.kind === "answer" && n.status === "discharged"));
      });
      if (answered) {
        flags.push({
          kind: "self-redundancy",
          detail:
            `the record already settles the question: the same question was asked at turn ${answered.turn} ` +
            "and answered — it stands answered in the stream",
          knowledge: [
            {
              source: "the Session record",
              fact: `the question object at turn ${answered.turn} carries its answer need discharged`,
            },
          ],
          data: { subject: pred.subject, quality: pred.quality, settledBy: "answer", questionTurn: answered.turn },
        });
      }
    }
  }

  const gib = gibberishFlag(parsed, info);
  if (gib) flags.push(gib);

  if (flags.length) {
    info.envelope.normalcy = flags;
    noteHandled(info, UNIT);
    for (const flag of flags) {
      info.trail.push({
        unit: UNIT,
        note: `normalcy: ${flag.kind} — ${flag.detail}`,
        data: {
          normalcyFlag: flag.kind,
          ...(flag.strength ? { strength: flag.strength } : {}),
          knowledge: flag.knowledge.map((k) => `${k.source}: ${k.fact}`),
        },
      });
    }
  }
  return flags;
}

/** The object's priced-or-unpriced flag of one kind, when the
 *  bridge filed one — the reply moves' read point. */
export function normalcyFlagOf(object: SemanticObject, kind: NormalcyFlag["kind"]): NormalcyFlag | undefined {
  const info = object as InformationObject;
  return info.envelope?.normalcy?.find((f) => f.kind === kind);
}
