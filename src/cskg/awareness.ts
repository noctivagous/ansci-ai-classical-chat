/**
 * awareness.ts — engine piece A: world state, orientation, awareness
 * (design §2; grows from the spike's situation.ts).
 *
 * The situated self: place, time, season from (date, hemisphere),
 * daypart — computed per turn, never stored as knowledge. Location
 * comes from the environment: CSKG_CHAT_LOCATION (a place name)
 * and/or CSKG_CHAT_HEMISPHERE ("north" | "south"). A tiny built-in
 * table resolves a few place names to hemisphere + latitude band;
 * an unknown name without a hemisphere is honestly unknown.
 *
 * Season is a plain astronomy/calendar fact of (date, hemisphere) —
 * December is winter in the northern hemisphere and summer in the
 * southern; a month NEVER maps to a season on its own. (The December
 * rule, carried over from the main pipeline's §8.10a as a factual
 * discipline, not as framework interpretation.) There is deliberately
 * NO Wuxing/yin-yang reading of any of this: season here is a fact,
 * and what the framework would make of it belongs to the later
 * ontology track.
 *
 * Plus the PERSON: who is talking. E1 always runs in general mode —
 * the person is unknown, and unknown means general (§3 step 1). The
 * person file, its loading and its write discipline are E4 (§5);
 * the `person` workspace field and the known-person shape exist
 * from E1 so the later slice only fills them in.
 *
 * The conversation layer uses the Situation in exactly three ways:
 *   1. direct questions ("what time is it?", "what season is it?",
 *      "where are you?") answered from it, hedged when unset;
 *   2. selection pressure — among competing grounded facts, ones
 *      relevant to the current season/daypart win the answer slot;
 *   3. nothing else. It does not filter, gate or invent facts.
 *
 * Writes (engine map): `situation`, `person`, `role`, and —
 * since the disposition was named (design §11) — `disposition`:
 * awareness loads the frame whole; the disposition's own
 * content and rules live in disposition.ts.
 */
import { loadDisposition } from "./disposition";
import { personNameFromEnv } from "./person";
import { loadRolePack } from "./roles";
import type { TurnWorkspace } from "./workspace";

export type Hemisphere = "north" | "south";
export type LatitudeBand = "temperate" | "tropical" | "polar";
export type Season = "spring" | "summer" | "autumn" | "winter";
export type Daypart = "morning" | "afternoon" | "evening" | "night";

export interface PlaceConfig {
  name: string;
  hemisphere?: Hemisphere;
  band?: LatitudeBand;
}

export interface Situation {
  now: Date;
  /** configured place, or null when no location is configured */
  place: PlaceConfig | null;
  /** null when hemisphere is unknown or the band has no such seasons */
  season: Season | null;
  daypart: Daypart;
}

/**
 * Who is talking (§5). `general` when no person is configured;
 * `known` with the configured name — the person's stated facts
 * and preferences load from their file in person.ts.
 */
export type PersonContext =
  | { kind: "general" }
  | { kind: "known"; name: string };

const KNOWN_PLACES: Record<string, { hemisphere: Hemisphere; band: LatitudeBand }> = {
  chicago: { hemisphere: "north", band: "temperate" },
  "new york": { hemisphere: "north", band: "temperate" },
  london: { hemisphere: "north", band: "temperate" },
  sydney: { hemisphere: "south", band: "temperate" },
  melbourne: { hemisphere: "south", band: "temperate" },
  auckland: { hemisphere: "south", band: "temperate" },
  singapore: { hemisphere: "south", band: "tropical" },
  honolulu: { hemisphere: "north", band: "tropical" },
};

export function placeFromEnv(env: NodeJS.ProcessEnv): PlaceConfig | null {
  const name = (env.CSKG_CHAT_LOCATION ?? "").trim();
  const hemiRaw = (env.CSKG_CHAT_HEMISPHERE ?? "").trim().toLowerCase();
  const hemisphere: Hemisphere | undefined =
    hemiRaw === "north" || hemiRaw === "south" ? hemiRaw : undefined;
  if (!name && !hemisphere) return null;
  const known = name ? KNOWN_PLACES[name.toLowerCase()] : undefined;
  return {
    name: name || "an unnamed place",
    hemisphere: hemisphere ?? known?.hemisphere,
    band: known?.band,
  };
}

/** Meteorological seasons from (month, hemisphere). Pure; testable. */
export function seasonFor(date: Date, place: PlaceConfig | null): Season | null {
  if (!place || !place.hemisphere) return null;
  if (place.band === "tropical" || place.band === "polar") return null;
  const m = date.getMonth(); // 0-based
  const north: Season =
    m === 11 || m <= 1 ? "winter" : m <= 4 ? "spring" : m <= 7 ? "summer" : "autumn";
  if (place.hemisphere === "north") return north;
  // southern hemisphere: opposite configuration
  return north === "winter" ? "summer"
    : north === "summer" ? "winter"
    : north === "spring" ? "autumn"
    : "spring";
}

export function daypartFor(date: Date): Daypart {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

export function computeSituation(
  now: Date,
  env: NodeJS.ProcessEnv = process.env,
): Situation {
  const place = placeFromEnv(env);
  return { now, place, season: seasonFor(now, place), daypart: daypartFor(now) };
}

/**
 * A's turn entry: load the workspace's `situation`, `person`,
 * `role` and `disposition` — the whole frame (§5, §11). The person is `known`
 * when CSKG_CHAT_PERSON names one (their file loads in
 * person.ts; awareness records only who is talking), and the
 * role pack is loaded from roles/ (CSKG_CHAT_ROLE, default
 * assistant). Unknown → general mode, as ever.
 */
export function loadAwarenessInto(
  ws: TurnWorkspace,
  now: Date,
  env: NodeJS.ProcessEnv = process.env,
): void {
  ws.situation = computeSituation(now, env);
  const name = personNameFromEnv(env);
  ws.person = name ? { kind: "known", name } : { kind: "general" };
  ws.role = loadRolePack(env);
  ws.disposition = loadDisposition(env);
}

/**
 * Selection-pressure vocabulary: words that make a fact situationally
 * relevant. Deliberately small and literal — this is calendar
 * relevance, not framework correspondence.
 */
export const SEASON_WORDS: Record<Season, string[]> = {
  winter: ["winter", "snow", "ice", "cold", "coat", "warm", "heating", "fireplace", "ski"],
  summer: ["summer", "hot", "sun", "swim", "beach", "ice cream", "fan", "heat"],
  autumn: ["autumn", "fall", "leaf", "leaves", "harvest", "rain", "coat"],
  spring: ["spring", "flower", "rain", "garden", "allergy", "bloom"],
};

export const DAYPART_WORDS: Record<Daypart, string[]> = {
  morning: ["breakfast", "coffee", "wake", "alarm", "morning"],
  afternoon: ["lunch", "afternoon", "nap"],
  evening: ["dinner", "supper", "evening", "sunset"],
  night: ["sleep", "night", "dark", "bed", "dream", "tired"],
};

/** Does this term text touch the current season/daypart vocabulary? */
export function situationallyRelevant(termText: string, sit: Situation): boolean {
  const words = new Set(termText.toLowerCase().split(/\s+/));
  const lists: string[][] = [];
  if (sit.season) lists.push(SEASON_WORDS[sit.season]);
  lists.push(DAYPART_WORDS[sit.daypart]);
  return lists.some((list) => list.some((w) => words.has(w) || termText.includes(w)));
}
