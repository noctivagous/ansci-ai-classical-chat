/**
 * physics-turn.ts — the physics wrapper (Physics P1,
 * 2026-11-20; design note docs/ansci/physics-design-note.md
 * §§4–5, §9 P1): the seam around the synchronous turn for
 * the Physics Unit's first question shape, on the
 * geography/weather wrappers' division of work.
 *
 * processTurn is synchronous and stays so; the wrapper
 * detects its shape in the surface text, runs the
 * ordinary turn (for the record and the trace), and then
 * does the Unit's work: assemble the described scene
 * (physics.ts), step it, and answer as a DERIVED fact —
 * the reply names the computation as the computation
 * (§4.2), never letting a simulated outcome wear
 * testimony's grammar.
 *
 * THE SHAPE, AND ITS STATED LIMIT (§10 Q1). P1 assumes
 * the simplest descriptions: a stack of N blocks of one
 * named material, in the two determined forms —
 *   "will the stack of three wood blocks fall?"
 *   "will the stack of three wood blocks with the top
 *    block half off fall?"
 * (and the does-it-stand mirror). The description gives
 * no block size and no floor: assembly supplies a 0.30 m
 * cube and a stone floor, EACH RECORDED AS AN ASSUMPTION
 * in the scene record (§5.2) and carried into the
 * derivation. The aligned stack's standing does not turn
 * on the block size; the half-off fall turns on the
 * offset FRACTION — half a block width — which the words
 * state, not on the assumed absolute size. Anything
 * richer in words is a shapes programme of its own
 * (§10 Q1), not this slice's to improvise.
 *
 * A scene that cannot assemble answers with the located
 * decline (§5.2): the missing material reading names the
 * material and the body that needed it, and no step is
 * ever charged for a scene that did not assemble (§7).
 *
 * P4 (2026-11-20) adds the SLOPE family (§6's reach /
 * roll-to / slide-off kinds) and the conversational
 * BORDER shapes (§6: float → the fluid capability;
 * a cube on its corner → the 3D capability), each
 * declining located at its border. Stated joints get
 * their behaviour in physics.ts (§9 P4).
 *
 * P3 (2026-11-20) adds the MOTION shapes (§7): questions
 * about a trajectory already simulated in this
 * conversation — "when does the top block reach the
 * ground?", "how fast is the top block moving after two
 * seconds?" — answered from the run's held Form curves
 * (physics-curves.ts), never by re-stepping: the lab's step
 * counter does not move on this path, and the gated
 * tests pin that. With no run standing, the shape
 * declines at the missing trajectory; past the curve's
 * stated domain interval, it declines at the interval —
 * a curve is not extrapolated (§3.1 of the Form note).
 */
import { processTurn, type TurnResult } from "./turn";
import type { Session } from "./session";
import {
  PhysicsLab,
  defaultMaterialRegister,
  defaultPhysicsLab,
  type SceneDescription,
} from "./physics";
import { ensureAttestedReadings } from "./physics-materials";
import { firstCrossing, valueAt } from "./physics-curves";

// The default register carries P2's attested intake
// (§3.2): the seed standings stand only in labs that
// seed them deliberately (the P1 tests), never on the
// conversational path.
ensureAttestedReadings(defaultMaterialRegister);

export interface PhysicsTurnOptions {
  lab?: PhysicsLab;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
};

