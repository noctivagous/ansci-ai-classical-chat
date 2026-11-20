/**
 * weather-bank.ts — the weather bank (Probe-2 Slice 6, 2026-11-20;
 * the reading's source re-pointed by Probe-2 Slice 8 to
 * api.weather.gov; diagnostic SD4, second half + K1): banked weather readings,
 * held the way the Wikidata bank holds banked facts — with
 * retrieved provenance — plus the one discipline weather adds:
 * A READING EXPIRES.
 *
 * A capital does not go stale; weather does. So every reading
 * here carries its fetch time and a stated shelf life (the TTL,
 * 30 minutes by default, configuration below), and the bank's
 * freshness read is the only read the answer paths use: a
 * reading inside its shelf life answers as current, a reading
 * past it answers nothing — the turn declines located at the
 * missing (fresh) reading, or the wrapper fetches a new one.
 * Presenting stale weather as current is the failure this
 * shape exists to prevent.
 *
 * The condition vocabulary is the source's own:
 * api.weather.gov reports the condition in words (the
 * station's textDescription), and the reading carries
 * those words. The two facts the question shapes read off
 * a condition — is it raining, is it snowing — are
 * determined by the phrase table below, stated as data,
 * plus the station's measured precipitation where it
 * reported any (Slice 8: the table replaced Slice 6's WMO
 * code table when the source changed; the new source has
 * no codes to map).
 */

export interface WeatherReading {
  /** The bank key: the place as resolved for lookup,
   *  normalised (placeKeyOf). */
  placeKey: string;
  /** The place as the visitor named it (or the configured
   *  name) — the ask the reading answers. */
  statedPlace: string;
  /** The resolved place the reading is FOR, as the source
   *  names it ("El Reno, OK") — the point lookup names the
   *  city nearest the point the coordinates name, and the
   *  reply names that city honestly rather than pretending
   *  the reading covers the whole state the point stands
   *  in. */
  resolvedName: string;
  latitude: number;
  longitude: number;
  temperatureC: number;
  /** The condition in the source's own words, as the
   *  reply speaks them (the station's textDescription,
   *  lowercased at banking). */
  condition: string;
  /** Whether the reading's condition is a raining one,
   *  by the phrase table below (or the station's measured
   *  precipitation). */
  raining: boolean;
  /** Whether the reading's condition is a snowing one,
   *  by the phrase table below. */
  snowing: boolean;
  /** Precipitation over the hour before the observation,
   *  in millimetres, when the station reported it. */
  precipitationMm?: number;
  /** The source's observation time for the reading (the
   *  station's latest report), ISO. */
  observedAt: string;
  /** When this system fetched the reading, ISO. The trace
   *  shows it for every banked answer. */
  fetchedAt: string;
  /** fetchedAt + the shelf life, ISO. Past this, the
   *  reading is stale and answers nothing. */
  expiresAt: string;
  /** Retrieved provenance: the source the reading came
   *  through. Never derivation language. */
  source: "api.weather.gov";
  /** How the reading was obtained in tests/live runs
   *  ("live" or "fixture"), mirroring the Wikidata bank's
   *  retrievedFrom label. */
  retrievedFrom: string;
}

/** The shelf life of a banked reading, in minutes — stated
 *  configuration, overridable by WEATHER_TTL_MINUTES. */
export const WEATHER_TTL_DEFAULT_MINUTES = 30;

export function weatherTtlMinutes(env: NodeJS.ProcessEnv = process.env): number {
  const v = Number.parseInt(env.WEATHER_TTL_MINUTES ?? "", 10);
  return Number.isFinite(v) && v > 0 ? v : WEATHER_TTL_DEFAULT_MINUTES;
}

export function placeKeyOf(place: string): string {
  return place.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * The raining / snowing determination for the source's
 * condition words (Slice 8), as data: the phrase families
 * of api.weather.gov's textDescription vocabulary that
 * name falling rain and falling snow. The determination
 * is made once, at banking, and the reading carries the
 * two facts the shapes read.
 *
 * Precipitation is the measured half of the rule: a
 * station that reported precipitation over the last hour
 * is raining — unless its words say snow (precipitation
 * gauges report snow's liquid equivalent too, and snow is
 * not rain). A mixed phrase ("rain and snow") answers
 * both shapes yes, which is what the words say.
 */
const NWS_RAIN_WORDS = ["rain", "drizzle", "shower", "thunderstorm", "sprinkle"];
const NWS_SNOW_WORDS = ["snow", "flurr", "blizzard", "wintry"];

export function weatherFlagsForNwsText(
  conditionText: string,
  precipitationMm?: number,
): { raining: boolean; snowing: boolean } {
  const t = conditionText.toLowerCase();
  const snowing = NWS_SNOW_WORDS.some((w) => t.includes(w));
  const raining =
    NWS_RAIN_WORDS.some((w) => t.includes(w)) ||
    (precipitationMm !== undefined && precipitationMm > 0 && !snowing);
  return { raining, snowing };
}

/**
 * The bank: readings by place key, process-level like the
 * Wikidata bank (bank persistence there is process-level
 * too; a durable store is a separate, later decision, and
 * weather's shelf life makes process-level holding honest —
 * nothing here can outlive its TTL by much).
 */
export class WeatherBank {
  private readonly readings = new Map<string, WeatherReading>();

  put(reading: WeatherReading): void {
    this.readings.set(reading.placeKey, reading);
  }

  /** The reading for a place, whatever its freshness. */
  peek(placeKey: string): WeatherReading | undefined {
    return this.readings.get(placeKey);
  }

  /** The reading for a place IF it is still inside its
   *  shelf life at `nowISO` — the only read an answer may
   *  rest on. A stale reading returns undefined, exactly as
   *  an absent one does; peek() distinguishes them for the
   *  trace. */
  fresh(placeKey: string, nowISO: string): WeatherReading | undefined {
    const reading = this.readings.get(placeKey);
    if (!reading) return undefined;
    return nowISO < reading.expiresAt ? reading : undefined;
  }
}

export const defaultWeatherBank = new WeatherBank();
