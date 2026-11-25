/**
 * place.ts — Awareness Self → Place (Table).
 *
 * Where the system is, as data: the place this deployment is
 * configured as being in, or none. This table is the ONE
 * source for the system's place — the Social Unit requests
 * the fact when a self-location question arrives
 * ("Where are you?" — Transcript Slice 4, 2026-11-19) and
 * holds no copy of its own, exactly as Identity and
 * Capabilities are held (identity.ts, capabilities.ts).
 *
 * The default configuration, as this table stands, is
 * Oklahoma City, OK (DEFAULT_PLACE below, with its point):
 * the seat answers self-location questions and grounds
 * unlocated weather questions where the deployment has
 * configured nothing else. A deployment that runs somewhere
 * nameable overrides the default here, as data — through
 * the environment (see envPlace) — and the same request
 * then answers with that place instead. Where a place were
 * ever set back to null, the self-location answer is the
 * located decline that names self-location as the gap.
 *
 * Place is deployment configuration, not session state: it
 * does not change within a conversation, which is why it
 * lives with the Self tables and not in the frame (the frame
 * is what the shell supplies per session — the time of the
 * session's opening). Visitor language throughout, as in
 * the sibling tables; the final text of any visitor-facing
 * claim about the system is the owner's, and this table is
 * where a configured place's text would live when he
 * settles it — configuration data, not code.
 *
 * CUSTODY (Geography G1, 2026-11-20; design note §8): this
 * table is now GeographyAwareness's CONFIGURED SEAT. The
 * data and its honesty are unchanged — the seat is read
 * through geography-awareness.ts's configuredSeat(), and
 * the Social Unit's self-location route requests the fact
 * there (social.ts's requestPlace). Nothing else about the
 * table moved: a deployment still sets its place here, as
 * data, and the optional coordinates below are the seat's
 * own attested point for that place.
 */
export interface PlaceTable {
  /** The place this deployment is configured as being in,
   *  named as it would be given after "in" ("Lisbon"), or
   *  null when no place is configured — the standing
   *  configuration, for the reason the header records. */
  place: string | null;
  /** The configured place's coordinates, when a deployment
   *  configures them alongside its place (Probe-2 Slice 8):
   *  the weather source reads weather for a POINT, and
   *  these are the point the configured place names, held
   *  here as configuration — a deployment that knows where
   *  it runs can say so in numbers as well as in a name.
   *  Unset as the place itself is unset: no coordinates
   *  are configured, and none are invented. */
  latitude?: number;
  longitude?: number;
}

/** The default seat, where no deployment configuration
 *  overrides it: Oklahoma City, OK, with its point. */
export const DEFAULT_PLACE: PlaceTable = {
  place: "Oklahoma City, OK",
  latitude: 35.4676,
  longitude: -97.5164,
};

function envPlace(): PlaceTable {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const place = env?.ANSCI_PLACE?.trim();
  if (!place) return { ...DEFAULT_PLACE };
  const latitude = Number(env?.ANSCI_PLACE_LATITUDE);
  const longitude = Number(env?.ANSCI_PLACE_LONGITUDE);
  return {
    place,
    ...(Number.isFinite(latitude) && env?.ANSCI_PLACE_LATITUDE ? { latitude } : {}),
    ...(Number.isFinite(longitude) && env?.ANSCI_PLACE_LONGITUDE ? { longitude } : {}),
  };
}

/**
 * The configured place: deployment configuration from the
 * environment (ANSCI_PLACE, with ANSCI_PLACE_LATITUDE /
 * ANSCI_PLACE_LONGITUDE alongside it where the deployment
 * knows its point), or the default seat (DEFAULT_PLACE,
 * Oklahoma City, OK) where none is configured. An explicit
 * configuration always replaces the default.
 */
export const PLACE: PlaceTable = envPlace();
