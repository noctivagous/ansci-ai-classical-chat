/**
 * physics.ts — the Physics Unit (Physics P1, 2026-11-20;
 * design note docs/ansci/physics-design-note.md): the
 * Unit's act — simulation as computation — and the records
 * it runs on.
 *
 * THE UNIT, IN ONE PARAGRAPH (§1). The Physics Unit stands
 * in the OKU with two sides: a KNOWLEDGE side (physical
 * laws and material behaviour, held under the testimony
 * discipline — §3) and an ACT: a described scene is
 * assembled into a scene record, stepped by the engine,
 * and the outcome enters as a DERIVED fact (§4) — the
 * provenance kind geography G3 created: a computed fact
 * cites its inputs' provenance and carries none of its
 * own. A simulated tower falling is a derivation about a
 * described scene; it is not an observation about any
 * tower in the world, and every record and reply here
 * keeps that difference visible.
 *
 * THE ENGINE (§2.1, the owner's ruling 2026-11-20).
 * Planck.js — the `planck` npm package, a TypeScript
 * rewrite of the Box2D 2.x engine — in-process, so no
 * test needs the network (§8). The exact artefact this
 * build pins is recorded in PHYSICS_ENGINE below and in
 * the P1 report; the licence of THAT artefact is what
 * enters the record (the pre-1.0 `planck-js` line was
 * zlib; the `planck` line is MIT — verified at install).
 *
 * THE CENTRE OF GRAVITY IS SPECIFICATION (§5). Every
 * interesting failure of the act is a specification
 * failure, so: a scene record is complete before the
 * engine is touched; a stated assumption is an INPUT,
 * marked as an assumption in the record and carried into
 * the derivation; a missing determination DECLINES,
 * located at the body, property, or placement that is
 * missing; and the engine's own fixture defaults are
 * NEVER inherited (§5.3) — a fixture is created from
 * held or assumed values by the one factory below, or
 * the scene does not assemble. That is the single
 * easiest place for the Unit to start believing things
 * nobody told it, and it is closed by name.
 *
 * §3.1 STANDS. The material record's axis determinations
 * (a material's Five Element manifestations, one per
 * axis) live elsewhere and are never restated here as
 * physical properties: what this module holds is the
 * BEHAVIOURAL reading (§3.2) — density, friction,
 * restitution — each entered by banked intake or the
 * owner's authoring, each citable, each with a standing.
 */
import { World, Vec2, Box, Circle, Edge, RevoluteJoint, DistanceJoint } from "planck";
import type { Body, Fixture, Shape } from "planck";
import { CurveStore, type CurveRecord } from "./physics-curves";

/* ---------------- the engine, as pinned (§2.1) ---------------- */

/** The adopted artefact, recorded exactly: package,
 *  version, licence — verified against the installed
 *  package at P1 (the artefact test in
 *  test/ansci-physics-p1.test.ts re-verifies it on every
 *  gate run, so a silent dependency drift fails loudly). */
export const PHYSICS_ENGINE = {
  package: "planck",
  version: "1.5.1",
  licence: "MIT",
  line: "Box2D 2.x solver, TypeScript port (Planck.js)",
} as const;

/* ---------------- provenance (§§3.2, 4.2) ---------------- */

/** One fact's attestation, in the geography register's
 *  discipline, with §3.2's two entry routes for physical
 *  knowledge: banked intake (retrieved, a named attested
 *  source) or the owner's authoring. A derived fact cites
 *  its inputs and carries none of its own (G3, §4.2). */
export type PhysicsProvenance =
  | {
      kind: "retrieved";
      dataset: string;
      uri?: string;
      baseVersion: string;
      retrievedFrom: string;
      confidence: number;
      detail: string;
    }
  | { kind: "owner-authored"; detail: string }
  | { kind: "derived"; detail: string; inputs: string[] };

export function provenanceSummary(p: PhysicsProvenance): string {
  if (p.kind === "derived") return `derived: ${p.detail} (inputs: ${p.inputs.join("; ")})`;
  if (p.kind === "owner-authored") return `owner-authored: ${p.detail}`;
  return `retrieved from ${p.dataset} (${p.baseVersion}; via ${p.retrievedFrom}): ${p.detail}`;
}

/* ---------------- material readings (§3.2) ---------------- */

