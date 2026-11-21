/**
 * physics-materials.ts — the Physics Unit's held
 * material readings (Physics P2, 2026-11-20; design
 * note docs/ansci/physics-design-note.md §3.2, §9 P2):
 * §3.2's readings as held knowledge with intake.
 *
 * THE HELD ARTEFACT is data/physics/material-readings
 * .json — the first attested intake. Every value in it
 * states its route: an attested source (named, with the
 * table and the value or range it gives), or the
 * owner's authoring where no attested table stands
 * (restitution throughout this intake — the record
 * says so per value rather than letting a retrieved
 * dataset's name cover an authored number). Where a
 * source gives a RANGE, the reading takes a point
 * within it and the choice of point is recorded as the
 * intake's. Where a source attests a PAIR (brick on
 * wood), the self-coefficient is not derived from it —
 * the intake's convention, stated in the artefact,
 * governs, and pair readings proper are the designed
 * remedy when a question turns on a specific pair.
 *
 * This module loads the artefact into a MaterialRegister
 * under ONE standing, so a derivation citing a reading
 * names the standing it used, and a later intake
 * supersedes it in the open: the old standing stays in
 * the register's history, and the derivations that
 * cited it stand exactly as written (§9 P2's
 * re-derivation discipline).
 *
 * CUSTODY (§10 Q2, the owner's question): the artefact
 * lives in data/physics/ — the Unit's own keeping, in
 * the repo's data tradition — and the register cites
 * it. Held once, cited everywhere, never duplicated
 * into the engine layer as literals (§3.2's
 * constraint): the values exist in the artefact and in
 * the register's readings, nowhere else.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { MaterialRegister, type MaterialReading } from "./physics";

export interface MaterialIntakeEntry {
  material: string;
  densityKgM3: number;
  friction: number;
  restitution: number;
  valueSources: { density: string; friction: string; restitution: string };
}

export interface MaterialIntakeFile {
  intake: string;
  standing: string;
  convention: string;
  entries: MaterialIntakeEntry[];
}

const INTAKE_RELATIVE = path.join("data", "physics", "material-readings.json");

/** Walk up from this module looking for the intake
 *  artefact (the cskg-ingest pattern). */
export function materialIntakePath(): string {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, INTAKE_RELATIVE);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(__dirname, "..", "..", INTAKE_RELATIVE);
}

/** Read and VALIDATE the intake artefact. An intake
 *  whose entries lack a value or a stated route for it
 *  is not an intake: the load fails loudly rather than
 *  entering a reading whose provenance is incomplete —
 *  traceability is the acceptance, not a nicety. */
export function readMaterialIntake(): MaterialIntakeFile {
  const file = JSON.parse(fs.readFileSync(materialIntakePath(), "utf8")) as MaterialIntakeFile;
  if (!file.standing || !Array.isArray(file.entries) || file.entries.length === 0) {
    throw new Error("material intake artefact: no standing or no entries");
  }
  for (const e of file.entries) {
    for (const k of ["densityKgM3", "friction", "restitution"] as const) {
      if (typeof e[k] !== "number" || !Number.isFinite(e[k])) {
        throw new Error(`material intake artefact: entry '${e.material}' lacks a finite ${k}`);
      }
    }
    for (const k of ["density", "friction", "restitution"] as const) {
      if (!e.valueSources?.[k]?.trim()) {
        throw new Error(`material intake artefact: entry '${e.material}' states no route for its ${k}`);
      }
    }
  }
  return file;
}

/** The standing the attested intake enters under —
 *  read from the artefact itself, so the record and
 *  the register can never disagree about it. */
export function attestedIntakeStanding(): string {
  return readMaterialIntake().standing;
}

/** Enter the attested intake into a register. Each
 *  reading's provenance names the intake as its
 *  dataset and carries the per-value routes in its
 *  detail, so a derivation citing the reading shows
 *  where every number came from. Returns what was
 *  entered and what it superseded. */
export function loadAttestedReadings(register: MaterialRegister): { entered: string[]; superseded: string[] } {
  const file = readMaterialIntake();
  const entered: string[] = [];
  const superseded: string[] = [];
  for (const e of file.entries) {
    const reading: MaterialReading = {
      material: e.material,
      densityKgM3: e.densityKgM3,
      friction: e.friction,
      restitution: e.restitution,
      provenance: {
        kind: "retrieved",
        dataset:
          "The Engineering ToolBox — 'Solids — Densities' and 'Friction — Coefficients for Common " +
          "Materials and Surface Combinations', with Marks' Standard Handbook (via Perry's) where an entry states it",
        baseVersion: "tables as consulted 2026-11-20",
        retrievedFrom: "physics programme intake (P2): data/physics/material-readings.json",
        confidence: 0.9,
        detail:
          `density — ${e.valueSources.density}; friction — ${e.valueSources.friction}; ` +
          `restitution — ${e.valueSources.restitution}`,
      },
      standing: file.standing,
    };
    const result = register.intake(reading);
    entered.push(e.material);
    if (result.superseded) superseded.push(e.material);
  }
  return { entered, superseded };
}

/** Enter the attested intake into a register unless it
 *  already stands there (the turn wrapper's default
 *  register path): idempotent, and a no-op once the
 *  intake's standing is current. */
export function ensureAttestedReadings(register: MaterialRegister): void {
  const standing = attestedIntakeStanding();
  const wood = register.readingFor("wood");
  if (wood && wood.standing === standing) return;
  loadAttestedReadings(register);
}
