/**
 * contents.ts — the contents breakdown submodule of piece B
 * (design §2, factored out as the opening step of E3 per §8).
 *
 * It breaks the turn's communication into its PEOPLE, PLACES,
 * THINGS and TIMES — the categorised contents the other pieces
 * consume (awareness and memory read the people, solve reads the
 * things and places, the within-node fact choice reads them all).
 * It sits inside B: discourse finds the mentions and chooses their
 * referents; this submodule categorises the chosen referents.
 *
 * Two amendments govern it (§2). The category set is OPEN: people,
 * places and things ship first, times are recognised from the
 * start, events join at E5 — new kinds extend the record below
 * without restructuring it. And categorisation is DEFEASIBLE:
 * every entry carries its candidate kinds WITH scores and the
 * signals that produced them, dual membership is allowed where it
 * is real ("winter" can be a time and a thing), and the choice is
 * written to the trace, so a wrong kind is as visible as a wrong
 * referent.
 *
 * Signals are graph-derived where possible: IsA ancestry (one and
 * two hops) into per-kind anchor sets, AtLocation participation
 * for places. Times lean on surface patterns (day and month
 * names, seasons, durations, "third day"-type expressions) plus
 * IsA ancestry, because CSKG's time vocabulary is thin. A thing
 * is the residual kind: every referent scores it, so nothing with
 * a referent is ever kindless.
 *
 * Behaviour-neutral by construction (E3 step 0): the submodule
 * only READS the finished breakdown and appends its record to it;
 * no score, choice or answer elsewhere consumes it yet.
 */
import type { Mention } from "./discourse";
import type { CskgGraph } from "./loader";

/** The open kind set (§2 amendment 1): extend, never restructure. */
export type ContentKind = "person" | "place" | "thing" | "time";

export interface KindScore {
  kind: ContentKind;
  score: number;
  /** the signals that produced this score, for the trace */
  signals: string[];
}

export interface ContentEntry {
  /** index into Breakdown.mentions */
  mention: number;
  /** the mention's surface text */
  text: string;
  /** the referent discourse chose for the mention */
  referentId: number;
  referentText: string;
  /** every kind scored, best first — the defeasible record */
  kinds: KindScore[];
  /** kinds this entry is a member of (score ≥ 2), primary first */
  chosen: ContentKind[];
  /** the mention is the speaker ("i", "me", "we", "us") */
  speaker: boolean;
  /** possessive found directly before the mention ("my brother") */
  possessive: string | null;
  /** places: the situated self is here (elsewhere otherwise) */
  here: boolean | null;
  /**
   * The referent's recorded usage/register contexts — its
   * /r/HasContext tags from the loader's side store (depth
   * pass). Evidence only (design §9 G1/G7 seam): recorded in
   * the trace for E4's resolver and EverydaySense to build on;
   * nothing scores or chooses with them yet.
   */
  contexts: string[];
}

export interface ContentsBreakdown {
  entries: ContentEntry[];
  people: ContentEntry[];
  places: ContentEntry[];
  things: ContentEntry[];
  times: ContentEntry[];
}

/* ---------------- kind anchors (graph-derived signals) ---------- */

const PERSON_ANCHORS = new Set([
  "person", "people", "human", "man", "woman", "male", "female",
  "boy", "girl", "child", "friend", "sibling", "brother", "sister",
  "mother", "father", "parent", "family", "husband", "wife",
  "boyfriend", "girlfriend", "lady", "guy", "actor", "artist",
  "author", "teacher", "student", "doctor", "player", "someone",
]);

const PLACE_ANCHORS = new Set([
  "place", "location", "city", "country", "region", "area",
  "building", "room", "store", "shop", "restaurant", "park",
  "island", "state", "town", "village", "mountain", "river",
  "lake", "ocean", "sea", "continent", "territory", "district",
]);

const THING_ANCHORS = new Set([
  "thing", "object", "food", "dish", "tool", "device", "vehicle",
  "animal", "plant", "clothing", "garment", "instrument",
  "substance", "material", "product", "machine",
]);

const TIME_ANCHORS = new Set([
  "time", "day", "season", "period", "era", "date", "week",
  "month", "year", "century", "decade", "moment", "duration",
  "age",
]);

