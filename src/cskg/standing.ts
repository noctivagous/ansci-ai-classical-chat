/**
 * standing.ts — the standing tuple (design §5): certainty /
 * clarity / knownnessFelt, carried by readings, facts, situation
 * relations and person facts, and NEVER collapsed into one score,
 * because the three axes vary independently and different
 * consumers read different axes:
 *
 *   certainty      — how strongly the evidence supports the item
 *                    (attestation and corroboration in the graph;
 *                    attribution for stated material: the person
 *                    asserting a fact about themselves is strong
 *                    evidence of the assertion, weaker evidence
 *                    about third parties). Frame: the evidence.
 *   clarity        — how sharply the item itself is specified:
 *                    one reading cleanly picked out, or a smudge
 *                    of rivals. Frame: the representation.
 *   knownnessFelt  — how known the item feels within THIS
 *                    conversation: established by the person,
 *                    recently active, or arriving cold. It decays
 *                    with turns and refreshes on mention.
 *                    Frame: the conversation.
 *
 * Each axis is a number in [0, 1]; bands name the regions the
 * consumers actually branch on. Articulation's epistemic
 * vocabulary reads off the axes (admissionFor below): three
 * different failures get three different sentences, each naming
 * the axis that bottomed out — a report of the system's actual
 * state, not a performance of humility.
 *
 * E4 adoption (design §5: adoption is progressive): the tuple is
 * carried natively by the E4 machinery — resolver verdicts,
 * EverydaySense defaults, person facts and person state — and
 * reported in the trace wherever a decision turned on it.
 * Discourse and solve adopt it field by field as later slices
 * touch them.
 */

export interface Standing {
  certainty: number;
  clarity: number;
  knownnessFelt: number;
}

export type CertaintyBand = "absent" | "low" | "held" | "strong";
export type ClarityBand = "smudged" | "contested" | "clear";
export type KnownnessBand = "new" | "passing" | "established";

export function certaintyBand(v: number): CertaintyBand {
  return v <= 0.05 ? "absent" : v < 0.45 ? "low" : v < 0.8 ? "held" : "strong";
}

export function clarityBand(v: number): ClarityBand {
  return v < 0.35 ? "smudged" : v < 0.7 ? "contested" : "clear";
}

export function knownnessBand(v: number): KnownnessBand {
  return v < 0.25 ? "new" : v < 0.7 ? "passing" : "established";
}

/** Certainty from graph attestation: dataset support of an edge. */
export function certaintyFromSupport(support: number): number {
  return support >= 3 ? 0.95 : support === 2 ? 0.85 : support === 1 ? 0.5 : 0;
}

/**
 * Certainty of a person-stated item, by attribution (§5's
 * situation bands, roughly asserted < inferred < known): the
 * person's own statement about THEMSELVES is the strongest
 * testimony this system ever gets; a statement about a third
 * party is one remove further away.
 */
export function certaintyFromAttribution(who: "self" | "third-party" | "asked"): number {
  return who === "self" ? 0.9 : who === "asked" ? 0.85 : 0.65;
}

/**
 * Clarity from a score gap between rival readings: no gap is a
 * smudge, a wide gap is one reading cleanly picked out. The
 * curve is deliberately plain — the resolver's thresholds, not
 * this shape, carry the policy.
 */
export function clarityFromGap(gap: number): number {
  if (gap <= 0) return 0.2;
  return Math.min(0.98, 0.35 + gap / 10);
}

/**
 * Felt knownness of a topic: 1 when it was active this turn,
 * decaying ~0.12 per turn since it was last active, floored at
 * 0. `turnsSinceActive` is Infinity for a topic the conversation
 * has never touched.
 */
export function knownnessFromRecency(turnsSinceActive: number): number {
  if (!Number.isFinite(turnsSinceActive)) return 0;
  return Math.max(0, 1 - 0.12 * turnsSinceActive);
}

/* ---------------- articulation's admissions --------------------- */

export type AdmissionKind = "dont-know" | "unsure" | "not-clear" | null;

/**
 * Which admission a standing calls for, if any — read off the
 * axes in the design's order: certainty absent is the decline's
 * ground ("I don't know"); clarity low with knowledge present
 * is the resolver's ground ("I am not clear"); certainty low
 * with the referent pinned is the hedge's ground ("I am
 * unsure"). A standing with no axis bottomed out needs no
 * admission (null).
 */
export function admissionFor(s: Standing): AdmissionKind {
  if (certaintyBand(s.certainty) === "absent") return "dont-know";
  if (clarityBand(s.clarity) === "smudged") return "not-clear";
  if (certaintyBand(s.certainty) === "low") return "unsure";
  return null;
}

/** The admission's sentence form, for renderers that open with it. */
export function admissionPhrase(kind: AdmissionKind): string {
  switch (kind) {
    case "dont-know":
      return "I don't know";
    case "unsure":
      return "I am unsure";
    case "not-clear":
      return "I am not clear";
    default:
      return "";
  }
}

/** One trace line for a standing: the three axes, never merged. */
export function standingTrace(s: Standing): string {
  return (
    `certainty ${s.certainty.toFixed(2)} (${certaintyBand(s.certainty)}), ` +
    `clarity ${s.clarity.toFixed(2)} (${clarityBand(s.clarity)}), ` +
    `knownnessFelt ${s.knownnessFelt.toFixed(2)} (${knownnessBand(s.knownnessFelt)})`
  );
}