/** A material's behavioural-physical reading: the
 *  quantities the engine consumes. Friction is the
 *  material's own coefficient; a pair's effective
 *  friction is the engine's mixing law over the two
 *  fixtures (the square root of the product — engine
 *  mechanics, part of the stepping, not a held fact).
 *  `standing` names the intake or authoring record this
 *  standing of the value came from, so a derivation can
 *  say which standing it used (§9 P2's re-derivation
 *  discipline, designed into the record from P1). */
export interface MaterialReading {
  material: string;
  densityKgM3: number;
  friction: number;
  restitution: number;
  provenance: PhysicsProvenance;
  standing: string;
}

const materialKey = (m: string): string => m.trim().toLowerCase();

/** The register of held readings. A reading is held
 *  once, cited everywhere (§3.2's constraint), and never
 *  duplicated into the engine layer as a literal: the
 *  fixture factory below takes the reading itself.
 *  Supersession keeps the old standing in the history —
 *  the value is knowledge, with a knowledge's lifecycle. */
export class MaterialRegister {
  private currentByKey = new Map<string, MaterialReading>();
  private history: MaterialReading[] = [];

  /** Enter a reading (banked intake or owner's
   *  authoring). Replaces the current standing for the
   *  material, if any; the superseded standing stays in
   *  the history. */
  intake(reading: MaterialReading): { superseded?: MaterialReading } {
    const key = materialKey(reading.material);
    const superseded = this.currentByKey.get(key);
    const held: MaterialReading = { ...reading, material: key };
    this.currentByKey.set(key, held);
    this.history.push(held);
    return superseded ? { superseded } : {};
  }

  /** The current standing of a material's reading, or
   *  undefined — a located gap (§3.2), never a zero. */
  readingFor(material: string): MaterialReading | undefined {
    return this.currentByKey.get(materialKey(material));
  }

  /** Every standing ever entered for a material, oldest
   *  first — the audit trail a re-derivation reads. */
  standingsFor(material: string): MaterialReading[] {
    const key = materialKey(material);
    return this.history.filter((r) => r.material === key);
  }

  materials(): string[] {
    return [...this.currentByKey.keys()].sort();
  }
}

export const defaultMaterialRegister = new MaterialRegister();

/** P1's seed readings. Standing, stated plainly: these
 *  are OWNER-AUTHORED PROGRAMME SEED values, entered so
 *  P1's scenes can assemble; they are interim, and P2's
 *  attested intake (§9) is commissioned to supersede
 *  them with values traced to named sources. They are
 *  NOT an attested table and no reply may present them
 *  as one; derivations cite the standing, which says so. */
export const SEED_STANDING = "programme-seed-2026-11-20";
const SEED_PROVENANCE: PhysicsProvenance = {
  kind: "owner-authored",
  detail:
    "Physics P1 programme seed (2026-11-20): interim behavioural values entered by the build so the " +
    "first scenes can assemble, standing until P2's attested intake supersedes them; not an attested table",
};
const SEED_VALUES: Array<[string, number, number, number]> = [
  // material, density kg/m³, friction coefficient, restitution
  ["wood", 600, 0.45, 0.2],
  ["stone", 2500, 0.7, 0.1],
  ["steel", 7850, 0.4, 0.3],
  ["ice", 917, 0.05, 0.1],
];

export function seedMaterialReadings(register: MaterialRegister): void {
  for (const [material, densityKgM3, friction, restitution] of SEED_VALUES) {
    if (!register.readingFor(material)) {
      register.intake({
        material,
        densityKgM3,
        friction,
        restitution,
        provenance: SEED_PROVENANCE,
        standing: SEED_STANDING,
      });
    }
  }
}
seedMaterialReadings(defaultMaterialRegister);

/* ---------------- laws (§3.3) ---------------- */

/** Earth gravity's acceleration, a HELD quantity: the
 *  named default of §5.3 stands on this value, and a
 *  derivation cites it as held, with its standing. */
export const EARTH_GRAVITY = {
  mps2: 9.81,
  provenance: {
    kind: "owner-authored",
    detail: "the conventional standard gravity value, held as the Unit's named default (§§3.3, 5.3)",
  } as PhysicsProvenance,
  standing: "held-law-standard-gravity",
};

/* ---------------- the scene record (§5.1) ---------------- */

export type SceneShape =
  | { kind: "box"; widthM: number; heightM: number }
  | { kind: "circle"; radiusM: number }
  | { kind: "edge"; fromM: { x: number; y: number }; toM: { x: number; y: number } };