const ANCHORS: Record<ContentKind, Set<string>> = {
  person: PERSON_ANCHORS,
  place: PLACE_ANCHORS,
  thing: THING_ANCHORS,
  time: TIME_ANCHORS,
};

/** IsA ancestry of a node: its IsA targets, and theirs. */
function isaAncestry(g: CskgGraph, id: number): { hop1: string[]; hop2: string[] } {
  const hop1 = g.outEdges(id, "/r/IsA").map((e) => g.terms[e.to]);
  const hop2: string[] = [];
  for (const e of g.outEdges(id, "/r/IsA")) {
    for (const e2 of g.outEdges(e.to, "/r/IsA")) hop2.push(g.terms[e2.to]);
  }
  return { hop1, hop2 };
}

/* ---------------- surface signals ------------------------------- */

const DAY_NAMES = new Set([
  "monday", "tuesday", "wednesday", "thursday", "friday",
  "saturday", "sunday",
]);

const MONTH_NAMES = new Set([
  "january", "february", "march", "april", "may", "june", "july",
  "august", "september", "october", "november", "december",
]);

const SEASON_WORDS = new Set(["spring", "summer", "autumn", "fall", "winter"]);

const DAYPART_WORDS = new Set([
  "yesterday", "today", "tomorrow", "tonight", "morning",
  "afternoon", "evening", "night", "midnight", "noon",
]);

const SPEAKER_WORDS = new Set(["i", "me", "we", "us"]);
const PERSON_PRONOUNS = new Set([
  ...SPEAKER_WORDS, "you", "he", "she", "they", "him", "her", "them",
]);
const POSSESSIVES = new Set([
  "my", "your", "his", "her", "their", "our", "its",
]);

/** Function words: a mention made only of these carries no content. */
const FUNCTION_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "do", "does",
  "did", "what", "why", "how", "when", "where", "who", "which",
  "can", "could", "will", "would", "of", "to", "in", "on", "at",
  "for", "with", "and", "or", "if", "so", "that", "this", "there",
  "be", "been", "am", "have", "has", "had", "it", "its",
  "my", "your", "his", "her", "their", "our",
]);

/** Surface time score for a mention text (0 when no pattern hits). */
function timeSurface(text: string): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;
  const words = text.split(" ");
  if (words.some((w) => DAY_NAMES.has(w))) {
    score += 5;
    signals.push("surface: day name");
  }
  if (words.some((w) => MONTH_NAMES.has(w))) {
    score += 5;
    signals.push("surface: month name");
  }
  if (words.some((w) => SEASON_WORDS.has(w))) {
    score += 4;
    signals.push("surface: season word (time and, where the graph agrees, thing)");
  }
  if (words.some((w) => DAYPART_WORDS.has(w))) {
    score += 4;
    signals.push("surface: day-part / relative day");
  }
  if (/\b\d+\s*(day|days|week|weeks|month|months|year|years|hour|hours|minute|minutes)\b/.test(text)) {
    score += 4;
    signals.push("surface: measured duration");
  }
  if (words[words.length - 1] === "day" || words[0] === "day") {
    score += 3;
    signals.push('surface: "day" expression');
  }
  return { score, signals };
}

/* ---------------- the analysis ---------------------------------- */

/**
 * Categorise the breakdown's chosen referents. Pure: reads the
 * graph and the mentions, returns the record; discourse stores it
 * on the breakdown and notes it in the trace.
 */
