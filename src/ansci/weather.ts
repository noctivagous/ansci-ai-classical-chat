/**
 * weather.ts — the weather question shapes and the place
 * resolution (Probe-2 Slice 6, 2026-11-20; diagnostic SD4,
 * second half + K1). The turn layer (turn.ts) claims these
 * shapes synchronously; the wrapper (weather-turn.ts) adds
 * the fetch on the located decline, exactly as the Wikidata
 * pair divides the work.
 *
 * PLACE FIRST (the owner's chain, settled with the Wikidata
 * pattern): a weather answer requires a place, and the
 * resolution order is stated, most specific first —
 *
 *   1. the place the question itself names ("in Oklahoma");
 *   2. the configured place (the Place table, place.ts);
 *   3. a place the conversation has stated — the residence
 *      event ("I live in Oklahoma") or the record's own
 *      location graph for the speaker ("I am in Oklahoma",
 *      which writes no event: the turn object's meaning
 *      carries the location edge, and the record is read
 *      where it stands);
 *   4. nothing — the reply names the place gap. No weather
 *      is guessed for a placeless question.
 *
 * Detection is by the turn's surface shape, stated as
 * patterns below — the shapes this slice commissions ("what
 * is the weather?", "how is the weather?", "what is the
 * temperature?", "is it raining?"), not a general weather
 * grammar, mirroring detectWikidataQuestion's standing.
 */
import type { Session } from "./session";
import { configuredSeat, statedPlaceFromConversation } from "./geography-awareness";
import { placeKeyOf, type WeatherReading } from "./weather-bank";

export type WeatherShape = "weather" | "temperature" | "raining" | "snowing";

export interface WeatherQuestion {
  shape: WeatherShape;
  /** The place the question itself names ("in Oklahoma"),
   *  surface casing, when it names one. */
  placeInQuestion?: string;
}

const cleanPlace = (raw: string): string => raw.trim().replace(/[?.!]+$/, "").trim();

