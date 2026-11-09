/**
 * situation.ts — the Situation: the situated self (§§8.9–8.13).
 *
 * A per-turn reading of the system's place, date and hour, computed
 * fresh every turn from the host clock + configuration + any episodic
 * user-stated override, and never stored as a fact or written to the
 * graph. Slice 2b computes the canonical form: season-here from §8.10a's
 * (date, hemisphere) arcs, light aspect from §6.7's canonical season
 * profiles, marked `source: "canonical"`. The computed solar
 * night-proportion path (§8.10b) arrives with the knowledge base in
 * slice 2f — nothing here pretends to measure what it has not measured.
 */

export type LocationSource = "host-config" | "user-stated" | "kb";

export type SituationLocation =
  | { lat: number; lon: number; source: LocationSource; label?: string }
  | { unknown: true };

export interface Situation {
  instant: string; // ISO 8601; refreshed every turn, never a stored fact
  timezone?: string; // IANA name, when the host provides one
  location?: SituationLocation;
  host: {
    description: string; // what the system is (§8.12)
    machineLocationNote?: string;
  };
  derived: SituationDerived;
}

export interface SituationDerived {
  dayOfYear: number;
  hemisphere?: "north" | "south" | "equatorial";
  latitudeBand?: "polar" | "temperate" | "tropical";
  seasonHere?: string; // concept id of the season predominant HERE, now
  timeOfDayPhase: string; // night / dawn / midday / dusk (seed concept ids)
  lightAspect: {
    yinProportion?: number;
    band: "predominant" | "present" | "faint";
    source: "computed" | "canonical";
  };
  activityAspect: {
    yinProportion?: number;
    band: "predominant" | "present" | "faint";
    source: "computed" | "canonical";
  };
}

/** §6.7's canonical season degree profiles: Yin share per aspect. */
export const CANONICAL_SEASON_PROFILES: Record<
  string,
  { light: number; temperature: number; activity: number }
> = {
  spring: { light: 0.42, temperature: 0.45, activity: 0.35 },
  summer: { light: 0.18, temperature: 0.15, activity: 0.2 },
  autumn: { light: 0.58, temperature: 0.55, activity: 0.5 },
  winter: { light: 0.82, temperature: 0.85, activity: 0.75 },
};

/** §6.7 band thresholds read off a Yin proportion. */
export function bandOf(yinProportion: number): "predominant" | "present" | "faint" {
  if (yinProportion >= 0.65) return "predominant";
  if (yinProportion >= 0.35) return "present";
  return "faint";
}

/** Season arc boundaries by day-of-year (northern hemisphere, §8.10a):
 * arcs run equinox → solstice → equinox. */
const ARC_SPRING_START = 79; // ~20 Mar, spring equinox
const ARC_SUMMER_START = 172; // ~21 Jun, summer solstice
const ARC_AUTUMN_START = 266; // ~23 Sep, autumn equinox
const ARC_WINTER_START = 355; // ~21 Dec, winter solstice

export function northernSeasonForDayOfYear(dayOfYear: number): string {
  if (dayOfYear >= ARC_SPRING_START && dayOfYear < ARC_SUMMER_START) return "spring";
  if (dayOfYear >= ARC_SUMMER_START && dayOfYear < ARC_AUTUMN_START) return "summer";
  if (dayOfYear >= ARC_AUTUMN_START && dayOfYear < ARC_WINTER_START) return "autumn";
  return "winter";
}

const OPPOSITE_SEASON: Record<string, string> = {
  spring: "autumn",
  summer: "winter",
  autumn: "spring",
  winter: "summer",
};

export interface SituationOptions {
  instant: Date;
  timezone?: string;
  /** Effective location for this turn (override already applied). */
  location?: SituationLocation;
  /** A season established by other means (user-stated, §8.10b fallback). */
  statedSeason?: string;
  hostDescription?: string;
  machineLocationNote?: string;
  /** Marks every derived value as hypothetical (shadow Situation, §8.13). */
  hypothetical?: boolean;
}

