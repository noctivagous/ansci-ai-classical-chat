/**
 * identity.ts — Awareness Self → Identity (Table).
 *
 * Who the system is, as data: the name and the one-line kind.
 * This table is the ONE source for the system's identity —
 * the Social Unit requests these facts when a self-query
 * arrives (Social Unit S3, 2026-11-18; design
 * ansci-social-unit-design.md §9, ruling 2a) and holds no copy
 * of its own, so the self the visitor meets cannot drift from
 * the self the rest of Awareness reads.
 *
 * Visitor language throughout: the ontology is architecture
 * and is never named in chat replies, so the table speaks of
 * what the system is and does in plain terms. The contents are
 * the design §9 draft's facts, in the first person the system
 * speaks with; the final text of any visitor-facing claim
 * about the system is the owner's, and this table is where
 * that text lives when he settles it — configuration data,
 * not code.
 */
export interface IdentityTable {
  /** The system's name, as it gives it. */
  name: string;
  /** What it is, in one or two plain sentences, first person. */
  kindLine: string;
}

export const IDENTITY: IdentityTable = {
  name: "AnSci",
  kindLine:
    "I am a small classical-AI system. I understand simple English statements and questions, and I answer from what I know, saying so when I don't.",
};
