/**
 * edu-reach.ts — the EmotionDesireUnit's reach into the larger
 * graph (the owner's ruling, 2026-11-16: the EDU makes use of
 * the OKU's whole correspondence graph, not only its own slice).
 *
 * The EDU's authority is its slice: it names an emotion and its
 * filed correspondences (edu.ts). Its reach is what it can WALK
 * from the emotion's phase, over the correspondence graph the
 * OKU holds:
 *  - the cycle walks — what generates the phase, what it
 *    generates, what controls it, what it controls;
 *  - the emotion counteractions — the emotions standing at the
 *    controlling and controlled phases. These are the Suwen's
 *    情志相勝 (qíngzhì xiāngshèng, "emotions counteracting one
 *    another") read off the graph: grief (Metal) overcomes
 *    anger (Wood) because Metal controls Wood. None of them is
 *    filed in any emotion entry; they exist only as walks;
 *  - the cross-domain correspondences the table files at the
 *    phase — season, direction, taste, organ, sense, and the
 *    rest — each carrying its own tier from its own provenance.
 *
 * The guard, as designed: a walked consequence is a RELATION
 * WITH A TIER — the cycle and counteraction walks price at
 * "derived", never attested — reported as a relation, and never
 * an edit to filed data, and never by itself a claim about a
 * person. What a relation is worth in a situation is for
 * Coherence and the Planner to price when they come to read
 * this; this module computes the walks and nothing more.
 */
import { CLASSIFICATIONS } from "./classify";
import { canonicalEmotion, SEVEN_EMOTIONS, type EmotionKind } from "./edu";
import { tierOfProvenance, type Tier } from "./pricing";
import { CONTROLS, GENERATES, type Element } from "./sentence";

export interface ReachRelation {
  kind: "generates" | "generated-by" | "controls" | "controlled-by" | "counteracted-by" | "counteracts" | "corresponds";
  /** What the relation runs from (an emotion name, or a phase). */
  from: string;
  /** What it runs to. */
  to: string;
  /** The walk, in words ("Metal controls Wood"). */
  via: string;
  tier: Tier;
  /** Where the relation comes from, in one sentence. */
  basis: string;
}

export interface EmotionReach {
  emotion: string;
  phase?: Element;
  /** The cycle positions around the phase. Absent for an
   *  unsettled emotion (fright) — no phase, no walk. */
  cycle: { generates?: Element; generatedBy?: Element; controls?: Element; controlledBy?: Element };
  /** Canonical emotions standing at the controlling phase:
   *  they counteract this one （情志相勝）. */
  counteractedBy: string[];
  /** Canonical emotions at the phase this one controls. */
  counteracts: string[];
  /** Cross-domain correspondences filed at the phase, grouped
   *  by aspect: the concepts the table files there. */
  correspondences: { aspect: string; concepts: string[] }[];
  relations: ReachRelation[];
}

const WALK_TIER: Tier = "derived";

function inverse(map: Record<Element, Element>, target: Element): Element {
  return (Object.keys(map) as Element[]).find((e) => map[e] === target)!;
}

function emotionsAt(phase: Element): EmotionKind[] {
  return SEVEN_EMOTIONS.filter((e) => e.element === phase);
}

/** The reach of one canonical emotion, walked over the OKU's
 *  graph. Undefined for a name the framework does not hold. */
export function emotionReach(name: string): EmotionReach | undefined {
  const kind = canonicalEmotion(name);
  if (!kind) return undefined;
  const phase = kind.element;
  if (!phase) {
    // Unsettled (fright): no phase is filed, so no walk exists.
    // The absence is the record — the tradition leaves it open.
    return { emotion: kind.name, cycle: {}, counteractedBy: [], counteracts: [], correspondences: [], relations: [] };
  }

  const generates = GENERATES[phase];
  const generatedBy = inverse(GENERATES, phase);
  const controls = CONTROLS[phase];
  const controlledBy = inverse(CONTROLS, phase);

  const counteractedBy = emotionsAt(controlledBy).map((e) => e.name);
  const counteracts = emotionsAt(controls).map((e) => e.name);

  const relations: ReachRelation[] = [
    { kind: "generated-by", from: kind.name, to: generatedBy, via: `${generatedBy} generates ${phase}`, tier: WALK_TIER, basis: "the generating cycle, walked from the emotion's phase" },
    { kind: "generates", from: kind.name, to: generates, via: `${phase} generates ${generates}`, tier: WALK_TIER, basis: "the generating cycle, walked from the emotion's phase" },
    { kind: "controlled-by", from: kind.name, to: controlledBy, via: `${controlledBy} controls ${phase}`, tier: WALK_TIER, basis: "the controlling cycle, walked from the emotion's phase" },
    { kind: "controls", from: kind.name, to: controls, via: `${phase} controls ${controls}`, tier: WALK_TIER, basis: "the controlling cycle, walked from the emotion's phase" },
    ...counteractedBy.map((e) => ({
      kind: "counteracted-by" as const,
      from: kind.name,
      to: e,
      via: `${controlledBy} controls ${phase}`,
      tier: WALK_TIER,
      basis: `情志相勝 (emotions counteracting): ${e} stands at ${controlledBy}, which controls ${kind.name}'s phase ${phase} — a walk, not a filed entry`,
    })),
    ...counteracts.map((e) => ({
      kind: "counteracts" as const,
      from: kind.name,
      to: e,
      via: `${phase} controls ${controls}`,
      tier: WALK_TIER,
      basis: `情志相勝 (emotions counteracting): ${kind.name} stands at ${phase}, which controls ${e}'s phase ${controls} — a walk, not a filed entry`,
    })),
  ];

  // Cross-domain: everything the table files at this phase,
  // grouped by aspect. The emotion entries themselves are the
  // EDU's own slice and are not repeated here.
  const byAspect = new Map<string, string[]>();
  for (const entry of CLASSIFICATIONS) {
    if (entry.element !== phase || entry.aspect === "emotion") continue;
    const list = byAspect.get(entry.aspect) ?? [];
    if (!list.includes(entry.concept)) list.push(entry.concept);
    byAspect.set(entry.aspect, list);
  }
  const correspondences = [...byAspect.entries()].map(([aspect, concepts]) => ({ aspect, concepts }));
  for (const c of correspondences) {
    relations.push({
      kind: "corresponds",
      from: kind.name,
      to: `${c.aspect}: ${c.concepts.join(", ")}`,
      via: `the ${phase} phase's filed ${c.aspect} correspondences`,
      tier: "established",
      basis: "filed in the OKU's classification table at the emotion's phase; each entry carries its own provenance tier there",
    });
  }

  return {
    emotion: kind.name,
    phase,
    cycle: { generates, generatedBy, controls, controlledBy },
    counteractedBy,
    counteracts,
    correspondences,
    relations,
  };
}