/** A body AS DESCRIBED, before assembly: its identity in
 *  the description, shape and dimensions, initial
 *  position (the shape's centre; for an edge, its
 *  midpoint), orientation, motion, and its material BY
 *  NAME — the reading is cited at assembly, not copied
 *  in here. */
export interface SceneBodySpec {
  id: string;
  shape: SceneShape;
  positionM: { x: number; y: number };
  angleDeg?: number;
  motion: "static" | "dynamic";
  material: string;
}

/** A joint AS DESCRIBED (§9 P4 gives it behaviour; the
 *  record carries it from P1 so a scene's statement is
 *  complete). Anchors are local to each body, metres. */
export interface SceneJointSpec {
  kind: "revolute" | "distance";
  bodyA: string;
  bodyB: string;
  anchorAM: { x: number; y: number };
  anchorBM: { x: number; y: number };
}

/** A supplied value the description did not determine,
 *  carried openly (§5.2): what it supplies, the value,
 *  and the ground for supplying it. Assumptions ride
 *  into the derivation record. */
export interface SceneAssumption {
  what: string;
  value: string;
  detail: string;
}

/** A scene AS DESCRIBED — from conversation, from held
 *  knowledge, or mixed (§5.1). Assembly (§5.2) turns it
 *  into a scene record or declines. */
export interface SceneDescription {
  /** The question the scene is assembled to answer —
   *  carried into the derivation record verbatim, so the
   *  record cannot be silently re-read as answering
   *  another (§4.2). */
  question: string;
  bodies: SceneBodySpec[];
  joints?: SceneJointSpec[];
  /** Stated gravity (downward magnitude, m/s²). Absent:
   *  the named default stands (§5.3). Present: the
   *  stated value replaces the default IN THE RECORD. */
  gravityMps2?: number;
  /** The description plainly presupposes ground ("on the
   *  floor", "on the table") — assembly may then supply
   *  a static ground at groundLevelM, RECORDED AS AN
   *  ASSUMPTION (§5.3), never as a silent default:
   *  scenes without ground are meaningful. */
  presupposesGround?: boolean;
  groundLevelM?: number;
  groundMaterial?: string;
  /** The capability the question TURNS ON, where it is
   *  not rigid-body 2D (§6): assembly declines at the
   *  border, naming the capability kind. */
  turnsOn?: "fluid" | "soft-body" | "fracture" | "3d";
  /** A prior scene this one edits (§5.1's lineage): the
   *  edit is stated by the new description; the parent
   *  stands, citable. */
  parentSceneId?: string;
  /** Values the DESCRIBER supplies openly (§5.2) — a
   *  size, an alignment the words leave open and the
   *  question can still be honestly asked with supplied.
   *  Assembly carries them into the record as
   *  assumptions, ahead of its own. */
  suppliedAssumptions?: SceneAssumption[];
}

/** A body AS ASSEMBLED: the description's body with its
 *  material reading CITED (values + standing +
 *  provenance summary) — cited, not copied into the
 *  engine layer as literals (§3.2). */
export interface AssembledBody extends SceneBodySpec {
  reading: {
    material: string;
    densityKgM3: number;
    friction: number;
    restitution: number;
    standing: string;
    provenance: string;
  };
}

export interface SceneRecord {
  id: string;
  question: string;
  bodies: AssembledBody[];
  joints: SceneJointSpec[];
  gravity: { mps2: number; standing: "named default (§5.3)" | "stated in the description" };
  assumptions: SceneAssumption[];
  parentSceneId?: string;
}

export type AssemblyResult =
  | { kind: "assembled"; scene: SceneRecord }
  | {
      kind: "missing-determination";
      location: "material-reading" | "body" | "placement";
      bodyId?: string;
      material?: string;
      detail: string;
    }
  | { kind: "border"; capability: "fluid" | "soft-body" | "fracture" | "3d"; detail: string };

/* ---------------- stepping (§§4.1, 8) ---------------- */

/** The stepping regimen is part of the derivation, not
 *  implementation detail (§4.1): a stated step size, a
 *  FIXED step count (§8), and stated solver iterations. */
export interface SteppingParameters {
  dtSeconds: number;
  steps: number;
  velocityIterations: number;
  positionIterations: number;
}

