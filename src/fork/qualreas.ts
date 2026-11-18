/**
 * qualreas.ts — qualitative relation algebras and a path-consistency
 * engine (the qualreas port, 2026-11-17).
 *
 * The DATA is qualreas's: the relation inventories, converses and
 * composition tables of three classical relation algebras — RCC-8
 * (region connection calculus, for spatial regions), Allen's
 * interval algebra (13 relations, for time intervals) and the point
 * algebra (<, =, >) — converted from the qualreas project's algebra
 * JSON (github.com/alreich/qualreas, data/algebras/) by
 * scripts/import-qualreas.py into data/qualreas/. qualreas is
 * MIT-licensed (Copyright (c) 2019 Alfred J. Reich); the full
 * notice is in the repo NOTICE file and data/qualreas/manifest.json.
 *
 * The ENGINE is ours, written in TypeScript from the classical
 * algorithm (path consistency over a constraint network, in the
 * tradition of Allen 1983 and Mackworth's PC algorithms — the same
 * algorithm qualreas implements in Python, credited here for the
 * data and the design): constraints are SETS of base relations
 * between entities; asserting a constraint intersects the standing
 * set (and its converse on the reverse pair); propagation
 * repeatedly enforces, for every triple (i, k, j),
 *   C[i][j] ⊆ C[i][k] ∘ C[k][j]
 * (∘ = composition through the algebra's table) until a fixpoint.
 * A set that empties is a CONTRADICTION in the network — reported,
 * never silently absorbed.
 *
 * Everything here is qualitative: relation sets, never coordinates,
 * distances or timestamps. That is the point of the formalism and
 * of its use in the scene graph (senses-scening.ts).
 */
import * as fs from "fs";
import * as path from "path";

export const DEFAULT_QUALREAS_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "data",
  "qualreas",
);

export type AlgebraName = "rcc8" | "allen" | "point";

export interface RelationAlgebra {
  name: AlgebraName;
  description: string;
  /** The relation every entity bears to itself (EQ / E / =). */
  identity: string;
  /** Base relation symbols, in artefact order. */
  relations: string[];
  /** Display names per base relation. */
  names: Record<string, string>;
  converse: Record<string, string>;
  /** composition[r1][r2] = the base relations that can hold between
   *  i and j when i -r1- k and k -r2- j. */
  composition: Record<string, Record<string, string[]>>;
}

interface QualreasManifest {
  v: number;
  source: string;
  edition: string;
  license: string;
  counts: Record<string, number>;
  parts: { file: string; kind: "algebras"; count: number; bytes: number }[];
}

let algebrasCache: Map<AlgebraName, RelationAlgebra> | undefined;
let algebrasTried = false;

function loadAlgebras(): Map<AlgebraName, RelationAlgebra> | undefined {
  if (!algebrasTried) {
    algebrasTried = true;
    try {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(DEFAULT_QUALREAS_PATH, "manifest.json"), "utf-8"),
      ) as QualreasManifest;
      const map = new Map<AlgebraName, RelationAlgebra>();
      for (const part of manifest.parts) {
        const data = JSON.parse(
          fs.readFileSync(path.join(DEFAULT_QUALREAS_PATH, part.file), "utf-8"),
        ) as {
          algebras: Record<
            string,
            {
              name: string;
              description: string;
              identity: string;
              relations: Record<string, { name: string; converse: string }>;
              composition: Record<string, Record<string, string[]>>;
            }
          >;
        };
        for (const [key, raw] of Object.entries(data.algebras)) {
          const relations = Object.keys(raw.relations);
          map.set(key as AlgebraName, {
            name: key as AlgebraName,
            description: raw.description,
            identity: raw.identity,
            relations,
            names: Object.fromEntries(relations.map((r) => [r, raw.relations[r].name])),
            converse: Object.fromEntries(relations.map((r) => [r, raw.relations[r].converse])),
            composition: raw.composition,
          });
        }
      }
      algebrasCache = map;
    } catch {
      algebrasCache = undefined; // absent artefact: the layer is silent
    }
  }
  return algebrasCache;
}