function countOf(word: string): number | undefined {
  if (/^\d+$/.test(word)) return parseInt(word, 10);
  return NUMBER_WORDS[word];
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[?.!,;]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type PhysicsQuestion = {
  kind: "stack-fate";
  count: number;
  material: string;
  topHalfOff: boolean;
  asked: "fall" | "stand";
};

/** The P1 shape family (§9): the will-it-fall /
 *  does-it-stand class over the simplest described
 *  scene. Returns undefined for anything else — the
 *  wrapper then passes the turn through untouched. */
export function detectPhysicsQuestion(text: string): PhysicsQuestion | undefined {
  const t = normalise(text);
  const m =
    /^will the stack of (\w+) (\w+) blocks( with the top block half off)? fall$/.exec(t) ??
    /^will a stack of (\w+) (\w+) blocks( with the top block half off)? fall$/.exec(t);
  const s =
    /^does the stack of (\w+) (\w+) blocks( with the top block half off)? stand$/.exec(t) ??
    /^does a stack of (\w+) (\w+) blocks( with the top block half off)? stand$/.exec(t);
  const hit = m ?? s;
  if (!hit) return undefined;
  const count = countOf(hit[1]);
  if (!count || count < 1 || count > 20) return undefined;
  return {
    kind: "stack-fate",
    count,
    material: hit[2],
    topHalfOff: Boolean(hit[3]),
    asked: m ? "fall" : "stand",
  };
}

/** The described scene for the stack shape. The block
 *  size and the floor are SUPPLIED values, recorded as
 *  assumptions at assembly (§5.2): the record states
 *  them, the derivation cites them. */
export function stackDescription(q: PhysicsQuestion, questionText: string): SceneDescription {
  const SIZE = 0.3;
  const bodies: SceneDescription["bodies"] = [];
  for (let i = 0; i < q.count; i++) {
    const isTop = i === q.count - 1;
    bodies.push({
      id: q.count === 1 ? "the block" : i === 0 ? "the bottom block" : isTop ? "the top block" : `block ${i + 1}`,
      shape: { kind: "box", widthM: SIZE, heightM: SIZE },
      positionM: { x: q.topHalfOff && isTop ? SIZE / 2 : 0, y: SIZE / 2 + i * SIZE },
      motion: "dynamic",
      material: q.material,
    });
  }
  return {
    question: questionText.trim(),
    bodies,
    presupposesGround: true,
    groundLevelM: 0,
    groundMaterial: "stone",
    suppliedAssumptions: STACK_ASSUMPTIONS,
  };
}

const STACK_ASSUMPTIONS = [
  {
    what: "the blocks' size",
    value: "0.30 m cubes",
    detail:
      "the description gives no size; a 0.30 m cube is supplied and marked — the aligned stack's " +
      "standing does not turn on the size, and the half-off fall turns on the offset fraction " +
      "(half a block width), which the words state, not on the absolute size (§5.2)",
  },
  {
    what: "the blocks' alignment",
    value: "centred, each block directly over the one below (the top block offset by half its width in the half-off form)",
    detail: "the description's 'stack' determines the alignment; the half-off form states its own offset (§5.1)",
  },
];

/** The stated contact band of the when-reach reading
 *  rule (see the motion branch): a resting body's
 *  geometric underside settles 0.011–0.015 m above the
 *  floor line in this engine's stepping, so the ground
 *  reads as reached within 0.02 m of it. */
export const GROUND_CONTACT_BAND_M = 0.02;

export type MotionQuestion = {
  kind: "motion";
  ask: "when-reach-ground" | "speed-at";
  bodyRef: "top" | "bottom" | "the";
  seconds?: number;
};

function secondsOf(word: string): number | undefined {
  if (/^\d+(\.\d+)?$/.test(word)) return parseFloat(word);
  return NUMBER_WORDS[word];
}

/** The P3 motion shapes (§7): questions about a
 *  trajectory, answered from the held curves of a run
 *  that already stands. Detection only — with no run
 *  standing the wrapper declines at the missing
 *  trajectory rather than simulating unasked. */
export function detectMotionQuestion(text: string): MotionQuestion | undefined {
  const t = normalise(text);
  const reach =
    /^when does the (top|bottom) block reach the ground$/.exec(t) ??
    /^when does the block reach the ground$/.exec(t);
  if (reach) {
    return { kind: "motion", ask: "when-reach-ground", bodyRef: (reach[1] as "top" | "bottom") ?? "the" };
  }
  const speedTop = /^how fast is the (top|bottom) block moving after ([\w.]+) seconds?$/.exec(t);
  if (speedTop) {
    const seconds = secondsOf(speedTop[2]);
    if (seconds === undefined) return undefined;
    return { kind: "motion", ask: "speed-at", bodyRef: speedTop[1] as "top" | "bottom", seconds };
  }
  const speedPlain = /^how fast is the block moving after ([\w.]+) seconds?$/.exec(t);
  if (speedPlain) {
    const seconds = secondsOf(speedPlain[1]);
    if (seconds === undefined) return undefined;
    return { kind: "motion", ask: "speed-at", bodyRef: "the", seconds };
  }
  return undefined;
}

export type SlopeQuestion = {
  kind: "slope";
  ask: "roll-to" | "roll-off" | "slide-off";
  mover: "ball" | "block";
  material: string;
  angleDeg: number;
};

/** The P4 slope family (§9 P4; §6's reach / roll-to /
 *  slide-off kinds): a mover placed at the top of a
 *  stated slope. The words determine the mover, its
 *  material, and the slope's angle in degrees; the
 *  slope's length, its foot's height, its material and
 *  the mover's size are SUPPLIED, recorded as
 *  assumptions at assembly (§5.2) — the same discipline
 *  as P1's block size. Angles outside 5–60 degrees are
 *  not this shape. */
export function detectSlopeQuestion(text: string): SlopeQuestion | undefined {
  const t = normalise(text);
  const angle = (word: string): number | undefined => {
    const n = parseInt(word, 10);
    return n >= 5 && n <= 60 ? n : undefined;
  };
  const rollTo = /^will the (\w+) ball roll to the bottom of the (\d+)(?:-degree| degree|°) slope$/.exec(t);
  if (rollTo && angle(rollTo[2]) !== undefined) {
    return { kind: "slope", ask: "roll-to", mover: "ball", material: rollTo[1], angleDeg: angle(rollTo[2])! };
  }
  const rollOff = /^will the (\w+) ball roll off the (\d+)(?:-degree| degree|°) slope$/.exec(t);
  if (rollOff && angle(rollOff[2]) !== undefined) {
    return { kind: "slope", ask: "roll-off", mover: "ball", material: rollOff[1], angleDeg: angle(rollOff[2])! };
  }
  const slideOff = /^will the (\w+) block slide off the (\d+)(?:-degree| degree|°) slope$/.exec(t);
  if (slideOff && angle(slideOff[2]) !== undefined) {
    return { kind: "slope", ask: "slide-off", mover: "block", material: slideOff[1], angleDeg: angle(slideOff[2])! };
  }
  return undefined;
}

export const SLOPE_LENGTH_M = 2.0;
export const SLOPE_FOOT_HEIGHT_M = 0.8;

export interface SlopeGeometry {
  top: { x: number; y: number };
  foot: { x: number; y: number };
  dir: { x: number; y: number };
  normal: { x: number; y: number };
  lengthM: number;
}

export function slopeGeometry(angleDeg: number): SlopeGeometry {
  const rad = (angleDeg * Math.PI) / 180;
  const dir = { x: Math.cos(rad), y: -Math.sin(rad) };
  const foot = { x: 0, y: SLOPE_FOOT_HEIGHT_M };
  const top = { x: foot.x - dir.x * SLOPE_LENGTH_M, y: foot.y - dir.y * SLOPE_LENGTH_M };
  return { top, foot, dir, normal: { x: Math.sin(rad), y: Math.cos(rad) }, lengthM: SLOPE_LENGTH_M };
}

const SLOPE_ASSUMPTIONS = [
  {
    what: "the slope's length and foot height",
    value: `${SLOPE_LENGTH_M} m long, its foot ${SLOPE_FOOT_HEIGHT_M} m above the ground`,
    detail:
      "the description states the angle, which decides whether the mover goes; the length and the " +
      "foot's height are supplied and marked — within any ordinary range they do not change the " +
      "answer's kind (§5.2)",
  },
  {
    what: "the slope's material",
    value: "stone",
    detail: "the description does not name the slope's material; stone is supplied and marked (§5.2)",
  },
  {
    what: "the mover's size and placement",
    value: "a ball of 0.15 m radius / a block of 0.30 m, placed at rest at the slope's top, resting on its surface",
    detail: "the description gives no size and no push; the mover starts at rest at the top (§5.2)",
  },
];

/** The described scene for the slope family. */
export function slopeDescription(q: SlopeQuestion, questionText: string): SceneDescription {
  const g = slopeGeometry(q.angleDeg);
  const mover =
    q.mover === "ball"
      ? {
          id: "the ball",
          shape: { kind: "circle", radiusM: 0.15 } as const,
          positionM: { x: g.top.x + g.normal.x * 0.151, y: g.top.y + g.normal.y * 0.151 },
          motion: "dynamic" as const,
          material: q.material,
        }
      : {
          id: "the block",
          shape: { kind: "box", widthM: 0.3, heightM: 0.3 } as const,
          positionM: { x: g.top.x + g.normal.x * 0.151, y: g.top.y + g.normal.y * 0.151 },
          angleDeg: -q.angleDeg,
          motion: "dynamic" as const,
          material: q.material,
        };
  return {
    question: questionText.trim(),
    bodies: [
      {
        id: "the slope",
        shape: { kind: "edge", fromM: g.top, toM: g.foot },
        positionM: { x: (g.top.x + g.foot.x) / 2, y: (g.top.y + g.foot.y) / 2 },
        motion: "static",
        material: "stone",
      },
      mover,
    ],
    presupposesGround: true,
    groundLevelM: 0,
    groundMaterial: "stone",
    suppliedAssumptions: SLOPE_ASSUMPTIONS,
  };
}

export type BorderQuestion = {
  kind: "border";
  capability: "fluid" | "3d";
  material: string;
  form: "float" | "corner-balance";
};

/** The conversational border shapes (§6): questions
 *  whose outcome TURNS ON a capability outside the
 *  Unit's scope. "Will it float" turns on buoyancy in
 *  a fluid; a cube balancing on its CORNER is a
 *  determination in three dimensions (a two-dimensional
 *  scene's cube has edges, not corners). Both are
 *  detected so the turn can decline LOCATED at the
 *  border — naming the capability — rather than fall
 *  through to a generic inability. */
export function detectBorderQuestion(text: string): BorderQuestion | undefined {
  const t = normalise(text);
  const float =
    /^will the (\w+) (block|ball) float(?: in water)?$/.exec(t) ?? /^does the (\w+) (block|ball) float$/.exec(t);
  if (float) return { kind: "border", capability: "fluid", material: float[1], form: "float" };
  const corner =
    /^will the (\w+) cube balance on its corner$/.exec(t) ?? /^does the (\w+) cube balance on its corner$/.exec(t);
  if (corner) return { kind: "border", capability: "3d", material: corner[1], form: "corner-balance" };
  return undefined;
}

export function processTurnWithPhysics(
  session: Session,
  text: string,
  opts: PhysicsTurnOptions = {},
): TurnResult {
  const question = detectPhysicsQuestion(text);
  const motion = question ? undefined : detectMotionQuestion(text);
  const slope = !question && !motion ? detectSlopeQuestion(text) : undefined;
  const border = !question && !motion && !slope ? detectBorderQuestion(text) : undefined;
  if (!question && !motion && !slope && !border) return processTurn(session, text);

  const result = processTurn(session, text);
  const priorDecline = result.trace.declineReason;
  const lab = opts.lab ?? defaultPhysicsLab;

  const finish = (
    action: NonNullable<TurnResult["trace"]["physics"]>["action"],
    reply: string,
    detail: string,
    declineReason?: string,
  ): TurnResult => {
    result.trace.physics = {
      action,
      shape: question ? question.kind : motion ? "motion" : slope ? "slope" : "border",
      detail,
      ...(priorDecline ? { priorDecline } : {}),
    };
    if (declineReason) {
      result.trace.declineReason = declineReason;
      result.trace.planNote =
        "physics wrapper (Physics P1): the turn's own outcome was replaced by the Physics Unit's " +
        "located decline — the gap stated at the location the simulation would have consumed it (§5.2)";
    }
    return { reply, trace: result.trace };
  };

  if (motion) {
    // §7 / P3: read the held curves of the run that
    // stands. This path never calls simulate — the
    // step counter is the audit, and the tests pin it.
    const run = lab.lastRun;
    if (!run) {
      // DRAFT wording — the owner's to settle.
      return finish(
        "missing-determination",
        `I can't say yet: no simulated trajectory stands in this conversation for me to read. ` +
          `Ask me first whether a stack stands or falls, and I can read its motion from that run's record.`,
        "motion question declined: no simulation run stands in this lab (Physics P3)",
        "the question asks about a body's motion, and motion is read from a held trajectory curve; " +
          "no run stands yet — the gap is located at the missing trajectory (§7)",
      );
    }
    const dynamic = run.scene.bodies.filter((b) => b.motion === "dynamic");
    const spec =
      motion.bodyRef === "bottom" ? dynamic[0] : dynamic[dynamic.length - 1];
    const curveKind = motion.ask === "when-reach-ground" ? "lowest" : "speed";
    const curve = lab.curves.answerable(`${run.scene.id}:${spec.id}:${curveKind}`);
    if (!curve) {
      return finish(
        "missing-determination",
        `I can't say: the trajectory record for ${spec.id} is not held in a form I can answer from.`,
        `motion question declined: curve '${run.scene.id}:${spec.id}:${curveKind}' absent or its lineage broken (Physics P3)`,
        `the held curve for ${spec.id} is missing or its lineage does not audit back to the run — ` +
          `a broken lineage is a located gap, not a quiet repair (Form §3.3)`,
      );
    }
    const fmt = (n: number): string => String(Math.round(n * 100) / 100);
    if (motion.ask === "when-reach-ground") {
      // The curve is the body's LOWEST point: a tipped
      // block's centre never descends to its half
      // height, but its underside reaches the ground,
      // and the underside's arrival is the event asked
      // for. The reading rule carries a stated CONTACT
      // BAND, as P1's verdict rule carries its stated
      // thresholds: in this engine a body resting on
      // the floor settles with its geometric underside
      // 0.011–0.015 m above the floor line (the contact
      // skin and slop of the stepping — measured across
      // the stack scenes at build time, and recorded in
      // the P3 report), so "reaches the ground" is read
      // as the underside entering a 0.02 m band above
      // the ground's height. A body that merely hovers
      // or wedges above the band does not read as
      // reached, and the trace states the band.
      const ground = run.scene.bodies.find((b) => b.motion === "static");
      const groundY = ground ? ground.positionM.y : 0;
      const crossing = firstCrossing(curve, groundY + GROUND_CONTACT_BAND_M);
      // DRAFT wordings — the owner's to settle. The
      // reply names the reading as a reading (§7).
      return crossing === undefined
        ? finish(
            "answered-from-curve",
            `Reading the held trajectory of the earlier simulation (no new run): ${spec.id} does not reach ` +
              `the ground within the simulated ${fmt(curve.domainInterval[1])} seconds.`,
            `curve '${curve.id}': underside never enters the ${GROUND_CONTACT_BAND_M} m contact band above ground level ${fmt(groundY)} m in its domain (Physics P3)`,
          )
        : finish(
            "answered-from-curve",
            `Reading the held trajectory of the earlier simulation (no new run): ${spec.id} reaches the ` +
              `ground at about ${fmt(crossing)} seconds.`,
            `curve '${curve.id}': underside first enters the ${GROUND_CONTACT_BAND_M} m contact band above ground level ${fmt(groundY)} m at t=${crossing} (Physics P3)`,
          );
    }
    const t = motion.seconds!;
    const speed = valueAt(curve, t);
    if (speed === undefined) {
      // DRAFT wording — the owner's to settle.
      return finish(
        "missing-determination",
        `I can't say: the held trajectory covers ${fmt(curve.domainInterval[0])} to ${fmt(curve.domainInterval[1])} ` +
          `seconds, and ${fmt(t)} seconds is outside it — I won't stretch a curve past the stretch it is defined over.`,
        `motion question declined at the curve's domain interval [${curve.domainInterval.join(", ")}] (Physics P3)`,
        `the question asks for a speed at ${t} s and the held curve is defined only over ` +
          `[${curve.domainInterval[0]}, ${curve.domainInterval[1]}] s — the gap is located at the domain interval (Form §3.1)`,
      );
    }
    // DRAFT wording — the owner's to settle.
    return finish(
      "answered-from-curve",
      `Reading the held trajectory of the earlier simulation (no new run): at ${fmt(t)} seconds ${spec.id} ` +
        `is moving at about ${fmt(speed)} m/s. (The speed curve is drawn from the simulated positions by ` +
        `finite differences, and read by its stated interpolation.)`,
      `curve '${curve.id}': value at t=${t} is ${speed} (Physics P3)`,
    );
  }
  if (border) {
    // §6: assembly declines at the border before any
    // reading is consulted — the question turns on the
    // capability whatever the material. The decline
    // names the capability kind, never a generic
    // inability.
    const description: SceneDescription = {
      question: text.trim(),
      bodies: [
        {
          id: border.form === "float" ? "the body asked about" : "the cube",
          shape: { kind: "box", widthM: 0.3, heightM: 0.3 },
          positionM: { x: 0, y: 0.15 },
          motion: "dynamic",
          material: border.material,
        },
      ],
      turnsOn: border.capability,
    };
    const assembled = lab.assemble(description);
    if (assembled.kind !== "border") {
      // Assembly's border check is first by
      // construction; anything else here is a defect,
      // surfaced rather than papered over.
      return finish(
        "border-decline",
        `I can't say: the question turns on the ${border.capability} capability, which is outside what I can simulate.`,
        `border shape '${border.form}' did not decline at assembly as designed (Physics P4)`,
        assembled.kind === "missing-determination" ? assembled.detail : "assembly did not decline at the border",
      );
    }
    // DRAFT wordings — the owner's to settle.
    return finish(
      "border-decline",
      border.capability === "fluid"
        ? `I can't say: whether a ${border.material} body floats turns on buoyancy in a fluid, and fluids ` +
          `are outside what I can simulate — my engine holds rigid bodies in a plane, not media they ` +
          `float in. The gap is the fluid capability.`
        : `I can't say: a cube balancing on its corner is a determination in three dimensions, and my ` +
          `scenes are two-dimensional — in them a cube has edges, not a corner to balance on. ` +
          `The gap is the 3D capability.`,
      `assembly declined at the scope border: ${assembled.detail} (Physics P4)`,
      assembled.detail,
    );
  }

  if (slope) {
    const description = slopeDescription(slope, text);
    const assembled = lab.assemble(description);
    if (assembled.kind === "missing-determination") {
      // DRAFT wording — the owner's to settle (as P1).
      return finish(
        "missing-determination",
        `I can't say: I hold no behavioural reading for ${assembled.material} — no density, friction and ` +
          `restitution stand for it in my material readings, and a simulation run on invented values ` +
          `would be inventing its answer.`,
        `assembly declined at the missing determination: ${assembled.detail} (Physics P4)`,
        `the question asks about a ${slope.material} ${slope.mover} on a slope, and the simulation needs ` +
          `a held behavioural reading for '${slope.material}'; none stands — the gap is located at the ` +
          `missing material reading (§§3.2, 5.2)`,
      );
    }
    if (assembled.kind === "border") {
      return finish(
        "border-decline",
        `I can't say: the question turns on ${assembled.capability}, which is outside what I can simulate.`,
        `assembly declined at the scope border: ${assembled.detail} (Physics P4)`,
        assembled.detail,
      );
    }
    const scene = assembled.scene;
    const run = lab.simulate(scene);
    // The reading rule for the slope family, stated:
    // progress is the mover's centre travelled along
    // the slope's direction from the top. It REACHES
    // THE BOTTOM at progress ≥ 90% of the slope's
    // length; it goes OFF at progress beyond the
    // foot point + 0.05 m; it SLIDES (for the block)
    // if it travels more than 0.10 m. Read off the
    // held trajectory, as every outcome here is read
    // by a stated rule (§4.1).
    const g = slopeGeometry(slope.angleDeg);
    const moverId = slope.mover === "ball" ? "the ball" : "the block";
    const trajectory = run.trajectories[moverId];
    const progress = trajectory.map(
      (p) => (p.x - g.top.x) * g.dir.x + (p.y - g.top.y) * g.dir.y,
    );
    const maxProgress = Math.max(...progress);
    const fmt = (n: number): string => String(Math.round(n * 100) / 100);
    const reachedBottom = maxProgress >= 0.9 * g.lengthM;
    const wentOff = maxProgress > g.lengthM + 0.05;
    const what = `the ${slope.material} ${slope.mover}`;
    const slopeName = `${slope.angleDeg}-degree slope`;
    // DRAFT wordings — the owner's to settle. Each
    // names the computation as the computation (§4.2).
    const computed = `(Computed by Planck from the scene as described — ${what} placed at rest at the top ` +
      `of a stone ${slopeName}, under the stated assumptions — not an observation of any real slope.)`;
    let reply: string;
    if (slope.ask === "roll-to") {
      reply = reachedBottom
        ? `By simulation, ${what} rolls to the bottom of the ${slopeName}. ${computed}`
        : `By simulation, ${what} does not reach the bottom of the ${slopeName} — it travels about ` +
          `${fmt(Math.max(0, maxProgress))} m of the ${fmt(g.lengthM)} m slope and stops. ${computed}`;
    } else if (slope.ask === "roll-off") {
      reply = wentOff
        ? `By simulation, ${what} rolls off the ${slopeName}. ${computed}`
        : reachedBottom
          ? `By simulation, ${what} reaches the bottom of the ${slopeName} but does not roll off — ` +
            `it stops at the foot. ${computed}`
          : `By simulation, ${what} does not roll off the ${slopeName} — it travels about ` +
            `${fmt(Math.max(0, maxProgress))} m of the ${fmt(g.lengthM)} m slope and stops. ${computed}`;
    } else {
      reply = wentOff
        ? `By simulation, ${what} slides off the ${slopeName}. ${computed}`
        : maxProgress > 0.1
          ? `By simulation, ${what} slides about ${fmt(maxProgress)} m down the ${slopeName} and stops ` +
            `on it — it does not slide off. ${computed}`
          : `By simulation, ${what} does not slide on the ${slopeName} — it stays where it was placed. ${computed}`;
    }
    return finish(
      "simulated",
      reply,
      `simulation run '${scene.id}': slope ${slope.angleDeg}°, mover progress max ${fmt(maxProgress)} m of ` +
        `${fmt(g.lengthM)} m (reached bottom: ${reachedBottom}; went off: ${wentOff}); verdict ${run.verdict} — ${run.verdictDetail}`,
    );
  }
  if (!question) return result; // unreachable: motion, border and slope handled above

  const description = stackDescription(question, text);
  const assembled = lab.assemble(description);
  if (assembled.kind === "missing-determination") {
    // DRAFT wording — the owner's to settle.
    return finish(
      "missing-determination",
      `I can't say: I hold no behavioural reading for ${assembled.material} — no density, friction and ` +
        `restitution stand for it in my material readings, and a simulation run on invented values ` +
        `would be inventing its answer.`,
      `assembly declined at the missing determination: ${assembled.detail} (Physics P1)`,
      `the question asks whether a stack of ${question.material} blocks would fall, and the simulation ` +
        `needs a held behavioural reading for '${question.material}'; none stands — the gap is located ` +
        `at the missing material reading (§§3.2, 5.2)`,
    );
  }
  if (assembled.kind === "border") {
    // Not reachable from this shape family; kept so the
    // wrapper's outcomes cover assembly's by construction.
    return finish(
      "border-decline",
      `I can't say: the question turns on ${assembled.capability}, which is outside what I can simulate.`,
      `assembly declined at the scope border: ${assembled.detail} (Physics P1)`,
      assembled.detail,
    );
  }
  const scene = assembled.scene;
  scene.assumptions.push(...STACK_ASSUMPTIONS);
  const run = lab.simulate(scene);
  const derivationText = `${run.derivation.detail} (inputs: ${run.derivation.inputs.join("; ")})`;
  const what =
    question.count === 1
      ? `the ${question.material} block`
      : `the stack of ${question.count} ${question.material} blocks${question.topHalfOff ? " with the top block half off" : ""}`;
  // DRAFT wordings — the owner's to settle. The reply
  // names the computation as the computation (§4.2).
  const reply =
    run.verdict === "falls"
      ? `By simulation, ${what} falls. (Computed by Planck from the scene as described — ` +
        `${question.count} ${question.material} block${question.count === 1 ? "" : "s"} on a stone floor, ` +
        `under the stated assumptions — not an observation of any real stack.)`
      : run.verdict === "stands"
        ? `By simulation, ${what} stands. (Computed by Planck from the scene as described — ` +
          `${question.count} ${question.material} block${question.count === 1 ? "" : "s"} on a stone floor, ` +
          `under the stated assumptions — not an observation of any real stack.)`
        : `By simulation, ${what} shifts but does not fall. (Computed by Planck from the scene as ` +
          `described, under the stated assumptions — not an observation of any real stack.)`;
  return finish("simulated", reply, `simulation run '${scene.id}': verdict ${run.verdict} — ${run.verdictDetail}; derivation: ${derivationText}`);
}
