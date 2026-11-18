/**
 * The ProblemSolving Unit (owner's commission, 2026-11-18) —
 * a placeholder seat inside the Reasoning Unit, wired at its
 * router, with its repertoire present as data.
 *
 * What the unit is for: general-purpose problem solving, not
 * limited to mathematics. Problems reach it by ROUTING: a
 * small router in the turn asks "does this need
 * problem-solving?" — because the person instructed a
 * solution, or because the AI assessed the object as needing
 * one — and attaches the needs to the object itself, routed
 * here. Quantification is the first wired signal: an object
 * carrying quantity content, or a how-many question, is
 * routed with the need "quantification" (the solving itself
 * is the quantity ledger's today — the route records that a
 * problem was recognised and where it belongs, ahead of the
 * unit's own engines).
 *
 * The repertoire is the standard acronym cycles people
 * actually use — OODA, PDCA, and the rest as they are
 * registered — each held as a small GRAPH: its steps as
 * nodes, the sequence between them, and the cycle edge that
 * closes the loop, because these processes are cycles and
 * the graph is their honest shape. No engine traverses an
 * approach graph yet: the seat, the router and the approach
 * graphs are what this placeholder wires. The approaches'
 * steps are data, registered the way the classification
 * table registers entries — a new acronym is a new entry,
 * not new code.
 *
 * For issues of how to proceed in a general situation, the
 * unit will also carry an evaluation mechanism based on
 * the 64 hexagrams, making use of OntologyCore (owner's
 * addition, 2026-11-18): the hexagrams stand in the
 * ontology the Ontology Knowledge Unit holds, and the
 * evaluation reads them there — this unit keeps no
 * hexagram copy of its own. The router's need vocabulary
 * gains a how-to-proceed kind when that mechanism is
 * built; at placeholder grade nothing routes to it and no
 * evaluation runs.
 *
 * The unit's divisions (owner's, settled 2026-11-18) are
 * six placeholder subunits on the map — external,
 * abstract, internal, internal-system, external-system,
 * and the user's problems — seats a problem moves between,
 * not bins: a problem record will carry its current seat
 * and its history, its bearer (the system / the user / a
 * third party / the matter itself), and its subject. The
 * hexagram evaluation is the abstract division's
 * instrument; the user's problems feed back to internal,
 * where solving is taken up. No division machinery exists
 * yet — the seats stand on the map and in the unit's
 * PLACEHOLDER, awaiting their own slices.
 */

import type { SemanticObject } from "./semantic-object";

export const PROBLEM_SOLVING_UNIT = "reasoning/problem-solving";

/* ------------------------------------------------------------------ */
/* The approach graphs                                                  */
/* ------------------------------------------------------------------ */

export interface ApproachStep {
  id: string;
  name: string;
  gloss: string;
}

export interface ApproachEdge {
  from: string;
  to: string;
  /** "sequence" walks the cycle forward; the single "cycle"
   *  edge closes it, from the last step back to the first. */
  kind: "sequence" | "cycle";
}

export interface ProblemSolvingApproach {
  id: string;
  name: string;
  expansion: string;
  domain: string;
  steps: ApproachStep[];
  edges: ApproachEdge[];
}

function cycle(id: string, name: string, expansion: string, domain: string, steps: [string, string][]): ProblemSolvingApproach {
  const nodes: ApproachStep[] = steps.map(([stepName, gloss]) => ({
    id: `${id}/${stepName.toLowerCase()}`,
    name: stepName,
    gloss,
  }));
  const edges: ApproachEdge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const from = nodes[i];
    const to = nodes[(i + 1) % nodes.length];
    edges.push({ from: from.id, to: to.id, kind: i === nodes.length - 1 ? "cycle" : "sequence" });
  }
  return { id, name, expansion, domain, steps: nodes, edges };
}

export const PROBLEM_SOLVING_APPROACHES: ProblemSolvingApproach[] = [
  cycle("ooda", "OODA", "Observe, Orient, Decide, Act", "Rapid decision cycles (military)", [
    ["Observe", "Take in what is happening — the situation as it presents, before interpretation."],
    ["Orient", "Place what was observed against what is known — experience, models, the correspondence picture; the step where the situation becomes a reading."],
    ["Decide", "Choose the course the reading supports."],
    ["Act", "Carry the decision out — and the acting changes the situation, which is observed again."],
  ]),
  cycle("pdca", "PDCA", "Plan, Do, Check, Act", "Continuous improvement cycle", [
    ["Plan", "Form the intention and the expectation: what will be done, and what would show it worked."],
    ["Do", "Carry the plan out, on the scale the plan set."],
    ["Check", "Compare what happened against the expectation the plan recorded."],
    ["Act", "Standardise what the check sustained, or correct what it did not — and plan again from the corrected ground."],
  ]),
];

/** An approach by id ("ooda", "pdca"), when registered. */
export function approachById(id: string): ProblemSolvingApproach | undefined {
  return PROBLEM_SOLVING_APPROACHES.find((a) => a.id === id);
}

/* ------------------------------------------------------------------ */
/* The router                                                           */
/* ------------------------------------------------------------------ */

/** A need the router attaches to an object: what kind of
 *  problem-solving the object calls for. "quantification" is
 *  the first registered kind; the list is the router's
 *  vocabulary, extended by registration as new signals are
 *  wired. */
export type ProblemNeed = "quantification";

/**
 * The router ("does this need problem-solving?"): attach the
 * needs to the object, as a trail annotation signed by the
 * unit, with the ground the routing stands on — the person's
 * instruction, or the AI's assessment of the object. The
 * annotation is the whole of the wiring at placeholder
 * grade: the needs ride the object into the record and the
 * trace, the unit is on the turn's map path, and no solving
 * approach runs yet.
 */
export function routeProblemSolving(object: SemanticObject, needs: ProblemNeed[], ground: string): void {
  object.trail.push({
    unit: PROBLEM_SOLVING_UNIT,
    note:
      `routed to the ProblemSolving Unit — the router asked "does this need problem-solving?" and the answer is yes (${ground}); ` +
      `needs attached: ${needs.join(", ")}. The unit is a placeholder: the needs are recorded on the object and no solving approach runs yet`,
    data: { needs: [...needs], routedTo: PROBLEM_SOLVING_UNIT, ground },
  });
}