export const DEFAULT_STEPPING: SteppingParameters = {
  dtSeconds: 1 / 60,
  steps: 300,
  velocityIterations: 8,
  positionIterations: 3,
};

/* ---------------- outcomes and derivations (§4) ---------------- */

export interface BodyOutcome {
  id: string;
  initial: { x: number; y: number; angleDeg: number };
  final: { x: number; y: number; angleDeg: number };
  displacementM: number;
  angleChangeDeg: number;
  atRest: boolean;
}

export interface TrajectoryPoint {
  t: number;
  x: number;
  y: number;
  angleDeg: number;
}

/** The reading rule for the P1 shape family, stated
 *  (§4.1 movement 3 — the outcome is READ off the state
 *  by a stated rule, not intuited): a dynamic body has
 *  FALLEN if it tipped (|angle change| ≥ 30°), slid at
 *  least half its own width sideways, or dropped at
 *  least its own height. A body is UNMOVED if it ends
 *  within 0.05 m and 5° of where it started. A run's
 *  verdict: "falls" if any dynamic body fell; "stands"
 *  if every dynamic body is unmoved; otherwise "moved"
 *  — it shifted without falling, and the reply says so. */
export const FALL_ANGLE_DEG = 30;
export const UNMOVED_DISPLACEMENT_M = 0.05;
export const UNMOVED_ANGLE_DEG = 5;

export type RunVerdict = "stands" | "falls" | "moved";

export interface SimulationRun {
  scene: SceneRecord;
  stepping: SteppingParameters;
  outcomes: BodyOutcome[];
  /** Per dynamic body, the motion sampled every step —
   *  the run's trajectory, from which P3's Form curves
   *  are drawn (§7). */
  trajectories: Record<string, TrajectoryPoint[]>;
  /** The trajectory AS FORM (§7): per dynamic body,
   *  three curves — centre height, LOWEST-POINT height
   *  (the body's underside: the curve a reaches-the-
   *  ground question reads, since a tipped body's
   *  centre never descends to its half height), and
   *  speed — held as Form curve records (physics-curves.ts
   *  — control points under linear interpolation,
   *  domain interval stated, lineage citing this run's
   *  derivation). Motion questions are answered from
   *  these records, never by re-stepping (P3's
   *  acceptance). */
  curves: CurveRecord[];
  verdict: RunVerdict;
  verdictDetail: string;
  /** The outcome's provenance: the derived kind (§4.2),
   *  citing the scene as described, the held properties
   *  used, the engine and its stepping, and the
   *  question. */
  derivation: PhysicsProvenance & { kind: "derived" };
}

/* ---------------- the fixture factory (§5.3) ---------------- */

function shapeOf(spec: SceneBodySpec): Shape {
  const shape = spec.shape;
  switch (shape.kind) {
    case "box":
      return new Box(shape.widthM / 2, shape.heightM / 2);
    case "circle":
      return new Circle(shape.radiusM);
    case "edge":
      // The record states an edge's endpoints in SCENE
      // coordinates; the engine's shapes are LOCAL to
      // the body. The factory converts — endpoints
      // minus the body's stated position. (P4 found
      // this: P1's only edge was the ground at level 0
      // with its body at the origin, where the two
      // frames coincide and the omission was invisible;
      // the slope's raised, offset edge exposed it.)
      return new Edge(
        new Vec2(shape.fromM.x - spec.positionM.x, shape.fromM.y - spec.positionM.y),
        new Vec2(shape.toM.x - spec.positionM.x, shape.toM.y - spec.positionM.y),
      );
  }
}

/** THE fixture factory — the only place a fixture is
 *  created in this Unit (§5.3). Every fixture is created
 *  from a held reading's values, all three quantities
 *  stated explicitly: density, friction, restitution.
 *  The engine's own fixture defaults are never
 *  inherited, because this factory has no path that
 *  omits a value. The P1 fixture audit inspects the
 *  fixtures this factory produces and compares them,
 *  value by value, against the readings. */
export function createFixtureFromReading(
  body: Body,
  spec: SceneBodySpec,
  values: { densityKgM3: number; friction: number; restitution: number },
): Fixture {
  return body.createFixture({
    shape: shapeOf(spec),
    density: values.densityKgM3,
    friction: values.friction,
    restitution: values.restitution,
  });
}

