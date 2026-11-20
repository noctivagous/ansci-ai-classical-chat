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
 * The honest configuration, as this table stands, is that
 * NO place is configured — and that is a finding, not an
 * omission. The system is a program: it runs wherever it is
 * run, no shell records a place for it, and the system's
 * situation record — the Awareness frame (session.ts's
 * FrameRecord) — is a TIME record: month/day/hour, season,
 * daypart. There is no place field in it to answer from,
 * and inventing one (a city, a country, "the internet")
 * would assert a fact nothing holds. So the self-location
 * answer this table supports today is the located decline
 * that names self-location as the gap. A deployment that
 * does run somewhere nameable sets the place here, as data,
 * and the same request then answers with it.
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

export const PLACE: PlaceTable = {
  place: null,
};
