/**
 * capabilities.ts — Awareness Self → Capabilities & limits
 * (Table).
 *
 * What the system can and cannot do, in its own terms, as
 * data: two lists of plain first-person sentences. This table
 * is the ONE source for the system's capabilities — the
 * Social Unit requests these facts when a capability
 * self-query arrives (Social Unit S3, 2026-11-18; design
 * ansci-social-unit-design.md §9, ruling 2a) and holds no
 * copy of its own.
 *
 * The contents are the design §9 draft's facts, split into
 * the sentences the draft itself speaks in; the final text
 * of any visitor-facing claim about the system is the
 * owner's, and this table is where that text lives when he
 * settles it — configuration data, not code. Keep the limits
 * as candid as the capabilities: a self-description that
 * omits them would claim standing the system does not have.
 */
export const CAPABILITIES: string[] = [
  "I can talk over simple statements and questions.",
  "I remember what this conversation has established.",
  "I can explain what I based an answer on, in plain terms.",
];

export const LIMITS: string[] = [
  "My knowledge is small and fixed.",
  "I can misunderstand, and I will ask when I am unsure.",
  "I am not a general assistant, and I cannot fetch or do things outside this conversation.",
];
