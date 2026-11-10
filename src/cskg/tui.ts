/**
 * tui.ts — the terminal UI's pure helpers (the TUI step,
 * 2026-11-09).
 *
 * demo/tui/tui.mjs is a thin shell (readline, prompts, colour);
 * everything in it that can be decided or rendered without a
 * terminal lives here, where the test suite can reach it:
 * slash-command parsing, the session header's wording, and the
 * per-turn trace view. The trace view renders a TraceFileRecord
 * (tracefile.ts) — the TUI invents no second trace machinery;
 * the levels it offers are the trace file's levels, and the
 * record it renders is built by buildTraceRecord exactly as a
 * trace file's line is.
 *
 * Nothing here touches the terminal, the filesystem, or the
 * graph: lines in, strings out.
 */
import type { PersonContext, Situation } from "./awareness";
import type { QueryRecord } from "./loader";
import type { RolePack } from "./roles";
import type {
  QuerySummaryRecord,
  TraceFileRecord,
  TraceQueryEntry,
} from "./tracefile";

/* ---------------- slash commands ---------------- */

export type SlashCommand =
  | { kind: "help" }
  | { kind: "quit" }
  | { kind: "why" }
  | { kind: "trace"; arg: string | null }
  | { kind: "role"; arg: string | null }
  | { kind: "person"; arg: string | null }
  | { kind: "unknown"; name: string };

/**
 * Parse one input line as a slash command. Returns null when
 * the line is conversation (anything not starting with "/"),
 * the command otherwise — including "unknown" for a slash line
 * that names nothing the TUI does, so the shell can say so
 * instead of passing it to the engine as chat.
 */
export function parseSlashCommand(line: string): SlashCommand | null {
  const t = line.trim();
  if (!t.startsWith("/")) return null;
  const m = t.match(/^\/([a-z][a-z-]*)(?:\s+([\s\S]*))?$/i);
  if (!m) return { kind: "unknown", name: t.slice(1).trim() };
  const name = m[1].toLowerCase();
  const arg = (m[2] ?? "").trim() || null;
  switch (name) {
    case "help":
      return { kind: "help" };
    case "quit":
    case "exit":
      return { kind: "quit" };
    case "why":
      return { kind: "why" };
    case "trace":
      return { kind: "trace", arg };
    case "role":
      return { kind: "role", arg };
    case "person":
      return { kind: "person", arg };
    default:
      return { kind: "unknown", name };
  }
}

export const HELP_LINES: readonly string[] = [
  "Commands:",
  "  /help                    this list",
  "  /trace off|steps|queries|full",
  "                           show the reasoning behind each reply,",
  "                           at the chosen depth (off hides it)",
  "  /why                     replay why the last reply was what it was",
  "  /role <name>             switch role pack — applies from your",
  "                           next message; the conversation continues",
  "  /person <name>           talk as a different person — a fresh",
  "                           conversation; their remembered facts load",
  "  /person none             general mode — nobody is remembered",
  "  /quit                    end the session",
  "Anything else is conversation.",
];

/* ---------------- the session header ---------------- */

/**
 * The frame in plain words, from the session's own awareness:
 * where/when the chat believes it is, who it is (the role), and
 * who it is talking with. Two lines; the shell may style them,
 * the wording is decided here.
 */
export function frameHeaderLines(
  sit: Situation,
  role: RolePack,
  person: PersonContext,
): string[] {
  const place = sit.place ? sit.place.name : "place not set";
  const season = sit.season ?? "season unknown";
  const time = sit.now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const who =
    person.kind === "known"
      ? `talking with ${person.name}`
      : "general mode — no person file, nothing kept between sessions";
  return [
    `${place} · ${season} · ${sit.daypart} · ${time}`,
    `role: ${role.label} (${role.id}) · ${who}`,
  ];
}

/* ---------------- the trace view ---------------- */

function queryEntryLine(e: TraceQueryEntry): string {
  if ("summary" in e && e.summary) {
    const s = e as QuerySummaryRecord;
    return (
      `${s.via} ×${s.count.toLocaleString()} queries summarised ` +
      `(${s.distinctTerms.toLocaleString()} terms, ${s.zeroHits.toLocaleString()} empty, ` +
      `${s.totalHits.toLocaleString()} hits)`
    );
  }
  const q = e as QueryRecord;
  const parts = [q.via];
  if (q.term !== undefined) parts.push(JSON.stringify(q.term));
  if (q.rel !== undefined) parts.push(q.rel);
  if (q.dir !== undefined) parts.push(q.dir);
  parts.push(`→ ${q.hits} ${q.hits === 1 ? "hit" : "hits"}`);
  return parts.join(" ");
}

/**
 * Render one turn's trace record as view lines: the trace
 * steps (the module path, with the edges a step cites), then
 * the queries at whatever depth the record itself was built —
 * a steps-level record carries no query entries, so the view
 * says how many there were and stops; queries/full records
 * list their entries (scan summaries at the queries level,
 * every record at full).
 */
export function traceViewLines(rec: TraceFileRecord): string[] {
  const lines: string[] = [
    `trace — turn ${rec.turn} · intent: ${rec.intent} · grounded: ${rec.grounded ? "yes" : "no"}`,
  ];
  for (const s of rec.steps) {
    lines.push(`  · [${s.piece}] ${s.kind}: ${s.detail}`);
    if (s.edges) for (const e of s.edges) lines.push(`      ${e}`);
  }
  if (rec.queries.length === 0) {
    lines.push(
      rec.queryCount > 0
        ? `  (${rec.queryCount.toLocaleString()} graph queries — a deeper /trace level lists them)`
        : "  (no graph queries — this turn recited, it did not consult)",
    );
  } else {
    lines.push(`  queries (${rec.queryCount.toLocaleString()} total):`);
    for (const e of rec.queries) lines.push(`    ${queryEntryLine(e)}`);
  }
  return lines;
}