export function analyseContents(
  g: CskgGraph,
  mentions: Mention[],
  words: string[],
  placeName: string | null,
): ContentsBreakdown {
  const entries: ContentEntry[] = [];

  mentions.forEach((m, mi) => {
    if (m.chosen < 0) return;
    const cand = m.candidates[m.chosen];
    const allFunction = m.text
      .split(" ")
      .every((w) => FUNCTION_WORDS.has(w) || PERSON_PRONOUNS.has(w));
    if (allFunction && !PERSON_PRONOUNS.has(m.text)) return;

    const scores = new Map<ContentKind, KindScore>();
    const bump = (kind: ContentKind, by: number, signal: string): void => {
      const ks = scores.get(kind) ?? { kind, score: 0, signals: [] };
      ks.score += by;
      ks.signals.push(signal);
      scores.set(kind, ks);
    };

    // thing is the residual kind: every referent is at least a thing
    bump("thing", 1, "residual: a graph referent");

    // graph-derived signals: IsA ancestry into the anchor sets
    const anc = isaAncestry(g, cand.id);
    for (const kind of Object.keys(ANCHORS) as ContentKind[]) {
      const anchors = ANCHORS[kind];
      const h1 = anc.hop1.find((t) => anchors.has(t));
      if (h1) bump(kind, 4, `graph: IsA→ ${h1}`);
      else {
        const h2 = anc.hop2.find((t) => anchors.has(t));
        if (h2) bump(kind, 2, `graph: IsA→ …→ ${h2}`);
      }
    }

    // places also show themselves by hosting things
    const hosted = g.inEdgesFor(cand.id, "/r/AtLocation").length;
    if (hosted >= 3) bump("place", 2, `graph: target of ${hosted} AtLocation edges`);

    // the situated place, named in the turn, is HERE
    const namedHere = !!placeName && m.text === placeName.toLowerCase();
    if (namedHere) bump("place", 6, "surface: the situated place itself");

    // person surface signals: pronouns, and the speaker's own words
    const speaker = SPEAKER_WORDS.has(m.text);
    if (PERSON_PRONOUNS.has(m.text)) {
      bump("person", 6, speaker ? "surface: the speaker" : "surface: a person pronoun");
    }
    const possessive =
      m.start > 0 && POSSESSIVES.has(words[m.start - 1]) ? words[m.start - 1] : null;
    if (possessive) {
      bump("person", 1, `surface: possessed ("${possessive} …") — a person in relation`);
    }

    // time surface signals
    const ts = timeSurface(m.text);
    if (ts.score > 0) bump("time", ts.score, ts.signals.join("; "));

    const kinds = [...scores.values()].sort((a, b) => b.score - a.score);
    let chosen = kinds.filter((k) => k.score >= 2).map((k) => k.kind);
    if (!chosen.length && kinds.length) chosen = [kinds[0].kind];
    // here/elsewhere is a judgement about place entries only
    const here: boolean | null = chosen.includes("place") ? namedHere : null;

    entries.push({
      mention: mi,
      text: m.text,
      referentId: cand.id,
      referentText: cand.text,
      kinds,
      chosen,
      speaker,
      possessive,
      here,
      contexts: g.contextsOf(cand.id).slice(0, 8),
    });
  });

  const of = (kind: ContentKind): ContentEntry[] =>
    entries.filter((e) => e.chosen.includes(kind));
  return {
    entries,
    people: of("person"),
    places: of("place"),
    things: of("thing"),
    times: of("time"),
  };
}

/**
 * Is this text PURELY a time expression — every word a day, month,
 * season or day-part word (or a function word)? "on saturday" and
 * "winter" are; "winter coat" is not (the coat is a thing that a
 * season word modifies). Solve's context filter uses it: a pure
 * time expression cannot arbitrate what a thing is.
 */
const PURE_TIME_WORDS = new Set([
  ...DAY_NAMES, ...MONTH_NAMES, ...SEASON_WORDS, ...DAYPART_WORDS,
  "on", "the", "of", "a", "an", "day", "days",
]);

export function pureTimeLabel(text: string): boolean {
  const words = text.split(" ").filter(Boolean);
  return words.length > 0 && words.every((w) => PURE_TIME_WORDS.has(w));
}

/** One trace line for an entry: the kind choice, with its reasons. */
export function contentsTraceLine(e: ContentEntry): string {
  const scored = e.kinds
    .filter((k) => k.score > 0)
    .map((k) => `${k.kind} ${k.score} [${k.signals.join("; ")}]`)
    .join(" · ");
  return (
    `contents: "${e.text}" → ${e.chosen.join("+") || "(none)"} (${scored})` +
    (e.speaker ? " · the speaker" : "") +
    (e.here === true ? " · here" : e.here === false ? " · elsewhere" : "") +
    (e.contexts.length ? ` · contexts: ${e.contexts.join(", ")}` : "")
  );
}