/** A stated anchor's position in the scene's initial
 *  state: the body's stated position plus its stated
 *  local anchor, rotated by the body's stated angle.
 *  Used for a distance joint's length (§9 P4) — computed
 *  from the record, so the length is the record's, not
 *  a separate invention. */
function worldAnchorOf(spec: SceneBodySpec, anchorM: { x: number; y: number }): { x: number; y: number } {
  const rad = ((spec.angleDeg ?? 0) * Math.PI) / 180;
  return {
    x: spec.positionM.x + anchorM.x * Math.cos(rad) - anchorM.y * Math.sin(rad),
    y: spec.positionM.y + anchorM.x * Math.sin(rad) + anchorM.y * Math.cos(rad),
  };
}

/* ---------------- the lab ---------------- */

/** A Physics lab: a material register, a scene counter,
 *  and a step counter. The step counter is the audit
 *  instrument of §7/P3: a question answered from a held
 *  curve or a prior derivation must not move it. Tests
 *  build fresh labs; the turn wrapper uses the default. */
export class PhysicsLab {
  readonly materials: MaterialRegister;
  /** Physics' store of held trajectory curves
   *  (physics-curves.ts): the runs' trajectory curves
   *  are held in it (§7). */
  readonly curves = new CurveStore();
  /** The lab's most recent run — the record a motion
   *  question reads (§7). Process-level, like the
   *  geography register: flagged in the P3 report. */
  lastRun?: SimulationRun;
  private sceneCounter = 0;
  private stepsTaken = 0;

  constructor(materials: MaterialRegister = new MaterialRegister()) {
    this.materials = materials;
  }

  /** Total engine steps this lab has run. */
  stepCount(): number {
    return this.stepsTaken;
  }

  /** Assembly (§5): description → scene record, or a
   *  located decline. Assembly touches no engine: a
   *  scene that does not assemble is never charged a
   *  step (§7). */
  assemble(description: SceneDescription): AssemblyResult {
    if (description.turnsOn) {
      return {
        kind: "border",
        capability: description.turnsOn,
        detail:
          `the question turns on the ${description.turnsOn} capability, which is outside the Unit's ` +
          `2D rigid-body scope (§6); the scene was not assembled and the engine was not run`,
      };
    }
    const bodies: AssembledBody[] = [];
    for (const spec of description.bodies) {
      const reading = this.materials.readingFor(spec.material);
      if (!reading) {
        return {
          kind: "missing-determination",
          location: "material-reading",
          bodyId: spec.id,
          material: spec.material,
          detail:
            `no held behavioural reading (density, friction, restitution) stands for the material ` +
            `'${spec.material}' of body '${spec.id}': a simulation run on invented values would cite ` +
            `an invention as an input (§§3.2, 5.2)`,
        };
      }
      bodies.push({
        ...spec,
        reading: {
          material: reading.material,
          densityKgM3: reading.densityKgM3,
          friction: reading.friction,
          restitution: reading.restitution,
          standing: reading.standing,
          provenance: provenanceSummary(reading.provenance),
        },
      });
    }
    const ids = new Set(bodies.map((b) => b.id));
    for (const joint of description.joints ?? []) {
      for (const end of [joint.bodyA, joint.bodyB]) {
        if (!ids.has(end)) {
          return {
            kind: "missing-determination",
            location: "body",
            bodyId: end,
            detail: `a stated ${joint.kind} joint names body '${end}', which the description does not place (§5.2)`,
          };
        }
      }
    }

    const assumptions: SceneAssumption[] = [...(description.suppliedAssumptions ?? [])];
    const assembled: AssembledBody[] = [...bodies];
    if (description.presupposesGround) {
      const groundMaterial = description.groundMaterial ?? "stone";
      const reading = this.materials.readingFor(groundMaterial);
      if (!reading) {
        return {
          kind: "missing-determination",
          location: "material-reading",
          bodyId: "ground",
          material: groundMaterial,
          detail:
            `the description presupposes ground of '${groundMaterial}', for which no held behavioural ` +
            `reading stands (§§3.2, 5.2)`,
        };
      }
      const level = description.groundLevelM ?? 0;
      assembled.push({
        id: "ground",
        shape: { kind: "edge", fromM: { x: -20, y: level }, toM: { x: 20, y: level } },
        positionM: { x: 0, y: level },
        motion: "static",
        material: groundMaterial,
        reading: {
          material: reading.material,
          densityKgM3: reading.densityKgM3,
          friction: reading.friction,
          restitution: reading.restitution,
          standing: reading.standing,
          provenance: provenanceSummary(reading.provenance),
        },
      });
      assumptions.push({
        what: "the ground plane",
        value: `a static ground at ${level} m, of ${groundMaterial}`,
        detail:
          "the description plainly presupposes ground; assembly supplies it RECORDED AS AN ASSUMPTION " +
          "under §5.3 — not a silent default, because scenes without ground are meaningful and the " +
          "difference decides outcomes",
      });
    }

    this.sceneCounter += 1;
    const scene: SceneRecord = {
      id: `scene-${this.sceneCounter}`,
      question: description.question,
      bodies: assembled,
      joints: description.joints ?? [],
      gravity:
        description.gravityMps2 !== undefined
          ? { mps2: description.gravityMps2, standing: "stated in the description" }
          : { mps2: EARTH_GRAVITY.mps2, standing: "named default (§5.3)" },
      assumptions,
      ...(description.parentSceneId ? { parentSceneId: description.parentSceneId } : {}),
    };
    return { kind: "assembled", scene };
  }