function localParts(instant: Date, timezone?: string): { dayOfYear: number; hour: number } {
  // Local date/hour in the given IANA zone (host local time when absent).
  const fmt = new Intl.DateTimeFormat("en-US", {
    ...(timezone ? { timeZone: timezone } : {}),
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(instant).map((p) => [p.type, p.value]),
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour) % 24;
  const start = Date.UTC(year, 0, 0);
  const thisDay = Date.UTC(year, month - 1, day);
  const dayOfYear = Math.floor((thisDay - start) / 86_400_000);
  return { dayOfYear, hour };
}

/**
 * §8.10c — the clock on the day cycle. Yin proportion is 1.0 at
 * midnight, 0.5 at (nominal) sunrise, 0.0 at noon, 0.5 at sunset,
 * linear between anchors. Slice 2b uses the nominal 06:00 / 18:00
 * anchors; computed sunrise/sunset arrive with §8.10b in slice 2f.
 */
export function clockYinProportion(hour: number): number {
  const anchors: [number, number][] = [
    [0, 1.0],
    [6, 0.5],
    [12, 0.0],
    [18, 0.5],
    [24, 1.0],
  ];
  for (let i = 0; i + 1 < anchors.length; i++) {
    const [h0, v0] = anchors[i];
    const [h1, v1] = anchors[i + 1];
    if (hour >= h0 && hour <= h1) {
      if (h1 === h0) return v0;
      return v0 + ((v1 - v0) * (hour - h0)) / (h1 - h0);
    }
  }
  return 1.0;
}

/** Day-cycle sectors by local hour (nominal anchors, §8.10c). */
export function timeOfDayPhaseForHour(hour: number): string {
  if (hour >= 22 || hour < 5) return "night";
  if (hour < 10) return "dawn";
  if (hour < 16) return "midday";
  return "dusk";
}

export function computeSituation(opts: SituationOptions): Situation {
  const { dayOfYear, hour } = localParts(opts.instant, opts.timezone);
  const location = opts.location;
  const derived: SituationDerived = {
    dayOfYear,
    timeOfDayPhase: timeOfDayPhaseForHour(hour),
    lightAspect: { band: "present", source: "canonical" },
    activityAspect: { band: "present", source: "canonical" },
  };

  let seasonHere: string | undefined = opts.statedSeason;
  if (location && !("unknown" in location)) {
    const lat = location.lat;
    derived.hemisphere = Math.abs(lat) <= 10 ? "equatorial" : lat > 0 ? "north" : "south";
    derived.latitudeBand = Math.abs(lat) >= 66.5 ? "polar" : Math.abs(lat) <= 23.5 ? "tropical" : "temperate";
    if (!seasonHere) {
      const northern = northernSeasonForDayOfYear(dayOfYear);
      // THE DECEMBER RULE (§8.10a): season is a function of (date,
      // hemisphere), never of the month alone — the southern season is
      // the opposite one, shifted six months.
      seasonHere =
        derived.hemisphere === "south"
          ? OPPOSITE_SEASON[northern]
          : northern; // equatorial: nearest-anchor season (§8.10a fallback)
    }
  }
  if (seasonHere) derived.seasonHere = seasonHere;

  // Light aspect: canonical season profile where a season is established
  // (§8.10b fallback), else only what the clock supports (rule (c)).
  // Equatorial seasons never claim predominance from the calendar (§8.10a).
  const profile = seasonHere ? CANONICAL_SEASON_PROFILES[seasonHere] : undefined;
  if (profile) {
    let yin = profile.light;
    if (derived.hemisphere === "equatorial") yin = Math.min(yin, 0.6);
    derived.lightAspect = { yinProportion: yin, band: bandOf(yin), source: "canonical" };
  } else {
    const yin = clockYinProportion(hour);
    derived.lightAspect = { yinProportion: yin, band: bandOf(yin), source: "canonical" };
  }
  // Activity aspect follows the day-cycle curve; canonical by doctrine.
  const activityYin = clockYinProportion(hour);
  derived.activityAspect = {
    yinProportion: activityYin,
    band: bandOf(activityYin),
    source: "canonical",
  };

  return {
    instant: opts.instant.toISOString(),
    timezone: opts.timezone,
    location,
    host: {
      description: opts.hostDescription ?? "a program running on a server",
      ...(opts.machineLocationNote ? { machineLocationNote: opts.machineLocationNote } : {}),
    },
    derived,
  };
}

/**
 * A shadow Situation (§8.13): a derived copy computed for a hypothetical
 * place/instant. The session's real Situation is never mutated for a
 * hypothetical — this returns a separate object.
 */
export function shadowSituation(
  base: Situation,
  overrides: { instant?: Date; location: SituationLocation },
): Situation {
  const instant = overrides.instant ?? new Date(base.instant);
  return computeSituation({
    instant,
    timezone: base.timezone,
    location: overrides.location,
    hostDescription: base.host.description,
    machineLocationNote: base.host.machineLocationNote,
    hypothetical: true,
  });
}

/**
 * Host configuration for the chat surfaces (slice 2b): optional place set
 * by the deployer via ANSCI_LOCATION="lat,lon" + ANSCI_LOCATION_LABEL.
 * Absence is normal (§8.12): the system then honestly does not know
 * where it is. ANSCI_TIMEZONE overrides the IANA zone when set.
 */
export function hostConfigFromEnv(env: NodeJS.ProcessEnv = process.env): {
  location?: SituationLocation;
  timezone?: string;
  hostDescription?: string;
} {
  const out: { location?: SituationLocation; timezone?: string; hostDescription?: string } = {};
  const raw = env.ANSCI_LOCATION;
  if (raw) {
    const [latRaw, lonRaw] = raw.split(",").map((s) => s.trim());
    const lat = Number(latRaw);
    const lon = Number(lonRaw);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      out.location = {
        lat,
        lon,
        source: "host-config",
        ...(env.ANSCI_LOCATION_LABEL ? { label: env.ANSCI_LOCATION_LABEL } : {}),
      };
    }
  }
  if (env.ANSCI_TIMEZONE) out.timezone = env.ANSCI_TIMEZONE;
  if (env.ANSCI_HOST_DESCRIPTION) out.hostDescription = env.ANSCI_HOST_DESCRIPTION;
  return out;
}

/** Resolves a place name to coordinates — the seam the KB fills in 2f. */
export type PlaceResolver = (
  name: string,
) => { lat: number; lon: number; label: string } | undefined;
