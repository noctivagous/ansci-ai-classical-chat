/**
 * experience.ts — experience memory (§8.6, layer 3): an append-only
 * event log outside the graph, recording how conversations actually
 * went, across sessions. JSONL under `data/experience/` (gitignored:
 * the user's conversation data, local-first).
 *
 * Nothing in experience memory is ever auto-promoted to semantic
 * memory: promotion happens only through the trainer loop (§7.6,
 * §10.4). Aggregation into the trainer's work queue is slice 3.
 * Per §8.7 the ROUTER is the only writer; the renderer reports its
 * gaps in the RenderedAnswer and the router appends them.
 */
import * as fs from "fs";
import * as path from "path";

export type ExperienceEvent =
  | {
      kind: "correction";
      at: string;
      sessionId: string;
      question: string;
      term: string;
      fromSynsetId?: string;
      toSynsetId: string;
    }
  | {
      kind: "clarification-resolved";
      at: string;
      sessionId: string;
      question: string;
      branchId: string;
      resolvedTermIds: string[];
    }
  | {
      kind: "gap-hit";
      at: string;
      sessionId: string;
      question: string;
      unanchoredTerms: string[];
      decisionReason: string;
    }
  | {
      kind: "renderer-gap";
      at: string;
      sessionId: string;
      question: string;
      stage: "leakage" | "faithfulness";
      detail: string;
      resolution: "repaired" | "dropped" | "fallback";
    };

export const DEFAULT_EXPERIENCE_DIR = path.join(__dirname, "..", "..", "data", "experience");
export const EXPERIENCE_FILE = "experience.jsonl";

export function appendExperienceEvent(
  event: ExperienceEvent,
  dir: string = DEFAULT_EXPERIENCE_DIR,
): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(path.join(dir, EXPERIENCE_FILE), JSON.stringify(event) + "\n", "utf-8");
}

/** Read back the whole log (tests, trainer aggregation, user inspection). */
export function readExperienceEvents(dir: string = DEFAULT_EXPERIENCE_DIR): ExperienceEvent[] {
  const file = path.join(dir, EXPERIENCE_FILE);
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf-8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as ExperienceEvent);
}