/** The commissioned weather question shapes, as surface patterns. */
export function detectWeatherQuestion(text: string): WeatherQuestion | undefined {
  const t = text.trim();
  let m = t.match(/^what(?:'s| is) the (weather|temperature)(?:\s+now)?(?:\s+in\s+(.+?))?\s*\??$/i);
  if (m) return { shape: m[1].toLowerCase() as WeatherShape, ...(m[2] ? { placeInQuestion: cleanPlace(m[2]) } : {}) };
  m = t.match(/^how(?:'s| is) the (weather|temperature)(?:\s+in\s+(.+?))?\s*\??$/i);
  if (m) return { shape: m[1].toLowerCase() as WeatherShape, ...(m[2] ? { placeInQuestion: cleanPlace(m[2]) } : {}) };
  m = t.match(/^is it (raining|snowing)(?:\s+in\s+(.+?))?\s*\??$/i);
  if (m) return { shape: m[1].toLowerCase() as WeatherShape, ...(m[2] ? { placeInQuestion: cleanPlace(m[2]) } : {}) };
  return undefined;
}

export type WeatherPlaceSource = "question" | "configured" | "conversation";

export interface ResolvedWeatherPlace {
  /** The place as named (surface casing from its source). */
  place: string;
  source: WeatherPlaceSource;
  /** How the conversation stated it, when source is
   *  "conversation" (the event's verb, or "record" for the
   *  turn-object location graph). */
  via?: string;
}

/**
 * Resolve the place a weather question is about, in the
 * stated order. Pure read over the session record and the
 * configured seat; nothing is written.
 *
 * Geography G1 (2026-11-20): the chain's steps are the
 * pair's protocol (§5) read through GeographyAwareness —
 * the configured seat is its seat, and the conversation
 * step is its situated reading (geography-awareness.ts's
 * statedPlaceFromConversation: the residence event, else
 * the record's location graph — the reading this function
 * grew privately in Slice 6, generalised and moved there).
 * The order and the outcomes are unchanged.
 */
export function resolveWeatherPlace(session: Session, question: WeatherQuestion): ResolvedWeatherPlace | undefined {
  if (question.placeInQuestion) return { place: question.placeInQuestion, source: "question" };
  const seat = configuredSeat();
  if (seat.place) return { place: seat.place, source: "configured" };
  const stated = statedPlaceFromConversation(session);
  if (stated) return { place: stated.place, source: "conversation", via: stated.via };
  return undefined;
}

/**
 * The weather the conversation itself states (S2 of the
 * diagnostic): the latest standing state held of the
 * weather — "the weather is cold" banks holder 'weather',
 * lemma 'cold'. A weather question asked over a stated
 * weather is answered from the record, as every stated
 * predication is; the source is never allowed to contradict
 * the visitor's own statement by silence.
 *
 * Only states from turns BEFORE the asking count, and
 * never a state whose lemma is a question word: a question
 * turn registers a state for its own predication — holder
 * 'weather', lemma 'what', the question word standing in
 * the value slot — and reading such a state as stated
 * weather would answer a later question with the earlier
 * question's own word ("You said the weather is what."),
 * the second transcript's vacuous completion by the record
 * route. A stated quality is content; the unfilled slot of
 * a question is not a statement, on any turn.
 */
const QUESTION_WORD_LEMMAS = new Set(["what", "who", "whom", "whose", "where", "when", "why", "how", "which"]);

export function statedWeather(
  session: Session,
  beforeTurn: number,
): { lemma: string; negated: boolean; turn: number } | undefined {
  let latest: { lemma: string; negated: boolean; turn: number } | undefined;
  for (const s of session.states) {
    if (s.holder !== "weather" || s.turn >= beforeTurn) continue;
    if (QUESTION_WORD_LEMMAS.has(s.lemma)) continue;
    if (!latest || s.turn >= latest.turn) {
      latest = { lemma: s.lemma, negated: s.negated ?? false, turn: s.turn };
    }
  }
  return latest;
}

/** The display form of a stated place: the visitor's own
 *  casing where it carries one; a bare lowercase name is
 *  capitalised for the reply, as a place name is written. */
export function displayPlace(place: string): string {
  return place === place.toLowerCase() ? place.charAt(0).toUpperCase() + place.slice(1) : place;
}

/**
 * Compose the reply a reading supports, per shape — the
 * plain statement of fact carrying its source, never
 * derivation language (the no-masquerade rule the Wikidata
 * answers follow). The reading's fetch time rides in the
 * trace, and its shelf life bounds when this may be spoken
 * as current at all.
 */
export function composeWeatherReply(reading: WeatherReading, shape: WeatherShape): string {
  const temp = `${reading.temperatureC}°C`;
  // DRAFT wording — the owner's to settle: the source note
  // names the service the reading came through
  // (api.weather.gov is the National Weather Service's
  // API; Slice 8's re-point changed this note from Slice
  // 6's "(From Open-Meteo.)").
  const sourceNote = "(From the National Weather Service.)";
  if (shape === "temperature") {
    return `In ${reading.resolvedName} it is ${temp}. ${sourceNote}`;
  }
  if (shape === "raining") {
    return reading.raining
      ? `Yes — it is raining in ${reading.resolvedName}: ${reading.condition}, ${temp}. ${sourceNote}`
      : `No — it is not raining in ${reading.resolvedName}: ${reading.condition}, ${temp}. ${sourceNote}`;
  }
  if (shape === "snowing") {
    return reading.snowing
      ? `Yes — it is snowing in ${reading.resolvedName}: ${reading.condition}, ${temp}. ${sourceNote}`
      : `No — it is not snowing in ${reading.resolvedName}: ${reading.condition}, ${temp}. ${sourceNote}`;
  }
  return `In ${reading.resolvedName} it is ${temp} and ${reading.condition}. ${sourceNote}`;
}

export { placeKeyOf };