  /** Build the engine world for a scene record WITHOUT
   *  stepping — the fixture audit's instrument (P1
   *  acceptance, §5.3): every fixture in the returned
   *  world was created by the one factory, from the
   *  scene's cited readings. */
  buildWorld(scene: SceneRecord): { world: World; bodies: Map<string, Body> } {
    const world = new World({ gravity: new Vec2(0, -scene.gravity.mps2) });
    const bodies = new Map<string, Body>();
    for (const spec of scene.bodies) {
      const body = world.createBody({
        type: spec.motion,
        position: new Vec2(spec.positionM.x, spec.positionM.y),
        angle: ((spec.angleDeg ?? 0) * Math.PI) / 180,
      });
      createFixtureFromReading(body, spec, spec.reading);
      bodies.set(spec.id, body);
    }
    // Stated joints get behaviour (§9 P4): the record
    // carried them from P1; here they are instantiated
    // in the world, exactly as stated — kind, bodies,
    // anchors. A distance joint's length is not a
    // separate stated value: it is the distance between
    // the two stated anchors in the scene's initial
    // state, computed from the record, and the
    // derivation cites it. Connected bodies do not
    // collide with each other (the joint's own
    // statement: a hinge's two sides share the pin).
    for (const joint of scene.joints) {
      const bodyA = bodies.get(joint.bodyA)!;
      const bodyB = bodies.get(joint.bodyB)!;
      const localAnchorA = new Vec2(joint.anchorAM.x, joint.anchorAM.y);
      const localAnchorB = new Vec2(joint.anchorBM.x, joint.anchorBM.y);
      if (joint.kind === "revolute") {
        world.createJoint(
          new RevoluteJoint({ bodyA, bodyB, localAnchorA, localAnchorB, collideConnected: false }),
        );
      } else {
        const specA = scene.bodies.find((b) => b.id === joint.bodyA)!;
        const specB = scene.bodies.find((b) => b.id === joint.bodyB)!;
        const wa = worldAnchorOf(specA, joint.anchorAM);
        const wb = worldAnchorOf(specB, joint.anchorBM);
        world.createJoint(
          new DistanceJoint({
            bodyA,
            bodyB,
            localAnchorA,
            localAnchorB,
            length: Math.hypot(wa.x - wb.x, wa.y - wb.y),
            collideConnected: false,
          }),
        );
      }
    }
    return { world, bodies };
  }

