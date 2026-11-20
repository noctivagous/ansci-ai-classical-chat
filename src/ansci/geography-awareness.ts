/**
 * geography-awareness.ts — GeographyAwareness (Geography G1,
 * 2026-11-20; design note docs/ansci/geography-design-note.md
 * §3): the situated home of place, a submodule of Awareness
 * and sibling of the Social Unit.
 *
 * Where GeographyKnowledgeUnit (geography.ts) holds what the
 * system knows about places DURABLY, this module holds where
 * THIS conversation is situated — per-session, and only for
 * the session. Its session register lives in the Session
 * beside the Social Unit's registers (session.ts); the frame
 * (session.ts's FrameRecord) is a time record and stays one —
 * no place field is added to it (§8: the remedy for place is
 * a home, not a field in a time record).
 *
 * THE DISCIPLINE (§3.2 — the Social Unit's, stated for
 * space). GeographyAwareness reads the spatial situation and
 * raises the situated place for other machinery; it never
 * speaks, never authors a reply, and never originates a world
 * claim. It holds no geographic fact of its own: the
 * configured seat is the Place table's data, taken up at
 * session opening (the table's custody is this unit's now —
 * §8 — its data and its honesty unchanged); the interlocutor's
 * place is a POINTER to the conversation record (this module
 * holds THAT they stated it, and when; the record holds what
 * was said — only speaker-attributed content writes in, the
 * Social Unit's update rule applied to place). When a
 * question is answered about a place, the answer's facts come
 * from the register or a consultation; this unit only
 * establishes which place the question is about.
 *
 * THE DEICTIC CENTRE (§3.1) is kept as two seats, never one
 * fact: the SYSTEM's here is the configured seat; the
 * INTERLOCUTOR's here is their stated place. "What is the
 * weather?" from a visitor asks about the visitor's here.
 * Shifts are recorded, not overwritten: when the conversation
 * moves, the register's shift log gains an entry and the
 * earlier centre stands in it, superseded.
 */
import type { Session } from "./session";
import { PLACE } from "./place";

/** One recorded shift of the interlocutor's centre. */
export interface GeographyShift {
  place: string;
  /** How the conversation stated it (the located event's
   *  verb, or "record" for the turn-object location graph). */
  via: string;
  /** The session turn the statement stands at, where the
   *  record carries one (the object graph's turn); the
   *  reading's own turn otherwise. */
  turn: number;
}

/** GeographyAwareness's session register (session.ts). */
export interface GeographyAwarenessRegister {
  /** The configured seat, taken up at session opening: the
   *  deployment's place as the Place table configures it, or
   *  null — no place configured, the table's honest standing. */
  seat: string | null;
  /** The interlocutor's current centre: the latest place the
   *  conversation establishes for them, as a pointer to the
   *  record that states it. Absent when they have stated
   *  none. */
  centre?: { place: string; via: string };
  /** Every centre the conversation has held, in order —
   *  shifts recorded, not overwritten (§3.1). */
  shifts: GeographyShift[];
}

export function initialGeographyAwareness(): GeographyAwarenessRegister {
  return { seat: PLACE.place, shifts: [] };
}

/**
 * The configured seat, through GeographyAwareness — the one
 * address for the deployment's place now (§8: the Place
 * table's custody moved here; its data is read, never
 * copied, so the seat cannot drift from the configuration).
 */
export function configuredSeat(): { place: string | null } {
  return { place: PLACE.place };
}

/**
 * The place the conversation has established for the
 * interlocutor, read from the record where it stands — the
 * reading weather.ts's resolution chain grew privately in
 * Slice 6, generalised and moved here (§8): the latest
 * located event of the visitor's (a residence event — "I
 * live in Oklahoma"), else the latest turn object whose
 * meaning carries the speaker's location edge ("I am in
 * Oklahoma" writes no event; the record's own location graph
 * is read). Pure read; nothing is written; only
 * speaker-attributed content counts.
 */
export function statedPlaceFromConversation(
  session: Session,
): { place: string; via: string } | undefined {
  for (let i = session.events.length - 1; i >= 0; i--) {
    const e = session.events[i];
    if (e.agent === "you" && e.location) {
      return { place: e.location, via: e.verb };
    }
  }
  for (let i = session.objects.length - 1; i >= 0; i--) {
    const o = session.objects[i];
    if (o.producer !== "person") continue;
    const meaning = (o.content as { meaning?: { nodes: { id: string; lemma: string; form: string }[]; edges: { from: string; to: string; relation: string }[] } }).meaning;
    if (!meaning) continue;
    const locationEdge = meaning.edges.find((e) => e.relation === "location");
    if (!locationEdge) continue;
    const speaker = meaning.nodes.find((n) => n.id === locationEdge.from);
    const target = meaning.nodes.find((n) => n.id === locationEdge.to);
    if (speaker && (speaker.lemma === "i" || speaker.lemma === "you") && target) {
      // The place's full name: the target node is the head
      // ("city"), and its qualifiers in the same graph carry
      // the rest of the name ("oklahoma" — a qualifies edge
      // into the target). Reading the head alone truncates a
      // multi-word place to its last word; the name is
      // composed in node order (Geography G3, found by the
      // how-far deictic case; single-word places are
      // unaffected).
      const qualifiers = meaning.edges
        .filter((e) => e.relation === "qualifies" && e.to === target.id)
        .map((e) => meaning.nodes.find((n) => n.id === e.from))
        .filter((n): n is NonNullable<typeof n> => n !== undefined)
        .sort((a, b) => meaning.nodes.indexOf(a) - meaning.nodes.indexOf(b));
      const place = [...qualifiers.map((q) => q.form), target.form].join(" ");
      return { place, via: "record" };
    }
  }
  return undefined;
}

/**
 * The situated reading (§3.2's product): refresh the session
 * register from the conversation record — a newly stated
 * place becomes the centre and the shift is recorded — and
 * return the reading. Consumers call this when a turn needs
 * the situated place; the reading originates nothing, it
 * reports what the record already establishes.
 */
export function readGeographyAwareness(session: Session): {
  seat: string | null;
  interlocutorPlace?: { place: string; via: string };
} {
  const register = session.geography;
  const stated = statedPlaceFromConversation(session);
  if (stated && register.centre?.place !== stated.place) {
    register.centre = { place: stated.place, via: stated.via };
    register.shifts.push({ place: stated.place, via: stated.via, turn: session.turnCount });
  }
  return {
    seat: register.seat,
    ...(register.centre ? { interlocutorPlace: { ...register.centre } } : {}),
  };
}

/**
 * The interlocutor's situated place — the deictic centre
 * behind a visitor's "here", "near me" and "where am I?",
 * and the place an unlocated visitor question (the weather
 * shape first of them) is about. Absent when the conversation
 * has established none: that absence is the place gap, and it
 * is located HERE, in this reading (§5, §9.4).
 */
export function interlocutorPlace(session: Session): { place: string; via: string } | undefined {
  return readGeographyAwareness(session).interlocutorPlace;
}

/**
 * The system's own situated place — the configured seat, for
 * the system's "here" ("where are you?"). Null when no place
 * is configured: the self-location decline that names the
 * seat as the gap is the correct answer then (place.ts's
 * standing honesty, unchanged by the custody move).
 */
export function systemPlace(session: Session): string | null {
  void session;
  return configuredSeat().place;
}