/** True when the qualreas data artefact is installed. */
export function qualreasAvailable(): boolean {
  return loadAlgebras() !== undefined;
}

/** One algebra by name, or undefined when the artefact is absent. */
export function loadAlgebra(name: AlgebraName): RelationAlgebra | undefined {
  return loadAlgebras()?.get(name);
}

/** Compose two relation SETS through the algebra's table: every
 *  base relation that can hold across some (r1, r2) pair. */
export function composeSets(
  algebra: RelationAlgebra,
  a: ReadonlySet<string>,
  b: ReadonlySet<string>,
): Set<string> {
  const out = new Set<string>();
  for (const r1 of a) {
    const row = algebra.composition[r1];
    if (!row) continue;
    for (const r2 of b) {
      for (const r of row[r2] ?? []) out.add(r);
    }
  }
  return out;
}

/** The converse of a relation set. */
export function converseSet(algebra: RelationAlgebra, s: ReadonlySet<string>): Set<string> {
  return new Set([...s].map((r) => algebra.converse[r]));
}

/**
 * A constraint network over one algebra: named entities, and for
 * each ordered pair the SET of base relations still possible
 * between them (the universal set when nothing constrains them).
 */
export class ConstraintNetwork {
  readonly algebra: RelationAlgebra;
  private sets = new Map<string, Map<string, Set<string>>>();
  private entitySet = new Set<string>();
  /** The pair whose set emptied in the last failed propagate(). */
  conflict: { a: string; b: string } | undefined;

  constructor(algebra: RelationAlgebra) {
    this.algebra = algebra;
  }

  entities(): string[] {
    return [...this.entitySet];
  }

  private row(a: string): Map<string, Set<string>> {
    let r = this.sets.get(a);
    if (!r) {
      r = new Map();
      this.sets.set(a, r);
    }
    return r;
  }

  /** The current relation set between a and b (universal when
   *  unconstrained; the identity singleton on the diagonal). */
  relation(a: string, b: string): Set<string> {
    if (a === b) return new Set([this.algebra.identity]);
    return new Set(this.row(a).get(b) ?? this.algebra.relations);
  }

  /** Assert a constraint: the a–b set becomes its intersection
   *  with `rels` (and conversely for b–a). Returns false when the
   *  intersection is empty — the assertion contradicts what stands. */
  assert(a: string, rels: Iterable<string>, b: string): boolean {
    this.entitySet.add(a);
    this.entitySet.add(b);
    if (a === b) {
      return new Set(rels).has(this.algebra.identity);
    }
    const next = new Set([...this.relation(a, b)].filter((r) => new Set(rels).has(r)));
    this.row(a).set(b, next);
    this.row(b).set(a, converseSet(this.algebra, next));
    return next.size > 0;
  }

  /**
   * Enforce path consistency to a fixpoint: for every triple
   * (i, k, j), C[i][j] ∩= C[i][k] ∘ C[k][j] (converses kept in
   * step). Returns true when the network is consistent; on false,
   * `conflict` names a pair whose set emptied.
   */
  propagate(): boolean {
    this.conflict = undefined;
    // A directly-asserted pair may already be empty (two assertions
    // that contradict each other with no third entity involved).
    for (const [a, row] of this.sets) {
      for (const [b, set] of row) {
        if (set.size === 0) {
          this.conflict = { a, b };
          return false;
        }
      }
    }
    const ents = this.entities();
    let changed = true;
    while (changed) {
      changed = false;
      for (const i of ents) {
        for (const j of ents) {
          if (i === j) continue;
          for (const k of ents) {
            if (k === i || k === j) continue;
            const via = composeSets(this.algebra, this.relation(i, k), this.relation(k, j));
            const cur = this.relation(i, j);
            const next = new Set([...cur].filter((r) => via.has(r)));
            if (next.size === 0) {
              this.conflict = { a: i, b: j };
              this.row(i).set(j, next);
              this.row(j).set(i, new Set());
              return false;
            }
            if (next.size < cur.size) {
              this.row(i).set(j, next);
              this.row(j).set(i, converseSet(this.algebra, next));
              changed = true;
            }
          }
        }
      }
    }
    return true;
  }
}