  /** Stepping (§4.1 movements 2–4): instantiate, advance
   *  the FIXED step count, read the outcome by the
   *  stated rule, and enter it as a derived fact. The
   *  same scene record, readings, engine and stepping
   *  give the same outcome (§4.3) — the engine is
   *  deterministic for a fixed regimen. */
  simulate(scene: SceneRecord, stepping: SteppingParameters = DEFAULT_STEPPING): SimulationRun {
    const { world, bodies } = this.buildWorld(scene);
    const initial = new Map<string, { x: number; y: number; angleDeg: number }>();
    const trajectories: Record<string, TrajectoryPoint[]> = {};
    for (const spec of scene.bodies) {
      if (spec.motion !== "dynamic") continue;
      const p = bodies.get(spec.id)!.getPosition();
      initial.set(spec.id, { x: p.x, y: p.y, angleDeg: (bodies.get(spec.id)!.getAngle() * 180) / Math.PI });
      trajectories[spec.id] = [{ t: 0, x: p.x, y: p.y, angleDeg: (bodies.get(spec.id)!.getAngle() * 180) / Math.PI }];
    }
    for (let i = 0; i < stepping.steps; i++) {
      world.step(stepping.dtSeconds, stepping.velocityIterations, stepping.positionIterations);
      this.stepsTaken += 1;
      const t = (i + 1) * stepping.dtSeconds;
      for (const spec of scene.bodies) {
        if (spec.motion !== "dynamic") continue;
        const body = bodies.get(spec.id)!;
        const p = body.getPosition();
        trajectories[spec.id].push({ t, x: p.x, y: p.y, angleDeg: (body.getAngle() * 180) / Math.PI });
      }
    }
    const outcomes: BodyOutcome[] = [];
    for (const spec of scene.bodies) {
      if (spec.motion !== "dynamic") continue;
      const body = bodies.get(spec.id)!;
      const p = body.getPosition();
      const start = initial.get(spec.id)!;
      const final = { x: p.x, y: p.y, angleDeg: (body.getAngle() * 180) / Math.PI };
      const v = body.getLinearVelocity();
      outcomes.push({
        id: spec.id,
        initial: start,
        final,
        displacementM: Math.hypot(final.x - start.x, final.y - start.y),
        angleChangeDeg: Math.abs(final.angleDeg - start.angleDeg),
        atRest: Math.hypot(v.x, v.y) < 0.01,
      });
    }
    const heightOf = (spec: SceneBodySpec): number =>
      spec.shape.kind === "box" ? spec.shape.heightM : spec.shape.kind === "circle" ? 2 * spec.shape.radiusM : 0;
    const widthOf = (spec: SceneBodySpec): number =>
      spec.shape.kind === "box" ? spec.shape.widthM : spec.shape.kind === "circle" ? 2 * spec.shape.radiusM : 0;
    const fallen = outcomes.filter((o) => {
      const spec = scene.bodies.find((b) => b.id === o.id)!;
      return (
        o.angleChangeDeg >= FALL_ANGLE_DEG ||
        Math.abs(o.final.x - o.initial.x) >= widthOf(spec) / 2 ||
        o.initial.y - o.final.y >= heightOf(spec)
      );
    });
    const unmoved = outcomes.every(
      (o) => o.displacementM < UNMOVED_DISPLACEMENT_M && o.angleChangeDeg < UNMOVED_ANGLE_DEG,
    );
    const verdict: RunVerdict = fallen.length > 0 ? "falls" : unmoved ? "stands" : "moved";
    const verdictDetail =
      verdict === "falls"
        ? `fallen: ${fallen.map((o) => o.id).join(", ")} (by the stated reading rule: tip ≥ ${FALL_ANGLE_DEG}°, ` +
          `sideways slide ≥ half the body's width, or drop ≥ its own height)`
        : verdict === "stands"
          ? `every dynamic body ends within ${UNMOVED_DISPLACEMENT_M} m and ${UNMOVED_ANGLE_DEG}° of where it started`
          : "no dynamic body fell by the stated rule, and at least one moved beyond the unmoved thresholds";

    const readingCitations = new Map<string, string>();
    for (const b of scene.bodies) {
      const r = b.reading;
      readingCitations.set(
        r.material,
        `material reading '${r.material}': density ${r.densityKgM3} kg/m³, friction ${r.friction}, ` +
          `restitution ${r.restitution} (standing ${r.standing}; ${r.provenance})`,
      );
    }
    const assumptionInputs = scene.assumptions.map((a) => `assumption — ${a.what}: ${a.value} (${a.detail})`);
    const jointInputs = scene.joints.map(
      (j) =>
        `joint — ${j.kind} between '${j.bodyA}' and '${j.bodyB}' (anchors (${j.anchorAM.x}, ${j.anchorAM.y}) ` +
        `and (${j.anchorBM.x}, ${j.anchorBM.y}), local to each body)`,
    );
    const derivation: SimulationRun["derivation"] = {
      kind: "derived",
      detail:
        `computed by Planck (planck ${PHYSICS_ENGINE.version}, ${PHYSICS_ENGINE.licence}; ${PHYSICS_ENGINE.line}) ` +
        `from the scene as described — a derivation about the described scene, not an observation of any real arrangement`,
      inputs: [
        `scene '${scene.id}': ${scene.bodies.length} bodies (${scene.bodies.map((b) => b.id).join(", ")}), ` +
          `gravity ${scene.gravity.mps2} m/s² downward (${scene.gravity.standing})` +
          (scene.parentSceneId ? `, edited from prior scene '${scene.parentSceneId}'` : ""),
        ...readingCitations.values(),
        ...assumptionInputs,
        ...jointInputs,
        `engine: planck ${PHYSICS_ENGINE.version} (${PHYSICS_ENGINE.licence}), step ${stepping.dtSeconds}s × ` +
          `${stepping.steps} steps, velocityIterations ${stepping.velocityIterations}, ` +
          `positionIterations ${stepping.positionIterations}`,
        `question: ${scene.question}`,
      ],
    };

    // §7: the trajectory AS FORM. Per dynamic body, two
    // curve records — centre height over time, and speed
    // over time (finite differences of the sampled
    // positions, the method stated in the record) — held
    // in Form's register with lineage citing this run.
    // A motion question reads these; it never re-steps.
    const curves: CurveRecord[] = [];
    for (const spec of scene.bodies) {
      if (spec.motion !== "dynamic") continue;
      const points = trajectories[spec.id];
      const span: [number, number] = [0, stepping.steps * stepping.dtSeconds];
      const provenance =
        `the sampled trajectory of '${spec.id}' in scene '${scene.id}', from the run that answered ` +
        `"${scene.question}" — held as control points under linear interpolation (Form §3.1); ` +
        `the run's derivation stands as this curve's parent record`;
      const height: CurveRecord = {
        id: `${scene.id}:${spec.id}:height`,
        heldForm: "control-points",
        domain: "time (s)",
        range: "centre height (m)",
        points: points.map((p) => ({ x: p.t, y: p.y })),
        interpolation: "linear",
        domainInterval: span,
        parent: { kind: "derivation", ref: scene.id },
        provenance,
      };
      const speedPoints = points.slice(1).map((p, i) => {
        const prev = points[i];
        const dt = p.t - prev.t;
        return { x: p.t, y: dt > 0 ? Math.hypot(p.x - prev.x, p.y - prev.y) / dt : 0 };
      });
      const speed: CurveRecord = {
        id: `${scene.id}:${spec.id}:speed`,
        heldForm: "control-points",
        domain: "time (s)",
        range: "speed (m/s), by finite difference of the sampled positions",
        points: speedPoints,
        interpolation: "linear",
        domainInterval: [speedPoints[0]?.x ?? 0, span[1]],
        parent: { kind: "derivation", ref: scene.id },
        provenance,
      };
      // The body's underside over time: centre height
      // minus the vertical extent at the sampled angle
      // (for a box, (h/2)|cos θ| + (w/2)|sin θ|; for a
      // circle, the radius). A tipped block's centre
      // never reaches its half height — its underside
      // reaches the ground, and that is the event a
      // when-does-it-reach-the-ground question asks for.
      const lowestOf = (p: TrajectoryPoint): number => {
        if (spec.shape.kind === "circle") return p.y - spec.shape.radiusM;
        if (spec.shape.kind === "box") {
          const rad = (p.angleDeg * Math.PI) / 180;
          return (
            p.y -
            (Math.abs(Math.cos(rad)) * spec.shape.heightM) / 2 -
            (Math.abs(Math.sin(rad)) * spec.shape.widthM) / 2
          );
        }
        return p.y;
      };
      const lowest: CurveRecord = {
        id: `${scene.id}:${spec.id}:lowest`,
        heldForm: "control-points",
        domain: "time (s)",
        range: "lowest-point height (m) — the body's underside",
        points: points.map((p) => ({ x: p.t, y: lowestOf(p) })),
        interpolation: "linear",
        domainInterval: span,
        parent: { kind: "derivation", ref: scene.id },
        provenance,
      };
      curves.push(height, speed, lowest);
      this.curves.hold(height);
      this.curves.hold(speed);
      this.curves.hold(lowest);
    }

    const run: SimulationRun = { scene, stepping, outcomes, trajectories, curves, verdict, verdictDetail, derivation };
    this.lastRun = run;
    return run;
  }
}

export const defaultPhysicsLab = new PhysicsLab(defaultMaterialRegister);
